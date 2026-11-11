Feature: The Bible voice setting (mw-82lb97i.6)
  Settings > Listening has a Bible voice row above English voice: Recording (David) to start, Recording on Wi-Fi only, or Phone voice. The recording of
  David (the MSB, streamed from openbible.com) plays where Lampas has its timings; the phone's voice reads wherever it is not chosen. Recording on Wi-Fi only
  is offered only on a phone that can tell Wi-Fi from mobile data (the Network Information API's type), and the choice is taken when a chapter starts, never in
  the middle of one. The audio element, speech and the network are fakes (tests/support).

  Scenario: Bible voice stands above English voice, Recording (David) chosen, with its hint and its credit line
    Given Settings is open at the page of "Listening" on a phone whose connection type is "cellular"
    Then "Bible voice" is drawn above "English voice"
    And the "Bible voice" row shows "Recording (David)" chosen
    And the "Bible voice" row says "The MSB read by David, streamed, where Lampas has it (John so far); else the phone voice."
    When he opens the More help of the "Bible voice" row
    Then the help opens with "Recording: Majority Standard Bible, read by David, streamed from openbible.com"
    And the help names the internet and John

  Scenario: On a phone that reports its connection the row offers three choices and the Wi-Fi one is kept across a reload
    Given Settings is open at the page of "Listening" on a phone whose connection type is "cellular"
    Then the "Bible voice" row offers "Recording (David)", "Recording on Wi-Fi only" and "Phone voice"
    When he chooses "Recording on Wi-Fi only" for the "Bible voice"
    Then the setting "bibleVoice" is kept as "msb-david-wifi"
    When Settings is opened again after a reload on a phone whose connection type is "cellular"
    Then the "Bible voice" row shows "Recording on Wi-Fi only" chosen

  Scenario: On a phone that cannot tell, the row offers two choices and says so in its help
    Given Settings is open at the page of "Listening" on a phone with no connection type
    Then the "Bible voice" row offers "Recording (David)" and "Phone voice"
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
      | msb-david-wifi | cellular   | the phone's voice is handed verse 1 and the element has no src |
      | msb-david-wifi | none       | the phone's voice is handed verse 1 and the element has no src |

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
