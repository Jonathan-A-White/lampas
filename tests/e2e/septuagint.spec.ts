// Settings > Old Testament in Greek (Septuagint) and the Reader on Genesis 1 (mw-u2w5klk.11) at 390x844: turn the setting on, open Genesis 1, and the Greek stands alone (Brenton's English is the English view),
// the title is still Genesis 1 with its edition under it, the chips row is there and Back returns to Settings. public/data-lxx ships no book yet, so the Septuagint's files are the fixtures in
// tests/fixtures/data-lxx, answered to the page by route (the chapters are built from tests/fixtures/lxx by scripts/data-build-lxx.ts).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { clips, honestMic, honestSpeech, spoken } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openSettings, settingsHeading } from './openSettings';
import { chooseAction, openVerseView } from './verse-view';
import { openGroup } from './settings-group';
import { openTutor } from './open-tutor';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8') });
  });
});

const LABEL = 'Old Testament in Greek (Septuagint)';

async function turnOn(page: Page): Promise<void> {
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: LABEL, exact: true });
  await expect(row).toBeVisible();
  // off to start
  await expect(row.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

test('the setting is under How much Greek?, found by a search, and turned on it opens Genesis 1 in the Greek alone', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(page.getByText('Swete’s Greek with Brenton’s English; the Hebrew when off.')).toBeVisible();
  await page.getByRole('searchbox').fill('Septuagint');
  await expect(page.getByText(LABEL, { exact: true }).first()).toBeVisible();
  await page.getByRole('searchbox').fill('');

  await turnOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Greek']);
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();

  const verse = page.locator('[data-verse="1"]');
  await expect(verse.locator('[data-word="0"]')).toHaveText('ΕΝ');
  await expect(verse.locator('[data-lxx-english]')).toHaveCount(0);
  await expect(verse).not.toContainText('In the beginning God made');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Genesis 1');
  await expect(page.locator('[data-reader-subtitle]')).toHaveText("Greek: Swete's edition · English: Brenton's translation");
  // a tap on the line opens the sheet of whose texts these are
  await page.locator('[data-reader-subtitle]').click();
  const sources = page.getByRole('dialog', { name: 'Whose texts these are' });
  await expect(sources).toContainText('Henry Barclay Swete');
  await expect(sources).toContainText('eng-lxx2012');
  await expect(sources.getByRole('link', { name: 'docs/lxx-derivation.md' })).toBeVisible();
  await shot(page, 'septuagint-sources');
  await sources.getByRole('button', { name: 'Done' }).click();
  await expect(sources).toHaveCount(0);
  await expect(page.getByTestId('reader-chips')).toBeVisible();

  // nothing runs off the side of the phone
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
  await shot(page, 'septuagint-reader');

  // Back: the Menu opens Settings and Back returns to the chapter
  await openSettings(page);
  await expect(settingsHeading(page)).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-verse="1"] [data-word="0"]')).toHaveText('ΕΝ');
});

test('Psalms 23 names both numberings and a book that is not shipped says so', async ({ page }) => {
  await openUnlocked(page);
  await turnOn(page);
  await page.goto('/#/?b=psa&c=23');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23 (Greek 22)');
  await expect(page.locator('[data-verse="1"] [data-verse-number]')).toHaveText('1 (22:1)');
  await page.goto('/#/?b=isa&c=1');
  await expect(page.locator('[data-septuagint-not-ready]')).toHaveText('The Septuagint of Isaiah is not ready yet; this is the Hebrew.');
  // a book that ships with a chapter that does not (the fixture index has Genesis 1 only) names the chapter
  await page.goto('/#/?b=gen&c=2');
  await expect(page.locator('[data-septuagint-not-ready]')).toHaveText('The Septuagint of Genesis 2 is not ready yet; this is the Hebrew.');
});

