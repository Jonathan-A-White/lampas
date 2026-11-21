// A Weave with words he is learning draws each woven word as a stack: the Hebrew (or Greek) over its English gloss (mw-5r3p30.1221, docs/layout/reader.md 'Weave layout').
// His two pictures, Isaiah 12 at 412 px: a woven word ran off the right edge, another was drawn over the next English word, the lines had uneven gaps, and a wrapped line of
// Immersive's justified text was stretched. The cause of the first two: a poetry line hangs its first line (text-indent -1.5em), the stack inherited it, and its Hebrew was 24 px
// narrower than its text. Measured here as boxes (a Range over the words' own text), at 360 and 412 px, Immersive on.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

/** The lemmas a chapter's words name (public/data/<book>/<n>.json), NFC as the weave reads them. */
function lemmasOf(book: string, chapter: number, from = 1, to = 999): string[] {
  const file = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as { verses: { n: number; g: { l: string }[] }[] };
  const out = new Set<string>();
  for (const v of file.verses) if (v.n >= from && v.n <= to) for (const w of v.g) if (w.l) out.add(w.l.normalize('NFC'));
  return [...out];
}

// The words of his two pictures: 12:2's 'the LORD' (יָהּ), 'GOD' (יְהֹוָה), 'my salvation' and the rest of the verse.
const ISAIAH_12 = ['יְשׁוּעָה', 'יָהּ', 'יְהֹוָה', 'עֹז', 'זִמְרָת', 'שָׂשׂוֹן', 'מַי', 'שָׁאַב', 'מַעְיָן', 'הָיָה', 'בָּטַח'];

