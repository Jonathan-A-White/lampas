import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { EXCLUDED_RULES } from '../support/axe-excluded';
import { drag, pageTime } from '../support/gesture';
import { pauseNow } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The timeline's cards, the verse tap and the chapter turn (mw-fnvjof.17.317.3, docs/timeline-design.md 'The card' and 'For the build stories'): a tap on an event raises its card from the
// strip's foot, inside the dock (title, date with 'about' where the data has no day, length, verses, people), and the strip makes room above it, keeps the event in a lane and rings it;
// a verse chip of the open chapter brings that verse to the top of the passage, one of another chapter opens it and the strip flies to its time; turning the chapter with the strip
// dragged away flies it to the new chapter's time. The sweep of the strip's other taps: a life, the ruler where it is busy, a row of either. A phone-width layout claim: 390x844, with
// touch. The strip times its motion by the page's clock (performance.now), so the clock is installed; a flight is begun with the clock held still, seen to start where the strip stood,
// and then run with pageTime, never waited for on the host's clock.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const STRIP_FULL = 282;
const STRIP_MIN = 106;

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

const strip = (page: Page) => page.locator('[data-timeline-strip]');
const cardOf = (page: Page) => page.locator('[data-timeline-card]');
const passage = (page: Page) => page.locator('[data-reader]');

interface Stands {
  /** the place at the strip's middle, on its axis, and the px a year takes */
  c: number;
  k: number;
  frames: number;
  home: { c: number; k: number } | null;
  deal: { events: number; people: number };
  /** the mark a card is open on */
  chosen: string | null;
}
/** Where the strip stands, read from the strip itself (src/timeline/strip.ts puts the mounted strip on its element). */
const stands = (page: Page): Promise<Stands> =>
  page.evaluate(() => {
    const el = document.querySelector('[data-timeline-strip]') as (HTMLElement & { timeline?: { view: { c: number; k: number }; home: { c: number; k: number } | null; deal: { events: number; people: number }; stats: { frames: number }; chosen: string | null } }) | null;
    const t = el?.timeline;
    if (!t) throw new Error('no strip is mounted');
    return { c: t.view.c, k: t.view.k, frames: t.stats.frames, home: t.home ? { ...t.home } : null, deal: { ...t.deal }, chosen: t.chosen };
  });
/** How far `now` stands from `from`, in px of `from`'s zoom: later is positive. */
const px = (now: { c: number }, from: { c: number; k: number }) => (now.c - from.c) * from.k;

/** The Reader on a chapter with the timeline already docked (the settings as the app keeps them), every book's file read. */
async function openDocked(page: Page, { at = 'b=isa&c=1', settings = {} }: { at?: string; settings?: Record<string, string | number> } = {}) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readerSplit: 'on', splitTimeline: 'on', ...settings });
  await page.goto(`/#/?${at}`);
  await page.reload();
  await expect(page.locator('[data-verse="1"]').first()).toBeVisible();
  await expect(strip(page)).toHaveAttribute('data-timeline-loaded', '');
  // the lanes ease into place as the other books arrive: the page's clock is run until they have
  await pageTime(page, 1000);
}

const tall = async (target: Locator) => (await target.boundingBox())!.height;

/**
 * With the page's clock held still, the new chapter's strip is waited for a millisecond of that clock at a time: the Reader reads its settings on timers of no length (Dexie's live
 * queries), which a clock that never moves would never run, and the strip's flight is hundreds of ms long, so the few ms this takes leave it where it began.
 */
async function stripOf(page: Page, chapter: string) {
  await expect(page.getByRole('heading', { name: chapter, level: 1 })).toBeVisible();
  for (let ms = 0; ms < 400; ms++) {
    if (await page.evaluate(() => document.querySelector('[data-timeline-strip]')?.hasAttribute('data-timeline-loaded') ?? false)) return;
    await page.clock.runFor(1);
  }
  throw new Error(`the strip of ${chapter} did not open`);
}

/** The card has risen: it stands with its foot on the strip's (its rise is the browser's own animation, not the page's clock). */
async function risen(page: Page) {
  await expect
    .poll(async () => {
      const box = (await strip(page).boundingBox())!;
      const at = (await cardOf(page).boundingBox())!;
      return Math.abs(at.y + at.height - (box.y + box.height));
    })
    .toBeLessThanOrEqual(1);
}

/** The picture's colour at a point of the strip (px from its own corner), and the theme's accent, both as #rrggbb. */
const pixel = (page: Page, x: number, y: number) =>
  strip(page).evaluate(
    (el, at) => {
      const canvas = el.querySelector('canvas')!;
      const ratio = canvas.width / el.getBoundingClientRect().width;
      const [r, g, b] = canvas.getContext('2d')!.getImageData(Math.round(at.x * ratio), Math.round(at.y * ratio), 1, 1).data;
      const accent = getComputedStyle(el).getPropertyValue('--lp-accent').trim().toLowerCase().replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3');
      return { hex: `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`, accent };
    },
    { x, y },
  );

