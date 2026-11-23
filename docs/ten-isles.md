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
  (an arena rule with art), never a stat remix of another. Hard mode (the Fall) adds a further, different 300 —
  five more per court, ten to a gate.
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
| Bedrock Hold (earth) | `docs/ten-isles/earth.md` |
| Voltreach (electricity) | `docs/ten-isles/electricity.md` |
| Fangmire (slime / Venom) | `docs/ten-isles/slime.md` |
| Lotterhaven (fate) | `docs/ten-isles/fate.md` |
| Choirholm (sound) | `docs/ten-isles/sound.md` |
| Solmara (light) | `docs/ten-isles/light.md` |
| **The Obsidian Pinnacle** (the finale) | `docs/ten-isles/pinnacle.md` — builder brief `docs/ten-isles-pinnacle-brief.md` |
| **The meteor and the Fall** (hard mode) | `docs/ten-isles/fall.md` — builder brief `docs/ten-isles-fall-brief.md` |

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
- 2026-10-27: **Bedrock Hold (Earth Isle) kicked off** — bible `docs/ten-isles/earth.md`, brief retargeted, isle
  registered with placeholders. Contract adds weathers `dust`/`sandstorm`/`grit`/`glints`, gate looks `boulder`/`crystal`/
  `kiln`/`dune`/`iron`/`tomb`, fishery kinds `sand`/`cavern` (both need `rod-delver`, sold at Quarrymouth), hats
  `miner`/`headwrap`/`coif`. Sea beast **the Cragjaw** (shrugs boulders off its back — shadows first) drops the
  **Cragplate Ram** (ram rocks/drift/mines aside unharmed; every 8 s the plate hardens to shrug off one blow).
- 2026-10-27: **Bedrock Hold built** — 6 courts + Quarrymouth port + the Sepulchre/Regent Gravane + genes, ~38.5k lines in
  `content/earth/`, validator clean (no Earth warnings), build clean, not runtime-tested. `--only <court>` now also shows the
  prince's messages (`isle:<prince>`), `--only <dungeon>` the monarch's. Engine gaps builders faked (worth real hooks):
  gimmicks can't see a hit land on an object (strike → touch / hit near it); no boss taken-damage hook (Facet's Flawless and
  Anvil's Tempered heal damage back); gene on-cast rules fire on refunded casts (Ruin Lockdown) and never for Metal's R.
- 2026-10-27: **the Outer Sea** — the five abstract isles (`IsleDef.outer`) lie beyond the Breakwater and are harder to
  reach: a crossing to one is 3800 m (not 2600) through three darker bands (the Outer Swell, the Breakers, the Black
  Rollers — no lane cap, so the deepest band spawns thickest and pays best), a swell that heaves the boat side to side,
  storm flashes, and *breakers* (a wall of white water across the sea with one trough to thread; swamped = 1 hull and a
  shove). The dock lists those routes as ROUGH SEAS.
- 2026-10-27: **Voltreach (Electricity Isle) kicked off** — bible `docs/ten-isles/electricity.md`, brief retargeted, isle
  registered with placeholders. Contract adds weathers `static`/`aurora`/`glow`/`flicker`/`balloons`, gate looks `cable`/
  `magnet`/`lead`/`rubber`/`phase`, fishery kinds `charged`/`coolant`/`quantum` (all need `rod-insulated`, sold at
  Terminus), hats `antenna`/`hazmat`/`propeller`. Sea beast **the Galvaneel** (strings live arcs across the water that gutter
  on a beat) drops the **Stormglass Mast** (every 6 s a bolt forks to the three nearest hazards ahead).
