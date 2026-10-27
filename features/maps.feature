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

  Scenario: A verse that names a place leads with the maps that show it
    Given Lampas is opened on "Genesis 10"
    When he taps verse 10
    Then the Verse view has a button "Maps · 6"
    When he taps "Maps · 6"
    Then the sheet is headed "Maps for Genesis 10:10"
    And the sheet opens with "For this verse" and then "In this chapter"
    And the part "For this verse" holds "The Tower of Babel, c. 2200 BC · Babylon" and "Mesopotamia, Babylon"
    And the groups read "Events, Regions, Videos"
    And "Events" holds "Sodom and Gomorrah Are Destroyed, 2100 to 2090 BC"
    And "Regions" holds "Ararat" and "Table of Nations: Ham’s Descendants"

  Scenario: A passage that names a place says For these verses
    Given Lampas is opened on "Romans 8"
    When he taps the heading "Walking by the Spirit"
    And he taps "Maps · 1"
    Then the sheet is headed "Maps for Romans 8:1-11"
    And the sheet opens with "For these verses" and then nothing
    And the part "For these verses" holds "The Roman Empire, Rome"

  Scenario: A verse that names no place the maps show has the sheet as before
    Given Lampas is opened on "Genesis 10"
    When he taps verse 19
    And he taps "Maps · 6"
    Then the sheet has no part for the verse
    And the groups read "Events, Regions, Videos"

  Scenario: The chapter foot's door opens the sheet for the chapter
    Given Lampas is opened on "Genesis 10"
    When he taps the foot's door "Maps · 6"
    Then the sheet is headed "Maps for Genesis 10"

  Scenario: A whole chapter's sheet has no part for a verse and keeps Bible Mapper's order
    Given Lampas is opened on "Genesis 10"
    When he taps the foot's door "Maps · 6"
    Then the sheet is headed "Maps for Genesis 10"
    And the sheet has no part for the verse
    And the groups read "Events, Regions, Videos"
    And "Regions" holds "Mesopotamia", "Ararat" and "Table of Nations: Ham’s Descendants"

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

  # Two sources at once (mw-zbjgn3r.6): a link-only test source ("Test Atlas") beside Bible Mapper's test cards. Its rows open elsewhere, never the map view; the door counts both;
  # where one source has no map for the chapter the other's block is the whole sheet; a switch in Settings turns a source off.

  Scenario: Both sources answer: Bible Mapper's block, then the link-only source's under its name
    Given Lampas is opened on "Genesis 10" with the test atlas On
    When he taps verse 19
    Then the Verse view has a button "Maps · 8"
    When he taps "Maps · 8"
    Then the sheet is headed "Maps for Genesis 10:19"
    And the groups read "Events, Regions, Videos, Test Atlas"
    And "Events" holds "The Tower of Babel, c. 2200 BC" and "Sodom and Gomorrah Are Destroyed, 2100 to 2090 BC"
    And the "Test Atlas" block holds "Test Atlas at Shinar, Opens in Logos" and "Test Commentary at Genesis 10, Opens on the web"
    And the row "Test Atlas at Shinar" opens "logos4:Atlas;id=SHINAR" and falls back to "https://atlas.test/shinar"
    And the row "Test Commentary at Genesis 10" opens "https://atlas.test/commentary" in the browser

  Scenario: A link-only source's row opens its link and never the map view
    Given Lampas is opened on "Genesis 10" with the test atlas On
    When he taps verse 19
    And he taps "Maps · 8"
    And he taps the link row "Test Commentary at Genesis 10"
    Then only the sheet is open

  Scenario: Where Bible Mapper has no map for the chapter the other source's block is the sheet
    Given Lampas is opened on "Genesis 11" with the test atlas On
    Then the chapter foot has a button "Maps · 1"
    When he taps the foot's door "Maps · 1"
    Then the sheet is headed "Maps for Genesis 11"
    And the groups read "Test Atlas"
    And the "Test Atlas" block holds "Test Atlas at Babel, Opens on the web"

  Scenario: With the link-only source off the sheet is as before
    Given Lampas is opened on "Genesis 10" with the test atlas Off
    When he taps verse 19
    Then the Verse view has a button "Maps · 6"
    When he taps "Maps · 6"
    Then the groups read "Events, Regions, Videos"

  Scenario: With Bible Mapper off and the link-only source on, only its block
    Given Lampas is opened on "Genesis 10" with the test atlas On and Bible Mapper Off
    When he taps verse 19
    Then the Verse view has a button "Maps · 2"
    When he taps "Maps · 2"
    Then the groups read "Test Atlas"
    And the "Test Atlas" block holds "Test Atlas at Shinar, Opens in Logos" and "Test Commentary at Genesis 10, Opens on the web"

  # The Logos Atlas (mw-zbjgn3r.7): the real source (src/maps/sources/logosatlas.ts) beside the test Bible Mapper, with the test places (Genesis 10:19 names Gerar, Admah and Lasha, Psalms 147:2 Jerusalem and Zion)
  # and a shelf that holds the Lexham Geographic Commentary on the Pentateuch On. It rides on Logos and its rows open in Logos.

  Scenario: With Logos On, a verse's sheet ends with the Logos Atlas block: the atlas at the places and the commentary at the verse
    Given Lampas is opened on "Genesis 10" with Logos On
    When he taps verse 19
    Then the Verse view has a button "Maps · 8"
    When he taps "Maps · 8"
    Then the groups read "Events, Regions, Videos, Logos Atlas"
    And the "Logos Atlas" block holds "Logos Atlas at Gerar, Admah, Lasha" and "Lexham Geographic Commentary on the Pentateuch at Genesis 10:19, Opens in Logos"
    And the row "Logos Atlas at Gerar, Admah, Lasha" opens "https://app.logos.com/tools/atlas/BIBLICALWORLDPREPATRIARCHALPERIOD-EN?zoom=7&style=terrain&lat=31.4096&lng=35.1860&layout=one" in the browser
    And the row "Lexham Geographic Commentary on the Pentateuch at Genesis 10:19" opens "logosres:lxgeocommpent;ref=Bible.Ge10.19" and falls back to "https://ref.ly/logosres/lxgeocommpent?ref=Bible.Ge10.19"

  Scenario: Where Bible Mapper has no map and the commentary does not cover the book, the Logos Atlas block alone is the sheet
    Given Lampas is opened on "Psalms 147" with Logos On
    When he taps verse 2
    Then the Verse view has a button "Maps · 1"
    When he taps "Maps · 1"
    Then the groups read "Logos Atlas"
    And the "Logos Atlas" block holds "Logos Atlas at Jerusalem, Zion"
    And the row "Logos Atlas at Jerusalem, Zion" opens "https://app.logos.com/tools/atlas/BIBLICALWORLDPREPATRIARCHALPERIOD-EN?zoom=8&style=terrain&lat=31.7738&lng=35.2327&layout=one" in the browser

  Scenario: A verse the atlas has a map for lists that map, not the base map
    Given Lampas is opened on "Genesis 11" with Logos On
    When he taps verse 4
    Then the Verse view has a button "Maps · 3"
    When he taps "Maps · 3"
    Then the groups read "Logos Atlas"
    And the "Logos Atlas" block holds "Logos Atlas: The Tower of Babel, Pre-patriarchal period", "Logos Atlas: Biblical World — Pre-patriarchal period, Pre-patriarchal period" and "Lexham Geographic Commentary on the Pentateuch at Genesis 11:4, Opens in Logos"

  Scenario: With Logos Off the Logos Atlas has no block
    Given Lampas is opened on "Genesis 10" with Logos Off
    When he taps verse 19
    Then the Verse view has a button "Maps · 6"
    When he taps "Maps · 6"
    Then the groups read "Events, Regions, Videos"

  Scenario: About lists the Logos Atlas
    Given Lampas is opened on "Genesis 10"
    When he opens About
    Then About names "Logos Atlas"
