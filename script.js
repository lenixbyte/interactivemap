const mapConfig = {
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-0.09, 51.505]),
        zoom: 13
    })
};

const map = new ol.Map(mapConfig);

const popup = new ol.Overlay({
    element: document.getElementById('popup'),
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -10]
});
map.addOverlay(popup);

const markerStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [0.5, 1],
        src: 'https://openlayers.org/en/latest/examples/data/icon.png'
    })
});

const marker = new ol.Feature({
    geometry: new ol.geom.Point(
        ol.proj.fromLonLat([-0.09, 51.5])
    )
});
marker.setStyle(markerStyle);

const vectorSource = new ol.source.Vector({
    features: [marker]
});

const vectorLayer = new ol.layer.Vector({
    source: vectorSource
});

map.addLayer(vectorLayer);

map.on('click', function(evt) {
    const element = popup.getElement();
    if (!element) return;

    const feature = map.forEachFeatureAtPixel(evt.pixel, feature => feature);
    handleMarkerClick(feature, element);
});

function handleMarkerClick(feature, element) {
    try {
        const coordinates = feature.getGeometry().getCoordinates();
        popup.setPosition(coordinates);
        
        const content = `
            <div class="popup-content">
                <h3><span class="material-icons">location_city</span> London City Center</h3>
                <div class="popup-details">
                    <div class="icon-label">
                        <span class="material-icons">place</span>
                        <p>Central London, UK</p>
                    </div>
                    <ul>
                        <li><span class="material-icons">business</span> Financial District nearby</li>
                        <li><span class="material-icons">museum</span> Historic landmarks</li>
                        <li><span class="material-icons">train</span> Transport connections</li>
                    </ul>
                </div>
            </div>
        `;
        
        updatePopupContent(content, element);
    } catch (error) {
        console.error('Error handling marker click:', error);
    }
}

function updatePopupContent(content, element) {
    const popupContent = document.getElementById('popup-content');
    if (popupContent) {
        popupContent.innerHTML = content;
        element.style.display = 'block';
    }
}

map.on('click', function(evt) {
    const hasFeature = map.forEachFeatureAtPixel(evt.pixel, () => true);
    const popupElement = document.getElementById('popup');
    
    if (!hasFeature && popupElement) {
        popupElement.style.display = 'none';
    }
}); 