# neue Ansicht hinzufügen

Hier wird beispielhaft der Ablauf beschrieben, um eine neue Ansicht hinzuzufügen, beispielsweise ein Diagramm.

## Javascript-Datei

Die Javascript-Funktionalität kann in bestehenden Dateien untergebracht werden. Wenn aber der Code komplexer wird, bietet es sich an, das in eine separate Javascript-Datei auszulagern. Für dieses Tutorial nehme ich an, dass wir eine Datei `diagram.js` in `src` ablegen.

Damit Funktionalität aus dieser Javascript-Datei genutzt wird, muss sie geladen werden. Dazu fügen wir im Header der `index.html` folgende Zeile ein:
```
<script type="text/javascript" src="diagram.js"></script>
```

## Aktions-Button

Zuerst wird ein Button hinzugefügt, damit man die Ansicht aufrufen kann. Die Buttons sind an der rechten Seite angeordnet.

Um den Button anzulegen, erzeugen wir zuerst entsprechendes HTML in der `index.html`. Es gibt dort bereits einen Bereich für die Buttons, eingeleitet mit dem Kommentar _'action buttons on the right'_.

```
<div id="diagram_button" class="action_button" title="Diagramme" onclick="show_viewcomponent(event, 'diagram_view')">
	<img src="img/diagram.svg" width="100%" height="100%" />
</div>
```
Hier passiert tatsächlich eine Menge und damit der Button korrekt funktioniert müssen wir weitere Änderungen vornehmen. Zuerst aber die Erklärungen.

Das `div` ist das Element für den eigentlichen Button. Wir vergeben eine neue ID (die per Konvention auf `'_button'` endet, in dem Fall `diagram_button`). Wir vergeben die Klasse `action_button`, damit sind schon viele CSS-Stile verbunden, die das Element über der Karte schwebend machen und die Hintergrundfarbe vergeben. Das `title`-Attribut bestimmt den Alternativtext, der auf Mouse-Over angezeigt wird und in Screen-Readern vorgelesen wird. Das onclick-Event verknüpfen wir mit der bereits existierenden Funktion `show_viewcomponent()`, der wir neben dem Event die ID einer noch zu erzeugenden View geben. Diese IDs enden per Konvention auf `'_view'`, in unserem Fall also `diagram_view`. Der Inhalt des Buttons ist ein Bild, dass wir mit einer Bilddatei `img/diagram.svg` versehen.

Eine Menge davon ist noch undefiniert. Zuerst muss tatsächlich ein Bild unter `img/diagram.svg` abgelegt werden. Ich habe diese Icons aus derselben Kollektion genommen, diese ist in der globalen `README.md` verlinkt.

Obwohl eine Menge des Stylings des Buttons durch die Klasse `action_button` vergeben wird, ist die Position der einzelnen Buttons unterschiedlich. Wir müssen diese setzen indem wir einen Style direkt für die ID (statt der Klasse) definieren. Diese wird in `main.css` abgelegt:
```
div#diagram_button
{
	top: 300px;
}
```
Ich habe die Buttons immer im Abstand von 50 Pixeln platziert, also man addiert hier 50 zu dem Wert für den letzten Button hinzu. Damit wird das am Ende angefügt. Will man das in der Mitte platzieren, gibt man stattdessen den Wert des Buttons an den man ersetzt, und addiert bei allen nachfolgenden Buttons 50 Pixel hinzu.

Damit haben wir den Button definiert und er sollte nach einem Reload sichtbar sein. Ein Klick darauf produziert aber aktuell einen Fehler (sichtbar in der Konsole), da die an die Funktion `show_viewcomponent()` übergebende ID des View-Elements noch nicht existiert.

## Fenster für die View

Wir müssen ein Fenster definieren. Dazu legen wir in der `index.html` einen neuen Abschnitt an:
```
<!-- diagram view -->
<div id="diagram_view" class="viewcomponent">
	<h2 class="title_bar" draggable="true" ondragstart="move_start(event, 'diagram_view')" ondragend="move_stop(event, 'diagram_view')">
		Diagramme
	</h2>
	<div id="diagram_view_close_button" class="close_button" onclick="close_view(event, 'diagram_view')">
		<img src="img/x-square.svg" width="100%" height="100%" />
	</div>
	<div id="diagram_view_data" class="view_content">
	</div>
</div>
```
Erneut handelt es sich um ein `div`. Wir vergeben hier die zuvor bereits beim Button angegebene ID `diagram_view` und die Klasse `viewcomponent`. Mit der Klasse werden erneut die wesentlichen Stile bereits gesetzt. Die ID erlaubt dem Button die View auf Klick sichtbar zu machen.

Wir setzen innerhalb des `div`s nun eine Titelzeile mit `h2` und der Klasse `title_bar`. Wir setzen die Titelzeile auf `draggable="true"` und definieren dragevents, damit das Fenster verschoben werden kann. Die Events `ondragstart` und `ondragend` werden mit den bereits bestehenden Funktionen `move_start()` und `move_stop()` verknüpft und diesen übergeben wir neben dem Event (für die Entfernung die die Maus bewegt wurde) auch die ID unseres Fensters, also wieder `diagram_view`. Der Text der Titelzeile wird hier auf 'Diagramme' gesetzt.

