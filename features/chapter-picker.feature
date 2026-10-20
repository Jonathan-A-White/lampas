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

  # mw-5r3p30.678: a typed place is a way into the Bible, not into the single-verse view; the layout (verse 2 at the top of the reading area) is proved at 390x844 in tests/e2e/chapter-picker.spec.ts
  Scenario: Go to a verse opens the chapter in the Reader with that verse brought to the top, not the Verse view
    Given Lampas is opened with nothing saved
    When he taps the title
    And he types "John 18:2" in Choose a book and takes the Go to row
    Then the reader is headed "John 18"
    And the picker is closed
    And the Reader shows every verse of John 18 and no Verse view is open
    And the address names chapter 18 of "jhn" and no verse
    And verse 2 of the chapter was brought to the top of the reading area

  Scenario: Go to a chapter alone opens it at the top
    Given Lampas is opened with nothing saved
    When he taps the title
    And he types "John 18" in Choose a book and takes the Go to row
    Then the reader is headed "John 18"
    And the Reader shows every verse of John 18 and no Verse view is open
    And no verse was brought to the top of the reading area

  Scenario: A chapter that cannot be fetched says so and gives a way back
    Given Lampas is opened with nothing saved
    And the phone is offline
    When he opens "Jude" chapter 1 from the picker
    Then the reader says "Jude 1" is not on this phone yet and he is offline
    And a button "Choose another chapter" is shown
    When the phone is back online and he taps "Try again"
    Then the reader is headed "Jude 1"
    And verses are listed

  Scenario: An Old Testament chapter offers a choice before it leaves the app
    Given Lampas is opened with Logos on and the Audio Bible on
    When he taps the title
    And he chooses the book "Judges"
    And he taps chapter 3
    Then no app was opened
    And the choice for "Judges 3" offers "Read in Logos" and "Listen in Audible"
    And the choice says "In Audible: Chapters > Judges 3"
    And "Read in Logos" is the chapter's Logos link
    And "Listen in Audible" is Audible's link at the start of Judges 3
    And the reader is headed "Romans 8"

  Scenario: A second chapter moves the choice
    Given Lampas is opened with Logos on and the Audio Bible on
    When he taps the title
    And he chooses the book "Leviticus"
    And he taps chapter 10
    Then the choice for "Leviticus 10" offers "Read in Logos" and "Listen in Audible"
    When he then taps chapter 11
    Then the choice has moved to "Leviticus 11" offering "Read in Logos" and "Listen in Audible"
    And there is one choice on screen

  Scenario: Read in Logos arms the fallback like the chapter link did
    Given Lampas is opened with Logos on and the Audio Bible on
    When he taps the title
    And he chooses the book "Judges"
    And he taps chapter 3
    And he taps "Read in Logos"
    And the page stays in front for the wait
    Then the address "https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Jdg3" was opened

  Scenario: With only Logos on the choice is the one row
    Given Lampas is opened with Logos on and the Audio Bible off
    When he taps the title
    And he chooses the book "Judges"
    And he taps chapter 3
    Then the choice for "Judges 3" offers only "Read in Logos"

  Scenario: With only the Audio Bible on the choice is the one row and Logos can be turned on
    Given Lampas is opened with Logos off and the Audio Bible on
    When he taps the title
    And he chooses the book "Judges"
    And he taps chapter 3
    Then the choice for "Judges 3" offers only "Listen in Audible"
    And the picker says "Logos is off"
    When he taps "Turn on Logos"
    Then the choice for "Judges 3" offers "Read in Logos" and "Listen in Audible"

  Scenario: With both off the picker says Logos is off and names Audio Bible in Settings
    Given Lampas is opened with Logos off and the Audio Bible off
    When he taps the title
    And he chooses the book "Judges"
    Then the picker says "Logos is off"
    And the picker names "Audio Bible"
    And no chapter is offered
