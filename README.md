# Rejuvenate Responsibly

The public website for Rejuvenate Responsibly, plus the Rate My Impact (RMI)
sustainability self-assessment.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript and
Tailwind CSS v4.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
```

## What is where

```
app/
  page.tsx                     home
  about/ services/ why-rejuvenate/ contact/
  rmi/
    page.tsx                   RMI landing, pricing, payment handoff
    assessment/                the 53 question self-assessment, one page
    survey/                    the 40 question stakeholder survey
    resume/                    get the link emailed again from a reference
    payment/                   where Pesapal returns the payer
    report/                    the generated report, on letterhead
    glossary/                  definitions and consistency checks
  dashboard/                   admin: analytics, responses, report editing
  signin/                      admin sign-in, email and password or Google
  auth/callback/               Supabase OAuth return
  api/
    dashboard/report/[id]      saves an admin's edit of a report
    rmi/assessment             create, autosave, resume, submit and clear
    rmi/resume                 emails the link back to the address on file
    rmi/share                  invites the other parties, takes their answers
    rmi/pay                    opens a Pesapal order
    rmi/pay/ipn                Pesapal settlement webhook
    rmi/pay/status             what the payment page polls
    rmi/report                 generates and serves the written report
    contact                    website enquiry form
components/
  site/                        header, footer, contact form
  home/                        homepage sections
  rmi/                         assessment engine, scoring UI, pricing
  dashboard/                   nav, stat tiles, charts, status badges, editor
  ui/                          buttons, logo, media frame, section shells
lib/
  site.ts                      all marketing copy in one place
  rmi/questions.ts             generated question bank, do not hand-edit
  rmi/scoring.ts               weighting and tiering
  rmi/pricing.ts               tiers and Pesapal links
  rmi/store.ts                 assessments, shares, stakeholder responses, settings
  rmi/settings.ts              dashboard value, then environment, then default
  rmi/secrets.ts               AES-256-GCM for secrets saved from the dashboard
  rmi/humanizer.ts             the humaniser pass and the checks on its output
  rmi/humanizer-skill.md       the humanizer rules (generated into humanizer-skill.ts)
  rmi/samples.ts               the sample submissions loaded from Settings
  rmi/mailer.ts                outbound email
  rmi/pesapal.ts               Pesapal API 3.0 client
  rmi/report.ts                drafting prompt and the two-pass generation
  rmi/markdown.ts              renders the generated report
  rmi/dashboard.ts             read models behind the dashboard views
