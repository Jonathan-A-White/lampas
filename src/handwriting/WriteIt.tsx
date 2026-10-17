// src/handwriting/WriteIt.tsx — one Write it card (mw-86e9r1.51, docs/grammar.md 'Write it'): writing a letter by hand as a memory aid, for a reader who
// cannot yet read or write Greek. It shows the letter's name and sound, then by his stage (progression.ts): Trace, the letter faint under the pad with its
// strokes drawn first; Copy, the letter beside the pad; From memory, only the name and sound. The letter's sound plays as he starts writing, so hand, eye and
// ear meet. Clear, Check and Skip are the same size. Check asks the checker on the phone (recognizer.ts, nothing is sent), which judges which letter it is,
// not neatness, size or slant: Right, or Close (a Greek letter drawn as its Latin look-alike, with one line that says where) or Not quite, with the right strokes drawn and Try again, never a score. The first card he ever meets says why he writes.
// A right check is kept (repositories/handwriting.ts recordWrite); a miss or a skip keeps nothing and costs nothing.
import { useEffect, useState, type ReactNode } from 'react';
import type { GrammarIdea } from '../data/grammar/ladder';
import { ideaChoice } from '../data/grammar/lessons';
import { getWhySeen, getWriteProgress, markWhySeen, recordWrite } from '../data/repositories';
import { speakSound } from '../speech/greek';
import { greekMarked } from '../ui/GreekMarked';
import { GlyphStrokes, StrokeLine } from './GlyphStrokes';
import { recognize, type InkStroke } from './recognizer';
import { STAGES, STAGE_NAMES, type WriteProgress, type WriteStage } from './progression';
import { WHY_LINES, WRITE_PLAIN, WRITE_PRIMARY } from './writeText';
import { WritingPad } from './WritingPad';


const GREEK = 'font-greek text-[length:var(--lp-greek-size)]';

/** The line that says why, for the first Write it he meets. */
export function WhyLine() {
  return (
    <p data-testid="write-why" className="mt-1 text-base">
      {WHY_LINES.join(' ')}
    </p>
  );
}

function Prompt({ stage, idea, glyph }: { stage: WriteProgress['stage']; idea: GrammarIdea; glyph: string }) {
  const letter = (
    <span lang="grc" className="font-greek text-4xl">
      {glyph}
    </span>
  );
  return (
    <h3 data-testid="write-prompt" className="text-xl font-medium">
      {stage === 'trace' ? <>Trace {letter}</> : stage === 'copy' ? <>Copy {letter}</> : <>Write {idea.title} from memory</>}
    </h3>
  );
}

