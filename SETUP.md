# Community update: deployment checklist

This pull request is not a live Firebase deployment. Merge only after testing against a separate Firebase test project and publishing the matching backend/rules. The frontend expects the new backend; without it, new uploads, entrance checks and admin actions fail closed. Existing account login remains Firebase Authentication.

## Prerequisites (project owner, on their own computer)

- Firebase CLI and Google Cloud CLI, authenticated to the intended Firebase project. Never put service account credentials or account passwords in this repository, Vercel environment variables, chat, or client configuration.
- Enable Cloud Storage and Cloud Functions billing as required by Firebase. Upgrade Authentication to **Identity Platform** for blocking functions. Review any existing blocking functions first: authentication hooks are project-wide and this code must be integrated with existing hooks rather than blindly replacing them.
- Functions use Node.js 22 and `us-central1`. The client region must match if changed.
- Review the Firestore and Storage rules against the currently published rules before deploying. Preserve unrelated bucket paths if this Firebase project is shared by other applications. This repository previously only used inline Firestore images; `storage.rules` intentionally allows only private DM image paths.
- Review privacy policy/notice for admin-only email, login timestamp and IP collection; set an appropriate retention policy. Login history starts after this release, not retroactively. Set Firestore TTL on `entranceAttempts.expiresAt` to clean up rate-limit records. No other collections are automatically expired.

## Validate locally

```sh
npm ci
npm --prefix functions ci
npm test
npm --prefix functions run check
```

With Java 21+ and the Firebase CLI installed, run security-rule integration tests against emulators only:

```sh
firebase emulators:exec --project demo-midas-community --only firestore,storage "npm run test:rules"
```

The separate rule suite checks public creator reads, owner-only edits, protected email/login collections, participant-only image reads, blocked emails, invalid MIME and oversize uploads. It must pass before production deployment.

## Publish Firebase before releasing the frontend

The production web configuration currently selects Firebase project `midas-web-46ae8`. First validate the full flow with a separate test project's web configuration. Do not test destructive actions against real member accounts.

```sh
firebase deploy --project midas-web-46ae8 --only functions:midas-community,firestore:rules,storage
```

Firebase may ask to enable Firestore access from Storage rules. Approve that required service integration in your own authenticated CLI. Deploying this codebase does not deploy functions from other codebases.

Private images download through the authenticated SDK, not public download URLs. Apply the supplied GET-only CORS configuration to the existing bucket using your own Google Cloud account:

```sh
gcloud storage buckets update gs://midas-web-46ae8.firebasestorage.app --cors-file=storage.cors.json
```

Add exact preview/test origins to the CORS file while testing and remove them afterward. CORS is not authorization; the Storage rules enforce who can read the image. Do not switch the bucket to public access to resolve a CORS error.

## First admin setup

1. Open the website. Click the invisible 48×48 area in the upper-right corner on desktop; on touch devices double-tap within 400 ms. It is also keyboard-focusable with a visible focus ring. This opens the admin login, not privileged access. The normal navigation no longer lists Admin.
2. Log in using the existing Firebase admin account. In the new Entrance settings section, enter the new main entrance password (8–128 characters) and save it. The old hardcoded entrance password is intentionally removed. Until configured, visitor entrance checks fail closed. Existing browser entrance sessions remain admitted until that browser session ends. The admin shortcut always remains available for setup.
3. Choose and save the entrance background if wanted.
4. Under Creators, add a creator if necessary, open **Visit creator page**, expand **Edit creator page**, and assign the creator's existing signup email. Each creator has their own Firebase account password, not a publicly embedded or shared editing password. Only that assigned account or the admin may edit. Visitors never need the creator's login. Changing the creator password changes their account login; admin password changes revoke refresh tokens. Creators may need to log in again before changing their own password.
5. Under Admin, test room recovery, announcements, styles and blacklist actions. Room recovery looks up the signup email in Firebase Authentication. It restores an archive when present, otherwise creates a blank room. It never overwrites an existing room. Archive/delete keeps the account and associated media; it is not account deletion. Content deleted before backups existed cannot be recovered by this code.

## Behavior and limits

- DM images: original JPG/PNG/GIF/WebP up to 10 MiB per file; client and Storage rules both limit size/type. Only the two message participants can retrieve an attachment. Users can still save or share content they legitimately receive. Orphaned uploads may remain if a browser closes between upload and message publication; schedule cleanup if needed. Text-only messages remain supported.
- Profile pictures already existed in room settings; this update adds an input-size limit and a clear error when a picture exceeds its stored-avatar limit.
- Beat glow reads the main player's captured audio stream, never reroutes/mutes playback, respects reduced-motion and has a persistent on/off control. It is unavailable where audio capture is unsupported or denied (including some cross-origin tracks). Voice chat is not analyzed. Real-device audio verification is required.
- Admin, creator and sponsor name treatments are cosmetic. Admin can assign creator/sponsor styles by signup email; styling never grants editing permissions. Creator-page ownership is assigned separately. The admin badge is populated on the admin's next session observation.
- The built-in Greek myth is labeled **King Midas**. Custom stories titled exactly **Midas** (case-insensitive, surrounding whitespace ignored) always appear last, after the Add story control. This locks ordering, not reading or editing.
- Signup email directory and login history are admin-only, separate from public/member profiles. Existing account emails are populated on their next login/session observation; room recovery can look up an email immediately even before that. UID document keys remain unchanged to avoid breaking messages, friendships or ownership.
- Login history records the verified token's authentication time, once per session when the app observes it, with the Identity Platform sign-in IP where available. It is not a complete security audit: a client that bypasses the website can omit session observation. The UI shows the latest 100 entries.
- The blacklist stores a compact server-only aggregate for Storage authorization (subject to Firestore's 1 MiB document limit; intended for a modest community denylist). Email blocks immediately deny member Firestore/Storage access under these rules and revoke refresh tokens. Email and exact-IP blocking functions prevent future registrations and logins. New sessions carry a sign-in-IP claim, so subsequent blocks deny that session's member data too; old sessions without this claim must sign in again. Changing networks/VPNs can evade an IP block. Owner access is exempt to avoid accidental administrative lockout.
- IP blacklist also applies to entrance verification. **It does not block direct access to public static files, publicly readable Firestore documents or requests with no Firebase authentication.** Whole-site network blocking requires a separate edge/firewall policy; hiding a menu or blocking only browser JavaScript cannot provide that protection.
- The entrance is a courtesy screen, not server authorization. Gallery/story assets and creator pages were already publicly readable. Truly private visitor content would require an authenticated content-delivery redesign; this release does not claim to provide it.

References: [Firebase blocking functions](https://firebase.google.com/docs/functions/auth-blocking-events), [authenticated Storage downloads and CORS](https://firebase.google.com/docs/storage/web/download-files).
