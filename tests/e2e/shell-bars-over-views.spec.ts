// tests/e2e/shell-bars-over-views.spec.ts — the bars the app shell draws, 'Update ready, tap to reload' and 'Welcome back', can be tapped while the Verse view
// (a fixed full-screen view, z-5) or a sheet (fixed, with a backdrop) is open (mw-5r3p30.632, the fault of mw-5r3p30.322 in two more bars): each is on the screen,
// is the thing under its own centre, and a tap on it works. With nothing fixed open each stays in the page flow, so it never covers the Reader's header.
// At 390x844 and sideways (844x390).
// And the bars do not cover what is under them (mw-5r3p30.636): the Verse view (and every full-screen layer) starts below the bars, so its '‹ Reader', arrows and
// actions can be tapped while Welcome back shows, and the three bars (Update ready, the tutor's waiting bar, Welcome back) stack in the flow without overlapping.
// And so does every other sheet and dialog, nested panels included, and the toasts that stand at the top of the screen (mw-5r3p30.644): below the strip, with their header
// and their close control tappable, with Welcome back, with Update ready, and with both.
import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Locator, type Page, type Request } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { typeQuestion } from './ask-composer';
import { shot } from './shot';
import { openCheck, openDrillIt, openIdea, openShare, openTryIt } from './large-text-titles';
import { openUnlocked } from './unlocked';
import { chooseAction, openTalkAbout, openVerseView } from './verse-view';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'allow' });

const SIZES = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];
const COVERS = ['the Verse view', 'a sheet'] as const;
type Cover = (typeof COVERS)[number];

const UPDATE = 'Update ready, tap to reload';
const DAY = 24 * 60 * 60 * 1000;

// ---- the waiting build, as tests/e2e/update-banner.spec.ts makes it: the built sw.js served with one more comment line, and a changelog with a line to show
const running = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
const parts = running.split('.');
parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
const entry = (version: string) => ({ version, date: '2026-10-12', story: 'fx-1', kind: 'new', text: 'Something to see.' });
const withLine = [entry(parts.join('.')), entry(running)];

/** Serves the waiting build (see above) once `raise` is called, and gives the page's navigations and a wait for the gate's lookups to end. */
async function routeUpdate(page: Page, context: BrowserContext) {
  let build = 1;
  await page.route('**/changelog.json', (route) => route.fulfill({ json: withLine, headers: { 'cache-control': 'no-store' } }));
  await context.route('**/sw.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\n// build ${build}\n`, headers: { ...response.headers(), 'cache-control': 'no-store' } });
  });
  let lastChainAsk = performance.now();
  const chainAsked = (request: Request) => /whatsonchain\.com/.test(request.url()) && (lastChainAsk = performance.now());
  page.on('request', chainAsked);
  page.on('requestfailed', chainAsked);
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => frame.parentFrame() === null && navigations.push(frame.url()));
  const banner = page.getByRole('button', { name: UPDATE });
  // a tap while the gate's lookups are still going can hang the worker's take-over (update-banner.spec.ts)
  const quiet = () => expect.poll(() => performance.now() - lastChainAsk, { timeout: 20_000 }).toBeGreaterThan(1500);
  /** The page has been opened and a worker is in control of it. */
  const control = async () => {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  };
  /** A newer build now waits behind the one in control: the banner shows. */
  const raise = async () => {
    build = 2;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(banner).toBeVisible({ timeout: 20_000 });
    return banner;
  };
  return { banner, navigations, quiet, control, raise };
}

interface Update {
  banner: Locator;
  navigations: string[];
  quiet: () => Promise<void>;
}

/** Opens the Reader with a newer build waiting behind the one in control; gives the banner, the page's navigations and a wait for the gate's lookups to end. */
async function openWithUpdateWaiting(page: Page, context: BrowserContext): Promise<Update> {
  const update = await routeUpdate(page, context);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await update.control();
  await update.raise();
  return update;
}

