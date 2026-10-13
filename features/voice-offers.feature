Feature: He can answer an offer by voice instead of tapping
  A tutor answer may have an offer waiting for a tap (Send this to the makers, a setting change, the quiz goal), his next turn, spoken or
  typed, carries that offer to the tutor (`pending_offer`: its kind and the exact text it would send, mw-5r3p30.186). The tutor decides from
  his words whether he confirms ('yes send it'), declines ('no not now') or wants to hear it ('read it back to me'), and says so in the
  answer's `offer_reply`: confirm | decline | read_back. On confirm the app does exactly what the tap does; on read_back the tutor speaks the
  exact text and asks for his yes, and the offer stays; on decline the offer is withdrawn and nothing is sent. Anything else is an ordinary
  question and the offer stays. The buttons stay. The decision is the grind's, not a word list in the app. These scenarios run against a fake
  Postern whose mill answers each talk with the answer the scenario names and a feedback grist with {"status":"sent"}.

  Scenario: A spoken yes sends the feedback offer exactly as the tap does
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the tutor will take his next words as a yes
    And he says "yes send it"
    Then the second bible-talk grist carries the pending offer of kind feedback with the exact text of the summary
    And the mill received a feedback grist carrying his first words, the summary and the screen "Goal"
    And the first turn shows "Sent" and no button "Send this to the makers"
    And the tutor's answer to the yes is shown

  Scenario: Read it back speaks the exact text, keeps the offer, and a following yes sends it
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the tutor will take his next words as a request to read it back
    And he says "read it back to me"
    Then the answer to the request holds the exact text of the summary and asks for his yes
    And the tutor speaks the exact text of the summary
    And the first turn still shows the button "Send this to the makers"
    And the mill received no feedback grist
    When the tutor will take his next words as a yes
    And he then asks "yes"
    Then the third bible-talk grist carries the pending offer of kind feedback with the exact text of the summary
    And the mill received a feedback grist carrying his first words, the summary and the screen "Goal"
    And the first turn shows "Sent" and no button "Send this to the makers"

  Scenario: A spoken no withdraws the offer and sends nothing
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the tutor will take his next words as a no
    And he says "no not now"
    Then the mill received no feedback grist
    And the first turn shows "Not sent" and no button "Send this to the makers"
    When he then asks "Where am I?"
    Then the third bible-talk grist carries no pending offer

  Scenario: An ordinary question with an offer waiting keeps the offer
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the tutor will take his next words as an ordinary question
    And he says "Where am I?"
    Then the second bible-talk grist carries the pending offer of kind feedback with the exact text of the summary
    And the first turn still shows the button "Send this to the makers"
    And the mill received no feedback grist
    When the tutor will take his next words as a yes
    And he then asks "yes"
    Then the third bible-talk grist carries the pending offer of kind feedback with the exact text of the summary
    And the mill received a feedback grist carrying his first words, the summary and the screen "Goal"

  Scenario: A spoken yes makes the setting change the tap would make
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers to change the Theme to Dark
    When he taps the Ask the tutor control
    And he sends "Make it dark"
    Then the answer shows the button "Change Theme: Dark"
    And the Theme is not Dark
    When the tutor will take his next words as a yes
    And he says "yes please do"
    Then the second bible-talk grist carries the pending offer of kind setting with the text "Change Theme: Dark"
    And the Theme is Dark
    And the second turn shows the change "Changed: Theme: Dark" with an Undo button
    And the first turn shows "Changed" and no button "Change Theme: Dark"

  Scenario: The button still does what a yes does for a setting change
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers to change the Theme to Dark
    When he taps the Ask the tutor control
    And he sends "Make it dark"
    And he taps Change Theme: Dark
    Then the Theme is Dark
    And the mill received 1 bible-talk grist

  Scenario: A tap and a spoken yes send once
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the mill is slow to take the feedback
    And he taps Send this to the makers
    Then the mill has the feedback grist and the button is off while it is sending
    When the tutor will take his next words as a yes
    And he says "yes send it"
    And the mill takes the feedback
    Then the mill received exactly 1 feedback grist
    And the first turn shows "Sent" and no button "Send this to the makers"
    And the tutor's answer to the yes is shown

  Scenario: A spoken yes and a tap send once
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the mill is slow to take the feedback
    And the tutor will take his next words as a yes
    And he says "yes send it"
    Then the mill has the feedback grist and the button is off while it is sending
    When he taps the disabled Send this to the makers
    And the mill takes the feedback
    Then the mill received exactly 1 feedback grist
    And the first turn shows "Sent" and no button "Send this to the makers"
    And the tutor's answer to the yes is shown

  Scenario: A tap, then a spoken yes whose answer comes after the send finished, send once
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the mill is slow to take the feedback
    And he taps Send this to the makers
    Then the mill has the feedback grist and the button is off while it is sending
    When the tutor is slow to answer his next words
    And he says "yes send it"
    And the second bible-talk grist has reached the tutor
    And the mill takes the feedback
    Then the first turn shows "Sent" and no button "Send this to the makers"
    When the tutor's answer to the yes comes at last
    Then the mill received exactly 1 feedback grist
    And the tutor's answer to the yes is shown

  Scenario: A spoken yes whose answer is slow, then a tap, send once
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the tutor is slow to answer his next words
    And he says "yes send it"
    And the second bible-talk grist has reached the tutor
    And he taps Send this to the makers
    Then the first turn shows "Sent" and no button "Send this to the makers"
    When the tutor's answer to the yes comes at last
    Then the mill received exactly 1 feedback grist
    And the tutor's answer to the yes is shown

  Scenario: A second offer after a tapped one and a slow yes reaches the makers once each
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the mill is slow to take the feedback
    And he taps Send this to the makers
    Then the mill has the feedback grist and the button is off while it is sending
    When the tutor is slow to answer his next words
    And he says "yes send it"
    And the second bible-talk grist has reached the tutor
    And the mill takes the feedback
    Then the first turn shows "Sent" and no button "Send this to the makers"
    When the tutor's answer to the yes comes at last with a second offer
    And he taps the second offer's Send this to the makers
    Then each of the two summaries reached the mill exactly once

  Scenario: Two taps in a row on the button send once
    Given Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback
    When he taps the Ask the tutor control
    And he sends "Can this work with Olive Tree?"
    Then the answer shows the button "Send this to the makers"
    When the mill is slow to take the feedback
    And he taps Send this to the makers
    And he taps the disabled Send this to the makers
    And the mill takes the feedback
    Then the mill received exactly 1 feedback grist
    And the first turn shows "Sent" and no button "Send this to the makers"
