# Demo: share or paste a screenshot into a tutor talk (mw-y3qno5.3)

The epic mw-y3qno5 made Lampas take pictures in a tutor talk and made Lampas a share target. This is the Governor's check on
his phone: a Logos screenshot goes into his latest talk, a second into a new talk, a copied picture is pasted into a talk, and
the Greek words the tutor quotes can be tapped to hear. When it all behaves as written, he says "Looks good".

Needs the installed Lampas on an Android phone with Chrome, on the updated version (reload when the app says "Update ready,
tap to reload"), a connection to the tutor, and Logos with a lexicon entry (BDAG **δακρύω** is the example). Have at least one
earlier talk in Lampas, so there is a latest talk to continue.

## Share a Logos screenshot into your latest talk

1. In Logos open the entry for **δακρύω** (BDAG) and take a screenshot.
2. Tap **Share** on the screenshot, then **Lampas** in the share list. Lampas opens on **Share to Lampas**, which says "1
   picture from another app. Where should they go?". If **Lampas** is not in the list, see "If Lampas is missing from the
   share list" below.
3. Tap **Continue: …** (the first button; it names your latest talk and when you had it). The talk opens with the picture
   waiting under **Pictures to send**. Nothing has been sent yet.
4. In **Your message** type "What does this say about Jesus weeping?" and tap **Send**. His turn shows the picture as a small
   thumbnail with the question.
5. When the answer comes, the Greek it quotes (**δακρύω**, **ἐδάκρυσεν**) are dotted words. Tap one: the phone says it in
   Greek. Tap the thumbnail in your turn: the picture opens full screen; Back closes it.

## Share a second screenshot to a new talk

1. Take another Logos screenshot, tap **Share**, then **Lampas**. **Share to Lampas** opens again.
2. Tap **New talk**. A fresh talk opens (**Talk with the tutor**) with the picture under **Pictures to send** and an empty
   **Your message**. (**Choose a talk** instead lists your recent talks, newest first, to pick an older one.)
3. Type a question and tap **Send**. The answer quotes its Greek as dotted words you can tap to hear, as before.
4. Leave Lampas for another app and come back: the talk is where you left it.

## Paste a copied picture in a talk

1. Open **Romans 8** and tap the bar **Talk about Romans 8** to open the talk.
2. Copy a picture on the phone (for example long-press an image in Chrome and choose **Copy image**, or use the clipboard
   suggestion in Gboard).
3. Press and hold in **Your message** and choose **Paste** (or tap the picture offered above the keyboard). The picture
   waits under **Pictures to send**; copied words still paste as words.
4. Tap **Remove picture 1** to take it away again, paste it once more, and tap **Send**.

## If Lampas is missing from the share list

Chrome lists an installed web app in the share list from its manifest. A phone that installed Lampas before sharing was added
keeps the old manifest, so:

1. Remove Lampas from the home screen (press and hold the icon, **Uninstall** or **Remove**).
2. Open https://lampas.allmymind.org in Chrome, wait for the page to load, and tap the Chrome menu, then **Install app** (or
   **Add to Home screen**, then **Install**).
3. Open Lampas once from its new icon. Your key, words and talks live in Chrome's storage for the site, so they are usually
   still there; if Lampas asks for a licence instead, the key on its screen is the one to issue a licence to, as before.
4. Share a screenshot again: **Lampas** is now in the list.

## Right

- **Share to Lampas** opens with **Continue: …** first, then **New talk**, then **Choose a talk**.
- A shared or pasted picture waits under **Pictures to send** with his words; it is sent only when he taps **Send**.
- The tutor reads the text in the picture, and the Greek it quotes can be tapped to hear, like any other Greek in the app.
- Going out of the app and back keeps the talk where he left it.

Then: "Looks good."

## Known differences (his word decides which become stories)

- The steps are written from the code and its tests; whether Chrome lists Lampas in the share sheet, and whether Gboard
  offers a copied picture, depends on the phone and is not checked here.
- At most 4 pictures go in a turn, only JPEG, PNG or WebP; anything else says "Only JPEG, PNG or WebP pictures can be sent."
