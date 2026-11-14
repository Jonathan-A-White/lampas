// src/WordFormLine.tsx — the line under a word question's Greek word once he has answered: where the word stands in the text. The Quick test says 'in Romans 8:1 as ἐκ'; Review says
// 'Example: John 1:44 as ἀπὸ', the verse looked for in his goal first (mw-indx1x6.12). The reference is DrillReference's link; before the answer the line is empty, so there is nothing to tap.
import type { Question } from './data/quiz';
import { DrillReference } from './markdown/DrillReference';
import { faceOf, GREEK_LANG } from './script/greekLang';

export function WordFormLine({ question, answered }: { question: Question; answered: boolean }) {
  const shown = answered && question.form;
  return (
    <p data-testid={shown ? 'chapter-form' : undefined} data-form={answered ? question.form : undefined} className="mt-1 min-h-11 text-sm text-muted">
      {shown ? (
        <>
          {question.example ? 'Example: ' : 'in '}
          <DrillReference reference={question.reference ?? ''} mark={question.form} linked className="inline-flex min-h-11 items-center px-1 text-accent underline underline-offset-4" />{' '}
          as <span {...(question.lang === 'hbo' ? faceOf('hbo', { greek: '', hebrew: '' }) : GREEK_LANG)}>{question.form}</span>
        </>
      ) : (
        ''
      )}
    </p>
  );
}
