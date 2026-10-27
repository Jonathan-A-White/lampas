Feature: A new licensed reader is welcomed in plain English
  The first time a phone's licence is found, Lampas opens the Reader in English with the Weave off and no New words chip, and the tutor welcomes him with a short
  interview in plain English (mw-yrmkdf.3): why he is here (to read, to study or to learn the Greek or the Hebrew), what he wants from the app, and one thing about himself. The
  tutor writes his answers to the memory index; an answer that is to learn the Greek, the Hebrew or both offers it ("Show me the Greek", "Show me the Hebrew", "Show me the Greek and the Hebrew"), which a tap takes by raising the named dial(s) to Dipping a toe. Skip ends the welcome with the English
  defaults. A phone that already has a profile or settings is not welcomed. These scenarios run against a fake Postern whose mill answers each message.

  Scenario: A phone whose licence is first found opens in English and the tutor welcomes him
    Given a new phone whose licence is found when Lampas opens
    Then the Reader shows English with no Greek and no New words chip
    And the welcome talk is open and the tutor asks "Why are you here: to read, to study, or to learn the Greek or the Hebrew?"
    And the first bible-talk grist is in welcome mode with no Greek text

  Scenario: Answering just read ends the welcome with the English defaults and the memory holds the three answers
    Given a new phone whose licence is found when Lampas opens
    When he answers "just read"
    And he then answers "a calm chapter a day"
    And he lastly answers "I am a retired nurse"
    Then the tutor ends the welcome with thanks
    And the memory index holds "came to read", "wants a calm chapter a day" and "a retired nurse"
    And the Reader still shows English with the Weave off
    And no welcome is waiting on this phone

  Scenario: Answering learn the Greek offers the Greek and a tap raises the Greek dial to Dipping a toe
    Given a new phone whose licence is found when Lampas opens
    When he answers "I want to learn the Greek"
    Then the welcome talk shows the button "Show me the Greek"
    When he taps "Show me the Greek"
    Then the Greek dial is Dipping a toe
    And the Weave is on

  Scenario: Answering learn the Hebrew offers the Hebrew and a tap raises the Hebrew dial to Dipping a toe
    Given a new phone whose licence is found when Lampas opens
    When he answers "I want to learn the Hebrew"
    Then the welcome talk shows the button "Show me the Hebrew"
    And the memory index holds "came to learn the Hebrew"
    When he taps "Show me the Hebrew"
    Then the Hebrew dial is Dipping a toe
    And the Greek dial is Just English

  Scenario: Answering both offers one button for both and a tap raises both dials to Dipping a toe
    Given a new phone whose licence is found when Lampas opens
    When he answers "I want to learn both"
    Then the welcome talk shows the button "Show me the Greek and the Hebrew"
    When he taps "Show me the Greek and the Hebrew"
    Then the Hebrew dial is Dipping a toe
    And the Greek dial is Dipping a toe

  Scenario: Skip ends the welcome with the English defaults
    Given a new phone whose licence is found when Lampas opens
    When he taps "Skip"
    Then the welcome talk is closed
    And the memory index holds "skipped the welcome"
    And the Reader still shows English with the Weave off
    And no welcome is waiting on this phone

  Scenario: A phone with a profile already is not welcomed
    Given a phone that already has a profile, whose licence is found when Lampas opens
    Then no welcome talk is opened
    And no grist was sent

  Scenario: A phone with settings already is not welcomed
    Given a phone that already has settings, whose licence is found when Lampas opens
    Then no welcome talk is opened
    And no grist was sent

  Scenario: The Developer row brings the welcome back for the demo
    Given a phone that already has settings, whose licence is found when Lampas opens
    When he opens Settings and turns Developer mode on
    And he taps "Show the welcome again"
    Then the welcome talk is open and the tutor asks "Why are you here: to read, to study, or to learn the Greek or the Hebrew?"
