# Moral Parliament Quiz - Development Guide

## Status

Production-ready. Refactored from single 816-line file to 25-file modular architecture.

---

## Work in Progress: New Questions & Causes

Replacing the original demo questions/causes with real content. Original configs backed up to `config_archive/`.

### Architecture Changes Made
- Questions can now have different option keys (previously all questions shared the same keys)
- Default credences now derived per-question from options (equal split) instead of global `defaultCredences`
- `generateWorldviews` updated to handle different option keys per dimension
- MaxEV calculation now always winner-take-all (ignores diminishing returns config)
- Added `context` field to questions (renders above instructions on QuestionScreen)
- InfoTooltip now supports markdown (use `[link text](url)` in `info` fields)
- Selection questions use separate instructions (no "Custom Mix" mention)
- Calculation method order configurable via `features.json` → `calculations.order`
- Renamed "Merged Favorites" to "Proportional Allocation" in copy.json

### Questions Implemented (6 of 7)
All questions are `type: "selection"` (pick one, no sliders).

| # | ID | Topic | Pattern | Multiplier range |
|---|-----|-------|---------|------------------|
| 1 | `disability` | Human disability vs saving lives | `appliesWhen: preventsDisability` | 0 - 0.086 |
| 2 | `income` | Income vs saving lives | `appliesWhen: increasesIncome` | 0 - 0.0172 |
| 3 | `chicken` | Chicken vs human welfare | `appliesWhen: helpsChickens` | 0 - 0.0172 |
| 4 | `shrimp` | Shrimp vs human welfare | `appliesWhen: helpsShrimp` | 0 - 0.0172 |
| 5 | `timeframes` | Short vs. long-term effects | `appliesTo: timeframe` | per-timeframe (0-1) |
| 6 | `xrisk` | Existential risk priority | `appliesWhen: isNonXRisk` | 0 - 1 |

### Causes Implemented (6)
| Cause | Key properties | scaleFactor |
|-------|----------------|-------------|
| Blindness Prevention | `preventsDisability`, `isNonXRisk`, `timeframe: short` | 1 |
| Basic Income | `increasesIncome`, `isNonXRisk`, `timeframe: short` | 1 |
| Chicken Welfare | `helpsChickens`, `isNonXRisk`, `timeframe: short` | 100 |
| Shrimp Welfare | `helpsShrimp`, `isNonXRisk`, `timeframe: short` | 1000 |
| AI Safety Research | `timeframe: long`, x-risk | 1 |
| Pandemic Prevention | `timeframe: short`, x-risk | 1 |

### Config Settings
- `diminishingReturns: "extreme"` (power = 0.1)
- All causes have `points: 100`

### Pending/Notes
- Question spec mentions chicken/shrimp weights should depend on Q1 answer (not implemented - using fixed 0.0172 default)
- **Q6 (risk) - NOT IMPLEMENTED**: Removed pending manager feedback. Requires architectural changes - causes need probability distributions and calculation methodology changes (upside skepticism = truncate 99th percentile, loss aversion = 3x weight on negative outcomes). See `question.txt` for full spec.
- `scaleFactor` on animal causes represents relative population scale (not currently used in calculations)

### WorldviewDimension Patterns
Two patterns are supported for applying multipliers:

**Pattern 1: `appliesWhen` (boolean flag)**
```json
"worldviewDimension": {
  "appliesWhen": "helpsChickens",
  "applyAs": "multiplier",
  "options": { "equal": 1, "10x": 0.1, "100x": 0.01 }
}
```
Multiplier applies only to causes where `cause.helpsChickens === true`.

**Pattern 2: `appliesTo` (property value lookup)**
```json
"worldviewDimension": {
  "appliesTo": "timeframe",
  "applyAs": "multiplier",
  "options": {
    "equalAll": { "short": 1, "medium": 1, "long": 1 },
    "prioritizeNearer": { "short": 1, "medium": 0.5, "long": 0.2 }
  }
}
```
Looks up `cause.timeframe` (e.g., "short") and uses that key to find the specific multiplier.

---

## Development Notes

### Dev Server

**Two options depending on what you're working on:**

| Command | URL | Use when |
|---------|-----|----------|
| `npm run dev` | `localhost:5173` | Frontend-only work (faster) |
| `netlify dev` | `localhost:8888` | Testing share URLs or other backend features |

The vite server (`npm run dev`) is faster but can't reach the serverless functions. Use `netlify dev` when testing anything that hits `/api/*` endpoints.

