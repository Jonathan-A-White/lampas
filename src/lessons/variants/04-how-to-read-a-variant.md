# How to read a variant

<!-- toc: none -->

How Lampas draws a variant in the Reader, and how to read it.

## Turning variants on

Variants are off until you turn them on. In a chapter that has any, the chips under the Reader's header include one that starts with ⁑ and a number: how many places it would mark. Tap it to turn variants on or off; press and hold it for a short sheet that chooses which ones you see.

The same choices are in Settings > Reading > Variants:

- **Variants**: Off; Those that change the English (where another reading would change the English); or All (every place, even a spelling).
- **Witnesses**: Byzantine splits only; also Nestle-Aland; or also ECM. This says whose readings count.

## The mark and the brace

With variants on, the words of each place are underlined with a light dotted line. Right after them comes a **brace**: the other reading inside curly brackets, with a small sign for whose reading it is. In Revelation 3:1, in English, "for being alive" is underlined, and you see:

> you have a reputation for being alive, {and you live **B**}

The underlined words are your text; the brace holds the other reading, here καὶ ζῇς where the text has ὅτι ζῇς. Its English renders the other Greek word for word, so it may not fit the sentence. The sign **B** says it is a reading on which the Byzantine manuscripts are split. **NA** is the Nestle-Aland text's reading and **ECM** the *Editio Critica Maior*'s.

The brace holds the reading's Greek in the Greek view and its English in the English view. Inside it you may also see:

- **left out**: the other reading does not have these words at all.
- **same**: with All chosen, Greek that differs where the English does not.
- a **|** between two readings, when a place has more than one.

## The sheet

Tap a brace and a sheet opens from the bottom, titled as in "Revelation 3:2: where the manuscripts differ". It lists:

- **The text reads**: the words of the text you are reading, in Greek and in English.
- **Other reading**: each other reading, in Greek and in English, with a line for each edition that reads it, such as "NA27/NA28: Nestle-Aland reads this". Nestle-Aland's square brackets are kept.

With a licence, **Ask the tutor** at the foot opens a talk about the verse: it explains each reading and what each side holds, and does not tell you which is right. **Done**, a swipe down or a tap outside closes the sheet.

## Read this, and reading sets

Each reading on the sheet has **Read this**: it lays that reading into the text in place of the text's own, marked with a thin solid line, and the text's own then stands in the brace under the chip **RP**. It is kept on this phone; reading aloud, copying, Read check and the diagram keep the Byzantine words.

What you read is a **reading set**. **Read as**, in the sheet that press and hold opens and in Settings > Reading > Variants, switches the whole text at once: **Byzantine**; **NA** (Nestle-Aland's reading at every place); **ECM** (the *Editio Critica Maior*'s where its apparatus gives it, 18 places in Acts, else NA); **Mine**, which Read this starts from the set you were reading; and sets you name. **Save as…** keeps a copy of the set you are reading under a name; **Rename** and **Delete** change your own sets, never the three built-in ones.

## Where the English comes from

Where the Majority Standard Bible's own footnotes give the critical text's reading (its notes that begin "CT"), Lampas uses that English. For the rest, the model the tutor uses wrote it when the app was built, from the Greek of each reading and the dictionary meanings of its words. Treat it as a guide to the Greek, not a translation of record.

## Sources

- [The 2018 apparatus, as the byztxt project keeps it](https://github.com/byztxt/byzantine-majority-text/tree/v3.3.2/csv-unicode/ccat/with-variants) (public domain): every reading the brace and the sheet show.
- [The Majority Standard Bible](https://majoritybible.com/) (public domain): the English you read, and the "CT" footnotes.
- [How Lampas builds the readings and their English](https://github.com/Jonathan-A-White/lampas/blob/main/docs/data.md) (the sections "Variants" and "Variant English").
