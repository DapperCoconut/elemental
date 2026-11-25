import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow, mixC, mulberry, type G } from '../../../../../art/IsleArt';
import { rubberTree } from '../art';
import { CREPE, CREPE_DARK, IRON, IRON_LIT, LATEX, LATEX_DARK, LATEX_LIT, TOY_GREEN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Curdle — Odalys Spurge, Tapping-Ganger of the plantation: she walked the rows before dawn with
 * the tapping knife and the acid can, and knew every tree by the colour of its milk. In the King's
 * telling she was ganger over the earthed who were sent down to tap, and she curdled a man's
 * boots to the ground for a short cup.
 *
 * Rubber trees stand round the yard. Odalys scores the one nearest you — its spiral cut lights
 * down the bark — and it bleeds: a run of white latex creeps out across the floor toward where you
 * stood, puddling as it goes. Fresh milk is tacky (slow going for anyone). Every few seconds she
 * lifts the acid can over her head, the milk greens and bubbles, and then it *curdles*: every
 * fresh puddle sets solid at once, and whoever is standing in one is set fast in it. What is left
 * is crepe — dry, crinkled, springy, quick to walk on.
 *
 * Strike a tree and it bleeds at your foe — run milk under Odalys and let her own acid hold her.
 * Past halfway she cuts two trees at a time. The bot steps out of the milk when the can goes up.
 */

const ID = fallenId('bounce', 'curdle');
const RUN_SPEED = 78;
const RUN_MS = 4400;
const DROP = 26;
const DISC_R = 38;
const CUT_MS = 900;
const CREPE_MS = 14000;
const WARN_MS = 1400;

interface Tree { x: number; y: number; cutAt: number; bleedAt: number; bleedUntil: number; dx: number; dy: number; front: Pt; lastDrop: Pt; seed: number; tgt: StrikeTarget }
interface Disc { x: number; y: number; born: number; setAt: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const spots: Pt[] = [{ x: 78, y: top + 118 }, { x: W - 76, y: top + 126 }, { x: 84, y: H - 46 }, { x: W - 82, y: H - 50 }, { x: W / 2 + 20, y: top + 44 }];
  const trees: Tree[] = spots.map((p, i) => {
    const t: Tree = { x: p.x, y: p.y, cutAt: -1e9, bleedAt: -1e9, bleedUntil: -1e9, dx: 0, dy: 1, front: { ...p }, lastDrop: { ...p }, seed: 11 + i * 7, tgt: null as unknown as StrikeTarget };
    t.tgt = ctx.target({ x: p.x, y: p.y - 18, r: 24, onStruck: (by: Striker) => struck(t, by) });
    return t;
  });
  let discs: Disc[] = [];
  let started = false;
  let half = false;
  let nextCut = 0;
  let curdleAt = 0;

  const bleeding = (t: Tree, time: number) => time < t.bleedUntil;
  const fresh = (d: Disc) => d.setAt < 0;
  const radius = (d: Disc, time: number) => DISC_R * clamp((time - d.born) / 1100, 0.25, 1);
  const onMilk = (f: Fighter, time: number) => discs.some((d) => fresh(d) && dist(f.x, f.y, d.x, d.y) < radius(d, time) + 6);
  const onCrepe = (f: Fighter, time: number) => discs.some((d) => !fresh(d) && dist(f.x, f.y, d.x, d.y) < radius(d, time));

  /** Score a tree: its spiral lights, then it bleeds toward `at`. */
  function cut(t: Tree, at: Pt, time: number, delay: number): void {
    t.cutAt = time;
    t.bleedAt = time + delay;
    t.bleedUntil = t.bleedAt + RUN_MS;
    const d = Math.max(1, dist(t.x, t.y, at.x, at.y));
    t.dx = (at.x - t.x) / d; t.dy = (at.y - t.y) / d;
    t.front = { x: t.x + t.dx * 20, y: t.y + t.dy * 10 };
    t.lastDrop = { x: -1e4, y: -1e4 };
    ctx.sfx('slash');
  }
  function struck(t: Tree, by: Striker): void {
    const time = tk.now;
    if (bleeding(t, time) || time - t.cutAt < 600) return;
    const foe = by === 'player' ? npc : player;
    cut(t, { x: foe.x, y: foe.y }, time, 300);
  }

  function curdle(time: number): void {
    ctx.sfx('sizzle');
    for (const f of [player, npc]) {
      if (!alive(f) || !onMilk(f, time)) continue;
      if (f === player) { tk.hitPlayer(8, f.x, f.y); ctx.root(player, 1500); }
      else { ctx.hit(npc, 16, f.x, f.y); ctx.root(npc, 1700); ctx.float(f.x, f.y - 56, 'SET FAST', '#f2ead2'); }
      ctx.flash(f.x, f.y, LATEX_LIT);
    }
    for (const d of discs) if (fresh(d)) d.setAt = time;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextCut = time + 1500; curdleAt = time + 7500; }
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; ctx.banner('TWO TREES TO THE KNIFE', '#f2ead2'); }
      if (time >= nextCut && alive(player)) {
        nextCut = time + (half ? 3300 : 3700);
        const free = trees.filter((t) => !bleeding(t, time) && time - t.cutAt > 1500)
          .sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y));
        for (const t of free.slice(0, half ? 2 : 1)) cut(t, { x: player.x, y: player.y }, time, tk.warn(CUT_MS));
      }
      for (const t of trees) {
        if (time < t.bleedAt || time >= t.bleedUntil) continue;
        const nx = t.front.x + t.dx * RUN_SPEED * dt, ny = t.front.y + t.dy * RUN_SPEED * dt;
        if (nx < 36 || nx > W - 36 || ny < top + 20 || ny > H - 24) { t.bleedUntil = time; continue; }
        t.front = { x: nx, y: ny };
        if (dist(nx, ny, t.lastDrop.x, t.lastDrop.y) >= DROP) {
          t.lastDrop = { x: nx, y: ny };
          discs.push({ x: nx, y: ny, born: time, setAt: -1, seed: discs.length * 1.7 + t.seed });
        }
      }
      if (time >= curdleAt) {
        curdle(time);
        curdleAt = time + (half ? 6200 : 7400);
      }
      discs = discs.filter((d) => fresh(d) || time - d.setAt < CREPE_MS);
    },

    playerSpeedMult() { const t = tk.now; return onMilk(player, t) ? 0.66 : onCrepe(player, t) ? 1.12 : 1; },
    npcSpeedMult() { const t = tk.now; return onMilk(npc, t) ? 0.66 : onCrepe(npc, t) ? 1.12 : 1; },

    npcSeek() {
      const t = tk.now;
      if (curdleAt - t > WARN_MS + 600 || !onMilk(npc, t)) return null;
      // The can is up: out of the milk, onto crepe if there is any near.
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        for (const r of [70, 120]) {
          const p = { x: tk.clampX(npc.x + Math.cos(a) * r), y: tk.clampY(npc.y + Math.sin(a) * r) };
          const milk = discs.some((d) => fresh(d) && dist(p.x, p.y, d.x, d.y) < radius(d, t) + 22);
          if (milk) continue;
          const score = -r + (discs.some((d) => !fresh(d) && dist(p.x, p.y, d.x, d.y) < DISC_R) ? 60 : 0);
          if (score > bs) { bs = score; best = p; }
        }
      }
      return best;
    },

    drawGround(g, time) {
      const warn = clamp(1 - (curdleAt - time) / WARN_MS, 0, 1);
      for (const d of discs) if (!fresh(d)) drawCrepe(g, d, radius(d, time), time);
      for (const d of discs) if (fresh(d)) drawMilk(g, d, radius(d, time), warn, time);
      for (const t of trees) {
        if (time < t.bleedAt || time >= t.bleedUntil) continue;
        // The creeping tongue at the front of a run, and the channel back to the tree.
        g.lineStyle(9, LATEX, 0.9); g.lineBetween(t.x + t.dx * 12, t.y, t.front.x, t.front.y);
        g.lineStyle(3, LATEX_LIT, 0.8); g.lineBetween(t.x + t.dx * 12, t.y - 2, t.front.x, t.front.y - 2);
        g.fillStyle(LATEX_LIT, 1); g.fillEllipse(t.front.x + t.dx * 6, t.front.y + t.dy * 4, 16, 11);
      }
      for (const t of trees) {
        if (time >= t.bleedAt) continue;
        // Chalk arrow showing where a scored tree will run.
        const k = clamp((time - t.cutAt) / (t.bleedAt - t.cutAt), 0, 1);
        const ex = t.x + t.dx * 220, ey = t.y + t.dy * 220;
        g.lineStyle(2, LATEX_LIT, 0.2 + 0.5 * k); g.lineBetween(t.x, t.y, ex, ey);
        g.fillStyle(LATEX_LIT, 0.3 + 0.5 * k);
        g.fillTriangle(ex + t.dx * 12, ey + t.dy * 12, ex - t.dy * 8, ey + t.dx * 8, ex + t.dy * 8, ey - t.dx * 8);
      }
    },

    drawAir(g, time) {
      for (const t of trees) {
        rubberTree(g, t.x, t.y, 0.9, mulberry(t.seed), true);
        const cutK = time < t.bleedAt ? clamp((time - t.cutAt) / (t.bleedAt - t.cutAt), 0, 1) : bleeding(t, time) ? 1 : 0;
        if (cutK > 0) {
          // The fresh spiral score, lighting down the bark as the knife goes round.
          const turns = 2.2, steps = Math.ceil(24 * cutK);
          let px = t.x - 7, py = t.y - 92;
          for (let i = 1; i <= steps; i++) {
            const u = i / 24, a = u * turns * Math.PI * 2;
            const qx = t.x + Math.cos(a) * 7, qy = t.y - 92 + u * 66 + Math.sin(a) * 2;
            g.lineStyle(2.5, LATEX_LIT, 1); g.lineBetween(px, py, qx, qy);
            px = qx; py = qy;
          }
          if (bleeding(t, time)) for (let k = 0; k < 3; k++) {
            const dy = ((time / 6 + k * 13) % 30);
            g.fillStyle(LATEX_LIT, 1); g.fillCircle(t.x + 7, t.y - 26 + dy, 1.6);
          }
        }
      }
      // The acid can over Odalys's head while it is up.
      const warn = clamp(1 - (curdleAt - time) / WARN_MS, 0, 1);
      if (warn > 0 && alive(npc)) drawCan(g, npc.x + 18, npc.y - 78 - warn * 6, warn * 1.1, time);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      const period = half ? 6200 : 7400;
      const k = clamp(1 - (curdleAt - time) / period, 0, 1);
      g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 16);
      g.lineStyle(4, curdleAt - time < WARN_MS ? TOY_GREEN : LATEX_DARK, 1);
      g.beginPath(); g.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      drawCan(g, x, y + 6, k > 0.8 ? (k - 0.8) * 3 : 0, time, 0.6);
    },

    destroy() { for (const t of trees) t.tgt.remove(); },
  };
}

