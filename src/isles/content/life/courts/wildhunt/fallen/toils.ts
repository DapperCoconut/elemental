import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ANTLER_DARK, BARK_DARK, ENDGRAIN, HUNT_RED, TIMBER, TIMBER_DARK, TIMBER_LIT, clamp, dist, segDist } from '../util';
import { EMBER, alive } from './kit';

/**
 * The Toils — Millicent Hurle, Toil-Mistress of the deer park: in the King's telling she pitched the
 * long nets — the *toils* — round the households that ran, and drew them in stake by stake until
 * there was nowhere left to run but into the mesh.
 *
 * Ten ash stakes stand in a ring round the fight with net strung between them. The ring draws in,
 * and its middle creeps after you. Touch the mesh and you are **tangled**: held, cut, and thrown
 * back inside. When it can draw no tighter it is struck and pitched wide again.
 *
 * Exploit: strike a stake and it falls inward, bringing both its nets down flat across the turf a
 * moment later — anyone under them is tangled hard. Drop the toils on Millicent. A felled stake leaves
 * a gap you can step out through until the re-pitch. At half, the drawing-rope is hauled: the ring
 * closes faster and walks round as it closes, so its stakes sweep the turf.
 */

const ID = fallenId('wildhunt', 'toils');
const N = 10;
const R_MAX = 400;
const R_MIN = 165;
const DROP_MS = 650;
const DROP_DEPTH = 80;

interface Stake { t: StrikeTarget; up: boolean; fellAt: number; landed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const midY = (top + H) / 2;
  let ccx = W / 2, ccy = midY;
  let R = R_MAX;
  let rot = 0;
  let hauled = false;
  let holdUntil = 0;
  let pitchedAt = 0;
  const tangledUntil = new Map<Fighter, number>();
  const immune = new Map<Fighter, number>();

  const pos = (i: number): { x: number; y: number } => {
    const a = rot + (i / N) * Math.PI * 2;
    return { x: ccx + Math.cos(a) * R, y: ccy + Math.sin(a) * R * 0.78 };
  };

  const stakes: Stake[] = [];
  for (let i = 0; i < N; i++) {
    const p = pos(i);
    const s: Stake = {
      up: true, fellAt: -1e9, landed: true,
      t: ctx.target({ x: p.x, y: p.y, r: 18, passThrough: true, onStruck: () => fell(s) }),
    };
    stakes.push(s);
  }

  /** A stake struck: it leans in, and its two nets come down a moment later. */
  function fell(s: Stake): void {
    if (!s.up) return;
    s.up = false; s.fellAt = tk.now; s.landed = false;
    ctx.sfx('trap-snap');
  }

  /** The panel between stake i and i+1 exists if both are up. */
  const panelUp = (i: number): boolean => stakes[i].up && stakes[(i + 1) % N].up;

  function tangle(f: Fighter, dmg: number, ms: number, time: number): void {
    if (time < (immune.get(f) ?? 0)) return;
    immune.set(f, time + 1500);
    tangledUntil.set(f, time + ms);
    ctx.root(f, ms);
    if (f === player) tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(npc, Math.round(dmg * 1.3), f.x, f.y);
    ctx.float(f.x, f.y - 52, 'TANGLED', f === player ? '#ffcf8a' : '#9ae8ff');
    ctx.sfx('trap-snap');
  }

  function repitch(time: number): void {
    R = R_MAX; pitchedAt = time; holdUntil = 0;
    ccx = clamp(player.x, W / 2 - 120, W / 2 + 120);
    ccy = clamp(player.y, midY - 50, midY + 50);
    for (const s of stakes) { s.up = true; s.landed = true; }
    ctx.sfx('stone-rise');
  }

