// The room a tutor request has under its cap (mw-5r3p30.689): the quiz-me spec's second request came to 6495 of 6500 bytes once the guide and the words of the text had
// given way, so the next registry setting would have made fitHistory drop the earlier turn and the tutor forget what it had just asked. Every request built against
// MAX_REQUEST_BYTES keeps HEADROOM_BYTES free on its largest example, and a request at the cap still seals under bsv-kit's grist payload limit.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PrivateKey, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { learnerGrammar } from '../../src/data/grammar/learnerGrammar';
import { passageVerse, passagesOf } from '../../src/data/passage';
import { learnerSummary } from '../../src/data/learnerSummary';
import { listSolidHeadwords } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import type { LibraryRow } from '../../src/data/db';
import type { CatalogueEntry, Kind } from '../../src/resources/catalogue';
import { CATALOGUE } from '../../src/resources/catalogue';
import { worksForTutor, type TutorWork } from '../../src/resources/tutorLinks';
import { MAX_REQUEST_BYTES, WORKS_BYTES } from '../../src/services/requestBudget';
import { buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { buildRequest, fitAsk } from '../../src/services/tutor';
import { SETTINGS } from '../../src/settings/registry';
import type { SettingValue } from '../../src/settings/define';
import { QUIZ_GOAL_MAX } from '../../src/data/repositories/settings';
import { MILL_PUBLIC_KEY, QUIZ_ANSWER } from '../support/fake-postern';
import { seedHisWords } from '../support/his-words';

/** The room a request keeps under MAX_REQUEST_BYTES after the lesser fields have given way: a setting added later fits without costing a turn. */
const HEADROOM_BYTES = 1000;

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const passage = passageVerse(passagesOf(chapter.verses)[0]);
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** Every registry setting at its longest value, as the request carries them (currentSettings): the longest choice, the biggest number, the longest text a person may keep. */
function longestSettings(): Record<string, SettingValue> {
  return Object.fromEntries(
    SETTINGS.map((s): [string, SettingValue] => {
      const a = s.allowed;
      if (a.kind === 'choice') return [s.key, a.values.reduce((longest, v) => (v.value.length > longest.length ? v.value : longest), '')];
      if (a.kind === 'number') return [s.key, a.max];
      return [s.key, s.key === 'quizGoal' ? 'q'.repeat(QUIZ_GOAL_MAX) : a.example];
    }),
  );
}

/** The sealed record of a request, as the phone makes it: base64 of the plaintext in the envelope; throws a RangeError over bsv-kit's payload cap. */
function sealedBytes(kind: string, input: unknown): number {
  const plaintext = { grist: { app: 'lampas', kind, v: '1' }, input, attachments: [] };
  const key = Uint8Array.from(Utils.toArray(PrivateKey.fromRandom().toHex(), 'hex'));
  const envelope = grist.sealEnvelope(JSON.stringify(plaintext), key, MILL_PUBLIC_KEY, 1_790_000_000);
  grist.recordScriptHex(envelope);
  return JSON.stringify(envelope).length;
}

afterAll(() => db.close());
beforeEach(async () => {
  clearBus();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await seedHisWords();
});

describe('the quiz-me second request (features/quiz-me.feature: an answer carries the earlier turn)', () => {
  /** The second request of a quiz on Romans 8:1-11 as the app builds it: his words and what Lampas knows of him, every setting at its longest, one earlier turn. */
  async function secondQuizRequest(): Promise<TalkRequest> {
    const solid = await listSolidHeadwords();
    const turns = [{ q: 'Quiz me on Romans 8:1-11.', a: QUIZ_ANSWER.answer }];
    return buildTalkRequest({ title: 'Romans 8', chapter, verse: passage, quiz: true }, 'No condemnation', turns, solid, longestSettings(), undefined, await learnerSummary(), await learnerGrammar());
  }

  it('keeps its earlier turn with the headroom to spare once the guide and the words of the text have given way', async () => {
    const request = await secondQuizRequest();
    const fitted = fitHistory({ ...request, greek_words: [], pronunciation_guide: undefined });
    expect(fitted.history).toEqual(request.history);
    expect(fitted.history).toHaveLength(1);
    expect(MAX_REQUEST_BYTES - bytes(fitted), `the request weighs ${bytes(fitted)} of ${MAX_REQUEST_BYTES}`).toBeGreaterThanOrEqual(HEADROOM_BYTES);
  });

  it('a request at the cap seals under the grist payload limit', () => {
    const filler = 'a'.repeat(MAX_REQUEST_BYTES - bytes({ question: '' }) - 1);
    const input = { question: filler };
    expect(bytes(input)).toBe(MAX_REQUEST_BYTES - 1);
    // 20 KiB: bsv-kit's grist MAX_PAYLOAD_BYTES; the sealed record is base64 of the plaintext and the envelope, and must leave at least 6 KiB
    expect(20 * 1024 - sealedBytes('bible-talk', input)).toBeGreaterThanOrEqual(6 * 1024);
  });
});

describe('every request built against MAX_REQUEST_BYTES', () => {
  it('the Verse view ask, on the largest verse with every setting, keeps the headroom once its lesser fields have given way', async () => {
    const verse = chapter.verses.reduce((a, b) => (bytes(b.g) + bytes(b.e) > bytes(a.g) + bytes(a.e) ? b : a));
    const request = buildRequest('Romans 8', verse, 'What does it mean?', [], await learnerSummary(), await learnerGrammar(), longestSettings() as Record<string, string>);
    const bare = fitAsk({ ...request, greek_words: [], pronunciation_guide: undefined });
    expect(MAX_REQUEST_BYTES - bytes(bare), `the ask weighs ${bytes(bare)} of ${MAX_REQUEST_BYTES}`).toBeGreaterThanOrEqual(HEADROOM_BYTES);
  });
});

// --- the digest of his shelf (mw-rfjjzd.10, docs/design/library-at-scale.md section 7) ---------------------------------------------------

/** One book of a made-up catalogue: a Resource ID as long as his real ones ('LLS:LRNTOREADNTGRK') and a short name past the 22 characters a line keeps. */
function book(kind: Kind, n: number, covers?: string[]): CatalogueEntry {
  return { resource: `LLS:${kind.replace('-', '').slice(0, 4).toUpperCase()}${String(n).padStart(3, '0')}XYZ`, kind, title: `Title ${kind} ${n}`, short: `${kind} number ${n} of his library`, lang: 'en', opens: kind === 'grammar' ? 'start' : 'verse', value: 'v', via: 'id', ...(covers ? { covers } : {}) };
}

/** 110 books On at once, as an import makes them: 20 lexicons, 20 commentaries (12 on Romans, 8 on John), 10 grammars, 6 Greek texts, 44 interlinears, 10 devotionals; the newest of the Romans ones, a Greek text and a John commentary Pinned. */
function hundredAndTen(): { catalogue: CatalogueEntry[]; shelf: LibraryRow[] } {
  const catalogue: CatalogueEntry[] = [
    ...Array.from({ length: 20 }, (_, i) => book('lexicon', i)),
    ...Array.from({ length: 12 }, (_, i) => book('commentary', i, ['rom', 'gal'])),
    ...Array.from({ length: 8 }, (_, i) => book('commentary', 20 + i, ['jhn'])),
    ...Array.from({ length: 10 }, (_, i) => book('grammar', i)),
    ...Array.from({ length: 6 }, (_, i) => book('greek-text', i)),
    ...Array.from({ length: 44 }, (_, i) => book('interlinear', i)),
    ...Array.from({ length: 10 }, (_, i) => book('devotional', i)),
  ];
  const pinned = new Set([catalogue.find((e) => e.kind === 'commentary')!.resource, catalogue.find((e) => e.kind === 'greek-text')!.resource, catalogue.find((e) => e.covers?.[0] === 'jhn')!.resource]);
  const shelf = catalogue.map((e, i): LibraryRow => ({ id: e.resource, kind: e.kind, state: pinned.has(e.resource) ? 'pinned' : 'on', since: 1000 + i }));
  return { catalogue, shelf };
}

const ROMANS_8 = { book: 'rom', chapter: 8 };
const FORM = 'Why is συνεργεῖ in the present tense, and is there a variant reading?';
const lines = (works: TutorWork[]) => works.filter((w): w is Extract<TutorWork, { id: string }> => 'id' in w);
const moreOf = (works: TutorWork[]) => works.find((w): w is Extract<TutorWork, { more: unknown }> => 'more' in w)?.more;

describe('worksForTutor: the digest of his shelf chosen by the place', () => {
  it('has a byte budget of 1,200', () => {
    expect(WORKS_BYTES).toBe(1200);
  });

  it('with 110 books On and Romans 8 open holds the pinned, the 8 commentaries on Romans, 4 grammars, 3 Greek texts and the more line, under 1,200 bytes', () => {
    const { catalogue, shelf } = hundredAndTen();
    const works = worksForTutor(shelf, ROMANS_8, FORM, undefined, catalogue);
    const kinds = lines(works).map((w) => w.k);
    // pinned first (the John commentary is pinned but does not cover Romans: it waits in `more`), every kind
    expect(lines(works).slice(0, 2).map((w) => w.id)).toEqual([catalogue.find((e) => e.kind === 'commentary')!.resource, catalogue.find((e) => e.kind === 'greek-text')!.resource]);
    expect(kinds.filter((k) => k === 'c')).toHaveLength(1 + 8);
    expect(kinds.filter((k) => k === 'g')).toHaveLength(4);
    expect(kinds.filter((k) => k === 't')).toHaveLength(1 + 3);
    expect(new Set(kinds)).toEqual(new Set(['c', 'g', 't']));
    for (const w of lines(works)) expect(Object.keys(w).sort()).toEqual(['id', 'k', 't']);
    expect(works.at(-1)).toHaveProperty('more');
    expect(moreOf(works)).toEqual({ commentary: 11, grammar: 6, 'greek-text': 2, interlinear: 44 });
    expect(bytes(works), `the digest weighs ${bytes(works)}`).toBeLessThanOrEqual(WORKS_BYTES);
  });

  it('with every book of the real catalogue On, hundreds of commentaries on Romans, still lists at most 8 commentaries and fits the budget (mw-vb8krt)', () => {
    const shelf = CATALOGUE.map((e, i): LibraryRow => ({ id: e.resource, kind: e.kind, state: 'on', since: 1000 + i }));
    const onRomans = CATALOGUE.filter((e) => e.kind === 'commentary' && e.covers?.includes('rom') && !e.work);
    expect(onRomans.length).toBeGreaterThan(50);
    for (const question of [FORM, 'What is Paul arguing in this chapter?']) {
      const works = worksForTutor(shelf, ROMANS_8, question);
      const commentaries = lines(works).filter((w) => w.k === 'c');
      expect(commentaries.length).toBeLessThanOrEqual(8);
      expect(commentaries.length).toBeGreaterThan(0);
      expect(moreOf(works)?.commentary, 'the rest wait in the closing more line').toBeGreaterThan(300);
      expect(bytes(works), `the digest weighs ${bytes(works)}`).toBeLessThanOrEqual(WORKS_BYTES);
    }
  });

  it('lists no lexicon, no devotional and no book the place does not fit, and says how many it leaves out', () => {
    const { catalogue, shelf } = hundredAndTen();
    const works = worksForTutor(shelf, { book: 'rev', chapter: 1 }, FORM, undefined, catalogue);
    expect(lines(works).map((w) => w.k)).not.toContain('l');
    expect(lines(works).filter((w) => w.k === 'c')).toHaveLength(0);
    expect(moreOf(works)?.commentary).toBe(20);
    expect(moreOf(works)).not.toHaveProperty('lexicon');
    expect(moreOf(works)).not.toHaveProperty('devotional');
  });

  it('lists the grammars and the Greek texts only for a question about a form or a reading', () => {
    const { catalogue, shelf } = hundredAndTen();
    const works = worksForTutor(shelf, ROMANS_8, 'What is Paul arguing in this chapter?', undefined, catalogue);
    expect(lines(works).map((w) => w.k)).not.toContain('g');
    expect(lines(works).filter((w) => w.k === 't').map((w) => w.id)).toEqual([catalogue.find((e) => e.kind === 'greek-text')!.resource]);
    expect(moreOf(works)).toMatchObject({ grammar: 10, 'greek-text': 5 });
  });

  it('is nothing when nothing is on the shelf, and the more line alone is not sent', () => {
    expect(worksForTutor([], ROMANS_8, FORM)).toEqual([]);
  });

  it('cuts from its end, keeping the more line honest, when the lines weigh more than the budget', () => {
    const { catalogue, shelf } = hundredAndTen();
    const long = catalogue.map((e) => ({ ...e, short: 'x'.repeat(120), resource: `${e.resource}${'Z'.repeat(40)}` }));
    const rows = shelf.map((r, i) => ({ ...r, id: long[i].resource }));
    const works = worksForTutor(rows, ROMANS_8, FORM, undefined, long);
    expect(bytes(works)).toBeLessThanOrEqual(WORKS_BYTES);
    const listed = lines(works).length;
    expect(listed).toBeGreaterThan(0);
    expect(listed).toBeLessThan(17);
    // the 80 books the tutor may be told of (not the lexicons and the devotionals) are listed or counted, none lost
    expect(listed + Object.values(moreOf(works) ?? {}).reduce((a, b) => a + b, 0)).toBe(80);
  });
});

describe('the Verse view ask with the digest of 110 books On', () => {
  it('cuts the digest from its end after the words of the verse and before his requests, counting what it drops', async () => {
    const { catalogue, shelf } = hundredAndTen();
    const works = worksForTutor(shelf, ROMANS_8, FORM, undefined, catalogue);
    const verse = chapter.verses.find((v) => v.n === 28)!;
    const request = buildRequest('Romans 8:28', verse, 'What does it mean?', [], await learnerSummary(), await learnerGrammar(), longestSettings() as Record<string, string>, [], undefined, false, undefined, undefined, undefined, undefined, chapter, works);
    expect(request.works).toEqual(works);
    const listed = (r: { works?: TutorWork[] }) => lines(r.works ?? []).length;
    // the guide, his words and the words of the verse have given way already: only the digest, his requests and notes are left to cut
    const bare = { ...request, greek_words: [], solid_words: [], pronunciation_guide: undefined };
    const padded = (extra: number) => ({ ...bare, question: 'q'.repeat(Math.max(0, MAX_REQUEST_BYTES - bytes({ ...bare, question: '' }) + extra)) });
    expect(listed(fitAsk(padded(0)))).toBe(listed(request));
    const cut = fitAsk(padded(100));
    expect(listed(cut)).toBeLessThan(listed(request));
    expect(listed(cut)).toBeGreaterThan(0);
    expect(bytes(cut)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(Object.values(moreOf(cut.works ?? []) ?? {}).reduce((a, b) => a + b, 0)).toBeGreaterThan(Object.values(moreOf(request.works ?? []) ?? {}).reduce((a, b) => a + b, 0));
  });
});

describe('the Bible talk request with the digest of 110 books On', () => {
  /** The second request of a quiz on Romans 8:1-11 with the digest in. */
  async function withDigest(): Promise<TalkRequest> {
    const { catalogue, shelf } = hundredAndTen();
    const solid = await listSolidHeadwords();
    const turns = [{ q: 'Quiz me on Romans 8:1-11.', a: QUIZ_ANSWER.answer }];
    const works = worksForTutor(shelf, ROMANS_8, FORM, undefined, catalogue);
    return buildTalkRequest({ title: 'Romans 8', chapter, verse: passage, quiz: true }, 'No condemnation', turns, solid, longestSettings(), undefined, await learnerSummary(), await learnerGrammar(), [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, works);
  }

  it('keeps the headroom with the digest in, once the guide and the words of the text have given way', async () => {
    const request = await withDigest();
    expect(request.works?.length).toBeGreaterThan(10);
    const fitted = fitHistory({ ...request, greek_words: [], pronunciation_guide: undefined });
    expect(fitted.works).toEqual(request.works);
    expect(fitted.history).toEqual(request.history);
    expect(MAX_REQUEST_BYTES - bytes(fitted), `the request weighs ${bytes(fitted)} of ${MAX_REQUEST_BYTES}`).toBeGreaterThanOrEqual(HEADROOM_BYTES);
  });

  /** The sweep of mw-rfjjzd.10 (class byte-budget-without-margin): every field of the request at 110 books On, its bytes and its share, so the next cap is seen before it bites. */
  it('names the byte share of every field of the request at 110 books On, the digest the smaller of the tutor-told fields', async () => {
    const request = await withDigest();
    const total = bytes(request);
    const rows = Object.entries(request)
      .map(([field, value]) => ({ field, size: bytes(value), share: Math.round((1000 * bytes(value)) / total) / 10 }))
      .sort((a, b) => b.size - a.size);
    console.info(`bible-talk request as built (before fitHistory), ${total} bytes against a cap of ${MAX_REQUEST_BYTES}:\n${rows.map((r) => `${r.field.padEnd(22)}${String(r.size).padStart(6)}  ${r.share}%`).join('\n')}`);
    expect(rows.find((r) => r.field === 'works')?.size).toBeLessThanOrEqual(WORKS_BYTES + 'works'.length);
    // as built, before fitHistory: the guide and the words of the text are what gives way first, and the fitted request is under the cap
    expect(bytes(fitHistory(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('fitHistory cuts the digest after the word list and before the history', async () => {
    const request = await withDigest();
    const turns = [
      { q: 'first', a: 'one' },
      { q: 'second', a: 'two' },
    ];
    const words = Array.from({ length: 12 }, (_, i) => ({ g: `λόγος${i}`, l: 'λόγος', m: 'word', p: 'N-NSM' })) as unknown as NonNullable<TalkRequest['greek_words']>;
    const base: TalkRequest = { ...request, history: turns, greek_words: words, solid_words: [], pronunciation_guide: undefined, greek: 'Greek', english: 'English' } as unknown as TalkRequest;
    const over = (extra: number, question = base.question): TalkRequest => ({ ...base, question: question + 'q'.repeat(Math.max(0, MAX_REQUEST_BYTES - bytes({ ...base, question }) + extra)) });
    const listed = (r: TalkRequest) => (r.works ? lines(r.works).length : 0);

    // a little over: the word list gives way first, the digest and the history are whole
    const small = fitHistory(over(40));
    expect(small.greek_words?.length ?? 0).toBeLessThan(words.length);
    expect(listed(small)).toBe(listed(base));
    expect(small.history).toHaveLength(2);

    // over by the whole word list and a bit more: the word list is gone, the digest is cut from its end, the history is whole
    const wordBytes = bytes(words);
    const mid = fitHistory(over(wordBytes + 60));
    expect(mid.greek_words ?? []).toHaveLength(0);
    expect(listed(mid)).toBeLessThan(listed(base));
    expect(listed(mid)).toBeGreaterThan(0);
    expect(mid.history).toHaveLength(2);
    // the pinned lines are the last to go, and the more line still counts what was cut
    expect(lines(mid.works ?? [])[0]).toEqual(lines(base.works ?? [])[0]);
    expect(Object.values(moreOf(mid.works ?? []) ?? {}).reduce((a, b) => a + b, 0)).toBeGreaterThan(Object.values(moreOf(base.works ?? []) ?? {}).reduce((a, b) => a + b, 0));

    // over by the word list and the whole digest and a bit more: only then does the oldest turn go
    const big = fitHistory(over(wordBytes + bytes(base.works) + 60));
    expect(big.works ?? []).toHaveLength(0);
    expect(big.history.length).toBeLessThan(2);
  });
});
