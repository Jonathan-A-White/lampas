// docs/demo-library-at-scale.md (mw-rfjjzd.21): the Governor's phone steps for the library at scale (docs/design/library-at-scale.md 14 S13). The doc has the six HOW TO CHECK IT steps, each with the labels
// the screens draw, and every label it names is found in the source of the screen that draws it, so a screen reworded without the doc fails here.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/demo-library-at-scale.md', 'utf8');
const source = (file: string): string => readFileSync(file, 'utf8');

function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  expect(match, `a "## ${name}" section`).not.toBeNull();
  return match ? match[1] : '';
}

/** The six steps, each with the labels it names in bold and where the screen draws each (a piece of the source that holds it). */
const STEPS: { step: number; labels: [label: string, file: string, drawn?: string][] }[] = [
  { step: 1, labels: [['Save as Spreadsheet', 'src/library/ImportLibrary.tsx']] },
  {
    step: 2,
    labels: [
      ['Study resources', 'src/settings/rows.ts'],
      ['Logos', 'src/resources/logos.ts'],
      ['Your Logos library', 'src/tutor/screen.ts'],
      ['Import', 'src/library/LibraryScreen.tsx'],
      ['Choose your Logos list', 'src/library/ImportLibrary.tsx'],
      ['books read from your Logos list', 'src/library/ImportLibrary.tsx', 'read from your Logos list.'],
      ['open from Lampas', 'src/library/ImportLibrary.tsx'],
      ['Lampas cannot use yet', 'src/library/ImportLibrary.tsx'],
      ['What they are ›', 'src/library/ImportLibrary.tsx'],
      ['Turn on N books', 'src/library/ImportLibrary.tsx', 'Turn on ${count('],
    ],
  },
  {
    step: 3,
    labels: [
      ['Turn on N books', 'src/library/ImportLibrary.tsx', 'Turn on ${count('],
      ['Lexicons', 'src/library/kinds.ts'],
      ['Grammars', 'src/library/kinds.ts'],
      ['Greek texts', 'src/library/kinds.ts'],
      ['Interlinears', 'src/library/kinds.ts'],
      ['Commentaries', 'src/library/kinds.ts'],
      ['Bibles', 'src/library/kinds.ts'],
      ['Devotionals', 'src/library/kinds.ts'],
    ],
  },
  {
    step: 4,
    labels: [
      ['Study', 'src/WordSheet.tsx'],
      ['Bible Word Study', 'src/resources/logos.ts'],
      ['All N lexicons ›', 'src/WordSheet.tsx', 'lexicons ›'],
      ['Search lexicons', 'src/library/AllLexiconsSheet.tsx'],
    ],
  },
  {
    step: 5,
    labels: [
      ['In another book…', 'src/library/InLogosDoors.tsx'],
      ['Commentaries on Romans', 'src/library/inLogos.ts', 'Commentaries on ${book}'],
      ['Greek texts', 'src/library/inLogos.ts'],
      ['Interlinears', 'src/library/inLogos.ts'],
    ],
  },
  {
    step: 6,
    labels: [
      ['Ask for a book', 'src/library/LibraryScreen.tsx'],
      ['Search your other books', 'src/library/AskForBook.tsx'],
      ['Send', 'src/library/AskForBook.tsx'],
      ['Sent: the factory has it', 'src/AskApproachSheet.tsx'],
      ['Your requests', 'src/settings/rows.ts'],
      ['Account', 'src/settings/rows.ts'],
      ['Filed', 'node_modules/pwa-kit/packages/requests/dist/status.js'],
    ],
  },
];

describe('docs/demo-library-at-scale.md', () => {
  const how = section('HOW TO CHECK IT, for the Governor');

  it('has the six numbered steps and no seventh', () => {
    for (let n = 1; n <= 6; n++) expect(how, `step ${n}`).toMatch(new RegExp(`^${n}\\. `, 'm'));
    expect(how).not.toMatch(/^7\. /m);
  });

  it.each(STEPS)('step $step names its labels in bold, as the screens draw them', ({ step, labels }) => {
    const text = how.split(/^(?=\d+\. )/m).find((part) => part.startsWith(`${step}. `)) ?? '';
    for (const [label, file, drawn] of labels) {
      expect(text, `step ${step}: **${label}**`).toContain(`**${label}**`);
      expect(source(file), `${file} draws "${drawn ?? label}"`).toContain(drawn ?? label);
    }
  });

  it('says what right looks like, and ends with what the Governor says', () => {
    expect(how).toContain('Right looks like');
    expect(doc).toContain('Looks good');
  });
});
