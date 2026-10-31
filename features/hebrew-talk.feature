Feature: The Bible talk on a verse of the Old Testament
  Talk about verse N is offered on an Old Testament verse, and the chapter's Talk bar works on an Old Testament chapter. The request carries the verses'
  Hebrew, pointed with the cantillation off, under `hebrew`, with `hebrew_words` (each word's lemma, transliteration, gloss and parsing, as the Verse
  view's ask sends them) and no `greek` (mw-gdcyf98.18; src/services/talk.ts, grinds/bible-talk.input.schema.json). A Hebrew word of the answer's
  `words` carries its language and is drawn right to left in the Hebrew face and tapped to its word sheet. At Hebrew 0 (Just English) the request
  holds the English alone and the tutor is told the dial (`hebrew_interest`). These scenarios run against a fake Postern whose mill answers. The
  instruction part for the Old Testament (grinds/bible-talk.instructions) waits for room under the byte ceiling, so nothing here runs the live mill.

  @uc-talk @hebrew
  Scenario: Talk about verse 1 on Jonah 1 sends the Hebrew and its words and no Greek
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk behind a fake Postern
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    Then the sheet is titled "Talk about Jonah 1:1"
    When he sends "What does the Hebrew word for word mean here?"
    Then the mill received one bible-talk grist whose input carries the reference "Jonah 1:1", the English of verse 1 and no Greek
    And its input carries the verse in Hebrew, pointed, with no cantillation, under hebrew
    And its input carries the Hebrew word "דְּבַר־" with the lemma "דָּבָר", the gloss "word", its transliteration and its parsing in plain words
    And its input tells the tutor the Hebrew dial is at "Curious"

  @uc-talk @hebrew
  Scenario: The chapter talk on Genesis 1 sends the first verses' Hebrew and its words
    Given Lampas is opened on Genesis 1 with the Hebrew dial at Curious and a talk behind a fake Postern
    When he opens Talk from the Talk bar
    And he sends "What is the first verse saying?"
    Then the mill received one bible-talk grist whose input carries the reference "Genesis 1" and no Greek
    And its input carries the verses "1:1-3" in Hebrew, pointed, with Hebrew words

  @uc-tutor-word @hebrew
  Scenario: The answer's Hebrew word is drawn right to left and opens its word sheet
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk whose answer explains the Hebrew word "דְּבַר־"
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    And he sends "What does the Hebrew word for word mean here?"
    Then the answer lists the Hebrew word "דְּבַר־" with the lemma "דָּבָר", right to left in the Hebrew face
    When he taps the Hebrew word "דְּבַר־" of the answer
    Then the word sheet opens on the Hebrew word "דְּבַר־"

  @uc-tutor-word @hebrew
  Scenario: Add to my words on the answer's Hebrew word lists the lemma as a Hebrew word with the lexicon's gloss
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk whose answer explains the Hebrew word "דְּבַר־"
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    And he sends "What does the Hebrew word for word mean here?"
    And he taps Add to my words on the answer's word "דָּבָר"
    Then his words hold "דָּבָר" as a Hebrew word with the gloss "word"
    And the answer's button for "דָּבָר" now reads On my list

  @uc-tutor-word @hebrew
  Scenario: An answer that asks to add a Hebrew lemma to his words says so in the Hebrew face
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk whose answer adds the Hebrew word "דָּבָר" to his words
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    And he sends "Add דָּבָר to my words"
    Then the answer says "Added דָּבָר to your words", the lemma right to left in the Hebrew face
    And his words hold "דָּבָר" as a Hebrew word with the gloss "word"

  @uc-tutor-word @hebrew
  Scenario: A word link to a Hebrew lemma is drawn in Hebrew and opens the Hebrew word's sheet
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a talk whose answer links the Hebrew word "דָּבָר"
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    And he sends "What does the Hebrew word for word mean here?"
    Then the answer's study links name "דָּבָר" right to left in the Hebrew face and not in Greek type
    When he taps the answer's link "Open דָּבָר in Lampas"
    Then the Hebrew word sheet opens over the Talk sheet on the lemma "דָּבָר" with the meaning "word"

  @uc-talk @greek
  Scenario: A talk on a Greek chapter is as it was
    Given Lampas is opened on Romans 8 with the Hebrew dial at Curious and a talk behind a fake Postern
    When he taps the number of verse 28 and chooses "Talk about verse 28"
    And he sends "What does συνεργεῖ mean here?"
    Then the mill received one bible-talk grist whose input carries the Greek of verse 28 with Greek words and no Hebrew

  @uc-talk @hebrew
  Scenario: At Hebrew 0 the talk on Jonah 1 sends the English alone and tells the tutor the dial
    Given Lampas is opened on Jonah 1 with the Hebrew dial at Just English and a talk behind a fake Postern
    When he taps the number of verse 1 and chooses "Talk about verse 1"
    And he sends "What does the verse say?"
    Then the mill received one bible-talk grist whose input carries the reference "Jonah 1:1", the English of verse 1 and no Greek
    And its input has no Hebrew and no Hebrew words
    And its input tells the tutor the Hebrew dial is at "Just English"
