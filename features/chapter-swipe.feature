Feature: Swipe the Reader to the next or previous chapter
  In the Reader a horizontal swipe on the text goes to the next chapter (swipe left) or the previous one
  (swipe right), across books, from the top, as a new Back step. At Matthew 1 and Revelation 22 a short
  note says there is no more. A vertical drag scrolls, a swipe that starts at a screen edge is Android's
  Back gesture, and a tap or a long press on a word is not a swipe.

  Scenario: A left swipe on Romans 8 opens Romans 9 and Back returns
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 300,400 to 150,410 over 150 ms
    Then the reader is headed "Romans 9"
    When he presses Back
    Then the reader is back at "Romans 8"

  Scenario: A right swipe on Romans 8 opens Romans 7
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 150,400 to 300,390 over 150 ms
    Then the reader is headed "Romans 7"

  Scenario: A left swipe on Romans 16 opens 1 Corinthians 1
    Given Lampas is opened on "Romans" chapter 16
    When he drags from 300,400 to 150,400 over 150 ms
    Then the reader is headed "1 Corinthians 1"

  Scenario: A right swipe on Romans 1 opens Acts 28
    Given Lampas is opened on "Romans" chapter 1
    When he drags from 150,400 to 300,400 over 150 ms
    Then the reader is headed "Acts 28"

  Scenario: A right swipe on Matthew 1 says it is the first chapter
    Given Lampas is opened on "Matthew" chapter 1
    When he drags from 150,400 to 300,400 over 150 ms
    Then the note says "This is the first chapter. Before it: the Preface"
    And the note has a link "the Preface"
    And the reader is headed "Matthew 1"

  Scenario: A left swipe on Revelation 22 says he has reached the end
    Given Lampas is opened on "Revelation" chapter 22
    When he drags from 300,400 to 150,400 over 150 ms
    Then the note says "You have reached the end of Revelation. Well done."
    And the reader is headed "Revelation 22"

  Scenario: A mostly vertical drag does not change chapter
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 250,500 to 190,200 over 150 ms
    Then the reader is headed "Romans 8"
    And there is no note

  Scenario: A short drag does not change chapter
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 250,400 to 210,400 over 150 ms
    Then the reader is headed "Romans 8"

  Scenario: A swipe that starts at the left edge does nothing
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 10,400 to 200,400 over 150 ms
    Then the reader is headed "Romans 8"

  Scenario: A swipe that starts at the right edge does nothing
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 1015,400 to 800,400 over 150 ms
    Then the reader is headed "Romans 8"

  Scenario: A slow drag does not change chapter
    Given Lampas is opened on "Romans" chapter 8
    When he drags from 300,400 to 150,400 over 800 ms
    Then the reader is headed "Romans 8"

  Scenario: A swipe over an open sheet does not change chapter
    Given Lampas is opened on "Romans" chapter 8
    And a word sheet is open
    When he drags from 300,400 to 150,400 over 150 ms
    Then the reader is headed "Romans 8"
