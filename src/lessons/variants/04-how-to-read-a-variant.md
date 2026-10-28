# How to read a variant

This page shows how Lampas draws a variant in the Reader, and how to read what it shows.

## Turning variants on

Variants are off until you turn them on. In a New Testament chapter that has any, the row of chips under the Reader's header has one that starts with ⁑ and a number: how many places it would mark. Tap it to turn variants on or off. Press and hold it for a short sheet that chooses which ones you see.

The same choices are in Settings > Reading > Variants:

- **Variants**: Off; Those that change the English (the places where another reading would change the English); or All (every place, even a spelling).
- **Witnesses**: Byzantine splits only; also Nestle-Aland; or also ECM. This says whose readings count. The second lesson and the third explain who they are.

## The mark and the brace

With variants on, the words of each place are underlined with a light dotted line. Right after them comes a **brace**: the other reading inside curly brackets, with a small sign for whose reading it is. In Revelation 3:1, in English, "for being alive" is underlined, and you see:

> you have a reputation for being alive, {and you live **B**}

The underlined words are the text you are reading. The words inside the brace are the other reading, here καὶ ζῇς where the text has ὅτι ζῇς. Its English renders the other Greek word for word, so it does not always fit the sentence around it. The sign **B** says it is a reading on which the Byzantine manuscripts are split. **NA** is the Nestle-Aland text's reading and **ECM** the *Editio Critica Maior*'s. One reading can carry two signs when two editions read alike.

In the Greek view the brace holds the Greek of the reading, and in the English view its English. Inside a brace you may also see:

- **left out**: the other reading does not have these words at all.
- **same**: with All chosen, a reading whose Greek differs but whose English does not.
- a **|** between two readings, when a place has more than one.

## The sheet

Tap a brace and a sheet opens from the bottom. Its title is the verse and the words "where the manuscripts differ", as in "Revelation 3:2: where the manuscripts differ". It lists:

- **The text reads**: the words of the text you are reading, in Greek and in English.
- **Other reading** (or Other reading 1, 2 and so on): each other reading, in Greek and in English, with a line for each edition that reads it, such as "B: the Byzantine text is split here" or "NA27/NA28: Nestle-Aland reads this". Where Nestle-Aland prints words in square brackets, the brackets are kept.

With a licence, **Ask the tutor** is at the foot of the sheet. It opens a talk about the verse, and the tutor knows its readings. It will explain what each reading says and what each side holds; it does not tell you which is right. **Done**, a swipe down or a tap outside the sheet closes it.

## Where the English comes from

The English of the other readings comes from two places. Where the Majority Standard Bible's own footnotes give the critical text's reading (its notes that begin "CT"), Lampas uses that English. For the rest, the English was written when the app was built by the model the tutor uses, from the Greek of each reading and the dictionary meanings of its words, and checked against them. Treat it as a guide to the Greek, not a translation of record: the Greek on the sheet is what the edition prints.

## Sources

- [The 2018 apparatus, as the byztxt project keeps it](https://github.com/byztxt/byzantine-majority-text/tree/v3.3.2/csv-unicode/ccat/with-variants) (public domain): every reading the brace and the sheet show.
- [The Majority Standard Bible](https://majoritybible.com/) (public domain): the English you read, and the "CT" footnotes.
- [How Lampas builds the readings and their English](https://github.com/Jonathan-A-White/lampas/blob/main/docs/data.md) (the sections "Variants" and "Variant English").
