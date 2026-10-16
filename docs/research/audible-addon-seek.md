# Research: a browser add-on that seeks his Audible audio Bible to the passage

Story mw-5r3p30.412. Written 2026-10-16 on cloud2. Research only: no screen of the app changed, nothing was installed on his phone, nothing
was bought, and no one signed in to his Audible account. The probes were `curl` calls to Audible's public pages and public catalogue API,
signed out, kept in /tmp and not committed.

His words (Postern general, 2026-10-15T11:37Z): "is there a way that you could develop a Chrome extension that works on the Android that would
be able to automatically go to the ... right book The Right chapter but it could even go to the right verse if you had your timings down ...
when you go lampus to you know the audible it can open up the audio Bible on the right place". And at 11:38Z: "trying to figure out if there's
a different way through Chrome [or] Firefox".

What Lampas does today (mw-5r3p30.390, `src/resources/audioBible.ts`): 'Listen in Audible' opens The Word of Promise in the Audible app
and says which chapter to pick ('In Audible: Chapters > Luke 15'). It cannot seek, because Audible publishes no link that does.

## The short answer

* **An add-on would work on Firefox for Android, and on nothing else that suits him.** Firefox for Android Release installs a self-made add-on
  from a file, once it is signed by Mozilla as an unlisted add-on (no public listing). No Chromium browser on Android runs a *self-made*
  extension today: Chrome has no extensions, Kiwi is dead, Edge takes only Microsoft's short list, and Vivaldi takes only what is in the
  Chrome Web Store.
* **Audible's web player plays on a phone's browser and is easy to seek.** Audible's help says the Cloud Player works in a phone's browser. Its
  own code (read from the public page, signed out) plays through one hidden `<audio id="audible-player">` element, and Audible's own seek is
  `audioPlayerElement.currentTime = ms / 1000`. A content script can do exactly that.
* **Audible's own data names the chapters 'Luke 15'.** Audible's public catalogue API, with no login, lists The Word of Promise's 1,252
  chapters with their start times to the millisecond: Luke 15 starts at 300,366,317 ms (83 h 26 min 6 s). This settles the guess mw-5r3p30.390
  marked UNVERIFIED (chapters are named by Bible book and chapter), with three exceptions listed below that today's label gets wrong.
* **The better find is not an add-on.** The web player's "Listen in app" button hands the place to the Audible *app* through a link Audible
  makes itself: `https://audible.smart.link/aexglzp2n?...&asin=B003UC45I8&position_from_start=<ms>&autoplay=true...`. That host is verified for
  the Audible Android app. Lampas could build the same link with the chapter's start time, from any browser, with nothing installed. Whether the
  app obeys `position_from_start` when Lampas (not the web player) sends it is the one thing that only his phone can show: **UNVERIFIED**.
* **Screen off.** Firefox for Android keeps a page's audio playing when it is minimised, with controls in the notification panel, and the web
  player sets those controls (it uses the Media Session API). The Audible app does this anyway. Neither was heard on a phone here.
* **Recommended:** first one tap on his phone to try Audible's own app link at Luke 15 (S if it works: Lampas's 'Listen in Audible' becomes
  a link to the chapter, in the real Audible app, with no add-on). Only if the app ignores the place: the Firefox add-on (M), which also means
  he reads in Firefox. Not the Chromium route (L, and fragile). The verse ("if you had your timings down") is a later, rougher step.

## (a) Can a self-made add-on be installed, and which Android browsers run Chrome extensions?

### Firefox for Android (Release): yes, signed, from a file

* **The path.** Mozilla's Extension Workshop, "Installing self-distributed extensions", Android section: save the file, then Settings >
  About Firefox, "Tap the Firefox logo five times in quick succession. This unlocks hidden menu items", then Settings > **Install Extension
  from File**, pick the file, tap **Add**.
  https://extensionworkshop.com/documentation/publish/install-self-distributed/