// ---- Welcome back: a break of nine days with solid items overdue, written into the stores as the app wrote them (tests/e2e/welcome-back.spec.ts)
async function keep(page: Page, rows: Record<string, unknown[]>) {
  await page.evaluate(
    (all) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(Object.keys(all), 'readwrite');
          for (const [store, list] of Object.entries(all)) for (const row of list) tx.objectStore(store).put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

const dayOf = (ms: number) => {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

/** Writes a break of nine days with solid items overdue into the stores, so the next start of the app shows Welcome back. */
async function seedBreak(page: Page): Promise<void> {
  const now = Date.now();
  const gone = dayOf(now - 9 * DAY);
  const word = (lemma: string) => ({ lemma, lemmas: [], gloss: 'g', lesson: 1, state: 'solid', since: now - 90 * DAY });
  const due = (kind: string, id: string, overdue: number) => ({ kind, id, step: 3, due: now - overdue * DAY, lastWhen: now - (overdue + 14) * DAY, lapses: 0, rights: 0 });
  await keep(page, {
    usage: [{ key: `${gone}|screen:home`, day: gone, name: 'screen:home', count: 2 }],
    words: [word('λόγος'), word('ὁδός')],
    grammarLevels: [{ id: 'case-genitive', level: 'solid', since: now - 90 * DAY, how: 'placement' }],
    reviews: [due('word', 'ὁδός', 20), due('grammar', 'case-genitive', 12), due('word', 'λόγος', 9)],
  });
}

async function openAfterABreak(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await seedBreak(page);
  await page.reload();
  const strip = page.getByRole('region', { name: 'Welcome back' });
  await expect(strip).toBeVisible();
  return strip;
}

// ---- what covers the page
async function cover(page: Page, how: Cover): Promise<void> {
  if (how === 'the Verse view') {
    await openVerseView(page, 28);
    return;
  }
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  await expect(page.getByRole('dialog', { name: 'Choose a chapter' })).toBeVisible();
}

/** The bar is on the screen and is what a tap at its centre lands on (or something inside it). */
async function expectOnTop(bar: Locator): Promise<void> {
  await expect(bar).toBeInViewport({ ratio: 1 });
  const hit = await bar.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return at !== null && el.contains(at);
  });
  expect(hit).toBe(true);
}

/** In the page flow: the Reader's header begins at or below the bar's foot. */
async function expectHeaderBelow(page: Page, bar: Locator): Promise<void> {
  const barBox = await bar.boundingBox();
  const headerBox = await page.getByRole('heading', { name: 'Romans 8', level: 1 }).boundingBox();
  expect(barBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height - 0.5);
}

for (const size of SIZES) {
  for (const how of COVERS) {
    test(`'${UPDATE}' is above ${how} and a tap on it reloads, at ${size.width}x${size.height}`, async ({ page, context }) => {
      await page.setViewportSize(size);
      const { banner, navigations, quiet } = await openWithUpdateWaiting(page, context);
      await cover(page, how);
      await expectOnTop(banner);
      await shot(page, `shell-update-${how === 'a sheet' ? 'sheet' : 'view'}-${size.width}`);
      await quiet();
      const before = navigations.length;
      await banner.click();
      await expect.poll(() => navigations.length, { timeout: 20_000 }).toBeGreaterThan(before);
    });

    test(`'Welcome back' is above ${how} and a tap on it works, at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      const strip = await openAfterABreak(page);
      await cover(page, how);
      await expectOnTop(strip);
      await shot(page, `shell-welcome-back-${how === 'a sheet' ? 'sheet' : 'view'}-${size.width}`);
      await strip.getByRole('button', { name: 'Not now' }).click();
      await expect(page.getByRole('region', { name: 'Welcome back' })).toHaveCount(0);
    });
  }

  test(`with nothing open both bars are in the page flow and the Reader's header is below them, at ${size.width}x${size.height}`, async ({ page, context }) => {
    await page.setViewportSize(size);
    const { banner } = await openWithUpdateWaiting(page, context);
    const update = page.locator('[data-update-banner]');
    await expect(update).toBeVisible();
    await expect(update.getByRole('button', { name: UPDATE })).toBeVisible();
    expect(await update.evaluate((el) => getComputedStyle(el).position)).not.toBe('fixed');
    await expectHeaderBelow(page, update);
    await expect(banner).toBeInViewport();
  });

  test(`with nothing open 'Welcome back' is in the page flow and the Reader's header is below it, at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const strip = await openAfterABreak(page);
    expect(await strip.evaluate((el) => getComputedStyle(el).position)).not.toBe('fixed');
    await expectHeaderBelow(page, strip);
  });
}

// ---- the bars do not cover what is under them (mw-5r3p30.636)

/** The control is on the screen and is what a tap at its centre lands on (or something inside it). */
async function expectTappable(control: Locator): Promise<void> {
  await expect(control).toBeInViewport({ ratio: 1 });
  const hit = await control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return at !== null && el.contains(at);
  });
  expect(hit).toBe(true);
}

for (const size of SIZES) {
  test(`with 'Welcome back' showing, the Verse view's header buttons are on top and tappable and the strip still is, at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const strip = await openAfterABreak(page);
    const view = await openVerseView(page, 28);
    for (const name of ['‹ Reader', 'Previous verse', 'Next verse']) await expectTappable(view.getByRole('button', { name, exact: true }));
    await expectTappable(strip.getByRole('button', { name: 'Refresh', exact: true }));
    await expectTappable(strip.getByRole('button', { name: 'Not now' }));
    await shot(page, `shell-welcome-back-header-${size.width}`);
    // the Verse view's Back is a real tap: it closes the view, and the strip is still there
    await view.getByRole('button', { name: '‹ Reader', exact: true }).tap();
    await expect(view).toHaveCount(0);
    await strip.getByRole('button', { name: 'Not now' }).tap();
    await expect(page.getByRole('region', { name: 'Welcome back' })).toHaveCount(0);
  });

  test(`'Update ready' and the tutor's waiting bar do not overlap and both are tappable, at ${size.width}x${size.height}`, async ({ page, context }) => {
    await page.setViewportSize(size);
    const fake: FakePostern = makeFakePostern();
    await routePostern(page, fake);
    await honestMic(page);
    await honestSpeech(page);
    const { banner } = await openWithUpdateWaiting(page, context);
    await chooseAction(page, 28, 'Ask the tutor');
    await typeQuestion(page, 'What does συνεργεῖ mean here?');
    // the question goes to the Talk sheet, the one tutor (mw-5r3p30.842)
    const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
    await expect(sheet).toBeVisible();
    await expect.poll(() => fake.received.length).toBe(1);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    fake.endAll({ status: 'answered', answer: SYNERGEI_ANSWER });
    await expect(page.locator('[data-tutor-waiting]')).toHaveCount(1);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const waiting = page.getByRole('button', { name: 'The tutor answered: tap to play', exact: true });
    await expect(waiting).toBeVisible();
    await expect(banner).toBeVisible();
    const a = await page.locator('[data-update-banner]').boundingBox();
    const b = await page.locator('[data-tutor-waiting]').boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const apart = a!.y + a!.height <= b!.y + 0.5 || b!.y + b!.height <= a!.y + 0.5;
    expect(apart).toBe(true);
    await expectTappable(banner);
    await expectTappable(waiting);
    // the Talk sheet begins under both
    const top = (await sheet.boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual(Math.max(a!.y + a!.height, b!.y + b!.height) - 0.5);
    await expectTappable(sheet.getByRole('button', { name: 'Done', exact: true }));
    await shot(page, `shell-update-and-waiting-${size.width}`);
  });
}

for (const size of SIZES) {
  test(`with 'Welcome back' showing, a sheet starts below the strip and the strip is still tappable, at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const strip = await openAfterABreak(page);
    await cover(page, 'a sheet');
    const sheet = page.getByRole('dialog', { name: 'Choose a chapter' });
    const stripBox = (await strip.boundingBox())!;
    const sheetBox = (await sheet.boundingBox())!;
    expect(sheetBox.y).toBeGreaterThanOrEqual(stripBox.y + stripBox.height - 0.5);
    await expectTappable(strip.getByRole('button', { name: 'Not now' }));
  });
}

// ---- every sheet and dialog, and the top toasts, stand below the bars (mw-5r3p30.644)

/** The foot of the shell's bars. */
async function barsFoot(page: Page): Promise<number> {
  const box = await page.locator('[data-shell-bars]').boundingBox();
  expect(box, 'the bars are drawn').not.toBeNull();
  return box!.y + box!.height;
}

/** The panel starts below the bars and ends inside the window, its header and its close control can be tapped, and so can the bars' own buttons. */
async function expectBelowBars(page: Page, panel: Locator, header: Locator, close: Locator, buttons: Locator[]): Promise<void> {
  await expect(panel).toBeVisible();
  const foot = await barsFoot(page);
  const box = (await panel.boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(box.y, 'the panel starts at or below the foot of the bars').toBeGreaterThanOrEqual(foot - 0.5);
  expect(box.y + box.height, 'the panel ends inside the window').toBeLessThanOrEqual(height + 0.5);
  await header.scrollIntoViewIfNeeded();
  await expectTappable(header);
  await close.scrollIntoViewIfNeeded();
  await expectTappable(close);
  for (const button of buttons) await expectTappable(button);
}

interface PanelWay {
  name: string;
  /** Opens it (the app starts afresh, so the bars that were set up show at its start) and gives the panel. */
  open: (page: Page) => Promise<Locator>;
  header: (panel: Locator) => Locator;
  close: (panel: Locator) => Locator;
}

const heading = (panel: Locator) => panel.getByRole('heading').first();
const done = (panel: Locator) => panel.getByRole('button', { name: 'Done', exact: true });
const stop = (panel: Locator) => panel.getByRole('button', { name: 'Stop', exact: true });

async function readerPage(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="2"]')).toBeVisible();
}

async function openWord(page: Page): Promise<Locator> {
  await readerPage(page);
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

async function talkPostern(page: Page, answer: { answer: string; words: unknown[] } = TALK_ANSWER): Promise<void> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  await routePostern(page, fake);
}

/** What's new, once after an update: the kit's own sheet, whose backdrop and panel carry no utility class of the app's. */
async function openWhatsNew(page: Page): Promise<Locator> {
  await page.route('**/changelog.json', (route) => route.fulfill({ json: withLine, headers: { 'cache-control': 'no-store' } }));
  await openUnlocked(page);
  // the app is already open and has marked this build as seen: he last saw an older one
  await page.evaluate(() => window.localStorage.setItem('lampas.lastSeenVersion', '0.0.1'));
  await page.goto('/');
  const sheet = page.getByRole('dialog', { name: "What's new" });
  await expect(sheet).toBeVisible();
  return sheet;
}

const PANELS: PanelWay[] = [
  {
    name: 'the Verse view',
    open: async (page) => {
      await readerPage(page);
      return openVerseView(page, 28);
    },
    header: (view) => view.getByRole('button', { name: '‹ Reader', exact: true }),
    close: (view) => view.getByRole('button', { name: '‹ Reader', exact: true }),
  },
  {
    name: 'the chapter picker',
    open: async (page) => {
      await readerPage(page);
      await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
      return page.getByRole('dialog', { name: 'Choose a chapter' });
    },
    header: heading,
    close: done,
  },
  {
    name: 'the Talk sheet',
    open: async (page) => {
      await talkPostern(page);
      await readerPage(page);
      await openTalkAbout(page, 28);
      return page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
    },
    header: heading,
    close: done,
  },
  { name: 'the Word sheet', open: openWord, header: (sheet) => sheet.getByTestId('sheet-handle'), close: done },
  {
    name: 'the Grammar sheet',
    open: async (page) => {
      const word = await openWord(page);
      await word.getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Grammar', exact: true });
      await expect(sheet).toBeVisible();
      return sheet;
    },
    header: heading,
    close: done,
  },
  {
    name: 'the Idea sheet',
    open: (page) => openIdea(page, 'Romans 8', 'The noun'),
    header: heading,
    close: done,
  },
  {
    name: 'the Teach sheet',
    open: async (page) => {
      await readerPage(page);
      await page.getByTestId('new-words').click();
      const sheet = page.getByRole('dialog', { name: 'New word' });
      await expect(sheet.getByTestId('teach-lemma')).toBeVisible();
      return sheet;
    },
    header: (sheet) => sheet.getByTestId('teach-lemma'),
    close: done,
  },
  {
    name: 'the Share sheet',
    open: openShare,
    header: heading,
    close: (sheet) => sheet.getByRole('button', { name: 'Cancel', exact: true }),
  },
  { name: 'the Try it dialog', open: openTryIt, header: (dialog) => dialog.getByTestId('try-it-title'), close: stop },
  { name: 'the Drill it dialog', open: (page) => openDrillIt(page, 'The noun'), header: heading, close: stop },
  { name: 'the Check dialog', open: openCheck, header: heading, close: stop },
  {
    name: 'a reference card',
    open: async (page) => {
      await talkPostern(page, { answer: 'Compare Heb 7:1-3 with Romans 8:28; Melchizedek is the thread between them, and the letter to the Hebrews draws it out at length for its readers.', words: [] });
      await readerPage(page);
      await openTalkAbout(page, 28);
      const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await (await talkField(talk)).fill('Who is Melchizedek?');
      await talk.getByRole('button', { name: 'Send', exact: true }).click();
      await talk.getByRole('link', { name: 'Heb 7:1-3', exact: true }).click();
      const card = page.getByRole('dialog', { name: 'Hebrews 7:1-3' });
      await expect(card.getByText('This Melchizedek was king of Salem')).toBeVisible();
      return card;
    },
    header: heading,
    close: (card) => card.getByRole('button', { name: 'Close', exact: true }),
  },
  { name: "the What's new sheet", open: openWhatsNew, header: heading, close: (sheet) => sheet.getByRole('button', { name: 'Close', exact: true }) },
];

/** A phone that has just started: Welcome back is wanted, the worker is in control (so an update can be raised); gives the way to raise 'Update ready'. */
async function prepare(page: Page, context: BrowserContext, welcome: boolean, voices?: string[]) {
  const update = await routeUpdate(page, context);
  await openUnlocked(page);
  if (voices) await honestSpeech(page, { langs: voices });
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await update.control();
  if (welcome) {
    await seedBreak(page);
    // Welcome back is drawn when the app starts
    await page.reload();
    await expect(welcomeOf(page)).toBeVisible();
  }
  return update;
}

const welcomeOf = (page: Page) => page.getByRole('region', { name: 'Welcome back' });

for (const cover of PANELS) {
  test.describe(cover.name, () => {
    test(`with 'Welcome back' and then 'Update ready' up, ${cover.name} stands below the bars with its header and close tappable`, async ({ page, context }) => {
      const update = await prepare(page, context, true);
      const panel = await cover.open(page);
      const strip = welcomeOf(page);
      await expect(strip).toBeVisible();
      await expectBelowBars(page, panel, cover.header(panel), cover.close(panel), [strip.getByRole('button', { name: 'Refresh', exact: true }), strip.getByRole('button', { name: 'Not now' })]);
      await shot(page, `shell-over-${cover.name.replace(/[^a-z]+/gi, '-').toLowerCase()}-welcome`);
      // 'Update ready' comes while it is open: the bars grow and the panel gives way
      const banner = await update.raise();
      await expectBelowBars(page, panel, cover.header(panel), cover.close(panel), [banner, strip.getByRole('button', { name: 'Refresh', exact: true }), strip.getByRole('button', { name: 'Not now' })]);
      await shot(page, `shell-over-${cover.name.replace(/[^a-z]+/gi, '-').toLowerCase()}-both`);
    });

    test(`with 'Update ready' up, ${cover.name} stands below it with its header and close tappable`, async ({ page, context }) => {
      const update = await prepare(page, context, false);
      const panel = await cover.open(page);
      const banner = await update.raise();
      await expectBelowBars(page, panel, cover.header(panel), cover.close(panel), [banner]);
      await shot(page, `shell-over-${cover.name.replace(/[^a-z]+/gi, '-').toLowerCase()}-update`);
    });
  });
}

// ---- the toasts at the top of the screen

interface Toast {
  name: string;
  /** Goes to the screen and makes the toast show, with no Greek voice on the phone. */
  show: (page: Page) => Promise<void>;
}

const TOASTS: Toast[] = [
  {
    name: 'SpeakButton',
    show: async (page) => {
      await page.goto('/#/words');
      await page.getByRole('button', { name: 'Hear it', exact: true }).first().click();
    },
  },
  {
    name: 'TapToHear',
    show: async (page) => {
      await page.goto('/#/test');
      await page.getByTestId('tap-to-hear').click();
    },
  },
  {
    name: 'ReadAloud',
    show: async (page) => {
      await page.getByTestId('new-words').click();
      await page.getByRole('dialog', { name: 'New word' }).getByRole('button', { name: 'Read aloud', exact: true }).first().click();
    },
  },
];

/** The toast is drawn whole inside the window, below the bars and touching neither. */
async function expectToastClear(page: Page): Promise<void> {
  const toast = page.locator('[role="status"]:not([data-live-region])');
  await expect(toast).toBeVisible();
  const foot = await barsFoot(page);
  const box = (await toast.boundingBox())!;
  expect(box.y, 'the toast starts at or below the foot of the bars').toBeGreaterThanOrEqual(foot - 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(toast).toBeInViewport({ ratio: 1 });
}

for (const toast of TOASTS) {
  for (const bars of [{ welcome: true, update: false }, { welcome: false, update: true }, { welcome: true, update: true }]) {
    const what = [bars.welcome ? "'Welcome back'" : '', bars.update ? "'Update ready'" : ''].filter(Boolean).join(' and ');
    test(`the ${toast.name} toast stands below the bars with ${what} up`, async ({ page, context }) => {
      const update = await prepare(page, context, bars.welcome, ['en-US']);
      if (bars.update) await update.raise();
      await toast.show(page);
      await expectToastClear(page);
      await shot(page, `shell-toast-${toast.name.toLowerCase()}-${bars.welcome ? 'w' : ''}${bars.update ? 'u' : ''}`);
    });
  }
}
