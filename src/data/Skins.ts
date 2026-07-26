import * as PlayerData from './PlayerData';
import { getAchievementDef } from './Achievements';

/**
 * A **skin** is one element's alternate look. Two halves, and only two:
 *
 * 1. **A different character.** The skin names an avatar rig (see `SkinAvatars.ts`) that is
 *    built in place of the element's default one, so the fighter is visibly a different
 *    creature — with its own unmastered and mastered forms, same as any element rig.
 * 2. **A recolour of everything they throw.** Abilities keep their exact shapes; only the
 *    palette changes. A skin never costs readability in a fight, and adding one never means
 *    redrawing an ability.
 *
 * One skin slot per element. Skins unlock with achievements and are equipped from the
 * MenuScene customize screen. The equipped id rides the online handshake, so a remote
 * opponent's skin renders locally too.
 */
export interface SkinDef {
  id: string;
  name: string;
  description: string;
  elementId: string;
  /** Achievement that unlocks this skin. */
  achievementId: string;
  /**
   * Key this skin's replacement character rig is registered under in `SkinAvatars.ts`.
   * A skin without one keeps the element's default rig and is a recolour only.
   */
  avatar?: string;
  /**
   * Flat repaint of the fighter sprite, `[top, bottom]`. The default sprite is a ball of
   * raw element, so a skin that draws a whole new body over it repaints it to match —
   * anything that peeks past the new silhouette then reads as part of the new character.
   */
  bodyTint?: [number, number];
  /** Flat repaint of this element's projectile sprites, `[top, bottom]`. */
  projectileTint?: [number, number];
  /** Texture keys `projectileTint` applies to. Empty/absent means every projectile. */
  projectileTextures?: string[];
  /** Palette remap for the element's drawn effects: base palette colour → skin colour. */
  palette?: Record<number, number>;
  /** Stand-in for palette entries the table above doesn't cover. */
  paletteFallback?: number;
}

/**
 * Candle: fire's whole palette pushed off orange and into candle-flame violet. Keys are the
 * exact values of the FIRE palette in FireVisuals.ts — an off-palette orange drawn anywhere
 * in fire's visuals would miss this table and stay orange, which is why that palette is
 * closed.
 */
const CANDLE_PALETTE: Record<number, number> = {
  0x991100: 0x2b0b45, // ember
  0xcc1100: 0x420f6b, // deep
  0xff2200: 0x5c17a0, // red
  0xff4400: 0x6f1fc4, // core
  0xff5500: 0x8228e0, // mid
  0xff6600: 0x9333ea, // orange
  0xff8800: 0xa855f7, // amber
  0xff9900: 0xb972ff, // gold
  0xffdd33: 0xd7a5ff, // yellow
  0xffff99: 0xecd4ff, // pale
  0xffffff: 0xfaf1ff, // white
};

/**
 * Coral: water's whole palette rotated off blue and onto reef pink. Keys are the exact values
 * of the WATER palette in WaterVisuals.ts, and the ordering is preserved rung for rung —
 * abyss-blue becomes the deepest plum, white-foam becomes the palest blush — so every layered
 * water effect keeps the internal shading it was drawn with.
 */
const CORAL_PALETTE: Record<number, number> = {
  0x00224d: 0x3d0a2a, // abyss
  0x00468c: 0x6e1240, // deep
  0x0066bb: 0x9c1c55, // ocean
  0x0088dd: 0xc42a6a, // blue
  0x22aaee: 0xe8437d, // bright
  0x55ccff: 0xff6b9d, // cyan
  0x88ddff: 0xff8fb4, // sky
  0xbbeeff: 0xffb8cf, // foam
  0xddf6ff: 0xffdce8, // pale
  0xffffff: 0xfff2f7, // white
};

/**
 * Sand: air's whole palette walked off cold grey-blue and onto dune. Keys are the exact values
 * of the AIR palette in AirVisuals.ts, ordering preserved rung for rung — the storm-dark bottom
 * end becomes wet sand in shadow, the white-hot top end becomes sun-bleached grit — so every
 * layered curl keeps the internal shading it was drawn with.
 */
