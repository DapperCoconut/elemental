<!-- Brief handed to each parallel content builder. Fire Isle used it first; this copy is retargeted at the Water Isle. Update the isle-specific tables before reusing. -->
# Ten Isles — content builder brief (shared by every builder)

You are one of several parallel builders authoring **the Drowned Reach (Water Isle)** of the Ten
Isles campaign for *Elemental*, a Phaser 3 + TypeScript browser combat game (repo
`/home/kids/dev/elemental`). Brandmark (Fire Isle) is already built and is your **reference for
shape, scale and quality** — copy its structure, never its ideas.

Read FIRST: `/home/kids/dev/elemental/CLAUDE.md`, `docs/ten-isles.md` (the bible — the Drowned Reach
section has the world, names and the concept for every fight; the Brandmark section shows the
pattern), `src/isles/IslesTypes.ts` (the content contract — every shape you write),
`src/isles/art/IsleArt.ts` (shared drawing helpers), `src/boss/framework/BossDefs.ts`,
`src/boss/framework/BossToolkit.ts` (hazard engine + dodgeability notes), `src/boss/framework/BossRig.ts`
(look options). Then read the Fire Isle folder that matches your job (named in your assignment) end
to end — it is a finished, working example of exactly what you are writing. Code exploration: this
project has tokensave (`tokensave_context`, `tokensave_search`) — prefer it over grepping blind, but
reading the files named above directly is fine.

## Hard rules
- **Write ONLY inside your assigned folder.** Never edit any other file — other builders are working
  in parallel, and the engine owner is editing `src/isles/*` outside `content/`. You MAY import (read
  only) from `src/isles/art/`, `src/isles/IslesTypes.ts`, `src/boss/framework/*`, and helpers in the
  Fire Isle folders (e.g. `content/fire/genes/helpers.ts`). If a shared type is missing something, work
  around it inside your folder and mention it in your final report.
- Type-check with `cd /home/kids/dev/elemental && npx tsc --noEmit -p . 2>&1 | grep 'src/isles/content/water/<your folder>'`
  — the whole project may show errors from other builders' unfinished folders; only YOUR files must
  be clean. Do not run `npm run build`. Do NOT commit. No browser testing.
- TypeScript strict mode. Match the codebase style: explanatory doc comments on each def/move
  (see the Fire Isle files), no `any`.
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
  other courts (or like any Fire Isle court). No placeholder content, no "TODO", no
  copy-paste-with-renames. This is a sea isle — water, tide, cold, depth, oil, ink, sailcloth — let
  that show in every painter.

## Rules the validator enforces (`node .check-isles.mjs` — the engine owner runs it; you can too)
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

## Conventions
- Arena (fights) is 960×640 logical; the HUD owns y < 96 (`ctx.top`). Player walk speed ≈ 200 px/s.
- Ids are global — prefix everything with your court id (`tidewater-…`) except where this brief fixes ids.
- World area: draw ground in `painter.ground` (baked once). Buildings/ships/machines go in
  `painter.pieces` (each piece is drawn once at depth = its `y`, so `y` is its base/feet line; `w`/`h`
  are the piece's bounding box size for culling, measured up from the base). Animated bits in `animate`
  (under actors; t in SECONDS) / `animateOver` (over actors) — they are called every frame, so only draw
  what is inside `view` and keep them light. Solids: give every building/rock a collision rect/circle
  at its base footprint (NOT the full drawn height). Keep paths between POIs walkable; keep each exit
  gate's edge strip (140px wide around the exit's `at`, 120px deep) clear of solids.
