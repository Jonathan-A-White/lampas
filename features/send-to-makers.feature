Feature: He can send a request to the makers from any tutor talk, whenever he likes
  The makers' offer used to exist only when the tutor made it. Now the Talk sheet and the Verse view's Ask each have a 'Send to the makers' action: it files what is in
  the composer (his words, the pictures he attached or took) as a request, through the one sender the tutor's own offer uses (src/talk/makers.ts sendToMakers), and
  asks the tutor nothing. The Verse view's Ask has Attach a picture and Take a photo for it; the tutor there does not look at pictures, so Send with a picture in
  the row says so and sends nothing. In the Talk sheet (portrait) the action shows once the composer holds something to send, so an empty sheet keeps the whole room for the
  conversation; sideways it stands in the header. In the Ask it is always there. Settings > Your requests lists what was sent from each. These scenarios run against a fake Postern whose mill answers a talk
  with the tutor's answer and a feedback grist with {"status":"sent"}.

  Scenario: In the Talk sheet Send to the makers files his words and the screen without asking the tutor
    Given Lampas is opened on the Reader behind a fake Postern whose tutor offers nothing
    When he opens the Talk sheet on the chapter and types "The Greek keyboard is missing" without sending it
    And he taps Send to the makers
    Then the mill received 1 grists for the lampas app, kind feedback
    And the feedback grist is a tutor-ask with his words "The Greek keyboard is missing", the screen "Reader" and the reference "Romans 8"
    And the feedback grist carries only fields the feedback input schema allows
    And the composer says "Sent to the makers" and has a link "Your requests"
    And the Talk sheet shows no turn

  Scenario: A picture attached in the Talk sheet goes to the makers with the words
    Given Lampas is opened on the Reader behind a fake Postern whose tutor offers nothing
    When he opens the Talk sheet on the chapter, attaches a picture and types "This screen is cut off" without sending it
    And he taps Send to the makers
    Then the mill received 1 grists for the lampas app, kind feedback
    And the feedback grist carries one picture
    And the phone keeps one request row that says 1 picture went with it

  Scenario: In the Talk sheet Send to the makers shows once there is something to send
    Given Lampas is opened on the Reader behind a fake Postern whose tutor offers nothing
    When he opens the Talk sheet on the chapter
    Then the Talk sheet shows no button "Send to the makers"
    When he types "A Greek keyboard, please" in the Talk sheet without sending it
    Then the Talk sheet shows the button "Send to the makers"
    And the mill received 0 grists for the lampas app, kind feedback

  Scenario: The Verse view's Ask has Attach a picture and Take a photo, and Send to the makers files words and a picture
    Given Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor offers nothing
    Then the Ask composer has the buttons "Attach a picture" and "Take a photo" and "Send to the makers"
    When he attaches a picture and types "The Greek is too small here" in the Ask composer
    And he taps Send to the makers
    Then the mill received 1 grists for the lampas app, kind feedback
    And the feedback grist is a tutor-ask with his words "The Greek is too small here", the screen "Verse view" and the reference "Romans 8:1-11"
    And the feedback grist carries one picture
    And the composer says "Sent to the makers" and has a link "Your requests"
    And the phone keeps one request row, kind tutor-ask, with his words as its line
    When he opens Your requests
    Then Your requests lists "The Greek is too small here"

  Scenario: In the Verse view's Ask, Send to the makers with nothing in the composer sends nothing and says why
    Given Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor offers nothing
    When he taps Send to the makers
    Then the mill received 0 grists for the lampas app, kind feedback
    And the composer says "tap Send to the makers"

  Scenario: Send in the Verse view's Ask with a picture in the row asks the Talk sheet's tutor, with the picture attached
    Given Lampas is opened on Romans 8 with the Verse view's Ask open behind a fake Postern whose tutor offers nothing
    When he attaches a picture and types "What is the Spirit's work" in the Ask composer
    And he taps Send in the Ask composer
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And that grist has the picture attached

  Scenario: Your requests lists a request sent from the Talk sheet
    Given Lampas is opened on the Reader behind a fake Postern whose tutor offers nothing
    When he opens the Talk sheet on the chapter and types "The Greek keyboard is missing" without sending it
    And he taps Send to the makers
    And he opens Your requests
    Then Your requests lists "The Greek keyboard is missing"
