Feature: The recorded voice reads a chapter that has timings
  A chapter of the Majority Standard Bible shown in English with nothing woven, whose recording has verse timings, is read by the publisher's
  MP3 through one audio element: the verse marked as being read follows the timings, the header's Pause, Play and Stop work on the element,
  a verse's play button and a Listen read their own span of the recording, and Play to goes on into the next chapter. Where the recording
  cannot be used (no network, the weave or the Greek shown, no timings, the recorded voice not chosen) the phone's voice reads as before, and
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

  Scenario: The header's Pause holds the recording, Play goes on from the same second and Stop ends it
    Given John 3 is open in English with the recorded voice chosen
    When he taps "Read from the top"
    And the recording passes the end of verse 1
    And he taps "Pause" in the header
    Then the audio element is paused
    And the reading bar says "Paused at verse 2"
    When he taps "Play" in the header
    Then the audio element plays on from the second it was paused at
    When he taps "Stop" in the header
    Then the audio element is paused again
    And the reading is idle

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
      | the recorded voice is left at its default |

  Scenario: The recording plays at his English speed and follows a change of it
    Given John 3 is open in English with the recorded voice chosen and his English speed is 1.5
    When he taps "Read from the top"
    Then the audio element's playback rate is 1.5 and it keeps its pitch
    When his English speed changes to 0.8 while it plays
    Then the audio element's playback rate is 0.8
