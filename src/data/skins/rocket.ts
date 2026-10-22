import type { SkinDef } from '../Skins';

/**
 * Tempest's `TMP` palette remapped from storm to fire: every gust, current and front the kit
 * draws turns to flame, smoke and scorched steel. Luminance order is kept — the storm's inkiest
 * blue is scorch black, its white wind is white-hot flame.
 */
const ROCKET_PALETTE: Record<number, number> = {
  0x0b1020: 0x140805, // ink → scorch black
  0x1f2a44: 0x3a1408, // deep → char
  0x33456b: 0x5a2410, // slate → dark ember
  0x4f6d99: 0xa83a12, // storm → burnt orange
  0x7fb4ff: 0xff6a1a, // sky → flame orange
  0xc9e3ff: 0xffb347, // gust → amber flame
  0xf4f9ff: 0xfff2c8, // white → white-hot
  0xfff3a6: 0xfff07a, // bolt → spark yellow
  0xffffff: 0xffffff, // boltHot → white
  0x36d6ff: 0xff8c2a, // iris → orange iris
  0x0d6f99: 0x9a2a08, // irisDeep → deep ember
  0x050a14: 0x0a0402, // pupil → soot
  0x04060d: 0x080404, // shadow → scorch shadow
  0x8794a8: 0x8a8580, // dust → exhaust smoke
  0xff4a3d: 0xff2a1a, // red → warning red
  0xc4ecff: 0xdfe4ea, // ice → hull plate
  0x5aa6d6: 0x7d8894, // iceDeep → steel
  0x2a3552: 0x3a3532, // cloud → smoke cloud
  0x6a7fa8: 0x8a7f74, // cloudLit → lit smoke
  0x8fb4e8: 0xffa04a, // rain → ember rain
  0x2c4e86: 0x7a2a0c, // puddle → molten pool
};

export const ROCKET_SKIN: SkinDef = {
  id: 'rocket',
  name: 'Rocket',
  description: 'Ready for lift-off — an astronaut riding flame instead of wind, with launch pads for updrafts.',
  elementId: 'tempest',
  avatar: 'rocket',
  // Tempest is bodyless, so this repaint only matters if a mode ever hands it a sprite.
  bodyTint: [0xeef1f4, 0xb9c1cb],
  palette: ROCKET_PALETTE,
  paletteFallback: 0xff8a2a,
};
