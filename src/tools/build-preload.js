/* tools/build-preload.js — Vorberechnung der Saldi für Medienstation
   Aufruf:
     cd tools
     npm install papaparse @turf/turf simple-statistics
     node build-preload.js
*/

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const turf = require('@turf/turf');
const ss = require('simple-statistics');

const DATASET_DIR = path.join(__dirname, '..', 'data', 'landkreise');
const INFO = JSON.parse(fs.readFileSync(path.join(DATASET_DIR, 'info.json'), 'utf8'));
const CATEGORY = INFO.categories.find(c => c.id === 'all') || INFO.categories[0];

const TOP_BOTTOM_N = 8;       /* Anzahl Pfeile pro Richtung */
const N_CLASSES = 5;          /* 5 positive + 5 negative Jenks-Klassen */
const CLASSIFICATION_METHOD = 'jenks';   /* 'jenks' | 'equidistant' | 'quantile' */

console.log('Building precomputed preload for "landkreise" / category:', CATEGORY.id);
console.log('Klassifikationsmethode:', CLASSIFICATION_METHOD, '/ Klassen je Seite:', N_CLASSES);

/* === Years aus migrations-Keys ableiten === */
if (!Array.isArray(CATEGORY.years) || CATEGORY.years.length === 0) {
    CATEGORY.years = Object.keys(CATEGORY.migrations).sort();
}
console.log('Verarbeite', CATEGORY.years.length, 'Jahre:', CATEGORY.years.join(', '));

/* === GeoJSON laden + Mappings === */
const geodata = JSON.parse(fs.readFileSync(path.join(DATASET_DIR, INFO.geodata), 'utf8'));

const featurename_mapping = {};
const centroid_mapping = {};
for (const f of geodata.features) {
    const id = f.properties[INFO.id_property];
    const name = f.properties[INFO.name_property];
    if (id && name) featurename_mapping[id] = name;
    const c = turf.centerOfMass(f);
    if (c && c.geometry && c.geometry.coordinates) {
        centroid_mapping[id] = [c.geometry.coordinates[1], c.geometry.coordinates[0]];
    }
}
console.log('Geodaten:', Object.keys(featurename_mapping).length, 'Gebiete.');

/* === Population (optional) === */
const populationByAreaYear = {};
if (CATEGORY.population) {
    const popPath = path.join(DATASET_DIR, CATEGORY.population);
    if (fs.existsSync(popPath)) {
        const popResult = Papa.parse(fs.readFileSync(popPath, 'utf8'), { skipEmptyLines: true });
        const headers = popResult.data[2];
        for (let row = 3; row < popResult.data.length; row++) {
            for (let col = 1; col < popResult.data[row].length; col++) {
                const areaid = popResult.data[row][0];
                const year = headers[col];
                let v = popResult.data[row][col];
                if (v === 'x' || v === '' || v === '.' || v === undefined) v = null;
                else { v = parseInt(v, 10); if (isNaN(v)) v = null; }
                populationByAreaYear[areaid + '|' + year] = v;
            }
        }
    }
}

/* === Schritt 1: Rohe Migrationen einlesen ===
   Struktur: rawByYear[year][fromid][toid] = value
*/
console.log('\n[1/3] Lade rohe Migrationsdaten ...');
const rawByYear = {};
const allAreaIds = new Set(Object.keys(featurename_mapping));

for (const year of CATEGORY.years) {
    const csvFile = CATEGORY.migrations[year];
    if (!csvFile) continue;
    const csvPath = path.join(DATASET_DIR, csvFile);
    if (!fs.existsSync(csvPath)) {
        console.warn('WARNUNG: CSV nicht gefunden:', csvPath);
        continue;
    }
    const result = Papa.parse(fs.readFileSync(csvPath, 'utf8'), { skipEmptyLines: true });
    const headers = result.data[2];
    const yearObj = rawByYear[year] = {};

    for (let row = 3; row < result.data.length; row++) {
        for (let col = 1; col < result.data[row].length; col++) {
            const fromid = result.data[row][0];
            const toid = headers[col];
            if (!fromid || !toid) continue;
            const raw = result.data[row][col];
            const s = (raw !== null && raw !== undefined) ? String(raw).trim() : '';
            if (s === 'x' || s === '' || s === '.') continue;
            const v = parseInt(s, 10);
            if (isNaN(v) || v === 0) continue;

            if (!yearObj[fromid]) yearObj[fromid] = {};
            yearObj[fromid][toid] = v;

            allAreaIds.add(fromid);
            allAreaIds.add(toid);
        }
    }
    process.stdout.write('.');
}
console.log('\n   Rohe Daten geladen für', Object.keys(rawByYear).length, 'Jahre.');

