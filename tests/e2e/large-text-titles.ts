// tests/e2e/large-text-titles.ts — the ways into the drill and check screens, the Goal screen, the Hebrew guide and the Ask for another approach sheet, for
// tests/e2e/large-text.spec.ts (mw-cwf538.10): screens whose header holds an idea's title or a line of words that a phone at 200% text has no room to write on one line.
import { expect, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { honestSpeech } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]): Promise<void> {
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

/** The Goal screen on `goal`, with the marks the goal builds on already solid, so the ideas above them are the ones in its lists. */
export async function openGoal(page: Page, goal: string, options: { pen?: boolean } = {}): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeAttached();
  await put(page, 'settings', [{ key: 'goal', value: goal }, ...(options.pen ? [{ key: 'penSeen', value: 'yes' }] : [])]);
  await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
  await page.goto('/#/goal');
  // the app reads what was put in its store behind its back only when it starts
  await page.reload();
  await expect(page.getByTestId('goal-title')).toBeAttached();
}

/** The idea sheet of the idea named `name`, opened from the Goal screen's list of ideas. */
export async function openIdea(page: Page, goal: string, name: string): Promise<Locator> {
  await openGoal(page, goal);
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name, exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  return idea;
}

/** Drill it, from the idea sheet of `name`. */
export async function openDrillIt(page: Page, name: string): Promise<Locator> {
  const idea = await openIdea(page, 'Romans 8', name);
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  return drill;
}

/** The letter drill, started by sliding The Greek alphabet to Learning. */
export async function openLetterDrill(page: Page): Promise<Locator> {
  const idea = await openIdea(page, '1 John 1', 'The Greek alphabet');
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await idea.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  const drill = page.getByRole('dialog', { name: 'Letter drill' });
  await expect(drill.getByTestId('letter-drill-step')).toBeVisible();
  return drill;
}

