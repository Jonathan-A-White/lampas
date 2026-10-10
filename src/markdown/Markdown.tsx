// src/markdown/Markdown.tsx — the tutor writes Markdown; this draws it (bold, italics, lists, headings, links, tables, code) as
// Postern's src/markdown/Markdown.tsx does, with react-markdown and remark-gfm. No rehype-raw: raw HTML in the source is never
// parsed into elements, so an answer is safe to render as it comes. The text takes the size of its surroundings. Hebrew in it is set apart as a
// right-to-left span in its own font (scriptRuns.ts) and is a button that says the word (src/script/HebrewWord.tsx). A Bible reference the answer names
// ('Hebrews 7:2', 'Ps. 110') is a link that opens a card with the passage first (verseLinks.ts, ReferenceCard.tsx); a link the model wrote to a host no study resource builds links on is shown as text.
import { memo, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isKnownLink } from '../resources/hosts';
import { HebrewWord } from '../script/HebrewWord';
import { remarkScripts } from './scriptRuns';
import { ReferenceLink } from './ReferenceCard';
import { remarkVerses, writtenOf } from './verseLinks';

const spanOf: Components['span'] = ({ lang, dir, className, children }) =>
  // A Hebrew stretch (scriptRuns.ts) is tappable: it speaks in the Hebrew voice and opens the pronunciation guide.
  lang === 'he' ? (
    <HebrewWord>{children}</HebrewWord>
  ) : (
    <span lang={lang} dir={dir} className={className}>
      {children}
    </span>
  );

/** `onLeave` is called before a reference's Open opens the reader: the Talk sheet closes itself there. */
const componentsFor = (onLeave: () => void): Components => ({
  span: spanOf,
  a: ({ href, children }) => {
    // A reference the answer names: a card first (ReferenceCard.tsx), and its Open opens the reader there.
    const written = href === undefined ? null : writtenOf(href);
    if (written !== null) return <ReferenceLink written={written} onLeave={onLeave}>{children}</ReferenceLink>;
    // Any other link leaves the app in a new tab, never over the reader, and only to a host the study resources build links on or a credit's own address (About): the rest is text.
    if (href === undefined || !isKnownLink(href)) return <>{children}</>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
});

/** Memoized on its text: an answer is parsed once, however often the sheet around it redraws. `onOpen` is called before a reference's card opens the reader
 *  (the Talk sheet closes itself there); it is read when called, so a new one does not rebuild the answer (and close a card that is open). */
export const Markdown = memo(function Markdown({ text, onOpen }: { text: string; onOpen?: () => void }) {
  const latest = useRef(onOpen);
  useEffect(() => {
    latest.current = onOpen;
  });
  const components = useMemo(() => componentsFor(() => latest.current?.()), []);
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkVerses, remarkScripts]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
