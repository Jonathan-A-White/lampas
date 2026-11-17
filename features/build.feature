Feature: The built app
  A real vite build of the app is a gate part of its own (mw-5r3p30.1175): one build, made once, is read by every scenario here. The manifest
  makes Lampas installable and hands web+lampas: links to the app, and the service worker precaches only the files that must be there at first
  (these scenarios were in install.feature and data.feature, which run in the shards; a build beside ~160 other files outran its shard).

  Scenario: The manifest makes Lampas installable
    Given the app is built
    Then the manifest names the app Lampas, display standalone, with 192 and 512 icons

  Scenario: The built manifest hands web+lampas: links to the app
    Given the app is built
    Then the manifest has a protocol handler for web+lampas that opens the reference in the address

  Scenario: Only the index, the lemma lexicon, the frequency table and Romans 8 are precached
    Given the app is built
    Then the service worker precaches data/index.json, data/lexicon.json, data/frequency.json and data/rom/8.json and no other chapter or Old Testament file
    And the service worker serves other chapters cache-first from a runtime cache
