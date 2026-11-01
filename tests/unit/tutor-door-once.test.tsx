// The tutor door is drawn once (mw-5r3p30.935). His screenshots: with Tutor door on Floating ? the older round Ask the tutor button (AskTutorButton) was drawn beside the floating ?.
// The one mount of the floating ? is TutorDoor (src/AskTutor.tsx), drawn by the app shell (src/App.tsx) and nowhere else; no screen or sheet draws one of its own, and the older round
// button gives way to it where it is the Tutor door.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ASK_TUTOR_LABEL, AskTutorButton, FloatingTutor } from '../../src/AskTutor';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail, type LicenceState } from '../../src/gate/licenceContext';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { setHand } from '../../src/settings/hand';
import { setTutorDoor } from '../../src/settings/definitions/tutorDoor';
import { registerDoorTarget } from '../../src/tutor/door';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  setCurrentLicence('licensed');
  db.close();
});
beforeEach(async () => {
  cleanup();
  clearBus();
  setCurrentLicence('licensed');
  await db.open();
  await db.settings.clear();
});
afterEach(() => setCurrentLicence('licensed'));

function Phone({ licence, children }: { licence: LicenceState; children: ReactNode }) {
  setCurrentLicence(licence);
  const value: LicenceDetail = { licence, locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}

/** The older round button and the floating ?, drawn as a screen and the shell draw them. */
function Both() {
  return (
    <Phone licence="licensed">
      <AskTutorButton onClick={() => undefined} />
      <FloatingTutor />
    </Phone>
  );
}

describe('the older round button beside the floating ?', () => {
  it('is not drawn where the Tutor door is Floating ?: the floating ? is the one button', async () => {
    await setTutorDoor('floating');
    await setHand('right');
    const off = registerDoorTarget(() => undefined);
    render(<Both />);
    await waitFor(() => expect(document.querySelectorAll('[data-floating-tutor]')).toHaveLength(1));
    expect(screen.queryByRole('button', { name: ASK_TUTOR_LABEL })).toBeNull();
    expect(document.querySelectorAll('[data-ask-tutor], [data-floating-tutor]')).toHaveLength(1);
    off();
  });

  it('is the one button where the Tutor door is the two-finger tap', async () => {
    await setTutorDoor('twoFinger');
    await setHand('right');
    const off = registerDoorTarget(() => undefined);
    render(<Both />);
    await screen.findByRole('button', { name: ASK_TUTOR_LABEL });
    expect(document.querySelectorAll('[data-floating-tutor]')).toHaveLength(0);
    off();
  });
});

/** Every .ts and .tsx file under src/ with its text. */
function sources(dir = 'src'): Array<{ path: string; text: string }> {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [{ path, text: readFileSync(path, 'utf8') }] : [];
  });
}

describe('the mount', () => {
  it('is one component in one place: TutorDoor (src/AskTutor.tsx) draws FloatingTutor, and only src/App.tsx draws TutorDoor', () => {
    const files = sources();
    const drawing = (tag: string) => files.filter((f) => new RegExp(`<${tag}\\s*/>`).test(f.text)).map((f) => f.path);
    expect(drawing('FloatingTutor')).toEqual([join('src', 'AskTutor.tsx')]);
    expect(drawing('TutorDoor')).toEqual([join('src', 'App.tsx')]);
    // no other file marks a button as the floating ?
    expect(files.filter((f) => f.text.includes('data-floating-tutor')).map((f) => f.path)).toEqual([join('src', 'AskTutor.tsx')]);
  });
});
