---
name: Design evaluation
description: Use when authoring or critiquing a design-evaluation-criteria document that supports a design brief. This is NOT for business metrics or post-ship KPIs — it is for design-inspectable criteria a reviewer can use to judge whether a candidate design is a good solution to the problem statement, before any user testing. Covers (1) how to write — design properties paired with failure-modes-of-overpursuit, what goes in this document vs the sibling supporting docs, sources to draw on. (2) How to evaluate — an 8-criterion rubric run on every evaluation doc before it ships. Forcing function: author + evaluate is one workflow, not two; no silent author-and-ship.
tags:
  - design
  - evaluation
  - objectives
when: auto
---

# Design evaluation

This skill is the source of truth for the criteria that decide whether a candidate design is a good solution to a problem statement — at the level of design properties a reviewer can score by looking at the design itself, before any user testing. It exists because design-evaluation documents are repeatedly drifted in two opposite directions: toward post-ship business metrics (KPIs, conversion rates, retention) that nothing in the design process can yet evaluate, and toward execution-layer craft hygiene (accessibility specifics, design-system conformance) that the build stage already handles. The skill names what actually belongs in this document and what does not.

**Critical framing**: these are **NOT business metrics**. They are how a good *design solution* is recognized. KPIs, conversion targets, retention numbers — none of those belong here, because they are measured post-ship and tell you nothing about whether a candidate direction is worth pursuing.

## The document family

A design brief is typically accompanied by three supporting documents. Each does one job, and content leaking between them produces a mixed signal downstream readers reason against badly.

| Document | What it carries | Job |
|---|---|---|
| Design Brief | The directive. Problem statement only — user, situation, stakes. Solution-open. | Frame the problem. |
| Research Context | What user research has revealed. Real signals about audience, behavior, landscape. | Back the framing with evidence. |
| **Design Evaluation Criteria** | **Design properties any viable solution must exhibit; failure-modes-of-overpursuit; outcomes the design must avoid.** | **Define what good looks like at the design level.** |
| Design Constraints | Non-negotiable boundaries that filter strategic viability. | Hold the bet inside reality. |

The sibling skills `design-brief`, `design-research`, and `design-constraints` are calibrated to keep their documents honest. This skill is the one for the evaluation-criteria document.

## The keel — strategic vs execution

