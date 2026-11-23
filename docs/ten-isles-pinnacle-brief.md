# The Obsidian Pinnacle — content builder brief (shared by every Pinnacle builder)

You are one of several parallel builders authoring **the Obsidian Pinnacle**, the finale of the Ten Isles
campaign for *Elemental*, a Phaser 3 + TypeScript browser combat game (repo `/home/kids/dev/elemental`).
All ten isles are built; this is the last place the player goes. The user's instruction for it: **"as
cinematic and unique and fun and cool as possible — cutscenes, awesome designs, unique and fun fights. This
is really important to get right."** Hold your work to that.

Read FIRST, and nothing else for orientation:
- `docs/ten-isles/pinnacle.md` — the design: lore, geography, every bench, the King's three acts, the
  cinematics. It is your spec.
- `docs/isles-api.md` — the API cheat sheet. The **"Pinnacle additions"** section at the end is new and is
  the part you will lean on (cutscenes, PinnacleArt, CineArt, boss entries, `tk.spawnAdd`, `mastered`).
- `src/isles/art/PinnacleArt.ts` (whole file, ~300 lines) — the Pinnacle's shared look. Use it.
- `src/isles/content/pinnacle/spec.ts` — fixed ids and helpers (`BENCHES`, `seatId`, `relicId`,
  `benchIntroId`, `above`, `below`).
- Your job's section below, and the reference files it lists (files and line ranges only — do not read whole
  reference folders, other isles' docs beyond what your job lists, or CLAUDE.md).
Open framework source (`src/isles/IslesTypes.ts`, `src/boss/framework/*`) only for a specific question the
cheat sheet does not answer. (tokensave tools are NOT available this session — use grep / sed -n ranges.)

## Working economically
- Write each file whole in one go; don't build a file up through many small edits.
- Type-check once per batch of files. Run the validator when your bundle is complete, then after fixes.
- Don't re-read a file you just wrote.

## Hard rules
- **Write ONLY inside your assigned folder / files.** Other builders are working in parallel and the engine
  owner is editing `src/isles/*` outside `content/`. You MAY import (read only) from `src/isles/art/`,
  `src/isles/IslesTypes.ts`, `src/boss/framework/*`, `content/pinnacle/spec.ts`, `king/contract.ts`. If a
  shared type or helper is missing something, work around it inside your folder and say so in your report.
- Your folder starts with a placeholder `index.ts` (or stub file) — **replace it, keeping the export name.**
- Type-check (ALWAYS through the lock — seventeen builders share this machine and one type-check takes 2.7 GB):
  `cd /home/kids/dev/elemental && flock /tmp/isles-tsc.lock npx tsc --noEmit -p . 2>&1 | grep '<your folder path>'` — other
  builders' unfinished folders may show errors; only YOUR files must be clean. Do not run `npm run build`.
  Do NOT commit. No browser testing.
- **Validate with the real validator only:** `node .check-isles.mjs --only <your id>` (ids per job below).
  Never write your own harness or scratch checker; if the validator misses something, say so in your report.
- TypeScript strict. Match the codebase style: a doc comment on each def / move / painter, no `any`.
- Dialogue lines ≤ 110 characters (warn) / 140 (error); cutscene lines ≤ 120.
- `sfx` names MUST come from this list (anything else is silently dropped):
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
- Element ids: fire water life air earth oil shadow ice growth crystal soul hunt sand(=Time) gravity creation
  electricity slime(=Venom) fate sound light magnet metal plasma gunpowder rubber magic technology silence
  echo subterfuge quantum justice dream chalk(=Paint) magma wax clay illusion depths ruin dune(=Sand) conquest
  passion(=Devotion) paper death fortune(=Gold) cloth marrow tempest myth psychic radiation bind gum(=Savor)
  gluttony(=Wood) pressure astra memory string ink.
- **The look.** Black glass, never grey stone: near-black faces with a cold violet sheen, a thin pale line on
  every edge, violet light in every crack — and warm gold-white light ONLY where the star shows through. Draw
  with `OBS`, `shard`, `slab`, `seam`, `councilMask`, `glassFloor`. Each bench brings ONE extra family of
  colour — its isle's — as light, inlay and trapped things inside the glass, never as a repaint of the room.
