// tests/e2e/feedback-loop-demo.spec.ts — the DEMO of the feedback-loop epic (mw-vy3ghg.7), at 390x844 against the fake Postern: the whole loop in one walk.
// He sends three requests (one the tutor offered to the makers, two from Settings > Ask for another approach); the fake mill then seals each status the
// real mill would (protocol section 19: filed, building, landed with its version and commit link, declined with its reason, adopted as a setting) to his
// phone's key, and Your requests shows each stage; at the end he asks the tutor 'What happened to my idea?' and the request goes out carrying what became
// of each. A shot after every stage: your-requests-demo-1-sent ... -6-tutor. The statuses are pulled when the screen opens (a reload stands for opening it).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked, SEED_PUBLIC_KEY } from './unlocked';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 } });

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const COMMIT_URL = `https://github.com/Jonathan-A-White/lampas/commit/${COMMIT}`;
const OLIVE = 'He wants Lampas to work with the Olive Tree app, as it does with Logos.';
const COLOURS = 'Teach the cases with colours, one at a time.';
const SEPIA = 'A sepia reading theme for the evening.';

const OFFER = {
  answer: 'Lampas does not work with Olive Tree. I can pass your wish to the makers; I cannot say what they will decide.',
  words: [],
  feedback_offer: { summary: OLIVE },
};
const WHAT_HAPPENED = {
  answer:
    'Your cases-with-colours idea was adopted in version 0.1.109. The Olive Tree idea was declined: outside what this app is for. And the sepia theme is now a setting: Settings > Appearance > Theme.',
  words: [],
};

/** Sends the request the tutor offered: asks on the Words screen, then 'Send this to the makers'. */
async function sendFromTutor(page: Page, fake: FakePostern): Promise<void> {
  fake.kindReplies['bible-talk'] = { status: 'answered', answer: OFFER };
  await page.goto('/#/words');
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Words' });
  await (await talkField(sheet)).fill('Can this work with Olive Tree?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.getByRole('button', { name: 'Send this to the makers' }).click();
  await expect(sheet.getByText('Sent', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(sheet).toHaveCount(0);
}

/** Sends an approach from Settings > Ask for another approach, as the sheet does: his words and who to credit. */
async function sendApproach(page: Page, text: string): Promise<void> {
  await page.goto('/#/settings?group=greek');
  const open = page.getByRole('button', { name: 'Ask for another approach' });
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const sheet = page.getByRole('dialog', { name: 'Ask for another approach' });
  await sheet.getByLabel('What approach, and how does it teach?').fill(text);
  await sheet.getByLabel('Who to credit', { exact: true }).fill('Anna Example');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
}

/** The mill's request-status record for the nth request sent (protocol section 19), sealed to the phone's key. */
function mill(fake: FakePostern, index: number, plain: Record<string, unknown>): void {
  fake.sendStatus(SEED_PUBLIC_KEY, { kind: 'request-status', request: fake.txids[index], bead: `mw-demo.${index + 1}`, ts: Date.now() + fake.calls.length, ...plain });
}

async function openRequests(page: Page): Promise<void> {
  await page.goto('/#/requests');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
}

/** The line a request reads, found by its words. */
const lineOf = (page: Page, words: string) => page.locator('[data-request]', { hasText: words }).locator('[data-request-status]');

async function fitsThePhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test('the feedback loop end to end: sent, filed, building, adopted with its link, declined, now a setting, and the tutor knows', async ({ page }) => {
  const fake = makeFakePostern();
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);

  // 1. He sends three requests; the phone keeps each one with the grist's id, and each reads Sent.
  await sendFromTutor(page, fake);
  await sendApproach(page, COLOURS);
  await sendApproach(page, SEPIA);
  expect(fake.received.filter((g) => g.grist.kind === 'feedback').map((g) => g.input.kind)).toEqual(['tutor-ask', 'grammar-approach', 'grammar-approach']);
  const feedbackTxids = fake.received.flatMap((g, i) => (g.grist.kind === 'feedback' ? [fake.txids[i]] : []));
  expect(feedbackTxids).toHaveLength(3);
  // `mill` indexes fake.txids, so find each feedback grist's place in it
  const at = (n: number): number => fake.txids.indexOf(feedbackTxids[n]);
  const [olive, colours, sepia] = [at(0), at(1), at(2)];

  await openRequests(page);
  await expect(page.locator('[data-request]')).toHaveCount(3);
  for (const words of [OLIVE, COLOURS, SEPIA]) await expect(lineOf(page, words)).toHaveText('Sent');
  await expect(page.locator('[data-request]').first()).toContainText(SEPIA); // the newest first
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-1-sent');

  // 2. The Mayor files them: every request reads Filed.
  for (const index of [olive, colours, sepia]) mill(fake, index, { status: 'filed' });
  await page.reload();
  for (const words of [OLIVE, COLOURS, SEPIA]) await expect(lineOf(page, words)).toHaveText('Filed');
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-2-filed');

  // 3. The factory starts on one: Being built.
  mill(fake, colours, { status: 'building' });
  await page.reload();
  await expect(lineOf(page, COLOURS)).toHaveText('Being built');
  await expect(lineOf(page, OLIVE)).toHaveText('Filed');
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-3-building');

  // 4. It lands: Adopted in 0.1.109, a link to the commit that is a thumb tall.
  mill(fake, colours, { status: 'landed', version: '0.1.109', commit: COMMIT, url: COMMIT_URL });
  await page.reload();
  await expect(lineOf(page, COLOURS)).toHaveText('Adopted in 0.1.109');
  const link = page.getByRole('link', { name: 'Adopted in 0.1.109' });
  await expect(link).toHaveAttribute('href', COMMIT_URL);
  await expect(link).toHaveAttribute('target', '_blank');
  expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-4-landed');

  // 5. One is declined with its reason, one adopted as a setting.
  mill(fake, olive, { status: 'declined', reason: 'outside what this app is for' });
  mill(fake, sepia, { status: 'adopted-as-setting', setting: 'Settings > Appearance > Theme' });
  await page.reload();
  await expect(lineOf(page, OLIVE)).toHaveText('Declined: outside what this app is for');
  await expect(lineOf(page, SEPIA)).toHaveText('Now a setting: Settings > Appearance > Theme');
  await expect(lineOf(page, COLOURS)).toHaveText('Adopted in 0.1.109');
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-5-answered');

  // 6. He asks the tutor 'What happened to my idea?' from the screen: the request carries what became of each, the answer says it.
  fake.kindReplies['bible-talk'] = { status: 'answered', answer: WHAT_HAPPENED };
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Your requests' });
  await sheet.locator('[data-suggestion]', { hasText: 'What happened to my idea?' }).click();
  await expect(sheet.getByText('adopted in version 0.1.109', { exact: false })).toBeVisible();
  const asked = fake.received.filter((g) => g.grist.kind === 'bible-talk').at(-1);
  expect(asked?.input.requests).toEqual([
    { summary: SEPIA, status: 'adopted-as-setting', setting: 'Settings > Appearance > Theme' },
    { summary: COLOURS, status: 'landed', version: '0.1.109' },
    { summary: OLIVE, status: 'declined', reason: 'outside what this app is for' },
  ]);
  await fitsThePhone(page);
  await shot(page, 'your-requests-demo-6-tutor');
});
