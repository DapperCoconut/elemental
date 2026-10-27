# CLAUDE.md

## Commands

```bash
npm run dev      # Start Vite dev server with hot reload (localhost:5173)
npm run build    # TypeScript type-check + Vite production build → dist/
npm run preview  # Serve the production build locally
```

There are no lint or test commands. Type correctness is enforced by `tsc` (strict mode) during `build`. Always run `npm run build` to verify changes compile cleanly before finishing.

The code is managed by git.

## Architecture Overview

**Elemental** is a browser combat game built with Phaser 3 + TypeScript, bundled by Vite. There is no backend — all persistence is via `localStorage` through `src/data/PlayerData.ts`.

### Scene Flow

```
BootScene → TitleScene → MenuScene → ArenaScene → GameOverScene → TitleScene
                       ↗ ShopScene
                       ↗ LabScene
TitleScene → RankedScene → RankedBanScene → RankedSelectScene → ArenaScene ⇄ RankedIntermissionScene (best of 3)
```

- **TitleScene**: a hub of four category doors (BATTLE / ADVENTURE / SIEGE / WORKSHOP), each opening an in-scene sub-panel of mode cards (`categories()` is the one list of destinations), plus the ranked "flex" plate.
- **Ranked**: `src/data/RankedData.ts` owns the ladder (Bronze–Diamond III/II/I + Excelsius), RP, the save, bans, and `rankedDifficulty(step)` (interpolated `DifficultyConfig`). The `RankedSeries` object rides in ArenaScene's `ranked` scene data and is handed back to `RankedIntermissionScene`, which scores it and relaunches via `startRankedGame()`. Badges are drawn by `src/ui/RankBadges.ts` (`addRankBadge`).

- **BootScene**: Runs once. Generates *all* sprite textures dynamically via Phaser's graphics API — there are no image assets. Every element icon and projectile shape is drawn in code here.
- **MenuScene**: Three-phase UI — pick player element, pick enemy element, pick difficulty. Also where mutations are selected.
- **ArenaScene**: The combat loop orchestrator. Handles input dispatch, per-frame updates, projectile collision, NPC AI ticks, and HUD rendering. Per-element logic is progressively being moved into `src/elements/kits/[Element]Kit.ts` files — see ElementKit Pattern below.
- **LabScene**: Drag two base elements into slots and spend a Nucleus to unlock a combined element.
- **ShopScene**: Spend shards to buy element-specific upgrades (5 slots per base element).

### Element + Ability System

Each element is defined in `src/elements/[id].ts` and exports a const implementing `Element`:

```typescript
interface Element { id: string; name: string; color: number; emoji: string; abilities: Ability[]; }
interface Ability { id: string; name: string; description: string; displayKey: string; cooldown: number; cast(ctx: CastContext): void; }
```

The `CastContext` (defined in `src/elements/Ability.ts`) is a large object passed to every `cast()` call. It exposes 60+ arena methods: `dealAoeDamage`, `dashCaster`, `healCaster`, `spawnPuddle`, etc., plus element-specific methods for every element. ArenaScene builds this context via `buildPlayerContext()` and `buildNpcContext()`.

**Ability registration flow** — adding a new ability or element requires touching:
1. `src/elements/[id].ts` — define the ability and add it to the element's array
2. `src/elements/Ability.ts` — add any new context methods to `CastContext`
3. `src/elements/kits/[Element]Kit.ts` — implement the element kit (see ElementKit pattern below)
4. `src/scenes/ArenaScene.ts` — wire the kit in (import, field, adapter, call sites); add ability bar color in the color map
5. `src/scenes/BootScene.ts` — generate any new projectile/element textures
6. `src/entities/NpcOpponent.ts` — implement `do[Element]Abilities()` and wire it in `doAI()`; add any new fields to `NpcAiState`
7. `src/data/ElementRoster.ts` — add to `ELEMENTS` / `COMBINED_ELEMENTS` / `VAULT_ELEMENTS` etc., and to `ELEMENT_DATA_MAP`. This one table feeds every element-selection screen (menu, campaign, gauntlet, online lobby) — nothing else needs touching to make an element appear in a mode.
8. `src/data/Recipes.ts` — if it's a combined element, add the recipe

### Element Selection Screens

