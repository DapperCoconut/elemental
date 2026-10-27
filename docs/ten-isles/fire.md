<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Brandmark — Fire Isle (vertical slice)

**The tyranny.** King Ashgrave brands every subject with his sigil. Each household must keep a *Tithe
Fire* burning in his name; a hearth found cold means the family is marched to the Kiln — the citadel
furnace on the isle's peak, where the unbranded are "rendered into fuel". His six children govern
the courts, each enforcing the tithe in their own way.

**The wanderer.** *Tamsin Coalwhistle*, a soot-streaked tinker with a pack of clattering pans, walks
whichever area you are in. She has the most dialogue in the isle: tutorial nudges, gossip about each
prince, reactions to every court you free, and a long arc after the King falls.

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `emberport` | Emberport | black-sand harbour: piers, nets, lighthouse, market | start, docks + boatwright, fishing pier, bakery *The Scorched Loaf*, general store, waystone, roads to every court |
| `hearth` | The Hearth Court | terraced chimney town, ash cobbles, glowing windows, branded doors | 5 encounters, Prince Kindle's manor, court shop, quests |
| `caldera` | The Caldera Court | inside a crater: obsidian, crusted lava rivers, basalt columns | ″ + lava fishing |
| `boilerworks` | The Boilerworks Court | steam factory yard: pipes, gauges, conveyors, vents, cooling ponds | ″ + cooling-pond fishing |
| `powder` | The Powder Court | fortified magazine town: ramparts, cannons, sandbags, a firing range | ″ |
| `corona` | The Corona Court | glass-fused plateau under a captive sun-lamp, plasma conduits | ″ |
| `candlewick` | The Candlewick Court | a city of melting candles, wax streets, taper cathedral, apiaries | ″ + wax-pond fishing, bakery |
| `kiln` | The Kiln (dungeon) | citadel interior: furnace halls, conveyor of brands, flame jets | gated by all 6 princes; 3 rooms + 3 warden fights → the throne |

## Encounters (5 per court) — name · foe (element) · gimmick

**Hearth Court**
1. *Ember Tithe* · Tithe-Taker Brask (fire) — tithe embers drop on the floor; each one collected
   stacks damage for whoever grabbed it; Brask beelines for them.
2. *Soot Season* · Sweep-Captain Mottle (air) — soot clouds drift through; inside one you are slowed
   and your view dims; Mottle blows them at you.
3. *Three Brands* · Brandwright Ostra (fire) — her hits brand you (3 pips); the third brand
   detonates. Quench troughs on the walls wash brands off.
4. *Curfew* · Lamplighter Fenn (light) — the room is dark but for four lamps; Fenn snuffs them,
   you relight them by touch; he hits harder in the dark.
5. *Keeper of the Hearth* · Hearthwarden Gilda (earth) — the great hearth in the middle feeds
   whoever holds its ring (regen + damage) and flares outward on a clock.

**Caldera Court**
1. *Crust Walk* · Crustwalker Hekla (magma) — the floor is crust tiles that crack under anyone who
   lingers, then run as lava for a few seconds.
2. *Eruption Clock* · Ventkeeper Surtr (earth) — three vents count down and erupt in sequence,
   raining boulders that stay as cover.
3. *Cooling Rain* · Rainmaker Tull (water) — wandering rainclouds cool whoever is under them
   (armour, slow); outside, lava pools spread.
4. *Magma Tide* · Tidecaller Lavra (magma) — a lava tide sweeps the floor from one side and
   recedes; basalt islands are the only dry ground.
5. *Pumice Brawl* · Rhyo the Pumice Golem (clay) — bouncing pumice boulders ricochet round the
   room and shove whoever they hit.

**Boilerworks Court**
1. *Valve Race* · Valvejack Pinter (pressure) — four valves; the gauge fills and every pipe blasts
   except those whose valve *you* turned last.
2. *Conveyor Floor* · Foreman Brindle (metal) — conveyor lanes carry both fighters and reverse on
   the klaxon.
