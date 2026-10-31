// The tutor door's machinery (mw-5r3p30.880, part B of mw-5r3p30.843): the door mode with its licence gate, the registry of what a tap asks about, the two-finger tap on the document, the floating ?
// at the Hand side, and the word and idea sheets that register their word or lesson. The old buttons stay until part C2; these tests are about the new door only.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingTutor, TutorDoor } from '../../src/AskTutor';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail, type LicenceState } from '../../src/gate/licenceContext';
import { ideaOf } from '../../src/data/grammar/ladder';
import { IdeaSheet } from '../../src/IdeaSheet';
import { SettingsScreen } from '../../src/SettingsScreen';
import { showSettingsGroup } from '../support/settings-pages';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { setHand } from '../../src/settings/hand';
import { setTutorDoor } from '../../src/settings/definitions/tutorDoor';
import { doorModeOf, openDoorTarget, registerDoorTarget, useDoorTarget } from '../../src/tutor/door';
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

/** A screen that registers what a tap asks about. */
function Screen({ ask }: { ask: (() => void) | undefined }) {
  useDoorTarget(ask);
  return <p>a screen</p>;
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

async function chooses(door: 'twoFinger' | 'floating', hand: 'left' | 'right' = 'right'): Promise<void> {
  await setTutorDoor(door);
  await setHand(hand);
}

describe('the door mode', () => {
  it('is none without a licence, whatever he chose, else the door he chose', () => {
    expect(doorModeOf(false, 'twoFinger')).toBe('none');
    expect(doorModeOf(false, 'floating')).toBe('none');
    expect(doorModeOf(true, 'twoFinger')).toBe('twoFinger');
    expect(doorModeOf(true, 'floating')).toBe('floating');
    // the setting not yet read: no door yet
    expect(doorModeOf(true, undefined)).toBe('none');
  });
});

describe('what a tap asks about', () => {
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

describe('Two-finger tap (the default)', () => {
  it('opens the tutor about what the screen registered, from anywhere on the document', async () => {
    const ask = vi.fn();
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={ask} />
      </Phone>,
    );
    await waitFor(() => {
      twoFingerTap();
      expect(ask).toHaveBeenCalled();
    });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('is not a tap with one finger, three fingers, fingers that moved or fingers that stayed down', async () => {
    const ask = vi.fn();
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={ask} />
      </Phone>,
    );
    // let the setting be read: the tap opens once it is
    await waitFor(() => {
      twoFingerTap();
      expect(ask).toHaveBeenCalled();
    });
    ask.mockClear();
    touch('touchstart', [two[0]]);
    touch('touchend', []);
    touch('touchstart', [...two, { x: 280, y: 300 }]);
    touch('touchend', []);
    touch('touchstart', two);
    touch('touchmove', two.map((p) => ({ x: p.x, y: p.y - 60 })));
    touch('touchend', []);
    vi.useFakeTimers({ toFake: ['performance'] });
    touch('touchstart', two);
    vi.setSystemTime(Date.now() + 700);
    vi.advanceTimersByTime(700);
    touch('touchend', []);
    vi.useRealTimers();
    expect(ask).not.toHaveBeenCalled();
  });

  it('opens nothing while a screen has registered nothing, and nothing with no licence', async () => {
    const ask = vi.fn();
    render(
      <Phone licence="not-licensed">
        <TutorDoor />
        <Screen ask={ask} />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 50));
    twoFingerTap();
    expect(ask).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /ask the tutor/i })).toBeNull();
  });

  it('draws no button of its own', async () => {
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
  });
});

