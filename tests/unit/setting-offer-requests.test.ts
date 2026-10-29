// mw-5r3p30.663: the smoke of batch 116 saw the tutor offer theme=sepia for a LANDED request 'Add a sepia theme'. The rule sits in
// "His requests"; the contract's setting_offer clause is where the model decides to offer, so it names the exception too.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { settleOffer } from '../../src/talk/offers';
import { NO_CHAPTER } from '../../src/data/chapter';
import { bibleTalkRegistry, changeSettings } from '../../src/tutor/registry';
import { addTurn, listTurns } from '../../src/data/repositories';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

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

describe('a setting change made for a talk runs the set-setting command (mw-t3xu9a.6)', () => {
  afterAll(() => db.close());
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.settings.clear(), db.talks.clear()]);
  });

  it('a spoken yes to the offer and an answer\'s settings_changes both run set-setting', async () => {
    const run = vi.spyOn(bibleTalkRegistry().command('set-setting')!, 'run');
    await addTurn('rom.8.11', 'q', 'a', [], Date.now(), { changes: [], refused: [], settingOffer: { key: 'theme', value: 'dark' } });
    const turn = (await listTurns('rom.8.11')).at(-1)!;
    const scope = { title: '', chapter: NO_CHAPTER, verse: null };
    const outcome = await settleOffer('confirm', { turn, offer: { kind: 'setting', text: 'Change Theme: Dark' } }, scope);
    expect(outcome.applied).toMatchObject([{ key: 'theme', to: 'dark' }]);
    expect(run).toHaveBeenCalledTimes(1);
    await changeSettings([{ key: 'theme', value: 'light' }]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith({ name: 'theme', value: 'light' });
    run.mockRestore();
  });
});