Menu, campaign, gauntlet and online lobby all read `src/data/ElementRoster.ts` — **never hand-copy the roster**.
Cards come from `src/ui/ElementSelectGrid.ts` (no emoji on a card; live portrait), profiles from
`src/data/ElementProfiles.ts` (a new element needs an entry). Id traps: `sand` is Time, `dune` is Sand, `slime`
is Venom, `gum` is Savor, `chalk` is Paint. Details: `docs/claude/element-selection.md`.

### Menu Dioramas

The workshop menus (Shop, Labs, Vault, trophy hall, kit bag) are drawn rooms with a character, built from
`src/ui/{Woodwork,SpeechBubble,ItemArt,Glassware,LabBench}.ts` + `src/ui/characters/`. **Dialogue there is
business only** (prices, effects, "buy?", results — no banter). Details and the `.shot-menu.mjs` screenshot
tool: `docs/claude/menu-dioramas.md`.

### ElementKit Pattern

New elements must be implemented as a kit in `src/elements/kits/[Element]Kit.ts` rather than inline in ArenaScene. See `MagnetKit.ts`, `LightKit.ts`, `GunpowderKit.ts`, or `TechnologyKit.ts` for full examples.

**Structure:**
- `[Element]ArenaApi` interface — the narrow surface the kit needs from ArenaScene. Use property getters (`get player()`, `get npc()`, etc.) in the adapter object so references stay live across match restarts.
- `[Element]Kit` class with:
  - All element private state fields (player + NPC mirrors)
  - `reset()` — reinitializes all state; called every match start
  - `handleInput(dt)` — handles keyboard input for this element
  - `update(dt)` — per-frame logic (auras, timers, projectile updates, HUD)
  - Public accessors for any fields read by ArenaScene (speed bonuses, active flags, etc.)
  - Public `do*()` methods called from `buildPlayerContext()` / `buildNpcContext()`

**ArenaScene size discipline:** ArenaScene is already large and must not grow materially. Any new element logic, state, or helpers belong in the kit — not in ArenaScene. The only code that should land in ArenaScene for a new element is: the kit field declaration, the adapter + constructor call in `create()`, `handleInput`/`update` dispatch lines, `buildPlayerContext`/`buildNpcContext` call sites, speed mult accessor reads, and the ability bar color entry. Wiring a kit typically adds ~50 lines to ArenaScene. If you find yourself adding significantly more than that, move the excess logic into the kit instead.

**Wiring in ArenaScene:**
```typescript
// Field
private [element]Kit!: [Element]Kit;

// In create() — construct once, reset on subsequent calls
if (this.[element]Kit) {
  this.[element]Kit.reset();
} else {
  const arena = this;
  const api: [Element]ArenaApi = {
    get player() { return arena.player; },
    // ... other getters and method delegates
  };
  this.[element]Kit = new [Element]Kit(api);
}

// Input dispatch
this.[element]Kit.handleInput(dt);

// Update dispatch
this.[element]Kit.update(dt);
```

### Quantum and the `playerIs` gate

Quantum carries several elements live at once. In ArenaScene a per-element gate is **`this.playerIs('x')`, never
`this.elementId === 'x'`** (only the `handleInput` chain and the speed-mult chain read `elementId`). Kit adapters
report `liveElementFor('x')`, `hasUpgradeFor`, `masteryBindFor`, and read keys via `arena.keyFor('x', key)` /
`arena.pointerFor('x')`. Read `docs/claude/quantum.md` before touching Quantum, a kit adapter, or any
element gate.

### NPC AI

`NpcOpponent.doAI()` runs every frame and returns the ability ID that was cast (or `null`). It:
1. Checks if locked (channeling, etc.)
2. Optionally dodges incoming projectiles (Expert/Nightmare only, based on `dodgeRange`)
3. Runs movement state machine (`chase` / `attack` / `retreat`) based on distance and HP ratio
4. Delegates to a per-element method like `doFireAbilities()` which uses `castAbility()` — which internally respects `cooldownMult` and timestamps

`castSkipChance` in difficulty presets causes lower-difficulty NPCs to randomly skip special abilities. `aimOffsetDeg` adds angular error to hitscan calculations.

