// The Strong's link (src/resources/strongs.ts): STEPBible opens it in the visitor's saved primary version, so the link names one
// that carries the tagging, and a Hebrew number is written as STEP searches it (H7225 'beginning' finds nothing, H7225G lists 39 verses).
// His report (mw-5r3p30.891): Genesis 1:1, the Study button H7225, STEP: 'did not yield any results in the following resources: LSB'.
import { describe, expect, it } from 'vitest';
import { strongsUrl } from '../../src/resources/strongs';

describe("the Strong's link names a STEP version (mw-5r3p30.891)", () => {
  it('opens a Hebrew number in the ESV, with the letter STEP searches it by (H7225 is H7225G)', () => {
    expect(strongsUrl('H7225')).toBe('https://www.stepbible.org/?q=version=ESV|strong=H7225G');
  });

  it('opens a Greek number in the ESV (G26, love, is G0026)', () => {
    expect(strongsUrl('G26')).toBe('https://www.stepbible.org/?q=version=ESV|strong=G0026');
  });

  it("keeps a Greek number's extended letter beside the version (G2424, Jesus)", () => {
    expect(strongsUrl('G2424')).toBe('https://www.stepbible.org/?q=version=ESV|strong=G2424G');
  });

  it('never leaves the version out, so a saved primary version cannot empty the search', () => {
    for (const number of ['G1722', 'G3361', 'H1', 'H430', 'H7225', 'H8674']) {
      const url = strongsUrl(number);
      if (url?.includes('stepbible.org')) expect(url).toMatch(/\?q=version=ESV\|strong=[GH]\d{4}[A-Za-z]?$/);
    }
  });
});
