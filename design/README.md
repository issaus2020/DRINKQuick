# Design-Canvas

Die Quelldateien der Gestaltungsentwürfe. Jede `.dc.html` ist ein Artboard,
`canvas.json` legt Anordnung, Notizen und Startansicht fest. Aus diesen Dateien
wird die veröffentlichte Leinwand neu erzeugt; die erzeugte HTML-Datei liegt
bewusst nicht im Repository (siehe `.gitignore`).

## `orbit-aurora/` – die beiden Gestaltungsrichtungen

- **Variante A · Orbit** (`Main.dc.html`, `A_Verlauf.dc.html`, `A_Objekte.dc.html`) –
  dunkles Cockpit, 24-Stunden-Zifferblatt, datendicht.
- **Variante B · Aurora** (`B_Heute.dc.html`, `B_Gewicht.dc.html`, `B_Objekte.dc.html`) –
  hell und organisch. **Diese Richtung ist übernommen worden**, Farben wie
  Aufbau; siehe Abschnitt „Gestaltung“ im Haupt-README.

## `satt-baby/` – das Baby statt des Fläschchens

Vorschlag, den Füllstand auf „Heute“ als Baby zu zeigen, dessen Magen sich füllt
und dessen Gesichtszüge mit dem Füllstand fröhlicher werden.

- `Main.dc.html` – die Figur groß, mit einem Regler für den Füllstand.
- `Zustaende.dc.html` – sechs Stufen nebeneinander.
- `Heute.dc.html` – im Zusammenhang auf dem Startbildschirm.
- `_parts.py` – erzeugt die beiden letzten aus derselben Figurbeschreibung, damit
  sie nicht auseinanderlaufen. Nach einer Änderung an der Figur beide neu bauen.

Zwei Festlegungen, die im Entwurf stecken und beim Übernehmen erhalten bleiben
sollten:

- **Die untere Stufe ist ruhig, nicht traurig.** Morgens ist der Magen
  zwangsläufig leer; ein trauriges Baby wäre dann ein Vorwurf. Die Skala läuft
  ruhig → zufrieden → fröhlich → satt, der Mund geht nie nach unten.
- **Kein Hautton.** Die Figur ist eine Linienzeichnung; gefüllt ist nur der
  Bauch. Was an Farbe zu sehen ist, ist ausschließlich die Trinkmenge.

## Schriften

Die Artboards der Richtungen A und B laden Instrument Serif und Outfit von
Google Fonts. Die App tut das nicht – dort steht eine System-Serife, damit nichts
an Dritte übertragen wird und alles offline funktioniert. Die Baby-Artboards
verwenden von vornherein dieselben System-Schriften wie die App.
