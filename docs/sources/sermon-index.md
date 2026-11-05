# A sermon index: Matthew Henry, Logos sermon collections, modern preachers, themes (mw-5r3p30.1070)

A fact probe for the held grilling mw-6ww.150, widening mw-5r3p30.898 ([public-domain-works.md](public-domain-works.md)), which it extends and does not repeat (Spurgeon's sources, terms and coverage are there). His words (Postern general, 2026-11-05 10:45Z): "it would be great to have a sermon index in a database on the server that could be added to. It could point to modern preachers (via YouTube...) or older ones. The app could choose which to have (like how it chooses which logos books to have). The key thing would be an interface which shows you applicable sermons to your verse/periscope/ chapter, just like maps does now ... We should also be able to link into sermon collections on logos in the same way ... Indexed by Bible passage first and by theme second."

Everything was read on 2026-11-05 unless a date says otherwise. No code was written and no text data is committed: files were fetched into temp directories (`/tmp/sx`, and `/tmp/pdw` from the earlier probe) and measured there. Counts are mine from the files named; an approximate count says so. Link-out only for anything not public domain or not licensed for the app. Nothing was fetched from Amazon. No Logos account was used and none was logged into.

<!-- toc -->

- [The short answer](#the-short-answer)
- [1. Matthew Henry's sermons](#1-matthew-henrys-sermons)
- [2. Logos sermon collections at a passage](#2-logos-sermon-collections-at-a-passage)
  - [The link form, and what ref.ly does with it](#the-link-form-and-what-refly-does-with-it)
  - [What Lampas builds today](#what-lampas-builds-today)
  - [His own shelf: 61 sermon books, 17 outline books](#his-own-shelf-61-sermon-books-17-outline-books)
  - [Can Lampas know which sermons in a Logos collection fit a passage?](#can-lampas-know-which-sermons-in-a-logos-collection-fit-a-passage)
- [3. Modern preachers: seven catalogues](#3-modern-preachers-seven-catalogues)
- [4. Themes](#4-themes)
  - [The sources](#the-sources)
  - [A measured try on Romans 5](#a-measured-try-on-romans-5)
- [5. Size, and how it fits](#5-size-and-how-it-fits)
  - [Which server Lampas has today](#which-server-lampas-has-today)
  - [A sketch](#a-sketch)
- [6. Spurgeon link-out: 20 sermons tried](#6-spurgeon-link-out-20-sermons-tried)
- [Not verified](#not-verified)
- [Sources read](#sources-read)

<!-- /toc -->

## The short answer

- **Matthew Henry's sermons are public domain but nobody has them tagged.** The only digitised text is page scans with OCR (Internet Archive): the 1847 Complete Works (volume 1 only found) and the 1830 and 1833 Miscellaneous Works, which first printed his manuscript sermons. CCEL and CrossWire carry his Commentary and no sermons. Each sermon opens with its text as a printed line, with no tag. Roughly 20 numbered manuscript sermons plus about 25 published discourses (hand count, approximate). There is a sermon set here worth a hand-made index of perhaps 50 rows, not a corpus.
- **A Logos link can open a sermon collection at a Bible passage, in the form Lampas already builds for a commentary:** `logosres:LLS:GRGLRSRMNRCH;ref=Bible.Ro5.8`, fallback `https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH?ref=Bible.Ro5.8`. ref.ly answered 301 to Logos's web app for it. Whether the collection then opens at the passage, and whether the reader must own it, is **not verified** (no account; the page only showed Sign in). Greg Laurie Sermon Archive is on his shelf with Resource ID `LLS:GRGLRSRMNRCH`. **None of his 61 sermon books and 17 outline books is in the catalogue today**: the one type rule (`text.monograph.commentary.bible`) takes none of them.
- **Lampas cannot know which sermons inside a licensed Logos collection fit a passage without his book's text or index** (VISION.md line 34). It can know that the *collection* has an index for the passage only from his library export's `ReferenceSupersets`: 7 of the 61 sermon books carry a `bible.*` superset and Greg Laurie's does not. Logos does the filtering when it opens the link.
- **Modern preachers: seven catalogues read.** Three index sermons by passage on a page a link can reach: Truth For Life (`/bible/Romans 5:8`), Ligonier (`/scripture/romans`, a chapter filter) and SermonAudio (an API with `book`, `chapter`, `verse` parameters, **an API key needed**). Desiring God, Grace to You and The Gospel Coalition could not be read as an index from a script (a challenge page, a robots.txt that bars all crawlers, a 600 s crawl delay). YouTube knows no passage. Every one of them is link-out; none licenses keeping its text. A bare index row (title, passage, URL) is the only thing proposed to be kept, and only SermonAudio and Truth For Life say anything that bears on it.
- **Themes: Nave's Topical Bible** (public domain, 5,322 topics, 77,934 verse tags, CCEL ThML with an `osisRef` on each) is the clean source; OpenBible.info's topics (CC BY, 6,712 topics) are noisy ("bitter wife", "sick children" on Romans 5:8). On Romans 5, Nave gives 39 topics; joined to Spurgeon's tagged texts that is **2,735 other sermons** by every topic and **799** with the broad topics (those of over 300 verses) cut: **a theme hop is too wide unless a topic list is chosen by hand.** `ATONEMENT` alone (305 verses) gives 153 sermons of fair fit.
- **Size and fit.** Spurgeon's whole index (number, title, text) is 174 KB (65 KB gzipped). Ten such sources would be near 1 MB gzipped. Today Lampas has **no server of its own**: the VPS serves the built `dist/` as static files, and the only live backend is the Postern mill, gated by the AI licence. "A database on the server that can be added to without a release" is therefore a new thing; the shape that fits is a JSON file per source that the worker fetches like `public/data` and caches offline, with the reader's choice of sources kept the way Logos books are (the Library shelf).
- **Spurgeon link-out: 20 sermons tried, all three of CCEL, Spurgeon Gems and the GitHub markdown have a stable address per number; spurgeon.org does not** (a title slug, not a number; 2 of 19 slugs guessed failed). Details and statuses in section 6.

## 1. Matthew Henry's sermons

His Commentary is not the question: CCEL's `henry` author page lists only `mhc-series`, `mhc`, `mhcc` and `mhc1` to `mhc6` (read 2026-11-05), and CrossWire's `mhc.conf` and `mhcc.conf` are the commentary as well (public-domain-works.md, ranked first). His library already holds the commentary as `LLS:29.1.8` (Complete and Unabridged) and `LLS:29.1.25` (Concise), both with a `bible.*` superset over the whole Bible, so Lampas's catalogue can open Henry's commentary at a verse today.

**What survives of the sermons, by edition** (Internet Archive metadata and OCR read 2026-11-05):

| Edition | Identifier | What it holds | Text | Rights field |
| --- | --- | --- | --- | --- |
| *The Complete Works of the Rev. Matthew Henry* (A. Fullarton, Edinburgh, 1847), "all his treatises, sermons, and tracts, as published by himself", two volumes | `completeworksofr0001revm` (volume 1; **volume 2 not found** on the Archive by title or creator) | Volume 1 contents, read from the OCR: *The Pleasantness of a Religious Life*, *Sober-Mindedness pressed upon Young People*, four discourses on drunkenness, uncleanness, Sabbath-breaking and profane speaking, *A Friendly Admonition to Tipplers*, *A Word of Advice to the Wanton*, *Directions for Daily Communion with God* (3 discourses), *A Church in the House* (a sermon on family religion), *Great Britain's Present Joys and Hopes* (2 sermons), *A Sermon concerning the Work and Success of the Ministry*, funeral sermons for Samuel Benion and Francis Tallents, *The Communicants' Companion*, a *Treatise on Baptism* | OCR (`_djvu.txt`, 2,778,827 bytes), PDF 63 MB | none stated |
| *The Miscellaneous Works of the Rev. Matthew Henry*, "containing ... numerous sermons, now first printed from the original manuscript" (London, J. O. Robinson, 1830; 1833 second printing) | `miscellaneouswor00henr` (1830), `miscellaneouswo01henrgoog` (1830), `miscellaneouswo02henrgoog` and `miscellaneouswo00henrgoog` (1833) | The manuscript sermons: *The Worth of the Soul* in six sermons (Matthew 16:26); *Sermons and charges* (ordination); *Funeral Sermons* (I to IV, e.g. Isaiah 38:12 for Elizabeth Young, 1693); *Fast Sermons* (I to IV, e.g. Isaiah 8:12-13, 1692); and in the Appendix **41 sermons by his father, Philip Henry** (not Matthew's). The contents page also lists the same published treatises as the 1847 book | OCR (9,304,579 bytes for the 1830 copy), PDF 157 MB | the 1833 copy: `possible-copyright-status` "NOT_IN_COPYRIGHT"; the others none |
| *Select Sermons of the late Reverend Mr. Matthew Henry*, revised by Samuel Palmer (1782) and single sermons of 1704 to 1735 (funeral sermons, *A Church in the House*, *Sober-mindedness*) | `bim_eighteenth-century_select-sermons-of-the-la_henry-matthew_1782` and a dozen `bim_eighteenth-century_..._henry-matthew_<year>` | one to a dozen sermons each | OCR from microfilm | none |
| *The Complete Works of Matthew Henry* (Baker reprint, 1979, two volumes) | `completeworksofm0001vari`, `completeworksofm0002vari` | the 1847 content reprinted | `access-restricted-item: true` (lending only) | none |

**Licence.** Henry died in 1714; every edition above but the 1979 reprint was printed before 1929, so the words and these editions are public domain in the United States by date (the same reasoning as public-domain-works.md for Spurgeon). The Archive states no licence on any of them; only the 1833 copy carries a status ("NOT_IN_COPYRIGHT"). A catalogue record at Princeton's ATLA digital library for the 1830 book, found by search, says its rights "have not been evaluated" (not fetched). The 1979 reprint is a lending copy: do not use it.

**Machine-readable?** No. The only text is OCR of a printed page: the sermon's text is a printed line ("Matthew xvi. 16. For what is a man profited ...") the OCR keeps, but it is not tagged, the OCR has running heads and page numbers inside it, and the contents tables came out as columns scrambled together. No CCEL file, no CrossWire module, no GitHub corpus of Henry's sermons was found (the CrossWire module list was read in the earlier probe; the Archive was searched by title and creator on 2026-11-05: 347 records by creator `Henry, Matthew`, of which 9 have "sermons" in the title).

**Scripture tagged?** No. Counting the tags is counting a regex: the sermon heads a reader would use (a book name, a roman chapter, an arabic verse, alone on a line under "SERMON I.") are consistent in the manuscript series, so a hand index of roughly 50 rows (number, title, text) is a day's work; a parser over the OCR is not worth building for them.

**How many?** About 20 numbered manuscript sermons (6 on the worth of the soul, 4 funeral, 4 fast, the ordination charges and sermons), plus about 25 published treatises and single sermons in the 1847 and 1830 contents. This is a count of the two contents tables and the `SERMON` headings in the 1830 OCR by hand; it is approximate, and **the 1830 contents table was too scrambled to give an exact number**. How many sermons Henry preached, or how many manuscripts survive unprinted, was not found: the University of Saskatchewan's GEMMS catalogue indexes manuscript sermon notes of his by Scripture text (found by search, `gemms.usask.ca/node/806985` and others, not fetched), which is a catalogue of notes, not texts.

**What this means.** Henry's sermons are worth a *link-out row*, not a text source: an index row per sermon pointing at the Archive's page (an Archive full-text URL such as `https://archive.org/details/miscellaneouswo02henrgoog` with the page, or the book's `djvu.txt`), made by hand, with the Scripture text read from the printed head. For "Matthew Henry on this passage" the better answer is the Commentary he is known for, which Lampas can already link in Logos.

## 2. Logos sermon collections at a passage

### The link form, and what ref.ly does with it

Logos Support's Links Guide (`https://support.logos.com/hc/en-us/articles/46165718176397-Logos-Links-Guide`, a 403 to a script; read as a search excerpt on 2026-11-05) gives `https://ref.ly/logosres/esv?ref=BibleESV.Jn3.16` for a Bible at a verse and `https://ref.ly/logosres/esv` for the resource without a place; a Logos community post gives `https://ref.ly/logosres/pntc123jn?ref=Bible.1Jn5.6a-8` for a commentary at a Bible reference. Lampas's own docs/resources.md already builds the commentary form (line 286: "A `commentary` opens at the passage: `logosres:<volume id>;ref=Bible.Jn3.16`").

Tried by curl on 2026-11-05 (HEAD, redirects not followed):

| Link | Answer |
| --- | --- |
| `https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH?ref=Bible.Ro5.8` | 301 to `https://app.logos.com/refly?uri=logosres%3ALLS%3AGRGLRSRMNRCH%3Bref%3DBible.Ro5.8` |
| `https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH?ref=Bible.Ro5` | 301, the same with `Bible.Ro5` |
| `https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH` | 301 to `...refly?uri=logosres%3ALLS%3AGRGLRSRMNRCH` |
| `https://ref.ly/logosres/NOSUCHBOOKXYZ?ref=Bible.Ro5.8` | 301 as well: **ref.ly does not check that the resource exists** |
| `https://ref.ly/Romans5.8` | 302 to `https://biblia.com/bible/esv/romans/5/8` (the free route to a Bible, not a sermon) |

The landing page `app.logos.com/refly?uri=...` (GET, no cookie, 200): for the real id its page title is "Greg Laurie Sermon Archive - Logos Bible Study"; for the unknown id it is "Resource Panel - Logos Bible Study". So Logos's server knows the title of a resource a reader may not own. The page's visible text offers "Sign in" and "Sign up"; **what happens after sign in, and whether a reader who does not own the book is shown the store page, a preview or an error, was not seen** (no account may be used for this probe). On a phone the `logosres:` scheme goes to the Logos app first; the https form is the fallback that Lampas arms after 1.5 s (`src/resources/openApp.ts`, `armFallback`). Whether either opens the sermon *collection* at the passage rather than at its start is the same unverified step as every commentary link of the catalogue (docs/resources.md marks those "UNVERIFIED on a device").

**Does it need the reader to own the book?** A Logos link opens a book in his library; the Logos product page is the store (`https://www.logos.com/product/33978/greg-laurie-sermon-archive`, 200, $299.99, "Nearly 1,200 sermons"). What a non-owner is shown (the web app, the store page, an error) was not seen: not verified.

### What Lampas builds today

- `src/resources/logosRes.ts` is the one place a Logos resource link is put together: `resourceLink(id, query, fallbackQuery)` gives `logosres:<id>;<query>` and `https://ref.ly/logosres/<id URI-encoded>?<query>`; `resourceStart(id)` gives the link with no place.
- `src/resources/catalogue.ts` holds the catalogue by `KINDS` (`lexicon`, `grammar`, `greek-text`, `interlinear`, `commentary`, `bible`, `devotional`), each entry with `opens` of `word`, `parsing`, `verse`, `chapter`, `day`, `start` or `place`. A commentary entry `opens: 'verse'` and so opens at `ref=Bible.<book><chapter>.<verse>`.
- `src/library/InLogosDoors.tsx` draws the doors: "In Logos" (his Bible at the place, `verseLink` of `src/resources/logosBible.ts`) and "In another book…" (`AnotherBookButton`, which opens `InLogosChooser` over the rows `useInLogosRows` finds: the books of his shelf that open at this place, `src/library/inLogos.ts`).
- The catalogue is generated by `npm run logos:catalogue` from `data/logos/catalogue-rules.json` and his library export (the vault's `plans/lampas-logos-library-2026-10-08.csv`, 4,795 rows). The rules take a book by Resource ID, by Logos `Type` or by series. The type rules today: `lbx.reverse-interlinear`, `text.monograph.bible`, `lbx.calendar-devotional`, `text.monograph.commentary.bible`. **A sermon collection is a Logos `Type` of `text.monograph.sermons` (61 books), `text.monograph.sermon-outlines` (17) or one of a few others; none is a rule today, so none is in the catalogue.**

To offer a sermon collection beside "In another book…", the smallest change is a rule for the Logos type and, if it is not to be mixed with commentaries, an eighth kind in `KINDS` (`INFO` in `src/library/kinds.ts` is a `Record<Kind, ...>`, so every place that lists kinds must name it; public-domain-works.md "Fit with what Lampas has" has the same warning for a shelf of public-domain works).

### His own shelf: 61 sermon books, 17 outline books

From the library export (read 2026-11-05): `text.monograph.sermons` 61 rows and `text.monograph.sermon-outlines` 17 rows of 4,795. Seven of the 61 sermon rows carry a `bible.*` entry in `ReferenceSupersets`, which is Logos's own statement that the book is indexed by the Bible reference:

| Resource ID | Title | `ReferenceSupersets` |
| --- | --- | --- |
| `LLS:GRGLRSRMNRCH` | Greg Laurie Sermon Archive | **empty** |
| `LLS:JDGRRSRMNRCHV` | J. D. Greear Sermon Archive | `bible.1.2-2.35 bible.5.30-14.31 bible.17.4.13-17.4.16 ...` |
| `LLS:SKPHTZGSRMN` | Skip Heitzig Sermon Archive | `bible.1-3 bible.8.1-28.14 bible.61 bible.63.2-87.22` |
| `LLS:6.60.10` to `LLS:6.60.14` | NPNF 1.10 to 1.14, Chrysostom's Homilies (Matthew, Acts to Romans, Corinthians, Galatians to Philemon, Hebrews) | `bible.61.1.1-61.28.14` and so on |
| `LLS:JIMMYEVANSSA` | Jimmy Evans Sermon Archive | empty |
| `LLS:36.0.12` | Selected Sermons of George Whitefield | empty |

The rest of the 61 are Wesley, Edwards, Moody, Burroughs, Bunyan and others, empty. The 17 outline books (Standard Sermon Starters and Butler's Sermon Starters, including *Sermon Outlines on Romans*) carry none. So `ReferenceSupersets` is a poor guide to whether Logos indexes a sermon archive by passage: Laurie's archive has none and yet Logos sells it as one that works through the Passage Guide (below). **Lampas cannot tell from the export which of his archives answer to a Bible reference.** The honest rule is one entry per archive, `opens: 'verse'`, and the reader sees if it opens at the place.

His library has no Spurgeon sermon collection (only `LLS:365SPURGEON1` to `6`, the *Interpreter*, the *CSB Spurgeon Study Bible* and the Spurgeon Commentary Series volumes). Logos's "Charles Spurgeon Complete Sermon Collection (63 vols.)" is on sale at $499.99 (sermon-archive-sale page, 2026-11-05).

### Can Lampas know which sermons in a Logos collection fit a passage?

Not from inside the collection: that would need the licensed book (VISION.md line 34, "never put a reader's licensed books (Logos) in the app or the tutor"). What Logos says about itself (search excerpts, 2026-11-05, the pages answered 403 to a script): a Logos support article "Using Sermon Archives" (`support.logos.com/hc/en-us/articles/360026630992`) and a community thread say the **Passage Guide** shows "everywhere that passage is treated in the sermons in your library" under its Sermons section and follows the passage in his Bible; the Logos sale page calls the archives "Powerful Sermons, Transformed into Commentaries" (read on `www.logos.com/sermon-archive-sale`). Users report that the index holds only the one Bible reference per sermon.

So the choices are:

1. **Link only.** One "Sermons" door that opens Logos's own Passage Guide at the place (not tested: no form of a Passage Guide link was found; the `logos4:Guide;t=Passage Guide` shape, like Lampas's `logos4:Guide;t=Bible Word Study` link, is a guess to try on his phone), or one link per sermon archive on his shelf at `ref=Bible.<book><chapter>.<verse>`. Nothing about the licensed text enters Lampas.
2. **A public stand-in.** For a preacher whose sermons are public elsewhere (Spurgeon, Keller on Gospel in Life, Laurie on Harvest, Heitzig) the index of title, passage and public URL (section 3) is Lampas's own data and says which sermons exist for the passage. The Logos door is then a second door to the *same* preacher in his licensed copy. Nothing licensed is kept.
3. **Not possible:** a list of sermon titles from inside his copy of a Logos archive. Logos has no public API for it (the Faithlife API needs a login; the Biblia API answered 403 to a script), and ref.ly accepts a link without checking anything.

## 3. Modern preachers: seven catalogues

Read on 2026-11-05 with curl and a browser User-Agent unless noted. "Index of title, passage and URL kept?" means whether the terms read allow a small index of facts (title, passage, link) to be kept, which is a different thing from copying the sermon; none of the sites addresses it directly and **none of this is legal advice or a licence**: what is quoted is what the pages say.

| Catalogue | How the passage is known | API or terms for linking (verbatim, where read) | Index of title, passage, URL kept? | Read as |
| --- | --- | --- | --- | --- |
| **SermonAudio** (`sermonaudio.com`) | A sermon carries an OSIS book, chapter and verse range. The API's `GET /v2/node/sermons` takes `book` ("a OSIS specifier for the Bible book"), `chapter`, `chapterEnd`, `verse`, `verseEnd`, `sortBy`, `page`, `pageSize`, `lite` (read from `https://api.sermonaudio.com/v2/openapi.json`, version 2.0, 26 paths). The site's search does range overlap: "searching John 1:3 will return sermons on John 1:2-4, John 1, and John 1-3" (`sermonaudio.com/news/sermons-by-scripture`, via search excerpt) | The API wants a key: a call without one answered 401 `{"errors":{"error":"No authorization provided, or authorization is invalid"}}`; security scheme `x-api-key` in header `X-Api-Key`. The "Terms of Service" and "API Programming Guide" are sections of `https://api.sermonaudio.com/` built by script; **their text was not retrievable** (not verified). Its `robots.txt` disallows ClaudeBot, GPTBot, CCBot and other named bots | Not stated where read | Terms not read; key needed |
| **Truth For Life** (Alistair Begg; `truthforlife.org`) | A page per passage: `https://www.truthforlife.org/bible/Romans 5:8/` listed 12 sermons on one page, each with its text as free text ("Romans 5:8", "Romans 5:1–11", "Acts 1:1 – Jude 1:25"), date, duration, whether it has a transcript, and an address `/resources/sermon/<slug>/` (e.g. `/resources/sermon/how-deep-fathers-love/`). Also "Browse by Scripture" in its menu | `robots.txt`: `Content-Signal: search=yes, ai-train=yes, ai-input=yes`; disallows only query forms such as `?scripture=`, `?chapter=`, `?topic=`. No API read | A passage page is allowed to be read by this robots.txt; no terms page was read | Page 200 |
| **Ligonier Ministries** (`learn.ligonier.org`) | A Scripture Index (`/scripture`) with a page per book (`/scripture/romans`): "Scripture 1257 Results" for Romans, facets by Type (devotional 481, media resource 324, article 200, Tabletalk 74, podcast episode 73), Topic (Justification 92, Sin 65, ...) and **Chapter** ("Chapter 8 213, 1 210, 3 112, 12 100, 5 100"). `/scripture/romans/5` is a 404: the chapter is a filter in the page, not an address | `robots.txt` (`ligonier.org`): `Disallow: /api`, `/images/`, `/javascripts/`. `learn.ligonier.org/robots.txt` was fetched (799 bytes) and not read in full. Its terms page guess (`/terms-of-use`) was a 404. Teaching series are sold; some resources require an account | Not read | Page 200; chapter is a script filter |
| **Gospel in Life** (Tim Keller; `gospelinlife.com`) | Listings give "the preaching date, the series name, the scripture passage, and the sermon title" (search excerpt of `gospelinlife.com/speaker/tim-keller/page/158/`); no Scripture index page was found; topics and speakers are indexes (`/topic/salvation`, `/speaker/tim-keller/`) | Help Center, "Can I post Gospel in Life resources on another website?": "You may not embed or upload any audio, video or transcripts of Gospel in Life sermons and talks to any website without explicit permission. However, it is okay to share and embed sermons/talks that are available on the official Gospel in Life YouTube channel." Excerpts of short text may be used for "personal or local church ministry use" if cited, unaltered, linked back, and not charged for. `robots.txt` allows all but `/wp-admin/`; a sitemap `wp-sitemap.xml` | Linking is the allowed thing; keeping titles and passages is not addressed | Pages 200 |
| **Desiring God** (John Piper; `desiringgod.org`) | A Scripture index page per chapter was **not readable**: `/scripture/romans/5`, `/permissions` and `/sitemap.xml` answered 403 with "Just a moment... Enable JavaScript and cookies to continue" (a Cloudflare challenge). `robots.txt` read | `robots.txt`: disallows `*.rss`, `*/audio`, `*/video` and three Ask Pastor John paths, allows `*/download/audio*`. Permissions page via search excerpt: Piper's content is copyrighted by the Desiring God Foundation; audio and video may be played at a non-commercial gathering without a charge, credit "Desiring God" with a link; material under a limited licence from a publisher carries different terms | Not addressed in what was read | Challenge page, so no index read |
| **The Gospel Coalition** (`thegospelcoalition.org`) | No Scripture index was found in the pages read; `/scripture/romans/5/` is a 404. The home page has "Read the Bible" and "Commentary" sections. Not verified | `robots.txt`: `Crawl-delay: 600`. Permissions page, read: "Unless otherwise noted, we are happy to provide permission for you to print and distribute our online resources, in their entirety or in unaltered excerpts, as long as you do not charge a fee ... Apart from our blogs, which require special permission from the blogger, and unless otherwise noted, you are welcome to re-post unaltered article excerpts" | Not addressed | Pages 200 |
| **YouTube** | **No passage is known.** A video has a title, a description and tags written by the uploader; a passage would have to be read from them or typed in | YouTube API Services Terms of Service and Developer Policies, read (`developers.google.com/youtube/terms/...`): quota ("YouTube may set a quota on usage ... at any time"), a published privacy policy, deletion of stored API data of a user within 30 days of a revoked authorisation. A key and a quota are needed for the Data API; a link to `https://www.youtube.com/watch?v=<id>` needs neither | A row of `{title, passage, videoId}` typed by hand is not API data; one fetched through the Data API is | Terms read in part |

Not read as an index: **Grace to You** (John MacArthur; `gty.org`). Its `robots.txt` is `User-agent: * Disallow: /` apart from Googlebot, Bingbot, Meta's agent and Facebook's link-preview agent. A home page and one URL guess were fetched before that file was read in this pass, and nothing further was fetched. It is therefore not a candidate for an index built by script; a link to a page the reader or a human found is another matter.

**How the passage is known, in short.** SermonAudio and Spurgeon (CCEL) give a machine-read reference; Truth For Life, Ligonier and Gospel in Life give it as a printed label ("Romans 5:1–11") that a tolerant parser (`src/nav/refsInText.ts` already reads references from prose) turns into book, chapter and verse; YouTube gives none. A passage range ("Acts 1:1 – Jude 1:25", a series on a whole book) is a design choice: such a row would match every chapter in its span, and a reader on Romans 5:8 would be shown a 40-minute overview of the New Testament. A cap on the width of a range that counts is needed (the Verse view ranks maps by places in the same way, docs/maps.md "Which maps are for this verse").

**What this does not give:** a licence to copy any text. Link-out is what every row above allows, and it is the thing asked for ("one click access").

## 4. Themes

### The sources

| Source | Licence (verbatim, where) | Size | Shape |
| --- | --- | --- | --- |
| **Nave's Topical Bible** | CrossWire `nave.conf` (read): `DistributionLicense=Public Domain`, `TextSource=https://ccel.org/ccel/n/nave/bible.xml`; the module's About: "20,000+ topics and subtopics, and 100,000 references to the Scriptures" (Orville J. Nave, early 1900s). CCEL's ThML `<DC.Rights />` is empty | CCEL ThML `https://ccel.org/ccel/nave/bible.xml`, 11,374,641 bytes. **5,322 topic entries; 77,934 `<scripRef>` tags, each with `osisRef`** | A glossary: a `<term>` (`AARON`) with a `<def>` of subtopic lines, each a list of `scripRef`s (King James versification). No verse text. |
| **OpenBible.info topics** ("Topical Bible", `openbible.info/topics/`) | "Unless otherwise indicated, all content is licensed under a Creative Commons Attribution License" (page footer); file header `# CC-BY License: www.openbible.info/topics` generated 2026-11-02 | `topic-scores.zip` 418,746 bytes, 2,020,475 bytes unpacked: **6,712 topics, 71,378 rows** (topic, OSIS, a vote score) | A "mashup of the Yahoo! and ESV Bible web services ... people's actual behavior has shaped them" (its own words): topics people search for ("bitter wife", "sick children") |
| **OpenBible.info cross-references** (the Treasury of Scripture Knowledge, mostly) | Same CC BY; "draws primarily from public-domain sources, especially the Treasury of Scripture Knowledge, which provides most of the data" (`openbible.info/labs/cross-references/`) | `cross-references.zip` 1,984,180 bytes, 8,303,182 unpacked: about 340,000 pairs with a vote count | Verse to verse, which is a link to other verses, not a theme name |
| **CrossWire `tsk.conf`** (Treasury of Scripture Knowledge) | `DistributionLicense=Public Domain` (public-domain-works.md, ranked third) | not measured here | Cross-references by verse |
| **Spurgeon's own index** | The CCEL ThML has no topic tags beyond the text field (public-domain-works.md); Spurgeon Gems has a Scripture index and a Sermons Index PDF | n/a | A sermon's own title is a theme label ("Justification by Grace") but not a tag |

Nave's is the only one that is both a public-domain theology of themes and tagged by `osisRef`. Its limits: King James verse numbering (Lampas reads the Greek NT, so a few verses differ in the Psalms and Malachi, not much in Romans); its topics are old (Adam, Depravity of Man); and its largest topics are whole subjects (`JESUS, THE CHRIST` covers 4,821 verses, `GOD` 4,051, `WICKED (PEOPLE)` 1,518, `SIN` 916).

### A measured try on Romans 5

Tried with a script over the files above (`/tmp/sx/work/theme.py`, `hop.py`; not committed). The sermon texts are from the earlier probe's CCEL ThML (`scripCom type="Sermon" ... osisRef`, 3,414 of 3,527 entries carry an `osisRef`; the earlier note's 3,476 also counts those with only `parsed`).

- **Nave's: 39 topics cite a verse of Romans 5.** The most: `SIN` 32 verse-tags in the chapter, `JESUS, THE CHRIST` 25, `ATONEMENT` 15, `JUSTIFICATION` 13, `GRACE OF GOD` 11, `ADAM` 9, `SALVATION` 9, `AFFLICTIONS AND ADVERSITIES` 5, `FALL OF MAN` 5, `RIGHTEOUSNESS` 5, `DEATH` 4, `DEPRAVITY OF MAN` 4, `GOD` 4, `HOPE` 4, `PROPITIATION` 3, `HOLY SPIRIT` 3. Romans 5:8 alone has 7: `ATONEMENT`, `CONDESCENSION OF GOD`, `GOD`, `GRACE OF GOD`, `JESUS, THE CHRIST`, `SUFFERING`, `WICKED (PEOPLE)`.
- **OpenBible.info: 218 topics touch Romans 5, 100 touch 5:8.** The highest scores: "being born in to sin" 28, "agape" 20, "developing character" 17, "trails" [sic] 16, "enduring" 12, "peace with god" 9, "sick children" 9. Among the 100 for 5:8: "bitter wife", "girlfriend before marriage" and "everyone is important" beside "god loves me". **Not a base for a sermon match.**
- **The hop: Romans 5's 22 direct Spurgeon sermons (a preaching text in the chapter) against the others that share a Nave topic.**
  - All 39 topics: **2,735** other sermons. Useless.
  - Topics of at most 300 verses (25 of the 39): **799**. Still too many.
  - Romans 5:8's topics of at most 300 verses (`GRACE OF GOD` 114 verses, `SUFFERING` 87, `CONDESCENSION OF GOD` 268): **170** sermons. Some fit (126 *Justification by Grace*, Romans 3:24; 295 *The Treasure of Grace*, Ephesians 1:7; 229 *Love*, 1 John 4:19) and some do not (7 *Christ Crucified*, 1 Corinthians 1:23-24, and 166 *The Destroyer Destroyed*, Hebrews 2:14, come in under Nave's `SUFFERING`, which is in part the suffering of Christ and in part of the saints).
  - `ATONEMENT` alone (305 verses): **153** sermons, a fair set (*Christ Our Passover*, *The Day of Atonement*, *The Blood-Shedding*, *Justification by Grace*).
- **What this says.** A theme match is a *second tier* below the passage and must be narrow: a hand-chosen allow-list of Nave topics (for the New Testament perhaps 100 to 200 doctrinal topics such as `ATONEMENT`, `JUSTIFICATION`, `GRACE OF GOD`, `PROPITIATION`, `ADOPTION`, `FAITH`) with a size cap, and the match should be on a sermon's *preaching text verse*, not on everything it cites. Even then a topic that merges two senses (`SUFFERING`) puts wrong sermons beside right ones; showing the topic's name on the row ("on Atonement") lets the reader judge. A match by the sermon's own words (the title) would be a different index and was not tried.
- **For sermons that are not Spurgeon's**, the same join needs each sermon's text verse, which Truth For Life and Gospel in Life print and Ligonier and SermonAudio carry (section 3).

## 5. Size, and how it fits

An index row is a number or id, a title, a reference and an address. Spurgeon's measured with every field kept (number, title, `osisRef`, volume and CCEL section id): **3,527 rows, 206,771 bytes, 74,406 gzipped.** With only number, title and reference: 173,540 bytes, 64,792 gzipped. A Spurgeon row is about 50 to 60 bytes; for another preacher's row with a longer address, call it 120 bytes. Modelled sizes (my estimate, not measured): ten sources of 3,000 rows each, 3.6 MB raw, about 1 MB gzipped; Nave's themes, if shipped, are another 2.5 MB if cut to the NT and the chosen topics, less if only a list of topic names per verse is kept. For scale, `public/data` is already 113 MB (`du -sh`, 2026-11-05).

### Which server Lampas has today

There is **no server of Lampas's own in the repository.** Two things stand in its place:

1. **The VPS serves static files.** `CLAUDE.md` line 6 to 7: "Served at https://lampas.allmymind.org from the VPS (Vite `base` is `/`; the Laptop's after_landing builds `dist/` and rsyncs it)". There is no application code, no database and no API in the repository: the `scripts/` folder has only build tools (e.g. `scripts/data-build.ts`, `scripts/logos-catalogue.ts`, `scripts/maps-build.ts`). An index added "without an app release" would mean either another deploy that writes new files into the same web root (a data deploy rather than an app release), or a new service.
2. **The Postern mill is the only live backend**, and it is gated. `src/services/mill.ts` is the one client (`requireLicence`, line 55; `sendToMill` / `readMillPage`), and `docs/layout/licence.md` (line 9) says it is "the ONE gated client of the mill ... the only file under src/ or scripts/ that imports `bsv-kit/grist`". It carries the AI features and "Postern's CORS allows only that origin" (`docs/commands.md` line 11, `docs/testing.md` line 102). Reading needs no licence (VISION.md "Free to read, a licence for the AI"), and a sermon list is reading, so it must not go through the mill.

The pattern the app uses for data it does not bundle is `fetch` of a static JSON from its own origin: `src/data/chapter.ts` lines 325 and 350 (`chapterUrl`, `/data/index.json`), `src/data/lxxChapter.ts` lines 36, 56 and 95 (`/data-lxx/index.json`, the lexicon, a chapter), `src/data/offlineCopy.ts` (an opt-in copy of the chapters for offline use) and the worker `src/sw.ts` / `src/dataCache.ts`. The maps are the nearest module to what is asked: `docs/maps.md` ("A map is a `MapCard`; where it comes from is a `MapSource`"; "Choosing the sources, and several at once"; "Adding a second source"), `src/maps/types.ts` (`MapSource`), `src/maps/mapsFor.ts` (`mapsForSources`), and the Verse view's Maps door. public-domain-works.md "Fit with what Lampas has" says the same, in more detail.

### A sketch

Not a design, a shape that fits what is there. The Governor decides.

- **The index.** One JSON file per source (a "sermon source": Spurgeon, Henry, Truth For Life, Ligonier, a Logos collection by Resource ID), each `{id, title, ref (osis), url}` rows plus a header `{name, kind, licence, credit}`, grouped by book so a chapter fetches one small file (the way `public/data/<book>/<n>.json` is fetched), and an `index.json` listing the sources with a fingerprint (the way `public/data/index.json` fingerprints chapters, kept offline by `src/data/offlineCopy.ts`).
- **Added to without an app release.** Rows are data. Because the VPS only serves files, the way "added to" works today is a data deploy to the same web root (the Laptop's rsync, not the app build) of new `sermons/*.json` and a bumped `index.json`; the worker's fingerprint check picks the change up on the next open. If the Governor wants others to add rows from a phone, that needs a service that does not exist: a small endpoint with a write door, which is a new component with its own licence-and-abuse questions (the mill is the only precedent, and it is not for this).
- **What the app reads.** On the Verse view (and the chapter's place line, `src/PlaceLine.tsx`) a "Sermons" door beside Maps, listing rows whose reference overlaps the verse, chapter or periscope; then, second, rows sharing an allow-listed theme (section 4), each marked with the theme's name. A row opens the sermon at its source (`https://...`), or, for a Logos collection, opens `logosres:<id>;ref=Bible...` through `armFallback` like the existing doors. Nothing licensed is held.
- **Offline.** The index files are small (65 KB gzipped for Spurgeon) and can ride the offline copy; the sermons themselves are link-out and need a connection, which is said on the row. A sermon on the server's own host (the "our server could host" case, for something not on a good public-domain source) is a file Lampas hosts: public domain only, with credit.
- **Choosing which.** The Library already chooses which Logos books are on (a shelf with On | Off | Pinned states, `shelfOf` in `src/data/repositories`, `src/library/`). The same shelf, with a "Sermons" kind, could hold sources: a reader turns on Spurgeon, Henry, Truth For Life; a Logos sermon book on his shelf is a row of the catalogue (section 2), not an index. The choice is a setting, so `src/tutor/knows.ts` `BEARS_ON` must classify it (CLAUDE.md "What the tutor is told").
- **Credit.** Each source is an entry in `ATTRIBUTION.md`, a line in `src/preface.ts`, a `CREDITS` entry in `src/tutor/credits.ts`, and a rule in `tests/support/credits.ts` for a bundled data directory (CLAUDE.md "Conventions").

## 6. Spurgeon link-out: 20 sermons tried

The question: for the sermons with a tagged text, is there a stable address per sermon number? Twenty were chosen across the whole series (numbers 1, 12, 37, 54, 62, 104, 126, 229, 330, 385, 500, 1000, 1191, 1500, 2000, 2544, 3000, 3392, 3500, 3563), including the ten of public-domain-works.md; three of the twenty have no preaching text field in CCEL (12, and the expositions 62 and 385). Each address was fetched in full with curl on 2026-11-05 and the body checked: for CCEL that the sermon's title is in the page (because CCEL answers 200 to a made-up section too: `.../sermons01.zzzz.html` is 200 with 22,677 bytes and no title), for Spurgeon Gems that the body starts `%PDF-`, for spurgeon.org that the title is in the page, for GitHub that the raw file answers 200.

The address forms:

| Source | Address | From the number |
| --- | --- | --- |
| **CCEL** | `https://ccel.org/ccel/spurgeon/sermons<VV>/sermons<VV>.<id>.html` (`<VV>` the volume, `<id>` the roman section id of the ThML `div1`, e.g. `sermons02.l.html` for 104) | Needs the volume and the section id, which the ThML gives; **not computable from the number alone** (the id is `viii_1` for 385 and 1191). The ThML is the index, so an index row can hold it |
| **Spurgeon Gems** | `https://www.spurgeongems.org/sermon/chs<N>.pdf` | **Yes, the number itself.** |
| **GitHub markdown** (lyteword, CC0) | `https://raw.githubusercontent.com/lyteword/chspurgeon-sermons/main/volume-<V>/sermon-<N>.md` (volumes 1 to 6) and `sermon_<N>.md` (volume 7 on); a combined entry is `sermon_385-388.md` | Needs the volume; a file is not a page a reader should be sent to |
| **The Spurgeon Library** (`spurgeon.org`) | `https://www.spurgeon.org/sermons/<title-slug>` | **Not the number**: a slug of the title. The slug I derived by lower-casing and hyphenating the CCEL title failed for 2 of 19 |

Results (HTTP status after redirects; a tick is the body check above):

| No. | Title (CCEL) | CCEL | Gems | GitHub | spurgeon.org slug |
| --- | --- | --- | --- | --- | --- |
| 1 | The Immutability of God | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 12 | The Peculiar Sleep of the Beloved | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 37 | Law and Grace | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 54 | Christ Our Passover | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 62 | Exposition: 1 John 3:1-10 | 200 ✓ | **404** | no file | **404** |
| 104 | Love's Commendation | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 126 | Justification by Grace | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 229 | Love | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 330 | Reigning Grace | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 385 | Exposition of the Doctrines of Grace | 200 ✓ | 200 ✓ | 200 (`sermon_385-388.md`) | 200 ✓ |
| 500 | Ebenezer! | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 1000 | Number One Thousand; Or, 'Bread Enough and To Spare' | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 1191 | For Whom Did Christ Die? | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 1500 | Number 1500, Or Lifting Up the Bronze Serpent | 200 ✓ | 200 ✓ | 200 | **404** |
| 2000 | Number Two-thousand—Healing by the Stripes of Jesus | 200 ✓ | 200 ✓ | 200 | **404** |
| 2544 | The One and the Many | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 3000 | COME AND WELCOME | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 3392 | Justification by Faith | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 3500 | Two Coverings and Two Consequences | 200 ✓ | 200 ✓ | 200 | 200 ✓ |
| 3563 | Cheering Congratulation | 200 ✓ | 200 ✓ | 200 | 200 ✓ |

Sermon 62 is an exposition with no preaching text field in CCEL; Spurgeon Gems has no `chs62.pdf` (as in the earlier probe), so an exposition must be treated as a special case or left out. A bogus Gems number (`chs99999.pdf`) answered 404 and a bogus spurgeon.org slug 404, so those two answer honestly; CCEL does not.

**Verdict.** For a link per sermon number, **Spurgeon Gems (`chs<N>.pdf`) is the one that is a function of the number** and it is a PDF, which on a phone is a poor read; CCEL's HTML page is the better page to send a reader to and costs one stored section id per row (the ThML has it for all 3,527). spurgeon.org's pages are good to read but need a stored slug, taken from its sitemap (`/spurgeon_sermon-sitemap.xml` to `-sitemap4.xml`, public-domain-works.md), and carry "All rights reserved". Terms differ per edition (public-domain-works.md "Spurgeon: the sources"): CCEL "personal, educational, or non-profit"; Gems, no changes to the content, no charge, credit.

## Not verified

- **No Logos account was used.** What `app.logos.com/refly` shows after sign in, whether the collection opens at the passage, and whether a reader without the book sees a store page, a preview or an error, was not seen. Every `logosres:` and ref.ly link here is UNVERIFIED on a device until the Governor taps one on his phone.
- The Logos Links Guide and the "Using Sermon Archives" support article answered 403 to a script and were read only as search excerpts. A Passage Guide link form was not found.
- SermonAudio's Terms of Service and Programming Guide could not be retrieved (built by script); how an API key is obtained, and whether it is free, is not known. No call with a key was made.
- Desiring God's pages answered a Cloudflare challenge; its Scripture index and permissions page were read only as a search excerpt of the permissions page. The Gospel Coalition's Scripture browse (if it has one) was not found. Ligonier's terms were not found.
- The robots.txt of Grace to You was read after its home page and one other URL had been fetched; nothing further was fetched.
- Matthew Henry: volume 2 of the 1847 Complete Works was not found on the Archive; the sermon count is by hand from two scrambled OCR contents tables; whether any manuscript sermons exist beyond those printed in 1830 is not known; the ATLA and GEMMS records were read as search results, not fetched. The Archive says nothing of licence on the scans.
- The Romans 5 theme try joins Nave's (King James numbering) to Spurgeon's text verse as CCEL gives it; only sermons with an `osisRef` (3,414 of 3,527) take part. A fit of a sermon to a topic was judged from its title by me, not read.
- The sizes of ten sources and of a themed index are modelled, not measured, beyond Spurgeon.
- The Internet Archive's lack of a rights field is not a licence; the public-domain claim for Henry rests on his death in 1714 and the dates of printing, as for Spurgeon.

## Sources read

All 2026-11-05. Nothing from them is committed.

Internet Archive: `https://archive.org/advancedsearch.php` (creator `Henry, Matthew`; titles "complete works", "miscellaneous works", "sermons"); `https://archive.org/metadata/<id>` and `https://archive.org/download/<id>/<id>_djvu.txt` for `completeworksofr0001revm`, `miscellaneouswor00henr`, `miscellaneouswo02henrgoog`, `bim_eighteenth-century_select-sermons-of-the-la_henry-matthew_1782`, `completeworksofm0001vari`.

CCEL: `https://ccel.org/ccel/henry`; `https://www.ccel.org/ccel/spurgeon/sermons01` and `https://ccel.org/ccel/spurgeon/sermons<VV>/sermons<VV>.<id>.html` (20 sections); `https://ccel.org/ccel/nave/bible.xml`; the 63 ThML files of the earlier probe (`/ccel/spurgeon/sermons01.xml` to `63`). CrossWire: `https://www.crosswire.org/ftpmirror/pub/sword/raw/mods.d/nave.conf`.

Logos: `https://www.logos.com/product/33978/greg-laurie-sermon-archive`; `https://www.logos.com/sermon-archive-sale`; `https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH` (three forms), `.../NOSUCHBOOKXYZ?ref=Bible.Ro5.8`, `https://ref.ly/Romans5.8`; `https://app.logos.com/refly?uri=...` (two); `https://support.logos.com/hc/en-us/articles/360026630992-Using-Sermon-Archives` (403); `https://api.biblia.com/v1/bible/content/esv.txt?passage=Rom5.8` (403); his library export `plans/lampas-logos-library-2026-10-08.csv` in the vault. In the repository: `src/resources/logosRes.ts`, `logosBible.ts`, `logosDevotional.ts`, `openApp.ts`, `catalogue.ts`, `src/library/InLogosDoors.tsx`, `useInLogosRows.ts`, `data/logos/catalogue-rules.json`, `docs/resources.md`, `docs/research/logos-factbook.md`.

Preachers: `https://api.sermonaudio.com/`, `/v2/openapi.json`, `/v2/docs`, `/v2/node/sermons?...` (401), `https://www.sermonaudio.com/robots.txt`, `/features/api`; `https://www.truthforlife.org/bible/Romans 5:8/`, `/robots.txt`; `https://learn.ligonier.org/scripture`, `/scripture/romans`, `/scripture/romans/5` (404), `/robots.txt`, `https://www.ligonier.org/robots.txt`, `/terms-of-use` (404); `https://gospelinlife.com/` (home, `/robots.txt`, `/timothy-keller-mp3-sermon-archive/`), `https://help.gospelinlife.com/article/61-can-i-post-gospel-in-life-resources-on-another-website`; `https://www.desiringgod.org/scripture/romans/5`, `/permissions`, `/sitemap.xml` (403, challenge), `/robots.txt`; `https://www.thegospelcoalition.org/` (home, `/permissions/`, `/robots.txt`, `/scripture/romans/5/` 404); `https://www.gty.org/robots.txt`, `/` and `/library/scripture/Romans/5` (404); `https://developers.google.com/youtube/terms/api-services-terms-of-service` and `/developer-policies`.

Themes: `https://www.openbible.info/topics/`, `/labs/cross-references/`, `https://a.openbible.info/data/topic-scores.zip`, `https://a.openbible.info/data/cross-references.zip`.

Spurgeon: `https://www.spurgeongems.org/sermon/chs<N>.pdf` (20 and `chs99999.pdf`), `https://www.spurgeon.org/sermons/<slug>` (20 and a made-up slug), `https://raw.githubusercontent.com/lyteword/chspurgeon-sermons/main/...` (19) and `https://api.github.com/repos/lyteword/chspurgeon-sermons/git/trees/main?recursive=1` (3,602 entries).

Web searches (search excerpts, not the pages): Matthew Henry sermons collections; Logos links and sermon archives; SermonAudio API and terms; Desiring God permissions; Gospel in Life terms; The Gospel Coalition permissions.
