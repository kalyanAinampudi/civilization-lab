# CIVILIZATION LAB
A toy society: 100 citizens, 25 homes, 5 farms, 3 shops, 4 offices, 1 hospital. **Not a prediction model.** Rule-based; no AI/LLM.

**Run:** open `index.html` in a browser (no server/network needed; `?seed=` not used, use the seed box). **Test:** `node test.js` (Node, no dependencies).

## Files
`sim.js` engine (edit the `R` object at the top for wages, prices, yields, infection, etc.) · `index.html` UI · `test.js` tests.

## How it works
- Ticks are fixed-step and independent of frame rate (12 ticks/s × speed; 60 ticks = 1 day). All randomness comes from one seeded PRNG stored in state.
- Rewind = rebuild from `seed` + timestamped action list (shocks, policy changes). Rewinding discards later actions and branch B. Branch = deep copy of A's state and action list; shocks/policies apply to A, B or both (target selector).
- Each tick a citizen decides by priority: admitted → seek treatment (ill and health<75, or health<40) → buy food (food≤1, can afford, a shop has stock) → work (open workplace, first 40 ticks of the day) → rest. Inspect any citizen for reasons.
- Daily: farms produce `workers×3×yield`; wages paid (farm/shop from building cash, office/hospital from treasury) with income tax to government; shops buy from nearest farm at 1; everyone eats 1 food (none → −10 health); unemployed fill vacancies.
- Illness spreads within 1.5 cells (doubled chance if health<50), drains health, can end randomly; hospital beds (policy) heal 3/tick up to 85.
- Floods close non-home buildings inside the radius (stock destroyed, jobs removed, reopen after 120 ticks) and halve food in flooded homes. Closure removes that building's jobs. Crop failure: 20% yield for 3 days. Outbreak: infects ~5.

## Accounting
Money is conserved: citizens + building cash + treasury is constant (estates of the dead go to treasury). Food: start + produced − eaten − lost (flood/death) = current. Treasury pays subsidies and public wages; if empty, public wages go unpaid and subsidies stop (logged).

## Simplifications
Straight-line movement (no roads); fixed prices; no rent, births, jobs-for-quality, or hospital running costs beyond wages; farm output appears from labour alone (the only source of new food); hospital treatment is free; wages go unpaid when employer cash runs out.

## Tested (node test.js, 8 tests)
Same seed+actions → identical hash; live play with mid-run actions equals replay; rewind snapshot equals replay at an earlier tick; money/food conservation over 700 ticks with shocks; closure removes only that building's jobs; flood affects only buildings in radius; health stays in [0,100]; hunger lowers health; disease spreads only near ill citizens; admissions never exceed beds.

## Known issues (verified 2026-10-26)
- Rewind slider fights you while the simulation is playing: pause first, then scrub.
- Economy balance is untuned: after ~5-6 days some farms cannot pay wages and shops sell out; the sim keeps running.