const SAND_PALETTE: Record<number, number> = {
  0x24303c: 0x2a1d0e, // void
  0x445668: 0x4a3418, // slate
  0x6688aa: 0x7a5a2a, // storm
  0x88aacc: 0xa07c3e, // steel
  0x88ccff: 0xc79a52, // blue
  0xaaddff: 0xd9b370, // sky
  0xbbe8ff: 0xe3c48a, // cyan
  0xccddff: 0xead4a4, // frost
  0xe4f2ff: 0xf5e7c4, // mist
  0xffffff: 0xfff8e6, // white
  0xffee44: 0xffd24a, // charge — already warm, pushed to amber
  0xfff7bb: 0xffeeb8, // bolt
};

/**
 * Wither: life's palette drained to grave-dirt and ash. Keys are the exact values of the LIFE
 * palette in LifeVisuals.ts. Note the six seed accents all collapse toward the same dead greys —
 * a wilted garden should not still be colour-coded by species — but each keeps a trace of its
 * original hue so a Rose and a Nightcap are still telling themselves apart at close range.
 */
const WITHER_PALETTE: Record<number, number> = {
  0x2a1d12: 0x0a0908, // soil
  0x6b4a2a: 0x2e2622, // bark
  0x1d4718: 0x121110, // shade
  0x2d6b28: 0x1c1a18, // deep
  0x44aa3a: 0x33302c, // stem
  0x5ec44a: 0x45403a, // leaf
  0x8fdd5a: 0x5e574e, // lime
  0xc8f59a: 0x8f877a, // pale
  0xe8ffd0: 0xc9c0ad, // glow
  0xffffff: 0xe8e2d6, // white — bone, not paper
  0xffe98a: 0x8c8270, // pollen
  0x7a5a2a: 0x3a3128, // rot
  0x14300f: 0x080706, // ink
  0x44ff88: 0x6f6a5e, // vital
  0xff88aa: 0x6b5f5c, // blossom
  0x7a9c3e: 0x4a463c, // thorn
  0xffcc22: 0x7e7350, // sun
  0xdd3366: 0x4b2c30, // rose
  0x88ffcc: 0x7d8a83, // lily
  0x8844cc: 0x3c3442, // night
  0x55aa44: 0x3f3d36, // pitcher
  0xeeeeff: 0xbdb8ae, // cotton
};

/**
 * Roaring: metal's palette collapsed to a black silhouette with a white rim, after the Roaring
 * Knight. Keys are the exact values of the METAL palette in MetalVisuals.ts. The steel ramp
 * becomes black → white so `bladeShardLayered`'s honed-edge pass reads as the Knight's outline;
 * the blood ramp becomes a colder second greyscale so blood and steel stay distinguishable
 * without either of them being red.
 */
const ROARING_PALETTE: Record<number, number> = {
  0x0d0a0c: 0x000000, // shadow
  0x2b2228: 0x080810, // char
  0x5c6672: 0x161620, // iron
  0x8fa0b0: 0x3a3a4e, // steel
  0xc9d6e2: 0x8e8ea8, // chrome
  0xffffff: 0xffffff, // white — the outline, kept
  0x3a0008: 0x050509, // clot
  0x660011: 0x0e0e16, // gore
  0x990018: 0x1c1c28, // blood
  0xcc0022: 0x33334a, // crimson
  0xff3355: 0x6b6b8a, // rose
  0xff8899: 0xa8a8c4, // blush
  0xff6600: 0x22223a, // ember
  0xffaa33: 0x4a4a68, // flame
  0xffdd44: 0x8a8aa8, // gold
  0xffee88: 0xd0d0e4, // goldHi
  0x6b4a2b: 0x101018, // leather
  0xd9b25a: 0x585874, // brass
};

/**
 * Angelic: shadow's palette rotated off void-violet and onto gilt. Keys are the exact values of
 * the SHADOW palette in ShadowVisuals.ts, ordering preserved rung for rung — the abyss becomes
 * old bronze, the white core stays white — so a tendril still shades from dark root to lit rim,
 * only now it reads as beaten gold instead of a hole in the world.
 */
