// docs/timeline-design.md (mw-fnvjof.17.317.4): the design of the timeline strip in the Reader's split, which the dock (mw-fnvjof.17.317.2) and the card (mw-fnvjof.17.317.3) are built
// from, and its prototype (prototypes/timeline/, static files that read the rig's own Theographic data; never app code, never in the build). The doc has every part the story asks
// for, in order; its colours are src/index.css's; every number of its motion and layout tables is the prototype's own constant, so the doc cannot drift from what was tried; the
// prototype's maths does what the doc says on the real Isaiah file; and the phone-size pictures (390x844, rendered from the prototype by prototypes/timeline/render.mjs) are there.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BookTimeline } from '../../src/timeline/types';

const DOC = 'docs/timeline-design.md';
const SHOTS_DIR = 'docs/timeline-design';
/** The four the story asks for: opened at Isaiah 1, zoomed out, an event card, dark mode. */
const SHOTS = ['isaiah-1', 'whole-bible', 'event-card', 'dark'] as const;
const PAGE = 'prototypes/timeline/index.html';
const SCRIPT = 'prototypes/timeline/timeline.js';
/** The parts, in order (a heading may carry more words after the name). */
const PARTS = [
  'The one idea',
  'Layout',
  'Type',
  'Colour',
  'Motion',
  'Crowding',
  'Touch targets',
  'Gestures',
  'The card',
  'Rendering',
  'The budget check',
  'Not done',
  'Decisions',
  'For the build stories',
  'The other strips and gestures',
  'The prototype',
] as const;
const BUILD_STORIES = ['mw-fnvjof.17.317.2', 'mw-fnvjof.17.317.3'] as const;
const TOKENS = ['canvas', 'surface', 'line', 'fg', 'muted', 'accent', 'accent-fg'] as const;

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const doc = read(DOC);

/** The text of the `## <name>` section (the heading may go on after the name), up to the next `## `. */
function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  return match?.[1] ?? '';
}

