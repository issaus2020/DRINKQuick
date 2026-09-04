# Schema-Test

Das Schema wurde ursprünglich geschrieben, ohne es je auszuführen – ein Fehler,
der beim Einrichten Zeit gekostet hat. `flow.sql` spielt den kompletten Ablauf
gegen ein echtes Postgres durch, damit das nicht wieder passiert.

Getestet wird mit **zwei verschiedenen Nutzern unter aktivem Row Level
Security** – nur so zeigt sich, ob die Regeln wirklich greifen:

1. Person A legt eine Familie an
2. A schreibt einen Eintrag und sieht ihn
3. A erzeugt einen Einladungscode
4. Person B sieht vorher nichts
5. B löst den Code ein
6. B sieht jetzt A's Einträge
7. B schreibt selbst, A sieht es
8. Ein Unbeteiligter sieht weiterhin nichts

## Ausführen

Braucht ein lokales Postgres (Version 14+). `stub.sql` baut die Teile der
Supabase-Umgebung nach, die das Schema voraussetzt: `auth.users`, `auth.uid()`
und die Rolle `authenticated`.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/test/stub.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/test/flow.sql
```

Die letzte Ausgabe muss `bestanden` melden. Gegen das echte Supabase-Projekt
darf `stub.sql` **nicht** laufen – dort gibt es `auth.uid()` bereits.
