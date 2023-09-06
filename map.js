// map functions

function init_map()
{
	app.map = L.map("leafletmap");
	app.map.setView([51.5, 10], 7);
	let mapconfig =
	{
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	};
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', mapconfig).addTo(app.map);
}

function show_geojson_layer()
{
	if (app.maplayer) app.maplayer.removeFrom(app.map);
	if (geojson) app.maplayer = L.geoJSON(geojson);
}