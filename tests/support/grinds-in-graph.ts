// `vitest related <file>` selects the tests that import <file>, and a test that reads grinds/ by path (readFileSync, readdirSync) imports
// nothing: a grinds edit that breaks its ceiling or schema selected no test, and landed (mw-5r3p30.860). A test that pins the size or the
// shape of grinds files imports this module for its side effect, which puts them in its graph (grinds/*.md load as their text, a plugin
// in vitest.config.ts; a ?raw import would not do, since vitest looks the path up with the query on it).
import.meta.glob(
  ['../../grinds/*.json', '../../grinds/*.md', '../../grinds/*.instructions/*.md'],
  { eager: true, import: 'default' },
);
