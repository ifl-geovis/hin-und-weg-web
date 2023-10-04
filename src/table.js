function refresh_table_view()
{
	//console.log("refresh_table_view");
	//console.log("app.data.processed: ", app.data.processed);
	let table_view_data = document.getElementById("table_view_data");
	if (!app.data.processed)
	{
		table_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	let dataview = `
	<table>
	<tr class="header">
		<th>Von</th>
		<th>Nach</th>
		<th>Anzahl</th>
	</tr>`;
	let odd = true;
	for (let row of app.data.processed)
	{
		if (odd) dataview += '<tr class="odd">';
		else dataview += '<tr class="even">';
		dataview += "<td>" + row.fromname + "</td>";
		dataview += "<td>" + row.toname + "</td>";
		dataview += '<td class="number">' + row.migrations + "</td>";
		dataview += "</tr>";
		odd = !odd;
	}
	dataview += "</table>";
	table_view_data.innerHTML = dataview;
}