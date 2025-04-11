function refresh_barchart_view()
{
	console.log("refresh_barchart_view");
	console.log("app.data.processed:", app.data.processed);
	let barchart_view_data = document.getElementById("barchart_view_data");
	let dataview = '';
	if (!app.data.processed)
	{
		barchart_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
	
	// Sort data by migration values for better visualization
	let sortedData = [...app.data.processed].sort((a, b) => b.migrations - a.migrations);
	
	// Limit to top 20 entries if there are many
	if (sortedData.length > 20) {
		sortedData = sortedData.slice(0, 20);
	}
	
	// Calculate max value for scaling
	const maxValue = Math.max(...sortedData.map(item => Math.abs(item.migrations)));
	
	// Generate bar chart HTML
	dataview = `
	<div class="barchart-container">
		<h3>Migration ${app.selection.theme === 'von' ? 'from' : app.selection.theme === 'nach' ? 'to' : 'balance for'} 
		     ${app.data.featurename_mapping[app.selection.area_id] || ''}</h3>
		<div class="barchart-wrapper">`;
	
	// Add bars
	sortedData.forEach(item => {
		const labelText = app.selection.theme === 'von' ? item.toname : 
						 app.selection.theme === 'nach' ? item.fromname :
						 (item.migrations >= 0) ? item.toname : item.fromname;
		
		// Check if migrations value is null or undefined
		if (item.migrations === null || item.migrations === undefined) {
			// Handle NA values with grey color and "NA" text
			dataview += `
				<div class="barchart-row">
					<div class="barchart-label">${labelText}</div>
					<div class="barchart-bar-container">
						<div class="barchart-bar" style="width: 0; background-color: grey;">
							<span class="barchart-value">NA</span>
						</div>
					</div>
				</div>`;
		} else {
			// Original code for normal values (unchanged)
			const barWidth = Math.max(5, Math.abs(item.migrations) / maxValue * 100);
			const barColor = item.color || (item.migrations >= 0 ? '#356184' : '#E45A47');
			const barDirection = item.migrations >= 0 ? 'right' : 'left';
			
			dataview += `
				<div class="barchart-row">
					<div class="barchart-label">${labelText}</div>
					<div class="barchart-bar-container">
						<div class="barchart-bar ${barDirection}" 
							 style="width: ${barWidth}%; background-color: ${barColor};">
							<span class="barchart-value">${item.migrations}</span>
						</div>
					</div>
				</div>`;
		}
	});
	
	dataview += `
		</div>
	</div>
	<style>
		.barchart-container { width: 100%; max-width: 800px; }
		.barchart-wrapper { margin-top: 20px; }
		.barchart-row { display: flex; margin-bottom: 8px; align-items: center; }
		.barchart-label { width: 150px; text-align: right; padding-right: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.barchart-bar-container { flex-grow: 1; background-color: #f0f0f0; position: relative; height: 24px; }
		.barchart-bar { height: 100%; position: relative; transition: width 0.3s ease-in-out; }
		.barchart-bar.right { margin-left: 0; }
		.barchart-bar.left { margin-right: auto; margin-left: auto; }
		.barchart-value { position: absolute; padding: 0 5px; font-size: 12px; line-height: 24px; color: white; }
		.barchart-bar.right .barchart-value { left: 5px; }
		.barchart-bar.left .barchart-value { right: 5px; }
	</style>`;
	
	barchart_view_data.innerHTML = dataview;
}
