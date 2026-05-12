---
name: Research-grounded design briefs
description: Use when authoring or critiquing design briefs, problem statements, or the supporting input documents (research context, objectives & metrics, design constraints) for the Designer agentic pipeline or any similar research project where the brief feeds downstream automated work. Distinguishes a realistic PM-to-designer problem statement from a PRD, a feature list, or a writing prompt. Names the public-research sources to draw on for each major domain. Covers what to never invent and what fidelity standards to enforce.
tags:
  - design
  - research
when: auto
---

# Research-grounded design briefs

This skill captures lessons from authoring briefs for the Designer agentic pipeline. The pipeline is sensitive to brief quality — feeding it a PRD instead of a problem statement produces feature-shuffled hypotheses; feeding it real research signals produces strategically distinct hypotheses.

## The shape of a real problem statement (from PM to designer)

Synthesized across [NN/g](https://www.nngroup.com/articles/problem-statements/), [Intercom](https://www.intercom.com/blog/how-to-write-problem-statements/), [GDS Service Manual](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works), [18F discovery methods](https://guides.18f.gov/methods/), [Lenny Rachitsky's framework](https://www.lennysnewsletter.com/p/a-three-step-framework-for-solving):

**Required contents (NN/g three-part model):**
1. **Background** — which organization or context has the problem; what is the situation
2. **People affected** — the specific users and how the problem impacts them
3. **Stakes** — business or human consequence if unsolved

**Intercom variant:** (1) the outcome the customer wants (described as a need, not a feature), (2) why they want it, (3) problems with the status quo.

**Lenny's compact framework:** Situation (state of affairs everyone agrees with) → Complication (the problem) → Resolution (what the work should produce).

## What a real problem statement is NOT

- **Not a PRD or spec.** Intercom: *"It isn't a product requirements document (PRD) or a specification (spec)."* If your brief lists features, MVP scope, or implementation choices, it's a PRD.
- **Not a research dossier.** Research belongs in the Research Context node (or its equivalent). The brief frames the problem; research backs the framing.
- **Not a constraints list.** Constraints belong in the Design Constraints node.
- **Not a metrics doc.** Success criteria belong in Objectives & Metrics.
- **Not a writing prompt or homework question** (the canonical sin: feature lists like *"build a habit tracker with streaks, reminders, calendar view…"*). The brief frames a real problem in the wild; the system is what proposes the strategy.
- **Not a solution disguised as a problem.** Intercom's worked example: "Tickets" (a feature) was the customer's vocabulary; "easily track query status and prevent queries from getting lost" was the actual outcome. A problem statement should name the outcome, not the feature.

## Length and form

- NN/g: *"brief… a few sentences"* to a paragraph.
- In practice across the industry: **2–4 short paragraphs** of plain prose for non-trivial problems. The very best briefs in `experiments/briefs/` (grief-app, password-reset, code-onboarding) are 2–4 paragraphs.
- Common templates inside a paragraph: *"[User] needs [need] in order to [goal]"* or *"I am (persona) trying to (verb) but (barrier) because (cause)."* Useful for the headline; the surrounding paragraphs name the world and stakes.

## The four input nodes (in the Designer product)

The Designer product separates the brief from its supporting context. **Do not conflate them.** When authoring a brief package, write four short documents:

| Node | What it contains | Length |
|---|---|---|
| **Design Brief** | The directive. Problem statement only. Names user, moment, hostility today, stakes. Solution-open. | 2–4 paragraphs |
| **Research Context** | What user research has revealed. Real signals from real interviews, surveys, ethnography, behavior data. Audience, pain points, current tools and how they fail. (Inferred) for inferences. | 4–6 paragraphs |
| **Objectives & Metrics** | What success looks like. Outcomes and their failure modes. Avoid prescribing solutions; describe what good looks like. | 4–6 paragraphs |
| **Design Constraints** | Non-negotiable boundaries (regulatory, accessibility, platform, cognitive-load research findings). Exploration ranges where applicable. | 4–6 paragraphs |

Grief-app's four documents in this repo (`grief-app.md`, `grief-app-research.md`, `grief-app-objectives.md`, `grief-app-constraints.md`) are the canonical exemplar — read them as a template for shape.

## Realism standards (the high bar)

1. **Every empirical claim is sourced.** "20-40% reduction in working memory under stress" without a citation is hallucination. Whenever possible, cite the study or established framework (Yerkes-Dodson, Cognitive Load Theory, NN/g studies, AHRQ findings, etc.).
2. **No invented statistics.** Don't write "60% of users abandon" unless you've got a citation. If you need to evoke magnitude without a citation, use qualitative language: "many users abandon," "users frequently report."
3. **Mark inferences explicitly.** Use `(Inferred)` for claims that extend from sourced findings without direct evidence. The grief-app-research.md file uses this pattern: *"(Inferred) Any design that requires social sharing… will likely face adoption resistance."*
4. **User voice is from interviews, not invention.** Don't put quotes around made-up quotes from made-up users. Either paraphrase, cite a real quote with its source, or describe what users said in the aggregate ("users described feeling…").
5. **Domain expertise is checked.** If writing for a clinical, legal, financial, or regulated domain, surface the actual regulatory frame (HIPAA for US health data, FCRA for credit reports, FERPA for education records, WCAG 2.2 AA for accessibility, etc.). Don't invent compliance requirements.
6. **Source quality hierarchy** when grounding claims:
   1. Government agencies (AHRQ, CFPB, FTC, SAMHSA, CDC, GDS) — highest authority, free public reports
   2. Peer-reviewed research (PubMed, sociology journals, JAMA, etc.)
   3. Major non-profits with research arms (Eviction Lab, KFF, AARP, Brookings, NN/g)
   4. Industry research from credible publishers (McKinsey, Forrester, Gallup) — usually behind paywalls but findings cited elsewhere
   5. Design org case studies (Code for America, Nava, USDS, 18F, Intercom blog) — high value because they document real product work
   6. Practitioner blogs (Lenny's Newsletter, Marty Cagan, Lattice, Atlassian) — useful for framework structure, less authoritative for specific stats

## Domains where strong public research exists (and where to look)

This is a partial map of where to ground specific brief types:

| Domain | Primary sources |
|---|---|
| Government benefits & service design | [Code for America case studies](https://codeforamerica.org/explore/), [Nava insights](https://www.navapbc.com/insights), [GDS service manual](https://www.gov.uk/service-manual), [18F methods](https://guides.18f.gov/methods/) |
| Healthcare workflows & patient experience | [AHRQ](https://www.ahrq.gov/), [AHRQ PSNet](https://psnet.ahrq.gov/), [NHS Service Manual](https://service-manual.nhs.uk/) |
| Mental health crisis services | [SAMHSA 988](https://www.samhsa.gov/mental-health/988), [Crisis Text Line published research](https://www.crisistextline.org/everybody-hurts/), Psychology Today coverage of [PMC 988 evaluations](https://pmc.ncbi.nlm.nih.gov/articles/PMC11733462/) |
| Consumer finance | [CFPB consumer guidance](https://www.consumerfinance.gov/), [CFPB annual FCRA report](https://files.consumerfinance.gov/f/documents/cfpb_fcra-611-e_report_2022-01.pdf), [NCLC consumer law center](https://www.nclc.org/) |
| Housing & evictions | [Eviction Lab at Princeton](https://evictionlab.org/), [PolicyLink](https://www.policylink.org/), [Shelterforce](https://shelterforce.org/), [NLIHC](https://nlihc.org/) |
| Older adults / caregiving | [AARP research](https://www.aarp.org/pri/), [Family Caregiver Alliance](https://www.caregiver.org/), [AARP Caregiving in the US 2025](https://www.aarp.org/pri/topics/ltss/family-caregiving/caregiving-in-the-us-2025/) |
| Education / learning loss | [Brookings Brown Center](https://www.brookings.edu/topic/k-12-education/), [CCCSE](https://cccse.org/), [Hechinger Report](https://hechingerreport.org/), [NAEP results](https://www.nationsreportcard.gov/) |
| Workplace & HR | [SHRM](https://www.shrm.org/), [Gallup workplace](https://www.gallup.com/workplace/), [Lattice articles](https://lattice.com/library/), [Lenny's Newsletter](https://www.lennysnewsletter.com/) for PM craft |
| Diabetes & chronic condition self-management | [ADA Standards of Care](https://diabetesjournals.org/care/issue), [DSMES Consensus Report](https://journals.sagepub.com/doi/10.1177/0145721720930959), CDC chronic-disease pages |
| Voter / civic engagement | [TurboVote / Democracy Works](https://democracy.works/), [Pew Research Politics](https://www.pewresearch.org/politics/), [Brennan Center](https://www.brennancenter.org/) |
| Software engineering onboarding | [Stack Overflow Developer Survey](https://survey.stackoverflow.co/), [GitHub State of the Octoverse](https://octoverse.github.com/), engineering blogs (Stripe, Shopify, Linear) |
| Accessibility | [WCAG 2.2 standard](https://www.w3.org/TR/WCAG22/), [NN/g accessibility](https://www.nngroup.com/topic/accessibility/), [WebAIM screen-reader survey](https://webaim.org/projects/screenreadersurvey10/) |

## Established research frameworks safe to cite

These are well-established, widely-cited, and safe to use as constraints without needing a specific paper citation (the framework name carries the weight):

- **Yerkes-Dodson Law** (1908) — performance ⇋ arousal inverted-U curve. Cited in stress-context constraints.
- **Cognitive Load Theory** (Sweller, 1988) — intrinsic, extraneous, germane load. Cited in cognitive-burden constraints.
- **Hick's Law** — decision time scales with log of choice count. Cited when justifying choice-reduction.
- **Fitts's Law** — pointing-time function. Cited when justifying touch-target sizing.
- **NN/g 10 Usability Heuristics** (Nielsen, 1994) — cited in usability constraints.
- **WCAG 2.2 AA** — published standard for accessibility. Cite section numbers for specifics.

## Anti-patterns when authoring briefs (lessons learned)

These are mistakes I made in this project and the corrections:

1. **Conflating brief with packet.** I treated "design brief" as "the full intake document" — wrote multi-page packets with research and objectives baked in. The Designer product separates them. Each node is short. Each does one job.
2. **Defaulting to a PRD-shaped brief and trying to "fix it."** When asked to pick a demo brief, my first reflex was `habit-tracker.md`. That file is a feature list. The fix isn't to make excuses for it; the fix is to use one of the briefs that actually IS a problem statement.
3. **Inventing personas with detail.** "Sara is a senior product manager with eight meetings today…" feels real but is fabricated. Use research aggregates ("PMs report difficulty…") not invented individuals.
4. **Inventing statistics.** "60% of users abandon the flow" — if there's no citation, it's hallucinated. Use qualitative descriptors or find a real source.
5. **Writing problem statements as marketing.** A problem statement is a directive, not a sales pitch. Don't sell the problem; describe it.

## Sourcing process when authoring a new brief

1. Pick a domain.
2. Run 2–3 searches against the source hierarchy above. Aim for primary sources (government, peer-reviewed, established non-profits).
3. Note real signals: actual user research findings, actual pain points, actual regulatory or behavioral constraints.
4. Draft the problem statement using NN/g three-part structure.
5. Draft the three supporting documents (research context, objectives, constraints) using ONLY sourced material plus explicit `(Inferred)` extensions.
6. Cite sources inline in the supporting docs where they appear. The brief itself usually doesn't cite (problem statements are prose); the supporting nodes can and should.
7. Audit before shipping: every empirical claim has a citable origin or is marked `(Inferred)`.
