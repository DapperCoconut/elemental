<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Thornwild — Life Isle

**The tyranny.** Empress Verdigra the Gardener tends Thornwild as one great garden, and her subjects
are its plants. Every household owes the *Bloom Tithe* — a measure of whatever it grows, bakes, hunts
or breeds — weighed at each season's turn. A family that comes up short is *pruned*: taken to the
Glasshouse, her palace of iron and glass on the crown of the Heartwood, and grafted into her living
hedges as topiary, still breathing, "until they learn to flower". Her six children govern the courts
and keep the garden "tidy", each in their own way.

**Reaching it.** The Drowned Reach's docks chart Thornwild once Queen Maresa falls. The crossing lands
at Mossgate; after that every charted port sails to it. Its sea beast is **the Brambleback** — a sea
turtle the size of a hill with a thorn forest on its shell — which sheds lines of floating bramble
mats and drops the **Greenwood Keel** Uber-upgrade (the hull regrows a plank every ten seconds, and
thorns burst out of it whenever it is struck).

**The wanderer.** *Wendeline Burrows*, a beekeeper in a veiled hat who has walked the isle for
thirty years following her one hive, which she carries on her back and talks to as "the Ladies". She
never takes off the veil. Tutorial nudges (pollen, bogs, syrup fishing, the briarwood rod), gossip
about every prince, reactions to each court freed, and a long arc after the Empress falls (the
Ladies swarm the Glasshouse and she finally learns why they always flew that way).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `mossgate` | Mossgate | a harbour town grown inside a fallen giant tree: root-arch quays, hollow-log houses, moss roofs, the tithe-scales on the waterfront | landfall, docks + boatwright, sea fishing, bakery *The Crumb & Thistle*, general store, tackle (briarwood rod), waystone, roads to three courts |
| `bloom` | The Bloom Court | formal gardens under glass cloches: flowerbeds in stripes, topiary walks, fountains, a sundial lawn, potting sheds | 5 encounters, Prince Petalis's orangery, shop, quests, lily-pond fishing |
| `spore` | The Spore Court | a fungal bog town: houses inside giant mushrooms, glowing caps, boardwalks over black water, fairy rings | ″ + bog fishing |
| `heartwood` | The Heartwood Court | a city in and on a colossal living tree: bark terraces, root stairs, sap lanterns, knot-hole doors, the sawmill that is never allowed to run | ″ + root-pool fishing; the Glasshouse door at its crown (north) |
| `wildhunt` | The Wildhunt Court | a deep-forest lodge town: timber halls, trophy antlers, kennels, deer parks, a river ford, the Empress's hunting stands | ″ + river fishing |
| `ossuary` | The Ossuary Court | a bone-garden catacomb town where the pruned are composted: ossuary chapels, bone trellises, marrow wells, white lilies | ″ + bone-well fishing (abyss: whalebone or briarwood rod) |
| `confection` | The Confection Court | a sugar town: gingerbread houses, candy-cane fences, syrup rivers, sugar mills, the Sweet-Tax house | ″ + syrup fishing (briarwood rod), bakery *The Sugar Loaf* |
| `glasshouse` | The Glasshouse (dungeon) | the Empress's palace: iron-and-glass halls, hedge galleries of grafted subjects, sprinkler pipes, growing lamps | gated by all 6 princes; 3 halls + 3 warden fights → the throne |

## Encounters (5 per court) — name · foe (element) · gimmick

**Bloom Court**
1. *Deadheading* · Pruner Sabine (life) — blooms open across the beds; cut a ripe one and it heals
   you; left unpicked, a bloom wilts into a thorn patch that scratches whoever walks it.
2. *Pollen Count* · Sneezewort Pell (air) — pollen clouds drift through and fill a sneeze meter;
   full, you sneeze — stopped dead and thrown back; Pell's fan blows the clouds at you.
3. *Topiary* · Hedgecutter Box (metal) — hedge animals stand about and lumber after the nearest
   fighter, blocking shots; clip one twice and it is a stump.
4. *Sundial* · Gnomon Hollis (light) — a giant sundial's shadow sweeps the lawn like a clock hand;
   in the sun you deal more, in the shadow you take less — the hand never stops.
5. *The Graft* · Grafter Ives (string) — landing a hit grafts a vine between the two fighters;
   stretched past its length it tears and wounds whoever was pulling away.

**Spore Court**
1. *Fairy Ring* · Ringwarden Puck (growth) — rings of mushrooms sprout and close; anyone inside a
   ring when it closes is whisked to another ring.
2. *Puffball* · Puffer Gill (slime) — puffballs dot the bog; stepping on one bursts a choking spore
   cloud that poisons and slows everyone inside.
3. *Mycelium* · Netkeeper Hypha (electricity) — glowing threads link the mushrooms under the floor;
   strike a mushroom and the pulse runs the net, shocking anyone standing on its threads.
4. *Will-o'-Wisps* · Wisper Fen (soul) — the bog is soft everywhere but where the wisps hover;
   standing off firm ground sinks you, slower and slower, until you are stuck.
5. *Decomposition* · Rotmother Morel (death) — every hit landed leaves rot on the floor; rot fruits
   into mushrooms that burst for heavy damage when ripe; she lures you onto them.