test('a tap on a Septuagint word opens its card from the lemma lexicon, and a guessed word is drawn with a mark and told as a guess', async ({ page }) => {
  await openUnlocked(page);
  await turnOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();

  // ἐποίησεν: read from the New Testament's forms, sure
  await page.locator('[data-verse="1"]').getByRole('button', { name: /^ἐποίησεν/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἐποίησεν');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('ποιέω');
  await expect(sheet.getByTestId('sheet-parse')).toHaveText('verb, aorist active indicative, 3rd person singular');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('to do, make');
  await expect(sheet.getByRole('button', { name: 'Hear it' })).toBeVisible();
  await expect(sheet.getByTestId('sheet-strongs')).toHaveCount(0);
  await expect(sheet.locator('[data-reading-line]')).toHaveText("How Lampas read this word: From the New Testament's forms (sure)");
  // the card and what is under it stay on the phone
  const box = await sheet.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await shot(page, 'septuagint-word');
  await sheet.getByRole('button', { name: 'Done' }).click();

  // Γενηθήτωσαν (verse 14) was only guessed: a dotted mark, and its card says so
  const guessed = page.locator('[data-verse="14"]').getByRole('button', { name: /^Γενηθήτωσαν/ });
  await expect(guessed.locator('[role="img"][aria-label="a guess"]')).toHaveCount(1);
  await expect(guessed).toHaveCSS('text-decoration-style', 'dotted');
  await guessed.click();
  await expect(sheet.getByTestId('sheet-guess')).toHaveText('A guess: Lampas derived this reading and is not sure');
  await expect(sheet.locator('[data-reading-line]')).toHaveText('How Lampas read this word: A guess (unsure)');
  await expect(sheet.getByRole('button', { name: 'Add to my words' })).toHaveCount(0);
  // its Parsing row (a term is a button, a comma plain text) never wraps a line that holds only a comma (mw-u2w5klk.17)
  const lines = await sheet.getByTestId('sheet-parse').evaluate((dd) => {
    const walker = document.createTreeWalker(dd, NodeFilter.SHOW_TEXT);
    const chars: { y: number; x: number; c: string }[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i += 1) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width > 0) chars.push({ y: r.top + r.height / 2, x: r.left, c: text[i] });
      }
    }
    const rows: { y: number; chars: { x: number; c: string }[] }[] = [];
    for (const ch of chars) {
      const row = rows.find((r) => Math.abs(r.y - ch.y) < 12);
      if (row) row.chars.push(ch);
      else rows.push({ y: ch.y, chars: [ch] });
    }
    return rows.sort((p, q) => p.y - q.y).map((r) => r.chars.sort((p, q) => p.x - q.x).map((ch) => ch.c).join('').trim());
  });
  expect(lines.join(' ')).toBe('verb, aorist passive imperative, 3rd person plural');
  for (const line of lines) {
    expect(line, `a line of the Parsing row: ${JSON.stringify(lines)}`).not.toMatch(/^[,;:.\s]*$/);
    expect(line, 'a line starting with a comma').not.toMatch(/^,/);
  }
  await shot(page, 'septuagint-word-guess');
});

