// features/steps/memorize-target.steps.ts — runs features/memorize-target.feature: the words a verse is memorized in (src/memorize/target.ts).
import { expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { memorizeTarget, type MemorizeTarget, type TargetLang } from '../../src/memorize/target';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const feature = await loadFeature('features/memorize-target.feature');

let ref = '';
let solid = new Set<string>();
let target: MemorizeTarget | null = null;

const tokens = () => {
  if (!target || target.ot) throw new Error('there is no text');
  return target.tokens;
};
const memorize = async (lang: TargetLang): Promise<void> => {
  stubChapterFetch();
  target = await memorizeTarget(ref, lang, { view: 'english', weave: 'solid', weaveShown: true, weaveGrammar: 'any', weaveOrder: 'english', levels: new Map(), solid });
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('A verse in English', ({ Given, When, Then, And }) => {
    Given('the verse {string}', (_, r: string) => { ref = r; solid = new Set(); });
    When('it is memorized in English', () => memorize('en'));
    Then('every word is English', () => expect(tokens().every((t) => t.lang === 'en')).toBe(true));
    And('the first word is {string} and the rest read {string}', (_, first: string, rest: string) => {
      expect(tokens()[0].text).toBe(first);
      expect(tokens().slice(1).map((t) => t.text).join(' ')).toBe(rest);
    });
  });

  Scenario('A verse in Greek', ({ Given, When, Then, And }) => {
    Given('the verse {string}', (_, r: string) => { ref = r; solid = new Set(); });
    When('it is memorized in Greek', () => memorize('el'));
    Then('every word is Greek', () => expect(tokens().every((t) => t.lang === 'el')).toBe(true));
    And('what is said begins {string}', (_, text: string) => expect(tokens().map((t) => t.text).join(' ').startsWith(text)).toBe(true));
  });

  Scenario('A verse half woven', ({ Given, When, Then, And }) => {
    Given('the verse {string}', (_, r: string) => { ref = r; solid = new Set(); });
    And('his solid words are {string} and {string}', (_, a: string, b: string) => { solid = new Set([a, b]); });
    When('it is memorized woven', () => memorize('weave'));
    Then('{string} and {string} are Greek and every other word is English', (_, a: string, b: string) => {
      const greek = tokens().filter((t) => t.lang === 'el').map((t) => t.text);
      expect(greek).toEqual([a, b]);
      expect(tokens().filter((t) => t.lang === 'en').length).toBe(tokens().length - 2);
    });
    And('the first three words are {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(tokens().slice(0, 3).map((t) => t.text)).toEqual([a, b, c]);
    });
  });

  Scenario('An Old Testament verse has no text', ({ Given, When, Then }) => {
    Given('the verse {string}', (_, r: string) => { ref = r; solid = new Set(); });
    When('it is memorized in English', () => memorize('en'));
    Then('it is said that there is no text for it', () => expect(target).toEqual({ ot: true, heading: 'Psalm 62:1-2' }));
  });
});
