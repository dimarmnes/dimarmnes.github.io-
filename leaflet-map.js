/* leaflet-map.js - Leaflet JS Map Functions (https://leafletjs.com)
 *
 * Using OpenStreetMap (https://www.openstreetmap.org) or Mapbox (https://mapbox.com)
 * 
 * 2020/09/05 Stephen Houser, N1SH
*/

/* 
 * Which map tile source to use:
 * 	'openstreetmap'	-- use https://openstreetmap.org (does not use `mapAccessToken`)
 *	'mapbox'		-- use https://mapbox.com (requires `mapAccessToken` from mapbox)
 */
var mapTiles = 'openstreetmap';
var mapAccessToken = '';	// <-- put your mapbox token here if you are using mapbox, otherwise ignore.

/* Required Map functions:
 *
 * map = createMap(mapDivName)
 * marker = createMarker(latitude, longitude, popupText)
 * removeMarker(marker)
 * removeAllMarkers()
 */

/* Internal variables */
var _map = null;

// Currently markers and polygons are maintained separately.
// There's no reason at this point for doing this.
// Should they be in one array of mapObjects and one 'feature group'?
var _markers = [];
var _markerFeatureGroup = null;
var _polygons = [];
var _polygonFeatureGroup = null;

/* createMap - Initialize and create map in named section of DOM
 * 
 * Set up any handlers needed by the map and perform any initialization
 * of the map library.
 */
function createMap(mapDivName) {
	_map = L.map(mapDivName).setView([-27.86514, -55.14205], 4);

	var mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

	if (mapTiles == 'openstreetmap') {
		L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: mapAttribution,
		}).addTo(_map);
	} else if (mapTiles == 'mapbox') {
		L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
			attribution: mapAttribution,
			id: 'mapbox/streets-v11',
			accessToken: mapAccessToken
		}).addTo(_map);
	} else {
		alert('Map configuration error: No mapTiles source set. Cannot load maps!');
	}

	_markerFeatureGroup = new L.featureGroup();
	_markerFeatureGroup.addTo(_map);

	_polygonFeatureGroup = new L.featureGroup();
	_polygonFeatureGroup.addTo(_map);

	return _map;
}

/* createPolygon - create a polygon on the map with the given borders.
 *
 * - The first parameter is a list of [[lat, lon], ...]
 * - The second parameter are 'options' for the polygon as an object {}
 * 	for example `{color: 'red'}`
 */
function createPolygon(points, options) {
	var poly = L.polygon(points, {color: '#F47A0B', weight: 0.5});
	poly.addTo(_polygonFeatureGroup);
	_polygons.push(poly);
	return poly;
}

function createMarker(latitude, longitude, popupText) {
    var iconoPersonalizado = L.icon({
        iconUrl: 'images/wifi.png', // Reemplaza con la ruta de tu icono
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    var marker = L.marker([latitude, longitude], { icon: iconoPersonalizado });
    marker.addTo(_markerFeatureGroup);
    _markers.push(marker);
    if (popupText) {
        marker.bindPopup(popupText);
    }
    return marker;
}


