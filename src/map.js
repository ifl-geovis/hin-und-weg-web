// map functions
// CHANGED: responsive padding for fitBounds so the map fills the screen with a small buffer
function get_map_fit_padding() {
	// Use 5% of viewport size as padding with a minimum of 16px
	if (!app.map.map) return L.point(20, 20);
	const size = app.map.map.getSize();
	const padX = Math.max(16, Math.round(size.x * 0.05));
	const padY = Math.max(16, Math.round(size.y * 0.05));
	return L.point(padX, padY);
}
// Responsive padding so the map fills the screen with a small buffer and avoids fixed UI
function get_map_fit_padding_options() {
	const map = app.map.map;
	if (!map) return {};

	const size = map.getSize();
	// Base padding: ~4% of viewport with a minimum of 16px
	const vpPadX = Math.max(16, Math.round(size.x * 0.04));
	const vpPadY = Math.max(16, Math.round(size.y * 0.04));

	// Account for fixed header (top) and credits (bottom) if visible
	const headerEl = document.getElementById('header');
	const topUI = headerEl ? (headerEl.getBoundingClientRect().height + 8) : 0;

	const creditsEl = document.getElementById('credits');
	const creditsVisible = creditsEl && getComputedStyle(creditsEl).visibility !== 'hidden' && getComputedStyle(creditsEl).display !== 'none';
	const bottomUI = creditsVisible ? (creditsEl.getBoundingClientRect().height + 8) : 0;

	// Right-side action buttons column (≈40px + borders/gap)
	const rightUI = 52;
	// Left side: no persistent UI except credits bottom-left already covered
	const leftUI = 16;

	const paddingTopLeft = L.point(Math.max(vpPadX, leftUI), Math.max(vpPadY, topUI));
	const paddingBottomRight = L.point(Math.max(vpPadX, rightUI), Math.max(vpPadY, bottomUI));
	return { paddingTopLeft, paddingBottomRight };
}
// === NEW: Position header, zoom control, and year badge in the top-right ===
function position_header_zoom_year() {
	const mapEl = document.getElementById('leafletmap');
	const headerEl = document.getElementById('header');
	const badgeEl = document.getElementById('current_year_badge');
	if (!mapEl) return;

	// Corner container for Leaflet's top-right controls
	const corner = mapEl.querySelector('.leaflet-top.leaflet-right');
	if (!corner) return;

	// Measure header size; place things below it with a little spacing
	const rect = headerEl ? headerEl.getBoundingClientRect() : null;
	const spacing = 8;
	const headerBottom = rect ? rect.bottom : 10; // fallback

	// 1) Vertically: both zoom control and year badge sit below the header
	corner.style.marginTop = (headerBottom + spacing) + 'px';
	if (badgeEl) {
		badgeEl.style.top = (headerBottom + spacing) + 'px';
	}

	// 2) Horizontally:
	//    - Year badge aligns to right: 10px (via CSS).
	//    - Zoom control is pushed left so that the badge can be 20px to its right.
	//      margin-right = 10px (edge) + [badge width] + 20px (gap)
	let badgeW = 0;
	if (badgeEl) {
		const bRect = badgeEl.getBoundingClientRect();
		badgeW = Math.round(bRect.width);
	}
	const baseRightGap = 10;      // right margin for the outermost item (badge)
	const gapBetween = 20;        // required space "to the right of the zoom toggle"
	const totalRight = baseRightGap + badgeW + gapBetween;

	corner.style.marginRight = totalRight + 'px';
}

// Expose for other modules to call after text/layout changes
window.position_header_zoom_year = position_header_zoom_year;

// Centralized fit-to-data with proper padding and size invalidation
function fit_map_to_data() {
	const map = app.map.map;
	if (!map || !app.map.datalayer) return;

	// Ensure Leaflet knows the current container size
	map.invalidateSize(true);

	const bounds = app.map.datalayer.getBounds();
	if (bounds && bounds.isValid && bounds.isValid()) {
		const opts = get_map_fit_padding_options();
		map.fitBounds(bounds, opts);
	}
}

