/* ==========================================================================
   util.js — Medienstation
   - Schlanke Helfer für Farb-/Werte-Lookups, Formatierung
   - Color-Cache für O(1)-Feature-Lookups
   - Brewer-Paletten-Reverse korrigiert (Bug 7)
   ========================================================================== */


/* ==========================================================================
   Klassifikation
   ========================================================================== */

/* In der Medienstation gibt es keine UI-Wahl der Klassenzahl.
   Wir nutzen immer die automatische Quadratwurzel-Heuristik, gedeckelt 1..5. */
   function calculate_classcount(choices, positive) {
    /* Defensiv: falls jemand doch eine Zahl gesetzt hat, respektieren */
    const raw = positive ? app.selection.class_number : app.selection.class_number_negative;
    if (raw && raw !== 'automatic') {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) return Math.max(1, Math.min(5, n));
    }
    if (!choices || choices < 1) return 1;
    let cc = Math.round(Math.sqrt(choices));
    if (cc < 1) cc = 1;
    if (cc > 5) cc = 5;
    return cc;
}


/* ==========================================================================
   Farb-Lookups mit Cache
   ========================================================================== */

let _featureColorCache = null;

/* Wird von process_selections() in main.js aufgerufen, sobald processed/unfiltered
   neu berechnet wurden. Invalidiert den Cache. */
function invalidate_color_cache() {
    _featureColorCache = null;
}

function _build_feature_color_cache() {
    _featureColorCache = new Map();
    if (!app.data.unfiltered) return;
    for (const row of app.data.unfiltered) {
        if (row && row.id !== undefined && row.id !== null) {
            _featureColorCache.set(row.id, row);
        }
    }
}

function get_color_for_value(value) {
    if (value === null || value === undefined) return "grey";
    if (value === 0) return "white";
    if (!app.data.geostats) return "white";
    if (app.data.geostats_negative && value < 0) {
        const cls = app.data.geostats_negative.getClass(value);
        return app.data.geostats_negative.colors[cls];
    }
    if (app.data.geostats_positive) {
        const cls = app.data.geostats_positive.getClass(value);
        return app.data.geostats_positive.colors[cls];
    }
    return "white";
}

/* O(1) statt O(n) durch Map-Cache */
function get_color_for_feature_id(feature_id) {
    if (!app.data.unfiltered) return "white";
    if (!_featureColorCache) _build_feature_color_cache();
    const row = _featureColorCache.get(feature_id);
    if (row && row.color) return row.color;
    return "white";
}

function get_feature_by_id(feature_id, filtered) {
    /* Bei filtered=true: lineare Suche im evtl. kürzeren processed-Array (zumeist klein) */
    if (filtered) {
        const data = app.data.processed;
        if (!data) return null;
        for (const row of data) if (row.id === feature_id) return row;
        return null;
    }
    if (!app.data.unfiltered) return null;
    if (!_featureColorCache) _build_feature_color_cache();
    return _featureColorCache.get(feature_id) || null;
}


/* ==========================================================================
   Color-Scales (Brewer + Custom)
   BUG-FIX 7: Brewer-Paletten werden vor dem Reversen aufgelöst
   ========================================================================== */

function _resolve_color_scale(id) {
    if (id === 'yellow_red_black') return ['yellow', 'red', 'black'];
    if (app.configuration.colors[id]) {
        const cfg = app.configuration.colors[id].scale;
        /* Falls cfg ein Brewer-String ist, in Array auflösen, damit reverse funktioniert */
        if (typeof cfg === 'string' && chroma.brewer[cfg]) return chroma.brewer[cfg];
        return cfg;
    }
    if (chroma.brewer[id]) return chroma.brewer[id];
    return null;
}

function select_color(id) {
    if (typeof id !== 'string') return id;
    if (id.endsWith("_negative")) {
        const base = id.substring(0, id.length - 9);
        return reverse_colors(_resolve_color_scale(base));
    }
    if (id.startsWith("neg_")) {
        const base = id.substring(4);
        return reverse_colors(_resolve_color_scale(base));
    }
    return _resolve_color_scale(id);
}

function reverse_colors(colors) {
    /* Wenn Brewer-String reingerutscht ist, vorher auflösen */
    if (typeof colors === 'string' && chroma.brewer[colors]) {
        colors = chroma.brewer[colors];
    }
    if (!Array.isArray(colors)) return colors;
    const reversed = [];
    for (let i = colors.length - 1; i >= 0; i--) reversed.push(colors[i]);
    return reversed;
}


/* ==========================================================================
   Number formatting (Intl.NumberFormat-Cache)
   ========================================================================== */

const _nfCache = new Map();

function _getNumberFormat(minDecimals, maxDecimals) {
    const key = minDecimals + '-' + maxDecimals;
    if (!_nfCache.has(key)) {
        _nfCache.set(key, new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
        }));
    }
    return _nfCache.get(key);
}

function format_value(value, decimals) {
    if (decimals === undefined) decimals = 0;
    if (value === null || value === undefined) return "NA";
    if (typeof value !== 'number') {
        const num = Number(value);
        if (!Number.isFinite(num)) return "NA";
        value = num;
    }
    return _getNumberFormat(decimals, decimals).format(value);
}

function format_number_max2(value) {
    if (value === null || value === undefined) return "NA";
    const num = (typeof value === 'number') ? value : Number(value);
    if (!Number.isFinite(num)) return "NA";
    return _getNumberFormat(0, 2).format(num);
}
