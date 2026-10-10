// src/About.tsx — Newton's line, why we credit, then every credit (texts, type, libraries, services, ideas, tools), read from ATTRIBUTION.md (src/attribution.ts).
import { Fragment, useRef, useState, type ReactNode } from 'react';
import { attribution } from './attribution';
import { BuildVersion } from './BuildVersion';
import { setDeveloper } from './data/repositories';
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { CREDITS } from './tutor/credits';
import { useReportScreen } from './tutor/screenContext';
import { VersionLink } from './whatsNew/VersionLink';
import { WhatsNewSection } from './whatsNew/WhatsNewSection';

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

/** Developer mode is found by tapping the version number this many times, each within DEVELOPER_TAP_WINDOW_MS of the one before (as in SpellForge). */
export const DEVELOPER_TAPS = 7;
export const DEVELOPER_TAP_WINDOW_MS = 3000;

export function About() {
  useReportScreen({ name: 'About', facts: [], credits: CREDITS });
  const scrollRef = useScrollMemory('about');
  const { quote, intro, sections } = attribution;
  const taps = useRef({ count: 0, last: 0 });
  const [found, setFound] = useState(false);
  const tapVersion = () => {
    const now = Date.now();
    const t = taps.current;
    t.count = now - t.last > DEVELOPER_TAP_WINDOW_MS ? 1 : t.count + 1;
    t.last = now;
    if (t.count >= DEVELOPER_TAPS) {
      t.count = 0;
      void setDeveloper('on').then(() => setFound(true));
    }
  };
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
          <button
            type="button"
            aria-label="Preface"
            aria-describedby="preface-about"
            onClick={() => navigate('preface')}
            className="mt-4 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-left text-base font-medium"
          >
            Preface
            <span id="preface-about" className="block text-sm font-normal text-muted">Why the Byzantine (Majority) text, and where to read more</span>
          </button>
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
          <WhatsNewSection />
          <BuildVersion onTap={tapVersion} />
          <VersionLink />
          <div className="pb-4" />
          {found ? (
            <p role="status" className="pb-4 text-center text-base font-medium">
              Developer mode is on. Its switch is in Settings.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
