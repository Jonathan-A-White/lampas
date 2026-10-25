Feature: Lampas AI needs a licence
  Reading is free, but whatever is sent to the mill is the AI, and the mill answers a licence only. On a phone with no licence the AI's
  entry points are not drawn: the Talk bar and the round Ask the tutor button, the Verse view's Ask the tutor and Quiz me (with their Hold
  to ask bar), the Verse view's Read it aloud (his reading goes to the mill) with its Hold to read bar and the Reading ladder (also on the Goal
  screen), and the word sheet's Help with this word. On a licensed phone they are all there, as before.

  Scenario: With no licence the Reader has no Talk bar and no Ask the tutor button
    Given this phone has no licence and Romans 8 is open
    Then the Reader has no Talk bar
    And the Reader has no Ask the tutor button

  Scenario: With a licence the Reader has the Talk bar and the Ask the tutor button
    Given this phone has a licence and Romans 8 is open
    Then the Reader has a Talk bar
    And the Reader has an Ask the tutor button

  Scenario: With no licence the Verse view offers neither Ask the tutor nor Quiz me, even if Ask the tutor was the action he left it on
    Given this phone has no licence and the Verse view of verse 28 is open, last left on Ask the tutor
    Then the Verse view offers only the action "Listen", with Copy link
    And the Verse view has no Hold to ask

  Scenario: With no licence the Verse view has no Read it aloud, no Hold to read bar and no Reading ladder, even if Read it aloud was the action he left it on
    Given this phone has no licence and the Verse view of verse 28 is open, last left on Read it aloud
    Then the Verse view offers only the action "Listen", with Copy link
    And the Verse view has no Read it aloud, no Hold to read bar and no Reading ladder

  Scenario: With no licence the Verse view offers no Diagram
    Given this phone has no licence and the Verse view of verse 28 is open
    Then the Verse view has no button named Diagram

  Scenario: With a licence the Verse view offers Ask the tutor and Quiz me and the Hold to ask bar
    Given this phone has a licence and the Verse view of verse 28 is open, last left on Ask the tutor
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor" and "Quiz me"
    And the Verse view has a Hold to ask bar

  Scenario: With a licence the Verse view has Read it aloud, its Hold to read bar and the Reading ladder
    Given this phone has a licence and the Verse view of verse 28 is open, last left on Read it aloud
    Then the Verse view has Read it aloud, a Hold to read bar and a Reading ladder

  Scenario: With no licence the word sheet has no Help with this word
    Given this phone has no licence and Romans 8 is open
    When he taps a word in verse 1
    Then the word sheet opens
    And the word sheet has no Help with this word

  Scenario: With a licence the word sheet has Help with this word, with Ask the tutor
    Given this phone has a licence and Romans 8 is open
    When he taps a word in verse 1
    Then the word sheet opens
    And the word sheet has Help with this word with Ask the tutor

  Scenario: With no licence the Goal screen has no Ask the tutor button
    Given this phone has no licence and the Goal screen is open
    Then the Goal screen has no Ask the tutor button

  Scenario: With a licence the Goal screen has the Ask the tutor button
    Given this phone has a licence and the Goal screen is open
    Then the Goal screen has an Ask the tutor button

  Scenario: With no licence the Goal screen has no Reading ladder
    Given this phone has no licence and the Goal screen is open
    Then the Goal screen has no Reading ladder

  Scenario: With a licence the Goal screen has the Reading ladder in Greek and English
    Given this phone has a licence and the Goal screen is open
    Then the Goal screen has the Reading ladder in Greek and English

  Scenario: With no licence a shared picture is not read for Bible references
    Given this phone has no licence and a picture was shared to Lampas
    Then the Share sheet does not read the picture: no Bible references from a picture, nothing sent to the mill

  Scenario: With no licence the nightly run asks the mill nothing and About has no Tutor tuned line
    Given this phone has no licence and the tutor was asked back for facts, after 03:00
    Then the mill is sent no tutor-weights grist and About has no Tutor tuned line

  Scenario: With a licence the nightly run tunes the tutor and About says Tutor tuned
    Given this phone has a licence and the tutor was asked back for facts, after 03:00
    Then the mill is sent one tutor-weights grist and About says Tutor tuned 2026-10-25
