import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { OCHRE, RUST, crownMark } from '../art';
import { type Who, WHO, alive, clamp, dist, stepDt } from '../util';

/**
 * Decree of the Fetter — Councilor Gerrit Hask, Seat of Fetters (metal).
 *
 * Hask wrote the Interment: a household short of its weight is fettered until others quarry the
 * debt. Here both parties are fettered. Each wears an iron cuff on a heavy chain run to a staple
 * sunk in the glass; past the chain's length you go no further. Strike a staple and it is drawn
 * toward the striker — and its chain follows, and whoever wears it. Strike your own to walk free;
 * strike hers to haul her in. At ROLL CALL every chain is shortened at once and everyone is
 * dragged home to their staple.
 *
 * A perfected Metal wants you close, bleeding on its floor. Decide who is close to whom.
 */

type G = Phaser.GameObjects.Graphics;

interface Staple { x: number; y: number; target: StrikeTarget | null; last: Record<Who, number>; jolt: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const LEN = ctx.hard ? 210 : 235;
  const ROLL_LEN = 125;
  const ROLL_EVERY = ctx.hard ? 9500 : 11500;
  const ROLL_WARN = 1500;
  const ROLL_MS = 2400;
  const DRAW = 56;
  const staples: Record<Who, Staple> = {
    player: { x: 0, y: 0, target: null, last: { player: -9999, npc: -9999 }, jolt: -9999 },
    npc: { x: 0, y: 0, target: null, last: { player: -9999, npc: -9999 }, jolt: -9999 },
  };
  const taut: Record<Who, boolean> = { player: false, npc: false };
  let started = false;
  let rollAt = 0;
  let rollWarned = false;
  let rollUntil = 0;
  let firstDrag = true;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const rolling = (time: number): boolean => time < rollUntil;

  const struck = (owner: Who, by: Who) => {
    const s = staples[owner];
    const time = ctx.scene.time.now;
    if (time - s.last[by] < 280) return;
    s.last[by] = time;
    const f = fighter(by);
    const d = dist(s.x, s.y, f.x, f.y);
    const step = Math.max(0, Math.min(DRAW, d - 40));
    if (step <= 0) return;
    s.x = clamp(s.x + (f.x - s.x) / d * step, 40, W - 40);
    s.y = clamp(s.y + (f.y - s.y) / d * step, top + 30, H - 30);
    s.target?.moveTo(s.x, s.y);
    s.jolt = time;
    ctx.sfx('chain');
    if (owner !== by && firstDrag) { firstDrag = false; ctx.banner('THE STAPLE COMES TO THE STRIKER', '#e8c27e'); }
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        rollAt = time + ROLL_EVERY;
        for (const w of WHO) {
          const f = fighter(w), o = fighter(w === 'player' ? 'npc' : 'player');
          const d = dist(f.x, f.y, o.x, o.y) || 1;
          const s = staples[w];
          s.x = clamp(f.x - (o.x - f.x) / d * 70, 40, W - 40);
          s.y = clamp(f.y - (o.y - f.y) / d * 70, top + 30, H - 30);
          s.target = ctx.target({ x: s.x, y: s.y, r: 18, passThrough: true, onStruck: (by) => struck(w, by) });
        }
      }
      if (!rollWarned && time >= rollAt - ROLL_WARN) { rollWarned = true; ctx.banner('ROLL CALL', '#c9b0ff'); ctx.sfx('chain'); }
      if (time >= rollAt) {
        rollAt = time + ROLL_EVERY;
        rollWarned = false;
        rollUntil = time + ROLL_MS;
        ctx.sfx('gravity-slam');
        for (const w of WHO) {
          const f = fighter(w), s = staples[w];
          if (alive(f) && dist(f.x, f.y, s.x, s.y) > ROLL_LEN + 60) { ctx.hit(f, 7, f.x, f.y); ctx.float(f.x, f.y - 50, 'CALLED', '#c9b0ff'); }
        }
      }
      const len = rolling(time) ? ROLL_LEN : LEN;
      for (const w of WHO) {
        const f = fighter(w), s = staples[w];
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, s.x, s.y);
        taut[w] = d >= len - 4;
        if (d <= len) continue;
        // Past the chain: hauled back — hard at the limit, steadily while the roll is called.
        const pull = rolling(time) && d > LEN ? Math.min(d - len, 380 * dt) : d - len;
        ctx.nudge(f, (s.x - f.x) / d * pull, (s.y - f.y) / d * pull);
      }
    },

    playerSpeedMult() { return taut.player ? 0.85 : 1; },
    npcSpeedMult() { return taut.npc ? 0.85 : 1; },

    npcSeek() {
      const p = ctx.player, ps = staples.player, ns = staples.npc;
      // Her own staple left behind: stand past it on the challenger's side and draw it along.
      if (dist(ns.x, ns.y, p.x, p.y) > LEN + 160) {
        const d = dist(ns.x, ns.y, p.x, p.y) || 1;
        return { x: clamp(ns.x + (p.x - ns.x) / d * 60, 50, W - 50), y: clamp(ns.y + (p.y - ns.y) / d * 60, top + 40, H - 40) };
      }
      // Otherwise the challenger's staple, from its far side, so a blow hauls them to her.
      const d = dist(ps.x, ps.y, p.x, p.y) || 1;
      return { x: clamp(ps.x + (ps.x - p.x) / d * 55, 50, W - 50), y: clamp(ps.y + (ps.y - p.y) / d * 55, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const w of WHO) {
        const s = staples[w];
        if (!s.target) continue;
        const jolt = clamp(1 - (time - s.jolt) / 300, 0, 1);
        // The plate: iron, riveted, the hallmark struck in it; a ring through the eye.
        g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x + 3, s.y + 6, 40, 16);
        g.fillStyle(dim(RUST, 0.55), 1); g.fillRect(s.x - 16, s.y - 9, 32, 18);
        g.fillStyle(0x3a3634, 1); g.fillRect(s.x - 14, s.y - 8, 28, 15);
        g.lineStyle(1, OBS.edge, 0.5); g.strokeRect(s.x - 16, s.y - 9, 32, 18);
        for (const [rx, ry] of [[-11, -5], [11, -5], [-11, 4], [11, 4]]) { g.fillStyle(0x6a6460, 1); g.fillCircle(s.x + rx, s.y + ry, 1.6); }
        crownMark(g, s.x, s.y, 4, w === 'player' ? 0xd9cfb4 : OBS.seam, 0.8);
        g.lineStyle(4, 0x2a2624, 1); g.strokeEllipse(s.x, s.y - 4 - jolt * 4, 20, 12);
        g.lineStyle(1.4, lit(0x6a6460, 0.3), 0.9); g.strokeEllipse(s.x, s.y - 5 - jolt * 4, 20, 12);
        if (jolt > 0) { g.lineStyle(2, OCHRE, jolt); g.strokeCircle(s.x, s.y, 20 + (1 - jolt) * 26); }
      }
      // The reach of each chain, faintly on the glass; brighter while the roll is called.
      const warn = rollWarned || rolling(time);
      for (const w of WHO) {
        const s = staples[w];
        g.lineStyle(1, w === 'player' ? 0xd9cfb4 : OBS.seam, warn ? 0.3 : 0.12);
        g.strokeCircle(s.x, s.y, rolling(time) ? ROLL_LEN : LEN);
      }
    },

    drawAir(g, time) {
      const warn = rollWarned || rolling(time);
      for (const w of WHO) {
        const f = fighter(w), s = staples[w];
        if (!alive(f) || !s.target) continue;
        chain(g, s.x, s.y - 4, f.x, f.y + 14, rolling(time) ? ROLL_LEN : LEN, taut[w], warn, time);
        // The cuff.
        g.lineStyle(4, 0x2a2624, 1); g.strokeEllipse(f.x, f.y + 15, 22, 8);
        g.lineStyle(1.2, lit(0x6a6460, 0.3), 0.9); g.strokeEllipse(f.x, f.y + 14, 22, 8);
      }
    },

    drawHud(g, time) {
      const cx = ctx.W / 2, cy = top + 18;
      const k = clamp(1 - (rollAt - time) / ROLL_EVERY, 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillRect(cx - 80, cy - 8, 160, 16);
      g.lineStyle(1.2, OBS.edge, 0.7); g.strokeRect(cx - 80, cy - 8, 160, 16);
      const links = 12;
      for (let i = 0; i < links; i++) {
        const on = i / links < k;
        g.lineStyle(2, on ? (rollWarned ? OBS.seamLit : OCHRE) : 0x3a3634, 1);
        g.strokeEllipse(cx - 70 + i * 12.7, cy, i % 2 ? 8 : 12, i % 2 ? 6 : 4);
      }
    },

    destroy() {
      for (const w of WHO) staples[w].target?.remove();
    },
  };
};

