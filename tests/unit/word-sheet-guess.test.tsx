// A variant word's Strong's number and where it came from (mw-9ji6ek0.44): a guessed number shows on the word sheet with a small 'guess' mark, a tap on the mark says in one line
// why it is a guess, an exact one (the lexicon's or TAGNT's) has no mark, and Revelation 10:2's βιβλαρίδιον is G974 with a Strong's link that opens that number.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { GUESS_WHY } from '../../src/GuessedNumber';
import { strongs, strongsUrl } from '../../src/resources/strongs';
import { WordSheet } from '../../src/WordSheet';

afterEach(cleanup);

const chapter = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;
const variantWord = (c: Chapter, form: string): GreekWord => c.variants!.flatMap((u) => u.alts).flatMap((a) => a.g!).find((w) => w.t === form)!;

describe('the word sheet of a variant word', () => {
  const user = userEvent.setup();

  it('marks a guessed number with “guess”, and a tap on the mark says why in one line', async () => {
    const mark = chapter('mrk', 5);
    const word = variantWord(mark, 'Γερασηνῶν');
    expect(word.src).toBe('guess');
    render(<WordSheet chapter={mark} lookup={{ words: [word], fromEnglish: false, verse: 1, variant: 'in variant B' }} onClose={() => undefined} />);
    const fact = (await screen.findAllByTestId('sheet-strongs'))[0];
    expect(fact.textContent).toContain(word.s);
    expect(screen.queryByTestId('sheet-guess-why')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'guess' }));
    expect(screen.getByTestId('sheet-guess-why').textContent).toBe(GUESS_WHY);
    expect(GUESS_WHY).toMatch(/^A guess:.*TAGNT\.$/);
    await user.click(screen.getByRole('button', { name: 'guess' }));
    expect(screen.queryByTestId('sheet-guess-why')).toBeNull();
  });

  it('has no mark on a number TAGNT gives: Revelation 10:2’s βιβλαρίδιον is G974, and its Strong’s link opens STEPBible at it', async () => {
    const rev = chapter('rev', 10);
    const word = variantWord(rev, 'βιβλαρίδιον');
    expect(word).toMatchObject({ s: 'G974', l: 'βιβλαρίδιον', src: 'tagnt' });
    render(<WordSheet chapter={rev} lookup={{ words: [word], fromEnglish: false, verse: 2, variant: 'in variant NA' }} onClose={() => undefined} />);
    expect((await screen.findAllByTestId('sheet-word'))[0].textContent).toBe('βιβλαρίδιον');
    expect(screen.queryByRole('button', { name: 'guess' })).toBeNull();
    const links = strongs.linksFor({ form: word.t, lemma: word.l, strongs: word.s });
    expect(links).toEqual([{ label: 'G974', url: strongsUrl('G974') }]);
    expect(links[0].url).toContain('strong=G0974');
  });
});
