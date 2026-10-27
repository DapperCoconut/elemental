# The Ten Isles — campaign design bible

The campaign overhaul. Ten tyrant monarchs hold ten isles; each isle is six element courts governed by
princes. You land on Brandmark (Fire Isle), break its six courts, storm the monarch's dungeon, sail on.
Free all ten and the Obsidian Pinnacle opens: sixty councilors, then the Obsidian King.

Code: `src/isles/`. This file is the source of truth for names, themes and status — keep the status
section current as work lands.

## Pillars

- **Open world.** Isles and courts are walked, never menued. Menus only for inventory, genes, the
  isle map / fast travel, and shop / dock / bakery counters (which are drawn in-world as overlays).
- **Every fight is its own fight.** Each of the 300 court encounters has a named, bespoke *gimmick*
  (an arena rule with art), never a stat remix of another. Hard mode adds a further, different 600.
- **Princes have two distinct phases (three on hard);** monarchs have four or more plus a dungeon.
- **Items do things,** not just stats — each runs a bespoke script.
- **Dialogue reacts.** Every NPC has lines per world state (default → quest stages → court freed →
  monarch fallen → revolt/anarchy).
- **Solo, duo or trio.** Co-op is online over the existing PeerJS rooms (later milestone); every
  system is written player-agnostic.

## Currencies

| | Earned from | Spent on |
|---|---|---|
| 🪙 Coins | encounters, princes, sea loot, quests, selling fish | shops, boats, docks, bakeries |
| 🗝️ Keys | each prince (1), monarch (3) | dungeon gates, sealed coves, the meteor |
| 🔮 Orbs | side quests (main source), princes, sea beasts | Gene trees |

## The world

| Isle | Element | Monarch | Courts (element — court — prince) |
|---|---|---|---|
| **Brandmark** | fire | King Ashgrave, the Brand-King | fire — Hearth Court — Prince Kindle · magma — Caldera Court — Prince Basalt · pressure — Boilerworks Court — Prince Gauge · gunpowder — Powder Court — Prince Fuse · plasma — Corona Court — Prince Flux · wax — Candlewick Court — Prince Tallow |
| **The Drowned Reach** | water | Queen Maresa Undertow | water — Tidewater Court — Prince Ebb · ice — Rimefast Court — Prince Hoarfrost · depths — Abyssal Court — Prince Lanternjaw · oil — Slickharbor Court — Prince Crude · ink — Inkwell Court — Prince Blot · cloth — Sailmaker's Court — Prince Hem |
| **Thornwild** | life | Empress Verdigra the Gardener | life — Bloom Court — Prince Petalis · growth — Spore Court — Prince Mycel · gluttony (Wood) — Heartwood Court — Prince Birchbark · hunt — Wildhunt Court — Prince Fang · marrow — Ossuary Court — Prince Sinew · gum (Savor) — Confection Court — Prince Saccharo |
| **Highspire** | air | King Aerion the Breath-Taxer | air — Galeward Court — Prince Zephyr · tempest — Stormeye Court — Prince Squall · gravity — Orbit Court — Prince Perigee · dream — Slumber Court — Prince Reverie · astra — Starfall Court — Prince Nova · myth — Fable Court — Prince Legend |
| **Bedrock Hold** | earth | Regent Gravane the Burier | earth — Stonehold Court — Prince Bould · crystal — Geode Court — Prince Facet · clay — Potter's Court — Prince Glaze · dune (Sand) — Dunesea Court — Prince Sirocco · metal — Forge Court — Prince Anvil · ruin — Rubble Court — Prince Wreck |
| **Voltreach** | electricity | Empress Ohmrine of the Grid | electricity — Dynamo Court — Prince Volt · technology — Circuit Court — Prince Byte · magnet — Lodestar Court — Prince Polar · radiation — Halflife Court — Prince Isotope · rubber — Bounce Court — Prince Sprocket · quantum — Superposition Court — Prince Both |
| **Fangmire** | slime (Venom) | Matriarch Nyxa Coilborne | slime — Fang Court — Prince Venin · death — Grave Court — Prince Mortis · shadow — Umbral Court — Prince Dusk · bind — Shackle Court — Prince Fetter · subterfuge — Cloak Court — Prince Whisper · string — Web Court — Prince Weft |
| **Lotterhaven** | fate | The Croupier-King Lucan | fate — Card Court — Prince Ante · fortune (Gold) — Treasury Court — Prince Bullion · sand (Time) — Clockwork Court — Prince Tock · memory — Remembrance Court — Prince Hindsight · psychic — Mind Court — Prince Gambit · conquest — War Court — Prince Banneret |
| **Choirholm** | sound | Maestro Cadenza | sound — Brass Court — Prince Fanfare · echo — Cavern Court — Prince Reprise · silence — Hush Court — Prince Mute · illusion — Masquerade Court — Prince Facade · passion (Devotion) — Cathedral Court — Prince Vesper · paper — Libretto Court — Prince Folio |
| **Solmara** | light | Despot Auriel of the Endless Noon | light — Noon Court — Prince Lumen · justice — Tribunal Court — Prince Verdict · soul — Lantern Court — Prince Wisp · magic — Arcane Court — Prince Sigil · creation — Workshop Court — Prince Artifex · chalk (Paint) — Mural Court — Prince Hue |

