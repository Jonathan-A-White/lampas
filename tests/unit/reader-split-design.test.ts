// docs/design/reader-split.md (mw-5r3p30.1131): the design pass for the Reader's split (a map or a second text beside the passage), which mw-5r3p30.1129 and
// mw-5r3p30.1130 are built from. The doc has every part the story asks for, in order; a prior-art table with a source for each app; at most four decisions, each with
// A, B and the recommended one; a reason on every 'not done'; revised acceptance criteria for the two build stories, each item checkable; and the phone-size mockups
// (390x844 PNGs under docs/design/reader-split/, rendered from the static mockup.html there by render.mjs, never from app code). CLAUDE.md's Read by need names the doc.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DOC = 'docs/design/reader-split.md';
const SHOTS_DIR = 'docs/design/reader-split';
const SHOTS = ['map-split', 'text-linked', 'text-unlinked', 'closing'] as const;
/** The parts, in the order the story lists them (the headings may carry more words after the name). */
const PARTS = [
  'Opening and closing',
  'The divider',
  'Portrait, sideways and wide',
  'The map pane and a text pane',
  'The Link',
  'A word tap',
  'What is remembered',
  'Not done',
  'Prior art',
  'Decisions',
  'Revised acceptance criteria',
] as const;
const PRIOR_ART = ['Logos mobile', 'Logos desktop', 'Olive Tree', 'YouVersion', 'Accordance'] as const;
const BUILD_STORIES = ['mw-5r3p30.1129', 'mw-5r3p30.1130'] as const;

const doc = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';

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

describe(DOC, () => {
  it('exists and has every part, in order', () => {
    expect(existsSync(DOC), `${DOC} exists`).toBe(true);
    const at = PARTS.map((part) => doc.search(new RegExp(`^## ${part}`, 'm')));
    PARTS.forEach((part, i) => {
      expect(at[i], `has a "## ${part}" part`).toBeGreaterThan(-1);
      if (i > 0) expect(at[i], `"## ${part}" comes after "## ${PARTS[i - 1]}"`).toBeGreaterThan(at[i - 1]);
    });
  });

  it('studies prior art in a table, a source named on every row', () => {
    const rows = section('Prior art')
      .split('\n')
      .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line));
    for (const app of PRIOR_ART) {
      const row = rows.find((line) => line.includes(app));
      expect(row, `a table row for ${app}`).toBeDefined();
      expect(row, `${app}'s row names a source`).toMatch(/https:\/\//);
    }
  });

  it('lists at most four decisions, each with A, B and the recommended one', () => {
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

  it("gives each 'not done' its reason", () => {
    const bullets = section('Not done')
      .split('\n')
      .filter((line) => line.startsWith('- '));
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) expect(bullet, `a reason: ${bullet.slice(0, 60)}`).toMatch(/\bbecause\b/);
  });

  it('revises the acceptance criteria of both build stories, each item checkable', () => {
    const revised = section('Revised acceptance criteria');
    for (const story of BUILD_STORIES) {
      const part = revised.match(new RegExp(`^### ${story.replace('.', '\\.')}[^\n]*\n([\\s\\S]*?)(?=^### |$(?![\\s\\S]))`, 'm'))?.[1] ?? '';
      const items = part.split('\n').filter((line) => /^\d+\. /.test(line));
      expect(items.length, `${story} has numbered criteria`).toBeGreaterThan(2);
      for (const item of items) expect(item, `${story}: ${item.slice(0, 60)} says how it is checked`).toMatch(/\b(e2e|unit test|gate)\b/);
    }
  });

  it('has the four phone-size mockups at 390x844 and names each in the doc', () => {
    for (const name of SHOTS) {
      const path = `${SHOTS_DIR}/${name}.png`;
      expect(existsSync(path), `${path} exists`).toBe(true);
      expect(pngSize(path), `${path} is phone-size`).toEqual({ width: 390, height: 844 });
      expect(doc, `the doc shows ${name}.png`).toContain(`reader-split/${name}.png`);
    }
  });

  it("is in CLAUDE.md's Read by need", () => {
    expect(readFileSync('CLAUDE.md', 'utf8')).toMatch(/^docs\/design\/reader-split\.md\s+#/m);
  });
});
