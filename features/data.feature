Feature: The Bible data
  Every chapter of the Greek New Testament (Byzantine text, Majority Standard Bible alignment) is a
  small JSON file the app loads on demand: Greek words in Greek order with their lemma, gloss and
  parsing, and the English chunks in English order. npm run data:build makes them from two public
  sources; the JSON is committed. The Old Testament (the Berean Standard Bible's tables, the Majority
  Standard Bible's Old Testament) is the same shape with the Hebrew words kept: each chapter says its
  source language and its translation. npm run data:build:ot makes those. No screen opens them yet.

  @uc-data @greek @hebrew
  Scenario: The index lists the whole Bible
    Given the committed index
    Then it lists 66 books in canon order with 1189 chapters

  @uc-data @greek
  Scenario: The index lists the New Testament's 27 books with 260 chapters
    Given the committed index
    Then 27 of its books are read in Greek, in canonical order, with 260 chapters

  @uc-data @greek @hebrew
  Scenario: Every chapter file is there and parses
    Given the committed index
    Then each of its chapters has a file that parses with the shape the app reads

  @uc-data @greek
  Scenario: Romans 8 is the chapter the demo reads
    Given the committed chapter rom 8
    Then it has 39 verses and verse 1 begins with the Greek words "Οὐδὲν ἄρα"
    And it is under 400 KB

  @uc-data @greek
  Scenario: John 1 begins in the beginning
    Given the committed chapter jhn 1
    Then verse 1 begins with the Greek words "Ἐν ἀρχῇ"

  @uc-data @greek
  Scenario: Romans 8:1 carries the Byzantine clause and a glossed ἄρα
    Given the committed chapter rom 8
    Then verse 1 has the word "ἄρα" carrying "G686" and the gloss "therefore"
    And the English of verse 1 contains "who do not walk according to the flesh"

  @uc-data @greek
  Scenario: Every Greek word has a lemma and a gloss
    Given the committed index
    Then no Greek word in any of its chapters lacks a lemma or a gloss

  @uc-data @greek
  Scenario: Every parsing code in the text decodes to words
    Given the committed index
    Then every parsing code in its chapters has a decoding

  @uc-data @hebrew
  Scenario: Genesis 1:1 is seven Hebrew words with the English aligned to them
    Given the committed chapter gen 1
    Then it says its source language is "hbo" and its translation is "msb"
    And verse 1 begins with the Hebrew words "בְּרֵאשִׁ֖ית" and has 7 words
    And the English of verse 1 begins "In the beginning" and the direct object marker has no English

  @uc-data @hebrew
  Scenario: Jonah 1 is a chapter of the Old Testament
    Given the committed chapter jon 1
    Then it says its source language is "hbo" and its translation is "msb"

  @uc-data @hebrew
  Scenario: Daniel 2:4 keeps its Aramaic words as words of its Hebrew chapter
    Given the committed chapter dan 2
    Then it says its source language is "hbo" and its translation is "msb"
    And verse 4 has the Aramaic word "מַלְכָּא֙"

  @uc-data @hebrew
  Scenario: Every Hebrew word of the Old Testament has what the table gave it
    Given the committed index
    Then every chapter read in Hebrew says "hbo", and each of its words with a Strong's number has a headword and a gloss, and each with a parsing code has a decoding

  @uc-data @hebrew
  Scenario: The Old Testament can be walked word by word within the gate's time
    Given the committed index
    Then every word of the 929 Old Testament chapters is walked in under 30 seconds

  @uc-data @hebrew
  Scenario: The Hebrew lexicon and word frequencies are built with the chapters
    Given the committed index
    Then public/data/lexicon-hbo.json holds each Hebrew lemma once and public/data/frequency-hbo.json counts every Strong's number of the Old Testament chapters

  @uc-data @greek @hebrew
  Scenario: Building twice changes nothing
    Given the source slices
    When the data is built twice
    Then the second run writes the same bytes as the first

  @uc-data @hebrew
  Scenario: Building the Old Testament twice changes nothing
    Given the Old Testament source slices
    When the Old Testament data is built twice
    Then the second run writes nothing and the New Testament's files are not touched

  @uc-data @greek @hebrew
  Scenario: The frequency table is built with the chapters
    Given the committed index
    Then public/data/frequency.json counts every Strong's number of its chapters, with καί first and ἐν in the top five
    And the build of the source slices writes the same frequency table twice

  @uc-data @greek @hebrew
  Scenario: Only the index, the lemma lexicon, the frequency table and Romans 8 are precached
    Given the app is built
    Then the service worker precaches data/index.json, data/lexicon.json, data/frequency.json and data/rom/8.json and no other chapter or Old Testament file
    And the service worker serves other chapters cache-first from a runtime cache

  @uc-data @greek @hebrew
  Scenario: Every chapter in the index has a fingerprint of its file
    Given the committed index
    Then every chapter has a 12-character fingerprint, the first 12 hex of the SHA-256 of its file

  @uc-data @greek @hebrew
  Scenario: A chapter stays on the phone until its own data changes
    Given chapter jhn 1 is kept on the phone under its fingerprint
    When the app asks for jhn 1 again after an update that leaves its fingerprint alone
    Then the chapter is read from the phone and nothing is fetched
    When the app asks for jhn 1 after an update that changes its fingerprint
    Then the chapter is fetched once and the old copy is removed
