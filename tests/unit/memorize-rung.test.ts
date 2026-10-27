// tests/unit/memorize-rung.test.ts — the step picks the rung (his Q1, mw-fu7dqf.4) and the Greek dial picks the languages (his Q2).
import { describe, expect, it } from 'vitest';
import { RARE_STEP } from '../../src/data/schedule';
import { langName, languagesFor } from '../../src/memorize/languages';
import { rungFor, rungName } from '../../src/memorize/rung';

describe('rungFor', () => {
  it('reads and says at step 0, loses a quarter more of the words each step, and is all first letters at steps 4 and 5', () => {
    expect([0, 1, 2, 3, 4, 5].map(rungFor)).toEqual([
      { kind: 'read', share: 0 },
      { kind: 'gaps', share: 0.25 },
      { kind: 'gaps', share: 0.5 },
      { kind: 'gaps', share: 0.75 },
      { kind: 'gaps', share: 1 },
      { kind: 'gaps', share: 1 },
    ]);
  });

  it('is from nothing at the rare check (the 90-day step)', () => {
    expect(RARE_STEP).toBe(6);
    expect(rungFor(RARE_STEP)).toEqual({ kind: 'nothing', share: 1 });
  });

  it('treats a step below 0 as 0 and one above the rare check as the rare check', () => {
    expect(rungFor(-1)).toEqual(rungFor(0));
    expect(rungFor(9)).toEqual(rungFor(RARE_STEP));
  });

  it('names the rung for the screen', () => {
    expect(rungName(rungFor(0))).toBe('Read and say');
    expect(rungName(rungFor(2))).toBe('Half the words gone');
    expect(rungName(rungFor(RARE_STEP))).toBe('From nothing');
  });
});

describe('languagesFor', () => {
  it('offers only English at "Just English", adds Greek at Curious and the Weave from Dipping a toe', () => {
    expect(languagesFor({ grc: 0, he: 0 })).toEqual(['en']);
    expect(languagesFor({ grc: 1, he: 0 })).toEqual(['en', 'el']);
    expect(languagesFor({ grc: 2, he: 0 })).toEqual(['en', 'el', 'weave']);
    expect(languagesFor({ grc: 5, he: 5 })).toEqual(['en', 'el', 'weave']);
  });

  it('names each language for the screen', () => {
    expect(['en', 'el', 'weave'].map((l) => langName(l as 'en'))).toEqual(['English', 'Greek', 'Weave']);
  });
});
