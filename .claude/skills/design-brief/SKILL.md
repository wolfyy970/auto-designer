---
name: Design brief
description: Use when authoring or critiquing design briefs and problem statements that feed the Designer pipeline (or any agentic design pipeline that takes a brief + supporting research/objectives/constraints as input). Covers (1) how to write — the target shape, templates, the four-shape spectrum the brief node receives in practice, what to never put in the brief body, sources to draw on. (2) How to evaluate — a 12-criterion rubric the agent runs on every brief before it ships. Forcing function: author + evaluate is one workflow, not two; no silent author-and-ship.
tags:
  - design
  - research
  - brief-authoring
  - evaluation
when: auto
---

# Design brief

This skill is the single source of truth for what a brief is, what a brief is not, and how to know whether the one you just wrote is any good. It exists because the Designer pipeline is sensitive to brief quality: a PRD goes in, feature-shuffled hypotheses come out; a real problem statement goes in, strategically distinct hypotheses come out. The fastest way to ship hollow hypotheses is to give the pipeline a brief that's secretly a research dossier with a solution voiceover.

## The architectural ground rule

The Designer product separates the brief from its supporting context across four input nodes:

| Node | What it carries | Job |
|---|---|---|
| **Design Brief** | The directive. Problem statement only — user, situation, stakes. Solution-open. | Frame the problem. |
| **Research Context** | What user research has revealed. Real signals from real interviews, surveys, ethnography. Citations live here. | Back the framing with evidence. |
| **Objectives & Metrics** | What success looks like. Outcomes and their failure modes. | Tell downstream stages what good means. |
| **Design Constraints** | Non-negotiable boundaries — regulatory, accessibility, surface declarations, cognitive-load research findings. | Hold the bet inside reality. |

The brief stays tight *because the other three nodes carry the load.* Every time content gets crammed into the brief that belongs in a companion node, the brief becomes worse and the system runs worse. Node separation is the rule everything else hangs off.

The canonical exemplar in this repo: `experiments/briefs/grief-app.md` (the brief) plus `grief-app-research.md`, `grief-app-objectives.md`, `grief-app-constraints.md` (the supporting set). Read all four when calibrating.

---

# Part 1: How to write

## 1.1 The shape spectrum

In practice, the brief node receives four kinds of input. The system works best with the first; the skill names all four so the brief is recognized and handled correctly.

| Shape | What it looks like | How the system handles it |
|---|---|---|
| **Problem statement** *(canonical; what this skill teaches you to write)* | NN/g three-component framing; user, situation, stakes; solution-open. | Wide exploration; the hypotheses span the solution space. |
| **Directive pitch** *(Shape Up shape)* | The user has done the discovery and wants the design exploration to honor a specific product/feature shape. *"Design a habit tracker with streaks, reminders, and a calendar view."* | The system honors 1–2 hypotheses on the prescribed direction and uses the remaining slots to explore alternatives the user did not propose. The directive is real; the value of the exploration is still in the territory beyond it. |
| **Sparse one-liner** | A sentence or two. *"Design a tax-prep tool."* | The system pushes hard into divergent product shapes; lower grounding produces wider exploration. |
| **Research dossier** *(failure mode)* | The brief body contains citations, statistics, audience demographics, regulatory frames, success metrics, and a list of candidate solutions. | The system reads the dossier as grounding and explores anyway, but the over-stuffed brief narrows the model's framing. The fix is content-architectural: move the embedded material to the appropriate companion node and rewrite the brief tight. |

**Recommendation: aim for problem-statement shape.** The other three are tolerated but suboptimal. When evaluating a brief written by a human user, the agent's job is to read what shape it is and adapt — not to demand the user rewrite.

## 1.2 The target shape (problem statement)

What "best" looks like — synthesized from the strongest practitioner sources, not averaged across them:

