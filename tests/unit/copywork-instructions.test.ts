// mw-5r3p30.982: copywork's Hebrew rule marked a right בְּרֵאשִׁית (and, far more often, a right הַשָּׁמַיִם) wrong about one run in fifteen, the model
// calling the dagesh "missing" from the bet or the shin: mw-5r3p30.959 worked the shin's two dots, so the model read the shin dot for the dagesh and the
// dagesh for nothing. The Hebrew section now says where each mark of a pointed letter sits (the dagesh inside the body, the shin dot above, the vowel below)
// and works the two words that flaked, each mark found one by one; the live proof is `mw grist eval lampas copywork --example hbo-perfect-genesis-1-1`.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../support/grinds-in-graph';

const text = readFileSync('grinds/copywork.instructions.md', 'utf8');
const from = text.indexOf('### Hebrew (`hbo`)');
const hebrew = text.slice(from, text.indexOf('\n## ', from));

describe("copywork's Hebrew rule says where each mark of a letter sits", () => {
  it('puts the dagesh inside the body of the letter, apart from the shin dot above and the vowel below', () => {
    expect(hebrew).toMatch(/dagesh[^.]*inside the (body|letter)/i);
    expect(hebrew).toMatch(/shin dot[^.]*above/i);
  });

  it('works בְּרֵאשִׁית: the bet has a dagesh and a sheva', () => {
    expect(hebrew).toMatch(/Take בְּרֵאשִׁית\.[^.]*dagesh[^.]*sheva/);
  });

  it('works הַשָּׁמַיִם: the shin has the dot above and a dagesh inside, and the yod is there', () => {
    expect(hebrew).toMatch(/Take הַשָּׁמַיִם\.[^.]*shin[^.]*dagesh/);
    expect(hebrew).toMatch(/Take הַשָּׁמַיִם\.[^.]*yod/i);
  });

  it('still marks a point wrong when the place was looked at and it is truly not there', () => {
    expect(hebrew).toMatch(/is not there[^.]*`wrong`/);
  });
});
