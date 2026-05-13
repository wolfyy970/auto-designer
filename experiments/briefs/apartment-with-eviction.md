# Apartment search for a renter with a past eviction — design exploration

## Situation

A person with an eviction record is looking for a new place to live. The eviction may have followed a job loss, a medical event, or a dispute with a prior landlord — sometimes a dismissed filing, sometimes a filing-in-error, sometimes a completed eviction-for-cause. The renter has since rebuilt: a job, references, money for a deposit. What reaches the landlord is a tenant-screening report — bundling rental, credit, employment, and criminal history into a score — on which the filing looks the same whether the case was won, lost, or dismissed.

## Complication

The renter pays application fees at every listing and discovers, sometimes days later, that they have been declined. They get back a vague "did not meet screening criteria" or no explanation at all. There is no path to find out which factor produced the decline, no path to contest a record they believe is inaccurate. They confront listing aggregators, screening companies whose reports they cannot see, bureau disputes that move slowly, and legal-aid offices whose capacity does not meet the volume.

## Users

The renter with the eviction record on their file. Landlords and screening companies are stakeholders, not the target — the design is for the renter with weeks, not months, and a stack of declined applications. Scope is "I'm looking" through "I've signed a lease."

## Cost

They need to be housed in the weeks they have, not the months a dispute would take. Fees stack up against a deposit they are trying to keep intact. Each decline arrives without enough information to act on, and the next listing goes up against the same report. The current housing is running out or already gone.
