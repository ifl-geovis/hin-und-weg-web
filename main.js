let app =
{
	map: null,
	maplayer: null,
	status:
	{
		dataset_loads: 0,
		dataset_loaded: false,
		modal_dialog: true,
	},
	dataset_list: [],
	datasets:
	{
	},
	selected_dataset_id: null,
	selected_dataset: null,
	selected_category_id: null,
	selected_category: null
};

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
	console.log("document.styleSheets: ", document.styleSheets);
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
	let info = {};
	load_url("data/" + app.selected_dataset_id + "/" + app.selected_dataset.geodata, info, load_geodata);
	update_element_visibility();
	app.status.modal_dialog = false;
}

function dataset_load(event)
{
	if (app.status.modal_dialog) return;
	console.log("dataset_load");
	app.status.modal_dialog = true;
	let dataset_dialog = document.getElementById("datasetloader_dialog");
	dataset_dialog.style.display = "block";
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

function parsed_csv(results, file)
{
	console.log("results: ", results);
	console.log("file: ", file);
}

function remove_item_from_list(list, item)
{
	let index = list.indexOf(item);
	if (index !== -1)
	{
		list.splice(index, 1);
	}
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

function show_table(event)
{
	if (app.status.modal_dialog) return;
	console.log("show_table");
}

function load_geodata()
{
	console.log("load_geodata: ", this);
	//console.log("status: ", this.status);
	//console.log("content: ", this.responseText);
	if (this.status === 200)
	{
		app.geodata = JSON.parse(this.responseText);
	}
}