<!-- Brief handed to each parallel content builder. Fire Isle used it first; this copy is retargeted at Fangmire (Venom Isle). Update the isle-specific tables before reusing.
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

You are one of several parallel builders authoring **Fangmire (Venom Isle)** of the Ten Isles
campaign for *Elemental*, a Phaser 3 + TypeScript browser combat game (repo
`/home/kids/dev/elemental`). Brandmark (Fire Isle, `content/fire/`), the Drowned Reach (Water
Isle, `content/water/`), Thornwild (Life Isle, `content/life/`), Highspire (Air Isle, `content/air/`),
Bedrock Hold (Earth Isle, `content/earth/`) and Voltreach (Electricity Isle, `content/electricity/`) are already built; Thornwild is your **reference for shape, scale and quality** — copy its structure, never
any isle's ideas.

Read FIRST, and read nothing else for orientation:
- `docs/ten-isles.md` (the overview — short) and `docs/ten-isles/slime.md` (this isle: the world, names and the
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
- **Write ONLY inside your assigned folder.** Never edit any other file — other builders are working
  in parallel, and the engine owner is editing `src/isles/*` outside `content/`. You MAY import (read
  only) from `src/isles/art/`, `src/isles/IslesTypes.ts`, `src/boss/framework/*`, and helpers in the
  Fire/Water/Life/Air/Earth/Electricity Isle folders (e.g. `content/fire/genes/helpers.ts`). If a shared type is missing something, work
  around it inside your folder and mention it in your final report.
- Type-check with `cd /home/kids/dev/elemental && npx tsc --noEmit -p . 2>&1 | grep 'src/isles/content/slime/<your folder>'`
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
  copy-paste-with-renames. This is a venom isle beyond the Breakwater — a drowned jungle on a bottomless
  mire, mangroves on stilt-roots, black water steaming with marsh gas, white fangs of rock standing out of
  the swamp: a venom-milkers' fen of snake pits, a silk town in the canopy, a debtors' gaol-town of chains,
  an informers' town of masks and ear-trumpets, a town where no light reaches, an endless sinking
  churchyard — under a serpent Matriarch who rations the antidote. Let that show in every painter: wet
  greens, bruise purples and bone whites, things coiled and dripping, webs on everything, lamplight in murk.

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
- New in the contract for this isle: `WeatherKind` `'miasma' | 'drip' | 'gossamer' | 'murk' | 'wisps'`;
  `WorldGate.look` `'fang' | 'web' | 'chain' | 'shadow' | 'lychgate'`; `FisheryDef.kind` `'venom' | 'blackwater'`
  (both need the antivenin rod); `NpcHat` `'cowl'` (deep cowl, two eye-glints), `'plague'` (beaked plague mask
  under a wide brim), `'snake'` (a live serpent coiled round the head, head raised). Everything earlier
  (Voltreach's static/aurora/glow/flicker/balloons, cable/magnet/lead/rubber/phase, charged/coolant/quantum,
  antenna/hazmat/propeller; Earth's dust/sandstorm/grit/glints, boulder/crystal/kiln/dune/iron/tomb, sand/cavern,
  miner/headwrap/coif; Air's wind/clouds/feathers/stars/storm/dreams; Life's pollen/spores/petals/leaves/sugar/
  fireflies, thorn/roots/bone/candy, bog/syrup, wreath/antlers/mushroom; Water's spray/fog/bubbles/ink,
  ice/coral/sluice, diving/souwester; `conveyor look:'current'`; Fire's ash/embers/steam/smoke/sparks) is still
  available. The engine owner is drawing the new kinds in parallel — use them freely.
- Engine hooks to USE rather than fake (all in `docs/isles-api.md`): strike targets (`ctx.target` /
  `tk.spawnTarget` — anything a fighter should be able to hit: sacs, stones, spools, bubbles), `onPlayerCast` /
  `onNpcCast`, `*CooldownRate`, `ctx.airborne`, `ctx.facing`, `ctx.shotsNear` (block / reflect shots),
  `ctx.stun/root/silence` (never fake CC with speed mults), signature `takenMult` / `onBossHurt`, `drawLit`.
- The player avatar is ~22px radius at 0.62 scale; NPCs stand on their `at`; an interaction radius is ~70px.
- NPCs: every NPC needs several `talks` blocks keyed by state — at least: default, after your related
  quest is done, after the court's prince falls (`{ prince: '<id>' }`), after the King falls
  (`{ monarch: 'nyxa' }`). List most specific first. `barks` are 1-line ambient mutters, also by state.
  Dialogue is characterful (this is the world, not the workshop menus — the "business only" rule in
  CLAUDE.md applies to the old shop/lab menus, NOT to the Isles). Keep lines ≤ 110 characters each.
  The Matriarch's tyranny (the Mark — every child bitten by her at birth; the Draught — the antidote doled
  out at the Draught Houses each new moon, rationed by loyalty; the Moult-Tithe of skins, silk, venom and
  informations; the passed-over *go grey* and are carried to the Grave Court; spies paid in extra doses;
  debtors chained; any antidote not from her hand is contraband) should colour what ordinary people say.
- Quests: 5 per court, each with a giver NPC, 1–4 stages using the objective kinds in IslesTypes
  (talk / defeat / duel / fish / deliver / collect / visit / cook / prince) and ending in a fight. Rewards
  are mostly Orbs (8–12 on this isle), some coins/items. Small stories with personality, not
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
  the Regent's children governing for him). Tune HP by your court's tier (table below); keep every
  attack dodgeable with a telegraph.
- Items: each court sells 4 **charms** (`kind:'charm'`, permanent, 3 can be equipped) in its shop and
  drops 1 **artifact** from its prince (`kind:'artifact'`, id `art-<prince id>`). Every charm and the
  artifact gets a bespoke `script` (an `ItemScriptFactory` registered under the same id in `scripts`)
  that does something mechanically interesting (not "+5% damage"), optionally plus a small `effect`.
  Describe the script in `scriptText`. Prices: charms 340–1020 coins (seventh isle — dearer than
  Voltreach's); artifacts no price. All items `isle: 'slime'`.
- Fish: each court has one fishing water (`Poi kind:'water'`) with its own fishery and 2–3 fish (exact
  ids below). Fish are ALSO `IsleItemDef`s (`kind:'fish'`, same id) with a `sell` price and a small raw-meal
  `effect`. Fish `fight` 1–5 (how hard to reel).
- Your court's arena floor (`CourtDef.floor`) paints the 960×640 fight backdrop for all five encounters —
  make it look like a place in your court.

## Isle geography (exits must agree — use exactly these)
```
              [grave] (the Slough door at the north edge)
                 |
[web]----------[fang]----------[cloak]
  |              |               |
[shackle]---[stilthaven]------[umbral]
                (south is the sea)
```
| area | size | exits (side → to) |
|---|---|---|
| stilthaven | 2600×1500 | n→fang, w→shackle, e→umbral (south is the sea; mooring on the south boardwalk) |
| fang | 2400×1700 | s→stilthaven, n→grave, w→web, e→cloak |
| grave | 2400×1800 | s→fang; a `door` POI to `slough` at (1200,150), arrive (900,2440), open `{ princesOfIsle: 'slime', count: 6 }` |
| web | 2400×1600 | e→fang, s→shackle |
| shackle | 2400×1600 | n→web, e→stilthaven |
| cloak | 2400×1600 | w→fang, s→umbral |
| umbral | 2400×1600 | n→cloak, w→stilthaven |
| slough | 1800×2600 dungeon, walked from the tail (south) up to the head (north) | `door` at (900,2530) back to grave, arrive (1200,260); the nest at the top |

Exit `at` = default middle of the edge (keep it walkable). Every court also has: a `waystone` POI near
its entrance, the prince's hall/keep with a `prince` POI in front of it, a court shop NPC (`role:
{kind:'shop', id:'<court>-shop'}`), 6–10 named NPCs, and a `crowd` of wandering townsfolk with barks.

## Difficulty table (seventh isle — a step above Voltreach)
| court | tier | encounter difficulties | prince phase HP (p1/p2/hard p3) | prince damageMult | coins/encounter |
|---|---|---|---|---|---|
| fang | 1 | 3,4,4,4,4 | 470/550/400 | 1.15 | 90 |
| web | 2 | 4,4,4,5,5 | 500/580/420 | 1.25 | 100 |
| shackle | 2 | 4,4,4,5,5 | 510/590/430 | 1.25 | 100 |
| cloak | 3 | 4,5,5,5,5 | 530/620/450 | 1.3 | 110 |
| umbral | 3 | 4,5,5,5,5 | 540/630/460 | 1.35 | 115 |
| grave | 4 | 5,5,5,5,5 | 570/670/490 | 1.45 | 125 |
| slough wardens | 5 | 5,5,5 | — | — | 150 |

## Fixed fish ids (so bakeries can reference each other's catches)
- sea (fishery `stilthaven-sea`, kind 'sea'; port builder): `fish-mire-mullet`, `fish-fanged-herring`,
  `fish-viper-eel`, `fish-mudskipper`, `fish-black-grouper`, `fish-hydra-sturgeon` (rare, iron rod+)
- fang venom fen (`fang-fen`, 'venom' — antivenin rod): `fish-adder-minnow`, `fish-cobra-catfish`
- web silk pool (`web-pool`, 'bog'): `fish-spinner-shiner`, `fish-gossamer-goby`, `fish-silkfin`
- shackle chain moat (`shackle-moat`, 'pond'): `fish-shackle-shad`, `fish-irongill`
- cloak cistern (`cloak-cistern`, 'ink'): `fish-cipher-carp`, `fish-masked-minnow`, `fish-eavesdrop-eel`
- umbral shadow mere (`umbral-mere`, 'blackwater' — antivenin rod): `fish-shade-perch`, `fish-umbra-pike`, `fish-eclipse-eel`
- grave lych pool (`grave-pool`, 'blackwater' — antivenin rod): `fish-lych-bonefish`, `fish-wraith-roach`, `fish-coffinfish`
- Rods: `rod-driftwood` (sea, pond), `rod-iron` (… oil, ice, ink, bog), `rod-obsidian` (… + lava),
  `rod-whalebone` (… + abyss), `rod-briarwood` (… + syrup), `rod-skyline` (… + cloud, aurora), `rod-delver`
  (every kind except lava, incl. sand, cavern), `rod-insulated` (… + charged, coolant, quantum) already exist.
  The port builder adds `rod-antivenin` (every kind except lava, incl. 'venom' and 'blackwater'; control 2.5),
  sold at Stilthaven's tackle shop.

## Shared ids other builders rely on
- Isle id `slime`. Monarch id `nyxa` (Matriarch Nyxa Coilborne, artifact `art-nyxa`). Prince ids:
  `venin` (fang), `weft` (web), `fetter` (shackle), `whisper` (cloak), `dusk` (umbral), `mortis` (grave).
  Court ids = area ids.
- Wanderer: Tansy Rue, the hedge-apothecary, with her mongoose Pestle (port builder writes all her lines,
  including ones for every area).
- Bakeries: port *The Honeyed Fang* (`stilthaven-bakery`, port builder); *The Charmer's Basket*
  (`fang-basket`, fang builder). Recipes may use any fish id above.
- Flag naming: `<court>-<thing>`.

## Exports (the engine owner wires these — use exactly these names)
- Court builder: `content/slime/courts/<court>/index.ts` exports `<COURT>_COURT: CourtBundle`
  (`FANG_COURT`, `WEB_COURT`, `SHACKLE_COURT`, `CLOAK_COURT`, `UMBRAL_COURT`, `GRAVE_COURT`).
- Port builder: `content/slime/isle/port/index.ts` exports `SLIME_PORT: PortBundle`
  (`floor` is the arena backdrop for Stilthaven's quest duels; those foes carry `court: 'stilthaven'`). The
  Stilthaven `mooring` POI is `{ kind: 'mooring', at, isle: 'slime' }`.
- Dungeon builder: `content/slime/isle/slough/index.ts` exports `SLIME_DUNGEON: DungeonBundle`
  (wardens are `EncounterDef`s with `court: 'slough'`; `floor` is registered under key `slough`).
- Genes builder: `content/slime/genes/index.ts` exports `SLIME_GENES: GeneTree[]` (slime, death, shadow,
  bind, subterfuge, string). Read each element's CURRENT element + kit files (never trust old memories).
  Ids: `slime` is Venom.

## Final report (keep it short)
List the files you wrote, every exported symbol the engine must import, anything in the contract you had
to work around, and anything unfinished. Do not paste code.
