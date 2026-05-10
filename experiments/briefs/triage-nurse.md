# Triage Nurse — next-patient decision support

A small interface for triage nurses in a busy urban ED. Nurses currently scan a long patient list looking for who needs attention next. The list shows arrival time, chief complaint, and a color-coded acuity level (1-5). Nurses report decision fatigue late in shifts and say the most urgent patient often doesn't visually stand out from the merely waiting.

We want to help nurses identify the next patient to see — not by automating the decision, but by surfacing the signals nurses already use (acuity, time waited, vitals trend, complaint risk) in a way that requires less scanning effort.

The goal is a static mock of the new interface (what the nurse sees, where the affordances are, what data appears). Don't propose backend changes, ML models, or workflow restructuring beyond what a UI redesign can express.

Constraints: we cannot remove information from the existing interface (regulatory). We can add, reorganize, and re-emphasize.
