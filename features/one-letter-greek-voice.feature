Feature: A one-letter Greek word is said by the phone's own Greek voice, handed the vowel doubled
  A Greek word of one letter (Ὃ, ὁ, ἡ, ὦ, ἤ, ὅ) is never handed to the phone's voice as it is: a Greek voice handed one
  letter names it ('omicron'), whatever accent it carries (mw-5r3p30.226, .256 and .262 each handed it another form, and
  his phone still said 'Omicron'). Handed the vowel doubled ('οο'), his phone's own Greek voice says the sound: on the
  listening trial he chose it over every clip, 'the best sound for the vowels is actually the double ones from the phone
  itself' (mw-5r3p30.395, mw-5r3p30.421). So the voice is handed the chosen pronunciation's form (for Modern Greek the
  bare vowel doubled: οο for ὁ and Ὃ, ωω for ὦ, ηη for ἡ), and the bundled clip of the sound plays only on a phone with
  no Greek voice. The voice here is honest about it: like his phone's, it names a letter it is handed alone and says a
  doubled vowel as its sound. A sound drill says a vowel's sound the same way; a consonant has no such form and is named.

  Scenario: The speaker beside ἡ on The Greek alphabet says ee, not eta
    Given Lampas is opened on a phone with a Greek voice and the goal "1 John 1:2"
    When he opens the lesson "alphabet" from the Goal screen
    And he taps the speaker "Hear ἡ" beside its example
    Then he hears "ee", not "eta"
    And the phone's Greek voice is handed "ηη" and no clip plays

  Scenario Outline: Holding a one-letter word in the reader says its sound
    Given Lampas is opened on a phone with a Greek voice
    And he opens "<chapter>" in Greek
    When he long presses the word "<word>" in verse <verse>
    Then he hears "<sound>", not "<name>"
    And the phone's Greek voice is handed "<form>" and no clip plays

    Examples:
      | chapter  | word | verse | sound | name    | form |
      | rom.8    | ὁ    | 3     | o     | omicron | οο   |
      | 1jn.1    | ἡ    | 2     | ee    | eta     | ηη   |
      | rom.2    | ὦ    | 1     | o     | omega   | ωω   |
      | 1jn.1    | Ὃ    | 1     | o     | omicron | οο   |

  Scenario: The word sheet's speaker on a one-letter word says its sound
    Given Lampas is opened on a phone with a Greek voice
    And he opens "1jn.1" in Greek
    When he taps the word "Ὃ" in verse 1 and the word sheet opens
    And he taps "Hear it" on the word sheet
    Then he hears "o", not "omicron"
    And the phone's Greek voice is handed "οο" and no clip plays

  Scenario: Tap to hear on a one-letter word says its sound
    Given a Tap to hear bar for the word "ἡ"
    When he taps "Tap to hear"
    Then he hears "ee", not "eta"
    And the phone's Greek voice is handed "ηη" and no clip plays

  Scenario: Listening to a verse hands the voice the doubled vowel and the rest as it is
    Given Lampas is opened on a phone with a Greek voice
    When a reading of "Ὃ" and then "That which was from the beginning" starts
    Then he hears "o", then "That which was from the beginning"
    And no utterance handed to the phone's voice is one Greek letter

  Scenario: On a phone with no Greek voice a verse plays the clip for a one-letter word
    Given Lampas is opened on a phone with no Greek voice
    When a reading of "Ὃ" and then "That which was from the beginning" starts
    Then he hears "o", then "That which was from the beginning"
    And the clip "/sounds/modern/o.mp3" was played for it

  Scenario: A sound drill on a vowel says its sound
    Given a letter drill asks him to hear the letter "letter-omicron" and tap it
    When he taps "Tap to hear"
    Then the phone is told to speak "οο" with lang "el-GR" in its Greek voice
    And he hears "o", not "omicron"

  Scenario: A sound drill on a consonant still names the letter
    Given a letter drill asks him to hear the letter "letter-beta" and tap it
    When he taps "Tap to hear"
    Then the phone is told to speak "β" with lang "el-GR" in its Greek voice
