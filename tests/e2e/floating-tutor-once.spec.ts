// tests/e2e/floating-tutor-once.spec.ts — the tutor door is drawn once (mw-5r3p30.935). His screenshots of 2026-10-31: Settings > The tutor and
// Review each showed two round buttons, the door's floating ? and the older round Ask the tutor button (src/AskTutor.tsx AskTutorButton, bottom right). One door, drawn once: with the
// floating ? chosen the older button is not drawn, on any screen, the Reader and the Verse view and the sheets among them. Counted at 390x844 with a licence.
import { expect, test, type Page } from '@playwright/test';
import { LADDER } from '../../src/data/grammar/ladder';
import { honestSpeech } from '../support/honest-fakes';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const FLOATING = 'Ask the tutor about what is on screen';
const floating = (page: Page) => page.getByRole('button', { name: FLOATING, exact: true });
/** Every round tutor button on the page: the door's floating ? and the older Ask the tutor button. */
const DRAWN = '[data-floating-tutor], [data-ask-tutor]';

async function openReader(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { langs: ['el-GR'] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

/** The floating ? shows, once, and nothing else round and tutor-ish is drawn beside it. */
async function expectOneDoor(page: Page) {
  await expect(floating(page)).toHaveCount(1);
  await expect(floating(page)).toBeVisible();
  await expect(page.locator(DRAWN)).toHaveCount(1);
}

async function putReviews(page: Page, rows: object[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('reviews', 'readwrite');
          for (const row of list) tx.objectStore('reviews').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

test('Floating ?: Settings > The tutor shows one tutor button', async ({ page }) => {
  await openReader(page);
  await page.goto('/#/settings');
  await openGroup(page, 'The tutor');
  await expectOneDoor(page);
  await shot(page, 'floating-tutor-once-settings');
});

test('Floating ?: Review shows one tutor button, at the first card too', async ({ page }) => {
  await openReader(page);
  const ideas = LADDER.filter((i) => ['voice-none', 'mood-optative'].includes(i.id));
  const now = Date.now();
  await putReviews(page, ideas.map((i) => ({ kind: 'grammar', id: i.id, step: 0, due: now - 60_000, lastWhen: 0, lapses: 0, rights: 0 })));
  await page.goto('/#/review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
  await expectOneDoor(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible();
  await expectOneDoor(page);
  await shot(page, 'floating-tutor-once-review');
});

test('Floating ?: the Reader, the Verse view and a word sheet each show one tutor button', async ({ page }) => {
  await openReader(page);
  await expectOneDoor(page);
  await openVerseView(page, 28);
  await expectOneDoor(page);
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await page.goto('/');
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expectOneDoor(page);
});

// every screen of Lampas's own: never more than one round tutor button
const SCREENS = ['', 'words', 'import', 'test', 'drill', 'review', 'today', 'paradigms', 'placement', 'goal', 'path', 'ipa', 'diagram-lesson', 'sounds', 'studyway', 'aboutyou', 'memory', 'requests', 'conversations', 'askmore', 'help', 'about', 'preface', 'preface/robinson', 'lessons/variants', 'library', 'lists', 'memorize', 'settings', 'share'];

test('Floating ?: every screen draws exactly one tutor button', async ({ page }) => {
  test.setTimeout(120_000);
  await openReader(page);
  const counts: Record<string, number> = {};
  for (const screen of SCREENS) {
    await page.goto(`/#/${screen}`);
    await page.waitForTimeout(400);
    counts[screen || 'reader'] = await page.locator(DRAWN).count();
    expect(await page.locator('[data-ask-tutor]').count(), `${screen}: the older button`).toBe(0);
  }
  console.log(JSON.stringify(counts));
  for (const [screen, n] of Object.entries(counts)) expect(n, screen).toBe(1);
});
