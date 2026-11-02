// mw-5r3p30.982: copywork's Hebrew rule marked a right בְּרֵאשִׁית (and, far more often, a right הַשָּׁמַיִם) wrong about one run in fifteen, the model
// calling the dagesh "missing" from the bet or the shin: mw-5r3p30.959 worked the shin's two dots, so the model read the shin dot for the dagesh and the
// dagesh for nothing. The Hebrew section now says where each mark of a pointed letter sits (the dagesh inside the body, the shin dot above, the vowel below)
// and worked the two words that flaked; mw-5r3p30.989 took the worked words out again (they primed a false fault) and added the letters-first count; the live proof
// is `mw grist eval lampas copywork --example hbo-perfect-genesis-1-1`, which holds words.4 (הַשָּׁמַיִם) right.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const text = instructionsOf('copywork');
const from = text.indexOf('### Hebrew (`hbo`)');
const hebrew = text.slice(from, text.indexOf('\n## ', from));

describe("copywork's Hebrew rule says where each mark of a letter sits", () => {
  it('puts the dagesh inside the body of the letter, apart from the shin dot above and the vowel below', () => {
    expect(hebrew).toMatch(/dagesh[^.]*inside the (body|letter)/i);
    expect(hebrew).toMatch(/shin dot[^.]*above/i);
  });

  // mw-5r3p30.989: naming the two words (בְּרֵאשִׁית, הַשָּׁמַיִם) and their marks made the model look for a fault there and invent one (the dagesh of
  // the shin 'missing', the yod 'missing' on a page that has them: 7 of 12 runs on the perfect page), so the rule is general: letters first, then marks.
  it('names no word of the examples: a worked word led the model to find a fault in it', () => {
    expect(hebrew).not.toMatch(/Take בְּרֵאשִׁית|Take הַשָּׁמַיִם/);
  });

  it('has him count the consonants first, a yod or a vav being small letters', () => {
    expect(hebrew).toMatch(/count the model word's consonants/);
    expect(hebrew).toMatch(/yod[^.]*vav[^.]*is a letter, though small/);
  });

  it('says a point sits under its letter, so a small letter above a seen point is looked for before it is called missing', () => {
    expect(hebrew).toMatch(/vowel point sits under its letter[^.]*small letter above it/);
  });

  it('calls a point missing only on bare paper, and a small point he cannot settle is not a fault', () => {
    expect(hebrew).toMatch(/Mark a point missing only when you looked at its place and\s+can see bare paper there/);
    expect(hebrew).toMatch(/cannot settle either way is not a fault you can name: the word is `right`/);
  });

  it('still marks a point wrong when the place was looked at and it is truly not there', () => {
    expect(hebrew).toMatch(/is not there[^.]*`wrong`/);
  });
});