/**
 * A heavy chain from the staple to the cuff: links alternating flat and on edge; slack it sags
 * sideways across the floor, taut it runs straight and shivers. `warn` glows it for roll call.
 */
function chain(g: G, ax: number, ay: number, bx: number, by: number, len: number, taut: boolean, warn: boolean, time: number): void {
  const d = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / d, ny = (bx - ax) / d;
  const sag = taut ? 0 : Math.min(40, (len - d) * 0.3);
  const shiver = taut ? Math.sin(time / 22) * 1.5 : 0;
  const n = Math.max(4, Math.round(d / 11));
  const at = (k: number) => {
    const s = Math.sin(k * Math.PI) * sag + shiver * Math.sin(k * Math.PI * 3);
    return { x: ax + (bx - ax) * k + nx * s, y: ay + (by - ay) * k + ny * s };
  };
  if (warn) {
    g.lineStyle(7, OBS.seam, 0.18 + 0.1 * Math.sin(time / 80));
    g.beginPath(); for (let i = 0; i <= n; i++) { const p = at(i / n); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); } g.strokePath();
  }
  const ang = Math.atan2(by - ay, bx - ax);
  for (let i = 0; i <= n; i++) {
    const p = at(i / n);
    const flat = i % 2 === 0;
    g.lineStyle(flat ? 3 : 2.4, 0x2a2624, 1);
    if (flat) g.strokeEllipse(p.x, p.y, 11, 6);
    else g.lineBetween(p.x - Math.cos(ang) * 5, p.y - Math.sin(ang) * 5, p.x + Math.cos(ang) * 5, p.y + Math.sin(ang) * 5);
    g.lineStyle(1, flat ? 0x8a8480 : 0x6a6460, 0.9);
    if (flat) g.strokeEllipse(p.x, p.y - 1, 10, 5);
  }
  if (taut) {
    for (let i = 0; i < 3; i++) {
      const ph = ((time / 200) + i / 3) % 1;
      g.fillStyle(OCHRE, 1 - ph); g.fillCircle(bx + Math.cos(i * 2) * ph * 12, by - ph * 10, 1.4);
    }
  }
}

export const DECREE_FETTER: GimmickDef = {
  id: 'bench-earth-fetter',
  rules: 'Each party is fettered to a staple. A struck staple is drawn to the striker, and its chain follows. At roll call every chain is shortened.',
  make,
};
