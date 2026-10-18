import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { IdeaSheetWithWord } from '../../IdeaSheetWithWord';
import { AskApproachSheet } from '../../AskApproachSheet';
import { useAiAllowed } from '../../gate/licenceContext';
import { APPROACHES, passageKey, passageLabel, type ApproachLesson, type GrammarApproach } from '../../approaches';
import type { Goal } from '../../data/goal';
import { nextLesson } from '../../data/grammar/goalProgress';
import { ideaOf } from '../../data/grammar/ladder';
import type { PassageNeeds } from '../../data/grammar/needs';
import { getGrammarApproach } from '../../data/repositories';
import { listLevels } from '../../data/repositories/grammarLevels';
import { listPassageLessons } from '../../data/repositories/passageLessons';
import { useGoalProgress } from '../../useGoalProgress';
import { writeSetting } from '../registry';
import { SettingRow } from './SettingRow';
import type { Control } from './types';

/** The credit line, with the source's name a link when the approach has its address. */
function CreditLine({ approach }: { approach: GrammarApproach }) {
  const credit = approach.credit;
  if (!credit) return null;
  const at = credit.line.indexOf(credit.name);
  return (
    <p data-approach-credit className="pt-3 text-base">
      {at < 0 ? (
        credit.line
      ) : (
        <>
          {credit.line.slice(0, at)}
          <a href={credit.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
            {credit.name}
          </a>
          {credit.line.slice(at + credit.name.length)}
        </>
      )}
    </p>
  );
}

/** A tap on a title opens the idea sheet of that idea. */
const TITLE = 'min-h-12 text-left align-middle text-base text-accent underline decoration-dotted underline-offset-4';

/**
 * The title of a lesson and the ideas it holds (mw-86e9r1.35, .40, .42): a lesson of one idea whose title is the idea's is a button that opens that idea's sheet;
 * a lesson of several lists each idea by title under it, each a button that opens its sheet. A passage lesson keeps its range for a title: its ideas are revisits.
 */
function LessonTitle({ lesson, onOpen }: { lesson: ApproachLesson; onOpen: (ideaId: string) => void }) {
  const [only] = lesson.ideas;
  if (lesson.passage || lesson.ideas.length === 0) return <span data-lesson-title>{lesson.title}</span>;
  if (lesson.ideas.length === 1 && ideaOf(only).title === lesson.title) {
    return (
      <button type="button" data-lesson-title data-idea={only} onClick={() => onOpen(only)} className={TITLE}>
        {lesson.title}
      </button>
    );
  }
  return (
    <>
      <span data-lesson-title>{lesson.title}</span>
      <ul data-lesson-ideas className="ml-5 list-disc text-base">
        {lesson.ideas.map((id) => (
          <li key={id}>
            <button type="button" data-idea-title data-idea={id} onClick={() => onOpen(id)} className={TITLE}>
              {ideaOf(id).title}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The grammar approach: a choice of the approaches (none is drawn while there is only one path), then the chosen one's credit line, its method
 * and its lessons, with the lesson marked Next that the Goal's Learn next opens for `needs`, his goal's (mw-86e9r1.24; with no goal, the lesson that
 * holds the earliest idea he has no level for). Choosing writes only the approach: his levels are not touched. `approaches` is the list; a test hands
 * it a second. */
export function ApproachPicker({
  chosen,
  levels,
  needs,
  goal,
  passages = new Map(),
  approaches = APPROACHES,
}: {
  chosen: string;
  levels: ReadonlyMap<string, { level: 'solid' | 'frontier' | 'notYet' }>;
  needs?: Pick<PassageNeeds, 'ideas'>;
  /** his goal, which decides the passage lessons Next may name */
  goal?: Goal;
  /** the passage lessons he has read or passed, by key: a passed one is marked Passed */
  passages?: ReadonlyMap<string, { state: 'read' | 'passed' }>;
  approaches?: readonly GrammarApproach[];
}) {
  const approach = approaches.find((a) => a.id === chosen) ?? approaches[0];
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const next = nextLesson(needs, approach, new Map(Array.from(levels, ([id, row]) => [id, row.level])), { goal, states: passages });
  const choice = approaches.length > 1;
  return (
    // with one path there is no radiogroup to name the row, so the row's own content is the group
    <div role={choice ? undefined : 'group'} aria-label={choice ? undefined : 'Grammar approach'}>
      {choice ? (
        <div role="radiogroup" aria-label="Grammar approach" className="space-y-2">
          {approaches.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={approach.id === a.id}
              onClick={() => void writeSetting('grammarApproach', a.id)}
              className={`block min-h-12 w-full rounded-xl border px-4 py-2 text-left text-base font-medium ${approach.id === a.id ? 'border-accent bg-accent/15' : 'border-line'}`}
            >
              {a.name}
            </button>
          ))}
        </div>
      ) : null}
      <CreditLine approach={approach} />
      <p data-approach-method className="pt-3 text-base">
        {approach.method}
      </p>
      <div data-approach-lessons className="pt-3">
        {approach.stages.map((stage) => (
          <div key={stage.title}>
            <h3 className="pt-3 text-base font-semibold">{stage.title}</h3>
            {stage.levels.map((level) => (
              <div key={level.title}>
                <h4 className="pt-2 text-base font-medium text-muted">{level.title}</h4>
                <ol className="list-inside list-decimal text-base">
                  {level.lessons.map((lesson) => (
                    <li key={lesson.title} className={lesson === next?.lesson ? 'font-medium' : undefined}>
                      <LessonTitle lesson={lesson} onOpen={setIdeaId} />
                      {lesson.passage && passageLabel(lesson.passage) !== lesson.title ? <span data-passage-range> · {passageLabel(lesson.passage)}</span> : null}
                      {lesson.passage && passages.get(passageKey(lesson.passage))?.state === 'passed' ? (
                        <span data-passed className="ml-2 rounded-md border border-line px-2 text-sm text-muted">
                          Passed
                        </span>
                      ) : null}
                      {lesson === next?.lesson ? (
                        <span data-next className="ml-2 rounded-md bg-accent px-2 text-sm text-accent-fg">
                          Next
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ))}
      </div>
      {ideaId ? <IdeaSheetWithWord ideaId={ideaId} onClose={() => setIdeaId(null)} /> : null}
    </div>
  );
}

/** The last control of Settings > Grammar approach: it opens the sheet that asks the factory for another approach. A feedback is sent to the mill, so
 * it is not drawn without a licence (mw-8m9dyu.2). */
function AskApproach() {
  const [open, setOpen] = useState(false);
  const ai = useAiAllowed();
  if (!ai) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 block min-h-12 w-full rounded-xl border border-line px-4 py-2 text-left text-base font-medium"
      >
        Ask for another approach
      </button>
      {open ? <AskApproachSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export const ApproachControl: Control = ({ row }) => {
  const approach = useLiveQuery(getGrammarApproach, []);
  const levels = useLiveQuery(listLevels, []);
  // the goal's needs, so Next is the lesson Learn next opens: the picker waits for them, and a goal whose chapters cannot be fetched marks as no goal
  const progress = useGoalProgress();
  const passages = useLiveQuery(listPassageLessons, []);
  const needs = progress.status === 'ready' ? progress.needs : undefined;
  const goal = progress.status === 'ready' ? progress.goal : undefined;
  return (
    <SettingRow row={row}>
      {approach !== undefined && levels !== undefined && progress.status !== 'loading' && passages !== undefined ? (
        <ApproachPicker chosen={approach} levels={levels} needs={needs} goal={goal} passages={passages} />
      ) : null}
      <AskApproach />
    </SettingRow>
  );
};
