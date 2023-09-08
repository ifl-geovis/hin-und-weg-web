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
	},
	selection:
	{
		dataset_id: null,
		dataset: null,
		category_id: null,
		category: null,
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
}