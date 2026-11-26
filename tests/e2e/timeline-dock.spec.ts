import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { EXCLUDED_RULES } from '../support/axe-excluded';
import { drag, pageTime, swipe, type Point } from '../support/gesture';
import { pauseNow } from '../support/hold';
import { TWO_FINGERS } from '../support/two-finger';
import { asInstalledApp } from './installed';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

// The timeline in the Reader's split (mw-fnvjof.17.317.2, docs/timeline-design.md 'For the build stories'): the Verse view's Split sheet offers Timeline beside the texts and the map; chosen, it
// docks a strip under the passage that opens at the chapter's time with the chapter's events and people marked; a drag left and right moves through time and lets go into a glide, a pinch
// or the buttons zoom, Whole Bible flies out and back; the credit line shows and 'Timeline at Bible Mapper' is reached by scrolling the dock; the setting splitTimeline brings it back on
// a reload. A phone-width layout claim: 390x844, with touch. The strip times the finger and its own motion by the page's clock (performance.now), so the clock is installed, a drag is
// tests/support/gesture.ts's (which runs the clock while the finger is down) and what a let-go starts is run with pageTime, never waited for on the host's clock.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Isaiah 1's years on the strip's axis (1 BC is 0): the prophecies run from 759 BC for 62 years. */
const CHAPTER = { a: -758, b: -696 };
const STRIP_FULL = 282;
const STRIP_MIN = 106;
const HANDLE_ROW = 44;

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string | number>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

/** What the store holds under a key, as the app wrote it. */
const kept = (page: Page, key: string) =>
  page.evaluate(
    (k) =>
      new Promise<string | undefined>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('settings').objectStore('settings').get(k);
          req.onsuccess = () => {
            db.close();
            resolve((req.result as { value: string } | undefined)?.value);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    key,
  );

const dock = (page: Page) => page.locator('[data-dock]');
const strip = (page: Page) => page.locator('[data-timeline-strip]');
const wholeBible = (page: Page) => page.locator('[data-dock-handle]').getByRole('button', { name: 'Whole Bible', exact: true });

interface Stands {
  /** the place at the strip's middle, on its axis, and the px a year takes */
  c: number;
  k: number;
  /** the frames the strip has drawn */
  frames: number;
  width: number;
  home: { c: number; k: number } | null;
  deal: { events: number; people: number };
}
/** Where the strip stands, read from the strip itself (src/timeline/strip.ts puts the mounted strip on its element). */
const stands = (page: Page): Promise<Stands> =>
  page.evaluate(() => {
    const el = document.querySelector('[data-timeline-strip]') as (HTMLElement & { timeline?: { view: { c: number; k: number }; home: { c: number; k: number } | null; width: number; deal: { events: number; people: number }; stats: { frames: number } } }) | null;
    const t = el?.timeline;
    if (!t) throw new Error('no strip is mounted');
    return { c: t.view.c, k: t.view.k, frames: t.stats.frames, width: t.width, home: t.home ? { ...t.home } : null, deal: { ...t.deal } };
  });
/** How far `now` stands from `from`, in px of `from`'s zoom: later is positive. */
const px = (now: { c: number }, from: { c: number; k: number }) => (now.c - from.c) * from.k;

/** The Reader on a chapter with the timeline already docked (the settings as the app keeps them), every book's file read. */
async function openDocked(page: Page, { at = 'b=isa&c=1', verse = 1, settings = {} }: { at?: string; verse?: number; settings?: Record<string, string | number> } = {}) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readerSplit: 'on', splitTimeline: 'on', ...settings });
  await page.goto(`/#/?${at}`);
  await page.reload();
  await expect(page.locator(`[data-verse="${verse}"]`).first()).toBeVisible();
  await expect(strip(page)).toHaveAttribute('data-timeline-loaded', '');
  // the lanes ease into place as the other books arrive: the page's clock is run until they have
  await pageTime(page, 1000);
}

