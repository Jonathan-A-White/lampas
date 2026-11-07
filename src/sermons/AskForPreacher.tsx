// src/sermons/AskForPreacher.tsx — Ask for a preacher (mw-qtu3zvz.6, docs/sermons.md 'Ask for a preacher'): the sheet that tells the makers whom the sermon index lacks. A small form: the preacher or collection, why (optional) and a link
// (optional). Send posts one 'feedback' grist of the kind preacher through the one sender (askForPreacher in src/services/formCommands.ts), forwarded to the Mayor, with the verse he was on and the sermon
// sources he has On; it is kept in Your requests as Ask for a book is, and the sheet then reads 'Sent · the makers decide'. Sent to the mill, so it is licence-gated as every mill call is: without a licence the row on the Sermons
// sheet is greyed with 'Needs a licence' and this sheet is not opened (SermonsSheet.tsx). The Mayor decides what is added: the line says so.
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeName } from '../maps/placeName';
import { FAILURE_TITLES, TutorError } from '../services/tutor';
import { MAX_CREDIT_URL, MAX_MORE_NAME, MAX_PREACHER_WHY } from '../services/feedback';
import { askForPreacher } from '../services/formCommands';
import { useNoDoor } from '../tutor/door';
import { focusOnMount } from '../ui/focus';
import { isTooLong } from '../ui/lengthLimit';
import { LengthNote } from '../ui/LengthNote';
import { LimitedInput } from '../ui/LimitedField';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose } from '../ui/sheetDrag';
import { enabledSources, enabledServiceSources } from './index';
import type { SermonPlace } from './types';

/** What the sheet says once the makers have it. */
export const PREACHER_SENT_LINE = 'Sent · the makers decide';

const FIELD = 'w-full rounded-lg border border-line bg-surface px-3 text-base text-fg';

/** `place` is where he was on the Sermons sheet: the verse (or chapter) goes with the ask. */
export function AskForPreacher({ place, onClose }: { place: SermonPlace; onClose: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  // over the Sermons sheet (z-50): a form that sends a request and has nothing to ask about, so no ? over it
  useNoDoor();
  const ids = { name: useId(), why: useId(), whyCount: useId(), link: useId() };
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = name.trim().length > 0 && !isTooLong(why, MAX_PREACHER_WHY) && !busy;

  async function send(): Promise<void> {
    if (!ready) return;
    setBusy(true);
    setProblem(null);
    try {
      const sources = [...(await enabledSources()), ...(await enabledServiceSources())].map((source) => source.name);
      await askForPreacher({ name, why, link, verse: placeName(place), sources });
      setSent(true);
    } catch (error) {
      setProblem(error instanceof TutorError ? `${FAILURE_TITLES[error.failure]}: ${error.message}` : 'Not sent. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Ask for a preacher" data-ask-preacher className="relative flex max-h-[90dvh] flex-col rounded-t-2xl border-t border-line bg-surface">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 px-4 pt-2">
          <h2 className="min-w-0 text-xl font-bold">Ask for a preacher</h2>
          <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
          {sent ? (
            <div className="space-y-2 pt-2">
              <p role="status" data-preacher-sent className="text-lg font-semibold">
                {PREACHER_SENT_LINE}
              </p>
              <p className="text-base text-muted">Your requests follows it. The makers weigh each ask against what Lampas is for.</p>
            </div>
          ) : (
            <form
              className="space-y-3 pt-1"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <div>
                <label htmlFor={ids.name} className="block pb-1 text-base font-medium">
                  Which preacher or collection?
                </label>
                <LimitedInput
                  id={ids.name}
                  type="text"
                  value={name}
                  maxLength={MAX_MORE_NAME}
                  placeholder="A name, or a site or series"
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                  className={`${FIELD} min-h-12`}
                />
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
                  aria-invalid={isTooLong(why, MAX_PREACHER_WHY) || undefined}
                  onChange={(event) => setWhy(event.target.value)}
                  className={`${FIELD} resize-none py-2`}
                />
                <p className="pt-1 text-sm text-muted">Optional.</p>
                <LengthNote id={ids.whyCount} text={why} max={MAX_PREACHER_WHY} what="answer" className="pt-1" />
              </div>
              <div>
                <label htmlFor={ids.link} className="block pb-1 text-base font-medium">
                  A link
                </label>
                <LimitedInput
                  id={ids.link}
                  type="url"
                  value={link}
                  maxLength={MAX_CREDIT_URL}
                  placeholder="Optional"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => setLink(event.target.value)}
                  className={`${FIELD} min-h-12`}
                />
              </div>
              <p data-testid="preacher-sends" className="text-sm text-muted">
                Sends the name, your reason and link if you write them, the verse you were on and the sermon sources you have On. Nothing else leaves this phone.
              </p>
              {problem ? (
                <p role="alert" className="text-base font-semibold text-bad">
                  {problem}
                </p>
              ) : null}
            </form>
          )}
        </div>
        {sent ? null : (
          <div className="shrink-0 border-t border-line px-4 pb-[calc(0.5rem+var(--lp-end-inset))] pt-2">
            <button type="button" disabled={!ready} onClick={() => void send()} className="min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40">
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
