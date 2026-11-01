// tests/e2e/practise.spec.ts — the Verse view's Practise door and Copywork (mw-5r3p30.899) at 390x844: the door lists its five ways in her order with the two that are not there yet saying soon, Copywork shows
// John 1:1 in Greek where the Reader's text was, a photographed page is judged by a stubbed copywork tutor, and the result (each word marked, the problems, the one thing to fix first) and the foot's Try again fit the phone.
// jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { honestMic, honestSpeech, spoken } from '../support/honest-fakes';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const PAGE = 'grinds/examples/copywork/grc-errors-john-1-1.jpg';

async function start(page: Page, speaks = false, hears = false): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  if (speaks) await honestSpeech(page, { langs: ['en-US', 'el-GR'], msPerWord: 40 });
  if (hears) await honestMic(page);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: {} };
  fake.replyFor = (input, kind) => {
    if (kind === 'narration') return { status: 'answered', answer: { caught: ['In the beginning was the Word', 'The Word was with God'], missed: ['The Word was God'], in_order: true, question: 'What do you think the last part says about who the Word is?' } };
    if (kind !== 'copywork') return undefined;
    const words = input.words as string[];
    return {
      status: 'answered',
      answer: {
        readable: true,
        words: words.map((word, i) => ({ word, mark: i === 1 || i === 9 ? 'wrong' : i === 12 ? 'missing' : 'right', ...(i === 1 ? { problem: 'the iota subscript and the circumflex are missing: you wrote ἀρχή', ...(input.mode === 'dictation' ? { sounds_alike: true } : {}) } : i === 9 ? { problem: 'grave accent, not acute: you wrote πρός' } : {}) })),
        fix_first: 'Put the iota subscript and the circumflex back on ἀρχῇ.',
      },
    };
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?ref=John.1.1&view=greek&weave=off');
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
}

const fitsPhone = async (page: Page) => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
};

test.use({ viewport: VIEWPORT });

test('the Practise door lists its five ways, one of them soon, and each is a thumb tall', async ({ page }) => {
  await start(page);
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Practise', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Practise', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const door = view.getByRole('list', { name: 'Ways to practise' });
  const names = await door.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual(['Copywork', 'Narration', 'Dictation', 'Summary', 'Quiz']);
  await expect(door.locator('[data-soon]')).toHaveCount(1);
  for (const button of await door.getByRole('button').all()) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
  await fitsPhone(page);
  await shot(page, 'practise-door');
});

