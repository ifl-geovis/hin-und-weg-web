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
	let color = get_color_for_feature_id(feature_id);
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
		click: select_feature,
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

function highlight_feature(event)
{
	//console.log("highlight_feature:", event);
	var layer = event.target;
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
	show_info_popup(event);
}

function show_info_popup(event)
{
	const feature_id = get_feature_id(event.target.feature);
	const feature_info = get_feature_by_id(feature_id);
	const feature_name = app.data.featurename_mapping[feature_id];
	let feature_info_popup = document.getElementById("feature_info_popup");
	let info_text = "";
	info_text += feature_name + " (" + feature_id + ")<br />";
	if (feature_info)
	{
	}
	feature_info_popup.innerHTML = info_text;
	feature_info_popup.style.display = "block";
}

function reset_highlight_feature(event)
{
	//console.log("reset_highlight_feature:", event);
	app.map.selectionlayer.resetStyle(event.target);
	let feature_info_popup = document.getElementById("feature_info_popup");
	feature_info_popup.style.display = "none";
}

function select_feature(event)
{
	//console.log("select_feature:", event);
	let feature_id = get_feature_id(event.target.feature);
	app.selection.area_id = feature_id;
	let area_selector = document.getElementById("area_selector");
	area_selector.value = feature_id;
	process_selections();
}