- 2026-10-27: **Voltreach built** — 6 courts + Terminus port + the Crown Coil/Empress Ohmrine + genes, ~38.7k lines in
  `content/electricity/`, validator clean (no Voltreach warnings), build clean, not runtime-tested. Engine gaps builders faked
  (worth real hooks): gimmicks still can't see a hit land on an object (every court used touch / lean instead); no cast hook
  for gimmicks (Memory Leak replays hits); gimmicks can't change cooldowns, lift fighters, reflect fighter shots or block
  projectiles with walls; no gaze/facing source (Superposition reads the pointer); item scripts can't push; the boss draws
  under `gloom` (Ohmrine/Volt redraw themselves on the air layer); painters can't read save state. Genes: Quantum's on-cast
  rules never load (IslesFightKit reads `arena.elementId`, which is Quantum's current carried element); Technology Click and
  Electricity F never stamp a cast.
- 2026-10-27: **engine gaps closed** — real hooks for everything the Earth/Voltreach builders faked: strike targets
  (`ctx.target` / `tk.spawnTarget`: invisible unkillable hitboxes every damage path reaches, both sides' shots, the bot
  strikes what it casts beside; homing/auto-aim and ult charge ignore them), gimmick `onPlayerCast`/`onNpcCast`,
  `*CooldownRate`, `ctx.airborne`, `ctx.shotsNear` (block / reflect shots), `ctx.facing`; item scripts get `nudge`/
  `stun`/`facing`; signatures get `takenMult`/`onBossHurt`/`tk.shotsNear`, defs `drawLit` above the gloom (`tk.dark`);
  painters get `pieces[].when` and `world.test`. Genes: rules use the save's element (Quantum works), every carried
  ability maps to its key's slot, refused casts no longer pay out, Technology Click / Electricity F / Metal R report
  casts via `Fighter.onKitCast`. Earth + Voltreach content retrofitted onto the hooks.
- 2026-10-27: **Fangmire (Venom Isle) kicked off** — bible `docs/ten-isles/slime.md`, brief retargeted, isle registered
  with placeholders (`outer: true`). Port Stilthaven, dungeon the Slough (the Matriarch's cast skin, walked tail → head),
  monarch Nyxa (the Mark / the Draught / going grey), wanderer Tansy Rue. Contract adds weathers `miasma`/`drip`/
  `gossamer`/`murk`/`wisps`, gate looks `fang`/`web`/`chain`/`shadow`/`lychgate`, fishery kinds `venom`/`blackwater`
  (both need `rod-antivenin`, sold at Stilthaven), hats `cowl`/`plague`/`snake`. Sea beast **the Mire Hydra** (venom
  slicks that corrode and drag) drops the **Hydra Prow** (three bow heads each bite the first hazard on their side; 8 s
  regrow). Builders now run on Opus.
- 2026-10-27: **Fangmire built** — 6 courts + Stilthaven port + the Slough/Matriarch Nyxa + genes, all builders on Opus;
  validator clean (no Fangmire warnings), build clean, not runtime-tested. The bible's grave fish `fish-bonefish` clashed
  with Thornwild's — renamed `fish-lych-bonefish`. Subterfuge Click now reports its cast (`onKitCast('sub-cutter')`).
  Engine gaps builders worked around: signatures aren't told their phase (module vars set in `drawDecor`) and have no
  `facing` (Nyxa's Hood reads the pointer) and no nudge (Fetter writes `tk.player.x/y`); gimmicks can't see a dash (Shade
  Step reads speed > 560); item scripts can't slow; Manacle Works calls `Fighter.lockAbility` directly; the liveness sim
  never dashes, so dash/speed rules go unexercised; Subterfuge Spray reports its cast at burst end; toxin/most statuses
  ignore `statusDmgMult`/`statusDurMult`; alternate ultimates aren't in the gene key map.
- 2026-11-22: **Lotterhaven (Fate Isle) kicked off** — bible `docs/ten-isles/fate.md`, brief retargeted, isle registered
  with placeholders (`outer: true`). Port Tosswater, dungeon the House (the Croupier-King's casino-palace, climbed cellar →
  High Table), monarch Lucan (the Lot / the Draw / busted), wanderer Marlo Fairshake (+ magpie Tuppence); courts card(t1)
  clockwork treasury remembrance mind war(t4, House door 1200,150). Contract adds weathers `cards`/`confetti`/`goldleaf`/
  `sandfall`/`sepia`/`ripples`, gate looks `dice`/`vault`/`clock`/`locket`/`eye`/`palisade`, fishery kinds `gilded`/`lethe`
  (both need `rod-fortune`, sold at Tosswater), hats `visor`/`jester`/`shako`. Sea beast **the Wheelback** (rolls dice that
  tick down and burst) drops the **Fortune Helm** (spins every 7 s: gust / ward / broadside).
- 2026-11-22: **Lotterhaven built** — 6 courts + Tosswater port + the House/Croupier-King Lucan + genes, all on Opus, ~37.8k
  lines in `content/fate/`, validator clean (no Lotterhaven warnings), build clean, not runtime-tested. Engine: `BossToolkit.stun/
  root` (real CC for signatures, routed through `boss/framework/CrowdControl.ts` to IslesFightKit's holds); Time's revolver and
  Always Noon now report casts (`onKitCast`). Gaps builders worked around: signatures can't damage the boss (All In / Sacrifice
  use `takenMult`), no shove immunity (Last Stand snaps Banneret back), Last Stand / the Deal write `tk.damageScale`, Roulette
  writes `tk.player.x/y`, no dash signal (Tilt Yard reads speed > 560), no cooldown-swap hook (Mind Swap calls Fighter cooldown
  methods), Lethe calls `Fighter.lockAbility`, no "struck the other" hook (Poker Face swaps on any hurt), validator has no gene
  checks; Fate's Enchant/Throw/Preserve pay cooldown on a no-op.
- 2026-11-22: **Choirholm (Sound Isle) kicked off** — bible `docs/ten-isles/sound.md`, brief retargeted, isle registered
  with placeholders (`outer: true`). Port Carillon Quay, dungeon the Great Organ (climbed bellows → Console), monarch Maestro
  Cadenza (the Part / the Hours / muted — voices sealed in the Organ), wanderer Lark Halloway (+ mynah Patter, who speaks in her
  voice); courts brass(t1) cavern libretto masque hush cathedral(t4, Organ door 1200,150). Contract adds weathers `notes`/
  `glowworms`/`lull`/`sequins`/`incense`/`pages`, gate looks `pipes`/`bell`/`curtain`/`stalactite`/`stainedglass`/`scroll`,
  fishery kinds `resonant`/`still` (both need `rod-tuning`, sold at Carillon), hats `bandmaster`/`domino`/`earmuffs`. Sea beast
  **the Cantor** (sound-rings with rests) drops the **Foghorn Bow** (every 8 s: pushes drift aside, holds hazards still 2 s).
  Engine: `BossToolkit.silence` (real silence for signatures, through CrowdControl).
  Genes landed first; gaps found: Sound's Baton has no rule (120 ms re-cast); Devotion faith ignores every multiplier
  (no faith-gain hook); Holy Water bottles refill on the kit's 7 s clock, not cooldown cuts; Silence Run pays on a miss.
- 2026-11-22: **Choirholm built** — 6 courts + Carillon Quay + the Great Organ/Maestro Cadenza + genes, all on Opus, ~36.4k
  lines in `content/sound/`, validator clean (no Choirholm warnings), build clean, not runtime-tested. Masquerade first built the
  Cathedral's Confessional by mistake; rebuilt as Gondola. Validator now length-checks quest offer/accept/complete lines (≈35
  older-isle warnings surfaced, none over 140). Fixed Prince Squall's tornado crash (a 1-point path when it spawned off-field).
  Gaps builders worked around: signatures can't shove (Sforzando uses `tk.pull`); gimmicks can't hide a fighter (Confessional/
  Masked Quartet draw over + re-apply airborne/root), have no darkness layer (Sonar draws its own), can't tell who dealt a hit
  (Prompter / Folio Storm), and toolkit bullets only hit the player (Call and Answer tracks its own shots); no dash signal
  (Creaking Boards, Folio Storm read speed); signatures still aren't told their phase; item scripts can't silence (White Ribbon
  stuns); shot handles have no identity (Hall of Mirrors debounces by position).
- 2026-11-22: **Solmara (Light Isle) kicked off** — the last isle. Bible `docs/ten-isles/light.md`, brief retargeted, isle
  registered with placeholders (`outer: true`). Port Meridian Quay, dungeon the Heliostat (the mirror-crown that pins the sun,
  climbed base → Crown), monarch Despot Auriel (the Endless Noon / Clarity / Dusk Tickets / bleached into Clears), wanderer Sable
  Merrow (a Clear, + luna moth Nocturne); courts noon(t1) lantern mural workshop arcane tribunal(t4, Heliostat door 1200,150).
  Contract adds weathers `sunbeams`/`glare`/`lanterns`/`sigils`/`prisms`/`pigment`, gate looks `mirror`/`sunbar`/`lanterns`/`sigil`/
  `lens`/`scaffold`, fishery kinds `sunpool`/`mana` (both need `rod-prism`, sold at Meridian), hats `wig`/`beret`/`wizard`. Sea beast
  **the Lensback** (focuses burning spots on the sea) drops the **Burning Glass Prow** (every 7 s burns away the two nearest hazards
  ahead). Engine: `ctx.dashing(f)` (the liveness sim now dashes), `tk.spawnBullet({ hits })` (bullets that strike the bot),
  `tk.phase` for signatures.
- 2026-11-22: **Solmara built — all ten isles exist.** 6 courts + Meridian Quay + the Heliostat/Despot Auriel (4 phases + hard
  Second Sun) + genes, all on Opus, ~37.9k lines in `content/light/`, validator clean (0 placeholders, no Solmara warnings), build
  clean, not runtime-tested. Engine: `tk.playerDashing()` for signatures. Engine findings (genes builder): Light Click/E never
  report casts and Light's car ignores speed mults; Justice R/F, Soul Arise/Whistle/Turn and Paint's blank Still Life pay gene rules
  on refused/no-op casts; Creation's charge abilities go through `triggerCooldown` (skips disarm/silence checks). Gaps worked around:
  NpcLook has no translucency or pet (Sable drawn glass-pale, Nocturne only in area animation); signatures have no cast hook
  (Blind Justice listens to the Fighter 'cast' event) and can't damage the boss (`takenMult`); Counterspell can't cancel a cast;
  the bot's cast hook gives no key slot; Auriel's Sunset paints its own dusk instead of `gloom` (its fixed hole hides warnings).
- 2026-11-22: **the Obsidian Pinnacle kicked off** — bible `docs/ten-isles/pinnacle.md`, brief
  `docs/ten-isles-pinnacle-brief.md`, content `src/isles/content/pinnacle/`. It rides the registry as an eleventh bundle
  marked `IsleDef.pinnacle` (not in `ISLES`; `PINNACLE` / `getIsle('pinnacle')`): a landing, ten benches of six councilors
  (`seat-<element>`, sixty in all, each `mastered` — every upgrade, mastery, a perk — under a named Decree), the Crownless
  Hall, and the Obsidian King in three acts (`king/{throne,duel,star}.ts` folded by `king/index.ts`). Its route opens when
  the tenth monarch falls. Engine: **cinematics** (`IslesCutsceneScene`, `CutsceneDef`s in a bundle's `cutscenes`,
  `AreaDef.intro` played once on first entry; `cine-shroud` after the tenth crown, `cine-ending` after the King); councilor
  fights (payload kind `councilor`, masked champions, `buildNpcLoadout(el, 5)` + perk); Conds `{ monarchs }`, `{ seats }`,
  `courtReady: <bench id>`; boss **phase entries** (`WorldBossPhase.entry` / `WorldBossDef.outro`: in-arena cinematics with
  cues, `bodyTo`, `swapAt`, letterbox), `drawBackdrop` (a living floor), `drawArena(…, phaseIdx)`, style `anchorAt` /
  `hideRig` / `solid`, `tk.fighting`, `tk.spawnAdd({ hidden, behavior })` (real minions with bespoke drawn bodies); shared
  art `art/PinnacleArt.ts` + `art/CineArt.ts`; validator rules for the sixty seats, cutscenes and entries.
- 2026-11-23: **the Obsidian Pinnacle built — the campaign can be finished.** 17 Opus builders (ten benches, the King's
  three acts, landing, summit, cinematics, engine art), ~40k lines in `content/pinnacle/`; validator clean (0 placeholders,
  no Pinnacle warnings, 71 bosses), build clean, not runtime-tested. Sixty councilors under sixty decrees; the King =
  the Throne (the Host in waves behind the Aegis) → the Cracked Mask (sword and turning shield) → the Star Unshelled (ring
  disc in space, nine cosmic signatures, the Supernova) + outro; cinematics `cine-shroud` / `cine-landfall` / ten bench
  intros / `cine-throne` / `cine-ending` (ends on the falling star: flag for the meteor). The Last Crossing (4600 m, own
  hazards) in SeaVoyageScene; spire chart + sea-chart spire in IslesMapScene. Validator now flood-fills every Pinnacle area
  (spawn → both stairs, every seat / chest / NPC). Findings: nothing runs a `tk.spawnAdd` minion's own AI (the Throne act
  drives its Host itself); `tk.phase` was never set on a resumed fight (fixed); gimmicks still cannot tell who dealt a hit
  or read a kit's own state; `drawPinnacle`'s `alpha` option does nothing. Two decrees were sent back for repeating
  another bench's idea (Subterfuge auction → Forged Warrant; Silence bell jar → the voice flies for the Vault); Quantum's
  Superposed Law deliberately runs two of its bench's other decrees at once.
- 2026-11-23: **the meteor and the Fall (hard mode) kicked off** — bible `docs/ten-isles/fall.md`, brief
  `docs/ten-isles-fall-brief.md`. Engine built: beating the King sets `star-fell`; every dock then lists **Fallpoint**
  (the Ferryman rows; area `fallpoint`, `content/meteor/`, rides the Pinnacle bundle); the `meteor` POI takes 60 keys
  (the first key sink), then is the door into / out of the Fall. **Two worlds on one save**: `IslesSave.setFall` trades
  `encounters` / `princes` / `monarchs` + world flags with `shelf`, so every Cond works unchanged in the Fall; currencies,
  items, genes, quests, chests and waystones carry across. In the Fall each court's gate wants **ten** champions — its
  five plus `CourtBundle.fallen` (the Fallen Five: `fallen-<court>-<slug>`, star-scarred, full upgrades + mastery, +2 orbs
  each; `courtChampions`). Cond `{ fall }`; the King's hard extra phase is `king/fallen.ts` (act IV, the Fallen King);
  Fall win → `fall-won`, `art-fallen-star`, `cine-fall-end`. Validator: Fallen rules (five, ids, unique elements and
  fight names, spacing, hard smoke run), Fallpoint rules, and a `☄ Fallen Five: n/60` pending line. Content is being
  built in waves of one isle (6 court builders) + Fallpoint + the Fallen King.
- Hard mode reading of "10 encounters per court": the court's own five (already hard-tuned in every gimmick) **plus
  five new** — 300 new fights, not the 600 the Pillars line once said. A further five per court can be layered on later
  through the same `fallen` bundle if wanted.
- Not yet built: revolts / anarchy / dark market; online co-op.
