/**
 * Gold's tycoon — the simulation, with no drawing in it.
 *
 * A strip of machinery along the top of the screen: droppers on the left let pieces of ore fall
 * onto a conveyor, the conveyor carries them right through whatever upgraders have been built
 * over it, and the refiner at the far end turns each piece into gold. Everything is bought on
 * pads (the next dropper, the next upgrader, the next refiner level), and when all eight have
 * been bought the tycoon is *complete* — the condition Rebirth (Q) waits for.
 *
 * The class is a plain state machine in strip-local coordinates (origin at the strip's top-left
 * corner), so the arena kit and the codex previews run exactly the same one. It pays out through
 * the callbacks handed to `update`; it never touches a purse itself.
 */

/** The eight things gold buys. All eight bought = complete. */
export type PartId = 'drop2' | 'drop3' | 'drop4' | 'up1' | 'up2' | 'up3' | 'ref2' | 'ref3';
/** Q+ Golden Glory: the six machines a rebirth can leave behind. */
export type GloryId = 'midas' | 'drill' | 'dragon' | 'tunnel' | 'shredder' | 'furnace';
export type DropperId = 'base' | 'drop2' | 'drop3' | 'drop4' | 'midas' | 'drill';
export type UpgraderId = 'up1' | 'up2' | 'up3' | 'dragon' | 'tunnel';
export type OreKind = 'ore' | 'big' | 'midas' | 'drill';
/** A pad is one of the eight parts, or the Click+ shard pad under the first dropper. */
export type PadId = PartId | 'shard';

export const PARTS: PartId[] = ['drop2', 'drop3', 'drop4', 'up1', 'up2', 'up3', 'ref2', 'ref3'];
export const GLORIES: GloryId[] = ['midas', 'drill', 'dragon', 'tunnel', 'shredder', 'furnace'];

/** Each chain is bought in order; only the next link of each shows a pad. */
const CHAINS: PartId[][] = [['drop2', 'drop3', 'drop4'], ['up1', 'up2', 'up3'], ['ref2', 'ref3']];

export const PART_PRICE: Record<PartId, number> = {
  drop2: 6, drop3: 12, drop4: 26,
  up1: 8, up2: 16, up3: 32,
  ref2: 20, ref3: 40,
};
/** Click+: the first dropper tripled. Paid in real shards, not gold. */
export const SHARD_PAD_PRICE = 10;
export const SHARD_DROPPER_MULT = 3;

export const PART_NAME: Record<PartId, string> = {
  drop2: 'Dropper', drop3: 'Dropper', drop4: 'Heavy Dropper',
  up1: 'Upgrader', up2: 'Upgrader', up3: 'Multiplier',
  ref2: 'Refiner II', ref3: 'Refiner III',
};
export const GLORY_NAME: Record<GloryId, string> = {
  midas: 'Midas Dropper', drill: 'Mega Drill', dragon: 'Dragon Upgrader',
  tunnel: 'Tunnel of Fortune', shredder: 'Shredder', furnace: 'Flaming Furnace',
};

// ── Layout (strip-local pixels) ──────────────────────────────────────────────
export const TYCOON_W = 456;
export const TYCOON_H = 80;
/** The top face of the belt: ore rides with its centre this far down. */
export const BELT_Y = 44;
export const BELT_X0 = 12;
/** Where the belt runs into the refiner's mouth. */
export const BELT_X1 = 404;
export const REFINER_X = 428;
/** Pads sit in a row under the belt. */
export const PAD_Y = 66;
export const PAD_W = 30;
export const PAD_H = 16;
/** A dropper's spout is this far above the belt. */
export const SPOUT_Y = 24;

export const DROPPER_X: Record<DropperId, number> = {
  base: 28, drop2: 60, drop3: 92, drop4: 124, midas: 156, drill: 188,
};
export const UPGRADER_X: Record<UpgraderId, number> = {
  up1: 228, up2: 262, up3: 296, dragon: 334, tunnel: 372,
};

// ── Numbers ──────────────────────────────────────────────────────────────────
export const BELT_SPEED = 78;
const FALL_MS = 160;
/** The first dropper, and the two bought after it: one piece worth 1 gold every 2 seconds. */
export const DROP_MS = 2000;
export const DROP_VALUE = 1;
/** The heavy dropper: slower, and worth more. */
export const HEAVY_MS = 5000;
export const HEAVY_VALUE = 5;
/** Midas Dropper: one piece on the belt at a time, and it is worth a great deal. */
export const MIDAS_VALUE = 14;
const MIDAS_REARM_MS = 500;
/** Mega Drill: a near-constant stream of grit. Flat upgraders add only a share to a piece this small. */
export const DRILL_MS = 400;
export const DRILL_VALUE = 0.2;
export const DRILL_FLAT_SHARE = 0.25;
/** Life-support (Click+): droppers run at three quarters speed. */
export const LIFE_SUPPORT_RATE = 0.75;

