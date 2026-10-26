// src/memorize/MemorizeSession.tsx — one Memorize session (#/memorize/<ref>/<lang>, mw-fu7dqf.8, docs/layout/memorize.md): the verse at the rung its schedule step gives (HiddenVerse), Hear it, the hold
// to say it from memory (HeldTalkBar for English and Greek, RecordBar for the Weave: useRecallHold) or Type it (TypeIt.tsx: English always, Greek while Settings > Greek keyboard is On, never the Weave), the judgement with the missed words marked, the recall kept and 'Due <day>', I had it / Not yet when the phone
// cannot hear him, and Next verse (or Done). The screen reports the verse, its language, its rung and the last score to the tutor.
import { useEffect, useState } from 'react';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { getReading, startAnswer, stopAnswerSpeech, useReading } from '../speech/readAloud';
import { warmVoices } from '../speech/greek';
import { HeldTalkBar, RecordBar } from '../talk/Bars';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { closeMemorize, openMemorizeSession } from '../nav/route';
import { greekKeyboardSetting } from '../settings/definitions';
import { openSetting } from '../settings/link';
import { useSetting } from '../settings/store';
import { foldWords } from 'learn-kit/recall';
import { HiddenVerse } from './HiddenVerse';
import { langName, type MemorizeLang } from './languages';
import { rungName } from './rung';
import { runsOfTokens } from './runs';
import type { Token } from './target';
import { TypeIt } from './TypeIt';
import { STEPS, useSession, type Kept } from './useSession';

/** The id the reading of a verse carries (readAloud.ts startAnswer): below zero, so it is never a tutor answer's, a verdict's or the passage player's. */
const HEAR_ID = -11;

const ACTION = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';
const PRIMARY = 'min-h-12 rounded-lg bg-accent px-4 text-base font-medium text-accent-fg';

const wordsPlural = (n: number): string => `${n} ${n === 1 ? 'word' : 'words'}`;

/** 'Got it: 19 of 20 words' or 'Not yet: 4 words missed'; a verse he graded himself has only the verdict. */
function judgementLine(kept: Kept, tokens: readonly Token[]): string {
  const { judgement, how } = kept;
  if (how === 'self') return judgement.passed ? 'Got it' : 'Not yet';
  const asked = tokens.filter((t) => foldWords(t.text).length > 0).length;
  return judgement.passed ? `Got it: ${asked - judgement.misses.length} of ${asked} words` : `Not yet: ${wordsPlural(judgement.misses.length)} missed`;
}

