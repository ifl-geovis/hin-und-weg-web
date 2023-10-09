// utility functions

/*
function for loading a url
	param url: url to load (can be relative)
	param info: info object added to the request so that the callback can access it
	param listener: callback function
*/
function load_url(url, info, listener)
{
	console.log("load_url: ", url);
	let xhr = new XMLHttpRequest();
	xhr.appinfo = info;
	xhr.addEventListener("load", listener);
	xhr.open("GET", url);
	xhr.send();
}

function extract_migration_years(dataset)
{
	console.log("extract_migration_years: ", dataset);
	for (let category of dataset.categories)
	{
		let years = [];
		for (let year in category.migrations)
		{
			years.push(year);
		}
		category.years = years;
	}
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
	while (select.lastElementChild && select.lastElementChild.value)
	{
		//console.log(select.lastElementChild.value);
		select.lastElementChild.remove();
	}
}

function add_select_options_year(select, list)
{
	for (let year of list)
	{
		let option = document.createElement("option");
		option.value = "" + year;
		option.text = "Jahr: " + year;
		option.selected = true;
		option.classList.add("year_option");
		select.add(option);
	}
}

function calculate_classcount(choices)
{
	if (!choices) return 1;
	if (choices < 1) return 1;
	const classcount = Math.round(Math.sqrt(choices));
	if (classcount < 1) return 1;
	if (classcount > 9) return 9;
	return classcount;
}

function get_color_for_value(value)
{
	if (!app.data.geostats) return "white";
	return app.data.geostats.colors[app.data.geostats.getClass(value)];
}

function get_color_for_feature_id(feature_id)
{
	if (!app.data.processed) return "white";
	for (let row of app.data.processed)
	{
		if (row.id === feature_id) return row.color;
	}
	return "white";
}

function get_feature_by_id(feature_id)
{
	if (!app.data.processed) return null;
	for (let row of app.data.processed)
	{
		if (row.id === feature_id) return row;
	}
	return null;
}