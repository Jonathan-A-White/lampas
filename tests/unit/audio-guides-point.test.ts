// The recorded voice's verse cuts are made by three tools under scripts/audio-timings/, each with its own guide: the maker (align.py, docs/data.md 'The timing
// maker'), the judge (judge.py, docs/audio-judge.md) and the runner (run-book.sh, docs/audio-run.md). A guide that names one of the tools says where that tool's
// guide is, and so does the maker's own header, so whoever reads of the maker learns that the judge exists and where it is written up (mw-ar5k42b.8: docs/data.md
// 'The timing maker' said neither when the judge landed; the cut rule's story, mw-ar5k42b.3, wrote both in and nothing held them there). makerProblems and
// missingPointers take the texts so a test can break a copy.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const TOOLS_DIR = 'scripts/audio-timings';
const TOOLS = [
  { tool: 'align.py', guide: 'docs/data.md' },
  { tool: 'judge.py', guide: 'docs/audio-judge.md' },
  { tool: 'run-book.sh', guide: 'docs/audio-run.md' },
];
const MAKER = `${TOOLS_DIR}/align.py`;
const MAKER_GUIDE = 'docs/data.md';
const MAKER_HEADING = 'The timing maker';
const JUDGE = TOOLS[1];

function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether `text`, the text of `file`, says where `guide` is: by its path from the rig's root, or by a markdown link to it from where the file is. */
function pointsAt(text: string, file: string, guide: string): boolean {
  const link = relative(dirname(file), guide).split(sep).join('/');
  return text.includes(guide) || new RegExp(`\\]\\(${literal(link)}[)#]`).test(text);
}

/** Whether `text` names the tool by its file name (test_align.py is not align.py). */
function names(text: string, tool: string): boolean {
  return new RegExp(`(?<![\\w-])${literal(tool)}(?![\\w-])`).test(text);
}

/** One line for each tool that `text`, the text of `file`, names without saying where that tool's guide is. A tool's own guide and its own file owe nothing for it. */
function missingPointers(file: string, text: string): string[] {
  return TOOLS.filter(({ tool, guide }) => file !== guide && file !== `${TOOLS_DIR}/${tool}` && names(text, tool) && !pointsAt(text, file, guide)).map(
    ({ tool, guide }) => `${file} names ${tool} and does not say where its guide is (${guide})`,
  );
}

/** The text under the heading that starts with `title`, down to the next heading of its level or above; '' when there is none. A '#' line inside a code fence is not a heading. */
function section(markdown: string, title: string): string {
  const kept: string[] = [];
  let level = 0;
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) fenced = !fenced;
    const heading = fenced ? null : line.match(/^(#+) (.*)$/);
    if (level === 0) {
      if (heading && heading[2].startsWith(title)) level = heading[1].length;
      continue;
    }
    if (heading && heading[1].length <= level) break;
    kept.push(line);
  }
  return kept.join('\n');
}

/** What the maker's part of its guide lacks of the judge: that it exists, and where its guide is. */
function makerProblems(guideText: string): string[] {
  const part = section(guideText, MAKER_HEADING);
  if (part === '') return [`${MAKER_GUIDE} has no '${MAKER_HEADING}' part`];
  const problems: string[] = [];
  if (!names(part, JUDGE.tool)) problems.push(`${MAKER_GUIDE} '${MAKER_HEADING}' does not say the judge exists (${JUDGE.tool})`);
  if (!pointsAt(part, MAKER_GUIDE, JUDGE.guide)) problems.push(`${MAKER_GUIDE} '${MAKER_HEADING}' does not point at ${JUDGE.guide}`);
  return problems;
}

/** A Python file's own header: its first docstring. */
function docstring(python: string): string {
  return python.match(/"""([\s\S]*?)"""/)?.[1] ?? '';
}

/** Every .md file under docs/, as 'docs/...' paths. */
function guides(dir = 'docs'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return guides(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

describe("the recorded voice's guides point at each other", () => {
  it('each tool and its guide is there', () => {
    expect(TOOLS.flatMap(({ tool, guide }) => [`${TOOLS_DIR}/${tool}`, guide]).filter((path) => !existsSync(path))).toEqual([]);
  });

  it("docs/data.md 'The timing maker' says the judge exists and points at docs/audio-judge.md", () => {
    expect(makerProblems(readFileSync(MAKER_GUIDE, 'utf8'))).toEqual([]);
  });

  it('a timing maker part that only tells of the maker fails on both counts, though another part of the file links the judge', () => {
    const before = [
      '## Recorded audio timings',
      '',
      '### The timing maker (`scripts/audio-timings/`)',
      '',
      '`align.py` fetches each chapter MP3 of a book and writes when each verse starts and ends. It is run by hand when a book is added.',
      '',
      '```bash',
      '# 1. the maker times the book',
      'python scripts/audio-timings/align.py --book jhn',
      '```',
      '',
      '## The places of each book',
      '',
      'Not the maker: `judge.py` is in [docs/audio-judge.md](audio-judge.md).',
      '',
    ].join('\n');
    expect(makerProblems(before)).toEqual([
      "docs/data.md 'The timing maker' does not say the judge exists (judge.py)",
      "docs/data.md 'The timing maker' does not point at docs/audio-judge.md",
    ]);
    const after = before.replace('It is run by hand', 'The judge hears every verse it cuts (`judge.py`, [docs/audio-judge.md](audio-judge.md#the-report)). It is run by hand');
    expect(makerProblems(after)).toEqual([]);
    expect(makerProblems('## Recorded audio timings\n\nNo maker here.\n')).toEqual(["docs/data.md has no 'The timing maker' part"]);
  });

  it("the maker's own header names the judge and says where its guide is", () => {
    const header = docstring(readFileSync(MAKER, 'utf8'));
    expect(names(header, JUDGE.tool)).toBe(true);
    expect(missingPointers(MAKER, header)).toEqual([]);
  });

  it('every guide under docs/ that names one of the tools says where that tool has its guide', () => {
    const all = guides();
    expect(all.filter((file) => TOOLS.some(({ tool }) => names(readFileSync(file, 'utf8'), tool))).length).toBeGreaterThanOrEqual(TOOLS.length);
    expect(all.flatMap((file) => missingPointers(file, readFileSync(file, 'utf8')))).toEqual([]);
  });

  it('a guide that names a tool with no word of its guide is named, and a path, a link or the tool\'s own guide passes', () => {
    expect(missingPointers('docs/audio-player-margin.md', '`align.py` and `judge.py` read it from `player-margin.json`.')).toEqual([
      'docs/audio-player-margin.md names align.py and does not say where its guide is (docs/data.md)',
      'docs/audio-player-margin.md names judge.py and does not say where its guide is (docs/audio-judge.md)',
    ]);
    expect(missingPointers('docs/audio-player-margin.md', '`align.py` ([docs/data.md](data.md)) and `judge.py` (docs/audio-judge.md) read it.')).toEqual([]);
    expect(missingPointers('docs/sources/x.md', 'The runner, `run-book.sh`: [the run](../audio-run.md#a-fresh-box).')).toEqual([]);
    expect(missingPointers('docs/sources/x.md', 'The runner, `run-book.sh`: [the run](audio-run.md).')).toHaveLength(1);
    expect(missingPointers('docs/layout/data.md', 'The maker is `align.py`; see docs/layout/data.md.')).toHaveLength(1);
    expect(missingPointers('docs/audio-judge.md', 'The judge is `judge.py`.')).toEqual([]);
    expect(missingPointers('docs/x.md', 'The rule on synthetic chapters: `test_align.py`.')).toEqual([]);
  });
});
