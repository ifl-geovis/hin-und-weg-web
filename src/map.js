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


/* --- Header / Zoom / Year-Container / Search Position -------------------- */
function position_header_zoom_year() {
    const mapEl = document.getElementById('leafletmap');
    const headerEl = document.getElementById('header');
    const containerEl = document.getElementById('year_play_container');
    const searchEl = document.getElementById('search_container');
    if (!mapEl) return;

    /* Auf Mobile übernimmt die CSS mit !important — keine inline styles setzen */
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (isMobile) {
        if (containerEl) {
            containerEl.style.top = '';
            containerEl.style.left = '';
            containerEl.style.bottom = '';
        }
        if (searchEl) {
            searchEl.style.left = '';
            searchEl.style.top = '';
            searchEl.style.width = '';
        }
        const zoomCorner = mapEl.querySelector('.leaflet-top.leaflet-left');
        if (zoomCorner) zoomCorner.style.marginTop = '';
        return;
    }

    /* --- Desktop-Layout ---------------------------------------------------
       Ebene 1 (top:16): Header links | Legende + FABs rechts
       Ebene 2 (unter Header): Jahresanzeige + Suchfeld
       Ebene 3 (darunter): Zoom-Control */

    const rect = headerEl ? headerEl.getBoundingClientRect() : null;
    const spacing = 8;
    const headerLeft   = rect ? rect.left   : 16;
    const headerBottom = rect ? rect.bottom : 16;
    const headerRight  = rect ? rect.right  : (16 + 400);

    /* Ebene 2: Jahresanzeige linksbündig unter dem Header,
       auf gleicher X-Achse wie der Header selbst */
    let yearRightEdge = headerLeft;   /* Fallback */
    if (containerEl) {
        containerEl.style.top = (headerBottom + spacing) + 'px';
        containerEl.style.bottom = '';
        containerEl.style.left = headerLeft + 'px';
    }

    /* Requestrahmen für korrekte getBoundingClientRect nach dem Style-Update */
    requestAnimationFrame(() => {
        let yearRect = null;
        if (containerEl) yearRect = containerEl.getBoundingClientRect();

        /* Ebene 2: Suchfeld rechts neben Jahresanzeige, bis Header-rechte-Kante */
        if (searchEl) {
            const leftEdge = (yearRect ? yearRect.right : headerLeft) + spacing;
            let width = headerRight - leftEdge;
            const MIN_WIDTH = 200;
            const MAX_WIDTH = 520;
            if (width < MIN_WIDTH) width = MIN_WIDTH;
            if (width > MAX_WIDTH) width = MAX_WIDTH;

            searchEl.style.top   = (headerBottom + spacing) + 'px';
            searchEl.style.left  = leftEdge + 'px';
            searchEl.style.width = width + 'px';
        }

        /* Ebene 3: Zoom-Control unter Jahresanzeige/Suchfeld */
        const zoomCorner = mapEl.querySelector('.leaflet-top.leaflet-left');
        if (zoomCorner) {
            const yearBottom = yearRect ? yearRect.bottom : (headerBottom + spacing + 52);
            zoomCorner.style.marginTop = (yearBottom + spacing) + 'px';
        }
    });
}

window.position_header_zoom_year = position_header_zoom_year;


/**
 * Positioniert das Suchfeld:
 * - vertikal auf gleicher Höhe wie die Jahresanzeige (unter dem Header)
 * - horizontal: startet rechts neben der Jahresanzeige
 * - Breite: bis zur rechten Kante des Header-Kastens
 */
