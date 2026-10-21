// tests/e2e/large-text.spec.ts — Lampas honours the phone's own text size (mw-cwf538.5, the epic 'Lampas for every age and every ability'): the
// browser's default font size is set to 200% (32 px for 16, the way Android's Font size does it, through a Chromium profile's preferences) and the
// five main screens, Reader, Quick test, Talk, Settings and Placement, are opened at 390x844, and so are Quick test after an answer, the Verse view, Words,
// the whole path, and the word, Grammar and Talk sheets (mw-cwf538.7). On each, no control, heading or label is clipped (its scrollWidth within its
// clientWidth) or pushed off the screen, and a shot of the screen is attached. The whole path's SVG labels are drawn at twice their 100% size.
import { chromium, expect, test as base, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserEnv } from '../support/browser-env';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech } from '../support/honest-fakes';
import {
  openAskApproach,
  openCheck,
  openDrillIt,
  openGoal,
  openGoalLists,
  openIdea,
  openHebrewGuide,
  openLessonStrip,
  openLetterDrill,
  openShare,
  openShortDrill,
  openTryIt,
  openWriteIt,
} from './large-text-titles';
import { startAtAllIn } from './greek-start';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

/** The browser's default font size at 200%: 2 x 16 px. */
const TEXT_PX = 32;
const VIEWPORT = { width: 390, height: 844 };

// A Chromium of its own, whose profile says the default font size is 200%: that is the preference the phone's Font size changes, and what `font-size: 100%`
// and every rem answer to. (The page cannot say it for itself: a test that set html's font-size would test its own rule, not the phone's.)
const test = base.extend({
  context: async ({ baseURL }, provide) => {
    const profile = mkdtempSync(join(tmpdir(), 'lampas-large-text-'));
    mkdirSync(join(profile, 'Default'));
    writeFileSync(join(profile, 'Default', 'Preferences'), JSON.stringify({ webkit: { webprefs: { default_font_size: TEXT_PX, default_fixed_font_size: TEXT_PX - 4 } } }));
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      env: browserEnv,
      baseURL,
      viewport: VIEWPORT,
      serviceWorkers: 'block',
    });
    await startAtAllIn(context);
    await provide(context);
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  },
  page: async ({ context }, provide) => {
    await provide(context.pages()[0] ?? (await context.newPage()));
  },
});

interface Screen {
  name: string;
  /** the shot's name under shots/ */
  shot: string;
  open: (page: Page) => Promise<void>;
  /** the screen is a sheet over another: only the sheet on top is checked for a clipped control, as what lies under it is that screen's own check (its text is still checked for an ellipsis) */
  top?: true;
}

const SCREENS: readonly Screen[] = [
  {
    name: 'Reader',
    shot: 'large-text-reader',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeAttached();
      await expect(page.locator('[data-verse="1"]')).toBeAttached();
    },
  },
  {
    name: 'Quick test',
    shot: 'large-text-quick-test',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/test');
      await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeAttached();
      await expect(page.locator('[data-option]')).toHaveCount(4);
    },
  },
  {
    name: 'Talk',
    shot: 'large-text-talk',
    open: async (page) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Talk', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Your message' })).toBeAttached();
    },
  },
  {
    name: 'Settings',
    shot: 'large-text-settings',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/settings');
      await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeAttached();
    },
  },
  {
    name: 'Placement',
    shot: 'large-text-placement',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/placement');
      await expect(page.getByRole('heading', { name: 'Placement', exact: true, level: 1 })).toBeAttached();
    },
  },
];

