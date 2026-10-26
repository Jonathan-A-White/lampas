// The Drill it screens serve a kept item (mw-indx1x6.1, docs/grammar.md 'More items from the mill'): Drill it and the short drill ask a kept item of the idea in place of one built question,
// once, note what they ask (tests/unit/seen-items.test.ts), and with nothing kept ask built questions from the phone alone.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { buildDrillItemsRequest, checkedItems, type AnsweredItem, type DrillItemsAnswer, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { shortDrill } from '../../src/data/grammar/drillPlan';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { countFetchedItems, listSeen, saveFetchedItems } from '../../src/data/repositories';
import { DrillItScreen } from '../../src/DrillItScreen';
import { PlanDrillScreen } from '../../src/PlanDrillScreen';
import { GRAMMAR } from '../../src/review/kinds';
import { stubChapterFetch } from '../support/chapter-fetch';

afterAll(() => cleanup());

const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const passage = [chapter];
const IDEA = 'declension-2';

const TAP: AnsweredItem = {
  idea: IDEA,
  kind: 'tap-form',
  ref: '1 John 1:1',
  prompt: 'Tap the genitive singular noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
};
const request = (): DrillItemsRequest => buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 2]]), passage) as DrillItemsRequest;
const keptItem = (): GrammarQuestion => checkedItems({ items: [TAP] } as DrillItemsAnswer, request(), passage)[0];

beforeEach(async () => {
  cleanup();
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await db.settings.clear();
});

const noop = () => undefined;
const promptShown = (): string | null => document.querySelector('[data-testid="grammar-prompt"]')?.textContent ?? null;

describe('the Drill it screens', () => {
  it('Drill it asks a kept item in place of one built question, once, and notes what it asked', async () => {
    await saveFetchedItems([keptItem()]);
    render(<DrillItScreen ideaId={IDEA} mode="practice" passage={passage} onResult={noop} onClose={noop} />);
    await waitFor(() => expect(promptShown()).toBe(TAP.prompt));
    expect(await countFetchedItems(IDEA)).toBe(0);
    fireEvent.click(document.querySelector('[data-option]') as HTMLElement);
    await waitFor(async () => expect(await listSeen(IDEA)).toContainEqual({ prompt: TAP.prompt, ref: TAP.ref }));
    cleanup();
    // used up: the next Drill it asks built questions only
    render(<DrillItScreen ideaId={IDEA} mode="practice" passage={passage} onResult={noop} onClose={noop} />);
    await screen.findByTestId('grammar-prompt');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(promptShown()).not.toBe(TAP.prompt);
  });

  it('Drill it with nothing kept asks the built questions at once', async () => {
    render(<DrillItScreen ideaId={IDEA} mode="practice" passage={passage} onResult={noop} onClose={noop} />);
    expect(await screen.findByTestId('grammar-prompt')).toBeVisible();
    expect(promptShown()).not.toBe(TAP.prompt);
  });

  it('the short drill asks a kept item as its first question, the others built, with the same count of questions', async () => {
    const item = { id: 'facet:meaning', kind: 'facet' as const, facet: { id: 'meaning', label: 'What it is' }, step: 1, done: false };
    const questions = shortDrill(IDEA, item, { passage, seed: 1 });
    expect(questions.length).toBeGreaterThanOrEqual(4);
    await saveFetchedItems([keptItem()]);
    render(<PlanDrillScreen ideaId={IDEA} facetLabel="What it is" questions={questions} onFinish={noop} onClose={noop} />);
    await waitFor(() => expect(promptShown()).toBe(TAP.prompt));
    expect(screen.getByTestId('plan-drill-step').textContent).toContain(`Question 1 of ${questions.length}`);
    expect(await countFetchedItems(IDEA)).toBe(0);
    fireEvent.click(document.querySelector('[data-option]') as HTMLElement);
    await waitFor(async () => expect(await listSeen(IDEA)).toContainEqual({ prompt: TAP.prompt, ref: TAP.ref }));
  });
});

describe('a drill never waits on the mill', () => {
  it('draws built questions from the phone alone when nothing is kept', async () => {
    const [first] = await GRAMMAR.draw([{ kind: 'grammar', id: IDEA, step: 0, due: 0, lastWhen: 0, lapses: 0, rights: 0 }], mulberry32(3));
    expect(first).toMatchObject({ kind: 'grammar', id: IDEA });
  });
});
