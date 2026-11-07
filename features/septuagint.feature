Feature: The Reader reads an Old Testament book in the Septuagint
  Settings > Old Testament in Greek (Septuagint) (under How much Greek?, off to start) opens a shipped Old Testament book in Swete's Greek instead of the Hebrew, with Brenton's English
  as the one chunk of each verse. The Greek view draws Swete's Greek alone, as the New Testament's does (mw-u2w5klk.275); Brenton's English is the English view. The header names the edition under the title and, where the Septuagint numbers a chapter differently, both numberings ('Psalms 23 (Greek 22)'); a verse
  that is numbered differently says both ('1 (22:1)'). A book not yet in public/data-lxx stays Hebrew and says so. The weave needs a Greek word to lay over an English chunk, and the
  Septuagint's English is one chunk a verse, so there is nothing to weave: with the Weave on, the switch's Weave position draws the Greek verse alone and says so once, and its English
  position is Brenton's prose. A chapter whose verses carry aligned chunks (`npm run lxx:ship`, docs/lxx-align.md) is woven in the Weave position as the New Testament is, and says nothing. The chapters are the fixtures in tests/fixtures/data-lxx (a shipped Genesis 1 and Greek Psalm 22; Isaiah is not shipped).

  @uc-septuagint @greek
  Scenario: With the setting off Genesis 1 is the Hebrew
    Given Lampas is opened on Genesis 1 with the Septuagint off
    Then the language switch offers "English" and "Hebrew"
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: With the setting on Genesis 1 in the Greek view is Swete's Greek alone
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Greek"
    And verse 1 begins with the Greek "ΕΝ"
    And no English is under verse 1
    And the header subtitle reads "Greek: Swete's edition · English: Brenton's translation"
    And the title reads "Genesis 1"

  @uc-septuagint @greek
  Scenario: A tap on the header line opens the sheet of whose texts these are
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    When the header subtitle is tapped
    Then the sheet "Whose texts these are" shows the Greek, the English, the words' lemma and parsing, and the versification
    And Done closes the sheet

  @uc-septuagint @greek
  Scenario: In the English view the verse is Brenton's English
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "english"
    Then verse 1 reads "In the beginning God made the heaven and the earth."

  @uc-septuagint @greek
  Scenario: Psalms 23 is Greek Psalm 22 and its first verse says both numbers
    Given Lampas is opened on Psalms 23 with the Septuagint on and the saved view "greek"
    Then the title reads "Psalms 23 (Greek 22)"
    And the number of the first verse reads "1 (22:1)"
    And the header subtitle reads "Greek: Swete's edition · English: Brenton's translation"

  @uc-septuagint @greek
  Scenario: A book whose Septuagint is not shipped stays Hebrew and says so
    Given Lampas is opened on Isaiah 1 with the Septuagint on and the saved view "greek"
    Then the language switch offers "English" and "Hebrew"
    And the note reads "The Septuagint of Isaiah is not ready yet; this is the Hebrew."
    And no header subtitle is shown

  @uc-septuagint @greek
  Scenario: With the Weave on the switch has a Weave position that draws the Greek alone and says why once
    Given Lampas is opened on Genesis 1 with the Septuagint on and the Weave "solid"
    Then the language switch offers "English", "Weave" and "Greek"
    And the Weave position is chosen
    And verse 1 begins with the Greek "ΕΝ"
    And no English is under verse 1
    And the tip reads "The Septuagint has one line of English a verse, so the Weave is off here"

  @uc-septuagint @greek
  Scenario: With the Weave on the English position is Brenton's prose and the tip is not shown
    Given Lampas is opened on Genesis 1 with the Septuagint on, the Weave "solid" and plain English under it
    Then the language switch offers "English", "Weave" and "Greek"
    And the English position is chosen
    And verse 1 reads "In the beginning God made the heaven and the earth."
    And no tip is shown

  @uc-septuagint @greek
  Scenario: With the Weave on the Greek position is the Greek alone and the tip is not shown
    Given Lampas is opened on Genesis 1 with the Septuagint on, the Weave "solid" and the saved view "greek"
    Then the Greek position is chosen
    And verse 1 begins with the Greek "ΕΝ"
    And no English is under verse 1
    And no tip is shown

  # Swete prints Codex Alexandrinus for Genesis and brackets the letters lost from its damaged leaves ('θ[εὸς λέγων]', Genesis 1:22); the Greek view draws them only with Show manuscript gaps On (mw-u2w5klk.280)
  @uc-septuagint @greek
  Scenario: Swete's lacuna brackets are not drawn in the Greek view, and a word under one opens its card
    Given Lampas is opened on Genesis 1 with the Septuagint on and the saved view "greek"
    Then verse 22 shows no square bracket
    And verse 22 reads in Greek "καὶ ηὐλόγησεν αὐτὰ ὁ θεὸς λέγων Αὐξάνεσθε καὶ πληθύνεσθε, καὶ πληρώσατε τὰ ὕδατα ἐν ταῖς θαλάσσαις, καὶ τὰ πετεινὰ πληθυνέσθωσαν ἐπὶ τῆς γῆς."
    When he taps the word "πετεινὰ" in verse 22
    Then the card shows the Lemma "πετεινός"

  @uc-septuagint @greek
  Scenario: With Show manuscript gaps on the Greek view prints the brackets as Swete did
    Given Lampas is opened on Genesis 1 with the Septuagint on, the saved view "greek" and Show manuscript gaps "on"
    Then verse 22 reads in Greek "καὶ ηὐλόγησεν αὐτὰ ὁ θ[εὸς λέγων] Αὐξάνεσθε καὶ πληθ[ύνεσθε, καὶ] πληρώσατε τὰ ὕδατα [ἐν ταῖς θα]λάσσαις, καὶ τὰ πετε[ινὰ πληθυ]νέσθωσαν ἐπὶ τῆς [γῆς."
    When he taps the word "πετε" in verse 22
    Then the card shows the Lemma "πετεινός"

  # With aligned chunks (scripts/lxx/align.ts, as lxx:ship writes a chapter) the Weave is on in a Septuagint chapter as in the New Testament, and the tip that it is off stands only where there are none
  @uc-septuagint @greek
  Scenario: With aligned chunks the Weave position weaves his solid lemmas in Greek and the tip is not shown
    Given Lampas is opened on Genesis 1 with the Septuagint on, aligned English and the Weave "solid" with the lemma "ποιέω" solid
    Then the language switch offers "English", "Weave" and "Greek"
    And the Weave position is chosen
    And verse 1 shows the Greek "ἐποίησεν" woven into its English
    And no tip is shown

  @uc-septuagint @greek
  Scenario: With aligned chunks and plain English under the Weave the verse is Brenton's prose
    Given Lampas is opened on Genesis 1 with the Septuagint on, aligned English, the Weave "solid" with the lemma "ποιέω" solid and plain English under it
    Then the English position is chosen
    And verse 1 has no Greek woven into its English
    And no tip is shown

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

  # R5 (mw-u2w5klk.15): the tools that read a chapter follow the chapter's language, not the book's name. Genesis 1:1 is Swete's Greek in Memorize and in the Diagram while the setting is On.
  @uc-memorize @greek
  Scenario: With the setting on Memorize learns Genesis 1:1 in the Greek
    Given Lampas is opened on Genesis 1 with the Septuagint on and Genesis 1:1 memorized in Greek at step 2
    When he opens its Memorize session
    Then the session says "Greek · Half the words gone · step 3 of 7"
    And the verse is drawn left to right in Greek with 5 of its 10 words blank

  @uc-diagram @greek
  Scenario: With the setting on the Diagram of Genesis 1:1 is drawn from Swete's Greek
    Given Lampas is opened on Genesis 1 with the Septuagint on and a tutor that draws Genesis 1:1
    When he opens the Verse view of verse 1 and taps Diagram
    Then the pane draws the Greek diagram of Genesis 1:1
    And the tutor was asked once, in Greek, for the 10 words of the verse beginning "ΕΝ ΑΡΧΗ"
