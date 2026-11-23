# The Obsidian Pinnacle — the end of the campaign

The black spire in the middle of the sea. Ten benches of six councilors (sixty seats, one per element), then
the Crownless Hall and the Obsidian King. Code: `src/isles/content/pinnacle/`. Shared look:
`src/isles/art/PinnacleArt.ts` (palette `OBS`, `shard`, `slab`, `seam`, `councilMask`, `starGlow`,
`drawPinnacle`, `throne`, `glassFloor`, `starfield`) — **every Pinnacle builder draws through it.**

## The truth of the place (lore every builder writes toward)

- Long before the isles had names a **star fell into the sea**. Where it struck, the sea boiled to glass: a
  spire of black obsidian with the star still alive inside it, shelled over.
- The thing in the shell called itself a king. It has never left the throne. It rules by *appointment*: it
  crowned the ten monarchs and gave each one cruelty to keep order with — the Brand, the Undertow, the
  Pruning, the Breath-Tax, the Stone Tithe, the Draw, the Mark, the Lot, the Part, the Endless Noon.
- **The Sixty** — the Obsidian Council — wrote those laws clause by clause. One seat per element. Each
  councilor wears a mask that is a shard of the King's own shell, and the mask is why they fight
  *perfected*: every upgrade, the mastery, a perk. They are jurists, auditors and clerks of tyranny —
  dry, precise, proud of their drafting, and (once beaten, mask split) frightened of what is upstairs.
  Each supervised one court: its prince was their appointment, and usually their disappointment.
- A wall of storm, **the Shroud**, hid the spire while any monarch reigned. With the tenth crown down it
  breaks. The ten wanderers the player met — Tamsin Coalwhistle, Odo Fathomsby, Wendeline Burrows, Barnaby
  Tuft, Gideon Flint, Wren Filament, Tansy Rue (and Pestle), Marlo Fairshake (and Tuppence), Lark Halloway
  (and Patter), Sable Merrow (and Nocturne) — sail to its foot with the player: **the Muster**.
- **The Ferryman** who rowed the player to Brandmark at the very start climbs the spire with them. He has
  rowed challengers here before. He has never rowed one back. ("There is always a last one.")
- Palette rule: the Pinnacle is **black glass, never grey stone** — near-black faces with a cold violet sheen,
  a thin pale line on every edge, violet light in every crack. **Warm gold-white light appears only where the
  star shows through** — more of it the higher you climb, pouring through the ceiling of the tenth bench.
- The ending: the star goes out gently; the glass clears; the isles get their first free dawn. Then the
  stinger — *"or does it?"* — a second star shivers loose and falls: the meteor (hard mode, a later milestone).

## Geography

```
        [pin-summit]  The Crownless Hall — the throne (door wants all 60 seats)
             |
        [bench-light]  10 The Noon Bench
        [bench-sound]   9 The Choir Bench
        [bench-fate]    8 The Lot Bench
        [bench-slime]   7 The Venom Bench
        [bench-electricity] 6 The Storm Bench
        [bench-earth]   5 The Stone Bench
        [bench-air]     4 The Gale Bench
        [bench-life]    3 The Thorn Bench
        [bench-water]   2 The Tide Bench
        [bench-fire]    1 The Ember Bench
             |
        [pin-landing]  Glasswater Landing (south is the sea; the mooring)
```
Every bench is 1600×2000, climbed south → north: `s` exit down (always open), `n` exit up gated
`open: { courtReady: '<this bench id>' }` (all six of its seats emptied) with a `lockedText`. The top
bench's `n` exit leads to `pin-summit`. `pin-landing` is 2400×1500 (`n` → `bench-fire`); `pin-summit` is
1400×2200 (`s` → `bench-light`), the King's `monarch` POI near its north end. Fixed ids: `spec.ts`.

## The benches

Each bench is the chamber where one isle's law was written — the King's memory of that isle, cast in
black glass. Each has a **set piece** no other bench has, six **seats** (tall obsidian chairs on plinths,
one councilor standing before each), a waystone by the south stair, one **relic** chest
(`relic-<bench id>`, a charm with a bespoke script, `open: { courtReady: '<bench>' }`), and a short intro
cinematic (`cine-<bench id>`). Six elements = that isle's six courts, in court order.

