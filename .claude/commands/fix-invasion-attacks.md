Fix all player-facing attack abilities for the `$ARGUMENTS` element so they damage enemies correctly in Invasion mode.

## Background

In Invasion mode `this.npc` is a **disabled placeholder** — not a real target. All real enemies are `CorruptedBase` instances in `this.enemies: Fighter[]`. In PvP `this.enemies = [this.npc]`, so `this.npc`-direct code still works there. In Invasion it silently does nothing.

The goal is to find every place the `$ARGUMENTS` element's player-side code calls `this.npc.takeDamage()` and replace it with a loop over `this.enemies`.

## Steps

1. **Find the element's inline update block** in `src/scenes/ArenaScene.ts`. Search for `this.elementId === '$ARGUMENTS'` to locate the per-frame input/update code. Note all `this.npc.takeDamage()` calls inside player-facing branches.

2. **Find the element's `buildPlayerContext` callbacks**. Search for `private buildPlayerContext` — inside this method, locate any lambda callbacks (e.g. `launchDarkBomb`, `activateTentacle`) that belong to `$ARGUMENTS` and call `this.npc.takeDamage()` directly instead of using `ctx.*` helpers.

3. **Classify and skip safe calls**. Do NOT touch:
   - Calls inside `buildNpcContext` or NPC AI methods — the NPC is the caster there.
   - Calls where `this.npc` is the target of its own recoil or reflect (these are no-ops in Invasion and correct in PvP).
   - The `this.player.takeDamage()` branch of any `owner === 'player' ? ... : this.player` pattern — that branch is already correct.

4. **Apply the fix** for each broken call using the appropriate pattern:

   **Simple distance check:**
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

   **Cone / dot-product check** (recompute dot per enemy):
   ```typescript
   // AFTER
   for (const t of this.enemies) {
     if (!t.active || t.hp <= 0) continue;
     const dist = Phaser.Math.Distance.Between(px, py, t.x, t.y);
     if (dist <= range) {
       const dot = dirX * ((t.x - px) / dist) + dirY * ((t.y - py) / dist);
       if (dot > threshold) { t.takeDamage(dmg); this.spawnHitFlash(t.x, t.y, color); }
     }
   }
   ```

   **`time.delayedCall` closure** — use the same loop inside the callback; `this.enemies` is evaluated at fire time, which is correct:
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

   **Per-fighter status fields** (e.g. `burningUntil`, `toxicUntil`, `toxicDps`, `bleeding`, `bleedingUntil`, `frozenUntil`, `frostStacks`, `magicChainBound`) — these are all on `Fighter`, so set them on `t` inside the loop:
   ```typescript
   t.burningUntil = Math.max(t.burningUntil, time + 3000);
   ```

   **Condition that varies per target** (e.g. burn bonus) — evaluate inside the loop:
   ```typescript
   for (const t of this.enemies) {
     if (!t.active || t.hp <= 0) continue;
     const isBurning = t.burningUntil > time;
     const dmg = isBurning ? 120 : 80;
     t.takeDamage(dmg);
   }
   ```

5. **Run `npm run build`** and fix all TypeScript errors before finishing.

6. **Commit** with a message like: `Fix $ARGUMENTS element inline abilities in invasion mode — loop enemies`
