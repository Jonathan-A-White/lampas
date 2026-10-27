// src/speech/accents/american.ts — the sound hints for a General American ear, the default (mw-5r3p30.352). Each was read for an American ear: the o
// of 'lot' is 'ah' to an American, so the o is the o of 'or', said short (PROVISIONAL, the Governor to confirm); an American r is never rolled, so the
// Greek tap is the tt of 'butter', the one place American English taps it. Many Americans say 'loch' as 'lock', so χ is the throaty ch of
// 'chutzpah' (mw-5r3p30.475, PROVISIONAL, the Governor to confirm); British keeps 'loch'. A p, t or k that starts an English word is said with a
// breath and Greek π, τ and κ never are, so they are keyed after an s, where English has no breath: 'spin', 'stop', 'skate' (mw-5r3p30.476,
// PROVISIONAL, the Governor to pick the words). The rest are the words the lessons always gave.
import type { EnglishAccent } from './types';

export const AMERICAN: EnglishAccent = {
  id: 'american',
  label: 'American',
  hintedBy: "with a word of the reader's English that has it",
  hints: {
    '/a/': { word: 'father' },
    '/e/': { word: 'pet' },
    '/i/': { word: 'see' },
    '/o/': { word: 'or', note: 'short', choice: 'as in “or”, short' },
    '/u/': { word: 'food' },
    '/v/': { word: 'vase' },
    '/f/': { word: 'fan' },
    '/ð/': { note: 'the th of “this”' },
    '/θ/': { word: 'thin' },
    '/ɣ/': { note: 'a soft throaty g' },
    '/ʝ/': { word: 'yes' },
    '/x/': { word: 'chutzpah', note: 'the throaty ch' },
    '/ç/': { word: 'huge' },
    '/z/': { word: 'zoo' },
    '/s/': { word: 'sun' },
    '/b/': { word: 'bed' },
    '/p/': { word: 'spin' },
    '/d/': { word: 'dog' },
    '/t/': { word: 'stop' },
    '/ɡ/': { word: 'go' },
    '/k/': { word: 'skate' },
    '/m/': { word: 'mother' },
    '/n/': { word: 'now' },
    '/l/': { word: 'lamp' },
    '/ɾ/': { note: 'a quick tap of the tongue, like the tt of “butter”', choice: 'a quick tap of the tongue' },
    '/ks/': { word: 'box' },
    '/ps/': { word: 'lips' },
    '/mb/': { word: 'number' },
    '/nd/': { word: 'under' },
    '/ŋɡ/': { word: 'finger' },
    '/ŋks/': { word: 'thanks' },
    '/h/': { word: 'hat' },
    '/ʁ/': { word: 'red', note: 'said further back in the throat' },
    '/ʃ/': { word: 'ship' },
    '/ts/': { word: 'cats' },
    '/j/': { word: 'yes' },
  },
};
