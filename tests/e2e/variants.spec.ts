// The Reader's variants (mw-9ji6ek0.5) at 390x844: Revelation 3:1-3 in English, Weave and Greek with Variants Off (as the text was) and On (the unit's words marked,
// a brace after them with the other reading and its witness chip), and the variants chip Off and On in the chips row under English | Weave | Greek (the header's own
// line is full at 390 px). A tap on the chip turns Variants on; a long press opens the filter sheet. Shots: shots/variants-<view>-<off|on>.png (verses 1 to 3, in a
// window made tall enough to hold them), variants-header-<off|on>.png (the header and the chips row), variants-sheet.png, variants-on-dark.png, and the whole page last.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const VIEWS = ['English', 'Weave', 'Greek'] as const;
const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });

/** The header and the chips row under it, as one picture. */
async function shootTop(page: Page, name: string): Promise<void> {
  const row = await page.getByTestId('reader-chips').boundingBox();
  await page.screenshot({ path: `shots/${name}.png`, clip: { x: 0, y: 0, width: 390, height: row!.y + row!.height } });
}

/** Verses 1 to 3, as one picture: the box from the top of verse 1 to the bottom of verse 3, in a window as wide as the phone and tall enough to hold them. */
async function shootVerses(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 1400 });
  const top = await page.locator('[data-verse="1"]').boundingBox();
  const bottom = await page.locator('[data-verse="3"]').boundingBox();
  expect(top && bottom).toBeTruthy();
  await page.screenshot({ path: `shots/${name}.png`, clip: { x: 0, y: top!.y, width: 390, height: bottom!.y + bottom!.height - top!.y } });
  await page.setViewportSize({ width: 390, height: 844 });
}

