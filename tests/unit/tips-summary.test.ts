// The tips' data half (mw-5r3p30.69): a usage log kept from the bus (counts per day, no text) and the compact summary built from it
// and the Dexie stores, which the 'tips' grind is asked about. The summary names what he uses and what he has never touched.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus, publish } from '../../src/events/bus';
import { SETTINGS } from '../../src/settings/registry';
import { writeSetting } from '../../src/settings/registry';
import { addAsk } from '../support/tips-seed';
import { startUsageLog } from '../../src/tips/usageLog';
import { FEATURES, SCREENS, summarize, usageSummary, type Facts } from '../../src/tips/summary';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 12); // 1 Oct 2026, noon UTC

const noCounts: Facts['counts'] = { wordsLearning: 0, wordsSolid: 0, talks: 0, asks: 0, quizAnswers: 0, drillAnswers: 0, readings: 0, grammarKnown: 0 };
const facts = (over: Partial<Facts> = {}): Facts => ({ usage: [], counts: noCounts, saved: {}, studyOn: [], ...over });

beforeEach(async () => {
  clearBus();
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(clearBus);

describe('summarize (pure)', () => {
  it('says a phone with no use yet has used nothing: no days, every screen, feature and setting never touched', () => {
    const s = summarize(facts(), T0);
    expect(s.days_used).toBe(0);
    expect(s.first_used_days_ago).toBeNull();
    expect(s.screens_visited).toEqual([]);
    expect(s.screens_never).toEqual(SCREENS.map((x) => x.id));
    expect(s.features_used).toEqual([]);
    expect(s.features_never).toEqual(FEATURES.map((x) => x.id));
    expect(s.settings_changed).toEqual([]);
    expect(s.settings_never).toEqual(SETTINGS.map((x) => x.key));
    expect(s.turned_off).toEqual([]);
  });

  it('counts the days he used it, the last seven and how long ago the first was', () => {
    const row = (day: string, name: string, count = 1) => ({ key: `${day}|${name}`, day, name, count });
    const s = summarize(
      facts({ usage: [row('2026-09-20', 'verse-selected'), row('2026-09-20', 'view-changed'), row('2026-09-28', 'verse-selected'), row('2026-10-01', 'verse-selected')] }),
      T0,
    );
    expect(s.days_used).toBe(3);
    expect(s.days_used_last_7).toBe(2);
    expect(s.first_used_days_ago).toBe(11);
  });

  it('splits the screens into visited and never, and the features by their evidence in the log, the counts and the settings', () => {
    const row = (name: string) => ({ key: `2026-10-01|${name}`, day: '2026-10-01', name, count: 2 });
    const s = summarize(
      facts({
        usage: [row('screen:test'), row('screen:settings'), row('verse-reading'), row('chapter-changed')],
        counts: { ...noCounts, talks: 3, readings: 1 },
        saved: { weave: 'solid' },
        studyOn: ['strongs'],
      }),
      T0,
    );
    expect(s.screens_visited).toEqual(['test', 'settings']);
    expect(s.screens_never).not.toContain('test');
    expect(s.features_used).toEqual(expect.arrayContaining(['talk', 'read-aloud', 'other-chapters', 'reading-check', 'weave', 'study-links']));
    expect(s.features_never).toEqual(expect.arrayContaining(['ask', 'review', 'parsing-drill', 'long-press-speak', 'word-help']));
    expect(s.features_used.filter((f) => s.features_never.includes(f))).toEqual([]);
  });

  it('lists the settings with a saved choice as changed, the others as never, and the ones he set to off as turned off', () => {
    const s = summarize(facts({ saved: { theme: 'dark', 'rate.greek': '0.8', sectionHeadings: 'off', readerView: 'greek', 'resource.logos': 'on' } }), T0);
    expect(s.settings_changed).toEqual(['theme', 'sectionHeadings', 'greekRate', 'resource.logos']);
    expect(s.settings_never).not.toContain('theme');
    expect(s.settings_never).toContain('layout');
    expect(s.turned_off).toEqual(['sectionHeadings']);
  });

  it('carries counts only: the numbers, no text', () => {
    const s = summarize(facts({ counts: { ...noCounts, wordsLearning: 7, wordsSolid: 12 }, saved: { goal: 'Read 1 John 1:1', logosBible: 'LLS:SECRET' } }), T0);
    expect(s.counts).toMatchObject({ wordsLearning: 7, wordsSolid: 12 });
    const text = JSON.stringify(s);
    expect(text).not.toContain('John');
    expect(text).not.toContain('SECRET');
  });
});

describe('the usage log, from a recorded bus', () => {
  it('keeps one row a day for each kind with its count, and the screen he opens on and each he moves to as screen:<route>', async () => {
    let now = T0;
    const stop = startUsageLog(() => now);
    publish({ kind: 'verse-selected', chapter: 8, verse: 28 });
    publish({ kind: 'verse-selected', chapter: 8, verse: 1 });
    window.location.hash = '#/test';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    now = T0 + DAY;
    publish({ kind: 'verse-selected', chapter: 8, verse: 2 });
    await stop();
    const rows = await db.usage.orderBy('key').toArray();
    expect(rows.map((r) => [r.day, r.name, r.count])).toEqual([
      ['2026-10-01', 'screen:home', 1],
      ['2026-10-01', 'screen:test', 1],
      ['2026-10-01', 'verse-selected', 2],
      ['2026-10-02', 'verse-selected', 1],
    ]);
    window.location.hash = '';
  });

  it('logs no verse text, no word and no question: only the kind of event', async () => {
    const stop = startUsageLog(() => T0);
    publish({ kind: 'word-spoken', text: 'ἀγάπη', language: 'greek', verse: 1 });
    publish({ kind: 'reader-requested', id: 1, action: 'ask', book: 'rom', chapter: 8, verse: 28, question: 'a private question' });
    await stop();
    expect(JSON.stringify(await db.usage.toArray())).not.toMatch(/ἀγάπη|private/);
  });

  it('notes a chapter opened after another as chapter-changed, not the first one', async () => {
    const stop = startUsageLog(() => T0);
    publish({ kind: 'chapter-opened', book: 'rom', chapter: 8 });
    publish({ kind: 'chapter-opened', book: 'rom', chapter: 8 });
    publish({ kind: 'chapter-opened', book: '1jn', chapter: 1 });
    await stop();
    expect((await db.usage.where('name').equals('chapter-changed').first())?.count).toBe(1);
  });

  it('feeds usageSummary: a week of use shows what he touched and what he never did', async () => {
    let now = T0 - 5 * DAY;
    const stop = startUsageLog(() => now);
    publish({ kind: 'chapter-opened', book: 'rom', chapter: 8 });
    publish({ kind: 'word-spoken', text: 'λόγος', language: 'greek', verse: 1 });
    now = T0;
    publish({ kind: 'verse-reading', chapter: 8, verse: 1 });
    await stop();
    await writeSetting('theme', 'dark');
    await addAsk();
    const s = await usageSummary(T0);
    expect(s.days_used).toBe(2);
    expect(s.first_used_days_ago).toBe(5);
    expect(s.features_used).toEqual(expect.arrayContaining(['long-press-speak', 'read-aloud', 'ask']));
    expect(s.features_never).toEqual(expect.arrayContaining(['talk', 'review']));
    expect(s.settings_changed).toEqual(['theme']);
    expect(JSON.stringify(s)).not.toContain('what is agape');
  });
});
