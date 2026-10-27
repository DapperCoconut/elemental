<!-- Brief handed to each parallel content builder. Fire Isle used it first; this copy is retargeted at Highspire (Air Isle). Update the isle-specific tables before reusing.
Kickoff checklist for the engine owner (before launching builders) — follow it instead of diffing the last
isle to re-learn the wiring. Write `docs/ten-isles/<isle>.md`; retarget
this brief (every `<isle>`/`air` path, the tables below); write `content/<isle>/{index,isle/index}.ts`; drop a
placeholder `index.ts` (`content/placeholder.ts`: placeholderCourt / placeholderPort / placeholderDungeon, genes
`[]`) into every builder folder; add the isle to `BUNDLES`; confirm `node .check-isles.mjs` runs. Engine per isle: new
WeatherKind/gate/hat/fishery members in IslesTypes + their drawing (IsleWorldScene drawWeather / gates, NpcArt drawHat,
Fishing WATER_TINT + rod message), BEASTS entry + uber in SeaVoyageScene, ISLE_LAYOUT + landmark in IslesMapScene,
DUNGEON_CATCH in IsleWorldScene. All builders on the default model (the genes builder's engine findings — refused casts
firing gene rules — are worth the cost). If the engine changed since the last isle, update `docs/isles-api.md`
first. Update the reference reading lists if the reference isle changes. -->
# Ten Isles — content builder brief (shared by every builder)

You are one of several parallel builders authoring **Highspire (Air Isle)** of the Ten Isles
campaign for *Elemental*, a Phaser 3 + TypeScript browser combat game (repo
`/home/kids/dev/elemental`). Brandmark (Fire Isle, `content/fire/`), the Drowned Reach (Water
Isle, `content/water/`) and Thornwild (Life Isle, `content/life/`) are already built and are your
**reference for shape, scale and quality** — copy their structure, never their ideas.