// R7 (mw-u2w5klk.17): a punctuated word's card heads the word without the mark; About this reading opens the Help page that explains the five layers, and Back returns to the same card
test('the card of γῆν. has no full stop, and About this reading opens Help at Words and Back returns to the open card', async ({ page }) => {
  await openUnlocked(page);
  await turnOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
  const verse = page.locator('[data-verse="1"]');
  await expect(verse.locator('[data-text]')).toContainText('γῆν.');
  await verse.getByRole('button', { name: /^γῆν\./ }).click();
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('γῆν');
  await sheet.getByRole('button', { name: 'About this reading' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Words' })).toBeVisible();
  const main = page.getByRole('main');
  for (const layer of [/New Testament’s forms/, /paradigm parser/, /agreement with neighbours/, /model’s reading/, /a guess/, /Sure, likely or unsure/]) await expect(main).toContainText(layer);
  await shot(page, 'septuagint-about-reading');
  // the header's Back is to the card ...
  await page.getByRole('button', { name: '‹ Word' }).click();
  await expect(page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-word')).toHaveText('γῆν');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // ... and so is the phone's
  await page.getByRole('dialog', { name: 'Word' }).getByRole('button', { name: 'About this reading' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Words' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-word')).toHaveText('γῆν');
});

// R5 (mw-u2w5klk.15): Memorize and the Diagram read Genesis 1:1 as Swete's Greek while the setting is On (the study tools follow the chapter's language, not the book's name)
const GENESIS_1 = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as { verses: { n: number; g: { t: string }[] }[] };
const GREEK_WORDS = GENESIS_1.verses.find((v) => v.n === 1)!.g.map((w) => w.t);
const GREEK_DIAGRAM = (JSON.parse(readFileSync('tests/fixtures/diagrams/gen-1-1-septuagint.json', 'utf8')) as { diagram: unknown }).diagram;

test.describe('Memorize and the Diagram on a Septuagint chapter', () => {
  test.use({ hasTouch: true });

  test('Genesis 1:1 at step 2 hides half its Greek words, left to right, is said from memory and judged in Greek', async ({ page }) => {
    await page.clock.install();
    await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
    await honestMic(page, { clip: { ...clips.english, transcript: GREEK_WORDS.join(' ') } });
    await openUnlocked(page);
    await turnOn(page);
    await page.goto('/#/?b=gen&c=1');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('lampas');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['reviews'], 'readwrite');
            const now = Date.now();
            tx.objectStore('reviews').put({ kind: 'verse', id: 'el:Gen.1.1', step: 2, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );

    await page.goto('/#/memorize/Gen.1.1/el');
    await expect(page.getByRole('heading', { name: 'Genesis 1:1', level: 1 })).toBeVisible();
    await expect(page.getByText('Greek · Half the words gone · step 3 of 7')).toBeVisible();
    const verse = page.getByTestId('memorize-verse');
    await expect(verse).toBeVisible();
    await expect(verse).not.toHaveAttribute('dir', 'rtl');
    await expect(verse.locator('[data-token]')).toHaveCount(GREEK_WORDS.length);
    await expect(verse.locator('[data-blank]')).toHaveCount(GREEK_WORDS.length / 2);
    await expect(verse.locator('[data-token]:not([data-blank])').first()).toHaveAttribute('lang', 'el');
    const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(wide.scroll).toBeLessThanOrEqual(wide.client);
    await shot(page, 'septuagint-memorize');

    // hidden, recalled, checked: the hold says the verse and is judged against the Greek
    const bar = page.getByRole('button', { name: 'Hold to say it' });
    await expect(bar).toBeInViewport();
    await holdFor(page, bar, 2800);
    await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${GREEK_WORDS.length} of ${GREEK_WORDS.length} words`);
    await expect(verse.locator('[data-blank]')).toHaveCount(0);
    await expect(verse.locator('[data-token]').first()).toContainText('ΕΝ');
  });

  test('the Diagram of Genesis 1:1 is the Greek words in a Reed-Kellogg picture, the tutor asked once, in Greek', async ({ page }) => {
    const fake = makeFakePostern();
    fake.kindReplies['sentence-diagram'] = { status: 'answered', answer: GREEK_DIAGRAM };
    await routePostern(page, fake);
    await openUnlocked(page);
    await turnOn(page);
    await page.goto('/#/?b=gen&c=1');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
    const view = await openVerseView(page, 1);
    await view.getByRole('button', { name: 'Diagram', exact: true }).click();
    const pane = view.getByRole('region', { name: 'Diagram' });
    const picture = pane.getByRole('img', { name: 'Sentence diagram of Genesis 1:1, Greek' });
    await expect(picture).toBeVisible();
    expect(await picture.locator('line').count()).toBeGreaterThan(5);
    await expect(pane.getByRole('button', { name: 'ΕΝ', exact: true })).toBeVisible();
    await expect(pane.getByRole('button', { name: 'Redraw', exact: true })).toBeVisible();
    const asks = fake.received.filter((r) => r.grist.kind === 'sentence-diagram');
    expect(asks).toHaveLength(1);
    expect(asks[0].input.lang).toBe('greek');
    expect((asks[0].input.words as { text: string }[]).map((w) => w.text)).toEqual(GREEK_WORDS.map((w) => w.replace(/[.,;·]+$/u, '')));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await shot(page, 'septuagint-diagram');
  });
});

// R6 (mw-u2w5klk.16): a lemma only the Septuagint has (κάρπιμος is in no word of the New Testament) is added by the tutor's words_to_add, from a private stub of the tutor (never the live Postern or grind)
test("the tutor's words_to_add adds a lemma only the Septuagint has, and the Words list shows it", async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'A fruitful tree; adding it.', words: [], words_to_add: ['κάρπιμος'] } };
  await routePostern(page, fake);
  await openUnlocked(page, { empty: true });
  await turnOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
  await openVerseView(page, 11);
  const sheet = await openTutor(page, { sheet: 'Talk about Genesis 1:11' });
  const field = await talkField(sheet);
  await field.fill('What is a fruit tree called here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const card = sheet.locator('[data-turn]');
  await expect(card).toContainText('A fruitful tree; adding it.');
  await expect(card.locator('[data-talk-added]')).toContainText('κάρπιμος');
  await expect(card).not.toContainText('not in the lexicon');
  expect(fake.received).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'septuagint-words-to-add');

  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
  const row = page.locator('[data-lemma="κάρπιμος"]');
  await expect(row).toBeVisible();
  await expect(row).toContainText('fruitful');
  await expect(row).toHaveAttribute('data-state', 'learning');
});

// R8 (mw-u2w5klk.18): Listen on a Septuagint verse speaks Swete's Greek, and names the verse as Lampas does. The voice is voice-kit's honest fake: a real phone voice was not run (the Deputy is to hear it once a book ships).
test('Listen on Psalm 10:1, which Greek 9 numbers 22, speaks the Greek and the view is headed with Lampas’s reference', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await openUnlocked(page);
  await turnOn(page);
  await page.goto('/#/?b=psa&c=10');
  await expect(page.locator('[data-verse="22"]')).toBeVisible();
  // only the verses of Psalm 10 are on the page, not the whole Greek chapter
  await expect(page.locator('[data-verse="1"]')).toHaveCount(0);
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
  const view = await chooseAction(page, 22, 'Listen');
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('Psalms 10:1 (9:22)');
  await view.getByRole('button', { name: 'Play verse 1', exact: true }).click();
  await expect.poll(async () => (await spoken(page)).filter((s) => s.lang === 'el-GR').length).toBeGreaterThan(0);
  const said = await spoken(page);
  expect(said.every((s) => s.lang === 'el-GR')).toBe(true);
  expect(said.map((s) => s.text).join(' ')).not.toContain('Ἐξομολ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'septuagint-listen');
});

// mw-u2w5klk.266: Settings > Bible in Logos has a Septuagint row (Swete's Greek to start), and a chapter the Septuagint does not have yet says so by chapter and opens, with one tap, in the Septuagint he chose in Logos.
// The fixtures' index ships Genesis 1 and Greek Psalm 22; Genesis 7 is a chapter of a shipped book not yet shipped, Isaiah a book not yet shipped.
test('Settings > Bible in Logos has a Septuagint row, Swete to start, and a chapter not shipped opens in it from a 44 px door', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  // the row is drawn while Logos is On, whatever the Septuagint setting says (it is Off to start)
  await expect(page.getByRole('combobox', { name: 'Septuagint Bible in Logos' })).toHaveCount(0);
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Septuagint Bible in Logos' });
  await expect(picker).toBeVisible();
  await expect(picker.locator('option:checked')).toContainText('LXX Swete');
  await expect(picker.locator('option')).toHaveText([
    'LXX Swete (The Old Testament in Greek according to the Septuagint)',
    'Lexham LXX Int Swete (The Lexham Greek-English Interlinear Septuagint: Swete)',
    'LES (The Lexham English Septuagint)',
    'Brenton LXX En (The Septuagint Version of the Old Testament: English Translation)',
  ]);
  const box = await picker.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  await picker.scrollIntoViewIfNeeded();
  await shot(page, 'settings-septuagint-row');

  await turnOn(page);
  await page.goto('/#/?b=gen&c=7');
  await expect(page.getByRole('heading', { name: 'Genesis 7', level: 1 })).toBeVisible();
  await expect(page.locator('[data-septuagint-not-ready]')).toHaveText('The Septuagint of Genesis 7 is not ready yet; this is the Hebrew.');
  const door = page.locator('[data-septuagint-door]');
  await expect(door).toHaveText('Read it in Logos: LXX Swete');
  await expect(door).toHaveAttribute('href', 'logosres:LLS:OTGRKSWETETXT;ref=Bible.Ge7');
  await expect(door).toHaveAttribute('data-fallback', 'https://ref.ly/logosres/LLS%3AOTGRKSWETETXT?ref=Bible.Ge7');
  const doorBox = await door.boundingBox();
  expect(doorBox?.height).toBeGreaterThanOrEqual(43.5);
  expect((doorBox?.x ?? 0) + (doorBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'septuagint-not-ready');

  // a book not shipped at all says so by book and has the same door
  await page.goto('/#/?b=isa&c=1');
  await expect(page.getByRole('heading', { name: 'Isaiah 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-septuagint-not-ready]')).toHaveText('The Septuagint of Isaiah is not ready yet; this is the Hebrew.');
  await expect(page.locator('[data-septuagint-door]')).toHaveAttribute('href', 'logosres:LLS:OTGRKSWETETXT;ref=Bible.Isa1');
});

// mw-u2w5klk.308: the line under a Septuagint chapter's title is one line, centred, and its button is no wider than its words and padding
type CaptionBox = { lines: number; left: number; right: number; textWidth: number; buttonWidth: number; padding: number; width: number };

async function captionBox(page: Page, selector: string): Promise<CaptionBox> {
  return page.locator(selector).evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const box = range.getBoundingClientRect();
    const style = getComputedStyle(el);
    const outer = el.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    return {
      lines: rects.length,
      left: box.left,
      right: width - box.right,
      textWidth: box.width,
      buttonWidth: outer.width,
      padding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
      width,
    };
  });
}

for (const size of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`the Septuagint header line is one centred line, its button no wider than its words, at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await turnOn(page);
    await page.goto('/#/?b=gen&c=1');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await expect(page.locator('[data-reader-subtitle]')).toBeVisible();
    for (const view of ['English', 'Greek']) {
      await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: view, exact: true }).click();
      const caption = await captionBox(page, '[data-reader-subtitle]');
      expect(caption.lines, `${view} view: lines`).toBe(1);
      expect(Math.abs(caption.left - caption.right), `${view} view: margins ${caption.left} / ${caption.right}`).toBeLessThanOrEqual(1);
      expect(caption.buttonWidth, `${view} view: button ${caption.buttonWidth} against text ${caption.textWidth} + padding ${caption.padding}`).toBeLessThanOrEqual(caption.textWidth + caption.padding + 1);
    }
    await shot(page, `septuagint-subtitle-${size.width}`);
  });
}

test('the "not ready yet" line under the title has no lone word on a line and is centred at 390x844', async ({ page }) => {
  await openUnlocked(page);
  await turnOn(page);
  for (const url of ['/#/?b=isa&c=1', '/#/?b=gen&c=2']) {
    await page.goto(url);
    await expect(page.locator('[data-septuagint-not-ready]')).toBeVisible();
    const note = await captionBox(page, '[data-septuagint-not-ready]');
    expect(Math.abs(note.left - note.right), `${url}: margins ${note.left} / ${note.right}`).toBeLessThanOrEqual(1);
    // a wrapped line ends in more than one word: the last of its rects is wider than a lone short word
    const last = await page.locator('[data-septuagint-not-ready]').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      return { lines: rects.length, lastWidth: rects[rects.length - 1]?.width ?? 0 };
    });
    if (last.lines > 1) expect(last.lastWidth, `${url}: last line ${last.lastWidth}px`).toBeGreaterThan(60);
  }
});
