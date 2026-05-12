HIPAA and state privacy law apply to any handling of patient health information. Even basic information about chronic-condition match (e.g., "I have diabetes") qualifies as PHI in many architectures. The design must handle this data with HIPAA-compliant architecture, BAAs where required, and explicit consent for any disclosure.

Stark Law and the federal anti-kickback statute regulate referral relationships between health-care entities. Any tool that steers patients to specific practices must avoid becoming an unlawful referral arrangement, especially if compensated by practices.

State insurance regulation governs which PCPs are in-network for which plans. Network adequacy rules vary by state. The design must keep current with network rosters that change frequently and not over-promise availability that does not exist.

Title VI of the Civil Rights Act requires meaningful language access for federally-funded health programs. Many practices receive federal funds; language access is not optional. The design must support patients whose primary language is not English.

ADA Title III applies to physical access to medical offices. The design must surface accurate accessibility information (wheelchair access, examination tables, scales, communication accommodations) so patients with disabilities can choose practices that fit.

Accuracy of the data is the binding constraint. A directory that surfaces "accepting new patients" when the practice is not — or vice versa — destroys trust on first use. The design must be honest about where the data comes from, when it was last verified, and what to do when it's wrong.
