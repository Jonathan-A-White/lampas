// src/settings/AskMoreScreen.tsx — Ask for more (mw-hqd5bz.37, #/askmore, Settings > More): the page for asks that would grow the app, an approach or
// programme, a study resource, a text or a translation. It leads with Ask the tutor, the easiest way (the Governor, 2026-10-12): a talk over this
// screen opens with "I'd like Lampas to have " typed in its composer, not sent, and the tutor offers Send this to the makers
// (grinds/bible-talk.instructions/270-asks-the-app-cannot-meet.md). Under it, Or fill in a form: one short form per kind (what, why, a link), opened in
// place one at a time, each with 'Let the tutor do it' at its top (src/formHelper/); Send posts one 'feedback' grist of that kind through the ask-for-more command
// (src/services/formCommands.ts), the one path the form's Send and the Send of the tutor's panel both take. Both go to the mill, so without a licence the page says so
// and offers Needs a licence instead.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NO_CHAPTER } from '../data/chapter';
import { useAiAllowed } from '../gate/licenceContext';
import { evidenceSummary, memorizingEvidenceNow, NO_RECALLS } from '../memorize/evidence';
import { backTo, openLicence } from '../nav/route';
import { ScreenHeader, HeaderButton } from '../ScreenHeader';
import { SENT_LINE } from '../AskApproachSheet';
import { AskForBook } from '../library/AskForBook';
import { argsOf, type FormArgs } from '../formHelper/formHelper';
import { FormHelper } from '../formHelper/FormHelper';
import { MORE_FORMS, MORE_WORDS } from '../formHelper/moreForms';
import { MAX_CREDIT_URL, MAX_FEEDBACK_CHARS, MAX_MORE_NAME, MORE_KINDS, type MoreKind } from '../services/feedback';
import { askForMoreCommand } from '../services/formCommands';
import type { TalkScope } from '../services/talk';
import { scopeRef } from '../services/talk';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../services/tutor';
import { TalkHost } from '../share/ShareTalk';
import { fitScreen, SCREEN_NAMES, type ScreenFact } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { isTooLong } from '../ui/lengthLimit';
import { LengthNote } from '../ui/LengthNote';
import { LimitedInput } from '../ui/LimitedField';

/** What the talk opens with in its composer: he finishes the sentence. */
export const ASK_BEGUN = "I'd like Lampas to have ";

const NAME = SCREEN_NAMES.askmore;

/** A study resource is asked for as a book: its button opens Ask for a book (mw-rfjjzd.14), not a form of its own. */
const STUDY_RESOURCE = 'A study resource';

/** What the tutor is told of the page. */
const FACTS: ScreenFact[] = [
  { label: 'For', value: 'Asks that would grow Lampas: an approach or programme, a study resource, a text or a translation it does not have' },
  { label: 'Forms', value: [MORE_WORDS.approach.title, STUDY_RESOURCE, MORE_WORDS.text.title, MORE_WORDS.translation.title].join(', ') },
];

const FIELD = 'block w-full rounded-lg border border-line bg-canvas px-3 text-lg text-fg disabled:opacity-60';

type Phase = { name: 'editing' } | { name: 'sending' } | { name: 'sent' } | { name: 'failed'; failure: TutorFailure; detail: string };

