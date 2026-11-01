// tests/unit/reader-tutor.test.tsx — the Reader's tutor wiring (src/reader/useReaderTutor.ts, docs/module-map.md R1b): each ask opens the Talk
// sheet on its verse and sends the request the Reader sent before the wiring became a hook (the question builders of src/services/talk.ts, the
// focus it was asked with), and a conversation still waiting for its answer is only shown, never asked twice.
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { chapterOf } from '../../src/data/readerChapter';
import { clearBus, subscribe, type AppEvent } from '../../src/events/bus';
import { useReaderTutor } from '../../src/reader/useReaderTutor';
import { helpQuestion, quizMeQuestion, scopeTitle, termQuestion } from '../../src/services/talk';
import type { UseTalk } from '../../src/useTalk';
import { stubChapterFetch } from '../support/chapter-fetch';
import { stubSpeech } from '../support/fake-speech';
import { asSpoken } from '../support/lone-word';

const open = chapterOf('rom', 8)!;
let romans: Chapter;

beforeAll(async () => {
  stubChapterFetch();
  romans = await loadChapter('rom', 8);
});

beforeEach(() => clearBus());

function fakeTalk(states: UseTalk['states'] = {}) {
  const say = vi.fn<UseTalk['say']>();
  return { states, say, resume: vi.fn<UseTalk['resume']>() };
}

function setup(talk = fakeTalk(), request?: Parameters<typeof useReaderTutor>[3]['request']) {
  const openTalk = { current: null as string | null };
  const tutor = renderHook(() => useReaderTutor(open, romans, talk, { request, viewUnit: undefined, openTalkRef: openTalk }));
  return { tutor, talk, openTalkRef: openTalk };
}

const verse28 = () => romans.verses.find((v) => v.n === 28)!;

describe('helpWithWord', () => {
  const help = { kind: 'grammar' as const, form: 'συνεργεῖ', lemma: 'συνεργέω', parse: 'verb, present active indicative, 3rd person singular', verse: 28 };

  it('opens the Talk sheet on the verse, publishes word-help and sends the help question with its focus', () => {
    const { tutor, talk } = setup();
    const seen: AppEvent[] = [];
    subscribe('word-help', (e) => seen.push(e));
    act(() => tutor.result.current.helpWithWord(help));
    const scope = { title: 'Romans 8', chapter: romans, verse: verse28() };
    const focus = { form: help.form, lemma: help.lemma, parse: help.parse, kind: 'grammar' };
    expect(talk.say).toHaveBeenCalledWith(scope, helpQuestion(focus as never, scopeTitle(scope)), focus);
    expect(tutor.result.current.talkScope?.verse?.n).toBe(28);
    expect(seen).toEqual([{ kind: 'word-help', help: 'grammar', form: help.form, lemma: help.lemma, parse: help.parse, chapter: 8, verse: 28 }]);
  });

  it('says the word slowly in Greek before the question when the help is Sound it out', () => {
    const speech = stubSpeech([{ lang: 'el-GR', name: 'Greek' }]);
    const { tutor, talk } = setup();
    act(() => tutor.result.current.helpWithWord({ ...help, kind: 'sound' }));
    expect(speech.spoken.map((s) => s.text)).toEqual([asSpoken(help.form)]);
    expect(talk.say).toHaveBeenCalledTimes(1);
  });

  it('only shows a conversation that is still waiting for its answer', () => {
    const { tutor, talk } = setup(fakeTalk({ 'rom.8.28': { phase: 'waiting' } as never }));
    act(() => tutor.result.current.helpWithWord(help));
    expect(talk.say).not.toHaveBeenCalled();
    expect(tutor.result.current.talkScope?.verse?.n).toBe(28);
  });
});

describe('askAboutTerm', () => {
  it('sends the term question with a grammar-term focus on the verse of the word', () => {
    const { tutor, talk } = setup();
    act(() => tutor.result.current.askAboutTerm({ term: 'genitive', verse: 28 }));
    const scope = { title: 'Romans 8', chapter: romans, verse: verse28() };
    expect(talk.say).toHaveBeenCalledWith(scope, termQuestion('genitive', scopeTitle(scope)), { term: 'genitive', kind: 'grammar-term' });
    expect(tutor.result.current.talkScope?.verse?.n).toBe(28);
  });
});

describe('openQuiz', () => {
  it('opens the sheet on the unit as a quiz and sends Quiz me once', async () => {
    const talk = fakeTalk();
    const unit = verse28();
    const openTalk = { current: null as string | null };
    const { result } = renderHook(() => useReaderTutor(open, romans, talk, { request: undefined, viewUnit: unit, openTalkRef: openTalk }));
    // Quiz me waits for the kept turns to be read: it presses until the question goes
    const pressed = () => {
      act(() => result.current.openQuiz());
      expect(talk.say).toHaveBeenCalled();
    };
    await waitFor(pressed);
    expect(result.current.talkScope).toEqual({ title: 'Romans 8', chapter: romans, verse: unit, quiz: true });
    expect(talk.say).toHaveBeenCalledWith({ title: 'Romans 8', chapter: romans, verse: unit, quiz: true }, quizMeQuestion(scopeTitle({ title: 'Romans 8', verse: unit })));
    expect(openTalk.current).toBe('rom.8.28:quiz');
  });
});
