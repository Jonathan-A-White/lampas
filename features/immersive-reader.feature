Feature: Immersive reader
  Settings has a switch, Immersive reader (Off by default). With it On, scrolling the Reader's text down slides the header, the row of chips,
  the Talk bar and the round Ask button out of view, so the text has the whole screen (src/immersive.ts, src/Away.tsx). Scrolling up by 24 px
  or more, or a two-finger tap anywhere on the text, slides them back: no hidden gesture to learn, nothing from the screen's edge. A two-finger
  tap never opens a word sheet; a one-finger tap on a word still does. They also come back when a sheet closes, at the end of the chapter and
  when reading aloud stops. With the switch Off the Reader is as it was. How it looks at 412 px is proven by tests/e2e/immersive-reader.spec.ts.

  Scenario: Immersive reader is Off by default and Off leaves the Reader alone when the text scrolls
    Given Lampas is opened on Romans 8 with Immersive reader Off
    When he scrolls the text down 200 px
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: Scrolling down slides the bars away and scrolling up 24 px brings them back
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view
    When he scrolls the text up 10 px
    Then the header, the chips, the Talk bar and the Ask button are all still out of view
    When he scrolls the text up another 14 px
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: A two-finger tap brings the bars back and opens no word sheet
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he taps the text with two fingers, and the phone also sends a click on a word
    Then the header, the chips, the Talk bar and the Ask button are all in view
    And no word sheet is open

  Scenario: Two fingers that move are a gesture of their own, not a tap
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he puts two fingers on the text and drags them 40 px
    Then the header, the chips, the Talk bar and the Ask button are all out of view

  Scenario: A one-finger tap on a word opens its sheet while the bars are away, and closing the sheet brings them back
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
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

  Scenario: The bars come back at the end of the chapter
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he scrolls the text down 200 px
    And he scrolls the text to its end
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: The bars come back when reading aloud stops
    Given Lampas is opened on Romans 8 with Immersive reader On and a phone that speaks English
    When he scrolls the text down 200 px
    And verse 1 is being read aloud
    And the reading is stopped
    Then the header, the chips, the Talk bar and the Ask button are all in view

  Scenario: Settings switches it On and the choice survives a reload
    Given Lampas is opened on Romans 8 with Immersive reader Off
    When he opens Settings and sets Immersive reader to On
    And the app is closed and opened again on Settings
    Then Immersive reader shows On in Settings
