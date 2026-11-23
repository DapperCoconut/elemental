<!-- Brief for the Fall (hard mode) builders: 60 FALLEN builders (one court each), one FALLPOINT builder, one
FALLEN KING builder. Engine owner: launch in waves of one isle (6 courts) — 17 at once exhausted the usage
limit on the Pinnacle. On landing: tsc, `node .check-isles.mjs` (the ☄ line lists courts still pending),
`npm run build`, update docs/ten-isles.md status. -->
# The Fall — content builder brief (shared by every Fall builder)

You are one of several parallel builders authoring **the Fall** — hard mode of the Ten Isles campaign for
*Elemental*, a Phaser 3 + TypeScript browser combat game (repo `/home/kids/dev/elemental`). All ten isles and
the Obsidian Pinnacle are built. The engine side of the Fall is built too; you write content.

Read FIRST, and nothing else for orientation:
- `docs/ten-isles/fall.md` — what the Fall is, its lore, and your job's concept. Short.
- `docs/isles-api.md` — the API cheat sheet. Read only the sections your job lists (line ranges below).
- Your job's reading list (below). Do not read CLAUDE.md, other isles' docs, or whole folders.

Code lookups: use the tokensave MCP tools if you have them (`tokensave_search`, with `literal: true` for exact
text; `tokensave_read` for ranges). If they are not in your tool list, the same tools run from the shell:
`tokensave tool search --query "<text>" --literal true --limit 20`. A blocked `grep` means "use tokensave" —
never set `TOKENSAVE_DISABLE_GREP_HOOK`. Reading a known file range with Read is always fine.

## Working economically
- Write each file whole in one go. Type-check once when your files exist, the validator once after that, then
  again after fixes. Don't re-read what you just wrote.
- **Never write your own validation harness.** If the validator misses something, say so in your report.

## Hard rules (every job)
- **Write only inside your assigned folder / files** (each job lists them). Other builders are working in
  parallel. You may import (read-only) from `src/isles/art/`, `src/isles/IslesTypes.ts`,
  `src/boss/framework/*`, and your own court's / the Pinnacle's existing files.
- Type-check: `cd /home/kids/dev/elemental && flock /tmp/isles-tsc.lock npx tsc --noEmit -p . 2>&1 | grep '<your path>'`
  — other builders' unfinished files may show errors; only yours must be clean. Do not run `npm run build`.
  Do NOT commit. No browser testing.
- Validate: `node .check-isles.mjs --only <your id>` (court id / `fallpoint` / `king`). Errors naming ids
  another builder owns are theirs — ignore them.
- TypeScript strict, no `any`, a doc comment on every def explaining the idea (as your reference files do).
- `ctx.sfx` / `tk.sfx` / cutscene cue names MUST be from this list (anything else is silently dropped):
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
  electricity slime(=Venom) fate sound light magnet metal plasma gunpowder rubber magic technology silence echo
  subterfuge quantum justice dream chalk(=Paint) magma wax clay illusion depths ruin dune(=Sand) conquest
  passion(=Devotion) paper death fortune(=Gold) cloth marrow tempest myth psychic radiation bind gum(=Savor)
  gluttony(=Wood) pressure astra memory string ink.
- **Quality bar: painstaking uniqueness, drawn with real detail.** Every rule is its own idea with its own
  layered art (not circles and rectangles standing in for things). No placeholders, no TODOs, no
  copy-paste-with-renames, no floating words where a drawing would do. Dialogue lines ≤ 110 characters.

---

## Job: FALLEN builder (sixty of you, one court each) — folder `content/<isle>/courts/<court>/fallen/`

You write your court's **Fallen Five**: five new champions and their five gimmicks (bible: "The Fallen Five").

**Read:** `docs/ten-isles/<isle>.md` (your isle — your court's section is your world; the "Encounters" list shows
all thirty fights the isle already has, which yours must not resemble); `docs/isles-api.md` lines 6–32 (units,
shapes), 98–152 (fights, GimmickCtx, EncounterGimmick), 288–329 (BossToolkit), 330–353 (IsleArt), 354–385
(gotchas); in your court folder: `encounters.ts` (the five you stand beside — their ids, elements, `at`s, looks,
coins), `quests.ts` only for its duel foes' `foeElement`s and `at`s, **one** existing gimmick file of your
court (the house style and your court's palette/helpers — you may import your court's own palette / util
files), and the top of `area.ts` (its size and solids, to pick five standing spots).