utils/supabase/                browser, server and proxy clients
supabase/migrations/           the whole database in one script
proxy.ts                       keeps the dashboard behind a session
```

## The assessment

`lib/rmi/questions.ts` is generated from
`RMI Sustainability Self Assessment 2026.xlsx`. It holds 53 client questions and
40 stakeholder questions, each with its follow-up, its weight, and its SDG and
GRI mapping. Weights in each set total 100, exactly as in the workbook.

Scoring, in `lib/rmi/scoring.ts`:

- **Coverage** (0 to 100) is the weighted share of primary questions answered yes.
- **Depth** (0 to 100) is the weighted share where the follow-up is also yes.
- The **headline score** is the mean of the two, which is what drives the tier.

Unanswered questions count as a no, and the form says so before anyone submits.

## Saving and resuming

An assessment is created as soon as we know who is filling it in. It gets a
short reference (RMI-7F3K2Q) and a long secret token. The reference is what the
person quotes; the token is the other half of the resume link and is the only
thing that actually opens the record, so the reference alone is useless to
anyone who finds it.

Both go out by email the moment the assessment opens. Answers save to the
server about a second after each change, and to the browser as a fallback, so a
closed tab or a dead laptop costs nothing. `/rmi/resume` takes a reference and
emails the link to the address already on the assessment, and it replies the
same way whether or not the reference exists, so it cannot be used to work out
which references are real.

"Clear all responses" wipes every answer on the server and in the browser and
keeps the reference alive, so the emailed link still works.

## Payments

`/api/rmi/pay` asks Pesapal for a token, makes sure an IPN URL is registered,
submits the order and hands back the redirect. Pesapal returns the payer to
`/rmi/payment`, which polls `/api/rmi/pay/status` for about thirty seconds
because the IPN can land after the redirect. The IPN itself never gets trusted
on face value: it only tells us which order moved, so we always ask Pesapal for
the real status before marking anything paid.

The sandbox is the default. Set `PESAPAL_ENV=live` when the merchant account is
ready.

## The report

The report writes itself. When the last outstanding stakeholder submits their
survey, `/api/rmi/share` schedules the work with `after()` so the stakeholder's
own request returns immediately rather than holding a connection open for the
minute the model takes, then generates the report and emails the client a link.

The button on the results page stays, relabelled as a draft, because the
obvious failure mode is a stakeholder who never answers and an assessment that
would otherwise never produce anything.

Either path sends the scored result, the heaviest gaps, the practices with no
evidence behind them and the stakeholder consensus to a drafting model through
OpenRouter, and gets back Markdown in the same shape as the sample reports.
That draft then always goes through the humaniser (see below) before it is stored.

The prompt is in `lib/rmi/report.ts` and is exported as `buildMessages` so it
can be read and exercised without spending a call. It forbids inventing figures
and bans the usual machine tells. Asking gets most of the way, but a few words
come back anyway, so whatever the model returns is also scrubbed: em dashes,
curly quotes and emoji are stripped, and the handful of stubborn tells like
"journey" and "indicating" are rewritten by the `PHRASES` table. Every
substitution there keeps the same grammatical role, so nothing it touches can
end up malformed. `/rmi/report` renders it on
letterhead with the Issued by seal and prints to PDF from the browser.

## The dashboard

`/dashboard` is where the firm reads what has come in. It is not linked from
anywhere on the site and `robots.txt` disallows it, but the only thing actually
keeping people out is the sign-in, so treat the URL as public.

Two gates stand in front of it. `proxy.ts` turns away anyone without a Supabase
session, and the layout asks a second question: a session alone is not enough,
the account has to have a row in `rmi_admins`. Anyone signed in but not on that
list lands back on `/signin` with a reason rather than an empty page. The API
route behind the report editor checks the same thing for itself, since an API
route is reachable without ever loading a page. With no Supabase settings at
all, the dashboard shuts rather than falling open.

Three views:

- **Analytics**, at `/dashboard`. Totals across every organisation, then mean
  pillar scores, the spread of tiers, assessments started by month and the
  topics answered no most often. Every chart carries a "Show the numbers" table,
  so nothing on the page is readable by colour alone.
- **Responses**, at `/dashboard/responses`. One row per organisation, newest
  first, with its status, payment, score, how many invited stakeholders have
  answered, and whether a report exists.
- **An organisation**, at `/dashboard/responses/<code>`. The parties it invited
  and who has answered, pillar scores, the client's own view against the
  stakeholder average, where the scoring weight sits, and the report.

### Editing a report

The report has two lives. `generated_markdown` is what the model wrote and
`markdown` is what a reader sees, so an admin editing the wording never
destroys the original. The first save copies the model's text aside; later
saves leave that copy alone.

Editing opens WordCraft (`@gamine/wordcraft-react`), the same editor the Sauti
Salama project uses. It draws with WebGPU or WebGL2 and loads a WebAssembly
runtime, so it is imported in the browser only and the page says so plainly if
the browser cannot run it. The runtime is copied out of `node_modules` into
`public/wordcraft/` by `scripts/copy-wordcraft-wasm.mjs`, which runs on install
and before every dev run and build. It is a 38MB binary, so it stays out of
git.

Save asks the editor for Markdown rather than taking the bytes it wrote, which
means the stored report is Markdown whatever format the person saved as. A
report counts as a draft until someone has saved it; after that it reads as
issued, since an admin has been through it.

### Supabase

`supabase/migrations/0001_rate_my_impact.sql` is the whole database in one
script: extensions, enums, five tables, the admin check, the updated-at
triggers, row level security on everything and a reporting view. Paste it into
the SQL editor of a new project and run it once. It is idempotent, so running
it again changes nothing.

Then add yourself:

```sql
insert into rmi_admins (id, email, full_name)
select id, email, 'Your Name' from auth.users where email = 'you@example.com';
```

Authentication is set up in the Supabase dashboard, not here: turn on email and
password, and add Google under Authentication > Providers with
`https://your-domain/auth/callback` as the redirect URL. The sign-in page
offers both.

Row level security is written so the browser key can read nothing on its own.
`anon` is revoked outright, every policy requires a row in `rmi_admins`, and
the only thing an admin may write is a report. Assessments and responses are
inserted by the server, never by a browser.

The dashboard still reads `lib/rmi/store.ts`, the JSON store the public site
writes to, so it shows live work today. The migration is the shape to move to;
when that happens, only the three functions in `lib/rmi/dashboard.ts` change.

## Sending the final report

On an organisation's page, **Send report** emails the submitter a link to the
report. It works whether or not every stakeholder has answered. A confirmation
modal says the report is final and, when anyone is outstanding, lists them by
name (marking invitations that never arrived) and requires a tick before it
sends. The server recomputes who is outstanding and refuses the send without
that acknowledgement, so the check holds if the route is called directly. The
email to the submitter says how many answers are missing.

The automatic path only writes a report once everyone has answered, so when
someone never does there is nothing to send. **Write report now** generates one
from what has come in, through the same drafting and humaniser passes, so it can
be reviewed, edited and sent. A send records when, by whom and how many answers
were outstanding, and is shown as "Report sent". If email is not configured
nothing is recorded as sent. Migration `0003_report_sent.sql` adds the three
columns it needs, additively.

