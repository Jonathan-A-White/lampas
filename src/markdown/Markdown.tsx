// src/markdown/Markdown.tsx — the tutor writes Markdown; this draws it (bold, italics, lists, headings, links, tables, code) as
// Postern's src/markdown/Markdown.tsx does, with react-markdown and remark-gfm. No rehype-raw: raw HTML in the source is never
// parsed into elements, so an answer is safe to render as it comes. The text takes the size of its surroundings. Hebrew in it is set apart as a
// right-to-left span in its own font (scriptRuns.ts) and is a button that says the word (src/script/HebrewWord.tsx). A New Testament verse the answer names
// ('Hebrews 7:2') is a link that opens it in the Verse view (verseLinks.ts); a link the model wrote to a host no study resource builds links on is shown as text.
import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { openVerseAt, readerOf } from '../nav/route';
import { isKnownLink } from '../resources/hosts';
import { HebrewWord } from '../script/HebrewWord';
import { remarkScripts } from './scriptRuns';
import { remarkVerses, VERSE_HASH } from './verseLinks';

const spanOf: Components['span'] = ({ lang, dir, className, children }) =>
  // A Hebrew stretch (scriptRuns.ts) is tappable: it speaks in the Hebrew voice and opens the pronunciation guide.
  lang === 'he' ? (
    <HebrewWord>{children}</HebrewWord>
  ) : (
    <span lang={lang} dir={dir} className={className}>
      {children}
    </span>
  );

/** `onOpen` is called before a verse link opens its verse: the Talk sheet closes itself there. */
const componentsFor = (onOpen: (() => void) | undefined): Components => ({
  span: spanOf,
  a: ({ href, children }) => {
    // A verse the answer names: the reader's own address, opened as a Back step of its own.
    if (href !== undefined && VERSE_HASH.test(href)) {
      return (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            const { book, chapter, verse } = readerOf(href);
            onOpen?.();
            openVerseAt({ book, chapter, verse });
          }}
        >
          {children}
        </a>
      );
    }
    // Any other link leaves the app in a new tab, never over the reader, and only to a host the study resources build links on or a credit's own address (About): the rest is text.
    if (href === undefined || !isKnownLink(href)) return <>{children}</>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
});

/** Memoized on its text: an answer is parsed once, however often the sheet around it redraws. */
export const Markdown = memo(function Markdown({ text, onOpen }: { text: string; onOpen?: () => void }) {
  const components = useMemo(() => componentsFor(onOpen), [onOpen]);
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkVerses, remarkScripts]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
