// A standard in the middle (mw-5r3p30.352, his words: "there should be a standard ... the module explains how to get to The Standard and then the app
// [uses] the module"): every sound has one standard id (IPA, src/speech/sounds.ts); a Greek pronunciation maps the sounds its respelling writes to those
// ids (Pronunciation.sounds), and an English accent (src/speech/accents/) maps each id to the hint an English reader of that accent hears it in. American
// is the default; his report was that 'o, as in “lot”' says 'ah' to an American ear, so American keys the o to “or”, said short, and British keeps “lot”.
import { afterEach, describe, expect, it } from 'vitest';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { bearsSound, ideaSound, ideaText, soundLesson } from '../../src/data/grammar/lessons';
import { ACCENTS, DEFAULT_ACCENT, accentOf, chooseAccent, chosenAccent, missingHints, soundWords, type EnglishAccent } from '../../src/speech/accents';
import { PRONUNCIATIONS, pronunciationOf, soundRulesOf, tutorGuideOf } from '../../src/speech/pronunciation';
import { SOUND_IDS, type SoundId } from '../../src/speech/sounds';

const modern = pronunciationOf('modern');
const american = accentOf('american');
const british = accentOf('british');

afterEach(() => chooseAccent(DEFAULT_ACCENT));

/** Every line a learner reads of the sounds in `accent`: each sound-bearing idea's text, sound and How it sounds, the sound rules' lines, and the tutor's guide. */
const everyLine = (accent: EnglishAccent): string[] => [
  ...LADDER.filter(bearsSound).flatMap((idea) => [ideaText(idea, modern, accent), ideaSound(idea, modern, accent) ?? '', soundLesson(idea, modern, accent) ?? '']),
  ...soundRulesOf(modern, accent).flatMap((rule) => rule.sides.flatMap((side) => [side.label, side.line])),
  tutorGuideOf(modern, accent),
];

describe('one standard sound inventory', () => {
  it('keys every sound by its IPA id, written between slashes', () => {
    expect(SOUND_IDS.length).toBeGreaterThan(25);
    for (const id of SOUND_IDS) expect(id).toMatch(/^\/[^/\s]+\/$/);
    for (const id of ['/o/', '/x/', '/ɣ/', '/ʝ/', '/ð/', '/ç/']) expect(SOUND_IDS).toContain(id);
  });

  it('is what every Greek pronunciation maps its sounds to', () => {
    for (const scheme of PRONUNCIATIONS) {
      expect(Object.keys(scheme.sounds).length, scheme.id).toBeGreaterThan(0);
      for (const [symbol, id] of Object.entries(scheme.sounds)) expect(SOUND_IDS, `${scheme.id}: ${symbol}`).toContain(id);
    }
    expect(modern.sounds.o).toBe('/o/');
    expect(modern.sounds.kh).toBe('/x/');
    expect(modern.sounds.gh).toBe('/ɣ/');
  });
});

describe('one hint table per English accent', () => {
  it('has American and British, and American is the default', () => {
    expect(ACCENTS.map((a) => a.id)).toEqual(['american', 'british']);
    expect(DEFAULT_ACCENT).toBe('american');
    expect(chosenAccent().id).toBe('american');
    expect(accentOf('klingon').id).toBe('american');
  });

  it('gives every standard sound a hint in both tables, and nothing else', () => {
    for (const accent of ACCENTS) {
      expect(Object.keys(accent.hints).sort(), accent.id).toEqual([...SOUND_IDS].sort());
      for (const id of SOUND_IDS) {
        const hint = accent.hints[id];
        expect(Boolean(hint.word || hint.note), `${accent.id}: ${id}`).toBe(true);
      }
    }
  });

  it('has a hint for every sound each Greek pronunciation uses, in every accent', () => {
    for (const scheme of PRONUNCIATIONS) for (const accent of ACCENTS) expect(missingHints(scheme, accent), `${scheme.id} in ${accent.id}`).toEqual([]);
  });

  it('names a sound an accent table misses', () => {
    const hints = { ...american.hints } as Partial<Record<SoundId, EnglishAccent['hints'][SoundId]>>;
    delete hints['/o/'];
    const thin = { ...american, id: 'thin', hints } as EnglishAccent;
    expect(missingHints(modern, thin)).toEqual(['/o/']);
    expect(() => soundWords(modern, thin).keyed('o')).toThrow(/\/o\//);
  });

  it('says a sound with its hint, keyed and in prose, never with its id', () => {
    const say = soundWords(modern, american);
    expect(say.keyed('o')).toBe('o, as in “or”, short');
    expect(say.asIn('o')).toBe('o as in or, short');
    expect(say.keyed('e')).toBe('e, as in “pet”');
    expect(say.asIn('e')).toBe('e as in pet');
    expect(say.keyed('dh')).toBe('dh, the th of “this”');
    expect(soundWords(modern, british).keyed('o')).toBe('o, as in “lot”');
  });
});

describe('omicron and omega fit an American ear', () => {
  it('say o, as in “or”, short, in American English, omega the same as omicron', () => {
    expect(ideaSound(ideaOf('letter-omicron'), modern, american)).toBe('o, as in “or”, short');
    expect(ideaSound(ideaOf('letter-omega'), modern, american)).toBe('o, as in “or”, short, the same as omicron');
    expect(soundLesson(ideaOf('letter-omicron'), modern, american)).toBe('In Modern Greek it sounds like o, as in “or”, short.');
    expect(ideaText(ideaOf('letter-omega'), modern, american)).toContain('In Modern Greek it sounds like o, as in “or”, short, the same as omicron.');
  });

  it('use no American key word an American hears as ah: lot, hot, got or pot', () => {
    const words = Object.values(american.hints).map((h) => `${h.word ?? ''} ${h.note ?? ''}`);
    for (const word of words) expect(word).not.toMatch(/\b(lot|hot|got|pot)\b/);
    for (const line of everyLine(american)) expect(line).not.toMatch(/\b(lot|hot|got|pot)\b/);
  });

  it('say o, as in “lot”, in British English', () => {
    expect(ideaSound(ideaOf('letter-omicron'), modern, british)).toBe('o, as in “lot”');
    expect(ideaSound(ideaOf('letter-omega'), modern, british)).toBe('o, as in “lot”, the same as omicron');
  });

  it('follow the chosen accent when none is named', () => {
    expect(ideaSound(ideaOf('letter-omicron'), modern)).toBe('o, as in “or”, short');
    chooseAccent('british');
    expect(ideaSound(ideaOf('letter-omicron'), modern)).toBe('o, as in “lot”');
    expect(tutorGuideOf(modern)).toContain('o as in lot');
    chooseAccent('american');
    expect(ideaSound(ideaOf('letter-omicron'), modern)).toBe('o, as in “or”, short');
    expect(tutorGuideOf(modern)).toContain('o as in or, short');
  });

  it('give the r an American can say: a tap, the tt of “butter”; British keeps it lightly rolled', () => {
    expect(ideaSound(ideaOf('letter-rho'), modern, american)).toBe('r, a quick tap of the tongue, like the tt of “butter”');
    expect(ideaSound(ideaOf('letter-rho'), modern, british)).toBe('r, lightly rolled');
  });
});
