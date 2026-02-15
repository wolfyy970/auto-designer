import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { migrateToIndexedDB } from './services/migration';

// Run one-time localStorage → IndexedDB migration before stores hydrate
migrateToIndexedDB().then(async () => {
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
