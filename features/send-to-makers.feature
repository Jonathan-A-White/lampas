Feature: A wish for the makers comes up in the talk; there is no Send to the makers button
  There is no standing 'Send to the makers' button in the Talk sheet or in the Verse view's Ask (mw-5r3p30.844; he did not know what it did, out of context). When he asks the
  tutor for what Lampas cannot do, the tutor says so in the talk and offers to pass it on (src/talk/offers.ts sendMakersOffer, the grind's `feedback_offer`): the offer is the
  button 'Send this to the makers' under its answer, and he sends it with a tap or by saying or typing yes, as the tap does. The pictures he attached to the ask go with it. Settings > Your
  requests lists what was sent. These scenarios run against a fake Postern whose mill answers a talk with the answer the scenario names and a feedback grist with {"status":"sent"}.

  Scenario: The Talk sheet has no Send to the makers button, with words typed or a picture attached
    Given Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks
    When he opens the Talk sheet on the chapter, attaches a picture and types "The Greek keyboard is missing" without sending it
    Then the Talk sheet shows no button "Send to the makers"
    And the mill received 0 grists for the lampas app, kind feedback

  Scenario: The Verse view's Ask has Attach a picture and Take a photo and no Send to the makers button
    Given Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor cannot do what he asks
    When he attaches a picture and types "The Greek is too small here" in the Ask composer
    Then the Ask composer has the buttons "Attach a picture" and "Take a photo"
    And the Verse view shows no button "Send to the makers"

  Scenario: When the tutor cannot do what he asks, the talk offers to pass it on and a tap sends it with the pictures
    Given Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks
    When he opens the Talk sheet on the chapter and asks "Can I have a Greek keyboard?" with a picture attached
    Then the talk answers that it cannot, and shows the button "Send this to the makers"
    And the mill received 0 grists for the lampas app, kind feedback
    When he taps Send this to the makers
    Then the mill received 1 grists for the lampas app, kind feedback
    And the feedback grist is a tutor-ask with his words "Can I have a Greek keyboard?", the summary "He wants a Greek keyboard.", the screen "Reader" and the reference "Romans 8"
    And the feedback grist carries only fields the feedback input schema allows
    And the feedback grist carries one picture
    And the first turn shows "Sent" and no button "Send this to the makers"

  Scenario: Typing yes to the offer sends it as the tap does
    Given Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks
    When he opens the Talk sheet on the chapter and asks "Can I have a Greek keyboard?" with a picture attached
    Then the talk answers that it cannot, and shows the button "Send this to the makers"
    When the tutor will take his next words as a yes
    And he types "yes please do" in the Talk sheet and sends it
    Then the second bible-talk grist carries the pending offer of kind feedback with the summary "He wants a Greek keyboard."
    And the mill received 1 grists for the lampas app, kind feedback
    And the feedback grist is a tutor-ask with his words "Can I have a Greek keyboard?", the summary "He wants a Greek keyboard.", the screen "Reader" and the reference "Romans 8"
    And the feedback grist carries one picture
    And the first turn shows "Sent" and no button "Send this to the makers"

  Scenario: Saying yes to the offer sends it as the tap does
    Given Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks
    When he opens the Talk sheet on the chapter and speaks "Can I have a Greek keyboard?"
    Then the talk answers that it cannot, and shows the button "Send this to the makers"
    When the tutor will take his next words as a yes
    And he speaks "yes please do" in the Talk sheet
    Then the second bible-talk grist is marked as spoken and carries the pending offer of kind feedback with the summary "He wants a Greek keyboard."
    And the mill received 1 grists for the lampas app, kind feedback
    And the first turn shows "Sent" and no button "Send this to the makers"

  Scenario: Your requests lists a request sent from the offer
    Given Lampas is opened on the Reader behind a fake Postern whose tutor cannot do what he asks
    When he opens the Talk sheet on the chapter and asks "Can I have a Greek keyboard?" with a picture attached
    Then the talk answers that it cannot, and shows the button "Send this to the makers"
    When he taps Send this to the makers
    And he opens Your requests
    Then Your requests lists "Can I have a Greek keyboard?"
    And the phone keeps one request row, kind tutor-ask, that says 1 picture went with it
