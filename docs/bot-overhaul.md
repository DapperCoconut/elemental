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
   Soul, Hunt, Time, Gravity, Creation, Electricity, Slime(acid), Sound, Light, Magnet,
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

- **Slime / `gum` (2026-08-12), step 2 + step 4 only.** Slime Mastery shipped, so the kit now has
  its npc half. `npcMasteryActive` already drove `setMastered`; **Slime Split runs for the bot as
  well as the player** — a Nightmare Slime that is killed comes apart into three 50 HP slimelings
  and keeps fighting, with no decision for the AI to make about it (the whole passive is owner-
  generic, because the cluster follows whichever body the physics is attached to). `GumKit.
  updateNpcMastery` is the kit-side cast path for Oobleck (a private timer, so nothing for
  `castAbility` to find): the bot **plants** its slab 76px along the line to the target instead of
  carrying one, on a 400ms think tick, because a held slab pins the body still — that is the
  player's trade, and a state machine cannot pay it. `NPC_MASTERY_BINDS.gum` gives up **F**
  (Oozorbtion is one swallowed shot timed by guesswork; the pane keeps five out of the air with no
  timing at all), `npcGumOobleckSlot` is published so `doGumAbilities` stops pressing what is no
  longer under that key, and Q is refused by `excludeSlots` — Solidify *is* the slab's upgrade
  path. One synergy field: `npcGumSlabSoft` says a slab is standing and unset, and the rotation
  presses Solidify for it ahead of everything else. That is the first reason the bot has ever had
  to cast the ultimate up close, and it is safe precisely because mastery is a Nightmare loadout
  and a Nightmare loadout owns Hand of Stone (no handless window). **Steps 1, 3 and 5 are
  untouched** — the kit was already owner-aware via `up(owner, slot)`, but the base rotation has
  not been rewritten and the movement profile has not been retuned.

- **Marrow (restored 2026-10-12 as its own test element, beside Cloth).** `doMarrowAbilities` came
  back from the pre-Cloth commit unchanged, with its four kit-published `NpcAiState` fields:
  `npcMarrowCells` (sockets on the bone bar — the sixth cast is refused, so the rotation is a
  composition, not a spam), `npcMarrowMasts` (a second Mastacre over a live one is wasted),
  `npcMarrowInflammation` (the fever; a dry bar makes Q worth casting out of range just for the
  heat) and `npcMarrowTcellArmed` (F has transformed into a T-cell summon, which is the only time
  it is worth a socket). No movement-profile retune and no mastery bind — Marrow has no mastery.

- **Cloth (2026-08-16), built to the contract rather than retrofitted.** Cloth replaced Marrow
  outright, so `doClothAbilities` was written against the synergy contract from the first line
  instead of being rewritten into it. The element is four two-press combos and nothing else, and
  every one of them is a kit-published `NpcAiState` field the AI never re-derives:
  `npcClothPinPlanted` (a long pin is in a body or a wall, so E is the reel and not a throw),
  `npcClothAnchored` + `npcClothAnchorPressure` (an anchor is down and here is how close the
  75-damage auto-trigger is, so the bot leaves on its own terms rather than being dragged),
  `npcClothCombo` (0–1 toward the Click+ grapple spin — near 1 nothing is worth pressing except
  another pin) and `npcClothWebbed` (E+ has somebody held, which is the free-damage window).
  `npcClothPinned` gates F, because the thorns only pay while something is close enough to catch
  them. The right-click artworks are **not** in the rotation at all: the bot has no mouse, so
  `ClothKit.npcRightClick` drives whichever one it drafted off a single condition each, and the
  draft itself is kit-side (`npcDraft` takes the biggest card that fits, since a bot cannot plan a
  loom). `NPC_MASTERY_BINDS.cloth` gives up **R** — the safety-line combo is the one the rotation
  runs best without help. Wretched Scarf was deleted 2026-10-15; the bind is now **Bleed Stop**,
  which `ClothKit` ties off for the bot itself (kit-driven, like the right-click artworks). **Steps 1 and 5 are untouched**: the movement profile has not been retuned, and a
  short-reach element that wants to live inside 62px probably needs its own.

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

- **Gold (id `fortune`, 2026-10-15 rework), steps 3–5.** The shopkeeper was replaced by an
  alchemist and `doFortuneAbilities` rewritten around kit-published fields. Synergies checked
  first: `npcGoldHeartLive` → Plume thrown onto the gold-hearted target (`npcGoldPlumeAt`) so it
  has to walk out and fill its heart; Midas cast inside 420px while the target is above 30%;
  `npcGoldCanAdvance` gates E (the kit picks the card itself in `npcChoose`). `goldSeekPoint` is
  a soft seek to its own plume, its loot, or Midas floor while the curse is live.
  `npcGoldFrayAim` is the gravity-corrected aim for the falling grass. Movement profile is now a
  150–300px skirmisher. No mastery or upgrades exist yet, so steps 1–2 are moot until they do.

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
  with 1.2s left). No mastery or upgrades exist yet, so steps 1–2 are moot.

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
  profile is now a 70–150px skirmisher (baton reach 170). No mastery or upgrades exist yet, so
  steps 1–2 are moot.

- **Harvest (id `gluttony`, 2026-10-15 rework replacing the chef), steps 3–5.**
  `doGluttonyAbilities` was rewritten around GluttonyKit's fields, all checked before the
  rotation: `npcHarvestCanExecute` (the kit says Reaping Hour's 30, through the target's own
  vulnerability, lands under the execute line) → Q inside 175px; `npcHarvestHeartAim` (one of
  its own corrupt hearts within sickle reach — aiming the click at it puts the loop's far side
  through the heart: 75 Corrupt HP); `npcHarvestBiteHeavy` (its Corrupt HP ≥ its health, so
  Consume adds 40% corruption) and `npcHarvestTargetBuffed` (shields/weak HP/dodge/buffs worth
  stealing) → F inside 100px; `npcHarvestTargetCorruption` ≥ 40 or `npcHarvestTargetOnMold` →
  Feeding Frenzy. Rotation: re-sow when `npcHarvestMatureMold` < 30, bite up close, scythe a
  ≥55%-corrupted target, sickle under 460px. `harvestSeekPoint` walks it into the middle of
  its own mold while the target is 120–420px away and off the rot, so the chase happens on
  the mold. The kit picks the bot's sickle curl at random per throw (no right mouse button).
  Movement profile: brawler 90–240px, retreat at 20%. No mastery or upgrades exist yet, so
  steps 1–2 are moot.
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
  Passion: skirmisher 150–290px. No mastery or upgrades exist yet, so steps 1–2 are moot.

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
- **NpcAiState reads must be side-effect-free** (one documented exception:
  `npcDreamMayCatch`). Getters must not consume charges or pacing gates.
- **`hasNpcUpgrade` semantics**: empty outside online matches and Hard+ solo 1v1 — do
  not re-add `isOnline` gates to anything downstream of it.