test("a tap on Prophecies of Isaiah raises its card: title, 'about 759 to 697 BC · 62 years', the chip Isaiah 1–66 and Isaiah in plain words; the strip keeps the event in a lane with the ring; Close and Escape shut it and the lanes come back", async ({ page }) => {
  await openDocked(page);
  const home = await stands(page);
  expect(home.deal).toEqual({ events: 2, people: 3 });
  expect(home.chosen).toBeNull();
  const mark = strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ });
  const was = (await mark.boundingBox())!;
  const box = (await strip(page).boundingBox())!;
  // above the bar's top edge, before: the chapter's soft column, not the ring
  const ringAt = (bar: { y: number; height: number }) => ({ x: 195, y: bar.y - box.y + bar.height / 2 - 14 - 3 });
  const before = await pixel(page, ringAt(was).x, ringAt(was).y);
  expect(before.hex).not.toBe(before.accent);

  await mark.click();
  const card = cardOf(page);
  await expect(card).toBeVisible();
  await pageTime(page, 600);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Prophecies of Isaiah');
  await expect(card.locator('[data-card-when]')).toHaveText('about 759 to 697 BC · 62 years');
  const chip = card.getByRole('button', { name: 'Isaiah 1–66', exact: true });
  await expect(chip).toHaveAttribute('aria-current', 'true');
  // Isaiah has no years in the data: plain words, not a button
  await expect(card.locator('[data-card-person]')).toHaveText(['Isaiah']);
  expect(await card.locator('[data-card-person]').evaluate((el) => el.tagName)).toBe('SPAN');
  const close = card.getByRole('button', { name: 'Close', exact: true });
  for (const target of [chip, close]) expect(await tall(target)).toBeGreaterThanOrEqual(44);

  // the card stands at the strip's foot, as wide as the strip, never taller than the strip less its least; here nothing in it scrolls, up and down or sideways
  await risen(page);
  const at = (await card.boundingBox())!;
  expect(at.x).toBe(0);
  expect(at.width).toBe(390);
  expect((await strip(page).boundingBox())!.height).toBe(STRIP_FULL);
  expect(at.height).toBeLessThanOrEqual(STRIP_FULL - STRIP_MIN);
  expect(await card.evaluate((el) => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);

  // the strip makes room: its lanes are dealt for the height above the card, the event keeps one, in view whole above the card, and is ringed in amber
  const now = await stands(page);
  expect(now.chosen).toBe('e217');
  expect(now.deal).toEqual({ events: 1, people: 0 });
  expect(Math.abs(px(now, home))).toBeLessThan(1);
  await expect(mark).toHaveAttribute('aria-expanded', 'true');
  const bar = (await mark.boundingBox())!;
  expect(bar.y).toBeGreaterThanOrEqual(box.y);
  expect(bar.y + bar.height).toBeLessThanOrEqual(at.y + 1);
  const ring = await pixel(page, ringAt(bar).x, ringAt(bar).y);
  expect(ring.hex).toBe(ring.accent);
  // the zoom buttons stand at the ruler's end, above the card
  const zoom = (await strip(page).getByRole('button', { name: 'Zoom in', exact: true }).boundingBox())!;
  expect(zoom.y + zoom.height).toBeLessThanOrEqual(at.y + 1);

  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules([...EXCLUDED_RULES]).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  await shot(page, 'timeline-card-event');

  // Close shuts it, the lanes come back, and the keys are the strip's again
  await close.click();
  await expect(card).toHaveCount(0);
  await pageTime(page, 600);
  const shut = await stands(page);
  expect(shut.chosen).toBeNull();
  expect(shut.deal).toEqual({ events: 2, people: 3 });
  await expect(strip(page)).toBeFocused();
  await expect(mark).toHaveAttribute('aria-expanded', 'false');
  const cleared = (await mark.boundingBox())!;
  const after = await pixel(page, ringAt(cleared).x, ringAt(cleared).y);
  expect(after.hex).not.toBe(after.accent);

  // and Escape does the same
  await mark.click();
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await pageTime(page, 600);
  expect((await stands(page)).deal).toEqual({ events: 2, people: 3 });
});

