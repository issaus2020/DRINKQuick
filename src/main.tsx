import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './lib/store';
import { SyncProvider } from './lib/sync/SyncProvider';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <StoreProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </StoreProvider>
  </StrictMode>,
);

// Service Worker macht die App offline nutzbar - genau dann wichtig, wenn
// nachts um drei niemand auf eine Netzverbindung warten will.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Ohne Service Worker funktioniert die App weiterhin, nur nicht offline.
    });
  });
}
