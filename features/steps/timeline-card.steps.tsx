// features/steps/timeline-card.steps.tsx — runs features/timeline-card.feature: the card a tap on the timeline strip raises (src/timeline/EventCard.tsx, card.ts), the verse chip that moves
// the text (the Reader's own way to a verse, src/nav/readerRequest.ts) and the strip following a chapter turn (src/timeline/follow.ts). The data is the rig's own Theographic files, loaded as
// the app loads them. jsdom has no layout and no canvas: the strip is given a box of 390 by 282 px (its own getBoundingClientRect), which its lanes and buttons are worked out from, and
// nothing is drawn. jsdom has no matchMedia either, which the strip reads as reduced motion: every move lands at once, so the flight itself is tests/e2e/timeline-card.spec.ts's to prove.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import type { StripRoot } from '../../src/timeline/strip';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton } from '../../tests/support/find-button';
import { closeDatabase } from './close-database';

const STRIP = { width: 390, height: 282 };
const ownRect = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    if (!this.hasAttribute('data-timeline-strip')) return ownRect.call(this);
    return { x: 0, y: 0, left: 0, top: 0, right: STRIP.width, bottom: STRIP.height, width: STRIP.width, height: STRIP.height, toJSON: () => ({}) };
  };
});

afterAll(async () => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = ownRect;
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const stripEl = () => document.querySelector<StripRoot>('[data-timeline-strip]');
const cardEl = () => document.querySelector<HTMLElement>('[data-timeline-card]');
/** The card, once it is on the page. */
const card = (): Promise<HTMLElement> =>
  waitFor(() => {
    const el = cardEl();
    if (!el) throw new Error('the strip has no card');
    return el;
  });
const rowsOf = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-card-row]')];
/** What the strip says of where it stands: the words a screen reader hears with the strip's name. */
const stands = (): string => {
  const id = stripEl()?.getAttribute('aria-describedby');
  return squash(id ? document.getElementById(id)?.textContent : '');
};

/** A fresh phone on a chapter ('Isaiah 1': the book's name and the chapter), with the timeline docked and every book's file read. */
async function openDocked(title: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await db.settings.bulkPut([
    { key: 'readerSplit', value: 'on' },
    { key: 'splitTimeline', value: 'on' },
  ]);
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(() => expect(stripEl()).toHaveAttribute('data-timeline-loaded'));
}

const feature = await loadFeature('features/timeline-card.feature');

