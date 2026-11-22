<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Fangmire — Venom Isle

**The second isle beyond the Breakwater.** Fangmire lies south-east of Voltreach across the Outer Sea: a
drowned jungle on a mire that has no bottom, mangroves on stilt-roots, black water steaming with marsh
gas, and fangs of white rock — the old teeth of something vast — standing out of the swamp in rows. Every
tree is hung with webs, every pool has something coiled in it, and the air tastes faintly of bitter almonds.

**The tyranny.** Matriarch Nyxa Coilborne, half serpent, rules from her nest at the heart of the mire.
Every child born on Fangmire is brought to her before it is a week old and **bitten** — the Mark, two
small scars on the wrist — and her venom is slow: it does nothing at all as long as the bitten drink
**the Draught**, the antidote brewed from her milked venom, doled out at the Draught Houses each new moon.
The Draught is rationed by loyalty. A household in good standing gets its doses; a household that is late
with the Moult-Tithe (shed skins, silk, venom, informations), or speaks against the Matriarch, or is named
by an informer, is **passed over** — and the passed-over **go grey**: a slow chill that starts at the
fingertips, until they are carried to the Grave Court. Spies are everywhere and are paid in extra doses;
debtors are chained; the antidote itself is contraband unless it comes from her hand. Nyxa says the Mark
binds the isle to her as a mother binds her brood, and that without her nobody would live a month. She
is right, and that is the whole of her power. Her six broodlings govern the courts.

**Reaching it.** Voltreach's docks chart Fangmire once Empress Ohmrine falls. It is an **Outer Sea crossing**
(`IsleDef.outer`, like Voltreach) and lands at Stilthaven. Its sea beast is **the Mire Hydra** — five
heads on necks like mangrove trunks rising out of one sunken body, scaled black-green with yellow eyes,
each head hooded differently; it spits **venom slicks** (a glob arcs over, splashes, and a sheen of venom
spreads on the water: crossing a slick corrodes the hull and drags the boat; slicks thin out and fade) and
drops the **Hydra Prow** Uber-upgrade (three carved heads on the bow — left, centre, right — each bites the
first hazard to come into reach on its side, smashing it, then needs eight seconds to grow back).

**The wanderer.** *Tansy Rue*, a hedge-apothecary who brews bootleg Draught in a copper kettle under the
mangroves and gives it away — the most wanted woman on the isle. She has been bitten so many times she
says she is now mostly venom herself. She carries a satchel of clinking vials, a mortar on a cord round
her neck, and a mongoose called Pestle that rides on her shoulder and growls at informers. Tutorial nudges
(the Draught and the Mark, venom and blackwater fishing, the antivenin rod, the Outer Sea), gossip about
every prince, reactions to each court freed, and a long arc after the Matriarch falls (the Draught Houses
are thrown open, Tansy finally learns the true antidote recipe from the Matriarch's own still, and the whole
isle queues one last time — for a cure, not a dose — and burns the ration books).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `stilthaven` | Stilthaven | a harbour on stilts at the mire's edge: boardwalks over black water, houses on mangrove-stilts, the Draught House with its new-moon queue rope and ration board, a snakeskin tannery, net-lofts, a fang-rock lighthouse | landfall, docks + boatwright, sea fishing, bakery *The Honeyed Fang*, general store, tackle (antivenin rod), waystone, roads to three courts |
| `fang` | The Fang Court | the venom-milkers' town on a steaming fen: snake pits behind wicker walls, the Milking Shed (racks of serpents, venom dripping into troughs), venom vats, stilt-huts, the great white fangs standing out of the fen | 5 encounters, Prince Venin's Milking Hall, shop, quests, venom-fen fishing (antivenin rod), bakery *The Charmer's Basket* |
| `web` | The Web Court | the silk town in the canopy: giant spiders farmed for silk, web-bridges and rope-ladders between tree-houses, spinning mills, drying racks of silk, the Spymaster's web — a map of the isle strung in thread, one strand for every spy | ″ + silk-pool fishing (bog) |
| `shackle` | The Shackle Court | the debtors' gaol-town: chain-gangs on the causeway, a great chain bridge over the mire, the Manacle Works, stocks and pillories in the square, a debt-ledger the size of a door chained to the gaol wall | ″ + chain-moat fishing (pond) |
| `cloak` | The Cloak Court | the informers' town: shuttered houses with eye-holes, a market of masks, ear-trumpets on every corner, a whispering gallery, the Hall of Letters where denunciations are nailed up, washing lines hung with cloaks | ″ + cistern fishing (ink) |
| `umbral` | The Umbral Court | a town under a canopy so thick no light reaches: lamps that burn black, giant sundials that show only night, shadow-weavers' looms, houses grown inside hollow trees, shadows that move on their own | ″ + shadow-mere fishing (blackwater, antivenin rod) |
| `grave` | The Grave Court | the boneyard of the greyed: an endless churchyard sinking into the mire, mausoleums on stilts, a bell on every grave, gravediggers, lych-gates, the Lych House, and the Slough's door (north) | ″ + lych-pool fishing (blackwater, antivenin rod); the Slough door |
| `slough` | The Slough (dungeon) | the Matriarch's own cast skin, a hill-long hollow serpent coiled in the deepest mire, walked from the tail up to the head: the Milking Sheds (her serpents milked in rows, venom troughs, the milkers), the Moulting Hollow (old skins hanging, empty heads that still strike), the Clutch (eggs as tall as a man, warm and twitching), then the nest in the skull | gated by all 6 princes; 3 halls + 3 warden fights → the nest |

