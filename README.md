# DRINKQuick

Trink- und Gewichts-Tracker für Neugeborene. Die App beantwortet die drei Fragen,
die in den ersten Wochen wirklich zählen:

1. **Wann und wie viel hat mein Baby getrunken?**
2. **Reicht das für sein Gewicht und sein Alter?**
3. **Nimmt es so zu, wie es soll?**

Rund um diesen Kern lassen sich Windeln, Temperatur, Medikamente, Symptome und die
Vorsorgeuntersuchungen U1–U9 protokollieren.

Die App läuft **lokal auf dem Gerät**: als PWA installierbar, offline nutzbar,
und ohne Konto verlässt kein Gesundheitsdatum das Telefon. Das ist kein
Nebeneffekt, sondern Voraussetzung dafür, dass man sie nachts um drei ohne Netz
benutzen kann. Wer die Einträge zu zweit führen will, kann optional ein Konto
anlegen und einen Familien-Bereich teilen – siehe unten.

## Funktionen

### Trinkverhalten und Menge

- **Name und Zitat über der Figur.** Über dem Baby steht der Name des Kindes,
  darunter ein Satz für die Person, die das Protokoll führt – gebunden an den
  Kalendertag, damit er nicht bei jedem Antippen wechselt. Aufgenommen sind nur
  Zitate mit belegter Herkunft und Sprichwörter ohne Urheber; die vielen schönen
  Sätze mit falscher Zuschreibung („Wurzeln und Flügel“ als Goethe) stehen
  bewusst nicht dort. Wie die App dich anspricht – „Mama“, „Papa“ oder dein
  Name – stellst du unter *Mehr → Anrede* ein; ohne Angabe grüßt sie ohne
  Anrede, statt zu raten.
- **Der Kopf des Startbildschirms** beantwortet die eine Frage, die um sechs
  Uhr morgens und um drei Uhr nachts zählt: Anrede mit Namen, darunter groß,
  wie viel bis zum Richtwert noch fehlt, dazu ein Satz zur Lage des Tages. Wird
  auch gestillt, steht dabei, dass Stillmahlzeiten in der Menge nicht stecken –
  lieber eine ehrliche Einschränkung als eine Zahl, die es so nicht gibt. Ohne
  Wägung führen die Mahlzeiten statt der Milliliter.
- **Schnelleintrag der Trinkmenge** auf dem Startbildschirm: ein Regler, der
  schon auf der Menge steht, die das Kind um diese Uhrzeit sonst trinkt – der
  häufige Fall bleibt damit ein einziger Tipp auf „Eintragen“, und die eine
  Zeile spart gegenüber einer Knopfreihe so viel Platz, dass das Baby ohne
  Scrollen sichtbar bleibt. Die gewohnte Menge ist der Median der Flaschen der
  letzten drei Wochen im Zeitfenster ±2 Stunden um jetzt; reichen die Einträge
  dort nicht, weitet sich der Blick auf den ganzen Tag, und am Anfang steht der
  Richtwert aus Gewicht und Lebenstag. Jeder Eintrag lässt sich direkt danach
  zurücknehmen.
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
- **Nächste Mahlzeit und Tagesplan** auf dem Startbildschirm: aus den Abständen
  der letzten zehn Tage – bevorzugt zu dieser Tageszeit – ergibt sich, wann die
  nächste Mahlzeit ansteht, dazu ein Zeitfenster statt einer Uhrzeit auf die
  Minute. Darunter verteilt sich die noch offene Menge auf die Mahlzeiten bis
  Mitternacht; die Zeitpunkte danach gehören zum nächsten Tag und tragen die
  gewohnte Portion. Passt der Rest nicht mehr hinein, sagt die App genau das,
  statt zu größeren Flaschen zu drängen – „Hunger geht vor Uhrzeit“ steht
  bewusst daneben. Nachtmahlzeiten werden markiert und erklärt, nicht
  wegoptimiert.
- **Diagramme**: Menge/Mahlzeiten/Stillzeit pro Tag über 7, 14 oder 30 Tage,
  wahlweise als Balken (einzelne Tage) oder als Kurve (Verlauf), sowie eine
  Heatmap „wann getrunken wird“ (Tage × Stunden), die Cluster-Feeding und
  Nachtblöcke sichtbar macht. In der Kurve bleiben Tage ohne Eintrag eine Lücke
  statt einer Null – ein vergessener Eintrag soll sich nicht als „nichts
  getrunken“ lesen.

