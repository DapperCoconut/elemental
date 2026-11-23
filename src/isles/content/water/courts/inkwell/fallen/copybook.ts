import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, CSS_BLUE, CSS_PAPER, GREY, INK, INK_SOFT, PAPER, PAPER_DEEP, WHITE } from '../palette';
import { distToSeg, glyph, inkBurst } from '../inkArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Copybook Hand — Writing-Master Serif's fight (magic). Serif taught Prince Blot his letters.
 *
 * The master's pen writes copperplate across the floor — a looping line of cursive, laid down
 * stroke by stroke, thick on the down-strokes and hair-thin on the up. Every few seconds his
 * ferule RAPS the page, and whoever is off the copy-lines is rapped across the knuckles: hurt and
 * silenced (basic attacks only). Keep to the lines.
 *
 * Walking along a line traces the copy and fills your hand. A full hand writes FAIR: for a few
 * seconds your foe takes half again as much from everything. Serif traces too.
 *
 * At half health the master turns the page — "now in your own hand": the rap falls on whoever is
 * ON a line. The lines still fill your hand, so you trace between raps and step off before the
 * ferule comes down. Rapping Serif is always the point: herd him off the lines, then onto them.
 */

const ID = fallenId('inkwell', 'copybook');
const WRITE_MS = 1100;
const LIFE_MS = 9400;
const NEW_EVERY = 4700;
const RAP_EVERY = 4600;
const RAISE_MS = 1300;
const ON_R = 30;
const RAP_DMG = 13;
const RAP_SILENCE = 1300;
const HAND_FULL = 520;
const FAIR_MS = 4500;
const FAIR_TAKEN = 1.5;

interface Copy { pts: Pt[]; born: number; seed: number }
interface Hand { meter: number; fairUntil: number; last: Pt; rappedAt: number }

