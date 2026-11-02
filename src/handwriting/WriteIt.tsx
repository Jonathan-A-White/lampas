// src/handwriting/WriteIt.tsx — one Write it card (mw-86e9r1.51, docs/grammar.md 'Write it'): writing a letter by hand as a memory aid, for a reader who
// cannot yet read or write Greek. It shows the letter's name and sound, then by his stage (progression.ts): Trace, the letter faint under the pad with its
// strokes drawn first; Copy, the letter beside the pad; From memory, only the name and sound. The letter's sound plays as he starts writing, so hand, eye and
// ear meet. Clear, Check and Skip are the same size. Check asks the checker on the phone (recognizer.ts, nothing is sent), which judges which letter it is,
// not neatness, size or slant (but a Hebrew card tells it where the line is, padFrame.ts, so a vav and a final nun differ by how far the stem reaches): Right, or Close (a Greek letter drawn as its Latin look-alike, with one line that says where) or Not quite, with the right strokes drawn and Try again, never a score. The first card he ever meets says why he writes.
// A right check is kept (repositories/handwriting.ts recordWrite); a miss or a skip keeps nothing and costs nothing.
// The card writes a Greek letter or a Hebrew one (target.ts, mw-5r3p30.913): the Hebrew letter is drawn in the Hebrew face, checked against the Hebrew letters only (no Latin look-alike line), and
// its sound plays in the Hebrew voice.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GrammarIdea } from '../data/grammar/ladder';
import { getWhySeen, getWriteProgress, markWhySeen, recordWrite } from '../data/repositories';
import { speakSound, speakWord } from '../speech/greek';
import { greekMarked } from '../ui/GreekMarked';
import { GlyphStrokes, StrokeLine } from './GlyphStrokes';
import type { WriteScript } from './glyphs';
import { recognize, type InkStroke } from './recognizer';
import { STAGES, STAGE_NAMES, type WriteProgress, type WriteStage } from './progression';
import { frameOfPad } from './padFrame';
import { writeTargetOf, type WriteForm } from './target';
import { whyLinesOf, WRITE_PLAIN, WRITE_PRIMARY } from './writeText';
import { WritingPad } from './WritingPad';
import { GREEK_LANG } from '../script/greekLang';
import { HEBREW_LANG_ATTRS } from '../reader/sourceText';

const GREEK_SIZE = 'text-[length:var(--lp-greek-size)]';

/** A letter as the card draws it: Greek in the Greek face, Hebrew right to left in the Hebrew face (`size` is the class that sizes it). */
function Letter({ glyph, lang, size }: { glyph: string; lang: WriteScript; size: string }) {
  return lang === 'hbo' ? (
    <span {...HEBREW_LANG_ATTRS} dir="rtl" className={`script-he ${size}`}>
      {glyph}
    </span>
  ) : (
    <span {...GREEK_LANG} className={`font-greek ${size}`}>
      {glyph}
    </span>
  );
}

/** The line that says why, for the first Write it he meets, in the script of the letter. */
export function WhyLine({ lang = 'grc' }: { lang?: WriteScript }) {
  return (
    <p data-testid="write-why" className="mt-1 text-base">
      {whyLinesOf(lang).join(' ')}
    </p>
  );
}

function Prompt({ stage, title, glyph, lang }: { stage: WriteProgress['stage']; title: string; glyph: string; lang: WriteScript }) {
  const letter = <Letter glyph={glyph} lang={lang} size="text-4xl" />;
  return (
    <h3 data-testid="write-prompt" className="text-xl font-medium">
      {stage === 'trace' ? <>Trace {letter}</> : stage === 'copy' ? <>Copy {letter}</> : <>Write {title} from memory</>}
    </h3>
  );
}

export function WriteIt({ idea, form, onSkip, onRight, afterRight }: {
  /** a letter of the alphabet, Greek (its small form is written) or Hebrew (its ordinary shape, or with `form` its final one) */
  idea: GrammarIdea;
  form?: WriteForm;
  onSkip: () => void;
  /** a check came back right and was kept */
  onRight?: (progress: WriteProgress) => void;
  /** what to offer once it is right (Write it again, Next), given the progress after it and the stage the card was at */
  afterRight: (after: WriteProgress, stage: WriteStage) => ReactNode;
}) {
  const target = writeTargetOf(idea, form);
  const { glyph = '', lang = 'grc', title = idea.title, sound } = target ?? {};
  // the stage is read once, as the card opens: it is the stage of this card even after a right moves the letter on
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [first, setFirst] = useState(false);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [verdict, setVerdict] = useState<{ right: true; after: WriteProgress } | { right: false; hint: string } | null>(null);
  // a tap on 'Show the strokes' draws them again
  const [shown, setShown] = useState(0);
  const pad = useRef<HTMLDivElement>(null);

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

  const check = (): void => {
    // Hebrew has vav and final nun, one stem told apart only by how far it reaches below the line: the pad says where the line is and how tall a letter is (Greek's ο and Ο are still taken for each other)
    const frame = lang === 'hbo' ? frameOfPad(pad.current?.getBoundingClientRect().height ?? 0) : undefined;
    const { match, hint } = recognize(strokes, glyph, { script: lang, ...frame });
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

  // a Hebrew letter traced under the pad stands on the pad's line, where the check looks for it
  const onLine = lang === 'hbo' && stage === 'trace';
  const model = (
    <GlyphStrokes key={shown} letter={glyph} animate faint={stage === 'trace'} line={onLine} testId="write-model" className={onLine ? 'absolute inset-0 h-full w-full' : 'h-full max-h-full w-full'} />
  );

  return (
    <div data-testid="write-it" data-stage={stage} data-letter={glyph}>
      <Prompt stage={stage} title={title} glyph={glyph} lang={lang} />
      <p data-testid="write-name" className="mt-1 text-lg">
        {title}
        {sound ? <span className="text-muted"> · sounds {sound}</span> : null}
      </p>
      {first ? <WhyLine lang={lang} /> : null}
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
              boxRef={pad}
              onChange={setStrokes}
              onStart={() => void (lang === 'hbo' ? speakWord(glyph, 'hebrew') : speakSound(glyph))}
              under={stage === 'trace' ? <div data-testid="write-under" className="h-full w-full">{model}</div> : undefined}
              label={stage === 'memory' ? `Write ${title} here` : `Write ${glyph} here`}
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
              This is how <Letter glyph={glyph} lang={lang} size={lang === 'hbo' ? 'text-2xl' : GREEK_SIZE} /> is written. Watch the strokes, then try again.
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