/** One short form: what he wants (required), why (optional) and a link (optional); Send, then Sent or the failure with Retry. */
function MoreForm({ kind }: { kind: MoreKind }) {
  const form = MORE_WORDS[kind];
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [link, setLink] = useState('');
  const [phase, setPhase] = useState<Phase>({ name: 'editing' });
  const [filled, setFilled] = useState<string | null>(null);
  // his say-so, each time: Off for every form he opens, and only offered once he has recalled a verse (mw-fu7dqf.12)
  const [withEvidence, setWithEvidence] = useState(false);
  const evidence = useLiveQuery(evidenceSummary, []);
  const hasEvidence = evidence !== undefined && evidence !== NO_RECALLS;
  const ids = { evidence: useId(), name: useId(), nameHint: useId(), why: useId(), whyHint: useId(), count: useId(), link: useId(), linkHint: useId() };
  const live = useRef(new AbortController());
  useEffect(() => {
    const controller = live.current;
    return () => controller.abort();
  }, []);
  const busy = phase.name === 'sending';
  const tooLong = isTooLong(why, MAX_FEEDBACK_CHARS);
  const ready = name.trim().length > 0 && !tooLong;

  /** The one way to the grist: his tap on the form's Send and the Send the tutor's panel ends with both come here, and the form shows what it did. */
  async function sendWith(args: FormArgs): Promise<{ said: string }> {
    if (busy) return { said: 'Sending…' };
    setPhase({ name: 'sending' });
    try {
      // the one command both Sends run: his evidence goes only when the switch is On for this ask
      const result = await askForMoreCommand(kind, {
        memorizing: async () => (withEvidence && hasEvidence ? await memorizingEvidenceNow() : undefined),
        signal: () => live.current.signal,
      }).run(args);
      if (!live.current.signal.aborted) setPhase({ name: 'sent' });
      return result;
    } catch (err) {
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      if (!live.current.signal.aborted) setPhase({ name: 'failed', failure: error.failure, detail: error.message });
      return { said: FAILURE_TITLES[error.failure] };
    }
  }
  const door = { ...askForMoreCommand(kind), run: sendWith };
  const beside = { kind };

  async function send(): Promise<void> {
    if (!ready || busy) return;
    await sendWith({ ...beside, ...argsOf(MORE_FORMS[kind], { name, why, link }) });
  }

  /** The tutor filled a field: the field shows it, ringed. */
  function fill(field: string, value: string): void {
    if (field === 'name') setName(value);
    else if (field === 'why') setWhy(value);
    else if (field === 'link') setLink(value);
    else return;
    setFilled(field);
  }
  const ring = (field: string): string => (filled === field ? ' ring-2 ring-accent' : '');

  return (
    <>
      {phase.name === 'sent' || busy ? null : (
        <div className="-mx-4">
          <FormHelper form={MORE_FORMS[kind]} values={{ name, why, link }} onFill={fill} command={door} commandArgs={beside} />
        </div>
      )}
      <form
        aria-label={form.title}
        className="space-y-4 border-b border-line px-1 pt-2 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {phase.name === 'sent' ? (
          <p role="status" className="text-lg font-semibold">
            {SENT_LINE}
          </p>
        ) : (
          <>
            <div>
              <label htmlFor={ids.name} className="block pb-1 text-base font-medium">
                {form.what}
              </label>
              <LimitedInput
                id={ids.name}
                type="text"
                maxLength={MAX_MORE_NAME}
                value={name}
                required
                aria-describedby={ids.nameHint}
                autoComplete="off"
                enterKeyHint="next"
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                className={`${FIELD} min-h-12${ring('name')}`}
              />
              <p id={ids.nameHint} className="pt-1 text-sm text-muted">
                {form.whatHint}
              </p>
            </div>
            <div>
              <label htmlFor={ids.why} className="block pb-1 text-base font-medium">
                {form.why}
              </label>
              <textarea
                id={ids.why}
                rows={3}
                value={why}
                aria-describedby={`${ids.whyHint} ${ids.count}`}
                aria-invalid={tooLong || undefined}
                disabled={busy}
                onChange={(e) => setWhy(e.target.value)}
                className={`${FIELD} resize-none py-2${ring('why')}`}
              />
              <p id={ids.whyHint} className="pt-1 text-sm text-muted">
                Optional.
              </p>
              <LengthNote id={ids.count} text={why} max={MAX_FEEDBACK_CHARS} what="answer" className="pt-1" />
            </div>
            <div>
              <label htmlFor={ids.link} className="block pb-1 text-base font-medium">
                Link
              </label>
              <LimitedInput
                id={ids.link}
                type="text"
                inputMode="url"
                maxLength={MAX_CREDIT_URL}
                value={link}
                aria-describedby={ids.linkHint}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                disabled={busy}
                onChange={(e) => setLink(e.target.value)}
                className={`${FIELD} min-h-12${ring('link')}`}
              />
              <p id={ids.linkHint} className="pt-1 text-sm text-muted">
                Optional. Where the makers can find it.
              </p>
            </div>
            {hasEvidence ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p id={ids.evidence} className="text-base font-medium">
                    Include my memorizing evidence
                  </p>
                  <p className="text-sm text-muted">{evidence}. Only with this ask.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={withEvidence}
                  aria-labelledby={ids.evidence}
                  disabled={busy}
                  onClick={() => setWithEvidence(!withEvidence)}
                  className={`min-h-12 min-w-16 shrink-0 rounded-lg px-4 text-base font-medium ${withEvidence ? 'bg-accent text-accent-fg' : 'border border-line text-fg'}`}
                >
                  {withEvidence ? 'On' : 'Off'}
                </button>
              </div>
            ) : null}
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
              type="submit"
              disabled={!ready || busy}
              aria-describedby={tooLong ? ids.count : undefined}
              className="min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40"
            >
              {phase.name === 'failed' ? 'Retry' : 'Send'}
            </button>
          </>
        )}
      </form>
    </>
  );
}