/* === Schritt 2: Saldi pro (Landkreis, Jahr, anderer Landkreis) berechnen === */
console.log('\n[2/3] Berechne Saldi für', allAreaIds.size, 'Landkreise × ', CATEGORY.years.length, 'Jahre ...');
const areaIdList = [...allAreaIds].sort();
const saldiByArea = {};
let totalSaldoEntries = 0;

for (const area of areaIdList) {
    const yearMap = saldiByArea[area] = {};
    for (const year of CATEGORY.years) {
        const raw = rawByYear[year];
        if (!raw) continue;

        const outflows = raw[area] || {};
        const inflows = {};
        for (const fromid in raw) {
            if (raw[fromid][area] !== undefined) {
                inflows[fromid] = raw[fromid][area];
            }
        }

        const others = new Set([...Object.keys(outflows), ...Object.keys(inflows)]);
        const saldoMap = {};
        for (const other of others) {
            if (other === area) continue;
            const inflow  = inflows[other]  || 0;
            const outflow = outflows[other] || 0;
            const saldo = inflow - outflow;
            if (saldo !== 0) {
                saldoMap[other] = saldo;
                totalSaldoEntries++;
            }
        }
        if (Object.keys(saldoMap).length > 0) {
            yearMap[year] = saldoMap;
        }
    }
    process.stdout.write('.');
}
console.log('\n   Saldi berechnet:', totalSaldoEntries, 'Einträge.');

/* === Schritt 3: Klassifikation + Top/Bottom-N vorberechnen === */
console.log('\n[3/3] Berechne Klassifikationen (' + CLASSIFICATION_METHOD + ') und Top/Bottom-' + TOP_BOTTOM_N + ' ...');
const precomputed = {};
let jenksFallbacks = 0;

for (const area of areaIdList) {
    const areaData = saldiByArea[area];
    if (!areaData) continue;

    const allValues = [];
    const positiveValues = [];
    const negativeValues = [];
    const topBottomPerYear = {};

    for (const year of CATEGORY.years) {
        const yearMap = areaData[year];
        if (!yearMap) continue;

        const entries = [];
        for (const other in yearMap) {
            const v = yearMap[other];
            entries.push([other, v]);
            allValues.push(v);
            if (v > 0) positiveValues.push(v);
            else if (v < 0) negativeValues.push(v);
        }

        const top = entries
            .filter(e => e[1] > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_BOTTOM_N)
            .map(e => e[0]);

        const bottom = entries
            .filter(e => e[1] < 0)
            .sort((a, b) => a[1] - b[1])
            .slice(0, TOP_BOTTOM_N)
            .map(e => e[0]);

        topBottomPerYear[year] = { top, bottom };
    }

    if (allValues.length === 0) continue;

    /* Min/Max für Pfeil-Skalierung */
    let minNeg = 0, maxPos = 0;
    for (const v of allValues) {
        if (v < minNeg) minNeg = v;
        if (v > maxPos) maxPos = v;
    }

    /* Klassifikation: Jenks (ckmeans) für positive und negative Werte getrennt.
       Ergebnis sind N+1 Bounds für N Klassen. */
    const positiveBounds = computeBounds(positiveValues, N_CLASSES, 0, maxPos);
    const negativeBounds = computeBounds(negativeValues, N_CLASSES, minNeg, 0);

    /* tatsächliche Klassenzahl kann durch Fallback abweichen */
    const cntPos = Math.max(1, positiveBounds.length - 1);
    const cntNeg = Math.max(1, negativeBounds.length - 1);

    precomputed[area] = {
        saldi: areaData,
        topBottomPerYear,
        classification: {
            minNeg, maxPos,
            positiveBounds, negativeBounds,
            cntPos, cntNeg,
        },
    };

    process.stdout.write('.');
}
console.log('\n   Vorberechnung fertig für', Object.keys(precomputed).length, 'Landkreise.');
if (jenksFallbacks > 0) {
    console.log('   Hinweis:', jenksFallbacks, 'Fallbacks auf equidistant (zu wenige Datenpunkte oder Ties).');
}

