import type { SkinDef } from '../Skins';

/**
 * Anomaly (Dream): Captain Clark in a hazmat suit and tricorn. Dream's violet night sky becomes
 * containment yellow over a sickly olive dark; the red of a nightmare stays red. Keys mirror
 * `DRM` in `DreamVisuals.ts` (and `DREAM_ORB`), darkest to brightest preserved. Dream spawns
 * no `proj-*` sprites, so there is no projectile tint.
 */
const ANOMALY_PALETTE: Record<number, number> = {
  0x0b0620: 0x0d0c05, // night → near-black olive
  0x1b1145: 0x2a2610, // deep → dark khaki
  0x5b3fd4: 0x8a7418, // violet → ochre
  0x8b5cf6: 0xc9a41c, // purple → mustard
  0x4f7dff: 0xb89a22, // blue → amber-khaki
  0x9fb8ff: 0xe8c22a, // sky (element colour) → hazmat yellow
  0xd8e2ff: 0xf4e7a0, // pale → pale cream-yellow
  0xffffff: 0xfffdf0, // white → fluorescent white
  0xfff4c2: 0xfff6c8, // star → tube-light glow
  0xf4f1e8: 0xefe8cc, // wool → stained cream
  0xc9c3b4: 0xbdb38e, // woolShade → damp beige
  0x3a3350: 0x33301c, // hoof → dark olive
  0x8a6b4a: 0x8a7a44, // fence / bark → old wood khaki
  0x54402c: 0x524622, // fenceDark / barkDark → dark wood
  0xbfd0ff: 0xe0d48a, // pillow → yellowed pillow
  0x6d86d8: 0xa08a3a, // pillowDeep → pillow shade
  0xa87b52: 0x9c8040, // hoop → tarnished brass
  0xe8ecff: 0xf1ecc8, // web → pale thread
  0xff3b6b: 0xff3b2e, // dread → alarm red
  0x6b0f26: 0x6b120c, // dreadDeep → dried blood
  0xe8a9c6: 0xe8c98e, // dusk → nicotine haze
  0x74d18c: 0xb5c25a, // grass → sick green
  0x2f8a58: 0x6e7a2c, // grassDark → mould green
  0x1a5b3c: 0x414a1a, // grassDeep → deep mould
  0x3a5590: 0x5a5530, // hillFar → hazed olive
  0x5fbf7d: 0xa8b04c, // leaf → yellow-green
  0x27714b: 0x5e6626, // leafDark → dark moss
  0xffb3dd: 0xf2d27a, // bloom → pale mustard
  0xffe08a: 0xffe48a, // bloomWarm → warm yellow
  0x6f6a90: 0x7a7050, // rock → concrete
  0x3b365e: 0x3e3a22, // rockDark → wet concrete
  0x3fc7d6: 0xc8c85a, // water → stagnant yellow-green
  0x136a78: 0x5c5c22, // waterDeep → murky
  0xf2fbff: 0xfaf6dc, // foam → cream foam
  0xbfe8f5: 0xe6e0aa, // mist → yellow haze
  0xffd98a: 0xffd84a, // sun / wish → hazard gold
  0xe4f1ff: 0xf0ecd0, // spirit → pale ectoplasm
  0x7f9fd8: 0xa89a58, // spiritDeep → dim khaki
  0xff2d4a: 0xff2d24, // haunt → red
  0x6b0512: 0x6b0a06, // hauntDeep → dark red
  0x8a6a1f: 0x8a6a10, // wishDeep → deep gold
  0xf0d48a: 0xf2dc6a, // sand → spore yellow
  0xa8833f: 0xa88a2a, // sandDeep → spore shade
  0xd7b25a: 0xd4b23a, // brass → brass
  0x2c2547: 0x23251f, // gunMetal → black rubber
  0x7d6fd0: 0x9c9a7a, // gunEdge → steel
  0x7b4dff: 0xc8a820, // pistol → hazard yellow
  0x2d1673: 0x4a3c0c, // pistolDeep → dark mustard
  0xe6eeff: 0xf0eedc, // blade → scalpel white
  0x8090c8: 0x9a9a80, // bladeDeep → steel shade
  0xff3d7a: 0xff4a2a, // claw → red-orange
  0x7a0f3a: 0x7a1a0c, // clawDeep → dark red
  0x43204f: 0x1a1a10, // leech → black
  0xb04a86: 0x9a3a1a, // leechBelly → raw red-brown
  0xfff0f6: 0xfff6e8, // leechTooth → bone
  0xb48cff: 0xe0cc5a, // dreamMist → fluorescent haze
  0x4a2a9a: 0x5a4a14, // dreamMistDeep → dirty yellow-brown
  0x5cf29a: 0xc8e04a, // DREAM_ORB.good → spore green
  0x1d8a52: 0x6a7a1c, // DREAM_ORB.goodDeep → mould
  0xff3b55: 0xff3b2a, // DREAM_ORB.bad → red
  0x7a0a1e: 0x7a0e08, // DREAM_ORB.badDeep → dark red
};

export const ANOMALY_SKIN: SkinDef = {
  id: 'anomaly',
  name: 'Anomaly',
  description: 'Captain Clark in a hazmat suit and tricorn. His dreams are always the Backrooms, and inside them he is the thing that lives there.',
  elementId: 'dream',
  avatar: 'anomaly',
  bodyTint: [0xe8c22a, 0xa88412],
  palette: ANOMALY_PALETTE,
  paletteFallback: 0xc9a41c,
};
