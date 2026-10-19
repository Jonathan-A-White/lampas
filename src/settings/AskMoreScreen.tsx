// src/settings/AskMoreScreen.tsx — Ask for more (mw-hqd5bz.37, #/askmore, Settings > More): the page for asks that would grow the app, an approach or
// programme, a study resource, a text or a translation. It leads with Ask the tutor, the easiest way (the Governor, 2026-10-12): a talk over this
// screen opens with "I'd like Lampas to have " typed in its composer, not sent, and the tutor offers Send this to the makers
// (grinds/bible-talk.instructions/270-asks-the-app-cannot-meet.md). Under it, Or fill in a form: one short form per kind (what, why, a link), opened in
// place one at a time; Send posts one 'feedback' grist of that kind through submitFeedback (src/services/feedback.ts), the one sender. Both go to the
// mill, so without a licence the page says so and offers Needs a licence instead.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NO_CHAPTER } from '../data/chapter';
import { useAiAllowed } from '../gate/licenceContext';
import { backTo, openLicence } from '../nav/route';
import { ScreenHeader, HeaderButton } from '../ScreenHeader';
import { SENT_LINE } from '../AskApproachSheet';
import { buildMoreRequest, MAX_CREDIT_URL, MAX_FEEDBACK_CHARS, MAX_MORE_NAME, MORE_KINDS, submitFeedback, type MoreKind } from '../services/feedback';
import type { TalkScope } from '../services/talk';
import { scopeRef } from '../services/talk';
import { FAILURE_TITLES, TutorError, type TutorFailure } from '../services/tutor';
import { TalkHost } from '../share/ShareTalk';
import { fitScreen, SCREEN_NAMES, type ScreenFact } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { isTooLong } from '../ui/lengthLimit';
import { LengthNote } from '../ui/LengthNote';

/** What the talk opens with in its composer: he finishes the sentence. */
export const ASK_BEGUN = "I'd like Lampas to have ";

const NAME = SCREEN_NAMES.askmore;

/** What each form asks, in his words. */
const FORMS: Record<MoreKind, { title: string; what: string; whatHint: string; why: string }> = {
  approach: {
    title: 'An approach or programme',
    what: 'Which approach or programme?',
    whatHint: 'Its name, and who made it if you know: a course, a method, a reading programme.',
    why: 'How does it teach, and why do you want it?',
  },
  'study-resource': {
    title: 'A study resource',
    what: 'Which resource?',
    whatHint: 'A lexicon, a grammar, a tool or a website.',
    why: 'What would you use it for?',
  },
  text: {
    title: 'A text',
    what: 'Which text?',
    whatHint: 'A text Lampas does not have: the Septuagint, the Apostolic Fathers, another edition.',
    why: 'Why do you want it?',
  },
  translation: {
    title: 'A translation',
    what: 'Which translation?',
    whatHint: 'An English translation to read beside the Greek: the ESV, the NASB.',
    why: 'Why do you want it?',
  },
};

/** What the tutor is told of the page. */
const FACTS: ScreenFact[] = [
  { label: 'For', value: 'Asks that would grow Lampas: an approach or programme, a study resource, a text or a translation it does not have' },
  { label: 'Forms', value: MORE_KINDS.map((k) => FORMS[k].title).join(', ') },
];

const FIELD = 'block w-full rounded-lg border border-line bg-canvas px-3 text-lg text-fg disabled:opacity-60';

type Phase = { name: 'editing' } | { name: 'sending' } | { name: 'sent' } | { name: 'failed'; failure: TutorFailure; detail: string };

/** One short form: what he wants (required), why (optional) and a link (optional); Send, then Sent or the failure with Retry. */
function MoreForm({ kind }: { kind: MoreKind }) {
  const form = FORMS[kind];
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [link, setLink] = useState('');
  const [phase, setPhase] = useState<Phase>({ name: 'editing' });
  const ids = { name: useId(), nameHint: useId(), why: useId(), whyHint: useId(), count: useId(), link: useId(), linkHint: useId() };
  const live = useRef(new AbortController());
  useEffect(() => {
    const controller = live.current;
    return () => controller.abort();
  }, []);
  const busy = phase.name === 'sending';
  const tooLong = isTooLong(why, MAX_FEEDBACK_CHARS);
  const ready = name.trim().length > 0 && !tooLong;

  async function send(): Promise<void> {
    if (!ready || busy) return;
    setPhase({ name: 'sending' });
    try {
      await submitFeedback(buildMoreRequest(kind, name, why, link), { signal: live.current.signal });
      if (live.current.signal.aborted) return;
      setPhase({ name: 'sent' });
    } catch (err) {
      if (live.current.signal.aborted) return;
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      setPhase({ name: 'failed', failure: error.failure, detail: error.message });
    }
  }

  return (
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
            <input
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
              className={`${FIELD} min-h-12`}
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
              className={`${FIELD} resize-none py-2`}
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
              enterKeyHint="send"
              disabled={busy}
              onChange={(e) => setLink(e.target.value)}
              className={`${FIELD} min-h-12`}
            />
            <p id={ids.linkHint} className="pt-1 text-sm text-muted">
              Optional. Where the makers can find it.
            </p>
          </div>
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
  );
}

export function AskMoreScreen() {
  const ai = useAiAllowed();
  const [talking, setTalking] = useState(false);
  const [opened, setOpened] = useState<MoreKind | null>(null);
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
                <button
                  type="button"
                  aria-expanded={opened === kind}
                  onClick={() => setOpened(opened === kind ? null : kind)}
                  className="mt-2 flex min-h-12 w-full items-center justify-between rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
                >
                  {FORMS[kind].title}
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
      {talking ? <TalkHost scope={scope} talkRef={scopeRef('', 0, scope)} book="" chapter={0} shared={shared} onClose={() => setTalking(false)} /> : null}
    </>
  );
}
