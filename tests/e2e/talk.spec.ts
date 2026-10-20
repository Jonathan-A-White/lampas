import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { clips, honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('the Talk bar sits at the bottom of the reader and opens a sheet that fits the phone', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');

  // The bar is the lowest thing on the screen, a thumb-sized button across its width.
  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  await expect(talk).toBeInViewport();
  const bar = await talk.boundingBox();
  expect(bar?.height).toBeGreaterThanOrEqual(43.5);
  expect(bar?.width).toBeGreaterThan(300);
  // It rests just above the 48 px the navigation bar may cover (mw-5r3p30.42).
  expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeGreaterThan(VIEWPORT.height - 70);
  await expectFitsPhone(page);

  // With a verse tapped the Verse view takes the screen and the Talk bar is gone (one hold bar at a time); the verse's talk is under Ask the tutor.
  await openTalkAbout(page, 28);
  await expect(talk).toBeHidden();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  const field = sheet.getByRole('textbox', { name: 'Your message' });
  const send = sheet.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();
  await field.fill('What does συνεργεῖ mean here?');
  await expect(send).toBeEnabled();

  // A thumb-sized button, and a field the phone does not zoom into (16 px or more).
  const sendBox = await send.boundingBox();
  expect(sendBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(sendBox?.width).toBeGreaterThanOrEqual(43.5);
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  await send.click();
  const turn = sheet.locator('[data-turn]');
  await expect(turn).toContainText(TALK_ANSWER.answer);
  // the explained word under the answer (the answer's own text has it too, as a word to tap to hear)
  const word = turn.locator('[data-talk-words]').getByRole('button', { name: 'συνεργεῖ', exact: true });
  await expect(word).toBeVisible();
  expect((await word.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].grist.kind).toBe('bible-talk');

  // The sheet is inside the window, its field and Send above the bottom edge, and the page has not moved.
  const box = await sheet.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  expect((await send.boundingBox())?.y ?? 0).toBeGreaterThan(VIEWPORT.height / 2);
  await expectFitsPhone(page);
  await shot(page, 'talk-sheet');

  // The Greek word opens the word sheet on top; Done closes it and the Talk sheet is still there.
  await word.click();
  const wordSheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(wordSheet.getByTestId('sheet-lemma')).toHaveText('συνεργέω');
  await wordSheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(wordSheet).toBeHidden();
  await expect(sheet).toBeVisible();

  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expectFitsPhone(page);
});

test('a setting asked for in the talk is applied at once, shown as Changed with a thumb-sized Undo, and Undo puts it back', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: 'Done: the Greek is read a little slower.', words: [], settings_changes: [{ key: 'greekRate', value: 0.8 }, { key: 'theme', value: 'dark' }] },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Make the Greek slower, and dark');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(sheet.getByText('Changed: Greek speed 0.8x')).toBeVisible();
  await expect(sheet.getByText('Changed: Theme: Dark')).toBeVisible();
  expect(fake.received[0].input.settings).toMatchObject({ greekRate: 1, theme: 'phone' });
  // The dark theme is on the page already.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const undo = sheet.getByRole('button', { name: 'Undo Greek speed' });
  const box = await undo.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await expectFitsPhone(page);
  await shot(page, 'talk-changed');

  await undo.click();
  await expect(sheet.getByText('Put back: Greek speed 1x')).toBeVisible();
  await expect(undo).toBeHidden();
  await sheet.getByRole('button', { name: 'Undo Theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'phone');
});

test('Add to my words under an explained word is thumb-sized, fits the phone and turns into On my list (mw-5r3p30.44)', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer: 'The flesh and the spirit.',
      words: [
        { greek: 'σάρκα', lemma: 'σάρξ', note: 'noun, accusative singular feminine' },
        { greek: 'πνεῦμα', lemma: 'πνεῦμα', note: 'noun, nominative singular neuter' },
      ],
    },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Explain these words');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const add = sheet.getByRole('button', { name: 'Add to my words', exact: true });
  await expect(add).toHaveCount(2);
  const box = await add.first().boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await expectFitsPhone(page);
  await add.first().click();
  await expect(sheet.getByRole('button', { name: 'On my list', exact: true })).toHaveCount(1);
  await expect(add).toHaveCount(1);
  await shot(page, 'talk-add-word');
});

