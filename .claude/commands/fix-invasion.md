Fix all player-facing abilities, attacks, status effects, slows, debuffs, and HUD visuals for the `$ARGUMENTS` element so they work correctly in Invasion mode.

## Background

In Invasion mode `this.npc` is a **disabled placeholder** — not a real target. All real enemies are `CorruptedBase` instances in `this.enemies: Fighter[]`. In PvP `this.enemies = [this.npc]`, so `this.npc`-direct code still works there. In Invasion it silently does nothing.

The goal is to find every place the `$ARGUMENTS` element's player-side code references `this.npc` as a *target* and replace it with a loop over `this.enemies`.

## Where to look

Search `src/scenes/ArenaScene.ts` for all `this.npc` references inside:
- The `this.elementId === '$ARGUMENTS'` per-frame block
- `buildPlayerContext` lambdas for `$ARGUMENTS` abilities
- `applyProjectileToNpc` special-case handlers for `$ARGUMENTS` projectile textures

## What NOT to change

- Anything inside `buildNpcContext` — the NPC is the caster there, not the target
- `this.player.*` assignments — player debuffs (NPC casting on player) are correct as-is
- Reflect/recoil where `this.npc` correctly receives its own damage

---

## Fix patterns

### Direct damage — loop `this.enemies`

```typescript
// BEFORE
if (Phaser.Math.Distance.Between(cx, cy, this.npc.x, this.npc.y) <= radius) {
  this.npc.takeDamage(dmg);
  this.spawnHitFlash(this.npc.x, this.npc.y, color);
}
// AFTER
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= radius) {
    t.takeDamage(dmg);
    this.spawnHitFlash(t.x, t.y, color);
  }
}
```

### Cone / dot-product check (recompute dot per enemy)

```typescript
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  const dist = Phaser.Math.Distance.Between(px, py, t.x, t.y);
  if (dist <= range) {
    const dot = dirX * ((t.x - px) / dist) + dirY * ((t.y - py) / dist);
    if (dot > threshold) { t.takeDamage(dmg); this.spawnHitFlash(t.x, t.y, color); }
  }
}
```

### Arc sweep (angle + range — recompute angle per enemy)

```typescript
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(px, py, t.x, t.y) <= RANGE) {
    const angleDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(aimAngle),
      Phaser.Math.RadToDeg(Math.atan2(t.y - py, t.x - px)),
    ));
    if (angleDiff <= HALF_ARC_DEG) { t.takeDamage(dmg); this.spawnHitFlash(t.x, t.y, color); }
  }
}
```

### `time.delayedCall` closure

```typescript
this.time.delayedCall(ms, () => {
  for (const t of this.enemies) {
    if (!t.active || t.hp <= 0) continue;
    if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= radius) {
      t.takeDamage(dmg); this.spawnHitFlash(t.x, t.y, color);
    }
  }
});
```

### Status / debuff setters

```typescript
// BEFORE
this.npc.burningUntil = Math.max(this.npc.burningUntil, time + 3000);
this.npc.toxicDps = 10; this.npc.toxicUntil = time + 5000;

// AFTER
for (const t of this.enemies) {
  if (!t.active || t.hp <= 0) continue;
  if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) <= range) {
    t.burningUntil = Math.max(t.burningUntil, time + 3000);
    t.toxicDps = 10; t.toxicUntil = time + 5000;
  }
}
```

If the ability also calls `this.npc.takeDamage()`, put it inside the same loop.

### Per-frame DOT tick blocks (toxic, burn, bleed, void, etc.)

```typescript
// BEFORE — only NPC receives ticks
if (this.npc.toxicUntil > time) {
  if (!this.npc.toxicAura) { this.npc.toxicAura = this.add.circle(...); }
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
    if (!t.toxicAura) { t.toxicAura = this.add.circle(t.x, t.y, 26, 0x88bb22, 0.3).setDepth(7); }
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

The same pattern applies to `burnTickAccum`, `voidedTickAccum`, `bleedingUntil` DOT ticks, and `voidFrostTickAccum`.

### HUD visuals (frostVisual, burnAura, etc.)

```typescript
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

### Per-frame slows and freezes

`npcSpeedMult` only affects `this.npc`. For invasion enemies, add velocity overrides after `aiTick()` in `updateInvasion`. Also guard the `npcSpeedMult` line:

```typescript
// Guard so slow only applies in PvP
if (!this.isInvasion) this.npcSpeedMult *= slowFactor;

// In the updateInvasion loop, after c.aiTick(...)
if (c.frozenUntil > time || c.earthStunnedUntil > time) {
  (c.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
} else if (c.<slowCondition>) {
  const cb = c.body as Phaser.Physics.Arcade.Body;
  cb.velocity.x *= slowFactor;
  cb.velocity.y *= slowFactor;
}
```

### Proximity-based charge mechanics — use `getNearestEnemy()`

```typescript
// BEFORE
const dist = Phaser.Math.Distance.Between(px, py, this.npc.x, this.npc.y);
// AFTER
const nearest = this.getNearestEnemy(px, py);
const dist = Phaser.Math.Distance.Between(px, py, nearest.x, nearest.y);
```

`getNearestEnemy(x, y)` returns the closest active enemy, falling back to `this.npc` if none exist.

### Premature `break` inside enemy loops

```typescript
// BEFORE — only first enemy in zone gets the effect
for (const t of this.enemies) {
  if (inRange(t)) {
    applyEffect(t);
    zone.tickAccum += delta;
    if (zone.tickAccum >= 1000) { zone.tickAccum -= 1000; addStack(t); }
    break;
  }
}
// AFTER
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

### Missing handlers in `applyProjectileToCorrupted`

Check whether `applyProjectileToNpc` has early-return handlers for `$ARGUMENTS` projectile textures. If matching cases are absent from `applyProjectileToCorrupted`, add them at the **top** of that method (before the generic `c.takeDamage(dmg)` line):

```typescript
private applyProjectileToCorrupted(proj: Projectile, c: CorruptedBase): void {
  if (proj.texture.key === 'proj-$ARGUMENTS-special') {
    c.someStatusField = this.time.now + duration;
    this.showFloatingText(c.x, c.y - 30, 'Effect!', '#cc88ff');
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
    return;
  }
  // ... existing handlers
}
```

If the projectile should deal damage AND apply a status, set the status fields and fall through to the generic damage path (no early return).

### Single-target tracking (hook, tether, possession)

If an ability implicitly tracks one enemy via `this.npc`, add an explicit field:

1. Add `private [element]Target: Fighter | null = null;`
2. Reset it in `create()`.
3. Set `this.[element]Target = this.npc` in `applyProjectileToNpc`, and `this.[element]Target = c` in `applyProjectileToCorrupted`.
4. Replace `this.npc` with `this.[element]Target` in the per-frame steering block and guard against death:

```typescript
if (time < this.elementYankUntil && this.elementTarget) {
  const ht = this.elementTarget;
  if (!ht.active || ht.hp <= 0) {
    this.elementYankUntil = 0; this.elementTarget = null;
  } else {
    const dx = this.player.x - ht.x, dy = this.player.y - ht.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= arrivalThreshold) {
      this.elementYankUntil = 0; this.elementTarget = null;
      (ht.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else {
      (ht.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }
  }
}
```

---

## Finish

Run `npm run build` and fix all TypeScript errors. Then commit:
```
Fix $ARGUMENTS element inline abilities in invasion mode — loop enemies
```