- New in the contract for this isle: `WeatherKind` `'spray' | 'fog' | 'bubbles' | 'ink'`; `WorldGate.look`
  `'ice' | 'coral' | 'sluice'`; `FisheryDef.kind` `'ice' | 'ink' | 'abyss'`; `NpcHat` `'diving'` (brass
  diving helmet) and `'souwester'` (fisher's oilskin hat).
- The player avatar is ~22px radius at 0.62 scale; NPCs stand on their `at`; an interaction radius is ~70px.
- NPCs: every NPC needs several `talks` blocks keyed by state — at least: default, after your related
  quest is done, after the court's prince falls (`{ prince: '<id>' }`), after the Queen falls
  (`{ monarch: 'maresa' }`). List most specific first. `barks` are 1-line ambient mutters, also by state.
  Dialogue is characterful (this is the world, not the workshop menus — the "business only" rule in
  CLAUDE.md applies to the old shop/lab menus, NOT to the Isles). Keep lines ≤ 110 characters each.
  The Queen's tyranny (the Dry Tithe, houses left under, the drowned kept in the Undertow) should
  colour what ordinary people say.
- Quests: 5 per court, each with a giver NPC, 1–4 stages using the objective kinds in IslesTypes
  (talk / defeat / duel / fish / deliver / collect / visit / cook / prince) and ending in a fight. Rewards
  are mostly Orbs (3–7 on this isle), some coins/items. Small stories with personality, not
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
  that look nothing like any Fire Isle prince's, a `look` + `drawDecor` that makes the silhouette
  unmistakable, and `drawArena` for a bespoke floor. Intro/banter/defeat lines in character (they are
  the Queen's children governing for her). Tune HP by your court's tier (table below); keep every
  attack dodgeable with a telegraph.
- Items: each court sells 4 **charms** (`kind:'charm'`, permanent, 3 can be equipped) in its shop and
  drops 1 **artifact** from its prince (`kind:'artifact'`, id `art-<prince id>`). Every charm and the
  artifact gets a bespoke `script` (an `ItemScriptFactory` registered under the same id in `scripts`)
  that does something mechanically interesting (not "+5% damage"), optionally plus a small `effect`.
  Describe the script in `scriptText`. Prices: charms 160–620 coins (second isle — dearer than
  Brandmark's); artifacts no price. All items `isle: 'water'`.
- Fish: each court has one fishing water (`Poi kind:'water'`) with its own fishery and 2–3 fish (exact
  ids below). Fish are ALSO `IsleItemDef`s (`kind:'fish'`, same id) with a `sell` price and a small raw-meal
  `effect`. Fish `fight` 1–5 (how hard to reel).
- Your court's arena floor (`CourtDef.floor`) paints the 960×640 fight backdrop for all five encounters —
  make it look like a place in your court.

## Isle geography (exits must agree — use exactly these)
```
                 [abyssal] (Undertow door, north rim)
                     |
[inkwell]-------[tidewater]-------[rimefast]
    |                |                |
[sailmaker]----[brinehollow]----[slickharbor]
                (south is the sea)
```
| area | size | exits (side → to) |
|---|---|---|
| brinehollow | 2600×1500 | n→tidewater, w→sailmaker, e→slickharbor (south is the sea; mooring on the south shore) |
| tidewater | 2400×1700 | s→brinehollow, n→abyssal, w→inkwell, e→rimefast |
| abyssal | 2400×1800 | s→tidewater; a `door` POI to `undertow` (open: `{ princesOfIsle: 'water', count: 6 }`) near the north rim |
| inkwell | 2400×1600 | e→tidewater, s→sailmaker |
| sailmaker | 2400×1600 | n→inkwell, e→brinehollow |
| rimefast | 2400×1600 | w→tidewater, s→slickharbor |
| slickharbor | 2400×1600 | n→rimefast, w→brinehollow |
| undertow | 1800×2600 dungeon | `door` back to abyssal |

Exit `at` = default middle of the edge (keep it walkable). Every court also has: a `waystone` POI near
its entrance, the prince's manor/keep with a `prince` POI in front of it, a court shop NPC (`role:
{kind:'shop', id:'<court>-shop'}`), 6–10 named NPCs, and a `crowd` of wandering townsfolk with barks.

## Difficulty table (second isle — a step above Brandmark)
| court | tier | encounter difficulties | prince phase HP (p1/p2/hard p3) | prince damageMult | coins/encounter |
|---|---|---|---|---|---|
| tidewater | 1 | 2,2,2,3,3 | 340/410/310 | 0.9 | 45 |
| sailmaker | 2 | 2,3,3,3,3 | 370/450/330 | 1.0 | 55 |
| slickharbor | 2 | 2,3,3,3,4 | 380/460/340 | 1.0 | 55 |
| inkwell | 3 | 3,3,4,4,4 | 400/480/350 | 1.05 | 65 |
| rimefast | 3 | 3,4,4,4,4 | 420/500/360 | 1.1 | 70 |
| abyssal | 4 | 4,4,4,5,5 | 450/540/390 | 1.2 | 80 |
| undertow wardens | 5 | 5,5,5 | — | — | 100 |

## Fixed fish ids (so bakeries can reference each other's catches)
- sea (fishery `brinehollow-sea`, kind 'sea'; port builder): `fish-brine-herring`, `fish-gullet-cod`,
  `fish-tidal-turbot`, `fish-stilt-crab`, `fish-undertow-eel`, `fish-pearl-queenfish` (rare, iron rod+)
- tidewater tide pools (`tidewater-pools`, 'pond'): `fish-tidepool-blenny`, `fish-sand-dab`
- sailmaker cove (`sailmaker-cove`, 'sea'): `fish-sailfin-bass`, `fish-rope-gar`
- slickharbor slick (`slickharbor-slick`, 'oil'): `fish-tar-catfish`, `fish-slick-sculpin`, `fish-rainbow-shiner`
- inkwell canal (`inkwell-canal`, 'ink'): `fish-inkfin-squid`, `fish-quill-pike`, `fish-blotted-ray`
- rimefast ice holes (`rimefast-holes`, 'ice'): `fish-frostback-char`, `fish-icicle-smelt`, `fish-glacier-cod`
- abyssal trench (`abyssal-trench`, 'abyss' — needs the whalebone rod): `fish-lanternfish`, `fish-gulper-eel`, `fish-ghost-grenadier`
- Rods: Brandmark's `rod-driftwood` (sea, pond), `rod-iron` (… oil, ice, ink), `rod-obsidian` (… + lava)
  already exist. The port builder adds `rod-whalebone` (every kind except lava, incl. 'abyss'; control 1.75),
  sold at Brinehollow's tackle shop.

## Shared ids other builders rely on
- Isle id `water`. Monarch id `maresa` (Queen Maresa Undertow, artifact `art-maresa`). Prince ids:
  `ebb` (tidewater), `hem` (sailmaker), `crude` (slickharbor), `blot` (inkwell), `hoarfrost` (rimefast),
  `lanternjaw` (abyssal). Court ids = area ids.
- Wanderer: Odo Fathomsby (port builder writes all his lines, including ones for every area).
- Bakeries: port *The Brine Oven* (`brinehollow-bakery`, port builder); *The Low-Tide Larder*
  (`tidewater-larder`, tidewater builder). Recipes may use any fish id above.
- Flag naming: `<court>-<thing>`.

## Exports (the engine owner wires these — use exactly these names)
- Court builder: `content/water/courts/<court>/index.ts` exports `<COURT>_COURT: CourtBundle`
  (`TIDEWATER_COURT`, `SAILMAKER_COURT`, `SLICKHARBOR_COURT`, `INKWELL_COURT`, `RIMEFAST_COURT`, `ABYSSAL_COURT`).
- Port builder: `content/water/isle/port/index.ts` exports `WATER_PORT` with fields
  `{ area: AreaDef; wanderer: WandererDef; quests: QuestDef[]; items: IsleItemDef[]; scripts: Record<string, ItemScriptFactory>; shops: ShopDef[]; bakeries: BakeryDef[]; fish: FishDef[]; fisheries: FisheryDef[]; rods: RodDef[] }`.
- Dungeon builder: `content/water/isle/undertow/index.ts` exports `WATER_DUNGEON` with fields
  `{ area: AreaDef; encounters: EncounterDef[]; gimmicks: GimmickDef[]; boss: WorldBossDef; floor: ArenaFloor; items: IsleItemDef[]; scripts: Record<string, ItemScriptFactory> }`
  (wardens are `EncounterDef`s with `court: 'undertow'`; `floor` is registered under key `undertow`).
- Genes builder: `content/water/genes/index.ts` exports `WATER_GENES: GeneTree[]`.

## Final report (keep it short)
List the files you wrote, every exported symbol the engine must import, anything in the contract you had
to work around, and anything unfinished. Do not paste code.
