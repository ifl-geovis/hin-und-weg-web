/* ==========================================================================
   main.js — application state, UI logic, data processing
   ========================================================================== */

   let app =
   {
	   configuration:
	   {
		   colors:
		   {
			   "red_scale":
			   {
				   title: "Rot",
				   scale: [chroma("#E45A47").brighten(2), chroma("#E45A47").darken(2)],
			   },
			   "blue_scale":
			   {
				   title: "Blau",
				   scale: [chroma("#356184").brighten(2), chroma("#356184").darken(2)],
			   },
			   "Greys":
			   {
				   title: "Graustufen",
				   scale: "Greys",
			   },
			   "green_scale":
			   {
				   title: "Grün",
				   scale: [chroma("green").brighten(3), chroma("green").darken(3)],
			   },
			   "RdYlBu":
			   {
				   title: "Rot - Gelb - Blau",
				   scale: "RdYlBu",
			   },
		   }
	   },
	   map:
	   {
		   map: null,
		   datalayer: null,
		   backgroundlayer: null,
		   selectionlayer: null,
		   labels: [],
		   /* Background tile providers — kept as-is per user request */
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
   
	   status:
	   {
		   dataset_loads: 0,
		   migrations_loads: 0,
		   dataset_loaded: false,
		   modal_dialog: true,
		   viewcomponent: null,
		   dragstart_x: 0,
		   dragstart_y: 0,
		   dragstart_x_legend: 0,
		   dragstart_y_legend: 0,
		   loading: false,
		   background_active: true,
		   _legendDragMoved: false, /* FIX: was never initialized; used by toggle_legend() */
	   },
	   data:
	   {
		   geodata: null,
		   featurename_mapping: {},
		   migrations: {},
		   unfiltered: null,
		   processed: null,
		   geostats: null,
		   geostats_positive: null,
		   geostats_negative: null,
	   },
	   selection:
	   {
		   dataset_id: null,
		   dataset: null,
		   category_id: null,
		   category: null,
		   theme: 'saldi',
		   data_interpretation: 'absolute',
		   swoopy_arrows: true,
		   labels: 'none',
		   area_id: null,
		   area_inside: true,
		   filter:
		   {
			   min: 0,
			   max: 0,
		   },
		   classification: 'equidistant',
		   class_number: 'automatic',
		   class_number_negative: 'automatic',
		   colors: 'red_scale',
		   colors_negative: 'blue_scale_negative',
		   classborders: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		   classborders_negative: [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1],
		   map_opacity: 0.8,
		   classification_overall: true,
		   tablesort: null,            /* FIX: was never initialized */
		   tablesort_ascending: true,  /* FIX: was never initialized */
	   },
	   view:
	   {
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
			   delay: 1000
		   }
	   },
	   dataset_list: [],
	   datasets: {},
   };
   
   
   /* --- UI event handlers ---------------------------------------------------- */
   
   function dataset_load()
   {
	   /* FIX: removed unused event parameter */
	   if (app.status.modal_dialog) return;
	   app.status.modal_dialog = true;
	   let dataset_dialog = document.getElementById("datasetloader_dialog");
	   dataset_dialog.style.display = "block";
	   let datasetloader_close_button = document.getElementById("datasetloader_close_button");
	   datasetloader_close_button.style.display = "block";
   }
   
   function show_viewcomponent(event, viewid)
   {
	   if (app.status.modal_dialog) return;
	   process_selections(false);
	   app.status.modal_dialog = true;
	   app.status.viewcomponent = viewid;
	   let viewcomponent = document.getElementById(viewid);
	   viewcomponent.style.display = "block";
	   refresh_view(viewid);
   }
   
   function refresh_view(viewid)
   {
	   if (viewid === "table_view") refresh_table_view();
	   if (viewid === "statistics_view") refresh_statistics_view();
	   if (viewid === "barchart_view") refresh_barchart_view();
   }
   
   function theme_selected(event) {
	   app.selection.theme = event.target.value;
	   stop_year_playback(false);
	   update_filter_visibility();
	   process_selections(true);
   }
   
   function update_filter_visibility() {
	   const minFilterContainer = document.getElementById("min_filter_container");
	   const filterMin = document.getElementById("filter_min");
   
	   if (app.selection.theme === 'saldi') {
		   minFilterContainer.style.display = 'block';
		   filterMin.disabled = false;
	   } else {
		   minFilterContainer.style.display = 'none';
		   filterMin.disabled = true;
		   app.selection.filter.min = 0;
		   filterMin.value = 0;
	   }
   }
   
   function labels_selected(event)
   {
	   app.selection.labels = event.target.value;
	   show_geojson_layer();
   }
   
   function swoopy_arrows_changed(event)
   {
	   app.selection.swoopy_arrows = event.target.checked;
	   process_selections(false);
   }
   
   function data_interpretation_changed(event)
   {
	   app.selection.data_interpretation = event.target.value;
	   process_selections(false);
   }
   
   function area_selected(event) {
	   app.selection.area_id = event.target.value;
	   stop_year_playback(false);
	   process_selections(false);
   }
   
   function area_inside_changed(event)
   {
	   app.selection.area_inside = event.target.checked;
	   process_selections(true);
   }
   
   function year_selected(event) {
	   stop_year_playback(false);
	   app.selection.years = [];
	   for (let option of event.target.selectedOptions) app.selection.years.push(option.value);
	   process_selections(false);
   }
   
   function filter_changed(event) {
	   const filter_min = document.getElementById("filter_min");
	   const filter_max = document.getElementById("filter_max");
	   app.selection.filter.min = Number(filter_min.value || 0);
	   app.selection.filter.max = Number(filter_max.value || 0);
	   process_selections(false);
   }
   
   function classification_selected(event)
   {
	   app.selection.classification = event.target.value;
	   process_selections(true);
   }
   
   function classification_overall_changed(event) {
	   app.selection.classification_overall = !!event.target.checked;
	   process_selections(true);
   }
   
   function class_number_selected(event, positive)
   {
	   if (positive) app.selection.class_number = event.target.value;
	   else app.selection.class_number_negative = event.target.value;
	   process_selections(true);
   }
   
   function classborder_changed(event)
   {
	   for (let i = 1; i <= 10; i++)
	   {
		   let selection = document.getElementById("classborder" + i + "_selector");
		   app.selection.classborders[i - 1] = selection.value;
		   let selection_negative = document.getElementById("classborder" + i + "_negative_selector");
		   app.selection.classborders_negative[10 - i] = selection_negative.value;
	   }
	   if (app.selection.classification === 'own')
	   {
		   process_selections(true);
	   }
   }
   
   function colors_changed(event, negative)
   {
	   if (negative) app.selection.colors_negative = event.target.value;
	   else app.selection.colors = event.target.value;
	   process_selections(true);
   }
   
   
   /* --- Selection management ------------------------------------------------- */
   
   function renew_area_selection()
   {
	   let selection = document.getElementById("area_selector");
	   remove_select_options(selection);
	   selection.disabled = true;
	   if (app.data.featurename_mapping)
	   {
		   let featurename_list = Object.keys(app.data.featurename_mapping);
		   add_select_options(selection, featurename_list, app.data.featurename_mapping);
		   if (featurename_list.length > 0) selection.disabled = false;
   
		   const defaultArea = 'DE3';
		   if (!app.selection.area_id && app.data.featurename_mapping[defaultArea]) {
			   selection.value = defaultArea;
			   app.selection.area_id = defaultArea;
		   }
	   }
   }
   
   function renew_year_selection() {
	   let section = document.getElementById("years_selection");
	   section.style.display = "none";
	   let selection = document.getElementById("year_selector");
	   remove_select_options(selection);
   
	   const playBtn = document.getElementById("year_play_toggle");
   
	   if (app.selection.category && app.selection.category.years) {
		   add_select_options_year(selection, app.selection.category.years);
		   if (app.selection.category.years.length > 0) {
			   section.style.display = "block";
   
			   const yearsAsc = [...app.selection.category.years].map(y => Number(y)).sort((a, b) => a - b);
			   app.view.year_player.order = yearsAsc;
   
			   let newestYear = Math.max(...yearsAsc);
			   app.selection.years = [newestYear.toString()];
			   for (let option of selection.options) {
				   if (Number(option.value) === newestYear) {
					   option.selected = true;
					   break;
				   }
			   }
			   /* FIX: removed duplicate year_selector.size = 10 from load_completed();
				  this is the single authoritative sizing */
			   selection.size = Math.min(app.selection.category.years.length, 8);
   
			   const cur = Number(app.selection.years?.[0] || newestYear);
			   const idx = yearsAsc.indexOf(cur);
			   app.view.year_player.index = (idx >= 0 ? idx : 0);
   
			   if (playBtn) {
				   playBtn.disabled = false;
				   playBtn.setAttribute('aria-pressed', 'false');
				   playBtn.setAttribute('aria-label', 'Jahre abspielen');
				   const icon = document.getElementById('year_play_icon');
				   if (icon) icon.src = 'img/play.svg';
			   }
		   } else {
			   app.view.year_player.order = [];
			   if (playBtn) playBtn.disabled = true;
		   }
	   } else {
		   app.view.year_player.order = [];
		   if (playBtn) playBtn.disabled = true;
	   }
   }
   
   function renew_filters(reset_filters)
   {
	   if (!app.data.processed) return;
	   if (!app.data.geostats) return;
	   let filters = document.getElementsByClassName("filter");
	   for (let filter of filters) filter.disabled = false;
	   const min = app.data.geostats.min();
	   const max = app.data.geostats.max();
	   if (reset_filters)
	   {
		   app.selection.filter.min = 0;
		   let filter_min = document.getElementById("filter_min");
		   filter_min.value = 0;
		   filter_min.min = min;
		   filter_min.max = max;
		   app.selection.filter.max = 0;
		   let filter_max = document.getElementById("filter_max");
		   filter_max.value = 0;
		   filter_max.min = min;
		   filter_max.max = max;
	   }
	   app.status.filter_changed = false;
   }
   
   
   /* --- Data processing pipeline --------------------------------------------- */
   
   function process_selections(reset_filters) {
	   show_load_indicator("Daten werden prozessiert.");
	   refresh_classification_message();
	   recalculate_data(reset_filters);
	   refresh_datalayer();
   
	   if (typeof refresh_map_labels === 'function') refresh_map_labels();
   
	   refresh_title_years();
	   refresh_swoopy_arrows();
	   renew_filters(reset_filters);
	   refresh_view(app.status.viewcomponent);
	   refresh_legend();
	   refresh_settings_dialog();
	   app.status.loading = false;
   }
   
   function recalculate_data(reset_filters)
   {
	   app.data.processed = null;
	   app.data.geostats = null;
	   app.data.geostats_positive = null;
	   app.data.geostats_negative = null;
	   if (!app.selection.area_id) return;
	   if (app.selection.theme === 'von') recalculate_data_von();
	   else if (app.selection.theme === 'nach') recalculate_data_nach();
	   else if (app.selection.theme === 'saldi') recalculate_data_saldi();
	   recalculate_classification();
	   post_process(reset_filters);
   }
   
   function create_where_clause(elements)
   {
	   if (!elements) return "";
	   if (elements.length < 1) return "";
	   let clause = " WHERE";
	   let first = true;
	   for (let element of elements)
	   {
		   if (!first) clause += " AND";
		   clause += " (" + element + ")";
		   first = false;
	   }
	   return clause;
   }
   
   function list_selection_for_sql(additionals)
   {
	   let list = [];
	   if (additionals) list = additionals;
	   if (!app.selection.area_inside) list.push("fromid <> toid");
	   if (app.selection.years && (app.selection.years.length > 0)) list.push("year IN ('" + app.selection.years.join("', '") + "')");
	   return list;
   }
   
   function get_migration_select(direction)
   {
	   if (app.selection.data_interpretation === 'migration_rate') {
		   return 'ROUND(AVG(migration_rate_' + direction + '), 3) AS migrations';
	   }
	   return 'CASE WHEN COUNT(migrations) = 0 THEN NULL ELSE SUM(migrations) END AS migrations';
   }
   
   function recalculate_data_von()
   {
	   const where_clause = create_where_clause(list_selection_for_sql(["fromid = ?"]));
	   app.data.processed = alasql("SELECT toid AS id, ? AS fromid, ? AS fromname, toid, " + get_migration_select('from') + " from migrations " + where_clause + " GROUP BY toid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	   for (let row of app.data.processed)
	   {
		   row.toname = app.data.featurename_mapping[row.toid];
	   }
   }
   
   function recalculate_data_nach()
   {
	   const where_clause = create_where_clause(list_selection_for_sql(["toid = ?"]));
	   app.data.processed = alasql("SELECT fromid AS id, ? AS toid, ? AS toname, fromid, " + get_migration_select('to') + " from migrations " + where_clause + " GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	   for (let row of app.data.processed)
	   {
		   row.fromname = app.data.featurename_mapping[row.fromid];
	   }
   }
   
   function recalculate_data_saldi()
   {
	   let where_clause = create_where_clause(list_selection_for_sql(["toid = ?"]));
	   app.data.processed = alasql("SELECT fromid AS id, ? AS toid, ? AS toname, fromid, " + get_migration_select('to') + " from migrations " + where_clause + " GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	   where_clause = create_where_clause(list_selection_for_sql(["fromid = ?"]));
	   const data_von = alasql("SELECT toid, " + get_migration_select('from') + " from migrations " + where_clause + " GROUP BY toid", [app.selection.area_id]);
	   for (let row of app.data.processed)
	   {
		   row.fromname = app.data.featurename_mapping[row.fromid];
		   for (let negative of data_von)
		   {
			if (negative.toid == row.fromid)
				{
					/* FIX: null-safe subtraction.
					   Old: row.migrations -= negative.migrations
					   Bug: null - null = 0 in JS, converting "no data" into zero.
					   Fix: if both sides are null, keep null (= missing). */
					const inflow = row.migrations;
					const outflow = negative.migrations;
					if (inflow === null && outflow === null) {
						row.migrations = null;
					} else {
						row.migrations = (inflow ?? 0) - (outflow ?? 0);
					}
					if (row.migrations !== null && app.selection.data_interpretation === 'migration_rate') {
						row.migrations = Number(row.migrations.toFixed(3));
					}
					break;
				}
	
		   }
	   }
   }
   
   function post_process(reset_filters)
   {
	   app.data.unfiltered = app.data.processed;
	   process_filters(reset_filters);
   }
   
   function process_filters(reset_filters) {
	   if (!app.data.geostats) return;
	   if (reset_filters) return;
	   app.data.processed = [];
	   let minValue = app.data.geostats.min();
	   let maxValue = app.data.geostats.max();
   
	   if (app.selection.filter.min < minValue) {
		   app.selection.filter.min = minValue;
		   document.getElementById("filter_min").value = minValue;
	   }
	   if (app.selection.filter.max > maxValue) {
		   app.selection.filter.max = maxValue;
		   document.getElementById("filter_max").value = maxValue;
	   }
   
	   for (let row of app.data.unfiltered) {
		   let applyMinFilter = true;
		   let applyMaxFilter = true;
   
		   if (app.selection.theme === 'saldi') {
			   applyMinFilter = (row.migrations <= app.selection.filter.min || row.migrations > 0 || app.selection.filter.min == 0);
			   applyMaxFilter = (row.migrations >= app.selection.filter.max || row.migrations < 0 || app.selection.filter.max == 0);
		   } else {
			   applyMaxFilter = (row.migrations >= app.selection.filter.max || app.selection.filter.max == 0);
		   }
   
		   if (applyMinFilter && applyMaxFilter) {
			   app.data.processed.push(row);
		   }
	   }
   }
   
   
   /* --- Classification ------------------------------------------------------- */
   
   /* Build classification value series across ALL years for stable classification */
   function build_classification_values_all_years() {
	   if (!app.selection.area_id) return { all: [], pos: [], neg: [] };
	   const area = app.selection.area_id;
	   const all = [];
	   const pos = [];
	   const neg = [];
   
	   const condsVon = ["fromid = ?"];
	   const condsNach = ["toid = ?"];
	   if (!app.selection.area_inside) {
		   condsVon.push("fromid <> toid");
		   condsNach.push("fromid <> toid");
	   }
	   const whereVon = " WHERE " + condsVon.join(" AND ");
	   const whereNach = " WHERE " + condsNach.join(" AND ");
   
	   if (app.selection.theme === 'von') {
		   const sql = "SELECT toid AS other, year, " + get_migration_select('from') +
					   " FROM migrations" + whereVon + " GROUP BY toid, year";
		   const rows = alasql(sql, [area]);
		   for (const r of rows) {
			   const v = (r && r.migrations);
			   if (v !== null && v !== undefined && v !== 0) all.push(Number(v));
		   }
	   } else if (app.selection.theme === 'nach') {
		   const sql = "SELECT fromid AS other, year, " + get_migration_select('to') +
					   " FROM migrations" + whereNach + " GROUP BY fromid, year";
		   const rows = alasql(sql, [area]);
		   for (const r of rows) {
			   const v = (r && r.migrations);
			   if (v !== null && v !== undefined && v !== 0) all.push(Number(v));
		   }
	   } else if (app.selection.theme === 'saldi') {
		   const inflowSql = "SELECT fromid AS other, year, " + get_migration_select('to') +
							 " FROM migrations" + whereNach + " GROUP BY fromid, year";
		   const inflows = alasql(inflowSql, [area]);
   
		   const outflowSql = "SELECT toid AS other, year, " + get_migration_select('from') +
							  " FROM migrations" + whereVon + " GROUP BY toid, year";
		   const outflows = alasql(outflowSql, [area]);
   
		   const inMap = new Map();
		   const outMap = new Map();
   
		   for (const r of inflows) {
			   const key = r.other + "|" + r.year;
			   inMap.set(key, r.migrations == null ? null : Number(r.migrations));
		   }
		   for (const r of outflows) {
			   const key = r.other + "|" + r.year;
			   outMap.set(key, r.migrations == null ? null : Number(r.migrations));
		   }
   
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
	   }
   
	   return { all, pos, neg };
   }
   
   function recalculate_classification() {
	   app.data.geostats = null;
	   app.data.geostats_positive = null;
	   app.data.geostats_negative = null;
	   if (!app.data.processed) return;
   
	   if (app.selection.classification_overall) {
		   const series = build_classification_values_all_years();
		   if (!series || !Array.isArray(series.all) || series.all.length === 0) return;
   
		   app.data.geostats = new geostats(series.all);
   
		   if (app.selection.theme === 'saldi') {
			   const posData = [0, ...series.pos];
			   while (posData.length < 2) posData.push(0);
			   const negData = [0, ...series.neg];
			   while (negData.length < 2) negData.push(0);
   
			   const classcountPos = calculate_classcount(series.pos.length, true);
			   const classcountNeg = calculate_classcount(series.neg.length, false);
   
			   app.data.geostats_positive = new geostats(posData);
			   app.data.geostats_positive.setColors(chroma.scale(select_color(app.selection.colors)).colors(classcountPos));
			   set_classification_algorithm(app.data.geostats_positive, classcountPos);
   
			   app.data.geostats_negative = new geostats(negData);
			   app.data.geostats_negative.setColors(chroma.scale(select_color(app.selection.colors_negative)).colors(classcountNeg));
			   set_classification_algorithm(app.data.geostats_negative, classcountNeg, true);
		   } else {
			   const classcount = calculate_classcount(series.all.length, true);
			   app.data.geostats_positive = new geostats(series.all);
			   app.data.geostats_positive.setColors(chroma.scale(select_color(app.selection.colors)).colors(classcount));
			   set_classification_algorithm(app.data.geostats_positive, classcount);
		   }
   
		   for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
		   return;
	   }
   
	   /* Original behavior: classification based only on currently selected year(s) */
	   let data = [];
	   for (let row of app.data.processed) {
		   if (row.migrations !== 0 && row.migrations !== null && row.migrations !== undefined) {
			   data.push(row.migrations);
		   }
	   }
	   if (data.length === 0) return;
   
	   app.data.geostats = new geostats(data);
	   if (recalculate_classification_saldi()) return;
   
	   const classcount = calculate_classcount(data.length, true);
	   app.data.geostats_positive = new geostats(data);
	   app.data.geostats_positive.setColors(chroma.scale(select_color(app.selection.colors)).colors(classcount));
	   set_classification_algorithm(app.data.geostats_positive, classcount);
	   for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
   }
   
   function separate_processed()
   {
	   let positive = [];
	   let negative = [];
	   for (let row of app.data.processed)
	   {
		   if (row.migrations < 0) negative.push(row);
		   else positive.push(row);
	   }
	   return [positive, negative];
   }
   
   function recalculate_classification_saldi()
   {
	   if (!app.data.processed) return false;
	   if (app.selection.theme !== 'saldi') return false; /* FIX: use !== instead of != */
	   const posneg = separate_processed();
	   const positive = posneg[0];
	   const negative = posneg[1];
	   if (negative.length === 0) return false;
	   if ((negative.length === 1) && (negative[0] === 0)) return false;
	   app.data.geostats_positive = recalculate_saldi_geostats(positive, false);
	   app.data.geostats_negative = recalculate_saldi_geostats(negative, true);
	   for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
	   return true;
   }
   
   function recalculate_saldi_geostats(processed, negative) {
	   let filteredProcessed = processed.filter(row => Math.abs(row.migrations) > 0);
	   const classcount = calculate_classcount(filteredProcessed.length, !negative);
	   let data = [0];
	   for (let row of filteredProcessed) data.push(row.migrations);
	   while (data.length < 2) data.push(0);
	   let geostatsobj = new geostats(data);
	   geostatsobj.setColors(chroma.scale(select_color(negative ? app.selection.colors_negative : app.selection.colors)).colors(classcount));
	   set_classification_algorithm(geostatsobj, classcount, negative);
	   return geostatsobj;
   }
   
   function set_classification_algorithm(geostats, classcount, negative)
   {
	   try
	   {
		   if (app.selection.classification === "equidistant") geostats.getClassEqInterval(classcount);
		   else if (app.selection.classification === "stddeviation") geostats.getClassStdDeviation(classcount);
		   else if (app.selection.classification === "arithmetic_progression") geostats.getClassArithmeticProgression(classcount);
		   else if (app.selection.classification === "geometric_progression") geostats.getClassGeometricProgression(classcount);
		   else if (app.selection.classification === "quantile") geostats.getClassQuantile(classcount);
		   else if (app.selection.classification === "jenks") geostats.getClassJenks(classcount);
		   else if (app.selection.classification === "own") geostats.setClassManually(generate_classification_array(geostats, classcount, negative));
		   else geostats.getClassQuantile(classcount);
	   }
	   catch (e)
	   {
		   console.error("Classification error:", e); /* FIX: use console.error */
		   const classification_message = document.getElementById("classification_message");
		   classification_message.innerHTML = "Es gab einen Fehler bei der Verarbeitung der Klassifikationseinstellungen. Klassifikation wurde auf eine sichere Einstellung zurückgesetzt.";
		   classification_message.style.display = "block";
		   app.selection.classification = "equidistant";
		   geostats.getClassEqInterval(classcount);
		   const classification_selector = document.getElementById("classification_selector");
		   classification_selector.value = "equidistant";
	   }
   }
   
   function generate_classification_array(geostats, classcount, negative)
   {
	   let classification = [];
	   classification.push(geostats.min());
	   if (negative) for (let i = (10 - classcount); i < 9; i++) classification.push(app.selection.classborders_negative[i]);
	   else for (let i = 0; i < (classcount - 1); i++) classification.push(app.selection.classborders[i]);
	   classification.push(geostats.max());
	   return classification;
   }
   
   
   /* --- Title / year badge --------------------------------------------------- */
   
   function refresh_title_years() {
	   /* FIX: removed dead reference to nonexistent #dataset_title_years */
	   let text = "";
	   if (app.selection.years && app.selection.years.length > 0) {
		   text = String(app.selection.years[0]);
	   }
   
	   const badge = document.getElementById("current_year_badge");
	   if (badge) {
		   badge.textContent = text || "";
	   }
   
	   if (typeof window.position_header_zoom_year === 'function') {
		   window.position_header_zoom_year();
	   }
   }
   
   
   /* --- Legend ---------------------------------------------------------------- */
   function refresh_legend() {
	const legend = document.getElementById("legend_view");
	const legend_content = document.getElementById("legend_content");
	legend.style.display = "none";
	legend_content.innerHTML = '';
	if (!app.data.geostats) return;

	/* Inspect unfiltered rows for zero and missing values */
	const rows = app.data.unfiltered || [];
	const hasZero = rows.some(r => r && r.migrations === 0);
	const hasNA = rows.some(r => r && (r.migrations === null || r.migrations === undefined));

	/* Number formatter: Rate → up to 2 decimals; Umzüge → integer */
	const fmt = (n) => {
		if (app.selection.data_interpretation === 'migration_rate') {
			return format_number_max2(n);
		} else {
			return format_value(n, 0);
		}
	};

	/* Build flat grid cells (block, lo, dash, hi) from a geostats object.
	   Each row outputs 4 direct children of .geostats-legend so the CSS
	   grid aligns the columns across all rows. */
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
		const n = gs.colors.length;
		for (let i = 0; i < n; i++) {
			const clr = gs.colors[i];
			const lo = (i < bounds.length) ? bounds[i] : undefined;
			const hi = (i + 1 < bounds.length) ? bounds[i + 1] : undefined;
			if (lo === undefined || hi === undefined) continue;
			/* CHANGED: output 4 flat grid cells instead of a wrapper div */
			html += '<div class="geostats-legend-block" style="background-color: ' + clr + ';"></div>' +
				'<span class="legend-lo">' + fmt(lo) + '</span>' +
				'<span class="legend-dash">–</span>' +
				'<span class="legend-hi">' + fmt(hi) + '</span>';
		}
		return html;
	}

	/* CHANGED: helper for the "0" row — uses the same 4-column grid layout
	   as classification ranges, with "0" in the lo column and empty dash/hi */
	function buildZeroRow() {
		return '<div class="geostats-legend-block" style="background-color: white;"></div>' +
			'<span class="legend-lo">0</span>' +
			'<span class="legend-dash"></span>' +
			'<span class="legend-hi"></span>';
	}

	/* CHANGED: helper for label-only rows ("Keine Daten") that span the 3 text columns */
	function buildLabelRow(color, label) {
		return '<div class="geostats-legend-block" style="background-color: ' + color + ';"></div>' +
			'<span class="legend-label">' + label + '</span>';
	}

	let legendHtml = '<div class="geostats-legend">';

	const isSaldi = (app.selection.theme === 'saldi');

	/* CHANGED: In Von/Nach mode, "0" appears at the top (before classification).
	   In Saldi mode, "0" appears between negative and positive entries. */
	if (hasZero && !isSaldi) {
		legendHtml += buildZeroRow();
	}

	/* Negative classification entries (saldi only) */
	if (app.data.geostats_negative) {
		legendHtml += buildFromGeostats(app.data.geostats_negative);
	}

	/* CHANGED: In Saldi mode, "0" sits between negative and positive */
	if (hasZero && isSaldi) {
		legendHtml += buildZeroRow();
	}

	/* Positive classification entries */
	if (app.data.geostats_positive) {
		legendHtml += buildFromGeostats(app.data.geostats_positive);
	}

	/* Fallback: if neither positive nor negative geostats exist, use the global one */
	if (!app.data.geostats_negative && !app.data.geostats_positive && app.data.geostats) {
		legendHtml += buildFromGeostats(app.data.geostats);
	}

	/* CHANGED: "Keine Daten" always at the very bottom, dark grey (#555555) */
	if (hasNA) {
		legendHtml += buildLabelRow('#555555', 'Keine Daten');
	}

	legendHtml += '</div>';

	/* Write into the inner container so the accordion wrapper stays intact */
	const inner = document.getElementById('legend_content_inner');
	if (inner) {
		inner.innerHTML = legendHtml;
	} else {
		legend_content.innerHTML = legendHtml;
	}
	legend.style.display = "block";

	/* Collapsed state */
	if (app.view.legend_collapsed) legend.classList.add('collapsed');
	else legend.classList.remove('collapsed');
	const toggle = document.getElementById('legend_toggle');
	if (toggle) toggle.setAttribute('aria-expanded', (!app.view.legend_collapsed).toString());
}

   
   /* --- Settings dialog ------------------------------------------------------ */
   
   function refresh_classification_message()
   {
	   const classification_message = document.getElementById("classification_message");
	   classification_message.style.display = "none";
	   if (app.selection.classification === "own")
	   {
		   classification_message.innerHTML = "Hinweis: Bei eigener Klassifikation werden die Werte unten berücksichtigt, aber nur bis zur Anzahl der Klassen.";
		   classification_message.style.display = "block";
	   }
   }
   
   function refresh_settings_dialog()
   {
	   const classborder_selection_section = document.getElementById("classborder_selection_section");
	   classborder_selection_section.style.display = (app.selection.classification === "own") ? "block" : "none";
	   const colors_negative_section = document.getElementById("colors_negative_section");
	   colors_negative_section.style.display = (app.selection.theme === "saldi") ? "block" : "none";
	   const class_number_negative_section = document.getElementById("class_number_negative_section");
	   class_number_negative_section.style.display = (app.selection.theme === "saldi") ? "block" : "none";
	   const classborder_negative_section = document.getElementById("classborder_negative_section");
	   classborder_negative_section.style.display = (app.selection.theme === "saldi") ? "block" : "none";
   }
   
   
   /* --- View management ------------------------------------------------------ */
   
   function close_view(event, viewid)
   {
	   /* Note: event param kept for HTML onclick compat but is unused */
	   app.status.modal_dialog = false;
	   app.status.viewcomponent = null;
	   let view = document.getElementById(viewid);
	   view.style.display = "none";
   }
   
   function move_start(event, viewid)
   {
	   app.status.dragstart_x = event.clientX;
	   app.status.dragstart_y = event.clientY;
   }
   
   function move_stop(event, viewid)
   {
	   app.view.positions[viewid].x += event.clientX - app.status.dragstart_x;
	   app.view.positions[viewid].y += event.clientY - app.status.dragstart_y;
	   let view = document.getElementById(viewid);
	   view.style.left = app.view.positions[viewid].x + "px";
	   view.style.top = app.view.positions[viewid].y + "px";
   }
   
   function move_start_legend(event, viewid)
   {
	   app.status.dragstart_x_legend = event.clientX;
	   app.status.dragstart_y_legend = event.clientY;
   }
   
   function move_stop_legend(event, viewid)
   {
	   const dx = event.clientX - app.status.dragstart_x_legend;
	   const dy = event.clientY - app.status.dragstart_y_legend;
   
	   /* Only reposition if the pointer actually moved (> 4px threshold) */
	   if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
		   app.status._legendDragMoved = true;
		   app.view.positions[viewid].x -= dx;
		   app.view.positions[viewid].y -= dy;
		   let view = document.getElementById(viewid);
		   view.style.right = app.view.positions[viewid].x + "px";
		   view.style.bottom = app.view.positions[viewid].y + "px";
	   }
   }
   
   function toggle_legend(event) {
	   if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
   
	   /* If the pointer moved significantly since dragstart, treat as drag not click */
	   if (app.status._legendDragMoved) {
		   app.status._legendDragMoved = false;
		   return;
	   }
   
	   const legend = document.getElementById('legend_view');
	   if (!legend) return;
   
	   const collapsed = legend.classList.toggle('collapsed');
   
	   const toggle = document.getElementById('legend_toggle');
	   if (toggle) toggle.setAttribute('aria-expanded', (!collapsed).toString());
   
	   app.view.legend_collapsed = collapsed;
   }
   
   
   /* --- Mobile menu & settings panel ----------------------------------------- */
   
   function toggle_mobile_menu() {
	   const box = document.getElementById("selection_box");
	   if (!box) return;
   
	   const isOpen = box.classList.toggle("open");
   
	   /* Mutual exclusion: close settings panel when burger opens */
	   if (isOpen) {
		   const settingsPanel = document.getElementById("classification_view");
		   if (settingsPanel && settingsPanel.classList.contains("open")) {
			   settingsPanel.classList.remove("open");
			   settingsPanel.setAttribute("aria-hidden", "true");
			   settingsPanel.style.removeProperty("display");
			   const settingsBtn = document.getElementById("classification_button");
			   if (settingsBtn) settingsBtn.setAttribute("aria-expanded", "false");
		   }
	   }
   
	   const burger = document.getElementById("menu_toggle_button");
	   if (burger) burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
	   box.setAttribute("aria-hidden", (!isOpen).toString());
   }
   
   function toggle_settings_panel() {
	   const panel = document.getElementById("classification_view");
	   if (!panel) return;
   
	   panel.style.removeProperty("display");
	   const isOpen = panel.classList.toggle("open");
   
	   /* Mutual exclusion: close burger menu when settings opens */
	   if (isOpen) {
		   const selBox = document.getElementById("selection_box");
		   if (selBox && selBox.classList.contains("open")) {
			   selBox.classList.remove("open");
			   selBox.setAttribute("aria-hidden", "true");
			   const burger = document.getElementById("menu_toggle_button");
			   if (burger) burger.setAttribute("aria-expanded", "false");
		   }
		   refresh_settings_dialog();
	   }
   
	   panel.setAttribute("aria-hidden", (!isOpen).toString());
	   const btn = document.getElementById("classification_button");
	   if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
   }
   
   
   /* --- Year playback -------------------------------------------------------- */
   
   function toggle_year_playback() {
	   if (app.view.year_player.isPlaying) {
		   stop_year_playback(true);
	   } else {
		   start_year_playback();
	   }
   }
   
   function start_year_playback() {
	   const btn = document.getElementById("year_play_toggle");
	   const years = app.view.year_player.order || [];
	   if (!years || years.length === 0) return;
   
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
	   const years = app.view.year_player.order || [];
	   if (!years || years.length === 0) {
		   stop_year_playback(true);
		   return;
	   }
	   app.view.year_player.index = (app.view.year_player.index + 1) % years.length;
	   set_current_year(years[app.view.year_player.index]);
   }
   
   function set_current_year(yearNumber) {
	   app.selection.years = [String(yearNumber)];
	   const sel = document.getElementById('year_selector');
	   if (sel && sel.options && sel.options.length > 0) {
		   for (const opt of sel.options) opt.selected = (Number(opt.value) === Number(yearNumber));
	   }
	   process_selections(false);
   }
   