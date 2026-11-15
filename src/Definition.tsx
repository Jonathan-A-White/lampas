// src/Definition.tsx — the word sheet's Definition drawn (mw-5r3p30.1163): src/definition.ts reads the text; this lays it out, each reference a link that opens the reader on that verse and
// closes the sheets first (closeAllSheets), the who-part apart from the meaning, each sense on a line of its own.
import type { ReactNode } from 'react';
import { definitionOf, type DefinitionPiece } from './definition';
import { closeAllSheets } from './ui/sheetBack';

/** The pieces of a line: a reference a link to the reader, a '(?)' kept beside the word before it. */
function Pieces({ pieces }: { pieces: DefinitionPiece[] }): ReactNode {
  return (
    <>
      {pieces.map((piece, i) =>
        piece.ref === undefined ? (
          <span key={i}>{piece.text.replace(/ \(\?\)/g, ' (?)')}</span>
        ) : (
          <a
            key={i}
            href={`#/?ref=${piece.ref}&as=${piece.text}`}
            onClick={() => closeAllSheets()}
            className="-my-3 inline-flex min-h-11 items-center text-accent underline underline-offset-4"
          >
            {piece.text}
          </a>
        ),
      )}
    </>
  );
}

/** A lexicon definition laid out: its who-part, then its senses, each reference a link. */
export function Definition({ text }: { text: string }) {
  const { who, meaning } = definitionOf(text);
  return (
    <div className="text-sm" data-testid="definition">
      {who.length > 0 ? (
        <div data-testid="definition-who-block" className={meaning.length > 0 ? 'mb-2 border-b border-line pb-2' : ''}>
          {who.map((line, i) => (
            <p key={i} data-testid="definition-who">
              {i === 0 ? null : ' '}
              <Pieces pieces={line} />
            </p>
          ))}
        </div>
      ) : null}
      {meaning.length > 0 ? (
        <div data-testid="definition-meaning">
          {meaning.map((sense, i) => (
            <p key={i} data-testid="definition-sense" data-depth={sense.depth} className="flex gap-1.5" style={{ paddingLeft: `${sense.depth}rem` }}>
              {i === 0 && who.length === 0 ? null : ' '}
              {sense.label === '' ? null : <span className="shrink-0 text-muted">{sense.label}</span>}
              {sense.label === '' ? null : ' '}
              <span className="min-w-0">
                <Pieces pieces={sense.text} />
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
