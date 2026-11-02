# Talencia concept: Supabase setup

The site runs in **demo mode** by default (no sign-in, mock data from `data/demo/`). Live mode turns on real
sign-in and data once these steps are done. Nothing in the browser ever uses the service-role key.

## 1. Database
Open the project's **SQL editor**, paste `supabase/schema.sql` and run it once. It creates the tables, the
sign-up hook that makes a profile (and an organization for practices), the `claim_role`, `claim_shift`,
`clock_in` and `clock_out` functions, and Row Level Security on every table.

## 2. Auth URLs
**Authentication → URL configuration**
- Site URL: `https://terrellfrancistk-cpu.github.io/tkhub-talencia-concept-preview/`
- Redirect URLs: `https://terrellfrancistk-cpu.github.io/tkhub-talencia-concept-preview/portal/**`
  (add `http://localhost:8765/tkhub-talencia-concept-preview/portal/**` for local testing)

## 3. Sign-in methods (Authentication → Sign in / Providers)
- **Email**: on by default. Password sign-in, sign-up confirmation and magic links all use it.
- **Google**: create an OAuth client in Google Cloud, add the callback URL Supabase shows, paste the client ID and secret.
- **Apple**: needs an Apple Developer account, a Services ID and a key; paste them into the Apple provider.
- **LinkedIn**: use the **LinkedIn (OIDC)** provider with an app from the LinkedIn developer portal.
These need each company's developer account, so Talencia sets them up. Until a provider is on, its button shows an error.

## 4. Connect the site
In `config.js` set `supabase.url` and `supabase.anonKey` (Project settings → API), then either set
`mode: 'live'` or test first with `?env=live` on the portal URL (and `?env=demo` to go back).

## 5. Optional: two-step sign-in
Accounts that enrol an authenticator app (Supabase MFA, TOTP) are asked for the 6-digit code after their password.

## 6. Importing the old app's data
See `import/`. Export the old data to JSON (`organizations.json`, `people.json`, `shifts.json`, `timesheets.json`,
`invoices.json`, `credentials.json`, `rewards.json`), adjust field names in `import/mapping.ts` if needed, then:

```
cd supabase/import && npm install
npm run dry-run            # adapts everything, writes import-report.json, changes nothing
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run import
```
Re-running is safe: every row is keyed on its old id (`legacy_id`). Imported people get accounts without passwords
and sign in with a magic link or "Forgot password".