| # | bench | elements | the room | set piece | weather |
|---|---|---|---|---|---|
| 1 | Ember Bench | fire magma pressure gunpowder plasma wax | a glass-foundry gone cold: lava-falls frozen mid-pour as black glass with ember light trapped inside, branding irons racked like quills, a floor of cooled flows | **the First Brand** — the great seal-iron that stamped the law, still faintly red | embers |
| 2 | Tide Bench | water ice depths oil ink cloth | a drowned chamber: glass stairs going down into still black water, the open sea pressing on window-walls with huge shapes passing outside | **the Tide-Clock** — a brass-and-glass orrery of tides that set the Undertow's hours | drip |
| 3 | Thorn Bench | life growth gluttony hunt marrow gum | a hothouse of obsidian trees with glass leaves that chime — and real green vines splitting the glass (the isles are winning) | **the Pruning Shears** — house-sized, blades open, hung over a living sapling in a bell jar | petals |
| 4 | Gale Bench | air tempest gravity dream astra myth | the *outside* of the spire: bridges between shards over a sea of cloud, banners cracking, stars close overhead | **the Breath-Meter** — a vast bellows-and-anemometer that counted every breath owed | wind |
| 5 | Stone Bench | earth crystal clay dune metal ruin | a vault of strata: every isle's stone inlaid in the glass in layers, tithe-stones stacked like coin | **the Great Scale** — a balance with a mountain of tithe-stone in one pan and a single crown in the other | dust |
| 6 | Storm Bench | electricity technology magnet radiation rubber quantum | the spire's conductor: arcs crawling inside the glass walls, ranks of capacitor jars, cables as thick as trees | **the Meter** — the dial that counts the Draw, its needle pinned at the stop | static |
| 7 | Venom Bench | slime death shadow bind subterfuge string | a fen in a glass bowl: stills dripping draughts, low green mist, a wall of name-plaques each struck through | **the Register of the Marked** — the wall of names, and the alembic that brewed the Draught | miasma |
| 8 | Lot Bench | fate fortune sand memory psychic conquest | a court laid out as a gaming floor: house-sized dice fused into the walls, a hanging hourglass, war-tables | **the Wheel of Sixty** — a roulette wheel set in the floor with sixty pockets, one per seat | cards |
| 9 | Choir Bench | sound echo silence illusion passion paper | an amphitheatre of silence: tiers of empty seats, glass organ pipes, shelves of glowing jars | **the Voice Vault** — thousands of stoppered jars, each a stolen voice, humming faintly | notes |
| 10 | Noon Bench | light justice soul magic creation chalk | the highest and brightest: obsidian mirrors, a captured sunbeam down a shaft — and gold starlight pouring through the cracked ceiling | **the Ceiling Seam** — the underside of the throne hall, where the shell is thinnest and the star shows | starmotes |

### Councilors (six per bench — the bench builder names them)

- `EncounterDef` with `id: seat-<element>`, `court: '<bench id>'`, `mastered: true`, `difficulty: 5`,
  `seat: 'Seat of …'`, `foeName: 'Councilor …'`, `look.hat: 'councilmask'`, `hpMult` 1.25–1.45 rising with the
  bench, `coins` 200 + 12 × bench number. Optional `perk` (a real perk id of that element) when one perk makes
  the decree sing; otherwise the engine picks one at random.
- `name` is the **Decree** — the fight's rule, named like a clause of law ("Decree of the Unbanked Fire").
  One `GimmickDef` each: sixty decrees, each its own idea with its own art. A decree is written *for a
  perfected bot*: it should show off what that element looks like fully mastered, and — like every rule in
  this campaign — be something a clever player can turn on the councilor. It must not repeat any gimmick of
  that element's court on its isle (the isle file lists them) or of a neighbour seat.
- `challenge` (3–4 lines) and `beaten` (2–3 lines): the councilor as a person — what clause they drafted,
  which prince they appointed, what they think of the player; beaten, mask split, what they fear upstairs.

## Glasswater Landing (`pin-landing`)

