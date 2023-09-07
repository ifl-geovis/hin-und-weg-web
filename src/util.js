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