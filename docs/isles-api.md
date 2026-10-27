# Ten Isles — API cheat sheet

Sources: `src/isles/IslesTypes.ts`, `src/boss/framework/{BossDefs,BossToolkit,BossRig}.ts`, `src/isles/art/IsleArt.ts`,
`src/isles/fight/IslesFightKit.ts`, `src/data/Items.ts`. World: `docs/ten-isles.md`. Validate: `node .check-isles.mjs`.

## Units at a glance

| Hook | time | dt |
|---|---|---|
| `EncounterGimmick.update` / `ItemScript.update` / `SignatureMove.update` `(time, dt)` | scene ms | **seconds** |
| `SignatureMove.cast(time)`, every `draw*(g, time)`, `BossBodyState.t` | scene ms | — |
| `AreaPainter.animate(g, t, view)` / `animateOver` | **seconds** (`now/1000`) | — |
| every `*Ms` field, `stun/root/silence(f, ms)`, `boostDamage(mult, ms)` | ms | — |
| `WorldHazard.sweeper.radPerSec`, `tk.pull(strengthPxPerSec)` | per second | — |

Arena is 960×640 logical; HUD owns `y < 96` (`ctx.top`). Player walks ≈200 px/s, radius ≈20–22.

## Shared shapes
```ts
Pt { x; y }   Rect { x; y; w; h }   Side = 'n'|'s'|'e'|'w'
Solid = { kind:'rect'; x; y; w; h } | { kind:'circle'; x; y; r }
```

### Cond (save queries — `IslesSave.test`, absent = true)
```ts
{ prince: id } | { monarch: id } | { encounter: id }   // beaten / won
{ courtReady: courtId }   // all 5 court encounters won     { questDone: id }   { flag: string }
{ quest: id; stage?: n }  // accepted; with stage: current stage index >= n (0 = first stage; or done)
{ item: id; count?: n }   // inventory >= count (1)          { princesOfIsle: isleId; count: n }
{ not: Cond } | { all: Cond[] } | { any: Cond[] }
```

## People
```ts
NpcLook { body; accent; hand?; hat?: NpcHat; traits?: NpcTrait[]; size?: 0.7–1.4 (1); eye? }
NpcHat  = none cap tophat hood helmet crown bandana chef wizard tricorn beanie veil goggles straw mitre candle
          diving souwester wreath antlers mushroom aviator nightcap plume
NpcTrait= apron beard cane satchel pipe scarf glasses eyepatch lantern pack brand bandage rod book tool mask
Talk    { when?: Cond; lines: string[]; sets?: flag }   // list most-specific first; `sets` flag set when block finishes
NpcRole = 'shop'|'bakery'|'dock'|'tackle'|'banker'
NpcDef  { id; name; title?; look; at: Pt; wander?: radius; present?: Cond; talks: Talk[];
          role?: { kind: NpcRole; id }  /* E opens the counter after talk */; barks?: Talk[] }
WandererDef { id; name; title; look; byArea: Record<areaId, Talk[]>; general: Talk[] }  // follows the player
```

