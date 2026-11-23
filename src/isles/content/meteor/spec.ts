/**
 * The meteor's fixed skeleton — ids every Fall builder and the engine share. Nothing here imports content.
 * Design: `docs/ten-isles/fall.md`.
 */

/** The area the second star came down on: a ring of fused glass standing out of the sea. */
export const FALLPOINT = 'fallpoint';
export const FALLPOINT_W = 1800;
export const FALLPOINT_H = 1400;
/** Where the Ferryman's skiff lands you (south shore) and where the star lies (the crater's heart). */
export const FALLPOINT_LANDING = { x: 900, y: 1240 };
export const METEOR_AT = { x: 900, y: 520 };
/** Emberport's pier end — where the skiff takes you back to. */
export const EMBERPORT_PIER = { x: 1300, y: 1390 };

/** One lock for every seat of the Council that wrote the law. */
export const METEOR_KEYS = 60;

export const CINE_METEOR = 'cine-meteor';
export const CINE_FALL = 'cine-fall';
export const CINE_FALL_END = 'cine-fall-end';
/** The artifact the Fallen King drops inside the Fall. */
export const FALLEN_ARTIFACT = 'art-fallen-star';

/** A Fallen champion's encounter id and its gimmick's id (they are the same string). */
export const fallenId = (court: string, slug: string): string => `fallen-${court}-${slug}`;