/** Two fingers (touch input to the browser) moved together from `from` to `to`, inside zero time on the page's clock: a pinch has no speed to read. */
async function pinch(page: Page, from: [Point, Point], to: [Point, Point], steps = 6) {
  const cdp = await page.context().newCDPSession(page);
  const at = (t: number) => from.map((p, i) => ({ x: p[0] + (to[i][0] - p[0]) * t, y: p[1] + (to[i][1] - p[1]) * t, id: i }));
  await pauseNow(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    for (let i = 1; i <= steps; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / steps) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await page.clock.resume();
    await cdp.detach();
  }
}

test("Split on Isaiah 1:1 offers Timeline beside the texts and the map; chosen, it docks a strip at Half that opens at the chapter's time, and a reload keeps it", async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=isa&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeAttached();
  const view = await openVerseView(page, 1);
  await view.getByRole('group', { name: 'Tools' }).getByRole('button', { name: 'Split', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Beside Isaiah 1' });
  await expect(sheet.getByRole('button', { name: /^Hebrew/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^English\s*Berean Standard Bible$/ })).toBeVisible();
  const row = sheet.getByRole('button', { name: /^Timeline\s*Events and lives by date, from Theographic$/ });
  await expect(row).toBeVisible();
  // after the texts; a map, where the chapter has one, stays last
  const rows = await sheet.locator('[data-split-text]').evaluateAll((els) => els.map((el) => el.getAttribute('data-split-text')));
  expect(rows.slice(0, rows.indexOf('timeline') + 1)).toEqual(['hebrew', 'english', 'timeline']);
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await shot(page, 'timeline-dock-chooser');
  await row.click();
  await expect(sheet).toBeHidden();
  await expect(view).toBeHidden();
  await expect(strip(page)).toHaveAttribute('data-timeline-loaded', '');
  await pageTime(page, 1000);

  // the handle row: Timeline, Whole Bible (not pressed), Close
  const handle = page.locator('[data-dock-handle]');
  await expect(handle.locator('[data-dock-title]')).toHaveText('Timeline');
  await expect(wholeBible(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(handle.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  // at Half, the strip its five lanes tall with the credit line under it
  const reader = (await page.locator('[data-reader-box]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(Math.abs(at.height - reader.height / 2)).toBeLessThanOrEqual(1);
  const box = (await strip(page).boundingBox())!;
  expect(box.height).toBe(STRIP_FULL);
  expect(box.width).toBe(390);
  const credit = page.locator('[data-timeline-credit]');
  await expect(credit).toHaveText('Theographic Bible Metadata, Robert Rouse, CC BY-SA 4.0; traditional dating (Floyd Nolen Jones, after Ussher)');
  expect(Math.abs((await credit.boundingBox())!.y - (box.y + box.height))).toBeLessThanOrEqual(1);
  await expect(credit).toBeInViewport();

  // the chapter's column takes 62% of the width, in the middle
  const now = await stands(page);
  const left = (CHAPTER.a - now.c) * now.k + now.width / 2;
  const right = (CHAPTER.b - now.c) * now.k + now.width / 2;
  expect(Math.abs(right - left - 0.62 * 390)).toBeLessThanOrEqual(2);
  expect(Math.abs((left + right) / 2 - 195)).toBeLessThanOrEqual(2);
  // two lanes of events over the ruler, three of lives under it
  expect(now.deal).toEqual({ events: 2, people: 3 });

  // the chapter's event and its four kings each have a button over the picture, a thumb tall and wide
  for (const name of [/^Prophecies of Isaiah, about 759 to 697 BC$/, /^Uzziah, about 827 to 758 BC$/, /^Jotham, about 784 to 742 BC$/, /^Ahaz, about 763 to 726 BC$/, /^Hezekiah, about 752 to 697 BC$/]) {
    const mark = strip(page).getByRole('button', { name });
    await expect(mark).toBeVisible();
    const target = (await mark.boundingBox())!;
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.width).toBeGreaterThanOrEqual(44);
  }
  await expect(strip(page)).toHaveAccessibleDescription('778 to 678 BC, Isaiah 1');
  await shot(page, 'timeline-dock-isaiah-1');

  // that the dock holds the timeline is kept, and a reload brings it back at the chapter's time
  expect(await kept(page, 'splitTimeline')).toBe('on');
  await page.reload();
  await expect(strip(page)).toHaveAttribute('data-timeline-loaded', '');
  await expect(handle.locator('[data-dock-title]')).toHaveText('Timeline');
  const again = await stands(page);
  expect(Math.abs(px(again, now))).toBeLessThan(1);
  expect(again.k).toBeCloseTo(now.k, 6);
});

test("a drag of 80 px moves the strip 72 px and stays; a slow drag of 20 px settles back on the chapter; a fling glides on and comes to rest; the chapter's name at the side flies back", async ({ page }) => {
  await openDocked(page);
  const box = (await strip(page).boundingBox())!;
  const y = box.y + 30;
  const home = await stands(page);

  // 20 px, slowly: 12 px from the chapter is under the snap's 28, so it settles back on it
  await drag(page, [200, y], [180, y], { steps: 4, ms: 1200 });
  await pageTime(page, 600);
  expect(Math.abs(px(await stands(page), home))).toBeLessThan(1);

  // 80 px, slowly (0.03 px/ms is no fling): time moves one to one from the 8th px, and stays where it was left
  await drag(page, [200, y], [120, y], { steps: 8, ms: 2400 });
  await pageTime(page, 600);
  const left = await stands(page);
  expect(Math.abs(px(left, home) - 72)).toBeLessThanOrEqual(1);
  await pageTime(page, 1000);
  expect(Math.abs(px(await stands(page), left))).toBeLessThan(0.5);
  // the buttons over the picture are back at rest
  await expect(page.locator('[data-timeline-hits]')).toBeVisible();
  await strip(page).press('Home');
  await pageTime(page, 1000);
  expect(Math.abs(px(await stands(page), home))).toBeLessThan(1);

  // a fling at 1 px/ms: the strip goes on after the finger lifts, about 325 px, and comes to rest
  let letGo = home;
  await drag(page, [300, y], [200, y], {
    steps: 5,
    ms: 100,
    whileDown: async () => {
      letGo = await stands(page);
    },
  });
  expect(Math.abs(px(letGo, home) - 92)).toBeLessThanOrEqual(1);
  await pageTime(page, 4000);
  const rest = await stands(page);
  expect(px(rest, letGo)).toBeGreaterThan(250);
  expect(px(rest, letGo)).toBeLessThan(400);
  const frames = rest.frames;
  await pageTime(page, 2000);
  expect((await stands(page)).frames).toBe(frames);

  // the chapter's years are out of view at the left: its name stands there and flies back
  const chip = strip(page).getByRole('button', { name: '‹ Isaiah 1', exact: true });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-timeline-home', 'left');
  expect((await chip.boundingBox())!.x).toBeLessThan(60);
  await shot(page, 'timeline-dock-away');
  await chip.click();
  await pageTime(page, 1000);
  expect(Math.abs(px(await stands(page), home))).toBeLessThan(1);
  await expect(chip).toHaveCount(0);
  await expect(strip(page)).toHaveAccessibleDescription('778 to 678 BC, Isaiah 1');
});

test('a pinch of two fingers zooms about the place between them; Zoom in and Zoom out double and halve; Whole Bible flies out, is pressed, and pressed again flies back to where he was', async ({ page }) => {
  await openDocked(page);
  const box = (await strip(page).boundingBox())!;
  const y = box.y + 30;
  const home = await stands(page);

  // the fingers spread from 90 px apart to 210 about the strip's middle: the zoom follows their spread, and the place between them stays under them
  await pinch(page, [[150, y], [240, y]], [[90, y], [300, y]]);
  await pageTime(page, 600);
  const pinched = await stands(page);
  expect(Math.abs(pinched.k / home.k - 210 / 90)).toBeLessThan(0.15);
  expect(Math.abs(px(pinched, home))).toBeLessThan(4);
  // the pinch is not the Immersive reader's two-finger tap, and it turns no chapter
  await expect(page.getByRole('heading', { name: 'Isaiah 1', level: 1 })).toBeVisible();
  await strip(page).press('Home');
  await pageTime(page, 1000);

  const zoomIn = strip(page).getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOut = strip(page).getByRole('button', { name: 'Zoom out', exact: true });
  for (const button of [zoomIn, zoomOut]) {
    await expect(button).toHaveAttribute('data-repeat');
    const target = (await button.boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  await zoomIn.click();
  await pageTime(page, 500);
  const closer = await stands(page);
  expect(Math.abs(closer.k / home.k - 2)).toBeLessThan(0.01);
  expect(Math.abs(px(closer, home))).toBeLessThan(1);
  await zoomOut.click();
  await pageTime(page, 500);
  expect(Math.abs((await stands(page)).k / home.k - 1)).toBeLessThan(0.01);

  // moved 72 px from the chapter, then out to the whole Bible and back: to where he was, not to the chapter
  await drag(page, [200, y], [120, y], { steps: 8, ms: 2400 });
  await pageTime(page, 600);
  const was = await stands(page);
  await wholeBible(page).click();
  await pageTime(page, 1000);
  const out = await stands(page);
  expect(out.k).toBeLessThan(home.k / 20);
  await expect(wholeBible(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(strip(page)).toHaveAccessibleDescription('4004 BC to AD 100');
  await expect(zoomOut).toHaveAttribute('aria-disabled', 'true');
  await shot(page, 'timeline-dock-whole-bible');
  await wholeBible(page).click();
  await pageTime(page, 1000);
  const back = await stands(page);
  expect(Math.abs(back.k / was.k - 1)).toBeLessThan(0.01);
  expect(Math.abs(px(back, was))).toBeLessThan(1);
  await expect(wholeBible(page)).toHaveAttribute('aria-pressed', 'false');
});

test("a drag up the strip scrolls the dock's body to the credit and 'Timeline at Bible Mapper', whose address carries the year in the middle of the strip; a drag on the strip never turns the chapter", async ({ page }) => {
  await openDocked(page);
  const box = (await strip(page).boundingBox())!;
  const home = await stands(page);
  const body = page.locator('[data-dock-body]');
  const link = dock(page).getByRole('link', { name: 'Timeline at Bible Mapper', exact: true });
  await expect(link).toHaveAttribute('href', 'https://biblemapper.com/timeline/?date=-728');
  await expect(link).toHaveAttribute('target', '_blank');

  // a long drag left on the strip moves time; the chapter above stays Isaiah 1 (the chapter swipe is the passage's)
  // (from 290 px: the tutor's floating ? stands over the strip's top right corner, and a drag that began on it would be the button's own)
  await drag(page, [290, box.y + 30], [30, box.y + 30], { steps: 6, ms: 300 });
  await pageTime(page, 4000);
  const moved = await stands(page);
  expect(px(moved, home)).toBeGreaterThan(250);
  await expect(page.getByRole('heading', { name: 'Isaiah 1', level: 1 })).toBeVisible();
  // the link follows the strip: the year now in its middle
  const year = Number(new URL((await link.getAttribute('href'))!).searchParams.get('date'));
  expect(year).toBeGreaterThan(-728);
  expect(year).toBeLessThan(-400);

  // up and down are the page's: the body scrolls (the browser takes the finger for its own scroll), and no time moves
  await swipe(page, [195, box.y + 200], [195, box.y + 60], { with: 'touch', restMs: 80 });
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(20);
  expect(Math.abs(px(await stands(page), moved))).toBeLessThan(0.5);
  await expect(page.locator('[data-timeline-credit]')).toBeInViewport({ ratio: 1 });
  await expect(link).toBeInViewport({ ratio: 1 });
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await shot(page, 'timeline-dock-credit');
});

test('under reduced motion a let-go does not glide and Whole Bible arrives at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDocked(page);
  const box = (await strip(page).boundingBox())!;
  const y = box.y + 30;
  const home = await stands(page);
  let letGo = home;
  await drag(page, [300, y], [200, y], {
    steps: 5,
    ms: 100,
    whileDown: async () => {
      letGo = await stands(page);
    },
  });
  await pageTime(page, 2000);
  // the same finger that glided 325 px on with motion on leaves the strip where it let go
  expect(Math.abs(px(await stands(page), letGo))).toBeLessThan(0.5);
  expect(Math.abs(px(letGo, home) - 92)).toBeLessThanOrEqual(1);

  // the page's clock stands still: the whole Bible is in the width with no time having passed
  await pauseNow(page);
  await wholeBible(page).click();
  await expect(wholeBible(page)).toHaveAttribute('aria-pressed', 'true');
  expect((await stands(page)).k).toBeLessThan(home.k / 20);
  await page.clock.resume();
});

test('the dock pulled to its smallest keeps the least strip: the name, one lane and the ruler', async ({ page }) => {
  // a kept share under the smallest size rests at the smallest (src/reader/split/splitSize.ts): the handle row and STRIP_MIN
  await openDocked(page, { settings: { splitSize: 0.05 } });
  expect((await dock(page).boundingBox())!.height).toBe(HANDLE_ROW + STRIP_MIN);
  expect((await strip(page).boundingBox())!.height).toBe(STRIP_MIN);
  expect((await stands(page)).deal).toEqual({ events: 1, people: 0 });
  await expect(strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ })).toBeVisible();
  await expect(strip(page).getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
  await shot(page, 'timeline-dock-small');
});

test('in the installed app at Half the strip takes all the room under the handle row, and the credit and the link are one scroll down', async ({ page }) => {
  // the installed app keeps 48 px clear at the dock's foot for the phone's bar (src/layout/barFloor.ts) and the Reader's own foot is 70 px there, so at 390x844 the room under the
  // handle row at Half is 250 px (the dock's 1 px top border and a 249 px body), not the 282 of docs/timeline-design.md 'Layout': four lanes, until he pulls the dock taller
  await asInstalledApp(page);
  await openDocked(page);
  const body = page.locator('[data-dock-body]');
  const room = (await body.evaluate((el) => el.clientHeight)) + 1;
  expect(room).toBe(250);
  expect((await strip(page).boundingBox())!.height).toBe(room);
  const dealt = (await stands(page)).deal;
  expect(dealt.events + dealt.people).toBe(4);
  await expect(strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ })).toBeVisible();
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.locator('[data-timeline-credit]')).toBeInViewport({ ratio: 1 });
  await expect(dock(page).getByRole('link', { name: 'Timeline at Bible Mapper', exact: true })).toBeInViewport({ ratio: 1 });
  await shot(page, 'timeline-dock-installed');
});

test('sideways at 844x390 the dock stands at the right and the strip is the same picture in its box: the chapter\'s column 62% of the strip\'s own width, in its middle', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openDocked(page);
  await expect(dock(page)).toHaveAttribute('data-axis', 'row');
  const at = (await dock(page).boundingBox())!;
  const box = (await strip(page).boundingBox())!;
  expect(at.x).toBeGreaterThan(300);
  // the strip is as wide as the dock inside its left border
  expect(Math.abs(box.width - (at.width - 1))).toBeLessThanOrEqual(1);
  const now = await stands(page);
  expect(Math.abs(now.width - box.width)).toBeLessThanOrEqual(1);
  const left = (CHAPTER.a - now.c) * now.k + now.width / 2;
  const right = (CHAPTER.b - now.c) * now.k + now.width / 2;
  expect(Math.abs(right - left - 0.62 * now.width)).toBeLessThanOrEqual(2);
  expect(Math.abs((left + right) / 2 - now.width / 2)).toBeLessThanOrEqual(2);
  expect(now.deal.events).toBeGreaterThanOrEqual(1);
  await expect(strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ })).toBeVisible();
  await expect(strip(page).getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
  await expect(wholeBible(page)).toBeVisible();
  await shot(page, 'timeline-dock-sideways');
});

test('Luke 23 opens on its days in AD 30, five lanes of events and the ruler at the foot; 3 John, a book with no dated event, says so and shows the whole Bible', async ({ page }) => {
  await openDocked(page, { at: 'b=luk&c=23' });
  const days = await stands(page);
  // every event of Luke 23 has a day: the strip opens zoomed to days (a year is thousands of px wide), at AD 30
  expect(days.k).toBeGreaterThan(2000);
  expect(Math.floor(days.c)).toBe(30);
  expect(days.deal).toEqual({ events: 5, people: 0 });
  await expect(page.locator('[data-dock-title]')).toHaveText('Timeline');
  await expect(strip(page).locator('[data-mark^="e"]').first()).toBeVisible();
  await shot(page, 'timeline-dock-luke-23');

  await page.goto('/#/?b=3jn&c=1');
  await expect(page.locator('[data-dock-title]')).toHaveText('No dates for 3 John');
  await expect(strip(page)).toHaveAttribute('data-timeline-loaded', '');
  await expect(strip(page)).toHaveAccessibleDescription('4004 BC to AD 100');
  await expect(wholeBible(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the Immersive reader keeps its bars and its text with the timeline docked: a two-finger touch on the strip puts no bars away, the same touch on the passage does', async ({ page }) => {
  await openDocked(page, { settings: { immersiveReader: 'on', immersiveHint: 'off' } });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(page.locator('[data-away]')).toHaveCount(0);
  const box = (await strip(page).boundingBox())!;
  const twoFingers = async (points: { x: number; y: number }[]) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  };
  await twoFingers([{ x: 150, y: box.y + 100 }, { x: 240, y: box.y + 110 }]);
  await pageTime(page, 600);
  await expect(page.locator('[data-away]')).toHaveCount(0);
  await expect(strip(page)).toBeVisible();
  // on the passage the two-finger tap is still the Immersive reader's own
  const passage = (await page.locator('[data-reader]').boundingBox())!;
  await twoFingers(TWO_FINGERS.map((finger, i) => ({ x: finger.x, y: passage.y + 60 + i * 10 })));
  await expect(page.locator('[data-away]').first()).toBeAttached();
  await expect(strip(page)).toBeVisible();
});

for (const theme of ['light', 'dark', 'sepia', 'contrast'] as const) {
  test(`the strip draws from the ${theme} theme's tokens and the Reader with the timeline docked passes the axe check`, async ({ page }) => {
    await openDocked(page, { settings: { theme } });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await pageTime(page, 600);
    // the picture's ground is the theme's surface: a pixel of the strip's own top-left corner, where nothing else is drawn
    const ground = await strip(page).evaluate((el) => {
      const canvas = el.querySelector('canvas')!;
      const [r, g, b] = canvas.getContext('2d')!.getImageData(2, canvas.height - 2, 1, 1).data;
      const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
      // the build writes #ffffff as #fff
      const surface = getComputedStyle(el).getPropertyValue('--lp-surface').trim().toLowerCase().replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3');
      return { hex, surface };
    });
    expect(ground.hex).toBe(ground.surface);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules([...EXCLUDED_RULES]).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await shot(page, `timeline-dock-${theme}`);
  });
}