## Places
```ts
AreaDef {
  id; isle; court?; name; subtitle; w; h;
  bg: number              // camera bg outside the painted world
  accent: number          // edge grade + minimap
  weather: WeatherKind; music?; spawn: Pt;
  painter: AreaPainter; solids: Solid[]; exits: AreaExit[]; pois: Poi[]; npcs: NpcDef[];
  crowd?: { count; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] };
  gloom?: 0–1; hazards?: WorldHazard[]; gates?: WorldGate[];
  checkpoints?: Pt[]      // hazard respawn = last one walked within 60px of
  placeholder?: boolean   // validator skips
}
WeatherKind = none ash embers steam smoke sparks wax rain snow motes spray fog bubbles ink
              pollen spores petals leaves sugar fireflies wind clouds feathers stars storm dreams
AreaPainter {
  ground(g, rng): void                                  // baked once into a texture, under everything
  pieces?: { x; y; w; h; draw(g, rng): void }[]         // each its own Graphics at depth = y
  animate?(g, t /*SECONDS*/, view: Rect): void          // per frame, over ground, under actors
  animateOver?(g, t /*SECONDS*/, view: Rect): void      // per frame, over actors
}
```
Pieces draw in **world coords**; `x` = centre, `y` = base/feet line; `w`/`h` are only a cull box
(`x±w/2`, `y-h` … `y+40`; IsleWorldScene.ts:263). Exits: engine lands you at `to`'s exit whose `to` is this
area (n↔s, e↔w); keep the 140px-wide × 120px-deep strip around `at` clear of solids.
```ts
AreaExit { side: Side; to: areaId; at?: px along edge (default middle); label; open?: Cond; lockedText? }
Poi =
  | { kind:'encounter'; id }                          // champion stands at EncounterDef.at
  | { kind:'prince'; id; at } | { kind:'monarch'; id; at } | { kind:'waystone'; at }
  | { kind:'sign'; at; text }
  | { kind:'chest'; id; at; coins?; item?; orbs?; open?: Cond }
  | { kind:'door'; at; to: areaId; arrive: Pt; label; open?: Cond; lockedText? }   // non-edge link
  | { kind:'water'; id; shape: Rect; fishery: fisheryId }                         // cast within reach
  | { kind:'mooring'; at; isle }                                                  // SeaVoyageScene start
  | { kind:'lever'; at; flag; label }                                             // one-way, sets flag
WorldHazard =   // no HP in the world: a hit = back to last checkpoint
  | { kind:'jet'; rect; periodMs; onMs; offsetMs?; color? }
  | { kind:'sweeper'; x; y; length; radPerSec; phase?; color? }
  | { kind:'conveyor'; rect; vx; vy; look?: 'belt'|'current' }
  | { kind:'floor'; rect; safeWhen: Cond; color? }
WorldGate { rect; open: Cond; look; label? }   // wall until `open` holds
  look = portcullis grate wax rubble barrier ice coral sluice thorn roots bone candy cloud lightning orrery veil book
```

## Fights
```ts
EncounterDef { id; court; name /*fight*/; foeName; foeElement; difficulty: 1–5; hpMult? (1);
               gimmick: gimmickId | ''; at: Pt; look: NpcLook; challenge: string[]; beaten: string[];
               coins; quest? /*set by registry on duel foes*/ }
GimmickDef   { id; rules: string /*fight-card + opening banner*/; make(ctx: GimmickCtx): EncounterGimmick }
ArenaFloor = (g, W, H, rng) => void   // painted once at depth -100 under the fight
```
Hard mode on an encounter: foe maxHp ×1.3, `tk.damageScale = 1.25`.

### GimmickCtx (built per fight, IslesFightKit.ts:237)
```ts
scene; W; H; top /*96*/; hard: boolean; rng: () => number /*seeded*/
tk: BossToolkit            // foe (npc) is the toolkit's "boss"; palette from court.color
player: Fighter; npc: Fighter   // live getters
hit(f, amount, x?, y?)     // f.takeDamage(round, min 1) + flash; no-op if ended/dead/amount<=0
heal(f, amount)
nudge(f, dx, dy)           // positional shove, clamped to [40..W-40]×[96..H-40]
stun(f, ms)                // real stun: disarm + stunnedUntil (tray) + body held; unstoppable ignores
root(f, ms)                // body velocity zeroed each frame, can still cast; unstoppable ignores
silence(f, ms)             // basic attack only (silencedUntil)
float(x, y, text, cssColor); flash(x, y, color: number)
banner(text, cssColor = '#ffe2a8')
sfx(name)                  // panned at arena centre
victory()                  // win outright
```

### EncounterGimmick (all optional except update)
```ts
update(time /*ms*/, dt /*SECONDS*/)         // after tk.update; a throw kills the gimmick for the fight
drawGround?(g, time)   // depth 2, after toolkit ground   drawAir?(g, time)  // depth 30
drawHud?(g, time)      // depth 40, scrollFactor 0 (screen space)
playerSpeedMult?(): n  // pulled per frame; × tk slow × item windows, clamped [0.25, 2.2]
npcSpeedMult?(): n     // clamped [0.2, 2.2]
playerTakenMult?(): n  // → player.islesIncomingMult, clamped [0.2, 4]
npcTakenMult?(): n     // × item damage windows → npc.islesIncomingMult, clamped [0.2, 4]
npcSeek?(): Pt | null  // bot's mapSeekPoint (a SecretMap seek point wins over it)
onPlayerHurt?(amount)  // every damage > 0, including ctx.hit / tk hits
onNpcHurt?(amount)
destroy?()             // on reset (next match)
```

