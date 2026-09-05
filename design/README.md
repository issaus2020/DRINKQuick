# Design-Canvas

Die Quelldateien der Gestaltungsvorschläge. Jede `.dc.html` ist ein Artboard,
`canvas.json` legt Anordnung, Notizen und Startansicht fest.

- **Variante A · Orbit** (`Main.dc.html`, `A_Verlauf.dc.html`, `A_Objekte.dc.html`) –
  dunkles Cockpit, 24-Stunden-Zifferblatt, datendicht.
- **Variante B · Aurora** (`B_Heute.dc.html`, `B_Gewicht.dc.html`, `B_Objekte.dc.html`) –
  hell und organisch. **Diese Richtung ist in die App übernommen worden**, siehe
  Abschnitt „Gestaltung“ im Haupt-README.

Die veröffentlichte Leinwand wird aus diesen Dateien neu erzeugt; die erzeugte
HTML-Datei liegt bewusst nicht im Repository (siehe `.gitignore`).

Hinweis zu den Schriften: die Artboards laden Instrument Serif und Outfit von
Google Fonts. Die App tut das nicht – dort steht eine System-Serife, damit
nichts an Dritte übertragen wird und alles offline funktioniert.
