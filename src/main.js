/*
app is the general data holder for the application

for controlling the application:
	* status: diverse status information

for the map:
	* map: holds the leaflet map
	* maplayer: holds the geojson-layer (once loaded)

info-data (datasets and categories for controlling the application):
	* dataset_list: list of the datasets defined in data/data.json as ids (should be filled by init process)
	* datasets: the full content of the different data/${dataset}/info.json, each keyed with the id of the dataset (should be filled by init process)
	* dataset_mapping: map of dataset-ids to their names for dropdown list (should be filled by init process)
	* category_mapping: map of category-ids to their names for dropdown list (will be filled once dataset is selected)
	* selection.dataset_id, selection.category_id: ids of currently selected dataset and category
	* selection.dataset, selection.category: full content of currently selected dataset and category

data:
	* geodata: contains the geojson loaded dynamically specified in the selected dataset

*/

let app =
{
	map:
	{
		map: null,
		datalayer: null,
		selectionlayer: null,
	},
	status:
	{
		dataset_loads: 0,
		migrations_loads: 0,
		dataset_loaded: false,
		modal_dialog: true,
		dragstart_x: 0,
		dragstart_y: 0,
		dragstart_x_legend: 0,
		dragstart_y_legend: 0,
		loading: false,
	},
	configuration:
	{
	},
	data:
	{
		geodata: null,
		featurename_mapping: {},
		migrations: {},
		processed: null,
	},
	selection:
	{
		dataset_id: null,
		dataset: null,
		category_id: null,
		category: null,
		theme: 'von',
		swoopy_arrows: false,
		area_id: null,
		area_inside: true,
		filter:
		{
			min: 0,
			max: 0,
		},
		classification: 'quantile',
		class_number: 'automatic',
		colors: 'RdYlBu',
	},
	view:
	{
		positions:
		{
		},
		swoopy_arrows: [],
		load_indicator_state: -1,
	},
	dataset_list: [],
	datasets: {},
};

function dataset_load(event)
{
	if (app.status.modal_dialog) return;
	console.log("dataset_load");
	app.status.modal_dialog = true;
	let dataset_dialog = document.getElementById("datasetloader_dialog");
	dataset_dialog.style.display = "block";
	let datasetloader_close_button = document.getElementById("datasetloader_close_button");
	datasetloader_close_button.style.display = "block";
}

function show_viewcomponent(event, viewid)
{
	if (app.status.modal_dialog) return;
	console.log("show_viewcomponent", viewid);
	process_selections(false);
	app.status.modal_dialog = true;
	let viewcomponent = document.getElementById(viewid);
	viewcomponent.style.display = "block";
}

function theme_selected(event)
{
	//console.log("theme_selected:", event.target.value);
	app.selection.theme = event.target.value;
	process_selections(true);
}

function swoopy_arrows_changed(event)
{
	//console.log("swoopy_arrows_changed:", event.target.checked);
	app.selection.swoopy_arrows = event.target.checked;
	process_selections(false);
}

function area_selected(event)
{
	//console.log("area_selected:", event.target.value);
	app.selection.area_id = event.target.value;
	process_selections(true);
}

function area_inside_changed(event)
{
	//console.log("area_inside_changed:", event.target.checked);
	app.selection.area_inside = event.target.checked;
	process_selections(true);
}

function year_selected(event)
{
	//console.log("year_selected:", event.target.selectedOptions);
	app.selection.years = [];
	for (let option of event.target.selectedOptions) app.selection.years.push(option.value);
	process_selections(true);
}

function filter_changed(event)
{
	let filter_min = document.getElementById("filter_min");
	let filter_max = document.getElementById("filter_max");
	app.selection.filter.min = filter_min.value;
	app.selection.filter.max = filter_max.value;
	process_selections(false);
}

function classification_selected(event)
{
	//console.log("classification_selected:", event.target.value);
	app.selection.classification = event.target.value;
	process_selections(true);
}

function class_number_selected(event)
{
	//console.log("class_number_selected:", event.target.value);
	app.selection.class_number = event.target.value;
	process_selections(true);
}

function colors_changed(event)
{
	//console.log("colors_changed:", event.target.checked);
	app.selection.colors = event.target.value;
	process_selections(true);
}

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
	}
}

function renew_year_selection()
{
	let section = document.getElementById("years_selection");
	section.style.display = "none";
	let selection = document.getElementById("year_selector");
	remove_select_options(selection);
	if (app.selection.category.years)
	{
		add_select_options_year(selection, app.selection.category.years);
		if (app.selection.category.years.length > 0) section.style.display = "block";
	}
	app.selection.years = app.selection.category.years;
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
		let filter_min = document.getElementById("filter_min");
		filter_min.value = min;
		filter_min.min = min;
		filter_min.max = max;
		let filter_max = document.getElementById("filter_max");
		filter_max.value = max;
		filter_max.min = min;
		filter_max.max = max;
	}
	app.status.filter_changed = false;
}

