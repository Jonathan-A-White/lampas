// scripts/ladder-docs.ts — writes the docs that follow from the ladder (`npm run ladder:docs`, mw-svw421.9): the ladder table of docs/grammar.md and the rows of
// docs/card-audit.md, both from the ladders (src/data/grammar/ladders.ts ladderFor: the Greek one first, the Hebrew one after it in its own block). The audit's verdict and note columns are by hand and kept by idea id; an idea with no row
// gets one with a default note to replace. A second run changes nothing, and tests/unit/ladder-single-source.test.ts fails when the docs are behind.
import { readFileSync, writeFileSync } from 'node:fs';
import { LADDER } from '../src/data/grammar/ladder.ts';
import { HEBREW_LADDER } from '../src/data/grammar/hebrew/ladder.ts';
import { AUDIT_DOC, GRAMMAR_DOC, withAuditTable, withGrammarTable } from './ladder-docs-text.ts';

writeFileSync(GRAMMAR_DOC, withGrammarTable(withGrammarTable(readFileSync(GRAMMAR_DOC, 'utf8'), LADDER), HEBREW_LADDER, 'hbo'));
writeFileSync(AUDIT_DOC, withAuditTable(withAuditTable(readFileSync(AUDIT_DOC, 'utf8'), LADDER), HEBREW_LADDER, 'hbo'));
console.log(`wrote the ladder table of ${GRAMMAR_DOC} and the rows of ${AUDIT_DOC}, both ladders`);