export function AskMoreScreen() {
  const ai = useAiAllowed();
  const [talking, setTalking] = useState(false);
  const [opened, setOpened] = useState<MoreKind | null>(null);
  const [asking, setAsking] = useState(false);
  useReportScreen({ name: NAME, facts: FACTS });
  const scope = useMemo<TalkScope>(() => ({ title: NAME, chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: NAME, facts: FACTS }) }), []);
  const shared = useMemo(() => ({ files: [], text: ASK_BEGUN }), []);
  return (
    <>
      <ScreenHeader title={NAME} back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pb-[var(--lp-end-inset)]">
        <p className="pt-4 text-base">
          Something Lampas does not have yet? An approach or programme for learning Greek, a study resource, a text or a translation: the makers want to
          hear.
        </p>
        {ai ? (
          <>
            <button
              type="button"
              onClick={() => setTalking(true)}
              className="mt-4 min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg"
            >
              Ask the tutor
            </button>
            <p className="pt-2 text-sm text-muted">The easiest way: tell the tutor what you would like, and it offers to send it to the makers.</p>
            <h2 className="pt-6 pb-2 text-lg font-semibold">Or fill in a form</h2>
            {MORE_KINDS.map((kind) => (
              <div key={kind}>
                {kind === 'text' ? (
                  <button
                    type="button"
                    onClick={() => setAsking(true)}
                    className="mt-2 flex min-h-12 w-full items-center justify-between rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
                  >
                    {STUDY_RESOURCE}
                    <span aria-hidden="true" className="text-muted">
                      ›
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-expanded={opened === kind}
                  onClick={() => setOpened(opened === kind ? null : kind)}
                  className="mt-2 flex min-h-12 w-full items-center justify-between rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
                >
                  {MORE_WORDS[kind].title}
                  <span aria-hidden="true" className="text-muted">
                    {opened === kind ? '▴' : '▾'}
                  </span>
                </button>
                {opened === kind ? <MoreForm kind={kind} /> : null}
              </div>
            ))}
          </>
        ) : (
          <div className="pt-4">
            <p className="text-base text-muted">Asking goes to the factory through the tutor's mill, so it needs a licence.</p>
            <button type="button" onClick={() => openLicence('settings')} className="mt-2 min-h-12 text-base font-medium text-accent underline">
              Needs a licence
            </button>
          </div>
        )}
      </main>
      {asking ? <AskForBook onClose={() => setAsking(false)} /> : null}
      {talking ? <TalkHost scope={scope} talkRef={scopeRef('', 0, scope)} book="" chapter={0} shared={shared} onClose={() => setTalking(false)} /> : null}
    </>
  );
}
