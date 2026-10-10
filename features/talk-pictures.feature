Feature: The tutor talk takes pictures
  In the Talk sheet he can attach a picture (a screenshot of a lexicon entry, a page), take a photo with the camera or paste a copied
  picture into the message. Up to four go with one message, each cut down on the phone to at most 1600 px on the long edge before it is
  sent. They wait in the composer with a remove x, go with the message as the grist's attachments and show as thumbnails in his turn,
  where a tap opens one full screen and Back closes it. The pictures are kept with the talk, so a reopened talk still shows them. The
  tutor reads the text in them and quotes the words it discusses as plain text, so each quoted Greek word is a word he can tap to hear.
  The mill is the fake Postern of tests/support/fake-postern.ts; speech is the recording fake of tests/support/fake-speech.ts.

  Scenario: Attaching a picture shows its thumbnail in the composer with a remove x
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture
    Then the composer shows one thumbnail, "Picture 1", with a remove x
    And the picture button and the camera button are there to add more
    When he removes the first picture
    Then the composer shows no thumbnails

  Scenario: Send puts the picture in the grist's attachments and a thumbnail in his turn
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture
    And he types "What does this entry say?" and taps Send
    Then the mill received one grist for the lampas app, kind bible-talk, with the question "What does this entry say?" and one picture
    And the grist has one attachment of type "image/jpeg"
    And his turn shows one thumbnail "Picture 1"
    And the composer shows no thumbnails

  Scenario: A picture alone can be sent
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture
    And he taps Send
    Then the mill received one grist for the lampas app, kind bible-talk, with the question "Read the picture and tell me about it." and one picture

  Scenario: A pasted picture becomes an attachment
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he pastes a picture into the message
    Then the composer shows one thumbnail, "Picture 1", with a remove x

  Scenario: Pasted text is left alone
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he pastes only text into the message
    Then the composer shows no thumbnails

  Scenario: A fifth picture is refused with a message
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches 4 pictures
    And he attaches one more picture
    Then the sheet says "Four pictures at most"
    And the composer shows 4 thumbnails

  Scenario: Something that is not a picture is refused
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a file of type "application/pdf"
    Then the sheet says "Only JPEG, PNG or WebP pictures"
    And the composer shows no thumbnails

  Scenario: A 4000 px picture is sent at most 1600 px on the long edge
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture 4000 px wide and 3000 px high
    And he types "Read this" and taps Send
    Then no picture was drawn larger than 1600 px on its long edge
    And the grist has one attachment of type "image/jpeg"
    And the sent picture is under the grind's byte limit

  Scenario: The talk grind takes up to four pictures of the three kinds
    Then the bible-talk grind takes 0 to 4 attachments of "image/jpeg", "image/png" and "image/webp"

  Scenario: A Greek word the tutor quotes is a word he can tap to hear
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern, and the tutor's answer quotes the Greek word "δακρύω"
    When he sends "What does this entry say?"
    And he taps the Greek word "δακρύω" in the answer
    Then the phone is told to speak "δακρύω" in "el-GR"

  Scenario: A reopened talk still shows the pictures of his turn
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture
    And he types "What does this entry say?" and taps Send
    And his turn shows one thumbnail "Picture 1"
    And Lampas is closed and opened again on the same talk
    Then his turn shows one thumbnail "Picture 1"

  Scenario: A tap on a thumbnail opens the picture full screen and Back closes it
    Given Lampas is opened on Romans 8 with the Talk sheet open behind a fake Postern
    When he attaches a picture
    And he types "What does this entry say?" and taps Send
    And he taps the thumbnail "Picture 1" in his turn
    Then the picture "Picture 1" is open full screen
    When he presses Back
    Then no picture is open full screen
    And the Talk sheet is still open
