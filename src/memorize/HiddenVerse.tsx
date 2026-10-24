// src/memorize/HiddenVerse.tsx — a verse drawn token by token for a Memorize session (docs/layout/memorize.md): a word the rung hides is a blank the width of the word (at share 1 its first letter is
// left), a word he missed is marked once the recall is judged (the Reader's miss colour, as the reading check marks a word to fix), Greek in the Greek face. 'nothing' draws no token: only the reference is shown.
import type { Token } from './target';

const MISSED = 'rounded-lg bg-bad/15 px-1 font-semibold text-bad underline decoration-2 underline-offset-4';

/** The first letter of a word with whatever comes before it ("“And" gives “A), and the rest of the word. */
function splitFirst(text: string): [string, string] {
  const letters = Array.from(text);
  const at = letters.findIndex((c) => /\p{L}/u.test(c));
  return at < 0 ? ['', text] : [letters.slice(0, at + 1).join(''), letters.slice(at + 1).join('')];
}

function Blank({ text, firstLetter }: { text: string; firstLetter: boolean }) {
  const [first, rest] = firstLetter ? splitFirst(text) : ['', text];
  return (
    <>
      {first}
      <span aria-hidden="true" className="inline-block border-b-2 border-muted align-baseline" style={{ width: `${Math.max(1, Array.from(rest).length) * 0.7}ch` }} />
    </>
  );
}

export function HiddenVerse({ tokens, hidden, firstLetters, missed }: {
  tokens: readonly Token[];
  /** the indexes of the tokens that are blank */
  hidden: ReadonlySet<number>;
  /** a blank keeps its first letter */
  firstLetters: boolean;
  /** the indexes marked as missed (after the judgement) */
  missed: ReadonlySet<number>;
}) {
  return (
    <p data-testid="memorize-verse" className="text-[length:var(--lp-english-size)] leading-[var(--lp-leading)]">
      {tokens.map((t, i) => {
        const greek = t.lang === 'el';
        const blank = hidden.has(i);
        const mark = missed.has(i);
        return (
          <span key={i}>
            {i > 0 ? ' ' : ''}
            <span
              data-token={i}
              data-blank={blank ? '' : undefined}
              data-missed={mark ? '' : undefined}
              lang={greek ? 'el' : undefined}
              aria-label={blank ? 'hidden word' : undefined}
              className={`${greek ? 'font-greek text-[length:var(--lp-greek-size)] text-accent' : 'font-sans'} ${mark ? MISSED : ''}`}
            >
              {blank ? <Blank text={t.text} firstLetter={firstLetters} /> : t.text}
            </span>
          </span>
        );
      })}
    </p>
  );
}
