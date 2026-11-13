// mw-5r3p30.982: copywork's Hebrew rule marked a right בְּרֵאשִׁית (and, far more often, a right הַשָּׁמַיִם) wrong about one run in fifteen, the model
// calling the dagesh "missing" from the bet or the shin: mw-5r3p30.959 worked the shin's two dots, so the model read the shin dot for the dagesh and the
// dagesh for nothing. The Hebrew section now says where each mark of a pointed letter sits (the dagesh inside the body, the shin dot above, the vowel below)
// and worked the two words that flaked; mw-5r3p30.989 took the worked words out again (they primed a false fault) and added the letters-first count; the live proof
// is `mw grist eval lampas copywork --example hbo-perfect-genesis-1-1`, which holds words.4 (הַשָּׁמַיִם) right.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const text = instructionsOf('copywork');
const from = text.indexOf('### Hebrew (`hbo`)');
const hebrew = text.slice(from, text.indexOf('\n## ', from));

describe("copywork's Hebrew rule says where each mark of a letter sits", () => {
  it('puts the dagesh inside the body of the letter, apart from the shin dot above and the vowel below', () => {
    expect(hebrew).toMatch(/dagesh[^.]*inside the (body|letter)/i);
    expect(hebrew).toMatch(/shin dot[^.]*above/i);
  });

  // mw-5r3p30.989: naming the two words (בְּרֵאשִׁית, הַשָּׁמַיִם) and their marks made the model look for a fault there and invent one (the dagesh of
  // the shin 'missing', the yod 'missing' on a page that has them: 7 of 12 runs on the perfect page), so the rule is general: letters first, then marks.
  it('names no word of the examples: a worked word led the model to find a fault in it', () => {
    expect(hebrew).not.toMatch(/Take בְּרֵאשִׁית|Take הַשָּׁמַיִם/);
  });

  it('has him count the consonants first, a yod or a vav being small letters', () => {
    expect(hebrew).toMatch(/count the model word's consonants/);
    expect(hebrew).toMatch(/yod[^.]*vav[^.]*is a letter, though small/);
  });

  it('says a point sits under its letter, so a small letter above a seen point is looked for before it is called missing', () => {
    expect(hebrew).toMatch(/vowel point sits under its letter[^.]*small letter above it/);
  });

  it('calls a point missing only on bare paper, and a small point he cannot settle is not a fault', () => {
    expect(hebrew).toMatch(/Mark a point missing only when you looked at its place and\s+can see bare paper there/);
    expect(hebrew).toMatch(/small letter \(a yod or a vav\)[^.]*cannot settle either way is not a fault you can name: the word is `right`/);
    expect(hebrew).toMatch(/a small letter is missing only when its neighbours stand together/);
  });

  it('still marks a point wrong when the place was looked at and it is truly not there', () => {
    expect(hebrew).toMatch(/is not there[^.]*`wrong`/);
  });
});

// mw-qtu3zvz.72: in a Greek dictation with two sounds-alike misspellings (`grc-dictation-sounds-alike-john-1-5`) the right last word, κατέλαβεν, was
// marked wrong about one run in thirty (and a right ἡ about nine runs in ten, 'an added acute accent'): the Greek rule says an accent alone makes a word
// wrong, and nothing had him check the model word's own marks first. The live proof is that example, which holds words.12 right.
const greekFrom = text.indexOf('### Greek (`grc`)');
const greek = text.slice(greekFrom, text.indexOf('\n### ', greekFrom + 1));

describe("copywork's Greek rule judges each word by itself", () => {
  it('marks a word wrong only when a letter or mark that differs can be named from the page', () => {
    expect(greek).toMatch(/`wrong` only when you can name the letter or\s+mark on the page that differs/);
  });

  // the failing answers said 'you wrote κατέλαβεν with an acute accent; the verse has no accent on this word' of a model word that carries it (and the same of a
  // right ἡ): the model read the accents off its memory of the verse, so the rule has him read them off the model word first.
  it('has him read off the marks the model word carries before he calls one added or missing', () => {
    expect(greek).toMatch(/first read off the accents, breathings and iota subscripts the model word carries/);
    expect(greek).toMatch(/A mark he\s+wrote that the model word also carries is not an added mark/);
  });

  // the failing answers said 'the verse has no accent here' of σκοτία and κατέλαβεν, whose request words carry one: the model took the verse from its memory.
  it("says the request's word is the standard, not the verse as the model remembers it", () => {
    expect(greek).toMatch(/the request's word is the standard, not the verse as you remember it/);
  });

  it('names no Greek word of the examples in the rule', () => {
    expect(greek).not.toMatch(/κατέλαβεν|σκοτίᾳ|φαίνει/);
  });
});

// mw-qtu3zvz.95: the same example's right ἡ (a rough breathing and no accent on the page) was marked wrong, 'you wrote ή with an acute accent', in about nine runs
// in ten, and σκοτία and οὐ now and then: the model read a breathing's small curl as an accent. The rule says a breathing is not an accent, once and in one place
// (a rule stated again and again primes the model to find that fault on a right word: mw-qtu3zvz.72). The live proof is that example, which holds words.8, 9 and 11 right.
describe("copywork's Greek rule tells a breathing from an accent", () => {
  // the curl against the stroke is the shape the model misreads, so the rule counts marks and gives the opening vowel's single mark to the breathing
  it('says a breathing is not an accent, and counts the marks on the opening vowel', () => {
    expect(greek).toMatch(/Count the marks on a vowel before you name them/);
    expect(greek).toMatch(/a single mark over that opening vowel is its breathing, whatever its shape, and a breathing is not an accent/);
    expect(greek).toMatch(/same number of marks, any fault is one of kind/);
  });

  it('has him write the model word beside his, so a fault he cannot name from the two is no fault', () => {
    expect(greek).toMatch(/`you wrote X; the model has Y`, Y being the request's word copied character for character/);
    expect(greek).toMatch(/cannot settle either way is not a fault you can name: the word is `right`/);
  });

  it('says it once, in one place', () => {
    expect(greek.match(/is not an accent/g) ?? []).toHaveLength(1);
    expect(text.match(/is not an accent/g) ?? []).toHaveLength(1);
  });
});

// mw-5r3p30.1154: a perfect Hebrew dictation (`hbo-dictation-perfect-genesis-1-3`) now and then marked the right last word, אוֹר, wrong: 'you wrote אור; the holam dot
// above the ו is missing, the place is bare'. The model wrote the page's word down with no point on it (`אור`, the model's own spelling stripped) and called the point
// missing, the rule's 'say what is bare' asking for a fault; the Greek rule that has him write his word beside the model's (mw-qtu3zvz.72) had no Hebrew twin. The live
// proof is that example, which holds words.5 right.
describe("copywork's Hebrew rule has him write the page's word beside the model's", () => {
  it('has him write the word as he wrote it, with every point he saw, beside the request word copied character for character', () => {
    expect(hebrew).toMatch(/`you wrote X; the model has Y`/);
    expect(hebrew).toMatch(/X being the word as he wrote it with every point you saw/);
    expect(hebrew).toMatch(/Y being the request's word copied character for character/);
  });

  it('says a fault whose two spellings come out the same is no fault', () => {
    expect(hebrew).toMatch(/if X and Y come out the same, there is no fault and the word is `right`/);
  });

  it('no longer asks him to say what is bare, which led him to find a bare place', () => {
    expect(hebrew).not.toMatch(/say in `problem` what is bare/);
  });
});

// mw-qtu3zvz.125: in `grc-dictation-sounds-alike-john-1-5` a right σκοτία (word 9) and κατέλαβεν (word 12) were marked wrong about three runs in ten, 'you wrote an
// acute accent on the ί; the model has no accent', though the request's word carries it: the model judged before it had written down what it read. Wording alone did not
// move it (mw-qtu3zvz.95), so each word of the answer carries `written`, the word as the model read it off the page, ahead of `mark`: the mark is then a comparison of two
// strings in front of it. The live proof is that example, 10 runs.
describe("copywork's answer writes down the word as read before it marks it", () => {
  const schema = JSON.parse(readFileSync(resolve(__dirname, '../../grinds/copywork.answer.schema.json'), 'utf8')) as {
    properties: { words: { items: { required: string[]; properties: Record<string, { type: string; description: string }> } } };
  };
  const item = schema.properties.words.items;

  it('asks a required `written` string on each word', () => {
    expect(item.properties.written.type).toBe('string');
    expect(item.required).toContain('written');
  });

  it('puts `written` before `mark`, in the required list and in the properties, so the model fills it first', () => {
    expect(item.required.indexOf('written')).toBeLessThan(item.required.indexOf('mark'));
    const keys = Object.keys(item.properties);
    expect(keys.indexOf('written')).toBeLessThan(keys.indexOf('mark'));
  });

  it('says in the schema that it is the word as he wrote it, letter by letter', () => {
    expect(item.properties.written.description).toMatch(/as he wrote it/);
  });

  it('tells the instructions to fill `written` first, before `mark`', () => {
    expect(text).toMatch(/`written`[^.]*(before|first)[^.]*`mark`|before[^.]*`mark`[^.]*`written`/);
    expect(text).toMatch(/Fill `written` first/);
  });

  it('says it once, in the general rule', () => {
    expect(text.match(/Fill `written` first/g) ?? []).toHaveLength(1);
  });
});
