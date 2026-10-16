import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { AskApproachSheet } from '../../AskApproachSheet';
import { useAiAllowed } from '../../gate/licenceContext';
import { APPROACHES, nextLessonOf, type GrammarApproach } from '../../approaches';
import { getGrammarApproach } from '../../data/repositories';
import { listLevels } from '../../data/repositories/grammarLevels';
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

/** The grammar approach: a choice of the approaches (none is drawn while there is only one path), then the chosen one's credit line, its method
 * and its lessons, with the lesson that holds the earliest idea he has no level for marked Next. Choosing writes only the approach: his levels
 * are not touched. `approaches` is the list; a test hands it a second. */
export function ApproachPicker({
  chosen,
  levels,
  approaches = APPROACHES,
}: {
  chosen: string;
  levels: ReadonlyMap<string, { level: 'solid' | 'frontier' | 'notYet' }>;
  approaches?: readonly GrammarApproach[];
}) {
  const approach = approaches.find((a) => a.id === chosen) ?? approaches[0];
  const next = nextLessonOf(approach, (id) => levels.get(id)?.level);
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
                      <span data-lesson-title>{lesson.title}</span>
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
  return (
    <SettingRow row={row}>
      {approach !== undefined && levels !== undefined ? <ApproachPicker chosen={approach} levels={levels} /> : null}
      <AskApproach />
    </SettingRow>
  );
};