function _position_search_field(searchEl, yearContainerEl, headerBottom, headerRight, spacing) {
    if (!searchEl) return;

    /* Linke Kante: rechts neben der Jahresanzeige (mit Abstand) */
    let leftEdge;
    if (yearContainerEl) {
        const yearRect = yearContainerEl.getBoundingClientRect();
        leftEdge = yearRect.right + spacing;
    } else {
        /* Kein year_play_container? Dann direkt hinter dem Zoom-Control */
        leftEdge = 16 + 44 + spacing + spacing;
    }

    /* Breite: bis zur rechten Kante des Header-Kastens */
    let width = headerRight - leftEdge;

    /* Mindestbreite, damit das Feld nutzbar bleibt (z. B. wenn Header schmal ist) */
    const MIN_WIDTH = 220;
    if (width < MIN_WIDTH) width = MIN_WIDTH;

    /* Maximalbreite deckeln — sonst wird das Feld auf sehr breiten Bildschirmen
       riesig, das ist optisch nicht gewollt. */
    const MAX_WIDTH = 520;
    if (width > MAX_WIDTH) width = MAX_WIDTH;

    searchEl.style.top   = (headerBottom + spacing) + 'px';
    searchEl.style.left  = leftEdge + 'px';
    searchEl.style.width = width + 'px';
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
        init_map_tap_dismiss();                         /* NEU */
    });


    /* Resize mit rAF-Throttle */
    let resizeRaf = null;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            if (app.map.datalayer) fit_map_to_data();
            position_header_zoom_year();
            if (typeof update_panel_position === 'function') {
                update_panel_position();                    /* NEU */
            }
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
    const ARROW_WEIGHT_HEAD_BASE = 0.6;
    const ARROW_WEIGHT_BODY_BASE = 0.8;

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
    if (maxPos === 0) maxPos =  1;

    /* Pfeilfarben aus CSS-Variablen lesen — bleibt CD-konform */
    const rootStyle = getComputedStyle(document.documentElement);
    const COLOR_INFLOW  = rootStyle.getPropertyValue('--hw-arrow-inflow').trim()  || '#4fb08c';
    const COLOR_OUTFLOW = rootStyle.getPropertyValue('--hw-arrow-outflow').trim() || '#2b8fc7';

    for (const dataset of visible) {
        if (dataset.migrations === 0 || dataset.migrations === null || dataset.migrations === undefined) continue;

        const otherCentroid = app.data.centroid_mapping[dataset.fromid];
        const selfCentroid  = app.data.centroid_mapping[dataset.toid];
        if (!otherCentroid || !selfCentroid) continue;

        let from, to, color, weight_head, weight_body, isInflow;

        if (dataset.migrations > 0) {
            /* Zuwanderung: Pfeil zeigt vom anderen Kreis ins selektierte Gebiet.
               Alle Zuwanderungspfeile enden am selben Punkt → Spitzen weglassen. */
            isInflow = true;
            from = otherCentroid;
            to   = selfCentroid;
            color = COLOR_INFLOW;
            const norm = dataset.migrations / maxPos;
            weight_head = norm * ARROW_WEIGHT_HEAD_BASE + 1.5;
            weight_body = norm * ARROW_WEIGHT_BODY_BASE + 1.5;
        } else {
            /* Abwanderung: Pfeil zeigt vom selektierten Gebiet zum anderen Kreis.
               Spitzen fächern auf → Richtung wichtig, Spitze bleibt erhalten. */
            isInflow = false;
            from = selfCentroid;
            to   = otherCentroid;
            color = COLOR_OUTFLOW;
            const norm = dataset.migrations / minNeg;      /* 0..1 (positiv) */
            weight_head = norm * ARROW_WEIGHT_HEAD_BASE + 1.5;
            weight_body = norm * ARROW_WEIGHT_BODY_BASE + 1.5;
        }

        /* Pfeilkopf nur bei Abwanderung — bei Zuwanderung überlappen sich sonst
           alle Spitzen im selben Zielpunkt. */
        if (!isInflow) {
            const swoopy_head = L.swoopyArrow(from, to, {
                color: color,
                weight: weight_head,
                arrowFilled: true,
                hideArrowHead: false,
            });
            app.view.swoopy_arrows.push(swoopy_head);
        }

        /* Body (dickere Linie ohne Kopf) — immer erzeugen, bildet die Stärke ab */
        const swoopy_body = L.swoopyArrow(from, to, {
            color: color,
            weight: weight_body,
            arrowFilled: false,
            hideArrowHead: true,
        });
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
/* Kleiner Cache-Helfer: liest eine CSS-Variable vom :root */
function _cssVar(name, fallback) {
    try {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    } catch (e) {
        return fallback;
    }
}

function map_style(feature) {
    const feature_id = get_feature_id(feature);
    const is_selected = is_selected_feature(feature_id);
    const color = get_color_for_feature_id(feature_id);
    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: '#9a9a9a',                                 /* dezenter Grenz-Grauton */
        fillOpacity: is_selected ? app.view.map_opacity_selected : app.selection.map_opacity,
    };
}

function map_style_selected(feature) {
    const feature_id = get_feature_id(feature);
    const is_selected = is_selected_feature(feature_id);
    return {
        weight: 3,
        opacity: is_selected ? 1 : 0,
        color: _cssVar('--hw-purple-dark', '#4b2c7a'),    /* CD-Lila aus CSS */
        fillOpacity: 0,
    };
}