/** The screens and sheets the story mw-cwf538.7 adds: the ones the first five left unchecked. */
const MORE_SCREENS: readonly Screen[] = [
  {
    name: 'Quick test after an answer',
    shot: 'large-text-quick-test-answered',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/test');
      await expect(page.locator('[data-option]')).toHaveCount(4);
      await page.locator('[data-option]').first().click();
      await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
    },
  },
  {
    name: 'Verse view',
    shot: 'large-text-verse-view',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=english&weave=solid');
      await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
      await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
    },
  },
  {
    name: 'Words',
    shot: 'large-text-words',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/words');
      await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeAttached();
      await expect(page.locator('[data-lemma]').first()).toBeAttached();
    },
  },
  {
    name: 'The whole path',
    shot: 'large-text-path',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/path');
      await expect(page.getByRole('heading', { name: 'The whole path', level: 1 })).toBeAttached();
      await expect(page.getByTestId('graph-world')).toBeAttached();
    },
  },
  {
    name: 'Word sheet',
    shot: 'large-text-word-sheet',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=greek');
      await page.locator('[data-verse="1"] [data-word="1"]').click();
      await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
    },
  },
  {
    name: 'Grammar sheet',
    shot: 'large-text-grammar-sheet',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await page.locator('[data-verse="2"]').getByRole('button', { name: 'For', exact: true }).click();
      await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'conjunction', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Grammar', exact: true }).getByRole('heading', { name: 'conjunction', exact: true })).toBeVisible();
    },
  },
  {
    name: 'Chapter picker',
    shot: 'large-text-chapter-picker',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.locator('[data-verse="1"]')).toBeAttached();
      await page.getByRole('button', { name: /Romans 8/ }).first().click();
      await expect(page.getByRole('heading', { name: 'Choose a book' })).toBeVisible();
    },
  },
  {
    name: 'Talk sheet after a reply',
    shot: 'large-text-talk-reply',
    open: async (page) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Talk', exact: true }).click();
      const sheet = page.getByRole('dialog');
      await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does συνεργεῖ mean here?');
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(sheet).toContainText(TALK_ANSWER.answer);
    },
  },
  // mw-cwf538.10: the screens whose title or line of words was ended with an ellipsis, none of them opened by the sweep before
  { name: 'Drill it', top: true, shot: 'large-text-drill-it', open: async (page) => void (await openDrillIt(page, 'The second declension')) },
  { name: 'Letter drill', top: true, shot: 'large-text-letter-drill', open: async (page) => void (await openLetterDrill(page)) },
  { name: 'Short drill', top: true, shot: 'large-text-short-drill', open: async (page) => void (await openShortDrill(page)) },
  { name: 'Write it', top: true, shot: 'large-text-write-it', open: async (page) => void (await openWriteIt(page)) },
  { name: 'Check sheet', top: true, shot: 'large-text-check', open: async (page) => void (await openCheck(page)) },
  { name: 'Try it sheet', top: true, shot: 'large-text-try-it', open: async (page) => void (await openTryIt(page)) },
  { name: 'Lesson strip', shot: 'large-text-lesson-strip', open: async (page) => void (await openLessonStrip(page)) },
  { name: 'Goal screen', shot: 'large-text-goal', open: openGoalLists },
  { name: 'Hebrew guide', top: true, shot: 'large-text-hebrew-guide', open: async (page) => void (await openHebrewGuide(page)) },
  { name: 'Ask for another approach', top: true, shot: 'large-text-ask-approach', open: async (page) => void (await openAskApproach(page)) },
  // mw-5r3p30.634: what the sheets above left unchecked under them (the sheet on top is the only dialog checked with `top`), and the Share screen
  { name: 'Greek alphabet letter tiles', shot: 'large-text-alphabet', open: async (page) => void (await openIdea(page, '1 John 1', 'The Greek alphabet')) },
  { name: 'Goal screen, Read Romans 8', shot: 'large-text-goal-romans', open: async (page) => {
      await openGoal(page, 'Romans 8');
      await expect(page.getByRole('button', { name: 'Add πνεῦμα to my words' })).toBeAttached();
      await page.getByRole('button', { name: 'Add πνεῦμα to my words' }).scrollIntoViewIfNeeded();
    },
  },
  { name: 'Drill it with the Goal screen under it', shot: 'large-text-drill-it-goal', open: async (page) => void (await openDrillIt(page, 'The second declension')) },
  { name: 'Share to Lampas', shot: 'large-text-share', open: async (page) => void (await openShare(page)) },
];

/** Every control, heading and label on the open screen whose text is cut off, squeezed out or which sticks out of the window, one line each. A row that scrolls sideways
 * on purpose (the Reader's chips) may hold what is past its edge, but each thing in it is still whole. */
