// mw-fnvjof.17.50: Settings > Learning > Grammar approach lists the Hebrew lessons, and a tap on one draws IdeaSheetWithWord with a Hebrew ladder id (he-alphabet).
// It looked the idea up with the Greek-only ideaOf and threw "Unknown grammar idea", so the whole app showed its error screen. It opens either ladder's ideas.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IdeaSheetWithWord } from '../../src/IdeaSheetWithWord';
import { LADDER } from '../../src/data/grammar/ladder';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';

afterEach(cleanup);

describe('IdeaSheetWithWord opens an idea of either ladder', () => {
  it('the first Hebrew lesson, The Hebrew alphabet', async () => {
    render(<IdeaSheetWithWord ideaId="he-alphabet" onClose={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'The Hebrew alphabet' })).toBeTruthy();
  });

  it.each([
    ['Greek', LADDER.map((i) => i.id)],
    ['Hebrew', HEBREW_LADDER.map((i) => i.id)],
  ])('every idea of the %s ladder draws without throwing', (_, ids) => {
    for (const id of ids) {
      expect(() => render(<IdeaSheetWithWord ideaId={id} onClose={() => {}} />), id).not.toThrow();
      cleanup();
    }
  });
});

describe('no screen a Hebrew learner reaches looks an idea up on the Greek ladder alone', () => {
  it.each(['src/IdeaSheetWithWord.tsx', 'src/settings/controls/approach.tsx', 'src/tutor/drillTalk.ts', 'src/data/repositories/reviews.ts'])('%s imports ideaOfAny, not the Greek-only ideaOf', async (file) => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/import \{[^}]*\bideaOf\b[^}]*\} from '[./]*\/?(?:data\/)?(?:grammar\/)?ladder'/);
  });
});
