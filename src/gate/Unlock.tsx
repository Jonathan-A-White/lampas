// src/gate/Unlock.tsx — the screen the licence gate shows until the phone's key holds a licence: the answer
// so far, the phone's key as hex with a Copy (to issue the licence from Postern's Key screen), Check again.
import { useState } from 'react';
import { UpdateBanner } from '../UpdateBanner';

export type Locked =
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'revoked' }
  /** `setup` is set when the app itself cannot check (no issuer): words to show instead of the connection ones. */
  | { kind: 'error'; setup?: string };

interface Props {
  locked: Locked;
  publicKeyHex: string;
  onCheckAgain: () => void;
}

const WORDS: Record<Locked['kind'], { title: string; hint: string }> = {
  checking: { title: 'Checking…', hint: 'Looking for this phone’s licence on the chain.' },
  none: { title: 'No licence yet', hint: 'Issue a licence to this key from Postern’s Key screen, then tap Check again.' },
  revoked: { title: 'Licence revoked', hint: 'The licence for this key was taken back. Issue a new one to the same key, or to a new key.' },
  error: { title: 'Can’t reach the chain', hint: 'Check the connection, then tap Check again.' },
};

export function Unlock({ locked, publicKeyHex, onCheckAgain }: Props) {
  const [copied, setCopied] = useState(false);
  const words = locked.kind === 'error' && locked.setup ? { title: locked.setup, hint: '' } : WORDS[locked.kind];

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
      <UpdateBanner />
      <main className="screen flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <img src="/icon.svg" alt="" width={72} height={72} className="rounded-2xl" />
        <h1 className="text-3xl font-semibold">Unlock</h1>
        <div role="status" className="flex flex-col gap-1">
          <p className="text-xl font-medium">{words.title}</p>
          {words.hint ? <p className="text-base text-muted">{words.hint}</p> : null}
        </div>
        <section aria-label="This phone’s key" className="flex w-full max-w-sm flex-col gap-2">
          <p className="text-sm text-muted">This phone’s key</p>
          <p data-testid="device-key" className="select-all break-all rounded-xl border border-line bg-surface p-3 font-mono text-base">
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
      </main>
    </div>
  );
}
