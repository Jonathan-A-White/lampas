// tests/unit/memorize-type.test.tsx — typing a recall in the Memorize session (mw-fu7dqf.9): 'Type it' beside the hold for English always, for Greek only while the Settings switch
// 'Greek keyboard' is On (Off: a line that opens the row), never for the Weave; judged by learn-kit/recall's fold (case, punctuation, accents, breathings and final sigma ignored).
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review } from '../../src/data/db';
import { setGreekInterest } from '../../src/data/repositories';
import { memorize, recallsOf } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import type { MemorizeLang } from '../../src/memorize/languages';
import { memorizeTarget } from '../../src/memorize/target';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openMemorizeSession } from '../../src/nav/route';
import { stopReading } from '../../src/speech/readAloud';
import { greekKeyboardSetting } from '../../src/settings/definitions';
import { settingKeyOf } from '../../src/settings/link';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../support/chapter-fetch';
import { stubRecognizer } from '../support/fake-recognizer';
import { stubRecorder } from '../support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const REF = 'John.1.16';
const VERSE = 'From His fullness we have all received grace upon grace.';

beforeEach(async () => {
  clearBus();
  forgetTrail();
  stubChapterFetch();
  forgetChapters();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubRecognizer();
  stubRecorder();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.words.clear()]);
  await setGreekInterest(5);
  window.history.replaceState(null, '', '/#/today');
});
afterEach(() => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
});

async function open(lang: MemorizeLang, step = 0, ref = REF): Promise<void> {
  await memorize(ref, [lang], 1_700_000_000_000);
  await db.reviews.where('[kind+id]').equals(['verse', `${lang}:${ref}`]).modify({ step, due: Date.now() - 1000, lastWhen: 1_700_000_000_000 } satisfies Partial<Review>);
  openMemorizeSession(ref, lang);
  render(<MemorizeScreen />);
  await screen.findByTestId('memorize-verse');
}

const typeInto = (text: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });

describe('English', () => {
  it('has Type it; a verse typed with other case and punctuation is Got it and kept as typed', async () => {
    await open('en');
    fireEvent.click(await screen.findByRole('button', { name: 'Type it' }));
    const field = screen.getByRole('textbox');
    expect(field.getAttribute('lang')).toBe('en');
    expect(field.getAttribute('autocapitalize')).toBe('off');
    expect(field.getAttribute('enterkeyhint')).toBe('done');
    typeInto(VERSE.toLowerCase().replace(/[.,]/g, ' ; '));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect((await screen.findByTestId('judgement')).textContent).toBe('Got it: 10 of 10 words');
    const [recall] = await recallsOf(REF, 'en');
    expect(recall).toMatchObject({ how: 'typed', score: 1, missed: [] });
    expect(screen.getByTestId('due').textContent).toBe('Due tomorrow');
  });

  it('marks the words typed wrong or left out and says Not yet', async () => {
    await open('en', 2);
    fireEvent.click(await screen.findByRole('button', { name: 'Type it' }));
    typeInto('From His we have received grace grace');
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect((await screen.findByTestId('judgement')).textContent).toBe('Not yet: 3 words missed');
    expect([...screen.getByTestId('memorize-verse').querySelectorAll('[data-missed]')].map((t) => t.textContent)).toEqual(['fullness', 'all', 'upon']);
    expect(await recallsOf(REF, 'en')).toMatchObject([{ how: 'typed', missed: ['fullness', 'all', 'upon'] }]);
  });

  it('Check does nothing until something is typed', async () => {
    await open('en');
    fireEvent.click(await screen.findByRole('button', { name: 'Type it' }));
    expect((screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Greek', () => {
  it('with Greek keyboard Off shows the line that opens the row, and no field', async () => {
    await open('el');
    const line = await screen.findByRole('button', { name: 'Turn on Greek keyboard in Settings to type Greek' });
    expect(screen.queryByRole('button', { name: 'Type it' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(line);
    expect(settingKeyOf(window.location.hash)).toBe('greekKeyboard');
  });

  it('with Greek keyboard On the field is Greek and a verse typed without accents passes', async () => {
    await setSetting(greekKeyboardSetting, 'on');
    await open('el', 0, 'Rom.8.28');
    const typeIt = await screen.findByRole('button', { name: 'Type it' });
    expect(screen.queryByText(/Turn on Greek keyboard/)).toBeNull();
    const target = await memorizeTarget('Rom.8.28', 'el');
    const plain = (target ? target.tokens : []).map((t) => t.text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ')).join(' ');
    expect(plain.startsWith('οιδαμεν δε οτι')).toBe(true);
    fireEvent.click(typeIt);
    expect(screen.getByRole('textbox').getAttribute('lang')).toBe('el');
    typeInto(plain);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect((await screen.findByTestId('judgement')).textContent).toMatch(/^Got it/);
    expect(await recallsOf('Rom.8.28', 'el')).toMatchObject([{ how: 'typed', score: 1 }]);
  });

  it('turning the switch On while the session is open offers Type it', async () => {
    await open('el');
    await screen.findByText(/Turn on Greek keyboard/);
    await setSetting(greekKeyboardSetting, 'on');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Type it' })).toBeTruthy());
  });
});

describe('the Weave', () => {
  it('is never typed, with the switch On or Off', async () => {
    await setSetting(greekKeyboardSetting, 'on');
    await open('weave');
    expect(screen.queryByRole('button', { name: 'Type it' })).toBeNull();
    expect(screen.queryByText(/Greek keyboard/)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: /Hold to say it/ })).toBeTruthy();
  });
});

describe('the Greek keyboard setting', () => {
  it('is in the registry under Daily, Off to start, and shown from Curious', async () => {
    const { settingOf } = await import('../../src/settings/registry');
    const { ROWS, visibleRows } = await import('../../src/settings/rows');
    expect(settingOf('greekKeyboard')).toMatchObject({ label: 'Greek keyboard', section: 'daily' });
    expect(ROWS.find((r) => r.key === 'greekKeyboard')?.section).toBe('daily');
    expect(greekKeyboardSetting.default).toBe('off');
    expect(visibleRows({ greekInterest: '0' }, '').some((r) => r.key === 'greekKeyboard')).toBe(false);
    expect(visibleRows({ greekInterest: '1' }, '').some((r) => r.key === 'greekKeyboard')).toBe(true);
  });
});
