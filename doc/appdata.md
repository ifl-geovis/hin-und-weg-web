# Applikations-Objekt

Das Applikations-Objekt ist ein zentrales Objekt um die Daten für die Anwendung zu halten. hier ist immer der aktuelle Stand der Anwendung ablesbar. Beispielsweise kann man durch Abfrage von `app.selection.area_id` immer die ID der aktuell ausgewählten Fläche in Erfahrung bringen. Es war zentral die Daten in dem Applikations-Objekt immer aktuell zum Zustand der Anwendung zu halten, um das Objekt als konsistente Referenz zu haben.

Die initialen Werte des Objekt werden am Anfang der `main,js` definiert. Diese Werte können danach durch den weiteren Programmablauf geändert werden.

Da die Applikation umfangreich ist, ist das Objekt in Unterbereiche unterteilt, die jeweils wieder ein Objekt sind. Diese Bereiche sind:

 * `app.configuration`: Konfigurationsdaten für die Anwendung. Diese sind intendiert einmal in der main.js initial gesetzt zu werden und dann unverändert zu bleiben, aber eben leicht zu Änderungen genutzt zu werden (beispielsweise für die Definition von Farbskalen).
 * `app.data`: Hier werden alle zentralen Daten gehalten, wie die GeoJSON-Datei und der Inhalt der Migrations-CSV.
 * `app.dataset_list`: Liste der Datensätze nach der Initialisierung gefüllt mit einem Array, dass die Namen der Datensätze enthält für den Datensatzladedialog.
 * `app.datasets`: Enthält den kompletten Inhalt der nach der Initialisierung geladenen `info.json` unter dem Schlüssel des Verzeichnisnamens des Datensatzes.
 * `app.map`: Spezifische Daten für die Verwaltung der Karte.
 * `app.selection`: Hier werden die aktuellen Auswahlen des Nutzers vorgehalten.
 * `app.status`: Einige interne Variablen zum Status der Anwendung.
 * `app.view`: Einige Informationen zur Verwaltung der Sichten. Hier wird beispielsweise die aktuelle Position der verschiebbaren Elemente gespeichert.

Für einige dieser Objekte folgen detailliertere Informationen.

## app.configuration

Hier werden Konfigurationen festgehalten. Wie oben bereits erwähnt, werden die Inhalte von `app.configuration` nicht im Programmverlauf geändert. Sie können (und sollten) aber vom Programmierer auf gewünschte Werte gesetzt werden. Dazu ändert man die entsprechenden Einträge in der `main.js`.

### app.configuration.colors

Im Moment enthält dies nur eine Konfiguration, die Definition der Farbskalen unter `app.configuration.colors`. Das ist ein Objekt, dass als Schlüssel eine id der jeweiligen Farbskala enthält und als Werte die Definition dieser. Diese Konfiguration wird bei der Initialisierung genutzt, um den Farbauswahldialog zu konfigurieren. Alle definierten Farbskalen tauchen sowohl als Skala für positive als auch für negative Farbwerte auf (bei letzteren wird die Richtung umgedreht).

Das Objekt enthält zwei Attribute `title` und `scale`. `title` definiert den Anzeigename, der im Farbauswahldialog angezeigt wird. `scale` definiert die Farbskala selbst.

```
"RdYlBu":
{
	title: "Rot - Gelb - Blau",
	scale: "RdYlBu",
},
```
In diesem Beispiel wird eine Skala mit der ID `RdYlBu` definiert. Der Name wird als "Rot - Gelb - Blau" gesetzt. Der `scale`-Wert enthält einen String, die ID einer entsprechenden Colorbrewer-Definition, die von chroma.js unterstützt wird. In dem Fall `RdYlBu`.

Colorbrewer-Definitionen sind aber nicht der einzige Weg eine Farbskala zu definieren:
```
"red_scale":
{
	title: "Orange - Rot",
	scale: ["orange", "red", "darkred"],
},
```
Hier wird die Farbskala mit einem Array von direkten Farbwerten definiert. Die Farben werden hier durch ihre Namen referenziert, aber die hexadezimalen Farbdefinitionen (`"#dd2277"`) gehen genauso. In dem Array können beliebig viele Stufen definiert werden, über diese Farbwerte wird der Verlauf definiert.

Mit chroma,js kann man auch Funktionen nutzen, was ich für die einfarbigen Skalen (eine Farbe von Hell nach Dunkel) genutzt habe:

```
"green_scale":
{
	title: "Grün",
	scale: [chroma("green").brighten(3), chroma("green").darken(3)],
},
```
Hier wird mit `chroma("green")` die Farbe grün erzeugt und dann mit `.brighten(3)` 3 Stufen heller gemacht oder mit `.darken(3)` entsprechend dunkler.

## app.data

## app.selection