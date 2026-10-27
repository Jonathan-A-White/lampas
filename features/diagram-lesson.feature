Feature: How to read a sentence diagram, an optional lesson
  An optional screen at #/diagram-lesson (mw-q6t5tvn.1, src/diagram/DiagramLesson.tsx) teaches the Reed-Kellogg lines in ten steps, one convention each: the base line and the
  bar, a word that describes another, a direct object, an understood subject, a word that says what the subject is, an indirect object, a prepositional phrase, two clauses
  joined, the same lines with Greek in them, and which line is which in Greek. Each step is a real verse (or part of one) drawn by the same ReedKellogg as the Verse view's Diagram, with one or two
  sentences above it and a check below: "Tap the <role>". A right tap says so; a wrong tap shows the right word lit. Back and Next walk the steps and the last step's Done leaves
  the lesson for where he came from and keeps it done on the phone (localStorage). Leaving early keeps the step he reached. Nothing in the Goal screen, the ladder, Review or
  Today names the lesson.

  Scenario: The lesson opens at step 1
    Given the lesson is opened on a phone that has never seen it
    Then the screen is titled "How to read a sentence diagram" and says "Step 1 of 10"
    And step 1 shows its sentences above the diagram of "John 11:35" and the check "Tap the subject"
    And the diagram scrolls sideways and its words are buttons
    And Back is not offered and Next is

  Scenario: A right tap is told so and a wrong tap shows the right word lit
    Given the lesson is opened on a phone that has never seen it
    When he taps the wrong word "wept"
    Then he is told "Not quite" and the word "Jesus" is lit
    When he taps the right word "Jesus"
    Then he is then told "Right" and the word "Jesus" is lit

  Scenario: Next through the ten steps to Done, which is kept
    Given the lesson is opened from a Reader on Colossians 3:1
    When he goes through every step, tapping the right word of each, to the last
    Then the last step is "Step 10 of 10" and Next reads "Done"
    And step 10 draws Colossians 3:1 with Greek words in it
    When he taps "Done"
    Then he is back on the Reader at Colossians 3:1
    And diagram-lesson is kept done on the phone

  Scenario: Step 10 names each line by its Greek term and each term opens its lesson
    Given the lesson is opened at step 10
    Then step 10 lists the terms nominative, accusative, dative, genitive, article, adjective, verb, adverb, preposition, participle and infinitive as buttons
    When he taps the term "dative"
    Then the idea sheet "The dative case" is open
    When he closes the idea sheet
    Then the screen says "Step 10 of 10"
    And the step reached is kept as step 10

  Scenario: Back goes a step back
    Given the lesson is opened on a phone that has never seen it
    When he taps "Next" 2 times
    And he taps "Back"
    Then the screen says "Step 2 of 10"

  Scenario: Leaving at step 3 keeps step 3
    Given the lesson is opened on a phone that has never seen it
    When he taps "Next" 2 times
    And he leaves the lesson
    And he opens the lesson again
    Then the screen says "Step 3 of 10"
    And diagram-lesson is not kept done

  Scenario: Nothing else names the lesson
    Given Lampas is opened on the Goal screen
    Then the Goal screen does not name the lesson
    When he opens Today
    Then Today does not name the lesson
