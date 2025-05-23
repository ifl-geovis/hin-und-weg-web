// map functions

function init_map()
{
	app.map.map = L.map("leafletmap");
	app.map.map.setView([51.5, 10], 7);
	let mapconfig =
	{
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	};
	app.map.backgroundlayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', mapconfig);
	app.map.backgroundlayer.addTo(app.map.map);
	app.status.background_active = true;
}

function refresh_swoopy_arrows()
{
	//console.log("refresh_swoopy_arrows");
	remove_swoopy_arrows();
	if (!app.selection.swoopy_arrows) return;
	add_swoopy_arrows();
	show_swoopy_arrows();
}

function remove_swoopy_arrows()
{
	for (let arrow of app.view.swoopy_arrows) arrow.removeFrom(app.map.map);
	app.view.swoopy_arrows = [];
}


function add_swoopy_arrows() {
    const arrow_weight_head = 1;
    const arrow_weight_body = 3.5;
    if (!app.selection.swoopy_arrows) return;
    if (!app.data.geodata) return;
    if (!app.data.geostats) return;
    if (!app.data.centroid_mapping) return;
    if (!app.data.processed) return;
    let min = app.data.geostats.min();
    let max = app.data.geostats.max();
    for (let dataset of app.data.processed) {
        // Skip arrows for zero values and missing data
        if (dataset.migrations === 0 || dataset.migrations === null || dataset.migrations === undefined) continue;

        let weight_head = (((dataset.migrations - min) / (max - min)) * arrow_weight_head) + 1;
        let weight_body = (((dataset.migrations - min) / (max - min)) * arrow_weight_body) + 1;
        let color = "#3333dd";
        let hide_arrow_head = true;
        if (app.selection.theme === "von") {
            color = "#dd3333";
            hide_arrow_head = false;
        }
        let from = app.data.centroid_mapping[dataset.fromid];
        let to = app.data.centroid_mapping[dataset.toid];
        if ((app.selection.theme === "saldi") && (dataset.migrations < 0)) {
            let tmp = from;
            from = to;
            to = tmp;
            color = "#dd3333";
            hide_arrow_head = false;
            weight_head = (((dataset.migrations) / (min)) * arrow_weight_head) + 1;
            weight_body = (((dataset.migrations) / (min)) * arrow_weight_body) + 1;
        }
        if ((app.selection.theme === "saldi") && (dataset.migrations >= 0)) {
            weight_head = (((dataset.migrations) / (max)) * arrow_weight_head) + 1;
            weight_body = (((dataset.migrations) / (max)) * arrow_weight_body) + 1;
        }
        const swoopy_head = L.swoopyArrow(from, to, {
            color: color,
            weight: weight_head,
            arrowFilled: true,
            hideArrowHead: hide_arrow_head,
        });
        const swoopy_body = L.swoopyArrow(from, to, {
            color: color,
            weight: weight_body,
            arrowFilled: false,
            hideArrowHead: true,
        });
        app.view.swoopy_arrows.push(swoopy_head);
        app.view.swoopy_arrows.push(swoopy_body);
    }
}


function show_swoopy_arrows()
{
	if (!app.selection.swoopy_arrows) return;
	for (let arrow of app.view.swoopy_arrows) arrow.addTo(app.map.map);
}

function map_style(feature) {
    let feature_id = get_feature_id(feature);
    let is_selected = is_selected_feature(feature_id);
    let color = get_color_for_feature_id(feature_id);
    let style = {
        fillColor: color,
        weight: 1.5,
        opacity: 1,
        color: 'grey',
        fillOpacity: is_selected ? app.view.map_opacity_selected : app.selection.map_opacity,
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
		mousemove: move_feature_popup,
		click: select_feature,
	}
	layer.on(interactivity_mapping);
}

function show_info_popup(event)
{
	const feature_id = get_feature_id(event.target.feature);
	const feature_info = get_feature_by_id(feature_id, false);
	const feature_name = app.data.featurename_mapping[feature_id];
	let feature_info_popup = document.getElementById("feature_info_popup");
	let info_text = "";
	info_text += feature_name + " (" + feature_id + ")<br />";
	if (feature_info)
	{
		info_text += feature_info.fromname;
		if (app.selection.theme === 'von') info_text += "→";
		else if (app.selection.theme === 'nach') info_text += "←";
		else if (app.selection.theme === 'saldi') info_text += "←→";
		// CHANGE THIS LINE to properly check for null/undefined values
		info_text += feature_info.toname + ":<br />" + 
		            (feature_info.migrations === null || feature_info.migrations === undefined ? "NA" : feature_info.migrations);
	}
	feature_info_popup.innerHTML = info_text;
	feature_info_popup.style.display = "block";
	feature_info_popup.style.left = event.originalEvent.clientX + "px";
	feature_info_popup.style.top = event.originalEvent.clientY + "px";
}

