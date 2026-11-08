// tests/unit/sheet-doors.test.tsx — the floating ? over the sheets that used to hide it (mw-5r3p30.1122; his words, Postern general 2026-11-06: "the two finger tap should bring and remove tutor the question mark from every
// screen ... and then obviously it should get context right from that screen"). Sermons, Maps (and a map), the Hebrew guide, All lexicons, the In Logos chooser, Ask for a book, Memorize's language sheet and the chapter
// picker each draw a Talk INSIDE their own layer (src/tutor/sheetTalk.ts, a DialogAskTutor), so a tap on the ? opens the tutor in front of the sheet, and the tutor is told what the sheet is about.
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingTutor } from '../../src/AskTutor';
import { ChapterPicker } from '../../src/ChapterPicker';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { ideaOf } from '../../src/data/grammar/ladder';
import { WriteItScreen } from '../../src/handwriting/WriteItScreen';
import { PlacePicker } from '../../src/plan/PlacePicker';
import { ScreenshotRead } from '../../src/plan/ScreenshotRead';
import { SendOff } from '../../src/plan/SendOff';
import { StartPlan } from '../../src/plan/StartPlan';
import { AUDIO_BIBLES } from '../../src/resources/audioBible';
import { ShareSheet } from '../../src/ui/ShareSheet';
import { AllLexiconsSheet } from '../../src/library/AllLexiconsSheet';
import { AskForBook } from '../../src/library/AskForBook';
import { InLogosChooser } from '../../src/library/InLogosChooser';
import { MapsSheet } from '../../src/maps/MapsSheet';
import { MemorizeControl } from '../../src/memorize/MemorizeControl';
import { memorizeVerse } from '../../src/memorize/commands';
import { HebrewGuide } from '../../src/script/HebrewGuide';
import { SermonsSheet } from '../../src/sermons/SermonsSheet';
import { closeSermons } from '../../src/sermons/openSermons';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { composerIn, messageBox } from '../support/composer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { forgetTestMaps, registerTestMaps } from '../support/test-maps';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';
import { within } from '@testing-library/react';

const PHONE_KEY = '00'.repeat(31) + '02';
const FLOATING = 'Ask the tutor about what is on screen';
const user = userEvent.setup();
let fake: FakePostern;

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  setCurrentLicence('licensed');
  db.close();
});

afterEach(() => {
  cleanup();
  closeSermons();
  forgetTestMaps();
  forgetTestSermons();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Here is what I know.', words: [] } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : Promise.resolve(new Response('{}', { status: 404 })),
  );
  setCurrentLicence('licensed');
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.verseLists.clear()]);
});

