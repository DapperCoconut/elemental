Fix all player-facing **status effects, slows, debuffs, and HUD visuals** for the `$ARGUMENTS` element so they affect all enemies correctly in Invasion mode.

## Background

This command targets a different class of bug than `fix-invasion-attacks` (which covers `takeDamage`). Here the problem is:
- **Status/debuff setters** that write directly to `this.npc.*` fields instead of looping `this.enemies`
- **`buildPlayerContext` callbacks with direct damage** that reference `this.npc` instead of looping `this.enemies` (melee, AOE, cone, charge-release attacks)
- **Per-frame slow/stop overrides** that only apply to `this.npc` via `npcSpeedMult` or a hard `setVelocity(0,0)` — invasion enemies move via `aiTick()` and are unaffected
- **Per-frame DOT tick blocks** that check `this.npc.<statusUntil>`, advance `this.npc.<tickAccum>`, and call `this.npc.takeDamage()` — these combine aura management and damage dealing in one block and must be looped over `this.enemies`
- **HUD visuals** (labels, auras) anchored to `this.npc` instead of each enemy in `this.enemies`
- **`break` inside an enemy loop** that bails after the first hit, leaving later enemies unaffected
- **Special projectile types** not handled in `applyProjectileToCorrupted` (only handled in `applyProjectileToNpc`)
- **Single-target tracking fields** (`this.npc` used as implicit "hooked/targeted" enemy) that need a `Fighter | null` field to track which specific enemy was targeted

In Invasion mode `this.npc` is a disabled placeholder. All real enemies are `CorruptedBase` instances in `this.enemies: Fighter[]`. `Fighter` already carries every status field (`frostStacks`, `frozenUntil`, `burningUntil`, `toxicUntil`, `bleedingUntil`, `frostVisual`, `burnAura`, etc.), so looping `this.enemies` works for both modes.

## Steps

### 1. Find the element's effect-applying code

Search `src/scenes/ArenaScene.ts` for all occurrences of `this.npc` inside:
- `buildPlayerContext` lambdas for `$ARGUMENTS` abilities
- The `this.elementId === '$ARGUMENTS'` per-frame block
- `applyProjectileToNpc` special-case handlers for `$ARGUMENTS` projectile textures

Look for any of these patterns:
- `this.npc.<statusField>` assignments (`frozenUntil`, `frostStacks`, `burningUntil`, `toxicUntil`, `toxicDps`, `bleeding`, `bleedingUntil`, `voidedUntil`, `voidedDps`, `earthStunnedUntil`, `magicChainBound`, etc.)
- `this.npc.takeDamage()` inside callbacks that are *not* already covered by `fix-invasion-attacks`
- `this.npc.x` / `this.npc.y` used as the target position for a proximity or angle check
- `this.npcSpeedMult` modified by the element's slowing mechanic
- `(this.npc.body as ...).setVelocity(...)` used to override NPC movement

### 2. Fix status setters — loop `this.enemies`

```typescript
// BEFORE (only npc gets the debuff)
if (dist <= range) {
  this.npc.burningUntil = Math.max(this.npc.burningUntil, time + 3000);
  this.npc.toxicDps = 10;
  this.npc.toxicUntil = time + 5000;
}

// AFTER
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= range) {
    t.burningUntil = Math.max(t.burningUntil, time + 3000);
    t.toxicDps = 10;
    t.toxicUntil = time + 5000;
  }
}
```

If the ability also calls `this.npc.takeDamage()`, apply that inside the same loop too.

### 3. Fix direct-damage callbacks in `buildPlayerContext` — loop `this.enemies`

Melee, AOE, and cone abilities in `buildPlayerContext` that check `this.npc` directly must loop instead. This includes charge-release attacks and arc sweeps:

```typescript
// BEFORE — melee/AOE release targeting this.npc
const dist = Phaser.Math.Distance.Between(px, py, this.npc.x, this.npc.y);
if (dist <= RANGE) {
  this.npc.takeDamage(totalDmg);
  this.spawnHitFlash(this.npc.x, this.npc.y, color);
  this.showFloatingText(px, py - 30, label, '#cc88ff');
}

// AFTER
let hit = false;
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(px, py, t.x, t.y) <= RANGE) {
    t.takeDamage(totalDmg);
    this.spawnHitFlash(t.x, t.y, color);
    hit = true;
  }
}
if (hit) this.showFloatingText(px, py - 30, label, '#cc88ff');
```

**Cone / arc sweep** (angle + range check — recompute angle per enemy):
```typescript
// AFTER
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(px, py, t.x, t.y) <= RANGE) {
    const angleDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(aimAngle),
      Phaser.Math.RadToDeg(Math.atan2(t.y - py, t.x - px)),
    ));
    if (angleDiff <= HALF_ARC_DEG) {
      t.takeDamage(dmg);
      this.spawnHitFlash(t.x, t.y, color);
    }
  }
}
```

