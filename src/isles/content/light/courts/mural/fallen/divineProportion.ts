import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GOLD, GOLD_DARK, GOLD_LIT, SIDE_NPC, SIDE_PLAYER, STONE_DARK, TIMBER_DARK } from '../palette';
import { clamp, dist, stepDt } from '../util';
import { alive, bar, framePlate, halfDown } from './common';

/**
 * The Divine Proportion — Melchior Sesquin, Keeper of the Canon (metal).
 *
 * The Canon lays down where the eye must fall in every picture of the Despot: on the golden
 * section, never the middle. Its keeper carries the instrument that finds it — a golden-mean
 * gauge, three brass legs on one pivot, so built that however wide the outer legs open, the middle
 * leg always stands at the golden point between them. In this yard the outer legs are planted on
 * the two fighters, and every few beats the middle leg comes down on the golden point like a seal.
 *
 * The golden point is never in the middle: it lies 0.618 of the way from one leg to the other, so
 * it always sits nearer one fighter — the "short end". Stand far from your foe and it falls
 * harmlessly between you; let him close in and it lands on you. It tracks while it is raised, then
 * locks (the ring goes solid) a moment before it stamps, so a step clears it. The gauge's
 * thumbscrew hangs off the pivot: strike it and the short end swings to your foe's side — then it
 * is he who must keep away. Below half the Canon divides again: a second, smaller section stamps
 * between the first and the short end.
 */

const ID = fallenId('mural', 'divine-proportion');
const PHI = 0.6180339887;
const R = 54;
const TRACK_MS = 1350;
const LOCK_MS = 650;
const REST_MS = 1000;
const FLIP_CD = 1600;

type Phase = 'track' | 'lock' | 'rest';

interface Seal { x: number; y: number; at: number; r: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  /** The gauge's long arm starts at `from`; the golden point lies nearer `to`. */
  let from: Fighter = npc;
  let to: Fighter = player;
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let lastFlip = -1e9;
  let started = false;
  let locked: Pt[] = [];
  const seals: Seal[] = [];
  let swingAt = -1e9;

  const golden = (): Pt => ({ x: from.x + (to.x - from.x) * PHI, y: from.y + (to.y - from.y) * PHI });
  const inner = (gp: Pt): Pt => ({ x: gp.x + (to.x - gp.x) * PHI, y: gp.y + (to.y - gp.y) * PHI });
  const points = (): Pt[] => {
    const gp = golden();
    return halfDown(npc) ? [gp, inner(gp)] : [gp];
  };
  /** The pivot hangs above the midpoint, a little off the line so it is not struck by every shot. */
  const pivot = (): Pt => {
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    const dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return { x: clamp(mx + nx * 70, 40, W - 40), y: clamp(my + ny * 70, top + 30, H - 30) };
  };

  const screw: StrikeTarget = ctx.target({
    ...pivot(), r: 22,
    onStruck: (by) => {
      const now = ctx.scene.time.now;
      if (now - lastFlip < FLIP_CD) return;
      const want = by === 'player' ? npc : player;
      if (want === to) return;
      to = want; from = want === npc ? player : npc;
      lastFlip = now; swingAt = now;
      if (phase === 'lock') locked = points();
      ctx.sfx('gear-turn');
    },
  });

