// src/review/useStudyPlaces.tsx — where a link of the 'Study this' row (src/review/StudyThis.tsx) or of the Study list (src/review/StudyList.tsx) opens (mw-indx1x6.6, .8): a table as a layer at its cell, an idea's lesson,
// a word's sheet, how to remember a word, or the talk of the misses. One hook for both, so a link opens the same place wherever it is tapped.
import { useState, type ReactNode } from 'react';
import { MissTalk } from '../AskTutor';
import { loadLexicon } from '../data/lexicon';
import { paradigmById } from '../data/paradigms';
import { HeartOfWord } from '../HeartOfWord';
import { IdeaSheetWithWord } from '../IdeaSheetWithWord';
import { findWord, lemmaSheet } from '../nav/links';
import type { ParadigmAddress } from '../nav/route';
import { TableAt } from '../ParadigmsScreen';
import { faceOf } from '../script/greekLang';
import type { ScreenContext, ScreenFact } from '../tutor/screen';
import type { SheetTalk } from '../tutor/sheetTalk';
import { WordParts } from '../WordParts';
import { WordPicture } from '../WordPicture';
import { WordSheet } from '../WordSheet';
import { Layer } from './StudyLayer';
import type { StudyLink } from './studyThis';

type Open =
  | { kind: 'table'; address: ParadigmAddress }
  | { kind: 'lesson'; ideaId: string }
  | { kind: 'word'; sheet: ReturnType<typeof lemmaSheet> }
  | { kind: 'mnemonic'; lemma: string; gloss: string; hebrew: boolean }
  | { kind: 'tutor' };

/** The word sheet of a headword: the lexicon's entry for it, or, for a word the lexicon lacks (one he imported), the word with the meaning he was asked. */
async function sheetOf(link: Extract<StudyLink, { kind: 'word' }>): Promise<ReturnType<typeof lemmaSheet>> {
  const found = await loadLexicon(link.hebrew ? 'hbo' : 'grc').then((lexicon) => findWord(link.lemma, lexicon), () => undefined);
  return lemmaSheet(found ? { lemma: found.lemma, strongs: found.entry.s, gloss: found.entry.g } : { lemma: link.lemma, strongs: link.hebrew ? 'H0' : 'G0', gloss: link.gloss ?? '' });
}

/**
 * What opens a link of the row or of the Study list (src/review/StudyList.tsx): `follow(link)` opens its place over the question, `ask()` the talk of the misses; `places` is what they draw (the layers, the sheets
 * and the talk), to be drawn once, anywhere in the screen. `facts` are what the floating ? is told over a layer besides what the layer shows; `tutor` is the miss or misses the talk is opened on.
 */
export function useStudyPlaces({ screen, back, onParadigm, facts, tutor }: {
  screen: string;
  back: string;
  onParadigm?: (address: ParadigmAddress) => void;
  facts: ScreenFact[];
  tutor: { screen: ScreenContext; first: string };
}): { follow: (link: StudyLink) => void; ask: () => void; places: ReactNode } {
  const [open, setOpen] = useState<Open | null>(null);
  // the talk of these misses alone: a key of its own, so its first turn is always these misses
  const [kept] = useState(() => `screen.miss.${Date.now()}`);
  const close = () => setOpen(null);
  const follow = (link: StudyLink) => {
    if (link.kind === 'paradigm') {
      if (onParadigm) onParadigm(link.address);
      else setOpen({ kind: 'table', address: link.address });
    } else if (link.kind === 'lesson') setOpen({ kind: 'lesson', ideaId: link.ideaId });
    else if (link.kind === 'mnemonic') setOpen({ kind: 'mnemonic', lemma: link.lemma, gloss: link.gloss, hebrew: /[֐-׿]/.test(link.lemma) });
    else void sheetOf(link).then((sheet) => setOpen({ kind: 'word', sheet }));
  };
  const table = open?.kind === 'table' ? paradigmById(open.address.table) : undefined;
  // what the floating ? is told over a layer: the screen he came from, what the layer shows and the miss it was opened from
  const talkOf = (showing: string): SheetTalk => ({
    name: screen,
    facts: [{ label: 'Showing', value: showing }, ...facts],
    suggestions: ['Why is the right answer right?', 'How can I remember this?'],
  });
  const places = (
    <>
      {open?.kind === 'table' && table ? (
        <Layer title={table.name} back={back} talk={talkOf(`The table ${table.name}${open.address.cell ? `, at the form asked: ${open.address.cell}` : ''}`)} onClose={close}>
          <TableAt table={table} cell={open.address.cell} />
        </Layer>
      ) : null}
      {open?.kind === 'lesson' ? <IdeaSheetWithWord ideaId={open.ideaId} onClose={close} /> : null}
      {open?.kind === 'word' ? <WordSheet chapter={open.sheet.chapter} lookup={open.sheet.lookup} onClose={close} /> : null}
      {open?.kind === 'mnemonic' ? (
        <Layer title={`How to remember ${open.lemma}`} back={back} talk={talkOf(`How to remember the word ${open.lemma}: its picture, the heart of the word and its parts`)} onClose={close}>
          <div className="flex flex-col items-center gap-3 text-center">
            <WordPicture lemma={open.lemma} size={160} testId="mnemonic-picture" />
            <p data-testid="mnemonic-word" {...faceOf(open.hebrew ? 'hbo' : 'grc', { greek: 'text-5xl', hebrew: 'hebrew-form' }, 'min-w-0 break-words')}>
              {open.lemma}
            </p>
            <p className="text-2xl">{open.gloss}</p>
          </div>
          <HeartOfWord lemma={open.lemma} className="mt-4" />
          {open.hebrew ? null : <WordParts word={open.lemma} className="mt-3 text-center" />}
        </Layer>
      ) : null}
      <MissTalk screen={tutor.screen} kept={kept} first={tutor.first} open={open?.kind === 'tutor'} onClose={close} />
    </>
  );
  return { follow, ask: () => setOpen({ kind: 'tutor' }), places };
}