### 4. Fix proximity-based charge mechanics — use `getNearestEnemy()`

If a charging mechanic scales its rate based on distance to `this.npc`, replace with the nearest active enemy:

```typescript
// BEFORE
const dist = Phaser.Math.Distance.Between(px, py, this.npc.x, this.npc.y);

// AFTER
const nearest = this.getNearestEnemy(px, py);
const dist = Phaser.Math.Distance.Between(px, py, nearest.x, nearest.y);
```

`getNearestEnemy(x, y)` returns the closest active enemy in `this.enemies`, falling back to `this.npc` if none exist — safe for both modes.

### 5. Fix per-frame slows and freezes in `updateInvasion`

`npcSpeedMult` applies only to `this.npc` (scaled at the post-AI step, line ~15700). Invasion enemies move via `aiTick()` and ignore it.

**Velocity-based slow** — scale velocity after `aiTick` in `updateInvasion`:
```typescript
// In updateInvasion(), after c.aiTick(...)
if (c.<slowCondition>) {
  const cb = c.body as Phaser.Physics.Arcade.Body;
  cb.velocity.x *= slowFactor;
  cb.velocity.y *= slowFactor;
}
```

**Full freeze / stun** — zero velocity after `aiTick`:
```typescript
if (c.frozenUntil > time || c.earthStunnedUntil > time) {
  (c.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
}
```

The `updateInvasion` AI loop lives around line 20650:
```typescript
for (const c of allEnemies) {
  c.aiTick(this.player, this.projectiles, allEnemies, time, delta);
  // ← add per-enemy post-tick overrides here
}
```

Also guard the `npcSpeedMult` line so it only applies in PvP:
```typescript
if (!this.isInvasion) this.npcSpeedMult *= slowFactor;
```

### 6. Fix HUD visuals — loop `this.enemies`

Every `Fighter` already has `frostVisual`, `voidFrostVisual`, `burnAura`, `toxicAura`, `bleedVisual`, `growthBloatAura` — so replace single-NPC visual management with a loop:

```typescript
// BEFORE
const label = this.npc.frostStacks > 0 ? `❄️×${this.npc.frostStacks}` : '';
if (label) {
  if (!this.npc.frostVisual) {
    this.npc.frostVisual = this.add.text(...).setOrigin(0.5).setDepth(10);
  } else {
    this.npc.frostVisual.setText(label).setPosition(this.npc.x, this.npc.y - 42);
  }
} else if (this.npc.frostVisual) {
  this.npc.frostVisual.destroy(); this.npc.frostVisual = null;
}

// AFTER (works for both PvP and invasion since this.enemies = [this.npc] in PvP)
for (const t of this.enemies) {
  if (!t.active) continue;
  const label = t.frostStacks > 0 ? `❄️×${t.frostStacks}` : '';
  if (label) {
    if (!t.frostVisual) {
      t.frostVisual = this.add.text(t.x, t.y - 42, label,
        { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
    } else {
      t.frostVisual.setText(label).setPosition(t.x, t.y - 42);
    }
  } else if (t.frostVisual) {
    t.frostVisual.destroy(); t.frostVisual = null;
  }
}
```

For aura `Arc` objects that are created once and repositioned each frame, use the same loop pattern — create if null, update position if exists, destroy if condition cleared.

### 7. Fix per-frame DOT tick blocks — loop `this.enemies`

Per-frame blocks that combine aura management with damage ticking (toxic, burn, bleed, void, etc.) are a common missed case. They look like status-setter fixes but also deal damage each tick. If the block reads `this.npc.toxicUntil`, `this.npc.burnTickAccum`, etc., convert the entire block to loop `this.enemies`:

```typescript
// BEFORE — only NPC receives toxic ticks
if (this.npc.toxicUntil > time) {
  if (!this.npc.toxicAura) {
    this.npc.toxicAura = this.add.circle(this.npc.x, this.npc.y, 26, 0x88bb22, 0.3).setDepth(7);
  }
  this.npc.toxicAura.setPosition(this.npc.x, this.npc.y);
  this.npc.toxicTickAccum += delta;
  if (this.npc.toxicTickAccum >= 1000) {
    this.npc.toxicTickAccum -= 1000;
    this.npc.takeDamage(this.npc.toxicDps);
    this.spawnHitFlash(this.npc.x, this.npc.y, 0x88bb22);
  }
} else {
  this.npc.toxicTickAccum = 0;
  if (this.npc.toxicAura) { this.npc.toxicAura.destroy(); this.npc.toxicAura = null; }
}

// AFTER
for (const t of this.enemies) {
  if (!t.active) continue;
  if (t.toxicUntil > time) {
    if (!t.toxicAura) {
      t.toxicAura = this.add.circle(t.x, t.y, 26, 0x88bb22, 0.3).setDepth(7);
    }
    t.toxicAura.setPosition(t.x, t.y);
    t.toxicTickAccum += delta;
    if (t.toxicTickAccum >= 1000) {
      t.toxicTickAccum -= 1000;
      t.takeDamage(t.toxicDps);
      this.spawnHitFlash(t.x, t.y, 0x88bb22);
    }
  } else {
    t.toxicTickAccum = 0;
    if (t.toxicAura) { t.toxicAura.destroy(); t.toxicAura = null; }
  }
}
```

