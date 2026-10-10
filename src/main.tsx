import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'bsv-kit/whats-new/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { restoreAppearance } from './appearance/appearanceSync';
import { ErrorBoundary } from './ErrorBoundary';
import { Gate } from './gate/Gate';
import { restoreLastRoute } from './nav/lastRoute';
import { restoreScrolls } from './nav/scrollMemory';
import { startAppUpdates } from './services/appUpdate';
import { TipsSitting } from './tips/TipsSitting';
import { installScrollGuard } from './ui/scrollGuard';

installScrollGuard();
// The last Theme and Text size, painted before the first render.
restoreAppearance();
// Reopen where he left it: the address and the scroll offsets, before the first render reads them.
restoreLastRoute();
restoreScrolls();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary where="app">
      <Gate>
        <TipsSitting />
        <App />
      </Gate>
    </ErrorBoundary>
  </StrictMode>,
);

// vite.config.ts: registerType 'prompt', so a new build waits for his tap on the banner. The registration
// goes to the update logic, which shows the banner, sends SKIP_WAITING on the tap, reloads once, and
// looks for a new build (src/services/appUpdate.ts).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) startAppUpdates({ container: navigator.serviceWorker, registration, reload: () => window.location.reload() });
  },
});