## Quests
```ts
QuestDef { id; area /*tracker group*/; name; giver: npcId; requires?: Cond;
           offer: string[] /*last line → Accept/Not now*/; accept: string[]; stages: QuestStage[];
           complete: string[] /*giver, on turn-in*/; reward: { orbs; coins?; item?; itemCount? } }
QuestStage { objective: QuestObjective; hint: string }
QuestObjective =
  | { kind:'talk'; npc; lines }
  | { kind:'defeat'; encounter }
  | { kind:'duel'; area; foe: EncounterDef }    // foe at foe.at only while stage live; never counts toward the prince gate; gimmick may be ''
  | { kind:'prince'; prince }
  | { kind:'fish'; fish; count }                // caught after the stage begins
  | { kind:'deliver'; npc; item; count; lines } // taken from inventory
  | { kind:'collect'; area; spots: Pt[]; label; emoji; color }
  | { kind:'visit'; area; at; r; label }
  | { kind:'cook'; recipe }
```

## Items
```ts
IsleItemKind = charm food artifact fish material rod key
IsleItemDef { id; name; emoji; kind; price? /*absent = not sold*/; sell?; flavor; effect?: ItemEffect;
              script?: scriptId /*key in bundle.scripts*/; scriptText?: string[]; isle }
```
Scripts run for equipped charms + artifact + meal (`Save.S().charms/artifact/meal`).

`ItemEffect` (src/data/Items.ts:13): `maxHp shieldCharges shieldHp regenPerSecond lifestealFrac reviveHpFrac
damageMult critChance critMult statusDurMult statusDmgMult damageTakenMult dodgeChance reflectFraction invincibleMs
speedMult cooldownMult ultimateCooldownMult selfDamagePerSec enemyMaxHpMult enemySpeedMult enemyDamageMult behaviors?`
`ItemBehavior { trigger: onHitTaken|onHitDealt|onLowHp|everyNSec|onCast; thresholdFrac?; periodSec?; chance?;
cooldownSec?; oncePerMatch?; action: burstAoe|healBurst|tempHaste|tempDamage|shieldCharge|cooldownRefund|sear|slowEnemy;
amount?; radius? (120); durationMs?; mult? }`

```ts
ItemScriptFactory = (ctx: ItemScriptCtx) => ItemScript
ItemScriptCtx { scene; W; H; player; npc; rng; hit(f, amount, x?, y?); heal(f, amount);
                float(x, y, text, css); flash(x, y, color); sfx(name) /*panned at player.x*/;
                slotOf(abilityId): 'click'|'e'|'r'|'f'|'q'|null
                refund(abilityId, ms)          // player.reduceCooldown
                boostDamage(mult, ms)          // foe-taken multiplier window (stacks multiplicatively)
                boostSpeed(mult, ms) }         // player speed window
ItemScript { update?(time, dt /*SECONDS*/); onHitDealt?(amount); onHitTaken?(amount);
             onCast?(abilityId, slot | null) /*after any earlier onCastStamp*/;
             drawGround?(g, time); drawAir?(g, time) }
ShopDef   { id; name; stock: itemId[]; buys? /*buys fish/materials at `sell`*/ }
RecipeDef { id; name; inputs: { item; count }[]; coins; output: itemId; makes? (1) }
BakeryDef { id; name; recipes: RecipeDef[] }
FishDef   { id /*= an IsleItemDef kind 'fish'*/; fisheries: id[]; weight; fight: 1–5; size: [minCm, maxCm]; rod?; when?: Cond }
FisheryDef{ id; name; kind }  kind = sea lava pond wax steam oil ice ink abyss bog syrup cloud aurora (cloud/aurora need skyline rod)
RodDef    { id; name; control /*widens catch bar*/; kinds: FisheryDef['kind'][] }
```

## Genes
```ts
GeneSlot = click e r f q
GeneGrant { effect?: ItemEffect; onCast?: { slot; damageMult?; speedMult?; ms? (2000); heal?; shield?;
            refundOthers? /*ms*/; refundSelfChance?; burst?: { damage; radius } } }
GeneNode { id; name; tier: 0–4 (4 = Enlightened); col: 0–2; needs: id[]; text; maxLevel;
           cost(level /*1-based*/): orbs; grant(level): GeneGrant;
           mastery?: { name; text; cost; grant }; infinite? }
GeneTree { element; name; nodes: GeneNode[] }
```