Note that `burnTickAccum`, `voidedTickAccum`, `bleedingUntil` DOT ticks, and `voidFrostTickAccum` all follow the same pattern — each accumulator and aura field lives on `Fighter`, so looping `this.enemies` handles all modes correctly. The fire burn DOT block and growth toxic DOT block are canonical examples of this fix.

### 8. Fix premature `break` inside enemy loops

If a per-frame block loops `this.enemies` but `break`s after the first hit, later enemies are skipped. The typical pattern is when a per-trail/per-zone accumulator was written alongside the per-enemy effect:

```typescript
// BEFORE — only first enemy in zone gets the effect
for (const t of this.enemies) {
  if (inRange(t)) {
    applyEffect(t);
    zone.tickAccum += delta;   // ← accumulates once, then break
    if (zone.tickAccum >= 1000) { zone.tickAccum -= 1000; addStack(t); }
    break;
  }
}

// AFTER — collect all enemies first, then tick accumulator once
const hits: Fighter[] = [];
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (inRange(t)) { applyEffect(t); hits.push(t); }
}
if (hits.length > 0) {
  zone.tickAccum += delta;
  if (zone.tickAccum >= 1000) {
    zone.tickAccum -= 1000;
    for (const t of hits) addStack(t);
  }
}
```

### 9. Fix special projectile types missing from `applyProjectileToCorrupted`

`applyProjectileToNpc` often has early-return handlers for element-specific projectile textures (e.g. `proj-silence-eye`, `proj-silence-hook`). Check whether matching handlers exist in `applyProjectileToCorrupted` (near the bottom of ArenaScene). If they're missing, add early-return blocks at the **top** of `applyProjectileToCorrupted` (before the generic `c.takeDamage(dmg)` line) so invasion enemies respond the same way:

```typescript
private applyProjectileToCorrupted(proj: Projectile, c: CorruptedBase): void {
  // $ARGUMENTS special projectile — apply status, no generic damage
  if (proj.texture.key === 'proj-$ARGUMENTS-special') {
    c.someStatusField = this.time.now + duration;
    this.showFloatingText(c.x, c.y - 30, 'Effect!', '#cc88ff');
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
    return;
  }
  // ... existing handlers
  c.setIncomingCritContext(...);
  let dmg = proj.damage;
  // ...
}
```

If the projectile should deal damage AND apply a status, just set the status fields and fall through to the generic damage path (no early return needed).

### 10. Fix single-target tracking — add a `Fighter | null` field

Some abilities target one specific enemy (hook, tether, possession) and track it implicitly via `this.npc`. In invasion mode a distinct enemy is hit, so the identity must be stored explicitly.

**Pattern:**
1. Add a private field: `private [element]SomeTarget: Fighter | null = null;`
2. Reset it in `create()` alongside the other reset fields for the element.
3. In `applyProjectileToNpc`, set `this.[element]SomeTarget = this.npc;` when the hook lands.
4. In `applyProjectileToCorrupted`, set `this.[element]SomeTarget = c;` when the hook lands.
5. In the per-frame block that steers the target, replace `this.npc` with `this.[element]SomeTarget` and guard against the target dying mid-yank:

```typescript
if (time < this.elementYankUntil && this.elementTarget) {
  const ht = this.elementTarget;
  if (!ht.active || ht.hp <= 0) {
    this.elementYankUntil = 0;
    this.elementTarget = null;
  } else {
    const dx = this.player.x - ht.x, dy = this.player.y - ht.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= arrivalThreshold) {
      this.elementYankUntil = 0;
      this.elementTarget = null;
      (ht.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else {
      (ht.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }
  }
}
```

### 11. Classify and skip safe calls

Do NOT change:
- Anything inside `buildNpcContext` — the NPC is the caster, not the target
- `this.player.*` assignments — player debuffs (NPC cast on player) are correct as-is
- Reflect/recoil effects where `this.npc` is correctly the caster receiving its own damage

### 12. Verify and commit

Run `npm run build` and fix any TypeScript errors. Then commit:
```
Fix $ARGUMENTS element inline abilities in invasion mode — loop enemies
```