> **Note:** Netlify is NOT part of production infrastructure. We only use `netlify dev` as a local convenience for running serverless functions during development. Production runs on AWS Lambda + GitHub Pages. If `netlify dev` stops being useful locally, remove it and all references to it (`netlify.toml`, `netlify/functions/`, these docs).

### Testing
- `npm test` - run tests in watch mode
- `npm run test:run` - single run
- Pre-commit hook runs linting + tests

### Legacy Parity Tests

The `tests/legacy-parity.test.js` suite compares the 9 JS voting methods
(`marcusCalculation.js`) against the original Python implementations. Tests
consume JSON fixtures generated from the Python code.

**These tests are excluded from the default test run** (`vitest.config.js`) and
are expected to fail due to intentional divergences (e.g. continuous DR
interpolation). They exist only as a reference to measure how far the JS
implementation has drifted from the original Python. Do not use them to gate
changes.

**To regenerate fixtures** (only needed if Python reference code changes):

```bash
# One-time setup
python3 -m venv legacy/.venv
legacy/.venv/bin/pip install -r legacy/requirements.txt

# Regenerate
legacy/.venv/bin/python legacy/generate_fixtures.py
```

The venv is gitignored. CI does not need Python — it runs against the committed
JSON fixture files in `tests/fixtures/`.

**Legacy file structure:**

| File | Purpose |
|------|---------|
| `legacy/generate_fixtures.py` | Generates JSON test fixtures from Python |
| `legacy/refactored/donor_compass.py` | Core scoring functions + credenceWeighted, myFavoriteTheory, mec |
| `legacy/expanded/calculation.py` | borda, splitCycle, lexicographicMaximin, nashBargaining, met, msa |
| `legacy/expanded/multi_stage_aggregation.py` | MSA theory types (used by vote_msa) |
| `legacy/requirements.txt` | Python dependencies (numpy) |

See `docs/legacy-calculation-differences.md` for detailed algorithmic comparison.

### Design Decisions
All visual/UX design decisions are handled by the UX team, not implementation. Manu and Claude implement features with placeholder styles that will be updated when design specs arrive.

---

## Hosting & Backend

### Hosting
- **Frontend**: `https://donorcompass.rethinkpriorities.org` (custom domain on GitHub Pages; fallback URL `https://rethinkpriorities.github.io/donor-compass/`)
- **Share API**: AWS Lambda Function URL (deployed via SAM CLI)
- **Local dev**: Netlify dev (`netlify dev`) or Vite (`npm run dev`)

Config: `netlify.toml` (local dev), `lambda/template.yaml` (AWS).

### Database (Turso)
SQLite database hosted on Turso for share URL persistence.

| Environment | Database | Config |
|-------------|----------|--------|
| Local dev | `dev.db` (SQLite file) | `.env` → `file:dev.db` |
| Production | Turso cloud | Lambda env vars (set via SAM deploy) |

**Local setup:**
```bash
python3 scripts/init-dev-db.py   # Create local dev.db with schema
netlify dev                       # Run frontend + functions at localhost:8888
```

**Credentials:**
- Production credentials stored in 1Password
- `VITE_API_URL` set in GitHub repo secrets (points Lambda Function URL to frontend build)
- Turso credentials passed to Lambda via `--parameter-overrides` on deploy
- Local `.env` file (gitignored) points to local SQLite

### Serverless Functions
Two copies of each function (kept in sync):
- `netlify/functions/share.js` / `lambda/share/index.mjs` — Share URL API
- `netlify/functions/explain.js` / `lambda/explain/index.mjs` — AI Explanation API
- `netlify/functions/donate.js` / `lambda/donate/index.mjs` — Donation Intent API
- `netlify/functions/export.js` / `lambda/export/index.mjs` — Data Export API
- `netlify/functions/email-signup.js` / `lambda/email-signup/index.mjs` — Email Signup API

### Deploying the Lambdas

> **Naming note:** the AWS Lambdas and the CloudFormation stack are still named `quiz-demo-*` even though the repo is now `donor-compass`. Renaming them would mean redeploying, getting new Function URLs, and updating every `VITE_*_API_URL` GitHub secret. Not worth the churn — the names are internal and users never see them.

The Lambda auto-deploy GitHub Action is disabled — deploy manually from CLI:

```bash
cd lambda/share && npm ci && cd ../explain && npm ci && cd ..
sam build
sam deploy \
  --stack-name quiz-demo-share \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    TursoDatabaseUrl="<turso-url>" \
    TursoAuthToken="<turso-token>" \
    AnthropicApiKey="<anthropic-key>" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset
```

