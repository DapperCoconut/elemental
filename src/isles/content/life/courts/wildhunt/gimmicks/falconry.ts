import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_FALCON } from '../encounters';
import {
  BARK_DARK, LEAF_GOLD, LEAF_GREEN, LEAF_RUST, clamp, dist, falcon, frameClock, noise,
} from '../util';

/**
 * Falconry — Falconer Kestrel flies Sloe, the sharpest eyes on Thornwild. The falcon circles high
 * over the glade, her shadow sliding across the turf. When Kestrel **points**, the shadow drops
 * onto the fighter she pointed at and **fixes**: it follows them, slower than they can run, while
 * the falcon waits on overhead — and a moment later she **stoops**, straight down onto the
 * shadow, hitting anyone it lies under.
 *
 * Three oaks spread their **canopy** over the glade. Under the leaves the falcon cannot see you:
 * if the one she is fixed on gets into cover, she loses them and **takes the nearest fighter she
 * can still see** — which is often her mistress, standing out in the open, pointing.
 *
 * The rule the player can turn: Sloe hunts by sight, not by loyalty. Break her line and give her
 * Kestrel instead.
 */

type FState = 'circle' | 'point' | 'mark' | 'stoop' | 'climb';
interface Canopy { x: number; y: number; r: number; seed: number }

const STOOP_R = 42;

