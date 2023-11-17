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
	init_selections();
	init_map();
	init_view();
	init_db();
	init_color_gradients();
	load_url("data/data.json", null, init_datalist);
}

function init_selections()
{
	let selectors = document.getElementsByClassName("selector");
	for (let selector of selectors) selector.disabled = true;
	let filters = document.getElementsByClassName("filter");
	for (let filter of filters) filter.disabled = true;
	let swoopy_arrows_selector = document.getElementById("swoopy_arrows_selector");
	swoopy_arrows_selector.checked = false;
	let area_inside = document.getElementById("area_inside_selector");
	area_inside.checked = true;
	let category = document.getElementById("category_selector");
	category.disabled = true;
	let load_dataset = document.getElementById("load_dataset_button");
	load_dataset.disabled = true;
}

function init_view()
{
	let viewcomponents = document.getElementsByClassName("viewcomponent");
	for (let viewcomponent of viewcomponents)
	{
		let initialview =
		{
			x: 200,
			y: 100,
		};
		app.view.positions[viewcomponent.id] = initialview;
	}
	app.view.positions.legend_view =
	{
		x: 50,
		y: 30,
	};
}

function init_db()
{
	alasql("CREATE TABLE migrations (fromid TEXT, toid TEXT, fromname TEXT, toname TEXT, year TEXT, migrations INT)");
	alasql("CREATE TABLE population (areaid TEXT, year TEXT, population INT)");
}

function init_datalist()
{
	console.log("init_datalist:", this);
	//console.log("status:", this.status);
	//console.log("content:", this.responseText);
	console.log("app:", app);
	if (this.status !== 200) return;
	let datasets = JSON.parse(this.responseText);
	app.dataset_list = datasets;
	console.log("datasets:", datasets);
	console.log("datasets.length:", datasets.length);
	app.status.dataset_loads = datasets.length;
	console.log("loads:", app.status.dataset_loads);
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
	console.log("init_datasetinfo:", this);
	//console.log("status:", this.status);
	//console.log("content:", this.responseText);
	if (this.status !== 200)
	{
		remove_item_from_list(app.dataset_list, this.appinfo.dir);
	}
	else
	{
		console.log("appinfo:", this.appinfo);
		let dataset = JSON.parse(this.responseText);
		extract_migration_years(dataset);
		app.datasets[this.appinfo.dir] = dataset;
	}
	console.log("loads:", app.status.dataset_loads);
	app.status.dataset_loads--;
	if (app.status.dataset_loads === 0)
	{
		init_datasetloader(app.dataset_list);
		start();
	}
}

function init_datasetloader(dataset_list)
{
	app.data.dataset_mapping = create_dataset_mapping(dataset_list);
	//console.log("app.data.dataset_mapping:", app.data.dataset_mapping);
	//console.log("selector-element:", document.getElementById("dataset_selector"));
	let selection = document.getElementById("dataset_selector");
	add_select_options(selection, dataset_list, app.data.dataset_mapping);
}

function init_color_gradients()
{
	let gradients = document.getElementsByClassName("color_gradient");
	for (let gradient of gradients)
	{
		const domain = 100;
		const step = 1.0 / domain;
		let scale = chroma.scale(select_color(gradient.id));
		let html = '';
		for (let i = 0; i < domain; i++)
		{
			html += '<div class="gradient_color" style="background-color: ' + scale(i * step) + ';"></div>';
		}
		gradient.innerHTML = html;
	}
}

function start()
{
	console.log("start!");
}