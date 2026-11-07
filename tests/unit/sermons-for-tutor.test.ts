// The sermons the Bible talk tells the tutor (mw-qtu3zvz.6, src/sermons/forTutor.ts): the passage's rows then those on the same theme, at most 8, and the verse's themes, at most 6; nothing for a screen talk or About.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import type { Chapter } from '../../src/data/chapter';
import { MAX_TUTOR_SERMONS, MAX_TUTOR_THEMES, refText, sermonsForTutor, talkSermonsFor, type ListedSermon, type TutorSermons } from '../../src/sermons/forTutor';
import { buildTalkRequest, type TalkRequest, type TalkScope } from '../../src/services/talk';
import { dropSermons } from '../../src/services/talkFit';
import type { Theme } from '../../src/themes';
import { row } from '../support/sermon-sources';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

const rom5 = JSON.parse(readFileSync('public/data/rom/5.json', 'utf8')) as Chapter;
const theme = (topic: string, label: string, source = 'tcr'): Theme => ({ source, sourceName: source, topic, label, verses: 20, text: label });

/** buildTalkRequest with every argument between the solid words and `sermons` left to its default. */
const build = (scope: TalkScope, question: string, sermons: TutorSermons | undefined): TalkRequest =>
  (buildTalkRequest as (...args: unknown[]) => TalkRequest)(scope, question, [], [], ...Array<undefined>(22).fill(undefined), sermons);

describe('sermonsForTutor', () => {
  it('gives id, source, title, preacher and ref for each row, a theme only on a row that came in by one', () => {
    const rows: ListedSermon[] = [row('spurgeon-ccel', '104', "Love's Commendation", ['rom', 5, 8, 8], 'Charles Haddon Spurgeon'), { ...row('henry-sermons', 'grace', 'Grace', ['eph', 2, 8, 9]), theme: 'Grace' }];
    const told = sermonsForTutor(rows, []);
    expect(told.rows).toEqual([
      { id: '104', source: 'spurgeon-ccel', title: "Love's Commendation", preacher: 'Charles Haddon Spurgeon', ref: 'Romans 5:8' },
      { id: 'grace', source: 'henry-sermons', title: 'Grace', ref: 'Ephesians 2:8-9', theme: 'Grace' },
    ]);
  });

  it('writes the preaching text as a reader would', () => {
    expect(refText({ book: 'rom', chapter: 5, from: 6, to: 11 })).toBe('Romans 5:6-11');
    expect(refText({ book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 })).toBe('Romans 5:12-6:4');
  });

  it(`lists at most ${MAX_TUTOR_SERMONS} rows, the passage's first, a sermon once`, () => {
    const rows = Array.from({ length: 12 }, (_, i) => row('s', `${i}`, `Sermon ${i}`, ['rom', 5, 1, 2]));
    const told = sermonsForTutor([rows[0], ...rows], []);
    expect(told.rows).toHaveLength(MAX_TUTOR_SERMONS);
    expect(told.rows.map((r) => r.id)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
  });

  it(`lists at most ${MAX_TUTOR_THEMES} themes, each name once`, () => {
    const themes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l) => theme(l.toLowerCase(), l));
    const told = sermonsForTutor([], [theme('a2', 'A', 'torrey'), ...themes]);
    expect(told.themes).toHaveLength(MAX_TUTOR_THEMES);
    expect(told.themes[0]).toEqual({ topic: 'tcr:a2'.replace('tcr', 'torrey'), label: 'A' });
    expect(told.themes.map((t) => t.label)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('the request', () => {
  beforeEach(() => registerTestSermons());
  afterEach(() => forgetTestSermons());

  it('carries the sermons of the verse he holds, the verse\'s own first', async () => {
    const held = await talkSermonsFor({ book: 'rom', chapter: 5, from: 8 });
    expect(held?.told.rows.map((r) => r.id)).toEqual(['love', 'peace', 'reign', 'adam']);
    const request = build({ title: 'Romans 5:8', chapter: rom5, verse: rom5.verses.find((v) => v.n === 8)! }, 'Is there a sermon on this?', held?.told);
    expect(request.sermons?.rows.map((r) => r.id)).toContain('love');
    expect(dropSermons(request)).not.toHaveProperty('sermons');
    expect(dropSermons(dropSermons(request) as typeof request)).toBeNull();
  });

  it('sends nothing from a screen talk, in About, or when the chapter has none', async () => {
    expect(await talkSermonsFor({ book: 'gen', chapter: 1 })).toBeUndefined();
    const told = sermonsForTutor([row('s', 'x', 'X', ['rom', 5, 1, 2])], []);
    const screen = build({ title: 'Settings', chapter: rom5, verse: null, screen: { name: 'Settings', facts: [] } }, 'hi', told);
    expect(screen).not.toHaveProperty('sermons');
  });
});
