// What the Ask the tutor box says when the question cannot be answered (mw-5r3p30.340): his phone offline is his connection;
// the backend answering with a gateway error (the factory's home off) is the tutor, and never blames his connection.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, POSTERN_ORIGIN } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { composerOf, questionField } from './ask-composer';
import { honestMic } from '../support/honest-fakes';
import { chooseAction } from './verse-view';

async function askAbout28(page: Page): Promise<void> {
  const field = await questionField(page);
  await field.fill('What is this verse about?');
  await composerOf(page).getByRole('button', { name: 'Send', exact: true }).click();
}

test('the backend answering 503 says the tutor is offline right now, not his connection, and keeps Retry', async ({ page }) => {
  const fake = makeFakePostern();
  fake.gateway = 503;
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Ask the tutor');
  await askAbout28(page);
  const box = page.locator('[data-ask-failed]');
  await expect(box.getByText('Could not reach the tutor')).toBeVisible();
  await expect(box.getByText('The tutor is offline right now. This is not your connection; try again later.')).toBeVisible();
  await expect(box.getByText(/Check the connection/)).toHaveCount(0);
  await expect(box.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('a phone with no network says he is offline', async ({ page, context }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Ask the tutor');
  // offline: the browser says so and every call to the backend fails to connect (the later route wins over the fake's)
  await context.setOffline(true);
  await page.route(`${POSTERN_ORIGIN}/**`, (route) => route.abort('internetdisconnected'));
  await askAbout28(page);
  const box = page.locator('[data-ask-failed]');
  await expect(box.getByText('You are offline. Check your connection and try again.')).toBeVisible();
  await expect(box.getByRole('button', { name: 'Retry' })).toBeVisible();
});
