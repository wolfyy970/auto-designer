# Evaluation Criteria — ICU Shift-Change Handoff Tool

These are the design-inspectable properties a reviewer should use to judge whether a candidate handoff design is a good solution to the brief. They are not user-test metrics, business KPIs, or implementation acceptance criteria. Each criterion names a property the design must exhibit *and* a failure mode that appears when that property is over-pursued — the trade-off the design has to manage, not eliminate.

A reviewer should be able to look at static screens or a clickable flow and form a defensible opinion on each item. If a criterion can only be answered by running the tool on a real unit, it does not belong here.

---

## 1. Salience hierarchy that survives 20–30 seconds per patient

**What good looks like.** The first thing a nurse sees per patient is what would change their next action: pending results that have not landed, vital trends moving the wrong direction, decisions anticipated in the next 12 hours, anything the outgoing nurse flagged as worth saying out loud. Secondary detail (baseline status, normal trends, stable lines) is visibly present but visibly demoted — same screen, lower weight, smaller, dimmer, or in a second tier. A reviewer can point at the first viewport and name the three things the oncoming nurse needs to act on, without scrolling, without expanding, without hover.

**Failure mode of over-pursuit.** Aggressive prioritization collapses into a "top 3 alerts" panel that omits the connective tissue. The nurse can no longer see *why* a flagged item matters because the context that makes it meaningful has been hidden in a drawer. The design starts performing triage *for* the nurse rather than *with* them.

## 2. Tacit-knowledge capture without forcing articulation

**What good looks like.** There is a place — a single, low-friction surface — for the outgoing nurse to leave the "I have a feeling about this" content: hunches, family dynamics, behavioral patterns, the patient who "looks fine on paper but isn't." Entry is fast (voice, a freeform field, a tag), unstructured by default, and the receiver sees it positioned next to the patient it belongs to, not buried in a notes tab. The design treats this content as first-class signal, not optional commentary.

**Failure mode of over-pursuit.** The tool tries to *structure* tacit knowledge — dropdowns for "type of concern," sliders for severity, required fields. The nurse stops entering anything because the form has translated a feeling into a taxonomy, and the taxonomy is wrong. Worse: the structured version gets trusted more than the human sentence it replaced.

## 3. Two-sided symmetry — giving and receiving feel like one tool

**What good looks like.** The same nurse, four hours apart, uses the tool in opposite roles. The "giving report" view and the "receiving report" view share a model and a layout, so the receiver's mental map of where things live matches the giver's. No mode switch feels like learning a second product. A reviewer should be able to identify, on any screen, which side of the handoff is active and what the other side is seeing in parallel.

**Failure mode of over-pursuit.** Strict symmetry produces a generic "view a patient" screen that serves neither role well. The giving side loses the prompts that help an outgoing nurse remember what to say; the receiving side loses the affordances for marking what they've heard and what they still need.

## 4. Bedside ergonomics — pocket smartphone and workstation-on-wheels are first-class

**What good looks like.** The design is legible and operable on a phone held in one hand, standing, at the bedside, with the other hand on a patient or a chart. Critical content reaches the thumb without rotation, pinch, or precise tapping. The WoW (workstation-on-wheels) view is not a port of the phone view — it uses the screen real estate to show multi-patient comparison, longer trends, or the full SBAR narrative side-by-side. Both views answer the same questions; neither pretends to be the other.

**Failure mode of over-pursuit.** Responsive design becomes the goal, and the phone and WoW collapse into the same responsive layout. The phone gets too much content; the WoW gets a stretched phone. Nurses end up using whichever they hate less, instead of whichever fits the moment.

## 5. Zero net documentation burden

**What good looks like.** A reviewer can trace every input field in the tool to either (a) data already entered elsewhere in the EHR that the tool is reusing, or (b) content the nurse would have said verbally anyway, captured at the moment of saying it. The tool *substitutes* for existing documentation work where possible — a handoff note that satisfies regulatory requirements is generated as a byproduct, not asked for separately. Nothing in the design exists "for the record" alone.

