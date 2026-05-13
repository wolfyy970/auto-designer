# Evaluation Criteria — 1:1 Prep Tool for First-Time Managers

These are the design-inspectable criteria a reviewer should use to judge whether a candidate direction is a good solution to the brief. They are framed as **properties to optimize for**, each paired with the **failure mode of overpursuit** — the way a design can chase the property too hard and become bad in a different direction. A strong direction holds the tension; a weak direction collapses to one pole.

These are *design* criteria, not business metrics. They should be judgable from a static concept, a flow, or a clickable prototype — no user testing required to apply them.

---

## 1. Fits the 15-30 minute pre-1:1 moment

**The property.** The design's primary surface should make sense to a manager who opens it with a meeting starting in 20 minutes. Whatever they see first should be immediately actionable for *this specific upcoming 1:1*, not a generic home screen or a configuration step. A reviewer should be able to point to the first screen and say "yes, I can see how this gets used in the next 20 minutes."

**Failure mode of overpursuit.** The tool becomes a single-purpose ritual that only makes sense in that 20-minute window and feels useless every other moment — so it never gets opened proactively, never accumulates context between 1:1s, and gets forgotten between meetings. The strongest directions earn the 20-minute moment without making it the *only* moment.

---

## 2. Supports without prescribing

**The property.** The design should provide structure that a new manager can lean on without forcing them into someone else's framework. Prompts, scaffolds, or starting points should feel like a thoughtful colleague's suggestion, not a template that has to be filled in correctly. A reviewer should be able to imagine a manager *modifying or ignoring* any given prompt and the tool still working.

**Failure mode of overpursuit.** The tool becomes so unopinionated and freeform that it provides no actual support — it's just a blank page with a nicer wrapper, which is what notebooks already are. New managers came for help knowing what to ask; pure neutrality fails them. The strongest directions have a point of view but wear it lightly.

---

## 3. Differentiates the report

**The property.** The design should visibly account for the fact that a 1:1 with a junior IC in their first 90 days is a fundamentally different conversation from a 1:1 with a peer-turned-report or a senior IC. The reviewer should be able to find at least one place in the design where the experience meaningfully diverges based on *who the report is*, not just what was discussed last time.

**Failure mode of overpursuit.** The tool becomes a heavyweight people-profile system — relationship-CRM territory — where the manager spends more time maintaining categorizations than preparing for the actual meeting. Or it leans on rigid persona labels ("the senior IC archetype") that flatten real humans into types. The strongest directions differentiate without demanding taxonomy work.

---

## 4. Survives the maintenance test

**The property.** A reviewer should be able to look at the design and answer: *what does a manager have to do between 1:1s to keep this useful?* The answer should be "very little" or "nothing they wouldn't already do." If the design requires logging, tagging, status updates, or end-of-meeting capture rituals to stay valuable, that's a maintenance debt the brief explicitly warns against.

**Failure mode of overpursuit.** The tool becomes so zero-effort that it has no memory at all — every 1:1 starts from scratch, every prep session is cold, and the tool can't learn or compound across meetings. The brief is clear that managers don't want another system to maintain, but they *do* want continuity. The strongest directions find ways to get continuity without putting the cost on the user (passive capture, smart defaults, low-friction touch).

---

## 5. Names the anxiety, not just the task

**The property.** The "what should I even ask?" anxiety is a real signal in the brief — it's emotional, not just informational. The design should somewhere acknowledge or address the *uncertainty* a new manager feels, not just the *logistics* of running the meeting. A reviewer should be able to point to a moment in the design that responds to "I don't know what I'm doing" — through tone, suggestions, examples, or surfacing what good looks like.

**Failure mode of overpursuit.** The tool becomes therapy-coded — coaching language, reflection prompts, emotional check-ins for the manager — and feels condescending or like it's the wrong tool for a busy work moment. New managers are anxious *and* they're professionals doing a job; the strongest directions respect both.

---

## 6. Distinct from agenda templates, HR software, and notebooks

**The property.** A reviewer should be able to articulate, in one sentence, why this design is *not* a better agenda template, *not* a lighter version of HR-coordinated 1:1 software, and *not* a structured notebook. If the answer collapses to "it's a nicer template" or "it's a less heavy people-management tool" or "it's a notebook with prompts," the direction hasn't earned its existence — the brief explicitly asks for real bets, not convergent variants.

**Failure mode of overpursuit.** The design strains so hard to be *novel* that it invents a new metaphor or interaction model the manager has to learn from scratch, undermining the 20-minute-moment criterion. Differentiation has to be in the *bet* (what the tool is fundamentally for, who it trusts, what it automates), not in surface novelty. The strongest directions are recognizably useful at first glance *and* clearly not the existing categories.

---

## 7. Coherent strategic bet

**The property.** The design should embody a single, articulable thesis about what 1:1 prep *is* — e.g., "it's a memory problem," "it's a context-assembly problem," "it's a confidence problem," "it's a relationship-design problem." A reviewer should be able to read the direction and name the bet in one sentence. Every major design choice should trace back to that bet.

**Failure mode of overpursuit.** The bet is so narrow and pure that the design becomes a one-trick tool — it does its bet perfectly but fails the manager in the (many) cases where that bet doesn't apply. A 1:1 with a struggling report and a 1:1 with a high-performer can't both be perfectly served by a too-pure thesis. The strongest directions have a clear center of gravity and tolerate edges where the bet softens.

---

## 8. Reviewable as a design, not just as an idea

**The property.** The direction should be specified enough that a reviewer can point to actual design choices — a primary screen, a key interaction, a representative content moment — and argue about them. "AI-powered 1:1 prep" is not a direction; it's a category. "A pre-1:1 briefing card that pulls last-meeting notes, recent Slack threads, and one suggested opener, presented as a 60-second read" is a direction. A reviewer should be able to ask "why these three inputs and not others?" and have the design answer.

**Failure mode of overpursuit.** The direction over-specifies a single execution and stops being a *strategic* direction — it becomes a feature spec. Distinct directions should differ at the level of *what kind of tool this is*, not at the level of button placement. The strongest directions are concrete enough to argue with and abstract enough to leave executional room.

---

## How to use these criteria

When comparing candidate directions, a reviewer should:

1. **Score each criterion independently** — strong on (1) doesn't excuse weak on (3).
2. **Watch for collapse to a single pole.** A direction that aces (4) "survives the maintenance test" by having zero memory is failing the tension, not winning the criterion.
3. **Prefer directions that hold tensions** between criteria — e.g., supportive without prescribing (2) *and* coherently bet (7) — over directions that win one criterion by sacrificing another.
4. **Use (6) and (7) as the distinctness check** across the set of directions. If two directions both score well but make the same bet (7) and read as the same departure from the existing categories (6), they're convergent variants and the round has fewer real bets than it appears.
