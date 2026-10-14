---
title: "Rate My Impact: Solution Guide"
subtitle: "How the platform works, what it does, and why it was built this way"
author: "Oliver Wainaina"
date: "14 October 2026"
---

# Rate My Impact: Solution Guide

**Prepared for:** Rejuvenate Responsibly, Nairobi, Kenya
**Prepared by:** Oliver Wainaina
**Version:** 1.2
**Date:** 14 October 2026

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
18. Going live: the launch checklist
19. Everyday tasks: how to
20. References
21. Glossary
- Appendix A: The 53 client questions
- Appendix B: The 40 stakeholder questions
- Document history

---

## 1. About this document

This guide describes the **Rate My Impact** platform that Rejuvenate Responsibly runs on its website: what each part does, how a person moves through it, what emails go out, what the team sees behind the scenes, and the decisions that shaped it.

**What it covers**

- Everything a client, a stakeholder and an administrator can do.
- The wording of every automatic email.
- How scores and reports are produced.
- Where information is stored and who can see it.
- The choices made along the way and the reasons for them.
- The things that are not yet finished, so nobody is surprised.

**Status at the time of writing.** The platform is built and working. Card payments run against Pesapal's test environment until the merchant account is approved for live use. Email delivery depends on the mail account being connected (see Section 18). Anything marked "not yet" below is a deliberate gap, listed again in Section 17.

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
| **Admin dashboard** | Analytics, every submission, report editing and sending, settings | The Rejuvenate team |

### What makes it different

- **It asks for evidence.** Every "yes" is followed by a second question asking whether the organisation can show evidence or depth. A flattering "yes" with nothing behind it scores only half.
- **It asks outsiders.** The same topics are put to people who deal with the organisation, and the gap between the two views is reported.
- **It writes itself, with a person in control.** The report is drafted automatically, then an administrator can review, edit and decide when to send it.

---

## 3. The people who use it

| Role | Who they are | What they can do | What they never see |
| --- | --- | --- | --- |
| **Client** (the submitter) | The person at an organisation who starts the assessment and pays | Answer the questions, save and resume, submit, invite stakeholders, read the report | Individual stakeholder answers |
| **Stakeholder** | Someone the client invites: a supplier, employee, customer, investor, partner | Answer the 40-question survey once, using their own private link | The client's answers or the report |
| **Administrator** | A member of the Rejuvenate team on the approved list | View every submission, edit and send reports, see delivery problems, change settings | Nothing is hidden from them; their access is controlled by the approved list |
| **Rejuvenate** | The firm | Receives website enquiries and enterprise requests | |

**Access is by private link, not by account.** Clients and stakeholders do not create accounts or passwords. They are given a reference and a private link by email. The link works like a password: anyone who has it can open that assessment.

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

**Step 1. Choosing a tier.** On the Rate My Impact page the client sees three tiers. Essential and Professional are bought online. Enterprise is quoted, so it leads to the contact form.

**Step 2. Entering details.** The client gives the organisation name, their own name and a work email. This is enough to open the assessment.

**Step 3. The reference is emailed straight away.** Before payment, the system creates the assessment and emails the client their reference and private link. This is deliberate: if anything goes wrong at the payment page, they still have a way back in.

**Step 4. Payment.** The client is sent to Pesapal to pay. When they return, a page confirms the payment (it may take a few moments to settle) and offers "Start my assessment".

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
| **Contact** | Enquiry form, goes to the firm's inbox |

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

### 9.2 How a payment works

1. The client enters their details and presses Pay.
2. The platform opens an order with **Pesapal** (the payment provider) and sends the client to Pesapal's secure page.
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

Pesapal provides a test environment (the "sandbox") that moves no real money. The platform uses it until switched to **live**, which is done when the merchant account is approved. The switch is in Settings.

### 9.5 If payment is not set up

If Pesapal credentials are missing, the Pay button says plainly that card payment is not switched on and invites the client to contact the firm for an invoice. Nothing is a dead end. The client's reference is still emailed.

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

If no mail account is connected at all, nothing is sent. The system says so on screen instead of pretending, and shows the client their link to copy by hand.

### 11.8 If an invitation does not arrive

Each stakeholder invitation is sent **once** and is not retried. The platform records whether it was delivered. If not, the administrator is alerted (Section 12.6) and can tell the client using the editable notice above. There is currently no "resend" button; the client replies with a corrected address, or passes the link on themselves.

---

