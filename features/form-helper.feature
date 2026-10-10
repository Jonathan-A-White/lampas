Feature: Let the tutor help me fill this in
  A form in Lampas can offer a button at its top, 'Let the tutor help me fill this in'. The tutor then takes him through the form one
  question at a time in plain words, asks for a photo at the moment it is needed (the form's own picker), and after each answer the
  matching field of the form fills, where he sees it. When every required field is filled the tutor says so; he reads the form, changes
  anything and taps Send himself: the tutor never sends. The first form to offer it is Ask for another approach. The tutor is the
  bible-talk grind; here the grist is faked.

  Scenario: The tutor takes him through the Ask for another approach form, one question at a time
    Given the Ask for another approach sheet is open behind a fake Postern
    Then the sheet offers "Let the tutor help me fill this in" at its top
    When he taps "Let the tutor help me fill this in"
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
    And the tutor says everything required is filled in
    And the Send button is enabled
    And the form was not sent

  Scenario: A field the form does not have is not filled, and he can stop the help at any time
    Given the Ask for another approach sheet is open behind a fake Postern
    And the tutor will answer with a value for a field the form does not have
    When he taps "Let the tutor help me fill this in"
    Then the form is unchanged
    When he stops the help
    Then the button "Let the tutor help me fill this in" is offered again
