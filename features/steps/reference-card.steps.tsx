// features/steps/reference-card.steps.tsx — runs features/reference-card.feature: a Bible reference in the tutor's answer opens a card (src/markdown/ReferenceCard.tsx)
// with the passage's text before it opens anything. The answer is drawn by Markdown on its own, with the chapter files read from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { Markdown } from '../../src/markdown/Markdown';
import { readerOf } from '../../src/nav/route';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();
let answer: HTMLElement;
let hashBefore = '';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const card = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-reference-card]');

async function answerSays(text: string): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/#/?b=rom&c=8');
  hashBefore = window.location.hash;
  const { container } = render(<Markdown text={text} />);
  answer = container;
}

const feature = await loadFeature('features/reference-card.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Each reference in an answer is a link and the words around them are unchanged', ({ Given, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    Then("the answer's links are {string}, {string} and {string}", (_, a: string, b: string, c: string) => {
      expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([a, b, c]);
    });
    And('the answer reads {string}', (_, text: string) => {
      expect(answer.textContent).toBe(text);
    });
  });

  Scenario('A tap on Heb 7:1-3 opens a card with the passage, its translation and Open, and the address has not moved', ({ Given, When, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} shows the text {string}', async (_, heading: string, text: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument();
      await within(dialog).findByText(new RegExp(text));
    });
    And('the card names the translation {string}', (_, name: string) => {
      expect(within(card() as HTMLElement).getByText(name)).toBeInTheDocument();
    });
    And('the card has an Open button', () => {
      expect(within(card() as HTMLElement).getByRole('button', { name: 'Open' })).toBeInTheDocument();
    });
    And('the address is still where it was', () => {
      expect(window.location.hash).toBe(hashBefore);
    });
  });

  Scenario('Open opens the reader on Hebrews 7:1 and the card is gone', ({ Given, When, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    And('he taps Open on the card', async () => {
      await user.click(await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Open' }));
    });
    Then('the reader is opened on Hebrews 7 verse 1', () => {
      expect(readerOf(window.location.hash)).toMatchObject({ book: 'heb', chapter: 7, verse: 1 });
    });
    And('no card is showing', async () => {
      await waitFor(() => expect(card()).toBeNull());
    });
  });

  Scenario('A tap outside the card closes it and nothing moves', ({ Given, When, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    And('he taps outside the card', async () => {
      await screen.findByRole('dialog');
      await user.click(document.querySelector('[data-reference-backdrop]') as HTMLElement);
    });
    Then('no card is showing', async () => {
      await waitFor(() => expect(card()).toBeNull());
    });
    And('the address is still where it was', () => {
      expect(window.location.hash).toBe(hashBefore);
    });
  });

  Scenario('Back closes the card and nothing moves', ({ Given, When, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    And('he goes back', async () => {
      await screen.findByRole('dialog');
      window.history.back();
    });
    Then('no card is showing', async () => {
      await waitFor(() => expect(card()).toBeNull());
    });
    And('the address is still where it was', () => {
      expect(window.location.hash).toBe(hashBefore);
    });
  });

  Scenario('A whole chapter shows its first verse', ({ Given, When, Then }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} shows the text {string}', async (_, heading: string, text: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      await within(dialog).findByText(new RegExp(text));
    });
  });

  Scenario('A book Lampas has no text for says so and cannot be opened', ({ Given, When, Then, And }) => {
    Given('a tutor answer says {string}', async (_, text: string) => answerSays(text));
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, text: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      expect(within(dialog).getByText(text)).toBeInTheDocument();
    });
    And('the card has no Open button', () => {
      expect(within(card() as HTMLElement).queryByRole('button', { name: 'Open' })).toBeNull();
    });
  });
});
