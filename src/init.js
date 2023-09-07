/*
	Controls the whole init-process of the application.

	# init() ← called directly from webpage in defer-script-block
	# init_datalist() ← callback after loading data/data.json with load_url from init()
	# init_datasetinfo() ← callback after loading data/${dataset}/info.json with load_url from init_datalist()
	# init_datasetloader() ← direct call from init_datasetinfo(), when *all* info.json are loaded
	# start() ← called after all other initialization is done
*/

function init()
{
	console.log("initialize!");
	init_map();
	init_db();
	load_url("data/data.json", null, init_datalist);
}

function init_db()
{
	alasql("CREATE TABLE migrations (fromid TEXT, toid TEXT, fromname TEXT, toname TEXT, year TEXT, migrations INT)");
}

function init_datalist()
{
	console.log("init_datalist: ", this);
	//console.log("status: ", this.status);
	//console.log("content: ", this.responseText);
	console.log("app: ", app);
	if (this.status !== 200) return;
	let datasets = JSON.parse(this.responseText);
	app.dataset_list = datasets;
	console.log("datasets: ", datasets);
	console.log("datasets.length: ", datasets.length);
	app.status.dataset_loads = datasets.length;
	console.log("loads: ", app.status.dataset_loads);
	for (const dataset of datasets)
	{
		let datasetinfo =
		{
			dir: dataset,
		}
		load_url("data/" + dataset + "/info.json", datasetinfo, init_datasetinfo);
	}
}

function init_datasetinfo()
{
	console.log("init_datasetinfo: ", this);
	//console.log("status: ", this.status);
	//console.log("content: ", this.responseText);
	if (this.status !== 200)
	{
		remove_item_from_list(app.dataset_list, this.appinfo.dir);
	}
	else
	{
		console.log("appinfo: ", this.appinfo);
		let dataset = JSON.parse(this.responseText);
		extract_migration_years(dataset);
		app.datasets[this.appinfo.dir] = dataset;
	}
	console.log("loads: ", app.status.dataset_loads);
	app.status.dataset_loads--;
	if (app.status.dataset_loads === 0)
	{
		init_datasetloader(app.dataset_list);
		start();
	}
}

function init_datasetloader(dataset_list)
{
	let dataset_mapping = create_dataset_mapping(dataset_list);
	app.dataset_mapping = dataset_mapping;
	//console.log("dataset_mapping", dataset_mapping);
	//console.log("selector-element: ", document.getElementById("dataset_selector"));
	let selection = document.getElementById("dataset_selector");
	add_select_options(selection, dataset_list, dataset_mapping);
}

function start()
{
	console.log("start!");
}