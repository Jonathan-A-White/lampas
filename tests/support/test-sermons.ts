// tests/support/test-sermons.ts — sermon sources of the tests' own (mw-qtu3zvz.2): rows held here, so a scenario shows the Sermons door and sheet with no data file read and no page fetched.
// registerTestSermons() puts them in the registry (src/sermons/index.ts setSermonSources); forgetTestSermons() puts the real ones back.
import { CATALOGUE, type CatalogueEntry, type SermonAt } from '../../src/resources/catalogue';
import { setSermonSources } from '../../src/sermons';
import { setArchiveBooks, SERMON_BOOKS } from '../../src/sermons/sources/logos';
import { offSource, secondSource, sourceOf, testSource, TEST_ROWS, TEST_ROWS_SECOND } from './sermon-sources';

export { offSource, secondSource, testSource, TEST_ROWS, TEST_ROWS_SECOND };

/** Registers the tests' first source (with `second`, the other one after it; with `off`, only a source that starts Off; with `none`, a source with no rows at all). */
export const registerTestSermons = ({ second = false, off = false, none = false }: { second?: boolean; off?: boolean; none?: boolean } = {}): void => {
  if (off) return setSermonSources([offSource]);
  if (none) return setSermonSources([sourceOf('testnone', 'Test No Sermons', {})]);
  setSermonSources([testSource, ...(second ? [secondSource] : [])]);
};
export const forgetTestSermons = (): void => setSermonSources(undefined);

/** The sermon book `resource` of the catalogue, told of these sermons by passage (the catalogue holds no verse index of its own yet, mw-qtu3zvz.239): a test gives the books it wants listed a sermon at the place it opens. */
export const toldOf = (resource: string, sermonsAt: SermonAt[]): CatalogueEntry => ({ ...CATALOGUE.find((e) => e.resource === resource)!, sermonsAt });

/** The sermon books the In Logos group is built from, with the sermons a test tells them of; every other book as the catalogue has it. */
export const registerTestArchives = (...told: CatalogueEntry[]): void => setArchiveBooks(SERMON_BOOKS.map((entry) => told.find((t) => t.resource === entry.resource) ?? entry));
export const forgetTestArchives = (): void => setArchiveBooks(undefined);

/** A sermon at the verse the tests open on, opened by the reference form of a book of the Bible (`ref=Bible.Ro5.8`). */
export const sermonAt = (book: string, chapter: number, from: number, at: string, to = from): SermonAt => ({ book, chapter, from, to, at });
