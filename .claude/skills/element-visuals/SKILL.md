---
name: element-visuals
description: Give an element a complete visual redesign — a character rig with ball-hand arms and tracking eyes, a mastered-vs-unmastered tell, and bespoke art for every ability. Use when asked to make an element "look good", redesign its visuals, or give it a character.
---

# Element visual redesign

Take `$ARGUMENTS` (an element id, e.g. `water`) from flat colored circles to a living character
with hand-drawn attacks. **Reference implementation: Fire.** Read these three before starting —
they are the pattern, not just an example:

- `src/elements/kits/FireVisuals.ts` — the whole drawing kit (`FireFx`, `FireWreath`, `FireAvatar`)
- `src/elements/kits/FireKit.ts` — how a kit owns the rig and fires effects at cast sites
- `src/elements/fire.ts` — how the shared ability defs (player *and* NPC path) paint themselves

## What "done" means

Four deliverables. All four, or the element still looks unfinished:

1. **A character** — the fighter is a creature with two ball hands and eyes, not a disc.
2. **Hands that act** — every ability drives a distinct arm gesture.
3. **A mastery tell** — a mastered user is identifiable at a glance, before casting anything.
4. **Bespoke art per ability** — no `add.circle` + scale-tween left anywhere in the element.

---

## Step 1 — Pick the element's primitive

The single most important decision. Fire's is `flameTongue`: a tapered, curved, rounded lick of
flame. Everything else — the jet, the wreath, explosion lobes, the character's plume — is built
from it. **Do not recolour Fire's tongue.** Each element gets its own shape function:

| Element | Primitive |
|---|---|
| water / acid | a ribbon or falling droplet with a fat head and a thin tail |
| ice / crystal | a faceted shard with a bright edge highlight |
| electricity / plasma | a jagged polyline that re-rolls its midpoints each frame |
| shadow / silence | a tapering barbed tentacle that sways (see `ShadowKit`) |
| earth / metal | a chunky irregular polygon slab with a lit top face |
| growth / life | a curling vine segment with a leaf pair |

Write it as a free function taking `(g, cx, cy, angle, len, halfW, ...)` that appends to a
`Graphics` path, plus a `*Layered` wrapper painting outer shell → body → hot core in three passes.
Fire adds rounded fills at the root, waist and shoulder of each tongue — without them a ring of
primitives reads as a starburst instead of an organic bloom. Your primitive needs the equivalent.

## Step 2 — Palette, and the cosmetic constraint

Export a frozen palette const (`export const WATER = { deep: 0x..., ... } as const`) and use
**only** those values. Two reasons: consistency, and cosmetics.

Check `src/data/Cosmetics.ts` for a `color`-slot cosmetic owned by this element. If one exists,
its remap table in `CosmeticsKit.ts` (see `BURNT_PALETTE`) must have **a key for every palette
value** — an off-palette shade would stay its original colour on a player wearing the cosmetic,
which looks broken. If the element has no colour cosmetic yet, still route through a
`(base) => number` mapper so adding one later is a table edit, not a sweep.

Bind one mapper per side in the kit — Fire keeps `pcol`/`ncol` and `pfx`/`nfx` — because the
player and the NPC can have different cosmetics equipped.

## Step 3 — Create `src/elements/kits/[Element]Visuals.ts`

Three exports, mirroring `FireVisuals.ts`:

### `[Element]Fx` — one-shot effects
Constructor takes `(scene, colorFn)`. Cheap; construct one per owner, or per cast in the ability
file. The engine is:

```ts
anim(depth, duration, (g, t) => { /* redraw from scratch, t sweeps 0→1 */ })
```

It wraps `scene.tweens.addCounter`, so a scene restart kills the animation *and* destroys its
Graphics. **Never** hand-roll this with `scene.events.on('update')` — that leaks across match
restarts. Never use `setInterval` or `requestAnimationFrame` either.

These primitives are element-agnostic; port them from `FireFx` and re-skin, don't reinvent:
`ring` (jittered expanding polygon — segment count must scale with radius or big blasts look
like polygons), `flash`, `scorch`, `embers`, `smoke`, `explosion`, `muzzleFlash`, `dashTrail`,
`bloom`, `channelCharge`, `firePillar`.

> If a **third** element needs these, promote the generic ones to a shared
> `src/elements/kits/ElementVisuals.ts` and keep only the element-specific shapes local.
> Two copies is fine; three is a refactor.

