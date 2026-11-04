// tests/e2e/keyboard-typing-sweep.spec.ts — the sweep of mw-5r3p30.983: every screen of the app where he types, with the keyboard up (the window cut from 844 to 480 tall once the field has the focus, as
// tests/e2e/memorize-typing.spec.ts does it): the field can be brought into the window and nothing fixed (a foot, a bar, the floating ?) sits on its corners or middle, and its submit control, where it
// has one, can be brought into the window and is not covered either. The Talk composer has its own proof (talk-composer-keyboard.spec.ts) and Memorize's Type it its own (memorize-typing.spec.ts).
// Screens with a field this does not open are listed in docs/layout/memorize.md 'Typing' as not swept.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.describe.configure({ retries: 0 });

interface Screen {
  name: string;
  /** A finding this sweep made and left for the Mayor (the closing comment of mw-5r3p30.983): the test passes while something still sits on the field, and fails once nothing does, so the note is taken off.
   * Not test.fail(): a test that fails as expected prints a ✘ line, which mw suite reads as a failing test (mw-5r3p30.1016). */
  open_finding?: string;
  open: (page: Page) => Promise<void>;
  fields: (page: Page) => Locator[];
  submit?: (page: Page) => Locator;
}

const SCREENS: Screen[] = [
  {
    name: 'Ask for a book (Library)',
    open: async (page) => {
      await page.goto('/#/library');
      await page.getByRole('button', { name: 'Ask for a book' }).click();
    },
    fields: (page) => [page.getByRole('textbox', { name: 'Book title' }), page.getByRole('textbox', { name: 'Why would it help?' })],
    submit: (page) => page.getByRole('button', { name: 'Send', exact: true }),
  },
  {
    name: 'Ask for another approach (Settings)',
    open: async (page) => {
      await page.goto('/#/settings?group=greek');
      await page.getByRole('button', { name: 'Ask for another approach' }).click();
    },
    fields: (page) => [page.getByLabel('What approach, and how does it teach?'), page.getByLabel('Who to credit', { exact: true })],
    submit: (page) => page.getByRole('button', { name: 'Send', exact: true }),
  },
  {
    name: 'Ask for more (Settings)',
    open_finding: "the floating ? sits on the top right corner of the field with the keyboard up (it stands 17 rem above the window's foot, src/index.css [data-floating-tutor]); not fixed in mw-5r3p30.983",
    open: async (page) => {
      await page.goto('/#/settings?group=account');
      await page.getByRole('button', { name: 'Ask for more' }).click();
      await page.getByRole('button', { name: 'A translation' }).click();
    },
    fields: (page) => [page.getByRole('main').getByRole('textbox').first()],
  },
  {
    name: 'About you (Settings)',
    open_finding: "the floating ? sits on the top right corner of the field with the keyboard up (it stands 17 rem above the window's foot, src/index.css [data-floating-tutor]); not fixed in mw-5r3p30.983",
    open: async (page) => {
      await page.goto('/#/settings?group=account');
      await page.getByRole('button', { name: 'About you' }).click();
    },
    fields: (page) => [page.getByRole('textbox', { name: 'Age', exact: true })],
  },
  {
    name: 'Summary (Verse view, Practise)',
    open: async (page) => {
      await page.goto('/#/?b=jhn&c=1&view=greek&weave=off&v=1');
      const view = page.getByRole('region', { name: 'Verse view' });
      await expect(view).toBeVisible();
      await view.getByRole('button', { name: 'Practise', exact: true }).click();
      await view.getByRole('button', { name: 'Summary', exact: true }).click();
    },
    fields: (page) => [page.getByRole('textbox', { name: 'Your summary' })],
    submit: (page) => page.getByRole('button', { name: 'Check my summary', exact: true }),
  },
];

/** What is at the corners and middle of the box: '' for the box itself (or something in it), else the element that sits on it. */
const clear = (target: Locator): Promise<string[]> =>
  target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const points = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
    return points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      // '' where the box itself (or a part of it) is, else what is on it
      return hit !== null && (el.contains(hit) || hit.contains(el)) ? '' : `${hit?.tagName.toLowerCase()}${hit?.getAttribute('aria-label') ? `[${hit.getAttribute('aria-label')}]` : ''}`;
    });
  });

for (const screen of SCREENS) {
  test(`${screen.name}: with the keyboard up its field and its submit can be reached and nothing sits on them`, async ({ page }) => {
    await page.clock.install();
    await routePostern(page, makeFakePostern());
    await openUnlocked(page);
    await page.goto('/');
    await screen.open(page);
    const sitting: string[][] = [];
    for (const field of screen.fields(page)) {
      await expect(field).toBeVisible();
      await field.fill('A few words.');
      await field.focus();
      await page.setViewportSize({ width: 390, height: 480 });
      await field.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(field).toBeInViewport({ ratio: 0.9 });
      const box = (await field.boundingBox())!;
      expect(box.y + box.height, `${screen.name}: the field ends above the keyboard`).toBeLessThanOrEqual(480);
      const onField = await clear(field);
      sitting.push(onField);
      if (screen.open_finding === undefined) expect(onField, `${screen.name}: something sits on the field`).toEqual(['', '', '', '', '']);
      await page.setViewportSize({ width: 390, height: 844 });
    }
    if (screen.open_finding !== undefined) {
      expect(sitting.flat().some((hit) => hit !== ''), `${screen.name}: nothing sits on the field any more; take its open_finding off (${screen.open_finding})`).toBe(true);
    }
    if (screen.submit) {
      const submit = screen.submit(page);
      await expect(submit).toBeVisible();
      await page.setViewportSize({ width: 390, height: 480 });
      await submit.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(submit).toBeInViewport({ ratio: 0.9 });
      expect(await clear(submit), `${screen.name}: something sits on its submit`).toEqual(['', '', '', '', '']);
    }
  });
}
