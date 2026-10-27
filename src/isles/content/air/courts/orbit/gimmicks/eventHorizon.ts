import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from './shared';
import { clampIn, fighterOf, live, SIDES } from './shared';
import { CSS_ENAMEL, CSS_LODE, ENAMEL, ENAMEL_SHADE, LODE, LODE_GLINT, LODE_SHEEN, LODE_WASH, NAVY_DARK, WHITE } from '../palette';

/**
 * Event Horizon — Archivist Null's fight.
 *
 * In the middle of the yard is a hole that light falls into: a black hole no bigger than a coin,
 * ringed in bent violet light, with the Archive's loose pages wheeling round it in a disc. It
 * **feeds on the fight**. Every point of damage either fighter takes swells its horizon; inside
 * the horizon you are **crushed** — hurt every half-second and dragged toward the middle —
 * and the swirl of the disc round it carries anyone near it in a slow spiral inward.
 *
 * Stop fighting for a breath and it starves: after a moment with no blood drawn, the horizon
 * shrinks back toward nothing. Null fights from the far side of it, letting the hole grow between
 * you and keeping well out of the disc. But a hole that swells to the size of the yard swells
 * past *him* too: herd him to the rim, then hit hard and fast and let it take him.
 */

const BASE_R = 24;
const MAX_R = 185;
const DISC = 110;

