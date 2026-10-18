# City Invasion

Invasion's main map since 2026-10-16. The mansion stays as the legacy map (menu MAP toggle, the
lobby's map label, and every campaign invasion node).

## Files (`src/invasion/city/`)
- `CityMap.ts` — the four screens (0 Main Street, 1 Red, 2 Green, 3 Yellow lane), gate travel,
  painted districts and rifts, minimap. Implements `InvasionMap` (`src/invasion/InvasionMap.ts`),
  which the Mansion implements too, so InvasionKit drives either.
- `AllElement.ts` — the defended core: a hidden, immovable Fighter (500 HP) so husks target it
  through the normal target lists; all art and the top HUD bar are drawn here.
- `CityDirector.ts` — the City's rules on top of InvasionKit: lanes per wave (1 lane for waves 1–2,
  2+ from wave 3, a rising chance of all 3 from wave 7, always 3 from wave 14), lane → Main Street
  marching (`Husk.marchTo`), 10-family husk pool (`rollLightningVariant`'s `pool`), boss every
  5th wave, wave 20 "city holds" then endless, the draft, mutations, the dream voice, co-op snapshot.
- `Companions.ts` — bot party members (light companions, 5 attack styles, tier 1–3 moves,
  downed/revive, plinth respawn for the solo player; a downed bot nobody picks up stands back up at
  the plinth after 30 s, with a countdown on its name tag).
- `CityDraft.ts` — 5-card wave-end draft + overlay. Kinds by rarity: ability > upgrade > perk >
  mutation > mastery > alt-ult, boons pad a short table. Only unlocked things appear, and an
  upgrade (or the alt-ult) for a key that is still sealed never shows up.
- `CityMutations.ts` — mutations land on the PLAYER, not the husks (changed 2026-10-17). Each one is
  a set of player primitives (hp/speed/dmg/size, regen, lifesteal, trail, pulse, thorns, slow-on-hit,
  death bursts, enrage); clot/honor/golf and boss-only excluded; a second take stars it (×1.75).
  No shard multiplier any more. Damage rides on `husk.mutationIncomingMult` (written every frame);
  bot and relayed hits go through `Husk.takeForeignDamage`, which divides it back out and keeps them
  out of lifesteal/slows (`Husk.foreignHitDepth`). Each co-op human runs their own copy (the guest's
  against its replicas, fed from `onGhostDamage`); walk speed is pulled via `playerHazardSpeedMult`.
- `CityHud.ts` — seals over undrafted R/F/Q cards + curse strip (both co-op sides).
- `CityDream.ts` + `AllElementDialogue.ts` — the All-Element's lines per element (intro plate
  gates wave 1; milestones 5/10/15, hurt, saved, fallen, downed are murmured).
- `CityGuest.ts` — co-op guest view: own map, All-Element + bots from snaps, own draft.

## Husk look (`src/invasion/HuskLook.ts`, all invasion maps)
Husks rise as dead element players: `deadBodyTexture` bakes `husk-dead-<id>` from the element's
real `elem-<id>` sprite (rot colour transform + blotches, cracks, a stitched seam, grave dirt), and
the element's real rig stands on it through `rotColor`. Eyes glow in the brand colour; tier II adds
glowing cracks, tier III a corona. Plain husks wear a random common element. Bosses, courts,
corrupt-kin, bodyless elements and anything past the 32-rig budget keep the baked `husk-<variant>`
body (which the journal still uses). Only `InvasionKit.spawnHusk` and the co-op replicas call
`Husk.dress()`, so Stronghold, Reality and the boss kits are untouched. Subterfuge's disguise goes
through `Husk.setDisguise`.

## How a run is bare
`ArenaScene.cityRun` (invasion + `invasionMap === 'city'`): no upgrades, no perk, own mastery flag
off, R/F/Q `Key.enabled = false` (re-enabled at every create — Key objects survive restarts).
The draft writes back through `ArenaScene.cityLoadout()`.

## Co-op (protocol v40)
Lobby label cycles City ×2/×3/×4 → Mansion. `huskSnap.c` carries core HP, lanes, bots, curses;
`cityWarn` announces lanes; `cityPick` (guest → host) relays the guest's kept card and releases
the host's wave gate (30 s timeout). A relayed mutation pick only shows a note on the host; `huskSnap.c.cu`
still carries the host's mutations but the guest ignores it. Both humans down does not end a City run; each side's plinth
stands its own player back up after 15 s.

## Known gaps
- Draft picks are not relayed as loadout changes, so the peer's replica of you keeps casting with
  your starting (bare) loadout.
- Bots don't revive humans in co-op, and the guest can't revive a downed bot.
- Mid-run mastery flips the flag and the binds; masteries that set up state only at match start
  may not take full effect.
- Kits that bypass the key objects (none known) would ignore the R/F/Q seals.

## Wave scaling (2026-10-17, all invasion maps)
`huskWaveScaling(wave)` in InvasionKit multiplies every husk spawned on top of difficulty and
variant: HP `1 + 0.12w + 0.006w²` (w = wave−1: ~2.6× at wave 10, ~5.5× at 20, ~9.5× at 30),
bite damage `1 + 0.08w`, walk speed up to ×1.4, bite rate up to ×1.6. Spawn gap is
`max(350, 1700 − 70·wave)` ms. Tune these if the curve is off.
