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
  api/
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
  ui/                          buttons, logo, media frame, section shells
lib/
  site.ts                      all marketing copy in one place
  rmi/questions.ts             generated question bank, do not hand-edit
  rmi/scoring.ts               weighting and tiering
  rmi/pricing.ts               tiers and Pesapal links
  rmi/store.ts                 assessments, shares, stakeholder responses
  rmi/mailer.ts                outbound email
  rmi/pesapal.ts               Pesapal API 3.0 client
  rmi/report.ts                prompt and OpenRouter call
  rmi/markdown.ts              renders the generated report
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
evidence behind them and the stakeholder consensus to Claude through
OpenRouter, and gets back Markdown in the same shape as the sample reports.

The prompt is in `lib/rmi/report.ts` and is exported as `buildMessages` so it
can be read and exercised without spending a call. It forbids inventing figures
and bans the usual machine tells. Asking gets most of the way, but a few words
come back anyway, so whatever the model returns is also scrubbed: em dashes,
curly quotes and emoji are stripped, and the handful of stubborn tells like
"journey" and "indicating" are rewritten by the `PHRASES` table. Every
substitution there keeps the same grammatical role, so nothing it touches can
end up malformed. `/rmi/report` renders it on
letterhead with the Issued by seal and prints to PDF from the browser.

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you have. Every one of
these is optional in development; the app degrades to a sensible default and
says what it did.

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Base URL used to build stakeholder survey links |
| `NEXT_PUBLIC_PESAPAL_URL` | Fallback Pesapal checkout link for every tier |
| `NEXT_PUBLIC_PESAPAL_URL_ESSENTIAL` | Checkout link for the Essential tier |
| `NEXT_PUBLIC_PESAPAL_URL_PROFESSIONAL` | Checkout link for the Professional tier |
| `MAILTRAP_TOKEN` | Sends every outbound email. Without it, messages are logged instead of sent |
| `MAILTRAP_INBOX_ID` | Set it to catch mail in a Mailtrap test inbox. Leave unset to deliver for real |
| `MAILTRAP_FROM_EMAIL` | From address on outbound email |
| `MAILTRAP_FROM_NAME` | From name on outbound email |
| `RMI_CONTACT_INBOX` | Where website enquiries land |
| `RMI_DATA_DIR` | Where submissions are written. Defaults to `./.data` |

Without a Pesapal link the pricing buttons fall back to `/contact?intent=rmi`,
so nothing is ever a dead end.

## Before launch

1. **Payments.** Put the Pesapal consumer key and secret in the environment and
   set `PESAPAL_ENV=live`. Until they are set, the Pay button says plainly that
   card payment is off and points people at the contact form.
2. **Storage.** `lib/rmi/store.ts` writes JSON to disk, which is fine on a VPS
   and wrong on a serverless host, where the filesystem is wiped between
   invocations. Replace the four exported functions with a database before the
   first paying client.
3. **Email.** Set `MAILTRAP_TOKEN`. Start with `MAILTRAP_INBOX_ID` pointed at a
   Mailtrap test inbox so nothing reaches a real person while you are still
   trying things, then clear it once the sending domain is verified. Nothing
   breaks without a token, but people stop receiving their reference, which is
   the only way back into a half-finished assessment, and nobody ever learns
   their report is ready.
4. **Images.** Everything in `public/images` is a generated placeholder, marked
   as such on the page. Drop real photographs in at the same filenames and the
   captions disappear on their own (remove the `swap` prop on `<Media>`).
5. **Report generation.** Set `OPENROUTER_API_KEY`. The model slug drifts, so
   check `anthropic/claude-sonnet-4.5` still resolves on openrouter.ai/models
   before launch and override it with `OPENROUTER_MODEL` if it has moved.

## Design

Brand lime `#97D700` comes from the master logo package. The palette, type
scale and motion tokens live at the top of `app/globals.css` as Tailwind v4
theme variables. Fonts are self-hosted in `app/fonts`, so the site has no
runtime dependency on Google Fonts.
