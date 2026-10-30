Feature: Settings after the library
  His Logos library has a screen of its own (#/library), so Settings no longer lists books (mw-rfjjzd.5, docs/design/library-at-scale.md 3.8). Its door is a row of Study resources directly under the Logos switch,
  indented, with Bible in Logos for each part (mw-rfjjzd.23: the Logos switch governs everything Logos); with Logos Off neither is drawn. It says "Your Logos library · N books on" and opens the Library; the lexicon list, Grammar books and the Works list
  are gone from Settings. Bible in Logos is a picker for each part with a door to Library > Bibles, where the Resource ID can still be typed. Daily's Which devotional is a searchable picker of the devotionals that are on, with Random,
  and In the draw follows the shelf. The Settings search finds a book by its title and opens the Library at it.

  Scenario: The Settings home has no Your Logos library row; Which languages? is first
    Given the shelf holds the books "BDAG, Louw-Nida, LSB" and Settings is open at its home
    Then the first row under the search field is "Which languages?"
    And the Settings home shows no row "Your Logos library"

  Scenario: With Logos On, Study resources show Your Logos library directly under the Logos switch
    Given the shelf holds the books "BDAG, Louw-Nida, LSB" and Settings is open at Study resources with Logos On
    Then the row under the Logos switch is "Your Logos library · 3 books on"
    When he taps the row "Your Logos library · 3 books on"
    Then the Library home opens

  Scenario: The count follows the shelf
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    Then the row under the Logos switch is "Your Logos library · 1 book on"
    And Study resources show no Logos lexicons, no Grammar books and no Works list

  Scenario: With Logos Off, Study resources show nothing of Logos under the switch
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos Off
    Then Study resources show no Your Logos library row and no Bible in Logos
    And the Settings search for "bdag" shows no book of the library

  Scenario: The Study resources group hint names the library
    Given the shelf holds the books "BDAG" and Settings is open at its home
    Then the Study resources group hint is "Your Logos library, links to the tools you own, Bible in Logos and maps"

  Scenario: A link to the library setting opens Study resources at the row, marked
    Given the shelf holds the books "BDAG" and Settings is open at its home
    When a link opens the setting "library"
    Then the Study resources show the row "Your Logos library · 1 book on" marked

  Scenario: The Settings search finds Your Logos library under Study resources
    Given the shelf holds the books "BDAG" and Settings is open at its home
    When he searches Settings for "library"
    Then the search answers the row "Your Logos library" under "Study resources"
    When he taps the answer "Your Logos library"
    Then the Study resources show the row "Your Logos library · 1 book on" marked

  Scenario: Bible in Logos opens Library > Bibles, where the Resource ID can be typed
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    When he taps the row "One Bible for all three, or type a Resource ID"
    Then the Library opens at Bibles
    When he types the Resource ID "LLS:MYOWNBIBLE.1" on the Bibles page
    Then the setting "logosBible" holds "LLS:MYOWNBIBLE.1"

  Scenario: Choosing a Bible in the Library is the Bible in Logos
    Given the shelf holds the books "BDAG" and Settings is open at Study resources with Logos On
    When he taps the row "One Bible for all three, or type a Resource ID"
    And he chooses the Bible "ESV" on the Bibles page
    Then the setting "logosBible" holds "LLS:1.0.710"

  Scenario: Which devotional is a searchable picker of the devotionals that are on, with Random
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer" and Settings is open at Daily with Which devotional on Random
    Then the Which devotional picker offers "Random, The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer"
    When he searches the Which devotional picker for "praise"
    Then the Which devotional picker narrows to "The Heart of Praise"
    When he picks "The Heart of Praise" in the Which devotional picker
    Then the setting "devotional" holds "LLS:HEARTOFPRAISE"

  Scenario: In the draw follows the shelf
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer" and Settings is open at Daily with Which devotional on Random
    Then In the draw says "2 devotionals are in the draw"
    When he turns the devotional "Manual of Family Devotions: Arranged from the Book of Common Prayer" Off in the Library
    And Settings is open at Daily with Which devotional on Random
    Then In the draw now says "1 devotional is in the draw"

  Scenario: The Settings search finds a book by its title
    Given the shelf holds the books "BDAG" and Settings is open at its home
    When he searches Settings for "bdag"
    Then the search answers the book "BDAG · Your Logos library"
    When he taps the answer "BDAG · Your Logos library"
    Then the Library opens at Lexicons at the book "BDAG"
