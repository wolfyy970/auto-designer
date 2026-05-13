---
name: Design brief
description: Use when authoring or critiquing a design brief — the problem statement that frames a design effort. Covers (1) how to write — the SCUC canonical structure (Situation → Complication → Users → Cost), templates, what to never put in the brief body, sources to draw on. (2) How to evaluate — a 12-criterion rubric run on every brief before it ships. Forcing function: author + evaluate is one workflow, not two; no silent author-and-ship.
tags:
  - design
  - research
  - brief-authoring
  - evaluation
when: auto
---

# Design brief

This skill is the source of truth for what a brief is, what a brief is not, and how to know whether the one you just wrote is any good. It exists because brief quality is the most consequential input to direction choice: a PRD goes in, feature-shuffled hypotheses come out; a real problem statement goes in, strategically distinct hypotheses come out. The fastest way to ship hollow hypotheses is to give downstream readers a brief that's secretly a research dossier with a solution voiceover.

## The document family

A design brief is typically accompanied by three supporting documents. Each does one job, and content leaking between them produces a mixed signal downstream readers reason against badly.

| Document | What it carries | Job |
|---|---|---|
| **Design Brief** | The directive. Problem statement only — situation, complication, target user(s), cost. Solution-open. | Frame the problem. |
| Research Context | What user research has revealed. Real signals from real interviews, surveys, ethnography. Citations live here. | Back the framing with evidence. |
| Design Evaluation Criteria | Design properties any viable solution must exhibit; failure-modes-of-overpursuit. | Define what good looks like at the design level. |
| Design Constraints | Non-negotiable boundaries that filter strategic viability. | Hold the bet inside reality. |

The brief stays tight *because the other three documents carry the load.* Every time content gets crammed into the brief that belongs in a companion document, the brief becomes worse and downstream work reasons against a mixed signal. The sibling skills `design-research`, `design-constraints`, and `design-evaluation` are calibrated to keep their documents honest. This skill is the one for the brief.

---

# Part 1: How to write

## 1.1 The shape spectrum

In practice, briefs come in four shapes. The skill names all four so an author can recognize what they're writing — and so a reviewer can read what shape they got and adapt to it.

| Shape | What it looks like | How the system handles it |
|---|---|---|
| **Problem statement** *(canonical; what this skill teaches you to write)* | SCUC four-component framing: situation, complication, users (target), cost; solution-open. | Wide exploration; the hypotheses span the solution space. |
| **Directive pitch** *(Shape Up shape)* | The user has done the discovery and wants the design exploration to honor a specific product/feature shape. *"Design a habit tracker with streaks, reminders, and a calendar view."* | The system honors 1–2 hypotheses on the prescribed direction and uses the remaining slots to explore alternatives the user did not propose. The directive is real; the value of the exploration is still in the territory beyond it. |
| **Sparse one-liner** | A sentence or two. *"Design a tax-prep tool."* | The system pushes hard into divergent product shapes; lower grounding produces wider exploration. |
| **Research dossier** *(failure mode)* | The brief body contains citations, statistics, audience demographics, regulatory frames, success metrics, and a list of candidate solutions. | The system reads the dossier as grounding and explores anyway, but the over-stuffed brief narrows the model's framing. The fix is content-architectural: move the embedded material to the appropriate companion node and rewrite the brief tight. |

**Recommendation: aim for problem-statement shape.** The other three are tolerated but suboptimal. When evaluating a brief written by a human user, the agent's job is to read what shape it is and adapt — not to demand the user rewrite.

## 1.2 The target shape (problem statement)

What "best" looks like — synthesized from the strongest practitioner sources, not averaged across them:

- **Four-component framing (SCUC).** The canonical structure: **Situation → Complication → Users → Cost.** Each component carries a distinct load:
  - **Situation** — the world the target user is in. Stable backdrop; context; status quo before the design has to act.
  - **Complication** — the specific failure inside that world. What's wrong, what's missing, what's drifting. Named without asserting *why* (cause is the designer's reasoning territory; see Criterion 7).
  - **Users** — the design's *target user(s)*, named at useful specificity (a person, not a persona; the brief sketches them as real). When the brief involves a multi-actor system, name the target user(s) and distinguish them from other stakeholders the design accommodates but is not optimizing for. If the target is a dyad (parent + child, outgoing + oncoming nurse, caller + counselor), name both and the relationship between them at the moment of design. *People involved* is a superset; **Users** is the subset the design is *for*.
  - **Cost** — what the unsolved problem takes from the target user. The consequence in their life. Why anyone should care.
  - Related: NN/g's three-component framing (Background → People → Stakes) collapses Situation + Complication into "Background" and uses "People" for what SCUC names "Users." Acceptable for shorter briefs, but the compression makes causal-pre-determination drift easier — when Situation and Complication go in one paragraph, the writer reaches for *why* to bind them, and "why" tips into asserted cause. SCUC keeps the slots cleanly separated and names the design's target explicitly.
