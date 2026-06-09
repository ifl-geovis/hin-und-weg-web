/* ==========================================================================
   main.js — Medienstation
   - Theme fest: 'saldi'
   - Pfeile: Top 3 + Bottom 3 Saldi
   - Sidebar/Settings entfernt
   - Robust gegenüber fehlenden Legacy-DOM-Elementen
   ========================================================================== */

   let app = {
    configuration: {
        colors: {
            /* Lila-Skala für POSITIVE Werte (Zuwanderung) — hell → dunkel */
            "purple_scale": {
                title: "Lila",
                scale: ['#D8CEF7', '#8B72EA', '#5D3EE1'],
            },
            /* Gelb-Skala für NEGATIVE Werte (Abwanderung) — hell → dunkel */
        "yellow_scale": {
    title: "Gelb (Abwanderung)",
    scale: ['#FFB400', '#FFE08A', '#FFF4D1'],   /* dunkel → hell */
},
            /* Legacy-Aliase entfernt — sie haben den Bug verursacht */
            "Greys": { title: "Graustufen", scale: "Greys" },
            "RdYlBu": { title: "Lila-Weiß-Gelb", scale: ['#5D3EE1', '#FFFFFF', '#FFB400'] },
        }
    },
    map: {
        map: null,
        datalayer: null,
        backgroundlayer: null,
        selectionlayer: null,
        labels: [],
        background_options: [
            {
                name: "CartoDB Positron",
                url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 20,
            },
            {
                name: "CartoDB (keine Labels)",
                url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 20,
            }
        ],
        background_index: 0,
    },

    status: {
        modal_dialog: false,
        loading: false,
        background_active: true,
        _legendDragMoved: false,
    },

    data: {
        geodata: null,
        featurename_mapping: {},
        centroid_mapping: {},
        migrations: {},
        unfiltered: null,
        processed: null,
        geostats: null,
        geostats_positive: null,
        geostats_negative: null,
    },

    selection: {
        dataset_id: null,
        dataset: null,
        category_id: null,
        category: null,
        theme: 'saldi',                          /* fest */
        data_interpretation: 'absolute',
        swoopy_arrows: true,
        labels: 'none',
        area_id: null,
        area_inside: false,                      /* in Saldi nicht sinnvoll */
        filter: { min: 0, max: 0 },
        classification: 'quantile',
        class_number: 'automatic',
        class_number_negative: 'automatic',
        colors:'purple_scale',
        colors_negative: 'yellow_scale',
        classborders: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        classborders_negative: [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1],
        map_opacity: 0.8,
        classification_overall: true,
        years: [],
    },

    view: {
        positions: {},
        swoopy_arrows: [],
        load_indicator_state: -1,
        map_opacity_selected: 0.75,
        legend_collapsed: false,
        year_player: {
            timer: null,
            isPlaying: false,
            index: 0,
            order: [],
            delay: 1200,
        },
    },

    datasets: {},
};


/* ==========================================================================
   Daten-Verarbeitungspipeline
   ========================================================================== */

   function process_selections(reset_filters) {
    show_load_indicator("Daten werden prozessiert.");
    if (typeof invalidate_color_cache === 'function') invalidate_color_cache();
    recalculate_data(reset_filters);
    refresh_datalayer();
    if (typeof refresh_map_labels === 'function') refresh_map_labels();
    refresh_title_years();
    refresh_swoopy_arrows();
    refresh_legend();
    app.status.loading = false;
    hide_load_indicator();
}

function recalculate_data(reset_filters) {
    app.data.processed = null;
    app.data.geostats = null;
    app.data.geostats_positive = null;
    app.data.geostats_negative = null;
    if (!app.selection.area_id) return;

    /* Theme ist immer 'saldi' im Kiosk */
    recalculate_data_saldi();
    recalculate_classification();
    post_process(reset_filters);
    mark_top_bottom_for_arrows();
}


function create_where_clause(elements) {
    if (!elements || elements.length < 1) return "";
    let clause = " WHERE";
    let first = true;
    for (let el of elements) {
        if (!first) clause += " AND";
        clause += " (" + el + ")";
        first = false;
    }
    return clause;
}

function list_selection_for_sql(additionals) {
    let list = additionals ? additionals.slice() : [];
    if (!app.selection.area_inside) list.push("fromid <> toid");
    if (app.selection.years && app.selection.years.length > 0) {
        list.push("year IN ('" + app.selection.years.join("', '") + "')");
    }
    return list;
}

