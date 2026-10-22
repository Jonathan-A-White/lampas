// tests/e2e/talk-picture-viewer.spec.ts — a picture in a talk opens in pwa-kit's shared viewer, on top (mw-t49ebj.2). The viewer is a modal <dialog> on the browser's top layer,
// so no screen's z-index covers it: from the Reader's Ask the tutor, and from Drill it (a full-screen dialog at z-40) with the tutor's sheet open over it. The proof is a real hit
// test: the element at the viewport's centre is the viewer's picture. Back closes the viewer and leaves the Talk sheet and Drill it as they were.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { pictureInput, talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 } });

const ENTRY = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');

// a fixed Math.random gives Drill it the same questions each time (src/data/grammar/drillSeed.ts)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.37;
  });
});

async function routeTutor(page: Page): Promise<void> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
}

/** Attaches a picture, sends it, and gives back his turn's thumbnail. */
async function sendPicture(sheet: Locator): Promise<Locator> {
  await pictureInput(sheet).setInputFiles({ name: 'lexicon-entry.png', mimeType: 'image/png', buffer: ENTRY });
  await expect(sheet.getByRole('group', { name: 'Pictures to send' }).getByRole('img', { name: 'lexicon-entry.png' })).toBeVisible();
  await (await talkField(sheet)).fill('What does this entry say?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const thumb = sheet.locator('[data-turn]').getByRole('button', { name: 'Picture 1', exact: true });
  await expect(thumb).toBeVisible();
  return thumb;
}

/** The element at the viewport's centre, as the browser hit-tests it: is it the open picture viewer's picture, and what is it? */
async function atCentre(page: Page): Promise<{ tag: string; dialog: string | null; src: string | null }> {
  return page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const dialog = el?.closest('dialog, [role="dialog"]');
    return { tag: el?.tagName ?? '', dialog: dialog?.getAttribute('aria-label') ?? null, src: el instanceof HTMLImageElement ? el.src : null };
  });
}

/** The tap on a thumbnail opens the viewer on top: its picture is what the viewport's centre hits, and it is the thumbnail's picture. */
async function expectViewerOnTop(page: Page, thumb: Locator): Promise<void> {
  const thumbSrc = await thumb.locator('img').getAttribute('src');
  await thumb.click();
  const viewer = page.getByRole('dialog', { name: 'Picture 1', exact: true });
  await expect(viewer).toBeVisible();
  await expect.poll(() => atCentre(page)).toEqual({ tag: 'IMG', dialog: 'Picture 1', src: thumbSrc });
}

test('from the Reader, a picture in the talk opens in the shared viewer, on top, and Back closes it', async ({ page }) => {
  await routeTutor(page);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  const thumb = await sendPicture(sheet);

  await expectViewerOnTop(page, thumb);
  await shot(page, 'talk-picture-viewer-reader');
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Picture 1', exact: true })).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await expect(thumb).toBeVisible();
});

/** The idea sheet of The noun, from the Goal screen, and Drill it from there. */
async function openDrill(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(['settings', 'grammarLevels'], 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value: '1 John 1' });
          for (const id of ['breathings', 'accents', 'iota-subscript']) tx.objectStore('grammarLevels').put({ id, level: 'solid', since: Date.now(), how: 'placement' });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it', exact: true });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  return drill;
}

/** Drill it answered to its results, and the tutor's sheet opened over it from the results' Ask the tutor button. */
async function openDrillTalk(page: Page): Promise<{ drill: Locator; sheet: Locator }> {
  const drill = await openDrill(page);
  // answer until the run ends, to the results, where the Ask the tutor button stands
  for (let question = 0; question < 20; question++) {
    await drill.locator('[data-option]').first().click();
    const next = drill.getByTestId('drill-next');
    await expect(next).toBeVisible();
    const last = ((await next.textContent()) ?? '').trim() === 'Finish';
    await next.click();
    if (last) break;
  }
  await expect(drill.getByTestId('drill-result')).toBeVisible();
  await drill.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Drill it', exact: true });
  await expect(sheet).toBeVisible();
  return { drill, sheet };
}

test('from Drill it, a picture in the talk opens in the shared viewer, on top of Drill it, and Back closes it', async ({ page }) => {
  await routeTutor(page);
  const { drill, sheet } = await openDrillTalk(page);
  const thumb = await sendPicture(sheet);

  await expectViewerOnTop(page, thumb);
  await shot(page, 'talk-picture-viewer-drill');
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Picture 1', exact: true })).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await expect(thumb).toBeVisible();
  await expect(drill).toBeVisible();
  await expect(drill.getByTestId('drill-result')).toBeVisible();
});

// The sweep of mw-t49ebj.2: a sheet drawn into document.body (createPortal) at a z-index under Drill it's z-40 opens behind it when the tutor's sheet over Drill it opens it.
test("from Drill it, the Hebrew word's guide opens on top of Drill it", async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'The Hebrew צֶדֶק (tsedeq) is about being in the right.', words: [] } };
  await routePostern(page, fake);
  const { sheet } = await openDrillTalk(page);
  await (await talkField(sheet)).fill('What is the Hebrew behind righteousness?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.locator('[data-turn] button:has([lang="he"])').click();
  const guide = page.getByRole('dialog', { name: 'How to say it' });
  await expect(guide).toBeVisible();
  const box = (await guide.boundingBox())!;
  const hit = () => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[role="dialog"]')?.getAttribute('aria-labelledby') ?? null, [box.x + box.width / 2, box.y + box.height / 2]);
  const labelled = await guide.getAttribute('aria-labelledby');
  await expect.poll(hit).toBe(labelled);
});
