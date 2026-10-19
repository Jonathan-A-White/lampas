// The axe rule ids tests/e2e/accessibility.spec.ts leaves out of its check (mw-cwf538.2). Each has its reason in docs/accessibility.md;
// tests/unit/accessibility-doc.test.ts fails on an id here with no entry there, and on an entry there that is no longer excluded.
export const EXCLUDED_RULES: readonly string[] = ['meta-viewport'];
