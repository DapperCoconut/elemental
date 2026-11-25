import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ARC, COPPER, COPPER_DARK, COPPER_LIT, INSULATOR, IRON_DARK, IRON_LIT, NORTH, NORTH_LIT, SLATE_DEEP, SOUTH, SOUTH_LIT, SPARK, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Induction — Coil-Winder Mattias Quellby, who wound the copper for Dr. Anode's laboratory and,
 * in the King's telling, wound the coils that ran the Prince's iron doors on the Underhill debtors.
 *
 * Everyone on the crag is a little magnet — the stone sees to that. Three great coils of wound
 * copper lie hooped on the yard. Pass a magnet through a coil and it makes current: run through a
 * hoop (or dash through it, which counts double) and the coil takes a charge in your colour. Strike
 * a coil from afar and it takes one too. Pass through a coil charged in the foe's colour and you
 * undo one of his charges first — Lenz's law, and the Winder's oldest lesson.
 *
 * At three charges the coil discharges: it sights the *other* fighter, crackles for a beat, and
 * throws a bolt onto the spot where they stood. Walk off the spot. And anyone standing inside a
 * coil when it fires is caught in the surge — stunned, whoever charged it. Past half, a spent coil
 * hands one charge on to its nearest neighbour.
 */

const ID = fallenId('lodestar', 'induction');
const HOOP_R = 56;
const FULL = 3;
const BOLT_R = 50;
const BOLT_DMG = 15;
const SURGE_DMG = 6;
const WARN_MS = 800;

type Side = 'player' | 'npc';
interface Coil { x: number; y: number; owner: Side | null; charge: number; t: StrikeTarget | null; firing: Bolt | null; spin: number }
interface Bolt { from: number; side: Side; x: number; y: number; at: number; fireAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const coils: Coil[] = [
    { x: W * 0.24, y: fy(0.32) }, { x: W * 0.76, y: fy(0.32) }, { x: W * 0.5, y: fy(0.76) },
  ].map((c, i) => ({ ...c, owner: null, charge: 0, t: null, firing: null, spin: i }));
  const bolts: Bolt[] = [];
  const inside = new Map<Fighter, number>();
  const reenter = new Map<string, number>();
  let started = false;
  let flashes: { x: number; y: number; at: number }[] = [];

  const sideOf = (f: Fighter): Side => (f === player ? 'player' : 'npc');
  const fighterOf = (s: Side): Fighter => (s === 'player' ? player : npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
  const half = () => npc.hp < npc.maxHp * 0.5;
  const colour = (s: Side | null) => (s === 'player' ? SOUTH : s === 'npc' ? NORTH : COPPER);
  const colourLit = (s: Side | null) => (s === 'player' ? SOUTH_LIT : s === 'npc' ? NORTH_LIT : COPPER_LIT);
  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };

  function charge(i: number, s: Side, n: number, time: number): void {
    const c = coils[i];
    if (c.firing) return;
    for (let k = 0; k < n; k++) {
      if (c.owner && c.owner !== s && c.charge > 0) { c.charge--; if (!c.charge) c.owner = null; continue; }
      c.owner = s;
      c.charge++;
    }
    ctx.sfx('electric-charge');
    if (c.owner && c.charge >= FULL) {
      const tgt = fighterOf(other(c.owner));
      const b: Bolt = { from: i, side: c.owner, x: tgt.x, y: tgt.y, at: time, fireAt: time + tk.warn(WARN_MS), done: false };
      c.firing = b;
      bolts.push(b);
      ctx.sfx('beam-charge');
    }
  }