test('Revelation 3:1-3 with Variants Off and On, in English, Weave and Greek, and the variants chip', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3&weave=solid');
  await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();

  // Off: the chip is there, dim, and the text has no mark and no brace
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page)).toHaveText(/^⁑ \d+$/);
  const box = await chip(page).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390.5);
  // as tall as every chip of the row (the 40 px row less its bottom border, src/chipStyle.ts) and at least a thumb wide
  expect(box!.height).toBeGreaterThanOrEqual(38.5);
  expect(box!.width).toBeGreaterThanOrEqual(43.5);
  await shootTop(page, 'variants-header-off');
  for (const view of VIEWS) {
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-brace], [data-variant]')).toHaveCount(0);
    await shootVerses(page, `variants-${view.toLowerCase()}-off`);
  }

  // A tap turns Variants on: Those that change the English, the first time
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await shootTop(page, 'variants-header-on');
  for (const view of VIEWS) {
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    const braces = page.locator('[data-verse="2"] [data-brace]');
    await expect(braces.first()).toBeVisible();
    // the brace stands inside the frame, and its siglum is a 44 px square (mw-9ji6ek0.15)
    const brace = await braces.first().boundingBox();
    expect(brace!.x + brace!.width).toBeLessThanOrEqual(390.5);
    const siglum = await braces.first().locator('[data-witness]').first().boundingBox();
    expect(siglum!.height).toBeGreaterThanOrEqual(43.5);
    expect(siglum!.width).toBeGreaterThanOrEqual(43.5);
    await expect(page.locator('[data-verse="2"] [data-variant]').first()).toBeVisible();
    await expect(braces.first().locator('[data-witness]').first()).toHaveText(/^(B|NA|ECM)$/);
    await shootVerses(page, `variants-${view.toLowerCase()}-on`);
  }
  // English holds the English of the reading, Greek the Greek
  await choice(page, 'English').click();
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toHaveAttribute('data-brace-lang', 'english');
  await expect(page.locator('[data-verse="2"] [data-brace] [data-brace-text]').first()).toHaveText('keep');
  await choice(page, 'Greek').click();
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toHaveAttribute('data-brace-lang', 'greek');
  await expect(page.locator('[data-verse="2"] [data-brace] [data-brace-text]').first()).toHaveText('τήρησον');

  // the dark theme
  await page.emulateMedia({ colorScheme: 'dark' });
  await choice(page, 'English').click();
  await shootVerses(page, 'variants-on-dark');
  await page.emulateMedia({ colorScheme: 'light' });

  // a long press opens the filter sheet; Weave's own long press still flips the word order
  await holdFor(page, chip(page), 700);
  const sheet = page.getByRole('dialog', { name: 'Variants' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Variants in Settings' })).toBeVisible();
  // the sheet and its backdrop have finished coming in (src/index.css lp-sheet-in, lp-fade-in)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'variants-sheet');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
  await holdFor(page, choice(page, 'Weave'), 700);
  await expect(page.getByRole('status').filter({ hasText: 'Greek word order' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Variants' })).toHaveCount(0);

  await shot(page, 'variants');
});

// A tap on a brace opens the unit's sheet (mw-9ji6ek0.6, src/reader/VariantSheet.tsx): the text's reading and the other reading(s), each in Greek and English, the witness of
// each spelled out, Ask the tutor, and Back closes it. Shot: shots/variants-brace-sheet.png.
test('a tap on the siglum of the brace at Revelation 3:2 opens the sheet with both readings and the witness lines; Ask the tutor opens the verse talk; Back closes it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'Greek').click();
  const brace = page.locator('[data-verse="2"] [data-brace]').first();
  await expect(brace).toBeVisible();
  await expect(brace.locator('[data-brace-text]').first()).toHaveText('τήρησον');
  await brace.locator('[data-witness]').first().click();

  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { level: 2 })).toContainText('Revelation 3:2');
  const readings = sheet.locator('[data-variant-reading]');
  expect(await readings.count()).toBeGreaterThanOrEqual(2);
  // the text's own reading, then the other: each in Greek and in English
  await expect(readings.first().locator('[data-reading-greek]')).toHaveText(/\S/);
  await expect(readings.first().locator('[data-reading-english]').first()).toHaveText(/\S/);
  await expect(readings.nth(1).locator('[data-reading-greek]')).toHaveText('τήρησον');
  await expect(readings.nth(1).locator('[data-reading-english]')).toHaveText('keep');
  // the witness spelled out, one line each
  const lines = sheet.locator('[data-witness-line]');
  expect(await lines.count()).toBeGreaterThanOrEqual(1);
  for (const line of await lines.allTextContents()) {
    expect(line).toMatch(/^(B: the Byzantine text is split here|NA27\/NA28: Nestle-Aland reads this|NA27: Nestle-Aland \(27th edition\) reads this|NA28: Nestle-Aland \(28th edition\) reads this|ECM: the Editio Critica Maior reads this)$/);
  }
  await expect(sheet.getByRole('button', { name: 'Ask the tutor' })).toBeVisible();
  // the sheet and its backdrop have finished coming in (src/index.css lp-sheet-in, lp-fade-in)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'variants-brace-sheet');

  // Back closes it
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-verse="2"] [data-brace]').first()).toBeVisible();

  // Ask the tutor opens the verse's talk, as the Verse view's Ask does
  await brace.locator('[data-witness]').first().click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Ask the tutor' }).click();
  await expect(sheet).toHaveCount(0);
  const talk = page.getByRole('dialog', { name: 'Talk about Revelation 3:2' });
  await expect(talk).toBeVisible();
  // the question is ready to send in its box (mw-9ji6ek0.7)
  await expect(await talkField(talk)).toHaveValue('What is the difference, and does it change the sense?');
});

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them (as immersive-book.spec.ts does). */
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

