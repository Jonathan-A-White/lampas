// src/library/AskForBook.tsx — Ask for a book (docs/design/library-at-scale.md 6.1, mw-rfjjzd.14, PROVISIONAL): the one sheet that asks the makers for a book, in place of the four boxes (Ask for another book,
// Request a devotional, Ask for more's study-resource form and the idea sheet's). It opens from the Library card, the idea sheet ('Ask for a grammar'), Settings > Daily ('Ask for a devotional') and Ask for
// more ('A study resource'), with the kind of book preset where the place has one. With a Logos list kept he searches the books Lampas does not open and a pick fills the request with the row's Resource ID,
// Type, Series and ReferenceSupersets, so the makers add it without research; without one he types the title. One line says what is sent. Send keeps the request on the phone and sends it
// (src/services/bookRequests.ts): offline it waits and goes by itself; a book already in the catalogue or already asked is refused with its line. Your requests follows it from there. Sent to the mill, so
// the places that open it are not drawn without a licence. At its top, 'Let the tutor do it' (src/formHelper/): the tutor asks which book, what kind and why in a talk, fills the fields he sees
// and ends with a Send button; that Send and this sheet's own run the one command, ask-for-book (bookCommand.ts), so the refusal, the waiting and the sent line are the same from either.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { SENT_LINE } from '../AskApproachSheet';
import { listWaitingBooks } from '../data/repositories/bookRequests';
import { unmatchedRows, type ExportedRow } from '../data/repositories/library';
import { KINDS, type Kind } from '../resources/catalogue';
import { argsOf } from '../formHelper/formHelper';
import { FormHelper } from '../formHelper/FormHelper';
import { bookSending, sendWaitingBooks, startBookRequests, subscribeBookSending } from '../services/bookRequests';
import { MAX_BOOK_CHARS, MAX_FEEDBACK_CHARS } from '../services/feedback';
import { FAILURE_TITLES } from '../services/tutor';
import { focusOnMount } from '../ui/focus';
import { isTooLong } from '../ui/lengthLimit';
import { LengthNote } from '../ui/LengthNote';
import { LimitedInput } from '../ui/LimitedField';
import { matching } from '../ui/listFilter';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose } from '../ui/sheetDrag';
import { bookCommand } from './bookCommand';
import { BOOK_FORM } from './bookForm';
import { infoOf } from './kinds';
import { usableKind } from './usableRows';

/** The most results the search shows at once; the line under the field says when more match. */
const MAX_RESULTS = 30;
const FIELD = 'w-full rounded-lg border border-line bg-surface px-3 text-base text-fg';

/** What a row of his list is, in a word: the kind of book it would be, else its Logos type. */
function kindWord(row: ExportedRow): string {
  const kind = usableKind(row);
  return kind ? infoOf(kind).singular : row.type;
}

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

