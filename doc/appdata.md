# Applikations-Objekt

Das Applikations-Objekt ist ein zentrales Objekt um die Daten für die Anwendung zu halten. hier ist immer der aktuelle Stand der Anwendung ablesbar. Beispielsweise kann man durch Abfrage von `app.selection.area_id` immer die ID der aktuell ausgewählten Fläche in Erfahrung bringen. Es war zentral die Daten in dem Applikations-Objekt immer aktuell zum Zustand der Anwendung zu halten, um das Objekt als konsistente Referenz zu haben.

Die initialen Werte des Objekt werden am Anfang der `main.js` definiert. Diese Werte können danach durch den weiteren Programmablauf geändert werden.

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

Hier werden die Daten der Anwendung verwaltet. Einige wichtige Werte sind:

 * `app.data.geodata`: Der komplette Inhalt der geladenen GeoJSON-Datei, also die Geometrien und ihre Attribute.
 * `app.data.migrations`: Die Migrations-CSV des Datensatzes. das Objekt enthält alle, mit jeweils dem in der `info.json` definierten Schlüssel hier ebenfalls als Schlüssel zu den entsprechenden Daten. Die CSV-Daten sind hier als der von Papaparse erzeugten Output abgelegt, enthalten also neben den eigentlichen Daten (`data`) auch einige Metadaten vomm Parsingsprozess.
 * `app.data.population`: Die Populations-Daten (wenn vorhanden). Hier auch die von Papaparse erzeugten Objekte.
 * `app.data.category_mapping`, `app.data.centroid_mapping`, `app.data.dataset_mapping`: Mehrere Mapping-Objekte für die Erzeugung von Auswahllisten und ähnliche Selektionen. Enthalten jeweils das Mapping von einem Schlüssel auf zugehörige Daten.
 * `app.data.geostats`, `app.data.geostats_positive`, `app.data.geostats_negative`: Die geostats-Objekte. Dabei enthält `app.data.geostats` die originalen Daten und kann zur korrekten Erzeugung der Statistiken genutzt werden, kann aber je nach Algorithmus scheitern bei den Klassen. Die `_negative`- und `_positive`-Varianten enthalten nur die negativen und positiven Werte und sind zudem mit zusätzlichen Nullen gepadded, damit instabile Algorithmen wie Jenks nicht so leicht scheitern (was bei wenigen Werten passieren) und die erzeugten Legenden bis zur Null reichen. Allerdings sind sie damit unbrauchbar zur Berechnung der Statistiken. Also die Variante ohne Zusatz ist zur Berechnung der Statistiken, die anderen zur Klassifizierung und zur Legendenerzeugung.
 * `app.data.processed` und `app.data.unfiltered`: Die Objekte der prozessierten Daten. Werden bei jedem Aufruf von `process_selections()` neu berechnet (also nach jeder vom Nutzer getroffenen Auswahl).

### app.data.processed/unfiltered

Interessant zur Nutzung dürften hier in erster Linie `app.data.processed` und `app.data.unfiltered` sein. Beide enthalten die komplett prezessierten Werte der aktuellen Auswahl. Der Unterschied ist, dass bei `processed` die Filter angewendet werden, um Werte wegzulassen. `unfiltered` dagegen enthält die Werte für alle Flächen. Beides sind Arrays von Objekten. Die Objekte stehen jeweils für eine Fläche.

Die Objekte enthalten folgende Werte:

 * `fromid`, `toid`: die ID der Flächen für jeweils Quelle und Ziel der Migration
 * `fromname`, `toname`: die zu den Flächen gehörenden Namen
 * `id`: dies entspricht der nicht selektierten Fläche (bei Thema 'Von' identisch mit `toid` und bei 'Nach' mit `fromid`)
 * `migrations`: enthält den zugehörigen kumulierten Migrationswert für die Jahre (bei Wanderungsrate ist es die durchschnittliche Wanderungsrate)
 * `color`: die nach der Klassifikation zugehörige Farbe zu der Fläche

## app.selection

In `app.selection` ist immer der aktuelle Stand der Selektionen durch den Nutzer geführt. Folgende Werte sind enthalten:

 * `app.selection.dataset_id`: ID des aktuell gewählten Datensatzes
 * `app.selection.dataset`: die `info.json` des aktuell gewählten Datensatzes
 * `app.selection.category_id`: ID der aktuellen Datenkategorie
 * `app.selection.category`: die aktuell gewählte Datenkategorie
 * `app.selection.map_opacity`: Transparenz der Flächen
 * `app.selection.labels`: Auswahl für die Kartenlabels
 * `app.selection.swoopy_arrows`: Visualisierung der Bewegungen mit Pfeilen
 * `app.selection.theme`: aktuell gewähltes Thema
 * `app.selection.data_interpretation`: absolut oder Wanderungsrate
 * `app.selection.area_id`: ID der aktuellen Fläche
 * `app.selection.area_inside`: Boolean-Wert für die Frage, ob Umzüge innerhalb der Fläche berücksichtigt werden
 * `app.selection.years`: selektierte Jahre
 * `app.selection.filter`: Filter
 * `app.selection.classification`: Klassifikation
 * `app.selection.class_number`: Klassenzahl
 * `app.selection.class_number_negative`: Klassenzahl für negative Werte
 * `app.selection.classborders`: selbstgewählte Klassengrenzen
 * `app.selection.classborders_negative`: selbstgewählte Klassengrenzen für negative Werte
 * `app.selection.colors`: Farbschema
 * `app.selection.colors_negative`: Farbschema für negative Werte

Jede Änderung hier sollte gefolgt werden von einem Aufruf von `process_selections()`, um die für diese Selektionen getätigten Einstellungen in den prozessierten Werten zu reflektieren.