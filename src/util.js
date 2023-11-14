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
	let count = parseInt(app.selection.class_number, 10);
	if (!isNaN(count)) return count;
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
	for (let row of app.data.unfiltered)
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

function select_color(id)
{
	if (id === 'yellow_red_black') return ['yellow', 'red', 'black'];
	return id;
}

function keep_load_indicator()
{
	let load_indicator = document.getElementById("load_indicator");
	if (!app.status.loading)
	{
		load_indicator.style.display = "none";
		return;
	}
	load_indicator.style.display = "block";
	let indicators = document.getElementsByClassName("load_inidicator_block");
	for (let i = 0; i < indicators.length; i++) highlight_load_indicator(i, indicators[i]);
	app.view.load_indicator_state++;
	if (app.view.load_indicator_state > 15) app.view.load_indicator_state = 0;
	setTimeout(keep_load_indicator, 150);
}

function highlight_load_indicator(index, indicator)
{
	if (index === app.view.load_indicator_state) indicator.style.backgroundColor = "#000000cc";
	else if ((index + 1) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000099";
	else if ((index + 2) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000066";
	else if ((index + 3) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000033";
	else indicator.style.backgroundColor = "#00000000";
}

function show_load_indicator(message)
{
	let load_indicator_message = document.getElementById("load_indicator_message");
	load_indicator_message.innerHTML = message;
	app.status.loading = true;
	app.view.load_indicator_state = -1;
	setTimeout(keep_load_indicator, 500);
}