- **Schlaf erfassen.** Ein Schalter auf „Heute“ startet und beendet eine
  Schlafphase; wer nachts nicht zur App greift, trägt sie morgens von–bis nach.
  Die laufende Phase ist ein Eintrag ohne Ende – dadurch braucht sie keinen
  Zustand neben den Daten und wandert beim Abgleich aufs andere Gerät. Bleibt
  ein Eintrag über zwölf Stunden offen, weist die App darauf hin, dass da
  vermutlich das Aufwachen untergegangen ist.
- **Ruhe bzw. Schlaf heute.** Sobald Schlaf erfasst ist, rechnet die Karte
  damit und heißt „Schlaf heute“; eine Nacht über Mitternacht zählt nur mit
  ihrem heutigen Teil, eine laufende Phase bis jetzt. Ohne erfassten Schlaf
  schätzt sie aus den Mahlzeiten und heißt „Ruhe heute“. Vorn steht die längste
  zusammenhängende Phase – die macht im
  Alltag den Unterschied –, daneben die Summe, die Zahl der Phasen über einer
  Stunde und die Unterbrechungen der Nacht, dazu der Referenzbereich für das
  Alter (0–3 Monate 14–17 Std, 4–11 Monate 12–15 Std, nach den Empfehlungen der
  National Sleep Foundation). **Die App misst keinen Schlaf**: sie kennt nur
  Mahlzeiten und rechnet, was dazwischen liegt, mit 30 Minuten angenommener
  Wachzeit je Mahlzeit ohne erfasste Dauer. Die Summe ist deshalb ausdrücklich
  eine Obergrenze und als solche beschriftet – wach im Bett und Schreien zählen
  darin mit.

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
- **Blähungen** mit einem Tipp erfassen und gegen das Trinkverhalten auswerten:
  Die App vergleicht die Mahlzeiten, auf die innerhalb von drei Stunden ein
  Eintrag folgte, mit allen übrigen – Portionsgröße, Trinkgeschwindigkeit,
  Tageszeit und Flascheninhalt. Ein Befund erscheint erst ab sechs Mahlzeiten je
  Seite und mindestens 15 % Unterschied, und immer mit dem Satz, dass das
  Zusammenhänge sind und keine Ursachen. Dazu allgemeine Maßnahmen (aufstoßen
  lassen, aufrecht füttern, langsamerer Fluss, Luft aus der Flasche halten,
  Bauchmassage, kleinere Portionen) und die Grenze: über einen Wechsel der
  Nahrung oder Medikamente entscheidet die Kinderarztpraxis.
- Vorsorgeuntersuchungen U1–U9 mit konkreten Terminfenstern aus dem Geburtsdatum.

### Konto und Teilen (optional)

- **Ohne Konto bleibt alles wie bisher**: kein Server, keine Übertragung, alle
  Daten auf dem Gerät. Das ist der Auslieferungszustand.
- **Mit Konto** teilen sich mehrere Geräte einen Familien-Bereich: beide Eltern,
  Großeltern oder eine Betreuungsperson sehen und bearbeiten dieselben Einträge.
  Eingeladen wird per achtstelligem Code, der sieben Tage gilt und einmal
  eingelöst werden kann.
- **Lokal bleibt die Wahrheit.** Die Anzeige kommt immer aus der Datenbank im
  Browser, nie aus dem Netz – die App funktioniert um drei Uhr nachts ohne
  Empfang genauso wie mit. Der Abgleich läuft im Hintergrund: beim Start, beim
  Zurückkehren in den Vordergrund, kurz nach jeder Änderung und sonst einmal
  pro Minute.
- **Konflikte** löst der Abgleich mit „die zuletzt geänderte Fassung gewinnt".
  Das trägt hier weiter als es klingt: Mahlzeiten, Windeln und Wägungen sind
  eigenständige Einträge mit eigener ID – tragen beide Eltern gleichzeitig
  etwas ein, entstehen zwei Einträge und kein Konflikt. Entschieden werden muss
  nur, wenn dieselbe Zeile auf zwei Geräten geändert wurde.
- **Gelöschtes bleibt gelöscht.** Ein Eintrag wird markiert statt entfernt, sonst
  käme er beim nächsten Abgleich vom anderen Gerät zurück.

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