  return {
    update(time, dt) {
      if (!pitchedAt) pitchedAt = time;
      if (!hauled && npc.hp < npc.maxHp * 0.5) {
        hauled = true;
        ctx.banner('THE DRAWING-ROPE', '#ffcf8a');
        ctx.sfx('chain');
      }
      // The ring draws in; its middle creeps after the player.
      if (R > R_MIN) R = Math.max(R_MIN, R - (hauled ? 13 : 9) * dt);
      else if (!holdUntil) holdUntil = time + 3200;
      else if (time >= holdUntil) repitch(time);
      if (hauled) rot += 0.11 * dt;
      const k = Math.min(1, (14 * dt) / Math.max(1, dist(ccx, ccy, player.x, player.y)));
      ccx = clamp(ccx + (player.x - ccx) * k, W / 2 - 160, W / 2 + 160);
      ccy = clamp(ccy + (player.y - ccy) * k, midY - 70, midY + 70);
      for (let i = 0; i < N; i++) { const p = pos(i); stakes[i].t.moveTo(p.x, p.y); }

      // Felled stakes bring their nets down flat, inward.
      for (let i = 0; i < N; i++) {
        const s = stakes[i];
        if (s.up || s.landed || time - s.fellAt < DROP_MS) continue;
        s.landed = true;
        ctx.sfx('hit-heavy');
        for (const f of [player, npc]) if (alive(f) && underDrop(i, f.x, f.y)) tangle(f, 16, 1400, time);
      }
      // Walking into a standing net.
      for (const f of [player, npc]) {
        if (!alive(f) || time - pitchedAt < 600) continue;
        for (let i = 0; i < N; i++) {
          if (!panelUp(i)) continue;
          const a = pos(i), b = pos((i + 1) % N);
          if (segDist(f.x, f.y, a.x, a.y, b.x, b.y) > 30) continue;
          tangle(f, 11, 850, time);
          const ix = ccx - f.x, iy = ccy - f.y, L = Math.hypot(ix, iy) || 1;
          ctx.nudge(f, (ix / L) * 46, (iy / L) * 46);
          break;
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // A falling net near her: out from under it.
      for (let i = 0; i < N; i++) {
        const s = stakes[i];
        if (s.up || s.landed) continue;
        if (underDrop(i, npc.x, npc.y) || underDrop((i + N - 1) % N, npc.x, npc.y)) return { x: tk.clampX(ccx), y: tk.clampY(ccy) };
      }
      // Otherwise the far side of the middle from you, so her pull drags you toward the mesh.
      const dx = ccx - player.x, dy = ccy - player.y, L = Math.hypot(dx, dy) || 1;
      const r = Math.min(R * 0.4, 120);
      return { x: tk.clampX(ccx + (dx / L) * r), y: tk.clampY(ccy + (dy / L) * r) };
    },

    drawGround(g, time) {
      // The ring's line on the turf, and fallen nets lying flat.
      g.lineStyle(2, ANTLER_DARK, 0.25);
      g.strokeEllipse(ccx, ccy, R * 2, R * 1.56);
      for (let i = 0; i < N; i++) {
        const s = stakes[i];
        if (s.up) continue;
        const k = s.landed ? 1 : clamp((time - s.fellAt) / DROP_MS, 0, 1);
        for (const j of [i, (i + N - 1) % N]) drawDrop(g, j, k, s.landed);
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < N; i++) if (panelUp(i)) drawNet(g, pos(i), pos((i + 1) % N), time, i);
      for (let i = 0; i < N; i++) drawStake(g, pos(i), stakes[i], time);
      for (const f of [player, npc]) if (alive(f) && time < (tangledUntil.get(f) ?? 0)) drawTangle(g, f.x, f.y, time);
    },

    drawHud(g) {
      // A coil of drawing-rope that pays out as the ring tightens; a knot for each standing stake.
      const x = W / 2, y = top + 16;
      const k = (R - R_MIN) / (R_MAX - R_MIN);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 80, y - 12, 160, 24, 8);
      g.lineStyle(3, ENDGRAIN, 1); g.strokeCircle(x - 64, y, 8);
      g.lineStyle(2, TIMBER_DARK, 1); g.strokeCircle(x - 64, y, 4);
      g.lineStyle(3, ENDGRAIN, 1); g.lineBetween(x - 56, y, x - 56 + 120 * k, y);
      g.lineStyle(1, TIMBER_DARK, 0.9);
      for (let d = 0; d < 120 * k; d += 6) g.lineBetween(x - 56 + d, y - 1.5, x - 53 + d, y + 1.5);
      for (let i = 0; i < N; i++) {
        g.fillStyle(stakes[i].up ? TIMBER_LIT : HUNT_RED, 1);
        g.fillCircle(x - 50 + i * 12, y + 8, 2.5);
      }
      if (hauled) { g.fillStyle(EMBER, 1); g.fillTriangle(x + 70, y - 6, x + 70, y + 6, x + 78, y); }
    },

    destroy() { for (const s of stakes) s.t.remove(); },
  };

  /** Is (x,y) under panel j's net as it falls inward from its line? */
  function underDrop(j: number, x: number, y: number): boolean {
    const a = pos(j), b = pos((j + 1) % N);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const ix = ccx - mx, iy = ccy - my, L = Math.hypot(ix, iy) || 1;
    const nx = ix / L, ny = iy / L;
    const depth = (x - a.x) * nx + (y - a.y) * ny;
    const ux = b.x - a.x, uy = b.y - a.y, len = Math.hypot(ux, uy) || 1;
    const along = ((x - a.x) * ux + (y - a.y) * uy) / len;
    return depth > -18 && depth < DROP_DEPTH + 18 && along > -18 && along < len + 18;
  }

  /** Panel j's net folding down inward (k 0→1), then lying in a heap of mesh. */
  function drawDrop(g: G, j: number, k: number, landed: boolean): void {
    const a = pos(j), b = pos((j + 1) % N);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const ix = ccx - mx, iy = ccy - my, L = Math.hypot(ix, iy) || 1;
    const d = DROP_DEPTH * k;
    const a2 = { x: a.x + (ix / L) * d, y: a.y + (iy / L) * d }, b2 = { x: b.x + (ix / L) * d, y: b.y + (iy / L) * d };
    if (!landed) {
      // Where it will land.
      const a3 = { x: a.x + (ix / L) * DROP_DEPTH, y: a.y + (iy / L) * DROP_DEPTH }, b3 = { x: b.x + (ix / L) * DROP_DEPTH, y: b.y + (iy / L) * DROP_DEPTH };
      g.fillStyle(HUNT_RED, 0.12 + k * 0.2); g.fillPoints([a, b, b3, a3], true);
      g.lineStyle(2, 0xff8a6a, 0.6); g.strokePoints([a, b, b3, a3], true);
    }
    g.fillStyle(0x000000, 0.18); g.fillPoints([a, b, b2, a2], true);
    for (let t = 0; t <= 1.001; t += 0.125) {
      g.lineStyle(1, ENDGRAIN, landed ? 0.55 : 0.8);
      g.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a2.x + (b2.x - a2.x) * (1 - t), a2.y + (b2.y - a2.y) * (1 - t));
      g.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a2.x + (b2.x - a2.x) * t, a2.y + (b2.y - a2.y) * t);
    }
    g.lineStyle(2.5, TIMBER_LIT, 0.8); g.lineBetween(a2.x, a2.y, b2.x, b2.y);
  }
}

