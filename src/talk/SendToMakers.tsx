// src/talk/SendToMakers.tsx — 'Send to the makers' (mw-5r3p30.760): the action he can take at any time in a tutor talk, the Talk sheet's and the Verse view's Ask, with what is
// in the Composer (his words, the pictures he attached or took) as a request to the makers. The state is useSendToMakers.ts; the request is makers.ts.
import type { RefObject } from 'react';
import { openRequests } from '../nav/route';
import { SEND_TO_MAKERS } from './makers';

import type { MakersAction } from './useSendToMakers';

/** The action's button, with what it is doing under it: Sending…, or Sent with the way to Your requests (`onLeave` first closes what stands over that screen). */
export function SendToMakers({ action, host, onLeave }: { action: MakersAction; host: RefObject<HTMLElement | null>; onLeave?: () => void }) {
  const sending = action.phase === 'sending';
  return (
    <div data-makers-send className="flex flex-wrap items-center justify-end gap-x-3">
      {sending ? (
        <p role="status" className="text-base text-muted">
          Sending…
        </p>
      ) : null}
      {action.phase === 'sent' ? (
        <div data-makers-sent className="flex flex-wrap items-center gap-x-2 text-base">
          <p role="status" className="text-muted">
            Sent to the makers. The answer will come back.
          </p>
          <button
            type="button"
            onClick={() => {
              onLeave?.();
              openRequests('settings');
            }}
            className="min-h-11 text-base font-medium text-accent underline"
          >
            Your requests
          </button>
        </div>
      ) : null}
      {action.note ? (
        <p role="status" className="min-w-0 break-words text-sm text-muted">
          {action.note}
        </p>
      ) : null}
      <button
        type="button"
        disabled={sending}
        onClick={() => action.start(host.current)}
        className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line disabled:opacity-40"
      >
        {SEND_TO_MAKERS}
      </button>
    </div>
  );
}