/* === Klassifikations-Helfer ===================================================
   computeBounds(values, n, fallbackMin, fallbackMax)
   - values:      Array von Saldi-Werten (positive ODER negative Seite)
   - n:           gewünschte Anzahl Klassen
   - fallbackMin: untere Grenze, falls keine Daten / Edge-Case
   - fallbackMax: obere Grenze, falls keine Daten / Edge-Case
   Liefert sortiertes Array mit (n+1) Bounds, oder kürzer bei Datenknappheit.
*/
function computeBounds(values, n, fallbackMin, fallbackMax) {
    if (!values || values.length === 0) {
        return [fallbackMin, fallbackMax];
    }

    /* Bei nur einem eindeutigen Wert: triviale Bounds */
    const uniqueValues = [...new Set(values)];
    if (uniqueValues.length === 1) {
        return [uniqueValues[0], uniqueValues[0]];
    }

    /* Klassenzahl auf verfügbare unique-Werte deckeln */
    const k = Math.min(n, uniqueValues.length);

    if (CLASSIFICATION_METHOD === 'jenks') {
        try {
            return computeJenksBounds(values, k);
        } catch (e) {
            jenksFallbacks++;
            console.warn('  Jenks fehlgeschlagen, Fallback auf equidistant:', e.message);
            return computeEquidistantBounds(Math.min(...values), Math.max(...values), k);
        }
    }

    if (CLASSIFICATION_METHOD === 'quantile') {
        return computeQuantileBounds(values, k);
    }

    /* default: equidistant */
    return computeEquidistantBounds(Math.min(...values), Math.max(...values), k);
}

/* Jenks Natural Breaks via ckmeans (mathematisch optimal).
   ckmeans liefert k Cluster — wir leiten daraus k+1 Bounds ab:
   bounds[0]   = min des ersten Clusters
   bounds[i]   = max des i-ten Clusters (= untere Grenze des nächsten)
   bounds[k]   = max des letzten Clusters */
function computeJenksBounds(values, k) {
    if (values.length < k) k = Math.max(1, values.length);
    const clusters = ss.ckmeans(values, k);
    const bounds = [clusters[0][0]];
    for (const cluster of clusters) {
        bounds.push(cluster[cluster.length - 1]);
    }
    /* Doppelte Bounds zusammenführen (passiert bei vielen identischen Werten) */
    return dedupeBounds(bounds);
}

/* Quantile: gleichmäßige Anzahl Datenpunkte pro Klasse */
function computeQuantileBounds(values, k) {
    const sorted = values.slice().sort((a, b) => a - b);
    const bounds = [sorted[0]];
    for (let i = 1; i < k; i++) {
        const idx = Math.floor((i / k) * sorted.length);
        bounds.push(sorted[idx]);
    }
    bounds.push(sorted[sorted.length - 1]);
    return dedupeBounds(bounds);
}

/* Equidistant: gleiche Klassenbreite */
function computeEquidistantBounds(minVal, maxVal, n) {
    if (n < 1) return [minVal, maxVal];
    if (minVal === maxVal) return [minVal, maxVal];
    const step = (maxVal - minVal) / n;
    const bounds = [];
    for (let i = 0; i <= n; i++) bounds.push(minVal + i * step);
    return bounds;
}

/* Identische aufeinanderfolgende Bounds entfernen (verhindert leere Klassen
   in der Legende, z. B. "5 – 5"). */
function dedupeBounds(bounds) {
    const out = [];
    for (const b of bounds) {
        if (out.length === 0 || out[out.length - 1] !== b) out.push(b);
    }
    /* Mindestens 2 Bounds, damit downstream-Code nicht in die Knie geht */
    if (out.length < 2) out.push(out[0]);
    return out;
}

/* === Output streamend schreiben === */
const outPath = path.join(DATASET_DIR, 'preload.js');
const fd = fs.openSync(outPath, 'w');
const write = (s) => fs.writeSync(fd, s);

write('window.__HUW_PRELOAD__ = ');
write('{');
write('"dataset_id":"landkreise",');
write('"category_id":' + JSON.stringify(CATEGORY.id) + ',');
write('"info":' + JSON.stringify(INFO) + ',');
write('"category":' + JSON.stringify(CATEGORY) + ',');
write('"geodata":' + JSON.stringify(geodata) + ',');
write('"featurename_mapping":' + JSON.stringify(featurename_mapping) + ',');
write('"centroid_mapping":' + JSON.stringify(centroid_mapping) + ',');
write('"years":' + JSON.stringify(CATEGORY.years.map(String)) + ',');
write('"top_bottom_n":' + TOP_BOTTOM_N + ',');
write('"classification_method":' + JSON.stringify(CLASSIFICATION_METHOD) + ',');

write('"precomputed":{');
let firstArea = true;
for (const area in precomputed) {
    if (!firstArea) write(',');
    firstArea = false;
    write(JSON.stringify(area));
    write(':');
    write(JSON.stringify(precomputed[area]));
}
write('}');

write('};\n');
fs.closeSync(fd);

const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.log('\n=== FERTIG ===');
console.log('Geschrieben:', outPath, '(' + sizeMB + ' MB)');
console.log('Landkreise:', Object.keys(precomputed).length);
console.log('Saldi-Einträge total:', totalSaldoEntries);
console.log('Klassifikation:', CLASSIFICATION_METHOD, '(' + N_CLASSES + ' Klassen je Seite)');
if (jenksFallbacks > 0) {
    console.log('Fallbacks auf equidistant:', jenksFallbacks);
}
