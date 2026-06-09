/* ==========================================================================
   init.js — Medienstation mit vorberechneten Saldi
   ========================================================================== */

   const KIOSK_CONFIG = {
    DEFAULT_AREA_ID: 'DE3',                /* Berlin oder Fallback */
    IDLE_TIMEOUT_MS: 90 * 1000,
    AUTO_REFRESH_MS: 5 * 60 * 1000,
    YEAR_PLAYBACK_DELAY_MS: 1200,
};

let _kioskIdleTimer = null;
let _kioskAutoRefreshTimer = null;


function init() {
    init_color_settings();
    init_values();
    init_selections();
    init_map();
    init_view();

    if (typeof window.__HUW_PRELOAD__ === 'undefined' || !window.__HUW_PRELOAD__) {
        const txt = document.getElementById('load_indicator_text');
        if (txt) txt.innerHTML = 'Fehler: data/landkreise/preload.js fehlt.<br/>Bitte Build-Skript ausführen.';
        const ind = document.getElementById('load_indicator');
        if (ind) ind.style.display = 'block';
        return;
    }

    show_load_indicator('Daten werden geladen.');
    setTimeout(bootstrap_from_preload, 30);
}


function bootstrap_from_preload() {
    const PRE = window.__HUW_PRELOAD__;

    app.datasets[PRE.dataset_id] = PRE.info;
    app.selection.dataset_id = PRE.dataset_id;
    app.selection.dataset = PRE.info;
    app.selection.category_id = PRE.category_id;
    app.selection.category = PRE.category;
    if (!Array.isArray(app.selection.category.years)) {
        app.selection.category.years = (PRE.years || []).map(String);
    } else {
        app.selection.category.years = app.selection.category.years.map(String);
    }

    app.data.geodata = PRE.geodata;
    app.data.featurename_mapping = PRE.featurename_mapping || {};
    app.data.centroid_mapping = PRE.centroid_mapping || {};

    /* Vorberechnete Saldi-Tabelle */
    app.data.precomputed = PRE.precomputed || {};
    app.data.top_bottom_n = PRE.top_bottom_n || 3;

    /* Karte aufbauen */
    show_geojson_layer();

    /* Default-Auswahl */
    set_default_selection();
    init_year_slider();

    /* Titel */
    const titleEl = document.getElementById('dataset_title');
    if (titleEl) titleEl.textContent = PRE.info.title || PRE.info.name || 'Wanderungen zwischen Landkreisen';
    document.title = 'hin&weg — ' + (PRE.info.title || PRE.info.name || 'Wanderungen');

    install_idle_handlers();
    install_auto_refresh();
    install_global_error_handler();

    app.status.loading = false;
    app.status.modal_dialog = false;

    process_selections(true);
    hide_load_indicator();
    reset_idle_timer();
}


function set_default_selection() {
    const fnm = app.data.featurename_mapping || {};
    let areaId = KIOSK_CONFIG.DEFAULT_AREA_ID;
    if (!fnm[areaId] || !app.data.precomputed[areaId]) {
        const keys = Object.keys(app.data.precomputed).sort();
        areaId = keys[0] || null;
    }
    app.selection.area_id = areaId;
    app.selection.theme = 'saldi';
    app.selection.classification_overall = true;
    app.selection.swoopy_arrows = true;
    app.selection.area_inside = false;
    app.selection.data_interpretation = 'absolute';
    app.selection.labels = 'none';

    const years = app.selection.category.years || [];
    if (years.length > 0) {
        const yearsAsc = years.map(Number).sort((a, b) => a - b);
        app.view.year_player.order = yearsAsc;
        const newest = yearsAsc[yearsAsc.length - 1];
        app.selection.years = [String(newest)];
        app.view.year_player.index = yearsAsc.length - 1;
    } else {
        app.selection.years = [];
        app.view.year_player.order = [];
    }
    app.view.year_player.delay = KIOSK_CONFIG.YEAR_PLAYBACK_DELAY_MS;
}


