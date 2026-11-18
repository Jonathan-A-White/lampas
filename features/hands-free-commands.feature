@uc-read-aloud @greek
Feature: Hands-free reads a passage, stops, and turns chapters: 'read John 3', 'stop', 'next chapter', 'previous chapter' (mw-rl10piw.7, the epic mw-rl10piw)
  The rest of the first set of spoken commands after 'play' and 'pause' (features/hands-free-loop.feature). 'read', 'open' and 'go to' a place open the Reader there, say
  the place's name ('John 3', or 'John 3, verse 16') and read from that verse (PROVISIONAL: open AND read, the Governor to confirm); 'next chapter' and 'previous chapter' read the
  chapter on from its first verse; 'stop' ends the reading and nothing goes on at the close. Words that are no place are answered 'I could not find' and the words, and what
  was playing goes on. The sound that was there is not read a second time. How the words become a place is tests/unit/hands-free-passage.test.ts; 'back a verse', in both voices,
  is tests/unit/hands-free-commands.test.tsx. The recogniser is tests/support/fake-recognizer.ts, the speech the honest fake of tests/support/fake-speech.ts.

  Scenario: 'read John 3' while John 1 is read: the place is said, then John 3 is read from verse 1, and 'next chapter' and 'previous chapter' turn from it
    Given Hands-free is On and "John 1" is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "read John 3" and is quiet for 1.5 seconds
    Then the phone says "John 3" in English
    When the phone has said it
    Then the Reader is at John 3 and John 3 is read from verse 1
    And nothing of John 1 is read again
    When he says the wake word again
    And he then says "next chapter" and is quiet for 1.5 seconds
    Then the Reader goes on to John 4 and reads it from verse 1
    And still nothing of John 1 is read again
    When he says the wake word once more
    And he next says "previous chapter" and is quiet for 1.5 seconds
    Then the Reader turns back to John 3 and reads it from verse 1
    And again nothing of John 1 is read again

  Scenario: 'go to John 3 16' says the verse too and reads from it
    Given Hands-free is On and "John 1" is open in English on a phone that speaks English
    When he says the wake word
    And he says "go to John 3 16" and is quiet for 1.5 seconds
    Then the phone says "John 3, verse 16" in English
    When the phone has said it
    Then the Reader is at John 3 and John 3 is read from verse 16

  Scenario: 'stop' ends the reading and nothing starts again
    Given Hands-free is On and "John 1" is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "stop" and is quiet for 1.5 seconds
    And 10 seconds pass
    Then nothing is being read and nothing is spoken

  Scenario: Words that are no place: it says so and the reading goes on
    Given Hands-free is On and "John 1" is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "read the weather" and is quiet for 1.5 seconds
    Then the phone says "I could not find the weather" in English
    When the phone has said it
    Then the reading of John 1 goes on at verse 2

  Scenario: At the end of the Bible 'next chapter' says there is none
    Given Hands-free is On and "Revelation 22" is open in English on a phone that speaks English
    When he says the wake word
    And he says "next chapter" and is quiet for 1.5 seconds
    Then the phone says "There is no next chapter" in English
    And the Reader is still at Revelation 22

  Scenario: Before Genesis 1 there is no chapter before it
    Given Hands-free is On and "Genesis 1" is open in English on a phone that speaks English
    When he says the wake word
    And he says "previous chapter" and is quiet for 1.5 seconds
    Then the phone says "There is no chapter before this" in English
    And the Reader is still at Genesis 1

  Scenario: Bible voice is Recording (David): 'read John 17' from Mark plays David's recording, and 'next chapter' and 'previous chapter' keep it
    Given Hands-free is On and "Mark 1" is open in English with Bible voice set to Recording and David's timings of John 17 and 18
    When he says the wake word
    And he says "read John 17" and is quiet for 1.5 seconds
    Then the phone says "John 17" in English
    When the phone has said it
    Then the Reader is at John 17 and David's recording of John 17 plays from its beginning
    And verse 1 is marked as being read
    And the phone's voice reads nothing of John 17
    When he says the wake word again
    And he then says "next chapter" and is quiet for 1.5 seconds
    Then the Reader goes on to John 18 and David's recording of John 18 plays from its beginning
    When he says the wake word once more
    And he next says "previous chapter" and is quiet for 1.5 seconds
    Then the Reader turns back to John 17 and David's recording of John 17 plays from its beginning

  Scenario: Bible voice is Recording (David): 'read John 17 verse 5' plays David from verse 5, and 'back a verse' keeps David
    Given Hands-free is On and "Mark 1" is open in English with Bible voice set to Recording and David's timings of John 17 and 18
    When he says the wake word
    And he says "read John 17 verse 5" and is quiet for 1.5 seconds
    Then the phone says "John 17, verse 5" in English
    When the phone has said it
    Then the Reader is at John 17 and David's recording of John 17 plays from verse 5
    When he says the wake word again
    And he then says "back a verse" and is quiet for 1.5 seconds
    Then David's recording of John 17 plays from verse 4

  Scenario: Bible voice is Recording (David): a book David has not recorded, 'read Mark 1', is read in the phone's voice
    Given Hands-free is On and "John 3" is open in English with Bible voice set to Recording and David's timings of John 17 and 18
    When he says the wake word
    And he says "read Mark 1" and is quiet for 1.5 seconds
    Then the phone says "Mark 1" in English
    When the phone has said it
    Then the Reader is at Mark 1 and Mark 1 is read from verse 1 in the phone's voice
