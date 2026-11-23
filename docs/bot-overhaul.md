# 1v1 Bot Overhaul — Roadmap & Working Notes

Status (2026-08-11): **framework complete, Silence (Batch 0) complete.** Every other
element still needs its batch pass (checklist below). This file is the durable copy of
the roadmap — it must be kept current as batches land.

## What the framework already does

- **Loadouts** (`src/data/NpcLoadout.ts`): solo 1v1 bots get upgrade slots by
  difficulty — Hard 3 random, Expert 4, Nightmare all — plus, at Nightmare, mastery on
  (mastered look + passive) and a curated bindable-ability bind from
  `NPC_MASTERY_BINDS`. Soul / Fate / Silence are passive-only (their bindables need
  player input). MenuScene passes `npcLoadout` (plain 1v1 + secret plates only — never
  dummy practice, stabilisation, campaign, gauntlet, bosses, online). ArenaScene feeds
  it into the same `npcUpgrades` / `npcMasteryBinds` / `npcMasteryOn` fields the online
  handshake uses; `hasNpcUpgrade`, `npcMasteryBindFor`, `npcMasteryActive` and the
  per-kit adapter getters are no longer `isOnline`-gated — populated fields are the gate.
- **NPC perks**: pre-existing — MenuScene rolls a random element perk at Expert+ and
  passes `npcPerk`; `hasPerk('npc', …)` is owner-aware. A richer assignment scheme is
  planned by the project owner; keep the `npcPerk` scene-data hook working.
- **Movement** (`src/entities/NpcOpponent.ts`): `MOVEMENT_PROFILES` per element
  (archetype brawler/skirmisher/zoner/summoner/assassin, preferred range band,
  retreat threshold), states chase / attack / retreat (retreat is a time-boxed window),
  approach weave, back-pedal inside band-min, wall-slide + corner escape.
- **Reaction tick**: ability decisions run on `DECISION_MS` (420ms Easy → 110ms
  Nightmare, 85ms True Nightmare); movement/dodge/charge/seek overrides stay per-frame.
- **Aim lead**: `leadX`/`leadY` on NpcOpponent hold Expert+ velocity-led aim. Routines
  opt in per ability — projectiles should use them, hitscan must keep aiming at the
  target's true position.

## Per-element batch checklist

Work the roster in batches (base five first, then the stalest reworks: light, sound,
fate, creation, growth, rubber, acid, hunt, time; then the remainder). For each element:

1. **Kit owner-awareness** — every upgrade branch reachable from an NPC path goes
   through the `up(owner, slot)` pattern (`hasUpgrade` vs `hasNpcUpgrade`). Kits still
   player-only as of Batch 0: Fire, Water, Life, Air, Earth, Oil, Ice, Growth, Crystal,
   Soul, Hunt, Time, Gravity, Creation, Electricity, Sound, Light, Magnet,
   Metal, Plasma, Gunpowder, Rubber, Magic, Technology, Echo, Fate.
2. **NPC mastery** — npc mirror state for the passive; a kit-side cast path for the
   bound ability driven by `arena.npcMasteryBindFor(slot)` (enhancement ids are NOT in
   `element.abilities`, so `Fighter.castAbility(enhId)` does nothing — the online
   mastery-replay handlers are the template); npc avatar gets `setMastered(...)` — most
   older kits only set the player avatar's mastered look, and need an
   `npcMasteryActive` API getter like SilenceKit's.
3. **AI routine rewrite** — `do[Element]Abilities` uses every ability, including
   upgrade-changed behavior and the mastery bind, with conditions that make sense;
   extend `NpcAiState` as needed (side-effect-free reads only); use `leadX`/`leadY`
   for projectile aim.
