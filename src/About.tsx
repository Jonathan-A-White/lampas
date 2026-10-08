// src/About.tsx — the credits for the data and fonts, read from ATTRIBUTION.md (src/attribution.ts).
import { Fragment, type ReactNode } from 'react';
import { attribution, URL_PATTERN } from './attribution';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { HeaderButton, ScreenHeader } from './ScreenHeader';

/** A line of markdown as nodes: **bold** and `code` marked up, URLs as links. */
function inline(md: string): ReactNode[] {
  return md.split(/(\*\*[^*]+\*\*|`[^`]+`)/).flatMap((part, i): ReactNode[] => {
    if (part.startsWith('**')) return [<strong key={i}>{part.slice(2, -2)}</strong>];
    if (part.startsWith('`')) return [<code key={i} className="break-words text-sm">{part.slice(1, -1)}</code>];
    const nodes: ReactNode[] = [];
    let last = 0;
    for (const m of part.matchAll(URL_PATTERN)) {
      nodes.push(<Fragment key={`${i}-t${m.index}`}>{part.slice(last, m.index)}</Fragment>);
      nodes.push(
        <a key={`${i}-a${m.index}`} href={m[0]} target="_blank" rel="noreferrer" className="break-all text-accent underline">
          {m[0]}
        </a>,
      );
      last = m.index + m[0].length;
    }
    nodes.push(<Fragment key={`${i}-end`}>{part.slice(last)}</Fragment>);
    return nodes;
  });
}

export function About() {
  const scrollRef = useScrollMemory('about');
  return (
    <>
      <ScreenHeader title="About" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div>
        <p className="pt-4 text-base">{inline(attribution.intro)}</p>
        <ul className="list-none space-y-4 py-4">
          {attribution.entries.map((entry) => (
            <li key={entry} className="break-words text-base leading-relaxed">
              {inline(entry)}
            </li>
          ))}
        </ul>
        </div>
      </main>
    </>
  );
}
