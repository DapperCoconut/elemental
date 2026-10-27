/**
 * The Inkwell Court's colours — black, white and ONE blue.
 *
 * The court is drawn the way the Ink element is drawn: a toon in pure ink on paper, thick black
 * outlines over white fills, shading done with hatching rather than tone. The only colour in
 * the whole town is the Queen's blue — the blue of her seal, of the rule-lines on every page the
 * scriptorium prints, of the glow in the censors' reading lamps. Every file in the court draws
 * from this one table, so a blue thing anywhere in the Inkwell means "the crown is here".
 */

/** Ink, from the canal's dead black to the soft black of a wet line drying. */
export const INK = 0x0e0e12;
export const INK_SOFT = 0x24242b;
export const INK_LIT = 0x44444d;

/** Greys — only ever as hatching or wash, never as a fill of their own. */
export const GREY = 0x7d7a72;
export const GREY_LIT = 0xb4b0a6;

/** Paper: the streets, the walls, the decrees. Slightly warm, like rag-paper. */
export const PAPER = 0xf2eee3;
export const PAPER_SHADE = 0xd8d2c3;
export const PAPER_DEEP = 0xb9b2a1;
export const WHITE = 0xffffff;

/** The one blue: the Queen's seal-blue, deep and lit. */
export const BLUE = 0x2b5cff;
export const BLUE_DEEP = 0x13297a;
export const BLUE_LIT = 0x93b0ff;
export const BLUE_WASH = 0xcad8ff;

/** Court accent — the blue the HUD and the map use. */
export const INKWELL_ACCENT = BLUE;

/** CSS strings for floating text. */
export const CSS_INK = '#111116';
export const CSS_PAPER = '#f2eee3';
export const CSS_BLUE = '#5b84ff';
export const CSS_BLUE_LIT = '#b8ccff';