function init_map()
{
	/* CHANGED: remove default zoom control so we can place it top-right */
	app.map.map = L.map("leafletmap");
	// Initial placeholder view; will be replaced by fit_map_to_data() once data loads
	app.map.map.setView([51.5, 10], 7);

	// CHANGED: create the initial background layer from the options array
	// instead of hard-coding the OSM URL
	const firstOption = app.map.background_options[0];
	app.map.backgroundlayer = L.tileLayer(firstOption.url, {
		attribution: firstOption.attribution,
		maxZoom: firstOption.maxZoom || 19,
	});
	app.map.backgroundlayer.addTo(app.map.map);
	app.map.background_index = 0;
	app.status.background_active = true;

	/* NEW: Position zoom under header and offset by year badge */
	app.map.map.whenReady(() => {
		position_header_zoom_year(); // ADDED
	});

	// Refit when the window resizes and keep the layout tidy
	window.addEventListener('resize', () => {
		if (app.map.datalayer) fit_map_to_data();
		position_header_zoom_year(); // ADDED
	});
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
	const range = (max - min) || 1; // avoid division by zero when all values equal
    for (let dataset of app.data.processed) {
        // Skip arrows for zero values and missing data
        if (dataset.migrations === 0 || dataset.migrations === null || dataset.migrations === undefined) continue;

		let weight_head = (((dataset.migrations - min) / range) * arrow_weight_head) + 1;
		let weight_body = (((dataset.migrations - min) / range) * arrow_weight_body) + 1;		
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

// Rebuild map labels to reflect current values/formatting (e.g., when year or mode changes)
function refresh_map_labels() {
	if (!app.map.selectionlayer) return;

	// Remove existing labels
	if (app.map.labels && app.map.labels.length) {
		for (const label of app.map.labels) label.removeFrom(app.map.map);
		app.map.labels = [];
	}

	// If labels are off, nothing to (re)create
	if (!app.selection.labels || app.selection.labels === 'none') return;

	// Recreate labels for each feature in the selection layer
	app.map.selectionlayer.eachLayer(function (layer) {
		if (layer && layer.feature) {
			map_labels(layer.feature, layer);
		}
	});
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

// Unified, NA-aware popup; uses format_value and correct decimals
function show_info_popup(event) {
	const feature_id = get_feature_id(event.target.feature);
	const feature_info = get_feature_by_id(feature_id, false);
	const feature_name = app.data.featurename_mapping[feature_id];
	const feature_info_popup = document.getElementById("feature_info_popup");
	let info_text = "";
  
	info_text += feature_name + " (" + feature_id + ")<br />";
	if (feature_info) {
	  info_text += feature_info.fromname;
	  if (app.selection.theme === 'von') info_text += "→";
	  else if (app.selection.theme === 'nach') info_text += "←";
	  else if (app.selection.theme === 'saldi') info_text += "←→";
  
	   // Only show decimals for Rate (max 2), otherwise integer for Umzüge
	   const decimals = (app.selection.data_interpretation === 'migration_rate') ? 2 : 0;
	   info_text += feature_info.toname + ":<br />" + format_value(feature_info.migrations, decimals);
	 
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
	// Only show decimals for Rate (max 2), integer for Umzüge
	if (app.selection.labels === 'number') {
		const decimals = (app.selection.data_interpretation === 'migration_rate') ? 2 : 0;
		label_text = format_value(feature_info.migrations, decimals);
	}
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
		// Fill the screen with a small buffer and respect fixed UI
		fit_map_to_data();
	}
    if (app.map.selectionlayer) app.map.selectionlayer.addTo(app.map.map);
    refresh_swoopy_arrows();
}

function zoom_home(event)
{
	if (app.map.datalayer) {
		fit_map_to_data();
	} else {
		app.map.map.setView([51.5, 10], 7);
	}
}

// CHANGED: cycle through multiple background tile providers on each click.
// The sequence is: option 0 → option 1 → ... → option N → off → option 0 → ...
// This lets the user pick a style without sea borders or turn the background off entirely.
function map_background_switcher(event)
{
	const options = app.map.background_options;
	if (!options || options.length === 0) return;

	// CHANGED: remove the current background layer if active
	if (app.map.backgroundlayer && app.status.background_active) {
		app.map.backgroundlayer.removeFrom(app.map.map);
	}

	// CHANGED: advance index; after the last option, go to -1 (off), then wrap to 0
	let nextIndex = app.map.background_index + 1;
	if (nextIndex >= options.length) {
		nextIndex = -1; // CHANGED: -1 means "background off"
	}
	if (nextIndex === -1 && !app.status.background_active) {
		// CHANGED: if we were already off, wrap back to 0
		nextIndex = 0;
	}

	app.map.background_index = nextIndex;

	if (nextIndex === -1) {
		// CHANGED: turn background off
		app.status.background_active = false;
		console.log("Hintergrundkarte: aus");
	} else {
		// CHANGED: create and add the new tile layer
		const opt = options[nextIndex];
		app.map.backgroundlayer = L.tileLayer(opt.url, {
			attribution: opt.attribution,
			maxZoom: opt.maxZoom || 19,
		});
		app.map.backgroundlayer.addTo(app.map.map);

		// CHANGED: ensure background stays behind the data layer
		if (app.map.backgroundlayer.setZIndex) {
			app.map.backgroundlayer.setZIndex(0);
		}
		app.status.background_active = true;
		console.log("Hintergrundkarte:", opt.name);
	}

	// CHANGED: bring data and selection layers back to the front
	if (app.map.datalayer) app.map.datalayer.bringToBack();
	if (app.map.backgroundlayer && app.status.background_active) {
		app.map.backgroundlayer.bringToBack();
	}
	if (app.map.selectionlayer) app.map.selectionlayer.bringToFront();
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

// CHANGED: removed duplicate show_info_popup() here (was overwriting NA logic)

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
