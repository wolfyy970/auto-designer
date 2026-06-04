import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initLogRocket } from './lib/logrocket-bootstrap';
import { migrateLegacyStoragePrefixes, migrateToIndexedDB } from './services/migration';
import { ensureCanvasSnapshotStore } from './services/idb-storage';

initLogRocket();

// Repair canvas-snapshot DBs left without a `snapshots` store by an earlier migration bug,
// then rename legacy app storage keys and move localStorage → IndexedDB, before stores hydrate.
ensureCanvasSnapshotStore()
  .then(() => migrateLegacyStoragePrefixes())
  .then(() => migrateToIndexedDB())
  .then(async () => {
    const { default: App } = await import('./App');
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
