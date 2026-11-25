import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chalkLine, noonShadow, sunburst } from '../art';
import {
  GOLD, GOLD_DARK, GOLD_LIT, INK, MARBLE_SHADE, PARCH, PARCH_DARK, ROBE_DARK, SIDE_FOE, SIDE_YOU, SUN, SUN_HOT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Hostile Witnesses — Witness-Usher Corbinian Threlkeld.
 *
 * In the waking world Threlkeld kept the witness bench and fetched people up to the stand. In the
 * star's telling he was the one who *found* the witnesses: he walked frightened neighbours into
 * court and stood behind them until they said what the bench wanted said.
 *
 * Three witnesses in white smocks and court rosettes wander the yard, and they are terrified of
 * everyone. Whoever comes near one drives it: it bolts blind, straight away from them, and keeps
 * running for a moment after they fall back. A driven witness that blunders into the *other*
 * fighter stops dead, points, and swears against them — a gilt ring is chalked where they stood and
 * a bolt of judgement comes down on it a breath later. Strike a witness to drive it from range.
 *
 * So: never stand in the path of a witness he is driving, and come up behind the witnesses
 * yourself, so the one you scare runs straight at him. At half, two more are fetched from the
 * gallery and every bolt falls wider.
 */

const ID = fallenId('tribunal', 'witnesses');
const FEAR_R = 165;
const SWEAR_R = 44;
const RUN = 132;
const BOLT_RUN = 215;
const BLIND_MS = 1300;
const SWEAR_MS = 820;
const RECOVER_MS = 1900;
const RING_R = 64;
const RING_R_LATE = 84;
const DMG_YOU = 15;
const DMG_FOE = 22;

type Side = 'player' | 'npc';

interface Witness {
  x: number; y: number;
  /** Heading of the blind run. */
  hx: number; hy: number;
  driver: Side | null;
  /** When the driver was last within FEAR_R (or struck it). */
  drivenAt: number;
  boltUntil: number;
  /** Swearing: the ring lies at (sx, sy) and comes down at swearAt. */
  swearing: boolean; sx: number; sy: number; swearAt: number; against: Side | null;
  restUntil: number;
  seed: number;
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const witnesses: Witness[] = [];
  const bolts: { x: number; y: number; at: number; r: number }[] = [];
  let late = false;
  const ringR = () => (late ? RING_R_LATE : RING_R);
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const otherSide = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

  function spawn(x: number, y: number): void {
    const w: Witness = {
      x, y, hx: 0, hy: 1, driver: null, drivenAt: -1e9, boltUntil: 0,
      swearing: false, sx: 0, sy: 0, swearAt: 0, against: null, restUntil: 0, seed: rng() * 10, target: null,
    };
    w.target = ctx.target({
      x, y: y - 20, r: 20, passThrough: true,
      onStruck(by) {
        if (w.swearing) return;
        const f = fighter(by);
        const d = Math.max(1, dist(f.x, f.y, w.x, w.y));
        w.driver = by; w.drivenAt = tk.now; w.boltUntil = tk.now + 1100;
        w.hx = (w.x - f.x) / d; w.hy = (w.y - f.y) / d;
        w.restUntil = 0;
        ctx.sfx('whoosh');
      },
    });
    witnesses.push(w);
  }
  spawn(W * 0.3, top + 150); spawn(W * 0.7, top + 170); spawn(W * 0.5, H - 110);

  function swear(w: Witness, against: Side, time: number): void {
    const f = fighter(against);
    w.swearing = true; w.against = against;
    w.sx = f.x; w.sy = f.y;
    w.swearAt = time + tk.warn(SWEAR_MS);
    ctx.sfx('judgement');
  }

  function land(w: Witness, time: number): void {
    const r = ringR();
    bolts.push({ x: w.sx, y: w.sy, at: time, r });
    ctx.sfx('holy-chord');
    ctx.flash(w.sx, w.sy, SUN);
    if (alive(player) && dist(player.x, player.y, w.sx, w.sy) < r) { tk.hitPlayer(DMG_YOU, player.x, player.y); ctx.root(player, 600); }
    if (alive(npc) && dist(npc.x, npc.y, w.sx, w.sy) < r) { ctx.hit(npc, DMG_FOE, npc.x, npc.y); ctx.root(npc, 600); }
    w.swearing = false; w.against = null; w.driver = null;
    w.restUntil = time + RECOVER_MS;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('MORE WITNESSES CALLED', '#ffe680');
        ctx.sfx('chain');
        spawn(60, (top + H) / 2); spawn(W - 60, (top + H) / 2);
      }
      for (const w of witnesses) {
        if (w.swearing) { if (time >= w.swearAt) land(w, time); continue; }
        if (time < w.restUntil) continue;
        const dp = alive(player) ? dist(player.x, player.y, w.x, w.y) : 1e9;
        const dn = alive(npc) ? dist(npc.x, npc.y, w.x, w.y) : 1e9;
        // A driven witness that blunders into the other fighter swears against them.
        if (w.driver) {
          const o = otherSide(w.driver);
          if ((o === 'player' ? dp : dn) < SWEAR_R) { swear(w, o, time); continue; }
        }
        // Who frightens it: the nearer fighter inside FEAR_R — unless it is still running blind.
        const blind = w.driver !== null && time - w.drivenAt < BLIND_MS;
        const near: Side | null = Math.min(dp, dn) < FEAR_R ? (dp <= dn ? 'player' : 'npc') : null;
        if (near && (!blind || near === w.driver)) {
          const f = fighter(near);
          const d = Math.max(1, near === 'player' ? dp : dn);
          w.driver = near; w.drivenAt = time;
          w.hx = (w.x - f.x) / d; w.hy = (w.y - f.y) / d;
        } else if (!blind) w.driver = null;
        let vx: number, vy: number;
        if (w.driver) {
          const sp = time < w.boltUntil ? BOLT_RUN : RUN;
          vx = w.hx * sp; vy = w.hy * sp;
        } else {
          // Calm: dither toward the middle of the yard, wringing its hands.
          const cx = W / 2 + Math.cos(time / 1700 + w.seed) * 160, cy = (top + H) / 2 + Math.sin(time / 1300 + w.seed) * 90;
          const d = Math.max(1, dist(w.x, w.y, cx, cy));
          vx = ((cx - w.x) / d) * 34; vy = ((cy - w.y) / d) * 34;
        }
        let nx = w.x + vx * dt, ny = w.y + vy * dt;
        // Cornered against the balustrade, it scrambles along it instead.
        const x0 = 46, x1 = W - 46, y0 = top + 36, y1 = H - 28;
        if (nx < x0 || nx > x1) { w.hx = -w.hx * 0.3; w.hy = Math.sign(w.hy || 1) * Math.sqrt(1 - w.hx * w.hx); nx = clamp(nx, x0, x1); }
        if (ny < y0 || ny > y1) { w.hy = -w.hy * 0.3; w.hx = Math.sign(w.hx || 1) * Math.sqrt(1 - w.hy * w.hy); ny = clamp(ny, y0, y1); }
        w.x = nx; w.y = ny;
        w.target?.moveTo(w.x, w.y - 20);
      }
      for (let i = bolts.length - 1; i >= 0; i--) if (time - bolts[i].at > 700) bolts.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const t = tk.now;
      // Out of a ring sworn against him.
      for (const w of witnesses) {
        if (!w.swearing || dist(npc.x, npc.y, w.sx, w.sy) > ringR() + 30) continue;
        const a = Math.atan2(npc.y - w.sy, npc.x - w.sx);
        return { x: tk.clampX(w.sx + Math.cos(a) * (ringR() + 60)), y: tk.clampY(w.sy + Math.sin(a) * (ringR() + 60)) };
      }
      // Sidestep a witness you are driving at him.
      for (const w of witnesses) {
        if (w.driver !== 'player' || w.swearing) continue;
        const rx = npc.x - w.x, ry = npc.y - w.y;
        const along = rx * w.hx + ry * w.hy;
        const off = rx * -w.hy + ry * w.hx;
        if (along > 0 && along < 320 && Math.abs(off) < 70) {
          const s = off >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x - w.hy * s * 110), y: tk.clampY(npc.y + w.hx * s * 110) };
        }
      }
      // Come up behind the witness nearest the line to you, so it bolts at you.
      let best: { x: number; y: number } | null = null, bestD = 1e9;
      for (const w of witnesses) {
        if (w.swearing || t < w.restUntil || w.driver === 'player') continue;
        const d = Math.max(1, dist(w.x, w.y, player.x, player.y));
        if (d < 90 || d > 520) continue;
        const bx = w.x + ((w.x - player.x) / d) * (FEAR_R - 40), by = w.y + ((w.y - player.y) / d) * (FEAR_R - 40);
        const cost = dist(npc.x, npc.y, bx, by) + d * 0.4;
        if (cost < bestD) { bestD = cost; best = { x: tk.clampX(bx), y: tk.clampY(by) }; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const w of witnesses) {
        if (!w.swearing) continue;
        const k = clamp(1 - (w.swearAt - time) / Math.max(1, tk.warn(SWEAR_MS)), 0, 1);
        const r = ringR();
        const col = w.against === 'player' ? SIDE_YOU : SIDE_FOE;
        g.fillStyle(SUN_HOT, 0.06 + k * 0.16); g.fillEllipse(w.sx, w.sy, r * 2, r * 1.6);
        g.lineStyle(3, GOLD_DARK, 0.5 + k * 0.4); g.strokeEllipse(w.sx, w.sy, r * 2, r * 1.6);
        g.lineStyle(1.5, col, 0.6 + k * 0.4); g.strokeEllipse(w.sx, w.sy, r * 2 * (1 - k * 0.15), r * 1.6 * (1 - k * 0.15));
        // Chalk ticks round the rim, filling as the oath is finished.
        for (let i = 0; i < 12; i++) {
          if (i / 12 > k) break;
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          chalkLine(g, w.sx + Math.cos(a) * r * 0.82, w.sy + Math.sin(a) * r * 0.66, w.sx + Math.cos(a) * r, w.sy + Math.sin(a) * r * 0.8, 0.9, 2);
        }
        // The accusing line from the witness's finger to the ring.
        chalkLine(g, w.x, w.y - 4, w.sx, w.sy, 0.35 + k * 0.4, 1.5);
      }
      for (const b of bolts) {
        const k = clamp((time - b.at) / 700, 0, 1);
        sunburst(g, b.x, b.y, b.r * 0.7, GOLD, 0.7 * (1 - k));
        g.lineStyle(2, GOLD_DARK, 0.6 * (1 - k)); g.strokeEllipse(b.x, b.y, b.r * 2, b.r * 1.6);
      }
      for (const w of witnesses) noonShadow(g, w.x, w.y + 1, 30, 0.3);
    },

    drawAir(g, time) {
      for (const w of witnesses) drawWitness(g, w, time);
      for (const w of witnesses) {
        if (!w.swearing) continue;
        // The bolt gathering high overhead, then dropping.
        const k = clamp(1 - (w.swearAt - time) / Math.max(1, tk.warn(SWEAR_MS)), 0, 1);
        glow(g, w.sx, w.sy - 200 + k * 120, 16 + k * 14, SUN, 0.05 + k * 0.08, 4);
      }
      for (const b of bolts) {
        const k = clamp((time - b.at) / 260, 0, 1);
        if (k >= 1) continue;
        g.fillStyle(SUN, 0.75 * (1 - k)); g.fillRect(b.x - 12, top, 24, b.y - top);
        g.fillStyle(0xffffff, 0.9 * (1 - k)); g.fillRect(b.x - 4, top, 8, b.y - top);
        glow(g, b.x, b.y, b.r, SUN_HOT, 0.12 * (1 - k), 4);
      }
    },

    drawHud(g) {
      // One small figure per witness: white calm, gold or violet as whoever drives it.
      const x0 = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, witnesses.length * 22 + 10, 40, 8);
      witnesses.forEach((w, i) => {
        const x = x0 + i * 22;
        const c = w.swearing ? SUN_HOT : w.driver === 'player' ? SIDE_YOU : w.driver === 'npc' ? SIDE_FOE : PARCH;
        g.fillStyle(c, 1); g.fillCircle(x, y - 9, 4); g.fillTriangle(x - 6, y + 10, x + 6, y + 10, x, y - 5);
        if (w.swearing) { g.lineStyle(1.5, SUN, 1); g.lineBetween(x + 3, y - 2, x + 9, y - 12); }
        if (tk.now < w.restUntil) { g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 9); }
      });
    },

    destroy() { for (const w of witnesses) w.target?.remove(); },
  };
}

