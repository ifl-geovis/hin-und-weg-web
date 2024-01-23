function refresh_table_view()
{
	if (app.status.viewcomponent != "table_view") return;
	//console.log("refresh_table_view");
	//console.log("app.data.processed:", app.data.processed);
	let table_view_data = document.getElementById("table_view_data");
	if (!app.data.processed)
	{
		table_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let numberrow = "Anzahl";
	if (app.selection.data_interpretation === "migration_rate") numberrow = "Wanderungsrate";
	const arrow = (app.selection.tablesort_ascending) ? "⬆" : "⬇";
	const arrowdiv = `<div id="table_heading_arrow">${arrow}</div>`;
	let fromarr = '';
	let toarr = '';
	let numberarr = '';
	let spaces = '';
	if (app.selection.tablesort === "from") fromarr = arrowdiv;
	if (app.selection.tablesort === "to") toarr = arrowdiv;
	if (app.selection.tablesort === "number")
	{
		numberarr = arrowdiv;
		spaces = "&nbsp;&nbsp;&nbsp;";
	}
	let dataview = `
	<table>
	<tr class="header">
		<th onclick="tablesort(null)"></th>
		<th onclick="tablesort('from')">${fromarr}Von</th>
		<th onclick="tablesort('to')">${toarr}Nach</th>
		<th onclick="tablesort('number')">${numberarr}${numberrow}${spaces}</th>
	</tr>`;
	let odd = true;
	for (let row of app.data.processed)
	{
		if (odd) dataview += '<tr class="odd">';
		else dataview += '<tr class="even">';
		dataview += '<td><span style="color: ' + row.color + '">⬤</span></td>';
		dataview += "<td>" + row.fromname + "</td>";
		dataview += "<td>" + row.toname + "</td>";
		dataview += '<td class="number">' + row.migrations + "</td>";
		dataview += "</tr>";
		odd = !odd;
	}
	dataview += "</table>";
	table_view_data.innerHTML = dataview;
}

function tablesort(column)
{
	if (column === app.selection.tablesort) app.selection.tablesort_ascending = !app.selection.tablesort_ascending;
	else app.selection.tablesort_ascending = false;
	app.selection.tablesort = column;
	refresh_table_view();
}

function refresh_statistics_view()
{
	if (app.status.viewcomponent != "statistics_view") return;
	//console.log("refresh_statistics_view");
	//console.log("app.data.processed:", app.data.processed);
	//console.log("app.data.geostats:", app.data.geostats);
	let statistics_view_data = document.getElementById("statistics_view_data");
	if (!app.data.geostats)
	{
		statistics_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let data = [];
	data.push(['Gebiete', app.data.geostats.pop()]);
	data.push(['Summe', app.data.geostats.sum()]);
	data.push(['Minimum', app.data.geostats.min()]);
	data.push(['Maximum', app.data.geostats.max()]);
	data.push(['Durchschnitt', app.data.geostats.mean()]);
	data.push(['Median', app.data.geostats.median()]);
	data.push(['Varianz', app.data.geostats.variance()]);
	data.push(['Standardabweichung', app.data.geostats.stddev()]);
	statistics_view_data.innerHTML = create_statistics_table(data);
}

function create_statistics_table(data)
{
	let dataview = '<table>';
	let odd = true;
	for (let row of data)
	{
		if (odd) dataview += '<tr class="odd">';
		else dataview += '<tr class="even">';
		dataview += "<th>" + row[0] + "</th>";
		dataview += '<td class="number">' + row[1] + '</td>';
		odd = !odd;
	}
	dataview += '</table>';
	return dataview;
}