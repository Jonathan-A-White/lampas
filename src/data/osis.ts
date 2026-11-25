// src/data/osis.ts — each book's OSIS code by the app's book code: what the links Lampas writes use (src/nav/links.ts, which exports them on), and what the data
// builds read in a source's references (scripts/timeline-import.ts). It imports nothing, so a script can read it without the app's build.

/** Each book's OSIS code, which the links Lampas writes use: 'Rom', '1John'. */
export const OSIS: Readonly<Record<string, string>> = {
  mat: 'Matt', mrk: 'Mark', luk: 'Luke', jhn: 'John', act: 'Acts', rom: 'Rom', '1co': '1Cor', '2co': '2Cor', gal: 'Gal', eph: 'Eph',
  php: 'Phil', col: 'Col', '1th': '1Thess', '2th': '2Thess', '1ti': '1Tim', '2ti': '2Tim', tit: 'Titus', phm: 'Phlm', heb: 'Heb', jas: 'Jas',
  '1pe': '1Pet', '2pe': '2Pet', '1jn': '1John', '2jn': '2John', '3jn': '3John', jud: 'Jude', rev: 'Rev',
};

/** The Old Testament books' OSIS codes, for the links to a reference outside the New Testament ('Gen.1.28'; data/otBooks.ts has the names). */
export const OT_OSIS: Readonly<Record<string, string>> = {
  gen: 'Gen', exo: 'Exod', lev: 'Lev', num: 'Num', deu: 'Deut', jos: 'Josh', jdg: 'Judg', rut: 'Ruth', '1sa': '1Sam', '2sa': '2Sam', '1ki': '1Kgs',
  '2ki': '2Kgs', '1ch': '1Chr', '2ch': '2Chr', ezr: 'Ezra', neh: 'Neh', est: 'Esth', job: 'Job', psa: 'Ps', pro: 'Prov', ecc: 'Eccl', sng: 'Song',
  isa: 'Isa', jer: 'Jer', lam: 'Lam', ezk: 'Ezek', dan: 'Dan', hos: 'Hos', jol: 'Joel', amo: 'Amos', oba: 'Obad', jon: 'Jonah', mic: 'Mic',
  nam: 'Nah', hab: 'Hab', zep: 'Zeph', hag: 'Hag', zec: 'Zech', mal: 'Mal',
};
