// The tutor door's machinery (mw-5r3p30.880, part B of mw-5r3p30.843; mw-5r3p30.882 made the floating ? the one door): the registry of what a tap asks about with its licence gate, the floating ? at the Hand side,
// a two-finger tap that opens nothing, and the word and idea sheets that register their word or lesson.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingTutor } from '../../src/AskTutor';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail, type LicenceState } from '../../src/gate/licenceContext';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { Candidate } from '../../src/data/frontier';
import { IdeaSheet } from '../../src/IdeaSheet';
import { TeachSheet, type NewWordAsk } from '../../src/TeachSheet';
import { SettingsScreen } from '../../src/SettingsScreen';
import { showSettingsGroup } from '../support/settings-pages';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { setHand } from '../../src/settings/hand';
import { openDoorTarget, registerDoorTarget, useDoorTarget, useNoDoor } from '../../src/tutor/door';
import { WordSheet, type WordHelp } from '../../src/WordSheet';
import { stubChapterFetch } from '../support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  setCurrentLicence('licensed');
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  stubChapterFetch();
  setCurrentLicence('licensed');
  await db.open();
  await db.settings.clear();
});

afterEach(() => setCurrentLicence('licensed'));

/** A phone with the given licence, as LicenceProvider tells the app (and the mill client). */
function Phone({ licence, children }: { licence: LicenceState; children: ReactNode }) {
  setCurrentLicence(licence);
  const value: LicenceDetail = { licence, locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}

/** A screen that registers what a tap asks about; `hidden` is the immersive reader, where he wants no tutor. */
function Screen({ ask, hidden }: { ask: (() => void) | undefined; hidden?: boolean }) {
  useDoorTarget(ask, hidden);
  return <p>a screen</p>;
}

/** A sheet with nothing to ask about (the chapter picker, the RP 2026 sheet, the variant key and filter sheets). */
function NoDoorSheet() {
  useNoDoor();
  return <div role="dialog" aria-modal="true" aria-label="A sheet" />;
}

/** The events a browser sends for `fingers` fingers landing together and lifting together. */
function touch(type: 'touchstart' | 'touchend' | 'touchmove', points: Array<{ x: number; y: number }>, target: EventTarget = document): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: points.map((p) => ({ clientX: p.x, clientY: p.y })) });
  act(() => void target.dispatchEvent(event));
}
const two = [
  { x: 100, y: 300 },
  { x: 190, y: 310 },
];
function twoFingerTap(target: EventTarget = document): void {
  touch('touchstart', two, target);
  touch('touchend', [], target);
}

const FLOATING = 'Ask the tutor about what is on screen';

describe('what the door asks about', () => {
  it('is the newest target registered, and the one before it again when that goes', () => {
    const asked: string[] = [];
    const off = [registerDoorTarget(() => asked.push('screen')), registerDoorTarget(() => asked.push('word sheet'))];
    expect(openDoorTarget()).toBe(true);
    off[1]();
    expect(openDoorTarget()).toBe(true);
    off[0]();
    expect(openDoorTarget()).toBe(false);
    expect(asked).toEqual(['word sheet', 'screen']);
  });

  it('opens nothing on a phone with no licence, even with a target', () => {
    const ask = vi.fn();
    const off = registerDoorTarget(ask);
    setCurrentLicence('not-licensed');
    expect(openDoorTarget()).toBe(false);
    setCurrentLicence('checking');
    expect(openDoorTarget()).toBe(false);
    expect(ask).not.toHaveBeenCalled();
    off();
  });
});

describe('a sheet over a screen (mw-5r3p30.953)', () => {
  it('stays above a screen target registered after it: a sheet linked at startup mounts before the Reader has loaded its chapter', () => {
    const asked: string[] = [];
    const sheet = registerDoorTarget(() => asked.push('sheet'), false, true);
    const screenOff = registerDoorTarget(() => asked.push('screen'));
    expect(openDoorTarget()).toBe(true);
    sheet();
    expect(openDoorTarget()).toBe(true);
    screenOff();
    expect(asked).toEqual(['sheet', 'screen']);
  });

  it('is not drawn when it has nothing to ask about, and the ? is back when it closes', async () => {
    const { rerender } = render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
        <NoDoorSheet />
      </Phone>,
    );
    await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).toBeNull());
    rerender(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });
});

