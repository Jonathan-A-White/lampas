// tests/e2e/memorize-typing.spec.ts — Memorize's Type it with the keyboard up (mw-5r3p30.983, docs/layout/memorize.md 'Typing'): his picture, 1 Corinthians 10:13 at step 1 on a phone whose keyboard
// left 390x480: of a long verse only 'under it.' showed, the box was one line, Check was out of sight, Hold to say it kept a third of what was left and the ? sat on the box's corner.
// The rule: while the box is open the screen serves typing. The verse (as the step shows it) stays in its own scrolling area above the box, the box shows two lines or more, Check is in view,
// Hold to say it steps aside for 'Say it instead', nothing covers the box (the ? goes to the foot, beside Check) and no empty band stands between the last control and the keyboard.
// The keyboard is the window losing its height (index.html interactive-widget=resizes-content), as tests/e2e/talk-composer-keyboard.spec.ts does it. Greek and Hebrew on a gaps step, at the Text size 160 too.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ hasTouch: true });
test.describe.configure({ retries: 0 });

type Lang = 'en' | 'el' | 'he';
interface Case {
  name: string;
  lang: Lang;
  ref: string;
  heading: string;
  step: number;
  /** the phone before the keyboard, then with it */
  phone: { width: number; height: number };
  keyboard: { width: number; height: number };
  textSize: number;
}

const ENGLISH = { lang: 'en', ref: '1Cor.10.13', heading: '1 Corinthians 10:13', step: 0 } as const;
const GREEK = { lang: 'el', ref: '1Cor.10.13', heading: '1 Corinthians 10:13', step: 2 } as const;
const HEBREW = { lang: 'he', ref: 'Esth.8.9', heading: 'Esther 8:9', step: 2 } as const;
const PHONE_A = { phone: { width: 390, height: 844 }, keyboard: { width: 390, height: 480 } };
const PHONE_B = { phone: { width: 360, height: 640 }, keyboard: { width: 360, height: 340 } };

const CASES: Case[] = [
  { name: 'English step 1, 390x844 then 390x480', ...ENGLISH, ...PHONE_A, textSize: 100 },
  { name: 'English step 1, 360x640 then 360x340', ...ENGLISH, ...PHONE_B, textSize: 100 },
  { name: 'Greek gaps, 390x480', ...GREEK, ...PHONE_A, textSize: 100 },
  { name: 'Greek gaps, 390x480, Text size 160', ...GREEK, ...PHONE_A, textSize: 160 },
  { name: 'Greek gaps, 360x340', ...GREEK, ...PHONE_B, textSize: 100 },
  { name: 'Hebrew gaps, 390x480', ...HEBREW, ...PHONE_A, textSize: 100 },
  { name: 'Hebrew gaps, 390x480, Text size 160', ...HEBREW, ...PHONE_A, textSize: 160 },
  { name: 'Hebrew gaps, 360x340', ...HEBREW, ...PHONE_B, textSize: 100 },
];

/** Puts the verse on the schedule at `step`, due, the dials and keyboards On and the Text size, as Memorize and Settings write them. */
async function seed(page: Page, c: Case): Promise<void> {
  await page.evaluate(
    ({ ref, lang, step, textSize }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews', 'settings'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: `${lang}:${ref}`, step, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          for (const [key, value] of Object.entries({ greekInterest: '5', hebrewInterest: '5', greekKeyboard: 'on', hebrewKeyboard: 'on', textSize: String(textSize) })) {
            tx.objectStore('settings').put({ key, value });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { ref: c.ref, lang: c.lang, step: c.step, textSize: c.textSize },
  );
}

type Rect = { x: number; y: number; width: number; height: number; bottom: number; right: number };
const rectOf = async (target: Locator): Promise<Rect> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return { ...box, bottom: box.y + box.height, right: box.x + box.width };
};
const overlap = (a: Rect, b: Rect): boolean => a.x < b.right - 0.5 && b.x < a.right - 0.5 && a.y < b.bottom - 0.5 && b.y < a.bottom - 0.5;

