import { saveKey } from '../data/Cheats';
import type { Cond, Pt } from './IslesTypes';

/**
 * The Ten Isles save — three slots in one localStorage record, the campaign's old shape.
 *
 * Everything the world remembers lives on the slot: where you stood, what you own, which courts
 * are free, every quest stage. `test(cond)` answers the `Cond` queries content is written in,
 * so dialogue, exits and POIs never reach into this file's fields themselves.
 */

const BASE = 'elemental_isles';
const key = () => saveKey(BASE);

export interface QuestState {
  stage: number;
  done?: boolean;
  /** Counter for the current stage (fish landed, pickups taken). */
  n?: number;
  /** Pickup spot indices already taken this stage. */
  took?: number[];
}

export interface IslesSlot {
  v: 1;
  name: string;
  createdAt: number;
  /** The element you walk and fight as. */
  element: string;
  area: string;
  pos: Pt;
  coins: number;
  keys: number;
  orbs: number;
  encounters: string[];
  princes: string[];
  monarchs: string[];
  quests: Record<string, QuestState>;
  flags: string[];
  /** itemId → count. Charms, artifacts and rods are owned at 1. */
  inv: Record<string, number>;
  /** Equipped charms, at most `MAX_CHARMS`. */
  charms: string[];
  artifact: string | null;
  /** Eaten before the next fight; consumed by it. */
  meal: string | null;
  rod: string | null;
  fishLog: Record<string, { count: number; best: number }>;
  /** element → node → level. Mastery is stored as `<node>*` = 1. */
  genes: Record<string, Record<string, number>>;
  boat: { owned: string | null; upgrades: Record<string, number>; ubers: string[]; uber: string | null };
  wastesBest: number;
  /** Areas whose waystone has been touched — fast travel targets. */
  waystones: string[];
  chests: string[];
  /**
   * True inside the Fall (hard mode). `encounters` / `princes` / `monarchs` and the world flags always
   * describe the world you are standing in; the other world's wait in `shelf`. Flip it with `setFall`.
   */
  hard: boolean;
  /** The other world's progress — the waking world's while you are in the Fall, the Fall's while awake. */
  shelf: WorldProgress;
  /** Fights won / lost, for the journal. */
  stats: { wins: number; losses: number; fish: number; voyages: number; sunk: number };
}

/** The part of a save that differs between the waking world and the Fall. */
export interface WorldProgress {
  encounters: string[];
  princes: string[];
  monarchs: string[];
  /** Only the world-state flags (`isWorldFlag`). */
  flags: string[];
}

/**
 * Flags that say how far a world has been freed — these swap with the progress lists when you step into
 * or out of the Fall. Every other flag (cutscenes seen, levers, dialogue, the meteor) is the player's and stays.
 */
export const isWorldFlag = (f: string): boolean =>
  f.startsWith('freed-') || f.startsWith('broken-') || f === 'shroud-broken' || f === 'king-fallen';

/** Set (for good) the first time the Obsidian King falls: the second star is down, and Fallpoint can be reached. */
export const FLAG_STAR_FELL = 'star-fell';
/** The meteor's locks have been turned. */
export const FLAG_METEOR_OPEN = 'meteor-open';
/** The Fallen King has been beaten inside the Fall. */
export const FLAG_FALL_WON = 'fall-won';

interface IslesData {
  activeSlot: number | null;
  slots: (IslesSlot | null)[];
}

export const MAX_CHARMS = 3;
export const SLOT_COUNT = 3;

let cache: IslesData | null = null;
let cacheKey = '';

function load(): IslesData {
  const k = key();
  if (cache && cacheKey === k) return cache;
  let data: IslesData = { activeSlot: null, slots: [null, null, null] };
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const parsed = JSON.parse(raw) as IslesData;
      if (parsed && Array.isArray(parsed.slots)) data = parsed;
    }
  } catch { /* corrupt or unavailable — start clean */ }
  while (data.slots.length < SLOT_COUNT) data.slots.push(null);
  data.slots = data.slots.map((s) => (s ? normalise(s) : null));
  cache = data;
  cacheKey = k;
  return data;
}

