Feature: The idea sheet
  A bottom sheet teaches one grammar idea of the ladder (src/data/grammar/ladder.ts) to a total beginner (mw-5r3p30.234,
  src/data/grammar/teach/): its title, What it is (plain English with an English example), How to spot it (the Greek form, and a
  table where the idea is a set of endings or forms), a Worked example (one New Testament word taken apart step by step, from the
  verse he reads when it has one, with its respelling in his pronunciation), then up to three example forms from the goal passage
  that the lesson can explain (one for each lemma, each with its verse, its meaning here and its parsing in the lesson's own
  terms; a speaker on each; a tap opens the word's sheet), a level slider (Not yet, Learning, I know it;
  Learning puts the idea on the frontier and due tomorrow, I know it starts Drill it: features/drill-it.feature), a small
  text button "Mark known without a drill" (solid, at the 30-day step), a Drill it button and Ask the tutor. It opens from the Learn this idea
  button of a Grammar sheet. With no goal the examples come from the chapter that is open. A foundation idea (a letter, the
  alphabet, a pair of vowels or of consonants, the breathings, accents, iota subscript, syllables, punctuation) shows words of the
  passage with the letters it is about marked, and never says that no word has it in its parsing. Taught ideas are announced on
  the bus as idea-taught (docs/events.md).

  Scenario: The genitive idea's sheet shows its text and three examples from 1 John 1 with their verses
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    When he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    Then the idea sheet is titled "The genitive case" and says what that idea is
    And the idea sheet shows 3 examples "ἀρχῆς", "λόγου" and "ζωῆς" with the verses "1 John 1:1", "1 John 1:1" and "1 John 1:1"
    And each example has a speaker
    And the table of the genitive has the endings "-ου" and "-ων" in its cells
    And the idea sheet shows no level

  Scenario: With no goal the examples come from the open chapter
    Given Lampas is opened on Romans 8 with no goal, no idea level and a fake Postern
    When he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    Then the idea sheet shows 3 examples that are genitives of "Romans 8"
    And the table of the genitive has the endings "-ου" and "-ων" in its cells

  Scenario: An example shows its meaning as it stands in its verse, not the dictionary gloss
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "person-1st" from the Goal screen
    Then the idea sheet is titled "The first person"
    And the example "ἑωράκαμεν" reads "we have seen" and not "to see" alone

  Scenario: An example opens its own word sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps the example "ἀρχῆς" on the idea sheet
    Then the word sheet is of "ἀρχῆς" and its Parsing names a genitive

  Scenario: Sliding to Learning makes the idea frontier and due tomorrow
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    And the ideas that "case-genitive" builds on are solid
    When he slides the level to "Learning"
    Then the idea "case-genitive" is frontier, set by the sheet, and its review is due in 1 day at step 0
    And an idea-taught event for "case-genitive" with the outcome "got-it" was published
    And the idea sheet shows the chip "Frontier since today"

  Scenario: Mark known without a drill makes it solid at the 30-day step
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps Mark known without a drill on the idea sheet
    Then the idea "case-genitive" is solid, set by the sheet, and its review is due in 30 days at the 30-day step
    And an idea-taught event for "case-genitive" with the outcome "known" was published
    And the idea sheet shows the chip "Solid since today"

  Scenario: Learn this idea on the Grammar sheet of genitive opens the idea sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he taps "of the" in verse 2 and the term "genitive" on the word sheet
    Then the Grammar sheet has a button Learn this idea
    When he taps Learn this idea
    Then the idea sheet opens over the Grammar sheet and the word sheet

  Scenario: Ask the tutor opens the Talk sheet with the term in focus
    Given Lampas is opened on Romans 8 with the goal "1 John 1", no idea level and a fake Postern
    And he opens the idea sheet from the Grammar sheet of "genitive" on the word "of the" in verse 2
    When he taps Ask the tutor on the idea sheet
    Then the idea, Grammar and word sheets are gone and the sheet is titled "Talk about Romans 8:2"
    And the grist carries the focus term "genitive" and kind grammar-term

  Scenario: The sheet for The Greek alphabet shows examples from the verse
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the Goal screen and taps Learn next
    Then the idea sheet is titled "The Greek alphabet" and says what that idea is
    And the idea sheet shows examples from "1 John 1:1"
    And the idea sheet has no line "has this idea in its parsing"

  Scenario: A pair of vowels is marked in each example
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "diphthongs" from the Goal screen
    Then the idea sheet shows the example "λόγου" with "ου" marked
    And the idea sheet shows the example "καὶ" with "αὶ" marked
    And the idea sheet has no line "has this idea in its parsing"

  Scenario: The Breathing marks sheet lists the verse's words that carry a breathing
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "breathings" from the Goal screen
    Then the idea sheet shows the example "ἑωράκαμεν" with "ἑ" marked
    And the idea sheet shows the example "ἀρχῆς" with "ἀ" marked
    And the idea sheet has no line "No word of 1 John 1:1"

  Scenario: The Pairs of vowels sheet gives every sound an English key word
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "diphthongs" from the Goal screen
    Then the idea sheet text says "e as in pet", "ee as in see" and "oo as in food"
    And the idea sheet text says it follows "Modern Greek"

  Scenario: The Breathing marks sheet teaches the Modern Greek sound, where a breathing is silent
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "breathings" from the Goal screen
    Then the idea sheet text says the breathing is silent and gives ὁ as “o”
    And the idea sheet text does not say a breathing adds an h or that ὁ is “ho”

  Scenario: Another pronunciation teaches its own breathing lesson on the sheet
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and the pronunciation "testish" chosen
    When he opens the idea sheet of "breathings" from the Goal screen
    Then the idea sheet text says "Testish says the rough breathing as a hum."
    And the idea sheet text does not say "silent"

  # Teach tiles (mw-5r3p30.232): a card of the letters, sounds and marks tiers shows its items as tiles above the prose, each to hear, so a
  # beginner meets the letter, its name and its sound, and does not only read about them.
  Scenario: The Greek alphabet sheet shows 24 tiles, each with its name and sound, and a tap says the letter
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and a Greek voice
    When he opens the idea sheet of "alphabet" from the Goal screen
    Then the idea sheet shows 24 tiles in alphabet order, the first reading "Α α", "alpha" and "a, as in “father”"
    And the seven vowels are marked on the tiles
    And the tiles come above what the idea is
    When he taps the tile "alpha"
    Then the Greek voice is asked to say "α"

  Scenario: The Breathing marks sheet shows a tile for each breathing with its sound and an example word to hear
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and a Greek voice
    When he opens the idea sheet of "breathings" from the Goal screen
    Then the idea sheet shows 2 tiles, "ʽ" the rough breathing and "᾿" the smooth breathing, each with the sound "nothing"
    And each tile has an example word with a play button, "ἅγιος" and "ἀγάπη"
    When he taps the play button of "ἅγιος"
    Then the Greek voice is asked to say "ἅγιος"

  Scenario: A tile opens the idea sheet of its own item
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and a Greek voice
    And he opens the idea sheet of "alphabet" from the Goal screen
    When he taps the name of the tile "alpha"
    Then a second idea sheet titled "Alpha" opens over the first and shows one tile, "Α α"

  Scenario: Another pronunciation gives the tiles its own sounds, and never Modern Greek's
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and the pronunciation "testish" chosen
    When he opens the idea sheet of "alphabet" from the Goal screen
    Then the first tile has no sound line and does not say "father"

  # Every card teaches a total beginner (mw-5r3p30.234): what it is, how to spot it (a table of the endings), and a word of his verse taken apart.
  Scenario: The noun sheet says what a noun is, shows its endings in a table, and takes a word of 1 John 1:1 apart
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the idea sheet has the parts "What it is", "How to spot it" and "Worked example", in that order
    And what a noun is is said in plain English with an English example
    And How to spot it has a table of the case endings, with "-ος", "-ου" and "-ῳ" in its cells
    And the worked example takes "λόγου" of "1 John 1:1" apart in steps, with the respelling the pronunciation gives it