function init_year_slider() {
    const slider = document.getElementById('year_slider');
    const marks = document.getElementById('year_slider_marks');
    const playBtn = document.getElementById('year_play_toggle');
    if (!slider) return;

    const years = (app.view.year_player.order || []).slice().sort((a, b) => a - b);
    if (years.length === 0) {
        slider.disabled = true;
        if (playBtn) playBtn.disabled = true;
        return;
    }

    slider.min = '0';
    slider.max = String(years.length - 1);
    slider.step = '1';
    slider.value = String(years.length - 1);
    slider.disabled = false;

    if (marks) {
        marks.innerHTML = '<span>' + years[0] + '</span><span>' + years[years.length - 1] + '</span>';
    }

    if (playBtn) {
        playBtn.disabled = false;
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.setAttribute('aria-label', 'Jahre abspielen');
        const icon = document.getElementById('year_play_icon');
        if (icon) icon.src = 'img/play.svg';
    }

    slider.removeEventListener('input', _slider_input_handler);
    slider.removeEventListener('change', _slider_change_handler);
    slider.addEventListener('input', _slider_input_handler);
    slider.addEventListener('change', _slider_change_handler);
}

let _sliderRafId = null;
let _sliderPendingYear = null;

function _slider_input_handler(event) {
    if (app.view.year_player.isPlaying) stop_year_playback(true);
    const idx = parseInt(event.target.value, 10);
    const years = (app.view.year_player.order || []).slice().sort((a, b) => a - b);
    if (!years.length || isNaN(idx)) return;
    const year = years[Math.max(0, Math.min(years.length - 1, idx))];
    _sliderPendingYear = year;

    if (_sliderRafId === null) {
        _sliderRafId = requestAnimationFrame(() => {
            _sliderRafId = null;
            if (_sliderPendingYear !== null) {
                set_current_year(_sliderPendingYear);
                _sliderPendingYear = null;
            }
        });
    }
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}

function _slider_change_handler(event) {
    /* Im neuen Modell ist input und change gleich schnell — beide volle Pipeline */
    _slider_input_handler(event);
}

function year_slider_changed(event) {
    _slider_input_handler(event);
}

function sync_slider_to_year(yearNumber) {
    const slider = document.getElementById('year_slider');
    if (!slider) return;
    const years = (app.view.year_player.order || []).slice().sort((a, b) => a - b);
    const idx = years.indexOf(Number(yearNumber));
    if (idx >= 0) slider.value = String(idx);
}


function toggle_arrows() {
    app.selection.swoopy_arrows = !app.selection.swoopy_arrows;
    const fab = document.getElementById('arrows_toggle_fab');
    const btn = document.getElementById('arrows_toggle_button');
    if (fab) fab.setAttribute('data-active', app.selection.swoopy_arrows ? 'true' : 'false');
    if (btn) btn.setAttribute('aria-pressed', app.selection.swoopy_arrows ? 'true' : 'false');
    if (typeof refresh_swoopy_arrows === 'function') refresh_swoopy_arrows();
    if (typeof reset_idle_timer === 'function') reset_idle_timer();
}


/* --- Idle-Handling -------------------------------------------------------- */
function install_idle_handlers() {
    const reset = () => reset_idle_timer();
    window.addEventListener('pointerdown', reset, { passive: true });
    window.addEventListener('touchstart', reset, { passive: true });
    window.addEventListener('mousemove', _throttle(reset, 2000), { passive: true });
    window.addEventListener('keydown', reset);
}

function reset_idle_timer() {
    if (_kioskIdleTimer) clearTimeout(_kioskIdleTimer);
    _kioskIdleTimer = setTimeout(idle_reset_to_default, KIOSK_CONFIG.IDLE_TIMEOUT_MS);
}

