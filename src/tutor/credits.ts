// src/tutor/credits.ts — what the tutor is told on About (mw-vtjxh4.2): every credit of ATTRIBUTION.md as a name, what it gives this reader, its
// licence and its link, so he can ask what STEPBible gives him, what MIT lets us do, or why we credit at all. ATTRIBUTION.md stays the one
// source of the credits (the About screen is built from it); this is the short form the request can afford (the grist's record is capped, the
// request carries MAX_CREDITS_BYTES of it at most), and tests/unit/credits-for-tutor.test.tsx fails when the two drift: every bullet of
// ATTRIBUTION.md has a credit here, and every credit's name, licence and link are found in the bullet it comes from.
import type { ScreenCredit } from './screen';

/** The most the credits weigh as JSON in UTF-8, so the screen, his words and a little history still fit MAX_REQUEST_BYTES (src/services/talk.ts). */
export const MAX_CREDITS_BYTES = 9930;

/** One line of the sheet a Septuagint chapter's header opens (mw-u2w5klk.276): what is credited, in plain words, and a link where there is one. The one place the sheet's text is written. */
export interface SeptuagintSource {
  label: string;
  text: string;
  link?: { href: string; name: string };
}

export const SEPTUAGINT_SOURCES: SeptuagintSource[] = [
  { label: 'Greek', text: 'Henry Barclay Swete, The Old Testament in Greek (Cambridge, 1887 to 1894; the 1909 to 1912 printing), following Codex Vaticanus, public domain.' },
  { label: 'English', text: "Sir Lancelot Brenton's 1844 translation of the Septuagint, in eBible's 2012 edition with modernised spelling (eng-lxx2012), public domain. Brenton did not translate Swete's edition: he translated the Vatican text, the Sixtine Roman edition of 1587, built on Codex Vaticanus, decades before Swete's edition (1887 to 1894), which also follows Vaticanus. So his English can differ from the Greek shown, in a word or in where a verse begins, and Lampas maps his verses onto Swete's." },
  {
    label: "The words' lemma and parsing",
    text: "Lampas's own, MIT. The method:",
    link: { href: 'https://github.com/Jonathan-A-White/lampas/blob/main/docs/lxx-derivation.md', name: 'docs/lxx-derivation.md' },
  },
  { label: 'Versification', text: "The Greek chapters and verses laid on Lampas's: STEPBible TVTMS, CC BY 4.0." },
];

/** The bullets of ATTRIBUTION.md that credit one Logos sermon source ('... in Logos: titles, passages and links, listed and opening only for an owner.'): the tutor is told ONE credit for all of them, not one each (mw-qtu3zvz.236,
 *  his choice, 2026-11-20), so any number of sources fits the request ceiling. A new Logos sermon source adds its bullet to ATTRIBUTION.md and nothing here. */
export const LOGOS_SERMON_BULLET = /in Logos: titles, passages and links, listed and opening only for an owner/;

/** The one credit for the Logos sermon family. It has no bullet of its own: each bullet LOGOS_SERMON_BULLET matches is one of its sources (tests/unit/credits-for-tutor.test.tsx). */
export const LOGOS_SERMONS_CREDIT: ScreenCredit = {
  name: 'Logos sermon archives',
  use: 'The sermon lists, if on: titles, passages, links into your Logos; each is switched under Sermon sources',
  licence: 'yours; nothing copied',
  link: 'https://www.logos.com',
};

/** The credits as the tutor is told them: any credit of the Logos sermon family (the family's link, licence and a use that begins 'The sermon list') is the one family credit, at the first one's place. */
export function creditsForTutor(credits: readonly ScreenCredit[]): ScreenCredit[] {
  const inFamily = (c: ScreenCredit): boolean => c.link === LOGOS_SERMONS_CREDIT.link && c.licence === LOGOS_SERMONS_CREDIT.licence && c.use.startsWith('The sermon list');
  const first = credits.findIndex(inFamily);
  return credits.flatMap((c, i) => (!inFamily(c) ? [c] : i === first ? [LOGOS_SERMONS_CREDIT] : []));
}

