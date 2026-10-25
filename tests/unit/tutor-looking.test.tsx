// tests/unit/tutor-looking.test.tsx — the Talk sheet's ask-back line and the lines of what the tutor did (mw-t3xu9a.7, docs/ask-tutor.md 'What you see when the tutor does something'): the line
// 'Looking at your ...' comes only from an answer that asked for facts, and an answer's do, asks and misses are read as the schema allows.
import { cleanup, render } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { defineRegistry, createMemoryStore, createTutorClient, type Command } from 'voice-kit/talks';
import { isTalkAnswer } from '../../src/services/talk';
import { LookingLine } from '../../src/talk/DoneLine';
import { buttonName, doneLinesOf } from '../../src/talk/doneLines';
import { askedNames, lookingLine } from '../../src/tutor/registry';
import { LiveRegion } from '../../src/ui/LiveRegion';
import { pendingOf, setPending } from '../../src/pending/pendingAsks';

afterEach(cleanup);

describe('the ask-back line', () => {
  it('is never made for an answer that asked for nothing', () => {
    for (const answer of [{ answer: 'Grace.', words: [] }, { answer: 'Grace.', words: [], asks: [] }]) {
      expect(isTalkAnswer(answer)).toBe(true);
      expect(askedNames((answer as { asks?: unknown }).asks)).toEqual([]);
    }
    expect(askedNames(undefined)).toEqual([]);
    expect(askedNames('works')).toEqual([]);
  });

  it('names what the tutor looks at, each fact once', () => {
    expect(lookingLine(['works'])).toBe('Looking at your Logos books');
    expect(lookingLine(['progress', 'rusty-words', 'progress'])).toBe('Looking at your progress and rusty words');
    expect(lookingLine(['today-drill', 'progress', 'settings'])).toBe("Looking at your today's drill, progress and settings");
    expect(lookingLine(['some-new-fact'])).toBe('Looking at your some new fact');
  });

  it('is drawn as one line and said through the live region', () => {
    render(
      <>
        <LiveRegion />
        <LookingLine text="Looking at your Logos books" />
      </>,
    );
    expect(document.querySelector('[data-talk-looking]')).toHaveTextContent('Looking at your Logos books');
    expect(document.querySelector('[data-live-region]')).toHaveTextContent('Looking at your Logos books');
  });

  it('is kept on a waiting message only, and a message that asked for nothing keeps none', () => {
    window.localStorage.clear();
    setPending('talk:rom.8', { phase: 'waiting', question: 'q', startedAt: 1, looking: 'Looking at your Logos books' });
    expect(pendingOf('talk:rom.8')).toMatchObject({ phase: 'waiting', looking: 'Looking at your Logos books' });
    setPending('talk:rom.8', { phase: 'sending', question: 'q', startedAt: 1, looking: 'Looking at your Logos books' });
    expect(pendingOf('talk:rom.8')).not.toHaveProperty('looking');
    setPending('talk:rom.8', { phase: 'waiting', question: 'q', startedAt: 1 });
    expect(pendingOf('talk:rom.8')).not.toHaveProperty('looking');
    window.localStorage.clear();
  });
});

describe('an answer that names commands, facts and misses', () => {
  const base = { answer: 'Done.', words: [] };
  it('is believed when each is as the schema has it', () => {
    expect(isTalkAnswer({ ...base, asks: ['works'], do: [{ name: 'set-setting', args: { name: 'theme', value: 'dark' } }, { name: 'start-review' }], misses: [{ wanted: 'x', why: 'y' }], said: 'Set it.' })).toBe(true);
  });
  it('is refused when one is not', () => {
    expect(isTalkAnswer({ ...base, asks: 'works' })).toBe(false);
    expect(isTalkAnswer({ ...base, asks: [''] })).toBe(false);
    expect(isTalkAnswer({ ...base, do: [{ args: {} }] })).toBe(false);
    expect(isTalkAnswer({ ...base, do: [{ name: 'a', extra: 1 }] })).toBe(false);
    expect(isTalkAnswer({ ...base, misses: [{ wanted: 'x' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, said: '' })).toBe(false);
  });
});

describe('the lines of a do', () => {
  let ran = 0;
  const free: Command = { name: 'open-it', tell: 't', kind: 'free', run: async () => ({ said: 'Opened it' }) };
  const undoable: Command = { name: 'tick-it', tell: 't', kind: 'undoable', run: async () => ({ said: 'Ticked it', undo: async () => undefined }) };
  const confirm: Command = { name: 'delete-note', tell: 'Deletes a note', kind: 'confirm', offer: () => 'Delete the note?', run: async () => ((ran += 1), { said: 'Deleted' }) };
  const failing: Command = { name: 'break-it', tell: 't', kind: 'free', run: async () => Promise.reject(new Error('it broke')) };
  const registry = defineRegistry({ commands: [free, undoable, confirm, failing] });
  const client = () => createTutorClient<never>({ store: createMemoryStore(), registry, screen: () => 'Reader', send: () => Promise.reject(new Error('no')) });

  it('keeps one line per command in the answer\'s order, runs no confirm command, and says what was refused', async () => {
    const calls = [{ name: 'tick-it' }, { name: 'delete-note' }, { name: 'open-it' }, { name: 'break-it' }, { name: 'no-such' }];
    const taken = await client().takeAnswer({ do: calls }, 0);
    const { lines, undos, refused } = doneLinesOf(calls, taken, registry);
    expect(lines).toEqual([
      { name: 'tick-it', kind: 'undoable', said: 'Ticked it' },
      { name: 'delete-note', kind: 'confirm', said: 'Delete the note?', args: {} },
      { name: 'open-it', kind: 'free', said: 'Opened it' },
    ]);
    expect(undos[0]).toBeTypeOf('function');
    expect(undos[1]).toBeUndefined();
    expect(refused).toEqual(['Could not break it: break-it failed: it broke', 'Could not no such: there is no command called "no-such"']);
    expect(ran).toBe(0);
  });

  it('names a button after the command', () => {
    expect(buttonName('forget-note')).toBe('Forget note');
    expect(buttonName('set_setting')).toBe('Set setting');
  });
});