## Bundles
```ts
CourtDef  { id; isle; element; name; prince: { id; name; title; artifact: itemId }; tier: 1–4; area: areaId;
            floor: ArenaFloor; encounters: EncounterDef[]; quests: QuestDef[]; color }
CourtBundle  { court; area; gimmicks; boss: WorldBossDef /*worldId 'isle:<prince id>'*/; items;
               scripts: Record<id, ItemScriptFactory>; shops; bakeries?; fish?; fisheries?; placeholder? }
PortBundle   { area; wanderer; quests; items; scripts; shops; bakeries; fish; fisheries; rods;
               floor /*registered under the port's area id, for quest duels*/ }   // export <ISLE>_PORT
DungeonBundle{ area; encounters; gimmicks; boss /*monarch, worldId 'isle:<id>'*/; floor; items; scripts }  // <ISLE>_DUNGEON
IsleDef   { id; name; element; monarch: { id; name; title; artifact }; courts: id[]; port: areaId; color; chart: Pt /*0–1*/ }
```
Also: `BoatDef`, `DockUpgradeDef`, `UberDef`, `IsleBundle`, `IslesFightPayload` — IslesTypes.ts:569–645, 692.

## World bosses (BossDefs.ts)
```ts
WorldBossDef {
  worldId; name; title; color; colorLit; colorDark; accent;
  bodyR?               // leave alone: hitbox = look.torsoR
  damageMult? (1)      // × LETHALITY 1.6 × hard.damageMult → tk.damageScale
  intro: string[] /*first bannered large*/; banter: string[]; defeatLine; resumeLine?
  phases: WorldBossPhase[]; hard?: WorldBossHard;
  tuning?: Partial<Record<LibMoveId, LibTuning>>;
  signatures: Record<string, SignatureFactory>   // cycle refers as 'sig:<key>'
  look: BossLook; phaseStyles?: BossPhaseStyle[] // index-aligned; extraPhase takes the slot after last
  drawDecor?(g, s: BossBodyState)                // over the rig, every frame
  drawArena?(g, W, H)                            // once, over the court floor
}
WorldBossPhase { name; line?; hp; cycle: MoveRef[]; harass: HarassId[]; restMs; restEnragedMs? (restMs×0.55);
                 harassMs; moveSpeed? /*legacy, only with no movement style*/; holdDist? /*legacy*/;
                 bodyR?; style?: BossPhaseStyle /*overrides phaseStyles[idx]*/ }
WorldBossHard  { hpMult? 1.35; damageMult? 1.25; restMult? 0.7 /*rests + harass clocks*/; noHeals? true;
                 extraPhase?: WorldBossPhase; introLine?; tuning? }
MoveRef  = LibMoveId | `sig:${string}`
LibMoveId= volley radial spiral stream barrage minefield quake lanes sweep slamchain sanctuary homing summon hazard charge
HarassId = h-snipe h-flak h-orbs h-rune h-lane h-mines
LibTuning{ damage? count? warnMs? radius? speed? durationMs? halfW? rings? gapHalf? arms? intervalMs? spreadRad? }
BossPhaseStyle { movement?: BossMovement; gimmick?: BossGimmick; look?: Partial<BossLook>; tint?: BossTint }
BossMovement = anchor hover stalk orbit rush blink
BossGimmick  = none gloom shrink stalkers tremor wards
BossTint     = none hot cold pale void sick gold blood
SignatureFactory = (tk: BossToolkit) => SignatureMove   // instantiated once per fight
SignatureMove {
  durationMs              // boss busy after cast
  windupMs?               // overrides default wind-up (rig plants, `tell` shown over head)
  gesture?: BossGesture; hold?: BossHold; locksBody? /*movement AI stands down*/; tell?
  cast(time /*ms*/)
  update?(time /*ms*/, dt /*SECONDS*/)    // every frame, whole fight — gate on your own state
  drawGround?(g, time); drawAir?(g, time)
  onPhaseEnd?()                           // phase change / fight end: drop live state
}
BossGesture = punch slam raise sweep clap flex point recoil
BossHold    = spray charge draw brace reach conduct | null
BossLook (BossRig.ts:45) { crest: BossCrest; pattern: BossPattern; aura?: BossAura; hands?: BossHands;
  torsoR? (34; player 22); arms?: 2|4; eyes?: 1|2|3; eyeColor?; mouth?: BossMouth }
BossCrest  = horns crown spires halo antennae plume mane blades orbs veil tendrils stack none
BossPattern= cracks facets runes scales plates swirl rings static weave drip gears grid smooth
BossAura   = flame frost smoke sparks petals bubbles dust glitch chains coins leaves none
BossHands  = ball claw gauntlet wisp blade orb
BossMouth  = none grin grate maw line stitch
BossBodyState { x; y; t /*ms*/; hpRatio /*within phase pool*/; enraged; hurt; phaseIdx; hard; facing /*rad to player*/;
                castGlow 0–1; radius; palette: BossPalette; look; hands: {x,y}[] /*2 or 4*/ }
BossPalette { main; lit; dark; accent }
```
Colour helpers in BossRig: `mixColor(a, b, t)`, `shade(c, amt)` (+ lighten / − darken).

