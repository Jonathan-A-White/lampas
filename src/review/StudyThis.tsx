// src/review/StudyThis.tsx — the 'Study this' row under a wrong answer (mw-indx1x6.6, src/review/studyThis.ts gives its links): one button for each thing that teaches what was asked, each
// opening its place over the question, so the round or the drill is as he left it when he closes it. A table opens at its cell: from Review on the Paradigms screen (the round is held, Back
// returns to the question: `onParadigm`), from a full-screen drill as a layer over the drill ('Back to the drill'), since leaving the drill would lose its run. A lesson is the idea's sheet, over a
// drill without its own links to a table or a Hard sounds lesson, which are pages of their own (mw-indx1x6.28), and without its level slider, Mark known, Drill it and Try it on a verse,
// which would start a second run of questions over the drill (mw-indx1x6.29, .57); a
// word is its word sheet, over a drill without its links to a table, the Library or a verse; all of it by the one guard of src/overRun.ts, which the Talk's link chips read too; 'How to remember it' is the word's memory picture, the heart of the word and the parts it is built from. A layer draws its own Talk (DialogAskTutor), so the floating ?
// asks about it, in front of it. With no link the row is 'Ask the tutor' on a phone with a
// licence: a talk of this miss alone, whose first turn names the question, his answer, the right answer and the idea (MissTalk); with no link and no licence there is no row.
import { useEffect, useRef } from 'react';
import { useAiAllowed } from '../gate/licenceContext';
import { GreekRuns } from '../FacetLabel';
import type { ParadigmAddress } from '../nav/route';
import { useDoorRoom } from '../tutor/doorRoom';
import { keepAboveStack } from '../ui/reveal';
import { missFirstTurn, missScreen, type Study } from './studyThis';
import { useStudyPlaces } from './useStudyPlaces';

/** The row's name, on screen and for a screen reader. */
export const STUDY_THIS = 'Study this';
/** The row's one button when nothing teaches the question. */
export const ASK_THE_TUTOR = 'Ask the tutor';

const LINK = 'min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-lg font-medium text-accent active:bg-line';

/** The class of a button of the row or of the Study list. */
export const STUDY_LINK = LINK;

export function StudyThis({ study, screen, back, onParadigm, className = '', keepInView = false }: {
  study: Study;
  /** the screen he is on, as the tutor is told it: 'Review', 'Drill it' */
  screen: string;
  /** what the button back from a layer says: 'Back to Review', 'Back to the drill' */
  back: string;
  /** Review only: the table opens on the Paradigms screen (the screen holds its round first); without it the table opens as a layer over the question */
  onParadigm?: (address: ParadigmAddress) => void;
  className?: string;
  /** the box sits in a screen's scroll box under a pinned Next bar (the drill): the box scrolls so the whole row, its links too, is above the bar (mw-indx1x6.64) */
  keepInView?: boolean;
}) {
  const ai = useAiAllowed();
  const room = useDoorRoom();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => (keepInView ? keepAboveStack(() => row.current) : undefined), [keepInView]);
  const { links, miss } = study;
  const { follow, ask, places } = useStudyPlaces({ screen, back, onParadigm, facts: missScreen(screen, miss).facts, tutor: { screen: missScreen(screen, miss), first: missFirstTurn(miss) } });
  if (links.length === 0 && !ai) return null;
  return (
    <div ref={row} role="group" aria-label={STUDY_THIS} data-testid="study-this" className={`rounded-xl border border-line p-3 text-left ${className}`}>
      <p className="text-base font-medium text-muted">{STUDY_THIS}</p>
      <div className={`mt-2 flex flex-col gap-2 ${room}`}>
        {links.map((link, i) => (
          <button key={i} type="button" data-study={link.kind} onClick={() => follow(link)} className={LINK}>
            <GreekRuns text={link.label} size="text-xl" />
          </button>
        ))}
        {links.length === 0 ? (
          <button type="button" data-study="tutor" onClick={ask} className={LINK}>
            {ASK_THE_TUTOR}
          </button>
        ) : null}
      </div>
      {places}
    </div>
  );
}
