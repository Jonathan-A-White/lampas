// There is ONE feedback sender (src/services/feedback.ts): the tutor's 'Send this to the makers' and Ask for another approach both send
// through it, and nothing else in the app talks to the feedback grind. This reads the sources, so a second copy fails here.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
const text = (path: string): string => readFileSync(path, 'utf8');

describe('the one feedback sender', () => {
  it('is used by the tutor (Talk.tsx) and by Ask for another approach (AskApproachSheet.tsx)', () => {
    for (const file of ['src/Talk.tsx', 'src/AskApproachSheet.tsx']) {
      expect(text(file), file).toMatch(/import \{[^}]*\bsubmitFeedback\b[^}]*\} from '\.\/services\/feedback'/);
    }
  });

  it('is the only code that sends the feedback kind: no other file asks the grind itself', () => {
    const others = sources('src').filter((f) => f !== 'src/services/feedback.ts' && f !== 'src/services/tutor.ts');
    for (const file of others) {
      const body = text(file);
      expect(body, file).not.toMatch(/sendFeedback|FEEDBACK_KIND|askGrind\(\s*['"]feedback/);
    }
    expect(text('src/services/feedback.ts')).toMatch(/askGrind\(FEEDBACK_KIND/);
  });
});
