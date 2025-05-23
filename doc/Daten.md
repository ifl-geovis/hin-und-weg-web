# Datenaufbereitung

## Grundlagen

Die Daten werden im Unterverzeichnis `data` abgelegt, welches in Folge dann auch via Webserver abrufbar sein muss. Darin gibt es eine `data.json` mit grundlegenden Informationen und je ein Verzeichnis pro Datensatz. Diese Verzeichnisse sollten im Namen keine Leerzeichen und Sonderzeichen enthalten um Probleme zu vermeiden. In den Unterverzeichnissen liegt jeweils eine `info.json` mit Konfigurationsdateien, eine GeoJSON-Datei und mehrere CSV-Dateien.

## `data/data.json`

Die `data.json` enthält ein einfaches JSON-Array mit den Verzeichnisnamen. Dies ist notwendig, da im Webserver nicht immer ein Verzeichnis bereitgestellt wird (oft ist das abgeschaltet) und die Anwendung daher nicht erfahren kann welche Verzeichnisse existieren. Eine beispielhafte `data.json` kann so aussehen:

```
[
"test",
"bund",
"blafoo"
]
```

Hiermit wird angezeigt, dass die Unterverzeichnisse `data/test`, `data/bund` und `data/blafoo` abgefragt werden. In diesen Unterverzeichnissen muss dann jeweils eine `info.json`, eine GeoJSON-Datei und die CSV-Dateien liegen. Man sollte beachten, dass Sonderzeichen oder Leerzeichen bei der Konversion zu URLs Probleme bereiten können. Außerdem sollte man beachten, dass zwar unter Windows Groß- und Kleinschreibung egal ist, aber nicht unter Unix-Systemen. Daher wird oben ein Verzeichnis `bund` gefunden, aber kein Verzeichnis `Bund` oder `BUND`. Wenn die Groß/Kleinschreibung entsprechend ist, muss das auch so in der `data.json` vermerkt werden.

## Datensatz-Verzeichnis

Im Datensatz-Verzeichnis liegt eine `info.json`, eine GeoJSON-Datei und mehrere CSV-Dateien. Ist keine `info.json` abrufbar, wird das Verzeichnis ignoriert und erscheint nicht in der Auswahl in der Anwendung.

## `info.json`

In jedem der Unterverzeichnisse liegt eine `info.json`-Datei, die die weiteren Informationen zu dem Datensatz beschreibt. Hier ein Beispiel:

```
{
	"name": "bundesweite Daten",
	"title": "Migrationen zwischen den Bundesländern",
	"geodata": "DE_Bundeslaender.geojson",
	"id_property": "NUTS_CODE",
	"name_property": "NUTS_NAME",
	"categories":
	[
		{
			"id": "all",
			"name": "Gesamtdaten",
			"population": "Bevölkerung_Bundesländer/Bevölkerung_Bundesländer_insgesamt_2000-2020.csv",
			"migrations":
			{
				"2000": "Binnenwanderungen_ingesamt_2000-2020/BWinsg2000.csv",
				"2001": "Binnenwanderungen_ingesamt_2000-2020/BWinsg2001.csv"
			}
		},
		{
			"id": "female",
			"name": "weiblich",
			"population": "Bevölkerung_Bundesländer/Bevölkerung_Bundesländer_weiblich_2000-2020.csv",
			"migrations":
			{
				"2000": "Binnenwanderungen_w_2000-2020/BWw2000.csv",
				"2001": "Binnenwanderungen_w_2000-2020/BWw2001.csv"
			}
		},
		{
			"id": "male",
			"name": "männlich",
			"population": "Bevölkerung_Bundesländer/Bevölkerung_Bundesländer_männlich_2000-2020.csv",
			"migrations":
			{
				"2000": "Binnenwanderungen_m_2000-2020/BWm2000.csv",
				"2001": "Binnenwanderungen_m_2000-2020/BWm2001.csv",
			}
		}
	]
}
```

Wie man sieht ist die `info.json` ein Objekt. Es enthält als Basis einige Attribute, die grundlegende Dinge beschreiben:

 * `name`: der Name der in der Auswahlliste angezeigt wird (als ID wird der Name des Verzeichnisses benutzt)
 * `title`: der Titel wird in der Titelzeile der Anwendung angezeigt, wenn man den Datensatz ausgewählt hat
 * `geodata`: gibt den Dateinamen der geojson-Datei mit den Geodaten an
 * `id_property` und `name_property`: gibt die Properties in der geojson an, mit der ID und Name der jeweiligen Geometrie bestimmt werden, die ID muss mit der Angabe in der CSV übereinstimmen

Dann gibt es ein Array mit den Kategories (`categories`). Dies ist ein Array von Objekten, jedes repräsentiert eine Datenkategorie. Auch hier gibt es einige Attribute.

 * `id`: ID der Kategorie (muss eindeutig sein)
 * `name`: der in der Auswahl angezeigte Name
 * `population`: Dateiname einer CSV-Datei mit den Populationsdaten, kann weggelassen werden, nur wenn vorhanden werden Wanderungsraten damit berechnet

Und jede Kategorie enthält ein Objekt mit den Migrationsdaten (`migrations`). Dieses Objekt enthält als Schlüssel das Jahr (obwohl man prinzipiell da auch andere Strings eintragen könnte wie Q1 2024). Als jeweiliger Wert ist der Dateiname der korrespondierenden CSV-Datei mit den Migrationsdaten angegeben.

Alle Dateinamen (`geodata`, `population`, `migrations`) sind relativ zu dem Verzeichnis in dem die `info.json` liegt. Die Reihenfolge in `categories` und `migrations` bleibt auch die relevante Reihenfolge die in den Selektionen angezeigt wird.

## GeoJSON-Datei

Die GeoJSON-Datei kann einen beliebigen Namen haben, erneut sollten aber Leer- und Sonderzeichen vermieden werden.

Hat man Daten in anderen Formaten als GeoJSON, kann man den Befehl `ogr2ogr` aus GDAL benutzen, um sie in das GeoJSON-Format zu überführen. Hier ist ein Beispiel-Befehl:

```
ogr2ogr DE_Bundeslaender.geojson DE_Bundeslaender.shp -f "GeoJSON"
```
In diesem Beispiel wird die Shape-Datei `DE_Bundeslaender.shp` in die GeoJSON-Datei `DE_Bundeslaender.geojson` konvertiert.

Die GeoJSON-Datei wird im Koordinatensysten WGS84 (EPSG:4326) erwartet. Daten die in anderen Koordinatensystemen kann man mithilfe von GDAL transformieren mit folgendem Beispiel-Befehl:

```
ogr2ogr -f "GeoJSON" -s_srs "EPSG:25832" -t_srs "EPSG:4326" DE_Bundeslaender_new.geojson DE_Bundeslaender.geojson
```
In diesem Beispiel wird von `EPSG:25832` (Parameter `-s_srs`) nach `EPSG:4326` (Parameter `-t_srs`) konvertiert. Das Ergebnis wird in der Datei `DE_Bundeslaender_new.geojson` gespeichert, die Quelle war `DE_Bundeslaender.geojson`. Es wird also das Ziel vor der Quelle angegeben.