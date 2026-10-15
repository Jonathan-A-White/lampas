Feature: Read lessons to me
  A reader who reads English slowly (the Governor's son, eight) can ask Lampas to read its lessons to him. Settings > Read aloud > Read lessons to me,
  Off to start. With it On, an idea sheet, a Grammar sheet and a new word's sheet start the shared Read aloud (src/speech/ReadAloud.tsx) by
  themselves when they open: Greek in the Greek voice, the rest in the English one, at his speed. The words never go away: the lesson stays on
  screen while it is read. The speaker still stops the reading, and so does closing the sheet. A browser that will not speak without a tap
  (it refuses with 'not-allowed') gets a gentle 'Tap to listen' pulse on the speaker instead of silence. With it Off nothing speaks until the
  speaker is tapped. speechSynthesis is the honest fake of tests/support/fake-speech.ts.

  Scenario: Settings offers Read lessons to me, Off to start, and keeps On across a reload
    Given Lampas is opened with Read lessons to me untouched
    When he opens Settings
    Then Read lessons to me shows "Off" as the one chosen
    When he chooses "On" for Read lessons to me
    And Lampas is opened again
    And he opens Settings again
    Then Read lessons to me still shows "On" as the one chosen

  Scenario: With it On the idea sheet of Chi reads itself when it opens, Greek in Greek
    Given a phone with an English and a Greek voice
    And Read lessons to me is On
    When the idea sheet of "letter-chi" is opened
    Then the phone speaks the title "Chi" in "en-US"
    And the phone speaks some Greek in "el-GR"
    And the text of the lesson is still on screen
    And the speaker is named Stop reading

  Scenario: With it Off the idea sheet of Chi stays silent until the speaker is tapped
    Given a phone with an English and a Greek voice
    And Read lessons to me is Off
    When the idea sheet of "letter-chi" is opened
    Then the phone has spoken nothing
    When he taps Read aloud
    Then the phone speaks the title "Chi" in "en-US"

  Scenario: Tapping the speaker stops the reading
    Given a phone with an English and a Greek voice
    And Read lessons to me is On
    When the idea sheet of "letter-chi" is opened
    And he taps Stop reading
    Then the phone is silent
    And the speaker is named Read aloud

  Scenario: Closing the sheet stops the reading
    Given a phone with an English and a Greek voice
    And Read lessons to me is On
    When the idea sheet of "letter-chi" is opened
    And the sheet is closed
    Then the phone is silent

  Scenario: The Grammar sheet and the new word's sheet read themselves too
    Given a phone with an English and a Greek voice
    And Read lessons to me is On
    When the Grammar sheet of "plural" is opened
    Then the phone speaks "Plural means more than one" in "en-US"
    When the new word sheet of "πνεῦμα" is opened
    Then the phone then speaks "πνεῦμα" in "el-GR"

  Scenario: A browser that refuses speech without a tap gets a gentle Tap to listen
    Given a phone with an English and a Greek voice that refuses speech without a tap
    And Read lessons to me is On
    When the idea sheet of "letter-chi" is opened
    Then the speaker is named Tap to listen and pulses
    And the text of the lesson is still on screen
    When the phone allows speech
    And he taps Tap to listen
    Then the phone speaks the title "Chi" in "en-US"
    And the speaker is named Stop reading
