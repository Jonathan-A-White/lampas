Feature: The Reader reads an Old Testament book in the Septuagint
  Settings > Old Testament in Greek (Septuagint) (under How much Greek?, off to start) opens a shipped Old Testament book in Swete's Greek instead of the Hebrew, with Brenton's English
  as the one chunk of each verse. The header names the edition under the title and, where the Septuagint numbers a chapter differently, both numberings ('Psalms 23 (Greek 22)'); a verse
  that is numbered differently says both ('1 (22:1)'). A book not yet in public/data-lxx stays Hebrew and says so. The weave needs a Greek word to lay over an English chunk, and the
  Septuagint's English is one chunk a verse, so the Weave is off there. The chapters are the fixtures in tests/fixtures/data-lxx (a shipped Genesis 1 and Greek Psalm 22; Isaiah is not shipped).

  @uc-septuagint @greek
  Scenario: With the setting off Genesis 1 is the Hebrew
    Given Lampas is opened on Genesis 1 with the Septuagint off
    Then the language switch offers "English" and "Hebrew"
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: With the setting on Genesis 1 is the Greek with Brenton's English under verse 1
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Greek"
    And verse 1 begins with the Greek "ΕΝ"
    And the English under verse 1 is "In the beginning God made the heaven and the earth."
    And the header subtitle reads "Septuagint (Swete) · Brenton (LXX2012)"
    And the title reads "Genesis 1"

  @uc-septuagint @greek
  Scenario: In the English view the verse is Brenton's English
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "english"
    Then verse 1 reads "In the beginning God made the heaven and the earth."

  @uc-septuagint @greek
  Scenario: Psalms 23 is Greek Psalm 22 and its first verse says both numbers
    Given Lampas is opened on Psalms 23 with the Septuagint on and the saved view "greek"
    Then the title reads "Psalms 23 (Greek 22)"
    And the number of the first verse reads "1 (22:1)"
    And the header subtitle reads "Septuagint (Swete) · Brenton (LXX2012)"

  @uc-septuagint @greek
  Scenario: A book whose Septuagint is not shipped stays Hebrew and says so
    Given Lampas is opened on Isaiah 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Hebrew"
    And the note reads "The Septuagint of Isaiah is not ready yet; this is the Hebrew."
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: The Weave is off on a Septuagint chapter and a hint says why once
    Given Lampas is opened on Genesis 1 with the Septuagint on and the Weave "solid"
    Then the language switch offers "English" and "Greek"
    And the tip reads "The Septuagint has one line of English a verse, so the Weave is off here"

  # The word card of a Septuagint word (mw-u2w5klk.12): the lemma, parsing and meaning come from the lemma lexicon (public/data-lxx/lexicon-grc-lxx.json; a word of this text has no Strong's number),
  # the card says how Lampas read the word (the layer and the confidence in words), a word the derivation only guessed is drawn with a mark and told as a guess, never offered to learn, and can be reported.
  @uc-word-sheet @greek
  Scenario: A tap on ἐποίησεν opens its card from the lemma lexicon, with no Strong's row and no empty Study tile
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek" and the Strong's resource on
    When he taps the word "ἐποίησεν" in verse 1
    Then the card shows the Lemma "ποιέω"
    And the card shows the Parsing "verb, aorist active indicative, 3rd person singular"
    And the card shows the Meaning "to do, make"
    And the card has "Hear it"
    And the card has no Strong's row and no Study tile without a link
    And the card reads "How Lampas read this word: From the New Testament's forms (sure)"

  @uc-hear-word @greek
  Scenario: Hear it on a Septuagint word says the Greek word
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek" on a phone with a Greek voice
    When he taps the word "ἐποίησεν" in verse 1
    And he taps "Hear it" on the card
    Then the phone is told to speak "ἐποίησεν" in Greek

  @uc-word-sheet @greek
  Scenario: A guessed word is drawn with a mark, its card says it is a guess and cannot be added to his words
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    Then the word "Γενηθήτωσαν" in verse 14 is drawn with the mark "a guess"
    And the word "ἐποίησεν" in verse 1 is drawn without it
    When he taps the word "Γενηθήτωσαν" in verse 14
    Then the card begins "A guess: Lampas derived this reading and is not sure"
    And the card reads "How Lampas read this word: A guess (unsure)"
    And the card has "Report this reading"
    And the card has no "Add to my words"

  @uc-word-sheet @greek
  Scenario: Report this reading asks the tutor about the word in its verse
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek" and a tutor behind a fake Postern
    When he taps the word "Γενηθήτωσαν" in verse 14
    And he taps "Report this reading" on the card
    Then the Talk sheet opens on Genesis 1:14 with the question "Is Γενηθήτωσαν in Genesis 1:14 read right as γίνομαι, verb, aorist passive imperative, 3rd person plural?"
    And the mill received one bible-talk grist about the word as for any word question
    And the tutor's answer shows under the question

  # R4 promised a guessed word is never quizzed (mw-5r3p30.963): the grammar questions over a passage are built from the words Lampas read, never from a guess. Genesis 1 has three guesses:
  # ὤφθη (verse 9), Γενηθήτωσαν (verse 14) and ζωσῶν (verse 20), each the only word of its verse with some parsing, so a builder that did not skip it would ask for it.
  @uc-grammar-ladder @greek
  Scenario: A grammar question over the Septuagint chapter never asks for a guessed word
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek" and the chapter's grammar questions built for every idea
    Then no question has "ὤφθη", "Γενηθήτωσαν" or "ζωσῶν" as its right answer
    And a read word of Genesis 1 is the right answer of some question
