Feature: Immersive reader hint card
  With Immersive reader On, a small card sits over the top of the Reader's text and says how it works: "Scroll down and the bars slide away.",
  "Tap with three fingers to bring them back." and "To leave immersive reading: Settings > Immersive reader." It has two buttons, 'Got it' (closes
  it for now: it shows again the next time the Reader opens) and "Don't show this again" (switches the setting Immersive reader card to Off, so it
  never shows again, also after a reload). With Immersive reader Off it never shows. Settings > Immersive reader card (On | Off, shown while
  Immersive reader is On) brings it back. The card is in the page's flow above the text, so it never covers the round Ask button. How it looks at
  390 px is proven by tests/e2e/immersive-hint.spec.ts (src/ImmersiveHint.tsx).

  Scenario: Opening the Reader with Immersive reader On shows the card
    Given Lampas is opened on Romans 8 with Immersive reader On
    Then the hint card says how the bars slide away, how to bring them back and how to leave
    And the hint card has the buttons 'Got it' and "Don't show this again"

  Scenario: Got it closes the card and it shows again the next time the Reader opens
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he taps 'Got it' on the hint card
    Then the hint card is gone
    When Lampas is closed and opened again on Romans 8
    Then the hint card says how the bars slide away, how to bring them back and how to leave

  Scenario: Don't show this again closes the card for good, also after a reload
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he taps "Don't show this again" on the hint card
    Then the hint card is gone
    And the setting Immersive reader card is saved as Off
    When Lampas is closed and opened again on Romans 8
    Then the hint card is still gone

  Scenario: With Immersive reader Off the card never shows
    Given Lampas is opened on Romans 8 with Immersive reader Off
    Then the hint card is gone

  Scenario: Switching Immersive reader card back On in Settings shows the card again
    Given Lampas is opened on Romans 8 with Immersive reader On
    When he taps "Don't show this again" on the hint card
    And he opens Settings and sets Immersive reader card to On
    And he goes back to the Reader
    Then the hint card says how the bars slide away, how to bring them back and how to leave
