Feature: Ask for another grammar book
  Under Settings > Study resources > Logos > Grammar books there is a line, Ask for another book (mw-5r3p30.382, PROVISIONAL). He, or any
  reader, types the title of a grammar book from their Logos library, and the author if they know it, and taps Send. The request goes to
  the factory as a feedback request of the kind grammar-book, the way the tutor's asks do, and Your requests keeps it. The line then
  says Asked, with the words. The line is a button that opens the box in place, so the Logos card stays short. Nothing is added to the
  app until a story adds the book's entry. With the phone offline the request is kept on the phone and goes by itself when the phone
  is back online.

  Scenario: Asking for a book sends one request and the line says Asked
    Given Settings is open with Logos on behind a fake Postern
    When he opens Ask for another book
    And he types "Mounce, Basics of Biblical Greek" as the book title
    And he taps Send for the book
    Then the mill received one grist of the kind feedback with the kind grammar-book, the title and the app version
    And the line says "Asked: Mounce, Basics of Biblical Greek"
    And the phone keeps one request row of kind grammar-book with the title, status sent
    And the Ask for another book box is empty

  Scenario: Send waits for a title
    Given Settings is open with Logos on behind a fake Postern
    When he opens Ask for another book
    Then Send for the book is disabled
    When he types "Mounce" as the book title
    Then Send for the book is enabled

  Scenario: Offline the request waits and goes when the phone is back online
    Given Settings is open with Logos on behind a fake Postern
    And the phone is offline
    When he opens Ask for another book
    And he types "Mounce, Basics of Biblical Greek" as the book title
    And he taps Send for the book
    Then the line says "Waiting to send: Mounce, Basics of Biblical Greek"
    And the mill has received no grist
    When the phone is back online
    Then the mill received one grist of the kind feedback with the kind grammar-book, the title and the app version
    And the line now says "Asked: Mounce, Basics of Biblical Greek"
    And no request waits on the phone

  Scenario: A request that waits is still there when Settings is opened again
    Given a request for "Black, Learn to Read New Testament Greek" waits on the phone
    And Settings is open with Logos on behind a fake Postern
    And the phone is offline
    Then the line says "Waiting to send: Black, Learn to Read New Testament Greek"

  Scenario: The mill is down: the request keeps waiting and Try again sends it
    Given Settings is open with Logos on behind a fake Postern
    And the mill is down
    When he opens Ask for another book
    And he types "Mounce, Basics of Biblical Greek" as the book title
    And he taps Send for the book
    Then the line says "Waiting to send: Mounce, Basics of Biblical Greek"
    And the line shows "Could not reach the tutor"
    When the mill is back and he taps Try again
    Then the line now says "Asked: Mounce, Basics of Biblical Greek"
    And the mill received one grist of the kind feedback with the kind grammar-book, the title and the app version
