FCRA is the binding federal statute. The design must hold its specific timeframes, rights, and procedures accurately. State laws (CCPA, state credit-reporting laws) may add to (not subtract from) federal rights.

Identity verification for accessing a credit report is regulated under NIST 800-63 levels and bureau-specific procedures. The design cannot lower these requirements.

The three major bureaus' dispute interfaces are separate. The design must work across all three; bureau-specific quirks (Experian's required document formats, Equifax's specific workflow) must be held accurately.

CFPB complaint workflow has its own structure (file via consumerfinance.gov, response timelines, escalation paths). The design must hold this correctly.

State-specific variations matter. California (under CCPA), New York (under state credit-law reforms), and others have additional protections. The design must navigate these.

Accessibility (WCAG 2.2 AA) is required. The audience includes older adults, people with disabilities, low-literacy consumers, and people with limited English proficiency. Multilingual support is appropriate.

Data on consumer credit disputes is sensitive. The architecture must protect against creating a new exposure surface.
