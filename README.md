# DRINKQuick

Trink- und Gewichts-Tracker für Neugeborene. Die App beantwortet die drei Fragen,
die in den ersten Wochen wirklich zählen:

1. **Wann und wie viel hat mein Baby getrunken?**
2. **Reicht das für sein Gewicht und sein Alter?**
3. **Nimmt es so zu, wie es soll?**

Rund um diesen Kern lassen sich Windeln, Temperatur, Medikamente, Symptome und die
Vorsorgeuntersuchungen U1–U9 protokollieren.

Alles läuft **lokal auf dem Gerät**: kein Konto, kein Server, keine Übertragung von
Gesundheitsdaten. Die App ist als PWA installierbar und offline nutzbar – das ist
kein Nebeneffekt, sondern Voraussetzung dafür, dass man sie nachts um drei ohne
Netz benutzen kann.

## Funktionen

### Trinkverhalten und Menge

- **Schnelleintrag der Trinkmenge** auf dem Startbildschirm: drei große Knöpfe mit
  den Mengen, die das Kind um diese Uhrzeit sonst trinkt – ein Tipp, fertig.
  Die Vorschläge stammen aus den Flaschen der letzten drei Wochen im Zeitfenster
  ±2 Stunden um jetzt (etwas weniger / wie üblich / etwas mehr); reichen die
  Einträge dort nicht, weitet sich der Blick auf den ganzen Tag, und am Anfang
  steht der Richtwert aus Gewicht und Lebenstag. Jeder Eintrag lässt sich
  direkt danach zurücknehmen.
- **Still-Timer** auf dem Trinken-Tab, der aus Zeitstempeln rechnet: läuft weiter,
  wenn das Display aus ist, die App im Hintergrund liegt oder das Telefon neu
  startet. Mit Pause, Seitenwechsel und Verwerfen. Ein laufender Timer bleibt
  auch auf dem Startbildschirm sichtbar.
- **Flasche** in 5-ml-Schritten, mit Voreinstellungen und Inhalt (Muttermilch,
  Pre, Folgemilch).
- **Abpumpen** getrennt erfasst – es zählt nicht als Mahlzeit des Kindes.
- **Soll-Trinkmenge** aus aktuellem Gewicht und Lebenstag, siehe unten.
- **Tagesbilanz**: Menge, Mahlzeiten, Ø Abstand, längste Pause, Nachtmahlzeiten,
  Zeit seit der letzten Mahlzeit.
- **Diagramme**: Menge/Mahlzeiten/Stillzeit pro Tag über 7, 14 oder 30 Tage,
  wahlweise als Balken (einzelne Tage) oder als Kurve (Verlauf), sowie eine
  Heatmap „wann getrunken wird“ (Tage × Stunden), die Cluster-Feeding und
  Nachtblöcke sichtbar macht. In der Kurve bleiben Tage ohne Eintrag eine Lücke
  statt einer Null – ein vergessener Eintrag soll sich nicht als „nichts
  getrunken“ lesen.

### Gewichtsüberwachung

- **WHO-Perzentilkurven** (P3/P15/P50/P85/P97) für Gewicht, Länge und Kopfumfang,
  geschlechtsgetrennt, berechnet nach der LMS-Methode – nicht abgezeichnet,
  sondern aus den offiziellen Koeffizienten gerechnet.
- **Perzentile und z-Wert** zu jeder Wägung.
- **Gewichtsabnahme nach der Geburt** in Prozent, mit Ampel bei 7 % und 10 %.
- **Wiedererreichen des Geburtsgewichts** inklusive Lebenstag – und einem Hinweis,
  wenn es nach Tag 14 noch nicht erreicht ist.
- **Zunahme in g/Tag** gegen den Erwartungsbereich für das jeweilige Alter.

### Gesundheit

- Windelprotokoll (nass / Stuhl / beides, Stuhlfarbe) mit Soll-Zahlen nach Lebenstag.
- Temperatur mit Einstufung und dem Hinweis, dass bei unter 3 Monate alten Babys
  ab 38,0 °C ärztlich abzuklären ist.
- Medikamente, Vitamin D, Symptome, Notizen.
- Vorsorgeuntersuchungen U1–U9 mit konkreten Terminfenstern aus dem Geburtsdatum.

### Auswertung und Weitergabe

- **Ampel auf dem Startbildschirm**: lange Trinkpause, zu wenige nasse Windeln,
  Gewichtsverlust, Fieber, zu geringe Zunahme – nach Dringlichkeit sortiert.