async function clipped(page: Page, top = false): Promise<string[]> {
  return page.evaluate(([viewportWidth, onTop]) => {
    const SELECTOR = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="slider"], [role="switch"], h1, h2, h3, h4, label, legend, th';
    const named = (el: Element): string => {
      const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}> "${text}"`;
    };
    const scrollsSideways = (el: Element): boolean => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const x = getComputedStyle(p).overflowX;
        if ((x === 'auto' || x === 'scroll') && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const found: string[] = [];
    const dialogs = document.querySelectorAll('[role="dialog"]');
    const root: ParentNode = onTop && dialogs.length > 0 ? dialogs[dialogs.length - 1] : document;
    for (const el of Array.from(root.querySelectorAll(SELECTOR))) {
      // the whole path is a picture panned under a finger: most of its nodes are past the window's edge on purpose, and its labels have a check of their own
      if (el.closest('svg')) continue;
      // a file input is a one-pixel box (visually hidden); its label, the button the finger meets, is checked
      if (el.matches('input[type="file"]')) continue;
      if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      const box = el.getBoundingClientRect();
      if ((box.width === 0 || box.height === 0) && el.textContent?.trim()) {
        found.push(`${named(el)} is squeezed to nothing: ${box.width} x ${box.height}`);
        continue;
      }
      // scrollWidth within clientWidth, for an element that clips what is past its edge; for one that does not, the text itself within the element's own box
      // (scrollWidth would count an invisible tap area that reaches past a link, which is no cut-off label)
      const style = getComputedStyle(el);
      const clipsX = style.overflowX !== 'visible';
      const clipsY = style.overflowY !== 'visible';
      if (clipsX && el.scrollWidth > el.clientWidth + 1) found.push(`${named(el)} is cut off: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
      if (/^(hidden|clip)$/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        found.push(`${named(el)} is cut off at the bottom: scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`);
      }
      if (!clipsX || !clipsY) {
        const text = document.createRange();
        text.selectNodeContents(el);
        const t = text.getBoundingClientRect();
        if (t.width > 0 && (t.left < box.left - 1 || t.right > box.right + 1)) {
          found.push(`${named(el)} spills out of itself: its text spans ${Math.round(t.left)} to ${Math.round(t.right)}, the box ${Math.round(box.left)} to ${Math.round(box.right)}`);
        }
      }
      if (!scrollsSideways(el) && (box.left < -1 || box.right > viewportWidth + 1)) {
        found.push(`${named(el)} is off the screen: ${Math.round(box.left)} to ${Math.round(box.right)} of ${viewportWidth}`);
      }
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) found.push('the page itself scrolls sideways');
    return [...new Set(found)];
  }, [VIEWPORT.width, top] as const);
}

/** Every piece of text on the open screen that ends in an ellipsis because it did not fit, one line each: a title or a line of words is wrapped at large text, never cut
 * short (mw-cwf538.10). An element that is cut off by `text-overflow: ellipsis` or by a line clamp and has more behind the cut. */