* **It is on Release, not only Nightly.** Bugzilla 1921902, comment 3: Mozilla's QA tested Release 131.0 on Android 13 and "The 'Install
  extension from file' is displayed on my device." Bugzilla 1880777 (FIXED, Firefox 133) had hidden it on Android below 10 and then put it
  back. https://bugzilla.mozilla.org/show_bug.cgi?id=1921902, https://bugzilla.mozilla.org/show_bug.cgi?id=1880777
  (Older posts saying "Nightly only" date from 2023, when it first came to Nightly: gHacks, 2023-12-18,
  https://www.ghacks.net/2023/12/18/firefox-nightly-for-android-lets-you-install-add-ons-from-files.)
* **It must be signed.** Extension Workshop, "Signing and distribution overview": "Extensions and themes need to be signed by Mozilla before
  they can be installed in release and beta versions of Firefox." Unlisted (self-distributed) signing is done with `web-ext sign` (version 8+
  supports it) or the AMO upload; automated validation, and "It can take up to 24 hours ... or longer if your submission is selected for
  manual review." An unlisted add-on can be manually reviewed at any time.
  https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
  Release Firefox for Android has no switch for unsigned add-ons (that preference works only on Developer Edition, Nightly and ESR, same page).
* **A collection is not the route.** The custom add-on collection (same five taps, then Settings > Custom Add-on collection) takes only add-ons
  *listed* on addons.mozilla.org: it would mean publishing a Lampas-and-Audible add-on to the public. https://maketecheasier.com/install-addon-firefox-android
* **What it costs him.** A Mozilla developer account (free) for the Mayor's side; on his phone, five taps once and one file. An add-on
  installed from a file is updated by installing the next file (or by an `update_url` the add-on names; not tried here on Android).
* **Since December 2023** every add-on on AMO marked Android-compatible is open to Firefox for Android users (Mozilla Add-ons blog,
  2023-11-28): https://blog.mozilla.org/addons/2023/11/28/open-extensions-on-firefox-for-android-debut-december-14-but-you-can-get-a-sneak-peek-today/

### Android browsers that run Chrome extensions, October 2026

