---
name: Design research
description: Use when authoring or critiquing a research-context document that supports a design brief — strategic grounding on audience, current tools and how they fail, behavioral context, and landscape. Covers (1) how to write — what strategic grounding looks like, what goes in this document vs the sibling supporting docs, sources to draw on, realism standards. (2) How to evaluate — a 10-criterion rubric run on every research doc before it ships. Forcing function: author + evaluate is one workflow, not two; no silent author-and-ship.
tags:
  - design
  - research
when: auto
---

# Design research

This skill is the source of truth for what a research-context document carries, what it does not carry, and how to know whether the doc you've just written is doing its job. It exists because research quality is the most consequential input to direction choice: a research doc that smuggles in solution candidates narrows the exploration space before the direction-choosing stage gets to choose; a research doc that fabricates user voice or quantifies success criteria produces grounding nothing downstream can trust.

## The document family

A design brief is typically accompanied by three supporting documents. Each does one job, and content leaking between them produces a mixed signal downstream readers reason against badly.

| Document | What it carries | Job |
|---|---|---|
| Design Brief | The directive. Problem statement only — user, situation, stakes. Solution-open. | Frame the problem. |
| **Research Context** | **What user research has revealed. Real signals about audience, behavior, the landscape of existing tools and how they fail.** | **Back the framing with evidence.** |
| Design Evaluation Criteria | Design properties any viable solution must exhibit; failure modes of overpursuit. | Define what good looks like at the design level. |
| Design Constraints | Non-negotiable boundaries that filter strategic viability. | Hold the bet inside reality. |

The sibling skills `design-brief`, `design-constraints`, and `design-evaluation` are calibrated to keep their documents honest. This skill is the one for the research-context document.

## The keel — strategic vs execution