**Rhythmus und Tagesplan.** Der erwartete Zeitpunkt der nächsten Mahlzeit ist der
Median der Abstände der letzten zehn Tage, bevorzugt derer im Fenster ±2 Stunden
um die aktuelle Uhrzeit (ab fünf Beobachtungen; sonst über den ganzen Tag ab
drei). Abstände unter 10 Minuten und über 10 Stunden fallen heraus – das sind
Doppeleinträge und Protokolllücken, keine Rhythmen. Das gezeigte Fenster ist das
25.- bis 75.-Perzentil derselben Abstände. Die offene Tagesmenge wird nur auf die
geplanten Mahlzeiten **vor Mitternacht** verteilt; alles danach zählt auf den
nächsten Tag. Reicht der gewohnte Takt vor Mitternacht nicht aus, rücken die
Mahlzeiten enger zusammen – bis auf zwei Stunden, nicht näher –, statt einer
einzigen Flasche die doppelte Menge aufzuladen; keine Portion geht über das
Anderthalbfache der gewohnten Menge, und was darüber offen bliebe, bleibt offen
und wird beziffert. Umgekehrt werden nur so viele Mahlzeiten belegt, wie der
Rest bei gewohnter Portion braucht - sonst ergäben 60 ml auf vier Plätze Portionen von
15 ml, die niemand füttert; die übrigen Zeitpunkte bleiben ohne Menge und die
App sagt, dass es dort nach Hunger geht. Die Aufteilung erfolgt in 5-ml-Schritten
mit der Rundungsdifferenz auf den vorderen Mahlzeiten, damit die Summe des Plans
die offene Menge trifft. Bezugsgröße für „wie gewohnt“ ist der Median der
Flaschen der letzten drei Wochen, nicht der rechnerische Richtwert - sonst
warnte die App vor einer Menge, die längst normal ist. Liegt die errechnete
Portion über dem 1,2-fachen davon, warnt sie, ab dem 1,5-fachen rät sie
ausdrücklich ab.

**Blähungen.** Ein Eintrag wird der letzten Mahlzeit zugeordnet, die höchstens
drei Stunden davor lag, und jede Mahlzeit höchstens einmal. Verglichen werden
dann die betroffenen mit den unauffälligen Mahlzeiten. Ein Befund erscheint nur,
wenn beide Gruppen mindestens sechs Mahlzeiten umfassen und der Unterschied
mindestens 15 % beträgt. Das bleibt eine Beobachtung an kleinen Zahlen – die App
sagt das auch dazu.

**Gewicht.** Der z-Wert einer Messung folgt der LMS-Formel der WHO:
`z = ((x/M)^L − 1) / (L·S)`. Die LMS-Koeffizienten für Gewicht, Länge und
Kopfumfang von Tag 0 bis Tag 730 liegen in `src/lib/who/tables.ts` und werden mit
`scripts/generate-who-data.mjs` aus den offiziellen WHO-Tabellen erzeugt.
Eine Abnahme bis etwa 7 % des Geburtsgewichts in den ersten Tagen gilt als
physiologisch, das Geburtsgewicht sollte nach rund zwei Wochen wieder erreicht sein.

**Windeln.** Erwartet werden ab Lebenstag 1 aufsteigend 1 bis 6 nasse Windeln pro
Tag; ab Tag 6 sind es dauerhaft etwa 6. Das ist im Alltag der verlässlichste
Hinweis darauf, dass genug ankommt.

## Gestaltung

Die Oberfläche folgt der Richtung **Aurora**: heller, warmer Grund mit drei
weichen Lichtwolken, die sich über 30 bis 50 Sekunden bewegen, ein feines Korn
darüber, und Karten aus mattem Glas, die auf dieser Fläche liegen statt sie
zuzudecken. Die eine große Zahl je Bildschirm steht in einer Serife
(`--font-display`), alles Übrige in der System-Schrift; Tabellen und Listen
behalten die tabellarischen Ziffern.

Auch der **Aufbau** der Bildschirme folgt den Entwürfen:

- **„Heute"** beginnt mit der Frage, wo der Tag steht: Überschrift, dann das
  Gefäß mit einer Kennzahlenspalte daneben (letzte Mahlzeit, Mahlzeiten,
  Ø Abstand). Erst danach kommen Schnelleingabe und Schnellzugriffe – die
  bleiben bewusst über der Falzkante, weil das nachts der häufigste Griff ist.
  Die Vorhersage trägt ein **Tagesband**: eine weiche Kurve, durchgezogen bis
  jetzt, gestrichelt weiter, mit einem Punkt je Mahlzeit und einem
  pulsierenden Ring für die erwartete nächste. Zwischen den geplanten
  Mahlzeiten steht die **Schlafzeit** – als Balken von jetzt bis sechs Uhr früh,
  mit eingefärbter Nacht, Strichen für die geplanten Mahlzeiten und den
  Schlafstrecken dazwischen; die längste ist hervorgehoben und steht als Zahl
  darunter. Für ein Neugeborenes ist die Zeit zwischen zwei Mahlzeiten kein Loch
  im Plan, sondern der Teil, auf den es für alle Beteiligten ankommt.
