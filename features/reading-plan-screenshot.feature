Feature: Send a screenshot of Audible on the return sheet
  Back from Audible, the return sheet "Where did you get to?" also offers "Send a screenshot": she picks a screenshot of Audible's now-playing screen,
  and the mill's audible-position grind reads the book, the chapter and the time played from it. A sheet "Your screenshot" says "Reading your screenshot..."
  while the grist runs. It proposes the chapter it read, says how sure it is in words, and takes one tap to accept: "Yes, that is where I am" ends the listening
  session and marks the plan as the picture says: a picture with time left in its chapter means she stopped in it (the plan is done through the chapter before it,
  so Next stays on that chapter); one at the chapter's end means she finished it (done through it). "Back to the choices" leaves the return sheet as it was.
  A screenshot with no chapter on it, or a chapter that is no chapter of the Bible, says so. The screenshot is the AI: a phone with no licence sends nothing,
  and its row says "Needs a licence", which opens the Licence page.

  Scenario: With a licence the return sheet offers Send a screenshot, a photo picker
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    Then the return sheet offers "Send a screenshot" as a picker of pictures

  Scenario: A screenshot read as Leviticus 3 with time left is proposed, and Yes keeps Leviticus 3 next
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    Then the sheet "Your screenshot" says "Reading your screenshot..."
    When the mill answers the book "Lev", the chapter 3, the position "2:41", the time left "-2:14" and the confidence "high"
    Then the sheet "Your screenshot" proposes "Leviticus 3" at "2:41"
    And it says "I am sure of it."
    And the proposal also says "You stopped partway in it: the plan stays at Leviticus 3."
    When she taps "Yes, that is where I am"
    Then both sheets are closed
    And the next chapter is "Leviticus 3" with 92 of 1189 done
    And no listening session is open
    And the picture went to the audible-position grind alone, with the chapter she set off from

  Scenario: A screenshot at the end of Leviticus 3 is proposed as finished, and Yes moves the plan on
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    And the mill answers the book "Lev", the chapter 3, the position "9:30", the time left "-0:00" and the confidence "high"
    Then the sheet "Your screenshot" proposes "Leviticus 3" at "9:30"
    And the proposal also says "You heard it to the end: the plan moves on."
    When she taps "Yes, that is where I am"
    Then both sheets are closed
    And the next chapter is "Leviticus 4" with 93 of 1189 done
    And no listening session is open

  Scenario: A guess says so in words
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    And the mill answers the book "Num", the chapter 2, the position "" and the confidence "low"
    Then the sheet "Your screenshot" proposes "Numbers 2"
    And it says "I am not sure: check it before you tap Yes."

  Scenario: Back to the choices leaves the return sheet and the session as they were
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    And the mill answers the book "Lev", the chapter 3, the position "2:41" and the confidence "medium"
    And it says "I think so, but check it."
    And she taps "Back to the choices"
    Then the sheet "Your screenshot" is closed
    And the return sheet is still open
    And a listening session is still open

  Scenario: A screenshot with no chapter on it says so
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    And the mill answers that the picture shows no chapter
    Then the sheet "Your screenshot" says "I could not find a chapter in that screenshot."
    And it offers no Yes

  Scenario: A chapter that is no chapter of the Bible is not proposed
    Given a licensed phone back from Audible after listening from "Leviticus 1"
    When she sends a screenshot
    And the mill answers the book "Jude", the chapter 3, the position "1:00" and the confidence "high"
    Then the sheet "Your screenshot" says "I could not find a chapter in that screenshot."

  Scenario: A grist that fails says so, and Try again reads the screenshot again
    Given a licensed phone back from Audible after listening from "Leviticus 1", and the mill fails the grist
    When she sends a screenshot
    Then the sheet "Your screenshot" says "Could not read the screenshot."
    When the mill will answer the book "Lev", the chapter 3, the position "2:41" and the confidence "high"
    And she taps "Try again"
    Then the sheet "Your screenshot" proposes "Leviticus 3" at "2:41"

  Scenario: With no licence Send a screenshot says Needs a licence and sends nothing
    Given a phone with no licence back from Audible after listening from "Leviticus 1"
    Then the return sheet has no picker of pictures
    And its row "Send a screenshot" says "Needs a licence"
    When she taps "Send a screenshot"
    Then the Licence page is open
    And no grist was sent
