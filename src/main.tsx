import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { StorageService } from './services/storageService';

const rootEl = document.getElementById('root');
async function bootstrap() {
  if (!rootEl) return;
  try {
    await StorageService.init();
  } catch (error) {
    // Never seed demo data when production bootstrap fails.
    console.error('[Moonbox] Data bootstrap failed; no demo fallback was used.', error);
  }
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void bootstrap();
