import { Net, NET_PROTOCOL_VERSION } from '../../network/NetworkManager';
import * as Save from '../IslesSave';
import { isleOf } from '../IslesRegistry';
import type { FightCall, IslesMsg, PartyFighter, PartyWalker, WorldSnap } from './IslesMsg';

/**
 * Ten Isles co-op — the party.
 *
 * One player hosts their world; up to three friends join it by room code (the same PeerJS rooms the rest of
 * the game uses) and walk it with their own element, genes, charms and pockets. **The host's save is the
 * world**: what is freed, every quest stage, the unrest. A guest sees it through `Save.setVisiting` and can
 * change none of it — they lead the party through a gate or into a fight by *asking* the host, whose game
 * does it and tells everyone.
 *
 * This module is the room and the wire. What the party looks like in the world is `world/CoopWorld`; how a
 * fight is shared is `fight/CoopFight`. Each registers a listener here while its scene is up.
 */

export interface WorldListener {
  /** Guest: a fresh snapshot landed. `area` is where the host is standing. */
  onWorld?(area: string): void;
  /** Guest: follow the party. Host: a guest asked to lead us there. */
  onGoto?(m: Extract<IslesMsg, { k: 'goto' }>, from: number): void;
  /** Guest: launch this fight. Host: a guest asked for it. */
  onFight?(call: FightCall, from: number): void;
  onSea?(dest: string): void;
  /** The party is over for us (host gone, kicked, version mismatch). */
  onLeft?(why: string): void;
  onParty?(): void;
}

export interface FightListener {
  /** Host: a guest's blows landed. */
  onDamage?(amount: number, from: number): void;
  /** Guest: the host says it is over. */
  onEnd?(won: boolean): void;
  onWipe?(): void;
}

interface FoeState { hp: number; mx: number; n: number; x: number; y: number; at: number }

class IslesCoopSession {
  private on = false;
  /** The other walkers, by slot (host: as they report; guest: as the host tells it). */
  readonly walkers = new Map<number, PartyWalker & { at: number }>();
  /** The other fighters in the arena, by slot. */
  readonly fighters = new Map<number, PartyFighter & { at: number }>();
  /** Guest: the foe as the host has it. */
  foe: FoeState | null = null;
  /** Names and elements, by slot, as each player said hello. */
  readonly roster = new Map<number, { name: string; element: string }>();
  world: WorldListener | null = null;
  fight: FightListener | null = null;
  /** Host: where the party is (sent with every snapshot). */
  private hostArea = 'emberport';
  private lastSnap = '';
  /** Guest: the first snapshot has landed and the visit has begun. */
  private visiting = false;
  /** Host: my own walker, folded into what the guests are told. */
  private me: PartyWalker | null = null;
  private meFighter: PartyFighter | null = null;

  constructor() {
    Net.onMessage((msg, from) => {
      if (msg.t !== 'isles' || !this.on) return;
      try { this.handle(msg.m, from); } catch (e) { console.error('[isles co-op]', e); }
    });
    Net.onStatus((status, detail) => {
      if (!this.on) return;
      if (status === 'error' || (status === 'idle')) this.dropped(detail ?? 'The connection was lost.');
    });
    Net.onPeers((slots) => {
      if (!this.on) return;
      for (const s of [...this.walkers.keys()]) if (!slots.includes(s)) { this.walkers.delete(s); this.roster.delete(s); }
      for (const s of [...this.fighters.keys()]) if (!slots.includes(s)) this.fighters.delete(s);
      this.world?.onParty?.();
    });
  }

  // ── State ────────────────────────────────────────────────────────────

  /** In a party: hosting (with or without anyone in yet) or joined to one. */
  get active(): boolean { return this.on && (Net.status === 'hosting' || Net.status === 'connected' || Net.status === 'starting' || Net.status === 'joining'); }
  get isHost(): boolean { return this.active && Net.isHost; }
  /** Walking somebody else's world. */
  get isGuest(): boolean { return this.active && !Net.isHost; }
  /** Somebody else is actually here. */
  get together(): boolean { return this.active && Net.connected && Net.otherSlots.length > 0; }
  get roomCode(): string | null { return this.active ? Net.roomCode : null; }
  get mySlot(): number { return Net.mySlot; }
  /** How many are in the party, me included. */
  get size(): number { return this.together ? Net.slots.length : 1; }

