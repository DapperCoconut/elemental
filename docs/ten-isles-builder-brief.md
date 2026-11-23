<!-- Brief handed to each parallel content builder. Fire Isle used it first; this copy is retargeted at Solmara (Light Isle). Update the isle-specific tables before reusing.
Kickoff checklist for the engine owner (before launching builders) — follow it instead of diffing the last
isle to re-learn the wiring. Write `docs/ten-isles/<isle>.md`; retarget
this brief (every `<isle>`/`air` path, the tables below); write `content/<isle>/{index,isle/index}.ts`; drop a
placeholder `index.ts` (`content/placeholder.ts`: placeholderCourt / placeholderPort / placeholderDungeon, genes
`[]`) into every builder folder; add the isle to `BUNDLES`; confirm `node .check-isles.mjs` runs. Engine per isle: new
WeatherKind/gate/hat/fishery members in IslesTypes + their drawing (IsleWorldScene drawWeather / gates, NpcArt drawHat,
Fishing WATER_TINT + rod message), BEASTS entry + uber in SeaVoyageScene, ISLE_LAYOUT + landmark in IslesMapScene,
DUNGEON_CATCH in IsleWorldScene. All builders on Opus (`model: "opus"` — the user's preset) (the genes builder's engine findings — refused casts
firing gene rules — are worth the cost). If the engine changed since the last isle, update `docs/isles-api.md`
first. Update the reference reading lists if the reference isle changes. -->
# Ten Isles — content builder brief (shared by every builder)

You are one of several parallel builders authoring **Solmara (Light Isle)** of the Ten Isles
campaign for *Elemental*, a Phaser 3 + TypeScript browser combat game (repo
`/home/kids/dev/elemental`). Brandmark (Fire Isle, `content/fire/`), the Drowned Reach (Water
Isle, `content/water/`), Thornwild (Life Isle, `content/life/`), Highspire (Air Isle, `content/air/`),
Bedrock Hold (Earth Isle, `content/earth/`), Voltreach (Electricity Isle, `content/electricity/`), Fangmire (Venom
Isle, `content/slime/`), Lotterhaven (Fate Isle, `content/fate/`) and Choirholm (Sound Isle, `content/sound/`) are already built; Thornwild is your **reference for shape, scale and quality** — copy its structure, never
any isle's ideas.

Read FIRST, and read nothing else for orientation:
- `docs/ten-isles.md` (the overview — short) and `docs/ten-isles/light.md` (this isle: the world, names and the
  concept for every fight — your spec).
- `docs/isles-api.md` — the API cheat sheet: every content shape, the BossToolkit, boss defs/looks, IsleArt
  helpers and the gotchas. Open the framework source (`src/isles/IslesTypes.ts`, `src/boss/framework/*`,
  `src/isles/art/IsleArt.ts`) only for a specific question the cheat sheet does not answer.
- Your job's reference reading list (below) — a finished example of exactly what you write. Read those
  files and line ranges only; do not read whole reference folders, other isles' docs, or CLAUDE.md (its
  rules are for the combat engine; everything that applies to you is in this brief).
Code exploration: this project has tokensave (`tokensave_context`, `tokensave_search`) — prefer it over
grepping blind.

### Reference reading lists (Thornwild, `src/isles/content/life/`)
- **Court builder** (`courts/bloom/`): `index.ts`, `encounters.ts`, `area.ts` lines 1–120 and 372–end (constants,
  solids, the AreaDef), `gimmicks/pollenCount.ts` (one whole gimmick), `prince.ts` lines 1–200 and 577–end (two
  signatures + the WorldBossDef), `quests.ts`, `items.ts` lines 1–100 and 268–end, `floor.ts`, `npcs.ts` lines
  1–120 and 444–end (two NPCs + the crowd), and `art.ts` lines 294–382 and 600–666 (the topiary and the
  orangery — the **detail bar**: every set piece you draw should be at least this layered; read the rest of
  `art.ts` only if you want more).
- **Port builder** (`isle/port/`): `index.ts`, `fishing.ts`, `quests.ts`, `mossgate.ts` lines 1–60, 308–400 and
  890–end, `people.ts` lines 1–140 and 426–end, `wanderer.ts` lines 1–170, `items.ts` lines 1–90 and 652–end,
  `floor.ts`, and the detail bar: `courts/bloom/art.ts` lines 294–382 and 600–666.