/** Opens a chapter in the Weave 'Solid and learning words' with these lemmas learning and Immersive On, once the page has written them to its own store. */
async function open(page: Page, query: string, lemmas: string[], first: number) {
  await openUnlocked(page, { empty: true });
  await page.goto('/');
  await expect(page.locator('[data-reader]')).toBeVisible();
  const now = Date.now();
  await page.evaluate(
    ([list, since]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('lampas');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['words', 'settings'], 'readwrite');
          for (const lemma of list as string[]) tx.objectStore('words').put({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'learning', since });
          tx.objectStore('settings').put({ key: 'immersiveReader', value: 'on' });
          tx.objectStore('settings').put({ key: 'immersiveHint', value: 'off' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [lemmas, now] as const,
  );
  // a fresh load of the address: a hash change on the running page writes its saved Weave (off) back into the address
  await page.goto('about:blank');
  await page.goto(`/#/?${query}&weave=solid%2Blearning`);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  const verse = page.locator(`[data-verse="${first}"]`);
  await expect(verse).toBeVisible();
  await expect(page.locator('[data-verse] [data-woven][data-learning]').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Seen {
  /** the text of each stack: the word's box and its gloss's, per woven chunk */
  woven: { verse: number; chunk: string; word: Box; gloss: Box }[];
  /** the text of every other chunk of English, one box per line it is on */
  english: { verse: number; chunk: string; box: Box }[];
  column: Box;
  scroll: number;
  client: number;
  /** per verse: each visual line's baseline, its plain height, the tallest gloss on it, and whether it opens a stanza (a margin above it) */
  rows: { verse: number; baseline: number; gloss: number; plain: number; stanza: boolean }[];
}

/** Every box the claims below measure, in one pass over the verses `from` to `to`. A box is a Range over the words' own text, not the 44 px tap box around it. */
async function look(page: Page, from: number, to: number): Promise<Seen> {
  return page.evaluate(
    ([a, b]) => {
      const box = (r: DOMRect | DOMRectReadOnly): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      // a word's sides are its text's (a box too narrow for it shows as the text running out of the box), its top and bottom the box's: a font's content area (Hebrew's is 1.75 em) reaches past the line it is set in
      const text = (el: Element): Box => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        return { left: t.left, right: t.right, top: b.top, bottom: b.bottom };
      };
      // the boxes of an element's own text, one per line it is on (not the boxes of the elements around it)
      const textRects = (el: Element): DOMRect[] => {
        const out: DOMRect[] = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of Array.from(range.getClientRects())) if (r.width > 0) out.push(r);
        }
        return out.sort((x, y) => x.top - y.top || x.left - y.left);
      };
      const seen: Seen = { woven: [], english: [], column: box(document.querySelector('[data-reader-text]')!.getBoundingClientRect()), scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, rows: [] };
      for (const verse of Array.from(document.querySelectorAll('[data-verse]'))) {
        const n = Number(verse.getAttribute('data-verse'));
        if (n < (a as number) || n > (b as number)) continue;
        for (const chunk of Array.from(verse.querySelectorAll('[data-text] [data-chunk]'))) {
          const id = chunk.getAttribute('data-chunk')!;
          const greek = chunk.querySelector('[data-greek]');
          const hint = chunk.querySelector('[data-hint]');
          if (chunk.hasAttribute('data-woven') && greek && hint) seen.woven.push({ verse: n, chunk: id, word: text(greek), gloss: text(hint) });
          else if (!chunk.hasAttribute('data-woven')) {
            for (const r of textRects(chunk)) seen.english.push({ verse: n, chunk: id, box: box(r) });
          }
        }
        // each visual line's top: a stack is set to the top of its line, and an English fragment's line starts a half-leading above its text (the line height less the text's own height, halved)
        const plain = parseFloat(getComputedStyle(verse).lineHeight);
        const marks: { baseline: number; gloss: number; stanza: boolean; line: Element | null }[] = [];
        for (const chunk of Array.from(verse.querySelectorAll('[data-text] [data-chunk]'))) {
          const line = chunk.closest('[data-line]');
          const stanza = parseFloat(getComputedStyle(line ?? chunk).marginTop) > 0;
          const hint = chunk.querySelector('[data-hint]');
          const greek = chunk.querySelector('[data-greek]');
          if (hint && greek) {
            marks.push({ baseline: greek.parentElement!.getBoundingClientRect().top, gloss: hint.getBoundingClientRect().height, stanza, line });
            continue;
          }
          textRects(chunk).forEach((r, k) => marks.push({ baseline: r.top - (plain - r.height) / 2, gloss: 0, stanza: stanza && k === 0, line }));
        }
        marks.sort((x, y) => x.baseline - y.baseline);
        // only the first row of a stanza's line has the margin above it
        const opened = new Set<Element | null>();
        for (const m of marks) {
          const first = !opened.has(m.line);
          opened.add(m.line);
          m.stanza = m.stanza && first;
        }
        for (const m of marks) {
          const last = seen.rows.at(-1);
          if (last && last.verse === n && Math.abs(last.baseline - m.baseline) < 3) {
            last.gloss = Math.max(last.gloss, m.gloss);
            last.stanza = last.stanza || m.stanza;
          }
          else seen.rows.push({ verse: n, baseline: m.baseline, gloss: m.gloss, plain, stanza: m.stanza });
        }
      }
      return seen;
    },
    [from, to] as const,
  );
}

const overlap = (x: Box, y: Box) => Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1;
const name = (v: number, c: string, kind: string) => `${v}:chunk ${c} ${kind}`;

/** Claims 5 to 7 on what `look` saw. */
function claim(seen: Seen) {
  expect(seen.woven.length, 'woven words with their gloss drawn').toBeGreaterThan(0);
  expect(seen.rows.length, 'lines measured').toBeGreaterThan(seen.woven.length > 0 ? 3 : 0);
  expect(Math.max(...seen.rows.map((r) => r.gloss)), 'a line carries a gloss').toBeGreaterThan(0);
  // 5: nothing runs off the page or the column, and no woven word (or its gloss) lies on another word of the verse
  expect(seen.scroll, 'the page is as wide as the screen').toBeLessThanOrEqual(seen.client);
  const lost: string[] = [];
  const crossed: string[] = [];
  const off: string[] = [];
  const all = [
    ...seen.woven.flatMap((w) => [
      { verse: w.verse, chunk: w.chunk, kind: 'word', box: w.word },
      { verse: w.verse, chunk: w.chunk, kind: 'gloss', box: w.gloss },
    ]),
    ...seen.english.map((e) => ({ verse: e.verse, chunk: e.chunk, kind: 'English', box: e.box })),
  ];
  for (const w of seen.woven) {
    for (const [kind, box] of [['word', w.word], ['gloss', w.gloss]] as const) {
      if (box.left < seen.column.left - 0.5 || box.right > seen.column.right + 0.5) lost.push(`${name(w.verse, w.chunk, kind)} ${Math.round(box.left)}-${Math.round(box.right)} outside ${Math.round(seen.column.left)}-${Math.round(seen.column.right)}`);
      for (const other of all) {
        if (other.verse === w.verse && other.chunk === w.chunk) continue;
        if (overlap(box, other.box)) crossed.push(`${name(w.verse, w.chunk, kind)} ${JSON.stringify(box)} on ${name(other.verse, other.chunk, other.kind)} ${JSON.stringify(other.box)}`);
      }
    }
    // 6: the gloss stands under its own word: its middle within the word's box
    const middle = (w.gloss.left + w.gloss.right) / 2;
    if (middle < w.word.left - 1 || middle > w.word.right + 1) off.push(`${name(w.verse, w.chunk, 'gloss')} centre ${Math.round(middle)} outside the word ${Math.round(w.word.left)}-${Math.round(w.word.right)}`);
  }
  expect(lost, 'every woven word and gloss inside the reading column').toEqual([]);
  expect(crossed, 'no woven word on a neighbour').toEqual([]);
  expect(off, 'each gloss centred under its word').toEqual([]);
  // 7: the pitch of two lines of a verse (baseline to baseline, less a stanza's margin) is the plain line height, and a line with a woven word adds no more than its gloss row
  const uneven: string[] = [];
  seen.rows.forEach((row, i) => {
    const next = seen.rows[i + 1];
    if (!next || next.verse !== row.verse) return;
    const pitch = next.baseline - row.baseline;
    const most = row.plain + row.gloss;
    if (next.stanza) return;
    if (pitch < row.plain - 0.5 || pitch > most + 0.5) uneven.push(`verse ${row.verse} at ${Math.round(row.baseline)}: ${pitch.toFixed(1)} px, between ${row.plain} and ${most.toFixed(1)}`);
  });
  expect(uneven, 'line pitch').toEqual([]);
}

for (const width of [360, 412]) {
  test.describe(`${width} px wide`, () => {
    test.use({ viewport: { width, height: 915 } });

    test('Isaiah 12 in the Weave: nothing runs off, nothing on a neighbour, each gloss under its word, even lines', async ({ page }) => {
      await open(page, 'b=isa&c=12&view=english', ISAIAH_12, 2);
      await page.locator('[data-verse="2"]').scrollIntoViewIfNeeded();
      await shot(page, `weave-layout-isaiah-12-${width}`);
      claim(await look(page, 1, 6));
    });

    // 8: Immersive justifies, and a line that breaks because the next stack did not fit is set ragged, like the last line of a paragraph. Only 12:3's 'from the springs' (and 'of salvation') stand woven.
    test('Isaiah 12:3: the line before a woven word that did not fit keeps its word gaps', async ({ page }) => {
      await open(page, 'b=isa&c=12&view=english', ['מַעְיָן', 'יְשׁוּעָה'], 3);
      const verse = page.locator('[data-verse="3"]');
      await verse.scrollIntoViewIfNeeded();
      const got = await verse.evaluate((el) => {
        const text = el.querySelector('[data-text]')!;
        // the width of one space in this text's own face: 'a a' less 'aa', in two no-wrap probes
        const probe = (s: string) => {
          const span = document.createElement('span');
          span.style.whiteSpace = 'pre';
          span.style.textIndent = '0';
          span.textContent = s;
          text.appendChild(span);
          const w = span.getBoundingClientRect().width;
          span.remove();
          return w;
        };
        const space = probe('a a') - probe('aa');
        // each English word's box, in reading order, with the line it is on
        const words: { left: number; right: number; top: number }[] = [];
        for (const chunk of Array.from(text.querySelectorAll('[data-chunk]:not([data-woven])'))) {
          const walker = document.createTreeWalker(chunk, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            for (const m of (node.textContent ?? '').matchAll(/\S+/g)) {
              const range = document.createRange();
              range.setStart(node, m.index!);
              range.setEnd(node, m.index! + m[0].length);
              const r = range.getBoundingClientRect();
              words.push({ left: r.left, right: r.right, top: r.top });
            }
          }
        }
        const stacks = Array.from(text.querySelectorAll('[data-woven]')).map((s) => s.getBoundingClientRect());
        const style = getComputedStyle(text);
        return { space, words, stacks: stacks.map((s) => ({ left: s.left, top: s.top })), align: style.textAlign, hyphens: style.hyphens };
      });
      // the verse is Immersive's: justified, so a line that breaks early would be stretched but for the fix
      const lines = new Map<number, { left: number; right: number }[]>();
      for (const w of got.words) lines.set(Math.round(w.top / 4), [...(lines.get(Math.round(w.top / 4)) ?? []), w]);
      const rows = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row.sort((a, b) => a.left - b.left));
      // the line broken by the stack: the English line, and the first stack stands on a line below it (it did not fit on this one)
      expect(got.stacks.length, 'the woven chunks are drawn').toBeGreaterThan(0);
      expect(got.stacks[0].top, 'the first stack wrapped to the next line').toBeGreaterThan(got.words[0].top + 20);
      const first = rows[0];
      expect(first.length, 'the first line holds several words').toBeGreaterThan(2);
      const gaps = first.slice(1).map((w, i) => w.left - first[i].right);
      // every gap is the space of the face (a word's own box has no side bearing: 1 px of slack), none stretched to fill the width
      expect(Math.max(...gaps), `word gaps ${gaps.map((g) => g.toFixed(1)).join(', ')} against one space of ${got.space.toFixed(1)}`).toBeLessThanOrEqual(got.space + 1);
      await shot(page, `weave-layout-isaiah-12-3-${width}`);
    });

    test('sweep: Psalm 23 in the Hebrew Weave', async ({ page }) => {
      await open(page, 'b=psa&c=23&view=english', lemmasOf('psa', 23), 1);
      claim(await look(page, 1, 6));
    });

    test('sweep: Psalm 119:1-8 in the Hebrew Weave', async ({ page }) => {
      await open(page, 'b=psa&c=119&view=english', lemmasOf('psa', 119, 1, 8), 1);
      claim(await look(page, 1, 8));
    });

    test('sweep: Romans 8 in the Greek Weave', async ({ page }) => {
      await open(page, 'b=rom&c=8&view=english', lemmasOf('rom', 8), 1);
      claim(await look(page, 1, 39));
    });
  });
}
