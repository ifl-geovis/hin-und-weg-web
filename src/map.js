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
	let feature_id = get_feature_id(feature);
	let is_selected = is_selected_feature(feature_id);
	let color = getColorForFeatureId(feature_id);
	let style =
	{
		fillColor: color,
		weight: 1.5,
		opacity: 1,
		color: 'grey',
		fillOpacity: is_selected ? 0.8 : 0.5,
	};
	return style;
}

function map_style_selected(feature)
{
	let feature_id = get_feature_id(feature);
	let is_selected = is_selected_feature(feature_id);
	let style =
	{
		weight: 2.5,
		opacity: is_selected ? 1 : 0,
		color: 'black',
		fillOpacity: 0,
	};
	return style;
}

function map_interactivity(feature, layer)
{
	let interactivity_mapping =
	{
		mouseover: highlight_feature,
		mouseout: reset_highlight_feature,
		click: select_highlight_feature,
	}
	layer.on(interactivity_mapping);
}

function show_geojson_layer()
{
	if (app.map.datalayer) app.map.datalayer.removeFrom(app.map.map);
	if (app.map.selectionlayer) app.map.selectionlayer.removeFrom(app.map.map);
	if (app.data.geodata)
	{
		app.map.datalayer = L.geoJSON(app.data.geodata, {style: map_style});
		app.map.selectionlayer = L.geoJSON(app.data.geodata, {style: map_style_selected, onEachFeature: map_interactivity});
	}
	if (app.map.datalayer)
	{
		app.map.datalayer.addTo(app.map.map);
		app.map.map.fitBounds(app.map.datalayer.getBounds());
	}
	if (app.map.selectionlayer) app.map.selectionlayer.addTo(app.map.map);
}

function get_feature_id(feature)
{
	return feature.properties[app.selection.dataset.id_property];
}

function is_selected_feature(feature_id)
{
	if (app.selection.area_id === feature_id) return true;
	return false;
}

function highlight_feature(e)
{
	//console.log("highlight_feature:", e);
	var layer = e.target;
	let layer_style =
	{
		fillColor: 'black',
		fillOpacity: 0.3,
		color: 'blue',
		weight: 2.5,
		opacity: 1,
	};
	layer.setStyle(layer_style);
	layer.bringToFront();
}

function reset_highlight_feature(e)
{
	//console.log("reset_highlight_feature:", e);
	app.map.selectionlayer.resetStyle(e.target);
}

function select_highlight_feature(e)
{
	//console.log("select_highlight_feature:", e);
	let feature_id = get_feature_id(e.target.feature);
	app.selection.area_id = feature_id;
	let area_selector = document.getElementById("area_selector");
	area_selector.value = feature_id;
	process_selections();
}