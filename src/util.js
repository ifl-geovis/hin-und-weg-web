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


function hide_load_indicator() {
    let load_indicator = document.getElementById("load_indicator");
    load_indicator.style.display = "none";
    app.status.loading = false;
}

function extract_migration_years(dataset)
{
	//console.log("extract_migration_years: ", dataset);
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

function add_select_options_year(select, list) {
    for (let year of list) {
        let option = document.createElement("option");
        option.value = "" + year;
        option.text = "Jahr: " + year;
        option.classList.add("year_option");
        select.add(option);
    }
}


function calculate_classcount(choices, positive)
{
	let count = parseInt(((positive) ? app.selection.class_number : app.selection.class_number_negative), 10);
	if (!isNaN(count)) return count;
	if (!choices) return 1;
	if (choices < 1) return 1;
	const classcount = Math.round(Math.sqrt(choices));
	if (classcount < 1) return 1;
	if (classcount > 9) return 9;
	return classcount;
}

function get_color_for_value(value) {
    // Check for missing data
    if (value === null || value === undefined) {
        return "grey"; // Grey for areas without data
    }
    
    // Check for zero value
    if (value === 0) {
        return "white"; // White for areas with zero value
    }
    
    // Default behavior for other values
    if (!app.data.geostats) return "white";
    if ((app.data.geostats_negative) && (value < 0)) return app.data.geostats_negative.colors[app.data.geostats_negative.getClass(value)];
    return app.data.geostats_positive.colors[app.data.geostats_positive.getClass(value)];
}



function get_color_for_feature_id(feature_id) {
    if (!app.data.processed) return "white";
    for (let row of app.data.unfiltered) {
        if (row.id === feature_id) return row.color;
    }
    return "white";
}


function get_feature_by_id(feature_id, filtered)
{
	const data = (filtered) ? app.data.processed : app.data.unfiltered;
	if (!data) return null;
	for (let row of data)
	{
		if (row.id === feature_id) return row;
	}
	return null;
}

function create_color_scale_selection(colorscale, negative, first)
{
	let id = (negative) ? colorscale + "_negative" : colorscale;
	let name = (negative) ? "colors_negative" : "colors";
	let color_scale = '';
	if (!first) color_scale += '<br />';
	let checked = "";
	if (negative && (id === app.selection.colors_negative)) checked = " checked";
	if (!negative && (id === app.selection.colors)) checked = " checked";
	color_scale += '<input type="radio" id="radio_' + id + '" class="selector" name="' + name + '" value="' + id + '" onchange="colors_changed(event, ' + negative + ')"' + checked + ' />';
	color_scale += '<div class="color_gradient" id="' + id + '"></div>';
	color_scale += '<label for="radio_' + id + '"> ' + app.configuration.colors[colorscale].title + '</label>';
	return color_scale;
}

function is_negative_color(id)
{
	if (id.endsWith("_negative")) return true;
	if (id.startsWith("neg_")) return true;
	return false;
}

function select_color(id)
{
	if (id.endsWith("_negative")) return reverse_colors(select_color(id.substring(0, id.length - 9)));
	if (id.startsWith("neg_")) return reverse_colors(select_color(id.substring(4)));
	if (id === 'yellow_red_black') return ['yellow', 'red', 'black'];
	if (app.configuration.colors[id]) return app.configuration.colors[id].scale;
	return chroma.brewer[id];
}

function reverse_colors(colors)
{
	if (!(colors instanceof Array)) return colors;
	let reversed = [];
	for (let i = colors.length - 1; i >= 0; i--)
	{
		reversed.push(colors[i]);
	}
	return reversed;
}
function hide_load_indicator() {
    let load_indicator = document.getElementById("load_indicator");
    load_indicator.style.display = "none";
    app.status.loading = false;
}

function show_load_indicator(message) {
    let load_indicator_message = document.getElementById("load_indicator_message");
    load_indicator_message.innerHTML = message;
    app.status.loading = true;
    app.view.load_indicator_state = -1;
    setTimeout(keep_load_indicator, 500);
}

function keep_load_indicator() {
    let load_indicator = document.getElementById("load_indicator");
    if (!app.status.loading) {
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

function highlight_load_indicator(index, indicator) {
    if (index === app.view.load_indicator_state) indicator.style.backgroundColor = "#000000cc";
    else if ((index + 1) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000099";
    else if ((index + 2) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000066";
    else if ((index + 3) === app.view.load_indicator_state) indicator.style.backgroundColor = "#00000033";
    else indicator.style.backgroundColor = "#00000000";
}
