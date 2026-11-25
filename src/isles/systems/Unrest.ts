import * as Save from '../IslesSave';
import type { CourtUnrest } from '../IslesSave';
import {
  allCourts, getArea, getCourt, getIsle, registerEncounterResolver, ISLES,
} from '../IslesRegistry';
import type { CourtDef, EncounterDef, IslesFightPayload, NpcLook, Pt } from '../IslesTypes';
import { hashStr, mulberry } from '../art/IsleArt';
import { getPerksForElement } from '../../data/Perks';
import { RIOT_RULES } from '../content/unrest/riot';
import {
  AGITATOR_TITLES, DEFAULT_VOICE, INSURGENT_BEATEN, INSURGENT_CHALLENGE, INSURGENT_TITLES, ISLE_VOICES, LEADER_BEATEN,
  LEADER_CHALLENGE, REBEL_FIRST, REBEL_LAST, REVOLT_BEATEN, REVOLT_OPENERS, type IsleUnrestVoice,
} from '../content/unrest/lines';

/**
 * The unrest — what happens to a court after you free it and walk away.
 *
 * Every fight you fight anywhere is a day passing. Now and then an agitator rises in one of the courts you
 * have freed: a **revolt**. It is one fight — a random element under a random court rule, with upgrades and
 * a heavier hand — and it has a fuse. Beat the agitator and it is over. Lose to them, or leave them shouting
 * until the fuse runs out, and the court falls into **anarchy**: the townsfolk hide, the shops shut, a dark
 * market opens, and insurgents hold the streets. Beat every insurgent and the ringleader comes out; beat the
 * ringleader and the court is free again.
 *
 * Once the Obsidian King is dead nothing holds the isles together at all: revolts come twice as often, burn
 * down in half the time, and everyone in them fights with their element perfected.
 *
 * The state lives on the save (`unrest`, `unrestClock`) and belongs to the world you stand in — the Fall
 * keeps its own. Nothing here is content: who rises, with what, is rolled from the unrest's seed, so it is
 * the same agitator every time you walk back to face them.
 */

const kingDown = (): boolean => Save.S().flags.includes('king-fallen');

/** Fights between revolts. */
const CLOCK = { calm: [9, 13], fallen: [4, 6] } as const;
/** Fights a revolt may be left before it boils over. */
const FUSE = { calm: 7, fallen: 4 } as const;
/** Most courts in revolt at once / most courts in any unrest at once. */
const CAP = { calm: { revolts: 1, total: 2 }, fallen: { revolts: 2, total: 4 } } as const;
/** Courts that must be free before the first revolt can happen. */
const FIRST_AFTER = 2;

const era = (): 'calm' | 'fallen' => (kingDown() ? 'fallen' : 'calm');
const rollClock = (): number => { const [a, b] = CLOCK[era()]; return a + Math.floor(Math.random() * (b - a + 1)); };

export const stateOf = (courtId: string): CourtUnrest | undefined => (Save.hasActive() ? Save.S().unrest[courtId] : undefined);
export const insurgentCount = (u: CourtUnrest): number => (u.strong ? 5 : 4);
export const insurgentsLeft = (u: CourtUnrest): number => insurgentCount(u) - u.down.length;

/** Every court in unrest in this world, revolts first. */
export function active(): { court: CourtDef; u: CourtUnrest }[] {
  if (!Save.hasActive()) return [];
  return Object.entries(Save.S().unrest)
    .map(([id, u]) => ({ court: getCourt(id), u }))
    .filter((x): x is { court: CourtDef; u: CourtUnrest } => !!x.court)
    .sort((a, b) => (a.u.state === b.u.state ? 0 : a.u.state === 'revolt' ? -1 : 1));
}

// ── Who rises ──────────────────────────────────────────────────────────

