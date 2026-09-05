/**
 * Ein Satz für die Person, die vor dem Bildschirm steht - nicht für das Kind.
 *
 * Zur Auswahl: Rund um Kinder und Eltern kursieren viele schöne Sätze mit
 * falscher Zuschreibung. „Wurzeln und Flügel" wird Goethe angehängt, ohne
 * dass es bei ihm steht; „ein Feuer, das entzündet werden will" wandert
 * zwischen Rabelais, Montaigne und Plutarch hin und her. Solche Sätze stehen
 * hier nicht. Aufgenommen ist nur, was sich einer Quelle zuordnen lässt, und
 * Sprichwörter, die ausdrücklich keinen Urheber beanspruchen. Alle genannten
 * Personen sind lange verstorben, die Texte also gemeinfrei.
 *
 * Zum Ton: Die Sätze loben nichts und fordern nichts. Wer sie um drei Uhr
 * nachts liest, hat gerade genug zu tun.
 */
export interface Quote {
  text: string;
  /** Wer es gesagt hat. Fehlt bei Sprichwörtern - dort gibt es niemanden. */
  source?: string;
}

export const QUOTES: Quote[] = [
  {
    text: 'Es braucht ein ganzes Dorf, um ein Kind großzuziehen.',
    source: 'Afrikanisches Sprichwort',
  },
  {
    text: 'Ihr seid die Bogen, von denen eure Kinder als lebende Pfeile ausgesandt werden.',
    source: 'Khalil Gibran, „Der Prophet"',
  },
  {
    text: 'Kommt, lasst uns unsern Kindern leben!',
    source: 'Friedrich Fröbel',
  },
  {
    text: 'Hilf mir, es selbst zu tun.',
    source: 'Maria Montessori',
  },
  {
    text: 'Erziehung ist Beispiel und Liebe, sonst nichts.',
    source: 'Johann Heinrich Pestalozzi',
  },
  {
    text: 'Dem Kind schuldet man die größte Ehrfurcht.',
    source: 'Juvenal',
  },
  {
    text: 'Das Herz will glauben, und es will lieben.',
    source: 'Johann Heinrich Pestalozzi',
  },
  {
    text: 'Geduld ist ein Baum mit bitterer Wurzel, aber süßen Früchten.',
    source: 'Persisches Sprichwort',
  },
];

/**
 * Das Zitat des Tages.
 *
 * Bewusst an den Kalendertag gebunden und nicht zufällig: ein Satz, der bei
 * jedem Antippen wechselt, ist Dekoration. Einer, der den Tag über stehen
 * bleibt, lässt sich lesen, wenn man dazu kommt.
 */
export function quoteOfDay(now: Date = new Date()): Quote {
  // Der lokale Kalendertag, nicht der von Greenwich - sonst wechselte das
  // Zitat mitten in der Nacht.
  const day = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000,
  );
  return QUOTES[Math.abs(day) % QUOTES.length];
}