Then: **the Far Wastes** (endless sea), **the Obsidian Pinnacle** (60 councilors + the Obsidian King),
post-game **revolts / anarchy**, and the **meteor** that opens hard mode (the Fallen King).

---

## Brandmark — Fire Isle (vertical slice)

**The tyranny.** King Ashgrave brands every subject with his sigil. Each household must keep a *Tithe
Fire* burning in his name; a hearth found cold means the family is marched to the Kiln — the citadel
furnace on the isle's peak, where the unbranded are "rendered into fuel". His six children govern
the courts, each enforcing the tithe in their own way.

**The wanderer.** *Tamsin Coalwhistle*, a soot-streaked tinker with a pack of clattering pans, walks
whichever area you are in. She has the most dialogue in the isle: tutorial nudges, gossip about each
prince, reactions to every court you free, and a long arc after the King falls.

### Areas

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

### Encounters (5 per court) — name · foe (element) · gimmick

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

### Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Kindle | Hearth | *The Kept Flame* — tithe hearths planted round the room | *Every Hearth Answers* — the hearths chain fire lines between them | *The Royal Brand* — the sigil burnt into the floor stroke by stroke |
| Basalt | Caldera | *Bedrock* — basalt columns and lava channels | *The Caldera Wakes* — the floor caves into a rising lava lake | *Obsidian Heir* — armoured; cracks only to his own eruptions |
| Gauge | Boilerworks | *Pistons* — piston-fist combos, a pressure gauge on his back | *Redline* — overheating; vent him by striking his valve | *Meltdown* — the whole works detonating section by section |
| Fuse | Powder | *The Battery* — artillery and crawling barrages | *Last Stand* — a powder trail burning a maze through the room | *The Magazine* — the room is the bomb |
| Flux | Corona | *Corona* — arcing plasma loops | *Containment Failure* — split into twin plasma lobes | *Sunborn* — a small star with its own gravity |
| Tallow | Candlewick | *The Tall Candle* — dripping wax, wick lashes | *Burned Down* — a stub flooding the room with molten wax | *Last Light* — the room dark but for him |

### The monarch — King Ashgrave, the Brand-King

Dungeon **The Kiln**: three furnace halls (flame-jet timing, branding conveyor, bellows wind) each
ending in a warden fight, then the throne.
Phases: *The Tithe* (seated; vassals and ember tithes) → *The Brand* (steps down with the great
branding iron) → *The Kiln* (the throne room heats; cooling vents) → *The Ash Crown* (burns himself
to an ash form). Hard: *The Last Ember*.

---

## The Drowned Reach — Water Isle

**The tyranny.** Queen Maresa Undertow owns the tide. Twice a day she lets the sea into the low
streets, and every household must pay the *Dry Tithe* — a coin per head — to have its floor given
back. A house that cannot pay is left under. The drowned are not dead: they are kept, sleeping, in
the Undertow — her palace at the bottom of the maelstrom off the Abyssal trench — as "ballast for the
crown". Her six children govern the courts and collect the tithe each in their own way.

**Reaching it.** Brandmark's docks chart the Drowned Reach once King Ashgrave falls. The crossing is
a voyage (finite, ends in landfall at Brinehollow); after that the two ports sail to each other.
Its sea beast is **the Maelstrom Wyrm**, which drops the **Undertow Figurehead** Uber-upgrade.

**The wanderer.** *Odo Fathomsby*, a salvage diver who has been stuck inside his own brass helmet
for three years (the key went down with the ship). Muffled, cheerful, echoing; talks to his helmet
as "the Bell". Tutorial nudges about tides and fishing, gossip about every prince, reactions to each
court freed, and a long arc after the Queen falls (someone finally finds the key).

### Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `brinehollow` | Brinehollow | half-sunk harbour town on stilts: tide-marked walls, rope bridges, the tithe-house, lighthouse wreck | start of the isle (landfall), docks + boatwright, sea fishing, bakery *The Brine Oven*, general store, tackle, waystone, roads to three courts |
| `tidewater` | The Tidewater Court | tidal-flat town of stilt houses, tide pools, sandbars, the Tide Gauge clocktower | 5 encounters, Prince Ebb's lighthouse-manor, shop, quests, tide-pool fishing, bakery *The Low-Tide Larder* |
| `rimefast` | The Rimefast Court | a harbour frozen solid: iced-in ships, ice-fishing holes, an icicle palace, frost-cracked quays | ″ + ice-hole fishing |
| `abyssal` | The Abyssal Court | a sunken city inside a vast air bubble at the bottom of a trench: whale-rib arches, bioluminescent coral, anglerfish street-lamps | ″ + trench fishing (whalebone rod); the Undertow door on its north rim |
| `slickharbor` | The Slickharbor Court | oil-refinery port: black-tar docks, nodding pump-derricks, barrel stacks, cranes, rainbow slicks | ″ + oil-slick fishing |
| `inkwell` | The Inkwell Court | a scriptorium town on ink-black canals: squid pens, printing houses, censors' towers, drying decrees on lines — drawn in stark black, white and one blue | ″ + ink-canal fishing |
| `sailmaker` | The Sailmaker's Court | cliff-top sail lofts: huge sails drying on lines, rope-walks, looms, rigging masts, the Queen's half-sewn fleet | ″ + cove fishing |
| `undertow` | The Undertow (dungeon) | the drowned palace: flooded halls, coral pillars, sleeping drowned in bubbles, currents, sluices | gated by all 6 princes; 3 halls + 3 warden fights → the throne |

### Encounters (5 per court) — name · foe (element) · gimmick

**Tidewater Court**
1. *High Water Mark* · Tidecaller Marisol (water) — the tide creeps in across the floor and back
   out on a clock; wading in it slows you, and Marisol swims through it faster.
2. *Crab Season* · Crabber Dunwick (hunt) — crabs scuttle sideways across the arena; walk into one
   and it clamps on (slowed until you land a hit); Dunwick herds them at you.
3. *Rip Current* · Wader Silt (air) — rip channels open across the flats, dragging whoever stands
   in them out toward the breakers along one edge, where the surf pounds.
4. *Bell Buoy* · Buoy-Keeper Rook (sound) — a bell buoy rocks in the middle; strike it and its
   toll rings outward, stunning whoever the ring catches — but it takes time to swing back.
5. *Message in a Bottle* · Beachcomber Wren (fate) — bottles wash ashore; break one to read its
   note — a random boon or curse for whoever broke it, for a few seconds.

**Sailmaker's Court**
1. *Drying Lines* · Seamstress Tuck (cloth) — sheets hang on lines across the arena, blocking
   shots and sight; cut them down — but Tuck pegs up new ones.
2. *Rope Walk* · Ropewalker Hawser (string) — ropes stretched taut between posts; anyone who runs
   through one under tension snaps it, and the whip-crack hurts everyone near.
3. *Full Sail* · Sailwright Gale (air) — a great sail along one wall fills on each gust and blasts
   wind across the room; hide in the lee of the cleats.
4. *The Loom* · Weaver Shuttle (technology) — a loom shuttle races back and forth along rows,
   laying threads that stand as low walls; the weave closes into a maze, then is cut loose.
5. *Patchwork* · Quilter Mends (life) — patches are stitched onto the floor in two colours;
   standing on your colour heals, on hers stings; she sews faster than you, unless you rip hers up.

**Slickharbor Court**
1. *Slick* · Mopper Gunnel (oil) — rainbow slicks spread across the floor; on one you skate
   (fast, loose); she mops a path for herself.
2. *Gusher* · Riggerman Pitch (earth) — derrick heads tremble, then gush pillars of crude that rain
   back down as slicks.
3. *Tar Pit* · Tarrer Grime (slime) — pots of hot tar get poured in patches; step in one and you
   stick fast until you struggle free (or he gets a free hit).
4. *Spark Hazard* · Welder Sputz (electricity) — his torch throws sparks; a spark on oil lights it
   and the fire runs along the slick to every connected patch.
5. *Crane Hook* · Craneman Hoyle (magnet) — a dockside crane swings a heavy load on a hook in a
   pendulum through the yard and drops crates as cover.

**Inkwell Court**
1. *Redaction* · Censor Quill (ink) — black bars slam across the page; caught inside one you are
   *redacted*: unseen and unable to cast until it lifts.
