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
	configuration:
	{
		colors:
		{
			"RdYlBu":
			{
				title: "Rot - Gelb - Blau",
				scale: "RdYlBu",
			},
			"Greys":
			{
				title: "Graustufen",
				scale: "Greys",
			},
			"red_scale":
			{
				title: "Orange - Rot",
				scale: ["orange", "red", "darkred"],
			},
			"green_scale":
			{
				title: "Grün",
				scale: [chroma("green").brighten(3), chroma("green").darken(3)],
			},
			"blue_scale":
			{
				title: "Blau",
				scale: [chroma("blue").brighten(2), chroma("blue").darken(2)],
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
		background_active: false,
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
		theme: 'von',
		data_interpretation: 'absolute',
		swoopy_arrows: false,
		labels: 'none',
		area_id: null,
		area_inside: true,
		filter:
		{
			min: 0,
			max: 0,
		},
		classification: 'quantile',
		class_number: 'automatic',
		class_number_negative: 'automatic',
		colors: 'RdYlBu',
		colors_negative: 'green_scale_negative',
		classborders: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		classborders_negative: [-10, -29 -8, -7, -6, -5, -4, -3, -2, -1],
		map_opacity: 0.5,
	},
	view:
	{
		positions:
		{
		},
		swoopy_arrows: [],
		load_indicator_state: -1,
		map_opacity_selected: 0.75,
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

function theme_selected(event)
{
	//console.log("theme_selected:", event.target.value);
	app.selection.theme = event.target.value;
	process_selections(true);
}

function labels_selected(event)
{
	//console.log("labels_selected:", event.target.value);
	app.selection.labels = event.target.value;
	show_geojson_layer();
}

function swoopy_arrows_changed(event)
{
	//console.log("swoopy_arrows_changed:", event.target.checked);
	app.selection.swoopy_arrows = event.target.checked;
	process_selections(false);
}

function data_interpretation_changed(event)
{
	//console.log("data_interpretation_changed:", event.target.checked);
	app.selection.data_interpretation = event.target.value;
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

function class_number_selected(event, positive)
{
	//console.log("class_number_selected:", event.target.value);
	if (positive) app.selection.class_number = event.target.value;
	else  app.selection.class_number_negative = event.target.value;
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
	//console.log("colors_changed:", event.target.checked);
	if (negative) app.selection.colors_negative = event.target.value;
	else app.selection.colors = event.target.value;
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

function process_selections(reset_filters)
{
	show_load_indicator("Daten werden prozessiert.");
	refresh_classification_message();
	recalculate_data(reset_filters);
	refresh_datalayer();
	refresh_title_years();
	refresh_swoopy_arrows();
	renew_filters(reset_filters);
	refresh_table_view();
	refresh_statistics_view();
	refresh_barchart_view();
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

function get_migration_select(direction)
{
	if (app.selection.data_interpretation === 'migration_rate') return 'ROUND(AVG(migration_rate_' + direction + '), 3) AS migrations';
	return 'SUM(migrations) AS migrations';
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
	data_von = alasql("SELECT toid, " + get_migration_select('from') + " from migrations " + where_clause + " GROUP BY toid", [app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.fromname = app.data.featurename_mapping[row.fromid];
		for (let negative of data_von)
		{
			if (negative.toid == row.fromid)
			{
				row.migrations -= negative.migrations;
				if (app.selection.data_interpretation === 'migration_rate') row.migrations = row.migrations.toFixed(3);
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

function process_filters(reset_filters)
{
	if (reset_filters) return;
	app.data.processed = [];
	if (app.selection.filter.min && (app.selection.filter.min != ""))
	{
		for (let row of app.data.unfiltered)
		{
			if (row.migrations < app.selection.filter.min) app.data.processed.push(row);
		}
	}
	if (app.selection.filter.max && (app.selection.filter.max != ""))
	{
		for (let row of app.data.unfiltered)
		{
			if (row.migrations >= app.selection.filter.max) app.data.processed.push(row);
		}
	}
	if ((!app.selection.filter.min) && (!app.selection.filter.max)) app.data.processed = app.data.unfiltered;
}

function recalculate_classification()
{
	app.data.geostats = null;
	app.data.geostats_positive = null;
	app.data.geostats_negative = null;
	if (!app.data.processed) return;
	let data = [];
	for (let row of app.data.processed) data.push(row.migrations);
	app.data.geostats = new geostats(data);
	if (recalculate_classification_saldi()) return;
	const classcount = calculate_classcount(app.data.processed.length, true);
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
	if (app.selection.classification === "own") return false;
	if (app.selection.theme != 'saldi') return false;
	const posneg = separate_processed();
	const positive = posneg[0];
	const negative = posneg[1];
	if ((negative.length === 0)) return false;
	if ((negative.length === 1) && (negative[0] === 0)) return false;
	app.data.geostats_positive = recalculate_saldi_geostats(positive, false);
	app.data.geostats_negative = recalculate_saldi_geostats(negative, true);
	for (let row of app.data.processed) row.color = get_color_for_value(row.migrations);
	return true;
}

function recalculate_saldi_geostats(processed, negative)
{
	const classcount = calculate_classcount(processed.length, !negative);
	let data = [];
	data.push(0);
	for (let row of processed) data.push(row.migrations);
	while (data.length < 2) data.push(0);
	let geostatsobj = new geostats(data);
	geostatsobj.setColors(chroma.scale(select_color((negative) ? app.selection.colors_negative : app.selection.colors)).colors(classcount));
	set_classification_algorithm(geostatsobj, classcount);
	return geostatsobj;
}

function set_classification_algorithm(geostats, classcount)
{
	try
	{
		if (app.selection.classification === "equidistant") geostats.getClassEqInterval(classcount);
		else if (app.selection.classification === "stddeviation") geostats.getClassStdDeviation(classcount);
		else if (app.selection.classification === "arithmetic_progression") geostats.getClassArithmeticProgression(classcount);
		else if (app.selection.classification === "geometric_progression") geostats.getClassGeometricProgression(classcount);
		else if (app.selection.classification === "quantile") geostats.getClassQuantile(classcount);
		else if (app.selection.classification === "jenks") geostats.getClassJenks(classcount);
		else if (app.selection.classification === "own") geostats.setClassManually(generate_classification_array(classcount));
		else geostats.getClassQuantile(classcount);
		}
		catch (e)
		{
			console.log("error:", e);
			const classification_message = document.getElementById("classification_message");
			classification_message.innerHTML = "Es gab einen Fehler bei der Verarbeitung der Klassifikationseinstellungen. Klassifikation wurde auf eine sichere Einstellung zurückgesetzt.";
			classification_message.style.display = "block";
			app.selection.classification = "equidistant";
			geostats.getClassEqInterval(classcount);
			const classification_selector = document.getElementById("classification_selector");
			classification_selector.value = "equidistant";
		}
}

function generate_classification_array(classcount)
{
	let classification = [];
	classification.push(app.data.geostats.min());
	for (let i = 0; i < (classcount - 1); i++)
	{
		classification.push(app.selection.classborders[i]);
	}
	classification.push(app.data.geostats.max());
	//console.log("generate_classification_array: " + classification);
	return classification;
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
	if (app.data.geostats_negative) legend_content.innerHTML = app.data.geostats_negative.getHtmlLegend() + app.data.geostats_positive.getHtmlLegend();
	else legend_content.innerHTML = app.data.geostats_positive.getHtmlLegend();
	legend.style.display = "block";
}

function refresh_classification_message()
{
	const classification_message = document.getElementById("classification_message");
	classification_message.style.display = "none";
	if (app.selection.classification === "own")
	{
		classification_message.innerHTML = "Hinweis: Bei eigener Klassifikation werden die Werte unten berücksichtigt, aber nur bis zur Anzahl der Klassen. Auch wenn negative Werte präsent sind wird bei eigener Klassifikation nur eine Farbskala gesetzt, man kann hier selbst den Null-Wert beeinflussen.";
		classification_message.style.display = "block";
	}
}

function refresh_settings_dialog()
{
	const classborder_selection_section = document.getElementById("classborder_selection_section");
	classborder_selection_section.style.display = (app.selection.classification === "own") ? "block" : "none";
	const colors_negative_section = document.getElementById("colors_negative_section");
	colors_negative_section.style.display = "none";
	if ((app.selection.theme === "saldi") && (app.selection.classification != "own")) colors_negative_section.style.display = "block";
	const class_number_negative_section = document.getElementById("class_number_negative_section");
	class_number_negative_section.style.display = "none";
	if ((app.selection.theme === "saldi") && (app.selection.classification != "own")) class_number_negative_section.style.display = "block";
}

function close_view(event, viewid)
{
	app.status.modal_dialog = false;
	app.status.viewcomponent = null;
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