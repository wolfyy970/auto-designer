import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import EditorPage from './pages/EditorPage';
import CompilerPage from './pages/CompilerPage';
import GenerationPage from './pages/GenerationPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/compiler" element={<CompilerPage />} />
            <Route path="/generation" element={<GenerationPage />} />
            <Route path="*" element={<Navigate to="/editor" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
