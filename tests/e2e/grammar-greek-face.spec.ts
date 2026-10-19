import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Greek in the Grammar sheet's In Greek paragraph (mw-5r3p30.548) is marked Greek and drawn in the Greek face, as the examples beside it are.

test.use({ viewport: { width: 390, height: 844 } });

test('the Greek of the In Greek paragraph on the genitive Grammar sheet is lang el and in Gentium Plus, like the examples', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await expect(grammar).toBeVisible();

  const face = (el: Element) => getComputedStyle(el).fontFamily;
  const exampleFace = await grammar.getByTestId('grammar-example').first().locator('[lang="el"]').evaluate(face);
  expect(exampleFace.startsWith('"Gentium Plus"')).toBe(true);

  const paragraph = grammar.getByTestId('grammar-greek');
  const greek = paragraph.locator('[lang="el"]');
  expect(await greek.count()).toBeGreaterThan(0);
  for (const span of await greek.all()) expect(await span.evaluate(face)).toBe(exampleFace);
  await expect(paragraph).toContainText('ὁ λόγος τοῦ θεοῦ');
  await shot(page, 'grammar-greek-face');
});
