import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Myth — the ultimate element. A test element, reachable only from a cheat-mode save for now.
 *
 * A black void pricked with stars, holding Excalibur behind its back. A crowd rings the arena
 * and pays out **Echo Shards** for a good show: every ability can be recast with a shard for a
 * stronger second act (right-click for the whip), as many times as there are shards to spend.
 * Truth Breaker is **true damage** — nothing on the other side can block it. The ultimate drops
 * you into a first-person view for fifteen seconds with five guns on the five keys.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in MythKit.
 */

const cosmicWhip: Ability = {
  id: 'myth-whip',
  name: 'Cosmic Whip',
  description: 'Lash a 180px whip along your aim: 12 damage to everyone it crosses. The star mace at the very tip (last 36px) does 24 instead and stuns 0.6s. Right-click spends an Echo Shard: for 8 seconds every lash leaves a phantom mace circling where the tip landed.',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx: CastContext) { ctx.mythWhip(ctx.targetX, ctx.targetY); },
};

const truthBreaker: Ability = {
  id: 'myth-truth',
  name: 'Truth Breaker',
  description: 'Slash Excalibur through a 150px arc in front of you for 22 TRUE damage: no shield, armour, absorber, dodge or extra health can stop it. Recast within 3s with an Echo Shard to dash 240px and cut everyone you pass for 32 more true damage — again and again while the shards last.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.mythTruth(ctx.targetX, ctx.targetY); },
};

// Id kept from the Determination era (2026-10-15) so saves, relays and the codex keys stay put.
const parry: Ability = {
  id: 'myth-determination',
  name: 'Parry',
  description: 'Hold Excalibur out for 0.5s. The next hit in that time is turned aside: whoever dealt it is stunned for 2 seconds and you turn Indomitable for 8 — stuns and slows do nothing to you. R again with an Echo Shard after a parry lands to slash that foe for 35 true damage.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.mythDetermination(); },
};

const beastOfMyth: Ability = {
  id: 'myth-beast',
  name: 'Beast of Myth',
  description: 'A portal opens behind you and a beast pours out of it toward your cursor, grabbing everyone in its path and gnawing them for 8 every half second until it hits a wall. If it runs through you, you flip over it for 20% speed for 4s. Recast with an Echo Shard to call it back to its portal, dragging its catch with it — and flip again on the way past.',
  displayKey: 'F',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.mythBeast(ctx.targetX, ctx.targetY); },
};

const finalDestiny: Ability = {
  id: 'myth-destiny',
  name: 'Final Destiny',
  description: 'See the fight through your own eyes for 15 seconds: the arena in first person, with a pistol, a shotgun, grenades, a hunter rifle and a shadow rocket on the five keys. The mouse turns the camera and the crosshair stays in the centre; WASD walks where you look.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.mythDestiny(ctx.targetX, ctx.targetY); },
};

// ── Final Destiny: the five guns. Live only in first person; the same keys, re-armed. ──

const pistol: Ability = {
  id: 'myth-pistol',
  name: 'Pistol',
  description: 'A quick shot for 8. Every hit leaves the target 5% more vulnerable to all damage for 5s, up to 4 stacks.',
  displayKey: 'Click',
  cooldown: 360,
  cast(ctx: CastContext) { ctx.mythPistol(ctx.targetX, ctx.targetY); },
};

const shotgun: Ability = {
  id: 'myth-shotgun',
  name: 'Shotgun',
  description: 'Seven pellets in a tight cone, 6 each out to 200px. Vulnerability counts double against it: a 15% vulnerable target takes 30% more.',
  displayKey: 'E',
  cooldown: 2200,
  cast(ctx: CastContext) { ctx.mythShotgun(ctx.targetX, ctx.targetY); },
};

const grenades: Ability = {
  id: 'myth-grenades',
  name: 'Grenade Barrage',
  description: 'Three grenades lobbed in a cone. Each bursts where it lands for 14 in a 72px blast; a target caught by two takes +25% from the second, by three +50% from the third.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.mythGrenades(ctx.targetX, ctx.targetY); },
};

const hunterRifle: Ability = {
  id: 'myth-rifle',
  name: 'Hunter Rifle',
  description: 'One piercing round down your aim for 26 to everyone on the line. Pass within 9px of a body\'s centre and it is a headshot: 1.5x, 39.',
  displayKey: 'F',
  cooldown: 4500,
  cast(ctx: CastContext) { ctx.mythRifle(ctx.targetX, ctx.targetY); },
};

const shadowRocket: Ability = {
  id: 'myth-rocket',
  name: 'Shadow Rocket of Doom',
  description: 'A slow rocket (190 px/s) that bursts for 30 in a 150px blast, +20 to anyone it hits directly, and leaves a 110px cloud doing 5 a second for 5s.',
  displayKey: 'Q',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.mythRocket(ctx.targetX, ctx.targetY); },
};

export const mythElement: Element = {
  id: 'myth',
  name: 'Myth',
  color: 0x7d5cff,
  emoji: '🌠',
  // The first five are the tray. 5–9 are the Final Destiny guns: kept in the array so
  // `castAbility` owns their cooldowns, sounds and online relay like any other ability.
  abilities: [cosmicWhip, truthBreaker, parry, beastOfMyth, finalDestiny, pistol, shotgun, grenades, hunterRifle, shadowRocket],
};
