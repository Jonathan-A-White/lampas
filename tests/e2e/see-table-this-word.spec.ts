// Review's See the table (mw-irpgqi.6) at 390x844: after the ending card of ἁμαρτία (accusative plural, 1 John 1) is answered, See the table opens Noun endings on This word, the
// asked cell lit and reading ἁμαρτίας, and Back returns to the card. A lemma the New Testament's forms do not reach in the table opens The pattern, the asked cell still lit.
import { expect, test, type Page } from '@playwright/test';
import { seeTableAddress } from '../../src/review/seeTable';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

test.use({ viewport: { width: 390, height: 844 } });

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings' | 'grammarLevels', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

const forms = (page: Page) => page.getByRole('group', { name: 'Forms', exact: true });

test('See the table on the ἁμαρτία ending card opens Noun endings on This word with accusative plural lit as ἁμαρτίας, and Back returns to the card', async ({ page }) => {
  await openUnlocked(page);
  // Review draws every grammar question from one seed taken from the round's random: a constant 7 / 2^32 makes the seed 7, which with Case: accusative due and Noun endings open
  // draws "Fill in the ending: accusative plural of ἁμαρτία" from 1 John 1 (found by trying the seeds in the built app; 8, 9, 44 and 46 do too)
  await page.addInitScript(() => {
    Math.random = () => 7 / 2 ** 32;
  });
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [
    { key: 'goal', value: '1 John 1' },
    { key: 'paradigmsOpened', value: JSON.stringify(['noun-endings']) },
  ]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'case-accusative', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  // the cell asked is his (a cell he lacks the ideas for stays locked, as everywhere in the tables): the ideas of a feminine noun in the accusative plural
  await put(
    page,
    'grammarLevels',
    ['noun', 'case-accusative', 'number-plural', 'gender-feminine'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })),
  );
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-kind', 'ending');
  await expect(prompt).toHaveText('Fill in the ending: accusative plural of ἁμαρτία');
  await page.locator('[data-option]', { hasText: /^ίας$/ }).click();
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
  await page.getByTestId('see-table').click();

  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
  await expect(forms(page).getByRole('button', { name: 'The pattern' })).toHaveAttribute('aria-pressed', 'false');
  // Learn: the forms are shown, the asked cell is lit and holds the word's own form
  await expect(page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveText('ἁμαρτίας');
  await expect(lit).toHaveAttribute('data-cell', /accusative plural/i);
  await expect(page.locator('[data-cell]:not([data-lit])', { hasText: 'λόγους' })).toHaveCount(0);
  await shot(page, 'see-table-this-word');

  await page.goBack();
  await expect(prompt).toHaveAttribute('data-kind', 'ending');
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
  await expect(page.getByTestId('next')).toBeVisible();
});

test('a lemma the New Testament does not reach in the table opens The pattern, the asked cell still lit', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  const address = seeTableAddress({
    kind: 'ending',
    ideaId: 'case-accusative',
    prompt: 'Fill in the ending: accusative plural of ἁμαρτία',
    options: [],
    right: 'ας',
    form: 'ἁμαρτί_',
    code: 'N-APF',
    table: 'noun-endings',
    word: 'ἁμαρτίας',
    lemma: 'ἁμαρτία',
  })!;
  // the lemma has no file of forms: the table cannot be laid with its own
  const params = new URLSearchParams({ t: address.table!, mode: 'learn', cell: address.cell!, w: address.word!, p: address.parse!, l: 'ἄλλολημμα', own: '1' });
  await page.goto(`/#/paradigms?${params}`);
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(forms(page)).toHaveCount(0);
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveAttribute('data-cell', /accusative plural/i);
});
