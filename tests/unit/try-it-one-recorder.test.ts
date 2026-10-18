// The Try it step records with the one recorder Read it aloud uses (mw-5r3p30.363): src/audio/recorder.ts is the only place in src/ that opens the microphone
// or builds a MediaRecorder, and the Try it step reaches it through the same seam (recorderSeam) the reading check does.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tracked = execSync('git ls-files src', { encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.(ts|tsx)$/.test(file));

describe('one recorder', () => {
  it('is the only code in src/ that opens the microphone or builds a MediaRecorder', () => {
    const makers = tracked.filter((file) => /getUserMedia|new\s+MediaRecorder|class\s+\w*Recorder\b/.test(readFileSync(file, 'utf8')));
    expect(makers).toEqual(['src/audio/recorder.ts']);
  });

  it('is what the reading check and the Try it step both record with', () => {
    for (const file of ['src/useReadChecks.ts', 'src/hardSounds/useTry.ts']) {
      expect(readFileSync(file, 'utf8'), file).toMatch(/recorderSeam\.make\(/);
    }
  });
});
