function refresh_barchart_view()
{
	if (app.status.viewcomponent != "barchart_view") return;
	console.log("refresh_barchart_view");
	console.log("app.data.processed:", app.data.processed);
	let barchart_view_data = document.getElementById("barchart_view_data");
	let dataview = '';
	if (!app.data.processed)
	{
		barchart_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	dataview = `
	<div>
		Dieser Inhalt ist noch nicht implementiert.
	</div>`;
	barchart_view_data.innerHTML = dataview;
}