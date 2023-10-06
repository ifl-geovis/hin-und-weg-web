function refresh_table_view()
{
	//console.log("refresh_table_view");
	//console.log("app.data.processed:", app.data.processed);
	let table_view_data = document.getElementById("table_view_data");
	if (!app.data.processed)
	{
		table_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let dataview = `
	<table>
	<tr class="header">
		<th></th>
		<th>Von</th>
		<th>Nach</th>
		<th>Anzahl</th>
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

function refresh_statistics_view()
{
	//console.log("refresh_statistics_view");
	//console.log("app.data.processed:", app.data.processed);
	//console.log("app.data.geostats:", app.data.geostats);
	let statistics_view_data = document.getElementById("statistics_view_data");
	if (!app.data.geostats)
	{
		statistics_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let dataview = '<table>';
	dataview += '<tr class="odd"><th>Gebiete</th><td class="number">' + app.data.geostats.pop() + '</td></tr>';
	dataview += '<tr class="even"><th>Summe</th><td class="number">' + app.data.geostats.sum() + '</td></tr>';
	dataview += '<tr class="odd"><th>Minimum</th><td class="number">' + app.data.geostats.min() + '</td></tr>';
	dataview += '<tr class="even"><th>Maximum</th><td class="number">' + app.data.geostats.max() + '</td></tr>';
	dataview += '</table>';
	statistics_view_data.innerHTML = dataview;
}