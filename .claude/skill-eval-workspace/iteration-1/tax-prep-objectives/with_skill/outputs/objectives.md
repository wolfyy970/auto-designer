The design should make the current state of the user's tax situation legible on first contact — what is done, what is missing, what is waiting on someone else, what is overdue — without requiring the user to assemble that picture themselves from forms, folders, or memory. Status should be visible on the surface the user lands on, not buried inside a workflow they have to start. The failure mode to avoid: a dashboard so dense with status indicators, deadlines, and outstanding items that the user reads it as a list of everything that is wrong with their taxes and closes the tab.

The interface should let the user make progress in short, interruption-tolerant sessions — small units of work that complete on their own and persist, rather than long sequential flows that punish the user for stopping. A user who has fifteen minutes between meetings should be able to finish something. The failure mode to avoid: fragmentation so aggressive that the user never sees how the small pieces connect to a return that is actually getting finished, and loses confidence that the work adds up to anything.

The design should treat tax vocabulary as something to be translated, not performed — surfacing the plain-language version of what a category, form, or question is asking for, with the technical name available but not the primary label. The user should not need to know what a Schedule C is to fill one out. The failure mode to avoid: copy so colloquial it loses precision the user's accountant or the IRS will later need, or that hides the technical names so completely that a user who *does* know what they're looking for cannot find it.

The design should make the consequences of an entry, a category choice, or a missing document visible at the point the user makes the decision — not at the end of a return, and not in a separate review screen. The user should be able to see, at the moment of acting, what changes about their refund, liability, or risk posture. The failure mode to avoid: continuous live-updating numbers that the user reads as a scoreboard, optimizing entries against the displayed figure rather than entering what is true.

Pathways to professional help — to an accountant, to IRS resources, to an audit-defense or amendment workflow — should be present and reachable from any point in the experience without the user having to abandon what they were doing or restart. The user must never feel that asking for help means starting over. The failure mode to avoid: handoffs so prominent that the design implicitly discourages the user from doing anything themselves, or that frame every uncertain entry as a reason to escalate.

The experience should feel calmer than the underlying task. Visual density, color, and tone should communicate that the system is in control of the complexity, even when the user's situation is messy. The failure mode to avoid: a design so reassuring and minimal that it conceals real obligations the user needs to act on, or that flattens the difference between a routine entry and a deadline that has actual financial consequence.

---

## Rubric scoring (Part 2, §2.2)

| # | Criterion | Score | Reason |
|---|---|---|---|
| 1 | Each criterion is a design property | **Pass** | Each paragraph names something a reviewer can score from the artifact: surface-level status legibility, session-completable units, label hierarchy of plain-language vs technical terms, point-of-decision consequence visibility, presence-of-help affordances on every screen, and visual/tonal restraint. |
| 2 | Each property has a named failure-mode-of-overpursuit | **Pass** | Every paragraph ends with an explicit "The failure mode to avoid: X." naming what goes wrong when the property is pushed too far. |
| 3 | User-side outcomes translated to design-side properties | **Pass** | The brief's implicit outcomes (reduce dread, make progress, understand what's being asked, etc.) are not restated; each paragraph names a specific design move — landing-surface status, session granularity, label hierarchy, point-of-decision visibility, in-place help affordances, calmer-than-task visual register. |
| 4 | No business metrics, including denumeralized ones | **Pass** | No KPIs, conversion targets, retention, engagement, completion rates, or denumeralized variants ("get more users to finish," "increase satisfaction") appear. Every property is scoreable from the design itself, not from shipped-product data. |
| 5 | No regulatory constraints | **Pass** | IRS rules, e-file mandates, data-retention requirements are not framed as objectives — they would belong in design-constraints. |
| 6 | No craft-hygiene criteria | **Pass** | No mention of contrast ratios, ARIA, focus rings, design tokens, semantic HTML, responsive breakpoints, or component-system conformance. |
| 7 | No direction-specific criteria | **Pass** | Properties apply to any viable direction (assistant-led, form-style, document-scanning-led, accountant-handoff-first, etc.) — none describes a feature unique to one candidate. |
| 8 | Length appropriate | **Pass** | Six short paragraphs, one per property, no duplication of brief or constraints content. |

**Result: 8 Pass, 0 Fail. Threshold (≥ 7 Pass, 0 Fail) met. Doc is ready.**
