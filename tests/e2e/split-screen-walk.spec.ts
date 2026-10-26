// The walk of every screen at the six split-screen sizes (mw-5r3p30.769, after mw-5r3p30.768's header spec): a 390 x 844 phone cut to a third, a half and two thirds of its
// height, and turned sideways cut to the same shares of its width. At each size the walk takes a shot of the Reader (English, Weave, Greek), the Verse view with the
// Diagram open, Today, Review, the Library and a verse list, Settings, the Ask and Talk with an answer, the word sheet and the reference pop-up, and on each it asserts that
// no two visible controls overlap and that nothing of the screen is clipped off the window's edge.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { composerOf, typeQuestion } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout, openVerseView } from './verse-view';
import { openGroup } from './settings-group';
import { talkField } from './talk-field';

const SIZES = [
  { name: 'portrait-third', width: 390, height: 260 },
  { name: 'portrait-half', width: 390, height: 400 },
  { name: 'portrait-two-thirds', width: 390, height: 540 },
  { name: 'landscape-third', width: 280, height: 390 },
  { name: 'landscape-half', width: 420, height: 390 },
  { name: 'landscape-two-thirds', width: 560, height: 390 },
];

const ENGLISH_DIAGRAM = (JSON.parse(readFileSync('tests/fixtures/diagrams/col-3-1-english.json', 'utf8')) as { diagram: unknown }).diagram;
const REFERENCE_ANSWER = 'Compare Heb 7:1-3 with Romans 8:28; Melchizedek is the thread between them, and the letter to the Hebrews draws it out at length for its readers.';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One control: its name and the box of each line it is drawn on (a link that wraps is two boxes), and whether it is a word or link inside running text. */
interface Control {
  name: string;
  rects: Rect[];
  text: boolean;
  ask: boolean;
}

interface Seen {
  controls: Control[];
  /** Controls drawn past the window's edge (not in a box that scrolls that way), and boxes that scroll sideways when they should not. */
  clipped: string[];
}

/**
 * Every visible control of the page as it is drawn now, and what is clipped off the window. A control inside a box that scrolls (a chip row, the screen, a sheet) is
 * cut to that box; one with nothing of it showing, or one under a sheet or the page behind a sheet, is left out; the round Ask button is kept even over a control, since
 * covering a control is what the check is for.
 */
async function look(page: Page): Promise<Seen> {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.clientHeight;
    const controls: Control[] = [];
    const clipped: string[] = [];
    const selector = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="link"], [role="radio"], [role="tab"], [role="switch"], [role="checkbox"], summary';
    const name = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? el.getAttribute('placeholder') ?? el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40) || el.tagName;
    const scrolls = (el: Element, axis: 'x' | 'y') => {
      const style = getComputedStyle(el);
      const overflow = axis === 'x' ? style.overflowX : style.overflowY;
      if (overflow !== 'auto' && overflow !== 'scroll') return false;
      return axis === 'x' ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1;
    };
    for (const el of document.querySelectorAll(selector)) {
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
      const scrollers: { axis: 'x' | 'y'; box: DOMRect }[] = [];
      let hidden = false;
      for (let up = el.parentElement; up; up = up.parentElement) {
        // a row clipped to a pixel until focus is inside (the Reader's gesture buttons) is not on the screen
        const there = getComputedStyle(up);
        const small = up.getBoundingClientRect();
        if (there.clipPath !== 'none' || ((there.overflowX !== 'visible' || there.overflowY !== 'visible') && (small.width <= 1 || small.height <= 1))) hidden = true;
        if (scrolls(up, 'x')) scrollers.push({ axis: 'x', box: up.getBoundingClientRect() });
        if (scrolls(up, 'y')) scrollers.push({ axis: 'y', box: up.getBoundingClientRect() });
      }
      if (hidden) continue;
      const rects: Rect[] = [];
      // a word in running text is an inline box whose padding makes its tap target taller than its line: the boxes drawn are the lines of text
      const inline = style.display === 'inline';
      const pad = (side: string) => (inline ? parseFloat(style.getPropertyValue(`padding-${side}`)) || 0 : 0);
      for (const r of el.getClientRects()) {
        if (r.width <= 1 || r.height <= 1) continue;
        let left = r.left + pad('left');
        let right = r.right - pad('right');
        let top = r.top + pad('top');
        let bottom = r.bottom - pad('bottom');
        for (const s of scrollers) {
          if (s.axis === 'x') {
            left = Math.max(left, s.box.left);
            right = Math.min(right, s.box.right);
          } else {
            top = Math.max(top, s.box.top);
            bottom = Math.min(bottom, s.box.bottom);
          }
        }
        if (right - left <= 1 || bottom - top <= 1) continue;
        rects.push({ x: left, y: top, width: right - left, height: bottom - top });
      }
      if (rects.length === 0) continue;
      // under a sheet or a card: the thing at its middle is neither the control nor another control of its own layer
      const first = rects[0];
      const hit = document.elementFromPoint(Math.min(Math.max(first.x + first.width / 2, 0), W - 1), Math.min(Math.max(first.y + first.height / 2, 0), H - 1));
      // another control on top of it counts (that is an overlap), unless that control is in a sheet or the Verse view and this one is not
      const sheet = (node: Element) => node.closest('[role="dialog"], [aria-label="Verse view"]');
      const shown = !!hit && (el.contains(hit) || hit.contains(el) || !!hit.closest('[data-ask-tutor]') || (!!hit.closest(selector) && sheet(hit) === sheet(el)));
      if (!shown) continue;
      controls.push({ name: name(el), rects, text: !!el.closest('[data-verse], [data-heading], [data-answer], [data-reference-text], [data-diagram]') , ask: el.hasAttribute('data-ask-tutor') });
      for (const r of rects) {
        if (r.x < -0.5 || r.x + r.width > W + 0.5 || r.y < -0.5 || r.y + r.height > H + 0.5) {
          clipped.push(`${name(el)} (${Math.round(r.x)},${Math.round(r.y)} to ${Math.round(r.x + r.width)},${Math.round(r.y + r.height)})`);
        }
      }
    }
    // a screen or the page wider than the window is clipped at its side
    for (const el of [document.documentElement, ...document.querySelectorAll('.screen, [role="dialog"]')]) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto') clipped.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} is ${el.scrollWidth} wide in ${el.clientWidth}`);
    }
    return { controls, clipped };
  });
}

