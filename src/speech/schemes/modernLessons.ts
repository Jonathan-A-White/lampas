// src/speech/schemes/modernLessons.ts — what Modern Greek teaches of each sound-bearing idea of the grammar ladder (mw-5r3p30.229): the sound of
// each letter, vowel pair and consonant pair, the breathings, which Modern Greek does not say, and the accents and the marks that change a word
// (mw-5r3p30.312: the stress is said louder, and a mark is not heard, each one sentence after the ladder's own text). The sounds are the ones modern.ts respells by
// (docs/pronunciation.md lists the rules; tests/unit/sound-lessons.test.ts holds each to respellModern), each said through `say`, which gives the
// symbol the respelling writes and the reader's English accent's hint for it (mw-5r3p30.352: no English word is written here).
import type { SoundWords } from '../accents';
import type { SoundLesson } from '../pronunciation';

export function modernLessons(say: SoundWords): Readonly<Record<string, SoundLesson>> {
  /** In a lesson's prose: 'e as in pet'. */
  const asIn = say.asIn;
  /** As an idea's sound: 'e, as in “pet”'. */
  const keyed = say.keyed;
  /** As one choice of a quiz (mw-5r3p30.355): 'e, as in “pet”', nothing else; the rule that goes with a sound stays in its `sound` and its lesson. */
  const choice = say.choice;
  const one = (symbol: string): SoundLesson => ({ sound: keyed(symbol), choice: choice(symbol), sounds: [symbol] });

  const letters: [string, SoundLesson][] = [
    ['alpha', one('a')],
    ['beta', one('v')],
    ['gamma', { sound: `${keyed('gh')}; before e and i it is ${keyed('y')}`, choice: choice('gh'), sounds: ['gh', 'y'] }],
    ['delta', one('dh')],
    ['epsilon', one('e')],
    ['zeta', one('z')],
    ['eta', one('ee')],
    ['theta', one('th')],
    ['iota', one('ee')],
    ['kappa', one('k')],
    ['lambda', one('l')],
    ['mu', one('m')],
    ['nu', one('n')],
    ['xi', one('ks')],
    ['omicron', one('o')],
    ['pi', one('p')],
    ['rho', one('r')],
    ['sigma', one('s')],
    ['tau', one('t')],
    ['upsilon', { sound: keyed('ee'), choice: choice('ee'), sounds: ['ee'], also: 'In αυ, ευ and ηυ it is v or f (av or af, ev or ef, eev or eef).' }],
    ['phi', one('f')],
    ['chi', { sound: `${keyed('kh')}, before a, o, ou and a consonant; before e and i it is softer, ${asIn('hy')}`, choice: choice('kh'), sounds: ['kh', 'hy'] }],
    ['psi', one('ps')],
    ['omega', { sound: `${keyed('o')}, the same as omicron`, choice: choice('o'), sounds: ['o'] }],
  ];
  const vowelPairs: [string, SoundLesson][] = [
    ['ai', one('e')],
    ['ei', one('ee')],
    ['oi', one('ee')],
    ['ui', one('ee')],
    ['ou', one('oo')],
    ['au', { sound: `${asIn('a')} plus ${asIn('v')} or ${asIn('f')}`, choice: 'av or af' }],
    ['eu', { sound: `${asIn('e')} plus ${asIn('v')} or ${asIn('f')}`, choice: 'ev or ef' }],
    ['eeu', { sound: `${asIn('ee')} plus ${asIn('v')} or ${asIn('f')}`, choice: 'eev or eef' }],
  ];
  const consonantPairs: [string, SoundLesson][] = [
    ['mp', { sound: `${asIn('b')} at the start of a word, ${asIn('mb')} inside it`, choice: choice('b') }],
    ['nt', { sound: `${asIn('d')} at the start of a word, ${asIn('nd')} inside it`, choice: choice('d') }],
    ['gk', { sound: `${asIn('g')} at the start of a word, ${asIn('ng')} inside it`, choice: choice('g') }],
    ['gg', { sound: asIn('ng'), choice: choice('ng') }],
    ['gch', { sound: `${asIn('ng')} plus ${asIn('kh')}, or ${asIn('hy')} before e and i`, choice: 'ngkh' }],
    ['gks', { sound: asIn('nks'), choice: choice('nks') }],
  ];

  const lessons: Record<string, SoundLesson> = {};
  for (const [name, lesson] of letters) lessons[`letter-${name}`] = lesson;
  for (const [name, lesson] of vowelPairs) lessons[`diphthong-${name}`] = lesson;
  for (const [name, lesson] of consonantPairs) lessons[`pair-${name}`] = lesson;

  lessons.diphthongs = {
    text: `Some vowels pair up and make one sound, said the Modern Greek way: αι is the ${asIn('e')} (like ε), ει, οι and υι are the ${asIn('ee')}, and ου is the ${asIn('oo')}. In αυ, ευ and ηυ the υ is a ${asIn('v')} before a vowel or β, γ, δ, ζ, λ, μ, ν or ρ, and an ${asIn('f')} before any other letter or at the end of the word: Παῦλος is “PAV-los” and εὐαγγέλιον is “ev-an-GHE-lee-on”, but αὐτός is “af-TOS” and εὐθύς is “ef-THEES”. Marks you meet soon will show when two vowels are not a pair.`,
  };
  lessons['consonant-pairs'] = {
    text: `Some consonants team up, said the Modern Greek way. In the middle of a word μπ is ${asIn('mb')}, ντ is ${asIn('nd')} and γκ is ${asIn('ng')}; at the start they are ${asIn('b')}, ${asIn('d')} and ${asIn('g')}. γγ is ${asIn('ng')}, γχ is ng plus ${asIn('kh')} (${asIn('hy')} before e and i), and γξ is ${asIn('nks')}. The letter σ is ${asIn('s')} but, before β, γ, δ, ζ, λ, μ, ν or ρ, it is ${asIn('z')}: κόσμος is “KOZ-mos” and Ἰσραήλ is “eez-ra-EEL”. A doubled consonant is said once.`,
  };
  lessons.breathings = {
    text: 'A word that begins with a vowel carries a small mark over it. Modern Greek does not say either breathing: the rough breathing (ʽ) and the smooth breathing (᾿) are both silent, so ὁ is “o” and ἐν is “en”. You still need to know them, because they are part of the spelling and can make one word differ from another. Words that begin with ρ always take a rough breathing, and so does υ. It sits on the second vowel of a pair: οὗτος and αὐτός are said “OO-tos” and “af-TOS”, the breathing silent. Before a capital it stands in front of the letter, not over it: Ἰησοῦς is “ee-ee-SOOS”.',
  };
  lessons['breathing-rough'] = {
    text: 'The rough breathing (ʽ) sits over a vowel at the start of a word. In Modern Greek it is silent, so it adds no sound: ὁ is “o”, said just as ο is. You must still know it when you see it, because it is part of the spelling and can make one word differ from another.',
    sound: 'nothing, because Modern Greek does not say it',
  };
  lessons['breathing-smooth'] = {
    text: `The smooth breathing (᾿) sits over a vowel at the start of a word and adds nothing: ἐν is “en”, which starts with ${asIn('e')}. It is silent, like the rough breathing in Modern Greek, and it is the commoner of the two.`,
    sound: 'nothing',
  };
  lessons['words-sound-alike'] = {
    text: `Some different words are spelt alike but for one letter, and Modern Greek says each pair the same: ἡμεῖς “we” and ὑμεῖς “you” are both “ee-MEES” (η and υ are both ${asIn('ee')}); λύομεν “we loose” and λύωμεν “let us loose” are both “LEE-o-men” (ο and ω are both ${asIn('o')}); λύει “he looses” and λύῃ “he may loose” are both “LEE-ee” (ει and ῃ are both ${asIn('ee')}). Your ear cannot tell them apart, so trust the spelling: only the spelling does. The New Testament has the same endings, as in ἔχομεν “we have” and ἔχωμεν “let us have” (1 John 4:17).`,
  };
  // the ladder's text of these two holds the spelling and the glosses; the lesson adds how Modern Greek says them (mw-5r3p30.312)
  lessons.accents = { also: 'The stressed syllable is said louder in Modern Greek, and the three marks sound alike.' };
  lessons['marks-change-word'] = { also: 'Modern Greek says each pair the same, so only the mark tells them apart.' };
  return lessons;
}
