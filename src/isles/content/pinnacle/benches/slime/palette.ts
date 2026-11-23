import type { Fighter } from '../../../../../entities/Fighter';
import { BENCHES } from '../../spec';

/**
 * The Venom Bench's one family of colour — Fangmire's green — and the small helpers its six
 * decrees share. The room is black glass like every bench; the green only ever appears as light
 * (the Draught glowing in the alembic, the mist), as inlay (the names on the Register) and as
 * things trapped inside the glass (the fen under the floor).
 */

export const B = BENCHES.find((x) => x.isle === 'slime')!;

/** The Draught: the bright venom-green of the bench. */
export const VEN = 0x9be04a;
/** The green at its brightest — a drip catching light, a hot vent. */
export const VEN_LIT = 0xdcff9a;
/** The green in shadow — deep liquid, the fen under glass. */
export const VEN_DEEP = 0x2f5a16;
/** The green almost lost in the black — mist at its thinnest, old inlay. */
export const VEN_DARK = 0x16280c;
/** The fen water itself, under the glass: black with a green cast. */
export const FEN = 0x08120a;
/** The mist that lies on the floor. */
export const MIST = 0x6aa84a;

export const VEN_CSS = '#9be04a';
export const VEN_LIT_CSS = '#dcff9a';
export const VIOLET_CSS = '#c9b0ff';
export const STAR_CSS = '#ffe9b0';

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** Frame step in seconds, clamped so a hitch never teleports anything. */
export const stepOf = (dt: number): number => clamp(dt, 0, 0.05);
/** Smallest signed difference between two angles. */
export const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
