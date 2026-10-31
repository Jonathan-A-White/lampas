# Sources probe: a Septuagint and a Webster's 1828 of Lampas's own

Story mw-cbsbw9q.1 (epic mw-cbsbw9q). Written 2026-10-31 (UTC). Research only: no app code and no Septuagint or dictionary data
changed or committed. Everything was fetched into a temp dir (`/tmp/lxx-probe`) and read with throw-away scripts that are not kept.
Every licence below is quoted from the file named, at the commit or URL and date given. "My reading" is a reading, not legal advice.

<!-- toc -->

- [What I found](#what-i-found)
- [Licences, candidate by candidate](#licences-candidate-by-candidate)
  - [CenterBLC/LXX](#centerblclxx)
  - [eliranwong/LXX-Rahlfs-1935](#eliranwonglxx-rahlfs-1935)
  - [eliranwong/LXX-Swete-1930](#eliranwonglxx-swete-1930)
  - [eBible grclxx (Greek)](#ebible-grclxx-greek)
  - [Brenton 1851 (eBible, eng-Brenton)](#brenton-1851-ebible-eng-brenton)
  - [LXX2012 (eBible, eng-lxx2012)](#lxx2012-ebible-eng-lxx2012)
  - [akaitsurugi/webster1828 (Webster 1828)](#akaitsurugiwebster1828-webster-1828)
  - [Webster 1913 JSON](#webster-1913-json)
- [The CCAT question](#the-ccat-question)
- [Word-level data: Gen 1:1 and Ps 23:1 (LXX Ps 22:1)](#word-level-data-gen-11-and-ps-231-lxx-ps-221)
  - [CenterBLC/LXX (Text-Fabric, `tf/1935`)](#centerblclxx-text-fabric-tf1935)
  - [eliranwong/LXX-Rahlfs-1935 (CSV files, one line per word, joined by line number)](#eliranwonglxx-rahlfs-1935-csv-files-one-line-per-word-joined-by-line-number)
  - [eliranwong/LXX-Swete-1930](#eliranwonglxx-swete-1930-1)
  - [eBible grclxx, Brenton and LXX2012 (USFM, text only)](#ebible-grclxx-brenton-and-lxx2012-usfm-text-only)
- [Versification](#versification)
- [The Webster 1828 CSV](#the-webster-1828-csv)
- [Recommendations and the main risk](#recommendations-and-the-main-risk)

<!-- /toc -->

## What I found

- **No Septuagint with word data (lemma, parsing, gloss) is cleanly free.** The only one with all of it, CenterBLC/LXX, says MIT, but
  it is a conversion of eliranwong's Rahlfs data, which is a conversion of the CCAT/CATSS data, and CCAT's own terms forbid commercial use
  and require every recipient to be registered. The MIT line cannot lift that (see 'The CCAT question').
- **Swete's Septuagint (public domain text) and eBible's grclxx are plain text**: no lemma, no parsing, no Strong's, no gloss.
- **English is easy:** Brenton 1851 and LXX2012 (Brenton, American spelling) are public domain, both on eBible as USFM.
- **Versification differs from Lampas's in every passage asked about**, but a free mapping table exists: STEPBible's TVTMS (CC BY 4.0), with a
  Greek column and a Brenton column.
- **Webster 1828:** the akaitsurugi CSV has 62,391 entries, none empty, 144 bare stubs (headword and pronunciation only) and 586 words the
  author lists as still to be added. Licence CC BY-SA 4.0 on GitHub and, identically, on Codeberg (the Codeberg copy is archived).
  2,583 entries cite a Bible book. I could not compare with how Logos shows an entry: the repo holds no Logos screenshot and no entry text.

## Licences, candidate by candidate

"Free public web app" means Lampas as it is: free to read, served at https://lampas.allmymind.org. "Commercial too" means the same
data in a paid or monetised app (Lampas's licence gate unlocks the AI, so the Governor may want the answer for that case).

| Candidate | Licence as stated | Free public web app | Commercial too |
| --- | --- | --- | --- |
| CenterBLC/LXX | MIT (LICENSE), but built on CCAT data | MIT says yes; CCAT says no (see below) | MIT says yes; CCAT says no |
| eliranwong/LXX-Rahlfs-1935 | CC BY-NC-SA 4.0 + CCAT user declaration (README) | No: CCAT item (3) needs access control and registration | No (NC) |
| eliranwong/LXX-Swete-1930 | GPL-3.0 (LICENSE); Swete's text public domain (README) | Yes, with GPL duties on the data | Yes, with GPL duties |
| eBible grclxx | "Public Domain ℗ Orthodox Media Network" + a condition | Probably yes; the wording is ambiguous | Probably yes; ambiguous |
| Brenton 1851 (eBible) | "Published in 1851, and now in the Public Domain." | Yes | Yes |
| LXX2012 (eBible) | Public domain, edits dedicated to it by the editor | Yes | Yes |
| akaitsurugi/webster1828 | CC BY-SA 4.0 (LICENSE) | Yes, credit + share-alike on the data | Yes, same duties |
| Webster 1913 JSON | No licence file; Gutenberg #29765 text | Yes (Gutenberg text, no restriction stated) | Yes |

### CenterBLC/LXX

Fetched https://github.com/CenterBLC/LXX at commit `4829f3746c84d75576702498e75a68856358f289` (2022-02-10), 2026-10-31. `LICENSE`:

> MIT License
>
> Copyright (c) 2021 CenterBLC
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software [...]

Its `README.md` says where the data comes from:

> As a direct source for the CBLC version of RLXX1935 we have used Eliran Wong's work on the RLXX1935 (https://github.com/eliranwong/LXX-Rahlfs-1935). His work is based on the data available at the Computer Assisted Tools for Septuagint Studies (CATSS) at the University of Pennsylvania (http://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph).

It adds: "we have added the Greek dictionary entry forms and English as found in the BibleOL (https://bibleol.3bmoodle.dk/). For licenses, please consult https://github.com/EzerIT/BibleOL."
BibleOL's own README says "Except where otherwise indicated, the software in this repository is made available under The MIT License [...] For details about special licenses for parts of this software, please consult Chapter 7 of the file techdoc/techdoc.pdf" (read 2026-10-31; GitHub shows its licence as "Other"; I did not read the techdoc, so the BibleOL gloss terms are unconfirmed).
`docs/about.md` (the provenance page) says only "provenance information will come here" and a CCAT URL. Verdict in 'The CCAT question'.

### eliranwong/LXX-Rahlfs-1935

Fetched at commit `a1b5ff1c739f93cdd18dbab4c9e3fc6b1043141c` (2020-01-25), 2026-10-31. There is no LICENSE file (GitHub shows none); the terms are in `README.md`:

> LXX-Rahlfs-1935 by Copyright 2017 Eliran Wong is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. Based on a work at http://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph/.

> Due to the restrictive nature of the CCAT license, the original text of the Septuagint (in betacode format) may be downloaded from the CCAT website [here]. As a measure to control access of data related to CCAT materials, readers have to agree sending CCAT user declaration before downloading any data from this repository. Please do not download if you do not agree.

> Requirement for use of original CATSS data: users or receiptents of original CATSS data have to fill in user declaration available in CATSS website listed below and send to CATSS

It also thanks "Jonathan Robie, who advised on licensing", and takes Strong's numbers and lexemes from the Open Scriptures "Septuagint Project" (`openscriptures/GreekResources`, which has a LICENSE file I did not read) and morphology patches from James Tauber.

### eliranwong/LXX-Swete-1930

Fetched at commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33` (2017-06-17), 2026-10-31. `LICENSE` is the full GNU General Public License v3 (35,141 bytes, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"). `README.md`:

> Source of Swete's text: supplied by Pasquale Amicarelli, prevously copmiled by Pasquale Amicarelli as a bibleworks module
>
> Public domain source: Vol I https://archive.org/details/theoldtestamenti00unknuoft [...]

Swete's 1909-1912 edition is public domain by age; the GPL is eliranwong's packaging. The BibleWorks-module transcription's own rights are not stated (a risk, small).
My reading: the data can be shipped, free or paid, on GPL terms (keep the licence and notice, offer the source of the data files; Lampas's repo is already public). Whether the GPL then reaches Lampas's code is the usual data-versus-program question; I read data files fetched at runtime as a separate work, but that is the Governor's to weigh.

### eBible grclxx (Greek)

https://ebible.org/find/details.php?id=grclxx and https://ebible.org/grclxx/copyright.htm, fetched 2026-10-31 (source files dated 2026-02-13). The details page says "public domain"; the copyright page says:

> Public Domain ℗ Orthodox Media Network [...] We have never claimed copyright or demanded takedowns of these reproductions — because our goal is not profit, but the free and faithful dissemination of the Word of God and the blessing it brings to the world. We welcome anyone that would like to publicly share our work with the only condition to publish the present text as a minimum respect to our mission.

Two things are unsettled: "℗" is the sound-recording mark (the text is a recording-backed edition), and "the only condition to publish the present text" can be read as "publish it whole". The page names no Greek edition. It is not Rahlfs: it has Mal 3 and Mal 4 as separate chapters (English numbering) and capitalised first words (`ΕΝ ἀρχῇ`, `ΚΥΡΙΟΣ ποιμαίνει με`), which reads like an Orthodox church edition. A one-line email to Orthodox Media Network would settle the licence.

### Brenton 1851 (eBible, eng-Brenton)

https://ebible.org/eng-Brenton/copyright.htm, fetched 2026-10-31: "Translation of the Greek Septuagint into English by Sir Lancelot Charles Lee Brenton. Published in 1851, and now in the Public Domain." (HTML generated from source files dated 2026-10-07). The same page says the file is the translation without the original poetry formatting or notes; it has footnotes in USFM (`\f`).
Yes to both a free and a commercial app. Credit eBible and Brenton.

### LXX2012 (eBible, eng-lxx2012)

https://ebible.org/find/details.php?id=eng-lxx2012, fetched 2026-10-31 (last updated 2026-03-12): "Public Domain" and:

> The Septuagint with Apocrypha, translated from Greek to English by Sir Lancelot C. L. Brenton and published in 1885, with some language updates (American English) [...] These language updates are dedicated to the Public Domain by the author of those edits, Michael Paul Johnson. Therefore this edition may be freely copied, published, etc.

Yes to both. (The page says 1885 in one line and 1851 in another; Brenton's work is old enough either way.) It is Brenton with American spelling, bracketed Additions embedded in verses, and `\add` marks for supplied words.

### akaitsurugi/webster1828 (Webster 1828)

Fetched https://github.com/akaitsurugi/webster1828 at commit `b52403774b5b24d01377bbab29f642be226e9bb4` (2026-10-01; shallow clone, one commit), 2026-10-31. `LICENSE` begins "Attribution-ShareAlike 4.0 International" (the full CC BY-SA 4.0 legal text, 20,139 bytes); the GitHub API reports `cc-by-sa-4.0`. `README.md` states no licence of its own.
The Mayor's research said the Codeberg copy states none. It does: https://codeberg.org/akaitsurugi/webster1828/raw/branch/master/LICENSE (2026-10-31) is byte-identical to the GitHub file. The Codeberg repo is marked "Read-only archive. Please see https://github.com/akaitsurugi/ or https://akaitsurugi.org/ for an updated repo."
The 1828 text itself is public domain by age; the CC BY-SA can bind only the compiler's changes (the HTML markup, normalised citations, fixes). Yes to a free and a commercial app: credit the repo, link the licence, and publish any adapted version of the *dictionary data* under CC BY-SA 4.0 (the app's code is not an adaptation, my reading).
One provenance flag: the text of LOVE in the CSV is word for word the text on https://webstersdictionary1828.com/Dictionary/love (a MasonSoft Technology Ltd site, "© Copyright 2026"), including the normalised citations ("Matthew 22:37"). The CSV's README does not say where its text came from. The 1828 words are free; the risk is only that a later claim is made about that site's digitisation.

### Webster 1913 JSON

https://github.com/matthewreagan/WebstersEnglishDictionary at commit `6fb9c92420c3a323e74ffb9d577409f4431cc42a` (2022-09-10), 2026-10-31. There is no LICENSE file and GitHub shows none. Its README: "*Webster's Unabridged English Dictionary* (from the Project Gutenberg, compiled August 22, 2009)", ebook #29765. The Gutenberg page (https://www.gutenberg.org/ebooks/29765, 2026-10-31) says:

> This eBook is for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at www.gutenberg.org.

My reading: free and commercial use is fine for the dictionary text (Gutenberg's licence applies to the PG name; a published public-domain text without it is free), and the JSON repo adds only a format. It is a different dictionary (1913, 102,217 entries, a later revision by other hands; its LOVE and GRACE are different texts; see the Webster section).

## The CCAT question

**What CCAT's terms say.** The Penn page http://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph/ (listing live 2026-10-31; its `*web-version.html` points to http://en.katabiblon.com/us/index.php?text=LXX). `0-user-declaration.txt` (version 050215, 2005-02-16):

> In accepting materials distributed by or through CCAT, the recipient agrees to observe the following "fair use" provisions:
> (1) Not to use or make available these materials for commercial purposes without first obtaining the written consent of the owners/encoders;
> (2) To observe any special restrictions that may govern the use of particular texts or bodies of material as stipulated in the aforementioned documentation;
> (3) To control access to these materials and require any other party to whom the recipient supplies any portion of this material to observe these conditions and to register a signed USER AGREEMENT form with CCAT;
> (4) When making formal public reference to the materials, to acknowledge appropriately the holder of the copyright to any published text that has been encoded as well as to the encoder and the source from which the machine-readable form has been obtained [...]

and `0-readme.txt` (same date): "They are not to be used, either directly or indirectly, for commercial purposes without prior written consent of the various legal authors and developers identified below. If copies are made and given to other persons for NON-COMMERCIAL use, those persons are also required to register with CCAT". It also says the LXX is "ed. A. Rahlfs (Stuttgart: Württembergische Bibelanstalt, 1935)" and that CATSS LXX "was prepared by the TLG [...] Project", and the morphology "LXXM" by CATSS under R. Kraft: so the Rahlfs edition, the TLG's keying and the CATSS morphology each have a rights-holder besides CCAT.

**Can CenterBLC's MIT stand?** No, not for the CCAT part (my reading). An MIT licence from CenterBLC covers what CenterBLC owns: its Text-Fabric conversion code and the features it made (split morphology fields, alphabetic order, frequency, sentence divisions). It cannot grant more than CenterBLC received. CenterBLC received the words, lemmas, parsing and glosses from eliranwong, who received them under CCAT's declaration with a non-commercial condition and an access-control condition. A free public web app shipping those fields to every browser meets neither (3), the registration chain, nor (1) if there is anything commercial about it. CenterBLC's own `docs/about.md` still reads "provenance information will come here", and no file in the repo mentions the CCAT declaration. The ordinary course is written consent from CCAT (Robert Kraft, the address on the declaration) and, for the Rahlfs text and its apparatus, the Deutsche Bibelgesellschaft.

## Word-level data: Gen 1:1 and Ps 23:1 (LXX Ps 22:1)

Lampas's Ps 23 is the shepherd psalm (English/Hebrew numbering). In every Greek text here that psalm is **Ps 22** (LXX numbering); Ps 23 there is "The earth is the Lord's" (Hebrew Ps 24). The tables use the Greek numbering. All counts below were measured on the cloned files.

### CenterBLC/LXX (Text-Fabric, `tf/1935`)

Features per word: `word` (accented), `lex_utf8` (lemma), `lex` (lemma transliteration), `bol_lexeme_dict` (BibleOL dictionary entry form), `morphology` (CCAT code), `sp` (part of speech, plus split `case`, `gn`, `nu`, `ps`, `tense`, `voice`, `mood`, `degree`), `strongs`, `gloss`, `bol_gloss`, `translit_SBL`, plus `freq_lemma`, `abc_order`. Empty cells are shown blank.

Gen 1:1 (slots 1-10):

| # | word | lemma | morphology | Strong's | gloss | BOL gloss |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ἐν | ἐν | P | G1722 | in | in, on, among |
| 2 | ἀρχῇ | ἀρχή | N.DSF | G746 | origin; beginning | ruler, beginning |
| 3 | ἐποίησεν | ποιέω | V.AAI3S | G4160 | do; make | do, make |
| 4 | ὁ | ὁ | RA.NSM | G3588 | the | the |
| 5 | θεὸς | θεός | N.NSM | G2316 | God | God, god |
| 6 | τὸν | ὁ | RA.ASM | G3588 | the | the |
| 7 | οὐρανὸν | οὐρανός | N.ASM | G3772 | sky; heaven | sky, heaven |
| 8 | καὶ | καί | C | G2532 | and; even | and, even, also, namely |
| 9 | τὴν | ὁ | RA.ASF | G3588 | the | the |
| 10 | γῆν | γῆ | N.ASF | G1093 | earth; land | earth, soil, land |

Ps 22:1 (slots 387121-387130; the title and the first line are one verse, as in the CCAT versification):

| # | word | lemma | morphology | Strong's | gloss | BOL gloss |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ψαλμὸς | ψαλμός | N.NSM | G5568 | psalm | psalm |
| 2 | τῷ | ὁ | RA.DSM | G3588 | the | the |
| 3 | Δαυιδ | Δαβίδ | N.DSM | G1138 | Dabid; Thavith | (absent) |
| 4 | κύριος | κύριος | N.NSM | G2962 | lord; master | lord, Lord, master, sir |
| 5 | ποιμαίνει | ποιμαίνω | V.PAI3S | G4165 | shepherd | shepherd, tend |
| 6 | με | μέ | RP.AS | G3165 | me | (absent) |
| 7 | καὶ | καί | C | G2532 | and; even | and, even, also, namely |
| 8 | οὐδέν | οὐδείς | A.NSN | G3762 | no one; not one | no one, none, nothing |
| 9 | με | μέ | RP.AS | G3165 | me | (absent) |
| 10 | ὑστερήσει | ὑστερέω | V.FAI3S | G5302 | lack; fail | am lacking, fall short, suffer need |

### eliranwong/LXX-Rahlfs-1935 (CSV files, one line per word, joined by line number)

Same words and values as CenterBLC for both verses (CenterBLC is its conversion): accented word (`01_wordlist_unicode/text_accented.csv`, also unaccented and Koine), lexeme (`12-Marvel.Bible/09-lexemes.csv`), morphology with James Tauber's patches (`03a_morphology_with_JTauber_patches/patched_623693.csv`), Strong's (`07_StrongNumber/final_Strongs.csv`), gloss (`06_English_gloss/beta.csv`, `ossp_data`), SBL transliteration (`04_SBL_transliteration`), pronunciation (`05_pronunciation`). Verse boundaries are in `08_versification/ccat/E-verse.csv` (`「Gen 1:1」` at word 1, `「Ps 22:1」` at word 387121). The gloss of ἀρχῇ is `origin; beginning`, of ποιέω `do; make`, matching CenterBLC's `gloss`. Not present: the BOL dictionary forms and BOL glosses (CenterBLC's addition), and split morphology fields (the code `N.DSF` is one string).

### eliranwong/LXX-Swete-1930

Four word files plus a verse index, one word per line, joined by line number: `01-Swete_word_with_punctuations.csv`, `02-Swete_word_without_punctuations.csv`, `03-Swete_SBL_transliterations.csv`, `00-Swete_versification.csv` (verse starts, e.g. `1 Gen.1:1`, `296697 Psa.22:1`). **Lemma, morphology, Strong's and gloss: absent** (the README lists morphology, transliteration, pronunciation and gloss as intentions; only transliteration and the text exist).

- Gen 1:1 (words 1-10): `ΕΝ ΑΡΧΗ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.` / `en archē epoiēsen ho theos ton ouranon kai tēn gēn`. The first two words are in capitals, a transcription artefact.
- Psa.22:1 (words 296697-296706): `Ψαλμὸς τῷ Δαυείδ. Κύριος ποιμαίνει με, καὶ οὐδέν με ὑστερήσει.` / `psalmos tō daueid kyrios poimainei me kai ouden me hysterēsei`. Swete spells Δαυείδ; the others Δαυιδ.

### eBible grclxx, Brenton and LXX2012 (USFM, text only)

All fields **absent** (lemma, morphology, Strong's, gloss): USFM carries verse text only (Brenton and LXX2012 have footnotes `\f` and LXX2012 `\add` for supplied words).

| Text | Gen 1:1 | the shepherd verse |
| --- | --- | --- |
| grclxx | `ΕΝ ἀρχῇ ἐποίησεν ὁ Θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.` | Ps 22:1 `Ψαλμὸς τῷ Δαυΐδ. ΚΥΡΙΟΣ ποιμαίνει με καὶ οὐδέν με ὑστερήσει.` |
| Brenton | `In the beginning God made the heaven and the earth.` | Ps 22:1 `A Psalm of David. The Lord tends me as a shepherd, and I shall want nothing.` |
| LXX2012 | `In the beginning God made the heaven and the earth.` | Ps 22:1 `The Lord tends me as a shepherd, and I shall lack nothing.` (the title is not in the verse) |

grclxx's verse 1 here comes from the `\v 1` line and the `\q1` line after it, so a parser that reads only the `\v` line would see just the title.
The Lampas side: `public/data/psa/23.json` has 6 verses and verse 1 holds the title too ("A Psalm of David. The LORD is my shepherd; I shall not want."), the TVTMS "EngTitleMerged" style.

## Versification

Lampas uses the Berean Standard Bible tables' numbering, which is the English (KJV/NRSV) numbering. I read it from `public/data/<book>/<n>.json` (verse counts below, "Lampas"). Rahlfs/CenterBLC use CCAT's numbering; Swete, grclxx, Brenton and LXX2012 each have their own.

**A mapping table exists:** STEPBible's TVTMS, https://github.com/STEPBible/STEPBible-Data/tree/master/Versification (file `TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt`, commit `be4191f0082aeedddb0eff0c02c966292b2bd641` of 2026-10-24, 29,896 lines, CC BY 4.0). Its columns are English, Hebrew, Latin and Greek ("Greek by LXX"), with extra columns for NETS and Brenton, and tests that tell which tradition a given Bible follows. eliranwong has a half-built one too (`LXX-Rahlfs-1935/08_versification`, README: "work in progress"; `map_NRSV.csv` has 6,790 rows with no header), which I would not use.

Verse counts (first..last when not 1..n), measured on the files:

| Passage | Lampas | Rahlfs / CenterBLC | Swete | grclxx | Brenton | LXX2012 |
| --- | --- | --- | --- | --- | --- | --- |
| Ps 9 | 20 | 39 | 39 | 39 | 39 | 38 |
| Ps 10 | 18 | 7 | 7 | 7 | 7 | 8 |
| Exod 35 | 35 | 31 (1..35, gaps) | 35 | 35 | 32 (1..35, gaps) | 35 |
| Exod 36 | 38 | 38 | 40 | 40 | 38 | 40 |
| Exod 37 | 29 | 21 | 21 | 21 | 21 | 21 |
| Exod 38 | 31 | 27 | 27 | 27 | 27 | 27 |
| Exod 39 | 43 | 23 | 23 | 23 | 23 | 23 |
| Exod 40 | 38 | 32 (1..38, gaps) | 32 | 32 | 32 (1..38, gaps) | 31 (1..38, gaps) |
| Dan 3 | 30 | 97 | 100 | 33 + a separate Song of the Three (`S3Y`, 67) | 95 (1..97, gaps) | 33 + `S3Y` 67 |
| Esther | 10 chapters, 1: 22 ... 9: 32 | 10 chapters, Additions as lettered sub-verses (1:1k-1s, 4:17k-17l, 10:3k-3l) | 10 chapters, plain numbers, no lettered verses | 10 chapters, Additions as Greek-lettered verses (`1α`, `1β` ...) | 10 chapters, Additions as lettered verses (`1b`, `4:17z`) | 10 chapters, Additions bracketed inside the nearest verse (3:13, 8:13), no letters |
| Mal | 4 chapters (3: 18, 4: 6) | 3 chapters (3: 24) | 4 chapters (3: 18, 4: 6) | 4 chapters (3: 18, 4: 6) | 3 chapters (3: 24) | 4 chapters (3: 18, 4: 6) |

Jeremiah 25-51 is the largest difference, not a numbering offset. The Greek Jeremiah is in a different order and its chapters are shorter. TVTMS rows: Hebrew 25:15-38 is Greek 32:1-24, Hebrew 26 is Greek 33, Hebrew 27 starts Greek 34; the oracles against the nations (Hebrew 46-51) stand early, at Greek 26-31 (`Jer.46:1-28` = Greek `26:1-28`, `Jer.47:1-7` = `29:1-7`, `Jer.48:1-44` = `31:1-44`, `Jer.50:1-46` = `27:1-46`, `Jer.51:1-64` = `28:1-64`; Hebrew 49 is cut up and spread: `49:34-39` = Greek `25:14-19`, `49:7-22` = `29:8-23`, `49:28-33` = `30:6-11`, `49:23-27` = `30:12-16`, `49:1-5` = `30:17-21`). Greek verse counts, Rahlfs/CenterBLC: 25: 20, 26: 26 (numbered 2..28), 27: 46, 28: 60 (1..64), 29: 7, 30: 32 (1..33), 31: 44, 32: 25 (13..38), 33: 24, 34: 17 (2..22), 35: 17, 36: 27, 37: 20, 38: 40 ... 51: 35; Swete and grclxx have the same shape (Swete 25: 19, 26: 28, 28: 64), and Brenton and LXX2012 follow the Greek order too. Lampas: 25: 38, 26: 24, 27: 22, ... 46: 28, 47: 7, 48: 47, 49: 39, 50: 46, 51: 64. So a Jeremiah chapter in one text and the same number in the other are mostly not the same text, and TVTMS is needed for the whole book.

Per passage, in short (TVTMS rows quoted):

- **Ps 9-10.** Hebrew and English split the acrostic at Ps 9/10; Greek joins them: Hebrew Ps 10:1-18 = Greek Ps 9:22-39 (TVTMS: `Psa.10:1-18 | Psa.10:1-18 | Psa.9:22-39 | Psa.9:22-39`), so the Greek Psalms from 10 to 112 are one number lower than Lampas's (Greek 10 = Hebrew 11, Greek 22 = Hebrew 23), Greek 113 is Hebrew 114 and 115 together (26 verses), Greek 114 and 115 are Hebrew 116:1-9 and 116:10-19, Greek 116-145 are Hebrew 117-146, and Greek 146-147 are Hebrew 147 (11 + 9 verses). Greek 147 is the last numbered psalm; Ps 151 is the extra one. A psalm's title is verse 1 in some texts and part of verse 1 in others (Ps 22: CCAT, Swete, grclxx and Brenton put the title and "The Lord tends me as a shepherd" together in 22:1; LXX2012 has only the shepherd line there), which is why Ps 9 is 38 verses in LXX2012 and 39 elsewhere, and Ps 10 is 8 against 7. TVTMS has the column "GrkTitleSeparate (eg Brenton)" for this.
- **Jer 25-51.** As above: a reordering of the chapters, not an offset, and the Greek is shorter.
- **Exod 35-40.** The Greek Exodus moves whole blocks: 35:8-27 is reordered (TVTMS: English `Exo.35:8` = NETS `35:19`, Brenton `35:14`; the Greek column marks "Exo.35:8 [Empty]"), and TVTMS lists the Greek reordering at 36:8-38, 37:1-38:31, 39:1-43 and 40:30-31 as well (the making of the tabernacle comes in another order); the Greek has 36: 40 or 38, 37: 21, 38: 27, 39: 23 where Hebrew has 29, 31, 43. Exod 40:9-38 maps to Greek 40:7-32 (TVTMS: `Exo.40:9 = Exo.40:7`, `Exo.40:10 = Exo.40:8-9`; 7-8, 11 and 28 "TextMayBeMissing"). The gaps in Rahlfs/Brenton (1..35 with 31 verses) are those moves.
- **Dan 3.** Greek (both the Old Greek and Theodotion in Rahlfs) puts the Prayer of Azariah and the Song of the Three at 3:24-90 and moves the Hebrew 3:24-30 to 3:91-97; Hebrew/Aramaic 3:31-33 are English 4:1-3 and Latin/Swete 3:98-100. TVTMS: `Dan.3:23--4:3` English 3:24-30 = Greek 3:91-97; the additions `S3Y.1:1-28` = Greek `Dan.3:24-51`; English 4:1-3 = Hebrew 3:31-33 = Latin 3:98-100 = Greek "Absent". eBible's grclxx and LXX2012 pull the additions out into the book `S3Y` (Prayer of Azarias and Song, one chapter of 67) and leave Dan 3 at 33. Lampas's Dan 3 has 30 verses and its 4 has 37, English numbering.
- **Esther additions.** Hebrew Esther has no Additions A-F. Greek puts them inside the book. TVTMS gives each tradition's address (`Est.1:1.1-17` as extra sub-verses of 1:1, or `Est.A:1-17`, `Est.11:2-12:6` in the Vulgate order, `Est.13`, `Est.14`, `Est.15`, `Est.16`). Rahlfs/CenterBLC store them as lettered sub-verses of the verse they follow (in the data I read: 1:1k-1s, 4:17k-17l, 10:3k-3l); Brenton and grclxx the same with their own letters; Swete's verse list has none, so I did not find where its Addition A text sits; LXX2012 brackets them inside verses.
- **Mal 4.** Hebrew has 3 chapters, English 4. Greek in Rahlfs/CenterBLC and Brenton has 3 chapters (3: 24, the English 4:1-6 as Hebrew 3:19-24); grclxx, LXX2012 and Swete have 4 chapters like English. TVTMS (`Mal.4:1-4:6`) records two Greek traditions ("Greek" and "Greek2", the second the three-chapter one with 3:24 verses), and that in the four-chapter Greek the last three verses are in another order: English 4:4, 4:5, 4:6 are Greek 4:5, 4:6, 4:4. Lampas has Mal 4 as 6 verses, so Rahlfs 3:19-24 corresponds to Lampas 4:1-6 (in the Hebrew order; the Greek order of the last three differs).

## The Webster 1828 CSV

Measured on `webster1828.csv` at commit `b52403774b5b24d01377bbab29f642be226e9bb4`, parsed with Python's `csv` module (two columns: headword, HTML definition).

- **Total entries:** 62,391 rows; 62,388 distinct lower-cased headwords (3 duplicated). First `a`, last `zymome`.
- **Empty definition:** 0.
- **Unfinished:** 144 entries have only the headword and its pronunciation or a stub (visible text no longer than the headword plus 12 characters, e.g. `ARILLATED,`, `ASTONED`, `BAULK [See Balk.]`, `BOURD, n. A just.`); 521 have under 25 visible characters in all; 14 start with "See". The author's own list, `words-in-progress.csv`, has 586 words (the README says "approximately 600") that are **not in the CSV at all**, so the real gaps are those plus the stubs. No unbalanced HTML tags.
- **Bible-book citations:** regex named here: a full book name from the 66 (with `1`/`2`/`3` prefix for the numbered books, `Psalm` or `Psalms`) followed by whitespace and a chapter number, optionally `:verse`: `\b(?:Genesis|Exodus|...|Revelation)\s+\d+(?::\d+)?` (list in the author's order; Song of Solomon included). It matches **2,564 entries** and 5,867 citations in all (Psalms 514, Genesis 452, Matthew 372, Exodus 291, Acts 282, Isaiah 280, Proverbs 255, Luke 228). A second pass for the 1828 abbreviations (`Gen.`, `Rom.`, `Matt.` followed by a number or a roman numeral) adds 19 more entries (e.g. `arm`, `baal`, `calends`, `sleep`) for **2,583 entries** in all. The citations were normalised to full names by the compiler (the commit "Fix Romans reference under allow" shows ongoing fixes). For comparison, Webster 1913 (102,217 entries) matches the full-name regex in only 7 entries and the same abbreviation pass in 2,157 (it cites in the old style, `Matt. xxii`, and may include a few false hits). Its LOVE cites `Jude 21` and `Matt. xxii`; GRACE `Rom. xi`, `Cor. xii`, `Rom. v`; FAITH `Heb. xi`, `Gal. i`, `Deut. xxvii`. So the 1913 is not Scripture-free, but it is a different text (its LOVE begins "A feeling of strong attachment induced by that which delights or commands admiration") and its citations are bare abbreviations that would need parsing.
- **Typos seen:** GRACE sense 4 cites `Romans 5:2` for "Where sin abounded, grace did much more abound" (that is Romans 5:20); sense 5 has `Romans 5:2:2`. Rare, but a check of the citations against the Berean text is needed before a reader who knows the verse is shown them.

LOVE, GRACE and FAITH are quoted whole in the CSV's HTML (a `<p>` per paragraph, `<b>` for the headword and sense numbers, `<i>` for the part of speech and the word as used). I reproduce them without the tags and with a ¶ between paragraphs.

> **LOVE** (3,933 bytes) ¶ **LOVE**, *verb transitive* luv. [Latin libeo, lubeo. See Lief. The sense is probably to be prompt, free, willing, from leaning, advancing, or drawing forward.] ¶ **1.** In a general sense to be pleased with; to regard with affection, on account of some qualities which excite pleasing sensations or desire of gratification. We love a friend, on account of some qualities which give us pleasure in his society. We love a man who has done us a favor; in which case, gratitude enters into the composition of our affection. We love our parents and our children, on account of their connection with us, and on account of many qualities which please us. We love to retire to a cool shade in summer. We love a warm room in winter. we love to hear an eloquent advocate. The christian loves his Bible. In short, we love whatever gives us pleasure and delight, whether animal or intellectual; and if our hearts are right, we love God above all things, as the sum of all excellence and all the attributes which can communicate happiness to intelligent beings. In other words, the christian loves God with the love of complacency in his attributes, the love of benevolence towards the interest of his kingdom, and the love of gratitude for favors received. ¶ Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind - ¶ Thou shalt love thy neighbor as thyself. Matthew 22:37. ¶ **2.** To have benevolence or good will for. John 3:16. ¶ **LOVE**, *noun* ¶ **1.** An affection of the mind excited by beauty and worth of any kind, or by the qualities of an object which communicate pleasure, sensual or intellectual. It is opposed to hatred. love between the sexes, is a compound affection, consisting of esteem, benevolence, and animal desire. love is excited by pleasing qualities of any kind, as by kindness, benevolence, charity, and by the qualities which render social intercourse agreeable. In the latter case, love is ardent friendship, or a strong attachment springing from good will and esteem, and the pleasure derived from the company, civilities and kindness of others. ¶ Between certain natural relatives, love seems to be in some cases instinctive. Such is the love of a mother for her child, which manifests itself toward an infant, before any particular qualities in the child are unfolded. This affection is apparently as strong in irrational animals as in human beings. ¶ We speak of the love of amusements, the love of books, the love of money, and the love of whatever contributes to our pleasure or supposed profit. ¶ The love of God is the first duty of man, and this springs from just views of his attributes or excellencies of character, which afford the highest delight to the sanctified heart. Esteem and reverence constitute ingredients in this affection, and a fear of offending him is its inseparable effect. ¶ **2.** Courtship; chiefly in the phrase, to make love that is, to court; to woo; to solicit union in marriage. ¶ **3.** Patriotism; the attachment one has to his native land; as the love of country. ¶ **4.** Benevolence; good will. ¶ God is love 1 John 4:7. ¶ **5.** The object beloved. ¶ The lover and the love of human kind. ¶ **6.** A word of endearment. ¶ Trust me, love ¶ **7.** Picturesque representation of love ¶ Such was his form as painters, when they show their utmost art, on naked loves bestow. ¶ **8.** Lewdness. ¶ He is not lolling on a lewd love-bed. ¶ **9.** A thin silk stuff. *obsolete* ¶ **LOVE** in idleness, a kind of violet. ¶ Free of love a plant of the genus Cercis.

> **GRACE** (3,935 bytes) ¶ **GRACE**, *noun* [Latin gratia, which is formed on the Celtic; Eng. agree, congruous, and ready. The primary sense of gratus, is free, ready, quick, willing, prompt, from advancing.] ¶ **1.** Favor; good will; kindness; disposition to oblige another; as a grant made as an act of grace ¶ Or each, or all, may win a lady's grace ¶ **2.** Appropriately, the free unmerited love and favor of God, the spring and source of all the benefits men receive from him. ¶ And if by grace then it is no more of works. Romans 11:5. ¶ **3.** Favorable influence of God; divine influence or the influence of the spirit, in renewing the heart and restraining from sin. ¶ My grace is sufficient for thee. 2 Corinthians 12:9. ¶ **4.** The application of Christ's righteousness to the sinner. ¶ Where sin abounded, grace did much more abound. Romans 5:2. ¶ **5.** A state of reconciliation to God. Romans 5:2:2. ¶ **6.** Virtuous or religious affection or disposition, as a liberal disposition, faith, meekness, humility, patience, etc. proceeding from divine influence. ¶ **7.** Spiritual instruction, improvement and edification. Ephesians 4:29. ¶ **8.** Apostleship, or the qualifications of an apostle. Ephesians 3:8. ¶ **9.** Eternal life; final salvation. 1 Peter 1:13. ¶ **10.** Favor; mercy; pardon. ¶ Bow and sue for grace ¶ With suppliant knee. ¶ **11.** Favor conferred. ¶ I should therefore esteem it a great favor and grace ¶ **12.** Privilege. ¶ To few great Jupiter imparts this grace ¶ **13.** That in manner, deportment or language which renders it appropriate and agreeable; suitableness; elegance with appropriate dignity. We say, a speaker delivers his address with grace; a man performs his part with grace ¶ **GRACE** was in all her steps. ¶ Her purple habit sits with such a grace ¶ On her smooth shoulders. ¶ **14.** Natural or acquired excellence; any endowment that recommends the possessor to others; as the graces of wit and learning. ¶ **15.** Beauty; embellishment; in general, whatever adorns and recommends to favor; sometimes, a single beauty. ¶ I pass their form and every charming grace ¶ **16.** Beauty deified; among pagans, a goddess. The graces were three in number, Aglaia, Thalia, and Euphrosyne, the constant attendants of Venus. ¶ The loves delighted, and the graces played. ¶ **17.** Virtue physical; as the grace of plants. [Not used.] ¶ **18.** The title of a duke or an archbishop, and formerly of the king of England, meaning your goodness or clemency. His grace the Duke of York. Your grace will please to accept my thanks. ¶ **19.** A short prayer before or after meat; a blessing asked, or thanks rendered. ¶ **20.** In music, graces signifies turns, trills and shakes introduced for embellishment. ¶ Day in grace in theology, time of probation, when an offer is made to sinners. ¶ Days in grace in commerce, the days immediately following the day when a bill or note becomes due, which days are allowed to the debtor or payor to make payment in. In Great Britain and the United States the days of grace are three, but in other countries more; the usages of merchants being different. ¶ **GRACE**, *verb transitive* To adorn; to decorate; to embellish and dignify. ¶ Great Jove and Phoebus graced his noble line. ¶ And hail, ye fair, of every charm possess'd, ¶ Who grace this rising empire of the west. ¶ **1.** To dignify or raise by act of favor; to honor. ¶ He might at his pleasure grace or disgrace whom ¶ he would in court. ¶ **2.** To favor; to honor. ¶ **3.** To supply with heavenly grace

> **FAITH** (4,085 bytes) ¶ **FAITH**, *noun* [Latin fides, fido, to trust; Gr. to persuade, to draw towards any thing, to conciliate; to believe, to obey. In the Greek Lexicon of Hederic it is said, the primitive signification of the verb is to bind and draw or lead, as signifies a rope or cable. But this remark is a little incorrect. The sense of the verb, from which that of rope and binding is derived, is to strain, to draw, and thus to bind or make fast. A rope or cable is that which makes fast. Heb.] ¶ **1.** Belief; the assent of the mind to the truth of what is declared by another, resting on his authority and veracity, without other evidence; the judgment that what another states or testifies is the truth. I have strong faith or no faith in the testimony of a witness, or in what a historian narrates. ¶ **2.** The assent of the mind to the truth of a proposition advanced by another; belief, or probable evidence of any kind. ¶ **3.** In theology, the assent of the mind or understanding to the truth of what God has revealed. Simple belief of the scriptures, of the being and perfections of God, and of the existence, character and doctrines of Christ, founded on the testimony of the sacred writers, is called historical or speculative faith; a faith little distinguished from the belief of the existence and achievements of Alexander or of Cesar. ¶ **4.** Evangelical, justifying, or saving faith is the assent of the mind to the truth of divine revelation, on the authority of God's testimony, accompanied with a cordial assent of the will or approbation of the heart; an entire confidence or trust in God's character and declarations, and in the character and doctrines of Christ, with an unreserved surrender of the will to his guidance, and dependence on his merits for salvation. In other words, that firm belief of God's testimony, and of the truth of the gospel, which influences the will, and leads to an entire reliance on Christ for salvation. ¶ Being justified by faith Romans 5:1. ¶ Without faith it is impossible to please God. Hebrews 11:1. ¶ For we walk by faith and not by sight. 2 Corinthians 5:7. ¶ With the heart man believeth to righteousness. Romans 10:6. ¶ The faith of the gospel is that emotion of the mind, which is called trust or confidence, exercised towards the moral character of God, and particularly of the Savior. ¶ **FAITH** is an affectionate practical confidence in the testimony of God. ¶ **FAITH** is a firm, cordial belief in the veracity of God, in all the declarations of his word; or a full and affectionate confidence in the certainty of those things which God has declared, and because he has declared them. ¶ **5.** The object of belief; a doctrine or system of doctrines believed; a system of revealed truths received by christians. ¶ They heard only, that he who persecuted us in times past, now preacheth the faith which once he destroyed. Galatians 1:23. ¶ **6.** The promises of God, or his truth and faithfulness. ¶ shall their unbelief make the faith of God without effect? Rom 3. ¶ **7.** An open profession of gospel truth. ¶ Your faith is spoken of throughout the whole world. Rom 1. ¶ **8.** A persuasion or belief of the lawfulness of things indifferent. ¶ Hast thou faith? Have it to thyself before God. Rom 14. ¶ **9.** Faithfulness; fidelity; a strict adherence to duty and fulfillment of promises. ¶ Children in whom is no faith Deuteronomy 32:20. ¶ **10.** Word or honor pledged; promise given; fidelity. He violated his plighted faith ¶ For you alone I broke my faith with injured Palamon. ¶ **11.** Sincerity; honesty; veracity; faithfulness. We ought in good faith to fulfill all our engagements. ¶ **12.** Credibility or truth. Unusual.] ¶ The faith of the foregoing narrative.

**Compared with Logos by eye: not done.** The story points to `docs/resources.md` or a screenshot in the repo. `docs/resources.md` records only the link form (`logosres:AMDICTENLANG;hw=<word>`, the Book Info `LLS:AMDICTENLANG`), not an entry's text; a search of the repo found no Logos screenshot of a Webster entry. So I could not say how Logos shows LOVE, GRACE and FAITH. What I did compare, instead, is the CSV against the public 1828 text at https://webstersdictionary1828.com/Dictionary/love (2026-10-31): the first 3,000 characters of LOVE are the same, word for word, in the same order, with the same sense numbers, quoted lines and normalised citations. Things in the CSV that look wrong on their face and are worth a glance beside his Logos entry: (1) FAITH sense 12 ends "Unusual.]" with a stray bracket; (2) GRACE verb sense 3 stops at "To supply with heavenly grace" (I did not check the printed page for a continuation); (3) "Romans 5:2:2" and the `Romans 5:2` for "Where sin abounded"; (4) the poetry quotes ("Bow and sue for grace / With suppliant knee") carry no author in the CSV; (5) Logos shows each reference as a link that opens the verse, while the CSV has plain text, so Lampas would link `Romans 5:1`-style text to its own Reader (the full book names help there).

## Recommendations and the main risk

1. **The Septuagint Greek (the Governor's question: licence against word data).** Do not ship CenterBLC or eliranwong's data without CCAT's written consent. Two honest paths:
   - *With word data:* ask CCAT (R. Kraft, the declaration's address; the declaration is dated 2005) and the Deutsche Bibelgesellschaft for written consent to ship the CATSS text and morphology in a free, public web app, naming CenterBLC's conversion. If it comes, CenterBLC/LXX is the data to use: lemma, split morphology, Strong's, two glosses, BOL entry forms, one Text-Fabric tree, MIT on its own parts, and the verse index for the CCAT numbering. *Main risk: no answer, or a no, or "non-commercial only", and the gate then cannot be monetised.*
   - *Without it:* Swete 1909-12 (public domain, GPL-packaged, text and transliteration only) with Lampas deriving lemma and parsing itself later, or eBible grclxx text (probably free, edition unnamed, "℗" to settle). *Main risk: Lampas's whole Hebrew/Greek reader is built on tapping a word for its lemma and parsing; a text with none is a different, weaker reader.*
2. **The Septuagint's English.** LXX2012 over Brenton: the same translation, American spelling, in the same USFM, public domain. Its main fault is bracketed Additions inside verses (Esther) and `\add`/`\f` marks to strip, and Brenton's gaps (Exod 35 has 32 verses numbered to 35). *Main risk: Brenton (1851) translated an earlier printed Greek text than Rahlfs (1935), so the English sits beside Rahlfs's Greek only roughly; NETS, the modern one, is not free.*
3. **The testament switch (Greek or Hebrew Old Testament).** The text under each chapter changes number and sometimes order, so the switch needs TVTMS (CC BY 4.0) as a data file and a rule per book: a chapter map for the Psalms, Jeremiah, Exodus, Daniel, Esther, Malachi, with a "no counterpart" state for the Additions and for Jeremiah's moved oracles. *Main risk: Jeremiah and the Exodus tabernacle sections are re-orderings, so "the same chapter in the other text" does not always exist; a verse-level parallel needs the table, not an offset.*
4. **The dictionary.** Ship the akaitsurugi CSV as Lampas's own Webster's 1828, with the Logos link kept as the better entry when Logos is on: CC BY-SA 4.0 on the data file, credit in About and the Preface (`ATTRIBUTION.md`, `src/preface.ts`), the 586 absent words and 144 stubs hidden or marked, the HTML reduced to the few tags it uses. Webster 1913 is a poor second: a different, later dictionary (not the one the Governor knows from Logos), with bare abbreviated citations. *Main risk: the CSV's text matches a copyrighted site entry-for-entry and the README gives no provenance; the 1828 words are free, but a share-alike claim on the data is the compiler's, and the Governor may want one email to the author to confirm where the text came from. Second risk: typos in citations (Romans 5:2) that a Bible-reading app will show to a reader who knows the verse.*
5. **The tutor lessons.** Out of scope for this probe; they depend on which of paths 1-3 is taken.