**Write:**
- `fallen/<slug>.ts` × 5 — one `GimmickDef` each, id `fallen-<court>-<slug>`.
- `fallen/index.ts` — `export const FALLEN: FallenBundle = { encounters: [...five], gimmicks: [...five] }`
  (`FallenBundle` is in `IslesTypes.ts`). Each `EncounterDef`: `id` = its gimmick's id (`fallenId(court, slug)`
  from `content/meteor/spec.ts` builds it), `court: '<court>'`, `gimmick: <same id>`, `name` (the fight),
  `foeName`, `foeElement`, `difficulty` 4 or 5, `hpMult` 1–1.3, `at`, `look`, `challenge` (3 lines), `beaten`
  (2–3 lines), `coins` ≈ double your court's own champions'.
- In your court's `index.ts` — exactly two lines: `import { FALLEN } from './fallen';` and `fallen: FALLEN,`
  in the bundle. That is the only edit you make outside `fallen/`.

**The five people.** Each is a named person of your court whom the King's telling puts on the crown's side
(informer, bought hero, the prince's old tutor, the executioner, a rebel who never rebelled here…). You may
make one a dark mirror of a townsperson your court already has (look up names in your court's npc file only if
you want that). `challenge`: they speak from inside the dream, certain, a little too smooth. `beaten`: the
dream thins and they half-remember who they really are. `look`: an `NpcLook` of your court, with
`eye: 0xffa040` (every Fallen has ember-gold eyes). The engine draws the star-scar and the `☄` plate.

**The five rules.**
- Each is a new mechanic that comes out of your court's place and trade — bolder than the court's own five.
  Not a variant of any of them, nor of anything in your isle's Encounters list. Two layers are welcome (a
  thing to dodge *and* a thing to do), and rules that turn halfway through the fight.
- The foe is mastered and the fight is always hard: `ctx.hard` is true — **do not branch on it**, just tune for
  it. Keep it fair: everything telegraphed, everything dodgeable at walk speed 200 px/s, and the rule
  **exploitable** — a clever player turns it on the foe (`ctx.hit(ctx.npc, …)` with your own geometry).
- Give the bot the rule through `npcSeek()`. Use the real hooks (strike targets `ctx.target`, `ctx.stun/root/
  silence`, `ctx.dashing`, `ctx.shotsNear`, `onPlayerCast`, `*CooldownRate`, `ctx.airborne`) — never fake them.
- Damage is at least 1 per call: never call `ctx.hit` / `tk.hitPlayer` every frame for a burn — tick it on your own
  clock (every 400–600 ms). The smoke run does not catch a per-frame drain.
- Fight names must be new across the whole game (the validator rejects one already used) — avoid the obvious
  word for your court's trade; it is probably taken.
- Art: `drawGround` / `drawAir` / `drawHud` with layered, specific drawing of the things in the rule; a HUD
  meter or pips for any counter. `rules` is the one line on the fight card (≤ 150 chars, plain words).
- ~200–320 lines per gimmick.

**Elements:** five different ones, none used by your court's five champions or by any quest duel foe of your
court (the validator checks them together), not all from your isle. Pick ones whose kit suits the rule.

**Standing spots:** on open, walkable ground of your court's area, ≥ 90 px from every champion, NPC and POI,
≥ 140 px from each other, spread out (the validator names the nearest walkable point if you miss).

**Validator** (`--only <court>`): five Fallen, ids/court/gimmick wiring, elements unique across the court,
difficulty ≥ 4, line lengths, spacing, reachability, fight names unique across the whole game, and every
gimmick smoke-run for 40 simulated seconds with `hard: true` (a warning if a rule never did anything).

## Job: FALLPOINT builder — folder `content/meteor/` (keep `spec.ts` as it is)

Fallpoint, the meteor's words, its people, its three cinematics and the Fallen King's artifact (bible:
"Fallpoint", "Cinematics"). Replace the stand-in `index.ts`: `export const METEOR_BUNDLE: MeteorBundle`
(`IslesTypes.ts`, bottom).

**Read:** `docs/isles-api.md` lines 6–97 (units, shapes, people, places), 171–205 (items), 330–353 (IsleArt),
354–444 (gotchas, cutscenes, PinnacleArt); `content/meteor/spec.ts` and the stand-in `index.ts`;
reference: `content/pinnacle/landing/area.ts` lines 1–110 and 600–649 (constants, POIs, the AreaDef) plus
lines 300–420 (an `animate` that changes with the story); `content/pinnacle/landing/people.ts` lines 1–120 (two
NPCs); `content/pinnacle/cine/shroud.ts` (a whole short cinematic); `content/pinnacle/cine/ending.ts` lines
900–977 (the stinger this follows — the star falling, the Ferryman on the jetty); `content/pinnacle/summit/
items.ts` (an artifact with a script); `src/isles/art/CineArt.ts`.

