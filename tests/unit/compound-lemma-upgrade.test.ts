// tests/unit/compound-lemma-upgrade.test.ts — Dexie v34 (mw-5r3p30.868): before 0.7.19 the data gave four words a compound lemma ('Ἕλλην=Ἕλλην'); a word he saved then is stored
// under it. The upgrade rewrites every stored lemma, and every key built from one, to the part before '=', and merges a row that meets one already under the clean lemma.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

const V33 = {
  words: 'lemma, lesson, state, *lemmas',
  meta: 'key',
  settings: 'key',
  results: '++id, [lemma+when]',
  answers: '++id, [ref+when]',
  talks: '++id, [ref+when]',
  drills: '++id, lemma, [lemma+step]',
  readings: 'ref',
  grammarKnown: 'term',
  reviews: '[kind+id], due, kind',
  grammarLevels: 'id, level',
  usage: 'key, day, name',
  tips: 'id, status',
  talkPictures: '++id, turnId',
  shares: 'id, createdAt',
  requests: 'txid, sentAt, status',
  readingHistory: '++id, ref, [lang+at]',
  missTally: '[lang+unit], lang',
  ladder: 'lang',
  drillRuns: '++id, ideaId, at',
  passageLessons: 'key, state',
  pictureRefs: 'hash, at',
  talkSummaries: 'ref',
  library: 'id, kind',
  exportRows: 'resource',
  verseLists: '++id, created',
  recalls: '++id, [ref+lang], when',
  diagrams: '[ref+lang+version]',
  readingSets: 'id',
};

const COMPOUND = 'Ἕλλην=Ἕλλην';
const CLEAN = 'Ἕλλην';
const OTHER = 'Ἑλληνιστί=Ἑλληνικός';

/** The database as a phone of 0.7.18 left it (version 33), filled by `fill`, then closed. */
async function phoneAt33(fill: (old: Dexie) => Promise<void>) {
  db.close();
  await Dexie.delete('lampas');
  const old = new Dexie('lampas');
  old.version(33).stores(V33);
  await old.open();
  await fill(old);
  old.close();
}

const word = (lemma: string, over: Record<string, unknown> = {}) => ({ lemma, lang: 'grc', lemmas: [lemma], gloss: 'a Greek', lesson: 0, state: 'learning', since: 10, ...over });
const review = (id: string, over: Record<string, unknown> = {}) => ({ kind: 'word', id, step: 1, due: 500, lastWhen: 100, lapses: 0, rights: 1, ...over });

