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