// The Immersive reader shows the variants too (mw-9ji6ek0.12): with Variants 'english' the words of 3:2's unit are marked and its brace is drawn, a tap on the brace opens the sheet,
// and there is no chip (the bars slide away). With Variants Off there is neither mark nor brace in either reader. Shot: shots/variants-immersive.png.
test('the Immersive reader marks the variant words and draws the braces; a brace tap opens the sheet; Variants Off draws none', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  await keep(page, { immersiveReader: 'on', immersiveHint: 'off', variants: 'english', variantWitnesses: 'na' });
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  const brace = page.locator('[data-verse="2"] [data-brace]').first();
  await expect(brace).toBeVisible();
  await expect(page.locator('[data-verse="2"] [data-variant]').first()).toBeVisible();
  await expect(chip(page)).toHaveCount(0);
  await shot(page, 'variants-immersive');
  await brace.locator('[data-witness]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { level: 2 })).toContainText('Revelation 3:2');
  await page.goBack();
  await expect(sheet).toHaveCount(0);

  // Variants Off: nothing in the Immersive reader, and nothing in the plain one
  for (const immersive of ['on', 'off']) {
    await keep(page, { immersiveReader: immersive, variants: 'off' });
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
    await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
    await expect(page.locator('[data-brace], [data-variant]')).toHaveCount(0);
  }
});

// The dotted line stops at the last marked letter (mw-9ji6ek0.28): Immersive justifies its text, so the space after "strengthen" of Revelation 3:2, before the unit's brace, is stretched,
// and it used to be inside the run's span and so under the dots. The test finds the last letter of each run and reads the pixels of the dotted row from there to the next thing in the
// line: no dot (a pixel of the accent) in the space. Shot: shots/variants-immersive-justified.png (verse 2, the line magnified: the phone at twice the pixels).
test.describe('the dotted line under a variant run ends at its last letter in a justified line', () => {
  test.use({ deviceScaleFactor: 2 });

  test('3:2 in Immersive English: no dots in the stretched space before the brace', async ({ page }) => {
    await openUnlocked(page);
    await page.goto('/#/?b=rev&c=3');
    await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
    await keep(page, { immersiveReader: 'on', immersiveHint: 'off', variants: 'english', variantWitnesses: 'na' });
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
    await expect(page.locator('[data-verse="2"] [data-variant-run]').first()).toBeVisible();
    await expect(page.locator('[data-verse="2"] [data-brace]').first()).toBeVisible();
    expect(await page.locator('[data-verse="2"] [data-text]').evaluate((el) => getComputedStyle(el).textAlign)).toBe('justify');

    // each run's last fragment: where its box ends, where its last letter ends, and the room to the next thing on the line
    const runs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-verse="2"] [data-variant-run]')].map((run) => {
        const walker = document.createTreeWalker(run, NodeFilter.SHOW_TEXT);
        let last: Text | null = null;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim()) last = n as Text;
        const text = last!.textContent ?? '';
        const range = document.createRange();
        range.setStart(last!, text.trimEnd().length - 1);
        range.setEnd(last!, text.trimEnd().length);
        const letter = range.getBoundingClientRect();
        const boxes = [...run.getClientRects()];
        const box = boxes[boxes.length - 1];
        const next = run.nextElementSibling?.getBoundingClientRect();
        const sameLine = next !== undefined && Math.abs(next.top - box.top) < box.height;
        return { text: run.textContent ?? '', letterRight: letter.right, boxRight: box.right, boxBottom: box.bottom, nextLeft: sameLine ? next.left : letter.right + 12 };
      }),
    );
    expect(runs.length).toBeGreaterThan(0);

    const colour = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-accent)';
      document.body.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return { accent, background: getComputedStyle(document.body).backgroundColor };
    });
    const clear = await page.addStyleTag({ content: '[data-text] * { color: transparent !important; }' });
    for (const r of runs) {
      expect(r.boxRight, `the box of "${r.text}" ends ${(r.boxRight - r.letterRight).toFixed(1)} px past its last letter`).toBeLessThanOrEqual(r.letterRight + 1.5);
      const width = Math.max(r.nextLeft - r.letterRight - 1.5, 1);
      const picture = await page.screenshot({ clip: { x: r.letterRight + 1.5, y: r.boxBottom - 6, width, height: 6 } });
      const dots = await page.evaluate(
        async ({ data, accent, background }) => {
          const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const [a, b] = [rgb(accent), rgb(background)];
          const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4) if (dist([pixels[i], pixels[i + 1], pixels[i + 2]], a) < dist(a, b) / 2) count++;
          return count;
        },
        { data: picture.toString('base64'), ...colour },
      );
      expect(dots, `dots of the accent in the ${width.toFixed(1)} px after "${r.text}"`).toBe(0);
    }
    await clear.evaluate((el) => (el as Element).remove());
    await shot(page, 'variants-immersive-justified');
  });
});

