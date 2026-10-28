// src/HelpScreen.tsx — Help (#/help, mw-5r3p30.823): the app's own notes as a short list, one line for each piece of the app, each a tap to a page of a few lines (#/help?page=licence). Ask the tutor
// is the first thing on both: it opens the round control's sheet over the screen (src/tutor/askNow.ts), and the screen reports its pieces (the list) or its page, so a question about the app is
// answered from Help. The words are in src/help.ts. Reached from Settings, Account, More.
import { useAiAllowed } from './gate/licenceContext';
import { HELP_PAGES, helpPageById, type HelpPage } from './help';
import { backTo, helpPageOf, openHelpPage, openLicence, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { askTheTutor } from './tutor/askNow';
import { SCREEN_NAMES, type ScreenContext } from './tutor/screen';
import { useReportScreen } from './tutor/screenContext';

const NAME = SCREEN_NAMES.help;

/** The list: a fact for each piece (its line and what its page says; the request cuts a long one), so a question about the app is answered from them. */
const listScreen = (): ScreenContext => ({
  name: NAME,
  facts: HELP_PAGES.map((p) => ({ label: p.title, value: `${p.line} ${p.body.join(' ')}` })),
});

/** A page: its name, its words and the other pieces Help has. */
const pageScreen = (page: HelpPage): ScreenContext => ({
  name: NAME,
  facts: [
    { label: 'Page', value: page.title },
    ...page.body.map((text, i) => ({ label: `Note ${i + 1}`, value: text })),
    { label: 'Other pieces', value: HELP_PAGES.filter((p) => p.id !== page.id).map((p) => p.title).join('; ') },
  ],
});

/** Ask the tutor, at the top of Help: the tutor with this screen in hand. Without a licence the tutor is not offered, and the way to one is. */
function AskButton() {
  const ai = useAiAllowed();
  return ai ? (
    <button type="button" onClick={() => askTheTutor()} className="mt-4 min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg">
      Ask the tutor
    </button>
  ) : (
    <button type="button" onClick={() => openLicence('settings')} className="mt-4 min-h-12 w-full rounded-xl border border-line px-5 text-base font-medium text-accent">
      Needs a licence
    </button>
  );
}

export function HelpScreen() {
  const page = helpPageById(helpPageOf(useAddress()));
  useReportScreen(page ? pageScreen(page) : listScreen());
  const scrollRef = useScrollMemory('help');
  return (
    <>
      <ScreenHeader
        title={NAME}
        back={page ? <HeaderButton onClick={() => backTo('help')}>‹ Help</HeaderButton> : <HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>}
      />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-4 pb-[var(--lp-end-inset)]">
        <AskButton />
        {page ? (
          <article className="pb-4">
            <h2 data-read-block className="pt-5 text-lg font-semibold">
              {page.title}
            </h2>
            {page.body.map((text) => (
              <p key={text} data-read-block className="break-words pt-3 text-base leading-relaxed">
                {text}
              </p>
            ))}
          </article>
        ) : (
          <ul className="list-none space-y-2 py-4">
            {HELP_PAGES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openHelpPage(p.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{p.title}</span>
                    <span className="block text-sm text-muted">{p.line}</span>
                  </span>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
