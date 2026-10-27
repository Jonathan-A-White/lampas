import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Font setting is the face of the English Bible text (mw-5r3p30.820), also with Immersive reader On, where English verses are set in --font-book:
// "The phone's own" there is the phone's face (the app's labels' face), not a book serif; Literata, Atkinson Hyperlegible and Lexend are that face;
// the Greek keeps Gentium Plus and the Hebrew Noto Serif Hebrew under every choice. A computed-style claim: it runs under --project=shots (390x844).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

async function openReader(page: Page, font: string, immersive: 'on' | 'off', hash = '') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { font, immersiveReader: immersive, immersiveHint: 'off' });
  await page.evaluate((f) => localStorage.setItem('lampas.font', f), font);
  await page.goto(`/${hash}`);
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const familyOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
const GREEK = '[data-verse="1"][lang="el"], [data-verse="1"] [lang="el"]';
/** the face of the app's own labels: the Reader's verse-number button is drawn in --font-sans */
const labelFace = (page: Page) => familyOf(page, '[data-verse="1"] [data-verse-number]');

for (const immersive of ['on', 'off'] as const) {
  test(`Immersive ${immersive}: "The phone's own" sets the English verses in the same face as the labels`, async ({ page }) => {
    await openReader(page, 'phone', immersive);
    const verse = await familyOf(page, '[data-verse="1"]');
    expect(verse).toBe(await labelFace(page));
    expect(verse).not.toMatch(/Georgia|Noto Serif|Times New Roman/);
    expect(verse).toMatch(/system-ui|sans-serif/);
    await shot(page, `font-phone-immersive-${immersive}`);
  });
}

for (const [font, face] of [['literata', 'Literata'], ['atkinson', 'Atkinson Hyperlegible'], ['lexend', 'Lexend']] as const) {
  for (const immersive of ['on', 'off'] as const) {
    test(`Immersive ${immersive}: ${face} sets the English verses in ${face}`, async ({ page }) => {
      await openReader(page, font, immersive);
      const verse = await familyOf(page, '[data-verse="1"]');
      expect(verse).toContain(face);
      expect(await labelFace(page)).toContain(face);
    });
  }
}

for (const font of ['phone', 'literata', 'atkinson', 'lexend']) {
  test(`Immersive on, Font ${font}: the Greek keeps Gentium Plus and the Hebrew Noto Serif Hebrew`, async ({ page }) => {
    await openReader(page, font, 'on', '#/?b=rom&c=8&view=greek');
    const greek = await familyOf(page, GREEK);
    expect(greek).toContain('Gentium Plus');
    expect(greek).not.toMatch(/Literata|Atkinson|Lexend/);
    await page.goto('/#/?b=gen&c=1');
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew' }).click();
    await expect(page.locator('[data-verse="1"]')).toHaveAttribute('lang', 'he');
    const hebrew = await familyOf(page, '[data-verse="1"]');
    expect(hebrew).toContain('Noto Serif Hebrew');
    expect(hebrew).not.toMatch(/Literata|Atkinson|Lexend/);
  });
}
