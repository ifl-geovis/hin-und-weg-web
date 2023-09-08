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
	app.status.modal_dialog = true;
	recalculate_data();
	let table_view = document.getElementById("table_view");
	table_view.style.display = "block";
}

function area_selected(event)
{
	//console.log("area_selected: ", event.target.value);
	app.selection.area_id = event.target.value;
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

function recalculate_data()
{
	app.data.processed = null;
	if (!app.selection.area_id) return;
	app.data.processed = alasql("SELECT toid, sum(migrations) from migrations WHERE fromid = ? GROUP BY toid", [app.selection.area_id]);
}