| Browser | Chrome extensions? | A self-made one? | Source |
| --- | --- | --- | --- |
| Chrome for Android | No. The Web Store sends an extension to desktop Chrome. | No | https://web-highlights.com/blog/how-to-install-chrome-extensions-on-android/, https://www.quetta.net/blog/the-ultimate-guide-to-android-browsers-with-extensions-for-power-users-0218 |
| Kiwi | Was the one. "Kiwi Browser is now archived. It will no longer be maintained after January 2025." Its code went into Edge Canary. | Dead: no security fixes | https://github.com/kiwibrowser/src.next |
| Microsoft Edge | Yes, from its own store in the menu (Stable since March 2025, 22 at launch, "Beta" label), chosen by Microsoft | No way documented | https://www.howtogeek.com/microsoft-edge-on-android-has-extensions-now/ (2025-03-14), https://mobilesyrup.com/2025/03/17/microsoft-officially-adds-extensions-to-edge-for-android/ |
| Vivaldi | Yes, from the Chrome Web Store (Extensions > Open Chrome Web Store > Add to Vivaldi) | Only by putting it in the Chrome Web Store | https://www.makeuseof.com/chrome-extensions-android-vivaldi/ (2026-09-23) |
| Quetta, Lemur, Yandex (alpha) | Claimed by blogs (Quetta's own blog among them) | Not said | Quetta's blog above; https://www.makeuseof.com/android-browsers-that-run-extensions-chrome-keeps-leaving-out/ |

A self-made Chrome extension could reach Vivaldi only as an **Unlisted** Chrome Web Store item: "allows anyone to install your item if they
know its Chrome Web Store URL", and it goes "through the same" review as a public one
(https://developer.chrome.com/docs/webstore/cws-dashboard-distribution). That is a Google developer account, Google's review of an add-on that
changes Audible's page, and him moving to Vivaldi. The small browsers are not a place to type his Amazon password.

## (b) Does audible.com/webplayer play the book on a phone, and can a content script seek it?

**It plays in a phone's browser.** Audible help, "Listen on a browser": "You can also use the Cloud Player on your phone or tablet's mobile
browser", in the latest Chrome, Firefox, Safari or Edge (https://help.audible.com/s/article/listen-on-a-browser). Signed out, with a Firefox for
Android user agent, `https://www.audible.com/webplayer?asin=B003UC45I8` answers 200 with the page titled "Audible Cloud Player", the mobile
layout (`data-clientId="WebPlayerApplicationMobile"`, `data-isMobile="true"`) and "Kindly sign in to listen". Whether it plays *this* title for
*him* needs his sign-in, which this story does not do. One user (Mozilla support question 1456344, undated as found) reported Audible's
*samples* failing in Firefox on Android while Chrome played them: a risk to try first, not a finding.

**How it plays.** The player's public scripts (`@amzn/audible-web-player-client-assets`, loaded by that page) show:

* It renders one hidden element: `x("audio",{id:"audible-player",style:{display:"none"},preload:"metadata",autoPlay:!0})`.
* The SDK takes it by id and drives it with Shaka Player (MPEG-DASH): `this.audioPlayerElement=document.getElementById(e)`, and Audible's own
  seek is `seek(e){this.audioPlayerElement.currentTime=e/1e3}` (milliseconds in, seconds on the element). So setting
  `document.getElementById('audible-player').currentTime` from a content script is the same seek Audible's own buttons make.
* The audio may be Widevine-protected: the player asks for `com.widevine.alpha` licences at `/1.0/content/<asin>/drmlicense`, and also lists
  `Dash` and `Mpeg` delivery types (which of them his phone gets was not seen signed out). DRM does not stop a seek. Firefox for Android has played Widevine since Firefox 85, behind a one-time
  "Allow" prompt for protected content (XDA, 2021-02-01,
  https://www.xda-developers.com/firefox-85-android-play-drm-content-netflix-amazon/).
* It has a Chapters button that opens a bottom sheet of the chapters (the add-on does not need it: see the times below).
* It does not read `location.hash` anywhere, so a `#lampas=...` on the address is ignored by Audible and free for an add-on. But signed out,
  its sign-in link returns to `webplayer?asin=B003UC45I8&loginAttempt=true`, without the hash: the place should travel in the query
  (`&lampas=...`), or the add-on should keep it in storage before the sign-in.
* It restores his last position from Audible's server when it loads (`lastPosition`, `overrideLph`): an add-on must seek *after* that, or
  Audible moves it back.
* It sets `autoPlay`, but a phone's browser blocks sound until he taps: expect one tap on Play.

**The chapter list is public.** `https://api.audible.com/1.0/content/B003UC45I8/metadata?response_groups=chapter_info&chapter_titles_type=Tree`
answers with no login (also mirrored by Audnexus, `https://api.audnex.us/books/B003UC45I8/chapters`, `isAccurate: true`): 1,252 chapters over
98 h 2 min, a heading per book ('The Gospel According to Luke', 2 to 5 s) then one chapter each:

| Chapter | Starts at (ms) | Starts at | Length |
| --- | --- | --- | --- |
| Psalm 23 | 173,263,437 | 48 h 07 min 43 s | 1.4 min |
| Luke 15 | 300,366,317 | 83 h 26 min 06 s | 5.6 min |
| John 1 | 304,494,525 | 84 h 34 min 54 s | 6.1 min |
| Romans 8 | 324,394,430 | 90 h 06 min 34 s | 6.2 min |
| Revelations 22 | 352,710,049 | 97 h 58 min 30 s | 3.7 min |

The catalogue calls the book a `MultiPartBook` with 17 old parts (B003UCB1O4 ... B003VN5KEY), but the parts have no chapter data and the
parent's times run over the whole 98 hours: his library's single title (98 h 1 min in his screenshot) is the parent, ASIN B003UC45I8.

**Where today's label is wrong** (`audibleChapterLabel`, mw-5r3p30.390): Audible says **'Psalm 23'** (Lampas: 'Psalms 23'),
**'Revelations 22'** (Lampas: 'Revelation 22'), and the one-chapter books are a single chapter under the book's heading: **'The Book of
Obadiah'**, **'The Epistle of Paul the Apostle to Philemon'**, **'The Second Epistle of John'**, **'The Third Epistle of John'**, **'The
Epistle of Jude'** (Lampas: 'Obadiah 1', 'Philemon 1', '2 John 1', '3 John 1', 'Jude 1'). Deuteronomy 26 to 34 have two spaces
('Deuteronomy  26'), which looks the same on screen. Every other book matches by name.

## (c) Does it keep playing with the screen off?

* **Firefox for Android:** Mozilla's "Playing videos in Firefox for Android" says media goes on playing when Firefox is minimised, with
  controls in the notification panel; private tabs pause (https://support.mozilla.org/en-US/kb/playing-videos-firefox-android; the page
  refuses scripted reading, so this is as summarised by search, not quoted). The web player sets `navigator.mediaSession.metadata` and
  action handlers (play, pause, seek back and forward, previous and next track), so the notification has the title and buttons.
* **Chromium browsers:** media notifications and lock-screen controls come from the Media Session API on mobile
  (web.dev, "Customize media notifications", updated 2024-06-10, https://web.dev/articles/media-session).
* **The Audible app:** plays with the screen off and offline, as any audiobook app.
* **Not heard here:** a phone's battery saver can still stop a browser in the background; only his phone can show it for 98 hours of Widevine
  audio.

## Recommendation, beside mw-5r3p30.390's way

| Way | What he does | What Lampas or the Mayor builds | Size | Risk |
| --- | --- | --- | --- | --- |
| Today (mw-5r3p30.390) | Taps Listen in Audible, then Chapters > Luke 15 in the app | nothing | done | the label is wrong for Psalms, Revelation and the five one-chapter books |
| **1. Audible's own app link** | Taps Listen in Audible; the app opens at Luke 15 | the 1,252 start times as bundled data (a script reads Audible's public API once, like `data:build`); the link `https://audible.smart.link/aexglzp2n?annotation_time_utc=<now ms>&asin=B003UC45I8&autoplay=true&content_delivery_type=MultiPartBook&device_id=device_id&marketplace_domain=.com&narration_speed=1.00&position_from_start=<start ms>&site_id=1&source_code=Deep-link_Banner` as the href; the label fixed from the same data; ATTRIBUTION.md and the Preface name Audible's chapter data | **S** | UNVERIFIED on his phone: that the app takes the position from a link it did not make itself, and does not prefer his last position. Undocumented: Audible can change it. Without the app the link goes to the Play Store (checked: 302 to `com.audible.application`) |
| 2. Firefox add-on | Reads Lampas in Firefox; five taps and one file once; on Listen in Audible, the web player opens at Luke 15 and he taps Play | a small signed unlisted add-on: a content script on `www.audible.com/webplayer*` that reads `lampas=<ms>` from the query, waits for `#audible-player` to load and for Audible's own restore, then sets `currentTime`; Lampas's link `https://www.audible.com/webplayer?asin=B003UC45I8&lampas=300366317` | **M** | he reads in Firefox, not Chrome (a link from a Chrome PWA opens in Chrome); Audible can rename `audible-player`; the Widevine prompt; signing review; updates by file |
| 3. Chromium extension | Moves to Vivaldi | the same add-on as a Chrome extension, an unlisted Chrome Web Store item, Google's review | **L** | review of a script that changes Audible's page; a browser he does not use |

**Recommended: way 1 first, as a one-tap check before any build.** It needs nothing installed: the Mayor sends him one link (Luke 15's,
above) and he taps it on the phone where the Audible app is. If the app opens at Luke 15, the story that follows is S: Lampas's 'Listen in
Audible' becomes that link with the passage's start time, and today's line 'In Audible: Chapters > Luke 15' stays as the fallback. If the app
ignores the place, way 2 is the honest next step (M), and only if he is willing to read Lampas in Firefox. Way 3 is not worth its cost. Each
way gets the label fixes, which are worth doing alone (S, inside mw-5r3p30.390's module).

**The verse.** Audible has times for chapters only. A verse could be *estimated* inside the chapter (the chapter's start plus its length
times the share of the chapter's English before the verse), but this is a dramatised Bible with music and voices, so the estimate drifts by
seconds; a true verse map needs someone to mark each verse while listening. A later story, PROVISIONAL, after the chapter works.

**Fair use.** The start times are Audible's own public catalogue data and the link is the one Audible's page builds; an add-on that only moves
his own player in his own browser changes nothing for anyone else. Audible's Conditions of Use were not read for this note; the Governor
should know the app link is undocumented and an add-on alters Audible's page.

## What was run (2026-10-16, cloud2, signed out)

* `curl https://api.audible.com/1.0/content/B003UC45I8/metadata?response_groups=chapter_info&chapter_titles_type=Tree` and
  `https://api.audnex.us/books/B003UC45I8/chapters`: the chapter list above (counted and matched against `src/data/books.ts` and
  `src/data/otBooks.ts` with a throwaway Python script).
* `curl https://api.audible.com/1.0/catalog/products/B003UC45I8?response_groups=relationships,product_attrs,...` and each part's metadata
  (404 on chapters).
* `curl -A '<Firefox for Android>' https://www.audible.com/webplayer?asin=B003UC45I8`: the signed-out player page, then its
  `audible-web-player-client-assets` scripts from `m.media-amazon.com`, searched for the audio element, `currentTime`, DRM, `location.hash`
  and the app link (`data-openAppLink` and the code that fills `{POSITION_FROM_START}` with `Math.round(positionMs)`).
* `curl` of the app link with an Android Chrome user agent (302 to the Play Store, as with no app), and of
  `https://audible.smart.link/.well-known/assetlinks.json` (verified for `com.audible.application`).
* Nothing was installed, signed in to, bought or sent to his phone.
