// tests/unit/talk-sheet-composer.test.ts — the Talk sheet's input is voice-kit's Composer, as in Ask the tutor and Postern, and no screen of Lampas keeps a hold of its own
// (mw-06ggew.15): every talk control is the kit's Composer, or the kit's TalkBar / HoldToTalkBar through src/talk/Bars.tsx over the one useBarHold behind them.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string => readFileSync(file, 'utf8');
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

describe('the Talk sheet and the holds of Lampas', () => {
  it("the Talk sheet draws voice-kit's Composer, and its own composer layout is gone", () => {
    const sheet = read('src/Talk.tsx');
    expect(sheet).toMatch(/import \{[^}]*\bComposer\b[^}]*\} from 'voice-kit\/composer'/);
    expect(sheet).toMatch(/<Composer\b/);
    for (const gone of ['HoldToTalk', 'data-composer-row', 'PictureControls', 'usePictureBox']) expect(sheet, gone).not.toContain(gone);
  });

  it('the hold of the sheet is the kit’s, paused for what is playing aloud (the transcriber of every bar)', () => {
    expect(read('src/Talk.tsx')).toContain("transcriber={askTranscriber}");
    expect(read('src/Talk.tsx')).toMatch(/onHoldStart=/);
    expect(read('src/Talk.tsx')).toMatch(/onHoldEnd=/);
  });

  it('only the kit’s hold listens: no file of src/ runs a recogniser or a hold of its own', () => {
    const own = sources('src').filter((file) => /\buseHold\b|\bstartListening\b|new (webkit)?SpeechRecognition/.test(read(file)));
    expect(own).toEqual([]);
  });
});