/** Fill any field an older save is missing, so content can add fields freely. */
function normalise(s: IslesSlot): IslesSlot {
  const d = freshSlot(s.name ?? 'Wanderer', s.element ?? 'fire');
  const out: IslesSlot = {
    ...d, ...s,
    boat: { ...d.boat, ...(s.boat ?? {}) },
    stats: { ...d.stats, ...(s.stats ?? {}) },
    shelf: { ...d.shelf, ...(s.shelf ?? {}) },
  };
  // A save that beat the King before the meteor existed: the star has fallen for it too.
  const kingDown = (out.hard ? out.shelf.flags : out.flags).includes('king-fallen');
  if (kingDown && !out.flags.includes(FLAG_STAR_FELL)) out.flags.push(FLAG_STAR_FELL);
  return out;
}

export function persist(): void {
  if (!cache) return;
  try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* storage full */ }
}

export function freshSlot(name: string, element: string): IslesSlot {
  return {
    v: 1, name, createdAt: Date.now(), element,
    area: 'emberport', pos: { x: -1, y: -1 },
    coins: 60, keys: 0, orbs: 0,
    encounters: [], princes: [], monarchs: [],
    quests: {}, flags: [], inv: {}, charms: [], artifact: null, meal: null, rod: null,
    fishLog: {}, genes: {},
    boat: { owned: null, upgrades: {}, ubers: [], uber: null },
    wastesBest: 0, waystones: ['emberport'], chests: [], hard: false,
    shelf: { encounters: [], princes: [], monarchs: [], flags: [] },
    stats: { wins: 0, losses: 0, fish: 0, voyages: 0, sunk: 0 },
  };
}

export function slots(): (IslesSlot | null)[] { return load().slots; }

export function activeIndex(): number { return load().activeSlot ?? 0; }

export function setActive(i: number): void {
  load().activeSlot = i;
  persist();
}

export function createSlot(i: number, name: string, element: string): IslesSlot {
  const data = load();
  const s = freshSlot(name, element);
  data.slots[i] = s;
  data.activeSlot = i;
  persist();
  return s;
}

export function deleteSlot(i: number): void {
  const data = load();
  data.slots[i] = null;
  if (data.activeSlot === i) data.activeSlot = null;
  persist();
}

/** The live slot. Throws only if nothing was ever created — scenes guard with `hasActive()`. */
export function S(): IslesSlot {
  const data = load();
  const s = data.slots[data.activeSlot ?? 0];
  if (!s) throw new Error('No active Isles slot');
  return s;
}

export function hasActive(): boolean {
  const data = load();
  return data.activeSlot !== null && !!data.slots[data.activeSlot];
}

// ── Mutators ───────────────────────────────────────────────────────────

export function addCoins(n: number): void { S().coins = Math.max(0, S().coins + n); persist(); }
export function addOrbs(n: number): void { S().orbs = Math.max(0, S().orbs + n); persist(); }
export function addKeys(n: number): void { S().keys = Math.max(0, S().keys + n); persist(); }

export function spendCoins(n: number): boolean {
  if (S().coins < n) return false;
  S().coins -= n;
  persist();
  return true;
}

export function spendOrbs(n: number): boolean {
  if (S().orbs < n) return false;
  S().orbs -= n;
  persist();
  return true;
}

export function count(item: string): number { return S().inv[item] ?? 0; }

export function give(item: string, n = 1): void {
  const s = S();
  s.inv[item] = (s.inv[item] ?? 0) + n;
  persist();
}

export function take(item: string, n = 1): boolean {
  const s = S();
  if ((s.inv[item] ?? 0) < n) return false;
  s.inv[item] -= n;
  if (s.inv[item] <= 0) {
    delete s.inv[item];
    s.charms = s.charms.filter((c) => c !== item || (s.inv[c] ?? 0) > 0);
    if (s.artifact === item) s.artifact = null;
    if (s.meal === item) s.meal = null;
  }
  persist();
  return true;
}

export function setFlag(f: string): void {
  const s = S();
  if (!s.flags.includes(f)) { s.flags.push(f); persist(); }
}

export function hasFlag(f: string): boolean { return S().flags.includes(f); }

export function markEncounter(id: string): void {
  const s = S();
  if (!s.encounters.includes(id)) { s.encounters.push(id); persist(); }
}

export function markPrince(id: string): void {
  const s = S();
  if (!s.princes.includes(id)) { s.princes.push(id); persist(); }
}

export function markMonarch(id: string): void {
  const s = S();
  if (!s.monarchs.includes(id)) { s.monarchs.push(id); persist(); }
}