> **NOT YET DEPLOYED:** The Explain Lambda (`quiz-demo-explain`) has not been deployed to production yet. To enable the AI explanation feature:
> 1. Deploy using the command above (which now includes `AnthropicApiKey`)
> 2. Copy the `ExplainFunctionUrl` from the deploy output
> 3. Set `VITE_EXPLAIN_API_URL` in GitHub repo secrets to that URL
> 4. Set `ui.aiExplanation` to `true` in `config/features.json`

**If SAM deploy fails** with `EarlyValidation::PropertyValidation` (CloudFormation validation hook issue), deploy the code directly:

```bash
cd lambda/.aws-sam/build/ShareFunction
zip -r /tmp/lambda-share.zip .
aws lambda update-function-code \
  --function-name quiz-demo-share \
  --zip-file fileb:///tmp/lambda-share.zip
```

Requires AWS CLI configured with credentials (`aws configure`). Turso credentials are already set on the existing Lambda from the initial SAM deploy.

### Database Migrations
Migrations are idempotent SQL files in `migrations/`. Uses `CREATE TABLE IF NOT EXISTS` pattern.

**Workflow:**
1. Write migration in `migrations/NNN_description.sql`
2. Test locally: `sqlite3 dev.db < migrations/NNN_description.sql`
3. Commit and deploy
4. Run on prod: `turso db shell donor-compass < migrations/NNN_description.sql`

**Current migrations:**
- `001_initial_schema.sql` - Creates `shares` table
- `002_donations.sql` - Creates `donations` table
- `003_email_signups.sql` - Creates `email_signups` table

---

## Feature Flag System

**File:** `config/features.json`

- Features defined as true/false flags
- Import in components: `import features from '../config/features.json'`
- Missing flags should be handled gracefully with defaults

### Development Workflow
1. Implement feature with flag in `config/features.json` (default: `false`)
2. Test with flag enabled
3. Create prototype snapshot: `scripts/snapshot.sh` (UI features only)
4. Document in Completed Features section

---

## Completed Features

Summary of implemented features. See `docs/CLAUDE-ARCHIVE.md` for detailed implementation notes.

| Feature | Flag | Description |
|---------|------|-------------|
| Reset Button | `ui.resetButton` | "Start Over" button on results screen with confirmation |
| Slider Lock | `ui.sliderLock` | Lock a slider in place while others adjust proportionally |
| Calculation Debugger | `developer.calculationDebugger` | Runtime modification of calculation parameters |
| Question Config | N/A | Questions defined in `config/questions.json` |
| Context API | N/A | Centralized state via `src/context/QuizContext.jsx` |
| Calculation Display | `calculations.show*`, `calculations.sideBySideComparison` | Control which calculation cards appear and comparison mode |
| Question Types | `ui.questionTypes` | Four presentation modes: default, selection, credence, preset. **Defaults to ON.** |
| Intermission Type | N/A (requires `ui.questionTypes`) | Pause screen showing partial results + contextual copy. Excluded from progress count. |
| Share Results | `ui.shareResults` | Share quiz results via URL using backend API. |
| Session Persistence | N/A | Quiz progress persists across page reloads via sessionStorage. Conflict modal when share URL + existing session. |
| Diminishing Returns | `causes.json` → `diminishingReturns` | Spread allocations instead of winner-take-all. Modes: `none`, `sqrt` (default), `extreme`. |
| Donor Compass Branding | N/A | Visual revamp: Raleway font, teal gradient background, RP logo, white CTA buttons, consistent card styling. |
| Calculation Select | `ui.calculationSelect` | Dropdown selectors on result cards to switch between calculation types. |
| Moral Marketplace | `ui.moralMarketplace` | Combines multiple worldviews into unified allocation. Currently disabled. |
| Preset Credences | `type: "preset"` | Two-card layout with preset options and read-only sliders. Animated transitions. |
| Multiple Worldviews | `ui.multipleWorldviews` | Save quiz as named worldview, retake, compare. WorldviewHub UI. Currently disabled. |
| Disclaimer Page | `ui.disclaimerPage` | Initial disclaimer screen before welcome page. |
| Info Tooltips | `ui.questionInfo`, `ui.answerInfo` | Markdown-enabled info tooltips on questions and answer options. |
| Feedback Card | `ui.feedbackCard` | Feedback request card on results screen. |
| Simple Quiz | `ui.simpleQuiz` | Simplified 4-question quiz with direct worldview mapping and bar chart results. **Defaults to ON.** See below. |
| Support RP Footer | `ui.supportFooter` | Fixed footer on all screens with RP donation link. |
| Donation Page | N/A (hash route) | Donation intent form at `#donate`. Config-driven copy, Lambda backend. See below. |
| Data Export | `ui.exportPage` | Admin page at `#export` to download donations + shares + email signups as a zipped CSV bundle, filtered by date range. API key auth. See below. |
| Email Capture | `ui.emailCapture` | Modal popup on results screen prompting for email; saves to DB, exposed via export. See below. |

