// src/memorize/useSession.ts — one Memorize session (docs/layout/memorize.md, mw-fu7dqf.8): the verse at the rung its schedule step gives, how it is heard, judged and kept.
//   loading  the row (the step; a verse not on the schedule is at step 0), the target of the moment (memorizeTarget over the Reader's own Weave settings), the rung (rungFor), the words it hides
//            (learn-kit/recall hideWords over the target, seeded by the row's lastWhen so the same words are gone each time he opens it)
//   phases   'shown' (the verse at its rung, the hold below it) -> 'sending' (a Weave recording is with the mill) -> 'judged' (misses marked, the recall kept, 'Due <day>')
//   hearing  useRecallHold(lang): dictation judged by judgeSaid ('said'), a Weave recording sent by sendWeaveRecall and judged by judgeReading ('mill'); typed(text) is judged by judgeTyped ('typed', never for the Weave); a phone that cannot hear that language, is
//            offline or has no microphone says so (`note`) and lets him grade himself (I had it / Not yet, 'self')
//   keeping  recordRecall writes the recall and moves the verse on the schedule; the row is read again for its due day
import { useCallback, useEffect, useRef, useState } from 'react';
import { foldWords, hideWords } from 'learn-kit/recall';
import type { NtVerses } from './refs';
import { versesOf } from './refs';
import { memorizedRowOf, nextDueVerse, recordRecall, type RecallHow } from '../data/repositories/memorize';
import { wovenOf } from '../reader/useWoven';
import type { WovenVerse } from '../data/weave';
import { asked, judgeReading, judgeSaid, judgeTyped, type Judgement } from './judge';
import type { MemorizeLang } from './languages';
import { rungFor, type Rung } from './rung';
import { sendWeaveRecall } from './sendWeave';
import { memorizeTarget, type VerseToken } from './target';
import { useRecallHold, type RecallHold, type RecallUnavailable } from './useRecallHold';
import { dueWords } from './due';
import { STEPS } from './progress';
import { weaveSettingsNow } from './weaveSettings';

/** What the session says when a recall cannot be heard, ahead of the two buttons that let him grade himself. */
export const UNAVAILABLE_NOTES: Record<RecallUnavailable | 'mill', string> = {
  'no-greek-dictation': 'This phone cannot hear Greek. Say it, then grade yourself.',
  'no-dictation': 'This phone cannot take dictation. Say it, then grade yourself.',
  offline: 'The speech service cannot be reached. Say it, then grade yourself.',
  'no-microphone': 'The microphone is turned off. Say it, then grade yourself.',
  mill: 'The tutor cannot be reached. Say it, then grade yourself.',
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
  | { status: 'ot'; heading: string }
  | { status: 'unknown' }
  | {
      status: 'ready';
      heading: string;
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
      /** the next verse that is due, once this one is kept; null when none is */
      next: { ref: string; lang: MemorizeLang } | null;
      gradeSelf(passed: boolean): void;
      /** what he typed (src/memorize/TypeIt.tsx), judged and kept as 'typed' */
      typed(text: string): void;
    };

interface Loaded {
  found: NtVerses;
  woven: (WovenVerse | null)[];
  tokens: VerseToken[];
  step: number;
  seed: number;
}

/** The state of the session of one verse in one language. The screen keys it by both, so a new verse is a new session and starts from nothing. */
export function useSession(ref: string, lang: MemorizeLang): SessionState {
  const [loaded, setLoaded] = useState<Loaded | 'ot' | 'unknown' | null>(null);
  const [heading, setHeading] = useState('');
  const [phase, setPhase] = useState<SessionPhase>('shown');
  const [note, setNote] = useState<string | null>(null);
  const [kept, setKept] = useState<Kept | null>(null);
  const [next, setNext] = useState<{ ref: string; lang: MemorizeLang } | null>(null);
  const keeping = useRef(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const found = await versesOf(ref).catch(() => null);
      if (!live) return;
      if (!found) return setLoaded('unknown');
      if (found.ot) {
        setHeading(found.heading);
        return setLoaded('ot');
      }
      const settings = lang === 'weave' ? await weaveSettingsNow() : undefined;
      const target = await memorizeTarget(ref, lang, settings);
      const row = await memorizedRowOf(ref, lang);
      if (!live) return;
      if (!target || target.ot) return setLoaded('unknown');
      const chapterWoven = settings ? wovenOf(found.source, settings) : null;
      const woven = found.verses.map((v) => chapterWoven?.[found.source.verses.indexOf(v)] ?? null);
      setHeading(found.heading);
      setLoaded({ found, woven, tokens: target.tokens, step: row?.step ?? 0, seed: row?.lastWhen ?? 0 });
    })();
    return () => {
      live = false;
    };
  }, [ref, lang]);

  const ready = loaded !== null && typeof loaded === 'object' ? loaded : null;
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
      sendWeaveRecall(at.found.heading, at.found.verses, at.woven, recording, { chapter: at.found.source }).then(
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

  const typed = useCallback(
    (text: string): void => {
      const at = latest.current;
      if (!at || foldWords(text).length === 0) return;
      void keep(judgeTyped(at.tokens, text), 'typed');
    },
    [keep],
  );

  if (loaded === null) return { status: 'loading' };
  if (loaded === 'ot') return { status: 'ot', heading };
  if (loaded === 'unknown') return { status: 'unknown' };
  const rung = rungFor(loaded.step);
  const hidden = rung.kind === 'gaps' ? hideWords(loaded.tokens.length, rung.share, loaded.seed) : new Set<number>();
  return { status: 'ready', heading, lang, step: loaded.step, rung, tokens: loaded.tokens, hidden, phase, note, kept, hold, next, gradeSelf, typed };
}
