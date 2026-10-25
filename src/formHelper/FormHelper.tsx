// src/formHelper/FormHelper.tsx — 'Let the tutor do it' (mw-5r3p30.117, docs/ask-tutor.md): one button at the top of a form and, once tapped, a panel where the
// tutor asks ONE question at a time in plain words, asks for a photo at the moment it is needed and, after each answer, fills the matching
// field of the form, which he sees filled (a choice field too: the tutor answers with one of its options and onFill sets the form's own select). The tutor never
// sends: Send is his. A form with a `command` (the Command its own Send runs, voice-kit's formCommand) ends the panel with that command's offer line and a Send button
// that runs it with the form's values; without one the panel says to tap the form's Send. He answers in voice-kit's Composer, the one the Talk sheet and the Verse
// view's Ask use (Hold to answer, Type an answer, Attach a picture, Take a photo; mw-5r3p30.761): the pictures in a Reply go to the form as Files (`onPictures`, the same
// call the form's own picker makes), and a form with no `onPictures` has no place for one, so the Composer refuses it. A form adds it with one element:
//   <FormHelper form={SPEC} values={{ field: 'what it holds now' }} onFill={(field, value) => ...} onPictures={(files) => add the pictures} command={COMMAND} />
// The tutor is the bible-talk grind (src/services/talk.ts) in a talk from a screen named for the form, with `form` in the request.
import { useEffect, useRef, useState } from 'react';
import { Composer, type ComposerLabels, type ComposerMessage } from 'voice-kit/composer';
import { checkArgs, type Command } from 'voice-kit/talks';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askTalk, MAX_HISTORY_TURNS, type TalkHistoryEntry } from '../services/talk';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../services/tutor';
import { currentSettings } from '../settings/registry';
import { askTranscriber } from '../speech/askTranscriber';
import { tapWord, useTalkSettings } from '../talkSettings';
import { refuseNonPicture } from '../talk/pictures';
import { START_LABEL } from './startLabel';
import { applyFormValues, argsOf, buildFormRequest, FORM_START, oneQuestion, requiredFilled, type FormArgs, type FormSpec } from './formHelper';

export { START_LABEL };
/** What he says for the buttons that answer without typing. */
export const NO_PHOTO = 'I have no photo.';
export const ADDED_PHOTO = 'I added a photo.';
export const READY_LINE = 'Everything required is filled in. Read the form, change anything you like, then tap Send yourself.';

/** The Composer's words for answering the tutor. */
const ANSWER_LABELS: Partial<ComposerLabels> = {
  hold: 'Hold to answer', // tapWord makes it Tap to answer while Talk is Tap
  typeInstead: 'Type an answer',
  placeholder: 'Your answer',
  message: 'Your answer',
  speak: 'Answer by speaking',
  send: 'Reply',
  attach: 'Attach a picture',
  camera: 'Take a photo',
  toSend: 'Pictures to send',
};
/** Said, in the Composer's own line, when he adds a picture to a form that has no place for one. */
export const NO_PLACE_FOR_PICTURE = 'This form has no place for a picture.';

type Phase = { name: 'idle' } | { name: 'sending' } | { name: 'failed'; failure: TutorFailure; detail: string };

export interface FormHelperProps {
  form: FormSpec;
  /** what each field holds now, by field name; a pictures field holds a count such as '1 picture added', or '' */
  values: Record<string, string>;
  /** puts the tutor's value in the field (the form does the setting and shows it) */
  onFill: (field: string, value: string) => void;
  /** the pictures he attached or took in the Composer, as Files: the form adds them as its own picker's would (shrinks them, lists them). A form without it has no place for a picture. */
  onPictures?: (files: File[]) => void;
  /** called when the tutor has nothing more to ask and every required field holds something: the form may bring its top into view to be read */
  onReady?: () => void;
  /** the command the form's own Send runs: when the tutor has nothing more to ask and every required field holds something, the panel shows its offer line and a Send button that runs it */
  command?: Command;
  /** what the command takes beside the form's fields (ask-for-more's `kind`: one command name serves three forms) */
  commandArgs?: FormArgs;
}

