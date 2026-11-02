// A strong question of words to tap in Review (mw-5r3p30.984): at the flashcard step (3) a due 'Tap the ...' question used to come as a flashcard, its words plain text under a Show button, and tapping
// them did nothing. It is the same word buttons at every strength, and a tap on a real word grades it and goes on to the next card. Greek and Hebrew, at 390x844 and 360x640, never retried.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

test.describe.configure({ retries: 0 });

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]): Promise<void> {
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

/** an idea at the flashcard step (3; from SOLID_STEP up the draw may also be a full parsing, which the Greek pin of Math.random would not keep to a tap) due `late` days ago: the longest overdue is asked first */
const strong = (id: string, late: number) => ({ kind: 'grammar', id, step: 3, rights: 0, due: Date.now() - late * 86_400_000, lastWhen: Date.now() - 30 * 86_400_000, lapses: 0 });

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    async function expectWordsToTap(page: Page, hebrew: boolean): Promise<void> {
      const prompt = page.getByTestId('grammar-prompt');
      await expect(prompt).toHaveAttribute('data-kind', 'tap-form');
      // not a flashcard: no Show and no self-grade, whatever the step
      await expect(prompt).toHaveAttribute('data-mode', 'choice');
      await expect(page.getByRole('button', { name: 'Show', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'I knew it', exact: true })).toHaveCount(0);
      const words = page.getByTestId('verse-words').getByRole('button');
      expect(await words.count()).toBeGreaterThan(3);
      for (const word of await words.all()) {
        if (hebrew) await expect(word).toHaveAttribute('lang', 'he');
        const box = (await word.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(43.5);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }

    async function tapAndGoOn(page: Page, name: string): Promise<void> {
      await page.getByTestId('verse-words').getByRole('button').first().click();
      await expect(page.getByTestId('feedback')).toHaveText(/^(Right\.|Not quite\. The word is .+\.)$/);
      await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
      await shot(page, name);
      await page.getByTestId('next').click();
      // the next card is drawn
      await expect(page.getByTestId('grammar-prompt')).toBeVisible();
    }

    test('a strong Greek question to tap is word buttons, and tapping a word reaches the next card', async ({ page }) => {
      await openUnlocked(page);
      // a fixed random makes the preposition idea's question the tap of a form (as grammar-drills.spec.ts; at this step and with graded verses 0.25 draws what a chunk says instead, 0.1 the tap)
      await page.addInitScript(() => {
        Math.random = () => 0.1;
      });
      await page.goto('/');
      await waitForDue(page);
      await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
      await put(page, 'reviews', [strong('preposition', 3), strong('case-dative', 1)]);
      await page.goto('/#/review');
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByTestId('grammar-prompt')).toHaveAttribute('data-idea', 'preposition');
      await expectWordsToTap(page, false);
      await tapAndGoOn(page, `review-tap-strong-greek-${viewport.width}`);
    });

    test('a strong Hebrew question to tap is word buttons, and tapping a word reaches the next card', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=gen&c=1');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await waitForDue(page);
      await put(page, 'reviews', [strong('he-article', 3), strong('he-prep-inseparable', 1)]);
      await page.goto('/#/review');
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByTestId('grammar-prompt')).toHaveAttribute('data-idea', 'he-article');
      await expectWordsToTap(page, true);
      await tapAndGoOn(page, `review-tap-strong-hebrew-${viewport.width}`);
    });
  });
}