**Bot synergy contract** (mandatory for every new or reworked element): every kit has internal synergies — casts only worth making because of something else the kit already put on the field (Silence rituals a matured watcher into a grabber; its Click+ stab through an own stalker detonates the Sacrifice). Bots must execute these deliberately, not by accident:

- The **kit** computes each opportunity owner-side and publishes it as an `NpcAiState` field (a cast position or a "combo is live" flag). The kit owns the geometry and upgrade checks; the AI never re-derives either. Reads must be side-effect-free.
- `do[Element]Abilities` checks opportunity fields **first**, before its generic rotation.
- When implementing an element's bot, enumerate the kit's synergies ("X enables Y") and wire each through this pattern. A bot that never plays its kit's synergies is an incomplete implementation. Canonical examples: `npcSilenceMatureStalker`, `npcSilenceSacrificeStab`, `npcMagmaChargeTarget`, `npcHarvestHeartAim`.

The bot-overhaul roadmap (per-element batch checklist, remaining elements, and hard-won gotchas like reaction-tick probability retuning) lives in `docs/bot-overhaul.md` — read it before any bot/AI work, and keep it current as batches land.

ArenaScene reacts to certain returned cast IDs in the `npcCastId` block (e.g. `if (npcCastId === 'flame-body')`) to trigger state changes that couldn't happen inside the NPC context method.

### Fighter & Combat

`Fighter` (base class for both `Player` and `NpcOpponent`) owns:
- Cooldown tracking: `Map<abilityId, lastCastTimestamp>`. `getCooldownRatio()` returns 0–1.
- Two independent shield systems: `shieldCharges` (blocks one full hit) and `shieldHp` (absorbs damage numerically).
- `damageAbsorber`: optional callback `(amount) => boolean` that intercepts hits before shield logic — used by Time element's Remain ability.
- `cooldownMult`: scales all cooldown durations (set to ~0 during Timeless, 0.5 after Rebirth mutation).
- **Ultimate charge**: a Q ability with a cooldown ≥ 5s is paid for in points, not time (`ultCharge`, `isChargedUltimate`, `ultCost` = 60 + 6/s of the old cooldown, scaled by every cooldown mult). Points = damage dealt + taken, credited through `Fighter.creditUltDamage` (wired in ArenaScene). `castAbility`/`getCooldownRatio`/`resetCooldown`/`reduceCooldown(s)` all speak charge for those ids, so kits need no changes. Resource-charged Qs opt out via `SELF_CHARGED_ULTIMATES`. Only the two duellists have it on (`ultChargeEnabled`); a `netGhost` replica is never gated.

### State in ArenaScene

ArenaScene carries a large amount of per-element private state (auras, timers, accumulators, active flags). The naming pattern is consistent:
- Player state: `sandHeat`, `timeHaltActive`, `huntBeastForm`, etc.
- NPC mirror state: `npcSandHeat`, `npcTimeHaltActive`, `npcHuntBeastForm`, etc.
- Shared world objects (arrays): `puddles`, `geysers`, `timePuddles`, `icyTrails`, etc. — each entry has `owner: 'player' | 'npc'` to determine who it affects.

All mutable state must be reset in `create()` (which runs on every match start).

### Ability Tray

Cards print keycap, name and RMB / HOLD / RECAST tags from `src/data/AbilityTags.ts` — keep it current when an
ability's controls change. Details: `docs/claude/ability-tray.md`.

### Data Layer

- **`PlayerData.ts`**: All reads/writes to `localStorage`. Tracks shards, upgrade ownership, nuclei, unlocked elements.
- **`Upgrades.ts`**: Upgrade definitions with `elementId`, `slot` (`click/e/r/f/q`), name, and `shardCost`. Only base elements (fire, water, life, air, earth) have upgrades.
- **`Mutations.ts`**: Modifiers active for a single match. Stored in a module-level `Set` cleared at `MenuScene` creation. Each mutation has a `rewardMult` and optionally modifies difficulty parameters.
- **`Recipes.ts`**: Eight order-independent element fusion recipes.

### Ten Isles (the campaign)

`src/isles/` — design overview `docs/ten-isles.md`, one file per isle in `docs/ten-isles/`, content builder brief
(with the kickoff checklist) `docs/ten-isles-builder-brief.md`, API cheat sheet `docs/isles-api.md`. Run
`node .check-isles.mjs` after any Isles content change.