- **Three-component framing** is the canonical structure. Two equivalent vocabularies are acceptable:
  - **NN/g (Anna Kaley):** Background → People affected → Stakes
  - **Lenny (Rachitsky):** Situation → Complication → Resolution
  - Both encode the same content order. Pick whichever fits the brief; do not mix.
- **5 Ws answered.** Who (user), What (problem), Where (context), When (moment in time/journey), Why (the stake). NN/g treats this as the readability check; if a reader can't extract all five, the brief is too vague.
- **The outcome is named, not the feature** (Intercom). The brief states what the user is trying to *accomplish* or *avoid*, not what is going to be built. Intercom's example: "easily track query status and prevent queries from getting lost" (outcome), not "Tickets" (feature).
- **Length: target 150–200 words, max 250.** NN/g argues shorter ("a few sentences to a paragraph"); the working system runs better with the slightly fuller form because the model needs lived-experience grounding to reason from. `grief-app.md` (~280 words, three paragraphs) is the canonical fuller exemplar. Below 250 is the working target for the rest.
- **Voice.** Narrative, present tense. Concrete imagery — named medications, named documents, named conditions, the user doing the thing right now. The user is a person, not a persona.

## 1.3 Templates that work

Pick one. Don't stack.

- **Narrative three-paragraph** *(what `grief-app.md` and the 20 cycle-25 rewrites use):* situation paragraph, user-state paragraph, one-line scope.
- **User-need template** (NN/g — Sarah Gibbons): `[User] needs [need] in order to [goal]` as the headline, with one paragraph of surrounding context.
- **Situation / Complication / Resolution** (Lenny Rachitsky): three short paragraphs, one each.
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
| **[NN/g — Anna Kaley, "How to Write a Problem Statement"](https://www.nngroup.com/articles/problem-statements/)** | The three-component canonical (background / people / impact) + 5 Ws. The UX-research lens. |
| **[NN/g — Sarah Gibbons, "User Need Statements"](https://www.nngroup.com/articles/user-need-statements/)** | Companion: `[User] needs [need] in order to [goal]` template. |
| **[Intercom — "How to write problem statements"](https://www.intercom.com/blog/how-to-write-problem-statements/)** | Sharpest product-practitioner take. The "Tickets vs easily track query status" example. Best at separating problem from feature. |
| **[GDS Service Manual — Discovery phase](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works)** | UK government. Rigorous public-service framing; pairs problem statement with user research methods. |
| **[18F Methods Guide](https://guides.18f.gov/methods/)** | US government. Practical, tactical, government-scale problem framing. |
| **[Stanford d.school — Design Thinking Bootleg](https://dschool.stanford.edu/resources/design-thinking-bootleg)** | "How Might We" reframing pattern; turn a problem into a generative question. |
| **[Lenny Rachitsky — "A Three-Step Framework for Solving Problems"](https://www.lennysnewsletter.com/p/a-three-step-framework-for-solving)** | Situation / Complication / Resolution. PM-craft framing. |
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

**You don't ship a brief without scoring it.** Every brief authored through this project goes through the rubric before it's used downstream. This is the forcing function; it is the entire point of Part 2 existing as its own section.

## 2.1 The author + evaluate workflow

1. **Draft** the brief using the templates and standards in Part 1.
2. **Evaluate** it against the 12-criterion rubric below, *inline in your output*. Score each criterion Pass / Partial / Fail. Name the specific weakness for any Partial or Fail.
3. **Decide.** If the rubric shows ≥ 10 Pass with no Fail, the brief is ready. Otherwise, rewrite and re-score before using.
4. **Surface the score to the human.** Don't bury the rubric output. Make it visible alongside the brief so the reviewer can sanity-check.

The brief in `experiments/briefs/grief-app.md` is the canonical exemplar — score against the rubric returns 12/12 Pass.

## 2.2 The 12-criterion rubric

| # | Criterion | What Pass looks like | What Fail looks like |
|---|---|---|---|
| 1 | **Background present** | A reader can answer "where in the world does this problem happen?" from the first paragraph. | The brief starts with a user description but never names the situation/context. |
| 2 | **People affected named** | The user is identified specifically (a remote new hire, a tenant facing eviction, an executor settling an estate). | "Users" or "people" with no further specificity. |
| 3 | **Stakes named** | A consequence-if-unsolved exists for the user, the business, or both. | The brief describes a situation with no named consequence — the reader can't tell why this matters. |
| 4 | **5 Ws answered** | Who, what, where, when, why-it-matters all extractable from the brief. | One or more of the five is missing or unclear. |
| 5 | **Brief outcome stated** | The user-side outcome the work has to deliver is named (e.g., "feeling onboard by Friday," "appointment booked"). | The brief names a feature ("a tracker," "a directory") instead of an outcome. |
| 6 | **Solution-free** | No feature prescription, no list of candidate solution shapes ("it could be SMS, voice…"). Exception: a deliberate **directive pitch** is allowed — but it must be labeled as such so the system handles it correctly. | Embedded feature lists, candidate-solution voiceovers, or implementation choices. |
| 7 | **Causal pre-determination avoided** | The brief describes the situation; it does not assert *why* the situation is what it is. | Sentences like "the directory hides exactly the information that would let a patient route themselves" — that's a hypothesis, not an observation. |
| 8 | **Concrete, not vague** | Specific imagery, named documents, named conditions, lived-experience details. | "Users want better X" / "the experience is frustrating" / "the process is complex." |
| 9 | **Length appropriate** | 150–250 words. The longer end is fine if the content earns it (grief-app exemplar is ~280). | > 350 words, or duplicating content from a companion node. |
| 10 | **No research citations in body** | No source names, study titles, agency citations, named reports. Those live in `-research.md`. | "AHRQ notes that 14% of hospital patients…" inside the brief. |
| 11 | **No success metrics in body** | No conversion targets, KPIs, OKRs, or rate goals. Those live in `-objectives.md`. | "We want a 25% improvement in retention" inside the brief. |
| 12 | **No constraints in body** | No regulatory citations, accessibility floors, surface declarations, or cognitive-load research findings. Those live in `-constraints.md`. | "WCAG 2.2 AA must be met" or "Target surfaces: mobile-web" inside the brief. |

**Threshold:**

- **≥ 10 Pass, 0 Fail** → brief is ready.
- **Any Fail** → rewrite, regardless of how many Pass.
- **< 10 Pass** → rewrite.

**Partial counts as half a Pass for the threshold count, and is flagged for revision.**

## 2.3 Example evaluation

How the inline output looks. (Worked example using `pre-travel-prescription.md` after the cycle-25 rewrite.)

```
Brief: pre-travel-prescription.md (196 words)

 1. Background present                  Pass — "preparing for a long international trip"
 2. People affected named               Pass — traveller on regular prescription medication
 3. Stakes named                        Pass — "confiscation at customs to denial of entry to arrest"
 4. 5 Ws answered                       Pass — all five extractable
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

These are mistakes that have actually happened in this project. Each line is a warning.

1. **Conflating brief with packet.** Multi-page briefs with research and objectives baked in. The Designer architecture separates them. Each node is short. Each does one job.
2. **Defaulting to a PRD-shaped brief and trying to "fix it."** When asked to pick a demo brief, the first reflex was `habit-tracker.md` — which is a feature list. The fix is to use a brief that is actually a problem statement, not to dress up a PRD.
3. **Inventing personas with detail.** "Sara is a senior PM with eight meetings today…" feels real but is fabricated. Use research aggregates (*"PMs report difficulty…"*) not invented individuals.
4. **Inventing statistics.** "60% of users abandon" — if there's no citation, it's hallucinated. Use qualitative descriptors or find a real source.
5. **Writing problem statements as marketing.** A brief is a directive, not a sales pitch. Describe the problem; don't sell it.
6. **Writing the skill, then violating it.** Cycle 25 produced 20 briefs that violated this skill in the same session it was written. The fix is the rubric in Part 2. Don't author without scoring.

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
