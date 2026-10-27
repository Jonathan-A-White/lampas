// src/memorize/evidence.ts — every recall as the tutor reads it (mw-fu7dqf.12, his Q4 addition: 'the tutor should be able to ask the app, the tutor client, for the usage data that matters'): the
// recalls table (src/data/repositories/memorize.ts keeps them, and keeps them when a verse is unmemorized) cut to what a request can carry. The tutor's memorizeEvidence fact reads it, and
// Settings > Ask for more sends it, with evidenceSummary's line, only when he says so (src/services/feedback.ts). The parked mw-6ww.138 (several schedule models) reads the same recalls later.
import { localDate } from '../data/daily/dailyStore';
import type { RecallHow, RecallRow } from '../data/db';
import { listRecalls, PASS_SCORE } from '../data/repositories/memorize';
import { hebrewPointedForm } from '../speech/hebrewPronunciation';

/** The most recalls one verse in one language keeps in the evidence. */
export const EVIDENCE_RECALLS = 30;

/** The most missed words one recall names. */
export const EVIDENCE_MISSED = 12;

/** The most bytes the evidence weighs as JSON in UTF-8, as the Greek word list is held (src/services/greekWords.ts): a request is capped at 20 KiB sealed, and this leaves the rest of it room. */
export const EVIDENCE_BYTES = 6000;

/** One recall: the day, the rung asked (the step's, 0..6), the share of the words in order, the words missed, days since the last recall of it and how it was heard. */
export interface EvidenceRecall {
  on: string;
  rung: number;
  score: number;
  missed?: string[];
  gap: number;
  how: RecallHow;
}

/** One verse in one language ('en', 'el', 'he' or 'weave') with its last recalls, oldest first. */
export interface EvidenceVerse {
  ref: string;
  lang: string;
  recalls: EvidenceRecall[];
}

const sizeOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

const recallOf = (row: RecallRow): EvidenceRecall => ({
  on: localDate(new Date(row.when)),
  rung: row.rung,
  score: Math.round(row.score * 100) / 100,
  // a Hebrew word missed (in a Hebrew or a Weave recall) is told pointed, its cantillation off, as the verse's text is (verseText.ts); the language of the recall is the row's `lang`
  ...(row.missed.length > 0 ? { missed: row.missed.slice(0, EVIDENCE_MISSED).map(hebrewPointedForm) } : {}),
  gap: row.gap,
  how: row.how,
});

/**
 * The recalls, a list for each verse in each language (the most recently recalled first): at most EVIDENCE_RECALLS of each, the last ones, and under EVIDENCE_BYTES. When they weigh more, every
 * verse keeps fewer recalls, then the missed words go, then the verses recalled longest ago.
 */
export async function memorizeEvidence(): Promise<EvidenceVerse[]> {
  const by = new Map<string, RecallRow[]>();
  for (const row of await listRecalls()) by.set(`${row.lang}:${row.ref}`, [...(by.get(`${row.lang}:${row.ref}`) ?? []), row]);
  const verses = [...by.values()].sort((a, b) => b[b.length - 1].when - a[a.length - 1].when);
  const cut = (cap: number, missed: boolean): EvidenceVerse[] =>
    verses.map((rows) => ({
      ref: rows[0].ref,
      lang: rows[0].lang,
      recalls: rows.slice(-cap).map((row) => {
        const { missed: words, ...rest } = recallOf(row);
        return missed && words ? { ...rest, missed: words } : rest;
      }),
    }));
  for (const cap of [EVIDENCE_RECALLS, 20, 12, 8, 5, 3, 2, 1]) {
    for (const missed of [true, false]) {
      const fitted = cut(cap, missed);
      if (sizeOf(fitted) <= EVIDENCE_BYTES) return fitted;
    }
  }
  const last = cut(1, false);
  while (last.length > 0 && sizeOf(last) > EVIDENCE_BYTES) last.pop();
  return last;
}

/** What evidenceSummary says before the first recall. */
export const NO_RECALLS = 'No recalls yet';

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** One line of what the recalls hold: '3 verses, 14 recalls, 11 passed, gaps 1 to 7 days'; NO_RECALLS before the first. A verse is counted once, whatever languages it was recalled in. */
export async function evidenceSummary(): Promise<string> {
  const rows = await listRecalls();
  if (rows.length === 0) return NO_RECALLS;
  const verses = new Set(rows.map((r) => r.ref)).size;
  const passed = rows.filter((r) => r.score >= PASS_SCORE).length;
  const gaps = rows.map((r) => r.gap).filter((gap) => gap > 0);
  const [low, high] = [Math.min(...gaps), Math.max(...gaps)];
  const span = gaps.length === 0 ? '' : low === high ? `, gap ${plural(low, 'day')}` : `, gaps ${low} to ${plural(high, 'day')}`;
  return `${plural(verses, 'verse')}, ${plural(rows.length, 'recall')}, ${passed} passed${span}`;
}

/** What an ask carries when he says to send his memorizing evidence: the summary line and the evidence (src/services/feedback.ts buildMoreRequest; the schema's `memorizing`). */
export interface MemorizingEvidence {
  summary: string;
  evidence: EvidenceVerse[];
}

/** The summary and the evidence as they are now: read when he taps Send with the switch On, never kept. */
export async function memorizingEvidenceNow(): Promise<MemorizingEvidence> {
  const [summary, evidence] = await Promise.all([evidenceSummary(), memorizeEvidence()]);
  return { summary, evidence };
}