function get_migration_select(direction) {
    if (app.selection.data_interpretation === 'migration_rate') {
        return 'ROUND(AVG(migration_rate_' + direction + '), 3) AS migrations';
    }
    return 'CASE WHEN COUNT(migrations) = 0 THEN NULL ELSE SUM(migrations) END AS migrations';
}
function recalculate_data_saldi() {
    const area = app.selection.area_id;
    const year = (app.selection.years && app.selection.years[0]) ? String(app.selection.years[0]) : null;
    if (!area || !year) { app.data.processed = []; return; }

    const areaPre = app.data.precomputed ? app.data.precomputed[area] : null;
    if (!areaPre) { app.data.processed = []; return; }

    const yearMap = areaPre.saldi[year] || {};
    const fnm = app.data.featurename_mapping || {};

    const result = [];
    for (const otherId in yearMap) {
        const saldo = yearMap[otherId];
        result.push({
            id: otherId,
            fromid: otherId,
            fromname: fnm[otherId] || otherId,
            toid: area,
            toname: fnm[area] || area,
            migrations: saldo,
        });
    }
    app.data.processed = result;
}


function post_process(reset_filters) {
    app.data.unfiltered = app.data.processed;
    process_filters(reset_filters);
}

/* BUG-FIX 5: konsistent === statt == */
function process_filters(reset_filters) {
    if (!app.data.geostats) return;
    if (reset_filters) return;
    /* Im Kiosk sind die Filter dauerhaft 0 (deaktiviert), trotzdem defensiv: */
    app.data.processed = [];
    const minVal = app.data.geostats.min();
    const maxVal = app.data.geostats.max();

    if (app.selection.filter.min < minVal) app.selection.filter.min = minVal;
    if (app.selection.filter.max > maxVal) app.selection.filter.max = maxVal;

    for (let row of app.data.unfiltered) {
        let passMin = true, passMax = true;
        if (app.selection.filter.min !== 0) {
            passMin = (row.migrations === null) || (row.migrations <= app.selection.filter.min) || (row.migrations > 0);
        }
        if (app.selection.filter.max !== 0) {
            passMax = (row.migrations === null) || (row.migrations >= app.selection.filter.max) || (row.migrations < 0);
        }
        if (passMin && passMax) app.data.processed.push(row);
    }
}


/* ==========================================================================
   Top/Bottom-3-Markierung für die Pfeil-Darstellung
   ========================================================================== */
   function mark_top_bottom_for_arrows() {
    if (!app.data.processed) return;
    for (const row of app.data.processed) row._show_arrow = false;

    const area = app.selection.area_id;
    const year = (app.selection.years && app.selection.years[0]) ? String(app.selection.years[0]) : null;
    if (!area || !year) return;

    const areaPre = app.data.precomputed ? app.data.precomputed[area] : null;
    if (!areaPre || !areaPre.topBottomPerYear || !areaPre.topBottomPerYear[year]) return;

    const tb = areaPre.topBottomPerYear[year];
    const showSet = new Set([...(tb.top || []), ...(tb.bottom || [])]);

    for (const row of app.data.processed) {
        if (showSet.has(row.fromid)) row._show_arrow = true;
    }
}



