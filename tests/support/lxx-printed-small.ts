// The forms Swete prints with a small letter somewhere in the whole text, that the fixtures (Gen 1, Ps 22, John 1: a chapter each) print only with a capital:
// Γενηθήτω and Αὐξάνεσθε open what God says (a capital that is only the capital), Κυρίου is the Lord's name where the Psalm's title has it. A whole run of the
// derivation sees them small elsewhere (checked against the pinned Swete); a fixture does not, so it is given them (DeriveInput.printedSmall, story mw-u2w5klk.22).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PRINTED_SMALL: readonly string[] = readFileSync(join('tests/fixtures/lxx', 'swete-printed-small.txt'), 'utf8').split('\n').filter(Boolean);
