// The answer to the card that offers the lessons on variant readings (mw-9ji6ek0.19, src/reader/VariantLessonsOffer.tsx): Read the lessons and Not now both mark it answered, Not now
// also turns Offer the lessons Off, and turning Offer the lessons On forgets the answer so the card shows once more.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { answerVariantLessonsOffer, getVariantLessonsOfferAnswered, setVariantLessonsOffer } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { variantLessonsOfferSetting } from '../../src/settings/definitions';
import { getSetting } from '../../src/settings/store';

afterAll(() => db.close());

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('the offer of the lessons on variant readings', () => {
  it('is On and unanswered to start', async () => {
    expect(await getSetting(variantLessonsOfferSetting)).toBe('on');
    expect(await getVariantLessonsOfferAnswered()).toBe(false);
  });

  it('Not now turns the offer Off and marks the card answered', async () => {
    await answerVariantLessonsOffer(false);
    expect(await getSetting(variantLessonsOfferSetting)).toBe('off');
    expect(await getVariantLessonsOfferAnswered()).toBe(true);
  });

  it('Read the lessons marks the card answered and leaves the offer On', async () => {
    await answerVariantLessonsOffer(true);
    expect(await getSetting(variantLessonsOfferSetting)).toBe('on');
    expect(await getVariantLessonsOfferAnswered()).toBe(true);
  });

  it('turning the offer On forgets the answer; turning it Off keeps it', async () => {
    await answerVariantLessonsOffer(false);
    await setVariantLessonsOffer('on');
    expect(await getVariantLessonsOfferAnswered()).toBe(false);
    await answerVariantLessonsOffer(true);
    await setVariantLessonsOffer('off');
    expect(await getVariantLessonsOfferAnswered()).toBe(true);
  });
});