/** Two boxes are on top of each other when they share more than the 6 px a tap target's padding may lend a neighbour (a heading's 44 px row and the verse number below it). */
const MARGIN = 6;
const onTop = (a: Rect, b: Rect) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > MARGIN && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > MARGIN;

/** The check of every screen and size: the shot, then no two visible controls on top of each other and nothing clipped off the window. */
async function checked(page: Page, screen: string, size: (typeof SIZES)[number]): Promise<void> {
  await shot(page, `split-screen-walk-${screen}-${size.name}`);
  const seen = await look(page);
  expect(seen.controls.length, `${screen}: controls found`).toBeGreaterThan(1);
  expect.soft(seen.clipped, `${screen} at ${size.name}: clipped off the window`).toEqual([]);
  const overlaps: string[] = [];
  for (let i = 0; i < seen.controls.length; i++) {
    for (let j = i + 1; j < seen.controls.length; j++) {
      const a = seen.controls[i];
      const b = seen.controls[j];
      // the round Ask button floats over the reading text by design; it is held to every other control
      if ((a.ask && b.text) || (b.ask && a.text)) continue;
      if (a.rects.some((one) => b.rects.some((other) => onTop(one, other)))) overlaps.push(`${a.name} and ${b.name}`);
    }
  }
  expect.soft(overlaps, `${screen} at ${size.name}: controls on top of each other`).toEqual([]);
}