- **Erklärungen stecken hinter einem „i“.** Beim ersten Mal ist der Text nötig,
  beim fünfzigsten steht er zwischen der Person und der Zahl, wegen der sie die
  App geöffnet hat. Auf dem Zeigegerät genügt Zeigen, auf dem Telefon ein Tipp.
  Sicherheitsrelevante Sätze bleiben sichtbar – „Hunger geht vor Uhrzeit“ steht
  weiterhin ausgeschrieben da.
- **Die Schnelleingabe steht oben**, direkt unter der Überschrift und über dem
  Bild des Tages: Sie ist der häufigste Griff, und nachts um drei soll niemand
  dafür scrollen müssen. Statt einer Zahlenreihe
  stehen darunter drei Glaskacheln mit der Richtung der letzten Tage.
- **„Gewicht"** führt eine Leitzahl an – das aktuelle Gewicht – mit der
  Zunahme und dem Erwartungsbereich daneben; Perzentile und Bilanz zum
  Geburtsgewicht folgen als Kacheln.
- Die **Sparklines** in den Kacheln entfallen unter drei Messpunkten. Aus zwei
  Wägungen eine Richtung zu zeichnen wäre eine Behauptung, keine Beobachtung.

Bewusste Festlegungen:

- **Keine geladene Webschrift.** Die Entwürfe verwendeten Instrument Serif und
  Outfit von Google Fonts. In der App steht dort eine System-Serife: Die App
  überträgt keine Daten an Dritte und muss offline vollständig funktionieren –
  eine Schrift von einem fremden Server verträgt sich mit beidem nicht. Wer die
  Originalschnitte will, legt die woff2-Dateien nach `public/fonts/` und ergänzt
  `@font-face`.
- **Der Tagesfortschritt ist ein Baby**, kein Ring und kein Balken:
  `BellyBaby` füllt sich mit der Tagesmenge, die Wasserlinie sitzt exakt auf dem
  Anteil. Über dem Richtwert färbt sich die Füllung um, statt weiter zu steigen.
  Zwei Festlegungen darin sind Absicht:
  - **Die untere Stufe ist ruhig, nicht traurig.** Morgens ist der Magen
    zwangsläufig leer; ein trauriges Gesicht wäre dann ein Vorwurf. Die Züge
    laufen ruhig → zufrieden → fröhlich → satt, der Mund geht nie nach unten.
    Stufenlos wandern Mundbogen, Wangenröte und eine leichte Neigung mit; die
    Augen wechseln bei 72 % und über dem Ziel.
  - **Kein Hautton.** Die Figur ist eine Linienzeichnung im Strich des
    Icon-Sets, das „Papier" ist die Kartenfläche. Gefüllt ist nur der Bauch –
    was an Farbe zu sehen ist, ist ausschließlich die Trinkmenge.
  Die Sprachausgabe bekommt Stand und Stimmung als Satz: das Gesicht allein
  sagt einem Screenreader nichts.
- **Die Navigation schwebt** als Pille am unteren Rand; die Auswahl wandert als
  weiche Form mit (`--tab-index` aus React, der Rest in CSS).
- **Bewegung ist Schmuck.** Bei `prefers-reduced-motion: reduce` steht alles
  still – Lichtwolken, Wellen im Bauch, Marker. Das Bild bleibt dasselbe.
- **Dunkel ist kein Nachgedanke:** dieselben Farben als Dämmerung, gedämpfte
  Lichtwolken, dunkles Glas. Nachts um drei ist das der häufigere Fall.

## Technik

- React 19 + TypeScript, Vite, keine Laufzeit-Abhängigkeiten außer React.
- Persistenz in IndexedDB mit localStorage als Rückfallebene.
- Diagramme als handgeschriebenes SVG – kein Chart-Framework, damit das Bundle
  klein bleibt und die Darstellung in beiden Farbschemata kontrolliert ist.
- Service Worker für den Offline-Betrieb; er cacht ausschließlich eigene Dateien.
- Die WHO-Tabellen liegen in einem eigenen Chunk und werden nur geladen, wenn der
  Gewichts-Tab sie braucht.

### Konto und Teilen einrichten

Der geteilte Bereich braucht ein Supabase-Projekt. Das ist einmalige Arbeit von
etwa zehn Minuten; danach läuft es von selbst.

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen. **Bei der
   Region eine europäische wählen** (z. B. Frankfurt) – dann liegen die
   Gesundheitsdaten in der EU.
2. Im Projekt unter *SQL Editor* → *New query* den Inhalt von
   `supabase/schema.sql` einfügen und ausführen. Das legt die Tabellen, den
   Zugriffsschutz und die Funktionen für Einladungscodes an. Das Skript ist
   wiederholbar – ein zweiter Lauf macht nichts kaputt.