describeFeature(feature, ({ Scenario }) => {
  const docked = async (_: unknown, title: string) => openDocked(title);
  const pressMark = async (_: unknown, label: string) => {
    const mark = await findButton(label, stripEl()!);
    expect(mark).toHaveAttribute('data-mark');
    await user.click(mark);
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect(squash((await card()).querySelector('h2')?.textContent)).toBe(title));
  };
  const says = async (_: unknown, words: string) => {
    await waitFor(async () => expect(squash((await card()).querySelector('[data-card-when]')?.textContent)).toBe(words));
  };
  const chip = async (label: string): Promise<HTMLElement> => {
    const found = await findButton(label, await card());
    expect(found).toHaveAttribute('data-card-verse');
    return found;
  };
  const pressChip = async (_: unknown, label: string) => {
    await user.click(await chip(label));
  };
  const hasRows = async (_: unknown, first: string, firstWhen: string, second: string, secondWhen: string) => {
    await waitFor(async () => expect(rowsOf(await card()).map((row) => [...row.children].map((part) => squash(part.textContent)))).toEqual([[first, firstWhen], [second, secondWhen]]));
  };
  const pressRow = async (_: unknown, title: string) => {
    const row = await waitFor(async () => {
      const found = rowsOf(await card()).find((r) => squash(r.firstElementChild?.textContent) === title);
      if (!found) throw new Error(`no row ${title}`);
      return found;
    });
    await user.click(row);
  };
  const noCard = async () => {
    await waitFor(() => expect(cardEl()).toBeNull());
  };
  const brought = async (_: unknown, verse: number) => {
    await waitFor(() => expect(document.querySelector('[data-brought-verse]')).toHaveAttribute('data-brought-verse', String(verse)));
  };
  /** The mark a card is open on: the strip keeps it (ringed, in a lane), and its button over the picture says so. */
  const chosen = async (id: string) => {
    await waitFor(() => expect(stripEl()!.timeline?.chosen).toBe(id));
    await waitFor(() => expect(stripEl()!.querySelector(`[data-mark="${id}"]`)).toHaveAttribute('aria-expanded', 'true'));
  };

  Scenario('A tap on an event shows its card: title, date, verses and people', ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the mark {string}', pressMark);
    Then('the card is headed {string}', headed);
    And('the card says {string}', says);
    And("the card has the verse chip {string}, marked as the open chapter's", async (_, label: string) => {
      expect(await chip(label)).toHaveAttribute('aria-current', 'true');
    });
    And('the card names {string} in plain words', async (_, name: string) => {
      const who = within(await card()).getByText(name, { selector: '[data-card-person]' });
      expect(who.tagName).toBe('SPAN');
    });
    And('the mark {string} is the chosen one', async (_, label: string) => {
      await chosen((await findButton(label, stripEl()!)).getAttribute('data-mark')!);
    });
    When('he presses {string} on the card', async (_, label: string) => {
      await user.click(await findButton(label, await card()));
    });
    Then('the strip has no card', noCard);
    And('no mark is the chosen one', async () => {
      await waitFor(() => expect(stripEl()!.timeline?.chosen).toBeNull());
      expect(stripEl()!.querySelector('[data-mark][aria-expanded="true"]')).toBeNull();
    });
  });

  Scenario('Escape shuts the card, and so does a second tap on its mark', ({ Given, When, Then }) => {
    let label = '';
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the mark {string}', pressMark);
    Then('the card is headed {string}', headed);
    When('he presses Escape', async () => {
      await user.keyboard('{Escape}');
    });
    Then('the strip has no card', noCard);
    When('he presses the mark {string} once more', async (_, name: string) => {
      label = name;
      await pressMark(_, name);
    });
    Then('the card is back, headed {string}', headed);
    When('he presses the same mark again', async () => {
      await pressMark(null, label);
    });
    Then('the card is gone', noCard);
  });

  Scenario('A verse chip of the open chapter brings its verse to the top of the passage', ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the mark {string}', pressMark);
    And('he presses the verse chip {string}', pressChip);
    Then('verse {number} is brought to the top of the passage', brought);
    And('the Reader is still on {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    And('the card is headed {string}', headed);
  });

  Scenario("A life opens the person's card, and a row opens the event", ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the mark {string}', pressMark);
    Then('the card is headed {string}', headed);
    And('the card says {string}', says);
    And('the card has the rows {string} with {string} and {string} with {string}', hasRows);
    When('he presses the row {string}', pressRow);
    Then('the card changes to {string}', headed);
    And('the card now says {string}', says);
    And('the card has the verse chip {string}, of another chapter', async (_, label: string) => {
      expect(await chip(label)).not.toHaveAttribute('aria-current');
    });
    And('the card offers the person {string} as a button', async (_, name: string) => {
      const who = await findButton(name, await card());
      expect(who).toHaveAttribute('data-card-person');
    });
  });

  Scenario('A verse chip of another book opens that chapter, and the strip follows to its time', ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the mark {string}', pressMark);
    And('he presses the row {string}', pressRow);
    And('he presses the verse chip {string}', pressChip);
    Then('the Reader opens {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    And('verse {number} is brought to the top of the passage', brought);
    And('the strip comes to stand on {string}', async (_, title: string) => {
      await waitFor(() => expect(stripEl()).toHaveAttribute('data-timeline-loaded'));
      await waitFor(() => expect(stands()).toMatch(new RegExp(`^\\d+ to \\d+ BC, ${title}$`)));
    });
    And('the strip has no card', noCard);
  });

  Scenario('The ruler, where it is busy, lists what found no lane, and a row opens its card', ({ Given, When, Then, And }) => {
    let place = '';
    let first = { id: '', title: '' };
    Given('the Timeline is docked beside {string}', docked);
    When('he presses the ruler where several marks have no lane', async () => {
      const ruler = await waitFor(() => {
        const found = [...stripEl()!.querySelectorAll<HTMLElement>('[data-mark="ribbon"]')].find((b) => /^\d+ near /.test(b.getAttribute('aria-label') ?? ''));
        if (!found) throw new Error('the ruler has no busy place');
        return found;
      });
      place = ruler.getAttribute('aria-label')!;
      await user.click(ruler);
    });
    Then('the card is headed as that place on the ruler is named', async () => {
      await headed(null, place);
    });
    And('the card has a row for each mark there', async () => {
      const rows = rowsOf(await card());
      expect(rows).toHaveLength(Number(/^\d+/.exec(place)![0]));
      first = { id: rows[0].getAttribute('data-card-row')!, title: squash(rows[0].firstElementChild?.textContent) };
      expect(first.title).not.toBe('');
    });
    When('he presses the first row of the card', async () => {
      await user.click(rowsOf(await card())[0]);
      await act(async () => {});
    });
    Then("the card is headed with that row's name", async () => {
      await headed(null, first.title);
    });
    And("that row's mark is the chosen one", async () => {
      await chosen(first.id);
    });
  });
});
