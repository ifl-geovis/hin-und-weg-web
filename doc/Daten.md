# Datenaufbereitung

## Grundlagen

Die Daten werden im Unterverzeichnis `data` abgelegt, welches in Folge dann auch via Webserver abrufbar sein muss. Darin gibt es eine `data.json` mit grundlegenden Informationen und je ein Verzeichnis pro Datensatz. Diese Verzeichnisse sollten im Namen keine Leerzeichen und Sonderzeichen enthalten um Probleme zu vermeiden. In den Unterverzeichnissen liegt jeweils eine `info.json` mit Konfigurationsdateien, eine GeoJSON-Datei und mehrere CSV-Dateien.

## `data/data.json`

Die `data.json` enthält ein einfaches JSON-Array mit den Verzeichnisnamen. Dies ist notwendig, da im Webserver nicht immer ein Verzeichnis bereitgestellt wird (oft ist das abgeschaltet) und die Anwendung daher nicht erfahren kann welche verzeichnisse existieren. Eine beispielhafte `data.json` kann so aussehen:

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

## GeoJSON-Datei

Die GeoJSON-Datei kann einen beliebigen Namen haben, erneut sollten aber Leer- und Sonderzeichen vermieden werden.

Die GeoJSON-Datei wird im Koordinatensysten WGS84 (EPSG:4326) erwartet. Daten die in anderen Koordinatensystemen kann man mithilfe von GDAL transformieren mit folgendem Beispiel-Befehl:

```
ogr2ogr -f "GeoJSON" -s_srs "EPSG:25832" -t_srs "EPSG:4326" DE_Bundeslaender_new.geojson DE_Bundeslaender.geojson
```
In diesem Beispiel wird von `EPSG:25832` (Parameter `-s_srs`) nach `EPSG:4326` (Parameter `-t_srs`) konvertiert. Das Ergebnis wird in der Datei `DE_Bundeslaender_new.geojson` gespeichert, die Quelle war `DE_Bundeslaender.geojson`. Es wird also das Ziel vor der Quelle angegeben.