/* ==========================================================================
   Klassifikation
   ========================================================================== */

   function build_classification_values_all_years() {
    if (!app.selection.area_id) return { all: [], pos: [], neg: [] };
    const area = app.selection.area_id;
    const cacheKey = area + '|' + app.selection.area_inside + '|' + app.selection.data_interpretation;

    /* Cache-Hit: sofort zurück */
    if (app.cache && app.cache.classification_by_area.has(cacheKey)) {
        return app.cache.classification_by_area.get(cacheKey);
    }

    console.time('build_classification_values [' + area + ']');
    const all = [], pos = [], neg = [];

    const condsVon = ["fromid = ?"];
    const condsNach = ["toid = ?"];
    if (!app.selection.area_inside) {
        condsVon.push("fromid <> toid");
        condsNach.push("fromid <> toid");
    }
    const whereVon = " WHERE " + condsVon.join(" AND ");
    const whereNach = " WHERE " + condsNach.join(" AND ");

    /* Saldi: alle Jahre über alle anderen Kreise */
    const inflowSql = "SELECT fromid AS other, year, " + get_migration_select('to') +
                      " FROM migrations" + whereNach + " GROUP BY fromid, year";
    const inflows = alasql(inflowSql, [area]);
    const outflowSql = "SELECT toid AS other, year, " + get_migration_select('from') +
                       " FROM migrations" + whereVon + " GROUP BY toid, year";
    const outflows = alasql(outflowSql, [area]);

    const inMap = new Map(), outMap = new Map();
    for (const r of inflows)  inMap.set(r.other + "|" + r.year, r.migrations == null ? null : Number(r.migrations));
    for (const r of outflows) outMap.set(r.other + "|" + r.year, r.migrations == null ? null : Number(r.migrations));

    const keys = new Set([...inMap.keys(), ...outMap.keys()]);
    for (const k of keys) {
        const iv = inMap.has(k) ? inMap.get(k) : null;
        const ov = outMap.has(k) ? outMap.get(k) : null;
        if (iv == null && ov == null) continue;
        const diff = (iv ?? 0) - (ov ?? 0);
        if (diff !== 0) {
            all.push(diff);
            if (diff > 0) pos.push(diff);
            else neg.push(diff);
        }
    }

    console.timeEnd('build_classification_values [' + area + ']');

    const result = { all, pos, neg };
    if (app.cache) app.cache.classification_by_area.set(cacheKey, result);
    return result;
}
function recalculate_classification() {
    app.data.geostats = null;
    app.data.geostats_positive = null;
    app.data.geostats_negative = null;
    if (!app.data.processed) return;

    const area = app.selection.area_id;
    const areaPre = area && app.data.precomputed ? app.data.precomputed[area] : null;
    if (!areaPre) return;

    const cls = areaPre.classification;

    /* Farben aus den Skalen: pro Klasse eine Farbe */
    const positiveColors = chroma.scale(select_color(app.selection.colors))
        .colors(Math.max(1, cls.positiveBounds.length - 1));
    const negativeColors = chroma.scale(select_color(app.selection.colors_negative))
        .colors(Math.max(1, cls.negativeBounds.length - 1));

    app.data.geostats_positive = makeLightGeostats(cls.positiveBounds, positiveColors);
    app.data.geostats_negative = makeLightGeostats(cls.negativeBounds, negativeColors);

    /* Globale Statistik (für Min/Max-Anzeigen, Filter etc.) */
    app.data.geostats = {
        bounds: [cls.minNeg, 0, cls.maxPos],
        colors: [],
        min: () => cls.minNeg,
        max: () => cls.maxPos,
        getRanges: () => [],
    };

    /* Farben pro Zeile zuweisen */
    for (const row of app.data.processed) {
        row.color = get_color_for_value(row.migrations);
    }
}

/* Light-Geostats-Wrapper, der wie ein echtes geostats-Objekt aussieht,
   aber direkt mit vorberechneten Bounds arbeitet. */
function makeLightGeostats(bounds, colors) {
    return {
        bounds: bounds.slice(),
        colors: colors.slice(),
        min: function () { return this.bounds[0]; },
        max: function () { return this.bounds[this.bounds.length - 1]; },
        /* getClass: liefert den Index der Klasse für einen Wert.
           Bounds [0, 20, 40, 60, 80, 100] für 5 Klassen:
           Wert 25 → Index 1 (Klasse 20–40) */
        getClass: function (value) {
            if (value === null || value === undefined) return 0;
            if (value <= this.bounds[0]) return 0;
            if (value >= this.bounds[this.bounds.length - 1]) return this.colors.length - 1;
            for (let i = 1; i < this.bounds.length; i++) {
                if (value <= this.bounds[i]) return Math.max(0, Math.min(this.colors.length - 1, i - 1));
            }
            return this.colors.length - 1;
        },
        getRanges: function () {
            const r = [];
            for (let i = 0; i < this.bounds.length - 1; i++) {
                r.push(this.bounds[i] + ' - ' + this.bounds[i + 1]);
            }
            return r;
        },
    };
}


/* Leichtgewichtige Update-Pipeline für Live-Slider.
   Springt: refresh_legend (kein DOM-Rebuild nötig, Klassen sind stabil),
            refresh_classification_message,
            refresh_settings_dialog (entfällt im Kiosk eh) */
			function process_selections_fast() {
				if (typeof invalidate_color_cache === 'function') invalidate_color_cache();
				recalculate_data(false);
				refresh_datalayer();
				refresh_title_years();
				refresh_swoopy_arrows();
			}

function separate_processed() {
    const positive = [], negative = [];
    for (const row of app.data.processed) {
        if (row.migrations === null || row.migrations === undefined) continue;
        if (row.migrations < 0) negative.push(row);
        else positive.push(row);
    }
    return [positive, negative];
}