export function WriteIt({ idea, onSkip, onRight, afterRight }: {
  /** a letter of the alphabet (it has glyphs); the small form is written */
  idea: GrammarIdea;
  onSkip: () => void;
  /** a check came back right and was kept */
  onRight?: (progress: WriteProgress) => void;
  /** what to offer once it is right (Write it again, Next), given the progress after it and the stage the card was at */
  afterRight: (after: WriteProgress, stage: WriteStage) => ReactNode;
}) {
  const glyph = idea.glyphs?.[0] ?? '';
  // the stage is read once, as the card opens: it is the stage of this card even after a right moves the letter on
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [first, setFirst] = useState(false);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [verdict, setVerdict] = useState<{ right: true; after: WriteProgress } | { right: false; hint: string } | null>(null);
  // a tap on 'Show the strokes' draws them again
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let live = true;
    void Promise.all([getWriteProgress(glyph), getWhySeen()]).then(([kept, seen]) => {
      if (!live) return;
      setProgress(kept);
      setFirst(!seen);
      if (!seen) void markWhySeen();
    });
    return () => {
      live = false;
    };
  }, [glyph]);

  if (!progress) return <p className="text-base text-muted">Getting the pad ready…</p>;
  const { stage } = progress;
  const sound = ideaChoice(idea);

  const check = (): void => {
    const { match, hint } = recognize(strokes, glyph);
    // a miss changes nothing kept: it is never counted against him
    if (!match) return setVerdict({ right: false, hint });
    void recordWrite(glyph, true)
      .then((after) => {
        setVerdict({ right: true, after });
        onRight?.(after);
      })
      .catch((error: unknown) => console.error('could not keep the writing', error));
  };
  const tryAgain = (): void => {
    setStrokes([]);
    setVerdict(null);
  };

  const model = <GlyphStrokes key={shown} letter={glyph} animate faint={stage === 'trace'} testId="write-model" className="h-full max-h-full w-full" />;

  return (
    <div data-testid="write-it" data-stage={stage} data-letter={glyph}>
      <Prompt stage={stage} idea={idea} glyph={glyph} />
      <p data-testid="write-name" className="mt-1 text-lg">
        {idea.title}
        {sound ? <span className="text-muted"> · sounds {sound}</span> : null}
      </p>
      {first ? <WhyLine /> : null}
      <div className="mt-3 flex items-stretch gap-3">
        {stage === 'copy' ? (
          <div data-testid="write-beside" className="flex w-28 shrink-0 items-center justify-center rounded-2xl border border-line p-1">
            {model}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {verdict?.right === false ? (
            <div className="relative h-64 w-full rounded-2xl border-2 border-bad bg-canvas p-6">
              <GlyphStrokes letter={glyph} animate testId="write-strokes-shown" className="h-full w-full" />
            </div>
          ) : (
            <WritingPad
              strokes={strokes}
              onChange={setStrokes}
              onStart={() => void speakSound(glyph)}
              under={stage === 'trace' ? <div data-testid="write-under" className="h-full w-full">{model}</div> : undefined}
              label={stage === 'memory' ? `Write ${idea.title} here` : `Write ${glyph} here`}
            />
          )}
        </div>
      </div>
      {stage !== 'memory' || verdict?.right === false ? <StrokeLine letter={glyph} /> : null}
      {stage !== 'memory' && verdict === null ? (
        <button type="button" onClick={() => setShown(shown + 1)} className="mt-1 min-h-11 px-1 text-base font-medium text-accent underline underline-offset-4">
          Show the strokes
        </button>
      ) : null}
      <div aria-live="polite">
        {verdict?.right ? (
          <p data-testid="write-verdict" data-right="true" className="mt-2 text-2xl font-bold text-good">
            Right
          </p>
        ) : verdict ? (
          <div data-testid="write-verdict" data-right="false" data-close={verdict.hint ? 'true' : 'false'} className="mt-2">
            <p className="text-2xl font-bold">{verdict.hint ? 'Close' : 'Not quite'}</p>
            {verdict.hint ? (
              <p data-testid="write-hint" className="text-base">
                {greekMarked(verdict.hint)}
              </p>
            ) : null}
            <p className="text-base text-muted">
              This is how <span lang="grc" className={GREEK}>{glyph}</span> is written. Watch the strokes, then try again.
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3">
        {verdict?.right ? (
          afterRight(verdict.after, stage)
        ) : verdict ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={tryAgain} className={WRITE_PRIMARY}>
              Try again
            </button>
            <button type="button" onClick={onSkip} className={WRITE_PLAIN}>
              Skip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes([])} className={WRITE_PLAIN}>
              Clear
            </button>
            <button type="button" disabled={strokes.length === 0} onClick={check} className={WRITE_PRIMARY}>
              Check
            </button>
            <button type="button" onClick={onSkip} className={WRITE_PLAIN}>
              Skip
            </button>
          </div>
        )}
      </div>
      <p data-testid="write-stage" className="mt-2 text-sm text-muted">
        {STAGES.map((s, i) => (
          <span key={s}>
            {i > 0 ? ' › ' : null}
            <span className={s === stage ? 'font-semibold text-fg' : undefined} aria-current={s === stage ? 'step' : undefined}>
              {STAGE_NAMES[s]}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}