export const FLAT_BONUS = 1;
export const MULT_BONUS = 1.5;
export const DRAGON_MULT = 3;
export const DRAGON_BURN_CHANCE = 0.25;
export const TUNNEL_FLAT = 2;
export const TUNNEL_MULT = 1.25;
export const REFINER_MULT = [1, 1.25, 1.5];
/** Shredder: a piece nothing has upgraded is worth this many times as much. */
export const SHREDDER_RAW_MULT = 3;
/** Flaming Furnace: every piece fed in heats it; heat is bonus value, and it cools on its own. */
export const FURNACE_HEAT_PER_ORE = 0.1;
export const FURNACE_COOL_PER_SEC = 0.06;
export const FURNACE_MAX_BONUS = 1;

export interface Ore {
  kind: OreKind;
  x: number;
  /** ms since it left the spout; it rides the belt once this passes the fall time. */
  age: number;
  value: number;
  /** Nothing has upgraded it yet (the Shredder's condition). */
  raw: boolean;
  /** How many upgraders have touched it — drives how bright it is drawn. */
  tier: number;
  /** Upgraders already passed, by x, so each touches a piece once. */
  passed: number;
  seed: number;
}

export interface TycoonPad {
  id: PadId;
  x: number;
  y: number;
  price: number;
  currency: 'gold' | 'shards';
  name: string;
}

export interface TycoonEvents {
  /** A piece reached the refiner: `value` gold (or health, on life-support) at strip-local x. */
  paid(value: number): void;
  /** Visual hooks, all optional. */
  dropped?(id: DropperId): void;
  upgraded?(id: UpgraderId, ore: Ore): void;
  burned?(x: number): void;
}

export class Tycoon {
  owned = new Set<PartId>();
  glory = new Set<GloryId>();
  /** Click+: the shard pad has been paid for. Like the glory machines, it survives a rebirth. */
  shardDropper = false;
  lifeSupport = false;
  ores: Ore[] = [];
  /** Flaming Furnace heat, 0–1. */
  heat = 0;
  /** ms until each dropper's next piece. */
  private clocks: Partial<Record<DropperId, number>> = {};
  /** Flashes for the painter, 0–1, decaying. */
  dropFlash: Partial<Record<DropperId, number>> = {};
  upFlash: Partial<Record<UpgraderId, number>> = {};
  refineFlash = 0;
  private seed = 1;

  /** Rebirth: everything gold bought is gone. The glory machines and the shard dropper stay. */
  rebirth(): void {
    this.owned.clear();
    this.ores = [];
    this.clocks = {};
    this.heat = 0;
  }

  get refinerLevel(): number { return this.owned.has('ref3') ? 3 : this.owned.has('ref2') ? 2 : 1; }
  get complete(): boolean { return this.owned.size >= PARTS.length; }
  /** 0–1: how much of the tycoon has been bought. */
  get progress(): number { return this.owned.size / PARTS.length; }

  droppers(): DropperId[] {
    const out: DropperId[] = ['base'];
    for (const id of ['drop2', 'drop3', 'drop4'] as const) if (this.owned.has(id)) out.push(id);
    if (this.glory.has('midas')) out.push('midas');
    if (this.glory.has('drill')) out.push('drill');
    return out;
  }

  upgraders(): UpgraderId[] {
    const out: UpgraderId[] = [];
    for (const id of ['up1', 'up2', 'up3'] as const) if (this.owned.has(id)) out.push(id);
    if (this.glory.has('dragon')) out.push('dragon');
    if (this.glory.has('tunnel')) out.push('tunnel');
    return out;
  }

  /** The pads showing right now: the next link of each chain, and the shard pad if it is offered. */
  pads(shardPadOffered: boolean): TycoonPad[] {
    const out: TycoonPad[] = [];
    for (const chain of CHAINS) {
      const next = chain.find((id) => !this.owned.has(id));
      if (!next) continue;
      const x = next.startsWith('drop') ? DROPPER_X[next as DropperId]
        : next.startsWith('up') ? UPGRADER_X[next as UpgraderId] : REFINER_X;
      out.push({ id: next, x, y: PAD_Y, price: PART_PRICE[next], currency: 'gold', name: PART_NAME[next] });
    }
    if (shardPadOffered && !this.shardDropper) {
      out.push({ id: 'shard', x: DROPPER_X.base, y: PAD_Y, price: SHARD_PAD_PRICE, currency: 'shards', name: 'Triple Dropper' });
    }
    return out;
  }

  /** The cheapest gold pad on show, or null when the tycoon is complete. */
  cheapest(): TycoonPad | null {
    let best: TycoonPad | null = null;
    for (const p of this.pads(false)) if (!best || p.price < best.price) best = p;
    return best;
  }

  /** True if `id` is the next link of its chain. */
  canBuy(id: PartId): boolean {
    return this.pads(false).some((p) => p.id === id);
  }

  buy(id: PartId): void { this.owned.add(id); }

  private interval(id: DropperId): number {
    const base = id === 'drop4' ? HEAVY_MS : id === 'drill' ? DRILL_MS : DROP_MS;
    return base / (this.lifeSupport ? LIFE_SUPPORT_RATE : 1);
  }

