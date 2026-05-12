Federal law (REAL ID Act, INA for immigration matters) and state law (each state's vehicle and licensing code) overlay. The design must hold both correctly.

State DMV systems are generally not integrated with third-party tools at a meaningful technical level. The design must operate outside the DMV's transactional system or accept that integration is limited to scraping public pages and updating from documentation.

State-specific document requirements change. The design must keep current; out-of-date guidance produces wasted DMV visits.

Identity-proofing is a hard constraint. The design cannot accept lower-grade documentation than the DMV requires; doing so produces failure at the DMV. The design also cannot collect identity documents itself in a way that creates a fraud surface.

Accessibility (WCAG 2.2 AA) is a floor. Audience includes older drivers, drivers with disabilities, drivers with limited English proficiency. Multilingual support is appropriate.

The DMV experience varies dramatically by jurisdiction and time of day. The design must avoid overconfident promises ("come at 11 a.m., you'll be out by 12") in environments where the user's specific local office has its own dynamics.
