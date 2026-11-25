import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GOLD, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { heart, heartLine, pastHalf, progressArc, sideColor, slatePlate, type Side } from './common';

/**
 * Heart's Philtre — Philtre-Wife Zephyrine Rosegall of the potion row.
 *
 * She lobs her love-philtres at you: heart-shaped flasks that tumble through the air (their
 * landing ring chalked on the slate as they fly) and burst into a rose mist. Stand in the mist and
 * you are charmed: drawn toward her, your blows on her landing soft and hers on you hard.
 *
 * Dash to shake a charm off. Or strike a flask while it is still in the air: it bursts where it
 * is — and since it is on its way from her, that is over *her* — and she is charmed toward you
 * instead, her blows soft and yours hard. Past half she throws two at a time and the mist hangs on.
 */

const SLUG = 'philtre';
const VOLLEY_MS = 3300;
const VOLLEY_HALF_MS = 2700;
const FLIGHT_MS = 1050;
const ARC_H = 90;
const MIST_R = 78;
const MIST_MS = 3400;
const MIST_HALF_MS = 4600;
const CHARM_MS = 2000;
const IMMUNE_MS = 900;
const PULL = 125;
const SOFT = 0.5;
const HARD = 1.3;
const ROSE = 0xf06a9a;
const ROSE_LIT = 0xffb8d0;
const ROSE_DEEP = 0xa02a5a;

interface Vial { sx: number; sy: number; tx: number; ty: number; at: number; spin: number; target: StrikeTarget | null; done: boolean }
interface Mist { x: number; y: number; at: number; until: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const now = (): number => ctx.scene.time.now;
  let vials: Vial[] = [];
  let mists: Mist[] = [];
  const charmUntil: Record<Side, number> = { player: 0, npc: 0 };
  const immuneUntil: Record<Side, number> = { player: 0, npc: 0 };
  let nextVolley = 2400;
  let lastVolleyAt = 0;
  let turned = false;

  /** Where a flask is along its flight: its point on the slate, and how high it is over it. */
  function track(v: Vial, time: number): { x: number; y: number; h: number; k: number } {
    const k = clamp((time - v.at) / FLIGHT_MS, 0, 1);
    return { x: v.sx + (v.tx - v.sx) * k, y: v.sy + (v.ty - v.sy) * k, h: Math.sin(k * Math.PI) * ARC_H + (1 - k) * 30, k };
  }

  function burst(v: Vial, x: number, y: number, time: number): void {
    if (v.done) return;
    v.done = true;
    v.target?.remove(); v.target = null;
    mists.push({ x, y, at: time, until: time + (turned ? MIST_HALF_MS : MIST_MS), seed: Math.floor(ctx.rng() * 1000) });
    ctx.sfx('splash');
    ctx.sfx('sparkle');
  }

  function lob(tx: number, ty: number, time: number): void {
    const v: Vial = { sx: npc.x, sy: npc.y, tx: tk.clampX(tx, 60), ty: clamp(ty, top + 50, H - 50), at: time, spin: ctx.rng() * 6, target: null, done: false };
    v.target = ctx.target({
      x: v.sx, y: v.sy - 30, r: 16,
      // Only your blow breaks a flask: she throws them from her own hand and never fumbles one.
      onStruck: (by) => { if (by !== 'player') return; const p = track(v, now()); burst(v, p.x, p.y, now()); },
    });
    vials.push(v);
    ctx.sfx('whoosh');
  }

  const charmed = (s: Side): boolean => charmUntil[s] > now();

  return {
    update(time, dt) {
      const step = clamp(dt, 0, 0.1);
      if (!turned && pastHalf(npc)) { turned = true; ctx.banner('TWO AT A TIME', '#ffc8dc'); }
      if (time >= nextVolley && alive(npc) && alive(player)) {
        nextVolley = time + (turned ? VOLLEY_HALF_MS : VOLLEY_MS);
        lastVolleyAt = time;
        lob(player.x, player.y, time);
        if (turned) {
          const a = Math.atan2(player.y - npc.y, player.x - npc.x) + Math.PI / 2 * (ctx.rng() < 0.5 ? 1 : -1);
          lob(player.x + Math.cos(a) * 150, player.y + Math.sin(a) * 150, time);
        }
      }
      // Flasks in flight; on landing they burst where they were aimed.
      for (const v of vials) {
        if (v.done) continue;
        const p = track(v, time);
        v.target?.moveTo(p.x, p.y - p.h);
        if (p.k >= 1) burst(v, v.tx, v.ty, time);
      }
      vials = vials.filter((v) => !v.done);
      mists = mists.filter((m) => time < m.until);
      // The mist charms; a dash shakes it off.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (!alive(f)) continue;
        if (charmUntil[s] > time && ctx.dashing(f)) {
          charmUntil[s] = 0; immuneUntil[s] = time + IMMUNE_MS;
          ctx.sfx('snap-back');
          continue;
        }
        if (immuneUntil[s] > time || ctx.isAirborne(f)) continue;
        if (mists.some((m) => dist(f.x, f.y, m.x, m.y) < MIST_R)) {
          if (charmUntil[s] < time) ctx.sfx('status-debuff');
          charmUntil[s] = Math.max(charmUntil[s], time + CHARM_MS);
        }
      }
      // The charmed are drawn to their beloved.
      if (charmed('player') && alive(npc)) tk.pull(npc.x, npc.y, PULL, 140);
      if (charmed('npc') && alive(player)) {
        const d = dist(npc.x, npc.y, player.x, player.y);
        if (d > 60) ctx.nudge(npc, ((player.x - npc.x) / d) * 110 * step, ((player.y - npc.y) / d) * 110 * step);
      }
    },

