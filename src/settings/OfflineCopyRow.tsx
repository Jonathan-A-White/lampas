// src/settings/OfflineCopyRow.tsx — the row Keep on this phone (Settings > Reading, mw-lcv9z3g.2): Nothing extra | New Testament (34 MB) | Whole Bible (113 MB), and under it how the
// offline copy stands: the chapters kept and the megabytes fetched with Keep the app open while it goes, Paused: offline while the phone is offline, Up to date with the time of the
// check when every chapter is kept. Not a registry setting (the tutor's Settings request is full): the scope is src/data/offlineCopy.ts's own key.
import { useEffect, useState } from 'react';
import { offlineProgress, onOfflineProgress, type OfflineProgress, type OfflineScope } from '../data/offlineCopy';
import { Chips } from '../ui/Chips';
import { OFFLINE_CHOICES, chooseOfflineScope, countsOf, getOfflineChecked, offlineRunLive, onOfflineChecked, resumeOfflineCopy, statusOf } from './offlineCopyState';

export function OfflineCopyRow({ name }: { name: string }) {
  const [scope, setScope] = useState<OfflineScope>();
  const [progress, setProgress] = useState<OfflineProgress | undefined>(() => (offlineRunLive() ? offlineProgress() : undefined));
  const [checked, setChecked] = useState<number>();

  useEffect(() => {
    let alive = true;
    const readChecked = () => void getOfflineChecked().then((when) => alive && setChecked(when));
    readChecked();
    const unsubscribe = [onOfflineChecked(readChecked), onOfflineProgress((next) => alive && setProgress(next))];
    void resumeOfflineCopy().then((saved) => alive && setScope(saved));
    return () => {
      alive = false;
      unsubscribe.forEach((off) => off());
    };
  }, []);

  // a report from a run of another scope (one just replaced, still winding down) is not this scope's
  if (!scope) return null;
  const mine = progress && scope !== 'none' && progress.total === countsOf(scope).files ? progress : undefined;
  const status = statusOf(scope, mine, checked);

  const choose = (value: string) => {
    const next = value as OfflineScope;
    setScope(next);
    setProgress(undefined);
    void chooseOfflineScope(next);
  };

  return (
    <>
      <Chips name={name} current={scope} options={OFFLINE_CHOICES} onChoose={choose} />
      <div data-offline-status className="text-base" aria-live="off">
        {status ? <p className="pt-2 font-medium">{status.text}</p> : null}
        {status?.note ? <p className="text-muted">{status.note}</p> : null}
      </div>
    </>
  );
}
