// scripts/language-parity-docs.ts — writes the golden list table and the Hebrew gaps of docs/language-parity.md from src/languages/useCases.ts and
// the tags under features/ (`npm run parity:docs`, mw-5r3p30.903). A second run changes nothing; tests/unit/language-parity.test.ts fails when
// the doc is behind.
//
//   tsx scripts/language-parity-docs.ts [-h | --help]
//
// It takes no other argument: -h and --help print this text and exit 0, and anything else prints one line naming it and this text to stderr and exits 2. Both
// answer before the doc is read or written (mw-ar5k42b.35).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { USE_CASES, isGap } from '../src/languages/useCases.ts';
import { readFeatures } from '../tests/support/features.ts';
import { GAPS_END, GAPS_START, PARITY_DOC, TABLE_END, TABLE_START, hebrewGapsSection, parityTable, withBlock } from '../tests/support/parityTable.ts';

// The arguments come first, before anything is read or written: asking for help must never rewrite the doc (mw-ar5k42b.35).
const own = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
const USAGE = own
  .slice(0, own.findIndex((line) => !line.startsWith('//')))
  .map((line) => line.replace(/^\/\/ ?/, ''))
  .join('\n');
const [arg] = process.argv.slice(2);
if (arg === '-h' || arg === '--help') {
  console.log(USAGE);
  process.exit(0);
} else if (arg !== undefined) {
  console.error(`language-parity-docs.ts: unknown argument '${arg}' (it takes none besides -h and --help)\n${USAGE}`);
  process.exit(2);
}

const features = readFeatures();
let doc = readFileSync(PARITY_DOC, 'utf8');
doc = withBlock(doc, TABLE_START, TABLE_END, parityTable(features));
doc = withBlock(doc, GAPS_START, GAPS_END, hebrewGapsSection(USE_CASES.filter((u) => isGap(u.status.hebrew))));
writeFileSync(PARITY_DOC, doc);
console.log(`wrote the golden list (${USE_CASES.length} use cases) and the Hebrew gaps of ${PARITY_DOC}`);
