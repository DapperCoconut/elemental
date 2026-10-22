import type { SkinDef } from '../Skins';
import { MYTH } from '../../elements/kits/MythVisuals';

/**
 * Doom — Myth as the demon-hunting marine. The void-and-starlight palette is burnt into
 * hellfire: the void becomes scorched iron-black, the violet family becomes blood and ember,
 * starlight becomes a hot bone-white, and the one cyan in the kit (the Echo Shards) becomes
 * the one toxic green, so a shard still reads from across the arena. Luminance order is kept
 * key-for-key against `MYTH`.
 */
const DOOM_PALETTE: Record<number, number> = {
  [MYTH.void]: 0x080303,       // the void → scorched iron-black
  [MYTH.deep]: 0x1a0805,       // deep → charred rust
  [MYTH.dusk]: 0x2e0f08,       // dusk → hell-rock
  [MYTH.violet]: 0x6b1208,     // violet rim → dried blood
  [MYTH.iris]: 0xd7300f,       // iris (the element's hue) → hellfire red
  [MYTH.haze]: 0xff7a2e,       // haze → ember orange
  [MYTH.star]: 0xfff0c8,       // starlight → bone-white heat
  [MYTH.starBlue]: 0x9bff6a,   // blue stars → toxic green sparks
  [MYTH.white]: 0xffffff,      // white → white
  [MYTH.blade]: 0x1a0606,      // blade → the Crucible's black hilt-iron
  [MYTH.bladeEdge]: 0xff3a1a,  // blade edge → red energy edge
  [MYTH.gold]: 0xffb43a,       // gold → molten brass
  [MYTH.eye]: 0xff5a1a,        // the hilt's eye → a burning core
  [MYTH.pupil]: 0x200402,      // pupil → soot
  [MYTH.red]: 0xff2a10,        // red → arterial red
  [MYTH.mace]: 0xffe0b0,       // star mace → white-hot iron
  [MYTH.shard]: 0x7dff4a,      // Echo Shards → toxic green (the only green)
  [MYTH.shardDeep]: 0x2a9a1c,  // shard shadow → deep slime green
  [MYTH.crowdDark]: 0x2a0d08,  // crowd shadow → demon hide
  [MYTH.crowdLit]: 0x6e2414,   // crowd lit → lit demon hide
  [MYTH.crowdHot]: 0xff9a5a,   // crowd cheering → furnace glow
  [MYTH.cloud]: 0x15300c,      // rocket cloud → BFG green fog
  [MYTH.gunDark]: 0x1c1a18,    // gun metal dark → gunmetal
  [MYTH.gunMid]: 0x3c3934,     // gun metal mid → worn steel
  [MYTH.gunLight]: 0x7a746a,   // gun metal light → bright steel edge
};

export const DOOM_SKIN: SkinDef = {
  id: 'doom',
  name: 'Doom',
  description: 'Rip and tear — the marine himself, with demon-slaying guns and the Crucible in place of Excalibur.',
  elementId: 'myth',
  avatar: 'doom',
  bodyTint: [0x3f6a2c, 0x1f3a16],
  palette: DOOM_PALETTE,
  paletteFallback: 0xd7300f,
};
