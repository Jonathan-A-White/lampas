Feature: Study resources
  Settings has a Study resources section that lists every resource registered in src/resources/ with an on/off switch,
  all off to start with. A word's sheet shows a Study row with the links of every resource switched on (Strong's: its
  G-number as a link to the public STEPBible entry; Logos: Open in Logos: <lexicon> for each lexicon he ticked in Settings, BDAG by default, and
  Bible Word Study in Logos; Accordance: Open in Accordance, to his own copy of a lexicon), and no row when none is on. An app that does not open says so (features/app-missing.feature). Only links are built; no lexicon text is bundled
  or fetched. The switches are kept in the settings store and survive a close.

  Scenario: Settings lists Strong's, Logos and Accordance, all switched off
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    Then the Study resources section lists Strong's, Logos and Accordance
    And every study resource is switched off

  Scenario: With Strong's on, the word sheet shows the word's G-number as a link to its entry
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Strong's"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "G4903" to "https://www.stepbible.org/?q=strong=G4903"

  Scenario: With Logos on, BDAG is ticked and the word sheet shows Open in Logos: BDAG and Bible Word Study in Logos
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    Then the Logos lexicon "BDAG" is ticked
    And the Logos lexicon "Louw-Nida" is not ticked
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Logos: BDAG" to "logosres:LLS:46.30.18;hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"
    And the Study row also has a link "Bible Word Study in Logos" to "logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"
    And the Study row has no link "Open in Logos: Louw-Nida"

  Scenario: Each ticked Logos lexicon gives its own Open link
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he ticks the Logos lexicon "Louw-Nida"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Logos: BDAG" to "logosres:LLS:46.30.18;hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"
    And the Study row also has a link "Open in Logos: Louw-Nida" to "logosres:LLS:46.30.4;hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"
    And the Study row has one more link "Bible Word Study in Logos" to "logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: With EDNT ticked, Open in Logos: EDNT carries the Resource ID Logos prints for EDNT
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he ticks the Logos lexicon "EDNT"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Logos: EDNT" to "logosres:LLS:46.10.26;hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"
    And the Study link "Open in Logos: EDNT" has the fallback "https://ref.ly/logosres/LLS%3A46.10.26?hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: Bible Word Study in Logos names Jesus by his Logos lemma, and the BDAG link is unchanged
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he taps Back on the Settings screen
    And he taps the word "Jesus," in verse 1
    Then the Study row has a link "Open in Logos: BDAG" to "logosres:LLS:46.30.18;hw=%E1%BC%B8%CE%B7%CF%83%CE%BF%E1%BF%A6%CF%82"
    And the Study row also has a link "Bible Word Study in Logos" to "logos4:Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F%E1%BC%B8%CE%B7%CF%83%CE%BF%E1%BF%A6%CF%82"
    And the Study link "Bible Word Study in Logos" has the fallback "https://ref.ly/logos4/Guide;t=Bible%20Word%20Study;lemma=lbs%2Fel%2F%E1%BC%B8%CE%B7%CF%83%CE%BF%E1%BF%A6%CF%82"

  Scenario: A Logos link carries its https address for the case the app cannot be opened
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study link "Open in Logos: BDAG" has the fallback "https://ref.ly/logosres/LLS%3A46.30.18?hw=%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: With Strong's on, the Strong's number shows once on the word sheet
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Strong's"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then "G4903" appears once on the word sheet

  Scenario: With Accordance on, the word sheet shows Open in Accordance built from the lemma
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Accordance"
    And he taps Back on the Settings screen
    And he taps the word "work together" in verse 28
    Then the Study row has a link "Open in Accordance" to "accord://search/BDAG?%CF%83%CF%85%CE%BD%CE%B5%CF%81%CE%B3%CE%AD%CF%89"

  Scenario: With none on, the word sheet has no Study row
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the word "work together" in verse 28
    Then the word sheet has no Study row

  Scenario: The switches survive a reload
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Strong's"
    And he also switches on the study resource "Logos"
    And he ticks the Logos lexicon "Louw-Nida"
    And Lampas is opened again
    And he opens Settings again
    Then the study resource "Strong's" is switched on
    And the study resource "Accordance" is switched off
    And the Logos lexicon "Louw-Nida" is ticked
    And the Logos lexicon "BDAG" stays ticked

  Scenario: Searching the Logos lexicons narrows the list, and clearing the search brings every lexicon back
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he types "louw" in the Logos lexicons search
    Then the Logos lexicons list shows "Louw-Nida"
    And the Logos lexicons list does not show "BDAG"
    And the Logos lexicons list also does not show "EDNT"
    When he clears the Logos lexicons search
    Then the Logos lexicons list is back with "BDAG"
    And the Logos lexicons list also shows "Louw-Nida"
    And the Logos lexicons list holds 21 lexicons

  Scenario: A search with no match says so
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he types "zzz" in the Logos lexicons search
    Then the Logos lexicons list holds 0 lexicons
    And the Logos lexicons list says "No lexicon matches"

  Scenario: Ticking a lexicon found by search is saved as before
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he types "louw" in the Logos lexicons search
    And he ticks the Logos lexicon "Louw-Nida"
    Then the setting "resourceOption.logos" holds '["bdag","louwnida"]'

  Scenario: Ticked lexicons are listed first
    Given Lampas is opened on Romans 8 with no study resources on
    When he taps the gear in the reader's header
    And he switches on the study resource "Logos"
    And he ticks the Logos lexicon "EDNT"
    And Lampas is opened again
    And he opens Settings again
    Then the Logos lexicons list starts with "BDAG", "EDNT", "Louw-Nida"
