---
name: Working depth
description: Use when implementing the bet-critical loop of a design hypothesis — the cross-page user journey that makes the bet falsifiable from static inspection. Covers the depth contract, disguised-stub patterns to avoid, and the journey-walk self-check before declaring done.
tags:
  - design
when: auto
---

# Working depth

Apply when implementing the bet-critical feature(s) of a design hypothesis. Pairs with the **design-generation** skill (file layout, output, validation) and the **how_to_think** instructions in the user message; this skill is the depth contract for the bet-critical loop itself.

## The contract

"Working depth" means the bet-critical user journey closes end-to-end through real code, not through visible mock-ups stitched together. For every bet-critical feature, you should be able to point a reviewer at exact `file:line` locations and prove the loop:

- **`file:line` where the user action triggers a state change** (the `addEventListener`, the form `submit`, the click handler — and the `localStorage.setItem` / `IndexedDB.put` / module-state write inside it).
- **`file:line` for every downstream surface that reads that state** (every page or component that renders, branches on, or computes from the saved value).
- **The connecting glue is real** — no hardcoded fallback that produces the same visible output regardless of state, no setInterval that simulates the change, no demo button that bypasses the path.

If you cannot name those locations for a feature, you have not built it to working depth. Either expand the build to fill the gap or descope the feature to scaffold and rewrite its copy honestly.

## Disguised stubs are still stubs

Cycle 14 banned `// in a real app, this would...` and `// simulate ...` style comments in bet-critical paths. After that ban, stubbing migrated to user-visible patterns. **All of the following count as the same violation if they sit in a bet-critical path:**

- **`Simulate: X happens` / `Demo: Y` buttons** — any UI element whose visible label admits it is faking the bet-critical step. Example violation: `<button>Simulate: Alex accepts request</button>` standing in for the actual acceptance flow.
- **`setInterval`-driven fake "progress"** — a queue position counting down on a timer, a loading bar that fills regardless of real input, an animation that pretends to be a state change. If the bet implies a real state change, real input must drive it.
- **`alert('In a full implementation, this would...')`** and equivalents — the comment ban applies to user-visible copy too. Toasts, placeholder paragraphs, `console.log`s naming the gap, all the same.
- **Hardcoded values rendered as if dynamic** — `<p>Last memory: Grandma's pie</p>` baked into HTML when the bet claims persistence; a streak counter that is hardcoded `3` rather than read from state. If the bet says it's derived, it must come from state the user actually wrote.

The shared shape: the feature looks present visually but the bet-critical step that would make the hypothesis falsifiable is missing. Cycle 19 found 13 of these across 20 builds; the fix is recognizing the pattern, not avoiding specific strings.

If a disguised stub is the only way to ship the feature within budget, the feature is **out of bet-critical scope** — move it to scaffold and rewrite the copy. "Account recovery via trusted contact — out of scope for this probe" is honest scaffold; a `Simulate: contact accepts` button is dishonest scaffold pretending to be working depth.

## Scaffold vs working depth — what each actually looks like

- **Scaffolded feature.** The button renders with the right label and styling but its `onClick` is a no-op or a thin placeholder; the nav link exists but the destination page is a single screen of explanatory copy ("This is where memory archives would live — out of scope for this probe"); the empty state is present with right framing but no functional content. Reviewers *see* the feature exists in the IA; they don't expect it to work.
- **Working-depth feature.** The action produces a state change in a form other pages can read. The cross-page data flow runs. The empty/populated states diverge based on what the user actually did. Reviewers can grade the related `<measurement>`s yes/partial/no from inspecting the artifact without any "this would work in production" inference.

The line between them is not surface polish. A polished scaffold is fine. A polished-looking working-depth feature whose bet-critical step is faked is the worst outcome — it spreads tokens AND fails to test the bet.

## Self-check before declaring done

Before completing, walk the journey concretely. For each bet-critical feature your opening `todo_write` committed to:

1. **Open the entry file as a reviewer would** and click through the user journey end-to-end. Don't just open pages — actually do the actions.
2. **For each step that should produce a state change, confirm in the code that the state change happens** (find the `localStorage.setItem` / equivalent) and that the next surface in the journey actually reads it. If the next surface re-renders hardcoded copy regardless, the journey is broken.
3. **Grep your bet-critical files for the disguised-stub patterns** — `Simulate:`, `Demo:`, `setInterval`, `alert(`, `// in a real`, `// would`, `// simulate`. Any hit inside a bet-critical path is a violation: implement or descope.
4. **For each `<measurement>` your bet-critical commitment todos mapped to a file/state, confirm a reviewer could actually grade it from inspecting the code.** If the answer requires inferring "it would work in production," the depth is missing. Any todo still marked `in_progress` or `pending` at completion time is a deferred bet-critical commitment — resolve it (implement or descope) before declaring done.

Pages that look polished individually can hide a broken cross-page journey because of a missing state model. The static-mock format actively tempts that failure mode. The journey walk is the corrective.