test("the tutor's Markdown shows bold and a list in the Talk sheet, with no marks, inside the phone (mw-5r3p30.59)", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: "The word you're after is **parsing**: naming each part of the form, like συνεργεῖ.\n\n- the tense\n- the *person*\n\n1. read the Greek\n2. say its parsing", words: [] },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('what is parsing?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const answer = sheet.locator('[data-talk-a]');
  await expect(answer.locator('strong')).toHaveText('parsing');
  await expect(answer.locator('ul > li')).toHaveCount(2);
  await expect(answer.locator('ol > li')).toHaveCount(2);
  expect(await answer.innerText()).not.toMatch(/[*#]/);
  expect(await answer.locator('strong').evaluate((el) => Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(600);
  await expectFitsPhone(page);
  await shot(page, 'talk-markdown');
});

// The sheet's title is read whole beside New talk and Done (mw-5r3p30.214): it wraps to a second line rather than end in '…'.
for (const place of [
  { name: 'Settings', path: '/#/settings', title: 'Ask the tutor: Settings', open: (page: Page) => page.getByRole('button', { name: 'Ask the tutor about this screen' }).click() },
  { name: 'the Reader', path: '/', title: 'Talk about Romans 8', open: (page: Page) => page.getByRole('button', { name: 'Talk', exact: true }).click() },
]) {
  test(`on ${place.name} at 390x844 the Talk sheet's title is whole beside New talk and Done`, async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    const fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto(place.path);
    await place.open(page);
    const sheet = page.getByRole('dialog', { name: place.title });
    await sheet.getByRole('textbox', { name: 'Your message' }).fill('take me to Psalm 23');
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
    await expect(sheet.getByRole('button', { name: 'New talk', exact: true })).toBeVisible();

    const heading = sheet.getByRole('heading', { name: place.title, level: 2 });
    const fit = await heading.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflow: getComputedStyle(el).textOverflow, text: el.textContent }));
    expect(fit.text).toBe(place.title);
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
    expect(fit.overflow).not.toBe('ellipsis');
    // two lines at most, inside the window, and Done still a thumb-sized button
    const headingBox = await heading.boundingBox();
    expect((headingBox?.x ?? 0) + (headingBox?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    const lineHeight = await heading.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect(headingBox?.height ?? 0).toBeLessThanOrEqual(lineHeight * 2 + 1);
    const done = sheet.getByRole('button', { name: 'Done', exact: true });
    expect((await done.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await expectFitsPhone(page);
    await shot(page, `talk-title-${place.name === 'Settings' ? 'settings' : 'reader'}`);
  });
}

const SIDEWAYS = { width: 844, height: 390 };
const SPOKEN = 'what does called mean';
const TIDIED = 'What does κέκληται mean?';

/** Opens the Talk sheet about Romans 8:28 on a phone held sideways, the tutor tidying whatever is asked into TIDIED. */
async function openTalkSideways(page: Page, spoken: boolean) {
  await page.setViewportSize(SIDEWAYS);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, question: TIDIED } };
  await routePostern(page, fake);
  if (spoken) await honestMic(page, { clip: { ...clips.english, transcript: SPOKEN } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="28"]')).toBeAttached();
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('a spoken turn shows the tidied question with his own words under it as a muted "You said" line, sideways (mw-5r3p30.633)', async ({ page }) => {
  const sheet = await openTalkSideways(page, true);
  const hold = await sheet.getByRole('button', { name: 'Hold to talk' }).boundingBox();
  if (!hold) throw new Error('no Hold to talk button');
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await expect(sheet.locator('[data-talk-live]')).toContainText(SPOKEN, { timeout: 15_000 });
  await page.mouse.up();

  const turn = sheet.locator('[data-turn]');
  await expect(turn).toHaveCount(1);
  const question = turn.locator('[data-talk-q]');
  await expect(question).toHaveText(TIDIED);
  const said = turn.locator('[data-you-said]');
  await expect(said).toHaveText(`You said: ${SPOKEN}`);
  await expect(said).toHaveClass(/text-muted/);
  // the line is under the question and above the answer, and inside the conversation box
  const [q, s, a, list] = await Promise.all([question, said, turn.locator('[data-talk-a]'), sheet.locator('[data-talk-list]')].map((l) => l.boundingBox()));
  expect(s!.y).toBeGreaterThanOrEqual(q!.y + q!.height - 0.5);
  expect(s!.y + s!.height).toBeLessThanOrEqual(a!.y + 0.5);
  expect(s!.y).toBeGreaterThanOrEqual(list!.y - 0.5);
  await shot(page, 'talk-you-said');
});

test('a typed turn shows the tidied question and no "You said" line, even sideways (mw-5r3p30.633)', async ({ page }) => {
  const sheet = await openTalkSideways(page, false);
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('what does called mean');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const turn = sheet.locator('[data-turn]');
  await expect(turn.locator('[data-talk-q]')).toHaveText(TIDIED);
  await expect(turn.locator('[data-you-said]')).toHaveCount(0);
});
