// src/AskApproachSheet.tsx — Settings > Grammar approach > Ask for another approach: the bottom sheet where he says what approach he
// wants and how it teaches, adds up to four screenshots or photos (each shrunk on the phone, src/images/shrink.ts) and names who to
// credit, with a link if there is one. Send posts a 'feedback' grist to the factory (src/services/feedback.ts). Send waits for the
// text and the credit; Back, Done, Escape, a swipe down or a tap outside close the sheet (src/ui/sheetBack.ts).
import { useEffect, useId, useRef, useState } from 'react';
import { FormHelper } from './formHelper/FormHelper';
import { APPROACH_FORM, CREDIT_HINT, LINK_HINT } from './formHelper/approachForm';
import { shrinkImage } from './images/shrink';
import { buildFeedbackRequest, MAX_CREDIT_NAME, MAX_CREDIT_URL, MAX_FEEDBACK_CHARS, MAX_PICTURES, submitFeedback } from './services/feedback';
import { FAILURE_TITLES, TutorError, type TutorFailure } from './services/tutor';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

export const SENT_LINE = 'Sent: the factory has it';

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
/** The line when he picks more pictures than a grist carries. */
const LIMIT_LINE = `${NUMBER_WORDS[MAX_PICTURES] ?? MAX_PICTURES} pictures at most. The rest were left out.`;

interface Picture {
  id: number;
  blob: Blob;
  url: string | null;
}

type Phase = { name: 'editing' } | { name: 'sending' } | { name: 'sent' } | { name: 'failed'; failure: TutorFailure; detail: string };

const kilobytes = (bytes: number): string => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const urlOf = (blob: Blob): string | null => (typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null);

const FIELD = 'block w-full rounded-lg border border-line bg-canvas px-3 text-lg text-fg disabled:opacity-60';