**Heartwood Court**
1. *Sap Tap* · Tapper Resinia (gluttony) — taps in the bark drip sap; strike a tap and it splashes,
   and the sap sets into amber round whoever stands in it — stuck, and the next hit lands double.
2. *Growth Rings* · Ringreader Dendro (sand) — the floor is a tree-ring cross-section; this year's
   bright ring grows outward and hastes whoever is on it; the dark old rings drag.
3. *Woodpecker* · Drummer Pike (sound) — woodpeckers drum the trunks in a counted rhythm; on the
   last beat the drummed trunk throws a fan of splinters.
4. *Leaf Fall* · Autumn-Keeper Russet (tempest) — leaves fall into drifts; inside a pile you are
   hidden and cushioned, until her gusts blow the piles away.
5. *Termites* · Borer Mandible (ruin) — the arena is plank walkways over a drop; termites eat holes
   in them that you fall through (hurt, set back); fresh planks are nailed down on a clock.

**Wildhunt Court**
1. *Quarry* · Huntmaster Bracken (hunt) — you are the quarry: your footsteps leave a scent trail
   the hounds follow; wade the ford to wash it off — they turn on him if his scent is stronger.
2. *Stag Rut* · Antlered Rowan (earth) — a great stag charges in straight lines between the trees
   at whoever struck it last; its antlers stick in a trunk for a moment after a miss.
3. *Hunting Blinds* · Blindkeeper Fern (illusion) — hides of woven reeds stand about; inside one you
   are unseen and your first shot out of it crits; she uses them too.
4. *Horn Call* · Halloo the Horn-Blower (echo) — each horn blast rolls out as a wave, then the
   treeline throws its echo back a second later from the far side.
5. *Falconry* · Falconer Kestrel (air) — a falcon circles; when she points, its shadow fixes on a
   fighter and it stoops a moment later; the canopy patches break its sight.

**Ossuary Court**
1. *Bone Garden* · Gardener Sternum (marrow) — bones planted in rows sprout into bone thickets that
   wall the yard; strike a thicket and it shatters into shrapnel at whoever is beside it.
2. *Calcify* · Mason Ossein (crystal) — standing still calcifies you: armour builds and speed falls;
   moving sheds it — every fighter chooses stone or speed.
3. *Marrow Wells* · Digger Femur (gravity) — wells of marrow-jelly pull whoever comes near toward
   their centre, where the marrow scalds.
4. *Knucklebones* · Rattlebag Coccyx (fate) — every round the knucklebones are thrown and the roll
   picks the yard's rule (bones fly / the floor is holy / every hit heals the hitter).
5. *Reliquary* · Keeper Vertebra (passion) — reliquaries hold saints' bones; standing at one heals,
   but she consecrates them one by one to herself — desecrate them by striking.

**Confection Court**
1. *Sugar Rush* · Confectioner Praline (gum) — sugar cubes are scattered; eating one is a burst of
   speed and a stack of crash; at three stacks you crash hard.
2. *Taffy Pull* · Puller Nougat (rubber) — taffy strands stretch between hooks; run into one and it
   stretches, then snaps you back the way you came.
3. *Gingerbread* · Baker Snap (creation) — the oven door bangs open and gingerbread men run out at
   whoever is nearest; crumble them before they gang up.
4. *Caramel* · Cook Butterscotch (fire) — hot caramel pours down the lanes (it burns), then cools
   into brittle you can walk on — and shatter under the foe.
5. *Piñata* · Partyman Peso (fortune) — a piñata swings over the yard; whoever breaks it showers
   candy — a buff for each piece the breaker gathers.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Petalis | Bloom | *Full Bloom* — petal storms and flowerbeds that burst | *Wilt* — the petals fall; bare thorn stems whip the room | *Perennial* — cut down, he regrows from seed elsewhere |
| Mycel | Spore | *The Network* — threads under the floor; mushrooms erupt along them | *Fruiting Body* — a towering mushroom, spore clouds gusting off the cap | *Mycorrhiza* — the whole floor is him |
| Birchbark | Heartwood | *Rooted* — planted; roots erupt and branches sweep | *Timber!* — uproots and walks; felled trees crash across the room | *Heartrot* — hollow; wasps pour out of him |
| Fang | Wildhunt | *The Chase* — mounted, with hounds and spears | *The Beast Within* — a great wolf, lunges and howls | *The Wild Hunt* — spectral riders cross the room |
| Sinew | Ossuary | *Marionette* — bone spears, ligament whips | *Unstrung* — scattered bones that fly and reassemble | *The Ossuary Throne* — the walls of skulls wake |
| Saccharo | Confection | *Spun Sugar* — candy-floss clouds, hard-candy bullets | *Melt* — a syrup flood and gumdrop bombs | *Cavity* — the sugar rots; everything sweet turns on him and you |

## The monarch — Empress Verdigra the Gardener

Dungeon **the Glasshouse**: three halls (the Pruning Gallery — giant shears clipping on a timer; the
Topiary Maze — hedges of grafted subjects that shift when a bell rings; the Nursery — sprinklers and
growing lamps that grow vines across the path unless you shut them off) each ending in a warden fight,
then the throne under the great dome.
Phases: *The Pruning* (enthroned among her roses; shears and clippings) → *The Graft* (she grafts
vines into the room and into you) → *Overgrowth* (the dome shatters and the jungle floods in) → *Compost*
(she rots and blooms by turns). Hard: *Evergreen*.
