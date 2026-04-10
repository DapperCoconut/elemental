# Elemental — Agent Orientation

2D top-down arena brawler (Phaser 3 + TypeScript + Vite). Inspired by Roblox Elemental Battlegrounds. Currently iteration 1: single-player vs one NPC.

**Run:** `npm run dev` from project root.

---

## File Map

```
src/
  main.ts                  # Phaser game config; scene order matters (Boot first)
  scenes/
    BootScene.ts           # Generates all textures programmatically; starts MenuScene
    MenuScene.ts           # Element picker; only Fire is available; others show "coming soon"
    ArenaScene.ts          # All gameplay logic (input, AI, physics, HUD, win/loss)
    GameOverScene.ts       # Win/lose display; "Play Again" goes to MenuScene
  elements/
    Element.ts             # interface Element { id, name, color, emoji, abilities[] }
    Ability.ts             # interface Ability { id, cooldown, cast(CastContext) }
                           # interface CastContext — passed to every ability cast
    fire.ts                # exports fireElement: 3 abilities (fireball, flame-dash, fire-nova)
    water.ts               # exports waterElement: 2 abilities (water-bolt, heal) — NPC only
  entities/
    Fighter.ts             # Base class (extends Phaser.Physics.Arcade.Sprite)
    Player.ts              # Thin subclass of Fighter; texture key 'player'
    NpcOpponent.ts         # Fighter subclass with doAI() state machine
  combat/
    Projectile.ts          # extends Phaser.Physics.Arcade.Image
    HealthBar.ts           # Graphics-based bar drawn in Fighter.preUpdate
```

---

## Core Abstractions

### Adding a new element
1. Create `src/elements/<name>.ts` — export a `Element` object with an `abilities` array.
2. Each ability implements `cast(ctx: CastContext)`:
   - Projectiles: `new Projectile(ctx.scene, x, y, textureKey, damage, ctx.isPlayerCaster)` → `ctx.projectiles.add(proj)` → **then** `proj.launch(vx, vy)`. Order is mandatory (see Phaser gotcha #1 below).
   - AoE damage: call `ctx.dealAoeDamage(cx, cy, radius, damage)`.
   - Dash movement: call `ctx.dashCaster(vx, vy)`.
   - Self-heal: call `ctx.healCaster(amount)`.
3. Add texture generation for player sprite variant in `BootScene.ts`.
4. Set `available: true` in `MenuScene.ts`'s `ELEMENTS` array.
5. Wire up `buildPlayerContext` in `ArenaScene.ts` (the context callbacks close over player/npc).

### CastContext (src/elements/Ability.ts)
The bridge between element code and scene state. Abilities never import ArenaScene directly. ArenaScene builds two context objects per frame (one for player, one for NPC) in `buildPlayerContext` / `buildNpcContext`. The callbacks capture `this.player` and `this.npc` via closure.

### Fighter lifecycle
- `takeDamage(n)` → decrements hp, flashes alpha 0.3 → 1, emits `'defeated'` if hp ≤ 0.
- `castAbility(id, ctx)` → checks cooldown via `Date.now()`, calls `ability.cast(ctx)`.
- `getCooldownRatio(id)` → returns 0–1 (1 = ready); used by ArenaScene HUD.
- `preUpdate` → redraws HealthBar every frame.
- `destroy` → destroys HealthBar graphics before calling super.

### NPC AI (src/entities/NpcOpponent.ts)
`doAI(target, buildContext, time)` — simple 3-state machine:
- `chase` → move toward player
- `attack` (within 280px) → strafe perpendicular, fire water-bolt
- `retreat` (hp < 28%) → move away, try to heal

Called every frame from `ArenaScene.update`.

---

## Phaser-Specific Gotchas (hard-won)

**1. Projectile velocity must be set AFTER group.add()**
`Phaser.Physics.Arcade.Group.createCallbackHandler` creates a new physics body when a member is added. Setting velocity in the constructor (before `group.add`) gets overwritten. Always: `new Projectile(...)` → `group.add(proj)` → `proj.launch(vx, vy)`.

**2. Never destroy game objects inside a physics overlap callback**
Phaser iterates its body collection during the physics step. Destroying a body mid-iteration corrupts the iterator and freezes the game. In overlap callbacks, use `proj.setActive(false).setVisible(false)` + `body.stop()`. Actual `destroy()` happens at the top of `ArenaScene.update` after the physics step, by collecting inactive group children.

**3. Overlap callback argument order is unreliable**
`physics.add.overlap(group, sprite, (a, b) => ...)` — Phaser may pass `(groupMember, sprite)` OR `(sprite, groupMember)` depending on version. Always use `instanceof Projectile` to identify the correct argument:
```ts
const proj = (a instanceof Projectile ? a : b) as Projectile;
```

**4. Scene instances are singletons — reset mutable state in create()**
Phaser reuses the same scene object across restarts. Class field initializers (`= false`, `= []`) only run at construction time, not on each `scene.start()`. Any state that must be fresh each game must be explicitly reset at the top of `create()`. Currently reset: `gameEnded`, `dodgeOnCooldown`, `isDodging`, `abilityBars`.

**5. setTint() color format**
Avoid `setTint(color)` for damage flash — in Phaser 3.87 the color can be misinterpreted (MSB treated as alpha, making sprite invisible). Use `setAlpha(0.3)` + restore `setAlpha(1)` via `delayedCall` instead.

**6. Fighter uses scene.physics.add.existing(); Projectile does not**
Fighters call `scene.physics.add.existing(this)` in their constructor (body created before group membership). Projectiles do NOT — their physics body is created by the group's `createCallbackHandler`. This asymmetry is intentional.

---

## Scene Flow

```
BootScene.create()
  └─ generates textures: 'player', 'npc', 'proj-fire', 'proj-water'
  └─ scene.start('MenuScene')

MenuScene
  └─ click Fire → scene.start('ArenaScene', { elementId: 'fire' })

ArenaScene.create()
  └─ resets mutable state (gameEnded etc.)
  └─ sets up physics world bounds (pad=32 inset)
  └─ creates Player (x=180) and NpcOpponent (x=780)
  └─ registers two physics.add.overlap() callbacks
  └─ registers player.once('defeated') / npc.once('defeated')

ArenaScene.update() each frame:
  1. Guard: if gameEnded return
  2. Player WASD movement (skipped if isDodging)
  3. Player ability input (mouse/Q = fireball, E = flameDash, R = fireNova)
  4. Space dodge
  5. npc.doAI(player, buildNpcContext, time)
  6. Clean up inactive/OOB projectiles (safe to destroy here)
  7. Update HUD cooldown bars

endGame(playerWon)
  └─ sets gameEnded=true
  └─ camera flash
  └─ 700ms delay → scene.start('GameOverScene', { playerWon })

GameOverScene
  └─ "Play Again" → scene.start('MenuScene')
```

---

## Textures (generated in BootScene, no image files)

| Key | Description |
|---|---|
| `player` | 48×48, red-orange circle (fire) |
| `npc` | 48×48, blue circle (water) |
| `proj-fire` | 14×14, orange circle |
| `proj-water` | 12×12, cyan-blue circle |

---

## What's Not Built Yet

- Water / life / air / earth as playable elements
- Co-op and online PvP (no server)
- Sprite art (all shapes are programmatically generated)
- Sound / music
- Progression, XP, unlocks
- Mobile / touch controls