/* BUG-FIX 6: korrekter Vergleich (Objekt-Eigenschaft, nicht Objekt selbst) */
function recalculate_classification_saldi() {
    if (!app.data.processed) return false;
    if (app.selection.theme !== 'saldi') return false;
    const [positive, negative] = separate_processed();
    if (negative.length === 0) return false;
    if (negative.length === 1 && negative[0].migrations === 0) return false;
    app.data.geostats_positive = recalculate_saldi_geostats(positive, false);
    app.data.geostats_negative = recalculate_saldi_geostats(negative, true);
    for (const row of app.data.processed) row.color = get_color_for_value(row.migrations);
    return true;
}

function recalculate_saldi_geostats(processed, negative) {
    const filtered = processed.filter(row => Math.abs(row.migrations) > 0);
    const cnt = calculate_classcount(filtered.length, !negative);
    const data = [0];
    for (const row of filtered) data.push(row.migrations);
    while (data.length < 2) data.push(0);
    const gs = new geostats(data);
    gs.setColors(chroma.scale(select_color(negative ? app.selection.colors_negative : app.selection.colors)).colors(cnt));
    set_classification_algorithm(gs, cnt, negative);
    return gs;
}

function set_classification_algorithm(gs, classcount, negative) {
    try {
        if (app.selection.classification === "equidistant") gs.getClassEqInterval(classcount);
        else if (app.selection.classification === "stddeviation") gs.getClassStdDeviation(classcount);
        else if (app.selection.classification === "arithmetic_progression") gs.getClassArithmeticProgression(classcount);
        else if (app.selection.classification === "geometric_progression") gs.getClassGeometricProgression(classcount);
        else if (app.selection.classification === "quantile") gs.getClassQuantile(classcount);
        else if (app.selection.classification === "jenks") gs.getClassJenks(classcount);
        else if (app.selection.classification === "own") gs.setClassManually(generate_classification_array(gs, classcount, negative));
        else gs.getClassQuantile(classcount);
    } catch (e) {
        console.error("Classification error:", e);
        app.selection.classification = "jenks";
        gs.getClassEqInterval(classcount);
    }
}

function generate_classification_array(gs, classcount, negative) {
    const classification = [];
    classification.push(gs.min());
    if (negative) for (let i = (10 - classcount); i < 9; i++) classification.push(app.selection.classborders_negative[i]);
    else for (let i = 0; i < (classcount - 1); i++) classification.push(app.selection.classborders[i]);
    classification.push(gs.max());
    return classification;
}


/* ==========================================================================
   Title / year badge
   ========================================================================== */

function refresh_title_years() {
    const text = (app.selection.years && app.selection.years.length > 0)
        ? String(app.selection.years[0]) : "";
    const badge = document.getElementById("current_year_badge");
    if (badge) badge.textContent = text;

    if (typeof window.position_header_zoom_year === 'function') {
        window.position_header_zoom_year();
    }

    /* Header-Untertitel: aktueller Landkreis */
    const titleEl = document.getElementById("dataset_title");
    if (titleEl && app.selection.area_id && app.data.featurename_mapping[app.selection.area_id]) {
        titleEl.textContent = "Wanderungssaldi: " + app.data.featurename_mapping[app.selection.area_id];
    }
}


/* ==========================================================================
   Legend
   ========================================================================== */

