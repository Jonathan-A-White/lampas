// src/gate/MyDevices.tsx — My devices (mw-cvwm1u.5): on the Licence page of a phone licensed by the site issuer, each device of the licence by name and last use,
// with Rename and Remove. The list is the person's own, asked of Postern with this phone's key (services/register.ts listDevices). Remove asks first ('Lampas on that
// device loses its licence'), has the backend revoke that key's licence and free its slot, and removing THIS phone hands back to the page, which is then Not licensed.
// A refusal is the backend's own words in a role=alert. A licence from the Governor's own issuer has no person behind it, so the page does not draw this at all.
import { useCallback, useEffect, useState } from 'react';
import { listDevices, removeDevice, renameDevice, type RegisterDevice } from '../services/register';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose } from '../ui/sheetDrag';
import { LimitedInput } from '../ui/LimitedField';

const FIELD = 'min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg';
const SMALL = 'min-h-12 rounded-xl border border-line px-4 text-base font-medium disabled:opacity-60';

/** 'Last used 18 Oct 2026': when the backend last saw the device use its licence, else when it was added; nothing when it says neither. */
function lastUse(device: RegisterDevice): string {
  const at = new Date(device.lastSeen || device.addedAt);
  if (!device.lastSeen && !device.addedAt) return '';
  if (Number.isNaN(at.getTime())) return '';
  return `Last used ${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function errorWords(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The confirm sheet of Remove: a bottom sheet that closes with Keep, Escape or the phone's Back. */
function ConfirmRemove({ device, mine, busy, onKeep, onRemove }: { device: RegisterDevice; mine: boolean; busy: boolean; onKeep: () => void; onRemove: () => void }) {
  useEscapeToClose(onKeep);
  useSheetBack(onKeep);
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/60">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-device-title"
        className="w-full rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+var(--lp-bar-inset))] text-left"
      >
        <h2 id="remove-device-title" className="text-lg font-semibold">
          Remove {device.name}?
        </h2>
        <p className="mt-1 text-base text-muted">
          {mine ? 'Lampas on this phone loses its licence. Another phone can take the slot.' : 'Lampas on that device loses its licence. Another phone can take the slot.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" ref={focusOnMount} disabled={busy} onClick={onKeep} className="min-h-12 rounded-xl border border-line text-lg font-medium disabled:opacity-60">
            Keep
          </button>
          <button type="button" disabled={busy} onClick={onRemove} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg disabled:opacity-60">
            {busy ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** This phone's public key (hex): the key that asks, and the row marked 'this phone'. */
  deviceKey: string;
  /** This phone itself was removed: its licence is gone. */
  onRemovedThisPhone: () => void;
}

export function MyDevices({ deviceKey, onRemovedThisPhone }: Props) {
  const [personId, setPersonId] = useState('');
  const [devices, setDevices] = useState<RegisterDevice[] | null>(null);
  const [problem, setProblem] = useState('');
  const [renaming, setRenaming] = useState<{ key: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<RegisterDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void listDevices(deviceKey).then(
      (mine) => {
        if (!live) return;
        setPersonId(mine.personId);
        setDevices(mine.devices);
        setProblem('');
      },
      (error: unknown) => {
        if (live) setProblem(errorWords(error));
      },
    );
    return () => {
      live = false;
    };
  }, [deviceKey, attempt]);

  const keep = useCallback(() => setConfirming(null), []);

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const edit = renaming;
    const name = edit?.name.trim();
    if (!edit || !name || busy) return;
    setBusy(true);
    setProblem('');
    try {
      await renameDevice(edit.key, name);
      setDevices((now) => now?.map((d) => (d.key === edit.key ? { ...d, name } : d)) ?? now);
      setRenaming(null);
    } catch (error) {
      setProblem(errorWords(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(device: RegisterDevice): Promise<void> {
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      await removeDevice(personId, device.key);
      setConfirming(null);
      if (device.key === deviceKey) onRemovedThisPhone();
      else setDevices((now) => now?.filter((d) => d.key !== device.key) ?? now);
    } catch (error) {
      setConfirming(null);
      setProblem(errorWords(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="my-devices-title" className="flex w-full max-w-sm flex-col gap-2 text-left">
      <h2 id="my-devices-title" className="text-lg font-semibold">
        My devices
      </h2>
      {devices === null && !problem ? <p className="text-base text-muted">Loading…</p> : null}
      {devices ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {devices.map((device) => {
            const mine = device.key === deviceKey;
            const edit = renaming?.key === device.key ? renaming : null;
            return (
              <li key={device.key} aria-label={device.name} className="flex flex-col gap-2 p-3">
                {edit ? (
                  <form onSubmit={(e) => void save(e)} className="flex flex-col gap-2">
                    <label htmlFor="device-name" className="text-base font-medium">
                      Device name
                    </label>
                    <LimitedInput
                      id="device-name"
                      ref={focusOnMount}
                      type="text"
                      maxLength={40}
                      autoComplete="off"
                      enterKeyHint="done"
                      value={edit.name}
                      onChange={(e) => setRenaming({ key: edit.key, name: e.target.value })}
                      className={FIELD}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" disabled={busy || !edit.name.trim()} className="min-h-12 rounded-xl bg-accent px-4 text-base font-medium text-accent-fg disabled:opacity-60">
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => setRenaming(null)} className={SMALL}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="break-words text-base font-medium">
                        {device.name}
                        {mine ? <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-sm font-normal text-muted">this phone</span> : null}
                      </p>
                      {lastUse(device) ? <p className="text-sm text-muted">{lastUse(device)}</p> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-label={`Rename ${device.name}`}
                        onClick={() => {
                          setProblem('');
                          setRenaming({ key: device.key, name: device.name });
                        }}
                        className={SMALL}
                      >
                        Rename
                      </button>
                      <button type="button" aria-label={`Remove ${device.name}`} onClick={() => setConfirming(device)} className={SMALL}>
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {problem ? (
        <p role="alert" className="text-base text-bad first-letter:uppercase">
          {problem}
        </p>
      ) : null}
      {devices === null && problem ? (
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className={SMALL}>
          Try again
        </button>
      ) : null}
      {devices ? <p className="text-base">A new phone joins this licence: tap Get a licence there and use the same phone number.</p> : null}
      {confirming ? <ConfirmRemove device={confirming} mine={confirming.key === deviceKey} busy={busy} onKeep={keep} onRemove={() => void remove(confirming)} /> : null}
    </section>
  );
}
