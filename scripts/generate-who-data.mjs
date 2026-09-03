/**
 * Erzeugt `src/lib/who/tables.ts` aus den offiziellen LMS-Tabellen der
 * WHO Child Growth Standards.
 *
 *   npm i -D who-growth-standards && node scripts/generate-who-data.mjs
 *
 * Das Paket buendelt die von der WHO veroeffentlichten LMS-Tabellen
 * (https://www.who.int/tools/child-growth-standards). Wir extrahieren daraus
 * nur die ersten zwei Lebensjahre, damit die App offline und ohne Laufzeit-
 * Abhaengigkeit rechnen kann.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const who = require('who-growth-standards');

const MAX_DAY = 730; // zwei Jahre
const TARGET = fileURLToPath(new URL('../src/lib/who/tables.ts', import.meta.url));

const INDICATORS = [
  { key: 'wfa', name: 'WEIGHT_FOR_AGE', doc: 'Gewicht-nach-Alter in kg' },
  { key: 'lhfa', name: 'LENGTH_FOR_AGE', doc: 'Laenge-nach-Alter in cm' },
  { key: 'hcfa', name: 'HEAD_CIRCUMFERENCE_FOR_AGE', doc: 'Kopfumfang-nach-Alter in cm' },
];

const lines = [
  '// WHO Child Growth Standards - LMS-Koeffizienten (Alter in Tagen, 0-730).',
  '// Quelle: World Health Organization, Child Growth Standards.',
  '// https://www.who.int/tools/child-growth-standards',
  '// Diese Datei wird generiert - nicht von Hand bearbeiten (siehe scripts/generate-who-data.mjs).',
  '// Nicht von der WHO geprueft, unterstuetzt oder zertifiziert.',
  '',
  '/** Ein LMS-Tripel: [L (Box-Cox-Potenz), M (Median), S (Variationskoeffizient)] */',
  'export type Lms = readonly [l: number, m: number, s: number];',
  '',
  '/** LMS-Tabelle mit taeglichen Stuetzstellen ab Tag 0. */',
  'export type LmsTable = readonly Lms[];',
  '',
];

for (const { key, name, doc } of INDICATORS) {
  for (const [sex, suffix, label] of [['male', 'BOY', 'Jungen'], ['female', 'GIRL', 'Maedchen']]) {
    const table = who.getTable(key, sex);
    if (table.xAxis !== 'day' || table.start !== 0 || table.step !== 1) {
      throw new Error(`Unerwartete Achse fuer ${key}/${sex}`);
    }
    const rows = table.lms.slice(0, MAX_DAY + 1).map(([l, m, s]) => `[${l},${m},${s}]`);
    lines.push(`/** ${doc}, ${label}. Index = Alter in Tagen. */`);
    lines.push(`export const ${name}_${suffix}: LmsTable = [`);
    for (let i = 0; i < rows.length; i += 8) lines.push(`  ${rows.slice(i, i + 8).join(', ')},`);
    lines.push('];', '');
  }
}

writeFileSync(TARGET, lines.join('\n'));
console.log(`geschrieben: ${TARGET}`);