3. Die **Projekt-URL** unter *Settings* → *Data API* kopieren
   (`https://….supabase.co`).
4. Den **Schlüssel für den Browser** unter *Settings* → *API Keys* kopieren:
   - neue Projekte: Reiter *Publishable and secret API keys* → **Publishable
     key** (`sb_publishable_…`),
   - ältere Projekte: Reiter *Legacy API keys* → **anon key**.

   Beide funktionieren – nimm den, den dein Projekt anzeigt. **Niemals** den
   *secret key* bzw. *service_role*: der hebelt den Zugriffsschutz aus, und im
   Browser ist jeder Wert einsehbar.
5. Beide Werte als `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinterlegen:
   lokal in einer `.env`-Datei (Vorlage: `.env.example`), beim Hosting in den
   Umgebungsvariablen des Projekts. **Danach neu bauen bzw. neu deployen** –
   Vite backt die Werte beim Bauen ein, gespeicherte Variablen allein ändern
   eine schon gebaute Seite nicht.
6. Für Gast-Zugänge zusätzlich *Authentication* → *Sign In / Providers* →
   **Anonymous sign-ins** einschalten. Ohne das funktioniert nur der Beitritt
   mit eigenem Konto.
7. In der App anmelden, unter *Mehr* → *Konto & Teilen* einen Bereich anlegen
   und den Einladungslink verschicken.

#### Zwei Arten von Einladungslink

Unter *Konto & Teilen* gibt es den Link in zwei Ausführungen:

- **Zum Mitschreiben** – für die Person, die das Kind mit betreut. Sie sieht
  alles und trägt selbst ein.
- **Nur zum Ansehen** – für Großeltern, Hebamme oder Kinderärztin. Sie sehen
  jeden Eintrag, können aber nichts anlegen, ändern oder löschen.

Der Unterschied steht in der Datenbank, nicht in der Anzeige: Die
Mitgliedschaft trägt eine Rolle (`editor` oder `viewer`), und die
Row-Level-Security lässt für `viewer` nur `select` zu. Auch mit selbstgebauten
Anfragen kommt ein Beobachter also nicht ans Schreiben. Die App blendet ihm die
Eingabemöglichkeiten zusätzlich aus und lädt nichts hoch – sonst liefe jeder
Abgleich in einen abgewiesenen Schreibversuch.

Einladen darf nur, wer selbst schreiben darf. Sonst könnte sich ein Beobachter
Mitschreibende dazuholen und die Beschränkung damit umgehen.

Zum Zugriffsschutz: der publishable- bzw. `anon`-Key darf öffentlich sein. Der
Schutz steckt in den Row-Level-Security-Regeln – jede Zeile ist nur für
Mitglieder genau der Familie lesbar, und schreibbar nur für die mit der Rolle
`editor`. Wer den Key hat, aber in keiner Familie ist, sieht nichts.

Die Einträge liegen serverseitig in einer einzigen Tabelle mit einer
`jsonb`-Spalte. Der Server ist hier nur Briefkasten zwischen den Geräten –
ausgewertet wird ausschließlich lokal. Deshalb braucht eine neue Angabe im
Datenmodell später auch keine Datenbank-Migration.

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

**Ohne Konto** gibt es keinen Server: die Daten liegen ausschließlich in der
Datenbank des Browsers auf dem Gerät. Deshalb: **vor einem Gerätewechsel eine
JSON-Sicherung exportieren.** Wer den Browserspeicher der Seite löscht, löscht
auch die Einträge.

**Mit Konto** liegen die Einträge zusätzlich auf dem eigenen Supabase-Projekt,
damit ein zweites Gerät sie sehen kann. Das ist eine bewusste Abwägung: geteilte
Daten brauchen einen gemeinsamen Ort. Wähle bei der Projektanlage eine
europäische Region, und lade nur Menschen ein, die die Daten sehen sollen – ein
eingelöster Code gibt vollen Zugriff auf den Bereich.

## Haftungsausschluss

DRINKQuick ist ein Protokoll- und Rechenwerkzeug, **kein Medizinprodukt**. Die
Richtwerte ersetzen keine Beratung durch Hebamme, Kinder- und Jugendarztpraxis
oder Stillberatung. Bei Sorgen um das Trinkverhalten oder das Gedeihen wende dich
bitte immer an eine Fachperson.

Die Referenzkurven basieren auf den [WHO Child Growth
Standards](https://www.who.int/tools/child-growth-standards). Das Projekt ist von
der WHO weder geprüft noch unterstützt oder zertifiziert.