/** A puddle of fresh latex: lumpy white, a wrinkled skin, a wet highlight; it greens and bubbles under the can. */
function drawMilk(g: G, d: Disc, r: number, warn: number, time: number): void {
  const c = warn > 0 ? mixC(LATEX, 0xd8f0a0, warn * 0.35) : LATEX;
  g.fillStyle(LATEX_DARK, 0.9); g.fillEllipse(d.x, d.y + 3, r * 2.05, r * 1.35);
  g.fillStyle(c, 0.95);
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + d.seed; g.fillEllipse(d.x + Math.cos(a) * r * 0.35, d.y + Math.sin(a) * r * 0.2, r * 1.2, r * 0.8); }
  g.lineStyle(1, LATEX_DARK, 0.6);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(d.x + (i - 1) * r * 0.3, d.y + Math.sin(d.seed + i) * r * 0.2, r * 0.3, 3.4, 5.8, false); g.strokePath(); }
  g.fillStyle(LATEX_LIT, 0.9); g.fillEllipse(d.x - r * 0.3, d.y - r * 0.2, r * 0.5, r * 0.18);
  if (warn > 0) {
    g.fillStyle(TOY_GREEN, 0.18 * warn); g.fillEllipse(d.x, d.y, r * 2, r * 1.3);
    for (let i = 0; i < 3; i++) {
      const ph = ((time / 300 + i * 0.33 + d.seed) % 1);
      g.lineStyle(1, 0xd8f0a0, (1 - ph) * warn); g.strokeCircle(d.x + Math.cos(d.seed * 3 + i * 2) * r * 0.5, d.y + Math.sin(d.seed + i) * r * 0.3, 2 + ph * 4);
    }
  }
}

