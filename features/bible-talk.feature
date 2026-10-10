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
    And he closes the Verse view of verse 28, so that no verse is selected
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

  Scenario: The tutor sets the goal when asked
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change goal 1 John 1
    And he opens Talk
    When he sends "My goal is to read 1 John 1"
    Then the sheet shows "Changed: Goal: Read 1 John 1" with an Undo button
    And the saved goal is "Read 1 John 1"
    When he taps Undo
    Then the saved goal is ""

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

  Scenario: Saying add for a word outside the chapter adds it with the lexicon's gloss
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add προσκυνέω
    And he opens Talk
    When he sends "add προσκυνέω to my words"
    Then the answer shows the line "Added προσκυνέω to your words"
    And the word "προσκυνέω" is on the list once, as a word he is learning, with the gloss "to worship"

  Scenario: Saying add for a word the lexicon does not know says so and adds nothing
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add ζζζ
    And he opens Talk
    When he sends "add ζζζ to my words"
    Then the answer shows the line "I do not know ζζζ"
    And the word "ζζζ" is not on the list

  Scenario: The tutor's Markdown shows as bold, italics and lists, with no marks left
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown
    And he opens Talk
    When he sends "what is parsing?"
    Then the answer shows "parsing" in bold and "grammar" in italics
    And the answer shows a bulleted list of 2 items and a numbered list of 2 items
    And the answer shows no stars and no hashes

  Scenario: Raw HTML in an answer is shown as text and never rendered
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with raw HTML
    And he opens Talk
    When he sends "show me a picture"
    Then the answer shows the text "<img src=x onerror=alert(1)>"
    And the answer holds no image

  Scenario: Greek in a rendered answer keeps the sheet's type
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown
    And he opens Talk
    When he sends "what is parsing?"
    Then the Greek word "συνεργεῖ" in the answer is as large as the rest of the answer

  Scenario: An answer in Markdown is read aloud without its marks
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown and a phone that speaks English and Greek
    And he opens Talk
    When he sends "what is parsing?"
    Then the answer is read aloud with no stars, hashes or list marks

  Scenario: His own turn stays plain text
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he opens Talk
    When he sends "what is **parsing**?"
    Then his question shows as "what is **parsing**?" with its stars

  Scenario: What he said is shown back cleaned up, and the raw words stay kept
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question
    And he opens Talk
    When he sends "um why are there uh italic words what does it mean for the words to be italic"
    Then his turn shows "Why are there italic words? What does it mean for the words to be italic?"
    And the turn kept on the phone has his raw words "um why are there uh italic words what does it mean for the words to be italic"

  Scenario: An answer with no cleaned question shows his raw words
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he opens Talk
    When he sends "um why are there uh italic words"
    Then his turn shows "um why are there uh italic words"

  Scenario: Copy on a turn puts the exchange on the clipboard as Markdown
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question
    And he selects verse 28
    And he opens Talk
    When he sends "um why are there uh italic words what does it mean for the words to be italic"
    And he taps Copy on the first turn
    Then the clipboard holds the Markdown of "Romans 8:28" asking "Why are there italic words? What does it mean for the words to be italic?" answered by the talk
    And the first turn says "Copied"

  Scenario: A talk about the chapter copies the chapter's link
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he opens Talk
    When he sends "What is this chapter about?"
    And he taps Copy on the first turn
    Then the clipboard holds the Markdown of "Romans 8" asking "What is this chapter about?" answered by the talk

  Scenario: With several turns in the sheet each Copy copies only its own
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he selects verse 28
    And he opens Talk
    When he sends "What does συνεργεῖ mean here?"
    And the talk will answer "It means works together."
    And he then sends "Who is doing the working?"
    And he taps Copy on the second turn
    Then the clipboard holds the Markdown of "Romans 8:28" asking "Who is doing the working?" answered "It means works together."
    And the first turn does not say "Copied"
    When he taps Copy on the first turn again
    Then the clipboard then holds the Markdown of "Romans 8:28" asking "What does συνεργεῖ mean here?" answered by the talk

  Scenario: A question in the talk sends the learner summary
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And he is learning the word "σάρξ" which he added today
    And he selects verse 28
    And he opens Talk
    When he sends "What does σάρξ mean?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And its input carries a learner summary that names his solid words as a count, "σάρξ" among the words he is learning and as new today, and what is due now

  Scenario: The Bible talk's instructions ask it to teach a new word in his terms
    Given the bible-talk grind's instructions
    Then they describe the learner field
    And they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter
    And they say to leave out what he already knows and to keep the answer short for a phone

  Scenario: Asking about ἀρχῆς sends learner_grammar with the goal Read 1 John 1:1
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And his goal is "Read 1 John 1:1" and he has the genitive case on the frontier
    And he opens Talk
    When he sends "What does ἀρχῆς mean?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And its input carries learner_grammar with the goal "Read 1 John 1:1", "The genitive case" among the frontier ideas and no more than 12 titles a list

  Scenario: The tutor's instructions tell it to teach at his level and to offer the move
    Given the bible-talk grind's instructions
    Then they describe the learner_grammar field
    And they pitch frontier ideas with a form from the goal and name a not-yet idea only with its plain meaning
    And they offer the move with one question when suggested_move is up or down and Move it is Ask, and put pickerGrammar in settings_changes on a yes
    And they name the approach and its next lesson when he asks what to learn next

  Scenario: Yes to the offer changes New words at and the sheet shows Changed with Undo
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change pickerGrammar solid
    And he opens Talk
    When he sends "Yes, move it"
    Then the sheet shows "Changed: New words at: Solid grammar" with an Undo button
    And New words at is saved as Solid grammar
    When he taps Undo
    Then New words at is saved as Frontier grammar

  Scenario: The tutor turns a study resource off or on when asked, as the Settings screen's own switch, and Undo puts it back
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change resource.strongs on
    And he opens Talk
    When he sends "Turn on Strong's numbers"
    Then the sheet shows "Changed: Strong's: On" with an Undo button
    And the Strong's resource is switched on
    When he taps Undo
    Then the Strong's resource is switched off

  Scenario: A question in the talk tells the tutor only the study resources he has on
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern
    And the Logos study resource is switched on
    And he selects verse 28
    And he opens Talk
    When he sends "Which lexicon has the fullest entry for ἀγάπη?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And its input lists the resource Logos and no other
