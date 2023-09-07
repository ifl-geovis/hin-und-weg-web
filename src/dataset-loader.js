// dataset loading

function update_element_visibility()
{
	let category_selector = document.getElementById("category_selector");
	if (app.selected_dataset_id)
	{
		category_selector.disabled = false;
	}
	else
	{
		category_selector.disabled = true;
	}
	let load_dataset_button = document.getElementById("load_dataset_button");
	if (app.selected_dataset_id && app.selected_category_id)
	{
		load_dataset_button.disabled = false;
	}
	else
	{
		load_dataset_button.disabled = true;
	}
	if (app.selected_dataset_id) document.getElementById("dataset_name_value").innerHTML = app.dataset_mapping[app.selected_dataset_id];
	if (app.selected_category_id) document.getElementById("category_name_value").innerHTML = app.category_mapping[app.selected_category_id];
}

function dataset_selected(event)
{
	console.log("dataset_selected: ", event.target.value);
	app.selected_dataset_id = event.target.value;
	app.selected_dataset = app.datasets[app.selected_dataset_id];
	let selection = document.getElementById("category_selector");
	//console.log("selection:", selection);
	remove_select_options(selection);
	if (app.selected_dataset_id)
	{
		let category_mapping = create_category_mapping(app.selected_dataset.categories);
		app.category_mapping = category_mapping;
		//console.log("category_mapping", category_mapping);
		let category_list = Object.keys(category_mapping);
		//console.log("category_list", category_list);
		add_select_options(selection, category_list, category_mapping);
	}
	update_element_visibility();
}

function category_selected(event)
{
	console.log("category_selected: ", event.target.value);
	app.selected_category_id = event.target.value;
	app.selected_category = select_category(app.selected_category_id, app.selected_dataset.categories);
	update_element_visibility();
}

function load_dataset(event)
{
	console.log("load_dataset");
	let dataset_dialog = document.getElementById("datasetloader_dialog");
	dataset_dialog.style.display = "none";
	console.log("app.selected_dataset_id: ", app.selected_dataset_id);
	console.log("app.selected_category_id: ", app.selected_category_id);
	alasql("DELETE FROM migrations");
	let info = {};
	load_url("data/" + app.selected_dataset_id + "/" + app.selected_dataset.geodata, info, load_geodata);
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

function add_select_options(select, list, mapping)
{
	for (let id of list)
	{
		let option = document.createElement("option");
		option.value = id;
		option.text = mapping[id];
		select.add(option);
	}
}

function remove_select_options(select)
{
	while (select.lastElementChild.value)
	{
		//console.log(select.lastElementChild.value);
		select.lastElementChild.remove();
	}
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
	console.log("load_geodata: ", this);
	//console.log("status: ", this.status);
	//console.log("content: ", this.responseText);
	if (this.status === 200)
	{
		app.data.geodata = JSON.parse(this.responseText);
		show_geojson_layer();
		create_featurename_mapping();
	}
	for (let year of app.selected_category.years)
	{
		app.status.migrations_loads++;
		const config =
		{
			complete: load_migration_csv,
			download: true,
			skipEmptyLines: true,
		}
		Papa.parse("data/" + app.selected_dataset_id + "/" + app.selected_category.migrations[year] + "?year=" + year, config);
	}
}

function create_featurename_mapping()
{
	if (!app.data.geodata)
	{
		app.data.featurename_mapping = {};
		return;
	}
	let idprop = app.selected_dataset.id_property;
	let nameprop = app.selected_dataset.name_property;
	for (let feature of app.data.geodata.features)
	{
		let id = feature.properties[idprop];
		let name = feature.properties[nameprop];
		if (id && name) app.data.featurename_mapping[id] = name;
	}
}

function load_migration_csv(results, file)
{
	//console.log("load_migration_csv");
	//console.log("results: ", results);
	//console.log("file: ", file);
	//console.log("filematcher: ", /^.*year=([01-9]+)$/.exec(file));
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
	app.status.migrations_loads--;
}