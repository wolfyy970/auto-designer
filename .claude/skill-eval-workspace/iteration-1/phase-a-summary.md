# Phase A benchmark summary — skill performance on 3 held-out briefs

**Eval setup**: 3 held-out briefs (icu-handoff, tax-prep, manager-1on1) × 3 sibling skills (design-research, design-evaluation, design-constraints) × 2 conditions (with_skill, without_skill) = 18 subagent runs.

**Scoring**: Each output graded by an independent grader subagent against the skill's rubric. with_skill agents used the inline rubric forcing function; without_skill agents wrote with no skill guidance.

## Per-eval results

| Eval | Skill | with_skill | without_skill | Δ |
|---|---|---|---|---|
| icu-handoff-research | design-research | **10/10** | 2/10 | +8 |
| icu-handoff-objectives | design-evaluation | **8/8** | 4/8 | +4 |
| icu-handoff-constraints | design-constraints | **11/11** | 3/11 | +8 |
| tax-prep-research | design-research | **10/10** | 8/10 | +2 |
| tax-prep-objectives | design-evaluation | **8/8** | 4/8 | +4 |
| tax-prep-constraints | design-constraints | **11/11** | 9/11 | +2 |
| manager-1on1-research | design-research | **10/10** | 10/10 | +0 |
| manager-1on1-objectives | design-evaluation | **8/8** | 6/8 | +2 |
| manager-1on1-constraints | design-constraints | **11/11** | 1/11 | +10 |

## Aggregate

- **with_skill**: 87 / 87 = 100% pass rate across all assertions; **9/9 evals at full threshold**
- **without_skill**: 47 / 87 = 54% pass rate across all assertions; **1/9 evals at threshold** (manager-1on1-research)
- **Skill efficacy**: every with_skill eval hit perfect score; without_skill failed 8 of 9 thresholds.

## Timing and tokens

- **with_skill**: 644s total, 357,611 total tokens (mean 72s, 39,734 tokens per run)
- **without_skill**: 849s total, 303,765 total tokens (mean 94s, 33,751 tokens per run)
- with_skill is on average 23s faster per run despite the inline-rubric forcing function adding work; without_skill agents went longer producing sprawl that failed the rubric.

## Take

The skill works. The with_skill forcing function — read skill, produce doc, run inline rubric, rewrite if below threshold — produced perfect scores across all 9 held-out evals, on 3 unfamiliar domains the skills hadn't been used on before. The without_skill condition validated that the skill is doing real work: agents without rubric guidance drifted into sprawl (7-10 paragraphs vs 4-6), buried success criteria, smuggled in direction candidates, and produced WCAG-floor language — exactly the drift the rubric was sharpened to catch.

Domain-dependence is visible: manager-1on1 without_skill scored cleanly on research and partially on objectives (workplace patterns are familiar to general-purpose agents), but collapsed on constraints (1/11) where the agent fell back to WCAG-floor templates. ICU and tax-prep, more specialized, showed bigger deltas across the board.

This confirms iteration 1 of the symbiotic improvement loop: the skill changes the agent's outputs in measurable ways on docs the skill hadn't been tested against.