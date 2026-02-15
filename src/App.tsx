import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeEffect } from './hooks/useThemeEffect';
import { useGenerationStore } from './stores/generation-store';
import { garbageCollect } from './services/idb-storage';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import AppShell from './components/layout/AppShell';

const CanvasPage = lazy(() => import('./pages/CanvasPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const CompilerPage = lazy(() => import('./pages/CompilerPage'));
const GenerationPage = lazy(() => import('./pages/GenerationPage'));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-fg-faint border-t-fg" />
    </div>
  );
}

export default function App() {
  useThemeEffect();

  // Run IndexedDB garbage collection after stores hydrate
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeIds = new Set(
        useGenerationStore.getState().results.map((r) => r.id),
      );
      garbageCollect(activeIds).then(({ codesRemoved, provenanceRemoved }) => {
        if (import.meta.env.DEV && (codesRemoved > 0 || provenanceRemoved > 0)) {
          console.log(
            `[gc] Removed ${codesRemoved} orphaned code(s), ${provenanceRemoved} provenance(s) from IndexedDB`,
          );
        }
      });
    }, 3000); // Defer 3s to not compete with initial render
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Canvas is the primary workspace */}
            <Route path="/canvas" element={<ErrorBoundary><CanvasPage /></ErrorBoundary>} />

            {/* Legacy page-based routes */}
            <Route
              path="/editor"
              element={
                <AppShell>
                  <EditorPage />
                </AppShell>
              }
            />
            <Route
              path="/compiler"
              element={
                <AppShell>
                  <CompilerPage />
                </AppShell>
              }
            />
            <Route
              path="/generation"
              element={
                <AppShell>
                  <GenerationPage />
                </AppShell>
              }
            />
            <Route path="*" element={<Navigate to="/canvas" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
