// src/formHelper/FormHelper.tsx — 'Let the tutor help me fill this in' (mw-5r3p30.117, docs/ask-tutor.md): one button at the top of a form and,
// once tapped, a panel where the tutor asks ONE question at a time in plain words, asks for a photo at the moment it is needed (the form's own
// picker) and, after each answer, fills the matching field of the form, which he sees filled. The tutor never sends: Send is the form's, and his.
// A form adds it with one element:
//   <FormHelper form={SPEC} values={{ field: 'what it holds now' }} onFill={(field, value) => ...} onPicker={(field) => open the picker} />
// The tutor is the bible-talk grind (src/services/talk.ts) in a talk from a screen named for the form, with `form` in the request.
import { useEffect, useId, useRef, useState } from 'react';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askTalk, MAX_HISTORY_TURNS, type TalkHistoryEntry } from '../services/talk';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../services/tutor';
import { currentSettings } from '../settings/registry';
import { applyFormValues, buildFormRequest, FORM_START, oneQuestion, requiredFilled, type FormSpec } from './formHelper';

export const START_LABEL = 'Let the tutor help me fill this in';
/** What he says for the buttons that answer without typing. */
export const NO_PHOTO = 'I have no photo.';
export const ADDED_PHOTO = 'I added a photo.';
export const READY_LINE = 'Everything required is filled in. Read the form, change anything you like, then tap Send yourself.';

type Phase = { name: 'idle' } | { name: 'sending' } | { name: 'failed'; failure: TutorFailure; detail: string };

export interface FormHelperProps {
  form: FormSpec;
  /** what each field holds now, by field name; a pictures field holds a count such as '1 picture added', or '' */
  values: Record<string, string>;
  /** puts the tutor's value in the field (the form does the setting and shows it) */
  onFill: (field: string, value: string) => void;
  /** opens the form's own picker for the pictures field; called in the tap that asks for it, so the phone allows it */
  onPicker?: (field: string) => void;
  /** called when the tutor has nothing more to ask and every required field holds something: the form may bring its top into view to be read */
  onReady?: () => void;
}

export function FormHelper({ form, values, onFill, onPicker, onReady }: FormHelperProps) {
  const [open, setOpen] = useState(false);
  const [say, setSay] = useState('');
  const [ask, setAsk] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [typed, setTyped] = useState('');
  const answerId = useId();
  const turns = useRef<TalkHistoryEntry[]>([]);
  const latest = useRef({ form, values, onFill, onReady });
  const live = useRef<AbortController>(new AbortController());
  const lastMessage = useRef('');
  useEffect(() => {
    latest.current = { form, values, onFill, onReady };
  });
  useEffect(() => {
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => controller.abort();
  }, []);

  async function send(message: string): Promise<void> {
    lastMessage.current = message;
    const signal = live.current.signal;
    setPhase({ name: 'sending' });
    try {
      const request = buildFormRequest(latest.current.form, latest.current.values, message, turns.current.slice(-MAX_HISTORY_TURNS), await currentSettings());
      const answer = await askTalk(request, { key: getDeviceKeyBytes(), signal });
      if (signal.aborted) return;
      const said = oneQuestion(answer.answer);
      turns.current = [...turns.current, { q: message, a: said }].slice(-MAX_HISTORY_TURNS);
      const merged = { ...latest.current.values };
      for (const { field, value } of applyFormValues(latest.current.form, answer.form_values)) {
        latest.current.onFill(field, value);
        merged[field] = value;
      }
      const next = latest.current.form.fields.some((f) => f.name === answer.form_ask) ? answer.form_ask : undefined;
      setSay(said);
      setAsk(next);
      if (!next && requiredFilled(latest.current.form, merged)) latest.current.onReady?.();
      setPhase({ name: 'idle' });
    } catch (err) {
      if (signal.aborted) return;
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      setPhase({ name: 'failed', failure: error.failure, detail: error.message });
    }
  }

  // A photo he adds while the tutor is asking for one is told to the tutor at once.
  const pictureField = ask ? form.fields.find((f) => f.name === ask && f.kind === 'pictures') : undefined;
  const pictureHeld = pictureField ? (values[pictureField.name] ?? '') : '';
  const heldBefore = useRef(pictureHeld);
  useEffect(() => {
    if (open && pictureField && phase.name === 'idle' && heldBefore.current === '' && pictureHeld !== '') void send(ADDED_PHOTO);
    heldBefore.current = pictureHeld;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pictureHeld]);

  function start(): void {
    turns.current = [];
    setSay('');
    setAsk(undefined);
    setTyped('');
    setOpen(true);
    void send(FORM_START);
  }

  function stop(): void {
    live.current.abort();
    live.current = new AbortController();
    setOpen(false);
    setPhase({ name: 'idle' });
  }

  function reply(): void {
    const text = typed.trim();
    if (!text || phase.name === 'sending') return;
    setTyped('');
    void send(text);
  }

  if (!open) {
    return (
      <div className="shrink-0 border-t border-line px-4 py-3">
        <button type="button" onClick={start} className="min-h-12 w-full rounded-xl bg-accent px-4 text-lg font-medium text-accent-fg">
          {START_LABEL}
        </button>
      </div>
    );
  }

  const sending = phase.name === 'sending';
  const ready = requiredFilled(form, values) && !ask;
  return (
    <section role="region" aria-label="The tutor is helping with this form" className="max-h-[45dvh] shrink-0 space-y-3 overflow-y-auto overscroll-contain border-t border-line bg-canvas px-4 py-3">
      {say ? (
        <p data-form-helper-say="" aria-live="polite" className="text-lg font-semibold leading-snug">
          {say}
        </p>
      ) : null}
      {sending ? (
        <p role="status" className="text-base text-muted">
          {say ? 'The tutor is thinking…' : 'The tutor is getting ready…'}
        </p>
      ) : null}
      {phase.name === 'failed' ? (
        <div role="alert" className="space-y-1">
          <p className="text-base font-semibold text-bad">{FAILURE_TITLES[phase.failure]}</p>
          <p className="break-words text-sm text-muted">{phase.detail}</p>
          <button type="button" onClick={() => void send(lastMessage.current)} className="min-h-12 rounded-xl border border-line px-4 text-base font-medium">
            Retry
          </button>
        </div>
      ) : null}
      {ready && !sending ? (
        <p role="status" className="text-base font-medium text-good">
          {READY_LINE}
        </p>
      ) : null}
      {pictureField && !sending ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => onPicker?.(pictureField.name)} className="min-h-12 flex-1 rounded-xl bg-accent px-4 text-base font-medium text-accent-fg">
            Choose a photo
          </button>
          <button type="button" onClick={() => void send(NO_PHOTO)} className="min-h-12 flex-1 rounded-xl border border-line px-4 text-base font-medium">
            No photo
          </button>
        </div>
      ) : null}
      {!ready || sending ? (
        <div className="space-y-2">
          <label htmlFor={answerId} className="block text-base font-medium">
            Your answer
          </label>
          <textarea
            id={answerId}
            rows={2}
            value={typed}
            disabled={sending}
            onChange={(e) => setTyped(e.target.value)}
            className="block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg text-fg disabled:opacity-60"
          />
          <button type="button" disabled={sending || typed.trim() === ''} onClick={reply} className="min-h-12 w-full rounded-xl border border-line px-4 text-base font-medium disabled:opacity-40">
            Reply
          </button>
        </div>
      ) : null}
      <button type="button" onClick={stop} className="min-h-12 w-full rounded-xl px-4 text-base font-medium text-accent">
        Stop helping
      </button>
    </section>
  );
}