  nameOf(slot: number): string {
    return this.roster.get(slot)?.name ?? (slot === 0 ? 'Host' : `Friend ${slot}`);
  }

  // ── The room ─────────────────────────────────────────────────────────

  /** Open this world to friends. The room code arrives on `Net.roomCode` once the broker answers. */
  host(): void {
    this.reset();
    this.on = true;
    Net.host();
  }

  /** Join a friend's world by code. `world.onWorld` fires when their first snapshot lands. */
  join(code: string): void {
    this.reset();
    this.on = true;
    Net.join(code);
  }

  /** Guest: say who I am (and ask for the world). Safe to repeat. */
  hello(): void {
    if (!this.isGuest || !Net.connected || !Save.hasActive()) return;
    if (Net.versionMismatch) { this.dropped(`Your games are different versions (this one speaks ${NET_PROTOCOL_VERSION}).`); return; }
    // The pockets are mine even while I visit, so the name and element come from my own slot.
    const s = Save.S();
    this.send({ k: 'hello', name: s.name, element: s.element });
  }

  leave(): void {
    const was = this.on;
    this.reset();
    if (was) Net.disconnect();
  }

  private reset(): void {
    this.on = false;
    this.walkers.clear();
    this.fighters.clear();
    this.roster.clear();
    this.foe = null;
    this.lastSnap = '';
    this.visiting = false;
    this.me = null;
    this.meFighter = null;
    Save.setVisiting(null);
  }

  private dropped(why: string): void {
    const wasGuest = !Net.isHost;
    // A host whose last guest left is still a host (the room stays open); only a real failure ends it.
    if (!wasGuest && Net.status !== 'error') return;
    this.reset();
    // Mid-fight there is no world scene to tell: the fight carries on alone (`CoopFight` sees the party gone).
    this.world?.onLeft?.(wasGuest ? `Left the party — ${why}` : `The room closed — ${why}`);
  }

  // ── Wire ─────────────────────────────────────────────────────────────

  send(m: IslesMsg): void { if (this.active && Net.connected) Net.send({ t: 'isles', m }); }
  sendTo(slot: number, m: IslesMsg): void { if (this.active && Net.connected) Net.sendTo(slot, { t: 'isles', m }); }

  private handle(m: IslesMsg, from: number): void {
    const now = Date.now();
    if (Net.isHost) {
      switch (m.k) {
        case 'hello':
          this.roster.set(from, { name: m.name, element: m.element });
          this.pushWorld(this.hostArea, from);
          this.world?.onParty?.();
          return;
        case 'pos': {
          const who = this.roster.get(from);
          this.walkers.set(from, { slot: from, name: who?.name ?? `Friend ${from}`, element: who?.element ?? 'fire', area: m.area, x: m.x, y: m.y, f: m.f, m: m.m, busy: m.busy, at: now });
          return;
        }
        case 'goto': this.world?.onGoto?.(m, from); return;
        case 'fight': this.world?.onFight?.(m.call, from); return;
        case 'f-pos': this.fighters.set(from, { slot: from, x: m.x, y: m.y, hp: m.hp, mx: m.mx, down: m.down, at: now }); return;
        case 'f-dmg': this.fight?.onDamage?.(m.a, from); return;
        case 'f-wipe':
          for (const s of Net.otherSlots) if (s !== from) this.sendTo(s, m);
          this.fight?.onWipe?.();
          return;
        default: return;
      }
    }
    switch (m.k) {
      case 'world': {
        const snap = m.snap;
        if (!this.visiting) {
          this.visiting = true;
          Save.setVisiting({ ...snap, area: m.area, pos: { x: -1, y: -1 } });
        } else Save.refreshVisit(snap);
        this.hostArea = m.area;
        this.world?.onWorld?.(m.area);
        return;
      }
      case 'party':
        this.walkers.clear();
        for (const w of m.p) {
          this.roster.set(w.slot, { name: w.name, element: w.element });
          if (w.slot !== Net.mySlot) this.walkers.set(w.slot, { ...w, at: now });
        }
        return;
      case 'goto': this.world?.onGoto?.(m, from); return;
      case 'fight': this.world?.onFight?.(m.call, from); return;
      case 'sea': this.world?.onSea?.(m.dest); return;
      case 'f-all':
        this.fighters.clear();
        for (const p of m.p) if (p.slot !== Net.mySlot) this.fighters.set(p.slot, { ...p, at: now });
        this.foe = { hp: m.hp, mx: m.mx, n: m.n, x: m.x, y: m.y, at: now };
        return;
      case 'f-end': this.fight?.onEnd?.(m.won); return;
      case 'f-wipe': this.fight?.onWipe?.(); return;
      default: return;
    }
  }