export function FormHelper({ form, values, onFill, onPictures, onReady, command, commandArgs }: FormHelperProps) {
  const [open, setOpen] = useState(false);
  const [say, setSay] = useState('');
  const [ask, setAsk] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [running, setRunning] = useState(false);
  /** what the last Send said, and the values it sent (the line goes when he changes them) */
  const [done, setDone] = useState<{ said: string; of: string } | null>(null);
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  const talkSettings = useTalkSettings();
  const turns = useRef<TalkHistoryEntry[]>([]);
  const latest = useRef({ form, values, onFill, onReady, command, commandArgs });
  const live = useRef<AbortController>(new AbortController());
  const lastMessage = useRef('');
  useEffect(() => {
    latest.current = { form, values, onFill, onReady, command, commandArgs };
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
      const request = buildFormRequest(latest.current.form, latest.current.values, message, turns.current.slice(-MAX_HISTORY_TURNS), await currentSettings(), latest.current.command?.name);
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

  /** His tap on the panel's Send: the form's own command, with the values the form holds now. What it did (sent, waiting, refused) is the sheet's to show; the panel says it too. */
  async function sendForm(): Promise<void> {
    const { form: spec, values: held, command: run, commandArgs: beside } = latest.current;
    if (!run || running) return;
    const given = { ...argsOf(spec, held), ...beside };
    const signal = live.current.signal;
    setRunning(true);
    setDone(null);
    setSendProblem(null);
    try {
      const result = await run.run(given);
      if (!signal.aborted) setDone({ said: result.said, of: JSON.stringify(given) });
    } catch (err) {
      if (!signal.aborted) setSendProblem(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      if (!signal.aborted) setRunning(false);
    }
  }

  function start(): void {
    turns.current = [];
    setDone(null);
    setSendProblem(null);
    setSay('');
    setAsk(undefined);
    setOpen(true);
    void send(FORM_START);
  }

  function stop(): void {
    live.current.abort();
    live.current = new AbortController();
    setRunning(false);
    setOpen(false);
    setPhase({ name: 'idle' });
  }

  /** The Composer's Reply: the pictures go to the form first (the form lists them, and a picture added while the tutor asks for one is told to the tutor at once), then the words go to the tutor. */
  function reply({ text, files }: ComposerMessage): boolean {
    if (phase.name === 'sending') return false;
    const words = text.trim();
    if (files.length > 0) {
      if (!onPictures) throw new Error(NO_PLACE_FOR_PICTURE);
      onPictures(files.map((f) => new File([f.bytes as BlobPart], f.name, { type: f.type })));
    }
    if (words) void send(words);
    return true;
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
  const args = { ...argsOf(form, values), ...commandArgs };
  const sendable = command !== undefined && ready && !sending && (command.args ? checkArgs(command.args, args) === undefined : true);
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
      {ready && !sending && !command ? (
        <p role="status" className="text-base font-medium text-good">
          {READY_LINE}
        </p>
      ) : null}
      {sendable ? (
        <div className="space-y-2">
          <p className="break-words text-base font-medium text-good">{command.offer?.(args) ?? command.tell}</p>
          <button type="button" disabled={running} onClick={() => void sendForm()} className="min-h-12 w-full rounded-xl bg-accent px-4 text-lg font-medium text-accent-fg disabled:opacity-40">
            Send
          </button>
        </div>
      ) : null}
      {done && done.of === JSON.stringify(args) ? (
        <p role="status" className="break-words text-base font-semibold">
          {done.said}
        </p>
      ) : null}
      {sendProblem ? (
        <p role="alert" className="break-words text-base font-semibold text-bad">
          {sendProblem}
        </p>
      ) : null}
      {pictureField && !sending ? (
        <button type="button" onClick={() => void send(NO_PHOTO)} className="min-h-12 w-full rounded-xl border border-line px-4 text-base font-medium">
          No photo
        </button>
      ) : null}
      {!ready || sending || command ? (
        <Composer
          mode="speak"
          settings={{ ...talkSettings, attach: true, camera: true }}
          refuseFile={(file) => (onPictures ? refuseNonPicture(file) : NO_PLACE_FOR_PICTURE)}
          transcriber={askTranscriber}
          lang="en-US"
          appName="Lampas"
          labels={{ ...ANSWER_LABELS, hold: tapWord('Hold to answer', talkSettings.talk) }}
          disabled={sending}
          onSend={reply}
        />
      ) : null}
      <button type="button" onClick={stop} className="min-h-12 w-full rounded-xl px-4 text-base font-medium text-accent">
        Stop helping
      </button>
    </section>
  );
}
