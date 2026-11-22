// tests/e2e/sermon-reader.spec.ts — Lampas reads a text sermon aloud in its own sheet (mw-ecpivg5.2, docs/sermons.md 'The reader') at 390x844 with a fake voice (voice-kit's honest speech, tests/support/honest-fakes.ts): a Spurgeon row of the
// Sermons sheet opens the reader under the default Open web sermons in 'Lampas, read aloud'; it shows the title and the paragraphs the sermon index service's GET /v1/text answers (a stub: no live service is asked), starts reading by itself,
// marks the paragraph read, has Play / Pause, Back, Forward, Restart and Stop at 44 px or more, says the time left and keeps his place; a browser that refuses speech without a tap gets one big Play; a text that cannot be had opens the sermon on the web.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

/** The sermon index service the build asks (src/config.ts SERMONS_URL, default); the stub allows any origin, as a preview server's origin is not the real one's. */
const SERVICE = 'https://sermons.allmymind.org';
const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
const SENTENCE = (n: number) => `Paragraph number ${n} of the sermon, read slowly by the fake voice, in words.`;
const PARAGRAPHS = [1, 2, 3, 4, 5].map(SENTENCE);

/** The service answers the text of a sermon (or the status given) and refuses every other ask, so the sheet stands on its bundled rows. */
async function serveText(page: Page, status = 200) {
  await page.route(`${SERVICE}/**`, (route) =>
    route.request().url().includes('/v1/text')
      ? route.fulfill(status === 200 ? { status, headers: CORS, body: JSON.stringify({ id: '104', title: 'Love Commended', source: 'spurgeon-ccel', url: 'https://ccel.org/x', paragraphs: PARAGRAPHS }) } : { status, headers: CORS, body: JSON.stringify({ error: 'no_text' }) })
      : route.abort(),
  );
}

/** Romans 5:8's Sermons sheet, its first row (a Spurgeon sermon at CCEL) tapped; the reader is named by the text's title, or by the row's until the text has come (`titled`). */
async function openFirstSermon(page: Page, titled = 'Love Commended') {
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const first = sheet.locator('[data-sermons-part="here"] a[data-sermon-row], [data-sermons-part="chapter"] a[data-sermon-row]').first();
  await expect(first).toHaveAttribute('data-sermon-reads', '');
  await expect(first.locator('[data-sermon-meta]')).toContainText('Read aloud here');
  await first.click();
  return page.getByRole('dialog', { name: titled });
}

const marked = (reader: ReturnType<Page['locator']>) => reader.locator('[data-sermon-paragraph]').evaluateAll((all) => all.findIndex((p) => p.hasAttribute('data-reading')));