function process_selections(reset_filters)
{
	show_load_indicator("Daten werden prozessiert.");
	recalculate_data(reset_filters);
	if (app.map.datalayer) app.map.datalayer.setStyle(map_style);
	if (app.map.selectionlayer) app.map.selectionlayer.setStyle(map_style_selected);
	refresh_title_years();
	refresh_swoopy_arrows();
	renew_filters(reset_filters);
	refresh_table_view();
	refresh_statistics_view();
	refresh_barchart_view();
	refresh_legend();
	app.status.loading = false;
}

function recalculate_data(reset_filters)
{
	app.data.processed = null;
	app.data.geostats = null;
	if (!app.selection.area_id) return;
	//console.log("theme in recalculate_data:", app.selection.theme);
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
	for (element of elements)
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

function recalculate_data_von()
{
	const where_clause = create_where_clause(list_selection_for_sql(["fromid = ?"]));
	app.data.processed = alasql("SELECT toid AS id, ? AS fromid, ? AS fromname, toid, sum(migrations) AS migrations from migrations " + where_clause + " GROUP BY toid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.toname = app.data.featurename_mapping[row.toid];
	}
}

function recalculate_data_nach()
{
	const where_clause = create_where_clause(list_selection_for_sql(["toid = ?"]));
	app.data.processed = alasql("SELECT fromid AS id, ? AS toid, ? AS toname, fromid, sum(migrations) AS migrations from migrations " + where_clause + " GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.fromname = app.data.featurename_mapping[row.fromid];
	}
}

function recalculate_data_saldi()
{
	let where_clause = create_where_clause(list_selection_for_sql(["toid = ?"]));
	app.data.processed = alasql("SELECT fromid AS id, ? AS toid, ? AS toname, fromid, sum(migrations) AS migrations from migrations " + where_clause + " GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	where_clause = create_where_clause(list_selection_for_sql(["fromid = ?"]));
	data_von = alasql("SELECT toid, sum(migrations) AS migrations from migrations " + where_clause + " GROUP BY toid", [app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.fromname = app.data.featurename_mapping[row.fromid];
		for (let negative of data_von)
		{
			if (negative.toid == row.fromid)
			{
				row.migrations -= negative.migrations;
				break;
			}
		}
	}
}

function post_process(reset_filters)
{
	if (reset_filters) return;
	let new_data = [];
	if (app.selection.filter.min && (app.selection.filter.min != ""))
	{
		for (let row of app.data.processed)
		{
			if (row.migrations >= app.selection.filter.min) new_data.push(row);
		}
		app.data.processed = new_data;
	}
	new_data = [];
	if (app.selection.filter.max && (app.selection.filter.max != ""))
	{
		for (let row of app.data.processed)
		{
			if (row.migrations <= app.selection.filter.max) new_data.push(row);
		}
		app.data.processed = new_data;
	}
}

function recalculate_classification()
{
	app.data.geostats = null;
	if (!app.data.processed) return;
	const classcount = calculate_classcount(app.data.processed.length);
	let data = [];
	for (let row of app.data.processed) data.push(row.migrations);
	app.data.geostats = new geostats(data);
	app.data.geostats.setColors(chroma.scale(select_color(app.selection.colors)).colors(classcount));
	set_classification_algorithm(classcount);
	for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
}

function set_classification_algorithm(classcount)
{
	if (app.selection.classification === "equidistant") app.data.geostats.getClassEqInterval(classcount);
	else if (app.selection.classification === "stddeviation") app.data.geostats.getClassStdDeviation(classcount);
	else if (app.selection.classification === "arithmetic_progression") app.data.geostats.getClassArithmeticProgression(classcount);
	else if (app.selection.classification === "geometric_progression") app.data.geostats.getClassGeometricProgression(classcount);
	else if (app.selection.classification === "quantile") app.data.geostats.getClassQuantile(classcount);
	else if (app.selection.classification === "jenks") app.data.geostats.getClassJenks(classcount);
	else app.data.geostats.getClassQuantile(classcount);
}

function refresh_title_years()
{
	let dataset_title_years = document.getElementById("dataset_title_years");
	let years = "";
	if (app.selection.years && (app.selection.years.length > 0)) years = " (" + app.selection.years.join(", ") + ")";
	dataset_title_years.innerHTML = years;
}

function refresh_legend()
{
	const legend = document.getElementById("legend_view");
	const legend_content = document.getElementById("legend_content");
	legend.style.display = "none";
	if (!app.data.geostats) return;
	legend_content.innerHTML = app.data.geostats.getHtmlLegend();
	legend.style.display = "block";
}

function close_view(event, viewid)
{
	app.status.modal_dialog = false;
	let view = document.getElementById(viewid);
	view.style.display = "none";
}

function move_start(event, viewid)
{
	//console.log("move_start (" + viewid + "):", event);
	app.status.dragstart_x = event.clientX;
	app.status.dragstart_y = event.clientY;
}

function move_stop(event, viewid)
{
	//console.log("move_stop (" + viewid + "):", event);
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
	app.view.positions[viewid].x -= event.clientX - app.status.dragstart_x_legend;
	app.view.positions[viewid].y -= event.clientY - app.status.dragstart_y_legend;
	let view = document.getElementById(viewid);
	view.style.right = app.view.positions[viewid].x + "px";
	view.style.bottom = app.view.positions[viewid].y + "px";
}