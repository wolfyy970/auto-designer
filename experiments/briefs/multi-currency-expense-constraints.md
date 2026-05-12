SOX compliance applies to publicly-traded companies in the US. Expense data must be auditable, retained per regulatory schedule, and traceable. The architecture cannot opt out of this.

Tax treatment varies across jurisdictions. International business-travel expense interacts with tax rules for both the employee and the employer; the design must not produce records that compromise tax compliance.

Receipt-retention rules vary: IRS guidance for US, equivalent rules in other jurisdictions. The design must produce records that meet these requirements.

FX-rate sourcing must be transparent and consistent. Companies typically use either the rate on the date of transaction (per cards) or a corporate-rate (per policy). The design must hold this distinction.

Integration with existing expense systems (Concur, Ramp, Brex, Emburse) is a hard requirement for most enterprise customers. Greenfield architectures are easier but addressable market is smaller.

PII (the traveler's identifying information) and PCI (card data) are regulated. The design must respect both.

Accessibility (WCAG 2.2 AA) is a floor. Audience includes travelers with disabilities; the in-trip capture experience must work with assistive technology.
