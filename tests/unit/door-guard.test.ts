// tests/unit/door-guard.test.ts — the guard of mw-5r3p30.955 (the third sighting of one class: a fixed layer drawn over the screen it opens from, mw-t49ebj.2, mw-5r3p30.949, mw-5r3p30.953). The Talk sheet is
// z-10, so over a full-screen layer that registers nothing with the tutor door (src/tutor/door.ts) a tap on the floating ? opens the tutor UNDER the layer and, to him, does nothing. Every component of src/ that
// draws a fixed full-screen layer (`fixed` and `inset-0`) must choose: useNoDoor() (the ? is not drawn), useDoorTarget / registerDoorTarget (a target of its own) or a DialogAskTutor / LessonTalk drawn inside it (a Talk
// in front); or it is on ALLOWED with a reason. A new overlay is one more hook, never a new mechanism (tests/e2e/tutor-door-overlays.spec.ts and the OVERLAYS table of tutor-door.spec.ts run them on the built app; mw-5r3p30.956 settled the z-30, z-10 and z-50 layers).
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspect, layersIn } from '../support/door-guard';

/** Files that draw a layer and register nothing themselves, each with the reason. Each reason is a row of tests/e2e/tutor-door-overlays.spec.ts, which runs the layer on the built app (mw-5r3p30.956). */
const ALLOWED: Record<string, string> = {
  'ReadingDrill.tsx': 'drawn inside the Verse view (ReadCheck), a z-5 stacking context, so the Talk (z-10) is in front of it and the ? asks about the verse; a row of tutor-door-overlays.spec.ts',
  'AskApproachSheet.tsx': "z-10 in Settings, drawn before the route's Talk (App.tsx AskTutor, z-10), so the Talk is in front of it; a row of tutor-door-overlays.spec.ts",
  'Conversations.tsx': "the z-10 alert of a conversation that cannot be opened, drawn before the route's Talk, so the Talk is in front of it; a row of tutor-door-overlays.spec.ts",
  'WordsScreen.tsx': "the z-10 Drop this word? confirm, drawn before the route's Talk, so the Talk is in front of it; a row of tutor-door-overlays.spec.ts",
  'gate/MyDevices.tsx': 'the remove-a-device confirm on the Licence page, which draws no Talk and registers no target, so no ? is drawn there at all; a row of tutor-door-overlays.spec.ts',
  'share/ShareScreen.tsx': 'the Share to Lampas route draws no Talk and registers no target, so no ? is drawn over it (closed, it goes back to the Reader and its ?); a row of tutor-door-overlays.spec.ts',
  // not overlays that cover a screen the ? asks about
  'Talk.tsx': 'the Talk sheet itself: it calls useDoorBusy, and the ? is put away while it is open',
  'VerseView.tsx': 'the Verse view (z-5, under the Talk): the Reader registers the verse it shows as the target (Reader.tsx), and the Verse view is a row of OVERLAYS in tutor-door.spec.ts',
  'GrammarSheet.tsx': 'drawn by the word sheet, which registers the target (WordSheet.tsx); a row of OVERLAYS in tutor-door.spec.ts',
  'reader/VariantSheet.tsx': 'the brace sheet: the Reader registers the unit as the target (Reader.tsx); a row of OVERLAYS in tutor-door.spec.ts',
};

/** A component of a file that does choose, which draws a layer and calls no hook itself because the component that draws it does (`file#Component`), each with the reason. */
const COVERED: Record<string, string> = {
  'plan/PlacePicker.tsx#Sheet': 'the Where are you? sheet is drawn only by Places, in the same file, which calls useNoDoor() for as long as it is mounted',
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

  // mw-5r3p30.985: Drill it drew its Talk only once it had a result, so on every step of the drill the dialog was up with no target of its own and the ? opened the tutor beneath it. A file that chooses
  // somewhere has not chosen for every state of every layer in it: the component that draws a layer makes the choice, and the Talk it draws is drawn in every state.
  it('a component that draws a layer makes the choice itself, or is on COVERED with a reason', () => {
    const bare = layers.filter((l) => !(l.file in ALLOWED)).flatMap((l) => l.bare.map((name) => `${l.file}#${name}`)).filter((key) => !(key in COVERED));
    expect(bare, 'draws a fixed full-screen layer and calls no useNoDoor / useDoorTarget and draws no DialogAskTutor / LessonTalk: another component of the file choosing is not a choice for it (src/tutor/door.ts)').toEqual([]);
    for (const [key, reason] of Object.entries(COVERED)) {
      expect(reason.trim().length, key).toBeGreaterThan(5);
      expect(layers.flatMap((l) => l.bare.map((name) => `${l.file}#${name}`)), `${key} no longer draws a layer with no choice of its own: take it off COVERED`).toContain(key);
    }
  });

  it('a Talk drawn inside a layer is drawn in every state of it, never under a condition', () => {
    const conditional = layers.filter((l) => l.conditional.length > 0).map((l) => `${l.file}: ${l.conditional.join(' | ')}`);
    expect(conditional, 'a <DialogAskTutor> or <LessonTalk> under `x ? ... : null` or `x && ...` leaves the states where x is false with no target: the ? is drawn and opens the tutor beneath the layer. Draw it always and change what it reports (screen=) with the state').toEqual([]);
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
        { file: 'x/Chosen.tsx', z: 'z-40', chooses: true, bare: [], conditional: [] },
        { file: 'x/Scratch.tsx', z: 'z-40', chooses: false, bare: ['S'], conditional: [] },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a layer whose Talk is drawn only once there is a result is found, as are a layer of another component than the one that chooses and a Talk drawn always', () => {
    const talk = (name: string, body: string) => `export function ${name}() {\n  const result = useResult();\n  return (\n    <div role="dialog" className="fixed inset-0 z-40">\n${body}\n    </div>\n  );\n}\n`;
    expect(inspect(talk('Late', '      {result ? <DialogAskTutor kept="k" screen={s} suggestions={[]} /> : null}')).conditional).toHaveLength(1);
    expect(inspect(talk('Late', '      {result && <LessonTalk screen={s} />}')).conditional).toHaveLength(1);
    expect(inspect(talk('Late', '      {result ? (\n        <DialogAskTutor kept="k" screen={s} suggestions={[]} />\n      ) : null}')).conditional).toHaveLength(1);
    expect(inspect(talk('Always', '      <DialogAskTutor kept="k" screen={result ? a : b} suggestions={result ? c : d} />')).conditional).toEqual([]);
    const other = `function Sheet() {\n  return <div className="fixed inset-0 z-30" />;\n}\nexport function Screen() {\n  useNoDoor();\n  return <Sheet />;\n}\n`;
    expect(inspect(other)).toEqual({ bare: ['Sheet'], conditional: [] });
  });
});
