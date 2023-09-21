/*
app is the general data holder for the applciation

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
	map: null,
	maplayer: null,
	status:
	{
		dataset_loads: 0,
		migrations_loads: 0,
		dataset_loaded: false,
		modal_dialog: true,
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

function theme_selected(event)
{
	//console.log("theme_selected: ", event.target.value);
	app.selection.theme = event.target.value;
	process_selections();
}

function area_selected(event)
{
	//console.log("area_selected: ", event.target.value);
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
	refresh_table_view();
}

function recalculate_data()
{
	app.data.processed = null;
	if (!app.selection.area_id) return;
	console.log("theme in recalculate_data: ", app.selection.theme);
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

function refresh_table_view()
{
	console.log("refresh_table_view");
	console.log("app.data.processed: ", app.data.processed);
	let table_view_data = document.getElementById("table_view_data");
	if (!app.data.processed)
	{
		table_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let dataview = `
	<table>
	<tr class="header">
		<th>Von</th>
		<th>Nach</th>
		<th>Anzahl</th>
	</tr>`;
	let odd = true;
	for (let row of app.data.processed)
	{
		if (odd) dataview += '<tr class="odd">';
		else dataview += '<tr class="even">';
		dataview += "<td>" + row.fromname + "</td>";
		dataview += "<td>" + row.toname + "</td>";
		dataview += '<td class="number">' + row.migrations + "</td>";
		dataview += "</tr>";
		odd = !odd;
	}
	dataview += "</table>";
	table_view_data.innerHTML = dataview;
}

function close_table_view(event)
{
	app.status.modal_dialog = false;
	table_view.style.display = "none";
}