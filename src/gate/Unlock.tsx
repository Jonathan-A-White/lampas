// src/gate/Unlock.tsx — the screen the licence gate shows until the phone's key holds a licence: the answer
// so far, the phone's key as a QR code (for Postern's scanner) and as hex with a Copy (to issue the licence from Postern's Key screen), Check again.
// As the Licence page (`page`, #/unlock, mw-8m9dyu.3) it is a screen of the app, opened by the 'Needs a licence' of Settings: headed Licence, with a way back to
// Settings, and its answer is always 'Licensed' or 'Not licensed' (the reason under it).
import { useState } from 'react';
import { KeyQr } from './KeyQr';
import { BuildVersion } from '../BuildVersion';
import { navigate } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { UpdateBanner } from '../UpdateBanner';

export type Locked =
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'revoked' }
  /** `setup` is set when the app itself cannot check (no issuer): words to show instead of the connection ones. */
  | { kind: 'error'; setup?: string };

/** What the Unlock page can say: why the phone has no licence, or (on #/unlock, which any phone can open) that it has one. */
export type UnlockState = Locked | { kind: 'licensed' };

interface Props {
  locked: UnlockState;
  publicKeyHex: string;
  onCheckAgain: () => void;
  /** False where the App draws its own banner above (#/unlock). */
  banner?: boolean;
  /** The Licence page of the app (not the gate's screen): its own heading, back to Settings and its own words for the answer. */
  page?: boolean;
}

const WORDS: Record<UnlockState['kind'], { title: string; hint: string }> = {
  checking: { title: 'Checking…', hint: 'Looking for this phone’s licence on the chain.' },
  none: { title: 'No licence yet', hint: 'Issue a licence to this key from Postern’s Key screen, then tap Check again.' },
  revoked: { title: 'Licence revoked', hint: 'The licence for this key was taken back. Issue a new one to the same key, or to a new key.' },
  licensed: { title: 'Licensed', hint: 'This phone’s key holds a lampas licence.' },
  error: { title: 'Can’t reach the chain', hint: 'Check the connection, then tap Check again.' },
};

/** The Licence page's words: whatever the reason, it says Licensed or Not licensed, and why under it. */
const PAGE_WORDS: Record<UnlockState['kind'], { title: string; hint: string }> = {
  checking: WORDS.checking,
  none: { title: 'Not licensed', hint: 'Issue a licence to this key from Postern’s Key screen, then tap Check again.' },
  revoked: { title: 'Not licensed', hint: 'The licence for this key was taken back. Issue a new one to the same key, or to a new key.' },
  licensed: { title: 'Licensed', hint: 'This phone’s key holds a lampas licence, so the tutor is on.' },
  error: { title: 'Not licensed', hint: 'Can’t reach the chain to check. Check the connection, then tap Check again.' },
};

export function Unlock({ locked, publicKeyHex, onCheckAgain, banner = true, page = false }: Props) {
  const [copied, setCopied] = useState(false);
  const words = locked.kind === 'error' && locked.setup ? { title: locked.setup, hint: '' } : (page ? PAGE_WORDS : WORDS)[locked.kind];

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(publicKeyHex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (an insecure page): the key text below is select-all, so he can still copy it by hand.
    }
  }

  return (
    <div data-gate className="flex h-full min-w-0 flex-col overflow-clip">
      {banner ? <UpdateBanner /> : null}
      {page ? <ScreenHeader title="Licence" back={<HeaderButton onClick={() => navigate('settings')}>‹ Settings</HeaderButton>} /> : null}
      <main className="screen flex min-h-0 flex-1 flex-col px-6 text-center">
        {/* my-auto centres the content when it fits and, unlike justify-center, lets it scroll from its top when it does not */}
        <div className="my-auto flex flex-col items-center gap-4">
          {page ? null : <img src="/icon.svg" alt="" width={72} height={72} className="rounded-2xl" />}
          {page ? null : <h1 className="text-3xl font-semibold">Unlock</h1>}
          <div role="status" className="flex flex-col gap-1">
            <p className="text-xl font-medium">{words.title}</p>
            {words.hint ? <p className="text-base text-muted">{words.hint}</p> : null}
          </div>
          {page ? <p className="text-base text-muted">Lampas is free to read. A licence unlocks the tutor.</p> : null}
          <section aria-label="This phone’s key" className="flex w-full max-w-sm flex-col gap-2">
            <p className="text-sm text-muted">This phone’s key</p>
            <KeyQr text={publicKeyHex} label="This phone’s key as a QR code" />
            <p data-testid="device-key" className="select-all break-all rounded-xl border border-line bg-surface p-3 font-mono slashed-zero text-base">
              {publicKeyHex}
            </p>
            <button
              type="button"
              onClick={() => void copy()}
              className="min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </section>
          <button
            type="button"
            onClick={onCheckAgain}
            disabled={locked.kind === 'checking'}
            className="min-h-12 rounded-xl border border-line px-6 text-lg font-medium disabled:opacity-60"
          >
            Check again
          </button>
          <BuildVersion />
        </div>
      </main>
    </div>
  );
}
