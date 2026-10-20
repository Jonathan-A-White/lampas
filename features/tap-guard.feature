Feature: A double tap that changes the screen or opens a sheet does nothing with its second tap
  The Tester found about twenty-five places where the second tap of a quick double tap acted on what the first tap brought up: a Settings row opened
  its screen and the second tap pressed a control on it, a back button reached the Reader and the second tap opened the chapter picker, a heading
  opened its passage and the second tap opened a word. One guard in the shell (src/ui/tapGuard.ts, mw-5r3p30.597) now swallows every tap for a moment
  (PROVISIONAL, 300 ms) after any screen changes and after any sheet or confirm card opens or closes, so no screen needs code of its own for it. A
  tap after that moment works as before.

  Scenario: A second tap on Settings' About row does not open the Preface
    Given he is on "#/settings?group=account" and a screen ignores taps for a moment
    When he taps "About" and at once taps "Preface"
    Then the address is "#/about"

  Scenario: A second tap on Settings' Paradigms row does not open a table
    Given he is on "#/settings?group=account" and a screen ignores taps for a moment
    When he taps "Paradigms" and at once taps "Noun endings"
    Then the address is "#/paradigms"

  Scenario: A second tap on Settings' About you row does not set his pace
    Given he is on "#/settings?group=account" and a screen ignores taps for a moment
    When he taps "About you" and at once taps "Slow"
    Then the address is "#/aboutyou"
    And no pace is marked

  Scenario: A second tap on About's back button does not open the chapter picker
    Given he is on "#/about" and a screen ignores taps for a moment
    When he taps "‹ Reader" and at once taps the chapter's name
    Then the Reader shows with no sheet over it
    When he waits a moment
    And he taps the chapter's name
    Then the chapter picker is open

  Scenario: A second tap on the Verse view's back button does not open the chapter picker
    Given he is on "#/?b=rom&c=8&view=greek&v=28" and a screen ignores taps for a moment
    When he taps "‹ Reader" and at once taps the chapter's name
    Then the Reader shows with no sheet over it

  Scenario: A second tap on the chapter's name does not shut the picker it opened
    Given he is on "#/?b=rom&c=8&view=greek" and a screen ignores taps for a moment
    When he taps the chapter's name and at once taps outside the picker
    Then the chapter picker is open

  Scenario: A second tap on a section heading opens no word
    Given he is on "#/?b=rom&c=8&view=greek" and a screen ignores taps for a moment
    When he taps the heading "Walking by the Spirit" and at once taps a word of its passage
    Then the passage is open with no word sheet over it
