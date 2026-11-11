// tests/support/dataBooks.ts — which directories of public/data are books. A test that walks every book of the data reads public/data/<book>/<chapter>.json through this, so that
// the next directory there that is not a book (the ladder's, the recorded voice's) is added to NOT_BOOKS here, once, rather than to about 28 walkers (mw-82lb97i.10).
// A skip list, not public/data/index.json: a book directory that index.json does not yet name stays in front of the walkers, which would catch it, where the index would hide it.
// A walker's own further filter (isGreekBook in data-books.ts, the verses- files, which are files and not directories) stays on top of this.
import { readdirSync } from 'node:fs';

/** The directories of public/data that hold no chapters: ladder/ is scripts/ladder-el.ts's, audio/ is the recorded voice's timings (docs/data.md). */
export const NOT_BOOKS: readonly string[] = ['ladder', 'audio'];

/** The names of the book directories of `root` (public/data by default), sorted: every directory but those in NOT_BOOKS. */
export function dataBooks(root = 'public/data'): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NOT_BOOKS.includes(d.name))
    .map((d) => d.name)
    .sort();
}
