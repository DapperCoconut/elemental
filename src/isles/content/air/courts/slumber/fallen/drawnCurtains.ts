import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, FEATHER, MOON, PLUM, QUILT_LAV, WALNUT, WALNUT_LIT, dist, moon, pillow, segDist, stitchLine } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { EMBER, alive, hudPlate, inRect, scorch } from './kit';

/**
 * Drawn Curtains — Chamberlain Valance, who keeps the Prince's own bed at the Four-Poster. In
 * the star's telling he is the one who turns the bed down each night, draws its curtains, and lets
 * the great quilted canopy down on whoever His Drowsiness has decided should sleep a long time.
 *
 * The Prince's bed stands in the middle of the yard: four walnut posts, a curtain on each side.
 * Valance draws them one by one, and a drawn curtain is a wall — nobody walks through it and no
 * shot passes it. When the last is drawn (three, once he is losing) the canopy comes down: the
 * floor of the bed bounces under it (a ring rolls out across the yard, with one gap that the
 * valance's open fold points to), and anyone shut inside is crushed and stunned.
 *
 * Strike a post and its curtain is flung open — the way out when you are shut in, and the way to
 * shut *him* in: draw him inside after you, step out by the last gap, and keep your hands off the
 * posts. While the canopy lowers the bed draws everyone in (it is very soft). The bot leaves by
 * the last open side, and when you are inside it waits at your gap.
 */

const ID = fallenId('slumber', 'drawn-curtains');
const BED: Rect = { x: 300, y: 256, w: 360, h: 236 };
const DRAW_EVERY_MS = 1750;
const CLOSE_MS = 850;
const LOWER_MS = 1450;
const REST_MS = 2300;
const POST_R = 24;
const CRUSH_P = 30;
const CRUSH_N = 46;
const CRUSH_STUN_MS = 900;
const RING_DMG = 14;
const PULL = 80;