- **Druckbarer Bericht** für den Termin in der Praxis (14 Tage auf einer Seite).
- **Export** als JSON-Sicherung und als CSV (Semikolon + BOM, öffnet direkt in Excel).
- **Import** einer Sicherung, z. B. beim Gerätewechsel.
- Mehrere Profile für Zwillinge oder Geschwister.
- Hell/Dunkel/System – dunkel für die nächtlichen Mahlzeiten.

## Die Rechenregeln

Alle Richtwerte gelten für **reif geborene, gesunde Säuglinge** und sind
Orientierung, keine Behandlungsvorgabe.

**Tagestrinkmenge.** In der ersten Lebenswoche folgt die App der üblichen
aufsteigenden Staffel – Lebenstag 1: 60 ml/kg, Tag 2: 80, Tag 3: 100, Tag 4: 120,
Tag 5: 140, ab Tag 6: 150 ml/kg. Danach rechnet sie mit dem in den Einstellungen
hinterlegten Wert (Standard 150 ml/kg/Tag, einstellbar 100–200). Ab etwa 1000 ml
flacht die Empfehlung ab, weil ab dem Beikostalter die reine Milchmenge weniger
aussagt. Die Menge pro Mahlzeit ergibt sich aus der Tagesmenge geteilt durch die
altersübliche Zahl der Mahlzeiten.

Die ml-Bilanz wird **nur bei reiner Flaschenernährung bewertet**. Wird (auch)
gestillt, fehlt der Anteil an der Brust – dann führt die Zahl der Mahlzeiten, und
die Flaschenmenge steht als eigene Kennzahl daneben. Eine Warnung „zu wenig
getrunken“ wäre in diesem Fall schlicht falsch.

**Gewicht.** Der z-Wert einer Messung folgt der LMS-Formel der WHO:
`z = ((x/M)^L − 1) / (L·S)`. Die LMS-Koeffizienten für Gewicht, Länge und
Kopfumfang von Tag 0 bis Tag 730 liegen in `src/lib/who/tables.ts` und werden mit
`scripts/generate-who-data.mjs` aus den offiziellen WHO-Tabellen erzeugt.
Eine Abnahme bis etwa 7 % des Geburtsgewichts in den ersten Tagen gilt als
physiologisch, das Geburtsgewicht sollte nach rund zwei Wochen wieder erreicht sein.

**Windeln.** Erwartet werden ab Lebenstag 1 aufsteigend 1 bis 6 nasse Windeln pro
Tag; ab Tag 6 sind es dauerhaft etwa 6. Das ist im Alltag der verlässlichste
Hinweis darauf, dass genug ankommt.

## Technik

- React 19 + TypeScript, Vite, keine Laufzeit-Abhängigkeiten außer React.
- Persistenz in IndexedDB mit localStorage als Rückfallebene.
- Diagramme als handgeschriebenes SVG – kein Chart-Framework, damit das Bundle
  klein bleibt und die Darstellung in beiden Farbschemata kontrolliert ist.
- Service Worker für den Offline-Betrieb; er cacht ausschließlich eigene Dateien.
- Die WHO-Tabellen liegen in einem eigenen Chunk und werden nur geladen, wenn der
  Gewichts-Tab sie braucht.

### Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Vitest (Domänenlogik)
npm run typecheck  # tsc
npm run lint       # ESLint
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Die WHO-Tabellen neu erzeugen:

```bash
npm i -D who-growth-standards
node scripts/generate-who-data.mjs
```

## Datenschutz

Es gibt keinen Server und kein Konto. Die Daten liegen ausschließlich in der
Datenbank des Browsers auf dem Gerät. Deshalb: **vor einem Gerätewechsel eine
JSON-Sicherung exportieren.** Wer den Browserspeicher der Seite löscht, löscht
auch die Einträge.

## Haftungsausschluss

DRINKQuick ist ein Protokoll- und Rechenwerkzeug, **kein Medizinprodukt**. Die
Richtwerte ersetzen keine Beratung durch Hebamme, Kinder- und Jugendarztpraxis
oder Stillberatung. Bei Sorgen um das Trinkverhalten oder das Gedeihen wende dich
bitte immer an eine Fachperson.

Die Referenzkurven basieren auf den [WHO Child Growth
Standards](https://www.who.int/tools/child-growth-standards). Das Projekt ist von
der WHO weder geprüft noch unterstützt oder zertifiziert.