A beach of black-glass shingle at the spire's foot: the wrecks of older challengers' boats, the first stair,
and **the Muster** — the ten wanderers' camp, each with a tent or pitch that is unmistakably their isle
(Tamsin's tinker cart, Odo's diving bell, Wendeline's hives, Barnaby's half-inflated balloon, Gideon's cairn,
Wren's lamp-post, Tansy's still and her mongoose, Marlo's card table and magpie, Lark's silent bandstand and
mynah, Sable's lantern with her moth). All ten are NPCs with talk blocks for: arrival, each third of the
climb (`{ seats: 20 }`, `{ seats: 40 }`, `{ seats: 60 }`), and after the King falls (`{ monarch:
'obsidian-king' }`). A dock NPC (`role: dock`) to sail home, a quartermaster (`pin-stores`: four dear charms
with bespoke scripts, and good food), a camp kitchen bakery (`pin-kitchen`: "last supper" recipes from fish
of several isles), a waystone, the mooring. The **Ferryman** is the Pinnacle's wanderer (`WandererDef`):
lines for the landing, every bench and the summit.

## The Crownless Hall (`pin-summit`)

A long nave under the cracked shell: sixty empty mask-niches along the walls (lit as seats fall is beyond
the engine — draw them dark), ten crown-moulds on plinths ("I made every one of them"), a final stair, and
the throne (`throne()` from PinnacleArt) with the King on it. Gold light through every crack. No NPCs.
Intro `cine-throne`. Holds the King's artifact `art-obsidian-king` ("the Unshelled Star").

## The Obsidian King (`isle:obsidian-king`) — three acts, one def

`king/index.ts` folds three `KingPart`s (`king/contract.ts`). Arena 960×640; HUD owns y < 96.

### I — THE THRONE (`king/throne.ts`, signature prefix `p1-`, pool 900)
He does not rise. Anchored on the throne at the head of the hall (`anchorAt` ≈ 480,170), behind **the
Aegis** — a dome of black glass. He sends **the Host** down the hall in named waves:
- **Warriors** — slow tower-shield infantry that block shots from the front and advance as a wall.
- **Assassins** — fragile, fast; they vanish and reappear behind the player with a marked, dodgeable stab.
- **Beasts** — obsidian hounds that telegraph a lane and charge it, shedding glass.
Waves: THE SHIELDWALL → THE KNIVES → THE KENNEL → THE HOST (mixed), then harder repeats. While any of the
Host stands the Aegis holds (the King takes almost nothing). **Break a wave and the Aegis cracks**: a
window where the throne is open and he takes extra. Between and during waves he rules from the chair —
edicts down the hall, a gavel, a pointing hand. Minions are real enemies (`tk.spawnAdd({ hidden: true,
behavior })`) with bespoke drawn bodies.

### II — THE CRACKED MASK (`king/duel.ts`, prefix `p2-`, pool 1000)
Entry cinematic: he stands; the mask cracks and starlight shows; he draws the sword from the throne's back;
the Aegis folds onto his arm as a shield; he walks down the steps. A duel: **the shield** faces the player and
turns slower than the player can circle — blows into it are turned and shots are reflected; get behind it, or
punish the openings (a whiffed lunge buries the sword; a thrown shield leaves him bare until it comes back).
Sword combos, a lunge, the shield thrown as a ricocheting disc, glass erupting along cracks, "KNEEL" rings.
At half the shield shatters and he fights two-handed and faster, the mask splitting further.

### III — THE STAR UNSHELLED (`king/star.ts`, prefix `p3-`, pool 1300)
Entry cinematic (the big one): sword dropped, mask falling, light through every crack — the hall floor
fractures, white-out, and when sight returns the hall is gone: **space**, and the fight is on a vast ring
disc (seen from above — concentric bands turning round him, Saturn's rings) with the King gigantic at its
centre: a blazing star with the last fragments of mask and shell orbiting it. Everything is at cosmic
scale: planets on orbits, solar-flare sweeps, a meteor shower, a black hole that drags the ring inward, comets,
bands of the ring detonating — and the **SUPERNOVA**, survivable only in a planet's shadow. `KING_OUTRO`: the
star gutters and goes out.

## Cinematics (`CutsceneDef`s, played by `IslesCutsceneScene`)

| id | when | what |
|---|---|---|
| `cine-shroud` | after the tenth monarch falls | the storm wall round the spire tears open; the spire is seen for the first time; beacons light on ten isles; ten boats put out |
| `cine-landfall` | first arrival at the landing | the crossing's end: the spire filling the sky, the fleet grounding on glass shingle, the Ferryman: he has done this before |
| `cine-<bench id>` ×10 | first entry to each bench | 2–3 shots: the room revealed, its set piece, six masks turning to look |
| `cine-throne` | first entry to the summit | the long walk up the nave; sixty empty niches; the King speaks without rising |
| `cine-ending` | after the King falls | the star goes out; the glass clears; dawn over each of the ten isles (one image each: what its tyranny looked like, undone); the Muster; a title card; then the stinger — a star falls |

## Status

- 2026-11-22: engine landed (cutscene player, area intros, councilor fights with perfected loadouts, King
  phase entries / outro / living backdrop / custom minions, `{ monarchs }` / `{ seats }` conditions, dock
  route, results + ending flow, validator rules). Content builders launched.
- 2026-11-23: all content landed; type-check, validator (0 placeholders) and build clean. Not runtime-tested.
