Feature: Teaching a new word on the spot
  As I read a chapter, the header tells me how many new words are waiting there. A tap teaches me the first one with a lot of
  help around it: the Greek large, how it sounds, what it means, the form it takes where it first stands, its picture if it
  has one, and the easiest verse of the chapter with the new word in Greek inside the English. Then I say whether I got it, know
  it already, want it later, or want to ask the tutor.

  Background:
    Given Lampas is opened on Romans 8 with his seed words and a fake Postern

  Scenario: The row under the header shows the chip New 3 for Romans 8 with his seed
    Then the chip under the Reader's header reads "New 3"

  Scenario: The strip is hidden when no new word is left
    Given every word of Romans 8 is already one he has
    Then the Reader shows no New words strip

  Scenario: The teach sheet shows the word with its help
    When he taps New words
    Then the teach sheet shows "αὐτός" large with a speaker, its transliteration, its meaning "it/s/he" and the form of its first occurrence
    And the teach sheet has the buttons Got it, I know this, Not now and Ask the tutor, each at least 48 px tall

  Scenario: The sheet shows the easiest verse with the new word in Greek and its English beneath
    When he taps New words
    Then the sheet shows verse 9 with "αὐτός" in Greek and its English in small grey beneath it
    And the verse number on the sheet is a link to the verse in the reader

  Scenario: The verse number takes him to the verse in the reader
    When he taps New words
    And he taps the verse number on the teach sheet
    Then the teach sheet is gone and verse 9 is still on the reader

  Scenario: Got it adds the word to Words as learning and schedules it due today
    When he taps New words
    And he taps Got it
    Then "αὐτός" is a learning word from his reading, scheduled at step 0 and due now
    And a frontier-taught event for "αὐτός" with the outcome "got-it" was published
    And the teach sheet now shows "εἰς"
    And Words lists "αὐτός" under From my reading

  Scenario: I know this adds the word solid at the 30-day step
    When he taps New words
    And he taps I know this
    Then "αὐτός" is a solid word from his reading, scheduled at the 30-day step
    And a frontier-taught event for "αὐτός" with the outcome "known" was published
    And the teach sheet now shows "εἰς"

  Scenario: Not now shows the next word and the skipped one does not return today
    When he taps New words
    And he taps Not now
    Then the teach sheet now shows "εἰς"
    And "αὐτός" is not among his words
    When he closes the teach sheet
    And he opens the teach sheet again
    Then the teach sheet shows "εἰς" and never "αὐτός" again

  Scenario: Ask the tutor opens the Talk sheet on that word
    When he taps New words
    And he taps Ask the tutor on the teach sheet
    Then the teach sheet is gone and the Talk sheet is titled "Talk about Romans 8:9"
    And the grist carries a question that names "αὐτός"