## 12. The admin dashboard

The dashboard is for the Rejuvenate team only, at the address `/dashboard` on the website.

### 12.1 Signing in

- Administrators sign in with an email address and password.
- **Sign in with Google** is shown but switched off, marked "Coming soon".
- **Signing in is not enough.** An account must also be on the approved administrators list. A person who has an account but is not on the list is turned back with a clear message. If anything about the check is unclear, the answer is no.
- Adding an administrator is done by adding their account to that list in the database.

### 12.2 Navigation

The dashboard has its own top bar, separate from the public site:

- **Back to website** at the far left, before the logo. On the report editor this button changes to **Back** and returns to the organisation being edited.
- The logo and "Dashboard" label.
- **Analytics**, **Responses**, **Settings**.
- The administrator's name and **Sign out**.

**Admin banner on the public site.** If an administrator is signed in and visits the public website, a small banner at the bottom says they are signed in as an administrator and offers "Open dashboard". It can be dismissed for the session, and does not appear on the dashboard or sign-in pages.

### 12.3 Analytics

Totals across every organisation:

- Organisations, submitted, paid (real payments only), stakeholders invited, responses received, reports written.
- A banner if any stakeholder invitations did not arrive, listing the organisations affected and whether the client has been told.
- Charts: average score for each pillar, how many organisations are in each tier, assessments started and submitted by month, and the topics most often answered "no".

### 12.4 Responses

A list of every organisation showing sector, when it started, status, payment, score and tier, stakeholders answered out of invited, and report state. Organisations with undelivered invitations are flagged in red.

### 12.5 The organisation page

Opening an organisation shows:

- Contact details, status, payment and report badges.
- Overall, coverage, depth, and stakeholder progress.
- **Undelivered invitations** (if any) with the **Inform the submitter** button.
- **Parties involved**: each stakeholder with name, email, relationship, when invited, whether the email was delivered, whether they answered, and their score.
- **Pillar scores** and a chart comparing the client's view with the stakeholders'.
- **Where the weight sits**: the heaviest gaps.
- **The report**: the text, who and what wrote it, when edited and when sent, with **Edit report** and **Send report** (or **Write report now** if there is none).

### 12.6 Delivery problems

When a stakeholder invitation fails to arrive (a typo in the address, a rejected mailbox, or no mail account connected at the time), the administrator is told in three places: the Analytics page, the Responses list and the organisation page.

Pressing **Inform the submitter** opens the message in an editor, prefilled with the failed addresses and their survey links. The administrator can change the subject and the body. It is sent exactly as written, only to the submitter's own address on the assessment, and the invitations are then marked as "submitter told" with the date. They stay flagged until the person actually answers.

### 12.7 Editing a report

The editor opens as a **full page**. The dashboard's top bar stays in place, with **Back** at the far left returning to the organisation, and the document fills everything beneath it, edge to edge and to the bottom of the screen, resizing with the window. Nothing frames it: there is no heading, no footer and no status bar under the page.

The **Save report** button and a "Saved at" note sit in the top bar, next to the name of the organisation being edited, so they are always in reach.

The original generated text is always preserved underneath. Saving replaces what the reader sees, marks the report as issued, and records who edited it and when.

### 12.8 Sample submissions

Settings includes a **Sample submissions** switch that loads 16 invented organisations so the dashboard, report flow and edge cases can be tried without real clients. Each carries a **Sample** status badge, shown beside its name in the Responses list, on its organisation page and in the delivery alert, so it can never be mistaken for a real client. The organisation names themselves are plain, with no prefix. They cover:

- every payment state (unpaid, pending, failed, waived, paid);
- all four tiers, including a perfect score and a zero score;
- every stage of stakeholder response, from none to all five;
- every report state (none, draft, issued, sent), including a report sent with answers outstanding;
- delivery failures, with and without the submitter told;
- awkward inputs: blank fields, an organisation name containing symbols and accents, a very long name, a perfectly split vote;
- the unpaid submission that the free preview allows.

**The switch.** Turning it **on** loads the samples. Turning it **off** asks for confirmation and then removes every sample submission, along with their invitations, responses and reports. Real submissions are never touched, because only records flagged as samples are removed. A **Reset the samples** button puts them back to their original state after experimenting.

**Why some names look odd.** One sample, RMI-SMP013, is deliberately given an organisation name full of symbols and accents (an ampersand, angle brackets, quotation marks) and blank contact fields. It exists to prove that unusual names display and print correctly, so its report title looks strange on purpose. Another is deliberately very long. Anything carrying the Sample badge disappears when the switch is turned off.

