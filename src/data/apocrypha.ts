// src/data/apocrypha.ts — the ten books of the Apocrypha Lampas can name (mw-5r3p30.1034): our code (three characters, never a code of the canon's 66, canon.ts), the name, the
// chapter count, the abbreviation Logos' list gives the book in a reference (UNVERIFIED on a device, docs/resources.md) and the other names a reference is written with. Lampas holds
// no text of them: a reference to one is read (nav/links.ts) so the tutor's link can open it in his Apocrypha Bible in Logos (resources/logosBible.ts), and nowhere else. The chapter
// count is the Greek one the NRSV and the Logos Bibles use (Sirach 51); verse counts differ by Bible and are not held.
export interface ApocryphaBook {
  code: string;
  name: string;
  chapters: number;
  /** the book's abbreviation in a Logos reference: 'Sir', '1Ma' */
  logos: string;
  /** the other ways a reference writes the book, beside the name and `logos` (lower case, no spaces; the matcher drops spaces and dots). The code is not one: 'man' is a plain word */
  names: readonly string[];
  /** the names (lower case, no spaces) that are also plain English words ('Sir', 'Bar', 'Wisdom'): a reference by one of them is read only with a verse ('Sir 1:1'), never as a chapter alone */
  plain?: readonly string[];
}

export const APOCRYPHA: readonly ApocryphaBook[] = [
  { code: 'tob', name: 'Tobit', chapters: 14, logos: 'Tob', names: ['tobias'] },
  { code: 'jdt', name: 'Judith', chapters: 16, logos: 'Jdt', names: ['judith', 'jdth'] },
  { code: 'wis', name: 'Wisdom of Solomon', chapters: 19, logos: 'Wis', names: ['wisdom', 'wisofsol', 'wisdomofsolomon'], plain: ['wisdom'] },
  { code: 'sir', name: 'Sirach', chapters: 51, logos: 'Sir', names: ['sirach', 'ecclesiasticus', 'ecclus', 'wisdomofsirach', 'bensira'], plain: ['sir'] },
  { code: 'bar', name: 'Baruch', chapters: 6, logos: 'Bar', names: ['baruch'], plain: ['bar'] },
  { code: '1ma', name: '1 Maccabees', chapters: 16, logos: '1Ma', names: ['1macc', '1mac', '1maccabees'] },
  { code: '2ma', name: '2 Maccabees', chapters: 15, logos: '2Ma', names: ['2macc', '2mac', '2maccabees'] },
  { code: '1es', name: '1 Esdras', chapters: 9, logos: '1Es', names: ['1esd', '1esdr', '1esdras'] },
  { code: '2es', name: '2 Esdras', chapters: 16, logos: '2Es', names: ['2esd', '2esdr', '2esdras'] },
  { code: 'man', name: 'Prayer of Manasseh', chapters: 1, logos: 'PrMan', names: ['prman', 'prayerofmanasseh', 'prmanasseh'] },
];

/** The book a code names when it is one of the ten of the Apocrypha. */
export const apocryphaBookOf = (code: string): ApocryphaBook | undefined => APOCRYPHA.find((b) => b.code === code);
