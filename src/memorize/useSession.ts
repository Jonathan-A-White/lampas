// src/memorize/useSession.ts — one Memorize session (docs/layout/memorize.md, mw-fu7dqf.8): the verse at the rung its schedule step gives, how it is heard, judged and kept.
//   loading  the row (the step; a verse not on the schedule is at step 0), the target of the moment (memorizeTarget over the Reader's own Weave settings), the rung (rungFor), the words it hides
//            (learn-kit/recall hideWords over the target, seeded by the row's lastWhen so the same words are gone each time he opens it)
//   phases   'shown' (the verse at its rung, the hold below it) -> 'sending' (a Weave recording is with the mill) -> 'judged' (misses marked, the recall kept, 'Due <day>')
//   hearing  useRecallHold(lang): dictation (en-US, el-GR, he-IL) judged by judgeSaid ('said'), a Weave recording sent by sendWeaveRecall and judged by judgeReading ('mill'); typed(text) is judged by judgeTyped ('typed', never for the Weave); a phone that cannot hear that language, is
//            offline or has no microphone says so (`note`) and lets him grade himself (I had it / Not yet, 'self')
//   keeping  recordRecall writes the recall and moves the verse on the schedule (a verse practised before its due day keeps its row); the row is read again for its due day
//   pieces   a long passage is learned a piece at a time and then joined (pieces.ts, mw-5r3p30.1205): the session is at a piece, its words alone shown, hidden and judged, and Next piece (after a pass) goes to the next, the last to the whole passage joined;
//            a piece's recall is practice: it is not kept and the schedule row is not touched, the joined recall is the one recordRecall writes. A verse or a short passage is one piece and has no pieces stage
//   going on again() puts the same step back (hidden again, a new recall); nextStep() after a pass moves the verse to the step after this one (advanceStep; in the sitting he began learning the verse in it is due tomorrow whatever the step, mw-5r3p30.1200) and the session shows that step (mw-5r3p30.1145)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { foldWords, hideWords } from 'learn-kit/recall';
import type { Verses } from './refs';
import type { Verse } from '../data/chapter';
import { pieceHeading, piecesOf } from './pieces';
import { versesOf } from './refs';
import { advanceStep, memorizedRowOf, nextDueVerse, recordRecall, type RecallHow } from '../data/repositories/memorize';
import { wovenOf } from '../reader/useWoven';
import type { WovenVerse } from '../data/weave';
import { sourceLanguage, type SourceLanguage } from '../data/chapter';
import { asked, judgeReading, judgeSaid, judgeTyped, type Judgement } from './judge';
import type { MemorizeLang } from './languages';
import { rungFor, type Rung } from './rung';
import { sendWeaveRecall } from './sendWeave';
import { memorizeTarget, type VerseToken } from './target';
import { useRecallHold, type RecallHold, type RecallUnavailable } from './useRecallHold';
import { dueWords } from './due';
import { RARE_STEP } from '../data/schedule';
import { STEPS } from './progress';
import { announce } from '../ui/live';
import { weaveSettingsNow } from './weaveSettings';

/** What the session says when a recall cannot be heard, ahead of the two buttons that let him grade himself. */
export const UNAVAILABLE_NOTES: Record<RecallUnavailable | 'mill' | 'hebrew-weave', string> = {
  'no-greek-dictation': 'This phone cannot hear Greek. Say it, then grade yourself.',
  'no-hebrew-dictation': 'This phone cannot hear Hebrew. Say it, then grade yourself.',
  'no-dictation': 'This phone cannot take dictation. Say it, then grade yourself.',
  offline: 'The speech service cannot be reached. Say it, then grade yourself.',
  'no-microphone': 'The microphone is turned off. Say it, then grade yourself.',
  mill: 'The tutor cannot be reached. Say it, then grade yourself.',
  // the mill's verse-read scores English and Greek only (PROVISIONAL, mw-gdcyf98.15): a Weave of Hebrew is graded by him
  'hebrew-weave': 'The tutor cannot hear a Hebrew Weave yet. Say it, then grade yourself.',
};

export { STEPS };

export type SessionPhase = 'shown' | 'sending' | 'judged';

