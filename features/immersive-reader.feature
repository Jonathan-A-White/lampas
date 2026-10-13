Feature: Immersive reader
  Settings has a switch, Immersive reader (Off by default). With it On, scrolling the Reader's text down slides the header, the row of chips,
  the Talk bar and the round Ask button out of view, so the text has the whole screen (src/immersive.ts, src/Away.tsx). After that the bars
  change ONLY on a two-finger tap anywhere on the text (mw-5r3p30.255: "2 fingers on, 2 fingers off"): shown if away, away if shown. Nothing
  else brings them back: not scrolling up, not scrolling to or past the end of the chapter, not a sheet closing, not reading aloud stopping.
  A three-finger tap does nothing. A two-finger tap never opens a word sheet; a one-finger tap on a word still does. With the switch Off the
  Reader is as it was. How it looks at 390 px is proven by tests/e2e/immersive-reader.spec.ts.

  Scenario: Immersive reader is Off by default and Off leaves the Reader alone when the text scrolls
    Given Lampas is opened on Romans 8 with Immersive reader Off
    When he scrolls the text down 200 px
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: Scrolling down slides the bars away and scrolling up leaves them away
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 300 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view
    When he scrolls the text up 200 px
    Then the header, the chips, the Talk bar and the Ask button are all still out of view
    When he scrolls the text up another 100 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view at the top of the text

  Scenario: A two-finger tap shows the bars, and a second two-finger tap puts them away again
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he taps the text with two fingers, and the phone also sends a click on a word
    Then the header, the chips, the Talk bar and the Ask button are all in view
    And no word sheet is open
    When he taps the text with two fingers again
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: Two fingers that arrive one after another are judged as one tap
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he puts two fingers on the text one after another and lifts them together
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: A three-finger tap does nothing
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he taps the text with three fingers
    Then the header, the chips, the Talk bar and the Ask button are all out of view
    When he taps the text with two fingers
    Then the header, the chips, the Talk bar and the Ask button are all in view
    When he taps the text with three fingers again
    Then the header, the chips, the Talk bar and the Ask button are all still in view

  Scenario: Two fingers that move are a gesture of their own, not a tap
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he puts two fingers on the text and drags them 40 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: A one-finger tap on a word opens its sheet while the bars are away, and closing the sheet leaves them away
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he taps the first word of verse 1
    Then the word sheet is open
    When he closes the word sheet
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: Closing a sheet with the bars shown leaves them shown
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he taps the text with two fingers
    And he taps the first word of verse 1
    Then the word sheet is open
    When he closes the word sheet
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: With the bars away, a two-finger tap and then holding Talk starts listening
    Given Lampas is opened on Romans 8 with Immersive reader On and a recogniser
    When he scrolls the text down 200 px
    And he taps the text with two fingers
    And he holds the Talk button
    Then the Talk sheet is open and the phone is listening

  Scenario: Scrolling to the end of the chapter and past the bottom leaves the bars away
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he scrolls the text to its end
    And he scrolls the text further down 300 px past the bottom
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: Reading aloud stopping leaves the bars away
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that speaks English
    When he scrolls the text down 200 px
    And verse 1 is being read aloud
    And the reading is stopped
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: Settings switches it On and the choice survives a reload
    Given Lampas is opened on Romans 8 with Immersive reader Off
    When he opens Settings and sets Immersive reader to On
    And the app is closed and opened again on Settings
    Then Immersive reader shows On in Settings

  Scenario: The first tap in the text asks for full screen, and switching Immersive reader Off leaves it
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen
    Then the page has not asked for full screen
    When he taps the text with one finger
    Then the page has asked for full screen once
    When he taps the text with one finger again
    Then the page has still asked for full screen once
    When Immersive reader is switched Off
    Then the page has left full screen

  Scenario: Two-finger taps bring back Lampas's own bars but keep the page full screen
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen
    When he scrolls the text down 200 px
    Then the page has asked for full screen once
    When he taps the text with two fingers
    Then the header, the chips, the Talk bar and the Ask button are all in view
    And the page has still asked for full screen once
    When he taps the text with two fingers again
    Then the header, the chips, the Talk bar and the Ask button are all out of view
    And the page has kept the one full screen it asked for

  Scenario: Leaving the Reader leaves full screen
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that can go full screen
    When he taps the text with one finger
    Then the page has asked for full screen once
    When he opens Settings from the Reader
    Then the page has left full screen

  Scenario: With Immersive reader Off the page never asks for full screen
    Given Lampas is opened on Romans 8 with Immersive reader Off and a phone that can go full screen
    When he taps the text with one finger
    And he scrolls the text down 200 px
    Then the page has not asked for full screen

  Scenario: A phone that refuses full screen reads on as before
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that refuses full screen
    When he taps the text with one finger
    And he scrolls the text down 200 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view
    When he taps the text with two fingers
    Then the header, the chips, the Talk bar and the Ask button are all in view
