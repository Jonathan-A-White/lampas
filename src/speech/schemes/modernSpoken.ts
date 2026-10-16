// src/speech/schemes/modernSpoken.ts — what a phone's English speech recognition writes when he says a Greek letter, for Modern Greek (mw-86e9r1.12, PROVISIONAL):
// the letter's names (the English one is the idea's own title; here the Greek ones, which a Greek voice says, 'vita' for β) and, for each symbol the respelling
// writes ('v', 'gh', 'ee'), the spellings a recogniser gives it when he says the sound alone. A recogniser cannot write 'gh', so it writes 'g'; it hears 'ee' as
// 'ee', 'ea' or 'e'. The Say it matcher (src/data/grammar/sayIt.ts) accepts these and the lesson's own symbols and nothing else; a sound that two letters share
// (ee for η ι υ, o for ο ω) is accepted for each of them. Every entry is lower case, letters only.

/** The names a Greek voice says for each letter, by the ladder idea id, besides the English name. */
export const MODERN_LETTER_NAMES: Readonly<Record<string, readonly string[]>> = {
  'letter-alpha': ['alfa'],
  'letter-beta': ['vita', 'veeta', 'veta'],
  'letter-gamma': ['gamma', 'ghama', 'yama'],
  'letter-delta': ['dhelta', 'thelta'],
  'letter-epsilon': ['epsilon', 'epsilonn'],
  'letter-zeta': ['zita', 'zeeta'],
  'letter-eta': ['ita', 'eeta'],
  'letter-theta': ['thita', 'theeta'],
  'letter-iota': ['yota', 'giota'],
  'letter-kappa': ['kapa'],
  'letter-lambda': ['lamda', 'lamdha'],
  'letter-mu': ['mi', 'mee'],
  'letter-nu': ['ni', 'nee'],
  'letter-xi': ['ksi', 'ksee'],
  'letter-omicron': ['omikron'],
  'letter-pi': ['pee'],
  'letter-rho': ['ro', 'row'],
  'letter-sigma': ['sigma'],
  'letter-tau': ['taf', 'tav'],
  'letter-upsilon': ['ipsilon', 'ypsilon'],
  'letter-phi': ['fi', 'fee'],
  'letter-chi': ['khi', 'khee', 'hee'],
  'letter-psi': ['psi', 'psee'],
  'letter-omega': ['omega', 'omeya'],
};

/** What a recogniser writes for each symbol of the respelling said alone, besides the symbol itself. */
export const MODERN_HEARD_AS: Readonly<Record<string, readonly string[]>> = {
  a: ['ah', 'aa'],
  e: ['eh'],
  ee: ['eee', 'ea'],
  o: ['oh', 'aw'],
  v: ['vee', 'vuh'],
  gh: ['g', 'gha', 'ghuh'],
  y: ['ye', 'yeh', 'yuh'],
  dh: ['dhe', 'dhuh', 'dhee'],
  z: ['zee', 'zed', 'zuh'],
  th: ['thuh', 'thee'],
  k: ['kay', 'kuh', 'kah'],
  l: ['el', 'luh'],
  m: ['em', 'muh'],
  n: ['en', 'nuh'],
  ks: ['x', 'ex'],
  p: ['pee', 'puh'],
  r: ['ar', 'ruh'],
  s: ['es', 'ess', 'suh'],
  t: ['tee', 'tuh'],
  f: ['ef', 'eff', 'fuh'],
  kh: ['ch', 'kha', 'khuh'],
  hy: ['hyuh', 'hye'],
  ps: ['pss'],
};
