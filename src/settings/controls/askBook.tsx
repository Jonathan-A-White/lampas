import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { useAiAllowed } from '../../gate/licenceContext';
import { listAskedBooks, listWaitingBooks } from '../../data/repositories/bookRequests';
import { askForBook, bookSending, sendWaitingBooks, startBookRequests, subscribeBookSending } from '../../services/bookRequests';
import { MAX_BOOK_CHARS } from '../../services/feedback';
import { FAILURE_TITLES } from '../../services/tutor';
import { isTooLong } from '../../ui/lengthLimit';
import { LengthNote } from '../../ui/LengthNote';

/** How many of the books he asked for show under the box: Your requests holds them all. */
const ASKED_SHOWN = 3;

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Ask for another book (mw-5r3p30.382, PROVISIONAL), the last line of Settings > Grammar books, a button that opens the box in place (the Logos card
 * stays short enough that the setting below it is one screen away, tests/e2e/study-resources.spec.ts): he types the title of a grammar book of his Logos
 * library, and the author if he knows it. Send keeps it on the phone and sends it to the factory as a request (src/services/bookRequests.ts); offline it
 * waits and goes by itself. The line under the box says Waiting to send or Asked; Your requests follows it from there. Nothing is added to the app until a
 * story adds the book's entry. Sent to the mill, so not drawn without a licence. */
export function AskForBook() {
  const ai = useAiAllowed();
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const field = useId();
  const hint = useId();
  const count = useId();
  const online = useOnline();
  const { sending, problem } = useSyncExternalStore(subscribeBookSending, bookSending);
  const waiting = useLiveQuery(listWaitingBooks, []);
  const asked = useLiveQuery(listAskedBooks, []);
  useEffect(() => startBookRequests(), []);
  if (!ai) return null;

  const tooLong = isTooLong(title, MAX_BOOK_CHARS);
  const ready = title.trim().length > 0 && !tooLong;
  const send = (): void => {
    if (!ready) return;
    const typed = title;
    setTitle('');
    void askForBook(typed);
  };
  return (
    <div role="group" aria-label="Ask for another book" className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="block min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
      >
        Ask for another book
      </button>
      {open ? (
        <form
          className="pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor={field} className="block text-base font-medium">
            Book title
          </label>
          <p id={hint} className="pb-1 text-sm text-muted">
            The title of a grammar book in your Logos library, and its author if you know it. The factory weighs each one.
          </p>
          <input
            id={field}
            type="text"
            value={title}
            aria-describedby={`${hint} ${count}`}
            aria-invalid={tooLong || undefined}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <LengthNote id={count} text={title} max={MAX_BOOK_CHARS} what="title" className="pt-1" />
          <button
            type="submit"
            disabled={!ready}
            className="mt-2 min-h-12 w-full rounded-xl bg-accent px-5 text-base font-medium text-accent-fg disabled:opacity-40"
          >
            Send
          </button>
        </form>
      ) : null}
      <div className="pt-2 empty:hidden">
        {(waiting ?? []).map((w) => (
          <p key={w.id} className="break-words text-base">{`Waiting to send: ${w.text}`}</p>
        ))}
        {waiting?.length ? (
          sending ? (
            <p role="status" className="text-sm text-muted">
              Sending…
            </p>
          ) : problem && online ? (
            <div role="alert" className="space-y-1">
              <p className="text-base font-semibold text-bad">{FAILURE_TITLES[problem.failure]}</p>
              <p className="break-words text-sm text-muted">{problem.detail}</p>
            </div>
          ) : !online ? (
            <p className="text-sm text-muted">It goes when you are back online.</p>
          ) : null
        ) : null}
        {waiting?.length && online && !sending && problem ? (
          <button type="button" onClick={() => void sendWaitingBooks()} className="mt-1 min-h-12 rounded-lg border border-line px-4 text-base font-medium">
            Try again
          </button>
        ) : null}
        {(asked ?? []).slice(0, ASKED_SHOWN).map((r) => (
          <p key={r.txid} className="break-words text-base">{`Asked: ${r.text ?? ''}`}</p>
        ))}
      </div>
    </div>
  );
}