  private spawn(id: DropperId): void {
    const kind: OreKind = id === 'drop4' ? 'big' : id === 'midas' ? 'midas' : id === 'drill' ? 'drill' : 'ore';
    const value = id === 'drop4' ? HEAVY_VALUE
      : id === 'midas' ? MIDAS_VALUE
        : id === 'drill' ? DRILL_VALUE
          : DROP_VALUE * (id === 'base' && this.shardDropper ? SHARD_DROPPER_MULT : 1);
    this.seed = (this.seed * 16807) % 2147483647;
    this.ores.push({ kind, x: DROPPER_X[id], age: 0, value, raw: true, tier: 0, passed: 0, seed: this.seed % 997 });
    this.dropFlash[id] = 1;
  }

  /** One piece meets one upgrader. False when the Dragon ate it. */
  private upgrade(id: UpgraderId, o: Ore): boolean {
    const flat = o.kind === 'drill' ? DRILL_FLAT_SHARE : 1;
    switch (id) {
      case 'up1':
      case 'up2': o.value += FLAT_BONUS * flat; break;
      case 'up3': o.value *= MULT_BONUS; break;
      case 'tunnel': o.value = (o.value + TUNNEL_FLAT * flat) * TUNNEL_MULT; break;
      case 'dragon':
        if (Math.random() < DRAGON_BURN_CHANCE) return false;
        o.value *= DRAGON_MULT;
        break;
    }
    o.raw = false;
    o.tier++;
    return true;
  }

  /** What the refiner makes of a piece worth `o.value`. */
  refine(o: Ore): number {
    let v = o.value * REFINER_MULT[this.refinerLevel - 1];
    if (this.glory.has('shredder') && o.raw) v *= SHREDDER_RAW_MULT;
    if (this.glory.has('furnace')) v *= 1 + this.heat * FURNACE_MAX_BONUS;
    return v;
  }

  update(dtMs: number, ev: TycoonEvents): void {
    const dt = dtMs / 1000;
    for (const k of Object.keys(this.dropFlash) as DropperId[]) this.dropFlash[k] = Math.max(0, (this.dropFlash[k] ?? 0) - dt * 4);
    for (const k of Object.keys(this.upFlash) as UpgraderId[]) this.upFlash[k] = Math.max(0, (this.upFlash[k] ?? 0) - dt * 4);
    this.refineFlash = Math.max(0, this.refineFlash - dt * 4);
    this.heat = Math.max(0, this.heat - FURNACE_COOL_PER_SEC * dt);

    // Droppers.
    for (const id of this.droppers()) {
      if (id === 'midas') {
        // One piece at a time: the next is cut only after the last one is gone.
        if (this.ores.some((o) => o.kind === 'midas')) { this.clocks.midas = MIDAS_REARM_MS; continue; }
        const left = (this.clocks.midas ?? MIDAS_REARM_MS) - dtMs;
        if (left > 0) { this.clocks.midas = left; continue; }
        this.clocks.midas = MIDAS_REARM_MS;
        this.spawn('midas');
        ev.dropped?.('midas');
        continue;
      }
      let left = (this.clocks[id] ?? this.interval(id)) - dtMs;
      while (left <= 0) {
        left += this.interval(id);
        this.spawn(id);
        ev.dropped?.(id);
      }
      this.clocks[id] = left;
    }

    // The belt.
    const ups = this.upgraders();
    for (let i = this.ores.length - 1; i >= 0; i--) {
      const o = this.ores[i];
      o.age += dtMs;
      if (o.age < FALL_MS) continue;
      const from = o.x;
      o.x += BELT_SPEED * dt;
      let gone = false;
      for (let u = 0; u < ups.length; u++) {
        const id = ups[u];
        const ux = UPGRADER_X[id];
        const bit = 1 << Object.keys(UPGRADER_X).indexOf(id);
        if (o.passed & bit || from > ux || o.x < ux) continue;
        o.passed |= bit;
        this.upFlash[id] = 1;
        if (this.upgrade(id, o)) {
          ev.upgraded?.(id, o);
        } else {
          ev.burned?.(ux);
          gone = true;
          break;
        }
      }
      if (gone) { this.ores.splice(i, 1); continue; }
      if (o.x < BELT_X1) continue;
      this.ores.splice(i, 1);
      if (this.glory.has('furnace')) this.heat = Math.min(1, this.heat + FURNACE_HEAT_PER_ORE);
      this.refineFlash = 1;
      ev.paid(this.refine(o));
    }
  }

  /** Where a piece is drawn, strip-local: falling from the spout, then riding the belt. */
  static orePos(o: Ore): { x: number; y: number } {
    if (o.age >= FALL_MS) return { x: o.x, y: BELT_Y - 4 };
    const u = o.age / FALL_MS;
    return { x: o.x, y: SPOUT_Y + (BELT_Y - 4 - SPOUT_Y) * u * u };
  }
}
