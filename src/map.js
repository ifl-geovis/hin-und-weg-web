/* ==========================================================================
   map.js — Medienstation
   - Theme fest 'saldi'
   - Pfeile nur Top 3 + Bottom 3 (gesteuert über row._show_arrow)
   - Touch-optimiert (tap: true, kein Hover-Popup auf Touch-only)
   - Defensiv gegenüber entfernten Legacy-DOM-Elementen
   ========================================================================== */

/* --- Touch-Erkennung ------------------------------------------------------ */

const _isTouchOnly = (function () {
    return ('ontouchstart' in window) &&
           !(window.matchMedia && window.matchMedia('(hover: hover)').matches);
})();


/* --- Padding-Berechnung für fitBounds ------------------------------------- */

function get_map_fit_padding_options() {
    const map = app.map.map;
    if (!map) return {};

    const size = map.getSize();
    const vpPadX = Math.max(16, Math.round(size.x * 0.04));
    const vpPadY = Math.max(16, Math.round(size.y * 0.04));

    const headerEl = document.getElementById('header');
    const topUI = headerEl ? (headerEl.getBoundingClientRect().height + 8) : 0;

    /* Slider unten */
    const sliderEl = document.getElementById('year_slider_container');
    const sliderVisible = sliderEl && getComputedStyle(sliderEl).display !== 'none';
    const bottomUI = sliderVisible ? (sliderEl.getBoundingClientRect().height + 24) : 0;

    /* Action-Buttons rechts */
    const rightUI = 80;
    const leftUI = 60;     /* Zoom-Control */

    const paddingTopLeft = L.point(Math.max(vpPadX, leftUI), Math.max(vpPadY, topUI));
    const paddingBottomRight = L.point(Math.max(vpPadX, rightUI), Math.max(vpPadY, bottomUI));
    return { paddingTopLeft, paddingBottomRight };
}


/* --- Header / Zoom / Year-Container Position ----------------------------- */

function position_header_zoom_year() {
    const mapEl = document.getElementById('leafletmap');
    const headerEl = document.getElementById('header');
    const containerEl = document.getElementById('year_play_container');
    if (!mapEl) return;

    const rect = headerEl ? headerEl.getBoundingClientRect() : null;
    const spacing = 8;
    const headerBottom = rect ? rect.bottom : 16;

    const zoomCorner = mapEl.querySelector('.leaflet-top.leaflet-left');
    if (zoomCorner) {
        zoomCorner.style.marginTop = (headerBottom + spacing) + 'px';
    }

    if (containerEl) {
        containerEl.style.top = (headerBottom + spacing) + 'px';
        const zoomControl = mapEl.querySelector('.leaflet-control-zoom');
        if (zoomControl) {
            const zoomRect = zoomControl.getBoundingClientRect();
            containerEl.style.left = (zoomRect.right + spacing) + 'px';
        } else {
            containerEl.style.left = (16 + 44 + spacing) + 'px';
        }
    }
}
window.position_header_zoom_year = position_header_zoom_year;


/* --- Fit map to data ------------------------------------------------------ */

function fit_map_to_data() {
    const map = app.map.map;
    if (!map || !app.map.datalayer) return;
    map.invalidateSize(true);
    const bounds = app.map.datalayer.getBounds();
    if (bounds && bounds.isValid && bounds.isValid()) {
        const opts = get_map_fit_padding_options();
        map.fitBounds(bounds, opts);
    }
}


/* --- Map init ------------------------------------------------------------- */

