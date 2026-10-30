// src/tutor/credits.ts — what the tutor is told on About (mw-vtjxh4.2): every credit of ATTRIBUTION.md as a name, what it gives this reader, its
// licence and its link, so he can ask what STEPBible gives him, what MIT lets us do, or why we credit at all. ATTRIBUTION.md stays the one
// source of the credits (the About screen is built from it); this is the short form the request can afford (the grist's record is capped, the
// request carries MAX_CREDITS_BYTES of it at most), and tests/unit/credits-for-tutor.test.tsx fails when the two drift: every bullet of
// ATTRIBUTION.md has a credit here, and every credit's name, licence and link are found in the bullet it comes from.
import type { ScreenCredit } from './screen';

/** The most the credits weigh as JSON in UTF-8, so the screen, his words and a little history still fit MAX_REQUEST_BYTES (src/services/talk.ts). */
export const MAX_CREDITS_BYTES = 5800;

export const CREDITS: ScreenCredit[] = [
  { name: 'Majority Standard Bible', use: 'The New Testament\'s Greek, aligned to the English', licence: 'Public domain', link: 'https://majoritybible.com' },
  { name: 'Berean Standard Bible', use: 'The Old Testament\'s Hebrew (WLC), aligned to the English', licence: 'Public domain', link: 'https://berean.bible/licensing.htm' },
  { name: 'byztxt', use: 'The variant readings', licence: 'Public domain', link: 'https://github.com/byztxt/byzantine-majority-text' },
  { name: 'Byzantine Priority', use: 'Robinson\'s essay, read on the Preface', licence: 'Public domain', link: 'https://byzantinetext.com/study/editions/robinson-pierpont/' },
  { name: 'TBESG', use: 'Each Greek word\'s lemma, gloss, definition', licence: 'CC BY 4.0', link: 'https://www.stepbible.org' },
  { name: 'TBESH', use: 'Each Hebrew word\'s headword, gloss, definition', licence: 'CC BY 4.0', link: 'https://www.stepbible.org' },
  { name: 'Learn to Read New Testament Greek', use: 'Its lesson titles and pages, for links', licence: 'nothing copied', link: 'https://books.google.com/books/about/Learn_to_Read_New_Testament_Greek.html?id=41j7siCRS0QC' },
  { name: 'Bible Mapper', use: 'Maps of a chapter\'s places', licence: 'free non-commercial, credited', link: 'https://biblemapper.com' },
  { name: 'eSpeak NG', use: 'The sound of ὁ and of δ\'', licence: 'GPL-3.0', link: 'https://github.com/espeak-ng/espeak-ng' },
  { name: 'IPA', use: 'The symbols of the IPA course', licence: 'none needed; a standard', link: 'https://www.internationalphoneticassociation.org' },
  { name: 'Biblical Mastery Academy', use: 'Inspired the path and its order; nothing of theirs is copied', licence: 'none taken; nothing copied', link: 'https://biblicalmastery.academy/' },
  { name: 'Gentium Plus', use: 'The Greek type of the reader', licence: 'SIL OFL 1.1', link: 'https://software.sil.org/gentium/' },
  { name: 'Noto Serif Hebrew', use: 'The Hebrew type', licence: 'SIL OFL 1.1', link: 'https://github.com/notofonts/hebrew' },
  { name: 'Literata', use: 'English fonts, with Atkinson Hyperlegible, Lexend', licence: 'SIL OFL 1.1', link: 'https://github.com/googlefonts/literata' },
  { name: 'React', use: 'The interface library', licence: 'MIT', link: 'https://react.dev/' },
  { name: 'Dexie', use: 'Keeps your data on the phone', licence: 'Apache-2.0', link: 'https://dexie.org/' },
  { name: 'bsv-kit', use: 'The licence gate and tutor payments', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/bsv-kit' },
  { name: 'BSV SDK', use: 'Keys and signatures under bsv-kit', licence: 'Open BSV License', link: 'https://github.com/bsv-blockchain/ts-stack/tree/main/packages/sdk' },
  { name: 'pwa-kit', use: 'Updates, tips, settings; learn-kit\'s learning graph', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/pwa-kit' },
  { name: 'voice-kit', use: 'Read aloud, hold to talk', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/voice-kit' },
  { name: 'audible-kit', use: 'The Audible app link and its chapter list', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/audible-kit' },
  { name: 'react-markdown', use: 'Draws the tutor\'s answers, with remark-gfm', licence: 'MIT', link: 'https://github.com/remarkjs/react-markdown' },
  { name: 'node-qrcode', use: 'The key as a QR code', licence: 'MIT', link: 'https://github.com/soldair/node-qrcode' },
  { name: 'Workbox', use: 'Lets Lampas open offline', licence: 'MIT', link: 'https://developer.chrome.com/docs/workbox' },
  { name: 'WhatsOnChain', use: 'Checks your key holds a licence', licence: 'none needed; public API', link: 'https://whatsonchain.com' },
  { name: 'Postern', use: 'Carries your questions and pictures to the tutor', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/postern' },
  { name: 'Twilio Verify', use: 'Sends the codes for a licence', licence: 'none needed; its terms', link: 'https://www.twilio.com/en-us/user-authentication-identity/verify' },
  { name: 'Claude', use: 'The model behind the tutor, its pictures, drill questions, diagrams', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude' },
  { name: 'Logos Bible Software', use: 'If on: links into your own Logos, its Atlas and Lexham Geographic Commentary', licence: 'yours; nothing copied', link: 'https://www.logos.com' },
  { name: 'Audible', use: 'Opens The Word of Promise in your Audible', licence: 'yours; nothing copied', link: 'https://www.audible.com' },
  { name: 'Blue Letter Bible', use: 'Links a word to its Strong\'s entry', licence: 'its terms; links only', link: 'https://www.blueletterbible.org' },
  { name: 'STEPBible', use: 'Tyndale House data; Strong\'s links', licence: 'CC BY 4.0; links', link: 'https://www.stepbible.org' },
  { name: 'Web Speech API', use: 'Your phone\'s voices speak and hear', licence: 'a web standard', link: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API' },
  { name: '$P recognizer', use: 'Checks a letter you write by its shape', licence: 'none needed; a method', link: 'https://depts.washington.edu/acelab/proj/dollar/pdollar.html' },
  { name: 'Beads', use: 'How the factory keeps its work, with Gas Town', licence: 'MIT', link: 'https://github.com/steveyegge/beads' },
  { name: 'Claude Code', use: 'Writes most of the code', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude-code' },
  { name: 'Vite', use: 'Builds the app, with vite-plugin-pwa', licence: 'MIT', link: 'https://vite.dev' },
  { name: 'Tailwind CSS', use: 'The styling; TypeScript', licence: 'MIT', link: 'https://tailwindcss.com' },
  { name: 'Vitest', use: 'Tests it, with Playwright, axe-core', licence: 'MIT', link: 'https://vitest.dev' },
];
