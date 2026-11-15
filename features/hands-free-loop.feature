@uc-read-aloud @greek
Feature: Hands-free listens: 'Hey Lampas', a chime, his words to the end of his pause; play and pause (mw-rl10piw.6, the epic mw-rl10piw)
  With Hands-free On (features/hands-free.feature) Lampas listens for 'Hey Lampas' (voice-kit/wake, the kit's fake wake here: the test says the wake word).
  At the wake whatever is sounding is paused, then the microphone opens for his command with a short soft chime, and a silence of 1.5 s after his
  words ends the command (src/handsFree/session.ts, on the kit's session). 'play' (or resume, continue, go on) goes on with what is paused, or reads
  the chapter on screen from where he is through the Reader's own start; 'pause' pauses and it stays paused. Words it does not know are answered
  'Sorry, I did not get that' and what was playing goes on; no words for 6 s close it and what was playing goes on (src/handsFree/playback.ts).
  A hold-to-talk with Hands-free On hears what it hears with it Off: the wake listening steps aside for it and comes back after (src/handsFree/micBusy.ts).
  The recogniser is tests/support/fake-recognizer.ts, the speech the honest fake of tests/support/fake-speech.ts; the session's own waits run on a
  clock the test moves. How it works on the built app is tests/e2e/hands-free-loop.spec.ts.

  Scenario: The wake, 'play' and a pause read the chapter on screen
    Given Hands-free is On and John 1 is open in English on a phone that speaks English
    And the wake word is being listened for
    When he says the wake word
    Then the Hands-free mark shows "listening"
    When he says "play" and is quiet for 1.5 seconds
    Then the phone reads verse 1 of John 1 in English

  Scenario: 'pause' pauses the reading and it stays paused; 'play' goes on from the same verse
    Given Hands-free is On and John 1 is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    Then the reading is paused at verse 2
    When he says "pause" and is quiet for 1.5 seconds
    And 10 seconds pass
    Then the reading is still paused at verse 2
    When he says the wake word again
    And he then says "play" and is quiet for 1.5 seconds
    Then the reading goes on at verse 2

  Scenario: Words it does not know: it says so and the reading goes on
    Given Hands-free is On and John 1 is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "banana" and is quiet for 1.5 seconds
    Then the phone says "Sorry, I did not get that" in English
    When the phone has said it
    Then the reading goes on at verse 2

  Scenario: No words after the chime: it closes after 6 seconds and the reading goes on
    Given Hands-free is On and John 1 is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And 6 seconds pass with no words
    Then the reading goes on at verse 2

  Scenario: With Hands-free Off a wake word is heard by nothing
    Given Hands-free is Off and John 1 is open in English on a phone that speaks English
    When he says the wake word
    Then nothing heard the wake word and no wake is listening
    And no recogniser was started
    And nothing is being read

  Scenario: A Talk hold with Hands-free On hears his words as with it Off, and the wake listens again after
    Given Hands-free is On and John 1 is open in English on a phone that speaks English
    And the wake word is being listened for
    When he holds the Talk bar and says "who is the Word"
    Then the wake word is not being listened for
    When he lets go of the Talk bar
    Then the Talk bar delivers "who is the Word"
    And the wake word is being listened for again
