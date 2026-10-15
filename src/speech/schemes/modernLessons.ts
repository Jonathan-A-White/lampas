// src/speech/schemes/modernLessons.ts — what Modern Greek teaches of each sound-bearing idea of the grammar ladder (mw-5r3p30.229): the sound of
// each letter, vowel pair and consonant pair, and the breathings, which Modern Greek does not say. The sounds are the ones modern.ts respells by
// (docs/pronunciation.md lists the rules; tests/unit/sound-lessons.test.ts holds each to respellModern), each said through `say`, which gives the
// symbol the respelling writes and the reader's English accent's hint for it (mw-5r3p30.352: no English word is written here).
import type { SoundWords } from '../accents';
import type { SoundLesson } from '../pronunciation';

export function modernLessons(say: SoundWords): Readonly<Record<string, SoundLesson>> {
  /** In a lesson's prose: 'e as in pet'. */
  const asIn = say.asIn;
  /** As an idea's sound: 'e, as in “pet”'. */
  const keyed = say.keyed;

  const letters: [string, string][] = [
    ['alpha', keyed('a')],
    ['beta', keyed('v')],
    ['gamma', `${keyed('gh')}; before e and i it is ${keyed('y')}`],
    ['delta', keyed('dh')],
    ['epsilon', keyed('e')],
    ['zeta', keyed('z')],
    ['eta', keyed('ee')],
    ['theta', keyed('th')],
    ['iota', keyed('ee')],
    ['kappa', keyed('k')],
    ['lambda', keyed('l')],
    ['mu', keyed('m')],
    ['nu', keyed('n')],
    ['xi', keyed('ks')],
    ['omicron', keyed('o')],
    ['pi', keyed('p')],
    ['rho', keyed('r')],
    ['sigma', keyed('s')],
    ['tau', keyed('t')],
    ['upsilon', keyed('ee')],
    ['phi', keyed('f')],
    ['chi', `${keyed('kh')}, before a, o, ou and a consonant; before e and i it is softer, ${asIn('hy')}`],
    ['psi', keyed('ps')],
    ['omega', `${keyed('o')}, the same as omicron`],
  ];
  const vowelPairs: [string, string][] = [
    ['ai', keyed('e')],
    ['ei', keyed('ee')],
    ['oi', keyed('ee')],
    ['ui', keyed('ee')],
    ['ou', keyed('oo')],
    ['au', `${asIn('a')} plus ${asIn('v')} or ${asIn('f')}`],
    ['eu', `${asIn('e')} plus ${asIn('v')} or ${asIn('f')}`],
    ['eeu', `${asIn('ee')} plus ${asIn('v')} or ${asIn('f')}`],
  ];
  const consonantPairs: [string, string][] = [
    ['mp', `${asIn('b')} at the start of a word, ${asIn('mb')} inside it`],
    ['nt', `${asIn('d')} at the start of a word, ${asIn('nd')} inside it`],
    ['gk', `${asIn('g')} at the start of a word, ${asIn('ng')} inside it`],
    ['gg', asIn('ng')],
    ['gch', `${asIn('ng')} plus ${asIn('kh')}, or ${asIn('hy')} before e and i`],
    ['gks', asIn('nks')],
  ];

  const lessons: Record<string, SoundLesson> = {};
  for (const [name, sound] of letters) lessons[`letter-${name}`] = { sound };
  for (const [name, sound] of vowelPairs) lessons[`diphthong-${name}`] = { sound };
  for (const [name, sound] of consonantPairs) lessons[`pair-${name}`] = { sound };

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
  return lessons;
}