## Invitations that do not arrive

Each stakeholder invitation is sent once and not retried. The outcome is stored
on the invitation (`delivery`: sent, failed, or not_sent when no mail provider
was configured). The dashboard overview, the responses list and the
organisation page flag any that did not arrive and have not been answered.

On the organisation page, **Inform the submitter** opens the message in an
editor, prefilled with the failed addresses and their survey links. The admin
can change the subject and text; it is sent exactly as written, only to the
submitter address on the assessment, and the invitations are then marked as
told. They stay flagged until answered. If mail is not configured nothing is
recorded as sent. There is still no resend button: the submitter replies with a
corrected address, or passes the link on.

## Storage

`lib/rmi/store.ts` is the one door to data. It picks a backend per call:

| Backend | When | Where |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set | the `rmi_*` tables |
| Local file | otherwise, or `RMI_STORAGE=file` | `RMI_DATA_DIR/rmi.json` |

The file backend keeps local development working with nothing configured.
`RMI_STORAGE=supabase` insists on Supabase and fails loudly if the key is
missing, rather than quietly writing to a file nobody is watching.

The service role key bypasses row level security. It is read only on the
server, never from a `NEXT_PUBLIC_` variable, and `store-supabase.ts` is
marked server-only. Anyone who can read the dashboard is still checked against
`rmi_admins` before any page or API route touches the data.

**The migration never changes existing data.** `0002_storage_on_supabase.sql`
only adds: one enum value (`waived`), a few nullable or defaulted columns, one
table (`rmi_settings`, closed to every role but the service role) and one
index. No drops, deletes, updates or type changes, and every statement is
guarded, so it is safe to run twice and safe on a project that already holds
data. Existing rows read the new columns as their default.

**Importing the old file.** Settings > Storage shows what the local JSON file
holds and imports it with one button. It only inserts: a row that already
exists is left exactly as it is, and the file is never modified, so running it
again, or after real traffic has started, cannot overwrite anything. Sample
records are not imported.

**What is stored where.** Assessments, invitations (with each one's delivery
result), stakeholder responses and reports use the 0001 tables. The original
generated report text is always kept in `generated_markdown`, so an admin edit
never destroys it. Dashboard settings are one row in `rmi_settings`, with
secrets already encrypted by the application, so a database dump does not
expose them.

## The humaniser pass