  function fire(b: Bolt, time: number): void {
    b.done = true;
    const c = coils[b.from];
    const tgt = fighterOf(other(b.side));
    if (alive(tgt) && dist(tgt.x, tgt.y, b.x, b.y) < BOLT_R + 14) { hurt(tgt, BOLT_DMG); ctx.float(tgt.x, tgt.y - 46, 'INDUCED', '#a8d8ff'); }
    // The surge: anyone standing in the coil itself.
    for (const f of [player, npc]) {
      if (alive(f) && dist(f.x, f.y, c.x, c.y) < HOOP_R - 4) { ctx.stun(f, 650); hurt(f, SURGE_DMG); }
    }
    flashes.push({ x: b.x, y: b.y, at: time });
    ctx.sfx('thunder');
    c.owner = null; c.charge = 0; c.firing = null;
    if (half()) {
      let best = -1, bd = Infinity;
      coils.forEach((o, j) => { if (j !== b.from && !o.firing) { const d = dist(o.x, o.y, c.x, c.y); if (d < bd) { bd = d; best = j; } } });
      if (best >= 0) tk.schedule(200, () => charge(best, b.side, 1, ctx.scene.time.now));
    }
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        coils.forEach((c, i) => { c.t = ctx.target({ x: c.x, y: c.y, r: 30, passThrough: true, onStruck: (by) => charge(i, by, 1, ctx.scene.time.now) }); });
      }
      for (const c of coils) c.spin += c.charge * 0.02 + 0.004;
      // Passing a magnet through a hoop: count fresh entries, a dash counts double.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const was = inside.get(f) ?? -1;
        const now = coils.findIndex((c) => dist(f.x, f.y, c.x, c.y) < HOOP_R);
        if (now >= 0 && now !== was) {
          const key = `${sideOf(f)}:${now}`;
          if (time >= (reenter.get(key) ?? 0)) {
            reenter.set(key, time + 700);
            charge(now, sideOf(f), ctx.dashing(f) ? 2 : 1, time);
          }
        }
        inside.set(f, now);
      }
      for (const b of bolts) if (!b.done && time >= b.fireAt) fire(b, time);
      for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].done) bolts.splice(i, 1);
      flashes = flashes.filter((f) => time - f.at < 400);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // Off a bolt's spot, and out of any coil that is about to surge.
      for (const b of bolts) {
        if (b.side === 'player' && dist(npc.x, npc.y, b.x, b.y) < BOLT_R + 40) {
          const a = Math.atan2(npc.y - b.y, npc.x - b.x);
          return { x: clamp(b.x + Math.cos(a) * 140, 60, W - 60), y: clamp(b.y + Math.sin(a) * 140, top + 50, H - 50) };
        }
        const c = coils[b.from];
        if (dist(npc.x, npc.y, c.x, c.y) < HOOP_R + 20) {
          const a = Math.atan2(npc.y - c.y, npc.x - c.x);
          return { x: clamp(c.x + Math.cos(a) * 130, 60, W - 60), y: clamp(c.y + Math.sin(a) * 130, top + 50, H - 50) };
        }
      }
      // Otherwise run straight through the best coil: the one nearest full in its own colour,
      // or one of yours to undo. Aim past the far rim so the pass completes.
      let pick: Coil | null = null, ps = -Infinity;
      for (const c of coils) {
        if (c.firing) continue;
        const own = c.owner === 'npc' ? c.charge : c.owner === 'player' ? c.charge * 0.9 : 0.5;
        const s = own * 120 - dist(npc.x, npc.y, c.x, c.y) * 0.4;
        if (s > ps) { ps = s; pick = c; }
      }
      if (!pick) return null;
      const a = Math.atan2(pick.y - npc.y, pick.x - npc.x);
      const through: Pt = { x: pick.x + Math.cos(a) * (HOOP_R + 50), y: pick.y + Math.sin(a) * (HOOP_R + 50) };
      return { x: clamp(through.x, 60, W - 60), y: clamp(through.y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      coils.forEach((c) => drawCoil(g, c, time, colour(c.owner), colourLit(c.owner)));
      // A sighted spot: a ring of ground-sparks closing in, the coil's colour.
      for (const b of bolts) {
        const k = clamp((time - b.at) / Math.max(1, b.fireAt - b.at), 0, 1);
        const col = colourLit(b.side);
        g.fillStyle(col, 0.08 + k * 0.14); g.fillCircle(b.x, b.y, BOLT_R);
        g.lineStyle(2, col, 0.5 + k * 0.4); g.strokeCircle(b.x, b.y, BOLT_R);
        g.lineStyle(1.5, col, 0.7); g.strokeCircle(b.x, b.y, BOLT_R * (1 - k) + 6);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 300;
          g.lineBetween(b.x + Math.cos(a) * BOLT_R, b.y + Math.sin(a) * BOLT_R, b.x + Math.cos(a) * (BOLT_R - 10), b.y + Math.sin(a) * (BOLT_R - 10));
        }
      }
    },

    drawAir(g, time) {
      // The crackling sight-line from the coil to the spot.
      for (const b of bolts) {
        const c = coils[b.from];
        jag(g, c.x, c.y - 30, b.x, b.y - 10, time, colourLit(b.side), 1.5, 0.35 + 0.4 * clamp((time - b.at) / WARN_MS, 0, 1));
      }
      for (const f of flashes) {
        const k = 1 - (time - f.at) / 400;
        jag(g, f.x + 20, top - 10, f.x, f.y, f.at, SPARK, 4 * k, k);
        jag(g, f.x - 30, top - 10, f.x, f.y, f.at + 77, ARC, 2 * k, k);
        glow(g, f.x, f.y, 60, ARC, 0.1 * k, 3);
      }
    },

    drawHud(g) {
      // Three coil dials: pips in the charger's colour.
      coils.forEach((c, i) => {
        const x = W / 2 - 60 + i * 60, y = H - 20;
        g.fillStyle(SLATE_DEEP, 0.85); g.fillRoundedRect(x - 24, y - 12, 48, 22, 6);
        g.lineStyle(2, COPPER, 1); g.strokeCircle(x - 14, y - 1, 6);
        g.lineStyle(1, COPPER_LIT, 1); g.strokeCircle(x - 14, y - 1, 3.5);
        for (let k = 0; k < FULL; k++) {
          g.fillStyle(k < c.charge ? colourLit(c.owner) : IRON_DARK, 1);
          g.fillCircle(x - 2 + k * 9, y - 1, 3.2);
        }
      });
    },

    destroy() { for (const c of coils) c.t?.remove(); },
  };
}

