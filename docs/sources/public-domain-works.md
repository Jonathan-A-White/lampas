# Public-domain works: Spurgeon first, then the next ones (mw-5r3p30.898)

A fact probe for the held grilling map mw-6ww.150. His words (Postern general, 2026-10-31 03:58Z): "if you're reading in Romans and you know save Charles Spurgeon has four or five sermons on you know Romans 5 you know you could you could see those coming ... anywhere where he refers to a Bible text that you'd have the links and you could click back into the Bible ... we can get things that are either available for public domain or available in MIT or that you know the licenses acceptable or it's non-commercial". His licence bar (03:54Z on mw-cbsbw9q): public domain, MIT, an acceptable licence, or non-commercial; Lampas is not for sale, but a paid licence gate (the AI licence, VISION.md 'Free to read, a licence for the AI') may still matter, so a non-commercial term is flagged per source.

Everything here was read on 2026-10-31. No code was written and no text data is committed: files were fetched into a temp dir (`/tmp/pdw`) and measured there. Counts are mine, from the files named; a number that is approximate says so.

<!-- toc -->

- [The short answer](#the-short-answer)
- [Is the text public domain?](#is-the-text-public-domain)
- [Spurgeon: the sources](#spurgeon-the-sources)
  - [CCEL's volumes: what the ThML says about completeness](#ccels-volumes-what-the-thml-says-about-completeness)
- [How a sermon's text and its references are given: ten sermons measured](#how-a-sermons-text-and-its-references-are-given-ten-sermons-measured)
  - [CCEL (ThML)](#ccel-thml)
  - [Spurgeon Gems (PDF)](#spurgeon-gems-pdf)
  - [The Spurgeon Library (HTML)](#the-spurgeon-library-html)
  - [lyteword markdown (GitHub, CC0)](#lyteword-markdown-github-cc0)
- [Coverage: Romans, chapter by chapter](#coverage-romans-chapter-by-chapter)
- [Coverage: the whole corpus by book](#coverage-the-whole-corpus-by-book)
- [Spurgeon's other works](#spurgeons-other-works)
- [The next public-domain works, ranked](#the-next-public-domain-works-ranked)
- [The Apostolic Fathers, Greek and English](#the-apostolic-fathers-greek-and-english)
- [Latin-English starting points](#latin-english-starting-points)
- [Fit with what Lampas has](#fit-with-what-lampas-has)
- [Not verified](#not-verified)
- [Sources read](#sources-read)

<!-- /toc -->

## The short answer

- **Spurgeon's 3,563 numbered sermons (63 volumes, 1855-1917) are public domain** (he died in 1892; the last volume is 1917). Four digitised editions were read. **Only the CCEL edition is machine-readable with tagged Scripture**: ThML/XML per volume, each sermon's preaching text in a `<scripCom type="Sermon" ... osisRef=...>` element and each cited verse in `<scripRef ... osisRef=...>`. 3,476 of its 3,527 distinct sermon numbers have a preaching text that resolves to a book and chapter.
- **Terms differ by edition.** CCEL: "may be used for personal, educational, or non-profit purposes", commercial use needs permission. Spurgeon Gems: copy "provided you observe" no charge, **no changes to the content**, credit. The Spurgeon Library (spurgeon.org): "All rights reserved" on the site. A GitHub markdown edition (lyteword/chspurgeon-sermons) is **CC0-1.0**, complete (3,536 files), but its punctuation is damaged in places and it names no source edition.
- **Romans 5: 22 sermons have their preaching text in Romans 5** (33 sermons cite a Romans 5 verse anywhere, by the CCEL tags; the Spurgeon Gems Scripture index agrees: 22 texts and 13 further entries that are Bible readings (expositions) before a sermon). Romans 8 has 31, Romans 10 has 15. The corpus has 131 sermons on a Romans text and 3,476 on any text; Psalms 425, John 307, Isaiah 264, Luke 229, Matthew 217.
- **Body references are mostly not tagged.** The median CCEL sermon has one tagged `scripRef`, the preaching text itself (5,875 tagged references across 3,539 sermons, mean 1.66). On ten named sermons, 57 references were tagged, all 57 with a machine reading (`osisRef`); a plain-text regex found 3 more that the tags missed and 5 tags the regex missed.
- **Size.** The CCEL sermons are about 131 MB of plain text (37 KB a sermon). An index of "works on this chapter" (number, title, preaching text) is 225 KB (68 KB gzipped). Lampas's `public/data` is already 113 MB.
- **The next works** (below) are best had from CCEL's ThML (public domain, per-verse `scripCom type="Commentary"` in Calvin) and from CrossWire's SWORD modules (all `DistributionLicense=Public Domain`): Matthew Henry, Calvin, Barnes, JFB, Keil and Delitzsch, the Treasury of Scripture Knowledge, Clarke.
- **Apostolic Fathers:** the best Greek is Open Apostolic Fathers (Tauber and Macdonald, Lake's text corrected against scans, CC BY-SA 4.0, plain text one verse a line). Word-level data exists only as Celano's automatic analysis, **CC BY-NC 4.0**, with the lemma left ambiguous in places.

## Is the text public domain?

Spurgeon died on 1892-01-31. The sermons were published weekly from 1855 and bound in 63 volumes, the last published in 1917 (CCEL's list: "Spurgeon's Sermons Volume 63: 1917"). Every volume predates 1929 (public domain in the United States by date) and the author died more than 70 years ago (public domain under life plus 70 as well). **The words are public domain.** What a digitised edition adds (a modern editor's introduction, modernised spelling, the typing and tagging, a PDF's layout, a site's database) can carry its own terms; the sections below quote them. Gems' PDFs are visibly a modernised edition ("offense" where the 1855 print and CCEL read "offence"), so its text is itself an edited version.

## Spurgeon: the sources

Terms are quoted verbatim, with the page they were read on.

| Source | Format | Sermons | Terms (verbatim) | May a free non-commercial web app ship it? |
| --- | --- | --- | --- | --- |
| **CCEL** `ccel.org/ccel/spurgeon/sermonsNN` | ThML/XML (`/ccel/spurgeon/sermonsNN.xml`), also HTML, PDF, EPUB, DOC, plain text | 3,539 sermon entries in 63 volumes (3,527 distinct numbers) | https://ccel.org/about/copyright.html: "Most of the editions at the Christian Classics Ethereal library are based on books that are public domain in the United States. However, they may have copyrighted introductions, cover art, and other special contents." "These books may be used for personal, educational, or non-profit purposes. Contact us for permission to republish CCEL works or to use them commercially." "website and special contents copyright 1993-2020 Harry Plantinga." The ThML header of the sermons has `<DC.Rights />` empty; the ThML file is headed `<!-- Copyright Christian Classics Ethereal Library -->`. | Within "non-profit" while the app is free; Lampas's paid AI licence makes "commercial" arguable, so ask CCEL (contact on the same page) before shipping the markup; the underlying words are free in any case. Linking is always open. |
| **Spurgeon Gems** `spurgeongems.org` (Chapel Library, Mt Zion Bible Church) | One PDF per sermon (`/sermon/chsN.pdf`), a Sermons Index PDF, OT and NT Scripture Index PDFs | 63 volumes; 3,557 distinct PDF names on the index page (some are prefaces and combined numbers like `chs7-8.pdf`) | https://www.spurgeongems.org/about-us/ 'Copyright Policy': "We are glad to give you permission to use any of the material on this website provided you observe the following: Do not charge for the material. Do not make any changes to the content. Give credit to the author, and cite the source as www.spurgeongems.org. ... For other uses, please contact us at chapel@mountzion.org." Footer: "Copyright 2011-2019 Spurgeongems.org". | **Must link** (or ship the PDFs untouched with the credit): "do not make any changes" rules out re-flowing the text into a reader. Its Scripture Index PDFs are the only per-chapter index among the PDFs, and they are a PDF. |
| **The Spurgeon Library** `spurgeon.org` (The Spurgeon Center, Midwestern Baptist Theological Seminary) | HTML pages (`/sermons/<slug>`), a PDF each (WP Engine uploads), search by Algolia | "3,563 Sermons Published" on its home page; its four sermon sitemaps list about 3,570 URLs | Footer of a sermon page, https://www.spurgeon.org/sermons/law-and-grace: "The Spurgeon Center. All rights reserved." and "©2026 Midwestern Baptist Theological Seminary". `robots.txt`: `Allow: /`, `Disallow: /api/`. No terms page (`/terms` and `/privacy` return 404). | **Must link.** "All rights reserved" is on the site, not the Words, but there is no licence to copy the site's text or its PDFs. |
| **Project Gutenberg** | HTML, EPUB, plain text | No sermon series. Spurgeon in Gutenberg: The Treasury of David, Vol 1 (#79723, released 2026-10-04) and Vol 2 (#79727) of 6, Gleanings among the Sheaves (#42657), Around the Wicket Gate (#60669), Talks to Farmers (#42518), The Art of Illustration (#42558) | https://www.gutenberg.org/cache/epub/79723/pg79723.txt: "This eBook is for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at www.gutenberg.org." https://www.gutenberg.org/policy/permission.html: "The vast majority of Project Gutenberg eBooks are in the public domain in the US. This means that nobody can grant, or withhold, permission to do with this item as you please." | **May ship** (keep the Gutenberg licence text with the book, or strip the trademark and the text is public domain). Covers only the books above. |
| **lyteword/chspurgeon-sermons** (GitHub, created 2025-06-16, commits to 2026-10-31) | Markdown, one file per sermon, `volume-N/sermon-N.md` (`sermon_N.md` from vol 7 on) | 3,536 `.md` files for sermon numbers 1-3563 (3,533 distinct numbers; files like `sermon_385-388.md` hold a combined entry) | `LICENSE` is the CC0 1.0 Universal legal code; GitHub reports `CC0-1.0`. The README names no source edition. | **May ship the file**, with the risk that CC0 is the repo owner's claim over text from CCEL or Spurgeon Library (the spelling "offence" and "&mdash;" suggest one of those, not Gems), and that the repo is being cleaned by hand right now (commits "cleanup formatting on sermon 970" on 2026-10-30). |
| **FottyM/spurgeon-gems** (GitHub, 2021) | Puppeteer scraper plus one `json/spurgeongems.json` of 122 KB | a sample only | `MIT` (the scraper's code). | The MIT covers the scraper, not Spurgeon Gems's content, which keeps Gems's terms. Not a source. |

Other GitHub results that are not corpora: `jclements3/spurgeon` (no licence), `AgapePress/spurgeon-sermons` (no licence), `iandev096/spurgeonmon-scraping` (a scraper, no licence), `TheTom/pastors-pocket-spurgeon` (a fine-tune, Apache-2.0).

### CCEL's volumes: what the ThML says about completeness

63 volumes, `sermons01` to `sermons63`. Volume 63 has 19 sermons (the series ends at 3563). The `<comments>` element of volumes 1-8, 14 and 17 reads "This volume is incomplete." (or "mostly complete" for 7 and 8); volume 6's reads "This volume is complete. No. 331 and 332 are not sermons but dedications or something." Of the numbers 1 to 3563, 37 have no entry of their own: 8, 40, 42, 67, 142, 155, 269, 270, 298, 331, 332, 353, 383, 384, 386-390, 414, 423-426, 454, 469, 470, 631, 683, 1548, 1876, 2002, 2019, 2123, 2137, 2883, 3032. Several are the second half of a combined sermon (7-8, 39-40, 41-42 appear as one entry) and some are meetings or dedications. Twelve numbers appear twice (1331, 1451, 1452, 1454, 1457, 1459, 1461, 1463, 1465, 1467, 1634, 2237), a few titles are mis-numbered in the source (volume 12 has an entry numbered "6823", volume 2 one titled "Sermon 82.htm."). The file structure: each sermon is a `<div1 title="Sermon 37. Law and Grace" id="...">`; the last `div1` of each volume is the Indexes (a Scripture index by book and verse linking back to each sermon).

## How a sermon's text and its references are given: ten sermons measured

The ten: **1** The Immutability of God, **12** The Peculiar Sleep of the Beloved, **37** Law and Grace, **62** Exposition: 1 John 3:1-10, **104** Love's Commendation, **330** Reigning Grace, **385** Exposition of the Doctrines of Grace (385-388 as one entry), **1191** For Whom Did Christ Die?, **2544** The One and the Many, **3392** Justification by Faith. They span volumes 1 to 60, three are expositions or meetings (62, 385) or an ordinary sermon whose text is not tagged (12), and six preach on Romans 5.

A "regex" below is one pattern I wrote for `Book chapter:verse` (arabic or lower-case roman chapter) applied to the sermon's plain text; it is a yardstick, not a parser Lampas has.

### CCEL (ThML)

| No. | Preaching text field (`scripCom type="Sermon"`) | Tagged `scripRef` | Tagged with `osisRef`/`parsed` | Regex finds | Regex hits that are tagged | Found only by regex |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Malachi 3:6 | 1 | 1 | 1 | 1 | 0 |
| 12 | **none** | 0 | 0 | 1 | 0 | Psalm 127:2 |
| 37 | Romans 5:20. | 5 | 5 | 5 | 5 | 0 |
| 62 | **none** (an exposition) | 1 | 1 | 1 | 1 | 0 |
| 104 | Romans 5:8. | 1 | 1 | 1 | 1 | 0 |
| 330 | Romans 5:21 | 1 | 1 | 1 | 1 | 0 |
| 385 | **none** (a meeting) | 37 | 37 | 36 | 35 | 1 Peter, i. 5 |
| 1191 | Romans 5:6. | 2 | 2 | 3 | 2 | Ezekiel 16:1-14 |
| 2544 | Romans 5:16 | 8 | 8 | 5 | 5 | 0 |
| 3392 | Romans 5:1 | 1 | 1 | 1 | 1 | 0 |

- **The text is a field**: an empty element at the head of the sermon, `<scripCom type="Sermon" passage="Malachi 3:6" parsed="|Mal|3|6|0|0" osisRef="Bible:Mal.3.6" />`, and the same verse is also a `<scripRef>` in the paragraph that quotes it ("I am the Lord, I change not ...—<scripRef ...>Malachi 3:6</scripRef>"). The quoted words of the text are free text in that paragraph. Seven of ten sermons have the field; the three without are the ordinary sermon 12 and two expositions.
- **Across the corpus**: 3,494 of 3,539 sermon entries have the field and 3,477 of those carry a machine reading (`osisRef` or `parsed`). 17 fields have none: six are empty (416, 417, 483, 490, 505, 537) and eleven are misspelt (`Solomon 5:2-8`, `EzekieI47:5.`, `2 Corinthians, 5:17.`, `Zechaariah 12:10.`, `Maalachi 3:17.`, `Solomon's Song 1:4.` and four more Song of Songs). A tolerant parser on `passage` resolves ten of them; 3,476 of the 3,527 distinct sermon numbers resolve to a book, and the other 51 have no usable field (expositions, meetings and dedications, the six empty fields, a few unreadable).
- **References inside the sermon are tagged**, but sparsely: 57 tagged against about 60 references that exist in the ten (57 of 60 is 95%); all 57 tags carried `osisRef` and `parsed` (100%). The 3 missing tags were `Psalm 127:2` (the whole of sermon 12's text), `Ezekiel 16:1-14` and `1 Peter, i. 5`. Over the whole corpus the 3,539 sermons carry 5,875 tagged references (median 1, mean 1.66; the most is sermon 385 with 37), and 75 sermons carry none.

### Spurgeon Gems (PDF)

Eight of the ten PDFs were fetched at `spurgeongems.org/sermon/chsN.pdf` (`chs1`, `chs12`, `chs37`, `chs104`, `chs330`, `chs1191`, `chs2544`, `chs3392`); `chs62.pdf` and `chs385-388.pdf` returned 404 under those names and were not looked up further. With a hand-written extractor (no PDF library was installed) the header gave the title, the number, the date and the text with its reference ("Romans 5:20") for **7 of 8**; sermon 3392 uses a different header ("Sermon # 3392 Metropolitan Tabernacle Pulpit ... Volume 60") and my extractor got no reference line from it. Inside the sermon the references are plain text in a PDF with no tags: the regex found 1, 1, 1, 1, 1, 1, 4 and 0 in the eight. **A PDF needs a PDF reader and a parser; nothing is marked.** The Scripture Index PDFs list "Scripture, Volume, Sermon Number" by verse and mark expositions ("Exposition following sermon #2497"); they too are PDF text (the NT index is 63 pages), with extraction artefacts ("2*74" for 274).

### The Spurgeon Library (HTML)

Ten slugs were tried at `spurgeon.org/sermons/<slug>`; nine exist (`exposition-1-john-3-1-10` is a 404 guess). The page header is **structured**: volume ("New Park Street Pulpit Volume 1"), "No.", title, **the preaching text as its own line** ("Romans 5:20" or "Psalms 127:2"), the date, a View PDF link. Eight of nine pages have the text line (the ninth is the Exposition of the Doctrines of Grace, which has none). Inside the sermon the text is plain HTML (the page ships its body as an HTML string in its data payload) and **no Scripture reference is a link or a tag** (0 of 9 pages have a Scripture href). One page's date is wrong on its face: sermon 12, in the 1855 volume, is dated "March 4, 1885". Its sitemap lists 894 `/scripture/<book>-<chapter>/` pages (for example `/scripture/romans-5/`), but all of them return 404 today, so the Library's by-chapter pages cannot be read or linked as of this probe; the search page says "Search through Spurgeon's sermons, articles, books, and lectures by title, scripture reference, topic, or keyword. Powered by Algolia", client side (`/api/` is disallowed by `robots.txt` and was not used).

### lyteword markdown (GitHub, CC0)

Nine files fetched (sermon 62 has no file of its own; 385 is `sermon_385-388.md`). Each starts `# Sermon 37 | Law and Grace`, then a blockquote of the text and its reference on the next line (`> Romans 5:20`), then the body. The reference line was present in **7 of 9** (1, 12, 37, 104, 330, 2544, 3392); in 1191 it is glued into a sentence (`Christ died for the ungodly.''Romans 5:6.`) and in 385-388 there is none. **No tags**: the references are plain text and the regex found 1, 1, 5, 3, 1, 2, 2, 1 and 36 in the nine. Punctuation damage was seen: em dashes became `&mdash;` in some files and were lost in others ("an infant'an infant newly born").

## Coverage: Romans, chapter by chapter

"Text" counts sermons whose preaching text (`scripCom`, CCEL) lies in the chapter (a text that spans chapters counts in each). "Cited" counts sermons with any tagged `scripRef` in the chapter, the preaching text included. "Gems" counts rows of the Spurgeon Gems NT Scripture Index whose first reference is in the chapter, split into sermon texts and expositions (Bible readings before a sermon); it was counted from PDF text by pattern, so treat it as approximate. Source: all 63 CCEL ThML volumes, and https://www.spurgeongems.org/sindex_nt.pdf.

| Romans | Text (CCEL) | Cited (CCEL) | Gems: texts | Gems: expositions |
| --- | --- | --- | --- | --- |
| 1 | 4 | 10 | 4 | 1 |
| 2 | 4 | 6 | 4 | 1 |
| 3 | 8 | 13 | 8 | 6 |
| 4 | 6 | 14 | 6 | 3 |
| **5** | **22** | **33** | **22** | **13** |
| 6 | 10 | 14 | 10 | 3 |
| 7 | 6 | 11 | 6 | 1 |
| 8 | 31 | 51 | 30 | 19 |
| 9 | 5 | 11 | 6 | 2 |
| 10 | 15 | 16 | 15 | 8 |
| 11 | 1 | 8 | 1 | 0 |
| 12 | 4 | 6 | 4 | 1 |
| 13 | 4 | 4 | 4 | 0 |
| 14 | 1 | 2 | 0 | 1 |
| 15 | 8 | 10 | 8 | 1 |
| 16 | 2 | 3 | 2 | 0 |

131 sermons have a Romans text; 186 distinct sermons cite a Romans verse (tagged). The two sources agree on every chapter except 8, 9 and 14 (by 1 to 2 rows), which supports both counts.

The 22 sermons with their text in Romans 5 (number, title, text; volume in brackets): 37 Law and Grace, 5:20 (1); 104 Love's Commendation, 5:8 (2); 330 Reigning Grace, 5:21 (6); 446 The Old, Old Story, 5:6 (8); 510 Peace By Believing, 5:1 (9); 829 The Perfuming of the Heart, 5:5 (14); 1045 Joy in a Reconciled God, 5:11 (18); 1184 The Sad Plight and Sure Relief, 5:6 (20); 1191 For Whom Did Christ Die?, 5:6 (20); 1456 Peace—a Fact and a Feeling, 5:1 (25); 1591 Honey From A Lion, 5:15 (27); 1904 The Personal Pentecost and the Glorious Hope, 5:5 (32); 2012 Grace Abounding Over Abounding Sin, 5:20 (34); 2341 The Underlying Gospel for the Dying Year, 5:6 (39); 2544 The One and the Many, 5:16 (43); 2550 Joy in God, 5:11 (44); 2587 "Much More", 5:10 (44); 2744 Lost Through One—Saved Through One, 5:16 (47); 3115 Sin and Grace, 5:20 (54); 3304 Grace Abounding, 5:20 (58); 3339 The Heart Perfumed, 5:5 (59); 3392 Justification by Faith, 5:1 (60).

## Coverage: the whole corpus by book

Sermons whose preaching text lies in the book (CCEL `scripCom`; a sermon on two books counts in both). 3,476 of 3,527 distinct sermon numbers resolve; the Old Testament has 1,682 and the New 1,809 (Psalms 425 is 12% of the entries).

| Book | Sermons | Book | Sermons | Book | Sermons |
| --- | --- | --- | --- | --- | --- |
| Genesis | 93 | Isaiah | 264 | Romans | 131 |
| Exodus | 53 | Jeremiah | 90 | 1 Corinthians | 81 |
| Leviticus | 14 | Lamentations | 13 | 2 Corinthians | 61 |
| Numbers | 25 | Ezekiel | 53 | Galatians | 42 |
| Deuteronomy | 41 | Daniel | 17 | Ephesians | 66 |
| Joshua | 15 | Hosea | 48 | Philippians | 34 |
| Judges | 20 | Joel | 7 | Colossians | 30 |
| Ruth | 5 | Amos | 14 | 1 Thessalonians | 16 |
| 1 Samuel | 39 | Obadiah | 1 | 2 Thessalonians | 14 |
| 2 Samuel | 33 | Jonah | 10 | 1 Timothy | 21 |
| 1 Kings | 31 | Micah | 17 | 2 Timothy | 21 |
| 2 Kings | 28 | Nahum | 4 | Titus | 8 |
| 1 Chronicles | 16 | Habakkuk | 8 | Philemon | 2 |
| 2 Chronicles | 25 | Zephaniah | 4 | Hebrews | 130 |
| Ezra | 1 | Haggai | 4 | James | 25 |
| Nehemiah | 9 | Zechariah | 36 | 1 Peter | 41 |
| Esther | 2 | Malachi | 12 | 2 Peter | 9 |
| Job | 86 | Matthew | 217 | 1 John | 56 |
| Psalms | 425 | Mark | 85 | 2 John | 0 |
| Proverbs | 44 | Luke | 229 | 3 John | 1 |
| Ecclesiastes | 12 | John | 307 | Jude | 12 |
| Song of Songs | 63 | Acts | 96 | Revelation | 74 |

## Spurgeon's other works

| Work | Where, and the terms | Format and shape |
| --- | --- | --- |
| **The Treasury of David** (verse by verse on the Psalms; 6 volumes in the Marshall Brothers edition Gutenberg is releasing) | CCEL has "Treasury of David: Volume I" (`/ccel/spurgeon/treasury-series`); Gutenberg has Vol 1 (#79723) and Vol 2 (#79727) of 6, from 1872 Marshall Brothers, proofed by Distributed Proofreaders; the Spurgeon Library's sitemaps list no Treasury. CCEL and Gutenberg terms as above. | ThML at CCEL; text, HTML and EPUB at Gutenberg. A verse-keyed commentary on one book, the best match to "show it at the verse". |
| Morning and Evening; Faith's Checkbook | CCEL (`morneve`, `checkbook`); the Library lists 732 and 366 pages. | Each day's page opens with a Bible text ("Renew a right spirit within me." — Psalm 51:10); a devotional, not a chapter work. |
| Sermons on Proverbs; Till He Come; All of Grace; Commenting and Commentaries; Puritan Catechism | CCEL author page `ccel.org/ccel/spurgeon` lists them; the Library lists 44, 24, 21, 5 and 83 pages. | ThML at CCEL. |
| Lectures to My Students; Around the Wicket Gate; Gleanings among the Sheaves; Talks to Farmers; The Art of Illustration | The Library lists 30, 11, 125, 19 pages; Gutenberg has Gleanings (#42657), Wicket Gate (#60669), Farmers (#42518), Illustration (#42558). | Prose, not keyed to Scripture. |
| Autobiography; magazine articles (The Sword and the Trowel) | The Library lists 106 and 29 pages. | Not keyed to Scripture. |

The Library's page counts above are the number of URLs in its sitemaps, not checked against the text.

## The next public-domain works, ranked

Ranked by how directly they answer "I am in this chapter, what is there to read on it": a verse-keyed commentary first, then a sermon or devotional set, then books. For the source and terms I checked the CCEL ThML header (`DC.Rights`) and the CrossWire module file (`DistributionLicense`) of each.

1. **Matthew Henry, Commentary on the Whole Bible** (and the Concise): CCEL `henry/mhc` (`DC.Rights` "Public Domain") and `henry/mhcc` ("Public Domain"); CrossWire `mhc.conf` ("Public Domain", OSIS, 15.6 MB) and `mhcc.conf` ("Public Domain"). Verse-keyed already in the SWORD modules.
2. **Calvin's commentaries** (Calvin Translation Society, 1840s-50s): CCEL `calvin/calcom01`...`calcom45` (Romans is `calcom38`, `DC.Rights` "Public Domain"); CrossWire `calvincommentaries.conf` ("Public Domain", OSIS, 21.6 MB, text source ccel.org). **The CCEL ThML of Romans tags every verse**: `<scripCom type="Commentary" passage="Ro 1:1" parsed="|Rom|1|1|0|0" osisRef="Bible:Rom.1.1" />` (797 `scripRef` tags in the Romans file alone).
3. **Treasury of Scripture Knowledge:** CrossWire `tsk.conf` ("Public Domain", ThML). Cross-references verse by verse, which is what "links back into the Bible" is.
4. **John Gill's Exposition:** no CCEL work (`ccel/gill/gill` is a 404) and no CrossWire module in the 428 module files listed; scans at the Internet Archive and sites such as StudyLight and Bible Hub carry it. **No licensed machine-readable source verified**; the text is public domain (Gill died 1771).
5. **Barnes' Notes on the New Testament:** CCEL `barnes/ntnotes` ("Public Domain", published Baker Book House 1949 per the header); CrossWire `barnes.conf` ("Public Domain", ThML). New Testament only, which is the half Lampas reads in Greek.
6. **Jamieson, Fausset and Brown:** CCEL `jamieson/jfb` ("Public Domain", 1871); CrossWire `jfb.conf` ("Public Domain", OSIS, text source `ccel.org/ccel/j/jamieson/jfb/cache/jfb.txt`).
7. **Keil and Delitzsch (Old Testament):** CrossWire `kd.conf` ("Public Domain", OSIS, text source en.wikisource.org). Old Testament only. (A CCEL work id was not found at `keil/otcom`; not searched further.)
8. **Adam Clarke:** CrossWire `clarke.conf` ("Public Domain", OSIS, text source en.wikisource.org). Older and wider than the New Testament.
9. **John Lightfoot's commentary** (not J. B. Lightfoot): CrossWire `lightfoot.conf` ("Public Domain", ThML; text source philologos.org). A rabbinic-parallels commentary on the Gospels, Acts, 1 Corinthians.
10. **Spurgeon's Treasury of David and Morning and Evening** (above), which Spurgeon-first already covers.

The CrossWire module files were read at `https://www.crosswire.org/ftpmirror/pub/sword/raw/mods.d/<name>.conf` (only the `.conf` files, not the module data). A SWORD module's data is a binary format; the text a build would take is the OSIS or ThML source it came from, so each CCEL ThML in this list is the better starting file where CCEL has it. The `DistributionLicense=Public Domain` line is CrossWire's own statement about its distribution, in the same way "Public Domain" in `DC.Rights` is CCEL's: both are the digitiser's statement, as with Spurgeon.

## The Apostolic Fathers, Greek and English

| Candidate | Licence or terms (verbatim, URL, 2026-10-31) | Format | Word-level data? |
| --- | --- | --- | --- |
| **Lightfoot (and Harmer), The Apostolic Fathers, 1891**, Internet Archive `a590752000clemuoft` (Macmillan 1891, "revised texts", Greek and English) | Archive metadata: `possible-copyright-status` "NOT_IN_COPYRIGHT"; no licence field. https://archive.org/metadata/a590752000clemuoft | Scan: PDF 47 MB, EPUB, OCR text (`_djvu.txt`, 1.6 MB) | No (OCR text). |
| **Lightfoot, The Apostolic Fathers (English), CCEL** `ccel/lightfoot/fathers` | ThML header `<DC.Rights>Public Domain</DC.Rights>`; `<published>Baker Book House, 1956</published>`. CCEL copyright policy as above ("personal, educational, or non-profit"). | ThML/XML, HTML, EPUB, PDF | No. 1 `scripRef` and 2 `div1`: little structure. English only. |
| **Lake, The Apostolic Fathers, Loeb 1912/1913, Internet Archive** `apostolicfathers0001kirs` (William Heinemann, 1912) | Archive metadata carries no rights or licence field (`possible-copyright-status` is empty). https://archive.org/metadata/apostolicfathers0001kirs. Published 1912, so public domain in the United States by date. | Scan: PDF 12.7 MB, OCR text (566 KB) | No. |
| **Lake (Loeb), CCEL** `ccel/lake/fathers2` | ThML header `<DC.Rights>Public Domain</DC.Rights>`; `<published>Loeb Classical Library, first published 1913</published>`; transcriber George Somsel. Its description: "this version of Apostolic Fathers remains in the original Greek". | ThML/XML. **Greek only** (314,775 Greek characters, 9 `div1`): no English in that file. | No. |
| **Open Apostolic Fathers** (Tauber and Macdonald), `github.com/jtauber/apostolic-fathers`, Zenodo DOI 10.5281/zenodo.2555673, last push 2022-12-08 | README: "This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License." (GitHub reports no licence file.) | **Plain text, one verse a line** (`texts/011-didache.txt`: `1.1 Ὁδοὶ δύο εἰσί, ...`), 15 works (1-2 Clement, seven Ignatius letters, Polycarp, Didache, Barnabas, Shepherd, Martyrdom of Polycarp, Diognetus); also HTML at `jtauber.github.io/apostolic-fathers/`. Lake's text corrected against scans. | The README says "Lemmatisation and morphological analysis will follow"; nothing in the repo does that yet. **But** its `raw-gcelano-analysis/` holds Celano's analysis (next row) of 14 works. |
| **Celano's lemmatised Greek XML** (`gcelano/LemmatizedAncientGreekXML`, 2017, copies in `jtauber/apostolic-fathers/raw-gcelano-analysis/`) | README: "This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License." (`https://creativecommons.org/licenses/by-nc/4.0/`; GitHub reports no licence file.) | XML, a token per `<t>` with the form `<f>`, a Mate-tagger morphology string in `o="v3spia---"` and the candidate lemmas from Perseus and Morpheus in `<l1>`/`<l2>` | **Yes, automatic and ambiguous:** `δεῖ` carries three candidate lemmas (`δέω`, `δέω2`, `δεῖ`); some tokens have a lemma id and no lemma. Covers CTS ids tlg1271.001/.002 (Clement), tlg1443.004-.010 (Ignatius letters and Polycarp), tlg1419.001 (Hermas), tlg1311.001, tlg1622.001, tlg0646.004, tlg1484.001. **Non-commercial** (acceptable by his bar; flag for the paid AI licence). |
| **Perseus / First1KGreek** (`OpenGreekAndLatin/First1KGreek`, `PerseusDL/canonical-greekLit`) | GitHub reports `CC-BY-SA-4.0` for both; the Perseus README: "Unless otherwise indicated, all contents of this repository are licensed under a Creative Commons Attribution-ShareAlike 4.0 International License." | TEI/EpiDoc XML by CTS URN (Clement of Rome is `tlg1271`, Ignatius `tlg1443`, Hermas `tlg1419` in First1KGreek) | No word-level data in the text files themselves. |

Greek with word-level data is therefore **Celano's tagging over the Lake text**, and that is CC BY-NC, ambiguous in its lemmas, and (as the README says) partly automatic. English: Lightfoot via CCEL (English only), Lightfoot-Harmer and Lake on the Internet Archive (scans and OCR).

## Latin-English starting points

- **Perseus canonical-latinLit** (`github.com/PerseusDL/canonical-latinLit`): "Unless otherwise indicated, all contents of this repository are licensed under a Creative Commons Attribution-ShareAlike 4.0 International License. You must offer Perseus any modifications you make." (GitHub: `CC-BY-SA-4.0`, last push 2026-10-30.) TEI/EpiDoc XML by CTS URN, some works with English editions alongside.
- **The Latin Library** (`thelatinlibrary.com`): "I have taken every reasonable precaution to ensure that the Latin texts presented here are in the Public Domain. If any copyright is claimed, please advise us immediately." HTML, "No morphological or vocabulary aid", "There are no translations at this site." No licence grant; a link, not a source to ship. (https://www.thelatinlibrary.com/about.html)
- **Whitaker's Words** (`github.com/mk270/whitakers-words`; GitHub reports `NOASSERTION`): "Permission is hereby freely given for any and all use of program and data. You can sell it as your own, but at least tell me." and "All parts of the WORDS system, source code and data files, are made freely available to anyone who wishes to use them, for whatever purpose." A Latin to English dictionary and morphological analyser, so the Latin word-level starting point.

## Fit with what Lampas has

No code is written here. This is where each part of a "works on this chapter" list and a work reader would plug in.

- **The template is the maps module, not the study resources.** `src/resources/` builds links only: `docs/resources.md` opens "Only links are built: no lexicon text is bundled in Lampas and none is fetched". Its contract is `StudyResource` in `src/resources/types.ts` and the registry is `RESOURCES` in `src/resources/index.ts` (`[strongs, logos]`), which makes one On | Off switch each in Settings > Study resources. A Spurgeon list with text is not a link builder. `src/maps/` is: a `MapSource` registered in `src/maps/sources/index.ts` (`SOURCES`), one switch per source in Settings made by `mapSourceSetting` (`src/settings/definitions/maps.ts`, key `maps.<id>`), `enabledSources` in `src/maps/enabled.ts`, `mapsFor` and `useMaps` to answer a chapter or verse, and its own data under `src/maps/data/`. A "works" module (`src/works/`, a `WorkSource` per work, switch `works.<id>`) would have the same four parts.
- **Where the list shows**: `src/reader/ChapterActions.tsx` (line 27 draws `MapsDoor` at the foot of every chapter, only when the chapter has maps, and not in Immersive) is where a "Works on this chapter · N" door sits. `src/VerseView.tsx` (line 231, beside `InLogosDoors`) is the verse pop-up's place: the works that cite this verse. Do not add a control to the Reader header (`src/reader/ReaderHeader.tsx` is full at 390 px); the chips row is `src/ReaderChips.tsx`. The sheet follows `src/maps/MapsSheet.tsx` and `MapsHost` in `src/App.tsx`.
- **The work reader**: a screen for one sermon or commentary entry, reached from that sheet, with each tagged reference (`osisRef`) turned into a link to the chapter and verse in the Reader (the link forms are in `docs/links.md`; the Reader's routes in `src/nav/route.ts`). A reference needs the book code of `public/data/index.json` (`src/data/canon.ts`), so the `osisRef` book (`Rom`, `1Cor`, `Ps`) needs a map to Lampas's codes (`rom`, `1co`).
- **The Library** (`src/library/`, `src/resources/catalogue.ts`): `KINDS` is `lexicon, grammar, greek-text, interlinear, commentary, bible, devotional`, and the 'commentary' kind there is the reader's own Logos books opened by link (VISION.md line 33: "never put a reader's licensed books (Logos) in the app or the tutor"). A public-domain shelf is a different thing from that kind. If it is shown in the Library, it is a new kind in `src/library/kinds.ts` (its `INFO` is a `Record<Kind, ...>`, so every use of `Kind` needs the new case) or a separate section, not a row in the Logos commentary page.
- **Data and offline**: the chapter data is `public/data/<book>/<n>.json`, fingerprinted in `public/data/index.json` and kept offline by `src/data/offlineCopy.ts` and the worker (`src/sw.ts`, `src/dataCache.ts`). Of the sizes measured: an index per chapter (a few KB) can ship and be kept offline like a chapter; 131 MB of sermon text cannot ride the offline copy beside a 113 MB `public/data` without being its own opt-in download, or it is fetched on demand from the VPS, or it is a link out.
- **Credit and tests**: a new text is an entry in `ATTRIBUTION.md` (the About screen's source), a line in `src/preface.ts` (the Preface rule, `docs/PREFACE.md`), a `CREDITS` entry in `src/tutor/credits.ts`, and, for a bundled data directory, a rule in `tests/support/credits.ts` (`bundledFiles`; `tests/unit/credits.test.ts` fails otherwise). A new switch is classified in `BEARS_ON` of `src/tutor/knows.ts` or `tests/unit/tutor-knows.test.ts` fails. A new Help item is a line on an existing page: Help holds at most 12 pages (`src/help.ts`). `CLAUDE.md` sits under its 16,000-byte cap, so a new docs/ file is paid for by a trim.
- **The licence gate**: reading needs no licence (VISION.md 'Free to read, a licence for the AI'). A works list is reading, so it would be free; only asking the tutor about a sermon would be gated. Whether the paid AI licence makes Lampas "commercial" to CCEL ("Contact us for permission to republish CCEL works or to use them commercially") is a question for CCEL, not decidable from the file.

## Not verified

- CCEL's terms were read from its copyright page; CCEL was not asked whether a free app with a paid AI licence counts as non-profit use.
- The Spurgeon Gems Scripture-index counts come from a hand-written PDF text extractor and a pattern over its output; two of the ten named PDFs were not fetched under the names tried.
- The Spurgeon Library's `/scripture/...` pages are listed in its sitemap and returned 404 on 2026-10-31; the Algolia search was not driven.
- lyteword's source edition is not stated; "CC0" is its owner's claim.
- Gill and Keil and Delitzsch have no CCEL file identified here; Gill has no machine-readable source verified.
- The Apostolic Fathers' Lake English was not found in a machine-readable PD file in this pass (CCEL's Lake is Greek only); the Internet Archive scans have OCR text only. The Latin-English notes cover licences, not coverage.

## Sources read

All fetched 2026-10-31 into a temp dir; nothing from them is committed.

CCEL: https://ccel.org/ccel/spurgeon (author page); https://www.ccel.org/ccel/spurgeon/sermons01 (work page, formats); https://ccel.org/ccel/spurgeon/sermons01.xml to `sermons63.xml` (63 ThML files); https://ccel.org/ccel/spurgeon/sermons01/cache/sermons01.txt; https://ccel.org/about/copyright.html; https://ccel.org/ccel/lightfoot/fathers and `.xml`; https://ccel.org/ccel/lake/fathers2 and `.xml`; https://ccel.org/ccel/henry/mhc(.xml), henry/mhcc(.xml), jamieson/jfb(.xml), calvin/calcom01, calvin/calcom38 and `calcom38.xml`, barnes/ntnotes(.xml), spurgeon/treasury-series(.xml), schaff/hcc1 (the last as a page-exists check); 404 checks on https://ccel.org/ccel/gill/gill, keil/otcom, clarke/comm, lake/fathers.

Spurgeon Gems: https://www.spurgeongems.org/ ; /about-us/ ; /spurgeon-sermons/ ; /sindex_nt.pdf ; /chstix.pdf ; /sermon/chs1.pdf, chs12.pdf, chs37.pdf, chs104.pdf, chs330.pdf, chs1191.pdf, chs2544.pdf, chs3392.pdf (and the 404s chs62.pdf, chs385-388.pdf); /vols1-3/chs37.pdf.

The Spurgeon Library: https://www.spurgeon.org/ ; /robots.txt ; /sitemap.xml ; /spurgeon_sermon-sitemap.xml, -sitemap2 to -sitemap4 ; /scripture_chapter-sitemap.xml ; the morning_and_evening, faiths_check_book, all_of_grace, lectures_students, around_wicket_gate, all_round_ministry, autobiography, puritan_catechism, commenting_books, till_he_come, proverbs_sermons, talks_to_farmers, gleanings_sheaves, spurgeon_book, magazine_article and spurgeon_article sitemaps ; /about ; /library ; /search ; /sermons/the-touch-2, law-and-grace, loves-commendation, the-immutability-of-god, the-peculiar-sleep-of-the-beloved, reigning-grace, for-whom-did-christ-die, the-one-and-the-many, justification-by-faith, exposition-of-the-doctrines-of-grace ; 404s: /terms, /privacy, /scripture/romans-5, /scripture/romans, /scripture, /sermons/exposition-1-john-3-1-10.

Project Gutenberg: https://www.gutenberg.org/ebooks/author/1413 ; /ebooks/search/?query=Spurgeon, `Spurgeon sermons`, `Spurgeon sermon`, `apostolic fathers` ; /cache/epub/79723/pg79723.txt ; /policy/permission.html.

GitHub (through the API and raw files): `lyteword/chspurgeon-sermons` (repo, README, LICENSE, tree, raw `volume-1/sermon-1.md`, `sermon-12.md`, `sermon-37.md`, `volume-2/sermon-104.md`, `volume-6/sermon-330.md`, `volume-7/sermon_385-388.md`, `volume-20/sermon_1191.md`, `volume-43/sermon_2544.md`, `volume-60/sermon_3392.md`); `FottyM/spurgeon-gems`; the repository searches "spurgeon sermons", "spurgeon corpus", "spurgeon sermons json", "ccel thml", "apostolic fathers greek morphology"; `jtauber/apostolic-fathers` (README, NOTES.md, trees, `texts/011-didache.txt` head, `raw-gcelano-analysis/tlg1271.tlg002.1st1K-grc1.xml` head); `gcelano/LemmatizedAncientGreekXML` (README, tree); `OpenGreekAndLatin/First1KGreek` (`data/tlg*/__cts__.xml` for tlg1271, tlg1443, tlg1419, tlg1272, tlg1311); `PerseusDL/canonical-greekLit` and `canonical-latinLit` (README); `mk270/whitakers-words` (README).

CrossWire: https://www.crosswire.org/ftpmirror/pub/sword/raw/mods.d/ (listing) and `barnes.conf`, `calvincommentaries.conf`, `clarke.conf`, `jfb.conf`, `kd.conf`, `lightfoot.conf`, `mhc.conf`, `mhcc.conf`, `tsk.conf`.

Internet Archive: https://archive.org/advancedsearch.php (title apostolic fathers, Lake or Lightfoot); https://archive.org/metadata/apostolicfathers0001kirs ; https://archive.org/metadata/a590752000clemuoft.

Latin: https://www.thelatinlibrary.com/ ; https://www.thelatinlibrary.com/about.html.

Web search: "Apostolic Fathers Greek text morphology lemma GitHub treebank 1 Clement Ignatius Didache" (led to `jtauber/apostolic-fathers`).
