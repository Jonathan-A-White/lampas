// src/RequestsScreen.tsx — Your requests (mw-vy3ghg.5, #/requests, reached from Settings > More and from About): every request he sent to the
// factory, the newest first, each with where it stands: Sent, Filed, Being built, Adopted in <version> (a link to the commit), Declined: <reason>
// or Now a setting: <name>. The backend pushes nothing for a grist, so while the screen is up it pulls the mill's request-status records
// (src/services/requestStatus.ts) when it opens, every requestTimings.pollMs and at once when the phone shows the app again (never while it is
// hidden); the list is a live query, so a record shows as it is applied.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { listRequests, type RequestRow } from './data/repositories/requests';
import { navigate, requestsOf, useAddress } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { getDeviceKeyBytes } from './services/deviceKey';
import { pullStatuses, requestTimings } from './services/requestStatus';

const KIND_NAMES: Record<string, string> = {
  'grammar-approach': 'Grammar approach',
  'tutor-ask': 'Asked the tutor',
  'grammar-book': 'Grammar book',
  // the four forms of Settings > Ask for more
  approach: 'Approach or programme',
  'study-resource': 'Study resource',
  text: 'Text',
  translation: 'Translation',
};

/** The line that says where a request stands, as plain text (the landed one is drawn as a link when it has one). */
function statusLine(row: RequestRow): string {
  switch (row.status) {
    case 'filed':
      return 'Filed';
    case 'building':
      return 'Being built';
    case 'landed':
      return row.version ? `Adopted in ${row.version}` : 'Adopted';
    case 'declined':
      return row.reason ? `Declined: ${row.reason}` : 'Declined';
    case 'adopted-as-setting':
      return row.setting ? `Now a setting: ${row.setting}` : 'Now a setting';
    default:
      return 'Sent';
  }
}

const sentOn = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Pulls the statuses now and then until the screen goes, never while the page is hidden and at once when it is shown again; true while the
 * last pull failed. One pull at a time: shown again during a pull, the next one starts as that one ends. */
function useStatusPulling(): boolean {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const stop = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mill: string | undefined;
    let pulling = false;
    let again = false;
    const run = async (): Promise<void> => {
      clearTimeout(timer);
      pulling = true;
      if (!document.hidden) {
        try {
          mill = (await pullStatuses({ key: getDeviceKeyBytes(), signal: stop.signal, mill })).mill;
          if (!stop.signal.aborted) setFailed(false);
        } catch {
          if (!stop.signal.aborted) setFailed(true);
        }
      }
      pulling = false;
      if (stop.signal.aborted) return;
      if (again) {
        again = false;
        void run();
      } else timer = setTimeout(() => void run(), requestTimings.pollMs);
    };
    const onVisible = (): void => {
      if (document.hidden) return;
      if (pulling) again = true;
      else void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    void run();
    return () => {
      stop.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return failed;
}

/** A request's words, cut at three lines; when the cut hides some, the words are a button that opens them all and folds them again. Whether the
 * cut hides anything is measured (a phone's width and type size decide), at first and whenever the box changes size while it is folded. */
function RequestText({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || open) return;
    const measure = (): void => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [text, open]);
  const toggle = (): void => setOpen((was) => !was);
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  };
  const openable = cut || open;
  return (
    <p
      ref={box}
      className={`break-words text-lg ${open ? '' : 'line-clamp-3'} ${openable ? 'cursor-pointer' : ''}`}
      {...(openable ? { role: 'button', tabIndex: 0, 'aria-expanded': open, onClick: toggle, onKeyDown } : {})}
    >
      {text}
    </p>
  );
}

function Request({ row }: { row: RequestRow }) {
  const line = statusLine(row);
  const adopted = row.status === 'landed' && row.url;
  return (
    <li data-request className="border-b border-line py-3">
      <RequestText text={row.summary ?? row.text ?? 'A request'} />
      <p data-request-sent className="pt-1 text-sm text-muted">
        {KIND_NAMES[row.kind] ?? 'Request'} · {sentOn(row.sentAt)}
      </p>
      <p data-request-status className="pt-1 text-lg font-semibold">
        {adopted ? (
          <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-accent underline">
            {line}
          </a>
        ) : (
          line
        )}
      </p>
    </li>
  );
}

export function RequestsScreen() {
  const requests = useLiveQuery(listRequests, []);
  const failed = useStatusPulling();
  const from = requestsOf(useAddress());
  const back = from === 'about' ? 'About' : 'Settings';
  return (
    <>
      <ScreenHeader title="Your requests" back={<HeaderButton onClick={() => navigate(from)}>‹ {back}</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <div>
          <p className="py-4 text-base text-muted">What became of the things you asked for. The factory tells this phone as each one is filed, built, or answered.</p>
          {failed ? (
            <p role="status" className="pb-3 text-base text-muted">
              Could not check for news just now. This is what the phone has.
            </p>
          ) : null}
          {requests === undefined ? null : requests.length === 0 ? (
            <p data-requests-empty className="py-4 text-lg">
              Nothing sent yet. When you ask for another approach, or the tutor offers to send what it could not do, it is listed here.
            </p>
          ) : (
            <ul aria-label="Your requests">
              {requests.map((row) => (
                <Request key={row.txid} row={row} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