/** A hooped coil: a timber cradle, many turns of copper wire lapped round a ring, glass insulators. */
function drawCoil(g: G, c: Coil, time: number, col: number, colLit: number): void {
  const rx = HOOP_R, ry = HOOP_R * 0.55;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x + 3, c.y + 6, rx * 2 + 16, ry * 2 + 10);
  // Cradle blocks.
  for (const s of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(c.x + s * rx - 10, c.y - 6, 20, 14);
    g.fillStyle(TIMBER, 1); g.fillRect(c.x + s * rx - 9, c.y - 6, 18, 5);
  }
  // The ring: a thick dark core lapped with bright windings.
  g.lineStyle(14, COPPER_DARK, 1); g.strokeEllipse(c.x, c.y, rx * 2, ry * 2);
  g.lineStyle(9, COPPER, 1); g.strokeEllipse(c.x, c.y - 1, rx * 2, ry * 2);
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * Math.PI * 2;
    const x = c.x + Math.cos(a) * rx, y = c.y - 1 + Math.sin(a) * ry;
    const nx = Math.cos(a), ny = Math.sin(a) * 0.55;
    g.lineStyle(1.3, k % 2 ? COPPER_LIT : COPPER_DARK, 0.9);
    g.lineBetween(x - nx * 6, y - ny * 6 - 2, x + nx * 6, y + ny * 6 + 2);
  }
  // Charge: the windings glow in the charger's colour, a current running round them.
  if (c.charge > 0) {
    g.lineStyle(4, colLit, 0.25 + c.charge * 0.18); g.strokeEllipse(c.x, c.y - 1, rx * 2, ry * 2);
    for (let k = 0; k < c.charge * 2; k++) {
      const a = c.spin * 6 + (k / (c.charge * 2)) * Math.PI * 2;
      g.fillStyle(colLit, 1); g.fillCircle(c.x + Math.cos(a) * rx, c.y - 1 + Math.sin(a) * ry, 3);
    }
    glow(g, c.x, c.y, rx, col, 0.03 * c.charge, 3);
  }
  // Terminal posts with glass insulators and the lead-out wire.
  for (const s of [-1, 1]) {
    const px = c.x + s * 20, py = c.y - ry - 4;
    g.fillStyle(IRON_DARK, 1); g.fillRect(px - 2, py - 14, 4, 14);
    g.fillStyle(INSULATOR, 0.9); g.fillEllipse(px, py - 16, 9, 6); g.fillEllipse(px, py - 21, 7, 5);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(px, py - 25, 2);
  }
  g.lineStyle(1.5, COPPER_LIT, 0.8); g.lineBetween(c.x - 20, c.y - ry - 29, c.x + 20, c.y - ry - 29);
}

/** A jagged bolt between two points, its kinks re-rolled a few times a second. */
function jag(g: G, x1: number, y1: number, x2: number, y2: number, seed: number, col: number, w: number, a: number): void {
  const n = 9;
  const s0 = Math.floor(seed / 70);
  g.lineStyle(w, col, clamp(a, 0, 1));
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const h = Math.sin((s0 + i) * 12.9898) * 43758.5453;
    const off = ((h - Math.floor(h)) - 0.5) * 22;
    const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
    g.lineTo(x1 + (x2 - x1) * t + (nx / l) * off, y1 + (y2 - y1) * t + (ny / l) * off);
  }
  g.lineTo(x2, y2); g.strokePath();
}

export const FALLEN_INDUCTION: GimmickDef = {
  id: ID,
  rules: 'Run through a copper coil, or strike it, to charge it in your colour. At three it bolts the other fighter\'s spot and stuns all inside it.',
  make,
};
