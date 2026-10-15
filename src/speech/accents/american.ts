// src/speech/accents/american.ts — the sound hints for a General American ear, the default (mw-5r3p30.352). Each was read for an American ear: the o
// of 'lot' is 'ah' to an American, so the o is the o of 'or', said short (PROVISIONAL, the Governor to confirm); an American r is never rolled, so the
// Greek tap is the tt of 'butter', the one place American English taps it. The rest are the words the lessons always gave.
import type { EnglishAccent } from './types';

export const AMERICAN: EnglishAccent = {
  id: 'american',
  label: 'American',
  hints: {
    '/a/': { word: 'father' },
    '/e/': { word: 'pet' },
    '/i/': { word: 'see' },
    '/o/': { word: 'or', note: 'short' },
    '/u/': { word: 'food' },
    '/v/': { word: 'vase' },
    '/f/': { word: 'fan' },
    '/ð/': { note: 'the th of “this”' },
    '/θ/': { word: 'thin' },
    '/ɣ/': { note: 'a soft throaty g' },
    '/ʝ/': { word: 'yes' },
    '/x/': { word: 'loch', note: 'the Scottish ch' },
    '/ç/': { word: 'huge' },
    '/z/': { word: 'zoo' },
    '/s/': { word: 'sun' },
    '/b/': { word: 'bed' },
    '/p/': { word: 'pen' },
    '/d/': { word: 'dog' },
    '/t/': { word: 'top' },
    '/ɡ/': { word: 'go' },
    '/k/': { word: 'kite' },
    '/m/': { word: 'mother' },
    '/n/': { word: 'now' },
    '/l/': { word: 'lamp' },
    '/ɾ/': { note: 'a quick tap of the tongue, like the tt of “butter”' },
    '/ks/': { word: 'box' },
    '/ps/': { word: 'lips' },
    '/mb/': { word: 'number' },
    '/nd/': { word: 'under' },
    '/ŋɡ/': { word: 'finger' },
    '/ŋks/': { word: 'thanks' },
  },
};