/** Set crepe: amber, crinkled in rows like the soles it will become, darker at the rim. */
function drawCrepe(g: G, d: Disc, r: number, time: number): void {
  const age = clamp((time - d.setAt) / CREPE_MS, 0, 1);
  const a = age > 0.8 ? (1 - age) * 5 : 1;
  g.fillStyle(CREPE_DARK, 0.85 * a); g.fillEllipse(d.x, d.y + 2, r * 2.05, r * 1.35);
  g.fillStyle(CREPE, 0.9 * a); g.fillEllipse(d.x, d.y, r * 1.9, r * 1.2);
  g.lineStyle(1, CREPE_DARK, 0.7 * a);
  for (let row = -2; row <= 2; row++) {
    const yy = d.y + row * r * 0.18, half = Math.sqrt(Math.max(0, 1 - (row * 0.18 / 0.6) ** 2)) * r * 0.85;
    let px = d.x - half, py = yy;
    for (let x = -half + 5; x <= half; x += 5) { const qx = d.x + x, qy = yy + ((x / 5) % 2 ? 1.5 : -1.5); g.lineBetween(px, py, qx, qy); px = qx; py = qy; }
  }
  if (time - d.setAt < 300) { const k = (time - d.setAt) / 300; g.lineStyle(3, LATEX_LIT, 1 - k); g.strokeEllipse(d.x, d.y, r * 2 + k * 20, r * 1.3 + k * 12); }
}

