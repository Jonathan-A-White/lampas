// src/whatsNew/SpokenWhatsNewSheet.tsx: pwa-kit's WhatsNewSheet (its markup, classes and behaviour) with a small speaker on each version (mw-5r3p30.393).
// The package's sheet has no place for one, so Lampas draws it, from the package's own pieces (versionsSince, compareVersions, DEFAULT_LABELS) and its look.
// Two uses, as the package's: on its own it shows once after the app starts on a version newer than the last one seen (the version is remembered
// when it closes; never on a first install); with `open`, `since` and `onClose` it lists what is newer than `since` until closed.
import { compareVersions, DEFAULT_LABELS, versionsSince, type ChangelogEntry } from 'pwa-kit/whats-new';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BarSlot } from '../speech/SpeakingBarSlot';
import { Versions } from './Versions';

/** localStorage, or nothing where there is none or it throws (private mode): the sheet may then show again, the harmless way to be wrong. */
const store = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};
const readSeen = (key: string): string | null => {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const writeSeen = (key: string, version: string): void => {
  try {
    store()?.setItem(key, version);
  } catch {
    // nowhere to keep it
  }
};

export function SpokenWhatsNewSheet({ entries, version, storageKey, open, since, onClose }: {
  entries: readonly ChangelogEntry[] | null;
  /** the running version */
  version: string;
  storageKey: string;
  open?: boolean;
  since?: string;
  onClose?: () => void;
}) {
  const controlled = open !== undefined;
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  /** the last version seen, as the page had it when it started; a first install has seen nothing new, so it remembers where it starts */
  const [seen, setSeen] = useState<string>(() => {
    const stored = controlled ? null : readSeen(storageKey);
    if (stored === null && !controlled) writeSeen(storageKey, version);
    return stored ?? version;
  });

  const groups = useMemo(() => {
    if (!entries) return [];
    if (controlled) return open ? versionsSince(entries, since) : [];
    return compareVersions(seen, version) < 0 ? versionsSince(entries, seen, version) : [];
  }, [entries, controlled, open, since, seen, version]);

  const markSeen = useCallback(() => {
    writeSeen(storageKey, version);
    setSeen(version);
  }, [storageKey, version]);

  // the changelog says nothing about the versions since: remember the version without bothering him
  useEffect(() => {
    if (!controlled && entries && compareVersions(seen, version) < 0 && groups.length === 0) writeSeen(storageKey, version);
  }, [controlled, entries, seen, version, storageKey, groups.length]);

  const shown = groups.length > 0;
  const close = useCallback(() => {
    if (controlled) onClose?.();
    else markSeen();
  }, [controlled, onClose, markSeen]);

  useEffect(() => {
    if (!shown) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shown, close]);

  if (!shown) return null;
  return (
    <div className="bk-whats-new__backdrop" onClick={close}>
      <div className="bk-whats-new bk-whats-new__sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <h2 className="bk-whats-new__title" id={titleId}>
          {DEFAULT_LABELS.title}
        </h2>
        <Versions groups={groups} />
        {/* what is read keeps its Pause and Stop in view: the sheet is over the screen's own bar */}
        <BarSlot level={5} />
        <button type="button" className="bk-whats-new__button bk-whats-new__close" ref={closeRef} onClick={close}>
          {DEFAULT_LABELS.close}
        </button>
      </div>
    </div>
  );
}
