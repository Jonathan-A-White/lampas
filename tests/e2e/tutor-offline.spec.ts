// What the Ask the tutor box says when the question cannot be answered (mw-5r3p30.340): his phone offline is his connection;
// the backend answering with a gateway error (the factory's home off) is the tutor, and never blames his connection.
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { composerOf, questionField } from './ask-composer';
import { honestMic } from '../support/honest-fakes';
import { chooseAction, openTalkAbout } from './verse-view';
import { talkField } from './talk-field';

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
  await expect(box.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
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
  await expect(box.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

/** The gateway with the factory's home off (mw-5r3p30.433): every call, the preflight too, gets its own 502 page and no CORS headers, so the
 * browser refuses the reply and the call fails as a refused connection does. Only navigator.onLine can tell this from his phone being offline.
 * Playwright's route.fulfill hands a page any reply, CORS headers or none, so the gateway is a real server on another origin, and the page's
 * calls to Postern go to it: the browser's own CORS check refuses the 502, as it does on the phone. */
async function routeGateway502NoCors(page: Page): Promise<void> {
  const gateway = createServer((_, response) => {
    response.writeHead(502, { 'content-type': 'text/html' });
    response.end('<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center></body></html>');
  });
  await new Promise<void>((resolve) => gateway.listen(0, '127.0.0.1', resolve));
  const { port } = gateway.address() as AddressInfo;
  page.once('close', () => gateway.close());
  await page.addInitScript(
    ([from, to]) => {
      const real = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith(from)) return real(input, init);
        const moved = to + url.slice(from.length);
        return real(input instanceof Request ? new Request(moved, input) : moved, init);
      };
    },
    [POSTERN_ORIGIN, `http://127.0.0.1:${port}`],
  );
}

test('a gateway 502 with no CORS headers and the phone online says the tutor is offline; only offline says he is', async ({ page, context }) => {
  await routeGateway502NoCors(page);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Ask the tutor');
  await askAbout28(page);
  const box = page.locator('[data-ask-failed]');
  await expect(box.getByText('Could not reach the tutor')).toBeVisible();
  await expect(box.getByText('The tutor is offline right now. This is not your connection; try again later.')).toBeVisible();
  await expect(page.getByText(/You are offline/)).toHaveCount(0);

  // airplane mode on: the browser says so, and now it is his connection
  await context.setOffline(true);
  await box.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('[data-ask-failed]').getByText('You are offline. Check your connection and try again.')).toBeVisible();
  await expect(page.getByText(/The tutor is offline right now/)).toHaveCount(0);
});

test('Talk with a gateway 502 with no CORS headers and the phone online says the tutor is offline, not his connection', async ({ page }) => {
  await routeGateway502NoCors(page);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('What is this verse about?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText('The tutor is offline right now. This is not your connection; try again later.')).toBeVisible();
  await expect(sheet.getByText(/You are offline/)).toHaveCount(0);
});

test('the phone going offline while the tutor is still thinking says he is offline within a few seconds, with Retry (mw-5r3p30.434)', async ({ page, context }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Ask the tutor');
  await askAbout28(page);
  // the question has gone and the tutor has not answered: the box counts the wait
  await expect(page.locator('[data-ask-pending]').getByText(/Waiting for the tutor…/)).toBeVisible();
  await expect.poll(() => fake.received.length).toBe(1);
  // airplane mode: the browser says so and every call to the backend fails to connect
  await context.setOffline(true);
  await page.route(`${POSTERN_ORIGIN}/**`, (route) => route.abort('internetdisconnected'));
  const box = page.locator('[data-ask-failed]');
  await expect(box.getByText('You are offline. Check your connection and try again.')).toBeVisible({ timeout: 5000 });
  await expect(box.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByText(/Waiting for the tutor…/)).toHaveCount(0);

  // Retry with the phone back on finds the answer to the grist that went; it does not send a second one
  await context.setOffline(false);
  await page.unroute(`${POSTERN_ORIGIN}/**`);
  await routePostern(page, fake);
  await box.getByRole('button', { name: 'Retry', exact: true }).click();
  await fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
  await expect(page.locator('[data-answer]')).toContainText(SYNERGEI_ANSWER.answer);
  expect(fake.received).toHaveLength(1);
});

test('Talk: the phone going offline while the tutor is still thinking says he is offline within a few seconds (mw-5r3p30.434)', async ({ page, context }) => {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('What is this verse about?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-talk-pending]').getByText(/Waiting for the tutor…/)).toBeVisible();
  await expect.poll(() => fake.received.length).toBe(1);
  await context.setOffline(true);
  await page.route(`${POSTERN_ORIGIN}/**`, (route) => route.abort('internetdisconnected'));
  await expect(sheet.locator('[data-talk-failed]').getByText('You are offline. Check your connection and try again.')).toBeVisible({ timeout: 5000 });
  await expect(sheet.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});
