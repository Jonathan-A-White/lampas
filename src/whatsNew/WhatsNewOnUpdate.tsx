// src/whatsNew/WhatsNewOnUpdate.tsx: the What's new sheet, shown once after an update: when the app starts on a version newer
// than the last one he saw, it lists every version since and closing it remembers this one. Never on a first install.
// Each version has the small Read aloud speaker (SpokenWhatsNewSheet: pwa-kit's WhatsNewSheet has no place for one).
// Drawn in App.tsx (inside the licence gate).
import { APP_SEMVER, LAST_SEEN_VERSION_STORAGE_KEY } from '../config';
import { SpokenWhatsNewSheet } from './SpokenWhatsNewSheet';
import { useAppChangelog } from './useAppChangelog';

export function WhatsNewOnUpdate() {
  const entries = useAppChangelog();
  return <SpokenWhatsNewSheet entries={entries} version={APP_SEMVER} storageKey={LAST_SEEN_VERSION_STORAGE_KEY} />;
}
