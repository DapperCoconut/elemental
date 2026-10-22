import type { SkinDef } from '../Skins';

/**
 * Pirate: Rubber's pink gum pushed onto a straw-hat captain's colours — vest red where the gum
 * was, straw and sun-tanned skin where it was lit, Armament-black where it cured, and the open
 * sea where the superball was blue. Keys are every value of the frozen `RUBBER` const in
 * `RubberVisuals.ts`, darkest to brightest within each group, so layered shading survives.
 */
const PIRATE_PALETTE: Record<number, number> = {
  // ── raw gum → vest red, straw and skin ──
  0x330011: 0x2a1408, // gum      → tarred deck brown (backings, shadows)
  0x992233: 0x7e1c14, // maroon   → vest-red shadow
  0xff5577: 0xd8342a, // rose     → vest red (the main body colour)
  0xff77aa: 0xe8774c, // blush    → sun-warm red-orange
  0xffaacc: 0xf0c27a, // pink     → straw
  0xffddee: 0xfbe7b4, // cream    → pale straw gloss
  0xffffff: 0xfffaf0, // white    → sail-cloth white
  // ── Vulcanization → Armament black ──
  0x1a0d12: 0x121018, // cured    → haki black
  0x2e1a20: 0x2a2434, // soot     → haki sheen
  // ── heat → Red Hawk fire ──
  0xff4400: 0xff4f14, // ember    → hawk ember
  0xff7733: 0xff8a36, // flame    → hawk flame
  0xffcc66: 0xffd47a, // gold     → treasure gold
  0xffdd00: 0xffe23a, // charge   → doubloon flash
  // ── Bouncy Anchor superball → the open sea ──
  0x1e5fd0: 0x1d4f96, // deepBlue → deep sea
  0x66aaff: 0x5aa2dc, // sky      → open water
  0x88ccff: 0x9cd4ee, // ice      → sea foam
  0x1a2a6a: 0x14264c, // navy     → night sea
  0x5588ff: 0x4a7ccc, // cobalt   → wave crest
  // ── Atom-Nhilego → Gear-Five cloud lavender ──
  0x2a1044: 0x261a3c, // voidPurple → storm cloud
  0xaa55ff: 0x9a82d8, // amethyst   → dusk cloud
  0xcc88ff: 0xd8ccf2, // orchid     → white cloud
};

export const PIRATE_SKIN: SkinDef = {
  id: 'pirate',
  name: 'Pirate',
  description: 'A rubber pirate in a straw hat — gum-gum punches, a hat on the line, and a grin to win any fight.',
  elementId: 'rubber',
  avatar: 'pirate',
  bodyTint: [0xd8342a, 0x7e1c14],
  // Rubber spawns no `proj-*` sprite: every punch, ball and band is drawn Graphics, so the
  // palette above (plus the bespoke art in PirateFx) is the whole recolour.
  palette: PIRATE_PALETTE,
  paletteFallback: 0xd8342a,
};
