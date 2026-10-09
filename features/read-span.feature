Feature: How far Lampas reads aloud
  Settings has Read aloud span: Verse, Passage, Chapter or Book (default Chapter). It says how far the header's
  Read from the top / Read from here goes before the voice stops. Verse reads only the verse started from. Passage reads
  to the next section heading (the h2 the Reader shows, such as "Heirs with Christ"). Chapter reads to the chapter's end.
  Book reads on from chapter to chapter to the end of the book (Revelation 22 for Revelation), and the Reader turns to each
  chapter just as the voice reaches its first verse. Whatever the span, the verse being read is highlighted and kept in view as
  before, and Stop stops at once. The play button on a verse (Hear the verse) reads that verse only, as it always did.

  Scenario: The span is Chapter until he chooses another, and the choice survives a close
    Given Lampas is opened on a phone with an English and a Greek voice
    When he opens Settings
    Then Read aloud span shows Chapter chosen
    And Read aloud span offers Verse, Passage, Chapter and Book
    When he chooses Passage for Read aloud span
    And he closes Lampas and opens it again
    And he opens Settings
    Then Read aloud span shows Passage chosen

  Scenario: Verse reads only the verse started from
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Verse
    When he selects verse 5 and taps Read from here
    Then the phone speaks the English of verse 5
    When the phone finishes speaking verse 5
    Then nothing more is spoken
    And the reading bar is gone

  Scenario: Passage reads from the verse to the next section heading
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Passage
    When he selects verse 9 and taps Read from here
    And the phone finishes the reading
    Then verses 9, 10 and 11 were read
    And nothing more is spoken
    And the reading bar is gone
    And the Reader still shows Romans 8

  Scenario: Chapter reads to the chapter's end and stops there
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Chapter
    When he selects verse 37 and taps Read from here
    And the phone finishes the reading
    Then verses 37, 38 and 39 were read
    And the reading bar is gone
    And the Reader still shows Romans 8

  Scenario: Book reads on past the chapter's end into the next chapter and the Reader turns to it
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Book
    When he selects verse 39 and taps Read from here
    Then the phone speaks the English of verse 39
    And the Reader still shows Romans 8
    When the phone finishes speaking verse 39
    Then the Reader shows Romans 9
    And the phone speaks the English of Romans 9 verse 1
    And the reading bar says "Reading verse 1"
    And verse 1 is highlighted as being read
    And the open chapter is Romans 9

  Scenario: Book keeps going through the next chapter
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Book
    When he selects verse 39 and taps Read from here
    And the phone finishes speaking verse 39
    And the phone finishes speaking verse 1
    Then the phone speaks the English of Romans 9 verse 2
    And verse 2 is highlighted as being read

  Scenario: Book stops at the end of Revelation 22
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Book
    And the Reader is open on Revelation 22
    When he selects verse 20 and taps Read from here
    And the phone finishes the reading
    Then verses 20 and 21 were read
    And the reading bar is gone
    And the Reader still shows Revelation 22

  Scenario Outline: Stop stops at once in every span
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is <span>
    When he selects verse 5 and taps Read from here
    And he taps Stop
    Then the phone is told to stop
    And the reading bar is gone
    And nothing more is spoken

    Examples:
      | span    |
      | Verse   |
      | Passage |
      | Chapter |
      | Book    |

  Scenario: Stop while the reading is crossing into the next chapter stops it there
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Book
    When he selects verse 39 and taps Read from here
    And the phone finishes speaking verse 39
    And he taps Stop
    Then nothing more is spoken
    And the reading bar is gone
    And the Reader does not start Romans 9

  Scenario: The play button on a verse reads that verse only, whatever the span
    Given Lampas is opened on a phone with an English and a Greek voice
    And Read aloud span is Book
    When he taps the play button of verse 5
    And the phone finishes speaking verse 5
    Then nothing more is spoken
