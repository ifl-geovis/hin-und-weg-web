# Grundlagen

## generelle Struktur und Ausführung

Dieses Projekt hat zwei Unterverzeichnisse: `doc` und `src`. Im Verzeichnis `doc` ist diese Programmierdokumentation enthalten. In `src` befindet sich das eigentliche Projekt.

Das Projekt nutzt grundlegend nur HTML, CSS und Javascript. Es gibt keinen Buildprozess und keine serverseitigen Komponenten. Dies erlaubt es die Dateien im Verzeichnis `src` mit einem beliebigen Webserver der statische Dateien ausliefert (bspq. Apache Webserver, nginx oder lighthhtpd) bereitzustellen und alle weitere Ausführung findet im Browser statt.

Da Daten per Javascript-fetch geladen werden, kann man allerdings nicht einfach die HTML im Browser laden. Zur Entwicklung bietet sich an einen lokalen simplen Webserver zu benutzen, wie [darkhttpd](https://github.com/emikulic/darkhttpd) (Kommandozeilen-Webserver, der mit einem Verzeichnis als Parameter gestartet wird und dieses auf localhost:8080 ausliefert).

Zur Entwicklung empfiehlt es sich die Developer-Tools von Browsern zu benutzen. In den meisten Browsern wird dieses mit F12 geöffnet.

Da kein Buildprozess nötig ist, genügt es bei Änderungen einen Reload im Browser auszulösen. Es ist zu beachten, dass viele Browser aktiv Dateien cachen und daher der Reload komplett sein muss. Dazu kann man in den Dev-Tools im Netzwerktab die Option *'Disable cache'* aktivieren.

## Basisdateien

Es existiert grundlegend eine `index.html`. Diese wird in grundlegenden Webserver-Einstellungen auch dann geladen, wenn nur der Basispfad angegeben wird. In der index.html werden CSS und Javascript geladen.

Es gibt zwei weitere HTML-Dateien, `datenschutz.html` und `impressum.html`. Diese sind in der Anwendung verlinkt (unten links beim Logo). Diese HTML-Seiten sind derzeit außer einem HTML-Gerüst leer und können vom IfL nach Bedarf gefüllt werden.

Die `main.css` enthält die von der Anwendung benutzten Stildefinitionen. Sie wird in der `index.html` im Header geladen. Zudem liefern geostats und leaflet eigene Stildateien, die dort ebenfalls geladen werden.

Die anwendungsspezifischen Javascripte sind in mehreren Javascript-Dateien:

 * `main.js`: grundlegender Code
 * `init.js`: Initialisierung der Anwendung
 * `map.js`: kartenspezifischer Code
 * `table.js`: Code für Statistik und Tabellendarstellung
 * `util.js`: einige Helferfunktionen

Alle diese Javascripte und zusätzlich die von den Bibliotheken bereitgestellten Javascripte werden ebenfalls im Header der `index.html` geladen.

Es gibt die Unterverzeichnisse `lib`, `img` und `data`. Unter `lib` sind die verwendeten Bibliotheken abgelegt. In `img` sind alle benutzten Bilder und Icons. `data` enthält die Daten, die per Javascript-fetch geladen werden. Wie diese Daten aufbereitet werden, kann man im Kapitel [Datenaufbereitung](Daten.md) im Detail einsehen.

## Empfehlungen zur Entwicklung

Man kann in den Dev-Tools die Konsole aufmachen um Ausgaben zu sehen. Diese lassen sich im Code einfügen mit dem Befehl:
```
console.log("text");
console.log("var1, var2:", var1, var2);
```
Es können beliebig viele Parameter angegeben werden, und diese können auch anderes als Strings enthalten. In der Dev-Konsole werden Objekte und Arrays interaktiv dargestellt, man kann sie per Mausklick ausklappen um sie im Detail zu inspizieren.

Im Elemente-Tab der Dev-Konsole kann man den DOM inspizieren. Klickt man oben links auf das Pfeilsymbol, kann man in der Anwendung über Objekte hovern um mehr Informationen zu bekommen oder sie anklicken um im Elemente-Tab mehr Informationen zu bekommen. So kann man beispielsweise aktive CSS-Styles inspizieren oder sehen mit wie vielen Pixeln das aktuell gerendert wird.

## Code

Im Code wird versucht sprechende Namen in englischer Sprache zu verwenden. Englisch wird gewählt, weil das Konsistenz mit den Schlüsselwörtern und den Funktionen aus Bibliotheken hat. Die Namen werden alle in Kleinbuchstaben ausgeführt. Wird eine Funktion mit mehreren Wörter bezeichnet, dann wird ein Unterstrich zu Separation verwendet.

```
function year_selected(event)
{
	...
}
```

Diese Konvention gelten auch für IDs und Klassennamen im HTML/CSS.

```
		<!-- legend view -->
		<div id="legend_view">
			...
		</div>
```

Um den Status der Anwendung zu halten wird ein Objekt namens `app` erzeugt. Dieses enthält als Attribute alle Daten, Stati und Selektionen. Der detaillierte Aufbau des app-Objekts wird im Kapitel [Applikations-Objekt](appdata.md) im Detail erklärt.

### Initialisierung

Die Anwendung hat eine Initialisierungsphase nach dem Laden der Seite. Ausgelöst wird dies durch folgenden Code im HTML:

```
	<!-- scripting load -->
	<!-- after the map-div, because otherwise it may go wrong -->
	<script type="text/javascript" defer>
		init();
	</script>
```
Dies ist am Ende der HTML-Seite platziert, weil die Reihenfolge auch die Ausführungsreihenfolge beeinflusst, aber der `script`-Block ist zudem mit `defer` gekennzeichnet, was bedeutet, dass der Inhalt erst ausgeführt ist nachdem die Seite geladen und geparst wurde (siehe [defer](https://www.w3schools.com/tags/att_script_defer.asp)). Die dort aufgerufene Funktion `init()` ist in der Datei `init.js` und sieht derzeit so aus:

```
function init()
{
	console.log("initialize!");
	init_color_settings();
	init_values();
	init_selections();
	init_map();
	init_view();
	init_db();
	init_color_gradients();
	load_url("data/data.json", null, init_datalist);
}
```

Also de facto werden einfach weitere init-Funktionen aufgerufen, die dafür sorgen dass die Anwendung in ihren initialen Zustand versetzt wird. Falls es nötig ist weitere Initialisierungen durchzuführen, so sollte man hier weitere Funktionen unterbringen. Außerdem wird der Start hier durch das Log auf der Konsole mit `initialize!` angeführt, so dass man sehen kann wann der Intialisierungsprozess startet. Das Ende wird hier nicht genauso markiert, da einige der Initialisierungsprozesse Daten laden (es wird während der Initialisierung `data/data.json` und alle `info.json` in den entsprechenden Unterverzeichnissen geladen). Diese Ladeprozesse erfolgen nebenläufig.

Der Abschluss der Initialisierung wird durch den Aufruf der Funktion `start` markiert, die nur ebenfalls eine Konsolen-Ausgabe hat:

```
function start()
{
	console.log("start!");
}
```

Der Ablauf der Initialisierung kann grob so beschrieben werden:

 * `init()`: Diese Funktion wird direkt von der HTML-Seite aufgerufen und startet die Initialisierung. Es werden eine Reihe direkter Initialisierungen durchgeführt, aber unter anderem wird auch das Laden von `data/data.json` angestoßen mit der Funktion `load_url()`.
 * `load_url()`: Dies ist eine Hilfsfunktion (definiert in `utils.js`), die dazu benutzt wird Daten von einer URL zu laden. Sie nimmt als ersten Parameter die zu ladende URL. Der zweite Parameter ist ein Objekt mit dem Kontext definiert werden kann. Dies ist speziell hilfreich, wenn das Laden mehrerer URLs parallel angestoßen wird, damit die aufgerufene Funktion erkennen kann, was gerade fertig geworden ist. Der dritte Parameter gibt die Funktion an, die mit den geladenen Daten aufgerufen werden soll, sobald das Laden abgeschlossen wurde.
 * `init_datalist()`: Diese Callback-Funktion wird aufgerufen, sobald `data/data.json` geladen wurde. Hier wird initiiert, dass für all die in `data/data.json` definierten Verzeichnisse die entsprechende `info.json` geladen wird.
 * `init_datasetinfo()`: Diese Funktion wird als Callback aufgerufen, wenn eine `info.json` fertig geladen ist (also so oft wie `info.json`-Dateien existieren).
 * `init_datasetloader()`: Diese Funktion wird erst aufgerufen, wenn *alle* `info.json`-Dateien geladen wurden. Hier wird der Datensatz-Ladedialog initialisiert mit den Auswahllisten die wir nun mit den Daten aus den `info.json` füllen können.
 * `start()`: Diese Funktion wird aufgerufen, sobald die Initialisierungen abgeschlossen wurden.

Man bedenke, dass bei Abschluss der Initialisierungen noch kein Datensatz direkt geladen wurde. Das passiert erst nachdem der Nutzer einen ausgewählt hat.

Wenn diese Funktion aufgerufen wird, dann ist die Initialisierung abgeschlossen. Bei abgeschlossener Initialisierung ist erstmals der Datenladedialog geöffnet, mit der Auswahl für den Nutzer welcher Datensatz zu laden ist. Weitere Funktionalitäten werden dann durch Events ausgelöst, die der Nutzer mit seinen Aktionen initiiert. Beispielsweise enthält der Dialog des Datensatzladers im HTML einen Button:
```
<button name="load_dataset" id="load_dataset_button" onclick="load_dataset(event)" disabled>Daten einladen</button>
```
Dort ist als `onclick`-Event die Funktion `load_dataset()` angegeben, diese wird also ausgeführt sobald der Anwender den Button klickt. dabei können Parameter übergeben werden, der Parameter event ist in dem Kontext immer mit dem auslösenden Event (in dem Fall also der Klick) gefüllt und kann weitere Informationen enthalten (wie die Mausposition). So werden also nach der Initialisierung weitere Aktionen ausgelöst, der Nutzer macht eine Interaktion und dies löst den Aufruf von Funktionen aus, die in den Javascript-Dateien definiert wurden.

### Selektionen

In der hin&weg Anwendung ist eine zentrale Nutzerinteraktion die Auswahl von Selektionen über den Daten (Flächen, Jahre usw.). Diese Selektionen sind auf der linken Seite der Anwendung platziert und bei Veränderung werden Funktionen aufgerufen, die erst einmal den neuen Wert in dem app-Objekt setzen (siehe [Applikations-Objekt](appdata.md)). Aber diese Selektionen führen auch dazu, dass die prozessierten Werte neu berechnet werden müssen. Deshalb hier beispielhaft die Funktion, die bei Änderungen am Thema (Von, Nach, Saldi) aufgerufen wird:
```
function theme_selected(event)
{
	//console.log("theme_selected:", event.target.value);
	app.selection.theme = event.target.value;
	process_selections(true);
}
```
Wie man sieht wird hier erst einmal der neue Wert gesetzt. Dann wird die Funktion `process_selections` aufgerufen. Diese führt alle diese Berechnungen durch. Der Boolean-Parameter bestimmt, ob die Filter zurückgesetzt werden. Dies passiert deshalb, weil die Selektionen für den Filter relevante Änderungen durchführen können, sie können beispielsweise den maximalen oder minimalen Wert ändern. Dann werden die Filter neu gesetzt und auf Standardwerte zurückgesetzt. Wenn der Nutzer dagegen den Filter selbst geändert hat, dann beeinflusst dies durchaus die Berechnungen, aber dann möchte man den Filter eben nicht sofort auf Standardwerte zurücksetzen, deshalb wird für den Fall `false` als Parameter gesetzt.

Wenn man neue Selektionen einführt, dann sollte man sicherstellen, dass man `process_selections()` aufruft. Wenn man zusätzliche Berechnungen abhängig von den Selektionen macht, dann sollte man sie in eine Funktion platzieren, die man wiederum von `process_selections()` aus aufruft.

## visueller Aufbau

Alle visuellen Elemente sind in der `index.html`, meist als `div`-Tags. Sie sind auch dann dort definiert, wenn sie initial nicht sichtbar sind. Dann werden sie in der `main.css` mit dem Attribut `display: none;` versehen, damit sie nicht dargestellt werden. Sobald sie sichtbar werden sollen, wird per Javascript das display-Attribut geändert:

```
let dataset_dialog = document.getElementById("datasetloader_dialog");
dataset_dialog.style.display = "block";
```
In diesem Beispiel wird der Datensatz-Lade-Dialog erst einmal im DOM über seine ID (`datasetloader_dialog`) gefunden. Dann wird das Display auf `block` gesetzt, damit der Dialog sichtbar wird. Wenn man das Element wieder unsichtbar machen will, setzt man display einfach erneut auf `none`.

Die Anwendung benutzt eine komplette Füllung mit der Karte und alle weiteren Elemente sind schwebend darüber angebracht. Damit die Karte komplett das Fenster ausfüllt, müssen die standardmäßigen Ränder auf den `html`- und `body`-Tag entfernt werden. Dies geschieht in der CSS-Definition in `main.css`. zudem wird die Höhe auf 100% gesetzt, ansonsten wird es automatisch auf 0 Pixel kollabiert.
```
html, body
{
	height: 100%;
	margin: 0px;
	font-family: sans-serif;
}
```

Außerdem bedeutet das, das weitere Elemente aus dem normalen Dokumentenflow genommen werden, sonst erhält die Seite Scrollbalken. Sie werden stattdessen 'schwebend' auf der Karte dargestellt.

```
div#legend_view
{
	position: fixed;
	right: 50px;
	bottom: 30px;
	min-width: 100px;
	min-height: 40px;
	z-index: 1000;
}
```

Das wird mit `position: fixed;` erreicht. Damit werden Elemente aus dem normalen Flow entfernt und stattdessen ausgehend von dem Fenster platziert. Mit den Attributen `right` und `bottom` wird angegeben, wie weit das Element vom rechten und unteren Rand entfernt ist. Man kann auch `left` und `top` verwenden für entsprechend den linken und oberen Rand. Das Attribut `z-index` wird benutzt um zu bestimmen, welche Elemente 'über' anderen Elementen angezeigt werden (also welches Element welches andere verdeckt). Leaflet benutzt z-Indices kleiner bis 1000 für seine Elemente, also erreicht man mit z-Index 1000 oder größer, dass diese Elemente über der Karte platziert werden.