---
name: element-skin
description: Add an alternate skin for an element — a completely different player character (unmastered and mastered forms) plus a palette recolour of that element's attacks. Use when asked to create, add, revamp or rename a skin, or to change how a skinned character looks.
---

# Element skin

Build a new skin for an element. **Reference implementation: Candle (fire).** Read these four
before starting — they are the pattern, not just an example:

- `src/data/Skins.ts` — the `SkinDef` table
- `src/elements/kits/skins/CandleAvatar.ts` — the replacement character
- `src/elements/kits/skins/SkinAvatars.ts` — the one-line registry
- `src/elements/kits/SkinsKit.ts` — how the palette, body and projectile repaints get applied

Plus `BaseAvatar` in `src/elements/kits/ElementVisuals.ts`, which every rig extends.

## The contract

A skin is **exactly two things**, and refusing to let it become a third is what keeps skins cheap:

1. **A different character.** Its own `BaseAvatar` subclass, with an unmastered and a mastered
   form, so the fighter is visibly a different creature.
2. **A recolour of everything that element throws.** Ability *shapes* never change.

**Do not draw new ability art for a skin.** If a skin needs bespoke effects it is a visual pass
(`/element-visuals`), not a skin. One avatar file plus one table entry is the whole job.

**One skin slot per element.** `PlayerData.equippedSkins` is `elementId → skinId`. There is no
second slot; do not add one.

---

## Step 1 — Define the skin

One entry in `SKINS` (`src/data/Skins.ts`). Every field:

| Field | Notes |
|---|---|
| `elementId` | The element it belongs to. A skin only ever loads for a fighter playing that element. |
| `achievementId` | Skins unlock from achievements only — there is no shop path. See below. |
| `avatar` | Registry key in `SkinAvatars.ts`. Omit for a recolour-only skin. |
| `bodyTint` | `[top, bottom]` — flat repaint of the fighter sprite. |
| `projectileTint` | `[top, bottom]` — flat repaint of the element's projectiles. |
| `projectileTextures` | Which `proj-*` keys the tint hits. Grep the element file *and* its kit; fire only spawns `proj-fire`, most elements spawn two or three. |
| `palette` | base colour → skin colour. |
| `paletteFallback` | Stand-in for anything the table misses. Always set it. |

**The palette must have a key for every value in the element's frozen palette const** (`FIRE`,
`WATER`, `METAL`, …). Those consts exist precisely so a skin is a closed table — an off-palette
shade drawn anywhere in the element's visuals misses the remap and stays its original colour,
which reads as a rendering bug. Copy the palette const key-for-key and name each line in a
comment, the way `CANDLE_PALETTE` does.

Picking the new colours: **preserve the luminance ordering.** Map the element's darkest to your
darkest and its white-hot to your brightest. A palette that scrambles the ordering destroys the
internal shading of every layered effect at once.

`bodyTint` / `projectileTint` are corner pairs fed to `setTintFill`, not `setTint`. A
multiplicative tint can only darken what is already there — it can never move a hue onto a
different one. The pair gives a little vertical shading so the body isn't a dead silhouette.

**Achievements.** If no existing achievement fits, add one to `src/data/Achievements.ts` with
`skinReward: '<skin-id>'`, then call `arena.unlockAchievement('<id>')` from wherever that thing
physically happens — Candle's sits in `FireKit`'s fuse-detonation branch, right after the self
damage. `PlayerData.unlockAchievement` is idempotent and returns true only on the first unlock,
so the popup fires once.

## Step 2 — Draw the character

New file `src/elements/kits/skins/[Name]Avatar.ts`, extending `BaseAvatar`.

```ts
constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
  super(scene, (c) => c, depth, MY_AVATAR_SPEC);
}
```

**Always pass the identity mapper to `super`, and ignore the one handed in.** A skin's palette is
already the final one; routing it through the element's remap (whose entire job is to turn the
element's colours *into* the skin's) would map it twice. Own a local palette const instead.

### The three layers

| Hook | Depth | What belongs there |
|---|---|---|
| `drawGlow` | `depth - 3` | Under the sprite: ground light, a soft halo, anything the body should occlude. |
| `drawBody` | `depth - 0.5` | Over the sprite, **under the eyes**: the torso itself. |
| `drawExtras` | `depth + 2` | Over everything: only what lives above the crown. |

`drawBody` is the layer that makes a skin possible at all — fighter sprites sit at depth 5 and the
rig at 6, so the half step is the only slot that is over the sprite and still under the face.

**The face rule.** The eyes are drawn at `y - 4` with radius 4.4. So anything opaque `drawBody`
puts there renders *behind* the eyes, and anything `drawExtras` puts below the crown (`y - 18`)
covers the face outright. Candle roots its crater at `y - 24` and branches its mastered arms from
`y - 16` for exactly this reason. Check both when you place a feature near the head.

**Covering the sprite.** The fighter is a 44px disc of raw element. Two things hide it together,
and you need both:

- `bodyTint` repaints the sprite to your base colour, so any peek past your silhouette reads as
  part of the new character rather than as the old one showing through.
- Your torso should span roughly 44×44 across the disc. Candle's column runs `y-24 → y+23` and is
  37–47 wide, with a melt pool covering the foot and the crater covering the crown.

