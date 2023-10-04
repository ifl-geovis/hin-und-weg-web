function refresh_barchart_view()
{
	console.log("refresh_barchart_view");
	console.log("app.data.processed:", app.data.processed);
	let barchart_view_data = document.getElementById("barchart_view_data");
	let dataview = '';
	if (!app.data.processed)
	{
		dataview = "Für die gewählte Selektion sind keine Daten verfügbar!";
	}
	else
	{
		dataview = `
		<div>
			Dieser Inhalt ist noch nicht implementiert.
		</div>`;
	}
	barchart_view_data.innerHTML = dataview;
}