<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Highspire — Air Isle

**The tyranny.** Highspire is one needle of rock standing out of the sea and up through the clouds, its
towns clinging to ledges all the way up. King Aerion the Breath-Taxer owns the air. Every chest on the
isle wears a brass *breath-meter* over the heart, and every breath drawn above the cloud line is
metered and taxed. A household that falls behind is *becalmed*: the King's collectors cork their breath
into glass bottles and carry it up to the Lung — his windmill-palace on the summit, whose great bellows
inhale the isle's air — and the debtor is laid down to sleep, barely breathing, until the debt is
"worked off" by others. His six children govern the courts, each collecting the Breath Tax in their own way.

**Reaching it.** Thornwild's docks chart Highspire once Empress Verdigra falls. The crossing lands at
Windlass; after that every charted port sails to it. Its sea beast is **the Skyray** — a manta the size
of a sail-field that leaps clear of the sea and glides over the boat, its shadow first — whose wake
throws lines of *gust fronts* across the water (bands of wind that shove the boat sideways); it drops
the **Windcatcher Sail** Uber-upgrade (every few seconds the sail fills: a burst of speed forward, and
any spit or shot near the boat is blown back the way it came).

**The wanderer.** *Barnaby Tuft*, a balloonist whose balloon was confiscated for unpaid air — the
collectors emptied it into bottles in front of him. He walks the isle with the empty wicker basket
strapped on his back like a pack, goggles on, the deflated silk trailing behind him on a rope, and
talks to his altimeter as "Old Needle". Tutorial nudges (wind, cloud fishing, the skyline rod, the
cargo lift), gossip about every prince, reactions to each court freed, and a long arc after the King
falls (the bottles in the Lung are broken open, the freed breath fills his balloon, and he goes up).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `windlass` | Windlass | a cliff harbour at the foot of the spire: stone quays cut into the rock, the great cargo windlass and its lift cage running up the cliff, kite-market stalls, gull roosts, the breath-meter house | landfall, docks + boatwright, sea fishing, bakery *The Rising Loaf*, general store, tackle (skyline rod), waystone, roads to three courts |
| `galeward` | The Galeward Court | windmill town on the spire's windward shoulder: rows of windmills, weathervanes, kite lines, rope bridges over the cloud sea, the toll-bellows | 5 encounters, Prince Zephyr's weathervane manor, shop, quests, cloud-edge fishing, bakery *The Millstone* |
| `slumber` | The Slumber Court | the town where the becalmed sleep: feather-bed streets, dimmed lamp-posts, sleepwalkers, dream-sheep grazing on clouds, the lullaby bell tower | ″ + Lake of Nod fishing |
| `fable` | The Fable Court | a storybook town: houses that are huge pop-up books, a beanstalk climbing into the clouds, a chained dragon's tower, a giant's boot, the censors' bonfire of banned stories | ″ + castle-moat fishing |
| `orbit` | The Orbit Court | a brass orrery town on floating islets circling a heavy black lodestone moon: ring-streets, tether chains, gravity that tilts | ″ + moonpool fishing (a floating ball of water) |
| `stormeye` | The Stormeye Court | a walled town in the calm eye of a storm that never ends: lightning rods, rain cisterns, the barometer tower, storm walls with the gale raging past them | ″ + cistern fishing |
| `starfall` | The Starfall Court | the summit above the clouds in permanent night: an observatory city, telescopes, star charts, fallen-star craters, constellation mosaics | ″ + starpool fishing (skyline rod); the Lung door at its peak (north) |
| `lung` | The Lung (dungeon) | the King's windmill-palace: bellows halls, the bottling floor where breath is corked, vane galleries, debtors asleep in rows | gated by all 6 princes; 3 halls + 3 warden fights → the throne |

## Encounters (5 per court) — name · foe (element) · gimmick

