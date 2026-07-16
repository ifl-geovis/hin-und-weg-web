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
            /* Positive Saldi (Zuwanderung) — CD-Lila, hell → dunkel */
            "purple_scale": {
                title: "Zuwanderungs-Skala (CD-Lila)",
                scale: ['#ece6f5', '#7a5aaf', '#4b2c7a'],
            },
            /* Negative Saldi (Abwanderung) — CD-Gelb, dunkel → hell
               (Reihenfolge so, dass große Abwanderung = kräftiges Gelb) */
            "yellow_scale": {
                title: "Abwanderungs-Skala (CD-Gelb)",
                scale: ['#f2b800', '#ffd86e', '#fff4d1'],
            },
            /* Legacy-Aliase — für Rückwärtskompatibilität */
            "Greys": { title: "Graustufen", scale: "Greys" },
            "RdYlBu": {
                title: "Lila–Weiß–Gelb",
                scale: ['#4b2c7a', '#ffffff', '#f2b800'],
            },
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
    refresh_detail_panel();                          /* NEU */
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
                refresh_detail_panel();                          /* NEU */
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
    /* Farbverlauf im CD-Lila */
    const palette = ['#4b2c7a', '#7a5aaf', '#b6a6d1', '#ece6f5'];
    if (index === app.view.load_indicator_state)         indicator.style.backgroundColor = palette[0];
    else if ((index + 1) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[1];
    else if ((index + 2) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[2];
    else if ((index + 3) === app.view.load_indicator_state) indicator.style.backgroundColor = palette[3];
    else                                                    indicator.style.backgroundColor = '#ffffff';
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
/* ==========================================================================
   Touch-Detail-Panel — Anzeige & Text-Erzeugung
   ========================================================================== */
/**
 * Berechnet den benötigten Abstand vom unteren Bildschirmrand, damit das
 * Detail-Panel nicht vom Jahres-Slider überdeckt wird. Wird als CSS-Variable
 * --hw-panel-bottom auf :root gesetzt und dort von main.css konsumiert.
 *
 * Rechenweg: Slider-Oberkante + Sicherheitsabstand.
 */
function update_panel_position() {
    const slider = document.getElementById('year_slider_container');
    let bottom = 160;                        /* konservativer Default */

    if (slider && getComputedStyle(slider).display !== 'none') {
        const rect = slider.getBoundingClientRect();
        const gapAboveSlider = 16;           /* Sicherheitsabstand über dem Slider */
        /* Abstand vom unteren Fensterrand bis zur Slider-Oberkante,
           plus Sicherheitsabstand. */
        bottom = (window.innerHeight - rect.top) + gapAboveSlider;
    }
    document.documentElement.style.setProperty('--hw-panel-bottom', bottom + 'px');
}
function show_detail_panel(feature_id, isSelf) {
    const panel   = document.getElementById('feature_detail_panel');
    const title   = document.getElementById('feature_detail_title');
    const summary = document.getElementById('feature_detail_summary');
    const hint    = document.getElementById('feature_detail_hint');
    if (!panel || !title || !summary) return;

    const fnm = app.data.featurename_mapping || {};
    const name = fnm[feature_id] || feature_id;
    const bezugsId = app.selection.area_id;
    const bezugsName = fnm[bezugsId] || bezugsId || '';
    const year = (app.selection.years && app.selection.years[0]) || '';

    title.textContent = name;

    if (isSelf) {
        summary.innerHTML =
            '<p><strong>' + name + '</strong> ist gerade der <strong>ausgewählte Kreis</strong>. '
          + 'Die eingefärbte Karte und die Pfeile zeigen die Wanderungen von und nach hier im Jahr <strong>'
          + year + '</strong>.</p>';
        if (hint) hint.style.display = 'none';
    } else {
        const row = get_feature_by_id(feature_id, false);
        summary.innerHTML = format_saldo_sentence(row, name, bezugsName, year);
        if (hint) hint.style.display = '';
    }

    /* Position berechnen, BEVOR das Panel sichtbar wird — sonst
       flackert es beim Öffnen kurz an der Fallback-Position. */
    update_panel_position();
    panel.setAttribute('aria-hidden', 'false');
}


function hide_detail_panel() {
    const panel = document.getElementById('feature_detail_panel');
    if (panel) panel.setAttribute('aria-hidden', 'true');
}
/**
 * Aktualisiert den Inhalt des offenen Detail-Panels, wenn sich Daten geändert
 * haben (Jahr per Slider/Playback gewechselt oder Bezugskreis geändert).
 * Wird von process_selections() und process_selections_fast() aufgerufen.
 * No-op, wenn kein Panel geöffnet ist.
 */
function refresh_detail_panel() {
    const panel = document.getElementById('feature_detail_panel');
    if (!panel) return;
    if (panel.getAttribute('aria-hidden') !== 'false') return;   /* geschlossen → nichts tun */

    /* _tapPreviewId lebt in map.js — auf window zugreifen, damit main.js
       nicht direkt an eine map.js-Variable koppelt. Falls nicht gesetzt: schließen. */
    const previewId = (typeof _tapPreviewId !== 'undefined') ? _tapPreviewId : null;
    if (!previewId) {
        hide_detail_panel();
        return;
    }

    /* Sonderfall: der zuletzt angetippte Kreis IST inzwischen der Bezugskreis
       (der Besucher hat mit dem zweiten Tap den Bezugskreis gewechselt).
       Dann Panel schließen — die Vorschau-Logik ist abgeschlossen. */
    if (previewId === app.selection.area_id) {
        hide_detail_panel();
        if (typeof clear_preview_highlight === 'function') clear_preview_highlight();
        return;
    }

    /* Existiert der Kreis in den Daten noch (z. B. nach Idle-Reset)? */
    const fnm = app.data.featurename_mapping || {};
    if (!fnm[previewId]) {
        hide_detail_panel();
        return;
    }

    /* Inhalt neu aufbauen — identische Logik wie show_detail_panel() im Nicht-Self-Fall */
    show_detail_panel(previewId, /*isSelf=*/false);
}

/**
 * Erzeugt einen zielgruppengerechten Satz zur Wanderungs-Bilanz.
 * Ersetzt das kryptische "Zuzugssaldo: 10" durch einen vollständigen Satz.
 */
function format_saldo_sentence(row, otherName, bezugsName, year) {
    if (!row || row.migrations === null || row.migrations === undefined) {
        return '<p><em>Für ' + year + ' liegen zwischen <strong>' + otherName
             + '</strong> und <strong>' + bezugsName
             + '</strong> keine Wanderungszahlen vor.</em></p>';
    }
    const saldo = row.migrations;
    const abs = Math.abs(saldo);
    const personen = (abs === 1) ? 'Person' : 'Personen';
    const zahlText = format_value(abs, 0);

    if (saldo === 0) {
        return '<p>Im Jahr <strong>' + year + '</strong> zogen zwischen <strong>'
             + otherName + '</strong> und <strong>' + bezugsName
             + '</strong> <span class="saldo-zero">gleich viele Menschen</span> in beide Richtungen.</p>';
    }
    if (saldo > 0) {
        /* Positiv = Zuwanderung in den Bezugskreis */
        return '<p>Im Jahr <strong>' + year + '</strong> zogen '
             + '<span class="saldo-positive">' + zahlText + ' ' + personen + ' mehr</span> '
             + 'aus <strong>' + otherName + '</strong> nach <strong>' + bezugsName
             + '</strong>, als umgekehrt zurückgingen.</p>';
    }
    /* Negativ = Abwanderung aus dem Bezugskreis */
    return '<p>Im Jahr <strong>' + year + '</strong> verließen '
         + '<span class="saldo-negative">' + zahlText + ' ' + personen + ' mehr</span> '
         +  bezugsName + '</strong> in Richtung <strong>' + otherName
         + '</strong>, als von dort zuzogen.</p>';
}
/* ==========================================================================
   Landkreis-Suche
   ========================================================================== */

   const SEARCH_MAX_RESULTS = 40;

   let _searchState = {
       normalizedIndex: [],     /* [{ id, name, normalized }] */
       activeIndex: -1,         /* Tastatur-Highlight in der Ergebnisliste */
       isOpen: false,
   };
   
   /**
    * Normalisiert einen Namen für tolerante Suche:
    * - Kleinbuchstaben
    * - Akzente/Umlaute (ä→ae, ö→oe, ü→ue, ß→ss) auflösen
    * - Zusatz-Diakritika via NFD entfernen
    * - Klammer-Suffixe wie „Frankfurt (Oder)" bleiben durchsuchbar,
    *   weil wir sowohl den vollen Namen als auch den Klammer-Inhalt normalisieren.
    */
   function _normalize_search(str) {
       if (str === null || str === undefined) return '';
       return String(str)
           .toLowerCase()
           .replace(/ä/g, 'ae')
           .replace(/ö/g, 'oe')
           .replace(/ü/g, 'ue')
           .replace(/ß/g, 'ss')
           .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
           .replace(/[.,;()\-–—/]/g, ' ')       /* Trennzeichen zu Leerzeichen */
           .replace(/\s+/g, ' ')
           .trim();
   }
   
   /**
    * Baut den Index aus app.data.featurename_mapping.
    * Wird einmal nach Datenladen aufgerufen, bei Datenwechsel neu.
    */
   function build_search_index() {
       _searchState.normalizedIndex = [];
       const fnm = app.data.featurename_mapping || {};
       for (const id in fnm) {
           const name = fnm[id];
           _searchState.normalizedIndex.push({
               id: id,
               name: name,
               normalized: _normalize_search(name),
           });
       }
       /* Alphabetisch sortiert — schöner für den ersten Blick, wenn nur ein
          Buchstabe getippt wurde */
       _searchState.normalizedIndex.sort((a, b) => a.name.localeCompare(b.name, 'de'));
   }
   
   /**
    * Filtert den Index anhand des Suchbegriffs.
    * Bewertung: Treffer am Wortanfang > Treffer irgendwo > gar kein Treffer.
    */
   function _search_filter(queryRaw) {
       const q = _normalize_search(queryRaw);
       if (!q) return [];
   
       /* Mehrere Wörter alle-müssen-matchen */
       const terms = q.split(' ').filter(Boolean);
   
       const results = [];
       for (const entry of _searchState.normalizedIndex) {
           let allMatch = true;
           let bestPos = Infinity;
           for (const t of terms) {
               const pos = entry.normalized.indexOf(t);
               if (pos === -1) { allMatch = false; break; }
               if (pos < bestPos) bestPos = pos;
           }
           if (!allMatch) continue;
   
           /* Rang: 0 = Wortanfang (Position 0 oder nach Leerzeichen), 1 = sonst */
           const rank = (bestPos === 0 || entry.normalized.charAt(bestPos - 1) === ' ') ? 0 : 1;
           results.push({ ...entry, _rank: rank, _pos: bestPos });
       }
       results.sort((a, b) => {
           if (a._rank !== b._rank) return a._rank - b._rank;
           if (a._pos  !== b._pos)  return a._pos  - b._pos;
           return a.name.localeCompare(b.name, 'de');
       });
       return results.slice(0, SEARCH_MAX_RESULTS);
   }
   
   /**
    * Hebt die matchende Teilzeichenkette im Anzeigenamen hervor (case-insensitiv,
    * aber unter Berücksichtigung normalisierter Eingabe).
    */
   function _search_highlight(name, queryRaw) {
       const q = String(queryRaw || '').trim();
       if (!q) return _escapeHtml(name);
   
       /* Alle einzelnen Terme separat highlighten */
       const terms = q.split(/\s+/).filter(Boolean).map(_escapeRegex);
       if (terms.length === 0) return _escapeHtml(name);
   
       const rx = new RegExp('(' + terms.join('|') + ')', 'gi');
       return _escapeHtml(name).replace(rx, '<mark>$1</mark>');
   }
   
   function _escapeHtml(s) {
       return String(s)
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&#39;');
   }
   function _escapeRegex(s) {
       return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   
   /**
    * Rendert das Ergebnisdropdown.
    */
   function _search_render(query) {
       const listEl = document.getElementById('search_results');
       if (!listEl) return;
       listEl.innerHTML = '';
       _searchState.activeIndex = -1;
   
       const q = String(query || '').trim();
       if (!q) {
           listEl.hidden = true;
           _searchState.isOpen = false;
           document.getElementById('search_container').classList.remove('is-open');
           return;
       }
   
       const results = _search_filter(q);
   
       if (results.length === 0) {
           const li = document.createElement('li');
           li.className = 'search_result_empty';
           li.textContent = 'Keine Landkreise gefunden.';
           listEl.appendChild(li);
       } else {
           for (let i = 0; i < results.length; i++) {
               const r = results[i];
               const li = document.createElement('li');
               li.className = 'search_result_item';
               li.setAttribute('role', 'option');
               li.setAttribute('data-area-id', r.id);
               li.setAttribute('data-index', String(i));
               li.innerHTML = _search_highlight(r.name, q);
               /* pointerdown statt click — feuert vor blur des Inputs, damit die
                  Auswahl auch dann greift, wenn iOS/Android die Tastatur schließt */
               li.addEventListener('pointerdown', _search_result_pointerdown);
               listEl.appendChild(li);
           }
       }
       listEl.hidden = false;
       _searchState.isOpen = true;
       document.getElementById('search_container').classList.add('is-open');
   }
   
   function _search_result_pointerdown(ev) {
       ev.preventDefault();                     /* verhindert Fokusverlust vor click */
       const areaId = ev.currentTarget.getAttribute('data-area-id');
       if (areaId) _search_select_area(areaId);
   }
   
   /**
    * Wählt einen Landkreis aus: setzt als Bezugskreis, zoomt hin, schließt Suche.
    */
   function _search_select_area(areaId) {
       if (!areaId) return;
       if (!app.data.featurename_mapping || !app.data.featurename_mapping[areaId]) return;
   
       /* Detail-Panel (falls offen) schließen — sonst irritierend */
       if (typeof hide_detail_panel === 'function') hide_detail_panel();
       if (typeof clear_preview_highlight === 'function') clear_preview_highlight();
   
       app.selection.area_id = areaId;
       process_selections(true);
   
       /* Zum Kreis hinzoomen, damit der Nutzer visuell die Auswahl bestätigt bekommt */
       _search_zoom_to_area(areaId);
   
       /* Eingabe leeren und Suche schließen */
       close_search(/*clearInput=*/true);
   
       if (typeof reset_idle_timer === 'function') reset_idle_timer();
   }
   
   /**
    * Zoomt auf die Geometrie des gewählten Kreises.
    */
   function _search_zoom_to_area(areaId) {
       if (!app.map || !app.map.map || !app.map.selectionlayer) return;
       let targetLayer = null;
       app.map.selectionlayer.eachLayer((layer) => {
           if (layer && layer.feature && get_feature_id(layer.feature) === areaId) {
               targetLayer = layer;
           }
       });
       if (targetLayer && targetLayer.getBounds) {
           try {
               const bounds = targetLayer.getBounds();
               const opts = (typeof get_map_fit_padding_options === 'function')
                   ? get_map_fit_padding_options() : {};
               /* Nicht zu tief zoomen, damit Nachbarkreise sichtbar bleiben */
               app.map.map.fitBounds(bounds, Object.assign({ maxZoom: 9 }, opts));
           } catch (e) { /* still */ }
       }
   }
   
   /**
    * Schließt das Dropdown; optional wird die Eingabe zurückgesetzt.
    */
   function close_search(clearInput) {
       const input = document.getElementById('search_input');
       const listEl = document.getElementById('search_results');
       const clearBtn = document.getElementById('search_clear');
       const container = document.getElementById('search_container');
       if (listEl) { listEl.hidden = true; listEl.innerHTML = ''; }
       if (container) container.classList.remove('is-open');
       _searchState.isOpen = false;
       _searchState.activeIndex = -1;
       if (clearInput && input) {
           input.value = '';
           if (clearBtn) clearBtn.classList.remove('is-visible');
           /* Bildschirmtastatur ausblenden */
           input.blur();
       }
   }
   
   /**
    * Tastatur-Navigation in der Ergebnisliste (nützlich mit angeschlossener
    * Tastatur; auf reinem Touch unbenutzt, aber robust).
    */
   function _search_key_handler(ev) {
       const listEl = document.getElementById('search_results');
       if (ev.key === 'Escape') {
           close_search(false);
           return;
       }
       if (!listEl || listEl.hidden) return;
       const items = listEl.querySelectorAll('.search_result_item');
       if (items.length === 0) return;
   
       if (ev.key === 'ArrowDown') {
           ev.preventDefault();
           _searchState.activeIndex = Math.min(items.length - 1, _searchState.activeIndex + 1);
           _search_update_active_highlight(items);
       } else if (ev.key === 'ArrowUp') {
           ev.preventDefault();
           _searchState.activeIndex = Math.max(0, _searchState.activeIndex - 1);
           _search_update_active_highlight(items);
       } else if (ev.key === 'Enter') {
           ev.preventDefault();
           const idx = _searchState.activeIndex >= 0 ? _searchState.activeIndex : 0;
           const areaId = items[idx].getAttribute('data-area-id');
           if (areaId) _search_select_area(areaId);
       }
   }
   
   function _search_update_active_highlight(items) {
       items.forEach((el, i) => {
           el.classList.toggle('is-active', i === _searchState.activeIndex);
           if (i === _searchState.activeIndex) el.scrollIntoView({ block: 'nearest' });
       });
   }
   
   /**
    * Bindet alle Handler des Suchfelds. Wird von install_search() aufgerufen.
    */
   function install_search() {
       const input = document.getElementById('search_input');
       const clearBtn = document.getElementById('search_clear');
       const container = document.getElementById('search_container');
       if (!input || !container) return;
   
       /* Index initial bauen (Daten liegen zu diesem Zeitpunkt bereits vor) */
       build_search_index();
   
       /* Live-Filter beim Tippen */
       input.addEventListener('input', () => {
           const val = input.value;
           if (clearBtn) clearBtn.classList.toggle('is-visible', val.length > 0);
           _search_render(val);
           if (typeof reset_idle_timer === 'function') reset_idle_timer();
       });
   
       /* Öffnen bei Fokus, wenn schon Text drin ist */
       input.addEventListener('focus', () => {
           if (input.value.trim().length > 0) _search_render(input.value);
       });
   
       /* Tastatur-Navigation */
       input.addEventListener('keydown', _search_key_handler);
   
       /* Clear-Button */
       if (clearBtn) {
           clearBtn.addEventListener('click', (ev) => {
               ev.preventDefault();
               close_search(true);
               input.focus();
           });
       }
   
       /* Klick außerhalb → schließen (aber nicht bei Klick INS Dropdown) */
       document.addEventListener('pointerdown', (ev) => {
           if (!_searchState.isOpen) return;
           if (container.contains(ev.target)) return;
           close_search(false);
       }, { passive: true });
       /* Nach Aufbau: einmal die Position neu berechnen — sicher ist sicher,
       falls das Suchfeld vor dem ersten position_header_zoom_year() gerendert wurde. */
       if (typeof position_header_zoom_year === 'function') {
        position_header_zoom_year();
    }
}
   
/* ==========================================================================
   Info-Modal ("Weitere Informationen")
   ========================================================================== */

   function show_info_modal() {
    const modal = document.getElementById('info_modal');
    if (!modal) return;

    /* Während das Modal offen ist: laufende Wiedergabe pausieren,
       damit der Besucher in Ruhe lesen kann. */
    if (typeof stop_year_playback === 'function' &&
        app.view && app.view.year_player && app.view.year_player.isPlaying) {
        stop_year_playback(true);
    }

    modal.setAttribute('aria-hidden', 'false');
    app.status.modal_dialog = true;

    /* ESC-Taste schließt das Modal (für Wartungspersonal mit Tastatur) */
    document.addEventListener('keydown', _info_modal_key_handler);

    /* Klick auf den dunklen Hintergrund schließt ebenfalls */
    modal.addEventListener('pointerdown', _info_modal_backdrop_handler);

    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}

function hide_info_modal() {
    const modal = document.getElementById('info_modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    app.status.modal_dialog = false;

    document.removeEventListener('keydown', _info_modal_key_handler);
    modal.removeEventListener('pointerdown', _info_modal_backdrop_handler);

    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}

function _info_modal_key_handler(ev) {
    if (ev.key === 'Escape') hide_info_modal();
}

function _info_modal_backdrop_handler(ev) {
    /* Nur reagieren, wenn wirklich auf den Overlay-Hintergrund geklickt wurde,
       nicht auf den Inhalt. */
    if (ev.target && ev.target.id === 'info_modal') {
        hide_info_modal();
    }
}
