import { expect, test, type Locator, type Page } from '@playwright/test';
import { pageTime } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';

const VIEWPORT = { width: 390, height: 844 };

/** Headless Chromium stops at a link to an app scheme (an unanswered prompt eats the clicks that follow); the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

/** Turning an app On only turns it On (mw-5r3p30.116): nothing is opened, so nothing has to play the app taking the page away. */
const turnsOnWithApp = async (_page: Page, section: Locator, name: string): Promise<void> => {
  await section.getByRole('switch', { name, exact: true }).click();
};

test('Study resources at phone width: thumb-sized switches in Settings, and a Study row on the word sheet', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');

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
  // the books are in Your Logos library, not in Settings: one row says how many are on and opens it; no lexicon list, Grammar books or Works list is left
  const library = section.getByRole('button', { name: /^Your Logos library · \d+ books on$/ });
  await expect(library).toBeVisible();
  const row = await library.boundingBox();
  expect(row?.height).toBeGreaterThanOrEqual(43.5);
  expect((row?.x ?? 0) + (row?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await expect(section.getByRole('group', { name: 'Logos lexicons' })).toHaveCount(0);
  await expect(section.getByRole('group', { name: 'Grammar books' })).toHaveCount(0);
  await expect(section.getByRole('list', { name: 'Works in your Logos library' })).toHaveCount(0);
  await expect(section.getByRole('checkbox')).toHaveCount(0);
  await shot(page, 'settings-resources');

  // the row's count is the Library's, and its button opens the Library
  const counted = (await library.innerText()).match(/· (\d+) books on/)?.[1];
  await library.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await expect(page.getByTestId('library-card')).toContainText(`${counted} of the`);
  expect(new URL(page.url()).hash).toBe('#/library');
  // Louw-Nida is turned on there, on the Lexicons page
  await page.getByTestId('kind-row').filter({ hasText: 'Lexicons' }).getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Lexicons', level: 1 })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Louw-Nida', exact: true }).getByRole('radio', { name: 'On', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Louw-Nida', exact: true }).getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');

  await page.goto('/#/settings?group=study');
  await page.reload();
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await leaveSettings(page);
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  const study = page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('group', { name: 'Study', exact: true });
  await expect(study).toBeInViewport();
  await expect(study.getByRole('link', { name: 'G4903', exact: true })).toHaveAttribute('href', 'https://www.stepbible.org/?q=strong=G4903');
  const logos = study.getByRole('link', { name: 'Open in Logos: BDAG', exact: true });
  await expect(logos).toHaveAttribute('href', /^logosres:LLS:46\.30\.18;hw=/);
  await expect(logos).toHaveAttribute('data-fallback', /^https:\/\/ref\.ly\/logosres\/LLS%3A46\.30\.18\?hw=/);
  await expect(study.getByRole('link', { name: 'Open in Logos: Louw-Nida', exact: true })).toHaveAttribute('href', /^logosres:LLS:46\.30\.4;hw=/);
  await expect(study.getByRole('link', { name: 'Bible Word Study in Logos', exact: true })).toHaveAttribute('href', /^logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F[^;]+$/);
  await expect(study.getByText('G4903')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-strongs')).toHaveCount(0);
  const box = await logos.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'word-sheet-study');
});

test('Logos On at 360 px: the library row is one thumb-sized line and the setting below it is in reach (mw-rfjjzd.5)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 860 });
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  const logosSwitch = section.getByRole('switch', { name: 'Logos', exact: true });
  await turnsOnWithApp(page, section, 'Logos');

  // Logos' card is short now: the library line, and Accordance's switch is in view from the Logos switch with no scroll at all
  await expect(section.getByRole('button', { name: /^Your Logos library · \d+ books on$/ })).toBeVisible();
  await logosSwitch.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(section.getByRole('switch', { name: 'Accordance', exact: true })).toBeInViewport();
  // the library line sits between the Logos switch and Accordance's
  const order = await section.locator('[data-setting]').evaluateAll((els) => els.map((el) => el.getAttribute('data-setting')));
  expect(order.slice(order.indexOf('resource.logos'), order.indexOf('resource.logos') + 2)).toEqual(['resource.logos', 'library']);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'settings-logos-library');
});

test('The Study links are equal tiles in two columns at 360 px, and an app that does not open says so', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  await turnsOnWithApp(page, section, 'Logos');
  // the Lexham Theological Wordbook is turned On in Your Logos library (Lexicons), the way a book is now chosen
  await section.getByRole('button', { name: /^Your Logos library/ }).click();
  await page.getByTestId('kind-row').filter({ hasText: 'Lexicons' }).getByRole('button').click();
  const lexham = page.getByRole('radiogroup', { name: 'Lexham Theological Wordbook', exact: true }).getByRole('radio', { name: 'On', exact: true });
  await lexham.click();
  await expect(lexham).toHaveAttribute('aria-checked', 'true');
  await page.goBack();
  await page.goBack();
  await expect(section.getByRole('switch', { name: 'Accordance', exact: true })).toBeVisible();
  await section.getByRole('switch', { name: 'Accordance', exact: true }).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await turnsOnWithApp(page, section, 'Accordance');
  await leaveSettings(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();

  const study = page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('group', { name: 'Study', exact: true });
  const logos = study.getByRole('group', { name: 'Logos', exact: true });
  const tiles = logos.getByRole('link');
  await expect(tiles).toHaveText(['BDAG', 'Lexham Theological Wordbook', 'Bible Word Study']);
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
    expect(b.lines).toBeLessThanOrEqual(2);
  }
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(2);

  // Accordance is not on this phone: the tap leaves the page in front, and the sheet says so.
  await study.getByRole('group', { name: 'Accordance', exact: true }).getByRole('link').click();
  const sheet = page.getByRole('dialog', { name: 'App not on this phone' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Accordance isn't on this phone")).toBeVisible();
  const get = sheet.getByRole('link', { name: 'Get Accordance', exact: true });
  await expect(get).toHaveAttribute('href', /play\.google\.com\/store\/apps\/details\?id=com\.accordancebible\.accordance/);
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

test('Settings at 412 px: Accordance On opens nothing, stays On and offers Get Accordance', async ({ page }) => {
  await page.clock.install(); // pageTime waits on the page's clock, not the host's (tests/support/gesture.ts)
  await page.setViewportSize({ width: 412, height: 915 });
  await openUnlocked(page);
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = (url) => {
      (window as unknown as { opened: string[] }).opened.push(String(url));
      return null;
    };
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link) (window as unknown as { opened: string[] }).opened.push(link.href);
    }, true);
  });
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  const accordance = section.getByRole('switch', { name: 'Accordance', exact: true });
  await accordance.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(section.getByLabel('Accordance resource')).toHaveCount(0);
  await expect(section.getByText("Don't have Accordance?")).toHaveCount(0);
  await accordance.click();
  await expect(section.getByLabel('Accordance resource')).toBeVisible();
  await expect(section.getByText("Don't have Accordance?")).toBeVisible();
  const get = section.getByRole('link', { name: 'Get Accordance', exact: true });
  await expect(get).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.accordancebible.accordance');
  const box = await get.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(412);
  await pageTime(page, 3000);
  await expect(accordance).toHaveAttribute('aria-checked', 'true');
  await expect(section.getByText(/Looking for| found/)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened)).toEqual([]);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await accordance.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await shot(page, 'settings-accordance-on');
});
