/* tools/build-preload.js — Vorberechnung der Saldi für Medienstation
   Aufruf:
     cd tools
     npm install papaparse @turf/turf
     node build-preload.js
*/

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const turf = require('@turf/turf');

const DATASET_DIR = path.join(__dirname, '..', 'data', 'landkreise');
const INFO = JSON.parse(fs.readFileSync(path.join(DATASET_DIR, 'info.json'), 'utf8'));
const CATEGORY = INFO.categories.find(c => c.id === 'all') || INFO.categories[0];

const TOP_BOTTOM_N = 8;       /* Anzahl Pfeile pro Richtung */
const N_CLASSES = 5;          /* NEU: 5 positive + 5 negative equidistante Klassen */

console.log('Building precomputed preload for "landkreise" / category:', CATEGORY.id);

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

/* === Schritt 2: Saldi pro (Landkreis, Jahr, anderer Landkreis) berechnen ===
   Saldo[area][year][other] = inflow(other→area) - outflow(area→other)
*/
console.log('\n[2/3] Berechne Saldi für', allAreaIds.size, 'Landkreise × ', CATEGORY.years.length, 'Jahre ...');
const areaIdList = [...allAreaIds].sort();
const saldiByArea = {};        /* { areaid: { year: { otherid: saldo } } } */
let totalSaldoEntries = 0;

for (const area of areaIdList) {
    const yearMap = saldiByArea[area] = {};
    for (const year of CATEGORY.years) {
        const raw = rawByYear[year];
        if (!raw) continue;

        /* Outflows (area → other) */
        const outflows = raw[area] || {};
        /* Inflows (other → area): über alle anderen scannen */
        const inflows = {};
        for (const fromid in raw) {
            if (raw[fromid][area] !== undefined) {
                inflows[fromid] = raw[fromid][area];
            }
        }

        /* Saldi: Vereinigung aller "other"-IDs */
        const others = new Set([...Object.keys(outflows), ...Object.keys(inflows)]);
        const saldoMap = {};
        for (const other of others) {
            if (other === area) continue;     /* keine Self-Loops */
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

/* === Schritt 3: Klassifikation + Top/Bottom-3 vorberechnen === */
console.log('\n[3/3] Berechne Klassifikationen und Top/Bottom-' + TOP_BOTTOM_N + ' ...');
const precomputed = {};

for (const area of areaIdList) {
    const areaData = saldiByArea[area];
    if (!areaData) continue;

    /* Sammle alle Saldi-Werte über alle Jahre für die "Klassifikation gesamt" */
    const allValues = [];
    const positiveValues = [];
    const negativeValues = [];

    /* Top/Bottom-3 pro Jahr */
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

        /* Top N (höchste positive) */
        const top = entries
            .filter(e => e[1] > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_BOTTOM_N)
            .map(e => e[0]);

        /* Bottom N (niedrigste negative) */
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
/* NEU: 5 equidistante Klassen für positive und negative Werte */
const cntPos = N_CLASSES;
const cntNeg = N_CLASSES;

const positiveBounds = computeEquidistantBounds(0, maxPos, cntPos);
const negativeBounds = computeEquidistantBounds(minNeg, 0, cntNeg);

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
/* === Equidistant Bounds berechnen ===
   Erzeugt N+1 Grenzpunkte für N Klassen:
   z. B. min=0, max=100, n=5 → [0, 20, 40, 60, 80, 100] */
   function computeEquidistantBounds(minVal, maxVal, n) {
    if (n < 1) return [];
    if (minVal === maxVal) {
        /* Edge case: alle Werte identisch oder Bereich leer */
        return [minVal, maxVal];
    }
    const step = (maxVal - minVal) / n;
    const bounds = [];
    for (let i = 0; i <= n; i++) {
        bounds.push(minVal + i * step);
    }
    return bounds;
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

/* Precomputed pro Landkreis chunked schreiben */
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
