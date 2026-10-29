import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'pwa-kit/whats-new/styles.css';
import 'pwa-kit/settings/styles.css';
import 'voice-kit/speech/styles.css';
import 'voice-kit/composer/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { startAppUpdates } from 'pwa-kit/app-update';
import { fetchChangelog } from 'pwa-kit/whats-new';
import { App } from './App';
import { restoreAppearance } from './appearance/appearanceSync';
import { refreshOfflineCopy, updateChecked } from './data/offlineCopy';
import { placeInterest } from './data/repositories';
import { APP_SEMVER } from './config';
import { ErrorBoundary } from './ErrorBoundary';
import { LicenceProvider } from './gate/LicenceProvider';
import { noteVisit } from './gate/licenceTip';
import { restoreLastRoute } from './nav/lastRoute';
import { restoreScrolls } from './nav/scrollMemory';
import { startBookRequests } from './services/bookRequests';
import { LicensedTips } from './tips/LicensedTips';
import { NightlyTuning } from './tutor/NightlyTuning';
import { hasNewsSince } from './whatsNew/hasNewsSince';
import { installScrollGuard } from './ui/scrollGuard';
import { leaveStaleSheets } from './ui/sheetBack';

installScrollGuard();
// A reload drops the open sheets but keeps their history entries: step back over them, so the first Back leaves the screen.
leaveStaleSheets();
// The last Theme and Text size, painted before the first render.
restoreAppearance();
// Reopen where he left it: the address and the scroll offsets, before the first render reads them.
restoreLastRoute();
restoreScrolls();
// Counts today as a visit (the licence tip is due on the third, src/gate/licenceTip.ts).
noteVisit();
// A request for a book that waited offline goes when the phone is back online (Ask for a book).
startBookRequests();

// The phone is placed on the Greek and Hebrew dials (a new reader at both 0, a reader from before by what he has, once) before the first render, so nothing Greek or Hebrew flashes up first.
// The wait is bounded (mw-5r3p30.862): a Dexie open that hangs (blocked by another tab, a slow phone) kept his splash up for ~20 s with nothing to say why. After FIRST_PAINT_MS the app
// renders anyway; placeInterest is not cancelled, so it still places the dials when it ends, and the screens read them live.
const FIRST_PAINT_MS = 2000;
let painted = false;
// An update check that ends before the first render waits: the refresh at the paint follows it.
const keepCopyCurrent = (): void => {
  if (painted) void refreshOfflineCopy().catch(() => undefined);
};
const render = (): void =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary where="app">
        <LicenceProvider>
          <LicensedTips />
          <NightlyTuning />
          <App />
        </LicenceProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
const paint = (): void => {
  if (painted) return;
  painted = true;
  clearTimeout(paintLate);
  render();
  // The kept copy is brought up to the index once the app is up, never before it and never awaited (mw-lcv9z3g.3).
  keepCopyCurrent();
};
const paintLate = setTimeout(paint, FIRST_PAINT_MS);
placeInterest().then(paint, paint);

// vite.config.ts: registerType 'prompt', so a new build waits for his tap on the banner. The registration
// goes to the update logic, which shows the banner, sends SKIP_WAITING on the tap, reloads once, and
// looks for a new build (pwa-kit/app-update).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      startAppUpdates(
        { container: navigator.serviceWorker, registration: updateChecked(registration, keepCopyCurrent), reload: () => window.location.reload() },
        { version: APP_SEMVER, hasNewsSince: hasNewsSince(() => fetchChangelog(import.meta.env.BASE_URL)) },
      );
    }
  },
});
