// Settings > Old Testament in Greek (Septuagint) and the Reader on Genesis 1 (mw-u2w5klk.11) at 390x844: turn the setting on, open Genesis 1, and the Greek stands alone (Brenton's English is the English view),
// the title is still Genesis 1 with its edition under it, the chips row is there and Back returns to Settings. public/data-lxx ships no book yet, so the Septuagint's files are the fixtures in
// tests/fixtures/data-lxx, answered to the page by route (the chapters are built from tests/fixtures/lxx by scripts/data-build-lxx.ts).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { clips, honestMic, honestSpeech } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openSettings, settingsHeading } from './openSettings';
import { openVerseView } from './verse-view';
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
