// src/memorize/ProgressMark.tsx — the small mark of a memorized verse (mw-fu7dqf.11, docs/layout/memorize.md): the ladder of 7 cells with the step filled, and under it the line
// ('Step 3 of 7 · last 9 of 10 · due Tue'), which is also its accessible name. Drawn by the Memorize screen, a verse list's row and the Verse view.
import { langName, type MemorizeLang } from './languages';
import { progressLine, type Progress } from './progress';
import { useProgress } from './useProgress';

/** One mark. `lang` names the language before the line, for a verse memorized in more than one. */
export function ProgressMark({ progress, lang, className = '' }: { progress: Progress; lang?: MemorizeLang; className?: string }) {
  const line = progressLine(progress);
  const text = lang ? `${langName(lang)} · ${line}` : line;
  return (
    <div role="img" aria-label={text} data-progress className={`flex flex-col gap-1 text-sm text-muted ${className}`}>
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: progress.of }, (_, i) => (
          <span key={i} data-cell={i < progress.step ? 'filled' : 'empty'} className={`h-2 w-5 rounded-sm ${i < progress.step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </span>
      <span aria-hidden="true">{text}</span>
    </div>
  );
}

/** The marks of one reference, a mark for each language it is memorized in (the language named when there are several); nothing for a reference that is not memorized. */
export function ProgressMarks({ canonical, className = '' }: { canonical: string; className?: string }) {
  const found = useProgress([canonical]);
  if (!found || found.length === 0) return null;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {found.map(({ lang, progress }) => (
        <ProgressMark key={lang} progress={progress} lang={found.length > 1 ? lang : undefined} />
      ))}
    </div>
  );
}
