# Design Constraints: ICU Shift-Change Handoff Tool

These are the non-negotiable boundaries the design must respect. A candidate that violates any of these is not viable, regardless of how compelling it is on other dimensions. Constraints are grouped by source, with rationale where the rule isn't self-evident.

---

## 1. Regulatory & Compliance

### 1.1 HIPAA / PHI handling
- All patient identifiers, clinical data, and free-text observations are PHI. The tool must encrypt data at rest (AES-256 or equivalent) and in transit (TLS 1.2+).
- Authentication must be tied to individual user accounts (no shared logins, no kiosk mode without per-session login). Badge-tap / SSO with the hospital identity provider is preferred over passwords for shift workflows.
- Auto-lock on inactivity at no more than 2 minutes for handheld devices, 5 minutes for workstation-on-wheels. Returning from lock must require re-auth, not just a tap.
- An auditable trail of who viewed and who edited each patient's handoff record must be retained for the minimum required by hospital policy (typically 6 years). Audit log entries are append-only and immutable from within the application.

### 1.2 FDA software classification
- The tool must not present itself as a clinical decision support system that drives diagnosis or treatment. It surfaces information that nurses have already entered or that already exists in the EHR. Anything that crosses into "the software is recommending a clinical action" likely triggers FDA Class II device review and is out of scope for this brief.
- If the tool ever ranks, scores, or color-codes patients in a way that implies acuity prioritization, it must be reviewable, explainable, and able to be overridden trivially. "Black-box AI says this patient is highest priority" is prohibited.

### 1.3 The Joint Commission handoff standard
- The handoff content model must accommodate the elements the Joint Commission requires for inter-provider handoff: current condition, recent changes, anticipated changes, what to watch for, contingency plans. The tool may exceed this; it may not omit it.
- The tool must support, not replace, verbal handoff. A design that eliminates the spoken exchange is non-compliant with most hospital handoff policies and is rejected on those grounds.

### 1.4 Hospital governance
- The tool must not write back to the EHR without an explicit, documented integration agreement with the EHR vendor (Epic, Cerner, etc.). Read-only EHR access via FHIR or HL7 is the default assumption; bidirectional sync is out of scope for v1.
- Any AI-generated summarization or paraphrasing of clinical notes must be flagged as machine-generated in the UI and must retain a one-tap path to the original source text. Nurses must never be in a position where they cannot tell whether they are reading what a colleague wrote or what a model wrote.

---

## 2. Accessibility (WCAG 2.1 AA, plus clinical-environment specifics)

### 2.1 Standard accessibility
- WCAG 2.1 AA conformance is the floor, not the goal. All interactive elements meet minimum touch-target size (44×44 pt iOS / 48×48 dp Android), color contrast (4.5:1 for body text, 3:1 for large text and UI components), and keyboard / screen-reader operability.
- No information may be conveyed by color alone. Red/green status indicators must also carry a shape, icon, or text label.

### 2.2 Clinical-environment-specific
- Readable under fluorescent overhead lighting and the dim, blue-shifted lighting of an ICU pod at night. Test the design under both conditions; do not rely on subtle contrast.
- Operable with gloved hands. Touch targets that work for bare fingers may not work for a nurse who has just gloved up to enter an isolation room. The lower bound is approximately 48×48 pt regardless of platform.
- Operable one-handed on a phone, because the other hand is frequently holding something, restraining a line, or supporting a patient.
- No reliance on audio cues. ICUs are loud (alarms, conversation, equipment) and many nurses wear stethoscopes around their necks; audio is unreliable for status communication.
- No reliance on haptic-only feedback. Vibration patterns are easily missed and are confounded by the phone being in a scrub pocket.

### 2.3 Reading and literacy
- The interface must be readable at the language level of a working clinical professional, but must not require the user to parse dense paragraphs. Bullet-friendly, scannable layouts are required for the primary handoff view.
- Numeric values (vitals, lab values, medication doses) must use the conventions and units the nurse already uses (e.g., MAP in mmHg, lactate in mmol/L, drip rates in mcg/kg/min). Unit conversion features are optional; unit ambiguity is prohibited.

---

## 3. Surface & Form Factor

### 3.1 Devices in scope
- A pocket-sized smartphone the nurse already carries (typically a hospital-issued iPhone or Zebra/Spectralink handheld, screens 5"–6.5" diagonal).
- The workstation-on-wheels (WOW) display, which is also running the EHR. The handoff tool may render on this surface but must not occlude or fight with the EHR.
- A wall-mounted shared display in the pod, if and only if PHI is hidden by default and revealed only after auth.

### 3.2 Devices explicitly out of scope (for v1)
- Smartwatches and other wearables. They are not reliable enough for handoff-critical information density.
- AR/VR headsets. Not clinically deployed at the bedside in any meaningful way.
- Voice-only assistants. The acoustic environment and PHI constraints make this non-viable.

### 3.3 Within the pocket-phone surface
- The primary handoff view must fit a single patient's critical state above the fold on the smallest in-scope phone (iPhone SE 4.7" or equivalent), with no horizontal scrolling. Vertical scroll is acceptable for secondary detail.
- The tool must launch and present a usable view within 3 seconds of cold start on the slowest in-scope device. Nurses will not wait for a loading spinner.
- Offline read of the most recent handoff record for the nurse's assigned patients must remain available for at least 30 minutes after network loss. Writes during offline state are deferred and clearly indicated.

---

## 4. Time & Cognitive Load

