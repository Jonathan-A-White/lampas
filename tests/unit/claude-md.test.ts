// CLAUDE.md stays a one-screen index (mw-gq6.485): every Builder reads it at boot, so it is at most 16,000 bytes and the layout notes
// live in docs/layout/<area>.md. scripts/check-claude-md.mjs holds the rules; this runs it on the tree and on a CLAUDE.md that is too big.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const script = join(process.cwd(), 'scripts/check-claude-md.mjs');

function check(root: string): { status: number | null; output: string } {
  const run = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}, HOOK_TIMEOUT_MS);

/** A tree with one docs/layout file and a CLAUDE.md of `body` that ends with its Read by need. */
function tree(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'claude-md-'));
  made.push(root);
  mkdirSync(join(root, 'docs/layout'), { recursive: true });
  writeFileSync(join(root, 'docs/layout/reader.md'), '# Layout: The Reader\n');
  writeFileSync(join(root, 'CLAUDE.md'), `${body}\n## Read by need\n\n\`\`\`\ndocs/layout/reader.md  # the Reader\n\`\`\`\n`);
  return root;
}

/** A Read by need line the next story may write: longer than any there (the longest was 116 bytes when mw-ar5k42b.5 landed). */
const NEXT_LINE_BYTES = 125;
/** What the story that finds the room gone frees, so the stories after it do not each cut a line to the byte. */
const FREE_BYTES = 500;

/** Every .md file under the real docs/, as 'docs/...' paths. */
function realDocs(dir = 'docs'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return realDocs(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/** The tree the next story leaves: the real CLAUDE.md and docs/ (each file empty), with one more docs/ file named by a last Read by need line of `lineBytes`. */
function treeWithOneMoreDoc(lineBytes: number): string {
  const root = mkdtempSync(join(tmpdir(), 'claude-md-'));
  made.push(root);
  const next = 'docs/the-next-guide.md';
  for (const file of [...realDocs(), next]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), '');
  }
  const start = `${next} # `;
  if (lineBytes <= start.length) throw new Error(`a Read by need line for ${next} is over ${start.length} bytes, not ${lineBytes}`);
  const line = `${start}${'x'.repeat(lineBytes - start.length - 1)}\n`;
  const claude = readFileSync('CLAUDE.md', 'utf8');
  const end = claude.lastIndexOf('```');
  writeFileSync(join(root, 'CLAUDE.md'), `${claude.slice(0, end)}${line}${claude.slice(end)}`);
  return root;
}

describe('CLAUDE.md', () => {
  it('is at most 16,000 bytes, ends with Read by need and names every docs/ file there', () => {
    const { status, output } = check(process.cwd());
    expect(status, output).toBe(0);
  });

  // mw-ar5k42b.5: it stood at 15,995 of its 16,000 bytes, so a story that added a docs/ file could not name it in Read by need without cutting another line.
  it('has room for the next docs/ file: one more, named in Read by need by a line of 125 bytes (longer than any there), still passes', () => {
    const bytes = Buffer.byteLength(readFileSync('CLAUDE.md', 'utf8'), 'utf8');
    const { status, output } = check(treeWithOneMoreDoc(NEXT_LINE_BYTES));
    const why =
      `CLAUDE.md is ${bytes} of its 16,000 bytes, so the next story's docs/ file cannot be named in Read by need by a line of ${NEXT_LINE_BYTES} bytes. ` +
      `Free ${FREE_BYTES} bytes or more, not the bytes of one line: move a section or a long bullet word for word into the docs/ file for its subject, ` +
      `leave one short line that names the place, and prove no line is lost with node scripts/check-claude-md.mjs --from main. ` +
      `The check on that tree said: ${output}`;
    expect(status, why).toBe(0);
  });

  it('measures that room to the byte: a line of exactly the bytes left passes, and one byte more fails as the next story would see it', () => {
    const room = 16_000 - Buffer.byteLength(readFileSync('CLAUDE.md', 'utf8'), 'utf8');
    expect(check(treeWithOneMoreDoc(room)).status).toBe(0);
    const { status, output } = check(treeWithOneMoreDoc(room + 1));
    expect(status).toBe(1);
    expect(output).toMatch(/CLAUDE\.md is 16001 bytes, over the 16000/);
  });

  it('says in its own text where a new layout note goes', () => {
    expect(readFileSync('CLAUDE.md', 'utf8')).toMatch(/A new layout note goes in the docs\/layout\/ file for its area/);
  });

  it('fails past 16,000 bytes, and the message says the note goes in the docs/layout file for its area', () => {
    expect(check(tree('# CLAUDE.md\n')).status).toBe(0);
    const { status, output } = check(tree(`# CLAUDE.md\n${'x'.repeat(16_000)}\n`));
    expect(status).toBe(1);
    expect(output).toMatch(/CLAUDE\.md is \d+ bytes, over the 16000/);
    expect(output).toMatch(/A new layout note goes in the docs\/layout\/<area>\.md file for its area/);
  });

  it('fails when a docs/ file is not in Read by need', () => {
    const root = tree('# CLAUDE.md\n');
    writeFileSync(join(root, 'docs/new-guide.md'), '# A new guide\n');
    const { status, output } = check(root);
    expect(status).toBe(1);
    expect(output).toMatch(/docs\/new-guide\.md is not in CLAUDE\.md's Read by need/);
  });
});
