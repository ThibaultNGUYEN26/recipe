# Google AdSense implementation guide

This document is a future implementation checklist for adding Google AdSense to Savor. A privacy policy is necessary, but it is not sufficient for AdSense approval or European privacy compliance.

> This is an engineering checklist, not legal advice. Requirements can change. Review the current Google policies and obtain legal advice when appropriate before enabling advertising.

## Current project status

The AdSense loader currently exists in `index.html` and uses publisher ID `ca-pub-8386651691969133`:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8386651691969133"
  crossorigin="anonymous"
></script>
```

This script loads globally and before the user has made a consent choice. Do not consider the current integration production-ready for advertising in the EEA, UK, or Switzerland.

The current privacy policy also says that Savor does not use tracking or advertising cookies. That statement must be corrected before AdSense is enabled.

## Requirements before applying

### 1. Publish valuable public content

Google reviews the entire site. Savor should have a meaningful collection of original, detailed, publicly accessible recipes before applying.

Recommended preparation:

- Publish enough complete recipes to make the site useful without an account.
- Include original descriptions, ingredients, instructions, tips, and useful cooking information.
- Avoid placeholder, copied, automatically generated, or nearly empty recipes.
- Ensure public recipe pages can be reached through normal navigation.
- Provide useful category, search, and discovery pages.
- Remove unfinished UI, broken links, and template assets such as the default Vite favicon.
- Make the production site usable on desktop and mobile.

Google may reject sites with insufficient original content as low-value or thin content.

### 2. Add permanent site information

Create clearly accessible footer or menu links for:

- About
- Contact, with a working contact method
- Privacy Policy
- Terms of Service
- Cookie settings or privacy choices

The Privacy Policy should accurately explain:

- Account and profile information collected by Savor
- Public recipes, comments, follows, ratings, and likes
- Authentication cookies
- Analytics identifiers and recommendation data
- Google AdSense and advertising partners
- Advertising cookies and browser storage
- Personalized and non-personalized advertising
- Data shared with Google and other disclosed providers
- Purposes and legal bases for processing where applicable
- Retention periods or retention criteria
- Account deletion and data export procedures
- How consent can be withdrawn
- User rights and how to exercise them
- A real privacy contact address

Do not claim that the app offers account deletion, data export, or privacy controls until those features or a genuine request process exist.

### 3. Install a compliant consent-management platform

For users in the EEA, UK, and Switzerland, use a Google-certified consent-management platform integrated with the IAB Transparency and Consent Framework. Google Privacy & Messaging is likely the simplest option for this project.

The consent experience should:

- Display before advertising storage or personalized ad processing begins.
- Offer accept, reject, and manage-options choices with appropriate prominence.
- Record the user's choice.
- Allow the user to change or withdraw consent later.
- Disclose Google and the configured advertising technology providers.
- Support the current IAB TCF version required by Google.
- Respect regional requirements rather than assuming one rule applies worldwide.

Useful Google documentation:

- [CMP requirements for publishers](https://support.google.com/adsense/answer/13554116)
- [European consent guidance](https://support.google.com/adsense/answer/9031649)
- [IAB TCF integration](https://support.google.com/adsense/answer/9804260)

### 4. Load advertising only when permitted

Do not leave the AdSense script as an unconditional tag in `index.html`.

The future implementation should:

1. Initialize the selected CMP.
2. Wait for the applicable consent state.
3. Configure personalized or non-personalized advertising as appropriate.
4. Load the AdSense script only when the CMP and Google policy permit it.
5. Avoid duplicate script injection during React navigation.
6. Render ad units only on approved content routes.
7. Re-evaluate ad behavior if the user withdraws consent.

Create a single advertising service or React provider rather than adding script-loading logic to individual pages. It should expose explicit states such as:

```ts
type AdvertisingState =
  | 'loading-consent'
  | 'not-permitted'
  | 'non-personalized'
  | 'personalized';
