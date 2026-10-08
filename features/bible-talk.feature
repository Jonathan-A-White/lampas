Feature: Bible talk
  A Talk button at the bottom of the reader opens a sheet for a conversation about the chapter, or about the
  selected verse, with the bible-talk grind (grinds/bible-talk.json). He types; Lampas sends a grist through
  Postern (bsv-kit/grist) with the Greek and English, his question, his solid words and the last turns of the
  conversation, and shows the answer in the sheet and reads it aloud. The turns are kept on the phone, per
  chapter and per verse. These scenarios run against a fake Postern whose mill opens the grist and answers it;
  the live backend is tried by `npm run e2e:live`.

  Scenario: A question about 8:28 sends a bible-talk grist with the verse's Greek and English, the question, the solid words and the earlier turns
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he selects verse 28
    And he opens Talk
    Then the sheet is titled "Talk about Romans 8:28"
    When he sends "Why does Paul say all things?"
    And the answer number 1 has arrived
    And he sends "What does συνεργεῖ mean here?"
    Then the mill received 2 grists for the lampas app, kind bible-talk
    And the first grist carries no earlier turns
    And the second grist carries the reference "Romans 8:28" and the Greek and the English of verse 28
    And the second grist carries the question "What does συνεργεῖ mean here?"
    And the second grist carries his solid words, and not the words he is still learning
    And the second grist carries the first question and its answer as the earlier turn

  Scenario: With no verse selected the talk is about the chapter, with its first three verses
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    When he opens Talk
    Then the sheet is titled "Talk about Romans 8"
    When he sends "What is this chapter about?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the first grist carries the reference "Romans 8" and the Greek and the English of verses 1 to 3
    And the first grist carries the question "What is this chapter about?"

  Scenario: The answer shows in the sheet and is read aloud
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a phone that speaks English and Greek
    And he selects verse 28
    And he opens Talk
    When he sends "What does συνεργεῖ mean here?"
    Then the answer shows in the sheet under his question
    And the answer is read aloud, its Greek word in Greek and the rest in English
    When he taps Stop on the answer
    Then the reading stops and the answer can be heard again

  Scenario: The Greek words of an answer open the word sheet
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he selects verse 28
    And he opens Talk
    And he sends "What does συνεργεῖ mean here?"
    When he taps the Greek word "συνεργεῖ" in the answer
    Then the word sheet shows "συνεργεῖ" with its lemma "συνεργέω"
    When he taps Done on the word sheet
    Then the word sheet is gone and the Talk sheet is still open

  Scenario: The eleventh turn sends only the last 10 as history
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And ten turns were already kept for verse 28
    And he selects verse 28
    And he opens Talk
    When he sends "Question eleven"
    And the answer number 11 has arrived
    And he sends "Question twelve"
    Then the mill received 2 grists for the lampas app, kind bible-talk
    And the first grist carries 10 earlier turns, from "Question 1" to "Question 10"
    And the second grist carries 10 earlier turns, from "Question 2" to "Question eleven"

  Scenario: A conversation is still there after reload
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he selects verse 28
    And he opens Talk
    And he sends "What does συνεργεῖ mean here?"
    And the answer number 1 has arrived
    When he reopens Lampas, selects verse 28 and opens Talk
    Then the answer shows in the sheet under his question
    And the fake Postern was not asked again

  Scenario: A verse's talk and the chapter's talk are kept apart
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he selects verse 28
    And he opens Talk
    And he sends "What does συνεργεῖ mean here?"
    And the answer number 1 has arrived
    When he taps Done on the Talk sheet
    And he selects verse 28 again, so that no verse is selected
    And he opens Talk again
    Then the sheet is titled "Talk about Romans 8"
    And the sheet shows no turns yet

  Scenario: An unreachable backend shows Could not reach with Retry
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that cannot be reached
    And he selects verse 28
    And he opens Talk
    When he sends "What does συνεργεῖ mean here?"
    Then the sheet says "Could not reach the tutor" with a Retry button
    And the sheet shows no answer
    When the backend comes back and he taps Retry
    Then the answer shows in the sheet under his question

  Scenario: While the tutor has not answered the sheet says Sending and then Waiting
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that holds its answers
    And he selects verse 28
    And he opens Talk
    When he sends "What does συνεργεῖ mean here?"
    Then the sheet says Waiting and nothing can be sent until the answer comes
    When the tutor answers
    Then the answer shows in the sheet under his question

  Scenario: An unlicensed reply shows No licence
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that holds no licence for this phone
    And he selects verse 28
    And he opens Talk
    When he sends "What does συνεργεῖ mean here?"
    Then the sheet says "No licence" with a Retry button

  Scenario: Send cannot be tapped with nothing typed
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    When he opens Talk
    Then the Send button is off
    When he types "   "
    Then the Send button is still off
    When he types "Why?" instead
    Then the Send button is on

  Scenario: Done closes the sheet and Escape closes it too
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    When he opens Talk
    And he taps Done on the Talk sheet
    Then the Talk sheet is gone
    When he opens Talk again
    And he presses Escape
    Then the Talk sheet is gone again

  Scenario: Asking for a setting changes it at once and the talk says what changed, with an Undo
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change greekRate 0.8
    And he opens Talk
    When he sends "Make the Greek slower"
    Then the sheet shows "Changed: Greek speed 0.8x" with an Undo button
    And the Greek speed is saved as 0.8 and the English speed is still 1
    And the grist carried the settings as they stood, the Greek speed at 1
    When he taps Undo
    Then the sheet shows "Put back: Greek speed 1x" and no Undo button
    And the Greek speed is saved as 1

  Scenario: A change to a setting the app does not have changes nothing and the talk says so
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change fontColour red
    And he opens Talk
    When he sends "Make the text red"
    Then the answer shows in the sheet under his question
    And nothing was changed and the sheet shows no Undo button
    And the sheet says the app has no such setting "fontColour"

  Scenario: A change with a value the setting does not allow is left out, the allowed change beside it is made
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the changes theme purple and greekRate 0.7
    And he opens Talk
    When he sends "Purple theme and slower Greek"
    Then the sheet shows "Changed: Greek speed 0.7x" with an Undo button
    And the sheet says the Theme does not allow "purple"
    And the saved Theme is still Phone

  Scenario: Add to my words puts an answer word's lemma on his list once, and a word already there says so from the start
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ
    And he opens Talk
    When he sends "Explain these words"
    Then the answer word "σάρξ" offers "Add to my words"
    And the answer word "θεός" already shows "On my list", because it is a seeded word
    When he taps "Add to my words" on the answer word "σάρξ"
    Then the answer word "σάρξ" shows "On my list"
    And the word "σάρξ" is on the list once, as a word he is learning, with the gloss "flesh"
    And the answer word "πνεῦμα" still offers "Add to my words"

  Scenario: A word added from an answer is on the Words screen
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ
    And he opens Talk
    When he sends "Explain these words"
    And he taps "Add to my words" on the answer word "πνεῦμα"
    And he taps Done on the Talk sheet
    And he opens the Words screen
    Then the Words screen lists "πνεῦμα" as learning
    And the Words screen does not list "σάρξ"

  Scenario: Saying add σάρξ to my words adds it and the answer says so
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add σάρξ
    And he opens Talk
    When he sends "add σάρξ to my words"
    Then the answer shows the line "Added σάρξ to your words"
    And the word "σάρξ" is on the list once, as a word he is learning, with the gloss "flesh"
    When he asks again "add σάρξ to my words"
    Then the second answer shows the line "σάρξ is already on your words"
    And the word "σάρξ" is still on the list once with the gloss "flesh"

  Scenario: An answer that asks to add a word already on the list says it was already there
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add θεός and σάρξ
    And he opens Talk
    When he sends "add θεός and σάρξ to my words"
    Then the answer shows the line "Added σάρξ to your words"
    And the answer also shows the line "θεός is already on your words"
    And the word "θεός" is on the list once