  // ── The world ────────────────────────────────────────────────────────

  /** Where the party is, as the guest last heard. */
  get partyArea(): string { return this.hostArea; }

  /** Host: send the world (to one guest, or to all when it has changed since the last time). */
  pushWorld(area: string, to?: number): void {
    if (!this.isHost || !Save.hasActive()) return;
    this.hostArea = area;
    const snap: WorldSnap = Save.worldSnapshot();
    const msg: IslesMsg = { k: 'world', snap, area, isle: isleOf(area) ?? 'fire' };
    if (to !== undefined) { this.sendTo(to, msg); return; }
    const sig = JSON.stringify(msg);
    if (sig === this.lastSnap) return;
    this.lastSnap = sig;
    this.send(msg);
  }

  /** Everyone, ~10 Hz while walking: my walker. The host folds its own in and tells the party. */
  walk(w: Omit<PartyWalker, 'slot' | 'name' | 'element'>): void {
    if (!this.together) return;
    if (!Net.isHost) { this.send({ k: 'pos', ...w }); return; }
    const s = Save.S();
    this.me = { slot: 0, name: s.name, element: s.element, ...w };
    const now = Date.now();
    const p: PartyWalker[] = [this.me];
    for (const [slot, o] of this.walkers) if (now - o.at < 4000) p.push({ slot, name: o.name, element: o.element, area: o.area, x: o.x, y: o.y, f: o.f, m: o.m, busy: o.busy });
    this.send({ k: 'party', p });
  }

  /** How many of the others are out walking (not in a menu-less limbo, a fight or at sea) — who a fight can call on. */
  walkersReady(): number {
    const now = Date.now();
    return [...this.walkers.values()].filter((w) => !w.busy && now - w.at < 4000).length;
  }

  /** The other walkers in `area`, freshest only. */
  walkersIn(area: string): (PartyWalker & { at: number })[] {
    const now = Date.now();
    return [...this.walkers.values()].filter((w) => w.area === area && now - w.at < 4000);
  }

  // ── The arena ────────────────────────────────────────────────────────

  /**
   * Everyone, ~12 Hz in a fight: my fighter. The host also says how the foe stands — `foe.n` is how many
   * times its health has run out (so a boss's phases turn over on every screen together).
   */
  fighter(f: Omit<PartyFighter, 'slot'>, foe?: { hp: number; mx: number; n: number; x: number; y: number }): void {
    if (!this.together) return;
    if (!Net.isHost) { this.send({ k: 'f-pos', ...f }); return; }
    this.meFighter = { slot: 0, ...f };
    const now = Date.now();
    const p: PartyFighter[] = [this.meFighter];
    for (const [slot, o] of this.fighters) if (now - o.at < 3000) p.push({ slot, x: o.x, y: o.y, hp: o.hp, mx: o.mx, down: o.down });
    this.send({ k: 'f-all', p, hp: foe?.hp ?? 0, mx: foe?.mx ?? 1, n: foe?.n ?? 0, x: foe?.x ?? 0, y: foe?.y ?? 0 });
  }

  /** The other fighters still reporting. */
  allies(): (PartyFighter & { at: number })[] {
    const now = Date.now();
    return [...this.fighters.values()].filter((f) => now - f.at < 3000);
  }

  /** A fight is starting or over: forget the last one's fighters. */
  clearFight(): void {
    this.fighters.clear();
    this.foe = null;
    this.meFighter = null;
  }
}

export const Coop = new IslesCoopSession();