const ID = 'unrest:';
export const revoltId = (court: string): string => `${ID}${court}:revolt`;
export const insurgentId = (court: string, i: number): string => `${ID}${court}:i${i}`;
export const leaderId = (court: string): string => `${ID}${court}:leader`;

const voiceOf = (court: CourtDef): IsleUnrestVoice => ISLE_VOICES[court.isle] ?? DEFAULT_VOICE;

function fill(s: string, court: CourtDef): string {
  const isle = getIsle(court.isle);
  return s.replace(/\{court\}/g, court.name).replace(/\{prince\}/g, court.prince.name)
    .replace(/\{isle\}/g, isle?.name ?? 'the isle').replace(/\{monarch\}/g, isle?.monarch.name ?? 'the crown');
}

const HATS: NpcLook['hat'][] = ['bandana', 'hood', 'cap', 'beanie', 'cowl', 'none'];

function rebelLook(r: () => number, tint: number, big = false): NpcLook {
  const coats = [0x4a3a34, 0x3a4048, 0x54402c, 0x403446, 0x35443a];
  return {
    body: coats[Math.floor(r() * coats.length)], accent: tint, hat: HATS[Math.floor(r() * HATS.length)],
    traits: big ? ['scarf', 'brand'] : r() < 0.5 ? ['scarf'] : ['bandage', 'mask'], size: big ? 1.3 : 0.95 + r() * 0.2, eye: 0xffe0b0,
  };
}

/** Elements a rebel may fight as: every court's, anywhere. */
const elementPool = (): string[] => allCourts().map((c) => c.element);

/** Court rules a revolt may borrow: any champion's, from an isle this save has landed on. */
function rulePool(): EncounterDef[] {
  const landed = new Set(ISLES.filter((i) => Save.S().waystones.includes(i.port)).map((i) => i.id));
  const pool = allCourts().filter((c) => landed.has(c.isle)).flatMap((c) => c.encounters).filter((e) => e.gimmick);
  return pool.length ? pool : allCourts().flatMap((c) => c.encounters).filter((e) => e.gimmick);
}

/** Where the court's prince stood — the seat every rebel wants. */
function seatOf(court: CourtDef): Pt {
  const area = getArea(court.area);
  const p = area?.pois.find((x) => x.kind === 'prince');
  return p && p.kind === 'prince' ? { ...p.at } : { ...(area?.spawn ?? { x: 400, y: 400 }) };
}

const tierUp = (court: CourtDef, strong: boolean): number => Math.max(2, Math.min(5, court.tier + 1 + (strong ? 1 : 0)));

function revoltEncounter(court: CourtDef, u: CourtUnrest): EncounterDef {
  const r = mulberry(u.seed);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const rule = pick(rulePool());
  const el = pick(elementPool());
  const opener = pick(REVOLT_OPENERS).map((l) => fill(l, court));
  return {
    id: revoltId(court.id), court: court.id, name: rule.name,
    foeName: `${pick(AGITATOR_TITLES)} ${pick(REBEL_FIRST)} ${pick(REBEL_LAST)}`,
    foeElement: el, difficulty: tierUp(court, u.strong), hpMult: u.strong ? 1.5 : 1.25, power: u.strong ? 1.25 : 1.1,
    loadout: u.strong ? 5 : 3, gimmick: rule.gimmick, at: seatOf(court), look: rebelLook(r, court.color),
    challenge: [...opener, fill(voiceOf(court).creed, court)], beaten: [pick(REVOLT_BEATEN)],
    coins: Math.round((80 + 30 * court.tier) * (u.strong ? 1.5 : 1)),
    unrest: { court: court.id, role: 'revolt' },
  };
}

