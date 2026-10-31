@uc-read-aloud @greek
Feature: How far Lampas reads aloud
  Settings has Play to: End of the book (the default) or End of the Bible. The header's Play always goes on from the verse he is at to
  there, and the Reader turns to each next chapter just as the voice reaches its first verse (into the next book too for End of the
  Bible). A shorter reading comes from what he tapped, not from the setting: the play button on a verse reads that verse only, as it
  always did. Whatever the setting, the verse being read is highlighted and kept in view as before, and Stop stops at once. A span
  saved before (Verse, Passage, Chapter) reads as End of the book.

  Scenario: Play to is End of the book until he chooses End of the Bible, and the choice survives a close
    Given Lampas is opened on a phone with an English and a Greek voice
    When he opens Settings
    Then Play to shows End of the book chosen
    And Play to offers End of the book and End of the Bible
    When he chooses End of the Bible for Play to
    And he closes Lampas and opens it again
    And he opens Settings
    Then Play to shows End of the Bible chosen

  Scenario: A span saved before reads as End of the book
    Given Lampas is opened on a phone with an English and a Greek voice
    And Chapter was saved as the span by an earlier Lampas
    When he opens Settings
    Then Play to shows End of the book chosen

  Scenario: End of the book reads on past the chapter's end into the next chapter and the Reader turns to it
    Given Lampas is opened on a phone with an English and a Greek voice
    When he selects verse 39 and taps Read from here
    Then the phone speaks the English of verse 39
    And the Reader still shows Romans 8
    When the phone finishes speaking verse 39
    Then the Reader shows Romans 9
    And the phone speaks the English of Romans 9 verse 1
    And the reading bar says "Reading verse 1"
    And verse 1 is highlighted as being read
    And the open chapter is Romans 9

  Scenario: End of the book keeps going through the next chapter
    Given Lampas is opened on a phone with an English and a Greek voice
    When he selects verse 39 and taps Read from here
    And the phone finishes speaking verse 39
    And the phone finishes speaking verse 1
    Then the phone speaks the English of Romans 9 verse 2
    And verse 2 is highlighted as being read

  Scenario: End of the book stops at the end of Revelation 22
    Given Lampas is opened on a phone with an English and a Greek voice
    And the Reader is open on Revelation 22
    When he selects verse 20 and taps Read from here
    And the phone finishes the reading
    Then verses 20 and 21 were read
    And the reading bar is gone
    And the Reader still shows Revelation 22

  Scenario: End of the book stops at the end of 2 John and does not go into 3 John
    Given Lampas is opened on a phone with an English and a Greek voice
    And the Reader is open on 2 John 1
    When he selects verse 12 and taps Read from here
    And the phone finishes the reading
    Then verses 12 and 13 were read
    And the reading bar is gone
    And the Reader still shows 2 John 1

  Scenario: End of the Bible goes on from the end of 2 John into 3 John and the Reader turns to it
    Given Lampas is opened on a phone with an English and a Greek voice
    And Play to is End of the Bible
    And the Reader is open on 2 John 1
    When he selects verse 13 and taps Read from here
    And the phone finishes speaking verse 13
    Then the Reader shows 3 John 1
    And the phone speaks the English of 3 John 1 verse 1
    And the open chapter is 3 John 1

  Scenario Outline: Stop stops at once whatever Play to is
    Given Lampas is opened on a phone with an English and a Greek voice
    And Play to is <span>
    When he selects verse 5 and taps Read from here
    And he taps Stop
    Then the phone is told to stop
    And the reading bar is gone
    And nothing more is spoken

    Examples:
      | span              |
      | End of the book   |
      | End of the Bible  |

  Scenario: Stop while the reading is crossing into the next chapter stops it there
    Given Lampas is opened on a phone with an English and a Greek voice
    When he selects verse 39 and taps Read from here
    And the phone finishes speaking verse 39
    And he taps Stop
    Then nothing more is spoken
    And the reading bar is gone
    And the Reader does not start Romans 9

  Scenario Outline: The play button on a verse reads that verse only, whatever Play to is
    Given Lampas is opened on a phone with an English and a Greek voice
    And Play to is <span>
    When he taps the play button of verse 5
    And the phone finishes speaking verse 5
    Then nothing more is spoken

    Examples:
      | span              |
      | End of the book   |
      | End of the Bible  |
