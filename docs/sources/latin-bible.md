# Sources: a Latin Bible (the Vulgate) and its English

Story mw-cbsbw9q.2. Written 2026-10-31. Research only: no app code changed and **no text data is committed**; every file below was
fetched into a temp dir (`/tmp/latin-probe`) and measured there. Commit SHAs and URLs are given so a later story can fetch the same bytes.

The ask (the Governor, Postern general, 2026-10-31 04:05Z, on mw-cbsbw9q): "a good Latin Bible as well with good English on top ... speaking
in Latin, reading in Latin, all of that parity with Greek and Hebrew ... what does the English of the Hebrew say, what is the English of the
Septuagint say, what is the English for the Latin say". Licence bar (his 03:54Z post): public domain, MIT, an acceptable licence, or
non-commercial; Lampas is not for sale.

<!-- toc -->

- [What I found](#what-i-found)
- [1. The Latin texts and their licences](#1-the-latin-texts-and-their-licences)
- [2. The English: Douay-Rheims and parallel corpora](#2-the-english-douay-rheims-and-parallel-corpora)
- [3. Per-word Latin data (lemma, morphology)](#3-per-word-latin-data-lemma-morphology)
- [4. Versification against the Hebrew and the Septuagint](#4-versification-against-the-hebrew-and-the-septuagint)
- [5. Latin pronunciation and audio](#5-latin-pronunciation-and-audio)
- [Non-commercial terms inside an app with a paid licence gate](#non-commercial-terms-inside-an-app-with-a-paid-licence-gate)
- [Not done, and what I could not read](#not-done-and-what-i-could-not-read)
- [Sources](#sources)

<!-- /toc -->

## What I found

* **The Latin text is easy and free.** The Clementine Vulgate is public domain, in several ready-made forms (USFX, USFM, SWORD, TSV). The
  Douay-Rheims (Challoner) English is public domain too, and one CC0 repository already pairs the two verse for verse on the Vulgate's own
  numbering (35,809 verses each). Neither the Stuttgart Vulgate (Weber-Gryson) nor the Nova Vulgata can be shipped: both are under a
  rights holder's copyright and neither grants a licence I could find.
* **Per-word Latin data exists for the New Testament only.** The PROIEL Vulgate NT has a lemma, part of speech and morphology on 110,774
  tokens, reviewed by hand, and every Latin token carries an alignment id to the PROIEL Greek NT. Its licence is CC BY-NC-SA. I found **no
  lemmatised or tagged Vulgate Old Testament** under any licence; Genesis 1:1-5 has nothing to read. A tool would have to tag it
  (Whitaker's Words is free for any use; I could not run it here, see the end).
* **Versification is solved by a published CC BY table.** STEPBible's TVTMS maps English, Hebrew, **Latin** and Greek (and has a ready
  column for the Vulgate) for every section where they differ: Psalms, Daniel, Esther, Malachi and the rest. The Vulgate follows the
  Septuagint's psalm numbers and the Hebrew's verse numbers.
* **Latin sound is the hard part.** Lampas speaks through the phone's Web Speech voices (`el-GR`, `he-IL`). I found no sign that a phone or
  Google Cloud offers a Latin (`la`) voice; the one free synthesiser I could run (`espeak-ng`, voice `la`) reads **classical**, not
  Ecclesiastical, and I judged it by its phonetic output only, not by ear. One repository holds a full Nova Vulgata audio Bible, MIT-labelled
  but with no word on where the recording came from.

## 1. The Latin texts and their licences

Verdict column: may a free, non-commercial web app ship the text?

| Candidate | What it is | Licence (quoted) and where | May Lampas ship it? |
|---|---|---|---|
| **Clementine Text Project** (Vulgate, Clementine edition; VulSearch) | Plain-text Clementine Vulgate by the Clementine Text Project, files in the repo `jrichter/ClementineVulgateConverter/latin/*.lat` (cp1252, `\` = paragraph) | "The text has been released into the public domain. Those who use it are requested to acknowledge their source, report typographical errors to the project maintainer, and make clear any modifications they make, but these are only requests that are not enforced by any license." Quoted from `README.md` of `jrichter/ClementineVulgateConverter` at `38292f3` (copying the project's own words; the project's site `vulsearch.sourceforge.net` returns only a SourceForge shell today and `/html/...` pages 404, and SourceForge labels the *VulSearch Windows program* GPLv2, which is the program, not the text). The converter's own code is MIT. | **Yes.** Public domain; credit the project as it asks. |
| **eBible.org `latVUC`** "Clementine Vulgate of 1598 with Glossa Ordinaria Migne edition 1880" | USFM, USFX, SWORD, HTML, plain text; built 2026-05 from source files of 2025-12 | "public domain" and "Public Domain" on https://ebible.org/bible/details.php?id=latVUC (read 2026-10-31). Open Bible Data (`ClVg`, "Clementine Vulgate (Latin, 1592)") repeats "Copyright Public Domain. Licence Public Domain." (the two sites disagree on 1598 and 1592) | **Yes.** Easiest ready-made form (USFM per book). |
| **CrossWire SWORD `Vulgate`** v2.1 (2021-02-09) | OSIS, `Versification=Vulg`, "Jerome's A.D. 405 Biblia Sacra Vulgata Latina (Latin Vulgate) With Psalms variant and Apocrypha" | `DistributionLicense=Public Domain`; `TextSource=https://www.ccel.org/ccel/b/bible/vul/cache/vul.txt` (`vulgate.conf` on crosswire.org, read 2026-10-31). The text is CCEL's; the edition is not named in the conf | **Yes** (public domain), edition unnamed |
| **CrossWire `VulgHetzenauer`** v1.0.2 | "Vulgatae Editionis, Sixti V et Clementis VIII, Anno 1914, P. Michael Hetzenauer Editore" (1914 reprint of the Sixto-Clementine) | `DistributionLicense=Public Domain`; `TextSource=http://www.sacredbible.org/` | **Yes.** A different Clementine print (1914), not byte-equal to the Text Project's |
| **`curran-gehring/modern-douay-rheims`** `vulgata_clementina_verses.tsv` | Clementine Latin, one verse per line, `BOOK ch:v<TAB>text`, 35,809 verses, full canon incl. deuterocanon; vendored from scrollmapper | Repo licence CC0-1.0 (`LICENSE` at `03bd777`); "Source texts are the scrollmapper/bible_databases transcriptions of the Challoner Douay-Rheims and the Clementine Vulgate — both public domain. The tooling and the modernized text in this repository are dedicated to the public domain under CC0 1.0." | **Yes.** One maintainer, pushed 2026-07-03, so check it before relying on it |
| **Stuttgart Vulgate / Biblia Sacra Vulgata** (Weber-Gryson, 5th ed. 2007) | Critical edition, Deutsche Bibelgesellschaft, Stuttgart | **No licence found.** The publisher's page https://die-bibel.de/en/vulgate answered HTTP 403 to my fetch, so I could not read the terms. Wikipedia names the Deutsche Bibelgesellschaft as publisher and links an online "main biblical text only" copy. `find.bible` lists "Vulgate Holy Bible (LATBSV)" as "Public Domain (OPEN)", but that page does not name the edition's rights holder, and a 2007 critical edition is not public domain; treat it as an error until the DBG says so | **No**, not without the Deutsche Bibelgesellschaft's written permission |
| **Nova Vulgata** (1979, 2nd typical ed. 1986; vatican.va) | The Church's revised Latin Bible, readable at https://www.vatican.va/archive/bible/nova_vulgata/ | The vatican.va chapter page (Genesis, 201,124 bytes, read 2026-10-31) carries **no** copyright or licence text. Publishers who print it credit "© Libreria Editrice Vaticana" (a search result, not a primary document); the Vatican's general terms page did not load (404). `austintheriot/nova-vulgata-with-macrons` (macronised, Genesis and 1-3 John finished) has no licence file; `pmcarballo/sacra-biblia` declares CC0, which the repo cannot grant for a text it did not write | **No**, until the Libreria Editrice Vaticana says yes. Nothing grants it today |
| **Jossifresben/translation-alignment** (word-level Greek / Syriac / Vulgate alignment) | An alignment app and data, pushed 2026-06-04 | No licence file at `8bd7f1d` (GitHub reports none); I did not read its data | **No**, not as it stands: no licence means all rights reserved |

**Recommendation.** For a first Latin text take the Clementine in USFM from eBible.org `latVUC` (or the Text Project's `.lat` files, which are the
original), and credit the Clementine Text Project and eBible.org in `ATTRIBUTION.md`. A modern critical text (Stuttgart) or the Nova Vulgata
would each need a letter to the rights holder first; the Governor decides whether that is worth sending.

The Clementine text is spelled with the ligature `æ`/`œ` and the "j" of the 1598 print (`cælum`, `Jesu`), and its punctuation puts a space
before `:` `;` `?` `!`; it is Latin of the Church, not Classical Latin spelling. Anything that looks a word up (a lemma, TTS) has to fold
`æ`→`ae`, `œ`→`oe`, `j`→`i` first.

## 2. The English: Douay-Rheims and parallel corpora

| Candidate | What it is | Licence (quoted) | May Lampas ship it? |
|---|---|---|---|
| **Douay-Rheims, American Edition of 1899** (Challoner's revision) | https://ebible.org/bible/details.php?id=engDRA, USFM/USFX/SWORD, 2026 build | "public domain"; "This Public Domain Bible text is brought to you courtesy of eBible.org." Open Bible Data `DRA`: "Copyright Public Domain. Licence Public Domain." | **Yes** |
| **Challoner Douay-Rheims 1749-52, PSFM** `BibleCorps/ENG-B-DRC1750-pd-PSFM` (pushed 2026-09-19, `019ffde`) | The Catholic Software 2004 edition, with Challoner's annotations in the sources | `00-FRT-...sfm`: "Public domain." and "This entire text is in the public domain. No copyright." No licence file in the repo | **Yes** (text is public domain; the repo has no licence file) |
| **Project Gutenberg #8300** "The Bible, Douay-Rheims, Complete" (Catholic Software, 1999; updated 2026-04-29) | Plain text | "This eBook is for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever." The Project Gutenberg Licence applies (it concerns the trademark when a copy keeps the name) | **Yes** |
| **`curran-gehring/modern-douay-rheims`** `modern_douay_rheims_verses.tsv` | Challoner DR with `thou/thee/-eth` replaced by rule (deterministic substitution, no paraphrase), on the Vulgate's verse grid | CC0-1.0, see above | **Yes**; the only English found that sits on the Vulgate's numbers |
| **`mborders/vulgata`** (Go library) | Clementine and Douay-Rheims JSON in a Go package | MIT (code); texts public domain | **Yes**; not needed |
| **`janvier-s/original-douay-rheims`** | The original 1582/1609 DR with notes | CC0-1.0 (repo) | **Yes**; older English |
| **Parallel Latin-English corpus** | Every pair above lines up by chapter:verse; PROIEL aligns the NT word by word to Greek only (Section 3) | none needed | A *parallel text* is just two files on one numbering |

Measured pair (the CC0 TSV, 2026-10-31):

| Reference | Clementine Latin | Modern Douay-Rheims |
|---|---|---|
| GEN 1:1 | In principio creavit Deus cælum et terram. | In the beginning God created heaven, and earth. |
| GEN 1:3 | Dixitque Deus : Fiat lux. Et facta est lux. | And God said: Be light made. And light was made. |
| JHN 1:1 | In principio erat Verbum, et Verbum erat apud Deum, et Deus erat Verbum. | In the beginning was the Word: and the Word was with God: and the Word was God. |
| JHN 1:3 | Omnia per ipsum facta sunt : et sine ipso factum est nihil, quod factum est. | All things were made by him: and without him was made nothing that was made. |

A caution for "what does the English of the Latin say": Douay-Rheims renders the *Latin*, so "heaven, and earth" and "Be light made" follow the
Vulgate's word order and wording, not the Hebrew's. That is the point of the compare view (the Hebrew's English, the Septuagint's English,
the Latin's English side by side); it needs a second sentence in the UI so the Douay-Rheims is not mistaken for a translation of the Hebrew.
The English of the Septuagint (Brenton is public domain; NETS is not free) and of the Hebrew are outside this probe.

## 3. Per-word Latin data (lemma, morphology)

| Source | Coverage | Licence (quoted) | Measured |
|---|---|---|---|
| **PROIEL Latin NT** ("Jerome's Vulgate", `latin-nt.xml`), `syntacticus/syntacticus-treebank-data` at `525cee4` (PROIEL's own repo `proiel/proiel-treebank` at `8e38896`, pushed 2023-05-02, now says "releases ... have moved to" Syntacticus) | **NT only**, 11,851 sentences, all `status="reviewed"`; no OT. Parts of Colossians 3-4, 1-2 Timothy, Hebrews, James, 1-2 Peter, 1-3 John are marked unannotated in the README, and Acts 21-28, Romans 11 and 13, Galatians, Ephesians 3-5, Philippians 1 and 3, Colossians 1-2, 2 Thessalonians 3, 2 Timothy 4, Jude have gaps | The file's own header: `<license>CC BY-NC-SA 4.0</license>` with `http://creativecommons.org/licenses/by-nc-sa/4.0/` (export 2018-04-07); the README says "Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License" (the two differ) | **John 1:1-5: 52 tokens, every one with form, lemma, part of speech and a 10-place morphology string.** **Genesis 1:1-5: nothing**, no OT book is in the file |
| **Universal Dependencies `UD_Latin-PROIEL`** at `ae7c7c5` | The same NT as CoNLL-U, Universal POS and features | "License: CC BY-NC-SA 3.0" (README); `LICENSE.txt` is CC BY-NC-SA 4.0 | not measured; carries the same NT text |
| **Whitaker's WORDS** (`mk270/whitakers-words` at `1f2f0fb`) | A Latin dictionary and inflection engine (not a corpus): given a form, lists candidate lemmas and parses; no context disambiguation | "Permission is hereby freely given for any and all use of program and data. You can sell it as your own, but at least tell me." and "All parts of the WORDS system, source code and data files, are made freely available to anyone who wishes to use them, for whatever purpose." (README "Licensing") | **Not run** (see the end). Documented as ambiguous: it returns every possible parse of `Deus`, `terram`, `creavit` and leaves the choice to the reader |
| **Latin WordNet** (`CIRCSE/latinWordnet-revision` at `4e91d7f`) | Senses and relations for lemmas, not a tagger of running text | "licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License" | not measured |
| **Perseus** "Vulgate" (the text PROIEL started from: `Perseus_text_1999.02.0060.xml`, 2014-03-14) | Plain text, no tags | `electronic-text-license`: "free" (in PROIEL's header); the Perseus page itself I did not read | not measured |
| **CLTK**, **LatinCy**, **UDPipe** Latin models | Taggers that could lemmatise the OT (and the NT where PROIEL is thin) | **Not read.** Naming them is not a licence check | not run |
| **Strong's-style tag sets for the Latin** | I found none for the Vulgate | | |

**John 1:1-5 as the PROIEL file gives it** (lemma, part of speech, morphology string; the letters are PROIEL's: position 1 person, 2 number,
3 tense, 4 mood, 5 voice, 6 gender, 7 case, 8 degree, 9 strength, 10 inflection, as the file's own `<morphology>` header lists them):

```
JOHN 1.1 in in R- ---------n | principio principium Nb -s---nb--i | erat sum V- 3siia----i | Verbum verbum Nb -s---nn--i
et et C- | Verbum | erat | apud apud R- | Deum deus Nb -s---ma--i | et | Deus deus Nb -s---mn--i | erat | Verbum
JOHN 1.3 omnia omnis Px -p---nn--i | per per R- | ipsum ipse Pp 3s---ma--i | facta facio V- -prppnn--i | sunt sum V- 3ppia----i
JOHN 1.5 ... lucet luceo V- 3spia----i | eam is Pp 3s---fa--i | non non Df | conprehenderunt compr(eh)endo V- 3pria----i
```

It needs care: the lemma `compr(eh)endo` has brackets (the Vulgate spells `comprehendo` and `conprehendo`), the lemma for `omnia` is `omnis`
(tagged `Px` "indefinite pronoun", not adjective), and the word is in the *Perseus* spelling (`Verbum` capitalised, `conprehenderunt`),
not the Clementine's `comprehenderunt`. A join of this data onto the Clementine text therefore needs a spelling fold. The base text is not
the Clementine: PROIEL says it took the Perseus Vulgate and added "punctuation from the Clementine Text Project". Which print the Perseus Vulgate is, I did not establish.

**Alignment to the Greek.** Every PROIEL Latin token has an `alignment-id` to a token of the PROIEL Greek NT (Tischendorf 1869), and each book
`div` carries one too. That is a ready word-by-word Greek-to-Latin link for the NT; Lampas's Greek is Robinson-Pierpont, not Tischendorf, so
a join needs a Tischendorf-to-RP map (`docs/greek-edition.md`).

## 4. Versification against the Hebrew and the Septuagint

**Published mapping table: yes.** STEPBible's **TVTMS** ("Translators Versification Traditions with Methodology for Standardisation for
Eng+Heb+Lat+Grk+Others"), `STEPBible/STEPBible-Data` at `be4191f`, the file in `Versification/` (5,790,928 bytes, 29,896 lines). It compares English
(NRSV/KJV), **Hebrew** (MT), **Latin** (the Vulgate) and **Greek** (the Septuagint), and has machine rows (`Gen.31:55 → Gen.32:1`, ...)
and the tests that tell which tradition a given Bible follows ("if this chapter has 29 verses, it is using Greek versification").

Licence (the file's own header and the repo's README): "Data created by www.STEPBible.org based on work at Tyndale House Cambridge (CC BY 4.0)".
"This licence allows you to: Include any part of this data in software or publications without requesting permission ... You MAY make changes
yourself, but you should include a note of changes ..." and the README asks "Credit it to 'STEP Bible' linked to www.STEPBible.org". It asks
that the data not be redistributed by others ("Please do not redistribute it yourself"): link or fetch at build time. **A free non-commercial web
app may ship it, and CC BY would hold in a paid app too.**

The measured differences (Clementine counts from the CC0 TSV; mapping from TVTMS rows):

| Where | Vulgate (Latin) | Hebrew (MT) | Septuagint | English (KJV/NRSV) |
|---|---|---|---|---|
| **Psalms, numbers** | 150 psalms; **numbers follow the Septuagint** | 150 psalms | 150 + a Ps 151 (TVTMS gives Ps 151 to the Greek only; its Latin column files it as a separate book `Ps2`/AddPs) | follows the Hebrew |
| Ps 1-8 | = Hebrew | = | = | = |
| **Ps 9-10** | **one psalm, Ps 9, 39 verses** (Hebrew 9 has 21 + Hebrew 10 has 18) | 9 and 10 | 9 (39) | 9 and 10 |
| Ps 11-113 (Heb.) | Vulg. **10-112** (Heb. *n* = Vulg. *n* − 1) | n | n − 1 | n |
| **Ps 114 + 115** (Heb.) | **one psalm, Ps 113, 26 verses** (Heb. 114:1-8 = Vulg. 113:1-8; Heb. 115:1-18 = Vulg. 113:9-26) | 114, 115 | 113 | 114, 115 |
| **Ps 116** (Heb., 19 v.) | **two psalms**: 114 (Heb. 116:1-9) and 115 (Heb. 116:10-19) | 116 | 114, 115 | 116 |
| Ps 117-146 (Heb.) | Vulg. **116-145** (n − 1) | n | n − 1 | n |
| **Ps 147** (Heb., 20 v.) | **two psalms**: 146 (Heb. 147:1-11) and 147 (Heb. 147:12-20) | 147 | 146, 147 | 147 |
| Ps 148-150 | = Hebrew | = | = | = |
| **Verse numbers inside a psalm** | A title is **part of verse 1** (Ps 22:1 begins "Psalmus David. Dominus regit me"); a long title is two verses (Vulg. 50:1-2 = Hebrew 51:1-2). So a Vulgate verse number equals the **Hebrew** verse number once the psalm number is shifted; both are one or two higher than the English for a titled psalm (Heb. 51:3 = Vulg. 50:3 = KJV 51:1) | title inside v.1 (or vv.1-2) | same as Latin | title unnumbered |
| **Daniel** | **14 chapters**: 3 has **100 verses**, 13 is Susanna (65 v.), 14 is Bel and the Dragon (42 v.) | 12 chapters; Daniel 3 has 33 verses (KJV 3:1-30 + 4:1-3) | per TVTMS the Greek has the same insertion as the Latin: the Prayer of Azariah and the Song of the Three, **3:24-90**, between Heb. 3:23 and 3:24 | 12 chapters |
| Dan 3:24-90 | Vulg. 3:24-90 = the Prayer of Azariah and the Song of the Three (the deuterocanonical insertion), 67 verses | none | same numbers as Latin | NRSV "Prayer of Azariah" has its own numbers (`S3Y.1:1-68`) |
| Dan 3:91-100 | 3:91-97 = Heb. 3:24-30 = KJV 3:24-30; 3:98-100 = Heb. 3:31-33 = KJV 4:1-3 | 3:24-33 | 3:91-97; TVTMS has no Greek verses for 98-100 | 3:24-30 and 4:1-3 |
| Dan 4 on | Vulg. 4:1 = Heb. 4:1 = KJV 4:4 (Vulg. 4 has 34 verses, KJV 4 has 37) | 4:1 = KJV 4:4 | per TVTMS no Greek for the 3:98-100 verses | 4:1 |
| **Esther** | **16 chapters**: 1-10:3 as in Hebrew, then the Greek additions as **10:4-16:24** (Jerome moved them to the end; counts: 10 = 13 v., 11 = 12, 12 = 6, 13 = 18, 14 = 19, 15 = 19, 16 = 24) | 10 chapters, 167 verses | The additions (A-F) are **interleaved** in the Greek, as sub-verses of the Hebrew verse they follow (TVTMS: Addition C is "Est.4:17.1-30") | 10 chapters |
| **Malachi** | **4 chapters** (4:1-6 = Heb. 3:19-24) | **3 chapters**; 3:19-24 | The Greek has the last three verses in another order (TVTMS rows): Greek 4:4 = Heb. 3:24, Greek 4:5 = Heb. 3:22, Greek 4:6 = Heb. 3:23; a second Greek column keeps the Hebrew's three chapters | 4 chapters (= Latin) |
| **Joel** (measured in the TSV only; TVTMS rows not read) | 3 chapters of 20, 32 and 21 verses | the Hebrew's 4 chapters (not measured here) | | 3 chapters in English (not measured here) |

In short: **Psalms** need a table, **Daniel** and **Esther** carry whole extra sections that exist only in the Vulgate and the Septuagint (the
Hebrew is silent there, a compare view must show "no text" in the Hebrew column), and **Malachi** is a three-chapter Hebrew against a four-chapter
Latin and English. Two points to beware: TVTMS has **two Latin columns** for Esther, `Latin*` with the additions lettered `A` to `F` (`Est.C:1-30`) and `Latin2` numbered
`Est.10:4-13, 11:1-16:24`; the Clementine data I measured matches the numbered one, so a mapper must pick which Latin it means. The CC0 TSV's
73 books have no Prayer of Manasseh, 3 or 4 Esdras. The CrossWire modules name their numbering `Versification=Vulg`.

## 5. Latin pronunciation and audio

**Two schools.** *Classical* (Roman, c. 1st century BC: `c`/`g` hard, `v` = w, `ae` = ai, no `ti` softening) against *Ecclesiastical*
(Italianate, the Church's and the Clementine's own: `c` before `e`/`i`/`ae`/`oe` = ch ("tch"), `g` before `e`/`i` = j, `ae` = e, `sc` before
`e`/`i` = sh, `ti` before a vowel = tsi, `h` silent). The Vulgate is read aloud in the Ecclesiastical school in the Church's use; a
Classical reading of Genesis 1:1 ("kae-lum", "kre-ah-wit") is the scholar's.

**What Lampas can do now.** Lampas drives only the phone's Web Speech voices: `src/speech/languages.ts` has `english`, `greek`
(`lang: 'el-GR'`) and `hebrew` (`HEBREW_LANG = 'he-IL'`), and the Greek pronunciation schemes live in `src/speech/pronunciation.ts`
(only `modern`, `el-GR`). A Latin voice would be a fourth entry that asks for `lang: 'la'`. **Whether a phone has it, I could not confirm.**
Searching turned up nothing on a Latin voice in Google's or Apple's speech engines, and the Web Speech API only exposes what the device has,
so the app would have to test at run time and fall back (as it does for a missing Greek or Hebrew voice).

| Candidate | What I found | Licence | Quality on Genesis 1:1 |
|---|---|---|---|
| **A phone's Web Speech voice for `la`** | Not confirmed on any phone; test on his Android before building | n/a | not measured |
| **Google Cloud Text-to-Speech** | The voice list (`docs.cloud.google.com/text-to-speech/docs/voices`, read 2026-10-31) has `el-GR` and `he-IL` voices (38 `he-IL` rows) and **no Latin** | paid cloud service | n/a |
| **`espeak-ng` 1.51, voice `la`** (`itc/la`) on the Laptop | Runs offline, 144 KB WAV for the line | not read (espeak-ng is generally described as GPL-3.0; check before using) | "In principio creavit Deus caelum et terram." came out as `ɪn prɪŋkˈɪpɪɔ krˈɛawɪt dˈɛʊs kˈaɪlʊm ɛt tˈɛrɾam`: hard `c` (**classical**, not Ecclesiastical), `ae` = `aɪ`, a rolled `r`. I read the phonemes; **I did not listen**, so I cannot say how it sounds. A formant voice by rules; it will not say "prin-CHEE-pee-o", because its `c` is hard |
| **Meta MMS-TTS `lat`** | `facebook/mms-tts-lat` exists on Hugging Face (sha `a19c0ca`, modified 2023-09-01), trained on Bible readings | `cc-by-nc-4.0` (card data) | not run; needs a ~100 MB model in the browser or a server; a **non-commercial** term |
| **Recorded: `pssvlng/bible-audio-latin-nova-vulgata`** (`e583951`) | 50 book folders of per-chapter MP3s; `Genesis/1.mp3` is 6,155,537 bytes, 6 min 24 s, 44.1 kHz stereo 128 kb/s | the repo `LICENSE` is MIT, "Copyright (c) 2024 pssvlng". No README, no ID3 tags, nothing on who read it or whether it is a person or a synthesiser; and the *text* is the Nova Vulgata (not shippable, Section 1) | not listened to |
| **Recorded Clementine** | Not searched beyond the above | | |

**Conclusion for audio.** A phone voice is the cheapest and least certain; the only offline Latin synthesis I could run speaks Classical Latin
by rules; and the one recorded Latin Bible I found reads the Nova Vulgata with unknown provenance. If "speaking in Latin" is to be as good as
his Greek and Hebrew it probably needs either a recorded reading under a free licence (none found for the Clementine) or a phone-side check
plus a respelling scheme (like `src/speech/pronunciation.ts` does for Greek) that sends Ecclesiastical respelled text to an English or Italian
voice. Italian (`it-IT`) voices are everywhere on phones and Ecclesiastical Latin is close to Italian; that is a way to test, not something I tried.

## Non-commercial terms inside an app with a paid licence gate

Lampas is free to read; a licence unlocks only the AI (`docs/demo-free-ai-licensed.md`): "reading, listening, word sheets, lessons and quizzes
need no licence ... a licence unlocks only the AI (the tutor and everything sent to the mill)". That keeps a text that is itself read for free
on the right side of a non-commercial term, but three things stay open, and I am not a lawyer:

* **CC BY-NC-SA (PROIEL Latin NT, UD_Latin-PROIEL, Latin WordNet).** Non-commercial: "not primarily intended for or directed toward commercial
  advantage or monetary compensation" (the licence's wording). The app has a paid unlock sitting beside the text, and the tutor is sent the text.
  I would not call that clearly inside the term; a letter to Dag Haug (PROIEL) asking for a waiver is the clean route. Share-alike also
  makes anything derived from the data (the join onto the Clementine, a bundled word list) CC BY-NC-SA itself, which collides with
  shipping the rest under other terms.
* **CC BY-NC (MMS-TTS).** The same objection, and also on the *model's output* (the audio files).
* **Free-text cases that need nothing from the gate** (Clementine, Douay-Rheims, TVTMS, Whitaker's, the CC0 TSVs) hold without the gate being
  an issue; TVTMS needs a credit line only.

## Not done, and what I could not read

* I could not run Whitaker's Words, CLTK, LatinCy or UDPipe: installing a package from the network in this session was refused by the
  sandbox, and I did not work around it. So **no tool was measured on Genesis 1:1-5**; only the PROIEL file was measured, on John 1:1-5.
* `die-bibel.de/en/vulgate` (403) and the Clementine Text Project's own site (dead) could not be read; the Stuttgart verdict rests on absence
  of any licence in what I could read, not on the publisher's words.
* I did not read the Perseus Vulgate page, the Vatican's general terms (404), Latin WordNet's data, UDPipe or CLTK licences, or the
  Nova Vulgata's "Praefatio" for a copyright line.
* I listened to no audio. The `espeak-ng` verdict is by its phoneme output; the MP3 was measured (duration, size) only.
* The versification rows of TVTMS for Joel and the other books not named in Section 4 were not read.

## Sources

Every URL read (2026-10-31), with the commit where one applies.

* https://github.com/proiel/proiel-treebank (`8e388967a1335ed12335ddc655fe46993ee7d57a`): `README.md`, `latin-nt.xml`
* https://github.com/syntacticus/syntacticus-treebank-data (`525cee4fb40590d7d514376c11acaed1bdd91c15`): `README.md`
* https://github.com/UniversalDependencies/UD_Latin-PROIEL (`ae7c7c5bd92e2ab9d2c58cf8184dd72028ca54eb`): `README.md`, `LICENSE.txt`
* https://github.com/jrichter/ClementineVulgateConverter (`38292f3f91e874d3db9e7e9bf7abd23da3217054`): `README.md`, `latin/README.html`, `latin/1Cor.lat`, `lat-clementine-vul.usfx.xml`
* https://github.com/lb42/VulgClem (`4aab02ba815df11e2a9511e02df73c5900ee6e5c`): `README.md` ("Downloaded from the site http://vulsearch.sourceforge.net/ in March 2017"; no licence file)
* https://github.com/curran-gehring/modern-douay-rheims (`03bd77710c5735b30608322a3e99ce4661cb1d0d`): `README.md`, `vulgata_clementina_verses.tsv`, `modern_douay_rheims_verses.tsv`
* https://github.com/BibleCorps/ENG-B-DRC1750-pd-PSFM (`019ffde596c386a073168bc9c9c68cf59762b5b0`): `00-FRT-ENG[B]DRC1750[pd].p.sfm`
* https://github.com/mborders/vulgata (`10a09891b1721c41e39bfdb6322048e01fb4e15c`), https://github.com/janvier-s/original-douay-rheims, https://github.com/BibleGet-I-O/Clementine-Vulgate (`d57e2cde0cceda0d073ea9efc1fee616bcfeb2c1`), https://github.com/scrollmapper/bible_databases (`59b18c5af5845728c275d5b7178ad0d024172b1f`), https://github.com/pmcarballo/sacra-biblia: repository metadata (licence field, commit, file names) only
* https://github.com/Jossifresben/translation-alignment (`8bd7f1de80fc6956826fb5e8e9d1401b8464b563`): repository metadata only
* https://github.com/austintheriot/nova-vulgata-with-macrons (`1d7169a7c1d99dee032c264a18802255e569b77a`): `README.md`
* https://github.com/pssvlng/bible-audio-latin-nova-vulgata (`e583951c624473568bf7b4033d47c262f61c4e49`): `LICENSE`, `Genesis/1.mp3`
* https://github.com/mk270/whitakers-words (`1f2f0fb0867a896d7b9284a03d615ed635d6f992`): `README.md`, directory listing; https://github.com/blagae/whitakers_words (metadata only)
* https://github.com/CIRCSE/latinWordnet-revision (`4e91d7ffe8c5db74a61df98dbc29a9e4880ce066`): `README.md`
* https://github.com/STEPBible/STEPBible-Data (`be4191f0082aeedddb0eff0c02c966292b2bd641`): `README.md` and `Versification/TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt`
* http://vulsearch.sourceforge.net/ and https://sourceforge.net/projects/vulsearch/ ("GNU General Public License version 2.0 (GPLv2)" for the VulSearch Windows program; `/gettext.html`, `/html/*.html` 404)
* https://crosswire.org/ftpmirror/pub/sword/raw/mods.d/vulgate.conf and `vulghetzenauer.conf`; https://crosswire.org/sword/modules/ModInfo.jsp?modName=Vulgate, `VulgHetzenauer`, `VulgGlossa`
* https://ebible.org/bible/details.php?id=latVUC and https://ebible.org/bible/details.php?id=engDRA
* https://freely-given.org/OBD/ClVg/details.htm and https://freely-given.org/OBD/DRA/details.htm
* https://www.gutenberg.org/cache/epub/8300/pg8300.txt
* https://www.vatican.va/archive/bible/nova_vulgata/documents/nova-vulgata_vt_genesis_lt.html and `nova-vulgata_index_lt.html`; https://www.vatican.va/copyright.htm, `/archive/copyright.htm` and `/content/vatican/en/special/copyright.html` (404)
* https://die-bibel.de/en/vulgate (403); https://en.wikipedia.org/wiki/Stuttgart_Vulgate; https://find.bible/bibles/LATBSV/
* https://archive.translation.bible/cat/biblical_texts/latin_texts/index.html (TLS error, not read)
* https://huggingface.co/api/models/facebook/mms-tts-lat
* https://docs.cloud.google.com/text-to-speech/docs/voices
* Web searches (standard mode) on the Stuttgart Vulgate's copyright, the Nova Vulgata's, Web Speech Latin voices and MMS-TTS Latin, which returned only the pages named above.
* In this rig: `docs/demo-free-ai-licensed.md`, `docs/greek-edition.md`, `src/speech/languages.ts`, `docs/layout/speech.md`.