/* --- Map interaction ------------------------------------------------------ */
function map_interactivity(feature, layer) {
    /* Hover-Popup NUR auf Geräten mit echtem Zeiger (Desktop/Wartung).
       Auf Touch-only Geräten wäre das Popup nach dem Tap sofort weg. */
    if (!_isTouchOnly) {
        layer.on({
            mouseover: highlight_feature,
            mouseout:  reset_highlight_feature,
            mousemove: move_feature_popup,
        });
    }
    /* Klick / Tap: einheitlicher Handler für Maus & Touch */
    layer.on({ click: on_feature_tap });
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
        fillColor:   _cssVar('--hw-yellow-dark', '#f2b800'),   /* CD-Gelb */
        fillOpacity: 0.45,
        color:       _cssVar('--hw-purple-dark', '#4b2c7a'),   /* CD-Lila */
        weight:      2.5,
        opacity:     1,
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
/* ==========================================================================
   Zwei-Stufen-Tap-Modell für Touchscreens
   1. Tap → Detail-Panel anzeigen, Kreis in Gelb hervorheben (Vorschau)
   2. Tap auf denselben Kreis → als Bezugskreis übernehmen
   Tap woanders / Schließen-Button → Panel schließen
   ========================================================================== */

   let _tapPreviewId = null;
   let _tapPreviewLayer = null;
   
   function on_feature_tap(event) {
       const feature_id = get_feature_id(event.target.feature);
       if (!feature_id) return;
   
       /* Ist der angetippte Kreis identisch mit dem aktuellen Bezugskreis?
          Dann sofort Panel-Modus überspringen — keine Aktion nötig, aber Panel zeigen. */
       if (feature_id === app.selection.area_id) {
           _tapPreviewId = feature_id;
           show_detail_panel(feature_id, /*isSelf=*/true);
           if (typeof reset_idle_timer === 'function') reset_idle_timer();
           return;
       }
   
       if (_tapPreviewId === feature_id) {
           /* Zweiter Tap auf denselben Kreis → als neuen Bezugskreis übernehmen */
           _tapPreviewId = null;
           _tapPreviewLayer = null;
           hide_detail_panel();
           app.selection.area_id = feature_id;
           /* Legacy area_selector defensiv */
           const area_selector = document.getElementById('area_selector');
           if (area_selector) area_selector.value = feature_id;
           process_selections(true);
       } else {
           /* Erster Tap (oder Wechsel zu anderem Kreis) → Vorschau + Panel */
           clear_preview_highlight();
           _tapPreviewId = feature_id;
           _tapPreviewLayer = event.target;
           preview_highlight_feature(event.target);
           show_detail_panel(feature_id, /*isSelf=*/false);
       }
       if (typeof reset_idle_timer === 'function') reset_idle_timer();
   }
   
   function preview_highlight_feature(layer) {
       /* CD-Gelb füllen, CD-Lila-Rand — visuell identisch zum Desktop-Hover */
       layer.setStyle({
           fillColor:   '#f2b800',                 /* CD-Gelb */
           fillOpacity: 0.55,
           color:       '#4b2c7a',                 /* CD-Lila */
           weight:      3,
           opacity:     1,
       });
       layer.bringToFront();
   }
   
   function clear_preview_highlight() {
       if (_tapPreviewLayer && app.map.selectionlayer) {
           try { app.map.selectionlayer.resetStyle(_tapPreviewLayer); }
           catch (e) { /* Layer evtl. schon entfernt */ }
       }
       _tapPreviewLayer = null;
   }
   
   /* Klick auf leere Kartenfläche (nicht auf ein Feature) → Panel schließen.
      Wird via init_map_tap_dismiss() in init_map() registriert. */
   function init_map_tap_dismiss() {
       if (!app.map.map) return;
       app.map.map.on('click', (ev) => {
           /* Leaflet propagiert den Klick auch dann an die Karte, wenn ein Feature
              getroffen wurde. Wir prüfen daher, ob das Ziel ein Pfad-Element ist:
              wenn ja, hat on_feature_tap() bereits reagiert. */
           const target = ev.originalEvent && ev.originalEvent.target;
           const isFeature = target && (target.tagName === 'path' || target.closest('.leaflet-interactive'));
           if (isFeature) return;
   
           if (_tapPreviewId !== null) {
               _tapPreviewId = null;
               clear_preview_highlight();
               hide_detail_panel();
           }
       });
   }
   
   /* Rückwärts-Kompatibilität: alte select_feature-API bleibt bestehen
      (z. B. für area_selected() aus main.js). Sie umgeht die Zwei-Stufen-Logik
      und wählt sofort aus — sinnvoll z. B. für ein Idle-Reset auf Default-Kreis. */
   function select_feature(event) {
       const feature_id = get_feature_id(event.target.feature);
       if (!feature_id) return;
       _tapPreviewId = null;
       clear_preview_highlight();
       hide_detail_panel();
       app.selection.area_id = feature_id;
       const area_selector = document.getElementById('area_selector');
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