**Galeward Court**
1. *Crosswind* · Windsock Tilly (air) — the weathervane swings and calls the wind's direction; everything
   — fighters and shots — drifts downwind; shots fired upwind crawl, downwind ones fly far and hit hard.
2. *Kite Fight* · Kiteflyer Oriel (string) — fighting kites fly on glass-coated lines from posts round the
   yard; a line cuts whoever runs through it; stand at a post to take its kite and swing its line into her.
3. *Windmill* · Miller Thresh (earth) — a giant windmill's sails sweep the yard as four turning beams; the
   mill's speed follows the gusts; grain sacks are cover until a sail splits them.
4. *Breath Meter* · Meter-Man Puffin (technology) — both fighters wear breath-meters that drain as you
   attack and dash; empty, you are winded (slow, no casting) until you gasp; breath bottles roll about
   to refill — Puffin collects them for the King.
5. *Updraft* · Glider Swift (light) — updraft vents throw whoever steps on one high into the air
   (untouchable while aloft) and drop them where they steer, landing in a slam that hurts everyone near.

**Slumber Court**
1. *Counting Sheep* · Shepherd Wooly (life) — dream-sheep leap a fence across the yard one by one; every
   sheep that clears it adds drowsiness to whoever is nearest; at five you doze off; strike sheep to wake up.
2. *Sleepwalk* · Somnambulist Nod (psychic) — every so often both fighters sleepwalk: legs follow a dotted
   path drawn ahead of them (you can still cast); paths can be read, and Nod steers his through you.
3. *Bad Dream* · Dreadmonger Mara (shadow) — the yard flips between DREAM and WAKING; damage dealt in the
   dream is held, not dealt, and lands all at once on waking — whoever took more in the dream wakes screaming (stunned).
4. *Pillow Fight* · Pillowmaker Down (cloth) — pillows lie about; walk into one and it flies ahead and
   bursts in a feather drift (knockback); inside a drift you are cushioned but slow.
5. *Lullaby* · Nanny Hush (silence) — a music box plays in the middle; while it plays everyone slows,
   deeper with every bar; strike its key to stop it; Hush winds it back up.

**Fable Court**
1. *Beanstalk* · Beanboy Jem (growth) — beanstalks sprout; stand at the root to climb — up top you are safe
   and your shots rain down — but the giant's boot stomps a stalk on a shadow telegraph, dropping whoever is on it.
2. *Golden Goose* · Goosegirl Hen (fortune) — the goose lays golden eggs; each egg carried adds to your
   damage but slows you; drop them by being hit; the goose honks and charges whoever carries most.
3. *Huff and Puff* · Wolf Lupo (air) — three houses (straw, sticks, brick) stand as cover; the wolf's huff
   blows down the next one and blasts anyone behind it across the yard.
4. *Mirror, Mirror* · Stepmother Gilt (illusion) — on the mirror's question the fairest — whoever has more
   health — is named and cursed (takes double until the next question); poisoned apples roll at them.
5. *Dragon's Hoard* · Sir Galahand the Errant (metal) — a sleeping dragon curls round its hoard; gold
   picked up hits harder; noise (hits) near its head wakes it to breathe a fire cone at whoever holds the most gold.

**Orbit Court**
1. *Orrery* · Clockmaker Tycho (technology) — brass planets ride long arms round the arena's sun; the arms
   sweep the floor and the planets slam whoever they meet; the sun-switch reverses them.
2. *Tidal Lock* · Moonkeeper Selene (gravity) — a small moon crosses the room on a long ellipse; its pull
   drags fighters and shots toward it, yanking hard at perigee.
3. *Zero-G* · Spacer Lofty (rubber) — gravity switches off in marked zones; inside, momentum carries you
   and you bounce off the walls; you cannot stop until you drift out.
4. *Slingshot* · Courier Apsis (hunt) — slingshot rings hang about; pass through one and you are flung
   along its arc at speed, bowling over anyone in the path.