const ANGELIC_PALETTE: Record<number, number> = {
  0x08000f: 0x2a1a05, // abyss
  0x120020: 0x3d2708, // pitch
  0x1e0033: 0x55380c, // umbra
  0x330055: 0x744d10, // violet
  0x4a1170: 0x96661a, // plum
  0x6600aa: 0xb98325, // orchid
  0x8800cc: 0xd9a333, // amethyst
  0xaa44ff: 0xf0c14a, // lilac
  0xcc88ff: 0xffd978, // mauve
  0xe6ccff: 0xfff0c2, // pale
  0xffffff: 0xffffff, // white
  0xcc2244: 0xffbb33, // blood — the warm note, hotter still
};

export const SKINS: SkinDef[] = [
  {
    id: 'candle',
    name: 'Candle',
    description: 'Become a living candle — pale wax, a lit wick, and fire that burns violet.',
    elementId: 'fire',
    achievementId: 'oops',
    avatar: 'candle',
    bodyTint: [0xfaeed2, 0xd0b485],
    projectileTint: [0xd7a5ff, 0x6f1fc4],
    projectileTextures: ['proj-fire'],
    palette: CANDLE_PALETTE,
    paletteFallback: 0x9333ea,
  },
  {
    id: 'coral',
    name: 'Coral',
    description: 'Become a living reef — branching coral, open polyps, and water that runs pink.',
    elementId: 'water',
    achievementId: 'great-drought',
    avatar: 'coral',
    bodyTint: [0xffb6c9, 0xc8517a],
    projectileTint: [0xff8fb4, 0xc42a6a],
    projectileTextures: ['proj-water', 'proj-pressure-dagger'],
    palette: CORAL_PALETTE,
    paletteFallback: 0xff6b9d,
  },
  {
    id: 'sand',
    name: 'Sand',
    description: 'Become a walking dune — packed grit, a scouring crown, and wind the colour of desert.',
    elementId: 'air',
    achievementId: 'sharpshooter',
    avatar: 'sand',
    bodyTint: [0xe3c48a, 0x7a5a2a],
    // Air is entirely hitscan and Graphics — it spawns no `proj-*` sprite at all, so the
    // palette above is the whole recolour.
    palette: SAND_PALETTE,
    paletteFallback: 0xc79a52,
  },
  {
    id: 'wither',
    name: 'Wither',
    description: 'Become a dead thing still standing — split bark, ash, and a garden that rotted.',
    elementId: 'life',
    achievementId: 'plants-vs-zombies',
    avatar: 'wither',
    bodyTint: [0x4a443c, 0x1a1714],
    projectileTint: [0x6a6156, 0x1c1a16],
    projectileTextures: ['proj-life', 'proj-sakura'],
    palette: WITHER_PALETTE,
    paletteFallback: 0x3a352e,
  },
  {
    id: 'roaring',
    name: 'Roaring',
    description: 'Become a black knight in white outline — antlers, a burning visor, and steel that leaves ghosts.',
    elementId: 'metal',
    achievementId: 'swoon',
    avatar: 'roaring',
    bodyTint: [0x1a1a26, 0x000000],
    // Metal's chain, flail and blades are all kit-drawn Graphics — no `proj-*` sprite exists.
    palette: ROARING_PALETTE,
    paletteFallback: 0x14141c,
  },
  {
    id: 'angelic',
    name: 'Angelic',
    description: 'Become something divine — robes, a halo, a wheel of eyes, and darkness that burns gold.',
    elementId: 'shadow',
    achievementId: 'unkillable',
    avatar: 'angelic',
    bodyTint: [0xfff3d0, 0xc9962e],
    // Shadow's bombs, pools and tendrils are all kit-drawn Graphics — no `proj-*` sprite exists.
    palette: ANGELIC_PALETTE,
    paletteFallback: 0xd9a333,
  },
];

export function getSkinDef(id: string | null | undefined): SkinDef | undefined {
  if (!id) return undefined;
  return SKINS.find((s) => s.id === id);
}

export function getSkinsForElement(elementId: string): SkinDef[] {
  return SKINS.filter((s) => s.elementId === elementId);
}

export function isSkinUnlocked(id: string): boolean {
  const def = getSkinDef(id);
  if (!def) return false;
  return PlayerData.isAchievementUnlocked(def.achievementId);
}

/** Achievement name shown on locked skin rows ("🔒 Oops"). */
export function skinUnlockHint(id: string): string {
  const def = getSkinDef(id);
  const ach = def ? getAchievementDef(def.achievementId) : undefined;
  return ach ? ach.name : '???';
}
