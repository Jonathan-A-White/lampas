// src/whatsNew/Versions.tsx: the versions of What's new with their lines, each with a small speaker (About's list and the sheets shown after an update or from the banner).
import { DEFAULT_LABELS, versionsSince, type ChangelogEntry } from 'pwa-kit/whats-new';
import { useMemo } from 'react';
import { proseOf } from '../speech/proseOf';
import { ReadAloud } from '../speech/ReadAloud';

/** Every version with its lines, as pwa-kit's WhatsNewList draws them (its markup and classes), and a small speaker at the head of each version that
 * reads its lines (the kind, then the text: 'New: ...'). The list has no place of its own for one. */
export function Versions({ entries, groups: given }: { entries?: readonly ChangelogEntry[] | null; groups?: ReturnType<typeof versionsSince> }) {
  const own = useMemo(() => versionsSince(entries ?? []), [entries]);
  const groups = given ?? own;
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