// One even dotted line under a unit (mw-9ji6ek0.13): "for being alive," of 3:1 is the chunks "for " and "being alive, ", and each used to start its own dot pattern, so the dots crowded
// into a short dash where the two meet. The test reads the line's pixels: along the row of the dots, every dot (a run of the accent) is as long as the others and so is every
// gap, across the join. Shots: shots/variants-dots-<view>-<light|dark>.png (verse 1, the line magnified: the phone at twice the pixels).
test.describe('the dotted line under a variant unit is one even run of dots', () => {
  test.use({ deviceScaleFactor: 2 });

  /** Per contiguous group of marked words on one line, the lengths (device px) of the dots and of the gaps between them along the dotted row, found in a screenshot of the verse. */
  async function dotRuns(page: Page, verse: number): Promise<{ text: string; dots: number[]; gaps: number[] }[]> {
    const groups = await page.evaluate((n) => {
      const rects = [...document.querySelectorAll(`[data-verse="${n}"] [data-variant]`)].map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent ?? '', x: r.x, right: r.right, y: r.y, bottom: r.bottom };
      });
      const out: { text: string; x: number; right: number; y: number; bottom: number }[] = [];
      for (const r of rects) {
        const last = out[out.length - 1];
        if (last && Math.abs(last.y - r.y) < 2 && Math.abs(last.right - r.x) < 1.5) {
          last.text += r.text;
          last.right = r.right;
        } else out.push({ ...r });
      }
      return out;
    }, verse);
    expect(groups.length).toBeGreaterThan(0);
    const colour = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-accent)';
      document.body.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return { accent, background: getComputedStyle(document.body).backgroundColor };
    });
    // the words are drawn clear for the measure: a Greek letter in the accent that dips through the dotted row is not a dot
    const clear = await page.addStyleTag({ content: '[data-text] * { color: transparent !important; }' });
    const found: { text: string; dots: number[]; gaps: number[] }[] = [];
    for (const g of groups) {
      const picture = await page.screenshot({ clip: { x: Math.max(0, g.x), y: g.y, width: Math.min(390, g.right) - Math.max(0, g.x), height: g.bottom - g.y } });
      const runs = await page.evaluate(
        async ({ data, accent, background }) => {
          const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const [a, b] = [rgb(accent), rgb(background)];
          const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
          // a pixel is a dot's when it is nearer the accent than half way from the page's colour
          const on = (x: number, y: number) => dist([pixels[(y * img.width + x) * 4], pixels[(y * img.width + x) * 4 + 1], pixels[(y * img.width + x) * 4 + 2]], a) < dist(a, b) / 2;
          let best = 0;
          let row = 0;
          for (let y = 0; y < img.height; y++) {
            let count = 0;
            for (let x = 0; x < img.width; x++) if (on(x, y)) count++;
            if (count > best) [best, row] = [count, y];
          }
          const dots: number[] = [];
          const gaps: number[] = [];
          let x = 0;
          while (x < img.width) {
            const state = on(x, row);
            let end = x;
            while (end < img.width && on(end, row) === state) end++;
            // the first and the last run are cut by the box's edges
            if (x > 0 && end < img.width) (state ? dots : gaps).push(end - x);
            x = end;
          }
          return { dots, gaps };
        },
        { data: picture.toString('base64'), ...colour },
      );
      found.push({ text: g.text, ...runs });
    }
    await clear.evaluate((el) => (el as Element).remove());
    return found;
  }

  for (const scheme of ['light', 'dark'] as const) {
    for (const view of VIEWS) {
      test(`3:1 in ${view}, ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await openUnlocked(page);
        await page.goto('/#/?b=rev&c=3&weave=solid');
        await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
        await chip(page).click();
        await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
        await choice(page, view).click();
        await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-verse="1"] [data-variant]').first()).toBeVisible();
        const groups = await dotRuns(page, 1);
        // the unit stands in the English as the two chunks "for " and "being alive, ", in the Greek as two words: a group of more than one word is the join he saw
        const joined = groups.filter((g) => g.text.trim().includes(' '));
        expect(joined.length).toBeGreaterThan(0);
        for (const g of joined) {
          expect(g.dots.length, g.text).toBeGreaterThan(8);
          expect(Math.max(...g.dots) - Math.min(...g.dots), `dots of "${g.text}": ${g.dots.join(',')}`).toBeLessThanOrEqual(1);
          expect(Math.max(...g.gaps) - Math.min(...g.gaps), `gaps of "${g.text}": ${g.gaps.join(',')}`).toBeLessThanOrEqual(1);
        }
        await shot(page, `variants-dots-${view.toLowerCase()}-${scheme}`);
      });
    }
  }
});

// The tap target of a variant unit is its siglum (mw-9ji6ek0.15): the 'B' after 'and you live' of Revelation 3:1 opens the unit's sheet, at least 44 x 44 px and still a hit 8 px either side of its
// centre; the braces and the span between them are no target, and a word inside the variant opens the word popup as a word of the text does. Shot: shots/variants-siglum.png.
test.describe('a variant unit is opened by its siglum, and its words open the word popup', () => {
  const unit = (page: Page) => page.locator('[data-verse="1"] [data-brace]').first();
  const siglum = (page: Page) => unit(page).locator('[data-witness]').first();
  const wordSheet = (page: Page) => page.getByRole('dialog', { name: 'Word', exact: true });
  const variantSheet = (page: Page) => page.getByRole('dialog', { name: 'Variant reading' });

  async function open(page: Page, view: (typeof VIEWS)[number]): Promise<void> {
    await openUnlocked(page);
    await page.goto('/#/?b=rev&c=3');
    await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
    await chip(page).click();
    await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    await expect(unit(page)).toBeVisible();
  }

  test('English: the B after "and you live" is the target; 8 px either side of it opens the sheet; a word inside opens the word popup', async ({ page }) => {
    await open(page, 'English');
    await expect(unit(page).locator('[data-brace-text]').first()).toHaveText('and you live');
    const box = (await siglum(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.height).toBeGreaterThanOrEqual(43.5);
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    for (const x of [cx, cx - 8, cx + 8]) {
      await page.mouse.click(x, cy);
      await expect(variantSheet(page)).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      await page.goBack();
      await expect(variantSheet(page)).toHaveCount(0);
    }
    await shot(page, 'variants-siglum');
    // a word inside the variant opens the word popup, for that word
    await unit(page).locator('[data-brace-word]', { hasText: 'live' }).click();
    await expect(variantSheet(page)).toHaveCount(0);
    await expect(wordSheet(page)).toBeVisible();
    await expect(wordSheet(page).getByTestId('sheet-heading')).toContainText('and you live');
    await expect(wordSheet(page).getByTestId('sheet-word').filter({ hasText: 'ζῇς' })).toBeVisible();
    // the quiet source line: the word is from the variant, its siglum named
    await expect(wordSheet(page).getByTestId('sheet-variant')).toHaveText('in variant B');
  });

  test('Greek: a word the verse carries opens its card with lemma and parsing; a form it does not carry opens the form and Ask the tutor, nothing invented', async ({ page }) => {
    await open(page, 'Greek');
    // 3:1's other reading "καὶ ζῇς": both forms stand in the verse
    await unit(page).locator('[data-brace-word]', { hasText: 'ζῇς' }).click();
    await expect(wordSheet(page).getByTestId('sheet-word')).toHaveText('ζῇς');
    await expect(wordSheet(page).getByTestId('sheet-lemma')).toHaveText('ζάω');
    await expect(wordSheet(page).getByTestId('sheet-parse')).toHaveText(/\S/);
    await wordSheet(page).getByRole('button', { name: 'Done' }).click();
    await expect(wordSheet(page)).toHaveCount(0);
    // 3:18's other reading "ἔγχρισον" is a form no text of the New Testament has: the build leaves it untagged, so the card is the form alone
    const two = page.locator('[data-verse="18"] [data-brace]').filter({ hasText: 'ἔγχρισον' }).first();
    await two.locator('[data-brace-word]', { hasText: 'ἔγχρισον' }).click();
    await expect(wordSheet(page).getByTestId('sheet-word')).toHaveText('ἔγχρισον');
    await expect(wordSheet(page).getByTestId('sheet-lemma')).toHaveCount(0);
    await expect(wordSheet(page).getByTestId('sheet-gloss')).toHaveCount(0);
    await expect(wordSheet(page).getByTestId('sheet-strongs')).toHaveCount(0);
    await expect(wordSheet(page).getByRole('button', { name: 'Ask the tutor' })).toBeVisible();
    await wordSheet(page).getByRole('button', { name: 'Done' }).click();
    // a form the verse does not carry but the build tagged (mw-9ji6ek0.22): "ἀποθανεῖν" in the NA reading opens its card, which says "die"; the siglum still opens the sheet
    const die = page.locator('[data-verse="2"] [data-brace]').filter({ hasText: 'ἀποθανεῖν' }).first();
    await die.locator('[data-brace-word]', { hasText: 'ἀποθανεῖν' }).click();
    await expect(wordSheet(page).getByTestId('sheet-word')).toHaveText('ἀποθανεῖν');
    await expect(wordSheet(page).getByTestId('sheet-lemma')).toHaveText('ἀποθνήσκω');
    await expect(wordSheet(page).getByTestId('sheet-gloss')).toContainText('die');
    await wordSheet(page).getByRole('button', { name: 'Done' }).click();
    await expect(wordSheet(page)).toHaveCount(0);
    await die.getByRole('button', { name: /Nestle-Aland/ }).click();
    await expect(variantSheet(page)).toBeVisible();
  });

  test('English: "and" inside {and you live B} opens the card of καί; the sheet\'s own reading lines tap too, and the word card stacks over the sheet', async ({ page }) => {
    await open(page, 'English');
    await unit(page).locator('[data-brace-word]', { hasText: 'and' }).click();
    await expect(wordSheet(page)).toBeVisible();
    await expect(wordSheet(page).getByTestId('sheet-lemma').first()).toHaveText('καί');
    await expect(wordSheet(page).getByTestId('sheet-variant')).toHaveText('in variant B');
    await wordSheet(page).getByRole('button', { name: 'Done' }).click();
    // the sheet: its Greek and English reading lines are words he can tap
    await siglum(page).click();
    await expect(variantSheet(page)).toBeVisible();
    const reading = variantSheet(page).locator('[data-variant-reading]').nth(1);
    const words = reading.locator('[data-reading-greek] [data-sheet-word]');
    await expect(words).toHaveCount(2);
    for (const w of await words.all()) expect((await w.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
    await words.nth(1).click();
    await expect(wordSheet(page)).toBeVisible();
    await expect(wordSheet(page).getByTestId('sheet-word')).toHaveText('ζῇς');
    await expect(wordSheet(page).getByTestId('sheet-lemma')).toHaveText('ζάω');
    await wordSheet(page).getByRole('button', { name: 'Done' }).click();
    await expect(variantSheet(page)).toBeVisible();
    await reading.locator('[data-reading-english] [data-sheet-word]', { hasText: 'live' }).click();
    await expect(wordSheet(page).getByTestId('sheet-word').filter({ hasText: 'ζῇς' })).toBeVisible();
    await shot(page, 'variants-sheet-words');
  });

  test('every inline tappable mark of the reader is at least 44 x 44 px at 390 wide: the sigla and the verse numbers; the braces are no button', async ({ page }) => {
    await open(page, 'English');
    const marks = page.locator('[data-verse] [data-witness], [data-verse] [data-verse-number]');
    expect(await marks.count()).toBeGreaterThan(4);
    for (const mark of await marks.all()) {
      const b = (await mark.boundingBox())!;
      const name = (await mark.textContent()) ?? '';
      expect(b.width, `${name} wide`).toBeGreaterThanOrEqual(43.5);
      expect(b.height, `${name} tall`).toBeGreaterThanOrEqual(43.5);
    }
    await expect(page.locator('[data-brace][role="button"], [data-brace-reading][role="button"]')).toHaveCount(0);
  });
});

// The siglum never wraps away from its brace (mw-9ji6ek0.16): in Revelation 3:3 English the brace '{you will know B}' broke so that the boxed B stood alone on the next line. At 360, 390 and 412 px, in the
// English and the Greek view, on every brace of Revelation 2-3 and John 1: each reading's first word is on the line of the '{' that opens the brace, and each siglum and the '}' are on the line of the last word
// of the reading they close (a siglum's top is above the bottom of that word). Shot: shots/variants-siglum-wrap.png (Revelation 3:3, English, 360 px).
test.describe('a siglum stays on the line of the last word of its reading', () => {
  const WIDTHS = [360, 390, 412];
  const CHAPTERS = ['rev&c=2', 'rev&c=3', 'jhn&c=1'];

  /** Every brace on the page: the broken pairs, as text, with the places that break. */
  const broken = (page: Page) =>
    page.evaluate(() => {
      const out: string[] = [];
      const top = (el: Element) => el.getBoundingClientRect();
      for (const brace of document.querySelectorAll('[data-verse] [data-brace]')) {
        const verse = brace.closest('[data-verse]')?.getAttribute('data-verse');
        const name = `${verse}:${brace.textContent}`;
        const readings = [...brace.querySelectorAll('[data-brace-reading]')];
        const open = brace.firstElementChild!;
        const close = brace.querySelector('[data-brace-close]')!;
        const firstWord = readings[0].querySelector('[data-brace-word]') ?? readings[0].querySelector('[data-brace-text]')!;
        // the opening brace and the first word share a line: the word's box reaches the brace's top
        if (top(open).top >= top(firstWord).bottom - 1) out.push(`${name}: '{' apart from its first word`);
        readings.forEach((r, i) => {
          const words = r.querySelectorAll('[data-brace-word]');
          const last = words.length ? words[words.length - 1] : r.querySelector('[data-brace-text]')!;
          for (const s of r.querySelectorAll('[data-witness]')) {
            if (top(s).top >= top(last).bottom - 1) out.push(`${name}: siglum ${s.textContent} below the last word of reading ${i + 1}`);
          }
          if (i === readings.length - 1 && top(close).top >= top(last).bottom - 1) out.push(`${name}: '}' below the last word`);
        });
      }
      return out;
    });

  for (const width of WIDTHS) {
    for (const view of ['English', 'Greek'] as const) {
      test(`${view} at ${width} px: no brace breaks from its siglum`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await openUnlocked(page);
        for (const [n, chapter] of CHAPTERS.entries()) {
          await page.goto(`/#/?b=${chapter}`);
          await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
          if (n === 0) {
            await chip(page).click();
            await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
            await choice(page, view).click();
            await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
          }
          await expect(page.locator('[data-brace]').first()).toBeAttached();
          expect(await broken(page), `${chapter}`).toEqual([]);
        }
        if (view === 'English' && width === 360) {
          await page.goto('/#/?b=rev&c=3');
          await page.locator('[data-verse="3"] [data-brace]').first().scrollIntoViewIfNeeded();
          await shot(page, 'variants-siglum-wrap');
        }
      });
    }
  }
});

