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
	let sorted = process_tablesort();
	let numberrow = "Anzahl";
	if (app.selection.data_interpretation === "migration_rate") numberrow = "Wanderungsrate";
	const arrow = (app.selection.tablesort_ascending) ? "⬇" : "⬆";
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
		<th onclick="tablesort_selection(null)"></th>
		<th onclick="tablesort_selection('from')">${fromarr}Von</th>
		<th onclick="tablesort_selection('to')">${toarr}Nach</th>
		<th onclick="tablesort_selection('number')">${numberarr}${numberrow}${spaces}</th>
	</tr>`;
	let odd = true;
	for (let row of sorted)
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

function tablesort_selection(column)
{
	if (column === app.selection.tablesort) app.selection.tablesort_ascending = !app.selection.tablesort_ascending;
	else app.selection.tablesort_ascending = true;
	app.selection.tablesort = column;
	refresh_table_view();
}

function process_tablesort()
{
	//console.log("process_tablesort:", app.selection.tablesort);
	let sorted = [];
	for (let element of app.data.processed) sorted.push(element);
	if (!app.selection.tablesort) return sorted;
	tablesort(sorted, 0, sorted.length - 1);
	return (app.selection.tablesort_ascending) ? sorted : tablesort_flip(sorted);
}

function tablesort_flip(sorted)
{
	let flipped = [];
	for (let i = sorted.length - 1; i >= 0; i--) flipped.push(sorted[i]);
	return flipped;
}

function tablesort(sorted, min, max)
{
	//console.log("tablesort:", "" + min + " - " + max);
	if (min === max) return;
	if (min > max) return;
	if ((max - min) === 1)
	{
		if(tablesort_compare(sorted[min], sorted[max]) > 0) tablesort_swap(sorted, min, max);
		return;
	}
	let pivot = Math.floor(((max - min) / 2) + min);
	//console.log("tablesort:", "" + min + " - " + max + " → " + pivot);
	//console.log("pivot:", sorted[pivot].migrations);
	//console.log("unsorted:", app.data.processed);
	let left = min;
	let right = max;
	//console.log(tablesort_compare(sorted[pivot], sorted[left]));
	//console.log(tablesort_compare(sorted[right], sorted[pivot]));
	while ((left < pivot) || (right > pivot))
	{
		while ((left < pivot) && (tablesort_compare(sorted[left], sorted[pivot]) <= 0)) left++;
		while ((right > pivot) && (tablesort_compare(sorted[right], sorted[pivot]) >= 0)) right--;
		//console.log("left ↔ right: ", "" + left + " ↔ " + right);
		//console.log("left ↔ right: ", "" + sorted[left].migrations + " ↔ " + sorted[right].migrations);
		tablesort_swap(sorted, left, right);
		if (left === pivot) pivot = right;
		else if (right === pivot) pivot = left;
	}
	//console.log("sorted:", sorted);
	//console.log("pivot-index:", pivot);
	tablesort(sorted, min, pivot - 1);
	tablesort(sorted, pivot + 1, max);
}

function tablesort_swap(sorted, index1, index2)
{
	if (index1 === index2) return;
	let tmp = sorted[index1];
	sorted[index1] = sorted[index2];
	sorted[index2] = tmp;
}

function tablesort_compare(element1, element2)
{
	if (app.selection.tablesort === "number") return element1.migrations - element2.migrations;
	if (app.selection.tablesort === "from") return element1.fromname.localeCompare(element2.fromname);
	if (app.selection.tablesort === "to") return element1.toname.localeCompare(element2.toname);
	return element1.id.localeCompare(element2.id);
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