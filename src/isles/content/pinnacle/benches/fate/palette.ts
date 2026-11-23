/**
 * The Lot Bench's one extra family of colour: Lotterhaven's gaming table — baize green and
 * roulette rouge, with ivory for pips and numbers. It is never painted over the room: it is the
 * light trapped inside the black glass (pips, inlays, the pockets of the Wheel), the felt under
 * the glass of the floor, the cloth of the auction block. Starlight (OBS.star) stays the only warm
 * light in the room — it shows where a seat has been emptied and the shell has cracked.
 */

/** Baize green, the casino's felt. */
export const FELT = 0x1f6b44;
export const FELT_LIT = 0x3fae6e;
export const FELT_GLOW = 0x7af2aa;
export const FELT_DEEP = 0x0c2f1e;

/** Roulette rouge. */
export const ROUGE = 0xb81c36;
export const ROUGE_LIT = 0xff5a72;
export const ROUGE_DEEP = 0x4a0814;

/** Pips, numerals, the face of a ticket. */
export const IVORY = 0xf2ead6;
export const IVORY_DIM = 0xb9ae94;

/** A Lot's brass, dulled under glass — used small (tokens, the drum's crank). */
export const BRASS = 0x9c7f45;
export const BRASS_DIM = 0x5a4626;

/** The bench's colour as the registry gives it — the slit of every mask on this bench. */
export const LOT_LILAC = 0xd9a8ff;

/** The player's side and the councilor's side in every decree: felt for you, rouge for the House. */
export const SIDE_PLAYER = FELT_GLOW;
export const SIDE_NPC = ROUGE_LIT;
export const CSS_PLAYER = '#7af2aa';
export const CSS_NPC = '#ff5a72';
export const CSS_LOT = '#e4c8ff';