/** A frightened witness: a townsperson in a white smock with a gold court rosette — arms up if driven. */
function drawWitness(g: G, w: Witness, time: number): void {
  const x = w.x, y = w.y;
  const resting = time < w.restUntil;
  const shake = w.driver ? Math.sin(time / 30 + w.seed) * 1.5 : 0;
  const bob = w.driver && !w.swearing ? Math.abs(Math.sin(time / 70 + w.seed)) * 3 : 0;
  const by = y - bob;
  // Legs, running or standing.
  const step = w.driver && !w.swearing ? Math.sin(time / 70 + w.seed) * 5 : 0;
  g.lineStyle(3, INK, 1); g.lineBetween(x - 3, by - 10, x - 4 + step, y); g.lineBetween(x + 3, by - 10, x + 4 - step, y);
  // The smock: white linen, creased.
  g.fillStyle(MARBLE_SHADE, 1); g.fillTriangle(x - 11 + shake, by - 8, x + 11 + shake, by - 8, x + shake, by - 34);
  g.fillStyle(PARCH, 1); g.fillTriangle(x - 9 + shake, by - 9, x + 9 + shake, by - 9, x + shake, by - 33);
  g.lineStyle(1, PARCH_DARK, 0.8); g.lineBetween(x - 3 + shake, by - 12, x + shake, by - 30); g.lineBetween(x + 4 + shake, by - 12, x + 1 + shake, by - 28);
  // The rosette: gold, ribboned in the colour of whoever is frightening it.
  const rib = w.driver === 'player' ? SIDE_YOU : w.driver === 'npc' ? SIDE_FOE : GOLD_DARK;
  g.fillStyle(rib, 1); g.fillTriangle(x - 5 + shake, by - 22, x - 2 + shake, by - 22, x - 5 + shake, by - 14);
  g.fillTriangle(x - 1 + shake, by - 22, x + 2 + shake, by - 22, x + 1 + shake, by - 14);
  g.fillStyle(GOLD, 1); g.fillCircle(x - 2 + shake, by - 24, 3.5);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 3 + shake, by - 25, 1.4);
  // Head, hair, wide eyes.
  const hx = x + shake, hy = by - 40;
  g.fillStyle(0xe8c8a8, 1); g.fillCircle(hx, hy, 7);
  g.fillStyle(dim(PARCH_DARK, 0.35), 1); g.slice(hx, hy - 1, 7.5, Math.PI, 0, false); g.fillPath();
  g.fillStyle(0xffffff, 1); g.fillCircle(hx - 2.5, hy + 1, 2); g.fillCircle(hx + 2.5, hy + 1, 2);
  g.fillStyle(INK, 1); g.fillCircle(hx - 2.5, hy + 1.3, 0.9); g.fillCircle(hx + 2.5, hy + 1.3, 0.9);
  g.fillStyle(ROBE_DARK, 1); g.fillEllipse(hx, hy + 4.5, 3, w.driver ? 3 : 1.4);
  // Arms: thrown up in panic, one pointing when it swears, folded when it has sworn.
  g.lineStyle(2.5, PARCH_DARK, 1);
  if (w.swearing) {
    const a = Math.atan2(w.sy - y, w.sx - x);
    g.lineBetween(hx + 6, by - 26, hx + 6 + Math.cos(a) * 16, by - 26 + Math.sin(a) * 16);
    g.lineBetween(hx - 6, by - 26, hx - 9, by - 44);
    // The little gilt testament held up in the other hand.
    g.fillStyle(GOLD_DARK, 1); g.fillRect(hx - 13, by - 52, 8, 10);
    g.fillStyle(GOLD_LIT, 1); g.fillRect(hx - 12, by - 51, 2, 8);
    glow(g, hx - 9, by - 47, 10, SUN_HOT, 0.08, 2);
  } else if (resting) {
    g.lineBetween(hx - 6, by - 26, hx + 4, by - 20); g.lineBetween(hx + 6, by - 26, hx - 4, by - 20);
  } else if (w.driver) {
    g.lineBetween(hx - 6, by - 26, hx - 12, by - 46 + Math.sin(time / 50) * 3);
    g.lineBetween(hx + 6, by - 26, hx + 12, by - 46 - Math.sin(time / 50) * 3);
    // Beads of sweat flicking off.
    for (let i = 0; i < 2; i++) {
      const p = ((time / 300 + i * 0.5 + w.seed) % 1);
      g.fillStyle(lit(0x8ac8e8, 0.3), 1 - p); g.fillCircle(hx + (i ? 9 : -9) + (i ? p * 8 : -p * 8), hy - 6 + p * 10, 1.6);
    }
  } else {
    g.lineBetween(hx - 6, by - 26, hx - 2, by - 18); g.lineBetween(hx + 6, by - 26, hx + 2, by - 18);
  }
}

export const FALLEN_WITNESSES: GimmickDef = {
  id: ID,
  rules: 'Witnesses bolt from whoever comes near; one that runs into the other fighter swears and a bolt falls there. Strike one to drive it.',
  make,
};
