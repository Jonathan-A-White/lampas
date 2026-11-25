@uc-tutor-aloud @greek
Feature: Hands-free asks the tutor by voice: 'ask who was Nicodemus', a follow-up with no wake word, and a way out (mw-rl10piw.8, the epic mw-rl10piw)
  'Ask' and the words after it go to the tutor as a question in the Reader's Talk, as if he had held the bar and said them: the same talk, the same record. It says 'Asking the tutor'
  at once; the answer is spoken though the Talk sheet is closed, in the voices a spoken answer uses; then the microphone stays open 8 seconds for a follow-up with no wake word and, with no
  words, a lower chime closes it and the Bible goes on if it was playing at the wake. 'Tutor' (or 'open the tutor') with no question opens the tutor on what is on screen and listens;
  the conversation goes on turn after turn; 'close the tutor' or 'done' leaves it, and any other command said in it leaves it and does that. The question carries the passage on screen
  (John 17:6-19, not only the chapter) and the open word. The wake, the recogniser, the speech and the chime are the fakes of tests/support (the chime port is a spy), the tutor is the
  fake Postern of tests/support/fake-postern.ts; the unit cases (no microphone while the answer is spoken and Stop cutting it, a confirm command, a failure) are tests/unit/hands-free-ask.test.tsx.

  Scenario: 'ask who was Nicodemus' on John 3 with the Talk sheet closed: 'Asking the tutor', then the answer spoken, and the Talk holds both
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    Then the phone says "Asking the tutor" in English
    When the phone has said it
    Then the tutor was sent "who was Nicodemus"
    And the phone then says "Nicodemus was a Pharisee and a ruler of the Jews." in English
    And the Talk sheet is closed
    When he opens the tutor's Talk sheet
    Then the Talk shows the question "who was Nicodemus" and the answer "Nicodemus was a Pharisee and a ruler of the Jews."

  Scenario: The follow-up needs no wake word, and with no words the lower chime closes it and John 3 goes on
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    And John 3 is being read aloud at verse 2
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    And the phone has said "Asking the tutor" and the answer
    And 3 seconds pass
    And he says "where else is he named" with no wake word and is quiet for 1.5 seconds
    Then the tutor was sent "where else is he named" as the next turn of the same talk
    And the phone says the answer again
    When 8 seconds pass with no words
    Then the close chime was played once
    And the reading of John 3 goes on at verse 2

  Scenario: In the follow-up 'pause' pauses and is not sent to the tutor
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    And John 3 is being read aloud at verse 2
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    And the phone has said "Asking the tutor" and the answer
    And he says "pause" with no wake word and is quiet for 1.5 seconds
    Then the tutor was sent only "who was Nicodemus"
    And the reading of John 3 stays paused

  Scenario: In the follow-up 'read John 4' opens and reads John 4
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    And the phone has said "Asking the tutor" and the answer
    And he says "read John 4" with no wake word and is quiet for 1.5 seconds
    Then the tutor was sent only "who was Nicodemus"
    And the phone says "John 4" in English
    When the phone has said it
    Then the Reader is at John 4 and John 4 is read from verse 1

  Scenario: With the passage open the question carries the range and the open word
    Given Hands-free is On and "John 17:6-19" is open as a passage on a phone that speaks English and the tutor answers "He is praying for them."
    And he has opened the first Greek word of the passage
    When he says the wake word
    And he says "ask who is he praying for" and is quiet for 1.5 seconds
    And the phone has said "Asking the tutor" and the answer
    Then the tutor was sent "who is he praying for" about "John 17:6-19" and that word

  Scenario: 'tutor' opens the tutor on the passage and listens, and the talk goes on turn after turn
    Given Hands-free is On and "John 17:6-19" is open as a passage on a phone that speaks English and the tutor answers "He is praying for them."
    When he says the wake word
    And he says "tutor" and is quiet for 1.5 seconds
    Then the Talk sheet is open on "John 17:6-19"
    When he says "who is he praying for" with no wake word and is quiet for 1.5 seconds
    And the phone has said the answer
    And he then says "and why" with no wake word and is quiet for 1.5 seconds
    And the phone has said the answer again
    And he next says "thank you" with no wake word and is quiet for 1.5 seconds
    And the phone has said the answer once more
    Then the tutor was sent these three turns in order: "who is he praying for", "and why", "thank you"
    And the microphone is open again

  Scenario: 'close the tutor' leaves it and Hands-free waits for the wake word again
    Given Hands-free is On and "John 17:6-19" is open as a passage on a phone that speaks English and the tutor answers "He is praying for them."
    When he says the wake word
    And he says "open the tutor" and is quiet for 1.5 seconds
    Then the Talk sheet is open on "John 17:6-19"
    When he says "close the tutor" with no wake word and is quiet for 1.5 seconds
    Then the Talk sheet is closed
    And Hands-free is waiting for the wake word

  Scenario: Another command said in the tutor leaves it and does that
    Given Hands-free is On and "John 17:6-19" is open as a passage on a phone that speaks English and the tutor answers "He is praying for them."
    When he says the wake word
    And he says "tutor" and is quiet for 1.5 seconds
    Then the Talk sheet is open on "John 17:6-19"
    When he says "read John 18" with no wake word and is quiet for 1.5 seconds
    Then the phone says "John 18" in English
    When the phone has said it
    Then the Reader is at John 18 and John 18 is read from verse 1
    And the tutor was sent nothing

  Scenario: While the tutor works on the answer the mic mark shows a quiet thinking sign, and it stops when the answer starts being read (mw-rl10piw.77)
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    And the tutor holds its answer
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    Then the mic mark shows the thinking sign
    And the mic mark is not the listening look
    When the phone has said "Asking the tutor"
    Then the mic mark still shows the thinking sign
    When the tutor's answer arrives
    Then the phone then says "Nicodemus was a Pharisee and a ruler of the Jews." in English
    And the mic mark shows no thinking sign

  Scenario: The thinking sign stops when the question fails (mw-rl10piw.77)
    Given Hands-free is On and "John 3" is open in English on a phone that speaks English and the tutor answers "Nicodemus was a Pharisee and a ruler of the Jews."
    And the tutor holds its answer
    When he says the wake word
    And he says "ask who was Nicodemus" and is quiet for 1.5 seconds
    Then the mic mark shows the thinking sign
    When the tutor's question fails
    Then the phone says that the tutor could not answer
    And the mic mark shows no thinking sign
