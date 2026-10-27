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

## Per-isle sections

Each isle's world, names, encounters, princes and monarch live in their own file, so a builder reads
only the overview (this file) and its own isle:

| Isle | File |
|---|---|
| Brandmark (fire) | `docs/ten-isles/fire.md` |
| The Drowned Reach (water) | `docs/ten-isles/water.md` |
| Thornwild (life) | `docs/ten-isles/life.md` |
| Highspire (air) | `docs/ten-isles/air.md` |

A new isle gets a new file here before its builders launch.

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
- 2026-10-27: **Thornwild (Life Isle) built** — same split (6 courts + Mossgate port + Glasshouse dungeon/Empress
  Verdigra + genes), ~37.6k lines in `content/life/`, validator clean, build clean, not runtime-tested. Contract
  adds weathers `pollen`/`spores`/`petals`/`leaves`/`sugar`/`fireflies`, gate looks `thorn`/`roots`/`bone`/`candy`,
  fishery kinds `bog`/`syrup` (syrup needs `rod-briarwood`, sold at Mossgate), hats `wreath`/`antlers`/`mushroom`.
  Sea beast **the Brambleback** (sheds bramble mats) drops the **Greenwood Keel** (regrows a plank every 10 s; thorn
  burst whenever the hull is struck). The build script now gives Vite a 6 GB heap (the bundle outgrew the default).
- 2026-10-27: **Highspire (Air Isle) built** — same split (6 courts + Windlass port + the Lung dungeon/King Aerion +
  genes), ~38.3k lines in `content/air/`, validator clean, build clean, not runtime-tested. Contract adds weathers
  `wind`/`clouds`/`feathers`/`stars`/`storm`/`dreams`, gate looks `cloud`/`lightning`/`orrery`/`veil`/`book`, fishery kinds
  `cloud`/`aurora` (both need `rod-skyline`, sold at Windlass), hats `aviator`/`nightcap`/`plume`. Sea beast **the Skyray**
  (gust fronts shove the boat sideways) drops the **Windcatcher Sail** (fills every ~4 s: speed burst + nearby foe shots
  blown back as yours). Dungeon hazards now reset you with a per-isle message (`DUNGEON_CATCH`).
- 2026-10-27: **builder token diet** — the bible is split per isle (`docs/ten-isles/<isle>.md`; builders read only the
  overview + their isle); builders get ONE reference folder; and the isle is registered from the start with
  `content/placeholder.ts` stand-ins in every builder folder, so builders run the real validator
  (`node .check-isles.mjs --only <id>`, which skips and lists placeholders) instead of writing their own harnesses.
  The kickoff checklist is at the top of `docs/ten-isles-builder-brief.md`.
- 2026-10-27: **validator v2** — the checks builders used to hand-roll now live in `.check-isles.mjs`: reachability of
  every NPC/champion/POI/spot/door arrival (with a nearest-walkable hint), clear exit strips, dialogue length (warn >110,
  err >140), and gimmick liveness (40 s sim, bot follows `npcSeek`). The Phaser stub now has real `Phaser.Math`, so
  smoke runs actually progress. Fixed what it found: Kiln→Caldera and Glasshouse→Heartwood door arrivals inside
  solids, an unreachable Candlewick collect spot.
- Not yet built: the other six isles; the
  Obsidian Pinnacle + Obsidian King; revolts / anarchy / dark market; the meteor + hard mode (save has
  `hard`, fights already scale on it, but no 10-encounter courts or Fallen forms yet); online co-op.
