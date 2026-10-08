Feature: Open any chapter of the New Testament
  The Reader opens Romans 8 on a fresh install. Tapping the title opens a picker: the 27 books in
  canonical order, then a grid of the chapters of the book he chose (the counts are in
  public/data/index.json). A tap on a chapter opens it, at the top. The open chapter is remembered
  across a close; the word sheets, Ask and Talk, Quick test and the Parsing drill follow it. A
  chapter that cannot be fetched says so plainly and gives a way back.

  Scenario: A fresh install opens Romans 8
    Given Lampas is opened with nothing saved
    Then the reader is headed "Romans 8"

  Scenario: The title opens a picker of the 27 books, then the chapters of the book he chooses
    Given Lampas is opened with nothing saved
    When he taps the title
    Then the picker lists the 27 books from "Matthew" to "Revelation" in order
    When he chooses the book "1 John"
    Then the picker lists chapters 1 to 5

  Scenario: Choosing 1 John 1 opens it with its Greek, English, word sheet and Talk
    Given Lampas is opened with nothing saved
    When he opens "1 John" chapter 1 from the picker
    Then the reader is headed "1 John 1"
    And the picker is closed
    And verse 1 reads as the English of 1 John 1 verse 1
    And the address names book "1jn" and chapter 1
    When he taps the first English word of verse 1
    Then the word sheet shows the Greek of that word in 1 John 1
    When he closes the word sheet
    And he opens the Talk sheet
    Then the Talk sheet is headed "Talk about 1 John 1"

  Scenario: Back closes the picker and stays on the chapter
    Given Lampas is opened with nothing saved
    When he taps the title
    And he goes back
    Then the picker is closed
    And the reader is headed "Romans 8"

  Scenario: The open chapter is remembered when the app is reopened
    Given Lampas is opened with nothing saved
    And he opens "1 John" chapter 1 from the picker
    When the app is closed and opened again with no address
    Then the reader is headed "1 John 1"

  Scenario: The chapter is remembered even when the app opens on another screen's address
    Given Lampas is opened with nothing saved
    And he opens "1 John" chapter 1 from the picker
    When he goes to the Test screen
    Then the Test screen offers the "Parsing drill: 1 John 1"

  Scenario: A chapter that cannot be fetched says so and gives a way back
    Given Lampas is opened with nothing saved
    And the phone is offline
    When he opens "Jude" chapter 1 from the picker
    Then the reader says "Jude 1" is not on this phone yet and he is offline
    And a button "Choose another chapter" is shown
    When the phone is back online and he taps "Try again"
    Then the reader is headed "Jude 1"
    And verses are listed
