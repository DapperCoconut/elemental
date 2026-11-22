<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Bedrock Hold — Earth Isle

**The tyranny.** Bedrock Hold is a great banded mesa standing in the sea, quarried hollow from the
inside. It has no king: the Old King went down into his tomb forty years ago "to rest a while", and
his steward, Regent Gravane the Burier, rules "until the Old King wakes" — he sealed the tomb himself.
Gravane buries what he cannot rule. Every household owes the **Stone Tithe**: a weight of cut stone each
season, weighed on the great Tithe Scales at Quarrymouth. A household that falls short is *interred* —
walled up in a stone cell in the Sepulchre, the Regent's hold that he builds downward year on year,
"until the debt is quarried by others". He buries books, songs, street names and the old capital
itself. His six children govern the courts and collect the Tithe each in their own way.

**Reaching it.** Highspire's docks chart Bedrock Hold once King Aerion falls. The crossing lands at
Quarrymouth; after that every charted port sails to it. Its sea beast is **the Cragjaw** — a living
sea-stack, a leviathan whose back is a crag of basalt pillars with gulls nesting on it and a slab-toothed
jaw — which heaves its back to shrug *boulders* off at the boat (a shadow swells on the water first; they
smash where they land and settle as rocks); it drops the **Cragplate Ram** Uber-upgrade (ram rocks,
drift and mines aside unharmed; every eight seconds the plate hardens to shrug off the next blow).

**The wanderer.** *Gideon Flint*, an interred quarryman who dug his own way out of his cell with a
spoon and a lot of patience. He still wears the stone collar they sealed him in by (a ring of cut
stone round his neck, too heavy to be comfortable, impossible to take off without the Regent's mason),
a pick over his shoulder and a canary in a little cage he calls "the Duchess" and consults on
everything. Tutorial nudges (the Tithe Scales, sand and cavern fishing, the delver rod, the Hold's
lifts), gossip about every prince, reactions to each court freed, and a long arc after the Regent falls
(the cells are opened, the Old King's tomb is unsealed — it is empty but for a note — and Gideon's
collar is struck off by the mason who set it).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `quarrymouth` | Quarrymouth | a harbour cut into an old quarry face: terraced stone steps down to the water, block-cranes lowering stone onto barges, the great brass Tithe Scales on the quay, stonecutters' yards, a lift-cage up the cliff | landfall, docks + boatwright, sea fishing, bakery *The Hearthstone*, general store, tackle (delver rod), waystone, roads to three courts |
| `stonehold` | The Stonehold Court | a fortress town of boulders on the mesa's shoulder: houses carved inside standing stones, a menhir avenue, a giant's causeway of basalt hexagons, the rolling-stone road, the Tithe pit | 5 encounters, Prince Bould's boulder keep, shop, quests, quarry-pool fishing, bakery *The Flatbread Stone* |
| `potter` | The Potter's Court | a pottery town: bottle kilns smoking, clay pits and slip rivers, wheels in every doorway, terraces of drying pots, a terracotta army stood in rows (the Regent's tithe in fired soldiers) | ″ + slip-pond fishing |
| `dunesea` | The Dunesea Court | the mesa's rain-shadow, a sea of dunes: sand-ships on runners sailing the crests, the domes of a buried city poking through, a caravanserai, sandfalls, a palm oasis | ″ + sand fishing (delver rod) |
| `geode` | The Geode Court | a town inside a giant split geode: amethyst walls rising on every side, crystal spires, lapidaries' workshops, prisms throwing colour, the cutting-house | ″ + crystal-pool fishing |
| `forge` | The Forge Court | a foundry town in the iron hills: blast furnaces, ore carts on rails, trip-hammers, slag heaps glowing, chain bridges, the bell-casting pit | ″ + quench-pond fishing |
| `rubble` | The Rubble Court | the old capital, buried by the Regent: half-sunken towers, a toppled colossus, broken aqueducts, landslides, scavengers in the ruins; the Sepulchre's sealed gate cut into the mountain face (north) | ″ + cavern fishing (delver rod) down a collapsed well; the Sepulchre door |
| `sepulchre` | The Sepulchre (dungeon) | the Regent's hold, dug downward: tithe shafts and stone lifts, interment galleries (walls of sealed cells, faces at the slits), the crypt of the Old King | gated by all 6 princes; 3 halls + 3 warden fights → the throne at the bottom |

