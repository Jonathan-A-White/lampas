import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

/** Turning an app On opens it to see it is on the phone (mw-5r3p30.68): headless Chromium has no Logos, so the test plays the app taking the
 *  page away (a blur) after the tap, which is what a phone with the app does. */
/** Headless Chromium stops at a link to an app scheme (an unanswered prompt eats the clicks that follow); the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

const turnsOnWithApp = async (page: Page, section: Locator, name: string): Promise<void> => {
  await section.getByRole('switch', { name, exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
};

test('Study resources at phone width: thumb-sized switches in Settings, and a Study row on the word sheet', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  for (const name of ["Strong's", 'Logos', 'Accordance']) {
    const control = section.getByRole('switch', { name, exact: true });
    await expect(control).toHaveAttribute('aria-checked', 'false');
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await turnsOnWithApp(page, section, 'Logos');
  const bdag = section.getByRole('checkbox', { name: 'BDAG', exact: true });
  await expect(bdag).toHaveAttribute('aria-checked', 'true');
  const louw = section.getByRole('checkbox', { name: 'Louw-Nida', exact: true });
  await louw.scrollIntoViewIfNeeded();
  await louw.click();
  await expect(louw).toHaveAttribute('aria-checked', 'true');
  const tick = await louw.boundingBox();
  expect(tick?.height).toBeGreaterThanOrEqual(43.5);
  expect((tick?.x ?? 0) + (tick?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await shot(page, 'settings-resources');

  await page.reload();
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  const study = page.getByRole('dialog', { name: 'Word' }).getByRole('group', { name: 'Study' });
  await expect(study).toBeInViewport();
  await expect(study.getByRole('link', { name: 'G4903', exact: true })).toHaveAttribute('href', 'https://www.stepbible.org/?q=strong=G4903');
  const logos = study.getByRole('link', { name: 'Open in Logos: BDAG', exact: true });
  await expect(logos).toHaveAttribute('href', /^logosres:LLS:46\.30\.18;hw=/);
  await expect(logos).toHaveAttribute('data-fallback', /^https:\/\/ref\.ly\/logosres\/LLS%3A46\.30\.18\?hw=/);
  await expect(study.getByRole('link', { name: 'Open in Logos: Louw-Nida', exact: true })).toHaveAttribute('href', /^logosres:LLS:46\.30\.4;hw=/);
  await expect(study.getByRole('link', { name: 'Bible Word Study in Logos', exact: true })).toHaveAttribute('href', /^logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F[^;]+$/);
  await expect(study.getByText('G4903')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-strongs')).toHaveCount(0);
  const box = await logos.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'word-sheet-study');
});

test('The Logos lexicons are a compact list at 360 px: bounded height, its own scroll, a search, and Accordance below it in reach', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  const logosSwitch = section.getByRole('switch', { name: 'Logos', exact: true });
  await turnsOnWithApp(page, section, 'Logos');

  const list = section.getByRole('group', { name: 'Logos lexicons' });
  const box = list.getByTestId('searchable-list-box');
  const size = await box.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight, overflowY: getComputedStyle(el).overflowY }));
  expect(size.overflowY).toBe('auto');
  expect(size.client).toBeLessThanOrEqual(300);
  expect(size.scroll).toBeGreaterThan(size.client * 2);

  // The setting below the Logos card is one screen away, not 21 rows away.
  await logosSwitch.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(section.getByRole('switch', { name: 'Accordance', exact: true })).toBeInViewport();

  // BDAG (ticked) leads; the last lexicon is out of sight until the box scrolls.
  await expect(list.getByRole('checkbox').first()).toHaveAccessibleName('BDAG');
  const last = list.getByRole('checkbox', { name: 'A Greek-English Lexicon of the New Testament', exact: true });
  await expect(last).not.toBeInViewport();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();

  const search = list.getByRole('searchbox', { name: 'Search Logos lexicons' });
  const field = await search.boundingBox();
  expect(field?.height).toBeGreaterThanOrEqual(43.5);
  await search.fill('louw');
  await expect(list.getByRole('checkbox')).toHaveCount(1);
  await list.getByRole('checkbox', { name: 'Louw-Nida', exact: true }).click();
  await expect(list.getByRole('checkbox', { name: 'Louw-Nida', exact: true })).toHaveAttribute('aria-checked', 'true');
  await search.fill('');
  await expect(list.getByRole('checkbox')).toHaveCount(21);
  await expect(list.getByRole('checkbox').first()).toHaveAccessibleName('BDAG');
  await expect(list.getByRole('checkbox').nth(1)).toHaveAccessibleName('Louw-Nida');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await logosSwitch.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'settings-logos-list');
});

test('The Study links are equal tiles in two columns at 360 px, and an app that does not open says so', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  await turnsOnWithApp(page, section, 'Logos');
  const lexham = section.getByRole('checkbox', { name: 'Lexham Theological Wordbook', exact: true });
  await lexham.scrollIntoViewIfNeeded();
  await lexham.click();
  await section.getByRole('switch', { name: 'Accordance', exact: true }).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await turnsOnWithApp(page, section, 'Accordance');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();

  const study = page.getByRole('dialog', { name: 'Word' }).getByRole('group', { name: 'Study', exact: true });
  const logos = study.getByRole('group', { name: 'Logos', exact: true });
  const tiles = logos.getByRole('link');
  await expect(tiles).toHaveText(['BDAG', 'Lexham', 'Word Study']);
  const boxes = await study.getByRole('link').evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    const label = el.querySelector('span') as HTMLElement;
    return { x: r.x, w: r.width, h: r.height, right: r.right, wrapped: label.scrollWidth > label.clientWidth, lines: Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight)) };
  }));
  expect(boxes).toHaveLength(4);
  for (const b of boxes) {
    expect(b.h).toBeGreaterThanOrEqual(47.5);
    expect(b.w).toBeCloseTo(boxes[0].w, 0);
    expect(b.right).toBeLessThanOrEqual(360);
    expect(b.wrapped).toBe(false);
    expect(b.lines).toBe(1);
  }
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(2);

  // Accordance is not on this phone: the tap leaves the page in front, and the sheet says so.
  await study.getByRole('group', { name: 'Accordance', exact: true }).getByRole('link').click();
  const sheet = page.getByRole('dialog', { name: 'App not on this phone' });
  await expect(sheet).toBeVisible({ timeout: 4000 });
  await expect(sheet.getByText("Accordance isn't on this phone")).toBeVisible();
  const get = sheet.getByRole('link', { name: 'Get Accordance', exact: true });
  await expect(get).toHaveAttribute('href', /play\.google\.com\/store\/search\?q=Accordance/);
  const off = sheet.getByRole('button', { name: 'Turn off Accordance', exact: true });
  for (const control of [get, off]) {
    const b = await control.boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(360);
    expect(b?.height).toBeLessThan(60); // one line of text
  }
  await shot(page, 'app-missing-sheet');
  await off.click();
  await expect(sheet).toHaveCount(0);
  await expect(study.getByRole('group', { name: 'Accordance', exact: true })).toHaveCount(0);
  await expect(study.getByRole('group', { name: 'Logos', exact: true })).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'word-sheet-study-grid');
});

test('Settings: Accordance is not on this phone, so its switch goes back Off and Install is offered there', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  const accordance = section.getByRole('switch', { name: 'Accordance', exact: true });
  await accordance.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await accordance.click();
  await expect(section.getByText("Accordance isn't on this phone")).toBeVisible({ timeout: 4000 });
  await expect(accordance).toHaveAttribute('aria-checked', 'false');
  const install = section.getByRole('link', { name: 'Install Accordance', exact: true });
  await expect(install).toHaveAttribute('href', /play\.google\.com\/store\/search\?q=Accordance/);
  const b = await install.boundingBox();
  expect(b?.height).toBeGreaterThanOrEqual(47.5);
  expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await shot(page, 'settings-app-missing');
});
