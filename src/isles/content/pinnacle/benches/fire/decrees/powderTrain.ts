import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { EMB } from '../art';
import { WHO, alive, clamp, dist, side, stepDt } from './util';

/**
 * Decree of the Powder Train — Councilor Ignatia Corne, Seat of the Powder.
 *
 * Corne wrote the magazine clause (every grain on the isle belongs to the crown) and appointed
 * Prince Fuse. Her floor is laid like a magazine's: twelve charges of black powder in glass kegs,
 * joined by trains of powder poured along the floor.
 *
 *  - Any blow — a shot, an AoE, a punch, the bot's own casts — on a charge lights it. It fizzes
 *    (its blast ring fills) and goes up, hurting EITHER fighter inside.
 *  - From a charge that goes up, fire runs every unburnt train leading off it, visibly, and every
 *    charge it reaches fizzes and goes up in turn — a chain across the floor.
 *  - Burnt trains are re-poured after a while; spent charges are re-set.
 *
 * Shots fly on through a charge (it is a thing on the floor, not a shield), so a musket fired at
 * someone lights every keg it crosses. A perfected Gunpowder bot knows the trains: it finds the
 * charge nearest you, follows the train back to a charge it can shoot through, and stands so its
 * volley crosses it. A clever player reads the same map: light the far end of the train he is
 * standing at the end of, and be anywhere else.
 */

const SPARK_SPEED = 300;
const FIZZ_STRUCK = 700;
const FIZZ_CHAIN = 420;
const RESET_MS = 9000;
const RELAY_MS = 11000;
const POUR_MS = 900;
const BLAST_R = 84;

