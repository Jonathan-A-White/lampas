// src/LessonStrip.tsx — the Lesson strip of the Verse view on a passage lesson's range (mw-z370x5.2, docs/verse-view.md): under the heading, the lesson's title, its ideas as chips (a tap opens
// the idea sheet) and 'Read it, then Check', whose Check button opens the Check (src/CheckSheet.tsx). The view draws it and the verses as ever; it marks nothing.
import { useState } from 'react';
import type { Chapter, GreekWord } from './data/chapter';
import { ideaOf } from './data/grammar/ladder';
import { IdeaSheet } from './IdeaSheet';
import { WordSheet, type Lookup } from './WordSheet';

export function LessonStrip({ title, ideas, onCheck }: { title: string; ideas: readonly string[]; onCheck: () => void }) {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<{ chapter: Chapter; lookup: Lookup } | null>(null);
  return (
    <>
      <section aria-label="Lesson strip" data-lesson-strip className="mb-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight">{title}</p>
            <p className="text-sm text-muted">Read it, then Check</p>
          </div>
          <button type="button" onClick={onCheck} className="min-h-12 shrink-0 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg">
            Check
          </button>
        </div>
        {/* one row that scrolls sideways, so the strip stays short and the row of actions stays in reach under the text */}
        <ul aria-label="Ideas of the lesson" className="mt-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {ideas.map((id) => (
            <li key={id} className="shrink-0">
              <button type="button" data-idea={id} onClick={() => setIdeaId(id)} className="min-h-11 whitespace-nowrap rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line">
                {ideaOf(id).title}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          covered={word !== null}
          onWord={(chapter: Chapter, tapped: GreekWord) => setWord({ chapter, lookup: { words: [tapped], fromEnglish: false } })}
        />
      ) : null}
      {word ? <WordSheet chapter={word.chapter} lookup={word.lookup} onClose={() => setWord(null)} /> : null}
    </>
  );
}