## BossToolkit (`tk`)
Reads: `scene W H player bossX bossY now palette hard damageScale telegraphScale addCount`.
In a gimmick fight the "boss" is the npc; `telegraphScale = 1` (WorldBossKit sets 1.45, ×0.86 hard).
```ts
clampX(x, pad = 44); clampY(y, pad = 44)      // y floor is 96
angleToPlayer(fromX = bossX, fromY = bossY)
hitPlayer(amount, x, y)       // the chokepoint: × damageScale, min 1; player only
explode(x, y, radius, damage, color = palette.main)   // boom + hitPlayer if inside
boom(x, y, radius, color?)    // visual only
slowPlayer(mult, durationMs)  // min of active slows; pulled into player speed
getPlayerSpeedMult()
pull(x, y, strengthPxPerSec, durationMs)   // capped at 130 px/s; stops within 30px
sfx(name)                      // panned at bossX
healBoss(amount, x?, y?)       // npc.heal + floating "+n"
schedule(delayMs, fn)          // dies on clearHazards / fight stop — use for multi-beat moves
warn(ms) => ms × telegraphScale
spawnBullet({ x, y, angle, speed, damage, lifeMs? 6000, r? 5, turn? /*rad/s homing*/, color? })
spawnLane({ x, y, angle, halfW, warnMs, fireMs? 380, damage })   // infinite line through x,y; hits once
spawnZone({ x, y, radius, warnMs, damage, slowMult?, slowMs?, fall?, poolMs?, poolDamage? })  // clock telegraph
spawnSanctuary({ warnMs, damage, safeR, idealDist? 380 })  // all but one circle detonates
spawnRing({ cx, cy, delayMs, speed, gapCentre, gapHalf, band, damage, startRadius? })  // speed<0 closes in
spawnMine({ x, y, armMs? 1100, lifeMs? 15000, blastR? 86, damage })  // trigger radius 52
maxMinesOnRing(radius)         // most mines on a ring that still leaves gaps
spawnSweep({ ox, oy, a0, a1, warnMs, travelMs, halfW, damage, length? })  // rehit 420ms
spawnPool({ x, y, radius, lifeMs, damage, tickMs? 600 })   // no telegraph: spawn it visibly
spawnCharge({ toX, toY, warnMs, travelMs, halfW, damage })  // moves the boss body (npc) via setPosition; +0.6 slow 700ms
spawnHealOrb(x, y, amount, lifeMs = 9000)   // heals the PLAYER on touch (34px)
spawnAdd({ x, y, hp, speed, damage, ranged?, maxAlive? 6 }): Husk | null   // thrall; null at cap
clearHazards()   // everything except heal orbs; orphans schedule()d beats
update(time, deltaMs); drawGround(g, time); drawAir(g, time); destroy()   // the kit calls these — don't
```
Dodgeability rules: warnings (`warnMs`, `armMs`, sweep/charge warn) are scaled by `telegraphScale`;
`spawnRing.delayMs`, bullets and pools are **not**. Rings outrun the player (≥300 px/s vs 200): a volley must
share one gap and drift it < `gapHalf` per ring. Keep mine spacing > 2×52 px (use `maxMinesOnRing`). Sanctuary sits
near `idealDist`, not "far". Hit tests (PLAYER_R = 20): bullet `< 20 + r`; lane/sweep `< halfW + 12`;
ring `|d − radius| < band` outside the gap; charge `< halfW + 20`; mine trigger 52.

