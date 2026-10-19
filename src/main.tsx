import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'pwa-kit/whats-new/styles.css';
import 'voice-kit/speech/styles.css';
import 'voice-kit/composer/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { startAppUpdates } from 'pwa-kit/app-update';
import { fetchChangelog } from 'pwa-kit/whats-new';
import { App } from './App';
import { restoreAppearance } from './appearance/appearanceSync';
import { APP_SEMVER } from './config';
import { ErrorBoundary } from './ErrorBoundary';
import { LicenceProvider } from './gate/LicenceProvider';
import { noteVisit } from './gate/licenceTip';
import { restoreLastRoute } from './nav/lastRoute';
import { restoreScrolls } from './nav/scrollMemory';
import { startBookRequests } from './services/bookRequests';
import { LicensedTips } from './tips/LicensedTips';
import { hasNewsSince } from './whatsNew/hasNewsSince';
import { installScrollGuard } from './ui/scrollGuard';

installScrollGuard();
// The last Theme and Text size, painted before the first render.
restoreAppearance();
// Reopen where he left it: the address and the scroll offsets, before the first render reads them.
restoreLastRoute();
restoreScrolls();
// Counts today as a visit (the licence tip is due on the third, src/gate/licenceTip.ts).
noteVisit();
// A request for a grammar book that waited offline goes when the phone is back online (Settings > Grammar books > Ask for another book).
startBookRequests();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary where="app">
      <LicenceProvider>
        <LicensedTips />
        <App />
      </LicenceProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// vite.config.ts: registerType 'prompt', so a new build waits for his tap on the banner. The registration
// goes to the update logic, which shows the banner, sends SKIP_WAITING on the tap, reloads once, and
// looks for a new build (pwa-kit/app-update).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      startAppUpdates(
        { container: navigator.serviceWorker, registration, reload: () => window.location.reload() },
        { version: APP_SEMVER, hasNewsSince: hasNewsSince(() => fetchChangelog(import.meta.env.BASE_URL)) },
      );
    }
  },
});