**Write** (`area.ts`, `art.ts`, `people.ts`, `meteor.ts`, `items.ts`, `cine/*.ts`, `index.ts`):
- The area: `id: FALLPOINT`, `isle: 'pinnacle'`, 1800×1400, `weather: 'steam'`, spawn `FALLPOINT_LANDING`, no
  edge exits. POIs: `{ kind: 'meteor', at: METEOR_AT }`, a waystone near the landing, the skiff `door` back
  (`to: 'emberport'`, `arrive: EMBERPORT_PIER`), one chest. Solids: the sea outside the ring, the rim's
  broken teeth, the cinder itself (a circle ~46 at `METEOR_AT`, so the player stops at its edge — reach is
  110). The walk from the landing up over the rim and down the bowl to the cinder must be open.
  The painter draws the star and its sixty locks; the engine adds only a pulsing light over it. Three looks
  through `world.test`: sealed / `{ flag: 'meteor-open' }` / `{ fall: true }`.
- `meteor: MeteorDef` — `keys: METEOR_KEYS`, names, and the five line sets (`sealed` 3–4 lines, `short` 2 with
  `{n}` / `{need}`, `offer` 4–5: the appeal, in his voice, `inFall` 2–3, `won` 2–3).
- `ferryman: Talk[]` — the Ferryman's lines here, most specific first (`fall-won`, `{ fall: true }`,
  `meteor-open`, default). He rowed the player to Brandmark on the first day; dry, tired, loyal.
- Three or four NPCs who rowed out to look, each with talks for the same four states.
- Items: `art-fallen-star` (`FALLEN_ARTIFACT`; `kind: 'artifact'`, `isle: 'pinnacle'`, a bespoke script worthy
  of the hardest fight in the game, `scriptText`), and one charm in the chest.
- Cutscenes `CINE_METEOR`, `CINE_FALL`, `CINE_FALL_END` (ids from `spec.ts`): 5–8 shots each, painted with
  `CineArt` + `PinnacleArt`; under ~1500 shapes a frame.
Validate `--only fallpoint`.

## Job: FALLEN KING builder — file `content/pinnacle/king/fallen.ts` (+ helper files prefixed `fallen`)

Act IV of the Obsidian King — his `hard.extraPhase` (bible: "The Fallen King"). Replace the stub:
`export const KING_FALLEN: KingPart` (`king/contract.ts`). `king/index.ts` already folds it in as the hard
extra phase and routes the draw hooks to it at phase index 3 — do not edit it.

**Read:** `docs/isles-api.md` lines 6–32, 230–329 (world bosses, BossToolkit), 354–444; `king/contract.ts`,
`king/index.ts`; `king/duel.ts` (a whole act: phase, style, entry, signatures wiring) and `king/duelMoves.ts`
lines 1–200 (two signatures); `king/star.ts` lines 990–1045 (how act III ends — you follow it);
`src/isles/art/PinnacleArt.ts` lines 1–60 (the palette).

**Write:** `phase` — `name: 'The Fallen King'`, a `line`, `hp` 1100, `cycle` of `sig:p4-…` keys (8+ bespoke
signatures: at least six that each cite one of the ten laws and look like that isle for a moment, plus his
own), `harass`, `restMs` ~1700, `style` (`hideRig: true` — `drawDecor` paints him: man-sized, a judge's robe
of ash over a cinder that shows through the cracks, no crown; fast `duelist`-style movement) and an `entry`
(the Supernova's light collapses to a point, the hall and the sky are simply gone, and he is standing on the
dream's floor, small). `drawArena` / `drawBackdrop`: the Fall coming apart — pieces of all ten isles' ground
showing through, fewer as `s.hpRatio` falls, until it is the bare glass of Fallpoint under a night sky.
Every attack telegraphed and dodgeable; damage on the scale of act II. It is the hardest fight in the game
and should feel like the most personal one.
Validate `--only king`.

## Final report (keep it short)
What you built (names of the five fights / the shots / the signatures, one line each), anything the engine
could not do that you worked around, and anything the validator should have caught but did not.
