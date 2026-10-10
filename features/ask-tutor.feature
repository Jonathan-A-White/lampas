Feature: Ask the tutor from any screen
  One round button, the same on every full screen, bottom right (mw-5r3p30.91, docs/ask-tutor.md), opens the Talk sheet with
  what that screen shows: its name and its useful facts ride in the bible-talk request's `screen` field. The sheet opens
  with two or three questions fitted to the screen, and a tap sends one. A talk from a screen is kept under a ref of the
  screen ('screen.goal'), not under a verse. These scenarios run against a fake Postern whose mill opens the grist and
  answers it; the placing of the button is proved by tests/e2e/ask-tutor.spec.ts.

  Scenario Outline: The control on <screen> opens the Talk sheet
    Given Lampas is opened on <address> with the goal "1 John 1:1" behind a fake Postern
    Then the screen has one control named "Ask the tutor about this screen"
    When he taps the Ask the tutor control
    Then the Talk sheet is titled for <screen>
    And the control is hidden while the sheet is open

    Examples:
      | screen   | address   |
      | Goal     | #/goal    |
      | Review   | #/review  |
      | Settings | #/settings |

  Scenario: Every full screen has the control, and the Reader's opens its chapter talk
    Given Lampas is opened on the Reader behind a fake Postern
    Then the screen has one control named "Ask the tutor about this screen"
    When he taps the Ask the tutor control
    Then the Talk sheet is titled "Talk about Romans 8"
    When he closes the Talk sheet
    Then every other full screen has the control: Goal, Words, Review, Quick test, Parsing drill, Paradigms, Placement, Settings, My study way, Import and About

  Scenario: From Goal the request carries the goal, the counts, Learn next and the Next words
    Given Lampas is opened on #/goal with the goal "1 John 1:1" behind a fake Postern
    And the Goal screen shows its counts, Learn next and Next words
    When he taps the Ask the tutor control
    And he sends "Where am I?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the grist is for the screen "Goal" and has no verse text
    And the grist's screen facts carry the goal "Read 1 John 1:1"
    And the grist's screen facts carry the counts the Goal screen shows for words and for ideas
    And the grist's screen facts carry Learn next as the Goal screen shows it
    And the grist's screen facts carry the Next words the Goal screen shows
    And the grist still carries what he knows: his solid words, the learner line and the learner grammar
    And the grist carries only fields the input schema allows

  Scenario: The sheet opens with questions fitted to the screen and a tap sends one
    Given Lampas is opened on #/goal with the goal "1 John 1:1" behind a fake Postern
    When he taps the Ask the tutor control
    Then the sheet suggests two or three questions
    And one of them asks for the simplest verse in the New Testament to learn first, given where he is
    When he taps that suggested question
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the grist carries the question "What's the simplest verse in the New Testament for me to learn first, given where I am?"
    And the answer shows in the sheet under his question
    And the suggested questions are gone

  Scenario: On About the request carries every credit and the sheet suggests questions about the credits
    Given Lampas is opened on #/about with the goal "1 John 1:1" behind a fake Postern
    When he taps the Ask the tutor control
    Then the sheet suggests questions about the credits, one of them "Why do you credit all these?"
    When he taps the suggested question "Why do you credit all these?"
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the grist carries the question "Why do you credit all these?"
    And the grist is for the screen "About" and has no verse text
    And the grist's screen credits name every source About lists, each with what it gives, its licence and its link
    And the grist's screen credits say TBESG is CC BY 4.0
    And the grist carries only fields the input schema allows

  Scenario: Other screens suggest their own questions
    Given Lampas is opened on #/words with the goal "1 John 1:1" behind a fake Postern
    When he taps the Ask the tutor control
    Then the sheet suggests two or three questions
    And none of them is the simplest verse question

  Scenario: A talk from a screen is kept under the screen, and is there on return
    Given Lampas is opened on #/goal with the goal "1 John 1:1" behind a fake Postern
    When he taps the Ask the tutor control
    And he sends "Where am I?"
    And the answer number 1 has arrived
    Then the talk is kept under "screen.goal" and under no verse or chapter
    When he closes the Talk sheet
    And he opens the Words screen and then the Goal screen again
    And he taps the Ask the tutor control on return
    Then the sheet shows his question "Where am I?" and its answer
    When he closes the sheet once more
    And he opens the Words screen
    And he taps the Ask the tutor control there
    Then the sheet shows no earlier turn

  Scenario: On Settings the request carries every setting, its value and its help, and the sheet suggests questions about settings
    Given Lampas is opened on #/settings with the goal "1 John 1:1" behind a fake Postern
    When he taps the Ask the tutor control
    Then the sheet suggests a question about Accordance, "What would Accordance give me?"
    When he taps that suggested question
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the grist carries the question "What would Accordance give me?"
    And the grist is for the screen "Settings" and has no verse text
    And the grist's screen settings name every setting and study resource with its value now and its help
    And the grist's screen settings say Accordance is Off and what it adds
    And the grist carries only fields the input schema allows
