// mw-5r3p30.772: greek-offer-word-meaning ("What does 'love' really mean in this verse?" at Curious) missed again after mw-5r3p30.715, .727 and .741, each
// time another way: a 'view' offer, a `words` entry, and on 2026-10-26 no greek_offer at all. Whether to offer was one permissive bullet ("at any step below 5,
// on real interest") among a growing list of nevers, after a paragraph saying this very question is "not a Greek word he asked about", while the step-0 bullet said
// "no offer unless he asks about the Greek". Each fix added a never, and the one line that says "offer" got weaker. The offer is now one numbered list in
// "Offering the Greek", the first line that fits decides, with a worked answer for the English-word case; each greek-offer example is met by one line of it.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf, instructionParts } from '../../scripts/grind-parts';

const text = instructionsOf('bible-talk');
const from = text.indexOf('## Offering the Greek\n');
const offering = text.slice(from, text.indexOf('\n## ', from + 1));
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema & { properties: { greek_offer: { description: string } } };

/** The numbered lines of the offer's list, in order. */
const list = (): string[] => {
  const lines = offering.split('\n');
  const start = lines.findIndex((l) => /^1\. /.test(l));
  const out: string[] = [];
  for (let i = start, n = 1; i >= 0 && i < lines.length && lines[i].startsWith(`${n}. `); i++, n++) out.push(lines[i]);
  return out;
};

type Request = {
  question: string;
  reader_view?: string;
  greek_interest?: { level: number; next?: { level: number } };
  memory?: { index: string };
  pending_offer?: { kind: string };
  history?: { q: string; a: string }[];
};
type Example = { request: Request; expect: Record<string, { present?: boolean; equals?: unknown }> };

// The list as the test reads it: each line, the words it must hold, when it fits a request, and whether it makes an offer.
const LINES: { holds: RegExp; fits: (r: Request) => boolean; offer: boolean }[] = [
  { holds: /`pending_offer` is `greek`[^.]*no `greek_offer`/, fits: (r) => r.pending_offer?.kind === 'greek', offer: false },
  { holds: /No `greek_interest`[^.]*no `next`[^.]*no `greek_offer`/, fits: (r) => !r.greek_interest?.next, offer: false },
  { holds: /`reader_view` is `greek`[^.]*no `greek_offer`/, fits: (r) => r.reader_view === 'greek', offer: false },
  { holds: /'said no to the Greek offer'[^.]*no `greek_offer`/, fits: (r) => (r.memory?.index ?? '').includes('said no to the Greek offer'), offer: false },
  { holds: /`history` already ended with an offer/, fits: () => false, offer: false },
  { holds: /Step 0[^.]*no `greek_offer` unless he asks about the Greek/, fits: (r) => r.greek_interest?.level === 0, offer: true },
  { holds: /Steps 1 to 4: ONE `greek_offer`[^.]*real interest[^]*"what does 'love' really mean\?" is one/, fits: (r) => /really mean/.test(r.question), offer: true },
  { holds: /Anything else[^.]*no offer/, fits: () => true, offer: false },
];

const EXAMPLES = readdirSync('grinds/examples/bible-talk').filter((f) => /^greek-(offer|dial)-.*\.json$/.test(f));

describe('the Greek offer is one rule in one place (mw-5r3p30.772)', () => {
  it('"Offering the Greek" decides the offer by one numbered list, the first line that fits', () => {
    expect(offering).toMatch(/Whether an answer carries one is this list alone: go down it, and the first line that fits decides/);
    const lines = list();
    expect(lines).toHaveLength(LINES.length);
    LINES.forEach((l, i) => expect(lines[i], `line ${i + 1}`).toMatch(l.holds));
  });

  it('meets every greek-offer example by the line that first fits it', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(7);
    for (const file of EXAMPLES) {
      const e = JSON.parse(readFileSync(`grinds/examples/bible-talk/${file}`, 'utf8')) as Example;
      const line = LINES.find((l) => l.fits(e.request))!;
      const offered = e.expect['greek_offer.kind']?.equals !== undefined || e.expect['greek_offer.lemma']?.present === true;
      expect(e.expect.greek_offer?.present === false || offered, `${file} says whether it wants an offer`).toBe(true);
      expect(offered, `${file}: line ${LINES.indexOf(line) + 1}`).toBe(line.offer);
    }
  });

  it('shows the English-word case answered right: English, no `words`, and the one `word` offer the answer ends with', () => {
    const block = /<!-- greek-offer-example:start -->\s*```json\s*([\s\S]*?)```\s*<!-- greek-offer-example:end -->/.exec(offering);
    expect(block).not.toBeNull();
    const example = JSON.parse(block?.[1] ?? '') as { answer: string; words: unknown[]; greek_offer?: { kind: string; lemma?: string; text: string } };
    expect(validate(example, answerSchema)).toEqual([]);
    expect(isTalkAnswer(example)).toBe(true);
    expect(example.words).toEqual([]);
    expect(example.greek_offer?.kind).toBe('word');
    expect(example.greek_offer?.lemma).toBeTruthy();
    expect(example.answer.endsWith(example.greek_offer!.text)).toBe(true);
    expect(example.answer).not.toMatch(/[Ͱ-Ͽἀ-῿]/);
  });

  it('says when to offer nowhere else: the schema defers to the list, and no other part names the trigger', () => {
    expect(answerSchema.properties.greek_offer.description).toMatch(/numbered list in the instructions, 'Offering the Greek'/);
    for (const part of instructionParts('bible-talk')) {
      if (part.text.includes('## Offering the Greek\n')) continue;
      expect(part.text, part.file).not.toMatch(/real interest/);
      expect(part.text, part.file).not.toMatch(/never by moving ahead of him/);
    }
  });
});