    playerTakenMult: () => (charmed('player') ? HARD : 1) * (charmed('npc') ? SOFT : 1),
    npcTakenMult: () => (charmed('player') ? SOFT : 1) * (charmed('npc') ? HARD : 1),

    npcSeek() {
      // Out of any mist, and out from under any flask about to land.
      const t = now();
      const threats: { x: number; y: number }[] = [...mists, ...vials.filter((v) => !v.done && t - v.at > FLIGHT_MS * 0.4).map((v) => ({ x: v.tx, y: v.ty }))];
      for (const m of threats) {
        const d = dist(npc.x, npc.y, m.x, m.y);
        if (d < MIST_R + 30) {
          const a = d > 1 ? Math.atan2(npc.y - m.y, npc.x - m.x) : 1;
          return { x: tk.clampX(m.x + Math.cos(a) * (MIST_R + 80)), y: tk.clampY(m.y + Math.sin(a) * (MIST_R + 80)) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const m of mists) drawMist(g, m, time);
      for (const v of vials) {
        const p = track(v, time);
        // The landing ring, chalked as it flies, filling to the moment it lands.
        g.lineStyle(1.5, ROSE_LIT, 0.6); g.strokeCircle(v.tx, v.ty, MIST_R);
        progressArc(g, v.tx, v.ty, MIST_R + 4, p.k, ROSE, 0.8, 3);
        heartLine(g, v.tx, v.ty, 10, ROSE_LIT, 0.4 + p.k * 0.4, 1.4);
        shadow(g, p.x, p.y, 22 - p.h * 0.1, 7 - p.h * 0.03, 0.2 + (1 - p.h / ARC_H) * 0.15);
      }
      // The charmed: a rose ribbon from them to the one they now adore.
      for (const s of ['player', 'npc'] as Side[]) {
        if (charmUntil[s] <= time) continue;
        const f = fighter(s), o = fighter(s === 'player' ? 'npc' : 'player');
        ribbon(g, f.x, f.y - 8, o.x, o.y - 8, time);
      }
    },

    drawAir(g, time) {
      for (const v of vials) { const p = track(v, time); drawFlask(g, p.x, p.y - p.h, v.spin + time / 140, time); }
      for (const s of ['player', 'npc'] as Side[]) {
        if (charmUntil[s] <= time) continue;
        const f = fighter(s);
        const beat = 1 + Math.max(0, Math.sin(time / 110)) * 0.25;
        heart(g, f.x, f.y - 58, 7 * beat, ROSE, 0.85);
        heartLine(g, f.x, f.y - 58, 7 * beat + 2, ROSE_LIT, 0.9, 1.2);
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 900 + i / 3) % 1);
          heart(g, f.x + Math.sin(i * 2 + time / 300) * 16, f.y - 40 - ph * 30, 2.5, ROSE_LIT, 0.8 * (1 - ph));
        }
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 4;
      slatePlate(g, cx, y, 200, 30);
      const yy = y + 15;
      // The next flask, filling to the throw.
      const span = turned ? VOLLEY_HALF_MS : VOLLEY_MS;
      const k = clamp(1 - (nextVolley - time) / span, 0, 1);
      drawFlask(g, cx - 66, yy + 2, 0, time, 0.65);
      progressArc(g, cx - 66, yy, 12, k, ROSE_LIT, 0.9, 1.6);
      if (turned) drawFlask(g, cx - 44, yy + 2, 0, time, 0.5);
      if (time - lastVolleyAt < 250) glow(g, cx - 66, yy, 14, ROSE, 0.12, 2);
      // A heart for each side: filled while charmed.
      for (const [s, hx] of [['player', cx + 22], ['npc', cx + 62]] as [Side, number][]) {
        const on = charmUntil[s] > time;
        if (on) heart(g, hx, yy - 1, 7, ROSE, 1);
        heartLine(g, hx, yy - 1, 8, sideColor(s), 1, 1.6);
        if (on) progressArc(g, hx, yy, 13, (charmUntil[s] - time) / CHARM_MS, ROSE_LIT, 0.9, 1.5);
      }
    },

