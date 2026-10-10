// src/Preface.tsx — a short page about the text Lampas reads (mw-5r3p30.125): why the Byzantine (Majority) text, and where to read more.
// Reached from the top of the chapter picker and from About. The words and links are in src/preface.ts; each link opens in a new tab.
import { navigate } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { PREFACE_LINKS, PREFACE_PARAGRAPHS } from './preface';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useReportScreen } from './tutor/screenContext';

const FACTS = [
  { label: 'Greek text', value: 'Byzantine Textform, Robinson and Pierpont, the 2005 edition (public domain)' },
  { label: 'English text', value: 'Majority Standard Bible (public domain)' },
  { label: 'Sources linked', value: PREFACE_LINKS.map((l) => l.name).join('; ') },
];

export function Preface() {
  useReportScreen({ name: 'Preface', facts: FACTS });
  const scrollRef = useScrollMemory('preface');
  return (
    <>
      <ScreenHeader title="Preface" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4">
        <div className="pb-4">
          <h2 className="pt-4 text-lg font-semibold">The text Lampas reads</h2>
          {PREFACE_PARAGRAPHS.map((p) => (
            <p key={p} className="break-words pt-3 text-base leading-relaxed">
              {p}
            </p>
          ))}
          <h2 className="pt-6 text-lg font-semibold">Read more</h2>
          <ul className="list-none space-y-4 py-3">
            {PREFACE_LINKS.map((l) => (
              <li key={l.url} className="break-words text-base leading-relaxed">
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-block min-h-11 text-accent underline">
                  {l.name}
                </a>
                <p className="text-sm text-muted">{l.about}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
