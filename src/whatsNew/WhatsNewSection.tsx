// src/whatsNew/WhatsNewSection.tsx: About's What's new: Check for updates, then every version with its lines, newest first.
import { CheckForUpdates, DEFAULT_LABELS, versionsSince, type ChangelogEntry } from 'bsv-kit/whats-new';
import { useMemo } from 'react';
import { proseOf } from '../speech/proseOf';
import { ReadAloud } from '../speech/ReadAloud';
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

/** Every version with its lines, as bsv-kit's WhatsNewList draws them (its markup and classes), and a small speaker at the head of each version that
 * reads its lines (the kind, then the text: 'New: ...'). The list has no place of its own for one. */
function Versions({ entries }: { entries: readonly ChangelogEntry[] | null }) {
  const groups = useMemo(() => versionsSince(entries ?? []), [entries]);
  return (
    <div className="bk-whats-new">
      {groups.length === 0 ? (
        <p className="bk-whats-new__empty">{DEFAULT_LABELS.empty}</p>
      ) : (
        <div className="bk-whats-new__groups">
          {groups.map((group) => (
            <section key={group.version} className="bk-whats-new__group">
              <div className="bk-whats-new__group-head">
                <h3 className="bk-whats-new__version">{group.version}</h3>
                <time className="bk-whats-new__date" dateTime={group.date}>
                  {group.date}
                </time>
                <ReadAloud id={`whats-new:${group.version}`} text={proseOf(group.entries.map((entry) => `${DEFAULT_LABELS[entry.kind]}: ${entry.text}`))} className="ml-auto" />
              </div>
              <ul className="bk-whats-new__lines">
                {group.entries.map((entry, i) => (
                  <li key={i} className="bk-whats-new__line">
                    <span className={`bk-whats-new__kind bk-whats-new__kind--${entry.kind}`}>{DEFAULT_LABELS[entry.kind]}</span>
                    <span className="bk-whats-new__text">{entry.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function WhatsNewSection() {
  const entries = useAppChangelog();
  return (
    <section aria-label="What's new" data-whats-new>
      <h2 className="pt-4 text-lg font-semibold">{"What's new"}</h2>
      <div className="space-y-4 py-4">
        <CheckForUpdates updateReady={<UpdateNow />} />
        <Versions entries={entries} />
      </div>
    </section>
  );
}