- **Quality bar: painstaking uniqueness.** Every fight its own idea with its own art; every set piece
  layered (silhouette, planes, edge light, detail, glow, shadow — a dozen shapes is a sketch, a hundred is a
  set piece). No placeholder content, no TODO, no copy-paste-with-renames.
- Units: gimmick / signature `update(time ms, dt SECONDS)`; painter `animate(g, tSeconds, view, world)`;
  cutscene `k.t` seconds; every `*Ms` is ms. Arena 960×640, HUD owns y < 96. Player walks ≈ 200 px/s.
- Area conventions: ground in `painter.ground` (baked once); buildings / set pieces in `painter.pieces`
  (`x` = centre, `y` = base line and depth; `w`/`h` cull box); per-frame bits in `animate` (under actors) /
  `animateOver` — only draw what is inside `view`, keep them light. Solids cover base footprints only. Keep
  each exit's edge strip (140 wide around its `at`, 120 deep) clear of solids. Exits default to the middle of
  their edge. The validator checks reachability of every NPC / champion / POI and both exits.

---

## Job: BENCH builder (ten of you, one bench each) — folder `content/pinnacle/benches/<isle>/`

You build one bench: its room, its six councilors, their six decrees, its relic, its intro cinematic.
Export `PIN_<ISLE>: PinnacleTierBundle` from `index.ts` (`PIN_FIRE`, `PIN_WATER`, `PIN_LIFE`, `PIN_AIR`,
`PIN_EARTH`, `PIN_ELECTRICITY`, `PIN_SLIME`, `PIN_FATE`, `PIN_SOUND`, `PIN_LIGHT`). Validate with
`node .check-isles.mjs --only <bench id>` (e.g. `bench-fire`).

Also read: `docs/ten-isles/<your isle>.md` — for tone, the six princes' names (your councilors appointed
them) and **the list of gimmicks already used by your six elements' courts, which you must not repeat**;
and `src/data/codex/<element>.ts` for each of your six elements (what the kit does — a decree is written
for that kit, *perfected*). Element ids → codex files are the same id.

Reference (Thornwild, `src/isles/content/life/`): `isle/glasshouse/index.ts`; `isle/glasshouse/area.ts` lines
1–200 and 868–end (constants, solids, the AreaDef); `isle/glasshouse/wardens.ts` lines 1–242 and 640–end (one
whole gimmick + non-court `EncounterDef`s); `courts/bloom/gimmicks/pollenCount.ts` (a second whole gimmick);
`courts/bloom/items.ts` lines 1–100 (a charm + its script); `courts/bloom/floor.ts`; and the **detail bar**:
`courts/bloom/art.ts` lines 294–382 and 600–666.

What to build:
- **Area** `<bench id>` (`isle: 'pinnacle'`, 1600×2000, name / subtitle from `BENCHES`): spawn near the south
  stair; exits `{ side: 's', to: below(B), label }` and `{ side: 'n', to: above(B), label, open: { courtReady:
  B.id }, lockedText }`; a `waystone`; six `encounter` POIs (the seats, spread up the room so the climb
  passes each); one `chest` (`id: relicId(B.id)`, `item: relicId(B.id)`, `orbs: 8`, `open: { courtReady: B.id
  }`); `intro: benchIntroId(B.id)`; the weather from the bible table; `gloom` 0.15–0.35 if it suits. Paint
  the room from the bible row — its **set piece** must be the thing a player remembers — and six tall
  obsidian seats on plinths. `npcs: []` is fine (the Ferryman follows the player; the masks do the talking),
  but 1–2 silent set-dressing NPCs (a clerk still filing, a scribe who has stopped) with talk blocks for
  default / `{ courtReady: B.id }` / `{ monarch: 'obsidian-king' }` make a room live.
