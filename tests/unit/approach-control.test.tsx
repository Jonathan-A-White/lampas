// Settings > Grammar approach (src/settings/controls/approach.tsx, mw-foy5mb.1): with one approach there is no choice to draw, only the path's
// own name, method and lessons and 'Ask for another approach'; with two the radiogroup returns. Its Next badge sits on the lesson the Goal's Learn next
// opens (mw-86e9r1.24).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ladder } from '../../src/approaches/ladder';
import { lessonOf, orderOf, type GrammarApproach } from '../../src/approaches';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { db, type GrammarLevelName } from '../../src/data/db';
import { parseGoal } from '../../src/data/goal';
import { learnNext } from '../../src/data/grammar/goalProgress';
import { passageNeeds } from '../../src/data/grammar/needs';
import { ApproachPicker, ApproachControl } from '../../src/settings/controls/approach';
import { ROWS } from '../../src/settings/rows';

const stub: GrammarApproach = {
  id: 'stub',
  name: 'Stub path',
  credit: null,
  method: 'A second path, only here to hold the door open.',
  stages: [{ title: 'Only stage', levels: [{ title: 'Only level', lessons: [{ title: 'Only lesson', ideas: ['alphabet'] }] }] }],
};

afterAll(() => {
  cleanup();
  db.close();
});
beforeEach(async () => {
  cleanup();
  await db.open();
  await Promise.all([db.settings.clear(), db.grammarLevels.clear()]);
});

describe('the approach picker', () => {
  it('with one approach draws no radiogroup: its method and its lessons only', () => {
    render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={new Map()} />);
    expect(screen.getByRole('group', { name: 'Grammar approach' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryAllByRole('radio')).toEqual([]);
    expect(document.querySelector('[data-approach-method]')?.textContent).toBe(ladder.method);
    expect(document.querySelectorAll('[data-approach-lessons] [data-lesson-title]').length).toBeGreaterThan(20);
  });

  it('with a second approach draws the radiogroup again, the chosen one checked', () => {
    render(<ApproachPicker approaches={[ladder, stub]} chosen="stub" levels={new Map()} />);
    const group = screen.getByRole('radiogroup', { name: 'Grammar approach' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Lampas ladder', 'Stub path']);
    expect(within(group).getByRole('radio', { name: 'Stub path' })).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('[data-approach-method]')?.textContent).toBe(stub.method);
  });
});

const loadChapter = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const needsOf1John = () => passageNeeds(parseGoal('1 John 1:1', BOOK_INDEX)!, loadChapter, BOOK_INDEX);
const rowsOf = (levels: ReadonlyMap<string, GrammarLevelName>) => new Map(Array.from(levels, ([id, level]) => [id, { level }]));
/** The title of the lesson the picker marks Next, or null when none is marked. */
const markedNext = (): string | null => document.querySelector('[data-next]')?.closest('li')?.querySelector('[data-lesson-title]')?.textContent ?? null;

describe('the Next badge and the Goal\'s Learn next (mw-86e9r1.24)', () => {
  it.each<[string, GrammarLevelName]>([
    ['Got it (frontier)', 'frontier'],
    ['Mark known (solid)', 'solid'],
  ])('with the goal 1 John 1:1, marks the lesson Learn next opens: with no progress, then after %s on each of the first twelve ideas', async (_how, level) => {
    const needs = await needsOf1John();
    const levels = new Map<string, GrammarLevelName>();
    const seen: string[] = [];
    for (let step = 0; step <= 12; step += 1) {
      const next = learnNext(needs, ladder, levels);
      cleanup();
      render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={rowsOf(levels)} needs={needs} />);
      expect(markedNext(), `after ${step} ideas`).toBe(next?.lesson?.lesson.title ?? null);
      if (!next) break;
      seen.push(next.idea.title);
      levels.set(next.idea.id, level);
    }
    // the walk passes the foundations, the two marks the verse shows and the noun and comes to the singular, as the Goal screen does
    expect(seen.slice(0, 12)).toContain('The noun');
    expect(seen).toContain('The singular');
  });

  it('with the foundations and the noun solid, marks The singular, as Learn next names it', async () => {
    const needs = await needsOf1John();
    const solid = ['alphabet', 'breathings', 'accents', 'diphthongs', 'consonant-pairs', 'syllables', 'iota-subscript', 'punctuation', 'movable-letters', 'marks-change-word', 'noun'];
    const levels = new Map(solid.map((id): [string, GrammarLevelName] => [id, 'solid']));
    expect(learnNext(needs, ladder, levels)?.idea.title).toBe('The singular');
    render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={rowsOf(levels)} needs={needs} />);
    expect(markedNext()).toBe('The singular');
  });

  it('with no goal, still marks the lesson of the earliest idea with no level or not yet', () => {
    render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={new Map()} />);
    expect(markedNext()).toBe('The Greek alphabet');
    cleanup();
    const first = orderOf(ladder).slice(0, 3);
    render(<ApproachPicker approaches={[ladder]} chosen="ladder" levels={new Map([[first[0], { level: 'frontier' }], [first[1], { level: 'solid' }], [first[2], { level: 'notYet' }]])} />);
    expect(markedNext()).toBe(lessonOf(ladder, first[2])?.lesson.title);
  });
});

describe('Settings > Grammar approach on a phone with the one path', () => {
  it('still has Ask for another approach, and the lessons, and no radiogroup', async () => {
    const row = ROWS.find((r) => r.key === 'grammarApproach')!;
    render(<ApproachControl row={row} />);
    await screen.findByRole('button', { name: 'Ask for another approach' });
    await screen.findByText('The Greek alphabet');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