export function MemorizeSession({ refName, lang }: { refName: string; lang: MemorizeLang }) {
  const session = useSession(refName, lang);
  const reading = useReading();
  const greekKeyboard = useSetting(greekKeyboardSetting);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    void warmVoices();
    return () => {
      // leaving the session ends its own reading, and only that
      if (getReading().answer === HEAR_ID) stopAnswerSpeech();
    };
  }, []);

  const ready = session.status === 'ready' ? session : null;
  useReportScreen({
    name: SCREEN_NAMES.memorize,
    facts: ready
      ? [
          { label: 'Verse', value: ready.heading },
          { label: 'Language', value: langName(lang) },
          { label: 'Rung', value: rungName(ready.rung) },
          { label: 'Step', value: `${ready.step + 1} of ${STEPS}` },
          ...(ready.kept
            ? [{ label: 'Last score', value: judgementLine(ready.kept, ready.tokens).replace(/^Got it: |^Not yet: /, '') }, { label: 'Due', value: ready.kept.due.replace(/^Due /, '') }]
            : []),
        ]
      : [],
  });

  const back = <HeaderButton onClick={closeMemorize}>‹ Back</HeaderButton>;
  if (session.status === 'loading') return <ScreenHeader title="" back={back} />;
  if (session.status === 'unknown') {
    return (
      <>
        <ScreenHeader title={SCREEN_NAMES.memorize} back={back} />
        <main className="screen min-h-0 flex-1 px-4">
          <p className="mt-3 text-base">This verse is not in Lampas.</p>
          <button type="button" onClick={closeMemorize} className={`${ACTION} mt-3`}>
            Done
          </button>
        </main>
      </>
    );
  }

  const { rung, tokens, hidden, phase, note, kept, hold, next } = session;
  const judged = phase === 'judged' && kept !== null;
  const hearing = reading.answer === HEAR_ID && reading.status !== 'idle';
  const hear = () => (hearing ? stopAnswerSpeech() : startAnswer(HEAR_ID, runsOfTokens(tokens)));
  const missed = new Set(judged && kept.how !== 'self' ? kept.judgement.misses : []);
  // 'nothing' shows no word until the recall is judged; a judged verse shows every word, with the missed ones marked
  const shown = rung.kind === 'nothing' && !judged ? [] : tokens;
  const subtitle = `${langName(lang)} · ${rungName(rung)} · step ${session.step + 1} of ${STEPS}`;
  // Type it: English always, Greek only once he says his phone has a Greek keyboard (the switch reads undefined until it is read: neither Type it nor the line to turn it on), the Weave never
  const canType = lang === 'en' || (lang === 'el' && greekKeyboard === 'on');
  const hearIt = (
    <button type="button" onClick={hear} className={ACTION}>
      {hearing ? 'Stop hearing it' : 'Hear it'}
    </button>
  );

  return (
    <>
      <ScreenHeader title={session.heading} subtitle={subtitle} back={back} />
      <main className="screen min-h-0 flex-1 px-4">
        <div className="mt-3 min-h-24">
          <HiddenVerse tokens={shown} hidden={judged ? new Set() : hidden} firstLetters={rung.kind === 'gaps' && rung.share === 1} missed={missed} />
        </div>
        {judged ? (
          <div className="mt-4 space-y-3">
            <p data-testid="judgement" role="status" className={`text-lg font-semibold ${kept.judgement.passed ? 'text-good' : 'text-bad'}`}>
              {judgementLine(kept, tokens)}
            </p>
            <p data-testid="due" className="text-base text-muted">
              {kept.due}
            </p>
            <div className="flex flex-wrap gap-2 pb-[var(--lp-end-inset)]">
              {hearIt}
              {next ? (
                <button type="button" onClick={() => openMemorizeSession(next.ref, next.lang, { replace: true })} className={PRIMARY}>
                  Next verse
                </button>
              ) : (
                <button type="button" onClick={closeMemorize} className={PRIMARY}>
                  Done
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {note ? (
              <p data-testid="note" role="status" className="text-base">
                {note}
              </p>
            ) : null}
            {phase === 'sending' ? (
              <p data-testid="sending" role="status" className="text-base text-muted">
                Checking how you said it…
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {hearIt}
              {canType && !typing ? (
                <button type="button" onClick={() => setTyping(true)} className={ACTION}>
                  Type it
                </button>
              ) : null}
              {note ? (
                <>
                  <button type="button" onClick={() => session.gradeSelf(true)} className={ACTION}>
                    I had it
                  </button>
                  <button type="button" onClick={() => session.gradeSelf(false)} className={ACTION}>
                    Not yet
                  </button>
                </>
              ) : null}
            </div>
            {lang === 'el' && greekKeyboard === 'off' ? (
              <button type="button" onClick={() => openSetting('greekKeyboard')} className="min-h-12 text-left text-base text-accent underline">
                Turn on Greek keyboard in Settings to type Greek
              </button>
            ) : null}
            {lang !== 'weave' && canType && typing ? <TypeIt lang={lang} disabled={phase === 'sending'} onTyped={session.typed} /> : null}
          </div>
        )}
      </main>
      {judged ? null : (
        <footer className="shrink-0 px-4 pb-[calc(0.5rem+var(--lp-bar-inset))] pr-[calc(var(--spacing)*18)] pt-2">
          {lang === 'weave' ? (
            <RecordBar label="Hold to say it" listening={hold.record.listening} disabled={phase === 'sending'} onPress={hold.record.press} onRelease={hold.record.release} onAbort={hold.record.drop} />
          ) : (
            <HeldTalkBar hold={hold.talk} labels={{ hold: 'Hold to say it' }} disabled={phase === 'sending'} />
          )}
        </footer>
      )}
    </>
  );
}
