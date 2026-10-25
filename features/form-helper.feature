Feature: Let the tutor do it
  A form in Lampas can offer a button at its top, 'Let the tutor do it'. The tutor then takes him through the form one
  question at a time in plain words, asks for a photo at the moment it is needed (the form's own picker), and after each answer the
  matching field of the form fills, where he sees it. When every required field is filled the tutor says so; he reads the form, changes
  anything and taps Send himself: the tutor never sends. The first form to offer it is Ask for another approach. A form that has a command its own
  Send runs (Ask for another approach: ask-for-approach, Ask for a book: ask-for-book, Ask for more: ask-for-more) ends the panel with the command's offer line and a Send button; his tap on it runs the very command
  the form's Send runs. The tutor is the bible-talk grind; here the grist is faked.

  Scenario: The tutor takes him through the Ask for another approach form, one question at a time
    Given the Ask for another approach sheet is open behind a fake Postern
    Then the sheet offers "Let the tutor do it" at its top
    When he taps "Let the tutor do it"
    Then the tutor asks one question: "What approach would you like to suggest, and how does it teach?"
    And the mill received one bible-talk grist whose form lists the four fields with their labels, hints and required flags
    When he answers "Teach the cases with colours, one case at a time."
    Then the field "What approach, and how does it teach?" holds "Teach the cases with colours, one case at a time."
    And the tutor then asks one question: "Who made this approach, so we can credit them?"
    When he then answers "Anna Example"
    Then the field "Who to credit" now holds "Anna Example"
    And the tutor next asks one question: "Do you have a screenshot or a photo of it?"
    And a button "Choose a photo" is offered
    When he presses "Choose a photo"
    Then the form's own picker opens
    When he picks a photo
    Then one picture is listed in the form
    And the tutor lastly asks one question: "Is there a link where it can be found?"
    When he finally answers "example.org/greek"
    Then the field "Link" also holds "example.org/greek"
    And the panel shows "Send this approach, credit Anna Example?" with a Send button
    And the sheet's own Send button is enabled
    And the form was not sent

  Scenario: A field the form does not have is not filled, and he can stop the help at any time
    Given the Ask for another approach sheet is open behind a fake Postern
    And the tutor will answer with a value for a field the form does not have
    When he taps "Let the tutor do it"
    Then the form is unchanged
    When he stops the help
    Then the button "Let the tutor do it" is offered again

  Scenario: The tutor asks one question even when the model keeps talking after it
    Given the Ask for another approach sheet is open behind a fake Postern
    And the tutor will ask a question and then add more sentences
    When he taps "Let the tutor do it"
    Then the tutor asks one question: "Who made this approach, so we can credit them?"
    And the tutor's extra sentences are not shown

  Scenario: Ask for a book: the tutor asks which book, fills the fields and ends with a Send that runs the form's own command
    Given the Ask for a book sheet is open behind a fake Postern
    Then the book sheet offers "Let the tutor do it" at its top
    When he taps "Let the tutor do it" on the book sheet
    Then the tutor asks one question: "Which book would you like to ask the makers for?"
    And the mill received one bible-talk grist whose form is Ask for a book with its three fields, the kind a choice, and the command ask-for-book
    When he answers "Lenski, Romans"
    Then the book title holds "Lenski, Romans" and is ringed
    And the panel shows "Send: Lenski, Romans?" with a Send button
    When he then answers "It is a grammar."
    Then Kind of book is "Grammar"
    When he next answers "It explains the cases."
    Then Why would it help? holds "It explains the cases."
    And the panel now shows "Send: Lenski, Romans, Grammar?" with a Send button
    And the book was not sent
    When he taps Send in the panel
    Then the mill received one feedback grist of kind book with the title "Lenski, Romans", the kind grammar and the reason "It explains the cases."
    And the book sheet says "Sent: the factory has it"
