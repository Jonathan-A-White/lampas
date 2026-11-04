// The two-finger tap that takes the ? away and brings it back on every screen (mw-5r3p30.1006; src/tutor/doorHidden.ts holds the rule). The Reader's text keeps its own use of the tap (immersive).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingTutor } from '../../src/AskTutor';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { DOOR_BACK_LINE, resetDoorAway } from '../../src/tutor/doorHidden';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { setHand } from '../../src/settings/hand';
import { useDoorTarget } from '../../src/tutor/door';
import { TWO_FINGERS } from '../support/two-finger';

const FLOATING = 'Ask the tutor about what is on screen';
const TOLD = 'lampas.doorAwayTold';

afterAll(() => {
  cleanup();
  setCurrentLicence('licensed');
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  resetDoorAway();
  window.localStorage.removeItem(TOLD);
  setCurrentLicence('licensed');
  await db.open();
  await db.settings.clear();
  await setHand('right');
});

afterEach(() => resetDoorAway());

function Phone({ children }: { children: ReactNode }) {
  setCurrentLicence('licensed');
  const value: LicenceDetail = { licence: 'licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}

/** A screen of the app: a page with a word and a button on it, and a target for the ?. */
function Screen({ name, onTap }: { name: string; onTap: (what: string) => void }) {
  useDoorTarget(() => undefined);
  return (
    <section aria-label={name}>
      <button type="button" onClick={() => onTap('button')}>
        A button
      </button>
      <span data-word onClick={() => onTap('word')}>
        λόγος
      </span>
      <div data-two-finger data-testid="own">
        its own pinch
      </div>
    </section>
  );
}

function touch(type: 'touchstart' | 'touchend' | 'touchmove', points: ReadonlyArray<{ x: number; y: number }>, target: EventTarget): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: points.map((p) => ({ clientX: p.x, clientY: p.y })) });
  target.dispatchEvent(event);
}
// both events in one act: the tap is timed with the real clock (TAP_MS), so a loaded host must not get a render between the fingers going down and up
const twoFingerTap = (on: EventTarget = document.body): void => {
  act(() => {
    touch('touchstart', TWO_FINGERS, on);
    touch('touchend', [], on);
  });
};
const door = () => document.querySelector('[data-floating-tutor]');
// The ? is in the page before the tap's listener is: FloatingTutor adds it in a passive effect (useDoorTwoFingerTap), which React flushes in a later task once the ? has come from the settings
// store; findByRole can answer in between, and a tap sent then is heard by no one. A loaded host shows it (mw-5r3p30.1038), so every test waits for the ? and then lets the effects run.
async function theDoorIsReady(): Promise<void> {
  await screen.findByRole('button', { name: FLOATING });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// the screens named in the story: Today, Settings, a drill and a word sheet are all a screen that registers a door target; the ? is the app shell's
const SCREENS = ['Today', 'Settings', 'A drill', 'A word sheet'];

describe.each(SCREENS)('on %s', (name) => {
  it('a two-finger tap takes the ? away, a second brings it back, and no word or button is tapped by it', async () => {
    const tapped = vi.fn();
    render(
      <Phone>
        <FloatingTutor />
        <Screen name={name} onTap={tapped} />
      </Phone>,
    );
    await theDoorIsReady();
    const button = screen.getByRole('button', { name: 'A button' });
    twoFingerTap(button);
    await waitFor(() => expect(door()).toBeNull());
    // the click a phone may send after the tap lands on the button: it is dropped
    act(() => button.click());
    expect(tapped).not.toHaveBeenCalled();
    twoFingerTap(screen.getByText('λόγος'));
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
    expect(tapped).not.toHaveBeenCalled();
  });
});

describe('the rule', () => {
  it('keeps the ? away as the screen under it changes, until he brings it back', async () => {
    const { rerender } = render(
      <Phone>
        <FloatingTutor />
        <Screen name="Today" onTap={() => undefined} />
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap();
    await waitFor(() => expect(door()).toBeNull());
    rerender(
      <Phone>
        <FloatingTutor />
        <Screen name="Settings" onTap={() => undefined} />
      </Phone>,
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(door()).toBeNull();
    twoFingerTap();
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });

  it('does not keep it away across a reload: a new start has the ? back', async () => {
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Today" onTap={() => undefined} />
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap();
    await waitFor(() => expect(door()).toBeNull());
    cleanup();
    // a reload forgets module state; the one-time line is remembered on the phone
    resetDoorAway();
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Today" onTap={() => undefined} />
      </Phone>,
    );
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });

  it('leaves a screen with a two-finger use of its own alone (a map, the ladder graph)', async () => {
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Path" onTap={() => undefined} />
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap(screen.getByTestId('own'));
    await new Promise((r) => setTimeout(r, 30));
    expect(door()).not.toBeNull();
  });

  it('leaves the Reader\'s text to the Immersive reader', async () => {
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Reader" onTap={() => undefined} />
        <main data-reader>
          <p>text</p>
        </main>
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap(screen.getByText('text'));
    await new Promise((r) => setTimeout(r, 30));
    expect(door()).not.toBeNull();
  });

  it('says how to bring it back the first time it goes, and not again', async () => {
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Today" onTap={() => undefined} />
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap();
    expect((await screen.findByRole('status')).textContent).toBe(DOOR_BACK_LINE);
    twoFingerTap();
    await screen.findByRole('button', { name: FLOATING });
    expect(document.querySelector('[data-door-away-note]')).toBeNull();
    twoFingerTap();
    await waitFor(() => expect(door()).toBeNull());
    expect(document.querySelector('[data-door-away-note]')).toBeNull();
  });

  it('has a button for no touch that brings it back', async () => {
    render(
      <Phone>
        <FloatingTutor />
        <Screen name="Today" onTap={() => undefined} />
      </Phone>,
    );
    await theDoorIsReady();
    twoFingerTap();
    await waitFor(() => expect(door()).toBeNull());
    // the click guard of the tap (600 ms) is over by the time a keyboard reaches the button
    await new Promise((r) => setTimeout(r, 700));
    act(() => screen.getByRole('button', { name: 'Bring back the tutor button' }).click());
    expect(await screen.findByRole('button', { name: FLOATING })).toBeTruthy();
  });

  it('does nothing on a phone with no licence', async () => {
    const value: LicenceDetail = { licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
    setCurrentLicence('not-licensed');
    const tapped = vi.fn();
    render(
      <LicenceContext.Provider value={value}>
        <FloatingTutor />
        <Screen name="Today" onTap={tapped} />
      </LicenceContext.Provider>,
    );
    twoFingerTap();
    act(() => screen.getByRole('button', { name: 'A button' }).click());
    expect(tapped).toHaveBeenCalled();
  });
});