/** The acid can: a dented tin with a long spout, tipping as it pours; green drops off the lip. */
function drawCan(g: G, x: number, y: number, tip: number, time: number, s = 1): void {
  const a = clamp(tip, 0, 1) * 0.8;
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = (u: number, v: number) => ({ x: x + (u * ca - v * sa) * s, y: y + (u * sa + v * ca) * s });
  const body = [R(-10, -14), R(10, -14), R(11, 10), R(-11, 10)];
  g.fillStyle(IRON, 1); g.fillPoints(body, true);
  g.fillStyle(IRON_LIT, 1); g.fillPoints([R(-8, -12), R(-3, -12), R(-3, 8), R(-8, 8)], true);
  g.fillStyle(TOY_GREEN, 1); g.fillPoints([R(-10, -4), R(10, -4), R(10, 2), R(-10, 2)], true);
  const s0 = R(9, -10), s1 = R(24, -22);
  g.lineStyle(3 * s, IRON_LIT, 1); g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  const h0 = R(-6, -14), h1 = R(6, -14), hm = R(0, -22);
  g.lineStyle(1.5 * s, IRON_LIT, 1); g.lineBetween(h0.x, h0.y, hm.x, hm.y); g.lineBetween(hm.x, hm.y, h1.x, h1.y);
  if (tip > 0.6) {
    for (let k = 0; k < 3; k++) {
      const dy = ((time / 4 + k * 9) % 26) * s;
      g.fillStyle(0xb8f070, 1); g.fillCircle(s1.x + 1, s1.y + dy, 1.8 * s);
    }
    glow(g, s1.x, s1.y, 14 * s, TOY_GREEN, 0.06, 2);
  }
}

export const FALLEN_CURDLE: GimmickDef = {
  id: ID,
  rules: 'Scored trees bleed tacky latex at you. When the can goes up the milk curdles, holding whoever stands in it. Strike a tree to bleed it at her.',
  make,
};