## Encounters (5 per court) — name · foe (element) · gimmick

**Stonehold Court**
1. *Rolling Stone* · Roller Cobb (earth) — a great round boulder rolls round the yard, rebounding off
   the walls and gaining speed with every bounce; strike it to bat it the other way; it flattens whoever it meets.
2. *Ley Lines* · Dowser Hazel (magic) — glowing ley lines run between standing stones; standing on a line
   speeds your cooldowns; walk into a stone to shove it and the lines re-route round it.
3. *Causeway* · Columnar Fingal (magma) — the floor is basalt hexagons rising and sinking in rolling
   waves; a risen column is high ground (your shots pass over low ones); a column rising under you throws you.
4. *Tithe Scales* · Weigher Ballast (gravity) — a great balance, one pan each; every hit you take drops a
   tithe-stone into your pan; the heavier side is slowed and takes more; strike your pan's chain to spill it.
5. *Landslide* · Scree-Runner Talus (hunt) — the yard is a slope; scree slides downhill all the time,
   carrying fighters with it; boulders tumble down marked lanes; the high ground is safe but crumbles.

**Potter's Court**
1. *Potter's Wheel* · Thrower Wenna (clay) — the arena is a turning wheel that spins faster as the fight
   goes on; near the rim you are flung outward; the still centre throws up a pot wall that closes in.
2. *Kiln Firing* · Kilnwright Saggar (fire) — kilns line the walls and fire one by one (the door glows
   first), jetting heat across a lane; anyone wet with slip is baked hard — armoured, but slowed.
3. *Terracotta Army* · Sculptor Qin (conquest) — ranks of clay soldiers stand still; each hit landed makes
   them march one rank toward whoever was struck; they spear whoever they reach; two hits shatter one.
4. *Slip Casting* · Moulder Grogg (slime) — moulds on the floor fill with slip and set on a timer; whoever
   stands in one as it sets is cast in clay (held until struck free); lure the foe in.
5. *Glaze Run* · Glazier Celadon (chalk) — glazes drip in coloured pools: celadon slows, cobalt hastens,
   oxblood burns; walk two together and they mix into a new glaze with its own effect.

**Dunesea Court**
1. *Sand-Ships* · Skipper Barca (air) — sand-ships tack across the dunes in lanes (sails on the horizon
   first); step aboard one and it carries you across, firing a broadside out of its side.
2. *Sandworm* · Wormcaller Shai (sound) — a worm swims under the sand toward whoever is moving most
   (footsteps ripple); stand still and it loses you; it erupts under the loudest fighter.
3. *Mirage* · Trader Faraj (illusion) — the sun builds heat in whoever is out of shade; full heat and you
   are dazed; oases cool you — but some are mirages that vanish as you reach them, and only the shimmer tells.
4. *Quicksand* · Sinker Ammon (death) — quicksand pools spread and drift; inside one you sink deeper each
   second (slower, then stuck); dashing sinks you faster; walking out slowly frees you.
5. *Buried Treasure* · Digger Petra (fortune) — mounds rise in the sand; stand on one to dig it up — an
   urn of power or a scorpion nest — while the wind re-buries the rest.

**Geode Court**
1. *Refraction* · Lapidary Prism (light) — sunlight through a crack in the geode splits through prisms
   into coloured beams across the floor; strike a prism to turn it; a beam burns whoever it crosses.
2. *Druse* · Grower Druse (growth) — wherever a hit lands, crystal starts to grow; growing crystal blocks
   feet and shots, and at full size it shatters in a burst of shards.
3. *Resonance* · Tuner Quartz (echo) — tuning-crystals stand about; strike one and it hums; two humming
   at once shatter the air in the line between them.
4. *Cracked Geodes* · Breaker Vug (ruin) — closed geodes lie on the floor; crack one to take the gem
   inside (a short power); every third crack shakes the cavern and drops stalactites on shadows.
5. *Piezo* · Sparker Tourmaline (electricity) — piezo crystals spark when stepped on and store the charge;
   a full crystal arcs to the nearest fighter who is not standing on crystal.

**Forge Court**
1. *Ore Carts* · Railhand Tilda (technology) — ore carts race round rails through the yard; strike a
   junction lever to switch the track; a cart bowls over whoever is on the rails.