test('Copywork in Greek: the verse to copy, a photographed page judged word by word, Try again at the foot', async ({ page }) => {
  await start(page);
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Practise', exact: true }).click();
  await view.getByRole('button', { name: 'Copywork', exact: true }).click();
  const group = view.getByRole('group', { name: 'Copy in' });
  await expect(group.getByRole('button')).toHaveText(['English', 'Greek']);
  await group.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(view.locator('[data-copywork-text]')).toContainText('Ἐν ἀρχῇ ἦν ὁ λόγος');

  const foot = view.locator('[data-verse-bar]').getByRole('button', { name: 'Take a photo', exact: true });
  const box = await foot.boundingBox();
  if (!box) throw new Error('no foot box');
  expect(box.height).toBeGreaterThanOrEqual(95.5);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);

  await view.locator('input[type="file"]:not([capture])').setInputFiles(PAGE);
  const result = view.locator('[data-copywork-result]');
  await expect(result).toBeVisible();
  await expect(result.locator('[data-copy-word]')).toHaveCount(17);
  await expect(result.locator('[data-copy-word][data-mark="wrong"]')).toHaveCount(2);
  await expect(result.locator('[data-copy-word][data-mark="missing"]')).toHaveCount(1);
  await expect(result.locator('[data-fix-first]')).toContainText('Put the iota subscript and the circumflex back');
  await expect(view.locator('[data-verse-bar]').getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(view.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
  await fitsPhone(page);
  await shot(page, 'practise-copywork-greek');
});

test('Dictation in Greek: the verse is hidden, read a phrase at a time, the foot is Next then Take a photo, and the verse is shown beside the marks', async ({ page }) => {
  await start(page, true);
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Practise', exact: true }).click();
  await view.getByRole('button', { name: 'Dictation', exact: true }).click();
  const group = view.getByRole('group', { name: 'Dictate in' });
  await expect(group.getByRole('button')).toHaveText(['English', 'Greek']);
  await group.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(view.locator('[data-dictation-hidden]')).toBeVisible();
  await expect(view.locator('[data-verse-text]')).not.toContainText('λόγος');

  const bar = view.locator('[data-verse-bar]');
  const begin = bar.getByRole('button', { name: 'Start dictation', exact: true });
  const box = await begin.boundingBox();
  if (!box) throw new Error('no foot box');
  expect(box.height).toBeGreaterThanOrEqual(95.5);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  await begin.click();
  await expect(view.locator('[data-phrase-count]')).toHaveText('Phrase 1 of 4');
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  const again = view.getByRole('button', { name: 'Again', exact: true });
  const a = await again.boundingBox();
  if (!a) throw new Error('no Again box');
  expect(a.height).toBeGreaterThanOrEqual(43.5);
  for (let n = 2; n <= 4; n++) {
    await bar.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(view.locator('[data-phrase-count]')).toHaveText(`Phrase ${n} of 4`);
  }
  await expect(bar.getByRole('button', { name: 'Take a photo', exact: true })).toBeVisible();
  await expect(view.locator('[data-verse-text]')).not.toContainText('λόγος');
  await fitsPhone(page);

  await view.locator('input[type="file"]:not([capture])').setInputFiles(PAGE);
  const result = view.locator('[data-copywork-result]');
  await expect(result).toBeVisible();
  await expect(result.locator('[data-copy-word]')).toHaveCount(17);
  await expect(view.locator('[data-dictation-text]')).toContainText('Ἐν ἀρχῇ ἦν ὁ λόγος');
  await expect(result.locator('[data-sounds-alike]')).toHaveCount(1);
  await expect(bar.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await fitsPhone(page);
  await shot(page, 'practise-dictation-greek');
  await bar.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(view.locator('[data-dictation-hidden]')).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Start dictation', exact: true })).toBeVisible();
});

test('Narration: the verse in English, a hold at the foot tells it back, it is written down with what he caught and missed, and Use as copywork takes it on', async ({ page }) => {
  await start(page, false, true);
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Practise', exact: true }).click();
  await view.getByRole('button', { name: 'Narration', exact: true }).click();
  await expect(view.locator('[data-narration-scope]')).toHaveText('Narration is in English. Telling it back in Greek or Hebrew is not offered yet.');
  await expect(view.locator('[data-narration-text]')).toContainText('In the beginning was the Word');
  await expect(view.locator('[data-narration-text]')).toHaveAttribute('lang', 'en');

  const bar = view.locator('[data-verse-bar]').getByRole('button', { name: 'Hold and tell it back' });
  const box = await bar.boundingBox();
  if (!box) throw new Error('no bar box');
  expect(box.height).toBeGreaterThanOrEqual(95.5);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(view.locator('[data-narration-live]')).toBeVisible();
  await expect(view.locator('[data-narration-live]')).not.toBeEmpty();
  await fitsPhone(page);
  await page.mouse.up();

  const written = view.locator('[data-narration-written]');
  await expect(written).toHaveText(/^[A-Z].*[.!?]$/);
  const result = view.locator('[data-narration-result]');
  await expect(result.locator('[data-narration-caught] li')).toHaveText(['In the beginning was the Word', 'The Word was with God']);
  await expect(result.locator('[data-narration-missed] li')).toHaveText(['The Word was God']);
  await expect(result.locator('[data-narration-question]')).toContainText('who the Word is?');
  // the screen scrolls under the text's box: the question and the two buttons are reached by a scroll, inside the window
  await result.locator('[data-narration-question]').scrollIntoViewIfNeeded();
  await expect(result.locator('[data-narration-question]')).toBeInViewport({ ratio: 1 });
  await view.getByRole('button', { name: 'Use as dictation', exact: true }).scrollIntoViewIfNeeded();
  await expect(view.getByRole('button', { name: 'Use as dictation', exact: true })).toBeInViewport({ ratio: 1 });
  for (const name of ['Use as copywork', 'Use as dictation']) {
    const b = await view.getByRole('button', { name, exact: true }).boundingBox();
    if (!b) throw new Error(`no ${name} box`);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await expect(view.locator('[data-verse-bar]').getByRole('button', { name: 'Hold to tell it again' })).toBeVisible();
  await fitsPhone(page);
  await shot(page, 'practise-narration');

  const told = await written.innerText();
  await view.getByRole('button', { name: 'Use as copywork', exact: true }).click();
  await expect(view.locator('[data-copywork-text]')).toHaveText(told);
  await expect(view.getByRole('group', { name: 'Copy in' }).getByRole('button')).toHaveText(['English']);
  await view.getByRole('button', { name: 'Back to Practise', exact: true }).click();
  await expect(view.locator('[data-narration-written]')).toHaveText(told);
  await expect(view.locator('[data-narration-question]')).toBeVisible();
});