/** Puts a verse list in the phone's database, as the Share sheet leaves it. */
async function seedList(page: Page, name: string, refs: string[]): Promise<void> {
  await page.evaluate(
    ({ name, refs }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['verseLists'], 'readwrite');
          tx.objectStore('verseLists').add({ name, refs, created: 1000, updated: 1000 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { name, refs },
  );
}

type Walk = (page: Page, fake: FakePostern) => Promise<void>;

const SCREENS: { name: string; walk: Walk }[] = [
  {
    name: 'reader-english',
    walk: async (page) => {
      await page.goto('/#/?b=col&c=3&view=english&weave=off');
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
    },
  },
  {
    name: 'reader-weave',
    walk: async (page) => {
      await page.goto('/#/?b=col&c=3&weave=solid');
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
      await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Weave', exact: true })).toHaveAttribute('aria-pressed', 'true');
    },
  },
  {
    name: 'reader-greek',
    walk: async (page) => {
      await page.goto('/#/?b=col&c=3&view=greek&weave=off');
      await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
      await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true })).toHaveAttribute('aria-pressed', 'true');
    },
  },
  {
    name: 'verse-diagram',
    walk: async (page, fake) => {
      fake.kindReplies['sentence-diagram'] = { status: 'answered', answer: ENGLISH_DIAGRAM };
      await page.goto('/#/?b=col&c=3&view=english&weave=off');
      const view = await openVerseView(page, 1);
      await view.getByRole('button', { name: 'Diagram', exact: true }).click();
      await expect(view.getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeVisible();
    },
  },
  {
    name: 'today',
    walk: async (page) => {
      await page.goto('/#/today');
      await expect(page.getByRole('heading', { name: 'Today', exact: true, level: 1 })).toBeVisible();
    },
  },
  {
    name: 'review',
    walk: async (page) => {
      await page.goto('/#/review');
      await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
    },
  },
  {
    name: 'review-question',
    walk: async (page) => {
      await page.goto('/#/review');
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByTestId('prompt')).toBeVisible();
    },
  },
  {
    name: 'library',
    walk: async (page) => {
      await page.goto('/#/library');
      await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'verse-list',
    walk: async (page) => {
      await page.goto('/#/library');
      await seedList(page, 'Refuge', ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3', 'Heb.7.24-25', 'Isa.30.21']);
      await page.goto('/#/lists');
      await page.getByRole('button', { name: /^Refuge/ }).click();
      await expect(page.getByRole('heading', { name: 'Refuge', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'settings',
    walk: async (page) => {
      await page.goto('/#/settings');
      await expect(page.getByRole('list', { name: 'Settings groups' })).toBeVisible();
    },
  },
  {
    name: 'settings-reading',
    walk: async (page) => {
      await page.goto('/#/settings');
      await openGroup(page, 'Reading');
    },
  },
  {
    name: 'ask',
    walk: async (page, fake) => {
      fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
      await honestMic(page);
      await honestSpeech(page, { msPerWord: 400 });
      await page.goto('/#/?c=8&view=english&weave=off');
      await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
      const view = page.getByRole('region', { name: 'Verse view' });
      await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
      await expect(composerOf(page)).toBeVisible();
      await typeQuestion(page, 'What does called mean?');
      await expect(view.locator('[data-answer]')).toContainText(SYNERGEI_ANSWER.answer);
    },
  },
  {
    name: 'talk',
    walk: async (page, fake) => {
      fake.autoReply = { status: 'answered', answer: { answer: REFERENCE_ANSWER, words: [] } };
      await page.goto('/');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await openTalkAbout(page, 28);
      const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await (await talkField(sheet)).fill('Who is Melchizedek?');
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(sheet.getByRole('link', { name: 'Heb 7:1-3', exact: true })).toBeVisible();
    },
  },
  {
    name: 'word-sheet',
    walk: async (page) => {
      await page.goto('/');
      await page.locator('[data-verse="1"]').getByRole('button', { name: 'Therefore', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-word')).toBeVisible();
    },
  },
  {
    name: 'reference-popup',
    walk: async (page, fake) => {
      fake.autoReply = { status: 'answered', answer: { answer: REFERENCE_ANSWER, words: [] } };
      await page.goto('/');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await openTalkAbout(page, 28);
      const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await (await talkField(sheet)).fill('Who is Melchizedek?');
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      await sheet.getByRole('link', { name: 'Heb 7:1-3', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Hebrews 7:1-3' }).getByText('This Melchizedek was king of Salem')).toBeVisible();
    },
  },
];

/**
 * What the walk found that is not the header's and is not mended here (mw-5r3p30.769): each is a bug of its own, and its test is expected to fail until it is mended
 * (test.fail: it goes red when the bug is mended, and the line is deleted). Keys are 'screen@size'.
 */
const KNOWN: Record<string, string> = {
};

for (const size of SIZES) {
  for (const screen of SCREENS) {
    test(`${screen.name} at ${size.width} x ${size.height} (${size.name}): no two controls overlap and nothing is clipped off the window`, async ({ page }) => {
      const known = KNOWN[`${screen.name}@${size.name}`];
      test.fail(!!known, known);
      await page.setViewportSize({ width: size.width, height: size.height });
      const fake = makeFakePostern();
      await routePostern(page, fake);
      await openUnlocked(page);
      await screen.walk(page, fake);
      await checked(page, screen.name, size);
    });
  }
}
