// src/tutor/credits.ts — what the tutor is told on About (mw-vtjxh4.2): every credit of ATTRIBUTION.md as a name, what it gives this reader, its
// licence and its link, so he can ask what STEPBible gives him, what MIT lets us do, or why we credit at all. ATTRIBUTION.md stays the one
// source of the credits (the About screen is built from it); this is the short form the request can afford (the grist's record is capped, the
// request carries MAX_CREDITS_BYTES of it at most), and tests/unit/credits-for-tutor.test.tsx fails when the two drift: every bullet of
// ATTRIBUTION.md has a credit here, and every credit's name, licence and link are found in the bullet it comes from.
import type { ScreenCredit } from './screen';

/** The most the credits weigh as JSON in UTF-8, so the screen, his words and a little history still fit MAX_REQUEST_BYTES (src/services/talk.ts). */
export const MAX_CREDITS_BYTES = 4300;

export const CREDITS: ScreenCredit[] = [
  { name: 'Majority Standard Bible', use: 'The Greek you read, aligned to its English, with Strong\'s and parsing', licence: 'Public domain', link: 'https://majoritybible.com' },
  { name: 'Byzantine Priority', use: 'Robinson\'s essay, read on the Preface', licence: 'Public domain', link: 'https://byzantinetext.com/study/editions/robinson-pierpont/' },
  { name: 'TBESG', use: 'STEPBible (Tyndale House): each word\'s lemma, gloss and definition', licence: 'CC BY 4.0', link: 'https://www.stepbible.org' },
  { name: 'Biblical Mastery Academy', use: 'Only the order BMA Tutor teaches grammar in; the lessons are ours', licence: 'none taken; nothing copied', link: 'https://biblicalmastery.academy/' },
  { name: 'Gentium Plus', use: 'The Greek type of the reader', licence: 'SIL OFL 1.1', link: 'https://software.sil.org/gentium/' },
  { name: 'Noto Serif Hebrew', use: 'The Hebrew type of answers', licence: 'SIL OFL 1.1', link: 'https://github.com/notofonts/hebrew' },
  { name: 'React', use: 'The interface library', licence: 'MIT', link: 'https://react.dev/' },
  { name: 'Dexie', use: 'Keeps your words and settings on the phone', licence: 'Apache-2.0', link: 'https://dexie.org/' },
  { name: 'bsv-kit', use: 'The licence gate, tutor messages, What\'s new, read aloud', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/bsv-kit' },
  { name: 'BSV SDK', use: 'Keys and signatures under bsv-kit', licence: 'Open BSV License', link: 'https://github.com/bsv-blockchain/ts-stack/tree/main/packages/sdk' },
  { name: 'react-markdown', use: 'Draws the tutor\'s answers', licence: 'MIT', link: 'https://github.com/remarkjs/react-markdown' },
  { name: 'remark-gfm', use: 'Tables and lists in them', licence: 'MIT', link: 'https://github.com/remarkjs/remark-gfm' },
  { name: 'node-qrcode', use: 'The key as a QR code', licence: 'MIT', link: 'https://github.com/soldair/node-qrcode' },
  { name: 'Workbox', use: 'Lets Lampas open offline', licence: 'MIT', link: 'https://developer.chrome.com/docs/workbox' },
  { name: 'WhatsOnChain', use: 'Checks your key holds a licence', licence: 'none needed; public API', link: 'https://whatsonchain.com' },
  { name: 'Postern', use: 'Carries your questions and pictures to the tutor and back', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/postern' },
  { name: 'Claude', use: 'The model behind the tutor, which reads your pictures', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude' },
  { name: 'Logos Bible Software', use: 'If switched on: links into your own Logos', licence: 'yours; nothing copied', link: 'https://www.logos.com' },
  { name: 'Accordance', use: 'If switched on: links into your own Accordance', licence: 'yours; nothing copied', link: 'https://www.accordancebible.com' },
  { name: 'Blue Letter Bible', use: 'Links a word to its Strong\'s entry', licence: 'its terms; links only', link: 'https://www.blueletterbible.org' },
  { name: 'STEPBible', use: 'Links a word to its Strong\'s entry', licence: 'its terms; links only', link: 'https://www.stepbible.org' },
  { name: 'Web Speech API', use: 'Your phone\'s voices speak and hear', licence: 'a web standard', link: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API' },
  { name: 'Beads', use: 'How the factory keeps its work: small tracked tasks', licence: 'MIT', link: 'https://github.com/steveyegge/beads' },
  { name: 'Gas Town', use: 'Agents that take them one at a time', licence: 'MIT', link: 'https://github.com/steveyegge/gastown' },
  { name: 'Claude Code', use: 'Writes most of the code, under Jonathan\'s direction', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude-code' },
  { name: 'Vite', use: 'Builds the app', licence: 'MIT', link: 'https://vite.dev' },
  { name: 'vite-plugin-pwa', use: 'Installable and offline', licence: 'MIT', link: 'https://github.com/vite-pwa/vite-plugin-pwa' },
  { name: 'Tailwind CSS', use: 'The styling', licence: 'MIT', link: 'https://tailwindcss.com' },
  { name: 'TypeScript', use: 'The language it is written in', licence: 'Apache-2.0', link: 'https://www.typescriptlang.org/' },
  { name: 'Vitest', use: 'Tests it', licence: 'MIT', link: 'https://vitest.dev' },
  { name: 'Playwright', use: 'Tests it on a phone-sized screen', licence: 'Apache-2.0', link: 'https://playwright.dev' },
];
