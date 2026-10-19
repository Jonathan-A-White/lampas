// What Today tells the tutor (mw-1fwagb.7, the grilling mw-6ww.126 Q5): the local date, what is On, and the pieces he opened TODAY by name (none from another date);
// and the suggestions the Talk sheet opens with on Today: talk about what he read, send a screenshot of it.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getDay, markOpened } from '../../src/data/daily/dailyStore';
import { SEND_A_SCREENSHOT, suggestionsFor } from '../../src/tutor/screen';
import { openedTitles, todayFacts } from '../../src/today/tutorFacts';

beforeEach(async () => {
  await db.settings.clear();
});

afterAll(() => db.close());

const NAMES = { plan: 'John 3', devotional: 'Morning and Evening' };

describe('the pieces opened today, by name', () => {
  it('names a review, the plan chapter, a psalm, a proverb and the devotional', () => {
    expect(openedTitles(['review', 'plan', 'psa.5', 'pro.5', 'devotional'], NAMES)).toEqual(['Review', 'John 3', 'Psalm 5', 'Proverbs 5', 'Morning and Evening']);
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
