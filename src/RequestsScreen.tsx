// src/RequestsScreen.tsx — Your requests (mw-vy3ghg.5, #/requests, reached from Settings > More and from About): every request he sent to the
// factory, the newest first, each with where it stands: Sent, Filed, Being built, Adopted in <version> (a link to the commit), Declined: <reason>
// or Now a setting: <name>. The backend pushes nothing for a grist, so while the screen is up it pulls the mill's request-status records
// (src/services/requestStatus.ts) when it opens and every requestTimings.pollMs; the list is a live query, so a record shows as it is applied.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { listRequests, type RequestRow } from './data/repositories/requests';
import { navigate } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { getDeviceKeyBytes } from './services/deviceKey';
import { pullStatuses, requestTimings } from './services/requestStatus';

const KIND_NAMES: Record<string, string> = { 'grammar-approach': 'Grammar approach', 'tutor-ask': 'Asked the tutor' };

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

/** Pulls the statuses now and then until the screen goes; true while the last pull failed. One pull at a time. */
function useStatusPulling(): boolean {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const stop = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mill: string | undefined;
    const run = async (): Promise<void> => {
      if (!document.hidden) {
        try {
          mill = (await pullStatuses({ key: getDeviceKeyBytes(), signal: stop.signal, mill })).mill;
          if (!stop.signal.aborted) setFailed(false);
        } catch {
          if (!stop.signal.aborted) setFailed(true);
        }
      }
      if (!stop.signal.aborted) timer = setTimeout(() => void run(), requestTimings.pollMs);
    };
    void run();
    return () => {
      stop.abort();
      clearTimeout(timer);
    };
  }, []);
  return failed;
}

function Request({ row }: { row: RequestRow }) {
  const line = statusLine(row);
  const adopted = row.status === 'landed' && row.url;
  return (
    <li data-request className="border-b border-line py-3">
      <p className="line-clamp-3 break-words text-lg">{row.summary ?? row.text ?? 'A request'}</p>
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
  return (
    <>
      <ScreenHeader title="Your requests" back={<HeaderButton onClick={() => navigate('settings')}>‹ Settings</HeaderButton>} />
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
