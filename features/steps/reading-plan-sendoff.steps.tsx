// features/steps/reading-plan-sendoff.steps.tsx — runs features/reading-plan-sendoff.feature: Listen in Audible on a plan chapter goes through the
// send-off sheet (src/plan/SendOff.tsx, src/plan/useSendOff.ts), which records the start of the listening session before it opens Audible.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { openSession, progress as planProgress, startPlan } from '../../src/data/repositories/readingPlan';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

let timers: (() => void)[] = [];
let leave: (() => void)[] = [];
let opened: string[] = [];
/** what the open session was at the moment each address was opened (a read issued then sees the store as it was) */
let sessionsAtOpen: Promise<unknown>[] = [];
let tappedAt = 0;
let followed = false;
let progressBefore: { done: number; total: number } = { done: 0, total: 0 };

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openWith(settings: Record<string, string>, start?: { code: string; chapter: number }): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  localStorage.setItem('lampas.welcome', 'done');
  vi.unstubAllGlobals();
  stubChapterFetch();
  timers = [];
  leave = [];
  opened = [];
  followed = false;
  sessionsAtOpen = [];
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = (fn) => {
    leave.push(fn);
    return () => {
      leave = leave.filter((l) => l !== fn);
    };
  };
  browserEnv.open = (url) => {
    opened.push(url);
    sessionsAtOpen.push(openSession());
  };
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  if (start) await startPlan('whole-bible', start);
  progressBefore = await planProgress();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openVerse(address: string): Promise<void> {
  window.history.pushState(null, '', address);
  window.dispatchEvent(new PopStateEvent('popstate'));
  await screen.findByRole('region', { name: 'Verse view' });
}

const openLuke15Verse11 = (): Promise<void> => openVerse('/#/?b=luk&c=15&v=11');

/** The phone leaves Lampas for Audible and comes back: the page is hidden, then visible again. */
function comeBack(): void {
  for (const state of ['hidden', 'visible'] as const) {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }
}

/**
 * Taps the link as a phone does: jsdom follows no link, so the click is stopped once it has run Lampas's own handler. `followed` says whether the handler
 * let the phone follow the link (it did not prevent the default), the document being the last to hear the click.
 */
async function tapListen(): Promise<void> {
  const link = await screen.findByRole('link', { name: /^Listen in Audible/ });
  document.addEventListener(
    'click',
    (e) => {
      followed = !e.defaultPrevented && (e.target as HTMLElement).closest('a')?.href.startsWith('https://audible.smart.link/') === true;
      e.preventDefault();
    },
    { once: true },
  );
  tappedAt = Date.now();
  await user.click(link);
}

const sheet = (): HTMLElement => screen.getByRole('dialog', { name: /^Off to Audible/ });
const noSheet = (): void => expect(screen.queryByRole('dialog', { name: /^Off to Audible/ })).toBeNull();