Any design effort has two layers of concern. The **strategic layer** (this skill's territory) describes the *exploration space* — what filters which directions are worth pursuing. The **execution layer** — where design systems, accessibility implementation, component-level guidelines, and build-quality evaluation live — governs *how a chosen direction is rendered well*.

Operational test: *Would removing this concern change which directions are worth pursuing?* If yes → strategic, belongs in a supporting strategic doc. If no → execution, belongs in the design-system / accessibility-implementation / build-quality work, wherever your team tracks those.

When a concern feels like it could go either way, apply the test twice — once at the layer of "what kind of product is this" (strategic) and once at the layer of "how is this drawn on screen" (execution). The concern usually belongs to the layer where its absence would change the decision.

---

# Part 1: How to write

## 1.1 Purpose

A research-context document tells the reader who the user is at the level that matters for choosing directions, what the user does today, what existing tools or services they reach for and the specific ways those tools fall short, and where the audience varies enough that one direction won't serve them all. It is the body of *strategic grounding* the direction-choosing stage reasons against.

A research doc is doing its job when a reader can finish it and feel like they could now intelligently filter direction proposals — separate the ones that meet the audience where they are from the ones that don't.

## 1.2 What goes in

- **Audience characterization at a useful specificity.** Narrow enough that some direction shapes are obviously right for this audience and others obviously wrong. Demographic shorthand alone is not enough; what they do, what state they're in when the problem surfaces, what they're trying to accomplish.
- **The current state of the landscape.** What tools or services the audience uses today, and the named ways those tools fail or fall short for this audience. This is what lets a reader spot directions that just rebuild what already exists vs directions that address a real gap.
- **Behavioral and situational context.** How and when people actually encounter the problem; what surrounds the moment of the problem in the user's day. This filters direction shapes that assume a context the user is never in.
- **Aggregate signals from real research.** User voice paraphrased or cited from primary sources. Inference extensions explicitly flagged.
- **Citations on empirical claims.** Inferred extensions marked.

## 1.3 What does NOT go in

Each item below has a destination — name it explicitly when redirecting content.

- **Fabricated user quotes or invented personas with synthetic detail.** See realism standards below; the sibling `design-brief` skill names this anti-pattern in detail. Use aggregate signal language; paraphrase or directly cite.
- **Quantified success targets** ("a 20% improvement," "complete within three minutes"). These are the criteria the design will be judged against and belong in the evaluation-criteria document — see the sibling `design-evaluation` skill.
- **Hard binding rules** about what the design must satisfy (regulatory frameworks, hard surface constraints, deal-breakers). Regulatory or market context can be mentioned in research as a fact about the landscape, but the *binding rule* framing belongs in the constraints document — see the sibling `design-constraints` skill.
- **Direction candidates or solution shapes** ("could be a Slack bot, SMS flow, or app"). Those are direction-choice decisions; surfacing them in research narrows the exploration space prematurely.
- **Execution-layer rendering guidance** (component patterns, copy specifics, contrast ratios, sizing rules). See the cross-reference table below.
- **Statistics without citation.** If you need to convey magnitude without a source, use qualitative language.

## 1.4 The shape that works

Four short paragraphs:

1. **Audience characterization** — who the user is at the level that matters here
2. **Current tools and how they fail** — the landscape this work enters
3. **Audience breadth and varying realities** — where the population diverges enough that one direction won't serve everyone
4. **Strategic opportunity / positioning** — where the gap is, framed without prescribing the solution shape

## 1.5 Sources to draw on

The canon for *research at the right level for strategic exploration* (lighter than full primary user-research methodology, which is heavier than this stage needs):

| Source | What it gives you |
|---|---|
| Erika Hall — *Just Enough Research* | Lean research at the right level. The discipline of doing only the research that changes decisions. |
| Clayton Christensen / Tony Ulwick — Jobs-to-be-Done | The user is hiring a product to do a job. Research that names the job (not the feature) keeps the exploration space honest. |
| Indi Young — *Practical Empathy* / *Time to Listen* | Describe what users described. No invented quotes. The discipline that prevents fabrication. |
| Steve Portigal — *Interviewing Users* | Practical signal extraction from real conversations. |
| Teresa Torres — *Continuous Discovery Habits* | Opportunities (problems) vs solutions; what kinds of signals filter the solution space. |
| NN/g — quick research methods | The minimum-viable patterns; appropriate at the strategic-grounding level. |

For per-domain authoritative source identification (which body to cite when grounding healthcare claims vs civic claims vs financial claims), the sibling `design-brief` skill maintains a source map. When used standalone, identify domain-authoritative sources from primary government agencies, peer-reviewed work, and established non-profits before reaching for practitioner blogs.

## 1.6 Realism standards

Non-negotiable for any sourced material in this doc:

1. **Every empirical claim is sourced.** Cite the study, established framework, or government source.
2. **No invented statistics.** If you need to convey magnitude without a source, use qualitative descriptors.
3. **Mark inferences explicitly.** Use `(Inferred)` for claims that extend from sourced findings without direct evidence.
4. **User voice is from interviews, not invention.** Paraphrase, cite a real source, or describe aggregate behavior. Never quote a fabricated person.
5. **Domain expertise is checked.** Regulated domains have actual frameworks; do not invent them.
6. **Source-quality hierarchy applied**: government agencies → peer-reviewed work → established non-profits → industry research → design org case studies → practitioner blogs.

## 1.7 Cross-references — where execution-layer concerns route to

These categories of execution-layer work exist in any design organization, though the specific files or teams that own them will vary. The point of the table is the *routing logic*: these concerns are not what filters which directions are worth pursuing, so they don't belong in a research-context document.

| Concern | Generally lives in |
|---|---|
| Specific accessibility-rendering criteria (contrast ratios, ARIA patterns, focus management, keyboard navigation) | Accessibility implementation guidance; build-stage evaluation rubrics |
| Typography scale, color tokens, spacing rhythm | Design system specification |
| Touch targets, primary-action discoverability, component hierarchy | Component-level design guidelines; design-quality rubrics |
| Motion, atmosphere, distinctive aesthetics | Design system / visual design guidelines |
| Cross-page state, journey integrity, real persistence | Build-quality / interaction-design guidelines |
| Build-quality evaluation (artifact-level scoring) | Build-stage evaluation rubrics |
| Cognitive principles applied at the component level (specific UI patterns) | Component-level design guidelines |

---

# Part 2: How to evaluate

**You don't ship a research doc without scoring it.** Every research doc authored under this skill goes through the rubric before it's used downstream.

## 2.1 The author + evaluate workflow

1. **Draft** the research doc using the shape and standards in Part 1.
2. **Evaluate** it against the 10-criterion rubric below, *inline in your output*. Score each criterion Pass / Partial / Fail. Name the specific weakness for any Partial or Fail.
3. **Decide.** If the rubric shows ≥ 8 Pass with 0 Fail, the doc is ready. Otherwise, rewrite and re-score.
4. **Surface the score to the human** — visible alongside the doc.

## 2.2 The 10-criterion rubric

| # | Criterion | What Pass looks like | What Fail looks like |
|---|---|---|---|
| 1 | **Audience characterized at a useful specificity** | Narrow enough that some direction shapes are clearly right for this audience and others clearly wrong. | Generic ("users," "people"); demographic shorthand only. |
| 2 | **Current state of the landscape named** | What tools or services the audience uses today, and the named ways those tools fail or fall short for this audience. | No engagement with what already exists; treats the problem as if no prior solution attempts exist. |
| 3 | **Real research signals only** | Aggregate signals, sourced findings, paraphrased user behavior. Named individuals appear only when they are real, named figures from a cited study or case. | Fabricated quotes; invented personas with synthetic biographical detail; *composite case studies* with a first-name attribution and specific trajectory (e.g., "a single mother (Lena) who…") that blur the line between cited individual and synthetic persona. If the individual is real and from a cited case, cite the case; if the pattern is aggregate, paraphrase it without a first-name handle. |
| 4 | **Citations or `(Inferred)` markers on empirical claims** | Sources cited where claims are empirical; `(Inferred)` marks extensions. | Statistics without citation; unmarked inferences. |
| 5 | **Source-quality hierarchy respected AND the highest-tier source available was reached for** | Primary government, peer-reviewed, or established non-profit sources are used where they exist for this domain; lower-tier sources appear only where the higher tiers genuinely don't carry the claim. | Practitioner blogs or vendor marketing cited as the primary source for foundational claims when higher-tier sources for the same domain exist (e.g., the doc is grounded in vendor product marketing without reaching for the domain's peer-reviewed or established-non-profit canon). |
| 6 | **Strategic, not execution** | Every claim passes the operational test in the keel. | Execution-layer guidance (component patterns, contrast, sizing) appears in the doc. |
| 7 | **No success criteria smuggled in** | Quantified targets and KPIs are absent. | "We want a 20% improvement in retention" or similar appears in the body. |
| 8 | **No direction candidates smuggled in** | Solution-shape proposals *for the design* are absent. A list of services or tools the audience *currently confronts in the landscape* (description of the landscape's existing players) passes. | "Could be SMS, voice, or an app" or similar list of shapes *the design should consider*; framing-as-opportunity that begins to prescribe direction ("the design space is whether new shapes — async-first, peer-network, ambient presence — can replicate what was lost"). |
| 9 | **No execution-layer guidance** | None of the categories in the cross-reference table appears in the body. | Typography, contrast, sizing, motion, ARIA, copy-pattern specifics inside the research doc. |
| 10 | **Length appropriate** | 4–6 short paragraphs. | More than ~7 paragraphs, or duplicating content from the brief or other companion docs. |

**Threshold:**

- **≥ 8 Pass, 0 Fail** → doc is ready.
- **Any Fail** → rewrite, regardless of how many Pass.
- **< 8 Pass** → rewrite.

**Partial counts as half a Pass for the threshold count, and is flagged for revision.**

## 2.3 Inline output shape

When you author a research doc, surface the rubric scoring underneath the doc so the human reviewer can sanity-check what you concluded. The shape mirrors the sibling `design-brief` skill's worked example: one line per criterion with a one-clause reason for the score.

---

## Anti-patterns

1. **Direction candidates smuggled in.** Lines that name solution shapes ("could be SMS-based, voice-based, or app-based") leak into research docs and narrow the exploration space prematurely. Those are direction-choice decisions, not research findings.
2. **Inferred user voice walking the line.** Aggregated patterns dressed as if they were specific quotes from interviews. The discipline: paraphrase aggregate behavior, mark `(Inferred)` on extensions, never invent specific quoted voice.
3. **Quantified success targets framed as research findings.** When a number appears, it should appear as a *fact about the landscape* if it's a sourced regulatory or industry measure, not as *the target the design will be judged against*. Targets belong in design-evaluation.
4. **Binding rules framed as research.** Regulatory frameworks mentioned as facts of the landscape are fine; the same frameworks framed as deal-breakers belong in design-constraints.
5. **Framework citation as topical decoration.** A framework name (Sweller's Cognitive Load Theory, Yerkes-Dodson, etc.) is invoked at the head of a claim whose specifics — the number, the timeframe, the mechanism — aren't actually in the cited work. The citation does rhetorical lift it doesn't carry. If the specific isn't in the framework, mark `(Inferred)` and don't attribute the specific to the framework. The framework name belongs in the doc only when its specific mechanism is what produces the claim.
6. **Stylistic uniformity in the closing paragraph.** A second-order failure: when research docs across a corpus converge on the same closing form — "the strategic positioning, then, is... what's open is which direction inside that actually X" — the agent is reaching for a known-passing closer rather than authoring the strategic positioning native to this domain. Vary the closer; let the brief's domain shape what the open question actually is.

## Sourcing process (when authoring a research doc from scratch)

1. Read the brief carefully.
2. Identify the domain. Use the per-domain source map in the sibling `design-brief` skill, or identify domain-authoritative sources directly.
3. Run 2–3 grounding searches against the source-quality hierarchy. Aim for primary sources.
4. Note real signals — actual user-research findings, actual behavioral patterns, actual landscape failure modes.
5. Draft the doc using the 4-paragraph shape in 1.4. Keep it short.
6. **Score against the 10-criterion rubric in 2.2.** Rewrite and re-score until ≥ 8 Pass with 0 Fail.
7. Surface the rubric score alongside the doc.