- **Six councilors** (`EncounterDef`, see the bible's "Councilors"): one per element in `B.elements`,
  `id: seatId(el)`, `court: B.id`, `mastered: true`, `difficulty: 5`, `seat`, `foeName`, `look` with
  `hat: 'councilmask'`, `hpMult` = 1.25 + 0.02 × bench number, `coins` = 200 + 12 × bench number, `gimmick`
  = that seat's decree id, `challenge` / `beaten`. `perk` only if you have read `src/data/Perks.ts` and one
  perk of that element makes the decree sing (otherwise omit — the engine picks).
- **Six decrees** (`GimmickDef`, ids `<bench id>-<something>`, ~180–320 lines each, one file each under
  `decrees/`). The foe is a Nightmare bot with everything; the decree is the *law of the room* it fights
  under. Telegraph everything, name things on screen (`ctx.banner`, sparing `ctx.float`), give the bot the
  rule through `npcSeek()`, and make the rule exploitable by a clever player. Use the real hooks (strike
  targets, `shotsNear`, `onPlayerCast`, cooldown rates, `airborne`, `dashing`, real stun / root / silence).
  `rules` is the one line on the fight card — write it as a clause of law.
- **Arena floor** for the six fights: that bench as a fighting floor.
- **Relic**: `IsleItemDef` `id: relicId(B.id)`, `kind: 'charm'`, `isle: 'pinnacle'`, no price, with a bespoke
  `script` (registered under the same id) that does something mechanically interesting tied to your isle's
  law undone, and `scriptText`.
- **Intro cinematic** `{ id: benchIntroId(B.id), shots }`: 2–3 shots, 10–16 s in all — the room revealed
  (screen-space painting, not the area painter), the set piece, six masks turning to look (`councilMask`);
  2–4 lines: the Ferryman and / or a councilor. Use `CineArt` helpers; `cineHero(g, …, k.hero.color)` for
  the player.

---

## Job: LANDING builder — folder `content/pinnacle/landing/`

Export `PIN_LANDING_BUNDLE: PinnacleLandingBundle`. Validate `--only pin-landing`. Build "Glasswater
Landing" exactly as the bible describes: area `pin-landing` (2400×1500, `isle: 'pinnacle'`, exit `n` →
`bench-fire`, `mooring` POI `{ kind: 'mooring', at, isle: 'pinnacle' }` on the south shore, waystone,
`intro: 'cine-landfall'` — the cinematic itself is another builder's), weather `glassrain`; the ten
wanderers as NPCs (ids `pin-<first name lowercased>`), each pitch drawn as their isle; a dock NPC
(`role: { kind: 'dock', id: 'pin-dock' }`), the quartermaster (`pin-stores` shop: four charms 1600–2600 coins
with bespoke scripts + 3–4 strong foods), the camp kitchen (`pin-kitchen` bakery, 4 recipes whose inputs
are real fish ids from the isles — grep `fish-` in `src/isles/content/*/` to pick ones that exist — and
whose outputs are your own food items); and the Ferryman as `wanderer` (`byArea` for `pin-landing`, all ten
bench ids and `pin-summit`; `general`). Items `isle: 'pinnacle'`. For each wanderer's voice and look read
ONLY the first ~40 lines of their `WandererDef` (find with `grep -rn "WandererDef = {" src/isles/content`).
Reference: `src/isles/content/life/isle/port/` — `index.ts`, `mossgate.ts` lines 1–60 and 890–end,
`people.ts` lines 1–140, `wanderer.ts` lines 1–170, `items.ts` lines 1–90, and the detail bar
`courts/bloom/art.ts` lines 294–382 and 600–666.

## Job: SUMMIT builder — folder `content/pinnacle/summit/`

Export `PIN_SUMMIT_BUNDLE: PinnacleSummitBundle`. Validate `--only pin-summit`. Build "The Crownless Hall"
as the bible describes: area `pin-summit` (1400×2200, exit `s` → `bench-light`, `{ kind: 'monarch', id:
'obsidian-king', at }` in front of the throne near the north end — draw the throne with `throne()` from
PinnacleArt as a piece just behind it, a waystone by the south door, `intro: 'cine-throne'`, weather
`starmotes`, a `WorldGate` (`look: 'starseal'`) across the nave gated `{ seats: 60 }`); `floor` (a simple
dark hall floor — the King's own acts paint over it); the artifact `art-obsidian-king` ("the Unshelled Star",
`kind: 'artifact'`, bespoke script + scriptText); and the cinematic `cine-throne` (5–7 shots, ~35 s: the
door of sixty seals opening, the long nave and its sixty empty niches, the ten crown-moulds, the throne, the
King speaking without rising — his lines are in `king/index.ts` `intro`; write more in that voice).
Reference: `src/isles/content/life/isle/glasshouse/area.ts` lines 1–200 and 868–end, `items.ts`, and the detail bar.

## Job: KING builders (three of you, one act each) — files `content/pinnacle/king/{throne,duel,star}.ts`

Each exports a `KingPart` (`king/contract.ts`): `KING_THRONE`, `KING_DUEL`, `KING_STAR` (+ `KING_OUTRO:
BossEntry` from `star.ts`). You may add helper files beside yours, prefixed with your act (`throneHost.ts`,
`duelArt.ts`, `starSky.ts`). `king/index.ts` is the engine owner's — do not edit it. Validate `--only king`
(the def stays a listed placeholder until all three acts exist; type-check yours regardless).
Your act is specified in the bible ("The Obsidian King"). In your `phase`: `name`, `line`, `hp` (900 / 1000 /
1300), `cycle` (your `sig:p<n>-…` keys, 5+ bespoke signatures, a library move only as seasoning), `harass`,
`restMs` ~2600 (act I) / 2200 / 2000, `harassMs`, `style` and `entry`. Every attack telegraphed and
dodgeable; damage numbers on the scale of the reference monarch. This is the last boss of a long campaign:
it should be hard, fair, and look like nothing else in the game.
Reference: `src/isles/content/life/isle/glasshouse/verdigra.ts` lines 1–170 and 1686–end (helpers, one
signature, the WorldBossDef), and the "World bosses" + "BossToolkit" + "Pinnacle additions" sections of the
cheat sheet. Act I also: `tk.spawnAdd` in `src/boss/framework/BossToolkit.ts` (grep `spawnAdd`).

## Job: CINEMATICS builder — folder `content/pinnacle/cine/`

Export `PIN_CUTSCENES: CutsceneDef[]` with `cine-shroud`, `cine-landfall` and `cine-ending` (bible table).
Validate `--only cine`. One file per cutscene plus a shared art file. For the ending's ten dawns read ONLY
the first 14 lines of each `docs/ten-isles/<isle>.md` (the tyranny) and paint that tyranny undone — one
striking image per isle, ~4 s each, a line of narration each. Lengths: shroud ~40 s, landfall ~30 s, ending
~110 s including a title card (`full: true`, "THE TEN ISLES") and the stinger. Draw the spire ONLY with
`drawPinnacle`. The last shot of the ending is the stinger: night, the freed sea, one star shivers and
falls, a far flash on the horizon — the last line is "…or does it?".

## Job: ENGINE ARTIST — files outside `content/` (listed here; nobody else touches them)

You draw the new kinds the contract already names and wire the Pinnacle into three scenes. No validator id;
type-check the whole project for your files.
- `src/isles/world/IsleWorldScene.ts`: weather `glassrain`, `starmotes` in `drawWeather`; gate looks
  `obsidian`, `starseal` wherever gates are drawn (see how `lens` / `sigil` were added). Touch nothing else there.
- `src/isles/world/NpcArt.ts`: hat `councilmask` (draw it with `councilMask` from PinnacleArt, scaled to the head).
- `src/isles/sea/SeaVoyageScene.ts`: a crossing with `dest: 'pinnacle'` — **the Last Crossing**: longer than an
  Outer crossing (4600 m), glass-black water under a violet-lit sky, the spire (`drawPinnacle`) growing on the
  horizon the whole way, its own hazards (drifting obsidian shards that split when shot, glass reefs that
  surface with a seam-flash warning, the Shroud's last squalls), the Muster's ten boats sailing alongside as
  scenery, and landfall at `pin-landing`. Follow how an `outer` isle crossing is special-cased.
- `src/isles/scenes/IslesMapScene.ts`: an `ISLE_LAYOUT.pinnacle` (landing, ten benches, summit — a climbing
  zig-zag up a drawn spire) + the isle-tab landmark art for it; on the sea chart draw the middle with
  `drawPinnacle` (storm = 1 until ten monarchs have fallen, benches lit = floor(seats / 6), `open` once
  `{ monarch: 'obsidian-king' }`), and label it.
- `src/isles/scenes/IslesSlotScene.ts` line ~118 ("The Pinnacle far off"): use `drawPinnacle`.

## Final report (keep it short)
Files written, every exported symbol the engine must import, anything in the contract you worked around,
anything unfinished. Do not paste code.
