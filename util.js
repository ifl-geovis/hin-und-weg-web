// utility functions

/*
function for loading a url
	param url: url to load (can be relative)
	param info: info object added to the request so that the callback can access it
	param listener: callback function
*/
function load_url(url, info, listener)
{
	console.log("load_url: ", url);
	let xhr = new XMLHttpRequest();
	xhr.appinfo = info;
	xhr.addEventListener("load", listener);
	xhr.open("GET", url);
	xhr.send();
}