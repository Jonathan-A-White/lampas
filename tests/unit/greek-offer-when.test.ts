// mw-5r3p30.715: since the Greek dial the smoke missed now and then on three examples. greek-offer-learner (a reader at Reading in Greek, the Reader in Greek) got a 'view' offer
// to All in where none is wanted; greek-offer-word-meaning ('what does love really mean?') got a 'view' offer where a 'word' offer with its lemma is wanted;
// greek-offer-asks-for-greek (his no is in the index and he asks for the Greek himself) got a 'word' offer where none is wanted. The rule said "at any step below 5 ... a word offer
// or a view offer" and nothing about WHEN each is made or when neither is. These pin the words that say it, in the instructions the model reads and in the answer schema.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const text = instructionsOf('bible-talk');
const from = text.indexOf('## Offering the Greek\n');
const to = text.indexOf('\n## ', from + 1);
const offering = text.slice(from, to < 0 ? undefined : to).replace(/\s+/g, ' ');
const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as { properties: { greek_offer: { description: string } } };

describe('when the tutor makes a Greek offer, and of which kind', () => {
  it('makes none for a reader whose Reader already shows the Greek', () => {
    expect(offering).toMatch(/`reader_view` is `greek`[^.]*(already reading the original|Reading in Greek)[^.]*no `greek_offer`/);
  });

  it('makes a word offer, never a view, when the question is about what one word means', () => {
    expect(offering).toMatch(/what one word means[^.]*(always|is a)[^.]*`word`/);
    expect(offering).toMatch(/`view`[^.]*only when no single word/);
  });

  it('makes none in the answer in which he asks for the Greek after his no', () => {
    expect(offering).toMatch(/that very answer carries no `greek_offer`/i);
  });

  it('tells the model the same in the answer schema', () => {
    const d = schema.properties.greek_offer.description;
    expect(d).toMatch(/never when `reader_view` is `greek`/i);
    expect(d).toMatch(/what one word means is always `word`/);
    expect(d).toMatch(/never in the answer that sets `greek_asked`/i);
  });
});
