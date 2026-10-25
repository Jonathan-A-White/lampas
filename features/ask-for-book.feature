Feature: Ask for a book
  One sheet, Ask for a book, replaces the four boxes that asked the makers for a book (mw-rfjjzd.14, PROVISIONAL; docs/design/library-at-scale.md
  section 6). It opens from the Library, the idea sheet (Ask for a grammar), Settings > Daily (Ask for a devotional) and Ask for more (A study
  resource), with the kind of book preset where the place has one. With a Logos list kept, he searches the books Lampas cannot use and a pick fills
  the request with the row's Resource ID, Type, Series and ReferenceSupersets; without one he types the title. Send posts one feedback grist of the
  kind book. A book already asked, or already in the catalogue, is refused with a line. After an import, Ask the makers about these sends one grist
  of the kind library with the counts by Logos type and the usable rows as library.csv, and no second one until the catalogue changes or 30 days pass.

  Scenario Outline: The sheet opens from each place with the kind preset
    Given the app is open at <place> behind a fake Postern
    When he taps "<button>"
    Then the sheet "Ask for a book" is open with the kind "<kind>"

    Examples:
      | place                  | button               | kind       |
      | the Library            | Ask for a book       | Any kind   |
      | an idea sheet          | Ask for a grammar    | Grammar    |
      | Settings > Daily       | Ask for a devotional | Devotional |
      | the Ask for more page  | A study resource     | Any kind   |

  Scenario: Without a list kept the title is typed, the sheet says what is sent, and one book request goes
    Given the app is open at the Library behind a fake Postern with no list kept
    When he opens Ask for a book
    Then the sheet has no search of his books
    And the sheet says in one line what is sent
    And Send is disabled
    When he types the title "Lenski, Romans" and the reason "To read beside the Greek."
    And he taps Send in the sheet
    Then the mill received one feedback grist of kind book with the title "Lenski, Romans" and the reason and no Logos details
    And the sheet says "Sent: the factory has it"
    And the phone keeps one request of kind book with the words "Lenski, Romans"
    And Your requests lists it as "Book"

  Scenario: With a list kept he searches the books Lampas cannot use and a pick fills the request
    Given the app is open at the Library behind a fake Postern with a list kept
    When he opens Ask for a book
    And he searches his other books for "hendriksen"
    Then the results are "Exposition of Paul's Epistle to the Romans" and nothing from the books Lampas opens
    When he picks "Exposition of Paul's Epistle to the Romans"
    Then the sheet shows the book picked with its type and series
    When he taps Send in the sheet
    Then the mill received one feedback grist of kind book with that row's Resource ID, Type, Series and ReferenceSupersets

  Scenario: The kind preset by the place goes with the request
    Given the app is open at Settings > Daily behind a fake Postern
    When he taps "Ask for a devotional"
    And he types the title "Spurgeon, Faith's Checkbook"
    And he taps Send in the sheet
    Then the mill received one feedback grist of kind book with the title "Spurgeon, Faith's Checkbook" and the kind devotional

  Scenario: A book he already asked for is refused with its line
    Given the app is open at the Library behind a fake Postern with no list kept
    And he asked for "Mounce, Basics of Biblical Greek" on 21 Oct
    When he opens Ask for a book
    And he types the title "mounce basics of biblical greek"
    And he taps Send in the sheet
    Then the sheet says "You asked for this on 21 Oct. Your requests follows it."
    And the mill has received no grist

  Scenario: A book already in the catalogue is refused with its line
    Given the app is open at the Library behind a fake Postern with no list kept
    When he opens Ask for a book
    And he types the title of a book the catalogue lists
    And he taps Send in the sheet
    Then the sheet says "Lampas opens this one: turn it On"
    And the mill has received no grist

  Scenario: Offline the request waits and goes when the phone is back online
    Given the app is open at the Library behind a fake Postern with no list kept
    And the phone is offline
    When he opens Ask for a book
    And he types the title "Mounce, Basics of Biblical Greek"
    And he taps Send in the sheet
    Then the sheet says "Waiting to send: Mounce, Basics of Biblical Greek"
    And the mill has received no grist
    When the phone is back online
    Then the mill received one feedback grist of kind book with the title "Mounce, Basics of Biblical Greek" and no Logos details
    And the sheet says "Sent: the factory has it"

  Scenario: The tutor's Send and the sheet's own Send post the same request fields for the same values
    Given the app is open at the Library behind a fake Postern with no list kept
    When he opens Ask for a book
    And he types the title "Lenski, Romans", picks the kind "Commentary" and writes the reason "To read beside the Greek."
    And he taps Send in the sheet
    Then the mill received one feedback grist of kind book, which is kept as the hand's request
    When the app is opened again behind a fake Postern whose tutor will fill those same three values
    And he opens Ask for a book
    And he lets the tutor do it and taps the Send the panel ends with
    Then the mill received one feedback grist of kind book whose fields are the hand's request, field by field

  Scenario: Ask the makers about these sends the whole list once, with the usable rows attached
    Given his Logos list is read on the import screen and holds books Lampas cannot use
    Then nothing has been sent
    When he taps "Ask the makers about these"
    Then the mill received one feedback grist of kind library with the counts by Logos type
    And it carries one attachment library.csv of type text/csv under 200 KB
    And the file's header is ResourceId, Type, Title, Series, ReferenceSupersets
    And the file holds the usable books and no manuscript
    And the page says "Asked on" the day, the number of books, and "The makers add what fits with each update."
    And the phone keeps one request of kind library

  Scenario: A second library request is refused until the catalogue changes or 30 days pass
    Given a library request was sent 5 days ago under this catalogue version for 412 books
    When he reads his Logos list on the import screen again
    Then Ask the makers about these is not offered
    And the page says the card's line for 412 books
    And the Library card says the same line
    When the library request is sent anyway
    Then it is refused with that line and the mill has received no grist
    When the library request was sent 31 days ago
    Then asking the makers about these is allowed again
    When the library request was sent 5 days ago under another catalogue version
    Then asking the makers about these is allowed under the new catalogue

  Scenario: Ask for more keeps its other forms and has no study-resource box
    Given the app is open at the Ask for more page behind a fake Postern
    Then it offers the forms "An approach or programme", "A text" and "A translation" and the button "A study resource"
    And "A study resource" opens no form of its own