**Hands.** Reskin the `AvatarSpec` — concentric discs, outermost first, plus an off-centre glint
(a highlight dead centre reads as a bulb). Candle's are wax beads held in violet flame: corona,
bead, lit wax, flame glint. Leaving the element's hand spec on a new character is the fastest way
to make a skin look half-finished.

### Unmastered vs mastered

**The mastered form must be a different silhouette, not a brighter one.** A tint change is
invisible at gameplay zoom. Candle:

- *Unmastered* — a squat half-burnt stub: one wick, one flame, frozen drips, a melt pool.
- *Mastered* — a candelabra: taller column, brass collar and foot dish, two wax arms curving up
  off the shoulders, **three** flames flickering out of phase, soot lifting off the middle one.

Drive the difference off `this.mastered` inside the draw hooks. Use `applyMastery(on)` only for
state that lives on GameObjects — eye colour, hand-layer radii and fills. The setter early-outs
when unchanged, so the kit calling `setMastered` every frame is free.

### Making it move

Free signals available in every hook: `this.t` (seconds), `this.intensity` (>1 during stance
buffs), `this.facing`, and `this.armX/armY` (live hand positions). Candle derives a flame lean
from `(mean(armX) - x) * 0.5` clamped — because the hands lag the body on springs, their drift is
a free read on which way the character is running, and a carried candle always trails its flame.
Look for a signal like that rather than adding state.

### Detail bar

Bespoke art, per the project convention: taper, sway, a lit face and a shadow side, layered
shells. **A shape that tapers should be built point-by-point into `fillPoints`, not stacked out of
circles** — at this size a chain of circles reads as a caterpillar. See `flameTeardrop` and
`waxColumn`. Circles are right for beads, pools and bulbs.

For anything the rig throws off (`emitTrail`), subclass `FxBase` and use its `anim(depth, ms, draw)`
runner. It is tween-backed, so a scene restart kills the animation *and* destroys its Graphics.
Never hand-roll it on `scene.events.on('update')`, `setInterval` or `requestAnimationFrame` —
those leak across match restarts.

## Step 3 — Register the rig

One line in `SKIN_AVATARS` in `src/elements/kits/skins/SkinAvatars.ts`.

## Step 4 — Wire the element (only the first time it gets a skin)

Fire is done. For an element that has never had a skin, three changes to its kit:

1. `skinId(owner: 'player' | 'npc'): string | null` on its `ArenaApi`, and
   `skinId: (owner) => arena.skinsKit.skinId(owner)` in the ArenaScene adapter.
2. A `private makeAvatar(owner)` helper:
   `return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new <Element>Avatar(scene, col);`
3. Type the avatar fields `BaseAvatar | null` and import `BaseAvatar`.

That is all — ArenaScene gains one adapter line, per the size discipline in `CLAUDE.md`.

**Check the kit's `reset()` destroys and nulls its avatars** (fire's does). Rigs are rebuilt
lazily in `update`, so that teardown is what lets a skin change between matches actually swap the
character. A kit that builds its rig once and never drops it needs fixing first.

## Step 5 — Check it lands everywhere

- **Player**, **NPC** (fight a bot of that element), and **online peer** — the skin id rides the
  lobby handshake as `skin` on `sel`/`start`. Adding a *skin* needs no protocol bump; adding a
  *field* to `SkinDef` that has to cross the wire does.
- **Anything drawn with a raw hex literal stays the original colour.** That is the bug to hunt.
  Grep the element's `*Visuals.ts` and `*Kit.ts` for hex values that aren't in the palette const,
  and route them through the owner's `*Color` mapper.
- BootScene textures are deliberately untouched — the sprite is repainted by `bodyTint` and
  projectiles by `projectileTint`. Do not add a skin-specific texture.

## Gotchas

- **Don't add a per-element palette table to `SkinsKit`.** All 30 `*Color` methods delegate to one
  `remap()`, and that is correct: a skin belongs to one element and only ever sits in the loadout
  of a fighter playing it.
- **The body repaint runs every frame**, so it stomps any other tint put on the fighter (status
  flashes, freeze blue). Known and accepted; don't try to work around it in the skin.
- **`sizeMult`** — rigs draw at fixed pixel sizes, so a skin won't scale with Titan-style size
  changes. Same limitation as every element rig; not a regression to fix here.
- **NPC rigs never get `setMastered`** in the current kits, so an opponent's skin shows its
  unmastered form. Fine, and consistent with the element rigs.

## Checklist

- [ ] `SkinDef` palette has a key for **every** value of the element's palette const
- [ ] Luminance ordering preserved across the remap
- [ ] `bodyTint` and `projectileTint` set; `projectileTextures` lists every `proj-*` the element spawns
- [ ] Achievement exists, carries `skinReward`, and its unlock is hooked where the event happens
- [ ] Avatar built with the identity `ColorFn`, owning its own palette const
- [ ] Torso in `drawBody`, nothing below the crown in `drawExtras`, face left clear
- [ ] Torso covers the 44px sprite disc
- [ ] Hands reskinned in the `AvatarSpec`
- [ ] Mastered form is a different silhouette, not a brighter tint
- [ ] Tapered shapes built with `fillPoints`, not stacked circles
- [ ] Registered in `SkinAvatars.ts`; element kit wired (3 changes) if this is its first skin
- [ ] No raw hex literals left unrouted in the element's visuals
- [ ] `npm run build` clean
