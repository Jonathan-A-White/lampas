// src/review/StudyList.tsx — the 'Study list' at the end of a Review or a drill (mw-indx1x6.8, src/review/studyList.ts makes its rows): every resource the session's misses linked to, once, the most-missed
// first, each row opening its place as the 'Study this' link under the question did (src/review/useStudyPlaces.tsx). The misses that linked to nothing are one 'Ask the tutor about these' row
// at the end, drawn only where a licence allows the tutor: a talk that opens with those misses already said. No misses, no list.
import { useAiAllowed } from '../gate/licenceContext';
import { GreekRuns } from '../FacetLabel';
import type { ParadigmAddress } from '../nav/route';
import { useDoorRoom } from '../tutor/doorRoom';
import { missesFirstTurn, missesScreen, studyListOf } from './studyList';
import { STUDY_LINK } from './StudyThis';
import { useStudyPlaces } from './useStudyPlaces';
import type { Study } from './studyThis';

/** The list's name, on screen and for a screen reader. */
export const STUDY_LIST = 'Study list';
/** The row that carries the misses nothing teaches to the tutor. */
export const ASK_ABOUT_THESE = 'Ask the tutor about these';

export function StudyList({ studies, screen, back, onParadigm, className = '' }: {
  /** the 'Study this' of every miss of the session, in the order he missed them */
  studies: readonly Study[];
  /** the screen he is on, as the tutor is told it: 'Review', 'Drill it' */
  screen: string;
  /** what the button back from a layer says: 'Back to Review', 'Back to the drill' */
  back: string;
  onParadigm?: (address: ParadigmAddress) => void;
  className?: string;
}) {
  const ai = useAiAllowed();
  const room = useDoorRoom();
  const { rows, unlinked } = studyListOf(studies);
  const asking = unlinked.length > 0 && ai;
  const { follow, ask, places } = useStudyPlaces({
    screen,
    back,
    onParadigm,
    facts: [{ label: 'Study list', value: `${studies.length} ${studies.length === 1 ? 'miss' : 'misses'} of this session` }],
    tutor: { screen: missesScreen(screen, unlinked), first: missesFirstTurn(unlinked) },
  });
  if (rows.length === 0 && !asking) return null;
  return (
    <div role="group" aria-label={STUDY_LIST} data-testid="study-list" className={`rounded-xl border border-line p-3 text-left ${className}`}>
      <p className="text-base font-medium text-muted">{STUDY_LIST}</p>
      <div className={`mt-2 flex flex-col gap-2 ${room}`}>
        {rows.map(({ link, count }, i) => (
          <button key={i} type="button" data-study={link.kind} data-misses={count} onClick={() => follow(link)} className={STUDY_LINK}>
            <GreekRuns text={link.label} size="text-xl" />
            {count > 1 ? <span className="ml-2 text-base font-normal text-muted">{count} misses</span> : null}
          </button>
        ))}
        {asking ? (
          <button type="button" data-study="tutor" onClick={ask} className={STUDY_LINK}>
            {ASK_ABOUT_THESE}
          </button>
        ) : null}
      </div>
      {places}
    </div>
  );
}
