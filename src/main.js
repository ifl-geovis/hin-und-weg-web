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
		colorschemes:
		{
			orange:
			[
				["#fdae6b"],
				["#fee6ce", "#fdae6b"],
				["#fee6ce", "#fdae6b", "#e6550d"],
				["#feedde", "#fdbe85", "#fd8d3c", "#d94701"],
				["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
				["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#e6550d", "#a63603"],
				["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"],
				["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"],
				["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"]
			],
			"grün":
			[
				["#a1d99b"],
				["#e5f5e0", "#a1d99b"],
				["#e5f5e0", "#a1d99b", "#31a354"],
				["#edf8e9", "#bae4b3", "#74c476", "#238b45"],
				["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
				["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#006d2c"],
				["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
				["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
				["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"]
			],
			"rot":
			[
				["#fc9272"],
				["#fee0d2", "#fc9272"],
				["#fee0d2", "#fc9272", "#de2d26"],
				["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"],
				["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
				["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"],
				["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"],
				["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"],
				["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]
			],
			"blau":
			[
				["#9ecae1"],
				["#deebf7", "#9ecae1"],
				["#deebf7", "#9ecae1", "#3182bd"],
				["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5"],
				["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
				["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"],
				["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"],
				["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"],
				["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"]
			],
		},
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
	},
	view:
	{
		positions:
		{
			table_view:
			{
				x: 200,
				y: 200,
			},
			barchart_view:
			{
				x: 200,
				y: 200,
			},
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

function show_table(event)
{
	if (app.status.modal_dialog) return;
	console.log("show_table");
	process_selections();
	app.status.modal_dialog = true;
	let table_view = document.getElementById("table_view");
	table_view.style.display = "block";
}

function show_barchart(event)
{
	if (app.status.modal_dialog) return;
	console.log("show_barchart");
	process_selections();
	app.status.modal_dialog = true;
	let barchart_view = document.getElementById("barchart_view");
	barchart_view.style.display = "block";
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

function process_selections()
{
	recalculate_data();
	if (app.map.datalayer) app.map.datalayer.setStyle(map_style);
	if (app.map.selectionlayer) app.map.selectionlayer.setStyle(map_style_selected);
	refresh_table_view();
	refresh_barchart_view();
}

function recalculate_data()
{
	app.data.processed = null;
	if (!app.selection.area_id) return;
	//console.log("theme in recalculate_data:", app.selection.theme);
	if (app.selection.theme === 'von') recalculate_data_von();
	else if (app.selection.theme === 'nach') recalculate_data_nach();
	else if (app.selection.theme === 'saldi') recalculate_data_saldi();
}

function recalculate_data_von()
{
	app.data.processed = alasql("SELECT ? AS fromid, ? AS fromname, toid, sum(migrations) AS migrations from migrations WHERE fromid = ? GROUP BY toid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.toname = app.data.featurename_mapping[row.toid];
	}
}

function recalculate_data_nach()
{
	app.data.processed = alasql("SELECT ? AS toid, ? AS toname, fromid, sum(migrations) AS migrations from migrations WHERE toid = ? GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.fromname = app.data.featurename_mapping[row.fromid];
	}
}

function recalculate_data_saldi()
{
	app.data.processed = alasql("SELECT ? AS toid, ? AS toname, fromid, sum(migrations) AS migrations from migrations WHERE toid = ? GROUP BY fromid", [app.selection.area_id, app.data.featurename_mapping[app.selection.area_id], app.selection.area_id]);
	for (let row of app.data.processed)
	{
		row.fromname = app.data.featurename_mapping[row.fromid];
		let negative = alasql("SELECT sum(migrations) AS migrations from migrations WHERE fromid = ? AND toid = ? GROUP BY toid", [row.toid, row.fromid])[0];
		row.migrations -= negative.migrations;
	}
}

function close_view(event)
{
	app.status.modal_dialog = false;
	let viewcomponents = document.getElementsByClassName("viewcomponent");
	for (let view of viewcomponents) view.style.display = "none";
}

function move_start(event, viewid)
{
	app.status.dragstart_x = event.screenX;
	app.status.dragstart_y = event.screenY;
}

function move_stop(event, viewid)
{
	app.view.positions[viewid].x += event.screenX - app.status.dragstart_x;
	app.view.positions[viewid].y += event.screenY - app.status.dragstart_y;
	let view = document.getElementById(viewid);
	view.style.left = app.view.positions[viewid].x + "px";
	view.style.top = app.view.positions[viewid].y + "px";
}