async function ellipsised(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.getClientRects().length === 0 || el.matches('input[type="file"]')) continue;
      const style = getComputedStyle(el);
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const name = `<${el.tagName.toLowerCase()}> "${text}"`;
      if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) found.push(`${name} ends in an ellipsis: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
      if (style.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1) found.push(`${name} is clamped to ${style.webkitLineClamp} lines: scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`);
    }
    return [...new Set(found)];
  });
}

for (const screen of [...SCREENS, ...MORE_SCREENS]) {
  test(`${screen.name} at 200% text: nothing is clipped or off the screen`, async ({ page }) => {
    await screen.open(page);
    // the phone's text size is really 200%: html's own size is twice the usual
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(`${TEXT_PX}px`);
    await shot(page, screen.shot);
    await test.info().attach(screen.shot, { path: `shots/${screen.shot}.png`, contentType: 'image/png' });
    expect(await clipped(page, screen.top)).toEqual([]);
    expect(await ellipsised(page)).toEqual([]);
  });
}

// mw-cwf538.9: two things the first 200% pass left poor. While the tutor's answer is read aloud the Talk sheet's speaking bar (three buttons) must leave the
// conversation a usable height, and the Verse view's passage heading must be shown whole, not ended with an ellipsis.
test('the Talk sheet while the speaking bar is up keeps the conversation at least 40% of its height', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await honestSpeech(page, { msPerWord: 2000 });
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet).toContainText(TALK_ANSWER.answer);
  await expect(sheet.locator('[data-speaking-slot] button').first()).toBeVisible();
  const { list, whole, bar, tops } = await page.evaluate(() => {
    const sheetBox = document.querySelector('[role="dialog"]')!.getBoundingClientRect();
    const slot = document.querySelector('[role="dialog"] [data-speaking-slot]')!.getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('[role="dialog"] [data-speaking-slot] button'));
    return {
      list: document.querySelector('[data-talk-list]')!.getBoundingClientRect().height,
      whole: sheetBox.height,
      bar: slot.height,
      tops: buttons.map((b) => Math.round(b.getBoundingClientRect().top)),
    };
  });
  await shot(page, 'large-text-talk-speaking');
  // the criterion: the conversation is 40% of the sheet, or the bar is one row (its buttons side by side)
  const oneRow = tops.length === 3 && new Set(tops).size === 1;
  expect(oneRow || list >= 0.4 * whole, `the conversation is ${list} px of a ${whole} px sheet, the speaking bar ${bar} px, its buttons at ${tops.join(', ')}`).toBe(true);
  expect(oneRow, `the bar is one row, its buttons at ${tops.join(', ')}`).toBe(true);
  expect(await clipped(page)).toEqual([]);
});

test('the Verse view heading of a passage is whole: no ellipsis', async ({ page }) => {
  await MORE_SCREENS[1].open(page);
  const heading = await page.evaluate(() => {
    const span = Array.from(document.querySelectorAll('[data-verse-view] h2 span')).find((s) => s.textContent === 'Walking by the Spirit') as HTMLElement | undefined;
    if (!span) return null;
    return { scrollHeight: span.scrollHeight, clientHeight: span.clientHeight, display: getComputedStyle(span).display };
  });
  expect(heading, 'the heading Walking by the Spirit is on the view').not.toBeNull();
  expect(heading!.scrollHeight, JSON.stringify(heading)).toBeLessThanOrEqual(heading!.clientHeight);
});

test('the screens are the ones the stories name', () => {
  expect(SCREENS.map((s) => s.name)).toEqual(['Reader', 'Quick test', 'Talk', 'Settings', 'Placement']);
  expect(MORE_SCREENS.map((s) => s.name)).toEqual([
    'Quick test after an answer',
    'Verse view',
    'Words',
    'The whole path',
    'Word sheet',
    'Grammar sheet',
    'Chapter picker',
    'Talk sheet after a reply',
    'Drill it',
    'Letter drill',
    'Short drill',
    'Write it',
    'Check sheet',
    'Try it sheet',
    'Lesson strip',
    'Goal screen',
    'Hebrew guide',
    'Ask for another approach',
    'Greek alphabet letter tiles',
    'Goal screen, Read Romans 8',
    'Drill it with the Goal screen under it',
    'Share to Lampas',
  ]);
});

// The whole path's labels are SVG text, drawn in the graph's own units and scaled with the picture: their size on the screen must still follow the phone's Font
// size (a fixed 14 stayed 14 at 200%, mw-cwf538.7), and each label stays inside its node.
test('the whole path: its labels are twice their 100% size and inside their nodes', async ({ page }) => {
  await MORE_SCREENS[3].open(page);
  const labels = await page.evaluate(() => {
    const zoom = Number(document.querySelector('[data-testid="graph-world"]')?.getAttribute('data-scale'));
    return Array.from(document.querySelectorAll('[data-idea]')).flatMap((node) => {
      const rect = node.querySelector('rect')!.getBoundingClientRect();
      return Array.from(node.querySelectorAll('text')).map((text) => {
        const box = text.getBoundingClientRect();
        return {
          label: text.textContent ?? '',
          // the size the eye sees: the font size in the graph's units times the picture's scale on the screen, over the zoom the reader chose
          onScreen: (parseFloat(getComputedStyle(text).fontSize) * text.getScreenCTM()!.a) / zoom,
          inside: box.left >= rect.left - 1 && box.right <= rect.right + 1 && box.top >= rect.top - 1 && box.bottom <= rect.bottom + 1,
        };
      });
    });
  });
  expect(labels.length).toBeGreaterThan(0);
  for (const { label, onScreen, inside } of labels) {
    expect(onScreen, `"${label}" is drawn at twice 14 px`).toBeCloseTo(14 * (TEXT_PX / 16), 1);
    expect(inside, `"${label}" is inside its node`).toBe(true);
  }
});

// The canary: the check must see a label that is cut off, or it checks nothing.
test('the check fails on a label that is cut off', async ({ page }) => {
  await SCREENS[3].open(page);
  expect(await clipped(page)).toEqual([]);
  await page.getByRole('heading', { name: 'Settings', exact: true, level: 1 }).evaluate((el) => {
    el.setAttribute('style', 'display:block;width:20px;overflow:hidden;white-space:nowrap');
  });
  expect((await clipped(page)).some((line) => line.includes('Settings') && line.includes('cut off'))).toBe(true);
});