export const CREDITS: ScreenCredit[] = [
  { name: 'Majority Standard Bible', use: 'The New Testament\'s Greek, aligned to the English', licence: 'Public domain', link: 'https://majoritybible.com' },
  { name: 'Recording: Majority Standard Bible', use: 'The English read aloud in David\'s voice, streamed; verse timings are ours', licence: 'Public downloads; text public domain', link: 'https://openbible.com/audio.htm' },
  { name: 'Berean Standard Bible', use: 'The Old Testament\'s Hebrew aligned to the English', licence: 'Public domain', link: 'https://berean.bible/licensing.htm' },
  { name: 'byztxt', use: 'The variant readings and sentence ends', licence: 'Public domain', link: 'https://github.com/byztxt/byzantine-majority-text' },
  { name: 'Byzantine Priority', use: 'Robinson\'s essay, read on the Preface', licence: 'Public domain', link: 'https://byzantinetext.com/study/editions/robinson-pierpont/' },
  { name: 'TBESG', use: 'Greek lemmas, glosses, the parts of a compound word; TAGNT: variants, the Septuagint\'s parsing; TBESH: Hebrew', licence: 'CC BY 4.0', link: 'https://www.stepbible.org' },
  { name: 'Swete\'s Septuagint', use: 'The Greek Old Testament (Swete), with its transliteration', licence: 'Public domain; packaging GPL-3.0', link: 'https://github.com/eliranwong/LXX-Swete-1930' },
  { name: 'LXX2012', use: 'The Septuagint\'s English (Brenton, of the Vatican text, not Swete\'s)', licence: 'Public domain', link: 'https://ebible.org/eng-lxx2012/' },
  { name: 'Learn to Read New Testament Greek', use: 'Lesson titles, for links', licence: 'nothing copied', link: 'https://books.google.com/books/about/Learn_to_Read_New_Testament_Greek.html?id=41j7siCRS0QC' },
  { name: 'Biblical Hebrew Step by Step', use: 'Lesson titles, for links', licence: 'nothing copied', link: 'https://books.google.com/books/about/Biblical_Hebrew_Step_by_Step.html?id=-qeAAAAAIAAJ' },
  { name: 'Bible Mapper', use: 'Maps of a chapter\'s places, and a link to his timeline', licence: 'free non-commercial, credited', link: 'https://biblemapper.com' },
  { name: 'Spurgeon\'s sermons', use: 'The sermon list: titles, passages, links; the words Lampas reads aloud', licence: 'Public domain; CCEL\'s terms', link: 'https://ccel.org/ccel/spurgeon' },
  { name: 'Matthew Henry\'s sermons', use: 'The sermon list: titles, passages, links', licence: 'Public domain; Archive\'s terms', link: 'https://archive.org' },
  { name: 'Life Bible Ministry', use: 'The sermon list: titles, passages, links and videos of Through the Bible', licence: 'Free; no terms stated', link: 'https://www.lifebibleministry.com/through-the-bible' },
  { name: 'Bible Thinker', use: 'The sermon list: titles, passages, links and videos of Mike Winger\'s teachings', licence: 'No terms stated', link: 'https://biblethinker.org/mark/' },
  { name: 'The Martyn Lloyd-Jones Trust', use: 'A link from each chapter\'s sermon list to the Trust\'s own sermon search; nothing copied', licence: 'Its terms forbid copying its sermons', link: 'https://www.mljtrust.org/sermons/' },
  LOGOS_SERMONS_CREDIT,
  { name: 'Enduring Word', use: 'A link to the chapter\'s commentary by David Guzik; no words kept', licence: 'Linking needs no permission', link: 'https://enduringword.com' },
  { name: 'Thompson Chain Topics', use: 'The themes of a verse: topics, parts, passages', licence: 'Public domain', link: 'https://crosswire.org/study/fulllibrary.jsp?show=TCR' },
  { name: 'Torrey\'s New Topical Textbook', use: 'The themes of a verse: topics, parts, passages', licence: 'Public domain', link: 'https://crosswire.org/study/fulllibrary.jsp?show=Torrey' },
  { name: 'eSpeak NG', use: 'The sound of ὁ and of δ\'', licence: 'GPL-3.0', link: 'https://github.com/espeak-ng/espeak-ng' },
  { name: 'IPA', use: 'The symbols of the IPA course', licence: 'none needed; a standard', link: 'https://www.internationalphoneticassociation.org' },
  { name: 'Biblical Mastery Academy', use: 'Inspired the path and its order; nothing of theirs is copied', licence: 'none taken; nothing copied', link: 'https://biblicalmastery.academy/' },
  { name: 'Gentium Plus', use: 'The Greek type of the reader', licence: 'SIL OFL 1.1', link: 'https://software.sil.org/gentium/' },
  { name: 'Noto Serif Hebrew', use: 'The Hebrew type', licence: 'SIL OFL 1.1', link: 'https://github.com/notofonts/hebrew' },
  { name: 'Literata', use: 'English fonts, with Atkinson, Lexend', licence: 'SIL OFL 1.1', link: 'https://github.com/googlefonts/literata' },
  { name: 'React', use: 'The interface library', licence: 'MIT', link: 'https://react.dev/' },
  { name: 'Dexie', use: 'Keeps your data on the phone', licence: 'Apache-2.0', link: 'https://dexie.org/' },
  { name: 'bsv-kit', use: 'The licence gate and tutor payments', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/bsv-kit' },
  { name: 'BSV SDK', use: 'Keys and signatures under bsv-kit', licence: 'Open BSV License', link: 'https://github.com/bsv-blockchain/ts-stack/tree/main/packages/sdk' },
  { name: 'pwa-kit', use: 'Updates, tips, settings; learn-kit\'s graph', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/pwa-kit' },
  { name: 'voice-kit', use: 'Read aloud, hold to talk, Hands-free tap and mark', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/voice-kit' },
  { name: 'Hey Lampas wake word', use: 'Trained on LibriSpeech (train-clean-100, dev-clean, test-clean), VCTK, Coqui VITS, coqui-tts, PyTorch, torchaudio, NumPy, eSpeak NG, FFmpeg, CVSD, wake-probe', licence: 'MIT; LibriSpeech and VCTK CC BY 4.0', link: 'https://github.com/Jonathan-A-White/voice-kit/tree/main/packages/wake' },
  { name: 'audible-kit', use: 'The Audible app link and its chapter list', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/audible-kit' },
  { name: 'react-markdown', use: 'Draws the tutor\'s answers, with remark-gfm', licence: 'MIT', link: 'https://github.com/remarkjs/react-markdown' },
  { name: 'node-qrcode', use: 'The key as a QR code', licence: 'MIT', link: 'https://github.com/soldair/node-qrcode' },
  { name: 'Workbox', use: 'Lets Lampas open offline', licence: 'MIT', link: 'https://developer.chrome.com/docs/workbox' },
  { name: 'WhatsOnChain', use: 'Checks your key holds a licence', licence: 'none needed; public API', link: 'https://whatsonchain.com' },
  { name: 'Sermon index', use: 'Sermon rows and search; Morning RePhil list; no key sent', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/sermon-index' },
  { name: 'Postern', use: 'Carries your questions and pictures to the tutor', licence: 'MIT', link: 'https://github.com/Jonathan-A-White/postern' },
  { name: 'Twilio Verify', use: 'Sends the codes for a licence', licence: 'none needed; its terms', link: 'https://www.twilio.com/en-us/user-authentication-identity/verify' },
  { name: 'Claude', use: 'The tutor\'s model; pictures, drills, diagrams', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude' },
  { name: 'YouTube and Subsplash', use: 'Their own players play a video sermon in the Sermons sheet', licence: 'none needed; their terms apply', link: 'https://www.youtube.com' },
  { name: 'Logos Bible Software', use: 'If on: links into your Logos, its Atlas, Commentary and sermon archives', licence: 'yours; nothing copied', link: 'https://www.logos.com' },
  { name: 'Audible', use: 'Opens The Word of Promise in your Audible', licence: 'yours; nothing copied', link: 'https://www.audible.com' },
  { name: 'Blue Letter Bible', use: 'Links a word to its Strong\'s entry', licence: 'its terms; links only', link: 'https://www.blueletterbible.org' },
  { name: 'STEPBible', use: 'Tyndale House data, TVTMS verse map; Strong\'s links', licence: 'CC BY 4.0; links', link: 'https://www.stepbible.org' },
  { name: 'Web Speech API', use: 'Your phone\'s voices speak and hear', licence: 'a web standard', link: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API' },
  { name: '$P recognizer', use: 'Checks a letter you write by its shape', licence: 'none needed; a method', link: 'https://depts.washington.edu/acelab/proj/dollar/pdollar.html' },
  { name: 'The Well-Trained Mind', use: 'Copywork, narration, dictation, summary', licence: 'none needed; a method', link: 'https://welltrainedmind.com/' },
  { name: 'Beads', use: 'How the factory keeps its work, with Gas Town', licence: 'MIT', link: 'https://github.com/steveyegge/beads' },
  { name: 'Claude Code', use: 'Writes most of the code', licence: 'none needed; its terms', link: 'https://www.anthropic.com/claude-code' },
  { name: 'Vite', use: 'Builds the app, with vite-plugin-pwa', licence: 'MIT', link: 'https://vite.dev' },
  { name: 'Tailwind CSS', use: 'The styling; TypeScript', licence: 'MIT', link: 'https://tailwindcss.com' },
  { name: 'Vitest', use: 'Tests it, with Playwright, axe-core', licence: 'MIT', link: 'https://vitest.dev' },
  { name: 'Morpheus', use: 'A build tool; never in the app', licence: 'MPL-2.0', link: 'https://github.com/perseids-tools/morpheus' },
];