**Safety.** All sample email addresses are on example.org, which cannot receive mail, and no email is sent when they are loaded. Sample submissions appear in Analytics, the Responses list and the delivery alert like any other, so switch them off before judging real figures.

---

## 13. Settings, secrets and test controls

Settings (in the dashboard) gathers everything that previously needed a developer to change.

### 13.1 What can be set

| Group | Setting | Notes |
| --- | --- | --- |
| **Storage** | Shows which store is active and whether the database is ready | Also offers a one-off import (Section 14) |
| **Testing** | **Require payment before an assessment** (on or off) | Turn off for testing. Assessments opened while off are marked "waived" and never counted as paid. Switch back on before launch |
| **Payments (Pesapal)** | Consumer key, consumer secret, environment (sandbox or live), optional IPN id | Keys are write-only |
| **Report writing (OpenRouter)** | API key, drafting model, humaniser model | Models are chosen from a dropdown with prices, or typed |
| **Samples** | A switch that loads or removes the sample submissions | Off removes every sample, and only samples |

### 13.2 Choosing models

Each model dropdown lists a curated set of models with their price per million tokens (a token is roughly three-quarters of a word). Prices are taken live from OpenRouter and refreshed hourly; if they cannot be reached, built-in figures are used and the page says so. A model can also be typed in by name.

Beneath the dropdowns a box shows the **average cost per report** for the chosen pair, the cost per 1,000 reports, the earlier setup for comparison, and the assumptions behind the estimate.

### 13.3 Where a value can come from

For each setting, the platform looks in this order and uses the first it finds:

1. A value **saved in the dashboard**.
2. A value in the **server's environment settings** (set by whoever manages the server).
3. A **built-in default**.

So a dashboard value always wins, and removing it hands control back to the server's settings. Either route is fine.

### 13.4 How secrets are protected

