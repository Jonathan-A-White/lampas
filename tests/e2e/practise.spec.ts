// tests/e2e/practise.spec.ts — the Verse view's Practise door and Copywork (mw-5r3p30.899) at 390x844: the door lists its five ways in her order with the three that are not there yet saying soon, Copywork shows
// John 1:1 in Greek where the Reader's text was, a photographed page is judged by a stubbed copywork tutor, and the result (each word marked, the problems, the one thing to fix first) and the foot's Try again fit the phone.
// jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const PAGE = 'grinds/examples/copywork/grc-errors-john-1-1.jpg';

async function start(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: {} };
  fake.replyFor = (input, kind) => {
    if (kind !== 'copywork') return undefined;
    const words = input.words as string[];
    return {
      status: 'answered',
      answer: {
        readable: true,
        words: words.map((word, i) => ({ word, mark: i === 1 || i === 9 ? 'wrong' : i === 12 ? 'missing' : 'right', ...(i === 1 ? { problem: 'the iota subscript and the circumflex are missing: you wrote ἀρχή' } : i === 9 ? { problem: 'grave accent, not acute: you wrote πρός' } : {}) })),
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

test('the Practise door lists its five ways, three of them soon, and each is a thumb tall', async ({ page }) => {
  await start(page);
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Practise', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Practise', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const door = view.getByRole('list', { name: 'Ways to practise' });
  const names = await door.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual(['Copywork', 'Narration', 'Dictation', 'Summary', 'Quiz']);
  await expect(door.locator('[data-soon]')).toHaveCount(3);
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
