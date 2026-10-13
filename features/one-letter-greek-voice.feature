Feature: A one-letter Greek word is said by the Greek voice as its sound
  A Greek word of one letter (Ὃ, ὁ, ἡ, ὦ) is said by the phone's Greek voice (el-GR), never by the English voice and never
  as the letter's name ('omicron'). The voice is handed the form the chosen pronunciation gives a word of one letter: for
  Modern Greek the bare vowel with a stress mark (ό, ή, ώ; the breathing is not said), which a Greek voice reads as a
  syllable, not as a letter. A speaker on a lesson's example and a hold on a word of the reader take the same path. A letter
  drill, where the letter itself is asked about, still names the letter.

  Scenario: The speaker beside Ὃ in the breathings lesson hands it to the Greek voice as its sound
    Given Lampas is opened on a phone with a Greek voice and the goal "1 John 1:1"
    When he opens the lesson "breathings" from the Goal screen
    And he taps the speaker "Hear Ὃ" beside its example
    Then the phone is told to speak "ό" with lang "el-GR" in its Greek voice
    And what it is told for "Ὃ" is neither the letter's name nor an English respelling

  Scenario Outline: Holding a one-letter word in the reader hands it to the Greek voice as its sound
    Given Lampas is opened on a phone with a Greek voice
    And he opens "<chapter>" in Greek
    When he long presses the word "<word>" in verse <verse>
    Then the phone is told to speak "<said>" with lang "el-GR" in its Greek voice
    And what it is told for "<word>" is neither the letter's name nor an English respelling

    Examples:
      | chapter  | word | verse | said |
      | rom.8    | ὁ    | 3     | ό    |
      | 1jn.1    | ἡ    | 2     | ή    |
      | rom.2    | ὦ    | 1     | ώ    |
      | 1jn.1    | Ὃ    | 1     | ό    |

  Scenario: A letter drill still names the letter
    Given a letter drill asks him to hear the letter omicron and tap it
    When he holds "Hold to hear"
    Then the phone is told to speak the letter itself, "ο", with lang "el-GR" in its Greek voice
