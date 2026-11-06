// scripts/sermons/fingerprint.ts — the fingerprint of a source's book files (sermons and themes alike), kept apart so that scripts/sermons/themes.ts and scripts/sermons-build.ts need not import each other.
import { createHash } from 'node:crypto';
import { CANON } from '../../src/data/canon';

/** The first 12 hex of a SHA-256 over a source's book files, in canon order (each as `<book>\n<its JSON>\n`): index.json keeps it, and a book file is asked for as ?v=<it>. */
export function sourceFingerprint(books: ReadonlyMap<string, object>): string {
  const hash = createHash('sha256');
  for (const canon of CANON) {
    const file = books.get(canon.code);
    if (file) hash.update(`${canon.code}\n${JSON.stringify(file)}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}
