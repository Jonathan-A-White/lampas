@uc-tutor-ask @greek
Feature: Ask the tutor about a verse
  The Verse view's Ask the tutor action is the shared composer (features/ask-composer.feature). He types a question (or holds Hold to ask and says it); the question goes to the Talk
  sheet's one tutor (the bible-talk grind, mw-5r3p30.842), the sheet opens over the Verse view on that verse and the answer shows in it. The Ask box has no cards of its own: the wait, the
  failures with Retry and the answer are the Talk sheet's (features/bible-talk.feature). These scenarios run against a fake Postern whose mill opens the grist and answers it; the live
  backend is tried by `npm run e2e:live`.

  Scenario: Asking about 8:28 sends a bible-talk grist whose input carries the verse's Greek, English and the question
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the mill received one grist for the lampas app, kind bible-talk
    And its input carries the Greek and the English of verse 28
    And its input carries the question "What does συνεργεῖ mean here?"

  Scenario: The answer arrives and shows in the Talk sheet the question opened
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the Talk sheet about Romans 8:28 opens and the answer shows in it under his question
    And the answer names the Greek word "συνεργεῖ" with its lemma "συνεργέω"
    And the Ask box is ready for the next question

  Scenario: While the tutor has not answered the Talk sheet says Waiting
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds its answers
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the Talk sheet says Waiting and nothing can be sent until the answer comes
    When the tutor answers
    Then the Talk sheet about Romans 8:28 opens and the answer shows in it under his question

  Scenario: An unlicensed reply shows No licence in the Talk sheet
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds no licence for this phone
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the Talk sheet says "No licence"
    And the Talk sheet shows no answer

  Scenario: A backend that cannot be reached shows Could not reach with Retry in the Talk sheet
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that cannot be reached
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the Talk sheet says "Could not reach the tutor" with a Retry button
    When the backend comes back and he taps Retry
    Then the Talk sheet about Romans 8:28 opens and the answer shows in it under his question

  Scenario: Send is not offered with nothing typed
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern
    When he selects verse 28 and taps Type a question
    Then there is no Send button
    When he types "   "
    Then there is still no Send button
    When he types "Why?" instead
    Then the Send button is on

  Scenario: An answer in the wrong shape is not kept
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers in the wrong shape
    And he selects verse 28
    When he asks "What does συνεργεῖ mean here?"
    Then the Talk sheet says "Could not reach the tutor" with a Retry button
    And the Talk sheet shows no answer

  Scenario: The tutor's instructions ask it to teach a new word in his terms
    Given the bible-talk grind's instructions
    Then they describe the learner field
    And they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter
    And they say to leave out what he already knows and to keep the answer short for a phone

  Scenario: A verse the tutor names in its answer is a link whose card opens that verse in its chapter
    Given Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers with "Melchizedek is in Hebrews 7:2, where he is called king of righteousness."
    And he selects verse 28
    When he asks "Who is Melchizedek?"
    And he taps the link "Hebrews 7:2" in the answer
    And he taps Open on the reference card
    Then the Reader shows Hebrews 7 with verse 2 brought to the top and no Verse view
