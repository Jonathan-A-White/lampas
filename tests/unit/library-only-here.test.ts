// tests/unit/library-only-here.test.ts — the `library` table is read and written in src/data/repositories/library.ts only (mw-rfjjzd.3, CLAUDE.md: UI code goes through
// src/data/repositories, never Dexie tables directly). src/data/db.ts declares the table; nothing else in src/ names it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

const ALLOWED = ['src/data/db.ts', 'src/data/repositories/library.ts'];

describe('the library table', () => {
  it('is named by db.library only in db.ts and repositories/library.ts', () => {
    const readers = sources('src')
      .filter((path) => !ALLOWED.includes(path.split('\\').join('/')))
      .filter((path) => /\b(?:db|this)\s*\.\s*library\b|\.table\(\s*['"]library['"]\s*\)/.test(readFileSync(path, 'utf8')));
    expect(readers).toEqual([]);
  });

  it('is reached in the repository file the rule names', () => {
    expect(readFileSync('src/data/repositories/library.ts', 'utf8')).toContain('db.library');
  });
});
