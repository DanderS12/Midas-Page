# Community update using the existing Firebase setup

This version uses only the website's existing Firebase Authentication and Firestore. It does **not** use Firebase Storage, Cloud Functions, Identity Platform hooks, service-account credentials or a Vercel API token. No Storage upgrade is required by this code. Existing Firebase quotas still apply; compressed images consume Firestore storage, reads and bandwidth.

## What the owner needs to do

1. Back up the currently published Firestore rules. Publish this branch's **firestore.rules** to the existing Firebase project `midas-web-46ae8`, after running the security tests below. These replace the earlier draft rules: the previous draft does not allow compressed DM images, account-directory registration, observed-session logs or client-side admin recovery. Do not use the previous Storage rules: this version does not use that product.
2. Use this PR's latest Vercel preview to test with your admin account and two member accounts. No passwords or service-account credentials should be posted in chat, committed, or added to Vercel environment variables. There are no new environment variables to configure.
3. Test the entrance with your existing visitor password, then the upper-right admin shortcut (desktop click, mobile double-tap). Test password-reset email delivery using your own account. Firebase Auth must authorize the domains used for account operations.
4. After verification, merge the PR into the production branch and verify the resulting production deployment. Do not simply promote an older preview. Any configured Vercel rolling-release process still applies.

Publishing Firestore rules cannot be done through this Vercel session's supplied authentication; it requires the owner's Firebase access. The source changes alone do not publish rules.

## Testing

```sh
npm ci
npm test
```

Security integration tests require Java 21+ and the Firebase CLI, using a **local demo project**, never production:

```sh
firebase emulators:exec --project demo-midas-community --only firestore "npm run test:rules"
```

The rule tests cover participant-only DM reads, JPEG/size validation, creator edit ownership, admin-only email visibility, authentic token identity/session fields, blocked-email data access, and exact-copy archived deletion/restoration.

## Features and deliberate limits

- **Message images:** accepts JPG/PNG/GIF/WebP input up to 10 MiB, then converts it to a JPEG at most 900 pixels on its longest side and below 900,000 characters. The original 10 MiB file is **not** retained. GIF/WebP animation and transparency are lost. Compressed image data is stored with the message in Firestore; only the sender and recipient can read it under the rules. Text-only messaging remains supported. The original app never used Firebase Storage for images.
- **Profiles:** existing profile-picture editing remains in room settings, with a 10 MiB input limit and validation for the smaller stored avatar. Member profiles remain member-only; creator pages are public after the courtesy entrance.
- **Creator pages:** public content with creator/admin editing. An admin assigns ownership using the member's signup email **after that member has logged in once with this version**. The member's Firebase UID stays the ownership key; cosmetic badges do not grant permissions. Creators can request their own password-reset email. Admins can send that email to an assigned creator but cannot select another person's password. Admin password reset remains the existing Firebase email-reset flow.
- **Email directory:** only admins can read it. Each member can write only their own token email and UID. Existing users must log in once to register their email. The app cannot query Firebase Authentication's full user list without a trusted backend. Do not expose the whole directory publicly to work around a missing email.
- **Room recovery:** admins can find a registered member by signup email, atomically archive/delete a room, and restore it later. Recovery never overwrites an existing room. Accounts and related media are not deleted. Deletions predating an archive can only be replaced with a blank room. Members whose emails have not been registered must log in once before email-based recovery/ownership/style assignment is available.
- **Observed logins:** admin-only sessions observed by this website. Email, token authentication time and server observation time are checked by rules; entries cannot be edited. There is no IP collection. This is **not** a mandatory security audit: a client that bypasses the website can omit the observation. The UI shows the latest 100 observations. Set a retention policy appropriate to your privacy obligations.
- **Email blocking:** denies signed-in member Firestore access. It does **not** prevent Firebase login, new registrations under other emails, public page reads or anonymous comments/chat. The owner is exempt to avoid administrative lockout.
- **IP blocking:** configure separately in Vercel Firewall. The app contains no misleading local IP-blacklist controls and does not embed a Vercel token. Vercel rules protect requests to the Vercel website, not direct requests to Firebase. No Vercel firewall configuration is changed by this PR.
- **Entrance:** preserves the original visitor password as a SHA-256 comparison until the admin changes it. The admin may change it and its background in the site admin panel. The digest is intentionally public and comparison is in the browser: like the original entrance, it is a **courtesy screen, not content security**. Use a visitor-only password, never one reused for an account or anything sensitive. Existing admitted browser sessions remain admitted until that session ends. Firebase rules and Firebase account authentication—not the entrance—protect member/admin data.
- **Hidden admin entry:** invisible 48×48 upper-right button, click on desktop or double-tap within 400 ms on touch devices. Keyboard focus remains visible. It opens a login screen and grants no privilege by itself.
- **Story order:** custom stories titled exactly `Midas` (case-insensitive, surrounding whitespace ignored) stay last, separate from the built-in `King Midas` myth. This locks tab order, not story editing.
- **Beat glow:** analyzes a captured copy of the music player's audio without rerouting playback, honors reduced-motion, and has a persistent on/off control. Unsupported browsers and denied cross-origin captures leave normal playback unchanged. Voice chat is not analyzed. Verify on real target devices.

