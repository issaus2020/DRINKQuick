/**
 * Ein kleines „i", hinter dem der Erklärtext steckt.
 *
 * Die Karten der App tragen viel Erklärung. Beim ersten Mal ist sie
 * notwendig, beim fünfzigsten steht sie zwischen der Person und der Zahl,
 * wegen der sie die App geöffnet hat. Also: standardmäßig eingeklappt, auf
 * Tipp oder Zeigen sichtbar.
 *
 * Bewusst ein `button` und kein `title`-Attribut: ein Tooltip aus dem Browser
 * erscheint auf dem Telefon nie, und die Tastatur erreicht ihn auch nicht.
 */
import { useId, useState } from 'react';

interface InfoDotProps {
  /** Wofür die Erklärung gilt - für die Sprachausgabe, nicht sichtbar. */
  label: string;
  children: React.ReactNode;
}

export function InfoDot({ label, children }: InfoDotProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  // Zeigen erledigt das Stylesheet, Tippen dieser Zustand. Beides in React zu
  // führen hieß: das Zeigen öffnete, und der Klick schloss sofort wieder.
  return (
    <span className="info">
      <button
        type="button"
        className="info__dot"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label} erklären`}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      <span className="info__body" id={id} role="note" hidden={!open}>
        {children}
      </span>
    </span>
  );
}