export const COPYBOOK: GimmickDef = {
  id: ID,
  rules: 'The ferule raps whoever is off the copy-lines; walk a line to fill your hand and hit harder. At half health it raps those ON the lines.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    let copies: Copy[] = [];
    let nextCopyAt = 0;
    let rapAt = ctx.scene.time.now + 5200;
    let lastRapAt = -9999;
    let turned = false;
    const hands: Record<'p' | 'n', Hand> = {
      p: { meter: 0, fairUntil: -1, last: { x: ctx.player.x, y: ctx.player.y }, rappedAt: -9999 },
      n: { meter: 0, fairUntil: -1, last: { x: ctx.npc.x, y: ctx.npc.y }, rappedAt: -9999 },
    };
    const pairs = (): [Fighter, Hand, 'p' | 'n'][] => [[ctx.player, hands.p, 'p'], [ctx.npc, hands.n, 'n']];

    /** A cursive word: a prolate cycloid (loops like a run of l's), slanted, across the page. */
    const write = (time: number): void => {
      const a = 22 + ctx.rng() * 6, b = 28 + ctx.rng() * 8, loops = 3 + Math.floor(ctx.rng() * 2);
      const span = loops * Math.PI * 2 * a;
      const x0 = 60 + ctx.rng() * Math.max(10, W - 140 - span);
      // Keep new lines apart from the newest old one, so the page reads as two lines of copy.
      const prev = copies.length ? copies[copies.length - 1].pts[0].y : -999;
      let y0 = top + 70 + ctx.rng() * (H - top - 140);
      if (Math.abs(y0 - prev) < 150) y0 = y0 < (top + H) / 2 ? Math.min(H - 70, y0 + 220) : Math.max(top + 70, y0 - 220);
      const pts: Pt[] = [];
      for (let t = 0; t <= loops * Math.PI * 2 + 0.01; t += 0.22) {
        const yy = y0 + b * Math.cos(t) * 0.85;
        pts.push({ x: Phaser.Math.Clamp(x0 + a * t - b * Math.sin(t) + (yy - y0) * -0.3, 30, W - 30), y: Phaser.Math.Clamp(yy, top + 24, H - 20) });
      }
      copies.push({ pts, born: time, seed: Math.floor(ctx.rng() * 1e6) });
      ctx.sfx('sparkle');
    };

    const drawnCount = (c: Copy, time: number): number => Math.floor(Phaser.Math.Clamp((time - c.born) / WRITE_MS, 0, 1) * (c.pts.length - 1)) + 1;
    const distTo = (p: Pt, c: Copy, time: number, whole: boolean): number => {
      const n = whole ? c.pts.length : drawnCount(c, time);
      let best = 1e9;
      for (let i = 1; i < n; i++) best = Math.min(best, distToSeg(p.x, p.y, c.pts[i - 1].x, c.pts[i - 1].y, c.pts[i].x, c.pts[i].y));
      return best;
    };
    /** On a finished line (the rap only counts lines the pen has completed). */
    const onLine = (p: Pt, time: number): boolean => copies.some((c) => time - c.born >= WRITE_MS && distTo(p, c, time, true) < ON_R);
    const nearestOn = (p: Pt, time: number): { c: Copy; i: number } | null => {
      let out: { c: Copy; i: number } | null = null, best = 1e9;
      for (const c of copies) {
        if (time - c.born < WRITE_MS) continue;
        c.pts.forEach((q, i) => { const d = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y); if (d < best) { best = d; out = { c, i }; } });
      }
      return out;
    };

    const rap = (time: number): void => {
      lastRapAt = time;
      ctx.sfx('whip');
      for (const [f, h, k] of pairs()) {
        if (!live(f)) continue;
        const on = onLine(f, time);
        if (on === turned) {
          h.rappedAt = time;
          ctx.hit(f, RAP_DMG, f.x, f.y);
          ctx.silence(f, RAP_SILENCE);
          ctx.float(f.x, f.y - 50, k === 'n' ? 'SERIF RAPS HIMSELF' : (turned ? 'COPYING' : 'OFF THE LINE'), k === 'n' ? CSS_BLUE : CSS_PAPER);
        }
      }
      rapAt = time + RAP_EVERY;
    };

    /** The copperplate stroke: thick where the pen moves down the page, a hairline going up. */
    const stroke = (g: G, c: Copy, n: number, a: number): void => {
      for (let i = 1; i < n; i++) {
        const p = c.pts[i - 1], q = c.pts[i];
        const down = q.y > p.y;
        g.lineStyle(down ? 5.5 : 1.6, turned ? INK_SOFT : INK, a);
        g.lineBetween(p.x, p.y, q.x, q.y);
      }
    };

    /** The master's quill at the writing head: a white feather, barbs, a black split nib. */
    const quill = (g: G, x: number, y: number, time: number): void => {
      const sway = Math.sin(time / 90) * 0.15;
      const tipX = x, tipY = y;
      const topX = x + Math.cos(-1.1 + sway) * 70, topY = y + Math.sin(-1.1 + sway) * 70;
      g.lineStyle(2, INK, 1); g.lineBetween(tipX, tipY, topX, topY);
      for (let k = 0.3; k < 1; k += 0.08) {
        const mx = tipX + (topX - tipX) * k, my = tipY + (topY - tipY) * k;
        const w = 12 * Math.sin(k * Math.PI);
        g.lineStyle(1, INK, 0.9);
        g.lineBetween(mx, my, mx - 6 - w * 0.4, my - w); g.lineBetween(mx, my, mx + w, my + 4);
      }
      g.fillStyle(WHITE, 0.85); g.fillEllipse((tipX + topX * 2) / 3, (tipY + topY * 2) / 3, 10, 26);
      g.fillStyle(INK, 1); g.fillTriangle(tipX, tipY, tipX + 5, tipY - 10, tipX - 2, tipY - 11);
      g.fillStyle(BLUE, 1); g.fillCircle(tipX + 1, tipY - 6, 1.4);
    };

    return {
      update(time) {
        if (!turned && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          turned = true;
          ctx.banner('"Now in your own hand." The ferule falls on whoever is ON the copy.', CSS_BLUE);
          rapAt = Math.max(rapAt, time + 2600);
        }
        if (time >= nextCopyAt) { write(time); nextCopyAt = time + (copies.length < 2 ? 600 : NEW_EVERY); }
        copies = copies.filter((c) => time - c.born < LIFE_MS);
        for (const [f, h] of pairs()) {
          const moved = Phaser.Math.Distance.Between(f.x, f.y, h.last.x, h.last.y);
          if (live(f) && moved > 0.5 && moved < 40 && onLine(f, time)) {
            h.meter += moved;
            if (h.meter >= HAND_FULL) { h.meter = 0; h.fairUntil = time + FAIR_MS; ctx.sfx('status-buff'); ctx.float(f.x, f.y - 50, 'FAIR HAND', CSS_BLUE); }
          }
          h.last = { x: f.x, y: f.y };
        }
        if (rapAt - time < RAISE_MS && rapAt - time + 20 >= RAISE_MS) ctx.sfx('clock-tick');
        if (time >= rapAt) rap(time);
      },

      npcTakenMult: () => (ctx.scene.time.now < hands.p.fairUntil ? FAIR_TAKEN : 1),
      playerTakenMult: () => (ctx.scene.time.now < hands.n.fairUntil ? FAIR_TAKEN : 1),

      npcSeek() {
        const n = ctx.npc;
        const t = ctx.scene.time.now;
        const near = nearestOn(n, t);
        if (!near) return null;
        const soon = rapAt - t < 1700;
        if (soon && turned) {
          if (!onLine(n, t) && distTo(n, near.c, t, true) > ON_R + 40) return null;
          const q = near.c.pts[near.i];
          const a = Math.atan2(n.y - q.y, n.x - q.x);
          return { x: ctx.tk.clampX(q.x + Math.cos(a) * 110), y: ctx.tk.clampY(q.y + Math.sin(a) * 110) };
        }
        if (soon) return near.c.pts[near.i];
        // Between raps: trace along the copy to fill his hand.
        const ahead = near.c.pts[Math.min(near.c.pts.length - 1, near.i + 5)];
        return ahead.x === near.c.pts[near.i].x && ahead.y === near.c.pts[near.i].y ? near.c.pts[Math.max(0, near.i - 5)] : ahead;
      },

      drawGround(g, time) {
        // Faint ruled guide lines across the page, as in any copybook.
        g.lineStyle(1, BLUE_LIT, 0.18);
        for (let y = top + 40; y < H; y += 44) g.lineBetween(20, y, W - 20, y);
        for (const c of copies) {
          const age = time - c.born;
          const fade = age > LIFE_MS - 900 ? (LIFE_MS - age) / 900 : 1;
          // The dotted copy the pen will follow.
          for (let i = 0; i < c.pts.length; i += 2) { g.fillStyle(BLUE, 0.35 * fade); g.fillCircle(c.pts[i].x, c.pts[i].y, 1.5); }
          const n = drawnCount(c, time);
          if (age >= WRITE_MS) {
            // A finished line: its band of safety (or danger) washed round it.
            g.lineStyle(ON_R * 2, turned ? INK : BLUE_LIT, (turned ? 0.12 : 0.16) * fade);
            g.beginPath(); c.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
          }
          stroke(g, c, n, fade);
          if (turned && age >= WRITE_MS) {
            // Struck through: the copy is forbidden now.
            g.lineStyle(2, BLUE_DEEP, 0.8 * fade);
            const a = c.pts[0], z = c.pts[c.pts.length - 1];
            g.lineBetween(a.x - 10, a.y + 4, z.x + 10, z.y - 4);
            g.lineBetween(a.x - 10, a.y + 10, z.x + 10, z.y + 2);
          }
          // A few practice letters along the bottom of each line, in the master's hand.
          for (let k = 0; k < 6; k++) { const p = c.pts[Math.floor((k / 6) * (c.pts.length - 1))]; glyph(g, p.x + 8, p.y + 44, 9, c.seed + k, GREY, 0.35 * fade, 1.2); }
        }
        // Welts on whoever was rapped.
        for (const [f, h] of pairs()) {
          const k = (time - h.rappedAt) / RAP_SILENCE;
          if (k < 1) { g.fillStyle(BLUE, 0.7 * (1 - k)); g.fillRect(f.x - 18, f.y + 12, 36, 5); g.lineStyle(1, INK, 1 - k); g.strokeRect(f.x - 18, f.y + 12, 36, 5); }
        }
      },

      drawAir(g, time) {
        for (const c of copies) {
          if (time - c.born < WRITE_MS) { const p = c.pts[drawnCount(c, time) - 1]; quill(g, p.x, p.y, time); }
        }
        // The ferule: a long black ruler lifting over the page's left margin, then the slap.
        const left = rapAt - time;
        const lift = left < RAISE_MS ? 1 - left / RAISE_MS : 0;
        const since = time - lastRapAt;
        const ang = since < 160 ? -0.05 : -0.05 - lift * 0.9;
        const px = 30, py = H - 40;
        const ex = px + Math.cos(ang) * (W - 80), ey = py + Math.sin(ang) * (W - 80) * 0.25;
        if (lift > 0 || since < 400) {
          g.lineStyle(14, INK, 0.25 + lift * 0.4); g.lineBetween(px, py, ex, ey);
          g.lineStyle(10, INK, 0.5 + lift * 0.5); g.lineBetween(px, py - 4, ex, ey - 4);
          g.lineStyle(1, PAPER, 0.8);
          for (let i = 1; i < 30; i++) { const t = i / 30; g.lineBetween(px + (ex - px) * t, py - 4 + (ey - py) * t - 4, px + (ex - px) * t, py - 4 + (ey - py) * t - (i % 5 === 0 ? 0 : 2)); }
          g.fillStyle(PAPER_DEEP, 1); g.fillCircle(px, py - 4, 6); g.lineStyle(1.5, INK, 1); g.strokeCircle(px, py - 4, 6);
        }
        if (since < 300) {
          const k = since / 300;
          for (const [f, h] of pairs()) if (time - h.rappedAt < 300) inkBurst(g, f.x, f.y - 10, 18 + k * 26, 1 - k);
          g.lineStyle(3, INK, 1 - k);
          for (let i = 0; i < 4; i++) g.lineBetween(px + 80 + i * 200, py - 30 - i * 40 - k * 20, px + 160 + i * 200, py - 30 - i * 40 - k * 20);
        }
        // A fair hand glows blue along the caster's arm-line.
        for (const [f, h] of pairs()) if (time < h.fairUntil) { g.lineStyle(2, BLUE, 0.5 + 0.3 * Math.sin(time / 110)); g.strokeEllipse(f.x, f.y + 14, 44, 14); }
      },

      drawHud(g, time) {
        // Two copybook lines: the hand's letters fill toward FAIR; the rap's clock between them.
        const y = 106;
        for (const [k, x0] of [['p', W / 2 - 170], ['n', W / 2 + 50]] as ['p' | 'n', number][]) {
          const h = hands[k];
          const fair = time < h.fairUntil;
          g.fillStyle(PAPER, 0.95); g.fillRect(x0, y - 10, 120, 22);
          g.lineStyle(1, fair ? BLUE : INK, 1); g.strokeRect(x0, y - 10, 120, 22);
          g.lineStyle(1, BLUE_LIT, 0.7); g.lineBetween(x0 + 4, y + 6, x0 + 116, y + 6);
          const n = fair ? 10 : Math.floor((h.meter / HAND_FULL) * 10);
          for (let i = 0; i < n; i++) glyph(g, x0 + 10 + i * 11, y, 8, i * 13 + (k === 'n' ? 7 : 0), fair ? BLUE : INK, 1, 1.4);
        }
        const k = Phaser.Math.Clamp(1 - (rapAt - time) / RAP_EVERY, 0, 1);
        g.fillStyle(INK, 0.8); g.fillRect(W / 2 - 22, y - 6, 44, 10);
        g.fillStyle(turned ? BLUE : WHITE, 1); g.fillRect(W / 2 - 20, y - 4, 40 * k, 6);
      },
    };
  },
};
