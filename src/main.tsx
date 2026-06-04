import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initLogRocket } from './lib/logrocket-bootstrap';
import { migrateLegacyStoragePrefixes, migrateToIndexedDB } from './services/migration';
import { ensureCanvasSnapshotStore } from './services/idb-storage';

initLogRocket();

// Warm up + self-heal the canvas-snapshot DB in the background. It must NOT gate boot: a
// blocked open (e.g. another tab pinning an older version) would otherwise hang the whole app.
void ensureCanvasSnapshotStore();

// Rename legacy app storage keys, then move localStorage → IndexedDB, before stores hydrate.
migrateLegacyStoragePrefixes()
  .then(() => migrateToIndexedDB())
  .then(async () => {
    const { default: App } = await import('./App');
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
