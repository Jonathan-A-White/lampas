// src/LetterDrillScreen.tsx — the letter drill that Got it on The Greek alphabet starts (mw-86e9r1.11, docs/grammar.md 'The letter drill'): a full screen over the idea
// sheet that asks the 24 letters, small and capital, by ear or by name, eight questions to a round (data/grammar/letterDrill.ts), each drawn as Review draws a letter
// (GrammarCard). After each answer he reads whether he was right and taps Next; a round ends on its score and 'Another round' / 'Done', and a drill in which every
// letter is right in both forms ends on 'Done' alone. Each answer is kept through noteDrillAnswer (a right one credits that letter; a sitting never makes it solid).
// While Handwriting drills is on (mw-86e9r1.51) a round also has two Write it cards (letterDrill.ts withWriting, src/handwriting/WriteIt.tsx): a memory aid, not one of
// the round's questions, so neither a right nor a skip changes the score, the targets or any letter's level.
// On a phone that can hear him (src/useCanHear.ts) the third question of a round is Say it (mw-86e9r1.12): the letter shown large, he holds the bar and says its name or its sound,
// the phone's speech recognition writes what it heard and src/data/grammar/sayIt.ts checks it; a miss says the right sound and shows the answer. A phone with no recognition, or with
// the microphone refused, is never asked; a refusal found at the bar leaves every Say it question out of the drill, and a Say it that is skipped costs him nothing.
import { useEffect, useState } from 'react';
import { answerTarget, drawRound, isComplete, newDrillRandom, rightCount, startLetterDrill, withWriting, TARGETS, type DrillStep, type LetterDrillState, type RoundItem } from './data/grammar/letterDrill';
import { ideaOf } from './data/grammar/ladder';
import { ideaSound } from './data/grammar/lessons';
import { letterHeard } from './data/grammar/sayIt';
import { noteDrillAnswer } from './data/repositories';
import { GrammarCard } from './GrammarCard';
import { useHandwritingOn } from './handwriting/useHandwriting';
import { WriteIt } from './handwriting/WriteIt';
import { WRITE_PRIMARY } from './handwriting/writeText';
import { speakSound } from './speech/greek';
import { TapToHear } from './TapToHear';
import { HoldBar } from './ui/HoldBar';
import { useCanHear } from './useCanHear';
import { useVoice } from './useVoice';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import { useSheetBack } from './ui/sheetBack';
import { GREEK_LANG } from './script/greekLang';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';
const PRIMARY = `${BUTTON} border-accent bg-accent text-accent-fg`;
const PLAIN = `${BUTTON} border-line text-accent active:bg-line`;

interface Sitting {
  drill: LetterDrillState;
  /** 1 for the first round */
  number: number;
  /** the round's questions, with Write it mixed in while Handwriting drills is on (withWriting) */
  round: DrillStep[];
  /** the step being asked, or round.length when the round is over */
  at: number;
  /** the questions of this round answered right */
  rights: number;
}