- **Dungeon builder** (`isle/glasshouse/`): `index.ts`, `area.ts` lines 1–200 and 868–end, `wardens.ts` lines
  1–242 and 640–end (one whole warden gimmick + the defs), `verdigra.ts` lines 1–170 and 1686–end (helpers, one
  signature + the WorldBossDef), `items.ts`, `floor.ts`, and the detail bar: `courts/bloom/art.ts` lines
  294–382 and 600–666.
- **Genes builder** (`genes/`): `index.ts`, `life.ts`, and `src/isles/content/fire/genes/helpers.ts`.

## Working economically
- Write each file whole in one go; don't build a file up through many small edits.
- Type-check once per batch of files, not after every file. Run the validator when your bundle is complete,
  then again after fixes.
- Don't re-read a file you just wrote to check it — the tools would have errored if a write failed.

## Hard rules
- **Build only YOUR court's five encounters** — the five names under your court's heading in the bible (a
  Choirholm builder once built a neighbour court's fight by mistake).
- **Write ONLY inside your assigned folder.** Never edit any other file — other builders are working
  in parallel, and the engine owner is editing `src/isles/*` outside `content/`. You MAY import (read
  only) from `src/isles/art/`, `src/isles/IslesTypes.ts`, `src/boss/framework/*`, and helpers in the
  Fire/Water/Life/Air/Earth/Electricity/Venom/Fate/Sound Isle folders (e.g. `content/fire/genes/helpers.ts`). If a shared type is missing something, work
  around it inside your folder and mention it in your final report.
- Type-check with `cd /home/kids/dev/elemental && npx tsc --noEmit -p . 2>&1 | grep 'src/isles/content/light/<your folder>'`
  — the whole project may show errors from other builders' unfinished folders; only YOUR files must
  be clean. Do not run `npm run build`. Do NOT commit. No browser testing.
- **Validate with the real validator only:** `node .check-isles.mjs --only <your court/area id>`. The isle is
  already registered: your folder starts with a placeholder `index.ts` (from `content/placeholder.ts`) —
  replace it with your real bundle (same export name). The validator skips placeholders and lists the ones
  still standing; errors naming ids another builder owns (their fish, their area) clear when they land —
  ignore those. **Never write your own validation harness or scratch checker** — if the validator misses
  something you need checked, say so in your final report instead.
- TypeScript strict mode. Match the codebase style: explanatory doc comments on each def/move
  (as in your reference files), no `any`.
- `tk.sfx(name)` / `ctx.sfx(name)` names MUST be from this list (anything else is silently dropped):
  hit-light hit-medium hit-heavy crit shield-block shield-break heal dash whoosh land explosion-small
  explosion-medium explosion-large status-burn status-freeze status-shock status-poison status-slow
  status-stun status-buff status-debuff fireball flame-burst inferno water-jet splash geyser rain bubble
  gust tornado beam-charge beam-fire rock-throw quake stone-slam stone-rise thorn spore ice-shard
  frost-blast ice-shatter zap thunder electric-charge plasma-arc chaos clang slash stab chain anvil
  gravity-slam meteor light-beam blink crystal-chime crystal-shatter prism portal teleport sonic-pulse
  screech drum-hit musket shotgun reload roar grenade-throw trap-set trap-snap sizzle slime-splat whip
  oil-splash engine drone-buzz train-horn magnet-pull glitch clock-tick time-warp dice jackpot sparkle
  curse-cast boing snap-back hush heartbeat money smoke judgement holy-chord wings hammer-forge
  gear-turn mortar-launch boss-intro boss-phase countdown-tick countdown-go
- Element ids (for foes): fire water life air earth oil shadow ice growth crystal soul hunt sand(=Time)
  gravity creation electricity slime(=Venom) fate sound light magnet metal plasma gunpowder rubber magic
  technology silence echo subterfuge quantum justice dream chalk(=Paint) magma wax clay illusion depths
  ruin dune(=Sand) conquest passion(=Devotion) paper death fortune(=Gold) cloth marrow tempest myth
  psychic radiation bind gum(=Savor) gluttony(=Wood) pressure astra memory string ink.
- **Quality bar: the user explicitly asked for painstaking uniqueness.** Every gimmick must be its own
  idea with its own art; every boss attack must look different; the area must look nothing like the
  other courts (or like any court of an earlier isle). No placeholder content, no "TODO", no
  copy-paste-with-renames. This is the isle of the Endless Noon beyond the Breakwater — a white limestone isle of
  terraced marble towns, glass roofs and gilded domes under a sun pinned straight overhead by the Heliostat, an iron
  crown of tilting mirrors on the summit: a blinding sun-plaza with the Burning Glass, a glass courthouse where
  shade-thieves are tried, a gorge strung with thousands of soul-lanterns, a mages' town of sigil circles and a
  spring of liquid light, an artificers' town of lens-grinders and glassblowers, and a painters' town where every
  wall is a mural of the Despot — under a tyrant who abolished darkness. Let that show in every painter: white
  marble and gold leaf, glare and hard tiny shadows, mirrors and lenses throwing beams and caustics, leaded glass,
  pale-blue soul-light, chalked sigils and runes, brass instruments and blueprints, wet paint and pigment; things
  shining, focusing, reflecting and burning.

## Rules the validator enforces (`node .check-isles.mjs --only <your id>` — run it as you go)
- **Every side quest ends with a fight**: its last stage is a `duel` (a quest-only foe written inline
  as an `EncounterDef` — see `QuestObjective` in IslesTypes and any Fire Isle `quests.ts`), a `defeat`
  of one of your champions, or a `prince` stage. A duel foe's `court` is your court id, its `id` is
  globally unique (prefix it), it has `challenge` + `beaten` lines, and `gimmick` may be `''` (a straight
  fight) or one of your gimmick ids (it MAY reuse one of your five).
- **No element fights twice in one court**: your 5 champions (fixed by the bible) plus every duel foe
  in your quests must all have different `foeElement`s.
- **5 quests per court** — exactly five; the user does not want more.
- Exits pair up (side ↔ opposite side), POIs in bounds, every NPC has talks, every shop stock item has
  a price, every charm/artifact has a registered script.
- **Reachability**: every NPC, champion, duel foe, POI, collect/visit spot and door arrival can be reached from
  walkable ground (player radius 11, talk reach 70, pickup reach 28); spawns and door arrivals are walkable
  themselves; each exit's edge strip (140 wide × 120 deep) is free of solids. Errors name the nearest walkable point.
- **Dialogue length**: world lines > 110 chars warn, > 140 error.
- **Every gimmick does something** in a 40 s simulated fight (bot follows your `npcSeek`, the player pauses at
  stations round the arena) — a warning names any rule that never spawned, hit, pushed, CC'd, spoke or
  shifted a multiplier. Every painter, gimmick, item script and boss signature is also smoke-run (Phaser
  stubbed, Phaser.Math real).

## Conventions
- Arena (fights) is 960×640 logical; the HUD owns y < 96 (`ctx.top`). Player walk speed ≈ 200 px/s.
- Ids are global — prefix everything with your court id (`bloom-…`) except where this brief fixes ids.
- World area: draw ground in `painter.ground` (baked once). Buildings/ships/machines go in
  `painter.pieces` (each piece is drawn once at depth = its `y`, so `y` is its base/feet line; `w`/`h`
  are the piece's bounding box size for culling, measured up from the base). Animated bits in `animate`
  (under actors; t in SECONDS) / `animateOver` (over actors) — they are called every frame, so only draw
  what is inside `view` and keep them light. Solids: give every building/rock a collision rect/circle
  at its base footprint (NOT the full drawn height). Keep paths between POIs walkable; keep each exit
  gate's edge strip (140px wide around the exit's `at`, 120px deep) clear of solids.
- New in the contract for this isle: `WeatherKind` `'sunbeams' | 'glare' | 'lanterns' | 'sigils' | 'prisms' |
  'pigment'` (slanting god-rays with dust glinting in them; a white heat-glare overlay that blooms and shimmers;
  paper sky-lanterns drifting up glowing; glowing runes drifting and slowly turning; rainbow caustics and prism
  flecks dancing; puffs of coloured pigment powder drifting); `WorldGate.look` `'mirror' | 'sunbar' | 'lanterns' |
  'sigil' | 'lens' | 'scaffold'` (a tall gilt-framed mirror wall; bars of solid sunlight; a curtain of hanging
  soul-lanterns; a glowing sigil circle standing on edge; a great lens in a brass ring on a stand; painters'
  scaffolding hung with dust-sheets); `FisheryDef.kind` `'sunpool' | 'mana'` (a pool too bright to look into, its
  fish only dark shapes; a spring of liquid light whose fish are made of runes — both need the prism rod);
  `NpcHat` `'wig'` (a judge's long white curled wig), `'beret'` (a painter's floppy beret, paint-flecked),
  `'wizard'` (a tall pointed star-spangled hat).
  Everything earlier (Choirholm's notes/glowworms/lull/sequins/incense/pages, pipes/bell/curtain/stalactite/
  stainedglass/scroll, resonant/still, bandmaster/domino/earmuffs; Lotterhaven's cards/confetti/goldleaf/sandfall/sepia/ripples, dice/vault/clock/locket/eye/
  palisade, gilded/lethe, visor/jester/shako; Fangmire's miasma/drip/gossamer/murk/wisps, fang/web/chain/shadow/
  lychgate, venom/blackwater, cowl/plague/snake; Voltreach's static/aurora/glow/flicker/balloons, cable/magnet/lead/
  rubber/phase, charged/coolant/quantum, antenna/hazmat/propeller; Earth's dust/sandstorm/grit/glints, boulder/
  crystal/kiln/dune/iron/tomb, sand/cavern, miner/headwrap/coif; Air's wind/clouds/feathers/stars/storm/dreams;
  Life's pollen/spores/petals/leaves/sugar/fireflies, thorn/roots/bone/candy, bog/syrup, wreath/antlers/mushroom;
  Water's spray/fog/bubbles/ink, ice/coral/sluice, diving/souwester; `conveyor look:'current'`; Fire's ash/embers/
  steam/smoke/sparks; hats like tophat/crown/veil/plume/mitre) is still available. The engine owner is drawing
  the new kinds in parallel — use them freely.
- Engine hooks to USE rather than fake (all in `docs/isles-api.md`): strike targets (`ctx.target` /
  `tk.spawnTarget` — anything a fighter should be able to hit: sacs, stones, spools, bubbles), `onPlayerCast` /
  `onNpcCast`, `*CooldownRate`, `ctx.airborne`, `ctx.facing`, `ctx.shotsNear` (block / reflect shots),
  `ctx.stun/root/silence` and `tk.stun/root/silence` (never fake CC with speed mults), `ctx.dashing(f)` (any
  dash/blink/leap — never read speeds), `tk.spawnBullet({ hits: [...] })` (bullets that can strike the bot —
  turrets, flung souls; default is player-only), `tk.phase` (signatures: the current phase), signature
  `takenMult` / `onBossHurt`, `drawLit` + `tk.dark` (darkness — this isle's light shows best against it).
- The player avatar is ~22px radius at 0.62 scale; NPCs stand on their `at`; an interaction radius is ~70px.
- NPCs: every NPC needs several `talks` blocks keyed by state — at least: default, after your related
  quest is done, after the court's prince falls (`{ prince: '<id>' }`), after the King falls
  (`{ monarch: 'auriel' }`). List most specific first. `barks` are 1-line ambient mutters, also by state.
  Dialogue is characterful (this is the world, not the workshop menus — the "business only" rule in
  CLAUDE.md applies to the old shop/lab menus, NOT to the Isles). Keep lines ≤ 110 characters each.
  The Despot's tyranny (the Endless Noon — the sun pinned overhead for twenty-two years, no night, no shade, no
  stars; Clarity — everything must be seen: glass doors, no curtains, shutters nailed open; Dusk Tickets — one
  licensed hour of shade a day in a Dusk-house, queues and a clerk with a stopwatch; shade-thieves tried at the
  Tribunal and bleached in the Burning Glass into Clears — translucent, shadowless people made to walk the
  streets; even the dead caught in lanterns so they never lie in the dark) should colour what ordinary people
  say — squinting, sunburnt, sleepless, longing for a cloud; nobody young has seen a star.
- Quests: 5 per court, each with a giver NPC, 1–4 stages using the objective kinds in IslesTypes
  (talk / defeat / duel / fish / deliver / collect / visit / cook / prince) and ending in a fight. Rewards
  are mostly Orbs (11–15 on this isle), some coins/items. Small stories with personality, not
  fetch-lists. A `collect` stage's spots must be in walkable places in the named area. Stage hints are
  tracker text.
- Fights: `EncounterDef.at` is where the champion stands in your area (spread them across the area,
  along paths). `look` is used for the dialogue portrait. `challenge`/`beaten` are world lines.
- Gimmicks (`GimmickDef`): `make(ctx)` returns an `EncounterGimmick` (`update(time ms, dt SECONDS)`).
  Use `ctx.tk` (BossToolkit, with the foe as the "boss" — `tk.bossX/bossY` are the foe's position) for
  bullets/zones/lanes/rings/pools, `ctx.hit(fighter, n)` for custom damage to either side, `ctx.nudge`
  for pushes (never write velocity), `playerSpeedMult/npcSpeedMult/playerTakenMult/npcTakenMult` for
  pulled multipliers, `npcSeek()` so the bot actually plays the rule, `onPlayerHurt/onNpcHurt` hooks,
  `drawGround/drawAir/drawHud` for art (drawHud is screen-space). Make the rule readable: telegraph
  everything, name things on screen (`ctx.float`, `ctx.banner`). Most rules should be *exploitable by
  the player* — a clever player turns the rule on the foe. Gimmick `rules` text is the one line on the
  fight card. Aim ~150–300 lines per gimmick.
- Prince = `WorldBossDef` with `worldId: 'isle:<prince id>'`, two DISTINCT phases (different movement
  style, gimmick, cycle, palette tint/look) plus `hard.extraPhase` as the third, ≥3 bespoke signatures
  that look nothing like any earlier isle's prince's, a `look` + `drawDecor` that makes the silhouette
  unmistakable, and `drawArena` for a bespoke floor. Intro/banter/defeat lines in character (they are
  the Despot's "Radiances" governing for him). Tune HP by your court's tier (table below); keep every
  attack dodgeable with a telegraph.
- Items: each court sells 4 **charms** (`kind:'charm'`, permanent, 3 can be equipped) in its shop and
  drops 1 **artifact** from its prince (`kind:'artifact'`, id `art-<prince id>`). Every charm and the
  artifact gets a bespoke `script` (an `ItemScriptFactory` registered under the same id in `scripts`)
  that does something mechanically interesting (not "+5% damage"), optionally plus a small `effect`.
  Describe the script in `scriptText`. Prices: charms 420–1200 coins (tenth isle — dearer than
  Choirholm's); artifacts no price. All items `isle: 'light'`.
- Fish: each court has one fishing water (`Poi kind:'water'`) with its own fishery and 2–3 fish (exact
  ids below). Fish are ALSO `IsleItemDef`s (`kind:'fish'`, same id) with a `sell` price and a small raw-meal
  `effect`. Fish `fight` 1–5 (how hard to reel).
- Your court's arena floor (`CourtDef.floor`) paints the 960×640 fight backdrop for all five encounters —
  make it look like a place in your court.

## Isle geography (exits must agree — use exactly these)
```
                 [tribunal] (the Heliostat door at the north edge)
                   |
[lantern]-------[noon]---------[workshop]
     |             |               |
[mural]-------[meridian]--------[arcane]
                (south is the sea)
```
| area | size | exits (side → to) |
|---|---|---|
| meridian | 2600×1500 | n→noon, w→mural, e→arcane (south is the sea; mooring on the south quay) |
| noon | 2400×1700 | s→meridian, n→tribunal, w→lantern, e→workshop |
| tribunal | 2400×1800 | s→noon; a `door` POI to `heliostat` at (1200,150), arrive (900,2440), open `{ princesOfIsle: 'light', count: 6 }` |
| lantern | 2400×1600 | e→noon, s→mural |
| mural | 2400×1600 | n→lantern, e→meridian |
| workshop | 2400×1600 | w→noon, s→arcane |
| arcane | 2400×1600 | n→workshop, w→meridian |
| heliostat | 1800×2600 dungeon, climbed from its base (south) up to the Crown (north) | `door` at (900,2530) back to tribunal, arrive (1200,260); the Crown at the top |

Exit `at` = default middle of the edge (keep it walkable). Every court also has: a `waystone` POI near
its entrance, the prince's hall/keep with a `prince` POI in front of it, a court shop NPC (`role:
{kind:'shop', id:'<court>-shop'}`), 6–10 named NPCs, and a `crowd` of wandering townsfolk with barks.

## Difficulty table (tenth isle — a step above Choirholm)
| court | tier | encounter difficulties | prince phase HP (p1/p2/hard p3) | prince damageMult | coins/encounter |
|---|---|---|---|---|---|
| noon | 1 | 4,4,5,5,5 | 530/610/450 | 1.3 | 110 |
| lantern | 2 | 5,5,5,5,5 | 560/640/480 | 1.4 | 120 |
| mural | 2 | 5,5,5,5,5 | 570/650/490 | 1.4 | 120 |
| workshop | 3 | 5,5,5,5,5 | 590/680/510 | 1.45 | 130 |
| arcane | 3 | 5,5,5,5,5 | 600/690/520 | 1.5 | 135 |
| tribunal | 4 | 5,5,5,5,5 | 630/730/550 | 1.6 | 145 |
| heliostat wardens | 5 | 5,5,5 | — | — | 180 |

## Fixed fish ids (so bakeries can reference each other's catches)
- sea (fishery `meridian-sea`, kind 'sea'; port builder): `fish-glint-herring`, `fish-mirror-mackerel`, `fish-noonfish`,
  `fish-beacon-bass`, `fish-halo-skate`, `fish-solar-swordfish` (rare, iron rod+)
- noon reflecting pool (`noon-pool`, 'sunpool' — prism rod): `fish-blaze-bream`, `fish-glare-goby`, `fish-zenith-koi`
- tribunal fountain (`tribunal-fountain`, 'pond'): `fish-gavel-gar`, `fish-bail-barbel`
- lantern lake (`lantern-lake`, 'lethe'): `fish-wick-loach`, `fish-soul-carp`, `fish-ghostlight-pike`
- arcane font (`arcane-font`, 'mana' — prism rod): `fish-rune-trout`, `fish-hex-eel`, `fish-wyrd-wrasse`
- workshop quench tank (`workshop-tank`, 'steam'): `fish-brass-bleak`, `fish-gear-gudgeon`, `fish-lens-loach`
- mural pigment river (`mural-river`, 'ink'): `fish-palette-perch`, `fish-umber-eel`, `fish-vermilion-snapper`
- Rods: `rod-driftwood` (sea, pond), `rod-iron` (… oil, ice, ink, bog), `rod-obsidian` (… + lava),
  `rod-whalebone` (… + abyss), `rod-briarwood` (… + syrup), `rod-skyline` (… + cloud, aurora), `rod-delver`
  (every kind except lava, incl. sand, cavern), `rod-insulated` (… + charged, coolant, quantum), `rod-antivenin`
  (… venom, blackwater), `rod-fortune` (… gilded, lethe), `rod-tuning` (… resonant, still) already exist. The port
  builder adds `rod-prism` (every kind except lava, incl. 'sunpool' and 'mana'; control 2.8), sold at Meridian
  Quay's tackle shop.

## Shared ids other builders rely on
- Isle id `light`. Monarch id `auriel` (Despot Auriel, artifact `art-auriel`). Prince ids:
  `lumen` (noon), `verdict` (tribunal), `wisp` (lantern), `sigil` (arcane), `artifex` (workshop),
  `hue` (mural). Court ids = area ids.
- Wanderer: Sable Merrow, the bleached lighthouse-keeper (a Clear — draw her translucent, no shadow), with her
  luna moth Nocturne (port builder writes all her lines, including ones for every area).
- Bakeries: port *The Golden Crust* (`meridian-bakery`, port builder); *The Sunrise Bun* (`noon-bun`, noon
  builder). Recipes may use any fish id above.
- Flag naming: `<court>-<thing>`.

## Exports (the engine owner wires these — use exactly these names)
- Court builder: `content/light/courts/<court>/index.ts` exports `<COURT>_COURT: CourtBundle`
  (`NOON_COURT`, `TRIBUNAL_COURT`, `LANTERN_COURT`, `ARCANE_COURT`, `WORKSHOP_COURT`, `MURAL_COURT`).
- Port builder: `content/light/isle/port/index.ts` exports `LIGHT_PORT: PortBundle`
  (`floor` is the arena backdrop for Meridian Quay's quest duels; those foes carry `court: 'meridian'`). The
  Meridian `mooring` POI is `{ kind: 'mooring', at, isle: 'light' }`.
- Dungeon builder: `content/light/isle/heliostat/index.ts` exports `LIGHT_DUNGEON: DungeonBundle`
  (wardens are `EncounterDef`s with `court: 'heliostat'`; `floor` is registered under key `heliostat`).
- Genes builder: `content/light/genes/index.ts` exports `LIGHT_GENES: GeneTree[]` (light, justice, soul,
  magic, creation, chalk). Read each element's CURRENT element + kit files (never trust old memories).
  Ids: `chalk` is Paint.

## Final report (keep it short)
List the files you wrote, every exported symbol the engine must import, anything in the contract you had
to work around, and anything unfinished. Do not paste code.