const feature = await loadFeature('features/reading-plan-sendoff.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('On a plan chapter Listen in Audible asks first', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Luke 15', () => openWith({}, { code: 'luk', chapter: 15 }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps the Listen in Audible link', tapListen);
    Then('the send-off sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
    And('the sheet says {string}', (_, line: string) => {
      expect(within(sheet()).getByText(line)).toBeTruthy();
    });
    And('the sheet has one button, {string}', (_, name: string) => {
      expect(within(sheet()).getAllByRole('button').map((b) => b.textContent)).toEqual([name]);
    });
    And('Audible was not opened', () => {
      expect(opened).toEqual([]);
    });
    And('no listening session is open', async () => {
      expect(await openSession()).toBeUndefined();
    });
  });

  Scenario('Go records the start time and then opens Audible', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Luke 15', () => openWith({}, { code: 'luk', chapter: 15 }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps the Listen in Audible link', tapListen);
    And('he taps Go', async () => {
      await user.click(await within(await screen.findByRole('dialog', { name: /^Off to Audible/ })).findByRole('button', { name: 'Go' }));
    });
    Then('the listening session for Luke 15 was open when Audible was opened', async () => {
      await waitFor(() => expect(opened).toHaveLength(1));
      const seen = (await sessionsAtOpen[0]) as { code: string; chapter: number } | undefined;
      expect(seen).toMatchObject({ code: 'luk', chapter: 15 });
    });
    And('the session began at the time of the tap', async () => {
      const seen = (await sessionsAtOpen[0]) as { startedAt: number };
      expect(seen.startedAt).toBeGreaterThanOrEqual(tappedAt);
      expect(seen.startedAt).toBeLessThanOrEqual(Date.now());
    });
    And("Audible's smart link for Luke 15 was opened once", () => {
      expect(opened).toHaveLength(1);
      const url = new URL(opened[0]);
      expect(url.origin + url.pathname).toBe('https://audible.smart.link/aexglzp2n');
      expect(url.searchParams.get('position_from_start')).toBe('300423039');
    });
    And('the send-off sheet is gone', async () => {
      await waitFor(noSheet);
    });
  });

  Scenario('A tap outside closes the sheet and begins nothing', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Luke 15', () => openWith({}, { code: 'luk', chapter: 15 }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps the Listen in Audible link', tapListen);
    And('he taps outside the sheet', async () => {
      await screen.findByRole('dialog', { name: /^Off to Audible/ });
      await user.click(screen.getByTestId('sendoff-backdrop'));
    });
    Then('the send-off sheet is gone', async () => {
      await waitFor(noSheet);
    });
    And('Audible was not opened', () => {
      expect(opened).toEqual([]);
    });
    And('no listening session is open', async () => {
      expect(await openSession()).toBeUndefined();
    });
  });

  Scenario('An Old Testament chapter in the picker goes through the same sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 3', () => openWith({}, { code: 'lev', chapter: 3 }));
    When('he chooses Leviticus 3 in the chapter picker', async () => {
      await user.click(screen.getByRole('heading', { name: 'Romans 8', level: 1 }).querySelector('button') as HTMLElement);
      const picker = await screen.findByRole('dialog', { name: 'Choose a chapter' });
      await user.click(await within(picker).findByRole('button', { name: /^Leviticus/ }));
      await user.click(await within(picker).findByRole('button', { name: 'Chapter 3' }));
    });
    And('he taps the Listen in Audible link', tapListen);
    Then('the send-off sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
    When('he taps Go', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Go' }));
    });
    Then('the listening session for Leviticus 3 was open when Audible was opened', async () => {
      await waitFor(() => expect(opened).toHaveLength(1));
      expect(await sessionsAtOpen[0]).toMatchObject({ code: 'lev', chapter: 3 });
    });
  });

  Scenario('With the Reading plan off Audible opens at once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan off and the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps the Listen in Audible link', tapListen);
    Then('there is no send-off sheet', noSheet);
    And('no listening session is open', async () => {
      expect(await openSession()).toBeUndefined();
    });
  });

  Scenario('With the Reading plan on but no plan started Audible opens at once', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan on but no plan started', () => openWith({ audioBible: 'word-of-promise', readingPlan: 'on' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps the Listen in Audible link', tapListen);
    Then('there is no send-off sheet', noSheet);
  });

  Scenario("A chapter that is not the plan's next one opens Audible at once", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Matthew 5', () => openWith({}, { code: 'mat', chapter: 5 }));
    When('he opens the Verse view of 1 Peter 1:1', () => openVerse('/#/?b=1pe&c=1&v=1'));
    And('he taps the Listen in Audible link', tapListen);
    Then('there is no send-off sheet', noSheet);
    And("Audible's link was followed", () => {
      expect(followed).toBe(true);
    });
    And('no listening session is open', async () => {
      expect(await openSession()).toBeUndefined();
    });
    When('he comes back to Lampas', comeBack);
    Then('there is no return sheet', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByRole('dialog', { name: 'Where did you get to?' })).toBeNull();
    });
    And("the plan's progress is unchanged", async () => {
      expect(await planProgress()).toEqual(progressBefore);
    });
  });

  Scenario("The plan's next chapter still asks first and the return sheet still comes", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Matthew 5', () => openWith({}, { code: 'mat', chapter: 5 }));
    When('he opens the Verse view of Matthew 5:1', () => openVerse('/#/?b=mat&c=5&v=1'));
    And('he taps the Listen in Audible link', tapListen);
    Then('the send-off sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
    When('he taps Go', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Go' }));
    });
    And('he comes back to Lampas', async () => {
      await waitFor(() => expect(opened).toHaveLength(1));
      comeBack();
    });
    Then('the return sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
  });

  Scenario('With no plan at all Audible opens at once and nothing is recorded', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan on but no plan started', () => openWith({ audioBible: 'word-of-promise', readingPlan: 'on' }));
    When('he opens the Verse view of 1 Peter 1:1', () => openVerse('/#/?b=1pe&c=1&v=1'));
    And('he taps the Listen in Audible link', tapListen);
    Then('there is no send-off sheet', noSheet);
    And("Audible's link was followed", () => {
      expect(followed).toBe(true);
    });
    When('he comes back to Lampas', comeBack);
    Then('there is no return sheet', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByRole('dialog', { name: 'Where did you get to?' })).toBeNull();
    });
  });
});
