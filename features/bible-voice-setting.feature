Feature: The Bible voice setting (mw-82lb97i.6)
  Settings > Listening has a Bible voice row above English voice: Recording on Wi-Fi only to start (mw-zbgo4ep.30), Recording (David), or Phone voice. The recording of
  David (the MSB, streamed from openbible.com) plays where Lampas has its timings; the phone's voice reads wherever it is not chosen. Recording on Wi-Fi only
  is offered only on a phone that can tell Wi-Fi from mobile data (the Network Information API's type), and the choice is taken when a chapter starts, never in
  the middle of one. The audio element, speech and the network are fakes (tests/support).

  Scenario: Bible voice stands above English voice, Recording on Wi-Fi only chosen, with its hint and its credit line
    Given Settings is open at the page of "Listening" on a phone whose connection type is "cellular"
    Then "Bible voice" is drawn above "English voice"
    And the "Bible voice" row shows "Recording on Wi-Fi only" chosen
    And the "Bible voice" row says "The MSB read by David, streamed, where Lampas has it (John so far); else the phone voice."
    When he opens the More help of the "Bible voice" row
    Then the help opens with "Recording: Majority Standard Bible, read by David, streamed from openbible.com"
    And the help names the internet and John
    And the help says it uses about 1.4 MB a minute and that books arrive as they are timed

  Scenario: On a phone that reports its connection the row offers three choices and the Wi-Fi one is kept across a reload
    Given Settings is open at the page of "Listening" on a phone whose connection type is "cellular"
    Then the "Bible voice" row offers "Recording (David)", "Recording on Wi-Fi only" and "Phone voice"
    When he chooses "Recording on Wi-Fi only" for the "Bible voice"
    Then the setting "bibleVoice" is kept as "msb-david-wifi"
    When Settings is opened again after a reload on a phone whose connection type is "cellular"
    Then the "Bible voice" row shows "Recording on Wi-Fi only" chosen

  Scenario: On a phone that cannot tell, the start is shown as Recording on Wi-Fi only, with its help saying what the phone cannot tell
    Given Settings is open at the page of "Listening" on a phone with no connection type
    Then the "Bible voice" row offers "Recording (David)", "Recording on Wi-Fi only" and "Phone voice"
    And the "Bible voice" row shows "Recording on Wi-Fi only" chosen
    When he opens the More help of the "Bible voice" row
    Then the help ends with "This phone cannot tell Wi-Fi from mobile data, so Recording on Wi-Fi only is not offered."

  Scenario: A Wi-Fi choice that reaches a phone that cannot tell is shown as saved, with the other two beside it
    Given the Bible voice "msb-david-wifi" is saved
    And Settings is open at the page of "Listening" on a phone with no connection type
    Then the "Bible voice" row offers "Recording (David)", "Recording on Wi-Fi only" and "Phone voice"
    And the "Bible voice" row shows "Recording on Wi-Fi only" chosen

  Scenario Outline: Play in John 3 reads by the Bible voice and the connection
    Given John 3 is open in English with the Bible voice "<voice>" on a connection of type "<connection>"
    When he taps "Read from the top"
    Then <heard>

    Examples:
      | voice          | connection | heard                                                          |
      | msb-david      | cellular   | the audio element is given the recording of John 3             |
      | msb-david      | none       | the audio element is given the recording of John 3             |
      | phone          | wifi       | the phone's voice is handed verse 1 and the element has no src |
      | msb-david-wifi | wifi       | the audio element is given the recording of John 3             |
      | msb-david-wifi | none       | the audio element is given the recording of John 3             |
      | default        | wifi       | the audio element is given the recording of John 3             |

  Scenario: A chapter that began in the recording finishes in it when Wi-Fi drops, and the next chapter begins in the phone's voice
    Given John 3 is open in English with the Bible voice "msb-david-wifi" on a connection of type "wifi"
    When he selects verse 35 and taps "Read from here"
    Then the audio element is given the recording of John 3
    When the connection turns "cellular"
    And the recording passes the end of verse 35
    Then the audio element is still playing the recording of John 3
    When the recording passes the end of verse 36
    Then the Reader shows John 4
    And the phone's voice is handed the English of John 4:1
    And the audio element was given only John 3

  Scenario: A chapter that began in the recording finishes in it when the Bible voice is changed to Phone voice, and the next Play is the phone's voice
    Given John 3 is open in English with the Bible voice "msb-david" on a connection of type "wifi"
    When he taps "Read from the top"
    Then the audio element is given the recording of John 3
    When the Bible voice is changed to "phone"
    And the recording passes the end of verse 1
    Then the audio element is still playing the recording of John 3
    When he taps "Stop" on the speaking bar
    And he taps "Read from the top" again
    Then the phone's voice is handed verse 1
    And the audio element was given only John 3

  Scenario: On mobile data with the start, the first Play asks once whether to play David over data, and Play David on data plays him and sets the Bible voice
    Given John 3 is open in English with the Bible voice "default" on a connection of type "cellular"
    When he taps "Read from the top"
    Then he is asked "Play David over mobile data? It uses about 1.4 MB a minute (about 86 MB an hour)."
    And the phone's voice is handed nothing and the element has no src
    When he taps "Play David on data"
    Then the audio element is given the recording of John 3
    And the setting "bibleVoice" is kept as "msb-david"

  Scenario: Keep the phone voice reads in the phone voice, says why once, and is never asked again
    Given John 3 is open in English with the Bible voice "default" on a connection of type "cellular"
    When he taps "Read from the top"
    And he taps "Keep the phone voice"
    Then the phone's voice is handed verse 1 and the element has no src
    And the reading says "On mobile data Lampas reads in the phone voice. David plays on Wi-Fi."
    When he taps "Stop" on the speaking bar
    And he taps "Read from the top" again
    Then he is not asked again
    And the phone's voice is handed verse 1 and the element has no src
    And the reading says nothing about the data

  Scenario: On Wi-Fi in a chapter David has not recorded yet, a line says so and the phone's voice reads it
    Given John 4 is open in English with the Bible voice "msb-david-wifi" on a connection of type "wifi" and only John 3 timed
    When he taps "Read from the top"
    Then the reading says "David hasn't recorded John here yet: the phone voice reads it."
    And the phone's voice is handed the English of John 4:1

  Scenario: On mobile data in a chapter David has not recorded yet, the one-time notice is given with no question
    Given John 4 is open in English with the Bible voice "msb-david-wifi" on a connection of type "cellular" and only John 3 timed
    When he taps "Read from the top"
    Then the reading says "On mobile data Lampas reads in the phone voice. David plays on Wi-Fi."
    And he is not asked again
