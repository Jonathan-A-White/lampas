Feature: Ask the tutor about a verse
  The Verse view's Ask the tutor action holds an Ask box. He types a question (or holds Hold to ask and says it); Lampas sends a grist through Postern
  (bsv-kit/grist) with the verse's Greek and English, his question and his solid words, and shows the
  tutor's answer under the verse. The answers are kept on the phone. These scenarios run against a fake
  Postern whose mill opens the grist and answers it; the live backend is tried by `npm run e2e:live`.

  Scenario: Asking about 8:28 sends a grist whose input carries the verse's Greek, English, the question and the solid words
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the mill received one grist for the lampas app, kind verse-ask
    And its input carries the Greek and the English of verse 28
    And its input carries the question "What does συνεργεῖ mean here?"
    And its input carries his solid words, and not the words he is still learning

  Scenario: The answer arrives and shows under the verse
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the answer shows under verse 28
    And the answer names the Greek word "συνεργεῖ" with its lemma "συνεργέω"
    And the Ask box is ready for the next question

  Scenario: What he asked is shown above the answer cleaned up, and the raw words stay kept
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern whose answers clean up his question
    And he selects verse 28
    When he asks "um why are there uh italic words what does it mean for the words to be italic"
    Then the answer card shows the question "Why are there italic words? What does it mean for the words to be italic?"
    And the answer kept on the phone has his raw words "um why are there uh italic words what does it mean for the words to be italic"

  Scenario: An answer with no cleaned question shows his raw words above it
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "um why are there uh italic words"
    Then the answer card shows the question "um why are there uh italic words"

  Scenario: Copy on an answer card puts the exchange on the clipboard as Markdown
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern whose answers clean up his question
    And he selects verse 28
    When he asks "um why are there uh italic words what does it mean for the words to be italic"
    And he taps Copy on the first answer card
    Then the clipboard holds the Markdown of "Romans 8:28" asking "Why are there italic words? What does it mean for the words to be italic?" answered by the tutor
    And the first answer card says "Copied"

  Scenario: With several answers on the screen each Copy copies only its own
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    And the tutor will answer "It means works together."
    And he then asks "Who is doing the working?"
    And he taps Copy on the second answer card
    Then the clipboard holds the Markdown of "Romans 8:28" asking "Who is doing the working?" answered "It means works together."
    And the first answer card does not say "Copied"
    When he taps Copy on the first answer card again
    Then the clipboard then holds the Markdown of "Romans 8:28" asking "What does συνεργεῖ mean here?" answered by the tutor
    And the first answer card says "Copied"

  Scenario: While the tutor has not answered the box says Sending and then Waiting
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds its answers
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the box says Waiting and nothing can be asked until the answer comes
    When the tutor answers
    Then the answer shows under verse 28

  Scenario: An unlicensed reply shows No licence
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds no licence for this phone
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the box says "No licence"
    And no answer shows under verse 28

  Scenario: A backend that cannot be reached shows Could not reach with Retry
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that cannot be reached
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the box says "Could not reach the tutor" with a Retry button
    When the backend comes back and he taps Retry
    Then the answer shows under verse 28

  Scenario: An answer is still there after reload
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    And he asks "What does συνεργεῖ mean here?"
    And the answer for verse 28 has arrived
    When he reopens Lampas and selects verse 28
    Then the answer shows under verse 28
    And the fake Postern was not asked again

  Scenario: Ask cannot be tapped with nothing typed
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he selects verse 28
    Then the Ask button is off
    When he types "   "
    Then the Ask button is still off
    When he types "Why?" instead
    Then the Ask button is on

  Scenario: An answer in the wrong shape is not kept
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers in the wrong shape
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the box says "Could not reach the tutor" with a Retry button
    And no answer shows under verse 28

  Scenario: Asking about a new word sends the learner summary
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he is learning the word "σάρξ" which he added today
    And he selects verse 28
    When he asks "What does πρόθεσιν mean here?"
    Then the mill received one grist for the lampas app, kind verse-ask
    And its input carries a learner summary that names his solid words as a count, "σάρξ" among the words he is learning and as new today, and what is due now

  Scenario: The tutor's instructions ask it to teach a new word in his terms
    Given the verse-ask grind's instructions
    Then they describe the learner field
    And they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter
    And they say to leave out what he already knows and to keep the answer short for a phone

  Scenario: Asking about a verse sends learner_grammar, and the instructions say to teach at his level
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does πρόθεσιν mean here?"
    Then the mill received one grist for the lampas app, kind verse-ask
    And its input carries learner_grammar with no goal and the BMA Tutor approach
    And the verse-ask instructions pitch frontier and not-yet ideas and do not offer the move
