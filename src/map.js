// map functions

function init_map()
{
	app.map.map = L.map("leafletmap");
	app.map.map.setView([51.5, 10], 7);
	let mapconfig =
	{
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	};
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', mapconfig).addTo(app.map.map);
}

function show_geojson_layer()
{
	let style =
	{
		fillColor: 'white',
		weight: 2,
		opacity: 1,
		color: 'black',
		dashArray: '3',
		fillOpacity: 0.5,
	};
	if (app.map.datalayer) app.map.datalayer.removeFrom(app.map.map);
	if (app.data.geodata) app.map.datalayer = L.geoJSON(app.data.geodata, {style: style});
	console.log("show_geojson_layer:", app.map);
	if (app.map.datalayer)
	{
		app.map.datalayer.addTo(app.map.map);
		app.map.map.fitBounds(app.map.datalayer.getBounds());
	}
}