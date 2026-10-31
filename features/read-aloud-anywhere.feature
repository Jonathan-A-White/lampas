@uc-read-aloud @greek
Feature: A small speaker reads any text he may want heard
  Wherever Lampas shows a block of prose a learner may want to hear (the Grammar sheet of a term, the idea sheet of a letter or of any idea, a
  new word's sheet, each answer of the tutor, each version in About's What's new and in the sheet shown after an update, each Settings row's More help) a small, quiet speaker at the top right of the block reads it
  aloud with the phone's own voices: each stretch of Greek in the Greek voice, the rest in the English one, at his speed. The button is the one
  component src/speech/ReadAloud.tsx: icon only, named 'Read aloud', and 'Stop reading' while its text is read; a second tap stops it. The words
  stay on screen while they are read. A phone with no voice for a language gets the one line of help and not a silent button. speechSynthesis is
  the recording fake of tests/support/fake-speech.ts.

  Scenario: The shared button reads its text, Greek in Greek, and a second tap stops it
    Given a phone with an English and a Greek voice
    And a Read aloud button for "Say it twice. λύουσιν means they loose."
    When he taps Read aloud
    Then the phone speaks "Say it twice." in "en-US" and "λύουσιν" in "el-GR" and "means they loose." in "en-US"
    And the button is named Stop reading
    When he taps Stop reading
    Then the phone is silent and the button is named Read aloud

  Scenario: The Grammar sheet of plural reads its title, its explanation and the part In Greek
    Given a phone with an English and a Greek voice
    And the Grammar sheet of "plural" is open
    When he taps Read aloud
    Then the phone speaks "plural." in "en-US"
    And it speaks "Plural means more than one" in "en-US"
    And it also speaks "λύουσιν" in "el-GR"
    And the explanation of plural is still on screen

  Scenario: A paused reading keeps its speaker from saying it is still playing, and a tap on it stops the reading
    Given a phone with an English and a Greek voice
    And the Grammar sheet of "plural" is open with the speaking bar at its foot
    When he taps Read aloud
    Then the button is named Stop reading
    When he taps Pause on the bar
    Then the bar offers Resume
    And the speaker is not named Stop reading
    When he taps the paused speaker
    Then the phone is silent and the button is named Read aloud

  Scenario: A phone with no Greek voice gets the help line and the English is still read
    Given a phone with an English voice only
    And the Grammar sheet of "plural" is open
    When he taps Read aloud
    Then the help line about the missing Greek voice is shown
    And the phone speaks "Plural means more than one" in "en-US"
    And the phone speaks nothing in "el-GR"

  Scenario: A phone that cannot speak at all gets a line, not a silent button
    Given a phone that cannot speak
    And the Grammar sheet of "plural" is open
    When he taps Read aloud
    Then a line says there is no voice to read aloud with

  Scenario Outline: The idea sheet of a letter carries the speaker and keeps its words on screen
    Given a phone with an English and a Greek voice
    And the idea sheet of <idea> is open
    When he taps Read aloud
    Then the phone speaks the title <title> in "en-US"
    And the text of the lesson is still on screen

    Examples:
      | idea         | title |
      | letter-chi   | Chi   |
      | letter-alpha | Alpha |

  Scenario: Every idea sheet of the letters has the speaker
    Given a phone with an English and a Greek voice
    Then the idea sheet of every letter of the alphabet has a Read aloud button

  Scenario: The idea sheet of the genitive reads its lesson
    Given a phone with an English and a Greek voice
    And the idea sheet of "case-genitive" is open
    When he taps Read aloud
    Then the phone speaks "The genitive case" in "en-US"
    And the text of the lesson is still on screen

  Scenario: The new word's sheet reads the word and its meaning
    Given a phone with an English and a Greek voice
    And the new word sheet of "πνεῦμα" is open
    When he taps Read aloud
    Then the phone speaks "πνεῦμα" in "el-GR"
    And the phone speaks "spirit" in "en-US"

  Scenario: Each version in What's new has the speaker
    Given a phone with an English and a Greek voice
    And About's What's new lists a version with one new line
    When he taps Read aloud
    Then the phone speaks the line of that version in "en-US"

  Scenario: Each version in the What's new sheet shown after an update has the speaker, and a second tap stops it
    Given a phone with an English and a Greek voice
    And the phone last saw an older version and the changelog lists two versions since
    When Lampas opens
    Then the What's new sheet has a Read aloud button for each of the two versions
    When he taps the first Read aloud
    Then the phone speaks "New: Pin a verse to the top." in "en-US"
    And the button is named Stop reading
    And the lines of the versions are still on screen
    When he taps Stop reading
    Then the phone is silent and the button is named Read aloud

  Scenario: The More help of a Settings row has the speaker once it is open
    Given a phone with an English and a Greek voice
    And a Settings row whose More help names "λόγος"
    Then the row has no Read aloud button
    When he taps More help
    Then the row has a Read aloud button
    When he taps Read aloud
    Then the phone speaks "λόγος" in "el-GR"
    And the More help is still on screen
    When he taps Less help
    Then the phone is silent