// Where the English comes from (mw-9ji6ek0.29): Matthew 3:3 reads 'spoken of through the prophet' on the page (the MSB's word, the NA reading), and the card used to say the text reads 'by' (the
// model's rendering of ὑπὸ) with no source on either. Now the card's 'The text reads' shows the page's 'through' captioned MSB, the model's 'by' under its own caption, and the captions are
// on the card only: the verse text carries none. Shot: shots/variants-sheet-source.png.
test('Matthew 3:3: the card names where each English line comes from, and the verse text carries no caption', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=mat&c=3');
  await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'English').click();
  const verse = page.locator('[data-verse="3"]');
  await expect(verse).toContainText('spoken of through');
  await expect(page.locator('[data-english-source]')).toHaveCount(0);
  await verse.locator('[data-brace] [data-witness]').first().click();

  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  const own = sheet.locator('[data-variant-reading]').first();
  await expect(own.locator('[data-reading-greek]')).toHaveText('ὑπὸ');
  await expect(own.locator('[data-reading-english]')).toHaveText(['through', 'by']);
  await expect(own.locator('[data-english-source]')).toHaveText(['MSB', 'Lampas (AI)']);
  const other = sheet.locator('[data-variant-reading]').nth(1);
  await expect(other.locator('[data-reading-english]')).toHaveText('through');
  await expect(other.locator('[data-english-source]')).toHaveText('Lampas (AI)');
  // every English line is followed by its caption
  for (const p of await sheet.locator('[data-reading-english]').all()) await expect(p.locator('xpath=following-sibling::*[1][@data-english-source]')).toHaveCount(1);
  // a caption is a 44 px target, and a tap says what the source is
  const box = await own.locator('[data-english-source]').first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await own.locator('[data-english-source]').first().click();
  await expect(sheet.locator('[data-english-source-says]')).toContainText('Majority Standard Bible');
  await shot(page, 'variants-sheet-source');
  await sheet.getByRole('button', { name: 'The sources, in the Preface' }).click();
  await expect(page).toHaveURL(/#\/preface$/);
  await expect(page.getByRole('heading', { name: 'Preface' })).toBeVisible();
});

