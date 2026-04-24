import { Element } from './Element';
import { Ability } from './Ability';

// ── Normal mode abilities ────────────────────────────────────────────────────

const goldenShot: Ability = {
  id: 'adrenaline-golden-shot',
  name: 'Golden Shot',
  description: 'Fire a fast golden shot. 15 dmg × style rank. Consecutive hits build combo (Double/Triple). Works in SK8 mode too.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx) { ctx.adrenalineGoldenShot(ctx.targetX, ctx.targetY); },
};

const dash: Ability = {
  id: 'adrenaline-dash',
  name: 'Dash',
  description: 'Dash toward cursor (18 dmg if you connect). Cast within 800 ms of a Golden Shot hit to trigger Hypercharge — next shot within 2 s deals double damage.',
  displayKey: 'E',
  cooldown: 4000,
  cast(ctx) { ctx.adrenalineDash(ctx.targetX, ctx.targetY); },
};

const skateToggle: Ability = {
  id: 'adrenaline-skate-toggle',
  name: 'Skateboard',
  description: 'Toggle SK8 mode. Replaces WASD movement with cursor-directed momentum physics and swaps abilities to SK8 tricks.',
  displayKey: 'R',
  cooldown: 0,
  cast(ctx) { ctx.adrenalineToggleSkate(); },
};

const selfInject: Ability = {
  id: 'adrenaline-self-inject',
  name: 'Self Inject',
  description: 'Inject adrenaline. Phase 1 (4s): +50% dmg, +30% speed, −50% cooldowns. Phase 2 (2s): locked & vulnerable. Land a style event during Phase 1 to skip Phase 2.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx) { ctx.adrenalineSelfInject(); },
};

const styledOn: Ability = {
  id: 'adrenaline-styled-on',
  name: 'Styled On!',
  description: 'Dash at the enemy (30 dmg × rank if you connect). Hit → cooldown refreshes for 2 s. Chain up to 5 times — 5th cast plays "Parry this!"',
  displayKey: 'Q',
  cooldown: 4000,
  cast(ctx) { ctx.adrenalineStyledOn(ctx.targetX, ctx.targetY); },
};

// ── SK8 mode abilities (Click / E / R / F / Q) ─────────────────────────────

const rush: Ability = {
  id: 'adrenaline-rush',
  name: 'Rush',
  description: 'Boost contact damage to 25 for 1 s. (3 s cd)',
  displayKey: 'Click',
  cooldown: 3000,
  cast(ctx) { ctx.adrenalineRush(); },
};

const ramp: Ability = {
  id: 'adrenaline-ramp',
  name: 'Ramp',
  description: 'Drop a ramp 60 px ahead (lasts 5 s). Riding it gives a 50% speed burst for 1 s and opens a ramp-boost window for Trick.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.adrenalineRamp(); },
};

const skateExit: Ability = {
  id: 'adrenaline-skate-toggle',
  name: 'Exit SK8',
  description: 'Leave skateboard mode, restoring normal abilities and WASD movement.',
  displayKey: 'R',
  cooldown: 0,
  cast(ctx) { ctx.adrenalineToggleSkate(); },
};

const trick: Ability = {
  id: 'adrenaline-trick',
  name: 'Trick',
  description: 'AOE blast (r=120): 8 dmg + massive knockback. During ramp boost: 25 dmg + 25% slow 5 s.',
  displayKey: 'F',
  cooldown: 3000,
  cast(ctx) { ctx.adrenalineTrick(); },
};

const wallTeleport: Ability = {
  id: 'adrenaline-wall-teleport',
  name: 'Wall Teleport',
  description: '5 teleports (1.5 s apart) toward cursor wall. Enemies in path take 15 dmg each.',
  displayKey: 'Q',
  cooldown: 36000,
  cast(ctx) { ctx.adrenalineWallTeleport(ctx.targetX, ctx.targetY); },
};

// ── Element definition ───────────────────────────────────────────────────────
// Abilities 0-4: normal mode. Abilities 5-7: SK8-only (ramp/trick/wall-tp).
// skate-toggle (R) is shared (index 2) — skateExit reuses the same ID.

export const adrenalineElement: Element = {
  id: 'adrenaline',
  name: 'Adrenaline',
  color: 0xffbb22,
  emoji: '⚡️',
  abilities: [goldenShot, dash, skateToggle, selfInject, styledOn, ramp, trick, wallTeleport, rush],
};

/** SK8-mode HUD display order: Click=Rush, E=Ramp, R=Exit, F=Trick, Q=Wall Teleport */
export const adrenalineSkateAbilities: Ability[] = [rush, ramp, skateExit, trick, wallTeleport];
