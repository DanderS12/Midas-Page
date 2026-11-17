# GitHub Pages standby site

Main: https://thegoldentouch.app stays on Vercel.
Standby: https://backup.thegoldentouch.app is intended for GitHub Pages.

This PR prepares files only; it does not enable GitHub Pages, publish DNS, issue a certificate, or change Firebase. Do not publish the DNS CNAME until GitHub confirms the custom domain is assigned to this repository. This avoids a dangling-domain takeover risk.

## Owner steps on GitHub

1. Verify your custom domain in your GitHub account if not already verified (recommended by GitHub).
2. Merge this PR. Also merge/reconcile the tested website changes from PR #4 before considering the backup a current copy: this setup branch is based on main and does not itself include newer unmerged features.
3. In repository Settings → Pages → Build and deployment → Source, choose **Deploy from a branch**. Select **main**, folder **/(root)**, then **Save**.
4. In **Custom domain**, enter `backup.thegoldentouch.app`, then **Save**. The included CNAME file has that same value. Do not enter the primary apex domain here.
5. Confirm the custom domain belongs to this repository and tell the Vercel Agent it is configured. Only then create the following DNS record in the authoritative zone:

   Name: backup
   Type: CNAME
   Target: danders12.github.io

   Do not change apex, www, nameservers, or existing Vercel records. This target deliberately excludes the repository name.
6. After DNS/certificate provisioning completes, enable **Enforce HTTPS** when GitHub makes it available. Allow time for DNS propagation. Test the backup directly.

## Firebase and testing

In the existing Firebase project's Authentication → Settings → Authorized Domains, add `backup.thegoldentouch.app` if not already authorized. Review any Google Cloud API-key HTTP-referrer restrictions too; allow the exact backup origin if necessary. Do not change the Firebase project/config or loosen Firestore rules. Never send credentials through chat.

Both hosts use the same existing Firebase data, so writes on the backup affect the live site as well. Authentication/session storage is origin-specific: users may need to log in again. Test entrance, login/reset email, image upload, admin writes, audio and voice separately on the backup. Do not assume cross-origin browser/audio features work without checking.

The .nojekyll file tells GitHub Pages to publish the static files without Jekyll processing. The site uses relative assets and hash navigation, suitable for static hosting. No new third-party dependencies, secrets, or build scripts are needed. The repository is already public; branch/root publishing makes static source/config documents available publicly, as the existing code already is. Firebase web configuration is not an admin credential; keep actual secrets out of all published files. Vercel-only analytics endpoints may be absent on Pages.

## Scope and limits

- This is a manual standby URL, NOT automatic failover of the primary domain.
- Future merged main-branch changes publish to Pages. Vercel previews or manually promoted unmerged branches do not automatically update main/Pages.
- Both copies depend on Firebase. A Firebase outage affects both.
- Vercel firewall/IP blocks and deployment protection do NOT protect the Pages site. Public content remains public; Firebase rules still enforce database access.
- Never leave a DNS CNAME pointing to a disabled/unclaimed Pages site. Remove the DNS record if retiring the backup.
- Whole-domain failover requires a separately designed health-checked DNS/proxy service, with TLS, security and caching reviewed.

References:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
https://firebase.google.com/docs/auth/faq-and-troubleshooting
