// dataset loading

function update_element_visibility()
{
	let category_selector = document.getElementById("category_selector");
	if (app.selection.dataset_id)
	{
		category_selector.disabled = false;
	}
	else
	{
		category_selector.disabled = true;
	}
	let load_dataset_button = document.getElementById("load_dataset_button");
	if (app.selection.dataset_id && app.selection.category_id)
	{
		load_dataset_button.disabled = false;
	}
	else
	{
		load_dataset_button.disabled = true;
	}
	if (app.selection.dataset_id) document.getElementById("dataset_name_value").value = app.data.dataset_mapping[app.selection.dataset_id];
	if (app.selection.category_id) document.getElementById("category_name_value").value = app.data.category_mapping[app.selection.category_id];
}

function dataset_selected(event)
{
	console.log("dataset_selected:", event.target.value);
	app.selection.dataset_id = event.target.value;
	app.selection.dataset = app.datasets[app.selection.dataset_id];
	let selection = document.getElementById("category_selector");
	//console.log("selection:", selection);
	remove_select_options(selection);
	if (app.selection.dataset_id)
	{
		app.data.category_mapping = create_category_mapping(app.selection.dataset.categories);
		//console.log("app.data.category_mapping:", app.data.category_mapping);
		let category_list = Object.keys(app.data.category_mapping);
		//console.log("category_list:", category_list);
		add_select_options(selection, category_list, app.data.category_mapping);
	}
	update_element_visibility();
}

function category_selected(event)
{
	console.log("category_selected:", event.target.value);
	app.selection.category_id = event.target.value;
	app.selection.category = select_category(app.selection.category_id, app.selection.dataset.categories);
	update_element_visibility();
}

function load_dataset(event)
{
	console.log("load_dataset");
	let dataset_dialog = document.getElementById("datasetloader_dialog");
	dataset_dialog.style.display = "none";
	console.log("app.selection.dataset_id:", app.selection.dataset_id);
	console.log("app.selection.category_id:", app.selection.category_id);
	show_load_indicator("Daten werden geladen.");
	alasql("DELETE FROM migrations");
	let info = {};
	load_url("data/" + app.selection.dataset_id + "/" + app.selection.dataset.geodata, info, load_geodata);
	update_element_visibility();
	app.status.modal_dialog = false;
}

function create_dataset_mapping(dataset_list)
{
	let mapping = {};
	for (let datasetid of dataset_list)
	{
		mapping[datasetid] = app.datasets[datasetid].name;
	}
	return mapping;
}

function create_category_mapping(categorylist)
{
	let mapping = {};
	for (let category of categorylist)
	{
		mapping[category.id] = category.name;
	}
	return mapping;
}

function select_category(id, categories)
{
	for (let category of categories)
	{
		if (category.id === id) return category;
	}
	return null;
}

function load_geodata()
{
	console.log("load_geodata:", this);
	//console.log("status:", this.status);
	//console.log("content:", this.responseText);
	if (this.status === 200)
	{
		app.data.geodata = JSON.parse(this.responseText);
		show_geojson_layer();
		create_centroid_mapping();
		create_featurename_mapping();
		renew_area_selection();
		remove_swoopy_arrows();
	}
	for (let year of app.selection.category.years)
	{
		app.status.migrations_loads++;
		const config =
		{
			complete: load_migration_csv,
			download: true,
			skipEmptyLines: true,
		}
		Papa.parse("data/" + app.selection.dataset_id + "/" + app.selection.category.migrations[year] + "?year=" + year, config);
	}
}

function create_featurename_mapping()
{
	app.data.featurename_mapping = {};
	if (!app.data.geodata) return;
	let idprop = app.selection.dataset.id_property;
	let nameprop = app.selection.dataset.name_property;
	if (!idprop || !nameprop) return;
	for (let feature of app.data.geodata.features)
	{
		let id = feature.properties[idprop];
		let name = feature.properties[nameprop];
		if (id && name) app.data.featurename_mapping[id] = name;
	}
}

function create_centroid_mapping()
{
	app.data.centroid_mapping = {};
	if (!app.data.geodata) return;
	let idprop = app.selection.dataset.id_property;
	for (let feature of app.data.geodata.features)
	{
		let id = feature.properties[idprop];
		let centroid = turf.centerOfMass(feature);
		if (centroid && centroid.geometry && centroid.geometry.coordinates) app.data.centroid_mapping[id] = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
	}
}

function load_migration_csv(results, file)
{
	//console.log("load_migration_csv");
	//console.log("results:", results);
	//console.log("file:", file);
	//console.log("filematcher:", /^.*year=([01-9]+)$/.exec(file));
	let year = /^.*year=([01-9]+)$/.exec(file)[1];
	if (year)
	{
		app.data.migrations[year] = results;
		let headers = results.data[2];
		for (let row = 3; row < results.data.length; row++)
		{
			for (let col = 1; col < results.data[row].length; col++)
			{
				let fromid = results.data[row][0];
				let toid = headers[col];
				let from = app.data.featurename_mapping[fromid];
				let to = app.data.featurename_mapping[toid];
				let value = parseInt(results.data[row][col], 10);
				alasql("INSERT INTO migrations (fromid, toid, fromname, toname, year, migrations) VALUES (?, ?, ?, ?, ?, ?)", [fromid, toid, from, to, year, value]);
			}
		}
	}
	renew_year_selection();
	app.status.migrations_loads--;
	if (app.status.migrations_loads === 0) load_completed();
}

function load_completed()
{
	//console.log('dataset_load completed');
	let selectors = document.getElementsByClassName("selector");
	for (let selector of selectors) selector.disabled = false;
	let dataset_title = document.getElementById("dataset_title");
	if (app.selection.dataset.name) dataset_title.innerHTML = app.selection.dataset.name;
	if (app.selection.dataset.title) dataset_title.innerHTML = app.selection.dataset.title;
	let year_selector = document.getElementById("year_selector");
	year_selector.size = 10;
	if (app.selection.years && (app.selection.years.length > 0) && (app.selection.years.length < 10)) year_selector.size = app.selection.years.length;
	const legend = document.getElementById("legend_view");
	legend.style.display = "none";
	app.status.loading = false;
}