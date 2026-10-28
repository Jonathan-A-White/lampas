// The lessons on variant readings (mw-9ji6ek0.18) at 390x844: #/lessons/variants lists the five titles; a page reads with Markdown, ends in its Sources and has Back and
// 'Next: <title>'; the pages are one lazily imported chunk, so once the list has opened, page 3 opens with the network gone; with a licence each page has Ask the tutor, whose talk
// knows the lesson, and without one the button is not drawn; Help names the lessons and opens them. Ends with a shot of page 3.
import { expect, test } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlicensed, openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const TITLES = ['What a variant is', 'Why manuscripts differ', 'Byzantine, Nestle-Aland and ECM', 'How to read a variant', 'When it matters'];

test('the list names the five lessons; page 3 opens with the network gone, reads to its Sources, and Back and Next walk the pages', async ({ page, context }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.goto('/#/lessons/variants');
  await expect(page.getByRole('heading', { name: 'Lessons on variant readings', exact: true, level: 1 })).toBeVisible();
  const rows = page.locator('main li button');
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(rows.nth(i)).toContainText(`${i + 1}. ${TITLES[i]}`);
    expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  // the pages came in one chunk with the list: with the network gone, page 3 still opens
  await context.setOffline(true);
  await page.getByRole('button', { name: '3. Byzantine, Nestle-Aland and ECM' }).click();
  await expect(page).toHaveURL(/#\/lessons\/variants\/3$/);
  await expect(page.getByRole('heading', { name: 'Byzantine, Nestle-Aland and ECM', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sources', level: 2 })).toBeAttached();
  // the Sources are links (to hosts no study resource builds on, too), opened in a new tab
  const sources = page.locator('main article a[href^="https://"]');
  expect(await sources.count()).toBeGreaterThanOrEqual(4);
  for (const a of await sources.all()) {
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noreferrer/);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  const back = page.getByRole('button', { name: 'Back', exact: true });
  const next = page.getByRole('button', { name: 'Next: How to read a variant', exact: true });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await expect(back).toBeInViewport();
  await shot(page, 'variant-lessons');

  await next.click();
  await expect(page).toHaveURL(/#\/lessons\/variants\/4$/);
  await expect(page.getByRole('heading', { name: 'How to read a variant', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/#\/lessons\/variants\/3$/);

  // the back arrow returns to where he came from: the list
  await page.getByRole('button', { name: '‹ Lessons' }).click();
  await expect(page.getByRole('heading', { name: 'Lessons on variant readings', exact: true, level: 1 })).toBeVisible();
  await expect(rows).toHaveCount(5);
  await context.setOffline(false);
});

test('the last page has no Next, and an address that is no page opens the list', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/lessons/variants/5');
  await expect(page.getByRole('heading', { name: 'When it matters', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Next:/ })).toHaveCount(0);
  await page.goto('/#/lessons/variants/9');
  await expect(page.getByRole('heading', { name: 'Lessons on variant readings', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('main li button')).toHaveCount(5);
});

test('with a licence a page has Ask the tutor, and the talk knows the lesson', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/lessons/variants/3');
  await expect(page.getByRole('heading', { name: 'Byzantine, Nestle-Aland and ECM', level: 1 })).toBeVisible();
  const ask = page.getByRole('button', { name: 'Ask the tutor', exact: true });
  await ask.scrollIntoViewIfNeeded();
  expect((await ask.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  await ask.click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Lessons on variant readings', exact: true });
  await expect(sheet).toBeVisible();
  await (await talkField(sheet)).fill('What does the B sign mean?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);

  expect(fake.received).toHaveLength(1);
  const input = fake.received[0].input as { screen: { name: string; facts: { label: string; value: string }[] } };
  const fact = (label: string) => input.screen.facts.find((f) => f.label === label)?.value;
  expect(input.screen.name).toBe('Lessons on variant readings');
  expect(fact('Lesson id')).toBe('byzantine-na-ecm');
  expect(fact('Lesson')).toBe('Byzantine, Nestle-Aland and ECM');
  expect(fact('Text 1')).toContain('Each other reading Lampas shows carries a small sign');
});

test('without a licence the page reads and has no Ask the tutor', async ({ page }) => {
  await openUnlicensed(page);
  await page.goto('/#/lessons/variants/3');
  await expect(page.getByRole('heading', { name: 'Byzantine, Nestle-Aland and ECM', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ask the tutor/ })).toHaveCount(0);
});

test('Help names the lessons and opens them', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/help');
  await page.getByRole('button', { name: /^The Reader/ }).click();
  await expect(page).toHaveURL(/#\/help\?page=reader$/);
  await expect(page.getByText(/Five short lessons explain how to read that/)).toBeVisible();
  await page.getByRole('button', { name: 'Lessons on variant readings', exact: true }).click();
  await expect(page).toHaveURL(/#\/lessons\/variants$/);
  await expect(page.locator('main li button')).toHaveCount(5);
});
