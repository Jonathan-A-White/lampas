// The word sheet's Definition (mw-5r3p30.1163, his ask 2026-11-14: 'Can Bible references in definitions have links? ... the definition formatting could use some love'): every Bible
// reference in it is a link that opens the reader on that verse, the part before '§' (who the word names) and the part after it stand apart, and numbered senses each take a line.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Definition } from '../../src/Definition';
import { definitionOf } from '../../src/definition';

afterEach(cleanup);

const GERSHOM =
  'A man of the tribe of Levi living at the time of Egypt and Wilderness, first mentioned at Exo.2.22; son of: Moses and Zipporah; brother of: Eliezer; father of: Jonathan (?) and Shebuel § Gershom = "foreigner" 1) firstborn son of Moses and Zipporah 2) firstborn son of Levi 3) a son of the priestly…';
const MOSES = 'A man of the tribe of Levi, first mentioned at Exo.2.10; father of: Gershom and Eliezer; also called Micah at Jdg.18.30(?) and Gen.11.26--17.5 § Moses = "drawn out" 1) the great leader 1a) prophet 1b) lawgiver';

describe('definitionOf', () => {
  it('cuts the Gershom text at the section sign, the who-part into its clauses and the sense part into its numbered senses', () => {
    const parts = definitionOf(GERSHOM);
    expect(parts.who.map((line) => line.map((piece) => piece.text).join(''))).toEqual([
      'A man of the tribe of Levi living at the time of Egypt and Wilderness, first mentioned at Exo.2.22',
      'son of: Moses and Zipporah',
      'brother of: Eliezer',
      'father of: Jonathan (?) and Shebuel',
    ]);
    expect(parts.meaning.map((s) => [s.label, s.depth, s.text.map((piece) => piece.text).join('')])).toEqual([
      ['', 0, 'Gershom = "foreigner"'],
      ['1)', 0, 'firstborn son of Moses and Zipporah'],
      ['2)', 0, 'firstborn son of Levi'],
      ['3)', 0, 'a son of the priestly…'],
    ]);
  });

  it('links Exo.2.22 and nothing else of the Gershom text', () => {
    const links = [...definitionOf(GERSHOM).who, ...definitionOf(GERSHOM).meaning.map((s) => s.text)].flat().filter((piece) => piece.ref !== undefined);
    expect(links.map((piece) => [piece.text, piece.ref])).toEqual([['Exo.2.22', 'Exod.2.22']]);
  });

  it('links each reference of the Moses text, a doubtful one beside its (?) and a range at its first verse, and the (?) stays plain beside it', () => {
    const links = definitionOf(MOSES).who.flat().filter((piece) => piece.ref !== undefined);
    expect(links.map((piece) => [piece.text, piece.ref])).toEqual([
      ['Exo.2.10', 'Exod.2.10'],
      ['Jdg.18.30', 'Judg.18.30'],
      ['Gen.11.26', 'Gen.11.26'],
    ]);
    const also = definitionOf(MOSES).who[2].map((piece) => piece.text);
    expect(also.join('')).toBe('also called Micah at Jdg.18.30(?) and Gen.11.26--17.5');
    expect(also).toContain('(?)');
  });

  it('keeps a reference it cannot read as plain text', () => {
    const parts = definitionOf('first mentioned at Xyz.2.22; also at Foo.1.1');
    expect(parts.who.flat().filter((piece) => piece.ref !== undefined)).toEqual([]);
    expect(parts.who.map((line) => line.map((piece) => piece.text).join(''))).toEqual(['first mentioned at Xyz.2.22', 'also at Foo.1.1']);
  });

  it('nests the lettered senses under their number', () => {
    const senses = definitionOf('male-sibling 1) brother 1a) brother of same parents 1c1) kin 2) another').meaning;
    expect(senses.map((s) => [s.label, s.depth])).toEqual([['', 0], ['1)', 0], ['1a)', 1], ['1c1)', 2], ['2)', 0]]);
  });

  it('reads a Greek (Abbott-Smith) definition with its __1. senses on their own lines', () => {
    const senses = definitionOf('Ἀβιά (Heb. אֲבִיָּה), ὁ, indecl., Abia, Abijah. __1. Son of Rehoboam ( ):. __2. A priest ( ):.').meaning;
    expect(senses.map((s) => s.label)).toEqual(['', '1.', '2.']);
  });

  it('is plain text with one line for a definition with no section sign and no sense', () => {
    const parts = definitionOf('the heavens');
    expect(parts.who).toEqual([]);
    expect(parts.meaning.map((s) => [s.label, s.text.map((p) => p.text).join('')])).toEqual([['', 'the heavens']]);
  });
});

describe('Definition', () => {
  it('draws the who-part and the meaning apart, each reference a link to the reader, each sense on its own line', async () => {
    render(<Definition text={GERSHOM} />);
    const link = screen.getByRole('link', { name: 'Exo.2.22' });
    expect(link.getAttribute('href')).toBe('#/?ref=Exod.2.22&as=Exo.2.22');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getAllByTestId('definition-who')).toHaveLength(4);
    const senses = screen.getAllByTestId('definition-sense');
    expect(senses).toHaveLength(4);
    expect(within(senses[1]).getByText('1)')).toBeTruthy();
    expect(senses[1].textContent).toBe(' 1) firstborn son of Moses and Zipporah');
    expect(screen.getByTestId('definition-meaning')).toBeTruthy();
  });

  it('is a link to the reader at the verse, which the address then holds', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    window.addEventListener('hashchange', seen);
    render(<Definition text="first mentioned at Exo.2.22" />);
    await user.click(screen.getByRole('link', { name: 'Exo.2.22' }));
    expect(window.location.hash).toBe('#/?ref=Exod.2.22&as=Exo.2.22');
    window.removeEventListener('hashchange', seen);
    window.location.hash = '';
  });
});