type Phase = 'turndown' | 'lower' | 'rest';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  const C: Pt = { x: BED.x + BED.w / 2, y: BED.y + BED.h / 2 };
  const posts: Pt[] = [
    { x: BED.x, y: BED.y }, { x: BED.x + BED.w, y: BED.y },
    { x: BED.x + BED.w, y: BED.y + BED.h }, { x: BED.x, y: BED.y + BED.h },
  ];
  /** Side i runs from post i to post i+1, clockwise: north, east, south, west. */
  const side = (i: number): [Pt, Pt] => [posts[i], posts[(i + 1) % 4]];
  const closeAt = [-1, -1, -1, -1];
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let nextDraw = 0;
  let gapAngle = 0;
  let started = false;
  let losing = false;
  const prev = new Map<Fighter, Pt>();

  /** 0 (open) – 1 (drawn): how far the curtain on side i has slid across. */
  const drawn = (i: number, now: number): number => (closeAt[i] < 0 ? 0 : Math.min(1, (now - closeAt[i]) / CLOSE_MS));
  const closedCount = (now: number): number => [0, 1, 2, 3].filter((i) => drawn(i, now) >= 1).length;
  const need = (): number => (losing ? 3 : 4);

  const fling = (i: number): void => { closeAt[i] = -1; };

  const targets: StrikeTarget[] = posts.map((p, i) => ctx.target({
    x: p.x, y: p.y - 10, r: POST_R, passThrough: true,
    onStruck: () => {
      if (closeAt[i] < 0) return;
      fling(i);
      ctx.sfx('whoosh');
      ctx.flash(p.x, p.y - 30, EMBER);
    },
  }));

  function drop(now: number): void {
    ctx.sfx('gravity-slam');
    const inside = [player, npc].filter((f) => alive(f) && inRect(BED, f.x, f.y));
    for (const f of inside) {
      if (f === player) tk.hitPlayer(CRUSH_P, f.x, f.y);
      else { ctx.hit(npc, CRUSH_N, f.x, f.y); ctx.float(npc.x, npc.y - 60, 'PUT TO BED', '#ffc890'); }
      ctx.stun(f, CRUSH_STUN_MS);
    }
    // The mattress bounces: a ring rolls out from the bed's edge with the one gap.
    tk.spawnRing({ cx: C.x, cy: C.y, delayMs: 0, speed: 300, gapCentre: gapAngle, gapHalf: 0.55, band: 16, damage: RING_DMG, startRadius: 150 });
    for (let i = 0; i < 4; i++) fling(i);
    phase = 'rest'; phaseAt = now;
  }

  return {
    update(time, dt) {
      if (!started) { started = true; phase = 'rest'; phaseAt = time - REST_MS + 1500; ctx.banner('LIGHTS OUT', '#e4d8ff'); }
      if (!losing && npc.hp < npc.maxHp * 0.5) { losing = true; ctx.banner('THREE SIDES WILL DO', '#ffb070'); ctx.sfx('status-debuff'); }

      if (phase === 'rest' && time - phaseAt >= REST_MS) { phase = 'turndown'; phaseAt = time; nextDraw = time; }
      if (phase === 'turndown') {
        if (time >= nextDraw) {
          nextDraw = time + DRAW_EVERY_MS;
          const open = [0, 1, 2, 3].filter((i) => closeAt[i] < 0);
          if (open.length) {
            // Inside? He draws the side you are nearest. Outside, any side.
            let pick = open[Math.floor(ctx.rng() * open.length)];
            if (inRect(BED, player.x, player.y)) {
              let bd = 1e9;
              for (const i of open) { const [a, b] = side(i); const d = segDist(player.x, player.y, a.x, a.y, b.x, b.y); if (d < bd) { bd = d; pick = i; } }
            }
            closeAt[pick] = time;
            ctx.sfx('whip');
          }
        }
        if (closedCount(time) >= need()) {
          phase = 'lower'; phaseAt = time;
          gapAngle = ctx.rng() * Math.PI * 2;
          const ms = tk.warn(LOWER_MS);
          if (dist(player.x, player.y, C.x, C.y) < 300) tk.pull(C.x, C.y, PULL, ms);
          ctx.sfx('beam-charge');
        }
      }
      if (phase === 'lower') {
        if (dist(npc.x, npc.y, C.x, C.y) < 300 && alive(npc)) {
          const a = Math.atan2(C.y - npc.y, C.x - npc.x);
          ctx.nudge(npc, Math.cos(a) * PULL * dt, Math.sin(a) * PULL * dt);
        }
        if (time - phaseAt >= tk.warn(LOWER_MS)) drop(time);
      }

      // Drawn curtains are walls: shots stop on them, bodies are put back.
      for (let i = 0; i < 4; i++) {
        const k = drawn(i, time);
        if (k <= 0) continue;
        const [a, b] = side(i);
        const L = dist(a.x, a.y, b.x, b.y) * k;
        for (let d = 0; d <= L; d += 34) {
          const px = a.x + (b.x - a.x) * (d / dist(a.x, a.y, b.x, b.y)), py = a.y + (b.y - a.y) * (d / dist(a.x, a.y, b.x, b.y));
          for (const s of ctx.shotsNear(px, py, 22)) s.block();
        }
      }
      for (const f of [player, npc]) {
        const p = prev.get(f) ?? { x: f.x, y: f.y };
        if (alive(f) && inRect(BED, p.x, p.y) !== inRect(BED, f.x, f.y)) {
          const mx = (p.x + f.x) / 2, my = (p.y + f.y) / 2;
          let bi = 0, bd = 1e9;
          for (let i = 0; i < 4; i++) { const [a, b] = side(i); const d = segDist(mx, my, a.x, a.y, b.x, b.y); if (d < bd) { bd = d; bi = i; } }
          const [a, b] = side(bi);
          const along = dist(a.x, a.y, mx, my) / dist(a.x, a.y, b.x, b.y);
          if (along <= drawn(bi, time) + 0.04) { ctx.nudge(f, p.x - f.x, p.y - f.y); continue; }
        }
        prev.set(f, { x: f.x, y: f.y });
      }
    },

    npcSeek(): Pt | null {
      const now = tk.now;
      const npcIn = inRect(BED, npc.x, npc.y), youIn = inRect(BED, player.x, player.y);
      const open = [0, 1, 2, 3].filter((i) => drawn(i, now) < 0.7);
      const gapOut = (i: number, out: number): Pt => {
        const [a, b] = side(i);
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const ang = Math.atan2(m.y - C.y, m.x - C.x);
        return { x: tk.clampX(m.x + Math.cos(ang) * out), y: tk.clampY(m.y + Math.sin(ang) * out) };
      };
      if (npcIn && (phase === 'lower' || closedCount(now) >= need() - 2)) {
        if (open.length) {
          let best = open[0], bd = 1e9;
          for (const i of open) { const p = gapOut(i, 0); const d = dist(npc.x, npc.y, p.x, p.y); if (d < bd) { bd = d; best = i; } }
          return gapOut(best, 70);
        }
        // Shut in: to the nearest post, to strike it open.
        let bp = posts[0], bd = 1e9;
        for (const p of posts) { const d = dist(npc.x, npc.y, p.x, p.y); if (d < bd) { bd = d; bp = p; } }
        return { x: bp.x + (C.x - bp.x) * 0.15, y: bp.y + (C.y - bp.y) * 0.15 };
      }
      if (youIn && !npcIn && open.length === 1) return gapOut(open[0], 46);
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The bed's footprint: the Prince's mattress, quilted lilac, and its shadow under the canopy.
      const low = phase === 'lower' ? Math.min(1, (time - phaseAt) / tk.warn(LOWER_MS)) : 0;
      g.fillStyle(0x000000, 0.22 + 0.4 * low); g.fillRect(BED.x - 6, BED.y + 4, BED.w + 12, BED.h + 8);
      g.fillStyle(dim(QUILT_LAV, 0.3), 1); g.fillRoundedRect(BED.x + 8, BED.y + 10, BED.w - 16, BED.h - 16, 14);
      g.fillStyle(QUILT_LAV, 1); g.fillRoundedRect(BED.x + 8, BED.y + 6, BED.w - 16, BED.h - 18, 14);
      for (let i = 1; i < 6; i++) stitchLine(g, BED.x + 12 + i * (BED.w - 24) / 6, BED.y + 12, BED.x + 12 + i * (BED.w - 24) / 6, BED.y + BED.h - 18, dim(QUILT_LAV, 0.35), 0.6);
      for (let j = 1; j < 4; j++) stitchLine(g, BED.x + 14, BED.y + 8 + j * (BED.h - 24) / 4, BED.x + BED.w - 14, BED.y + 8 + j * (BED.h - 24) / 4, dim(QUILT_LAV, 0.35), 0.6);
      pillow(g, C.x - 70, BED.y + 40, 96, 40, FEATHER, 1, -0.05);
      pillow(g, C.x + 70, BED.y + 40, 96, 40, FEATHER, 1, 0.05);
      moon(g, C.x, C.y + 20, 16, 0.5);
      scorch(g, BED.x + 60, BED.y + BED.h - 40, 70, -0.3, 0.6);
      // Where the ring will run out: the fold in the valance's shadow marks the one gap.
      if (phase === 'lower') {
        g.lineStyle(3, EMBER, 0.4 + 0.4 * low);
        for (let r = 170; r < 560; r += 60) {
          g.beginPath(); g.arc(C.x, C.y, r, gapAngle + 0.55, gapAngle - 0.55 + Math.PI * 2, false); g.strokePath();
        }
        g.fillStyle(MOON, 0.12 + 0.1 * Math.sin(t * 8));
        g.fillTriangle(C.x + Math.cos(gapAngle) * 180, C.y + Math.sin(gapAngle) * 180,
          C.x + Math.cos(gapAngle + 0.4) * 520, C.y + Math.sin(gapAngle + 0.4) * 520,
          C.x + Math.cos(gapAngle - 0.4) * 520, C.y + Math.sin(gapAngle - 0.4) * 520);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const low = phase === 'lower' ? Math.min(1, (time - phaseAt) / tk.warn(LOWER_MS)) : 0;
      // Curtains: heavy plum velvet on a brass rail, gathered in folds, sliding post to post.
      for (let i = 0; i < 4; i++) {
        const [a, b] = side(i);
        g.lineStyle(3, BRASS, 0.9); g.lineBetween(a.x, a.y - 120, b.x, b.y - 120);
        const k = drawn(i, time);
        if (k <= 0) continue;
        const ex = a.x + (b.x - a.x) * k, ey = a.y + (b.y - a.y) * k;
        const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
        const L = dist(a.x, a.y, ex, ey);
        const folds = Math.max(2, Math.floor(L / 22));
        for (let f = 0; f < folds; f++) {
          const u0 = f / folds, u1 = (f + 1) / folds;
          const x0 = a.x + (ex - a.x) * u0, y0 = a.y + (ey - a.y) * u0;
          const x1 = a.x + (ex - a.x) * u1, y1 = a.y + (ey - a.y) * u1;
          const col = f % 2 ? PLUM : lit(PLUM, 0.12);
          const sway = Math.sin(t * 2 + f) * 2;
          if (horiz) {
            g.fillStyle(col, i === 2 ? 0.5 : 0.92); g.fillRect(Math.min(x0, x1), y0 - 120, Math.abs(x1 - x0) + 1, 120 + sway);
          } else {
            // Side curtains seen edge-on: a tall band leaning with the perspective.
            g.fillStyle(col, 0.85); g.fillRect(x0 - 7, Math.min(y0, y1) - 120, 14, Math.abs(y1 - y0) + 120 + sway);
          }
        }
        // The tieback cord and the hem with its gold fringe.
        g.lineStyle(2, BRASS, 1);
        if (horiz) g.lineBetween(a.x, a.y - 2, ex, ey - 2); else g.lineBetween(a.x + 7, a.y, ex + 7, ey);
        if (horiz) for (let x = Math.min(a.x, ex); x < Math.max(a.x, ex); x += 6) { g.lineStyle(1, BRASS, 0.8); g.lineBetween(x, a.y, x, a.y + 5); }
      }
      // The posts: carved walnut columns with crescent-moon finials; strike one to fling its curtain.
      posts.forEach((p, i) => {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 3, p.y + 4, 24, 8);
        g.fillStyle(WALNUT, 1); g.fillRect(p.x - 7, p.y - 136, 14, 136);
        g.fillStyle(WALNUT_LIT, 1); g.fillRect(p.x - 7, p.y - 136, 4, 136);
        for (const yy of [24, 60, 96]) { g.fillStyle(WALNUT_LIT, 1); g.fillEllipse(p.x, p.y - yy, 20, 9); }
        g.fillStyle(MOON, 1); g.fillCircle(p.x, p.y - 146, 8);
        g.fillStyle(WALNUT, 1); g.fillCircle(p.x + 4, p.y - 148, 7);
        if (closeAt[i] >= 0) { g.lineStyle(2, EMBER, 0.45 + 0.35 * Math.sin(t * 7 + i)); g.strokeCircle(p.x, p.y - 10, POST_R); }
      });
      // The canopy: quilted lilac silk with a scalloped valance, coming down as a shadow on the posts.
      const cy = BED.y - 140 + low * 130;
      g.fillStyle(dim(QUILT_LAV, 0.25), 0.55 + 0.35 * low); g.fillRect(BED.x - 10, cy - 18, BED.w + 20, 24);
      g.fillStyle(QUILT_LAV, 0.6 + 0.35 * low); g.fillRect(BED.x - 10, cy - 22, BED.w + 20, 20);
      for (let x = BED.x - 10; x < BED.x + BED.w + 10; x += 24) {
        g.fillStyle(PLUM, 0.6 + 0.35 * low); g.fillEllipse(x + 12, cy + 2, 24, 14);
        g.fillStyle(BRASS, 0.7); g.fillCircle(x + 12, cy + 8, 2);
      }
      if (low > 0) { g.fillStyle(0x000000, 0.12 * low); g.fillRect(BED.x, BED.y, BED.w, BED.h); }
    },

    drawHud(g, time) {
      // Four curtain pips, filled as he draws them, with the canopy's descent beneath.
      const x = 30, y = ctx.H - 66;
      hudPlate(g, x - 14, y - 12, 150, 56);
      for (let i = 0; i < 4; i++) {
        const k = drawn(i, time);
        g.fillStyle(0x2a1a30, 1); g.fillRect(x + i * 28, y, 22, 26);
        g.fillStyle(PLUM, 1); g.fillRect(x + i * 28, y, 22 * k, 26);
        g.lineStyle(1, BRASS, 0.9); g.strokeRect(x + i * 28, y, 22, 26);
      }
      for (let i = need(); i < 4; i++) { g.lineStyle(2, EMBER, 0.9); g.lineBetween(x + i * 28, y + 26, x + i * 28 + 22, y); }
      if (phase === 'lower') {
        const low = Math.min(1, (time - phaseAt) / tk.warn(LOWER_MS));
        g.fillStyle(EMBER, 1); g.fillRect(x, y + 32, 106 * low, 4);
      }
    },

    destroy() { for (const tg of targets) tg.remove(); },
  };
}

export const FALLEN_DRAWN_CURTAINS: GimmickDef = {
  id: ID,
  rules: 'The bed\'s curtains are walls to bodies and shots. When all are drawn the canopy crushes whoever is inside. Strike a post to fling its curtain open.',
  make,
};