describe('a two-finger tap', () => {
  it('opens no tutor: it goes in and out of immersive reading (src/immersive.ts), the floating ? is the one door', async () => {
    const ask = vi.fn();
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={ask} />
      </Phone>,
    );
    await screen.findByRole('button', { name: FLOATING });
    twoFingerTap();
    twoFingerTap();
    expect(ask).not.toHaveBeenCalled();
  });
});

describe('the floating ?', () => {
  it('is a round button on every screen that has something to ask about; a tap asks it', async () => {
    await setHand('right');
    const ask = vi.fn();
    const user = userEvent.setup();
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={ask} />
      </Phone>,
    );
    await user.click(await screen.findByRole('button', { name: FLOATING }));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('is not drawn where nothing is registered', async () => {
    render(
      <Phone licence="licensed">
        <FloatingTutor />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
  });

  it('sits at the Hand side: left puts it on the left, right on the right', async () => {
    await setHand('left');
    const { unmount } = render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    const left = await screen.findByRole('button', { name: FLOATING });
    expect(left.getAttribute('data-hand')).toBe('left');
    unmount();
    cleanup();
    await setHand('right');
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: FLOATING }).getAttribute('data-hand')).toBe('right'));
  });

  it('is not drawn at all on a phone with no licence, and a licence lost takes it away', async () => {
    const { rerender } = render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('button', { name: FLOATING });
    rerender(
      <Phone licence="not-licensed">
        <FloatingTutor />
        <Screen ask={undefined} />
      </Phone>,
    );
    await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).toBeNull());
  });

  it('is put away while the newest target is hidden (the immersive reader) and comes back with the bars', async () => {
    const { rerender } = render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} hidden />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
    rerender(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} hidden={false} />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });

  it('is drawn over a sheet that stands on a hidden screen: the sheet is not the immersive reader', async () => {
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} hidden />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });

  it('reads a stored Tutor door of "twoFinger" (the setting that is gone) as floating: the ? is drawn and nothing reads the row', async () => {
    await db.settings.put({ key: 'tutorDoor', value: 'twoFinger' });
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
    expect(document.querySelectorAll('[data-floating-tutor]')).toHaveLength(1);
  });

  it('draws over an open sheet (it is not hidden by one)', async () => {
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
        <div role="dialog" aria-modal="true" aria-label="A sheet" />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });
});

describe('the word sheet', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const word = chapter.verses.find((v) => v.n === 1)!.g[0];

  it('has no Ask the tutor of its own, and the floating ? asks about its word', async () => {
    const asked: WordHelp[] = [];
    const user = userEvent.setup();
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} onHelp={(h) => asked.push(h)} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Word' });
    expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull();
    await user.click(await screen.findByRole('button', { name: FLOATING }));
    expect(asked[0]).toMatchObject({ kind: 'word', form: word.t, lemma: word.l, verse: 1 });
    expect(asked[0].parse).toBeTruthy();
  });

  it('with no help to ask for (a linked word, a word of another chapter) draws no ?: the Talk sheet would open beneath it (mw-5r3p30.953)', async () => {
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Word' });
    await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).toBeNull());
  });

  it('draws no ? and asks nothing on a phone with no licence', async () => {
    const asked: WordHelp[] = [];
    render(
      <Phone licence="not-licensed">
        <FloatingTutor />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} onHelp={(h) => asked.push(h)} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Word' });
    await new Promise((r) => setTimeout(r, 50));
    twoFingerTap();
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
    expect(asked).toEqual([]);
  });
});

