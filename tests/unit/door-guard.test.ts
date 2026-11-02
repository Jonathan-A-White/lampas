// tests/unit/door-guard.test.ts — the guard of mw-5r3p30.955 (the third sighting of one class: a fixed layer drawn over the screen it opens from, mw-t49ebj.2, mw-5r3p30.949, mw-5r3p30.953). The Talk sheet is
// z-10, so over a full-screen layer that registers nothing with the tutor door (src/tutor/door.ts) a tap on the floating ? opens the tutor UNDER the layer and, to him, does nothing. Every component of src/ that
// draws a fixed full-screen layer (`fixed` and `inset-0`) must choose: useNoDoor() (the ? is not drawn), useDoorTarget / registerDoorTarget (a target of its own) or a DialogAskTutor / LessonTalk drawn inside it (a Talk
// in front); or it is on ALLOWED with a reason. A new overlay is one more hook, never a new mechanism (tests/e2e/tutor-door-overlays.spec.ts and the OVERLAYS table of tutor-door.spec.ts run them on the built app).
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { layersIn } from '../support/door-guard';

/** Files that draw a layer and register nothing themselves, each with the reason. 'mw-5r3p30.956' is the sweep of the z-30, z-10 and z-50 layers, which follows this story. */
const ALLOWED: Record<string, string> = {
  'AskApproachSheet.tsx': 'mw-5r3p30.956',
  'Conversations.tsx': 'mw-5r3p30.956',
  'ReadingDrill.tsx': 'mw-5r3p30.956',
  'WordsScreen.tsx': 'mw-5r3p30.956',
  'library/AllLexiconsSheet.tsx': 'mw-5r3p30.956',
  'library/AskForBook.tsx': 'mw-5r3p30.956',
  'library/InLogosChooser.tsx': 'mw-5r3p30.956',
  'maps/MapsFrame.tsx': 'mw-5r3p30.956',
  'plan/ScreenshotRead.tsx': 'mw-5r3p30.956',
  'plan/SendOff.tsx': 'mw-5r3p30.956',
  'plan/StartPlan.tsx': 'mw-5r3p30.956',
  'plan/WhereDidYouGetTo.tsx': 'mw-5r3p30.956',
  'gate/MyDevices.tsx': 'mw-5r3p30.956',
  'share/ShareScreen.tsx': 'mw-5r3p30.956',
  'talk/KeyPointsLine.tsx': 'mw-5r3p30.956',
  // not overlays that cover a screen the ? asks about
  'Talk.tsx': 'the Talk sheet itself: it calls useDoorBusy, and the ? is put away while it is open',
  'VerseView.tsx': 'the Verse view (z-5, under the Talk): the Reader registers the verse it shows as the target (Reader.tsx), and the Verse view is a row of OVERLAYS in tutor-door.spec.ts',
  'GrammarSheet.tsx': 'drawn by the word sheet, which registers the target (WordSheet.tsx); a row of OVERLAYS in tutor-door.spec.ts',
  'EnglishWordSheet.tsx': 'drawn by the word sheet, which registers or withholds the target (WordSheet.tsx useNoDoor)',
  'reader/VariantSheet.tsx': 'the brace sheet: the Reader registers the unit as the target (Reader.tsx); a row of OVERLAYS in tutor-door.spec.ts',
  'plan/PlacePicker.tsx': 'mw-5r3p30.956 for its z-30 sheets; its z-40 Set your place sheet calls useNoDoor',
};

const SRC = join(__dirname, '..', '..', 'src');

describe('every fixed full-screen layer chooses what the floating ? does over it (mw-5r3p30.955)', () => {
  const layers = layersIn(SRC);

  it('finds the layers: the search is not empty', () => {
    expect(layers.length).toBeGreaterThan(20);
    expect(layers.map((l) => l.file)).toEqual(expect.arrayContaining(['CheckSheet.tsx', 'TryItSheet.tsx', 'LetterDrillScreen.tsx', 'handwriting/WriteItScreen.tsx', 'memorize/MemorizeControl.tsx', 'markdown/ReferenceCard.tsx', 'script/HebrewGuide.tsx']));
  });

  it('a layer that registers nothing is on the allowlist, with a reason', () => {
    const unchosen = layers.filter((l) => !l.chooses && !(l.file in ALLOWED)).map((l) => `${l.file} (${l.z})`);
    expect(unchosen, 'draws a fixed full-screen layer and chooses nothing: call useNoDoor() (no ? over it), useDoorTarget, or draw a DialogAskTutor inside it (src/tutor/door.ts); or give it a reason in ALLOWED').toEqual([]);
  });

  it('the allowlist gives every entry a reason and has no stale entry', () => {
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(reason.trim().length, file).toBeGreaterThan(5);
      expect(layers.map((l) => l.file), `${file} no longer draws a layer: take it off ALLOWED`).toContain(file);
    }
  });

  it('a scratch component with a fixed full-screen layer and no choice is found, and one that chooses is not', () => {
    const dir = mkdtempSync(join(tmpdir(), 'door-guard-'));
    try {
      mkdirSync(join(dir, 'x'));
      writeFileSync(join(dir, 'x', 'Scratch.tsx'), 'export const S = () => <div role="dialog" className="fixed inset-0 z-40 bg-surface" />;\n');
      writeFileSync(join(dir, 'x', 'Chosen.tsx'), "export const C = () => { useNoDoor(); return <div className=\"fixed inset-0 z-40\" />; };\n");
      const found = layersIn(dir);
      expect(found).toEqual([
        { file: 'x/Chosen.tsx', z: 'z-40', chooses: true },
        { file: 'x/Scratch.tsx', z: 'z-40', chooses: false },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