/** The recall as the screen shows it once it is kept. */
export interface Kept {
  judgement: Judgement;
  how: RecallHow;
  /** 'Due tomorrow' */
  due: string;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'unknown' }
  | {
      status: 'ready';
      /** what the screen heads: the passage, or the piece it is at ('Exodus 20:3') */
      heading: string;
      /** the passage's own heading ('Exodus 20:1-17'), whatever piece it is at */
      passage: string;
      /** a passage cut into pieces (pieces.ts): which it is at, or `joined` once they are all said and the whole is to be said; null for a verse or a short passage, one piece */
      pieces: { count: number; at: number; joined: boolean } | null;
      lang: MemorizeLang;
      step: number;
      rung: Rung;
      tokens: VerseToken[];
      /** the tokens the rung hides while the verse is shown */
      hidden: ReadonlySet<number>;
      phase: SessionPhase;
      /** why the recall cannot be heard (the note and the two buttons that follow), or null */
      note: string | null;
      kept: Kept | null;
      hold: RecallHold;
      /** nothing hears this recall (a Weave of Hebrew words): he says it and grades himself, so no hold is drawn */
      selfGraded: boolean;
      /** the next verse that is due, once this one is kept; null when none is */
      next: { ref: string; lang: MemorizeLang } | null;
      /** a passing recall of a step before the last, of the whole passage: Next step is offered */
      canAdvance: boolean;
      /** a passing recall of a piece: Next piece (the last: Join the pieces) is offered */
      canNextPiece: boolean;
      /** Next piece: the next piece shown, hidden at the same rung, or the whole passage after the last */
      nextPiece(): void;
      gradeSelf(passed: boolean): void;
      /** Again: this step once more, the verse hidden again (mw-5r3p30.1145) */
      again(): void;
      /** Next step: after a pass, the verse moves to the step after this one at once and the session shows it */
      nextStep(): void;
      /** what he typed (src/memorize/TypeIt.tsx), judged and kept as 'typed' */
      typed(text: string): void;
    };

interface Loaded {
  found: Verses;
  /** the passage's verses cut into pieces (pieces.ts); one piece for a verse or a short passage */
  pieces: Verse[][];
  /** the language of the verse's own words */
  source: SourceLanguage;
  woven: (WovenVerse | null)[];
  tokens: VerseToken[];
  step: number;
  seed: number;
}

