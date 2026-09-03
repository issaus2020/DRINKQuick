/** Modales Blatt von unten - die Standard-Eingabefläche der App. */
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Das Blatt wird vom Aufrufer bedingt gerendert. Dadurch startet jede
 * Eingabe mit frischem Zustand - ohne Effekt, der Felder zuruecksetzt.
 */
export function Sheet({ title, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Fokus in das Blatt holen, damit Tastatur und Screenreader dort landen.
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
