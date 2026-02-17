/* ==========================================================================
   charts.js — bar chart rendering
   FIX: removed inline <style> block (styles now in main.css)
   FIX: simplified saldi label ternary (all three branches were identical)
   FIX: guarded against -Infinity/0 maxValue
   ========================================================================== */

   function refresh_barchart_view()
   {
       let barchart_view_data = document.getElementById("barchart_view_data");
       if (!app.data.processed)
       {
           barchart_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
           return;
       }
   
       /* Sort data by migration values descending */
       let sortedData = [...app.data.processed].sort((a, b) => {
           if (a.migrations === null || a.migrations === undefined) return 1;
           if (b.migrations === null || b.migrations === undefined) return -1;
           const aVal = typeof a.migrations === 'string' ? parseFloat(a.migrations) : a.migrations;
           const bVal = typeof b.migrations === 'string' ? parseFloat(b.migrations) : b.migrations;
           return bVal - aVal;
       });
   
       /* Calculate max value for scaling */
       let maxValue = Math.max(
           ...sortedData
               .filter(item => item.migrations !== null && item.migrations !== undefined)
               .map(item => Math.abs(Number(item.migrations)))
       );
       if (!Number.isFinite(maxValue) || maxValue <= 0) {
           maxValue = 1;
       }
   
       /* Build chart HTML — no inline <style>; styles are in main.css */
       let dataview = `
       <div class="barchart-container">
           <h3>${app.selection.theme === 'von' ? 'Wanderungen von' :
                 app.selection.theme === 'nach' ? 'Wanderungen nach' :
                 'Wanderungssaldi für'}
                ${app.data.featurename_mapping[app.selection.area_id] || ''}</h3>
           <div class="barchart-wrapper">`;
   
       sortedData.forEach(item => {
           /* FIX: simplified label — for 'von' use toname (destination),
              otherwise always fromname (the other area) */
           const labelText = (app.selection.theme === 'von') ? item.toname : item.fromname;
   
           if (item.migrations === null || item.migrations === undefined) {
               /* NA values: grey with "NA" text */
               dataview += `
                   <div class="barchart-row">
                       <div class="barchart-label">${labelText}</div>
                       <div class="barchart-bar-container">
                           <div class="barchart-bar" style="width: 0; background-color: grey;">
                               <span class="barchart-value">NA</span>
                           </div>
                       </div>
                   </div>`;
           } else {
               const val = Number(item.migrations);
               const abs = Math.abs(val);
               const barWidth = (abs === 0) ? 0 : Math.max(5, (abs / maxValue) * 100);
               const barColor = item.color || (val >= 0 ? '#356184' : '#E45A47');
               const barDirection = val >= 0 ? 'right' : 'left';
               const decimals = app.selection.data_interpretation === 'migration_rate' ? 3 : 0;
               const labelValue = format_value(val, decimals);
               dataview += `
                   <div class="barchart-row">
                       <div class="barchart-label">${labelText}</div>
                       <div class="barchart-bar-container">
                           <div class="barchart-bar ${barDirection}"
                                style="width: ${barWidth}%; background-color: ${barColor};">
                               <span class="barchart-value">${labelValue}</span>
                           </div>
                       </div>
                   </div>`;
           }
       });
   
       dataview += `
           </div>
       </div>`;
   
       /* FIX: no <style> block appended here — all barchart styles are in main.css */
   
       barchart_view_data.innerHTML = dataview;
   }
   