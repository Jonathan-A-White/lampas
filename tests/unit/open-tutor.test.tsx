// The features' openTutor() (features/steps/open-tutor.ts, mw-5r3p30.881): a two-finger tap on the document opens the tutor about what the screen registered, waits for its sheet, and leaves the next click a click
// (the app drops a click within 600 ms of the tap that opened the tutor, src/tutor/door.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorDoor } from '../../src/AskTutor';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail, type LicenceState } from '../../src/gate/licenceContext';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { setTutorDoor } from '../../src/settings/definitions/tutorDoor';
import { useDoorTarget } from '../../src/tutor/door';
import { openTutor } from '../../features/steps/open-tutor';

afterAll(() => {
  cleanup();
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

/** A screen whose target opens a sheet with a button that counts clicks. */
function Screen({ onClicked }: { onClicked: () => void }) {
  const [open, setOpen] = useState(false);
  useDoorTarget(() => setOpen(true));
  return open ? (
    <div role="dialog" aria-label="Talk about Romans 8">
      <button type="button" onClick={onClicked}>
        Send
      </button>
    </div>
  ) : (
    <p>a screen</p>
  );
}

describe('openTutor() in a step', () => {
  it('opens the sheet the screen registered, and the click right after it lands', async () => {
    const user = userEvent.setup();
    const clicked = vi.fn();
    await setTutorDoor('twoFinger');
    render(
      <Phone licence="licensed">
        <TutorDoor />
        <Screen onClicked={clicked} />
      </Phone>,
    );
    const sheet = await openTutor();
    expect(sheet).toHaveAccessibleName('Talk about Romans 8');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(clicked).toHaveBeenCalledTimes(1);
  });
});
