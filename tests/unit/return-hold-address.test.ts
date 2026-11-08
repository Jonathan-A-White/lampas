import { afterEach, describe, expect, it } from 'vitest';
import { holdStillWanted, holdIdea, dropHeldIdea } from '../../src/ideaReturn';
import { sameScreenAddress } from '../../src/nav/route';
import { holdTalkStillWanted, holdTalk, dropHeldTalk } from '../../src/talkReturn';
import { holdWord, holdWordStillWanted, dropHeldWord } from '../../src/wordReturn';
import type { Chapter } from '../../src/data/chapter';
import type { Lookup } from '../../src/WordSheet';
import type { TalkScope } from '../../src/services/talk';

// mw-fnvjof.17.15: a held sheet comes back at the Reader's chapter though the Reader rewrote its view and weave into the entry's address after the hold was taken.
describe('the screen a held sheet was over', () => {
  it('is the same Reader chapter whatever view, weave or verse the address carries', () => {
    expect(sameScreenAddress('#/?b=rom&c=8', '#/?b=rom&c=8&view=english&weave=off')).toBe(true);
    expect(sameScreenAddress('#/?b=rom&c=8&view=english&weave=off', '#/?b=rom&c=8&v=1')).toBe(true);
    expect(sameScreenAddress('#/?b=psa&c=23', '#/?b=psa&c=23&view=greek')).toBe(true);
  });

  it('is not another chapter, another book, another passage or another screen', () => {
    expect(sameScreenAddress('#/?b=rom&c=8', '#/?b=rom&c=9')).toBe(false);
    expect(sameScreenAddress('#/?b=rom&c=8', '#/?b=jhn&c=8')).toBe(false);
    expect(sameScreenAddress('#/?b=rom&c=8&p=1', '#/?b=rom&c=8')).toBe(false);
    expect(sameScreenAddress('#/?b=rom&c=8', '#/library')).toBe(false);
    expect(sameScreenAddress('#/library?kind=lexicons', '#/library?kind=lexicons')).toBe(true);
    expect(sameScreenAddress('#/library?kind=lexicons', '#/library')).toBe(false);
  });
});

describe('a hold is still wanted at the Reader address its entry was rewritten to', () => {
  afterEach(() => {
    dropHeldWord();
    dropHeldIdea();
    dropHeldTalk();
    window.location.hash = '';
  });

  it('for the word sheet, the idea sheet and the talk sheet', () => {
    window.location.hash = '#/?b=rom&c=8';
    holdWord({} as Chapter, {} as Lookup);
    holdIdea('aorist');
    holdTalk({} as TalkScope, '#/paradigms');
    window.location.hash = '#/?b=rom&c=8&view=english&weave=off';
    expect(holdWordStillWanted()).toBe(true);
    expect(holdStillWanted()).toBe(true);
    expect(holdTalkStillWanted()).toBe(true);
    window.location.hash = '#/?b=rom&c=9';
    expect(holdWordStillWanted()).toBe(false);
    expect(holdStillWanted()).toBe(false);
    expect(holdTalkStillWanted()).toBe(false);
  });
});