If you previously deployed any Functions or enabled paid Firebase products outside this session, removing their source from this PR does not disable or delete those live resources. Review them separately before making billing changes.

## Community safety and convenience additions

This revision needs the **latest Firestore rules** published before release. The prior rules do not allow read markers, member blocks or reports.

- **Unread messages:** navigation badge counts incoming messages without a read marker, excluding locally blocked senders. Opening a conversation marks incoming messages read only while the document is visible. Existing messages with no marker initially count as unread. These are account-wide read markers, not device-local counts. No sender-facing read-receipt UI is added.
- **Member blocking:** block/unblock from a room or conversation; manage your blocks in Settings → Friends & status. Rules reject new DMs, friend requests, follows, notifications and wall posts in either direction. Previous messages remain participant-readable in Firestore but are hidden in this UI while blocked. Existing friendships/follows aren't deleted. This is not a whole-site block, voice-room separation or IP ban.
- **Reports:** members can report another member or a received message with a written reason. Admin → Safety & 18+ shows reports and resolve/reopen controls. Reports are allegations, not independently verified evidence. Only admins can read them. No private-message body or image is automatically copied to a report; the message reference is validated against its recipient/sender by rules. Report reasons are user text and can still contain sensitive information; review your privacy/retention policy. No automatic email/push moderation notification or server-side rate limiter is provided.
- **Image preview:** local original-file preview, remove-selection button, input validation and compression/saving phase indicators. It is not a byte-percentage upload progress bar. Preview URLs are revoked on replacement/removal/navigation. Sent images are still compressed JPEGs, not originals.
- **Unsaved-change warning:** internal link navigation, browser back/forward and browser page-exit guard protect edited Settings/Admin forms and message drafts. It is conservative and can warn after independently saved admin actions; browser close warnings depend on browser support/user interaction. Drafts are not stored permanently and are discarded if you confirm leaving. Tab switches preserve them.
- **Room search:** filters already-loaded member rooms by display name only, case-insensitively. Does not search or expose signup emails.
- **Announcement expiry:** optional local date/time on publish; visitors' UI hides it at that time (checked every second) without deleting its Firestore document. Existing no-expiry announcements remain supported. Browser clock changes affect hiding. Admin can still see and remove expired announcements. Expiry is not authorization for sensitive content.
- **Content backups:** Admin → Backups downloads a manual JSON export of the explicit content/room collections and room archives. Private messages, login records, email directory, reports, member blocks and adult-only media are excluded. Includes member room content and site settings, so keep it private. Linked assets aren't downloaded. Large exports can use significant Firestore reads/memory; collections are read sequentially and the export is not an atomic snapshot. A failed read stops the export instead of returning an incomplete file. No bulk import, scheduled backup or Firebase disaster-recovery claim is made. Existing archived-room recovery remains in Members & rooms.

