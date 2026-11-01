Feature: Ask by Speaking or Typing
  Ask the tutor is speak-first (the big Hold to ask bar, Type a question beneath it) unless he chooses Typing, which brings the text box and Send
  first with a small mic beside it. The choice is the setting "Ask by" in Settings, it is kept across a reload, and he can ask the tutor to switch
  it ("let me type instead", "switch back to speaking"): the answer carries the change, the app applies it and the reply says what it did. The Verse view's Ask goes to the Talk sheet's tutor (mw-5r3p30.842), so the reply and its
  Changed line are the Talk sheet's.

  Scenario: Settings shows Ask by with Speaking and Typing
    Given Lampas is opened on Settings with nothing chosen
    Then Settings shows the group "Ask by" with Speaking chosen

  Scenario: The tutor's instructions say to switch Ask by only when he asks
    Given the bible-talk grind
    Then its answer schema lets an answer change Ask by to Speaking or Typing and no other value, and its instructions say when