function init_map() {
    app.map.map = L.map("leafletmap", {
        zoomSnap: 0.2,
        zoomDelta: 0.2,
        wheelPxPerZoomLevel: 120,
        tap: true,                          /* Touch-Aktivierung */
        tapTolerance: 15,                   /* großzügiger für Finger */
        doubleClickZoom: false,             /* sonst zoomed Doppeltap */
        zoomControl: true,
    });
    app.map.map.setView([51.5, 10], 7);

    const firstOption = app.map.background_options[0];
    app.map.backgroundlayer = L.tileLayer(firstOption.url, {
        attribution: firstOption.attribution,
        maxZoom: firstOption.maxZoom || 19,
    });
    app.map.backgroundlayer.addTo(app.map.map);
    app.map.background_index = 0;
    app.status.background_active = true;

    app.map.map.whenReady(() => {
        position_header_zoom_year();
    });

    /* Resize mit rAF-Throttle */
    let resizeRaf = null;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            if (app.map.datalayer) fit_map_to_data();
            position_header_zoom_year();
        });
    });

    /* Karte als Trigger für Idle-Reset */
    app.map.map.on('click', () => {
        if (typeof reset_idle_timer === 'function') reset_idle_timer();
    });
    app.map.map.on('movestart zoomstart', () => {
        if (typeof reset_idle_timer === 'function') reset_idle_timer();
    });
}


/* --- Swoopy arrows -------------------------------------------------------- */

function refresh_swoopy_arrows() {
    remove_swoopy_arrows();
    if (!app.selection.swoopy_arrows) return;
    add_swoopy_arrows();
    show_swoopy_arrows();
}

function remove_swoopy_arrows() {
    for (let arrow of app.view.swoopy_arrows) arrow.removeFrom(app.map.map);
    app.view.swoopy_arrows = [];
}