describe('Floating ?', () => {
  it('is a round button on every screen that has something to ask about; a tap asks it, and a two-finger tap opens nothing', async () => {
    await chooses('floating');
    const ask = vi.fn();
    const user = userEvent.setup();
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={ask} />
      </Phone>,
    );
    const button = await screen.findByRole('button', { name: 'Ask the tutor about what is on screen' });
    twoFingerTap();
    expect(ask).not.toHaveBeenCalled();
    await user.click(button);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('is not drawn where nothing is registered', async () => {
    await chooses('floating');
    render(
      <Phone licence="licensed">
        <TutorDoor />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
  });

  it('sits at the Hand side: left puts it on the left, right on the right', async () => {
    await chooses('floating', 'left');
    const { unmount } = render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    const left = await screen.findByRole('button', { name: 'Ask the tutor about what is on screen' });
    expect(left.getAttribute('data-hand')).toBe('left');
    unmount();
    cleanup();
    await setHand('right');
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ask the tutor about what is on screen' }).getAttribute('data-hand')).toBe('right'));
  });

  it('is not drawn at all on a phone with no licence, and a licence lost takes it away', async () => {
    await chooses('floating');
    const { rerender } = render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen ask={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('button', { name: 'Ask the tutor about what is on screen' });
    rerender(
      <Phone licence="not-licensed">
        <TutorDoor />
        <Screen ask={undefined} />
      </Phone>,
    );
    await waitFor(() => expect(document.querySelector('[data-floating-tutor]')).toBeNull());
  });

  it('draws FloatingTutor over an open sheet (it is not hidden by one)', async () => {
    await chooses('floating');
    render(
      <Phone licence="licensed">
        <FloatingTutor />
        <Screen ask={() => undefined} />
        <div role="dialog" aria-modal="true" aria-label="A sheet" />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: 'Ask the tutor about what is on screen' })).toBeTruthy();
  });
});

describe('the word sheet', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const word = chapter.verses.find((v) => v.n === 1)!.g[0];

  it('opens the tutor about its word on a two-finger tap, as its Ask the tutor does', async () => {
    const asked: WordHelp[] = [];
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} onHelp={(h) => asked.push(h)} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Word' });
    await waitFor(() => {
      twoFingerTap();
      expect(asked.length).toBeGreaterThan(0);
    });
    expect(asked[0]).toMatchObject({ kind: 'word', form: word.t, lemma: word.l, verse: 1 });
    expect(asked[0].parse).toBeTruthy();
  });

  it('opens nothing on a two-finger tap with no licence', async () => {
    const asked: WordHelp[] = [];
    render(
      <Phone licence="not-licensed">
        <TutorDoor />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} onHelp={(h) => asked.push(h)} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Word' });
    await new Promise((r) => setTimeout(r, 50));
    twoFingerTap();
    expect(asked).toEqual([]);
  });

  it('is asked by the floating ? when that is the door', async () => {
    await chooses('floating');
    const asked: WordHelp[] = [];
    const user = userEvent.setup();
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} onHelp={(h) => asked.push(h)} />
      </Phone>,
    );
    await user.click(await screen.findByRole('button', { name: 'Ask the tutor about what is on screen' }));
    expect(asked[0]).toMatchObject({ kind: 'word', lemma: word.l });
  });
});

describe('the lesson (idea) sheet', () => {
  it('opens the tutor about its lesson on a two-finger tap, as its Ask the tutor does', async () => {
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <IdeaSheet idea={ideaOf('noun')} onClose={() => undefined} onWord={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Idea' });
    await waitFor(() => {
      twoFingerTap();
      expect(screen.queryByRole('dialog', { name: /Ask the tutor: / })).not.toBeNull();
    });
  });

  it('opens nothing on a two-finger tap with no licence', async () => {
    render(
      <Phone licence="not-licensed">
        <TutorDoor />
        <IdeaSheet idea={ideaOf('noun')} onClose={() => undefined} onWord={() => undefined} />
      </Phone>,
    );
    await screen.findByRole('dialog', { name: 'Idea' });
    await new Promise((r) => setTimeout(r, 50));
    twoFingerTap();
    expect(screen.queryByRole('dialog', { name: /Ask the tutor: / })).toBeNull();
  });
});

describe('Settings with no licence', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  });

  it('does not draw the Tutor door or the Hand row, greyed or not; the AI rows beside them are still greyed with Needs a licence', async () => {
    window.location.hash = '#/settings';
    render(
      <Phone licence="not-licensed">
        <SettingsScreen />
      </Phone>,
    );
    await showSettingsGroup('tutor');
    // another AI row of the page is there, off, as ever
    await waitFor(() => expect(screen.getAllByText('Needs a licence').length).toBeGreaterThan(0));
    expect(screen.queryByRole('group', { name: 'Tutor door' })).toBeNull();
    expect(screen.queryByText('Tutor door')).toBeNull();
    await showSettingsGroup('reading');
    // the page has drawn its rows (Immersive reader is a row of Reading)
    await screen.findByRole('group', { name: 'Immersive reader' });
    expect(screen.queryByRole('group', { name: 'Hand' })).toBeNull();
    expect(screen.queryByText('Hand')).toBeNull();
  });

  it('draws them on a licensed phone', async () => {
    window.location.hash = '#/settings';
    render(
      <Phone licence="licensed">
        <SettingsScreen />
      </Phone>,
    );
    await showSettingsGroup('tutor');
    expect(await screen.findByRole('group', { name: 'Tutor door' })).toBeTruthy();
    await showSettingsGroup('reading');
    expect(await screen.findByRole('group', { name: 'Hand' })).toBeTruthy();
  });

  it('does not find them by searching either', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/settings';
    render(
      <Phone licence="not-licensed">
        <SettingsScreen />
      </Phone>,
    );
    await user.type(await screen.findByRole('searchbox'), 'Tutor door');
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByRole('group', { name: 'Tutor door' })).toBeNull();
  });
});