3. *Steam Bath* · Scalder Mira (water) — drifting steam banks make anyone inside take more damage.
4. *Piston Press* · Press-Hand Dunk (earth) — pistons slam in rows behind shadow telegraphs.
5. *Overpressure* · Kessel the Boiler-Heart (pressure) — every hit landed builds room pressure;
   at the top the room blasts everyone *not* on the sliding relief grate.

**Powder Court**
1. *Keg Alley* · Keg-Roller Bram (gunpowder) — kegs roll in; kick them by walking into them,
   they roll and burst on whoever they reach.
2. *Cannon Ridge* · Gunnery-Sergeant Hask (hunt) — wall cannons fire down the row of whoever
   stands in it; herd her into the lanes.
3. *Twenty Paces* · Duelist Corvette (gunpowder) — the room calls DRAW!: a short window of triple
   damage, then a slow reload where everyone deals half.
4. *Smoke Screen* · Smoke-Runner Kit (shadow) — smoke grenades leave clouds that hide him.
5. *Minefield Drill* · Sapper Ironsides (earth) — buried mines; a sweep periodically reveals
   them; both fighters can trip them.

**Corona Court**
1. *Captive Sun* · Sunwarden Helia (light) — a small sun orbits the room; its warm band boosts
   damage, its core burns.
2. *Arc Pylons* · Pylon-Keeper Ampere (electricity) — pylons fire beams between pairs in a lit
   sequence.
3. *Containment Breach* · Specimen Q-7 (plasma) — hitting Q-7 builds its instability; at the peak it
   goes nova — be far away.
4. *Flare Weather* · Flare-Chaser Zenith (fire) — a solar flare meter fills; only the shade of the
   standing stones is safe when it breaks.
5. *Magnetic Bottle* · Torus the Bottle-Keeper (magnet) — the arena wall is a plasma bottle that
   breathes in and out.

**Candlewick Court**
1. *Drip* · Chandler Brigid (wax) — wax drips land as slowing puddles, then set into wax blocks.
2. *Vigil* · Vigil-Keeper Amonet (light) — candles ring the room; lit ones heal whoever stands by
   them; Amonet blows them out, you relight them.
3. *Hive Mind* · Apiarist Hum (life) — hives in the corners loose swarms on whoever last struck a
   hive.
4. *Both Ends* · Wickling Dross (fire) — both fighters burn down slowly; damage rises as health falls.
5. *Effigies* · Effigist Morrow (illusion) — wax effigies of Morrow stand about; striking one
   wounds him, but they melt into puddles that slow.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Kindle | Hearth | *The Kept Flame* — tithe hearths planted round the room | *Every Hearth Answers* — the hearths chain fire lines between them | *The Royal Brand* — the sigil burnt into the floor stroke by stroke |
| Basalt | Caldera | *Bedrock* — basalt columns and lava channels | *The Caldera Wakes* — the floor caves into a rising lava lake | *Obsidian Heir* — armoured; cracks only to his own eruptions |
| Gauge | Boilerworks | *Pistons* — piston-fist combos, a pressure gauge on his back | *Redline* — overheating; vent him by striking his valve | *Meltdown* — the whole works detonating section by section |
| Fuse | Powder | *The Battery* — artillery and crawling barrages | *Last Stand* — a powder trail burning a maze through the room | *The Magazine* — the room is the bomb |
| Flux | Corona | *Corona* — arcing plasma loops | *Containment Failure* — split into twin plasma lobes | *Sunborn* — a small star with its own gravity |
| Tallow | Candlewick | *The Tall Candle* — dripping wax, wick lashes | *Burned Down* — a stub flooding the room with molten wax | *Last Light* — the room dark but for him |

## The monarch — King Ashgrave, the Brand-King

Dungeon **The Kiln**: three furnace halls (flame-jet timing, branding conveyor, bellows wind) each
ending in a warden fight, then the throne.
Phases: *The Tithe* (seated; vassals and ember tithes) → *The Brand* (steps down with the great
branding iron) → *The Kiln* (the throne room heats; cooling vents) → *The Ash Crown* (burns himself
to an ash form). Hard: *The Last Ember*.