/** Write it, from About omicron on The Greek alphabet's sheet, with the pen already seen. */
export async function openWriteIt(page: Page): Promise<Locator> {
  await openGoal(page, '1 John 1:1', { pen: true });
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  await page.getByRole('button', { name: 'About omicron' }).click();
  const part = page.getByRole('dialog', { name: 'Idea', exact: true }).nth(1).getByTestId('lesson-write-it');
  await part.scrollIntoViewIfNeeded();
  await part.getByRole('button', { name: 'Write it', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Write it' });
  await expect(card.getByTestId('write-it')).toBeVisible();
  return card;
}

/** A Drill it run on The noun that left a plan: the run is answered with the first answer each time, so most runs miss something; it runs again until one does. Leaves the
 * result up with 'Start the first drill'. */
export async function drillToPlan(page: Page): Promise<Locator> {
  const idea = await openIdea(page, '1 John 1', 'The noun');
  for (let run = 0; run < 8; run += 1) {
    await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
    const drill = page.getByRole('dialog', { name: 'Drill it' });
    await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
    for (;;) {
      await drill.locator('[data-option]:not(:disabled)').first().click();
      await expect(drill.getByTestId('drill-next')).toBeVisible();
      const last = (await drill.getByTestId('drill-next').textContent()) === 'Finish';
      await drill.getByTestId('drill-next').click();
      if (last) break;
    }
    await expect(drill.getByTestId('drill-result')).toBeVisible();
    if (await drill.getByRole('button', { name: 'Start the first drill' }).count()) return drill;
    await drill.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(drill).toHaveCount(0);
  }
  throw new Error('eight Drill it runs left no plan');
}

/** The short drill of a plan's first facet. */
export async function openShortDrill(page: Page): Promise<Locator> {
  const drill = await drillToPlan(page);
  await drill.getByRole('button', { name: 'Start the first drill' }).click();
  const short = page.getByRole('dialog', { name: 'Short drill' });
  await expect(short.getByTestId('plan-drill-step')).toBeVisible();
  return short;
}

/** The Goal screen with a drill plan open (Your drill plans) and the Words list open. */
export async function openGoalLists(page: Page): Promise<void> {
  const drill = await drillToPlan(page);
  await drill.getByRole('button', { name: 'Done', exact: true }).click();
  await page.goto('/#/goal');
  await expect(page.getByRole('region', { name: 'Drill plans' })).toBeVisible();
  await page.getByTestId('words-bar').click();
  await expect(page.getByTestId('words-list').locator('[data-lemma]').first()).toBeVisible();
}

/** The Try it sheet of The genitive case, on the easiest verse of 1 John 1 that has a form of it. */
export async function openTryIt(page: Page): Promise<Locator> {
  const idea = await openIdea(page, '1 John 1', 'The genitive case');
  await idea.getByRole('button', { name: 'Try it on a verse' }).click();
  const sheet = page.getByRole('dialog', { name: 'Try it' });
  await expect(sheet.getByTestId('try-it-step')).toBeVisible();
  return sheet;
}

/** The lesson strip under the heading of a passage lesson in the Verse view. */
export async function openLessonStrip(page: Page): Promise<Locator> {
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1&p=1&pt=4&view=english&weave=off');
  const strip = page.getByRole('region', { name: 'Lesson strip' });
  await expect(strip).toBeVisible();
  return strip;
}

/** The Check sheet of that lesson. */
export async function openCheck(page: Page): Promise<Locator> {
  const strip = await openLessonStrip(page);
  await strip.getByRole('button', { name: 'Check', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Check', exact: true });
  await expect(sheet.getByTestId('check-step')).toBeVisible();
  return sheet;
}

/** The Hebrew guide: a tap on the Hebrew word of the tutor's answer, with a Hebrew voice on the phone. */
export async function openHebrewGuide(page: Page): Promise<Locator> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: "Paul's word for righteousness echoes the Hebrew צֶדֶק (tsedeq), which is about being in the right before God.", words: [] } };
  await routePostern(page, fake);
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does righteousness come from?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn] [lang="he"]')).toHaveCount(1);
  await sheet.locator('[data-turn] button:has([lang="he"])').click();
  const guide = page.getByRole('dialog', { name: 'How to say it' });
  await expect(guide).toBeVisible();
  return guide;
}

/** A PNG a page can draw: a 64 x 64 square. */
async function smallPicture(page: Page, shade: number): Promise<Buffer> {
  const url = await page.evaluate((s) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.fillStyle = `hsl(${s}, 70%, 50%)`;
    context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png');
  }, shade);
  return Buffer.from(url.split(',')[1], 'base64');
}

/** The Ask for another approach sheet from Settings, with two pictures added. */
export async function openAskApproach(page: Page): Promise<Locator> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings?group=greek');
  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Add a screenshot or photo').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: await smallPicture(page, 10) },
    { name: 'two.png', mimeType: 'image/png', buffer: await smallPicture(page, 200) },
  ]);
  await expect(sheet.locator('[data-picture]')).toHaveCount(2);
  return sheet;
}

/** The Share to Lampas sheet on shared words, with three past talks to place them in and the list Choose a talk open. */
export async function openShare(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  const now = Date.now();
  await page.evaluate(
    ([at]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(['shares', 'talks'], 'readwrite');
          tx.objectStore('shares').add({ id: 'wide', createdAt: at, text: 'Paul writes in Rom 8:28-30 and 1 John 1:1', files: [] });
          for (let i = 1; i <= 3; i += 1) {
            tx.objectStore('talks').add({ ref: `rom.8.${i}`, q: `What does the word in verse ${i} mean for someone who has only just begun to read?`, a: 'An answer.', words: [], when: at - i * 3_600_000 });
          }
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [now] as const,
  );
  await page.goto('/#/share?s=wide');
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Choose a talk' }).click();
  await expect(sheet.getByRole('list', { name: 'Recent talks' })).toBeVisible();
  return sheet;
}