2. *Crucible* · Pourmaster Brannoc (magma) — a crucible swings over the yard and pours molten iron down
   channels; poured iron cools into a wall that stops shots, then cracks apart.
3. *Quench* · Temperer Hild (water) — hot ingots lie about; carry one and your hits burn but it burns you
   too; dunk it in the quench trough for a blast of steam round the trough.
4. *Scrap Magnet* · Scrapper Rusk (magnet) — an electromagnet crane sweeps the yard; whoever it passes
   over is lifted and dropped, and the scrap it lets go of flies out as shrapnel.
5. *Strike While Hot* · Journeyman Cinder (fire) — every hit landed heats you; white-hot, your hits deal
   double but you burn; cool off at the slack-tub; the foe stokes himself on purpose.

**Rubble Court**
1. *Collapse* · Demolisher Krell (gunpowder) — pillars hold up a cracked ceiling; hit a pillar to crack
   it; a felled pillar topples along its length; with too few left, the ceiling caves in over that side.
2. *Sinkhole* · Delver Moth (depths) — the ground gives where anyone stands too long; sinkholes open and
   their edges crumble outward; fall in and you drop, hurt, and climb out at the rim.
3. *Aqueduct* · Watersmith Lev (water) — the broken aqueduct overhead spills waterfalls that wash
   fighters along; strike an arch and it crumbles, moving the fall.
4. *Lost Procession* · Ghostwarden Elegy (death) — a procession of the buried capital's ghosts marches
   across the ruins; inside the column you are hidden but carried; touch the lantern-bearer and be cursed.
5. *Colossus* · Sculptor Pell (myth) — the toppled colossus's stone head lies in the yard; its eyes wake
   and track whoever last struck it, burning a beam along the ground; its fallen hand slaps down on shadows.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Bould | Stonehold | *Rockslide* — curls into a boulder and caroms round the room, shedding scree | *Standing Stone* — plants himself, unmovable; raises menhir walls, earth-shock rings | *Avalanche* — the mountain comes down in rolling waves from the top edge; he rides them |
| Glaze | Potter's | *On the Wheel* — spins on a wheel throwing pots that burst into shards and slip | *Fired* — walks into the kiln and comes out glazed: a hard shell, kiln blasts, glaze drips | *Kintsugi* — shattered, his pieces fight apart and rejoin, seams of gold |
| Sirocco | Dunesea | *Desert Wind* — rides the sandstorm: scouring sand lanes, dune waves rolling across | *Sand Burial* — sinks into the sand and circles like a shark (a fin), a quicksand vortex | *Glass Desert* — lightning fuses the sand into glass shards that shatter |
| Facet | Geode | *Brilliant Cut* — beams that bounce off crystal panels round the room | *Cluster* — grows crystal copies of himself that shatter in shard bursts | *Flawless* — only a hit from behind cracks him; he turns to face you |
| Anvil | Forge | *Hammer and Tongs* — great hammer slams with shockwaves, tong grabs | *Molten Core* — white-hot: molten pours and a rain of ingots | *Tempered* — quenched steel: impervious except while glowing |
| Wreck | Rubble | *Wrecking Ball* — swings a wrecking ball on a chain in great arcs | *Demolition* — blows the ruin's last towers: falling walls and masonry | *Ruin of Ages* — time-lapse decay: the floor crumbles tile by tile |

## The monarch — Regent Gravane the Burier

Dungeon **the Sepulchre**: three halls dug downward (the Tithe Shafts — stone lifts rising and falling
in deep shafts, tithe-blocks dropped from above on shadows; the Interment Galleries — walls of sealed
cells, faces at the slits, stone doors grinding shut ahead and behind on a rhythm; the Old King's Crypt —
sarcophagi in rows whose lids slide open, dust that buries the floor) each ending in a warden fight, then
the throne at the very bottom: the Regent sits on the Old King's sealed sarcophagus.
Phases: *The Tithe* (he weighs fighters: stone gathers on you as tithe-weight, slowing; shed it by striking
his scales) → *Interment* (walls rise to seal fighters in stone cells; break out) → *Landslide Throne* (the
hold quakes; the ceiling falls in sections; he burrows and surfaces) → *Buried Alive* (earth pours in
from the edges and the safe ground shrinks). Hard: *The Old King Wakes* — the sarcophagus opens; it is
empty, and Gravane, in a fury, buries himself in the earth he stole and fights as the mountain.