### Simple Quiz

**Flag:** `ui.simpleQuiz` (default: `true`)

A simplified entry point: 4 preset-based questions that map directly to a single worldview object, producing fund scores with no multi-worldview aggregation. The existing legacy quiz and table mode stay intact behind feature flags.

**Flow:** Disclaimer (if `ui.disclaimerPage`) → Welcome → 4 Questions → Results bar chart

**Architecture:**
```
User picks 4 presets → assembleWorldview() → single worldview object
  → calculateAllProjects() + adjustForExtinctionRisk()  (from projectScoring.js)
  → raw scores per fund → Recharts BarChart
```

Uses its own lightweight context (`SimpleQuizContext`) rather than the existing `QuizContext`. Both are always mounted; the router in `MoralParliamentQuiz.jsx` chooses which flow to render based on the feature flag.

**Questions:**

| # | ID | Topic | Worldview Field | Manual Input |
|---|-----|-------|-----------------|--------------|
| 1 | `animal_weights` | Animal moral weights vs humans | `moral_weights` | 8 number inputs |
| 2 | `discount_factors` | Time discounting | `discount_factors` | 6 percentage inputs |
| 3 | `p_extinction` | Non-AI x-risk discount | `p_extinction` | Slider (0-100%) |
| 4 | `risk_profile` | Risk attitude | `risk_profile` | Dropdown (8 options) |

Each question has 4 main preset options (one marked `isDefault`) and a custom input section via "More options". All manual inputs apply immediately on change (no apply button).

**Results screen:** Horizontal bar chart (Recharts) with one bar per fund in dataset order. Scores normalized to percentage of max. Negative scores clamped to zero. No animation.

**Table mode handoff:** "Go to Advanced Mode" writes the assembled worldview to `sessionStorage` (`simple_quiz_handoff` key). `useTableState.js` checks for this on init, loads the single worldview at 100% credence, and clears the key.

**Session persistence:** State saved to `sessionStorage` under `simple_quiz_state` (debounced 300ms). Disclaimer and welcome steps are not persisted — reload always starts from the beginning until the user enters a question.

**Config:** `config/simpleQuizConfig.json` defines questions with preset options and their worldview values. Default worldview template is in `worldviewPresets.json`.

**Disabling:** Set `"simpleQuiz": false` in `config/features.json` to revert to the legacy quiz flow.

**Files:**

| File | Purpose |
|------|---------|
| `config/simpleQuizConfig.json` | 4 question definitions with preset options |
| `src/utils/simpleQuizScoring.js` | `assembleWorldview()`, `computeSimpleScores()`, `worldviewToTableHandoff()` |
| `src/utils/simpleQuizScoring.test.js` | Unit tests for scoring functions |
| `src/context/SimpleQuizContext.jsx` | Lightweight `useReducer` context + session persistence |
| `src/context/useSimpleQuiz.js` | Hook wrapper |
| `src/components/simple/SimpleWelcomeScreen.jsx` | Welcome screen |
| `src/components/simple/SimpleQuizScreen.jsx` | Question screen with preset buttons |
| `src/components/simple/SimpleMoreOptions.jsx` | Expanded options + manual inputs |
| `src/components/simple/SimpleResultsScreen.jsx` | Bar chart results |
| `src/styles/components/SimpleQuiz.module.css` | All styling |

### Donation Page

> **Currently dead code (2026-05-17).** The simple results screen's "Donate" button now opens the external RP DAF page (`https://daf.rethinkpriorities.org/community-funds/8tpqgn/rethink-priorities-cross-cause-fund`) in a new tab instead of routing to `#donate`. The internal donation page, its config, its Lambda, the Turso `donations` table, and the SES integration are all still wired up and deployable — they're just unreachable from the live UI. Keep them intact in case we revive the in-app donation intent flow later. To bring it back, restore the previous `handleDonate` body in `SimpleResultsScreen.jsx` (sessionStorage handoff + `window.location.hash = 'donate'`) and re-add the `DONATE_HANDOFF_KEY` constant.

**Route:** `#donate` (hash-based, like `#table`)

A donation intent form where donors provide their details, choose a fund split preference, and generate a transfer memo to paste into their DAF or bank transfer. Ported from a standalone HTML file (`donation_intent_form.html`) and restyled to match the quiz's dark teal theme.