export function LetterDrillScreen({ onClose }: { onClose: () => void }) {
  useSheetBack(onClose);
  const idea = ideaOf('alphabet');
  const [random] = useState(newDrillRandom);
  // Write it is mixed in from the round drawn after it is known to be on (mw-86e9r1.51); the first round waits for it, which takes a moment
  const writing = useHandwritingOn();
  // Say it is in the rounds drawn once the phone is known to be able to hear him, and until a refusal is found at the bar (mw-86e9r1.12)
  const canHear = useCanHear();
  const [micGone, setMicGone] = useState(false);
  const saying = canHear === true && !micGone;
  const [sitting, setSitting] = useState<Sitting | null>(null);
  if (sitting === null && writing !== undefined && canHear !== undefined) {
    const drill = startLetterDrill();
    setSitting({ drill, number: 1, round: withWriting(drawRound(drill, random, undefined, saying), writing), at: 0, rights: 0 });
  }
  // what he tapped on the question, held until he taps Next so he can read whether he was right
  const [picked, setPicked] = useState<string | null>(null);
  // Done (and Another round) stand where Finish the round was: a second tap of a double tap on it waits for the round's end to settle (src/ui/settle.ts, mw-5r3p30.430)
  // (before the early return below: a hook may not come after it)
  const settled = useSettled(sitting ? `${sitting.number}:${sitting.at}` : 'waiting');
  if (sitting === null) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Letter drill" className="fixed inset-0 z-40 flex flex-col bg-surface">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{idea.title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Stop
          </button>
        </header>
      </div>
    );
  }
  const { drill, round, at } = sitting;
  const over = at >= round.length;
  const step = over ? null : round[at];
  const item = step?.kind === 'choice' ? step.item : null;
  const questions = round.filter((s) => s.kind === 'choice').length;
  const isSay = item?.mode === 'say';

  const keep = (option: string, right: boolean): void => {
    if (!item || picked !== null) return;
    setPicked(option);
    setSitting({ ...sitting, drill: answerTarget(drill, item.target, right), rights: sitting.rights + (right ? 1 : 0) });
    void noteDrillAnswer(item.question, right).catch((error: unknown) => console.error('could not keep the letter drill answer', error));
  };
  const pick = (option: string): void => keep(option, option === item?.question.right);
  /** What the phone heard him say: right when it is the letter's name or sound; a miss says the right sound. */
  const hear = (text: string): void => {
    if (!item || !isSay || picked !== null) return;
    const right = letterHeard(text, item.target.letter);
    keep(text, right);
    if (!right) speakSound(item.question.say ?? item.question.right);
  };
  /** Say it left out, this one or all of them: a question not asked costs him nothing (it is not a miss and not a right). */
  const leaveOut = (all: boolean): void => {
    if (all) setMicGone(true);
    setSitting({ ...sitting, round: round.filter((s, i) => i < at || (all ? !(s.kind === 'choice' && s.item.mode === 'say') : i !== at)) });
  };
  const next = (): void => {
    setPicked(null);
    setSitting({ ...sitting, at: at + 1 });
  };
  const another = (): void => {
    setSitting({ drill, number: sitting.number + 1, round: withWriting(drawRound(drill, random, undefined, saying), writing ?? false), at: 0, rights: 0 });
  };
  const done = isComplete(drill);

  return (
    <div role="dialog" aria-modal="true" aria-label="Letter drill" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{idea.title}</h2>
          <p data-testid="letter-drill-step" className="text-sm text-muted">
            {over ? `Round ${sitting.number} done` : `Round ${sitting.number} · Question ${at + 1} of ${round.length}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
          Stop
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {micGone && canHear ? (
          <p data-testid="say-skipped" role="status" className="mb-3 rounded-xl border border-line px-3 py-2 text-base text-muted">
            Say it needs the microphone, so the rest of this drill leaves it out. Nothing is counted against you.
          </p>
        ) : null}
        {step?.kind === 'write' ? (
          <WriteIt
            key={`${sitting.number}:${at}`}
            idea={ideaOf(step.letter)}
            onSkip={next}
            afterRight={() => (
              <button type="button" data-testid="write-next" ref={focusOnMount} onClick={next} className={WRITE_PRIMARY}>
                {at + 1 >= round.length ? 'Finish the round' : 'Next'}
              </button>
            )}
          />
        ) : item && isSay ? (
          <SayCard key={`${sitting.number}:${at}`} item={item} heard={picked} />
        ) : item ? (
          <GrammarCard key={`${sitting.number}:${at}`} question={item.question} mode="choice" picked={picked} onPick={pick} sideBySide />
        ) : (
          <div data-testid="letter-round-result">
            <h3 className="text-2xl font-bold">
              {sitting.rights} of {questions} right
            </h3>
            <p data-testid="letter-progress" className="mt-1 text-lg">
              {rightCount(drill)} of {TARGETS.length} right so far
            </p>
            <p className="mt-1 text-base text-muted">
              {done
                ? 'Every letter is right, small and capital.'
                : 'The 24 letters each count twice: once small, once as a capital. A letter you miss comes back in the next round.'}
            </p>
          </div>
        )}
      </div>
      <FootBar>
        {step?.kind === 'write' ? (
          <p className="min-h-12 text-center text-base text-muted">Write it, or skip it: a skip costs nothing.</p>
        ) : item && isSay && picked === null ? (
          <SayFoot key={`${sitting.number}:${at}`} onHeard={hear} onSkip={() => leaveOut(false)} onNoMicrophone={() => leaveOut(true)} />
        ) : item ? (
          picked !== null ? (
            <button type="button" data-testid="letter-next" ref={focusOnMount} onClick={next} className={PRIMARY}>
              {at + 1 >= round.length ? 'Finish the round' : 'Next'}
            </button>
          ) : (
            <p className="min-h-12 text-center text-base text-muted">Tap an answer.</p>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {done ? null : (
              <button type="button" ref={focusOnMount} onClick={() => settled() && another()} className={PRIMARY}>
                Another round
              </button>
            )}
            <button type="button" ref={done ? focusOnMount : undefined} onClick={() => settled() && onClose()} className={done ? PRIMARY : PLAIN}>
              Done
            </button>
          </div>
        )}
      </FootBar>
    </div>
  );
}

/** The unavailable notices of the recogniser: the page may not listen, or the phone has no microphone or no recognition. Any other (nothing heard, no network) lets him try again. */
const NO_MICROPHONE = new Set(['permission-denied', 'no-microphone', 'not-supported']);

/** Say it's foot: the hold bar he says the letter into, and Skip; the words come back through `onHeard`, a refused microphone through `onNoMicrophone`. */
function SayFoot({ onHeard, onSkip, onNoMicrophone }: { onHeard: (text: string) => void; onSkip: () => void; onNoMicrophone: () => void }) {
  const voice = useVoice(onHeard);
  const refused = voice.notice !== undefined && NO_MICROPHONE.has(voice.notice.kind);
  useEffect(() => {
    if (refused) onNoMicrophone();
  }, [refused, onNoMicrophone]);
  return (
    <div className="flex flex-col items-center gap-2">
      {voice.notice && !refused ? (
        <p data-testid="say-notice" role="status" className="text-center text-base text-muted">
          {voice.notice.message}
        </p>
      ) : null}
      {voice.listening && voice.transcript ? (
        <p data-testid="say-live" className="text-center text-lg">
          {voice.transcript}
        </p>
      ) : null}
      <HoldBar
        hold={{ onHold: voice.press, onRelease: () => void voice.release(), onDrop: voice.abort }}
        holdMs={0}
        name="Hold and say it"
        label={voice.listening ? (voice.ready ? 'Let go when you have said it' : 'Starting the mic…') : 'Hold and say it'}
        listening={voice.listening}
        keys
        compactWhenShort
      />
      <button type="button" onClick={onSkip} className={PLAIN}>
        Skip this one
      </button>
    </div>
  );
}

/** The Say it question: the letter large, then what the phone heard, whether it was right and what the letter is called and sounds like. */
function SayCard({ item, heard }: { item: RoundItem; heard: string | null }) {
  const letter = ideaOf(item.target.letter);
  const glyph = item.question.right;
  const answered = heard !== null;
  const right = answered && letterHeard(heard, item.target.letter);
  const sound = ideaSound(letter);
  return (
    <div data-testid="say-card" className="text-center">
      <p data-testid="grammar-prompt" data-kind="say" className="text-xl font-medium">
        {item.question.prompt}
      </p>
      <p data-testid="say-letter" {...GREEK_LANG} className="mt-3 font-greek text-7xl">
        {glyph}
      </p>
      {answered ? (
        <div className="mt-4">
          <p data-testid="say-result" data-result={right ? 'right' : 'wrong'} role="status" className={`text-xl font-medium ${right ? 'text-good' : 'text-bad'}`}>
            {right ? 'Right.' : 'Not quite.'}
          </p>
          <p data-testid="say-heard" className="mt-1 text-lg">
            You said “{heard}”
          </p>
          <p data-testid="say-answer" className="mt-1 text-lg">
            <span {...GREEK_LANG} className="font-greek text-[length:var(--lp-greek-size)]">
              {glyph}
            </span>{' '}
            is {letter.title}
            {sound ? `, and sounds like ${sound}` : ''}.
          </p>
          <div className="mt-3">
            <TapToHear text={glyph} letter />
          </div>
        </div>
      ) : null}
    </div>
  );
}
