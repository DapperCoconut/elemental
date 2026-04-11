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
```

- **BootScene**: Runs once. Generates *all* sprite textures dynamically via Phaser's graphics API — there are no image assets. Every element icon and projectile shape is drawn in code here.
- **MenuScene**: Three-phase UI — pick player element, pick enemy element, pick difficulty. Also where mutations are selected.
- **ArenaScene**: The entire combat loop (~6000+ lines). All game logic lives here: input handling, per-frame ability updates, projectile collision, NPC AI ticks, and HUD rendering.
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
3. `src/scenes/ArenaScene.ts` — implement the method in `buildPlayerContext()`, `buildNpcContext()`, and `buildCloneContext()` (clone must always have no-op stubs); add per-frame logic if needed; add ability bar color in the color map; add input handling in the `elementId === '[id]'` block; add private state fields and reset them in `create()`
4. `src/scenes/BootScene.ts` — generate any new projectile/element textures
5. `src/entities/NpcOpponent.ts` — implement `do[Element]Abilities()` and wire it in `doAI()`; add any new fields to `NpcAiState`
6. `src/scenes/MenuScene.ts` — add to `ELEMENTS` or `COMBINED_ELEMENTS`
7. `src/data/Recipes.ts` — if it's a combined element, add the recipe

### NPC AI

`NpcOpponent.doAI()` runs every frame and returns the ability ID that was cast (or `null`). It:
1. Checks if locked (channeling, etc.)
2. Optionally dodges incoming projectiles (Expert/Nightmare only, based on `dodgeRange`)
3. Runs movement state machine (`chase` / `attack` / `retreat`) based on distance and HP ratio
4. Delegates to a per-element method like `doFireAbilities()` which uses `castAbility()` — which internally respects `cooldownMult` and timestamps

`castSkipChance` in difficulty presets causes lower-difficulty NPCs to randomly skip special abilities. `aimOffsetDeg` adds angular error to hitscan calculations.

ArenaScene reacts to certain returned cast IDs in the `npcCastId` block (e.g. `if (npcCastId === 'flame-body')`) to trigger state changes that couldn't happen inside the NPC context method.

### Fighter & Combat

`Fighter` (base class for both `Player` and `NpcOpponent`) owns:
- Cooldown tracking: `Map<abilityId, lastCastTimestamp>`. `getCooldownRatio()` returns 0–1.
- Two independent shield systems: `shieldCharges` (blocks one full hit) and `shieldHp` (absorbs damage numerically).
- `damageAbsorber`: optional callback `(amount) => boolean` that intercepts hits before shield logic — used by Time element's Remain ability.
- `cooldownMult`: scales all cooldown durations (set to ~0 during Timeless, 0.5 after Rebirth mutation).

### State in ArenaScene

ArenaScene carries a large amount of per-element private state (auras, timers, accumulators, active flags). The naming pattern is consistent:
- Player state: `sandHeat`, `timeHaltActive`, `huntBeastForm`, etc.
- NPC mirror state: `npcSandHeat`, `npcTimeHaltActive`, `npcHuntBeastForm`, etc.
- Shared world objects (arrays): `puddles`, `geysers`, `timePuddles`, `icyTrails`, etc. — each entry has `owner: 'player' | 'npc'` to determine who it affects.

All mutable state must be reset in `create()` (which runs on every match start).

### Data Layer

- **`PlayerData.ts`**: All reads/writes to `localStorage`. Tracks shards, upgrade ownership, nuclei, unlocked elements.
- **`Upgrades.ts`**: Upgrade definitions with `elementId`, `slot` (`click/e/r/f/q`), name, and `shardCost`. Only base elements (fire, water, life, air, earth) have upgrades.
- **`Mutations.ts`**: Modifiers active for a single match. Stored in a module-level `Set` cleared at `MenuScene` creation. Each mutation has a `rewardMult` and optionally modifies difficulty parameters.
- **`Recipes.ts`**: Eight order-independent element fusion recipes.