describe('the v34 upgrade of the compound lemmas', () => {
  it('moves a saved word, its answers, its review and its memory note to the plain lemma, history intact', async () => {
    await phoneAt33(async (old) => {
      await old.table('words').bulkPut([word(COMPOUND, { lemmas: [COMPOUND, 'λόγος'], gloss: 'a Greek', since: 20 }), word(OTHER, { lemmas: [OTHER] }), word('λόγος', { lemmas: ['λόγος'] })]);
      await old.table('results').bulkAdd([
        { lemma: COMPOUND, when: 30, right: true },
        { lemma: COMPOUND, when: 40, right: false },
        { lemma: 'λόγος', when: 50, right: true },
      ]);
      await old.table('drills').bulkAdd([{ lemma: COMPOUND, step: 'case', when: 60, right: true }]);
      await old.table('reviews').bulkPut([
        review(COMPOUND, { step: 3, due: 900, lastWhen: 200, lapses: 1, rights: 2, recent: [{ when: 150, right: false }, { when: 200, right: true }] }),
        review('λόγος'),
        { kind: 'grammar', id: 'case-genitive', step: 2, due: 1, lastWhen: 1, lapses: 0, rights: 0 },
      ]);
      await old.table('settings').bulkPut([
        { key: 'memoryNotes', value: JSON.stringify([{ name: `word:${COMPOUND}`, text: 'the Greeks', when: 70, by: 'me' }, { name: 'topic:aorist', text: 'a tense', when: 71, by: 'me' }]) },
        { key: 'readerView', value: 'greek' },
      ]);
      await old.table('answers').add({ ref: 'act.18.17', question: 'q', answer: 'a', words: [{ greek: 'Ἕλληνες', lemma: COMPOUND, note: 'n' }, { greek: 'λόγος', lemma: 'λόγος', note: 'n' }], when: 80 });
      await old.table('talks').add({ ref: 'act.18', q: 'q', a: 'a', when: 90, words: [{ greek: 'Ἕλληνες', lemma: COMPOUND, note: 'n' }], added: [COMPOUND], already: [OTHER], unknown: [], links: [{ kind: 'word', lemma: COMPOUND }, { kind: 'verse', reference: 'Acts 18:17' }], greekOffer: { kind: 'word', text: 't', lemma: COMPOUND } });
    });

    await db.open();
    expect(db.verno).toBe(34);

    expect(await db.words.get(COMPOUND)).toBeUndefined();
    expect(await db.words.get(CLEAN)).toEqual(word(CLEAN, { lemmas: [CLEAN, 'λόγος'], since: 20 }));
    expect((await db.words.get('Ἑλληνιστί'))?.lemmas).toEqual(['Ἑλληνιστί']);
    // the multi-entry index follows
    expect((await db.words.where('lemmas').equals(CLEAN).toArray()).map((w) => w.lemma)).toEqual([CLEAN]);
    expect((await db.words.get('λόγος'))?.lemmas).toEqual(['λόγος']);

    expect((await db.results.where('[lemma+when]').between([CLEAN, -Infinity], [CLEAN, Infinity]).toArray()).map((r) => [r.when, r.right])).toEqual([[30, true], [40, false]]);
    expect(await db.results.where('lemma').equals(COMPOUND).count().catch(() => 0)).toBe(0);
    expect((await db.drills.where('lemma').equals(CLEAN).toArray()).map((d) => d.step)).toEqual(['case']);

    expect(await db.reviews.get(['word', COMPOUND])).toBeUndefined();
    expect(await db.reviews.get(['word', CLEAN])).toEqual(review(CLEAN, { step: 3, due: 900, lastWhen: 200, lapses: 1, rights: 2, recent: [{ when: 150, right: false }, { when: 200, right: true }] }));
    expect(await db.reviews.get(['word', 'λόγος'])).toEqual(review('λόγος'));
    expect((await db.reviews.get(['grammar', 'case-genitive']))?.step).toBe(2);

    const notes = JSON.parse((await db.settings.get('memoryNotes'))!.value);
    expect(notes).toEqual([{ name: 'topic:aorist', text: 'a tense', when: 71, by: 'me' }, { name: `word:${CLEAN}`, text: 'the Greeks', when: 70, by: 'me' }]);
    expect((await db.settings.get('readerView'))?.value).toBe('greek');

    const answer = (await db.answers.toArray())[0];
    expect(answer.words.map((w) => w.lemma)).toEqual([CLEAN, 'λόγος']);
    const turn = (await db.talks.toArray())[0];
    expect(turn.words.map((w) => w.lemma)).toEqual([CLEAN]);
    expect(turn.added).toEqual([CLEAN]);
    expect(turn.already).toEqual(['Ἑλληνιστί']);
    expect(turn.links).toEqual([{ kind: 'word', lemma: CLEAN }, { kind: 'verse', reference: 'Acts 18:17' }]);
    expect(turn.greekOffer?.lemma).toBe(CLEAN);
  });

  it('merges a row that meets one under the plain lemma: the longer review history and the earlier date stay, the answers of both stay', async () => {
    await phoneAt33(async (old) => {
      await old.table('words').bulkPut([word(COMPOUND, { since: 5, state: 'solid', lesson: 7, gloss: '' }), word(CLEAN, { since: 50, state: 'learning', lesson: 0, gloss: 'a Greek (not a Jew)', pos: 'noun' })]);
      await old.table('results').bulkAdd([{ lemma: COMPOUND, when: 6, right: true }, { lemma: CLEAN, when: 51, right: true }]);
      await old.table('reviews').bulkPut([
        review(COMPOUND, { step: 4, due: 800, lastWhen: 300, recent: [{ when: 100, right: true }, { when: 200, right: true }, { when: 300, right: true }] }),
        review(CLEAN, { step: 1, due: 400, lastWhen: 400, recent: [{ when: 400, right: false }] }),
      ]);
      await old.table('settings').put({ key: 'memoryNotes', value: JSON.stringify([{ name: `word:${COMPOUND}`, text: 'old note', when: 70, by: 'me' }, { name: `word:${CLEAN}`, text: 'new note', when: 80, by: 'tutor' }]) });
    });

    await db.open();
    expect(await db.words.count()).toBe(1);
    const merged = (await db.words.get(CLEAN))!;
    expect(merged.since).toBe(5);
    // the state is that of the row with the longer review history, the lesson the earlier lesson, the gloss and part of speech whichever row had them
    expect(merged.state).toBe('solid');
    expect(merged.lesson).toBe(7);
    expect(merged.gloss).toBe('a Greek (not a Jew)');
    expect(merged.pos).toBe('noun');
    expect(merged.lemmas).toEqual([CLEAN]);

    expect(await db.results.count()).toBe(2);
    expect(await db.results.where('lemma').equals(CLEAN).count()).toBe(2);

    expect(await db.reviews.where('kind').equals('word').count()).toBe(1);
    expect((await db.reviews.get(['word', CLEAN]))?.recent?.length).toBe(3);
    expect((await db.reviews.get(['word', CLEAN]))?.step).toBe(4);

    const notes = JSON.parse((await db.settings.get('memoryNotes'))!.value);
    expect(notes).toHaveLength(1);
    expect(notes[0].name).toBe(`word:${CLEAN}`);
    // neither text is lost
    expect(notes[0].text).toContain('old note');
    expect(notes[0].text).toContain('new note');
    expect(notes[0].when).toBe(80);
  });

  it('leaves a database with no compound lemma as it was, and does not run again on a second open', async () => {
    const rows = {
      words: [word('λόγος'), word('ἄνθρωπος', { state: 'solid', since: 3 })],
      reviews: [review('λόγος', { recent: [{ when: 1, right: true }] }), review('ἄνθρωπος')],
    };
    await phoneAt33(async (old) => {
      await old.table('words').bulkPut(rows.words);
      await old.table('reviews').bulkPut(rows.reviews);
      await old.table('results').add({ lemma: 'λόγος', when: 4, right: true });
      await old.table('settings').put({ key: 'memoryNotes', value: JSON.stringify([{ name: 'word:λόγος', text: 't', when: 1, by: 'me' }]) });
    });
    await db.open();
    expect(await db.words.orderBy('lemma').toArray()).toEqual([...rows.words].sort((a, b) => a.lemma.localeCompare(b.lemma, 'el')).sort((a, b) => (a.lemma < b.lemma ? -1 : 1)));
    expect((await db.reviews.toArray()).sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual([...rows.reviews].sort((a, b) => (a.id < b.id ? -1 : 1)));
    expect(await db.results.count()).toBe(1);
    expect((await db.settings.get('memoryNotes'))?.value).toBe(JSON.stringify([{ name: 'word:λόγος', text: 't', when: 1, by: 'me' }]));

    // a compound row written after the upgrade is not touched by a second open: Dexie runs an upgrade once
    await db.words.put({ lemma: COMPOUND, lang: 'grc', lemmas: [COMPOUND], gloss: '', lesson: 0, state: 'learning', since: 1 });
    db.close();
    await db.open();
    expect(await db.words.get(COMPOUND)).toBeDefined();
  });
});