test("an event with a day reads '1 May AD 30' with no 'about' and no length; its verse chip brings Acts 1:4 to the top of the passage, and the card stays", async ({ page }) => {
  await openDocked(page, { at: 'b=act&c=1' });
  await strip(page).getByRole('button', { name: /^The Holy Spirit is promised, 1 May AD 30$/ }).click();
  const card = cardOf(page);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('The Holy Spirit is promised');
  await expect(card.locator('[data-card-when]')).toHaveText('1 May AD 30');
  // Jesus Christ has years in the data, so his name is a chip that opens his life; God and the Holy Spirit are plain words
  await expect(card.locator('[data-card-person]')).toHaveText(['Jesus Christ', 'God', 'Holy Spirit']);
  await expect(card.getByRole('button', { name: 'Jesus Christ', exact: true })).toBeVisible();
  const chip = card.getByRole('button', { name: 'Acts 1:4–5', exact: true });
  await expect(chip).toHaveAttribute('aria-current', 'true');
  await pageTime(page, 600);

  // the passage stands at its top, verse 4 lower down; the chip brings verse 4 to the top of the reading box, 8 px under its edge as every verse brought there stands
  const top = async (verse: number) => {
    const line = (await passage(page).locator(`[data-verse="${verse}"]`).first().boundingBox())!;
    return Math.round(line.y - (await passage(page).boundingBox())!.y);
  };
  expect(await passage(page).evaluate((el) => el.scrollTop)).toBe(0);
  expect(await top(4)).toBeGreaterThan(60);
  await chip.click();
  await expect(passage(page)).toHaveAttribute('data-brought-verse', '4');
  await expect.poll(() => top(4)).toBe(8);
  await expect(page.getByRole('heading', { name: 'Acts 1', level: 1 })).toBeVisible();
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('The Holy Spirit is promised');
  expect((await stands(page)).chosen).toBe('e304');
  await shot(page, 'timeline-card-verse');
});

test("a life opens the person's card, a row of it opens the event, and a verse chip of another book opens that chapter while the strip flies from where it stood to the new chapter's time", async ({ page }) => {
  await openDocked(page);
  const life = strip(page).getByRole('button', { name: /^Hezekiah, about 752 to 697 BC$/ });
  await life.click();
  const card = cardOf(page);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Hezekiah');
  await expect(card.locator('[data-card-when]')).toHaveText('about 752 to 697 BC · 55 years');
  const rows = card.locator('[data-card-row]');
  await expect(rows).toHaveText(['Reign of Hezekiah726 to 697 BC', 'Death of Hezekiah697 BC']);
  for (const row of await rows.all()) expect(await tall(row)).toBeGreaterThanOrEqual(44);
  await pageTime(page, 600);
  // the life keeps a lane under the ruler, in view above the card
  const chosen = await stands(page);
  expect(chosen.chosen).toBe('phezekiah_1512');
  expect(chosen.deal.people).toBeGreaterThanOrEqual(1);
  const line = (await life.boundingBox())!;
  expect(line.y + line.height).toBeLessThanOrEqual((await card.boundingBox())!.y + 1);
  await shot(page, 'timeline-card-person');

  await rows.filter({ hasText: 'Reign of Hezekiah' }).click();
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Reign of Hezekiah');
  await expect(card.locator('[data-card-when]')).toHaveText('about 726 to 697 BC · 29 years');
  // told in 2 Kings, not in the open book: the chip is not the open chapter's; Hezekiah, who has years, is a chip back to his life
  const chip = card.getByRole('button', { name: '2 Kings 18–20', exact: true });
  await expect(chip).not.toHaveAttribute('aria-current');
  await expect(card.getByRole('button', { name: 'Hezekiah', exact: true })).toBeVisible();
  await pageTime(page, 1000);
  const before = await stands(page);
  expect(before.chosen).toBe('e226');

  // the clock held still: the new chapter's strip is seen where the last one stood, before any of its flight has run
  await pauseNow(page);
  await chip.click();
  await stripOf(page, '2 Kings 18');
  const start = await stands(page);
  expect(Math.abs(px(start, before))).toBeLessThan(1);
  expect(start.k).toBeCloseTo(before.k, 6);
  expect(start.home).not.toBeNull();
  expect(Math.abs(px(start, start.home!))).toBeGreaterThan(20);
  await page.clock.resume();
  await pageTime(page, 1000);
  const landed = await stands(page);
  expect(Math.abs(px(landed, landed.home!))).toBeLessThan(1);
  expect(landed.k).toBeCloseTo(landed.home!.k, 6);
  await expect(strip(page)).toHaveAccessibleDescription(/, 2 Kings 18$/);
  // the Reader's own way in: the chapter with the range's first verse brought to the top, and no card of the chapter left behind
  await expect(passage(page)).toHaveAttribute('data-brought-verse', '1');
  await expect(card).toHaveCount(0);
  expect(landed.chosen).toBeNull();
  await shot(page, 'timeline-card-other-chapter');
});