Any design effort has two layers of concern. The **strategic layer** (this skill's territory) describes the *exploration space* — what filters which directions are worth pursuing and what makes a design good for this problem. The **execution layer** — where design systems, accessibility implementation, component-level guidelines, and build-quality evaluation live — governs *how a chosen direction is rendered well*.

Operational test: *Would removing this concern change which directions are worth pursuing, or how a good solution would be recognized?* If yes → strategic, belongs in this document. If no → execution, belongs in the design-system / accessibility-implementation / build-quality work, wherever your team tracks those.

For this document specifically, the test sharpens to: *Is this property something an internal reviewer could score from the design itself, before user testing?* If the answer requires shipped-product data, it's a business metric and does not belong here.

---

# Part 1: How to write

## 1.1 Purpose

A design-evaluation-criteria document names the design properties any viable solution to this problem must exhibit, paired with the failure-mode that emerges when each property is pushed too far at the expense of other concerns. It is the rubric the reader uses to recognize a good solution among many candidate directions — not by user testing, but by looking at the design itself.

A doc is doing its job when a reader can finish it and feel like they could now pick up any candidate design and score it: this design satisfies the property, this one over-pursues it and falls into the named failure mode, this one doesn't satisfy it at all.

## 1.2 What goes in

- **Design properties any viable solution must exhibit.** Phrased as something a reviewer could score from the artifact itself. Each property is a feature of *how the design behaves* in service of the user-side outcome named in the brief.
- **A failure-mode-of-overpursuit paired with each property.** What goes wrong when the property is pushed too far at the expense of other concerns. The pairing is the heart of the pattern: a property without its failure-mode is incomplete because it does not yet name the trade-off the designer must navigate. If you cannot articulate the failure mode of over-pursuing the property, the criterion is not ready.
- **Translation from user-side outcomes to design-side properties.** The brief states what the user must accomplish; this doc states the design moves that would let them. The brief's outcome is not restated as the criterion — the design move that would produce the outcome is what's named.
- **Outcomes the design must avoid even when the properties are satisfied.** Failure modes that exist outside the property-and-overpursuit framing. These cover the system-level concerns that a design could nominally satisfy each property and still produce.

## 1.3 What does NOT go in

Each item below has a destination — name it explicitly when redirecting content.

- **KPIs, conversion targets, retention rates, engagement metrics, growth metrics.** These are post-ship business measures. They are out of scope for design-stage evaluation; this document is explicit about that. The point of this document is what a reviewer can score *from the design itself*, not what gets measured after the product ships.
- **A/B test framings, statistical thresholds.** Also post-ship business measures.
- **Craft-hygiene criteria** (accessibility execution, design-system conformance, state completeness, semantic HTML, responsive CSS) → these are evaluator concerns at the build/render stage, where build-quality and accessibility-implementation rubrics live. They are not what makes a direction good or bad for the problem; they are what makes the rendered artifact well-built.
- **Direction-specific criteria** — properties that apply only to one candidate direction do not belong here; they live with that direction's own measurements. This document carries properties that apply to *all* viable directions for this brief.
- **Regulatory compliance** — see the sibling `design-constraints` skill.
- **Execution-layer rendering criteria** (visual rhythm, motion, copy patterns) — execution-layer work, per the cross-reference table.

## 1.4 The pattern that works

One paragraph per property, with the failure-mode-of-overpursuit named in the same paragraph. 4–6 properties total. Each paragraph follows the same internal structure:

- The design property — a feature of how the design behaves, phrased as something a reviewer could verify by looking at the artifact
- The failure mode that emerges when the property is pushed too far at the expense of other concerns — what the over-pursuit produces that is worse than the property's absence

The pairing is the heart of the pattern. Without the failure-mode, the property reads as a hill to climb without limit, and over-pursuit becomes its own failure.

### Translation example shape

The translation move distinguishes a design property from a restated outcome:

- **Brief states an outcome** — what the user must accomplish or avoid. The brief's content does not change.
- **Wrong objective (anti-pattern):** "The design must [verbatim brief outcome]." A reviewer cannot score this from the artifact alone — they would need to wait for the user to attempt the outcome and measure whether it happened.
- **Correct objective (the translation):** name what the design *does on the screen* that would let the user reach the outcome. The criterion is then scoreable by inspection of the design.

When a property fails the *"can a reviewer score this from looking at the artifact alone?"* test, the translation work isn't done. Re-ask: what design move would produce this outcome? That move is the property; the property's failure-mode-of-overpursuit completes the pair.

## 1.5 Sources to draw on

The canon for *outcome-driven design evaluation at the strategic level* — named by author/work, not by enumerated specifics:

| Source | What it gives you |
|---|---|
| Tony Ulwick — *Outcome-Driven Innovation* | Outcomes as user-side job statements; the discipline of measuring jobs, not features. |
| Clayton Christensen — Jobs-to-be-Done outcomes | What the user is hiring the product to accomplish, framed as the criterion the design will be judged against. |
| Marty Cagan — outcome vs output thinking | The discipline of measuring what changes for the user, not what shipped. |
| Teresa Torres — Desired Outcomes in the Opportunity-Solution Tree | Outcomes at the root of the tree; the criteria the bets are judged against. |
| Stanford d.school — How Might We reframing | HMW questions are objective-shaped: they name an outcome and leave the solution open. |
| NN/g — design-inspectable success criteria | The minimum-viable patterns for evaluating design at the artifact level. |

## 1.6 Realism standards

The same realism rules as the sibling skills (`design-brief`, `design-research`, `design-constraints`):

1. Every empirical claim is sourced (less common in this document, but applies when grounding why a property matters).
2. No invented statistics.
3. Mark inferences explicitly with `(Inferred)`.
4. Domain expertise is checked.
5. Source-quality hierarchy applied: government agencies → peer-reviewed work → established non-profits → industry research → design org case studies → practitioner blogs.

## 1.7 Cross-references — where execution-layer concerns route to

These categories of execution-layer work exist in any design organization, though the specific files or teams that own them will vary. The point of the table is the *routing logic*: these concerns are not what makes a candidate design good for this problem at the design-inspection level, so they don't belong in an evaluation-criteria document.

| Concern | Generally lives in |
|---|---|
| Specific accessibility-rendering criteria (contrast ratios, ARIA patterns, focus management, keyboard navigation) | Accessibility implementation guidance; build-stage evaluation rubrics |
| Typography scale, color tokens, spacing rhythm | Design system specification |
| Touch targets, primary-action discoverability, component hierarchy | Component-level design guidelines; design-quality rubrics |
| Motion, atmosphere, distinctive aesthetics | Design system / visual design guidelines |
| Cross-page state, journey integrity, real persistence | Build-quality / interaction-design guidelines |
| Build-quality evaluation (artifact-level scoring) | Build-stage evaluation rubrics |
| Cognitive principles applied at the component level (specific UI patterns) | Component-level design guidelines |
| Post-ship product metrics (KPIs, conversions, retention) | Out of scope for design-stage evaluation altogether |

---

# Part 2: How to evaluate

**You don't ship an evaluation doc without scoring it.** Every doc authored under this skill goes through the rubric before it's used downstream. This is the forcing function.

## 2.1 The author + evaluate workflow

1. **Draft** the evaluation doc using the pattern and standards in Part 1.
2. **Evaluate** it against the 8-criterion rubric below, *inline in your output*. Score each criterion Pass / Partial / Fail. Name the specific weakness for any Partial or Fail.
3. **Decide.** If the rubric shows ≥ 7 Pass with 0 Fail, the doc is ready. Otherwise, rewrite and re-score.
4. **Surface the score to the human** — visible alongside the doc.

## 2.2 The 8-criterion rubric

| # | Criterion | What Pass looks like | What Fail looks like |
|---|---|---|---|
| 1 | **Each criterion is a design property** | Something an internal reviewer can score from the artifact itself. | A downstream user outcome that requires post-ship measurement; a business metric; an event the reader cannot inspect from the design. |
| 2 | **Each property has a named failure-mode-of-overpursuit** | The trade-off is explicit: "the failure mode to avoid is X." | The property is stated alone, without its failure mode; the trade-off is implicit or absent. |
| 3 | **User-side outcomes translated to design-side properties** | The brief's outcome is not restated verbatim; the design move that would produce the outcome is what's named. | The criterion is the brief's outcome with "The design must" prepended. Tells: *"The design must support persistence,"* *"The design must shorten the time…,"* *"The design must produce X."* These read as the outcome wrapped, not as a translated design property. The translation work happens when the criterion names what the design *does on the screen* to make the outcome reachable. |
| 4 | **No business metrics, including denumeralized ones** | KPIs, conversion targets, retention rates, engagement metrics, growth metrics are absent — including the version of these metrics with the number stripped out. | Any post-ship product measure appears as a criterion. *Denumeralized form*: "accelerate the new hire to their first meaningful contribution," "increase satisfaction," "reduce churn" — these are KPIs with the number removed; the post-ship-measurement shape is the same. The test: if a reviewer needs shipped-product data to score it, it's still a business metric. |
| 5 | **No regulatory constraints** | Regulatory frameworks are absent (those belong in `design-constraints`). | Hard binding rules framed as objectives. |
| 6 | **No craft-hygiene criteria** | Accessibility execution, design-system conformance, state completeness, semantic HTML, responsive CSS are absent (those belong in build-stage evaluation rubrics). | Any criterion is about how the rendered artifact is built rather than what good design behavior looks like for this problem. |
| 7 | **No direction-specific criteria** | Every criterion applies to all viable directions for this brief, not to one specific candidate. | A criterion describes a specific feature or interaction unique to one direction. |
| 8 | **Length appropriate** | 4–6 short paragraphs, one per property. | More than ~7 paragraphs, fewer than 3, or duplicating content from other companion docs. |

**Threshold:**

- **≥ 7 Pass, 0 Fail** → doc is ready.
- **Any Fail** → rewrite, regardless of how many Pass.
- **< 7 Pass** → rewrite.

**Partial counts as half a Pass for the threshold count, and is flagged for revision.**

## 2.3 Inline output shape

Surface the rubric scoring underneath the doc so the human reviewer can sanity-check what you concluded. The shape mirrors the sibling `design-brief` skill's worked example: one line per criterion with a one-clause reason for the score.

---

## Anti-patterns

1. **Business and post-ship metrics dressed as design criteria.** Conversion rates, retention targets, "first meaningful contribution within N days" — these are measured after the product ships, not from inspection of the design. They do not belong here.
2. **Direction-specific properties that should live with their direction.** When a criterion describes a feature or interaction that only one candidate direction would have, it is a measurement on that direction, not a property all viable solutions must exhibit.
3. **Binding regulatory rules.** When a criterion is "the design must comply with X regulation," the regulation is a strategic constraint and belongs in design-constraints, not as an objective the design pursues.
4. **The brief's user-side outcome restated unchanged as the criterion.** The brief says what the user must accomplish; the evaluation doc must say what the *design* must do to let them. Restating the outcome verbatim skips the translation work.
5. **Properties without failure-modes-of-overpursuit.** A property that doesn't name its trade-off is incomplete. The pairing is the heart of the pattern.
6. **Stylistic templating across the corpus.** A second-order failure: when every objective paragraph in a corpus opens with "The design should X" and closes with "The failure mode to avoid: Y" in identical three-beat rhythm across many domain-disparate briefs, the agents are filling a form. The property + failure-mode-of-overpursuit pairing is what the rubric tests for; the exact phrasing template is not required. Let the brief's domain shape the language — sometimes the natural opening is a noun phrase ("State legibility is..."), sometimes a question, sometimes a verb other than "should." Vary the rhythm; the rubric tests for substance, not for ritual.

## Sourcing process (when authoring an evaluation doc from scratch)

1. Read the brief and (if it exists) the research doc carefully.
2. Identify the user-side outcomes the brief names — what the user must accomplish or avoid.
3. For each outcome, ask: *what design property would produce this outcome? what design move would let the user get there?* Translate the user-side outcome into a design-side property the artifact can be scored against.
4. For each property, ask: *what goes wrong when this property is over-pursued at the expense of other concerns?* Pair every property with its failure mode.
5. Draft the doc using the pattern in 1.4. Keep it short.
6. **Score against the 8-criterion rubric in 2.2.** Rewrite and re-score until ≥ 7 Pass with 0 Fail.
7. Surface the rubric score alongside the doc.