Read FIRST, and read nothing else for orientation:
- `docs/ten-isles.md` (the overview — short) and `docs/ten-isles/air.md` (this isle: the world, names and the
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
  Fire/Water/Life Isle folders (e.g. `content/fire/genes/helpers.ts`). If a shared type is missing something, work
  around it inside your folder and mention it in your final report.
- Type-check with `cd /home/kids/dev/elemental && npx tsc --noEmit -p . 2>&1 | grep 'src/isles/content/air/<your folder>'`
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
  other courts (or like any Fire, Water or Life Isle court). No placeholder content, no "TODO", no
  copy-paste-with-renames. This is a sky isle — one needle of rock through the clouds: windmills and
  kites, sleep and dreams, a storybook town, floating orrery islets, a walled storm-eye, an observatory
  above the clouds at night — under a tyrant who meters and taxes every breath. Let that show in every
  painter: big skies, drops into cloud, wind you can see.

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
- New in the contract for this isle: `WeatherKind` `'wind' | 'clouds' | 'feathers' | 'stars' | 'storm' |
  'dreams'`; `WorldGate.look` `'cloud' | 'lightning' | 'orrery' | 'veil' | 'book'`; `FisheryDef.kind`
  `'cloud' | 'aurora'` (both need the skyline rod); `NpcHat` `'aviator'` (flying cap + goggles),
  `'nightcap'`, `'plume'` (soft cap with a long feather). Everything earlier (Life's pollen/spores/petals/
  leaves/sugar/fireflies weathers, thorn/roots/bone/candy gates, bog/syrup fisheries, wreath/antlers/
  mushroom hats; Water's spray/fog/bubbles/ink, ice/coral/sluice, diving/souwester; `conveyor
  look:'current'`) is still available.
- The player avatar is ~22px radius at 0.62 scale; NPCs stand on their `at`; an interaction radius is ~70px.
- NPCs: every NPC needs several `talks` blocks keyed by state — at least: default, after your related
  quest is done, after the court's prince falls (`{ prince: '<id>' }`), after the King falls
  (`{ monarch: 'aerion' }`). List most specific first. `barks` are 1-line ambient mutters, also by state.
  Dialogue is characterful (this is the world, not the workshop menus — the "business only" rule in
  CLAUDE.md applies to the old shop/lab menus, NOT to the Isles). Keep lines ≤ 110 characters each.
  The King's tyranny (the Breath Tax: a brass breath-meter on every chest, every breath above the cloud
  line metered; debtors *becalmed* — their breath corked into bottles carried up to the Lung, and they
  laid down asleep, barely breathing) should colour what ordinary people say.
- Quests: 5 per court, each with a giver NPC, 1–4 stages using the objective kinds in IslesTypes
  (talk / defeat / duel / fish / deliver / collect / visit / cook / prince) and ending in a fight. Rewards
  are mostly Orbs (5–9 on this isle), some coins/items. Small stories with personality, not
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
  that look nothing like any Fire, Water or Life Isle prince's, a `look` + `drawDecor` that makes the silhouette
  unmistakable, and `drawArena` for a bespoke floor. Intro/banter/defeat lines in character (they are
  the King's children governing for him). Tune HP by your court's tier (table below); keep every
  attack dodgeable with a telegraph.
- Items: each court sells 4 **charms** (`kind:'charm'`, permanent, 3 can be equipped) in its shop and
  drops 1 **artifact** from its prince (`kind:'artifact'`, id `art-<prince id>`). Every charm and the
  artifact gets a bespoke `script` (an `ItemScriptFactory` registered under the same id in `scripts`)
  that does something mechanically interesting (not "+5% damage"), optionally plus a small `effect`.
  Describe the script in `scriptText`. Prices: charms 240–800 coins (fourth isle — dearer than
  Thornwild's); artifacts no price. All items `isle: 'air'`.
- Fish: each court has one fishing water (`Poi kind:'water'`) with its own fishery and 2–3 fish (exact
  ids below). Fish are ALSO `IsleItemDef`s (`kind:'fish'`, same id) with a `sell` price and a small raw-meal
  `effect`. Fish `fight` 1–5 (how hard to reel).
- Your court's arena floor (`CourtDef.floor`) paints the 960×640 fight backdrop for all five encounters —
  make it look like a place in your court.

## Isle geography (exits must agree — use exactly these)
```
                 [starfall] (the Lung door at the summit — north)
                     |
[slumber]-------[galeward]------[stormeye]
    |                |                |
[fable]---------[windlass]------[orbit]
                (south is the sea)
```
| area | size | exits (side → to) |
|---|---|---|
| windlass | 2600×1500 | n→galeward, w→fable, e→orbit (south is the sea; mooring on the south quay) |
| galeward | 2400×1700 | s→windlass, n→starfall, w→slumber, e→stormeye |
| starfall | 2400×1800 | s→galeward; a `door` POI to `lung` (open: `{ princesOfIsle: 'air', count: 6 }`) near the north edge |
| slumber | 2400×1600 | e→galeward, s→fable |
| fable | 2400×1600 | n→slumber, e→windlass |
| stormeye | 2400×1600 | w→galeward, s→orbit |
| orbit | 2400×1600 | n→stormeye, w→windlass |
| lung | 1800×2600 dungeon | `door` back to starfall |

Exit `at` = default middle of the edge (keep it walkable). Every court also has: a `waystone` POI near
its entrance, the prince's manor/keep with a `prince` POI in front of it, a court shop NPC (`role:
{kind:'shop', id:'<court>-shop'}`), 6–10 named NPCs, and a `crowd` of wandering townsfolk with barks.

## Difficulty table (fourth isle — a step above Thornwild)
| court | tier | encounter difficulties | prince phase HP (p1/p2/hard p3) | prince damageMult | coins/encounter |
|---|---|---|---|---|---|
| galeward | 1 | 3,3,3,3,4 | 400/480/350 | 1.0 | 65 |
| slumber | 2 | 3,3,4,4,4 | 430/510/370 | 1.1 | 75 |
| fable | 2 | 3,4,4,4,4 | 440/520/380 | 1.1 | 75 |
| orbit | 3 | 4,4,4,4,5 | 460/550/400 | 1.15 | 85 |
| stormeye | 3 | 4,4,4,5,5 | 470/560/400 | 1.2 | 90 |
| starfall | 4 | 4,5,5,5,5 | 500/600/430 | 1.3 | 100 |
| lung wardens | 5 | 5,5,5 | — | — | 125 |

## Fixed fish ids (so bakeries can reference each other's catches)
- sea (fishery `windlass-sea`, kind 'sea'; port builder): `fish-gull-herring`, `fish-cliff-cod`,
  `fish-spindrift-mackerel`, `fish-ledge-lobster`, `fish-sky-tuna`, `fish-windborne-marlin` (rare, iron rod+)
- galeward cloud edge (`galeward-cloudbank`, 'cloud' — skyline rod): `fish-cirrus-sprat`, `fish-gale-flyingfish`
- slumber Lake of Nod (`slumber-lake`, 'pond'): `fish-dozing-carp`, `fish-nightmare-pike`, `fish-lullaby-loach`
- fable castle moat (`fable-moat`, 'pond'): `fish-wishing-carp`, `fish-bard-bass`
- orbit moonpool (`orbit-moonpool`, 'pond'): `fish-orbit-goby`, `fish-tidal-moonfish`
- stormeye cistern (`stormeye-cistern`, 'pond'): `fish-squall-shad`, `fish-thunderhead-gar`, `fish-hailstone-crab`
- starfall starpool (`starfall-pool`, 'aurora' — skyline rod): `fish-comet-minnow`, `fish-nebula-ray`, `fish-meteor-perch`
- Rods: `rod-driftwood` (sea, pond), `rod-iron` (… oil, ice, ink, bog), `rod-obsidian` (… + lava),
  `rod-whalebone` (… + abyss), `rod-briarwood` (… + syrup) already exist. The port builder adds
  `rod-skyline` (every kind except lava, incl. 'cloud' and 'aurora'; control 2.1), sold at Windlass's tackle shop.

## Shared ids other builders rely on
- Isle id `air`. Monarch id `aerion` (King Aerion the Breath-Taxer, artifact `art-aerion`). Prince ids:
  `zephyr` (galeward), `reverie` (slumber), `legend` (fable), `perigee` (orbit), `squall` (stormeye),
  `nova` (starfall). Court ids = area ids.
- Wanderer: Barnaby Tuft (port builder writes all his lines, including ones for every area).
- Bakeries: port *The Rising Loaf* (`windlass-bakery`, port builder); *The Millstone*
  (`galeward-millstone`, galeward builder). Recipes may use any fish id above.
- Flag naming: `<court>-<thing>`.

## Exports (the engine owner wires these — use exactly these names)
- Court builder: `content/air/courts/<court>/index.ts` exports `<COURT>_COURT: CourtBundle`
  (`GALEWARD_COURT`, `SLUMBER_COURT`, `FABLE_COURT`, `ORBIT_COURT`, `STORMEYE_COURT`, `STARFALL_COURT`).
- Port builder: `content/air/isle/port/index.ts` exports `AIR_PORT` with fields
  `{ area: AreaDef; wanderer: WandererDef; quests: QuestDef[]; items: IsleItemDef[]; scripts: Record<string, ItemScriptFactory>; shops: ShopDef[]; bakeries: BakeryDef[]; fish: FishDef[]; fisheries: FisheryDef[]; rods: RodDef[]; floor: ArenaFloor }`
  (`floor` is the arena backdrop for Windlass's quest duels; those foes carry `court: 'windlass'`). The
  Windlass `mooring` POI is `{ kind: 'mooring', at, isle: 'air' }`.
- Dungeon builder: `content/air/isle/lung/index.ts` exports `AIR_DUNGEON` with fields
  `{ area: AreaDef; encounters: EncounterDef[]; gimmicks: GimmickDef[]; boss: WorldBossDef; floor: ArenaFloor; items: IsleItemDef[]; scripts: Record<string, ItemScriptFactory> }`
  (wardens are `EncounterDef`s with `court: 'lung'`; `floor` is registered under key `lung`).
- Genes builder: `content/air/genes/index.ts` exports `AIR_GENES: GeneTree[]` (air, tempest, gravity,
  dream, astra, myth). Read each element's CURRENT element + kit files (Air, Dream, Astra and Myth have
  all been reworked or added recently — never trust old memories).

## Final report (keep it short)
List the files you wrote, every exported symbol the engine must import, anything in the contract you had
to work around, and anything unfinished. Do not paste code.
