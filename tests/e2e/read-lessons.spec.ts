// tests/e2e/read-lessons.spec.ts — Read lessons to me (features/read-lessons.feature) at a phone's width: Settings > Read aloud has it Off, switched On a Grammar sheet
// reads itself when it opens with its words still on screen, and a browser that refuses speech without a tap gets 'Tap to listen' beside the heading, inside the sheet.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 } });

async function switchOn(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Listening');
  const group = page.getByRole('group', { name: 'Read lessons to me' });
  await expect(group.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'On', exact: true }).click();
  await expect(group.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await leaveSettings(page);
}

async function openGrammar(page: Page) {
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar', exact: true });
  await expect(grammar).toBeVisible();
  return grammar;
}

test('with Read lessons to me On the Grammar sheet reads itself when it opens and its words stay', async ({ page }) => {
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/');
  await switchOn(page);
  const grammar = await openGrammar(page);
  await expect(grammar.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  expect((await spoken(page)).map((s) => s.text).join(' ')).toContain('genitive');
  await expect(grammar.getByTestId('grammar-explanation')).toBeVisible();
  await shot(page, 'read-lessons-on');
  await grammar.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(grammar.getByRole('button', { name: 'Read aloud', exact: true })).toBeVisible();
});

test('a browser that refuses speech without a tap gets a Tap to listen that fits the sheet', async ({ page }) => {
  await honestSpeech(page, { msPerWord: 400 });
  await page.addInitScript(() => {
    const synth = window.speechSynthesis;
    synth.speak = (utterance) => {
      setTimeout(() => utterance.onerror?.({ type: 'error', error: 'not-allowed' } as SpeechSynthesisErrorEvent), 0);
    };
  });
  await openUnlocked(page);
  await page.goto('/');
  await switchOn(page);
  const grammar = await openGrammar(page);
  const tap = grammar.getByRole('button', { name: 'Tap to listen', exact: true });
  await expect(tap).toBeVisible();
  const [button, title, box] = await Promise.all([tap.boundingBox(), grammar.getByRole('heading', { name: 'genitive', exact: true }).boundingBox(), grammar.boundingBox()]);
  expect(button!.height).toBeGreaterThanOrEqual(43.5);
  expect(button!.x).toBeGreaterThanOrEqual(box!.x);
  expect(button!.x + button!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(Math.abs(button!.y - title!.y)).toBeLessThan(14);
  await expect(grammar.getByTestId('grammar-explanation')).toBeVisible();
  await shot(page, 'read-lessons-tap-to-listen');
});
