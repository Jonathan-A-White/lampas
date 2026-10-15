// tests/e2e/read-aloud-anywhere.spec.ts — the small speaker (src/speech/ReadAloud.tsx) at a phone's width (features/read-aloud-anywhere.feature): on the
// Grammar sheet and on the idea sheet it sits at the top right of the heading, 44 px square, and a tap reads the sheet's words in the phone's voices, shows the
// speaking bar over the sheet and changes the button to Stop reading; the words stay on screen.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

async function openGrammar(page: Page) {
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await expect(grammar).toBeVisible();
  return grammar;
}

/** The speaker is a 44 px target at the right of the heading, on the heading's line. */
async function expectAtHeadingRight(sheet: ReturnType<Page['getByRole']>, heading: string) {
  const speaker = sheet.getByRole('button', { name: 'Read aloud', exact: true });
  const [button, title, box] = await Promise.all([
    speaker.boundingBox(),
    sheet.getByRole('heading', { name: heading }).boundingBox(),
    sheet.boundingBox(),
  ]);
  expect(button!.width).toBeGreaterThanOrEqual(43.5);
  expect(button!.height).toBeGreaterThanOrEqual(43.5);
  expect(button!.x + button!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(button!.x + button!.width).toBeGreaterThan(box!.x + box!.width - 30);
  expect(Math.abs(button!.y - title!.y)).toBeLessThan(14);
}

test('the Grammar sheet and the idea sheet carry a small speaker that reads them and stops on a second tap', async ({ page }) => {
  const grammar = await openGrammar(page);
  await expectAtHeadingRight(grammar, 'genitive');
  await grammar.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(grammar.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  const said = await spoken(page);
  expect(said.map((s) => s.text).join(' ')).toContain('genitive');
  // the bar with Pause and Stop is drawn over the sheet, and its words are still there
  await expect(grammar.getByRole('region', { name: 'Speaking' })).toBeVisible();
  await expect(grammar.getByTestId('grammar-explanation')).toBeVisible();
  await shot(page, 'read-aloud-grammar');
  await grammar.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(grammar.getByRole('button', { name: 'Read aloud', exact: true })).toBeVisible();

  await grammar.getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
  await expectAtHeadingRight(idea, 'The genitive case');
  await idea.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(idea.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  await expect(idea.getByRole('region', { name: 'Speaking' })).toBeVisible();
  expect((await spoken(page)).map((s) => s.text).join(' ')).toContain('What it is');
  await expect(idea.getByTestId('idea-what')).toBeVisible();
  await shot(page, 'read-aloud-idea');
});