Every generated report is edited a second time before it is stored. The
drafting model writes to the fixed structure; `lib/rmi/humanizer.ts` then sends
the draft to the humaniser model with the rules in `lib/rmi/humanizer-skill.md`
(the humanizer skill, based on Wikipedia's "Signs of AI writing").

The edit is checked before it is kept: same headings in the same order, same
table rows, every score and the assessment reference still present, and the
length within bounds. A failed check retries once with the reason; a second
failure fails the generation and nothing is stored, so an unedited draft never
reaches a client. `report.humanized` and `report.humanizerModel` record which
reports went through it. A report an admin edits afterwards is human text and is
not run through it again.

To change the rules, edit `humanizer-skill.md` and run
`node scripts/build-humanizer.mjs`, then commit both files.

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you have. Every one of
these is optional in development; the app degrades to a sensible default and
says what it did.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Base URL used to build stakeholder survey links |
| `RMI_SETTINGS_KEY` | Master key for secrets saved from the dashboard. Without it only the environment values work |
| `SUPABASE_SERVICE_ROLE_KEY` | Switches storage to Supabase. Server only; bypasses row level security |
| `RMI_STORAGE` | `file` forces the local file, `supabase` insists on Supabase. Unset picks by the key |
| `RMI_REQUIRE_PAYMENT` | `false` lets people start without paying, for testing. The dashboard switch overrides it |
| `PESAPAL_CONSUMER_KEY` | Opens Pesapal orders. Without it the Pay button says card payment is off |
| `PESAPAL_CONSUMER_SECRET` | The other half of the Pesapal credentials |
| `PESAPAL_ENV` | Unset for the sandbox, `live` to take real money |
| `PESAPAL_IPN_ID` | Optional. Pins one IPN registration instead of registering on demand |
| `MAILTRAP_TOKEN` | Sends every outbound email. Without it, messages are logged instead of sent |
| `MAILTRAP_INBOX_ID` | Set it to catch mail in a Mailtrap test inbox. Leave unset to deliver for real |
| `MAILTRAP_FROM_EMAIL` | From address on outbound email |
| `MAILTRAP_FROM_NAME` | From name on outbound email |
| `RMI_CONTACT_INBOX` | Where website enquiries land |
| `RMI_DATA_DIR` | Where submissions are written. Defaults to `./.data` |
| `OPENROUTER_API_KEY` | Writes the report. Without it the report button says so |
| `OPENROUTER_MODEL` | Drafting model. Defaults to `deepseek/deepseek-v4-flash` |
| `OPENROUTER_HUMANIZER_MODEL` | Model that edits the draft. Defaults to `openai/gpt-4.1-mini` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Only the dashboard needs it |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is read too, for older projects |

Without Pesapal credentials the pricing buttons fall back to
`/contact?intent=rmi`, so nothing is ever a dead end.

The four `NEXT_PUBLIC_` variables are different from the rest. Next compiles
them into the browser bundle, so they are read when the site is built, not when
it runs. Setting them only in the server's environment file is too late: the
browser half of sign-in would be built with nothing to connect to. Everything
else is read at runtime and belongs in the server's environment file alone.

## Deployment

Two targets:

- **Production (client preview): Vercel.** Every push to `main` builds on Vercel
  with a plain Next.js build. `next.config.ts` skips `output: "standalone"`
  when `VERCEL` is set, because the standalone trace breaks the Vercel build.
  Set the environment variables from the table above in the Vercel project.
- **Staging: GitHub workflow.** A push to the `staging` branch runs
  `.github/workflows/deploy.yml`, which builds the app, rsyncs the standalone
  output to the server and restarts it in a Docker container behind the local
  port 3000.

What the workflow needs:

| Where | Name | Why |
| --- | --- | --- |
| Secrets | `SSH_PRIVATE_KEY`, `SSH_HOST` | Reaching the server |
| Variables | `NEXT_PUBLIC_SITE_URL` | Links in outbound email |
| Variables | `NEXT_PUBLIC_SUPABASE_URL` | Admin sign-in, compiled in |
| Variables | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Admin sign-in, compiled in |

Both live under Settings > Secrets and variables > Actions. A build with the
variables missing still deploys and still serves the public site; it just
cannot sign an admin in, and the workflow says so in its log rather than
failing.

Everything read at runtime goes in `/etc/rejuvenateresponsibly.env` on the
server, which the container is started with.

Once `SUPABASE_SERVICE_ROLE_KEY` is in that file, submissions go to Supabase and
`.data` is only a fallback (see Storage). Until then they are written to `.data`
inside the application directory,
which is not part of the build, so the upload step excludes it. Moving
`RMI_DATA_DIR` to a directory of its own outside the application, mounted into
the container, would be sturdier still.

## Before launch

1. **Payments.** Put the Pesapal consumer key and secret in the environment and
   set `PESAPAL_ENV=live`. Until they are set, the Pay button says plainly that
   card payment is off and points people at the contact form.
2. **Storage.** Submissions live in Supabase. Run
   `supabase/migrations/0002_storage_on_supabase.sql` and then
   `0003_report_sent.sql` (after 0001) in the SQL editor, then set `SUPABASE_SERVICE_ROLE_KEY` on the server. In that order:
   the key is what switches storage on, and the app needs the new columns first.
   Then open Settings > Storage and use "Import into Supabase" once to bring in
   anything in the old local file. See "Storage" below.
3. **Email.** Set `MAILTRAP_TOKEN`. Start with `MAILTRAP_INBOX_ID` pointed at a
   Mailtrap test inbox so nothing reaches a real person while you are still
   trying things, then clear it once the sending domain is verified. Nothing
   breaks without a token, but people stop receiving their reference, which is
   the only way back into a half-finished assessment, and nobody ever learns
   their report is ready.
4. **Images.** Everything in `public/images` is a generated placeholder, marked
   as such on the page. Drop real photographs in at the same filenames and the
   captions disappear on their own (remove the `swap` prop on `<Media>`).
5. **The dashboard.** Run the migration in a Supabase project, turn on email
   and password and Google sign-in, put the project URL and publishable key in
   the environment, and insert your own row into `rmi_admins`. Nobody can reach
   `/dashboard` until that row exists.
6. **Report generation.** Set `OPENROUTER_API_KEY` (environment or dashboard
   Settings). Model slugs drift, so check the two defaults still resolve on
   openrouter.ai/models before launch. If the server environment still pins an
   old `OPENROUTER_MODEL`, it wins over the default: update or remove it, or
   override it from Settings.
7. **Payment switch.** Settings has a "require payment" switch for testing. Turn
   it back on before launch. Assessments opened while it was off are recorded
   as `waived`, never `paid`.
8. **Settings key.** Set `RMI_SETTINGS_KEY` on the server before saving any
   secret from the dashboard, and keep a copy somewhere safe: losing it makes
   saved secrets unreadable, and you would enter them again.

## Design

Brand lime `#97D700` comes from the master logo package. The palette, type
scale and motion tokens live at the top of `app/globals.css` as Tailwind v4
theme variables. Fonts are self-hosted in `app/fonts`, so the site has no
runtime dependency on Google Fonts.
