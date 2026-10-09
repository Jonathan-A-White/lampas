// src/About.tsx — Newton's line, why we credit, then every credit (texts, type, libraries, services, ideas, tools), read from ATTRIBUTION.md (src/attribution.ts).
import { Fragment, type ReactNode } from 'react';
import { attribution } from './attribution';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useReportScreen } from './tutor/screenContext';

/** A line of markdown as nodes: **bold**, `code` and [Name](url) links marked up. */
function inline(md: string): ReactNode[] {
  return md.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/).flatMap((part, i): ReactNode[] => {
    if (part.startsWith('**')) return [<strong key={i}>{inline(part.slice(2, -2))}</strong>];
    if (part.startsWith('`')) return [<code key={i} className="break-words text-sm">{part.slice(1, -1)}</code>];
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      return [
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-accent underline">
          {link[1]}
        </a>,
      ];
    }
    return [<Fragment key={i}>{part}</Fragment>];
  });
}

/** The name each credit leads with (its first link's text), by section: what the tutor is told About holds. */
const FACTS = attribution.sections.map((section) => ({
  label: section.title ?? 'Credits',
  value: section.entries.map((e) => /\[([^\]]+)\]\(/.exec(e)?.[1]).filter(Boolean).join(', '),
}));

export function About() {
  useReportScreen({ name: 'About', facts: FACTS });
  const scrollRef = useScrollMemory('about');
  const { quote, intro, sections } = attribution;
  return (
    <>
      <ScreenHeader title="About" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
          {quote && (
            <blockquote className="mt-4 border-l-4 border-accent pl-4">
              <p className="text-xl italic leading-snug">{quote.text}</p>
              {quote.by && <footer className="mt-1 text-sm text-muted">— {quote.by}</footer>}
            </blockquote>
          )}
          <p className="pt-4 text-base">{inline(intro)}</p>
          {sections.map((section) => (
            <section key={section.title ?? ''} aria-label={section.title ?? undefined}>
              {section.title && <h2 className="pt-4 text-lg font-semibold">{section.title}</h2>}
              <ul className="list-none space-y-4 py-4">
                {section.entries.map((entry) => (
                  <li key={entry} className="break-words text-base leading-relaxed">
                    {inline(entry)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