## Encounters (5 per court) — name · foe (element) · gimmick

**Fang Court**
1. *Snake Pit* · Pitkeeper Asp (hunt) — snakes lie coiled in the grass about the yard; come near one and
   it rattles, then strikes; strike a coil and it is flung, landing coiled near where it fell.
2. *The Mark* · Dosekeeper Brine (life) — both fighters' Marks fill with venom over time (shown on them);
   a full Mark bursts in poison; one antidote vial appears at a time — whoever drinks it clears theirs.
3. *Fen Gas* · Bogman Ooze (earth) — gas bubbles swell up out of the fen and burst into green clouds that
   drift with the breeze; strike a bubble to pop it early, where you want the cloud.
4. *Shed Skin* · Sloughmother Vipra (illusion) — every few seconds each fighter sheds: a hollow skin is left
   where they stood, and it takes the next blow aimed at it; the foe hides behind its skins.
5. *Charmer's Pipe* · Charmer Sibila (sound) — a cobra rises from a basket and sways to the pipe; when the
   tune stops it spits at whoever is nearest; stand on the piper's mat to play the tune yourself.

**Web Court**
1. *Silk Lines* · Spinner Arachne (cloth) — every dash trails a silk line; lines criss-cross the floor and
   stick whoever crosses them (slowed); strike a line's anchor to cut it.
2. *Tripwire* · Trapper Snare (gunpowder) — near-invisible tripwires glint across the floor; trip one and
   bolts fire from the walls along it; the foe lays new wires as it goes.
3. *Brood* · Broodkeeper Mab (growth) — egg sacs hang about the room and hatch spiderlings that run at
   whoever is nearest; strike a sac before it hatches.
4. *Loom* · Weaver Shuttle (creation) — the great loom's shuttle flies across the room row by row, weaving
   a panel behind it that blocks shots; the rows climb toward one end.
5. *Marionette* · Puppeteer Gepp (dream) — threads hang from a crossbar overhead; walk under one and it
   catches you and walks you a few steps like a puppet; strike a thread's spool to cut it.

**Shackle Court**
1. *Ball and Chain* · Convict Link (conquest) — each fighter is chained to an iron ball that drags behind;
   a dash swings it round in a smashing arc.
2. *The Stocks* · Bailiff Pillory (justice) — stocks stand in the square; knocked into a pair of stocks you
   are locked in a beat while the crowd pelts you; knock the foe in.
3. *Manacle Works* · Smith Clasp (metal) — manacles roll off a belt toward the fighters; one that closes on
   a wrist locks one of your abilities for a while; strike a manacle to send it on.
4. *Chain Bridge* · Keeper Pontoon (water) — the yard is a chain bridge over the mire; planks drop away in a
   pattern (they creak first); fall through and you are dunked and hauled back up.
5. *Debtor's Ledger* · Clerk Arrears (fortune) — every hit taken is written as debt in a great ledger; at
   the bell, whoever owes more is chained to the spot while the other collects.

**Cloak Court**
1. *Informer* · Snitch Tattle (psychic) — an informer wanders the square; whoever he sees cast is
   reported, marked and shot from the watchtower; hide behind cover.
2. *Masquerade* · Maskmaker Visage (chalk) — masked dancers fill the floor; the foe hides among them,
   wearing a mask; strike a dancer to unmask it.
3. *Dead Drop* · Courier Cipher (paper) — a sealed letter appears; carry it to the drop box for a burst at
   your foe; the carrier is slowed and marked.
4. *Poisoned Cup* · Taster Goblet (gum) — cups stand in pairs on tables; one of each pair heals, the other
   poisons; the foe can see which (a faint tell lets you learn it).
5. *Whisper Gallery* · Gossip Murmur (silence) — ear-trumpets stand in pairs round the walls; anything cast
   beside one is heard at its twin and cast again from there.