/** The state of the session of one verse in one language. The screen keys it by both, so a new verse is a new session and starts from nothing. */
export function useSession(ref: string, lang: MemorizeLang): SessionState {
  const [loaded, setLoaded] = useState<Loaded | 'unknown' | null>(null);
  const [heading, setHeading] = useState('');
  const [phase, setPhase] = useState<SessionPhase>('shown');
  const [note, setNote] = useState<string | null>(null);
  const [kept, setKept] = useState<Kept | null>(null);
  const [next, setNext] = useState<{ ref: string; lang: MemorizeLang } | null>(null);
  /** the piece he is at; `pieces.length` is the passage joined. A passage of one piece is always joined (nothing to go through first). */
  const [stage, setStage] = useState(0);
  const keeping = useRef(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const found = await versesOf(ref).catch(() => null);
      if (!live) return;
      if (!found) return setLoaded('unknown');
      const source = sourceLanguage(found.source);
      const settings = lang === 'weave' ? await weaveSettingsNow(source) : undefined;
      const target = await memorizeTarget(ref, lang, settings);
      const row = await memorizedRowOf(ref, lang);
      if (!live) return;
      if (!target) return setLoaded('unknown');
      const chapterWoven = settings ? wovenOf(found.source, settings) : null;
      const woven = found.verses.map((v) => chapterWoven?.[found.source.verses.indexOf(v)] ?? null);
      setHeading(found.heading);
      setLoaded({ found, pieces: piecesOf(found.book, found.chapter, found.verses), source, woven, tokens: target.tokens, step: row?.step ?? 0, seed: row?.lastWhen ?? 0 });
    })();
    return () => {
      live = false;
    };
  }, [ref, lang]);

  const loadedNow = loaded !== null && typeof loaded === 'object' ? loaded : null;
  /** what he is saying now: the piece's verses, their woven and their words, or the whole passage's */
  const ready = useMemo(() => {
    if (!loadedNow) return null;
    const { found, pieces, woven, tokens } = loadedNow;
    const joined = pieces.length === 1 || stage >= pieces.length;
    if (joined) return { ...loadedNow, piece: false, verses: found.verses, woven, tokens, heading: found.heading };
    const piece = pieces[stage];
    const numbers = new Set(piece.map((v) => v.n));
    return {
      ...loadedNow,
      piece: true,
      verses: piece,
      woven: woven.filter((_, i) => numbers.has(found.verses[i].n)),
      tokens: tokens.filter((t) => numbers.has(t.verse)),
      heading: pieceHeading(found.heading, piece),
    };
  }, [loadedNow, stage]);
  const latest = useRef(ready);
  useEffect(() => {
    latest.current = ready;
  });

  /** Keeps the recall and shows how it went. */
  const keep = useCallback(
    async (judgement: Judgement, how: RecallHow): Promise<void> => {
      const at = latest.current;
      if (!at || keeping.current) return;
      keeping.current = true;
      const now = Date.now();
      // a piece is practice of the passage's whole: nothing is kept and the schedule row is left as it is, the joined recall is the passage's
      if (at.piece) {
        setKept({ judgement, how, due: '' });
        setNext(null);
        setNote(null);
        setPhase('judged');
        return;
      }
      try {
        await recordRecall(
          {
            ref,
            lang,
            rung: at.step,
            score: judgement.score,
            missed: judgement.misses.map((m) => at.tokens[m].text),
            asked: judgement.asked.map((a) => ({ token: a.text, lang: a.lang })),
            how,
          },
          now,
        );
        const row = await memorizedRowOf(ref, lang);
        setKept({ judgement, how, due: dueWords(row?.due ?? now, now) });
        setNext((await nextDueVerse(now, { ref, lang })) ?? null);
        setNote(null);
        setPhase('judged');
      } catch (error) {
        keeping.current = false;
        console.error('could not keep the recall', error);
        setPhase('shown');
        setNote('The recall could not be kept. Try again.');
      }
    },
    [ref, lang],
  );

  const hold = useRecallHold({
    lang,
    onHeard: (words) => {
      const at = latest.current;
      if (!at || foldWords(words).length === 0) return;
      void keep(judgeSaid(at.tokens, words), 'said');
    },
    onRecording: (recording) => {
      const at = latest.current;
      if (!at || keeping.current) return;
      setPhase('sending');
      setNote(null);
      sendWeaveRecall(at.heading, at.verses, at.woven, recording, { chapter: at.found.source }).then(
        (answer) => keep(judgeReading(at.tokens, answer), 'mill'),
        () => {
          setPhase('shown');
          setNote(UNAVAILABLE_NOTES.mill);
        },
      );
    },
    onUnavailable: (reason) => setNote(UNAVAILABLE_NOTES[reason]),
  });

  const gradeSelf = useCallback(
    (passed: boolean): void => {
      const at = latest.current;
      if (!at) return;
      // he grades the whole recall: which words he missed is not known, so none is marked
      void keep({ score: passed ? 1 : 0, passed, misses: [], heardWords: [], asked: asked(at.tokens) }, 'self');
    },
    [keep],
  );

  /** Back to the verse hidden, ready for another recall, at `step`. */
  const restart = useCallback((step: number, piece?: number): void => {
    keeping.current = false;
    if (piece !== undefined) setStage(piece);
    setLoaded((was) => (was !== null && typeof was === 'object' ? { ...was, step } : was));
    setKept(null);
    setNote(null);
    setPhase('shown');
  }, []);

  const again = useCallback((): void => {
    const at = latest.current;
    if (at) restart(at.step);
  }, [restart]);

  const nextStep = useCallback((): void => {
    const at = latest.current;
    if (!at || at.step >= RARE_STEP) return;
    void advanceStep(ref, lang, at.step)
      .then(() => restart(at.step + 1, 0))
      .catch((error) => {
        console.error('could not move the verse to the next step', error);
        announce('The verse could not be moved on. Try again.');
      });
  }, [ref, lang, restart]);

  const nextPiece = useCallback((): void => {
    const here = latest.current;
    if (here?.piece) restart(here.step, stage + 1);
  }, [restart, stage]);

  const typed = useCallback(
    (text: string): void => {
      const at = latest.current;
      if (!at || foldWords(text).length === 0) return;
      void keep(judgeTyped(at.tokens, text), 'typed');
    },
    [keep],
  );

  if (loaded === null) return { status: 'loading' };
  if (loaded === 'unknown' || ready === null) return { status: 'unknown' };
  const rung = rungFor(ready.step);
  const hidden = rung.kind === 'gaps' ? hideWords(ready.tokens.length, rung.share, ready.seed) : new Set<number>();
  const selfGraded = lang === 'weave' && ready.source === 'hbo';
  const passed = kept !== null && kept.judgement.passed;
  const pieces = ready.pieces.length > 1 ? { count: ready.pieces.length, at: stage, joined: !ready.piece } : null;
  return {
    status: 'ready',
    heading: ready.heading,
    passage: heading,
    pieces,
    lang,
    step: ready.step,
    rung,
    tokens: ready.tokens,
    hidden,
    phase,
    note: note ?? (selfGraded && phase === 'shown' ? UNAVAILABLE_NOTES['hebrew-weave'] : null),
    kept,
    hold,
    selfGraded,
    next,
    canAdvance: passed && !ready.piece && ready.step < RARE_STEP,
    canNextPiece: passed && ready.piece,
    gradeSelf,
    again,
    nextStep,
    nextPiece,
    typed,
  };
}
