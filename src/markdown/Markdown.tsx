// src/markdown/Markdown.tsx — the tutor writes Markdown; this draws it (bold, italics, lists, headings, links, tables, code) as
// Postern's src/markdown/Markdown.tsx does, with react-markdown and remark-gfm. No rehype-raw: raw HTML in the source is never
// parsed into elements, so an answer is safe to render as it comes. The text takes the size of its surroundings. Hebrew in it is set apart as a
// right-to-left span in its own font (scriptRuns.ts) and is a button that says the word (src/script/HebrewWord.tsx).
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HebrewWord } from '../script/HebrewWord';
import { remarkScripts } from './scriptRuns';

const components: Components = {
  // A Hebrew stretch (scriptRuns.ts) is tappable: it speaks in the Hebrew voice and opens the pronunciation guide.
  span: ({ lang, dir, className, children }) =>
    lang === 'he' ? (
      <HebrewWord>{children}</HebrewWord>
    ) : (
      <span lang={lang} dir={dir} className={className}>
        {children}
      </span>
    ),
  // A link leaves the app in a new tab, never over the reader.
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/** Memoized on its text: an answer is parsed once, however often the sheet around it redraws. */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkScripts]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