/** `kind` is the kind of book the place he opened it from asks for (a grammar from the idea sheet, a devotional from Daily); none for the rest. */
export function AskForBook({ kind, onClose }: { kind?: Kind; onClose: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const ids = { query: useId(), title: useId(), why: useId(), whyCount: useId(), kind: useId() };
  const rows = useLiveQuery(unmatchedRows, []);
  const waiting = useLiveQuery(listWaitingBooks, []);
  const { sending, problem } = useSyncExternalStore(subscribeBookSending, bookSending);
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ExportedRow | null>(null);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [wanted, setWanted] = useState<Kind | ''>(kind ?? '');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [asked, setAsked] = useState<{ id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);
  // the one command both Sends run; it tells the sheet what it did, and which row of his list is picked
  const command = useMemo(
    () =>
      bookCommand(
        (result) => {
          if ('refusal' in result) setRefusal(result.refusal);
          else setAsked({ id: result.kept.id, title: result.kept.title });
        },
        () => picked,
      ),
    [picked],
  );
  useEffect(() => startBookRequests(), []);

  const items = useMemo(() => (rows ?? []).map((r) => ({ id: r.resource, name: r.title, also: `${r.series} ${r.resource}` })), [rows]);
  const found = query.trim() === '' ? [] : matching(items, query);
  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.resource, r])), [rows]);
  const results = found.slice(0, MAX_RESULTS).map((item) => byId.get(item.id)!);

  const words = picked ? picked.title : title;
  const tooLong = isTooLong(words, MAX_BOOK_CHARS) || isTooLong(why, MAX_FEEDBACK_CHARS);
  const ready = words.trim().length > 0 && !tooLong && !busy;

  const values = { title: words, kind: wanted ? infoOf(wanted).singular : '', why };

  async function send(): Promise<void> {
    if (!ready) return;
    setBusy(true);
    setRefusal(null);
    try {
      await command.run(argsOf(BOOK_FORM, values));
    } finally {
      setBusy(false);
    }
  }

  /** The tutor filled a field: the field shows it, ringed. A title that is the one book of his list that matches picks that book, as tapping it would. */
  function fill(field: string, value: string): void {
    if (field === 'title') {
      setTitle(value);
      setRefusal(null);
      const found = matching(items, value);
      setPicked(rows && found.length === 1 ? (byId.get(found[0].id) ?? null) : null);
    } else if (field === 'kind') setWanted(KINDS.find((k) => infoOf(k).singular === value) ?? '');
    else if (field === 'why') setWhy(value);
    else return;
    setFilled(field);
  }
  const ring = (field: string): string => (filled === field ? ' ring-2 ring-accent' : '');

  const stillWaiting = asked !== null && (waiting ?? []).some((w) => w.id === asked.id);
  // drawn in the body: a sheet that opens inside another (the idea sheet is dragged by a transform) would be placed by it
  return createPortal(
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Ask for a book" className="relative flex max-h-[90dvh] flex-col rounded-t-2xl border-t border-line bg-surface">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 px-4 pt-2">
          <h2 className="min-w-0 text-xl font-bold">Ask for a book</h2>
          <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        {asked ? null : <FormHelper form={BOOK_FORM} values={values} onFill={fill} command={command} />}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
          {asked ? (
            <div className="space-y-2 pt-2">
              {stillWaiting ? (
                <>
                  <p className="break-words text-base font-semibold">{`Waiting to send: ${asked.title}`}</p>
                  {sending ? (
                    <p role="status" className="text-sm text-muted">
                      Sending…
                    </p>
                  ) : problem && online ? (
                    <div role="alert" className="space-y-1">
                      <p className="text-base font-semibold text-bad">{FAILURE_TITLES[problem.failure]}</p>
                      <p className="break-words text-sm text-muted">{problem.detail}</p>
                      <button type="button" onClick={() => void sendWaitingBooks()} className="min-h-12 rounded-lg border border-line px-4 text-base font-medium">
                        Try again
                      </button>
                    </div>
                  ) : !online ? (
                    <p className="text-sm text-muted">It goes when you are back online.</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p role="status" className="text-lg font-semibold">
                    {SENT_LINE}
                  </p>
                  <p className="text-base text-muted">Your requests follows it: filed, being built, or answered.</p>
                </>
              )}
            </div>
          ) : (
            <form
              className="space-y-3 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <p className="text-base font-medium">Which book?</p>
              {rows && rows.length > 0 ? (
                picked ? (
                  <div data-testid="ask-picked" className={`rounded-lg border border-line px-3 py-2${ring('title')}`}>
                    <p className="title-wrap text-base font-medium">{picked.title}</p>
                    <p className="text-sm text-muted">{[kindWord(picked), picked.series].filter(Boolean).join(' · ')}</p>
                    <button type="button" onClick={() => setPicked(null)} className="mt-1 min-h-11 text-base font-medium text-accent underline underline-offset-4">
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      id={ids.query}
                      type="search"
                      value={query}
                      placeholder={`Search your ${rows.length.toLocaleString('en')} other books`}
                      aria-label="Search your other books"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="search"
                      onChange={(e) => setQuery(e.target.value)}
                      className={`${FIELD} min-h-12`}
                    />
                    {query.trim() === '' ? null : found.length === 0 ? (
                      <p className="pt-1 text-sm text-muted">No book of yours matches</p>
                    ) : (
                      <>
                        <p className="pt-1 text-sm text-muted" aria-live="polite">
                          {found.length > MAX_RESULTS ? `${MAX_RESULTS} of ${found.length.toLocaleString('en')} shown: type more to narrow them` : `${found.length} ${found.length === 1 ? 'book' : 'books'}`}
                        </p>
                        <ul data-testid="ask-results" className="mt-1 divide-y divide-line rounded-lg border border-line">
                          {results.map((r) => (
                            <li key={r.resource}>
                              <button type="button" onClick={() => setPicked(r)} className="flex min-h-12 w-full flex-col items-start justify-center px-3 py-2 text-left text-base">
                                <span className="title-wrap font-medium">{r.title}</span>
                                <span className="text-sm text-muted">{[kindWord(r), r.series].filter(Boolean).join(' · ')}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )
              ) : null}
              {picked ? null : (
                <div>
                  {rows && rows.length > 0 ? <label htmlFor={ids.title} className="block pb-1 text-base">or type a title</label> : null}
                  <LimitedInput
                    id={ids.title}
                    type="text"
                    aria-label="Book title"
                    value={title}
                    maxLength={MAX_BOOK_CHARS}
                    placeholder="The title, and its author if you know it"
                    autoComplete="off"
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setRefusal(null);
                    }}
                    className={`${FIELD} min-h-12${ring('title')}`}
                  />
                </div>
              )}
              <div>
                <label htmlFor={ids.kind} className="block pb-1 text-base font-medium">
                  Kind of book
                </label>
                <select
                  id={ids.kind}
                  value={wanted}
                  onChange={(e) => setWanted(e.target.value as Kind | '')}
                  className={`${FIELD} min-h-12${ring('kind')}`}
                >
                  <option value="">Any kind</option>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {infoOf(k).singular}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={ids.why} className="block pb-1 text-base font-medium">
                  Why would it help?
                </label>
                <textarea
                  id={ids.why}
                  rows={2}
                  value={why}
                  aria-describedby={ids.whyCount}
                  aria-invalid={isTooLong(why, MAX_FEEDBACK_CHARS) || undefined}
                  onChange={(e) => setWhy(e.target.value)}
                  className={`${FIELD} resize-none py-2${ring('why')}`}
                />
                <p className="pt-1 text-sm text-muted">Optional.</p>
                <LengthNote id={ids.whyCount} text={why} max={MAX_FEEDBACK_CHARS} what="answer" className="pt-1" />
              </div>
              <p data-testid="ask-sends" className="text-sm text-muted">
                Sends the title of the book, your reason if you write one, and its Logos details if you pick it from your list. Nothing else leaves this phone. The makers weigh each ask against what Lampas is for.
              </p>
              {refusal ? (
                <p role="alert" className="text-base font-semibold">
                  {refusal}
                </p>
              ) : null}
            </form>
          )}
        </div>
        {asked ? null : (
          <div className="shrink-0 border-t border-line px-4 pb-[calc(0.5rem+var(--lp-end-inset))] pt-2">
            <button
              type="button"
              disabled={!ready}
              onClick={() => void send()}
              className="min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
