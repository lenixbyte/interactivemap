const LOCATION_QUERY = 'Patna, India';
class LocationService {
    static async getLocationData(searchQuery) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        if (!data || data.length === 0) {
            throw new Error('Location not found');
        }
        return data[0];
    }

    static async getLocationDataByCoordinates(coordinates) {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates[1]}&lon=${coordinates[0]}`);
        const data = await response.json();
        return data;
    }
}

class MapMarker {
    constructor(coordinates) {
        this.feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coordinates))
        });
        this.setStyle();
    }

    setStyle() {
        this.feature.setStyle(new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: 'http://maps.gstatic.com/intl/de_de/mapfiles/ms/micons/red-pushpin.png',
                cursor: 'pointer'
            })
        }));
    }

    getFeature() {
        return this.feature;
    }
}

class PopupOverlay {
    constructor(element) {
        this.overlay = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: false,
            offset: [0, -10]
        });
    }

    setPosition(coordinates) {
        this.overlay.setPosition(coordinates);
    }

    getOverlay() {
        return this.overlay;
    }

    async updateContent(coordinates, element) {
        try {
            const locationData = await LocationService.getLocationData(LOCATION_QUERY);
            const content = this.generatePopupContent(locationData);
            this.setPopupContent(content, element);
        } catch (error) {
            const errorContent = this.generateErrorContent();
            this.setPopupContent(errorContent, element);
        }
    }

    generatePopupContent(location) {
        return `
            <div class="popup-content">
                <h3><span class="material-icons">location_city</span> ${location.display_name}</h3>
                <div class="popup-details">
                    <div class="icon-label">
                        <span class="material-icons">place</span>
                        <p>${location.type || 'Location'}</p>
                    </div>
                    <ul>
                        <li><span class="material-icons">location_on</span> ${location.display_name || ''}</li>
                        <li><span class="material-icons">public</span> India</li>
                        <li><span class="material-icons">place</span> Lat: ${location.lat}, Lon: ${location.lon}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    generateErrorContent() {
        return `
            <div class="popup-content">
                <h3><span class="material-icons">error</span> Error</h3>
                <div class="popup-details">
                    <div class="icon-label">
                        <span class="material-icons">error</span>
                        <p>Failed to fetch location details</p>
                    </div>
                </div>
            </div>
        `;
    }

    setPopupContent(content, element) {
        const popupContent = document.getElementById('popup-content');
        if (popupContent) {
            popupContent.innerHTML = content;
            element.style.display = 'block';
        }
    }
}

class MapManager {
    constructor(targetElement) {
        this.targetElement = targetElement;
        this.map = null;
        this.popup = null;
        this.marker = null;
    }

    async initialize(searchQuery) {
        try {
            const location = await LocationService.getLocationData(searchQuery);
            const coordinates = [parseFloat(location.lon), parseFloat(location.lat)];
            
            this.initializeMap(coordinates);
            this.addMarker(coordinates);
            this.setupPopup();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    initializeMap(coordinates) {
        this.map = new ol.Map({
            target: this.targetElement,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat(coordinates),
                zoom: 13
            })
        });
    }

    addMarker(coordinates) {
        this.marker = new MapMarker(coordinates);
        const vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [this.marker.getFeature()]
            })
        });
        this.map.addLayer(vectorLayer);
    }

    setupPopup() {
        this.popup = new PopupOverlay(document.getElementById('popup'));
        this.map.addOverlay(this.popup.getOverlay());
    }

    setupEventListeners() {
        this.map.on('click', (evt) => this.handleMapClick(evt));
        this.map.on('pointermove', (e) => this.handlePointerMove(e));
    }

    handleMapClick(evt) {
        const element = this.popup.getOverlay().getElement();
        if (!element) return;

        const feature = this.map.forEachFeatureAtPixel(evt.pixel, feature => feature);
        if (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            this.popup.setPosition(coordinates);
            this.popup.updateContent(coordinates, element);
        } else {
            element.style.display = 'none';
        }
    }

    handlePointerMove(e) {
        const pixel = this.map.getEventPixel(e.originalEvent);
        const hit = this.map.hasFeatureAtPixel(pixel);
        this.map.getViewport().style.cursor = hit ? 'pointer' : '';
    }
}

class MultiCityMapManager {
    constructor(targetElement) {
        this.targetElement = targetElement;
        this.map = null;
        this.popup = null;
        this.markers = new Map(); 
    }

    async initialize(cities) {
        try {
            const firstCity = await LocationService.getLocationData(cities[0]);
            const initialCoordinates = [parseFloat(firstCity.lon), parseFloat(firstCity.lat)];
            this.initializeMap(initialCoordinates);
            this.setupPopup();
            this.setupEventListeners();

            await this.addCityMarkers(cities);
        } catch (error) {
            console.error('Error initializing multi-city map:', error);
        }
    }

    async addCityMarkers(cities) {
        for (const city of cities) {
            try {
                const location = await LocationService.getLocationData(city);
                const coordinates = [parseFloat(location.lon), parseFloat(location.lat)];
                const marker = new MapMarker(coordinates);
                
                this.markers.set(marker.getFeature(), {
                    city: city,
                    location: location
                });

                const vectorLayer = new ol.layer.Vector({
                    source: new ol.source.Vector({
                        features: [marker.getFeature()]
                    })
                });
                this.map.addLayer(vectorLayer);
            } catch (error) {
                console.error(`Error adding marker for ${city}:`, error);
            }
        }
    }

    initializeMap(coordinates) {
        this.map = new ol.Map({
            target: this.targetElement,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat(coordinates),
                zoom: 4 
            })
        });
    }

    setupPopup() {
        this.popup = new PopupOverlay(document.getElementById('popup'));
        this.map.addOverlay(this.popup.getOverlay());
    }

    setupEventListeners() {
        this.map.on('click', (evt) => this.handleMapClick(evt));
        this.map.on('pointermove', (e) => this.handlePointerMove(e));
    }

    handleMapClick(evt) {
        const element = this.popup.getOverlay().getElement();
        if (!element) return;

        const feature = this.map.forEachFeatureAtPixel(evt.pixel, feature => feature);
        if (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            this.popup.setPosition(coordinates);
            
            const markerData = this.markers.get(feature);
            if (markerData) {
                const content = this.popup.generatePopupContent(markerData.location);
                this.popup.setPopupContent(content, element);
                element.style.display = 'block';
            }
        } else {
            element.style.display = 'none';
        }
    }

    handlePointerMove(e) {
        const pixel = this.map.getEventPixel(e.originalEvent);
        const hit = this.map.hasFeatureAtPixel(pixel);
        this.map.getViewport().style.cursor = hit ? 'pointer' : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cities = ['Delhi, India', 'Patna, India', 'Paris, France', 'California, USA', 'Bangalore, India'];
    const multiCityMapManager = new MultiCityMapManager('map');
    multiCityMapManager.initialize(cities);
    // const mapManager = new MapManager('map');
    // mapManager.initialize(LOCATION_QUERY);
}); 