Verify with two test accounts before production: unread marking, block/unblock enforcement in both directions, report privacy and admin review, image removal/progress, canceled navigation, room filtering, announcement expiry, and a downloadable export that excludes private collections.

## New themes and visitor effects

Five year-round presets are available in **Admin → Appearance → Main site theme** and **Settings → Appearance → Quick themes**: Midnight Gold, Royal Vault, Golden Marble, Neon Midas, and Art Deco. These are coordinated color/effect palettes, not downloaded background textures. Golden Marble is a light palette; the others are dark. Existing theme selection and user settings are unchanged unless explicitly saved.

The visitor-level **Reduce effects** control remembers its preference on that browser. It hides particle/cursor canvases, stops decorative heading/disc animation and beat glow, and respects the system reduced-motion preference even when the custom toggle is off. It does not stop music playback. An OS reduced-motion preference can therefore keep effects reduced regardless of the button.

## Unique display-name rollout (required before new signup)

1. Test and publish this revision's latest Firestore rules, including `displayNames` reservations. These are newer than the previously published rules.
2. Open **Admin → Members & rooms → Prepare unique names**. It scans current rooms and archives, reports existing collisions, and reserves eligible existing names before enabling `settings/site.namesReady`. Partial failure does not enable signup; running again is safe. Do not manually enable that flag before preparation finishes.
3. Existing duplicate names are **not renamed automatically**. Agree on a replacement with the member, then use **Rename member to resolve conflict** by signup email and run preparation again. The email directory requires that the member signed in once. Conflicting archived rooms may require admin review of their archive; do not delete them just to bypass a conflict. Old admin-renamed reservations are conservatively retained.
4. Test signup from two accounts attempting the same name, and profile renaming. New names allow 3–24 ASCII letters/digits, spaces, `_` and `-`. Whitespace is trimmed/collapsed and comparison is case-insensitive: ` Midas ` and `MIDAS` reserve the same key. The restriction keeps client and rules normalization consistent. Existing other-script/punctuation/long names may stay unchanged but must use the new format if renamed.

Availability lookup is a public single-name lookup containing only a UID, not emails; collection listing remains admin-only. Availability is advisory until the profile+reservation transaction commits. Simultaneous claims resolve through Firestore's transaction/rules checks. A failed claim after Firebase Auth account creation can leave an account without a room; that user can log in and retry with another name in Settings. No existing account is deleted on failure. Room archive deletion retains name reservations. Admin restoration/rename is trusted and must avoid overriding other members' names.

Until preparation succeeds, new signup and new name changes are intentionally paused; existing users may still sign in and save unrelated profile fields without renaming. If reverting this UI while retaining these new rules, old signup code cannot create a room without a reservation.

## Lounge, music visuals and messaging refinement

This revision extends creator-owned page updates with safe external-button fields. **Publish the latest Firestore rules after emulator testing before creators save customized buttons.** Admin content remains admin-authorized. No Storage, Cloud Functions or new credentials are introduced.

