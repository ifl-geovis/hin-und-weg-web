# Grundlagen

## generelle Struktur und Ausführung

Dieses Projekt hat zwei Unterverzeichnisse: `doc` und `src`. Im Verzeichnis `doc` ist diese Programmierdokumentation enthalten. In `src` befindet sich das eigentliche Projekt.

Das Projekt nutzt grundlegend nur HTML, CSS und Javascript. Es gibt keinen Buildprozess und keine serverseitigen Komponenten. Dies erlaubt es die Dateien im Verzeichnis `src` mit einem beliebigen Webserver der statische Dateien ausliefert (bspq. Apache Webserver, nginx oder lighthhtpd) bereitzustellen und alle weitere Ausführung findet im Browser statt.

Da Daten per Javascript-fetch geladen werden, kann man allerdings nicht einfach die HTML im Browser laden. Zur Entwicklung bietet sich an einen lokalen simplen Webserver zu benutzen, wie [darkhttpd](https://github.com/emikulic/darkhttpd) (Kommandozeilen-Webserver, der mit einem Verzeichnis als Parameter gestartet wird und dieses auf localhost:8080 ausliefert).

Zur Entwicklung empfiehlt es sich die Developer-Tools von Browsern zu benutzen. In den meisten Browsern wird dieses mit F12 geöffnet.

Da kein Buildprozess nötig ist, genügt es bei Änderungen einen Reload im Browser auszulösen. Es ist zu beachten, dass viele Browser aktiv Dateien cachen und daher der Reload komplett sein muss. Dazu kann man in den Dev-Tools im Netzwerktab die Option *'Disable cache'* aktivieren.

## Basisdateien

Es existiert grundlegend eine `index.html`. Diese wird in grundlegenden Webserver-Einstellungen auch dann geladen, wenn nur der Basispfad angegeben wird. In der index.html werden CSS und Javascript geladen.

Es gibt zwei weitere HTML-Dateien, `datenschutz.html` und `impressum.html`. Diese sind in der Anwendugn verlinkt (unten links beim Logo). Diese HTML-Seiten sind derzeit außer einem HTML-Gerüst leer und können vom IfL nach Bedarf gefüllt werden.

Die `main.css` enthält die von der Anwendung benutzten Stildefinitionen. Sie wird in der `index.html` im Header geladen. Zudem liefern geostats und leaflet eigene Stildateien, die dort ebenfalls geladen werden.

Die anwendungsspezifischen Javascripte sind in mehreren Javascript-Dateien:

 * `main.js` (grundlegender Code)
 * `init.js` (Initialisierung der Anwendung)
 * `map.js` (kartenspezifischer Code)
 * `table.js` (Code für Statistik und Tabellendarstellung)
 * `util.js` (einige Helferfunktionen)

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