### `[Element]Aura` — persistent effects
A class owning one `Graphics`, driven by the caller: `update(delta, x, y, alpha)`, plus
`destroy()`. For toggles, DOTs and stances. Guard the top of `update` with `if (!this.g.active)`.

### `[Element]Avatar` — the character rig
See Step 4.

## Step 4 — The character rig

Model it on `FireAvatar`. Required parts:

**Two ball hands.** Each is a `Container` of 3–4 `Arc`s (outer glow, shell, core, glint) so one
`setScale` moves the whole hand. Hold live world positions in the class and lerp toward a target
pose each frame:

```ts
const k = Math.min(1, STIFFNESS * (delta / 16.67));   // frame-rate independent
this.armX[i] += (targetX - this.armX[i]) * k;
```

That lag is what makes the character feel like it has weight. Then squash the container along
its own velocity vector for motion smear.

Poses are polar offsets from the body centre — `{ ang, dist, scale }` — computed by a single
`poseFor(side)` that blends an idle sway with whatever gesture is running. Use
`Phaser.Math.Angle.RotateTo(idleAng, targetAng, |wrapped delta| * blend)` so arms take the short
way round instead of unwinding through a full turn.

**Eyes.** Two `Arc` pairs (sclera + pupil). Offset them toward `facing` so the character looks
where it aims, blink on a random 2–4s timer, and narrow them while casting. This is the single
cheapest thing that turns a sprite into a character — do not skip it.

**A silhouette extra.** Fire gets a plume off the crown. Give yours the element's equivalent
(dripping ribbons, a static halo, drifting leaves, a shadow shroud). **Draw it at `depth + 2`,
over the sprite** — under it, only the dark tips clear the 22px body and it reads as a stray
spike. Root it at the crown (`y - 18`) so it never covers the face. Keep the soft under-glow as
a *separate* Graphics at `depth - 3`; one Graphics can only have one depth.

**Public API:**

```ts
setFacing(angle)                       // aim direction
setIntensity(n)                        // 1 = base; >1 while stance buffs are up
setMastered(on)                        // see Step 5
play(gesture, angle?, duration?)       // one-shot
setHold('channel-name' | null, angle?) // sustained; overrides gestures while set
update(delta, x, y, alpha)
destroy()
```

**Gestures.** Fire's set covers most elements: `punch` (alternating hands jab along the aim),
`dash`, `slam` (overhead then driven down), `raise` (both thrust up and hold — ultimates),
`sweep`, `clap`, `flex`. Plus holds: `spray`, `charge`. Map *every* ability to one. Fire an
alternating side for repeat-cast abilities so spam doesn't look mechanical.

## Step 5 — Mastered vs unmastered

Two separate axes. Do both.

**The character** — `setMastered(on)` applies a permanent, silhouette-level upgrade, readable
before a single cast. Fire's: white-hot eyes, a wider corona on each hand, a 30% taller plume,
and three embers orbiting the head. Make it a *shape* change, not just a brighter tint — a tint
alone is invisible at gameplay zoom. Call it every frame from the kit's avatar update, passing
the kit's `masteryActive` flag; the setter early-outs when unchanged, so this is free.

**The abilities** — an upgraded or mastery-bound ability must look bigger, not just hit harder.
Scale the *content* of the effect with the tier, never just the radius:

```ts
this.pfx.explosion(mx, my, 100, {
  shards: 14 + chargeLevel * 8,
  smoke: 3 + chargeLevel,
  duration: 380 + chargeLevel * 120,
});
if (chargeLevel > 0) this.pfx.firePillar(mx, my, 34, 90 + chargeLevel * 50);
scene.cameras.main.shake(140 + chargeLevel * 70, 0.004 + chargeLevel * 0.003);
```

Mastery passives get their own persistent aura at a *lower* depth than stance auras, so the two
stack into one silhouette rather than fighting (Fire: Burning Body at depth 2, Flame Body at 3).

## Step 6 — Walk every ability

For each of Click / E / R / F / Q, plus each upgrade branch, each mastery bind, and each perk
branch. Ask: what does this *physically do*? Then build that, not a circle that scales up.

- **Projectile** — muzzle flare at the spawn point + a live trail. Trails belong in the kit's
  `update`, scanning the projectile group on a ~45ms accumulator and emitting out of the *back*
  of the shot (`atan2(-vy, -vx)`). Needs `projectiles` on the kit's `ArenaApi`.