## IsleArt (`src/isles/art/IsleArt.ts`; `g` = Phaser Graphics; set pieces take `x,y` = base/feet point)
```ts
mixC(a, b, t); lit(c, t); dim(c, t)            // colour mix / toward white / toward black
mulberry(seed): () => number; hashStr(s): number
groundFill(g, r: Rect, base, alt, speck, rng, density = 1)
blob(g, x, y, rx, ry, color, alpha, rng, lumps = 9)
stroke(g, pts: Pt[], w, color, alpha = 1)      // round-jointed polyline
road(g, pts, w, fill, edge, stone, rng)
flagstones(g, r, size, fill, grout, rng)
pool(g, r, deep, shallow, rim, rng)            // static body; animate surface yourself
shadow(g, x, y, w, h = w*0.3, a = 0.32)
house(g, x, y, w, h, o: HouseOpts, rng): Pt    // x,y = front-wall base centre; returns door point (y+16)
  HouseOpts { wall; roof; trim?; glow? (0 = dark); roofStyle?: gable|flat|dome|spire|slant; chimney?; door?; brand? }
brandSigil(g, x, y, r, color, a = 1)
rock(g, x, y, s, color, rng); lamp(g, x, y, glow, metal = 0x2a2420)
glow(g, x, y, r, color, a = 0.06, layers = 4)
barrel(g, x, y, s, wood, band = 0x3a3a3a); crate(g, x, y, s, wood)
fence(g, a: Pt, b: Pt, color)
tree(g, x, y, s, kind: 'snag'|'pine'|'round'|'palm', leaf, bark, rng)
banner(g, x, y, cloth, pole = 0x3a2e24, emblem?: (g, cx, cy) => void)
archway(g, x, y, w, h, stone)
motes(g, view: Rect, t, n, color, fall, sway, size, seed = 0)   // for animateOver; t in seconds
```

## Gotchas

- **Units.** Gimmick/script/signature `update` dt is SECONDS, `time` is ms. Painter `animate*` t is SECONDS.
  Every `*Ms` field and CC duration is ms. `tk.update` takes delta ms — but the kit calls it, not you.
- **Pieces:** `x` = centre, `y` = base; draw upward from `y`. **Solids** cover the base footprint only, never the
  drawn height (the player walks behind tall art).
- **internalHit guard.** `ctx.hit` sets an internal flag, so item scripts' `onHitDealt`/`onHitTaken` do **not** fire
  for kit-dealt damage (no proc loops). Gimmick `onPlayerHurt`/`onNpcHurt` **do** fire for it. `tk.hitPlayer`
  damage is a normal hit (scripts see it).
- **Clamps.** Player speed mult (gimmick × tk slow × boosts) ∈ [0.25, 2.2]; npc speed mult ∈ [0.2, 2.2];
  both taken mults ∈ [0.2, 4] — a taken mult of 0 does not make anyone invulnerable.
- **CC is real.** Use `ctx.stun/root/silence` — never fake a stun with a speed mult (it is floored at 0.25/0.2
  anyway). `stun`/`root` have no effect on `unstoppable` fighters; `silence` still applies.
- **Multipliers are pulled.** Return them from `*SpeedMult()`/`*TakenMult()` every frame; never write
  `speedMult`/`islesIncomingMult` on a Fighter yourself (ArenaScene / the kit rewrite them each frame).
- **Positions:** move fighters only with `ctx.nudge` (clamped) or `tk.pull`; never write velocity.
- **What gimmicks CANNOT do** (no API exists — don't hunt): touch, read, reflect or delete fighters'
  projectiles; detect a hit landing on a gimmick object (only `onPlayerHurt`/`onNpcHurt` amounts, no source/
  position); scale, lift, hide or make a fighter airborne; change a fighter's abilities or cooldowns
  (`refund` is ItemScriptCtx only, player only). Toolkit hazards only ever damage the player — hurt the npc via
  `ctx.hit(ctx.npc, …)` with your own geometry check.
- **Bot play:** give the bot the rule via `npcSeek()`; it is the only steering hook.
- **SFX names** must be in the `SFX` set in `.check-isles.mjs:43` (or the `ui-*` / reward voices it allows);
  the validator warns on anything else.
- **Errors:** a throwing gimmick `make`/`update`, script factory, floor, ground painter, piece or `animate*` is
  caught, logged `[isles] …` and disabled (`npcSeek` throws → null). Gimmick `draw*`/`on*`/mult hooks and every
  script hook after the factory are NOT guarded: a throw there breaks the frame.
- **Hard mode** for a boss: tk.telegraphScale ×0.86 and damage ×`hard.damageMult`; for an encounter gimmick read
  `ctx.hard` yourself (foe HP ×1.3 and `tk.damageScale` 1.25 are already applied; `ctx.hit` is NOT scaled).