test("turning to the next chapter with the strip dragged away flies it to the new chapter's time, and the column's name is the new chapter's", async ({ page }) => {
  await openDocked(page, { at: 'b=act&c=1' });
  const box = (await strip(page).boundingBox())!;
  const y = box.y + 30;
  const home = await stands(page);
  // 80 px, slowly (no fling): the strip stays 72 px from Acts 1's time
  await drag(page, [200, y], [120, y], { steps: 8, ms: 2400 });
  await pageTime(page, 600);
  const away = await stands(page);
  expect(Math.abs(px(away, home) - 72)).toBeLessThanOrEqual(1);

  await pauseNow(page);
  await page.getByRole('navigation', { name: 'Chapters', exact: true }).getByRole('button', { name: 'Acts 2 ›' }).click();
  await stripOf(page, 'Acts 2');
  // it begins where he left the last chapter's strip
  const start = await stands(page);
  expect(Math.abs(px(start, away))).toBeLessThan(1);
  expect(start.k).toBeCloseTo(away.k, 6);
  await page.clock.resume();
  await pageTime(page, 1000);
  const landed = await stands(page);
  expect(landed.home).not.toBeNull();
  expect(Math.abs(px(landed, landed.home!))).toBeLessThan(1);
  expect(landed.k).toBeCloseTo(landed.home!.k, 6);
  // Acts 2's own time, which is not Acts 1's: the chapter also tells of the months the church grew
  expect(Math.abs(Math.log(landed.k / home.k))).toBeGreaterThan(0.5);
  await expect(strip(page)).toHaveAccessibleDescription(/, Acts 2$/);
  // once the lanes have eased into place there it is at rest: no frame runs on
  await pageTime(page, 2000);
  const frames = (await stands(page)).frames;
  await pageTime(page, 2000);
  expect((await stands(page)).frames).toBe(frames);
  await shot(page, 'timeline-card-next-chapter');
});

test('the ruler where it is busy lists what found no lane; a row opens its card and gives the mark a lane with the ring', async ({ page }) => {
  await openDocked(page);
  const ruler = strip(page).getByRole('button', { name: /^\d+ near \d+ BC$/ }).first();
  const place = (await ruler.getAttribute('aria-label'))!;
  expect((await ruler.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  expect(await tall(ruler)).toBeGreaterThanOrEqual(44);
  await ruler.click();
  const card = cardOf(page);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText(place);
  const rows = card.locator('[data-card-row]');
  await expect(rows).toHaveCount(Number(/^\d+/.exec(place)![0]));
  for (const row of (await rows.all()).slice(0, 2)) expect(await tall(row)).toBeGreaterThanOrEqual(44);
  await pageTime(page, 600);
  // a list is of no one mark: none is ringed
  expect((await stands(page)).chosen).toBeNull();
  // longer than the room the strip gives a card: it scrolls up and down inside itself, never sideways, and its head stays
  const scrolls = await card.evaluate((el) => ({ down: el.scrollHeight > el.clientHeight, sideways: el.scrollWidth > el.clientWidth }));
  expect(scrolls.sideways).toBe(false);
  await shot(page, 'timeline-card-list');

  const first = rows.first();
  const id = (await first.getAttribute('data-card-row'))!;
  const title = (await first.locator('span').first().textContent())!;
  await first.click();
  await expect(card.getByRole('heading', { level: 2 })).toHaveText(title);
  await pageTime(page, 1000);
  expect((await stands(page)).chosen).toBe(id);
  // what had no lane has one now: a button over the picture, in view above the card
  const mark = strip(page).locator(`[data-mark="${id}"]`);
  await expect(mark).toHaveAttribute('aria-expanded', 'true');
  const at = (await mark.boundingBox())!;
  expect(at.x).toBeGreaterThanOrEqual(0);
  expect(at.x + at.width).toBeLessThanOrEqual(390);
  expect(at.y + at.height).toBeLessThanOrEqual((await card.boundingBox())!.y + 1);
});

test("at the dock's smallest the card takes the strip whole, its Close in reach, and shutting it gives the strip back", async ({ page }) => {
  await openDocked(page, { settings: { splitSize: 0.05 } });
  const box = (await strip(page).boundingBox())!;
  expect(box.height).toBe(STRIP_MIN);
  await strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ }).click();
  const card = cardOf(page);
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Prophecies of Isaiah');
  await pageTime(page, 600);
  await risen(page);
  const at = (await card.boundingBox())!;
  expect(at.y).toBeGreaterThanOrEqual(box.y);
  expect(at.height).toBeLessThanOrEqual(STRIP_MIN);
  const close = card.getByRole('button', { name: 'Close', exact: true });
  await expect(close).toBeInViewport({ ratio: 1 });
  await shot(page, 'timeline-card-small');
  await close.click();
  await expect(card).toHaveCount(0);
  await expect(strip(page).getByRole('button', { name: /^Prophecies of Isaiah, about 759 to 697 BC$/ })).toBeVisible();
});
