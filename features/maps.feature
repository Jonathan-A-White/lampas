Feature: Maps on the screen (mw-zbjgn3r.2, docs/maps.md)
  A quiet door "Maps · N" opens the maps of the place he reads: on the Verse view (a verse, and a passage opened from a heading) and at the foot of every chapter, Old and New Testament.
  It is never in the verse text, and with the Immersive reader On the Reader has none (the Verse view keeps it). The sheet groups the maps as Events, Regions and Videos, each with its period;
  a map opens in the app with the credit Bible Mapper asks and a link back. These scenarios use a map source of the tests' own: no data file is read and no picture is fetched.

  Scenario: A verse with maps has the door on the Verse view
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    Then the Verse view has a button "Maps · 6"
    And no verse of the text holds a Maps door

  Scenario: A chapter with no maps has no door
    Given Lampas is opened on "Genesis 11"
    Then the chapter foot has no Maps door
    When he taps verse 1
    Then the Verse view has no Maps door

  Scenario: Every chapter foot has the door, the New Testament's too
    Given Lampas is opened on "Romans 8"
    Then the chapter foot has a button "Maps · 1"

  Scenario: The Immersive reader has no door in the Reader, and the Verse view keeps it
    Given Lampas is opened on "Genesis 10" with the Immersive reader On
    Then the chapter foot has no Maps door
    When he taps verse 19
    Then the Verse view has a button "Maps · 6"

  Scenario: The sheet groups the maps and gives each its period
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    And he taps "Maps · 6"
    Then the sheet is headed "Maps for Genesis 10:19"
    And the groups read "Events, Regions, Videos"
    And "Events" holds "The Tower of Babel, c. 2200 BC" and "Sodom and Gomorrah Are Destroyed, 2100 to 2090 BC"
    And "Regions" holds "Mesopotamia", "Ararat" and "Table of Nations: Ham’s Descendants"
    And the video "Genesis 10" opens "https://biblemapper.com/blog/genesis_10/" in the browser

  Scenario: The chapter foot's door opens the sheet for the chapter
    Given Lampas is opened on "Genesis 10"
    When he taps the foot's door "Maps · 6"
    Then the sheet is headed "Maps for Genesis 10"

  Scenario: A map opens in the app with its credit and the way back to the site
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    And he taps "Maps · 6"
    And he taps the map "Sodom and Gomorrah Are Destroyed"
    Then the map is headed "Sodom and Gomorrah Are Destroyed" with the period "2100 to 2090 BC"
    And the map's picture is "https://biblemapper.com/blog/images/lo-res/test-map.jpg"
    And the credit reads "Map by David P. Barrett, biblemapper.com" and "biblemapper.com" links to "https://biblemapper.com"
    And "About this map" links to "https://biblemapper.com/blog/sodomandgomorrah/"
    And "Full size" opens "https://biblemapper.com/blog/sodomandgomorrah/"
    And the link "All maps for Genesis 10 at Bible Mapper" goes to "https://biblemapper.com/blog/mapfinder/?ref=Genesis%2010"
    When he taps the map's picture
    Then the picture is shown at twice the width
    When he taps the map's picture again
    Then the picture is shown at the width of the box

  Scenario: Back from the map returns to the sheet, then to the verse
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    And he taps "Maps · 6"
    And he taps the map "Mesopotamia"
    And he goes Back
    Then the sheet is headed "Maps for Genesis 10:19"
    When he goes Back
    Then no sheet is open and the Verse view shows

  Scenario: Offline the picture's place says so and every link stays
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    And he taps "Maps · 6"
    And he taps the map "Ararat"
    And the picture fails to load
    Then the map's picture place says "The map needs the internet"
    And "About this map" links to "https://biblemapper.com/blog/ararat/"
    And the credit reads "Map by David P. Barrett, biblemapper.com" and "biblemapper.com" links to "https://biblemapper.com"

  Scenario: About lists Bible Mapper
    Given Lampas is opened on "Genesis 10"
    When he opens About
    Then About names "biblemapper.com"
