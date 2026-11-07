// src/library/PartChoice.tsx — "which part?": the question that follows choosing a Bible on Library > Bibles (the list's rows and the typed Resource ID, TypedBible.tsx). One button for each part
// the Bible can be set for (the catalogue's `parts`: bibleHolds) and one for all three; a tap writes that part's Bible in Logos alone (setLogosBibleFor), or all three (setLogosBible). It is the
// same fact Settings > Study resources sets, so nothing here is kept apart.
import { LOGOS_PARTS, type LogosPart } from '../resources/logosBible';
import { oneTap } from '../ui/settle';
import { partsFor, setBibleFor } from './bibleParts';

const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

export function PartChoice({ name, resourceId, onChosen }: { name: string; resourceId: string; onChosen?: () => void }) {
  const choose = (part: LogosPart | 'all'): void => {
    void setBibleFor(part, resourceId).then(onChosen);
  };
  const parts = partsFor(resourceId);
  return (
    <div role="group" aria-label={`Set ${name} for`} className="flex flex-wrap gap-2">
      {LOGOS_PARTS.filter((p) => parts.includes(p.part)).map((p) => (
        <button key={p.part} type="button" className={BUTTON} onClick={() => oneTap(`part-choice:${name}`, () => choose(p.part))}>
          {p.label}
        </button>
      ))}
      <button type="button" className={BUTTON} onClick={() => oneTap(`part-choice:${name}`, () => choose('all'))}>
        All three
      </button>
    </div>
  );
}
