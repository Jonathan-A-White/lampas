// Every gesture-only action has a control with an accessible name (mw-cwf538.4): docs/accessibility.md 'Gesture-only actions' lists each, and each control it
// names is still in src. tests/e2e/no-gesture-only.spec.ts drives them with no gesture.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/accessibility.md', 'utf8');
const section = doc.split('## Gesture-only actions')[1]?.split('\n## ')[0] ?? '';

/** The controls the section names, the text on the button or its aria-label. */
const CONTROLS = [
  'Put the bars away',
  'Show the bars',
  'Leave immersive reading',
  'Start immersive reading',
  'Next page',
  'Previous page',
  'Hear it',
  'Hear the verse',
  'Done',
];

function sources(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .map((e) => (e.isDirectory() ? sources(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? readFileSync(join(dir, e.name), 'utf8') : ''))
    .join('\n');
}

describe('the gesture-only actions', () => {
  it('docs/accessibility.md has the section, with a row for each gesture of the app', () => {
    expect(section).not.toBe('');
    for (const gesture of ['Tap with two fingers', 'Tap on the outer thirds', 'Swipe left or right: the next or previous chapter', 'Long press on a word', 'Hold a bar', 'Swipe down on a sheet', 'Pinch and drag the grammar ladder graph', 'Double tap']) {
      expect(section, `no row for: ${gesture}`).toContain(gesture);
    }
  });
  it('names each control, and each is still a button in src', () => {
    const src = sources('src');
    for (const name of CONTROLS) {
      expect(section, `${name} is not in the section`).toContain(`\`${name}`);
      expect(src, `${name} is not a control in src`).toContain(name);
    }
  });
  it('the whole path has no buttons for its gestures: the keys on the graph are the way (mw-5r3p30.650)', () => {
    const graph = readFileSync('src/LadderGraph.tsx', 'utf8');
    for (const gone of ['Pan up', 'Pan down', 'Pan left', 'Pan right', 'Zoom in', 'Zoom out']) expect(graph, `${gone} is a button no longer`).not.toContain(gone);
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) expect(graph).toContain(key);
    expect(section).toContain('arrow keys');
  });
  it('src/ReaderControls.tsx draws the Reader\'s four', () => {
    const text = readFileSync('src/ReaderControls.tsx', 'utf8');
    for (const name of ['Put the bars away', 'Show the bars', 'Leave immersive reading', 'Start immersive reading', 'Next page', 'Previous page']) expect(text).toContain(name);
  });
});
