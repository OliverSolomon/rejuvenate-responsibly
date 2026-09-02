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
    page.tsx                   RMI landing, pricing, Pesapal handoff
    assessment/                the 53 question client self-assessment
    stakeholders/              invite 3 to 5 stakeholders
    survey/                    the 40 question stakeholder survey
    glossary/                  definitions and consistency checks
  api/
    rmi/assessment             stores a completed assessment
    rmi/stakeholders           creates invites and emails the survey links
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
  rmi/store.ts                 submission storage
  rmi/mailer.ts                outbound email
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

Unanswered questions count as a no, and the review screen says so before anyone
submits.

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
| `RESEND_API_KEY` | Sends the invite and access emails. Without it, messages are logged instead of sent |
| `RMI_MAIL_FROM` | From address on outbound email |
| `RMI_CONTACT_INBOX` | Where website enquiries land |
| `RMI_DATA_DIR` | Where submissions are written. Defaults to `./.data` |

Without a Pesapal link the pricing buttons fall back to `/contact?intent=rmi`,
so nothing is ever a dead end.

## Before launch

1. **Payments.** Create the Pesapal payment links and set the env vars above.
   The buttons currently point at whatever `NEXT_PUBLIC_PESAPAL_URL*` holds.
2. **Storage.** `lib/rmi/store.ts` writes JSON to disk, which is fine on a VPS
   and wrong on a serverless host, where the filesystem is wiped between
   invocations. Replace the four exported functions with a database before the
   first paying client.
3. **Email.** Set `RESEND_API_KEY`, or swap the `send` function in
   `lib/rmi/mailer.ts` for whichever provider the hosting partner prefers.
4. **Images.** `public/images` holds the site photography. Service artwork is
   set per service in `lib/site.ts`; everything else is referenced directly by
   the section that uses it. To swap a photograph, drop the new file in and
   change the one `src`, then update its alt text to match.
5. **Report generation.** Consolidating client and stakeholder answers into the
   letterhead report with the Issued by seal is still a manual step. The scoring
   and perception gap functions in `lib/rmi/scoring.ts` produce everything the
   report needs.

## Design

Brand lime `#97D700` comes from the master logo package. The palette, type
scale and motion tokens live at the top of `app/globals.css` as Tailwind v4
theme variables. Fonts are self-hosted in `app/fonts`, so the site has no
runtime dependency on Google Fonts.