  function stamp(now: number): void {
    ctx.sfx('anvil');
    for (const p of locked) {
      seals.push({ x: p.x, y: p.y, at: now, r: R });
      for (const f of [player, npc]) {
        if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, p.x, p.y) > R + 16) continue;
        ctx.hit(f, f === npc ? 28 : 22, f.x, f.y);
        ctx.root(f, 450);
      }
    }
  }

  const leg = (g: Phaser.GameObjects.Graphics, a: Pt, b: Pt, w: number, alpha: number): void => {
    g.lineStyle(w + 3, dim(GOLD_DARK, 0.35), alpha); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, GOLD, alpha); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1.2, GOLD_LIT, alpha); g.lineBetween(a.x - 1, a.y - 1, b.x - 1, b.y - 1);
    // Graduations engraved down the leg.
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (l || 1), uy = (b.y - a.y) / (l || 1);
    g.lineStyle(1, GOLD_DARK, alpha * 0.8);
    for (let s = 24; s < l - 16; s += 18) g.lineBetween(a.x + ux * s - uy * 3, a.y + uy * s + ux * 3, a.x + ux * s + uy * 3, a.y + uy * s - ux * 3);
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; phase = 'rest'; phaseAt = time + 600; }
      screw.moveTo(pivot().x, pivot().y);
      const t = time - phaseAt;
      if (phase === 'rest' && t >= REST_MS) { phase = 'track'; phaseAt = time; ctx.sfx('clock-tick'); }
      else if (phase === 'track' && t >= TRACK_MS) { phase = 'lock'; phaseAt = time; locked = points(); ctx.sfx('gear-turn'); }
      else if (phase === 'lock' && t >= LOCK_MS) { stamp(time); phase = 'rest'; phaseAt = time; }
      for (let i = seals.length - 1; i >= 0; i--) if (time - seals[i].at > 1800) seals.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const pts = phase === 'lock' ? locked : points();
      // A seal about to land on him: step straight out of it.
      if (phase !== 'rest') for (const p of pts) {
        const d = dist(npc.x, npc.y, p.x, p.y);
        if (d < R + 60) {
          const a = d > 2 ? Math.atan2(npc.y - p.y, npc.x - p.x) : Math.atan2(npc.y - player.y, npc.x - player.x);
          return { x: clamp(p.x + Math.cos(a) * (R + 90), 60, W - 60), y: clamp(p.y + Math.sin(a) * (R + 90), top + 50, H - 40) };
        }
      }
      const pv = pivot();
      // The short end is his: get to the thumbscrew and swing it back.
      if (to === npc && ctx.scene.time.now - lastFlip >= FLIP_CD) {
        const a = Math.atan2(npc.y - pv.y, npc.x - pv.x);
        return { x: clamp(pv.x + Math.cos(a) * 90, 60, W - 60), y: clamp(pv.y + Math.sin(a) * 90, top + 50, H - 40) };
      }
      if (to === npc) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 330, 60, W - 60), y: clamp(player.y + Math.sin(a) * 330, top + 50, H - 40) };
      }
      // The short end is the stranger's: crowd in, so the golden point falls on them.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.sin(ctx.scene.time.now / 1800) * 0.5;
      return { x: clamp(player.x + Math.cos(a) * 165, 60, W - 60), y: clamp(player.y + Math.sin(a) * 165, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The chalked rule between the legs, graduated at both golden sections.
      g.lineStyle(1.5, STONE_DARK, 0.4);
      const dx = to.x - from.x, dy = to.y - from.y;
      for (let s = 0; s < 1; s += 0.05) g.lineBetween(from.x + dx * s, from.y + dy * s, from.x + dx * (s + 0.025), from.y + dy * (s + 0.025));
      for (const k of [1 - PHI, PHI]) {
        const px = from.x + dx * k, py = from.y + dy * k, l = Math.hypot(dx, dy) || 1;
        g.lineStyle(2, GOLD_DARK, 0.5); g.lineBetween(px - dy / l * 9, py + dx / l * 9, px + dy / l * 9, py - dx / l * 9);
      }
      // The pressed seals: a golden spiral in a ring, fading off the flags.
      for (const s of seals) {
        const k = (time - s.at) / 1800;
        g.fillStyle(GOLD_LIT, 0.5 * (1 - k)); g.fillCircle(s.x, s.y, s.r * (1 + k * 0.15));
        g.lineStyle(3, GOLD_DARK, 0.8 * (1 - k)); g.strokeCircle(s.x, s.y, s.r);
        spiral(g, s.x, s.y, s.r * 0.85, GOLD_DARK, 0.8 * (1 - k), 0);
      }
      if (phase === 'rest') return;
      const pts = phase === 'lock' ? locked : points();
      const k = phase === 'lock' ? (time - phaseAt) / LOCK_MS : (time - phaseAt) / TRACK_MS;
      for (const p of pts) {
        if (phase === 'track') {
          g.lineStyle(2, GOLD, 0.55);
          for (let s = 0; s < 16; s++) { const a = s * 0.3927 + time / 700; g.beginPath(); g.arc(p.x, p.y, R, a, a + 0.22, false); g.strokePath(); }
          spiral(g, p.x, p.y, R * 0.8 * k, GOLD, 0.35, time / 900);
        } else {
          g.fillStyle(GOLD, 0.18 + 0.3 * k); g.fillCircle(p.x, p.y, R);
          g.lineStyle(3, GOLD_DARK, 0.9); g.strokeCircle(p.x, p.y, R);
          spiral(g, p.x, p.y, R * 0.85, GOLD_DARK, 0.8, 0);
        }
      }
    },

    drawAir(g, time) {
      if (!alive(player) || !alive(npc)) return;
      const pv = pivot();
      const swing = clamp((time - swingAt) / 320, 0, 1);
      const hub = { x: pv.x, y: pv.y - 18 + (1 - swing) * Math.sin(time / 30) * 4 };
      // The middle leg is raised while it tracks and comes down while it locks.
      const pts = phase === 'lock' ? locked : points();
      const drop = phase === 'lock' ? clamp((time - phaseAt) / LOCK_MS, 0, 1) : phase === 'track' ? 0 : 1;
      leg(g, hub, { x: from.x, y: from.y - 12 }, 6, 0.9);
      leg(g, hub, { x: to.x, y: to.y - 12 }, 6, 0.9);
      pts.forEach((p, i) => {
        const lift = (1 - drop) * 46;
        const tip = { x: p.x, y: p.y - 10 - lift };
        leg(g, hub, tip, i === 0 ? 5 : 3.5, 0.95);
        // The seal on the middle leg's foot.
        g.fillStyle(GOLD_DARK, 1); g.fillEllipse(tip.x, tip.y + 4, 22, 9);
        g.fillStyle(GOLD, 1); g.fillEllipse(tip.x, tip.y + 2, 20, 8);
        g.lineStyle(1, GOLD_LIT, 1); g.strokeEllipse(tip.x, tip.y + 2, 12, 4);
      });
      // Legs' points where they stand on the fighters.
      for (const f of [from, to]) {
        g.fillStyle(GOLD_DARK, 1); g.fillTriangle(f.x - 4, f.y - 14, f.x + 4, f.y - 14, f.x, f.y - 4);
      }
      // The pivot: a gilt boss with the thumbscrew's knurled head.
      g.fillStyle(0x000000, 0.25); g.fillCircle(hub.x + 2, hub.y + 3, 15);
      g.fillStyle(GOLD_DARK, 1); g.fillCircle(hub.x, hub.y, 15);
      g.fillStyle(GOLD, 1); g.fillCircle(hub.x, hub.y, 12);
      g.lineStyle(1.5, GOLD_DARK, 1); g.strokeCircle(hub.x, hub.y, 7);
      g.lineBetween(hub.x, hub.y - 7, hub.x, hub.y + 7);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(hub.x - 4, hub.y - 4, 3);
      const screwC = time - lastFlip < FLIP_CD ? GOLD_DARK : lit(GOLD, 0.3);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(hub.x + 12, hub.y - 4, 10, 8);
      g.fillStyle(screwC, 1); g.fillRect(hub.x + 21, hub.y - 7, 8, 14);
      g.lineStyle(1, GOLD_DARK, 1); for (let s = -5; s <= 5; s += 3) g.lineBetween(hub.x + 21, hub.y + s, hub.x + 29, hub.y + s);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      framePlate(g, x, y, 200, 34);
      // The rule as a diagram: you, the foe, and where the golden point sits between you.
      const l = x - 78, r = x + 38, cy = y + 15;
      const pl = l, nl = r;
      g.lineStyle(2, TIMBER_DARK, 0.8); g.lineBetween(l, cy, r, cy);
      g.fillStyle(SIDE_PLAYER, 1); g.fillCircle(pl, cy, 5);
      g.fillStyle(SIDE_NPC, 1); g.fillCircle(nl, cy, 5);
      const fx = from === player ? pl : nl, tx = to === player ? pl : nl;
      const gx = fx + (tx - fx) * PHI;
      g.fillStyle(GOLD, 1); g.fillCircle(gx, cy, 6);
      g.lineStyle(1.5, GOLD_DARK, 1); g.strokeCircle(gx, cy, 6);
      spiral(g, gx, cy, 5, GOLD_DARK, 1, 0);
      if (halfDown(npc)) { const ix = gx + (tx - gx) * PHI; g.fillStyle(GOLD_LIT, 1); g.fillCircle(ix, cy, 3.5); }
      const k = phase === 'track' ? (time - phaseAt) / TRACK_MS * 0.7 : phase === 'lock' ? 0.7 + (time - phaseAt) / LOCK_MS * 0.3 : 0;
      bar(g, l, y + 24, r - l, 4, k, phase === 'lock' ? GOLD_DARK : GOLD);
      // Thumbscrew readiness.
      const ready = time - lastFlip >= FLIP_CD;
      g.fillStyle(ready ? GOLD : GOLD_DARK, 1); g.fillRect(x + 60, y + 9, 10, 16);
      g.lineStyle(1, GOLD_DARK, 1); for (let s = 0; s < 5; s++) g.lineBetween(x + 60, y + 11 + s * 3, x + 70, y + 11 + s * 3);
    },

    destroy() { screw.remove(); seals.length = 0; },
  };

}

/** A golden spiral drawn as a polyline of quarter turns growing by φ. */
function spiral(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, col: number, a: number, rot: number): void {
  if (r < 2) return;
  const b = Math.log(1 / PHI) / (Math.PI / 2);
  const turns = 3.2 * Math.PI;
  g.lineStyle(1.5, col, a); g.beginPath();
  for (let t = 0; t <= turns; t += 0.18) {
    const rr = r * Math.exp(b * (t - turns));
    const px = x + Math.cos(t + rot) * rr, py = y + Math.sin(t + rot) * rr;
    if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

export const FALLEN_DIVINE_PROPORTION: GimmickDef = {
  id: ID,
  rules: 'A gauge spans you both; its middle leg stamps the golden point, nearer one end. Keep your distance, or strike its screw to swing that end to him.',
  make,
};