/** The width and height of a PNG, from its IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString('hex'), `${path} is a PNG`).toBe('89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The `--lp-<token>: #hex` pairs of the first block of `css` that `opens` begins. */
function palette(css: string, opens: string): Record<string, string> {
  const at = css.indexOf(opens);
  const block = at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  return Object.fromEntries(TOKENS.map((token) => [token, block.match(new RegExp(`--lp-${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? '']));
}

interface View {
  /** the year at the middle of the strip, on the axis (1 BC is 0) */
  c: number;
  /** px per year */
  k: number;
}
interface Mark {
  id: string;
  x0: number;
  x1: number;
  rank: number;
}
/** The pure half of the prototype: what the test holds the doc to. */
interface Prototype {
  MOTION: Record<string, number>;
  LAYOUT: Record<string, number>;
  tOf(year: number, date?: string): number;
  yearLabel(t: number): string;
  ticks(view: View, width: number): { major: { t: number; label: string }[]; minor: number[] };
  homeView(span: { from: number; to: number }, width: number): View;
  wholeView(width: number): View;
  xOf(t: number, view: View, width: number): number;
  glideRest(x: number, velocity: number): number;
  glideAt(from: number, rest: number, ms: number): number;
  snapRest(rest: number, home: number): number;
  flyAt(from: View, to: View, width: number, share: number): View;
  dealLanes(height: number, need: { events: number; people: number }): { events: number; people: number };
  packLanes(marks: Mark[], lanes: number): { placed: { id: string; lane: number }[]; ribbon: string[] };
}

let proto: Prototype;
beforeAll(async () => {
  // a path worked out at run time: the prototype is plain JavaScript outside src/, which tsc does not read
  const url = pathToFileURL(resolve(SCRIPT)).href;
  proto = existsSync(SCRIPT) ? ((await import(/* @vite-ignore */ url)) as Prototype) : ({} as Prototype);
});

describe(DOC, () => {
  it('exists and has every part, in order', () => {
    expect(existsSync(DOC), `${DOC} exists`).toBe(true);
    const at = PARTS.map((part) => doc.search(new RegExp(`^## ${part}`, 'm')));
    PARTS.forEach((part, i) => {
      expect(at[i], `has a "## ${part}" part`).toBeGreaterThan(-1);
      if (i > 0) expect(at[i], `"## ${part}" comes after "## ${PARTS[i - 1]}"`).toBeGreaterThan(at[i - 1]);
    });
  });

  it("carries the Governor's words that rule it, with their txid", () => {
    expect(doc).toContain('it needs to be a joy');
    expect(doc).toContain('direct:27e0ee6addc083544334aa570dd424995e5099c5bffb594f0c71037b1ffb301e');
  });

  it('lays the strip out at the phone, sideways and wide', () => {
    const layout = section('Layout');
    for (const size of ['390x844', '844x390', '768']) expect(layout, `the layout at ${size}`).toContain(size);
  });

  it("names the app's own colours in light and dark, the hex of each as src/index.css has it, and the prototype draws with the same", () => {
    const css = read('src/index.css');
    const page = read(PAGE);
    const colour = section('Colour');
    for (const [theme, opens] of [
      ['dark', ':root {'],
      ['light', ':root[data-theme="light"] {'],
    ] as const) {
      const app = palette(css, opens);
      for (const token of TOKENS) {
        expect(app[token], `src/index.css has ${theme} ${token}`).toMatch(/^#/);
        expect(colour.toLowerCase(), `the doc gives ${theme} ${token} as ${app[token]}`).toContain(app[token].toLowerCase());
      }
      expect(palette(page, opens), `the prototype's ${theme} palette is the app's`).toEqual(app);
    }
  });

  it('gives every number of the motion and the layout as the prototype has it', () => {
    expect(Object.keys(proto.MOTION ?? {}).length, 'the prototype has motion constants').toBeGreaterThan(5);
    expect(Object.keys(proto.LAYOUT ?? {}).length, 'the prototype has layout constants').toBeGreaterThan(3);
    for (const [name, value] of [...Object.entries(proto.MOTION), ...Object.entries(proto.LAYOUT)])
      expect(doc, `a table row for ${name} with ${value}`).toMatch(new RegExp(`^\\| \`${name}\` \\| ${String(value).replace('.', '\\.')} \\|`, 'm'));
    const motion = section('Motion');
    for (const word of ['momentum', 'snap', 'zoom', 'prefers-reduced-motion']) expect(motion.toLowerCase(), `the motion says ${word}`).toContain(word);
  });

  it('says how events and people are drawn when crowded, and how large a thumb target is', () => {
    const crowding = section('Crowding');
    for (const word of ['events', 'people', 'lane', 'ribbon']) expect(crowding, `crowding says ${word}`).toContain(word);
    expect(section('Touch targets')).toContain('44 px');
  });

  it('gives every gesture a button', () => {
    const rows = section('Gestures')
      .split('\n')
      .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
      .slice(1);
    expect(rows.length).toBeGreaterThan(4);
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1);
      expect(cells.at(-1)?.trim(), `a button or key for: ${cells[0].trim()}`).not.toBe('');
    }
  });

  it('chooses how the strip is drawn among DOM, canvas and WebGL, with the reason and a frame budget measured on the prototype', () => {
    const rendering = section('Rendering');
    for (const word of ['DOM', 'canvas', 'WebGL', '60 fps', '16.7 ms']) expect(rendering, `rendering says ${word}`).toContain(word);
    expect(rendering, 'a chosen one').toMatch(/^\*\*Chosen: /m);
    expect(rendering, 'measured, in ms a frame').toMatch(/\| [\d.]+ ms \|/);
    const check = section('The budget check');
    expect(check).toMatch(/4x|4×/);
    expect(check).toContain('ms');
  });

  it("gives each 'not done' its reason, and at most four decisions, each with A, B and the recommended one", () => {
    const bullets = section('Not done')
      .split('\n')
      .filter((line) => line.startsWith('- '));
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) expect(bullet, `a reason: ${bullet.slice(0, 60)}`).toMatch(/\bbecause\b/);
    const decisions = section('Decisions').split(/^### /m).slice(1);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.length).toBeLessThanOrEqual(4);
    for (const decision of decisions) {
      const title = decision.split('\n')[0];
      expect(decision, `${title} has an A`).toMatch(/^- A: /m);
      expect(decision, `${title} has a B`).toMatch(/^- B: /m);
      expect(decision, `${title} names the recommended one`).toMatch(/^- Recommended: [AB]\b/m);
    }
  });

  it('says what each build story takes from it, each item checkable', () => {
    const build = section('For the build stories');
    for (const story of BUILD_STORIES) {
      const part = build.match(new RegExp(`^### ${story.replaceAll('.', '\\.')}[^\n]*\n([\\s\\S]*?)(?=^### |$(?![\\s\\S]))`, 'm'))?.[1] ?? '';
      const items = part.split('\n').filter((line) => /^\d+\. /.test(line));
      expect(items.length, `${story} has numbered items`).toBeGreaterThan(2);
      for (const item of items) expect(item, `${story}: ${item.slice(0, 60)} says how it is checked`).toMatch(/\b(e2e|unit test|gate)\b/);
    }
  });

  it('lists the other strips and gestures of the app, the split and the maps among them, each with whether the design keeps to it', () => {
    const rows = section('The other strips and gestures')
      .split('\n')
      .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
      .slice(1);
    expect(rows.length).toBeGreaterThan(5);
    for (const surface of ['src/reader/split/Dock.tsx', 'src/maps/MapView.tsx', 'src/reader/useChapterSwipe.ts']) expect(rows.some((row) => row.includes(surface)), `a row for ${surface}`).toBe(true);
    for (const row of rows) expect(row, `keeps or differs: ${row.slice(0, 60)}`).toMatch(/\b(Keeps|Differs)\b/);
  });

  it('has the four phone-size pictures at 390x844 and shows each in the doc', () => {
    for (const name of SHOTS) {
      const path = `${SHOTS_DIR}/${name}.png`;
      expect(existsSync(path), `${path} exists`).toBe(true);
      expect(pngSize(path), `${path} is phone-size`).toEqual({ width: 390, height: 844 });
      expect(doc, `the doc shows ${name}.png`).toContain(`timeline-design/${name}.png`);
    }
  });

  it("is in CLAUDE.md's Read by need, and the data's guide points at it", () => {
    expect(read('CLAUDE.md')).toMatch(/^docs\/timeline-design\.md\s+#/m);
    expect(read('docs/timeline.md')).toContain('docs/timeline-design.md');
  });
});

describe('the prototype (prototypes/timeline/)', () => {
  const isaiah = JSON.parse(readFileSync('src/timeline/data/isa.json', 'utf8')) as BookTimeline;

  it("is a page and a script that read the rig's own Theographic files and carry no copy of them", () => {
    expect(existsSync(PAGE), `${PAGE} exists`).toBe(true);
    expect(existsSync(SCRIPT), `${SCRIPT} exists`).toBe(true);
    expect(read(SCRIPT), 'reads src/timeline/data/').toContain('src/timeline/data/');
    const title = isaiah.events[0].title;
    expect(title).toBe('Prophecies of Isaiah');
    for (const file of [PAGE, SCRIPT]) expect(read(file), `${file} has no copy of the data`).not.toContain(title);
    expect(read(PAGE), 'shows the credit from the file, not typed in').not.toContain('Robert Rouse');
  });

  it('counts years with no year 0, and labels them as the maps do', () => {
    expect(proto.tOf(-1)).toBe(0);
    expect(proto.tOf(1)).toBe(1);
    expect(proto.tOf(-759)).toBe(-758);
    expect(proto.tOf(30, '0030-07-02')).toBeGreaterThan(30.4);
    expect(proto.tOf(30, '0030-07-02')).toBeLessThan(30.6);
    expect(proto.yearLabel(proto.tOf(-759))).toBe('759 BC');
    expect(proto.yearLabel(proto.tOf(30))).toBe('AD 30');
    expect(proto.yearLabel(0)).toBe('1 BC');
  });

  it('opens Isaiah 1 on the years of its prophecies, the band in the middle of a 390 px strip', () => {
    const [event] = isaiah.events;
    const span = { from: event.year, to: -697 };
    const home = proto.homeView(span, 390);
    const left = proto.xOf(proto.tOf(span.from), home, 390);
    const right = proto.xOf(proto.tOf(span.to), home, 390);
    expect((left + right) / 2).toBeCloseTo(195, 5);
    expect((right - left) / 390).toBeCloseTo(proto.LAYOUT.HOME_SHARE, 5);
  });

  it('rules the whole Bible in round years, and a lifetime in tens', () => {
    const whole = proto.ticks(proto.wholeView(390), 390);
    expect(whole.major.map((tick) => tick.label)).toEqual(expect.arrayContaining(['4000 BC', '2000 BC', 'AD 1']));
    expect(whole.major.every((tick) => !tick.label.startsWith('0') && tick.label !== 'AD 0')).toBe(true);
    const home = proto.ticks(proto.homeView({ from: -759, to: -697 }, 390), 390);
    expect(home.major.map((tick) => tick.label)).toEqual(expect.arrayContaining(['760 BC', '700 BC']));
    for (let i = 1; i < home.major.length; i++) expect(proto.xOf(home.major[i].t, proto.homeView({ from: -759, to: -697 }, 390), 390) - proto.xOf(home.major[i - 1].t, proto.homeView({ from: -759, to: -697 }, 390), 390)).toBeGreaterThanOrEqual(proto.LAYOUT.TICK_GAP);
  });

  it('lets a fling glide to rest at its speed times the glide time, and settles on the chapter when it would rest near it', () => {
    const rest = proto.glideRest(100, 2);
    expect(rest).toBe(100 + 2 * proto.MOTION.GLIDE_MS);
    expect(proto.glideAt(100, rest, 0)).toBe(100);
    expect(Math.abs(proto.glideAt(100, rest, 6 * proto.MOTION.GLIDE_MS) - rest)).toBeLessThan(2);
    expect(proto.snapRest(500 + proto.MOTION.SNAP_PX - 1, 500)).toBe(500);
    expect(proto.snapRest(500 + proto.MOTION.SNAP_PX + 1, 500)).toBe(500 + proto.MOTION.SNAP_PX + 1);
  });

  it('flies from one view to another, beginning and ending exactly on them', () => {
    const from = proto.homeView({ from: -759, to: -697 }, 390);
    const to = proto.wholeView(390);
    expect(proto.flyAt(from, to, 390, 0)).toEqual(from);
    const end = proto.flyAt(from, to, 390, 1);
    expect(end.c).toBeCloseTo(to.c, 6);
    expect(end.k).toBeCloseTo(to.k, 9);
    const mid = proto.flyAt(from, to, 390, 0.5);
    expect(mid.k).toBeLessThan(from.k);
    expect(mid.k).toBeGreaterThan(to.k * 0.5);
  });

  it('deals a half dock at 390x844 two lanes of events and three of people, and the smallest dock one lane of events', () => {
    expect(proto.dealLanes(282, { events: 9, people: 3 })).toEqual({ events: 2, people: 3 });
    expect(proto.dealLanes(282, { events: 9, people: 0 })).toEqual({ events: 5, people: 0 });
    expect(proto.dealLanes(proto.LAYOUT.STRIP_MIN, { events: 9, people: 3 })).toEqual({ events: 1, people: 0 });
  });

  it('packs marks into lanes by rank, and sends what finds no lane to the ribbon, losing none', () => {
    const marks: Mark[] = [
      { id: 'far', x0: 300, x1: 380, rank: 2 },
      { id: 'chapter', x0: 10, x1: 200, rank: 0 },
      { id: 'book', x0: 50, x1: 150, rank: 1 },
      { id: 'other', x0: 60, x1: 160, rank: 2 },
    ];
    const { placed, ribbon } = proto.packLanes(marks, 2);
    expect(placed.find((p) => p.id === 'chapter')?.lane).toBe(0);
    expect(placed.find((p) => p.id === 'book')?.lane).toBe(1);
    expect(placed.find((p) => p.id === 'far')?.lane).toBe(0);
    expect(ribbon).toEqual(['other']);
    expect(placed.length + ribbon.length).toBe(marks.length);
  });
});
