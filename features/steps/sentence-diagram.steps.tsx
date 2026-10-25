// features/steps/sentence-diagram.steps.tsx — runs features/sentence-diagram.feature: the Reed-Kellogg renderer drawing the hand-written diagrams of Colossians 3:1
// (tests/fixtures/diagrams). jsdom has no layout, so the renderer is given a fixed-width measure; the lines are counted in the SVG by data-kind.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { layoutDiagram } from '../../src/diagram/layout';
import { ReedKellogg } from '../../src/diagram/ReedKellogg';
import type { DiagramMode } from '../../src/diagram/types';
import { loadFixture, type DiagramFixture } from '../../tests/support/diagram-fixtures';

afterAll(() => {
  cleanup();
});

const user = userEvent.setup();
const measure = (text: string): number => text.length * 10;
const SLANTED = ['modifier', 'prep-slant', 'indirect-slant'];

let fixture: DiagramFixture;
let onWord = vi.fn<(index: number) => void>();

/** Draws the fixture of `mode` as the Verse view will: reference 'Colossians 3:1', a tap reported to onWord. */
function draw(mode: DiagramMode): void {
  cleanup();
  fixture = loadFixture(mode);
  onWord = vi.fn<(index: number) => void>();
  render(<ReedKellogg diagram={fixture.diagram} words={fixture.words} mode={mode} reference="Colossians 3:1" onWord={onWord} measure={measure} />);
}

const box = (): HTMLElement => document.querySelector<HTMLElement>('[data-diagram]')!;
const buttons = (): HTMLElement[] => within(box()).queryAllByRole('button');
const lines = (kinds: string[]): number => [...box().querySelectorAll('svg line')].filter((l) => kinds.includes(l.getAttribute('data-kind') ?? '')).length;

function everyWordOnce(): void {
  const names = buttons().map((b) => b.textContent);
  expect(names).toEqual(fixture.words.map((w) => w.text));
  fixture.words.forEach((w, i) => {
    const button = box().querySelector(`[data-word="${i}"]`)!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe(w.text);
    expect(screen.getAllByRole('button', { name: w.text }).filter((b) => b.getAttribute('data-word') === String(i))).toHaveLength(1);
  });
}

function understood(text: string): void {
  const implied = screen.getAllByText(`(${text})`);
  expect(implied.length).toBeGreaterThan(0);
  for (const word of implied) {
    expect(word.tagName).not.toBe('BUTTON');
    expect(word.closest('button')).toBeNull();
  }
  expect(screen.queryByRole('button', { name: `(${text})` })).toBeNull();
}

function named(mode: string): void {
  expect(box().className).toMatch(/overflow-x-auto/);
  const picture = within(box()).getByRole('img');
  expect(picture.getAttribute('aria-label')).toBe(`Sentence diagram of Colossians 3:1, ${mode}`);
}

const feature = await loadFeature('features/sentence-diagram.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Colossians 3:1 in English', ({ Given, Then, And, When }) => {
    Given('the English diagram of Colossians 3:1 is drawn', () => draw('english'));
    Then('every English word of the verse is on the screen once', everyWordOnce);
    And('the understood {string} is in parentheses and is not a button', (_, text: string) => understood(text));
    And('the English diagram has {number} base lines and {number} slanted lines', (_, base: number, slanted: number) => {
      expect(lines(['base'])).toBe(base);
      expect(lines(SLANTED)).toBe(slanted);
    });
    And('the English diagram scrolls sideways and is named by its reference and mode', () => named('English'));
    When('he taps the first {string}', async (_, text: string) => {
      await user.click(screen.getAllByRole('button', { name: text })[0]);
    });
    Then('the diagram reports word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
    When('he taps the second {string}', async (_, text: string) => {
      await user.click(screen.getAllByRole('button', { name: text })[1]);
    });
    Then('the diagram goes on to report word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
  });

  Scenario('Colossians 3:1 in Greek', ({ Given, Then, And, When }) => {
    Given('the Greek diagram of Colossians 3:1 is drawn', () => draw('greek'));
    Then('every Greek word of the verse is on the screen once', everyWordOnce);
    And('the understood {string} is in parentheses and is not a button', (_, text: string) => understood(text));
    And('the Greek diagram has {number} base lines and {number} slanted lines', (_, base: number, slanted: number) => {
      expect(lines(['base'])).toBe(base);
      expect(lines(SLANTED)).toBe(slanted);
    });
    And('the Greek diagram scrolls sideways and is named by its reference and mode', () => named('Greek'));
    When('he taps the Greek {string}', async (_, text: string) => {
      await user.click(screen.getByRole('button', { name: text }));
    });
    Then('the diagram reports word {number}', (_, index: number) => expect(onWord).toHaveBeenLastCalledWith(index));
  });

  Scenario('The Greek words are tagged as Greek and the English words are not', ({ Given, Then, When }) => {
    Given('the Greek diagram of Colossians 3:1 is drawn', () => draw('greek'));
    Then('the Greek words carry the Greek language and the understood word too', () => {
      const words = [...box().querySelectorAll('[data-word], [data-implied]')];
      expect(words.length).toBeGreaterThan(fixture.words.length);
      for (const w of words) {
        expect(w.getAttribute('lang')).toBe('el');
        expect(w.getAttribute('data-lang')).toBe('grc');
      }
    });
    When('the English diagram of Colossians 3:1 is drawn again', () => draw('english'));
    Then('no English word carries the Greek language', () => {
      expect(box().querySelector('[data-lang="grc"]')).toBeNull();
      expect(box().querySelector('[data-word]')!.getAttribute('lang')).toBe('en');
    });
  });

  Scenario('The picture is as wide as its words make it', ({ Given, Then }) => {
    Given('the English diagram of Colossians 3:1 is drawn', () => draw('english'));
    Then('the picture is exactly as wide as the layout says and is not scaled', () => {
      const layout = layoutDiagram(fixture.diagram, fixture.words, measure);
      const svg = box().querySelector('svg')!;
      expect(svg.getAttribute('width')).toBe(String(layout.width));
      expect(svg.getAttribute('height')).toBe(String(layout.height));
      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${layout.width} ${layout.height}`);
    });
  });
});
