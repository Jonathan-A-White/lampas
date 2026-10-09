// features/steps/frontier.steps.ts — runs features/frontier.feature: src/data/frontier.ts on the made-up chapter of
// tests/fixtures/frontier.ts, and on Romans 8 with his seed.
import { expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { easiestVerse, pickFrontier, type Candidate, type Known } from '../../src/data/frontier';
import type { FrequencyEntry } from '../../src/data/frequency';
import { normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';
import { FIXTURE_CHAPTER, FIXTURE_FREQUENCY } from '../../tests/fixtures/frontier';

let chapter: Chapter = FIXTURE_CHAPTER;
let frequency: FrequencyEntry[] = FIXTURE_FREQUENCY;
let known: Known = { solid: new Set(), learning: new Set(), dropped: new Set() };
let picked: Candidate[] = [];
let verse: number | null = null;

const lemmas = () => picked.map((c) => c.lemma);
const lemmasOfLessons = (pick: (lesson: number) => boolean) =>
  new Set(
    SEED_WORDS.filter((s) => pick(s.lesson)).flatMap((s) => {
      const { headword, lemmas: lexicon } = normaliseLemma(s.lemma);
      return [headword, ...lexicon].map((l) => l.normalize('NFC'));
    }),
  );

const feature = await loadFeature('features/frontier.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('a chapter of nine verses', () => {
      chapter = FIXTURE_CHAPTER;
      frequency = FIXTURE_FREQUENCY;
      picked = [];
      verse = null;
    });
    And(
      'the words {string} and {string} are solid, {string} is learning and {string} is dropped',
      (_, a: string, b: string, learning: string, dropped: string) => {
        known = { solid: new Set([a, b]), learning: new Set([learning]), dropped: new Set([dropped]) };
      },
    );
  });

  Scenario('A word I already have is never new', ({ When, Then }) => {
    When('Lampas picks the new words of the chapter', () => {
      picked = pickFrontier(chapter, known, frequency, 100);
    });
    Then('none of {string}, {string}, {string} and {string} is among them', (_, a: string, b: string, c: string, d: string) => {
      for (const l of [a, b, c, d]) expect(lemmas()).not.toContain(l);
      expect(picked.length).toBeGreaterThan(0);
    });
  });

  Scenario('The commoner word comes first', ({ When, Then, And }) => {
    When('Lampas picks the new words of the chapter', () => {
      picked = pickFrontier(chapter, known, frequency, 100);
    });
    Then('{string} comes before {string}', (_, a: string, b: string) => {
      expect(lemmas().indexOf(a)).toBeGreaterThanOrEqual(0);
      expect(lemmas().indexOf(a)).toBeLessThan(lemmas().indexOf(b));
    });
    And('{string} also comes before {string}', (_, a: string, b: string) => {
      expect(lemmas().indexOf(a)).toBeGreaterThanOrEqual(0);
      expect(lemmas().indexOf(a)).toBeLessThan(lemmas().indexOf(b));
    });
  });

  Scenario('A name comes after every ordinary word', ({ When, Then }) => {
    When('Lampas picks the new words of the chapter', () => {
      picked = pickFrontier(chapter, known, frequency, 100);
    });
    Then('{string} is last, though the New Testament uses it more often than {string}', (_, name: string, other: string) => {
      const count = (l: string) => picked.find((c) => c.lemma === l)?.count ?? 0;
      expect(count(name)).toBeGreaterThan(count(other));
      expect(lemmas()[lemmas().length - 1]).toBe(name);
    });
  });

  Scenario('Only as many as I ask for', ({ When, Then }) => {
    When('Lampas picks {int} new words of the chapter', (_, n: number) => {
      picked = pickFrontier(chapter, known, frequency, n);
    });
    Then('they are {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(lemmas()).toEqual([a, b, c]);
    });
  });

  Scenario('The verse with the most solid words around the new word', ({ When, Then }) => {
    When('Lampas looks for the easiest verse for {string}', (_, lemma: string) => {
      const c = pickFrontier(chapter, known, frequency, 100).find((x) => x.lemma === lemma);
      verse = c ? easiestVerse(c, chapter, known.solid) : null;
    });
    Then('it is verse {int}', (_, n: number) => expect(verse).toBe(n));
  });

  Scenario('The shortest verse on a tie', ({ When, Then }) => {
    When('Lampas looks for the easiest verse for {string}', (_, lemma: string) => {
      const c = pickFrontier(chapter, known, frequency, 100).find((x) => x.lemma === lemma);
      verse = c ? easiestVerse(c, chapter, known.solid) : null;
    });
    Then('it is verse {int}', (_, n: number) => expect(verse).toBe(n));
  });

  Scenario('Romans 8 gives me something to learn', ({ Given, When, Then }) => {
    Given('I am reading Romans 8 with lessons 1 to 9 solid', () => {
      chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
      frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyEntry[];
      known = {
        solid: lemmasOfLessons((n) => n <= 9),
        learning: lemmasOfLessons((n) => n > 9),
        dropped: new Set(),
      };
    });
    When('Lampas picks the new words of the chapter', () => {
      picked = pickFrontier(chapter, known, frequency, 5);
    });
    Then('there is at least one, and the first is not a name', () => {
      expect(picked.length).toBeGreaterThan(0);
      expect(frequency.find((e) => e.strongs === picked[0].strongs)?.proper).toBe(false);
    });
  });
});
