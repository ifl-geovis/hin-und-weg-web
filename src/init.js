function init()
{
	console.log("initialize!");
	init_color_settings();
	init_values();
	init_selections();
	init_map();
	init_view();
	init_db();
	init_color_gradients();
	load_url("data/data.json", null, init_datalist);
}

function init_color_settings()
{
	let color_settings_positive = "";
	let color_settings_negative = "";
	let first = true;
	for (let colorscale in app.configuration.colors)
	{
		color_settings_positive += create_color_scale_selection(colorscale, false, first);
		color_settings_negative += create_color_scale_selection(colorscale, true, first);
		first = false;
	}
	let colors_positive_selections = document.getElementById("colors_positive_selections");
	colors_positive_selections.innerHTML = color_settings_positive;
	let colors_negative_selections = document.getElementById("colors_negative_selections");
	colors_negative_selections.innerHTML = color_settings_negative;
}

function init_values() {
    app.selection.filter.min = 0;
    app.selection.filter.max = 0;
}


function init_selections() {
    let selectors = document.getElementsByClassName("selector");
    for (let selector of selectors) selector.disabled = true;
    let filters = document.getElementsByClassName("filter");
    for (let filter of filters) filter.disabled = true;
    let swoopy_arrows_selector = document.getElementById("swoopy_arrows_selector");
    swoopy_arrows_selector.checked = false;
    let label_selector = document.getElementById("label_selector");
    label_selector.value = app.selection.labels;
    let area_inside = document.getElementById("area_inside_selector");
    area_inside.checked = true;
    let category = document.getElementById("category_selector");
    category.disabled = true;
    let load_dataset = document.getElementById("load_dataset_button");
    load_dataset.disabled = true;
    let classification_selector = document.getElementById("classification_selector");
    classification_selector.value = app.selection.classification;
    let theme_selector = document.getElementById("theme_selector");
    theme_selector.value = app.selection.theme;
    let radio_red_scale = document.getElementById("radio_" + app.selection.colors);
    radio_red_scale.checked = true;
    let radio_blue_scale_negative = document.getElementById("radio_" + app.selection.colors_negative);
    radio_blue_scale_negative.checked = true;
    for (let i = 1; i <= 10; i++) {
        let classborder = document.getElementById("classborder" + i + "_selector");
        classborder.value = i;
    }

    // Ensure the newest year is selected
    if (app.selection.category && app.selection.category.years) {
        let newestYear = Math.max(...app.selection.category.years);
        app.selection.years = [newestYear.toString()];
    }
	
    update_filter_visibility(); // Call this function to set initial filter visibility
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

function init_db() {
    // Changed migrations column from INT to FLOAT so that null values (i.e. missing data)
    // are preserved instead of being automatically converted to 0.
    alasql("CREATE TABLE migrations (fromid TEXT, toid TEXT, fromname TEXT, toname TEXT, year TEXT, migrations FLOAT, population_from INT, population_to INT, migration_rate_from FLOAT, migration_rate_to FLOAT)");
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
	//console.log("init_datasetinfo:", this);
	//console.log("status:", this.status);
	//console.log("content:", this.responseText);
	if (this.status !== 200)
	{
		remove_item_from_list(app.dataset_list, this.appinfo.dir);
	}
	else
	{
		//console.log("appinfo:", this.appinfo);
		let dataset = JSON.parse(this.responseText);
		extract_migration_years(dataset);
		app.datasets[this.appinfo.dir] = dataset;
	}
	//console.log("loads:", app.status.dataset_loads);
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