    destroy() { for (const v of vials) v.target?.remove(); vials = []; },
  };

  /** A heart-shaped cut-glass flask of rose philtre: faceted, corked, a ribbon at the neck. */
  function drawFlask(g: G, x: number, y: number, rot: number, time: number, s = 1): void {
    const wob = Math.sin(rot) * 3 * s;
    glow(g, x, y, 16 * s, ROSE, 0.06, 2);
    heart(g, x + wob * 0.2, y, 9 * s, dim(ROSE_DEEP, 0.1), 0.95);
    heart(g, x + wob * 0.2, y - 0.5 * s, 8 * s, ROSE, 0.9);
    // The liquid level and a bubble.
    g.fillStyle(lit(ROSE, 0.25), 0.6); g.fillEllipse(x - 3 * s, y - 3 * s, 6 * s, 3 * s);
    g.fillStyle(ROSE_LIT, 0.7); g.fillCircle(x + 3 * s, y + 1 * s + Math.sin(time / 120) * s, 1.3 * s);
    // Facets: two bright cuts.
    g.lineStyle(1, 0xffffff, 0.75); g.lineBetween(x - 6 * s, y - 5 * s, x - 2 * s, y + 2 * s); g.lineBetween(x + 2 * s, y - 6 * s, x + 5 * s, y - 2 * s);
    // Neck, cork, ribbon.
    g.fillStyle(lit(ROSE_LIT, 0.4), 0.9); g.fillRect(x - 2 * s + wob * 0.4, y - 13 * s, 4 * s, 5 * s);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 2.5 * s + wob * 0.5, y - 17 * s, 5 * s, 4 * s);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2.5 * s + wob * 0.5, y - 14 * s, 5 * s, 1 * s);
    const fl = Math.sin(time / 90 + rot) * 3 * s;
    g.lineStyle(1.6 * s, GOLD, 0.95);
    g.lineBetween(x + wob * 0.4, y - 10 * s, x - 7 * s, y - 6 * s + fl);
    g.lineBetween(x + wob * 0.4, y - 10 * s, x + 7 * s, y - 7 * s - fl);
  }

  /** A rose mist settled on the slate: layered puffs drifting, little heart bubbles rising. */
  function drawMist(g: G, m: Mist, time: number): void {
    const age = time - m.at;
    const fadeIn = clamp(age / 250, 0, 1), fadeOut = clamp((m.until - time) / 600, 0, 1);
    const a = fadeIn * fadeOut;
    const grow = 0.6 + 0.4 * clamp(age / 400, 0, 1);
    g.fillStyle(ROSE_DEEP, 0.12 * a); g.fillCircle(m.x, m.y, MIST_R * grow);
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2 + m.seed + time / 2600;
      const r = MIST_R * (0.35 + ((i * 37 + m.seed) % 50) / 100) * grow;
      const px = m.x + Math.cos(ang) * r * 0.8, py = m.y + Math.sin(ang) * r * 0.7;
      g.fillStyle(i % 2 ? ROSE : ROSE_LIT, 0.16 * a); g.fillCircle(px, py, 18 + (i % 3) * 6);
    }
    g.lineStyle(1.5, ROSE_LIT, 0.45 * a); g.strokeCircle(m.x, m.y, MIST_R);
    for (let i = 0; i < 6; i++) {
      const ph = ((age / 1300 + i / 6) % 1);
      heart(g, m.x + Math.sin(i * 1.9 + m.seed) * MIST_R * 0.6, m.y + Math.cos(i * 2.7) * MIST_R * 0.4 - ph * 26, 3, ROSE_LIT, 0.7 * (1 - ph) * a);
    }
    // A shard of the flask left in the middle.
    g.fillStyle(lit(ROSE_LIT, 0.4), 0.6 * a); g.fillTriangle(m.x - 4, m.y + 2, m.x + 3, m.y - 1, m.x, m.y + 5);
  }

  /** The ribbon of a charm: a rose band rippling between two people, heart-knots travelling along it. */
  function ribbon(g: G, x1: number, y1: number, x2: number, y2: number, time: number): void {
    const d = dist(x1, y1, x2, y2);
    if (d < 4) return;
    const nx = -(y2 - y1) / d, ny = (x2 - x1) / d;
    const pts: { x: number; y: number }[] = [];
    const n = Math.max(6, Math.floor(d / 18));
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.sin(t * Math.PI * 3 - time / 160) * 7 * Math.sin(t * Math.PI);
      pts.push({ x: x1 + (x2 - x1) * t + nx * w, y: y1 + (y2 - y1) * t + ny * w });
    }
    g.lineStyle(4, ROSE_DEEP, 0.35); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(2, ROSE_LIT, 0.8); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    for (let i = 0; i < 3; i++) {
      const t = ((time / 1100 + i / 3) % 1), idx = Math.floor(t * n);
      const p = pts[idx];
      heart(g, p.x, p.y, 3.5, ROSE, 0.9);
    }
  }
}

export const FALLEN_PHILTRE: GimmickDef = {
  id: fallenId('arcane', SLUG),
  rules: 'Her flasks burst into rose mist: stand in it and you are drawn to her, blows soft. Dash free. Strike a flask in the air to charm her instead.',
  make,
};
