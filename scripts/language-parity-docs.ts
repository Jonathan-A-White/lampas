// scripts/language-parity-docs.ts — writes the golden list table and the Hebrew gaps of docs/language-parity.md from src/languages/useCases.ts and
// the tags under features/ (`npm run parity:docs`, mw-5r3p30.903). A second run changes nothing; tests/unit/language-parity.test.ts fails when
// the doc is behind.
import { readFileSync, writeFileSync } from 'node:fs';
import { USE_CASES, isGap } from '../src/languages/useCases.ts';
import { readFeatures } from '../tests/support/features.ts';
import { GAPS_END, GAPS_START, PARITY_DOC, TABLE_END, TABLE_START, hebrewGapsSection, parityTable, withBlock } from '../tests/support/parityTable.ts';

const features = readFeatures();
let doc = readFileSync(PARITY_DOC, 'utf8');
doc = withBlock(doc, TABLE_START, TABLE_END, parityTable(features));
doc = withBlock(doc, GAPS_START, GAPS_END, hebrewGapsSection(USE_CASES.filter((u) => isGap(u.status.hebrew))));
writeFileSync(PARITY_DOC, doc);
console.log(`wrote the golden list (${USE_CASES.length} use cases) and the Hebrew gaps of ${PARITY_DOC}`);
