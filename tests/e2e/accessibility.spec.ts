import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { EXCLUDED_RULES } from '../support/axe-excluded';
import { makeFakePostern, READING_ANSWER, TALK_ANSWER } from '../support/fake-postern';
import { honestMic } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

// An automated accessibility check over every main screen (mw-cwf538.2, the epic 'Lampas for every age and every ability'): axe runs with
// the WCAG 2.1 A and AA rules on each screen below, opened as a thumb opens it, and the spec fails on any violation (a missing name or role,
// a label that is not in the name, contrast). A rule that cannot be met small is excluded by its id in tests/support/axe-excluded.ts with its
// reason in docs/accessibility.md, never silently; tests/unit/accessibility-doc.test.ts keeps the two the same.
test.use({ viewport: { width: 390, height: 844 } });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Puts the Immersive reader setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keepImmersive(page: Page, value: 'on' | 'off') {
  await page.evaluate(
    (v) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'immersiveReader', value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    value,
  );
}

interface Screen {
  /** The name the list shows: the eight screens of the story. */
  name: string;
  /** Opens the screen on a fresh page and waits until it has drawn. */
  open: (page: Page) => Promise<void>;
}

const SCREENS: readonly Screen[] = [
  {
    name: 'Reader',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
    },
  },
  {
    name: 'Immersive reader',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await keepImmersive(page, 'on');
      await page.reload();
      await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
    },
  },
  {
    name: 'Quick test',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/test');
      await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
      await expect(page.locator('[data-option]')).toHaveCount(4);
    },
  },
  {
    name: 'Read it aloud',
    open: async (page) => {
      // the hold is timed by the page's clock, which the spec drives
      await page.clock.install();
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: READING_ANSWER };
      await routePostern(page, fake);
      await honestMic(page);
      await openUnlocked(page);
      await page.goto('/');
      await chooseAction(page, 28, 'Read it aloud');
      await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 1200);
      await expect(page.getByRole('region', { name: 'Reading check' }).locator('[data-fix]')).toHaveText(['together', 'purpose']);
    },
  },
  {
    name: 'Talk sheet',
    open: async (page) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Talk', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Your message' })).toBeVisible();
    },
  },
  {
    name: 'Settings',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/settings');
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Idea sheet',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
      await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
      await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' }).click();
      const idea = page.getByRole('dialog', { name: 'Idea' });
      await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
      await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
    },
  },
  {
    name: 'Placement',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/placement');
      await expect(page.getByRole('heading', { name: 'Placement', level: 1 })).toBeVisible();
    },
  },
];

/** Lets every finite transition and animation finish: axe reads the colours as drawn, and a theme change fades them over a moment. */
const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );

/** What axe finds on the open screen, one line each: the rule, how bad, and the first nodes it names. */
async function violationsOn(page: Page): Promise<string[]> {
  await settled(page);
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules([...EXCLUDED_RULES]).analyze();
  return result.violations.map((v) => {
    const targets = v.nodes.slice(0, 4).map((n) => `${n.target.join(' ')} [${(n.any[0]?.message ?? n.failureSummary ?? '').replace(/^Element has insufficient color contrast of /, '')}]`);
    return `${v.id} (${v.impact}): ${v.help} at ${targets.join(' | ')}${v.nodes.length > 4 ? ` and ${v.nodes.length - 4} more` : ''}`;
  });
}

test('the check names the eight main screens it covers', () => {
  expect(SCREENS.map((s) => s.name)).toEqual([
    'Reader',
    'Immersive reader',
    'Quick test',
    'Read it aloud',
    'Talk sheet',
    'Settings',
    'Idea sheet',
    'Placement',
  ]);
});

for (const screen of SCREENS) {
  test(`${screen.name}: axe finds no WCAG 2.1 A or AA violation`, async ({ page }) => {
    await screen.open(page);
    expect(await violationsOn(page)).toEqual([]);
    // the Theme setting follows the phone: the same screen in the phone's dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await violationsOn(page)).toEqual([]);
  });
}

// The canary: the check must fail when a button loses its accessible name, or it checks nothing.
test('the check fails when a button loses its accessible name', async ({ page }) => {
  await SCREENS[0].open(page);
  expect(await violationsOn(page)).toEqual([]);
  await page.getByRole('button', { name: 'Settings', exact: true }).evaluate((el) => {
    el.removeAttribute('aria-label');
    el.removeAttribute('title');
    el.replaceChildren();
  });
  const found = await violationsOn(page);
  expect(found.some((line) => line.startsWith('button-name'))).toBe(true);
});
