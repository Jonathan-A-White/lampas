// mw-5r3p30.826: four bible-talk smoke examples answered right only now and then.
// hebrew-offer-on-genesis: line 6 and the `word` paragraph said a word he asked about is always `word`, so Genesis got `kind` `word` for 'created' (2 in 3);
//   the Hebrew rule is that the offer is always `view`, and nothing showed one.
// greek-offer-learner: the contract and line 7 said `words` is empty for an English word he names, against the step 2 up rule that he is learning Greek.
// quiz-goal-kept: the quiz-goal offer's own example goal was the kept goal of the smoke example, so the model copied it into `quiz_goal_offer`.
// do-setting: 'Turn off the Greek hints' fits no setting by name; the model offered one (`setting_offer`) instead of making it by `do`.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';

const text = instructionsOf('bible-talk');
const flat = (s: string): string => s.replace(/\s+/g, ' ');
const part = (title: string): string => {
  const from = text.indexOf(`## ${title}\n`);
  expect(from).toBeGreaterThan(-1);
  const to = text.indexOf('\n## ', from + 1);
  return flat(text.slice(from, to < 0 ? undefined : to));
};
const offering = part('Offering the Greek');

describe('a Hebrew offer is a view offer, whatever word he asked about (hebrew-offer-on-genesis)', () => {
  const line6 = offering.slice(offering.indexOf('6. Step 0'), offering.indexOf('7. Steps 1 to 4'));

  it('line 6 makes the Hebrew offer `view` with no `lemma`, the Greek one `word`', () => {
    expect(line6).toMatch(/Hebrew: `kind` `view` with no `lemma`, even for one word/);
    expect(line6).toMatch(/Greek: `kind` `word` with the `lemma`/);
  });

  it('the `word` paragraph is for a New Testament chapter, and `view` is the only kind on an Old Testament one', () => {
    expect(offering).toMatch(/On a New Testament chapter a question about what one word means[^.]*is always `word`/);
    expect(offering).toMatch(/on an Old Testament chapter \(`lang` `he`\) it is the only kind, whatever he asked/);
  });

  it('shows a Hebrew `view` offer with no `lemma` as a worked example', () => {
    const at = text.indexOf('Hebrew, in Genesis at Just English');
    expect(at).toBeGreaterThan(-1);
    const block = text.slice(text.indexOf('```json', at) + 7, text.indexOf('```', text.indexOf('```json', at) + 7));
    const answer = JSON.parse(block) as { greek_offer: { kind: string; lang: string; lemma?: string }; words: unknown[] };
    expect(answer.greek_offer).toMatchObject({ kind: 'view', lang: 'he' });
    expect(answer.greek_offer.lemma).toBeUndefined();
    expect(answer.words).toEqual([]);
  });
});

describe('from step 2 up the Greek word behind an English word he asks about goes in `words` (greek-offer-learner)', () => {
  it('the contract limits the empty `words` to Just English and Curious', () => {
    const contract = part('The contract');
    expect(contract).toMatch(/English word he names[^;]*at Just English or Curious, or on a screen with no Greek text, `words` is `\[\]`/);
    expect(contract).toMatch(/from step 2 up he is learning Greek/);
  });

  it('line 7 says the same, and line 3 names the Greek word for a reader of the original', () => {
    expect(offering).toMatch(/at Curious an English answer, `words` empty, and the offer; from step 2 up the answer names the Greek word and puts it in `words`/);
    expect(offering).toMatch(/3\. `reader_view` is `greek` or `hebrew`[^]*?An English word he asks about is answered by naming the Greek word behind it, in `words`/);
  });
});

describe('the quiz-goal offer example is not the goal the smoke example keeps (quiz-goal-kept)', () => {
  it('the example goal in the offer bullet differs from the kept goal of the example', () => {
    const kept = (JSON.parse(readFileSync('grinds/examples/bible-talk/quiz-goal-kept.json', 'utf8')) as { request: { quiz_goal: string } }).request.quiz_goal;
    const quiz = part('Quiz mode');
    expect(quiz).toMatch(/in `quiz_goal_offer`, in a few plain words of his own \(at most 80 characters, "[^"]+"\)/);
    expect(quiz).not.toContain(`"${kept}"`);
  });
});

describe('a setting he asked for loosely is made by `do`, never offered (do-setting)', () => {
  it('"Changing the app\'s settings" says so with the Greek hints as the case', () => {
    expect(part("Changing the app's settings")).toMatch(
      /A loose ask \('turn off the Greek hints'\) still gets the nearest change by `do`, never a `setting_offer`/,
    );
  });
});
