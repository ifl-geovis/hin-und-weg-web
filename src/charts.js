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
	
	// Sort data by migration values in descending order
    let sortedData = [...app.data.processed].sort((a, b) => {
        // Handle null or undefined values
        if (a.migrations === null || a.migrations === undefined) return 1;
        if (b.migrations === null || b.migrations === undefined) return -1;
        
        // Ensure numerical comparison (in case migrations are stored as strings)
        const aVal = typeof a.migrations === 'string' ? parseFloat(a.migrations) : a.migrations;
        const bVal = typeof b.migrations === 'string' ? parseFloat(b.migrations) : b.migrations;
        
        // Sort by actual values in descending order
        return bVal - aVal;
    });

	// Limit to top 20 entries if there are many
	if (sortedData.length > 20) {
		sortedData = sortedData.slice(0, 20);
	}
	
	// Calculate max value for scaling - properly handle null/undefined values
	const maxValue = Math.max(...sortedData.filter(item => 
        item.migrations !== null && item.migrations !== undefined
    ).map(item => Math.abs(item.migrations)));
    
    console.log("Max value for scaling:", maxValue);
	
    // Generate bar chart HTML with responsive design
    dataview = `
    <div class="barchart-container">
        <h3>${app.selection.theme === 'von' ? 'Wanderungen von' : 
              app.selection.theme === 'nach' ? 'Wanderungen nach' : 
              'Wanderungssaldi für'}
             ${app.data.featurename_mapping[app.selection.area_id] || ''}</h3>
        <div class="barchart-wrapper">`;
	
	// Add bars
	sortedData.forEach(item => {
		const labelText = app.selection.theme === 'von' ? item.toname : 
						 app.selection.theme === 'nach' ? item.fromname :
						 (item.migrations >= 0) ? item.fromname : item.fromname;
		
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
			// Calculate bar width as percentage of max value
			// Ensure it's at least 5% for visibility of small values
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
		.barchart-container { 
            width: 100%; 
            resize: both; /* Enable manual resizing */
            overflow: auto;
            min-height: 100px;
            min-width: 300px;
            max-width: 100%; /* Allow full width */
        }
		.barchart-wrapper { 
            margin-top: 20px; 
            width: 100%;
        }
		.barchart-row { 
            display: flex; 
            margin-bottom: 8px; 
            align-items: center; 
            width: 100%;
        }
		.barchart-label { 
            width: 150px; 
            text-align: right; 
            padding-right: 10px; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            flex-shrink: 0; /* Prevent label from shrinking */
        }
		.barchart-bar-container { 
            flex-grow: 1; 
            background-color: #f0f0f0; 
            position: relative; 
            height: 24px;
        }
		.barchart-bar { 
            height: 100%; 
            position: relative; 
            transition: width 0.3s ease-in-out; 
        }
		.barchart-bar.right { 
            margin-left: 0; 
        }
		.barchart-bar.left { 
            /* Fix the position of left-directed bars */
            margin-left: auto; 
            margin-right: 0;
        }
		.barchart-value { 
            position: absolute; 
            padding: 0 5px; 
            font-size: 12px; 
            line-height: 24px; 
            color: white;
            white-space: nowrap;
        }
		.barchart-bar.right .barchart-value { left: 5px; }
		.barchart-bar.left .barchart-value { right: 5px; }
	</style>`;
	
	barchart_view_data.innerHTML = dataview;
}