### 4.1 The time budget is real
- 30 minutes / 4 patients = 7.5 minutes per patient end-to-end, including verbal exchange, walking between pods, and equipment checks. The tool's share of that budget is approximately 60–90 seconds per patient. Any interaction that costs more than ~10 seconds for a single piece of information has failed.
- A new piece of handoff content (something the outgoing nurse needs to capture mid-shift) must be enterable in under 20 seconds, with no more than three taps to start and one to commit.
- The total documentation burden across a 12-hour shift attributable to this tool must be lower than the burden of the artifacts it replaces (paper SBAR, sticky notes, EHR free-text fields). Net-positive documentation burden is a rejection criterion.

### 4.2 Cognitive-load ceiling
- The receiving nurse must be able to identify the three things that matter most about a patient — anticipated next decisions, recent material changes, things to watch — within 30 seconds of opening that patient's record. If the design requires the nurse to read more than a screen of content to reach this state, it is too heavy.
- No more than one primary action per screen. The "what do I do next" question must be answerable without scanning.
- The tool may not require the nurse to make a categorization decision (priority level, severity score, urgency rating) before they can capture an observation. Categorization, if any, happens after capture, never before.

### 4.3 The "I have a feeling" problem
- The tool must provide a low-friction surface for ambiguous, hedge-y, "something's not quite right" observations. This is a hard constraint, not a feature wish: the brief identifies this content category explicitly, and a design that has nowhere to put it has not solved the brief.
- These observations must be visually distinct from confirmed clinical facts. A receiving nurse must never confuse a hunch for a finding.

---

## 5. Trust, Safety, and Authority

### 5.1 The nurse is the authority
- The tool may surface, summarize, highlight, sort, or filter. It may not silently omit. If the tool's view is a subset of the underlying record, that filtering must be visible and reversible in one interaction.
- "Smart" defaults (AI-suggested handoff summary, auto-prioritized patient ordering, predicted next decisions) must be presented as proposals the nurse confirms, edits, or dismisses. They are never the system of record.
- Override the tool's suggestion is always one interaction. There is no "are you sure?" friction layer on overriding an AI suggestion — the friction belongs on accepting it, if anywhere.

### 5.2 No gamification, no nudges, no engagement metrics
- The tool must not deploy patterns optimized for engagement: streaks, badges, notifications designed to pull the nurse back into the app, progress bars on documentation completeness. Every one of these will be read as the tool trying to extract behavior from a professional, and will earn the rejection the brief warns about.
- The tool must not surface vanity metrics about the nurse's documentation behavior to the nurse or to their manager. Audit data is for compliance, not for performance management visible inside this product.

### 5.3 Error tolerance
- A mis-tap or fat-finger entry must be undoable for at least 10 seconds after commit, in one interaction, without a confirmation modal.
- Destructive actions (deleting a handoff note, dismissing a flag) must be recoverable for at least the duration of the current shift.
- The tool must never lose a nurse's in-progress entry to a network failure, app crash, or session timeout. Local persistence of unsent content is required.

---

## 6. Workflow Fit

### 6.1 The verbal handoff is the primary channel
- The tool's role is to scaffold, prompt, and persist the conversation — not to substitute for it. The design must assume the nurses are in the same room speaking to each other during a portion of the handoff.
- The tool must work when only one of the two nurses is looking at it. A design that requires synchronous co-viewing during the entire handoff has misunderstood the workflow.

### 6.2 The EHR is upstream
- Vitals, labs, medications, orders, demographic information: these live in the EHR. The handoff tool must read these (via FHIR / sanctioned integration) rather than ask the nurse to re-enter them.
- The handoff tool's data model owns the human-curated handoff content: the "what to watch for," the hunches, the family context, the anticipated decisions. It does not own clinical facts that are sourced elsewhere.

### 6.3 Roles other than bedside RN
- Charge nurses, residents, and oncoming physicians may need read access to handoff content during a code, transfer, or escalation. The tool must support read-only access for these roles without requiring the bedside nurse to do anything.
- Patient family members are never users of this tool. Family-facing communication is out of scope.

---

## 7. Privacy at the Bedside

- Patient identifiers visible on a screen at the bedside must be the minimum needed for the nurse to verify they are looking at the right record (room number + initials + last 4 of MRN is the typical floor). Full name and full MRN are revealable on tap but not default-visible.
- Any wall-mounted or shared display must auto-blank or auto-redact PHI when no authenticated user is in front of it (proximity, idle timer, or both).
- Screen content must not be auto-photographable as a privacy violation. Avoid layouts that put full PHI alongside an identifying QR or barcode in the same frame.

---

## 8. Scope Boundaries for v1

These are explicit non-goals — the design must not invest in them even if it could:

- Inter-shift communication outside of the handoff moment itself (no general messaging, no group chat, no async commentary on a patient between shifts beyond the handoff record).
- Family-facing portals, patient-facing summaries, or any non-clinician audience.
- Predictive deterioration alerts, early warning scores, or sepsis screening. These are separate products with separate regulatory pathways.
- Replacing the EHR. The handoff tool is a companion, not a successor.
- Coverage of non-ICU units in v1. Step-down, med-surg, OR handoff have related but distinct workflows and are out of scope.

---

## 9. What Will Cause the Design To Be Rejected on Sight

A summary of the bright lines, restated for the reviewer:

1. Anything that adds documentation burden without replacing existing burden.
2. Anything that presents AI output as if a human had written or confirmed it.
3. Anything that reduces clinical judgment to a score, badge, or required category.
4. Anything that fails to work one-handed, gloved, in low light.
5. Anything that exposes PHI to an unauthenticated viewer.
6. Anything that requires more than ~10 seconds to retrieve a single piece of patient information.
7. Anything that uses engagement / gamification patterns.
8. Anything that replaces the verbal exchange instead of supporting it.
