// src/speech/sounds.ts — the standard in the middle (mw-5r3p30.352, his words: "there should be a standard ... the module explains how to get to The
// Standard and then the app [uses] the module"): every sound the app teaches, once, keyed by its IPA id. A Greek pronunciation (./schemes/) maps the
// sounds its respelling writes to these ids (Pronunciation.sounds), and an English accent (./accents/) gives each id the hint a reader of that accent
// hears it in. The ids are the app's module boundary: they never reach the learner (only an IPA accent, mw-5r3p30.353, would show them).
// A new sound is one line here plus a hint in every accent table (tests/unit/english-accents.test.ts fails until each has it).

/** Each sound by its IPA id, with what it is, for the developer. */
export const SOUNDS = {
  '/a/': 'open front vowel',
  '/e/': 'mid front vowel',
  '/i/': 'close front vowel',
  '/o/': 'mid back rounded vowel',
  '/u/': 'close back rounded vowel',
  '/v/': 'voiced labiodental fricative',
  '/f/': 'voiceless labiodental fricative',
  '/ð/': 'voiced dental fricative',
  '/θ/': 'voiceless dental fricative',
  '/ɣ/': 'voiced velar fricative',
  '/ʝ/': 'voiced palatal fricative',
  '/x/': 'voiceless velar fricative',
  '/ç/': 'voiceless palatal fricative',
  '/z/': 'voiced alveolar fricative',
  '/s/': 'voiceless alveolar fricative',
  '/b/': 'voiced bilabial stop',
  '/p/': 'voiceless bilabial stop',
  '/d/': 'voiced alveolar stop',
  '/t/': 'voiceless alveolar stop',
  '/ɡ/': 'voiced velar stop',
  '/k/': 'voiceless velar stop',
  '/m/': 'bilabial nasal',
  '/n/': 'alveolar nasal',
  '/l/': 'alveolar lateral',
  '/ɾ/': 'alveolar tap',
  '/ks/': 'k and s',
  '/ps/': 'p and s',
  '/mb/': 'm and b',
  '/nd/': 'n and d',
  '/ŋɡ/': 'velar nasal and g',
  '/ŋks/': 'velar nasal, k and s',
  // the sounds Hebrew has and Greek has no use for (mw-gdcyf98.24, the Israeli scheme)
  '/h/': 'voiceless glottal fricative',
  '/ʁ/': 'voiced uvular fricative (the Israeli resh)',
  '/ʃ/': 'voiceless postalveolar fricative',
  '/ts/': 't and s said together as one sound',
  '/j/': 'palatal approximant',
} as const;

/** A sound's standard id: '/o/', '/x/', '/ɣ/'. */
export type SoundId = keyof typeof SOUNDS;

/** Every standard id, in the order above. */
export const SOUND_IDS = Object.keys(SOUNDS) as readonly SoundId[];

/** The pairs of sounds an English ear takes for each other (mw-5r3p30.356): the course 'Learn the IPA sounds' (src/ipa/) drills a sound with its partners, and offers
 * them among each other's choices. Each pair is written once; CONFUSABLE gives it both ways. */
const CONFUSABLE_PAIRS: readonly (readonly [SoundId, SoundId])[] = [
  ['/x/', '/ç/'],
  ['/ɣ/', '/ʝ/'],
  ['/θ/', '/ð/'],
  ['/v/', '/f/'],
  ['/z/', '/s/'],
  ['/b/', '/p/'],
  ['/d/', '/t/'],
  ['/ɡ/', '/k/'],
  ['/e/', '/i/'],
  ['/o/', '/u/'],
  ['/ks/', '/ps/'],
  ['/b/', '/mb/'],
  ['/d/', '/nd/'],
  ['/ɡ/', '/ŋɡ/'],
  ['/ks/', '/ŋks/'],
  ['/m/', '/n/'],
  ['/l/', '/ɾ/'],
  ['/s/', '/ʃ/'],
  ['/s/', '/ts/'],
  ['/h/', '/x/'],
];

/** Each sound's confusable partners, by id. */
export const CONFUSABLE: Readonly<Partial<Record<SoundId, readonly SoundId[]>>> = (() => {
  const out: Partial<Record<SoundId, SoundId[]>> = {};
  for (const [a, b] of CONFUSABLE_PAIRS) {
    (out[a] ??= []).push(b);
    (out[b] ??= []).push(a);
  }
  return out;
})();