```

Do not build a home-grown consent banner that only hides visually while the AdSense script has already loaded.

## Safe ad placement strategy

Ads should supplement recipe content and must not be confused with navigation or app controls.

Potential placements:

- Between groups of recipe cards in the public home feed
- Between search-result groups when sufficient results exist
- Inside a recipe page after meaningful recipe content
- Near the end of a long recipe, before related recipes

Avoid ads on:

- Login and registration
- Forgot-password and reset-password pages
- Email-verification pages
- Settings and profile-editing forms
- Recipe creation and editing
- Admin pages
- Error and empty-state pages
- Dialogs, overlays, and confirmation screens
- Pages with little or no original content
- Positions close enough to like, save, comment, or navigation controls to cause accidental clicks

Do not encourage users to click advertisements or style advertisements to resemble recipes, buttons, or navigation.

## User-generated content responsibilities

Savor accepts recipes and comments from users, so moderation is part of AdSense readiness.

Before scaling advertising:

- Persist reports and provide an administrator review queue.
- Support reporting recipes, comments, and user profiles.
- Add blocking and abuse controls.
- Remove prohibited, copyrighted, dangerous, or deceptive content promptly.
- Publish content rules in the Terms of Service.
- Keep media moderation and upload protections operational.
- Provide a process for copyright and privacy complaints.

## Technical setup

### AdSense account connection

After the site is ready:

1. Add the production domain in AdSense.
2. Add the AdSense account meta tag or approved connection code.
3. Request a site review.
4. Wait for approval before expecting ads to serve.
5. Monitor the site's approval and policy status in AdSense.

Google's connection guide:

- [Connect a site to AdSense](https://support.google.com/adsense/answer/7584263)

### `ads.txt`

Create `public/ads.txt` so Vite deploys it at `/ads.txt`. Use the exact line provided by the AdSense dashboard. It will usually resemble:

```text
google.com, pub-8386651691969133, DIRECT, f08c47fec0942fa0
```

Do not blindly copy the example. Confirm the publisher ID and record in AdSense before deploying it.

Verify after deployment:

```text
https://your-production-domain.com/ads.txt
```

### Environment configuration

Prefer a frontend build variable instead of hard-coding the publisher ID:

```env
VITE_ADSENSE_CLIENT_ID=ca-pub-8386651691969133
```

This value is public and may be configured on Vercel. Do not place private keys or backend credentials in `VITE_*` variables.

### SPA considerations

Savor is a React single-page application. The implementation must account for client-side navigation:

- Do not inject the main AdSense script on every route change.
- Initialize individual ad slots after their containers mount.
- Clean up or refresh slots according to Google's documented SPA behavior.
- Avoid displaying stale ads when navigating to excluded routes.
- Test browser back/forward navigation.
- Ensure route-specific canonical URLs and page titles are correct.

## SEO and discoverability preparation

AdSense approval and sustainable traffic both benefit from pages that search engines can understand.

Recommended improvements:

- Unique title and description metadata for every public recipe
- Canonical URLs
- Open Graph and social preview metadata
- Recipe structured data using schema.org
- A generated XML sitemap
- A useful `robots.txt`
- Descriptive image alternative text
- Stable public URLs
- Server rendering or prerendering if crawler rendering proves unreliable

## Validation checklist

Before requesting review:

- [ ] Production domain works over HTTPS.
- [ ] Public recipes are usable without authentication.
- [ ] The site contains sufficient original, complete recipes.
- [ ] About, Contact, Privacy, Terms, and cookie-settings links are visible.
- [ ] Privacy Policy accurately describes advertising and cookies.
- [ ] A Google-certified CMP is active where required.
- [ ] Rejecting advertising consent prevents prohibited ad storage and requests.
- [ ] Consent can be changed or withdrawn.
- [ ] AdSense does not load on authentication, settings, editing, admin, error, or empty pages.
- [ ] Ad placements cannot be confused with app controls.
- [ ] Reports and user-generated content moderation are operational.
- [ ] `ads.txt` is available at the production domain root.
- [ ] AdSense connection code uses the correct publisher ID.
- [ ] Recipe metadata, canonical URLs, and sitemap are available.
- [ ] Mobile and desktop layouts have been tested.
- [ ] No console errors, broken routes, or placeholder assets remain.
- [ ] The site has been submitted for AdSense review.

## Suggested implementation order

1. Increase the quantity and quality of public recipe content.
2. Finish account deletion, data export, reporting, and contact workflows.
3. Rewrite the Privacy Policy and add Terms, About, and Contact pages.
4. Configure Google Privacy & Messaging or another certified CMP.
5. Replace unconditional AdSense loading with consent-aware loading.
6. Add route-aware ad components only to content-rich pages.
7. Add `ads.txt`, metadata, structured data, and sitemap support.
8. Test consent and ads from European and non-European regions.
9. Request AdSense review.
10. Monitor policy notifications, consent rates, performance, and accidental-click risk.

## Maintenance

Review this document before every major advertising change. Recheck Google's policies periodically, especially consent-framework versions, regional consent requirements, prohibited-content rules, and SPA integration guidance.