/** A standing toil: head-rope and foot-rope between two stakes, diamond mesh, cork-and-bone toggles. */
function drawNet(g: G, a: { x: number; y: number }, b: { x: number; y: number }, time: number, i: number): void {
  const h = 34;
  const sag = 5 + Math.sin(time / 700 + i) * 2;
  const P = (t: number, up: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - up + Math.sin(t * Math.PI) * sag * (up > 0 ? 1 : 0.4) });
  g.fillStyle(0x000000, 0.15); g.fillPoints([P(0, 0), P(1, 0), P(1, -6), P(0, -6)], true);
  const cells = 9;
  for (let c = 0; c <= cells; c++) {
    const t0 = c / cells, t1 = Math.min(1, (c + 1) / cells);
    g.lineStyle(1, ENDGRAIN, 0.75);
    const p0 = P(t0, 4), p1 = P(t1, h), q0 = P(t0, h), q1 = P(t1, 4);
    if (c < cells) { g.lineBetween(p0.x, p0.y, p1.x, p1.y); g.lineBetween(q0.x, q0.y, q1.x, q1.y); }
  }
  const head0 = P(0, h);
  g.lineStyle(2.5, TIMBER_LIT, 1);
  g.beginPath(); g.moveTo(head0.x, head0.y);
  for (let t = 0.1; t <= 1.001; t += 0.1) { const p = P(t, h); g.lineTo(p.x, p.y); }
  g.strokePath();
  g.lineStyle(2, TIMBER, 1); g.lineBetween(P(0, 4).x, P(0, 4).y, P(1, 4).x, P(1, 4).y);
  for (let t = 0.2; t < 1; t += 0.3) { const p = P(t, h); g.fillStyle(HUNT_RED, 1); g.fillRect(p.x - 2, p.y - 2, 4, 4); }
}

/** An ash stake with a forked head where the ropes ride; leaning and falling once struck. */
function drawStake(g: G, p: { x: number; y: number }, s: Stake, time: number): void {
  if (!s.up && s.landed) {
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(p.x - 20, p.y - 2, p.x + 20, p.y + 3);
    g.lineStyle(2, TIMBER, 1); g.lineBetween(p.x - 20, p.y - 3, p.x + 20, p.y + 2);
    return;
  }
  const lean = s.up ? 0 : clamp((time - s.fellAt) / DROP_MS, 0, 1) * 1.2;
  const tx = p.x + Math.sin(lean) * 44, ty = p.y - Math.cos(lean) * 44;
  shadow(g, p.x, p.y + 2, 22, 8, 0.35);
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(p.x, p.y, tx, ty);
  g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(p.x - 1, p.y, tx - 1, ty);
  g.lineStyle(3, TIMBER_DARK, 1);
  g.lineBetween(tx, ty, tx - 6, ty - 8); g.lineBetween(tx, ty, tx + 6, ty - 8);
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(p.x, p.y, 12, 5);
  if (!s.up) glow(g, tx, ty, 20, 0xff6a4a, 0.1, 2);
}

/** Mesh thrown over a tangled fighter: a dome of knotted cord. */
function drawTangle(g: G, x: number, y: number, time: number): void {
  const wob = Math.sin(time / 60) * 1.5;
  g.lineStyle(1.5, ENDGRAIN, 0.9);
  for (let i = -3; i <= 3; i++) {
    g.lineBetween(x + i * 7 - 12, y - 40 + wob, x + i * 7 + 12, y + 10);
    g.lineBetween(x + i * 7 + 12, y - 40 + wob, x + i * 7 - 12, y + 10);
  }
  g.lineStyle(2.5, TIMBER_LIT, 1); g.strokeEllipse(x, y + 8, 46, 14);
}

export const FALLEN_TOILS: GimmickDef = {
  id: ID,
  rules: 'A ring of nets draws in round you; touch the mesh and you are tangled. Strike a stake to drop its nets flat inward — drop them on Millicent.',
  make,
};