Das nächste `div` definiert den 'Schließen'-Button auf der Titelzeile, das kann man weitgehend kopieren, nur dass wir erneut die ID unseres Fensters angeben müssen, damit das richtige Fenster geschlossen wird.

Schließlich wird ein Bereich mit dem eigentlichen Inhalt definiert, den wir vorerst leer lassen (da der Inhalt später generiert wird). Wir setzen also eine eindeutige ID (`diagram_view_data`) und die Klasse `view_content`, damit das gut mit der Titelzeile zusammenarbeitet.

Hiermit haben wir bereits ein funktionierendes Fenster, dass sich mit dem button öffnen lässt, es lässt sich verschieben und wieder schließen. Es ist nur zu diesem Zeitpunkt noch komplett leer.

## Funktion für den Inhalt

Um das Fenster nun mit Inhalt zu füllen, brauchen wir eine Funktion, da dieser Inhalt dynamisch erzeugt wird.

Dazu erstellen wir eine Funktion in unserer `diagram.js`. Ich nenne die Funktion hier im Beispiel `refresh_diagram_view()`:

```
function refresh_diagram_view()
{
	console.log("refresh_diagram_view");
}
```

Zur Zeit macht diese Funktion nichts weiter, als eine Meldung mit dem Funktionsnamen auszugeben, damit wir wissen wann sie aufgerufen wird. Natürlich wird die Funktion momentan noch nicht aufgerufen, aber das können wir ändern. Dazu nutzen wir die Funktion `refresh_view()` in der `main.js`. Diese wird bei Änderungen an den Selektionen aufgerufen und bekommt die viewid der aktiven View übergeben. Analog zu den dort bereits bestehenden Zeilen fügen wir also eine if-Abfrage auf unsere ID hinzu, die bei Erfolg unsere neue Funktion aufruft.

```
function refresh_view(viewid)
{
	...
	if (viewid === "diagram_view") refresh_diagram_view();
}
```

Nun sollten wir in der Dev-Konsole unsere obige Ausgabe sehen, sobald wir das Fenster mit Klick auf den Button öffnen, und so lange es offen ist immer wenn wir eine neue Selektion vornehmen.

## Fallback für unzureichende Selektion

Als nächstes fügen wir Code hinzu, um eine Ausgabe zu machen für den Fall, dass die Selektion noch nicht zu hinreichenden Daten führt (beispielsweise wenn noch keine Fläche gewählt wurde).

```
function refresh_diagram_view()
{
	console.log("refresh_diagram_view");
	let diagram_view_data = document.getElementById("diagram_view_data");
	if (!app.data.processed)
	{
		diagram_view_data.innerHTML = "Für die gewählte Selektion sind keine Daten verfügbar!";
		return;
	}
}
```

Wir holen uns hier das Element das wir ändern wollen mit der zuvor vergebenen ID `document.getElementById("diagram_view_data")` und speichern es in einer Variable. Dann fragen wir ab, ob wir Daten vorliegen haben, und wenn nicht schreiben wir in das Element einen entsprechenden Text hinein. Für den Fall mit keinen Daten verlassen wir die Funktion mit `return;` vorzeitig, weil es nun nichts mehr zu tun gibt.

## Fallback für unzureichende Selektion

Nun brauchen wir auch Code für den Fall das wir Daten haben:

```
function refresh_diagram_view()
{
	...
	let dataview = '';
	for (let row of app.data.processed)
	{
		dataview += row.id + ': ' + row.migrations + '<br />';
	}
	diagram_view_data.innerHTML = dataview;
}
```

Wir erzeugen hier eine Variable `dataview`, die wir in einer Schleife mit Inhalt füllen. `dataview` kann und soll ruhig HTML enthalten, dies wird vom Browser gerendert.

Die Schleife ist eine for-of-Schleife. Damit wird über dem Inhalt eines Arrays iteriert, row enthält in jedem Durchlauf ein weiteres Element des Arrays, welches in unserem Fall die prozessierten Daten `app.data.processed` sind.

Nach Abschluss schreiben wir dataview in das Element hinein mit `innerHTML`. Damit wird der DOM aktualisiert und der Browser rendert die Änderungen.

Dieses Beispiel ist natürlich extrem einfach, es gibt nur zwei Felder in den Daten aus. Normalerweise will man wohl kompliziertere Dinge tun. Dies kann man entsprechend in Funktionen auslagern, die man ruft um das HTML zu erzeugen. Als Beispiel kann man sich `table.js` anschauen. Die Funktion `refresh_table_view()` erstellt die Tabellenansicht und benutzt dazu `app.data.processed` als Datengrundlage. Die Funktion `refresh_statistics_view()` in der gleichen Datei erstellt die Statistik und nutzt dazu `app.data.geostats` als Datengrundlage. Beide benutzen zusätzliche Funktionen um ihre Arbeit zu erledigen.