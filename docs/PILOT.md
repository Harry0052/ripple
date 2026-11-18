# Ripple pilot plan

No pilot has been run. This file is the plan, not a result. The product is not cleared to ship to the public on the strength of this repository alone.

## Who

10 to 30 people who already share practical chores: students splitting bills, people packing for a trip, or a small creator who wants to hand someone a recipe instead of a screenshot. Do not recruit by implying the product pays anyone, files forms, or signs in to other sites.

## What they are asked to do

1. Open the seeded “Split a bill fairly” recipe with no account.
2. Read the steps and permissions.
3. Run it with numbers they choose, after allowing every step.
4. Refresh and find the same result under My Runs.
5. Optionally create an account and publish one harmless recipe of their own, then send the public link to a second person.
6. The second person previews it and runs it only if they want to. They must not be able to open the first person’s run.

Do not ask anyone to enter a password they use elsewhere, a payment card, or a government identifier. The demo recipes do not need those.

## What to record

From the database, not from memory:

- Verified completed runs per person in seven days (`metric_events.name = 'run_completed'`).
- Whether a recipient of a public link completed a run.
- Whether a creator published a second version.
- Reports filed, and whether the reporter could still use the product.
- Any case where a person saw another person’s inputs or outputs. That is a stop.

## Decision after the pilot

- **Continue privately** only if at least 20% of the first-time recipients complete the demo task and at least a few people share a link without being prompted again. That threshold is the brief’s early invalidation signal, not a growth forecast.
- **Change the format** if people finish a run but do not understand the permission list, or if they expected the link to log in to another website.
- **Stop** if a private run is exposed, a published version changes an old run, or the only successful tasks depend on a manual workaround.

Until those observations exist, the decision is: **do not launch**. Keep the app available for the pilot, with the disabled integrations still visibly off.
