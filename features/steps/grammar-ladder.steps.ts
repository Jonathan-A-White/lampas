// features/steps/grammar-ladder.steps.ts — runs features/grammar-ladder.feature: the ladder of grammar ideas and ideasOf.
import { expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { LADDER, TIERS, ideasOf, type GrammarIdea } from '../../src/data/grammar/ladder';

const byTitle = (title: string): GrammarIdea => {
  const idea = LADDER.find((i) => i.title === title);
  if (!idea) throw new Error(`no idea titled ${title}`);
  return idea;
};

const feature = await loadFeature('features/grammar-ladder.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The ladder starts at the alphabet and its pronunciation', ({ Given, Then, And }) => {
    Given('the grammar ladder', () => expect(LADDER.length).toBeGreaterThan(100));
    Then('its first idea is {string}', (_, title: string) => expect(LADDER[0].title).toBe(title));
    And('the next 24 ideas are the letters, from alpha to omega', () => {
      const letters = LADDER.slice(1, 25);
      expect(letters.every((i) => i.id.startsWith('letter-'))).toBe(true);
      expect(letters[0].id).toBe('letter-alpha');
      expect(letters[23].id).toBe('letter-omega');
    });
    And('the letter {string} has the glyphs {string} and {string} and the sound {string}', (_, name: string, lower: string, upper: string, sound: string) => {
      const letter = byTitle(name);
      expect(letter.glyphs).toEqual([lower, upper]);
      expect(letter.sound?.startsWith(sound)).toBe(true);
    });
    And('the sounds, the marks and then the nouns come after the letters', () => {
      const first = (tier: GrammarIdea['tier']) => LADDER.findIndex((i) => i.tier === tier);
      expect(first('letters')).toBeLessThan(first('sounds'));
      expect(first('sounds')).toBeLessThan(first('marks'));
      expect(first('marks')).toBeLessThan(first('nouns'));
      expect(TIERS.slice(0, 4)).toEqual(['letters', 'sounds', 'marks', 'nouns']);
    });
  });

  Scenario('The perfect tense sits above the present', ({ Given, Then, And }) => {
    Given('the grammar ladder', () => expect(LADDER.length).toBeGreaterThan(100));
    Then('{string} sits above {string}', (_, upper: string, lower: string) => expect(byTitle(upper).rung).toBeGreaterThan(byTitle(lower).rung));
    And('{string} sits above {string}', (_, upper: string, lower: string) => expect(byTitle(upper).rung).toBeGreaterThan(byTitle(lower).rung));
  });

  Scenario("A word's parsing names the ideas it needs", ({ Given, Then, And }) => {
    let ids: string[] = [];
    Given('the parsing code {string}', (_, code: string) => void (ids = ideasOf(code)));
    Then('it needs {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      for (const title of [a, b, c]) expect(ids).toContain(byTitle(title).id);
    });
    And('it needs nothing from the nouns tier', () => expect(ids.filter((id) => byTitle(LADDER.find((i) => i.id === id)?.title ?? '').tier === 'nouns')).toEqual([]));
    And('the parsing code {string} needs only {string}', (_, code: string, title: string) => expect(ideasOf(code)).toEqual([byTitle(title).id]));
  });
});
