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

function map_style(feature)
{
	let style =
	{
		fillColor: 'white',
		weight: 1.5,
		opacity: 1,
		color: get_feature_border_color(feature.properties[app.selection.dataset.id_property]),
		fillOpacity: 0.5,
	};
	return style;
}

function show_geojson_layer()
{
	if (app.map.datalayer) app.map.datalayer.removeFrom(app.map.map);
	if (app.data.geodata) app.map.datalayer = L.geoJSON(app.data.geodata, {style: map_style});
	if (app.map.datalayer)
	{
		app.map.datalayer.addTo(app.map.map);
		app.map.map.fitBounds(app.map.datalayer.getBounds());
	}
}

function get_feature_border_color(feature_id)
{
	console.log("get_feature_border_color:", feature_id);
	return 'grey';
}