test('a Spurgeon row opens the reader: title, paragraphs, reading by itself, the paragraph marked, controls of 44 px, time left, and his place kept', async ({ page }) => {
  await honestSpeech(page, { msPerWord: 2500 });
  await openUnlocked(page);
  await serveText(page);
  const reader = await openFirstSermon(page);
  await expect(reader.getByRole('heading', { name: 'Love Commended' })).toBeVisible();
  for (const p of PARAGRAPHS) await expect(reader.getByText(p, { exact: true })).toBeVisible();
  // it reads by itself, from the first paragraph, with the phone voice
  await expect.poll(async () => (await spoken(page)).map((s) => s.text).join(' ')).toContain('Paragraph number 1');
  await expect(reader.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(await marked(reader)).toBe(0);
  await expect(reader.locator('[data-sermon-left]')).toHaveText(/^(about \d+ min|less than a minute) left$/);
  // each control is 44 px or more and stays inside the sheet
  const sheetBox = (await reader.boundingBox())!;
  for (const name of ['Back a paragraph', 'Pause', 'Forward a paragraph', 'Restart', 'Stop', 'Close']) {
    const box = (await reader.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(43.5);
    expect(box.width, name).toBeGreaterThanOrEqual(43.5);
    expect(box.x, name).toBeGreaterThanOrEqual(sheetBox.x);
    expect(box.x + box.width, name).toBeLessThanOrEqual(sheetBox.x + sheetBox.width + 0.5);
    expect(box.y + box.height, name).toBeLessThanOrEqual(844);
  }
  await shot(page, 'sermon-reader');

  // Forward, Back, Pause and Play
  await reader.getByRole('button', { name: 'Forward a paragraph', exact: true }).click();
  await expect.poll(() => marked(reader)).toBe(1);
  await expect.poll(async () => (await spoken(page)).map((s) => s.text).join(' ')).toContain('Paragraph number 2');
  await reader.getByRole('button', { name: 'Back a paragraph', exact: true }).click();
  await expect.poll(() => marked(reader)).toBe(0);
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(reader.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await reader.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(reader.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  // his place is kept: two paragraphs on, Close, and the next opening goes on there
  await reader.getByRole('button', { name: 'Forward a paragraph', exact: true }).click();
  await reader.getByRole('button', { name: 'Forward a paragraph', exact: true }).click();
  await expect.poll(() => marked(reader)).toBe(2);
  await reader.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(reader).toBeHidden();
  await page.reload();
  const again = await openFirstSermon(page);
  await expect(again.getByRole('heading', { name: 'Love Commended' })).toBeVisible();
  await expect.poll(() => marked(again)).toBe(2);

  // the marked paragraph is in view in its box; Restart goes to the top, and Stop leaves it where it is
  await again.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect.poll(() => marked(again)).toBe(0);
  await again.getByRole('button', { name: 'Forward a paragraph', exact: true }).click();
  await again.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(again.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await marked(again)).toBe(1);
});

test('the marked paragraph is scrolled into view in the text box', async ({ page }) => {
  await honestSpeech(page, { msPerWord: 2500 });
  await openUnlocked(page);
  // longer paragraphs, so the five do not fit the box
  const long = PARAGRAPHS.map((p) => Array.from({ length: 12 }, () => p).join(' '));
  await page.route(`${SERVICE}/**`, (route) =>
    route.request().url().includes('/v1/text')
      ? route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ id: '104', title: 'Love Commended', source: 'spurgeon-ccel', url: 'https://ccel.org/x', paragraphs: long }) })
      : route.abort(),
  );
  const reader = await openFirstSermon(page);
  await expect.poll(() => marked(reader)).toBe(0);
  for (let i = 0; i < 3; i++) await reader.getByRole('button', { name: 'Forward a paragraph', exact: true }).click();
  await expect.poll(() => marked(reader)).toBe(3);
  const inView = async () => {
    const [box, text] = await Promise.all([reader.locator('[data-sermon-paragraph][data-reading]').boundingBox(), reader.locator('[data-sermon-text]').boundingBox()]);
    return box !== null && text !== null && box.y >= text.y - 1 && box.y < text.y + text.height;
  };
  await expect.poll(inView).toBe(true);
});

test('a browser that refuses speech without a tap gets one big Play button, and its tap reads', async ({ page }) => {
  await honestSpeech(page, { msPerWord: 400 });
  await page.addInitScript(() => {
    const synth = window.speechSynthesis;
    const speak = synth.speak.bind(synth);
    (window as unknown as { __refuse: boolean }).__refuse = true;
    synth.speak = (utterance) => {
      if (!(window as unknown as { __refuse: boolean }).__refuse) return speak(utterance);
      setTimeout(() => utterance.onerror?.({ type: 'error', error: 'not-allowed' } as SpeechSynthesisErrorEvent), 0);
    };
  });
  await openUnlocked(page);
  await serveText(page);
  const reader = await openFirstSermon(page);
  const play = reader.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toHaveAttribute('data-sermon-refused', '');
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(63.5);
  await shot(page, 'sermon-reader-tap');
  await page.evaluate(() => ((window as unknown as { __refuse: boolean }).__refuse = false));
  await play.click();
  await expect(reader.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(async () => (await spoken(page)).map((s) => s.text).join(' ')).toContain('Paragraph number 1');
});

test('when the text cannot be had the sermon opens on the web and the sheet says so once', async ({ page, context }) => {
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await serveText(page, 404);
  await context.route(/^https:\/\/(www\.)?ccel\.org\//, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>the sermon</title>' }));
  const opened = context.waitForEvent('page');
  const reader = await openFirstSermon(page, 'Love\'s Commendation');
  const tab = await opened;
  expect(tab.url()).toMatch(/^https:\/\/ccel\.org\/ccel\/spurgeon\//);
  await expect(reader.getByText('Lampas could not get the words of this sermon, so it opens on the web.')).toHaveCount(1);
  await expect(reader.getByRole('link', { name: 'Open on the web' })).toHaveAttribute('href', /^https:\/\/ccel\.org\/ccel\/spurgeon\//);
  expect(await spoken(page)).toEqual([]);
  await shot(page, 'sermon-reader-no-text');
});
