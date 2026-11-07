// tests/support/test-sermons.ts — sermon sources of the tests' own (mw-qtu3zvz.2): rows held here, so a scenario shows the Sermons door and sheet with no data file read and no page fetched.
// registerTestSermons() puts them in the registry (src/sermons/index.ts setSermonSources); forgetTestSermons() puts the real ones back.
import { setSermonSources } from '../../src/sermons';
import { offSource, secondSource, sourceOf, testSource, TEST_ROWS, TEST_ROWS_SECOND } from './sermon-sources';

export { offSource, secondSource, testSource, TEST_ROWS, TEST_ROWS_SECOND };

/** Registers the tests' first source (with `second`, the other one after it; with `off`, only a source that starts Off; with `none`, a source with no rows at all). */
export const registerTestSermons = ({ second = false, off = false, none = false }: { second?: boolean; off?: boolean; none?: boolean } = {}): void => {
  if (off) return setSermonSources([offSource]);
  if (none) return setSermonSources([sourceOf('testnone', 'Test No Sermons', {})]);
  setSermonSources([testSource, ...(second ? [secondSource] : [])]);
};
export const forgetTestSermons = (): void => setSermonSources(undefined);