/** A licensed phone, as LicenceProvider tells the app (and the mill client). */
function Phone({ children }: { children: ReactNode }) {
  setCurrentLicence('licensed');
  const value: LicenceDetail = { licence: 'licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}

const talks = () => fake.received.filter((g) => g.grist.kind === 'bible-talk');

interface Case {
  /** the sheet's dialog, by its accessible name */
  dialog: string | RegExp;
  /** the name the tutor hears the screen by, and the facts it must be told */
  screen: string;
  facts: { label: string; value: string | RegExp }[];
  sheet: () => ReactElement;
  /** what the case needs before it is drawn */
  before?: () => void | Promise<void>;
  /** what the sheet needs after it is drawn, before the ? is tapped */
  after?: () => Promise<void>;
}

const LEXICONS = [
  { id: 'bdag', name: 'BDAG Greek-English Lexicon', pinned: true, link: { label: 'BDAG', tile: 'BDAG', url: 'https://lexicon.test/bdag' } },
  { id: 'lsj', name: 'Liddell-Scott-Jones', pinned: false, link: { label: 'LSJ', tile: 'LSJ', url: 'https://lexicon.test/lsj' } },
];

const CASES: Record<string, Case> = {
  Sermons: {
    dialog: 'Sermons for Romans 5:8',
    screen: 'Sermons',
    facts: [
      { label: 'Passage', value: 'Romans 5:8' },
      { label: 'Sermons listed', value: /Love Commended/ },
    ],
    before: () => registerTestSermons({ second: true }),
    sheet: () => <SermonsSheet place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} onClose={() => undefined} />,
  },
  Maps: {
    dialog: 'Maps for Genesis 10:19',
    screen: 'Maps',
    facts: [
      { label: 'Passage', value: 'Genesis 10:19' },
      { label: 'Maps listed', value: /The Tower of Babel/ },
    ],
    before: () => registerTestMaps(),
    sheet: () => <MapsSheet mapRef={{ book: 'gen', chapter: 10, from: 19, to: 19 }} onClose={() => undefined} />,
  },
  'a map of the Maps sheet': {
    dialog: 'The Tower of Babel',
    screen: 'Map',
    facts: [
      { label: 'Map', value: 'The Tower of Babel' },
      { label: 'Passage', value: 'Genesis 10:19' },
      { label: 'Places on the map', value: /Babel/ },
    ],
    before: () => registerTestMaps(),
    sheet: () => <MapsSheet mapRef={{ book: 'gen', chapter: 10, from: 19, to: 19 }} onClose={() => undefined} openCard="TowerOfBabel" />,
  },
  'the Hebrew guide': {
    dialog: 'How to say it',
    screen: 'How to say it',
    facts: [{ label: 'Hebrew word', value: 'שָׁלוֹם' }],
    sheet: () => <HebrewGuide word="שָׁלוֹם" noVoice={false} onClose={() => undefined} />,
  },
  'All lexicons': {
    dialog: 'All lexicons',
    screen: 'All lexicons',
    facts: [
      { label: 'Word', value: 'λόγος' },
      { label: 'Lexicons', value: /BDAG Greek-English Lexicon/ },
    ],
    sheet: () => <AllLexiconsSheet word="λόγος" entries={LEXICONS} onClose={() => undefined} onMissing={() => undefined} onManage={() => undefined} />,
  },
  'the In Logos chooser': {
    dialog: 'Romans 8:31 in Logos',
    screen: 'In Logos',
    facts: [{ label: 'Place', value: 'Romans 8:31' }],
    sheet: () => <InLogosChooser place={{ book: 'rom', chapter: 8, verse: 31 }} name="Romans 8:31" onClose={() => undefined} entries={[]} />,
  },
  'Ask for a book': {
    dialog: 'Ask for a book',
    screen: 'Ask for a book',
    facts: [{ label: 'Kind of book', value: 'Grammar' }],
    sheet: () => <AskForBook kind="grammar" onClose={() => undefined} />,
  },
  'the language sheet of Memorize': {
    dialog: 'Memorize Rom 8:28',
    screen: 'Memorize',
    facts: [
      { label: 'Verse', value: 'Rom 8:28' },
      { label: 'Memorized in', value: 'English' },
    ],
    before: async () => {
      await db.settings.put({ key: 'greekInterest', value: '5' });
      await memorizeVerse({ ref: 'Rom.8.28', langs: ['en'] });
    },
    sheet: () => <MemorizeControl canonical="Rom.8.28" />,
    after: async () => void (await user.click(await screen.findByRole('button', { name: 'Memorizing · English' }))),
  },
  'the chapter picker': {
    dialog: 'Choose a chapter',
    screen: 'Choose a chapter',
    facts: [{ label: 'Reading now', value: 'Romans 8' }],
    sheet: () => <ChapterPicker current={{ book: 'rom', chapter: 8, title: 'Romans 8' }} onClose={() => undefined} />,
  },
};

// The plan sheets, Write it and the share sheet (mw-5r3p30.1123): the same pattern, a Talk inside the layer that tells the tutor what the sheet is about.
const WHOLE_BIBLE = { code: 'lev', chapter: 3 };

CASES['Start a listening plan'] = {
  dialog: 'Start a listening plan',
  screen: 'Start a listening plan',
  facts: [{ label: 'Plans', value: /The whole Bible/ }],
  sheet: () => <StartPlan onClose={() => undefined} />,
};
CASES['the send-off to Audible'] = {
  dialog: 'Off to Audible: Leviticus 3',
  screen: 'Off to Audible',
  facts: [{ label: 'Chapter', value: 'Leviticus 3' }],
  sheet: () => <SendOff send={{ tap: () => undefined, offer: () => undefined, offered: { audio: AUDIO_BIBLES[0], ...WHOLE_BIBLE }, go: async () => undefined, close: () => undefined }} />,
};
CASES['Where are you in the plan?'] = {
  dialog: 'Where are you in the plan?',
  screen: 'Where are you in the plan?',
  facts: [{ label: 'Plan is at', value: 'Leviticus 3' }],
  sheet: () => <PlacePicker next={WHOLE_BIBLE} onMove={() => undefined} onClose={() => undefined} />,
};
CASES['Your screenshot'] = {
  dialog: 'Your screenshot',
  screen: 'Your screenshot',
  facts: [{ label: 'Set off from', value: 'Leviticus 3' }],
  sheet: () => <ScreenshotRead picture={new File(['x'], 'audible.png', { type: 'image/png' })} setOffFrom={WHOLE_BIBLE} onAccept={() => undefined} onClose={() => undefined} />,
};
CASES['Write it'] = {
  dialog: 'Write it',
  screen: 'Write it',
  facts: [{ label: 'Lesson', value: 'Gamma' }],
  sheet: () => <WriteItScreen idea={ideaOf('letter-gamma')} onClose={() => undefined} />,
};
CASES['the share sheet'] = {
  dialog: 'Share Romans 8:28',
  screen: 'Share',
  facts: [
    { label: 'Sharing', value: 'Romans 8:28' },
    { label: 'Pieces', value: /Just the link/ },
  ],
  sheet: () => (
    <ShareSheet
      title="Romans 8:28"
      pieces={[
        { id: 'whole', label: 'The whole', shown: 'x', data: { text: 'x' }, hand: 'x' },
        { id: 'link', label: 'Just the link', shown: 'y', data: { url: 'y' }, hand: 'y' },
      ]}
      onPick={() => undefined}
      onClose={() => undefined}
    />
  ),
};

describe('the floating ? over a sheet that stands over the Talk sheet opens the tutor in front of it, about the sheet', () => {
  for (const [name, c] of Object.entries(CASES)) {
    it(`${name}: the ? opens a Talk inside the sheet's layer, and the tutor is told ${c.screen}`, async () => {
      await c.before?.();
      render(
        <Phone>
          <FloatingTutor />
          {c.sheet()}
        </Phone>,
      );
      await c.after?.();
      const sheet = await screen.findByRole('dialog', { name: c.dialog });
      await user.click(await screen.findByRole('button', { name: FLOATING }));
      const talk = await screen.findByRole('dialog', { name: `Ask the tutor: ${c.screen}` });
      // the Talk is a child of the sheet's own layer: the layer is a stacking context, so it stands in front of the sheet (tests/e2e/tutor-door-overlays.spec.ts proves it drawn)
      expect(sheet.parentElement?.contains(talk)).toBe(true);
      await user.click(await messageBox(user, talk));
      await user.paste('What is this?');
      await user.click(within(composerIn(talk)).getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(talks()).toHaveLength(1));
      const sent = (talks()[0].input as { screen?: { name: string; facts: { label: string; value: string }[] } }).screen;
      expect(sent?.name).toBe(c.screen);
      for (const fact of c.facts) {
        const found = sent?.facts.find((f) => f.label === fact.label);
        expect(found, `a fact labelled ${fact.label}`).toBeDefined();
        if (typeof fact.value === 'string') expect(found?.value).toBe(fact.value);
        else expect(found?.value).toMatch(fact.value);
      }
    });
  }

  it('a phone with no licence draws no ? over a sheet', async () => {
    setCurrentLicence('not-licensed');
    const value: LicenceDetail = { licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined, siteIssued: false, removed: () => undefined };
    render(
      <LicenceContext.Provider value={value}>
        <FloatingTutor />
        <AllLexiconsSheet word="λόγος" entries={LEXICONS} onClose={() => undefined} onMissing={() => undefined} onManage={() => undefined} />
      </LicenceContext.Provider>,
    );
    await screen.findByRole('dialog', { name: 'All lexicons' });
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-floating-tutor]')).toBeNull();
  });
});