function idle_reset_to_default() {
    stop_year_playback(true);

    /* Hintergrundkarte zurück auf Standard */
    if (app.map && app.map.map && !app.status.background_active) {
        const opt = app.map.background_options[0];
        try {
            app.map.backgroundlayer = L.tileLayer(opt.url, {
                attribution: opt.attribution,
                maxZoom: opt.maxZoom || 19,
            });
            app.map.backgroundlayer.addTo(app.map.map);
            app.map.background_index = 0;
            app.status.background_active = true;
        } catch (e) { console.warn(e); }
    }

    /* Pfeile an */
    app.selection.swoopy_arrows = true;
    const fab = document.getElementById('arrows_toggle_fab');
    const btn = document.getElementById('arrows_toggle_button');
    if (fab) fab.setAttribute('data-active', 'true');
    if (btn) btn.setAttribute('aria-pressed', 'true');

    set_default_selection();
    init_year_slider();

    if (typeof zoom_home === 'function') zoom_home();

    process_selections(true);
    show_idle_overlay();
    reset_idle_timer();
}

function show_idle_overlay() {
    const ov = document.getElementById('idle_overlay');
    if (!ov) return;
    ov.classList.add('visible');
    ov.setAttribute('aria-hidden', 'false');
    const dismiss = () => {
        ov.classList.remove('visible');
        ov.setAttribute('aria-hidden', 'true');
        ov.removeEventListener('pointerdown', dismiss);
        ov.removeEventListener('touchstart', dismiss);
    };
    ov.addEventListener('pointerdown', dismiss, { passive: true });
    ov.addEventListener('touchstart', dismiss, { passive: true });
}


/* --- Auto-Refresh --------------------------------------------------------- */
function install_auto_refresh() {
    if (_kioskAutoRefreshTimer) clearInterval(_kioskAutoRefreshTimer);
    _kioskAutoRefreshTimer = setInterval(() => {
        const ov = document.getElementById('idle_overlay');
        if (ov && ov.classList.contains('visible')) {
            try {
                set_default_selection();
                init_year_slider();
                process_selections(true);
            } catch (e) {
                console.error('Auto-Refresh fehlgeschlagen:', e);
            }
        }
    }, KIOSK_CONFIG.AUTO_REFRESH_MS);
}


/* --- Globaler Error-Handler ---------------------------------------------- */
function install_global_error_handler() {
    window.addEventListener('error', (ev) => {
        console.error('Globaler Fehler:', ev.error || ev.message);
        try {
            stop_year_playback(true);
            set_default_selection();
            init_year_slider();
            process_selections(true);
        } catch (e) { /* still */ }
    });
    window.addEventListener('unhandledrejection', (ev) => {
        console.error('Unhandled Promise:', ev.reason);
    });
    window.addEventListener('contextmenu', (ev) => ev.preventDefault());
}


/* --- Helpers ------------------------------------------------------------- */
function _throttle(fn, ms) {
    let last = 0;
    return function () {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            fn.apply(this, arguments);
        }
    };
}


/* --- Setup-Funktionen ---------------------------------------------------- */
function init_color_settings() {
    /* Keine Farben-UI mehr; Farben sind in app.configuration fix definiert */
}

function init_values() {
    app.selection.filter.min = 0;
    app.selection.filter.max = 0;
}

function init_selections() {
    app.selection.theme = 'saldi';
    app.selection.classification_overall = true;
    app.selection.classification = 'quantile';
    app.selection.area_inside = false;
    app.selection.data_interpretation = 'absolute';
    app.selection.swoopy_arrows = true;
    app.selection.labels = 'none';
    app.selection.colors =  'purple_scale';
    app.selection.colors_negative = 'yellow_scale';
    app.selection.tablesort = null;
    app.selection.tablesort_ascending = true;

    const fab = document.getElementById('arrows_toggle_fab');
    const btn = document.getElementById('arrows_toggle_button');
    if (fab) fab.setAttribute('data-active', 'true');
    if (btn) btn.setAttribute('aria-pressed', 'true');
}

function init_view() {
    app.view.positions = app.view.positions || {};
    app.view.positions.legend_view = { x: 88, y: 30 };
    app.view.legend_collapsed = false;
    app.view.year_player = {
        timer: null,
        isPlaying: false,
        index: 0,
        order: [],
        delay: KIOSK_CONFIG.YEAR_PLAYBACK_DELAY_MS,
    };
    app.view.swoopy_arrows = [];
    app.view.load_indicator_state = -1;
    app.view.map_opacity_selected = 0.75;
    app.status._legendDragMoved = false;
}
