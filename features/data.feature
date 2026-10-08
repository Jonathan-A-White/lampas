Feature: The New Testament data
  Every chapter of the Greek New Testament (Byzantine text, Majority Standard Bible alignment) is a
  small JSON file the app loads on demand: Greek words in Greek order with their lemma, gloss and
  parsing, and the English chunks in English order. npm run data:build makes them from two public
  sources; the JSON is committed.

  Scenario: The index lists the whole New Testament
    Given the committed index
    Then it lists 27 books in canonical order with 260 chapters

  Scenario: Every chapter file is there and parses
    Given the committed index
    Then each of its chapters has a file that parses with the shape the app reads

  Scenario: Romans 8 is the chapter the demo reads
    Given the committed chapter rom 8
    Then it has 39 verses and verse 1 begins with the Greek words "Οὐδὲν ἄρα"
    And it is under 400 KB

  Scenario: John 1 begins in the beginning
    Given the committed chapter jhn 1
    Then verse 1 begins with the Greek words "Ἐν ἀρχῇ"

  Scenario: Romans 8:1 carries the Byzantine clause and a glossed ἄρα
    Given the committed chapter rom 8
    Then verse 1 has the word "ἄρα" carrying "G686" and the gloss "therefore"
    And the English of verse 1 contains "who do not walk according to the flesh"

  Scenario: Every Greek word has a lemma and a gloss
    Given the committed index
    Then no Greek word in any of its chapters lacks a lemma or a gloss

  Scenario: Every parsing code in the text decodes to words
    Given the committed index
    Then every parsing code in its chapters has a decoding

  Scenario: Building twice changes nothing
    Given the source slices
    When the data is built twice
    Then the second run writes the same bytes as the first

  Scenario: Only the index and Romans 8 are precached
    Given the app is built
    Then the service worker precaches data/index.json and data/rom/8.json and no other chapter
    And the service worker serves other chapters cache-first from a runtime cache