function insurgentEncounter(court: CourtDef, u: CourtUnrest, i: number): EncounterDef {
  // One shuffle per court for elements, rules and posts, so no two of its insurgents share any of them.
  const deal = mulberry(u.seed ^ 0x51ed);
  const shuffle = <T,>(a: T[]): T[] => { const o = [...a]; for (let k = o.length - 1; k > 0; k--) { const j = Math.floor(deal() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; } return o; };
  const els = shuffle([...new Set(elementPool())]);
  const rules = shuffle(RIOT_RULES);
  const posts = shuffle(court.encounters.map((e) => e.at));
  const r = mulberry(u.seed + 7919 * (i + 1));
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const rule = rules[i % rules.length];
  return {
    id: insurgentId(court.id, i), court: court.id, name: rule.name,
    foeName: `${pick(REBEL_FIRST)} the ${pick(INSURGENT_TITLES)}`,
    foeElement: els[i % els.length], difficulty: tierUp(court, u.strong), hpMult: u.strong ? 1.4 : 1.15, power: u.strong ? 1.2 : 1.05,
    loadout: u.strong ? 5 : 4, gimmick: `unrest-${rule.id}${u.strong ? '-strong' : ''}`,
    at: { ...(posts[i % posts.length] ?? seatOf(court)) }, look: rebelLook(r, court.color),
    challenge: pick(INSURGENT_CHALLENGE).map((l) => fill(l, court)), beaten: [pick(INSURGENT_BEATEN)],
    coins: Math.round((40 + 12 * court.tier) * (u.strong ? 1.5 : 1)),
    unrest: { court: court.id, role: 'insurgent', index: i },
  };
}

function leaderEncounter(court: CourtDef, u: CourtUnrest): EncounterDef {
  const r = mulberry(u.seed ^ 0x1eade7);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const el = pick(elementPool());
  const perks = getPerksForElement(el);
  return {
    id: leaderId(court.id), court: court.id, name: 'Mob Rule',
    foeName: `${pick(REBEL_FIRST)} ${pick(REBEL_LAST)}, ${voiceOf(court).leaderTitle}`,
    foeElement: el, difficulty: 5, hpMult: u.strong ? 2.6 : 2, power: u.strong ? 1.3 : 1.15,
    loadout: 5, perk: perks.length ? perks[Math.floor(r() * perks.length)].id : undefined,
    gimmick: u.strong ? 'unrest-leader-strong' : 'unrest-leader', at: seatOf(court), look: rebelLook(r, court.color, true),
    challenge: pick(LEADER_CHALLENGE).map((l) => fill(l, court)), beaten: LEADER_BEATEN,
    coins: Math.round((200 + 60 * court.tier) * (u.strong ? 1.5 : 1)),
    unrest: { court: court.id, role: 'leader' },
  };
}

/** The fight behind an unrest id — or nothing, if that unrest is over. */
export function encounterFor(id: string): EncounterDef | undefined {
  if (!id.startsWith(ID) || !Save.hasActive()) return undefined;
  const [, courtId, what] = id.split(':');
  const court = getCourt(courtId);
  const u = Save.S().unrest[courtId];
  if (!court || !u) return undefined;
  if (what === 'revolt') return u.state === 'revolt' ? revoltEncounter(court, u) : undefined;
  if (u.state !== 'anarchy') return undefined;
  if (what === 'leader') return leaderEncounter(court, u);
  const i = Number(what.slice(1));
  return Number.isInteger(i) && i >= 0 && i < insurgentCount(u) ? insurgentEncounter(court, u, i) : undefined;
}

registerEncounterResolver(encounterFor);

/**
 * Who stands in a court's streets right now: a revolt's agitator; or, in anarchy, the insurgents still up —
 * and the ringleader once the last of them is down.
 */
export function standing(courtId: string): EncounterDef[] {
  const court = getCourt(courtId);
  const u = stateOf(courtId);
  if (!court || !u) return [];
  if (u.state === 'revolt') return [revoltEncounter(court, u)];
  const out: EncounterDef[] = [];
  for (let i = 0; i < insurgentCount(u); i++) if (!u.down.includes(i)) out.push(insurgentEncounter(court, u, i));
  if (!out.length) out.push(leaderEncounter(court, u));
  return out;
}

/** The ringleader's name while they are still in hiding (for the townsfolk to whisper). */
export const leaderOf = (courtId: string): EncounterDef | undefined => {
  const court = getCourt(courtId);
  const u = stateOf(courtId);
  return court && u?.state === 'anarchy' ? leaderEncounter(court, u) : undefined;
};

export const isleVoice = (isleId: string): IsleUnrestVoice => ISLE_VOICES[isleId] ?? DEFAULT_VOICE;
export const fillLine = (line: string, courtId: string): string => { const c = getCourt(courtId); return c ? fill(line, c) : line; };

// ── Time passing ───────────────────────────────────────────────────────

export interface News { text: string; color: string; big?: boolean }

function fall(court: CourtDef, u: CourtUnrest, news: News[], why: string): void {
  u.state = 'anarchy';
  u.down = [];
  u.fuse = 0;
  news.push({ text: `☠ ${court.name} has fallen into anarchy${why}.`, color: '#ff8a70', big: true });
  news.push({ text: 'Its people are hiding. Insurgents hold the streets — and a dark market has opened.', color: '#d8a898' });
}

/**
 * A fight has been fought somewhere (won or lost — it is the time that matters): fuses burn down, and the
 * next revolt may break out. Returns what the player should be told.
 */
export function tick(payload: IslesFightPayload): News[] {
  const news: News[] = [];
  if (!Save.hasActive() || payload.kind === 'voyage' || payload.kind === 'unrest') return news;
  const s = Save.S();
  for (const [id, u] of Object.entries(s.unrest)) {
    const court = getCourt(id);
    if (!court) { delete s.unrest[id]; continue; }
    if (u.state !== 'revolt') continue;
    u.fuse -= 1;
    if (u.fuse <= 0) fall(court, u, news, ' — nobody answered the revolt');
    else if (u.fuse <= 2) news.push({ text: `⚠ The revolt in ${court.name} is about to boil over — ${u.fuse} fight${u.fuse === 1 ? '' : 's'} left.`, color: '#ffc27a' });
  }
  const free = allCourts().filter((c) => s.princes.includes(c.prince.id));
  if (free.length < FIRST_AFTER) { Save.persist(); return news; }
  if (s.unrestClock < 0) s.unrestClock = rollClock();
  s.unrestClock -= 1;
  if (s.unrestClock <= 0) {
    const cap = CAP[era()];
    const all = Object.values(s.unrest);
    // The court you only just freed gets its day in the sun.
    const fresh = payload.kind === 'prince' ? payload.court : undefined;
    const quiet = free.filter((c) => !s.unrest[c.id] && c.id !== fresh);
    if (quiet.length && all.filter((u) => u.state === 'revolt').length < cap.revolts && all.length < cap.total) {
      const court = quiet[Math.floor(Math.random() * quiet.length)];
      const strong = kingDown();
      s.unrest[court.id] = { state: 'revolt', seed: (Math.random() * 0x7fffffff) | 0, fuse: FUSE[era()], down: [], strong };
      const isle = getIsle(court.isle);
      news.push({ text: `⚠ Revolt in ${court.name}${isle ? `, ${isle.name}` : ''}!`, color: '#ffb060', big: true });
      news.push({ text: `An agitator has taken ${court.prince.name}'s seat. Face them within ${FUSE[era()]} fights, or the court falls.`, color: '#e8c8a0' });
      s.unrestClock = rollClock();
    } else {
      // Nowhere to rise just now; try again soon rather than a whole cycle later.
      s.unrestClock = 2;
    }
  }
  Save.persist();
  return news;
}

/** Settle one of the unrest's own fights. */
export function settle(payload: IslesFightPayload, won: boolean): News[] {
  const news: News[] = [];
  if (!Save.hasActive()) return news;
  const s = Save.S();
  const [, courtId, what] = payload.id.split(':');
  const court = getCourt(courtId);
  const u = s.unrest[courtId];
  if (!court || !u) return news;
  const enc = encounterFor(payload.id);
  const pay = (coins: number, orbs: number, keys = 0) => {
    Save.addCoins(coins);
    news.push({ text: `+${coins} 🪙 coins`, color: '#ffd27a', big: true });
    if (orbs) { Save.addOrbs(orbs); }
    if (keys) { Save.addKeys(keys); }
    if (orbs || keys) news.push({ text: [orbs ? `+${orbs} 🔮 orbs` : '', keys ? `+${keys} 🗝️ key` : ''].filter(Boolean).join('   '), color: '#d0a8ff' });
  };
  if (what === 'revolt') {
    if (won) {
      pay(enc?.coins ?? 100, u.strong ? 3 : 2);
      delete s.unrest[courtId];
      s.stats.quelled += 1;
      news.push({ text: `The revolt in ${court.name} is over. The crowd goes home.`, color: '#9dffb0', big: true });
    } else {
      fall(court, u, news, '');
    }
  } else if (what === 'leader') {
    if (won) {
      pay(enc?.coins ?? 300, u.strong ? 8 : 5, 1);
      delete s.unrest[courtId];
      s.stats.reclaimed += 1;
      news.push({ text: `${court.name} is free again.`, color: '#9dffb0', big: true });
      news.push({ text: 'Doors are opening. The dark market has packed up and gone.', color: '#c8e8c8' });
    } else if (u.strong && u.down.length) {
      // With the King dead the mob does not stay beaten: lose to its head and one of its hands gets back up.
      u.down.pop();
      news.push({ text: 'The mob takes heart — one of the insurgents is back on the street.', color: '#ff9a78' });
    }
  } else if (won) {
    const i = Number(what.slice(1));
    const first = !u.down.includes(i);
    if (first) u.down.push(i);
    pay(Math.round((enc?.coins ?? 50) * (first ? 1 : 0.3)), first ? 1 : 0);
    const left = insurgentsLeft(u);
    news.push(left > 0
      ? { text: `${court.name}: ${left} insurgent${left === 1 ? '' : 's'} still on the streets`, color: '#e8c8a0' }
      : { text: 'The streets are clear. The ringleader has come out to hold the seat.', color: '#ff9d5c', big: true });
  }
  Save.persist();
  return news;
}

/**
 * Cheat saves only (the world's U key): walk a court through peace → revolt → anarchy → peace, so the
 * unrest can be looked at without waiting for it. Returns what it is now.
 */
export function debugCycle(courtId: string): string {
  const s = Save.S();
  const u = s.unrest[courtId];
  if (!u) s.unrest[courtId] = { state: 'revolt', seed: (Math.random() * 0x7fffffff) | 0, fuse: FUSE[era()], down: [], strong: kingDown() };
  else if (u.state === 'revolt') { u.state = 'anarchy'; u.down = []; u.fuse = 0; }
  else delete s.unrest[courtId];
  Save.persist();
  return s.unrest[courtId]?.state ?? 'peace';
}

/** One line for the HUD about a court's trouble, or '' when it is at peace. */
export function hudLine(courtId: string): string {
  const u = stateOf(courtId);
  if (!u) return '';
  if (u.state === 'revolt') return `⚠ REVOLT — ${u.fuse} fight${u.fuse === 1 ? '' : 's'} until it boils over`;
  const left = insurgentsLeft(u);
  return left > 0 ? `☠ ANARCHY — ${left} insurgent${left === 1 ? '' : 's'} left` : '☠ ANARCHY — the ringleader holds the seat';
}

/** A deterministic 0–1 for scenery that should not change between visits to the same unrest. */
export const unrestRng = (courtId: string, salt: string): (() => number) => mulberry(hashStr(`${salt}:${courtId}`) ^ (stateOf(courtId)?.seed ?? 0));
