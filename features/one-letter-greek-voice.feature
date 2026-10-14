Feature: A one-letter Greek word is said by a bundled clip of its sound, never by the phone's voice
  A Greek word of one letter (Ὃ, ὁ, ἡ, ὦ, ἤ, ὅ) is never handed to the phone's voice: a Greek voice handed one letter
  names it ('omicron'), whatever accent it carries (mw-5r3p30.226, .256 and .262 each handed it another form, and his
  phone still said 'Omicron'). The app plays a short clip of the word's sound instead, the chosen pronunciation's (for
  Modern Greek the vowel o of ὁ, Ὃ and ὦ, the ee of ἡ and ἤ). The voice here is honest about it: like his phone's, it
  names a letter it is handed alone. A letter drill, where the letter itself is asked about, still names the letter.

  Scenario: The speaker beside Ὃ on The Greek alphabet says o, not omicron
    Given Lampas is opened on a phone with a Greek voice and the goal "1 John 1:1"
    When he opens the lesson "alphabet" from the Goal screen
    And he taps the speaker "Hear Ὃ" beside its example
    Then he hears "o", not "omicron"
    And the clip "/sounds/modern/o.mp3" is played and the phone's voice is handed nothing

  Scenario Outline: Holding a one-letter word in the reader plays its sound
    Given Lampas is opened on a phone with a Greek voice
    And he opens "<chapter>" in Greek
    When he long presses the word "<word>" in verse <verse>
    Then he hears "<sound>", not "<name>"
    And the clip "<clip>" is played and the phone's voice is handed nothing

    Examples:
      | chapter  | word | verse | sound | name    | clip                 |
      | rom.8    | ὁ    | 3     | o     | omicron | /sounds/modern/o.mp3  |
      | 1jn.1    | ἡ    | 2     | ee    | eta     | /sounds/modern/ee.mp3 |
      | rom.2    | ὦ    | 1     | o     | omega   | /sounds/modern/o.mp3  |
      | 1jn.1    | Ὃ    | 1     | o     | omicron | /sounds/modern/o.mp3  |

  Scenario: The word sheet's speaker on a one-letter word plays its sound
    Given Lampas is opened on a phone with a Greek voice
    And he opens "1jn.1" in Greek
    When he taps the word "Ὃ" in verse 1 and the word sheet opens
    And he taps "Hear it" on the word sheet
    Then he hears "o", not "omicron"
    And the clip "/sounds/modern/o.mp3" is played and the phone's voice is handed nothing

  Scenario: Tap to hear on a one-letter word plays its sound
    Given a Tap to hear bar for the word "ἡ"
    When he taps "Tap to hear"
    Then he hears "ee", not "eta"
    And the clip "/sounds/modern/ee.mp3" is played and the phone's voice is handed nothing

  Scenario: Listening to a verse plays the clip for a one-letter word and the voice reads the rest
    Given Lampas is opened on a phone with a Greek voice
    When a reading of "Ὃ" and then "That which was from the beginning" starts
    Then he hears "o", then "That which was from the beginning"
    And no utterance handed to the phone's voice is one Greek letter

  Scenario: A letter drill still names the letter
    Given a letter drill asks him to hear the letter omicron and tap it
    When he taps "Tap to hear"
    Then the phone is told to speak the letter itself, "ο", with lang "el-GR" in its Greek voice