export const EVENT_HORIZON: GimmickDef = {
  id: 'orbit-event-horizon',
  rules: 'A black hole in the middle grows with every point of damage dealt. Inside its horizon you are crushed. It shrinks when the fighting pauses.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const cx = W / 2, cy = (top + H) / 2 + 8;
    const grow = hard ? 2.2 : 1.8;
    const crush = hard ? 9 : 7;
    const quietMs = hard ? 1800 : 1500;
    let r = BASE_R;
    let shown = BASE_R;
    let lastBlood = -99999;
    let selfHit = false;
    const tick = { p: 0, n: 0 };
    const crushedAt = { p: -99999, n: -99999 };
    const pages = Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2, d: 1 + (i % 5) * 0.22, spin: i * 0.7, s: 0.8 + (i % 3) * 0.25 }));

    const feed = (amount: number): void => {
      if (selfHit || amount <= 0) return;
      lastBlood = ctx.scene.time.now;
      r = Math.min(MAX_R, r + amount * grow);
    };
    const inside = (f: { x: number; y: number }): boolean => Math.hypot(f.x - cx, f.y - cy) < r;

    return {
      update(time, dt) {
        // Starving: a breath of quiet and it shrinks back.
        if (time - lastBlood > quietMs) r = Math.max(BASE_R, r - (hard ? 40 : 48) * dt);
        shown += (r - shown) * Math.min(1, dt * 6);

        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f)) continue;
          const d = Math.hypot(f.x - cx, f.y - cy) || 1;
          const ux = (cx - f.x) / d, uy = (cy - f.y) / d;
          if (d < shown) {
            // Crushed: hurt on a clock and dragged toward the middle.
            if (time >= tick[k]) {
              tick[k] = time + 500;
              crushedAt[k] = time;
              selfHit = true;
              ctx.hit(f, crush, f.x, f.y);
              selfHit = false;
              ctx.sfx('gravity-slam');
              ctx.float(f.x, f.y - 46, k === 'p' ? 'CRUSHED' : 'NULL FALLS IN', k === 'p' ? CSS_ENAMEL : CSS_LODE);
            }
            const step = Math.min(70 * dt, Math.max(0, d - 6));
            ctx.nudge(f, ux * step, uy * step);
          } else if (d < shown + DISC) {
            // The disc: a slow spiral, round and a little in.
            const q = 1 - (d - shown) / DISC;
            const tx = -uy, ty = ux;
            ctx.nudge(f, (tx * 55 + ux * 26) * q * dt, (ty * 55 + uy * 26) * q * dt);
          }
        }
        for (const p of pages) {
          p.a += dt * (1.2 / p.d);
          p.d -= dt * 0.04;
          p.spin += dt * 3;
          if (p.d < 0.15) { p.d = 1.9; p.a = ctx.rng() * Math.PI * 2; }
        }
      },

      onPlayerHurt: (amount) => feed(amount),
      onNpcHurt: (amount) => feed(amount),

      playerSpeedMult: () => (ctx.scene.time.now - crushedAt.p < 600 ? 0.65 : 1),
      npcSpeedMult: () => (ctx.scene.time.now - crushedAt.n < 600 ? 0.65 : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const dn = Math.hypot(n.x - cx, n.y - cy);
        // Out of the disc first.
        if (dn < shown + DISC * 0.8) {
          const a = Math.atan2(n.y - cy, n.x - cx);
          return clampIn(ctx, cx + Math.cos(a) * (shown + DISC + 60), cy + Math.sin(a) * (shown + DISC + 40));
        }
        // A hole worth hiding behind: stand across it from you.
        if (shown > 70) {
          const a = Math.atan2(cy - p.y, cx - p.x);
          return clampIn(ctx, cx + Math.cos(a) * (shown + DISC + 50), cy + Math.sin(a) * (shown + DISC + 30));
        }
        return null;
      },

      drawGround(g, time) {
        const sec = time / 1000;
        // The accretion disc: banded rings wheeling round, brightest at the rim.
        for (let i = 0; i < 6; i++) {
          const rr = shown + 8 + i * (DISC / 6);
          g.lineStyle(7 - i, i % 2 ? LODE_SHEEN : LODE_GLINT, 0.22 - i * 0.03);
          g.beginPath(); g.arc(cx, cy, rr, sec * (1.6 - i * 0.2), sec * (1.6 - i * 0.2) + Math.PI * 1.3, false); g.strokePath();
        }
        g.lineStyle(1, LODE_GLINT, 0.35); g.strokeCircle(cx, cy, shown + DISC);
        // Lensing: a warped ring of light just outside the horizon.
        g.lineStyle(6, LODE_WASH, 0.35 + 0.15 * Math.sin(sec * 3)); g.strokeCircle(cx, cy, shown + 4);
        g.lineStyle(2, WHITE, 0.6); g.strokeCircle(cx, cy, shown + 1);
        // The hole. Darker than the floor, darker than shadow.
        g.fillStyle(LODE, 1); g.fillCircle(cx, cy, shown);
        g.fillStyle(0x000000, 1); g.fillCircle(cx, cy, shown * 0.82);
        // Starving: the rim ticks back in pale steps.
        if (time - lastBlood > quietMs && r > BASE_R + 1) {
          g.lineStyle(2, ENAMEL, 0.5);
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + sec;
            g.lineBetween(cx + Math.cos(a) * (shown + 12), cy + Math.sin(a) * (shown + 12), cx + Math.cos(a) * (shown + 4), cy + Math.sin(a) * (shown + 4));
          }
        }
      },

      drawAir(g, time) {
        // The Archive's pages, spiralling in and vanishing at the rim.
        for (const p of pages) {
          const rr = shown + DISC * (p.d - 0.15);
          if (rr < shown) continue;
          const x = cx + Math.cos(p.a) * rr, y = cy + Math.sin(p.a) * rr * 0.9;
          const fade = Phaser.Math.Clamp((rr - shown) / 30, 0, 1);
          const c = Math.cos(p.spin), s = Math.sin(p.spin);
          const w = 9 * p.s, h = 12 * p.s;
          const pt = (px: number, py: number): Phaser.Geom.Point => new Phaser.Geom.Point(x + px * c - py * s, y + px * s + py * c);
          g.fillStyle(ENAMEL, 0.85 * fade); g.fillPoints([pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)], true, true);
          g.lineStyle(1, ENAMEL_SHADE, fade); g.lineBetween(x - c * w * 0.3, y - s * w * 0.3, x + c * w * 0.3, y + s * w * 0.3);
        }
        // Crushed fighters: stretched violet streaks toward the middle.
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          const since = time - crushedAt[k];
          if (!live(f) || since > 400) continue;
          const a = Math.atan2(cy - f.y, cx - f.x);
          for (let i = -2; i <= 2; i++) {
            g.lineStyle(2, LODE_GLINT, (1 - since / 400) * 0.9);
            g.lineBetween(f.x + i * 6, f.y - 10, f.x + i * 6 + Math.cos(a) * 34, f.y - 10 + Math.sin(a) * 34);
          }
        }
      },

      drawHud(g) {
        // The horizon gauge and, under it, how long the yard has been quiet.
        const t = ctx.scene.time.now;
        const x = W / 2, y = 112;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 66, y - 10, 132, 22, 7);
        g.fillStyle(NAVY_DARK, 1); g.fillRect(x - 60, y - 5, 120, 6);
        g.fillStyle(LODE_GLINT, 1); g.fillRect(x - 60, y - 5, 120 * ((shown - BASE_R) / (MAX_R - BASE_R)), 6);
        const quiet = Phaser.Math.Clamp((t - lastBlood) / quietMs, 0, 1);
        g.fillStyle(quiet >= 1 ? ENAMEL : ENAMEL_SHADE, quiet >= 1 ? 1 : 0.6); g.fillRect(x - 60, y + 4, 120 * quiet, 3);
      },
    };
  },
};