function refresh_legend() {
    const legend = document.getElementById("legend_view");
    if (!legend) return;
    legend.style.display = "none";
    const inner = document.getElementById("legend_content_inner");
    if (inner) inner.innerHTML = '';
    if (!app.data.geostats) return;

    const rows = app.data.unfiltered || [];
    const hasZero = rows.some(r => r && r.migrations === 0);
    const hasNA = rows.some(r => r && (r.migrations === null || r.migrations === undefined));

    const fmt = (n) => app.selection.data_interpretation === 'migration_rate'
        ? format_number_max2(n) : format_value(n, 0);

    function buildFromGeostats(gs) {
        if (!gs || !Array.isArray(gs.colors)) return '';
        let bounds = Array.isArray(gs.bounds) ? gs.bounds : null;
        if (!bounds || bounds.length < 2) {
            const ranges = (typeof gs.getRanges === 'function') ? gs.getRanges() : [];
            bounds = [];
            for (const r of ranges) {
                const parts = String(r).split(/\s*-\s*/);
                if (parts.length === 2) {
                    const lo = Number(parts[0].replace(',', '.'));
                    const hi = Number(parts[1].replace(',', '.'));
                    if (!Number.isNaN(lo)) bounds.push(lo);
                    if (!Number.isNaN(hi)) bounds.push(hi);
                }
            }
            bounds = [...new Set(bounds)].sort((a, b) => a - b);
        }
        let html = '';
        for (let i = 0; i < gs.colors.length; i++) {
            const clr = gs.colors[i];
            const lo = bounds[i], hi = bounds[i + 1];
            if (lo === undefined || hi === undefined) continue;
            html += '<div class="geostats-legend-block" style="background-color:' + clr + ';"></div>'
                  + '<span class="legend-lo">' + fmt(lo) + '</span>'
                  + '<span class="legend-dash">–</span>'
                  + '<span class="legend-hi">' + fmt(hi) + '</span>';
        }
        return html;
    }

    function buildZeroRow() {
        return '<div class="geostats-legend-block" style="background-color:white;border:1px solid var(--hw-purple-dark);"></div>'
             + '<span class="legend-lo">0</span>'
             + '<span class="legend-dash"></span>'
             + '<span class="legend-hi"></span>';
    }

    function buildLabelRow(color, label) {
        return '<div class="geostats-legend-block" style="background-color:' + color + ';"></div>'
             + '<span class="legend-label">' + label + '</span>';
    }

    let html = '<div class="geostats-legend">';

    /* Saldi: negative oben, dann 0, dann positive */
    if (app.data.geostats_negative) html += buildFromGeostats(app.data.geostats_negative);
    if (hasZero) html += buildZeroRow();
    if (app.data.geostats_positive) html += buildFromGeostats(app.data.geostats_positive);

    /* Fallback */
    if (!app.data.geostats_negative && !app.data.geostats_positive && app.data.geostats) {
        html += buildFromGeostats(app.data.geostats);
    }

    if (hasNA) html += buildLabelRow('#777777', 'Keine Daten');
    html += '</div>';

    if (inner) inner.innerHTML = html;
    legend.style.display = 'block';

    /* Collapsed-State synchronisieren */
    if (app.view.legend_collapsed) legend.classList.add('collapsed');
    else legend.classList.remove('collapsed');
    const toggle = document.getElementById('legend_toggle');
    if (toggle) toggle.setAttribute('aria-expanded', (!app.view.legend_collapsed).toString());
}


/* ==========================================================================
   Legend toggle (akkordeon)
   ========================================================================== */

function toggle_legend(event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const legend = document.getElementById('legend_view');
    if (!legend) return;
    const collapsed = legend.classList.toggle('collapsed');
    const toggle = document.getElementById('legend_toggle');
    if (toggle) toggle.setAttribute('aria-expanded', (!collapsed).toString());
    app.view.legend_collapsed = collapsed;
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}


/* ==========================================================================
   Year Playback
   ========================================================================== */

function toggle_year_playback() {
    if (app.view.year_player.isPlaying) stop_year_playback(true);
    else start_year_playback();
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}

function start_year_playback() {
    const btn = document.getElementById("year_play_toggle");
    const years = (app.view.year_player.order || []).slice().sort((a, b) => a - b);
    if (years.length === 0) return;

    const current = Number(app.selection.years?.[0] || years[years.length - 1]);
    const idx = years.indexOf(current);
    app.view.year_player.index = (idx >= 0 ? idx : 0);

    if (app.view.year_player.timer) clearInterval(app.view.year_player.timer);

    app.view.year_player.isPlaying = true;
    if (btn) {
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Wiedergabe pausieren');
        const icon = document.getElementById('year_play_icon');
        if (icon) icon.src = 'img/pause.svg';
    }

    set_current_year(years[app.view.year_player.index]);
    app.view.year_player.timer = setInterval(year_play_step, app.view.year_player.delay);
}

function stop_year_playback(updateButtonUI) {
    if (updateButtonUI === undefined) updateButtonUI = true;
    if (app.view.year_player.timer) {
        clearInterval(app.view.year_player.timer);
        app.view.year_player.timer = null;
    }
    app.view.year_player.isPlaying = false;
    if (updateButtonUI) {
        const btn = document.getElementById("year_play_toggle");
        if (btn) {
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-label', 'Jahre abspielen');
            const icon = document.getElementById('year_play_icon');
            if (icon) icon.src = 'img/play.svg';
        }
    }
}

