let app =
{
	status:
	{
		dataset_loads: 0
	},
	datasetlist: [],
	datasets:
	{
	}
};

function init()
{
	console.log("initialize!");
	load_url("data/data.json", null, init_datalist);
}

function init_datalist()
{
	console.log("init_datalist: ", this);
	console.log("status: ", this.status);
	console.log("content: ", this.responseText);
	console.log("app: ", app);
	if (this.status !== 200) return;
	let datasets = JSON.parse(this.responseText);
	app.datasetlist = datasets;
	console.log("datasets: ", datasets);
	console.log("datasets.length: ", datasets.length);
	app.status.dataset_loads = datasets.length;
	console.log("loads: ", app.status.dataset_loads);
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
	console.log("init_datalist: ", this);
	console.log("status: ", this.status);
	console.log("content: ", this.responseText);
	if (this.status !== 200)
	{
		remove_item_from_list(app.datasetlist, this.appinfo.dir);
		app.status.dataset_loads--;
		return;
	}
	console.log("appinfo: ", this.appinfo);
	let dataset = JSON.parse(this.responseText);
	app.datasets[this.appinfo.dir] = dataset;
	console.log("loads: ", app.status.dataset_loads);
	app.status.dataset_loads--;
	if (app.status.dataset_loads === 0) start();
}

function start()
{
	console.log("start!");
	console.log("Papa: ", Papa);
	const config =
	{
		complete: parsed_csv,
		download: true,
		skipEmptyLines: true,
	}
	Papa.parse("data/test.csv", config);
}

function load_url(url, info, listener)
{
	console.log("load_url: ", url);
	let xhr = new XMLHttpRequest();
	xhr.appinfo = info;
	xhr.addEventListener("load", listener);
	xhr.open("GET", url);
	xhr.send();
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