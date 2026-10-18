// src/hardSounds/Contrast.tsx — 'Which did you hear?' (mw-5r3p30.362, PROVISIONAL, the Governor to confirm): the drill under a lesson's contrast step. The Greek voice says one word
// of one of the lesson's pairs, he taps which of the two it was; a miss shows the pair side by side and says both words; after ten rounds the score shows, with every missed pair
// side by side to hear again. The run is kept on the device when the last round is answered (data/repositories/pairDrills.ts). The rounds and the score are ./pairDrill.ts.
import { useEffect, useState } from 'react';
import { recordPairRun } from '../data/repositories';
import { greekWordSpeech, speakText, speakWord, stopSpeaking } from '../speech/greek';
import { Icon } from '../speech/SpeakButton';
import { answerRound, drawRounds, missesOf, pairSeed, ROUNDS, type PairAnswer, type Round } from './pairDrill';
import { Word } from './Word';

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line';
const PRIMARY = 'min-h-12 w-full rounded-xl bg-accent px-4 text-lg font-medium text-accent-fg active:opacity-80';
const PAIR_KEY = 'pair-drill';

/** Says the two words one after the other. */
function sayPair(a: string, b: string): void {
  speakText(`${greekWordSpeech(a).text}\n${greekWordSpeech(b).text}`, PAIR_KEY, { language: 'greek' });
}

/** A pair side by side, each word to hear, the letters of the lesson marked, and a button that says both. `said` is the word the voice said, when it is known. */
function SideBySide({ a, b, said, letters, at }: { a: string; b: string; said?: string; letters: readonly string[]; at: string }) {
  return (
    <div data-testid="pair-replay" className="rounded-xl border border-line px-3 py-3">
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((word, i) => (
          <div key={word} data-word={word} className="flex flex-col items-start gap-1">
            <Word word={word} letters={letters} id={`${at}-${i}`} />
            {word === said ? <span className="text-sm text-muted">The voice said this one</span> : null}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => sayPair(a, b)} className={`${BUTTON} mt-3`}>
        {`Hear both: ${a}, ${b}`}
      </button>
    </div>
  );
}

function Score({ answers, letters, onAgain, at }: { answers: readonly PairAnswer[]; letters: readonly string[]; onAgain: () => void; at: string }) {
  const score = answers.filter((a) => a.right).length;
  const misses = missesOf(answers);
  return (
    <div data-testid="pair-score" className="mt-3 space-y-3">
      <p role="status" className="text-2xl font-semibold">{`You got ${score} of ${answers.length}`}</p>
      {misses.length > 0 ? (
        <>
          <p className="text-base">{misses.length === 1 ? 'You mixed this pair up. Hear both again.' : 'You mixed these pairs up. Hear both again.'}</p>
          <ul className="space-y-3">
            {misses.map((m) => (
              <li key={`${m.said}-${m.other}`}>
                <SideBySide a={m.said} b={m.other} said={m.said} letters={letters} at={`${at}-miss-${m.said}`} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-base">Not one mixed up.</p>
      )}
      <button type="button" onClick={onAgain} className={PRIMARY}>
        Again
      </button>
    </div>
  );
}

type Phase =
  | { name: 'idle' }
  /** `answers` are the rounds before `index`; `picked` is the answer to the round at `index`, once he has tapped */
  | { name: 'asking'; rounds: Round[]; index: number; answers: PairAnswer[]; picked: PairAnswer | null }
  | { name: 'done'; answers: PairAnswer[] };

/** The drill of `pairs`, for the lesson `lessonId`; `letters` are the lesson's, marked in a replayed pair. */
export function Contrast({ lessonId, pairs, letters, at }: { lessonId: string; pairs: readonly (readonly [string, string])[]; letters: readonly string[]; at: string }) {
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const asking = phase.name === 'asking' ? phase : null;
  const round = asking ? asking.rounds[asking.index] : null;

  // each round begins with the voice saying its word
  const said = asking && !asking.picked ? round?.said : undefined;
  useEffect(() => {
    if (said) speakWord(said, 'greek');
  }, [said, asking?.rounds, asking?.index]);
  useEffect(() => () => stopSpeaking(), []);

  const start = (): void => {
    const rounds = drawRounds(pairs, pairSeed.next);
    if (rounds.length > 0) setPhase({ name: 'asking', rounds, index: 0, answers: [], picked: null });
  };

  const pick = (chose: string): void => {
    if (!asking || !round || asking.picked) return;
    const picked = answerRound(round, chose);
    setPhase({ ...asking, picked });
    if (!picked.right) sayPair(round.choices[0], round.choices[1]);
    if (asking.index === asking.rounds.length - 1) {
      void recordPairRun(lessonId, [...asking.answers, picked]).catch((error: unknown) => console.error('could not keep the run', error));
    }
  };

  const next = (): void => {
    if (!asking || !asking.picked) return;
    const answers = [...asking.answers, asking.picked];
    if (asking.index === asking.rounds.length - 1) {
      stopSpeaking();
      setPhase({ name: 'done', answers });
    } else setPhase({ ...asking, index: asking.index + 1, answers, picked: null });
  };

  if (phase.name === 'done') return <Score answers={phase.answers} letters={letters} onAgain={start} at={at} />;
  if (!asking || !round) {
    return (
      <div className="mt-4">
        <p className="mb-3 text-base">{`The voice says one word of a pair, ${ROUNDS} times. Tap the one you heard.`}</p>
        <button type="button" onClick={start} className={PRIMARY}>
          Start the drill
        </button>
      </div>
    );
  }
  const { picked } = asking;
  return (
    <div data-testid="pair-round" className="mt-4 space-y-3">
      <p data-testid="pair-count" className="text-sm text-muted">{`Round ${asking.index + 1} of ${asking.rounds.length}`}</p>
      <button type="button" aria-label="Hear it again" onClick={() => speakWord(round.said, 'greek')} className={`${BUTTON} inline-flex items-center justify-center gap-2`}>
        <Icon kind="speaker" />
        Hear it again
      </button>
      <div className="grid grid-cols-2 gap-3">
        {round.choices.map((word) => (
          <button
            key={word}
            type="button"
            lang="grc"
            disabled={picked !== null}
            aria-label={`Choose ${word}`}
            onClick={() => pick(word)}
            className={`min-h-16 rounded-xl border px-3 font-greek text-3xl active:bg-line ${picked && word === round.said ? 'border-accent bg-line' : 'border-line'}`}
          >
            {word}
          </button>
        ))}
      </div>
      {picked ? (
        <>
          <p role="status" className="text-xl font-semibold">
            {picked.right ? 'Right' : `Not quite. The voice said ${round.said}.`}
          </p>
          {picked.right ? null : <SideBySide a={round.choices[0]} b={round.choices[1]} said={round.said} letters={letters} at={`${at}-${asking.index}`} />}
          <button type="button" onClick={next} className={PRIMARY}>
            {asking.index === asking.rounds.length - 1 ? 'See my score' : 'Next round'}
          </button>
        </>
      ) : null}
    </div>
  );
}
