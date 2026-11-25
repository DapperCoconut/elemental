import type { CourtUnrest, QuestState, WorldProgress } from '../IslesSave';
import type { IslesFightPayload } from '../IslesTypes';

/**
 * Everything Ten Isles co-op says over the wire. One envelope (`{ t: 'isles', m }`) so the room's
 * existing plumbing needs no new relay rules: guests speak to the host, and the host tells everyone.
 * Types only — this file must stay import-free of runtime code (the network layer imports it).
 */

/** The host's world, as a guest needs it to see the same isles: everything `Cond`s read. */
export interface WorldSnap {
  encounters: string[];
  princes: string[];
  monarchs: string[];
  quests: Record<string, QuestState>;
  flags: string[];
  unrest: Record<string, CourtUnrest>;
  unrestClock: number;
  hard: boolean;
  shelf: WorldProgress;
  chests: string[];
  waystones: string[];
}

/** One walker in the party, as the host tells it. */
export interface PartyWalker {
  slot: number;
  name: string;
  element: string;
  area: string;
  x: number;
  y: number;
  /** Facing (radians) and whether they are walking. */
  f: number;
  m: boolean;
  /** In a fight, at sea or in a menu: drawn waiting rather than walking. */
  busy?: 'fight' | 'sea';
}

/** One fighter in the arena, as the host tells it. */
export interface PartyFighter {
  slot: number;
  x: number;
  y: number;
  hp: number;
  mx: number;
  down: boolean;
}

/** A fight to start: enough for every machine to launch the same one with its own fighter. */
export interface FightCall {
  kind: IslesFightPayload['kind'];
  id: string;
  court?: string;
  foeElement: string;
  difficulty: number;
  /** How many are going in — sets how much the foe can take. */
  n: number;
  /** One number for everybody's rule to roll from. */
  seed: number;
}

export type IslesMsg =
  // Guest → host: I am here (sent on arriving in the world, and again whenever I come back to it).
  | { k: 'hello'; name: string; element: string }
  // Host → guests: the world as it stands, and the area the party is in.
  | { k: 'world'; snap: WorldSnap; area: string; isle: string }
  // Anyone → host (10 Hz): where I am walking.
  | { k: 'pos'; area: string; x: number; y: number; f: number; m: boolean; busy?: 'fight' | 'sea' }
  // Host → guests (10 Hz): everyone.
  | { k: 'party'; p: PartyWalker[] }
  // Guest → host: I walked through this exit / touched this waystone — lead us there.
  // Host → guests: we are going.
  | { k: 'goto'; area: string; arriveFrom?: string; x?: number; y?: number }
  // Guest → host: I challenged this one. Host → guests: fight.
  | { k: 'fight'; call: FightCall }
  // Host → guests: the host has put to sea; wait on the quay.
  | { k: 'sea'; dest: string }
  // ── In the arena ──
  // Anyone → host (12 Hz): my fighter.
  | { k: 'f-pos'; x: number; y: number; hp: number; mx: number; down: boolean }
  // Host → guests (12 Hz): every fighter, and the foe — its health (the truth), how many times that
  // health has run out (a boss's phases), and where its body is.
  | { k: 'f-all'; p: PartyFighter[]; hp: number; mx: number; n: number; x: number; y: number }
  // Guest → host: damage my blows did to the foe since I last said.
  | { k: 'f-dmg'; a: number }
  // Host → guests: it is over.
  | { k: 'f-end'; won: boolean }
  // Anyone → everyone: I am going down and nobody is left standing.
  | { k: 'f-wipe' };
