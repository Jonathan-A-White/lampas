Feature: Ask by Speaking or Typing
  Ask the tutor is speak-first (the big Hold to ask bar, Type a question beneath it) unless he chooses Typing, which brings the text box and Send
  first with a small mic beside it. The choice is the setting "Ask by" in Settings, it is kept across a reload, and he can ask the tutor to switch
  it ("let me type instead", "switch back to speaking"): the answer carries the change, the app applies it and the reply says what it did. The Verse view's Ask goes to the Talk sheet's tutor (mw-5r3p30.842), so the reply and its
  Changed line are the Talk sheet's.

  Scenario: Settings shows Ask by with Speaking and Typing
    Given Lampas is opened on Settings with nothing chosen
    Then Settings shows the group "Ask by" with Speaking chosen

  Scenario: Choosing Typing makes Ask the tutor type-first and it survives a reload
    Given Lampas is opened on Settings with nothing chosen
    When he chooses "Typing" in the group "Ask by"
    Then Ask by is saved as "typing"
    When Lampas is opened again on the Verse view of Romans 8 with Ask the tutor chosen
    Then Ask the tutor shows the text box, Send and a small mic and no Hold to ask bar

  Scenario: Speaking is the default and Ask the tutor shows the Hold to ask bar
    Given Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen
    Then Ask the tutor shows the Hold to ask bar and a Type a question button and no text box

  Scenario: Asking to type switches Ask by to Typing, the reply says so, and asking to speak switches it back
    Given Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen
    When he asks "Let me type instead" by the composer
    Then the grist carried Ask by as "speaking"
    And the reply says "I have switched Ask by to Typing."
    And the answer says "Changed: Ask by: Typing"
    And Ask by is saved as "typing"
    And Ask the tutor shows the text box, Send and a small mic and no Hold to ask bar
    When he then asks "Switch back to speaking" by the composer
    Then the next grist carried Ask by as "typing"
    And the next reply says "I have switched Ask by back to Speaking."
    And Ask by is now saved as "speaking"
    And Ask the tutor shows the Hold to ask bar and a Type a question button and no text box

  Scenario: Ask by Typing after a change the app ignores still switches it, and the reply's card says so
    Given Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen
    When the tutor answers "I have switched Ask by to Typing." with a theme change first and then Ask by Typing
    Then the answer shows "I have switched Ask by to Typing."
    And the answer says "Changed: Ask by: Typing"
    And Ask by is saved as "typing"
    And Ask the tutor shows the text box, Send and a small mic and no Hold to ask bar

  Scenario: The tutor's instructions say to switch Ask by only when he asks
    Given the verse-ask grind
    Then its answer schema lets an answer change only Ask by to Speaking or Typing, and its instructions say when
