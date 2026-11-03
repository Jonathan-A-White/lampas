// src/data/meanings.ts — the meanings in a gloss and the English they are measured against (mw-5r3p30.1000). A drill's answer is a short list of meanings,
// 'woman, wife'; the data build (scripts/data/drillAnswers.ts) counts which of a word's possible meanings the MSB's English really uses, and the Quick test
// (quiz.ts) keeps a wrong choice from carrying a meaning the right answer has. Both read English the same way, so both are here.

/** The English verbs whose forms do not follow the endings englishStem strips: form -> the word the gloss would name. */
const IRREGULAR: Readonly<Record<string, string>> = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', does: 'do', did: 'do', done: 'do',
  said: 'say', says: 'say', came: 'come', went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see',
  gave: 'give', given: 'give', took: 'take', taken: 'take', made: 'make', knew: 'know', known: 'know',
  found: 'find', told: 'tell', spoke: 'speak', spoken: 'speak', wrote: 'write', written: 'write',
  ate: 'eat', eaten: 'eat', heard: 'hear', brought: 'bring', stood: 'stand', sat: 'sit', rose: 'rise', risen: 'rise',
  fell: 'fall', fallen: 'fall', left: 'leave', sent: 'send', got: 'get', held: 'hold', kept: 'keep', began: 'begin', begun: 'begin',
  led: 'lead', ran: 'run', sold: 'sell', thought: 'think', taught: 'teach', bought: 'buy', sought: 'seek',
  bore: 'bear', born: 'bear', borne: 'bear', drank: 'drink', drunk: 'drink', chose: 'choose', chosen: 'choose', forgave: 'forgive', forgiven: 'forgive',
  built: 'build', laid: 'lay', paid: 'pay', meant: 'mean', rode: 'ride', woke: 'wake', slept: 'sleep', felt: 'feel', stole: 'steal',
  fled: 'flee', hid: 'hide', hidden: 'hide', lost: 'lose', won: 'win', wept: 'weep', shone: 'shine', struck: 'strike', sworn: 'swear', swore: 'swear',
  men: 'man', women: 'woman', children: 'child', brethren: 'brother', feet: 'foot', these: 'this', those: 'that', wives: 'wife', lives: 'life', knives: 'knife',
};

/** A crude English stem: the same for 'love', 'loves', 'loved', 'loving'; the same on both sides of a comparison, which is all it is for. */
export function englishStem(word: string): string {
  let w = word.toLowerCase().replace(/[’']s$/, '').replace(/[^a-z]/g, '');
  if (w in IRREGULAR) w = IRREGULAR[w];
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith('ied')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('es') && /(s|x|z|ch|sh|o)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  if (w.length > 3 && /([^aeiou])\1$/.test(w) && !w.endsWith('ll') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

const FILLER = new Set(['to', 'a', 'an', 'the']);

/** The words of a meaning or of a chunk of English, as stems; the 'to' of a verb and the articles are not words of the meaning. */
export function stemsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}’']+/u)
    .filter((t) => t !== '' && !FILLER.has(t))
    .map(englishStem)
    .filter((s) => s !== '');
}

/** The meanings of a gloss: the comma, semicolon and slash separated parts, less any bracketed note: 'to say, speak (aorist εἶπον)' is 'to say' and 'speak'. */
export function meaningsOf(gloss: string): string[] {
  return gloss
    .replace(/\([^)]*\)/g, '')
    .split(/[,;/]/)
    .map((m) => m.replace(/\s+/g, ' ').trim())
    .filter((m) => m !== '');
}

/** What makes two meanings the same one: their stems, so 'wives' and 'wife', 'to love' and 'loving' are. */
export function shareMeaning(meaning: string): string {
  return stemsOf(meaning).join(' ');
}
