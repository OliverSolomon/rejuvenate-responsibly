---
title: "Rate My Impact: Solution Guide"
subtitle: "How the platform works, what it does, and why it was built this way"
author: "Oliver Wainaina"
date: "27 October 2026"
---

# Rate My Impact: Solution Guide

**Prepared for:** Rejuvenate Responsibly, Nairobi, Kenya
**Prepared by:** Oliver Wainaina
**Version:** 1.3
**Date:** 27 October 2026

---

## Contents

1. About this document
2. The solution at a glance
3. The people who use it
4. The journey from start to finish
5. The public website
6. The assessment
7. How scoring works
8. Stakeholder surveys and the perception gap
9. Pricing and payment
10. The report
11. Emails the system sends
12. The admin dashboard
13. Settings, secrets and test controls
14. Where the data is kept
15. Security and privacy
16. Decisions we made, and why
17. Known limitations and things to reconcile
18. Everyday tasks: how to
19. References
20. Glossary
- Appendix A: The 53 client questions
- Appendix B: The 40 stakeholder questions
- Document history

---

## 1. About this document

This guide describes the **Rate My Impact** platform that Rejuvenate Responsibly runs on its website: what each part does, how a person moves through it, what emails go out, what the team sees behind the scenes, and the decisions that shaped it.

**What it covers**

- Everything a client, a stakeholder and each kind of dashboard user (super admin, owner, admin, member) can do.
- The wording of every automatic email.
- How scores and reports are produced.
- Where information is stored and who can see it.
- The choices made along the way and the reasons for them.
- The things that are not yet finished, so nobody is surprised.

**Status at the time of writing.** The platform is built and working. Card payments run against Pesapal's test environment until the merchant account is approved for live use. Email delivery depends on the mail account being connected. Anything marked "not yet" below is a deliberate gap, listed again in Section 17.

---

## 2. The solution at a glance

Rate My Impact is a sustainability self-assessment with an outside check. An organisation answers 53 yes or no questions about how it runs. The people who watch it from the outside (suppliers, customers, staff, investors, community partners) answer a shorter set of 40 questions about the same organisation. The platform scores both, compares them, and produces a written report.

### The five parts

| Part | What it is | Who uses it |
| --- | --- | --- |
| **Public website** | Home, About, Services, Why Rejuvenate, Rate My Impact, Contact | Anyone |
| **The assessment** | The 53-question self-assessment, with a saved reference so people can stop and resume | Clients |
| **Stakeholder survey** | A 40-question outside view, sent by email | People the client invites |
| **Report engine** | Writes the consolidated report from the scores and answers | Runs automatically |
| **Admin dashboard** | Analytics, every submission, report editing and sending, settings, team and companies | Each firm's own people: super admin, owners, admins and members (Section 3.2) |

### What makes it different

- **It asks for evidence.** Every "yes" is followed by a second question asking whether the organisation can show evidence or depth. A flattering "yes" with nothing behind it scores only half.
- **It asks outsiders.** The same topics are put to people who deal with the organisation, and the gap between the two views is reported.
- **It writes itself, with a person in control.** The report is drafted automatically, then an administrator can review, edit and decide when to send it.

---

## 3. The people who use it

There are two groups: the people outside the firm, who reach the platform by private link, and the people inside it, who sign in to the dashboard.

### 3.1 Outside the firm

| Role | Who they are | What they can do | What they never see |
| --- | --- | --- | --- |
| **Client** (the submitter) | The person at an organisation who starts the assessment and pays | Answer the questions, save and resume, submit, invite stakeholders, read the report | Individual stakeholder answers |
| **Stakeholder** | Someone the client invites: a supplier, employee, customer, investor, partner | Answer the 40-question survey once, using their own private link | The client's answers or the report |
| **Rejuvenate** (the firm) | The company that runs the platform | Receives website enquiries and enterprise requests | |

**Access is by private link, not by account.** Clients and stakeholders do not create accounts or passwords. They are given a reference and a private link by email. The link works like a password: anyone who has it can open that assessment.

### 3.2 Inside the firm: the dashboard roles

More than one company can run on one installation (Section 12.9). Every dashboard user belongs to exactly one company, except the super admin, who answers to the installation. There are four roles.

| Role | Belongs to | Can do | Cannot do |
| --- | --- | --- | --- |
| **Super admin** | The installation (their own company is the one that owns it) | Everything. Sees every company at once or steps into one. Sets the keys and template that other companies share, creates and closes companies, marks a company as a sample, decides what each company shares, adds and moves people between companies, makes other super admins | Nothing is withheld. The last super admin cannot be removed or demoted |
| **Owner** | One company | Everything an admin can, plus adds and removes people in their company and changes their roles. Sets their company's own keys and template when the super admin has switched sharing off | See any other company. See the super admin accounts |
| **Admin** | One company | Works the company's submissions: reads responses, writes, edits and sends reports, informs submitters, loads and removes the company's sample data, changes the company's settings (country, pricing, branding, email switches, their own keys and template when sharing is off) | Add, remove or change the roles of people. See any other company |
| **Member** | One company | Looks. Reads the company's analytics, responses, reports and settings, switches Demo and Live for their own screen, closes notices on their own screen | Change anything. Every action that saves, sends, uploads, deletes or generates is refused with a clear message, by the server and not only by hiding the button |

**How a person gets their company.**

- Someone an **owner** adds joins the owner's company automatically.
- A **super admin** chooses the company when adding someone, and can move a person to another company later, from the Team page.
- A super admin is never placed in a company's team.
- Anything the system does not recognise in the role column is treated as **member**, the least privileged, so a mistake can only ever take access away.

**Who sees whom.** The team list of a company never shows the super admin accounts. A company's people cannot see that the role exists.

### 3.2.1 How the roles relate to each other

The four roles form a ladder. Each rung can do everything the one below it can, and adds one thing.

| Rung | Adds to the one below | Reports to |
| --- | --- | --- |
| **Member** | Looks at one company's work | The owner or admin of that company |
| **Admin** | Changes things: submissions, reports, sample data and the company's settings | The owner of that company |
| **Owner** | Manages the company's team: adds, removes and changes roles of members and admins | The super admin |
| **Super admin** | Reaches across companies: sees all of them, creates and closes them, places people in them, and holds the shared keys and template | Nobody. It is the installation's own role |

**Super admin and the others.**

- A super admin **is above every company** and answers to none. An owner, admin or member belongs to **one** company and cannot see any other.
- A super admin **creates the owners**. An owner then runs their own company's people without further help, so the super admin is not needed for day-to-day team changes.
- A super admin **decides what a company shares** (Section 12.9). While a company shares the installation's payment account, report-writing key and template, its admins have nothing to set up. When the super admin switches a share off, that company's owner and admins take over the matter: they see a set-up banner and must add their own.
- A super admin can **move a person** between companies and change their role. An owner can change roles only inside their own company, and cannot create a super admin.
- A super admin **can look through any company's eyes** (account menu, Companies shown) but is saving settings against their own company unless they step into another.
- Nobody below super admin can see super admin accounts, or knows they are in the team list.

**Owner and admin.**

- An **owner** is an admin who also manages people. Everything an admin can do with submissions, reports and settings, an owner can too.
- An **admin** cannot add, remove or change anyone, and cannot promote themselves.
- Neither can reach another company, even if they know its references. Every page and action checks the company first.

**Admin and member.** An admin and a member see the same screens. The difference is that a member's buttons do nothing: the server refuses every save, send, upload, delete or generate from a member, with a message saying so.

**Guard rails that hold the ladder up.** The last super admin cannot be removed or demoted. The last owner of a company cannot be removed or demoted. Nobody can remove or step down themselves. Anything unrecognised is treated as a member.

**What each role can do in the dashboard.**

| | Super admin | Owner | Admin | Member |
| --- | :---: | :---: | :---: | :---: |
| See Analytics, Responses, the report | All companies | Own company | Own company | Own company |
| Switch Demo and Live, close notices (own screen) | Yes | Yes | Yes | Yes |
| Choose which company is in view | Yes | No | No | No |
| Write, edit and send reports, inform submitters | Yes | Yes | Yes | No |
| Change settings (country, pricing, branding, email, template, own keys) | Yes | Yes | Yes | No |
| Load and remove sample data | All companies | Own | Own | No |
| Add, remove and change people | Anyone, any company | Own company | No | No |
| Create, close and share companies; Companies card | Yes | No | No | No |
| Change the keys and template other companies share | Yes | No | No | No |

### 3.3 The accounts set up for testing

These accounts were created while the platform was tested end to end. Their passwords are deliberately **not written in this guide**, because the guide is kept in the project repository. They are held by Oliver Wainaina; change them on first use.

