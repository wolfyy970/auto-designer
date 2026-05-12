The application is federally floored and state-specific. State law sets eligibility specifics (covered employment, base period, weekly benefit amount). Federal law (under UI Performs and related programs) imposes timeliness and quality measures the state must meet. The architecture must accommodate state-level variance without losing federal compliance — a hard constraint.

Identity proofing is regulated under NIST Digital Identity Guidelines (SP 800-63-3 series). Higher Identity Assurance Levels (IAL2, IAL3) imply specific verification requirements. The design cannot lower the bar set by federal rules; it can change how the bar is presented to the user.

Plain language is required by federal policy under the Plain Writing Act of 2010 for federal-government communications, and many states have parallel rules. PLAIN's guidelines apply: short sentences, common words, active voice. Many existing state-portal copy fails this bar; redesigns must do better.

PII and fraud-control data-handling is regulated. Claimant SSNs, dates of birth, banking information, and employment history are all sensitive. State agencies are subject to state data-breach laws and federal rules; cloud architectures and contractor handling must meet FedRAMP or state-equivalent standards.

Accessibility (Section 508 for federal-touchpoint systems, WCAG 2.2 AA for parity) is a hard constraint. The audience disproportionately includes people whose work loss is accompanied by health changes, including new disabilities. The experience must work for screen-reader users, low-vision users, users with cognitive disabilities, and users on slow or assistive input devices.

The architecture must degrade gracefully on intermittent mobile connectivity. The application must be resumable: a claimant who loses signal mid-flow should return to find their inputs preserved. Offline-first capture with synchronization on connection is a likely requirement.
