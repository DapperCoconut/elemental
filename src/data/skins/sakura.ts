import type { SkinDef } from '../Skins';

/**
 * Sakura: air's whole palette walked off cold grey-blue and onto cherry blossom. Keys are the
 * exact values of the AIR palette in AirVisuals.ts, ordering preserved rung for rung — the
 * storm-dark bottom end becomes the plum of a ninja's garb in shadow, the white-hot top end
 * becomes the near-white heart of a petal — so every layered effect keeps its shading.
 */
const SAKURA_PALETTE: Record<number, number> = {
  0x24303c: 0x2a1420, // void — night plum, the garb in shadow
  0x445668: 0x4a2636, // slate — dark wine
  0x6688aa: 0x8a4a66, // storm — mauve rose
  0x88aacc: 0xc0708f, // steel — dusty rose, the soft envelope round a petal stream
  0x88ccff: 0xe88aaf, // blue — sakura pink
  0xaaddff: 0xf4a6c4, // sky — petal pink, the body of every stream
  0xbbe8ff: 0xf8bcd3, // cyan — light petal
  0xccddff: 0xfbcfe0, // frost — blush
  0xe4f2ff: 0xffe4ee, // mist — petal white
  0xffffff: 0xfff6f9, // white — the pale heart of a blossom
  0xffee44: 0xffd45a, // charge — stamen gold, the one warm colour
  0xfff7bb: 0xfff0c0, // bolt — pollen
  0xb4854a: 0x8a5040, // wood — cherry bark
  0x6a4a26: 0x4a2a22, // woodDark — bark in shadow
  0xffd2e4: 0xff9ec4, // blossom — the mastery's petals, deepened to full bloom
};

export const SAKURA_SKIN: SkinDef = {
  id: 'sakura',
  name: 'Sakura',
  description: 'A ninja clad in cherry-blossom petals — every gust a stream of falling sakura. A true sakura-hearted warrior.',
  elementId: 'air',
  avatar: 'sakura',
  bodyTint: [0x6a3048, 0x2a1420],
  // Air is entirely hitscan and Graphics — it spawns no `proj-*` sprite at all, so the
  // palette above (plus the bespoke petal art in SakuraFx) is the whole recolour.
  palette: SAKURA_PALETTE,
  paletteFallback: 0xf4a6c4,
};
