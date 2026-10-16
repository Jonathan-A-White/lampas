// CLAUDE.md stays a one-screen index (mw-gq6.485): every Builder reads it at boot, so it is at most 16,000 bytes and the layout notes
// live in docs/layout/<area>.md. scripts/check-claude-md.mjs holds the rules; this runs it on the tree and on a CLAUDE.md that is too big.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('CLAUDE.md', () => {
  it('is at most 16,000 bytes, ends with Read by need and names every docs/ file there', () => {
    const { status, output } = check(process.cwd());
    expect(status, output).toBe(0);
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
