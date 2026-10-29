// The scenarios under grinds/examples/ in a test's import graph, so `vitest related <a scenario>` selects a test that pins their shape;
// imported for its side effect, as tests/support/grinds-in-graph.ts is (mw-5r3p30.860).
import.meta.glob('../../grinds/examples/*/*.json', { eager: true, import: 'default' });
