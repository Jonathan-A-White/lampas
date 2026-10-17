// docs/overview.md (mw-5r3p30.415): the one screen a Builder reads first. It stays under a byte budget, names only paths that exist,
// keeps its four parts in order, and CLAUDE.md's Read first points at it. checkOverview takes the texts so a test can break a copy.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LIMIT = 6_000;
const PARTS = ['What Lampas is', 'Gate command', 'Where things live', 'The five rules'];
const FILE_ENDINGS = /\.(md|ts|tsx|json|mjs|css|feature|toml)$/;

/** A backticked token that is a path: no spaces, and a slash or a file ending. */
function isPath(token: string): boolean {
  return /^[\w.@-]+(\/[\w.@-]+)*\/?$/.test(token) && (token.includes('/') || FILE_ENDINGS.test(token));
}

/** Every problem with an overview text and CLAUDE.md's text, each naming the path or part at fault. */
function checkOverview(overview: string, claude: string, exists: (path: string) => boolean): string[] {
  const problems: string[] = [];
  const bytes = Buffer.byteLength(overview, 'utf8');
  if (bytes > LIMIT) problems.push(`docs/overview.md is ${bytes} bytes, over the ${LIMIT} budget: cut it, do not raise the budget`);

  const prose = overview.replace(/^```[\s\S]*?^```/gm, '');
  for (const [, token] of prose.matchAll(/`([^`\n]+)`/g)) {
    if (isPath(token) && !exists(token)) problems.push(`docs/overview.md names ${token}, which does not exist`);
  }

  const at = PARTS.map((part) => overview.search(new RegExp(`^## ${part}$`, 'm')));
  PARTS.forEach((part, i) => {
    if (at[i] === -1) problems.push(`docs/overview.md has no "## ${part}" part`);
    else if (i > 0 && at[i - 1] !== -1 && at[i] < at[i - 1]) problems.push(`docs/overview.md has "## ${part}" before "## ${PARTS[i - 1]}"`);
  });

  const readFirst = claude.match(/^## Read first\n([\s\S]*?)(?=^## )/m)?.[1] ?? '';
  if (!readFirst.includes('docs/overview.md')) problems.push(`CLAUDE.md's "Read first" does not name docs/overview.md`);
  return problems;
}

function part(overview: string, name: string): string {
  return overview.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'))?.[1] ?? '';
}

const overview = readFileSync('docs/overview.md', 'utf8');
const claude = readFileSync('CLAUDE.md', 'utf8');
const exists = (path: string): boolean => existsSync(path);

describe('docs/overview.md', () => {
  it('is under budget, names only real paths, has its four parts in order, and CLAUDE.md Read first names it', () => {
    expect(checkOverview(overview, claude, exists)).toEqual([]);
  });

  it('lists ten places, each with a code path and an owning doc', () => {
    const entries = part(overview, 'Where things live').split('\n').filter((line) => line.startsWith('- '));
    expect(entries).toHaveLength(10);
    for (const entry of entries) {
      const paths = [...entry.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter(isPath);
      expect(paths.some((p) => !p.startsWith('docs/')), `a code path in: ${entry}`).toBe(true);
      expect(paths.some((p) => p.startsWith('docs/')), `an owning doc in: ${entry}`).toBe(true);
    }
  });

  it('gives the gate command and five rules, each pointing at a CLAUDE.md heading', () => {
    expect(part(overview, 'Gate command')).toContain('npm test');
    const rules = part(overview, 'The five rules').split('\n').filter((line) => /^\d\. /.test(line));
    expect(rules).toHaveLength(5);
    for (const rule of rules) {
      const heading = rule.match(/CLAUDE\.md "([^"]+)"/)?.[1];
      expect(heading, `a CLAUDE.md heading in: ${rule}`).toBeDefined();
      expect(claude, `CLAUDE.md has "## ${heading}"`).toMatch(new RegExp(`^## ${heading}$`, 'm'));
    }
  });

  describe('checkOverview fails, naming what is wrong', () => {
    it('on a misspelt path', () => {
      const broken = overview.replace('`src/review`', '`src/reveiw`');
      expect(checkOverview(broken, claude, exists).join('\n')).toContain('docs/overview.md names src/reveiw, which does not exist');
    });

    it('past 6,000 bytes', () => {
      const padded = `${overview}\n${'x'.repeat(LIMIT)}\n`;
      expect(checkOverview(padded, claude, exists).join('\n')).toMatch(/docs\/overview\.md is \d+ bytes, over the 6000/);
    });

    it('when a part is missing or out of order', () => {
      expect(checkOverview(overview.replace('## Gate command', '## Gate'), claude, exists).join('\n')).toContain('no "## Gate command" part');
      const swapped = overview.replace('## What Lampas is', '## X').replace('## Gate command', '## What Lampas is').replace('## X', '## Gate command');
      expect(checkOverview(swapped, claude, exists).join('\n')).toContain('before');
    });

    it('when CLAUDE.md Read first does not name it', () => {
      const without = claude.replace(/^.*docs\/overview\.md.*\n/m, '');
      expect(checkOverview(overview, without, exists).join('\n')).toContain(`"Read first" does not name docs/overview.md`);
    });
  });
});