function makeFalconry(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const period = hard ? 4300 : 5300;
  const pointMs = 650;
  const markMs = hard ? 1250 : 1450;
  const stoopMs = 340;
  const trackSpd = hard ? 160 : 140;
  const dmg = hard ? 19 : 16;
  const midY = (top + H) / 2;

  const canopies: Canopy[] = [
    { x: W * 0.18, y: midY - 40, r: 74, seed: 1 }, { x: W * 0.62, y: top + 110, r: 70, seed: 2 }, { x: W * 0.74, y: H - 120, r: 78, seed: 3 },
  ];

  const fal = {
    state: 'circle' as FState, until: ctx.scene.time.now + 2600, ang: 0,
    x: W / 2, y: midY, sx: W / 2, sy: midY, target: 'p' as 'p' | 'n', alt: 170, swapped: false, hitP: false, hitN: false,
  };
  let impactAt = -9999, impactX = 0, impactY = 0;
  let lostAt = -9999;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighter = (s: 'p' | 'n'): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const covered = (f: Fighter): boolean => canopies.some((c) => dist(f.x, f.y, c.x, c.y) < c.r - 8);

  const circlePos = (time: number): Pt => {
    const a = time / 1700;
    return { x: W / 2 + Math.cos(a) * 280, y: midY + Math.sin(a) * 150 };
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const p = ctx.player, n = ctx.npc;
      if (fal.state === 'circle') {
        const c = circlePos(time);
        fal.x += (c.x - fal.x) * Math.min(1, dt * 3); fal.y += (c.y - fal.y) * Math.min(1, dt * 3);
        fal.sx = fal.x; fal.sy = fal.y; fal.alt = 170;
        if (time >= fal.until && alive(n) && alive(p)) {
          fal.state = 'point'; fal.until = time + ctx.tk.warn(pointMs); fal.target = 'p'; fal.swapped = false;
          ctx.float(n.x, n.y - 56, 'THERE!', '#ffd84a');
          ctx.sfx('screech');
        }
      } else if (fal.state === 'point') {
        const t = fighter(fal.target);
        fal.x += (t.x - fal.x) * Math.min(1, dt * 4); fal.y += (t.y - fal.y) * Math.min(1, dt * 4);
        fal.sx = fal.x; fal.sy = fal.y;
        if (time >= fal.until) {
          fal.state = 'mark'; fal.until = time + ctx.tk.warn(markMs);
          fal.sx = t.x; fal.sy = t.y + 10; fal.hitP = false; fal.hitN = false;
          ctx.sfx('wings');
        }
      } else if (fal.state === 'mark') {
        let t = fighter(fal.target);
        // Into cover: she loses her mark and takes whoever she can still see.
        if (!alive(t) || covered(t)) {
          const alt = fighter(fal.target === 'p' ? 'n' : 'p');
          if (!fal.swapped && alive(alt) && !covered(alt)) {
            fal.target = fal.target === 'p' ? 'n' : 'p';
            fal.swapped = true;
            fal.until = Math.max(fal.until, time + ctx.tk.warn(700));
            t = alt;
            ctx.float(alt.x, alt.y - 56, fal.target === 'n' ? 'SHE TAKES HER MISTRESS' : 'SHE TAKES YOU', fal.target === 'n' ? '#9ae8ff' : '#ffb27a');
            ctx.sfx('screech');
          } else {
            fal.state = 'climb'; fal.until = time + 900; lostAt = time;
            ctx.float(fal.sx, fal.sy - 40, 'LOST HER MARK', '#e8dcc0');
            return;
          }
        }
        const spd = fal.swapped ? trackSpd * 1.9 : trackSpd;
        const d = dist(fal.sx, fal.sy, t.x, t.y + 10);
        if (d > 0.5) { const k = Math.min(1, (spd * dt) / d); fal.sx += (t.x - fal.sx) * k; fal.sy += (t.y + 10 - fal.sy) * k; }
        fal.x = fal.sx; fal.y = fal.sy; fal.alt = 120;
        if (time >= fal.until) { fal.state = 'stoop'; fal.until = time + stoopMs; ctx.sfx('whoosh'); }
      } else if (fal.state === 'stoop') {
        const k = clamp(1 - (fal.until - time) / stoopMs, 0, 1);
        fal.alt = 120 * (1 - k * k);
        if (time >= fal.until) {
          impactAt = time; impactX = fal.sx; impactY = fal.sy;
          for (const [f, isP] of [[p, true], [n, false]] as const) {
            if (!alive(f) || (isP ? fal.hitP : fal.hitN)) continue;
            if (dist(f.x, f.y + 10, fal.sx, fal.sy) < STOOP_R && !covered(f)) {
              if (isP) fal.hitP = true; else fal.hitN = true;
              ctx.hit(f, dmg, f.x, f.y);
              ctx.float(f.x, f.y - 50, 'STOOPED', isP ? '#ffb27a' : '#9ae8ff');
            }
          }
          ctx.sfx('slash');
          fal.state = 'climb'; fal.until = time + 900;
        }
      } else if (fal.state === 'climb') {
        fal.alt = Math.min(170, fal.alt + dt * 220);
        const c = circlePos(time);
        fal.x += (c.x - fal.x) * Math.min(1, dt * 1.5); fal.y += (c.y - fal.y) * Math.min(1, dt * 1.5);
        fal.sx = fal.x; fal.sy = fal.y;
        if (time >= fal.until) { fal.state = 'circle'; fal.until = time + period - 2400; }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (fal.state !== 'mark' && fal.state !== 'stoop') return null;
      if (fal.target === 'n') {
        // Her own bird on her: the nearest leaves.
        let best = canopies[0];
        for (const c of canopies) if (dist(n.x, n.y, c.x, c.y) < dist(n.x, n.y, best.x, best.y)) best = c;
        return { x: best.x, y: best.y };
      }
      // Stay well clear of the shadow so she is never caught in the stoop.
      if (dist(n.x, n.y, fal.sx, fal.sy) < STOOP_R + 90) {
        const a = Math.atan2(n.y - fal.sy, n.x - fal.sx);
        return { x: clamp(fal.sx + Math.cos(a) * 180, 60, W - 60), y: clamp(fal.sy + Math.sin(a) * 180, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // Leaf-fall and root shadow under each canopy, so the cover reads on the floor too.
      for (const c of canopies) {
        g.fillStyle(0x0e1a0c, 0.35); g.fillEllipse(c.x, c.y, c.r * 2.1, c.r * 1.7);
        g.lineStyle(2, LEAF_GOLD, 0.25); g.strokeEllipse(c.x, c.y, c.r * 2, c.r * 1.6);
        g.fillStyle(BARK_DARK, 1); g.fillCircle(c.x, c.y + 4, 14);
        g.fillStyle(0x4a3626, 1); g.fillCircle(c.x, c.y + 2, 11);
      }
      // The falcon's shadow: faint and drifting while she circles; dark and ringed once she fixes.
      const fixed = fal.state === 'mark' || fal.state === 'stoop';
      const k = fixed ? 1 : 0.35;
      const sz = fixed ? 1 : 0.8;
      g.fillStyle(0x000000, 0.18 + k * 0.22);
      g.fillEllipse(fal.sx, fal.sy, 34 * sz, 14 * sz);
      g.fillTriangle(fal.sx - 22 * sz, fal.sy, fal.sx + 22 * sz, fal.sy, fal.sx, fal.sy + 6 * sz);
      if (fixed) {
        const c = fal.state === 'stoop' ? 1 : clamp(1 - (fal.until - time) / ctx.tk.warn(markMs), 0, 1);
        const col = fal.target === 'p' ? 0xff7a4a : 0x6ac8ff;
        g.lineStyle(2 + c * 2, col, 0.45 + c * 0.5); g.strokeCircle(fal.sx, fal.sy, STOOP_R);
        g.lineStyle(2, col, 0.6);
        g.beginPath(); g.arc(fal.sx, fal.sy, STOOP_R + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c, false); g.strokePath();
        if (c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.45); g.strokeCircle(fal.sx, fal.sy, STOOP_R + 4); }
      }
      // The strike: feathers and a flattened ring of turf.
      if (time - impactAt < 600) {
        const kk = (time - impactAt) / 600;
        g.lineStyle(5 * (1 - kk), 0xe8dcc0, 0.7 * (1 - kk)); g.strokeEllipse(impactX, impactY, 40 + kk * 70, 18 + kk * 30);
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      const n = ctx.npc;
      // Kestrel's point: a gloved arm and a line drawn out to the mark.
      if (fal.state === 'point' && alive(n)) {
        const t = fighter(fal.target);
        const a = Math.atan2(t.y - n.y, t.x - n.x);
        g.lineStyle(4, 0x3a3226, 1); g.lineBetween(n.x, n.y - 14, n.x + Math.cos(a) * 30, n.y - 14 + Math.sin(a) * 30);
        g.fillStyle(0x8a6a3a, 1); g.fillCircle(n.x + Math.cos(a) * 32, n.y - 14 + Math.sin(a) * 32, 5);
        const L = dist(n.x, n.y, t.x, t.y);
        for (let d = 40; d < L - 20; d += 22) {
          g.fillStyle(0xffd84a, 0.6); g.fillCircle(n.x + Math.cos(a) * d, n.y - 14 + Math.sin(a) * d, 2);
        }
      }
      // The canopies: leaves over everything under them.
      for (const c of canopies) {
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2 + c.seed;
          const rr = c.r * (0.55 + noise(c.seed * 7 + k) * 0.3);
          const bx = c.x + Math.cos(a) * rr * 0.7, by = c.y - 30 + Math.sin(a) * rr * 0.55;
          g.fillStyle(0x16261a, 0.55); g.fillCircle(bx + 4, by + 6, c.r * 0.42);
        }
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2 + c.seed;
          const rr = c.r * (0.55 + noise(c.seed * 7 + k) * 0.3);
          const sw = Math.sin(ts * 0.8 + k) * 2;
          const bx = c.x + Math.cos(a) * rr * 0.7 + sw, by = c.y - 30 + Math.sin(a) * rr * 0.55;
          const col = noise(c.seed + k) < 0.3 ? LEAF_GOLD : noise(c.seed + k + 4) < 0.25 ? LEAF_RUST : LEAF_GREEN;
          g.fillStyle(col, 0.72); g.fillCircle(bx, by, c.r * 0.4);
        }
        g.fillStyle(LEAF_GREEN, 0.72); g.fillCircle(c.x, c.y - 30, c.r * 0.5);
        g.fillStyle(0xffffff, 0.06); g.fillCircle(c.x - c.r * 0.3, c.y - c.r * 0.5 - 20, c.r * 0.35);
      }
      // Sloe herself, high above, waiting on, or coming down.
      const fl = fal.state === 'mark' ? Math.sin(ts * 18) : Math.sin(ts * 6);
      const stoop = fal.state === 'stoop' ? 1 : 0;
      const by = fal.y - fal.alt;
      const heading = fal.state === 'stoop' ? Math.PI / 2 : fal.state === 'circle' || fal.state === 'climb' ? time / 1700 + Math.PI / 2 : -Math.PI / 2;
      if (fal.state === 'stoop') {
        for (let i = 0; i < 5; i++) { g.lineStyle(2, 0xffffff, 0.5 - i * 0.08); g.lineBetween(fal.x + (i - 2) * 6, by - 30 - i * 6, fal.x + (i - 2) * 6, by - 70 - i * 8); }
      }
      falcon(g, fal.x, by, heading, fl, 1.2, 1, stoop);
      if (time - lostAt < 900) {
        const kk = (time - lostAt) / 900;
        g.fillStyle(0xe8dcc0, 0.8 * (1 - kk)); g.fillCircle(fal.x + 18, by - 16 - kk * 20, 3);
      }
      if (time - impactAt < 600) {
        const kk = (time - impactAt) / 600;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const r = 10 + kk * 50;
          g.fillStyle(i % 2 ? 0x6a5a44 : 0xd8c8a8, 1 - kk);
          g.fillEllipse(impactX + Math.cos(a) * r, impactY - 10 + Math.sin(a) * r * 0.5 + kk * kk * 20, 6, 2.5);
        }
      }
    },

    drawHud(g) {
      // Sloe's state: a feather that fills as she comes in.
      const x = ctx.W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 50, y - 10, 100, 22, 6);
      const steps: FState[] = ['circle', 'point', 'mark', 'stoop'];
      const i = Math.max(0, steps.indexOf(fal.state === 'climb' ? 'circle' : fal.state));
      for (let k = 0; k < 4; k++) {
        g.fillStyle(k <= i ? (k === 3 ? 0xff7a4a : 0xffd84a) : 0x2a2a22, 1);
        g.fillEllipse(x - 33 + k * 22, y + 1, 14, 6);
      }
    },
  };
}

export const FALCONRY: GimmickDef = {
  id: GIM_FALCON,
  rules: 'When Kestrel points, the falcon\'s shadow fixes on you and she stoops. Under the canopy she loses you — and takes whoever she can see.',
  make: makeFalconry,
};