2. *Squid Pens* · Squidherder Murk (water) — penned squids squirt ink clouds at whoever goes near;
   inside a cloud the world goes dark round you.
3. *Wet Ink* · Calligrapher Sumi (chalk) — every step leaves a wet footprint; the other fighter's
   prints are slick and sting; old prints dry and fade.
4. *Decree* · Herald Proclam (justice) — every few seconds a decree is read ("NO RUNNING", "NO
   STANDING STILL", "NO MAGIC"); whoever breaks it is fined in health.
5. *Inkblot Test* · Doctor Rorsch (psychic) — the arena is mirrored down the middle: every blot
   appears in both halves, and a hit landed while you stand mirror-opposite your foe counts double.

**Rimefast Court**
1. *Thin Ice* · Skater Brisa (ice) — heavy hits crack the ice where they land; cracked ice breaks
   into holes that dunk whoever slides in (frozen, hurt); the ice keeps your momentum.
2. *Icebreaker* · Captain Floe (metal) — an icebreaker's prow ploughs across the harbour in
   telegraphed lanes, splitting floes apart.
3. *Frostbite* · Trapper Tarn (fire) — a cold meter fills while you stand still or stand far from
   the braziers; full, you freeze solid for a moment; Tarn kicks the braziers out.
4. *Icicle Gallery* · Sculptor Vell (crystal) — icicles hang from the eaves (shadows below them);
   loud hits nearby shake them loose.
5. *Snow Forts* · Quartermaster Drift (gravity) — two snow forts; their walls stop shots and are
   chipped down by them; snowball heaps lie about to throw.

**Abyssal Court**
1. *The Lure* · Angler Mox (depths) — darkness; a glowing lure drifts about — under it you hit
   harder — but every few seconds the jaws behind it snap shut where it hangs.
2. *Crush Depth* · Diver Holloway (pressure) — the arena is banded by depth; the deeper band you
   stand in, the harder you hit and the faster pressure crushes you.
3. *Whale Fall* · Bonepicker Orla (marrow) — a whale skeleton lies across the room as cover;
   hagfish swarms boil out of it at whoever lingers inside the ribs.
4. *Bioluminescence* · Glowkeeper Siph (light) — each hit you take makes you glow brighter; deep
   eels lunge at the brightest fighter; glow fades with time.
5. *Leviathan's Shadow* · Tidepriest Varn (shadow) — an enormous shadow slides over the arena;
   anyone still inside it when it rises is swallowed (hurt) and spat out somewhere else.

### Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Ebb | Tidewater | *Slack Water* — calm; tide pools and rolling breakers | *Spring Tide* — the court floods and he surfs it | *King Tide* — the sea stands up as a wall |
| Hem | Sailmaker's | *Tailored* — needle volleys and measuring-tape lashes | *Unravelled* — he unspools into ribbons; sail-cloth ghosts | *The Shroud* — the room sewn shut round you |
| Crude | Slickharbor | *Gusher* — oil geysers and slicks | *Wildfire* — the slicks ignite; the refinery burns | *The Spill* — a tide of crude |
| Blot | Inkwell | *Fine Print* — bullets of lettering in paragraphs | *Spilled Well* — an ink flood; he is a silhouette in it | *Redacted* — the page blacked out line by line |
| Hoarfrost | Rimefast | *Rime* — ice lances and a freezing floor | *The Long Winter* — whiteout; his ice armour cracks | *Absolute Zero* — everything slows toward stillness |
| Lanternjaw | Abyssal | *The Lure* — dark room, the lure leads him | *Feeding Frenzy* — jaws everywhere, a swarm | *The Trench* — the floor falls away into the deep |

### The monarch — Queen Maresa Undertow

Dungeon **the Undertow**: three drowned halls (sluice timing — water jets; the current hall —
conveyors of current and a rotating eel; the flooded gallery — a floor that is only safe once its
sluice lever is pulled) each ending in a warden fight, then the throne.
Phases: *The Dry Tithe* (enthroned on a clam; the tide floods and drains on her clock) → *The
Undertow* (everything is dragged toward her; drowned courtiers rise) → *High Water* (the arena fills
but for floating platforms) → *The Maelstrom* (she becomes the whirlpool). Hard: *Dead Calm*.

---

## Systems

- **World** (`IsleWorldScene`): areas baked to a RenderTexture, y-sorted props, exits by walking off
  edges, POIs (NPCs, encounter champions, prince gate, shop, bakery, dock, fishing water, waystone,
  dungeon door, chests). E interacts. TAB inventory, G genes, M isle map.
- **Fights**: ArenaScene `isles` payload. Encounters = bot + `EncounterGimmick` (built on
  `BossToolkit`, npc as the "boss"). Princes/monarchs = `WorldBossDef`s registered in
  `src/isles/bosses`, picked up by `getWorldBossDef`. Results → `IslesResultScene` → back to the world.
- **Quests**: data-driven stages (talk / defeat / fish / deliver / visit / collect / cook), Orbs reward.
- **Genes**: per-element tree; nodes have levels → mastered → final-tier Enlightened nodes level
  forever at rising cost. Applied at match start through the item engine + cast hooks.
- **Items**: `ItemEffect` stats + a bespoke script per item. Charms (3 equipped, permanent), food
  (one-fight buffs from fish & bakeries), artifacts (from princes; one equipped).
- **Sea**: boats bought at docks (lost if sunk), upgrades, voyage minigame, Far Wastes endless with
  depth bands and sea beasts that grant isle Uber-upgrades.

## Code map

| Path | What |
|---|---|
| `src/isles/IslesTypes.ts` | the content contract — every shape content is written in |
| `src/isles/IslesSave.ts` | three save slots, currencies, `test(Cond)` |
| `src/isles/IslesRegistry.ts` | flattens every isle bundle into lookups; registers princes with `getWorldBossDef` |
| `src/isles/world/IsleWorldScene.ts` | the open world (areas, NPCs, champions, princes, POIs, hazards, HUD, minimap) |
| `src/isles/world/{WorldDialogue,Counters,Fishing,NpcArt}.ts` | dialogue box, shop/bakery/dock ledgers, fishing, people |
| `src/isles/fight/IslesFightKit.ts` | arena side: gimmicks, item scripts, genome cast rules (wired in ArenaScene via `isles` payload) |
| `src/isles/systems/{Quests,Genome}.ts` | quest progression; genes → ItemsKit (`isles-genome`) + loadout |
| `src/isles/scenes/*` | slot select, results, bag, genes, map/fast travel |
| `src/isles/sea/SeaVoyageScene.ts` | sailing + Far Wastes + the Magmaw |
| `src/isles/content/<isle>/` | content: `courts/<court>/` (one CourtBundle each), `isle/` (port, dungeon, monarch, wanderer, fish, rods), `genes/` |
| `.check-isles.mjs` | content validator — run after any content edit |

## Status

- 2026-10-26: engine complete (world, fights, quests, genes, fishing, bakeries, docks, sea voyages, map,
  bag, results); Fire Isle content built by parallel builders. Title hub: CAMPAIGN → Isles, CLASSIC →
  old campaign (remove once every isle ships).
- 2026-10-27: Fire Isle polish — **every side quest ends with a fight** (a `duel` stage: a quest-only
  foe written inline as an `EncounterDef`, standing in the world with a blue plate only while that
  stage is live; never counts toward a court's five; `defeat`/`prince` endings also count), **no
  element fights twice in one court** (champions and duel foes all distinct), and world champions /
  quest foes are drawn bare (`TownWalker` `{ bare: true }`: no player skin, no mastered silhouette).
  `.check-isles.mjs` enforces all three for every future isle.
- 2026-10-27: **the Drowned Reach (Water Isle) built** — same split as Brandmark (6 court builders + port +
  Undertow dungeon/Queen Maresa + genes), ~41k lines in `content/water/`, validator clean, build clean, not
  runtime-tested. Engine: **sailing between isles** — the dock's SAIL tab lists every charted isle; a
  crossing (`SeaVoyageScene` `dest: <isle id>`, 2600 m, kept to the upper two bands, coast rises at the
  end) lands you at that isle's mooring and attunes its port waystone. A route opens once you have landed
  there or the previous isle's monarch is down (`routeOpen` in the registry; cheat saves sail anywhere).
  Sea beasts are per isle (`BEASTS` in SeaVoyageScene; only isles you have landed on can surface theirs):
  the Maelstrom Wyrm drops the **Undertow Figurehead** (bow wave every few seconds). New contract bits:
  fishery kinds `ice`/`ink`/`abyss` (abyss needs `rod-whalebone`), weathers `spray`/`fog`/`bubbles`/`ink`,
  gate looks `ice`/`coral`/`sluice`, hats `diving`/`souwester`, conveyor `look: 'current'`. Port duel foes
  use `court: '<port id>'` with a floor registered under that key (the validator accepts any court id
  that has a floor).
- Not yet built: the other eight isles; the
  Obsidian Pinnacle + Obsidian King; revolts / anarchy / dark market; the meteor + hard mode (save has
  `hard`, fights already scale on it, but no 10-encounter courts or Fallen forms yet); online co-op.
