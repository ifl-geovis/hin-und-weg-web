
function update_element_visibility() {
    let category_selector = document.getElementById("category_selector");
    if (app.selection.dataset_id) {
        category_selector.disabled = false;
    } else {
        category_selector.disabled = true;
    }
    let load_dataset_button = document.getElementById("load_dataset_button");
    if (app.selection.dataset_id && app.selection.category_id) {
        load_dataset_button.disabled = false;
    } else {
        load_dataset_button.disabled = true;
    }
    if (app.selection.dataset_id) document.getElementById("dataset_name_value").value = app.data.dataset_mapping[app.selection.dataset_id];
    if (app.selection.category_id) document.getElementById("category_name_value").value = app.data.category_mapping[app.selection.category_id];
}

function dataset_selected(event) {
    console.log("dataset_selected:", event.target.value);
    app.selection.dataset_id = event.target.value;
    app.selection.dataset = app.datasets[app.selection.dataset_id];
    let selection = document.getElementById("category_selector");
    remove_select_options(selection);
    if (app.selection.dataset_id) {
        app.data.category_mapping = create_category_mapping(app.selection.dataset.categories);
        let category_list = Object.keys(app.data.category_mapping);
        add_select_options(selection, category_list, app.data.category_mapping);
    }
    update_element_visibility();
    process_selections(false); // Reapply filters
    document.title = app.selection.dataset.name || app.selection.dataset.title || "hin&weg web"; // Update the document title
}


function category_selected(event) {
    console.log("category_selected:", event.target.value);
    app.selection.category_id = event.target.value;
    app.selection.category = select_category(app.selection.category_id, app.selection.dataset.categories);
    update_element_visibility();
    process_selections(false); // Reapply filters
}


function load_dataset(event) {
    console.log("load_dataset");
    let dataset_dialog = document.getElementById("datasetloader_dialog");
    dataset_dialog.style.display = "none";
    console.log("app.selection.dataset_id:", app.selection.dataset_id);
    console.log("app.selection.category_id:", app.selection.category_id);
    show_load_indicator("Daten werden geladen.");
    alasql("DELETE FROM migrations");
    alasql("DELETE FROM population");
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
	//console.log("load_geodata:", this);
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
	app.data.population = null;
	if (app.selection.category.population)
	{
		app.status.migrations_loads++;
		const popconfig =
		{
			complete: load_population_csv,
			download: true,
			skipEmptyLines: true,
		}
		Papa.parse("data/" + app.selection.dataset_id + "/" + app.selection.category.population, popconfig);
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


function load_migration_csv(results, file) {
    let year = /^.*year=([01-9]+)$/.exec(file)[1];
    if (year) {
        app.data.migrations[year] = results;
        let headers = results.data[2];
        for (let row = 3; row < results.data.length; row++) {
            for (let col = 1; col < results.data[row].length; col++) {
                let fromid = results.data[row][0];
                let toid = headers[col];
                let from = app.data.featurename_mapping[fromid];
                let to = app.data.featurename_mapping[toid];
                // CHANGE THIS PART:
// Handle missing values: trim any whitespace and treat '' or '.' as missing
let rawValue = results.data[row][col];
let valueStr = (rawValue !== null && rawValue !== undefined) ? rawValue.toString().trim() : "";
if (valueStr === 'x' || valueStr === '' || valueStr === '.') {
    value = null;  // Set missing values to null
} else {
    value = parseInt(valueStr, 10);
    if (isNaN(value)) {
        value = null;
    }
}
                alasql("INSERT INTO migrations (fromid, toid, fromname, toname, year, migrations) VALUES (?, ?, ?, ?, ?, ?)", [fromid, toid, from, to, year, value]);
            }
        }
    }
    // REMOVE this line: renew_year_selection();
    
    app.status.migrations_loads--;
    if (app.status.migrations_loads === 0) load_completed();
}




function load_population_csv(results, file) {
    app.data.population = results;
    let headers = results.data[2];
    for (let row = 3; row < results.data.length; row++) {
        for (let col = 1; col < results.data[row].length; col++) {
            let areaid = results.data[row][0];
            let year = headers[col];
            // CHANGE THIS PART:
            // Handle missing values: blank cells or cells containing "."
            let value = results.data[row][col];
            if (value === 'x' || value === '' || value === '.' || value === undefined) {
                value = null;  // Set explicitly to null for missing values
            } else {
                value = parseInt(value, 10);
                if (isNaN(value)) {
                    value = null;  // Also handle non-numeric values as null
                }
            }
            alasql("INSERT INTO population (areaid, year, population) VALUES (?, ?, ?)", [areaid, year, value]);
        }
    }
    app.status.migrations_loads--;
    if (app.status.migrations_loads === 0) load_completed();
}


function load_completed() {
    // ADD THIS LINE: Make sure year selection is updated before processing
    renew_year_selection();
    
    let selectors = document.getElementsByClassName("selector");
    for (let selector of selectors) selector.disabled = false;
    let dataset_title = document.getElementById("dataset_title");
    if (app.selection.dataset.name) dataset_title.innerHTML = app.selection.dataset.name;
    if (app.selection.dataset.title) dataset_title.innerHTML = app.selection.dataset.title;
    if (app.selection.years) refresh_title_years();
    let label_selector = document.getElementById("label_selector");
    label_selector.value = 'none';
    app.selection.labels = 'none';
    let year_selector = document.getElementById("year_selector");
    year_selector.size = 10;
    if (app.selection.years && (app.selection.years.length > 0) && (app.selection.years.length < 10)) year_selector.size = app.selection.years.length;
    const legend = document.getElementById("legend_view");
    legend.style.display = "none";
    if (app.data.population) calculate_migration_rates();
    let data_interpretation = document.getElementById("data_interpretation");
    data_interpretation.style.display = (app.data.population) ? "block" : "none";
    let absolute_selector = document.getElementById("absolute_selector");
    absolute_selector.checked = true;
    app.selection.data_interpretation = 'absolute';
    app.status.loading = false;

    // Ensure the newest year is selected
    if (app.selection.category && app.selection.category.years) {
        let newestYear = Math.max(...app.selection.category.years);
        app.selection.years = [newestYear.toString()];
        for (let option of year_selector.options) {
            if (option.value == newestYear) {
                option.selected = true;
                break;
            }
        }
        // Set the size of the year selector to show up to 8 years
        year_selector.size = Math.min(app.selection.category.years.length, 8);
    }
    process_selections(false); // Reapply filters after loading is completed

    // Hide the loading indicator
    hide_load_indicator();
    document.title = app.selection.dataset.name || app.selection.dataset.title || "hin&weg web"; // Update the document title
}


function calculate_migration_rates()
{
	//console.log("calculate_migration_rates");
	for (let id in app.data.featurename_mapping)
	{
		const populations = alasql("SELECT * FROM population WHERE areaid = ?", [id]);
		update_populations(id, populations);
	}
	alasql("UPDATE migrations SET migration_rate_from = ROUND(1000 * migrations / population_from, 3)");
	alasql("UPDATE migrations SET migration_rate_to = ROUND(1000 * migrations / population_to, 3)");
}

function update_populations(id, populations)
{
	if (!populations) return;
	for (let pop of populations)
	{
		alasql("UPDATE migrations SET population_from = ? WHERE fromid = ? AND year = ?", [pop.population, id, pop.year]);
		alasql("UPDATE migrations SET population_to = ? WHERE toid = ? AND year = ?", [pop.population, id, pop.year]);
	}
}