function year_play_step() {
    const years = (app.view.year_player.order || []).slice().sort((a, b) => a - b);
    if (years.length === 0) { stop_year_playback(true); return; }
    app.view.year_player.index = (app.view.year_player.index + 1) % years.length;
    set_current_year(years[app.view.year_player.index]);
}

function set_current_year(yearNumber, fast) {
    app.selection.years = [String(yearNumber)];
    if (typeof sync_slider_to_year === 'function') sync_slider_to_year(yearNumber);
    if (fast) {
        process_selections_fast();
    } else {
        process_selections(false);
    }
}


/* ==========================================================================
   Load indicator (vereinfacht)
   ========================================================================== */

function show_load_indicator(message) {
    const ind = document.getElementById("load_indicator");
    const msg = document.getElementById("load_indicator_message");
    if (msg) msg.textContent = message || '';
    if (ind) ind.style.display = "block";
    app.status.loading = true;
    app.view.load_indicator_state = -1;
    setTimeout(keep_load_indicator, 200);
}

function hide_load_indicator() {
    const ind = document.getElementById("load_indicator");
    if (ind) ind.style.display = "none";
    app.status.loading = false;
}

function keep_load_indicator() {
    const ind = document.getElementById("load_indicator");
    if (!ind) return;
    if (!app.status.loading) { ind.style.display = "none"; return; }
    ind.style.display = "block";
    const blocks = document.getElementsByClassName("load_inidicator_block");
    for (let i = 0; i < blocks.length; i++) highlight_load_indicator(i, blocks[i]);
    app.view.load_indicator_state++;
    if (app.view.load_indicator_state > 15) app.view.load_indicator_state = 0;
    setTimeout(keep_load_indicator, 150);
}

function highlight_load_indicator(index, indicator) {
    const palette = ['#5D3EE1', '#8B72EA', '#B5A4F0', '#D8CEF7'];
        if (index === app.view.load_indicator_state) indicator.style.backgroundColor = palette[0];
    else if ((index + 1) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[1];
    else if ((index + 2) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[2];
    else if ((index + 3) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[3];
    else indicator.style.backgroundColor = '#ffffff';
}


/* ==========================================================================
   Defensive No-Op Stubs für entferntes Legacy-UI
   (verhindern Fehler, falls noch irgendwo aufgerufen)
   ========================================================================== */

function dataset_load() { /* no-op in kiosk */ }
function show_viewcomponent() { /* no-op */ }
function refresh_view() { /* no-op */ }
function refresh_table_view() { /* no-op */ }
function refresh_statistics_view() { /* no-op */ }
function refresh_barchart_view() { /* no-op */ }
function theme_selected() { /* theme is locked to 'saldi' */ }
function update_filter_visibility() { /* no-op */ }
function labels_selected() { /* no-op */ }
function swoopy_arrows_changed() { /* replaced by toggle_arrows() */ }
function data_interpretation_changed() { /* no-op */ }
function area_inside_changed() { /* no-op */ }
function year_selected() { /* replaced by year_slider_changed() */ }
function filter_changed() { /* no-op */ }
function classification_selected() { /* no-op */ }
function classification_overall_changed() { /* no-op */ }
function class_number_selected() { /* no-op */ }
function classborder_changed() { /* no-op */ }
function colors_changed() { /* no-op */ }
function map_transparency_changed() { /* no-op */ }
function toggle_mobile_menu() { /* no-op */ }
function toggle_settings_panel() { /* no-op */ }
function refresh_classification_message() { /* no-op */ }
function refresh_settings_dialog() { /* no-op */ }
function close_view() { /* no-op */ }
function move_start() { /* no-op */ }
function move_stop() { /* no-op */ }
function move_start_legend() { /* no-op (legende fix in CSS) */ }
function move_stop_legend() { /* no-op */ }
function area_selected(event) {
    /* Kept for compatibility — area selection happens via map click */
    if (event && event.target && event.target.value) {
        app.selection.area_id = event.target.value;
        process_selections(true);
    }
}

/* dataset-loader-Funktionen (no-ops, da Preload genutzt wird) */
function update_element_visibility() { /* no-op */ }
function dataset_selected() { /* no-op */ }
function category_selected() { /* no-op */ }
function load_dataset() { /* no-op */ }
function create_dataset_mapping() { return {}; }
function create_category_mapping() { return {}; }
function select_category(id, categories) {
    if (!categories) return null;
    for (const c of categories) if (c.id === id) return c;
    return null;
}