5. *Event Horizon* · Archivist Null (shadow) — a black hole in the middle grows each time damage is dealt;
   anything inside its horizon is crushed; it shrinks back when the fighting stops for a breath.

**Stormeye Court**
1. *Lightning Rod* · Rodsmith Volta (electricity) — lightning gathers (crackling telegraph) and strikes
   whoever stands farthest from any rod; a rod that is struck rings out a shock around itself.
2. *Hailstorm* · Hailwarden Grue (ice) — hail falls in shadowed patches; it heaps into slippery mounds that
   stop shots, then melts.
3. *Eye of the Storm* · Stormchaser Cyra (tempest) — the arena is ringed by the stormwall; the calm eye
   drifts; outside the eye you are battered and carried round the circle.
4. *Raincatcher* · Cisternkeeper Mull (water) — rain fills cisterns on the walls; a full cistern tips and
   sends a flood wave across the yard in the way it faces; turn a cistern by striking it.
5. *Thunderclap* · Clapper Boom (sound) — each flash is followed by its thunder: a shockwave rolling out
   from the strike at the speed of sound — count it in — stunning whoever it catches.

**Starfall Court**
1. *Shooting Stars* · Stargazer Vega (astra) — stars streak in from the edges along drawn trails; where
   they land they leave stardust craters that empower whoever stands in them.
2. *Constellation* · Cartographer Ursa (light) — stars are set in the floor; touch them in order to draw
   a constellation; a finished figure fires its shape at the foe; Ursa races you for them.
3. *Telescope* · Astronomer Galilee (crystal) — the great telescope's lens sweeps the yard; whoever it
   focuses on is magnified — bigger, hitting harder and taking more.
4. *Eclipse* · Umbra the Eclipser (soul) — the moon's disc slides across; inside its shadow you are hidden
   and hushed; at totality the corona flares, burning everyone outside the shadow.
5. *Dying Star* · Keeper Betel (plasma) — a dying star in the middle breathes in three beats: it swells
   (burns those near), collapses (drags all inward), then novas (a ring outward to dodge).

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Zephyr | Galeward | *Fair Wind* — glides on gusts; kite-blade volleys and crosswind lanes | *Gale Force* — a whirlwind body; the room turns round him | *Becalmed* — the air is sucked out; breathe at the bottles |
| Reverie | Slumber | *Sweet Dreams* — sleepy bubbles and sheep stampedes | *Night Terror* — the dream sours: nightmare hands reach from the floor | *Never Wake* — a dream inside a dream: the fight loops |
| Legend | Fable | *Once Upon a Time* — a storybook: each page turned is a chapter attack | *The Moral* — the book slams shut; its characters leap out | *Happily Never After* — the story rewrites itself mid-fight |
| Perigee | Orbit | *Satellite* — moons orbit him; gravity wells | *Freefall* — "down" turns from wall to wall | *Singularity* — he collapses into a point that eats the light |
| Squall | Stormeye | *Gathering Clouds* — rain bands, lightning forks on a delay | *The Eye Closes* — the stormwall shrinks; tornadoes | *Perfect Storm* — every weather at once |
| Nova | Starfall | *Starlight* — constellation lines snap shut | *Red Giant* — he swells, his corona burns | *White Dwarf* — tiny, dense and blindingly fast |

## The monarch — King Aerion the Breath-Taxer

Dungeon **the Lung**: three halls (the Bellows Hall — giant bellows that blow and draw on a rhythm; the
Bottling Floor — conveyors of corked breath, bottles that burst into gusts when broken; the Vane
Gallery — great weathervanes turning as blades between wind tunnels) each ending in a warden fight,
then the throne in the hub of the palace's sails.
Phases: *The Tax* (enthroned on the bellows; the room's air thins and every fighter's breath-meter
drains) → *The Inhale* (he draws everything toward his mouth) → *Hurricane Crown* (the palace sails turn;
tornadoes) → *Breathless* (he exhales all the stolen breath at once; the bottles shatter). Hard: *Vacuum*.