- **5 Ws readability check** (NN/g). Who (target user), What (the complication), Where (the situation), When (the moment in time/journey), Why (the cost). SCUC covers the 5 Ws implicitly; if a reader can't extract all five from a brief written under SCUC, one of the four components is underspecified.
- **The outcome is named, not the feature** (Intercom). The brief states what the user is trying to *accomplish* or *avoid*, not what is going to be built. Intercom's example: "easily track query status and prevent queries from getting lost" (outcome), not "Tickets" (feature).
- **Length: target 150–200 words, max 250.** NN/g argues shorter ("a few sentences to a paragraph"); briefs run better with the slightly fuller form because downstream readers need lived-experience grounding to reason from. A canonical fuller exemplar runs to ~280 words / three paragraphs; below 250 is the working target for most briefs.
- **Voice.** Narrative, present tense. Concrete imagery — named medications, named documents, named conditions, the user doing the thing right now. The user is a person, not a persona.

## 1.3 Templates that work

Pick one. Don't stack.

- **Narrative three-paragraph** *(situation paragraph, user-state paragraph, one-line scope)*: often the most flexible shape; carries the most lived-experience grounding.
- **User-need template** (NN/g — Sarah Gibbons): `[User] needs [need] in order to [goal]` as the headline, with one paragraph of surrounding context.
- **SCUC four-paragraph** *(this skill's canonical)*: one short paragraph each for Situation, Complication, Users (target user(s) named at specificity), and Cost. Use **bold inline headers** in the brief body — `**Situation.** …`, `**Complication.** …`, `**Users.**  …`, `**Cost.** …`, one per paragraph — so any downstream reader (human or agent) can extract each slot at a glance. Most explicit form of the structure; useful when authors want to verify each component is present and slot-by-slot well-formed.
- **How Might We question** (Stanford d.school): `How might we [verb] [outcome] for [user] [context]?` — useful when the team wants the brief to be inherently generative.

Each template can be a clean problem statement. Mixing templates produces a packet.

## 1.4 What the brief is NOT

Negative-list, with the source that called each one out:

- **Not a PRD or feature list** (Intercom). If you list features, MVP scope, or implementation choices, you're writing a spec.
- **Not a research dossier** (NN/g + system architecture). Research lives in the `-research.md` companion. The brief frames; research backs.
- **Not a metrics doc** (system architecture). Success criteria live in `-objectives.md`.
- **Not a constraints list** (system architecture). Regulatory frames, accessibility, surface declarations, cognitive-load research findings live in `-constraints.md`.
- **Not a solution disguised as a problem** (Intercom). "Tickets" was the customer's vocabulary; "easily track query status" was the actual outcome. A problem statement names the outcome, not the feature.
- **Not a writing prompt or homework question.** Lists of candidate solution shapes ("it could be SMS, voice, tablet, or something else") belong in a sketch, not a brief.
- **Not marketing.** Describe the problem; don't sell it.
- **Not causally pre-determined** (NN/g). The brief describes the situation; it does not assert *why* the situation is what it is unless the cause is genuinely the problem to be solved. "The directory hides exactly the information that would let a patient route themselves usefully" is a hypothesis, not an observation. Name the experience; let the designer reason about causes.

## 1.5 Sources to draw on

Two separate canons. Use both.

**Brief-and-problem-framing canon** (how to write the brief itself):

| Source | What it gives you |
|---|---|
| **[NN/g — Anna Kaley, "How to Write a Problem Statement"](https://www.nngroup.com/articles/problem-statements/)** | The three-component canonical (background / people / impact) + 5 Ws. This skill extends NN/g to four components (SCUC) by separating Situation from Complication and naming the design's target explicitly as Users (not all People affected). The UX-research lens. |
| **[NN/g — Sarah Gibbons, "User Need Statements"](https://www.nngroup.com/articles/user-need-statements/)** | Companion: `[User] needs [need] in order to [goal]` template. |
| **[Intercom — "How to write problem statements"](https://www.intercom.com/blog/how-to-write-problem-statements/)** | Sharpest product-practitioner take. The "Tickets vs easily track query status" example. Best at separating problem from feature. |
| **[GDS Service Manual — Discovery phase](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works)** | UK government. Rigorous public-service framing; pairs problem statement with user research methods. |
| **[18F Methods Guide](https://guides.18f.gov/methods/)** | US government. Practical, tactical, government-scale problem framing. |
| **[Stanford d.school — Design Thinking Bootleg](https://dschool.stanford.edu/resources/design-thinking-bootleg)** | "How Might We" reframing pattern; turn a problem into a generative question. |
| **[Lenny Rachitsky — "A Three-Step Framework for Solving Problems"](https://www.lennysnewsletter.com/p/a-three-step-framework-for-solving)** | Situation / Complication / Resolution (from Barbara Minto's Pyramid Principle). Note: "Resolution" sits in solution-prescription territory; this skill replaces SCR's third component with **Cost** (consequence to the target user) to keep briefs solution-open. PM-craft framing. |
| **[Teresa Torres — *Continuous Discovery Habits* (Opportunity-Solution Tree)](https://www.producttalk.org/opportunity-solution-tree/)** | "Opportunities" as a vocabulary for problems; structures problem framing into a tree. |
| **Marty Cagan / SVPG — *Inspired*, *Empowered*** | Product-management lens; discover-vs-deliver; problem before solution. |
| **Ryan Singer — *Shape Up* (Basecamp)** | The "pitch" format. Note: a pitch is deliberately more prescriptive than a problem statement — useful counterpoint when the brief is allowed to be directive. |

The two to start with: **NN/g + Intercom**. The two to add for breadth: **GDS + Teresa Torres**. Read Shape Up to understand the *directive-pitch* shape on the brief spectrum.

**Domain-grounding canon** (how to ground the supporting `-research.md` / `-objectives.md` / `-constraints.md` documents in real public research):

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

**Established research frameworks safe to cite** (the framework name carries the weight):

- **Yerkes-Dodson Law** (1908) — performance ⇋ arousal inverted-U curve.
- **Cognitive Load Theory** (Sweller, 1988) — intrinsic, extraneous, germane load.
- **Hick's Law** — decision time scales with log of choice count.
- **Fitts's Law** — pointing-time function.
- **NN/g 10 Usability Heuristics** (Nielsen, 1994).
- **WCAG 2.2 AA** — published standard for accessibility.

**Source-quality hierarchy** when grounding claims (top wins):

1. Government agencies (AHRQ, CFPB, FTC, SAMHSA, CDC, GDS) — highest authority, free public reports.
2. Peer-reviewed research (PubMed, JAMA, sociology journals).
3. Major non-profits with research arms (Eviction Lab, KFF, AARP, Brookings, NN/g).
4. Industry research from credible publishers (McKinsey, Forrester, Gallup) — usually behind paywalls, findings cited elsewhere.
5. Design org case studies (Code for America, Nava, USDS, 18F, Intercom blog) — high value because they document real product work.
6. Practitioner blogs (Lenny, Marty Cagan, Lattice, Atlassian) — useful for framework structure, less authoritative for specific stats.

## 1.6 Realism standards

These are non-negotiable for any sourced material (which lives in the companion docs, not the brief):

1. **Every empirical claim is sourced.** *"20-40% reduction in working memory under stress"* without a citation is hallucination. Whenever possible, cite the study or established framework.
2. **No invented statistics.** Don't write *"60% of users abandon"* unless you have a citation. If you need magnitude without a citation, use qualitative language: *"many users abandon," "users frequently report."*
3. **Mark inferences explicitly.** Use `(Inferred)` for claims that extend from sourced findings without direct evidence. Pattern: *"(Inferred) Any design that requires social sharing… will likely face adoption resistance."*
4. **User voice is from interviews, not invention.** Don't put quotes around made-up quotes from made-up users. Either paraphrase, cite a real quote with its source, or describe what users said in the aggregate (*"users described feeling…"*).
5. **Domain expertise is checked.** If writing for a clinical, legal, financial, or regulated domain, surface the actual regulatory frame (HIPAA, FCRA, FERPA, WCAG 2.2 AA, FDCPA, etc.). Don't invent compliance requirements.
6. **Source-quality hierarchy applied** (above) when grounding any specific claim.

---

# Part 2: How to evaluate

**You don't ship a brief without scoring it.** Every brief goes through the rubric before it's used downstream. This is the forcing function; it is the entire point of Part 2 existing as its own section.

## 2.1 The author + evaluate workflow

1. **Draft** the brief using the templates and standards in Part 1.
2. **Evaluate** it against the 12-criterion rubric below, *inline in your output*. Score each criterion Pass / Partial / Fail. Name the specific weakness for any Partial or Fail.
3. **Decide.** If the rubric shows ≥ 10 Pass with no Fail, the brief is ready. Otherwise, rewrite and re-score before using.
4. **Surface the score to the human.** Don't bury the rubric output. Make it visible alongside the brief so the reviewer can sanity-check.

A well-calibrated brief scores 12/12 on the rubric below. If a corpus of exemplars is available, read those for voice and grain before authoring.

## 2.2 The 12-criterion rubric

| # | Criterion | What Pass looks like | What Fail looks like |
|---|---|---|---|
| 1 | **Situation present** | A reader can answer "where in the world does the target user live with this problem?" from the brief's opening. The world / context / status quo is sketched concretely. | The brief opens with a user description or feature ask but never names the situation/context. |
| 2 | **Complication named** | The specific failure inside the world is named — what's wrong, what's missing, what's drifting. Distinct from Situation: Situation is the stable backdrop, Complication is the specific failure the brief asks design to address. | The brief describes the world but doesn't name the specific failure; OR merges Situation + Complication so a reader can't tell what changed or what's broken. |
| 3 | **Target user(s) named at useful specificity** | The design's target user(s) are identified specifically (a remote new hire, a tenant facing eviction, an executor settling an estate) and distinguished from other stakeholders the design will accommodate but is not optimizing for. When the target is a dyad (parent + child; outgoing + oncoming nurse; caller + counselor), both are named with the relationship between them at the moment of design. | "Users" or "people" with no target identification; OR a multi-actor brief that names *who is affected* without naming *who the design is for*; OR a dyad brief that names one side of the pair only. |
| 4 | **Cost named** | The cost the unsolved problem imposes on the target user — what's lost, what's drifting, what's at risk — is named concretely in the user's life (rent due today; the slow drift away from a tool that doesn't meet them; confiscation at customs). | The brief describes a situation with no named cost — the reader can't tell why this matters in the user's life. |
| 5 | **Brief outcome stated** | The user-side outcome the work has to deliver is named (e.g., "feeling onboard by Friday," "appointment booked"). | The brief names a feature ("a tracker," "a directory") instead of an outcome. |
| 6 | **Solution-free** | No feature prescription, no list of candidate solution shapes *for the design* ("it could be SMS, voice…"). A list of options the user *currently confronts in the landscape* (services, tools, or institutions they're already choosing among) is description of reality and passes. Exception: a deliberate **directive pitch** is allowed — but it must be labeled as such. | Embedded feature lists, candidate-solution voiceovers *for the design*, or implementation choices. |
| 7 | **Causal pre-determination avoided** | The brief describes the situation; it does not assert *why* the situation is what it is. | Sentences that assert cause or institutional intent: "the directory hides exactly the information that would let a patient route themselves," "the application is the structural barrier," "the system was built for [adversary]." Tells include *is the barrier / is the cause / is what makes / is designed to / is built for / carries every cost of*. |
| 8 | **Concrete, not vague** | Specific imagery, named documents, named conditions, lived-experience details. | "Users want better X" / "the experience is frustrating" / "the process is complex." |
| 9 | **Length appropriate; no landscape inventory in the brief body** | 150–250 words. The longer end is fine if the content earns it (a canonical fuller exemplar can run to ~280). The brief describes the landscape categorically (e.g., "the journaling apps that bolt on a mood tag") without enumerating specific products. | > 350 words, or duplicating content from a companion node. *Also*: a vendor / tool / service inventory enumerating ≥3 specific named products (e.g., "Concur, Ramp, Brex, Emburse") consuming a paragraph of brief body — landscape inventories at that scale belong in `-research.md`. |
| 10 | **No research citations or unsourced sourced-claims in body** | No source names, study titles, agency citations, named reports. *Also catches* unsourced claims that read as research findings — sentences that assert a number or a research-shaped fact without naming a source. | "AHRQ notes that 14% of hospital patients…" inside the brief. *Also*: "a meaningful share of 30-day readmissions are preventable" — sourced-shaped finding asserted without citation. Either cite it in `-research.md` and remove from the brief, or describe the situation qualitatively without the research shape. |
| 11 | **No success metrics in body** | No conversion targets, KPIs, OKRs, or rate goals. Those live in `-objectives.md`. | "We want a 25% improvement in retention" inside the brief. |
| 12 | **No constraints in body** | No regulatory citations, accessibility floors, surface declarations, or cognitive-load research findings. Those live in `-constraints.md`. | "WCAG 2.2 AA must be met" or "Target surfaces: mobile-web" inside the brief. |

**Threshold:**

- **≥ 10 Pass, 0 Fail** → brief is ready.
- **Any Fail** → rewrite, regardless of how many Pass.
- **< 10 Pass** → rewrite.

**Partial counts as half a Pass for the threshold count, and is flagged for revision.**

## 2.3 Example evaluation

How the inline output looks (worked example, brief about traveling internationally with a regular prescription):

```
Brief: pre-travel-prescription.md (196 words)

 1. Situation present                   Pass — "preparing for a long international trip with regular prescription medication"
 2. Complication named                  Pass — customs uncertainty + country variance + no single source of truth on what's allowed
 3. Target user(s) named                Pass — traveller on regular prescription medication; pharmacist/prescriber are stakeholders, not the target
 4. Cost named                          Pass — "confiscation at customs to denial of entry to arrest" + supply exhaustion mid-trip
 5. Brief outcome stated                Pass — across the world with medication intact, legal,
                                               packaged how customs expects
 6. Solution-free                       Pass — no feature prescription
 7. Causal pre-determination avoided    Pass — describes the situation, does not assert cause
 8. Concrete, not vague                 Pass — named meds (SSRI, ADHD stimulant, blood thinner…),
                                               named sources (State Department, Reddit threads)
 9. Length appropriate                  Pass — 196 words
10. No research citations in body       Pass
11. No success metrics in body          Pass
12. No constraints in body              Pass

Score: 12/12 Pass. Ready.
```

If a Partial or Fail shows up, the line names the specific issue and the rewrite happens before the brief gets used.

---

## Anti-patterns (lessons learned)

These are mistakes that emerge in practice. Each line is a warning.

1. **Conflating brief with packet.** Multi-page briefs with research and objectives baked in. The document family separates them: brief, research, evaluation criteria, constraints. Each is short. Each does one job.
2. **Defaulting to a PRD-shaped brief and trying to "fix it."** The reflex to pick a feature-list as a "brief" (a habit tracker with streaks and reminders; a "tax-prep tool") happens often. The fix is to write a brief that is actually a problem statement, not to dress up a PRD.
3. **Inventing personas with detail.** "Sara is a senior PM with eight meetings today…" feels real but is fabricated. Use research aggregates (*"PMs report difficulty…"*) not invented individuals.
4. **Inventing statistics.** "60% of users abandon" — if there's no citation, it's hallucinated. Use qualitative descriptors or find a real source.
5. **Writing problem statements as marketing.** A brief is a directive, not a sales pitch. Describe the problem; don't sell it.
6. **Writing the skill, then violating it.** Authoring drift happens even with the discipline known. The fix is the rubric in Part 2. Don't author without scoring.

---

## Sourcing process (when authoring a new brief from scratch)

1. Pick a domain.
2. Run 2–3 searches against the source-quality hierarchy (Part 1.5). Aim for primary sources (government, peer-reviewed, established non-profits).
3. Note real signals: actual user-research findings, actual pain points, actual regulatory or behavioral constraints.
4. Draft the brief using one of the four templates in Part 1.3. Keep it short. Move sourced material to the appropriate companion node — *not* into the brief.
5. Draft the three companion documents (`-research.md`, `-objectives.md`, `-constraints.md`) using only sourced material plus explicit `(Inferred)` extensions.
6. Cite sources inline in the supporting docs. The brief itself does not cite.
7. **Score the brief against the 12-criterion rubric in Part 2.2.** Rewrite and re-score until ≥ 10 Pass with no Fail.
8. Surface the rubric score to the human alongside the brief.
