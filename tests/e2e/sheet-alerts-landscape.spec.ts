// tests/e2e/sheet-alerts-landscape.spec.ts — every sheet that can show an error keeps the message and its buttons on screen (mw-5r3p30.633, the sweep mw-5r3p30.600 left):
// each sheet's own failing path is made to happen, at 844x390 (a phone held sideways) and at 390x844, and the red message and the buttons that come with it (Retry, Copy,
// Try again) must lie whole inside every box that clips them (the sheet's scrolling box) and inside the window. The alert watcher (src/ui/alertInView.ts) and
// keepInView (src/ui/keepInView.ts) are what bring them there; a sheet has no scroll code of its own.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { OT_BOOKS } from '../../src/data/otBooks';
import { honestMic } from '../support/honest-fakes';
import { makeFakePostern, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction, openTalkAbout } from './verse-view';

const STARTS = (JSON.parse(readFileSync('src/resources/audibleStarts.json', 'utf8')) as { chapters: Record<string, number> }).chapters;
const TWO_CHAPTERS = STARTS['lev.3'] - STARTS['lev.1'];
const SET_OFF = Date.now();
const BEFORE_LEVITICUS = OT_BOOKS.slice(0, 2).flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.code}.${i + 1}`));
const SCREENSHOT = readFileSync('grinds/examples/audible-position/leviticus-3.jpg');

const SIZES = [
  { name: 'sideways', width: 844, height: 390 },
  { name: 'upright', width: 390, height: 844 },
];

/** Every box that clips `target` (an ancestor that scrolls or hides overflow) and the window: the target lies whole inside all of them. */
async function expectShown(target: Locator, what: string): Promise<void> {
  await expect(target.first(), `${what} is not drawn`).toBeVisible();
  const fault = await target.first().evaluate((el) => {
    const at = el.getBoundingClientRect();
    const clips: { name: string; top: number; bottom: number }[] = [{ name: 'the window', top: 0, bottom: window.innerHeight }];
    for (let up = el.parentElement; up; up = up.parentElement) {
      const { overflowY, position } = getComputedStyle(up);
      // a fixed box is placed by the window, not clipped by the boxes it sits in
      if (overflowY === 'visible') {
        if (position === 'fixed') break;
        continue;
      }
      const room = up.getBoundingClientRect();
      clips.push({ name: up.getAttribute('role') ?? up.getAttribute('data-testid') ?? up.className.toString().slice(0, 60), top: room.top, bottom: room.bottom });
      if (position === 'fixed') break;
    }
    for (const clip of clips) {
      if (at.top < clip.top - 0.5) return `starts ${Math.round(clip.top - at.top)} px above ${clip.name}`;
      if (at.bottom > clip.bottom + 0.5) return `ends ${Math.round(at.bottom - clip.bottom)} px below ${clip.name}`;
    }
    return '';
  });
  expect(fault, `${what} ${fault}`).toBe('');
}

/** The message and its buttons of one failure. */
async function expectFailureShown(sheet: Locator, buttons: string[], what: string): Promise<void> {
  const alert = sheet.getByRole('alert').first();
  await expectShown(alert, `${what}: the red message`);
  for (const name of buttons) await expectShown(sheet.getByRole('button', { name, exact: true }), `${what}: ${name}`);
}

async function putPostern(page: Page): Promise<FakePostern> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  return fake;
}

/** Puts settings rows in the phone's database. */
async function putSettings(page: Page, rows: { key: string; value: string }[]): Promise<void> {
  await page.evaluate(
    (rs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const r of rs) tx.objectStore('settings').put(r);
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

/** The reading plan at Leviticus 1 with a listening session opened there, then back from two chapters of Audible: the 'Where did you get to?' sheet is open. */
async function backFromAudible(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const state = { planId: 'whole-bible', start: { code: 'lev', chapter: 1 }, done: BEFORE_LEVITICUS, session: { code: 'lev', chapter: 1, startedAt: SET_OFF } };
  await putSettings(page, [
    { key: 'readingPlan', value: 'on' },
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlanState', value: JSON.stringify(state) },
  ]);
  const setVisibility = (v: 'hidden' | 'visible') =>
    page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, v);
  await setVisibility('hidden');
  await page.clock.setFixedTime(SET_OFF + TWO_CHAPTERS + 5_000);
  await setVisibility('visible');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog', { name: 'Where did you get to?' })).toBeVisible();
}

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: true });
    // holdFor times a hold on the page's clock (tests/support/hold.ts), so it is installed before the page opens
    test.beforeEach(async ({ page }) => {
      await page.clock.install();
    });

    test('the Talk sheet: a failed send keeps its message and Copy in the box', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await page.goto('/');
      await chooseAction(page, 28, 'Ask the tutor').then((view) => view.getByRole('button', { name: 'Talk about verse 28', exact: true }).click());
      const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await expect(sheet).toBeVisible();
      fake.licensed = false;
      await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does this verse mean?');
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(sheet.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(sheet, ['Copy my question'], 'Talk');
      await shot(page, `sheet-alert-talk-${size.name}`);
    });

    test('the Verse view: a failed question keeps its message and Retry on screen', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=english&weave=off');
      const view = await chooseAction(page, 28, 'Ask the tutor');
      fake.licensed = false;
      await view.getByRole('button', { name: 'Type a question', exact: true }).click();
      await view.getByRole('textbox', { name: 'Your question' }).fill('What is the subject of this verse?');
      await view.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(view.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(view, ['Retry'], 'Verse view');
      await shot(page, `sheet-alert-verse-ask-${size.name}`);
    });

    test('the Verse view opened again on a question that failed shows its message and Retry at once', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=english&weave=off');
      let view = await chooseAction(page, 28, 'Ask the tutor');
      fake.licensed = false;
      await view.getByRole('button', { name: 'Type a question', exact: true }).click();
      await view.getByRole('textbox', { name: 'Your question' }).fill('What is the subject of this verse?');
      await view.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(view.getByRole('alert')).toContainText('No licence');
      await view.getByRole('button', { name: '‹ Reader' }).click();
      await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
      view = await chooseAction(page, 28, 'Ask the tutor');
      await expect(view.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(view, ['Retry'], 'Verse view opened again');
    });

    test('the Verse view: a reading that fails keeps its message and Retry on screen', async ({ page }) => {
      const fake = makeFakePostern();
      await routePostern(page, fake);
      await honestMic(page);
      await openUnlocked(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Greek', exact: true }).click();
      const view = await chooseAction(page, 28, 'Read it aloud');
      fake.licensed = false;
      await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 2800);
      await expect(view.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(view, ['Retry'], 'Reading check');
      await shot(page, `sheet-alert-read-${size.name}`);
    });

    test('the Talk sheet: a picture that cannot be added keeps its notice and Send in the sheet', async ({ page }) => {
      await putPostern(page);
      await openUnlocked(page);
      await page.goto('/');
      await openTalkAbout(page, 28);
      const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('textbox', { name: 'Your message' }).fill('What is in this picture?');
      await sheet.getByLabel('Picture file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
      await expect(sheet.locator('[data-talk-pictures]').getByRole('alert')).toBeVisible();
      await expectFailureShown(sheet, ['Send'], 'Talk, picture');
    });

    test('Your screenshot: a reading that fails keeps its message, Try again and Back to the choices in the sheet', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await backFromAudible(page);
      fake.licensed = false;
      await page.getByRole('dialog', { name: 'Where did you get to?' }).getByLabel('Screenshot file').setInputFiles({ name: 'shot.jpg', mimeType: 'image/jpeg', buffer: SCREENSHOT });
      const sheet = page.getByRole('dialog', { name: 'Your screenshot' });
      await expect(sheet.getByRole('alert')).toBeVisible();
      await expectFailureShown(sheet, ['Try again', 'Back to the choices'], 'Your screenshot');
      await shot(page, `sheet-alert-screenshot-${size.name}`);
    });

    test('Share to Lampas: the Bible references of a shared picture that cannot be read keep their message and Try again in the sheet', async ({ page }) => {
      const fake = await putPostern(page);
      fake.licensed = false;
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.locator('[data-verse]').first()).toBeVisible();
      const now = Date.now();
      await page.evaluate(
        ([base64, at]) =>
          new Promise<void>((resolve, reject) => {
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
            const open = indexedDB.open('lampas');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const tx = db.transaction(['shares', 'talks'], 'readwrite');
              tx.objectStore('shares').add({ id: 'pic', createdAt: at, files: [{ name: 'page.jpg', type: 'image/jpeg', bytes }] });
              for (let i = 1; i <= 4; i++) tx.objectStore('talks').add({ ref: `rom.8.${i}`, q: `Question about verse ${i}?`, a: 'An answer.', words: [], when: (at as number) - i * 3_600_000 });
              tx.oncomplete = () => (db.close(), resolve());
              tx.onerror = () => reject(tx.error);
            };
          }),
        [SCREENSHOT.toString('base64'), now] as const,
      );
      await page.goto('/#/share?s=pic');
      const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('alert')).toBeVisible();
      await expectFailureShown(sheet, ['Try again'], 'Share to Lampas');
      await shot(page, `sheet-alert-share-${size.name}`);
    });

    test('Ask for another approach: a failed send keeps its message and Retry in the sheet', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await page.goto('/#/settings');
      await page.getByRole('button', { name: 'Ask for another approach' }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Ask for another approach' }).click();
      const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
      await expect(sheet).toBeVisible();
      fake.licensed = false;
      await sheet.getByLabel('What approach, and how does it teach?').fill('Teach the cases with colours, one at a time.');
      await sheet.getByLabel('Who to credit', { exact: true }).fill('Anna Example');
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(sheet.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(sheet, ['Retry'], 'Ask for another approach');
      await shot(page, `sheet-alert-approach-${size.name}`);
    });

    test('Ask for another approach: the tutor helping with the form, when it fails, keeps its message and Retry in its box', async ({ page }) => {
      const fake = await putPostern(page);
      await openUnlocked(page);
      await page.goto('/#/settings');
      await page.getByRole('button', { name: 'Ask for another approach' }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Ask for another approach' }).click();
      const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
      await expect(sheet).toBeVisible();
      fake.licensed = false;
      await sheet.getByRole('button', { name: 'Let the tutor help me fill this in' }).click();
      const helper = sheet.getByRole('region', { name: 'The tutor is helping with this form' });
      await expect(helper.getByRole('alert')).toContainText('No licence');
      await expectFailureShown(helper, ['Retry'], 'The tutor helping with the form');
      await shot(page, `sheet-alert-form-helper-${size.name}`);
    });

    test('Ask for another approach: a picture that cannot be added keeps its notice in the sheet', async ({ page }) => {
      await putPostern(page);
      await openUnlocked(page);
      await page.goto('/#/settings');
      await page.getByRole('button', { name: 'Ask for another approach' }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Ask for another approach' }).click();
      const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
      await expect(sheet).toBeVisible();
      await sheet.getByLabel('Add a screenshot or photo').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
      await expect(sheet.getByRole('alert')).toBeVisible();
      await expectFailureShown(sheet, [], 'Ask for another approach, picture');
    });

    test('the chapter picker: a list of chapters that cannot load keeps its message and Try again in the box', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await page.route('**/data/index.json', (route) => route.abort());
      await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
      const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
      await expect(picker).toBeVisible();
      await picker.getByRole('button', { name: '1 John' }).click();
      await expect(picker.getByRole('alert')).toContainText('Could not load the list of chapters');
      await expectFailureShown(picker, ['Try again'], 'Chapter picker');
      await shot(page, `sheet-alert-picker-${size.name}`);
    });

    test('the Reading drill: words that cannot be found keep the message in the sheet', async ({ page }) => {
      const fake = makeFakePostern();
      fake.autoReply = {
        status: 'answered',
        answer: {
          verdict: 'some-to-fix',
          focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
          note: 'Nearly there: one word to say again.',
        },
      };
      await routePostern(page, fake);
      await honestMic(page);
      await openUnlocked(page);
      await page.route('**/data/frequency.json', (route) => route.abort());
      await page.goto('/');
      await page.getByRole('button', { name: 'Greek', exact: true }).click();
      await chooseAction(page, 28, 'Read it aloud');
      const panel = page.getByRole('region', { name: 'Reading check' });
      const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
      await holdFor(page, bar, 2800);
      await expect(panel).toContainText('Words to fix');
      await holdFor(page, bar, 2800);
      await panel.getByRole('button', { name: 'Drill this sound', exact: true }).click();
      const drill = page.getByRole('dialog', { name: 'Reading drill' });
      await expect(drill.getByRole('alert')).toContainText('Could not find words');
      await expectFailureShown(drill, ['Done'], 'Reading drill');
      await shot(page, `sheet-alert-drill-${size.name}`);
    });
  });
}