for (const c of CASES) {
  test(`${c.heading} typed with the keyboard up: ${c.name}`, async ({ page }) => {
    await page.setViewportSize(c.phone);
    await page.clock.install();
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.locator('[data-verse]').first()).toBeVisible();
    await seed(page, c);
    await page.goto(`/#/memorize/${c.ref}/${c.lang}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: c.heading, level: 1 })).toBeVisible();
    await expect(page.getByTestId('memorize-verse')).toBeVisible();

    // the screen as it was, before Type it: Hold to say it at the foot
    await expect(page.getByRole('button', { name: 'Hold to say it' })).toBeVisible();
    await expect(page.locator('[data-typing]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Type it', exact: true }).click();
    const field = page.getByLabel(/^Type the verse/);
    await expect(field).toBeFocused();
    // the keyboard comes up: the window loses its height
    await page.setViewportSize(c.keyboard);
    await expect(field).toBeVisible();
    const height = c.keyboard.height;

    // the verse stays in view above the box, in its own area, whole in its scroll range
    const area = page.locator('[data-verse-area]');
    await expect(area).toBeVisible();
    await expect(area.getByTestId('memorize-verse')).toBeVisible();
    const tokens = area.locator('[data-token]');
    const count = await tokens.count();
    expect(count).toBeGreaterThan(8);
    const areaBox = await rectOf(area);
    const first = await rectOf(tokens.first());
    // (a word's own box can stand a few px above its line, so the line is judged by the word's middle and most of it showing)
    expect(first.y + first.height / 2).toBeGreaterThanOrEqual(areaBox.y);
    expect(first.y + first.height / 2).toBeLessThanOrEqual(Math.min(areaBox.bottom, height));
    await expect(tokens.first()).toBeInViewport({ ratio: 0.8 });
    expect(await area.evaluate((el) => el.scrollTop)).toBe(0);
    // its last word is reached by scrolling inside the area, and the screen's own scroll takes nothing away
    await area.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(tokens.last()).toBeInViewport({ ratio: 0.8 });
    const last = await rectOf(tokens.last());
    expect(last.y + last.height / 2).toBeLessThanOrEqual((await rectOf(area)).bottom);
    await area.evaluate((el) => el.scrollTo(0, 0));
    await expect(tokens.first()).toBeInViewport({ ratio: 0.8 });
    const pageScroll = await page.evaluate(() => ({ doc: document.documentElement.scrollTop, screen: [...document.querySelectorAll('.screen')].map((s) => s.scrollTop) }));
    expect(pageScroll.doc).toBe(0);
    expect(pageScroll.screen.every((top) => top === 0)).toBe(true);

    // the box shows two lines or more
    const lines = await field.evaluate((el) => {
      // the height of one line of this box's own type, set in a copy of it
      const style = getComputedStyle(el);
      const copy = document.createElement('div');
      copy.style.cssText = `position:absolute;visibility:hidden;font:${style.font};letter-spacing:${style.letterSpacing};line-height:${style.lineHeight}`;
      copy.setAttribute('lang', el.getAttribute('lang') ?? '');
      copy.className = el.className.split(' ').filter((n: string) => /^(font-greek|script-he|reader-hebrew)$/.test(n)).join(' ');
      copy.textContent = 'x';
      document.body.append(copy);
      const line = copy.getBoundingClientRect().height;
      copy.remove();
      return (el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / line;
    });
    expect(lines).toBeGreaterThanOrEqual(1.95);

    // Check is in the window with no scrolling
    const check = page.getByRole('button', { name: 'Check', exact: true });
    await expect(check).toBeInViewport({ ratio: 1 });
    const checkBox = await rectOf(check);
    expect(checkBox.bottom).toBeLessThanOrEqual(height);

    // nothing sits on the box: no other control's box meets it, the ? included, and what is under its corners and middle is the box
    const fieldBox = await rectOf(field);
    expect(fieldBox.bottom).toBeLessThanOrEqual(height);
    const door = page.getByRole('button', { name: 'Ask the tutor' });
    const others = page.locator('button:visible');
    const boxes: Rect[] = [];
    for (let i = 0; i < (await others.count()); i++) boxes.push(await rectOf(others.nth(i)));
    for (const other of boxes) expect(overlap(fieldBox, other), `a button at ${JSON.stringify(other)} meets the box ${JSON.stringify(fieldBox)}`).toBe(false);
    if ((await door.count()) > 0) expect(overlap(fieldBox, await rectOf(door.first()))).toBe(false);
    const hit = await field.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]].map(([x, y]) => el.contains(document.elementFromPoint(x, y)));
    });
    expect(hit).toEqual([true, true, true, true, true]);

    // no empty band: the lowest control is within 24 px of the foot of the window
    const lowest = Math.max(...boxes.map((b) => b.bottom), fieldBox.bottom);
    const band = height - lowest;
    console.log(`${c.heading} ${c.lang} ${c.keyboard.width}x${c.keyboard.height} text ${c.textSize}: band ${band.toFixed(1)} px, box ${lines.toFixed(1)} lines, verse area ${areaBox.height.toFixed(0)} px`);
    expect(band).toBeGreaterThanOrEqual(0);
    expect(band).toBeLessThan(24);
    const wide = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(wide.scrollWidth).toBeLessThanOrEqual(wide.clientWidth);
    if (c.keyboard.height === 480 && c.textSize === 100) await shot(page, `memorize-typing-${c.lang}`);

    // Hold to say it stepped aside, and a way back is one tap away; the box closes and the foot is as it was
    await expect(page.getByRole('button', { name: 'Hold to say it' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Say it instead', exact: true }).click();
    await expect(page.getByLabel(/^Type the verse/)).toHaveCount(0);
    await expect(page.locator('[data-typing]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hold to say it' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Type it', exact: true })).toBeVisible();
  });
}

test('the box open with the keyboard down keeps the phone bar floor under Check, and the ? stands beside it, not on the box', async ({ page }) => {
  const c: Case = { name: 'keyboard down', ...ENGLISH, ...PHONE_A, textSize: 100 };
  await page.setViewportSize(c.phone);
  await page.clock.install();
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seed(page, c);
  await page.goto(`/#/memorize/${c.ref}/${c.lang}`);
  await page.reload();
  await page.getByRole('button', { name: 'Type it', exact: true }).click();
  const field = page.getByLabel(/^Type the verse/);
  await expect(field).toBeVisible();
  const check = await rectOf(page.getByRole('button', { name: 'Check', exact: true }));
  const fieldBox = await rectOf(field);
  const door = await rectOf(page.getByRole('button', { name: 'Ask the tutor' }));
  // the window is as tall as the phone: Check has the 48 px floor of a navigation bar under it, and the ? stands over that floor beside Check
  expect(c.phone.height - check.bottom).toBeGreaterThanOrEqual(48);
  expect(overlap(fieldBox, door)).toBe(false);
  expect(overlap(check, door)).toBe(false);
  expect(c.phone.height - door.bottom).toBeGreaterThanOrEqual(48);
});
