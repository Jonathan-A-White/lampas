// There is ONE feedback sender (src/services/feedback.ts): the tutor's 'Send this to the makers', Ask for another approach and Ask for more (their commands, src/services/formCommands.ts) all send
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
  it('is used by the tutor (src/talk/makers.ts sendToMakers, which the offer in src/talk/offers.ts calls: mw-5r3p30.760, .844) and by the ask-for-approach and ask-for-more commands (src/services/formCommands.ts)', () => {
    for (const file of ['src/talk/makers.ts', 'src/services/formCommands.ts']) {
      expect(text(file), file).toMatch(/import \{[^}]*\bsubmitFeedback\b[^}]*\} from '\.{1,2}\/(services\/)?feedback'/);
    }
    expect(text('src/talk/offers.ts')).toMatch(/\bsendToMakers\b/);
    expect(text('src/Talk.tsx')).toMatch(/\bsendMakersOffer\b/);
  });

  it('is called by no sheet or screen: submitFeedback( is in the commands, the book requests, feedback.ts and the tutor-ask path (mw-o7cts8.3)', () => {
    const calling = sources('src').filter((f) => /\bsubmitFeedback\(/.test(text(f)));
    expect(calling.sort()).toEqual(['src/services/bookRequests.ts', 'src/services/feedback.ts', 'src/services/formCommands.ts', 'src/talk/makers.ts']);
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
