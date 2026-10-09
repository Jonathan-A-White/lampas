// src/whatsNew/WhatsNewSection.tsx: About's What's new: Check for updates, then every version with its lines, newest first.
import { CheckForUpdates, WhatsNewList } from 'bsv-kit/whats-new';
import { applyUpdate, useUpdateState } from '../services/appUpdate';
import { useAppChangelog } from './useAppChangelog';

/** Beside Check for updates when a build is waiting: one tap takes it (the same as the banner's). */
function UpdateNow() {
  const updating = useUpdateState() === 'updating';
  return (
    <button type="button" onClick={applyUpdate} disabled={updating} className="min-h-11 rounded-xl bg-accent px-4 font-medium text-accent-fg disabled:opacity-60">
      {updating ? 'Updating…' : 'Update now'}
    </button>
  );
}

export function WhatsNewSection() {
  const entries = useAppChangelog();
  return (
    <section aria-label="What's new" data-whats-new>
      <h2 className="pt-4 text-lg font-semibold">{"What's new"}</h2>
      <div className="space-y-4 py-4">
        <CheckForUpdates updateReady={<UpdateNow />} />
        <WhatsNewList entries={entries} />
      </div>
    </section>
  );
}
