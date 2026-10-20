import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// An example row's English is shown whole at 390 px (mw-i7xe0n.25): the gloss span was truncate, so with the Greek word and the reference on the
// same row the Phi sheet read ἐψηλάφησαν 'touc…' and the alphabet sheet (Learn next on a 1 John goal) read ἑωράκαμεν 'we hav…'. A gloss is whole
// when its text does not overflow its own box and its row does not overflow the sheet. Since mw-5r3p30.351 the Phi sheet draws easy words, so
// 'touched' is looked for on every sheet the Goal lists.

const VIEWPORT = { width: 390, height: 844 };

type Row = { sheet: string; form: string; gloss: string; clipped: boolean };

/** The Goal screen with a goal of `goal`, its Grammar ideas open. */
async function onGoal(page: Page, goal: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    goal,
  );
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
}

/** Waits for the sheet's examples, unfolds 'Show N more', and reads each row's form and gloss and whether the gloss is clipped. */
async function rowsOf(idea: Locator, sheet: string): Promise<Row[]> {
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  const more = idea.getByRole('button', { name: /^Show \d+ more$/ });
  if (await more.count()) await more.click();
  const rows = idea.getByTestId('idea-example');
  const out: Row[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const row = rows.nth(i);
    await expect(row).toBeVisible();
    const gloss = row.getByTestId('idea-gloss');
    out.push({
      sheet,
      form: (await row.getAttribute('data-form')) ?? '',
      gloss: await gloss.innerText(),
      clipped: await gloss.evaluate((el) => {
        const row = el.closest('li') as HTMLElement;
        return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight || row.scrollWidth > row.clientWidth;
      }),
    });
  }
  return out;
}

const clipped = (rows: Row[]) => rows.filter((r) => r.clipped).map((r) => `${r.sheet}: ${r.form} '${r.gloss}'`);

function expectGlosses(rows: Row[], words: readonly string[]): void {
  const glosses = rows.map((r) => r.gloss);
  for (const word of words) expect(glosses, `'${word}' is a gloss`).toContain(word);
}

const ALPHABET = 'The Greek alphabet';

for (const [goal, words] of [
  ['1 John 1:1', ['we have heard', 'we have seen', 'touched']],
  ['1 John 1:2', ['that was revealed', 'we have seen', 'testified']],
] as const) {
  test(`Learn next on ${goal}: the alphabet sheet shows each example's English whole at 390 px`, async ({ page }) => {
    await onGoal(page, goal);
    await page.getByTestId('ideas-list').getByRole('button', { name: ALPHABET }).click();
    const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
    await expect(idea.getByRole('heading', { name: ALPHABET })).toBeVisible();
    const rows = await rowsOf(idea, ALPHABET);
    expectGlosses(rows, words);
    expect(clipped(rows)).toEqual([]);
    await idea.getByTestId('idea-example').nth(4).scrollIntoViewIfNeeded();
    await shot(page, `idea-gloss-alphabet-${goal.replace(/\D+/g, '-')}`);
  });
}

test("About Phi over 1 John 1:1: the Phi sheet shows each example's English whole at 390 px", async ({ page }) => {
  await onGoal(page, '1 John 1:1');
  await page.getByTestId('ideas-list').getByRole('button', { name: ALPHABET }).click();
  await page.getByRole('dialog', { name: 'Idea', exact: true }).getByRole('button', { name: 'About Phi' }).click();
  const phi = page.getByRole('dialog', { name: 'Idea', exact: true }).nth(1);
  await expect(phi.getByRole('heading', { name: 'Phi', exact: true })).toBeVisible();
  const rows = await rowsOf(phi, 'Phi');
  expect(rows.length).toBeGreaterThan(0);
  expect(clipped(rows)).toEqual([]);
  await shot(page, 'idea-gloss-phi');
});

for (const goal of ['1 John 1:1', '1 John 1:2']) {
  test(`every idea sheet the Goal lists for ${goal}, and every letter's, shows each example's English whole at 390 px`, async ({ page }) => {
    test.setTimeout(240_000);
    await onGoal(page, goal);
    const ids = await page.getByTestId('ideas-list').locator('[data-idea]').evaluateAll((els) => els.map((el) => el.getAttribute('data-idea') ?? ''));
    expect(ids.length).toBeGreaterThan(20);
    const rows: Row[] = [];
    for (const id of ids) {
      await page.locator(`[data-idea="${id}"]`).getByRole('button').click();
      const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
      rows.push(...(await rowsOf(idea, id)));
      if (id === 'alphabet') {
        const names = await idea.getByRole('button', { name: /^About / }).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
        expect(names.length, 'letters').toBe(24);
        for (const name of names) {
          await idea.getByRole('button', { name, exact: true }).click();
          const letter = page.getByRole('dialog', { name: 'Idea', exact: true }).nth(1);
          rows.push(...(await rowsOf(letter, name)));
          await letter.getByRole('button', { name: 'Done', exact: true }).click();
          await expect(page.getByRole('dialog', { name: 'Idea', exact: true })).toHaveCount(1);
        }
      }
      await idea.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(idea).toHaveCount(0);
    }
    if (goal === '1 John 1:1') expectGlosses(rows, ['touched', 'we have heard', 'we have seen', 'we have gazed upon']);
    else expectGlosses(rows, ['that was revealed', 'testified']);
    expect(clipped(rows)).toEqual([]);
  });
}

// The Grammar sheet (a Parsing term of the word sheet) lists its examples the same way, and a long gloss clipped there too.
test("ἑωράκαμεν > perfect over 1 John 1: the Grammar sheet shows each example's English whole at 390 px", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'ἑωράκαμεν', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'perfect', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar', exact: true });
  await expect(grammar.getByTestId('grammar-example').first()).toBeVisible();
  const rows = await grammar.getByTestId('grammar-example').evaluateAll((els) =>
    els.map((row) => {
      const gloss = row.querySelector('[data-testid="grammar-gloss"]') as HTMLElement;
      return {
        sheet: 'perfect',
        form: row.getAttribute('data-form') ?? '',
        gloss: gloss.innerText,
        clipped: gloss.scrollWidth > gloss.clientWidth || gloss.scrollHeight > gloss.clientHeight || row.scrollWidth > row.clientWidth,
      };
    }),
  );
  expectGlosses(rows, ['we have heard', 'we have not sinned']);
  expect(clipped(rows)).toEqual([]);
  await shot(page, 'idea-gloss-grammar-perfect');
});