**Flow:** Header → Intro → Form (name, email, visibility, split, amount) → Live memo → Copy / Submit

**Config:** All copy is in `config/donationPage.json` — labels, placeholders, radio options, fund list, validation messages, legal text. Non-developers can edit any text without touching React code.

**Funds:** Each fund entry has an `id` matching a project slug from the dataset (`givewell`, `leaf`, `ea_awf`, `longview_ai`, `longview_nuclear`, `sentinel_bio`), a display `name`, a `sub` label, and a `defaultPct` (currently all `null`/TBD).

**Backend:** POST to `/api/donate` Lambda. Validates required fields, saves to Turso DB (`donations` table), and sends email notification via AWS SES to a configurable recipient. The full POST body is stored as a JSON blob in `form_data` for flexibility.

**Support footer:** Hidden on `#donate` (checked in `App.jsx`).

**Production deployment:** Complete. Lambda function `quiz-demo-donate` is live at `https://kcsjk7jyxottgqyk752o4pgnrq0srxhf.lambda-url.us-east-1.on.aws/`. Turso DB, SES emails, and `VITE_DONATE_API_URL` GitHub secret are all configured. SES is in sandbox mode (sender/recipient must be verified addresses); request production access when ready for real recipients.

**Redeploying the Lambda** (same as share Lambda — SAM deploy fails, deploy directly):
```bash
cd lambda/donate && npm ci && cd ..
sam build
cd .aws-sam/build/DonateFunction
zip -r /tmp/lambda-donate.zip .
aws lambda update-function-code \
  --function-name quiz-demo-donate \
  --zip-file fileb:///tmp/lambda-donate.zip
```

