# Design Constraints — First-Time Manager 1:1 Prep Tool

These are the non-negotiable boundaries that any candidate direction must respect. They are not preferences and not evaluation criteria; a direction that violates one of these should be ruled out at the strategic filter, not refined later. Constraints are organized by category and tagged with rationale and source so reviewers can interrogate them.

---

## 1. Time and Attention

### C-1.1 — Prep session fits inside a 15-minute window
The user's defining moment is the 15-30 minutes before a 1:1 starts. Any direction whose core "prep" loop assumes the user has 30+ minutes of contiguous focus is out of scope. A useful direction should produce something the user can act on in roughly 10 minutes or less, including time to read it. *Source: brief — "15-30 minutes before a 1:1 starts, they're scrambling."*

### C-1.2 — Zero ongoing maintenance burden in steady state
The user already has "enough" tools that demand maintenance. No direction may require routine upkeep (daily logging, weekly tagging, structured note migration, manual relationship-graph editing) as a precondition for value on day 30. Value must hold even if the user only opens the tool right before each 1:1. *Source: brief — "without becoming another tool that demands maintenance."*

### C-1.3 — First-use value within the first prep session
A first-time manager evaluates new tools under stress. A direction that requires multi-session onboarding, a setup ritual, or accumulating data before delivering anything useful violates the moment-of-need shape of the problem. The first session must produce something the user perceives as helpful for that day's meeting. *Source: brief — moment-of-need framing; behavioral inference about new-manager risk tolerance.*

---

## 2. Cognitive Load and Framework Imposition

### C-2.1 — No imposed managerial framework as the price of entry
Existing tools fail in part because they feel like "someone else's framework" or "compliance." A direction may *offer* a framework but may not *require* one — the user must be able to get value without first adopting a named methodology, a coaching model, or a values taxonomy. *Source: brief — "feel like compliance (someone else's framework)."*

### C-2.2 — Output must be skim-readable in under 60 seconds
The user is anxious and time-pressured at the moment of use. Whatever the tool produces — agenda, brief, prompts, summary — has to be parseable at a glance. Dense paragraphs, long checklists, or nested hierarchies that require careful reading violate the use context. *Source: behavioral inference from "scrambling between Slack, calendar, last-meeting notes."*

### C-2.3 — Per-report context can be lightweight, not exhaustive
The user manages multiple direct reports who differ substantially (junior IC through peer-turned-report). The tool may capture per-report context, but cannot require a complete profile per person before being useful for that person. Partial context must be tolerated and usefully degraded. *Source: brief — range of report types listed.*

---

## 3. Surface and Integration

### C-3.1 — Must not require IT or HR procurement to adopt
The target user is an individual first-time manager, not a People Ops buyer. Any direction whose distribution path depends on company-wide rollout, SSO provisioning, HRIS integration, or admin approval is out of scope. The user must be able to start using it themselves. *Source: brief — "team-management software with 1:1 modules... not where new managers want to live."*

### C-3.2 — Must not assume write-access to the report's calendar, notes, or HRIS
The tool serves *one side* of the 1:1: the manager's prep. Directions that depend on the report installing anything, sharing data, or being notified do not match the audience. Read-only references to surfaces the manager already has access to (their own calendar, their own notes) are fine; anything that touches the report's surface is not. *Source: brief — audience is the manager, not the team; behavioral inference about new-manager autonomy.*

### C-3.3 — Surface must not require a desktop-only context
First-time managers prep in transit, between meetings, on phones. A direction whose primary surface is desktop-only (e.g., a heavy IDE-style web app, a Mac menu-bar utility) constrains the moment-of-use too tightly. Mobile-viable is required; mobile-first is not. *Source: behavioral inference from "15-30 minutes before" — implies cross-context prep.*

### C-3.4 — Cannot assume a specific incumbent stack
The audience uses varying combinations of Slack/Teams, Google/Outlook calendar, Notion/Linear/Jira, and personal note apps. A direction may integrate with any of these, but cannot require a specific one (e.g., "only works if you use Notion + Google Calendar + Slack"). Standalone-viable is required even if integrations enhance it. *Source: brief — Slack and calendar named as user surfaces, but not as a stack assumption.*

---

## 4. Privacy and Confidentiality

