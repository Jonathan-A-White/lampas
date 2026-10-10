# Attribution

> If I have seen further it is by standing on the shoulders of Giants.
> — Isaac Newton, letter to Robert Hooke, 1675

Lampas stands on other people's work, so it names every text, lexicon, library, font, service and idea it
builds on, with a link to each, its licence and what we changed. Credit is owed whether or not a licence asks for it.
Tap the round Ask the tutor button to ask what any of it gives you, what its licence lets us do, or why we credit it at all.

## Texts and data

- **[Majority Standard Bible (MSB), New Testament tables](https://majoritybible.com).** Public domain. Byzantine Greek word-aligned
  to the MSB English, with Strong's numbers and Robinson-Pierpont parsing codes: the text and the English you read.
  Source: the msb_nt_tables.tsv file at majoritybible.com. Its Greek is the Robinson-Pierpont 2005 edition (public domain), found by comparing it word by word
  with the [byztxt Byzantine text on GitHub](https://github.com/byztxt/byzantine-majority-text), also public domain (scripts/greek-edition.ts, docs/greek-edition.md); nothing of that repository is in the app.
  Changes: cut into one file per chapter, with short keys (scripts/data-build.ts, docs/data.md).
- **[Maurice A. Robinson, "The Case for Byzantine Priority"](https://byzantinetext.com/study/editions/robinson-pierpont/).** Public domain. The text read in the app is the appendix
  of the Robinson-Pierpont 2005 edition (pp. 533 to 586), whose copyright notice says: "we hereby release into the public domain the introduction and appendix which have been especially prepared for this edition"
  (the same notice is on the edition's page there). It is that appendix, not the article *TC: A Journal of Biblical Textual Criticism* published in 2001: the two differ (Robinson
  revised the essay for the book), so the 2001 article, which that release does not cover, is only linked, never copied. Compared (mw-5r3p30.162): the 2005 text has 168 footnotes to the journal's 167, opens with a note on where the essay was first
  presented, and numbers its principles in the text where the journal numbered paragraphs 1 to 113; it differs in wording throughout ("predominated among the Greek-speaking world" for the journal's "in the Greek-speaking world",
  "can more easily account for the rise and dominance" for "explain", and many longer rewrites).
  Source: [the appendix as a PDF from the editors’ site](https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-11-appendix.pdf), checked against the page images of the edition's
  [scan at the Internet Archive](https://archive.org/details/RP2005KoineGreekNTinByzantineTextform).
  Changes: the PDF's Greek, typed in Latin letters, is set in Greek letters (the PDF's text has no accents, so the Greek here has none); the signs the PDF draws as pictures for the papyri, aleph and the Majority text
  are the letters 𝔓, ℵ and 𝔐; footnotes open under the paragraph that cites them; Chart 1 is left in the edition; the list of abbreviations (p. 587) is not carried
  (scripts/essay-build.ts, src/essay/robinson.json). The 2001 article stays linked as "Original (TC Journal, 2001)", as the older text.
- **[Tyndale House's Brief lexicon of the Greek NT, extended (TBESG), from STEPBible](https://www.stepbible.org).** Licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit: STEPBible, Tyndale House, Cambridge. The words' lemmas,
  glosses and definitions (the definitions are Abbott-Smith's). Data used under the licence.
  Changes: per Strong's number only the first entry is used, with its lemma and gloss as given; the
  Abbott-Smith definition has its markup, scripture references and daggers removed and is cut near 300
  characters (scripts/data-build.ts, docs/data.md).
- **[Biblical Mastery Academy](https://biblicalmastery.academy/).** The order in which the BMA Tutor grammar approach teaches Greek
  follows the sequence of the Greek Success Path of Biblical Mastery Academy. Only the sequence is followed: the lesson titles,
  the method and the drills in Lampas are its own, and no course text, image or exercise is copied.

## Type

- **[Gentium Plus](https://software.sil.org/gentium/)** by SIL International, the Greek type of the reader. Licence:
  [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/), Copyright (c) 2003-2022 SIL International;
  the licence text is in `src/fonts/OFL.txt`. The Greek and Greek Extended subsets are bundled as the
  @fontsource/gentium-plus 5.3.0 builds. Changes: none.
- **[Noto Serif Hebrew](https://github.com/notofonts/hebrew)** by the Noto Project Authors, the Hebrew type of the tutor's answers. Licence:
  [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/), Copyright 2022 The Noto Project Authors;
  the licence text is in `src/fonts/OFL-noto-serif-hebrew.txt`. The Hebrew subset (letters, points and accents; 400 and 700) is bundled as the
  @fontsource/noto-serif-hebrew 5.3.0 builds. Changes: none.

## Libraries the app runs on

- **[React](https://react.dev/)** (`react`, `react-dom`). The interface library, from Meta and the React community.
  Licence: [MIT](https://github.com/facebook/react/blob/main/LICENSE). Changes: none.
- **[Dexie](https://dexie.org/)** (`dexie`, `dexie-react-hooks`) by David Fahlander. Keeps your words, answers and settings on the phone
  (IndexedDB). Licence: [Apache-2.0](https://github.com/dexie/Dexie.js/blob/master/LICENSE). Changes: none.
- **[bsv-kit](https://github.com/Jonathan-A-White/bsv-kit)** (`bsv-kit`) by Jonathan A. White. The licence gate, the tutor's payments
  and messages, and What's new (the Update ready banner's line, the sheet after an update, the list of versions in About and its Check for updates button), and read aloud (the sentence queue, the Pause, Resume, Restart and Stop bar, `bsv-kit/speech`), and the way you ask the tutor about a verse (the big Hold to ask bar with your words as you speak, and Type a question beneath it, `bsv-kit/composer`, lifted from Postern's message composer); in our tests, its honest speech and microphone fakes (`bsv-kit/testing`, whose two clips are spoken by
  [eSpeak NG](https://github.com/espeak-ng/espeak-ng)). Licence: [MIT](https://github.com/Jonathan-A-White/bsv-kit/blob/main/LICENSE). Changes: none.
- **[BSV SDK](https://github.com/bsv-blockchain/ts-stack/tree/main/packages/sdk)** (`@bsv/sdk`) by the BSV Association. Keys, signatures
  and transactions under bsv-kit. Licence: [Open BSV License](https://github.com/bsv-blockchain/ts-stack/blob/main/packages/sdk/LICENSE.txt).
  Changes: none.
- **[react-markdown](https://github.com/remarkjs/react-markdown)** (`react-markdown`) by Titus Wormer and the unified collective. Draws the
  tutor's answers, which are written in Markdown. Licence: [MIT](https://github.com/remarkjs/react-markdown/blob/main/license). Changes: none.
- **[remark-gfm](https://github.com/remarkjs/remark-gfm)** (`remark-gfm`) by Titus Wormer and the unified collective. Tables, lists and
  strike-through in those answers. Licence: [MIT](https://github.com/remarkjs/remark-gfm/blob/main/license). Changes: none.
- **[Workbox](https://developer.chrome.com/docs/workbox)** (`workbox-precaching`, `workbox-routing`, `workbox-strategies`) from Google Chrome.
  The service worker that lets Lampas open with no signal. Licence: [MIT](https://github.com/GoogleChrome/workbox/blob/v7/LICENSE). Changes: none.

## Services and apps

- **[WhatsOnChain](https://whatsonchain.com)**. A public Bitcoin SV block explorer. Lampas asks it whether your phone's key holds a Lampas
  licence. Licence: none needed, it is a service used through its public API and no code or data is copied; its [terms](https://whatsonchain.com/terms) apply. Changes: none.
- **[Postern](https://github.com/Jonathan-A-White/postern)** and its mill, by Jonathan A. White. Carries your questions to the tutor, with any pictures you attach, and
  its answers back. Licence: [MIT](https://github.com/Jonathan-A-White/postern/blob/main/LICENSE). Changes: none.
- **[Claude](https://www.anthropic.com/claude)** by Anthropic. The model behind the tutor's answers (including its reading of the pictures you send it), the reading check, the tips and the help with filling in a form.
  Licence: none needed, it is a service used through the mill; its [terms](https://www.anthropic.com/legal/consumer-terms) apply. Changes: none.
- **[Logos Bible Software](https://www.logos.com)** and **[Accordance](https://www.accordancebible.com)**. Only if you switch them on in
  Settings: Lampas links to a word or a verse in the app you already own, and offers a link to the app's page in your phone's store if you do not have it yet. No text, image or data is taken from either. Their own licences are yours.
- **[Blue Letter Bible](https://www.blueletterbible.org)** and **[STEPBible](https://www.stepbible.org)**. Links from a word to its Strong's
  entry, if you switch Strong's on. Links only: nothing is copied. Their own terms apply.
- **[Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API)**. Your phone's own voices speak the Greek and English and its
  recogniser hears you; Lampas ships no voice. The API is a web standard; the voices are your phone's and its maker's.

## Ideas and tools we borrowed

- **[Beads](https://github.com/steveyegge/beads)** and **[Gas Town](https://github.com/steveyegge/gastown)** by [Steve Yegge](https://github.com/steveyegge). The way the
  factory that builds Lampas keeps its work: small tracked tasks, and agents that take them one at a time. Licence:
  [MIT](https://github.com/steveyegge/beads/blob/main/LICENSE) (Beads), [MIT](https://github.com/steveyegge/gastown/blob/main/LICENSE) (Gas Town).
  Changes: our factory, [millwright](https://github.com/Jonathan-A-White/millwright), uses the ideas in its own code.
- **[Logos Bible Software](https://www.logos.com)**'s verse pop-up. The idea of the card a Bible reference in the tutor's answer opens before it takes you
  there: the reference, the verse and an Open button. Only the idea is borrowed: the card is our own, and nothing is
  taken from Logos. Licence: none needed, it is an idea. Changes: none.
- **[Claude Code](https://www.anthropic.com/claude-code)** by Anthropic. Writes most of Lampas's code and the files of its lamp icon and
  memory pictures, under Jonathan's direction. Licence: none needed, it is a tool; Anthropic's [terms](https://www.anthropic.com/legal/commercial-terms) apply.
  Changes: none.

## What built it

- **[Vite](https://vite.dev)** ([MIT](https://github.com/vitejs/vite/blob/main/LICENSE)),
  **[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa)** ([MIT](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/LICENSE)),
  **[Tailwind CSS](https://tailwindcss.com)** ([MIT](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE)) and
  **[TypeScript](https://www.typescriptlang.org/)** ([Apache-2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt)) build the
  app you are holding, and **[Vitest](https://vitest.dev)** ([MIT](https://github.com/vitest-dev/vitest/blob/main/LICENSE)) and
  **[Playwright](https://playwright.dev)** ([Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE)) test it.
  Changes: none.