**Not yet implemented:**
- `defaultPct` values on funds are all `null` (awaiting RP's recommended split)
- No link from quiz results screen to `#donate` yet
- No session persistence (form resets on reload)
- **Counterfactual giving section** — Carmen asked for a "Help us understand your giving" block at the bottom of the form with percentage inputs for how the donor *would have* allocated without RP's recommendations (GHD / animal welfare / GCRs / outside EA / unsure / wouldn't have donated). Specs are not yet nailed down — validation rules (sum to 100%?), required/optional, and exact copy need to be agreed with Carmen before implementation. Answers should be piped through to the team email + `form_data` DB blob, same pattern as the fund split.
- **Donor confirmation emails** — Carmen asked for a copy of the submission to be emailed to the donor. Blocked on SES: the account is in sandbox mode and the sender is only email-address-verified (`fund@rethinkpriorities.org`), not domain-verified. To unblock: (1) set up DKIM/domain verification for `rethinkpriorities.org` in SES (adds 3 CNAME records to DNS), (2) request SES production access so we can send to unverified recipients. Then we can add a second `SendEmailCommand` in `lambda/donate/index.mjs` targeting `email` (the donor's address) with the same `emailBody` we already build for the team notification.

**Files:**

| File | Purpose |
|------|---------|
| `config/donationPage.json` | All copy, fund list with project slugs, validation messages |
| `src/components/donate/DonationPage.jsx` | Main form component (controlled state, memo generation, submit) |
| `src/components/donate/SplitEditor.jsx` | Fund split percentage editor with validation |
| `src/styles/components/DonationPage.module.css` | Styling (dark teal theme, CSS variables) |
| `lambda/donate/index.mjs` | AWS Lambda handler (validate, DB write, SES email) |
| `lambda/donate/package.json` | Lambda package manifest (`@libsql/client`, `@aws-sdk/client-ses`) |
| `netlify/functions/donate.js` | Local dev mirror (DB write, email logged to console) |
| `migrations/002_donations.sql` | Creates `donations` table + indexes |
| `donation_intent_form.html` | Original standalone HTML reference |

### Data Export

**Route:** `#export` (hash-based, like `#donate`)
**Flag:** `ui.exportPage` (default: `false`)

Admin-only page for downloading raw rows from the `donations` and `shares` tables as a zipped pair of CSVs (`donations.csv` + `shares.csv`), filtered by `created_at` date range. Authenticated by a shared API key the user pastes into the form.

**Flow:** User enters API key + From/To dates → GET `/export?from=YYYY-MM-DD&to=YYYY-MM-DD` with `x-api-key` header → Lambda queries both tables, builds CSVs, zips with JSZip, returns base64 zip with `Content-Disposition: attachment` → browser downloads `export-{from}_{to}.zip`.

**Failure modes (all return JSON with an `error` field):**
- `401` — missing or wrong API key
- `400` — missing dates, malformed dates, or `from > to`
- `413` — either table returned more than 10,000 rows; user must narrow the range
- `500` — server misconfigured (no `EXPORT_API_KEY`) or DB error

**Rows are returned raw.** `donations.form_data` stays as a JSON string in a single CSV cell — consumers parse it themselves. Date filter uses inclusive bounds in UTC: `from 00:00:00` to `to 23:59:59`.

**Local dev:** Set `EXPORT_API_KEY=<anything>` in `.env`, then `netlify dev`. Visit `http://localhost:8888/#export` (toggle `ui.exportPage` to `true` first).

**Production deployment status:** Deployed manually 2026-04-29. Function URL: `https://yvts3kg5ge66i7gincdplnmory0lqljf.lambda-url.us-east-1.on.aws/`. API key stored in 1Password as "Donor Compass — Export API Key". The Lambda was created with `aws lambda create-function` (the SAM stack only tracks `ShareFunction` — donate/explain/export are managed manually, same pattern as the others).

**Redeploying code changes** (function already exists, same as share/donate):
```bash
cd lambda/export && npm ci && cd ..
sam build
cd .aws-sam/build/ExportFunction
zip -r /tmp/lambda-export.zip .
aws lambda update-function-code \
  --function-name quiz-demo-export \
  --zip-file fileb:///tmp/lambda-export.zip
```

**Rotating the API key:**
```bash
NEW_KEY=$(openssl rand -hex 32)
op item edit "Donor Compass — Export API Key" "credential[concealed]=$NEW_KEY"
aws lambda update-function-configuration \
  --function-name quiz-demo-export \
  --environment "Variables={TURSO_DATABASE_URL=$(op item get w66obijiatjkw5omgun2wjqnym --fields label=url --reveal | tr -d '[:space:]'),TURSO_AUTH_TOKEN=$(op item get w66obijiatjkw5omgun2wjqnym --fields label=api-token --reveal | tr -d '[:space:]'),EXPORT_API_KEY=$NEW_KEY}"
```

**Frontend wiring:** `VITE_EXPORT_API_URL` GitHub secret must be set to the Function URL above. `ui.exportPage` flag in `config/features.json` controls visibility.

**Files:**

| File | Purpose |
|------|---------|
| `lambda/export/index.mjs` | AWS Lambda handler (auth, validate, query, zip, base64 response) |
| `lambda/export/package.json` | Lambda package manifest (`@libsql/client`, `jszip`) |
| `netlify/functions/export.js` | Local dev mirror against `dev.db` |
| `src/components/export/ExportPage.jsx` | Form UI (API key, date pickers, download button) |
| `src/styles/components/ExportPage.module.css` | Styling (matches dark teal theme) |

### Email Capture

**Flag:** `ui.emailCapture` (default: `false`)

A modal popup on the simple results screen that prompts users for their email after they finish the quiz. Strongly worded but skippable. Saves to the `email_signups` Turso table along with a JSON snapshot of the user's quiz state (`selections`, `manualOverrides`, `credences`, `selectedPresets`, `budget`). Carmen / RP team consumes the data via the `#export` page; another RP team handles email outreach via Mailchimp.

**Behavior:**
- Renders as an overlay on `SimpleResultsScreen` if `ui.emailCapture` is true AND `state.emailNagDismissed` (in `SimpleQuizContext`) is false.
- "Skip" or successful submit dispatches `DISMISS_EMAIL_NAG`, which persists in `sessionStorage` like the rest of the quiz state — same lifecycle: survives reload + back-nav, clears on tab close / new tab / Start Over.
- `RESTORE_FROM_URL` does not carry the flag, so share-link recipients see the popup on their first visit. Share-link revisits in the same tab preserve any existing dismissal (the `...state` spread in the reducer keeps it).
- Only `^[^\s@]+@[^\s@]+\.[^\s@]+$` regex validation on the client and Lambda. Real validation is downstream in Mailchimp.

**Copy:** All strings in `config/copy.json` → `emailCapture` block. Carmen/RP edit copy without touching React code.

**Local dev path:** Frontend calls `submitEmailSignup` (`src/utils/emailSignup.js`); if `VITE_EMAIL_SIGNUP_API_URL` is unset, the call logs to console and resolves as a no-op success so the UI flow can be tested via `npm run dev` without `netlify dev`.

**Mailchimp:** After a successful DB write, the Lambda fires a `PUT /lists/{audience_id}/members/{md5(email)}` to Mailchimp with `status_if_new: "pending"` (double opt-in — Mailchimp sends the confirmation email). Failures are swallowed and logged; the user always sees 201 once the DB write succeeds. Local dev (`netlify/functions/email-signup.js`) skips Mailchimp entirely. Env vars on `quiz-demo-email-signup`: `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX` (currently `us10`), `MAILCHIMP_AUDIENCE_ID`. Source of truth for the key is 1Password item "Donor Compass Mailchimp API Key" (field `credential`). To rotate: regenerate in Mailchimp → update 1Password → `aws lambda update-function-configuration` with the new value (preserve other env vars).

**Production deployment status:** Deployed. Function URL: `https://vwiiaqw66ive3eehxjdg7bz35m0isawr.lambda-url.us-east-1.on.aws/`. Created manually via `aws lambda create-function` (same pattern as donate/export — SAM stack additions fail on EarlyValidation). Migration 003 has been applied to Turso prod. `VITE_EMAIL_SIGNUP_API_URL` is set in GitHub repo secrets. Toggle `ui.emailCapture` in `config/features.json` to control visibility per environment.

**Redeploying code changes** (function already exists):
```bash
cd lambda/email-signup && npm ci && cd ..
sam build
cd .aws-sam/build/EmailSignupFunction
zip -r /tmp/lambda-email-signup.zip .
aws lambda update-function-code \
  --function-name quiz-demo-email-signup \
  --zip-file fileb:///tmp/lambda-email-signup.zip
```

**Files:**

| File | Purpose |
|------|---------|
| `config/copy.json` → `emailCapture` | All popup copy (title, body, labels, validation messages, success state) |
| `migrations/003_email_signups.sql` | Creates `email_signups` table + indexes |
| `lambda/email-signup/index.mjs` | AWS Lambda handler (validate, INSERT) |
| `lambda/email-signup/package.json` | Lambda package manifest (`@libsql/client`) |
| `netlify/functions/email-signup.js` | Local dev mirror against `dev.db` |
| `src/components/simple/EmailCaptureModal.jsx` | Modal component |
| `src/styles/components/EmailCaptureModal.module.css` | Styling |
| `src/utils/emailSignup.js` | localStorage helpers + submit function (no-op in local dev) |

### Key Architecture Notes
- **State management**: React Context in `src/context/QuizContext.jsx`
- **Questions**: `config/questions.json` with `worldviewDimension` for calculations
- **Causes**: `config/causes.json` with points, colors, boolean flags, and `diminishingReturns` setting
- **Validation**: Runs on dev startup (`validateCauses.js`, `validateQuestions.js`)
- **Disabling questions**: Prefix any question type with `_` (e.g., `"type": "_intermission"`) to exclude it from the quiz

### Question Types System
When `ui.questionTypes` is enabled, questions can have different presentation modes:

| Type | Behavior | Config |
|------|----------|--------|
| `default` | Mode toggle available (Pick One / Custom Mix) | Omit `type` or set `"type": "default"` |
| `selection` | Pick one option only, no sliders | `"type": "selection"` |
| `credence` | Sliders only, no discrete choice | `"type": "credence"` |
| `preset` | Two-card layout with preset options + read-only sliders | `"type": "preset"` with `presets` array |
| `intermission` | Pause with partial results + copy | `"type": "intermission"` with `title` and `body` |

Colors defined in `src/constants/config.js` as `QUESTION_TYPE_COLORS` (placeholder: same colors for all types).

**Preset behavior:**
- Two-card layout: preset options on left, sliders on right
- Sliders become read-only when a preset is selected
- Click "Custom" to enable manual slider adjustment
- Auto-selects "Custom" when user starts dragging sliders
- Animated transitions (300ms) between presets

**Intermission behavior:**
- Displays `ResultCard` components showing current calculation results
- Shows configurable `title` and `body` text
- Does not count toward progress bar or "Question X of Y"
- No credences stored (no edit panel on results screen)
- When `ui.questionTypes` is disabled, intermissions are filtered out entirely

---

## Planned Features (Simple Quiz Spec Gaps)

Source: Carmen's "Donor Compass: Simplified Quiz — Programmer Spec"

### 1. Info Popups on Preset Options
Each preset option should have an info button opening a popup that shows the exact underlying input values (all moral weights by species/effect type, discount factors, etc.) and links to external documents explaining RP's reasoning. The explanation of why RP chose those values should live in a separate linked document, not in the popup itself.

**Status:** Question-level info tooltips exist (`ui.questionInfo`), but per-option info popups are not implemented. `simpleQuizConfig.json` options have no `info` fields.

### 2. Save Results
"Save results — same as current implementation." The existing `ui.shareResults` feature is enabled but not wired into the simple results screen.

### 3. Donation Advice Flow
Entry point: "Get advice on how to split donations" from post-results actions. Displays text explaining diversification for amounts above $1M with link to source.

**Options:**
- **A. RP all-things-considered recommendation** — Links to RP recommendation doc. Displays RP recommended allocation as a static bar chart (not derived from user inputs).
- **B. Donate to the RP Cross-Cause Fund** — Explanation + link to fund donation page.
- **C. Combine your views with RP's advice** — Opens multi-worldview allocation screen (see #7).
- **D. Make a donation through the RP DAF** — Generates pre-filled PDF or email specifying the requested split.

### 4. Sensitivity Analysis (Change One Input)
User picks one of the four questions and selects a different option. Displays a grouped bar chart: for each fund, one bar for original inputs and one bar for new inputs, in fixed fund order.

**Two actions:**
- "Update to new inputs" — replaces original inputs, removes before bars
- "Save as separate comparison" — keeps both sets for later reference

### 5. Compare Quiz Runs
If the user has saved prior runs, they can select up to 3 and view them as a grouped bar chart (one bar per run per fund, fixed fund order). If no second run exists, user is prompted to retake the quiz first. Runs identified by label (auto-generated timestamp or user-defined name).

### 6. Multi-Worldview Allocation Screen
Computes recommended donation allocation by aggregating across multiple worldviews using budget-by-credence as the sole aggregation method.

**Worldviews included:**
- All worldviews the user has saved by taking the quiz (one or more runs)
- Marcus's predefined worldviews (loaded from an advanced mode export file)

**Credence assignment:**
- One credence per saved user worldview
- One combined credence for the totality of Marcus's worldviews (his individual worldviews weighted proportionally within that)
- Default: equal credence across all user worldviews, 50/50 split between user worldviews total and Marcus's worldviews total

**Requires:** Budget input from user (required to run allocation calculation).

**Output:** Recommended allocation in dollars and percentage across funds, shown as bar chart in fixed fund order.

**Post-allocation actions:** Save results, add a new worldview (retake quiz), compare to a single worldview (grouped bar chart), reset all inputs, go to advanced mode.

### 7. AI Results Explanation (Future)
"Explain these results" button below charts opens LLM interface. Marked as "Future version" in spec. Backend Lambda exists (`lambda/explain/`) but is not deployed or connected to the simple quiz frontend.

---

## References

| File | Purpose |
|------|---------|
| `config/features.json` | Feature flags |
| `config/questions.json` | Question definitions + worldview dimensions |
| `config/causes.json` | Cause definitions (points, colors, flags) + `diminishingReturns` setting |
| `config/copy.json` | UI copy/text content |
| `src/context/QuizContext.jsx` | React Context state management |
| `src/utils/calculations.js` | Calculation functions |
| `src/utils/shareUrl.js` | URL encoding/decoding for Share Results |
| `src/utils/session.js` | Session persistence utilities (sessionStorage) |
| `src/constants/config.js` | Constants: colors, input modes, question types |
| `netlify.toml` | Netlify deployment config (build, redirects, functions) |
| `netlify/functions/share.js` | Share URL serverless function |
| `migrations/` | Database migrations (idempotent SQL) |
| `scripts/snapshot.sh` | Prototype builder |
| `scripts/init-dev-db.py` | Initialize local dev database |
| `docs/CLAUDE-ARCHIVE.md` | Detailed implementation notes for completed features |
| `docs/legacy-calculation-differences.md` | Python↔JS algorithmic comparison for all 9 voting methods |
| `legacy/` | Python reference implementations + fixture generator (see Legacy Parity Tests) |
| `example/` | Standalone calculation code for Moral Marketplace feature |
| `config/simpleQuizConfig.json` | Simple quiz question definitions + preset options |
| `src/context/SimpleQuizContext.jsx` | Simple quiz state management (useReducer + session persistence) |
| `src/context/useSimpleQuiz.js` | Hook wrapper for simple quiz context |
| `src/utils/simpleQuizScoring.js` | Scoring functions: assembleWorldview, computeSimpleScores, worldviewToTableHandoff |
| `src/components/simple/` | Simple quiz UI components (welcome, questions, more options, results) |
| `config/donationPage.json` | Donation page copy, fund list with project slugs, validation messages |
| `src/components/donate/` | Donation page UI components (form, split editor) |
| `lambda/export/` | Data export Lambda (auth, query, zip CSVs) |
| `netlify/functions/export.js` | Data export local dev mirror |
| `src/components/export/ExportPage.jsx` | Data export admin page UI |