4. **Synergy pass (mandatory)** — enumerate the kit's internal synergies ("X enables
   Y") and wire EACH as a kit-published `NpcAiState` opportunity field executed FIRST
   in the AI rotation. See the "Bot synergy contract" section in CLAUDE.md and the doc
   comment on `NpcAiState`. Silence's three are the canon: `npcSilenceMatureStalker`
   (ritual → grabber), `npcSilenceSacrificeStab` (stab through own stalker),
   `npcSilenceMutateWatcher` (E+ seeker mutation, youngest-watcher / keep-two rule),
   plus the Stalk pair (2026-10-15): `npcSilenceStalkOpen` (cast F when the target can
   be held in the aura) → the mirror AI shadows them round to their back →
   `npcSilenceBackstabAim` (stab from inside the Stalked target's back shadow).
5. **Movement profile** — tune the element's `MOVEMENT_PROFILES` entry alongside the
   rewrite.

## Partial passes landed outside a batch

- **Fate (2026-11-22 kit revamp: Side Shuffle / Dice of Doom / Cursed Talisman / card-wager All In), steps 3 and 4.**
  One bundled field, `fateNpcHints` (`FateKit.getNpcAiHints`): `shuffleThreat` (a player bullet within
  200px is heading at the bot → Side Shuffle, whose decoys eat it and draw a card), `targetCursed`
  (the bot's talisman is on the player → All In while the wager can crit), `talismanOnMe` (counter-aim:
  throw cards at the player's talisman to break it). The die is spent kit-side (`npcSpendDie`: card
  faces on the best card, 3 held, damage faces launched in range). No NPC mastery; kit still not
  owner-aware for New Cards beyond `ownerHasUpgrade`.

- **Creation (2026-10-17 Q rework: Self-Destruct + Scrapnel), part of steps 3 and 4.** The Workshop
  is gone; Q is `self-destruct`. Synergy field `npcCreationDetonate` (`CreationKit.npcSelfDestructReady`:
  the player stands inside 85% of the blast radius of an npc-owned wall, automaton, or the Nexus) is
  checked first in `doCreationAbilities`. Set-up half of the same synergy: when Self-Destruct is ≥90%
  recharged and the player is within 220px, the bot drops a Create wall 80% of the way to them so
  there is something to blow. Q+ Scrapnel is gated on `hasNpcUpgrade('q')`. The mech stays player-only.

- **Fire (2026-10-16 perk overhaul + Supernova), part of step 3.** Fire's five element perks
  reach bots too (difficulty ≥ 4 rolls one from `getPerksForElement`). Synergy field
  `npcFireBoozeBombAt` (Alcohol → Pressure Bomb: the target is wading in the bot's own booze, so
  a charge on the puddle lights it under them) is checked first in `doFireAbilities`.
  `npcFireNoClick` stops a Blaze + Melt bot falling back on a click it does not have; a Melt bot's
  fireball becomes `FireKit.doMeltPuff` (a gout plus one pool). Supernova (alt Q, only present when
  the npc element carries it through `ALT_ULT_SLOT`) is cast at 90–400px above 55% HP; while it is
  open `isLocked` is true, and the kit lets go for the bot under 30% HP.
- **Water (2026-10-18 Bubble Barrage + Drippy/Splashy/Poseidon).** Synergy field
  `npcWaterBubbleSplash` (WaterKit → `WaterTides.npcBubbleSplashReady`: the player wears 2+ of
  the bot's bubbles) is checked first in `doWaterAbilities` and casts Splash on the player —
  every puddle tick also strikes each bubble, which passes 50% on. Bubble Barrage (alt Q, only
  when the npc element carries it) is cast under 300px in place of Pain Rain. The perks need no
  bot logic (Drippy/Splashy/Poseidon's wave fire off movement, hits and the ult cast id).
- **Shadow (2026-10-18 caltrops + trap perks + Grim Gloom), part of step 3.** Click is now
  Shadow Caltrops (`shadow-caltrop`), thrown at a velocity-led point. Synergy field
  `npcShadowGloomCaltropAim` (Grim Gloom + caltrops: while the bot's own gloom is up, salting
  the player's feet keeps them still, and stillness is what the gloom's tentacles strike) is
  checked first in `doShadowAbilities`. Grim Gloom (alt Q, only when the npc element carries
  it) is cast under 450px. R is cast with the player as the aim so a Vantablack claymore faces
  them; a bot carrying several trap perks picks a random trap per plant inside the kit
  (`trapKindFor`). The bot still never casts Black Hole.

- **Magma (2026-08-12 mastery; 2026-10-13 F/Q rework), steps 2 and 4, part of 3.** Magma
  Mastery shipped first: `npcMasteryActive` drives `setMastered` on the npc avatar, and
  `MagmaKit.updateNpcSaw` is the kit-side cast path for Magma Saw (a private hold/release
  timer, so nothing for `castAbility` to find) with `NPC_MASTERY_BINDS.magma` giving up the
  R slot; `magmaObsidianPoint` is walked into with the soft perfume-style seek so the
  collapse lands the Obsidian Coat. The F/Q rework (Blunder-Boil + Pressure Gauge, Molten
  Mutiny + Pirate King) rewrote `doMagmaAbilities` around the kit's new synergy fields:
  `npcMagmaCannonVolcano` (a volcano of its own beside the player → aim the broadside there,
  one round lights it critical), `npcMagmaGaugePressure` ≥ 0.6 (fire F *away* from the
  player so the hot recoil flight hits them for 18), `npcMagmaGaugeOver` (only vent an
  overpressured gun inside 110px, so the 35 it costs the bot also lands), plus
  `npcMagmaMounted` (click is cannons, nothing else is pressed — F would throw it
  overboard) and `npcMagmaPendant`/`npcMagmaShip` (don the pendant early, once). The kit
  steers the npc's ship itself in `advanceCursor` (holds 190px off the target). **Not done:**
  the bot never dismounts, does not place the volcano-under-the-player deliberately before
  mounting, and the movement profile (step 5) is untouched.

- **Death (2026-08-12), step 2 only.** Death Mastery shipped, so the kit now has its npc
  half. `npcMasteryActive` already drove `setMastered` on the npc avatar;
  `DeathKit.updateNpcMastery` is the kit-side cast path for Delay The Inevitable (a
  private timer, so nothing for `castAbility` to find), gated on the same two-second
  damage window the Inevitability passive reads (25 damage in 2s, or under 55% health) —
  never on cooldown, because the eight seconds it adds cost the bot the clock it is
  playing for. `NPC_MASTERY_BINDS.death` gives up R, and `npcDeathDelaySlot` is published
  so `doDeathAbilities` stops pressing the ability that is no longer under that key.
  **Steps 1, 3, 4 and 5 are untouched** — the kit is already fully owner-aware via
  `up(owner, slot)`, but the routine has no synergy fields and the movement profile has
  not been retuned.

- **Depths (2026-08-12), step 2 + step 4 only.** Depths Mastery shipped, so the kit now
  has its npc half. `npcMasteryActive` drives `setMastered` on the npc avatar and the Camo
  Fade passive runs for the bot exactly as it does for the player;
  `DepthsKit.updateNpcKraken` is the kit-side cast path for Release the Kraken (a private
  timer, so nothing for `castAbility` to find), fired at a point led 0.3s ahead of the
  target inside 300px. `NPC_MASTERY_BINDS.depths` gives up R (Eutrophication is the one
  ability that helps the player as much as the bot), and `npcDepthsKrakenSlot` is
  published so `doDepthsAbilities` stops pressing what is no longer under that key.
  Four synergy fields, all published owner-side and read first in the rotation:
  `npcDepthsKrakenStun` (a body a tentacle is holding → guaranteed Lungfish Strike, which
  is the only thing that starts a drowning), `npcDepthsSkeleMeal` (its own skele-fish
  inside slash reach while hurt → 50 health off the same key), `npcDepthsCamoed` (drives
  both a much closer Angler range and casting Eutrophication at almost any health, since
  every orb an invisible bot walks over becomes a trap), and a fifth that is deliberately
  *consumed in the kit rather than published*: `npcThrowAim` re-aims the automatic
  600ms-after-catch throw into its own kraken's beak whenever an arm is a stump, because
  the npc never presses F for the throw at all and the aim is the only decision there is.
  **Steps 1, 3 and 5 are untouched** — the kit was already fully owner-aware via
  `up(owner, slot)`, but the base rotation has not been rewritten and the movement profile
  has not been retuned.

- **Conquest (2026-08-12), step 2 + step 4 only.** Conquest Mastery shipped, so the kit now has
  its npc half. `npcMasteryActive` drives `setMastered` (a crown on the helm) and the
  Dictatorship passive runs for the bot exactly as it does for the player — the pike scales with
  whatever is banked, which a hoarding bot gets for free. `NPC_MASTERY_BINDS.conquest` gives up
  **F** (the barricade is the one placement whose whole value is standing next to something
  else), and `ConquestKit.lostBuild` makes that give-up real on the bot's side too: whichever
  build the Market's key used to place is struck out of `npcPickBuild`'s preference list, so the
  bot never gets both. The market itself has no ability id at all, so `npcReadyToBuild` refuses to
  offer it and `npcPlaceMarket` converts the arrival into a placement inside the kit — the same
  kit-side cast path Magma's saw and Depths' kraken use. Four synergies are executed owner-side on
  the 600ms think tick rather than published as `NpcAiState` fields, because none of them is a
  cast the AI routine could make: `npcMarketActions` opens Propaganda only while there is a bank
  to spend *and* a body being shot at, takes a Loan only with the opposite of both, and moves the
  surplus in and out of a Securities vault between builds; `npcBuildSpot` scores turret squares
  +400 inside a Blood money market's 128px patronage, which is the one placement decision the
  tree actually creates. **Steps 1, 3 and 5 are untouched** — the kit was already owner-aware via
  `owns(owner, slot)`, but the base rotation has not been rewritten and the movement profile has
  not been retuned.

- **Myth (2026-10-15, new test element) — steps 3, 4 and 5 landed with the kit.** The
  storyteller: a crowd passive paying Echo Shards (45 dealt in 4s), and every key with a
  shard-costing second act. `doMythAbilities` has two rotations (tray, and the five guns once
  Final Destiny is up). Published fields: `npcMythShards`, `npcMythTipStunLive` (a star-mace
  stun → slash first), `npcMythTruthWindow`, `npcMythDetermined`, `npcMythBeastLive`,
  `npcMythDestiny`, `npcMythTakenRecent` (≥28 in 1.5s → Determination), `npcMythCheerClose`
  (half a shard away → whip aimed so the tip lands), `npcMythVulnStacks` (≥2 → shotgun), and the
  seek override `mythFlipPoint` (walk into the beast's path for the 20% flip, with its own block
  in the movement section). **Gotcha — recasts are not casts:** right-click, E/R/F-again spend a
  shard without touching a cooldown, so they never reach `castAbility` and the routine cannot
  make them; `MythKit.updateBotRecasts` spends the bot's shards itself on a 420ms beat (dash when
  the target is inside 280px of an open window, recall when the beast is carrying the target
  >200px away, longer Determination under half health or with two spare, maces in whip range
  with two spare). Online the replica never self-recasts — the relayed `myth-*` pseudo-cast ids
  drive it through `MythKit.replayNet`. Profile: skirmisher [110, 240], retreat 0.22. Steps 1
  and 2 do not apply yet (no upgrades, no mastery). Not runtime-tested.

- **Radiation — REWORKED 2026-10-15, the notes below this one are history.** E is now Barrage
  (a 45°→5° cone held on a target for 3s, then a 5-round hitscan burst), R Fallout Bunker (75 HP
  lead ring; blocks shots and enemies, the owner takes no damage inside), F Rod Baton (close
  strike; dose, or 16 + 2s stun on a dosed target). Click and Q unchanged; Critical Mission, X-Ray,
  Waste Disposal, all upgrades and the mastery are gone. Bot fields: `npcRadiationBarraging`
  (the kit steers the bot's cone at a capped 2.6 rad/s with aim-error wobble; the AI presses
  nothing while it is open), `npcRadiationTargetDosed` (rod → stun, Barrage → 8s),
  `npcRadiationTargetStunned` (a lock that cannot be walked out of), `npcRadiationNeedsCover`
  (own airdrop falling, not sheltered → R first; the kit also holds the bot inside its bunker
  until the drop lands, so the bunker eats the self-hit), `npcRadiationSheltered`. The bot only
  draws Q while R is ready.
  **Upgrades (2026-10-16):** Flick Shot / Trigger Happy / Turret Town / Mutation / Complete
  Annihilation, all in RadiationKit's "Shop upgrades" section. Bot fields:
  `npcRadiationFlickReady` (offline the bot "faces" its walk, so a tracer thrown out of a retreat
  is barbed — fire it), `npcRadiationWantsDose` (R+ turrets standing with the target in reach, or a
  Q+ drop falling, and the target is clean → rod if close, else tracers), `npcRadiationKeepDose`
  (F+ would strip a dose the turrets or the falling drop still need → hold the hot rod). Trigger
  Happy needs no field: the kit steers the cone through the sustained fire, and the existing stun
  synergy is what makes it un-walkable.
  **Mastery (2026-10-17).** Nightmare binds Test Dummy over R (Fallout Bunker goes). The kit throws
  it itself (`updateNpcMastery`, offline only), halfway toward the target, for three reasons: its
  own airdrop is falling with no bunker round it (the dummy eats the 200 self-hit — the bunker
  synergy, moved), the flare gun is out within 460px (place all five unhurtable), or below 60% HP
  with the target within 320px. Fields: `npcRadiationDummySlot` (the rotation skips the bound key —
  every bunker/baton/flare cast checks it) and `npcRadiationDummyCoverReady` (with the dummy in the
  bunker's slot, Q is only drawn while the dummy is ready or standing). `needsCover` is false while
  a dummy stands. X-Ray Vision clears `targetInvisible` for a radiation-mastery bot. The player's
  own dummy is a decoy for bots (`radiationKit.npcDecoyTarget()`, after Illusion's in the
  `npcTarget` chain) and husks (`huskTargetsView`/`absorbDecoyHit`).

- **Radiation (2026-08-12), step 2 + step 4 only.** Radiation Mastery shipped, so the kit now has
  its npc half. `npcMasteryActive` already drove `setMastered` on the npc avatar, and the Sniper's
  Instinct passive runs for the bot exactly as it does for the player — a zoner keeping its band
  is simply harder to kill, with no decision to make about it (the sight line half is the player's
  screen only, like the X-ray's skeletons). `RadiationKit.updateNpcMastery` is the kit-side cast
  path for Gamma Tether (a private timer, so nothing for `castAbility` to find): it plants the post
  *on* the target rather than at a guess, on a 250ms think tick, only inside 520px and never while
  the drum owns the body. `NPC_MASTERY_BINDS.radiation` gives up **E** (the baton is the one
  ability that asks the bot to pick between two branches from inside melee, which is the range the
  new passive is paying it not to be at), and `npcRadiationMasterySlot` is published so
  `doRadiationAbilities` stops pressing what is no longer under that key. R is refused outright by
  `excludeSlots` — Final Vision is a prerequisite for Cutdown's Supercritical. One synergy field,
  and it is the element's whole point: `npcRadiationTethered` says a body is on the chain, and the
  rotation cashes it in three places at once — the drum's throw range goes 300 → 460, the baton
  fires against a target the chain has already dosed, the ultimate's range goes 380 → 520, and the
  tracer's `safeRange` goes to the full 700 because a pinned target cannot walk out of a click.
  **Steps 1, 3 and 5 are untouched** — the kit was already fully owner-aware via `up(owner, slot)`,
  but the base rotation has not been rewritten and the movement profile has not been retuned.

- **Bind (2026-10-26), rewritten with the soul-binder rework.** BindKit is owner-aware via
  `up(owner, slot)`. Kit-published fields, read first: `npcBindSeek` (walk to the nearest wild soul
  while Blackened Eyes is open), `npcBindChainAim` (E target in priority order: wild soul in reach →
  E+ revenant lined up to run back *through* the foe → cultist low on faith with a spare soul → the
  foe), `npcBindSiphonAim` (F+ revenant first, to make a cultist; else a visible wild soul; a bound
  soul only with 5+ banked), `npcBindOffering` (Q at 3+ — the curse lifts — or 1+ under 30% hp).
  **Kit-side bot hands:** right-click detonation (`updateBot`: a flying dagger within 70px of the
  foe, or 2+ stuck daggers within 240px), the chain's anchor recast when hurt, letting go of a
  siphon before a soul turns into a revenant (unless F+ can use one), and False Idol (bound over F
  by `NPC_MASTERY_BINDS`; planted at its feet, fed a spare soul). `npcBindIdolSlot` keeps the
  rotation off that key. Movement profile untouched.

- **Venom / `slime` (2026-10-25), all five steps — rewritten with the Venom rework.** SlimeKit is
  owner-aware throughout (`up(owner, slot)`, per-side grid/tail/burrow/rain/shed). Synergies, each a
  kit-published `NpcAiState` field read first: `npcAcidBiteReady` (target inside the coverage-scaled
  bite reach — the purge strips shields before the fangs land), `npcAcidApocalypseReady` (target
  standing on the bot's acid), `npcAcidBurrowReady` + `acidSeekPoint` (R+ ambush: walk onto own acid,
  go under, and the **kit surfaces the bot** within 80px of the target for the ×1.5 toxin blast),
  `npcAcidSprayWorth` (spray the target's footing when it is off the bot's acid). `npcAcidBurrowed`
  silences the rotation while under. Shed Skin (bound over R by `NPC_MASTERY_BINDS`) is **cast
  kit-side** at a banked milestone within 220px; `npcAcidShedSlot` keeps the rotation off that key.
  Profile `skirmisher [100, 240]`. The bot dodge is ×3 like the player's (Serpentine).

- **Savor / `gum` (2026-10-26, replaces Slime).** No upgrades or mastery, so steps 1–2 do not
  apply. Rotation `doSavorAbilities` rewritten for the two rows; profile `skirmisher [140, 320]`.
  The bot has no Space for the form flip, so **SavorKit flips it** (`npcThink`, 380ms tick, 2.6s
  gap) with a 200ms dash across the target's line, and publishes the row as `npcSavorForm`.
  Kit-owned behaviour the AI never re-derives: the walk onto its own candies and coated crystals
  (never licorice, not with the target within 110px), the orbit round the target during Sugar
  Diffusion (that is what earns the cube), and the stalactite's release on the timing bar (green
  at Nightmare+, yellow at Hard+, anywhere below). Synergy fields, checked first: `npcSavorLoanLive`
  (a Caring Share loan is on the target → the kit flips to Salt and the rotation grows Salt
  Infusion so the shard comes out coated), `npcSavorWound` (≥18 → Salt in the Wounds). Gates:
  `npcSavorAiming` (never press R again while it hangs), `npcSavorRacing` (Salt Crash — press
  nothing), `npcSavorStacks` (Caring Share ≥2, Sugar Rush ≥6), `npcSavorCandies` (bag only below 3),
  `npcSavorTargetDrained` (no more loops once the target has 3 cubes). Salt Crash race: the bot
  presses 0.6 + 0.4 × level crystals a second.

- **Marrow (restored 2026-10-12 as its own test element, beside Cloth).** `doMarrowAbilities` came
  back from the pre-Cloth commit unchanged, with its four kit-published `NpcAiState` fields:
  `npcMarrowCells` (sockets on the bone bar — the sixth cast is refused, so the rotation is a
  composition, not a spam), `npcMarrowMasts` (a second Mastacre over a live one is wasted),
  `npcMarrowInflammation` (the fever; a dry bar makes Q worth casting out of range just for the
  heat) and `npcMarrowTcellArmed` (F has transformed into a T-cell summon, which is the only time
  it is worth a socket). No movement-profile retune.
  **Mastery (2026-10-18):** Nightmare binds Brainstem over Q (Mastacre). Cellular Defense needs no
  bot work (the wall is raised by the kit). Brainstem is kit-fired in `MarrowKit.updateNpcMastery`
  — under 50% HP with a macrophage/killer T of 40+ HP, it rides the healthiest one; the ridden cell
  keeps its own AI and the bot's value is the invincible flower. `npcMarrowBrainstemSlot` makes the
  rotation leave the bound key alone, and `marrowKit.locksNpc()` sets `isLocked` while it rides.

- **Wax mastery (2026-10-18).** Nightmare binds Smoke-out over F (Hive Hearth); `npcWaxSmokeSlot`
  makes `doWaxAbilities` skip the hive build and the hive-feed Swarm (and would skip R/Q if rebound).
  Honey Shell needs no bot work. The smoker is kit-fired in `WaxKit.updateNpcSmoke` for its two
  synergies: wearing Rule Beetanica and still out of blast range, it smokes ahead (the chase carries
  the payload in under cover); under 55% HP and not in its smoke, it smokes its own feet.
  `waxSmokePoint` (an own cloud ≥60px a hurt bot is not inside) slots into the Wax seek chain after
  the hive redeem and before the candle. A player hidden in their smoke — or behind a cloud on the
  bot's sight line (`waxKit.hidesFrom`) — sets `targetInvisible`, so the bot falls back to blind
  wander like it does against Silence.
- **Tempest mastery (2026-10-18).** Nightmare binds Gale Uppercut over R (Summon Front);
  `npcTempestUppercutSlot` makes `doTempestAbilities` skip the front lay and the front slam (and F/Q
  if rebound). Unrelenting Storm needs no bot work. The uppercut is kit-fired in
  `TempestKit.updateNpcUppercut` at a foe inside the 250px dash. Synergy: `tempestJuggleShot` (a
  body its uppercut threw, not in the last 60px of the fall, inside 420px, with a charge) is checked
  first in both rotations — Click on it juggles it higher, and height is the slam's damage.
- **Myth mastery (2026-10-18).** Nightmare binds Wormhole over F (Beast of Myth); `npcMythWormSlot`
  makes `doMythAbilities` skip the beast (and the parry/Destiny if rebound). Wormhole is kit-fired in
  `MythKit.updateBotWormhole` (foe in 60–416px, led a little, never in Destiny). Synergies:
  `mythPortalPoint` walks the bot beside its red portal for the last 2.6s of the trap so Truth
  Breaker is waiting at the exit (shares the flip-point seek block); `npcMythLastStand` (Indomitable
  running) cancels the retreat window and puts the true-damage slash first — 75 in 8s or death.
  A player in the bot's wormhole sets `targetInvisible`; a bot in the player's sets `isLocked`
  (`mythKit.isTrapped`).

- **Cloth rework (2026-10-26): the scarf hand.** The tailor/tapestry kit is gone; Cloth is now
  Slime's hand-drag locomotion with a scarf for an arm. The bot cannot drag, so (like Slime) its
  speed is pulsed by `ClothKit.haulMult`, and its **Click is the hand's decision made for it**:
  `ClothKit.botClick` flings a bound body within reach toward the nearest wall, punches its own
  cushion when somebody is within 190px of it, or throws a needle within reach at the target, in
  that order, before falling back to the punch. Published fields: `npcClothTargetWrapped` (R →
  Click), `npcClothCushionPunch` (F → Click), `npcClothNeedles` (E → Click), `npcClothHasCushion`
  (don't replace a live cushion) and `npcClothBurning` (Q multiplies everything, so E/R/F are
  pressed through skip-chance while it burns). R+'s jacket is steered **kit-side**: the bot drags
  its victim onto its own cushion, or into its reach when it has none. The self-pin happens
  naturally — F plants the cushion 46px toward the target, so the chase walks the bot over it.
  No mastery exists for the reworked element (Bleed Stop and Outfit Change were retired with it).

- **Illusion F rework (2026-10-15), Tesseract → Guise, Mind-Boggle → Re-Trick.** Being fooled
  by the clone is the ability working, so ArenaScene hands `doAI` **`IllusionKit.npcDecoyTarget()`**
  as the target while the player is guised — a `Proxy` of the player that reads `x`/`y`/
  `body.velocity` off the clone, banks `takeDamage` into the clone and swallows every write.
  Invasion husks get the same view through `huskTargetsView` / `absorbDecoyHit`. The player's
  invisible shots set `playerShotsUnseen`, which skips the dodge loop. Bot side: Guise is the
  close-range / low-HP escape (checked before Relocate), the rotation is just Click while
  `npcIllusionGuised`, and the synergy **Guise → Re-Trick** is `npcIllusionRetrick` (kit-computed:
  the clone is <450ms from fading, or the player is within 130px of the real body and the clone
  is safer), executed first via `ctx.illusionRetrick()` because the recast bypasses `castAbility`.
  `NPC_MASTERY_BINDS.illusion` moved from F to **R** so a mastered bot keeps Guise.
- **Illusion E/E+/Q+/mastery rework (2026-10-17).** Two new synergies, both kit-computed:
  **Veil → Duplication** is `illusionSeekPoint` (`IllusionKit.npcVeilWalkPoint()` — an own unspent
  pane within 280px, null once Duplication is live), a hard seek in the movement block next to
  Dream's; **Dance → Relocate** is `npcIllusionDanceBombs` (`npcDanceRelocateReady()` — every
  teleport mid-Dance throws a Bomb Dance volley, held back while a pane is there to walk through
  first so the volley is doubled), checked right after Re-Trick. The 10° veil and the five
  illusion bullets need nothing from the AI: the bot's veil already hangs between it and the
  player, so its own Crack Shots cross it. Reality Shift is automatic (50 damage in 2.5s).

- **Soul (2026-10-17), Q → Turn (Hell's Torment deleted), Q+ → We are Legion, mastery passive →
  Corpse Prince.** `SoulKit.npcTurnValue()` → `npcSoulTurnValue`: what a Turn from the bot's spot
  would take right now (own/enemy grave zombies 1, enemy Amalgams 2, an enemy Alpha 3, princes 0).
  `doSoulAbilities` checks it before the generic rotation and casts at ≥3, or ≥2 below 60% HP. The
  prince needs no AI — it is seeded into the queue and the existing "Arise whenever a corpse is
  queued" branch raises it. Soul no longer starts with corpses, so the opening grave matters more.
- **Soul (2026-10-15), Click → Lantern of the Damned + soul beam, Click+ → Soul Lord.** Siphon
  and Possession are gone. `SoulKit.npcLanternTarget()` → `npcSoulLanternTarget` (nearest own grave
  zombie within 360px) replaces `npcSoulDrainPoint`: own zombies are now both the corpse supply and
  the lantern kill count, so the bot burns them first when its queue is under 2. `npcBeamAim()` →
  `npcSoulBeamAim` publishes an aim when the beam is ready and lines up 2+ targets (or a Soul Lord
  hemorrhage setup next to the opponent); the AI calls `ctx.soulBeam`, which only *starts* a charge —
  the kit fires it itself when full, so the bot's wind-up is as visible as the player's. Soul Lord
  is mirrored for the npc via `hasNpcUpgrade('click')` (kills, split, hemorrhage, orbs, ascension).
  Online: the beam release relays as pseudo-cast `soul-beam:<charge%>` → `replayNpcMastery` →
  `SoulKit.replayBeam`. The entry below is historical.

- **Soul (2026-08-16), step 4 only, forced by the Click rework.** Lantern Light became **Siphon**
  (`soul-siphon`), which changed the bot's default from "spray pools at the target" to "throw a
  cord onto one specific body", and that made the element's real loop reachable by an AI for the
  first time: a grave zombie is a corpse waiting to happen, and Siphon is the only thing that
  turns one into the other. `SoulKit.npcDrainPoint()` publishes where the npc's nearest drainable
  grave zombie is standing (side-effect-free, leash-checked at 330px) as `npcSoulDrainPoint`, and
  `doSoulAbilities` reads it **before** its fallback cord-on-the-player whenever the corpse queue
  is under 2 — so the bot actually feeds itself instead of standing in a graveyard it never
  harvests. Possession (Click+) is deliberately player-only: `doSiphon` gates the take-over on
  `owner === 'player'`, because riding a body is a control scheme rather than a cast and there is
  nothing for a routine to press. **Steps 1, 2, 3 and 5 are untouched** — the kit is still
  player-only on the shop upgrades (Cruel Offering's decay clouds and the graveyard tiers both
  check bare `hasUpgrade`), Soul's mastery is passive-only as noted at the top of this file, and
  the movement profile has not been retuned.

- **Time (2026-08-16), no bot work — recorded so the next batch does not trip on it.** Time's
  mastery passive changed from **Passive Manipulation** to **Reputation Repair**
  (`reputation-repair`), which removes the only thing in the game that scaled
  `physics.world.timeScale` — every AI timing assumption that used to be silently wrong inside a
  Focus/Rush arena is now simply right. The new passive is player-only and keyless: it fires off
  `TimeKit`'s damage ledger, so there is nothing for `doTimeAbilities` to press and no
  `NPC_MASTERY_BINDS.sand` slot to give up. Click also changed underneath the bot — rounds now
  ramp 12 → 15, and a fully aged one homes and sheds shrapnel — so the npc's automatic revolver
  (driven in `TimeKit.updateNpcRevolver`, not in the routine) is meaningfully stronger at range
  than it was, and the movement profile is now tuned for the wrong ability. Retune it in the batch.

- **Psychic (2026-10-15 chess rework), steps 2–3; movement profile untouched.** The whole
  kit was replaced (pawns, bishop/knight/rook pieces with auras, Queen form), and
  `doPsychicAbilities` was rewritten around four kit-owned fields. `npcPsychicMove` is the
  click the board wants this tick — a piece whose legal move passes through (or, for a knight,
  lands its blast on) the target led by the move's travel time; as the queen, her own slide;
  failing both, a rook taking one of the bot's own half-expired bishops/knights for the
  30-second aura. It is carried out with `ctx.psychicMovePiece(x, y)` (not a cast — moves have
  no cooldown) and checked **first**. `npcPsychicBishopAt/KnightAt/RookAt` are spawn points on a
  diagonal / rank-or-file / knight-jump through the target, picked nearest the bot so the aura
  lands where the bot stands. The queen is pressed once ≥2 pieces are up (her ×3 multiplies
  them) or below 45% HP; pawns only inside 200px and never as the queen. Planning is
  throttled to 120ms (`NPC_PLAN_MS`) and is off online. **Not done:** the bot does not walk
  *into* its own auras (no seek override), and the movement profile has not been retuned for
  a kit that now wants to stand still near its pieces.
  **Upgrades (2026-10-16, all gated on `hasNpcUpgrade`):** Castle (F+) and Mount Protect (R+)
  ride the same `npcPsychicMove` channel — `NpcPlan.piece === -2` is a castle, planned
  *before* the queen and piece checks when the target is within 63px and the rook is >150px
  from them (the slam lands on the target, the bot lands at the rook); below 50% HP with the
  target inside 160px, a knight whose aura the bot stands in is jumped *away* from the target
  (checked before attacking moves, so a hurt bot does not ride into them). Checkmate (Q+)
  publishes `npcPsychicCheckmate` (target ≤40% HP) and the AI crowns on it regardless of the
  board. Insight Move and Sight Lines are automatic in the kit.
  **Mastery (2026-10-17 redo — Outplayed + Pre-move):** Outplayed is passive and needs no AI.
  Pre-move is kit-fired in `updateNpcMastery` (Nightmare binds it over R; the rotation reads
  `npcPsychicMasterySlot` to stop pressing the Knight). The bot predicts from a 4-second,
  recency-weighted log of the player's fresh key presses (`pressLog`, filled by
  `trackPresses`) and only casts inside 460px once it has seen ≥1.5 weighted presses. As a
  *victim*, a bot's "keys" are read off its body: the direction its velocity starts going
  (W/A/S/D), `Fighter.lastPressAt` for abilities (stamped at the press, before the Opened Eyes
  queue) and `Fighter.dodgingAt` for Space. Synergy: the 0.6s stun leaves the target
  stationary, so `planNpc`'s led slide/blast lands on it without a dedicated field.

- **Gold (id `fortune`, 2026-10-15 rework), steps 3–5.** The shopkeeper was replaced by an
  alchemist and `doFortuneAbilities` rewritten around kit-published fields. Synergies checked
  first: `npcGoldHeartLive` → Plume thrown onto the gold-hearted target (`npcGoldPlumeAt`) so it
  has to walk out and fill its heart; Midas cast inside 420px while the target is above 30%;
  `npcGoldCanAdvance` gates E (the kit picks the card itself in `npcChoose`). `goldSeekPoint` is
  a soft seek to its own plume, its loot, or Midas floor while the curse is live.
  `npcGoldFrayAim` is the gravity-corrected aim for the falling grass. Movement profile is now a
  150–300px skirmisher. No mastery exists yet.
  **Upgrades (2026-10-16):** Accumulation (Click+), Glittery Cloak (R+) and Gold Hex (F+) are
  passives the kit runs for the bot; Artisan (E+) is played in `npcChoose`, which scores jeweled
  cards by their worth (Jade by how many jades it owns) and never picks one it cannot pay for.
  Full Metal Alchemy (Q+) publishes `npcGoldStatueHold` (its statue is up, uncracked, and the bot is
  short of an Advance) → `doFortuneAbilities` returns before anything else so the statue melts into
  its 3 coins, which `goldSeekPoint` then walks it to.
  **Mastery (2026-10-17):** Nightmare binds Rags to Riches over Q (Midas Curse). The kit fires it
  in `updateNpcMastery` once 20 gold is banked and the bot is above half HP (the gold is its Gilded
  Augment heal otherwise); `npcCanAdvance` saves every other purse for it (riches×2 ≤ picks → save).
  The rotation reads `npcGoldRagsSlot` and leaves the bound key alone. Gilded Augment runs itself.

- **Magnet (2026-10-15 scrap rework), steps 3–4; movement profile untouched.** Rods, Magnetize,
  Protect and Atom Smasher are gone; `doMagnetAbilities` was rewritten around MagnetKit's fields,
  all checked before the rotation: `npcMagnetRecall` (a nail has sat in the target 1.2s → rip it
  out via the non-ability `ctx.magnetRecall`), `npcMagnetRepulseAt` (the kit scores the cone —
  coins in it, a planted spike to launch, a nail coming home within 150px to re-fire, a shard to
  dash on when far, a nailed target to throw when close — and asks for Repulse at ≥2),
  `npcMagnetZipTo` (an unridden planted spike that closes the gap by 150px, or opens it when
  hurt → `ctx.magnetZip`; the next Repulse then launches the spike point-blank), and
  `npcMagnetHover` (hold the coins while Repulse is ≥70% back and two coins are past 1.2s —
  `ctx.magnetHover` every tick, idempotent). `npcMagnetCoinAim` tosses coins 110px toward the
  target so they hang inside the next cone; `npcMagnetSpikeAt` leads by 0.8s of velocity.
  `npcMagnetBusy` (gathering/piloting) returns null — the kit pilots the npc mech itself in
  `npcPilot` (smash on a 0.31s lead, rail/cannon off cooldown, avalanche after 3s, self-destruct
  with 1.2s left).
  **Shop upgrades (2026-10-16)** ride the same fields, so `doMagnetAbilities` is unchanged; every
  extra is gated on `up('npc', slot)` inside the kit. Magnetize (E+): `npcMagnetRepulseAt` scores
  +1 for catching an unmagnetised target in the cone, +1 more if a coin/nail/spike of the bot's is
  already in flight (it locks the moment they are magnetised). Nailstorm (R+): +2 to Repulse with
  2+ nails in a target within 340px, and `npcMagnetRecall` rips the instant all 3 are in.
  Electromagnet (F+): `npcMagnetZipTo` also rides a live spike within 145px of the target from
  160px+ out, so the Charged aura lands on them. Shatter Shot needs no play.
  **Q rework (2026-10-18): 7.5s gather, hurtable core, Q+ Salvage Salvo.** The bot's hidden body is
  the mech's core (each damage point = 50ms off the mech); `npcPilot` still self-destructs under
  1.2s left, which a drained core reaches sooner. Salvage Salvo: the bot rolls `randomBuild()` at
  the start of its gather (any head/core/arms); the kit pilots every arm through `use('smash')`
  (Clicks alternate arms; the Saw grinds on the npc's aim = the target). Junkyard synergy: its
  self-destruct drops 3 TNT crates, and `npcMagnetRepulseAt` scores +3 per crate in the cone, so
  the next Repulse throws them at the target.
  **Mastery (2026-10-17).** Nightmare binds Mag-Lev over F (Steel Spike and its zip go with it).
  The kit fires it in `updateNpcMastery` — the track's aim is the target — when the target is
  magnetised or nailed by the bot within 440px (synergy: on the track they move at half speed while
  the bot rides it at +50%), or when the bot is under 35% HP within 240px with Repulse ready. The
  second case pays off through `npcMagnetRepulseAt`: +3 when hurt, close, and its own track lies in
  the cone, so the Repulse kicks the bot backward off the ground (Mag Kick). Coins tossed while
  standing on the track hang over it until that Repulse fires them. The rotation reads
  `npcMagnetMagLevSlot` and skips the bound key (and its second job). Magnetic Field runs itself.

- **Sound (2026-10-15 marching-band rework), steps 3–5.** The violin/boombox/bugle/Coda kit is
  gone, and with it `npcSoundHarmonizeIn` / `npcSoundComposeSlot`. SoundKit now runs the bot's
  metronome itself (`botMetronome` rolls each 1.1s beat once against `NPC_BEAT_CHANCE[level]` and
  clicks inside or before the window) and steers its baton at the player, so the rotation never
  presses Click. `doSoundAbilities` reads, before anything else: `npcSoundSoloing` (on stage → the
  kit plays the Call of the Void chart with `NPC_SOLO_CHANCE[level]` per note → null), then the
  synergy `npcSoundDetonate` (a Fermata victim has been out of tune ≥3.5s or has <1.5s left → the
  free recast through the non-ability `ctx.soundCast('fermata-detonate')`). Then Hum until
  `npcSoundSong` matches `npcSoundWantedSong` (Smooth under 40% HP, Melody when out of baton
  reach, else Staccato), Q whenever up, Fermata inside 230px, Crescendo inside 260px. Movement
  profile is now a 70–150px skirmisher (baton reach 170). No mastery exists yet.
  **Upgrades (2026-10-16), all gated on `hasNpcUpgrade`:** Click+ — `botMetronome` aims for the
  Perfect sliver (spread `0.7 − 0.1·level` of the window), and the kit brings the baton home for a
  Tempo tap when the player is >380px away (`npcWantsBatonHome`). E+ — `npcSoundVictimDancing` →
  Fermata inside 320px while the player can't attack. R+ — the kit brings the baton home when the bot
  is under 70% HP with R ready; `npcSoundHarmonyReady` → press Fermata (resolves to In Tune), then
  `npcSoundHarmonyRelease` (regen ≤0.5 HP/s, i.e. the net's peak) → free `soundCast('harmony-release')`,
  read first of all. F+ — passive, levels from the bot's own beats. Q+ — kit-played: the solo speeds up
  to tempo `1 + 0.16·level` unless the bot is under 35% HP; `npcSoundDeaf` → the rotation stands down
  after Hum (wanted song becomes Melody, or Smooth under 50%).
  **Mastery (2026-10-18)** — Nightmare binds Forte Piano over F (Hum). Autotune runs kit-side
  for the bot, so `npcSoundWantedSong` just echoes the song playing. `npcSoundPianoSlot` → the
  rotation leaves that key alone; `npcSoundSoloing` is also true while seated at the piano. The kit
  sits down (`updateNpcMastery`) when the player still has a long Fermata stack (the crash makes it
  Dissonance) or, rarely, with room (>200px, >45% HP); it plays steady sweet intervals by rung and
  aims the drop at the player, locking 0.45s out. `npcSoundDoubleStack` (piano stack, no slam
  stack) → Fermata inside 300px, read first. Detonations (both kinds, `npcWantsDetonate`) hold
  ≥3s on a Dissonant victim so the bleed works before the double pop.

- **Wood (id `gluttony`, 2026-10-25 birch-ent rework replacing Harvest), steps 3–5.**
  `doGluttonyAbilities` was rewritten around GluttonyKit's fields, all checked before the
  rotation, in pay order: `npcWoodCanExecute` (after the 35, the bot's health + Sap HP is ≥1.6×
  the target's — the kit checks reach too) → Q; `npcWoodExecuteNeedsSap` (the line is ≤60 sap
  away and there is room for it) → Oakbrew first; `npcWoodRecarve` (one of its carverangs is in
  the last stretch of its loop) → Click, which re-carves it; `npcWoodPruneAim` (Q+, a sprout of
  its own with ≥40 health in scythe reach) → Q at the sprout above 35% health;
  `npcWoodDigestValue` ≥ 40 (damage in the last 5s) → Digest; `npcWoodTreeAim` (the kit picks a
  tree: the one furthest from the target below 45% health, the one nearest the target when it is
  >380px off) → Commensalism. Rotation: brew inside 260px, scythe inside 170px (Taints), carverang
  under 460px. `woodSeekPoint` walks it onto its own sprouts while its Digest aura runs (R+ feeds
  them, Mutualism pays it back) and to its own apples (F+). The kit picks the curl at random per
  throw. Movement profile: brawler 90–240px, retreat at 20%.
  **Upgrades:** Click+ Amber Edge, R+ Mutualism, F+ Friend of the Forest and Q+ Prune need no
  extra AI beyond the fields above. E+ Brewmaster is kit-played: the bot's Oakbrew puts the cup on
  and `GluttonyKit.updateCooking` drinks it after a random 1.2–3s boil, or spills it on a hit;
  `npcWoodCooking` keeps the rotation off E meanwhile. No mastery yet.
- **Pressure (new test element, 2026-10-25), steps 3–5.** Every key is a hold, so the kit holds
  them for the bot: `castAbility` *starts* the charge (`PressureKit.botBegins`), the kit plans the
  pressure (`botPlan`) and lets go in `updateBotHolds` once the plan is reached and the target is
  in reach (or after a 2.5s grace). `npcPressureCharging` keeps the rotation off every key
  meanwhile. Release is banked in the background whenever its hands are free. Synergies, checked
  first: `npcPressureTargetPinned` (target grounded or stunned for >0.9s — slam 100, punch 100,
  vent blast, Shell-Shock) → punch, which the kit plans to as much pressure as the pin leaves
  time for, or (E+) a quick 35 on a grounded target to Shell-Shock it; `npcPressureVentShot`
  (≥50 banked, target in the jet, and the bank not worth more kept — a full bank's +20% charge
  rate, F+ at 75+ — unless it finishes them, peels them off, or they are pinned) → Release;
  `npcPressureExceedReady` (inside 320px, above 35% health) → Exceed, after which `botPlan`
  asks for full charges. `pressureCompressPoint` (R+) walks it into its own orb above 50% health.
  Rotation: slam inside 170px, orb 130–460px, punch inside 300px. Movement profile: brawler
  70–200px, retreat at 18%. No mastery yet.
- **Ink (new test element, 2026-10-25), steps 3–5.** Skedaddle and the anvil are holds the kit
  drives: the bot's R `castAbility` starts the run and `InkKit.updateBotCharge` lets go at the
  planned length (`botSkedPlan`: 3–4.2s on a helpless target, 1.2–2.1s otherwise); its F starts the
  haul and `updateBotAnvil` drops it — at once on a stunned/slipping/flattened target in reach,
  on anyone in reach after 1.2s overhead, and always by 2.5s, so a bot never crushes itself.
  `npcInkBusy` keeps the rotation off every key meanwhile. Finger Guns have no cooldown, so
  `npcInkGunReady` paces the bot's "clicks" at 170ms. Synergies, checked first:
  `npcInkTargetHelpless` (target slipping >2.5s or flattened >1.5s — the peel's and the anvil's
  own debuffs) → anvil, else a long Skedaddle; `npcInkPeelLane` (the bot is running from the
  target, so a peel dropped behind its stride lands in their path) → peel; `npcInkFouxReady`
  (inside 380px, no Foux World up) → Q. `inkSeekPoint` walks it (F+) to its hungry anvil with five
  peels out, and during its own Foux World out through the wall furthest from the target so
  following costs foam damage. A flattened bot's casts are remapped through `Fighter.inkSwap` in
  `NpcOpponent.castAbility`. Rotation: peel inside 150px, anvil 140–330px, bounce inside 420px,
  guns inside 520px. Movement profile: skirmisher 150–320px, retreat at 25%. No mastery yet.
- **Astra (new test element, 2026-10-25), steps 3–5.** Everything is direction-locked until star
  mode, so the kit owns the geometry. `astraSeekPoint` walks the bot onto the target's row, 14px
  below it (the click only flies level, and the smite picks the highest body) — 240px off, 150px
  during the trial; absent in star mode. Synergies, checked first: `npcAstraFlareShot` (target
  smitten or stunned so it cannot leave an arm, or already on a plus/X arm; with E+ on the ring)
  → E; `npcAstraSmiteSafe` (the target is the highest body, not the bot) → R, and (R+) the kit
  fires the second bolt itself in `AstraKit.updateBot` once `npcAstraRecastSafe`;
  `npcAstraWarpShot` (star mode with ≥2 of the target's abilities ready to steal; F+ any time;
  otherwise a swap with a target below the bot, which puts the bot underneath for the smite) → F;
  `npcAstraTrialReady` (inside 380px, above 45% health, Q not lost) → Q. A Q+ bot holds to 1–2
  stars (`botStars`) and the kit lets go; the slap is kit-fired when it finishes the target or
  with under 3s of star mode left. `npcAstraBusy` (holding, or the five-star finale) keeps the
  rotation off every key. Rotation: Starstruck whenever `npcAstraLanedUp`. Movement profile:
  zoner 200–340px, retreat at 25%. No mastery yet.
- **Memory (new test element, 2026-10-26), steps 3–5.** The kit owns the geometry: Snatch's
  release aims at the target when the 2s spin ends, and Rebirth's pivot is planted 90px off the
  target with the kit striking the moment the sweeping line lies across them. Synergies, checked
  first: `npcMemoryTraumaReady` (the Snatch beam is under 0.9s from going, the static copy still
  has ≥2 casts to replay, the recording is ending with ≥2 casts in it, or the target's Guilt is
  ≥40) → Q — every hit in the window is a wound relived every second; `npcMemorySnatchShot`
  (target inside 500px sitting on ≥2 ready non-ultimate abilities, or stunned) → E;
  `npcMemoryRepressReady` (target inside 420px) → F; `npcMemoryRebirthWorth` (passives not
  already sealed, inside 600px) → R. `npcMemoryInTrauma` lifts the skip roll off E and R.
  `npcMemoryBusy` (spinning or sweeping) keeps everything but Q off the keys. Rotation: Forget
  inside 600px to keep three shards latched. Bots carrying shards are handicapped in turn: one
  → 40% of their casts at a Memory player go 16–32° wide (`ArenaScene.scatterAim`); three →
  `memoryBlindUntil` re-rolled every 0.8s at 45%, refusing all but the click in
  `NpcOpponent.castAbility`. Movement profile: zoner 220–380px, retreat at 30%. No mastery.
  Upgrades (E–Q, 2026-10-26): Shutdown and Salt in the Wound need nothing new (the snatch already
  waits for a loaded target; the phantoms are kit-aimed with lead and land inside the Trauma
  window they open). Brain Drain turns `npcMemoryRebirthWorth`'s sealed check back on.
  Unforgettable: `npcMemoryRepressReady` is also true while a copy still has >2.5s to walk, so the
  bot records copies into copies of copies.
- **String (new test element, 2026-10-26), steps 3–5.** The kit owns the geometry: where the
  strands lie, where the puppet is walked (`botSteerGoal`: onto the nearest of the bot's spiders,
  else 40px past the nearest of its strings so the push snaps it over them, else in front of the
  bot) and the hex strand's recast, which is kit-fired (`StringKit.botHexSnap`) once the target is
  tied to it or within ~28px+body of it and the strand is ≥0.9s old. Synergies, checked first:
  `npcStringTombReady` (no tomb up, and Spider Dance ready or the target under 40%) → Q, so E
  follows and the spiders walk the four guy-lines into the cocoon; `npcStringSpiderReady` (a tomb
  up, a string tied to the target, or ≥2 strands) → E; `npcStringPuppetShot` (target inside 476px,
  not already a puppet or entombed, and spiders or ≥2 strands to walk them into) → F;
  `npcStringHexShot` (no hex out, target inside 640px) → R. Rotation: Tension Snag at the target
  inside 700px. A bot *inside* a Linen Tomb holds still (`stringTombedUntil` zeroes its velocity
  ahead of the movement switch) and spends itself cutting the silk. Movement profile: zoner
  200–360px, retreat at 30%. No mastery.
  **Upgrades (2026-10-26):** Click+ Metal Spool is kit-fired (`StringKit.botSpool`): with no metal
  string out and the target inside 700px the kit winds the bot's spool and fires it at two
  seconds, publishing `npcStringSpooling` so the rotation holds its plain throws meanwhile. E+
  Bewitched Spiders needs nothing new (the hex strand is already thrown first and E follows).
  R+ Spider Swing rides `botHexSnap`, which now goes through `recastHex` (so the bot swings in on a
  strand tied to the target) and also snaps a wall-tied strand to escape (`npcSwingAway`: bot under
  35%, target inside 220px, far end >300px from it). F+ Puppet Play: `npcStringPuppetPlay` (a live
  puppet) → E then R before anything else, each one a backfire on the puppet. Q+ Spinal Snap needs
  no reader — the web tears on everyone's casts, so the rotation already breaks it.
- **Dream (2026-10-17 sandman rework replacing the pendulum), steps 3–5.** One info object,
  `npcDream` (`DreamKit.npcAiInfo`, side-effect free), plus `dreamSeekPoint`. In the waking
  world: a sleeping target is never shot (Sandmen damage wakes it) — the bot tops the meter up
  with pillow/dagger while it is under 75 (both refuse to hurt a sleeper), then casts Delve once
  `delveReady`; `dreamSeekPoint` walks it to a sleeper with ≥45 drowsiness until it is inside
  ~120px. Awake: pillow opens on `pillowFresh` (≤10, the +34 dose), the dagger goes whenever
  it is up (more drowsiness the sleepier they are, half cooldown on a hit), Sandmen while
  `canFire`, Nightmare only as a finisher below 40% HP (out here it costs 15 sleep). In a
  dream: `shouldSurface` (<22 drowsiness left) → E out to top up and come back; Nightmare
  first when `nightmareReady` (it adds the walking stalker); a leech when none is out (the seek
  point walks it to the leech to pull it); claw up close; pistols. The kit gives the bot its
  own recoil at half the kick, tamed continuously. Movement profile unchanged (assassin
  100–240px).
  **Upgrades + mastery (2026-10-18).** Readers on `npcDream`: `featherShots` (R+: feathers in an
  awake target → Sandmen first, every round adds drowsiness), `clawFirst` (R+ in a dream: claw
  before the pistols while the victim has <2 scratches, every scratch is +3 on every hit),
  `boxSlot` (the rotation skips the key the music box is bound over). Kit-fired, offline only:
  `updateNpcAmnesia` (Click+: throws a magazine with ≥12 rounds at an awake foe inside 320px —
  never a sleeper; in a dream only with both pistol rounds loaded), `updateNpcLucid` (E+: switches
  on what the sleep left can pay for — all but Split at ≥70 or while Sleep Paralysis holds the
  meter, Spikes+Empower at ≥45, Empower at ≥28, none below), `updateNpcBox` (mastery: winds 3.5–5s
  over a sleeper — the lullaby's 4/s outpaces the 5/s burn's net — or 1.5–3s over a ≥35 drowsy
  foe). Q+ needs nothing new: the dream branch already opens on Nightmare, which now also stops the
  dream's clock. F+'s dropped leech is walked to by the existing seek point. Nightmare bots bind
  the music box over F (`NpcLoadout`).

- **Devotion (id `passion`, 2026-10-15 rework replacing the charmer), steps 3–5.**
  `doPassionAbilities` reads one kit-published bundle, `npcDevotion` (from
  `PassionKit.npcOpportunities()`), and checks it before the rotation: `ascendNow` (target
  within 34px of the bot's own row, so the chariot hits both and carries the bot onto them) →
  Q; `crucifixPoint` (the bot's own feet inside 150px — a sanctuary the player is shoved out of —
  otherwise a wall 45% of the way to them when none is standing) → F; `grenadePoint` (target in
  the bot's holy water, on its crucifix rim, or ≥50% faith) → R; `waterPoint` (the target's
  lead, unless a puddle is already there; gated on `npcDevotionWaterCharges`) → E. During the
  Ascendance wind-up `holdLineY` steers the bot vertically onto its own line so it gets picked
  up. `npcDevotionRiding` blocks casting while it is off the field. The kit chooses the bot's
  sermon charge (full when the target is pinned or ≥75% faith). Movement profile kept from
  Passion: skirmisher 150–290px.
  **Upgrades (2026-10-16):** Click+ Disarming Words, E+ Purge Sins and R+ Repentance are
  passive on the bot's own casts (its letters bless the player's shots, its puddles purge, its
  grenade leaps on its own) — nothing to decide. F+ Pocket Crucifix and Q+ Pillars of Fire
  bypass `castAbility`, so — like Conquest's economy — the kit plays them for the bot instead of
  publishing them: `updateNpcPocket` picks the cross up and raises it when the player is within
  170px while the bot stands in its aura (the sanctuary walks with it and shoves them off),
  lowers and sets it down once they are past 220px; on a sky ride `updateRide` drops a pillar on
  the player's lead 1.2s in and every 2s after. A bot holding the cross does not preach (its
  sermon cast is a no-op, matching the player's click).
  **Mastery (2026-10-17).** Pray Always is passive (the kit keeps the bot's 8s prayer clock and
  rolls its answer). Nightmare binds the Ark of the Covenant over F (Mount Crucifix and the
  pocket crucifix go with it); `doPassionAbilities` reads `npcDevotionArkSlot` and skips that
  key's synergy and rotation casts. The kit fires the Ark in `updateNpcMastery` from
  `npcArkPoint()` (side-effect free), 120–720px from the player: under 50% faith on the
  player's sightline 45% of the way (their aim at the bot is a stare), over 50% 32° off that
  line (the pull drags their aim off the bot and the dragged aim still stares). As a *victim*,
  every bot and husk averts its aim up to 16° from an enemy Ark under 50% faith and is pulled
  5°–14° toward it over — `Fighter.bendGaze`, read in `NpcOpponent`'s two aim angles and
  `Husk.jitteredAim`.

- **Life (2026-10-16 garden rework — eight new seeds), steps 3–4; movement profile untouched.**
  Rose, Nurse Lily and Cotton are gone; the bed is Sunflower (3s solar link), Nightcap (poison
  bombs), Helicopter (rotor blades), Mushroom Colony (8-way volley), Frost Lily (piercing
  chill), Flaming Sprout (5s machine gun), Lotus (orb) and Pitcher (sprinkler). The bot used to
  plant only Sunflowers; now `LifeKit.npcPlantPlan()` picks the seed *and* the spot, and
  `createPlant(…, 'npc')` reads the same plan for the seed — so the plan must stay a pure
  function of the board (no randomness), or the seed the AI aimed for and the seed that grows
  would disagree. Plan order: Helicopter between itself and a target inside 200px → Flaming
  Sprout in front of a target inside 320px → **Pitcher at the centroid of two or more of its
  attackers (synergy: watering)** → Lotus at its feet below 60% HP → the missing seed of the
  rotation; with a full bed only the situational seeds replace a plant. Other opportunities, all
  checked before the rotation: `npcLifeShieldAt` (a half-dead plant with the player on it →
  Root Shield), `npcLifeFertilize` (two plants inside the wave → Fertilize), and
  `lifeSeekPoint` (a ripe Lotus orb within 300px → a soft walk to eat it, like Gold's seek).
  Online, the human opponent's pick arrives as a `life-seed:<id>` pseudo-cast and overrides the
  plan. Steps 1–2 still owed: Life's upgrades and Reap are player-only.
- **Tempest shop upgrades (2026-10-18), step 3 extras.** All five are kit-internal and gated on
  `api.hasUpgrade('npc', slot)` (= `hasNpcUpgrade`), so a Hard+ bot plays them for free; three
  new synergies are published by the kit and checked before the rotation. `cloudShot('npc')` →
  `npcTempestCloudShot`: airborne with a foe within 120px and no cloud of its own up → E (the
  hop drops the E+ thundercloud on them). `cycloneReady('npc')` → `npcTempestCycloneReady`: on
  its flight schedule with no current within 80px (and none offered within 480) → F makes an F+
  Cyclone. `floatPoint('npc')` → `tempestFloatPoint`: airborne with R+ → a soft steer over the
  nearest live front (shares the current-point movement override), and while hovering
  `canFrontSlam` only offers the slam if a foe is inside that front. Q+ needs no bot logic (the
  dive/crash it already plays triggers the Herald), but `currentSeek`/`cycloneReady` ignore the
  flight schedule while any Herald weather is live, because every launch is 1.4× then.
- **Paint (2026-10-18 Chalk → Paint rework, id still `chalk`), steps 3–4.** Canvases are filled
  from templates (`npcBrushTemplate` — bar / dart / plain, once per match; `npcStillTemplate` — a
  90px hollow ring for the biggest hitbox), coloured when the bot owns the Click+/F+ upgrade. The
  floor is painted by the phantom cursor in `PaintKit.advanceCursor`: orange is circled over the
  player's feet — a full 1.15-lap loop when it owns E+, which is how the Paint Bucket synergy is
  executed — walls are swept across the bot→player line (R+ colour from `npcWallPaint`: green
  under 50% HP, else red), and the Masterpiece goes blue under itself, red under the player, green
  under itself again when hurt. Synergy fields checked first in `doChalkAbilities`:
  `npcPaintTargetStilled` (the player is the bot's Still Life → orange under the big slowed
  target) and `npcPaintShotsIncoming` (≥2 hostile shots inbound → a wall). Yin-Yang is cast by the
  kit on its own clock (`updateNpcYinYang`, when ≥2 of the player's bars are cooling) and bound
  over R in `NpcLoadout`; the bot scribbles black over the player's F/Q/E cards, then white on
  its own tray.

- **Ice / Air / Crystal masteries (2026-10-18), step 2 + step 4 only.** Ice's bindable is now
  **Curling Bomb** (`curling-bomb`, Curling Stone and Icicle Impale deleted; old binds migrate in
  `PlayerData.getMasteryBinds`). Nightmare binds it over R; `npcIceBombSlot` makes `doIceAbilities`
  skip Block Up (and Skate/Frozen Solid if rebound). The bomb is kit-fired in `IceKit.updateNpcBomb`
  (player 140–420px away, no own bomb out). Synergy `npcIceBombAim` (`IceKit.npcBombShotAim`: an
  own bomb on the line to the player, 35° cone, player beyond it) is checked first — the spike
  lights the wick and sends the bomb on into them, or steers a lit one back. Air's bindable is now
  **Weather Cycle** (`weather-cycle`, Winds of Change deleted); Nightmare binds it over F and
  `npcAirWeatherSlot` skips Sky Grapple (R/Q if rebound). It is kit-fired in
  `AirKit.updateNpcWeather` inside 320px; the kit records the bot's own `do*` casts for 5s and
  replays them re-aimed at the player's live position. Crystal Shredder now grabs: a blade that
  bites a fighter while the disc is moving carries them at the hub (through the owner's portals)
  until it lands; a carried npc is `isLocked` (`crystalKit.isCarried`). Nightmare's bind moved
  from F to **Q** so the bot keeps its portals; `npcCrystalShredderSlot` skips Trick of the Light.
  Kit-fired in `CrystalKit.updateNpcShredder` with the synergy inside `npcShredderAim`: if an own
  gate stands 20–260px beyond the player on the same line (14°), the throw is aimed at the gate so
  the blades catch the player on the way and come out of the other gate with them.

## Gotchas (learned the hard way — read before each batch)

- **The reaction tick shrinks per-frame random gates ~10×.** Old routines rolled
  `Math.random() < p` at 60hz; they now roll it every ~110–420ms. When rewriting a
  routine, retune probabilities upward (or replace them with state-driven conditions,
  which is the point of the rewrite).
- **Retreat silences old guards.** Checks like
  `this.aiState === 'attack' || this.aiState === 'chase'` were always-true with two
  states; during the new retreat window they're false, so those abilities go quiet.
  Fine for a disengage read, wrong for kiting zoners — decide per element.
- **Mastery cooldown seeding**: kit-owned mastery ability timers need
  `lastCastAt = -COOLDOWN` style seeding or the bot's first cast silently waits out a
  full cooldown.
- **Silence corner-bug post-mortem** (the shape of bug to avoid): `isInvisible` was
  `inFog || stealth > 0` (since 2026-10-15 it is `stealth >= 20`), and the old npc slink (`!invis && stealth < 35` → full-speed
  seek to a static wall point) flip-flopped against doAI's chase at the fog line every
  frame. The cure was *commitment* (a `npcFogFarming` hysteresis flag that only a full
  meter clears) plus arrival damping. Any kit steering that can disagree with doAI
  about the body needs the same shape: one owner at a time, hysteresis on the
  handover, damped arrivals.
- **NpcAiState reads must be side-effect-free.** Getters must not consume charges or pacing
  gates. (Dream's old `npcDreamMayCatch` was the one exception; it went with the 2026-10-17
  rework.)
- **`hasNpcUpgrade` semantics**: empty outside online matches and Hard+ solo 1v1 — do
  not re-add `isOnline` gates to anything downstream of it.