**Failure mode of over-pursuit.** Aggressive auto-population pulls in stale, wrong, or context-free data from the EHR and presents it as current handoff content. The nurse now has to spend the saved time *correcting* the tool instead of *using* it, and trust in the auto-populated content erodes faster than the time savings accumulate.

## 6. Time-anchored content — the next 12 hours are visible as a horizon

**What good looks like.** Pending labs have an expected return time. Anticipated decisions have a trigger condition and a window. Recent vital trends are shown against a time axis that includes the next shift, not just the last one. The receiver can see, at a glance, what is coming due on their watch — not just what happened on the previous shift. Time is treated as a first-class axis in the layout, not a column buried in a table.

**Failure mode of over-pursuit.** The interface becomes a timeline-first product. Nurses now have to translate a temporal view back into "what do I do about this patient right now," and that translation is the work the tool was supposed to remove.

## 7. Respect for clinical judgment in tone, copy, and structure

**What good looks like.** Labels, prompts, empty states, and confirmations read as written by someone who has been at a bedside. No "Great job!" toast after saving a handoff. No checklists that imply a complete handoff is the union of all boxes ticked. No nudges that imply the nurse forgot something the tool somehow knew. Defaults assume the nurse is competent and time-pressured; the tool gets out of the way once it has surfaced what it needs to.

**Failure mode of over-pursuit.** Tone overcorrects into terseness — error messages that read as terse to the point of unhelpful, empty states that give no orientation to a new hire, copy so stripped that the tool loses any sense of being *for* this profession.

## 8. Failure-mode visibility — what the tool doesn't know is shown

**What good looks like.** When data is missing, stale, or unverified, the design says so in place, not silently. A pending lab that hasn't returned looks different from a result that's in. A vital trend with a gap shows the gap. A field the outgoing nurse left blank reads as blank, not as a confident absence. The reviewer can find at least one place where the design intentionally surfaces its own uncertainty.

**Failure mode of over-pursuit.** Every field acquires a confidence indicator, a freshness timestamp, a source badge. The signal-to-chrome ratio collapses. The nurse cannot find the actual content under the meta-content about the content.

## 9. Coexistence with the EHR — not a replacement, not an island

**What good looks like.** The design has an answer to "what happens when the nurse needs the deep chart" — a path back to the EHR that doesn't lose the handoff context. Conversely, EHR data flows into the handoff view without re-entry. The tool is positioned as the *handoff layer* over the chart, not as a competing system of record. A reviewer can identify, on the screen, the seam between "this tool" and "the EHR" and verify it is a soft seam.

**Failure mode of over-pursuit.** Integration becomes the design goal and the tool starts looking like a slightly nicer EHR view. The thing that made it worth using — its focus on the handoff moment — gets diluted into "yet another view onto the chart."

## 10. The room and the screen agree

**What good looks like.** The tool supports — does not replace — the 20–30 seconds of verbal exchange at the bedside. Layout cues what to *say*, not just what to read. The receiving nurse can mark "heard this" or "want to come back to this" without breaking eye contact with the giver. The patient, if conscious, is not made invisible by the screen between two clinicians.

**Failure mode of over-pursuit.** The tool becomes so good at silent transfer that it discourages the verbal exchange entirely. Things that were said out loud — and caught precisely because they were said out loud — now move through the tool only, and the verbal handoff withers. The error mode of "we both assumed the tool said it" replaces the error mode of "neither of us said it."

---

## How to use these criteria

A reviewer should walk through a candidate design and, for each criterion, answer two questions:

1. **Where in the design is this property visible?** Point to it. If you cannot, the design is silent on this dimension and the score is low regardless of intent.
2. **Where does the design risk the over-pursuit failure mode?** If you cannot find a tension or a deliberate restraint, the property has not actually been designed *for* — it has been claimed.

A design that scores well on 6–7 of these, with visible restraint on the rest, is a stronger candidate than one that claims to satisfy all ten. The criteria are intentionally in tension with one another (salience vs. failure-mode visibility, symmetry vs. role-specific ergonomics, tacit capture vs. zero burden). The judgment a reviewer is making is whether the design has chosen its trade-offs deliberately — not whether it has escaped them.
