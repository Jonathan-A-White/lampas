Feature: The recorded voice reads a chapter that has timings
  A chapter of the Majority Standard Bible shown in English with nothing woven, whose recording has verse timings, is read by the publisher's
  MP3 through one audio element: the verse marked as being read follows the timings, the speaking bar (the same bar, Pause, Resume, Restart
  and Stop, in the same slot) steers it, a word said beside it, a hold to ask and a hidden page pause it,
  a verse's play button and a Listen read their own span of the recording, and Play to goes on into the next chapter. Where the recording
  cannot be used (no network, the weave or the Greek shown, no timings, the Bible voice set to Phone voice) the phone's voice reads as before, and
  a recording that fails hands the verse in hand to the phone's voice. The element, the timings and the network are fakes (tests/support).

  Scenario: Play reads John 3 from the recording and the verse being read follows its timings
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    Then the audio element plays the recording of John 3 with no crossorigin attribute
    And the phone's voice is handed nothing
    And verse 1 is marked as being read
    When the recording passes the end of verse 1
    Then verse 2 is marked as being read
    When the recording passes the end of verse 2
    Then verse 3 is marked as being read
    And a verse-reading event was published for verses 1, 2 and 3

  Scenario: A verse's play button reads that verse of the recording and stops at its end
    Given John 3 is open in English with the recorded voice chosen
    When he taps the play button of verse 16
    Then the audio element plays the recording from the start of verse 16
    And verse 16 is marked as being read
    When the recording passes the end of verse 16
    Then the audio element is paused
    And the reading is idle

  Scenario: A Listen on a section reads the section from the recording and offers Play again
    Given John 3 is open in English with the recorded voice chosen
    When he taps the heading "Jesus and Nicodemus"
    And he taps "Play verses 1-21"
    Then the audio element plays the recording from its start
    When the recording passes the end of verse 21
    Then the audio element is paused
    And the reading is idle
    And the Listen foot offers "Play again"

  Scenario: Play to End of the book turns to John 4 and plays its recording from its first verse
    Given John 3 is open in English with the recorded voice chosen
    When he selects verse 36 and taps "Read from here"
    And the recording passes the end of verse 36
    Then the Reader shows John 4
    And the audio element plays the recording of John 4 from its start
    And verse 1 is marked as being read

  Scenario: Play to End of the book goes on in the phone's voice into a chapter with no timings
    Given John 3 is open in English with the recorded voice chosen and John 4 has no timings
    When he selects verse 36 and taps "Read from here"
    And the recording passes the end of verse 36
    Then the Reader shows John 4
    And the phone's voice is handed the English of John 4:1

  Scenario: A recording that fails hands the verse in hand to the phone's voice
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    And the audio element reports an error
    Then the phone's voice is handed the English of John 3:2
    And the line says "The recorded voice could not be reached: reading with the phone voice"

  Scenario Outline: The phone's voice reads when the recording cannot be used
    Given John 3 is open in English with the recorded voice chosen
    And <condition>
    When he taps "Read from the top"
    Then the phone's voice is handed verse 1
    And the audio element was given no recording

    Examples:
      | condition                               |
      | the phone is offline                    |
      | the weave is on                         |
      | the Greek view is shown                 |
      | the Bible voice is Phone voice          |

  Scenario: The recording plays at his English speed and follows a change of it
    Given John 3 is open in English with the recorded voice chosen and his English speed is 1.5
    When he taps "Read from the top"
    Then the audio element's playback rate is 1.5 and it keeps its pitch
    When his English speed changes to 0.8 while it plays
    Then the audio element's playback rate is 0.8

  Scenario: The speaking bar holds a recorded reading: Pause, Resume from the same second, and Stop
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    Then the speaking bar is playing and shows Pause, Restart and Stop
    And the header shows no Pause or Stop
    When he taps "Pause" on the speaking bar
    Then the audio element is paused
    And the reading bar says "Paused at verse 2"
    And the speaking bar's first button is Resume
    When he taps "Resume" on the speaking bar
    Then the audio element plays on from the second it was paused at
    When he taps "Stop" on the speaking bar
    Then the audio element is paused again
    And the reading is idle
    And there is no speaking bar

  Scenario: Restart goes back to the start of the verse being read
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 2
    And the recording plays 4 seconds into verse 3
    And he taps "Restart" on the speaking bar
    Then the audio element plays on from the start of verse 3
    And verse 3 is marked as being read

  Scenario: Restart on a Listen of a section goes back to the section's first verse
    Given John 3 is open in English with the recorded voice chosen
    When he taps the heading "Jesus and Nicodemus"
    And he taps "Play verses 1-21" in the Verse view
    And the recording passes the end of verse 4
    And he taps "Restart" on the speaking bar
    Then the audio element plays on from the start of verse 1
    And verse 1 is marked as being read

  Scenario: A word said alone while the recording plays pauses it first, and Resume goes on from the same second
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    And a Greek word is said alone, as a speaker beside it says one
    Then the audio element was paused before the word was spoken
    And the speaking bar's first button is Resume
    When the phone finishes the word
    Then the audio element is paused
    And the speaking bar still offers Resume first
    When he taps "Resume" on the speaking bar
    Then the audio element plays on from the second it was paused at

  Scenario: A word held while a recorded Listen plays pauses it and the Listen goes on by itself when the word ends
    Given John 3 is open in English with the recorded voice chosen
    When he taps the heading "Jesus and Nicodemus"
    And he taps "Play verses 1-21" in the Verse view
    And the recording passes the end of verse 1
    And he long presses the first word of verse 2 in the passage
    Then the audio element was paused before the word was spoken
    And the speaking bar's first button is Resume
    When the phone finishes the word
    Then the audio element plays on from the second it was paused at
    And the speaking bar is playing and shows Pause, Restart and Stop

  Scenario: A hold to ask pauses the recording and a Listen goes on when the hold ends
    Given John 3 is open in English with the recorded voice chosen
    When he taps the heading "Jesus and Nicodemus"
    And he taps "Play verses 1-21" in the Verse view
    And the recording passes the end of verse 1
    And a hold to ask begins
    Then the audio element was paused
    And the speaking bar's first button is Resume
    When the hold to ask ends
    Then the audio element plays on from the second it was paused at

  Scenario: A page that hides pauses the recording and waits for Resume
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    And the page goes hidden
    Then the audio element is paused
    And the reading is paused
    When the page comes back
    Then the audio element is still paused
    And the speaking bar's first button is Resume
    When he taps "Resume" on the speaking bar
    Then the audio element plays on from the second it was paused at

  Scenario: Leaving the Reader pauses the recording and opening another chapter ends it
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    And he opens Settings
    Then the audio element is paused
    And the reading is paused
    When he opens John 3 again
    Then the speaking bar's first button is Resume
    When he opens John 4 by hand
    Then the reading is idle
    And there is no speaking bar

  Scenario: There is only one speaking bar
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And he taps "Pause" on the speaking bar
    Then the page holds exactly one speaking bar
