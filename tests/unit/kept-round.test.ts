import { beforeEach, describe, expect, it } from 'vitest';
import type { RunningRound } from '../../src/review/heldRound';
import { dropRound, KEPT_MS, keepRound, keptRound } from '../../src/review/keptRound';

const word = (id: string) => ({
  kind: 'word' as const,
  id,
  mode: 'choice' as const,
  question: { lemma: id, prompt: id, gloss: 'x', options: ['x', 'y', 'z', 'w'] },
});

const round = (over: Partial<RunningRound> = {}): RunningRound => ({
  status: 'running',
  items: [word('a'), word('b'), word('c')],
  index: 0,
  picked: null,
  right: 0,
  missed: [],
  ...over,
});

describe('the kept Review round (mw-86e9r1.32)', () => {
  beforeEach(() => sessionStorage.clear());

  it('is none until a round is kept, and none again once dropped', () => {
    expect(keptRound()).toBeUndefined();
    keepRound(round());
    expect(keptRound()).toEqual(round());
    dropRound();
    expect(keptRound()).toBeUndefined();
  });

  it('stands at the next question once the one in hand is answered', () => {
    keepRound(round({ index: 1, picked: 'x', right: 1 }));
    expect(keptRound()).toEqual(round({ index: 2, picked: null, right: 1 }));
  });

  it('keeps the last question answered, so Finish still ends the round', () => {
    keepRound(round({ index: 2, picked: 'x', right: 2 }));
    expect(keptRound()).toEqual(round({ index: 2, picked: 'x', right: 2 }));
  });

  it('is not his after six hours, nor when what is stored is not a round', () => {
    keepRound(round(), Date.now() - KEPT_MS - 1000);
    expect(keptRound()).toBeUndefined();
    sessionStorage.setItem('lampas.reviewRound', '{"round":{"items":[],"index":0},"at":1}');
    expect(keptRound()).toBeUndefined();
    sessionStorage.setItem('lampas.reviewRound', 'not json');
    expect(keptRound()).toBeUndefined();
  });
});