### C-4.1 — Report-identifying notes must remain private to the manager
1:1 prep contains highly sensitive content: performance concerns, interpersonal friction, compensation, attrition risk. Any direction that defaults to surfacing this beyond the individual manager (team-wide visibility, manager's-manager visibility, "social" features) is out of scope. The user must be able to write candidly without modeling who else might see it. *Source: category norms; behavioral inference about manager use cases.*

### C-4.2 — Third-party LLM use must be inspectable and refusable
If a direction uses an LLM to generate prompts, summaries, or briefs, the user must be able to understand what data is sent, and the tool must work (in some reduced form) for users who cannot or will not send report-identifying data to a third party. This is a practical constraint as much as a regulatory one — many managers operate under employer policies that restrict pasting employee info into external models. *Source: regulatory and employer-policy inference; widespread enterprise AI use restrictions.*

### C-4.3 — No retention of report-identifying content beyond what the manager controls
The manager must be able to delete a report's record and have the deletion be real. No background analytics, no aggregated "insights across all your reports" that survive deletion. *Source: privacy norms; GDPR/CCPA-class data minimization principles applied to employee data.*

---

## 5. Tone and Framing

### C-5.1 — Cannot frame the user as deficient
First-time managers are anxious about their competence. A direction whose tone implies "you don't know how to manage" — diagnostic quizzes, skill-gap dashboards, remediation flows — works against the audience. The tool can support growth without grading the user. *Source: brief — audience emotional context; behavioral inference.*

### C-5.2 — Cannot frame the report as a problem to be solved
The 1:1 is a relationship surface. A direction that treats the report as a managed object (e.g., "risk score," "engagement trend," "intervention recommended") is out of scope for this audience and category. The tool's framing must support the manager *with* the report, not *against* them. *Source: brief — relational framing; ethics of employee surveillance.*

### C-5.3 — Not a coaching product
The audience wants help preparing for the next meeting, not a coach. Directions that center long-arc coaching curricula, journaling regimens, or development frameworks for the manager themselves are out of scope. (Adjacent and valuable — but a different product.) *Source: brief — explicit scoping to "preparing for the next 1:1."*

---

## 6. Accessibility

### C-6.1 — WCAG 2.2 AA conformance for any shipped interface
Standard floor for any product targeting professional users; particularly important given the audience may include managers with disabilities and the moment-of-use is high-stress (which amplifies the cost of poor accessibility). *Source: industry standard; legal obligation in many jurisdictions.*

### C-6.2 — Must work without audio output
Managers often prep in shared spaces (open offices, between meetings, in cars). A direction whose value depends on listening (audio briefings, voice-only output) must also be usable silently. Voice-as-option is fine; voice-as-required is not. *Source: behavioral inference from use context.*

### C-6.3 — Must work without continuous typing
Conversely, voice or quick-tap entry should be possible for capture surfaces. Forcing a manager to sit and type a full briefing into a form before getting value violates the time constraint. *Source: behavioral inference from moment-of-need framing.*

---

## 7. Scope and Category Boundaries

### C-7.1 — Not a replacement for HRIS or performance-management systems
The brief explicitly distances the product from HR-coordinated team-management software. A direction that drifts back into performance reviews, OKR tracking, comp planning, or formal feedback workflows violates the audience scoping. *Source: brief — explicit out-of-category statement.*

### C-7.2 — Not a meeting platform
The 1:1 itself happens elsewhere (Zoom, Meet, in person). The tool is upstream of the meeting, not the meeting itself. Directions that try to be the video/transcription surface are out of scope. *Source: brief framing — "preparing for" the 1:1.*

### C-7.3 — Not a team-wide product in v1
The audience is the individual first-time manager. A direction that only makes sense once a whole org adopts it (e.g., "managers can share 1:1 templates across the company") may be a future extension but cannot be the primary value proposition. *Source: brief — single-user audience; C-3.1 procurement constraint.*

---

## 8. Evidentiary and Behavioral

### C-8.1 — Cannot rely on user-reported emotional state as input
"How are you feeling about this 1:1?" gating flows are brittle: anxious users misreport, and the question itself adds friction at the worst moment. The tool can infer urgency from context (time-until-meeting, recency of prior notes), but cannot demand introspection as input. *Source: behavioral inference; established friction patterns in well-being products.*

### C-8.2 — Cannot assume the user remembers what happened in the last 1:1
A core failure mode of existing notebooks is that prior context is unsearched and unsurfaced. Any direction must assume the user has forgotten — surfacing prior context (if captured) is in scope; expecting the user to recall it is not. *Source: brief — last-meeting notes named as a scrambling surface.*

---

## What is explicitly *not* a constraint

To prevent silent scope creep masquerading as a constraint, the following are *not* fixed and remain open for the strategic directions to explore:

- **Form factor.** Single surface, short flow, standalone product — the brief explicitly leaves this open.
- **AI involvement.** Directions may be heavily LLM-driven, lightly LLM-assisted, or entirely deterministic. C-4.2 governs *how* LLMs are used, not whether.
- **Pricing model.** Free, freemium, paid — open.
- **Whether the tool persists state at all.** A stateless "session-only" direction is permissible; so is a persistent one.
- **Whether the manager's reports ever see it.** Default is no (per C-3.2 and C-4.1), but a direction that includes opt-in shared elements is not categorically ruled out — it just bears a high burden.

---

## How to use this document

A reviewer evaluating a candidate direction should be able to walk this list and mark each constraint as **respected**, **violated**, or **at risk**. A single hard violation (e.g., a direction that requires HRIS integration) is sufficient grounds to drop the direction at the strategic-filter stage rather than refining it. "At risk" constraints flag where the direction needs an explicit answer before proceeding.
