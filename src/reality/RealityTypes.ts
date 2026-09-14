/**
 * Shared types and constants for the Reality dungeon and boss — the game's
 * hidden finale behind the crack on the title screen.
 *
 * The whole feature runs inside ArenaScene as a mode (like invasion): the
 * trials are full-screen rooms sequenced by `RealityDungeonKit`, and the boss
 * takes the `npc` slot the way the Disgraced King does. Everything here is
 * plain data so the scenes and kits can share it without importing each other.
 */
import type { TagTeamState } from '../data/FightFormats';

/** The scene payload ArenaScene reads to enter the dungeon. */
export interface RealityRunPayload {
  kind: 'trials' | 'boss';
  /**
   * Trials only. Deaths always restart at 0 — the value exists so the restart
   * payload is explicit rather than implied.
   */
  roomIdx?: number;
  /**
   * Trials only: the fifth room's mirror element, resolved at entry. The npc
   * is parked as the inert `reality` element until that room, so an enemy
   * like Fortune does not stand its shop up over four rooms of dungeon.
   */
  mirrorId?: string;
  /** Boss only — the roster-wide lives machinery. */
  tag?: TagTeamState;
}

/** Trial room indices, in walk order. The fountain is a room of its own. */
export const REALITY_ROOMS = {
  spikes: 0,
  traps: 1,
  husks: 2,
  puzzle: 3,
  duel: 4,
  fountain: 5,
} as const;

export const REALITY_ROOM_COUNT = 6;

/** The mysterious figure's line at each trial's threshold. */
export const ROOM_INTRO_LINES: Record<number, string> = {
  0: 'You are not supposed to be here.',
  1: 'I know what you have done.',
  2: 'Why did you kill him?',
  3: 'You say you wanted justice.',
  4: 'Well then, where is your justice?',
};

// ── Palette ───────────────────────────────────────────────────────────
// Reality is dark blue shot through with white glitch light; the dungeon
// under him is colder and dimmer than any arena in the game.

export const REALITY_BLUE = 0x2b4fd8;
export const REALITY_BLUE_DEEP = 0x101c4a;
export const REALITY_GLOW = 0x9fc2ff;
export const REALITY_WHITE = 0xf4f8ff;
export const CRACK_RED = 0xff2233;
export const DUNGEON_STONE = 0x14182a;
export const DUNGEON_STONE_LIT = 0x1f2540;
export const DUNGEON_LINE = 0x2c3560;
