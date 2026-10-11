// mw-5r3p30.193: the tutor's cleaned question sometimes keeps a lone um, uh or er. The app strips them whatever the model returns,
// and touches no other word.
import { describe, expect, it } from 'vitest';
import { withoutFillers } from '../../src/services/fillers';

describe('withoutFillers', () => {
  it('takes lone um, uh and er out with the commas around them and capitalises the new first letter', () => {
    expect(withoutFillers('Um, why are there, uh, italic words? What does it mean?')).toBe('Why are there italic words? What does it mean?');
  });

  it.each([
    ['er at the end', 'Why are there italic words, er?', 'Why are there italic words?'],
    ['a filler after a full stop', 'It is odd. Um, what is it?', 'It is odd. What is it?'],
    ['a filler with no commas', 'Why are there uh italic words?', 'Why are there italic words?'],
    ['capitals in the filler', 'UH, what does Er mean here?', 'What does mean here?'],
    ['the commas of a real list', 'Um, who, what, and why?', 'Who, what, and why?'],
  ])('handles %s', (_, input, expected) => {
    expect(withoutFillers(input)).toBe(expected);
  });

  it('leaves a question with no fillers unchanged', () => {
    for (const q of ['Why are there italic words? What does it mean?', 'what does συνεργεῖ mean, here?', 'Who is doing the working?']) {
      expect(withoutFillers(q)).toBe(q);
    }
  });

  it('does not touch umbrella, Uh-oh, number, user, her or other words that only contain or begin with a filler', () => {
    for (const q of ['Is the umbrella in this verse?', 'Does Uh-oh mean anything here?', 'What is the number of her users?', "Is er's own word here? Um-hm?"]) {
      expect(withoutFillers(q)).toBe(q);
    }
  });

  it('gives back what it was given when only fillers are left', () => {
    expect(withoutFillers('Um, uh')).toBe('Um, uh');
  });
});