/* Pfeile nur für Zeilen mit row._show_arrow === true (Top 3 + Bottom 3) */
function add_swoopy_arrows() {
    const ARROW_WEIGHT_HEAD_BASE = 1.0;
    const ARROW_WEIGHT_BODY_BASE = 3.5;

    if (!app.selection.swoopy_arrows) return;
    if (!app.data.geodata) return;
    if (!app.data.processed) return;
    if (!app.data.centroid_mapping) return;

    /* Min/Max für Skalierung — auf den Top/Bottom-3 (sichtbaren) Pfeilen */
    const visible = app.data.processed.filter(r => r._show_arrow);
    if (visible.length === 0) return;

    let minNeg = 0, maxPos = 0;
    for (const r of visible) {
        if (r.migrations < 0 && r.migrations < minNeg) minNeg = r.migrations;
        if (r.migrations > 0 && r.migrations > maxPos) maxPos = r.migrations;
    }
    /* Schutz gegen Division durch 0 */
    if (minNeg === 0) minNeg = -1;
    if (maxPos === 0) maxPos = 1;

    const COLOR_INFLOW  = '#4a2c7a';   /* Lila dunkel — Zuwanderung */
    const COLOR_OUTFLOW = '#fbb614';   /* Gelb dunkel — Abwanderung (Hands-On) */
    /* Alternative: rot/blau wie früher; hier Corporate-Design-Töne. */

    for (const dataset of visible) {
        if (dataset.migrations === 0 || dataset.migrations === null || dataset.migrations === undefined) continue;

        const otherCentroid = app.data.centroid_mapping[dataset.fromid];
        const selfCentroid  = app.data.centroid_mapping[dataset.toid];
        if (!otherCentroid || !selfCentroid) continue;

        let from, to, color, weight_head, weight_body;

        if (dataset.migrations > 0) {
            /* Zuwanderung: Pfeil zeigt vom anderen Kreis ins selektierte Gebiet */
            from = otherCentroid;
            to   = selfCentroid;
            color = COLOR_INFLOW;
            const norm = dataset.migrations / maxPos;       /* 0..1 */
            weight_head = norm * ARROW_WEIGHT_HEAD_BASE + 1.5;
            weight_body = norm * ARROW_WEIGHT_BODY_BASE + 1.5;
        } else {
            /* Abwanderung: Pfeil zeigt vom selektierten Gebiet zum anderen Kreis */
            from = selfCentroid;
            to   = otherCentroid;
            color = COLOR_OUTFLOW;
            const norm = dataset.migrations / minNeg;       /* 0..1 (positiv) */
            weight_head = norm * ARROW_WEIGHT_HEAD_BASE + 1.5;
            weight_body = norm * ARROW_WEIGHT_BODY_BASE + 1.5;
        }

        const swoopy_head = L.swoopyArrow(from, to, {
            color: color,
            weight: weight_head,
            arrowFilled: true,
            hideArrowHead: false,
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

function show_swoopy_arrows() {
    if (!app.selection.swoopy_arrows) return;
    for (let arrow of app.view.swoopy_arrows) arrow.addTo(app.map.map);
}


/* --- Map labels ----------------------------------------------------------- */

function refresh_map_labels() {
    if (!app.map.selectionlayer) return;
    if (app.map.labels && app.map.labels.length) {
        for (const label of app.map.labels) label.removeFrom(app.map.map);
        app.map.labels = [];
    }
    if (!app.selection.labels || app.selection.labels === 'none') return;

    app.map.selectionlayer.eachLayer(function (layer) {
        if (layer && layer.feature) map_labels(layer.feature, layer);
    });
}


/* --- Map styling ---------------------------------------------------------- */

function map_style(feature) {
    const feature_id = get_feature_id(feature);
    const is_selected = is_selected_feature(feature_id);
    const color = get_color_for_feature_id(feature_id);
    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: '#888888',
        fillOpacity: is_selected ? app.view.map_opacity_selected : app.selection.map_opacity,
    };
}

function map_style_selected(feature) {
    const feature_id = get_feature_id(feature);
    const is_selected = is_selected_feature(feature_id);
    return {
        weight: 3,
        opacity: is_selected ? 1 : 0,
        color: '#4a2c7a',                  /* Corporate-Lila statt schwarz */
        fillOpacity: 0,
    };
}


/* --- Map interaction ------------------------------------------------------ */

function map_interactivity(feature, layer) {
    /* Auf Touch-only Geräten kein Hover-Popup */
    if (!_isTouchOnly) {
        layer.on({
            mouseover: highlight_feature,
            mouseout: reset_highlight_feature,
            mousemove: move_feature_popup,
        });
    }
    layer.on({
        click: select_feature,
    });
}

function show_info_popup(event) {
    const feature_id = get_feature_id(event.target.feature);
    const feature_info = get_feature_by_id(feature_id, false);
    const feature_name = (app.data.featurename_mapping || {})[feature_id] || feature_id;
    const popup = document.getElementById("feature_info_popup");
    if (!popup) return;

    let info_text = '<strong>' + feature_name + '</strong>';
    if (feature_id !== feature_name) info_text += ' <small>(' + feature_id + ')</small>';
    info_text += '<br />';

    if (feature_info && feature_info.migrations !== null && feature_info.migrations !== undefined) {
        const decimals = (app.selection.data_interpretation === 'migration_rate') ? 2 : 0;
        const val = feature_info.migrations;
        const label = val > 0 ? 'Zuwanderungssaldo' : (val < 0 ? 'Abwanderungssaldo' : 'Saldo');
        info_text += label + ': ' + format_value(val, decimals);
    } else {
        info_text += '<em>Keine Daten</em>';
    }

    popup.innerHTML = info_text;
    popup.style.display = "block";
    popup.style.left = (event.originalEvent.clientX + 12) + "px";
    popup.style.top  = (event.originalEvent.clientY + 12) + "px";
}

function map_labels(feature, layer) {
    if (!app.selection.labels || app.selection.labels === 'none') return;
    if (!app.selection.dataset) return;

    const idprop = app.selection.dataset.id_property;
    const nameprop = app.selection.dataset.name_property;
    if (!idprop) return;

    const feature_info = get_feature_by_id(feature.properties[idprop], false);
    if (!feature_info) return;

    let label_text = null;
    if (app.selection.labels === 'name') label_text = feature.properties[nameprop];
    if (app.selection.labels === 'number') {
        const decimals = (app.selection.data_interpretation === 'migration_rate') ? 2 : 0;
        label_text = format_value(feature_info.migrations, decimals);
    }
    if (!label_text) return;

    const label = {
        className: 'map_info_label',
        html: label_text,
        iconSize: ['auto', 'auto'],
    };
    const label_obj = L.marker(layer.getBounds().getCenter(), { icon: L.divIcon(label) });
    app.map.labels.push(label_obj);
    label_obj.addTo(app.map.map);
}

function map_features(feature, layer) {
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
        app.map.datalayer = L.geoJSON(app.data.geodata, { style: map_style });
        app.map.selectionlayer = L.geoJSON(app.data.geodata, { style: map_style_selected, onEachFeature: map_features });
    }
    if (app.map.datalayer) {
        app.map.datalayer.addTo(app.map.map);
        fit_map_to_data();
    }
    if (app.map.selectionlayer) app.map.selectionlayer.addTo(app.map.map);
    refresh_swoopy_arrows();
}

function zoom_home() {
    if (app.map.datalayer) {
        fit_map_to_data();
    } else if (app.map.map) {
        app.map.map.setView([51.5, 10], 7);
    }
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}


/* --- Background switcher -------------------------------------------------- */

function map_background_switcher() {
    const options = app.map.background_options;
    if (!options || options.length === 0) return;

    if (app.map.backgroundlayer && app.status.background_active) {
        app.map.backgroundlayer.removeFrom(app.map.map);
    }

    let nextIndex = app.map.background_index + 1;
    if (nextIndex >= options.length) nextIndex = -1;
    app.map.background_index = nextIndex;

    if (nextIndex === -1) {
        app.status.background_active = false;
    } else {
        const opt = options[nextIndex];
        app.map.backgroundlayer = L.tileLayer(opt.url, {
            attribution: opt.attribution,
            maxZoom: opt.maxZoom || 19,
        });
        app.map.backgroundlayer.addTo(app.map.map);
        app.status.background_active = true;
    }

    if (app.map.datalayer) app.map.datalayer.bringToBack();
    if (app.map.backgroundlayer && app.status.background_active) {
        app.map.backgroundlayer.bringToBack();
    }
    if (app.map.selectionlayer) app.map.selectionlayer.bringToFront();

    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}


/* --- Feature helpers ------------------------------------------------------ */

function get_feature_id(feature) {
    /* Defensiv, falls dataset doch mal nicht gesetzt ist */
    if (app.selection.dataset && app.selection.dataset.id_property) {
        return feature.properties[app.selection.dataset.id_property];
    }
    /* Fallback: erste Eigenschaft, die in featurename_mapping passt */
    for (const k in feature.properties) {
        if (app.data.featurename_mapping[feature.properties[k]]) {
            return feature.properties[k];
        }
    }
    return null;
}

function is_selected_feature(feature_id) {
    return (app.selection.area_id === feature_id);
}

function highlight_feature(event) {
    const layer = event.target;
    layer.setStyle({
        fillColor: '#fbb614',                 /* Hands-On Gelb für Hover */
        fillOpacity: 0.5,
        color: '#4a2c7a',
        weight: 2.5,
        opacity: 1,
    });
    layer.bringToFront();
    show_info_popup(event);
}

function move_feature_popup(event) {
    const popup = document.getElementById("feature_info_popup");
    if (!popup) return;
    popup.style.left = (event.originalEvent.clientX + 12) + "px";
    popup.style.top  = (event.originalEvent.clientY + 12) + "px";
}

function reset_highlight_feature(event) {
    if (app.map.selectionlayer) app.map.selectionlayer.resetStyle(event.target);
    const popup = document.getElementById("feature_info_popup");
    if (popup) popup.style.display = "none";
}

/* Klick auf einen Landkreis: Auswahl setzen, Daten neu prozessieren */
function select_feature(event) {
    const feature_id = get_feature_id(event.target.feature);
    if (!feature_id) return;
    app.selection.area_id = feature_id;
    /* Legacy area_selector defensiv */
    const area_selector = document.getElementById("area_selector");
    if (area_selector) area_selector.value = feature_id;
    process_selections(true);
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}

function refresh_datalayer() {
    if (app.map.datalayer) app.map.datalayer.setStyle(map_style);
    if (app.map.selectionlayer) app.map.selectionlayer.setStyle(map_style_selected);
}

/* No-op (Transparenz-Slider wurde entfernt) */
function map_transparency_changed() { /* no-op */ }
