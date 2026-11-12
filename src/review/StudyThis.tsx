// src/review/StudyThis.tsx — the 'Study this' row under a wrong answer (mw-indx1x6.6, src/review/studyThis.ts gives its links): one button for each thing that teaches what was asked, each
// opening its place over the question, so the round or the drill is as he left it when he closes it. A table opens at its cell: from Review on the Paradigms screen (the round is held, Back
// returns to the question: `onParadigm`), from a full-screen drill as a layer over the drill ('Back to the drill'), since leaving the drill would lose its run. A lesson is the idea's sheet; a
// word is its word sheet; 'How to remember it' is the word's memory picture, the heart of the word and the parts it is built from. A layer draws its own Talk (DialogAskTutor), so the floating ?
// asks about it, in front of it. With no link the row is 'Ask the tutor' on a phone with a
// licence: a talk of this miss alone, whose first turn names the question, his answer, the right answer and the idea (MissTalk); with no link and no licence there is no row.
import { useState, type ReactNode } from 'react';
import { DialogAskTutor, MissTalk } from '../AskTutor';
import { loadLexicon } from '../data/lexicon';
import { paradigmById } from '../data/paradigms';
import { GreekRuns } from '../FacetLabel';
import { useAiAllowed } from '../gate/licenceContext';
import { HeartOfWord } from '../HeartOfWord';
import { IdeaSheetWithWord } from '../IdeaSheetWithWord';
import { findWord, lemmaSheet } from '../nav/links';
import type { ParadigmAddress } from '../nav/route';
import { TableAt } from '../ParadigmsScreen';
import { faceOf } from '../script/greekLang';
import { useDoorRoom } from '../tutor/doorRoom';
import { useSheetTalk, type SheetTalk } from '../tutor/sheetTalk';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { WordParts } from '../WordParts';
import { WordPicture } from '../WordPicture';
import { WordSheet } from '../WordSheet';
import { missFirstTurn, missScreen, type Study, type StudyLink } from './studyThis';

/** The row's name, on screen and for a screen reader. */
export const STUDY_THIS = 'Study this';
/** The row's one button when nothing teaches the question. */
export const ASK_THE_TUTOR = 'Ask the tutor';

const LINK = 'min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-lg font-medium text-accent active:bg-line';

/** A full-screen layer over the question, as a drill's own is: its title, a button back, and a box that scrolls. */
function Layer({ title, back, talk, onClose, children }: { title: string; back: string; talk: SheetTalk; onClose: () => void; children: ReactNode }) {
  useSheetBack(onClose);
  const asked = useSheetTalk(talk);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 flex flex-col bg-surface text-left">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <h2 className="title-wrap min-w-0 flex-1 text-lg font-bold">
          <GreekRuns text={title} />
        </h2>
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
          {back}
        </button>
      </header>
      <div className="screen min-h-0 flex-1 px-4 pt-3">{children}</div>
      {/* the floating ? asks about this layer, its Talk in front of it: what it shows and the miss it was opened from (tests/unit/door-guard.test.ts) */}
      <DialogAskTutor {...asked} />
    </div>
  );
}

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

export function StudyThis({ study, screen, back, onParadigm, className = '' }: {
  study: Study;
  /** the screen he is on, as the tutor is told it: 'Review', 'Drill it' */
  screen: string;
  /** what the button back from a layer says: 'Back to Review', 'Back to the drill' */
  back: string;
  /** Review only: the table opens on the Paradigms screen (the screen holds its round first); without it the table opens as a layer over the question */
  onParadigm?: (address: ParadigmAddress) => void;
  className?: string;
}) {
  const ai = useAiAllowed();
  const room = useDoorRoom();
  const [open, setOpen] = useState<Open | null>(null);
  // the talk of this miss alone: a key of its own, so its first turn is always this miss
  const [kept] = useState(() => `screen.miss.${Date.now()}`);
  const { links, miss } = study;
  if (links.length === 0 && !ai) return null;
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
    facts: [{ label: 'Showing', value: showing }, ...missScreen(screen, miss).facts],
    suggestions: ['Why is the right answer right?', 'How can I remember this?'],
  });
  return (
    <div role="group" aria-label={STUDY_THIS} data-testid="study-this" className={`rounded-xl border border-line p-3 text-left ${className}`}>
      <p className="text-base font-medium text-muted">{STUDY_THIS}</p>
      <div className={`mt-2 flex flex-col gap-2 ${room}`}>
        {links.map((link, i) => (
          <button key={i} type="button" data-study={link.kind} onClick={() => follow(link)} className={LINK}>
            <GreekRuns text={link.label} size="text-xl" />
          </button>
        ))}
        {links.length === 0 ? (
          <button type="button" data-study="tutor" onClick={() => setOpen({ kind: 'tutor' })} className={LINK}>
            {ASK_THE_TUTOR}
          </button>
        ) : null}
      </div>
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
      <MissTalk screen={missScreen(screen, miss)} kept={kept} first={missFirstTurn(miss)} open={open?.kind === 'tutor'} onClose={close} />
    </div>
  );
}
