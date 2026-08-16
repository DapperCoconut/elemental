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
   `npcSilenceMutateWatcher` (E+ seeker mutation, youngest-watcher / keep-two rule).
5. **Movement profile** — tune the element's `MOVEMENT_PROFILES` entry alongside the
   rewrite.

## Partial passes landed outside a batch

- **Magma (2026-08-12), step 2 + part of step 4 only.** Magma Mastery shipped, so the
  kit now has its npc half: `npcMasteryActive` already drove `setMastered` on the npc
  avatar, and `MagmaKit.updateNpcSaw` is the kit-side cast path for Magma Saw (a private
  hold/release timer, so nothing for `castAbility` to find) with `NPC_MASTERY_BINDS.magma`
  giving up the R slot. One synergy field is published: `magmaObsidianPoint`, the bot's
  own over-erupting cone, walked into with the soft perfume-style seek so the collapse
  actually lands the Obsidian Coat. `doMagmaAbilities` now reads `npcMagmaSawSlot` /
  `npcMagmaSawOut`. **Steps 1, 3 and 5 are untouched** — the kit's shop-upgrade branches
  are already owner-aware via `up(owner, slot)`, but the routine itself has not been
  rewritten and the movement profile has not been retuned.

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
  runs best without help, and Wretched Scarf is the only button in the game that rewards being
  caught out. **Steps 1 and 5 are untouched**: the movement profile has not been retuned, and a
  short-reach element that wants to live inside 62px probably needs its own.

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
- **Silence corner-bug post-mortem** (the shape of bug to avoid): `isInvisible` is
  `inFog || stealth > 0`, and the old npc slink (`!invis && stealth < 35` → full-speed
  seek to a static wall point) flip-flopped against doAI's chase at the fog line every
  frame. The cure was *commitment* (a `npcFogFarming` hysteresis flag that only a full
  meter clears) plus arrival damping. Any kit steering that can disagree with doAI
  about the body needs the same shape: one owner at a time, hysteresis on the
  handover, damped arrivals.
- **NpcAiState reads must be side-effect-free** (one documented exception:
  `npcDreamMayCatch`). Getters must not consume charges or pacing gates.
- **`hasNpcUpgrade` semantics**: empty outside online matches and Hard+ solo 1v1 — do
  not re-add `isOnline` gates to anything downstream of it.
