import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The rows a sheet lists are in view when it opens (mw-5r3p30.369): 'plural' in 1 John 2 looked as if it left out Τεκνία because the idea sheet's
// examples sat far down its scrolling body, under the teaching, and the Grammar sheet's third example sat under its buttons. A row is in view when
// it lies inside its scrolling box, the box inside the window, and a tap at its top and at its bottom lands on the row itself (nothing over it).

const UPRIGHT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

/** Why a row is not in view, or '' when it is. */
function whyHidden(row: Locator): Promise<string> {
  return row.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.height === 0) return 'not drawn';
    let box: HTMLElement | null = el.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    const b = box ? box.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) return `outside its box: row ${Math.round(r.top)}-${Math.round(r.bottom)}, box ${Math.round(b.top)}-${Math.round(b.bottom)}`;
    if (r.top < -0.5 || r.bottom > innerHeight + 0.5) return `outside the window: row ${Math.round(r.top)}-${Math.round(r.bottom)}`;
    const x = r.left + Math.min(24, r.width / 2);
    for (const y of [r.top + 3, r.bottom - 3]) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !el.contains(hit)) return `covered at ${Math.round(y)} by ${hit?.outerHTML.slice(0, 60) ?? 'nothing'}`;
    }
    return '';
  });
}

async function expectInView(rows: Locator, what: string): Promise<void> {
  const count = await rows.count();
  expect(count, `${what}: rows`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) expect(await whyHidden(rows.nth(i)), `${what}: row ${i + 1} of ${count}`).toBe('');
}

/** Τεκνία (1 John 2:1) > its Parsing's 'plural' > the Grammar sheet. */
async function opensPlural(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=2&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'plural', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar', exact: true });
  await expect(grammar.getByRole('heading', { name: 'plural', exact: true })).toBeVisible();
  return grammar;
}

/** The idea sheet once its examples are found and its level is read (the slider is enabled then). */
async function settled(idea: Locator): Promise<void> {
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await expect(idea.getByTestId('idea-example').first()).toBeAttached();
}

/** The examples drawn now (a list folded at three hides the rest until 'Show N more'). */
const shownExamples = (idea: Locator) => idea.locator('[data-testid="idea-example"]:visible');

for (const [name, size] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]] as const) {
  test(`'plural' over 1 John 2: the idea sheet opens with its three examples in view, Τεκνία first, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const grammar = await opensPlural(page);
    await grammar.getByRole('button', { name: 'Learn this idea' }).click();
    const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
    await settled(idea);
    await expect(idea.getByTestId('idea-example')).toHaveCount(3);
    await expect(idea.getByTestId('idea-example').first()).toHaveAttribute('data-form', 'Τεκνία');
    await expectInView(shownExamples(idea), 'plural');
    // the level slider and the buttons under it are in view too
    for (const control of [idea.getByRole('slider', { name: 'Your level' }), idea.getByRole('button', { name: 'Drill it', exact: true })]) {
      expect(await whyHidden(control)).toBe('');
    }
    await shot(page, `sheet-rows-plural-${name}`);
  });

  test(`Chi: the letter sheet opens with its first examples in view and a 'Show N more' for the rest, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('lampas');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key: 'goal', value: '1 John 1:1' });
            tx.oncomplete = () => {
              open.result.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.goto('/#/goal');
    await page.reload();
    await page.getByTestId('ideas-bar').click();
    await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
    await page.getByRole('dialog', { name: 'Idea', exact: true }).getByRole('button', { name: 'About Chi' }).click();
    const chi = page.getByRole('dialog', { name: 'Idea', exact: true }).nth(1);
    await expect(chi.getByRole('heading', { name: 'Chi', exact: true })).toBeVisible();
    await settled(chi);
    const all = await chi.getByTestId('idea-example').count();
    const shown = shownExamples(chi);
    await expect(shown).toHaveCount(Math.min(all, 3));
    await expectInView(shown, 'Chi');
    if (all > 3) {
      const more = chi.getByRole('button', { name: `Show ${all - 3} more`, exact: true });
      expect(await whyHidden(more)).toBe('');
      await shot(page, `sheet-rows-chi-${name}`);
      await more.click();
      await expect(shown).toHaveCount(all);
      await expect(more).toHaveCount(0);
    } else {
      await shot(page, `sheet-rows-chi-${name}`);
    }
  });
}

for (const [name, size] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]] as const) {
  test(`the sweep: the Grammar sheet of 'plural' opens with its three examples in view, beside I know this, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const grammar = await opensPlural(page);
    await expect(grammar.getByTestId('grammar-example')).toHaveCount(3);
    await expectInView(grammar.getByTestId('grammar-example'), 'Grammar sheet');
    for (const button of ['I know this', 'Ask the tutor']) expect(await whyHidden(grammar.getByRole('button', { name: button })), button).toBe('');
    await shot(page, `sheet-rows-grammar-${name}`);
  });
}

test('the sweep, upright: the word sheet of Τεκνία opens with its word, lemma, parsing and meaning in view', async ({ page }) => {
  await page.setViewportSize(UPRIGHT);
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=2&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Τεκνία', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  for (const id of ['sheet-word', 'sheet-lemma', 'sheet-parse', 'sheet-gloss']) expect(await whyHidden(word.getByTestId(id)), id).toBe('');
  await shot(page, 'sheet-rows-word');
});