// An omission unit marks the text (mw-9ji6ek0.30): Matthew 2:22 'reigning in {left out NA} Judea', where NA has no ἐπὶ. The MSB gives ἐπὶ no chunk of its own ('was reigning in' holds βασιλεύει),
// so the chunk it is folded into is dotted and the brace follows the dotted run; the NA siglum opens a sheet that names what is left out. Shot: shots/variants-omission-sheet.png.
test('Matthew 2:22 dots the English the left-out ἐπὶ is folded into, and the NA siglum opens a sheet that names what NA leaves out', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=mat&c=2');
  await expect(page.locator('[data-verse="22"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'English').click();
  await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');

  const verse = page.locator('[data-verse="22"]');
  const brace = verse.locator('[data-brace]', { hasText: 'left out' });
  await expect(brace).toBeVisible();
  // the dotted run ends in 'in', and the brace is the next thing after it
  const run = verse.locator('[data-variant-run]', { hasText: /reigning in/ });
  await expect(run).toHaveText(/\bin\s*$/);
  await expect(run.locator('[data-variant]')).not.toHaveCount(0);
  const dotted = await run.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(dotted).toContain('linear-gradient');
  expect(await run.evaluate((el) => el.nextElementSibling?.matches('[data-brace]'))).toBe(true);
  await verse.scrollIntoViewIfNeeded();

  await brace.locator('[data-witness]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-left-out]')).toHaveText('NA leaves out “over” (ἐπὶ)');
  await expect(sheet.locator('[data-variant-reading]').nth(1)).not.toHaveText(/^Other reading\s*left out\s*left out$/);
  await shot(page, 'variants-omission-sheet');
});