- A secret saved in the dashboard is **encrypted** before it is stored.
- It can **never be shown again**. The page shows only where it comes from and the last four characters.
- Encryption uses a **master key** that lives only on the server, never in the database. A copy of the database alone cannot reveal the secrets.
- Without the master key, the dashboard refuses to save secrets (the server's own settings keep working).
- If the master key is lost or changed, saved secrets become unreadable and must be entered again. Nothing else is affected.

### 13.5 The test switch, in practice

1. Settings, Testing: switch **Require payment** off.
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
| Administrators | The approved list |
| Assessments | Organisation, contact, answers, score, payment details, dates |
| Invitations | Each stakeholder, their private link, whether it was delivered, whether they answered, whether the submitter was told |
| Stakeholder responses | Each outside answer set and score |
| Reports | The current text, the original generated text, the models used, who edited and sent it, when |
| Settings | One record; secrets inside are already encrypted |

## 15. Security and privacy

| Area | How it is handled |
| --- | --- |
| **Private links** | Long, unguessable and tied to one assessment or one stakeholder. They work like passwords, and the emails say so |
| **References** | Typing a reference alone opens nothing; the private link is required. The Resume page does not reveal whether a reference exists |
| **Administrators** | Must be on the approved list. Checked on every page and every action. Unclear means no |
| **Secrets** | Encrypted before storage, write-only, never shown or sent back to the browser |
| **Payment status** | Never taken from the return trip; always confirmed directly with Pesapal |
| **Server key** | The privileged database key is server-only and is never exposed to the browser |
| **Spam** | The contact form has a hidden field that catches automated submissions |
| **Sample data** | Flagged and removable, with addresses that cannot receive mail |
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
| 12 | **Move from premium to low-cost models** | Reports cost under one US cent instead of about four, with the same structure and checks |
| 13 | **Models chosen from a dropdown with live prices** | Prices change often; people should see the cost before they choose |
| 14 | **Secrets can be saved in the dashboard, encrypted, with the server settings as a fallback** | Rotate a key without a developer or a redeploy; keep the master key out of the database |
| 15 | **A test switch that records "waived" rather than "paid"** | Testing must never inflate revenue figures or confuse the books |
| 16 | **Sample data is flagged and removable** | Lets the team learn the dashboard on a live database without risk to real records |
| 17 | **Storage on Supabase** | Data must survive restarts and moves between hosts, and the dashboard already uses Supabase for sign-in |
| 18 | **Database changes are additive only** | The firm's data must never be altered by an update. Safe to repeat, safe on a populated database |
| 19 | **Importing the old file only adds** | Cannot overwrite live records, and the original file is kept as a backup |
| 20 | **Delivery results are recorded for every invitation** | Previously a failed email vanished silently and the client waited for a report that could never come |
| 21 | **Admin tells the submitter, with editable wording** | A human decision with a human tone; the draft saves time but the administrator has the last word |
| 22 | **Google sign-in disabled and labelled "Coming soon"** | Not configured yet; showing it working would mislead |
| 23 | **Admin access needs a list entry, not just an account** | A stray sign-in must never expose every client's answers |
| 24 | **Dashboard has its own navigation and a "Back to website" link** | The public header on top of the dashboard was confusing; administrators move between the two often |
| 25 | **Admin banner on the public site** | Reminds an administrator they are signed in, and gives one click back |
| 26 | **Public pages stay fast and static** | The banner asks the server on demand rather than making every page personal |
| 27 | **Email through Mailtrap, with a test inbox mode** | Nothing reaches a real person until the team decides |
| 28 | **No automatic retry or resend of stakeholder invitations** | Kept simple at launch; replaced by visibility plus a notice to the client (see Section 17) |
| 31 | **Sample data is a single on and off switch, and every sample carries a Sample status badge** | Mock records must be unmistakable and removable in one move before real clients arrive, without any risk to real data. A status keeps names clean in reports and lists; a prefix put "[Sample]" in report titles |
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
| 8 | **Google sign-in** | Shown, disabled, "Coming soon" | Configure in Supabase and Google, then enable |
| 9 | **Live payments** | Running against Pesapal's test environment | Switch to live when the merchant account is approved |
| 10 | **Report is not an audit** | Stated on every report; clients may ask for assurance | Offer the validation call or the enterprise diagnostic |
| 11 | **Single administrator role** | Everyone on the list can change settings, including payment credentials | Keep the list short; consider separate roles later |
| 12 | **Placeholder images** | Several website images are generated placeholders | Replace with real photography at the same filenames |

---

## 18. Going live: the launch checklist

### Accounts you need

| Account | What for |
| --- | --- |
| **Pesapal** | Taking payments (merchant approval required for live) |
| **OpenRouter** | The AI models that write reports (a paid balance) |
| **Mailtrap** | Sending email (verify the sending domain for live) |
| **Hosting** | Vercel and a VPS

---

## 19. Everyday tasks: how to

**See what is going on.** Open the dashboard, then Analytics. A red banner means an invitation did not arrive.

**A client says they never got their link.** Ask them to use the Resume page with their reference. If they have lost the reference, find the organisation in Responses; their contact email is on the page.

**A stakeholder never answered.** Open the organisation. If the report does not exist, press **Write report now**, review it, then press **Send report** and tick the acknowledgement. The email will say how many answers are missing.

**An invitation did not arrive.** Open the organisation, press **Inform the submitter**, adjust the wording if you like, and send. When the client replies with a corrected address, the invitation currently needs to be re-sent through the client (they can use "Add more people" on their results page).

**Edit a report before it goes out.** Open the organisation, **Edit report**. The editor opens as a full page; make changes, **Save report**, then press **Back** to return to the organisation. The original is kept.

**Test without taking payment.** Settings, Testing, switch off **Require payment**. Remember to switch it back on.

**Change which models write reports.** Settings, Report writing. Pick from the dropdowns and watch the cost box. Save.

**Rotate a key** (Pesapal or OpenRouter). Settings, paste the new value into the field, Save. Tick "Remove the saved value" instead to hand control back to the server's settings.

**Try the dashboard with data.** Settings, Sample submissions, switch on. When done, switch it off and confirm; every sample submission is removed and real records are left alone.

**Get rid of the mock data before launch.** Settings, Sample submissions, switch off. Then check Analytics: the totals should show only real organisations.

**The dashboard shows nothing.** Open Settings and read the Storage card. It says which store is active, whether the database is ready, and how many records it holds. An empty database shows zeros; load the samples or import earlier data.

---

## 20. References

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

## 21. Glossary

| Term | Meaning |
| --- | --- |
| **Administrator** | A member of the Rejuvenate team on the approved list, with access to the dashboard |
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

*Rate My Impact: Solution Guide. Prepared by Oliver Wainaina for Rejuvenate Responsibly. Version 1.2, 14 October 2026.*
