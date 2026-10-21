// A Settings row's longer help is Markdown (mw-5r3p30.721): the Greek dial's six steps are a list with the number and name of each in bold, the speaker beside it
// says the words and none of the marks, and the search finds a word that is only in the help.
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { GREEK_LEVELS } from '../../src/settings/definitions/greekInterest';
import { SettingRow } from '../../src/settings/controls/SettingRow';
import { ROWS, rowOf, searchSettings, visibleRows } from '../../src/settings/rows';
import { stopReading } from '../../src/speech/readAloud';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const user = userEvent.setup();
let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopReading());
  cleanup();
  vi.unstubAllGlobals();
});

const openDialHelp = async (): Promise<HTMLElement> => {
  const row = rowOf('greekInterest');
  if (!row) throw new Error('no greekInterest row');
  render(
    <SettingRow row={row}>
      <span>control</span>
    </SettingRow>,
  );
  await user.click(screen.getByRole('button', { name: 'More help' }));
  return document.querySelector('[data-help-text]') as HTMLElement;
};

describe("the Greek dial's More help", () => {
  it('is a list of the six steps, each step\'s number and name in bold, drawn by the app\'s Markdown', async () => {
    const help = await openDialHelp();
    expect(help.querySelector('.markdown')).not.toBeNull();
    const items = within(help).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    GREEK_LEVELS.forEach((step, i) => {
      expect(items[i].querySelector('strong')?.textContent).toBe(`${step.level} · ${step.name}`);
      expect(items[i].textContent).toContain(step.line);
    });
    expect(help.textContent).not.toMatch(/\*\*/);
  });

  it('is read aloud as the same words in order, with no mark spoken', async () => {
    await openDialHelp();
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));
    const said = synth.spoken.map((s) => s.text).join(' ');
    expect(said).not.toMatch(/[*#_`·]|^-|\s-\s/);
    let at = -1;
    for (const step of GREEK_LEVELS) {
      const found = said.indexOf(step.name);
      expect(found, step.name).toBeGreaterThan(at);
      at = found;
    }
    expect(said).toContain(GREEK_LEVELS[0].line);
  });
});

describe('Settings search and a help in Markdown', () => {
  it('finds a word that is only in the help, whatever marks stand around it', () => {
    // 'Dipping a toe' is a step's name, written in bold in the dial's help and nowhere in its name or hint
    expect(searchSettings('dipping a toe').map((r) => r.key)).toContain('greekInterest');
    expect(searchSettings('restores them').map((r) => r.key)).toContain('greekInterest');
    expect(searchSettings('**').length).toBe(0);
    const values = new Map<string, string>(ROWS.map((r) => [r.key, '']));
    expect(visibleRows(values as never, 'dipping a toe').map((r) => r.key)).toContain('greekInterest');
  });
});
