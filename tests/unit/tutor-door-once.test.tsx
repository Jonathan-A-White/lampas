// The tutor door is drawn once (mw-5r3p30.935, mw-5r3p30.882). His screenshots: the older round Ask the tutor button (AskTutorButton) was drawn beside the floating ?. That button is gone: the one mount of the
// floating ? is FloatingTutor (src/AskTutor.tsx), drawn by the app shell (src/App.tsx) and nowhere else; no screen or sheet draws one of its own, and nothing is marked data-ask-tutor.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every .ts and .tsx file under src/ with its text. */
function sources(dir = 'src'): Array<{ path: string; text: string }> {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [{ path, text: readFileSync(path, 'utf8') }] : [];
  });
}

describe('the mount', () => {
  it('is one component in one place: only src/App.tsx draws FloatingTutor, and no file draws the older round button', () => {
    const files = sources();
    const drawing = (tag: string) => files.filter((f) => new RegExp(`<${tag}\\s*/>`).test(f.text)).map((f) => f.path);
    expect(drawing('FloatingTutor')).toEqual([join('src', 'App.tsx')]);
    // no other file marks a button as the floating ?
    expect(files.filter((f) => f.text.includes('data-floating-tutor')).map((f) => f.path)).toEqual([join('src', 'AskTutor.tsx')]);
    // the round button of each screen (mw-5r3p30.882) is gone
    expect(files.filter((f) => f.text.includes('data-ask-tutor') || f.text.includes('AskTutorButton')).map((f) => f.path)).toEqual([]);
  });
});
