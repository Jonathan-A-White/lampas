// src/markdown/Markdown.tsx — the tutor writes Markdown; this draws it (bold, italics, lists, headings, links, tables, code) as
// Postern's src/markdown/Markdown.tsx does, with react-markdown and remark-gfm. No rehype-raw: raw HTML in the source is never
// parsed into elements, so an answer is safe to render as it comes. The text takes the size of its surroundings.
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