interface Charge { x: number; y: number; state: 'set' | 'fizz' | 'spent'; at: number; since: number; target: StrikeTarget | null }
interface Train { a: number; b: number; len: number; state: 'laid' | 'burning' | 'burnt'; from: number; start: number; at: number; laidAt: number; grains: Pt[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const DMG = ctx.hard ? 20 : 16;
  const charges: Charge[] = [];
  const trains: Train[] = [];
  let started = false;
  let booms: { x: number; y: number; at: number }[] = [];

  // The magazine's floor plan: a jittered 4×3 lattice.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 140 + c * ((W - 280) / 3) + (rng() - 0.5) * 60 + (r % 2 ? 40 : -40);
      const y = top + 96 + r * ((H - top - 190) / 2) + (rng() - 0.5) * 50;
      charges.push({ x: clamp(x, 70, W - 70), y: clamp(y, top + 60, H - 50), state: 'set', at: 0, since: 0, target: null });
    }
  }
  const link = (a: number, b: number) => {
    const A = charges[a], B = charges[b];
    const len = dist(A.x, A.y, B.x, B.y);
    const grains: Pt[] = [];
    const n = Math.round(len / 9);
    for (let i = 0; i <= n; i++) grains.push({ x: A.x + ((B.x - A.x) * i) / n + (rng() - 0.5) * 5, y: A.y + ((B.y - A.y) * i) / n + (rng() - 0.5) * 5 });
    trains.push({ a, b, len, state: 'laid', from: a, start: 0, at: 0, laidAt: -9999, grains });
  };
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      if (c < 3) link(i, i + 1);
      if (r < 2) link(i, i + 4);
      if (c < 3 && r < 2 && rng() < 0.45) link(i, i + 5);
      else if (c > 0 && r < 2 && rng() < 0.3) link(i, i + 3);
    }
  }

  function light(i: number, time: number, fizz: number): void {
    const ch = charges[i];
    if (ch.state !== 'set') return;
    ch.state = 'fizz';
    ch.since = time;
    ch.at = time + ctx.tk.warn(fizz);
    ctx.sfx('sizzle');
  }

  function blow(i: number, time: number): void {
    const ch = charges[i];
    ch.state = 'spent';
    ch.at = time + RESET_MS;
    ctx.tk.boom(ch.x, ch.y, BLAST_R, EMB.hot);
    ctx.sfx('explosion-small');
    booms.push({ x: ch.x, y: ch.y, at: time });
    for (const w of WHO) {
      const f = side(ctx, w);
      if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, ch.x, ch.y) <= BLAST_R) ctx.hit(f, DMG, f.x, f.y);
    }
    for (const tr of trains) {
      if (tr.state !== 'laid' || (tr.a !== i && tr.b !== i)) continue;
      tr.state = 'burning';
      tr.from = i;
      tr.start = time;
      tr.at = time + (tr.len / SPARK_SPEED) * 1000;
    }
  }

  /** Charges reachable from `i` through set charges and laid trains (a chain's path). */
  function chainFrom(i: number): Set<number> {
    const seen = new Set<number>([i]);
    const q = [i];
    while (q.length) {
      const k = q.shift()!;
      for (const tr of trains) {
        if (tr.state !== 'laid') continue;
        const j = tr.a === k ? tr.b : tr.b === k ? tr.a : -1;
        if (j < 0 || seen.has(j) || charges[j].state !== 'set') continue;
        seen.add(j);
        q.push(j);
      }
    }
    return seen;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        charges.forEach((ch, i) => { ch.target = ctx.target({ x: ch.x, y: ch.y, r: 22, passThrough: true, onStruck: () => light(i, ctx.scene.time.now, FIZZ_STRUCK) }); });
      }
      charges.forEach((ch, i) => {
        if (ch.state === 'fizz' && time >= ch.at) blow(i, time);
        else if (ch.state === 'spent' && time >= ch.at) { ch.state = 'set'; ch.since = time; }
      });
      for (const tr of trains) {
        if (tr.state === 'burning' && time >= tr.at) {
          tr.state = 'burnt';
          tr.at = time + RELAY_MS;
          const far = tr.from === tr.a ? tr.b : tr.a;
          light(far, time, FIZZ_CHAIN);
        } else if (tr.state === 'burnt' && time >= tr.at) {
          tr.state = 'laid';
          tr.laidAt = time;
        }
      }
      booms = booms.filter((b) => time - b.at < 600);
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (!alive(n) || !alive(p)) return null;
      // Never stand by a charge that is about to go.
      for (const ch of charges) {
        if (ch.state === 'fizz' && dist(ch.x, ch.y, n.x, n.y) < BLAST_R + 46) {
          const a = Math.atan2(n.y - ch.y, n.x - ch.x);
          return { x: clamp(ch.x + Math.cos(a) * (BLAST_R + 90), 60, W - 60), y: clamp(ch.y + Math.sin(a) * (BLAST_R + 90), top + 60, H - 50) };
        }
      }
      // The charge at the challenger's feet, and the train back from it.
      let pi = -1, pd = 140;
      charges.forEach((ch, i) => { const d = dist(ch.x, ch.y, p.x, p.y); if (ch.state === 'set' && d < pd) { pd = d; pi = i; } });
      if (pi < 0) return null;
      let qi = -1, qd = Infinity;
      for (const j of chainFrom(pi)) {
        if (j === pi) continue;
        const ch = charges[j];
        if (dist(ch.x, ch.y, p.x, p.y) < 210) continue;
        const d = dist(ch.x, ch.y, n.x, n.y);
        if (d < qd) { qd = d; qi = j; }
      }
      if (qi < 0) return null;
      // Stand behind that charge as seen from the challenger, so a shot at them crosses it.
      const q = charges[qi];
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      return { x: clamp(q.x + Math.cos(a) * 150, 60, W - 60), y: clamp(q.y + Math.sin(a) * 150, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const tr of trains) drawTrain(g, tr, time);
      charges.forEach((ch) => drawCharge(g, ch, time));
      for (const b of booms) {
        const k = (time - b.at) / 600;
        g.fillStyle(EMB.core, 0.4 * (1 - k)); g.fillCircle(b.x, b.y, BLAST_R * (0.4 + k * 0.7));
        g.lineStyle(3 * (1 - k), EMB.hot, 1 - k); g.strokeCircle(b.x, b.y, BLAST_R * (0.6 + k * 0.6));
      }
    },

    drawAir(g, time) {
      // Sparks running the trains, and smoke where they have been.
      for (const tr of trains) {
        if (tr.state !== 'burning') continue;
        const k = clamp((time - tr.start) / (tr.at - tr.start), 0, 1);
        const A = charges[tr.from], B = charges[tr.from === tr.a ? tr.b : tr.a];
        const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k;
        g.fillStyle(EMB.hot, 0.25); g.fillCircle(x, y, 14);
        g.fillStyle(EMB.core, 1); g.fillCircle(x, y, 4);
        for (let i = 0; i < 7; i++) {
          const a = time / 40 + i * 0.9;
          const r = 6 + ((time / 25 + i * 13) % 14);
          g.fillStyle(i % 2 ? EMB.hot : EMB.core, 0.9); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r - 4, 1.3);
        }
        for (let i = 1; i <= 4; i++) {
          const kk = Math.max(0, k - i * 0.05);
          g.fillStyle(0x2a2428, 0.22 - i * 0.04); g.fillCircle(A.x + (B.x - A.x) * kk, A.y + (B.y - A.y) * kk - i * 7, 6 + i * 3);
        }
      }
      // A fizzing charge's fuse throws sparks up.
      for (const ch of charges) {
        if (ch.state !== 'fizz') continue;
        for (let i = 0; i < 8; i++) {
          const ph = ((time / 260) + i / 8) % 1;
          const a = -Math.PI / 2 + Math.sin(i * 2.1) * 0.9;
          g.fillStyle(i % 2 ? EMB.core : EMB.hot, 1 - ph); g.fillCircle(ch.x + 6 + Math.cos(a) * ph * 26, ch.y - 22 + Math.sin(a) * ph * 26 + ph * ph * 16, 1.5);
        }
      }
    },

    destroy() { for (const ch of charges) ch.target?.remove(); },
  };

  /** A train of black powder poured on the glass: dark grains, the odd glint; scorched once burnt. */
  function drawTrain(g: Phaser.GameObjects.Graphics, tr: Train, time: number): void {
    const A = charges[tr.a], B = charges[tr.b];
    if (tr.state === 'burnt') {
      g.lineStyle(5, 0x000000, 0.35); g.lineBetween(A.x, A.y, B.x, B.y);
      const left = clamp((tr.at - time) / RELAY_MS, 0, 1);
      for (let i = 0; i < tr.grains.length; i += 3) { g.fillStyle(EMB.ember, 0.5 * left * left); g.fillCircle(tr.grains[i].x, tr.grains[i].y, 1.2); }
      return;
    }
    let from = 0, to = tr.grains.length;
    let burntUpTo = -1;
    if (tr.state === 'burning') {
      const k = clamp((time - tr.start) / (tr.at - tr.start), 0, 1);
      const n = Math.floor(k * tr.grains.length);
      if (tr.from === tr.a) { burntUpTo = n; from = n; } else { burntUpTo = tr.grains.length - n; to = burntUpTo; }
    }
    // Being re-poured: the line grows from end a.
    const pour = clamp((time - tr.laidAt) / POUR_MS, 0, 1);
    if (pour < 1) to = Math.min(to, Math.floor(tr.grains.length * pour));
    g.lineStyle(7, 0x0a080a, 0.7);
    if (to - from > 1) g.lineBetween(tr.grains[from].x, tr.grains[from].y, tr.grains[to - 1].x, tr.grains[to - 1].y);
    for (let i = from; i < to; i++) {
      const p = tr.grains[i];
      g.fillStyle(i % 3 ? 0x1c181c : 0x2e2a30, 1); g.fillCircle(p.x, p.y, 2.2 + (i % 2));
      if (i % 7 === 0) { g.fillStyle(OBS.edge, 0.5); g.fillCircle(p.x - 1, p.y - 1, 0.8); }
    }
    if (burntUpTo >= 0) {
      const s = tr.from === tr.a ? 0 : burntUpTo, e = tr.from === tr.a ? burntUpTo : tr.grains.length;
      for (let i = s; i < e; i += 2) { g.fillStyle(EMB.ember, 0.55); g.fillCircle(tr.grains[i].x, tr.grains[i].y, 1.5); }
    }
    if (pour < 1 && to > 0) {
      const p = tr.grains[to - 1];
      g.fillStyle(OBS.edge, 0.6); g.fillCircle(p.x, p.y, 3);
    }
  }

  /** A charge: a squat glass keg bound in ember bands, a fuse stub; fizzing, its blast ring fills. */
  function drawCharge(g: Phaser.GameObjects.Graphics, ch: Charge, time: number): void {
    const { x, y } = ch;
    if (ch.state === 'spent') {
      const left = clamp((ch.at - time) / RESET_MS, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4, 54, 24);
      g.lineStyle(2, EMB.ember, 0.6 * left); g.strokeEllipse(x, y + 4, 54, 24);
      for (let i = 0; i < 6; i++) { g.fillStyle(OBS.facet, 0.8); g.fillTriangle(x - 26 + i * 10, y + 8, x - 20 + i * 10, y + 8, x - 23 + i * 10, y - 2 + (i % 2) * 4); }
      return;
    }
    const fade = ch.state === 'set' ? clamp((time - ch.since) / 500, 0, 1) : 1;
    const fizz = ch.state === 'fizz' ? clamp((time - ch.since) / (ch.at - ch.since), 0, 1) : 0;
    if (ch.state === 'fizz') {
      g.fillStyle(0xff4a2a, 0.08 + fizz * 0.16); g.fillCircle(x, y, BLAST_R);
      g.lineStyle(2, 0xff5a3a, 0.5 + 0.4 * Math.sin(time / 40)); g.strokeCircle(x, y, BLAST_R);
      g.lineStyle(3, EMB.core, 0.8); g.beginPath(); g.arc(x, y, BLAST_R, -Math.PI / 2, -Math.PI / 2 + fizz * Math.PI * 2, false); g.strokePath();
    }
    const shake = fizz > 0 ? Math.sin(time / 25) * 1.5 * fizz : 0;
    g.fillStyle(0x000000, 0.35 * fade); g.fillEllipse(x, y + 12, 44, 14);
    g.fillStyle(OBS.glass, fade); g.fillEllipse(x + shake, y, 34, 40);
    g.fillStyle(OBS.facet, fade); g.fillEllipse(x + 6 + shake, y - 1, 16, 34);
    g.fillStyle(OBS.sheen, 0.6 * fade); g.fillEllipse(x + 9 + shake, y - 6, 4, 18);
    for (const by of [-11, 0, 11]) { g.lineStyle(2, fizz > 0 ? lit(EMB.ember, fizz * 0.6) : dim(EMB.ember, 0.15), fade); g.lineBetween(x - 16 + shake, y + by, x + 16 + shake, y + by); }
    g.lineStyle(1, OBS.edge, 0.6 * fade); g.strokeEllipse(x + shake, y, 34, 40);
    g.fillStyle(OBS.sheen, fade); g.fillEllipse(x + shake, y - 18, 22, 7);
    // The fuse, burning down while it fizzes.
    const fl = 14 * (1 - fizz);
    g.lineStyle(2, 0x3a3034, fade); g.lineBetween(x + 4 + shake, y - 19, x + 8 + shake, y - 19 - fl);
    if (fizz > 0) { g.fillStyle(EMB.core, 1); g.fillCircle(x + 8 + shake, y - 19 - fl, 3); }
  }
}

export const POWDER_TRAIN: GimmickDef = {
  id: 'bench-fire-powder-train',
  rules: 'The floor is laid in trains: a struck charge fires every line from it, and every charge the fire reaches shall go up.',
  make,
};