| Person | Email | Role | Company | Used to check |
| --- | --- | --- | --- | --- |
| Caroline Muito | `caroline.muito@test.com` | Super admin | Rejuvenate Responsibly - Kenya (the installation's own company) | The global view, the Companies card, the shared keys and template, sample data across companies, moving between Demo and Live and between companies |
| Tongai Bhebhe | `Tongai.Bhebhe@test.com` | Owner | Rejuvenate Responsibly - Zimbabwe | A company that sees only its own work, the set-up banners when sharing is off, adding a member to a company |

The two companies are named "Rejuvenate Responsibly - Kenya" and "Rejuvenate Responsibly - Zimbabwe". Both are marked **Sample** (Section 12.9): they exist to demonstrate the platform, and their records show in Demo only. There is no seeded member account; add one from Settings, Team to see the read-only view.

---

## 4. The journey from start to finish

### 4.1 The whole flow in one view

```
Client visits Rate My Impact
        |
        v
Chooses a tier and enters organisation, name, email
        |
        v
Assessment is created, reference and private link are emailed
        |
        v
Client pays (card or mobile money through Pesapal)
        |
        v
Client answers 53 questions  (saves as they go, can stop and resume)
        |
        v
Client submits  -->  score and tier shown on screen
        |
        v
Client invites up to five stakeholders  -->  each gets an email
        |
        v
Stakeholders each answer 40 questions
        |
        v
When the last one answers, the report is written automatically
        |
        v
Client is emailed a link to the report

Alongside, at any point:
Administrator reviews, edits, and sends the final report
(even if some stakeholders have not answered)
```

### 4.2 Step by step

**Step 1. Choosing a tier.** On the Rate My Impact page the client sees three tiers. Essential and Professional are bought online. Enterprise is quoted, so it leads to the contact form. The names, prices and contents of the tiers are the firm's to change (Section 9.1).

**Step 2. Entering details.** The client gives the organisation name, their own name and a work email. This is enough to open the assessment.

**Step 3. The reference is emailed straight away.** Before payment, the system creates the assessment and emails the client their reference and private link. This is deliberate: if anything goes wrong at the payment page, they still have a way back in.

**Step 4. Payment.** The client is sent to Pesapal to pay (or, while testing with the payment switch off, goes straight on). When they return, a page confirms the payment (it may take a few moments to settle) and offers "Start my assessment".

**Step 5. Answering the questions.** All 53 questions are on one page, grouped into four pillars, with a progress bar. Answers save automatically. The client can leave and return on any device using the emailed link, or by entering their reference on the resume page.

**Step 6. Submitting.** If any question is unanswered, the client is told how many and can jump to the first one, or submit anyway. On submitting they see their score, tier, a pillar-by-pillar breakdown and their heaviest gaps.

**Step 7. Inviting stakeholders.** The results page asks the client to name the people who see the organisation from outside (name, email and relationship). Each person is emailed a private survey link.

**Step 8. Stakeholders answer.** Each stakeholder opens their link, reads the first screen (which links to a glossary), and answers 40 yes or no questions. It takes about ten minutes.

**Step 9. The report is written.** When the last invited stakeholder answers, the report is written without anyone pressing a button, and the client is emailed a link to it. The results page also has a "Generate a draft now" button, for the case where a stakeholder never answers.

**Step 10. Review and sending.** An administrator can open any organisation, read the report, edit the wording, and send the final version to the client, even when some stakeholders have not answered. The system warns the administrator, in a confirmation window, exactly who is outstanding.

### 4.3 Where an assessment can be

| Stage | Meaning |
| --- | --- |
| In progress (draft) | Started, not yet submitted |
| Submitted | Client has finished and submitted |
| Waiting on stakeholders | Invitations sent, some not yet answered |
| Report drafted | Report written, not yet reviewed |
| Report issued | An administrator has edited and saved it |
| Report sent | An administrator has sent it to the client |

Payment has its own state, covered in Section 9.

---

## 5. The public website

| Page | Purpose |
| --- | --- |
| **Home** | Introduces Rejuvenate Responsibly, its approach, its services and a teaser for Rate My Impact |
| **About** | The firm and its values |
| **Services** | The five service lines (below) |
| **Why Rejuvenate** | What sets the firm apart |
| **Rate My Impact** | Explains the assessment, shows pricing, and starts it |
| **Glossary** | Plain-English definitions of the terms used in the questions |
| **Resume** | Enter a reference to get the private link emailed again |
| **Contact** | Enquiry form, goes to the firm's inbox, whose address is set in Settings, Website |

### The five services

1. Sustainability Strategy Development
2. ESG Advisory
3. CSR Programme Design and Implementation
4. Reporting and Disclosure
5. Sustainable Finance and Investment

### The contact form

A visitor gives name, email, organisation, topic and a message. It is delivered by email to the firm's enquiries inbox. It includes a hidden field that real people never see; if software fills it in, the message is quietly discarded. This keeps automated junk out without asking visitors to solve puzzles.

### Contact details shown on the site

- Location: Nairobi, Kenya
- Email: info@rejuvenateresponsibly.com
- Phones: +254 709 000 507 and +254 108 000 507
- WhatsApp: +254 108 000 507

---

## 6. The assessment

### 6.1 The two sets of questions

| | Client assessment | Stakeholder survey |
| --- | --- | --- |
| Questions | 53 | 40 |
| Answers | Yes or no, then a follow-up on every yes | Yes or no |
| Written from the point of view of | The organisation | An outsider describing the organisation |
| Who answers | The submitter | Each invited stakeholder |

The question bank comes from the firm's own workbook, *RMI Sustainability Self Assessment 2026*. The full list is in Appendices A and B.

### 6.2 The four pillars

| Pillar | What it asks about |
| --- | --- |
| **Corporate Governance** | How the board, leadership and controls hold the organisation accountable for its sustainability commitments |
| **Economic Viability** | Whether sustainability is built into strategy, capital allocation and long-term value |
| **Environmental Impact** | Energy, emissions, water, waste, packaging and the materials sourced |
| **Social Responsibility** | How the organisation treats employees, suppliers, customers and communities |

| Pillar | Client questions | Share of the client score |
| --- | --- | --- |
| Corporate Governance | 13 | about 19% |
| Economic Viability | 13 | about 24% |
| Environmental Impact | 13 | about 27% |
| Social Responsibility | 14 | about 30% |

Each question is tagged with the Sustainable Development Goals (SDGs) and the Global Reporting Initiative (GRI) standards it relates to, and these tags appear in the report.

### 6.3 What the client experiences

- **One page.** All questions are on a single page. A side rail (or a row of chips on a phone) shows progress in each pillar and lets the client jump between them.
- **Saves as you go.** Each answer is stored immediately. A copy is also kept on the device, so a dropped connection does not lose work.
- **Resume anywhere.** The emailed link reopens the assessment on any device. The reference alone is not enough; the private link is the key.
- **A hand to hold.** Questions with technical terms have a "what does this mean" reference, and there is a glossary page.
- **Unanswered questions.** On submit, the client is told how many remain and can go to the first. They may still submit; unanswered questions simply earn no credit.
- **Clear and start again.** Answers can be cleared; the reference stays valid.

### 6.4 What the client sees on submitting

- Overall score out of 100 and their tier (Bronze, Silver, Gold or Platinum).
- Coverage and depth (explained in Section 7).
- Pillar-by-pillar scores.
- Their heaviest gaps: the highest-weighted topics they answered "no" to.
- The step to share with stakeholders.
- The report button and an explanation of when the report arrives.

---

## 7. How scoring works

### 7.1 The idea

Every question carries a **weight**: how much it matters. The weights across the 53 client questions add up to 100, so the score reads naturally as "out of 100".

For each question:

- **Yes** earns the full weight for **coverage** ("the practice exists").
- A **yes to the follow-up** earns the same weight again for **depth** ("and there is evidence behind it").
- **No** earns nothing. **Unanswered** earns nothing and is not counted as a gap.

The **overall score** is the average of coverage and depth. This means:

| Situation | What it earns |
| --- | --- |
| No | 0 |
| Yes, but no evidence | Half the weight |
| Yes, with evidence | The full weight |

So an organisation cannot reach the top by saying "yes" alone. A perfect 100 needs evidence behind every answer.

### 7.2 Tiers and levels

| Overall score | Tier | Level | What it signals |
| --- | --- | --- | --- |
| 0 to 54.9 | **Bronze** | Emerging | Foundations are being laid. Priority is policy and ownership before chasing metrics |
| 55 to 71.9 | **Silver** | Adequate | Practices exist and work, but depth and assurance are uneven across pillars |
| 72 to 86.9 | **Gold** | Strategic | Sustainability is part of strategy and governance, with credible disclosure |
| 87 to 100 | **Platinum** | Excellent | Sector-leading practice with independent assurance and disclosure that would survive scrutiny |

Each pillar is given the same four levels using the same thresholds.

### 7.3 A worked example

An organisation answers "yes" to 40 of 53 questions. Of those 40, it can show evidence for 20.

- Coverage: the weight of the 40 "yes" answers, as a share of 100 (say 75).
- Depth: the weight of the 20 evidenced answers (say 38).
- Overall: the average of the two, about 56.5, which is **Silver**.

Moving ten practices from "exists" to "evidenced" raises depth, and therefore the overall score, without adding a single new practice. This is the message the report gives: where the weight sits, and what to do next.

---

## 8. Stakeholder surveys and the perception gap

### 8.1 Who is invited

The client names up to five people, each with a name, an email address and a relationship (for example supplier, employee, customer, investor, community partner or regulator liaison). Each person gets their own private link. Nobody can answer twice from the same link, and nobody sees anyone else's answers.

### 8.2 What the stakeholders are told

The invitation tells them the survey is 40 yes or no questions, takes about ten minutes, and that their answers are reported alongside the other respondents and "never attributed to you by name" in the client's report.

### 8.3 How the outside view is combined

Several stakeholders may disagree. The platform takes the **majority view on each question**. If it is an exact tie, it counts as "yes". This produces one **stakeholder consensus score** and one score per pillar.

### 8.4 The perception gap

For each pillar, the report compares the client's own score with the stakeholder consensus. A large positive gap means the organisation rates itself higher than outsiders do. A negative gap means outsiders think better of it than it does of itself.

**Please note.** Stakeholders are asked only the first-level question, not the evidence follow-up, so their consensus score cannot exceed 50, while a client's score can reach 100. A strong organisation with unanimous, positive stakeholders can therefore still show a gap of around 50 points. The gap is a useful signal of direction and relative size across pillars, but the absolute numbers should not be read as a precise measure. This is listed in Section 17.

---

## 9. Pricing and payment

### 9.1 The tiers

| Tier | Price | What is included |
| --- | --- | --- |
| **Essential** | KES 35,000 per assessment | 53-question self-assessment across four pillars; three stakeholder surveys; scored report with SDG and GRI mapping; gap analysis and prioritised roadmap; issued on Rejuvenate Responsibly letterhead |
| **Professional** | KES 85,000 per assessment | Everything in Essential, plus five stakeholder surveys; perception gap analysis; ninety-minute expert validation call; board-ready presentation; benchmarking against sector peers |
| **Enterprise** | Quoted | Everything in Professional, plus multiple entities or subsidiaries; quarterly monitoring dashboard; full diagnostic and assurance readiness review; support through the NSE disclosure cycle |

Enterprise is not sold online; "Start a conversation" leads to the contact form with the enterprise topic selected.

**These are the starting tiers.** Each company sets its own in **Settings, Pricing**: the name, the price, the summary and what is included, one line per item. A tier with no price shows as quoted, and a tier can be hidden from the pricing page. Prices are shown in the company's currency (Settings, Organisation), which follows its country unless another is chosen.

### 9.2 How a payment works

1. The client enters their details and presses Pay.
2. The platform opens an order with **Pesapal** (the payment provider), using the company's own Pesapal account or the installation's shared one (Section 12.9), and sends the client to Pesapal's secure page.
3. The client pays by card or mobile money.
4. Pesapal sends the client back to a confirmation page and, separately, tells the platform the payment has settled.
5. The platform never takes Pesapal's word from the return trip alone. It asks Pesapal directly for the true status before marking anything as paid.

### 9.3 Payment states

| State | Meaning |
| --- | --- |
| Unpaid | Assessment exists; no payment attempted |
| Payment pending | Pesapal checkout opened; not yet settled |
| Paid | Pesapal confirmed the payment |
| Payment failed | Pesapal reported failure or reversal |
| Payment waived | Opened while the "require payment" test switch was off (see Section 13). Never counted as paid |

### 9.4 Sandbox and live

Pesapal provides a test environment (the "sandbox") that moves no real money. The platform uses it until switched to **live**, which is done when the merchant account is approved. The switch is in Settings, Pricing, for the company that owns the account.

### 9.5 If payment is not set up

If Pesapal credentials are missing, the Pay button says plainly that card payment is not switched on and invites the client to contact the firm for an invoice. Nothing is a dead end. The client's reference is still emailed. A company that has switched sharing off and not yet added its own Pesapal account sees a set-up banner in Live (Section 12.7).

While the **Require payment** switch is off (Section 13.8), the Pay buttons read "Start assessment" and the assessment opens without payment, marked "waived".

---

## 10. The report

### 10.1 What the report contains

Every report follows the same structure, so it can be placed on the firm's letterhead.

1. **Title and subtitle**: the organisation's name and year, with a short subtitle.
2. **Executive summary**: overall score and tier, what the organisation does well, where it is exposed.
3. **Pillar I: Governance and ethics**
4. **Pillar II: Economic viability**
5. **Pillar III: Environmental stewardship**
6. **Pillar IV: Social responsibility**
   - Each pillar has a one-line framing, a table of four metrics (assessment metric, performance level, KPI or disclosure) and a short "management approach" paragraph.
7. **Gap analysis and strategic roadmap**: three numbered gaps, heaviest first, with what to do about each, plus one opportunity for the organisation's sector.
8. **Conclusion and commitment**: one paragraph and a short "next steps" list in two phases.
9. **Closing block**: who generated it, the framework (NSE Kenya ESG Disclosure Manual and GRI Standards) and the assessment reference.

The printed report also carries a note that it is issued on the basis of self-declared responses and the stakeholder survey, and is **not an audit**. It can be printed or saved as a PDF straight from the report page.

### 10.2 How it is written: two stages

Reports are written in two passes, by two different AI models, so that the result is both structured and natural to read.

**Stage 1: the draft.** A low-cost model receives the scored result, the heaviest gaps, the practices that lack evidence, the stakeholder consensus and the perception gap. It is told to use only that evidence, never to invent a figure, project, partner or certification, and to say so where the evidence is thin.

**Stage 2: the humaniser.** A second model edits the draft's wording using a set of rules that remove the tell-tale habits of machine-written text: staged openings, one-line "punchline" closers, forced groups of three, over-use of dashes, inflated claims, sales language and decorative formatting. The rules are based on Wikipedia's guide to recognising AI writing, kept in the platform in full.

**Every report goes through the humaniser.** There is no path that stores a draft which skipped it.

### 10.3 Safeguards on the edit

The humaniser must not change the substance. After it finishes, the platform checks that:

- every heading is still there, at the same level and in the same order;
- every table still has all its rows;
- every score, percentage and the assessment reference are still present;
- the length has not changed wildly (no padding, no cutting findings);
- the horizontal rule before the closing block is still there.

If the check fails, the humaniser is asked once more, told what was wrong. If it fails again, the report is not stored at all and the person is asked to try again. **An unchecked draft never reaches a client.**

### 10.4 House style

Both passes follow the firm's writing rules:

- Plain British English.
- No dashes used as punctuation, no curly quotes, no emoji.
- No bold-label bullet lists.
- No "Additionally" or "Moreover"; no "pivotal", "vibrant", "robust", "holistic" or "testament"; the word "journey" is not used.
- No "not just X but Y" constructions; points are not forced into threes.
- "Is" and "has" rather than "serves as" and "boasts".
- Headings in sentence case.
- No greeting or sign-off; the output is the report and nothing else.

A final clean-up step removes any remaining em or en dashes, curly quotes and emoji, and replaces a short list of stubborn phrases with plain equivalents.

### 10.5 What it costs to write a report

Costs depend on the models chosen in Settings. With the defaults:

| Stage | Default model | Approximate cost per report |
| --- | --- | --- |
| Draft | DeepSeek V4 Flash | well under one US cent |
| Humaniser | OpenAI GPT-4.1 mini | under one US cent |
| **Total** | | **under one US cent** (about USD 8 per 1,000 reports) |

For comparison, drafting alone on Claude Sonnet 4.5, which was used before, came to about USD 0.04 per report. The Settings page shows the live estimate for whichever pair of models is selected.

These are estimates based on the measured size of a typical report. A retry after a failed check costs a little extra. In testing, one report took about 25 seconds from start to finish.

### 10.6 Review, edit and send

| Action | What happens |
| --- | --- |
| **Read** | Any administrator can read the report on the organisation's page |
| **Edit** | The administrator changes the wording in a full-page editor. The original generated text is always kept, so an edit can never destroy it. An edited report is marked "Report issued" |
| **Write report now** | If no report exists (the automatic one waits for every stakeholder), the administrator can generate one from the answers received so far |
| **Send report** | Emails the client a link to the report. See below |

### 10.7 Sending the final report

Pressing **Send report** opens a confirmation window that says the report is final.

- It states who it is going to and that the version sent is the one on screen, including edits.
- **If any stakeholders have not answered**, the window lists each one by name, email and relationship, notes if an invitation never arrived, says how many responses the report rests on, and requires the administrator to tick that they understand the report goes out without those answers. The send button stays disabled until they do.
- **If nobody was invited**, it says the report has no outside view.
- **If it was sent before**, it says when and by whom, and whether it has been edited since.

The server re-checks all this independently, so the safeguard cannot be bypassed. If email is not connected, the window reports that nothing was sent and does not record a send. Each send records who sent it, when, and how many answers were outstanding.

---

## 11. Emails the system sends

All emails are plain text, sent from "Rate My Impact" at no-reply@rejuvenateresponsibly.com (the address can be changed). Text in {braces} is filled in automatically.

### 11.1 Assessment access: sent when an assessment is created, and again when someone asks to resume

**When:** immediately after the client enters their details, and whenever they use the Resume page.
**To:** the client.
**Subject:** `Your Rate My Impact assessment: {reference}`

> Hello,
>
> Your Rate My Impact assessment for {organisation} is open, and this is the reference you will need to get back into it.
>
> Assessment ID: {reference}
> Your link: {private link}
>
> Keep that link. It is the only way back to your answers, and anyone holding it can see them, so treat it like a password.
>
> Your answers save as you go, so you can close the tab, hand a pillar to a colleague and come back whenever suits.
>
> Once you submit, you will be asked to add the people who see your operations from the outside. They each get a shorter survey, and your report is written once they have all answered.
>
> Reply to this email if anything gets in the way.
>
> The RMI Sustainability Team
> Rejuvenate Responsibly

*Note:* the Resume page always replies "sent" whether or not the reference exists, so it cannot be used to discover which references are real.

### 11.2 Stakeholder invitation

**When:** when the client submits their list of stakeholders. One email per person, sent once.
**To:** each stakeholder.
**Subject:** `A short survey about {organisation}`

> Hello,
>
> {organisation} has asked for your view as part of the Rate My Impact Sustainability Self-Assessment 2026.
>
> It is 40 yes or no questions about governance, economic, environmental and social practice. Most people finish in about ten minutes. Your answers are reported alongside the other respondents and are never attributed to you by name.
>
> Your survey: {survey link}
>
> The first screen links to a glossary if any of the terms need pinning down.
>
> Thank you for the time.
>
> The RMI Sustainability Team
> Rejuvenate Responsibly

### 11.3 Report ready: when every stakeholder has answered

**When:** automatically, as soon as the last invited stakeholder answers (or when the client generates a draft themselves).
**To:** the client.
**Subject:** `Your Rate My Impact report is ready: {reference}`

> Hello,
>
> Every stakeholder you invited has now answered, so your report for {organisation} has been written and is waiting for you.
>
> Read it here: {report link}
>
> It covers all four pillars, sets your self-assessment against what your {number} stakeholders said, and ends with a gap analysis and a roadmap.
>
> The page prints straight to PDF if you need a copy to circulate.
>
> The report is issued on the basis of self-declared responses and the stakeholder survey. It is not an audit. If you would like it validated, reply and we will arrange a diagnostic call.
>
> The RMI Sustainability Team
> Rejuvenate Responsibly

### 11.4 Report ready: sent by an administrator before everyone has answered

**When:** an administrator presses Send report while some stakeholders are outstanding.
**To:** the client.
**Subject:** `Your Rate My Impact report is ready: {reference}`

The email is the same as 11.3 with two changes. The opening becomes:

> The Rejuvenate Responsibly team has finalised your report for {organisation}, and it is ready for you.

and this paragraph is added after it, so the client is never told that everyone responded when they did not:

> It is based on answers from {number answered} of {number invited} stakeholders. {number outstanding} had not responded when it was finalised, so their view is not in it.

### 11.5 Delivery notice: an invitation did not arrive

**When:** an administrator chooses "Inform the submitter" on an organisation with undelivered invitations. The administrator sees this text first and may edit it before it is sent.
**To:** the client (the person who submitted the assessment).
**Subject:** `A survey invitation for {organisation} did not arrive` (or `Some survey invitations for {organisation} did not arrive` when there are several)

> Hello {first name},
>
> We tried to send the Rate My Impact survey to the addresses below on behalf of {organisation}, and the messages were not delivered:
>
> {address}
> Survey link: {survey link}
>
> {address}
> Survey link: {survey link}
>
> Please check each address for typing mistakes. You can reply to this email with a corrected address and we will send the invitation again, or you can pass the survey link above to each person yourself.
>
> Your report is written once everyone you invited has answered, so it is worth sorting this out soon.
>
> The RMI Sustainability Team
> Rejuvenate Responsibly

The wording adjusts to singular ("the address", "the message was not delivered", "them") when only one invitation failed.

### 11.6 Website enquiry (internal)

**When:** a visitor submits the contact form.
**To:** the firm's enquiries inbox.
**Subject:** `Website enquiry: {topic} ({organisation})`

> Name: {name}
> Email: {email}
> Organisation: {organisation or "not given"}
> Topic: {topic or "not given"}
>
> {message}

### 11.7 How email is delivered

Email goes through **Mailtrap**. It has two modes:

- **Testing:** every message is caught in a private test inbox and nothing reaches a real person. Used while the system is being tried out.
- **Live:** messages are delivered for real from the verified sending domain.

In **Settings, Email** a master **Send email** switch and a switch for each kind of email decide what goes out at all, and **See template** shows the wording as it will read (Section 13.7). Team invitations can be switched off too, leaving a password set by hand as the only way to add someone.

If no mail account is connected at all, nothing is sent. The system says so on screen instead of pretending, and shows the client their link to copy by hand.

### 11.8 If an invitation does not arrive

Each stakeholder invitation is sent **once** and is not retried. The platform records whether it was delivered. If not, the administrator is alerted (Section 12.8) and can tell the client using the editable notice above. There is currently no "resend" button; the client replies with a corrected address, or passes the link on themselves.

---

## 12. The admin dashboard

The dashboard is for the firm's own people, at the address `/dashboard` on the website. What each person sees depends on their role (Section 3.2) and on two switches that belong to them: Demo or Live, and which companies they are looking at.

### 12.1 Signing in

- Dashboard users sign in with an email address and password.
- There is **no Google sign-in and no public sign-up page**. The way in is an email address and a password, and only for people already on the list.
- **Signing in is not enough.** An account must also be on the approved list for the dashboard. A person who has an account but is not on the list is turned back with a clear message. If anything about the check is unclear, the answer is no.
- People are added from **Settings, Team** (Section 12.10). New people are emailed a link to choose their own password, or given a password by the person adding them.

### 12.2 The top bar

The bar is kept quiet. From left to right:

- The logo, which returns to Analytics.
- **Analytics**, **Responses**, **Settings**.
- The **Demo / Live** switch (Section 12.3).
- The **bell** (Section 12.7), with a count of what needs attention.
- The **account menu**: the round button with the person's initials.

The account menu holds the name, email and role, then the choices that do not belong on every page:

- For a **super admin** only: **Companies shown**, with an **All / Own** switch and a company picker listing every company (their own marked "yours"). This is the only place on the dashboard where the company in view is chosen. Pages simply follow it.
- **View the website** and **Sign out**.

**Banner on the public site.** When someone on the dashboard list is signed in and visits the public website, a small banner at the bottom says so and offers **Open dashboard**. It can be dismissed for the session, and does not appear on the dashboard or sign-in pages.

![The account menu of a super admin: role, All or Own, and the company picker](screenshots/account-menu.jpg)
*The account menu of a super admin: role, All or Own, and the company picker*

### 12.3 Demo and Live

Every person starts on **Demo**. The switch moves them between two views of the same platform:

| | Demo | Live |
| --- | --- | --- |
| **Shows** | Only the sample submissions | Only real clients |
| **Set-up banners** | Switched off. A missing key is a fact about the live platform, not something to put in front of a prospect | Shown |
| **Strip under the bar** | A line saying Demo is on and sample data only is showing | None |
| **Sample companies** | Shown | Hidden |

Switching moves nothing and deletes nothing. It only changes what is on that person's screen.

![Analytics in Demo: the Demo strip under the bar, the totals and the notifications card](screenshots/analytics-demo.jpg)
*Analytics in Demo: the Demo strip under the bar, the totals and the notifications card*

### 12.4 What is remembered between sign-ins

How a person last left the dashboard is saved **on their own account**, not in the browser, so it survives signing out and signing in again, and follows them to another browser:

- Demo or Live.
- For a super admin: all companies, their own, or a specific company.
- Which set-up banners they closed.

Nobody else's view is touched. A person who has never changed anything starts on Demo, with a super admin looking at all companies.

### 12.5 Analytics

Totals across every organisation **in view**:

- Organisations, submitted, paid (real payments only), stakeholders invited, responses received, reports written.
- A banner if any stakeholder invitations did not arrive, listing the organisations affected and whether the client has been told.
- The **Notifications and recent activity** card (Section 12.7).
- Charts: average score for each pillar, how many organisations are in each tier, assessments started and submitted by month, and the topics most often answered "no".
- For a super admin, a **Companies** card at the very bottom: each company with its assessments, submissions and people. It follows Demo and Live, so Demo lists the sample companies and Live the real ones.

![The Companies card at the bottom of Analytics, after the charts](screenshots/companies-card.jpg)
*The Companies card at the bottom of Analytics, after the charts*

![The same dashboard in Live: only real work, and the set-up items the company still has to finish](screenshots/analytics-live.jpg)
*The same dashboard in Live: only real work, and the set-up items the company still has to finish*

### 12.6 Responses

A list of every organisation in view showing sector, when it started, status, payment, score and tier, stakeholders answered out of invited, and report state. Organisations with undelivered invitations are flagged in red. When a super admin has all companies in view, a **Company** column says whose each row is. The spreadsheet export follows the same view.

Opening an organisation shows:

- Contact details, status, payment and report badges.
- Overall, coverage, depth, and stakeholder progress.
- **Undelivered invitations** (if any) with the **Inform the submitter** button.
- **Parties involved**: each stakeholder with name, email, relationship, when invited, whether the email was delivered, whether they answered, and their score.
- **Pillar scores** and a chart comparing the client's view with the stakeholders'.
- **Where the weight sits**: the heaviest gaps.
- **The report**: the text, who and what wrote it, when edited and sent, with **Edit report** and **Send report** (or **Write report now** if there is none).

**A reference is not a permission.** Every page and every action on an assessment checks that it belongs to the company in view. Another company's reference answers exactly as if it did not exist, so codes cannot be probed.

![Responses with the Company column, shown when a super admin has all companies in view](screenshots/responses.jpg)
*Responses with the Company column, shown when a super admin has all companies in view*

### 12.7 Notifications and recent activity

Two places say what needs attention: the bell in the bar and the card on Analytics.

**The card** has three tabs:

- **Needs you**: what is waiting on the person, each with a button that goes straight to it (a key not set up, reports waiting to be sent, invitations that did not arrive, reports about to expire).
- **New**: what happened since they signed in, plus what they missed since their last visit, marked "While you were away".
- **All activity**: the last 30 days, grouped by day, with times such as "5 min ago". When more than one company is in view, each row names its company.

**The set-up banners** at the top of every Live page cover what is not set up: payments, report writing, the report template. Each has a **close button**. Closing is saved on the person's account (Section 12.4) and the notice stays closed while the same thing is still wrong. The item stays in the card until it is fixed. When OpenRouter credits run out, the company's admin is told on the dashboard.

### 12.8 Delivery problems

When a stakeholder invitation fails to arrive (a typo in the address, a rejected mailbox, or no mail account connected at the time), the administrator is told in three places: the Analytics page, the Responses list and the organisation page.

Pressing **Inform the submitter** opens the message in an editor, prefilled with the failed addresses and their survey links. The administrator can change the subject and the body. It is sent exactly as written, only to the submitter's own address on the assessment, and the invitations are then marked as "submitter told" with the date. They stay flagged until the person actually answers.

### 12.9 Companies

Settings, **Companies** (super admin only) lists every company on the installation with its people, its assessments and what it is ready to use.

- **Create or close a company.** A closed company keeps its data and stops taking new assessments.
- **Sample.** A company marked Sample is for demonstrating: its records show in Demo only, and its name carries a Sample badge. The two seeded companies are marked this way.
- **Sharing.** For each company, three things can be shared with the installation: the **payment account (Pesapal)**, the **report-writing key (OpenRouter)** and the **report template**. All three are shared by default, so a new company works from its first day. Switching one off means that company's own admins must set up their own, and until they do, their dashboard shows a banner saying what is missing and to configure it or contact the administrator.
- **View.** A super admin can step into a company to use the platform as its owner does, from the account menu.

![Settings, Companies: choosing where to work](screenshots/settings-companies.jpg)
*Settings, Companies: choosing where to work*

![The sharing ticks for each company, and the sample badge](screenshots/companies-sharing.jpg)
*The sharing ticks for each company, and the sample badge*

### 12.10 Team

Settings, **Team** lists everyone who can open the dashboard.

- An **owner** (or super admin) can **Add someone**: email, optional name, **role** (Member, Admin, Owner, and for a super admin, Super admin) and how they get in (an emailed link to set their own password, or a password the owner sets and passes on; it is never emailed).
- A super admin also chooses the **company**, and can change a person's company or role from a dropdown on their row. An owner's additions join the owner's company.
- Other actions per person: **Resend the link**, **Set a password**, **Remove**. Removing ends access at once; the account itself is kept so adding them back is one step.
- Guard rails: the last super admin and the last owner of a company cannot be removed or demoted, and nobody can remove or step down themselves.
- Admins and members see the list but cannot change it.

![Settings, Team: the role dropdown (Member, Admin, Owner, Super admin) with what each can do](screenshots/team-roles.jpg)
*Settings, Team: the role dropdown (Member, Admin, Owner, Super admin) with what each can do*

### 12.11 Editing a report

The editor opens as a **full page**. The dashboard's top bar stays in place, with **Back** at the far left returning to the organisation, and the document fills everything beneath it, edge to edge and to the bottom of the screen, resizing with the window.

The **Save report** button and a "Saved at" note sit in the top bar, next to the name of the organisation being edited. The original generated text is always preserved underneath. Saving replaces what the reader sees, marks the report as issued, and records who edited it and when.

### 12.12 Sample data

Settings, **Sample data** loads invented organisations so the dashboard, report flow and edge cases can be tried without real clients. Each carries a **Sample** badge beside its name.

- **Per company.** Samples are shared out between the sample companies, so each company shows its own different handful rather than the same sixteen. Loading, counting and clearing work on the companies in view: a super admin with all companies in view loads and clears them all; anyone else, or a super admin inside one company, affects only that company. Other companies' samples and every real record are left exactly as they were.
- **Coverage.** Between them they cover every payment state, all four tiers (including a perfect and a zero score), every stage of stakeholder response, every report state, delivery failures with and without the submitter told, and awkward inputs such as blank fields, symbols and accents, a very long name and a perfectly split vote.
- **Why some names look odd.** One sample, RMI-SMP013, is deliberately given an organisation name full of symbols and accents (an ampersand, angle brackets, quotation marks) and blank contact fields. It exists to prove that unusual names display and print correctly, so its report title looks strange on purpose. Another is deliberately split down the middle to test a tied vote.
- **Reset.** **Reset the samples** puts them back to their starting state after they have been edited.
- **Viewing.** Samples show only in **Demo**. There is no separate hide switch; Live simply does not show them.
- **Safety.** All sample email addresses are on example.org, which cannot receive mail, and no email is sent when they are loaded.

---

## 13. Settings, secrets and test controls

Settings (in the dashboard) gathers everything that previously needed a developer to change. It is organised in **tabs**, one subject at a time. The tabs shown depend on the role: Companies is for the super admin, and a member sees the others read-only.

### 13.1 What can be set

| Tab | What it holds | Notes |
| --- | --- | --- |
| **Organisation** | Country and currency | The country sets the currency unless another is chosen. Everything priced follows it: the tiers on the website, what a report costs to write, what a client is charged |
| **Website** | Contact details and social links shown on the public site | Includes the inbox address that receives contact-form enquiries |
| **Branding** | The company's logo and stamp | Used on reports. Colours taken from the logo change only that company's dashboard |
| **Pricing** | The tiers and, where the company has its own account, the payment keys | Pesapal consumer key, consumer secret, environment (sandbox or live), optional IPN id. Keys are write-only |
| **Report writing** | The OpenRouter key, the drafting model and the humaniser model | Models chosen from a dropdown with prices, or typed. Shown only when the company uses its own key |
| **Report template** | The letterhead and footer every report is wrapped in | Section 13.6 |
| **Email** | The master email switch, a switch for each kind of email, and a **See template** preview for each | Section 13.7 |
| **Team** | Who can open the dashboard, with roles and companies | Section 12.10 |
| **Sample data** | Loads, counts and removes sample submissions | Section 12.12 |
| **Companies** | Every company, with sharing, sample flag and readiness | Super admin only. Section 12.9 |

The earlier **Testing** switch, **Require payment before an assessment**, remains in Pricing. Turn it off for testing: assessments opened while it is off are marked "waived" and never counted as paid. Switch it back on before launch.

All dropdowns on these pages are drawn in the dashboard's own style, with keyboard support (arrows, Home, End, Enter, Escape, and typing a letter to jump), rather than the browser's own list.

#### Who can do what in Settings

Every tab below follows the same rule. **Super admin, owner and admin can change it; a member can only look.** What differs is whose settings they are changing, and the three things that only some roles can reach: the Team tab's controls, the Companies tab, and the keys and template that other companies share.

| Tab | Super admin | Owner | Admin | Member |
| --- | --- | --- | --- | --- |
| Organisation, Website, Branding, Pricing, Report writing, Email | Change, for the company in view | Change, for their company | Change, for their company | Look only |
| Report template | Change; also edits the template other companies share | Change when their company has its own template | Change when their company has its own template | Look only |
| Team | Add, move and remove anyone, in any company | Add, remove and re-role their company's people | List only | List only |
| Sample data | Load and clear for all companies or one | Own company | Own company | Look only |
| Companies | Everything | Tab not shown | Tab not shown | Tab not shown |

**How the roles relate inside Settings.** The super admin sets the rules that the others work within: which companies exist, which of them share the installation's payment account, report-writing key and template, and who the owners are. An owner then runs their own company inside those rules and is the only one besides the super admin who can change who has access. An admin does the daily configuration but cannot change who has access. A member sees all of it and changes none of it, and the server refuses their saves even if the page were somehow opened for them.

**Where a company shares the installation's keys,** its Pricing and Report writing tabs hide the key fields, since there is nothing for its people to fill in. Switching a share off in Companies (super admin) makes the fields appear for that company's owner and admins, and shows them a set-up banner until they are filled.

#### Organisation

Country and currency. The country sets the currency unless another is chosen, and everything priced follows it: the tiers on the website, what a report costs to write and what a client is charged. Super admin, owner and admin change it for their company; a member sees it. A company in another country is simply a company with a different setting here.

![Settings, Organisation: country and currency](screenshots/settings-organisation.jpg)
*Settings, Organisation: country and currency*

#### Website

The public site's contact details: email, location, WhatsApp, any number of phone numbers, and the social pages shown in the footer, in the order set here. It also holds the inbox that receives contact-form enquiries. Anything cleared falls back to the server's settings or to nothing. The same roles as above change it, and the changes are saved for the company in view.

![Settings, Website: contact details and social pages](screenshots/settings-website.jpg)
*Settings, Website: contact details and social pages*

#### Branding

The company's **logo** and **stamp**, and the dashboard colours taken from the logo. The logo and stamp go on every report that company issues; where they sit on the page is decided in the report template (Section 13.6). The colours change that company's own dashboard only and never touch a report. Every company has its own logo and stamp, even one that shares the installation's template.

![Settings, Branding: the logo, the stamp and the dashboard colours taken from the logo](screenshots/settings-branding.jpg)
*Settings, Branding: the logo, the stamp and the dashboard colours taken from the logo*

#### Pricing

Three things, top to bottom.

1. **The tiers.** Name, price, summary and what is included for each, with a tick to hide a tier from the pricing page. A tier with no price shows as quoted.
2. **Testing.** The **Require payment** switch (Section 13.8).
3. **Payments (Pesapal).** Consumer key, consumer secret, environment (sandbox or live) and an optional IPN id. The keys are write-only. These fields appear only for a company that uses its **own** Pesapal account. A company on the shared account sees nothing here, and the super admin, who holds the shared account, sees the fields for it.

The tiers belong to each company, so Kenya and Zimbabwe can price in their own currencies without touching each other.

![Settings, Pricing: the tiers and what each includes](screenshots/settings-pricing.jpg)
*Settings, Pricing: the tiers and what each includes*

![Settings, Pricing: the payments account and its environment](screenshots/settings-pesapal.jpg)
*Settings, Pricing: the payments account, with the keys write-only and the sandbox as the default*

#### Report writing

The OpenRouter key and the two models that write a report: the **drafting model** and the **humaniser model**. Each dropdown lists a curated set of models with their price per million tokens (a token is roughly three-quarters of a word). Prices come live from OpenRouter, refreshed hourly; if it cannot be reached, built-in figures are used and the page says so. A model can also be typed in by name. Beneath them a box shows the **average cost per report** for the chosen pair, in the company's currency, with the cost for 1,000 reports, the earlier set-up for comparison and the assumptions behind the estimate.

The key field is for a company with its **own** key. A company on the shared key shows nothing to fill in, and when the shared credit runs out its admins are told (Section 13.5). Whoever pays for the key is whoever owns it: the super admin for the shared one, each company for its own.

![Settings, Report writing: the key and the two models](screenshots/settings-report-writing.jpg)
*Settings, Report writing: the key and the two models*

![Settings, Report writing: what a report costs with the chosen models](screenshots/settings-report-writing-cost.jpg)
*Settings, Report writing: what a report costs with the chosen models*

#### Report template

The letterhead and footer every report is wrapped in, shown as the report's own pages, with the logo and stamp placement. Section 13.6 covers it in full. A company on the shared template sees an explanation instead of the editor, and its owner and admin edit the template only once the super admin has switched sharing off.

#### Email

The master **Send email** switch, a switch for each kind of email, and **See template** under each. Section 13.7 covers it in full. The switches are saved for the company in view; the mail account itself is set on the server.

#### Team

Opens the Team page (Section 12.10): who can open the dashboard, with their roles and companies. An owner (or super admin) adds, re-roles and removes people; an admin or member sees the list. The relationships between the roles are in Section 3.2.1.

#### Sample data

Loads, counts and clears the invented organisations (Section 12.12). It follows Demo and Live: samples are shown only in Demo. A company's owner or admin loads and clears only that company's samples; a super admin with all companies in view does so for all of them.

![Settings, Sample data: the on switch, counts and the cases the samples exercise](screenshots/settings-sample-data.jpg)
*Settings, Sample data: the on switch, counts and the cases the samples exercise*

#### Companies

Super admin only (Section 12.9): every company, with its link, people, assessments, whether it is a sample, and the three sharing ticks. Nobody else is told this tab exists.

#### When the database is not ready

If the database has not had its migration applied, every tab shows a **Storage** card instead of its form. It says which store is active, whether the database is ready, and how many records it holds, and offers a one-off import of earlier data (Section 14). Once the database is ready the card is no longer shown.

### 13.2 Whose settings these are

Most settings belong to **one company**: the one the person is working in. A super admin looking at all companies is saving against their own company, since a save has to go somewhere. The keys that the whole installation shares live on the installation's own company, and its admins and the super admin can change them.

By default every other company borrows the installation's payment account, report-writing key and template (Section 12.9). Where sharing is switched off for a company, that company's owner or admin sets their own, and the settings pages show their own fields instead of the shared ones.

**Choosing models.** Each model dropdown lists a curated set of models with their price per million tokens (a token is roughly three-quarters of a word). Prices are taken live from OpenRouter and refreshed hourly; if they cannot be reached, built-in figures are used and the page says so. Beneath the dropdowns a box shows the average cost per report for the chosen pair.

### 13.3 Where a value can come from

For each setting, the platform looks in this order and uses the first it finds:

1. A value **saved in the dashboard** for that company.
2. For the installation's own company only, a value in the **server's environment settings**.
3. A **built-in default**.

A company that is not the installation's own never falls back to the environment keys: either it is sharing the installation's, or it must set its own. That keeps one firm's usage from silently running up another's bill.

### 13.4 How secrets are protected

- A secret saved in the dashboard is **encrypted** before it is stored.
- It can **never be shown again**. The page shows only where it comes from and the last four characters.
- Encryption uses a **master key** that lives only on the server, never in the database. A copy of the database alone cannot reveal the secrets.
- Without the master key, the dashboard refuses to save secrets (the server's own settings keep working).
- If the master key is lost or changed, saved secrets become unreadable and must be entered again. Nothing else is affected.

### 13.5 When OpenRouter credits run out

OpenRouter answers a request with a "payment required" error when the balance is empty. The platform records the time against the company that used the key, and shows the company's admin a notice that report writing is paused until credits are added. The notice clears once a report is written successfully again. A company on the shared key sees the installation's state; a company with its own key sees its own.

### 13.6 The report template

Settings, **Report template** opens on the report itself: a **sample report**, shown as its pages side by side, shrunk to fit the width so nothing scrolls sideways, and always at least **two pages**. Clicking a page opens it larger in a popup, with Previous, Next and Escape. The sample is a full report (summary, one section per pillar, how stakeholders see it, what to do first, a roadmap and the basis of the report), so the pages show how a real one fills out.

- **Edit template** switches the editor on. While it is open the toolbar offers **Open a document** (Word, OpenDocument, RTF, HTML, Markdown or text; a PDF cannot be opened for editing), **Refresh pages**, **Save draft**, **Discard draft** and **Publish**. Closing the editor keeps the work.
- **Nothing a client sees changes until the template is published.** The page says whether the live template is the built-in one or the company's own, and shows a saved draft.
- A template needs `{{report}}` where the writing goes. Other placeholders fill in the organisation, reference, tier, score, dates, expiry notice and the firm's name, email and location. The list is beside the editor and can be clicked to copy.
- A company that shares the installation's template sees an explanation instead of the editor; its own logo and stamp still go on the shared template.

**Logos and stamp.** Three images can appear on a report, and a panel above the pages shows where each prints and moves it:

| Image | Where it comes from | Notes |
| --- | --- | --- |
| **Your logo** | Uploaded under Branding | Prints wherever `{{logo}}` is placed |
| **The client's logo** | The client, optionally, on their assessment form | Prints wherever `{{client_logo}}` is placed. Reports whose client added none show nothing there. If the template has no `{{client_logo}}`, a logo a client adds will not appear on their report, and the panel warns of this |
| **Your stamp** | Uploaded under Branding | Prints wherever `{{stamp}}` is placed |

Each has a dropdown: **Top of the first page**, **Bottom of the last page**, or **Not shown**. Changing one edits the template and redraws the pages, then appears as an unsaved draft to save and publish. **Mark them on the pages** draws a dashed, labelled frame around each image in the preview (with a grey stand-in where nothing is uploaded yet), so the position can be seen. The frames are only in the preview; a real report prints the images and nothing else.

![Report template: the Logos and stamp panel above the report pages, with dashed frames marking each image](screenshots/template-logos-pages.jpg)
*Report template: the Logos and stamp panel above the report pages, with dashed frames marking each image*

![Clicking a page opens it larger, with Previous and Next](screenshots/template-page-popup.jpg)
*Clicking a page opens it larger, with Previous and Next*

### 13.7 Emails and their templates

Settings, **Email** has a master **Send email** switch and a switch for each kind of email: assessment link, stakeholder invitations, report ready, delivery notices, team invitations and contact-form enquiries. Under each is **See template**.

**See template** opens the message in a window as it will read, with every detail that changes from one message to the next (organisation, reference, links, names) picked out as a highlighted field, and a list of those fields beneath. A **Desktop / Mobile** switch shows it at both widths. The wording shown is built by the same code that sends the email, so it cannot drift from the real thing.

If the sending domain at the mail provider has not completed its company information, mail is refused even when the DNS records are all correct. That has to be completed in the provider's own account.

![Settings, Email: a switch for each kind of email, with See template under each](screenshots/email-list.jpg)
*Settings, Email: a switch for each kind of email, with See template under each*

![See template, Desktop: the variable details are highlighted](screenshots/email-desktop.jpg)
*See template, Desktop: the variable details are highlighted*

![See template, Mobile](screenshots/email-mobile.jpg)
*See template, Mobile*

### 13.8 The test switch, in practice

1. Settings, Pricing: switch **Require payment** off.
2. On the Rate My Impact page the Pay buttons now read **Start assessment**.
3. The client details are collected, the reference is emailed, and the person goes straight into the assessment.
4. The dashboard shows "Payment waived" for these.
5. Switch it back on before real clients arrive.

---

## 14. Where the data is kept

### 14.1 Supabase

Submissions, stakeholder responses, reports and settings are stored in **Supabase**, a hosted database. It holds:

| What | Contents |
| --- | --- |
| Dashboard users | The approved list: each person's role and company. How they last left the dashboard (Demo or Live, company in view, closed notices) is kept on their own account |
| Companies | Each company on the installation, whether it is a sample, and what it shares with the installation |
| Assessments | Organisation, contact, answers, score, payment details, dates |
| Invitations | Each stakeholder, their private link, whether it was delivered, whether they answered, whether the submitter was told |
| Stakeholder responses | Each outside answer set and score |
| Reports | The current text, the original generated text, the models used, who edited and sent it, when |
| Settings | One record per company; secrets inside are already encrypted |
| Report templates | A draft and a published version for each company |

## 15. Security and privacy

| Area | How it is handled |
| --- | --- |
| **Private links** | Long, unguessable and tied to one assessment or one stakeholder. They work like passwords, and the emails say so |
| **References** | Typing a reference alone opens nothing; the private link is required. The Resume page does not reveal whether a reference exists |
| **Sign-in** | Email and password only. There is no sign-up page and no Google sign-in, so an account exists only because someone on the list added it |
| **Dashboard users** | Must be on the approved list. Checked on every page and every action. Unclear means no |
| **Companies** | Each sees only its own work. An assessment reference is checked against the company in view on every page and action, so another company's codes answer as if they did not exist |
| **Members** | Read-only. Every route that saves, sends, uploads, deletes or generates refuses them on the server, not only in the interface |
| **Secrets** | Encrypted before storage, write-only, never shown or sent back to the browser |
| **Payment status** | Never taken from the return trip; always confirmed directly with Pesapal |
| **Server key** | The privileged database key is server-only and is never exposed to the browser |
| **Spam** | The contact form has a hidden field that catches automated submissions |
| **Sample data** | Flagged and removable, with addresses that cannot receive mail |
| **Saved view** | Each person's Demo or Live, company in view and closed notices are kept on their own account, and cannot be read or changed by anyone else |
| **Reports** | State plainly that they are based on self-declared responses and are not an audit |

### A point to be aware of: anonymity

The stakeholder invitation promises the person's answers are "never attributed to you by name" **in the report**. Administrators, however, can see each stakeholder's name, relationship and score on the organisation page. The client cannot. If the promise is meant to cover the firm's own team too, the invitation wording should be adjusted or the dashboard view reduced. This is listed in Section 17.

---

## 16. Decisions we made, and why

| # | Decision | Why |
| --- | --- | --- |
| 1 | **Assessment is created and the reference emailed before payment** | If payment fails or the browser closes, the client still has a way back, and support can find them |
| 2 | **Private links instead of accounts** | Clients use this once or twice a year. Accounts and passwords add friction and support burden for little benefit |
| 3 | **Every "yes" gets an evidence follow-up** | Self-assessments flatter. The follow-up makes the score honest and gives the report something concrete to recommend |
| 4 | **Stakeholders give the outside view** | An organisation's opinion of itself is only half the story; the gap is often the most useful finding |
| 5 | **Majority view, ties count as yes** | A single clear rule that is easy to explain and cannot produce "undecided" |
| 6 | **Confirm payments directly with Pesapal** | The return page can be faked or interrupted; the provider's own record cannot |
| 7 | **Sandbox until the merchant account is approved** | No risk of real charges during build and testing |
| 8 | **Report written automatically once everyone answers** | Removes a manual step and delivers quickly; the button remains for stakeholders who never answer |
| 9 | **An administrator can send early, with a clear warning** | Real life: not everyone answers. The firm needs the choice, and the client needs the truth about what the report rests on |
| 10 | **Two-stage writing: draft then humaniser** | Cheap models are good at structure but sound machine-written; a second pass fixes tone without a premium model |
| 11 | **Move from premium to low-cost models** | Reports cost under one US cent instead of about four, with the same structure and checks |
| 12 | **Models chosen from a dropdown with live prices** | Prices change often; people should see the cost before they choose |
| 13 | **Secrets can be saved in the dashboard, encrypted, with the server settings as a fallback** | Rotate a key without a developer or a redeploy; keep the master key out of the database |
| 14 | **A test switch that records "waived" rather than "paid"** | Testing must never inflate revenue figures or confuse the books |
| 15 | **Sample data is flagged and removable** | Lets the team learn the dashboard on a live database without risk to real records |
| 16 | **Storage on Supabase** | Data must survive restarts and moves between hosts, and the dashboard already uses Supabase for sign-in |
| 17 | **Database changes are additive only** | The firm's data must never be altered by an update. Safe to repeat, safe on a populated database |
| 18 | **Importing the old file only adds** | Cannot overwrite live records, and the original file is kept as a backup |
| 19 | **Delivery results are recorded for every invitation** | Previously a failed email vanished silently and the client waited for a report that could never come |
| 20 | **Admin tells the submitter, with editable wording** | A human decision with a human tone; the draft saves time but the administrator has the last word |
| 21 | **Email and password only, no Google sign-in** | Fewer things to configure and go wrong, and the approved list is the real gate whichever way someone signs in |
| 22 | **Admin access needs a list entry, not just an account** | A stray sign-in must never expose every client's answers |
| 23 | **Dashboard has its own navigation and a "Back to website" link** | The public header on top of the dashboard was confusing; administrators move between the two often |
| 24 | **Admin banner on the public site** | Reminds an administrator they are signed in, and gives one click back |
| 25 | **Public pages stay fast and static** | The banner asks the server on demand rather than making every page personal |
| 26 | **Email through Mailtrap, with a test inbox mode** | Nothing reaches a real person until the team decides |
| 27 | **No automatic retry or resend of stakeholder invitations** | Kept simple at launch; replaced by visibility plus a notice to the client (see Section 17) |
| 28 | **Every sample carries a Sample status badge** | Mock records must be unmistakable and removable before real clients arrive, without any risk to real data. A status keeps names clean in reports and lists; a prefix put "[Sample]" in report titles |
| 29 | **Several companies on one installation, each seeing only its own work** | Firms in different countries can use one platform without seeing each other's clients. The installation's owner sees across them |
| 30 | **Keys and template shared by default, switchable per company** | A new company works on its first day, and a company that needs its own account can have one without touching the others |
| 31 | **A read-only member role, and the server refuses the writes** | Someone who only needs to look should not be able to change anything, and hiding a button is not a control |
| 32 | **Demo and Live as a switch for each person, starting on Demo** | The platform can be shown without anything real or any "not set up" notices on screen, and nobody sees client data by accident |
| 33 | **A person's view is saved on their account, not in the browser** | Closing a notice or choosing a company should still hold after signing out, and on another computer |
| 34 | **Company choice lives in the account menu only** | It is a discreet setting for the super admin and should not clutter the dashboard; pages follow it |
| 35 | **Logos are placed from the template, with a marked preview** | The firm can see where a client's logo will print before any client has added one |
| 36 | **Email wording is previewed from the code that sends it** | What the preview shows cannot differ from what goes out |
---

## 17. Known limitations and things to reconcile

These are honest gaps, collected in one place so they can be decided deliberately.

| # | Item | What it means | Suggested action |
| --- | --- | --- | --- |
| 1 | **Free preview path** | The "Preview the assessment" link on the Rate My Impact page opens the full assessment with no payment. Someone can finish and submit without paying | Decide whether to keep it as a taster or close it. The dashboard shows these as "Submitted without paying" |
| 2 | **Stakeholder limits are not enforced by tier** | The pricing promises three surveys (Essential) and five (Professional), but the system allows up to five invitations at a time for everyone | Enforce per tier, or update the pricing wording |
| 3 | **"Issued within ten working days"** | The Essential tier promises delivery in ten working days, but the report is generated automatically once stakeholders answer | Reword, or define what the ten days refer to (for example the reviewed, issued version) |
| 4 | **Perception gap is skewed** | Stakeholders are not asked the evidence follow-up, so their consensus cannot exceed 50 while client scores reach 100 | Ask stakeholders the follow-up, or compare like with like (client coverage against stakeholder coverage) |
| 5 | **Anonymity wording** | The invitation promises answers are not attributed by name; administrators can see names against scores | Align the wording with who can see what |
| 6 | **No resend button** | A failed invitation can be reported and the client told, but the system cannot resend to a corrected address | Add "resend to corrected address" on the organisation page |
| 7 | **Administrator edits skip the humaniser** | Only generated drafts are edited by the humaniser; a human's text is kept as written | Intended. Note for anyone editing |
| 8 | **Prices are typed in, not converted** | The live exchange rate is used only to show what writing a report costs in the company's currency. Tier prices are entered by hand for each company, so changing the currency does not convert them | Re-enter the prices after changing a company's currency |
| 9 | **Live payments** | Running against Pesapal's test environment | Switch to live when the merchant account is approved |
| 10 | **Report is not an audit** | Stated on every report; clients may ask for assurance | Offer the validation call or the enterprise diagnostic |
| 11 | **Roles are coarse** | Owners and admins can both change a company's settings, including its payment credentials. Only team changes are owner-only | Keep owners few. Finer roles can be added later |
| 12 | **Member needs a database change** | The database's role check must allow `member`; the migration file has it, but an existing database needs the one statement run by hand | Run the role check statement from the migration in the Supabase SQL editor |
| 13 | **Saved view needs the service key** | Demo or Live, the company in view and closed notices are saved with the server's service role key. Without it they cannot be kept | Keep `SUPABASE_SERVICE_ROLE_KEY` set on the server |
| 14 | **Sample companies hide in Live** | If every company is marked Sample, Live shows nothing at all, and the Companies card is empty | Unmark a company as sample when it starts working with real clients |
| 15 | **Placeholder images** | Several website images are generated placeholders | Replace with real photography at the same filenames |

---

## 18. Everyday tasks: how to

**See what is going on.** Open the dashboard, then Analytics. A red banner means an invitation did not arrive.

**A client says they never got their link.** Ask them to use the Resume page with their reference. If they have lost the reference, find the organisation in Responses; their contact email is on the page.

**A stakeholder never answered.** Open the organisation. If the report does not exist, press **Write report now**, review it, then press **Send report** and tick the acknowledgement. The email will say how many answers are missing.

**An invitation did not arrive.** Open the organisation, press **Inform the submitter**, adjust the wording if you like, and send. When the client replies with a corrected address, the invitation currently needs to be re-sent through the client (they can use "Add more people" on their results page).

**Edit a report before it goes out.** Open the organisation, **Edit report**. The editor opens as a full page; make changes, **Save report**, then press **Back** to return to the organisation. The original is kept.

**Test without taking payment.** Settings, Pricing, switch off **Require payment**. Remember to switch it back on.

**Change which models write reports.** Settings, Report writing. Pick from the dropdowns and watch the cost box. Save.

**Rotate a key** (Pesapal or OpenRouter). Settings, paste the new value into the field, Save. Tick "Remove the saved value" instead to hand control back to the server's settings.

**Try the dashboard with data.** Switch to **Demo** (top bar). Settings, **Sample data**, load. When done, remove them there; every sample in view is removed and real records are left alone.

**Get rid of the mock data before launch.** Settings, Sample data, remove (with all companies in view as a super admin, to clear every company). Then switch to **Live** and check Analytics: the totals should show only real organisations.

**Add a member to a company.** Settings, Team, **Add someone**, role **Member**. A super admin picks the company; an owner's additions join the owner's company. They can look at everything in their company and change nothing.

**Move someone to another company.** Super admin only. Settings, Team, the company dropdown on their row.

**Look at another company's work.** Super admin only. Account menu (your initials), Companies shown: pick **All**, **Own**, or a company from the list. Analytics, Responses and the export follow.

**Make a company use its own keys.** Super admin only. Settings, Companies, switch off sharing for what it should own. Its admin then sees a banner until they set up their own payment account, report-writing key or template.

**A notice keeps coming back.** Close it with the cross. It is saved on your account and stays closed while the same thing is still wrong. The item remains on the Analytics card until it is fixed.

**Move a logo on the report.** Settings, Report template, **Logos and stamp**: choose top, bottom or not shown, check the dashed frames on the pages, then **Save draft** and **Publish**.

**See what an email looks like.** Settings, Email, **See template** under the email, then Desktop or Mobile.

**The dashboard shows nothing.** Check you are on the right view first: in **Live** the sample companies and their records are hidden, and in **Demo** the real ones are. Then, if Settings shows a **Storage** card in place of its forms, the database is not ready: it says which store is active and how many records it holds. An empty database shows zeros; load the samples or import earlier data.

---

## 19. References

**Frameworks and standards**

- NSE Kenya ESG Disclosure Manual (Nairobi Securities Exchange): the disclosure framework the report is mapped to.
- GRI Standards (Global Reporting Initiative): the reporting standards each question is tagged against.
- United Nations Sustainable Development Goals (SDGs): every question maps to one or more of the 17 goals.

**Source material**

- *RMI Sustainability Self Assessment 2026* (the firm's workbook): the origin of the question bank, weights and mappings.
- Wikipedia, "Signs of AI writing" (WikiProject AI Cleanup): the basis of the humaniser's rules.

**Services used**

| Service | Role | Address |
| --- | --- | --- |
| Supabase | Database and administrator sign-in | supabase.com |
| Pesapal (API 3.0) | Card and mobile-money payments | pesapal.com |
| OpenRouter | Access to the AI models that write reports | openrouter.ai |
| Mailtrap | Sending email, with a test inbox | mailtrap.io |

**Models in the default setup**

| Job | Model |
| --- | --- |
| Drafting | DeepSeek V4 Flash (deepseek/deepseek-v4-flash) |
| Humaniser | OpenAI GPT-4.1 mini (openai/gpt-4.1-mini) |

**Firm contact**

- Rejuvenate Responsibly, Nairobi, Kenya
- info@rejuvenateresponsibly.com
- LinkedIn: linkedin.com/company/rejuvenate-responsibly
- X: @ReRejuvenate
- Instagram: @rejuvenate.responsibly

**Document author**

- Oliver Wainaina

---

## 20. Glossary

| Term | Meaning |
| --- | --- |
| **Administrator** | Anyone on the approved list with access to the dashboard. See Super admin, Owner, Admin and Member |
| **Super admin** | The role that sees every company and holds the keys and template the others share |
| **Owner** | A company's lead on the dashboard: works the company's submissions and manages its team |
| **Admin** | Works a company's submissions and settings; does not manage the team |
| **Member** | Read-only dashboard access to one company |
| **Company** | One firm using the installation, with its own work, settings and team |
| **Sharing** | A company borrowing the installation's payment account, report-writing key or template instead of its own |
| **Demo / Live** | The two views of the dashboard: sample data and no set-up notices, or real data and notices |
| **Sample company** | A company that exists to demonstrate the platform; its records show in Demo only |
| **Assessment** | One organisation's 53-question self-assessment and everything attached to it |
| **Coverage** | How much of the weighted list of practices the organisation says it has |
| **Depth** | How much of that it can back with evidence |
| **Consensus** | The majority view of the stakeholders on each question |
| **Perception gap** | The difference between how an organisation rates itself and how outsiders rate it, for each pillar |
| **Pillar** | One of four themes: governance, economic, environmental, social |
| **Tier** | The overall band: Bronze, Silver, Gold or Platinum |
| **Humaniser** | The second editing pass that makes a drafted report read naturally |
| **Private link** | The long web address that opens one assessment or survey. Works like a password |
| **Reference** | The short code, like RMI-7F3K2Q, that identifies an assessment |
| **Waived** | A payment that was skipped because the test switch was off. Never counted as revenue |
| **Sandbox** | A payment provider's practice environment that moves no real money |
| **Secret** | A password-like value, such as a payment key. Stored encrypted and never shown again |
| **Master key** | The server-only value that locks and unlocks saved secrets |
| **Migration (database script)** | A set of instructions that prepares the database. Ours only add, never change existing data |
| **Token (AI)** | A small piece of text, roughly three-quarters of a word, which AI models are priced by |
| **ESG** | Environmental, social and governance |
| **CSR** | Corporate social responsibility |
| **GRI** | Global Reporting Initiative: a widely used set of sustainability reporting standards |
| **SDG** | The UN's 17 Sustainable Development Goals |
| **NSE** | Nairobi Securities Exchange |
| **Stakeholder** | Someone who deals with the organisation from outside and is invited to give a view |

---

## Appendix A: The 53 client questions

Topic, weight within the 100-point score, and the SDG and GRI references used in the report.

### Corporate Governance (13 questions, weight 18.9 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Board Oversight | 1.3 | SDG 16 | GRI 2-9 to 2-18 |
| 2 | Leadership & Accountability | 1.3 | SDG 16 | GRI 2-9 to 2-18 |
| 3 | Ethical Conduct | 1.3 | SDG 16 | GRI 205, 206 |
| 4 | Risk Management Integration | 1.3 | SDG 16 | GRI 2-23 |
| 5 | Board Diversity | 1.3 | SDG 5, 16 | GRI 405 |
| 6 | Stakeholder Engagement | 1.3 | SDG 17 | GRI 2-29 |
| 7 | Internal Controls | 1.3 | SDG 16 | GRI 2 |
| 8 | Responsible Lobbying | 1.3 | SDG 16 | GRI 415 |
| 9 | Purpose & Values | 1.3 | SDG 16 | GRI 2-23 |
| 10 | Whistleblower Protection | 1.3 | SDG 16 | GRI 2-25, 2-26 |
| 11 | Indigenous Knowledge & Traditional Leadership | 3.0 | SDG 11, 16 | GRI 411 |
| 12 | Anti-Corruption (Facilitation Payments) | 1.3 | SDG 16 | GRI 205 |
| 13 | Land Rights & FPIC | 1.3 | SDG 1, 16 | GRI 411 |

### Economic Viability (13 questions, weight 23.9 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Sustainable Strategy | 1.3 | SDG 8, 9 | GRI 2 |
| 2 | Financial Transparency | 1.3 | SDG 16 | GRI 201 |
| 3 | Risk Management | 1.3 | SDG 16 | GRI 2 |
| 4 | Ethical Tax Practices | 3.0 | SDG 16, 17 | GRI 207 |
| 5 | Innovation | 3.0 | SDG 9 | GRI 203 |
| 6 | Long-Term Value | 1.3 | SDG 8 | GRI 201 |
| 7 | Circular Business Models | 1.3 | SDG 12 | GRI 306 |
| 8 | Capital Allocation | 1.3 | SDG 9 | GRI 201 |
| 9 | Resilience | 1.3 | SDG 9, 11 | GRI 2 |
| 10 | ESG-Linked Compensation | 1.3 | SDG 16 | GRI 2-19 |
| 11 | Financial Inclusion (Mobile Money) | 3.0 | SDG 1, 9 | GRI 203 |
| 12 | Common-User Infrastructure | 3.0 | SDG 9, 11 | GRI 203 |
| 13 | Intra-African Trade (AfCFTA) | 1.3 | SDG 8, 17 | GRI 201 |

### Environmental Impact (13 questions, weight 27.3 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Energy & Climate | 3.0 | SDG 7, 13 | GRI 302, 305 |
| 2 | Waste & Circularity | 1.3 | SDG 12 | GRI 306 |
| 3 | Water Stewardship | 1.3 | SDG 6 | GRI 303 |
| 4 | Sustainable Sourcing | 1.3 | SDG 12 | GRI 308 |
| 5 | Biodiversity & Ecosystems | 1.3 | SDG 15 | GRI 304 |
| 6 | Sustainable Innovation | 3.0 | SDG 9 | GRI 203 |
| 7 | Environmental Management System | 1.3 | SDG 12 | GRI 307 |
| 8 | Supply Chain Footprint | 1.3 | SDG 12 | GRI 308 |
| 9 | Reporting & Transparency | 1.3 | SDG 16 | GRI 2 |
| 10 | Climate Risk | 3.0 | SDG 13 | GRI 201-2 |
| 11 | Energy Access & Security | 3.0 | SDG 7 | GRI 203 |
| 12 | Water & Food Security | 3.0 | SDG 2, 6 | GRI 203 |
| 13 | Just Transition | 3.0 | SDG 7, 8 | GRI 203, 404 |

### Social Responsibility (14 questions, weight 29.9 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Employee Well-being | 1.3 | SDG 3 | GRI 403 |
| 2 | Diversity, Equity, & Inclusion (DEI) | 1.3 | SDG 5, 10 | GRI 405 |
| 3 | Fair Labor & Human Rights | 1.3 | SDG 8 | GRI 407, 408, 409 |
| 4 | Community Engagement | 3.0 | SDG 11 | GRI 413 |
| 5 | Health & Safety | 1.3 | SDG 3 | GRI 403 |
| 6 | Employee Training & Development | 1.3 | SDG 4 | GRI 404 |
| 7 | Data Privacy | 1.3 | SDG 16 | GRI 418 |
| 8 | Human Capital Reporting | 1.3 | SDG 8 | GRI 401, 404 |
| 9 | Social Impact | 6.0 | SDG 1, 10 | GRI 203, 413 |
| 10 | Customer Responsibility | 1.3 | SDG 12 | GRI 416, 417 |
| 11 | Informal Sector Integration | 3.0 | SDG 8, 10 | GRI 203 |
| 12 | Youth Employment & Skills | 1.3 | SDG 4, 8 | GRI 404 |
| 13 | Local Empowerment & Procurement | 3.0 | SDG 8, 9 | GRI 204 |
| 14 | Ubuntu-led Community Development | 3.0 | SDG 11, 17 | GRI 413 |

---

## Appendix B: The 40 stakeholder questions

Stakeholders answer the first-level yes or no only. Weights are within the stakeholder consensus score.

### Corporate Governance (10 questions, weight 21.8 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Ethical Conduct | 2.2 | SDG 16 | GRI 205, 206 |
| 2 | ESG Oversight | 2.2 | SDG 16 | GRI 2-12 |
| 3 | Reporting Transparency | 2.2 | SDG 16 | GRI 2 |
| 4 | Supply Chain Governance | 2.2 | SDG 12 | GRI 308, 414 |
| 5 | Stakeholder Engagement | 2.2 | SDG 17 | GRI 2-29 |
| 6 | Executive Compensation | 2.2 | SDG 16 | GRI 2-19 |
| 7 | Whistleblower Protection | 2.2 | SDG 16 | GRI 2-25, 2-26 |
| 8 | Risk Management | 2.2 | SDG 16 | GRI 2 |
| 9 | Political Engagement | 2.2 | SDG 16 | GRI 415 |
| 10 | Compliance Audits | 2.2 | SDG 16 | GRI 2-27 |

### Economic Viability (10 questions, weight 29.1 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Financial Stability | 2.2 | SDG 8 | GRI 201 |
| 2 | Local Economic Impact | 4.0 | SDG 8 | GRI 201, 202, 203 |
| 3 | R&D & Innovation | 4.0 | SDG 9 | GRI 203 |
| 4 | Supply Chain Resilience | 2.2 | SDG 9 | GRI 2 |
| 5 | Tax Transparency | 4.0 | SDG 16, 17 | GRI 207 |
| 6 | Fair Competition | 2.2 | SDG 16 | GRI 206 |
| 7 | Infrastructure Investment | 4.0 | SDG 9 | GRI 203 |
| 8 | Market Growth | 2.2 | SDG 8 | GRI 201 |
| 9 | Resource Efficiency | 2.2 | SDG 12 | GRI 301, 302, 303 |
| 10 | Long-term Strategy | 2.2 | SDG 8, 9 | GRI 2 |

### Environmental Impact (10 questions, weight 25.5 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Energy Management | 4.0 | SDG 7 | GRI 302 |
| 2 | GHG Emissions | 4.0 | SDG 13 | GRI 305 |
| 3 | Waste Reduction | 2.2 | SDG 12 | GRI 306 |
| 4 | Water Stewardship | 2.2 | SDG 6 | GRI 303 |
| 5 | Sustainable Packaging | 2.2 | SDG 12 | GRI 301, 306 |
| 6 | Logistics & Transport | 2.2 | SDG 11, 13 | GRI 305 |
| 7 | Renewable Energy | 2.2 | SDG 7 | GRI 302 |
| 8 | EMS Certification | 2.2 | SDG 12 | GRI 307 |
| 9 | Responsible Sourcing | 2.2 | N/A | N/A |
| 10 | Product Lifecycle | 2.2 | SDG 12 | GRI 301 |

### Social Responsibility (10 questions, weight 23.6 of 100)

| # | Topic | Weight | SDG | GRI |
| --- | --- | --- | --- | --- |
| 1 | Fair Labor Practices | 2.2 | SDG 8 | GRI 401, 402 |
| 2 | Health & Safety | 2.2 | SDG 3 | GRI 403 |
| 3 | Diversity & Inclusion | 2.2 | SDG 5, 10 | GRI 405 |
| 4 | Modern Slavery | 2.2 | SDG 8 | GRI 409 |
| 5 | Employee Training | 2.2 | SDG 4 | GRI 404 |
| 6 | Freedom of Association | 2.2 | SDG 8 | GRI 407 |
| 7 | Community Impact | 4.0 | SDG 11 | GRI 413 |
| 8 | Data Privacy | 2.2 | SDG 16 | GRI 418 |
| 9 | Employee Wellbeing | 2.2 | SDG 3 | GRI 403 |
| 10 | Human Rights | 2.2 | SDG 16 | GRI 412 |


---

## Document history

| Version | Date | What changed |
| --- | --- | --- |
| 1.3 | 27 October 2026 | Screenshots of the dashboard. How the roles relate. The four dashboard roles (super admin, owner, admin, member) and the test accounts. Several companies on one installation, with sharing of keys and template. Demo and Live, and the saved view. The redesigned top bar and account menu. Notifications and recent activity. The Team page with companies and the member role. The report template shown as pages, with logo placement. Email previews. Per-company sample data. Themed dropdowns |
| 1.2 | 14 October 2026 | Full-page report editor, sample submissions, guide v1.2 |

---

*Rate My Impact: Solution Guide. Prepared by Oliver Wainaina for Rejuvenate Responsibly. Version 1.3, 27 October 2026.*