function map_labels(feature, layer)
{
	if (!app.selection.labels) return;
	if (app.selection.labels === 'none') return;
	let label_text = null;
	const feature_info = get_feature_by_id(feature.properties[app.selection.dataset.id_property], false);
	if (!feature_info) return;
	if (app.selection.labels === 'name') label_text = feature.properties[app.selection.dataset.name_property];
	if (app.selection.labels === 'number') label_text = "" + feature_info.migrations;
	if (!label_text) return;
	const label =
	{
		className: 'map_info_label',
		html: label_text,
		iconSize: ['auto', 'auto'],
	}
	const label_icon =
	{
		icon: L.divIcon(label),
	}
	let label_obj = L.marker(layer.getBounds().getCenter(), label_icon);
	app.map.labels.push(label_obj);
	label_obj.addTo(app.map.map);
}

function map_features(feature, layer)
{
	map_interactivity(feature, layer);
	map_labels(feature, layer);
}

function show_geojson_layer() {
    if (app.map.datalayer) app.map.datalayer.removeFrom(app.map.map);
    if (app.map.selectionlayer) app.map.selectionlayer.removeFrom(app.map.map);
    if (app.map.labels) {
        for (let label of app.map.labels) label.removeFrom(app.map.map);
        app.map.labels = [];
    }
    if (app.data.geodata) {
        app.map.datalayer = L.geoJSON(app.data.geodata, {style: map_style});
        app.map.selectionlayer = L.geoJSON(app.data.geodata, {style: map_style_selected, onEachFeature: map_features});
    }
    if (app.map.datalayer) {
        app.map.datalayer.addTo(app.map.map);
        app.map.map.fitBounds(app.map.datalayer.getBounds());
    }
    if (app.map.selectionlayer) app.map.selectionlayer.addTo(app.map.map);
    refresh_swoopy_arrows();
}

function zoom_home(event)
{
	if (app.map.datalayer) app.map.map.fitBounds(app.map.datalayer.getBounds());
	else app.map.map.setView([51.5, 10], 7);
}

function map_background_switcher(event)
{
	if (!app.map.backgroundlayer) return;
	if (app.status.background_active) app.map.backgroundlayer.removeFrom(app.map.map);
	else app.map.backgroundlayer.addTo(app.map.map);
	app.status.background_active = !app.status.background_active;
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
	const feature_info = get_feature_by_id(feature_id, false);
	const feature_name = app.data.featurename_mapping[feature_id];
	let feature_info_popup = document.getElementById("feature_info_popup");
	let info_text = "";
	info_text += feature_name + " (" + feature_id + ")<br />";
	if (feature_info)
	{
		info_text += feature_info.fromname;
		if (app.selection.theme === 'von') info_text += "→";
		else if (app.selection.theme === 'nach') info_text += "←";
		else if (app.selection.theme === 'saldi') info_text += "←→";
		info_text += feature_info.toname + ":<br />" + feature_info.migrations;
	}
	feature_info_popup.innerHTML = info_text;
	feature_info_popup.style.display = "block";
	feature_info_popup.style.left = event.originalEvent.clientX + "px";
	feature_info_popup.style.top = event.originalEvent.clientY + "px";
}

function move_feature_popup(event)
{
	let feature_info_popup = document.getElementById("feature_info_popup");
	feature_info_popup.style.left = (event.originalEvent.clientX -10) + "px";
	feature_info_popup.style.top = (event.originalEvent.clientY + 20) + "px";
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
	process_selections(true);
}

function refresh_datalayer()
{
	if (app.map.datalayer) app.map.datalayer.setStyle(map_style);
	if (app.map.selectionlayer) app.map.selectionlayer.setStyle(map_style_selected);
}

function map_transparency_changed(event)
{
	//console.log("map_transparency_changed:", event);
	let transparency = event.target.value;
	if (transparency && (!isNaN(transparency)) && (transparency >= 0.0) && (transparency <= 1.0))
	{
		app.selection.map_opacity = 1.0 - Number(transparency);
		app.view.map_opacity_selected =  1.0 - (Number(transparency) / 2);
		if (app.selection.map_opacity === 0.0) app.view.map_opacity_selected = 0.0;
		refresh_datalayer();
	}
}