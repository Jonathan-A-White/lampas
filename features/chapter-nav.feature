Feature: Next and previous chapter at the foot of a chapter
  After the last verse the Reader offers two buttons: the next chapter ('1 John 2 ›') and the previous
  one ('‹ 1 John 1'), across books (Romans 16 goes on to 1 Corinthians 1). Matthew 1 has no previous
  button and Revelation 22 no next. A tap opens the chapter from the top as a new Back step, and it is
  remembered like any open chapter. A chapter that cannot be fetched says so as the picker's does.

  Scenario: The foot of 1 John 1 offers the next chapter, which opens from the top and is remembered
    Given Lampas is opened on "1 John" chapter 1
    Then the foot of the chapter has a button "1 John 2 ›"
    And the foot also has a button "‹ 2 Peter 3"
    When he taps "1 John 2 ›"
    Then the reader is headed "1 John 2"
    And verses are listed
    When the app is closed and opened again with no address
    Then the reader reopens headed "1 John 2"

  Scenario: The foot of 1 John 2 goes back to 1 John 1
    Given Lampas is opened on "1 John" chapter 2
    When he taps "‹ 1 John 1"
    Then the reader is headed "1 John 1"
    And verses are listed

  Scenario: The foot of Romans 16 offers 1 Corinthians 1
    Given Lampas is opened on "Romans" chapter 16
    Then the foot of the chapter has a button "1 Corinthians 1 ›"
    And the foot also has a button "‹ Romans 15"
    When he taps "1 Corinthians 1 ›"
    Then the reader is headed "1 Corinthians 1"

  Scenario: Matthew 1 has no previous button
    Given Lampas is opened on "Matthew" chapter 1
    Then the foot of the chapter has a button "Matthew 2 ›"
    And the foot of the chapter has no previous button

  Scenario: Revelation 22 has no next button
    Given Lampas is opened on "Revelation" chapter 22
    Then the foot of the chapter has a button "‹ Revelation 21"
    And the foot of the chapter has no next button

  Scenario: Offline, a chapter not on the phone says so
    Given Lampas is opened on "Jude" chapter 1
    And the phone is offline
    When he taps "Revelation 1 ›"
    Then the reader says "Revelation 1" is not on this phone yet and he is offline
    And a button "Choose another chapter" is shown
