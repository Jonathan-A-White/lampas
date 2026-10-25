// What Today tells the tutor (mw-1fwagb.7, the grilling mw-6ww.126 Q5): the local date, what is On, and the pieces he opened TODAY by name (none from another date);
// and the suggestions the Talk sheet opens with on Today: talk about what he read, send a screenshot of it.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getDay, markOpened } from '../../src/data/daily/dailyStore';
import { SEND_A_SCREENSHOT, suggestionsFor } from '../../src/tutor/screen';
import { openedTitles, todayFacts } from '../../src/today/tutorFacts';
import { instructionsOf } from '../../scripts/grind-parts';

beforeEach(async () => {
  await db.settings.clear();
});

afterAll(() => db.close());

const NAMES = { plan: 'John 3', devotional: 'Morning and Evening' };

describe('the pieces opened today, by name', () => {
  it('names a review, the plan chapter, a psalm, a proverb and the devotional', () => {
    expect(openedTitles(['review', 'plan', 'psa.5', 'pro.5', 'devotional'], NAMES)).toEqual(['Review', 'John 3', 'Psalm 5', 'Proverbs 5', 'Morning and Evening']);
  });

  it('names the Memorize piece', () => {
    expect(openedTitles(['review', 'memorize'], NAMES)).toEqual(['Review', 'Memorize']);
    expect(todayFacts({ date: '2026-10-19', on: ['Review', 'Memorize'], opened: ['Memorize'] })).toContainEqual({ label: 'On Today', value: 'Review, Memorize' });
  });

  it('leaves out a piece it cannot name', () => {
    expect(openedTitles(['plan', 'devotional', 'psa.5'], {})).toEqual(['Psalm 5']);
  });
});

describe('the Today screen context', () => {
  it('lists the pieces opened today and none from yesterday', async () => {
    await markOpened('2026-10-18', 'psa.18');
    await markOpened('2026-10-18', 'review');
    await markOpened('2026-10-19', 'psa.19');
    await markOpened('2026-10-19', 'devotional');
    const day = await getDay('2026-10-19');
    const facts = todayFacts({ date: '2026-10-19', on: ['Review', 'Psalms and Proverbs'], opened: openedTitles(day.opened, NAMES) });
    expect(facts).toContainEqual({ label: 'Date', value: '2026-10-19' });
    expect(facts).toContainEqual({ label: 'On Today', value: 'Review, Psalms and Proverbs' });
    const opened = facts.find((f) => f.label === 'Opened today');
    expect(opened?.value).toBe('Psalm 19, Morning and Evening');
    expect(JSON.stringify(facts)).not.toMatch(/Psalm 18|Review, Psalms and Proverbs.*Psalm 18/);
  });

  it('says nothing was opened yet, so the tutor can ask what he is reading', () => {
    const facts = todayFacts({ date: '2026-10-19', on: [], opened: [] });
    expect(facts).toContainEqual({ label: 'On Today', value: 'nothing' });
    expect(facts).toContainEqual({ label: 'Opened today', value: 'nothing yet' });
  });
});

describe('the suggestions on Today', () => {
  it('offers to talk about what he read and to send a screenshot', () => {
    const questions = suggestionsFor('Today');
    expect(questions).toContain('Talk about what I read');
    expect(questions).toContain(SEND_A_SCREENSHOT);
    expect(SEND_A_SCREENSHOT).toBe('Send a screenshot');
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('is found by the screen id too', () => {
    expect(suggestionsFor('today')).toEqual(suggestionsFor('Today'));
  });
});

// mw-5r3p30.672: a smoke run of the Today example had the tutor offer δόξα unasked and say Romans 10:18 has it (it does not). The instructions close it.
describe('the instructions for a talk with no Greek text on screen', () => {
  const instructions = instructionsOf('bible-talk');
  const part = instructions.slice(instructions.indexOf('## Talk from a screen'), instructions.indexOf('### Talk from Settings'));
  const flat = part.replace(/\s+/g, ' ');

  it('keeps words empty unless he asks about a Greek word', () => {
    expect(flat).toMatch(/no Greek text[^.]*`words` stays empty unless he asks about a Greek word/i);
  });

  it('never says a Greek word stands in a verse it was not given the text of', () => {
    expect(flat).toMatch(/never say a Greek word stands in a verse you were not given the text of/i);
  });

  it('does not tell the Today talk to tie the reading to a word of its own choosing', () => {
    const today = instructions.slice(instructions.indexOf('### Talk from Today'), instructions.indexOf("### Talk from a drill's results")).replace(/\s+/g, ' ');
    expect(today).not.toMatch(/Tie it to a word or an idea/);
    expect(today).toMatch(/`words` stays empty unless he asks about a Greek word/);
  });
});

// mw-5r3p30.686: a smoke run of the Goal example (solid_words ὁ, καί, no Greek on screen) had the tutor put both solid words in `words` while naming them in passing.
describe('the instructions for a solid word named in passing', () => {
  const instructions = instructionsOf('bible-talk');
  const section = (title: string) => {
    const from = instructions.indexOf(`## ${title}\n`);
    const to = instructions.indexOf('\n## ', from + 1);
    return instructions.slice(from, to < 0 ? undefined : to).replace(/\s+/g, ' ');
  };

  it('say in the contract that words lists only Greek words he asked about or the answer teaches', () => {
    expect(section('The contract')).toMatch(/`words` lists only Greek words he asked about or that the answer teaches/);
  });

  it('say in the contract that a word of solid_words named in passing is never put in words', () => {
    expect(section('The contract')).toMatch(/a word of `solid_words` named in passing is never put in `words`/);
  });

  it('repeat it where solid_words is used: name it and move on, and never put it in words', () => {
    expect(section('How to answer')).toMatch(/name it and move on[^.]*never put it in `words`/);
  });
});
