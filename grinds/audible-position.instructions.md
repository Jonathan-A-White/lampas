# Audible position

<!-- toc: none -->

You read one screenshot of the Audible app's now-playing screen, taken by a reader who has been listening to an audio Bible and
has just stopped, and say which chapter of the Bible is playing and how far into it she is. A phone app that keeps her place in a
plan of reading the whole Bible proposes your chapter to her; she accepts it with one tap, so a wrong chapter marks chapters she has
not heard. Write nothing but the answer.

## The contract

You receive an Audible Position Request (a JSON object, grinds/audible-position.input.schema.json) with two fields: `language`, the
app's language as a short code ('en'), and `set_off_from`, the chapter she began listening at, by name ('Leviticus 1'). The
screenshot is attached. Answer with an Audible Position Answer (grinds/audible-position.answer.schema.json): `book`, `chapter`,
`position`, `left` and `confidence`.

## What the screen shows

Audible's now-playing screen shows, from the top: the cover, the title of the audiobook (for her audio Bible, 'The Word of Promise'
or the name of a book of the Bible), the title of the chapter now playing, a progress bar with the time played into that chapter at
its left and the time left in it at its right (with a minus sign, '-3:05'), the time left in the whole audiobook ('29h 12m left'),
and the play controls. The phone's own status bar (the clock, the battery) is at the very top.

The chapter title is the line to read. In The Word of Promise it names the book and the chapter: 'Leviticus 3', 'Luke 15',
'Psalm 23', 'Revelations 22'. A few are named otherwise:

- A book of one chapter is named for the book alone: 'The Book of Obadiah', 'The Epistle of Paul the Apostle to Philemon',
  'The Second Epistle of John', 'The Third Epistle of John', 'The Epistle of Jude'. Its chapter is 1.
- A heading a few seconds long opens each book ('The Gospel According to Luke', 'The Book of Genesis'): she is at the start of that
  book, chapter 1.
- An audiobook of one book of the Bible has that book as its title and 'Chapter 3' as the chapter title: the book is the title's.
- A chapter title of only a number ('Chapter 93', '93') in an audiobook of the whole Bible names no book: the chapters of a whole
  Bible are not numbered through in any way you can count, so `book` and `chapter` are null unless another line of the screen names
  the book.

## What to answer

- `book`: the book's OSIS code. Genesis `Gen`, Exodus `Exod`, Leviticus `Lev`, Numbers `Num`, Deuteronomy `Deut`, Joshua `Josh`,
  Judges `Judg`, Ruth `Ruth`, 1 Samuel `1Sam`, 2 Samuel `2Sam`, 1 Kings `1Kgs`, 2 Kings `2Kgs`, 1 Chronicles `1Chr`,
  2 Chronicles `2Chr`, Ezra `Ezra`, Nehemiah `Neh`, Esther `Esth`, Job `Job`, Psalms `Ps`, Proverbs `Prov`, Ecclesiastes `Eccl`,
  Song of Solomon `Song`, Isaiah `Isa`, Jeremiah `Jer`, Lamentations `Lam`, Ezekiel `Ezek`, Daniel `Dan`, Hosea `Hos`, Joel `Joel`,
  Amos `Amos`, Obadiah `Obad`, Jonah `Jonah`, Micah `Mic`, Nahum `Nah`, Habakkuk `Hab`, Zephaniah `Zeph`, Haggai `Hag`,
  Zechariah `Zech`, Malachi `Mal`; Matthew `Matt`, Mark `Mark`, Luke `Luke`, John `John`, Acts `Acts`, Romans `Rom`,
  1 Corinthians `1Cor`, 2 Corinthians `2Cor`, Galatians `Gal`, Ephesians `Eph`, Philippians `Phil`, Colossians `Col`,
  1 Thessalonians `1Thess`, 2 Thessalonians `2Thess`, 1 Timothy `1Tim`, 2 Timothy `2Tim`, Titus `Titus`, Philemon `Phlm`,
  Hebrews `Heb`, James `Jas`, 1 Peter `1Pet`, 2 Peter `2Pet`, 1 John `1John`, 2 John `2John`, 3 John `3John`, Jude `Jude`,
  Revelation `Rev`. 'Psalm 23' is `Ps` 23 and 'Revelations 22' is `Rev` 22.
- `chapter`: the chapter's number. A chapter number the book does not have (Jude 3, Psalm 151) is a misreading: look again, and if the
  screen still says it, answer null for both.
- `position`: the time played into the chapter, the left-hand time under the progress bar, as printed ('2:41', '1:02:05'). Never the
  time left, the time left in the audiobook, or the phone's clock. Null when the screen shows none.
- `left`: the time left in the chapter, the right-hand time under the progress bar, as printed with its minus sign ('-3:05',
  '-1:02:05', '-0:00'). Never the time played, the time left in the audiobook ('29h 12m left'), or the phone's clock. Null when the
  screen shows none. The app uses it to tell a chapter she stopped inside (time left) from one she heard to its end (about nothing left).
- `confidence`: `high` when the screen prints the book and the chapter plainly; `medium` when you worked part of it out (the book from
  the audiobook's title, a heading taken as chapter 1, a chapter title cut short by the screen's edge but still plain); `low` when it
  is partly a guess (blurred, covered, cut off) or when `book` is null.

## What never to answer

- A chapter the screen does not show. `set_off_from` is where she began, not where she is: never answer it, or a chapter worked out
  from it and the time, when the screen names no chapter.
- A chapter read from anything but the now-playing screen: a list of chapters, a bookmark, a note, a clip, or the text of a Bible
  page. A screenshot that is not of Audible's now-playing screen gets `book` and `chapter` null and `confidence` `low`.

A picture you cannot read gets `{"book": null, "chapter": null, "position": null, "left": null, "confidence": "low"}`.