/**
 * Step into the Fall (`true`) or wake from it (`false`): the progress lists and world flags trade places
 * with the shelf, so every `Cond` in the game — dialogue, gates, exits, the Shroud — reads the world you
 * are now in without knowing there are two. Coins, keys, orbs, items, genes, quests, chests and waystones
 * are the player's and do not change.
 */
export function setFall(on: boolean): void {
  const s = S();
  if (s.hard === on) return;
  const mine: WorldProgress = {
    encounters: s.encounters, princes: s.princes, monarchs: s.monarchs, flags: s.flags.filter(isWorldFlag),
  };
  const theirs = s.shelf;
  s.encounters = theirs.encounters;
  s.princes = theirs.princes;
  s.monarchs = theirs.monarchs;
  s.flags = [...s.flags.filter((f) => !isWorldFlag(f)), ...theirs.flags];
  s.shelf = mine;
  s.hard = on;
  persist();
}

/** True inside the Fall. */
export const inFall = (): boolean => hasActive() && S().hard;

export function spendKeys(n: number): boolean {
  if (S().keys < n) return false;
  S().keys -= n;
  persist();
  return true;
}

export function setPlace(area: string, pos: Pt): void {
  const s = S();
  s.area = area;
  s.pos = { x: Math.round(pos.x), y: Math.round(pos.y) };
  persist();
}

export function touchWaystone(area: string): boolean {
  const s = S();
  if (s.waystones.includes(area)) return false;
  s.waystones.push(area);
  persist();
  return true;
}

export function geneLevel(element: string, node: string): number {
  return S().genes[element]?.[node] ?? 0;
}

export function setGeneLevel(element: string, node: string, level: number): void {
  const s = S();
  (s.genes[element] ??= {})[node] = level;
  persist();
}

export function logFish(id: string, size: number): void {
  const s = S();
  const e = s.fishLog[id] ?? { count: 0, best: 0 };
  e.count += 1;
  e.best = Math.max(e.best, size);
  s.fishLog[id] = e;
  s.stats.fish += 1;
  persist();
}

// ── Queries ────────────────────────────────────────────────────────────

/**
 * Court membership is supplied by the registry at boot (this file must not import content, or
 * every content file would import itself through it).
 */
let courtEncounters: (court: string) => string[] = () => [];
let islePrinces: (isle: string) => string[] = () => [];
let councilSeats: () => string[] = () => [];

export function bindRegistry(r: {
  courtEncounters: (court: string) => string[];
  islePrinces: (isle: string) => string[];
  councilSeats: () => string[];
}): void {
  courtEncounters = r.courtEncounters;
  islePrinces = r.islePrinces;
  councilSeats = r.councilSeats;
}

/** How many of the Pinnacle's councilors this save has unseated. */
export function seatsWon(): number {
  const won = S().encounters;
  return councilSeats().filter((id) => won.includes(id)).length;
}

export function courtReady(court: string): boolean {
  const ids = courtEncounters(court);
  const won = S().encounters;
  return ids.length > 0 && ids.every((id) => won.includes(id));
}

export function test(c: Cond | undefined): boolean {
  if (!c) return true;
  if (!hasActive()) return false;
  const s = S();
  if ('prince' in c) return s.princes.includes(c.prince);
  if ('monarch' in c) return s.monarchs.includes(c.monarch);
  if ('encounter' in c) return s.encounters.includes(c.encounter);
  if ('courtReady' in c) return courtReady(c.courtReady);
  if ('questDone' in c) return !!s.quests[c.questDone]?.done;
  if ('quest' in c) {
    const q = s.quests[c.quest];
    if (!q) return false;
    return c.stage === undefined || q.done === true || q.stage >= c.stage;
  }
  if ('flag' in c) return s.flags.includes(c.flag);
  if ('item' in c) return (s.inv[c.item] ?? 0) >= (c.count ?? 1);
  if ('princesOfIsle' in c) return islePrinces(c.princesOfIsle).filter((p) => s.princes.includes(p)).length >= c.count;
  if ('monarchs' in c) return s.monarchs.filter((m) => m !== 'obsidian-king').length >= c.monarchs;
  if ('seats' in c) return seatsWon() >= c.seats;
  if ('fall' in c) return s.hard === c.fall;
  if ('not' in c) return !test(c.not);
  if ('all' in c) return c.all.every(test);
  if ('any' in c) return c.any.some(test);
  return true;
}