- **Detonation** — flash, then a boiling multi-lobe body, then staggered shockwaves, then
  shrapnel, then smoke, then a lingering ground mark, then camera shake. Six layers minimum. A
  single expanding disc always reads as placeholder.
- **Dash** — a tapered comet trail along the path *and* a burst at the launch point.
- **Channel** — something converging inward with a closing containment ring, so the wind-up
  earns the payoff. `channelCharge` takes an optional `follow` callback for a moving caster.
- **Toggle/stance** — a persistent aura plus an ignition burst on the frame it turns on.
- **Debuff applied to a target** — a snap effect on application, then a continuous tell so the
  status is readable on the victim at all times, not just on the tick.

Keep floating text on every hit and notable event (existing project convention), and remember
kits must **not** call `spawnDamageNumber` after `takeDamage` — that path already emits one.

## Step 7 — BootScene textures

Redraw the element's `elem-*` and `proj-*` textures as layered art: rim, body bands, hot core,
one specular glint. Keep every canvas size **exactly as it was** — `Fighter` hardcodes a radius-22
circular body inside 48×48, and projectile hitboxes derive from texture size. Stay inside the
canvas: at 48×48 with centre (24,24) nothing may exceed radius 23.5.

## Step 8 — Wiring, and the ArenaScene budget

The rig and every effect live in the kit. Per `CLAUDE.md`, ArenaScene must not grow — a visual
pass should leave it **net smaller**. Fire's did: `spawnFlamethrowerCone` was deleted from
ArenaScene and became `FireFx.flameJet` inside the kit; only a one-line `projectiles` getter was
added to the adapter. If an ArenaScene method exists solely to draw one element's effect, move it
into the kit and delete it.

In the kit:
- Build `Fx` painters and colour mappers in the **constructor body** (not field initializers) so
  they see the injected `arena`.
- Avatars and auras are GameObjects: `reset()` destroys and nulls them, `update()` rebuilds
  lazily. A scene restart kills the old ones, so never assume they survive.
- Drive the avatar from the kit's `update` for both sides — the player faces the cursor (cache
  `mouseX/mouseY` in `handleInput`; `update` has no pointer), the NPC faces its target.
- Mirror gestures for the NPC in `handleNpcCastId` via a `Record<string, ArmGesture>` map, and in
  any online mastery-replay entry point.

## Step 9 — Verify in the browser

Follow the `verify` skill. Element-specific traps:

- **`page.keyboard.press(k)` is too fast.** A same-frame down+up is swallowed by Phaser's
  `JustDown`, so the ability silently never fires and you conclude your effect is broken. Always
  `keyboard.down` → wait ~140ms → `keyboard.up`.
- Park both fighters and set `npc.disarmedUntil = Date.now() + 9e6` before close-ups, or the
  opponent's effects land on top of the frame you are trying to judge.
- Screenshot with a `clip` box and `deviceScaleFactor: 3` to judge the character rig; full-canvas
  shots are too small to see the hands and eyes.
- Capture the effect at its **peak** (~60–150ms after the cast), not after it has faded.
- Check FPS (`game.loop.actualFps`) and `scene.children.list.length` after a burst of casts —
  a leaking effect shows up as a display list that never comes back down.
- Restart across elements (fire → water → fire) to prove `reset()` rebuilds the rig.

## Checklist

- [ ] Element-specific primitive shape, not a recoloured Fire tongue
- [ ] Frozen palette; every value covered by the element's colour-cosmetic remap table
- [ ] Per-owner colour mappers (player and NPC cosmetics differ)
- [ ] Ball hands with spring follow + velocity squash
- [ ] Eyes that track aim, blink, and narrow while casting
- [ ] Silhouette extra drawn *over* the sprite, rooted at the crown
- [ ] A gesture mapped to every ability, on both the player and the NPC rig
- [ ] `setMastered` changes the silhouette, not just the tint
- [ ] Upgraded abilities scale shards/smoke/duration/shake, not only radius
- [ ] Every `add.circle` + scale-tween in the element replaced
- [ ] ArenaScene net smaller
- [ ] `reset()` destroys and nulls every GameObject; `update()` rebuilds
- [ ] `npm run build` clean, browser-verified, FPS steady, display list stable
