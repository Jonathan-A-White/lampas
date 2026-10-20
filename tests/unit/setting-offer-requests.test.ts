// mw-5r3p30.663: the smoke of batch 116 saw the tutor offer theme=sepia for a LANDED request 'Add a sepia theme'. The rule sits in
// "His requests"; the contract's setting_offer clause is where the model decides to offer, so it names the exception too.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';

const instructions = instructionsOf('bible-talk');

describe('setting_offer and the requests', () => {
  it('the contract clause on setting_offer names the exception for an idea in requests', () => {
    const clause = instructions.split('\n').find((line) => line.includes('`setting_offer` when you propose a setting change'));
    expect(clause, 'the contract line that lists setting_offer').toBeDefined();
    expect(clause).toMatch(/never for an idea in `requests` unless its `status` is `adopted-as-setting`/);
  });

  it('His requests keeps its own rule', () => {
    expect(instructions).toContain('Offer a setting only for an idea whose `status` is `adopted-as-setting`');
  });
});
