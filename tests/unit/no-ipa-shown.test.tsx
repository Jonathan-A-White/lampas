// The standard ids are for the app's module boundaries (mw-5r3p30.352, his words: "I'm trying to bring the user from wherever they're at [to] the Greek
// without necessarily having to know the standard"): with American or British English chosen, no lesson, sheet, tile, question, drill line or what the
// tutor is told shows an IPA-only character or a sound's id. Only choosing IPA as the accent (mw-5r3p30.353) shows them.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { IdeaSheet } from '../../src/IdeaSheet';
import { db } from '../../src/data/db';
import { LADDER, itemsOf } from '../../src/data/grammar/ladder';
import { bearsSound, ideaSound, ideaText, soundLesson } from '../../src/data/grammar/lessons';
import { buildIdeaQuestion } from '../../src/data/grammar/questions';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { teachTiles } from '../../src/data/grammar/teachTiles';
import { mulberry32 } from '../../src/data/quiz';
import { ACCENTS, DEFAULT_ACCENT, chooseAccent, type EnglishAccent } from '../../src/speech/accents';
import { pronunciationOf, soundRulesOf, tutorGuideOf } from '../../src/speech/pronunciation';
import { SOUND_IDS } from '../../src/speech/sounds';
import { stubChapterFetch } from '../support/chapter-fetch';

const modern = pronunciationOf('modern');

/** The characters only IPA writes (ɣ ʝ ð ɛ ɔ ʃ ː, and the others of the inventory: ç ŋ ɾ ɡ); θ is left out, being Greek's own theta. */
const IPA_ONLY = /[ɣʝðɛɔʃːçŋɾɡ]/u;

/** What in `text` belongs to IPA: an IPA-only character, or a sound's slashed id. */
const ipaIn = (text: string): string[] => [...(text.match(new RegExp(IPA_ONLY.source, 'gu')) ?? []), ...SOUND_IDS.filter((id) => text.includes(id))];

const SOUND_IDEAS = LADDER.filter(bearsSound);
const QUICK_ITEMS = LADDER.filter((i) => i.parent || i.glyphs);

// IPA itself (the third accent, mw-5r3p30.353) is the one that shows them: tests/unit/english-accent-setting.test.ts holds it to that.
describe.each(ACCENTS.filter((a) => a.id !== 'ipa').map((a) => [a.id, a] as const))('in %s English, nothing the learner reads of a sound is IPA', (_, accent: EnglishAccent) => {
  it('every lesson, sound line and How it sounds of a letter, pair, breathing or group', () => {
    for (const idea of SOUND_IDEAS) {
      for (const text of [ideaText(idea, modern, accent), ideaSound(idea, modern, accent) ?? '', soundLesson(idea, modern, accent) ?? '']) expect(ipaIn(text), idea.id).toEqual([]);
    }
  });

  it("every teach tile, every sound rule's line and what the tutor is told", () => {
    chooseAccent(accent.id);
    try {
      for (const idea of LADDER.filter((i) => ['letters', 'sounds', 'marks'].includes(i.tier))) expect(ipaIn(JSON.stringify(teachTiles(idea, modern))), idea.id).toEqual([]);
      for (const rule of soundRulesOf(modern, accent)) for (const side of rule.sides) expect(ipaIn(`${side.label} ${side.line}`), rule.ideaId).toEqual([]);
      expect(ipaIn(tutorGuideOf(modern, accent))).toEqual([]);
    } finally {
      chooseAccent(DEFAULT_ACCENT);
    }
  });

  it('every question and choice a sound idea or a quick-round item is asked with', () => {
    chooseAccent(accent.id);
    try {
      for (const idea of SOUND_IDEAS) {
        for (let seed = 1; seed <= 6; seed++) expect(ipaIn(JSON.stringify(buildIdeaQuestion(idea, [], mulberry32(seed), undefined, modern))), `${idea.id} seed ${seed}`).toEqual([]);
      }
      for (const item of QUICK_ITEMS) {
        for (const mode of ['see', 'hear'] as const) expect(ipaIn(JSON.stringify(quickQuestion({ id: item.id, mode }, mulberry32(3), modern))), `${item.id} ${mode}`).toEqual([]);
      }
    } finally {
      chooseAccent(DEFAULT_ACCENT);
    }
  });
});

describe('the idea sheet of every letter, pair, breathing and group, drawn in American English', () => {
  beforeAll(async () => {
    await db.open();
    await db.settings.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  afterAll(() => db.close());

  it('shows no IPA', async () => {
    expect(chooseAccent(DEFAULT_ACCENT)).toBeUndefined();
    expect(itemsOf('alphabet')).toHaveLength(24);
    for (const idea of SOUND_IDEAS) {
      stubChapterFetch();
      render(<IdeaSheet idea={idea} onClose={() => {}} onWord={() => {}} />);
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(screen.queryByTestId('idea-loading')).toBeNull());
      expect(ipaIn(document.body.textContent ?? ''), idea.id).toEqual([]);
      cleanup();
    }
  }, 120_000);
});