- **Alerts:** DM notification rows are grouped by sender, with unread message counts; opening a group marks its existing alert records read. Other alert types stay separate. Legacy notification records are not deleted. Desktop DM popups are suppressed to avoid one popup per message; unread conversation and alert badges remain. This is presentation grouping, not a claim that repeated messages were duplicates.
- **Performance:** DM initially renders 80 recent messages with Load older messages in 80-message increments. Per-message safety forms are created only when opened. Read-marker-only snapshots don't reconstruct unchanged message DOM. Decorative animation rendering pauses while the document is hidden or Reduce effects applies. The full DM listener/history is still loaded; this reduces DOM work, not Firestore download volume. No measured production INP improvement is claimed. Reproduce the reported slow interaction and remeasure on the affected device before calling the INP warning fixed.
- **Block/report:** conversation/member actions are collapsed under “⋯ Member options”; individual received messages use “⋯ Message options.” Permission enforcement is unchanged. Controls are not removed.
- **Music visuals:** Settings → Music and Admin → Appearance offer Classic glow, Flames, Bubbles, Pink & gold neon, Off. Choice is per browser, not a forced global setting. Actual audio capture drives the effects; flames/bubbles add capped, short-lived CSS particles. No synthetic beat fallback or microphone capture. Unsupported audio capture leaves ordinary playback unchanged. Reduced-motion settings and hidden-tab pausing take priority. Flame/bubble intensity, sound sync and mobile rendering still need real-device testing.
- **Sponsor message:** Admin → Announcements → Pinned sponsor message edits text, optional HTTPS link and link label. Move between top/bottom of pages; it stays until removed and has no expiry. This is not free dragging/sticky viewport placement. Publicly readable site settings hold the pin—never include sensitive text. One pin is supported at a time.
- **Creator website buttons:** assigned creator/admin can edit the existing creator page's external HTTPS link plus button label, background color, text color, and rounded/pill/square shape, with a non-navigating editor preview. Published buttons open a new tab and use noopener/noreferrer. Choose contrasting colors; color customization does not guarantee accessibility. Creator and Sponsor cards retain existing links; full customization is in the creator page editor. No arbitrary CSS/HTML is accepted in button fields.
- **Cassie Lounge:** separate #cassie landing tab with pink/gold neon, a dark lounge backdrop, decorative CSS web corners, short entrance animation and links into existing public Live Chat/private Messages/Settings. Only this route changes the lounge backdrop; leaving restores the existing site. No separate chat room, new jazz track, copyrighted media or autoplay audio is added. Existing music autoplay remains subject to browser policy. Entrance effect honors Reduce effects/system reduced-motion.

Suggested next messaging work (not implemented here): compact/cozy layout choices, timestamp grouping, accessible emoji reactions, member-only public chat identities, server-enforced rate limits and an optional separate member lounge conversation. Keep typing indicators and read receipts opt-in for privacy. First test current blocking/reporting and large conversations before expanding features.

## Arcade Games

The navigation includes **Arcade Games** (`#arcade`) with heading **Dander's Arcade Games**. These are external game website buttons, not embedded games or executable uploads. No game links are preselected or invented.

Admins manage them in **Admin → Arcade Games**:

1. Select **Add game button** (up to 8).
2. Enter a title and an HTTPS website URL. URLs containing login credentials and non-HTTPS schemes are rejected.
3. Optionally select a JPG/PNG/GIF/WebP picture up to 10 MiB input. It is cropped/compressed to a 320×180 JPEG under 60,000 characters. Animation/transparency are not preserved. A very detailed image can be rejected; choose a simpler image. No Firebase Storage bucket or paid upgrade is introduced.
4. **Remove picture** keeps the game link; **Delete game button** removes its draft entry. These and all title/link changes publish only after **Save arcade games**. Saving an empty list clears the page's links.

Buttons render with or without pictures, open in a new tab with `noopener noreferrer`, and display an external-site notice. The public page has an empty state until the admin adds links. All data is stored in `settings/arcade`, separate from main site settings, to keep the bounded image list below the Firestore document limit. The existing `settings` rule already makes it public-read/admin-write; **this addition does not require another rule change**. Earlier creator-button rules from this PR are still needed for that earlier feature.

Arcade settings are included by the existing content backup's `settings` collection allowlist. Do not put credentials/private information in labels, URLs or pictures. Eight images may still consume approximately half a megabyte plus metadata and use Firestore reads/bandwidth; existing quotas apply. The game count/image validation is in the admin editor; admins already have trusted write access to settings. Invalid public records are omitted by the renderer. No new users/creators receive edit access.

Verification before release: open the public empty page; as admin add a no-image link and an image link, save, reload, edit the title/URL, remove an image and delete a game, then save/reload again. Confirm non-admins cannot write `settings/arcade` with the included emulator rule test. Check external game websites separately—the app does not control their availability, safety, content or privacy policy.