export function AskApproachSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [shrinking, setShrinking] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'editing' });
  const [filled, setFilled] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atTop = useRef(false);
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const ids = { text: useId(), name: useId(), link: useId(), nameHint: useId(), linkHint: useId() };
  const nextId = useRef(0);
  const live = useRef(new AbortController());
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const controller = live.current;
    const made = urls.current;
    return () => {
      controller.abort();
      for (const url of made) URL.revokeObjectURL(url);
    };
  }, []);

  const FILL: Record<string, (value: string) => void> = { approach: setText, credit: setName, link: setLink };
  /** The tutor filled a field: the field shows it, ringed, and is scrolled into view. */
  function fill(field: string, value: string): void {
    FILL[field]?.(value);
    setFilled(field);
    atTop.current = false;
    requestAnimationFrame(() => atTop.current || document.getElementById(ids[field === 'approach' ? 'text' : field === 'credit' ? 'name' : 'link'])?.scrollIntoView?.({ block: 'nearest' }));
  }
  const ring = (field: string): string => (filled === field ? ' ring-2 ring-accent' : '');

  const busy = phase.name === 'sending';
  const ready = text.trim().length > 0 && name.trim().length > 0 && shrinking === 0;

  async function add(chosen: File[]): Promise<void> {
    const room = Math.max(0, MAX_PICTURES - pictures.length - shrinking);
    const taken = chosen.slice(0, room);
    setNotice(chosen.length > taken.length ? LIMIT_LINE : null);
    if (taken.length === 0) return;
    setShrinking((n) => n + taken.length);
    const results = await Promise.allSettled(taken.map((file) => shrinkImage(file)));
    if (live.current.signal.aborted) return;
    const added: Picture[] = [];
    let failed = 0;
    for (const result of results) {
      if (result.status === 'rejected') {
        failed += 1;
        continue;
      }
      const url = urlOf(result.value);
      if (url) urls.current.push(url);
      added.push({ id: ++nextId.current, blob: result.value, url });
    }
    setShrinking((n) => n - taken.length);
    setPictures((all) => [...all, ...added]);
    if (failed > 0) setNotice(failed === 1 ? 'One picture could not be used.' : `${failed} pictures could not be used.`);
  }

  function remove(picture: Picture): void {
    if (picture.url) URL.revokeObjectURL(picture.url);
    setPictures((all) => all.filter((p) => p.id !== picture.id));
    setNotice(null);
  }

  async function send(): Promise<void> {
    if (!ready || busy) return;
    setPhase({ name: 'sending' });
    try {
      const files = await Promise.all(
        pictures.map(async (p, i) => ({ bytes: new Uint8Array(await p.blob.arrayBuffer()), mime: 'image/jpeg', name: `picture-${i + 1}.jpg` })),
      );
      await submitFeedback(buildFeedbackRequest(text, name, link), { files, signal: live.current.signal });
      if (live.current.signal.aborted) return;
      setPhase({ name: 'sent' });
    } catch (err) {
      if (live.current.signal.aborted) return;
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      setPhase({ name: 'failed', failure: error.failure, detail: error.message });
    }
  }

  const sent = phase.name === 'sent';
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask for another approach"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold leading-tight">Ask for another approach</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-12 min-w-12 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        {sent || busy ? null : (
          <FormHelper
            form={APPROACH_FORM}
            values={{ approach: text, pictures: pictures.length ? `${pictures.length} ${pictures.length === 1 ? 'picture' : 'pictures'} added` : '', credit: name, link }}
            onFill={fill}
            onPicker={() => picker.current?.click()}
            onReady={() => {
              atTop.current = true;
              scroller.current?.scrollTo?.({ top: 0 });
            }}
          />
        )}
        {sent ? (
          <div className="min-h-0 flex-1 border-t border-line px-4 py-4">
            <p role="status" className="text-lg font-semibold">
              {SENT_LINE}
            </p>
          </div>
        ) : (
          <>
            <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-line px-4 py-3">
              <div>
                <label htmlFor={ids.text} className="block pb-1 text-base font-medium">
                  What approach, and how does it teach?
                </label>
                <textarea
                  id={ids.text}
                  rows={5}
                  maxLength={MAX_FEEDBACK_CHARS}
                  value={text}
                  disabled={busy}
                  onChange={(e) => setText(e.target.value)}
                  className={`${FIELD} resize-none py-2${ring('approach')}`}
                />
              </div>
              <div>
                <label className="flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-4 text-base font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  Add a screenshot or photo
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={picker}
                    disabled={busy}
                    className="sr-only"
                    onChange={(e) => {
                      const chosen = Array.from(e.target.files ?? []);
                      e.target.value = '';
                      void add(chosen);
                    }}
                  />
                </label>
                {notice ? (
                  <p role="alert" className="pt-2 text-base text-bad">
                    {notice}
                  </p>
                ) : null}
                {shrinking > 0 ? (
                  <p role="status" className="pt-2 text-base text-muted">
                    Shrinking…
                  </p>
                ) : null}
                {pictures.length > 0 ? (
                  <ul aria-label="Pictures" className="space-y-2 pt-2">
                    {pictures.map((p, i) => (
                      <li key={p.id} data-picture className="flex items-center gap-3">
                        {p.url ? <img src={p.url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg border border-line" />}
                        <span className="min-w-0 flex-1 truncate text-base">
                          Picture {i + 1} · {kilobytes(p.blob.size)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove picture ${i + 1}`}
                          disabled={busy}
                          onClick={() => remove(p)}
                          className="min-h-12 shrink-0 rounded-lg border border-line px-4 text-base font-medium disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <label htmlFor={ids.name} className="block pb-1 text-base font-medium">
                  Who to credit
                </label>
                <input
                  id={ids.name}
                  type="text"
                  maxLength={MAX_CREDIT_NAME}
                  value={name}
                  required
                  aria-describedby={ids.nameHint}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                  className={`${FIELD} min-h-12${ring('credit')}`}
                />
                <p id={ids.nameHint} className="pt-1 text-sm text-muted">
                  {CREDIT_HINT}
                </p>
              </div>
              <div>
                <label htmlFor={ids.link} className="block pb-1 text-base font-medium">
                  Link
                </label>
                <input
                  id={ids.link}
                  type="text"
                  inputMode="url"
                  maxLength={MAX_CREDIT_URL}
                  value={link}
                  aria-describedby={ids.linkHint}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  onChange={(e) => setLink(e.target.value)}
                  className={`${FIELD} min-h-12${ring('link')}`}
                />
                <p id={ids.linkHint} className="pt-1 text-sm text-muted">
                  {LINK_HINT}
                </p>
              </div>
            </div>
            <div className="shrink-0 space-y-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))]">
              {phase.name === 'failed' ? (
                <div role="alert" className="space-y-1">
                  <p className="text-base font-semibold text-bad">{FAILURE_TITLES[phase.failure]}</p>
                  <p className="break-words text-sm text-muted">{phase.detail}</p>
                </div>
              ) : null}
              {busy ? (
                <p role="status" className="text-base text-muted">
                  Sending…
                </p>
              ) : null}
              <button
                type="button"
                disabled={!ready || busy}
                onClick={() => void send()}
                className="min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40"
              >
                {phase.name === 'failed' ? 'Retry' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
