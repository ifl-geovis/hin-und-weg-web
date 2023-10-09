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
		area_id: null,
		area_inside: true,
	},
	view:
	{
		positions:
		{
		},
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
}

function show_viewcomponent(event, viewid)
{
	if (app.status.modal_dialog) return;
	console.log("show_viewcomponent", viewid);
	process_selections();
	app.status.modal_dialog = true;
	let table_view = document.getElementById(viewid);
	table_view.style.display = "block";
}

function theme_selected(event)
{
	//console.log("theme_selected:", event.target.value);
	app.selection.theme = event.target.value;
	process_selections();
}

function area_selected(event)
{
	//console.log("area_selected:", event.target.value);
	app.selection.area_id = event.target.value;
	process_selections();
}

function area_inside_changed(event)
{
	//console.log("area_inside_changed:", event.target.checked);
	app.selection.area_inside = event.target.checked;
	process_selections();
}

function year_selected(event)
{
	//console.log("year_selected:", event.target.selectedOptions);
	app.selection.years = [];
	for (let option of event.target.selectedOptions) app.selection.years.push(option.value);
	process_selections();
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

function process_selections()
{
	recalculate_data();
	if (app.map.datalayer) app.map.datalayer.setStyle(map_style);
	if (app.map.selectionlayer) app.map.selectionlayer.setStyle(map_style_selected);
	refresh_table_view();
	refresh_statistics_view();
	refresh_barchart_view();
	refresh_legend();
}

function recalculate_data()
{
	app.data.processed = null;
	if (!app.selection.area_id) return;
	//console.log("theme in recalculate_data:", app.selection.theme);
	if (app.selection.theme === 'von') recalculate_data_von();
	else if (app.selection.theme === 'nach') recalculate_data_nach();
	else if (app.selection.theme === 'saldi') recalculate_data_saldi();
	recalculate_classification();
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
	for (let row of app.data.processed)
	{
		where_clause = create_where_clause(list_selection_for_sql(["fromid = ?", "toid = ?"]));
		row.fromname = app.data.featurename_mapping[row.fromid];
		let negative = alasql("SELECT sum(migrations) AS migrations from migrations " + where_clause + " GROUP BY toid", [row.toid, row.fromid])[0];
		row.migrations -= negative.migrations;
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
	app.data.geostats.setColors(chroma.scale('RdYlBu').colors(classcount));
	app.data.geostats.getClassQuantile(classcount);
	for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
}

function refresh_legend()
{
	const legend = document.getElementById("legend");
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