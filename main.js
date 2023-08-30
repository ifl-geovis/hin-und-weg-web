function parsedCSV(results, file)
{
	console.log('results: ', results);
	console.log('file: ', file);
}

function init()
{
	console.log('initialize!');
}

function start()
{
	console.log('start!');
	console.log('Papa: ', Papa);
		const config =
		{
			complete: parsedCSV,
			download: true,
			skipEmptyLines: true,
		}
		Papa.parse('data/test.csv', config);
}