describe('the lesson (idea) sheet', () => {
  it('has no Ask the tutor of its own, and the floating ? opens a talk about its lesson', async () => {
    const user = userEvent.setup();
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <IdeaSheet idea={ideaOf('noun')} onClose={() => undefined} onWord={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Idea' });
    expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull();
    await user.click(await screen.findByRole('button', { name: FLOATING }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Ask the tutor: / })).not.toBeNull());
  });

  it('draws no ? and opens nothing on a phone with no licence', async () => {
    render(
      <Phone licence="not-licensed">
        <FloatingTutor />
        <IdeaSheet idea={ideaOf('noun')} onClose={() => undefined} onWord={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Idea' });
    await new Promise((r) => setTimeout(r, 50));
    twoFingerTap();
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
    expect(screen.queryByRole('dialog', { name: /Ask the tutor: / })).toBeNull();
  });
});

describe('the teach sheet (the new word)', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  // a word of the chapter, as the 'New N' chip offers it (src/data/frontier.ts Candidate)
  const word = chapter.verses.find((v) => v.n === 9)!.g.find((w) => w.l.normalize('NFC') === 'αὐτός')!;
  const candidate: Candidate = { strongs: 'G846', lemma: 'αὐτός', gloss: 'it/s/he', count: 5000, verses: chapter.verses.filter((v) => v.g.some((w) => w.l.normalize('NFC') === 'αὐτός')).map((v) => v.n) };
  // The Reader's own target is under the sheet (src/Reader.tsx opens the Talk sheet about the chapter or verse, at z-10, under this sheet at z-20): the ? must not reach it
  const reader = vi.fn();
  const render1 = (onAsk: ((ask: NewWordAsk) => void) | undefined, onClose: () => void, licence: LicenceState = 'licensed') =>
    render(
      <Phone licence={licence}>
        <FloatingTutor />
        <Screen ask={licence === 'licensed' ? reader : undefined} />
        <TeachSheet chapter={chapter} title="Romans 8" candidates={[candidate]} solid={new Set()} onClose={onClose} onShowVerse={() => undefined} onAsk={onAsk} />
      </Phone>,
    );

  beforeEach(() => reader.mockClear());

  it('has no Ask the tutor of its own, and the floating ? closes it and asks about its word (mw-5r3p30.949)', async () => {
    expect(word).toBeTruthy();
    const order: string[] = [];
    const asked: NewWordAsk[] = [];
    const user = userEvent.setup();
    render1(
      (ask) => {
        order.push('ask');
        asked.push(ask);
      },
      () => order.push('close'),
    );
    await screen.findByRole('dialog', { name: 'New word' });
    expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull();
    await user.click(await screen.findByRole('button', { name: FLOATING }));
    expect(reader).not.toHaveBeenCalled();
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatchObject({ lemma: 'αὐτός', gloss: 'it/s/he' });
    expect(chapter.verses.find((v) => v.n === asked[0].verse)?.g.some((w) => w.l.normalize('NFC') === 'αὐτός')).toBe(true);
    // the sheet closes first, so the Talk opens in the commit the sheet closes in
    expect(order).toEqual(['close', 'ask']);
  });

  it('draws no ? and asks nothing on a phone with no licence', async () => {
    const asked: NewWordAsk[] = [];
    render1(undefined, () => undefined, 'not-licensed');
    await screen.findByRole('dialog', { name: 'New word' });
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
    expect(openDoorTarget()).toBe(false);
    expect(asked).toEqual([]);
  });
});

describe('Settings', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  });

  it('has no Tutor door row, licensed or not: the floating ? is the one door', async () => {
    window.location.hash = '#/settings';
    render(
      <Phone licence="licensed">
        <SettingsScreen />
      </Phone>,
    );
    await showSettingsGroup('tutor');
    await waitFor(() => expect(screen.getAllByRole('group').length).toBeGreaterThan(0));
    expect(screen.queryByRole('group', { name: 'Tutor door' })).toBeNull();
    expect(screen.queryByText('Tutor door')).toBeNull();
  });

  it('does not draw the Hand row on a phone with no licence; the AI rows beside it are greyed with Needs a licence', async () => {
    window.location.hash = '#/settings';
    render(
      <Phone licence="not-licensed">
        <SettingsScreen />
      </Phone>,
    );
    await showSettingsGroup('tutor');
    await waitFor(() => expect(screen.getAllByText('Needs a licence').length).toBeGreaterThan(0));
    await showSettingsGroup('reading');
    // the page has drawn its rows (Immersive reader is a row of Reading)
    await screen.findByRole('group', { name: 'Immersive reader' });
    expect(screen.queryByRole('group', { name: 'Hand' })).toBeNull();
    expect(screen.queryByText('Hand')).toBeNull();
  });

  it('draws the Hand row on a licensed phone', async () => {
    window.location.hash = '#/settings';
    render(
      <Phone licence="licensed">
        <SettingsScreen />
      </Phone>,
    );
    await showSettingsGroup('reading');
    expect(await screen.findByRole('group', { name: 'Hand' })).toBeTruthy();
  });
});
