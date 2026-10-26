// The Reader's header in Android split-screen (mw-5r3p30.768): a 390 x 844 phone cut to a third, a half and two thirds of its height, and turned
// sideways cut to the same shares of its width. At each size, Colossians 3 in Weave has no two header controls on top of each other, nothing of the
// header outside the window, the verse text at least 40% of the window's height, and no empty band between the header and the first section heading.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES: { name: string; width: number; height: number; hide?: string }[] = [
  { name: 'portrait-third', width: 390, height: 260 },
  { name: 'portrait-half', width: 390, height: 400 },
  { name: 'portrait-two-thirds', width: 390, height: 540 },
  { name: 'landscape-third', width: 280, height: 390 },
  { name: 'landscape-half', width: 420, height: 390 },
  { name: 'landscape-two-thirds', width: 560, height: 390 },
  // his own window (the picture of the bug): his phone's font is narrower than the test browser's, so its chips (Today, Goal and the count) took 320 px of the
  // 390; here the New chip and the count are hidden so that the chips are as narrow, and the row is shorter than the window
  { name: 'his-window-narrow-chips', width: 390, height: 380, hide: '[data-testid="new-words"], [data-testid="weave-count"]' },
];

interface Box {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Every control of the Reader's header and its chips row, and the round Ask button, by name and box, as drawn now. The chips are cut to the row they scroll in. */
async function controls(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const boxes: Box[] = [];
    const rect = (el: Element) => el.getBoundingClientRect();
    const name = (el: Element) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName;
    const header = document.querySelector('[data-reader-top] > header');
    for (const el of header?.querySelectorAll('button') ?? []) {
      const r = rect(el);
      if (r.width > 0 && r.height > 0) boxes.push({ name: `header: ${name(el)}`, x: r.x, y: r.y, width: r.width, height: r.height });
    }
    const row = document.querySelector('[data-testid="reader-chips"]');
    if (row) {
      const clip = rect(row);
      for (const el of row.querySelectorAll('button, [data-testid="weave-count"]')) {
        const r = rect(el);
        const x = Math.max(r.x, clip.x);
        const right = Math.min(r.right, clip.right);
        if (right - x > 0) boxes.push({ name: `chip: ${name(el)}`, x, y: r.y, width: right - x, height: r.height });
      }
    }
    // the round Ask button floats over the screen and must not cover the chips either
    const ask = document.querySelector('[data-ask-tutor]');
    if (ask) {
      const r = rect(ask);
      boxes.push({ name: 'the round Ask button', x: r.x, y: r.y, width: r.width, height: r.height });
    }
    return boxes;
  });
}

const within = (box: Box, size: { width: number; height: number }) =>
  box.x >= -0.5 && box.y >= -0.5 && box.x + box.width <= size.width + 0.5 && box.y + box.height <= size.height + 0.5;

const apart = (a: Box, b: Box) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;

/** Gives the phone a Goal (his had one: its chip is the widest of the row), through raw IndexedDB as the app wrote it. */
async function giveGoal(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value: '1 John 1:1' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

for (const size of SIZES) {
  test(`the Reader's header overlaps nothing and leaves the text its room at ${size.width} x ${size.height} (${size.name})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openUnlocked(page);
    await page.goto('/#/?b=col&c=3&weave=solid');
    await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
    await giveGoal(page);
    await page.reload();
    await expect(page.getByTestId('goal-strip')).toBeVisible();
    await expect(page.getByTestId('today-chip')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Weave', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (size.hide) await page.addStyleTag({ content: `${size.hide} { display: none !important; }` });
    const heading = page.locator('[data-heading] button').first();
    await expect(heading).toBeVisible();

    await shot(page, `split-screen-header-${size.name}`);
    const boxes = await controls(page);
    expect(boxes.length).toBeGreaterThan(4);
    for (const box of boxes) expect(within(box, size), `${box.name} is inside the window`).toBe(true);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) expect(apart(boxes[i], boxes[j]), `${boxes[i].name} and ${boxes[j].name} do not overlap`).toBe(true);
    }

    // the verse text gets at least 40% of the window's height; in a window under 300 px tall the Talk bar and its 48 px bottom inset are whole at the foot (mw-5r3p30.773:
    // before, the box kept 136 px by its end padding and pushed the bar out of the window), so the 91 px header and the 121 px bar leave the text a 48 px box
    const text = await page.locator('main[data-reader]').boundingBox();
    if (size.height < 300) expect(text!.height, 'the verse text box in a window under 300 px tall').toBeGreaterThanOrEqual(48);
    else expect(text!.height / size.height, 'the verse text box as a share of the window').toBeGreaterThanOrEqual(0.4);

    // no empty band: the first section heading's box starts under 24 px below the lowest control of the header
    const lowest = Math.max(...boxes.map((box) => box.y + box.height));
    const headingTop = (await heading.boundingBox())!.y;
    expect(headingTop - lowest, 'the gap between the last control and the section heading').toBeLessThan(24);

  });
}

// The screens that draw the shared ScreenHeader (src/ScreenHeader.tsx: back, title, action) get the same check at the same six sizes: no two controls of the header
// overlap and none is outside the window. The walk of everything else on these screens is mw-5r3p30.769.
const SCREENS = [
  'words', 'import', 'test', 'drill', 'review', 'today', 'paradigms', 'placement', 'goal', 'path', 'ipa', 'diagram-lesson', 'sounds', 'studyway', 'aboutyou', 'memory', 'requests',
  'conversations', 'askmore', 'about', 'preface', 'essay', 'library', 'lists', 'memorize', 'settings', 'share',
];

/** The buttons and links of the screen's own header (the first header on the page), by name and box. */
async function headerControls(page: Page): Promise<Box[] | null> {
  return page.evaluate(() => {
    const header = document.querySelector('#root header');
    if (!header) return null;
    const boxes: Box[] = [];
    for (const el of header.querySelectorAll('button, a, [role="button"], input')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) boxes.push({ name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName, x: r.x, y: r.y, width: r.width, height: r.height });
    }
    return boxes;
  });
}

for (const size of SIZES.filter((one) => !one.hide)) {
  test(`the shared screen header overlaps nothing on any screen at ${size.width} x ${size.height} (${size.name})`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openUnlocked(page);
    let seen = 0;
    for (const route of SCREENS) {
      await page.goto(`/#/${route}`);
      await page.locator('#root header').first().waitFor().catch(() => undefined);
      const boxes = await headerControls(page);
      if (!boxes) continue;
      seen += 1;
      for (const box of boxes) expect(within(box, size), `${route}: ${box.name} is inside the window`).toBe(true);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) expect(apart(boxes[i], boxes[j]), `${route}: ${boxes[i].name} and ${boxes[j].name} do not overlap`).toBe(true);
      }
    }
    expect(seen, 'screens with a header found').toBeGreaterThanOrEqual(20);
  });
}
