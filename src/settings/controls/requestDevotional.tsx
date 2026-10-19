import { useEffect, useId, useRef, useState } from 'react';
import { SENT_LINE } from '../../AskApproachSheet';
import { useAiAllowed } from '../../gate/licenceContext';
import { buildDevotionalRequest, MAX_MORE_NAME, submitFeedback } from '../../services/feedback';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../../services/tutor';
import { isTooLong } from '../../ui/lengthLimit';
import { LengthNote } from '../../ui/LengthNote';
import { SettingRow } from './SettingRow';
import type { Control } from './types';
import { LimitedInput } from '../../ui/LimitedField';

type Phase = { name: 'editing' } | { name: 'sending' } | { name: 'sent' } | { name: 'failed'; failure: TutorFailure; detail: string };

/** Request a devotional (mw-1fwagb.8, PROVISIONAL), the last row of Settings > Daily, a button that opens the box in place: he types the title of a devotional of
 * his Logos library; Send posts it to the factory as a 'devotional' request through submitFeedback, the one sender, and the row says Sent. Nothing is added to
 * the list until the Mayor finds its Logos id and adds it to src/data/daily/devotionals.ts. Sent to the mill, so with no licence the row says so. */
export const RequestDevotionalControl: Control = ({ row }) => {
  const ai = useAiAllowed();
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'editing' });
  const field = useId();
  const hint = useId();
  const count = useId();
  const live = useRef(new AbortController());
  useEffect(() => {
    const controller = live.current;
    return () => controller.abort();
  }, []);

  const busy = phase.name === 'sending';
  const tooLong = isTooLong(title, MAX_MORE_NAME);
  const ready = title.trim().length > 0 && !tooLong && !busy;

  async function send(): Promise<void> {
    if (!ready) return;
    setPhase({ name: 'sending' });
    try {
      await submitFeedback(buildDevotionalRequest(title), { signal: live.current.signal });
      if (live.current.signal.aborted) return;
      setTitle('');
      setPhase({ name: 'sent' });
    } catch (err) {
      if (live.current.signal.aborted) return;
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      setPhase({ name: 'failed', failure: error.failure, detail: error.message });
    }
  }

  return (
    <SettingRow row={row}>
      <div role="group" aria-label={row.label}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="block min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
        >
          {row.label}
        </button>
        {open ? (
          ai ? (
            <form
              className="pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label htmlFor={field} className="block text-base font-medium">
                Devotional title
              </label>
              <p id={hint} className="pb-1 text-sm text-muted">
                The title of a devotional in your Logos library, and its author if you know it. The factory weighs each one.
              </p>
              <LimitedInput
                id={field}
                type="text"
                value={title}
                maxLength={MAX_MORE_NAME}
                aria-describedby={`${hint} ${count}`}
                aria-invalid={tooLong || undefined}
                autoComplete="off"
                disabled={busy}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (phase.name === 'sent') setPhase({ name: 'editing' });
                }}
                className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg disabled:opacity-60"
              />
              <LengthNote id={count} text={title} max={MAX_MORE_NAME} what="title" className="pt-1" />
              <button
                type="submit"
                disabled={!ready}
                className="mt-2 min-h-12 w-full rounded-xl bg-accent px-5 text-base font-medium text-accent-fg disabled:opacity-40"
              >
                {phase.name === 'failed' ? 'Retry' : 'Send'}
              </button>
            </form>
          ) : (
            <p className="pt-2 text-base text-muted">Asking goes to the factory through the tutor's mill, so it needs a licence.</p>
          )
        ) : null}
        <div className="pt-2 empty:hidden">
          {busy ? (
            <p role="status" className="text-sm text-muted">
              Sending…
            </p>
          ) : null}
          {phase.name === 'sent' ? (
            <p role="status" className="text-base font-semibold">
              {SENT_LINE}
            </p>
          ) : null}
          {phase.name === 'failed' ? (
            <div role="alert" className="space-y-1">
              <p className="text-base font-semibold text-bad">{FAILURE_TITLES[phase.failure]}</p>
              <p className="break-words text-sm text-muted">{phase.detail}</p>
            </div>
          ) : null}
        </div>
      </div>
    </SettingRow>
  );
};