**Umbral Court**
1. *Silhouette* · Lampman Silhou (fire) — a lamp on a pole swings over the room; fighters cast long shadows
   on the floor, and a blow landing on someone's shadow hurts its owner.
2. *Shade Step* · Stalker Grim (ice) — tree-shadows lie on
   the floor; a fighter who dashes from one shadow arrives in any other; the foe hops between them.
3. *Sundown* · Sundialer Gnomon (light) — a great sundial's gnomon-shadow sweeps the floor; inside its wedge
   you are chilled (slowed, and hit harder); stand on the hour-mark to stop the dial a moment.
4. *Eclipse* · Astronomer Umbra (astra) — the moon creeps over the sun; at totality the room goes black for
   a breath and both fighters' shadows rise and attack their owner's foe.
5. *Doppelgänger* · Mirrorwright Twin (echo) — each fighter's shadow detaches and walks their path a few
   seconds behind; your shadow hurts your foe on touch, and theirs hurts you.

**Grave Court**
1. *Open Graves* · Digger Barrow (gluttony) — graves open in the floor; fall into one and you are held a beat
   while dirt is shovelled on; knock the foe in.
2. *Safety Bells* · Sexton Toll (radiation) — bell posts stand by the graves; standing near one rings it, and
   a rung bell raises its grave's ghost, which drifts at the farthest fighter.
3. *Funeral* · Mourner Dirge (passion) — a procession of mourners carries a coffin across the yard in a line;
   touching it is a heavy shove; behind it falls a wake of petals that heals.
4. *Epitaphs* · Stonecutter Elegy (sand) — headstones are carved with countdowns; when a stone reaches zero
   the grave before it erupts; strike a stone to reset its count.
5. *Last Breath* · Undertaker Pale (soul) — whoever falls below half health has their spirit rise a step
   behind them; while out, the spirit can be struck for double; walk back into your own to return it, healed.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Venin | Fang | *Fangs* — strikes in coiled lunges (a coil-up telegraph, then a long straight bite), leaving dripping fang-punctures that pool | *Spitting Cobra* — hood flared, plants himself and rakes the room with arcs of spit that land as pools | *Cold Blood* — goes utterly still between bursts; every lunge leaves a shed skin that repeats it a beat later |
| Weft | Web | *Spinner* — spins web panels across the room that slow fighters and catch shots | *Spymaster* — threads run from him to every corner; he plucks one and a strike runs down it | *Cocoon* — wraps himself in silk (shielded) while his brood hatches; burn the cocoon open |
| Fetter | Shackle | *Manacles* — throws chains that tether you to iron posts (you can only move round the post) | *The Gaoler* — swings a great ball and chain in widening arcs, smashing the floor | *Life Sentence* — the walls chain in toward the centre; links can be struck to push them back |
| Whisper | Cloak | *Rumour* — vanishes and reappears among decoys; daggers come from behind | *Denunciation* — letters fly in and nail themselves to the floor, marking where the next blows fall | *Silent Knife* — every telegraph is faint and comes from where he is not looking |
| Dusk | Umbral | *Long Shadows* — the light is low: his shadow stretches across the floor and strikes where it lies | *Nightfall* — the room goes dark save for the lantern he carries; he is only hittable in its light | *Umbra* — he becomes a shadow on the floor, solid only where light falls |
| Mortis | Grave | *Gravedigger* — shovels arcs of grave-dirt and opens pits in the floor | *Requiem* — tolls a great bell: rings of knell roll outward and the ghosts of the greyed rise | *Rigor* — whoever stands still stiffens (rooted, then hurt); keep moving |

## The monarch — Matriarch Nyxa Coilborne

Dungeon **the Slough**: the Matriarch's own cast skin, coiled in the deepest mire, walked from the tail up
to the head (the door is at the tail, south; the nest is in the skull, north): three halls (the Milking
Sheds — rows of serpents on racks spitting on the beat, venom troughs to cross on duckboards; the Moulting
Hollow — old skins hanging in the dark that drop and strike as you pass; the Clutch — eggs as tall as a
man that hatch when you linger) each ending in a warden fight, then the nest in the skull, where the
Matriarch lies coiled round her still with the Draught brewing in it.
Phases: *The Draught* (she rations: antidote vials appear on the floor while her venom builds on you; she
drinks them if she reaches them first) → *Constrictor* (her coils wrap the arena — bands of body sliding
round, closing in, a gap to slip through) → *Hood* (she rises, hood spread: a hypnotic gaze sweeps the room —
face it and you are held; look away) → *Moult* (she sheds; the empty skin fights on beside her, mirroring her
last phase). Hard: *Ouroboros* — she swallows her own tail: the whole arena is the ring of her body, turning,
and the venom rises in the middle.
