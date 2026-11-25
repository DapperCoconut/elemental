import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ashlar, crack, spoil } from '../art';
import { BLAST, DUST_DARK, FUSE, IRON, IRON_LIT, LIME_DARK, SCREE_DARK, SCREE_DEEP, SLATE, SLATE_DARK, SLATE_LIT, TESS_RED } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Smoked Out — Sweep Odile Marchbank. The Sunken Street is a market buried to its roofs; the pickers
 * live in the houses underneath, and their chimneys still stand out of the spoil. In the King's
 * telling Odile swept those chimneys, knew which ones smoked, and smoked the families out for the
 * Regent's men — one fire down one flue and every hearth on the street coughed.
 *
 * Five chimney stacks stand in the yard, joined under the floor by the old flues (you can see their
 * soot-lines through the broken paving). Odile kneels at the chimney nearest her and lights it — she
 * is held a moment — and the smoke runs out along every flue, a dark pulse you can watch, and bursts
 * out of every *open* chimney it reaches: a choking cloud that hurts and silences. Strike a chimney
 * to cap it (strike again to open it): smoke passes a capped stack by. The fewer chimneys open, the
 * harder each one blows — cap all but one and that one roars.
 *
 * So cap the stacks round you and leave open the one she is standing by. Every other fire she rods
 * open the capped stack nearest you. Halfway down she lights two at once. The bot keeps clear of open
 * stacks while the smoke runs, and loiters by the capped stack nearest you, so its casts open it.
 */

const ID = fallenId('rubble', 'flues');
const STACKS: Pt[] = [{ x: 210, y: 230 }, { x: 750, y: 220 }, { x: 480, y: 370 }, { x: 220, y: 540 }, { x: 760, y: 545 }];
const FLUES: [number, number][] = [[0, 2], [1, 2], [3, 2], [4, 2], [0, 3], [1, 4], [0, 1]];
const SMOKE_SPEED = 210;
const LIGHT_MS = 1000;
const FIRE_EVERY = 6200;
const STACK_R = 22;

interface Stack { p: Pt; capped: boolean; target: StrikeTarget; togAt: number; burstAt: number; burstR: number; armedAt: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const stacks: Stack[] = [];
  let started = false;
  let twin = false;
  let nextFire = 0;
  let fires = 0;
  /** The fire now running: its sources, when the smoke left, and each stack's arrival time. */
  let run: { src: number[]; at: number; arrive: number[] } | null = null;
  let lightAt = 0;
  let lightSrc: number[] = [];

  /** Shortest flue-distance from the sources to every stack (capped stacks still pass smoke on). */
  function reach(src: number[]): number[] {
    const d = STACKS.map(() => Infinity);
    for (const s of src) d[s] = 0;
    const done = new Set<number>();
    for (let n = 0; n < STACKS.length; n++) {
      let u = -1;
      for (let i = 0; i < d.length; i++) if (!done.has(i) && (u < 0 || d[i] < d[u])) u = i;
      if (u < 0 || d[u] === Infinity) break;
      done.add(u);
      for (const [a, b] of FLUES) {
        const v = a === u ? b : b === u ? a : -1;
        if (v < 0) continue;
        const w = dist(STACKS[a].x, STACKS[a].y, STACKS[b].x, STACKS[b].y);
        if (d[u] + w < d[v]) d[v] = d[u] + w;
      }
    }
    return d;
  }

  const nearest = (x: number, y: number, ok: (s: Stack) => boolean) => {
    let bi = -1, bd = Infinity;
    stacks.forEach((s, i) => { if (!ok(s)) return; const d = dist(s.p.x, s.p.y, x, y); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  function burst(i: number, open: number): void {
    const s = stacks[i];
    const r = 64 + (4 - Math.min(4, open)) * 16;
    const dmg = 13 + (4 - Math.min(4, open)) * 5;
    s.burstAt = tk.now; s.burstR = r;
    ctx.sfx(open <= 1 ? 'explosion-medium' : 'smoke');
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, s.p.x, s.p.y) > r) continue;
      if (f === player) tk.hitPlayer(dmg, f.x, f.y);
      else { ctx.hit(npc, Math.round(dmg * 1.5), f.x, f.y); ctx.float(npc.x, npc.y - 56, 'SMOKED', '#c8c0b0'); }
      ctx.silence(f, 900);
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        STACKS.forEach((p, i) => {
          const s: Stack = {
            p, capped: false, togAt: -1e9, burstAt: -1e9, burstR: 0, armedAt: 0, seed: i * 1.9,
            target: ctx.target({
              x: p.x, y: p.y - 40, r: STACK_R + 4,
              onStruck: () => {
                if (tk.now - s.togAt < 400) return;
                s.togAt = tk.now; s.capped = !s.capped;
                ctx.sfx(s.capped ? 'clang' : 'snap-back');
              },
            }),
          };
          stacks.push(s);
        });
        nextFire = time + 2800;
      }
      if (!twin && npc.hp < npc.maxHp * 0.5) { twin = true; ctx.banner('TWO FIRES DOWN THE FLUES', '#ffb070'); ctx.sfx('flame-burst'); }

      // Odile kneels and lights the stack nearest her (two, later).
      if (!run && !lightAt && time >= nextFire && alive(npc)) {
        const a = nearest(npc.x, npc.y, () => true);
        lightSrc = [a];
        if (twin) { const b = nearest(player.x, player.y, (_s) => _s !== stacks[a] && dist(_s.p.x, _s.p.y, player.x, player.y) > 200); if (b >= 0) lightSrc.push(b); }
        lightAt = time;
        ctx.root(npc, 900);
        ctx.sfx('fireball');
        // Every other fire she rods open the capped stack nearest you.
        fires++;
        if (fires % 2 === 0) {
          const c = nearest(player.x, player.y, (s) => s.capped);
          if (c >= 0) { stacks[c].capped = false; stacks[c].togAt = time; ctx.float(stacks[c].p.x, stacks[c].p.y - 80, 'RODDED', '#ffd0a0'); ctx.sfx('snap-back'); }
        }
      }
      if (lightAt && time - lightAt >= tk.warn(LIGHT_MS)) {
        const d = reach(lightSrc);
        run = { src: lightSrc, at: time, arrive: d.map((x) => (x === Infinity ? Infinity : time + (x / SMOKE_SPEED) * 1000)) };
        lightAt = 0;
        ctx.sfx('whoosh');
      }
      if (run) {
        const r = run;
        stacks.forEach((s, i) => { if (!r.src.includes(i) && r.arrive[i] !== Infinity) s.armedAt = r.arrive[i]; });
        let pending = false;
        stacks.forEach((s, i) => {
          if (r.src.includes(i) || r.arrive[i] === Infinity) return;
          if (time < r.arrive[i]) { pending = true; return; }
          if (s.burstAt >= r.at || s.capped) return;
          const open = stacks.filter((o, j) => !o.capped && !r.src.includes(j)).length;
          burst(i, open);
        });
        // Cap everything else and the smoke has nowhere but back up her own stack.
        if (!pending) {
          if (stacks.every((s, j) => s.capped || r.src.includes(j))) for (const j of r.src) burst(j, 1);
          run = null;
          nextFire = time + FIRE_EVERY - (twin ? 900 : 0);
        }
      }

      // The stacks are solid.
      for (const s of stacks) for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(s.p.x, s.p.y, f.x, f.y);
        if (d < STACK_R + 16 && d > 0.01) { const k = (STACK_R + 16 - d) / d; ctx.nudge(f, (f.x - s.p.x) * k, (f.y - s.p.y) * k); }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const time = tk.now;
      if (run || lightAt) {
        // Clear of every open stack the smoke has still to reach.
        for (const s of stacks) {
          if (s.capped) continue;
          const d = dist(s.p.x, s.p.y, npc.x, npc.y);
          if (d < 150 && (lightAt || time < s.armedAt + 100)) {
            const a = Math.atan2(npc.y - s.p.y, npc.x - s.p.x);
            return { x: tk.clampX(s.p.x + Math.cos(a) * 180), y: tk.clampY(s.p.y + Math.sin(a) * 180) };
          }
        }
        return null;
      }
      // By the capped stack nearest you, so a cast of hers knocks its cap off.
      const c = nearest(player.x, player.y, (s) => s.capped);
      if (c < 0) return null;
      const s = stacks[c], a = Math.atan2(s.p.y - player.y, s.p.x - player.x);
      return { x: tk.clampX(s.p.x + Math.cos(a) * 60), y: tk.clampY(s.p.y + Math.sin(a) * 60) };
    },

    drawGround(g, time) {
      // The old flues showing through the paving as soot-lines; the pulse running along them.
      for (const [a, b] of FLUES) {
        const A = STACKS[a], B = STACKS[b];
        g.lineStyle(14, SCREE_DEEP, 0.25); g.lineBetween(A.x, A.y, B.x, B.y);
        g.lineStyle(2, DUST_DARK, 0.6); g.lineBetween(A.x, A.y, B.x, B.y);
        const len = dist(A.x, A.y, B.x, B.y), n = Math.floor(len / 40);
        for (let i = 1; i < n; i++) crack(g, A.x + (B.x - A.x) * (i / n), A.y + (B.y - A.y) * (i / n), 10, i * 1.3 + a, SCREE_DARK, 0.5, 1);
        if (run) {
          const r = run;
          for (const [u, v] of [[a, b], [b, a]] as [number, number][]) {
            const tu = r.arrive[u];
            if (tu === Infinity || time < tu) continue;
            const k = ((time - tu) / 1000) * SMOKE_SPEED / len;
            if (k > 1.15) continue;
            const kk = clamp(k, 0, 1);
            const px = STACKS[u].x + (STACKS[v].x - STACKS[u].x) * kk, py = STACKS[u].y + (STACKS[v].y - STACKS[u].y) * kk;
            g.lineStyle(8, 0x2a2420, 0.6); g.lineBetween(STACKS[u].x, STACKS[u].y, px, py);
            g.fillStyle(FUSE, 0.8); g.fillCircle(px, py, 6);
            glow(g, px, py, 22, BLAST, 0.06, 3);
          }
        }
      }
      // The burst ring of each open stack that the smoke is coming to.
      if (run) {
        const r = run;
        const open = stacks.filter((o, j) => !o.capped && !r.src.includes(j)).length;
        const R = 64 + (4 - Math.min(4, open)) * 16;
        stacks.forEach((s, i) => {
          if (s.capped || r.src.includes(i) || r.arrive[i] === Infinity || time > r.arrive[i]) return;
          const k = clamp(1 - (r.arrive[i] - time) / 1600, 0, 1);
          g.fillStyle(0x1a1614, 0.1 + k * 0.25); g.fillCircle(s.p.x, s.p.y, R);
          g.lineStyle(2.5, FUSE, 0.4 + k * 0.5); g.strokeCircle(s.p.x, s.p.y, R);
        });
      }
      for (const s of stacks) drawSpoilFoot(g, s);
    },

    drawAir(g, time) {
      const order = stacks.map((s, i) => ({ s, i })).sort((a, b) => a.s.p.y - b.s.p.y);
      for (const { s, i } of order) {
        const lit = (lightAt && lightSrc.includes(i)) || (run && run.src.includes(i));
        drawStack(g, s, time, !!lit);
      }
      for (const s of stacks) {
        const k = (time - s.burstAt) / 1100;
        if (k < 0 || k > 1) continue;
        drawSmoke(g, s.p.x, s.p.y - 50, s.burstR, k, s.seed);
      }
    },

    drawHud(g) {
      // Five little chimney pots: open ones smoking-grey, capped ones with their iron lid.
      const x0 = W / 2 - 50, y = top + 20;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 10, y - 16, 120, 32, 6);
      stacks.forEach((s, i) => {
        const x = x0 + i * 25;
        g.fillStyle(TESS_RED, 1); g.fillRect(x - 5, y - 6, 10, 14);
        g.fillStyle(mixC(TESS_RED, 0x000000, 0.3), 1); g.fillRect(x + 2, y - 6, 3, 14);
        if (s.capped) { g.fillStyle(IRON_LIT, 1); g.fillRect(x - 8, y - 10, 16, 4); }
        else { g.fillStyle(0x1a1614, 1); g.fillEllipse(x, y - 6, 10, 4); }
      });
      const open = stacks.filter((s) => !s.capped).length;
      g.fillStyle(open <= 2 ? BLAST : FUSE, 1); g.fillRect(x0 - 6, y + 12, 112 * ((5 - open) / 4), 2);
    },

    destroy() { for (const s of stacks) s.target.remove(); },
  };
}

/** The spoil heaped round a stack's foot — all that shows of the house it belongs to — and a slate. */
function drawSpoilFoot(g: G, s: Stack): void {
  const rng = mulberry(Math.floor(s.seed * 1000) + 7);
  shadow(g, s.p.x, s.p.y + 4, 80, 22, 0.3);
  spoil(g, s.p.x, s.p.y + 8, 90, 26, rng);
  g.fillStyle(SLATE, 1); g.fillRect(s.p.x - 34, s.p.y - 2, 16, 6);
  g.fillStyle(SLATE_LIT, 0.6); g.fillRect(s.p.x - 34, s.p.y - 2, 16, 1.5);
  g.fillStyle(SLATE_DARK, 1); g.fillRect(s.p.x + 22, s.p.y + 2, 12, 5);
}

/** A chimney stack: brick on a limestone base, two clay pots, and an iron cap when it is capped. */
function drawStack(g: G, s: Stack, time: number, lit: boolean): void {
  const x = s.p.x, y = s.p.y;
  ashlar(g, x, y, 40, 14, LIME_DARK);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    const bx = x - 17 + c * 12 + (r % 2 ? 6 : 0), by = y - 14 - (r + 1) * 9;
    if (bx > x + 14) continue;
    g.fillStyle(r % 3 === 1 ? mixC(TESS_RED, 0x000000, 0.2) : TESS_RED, 1); g.fillRect(bx, by, 11, 8);
  }
  g.fillStyle(0x000000, 0.2); g.fillRect(x + 8, y - 68, 10, 54);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 20, y - 72, 40, 5);
  // Two pots.
  for (const px of [x - 8, x + 8]) {
    g.fillStyle(mixC(TESS_RED, 0xe0a070, 0.3), 1); g.fillRect(px - 5, y - 86, 10, 14);
    g.fillStyle(0x1a1614, 1); g.fillEllipse(px, y - 86, 10, 4);
    if (lit) { glow(g, px, y - 90, 16, FUSE, 0.08, 3); g.fillStyle(FUSE, 0.9); g.fillTriangle(px - 4, y - 86, px + 4, y - 86, px, y - 96 - Math.sin(time / 50) * 4); }
  }
  if (s.capped) {
    // The sweep's iron cap, wedged on.
    g.fillStyle(IRON, 1); g.fillRect(x - 18, y - 92, 36, 6);
    g.fillStyle(IRON_LIT, 1); g.fillRect(x - 18, y - 92, 36, 1.5);
    g.lineStyle(2, IRON, 1); g.lineBetween(x - 14, y - 86, x - 14, y - 78); g.lineBetween(x + 14, y - 86, x + 14, y - 78);
  } else if (!lit) {
    // A thread of ordinary smoke.
    for (let i = 0; i < 4; i++) {
      const ph = ((time / 1400) + i / 4) % 1;
      g.fillStyle(0x8a847a, 0.25 * (1 - ph)); g.fillCircle(x + Math.sin(ph * 6 + s.seed) * 6, y - 92 - ph * 50, 4 + ph * 8);
    }
  }
}

/** The smoke-burst: a rolling black cloud out of the stack, settling over the ring it chokes. */
function drawSmoke(g: G, x: number, y: number, r: number, k: number, seed: number): void {
  for (let i = 0; i < 14; i++) {
    const a = seed + i * 0.45, d = r * (0.2 + k * 0.8) * ((i % 4) / 4 + 0.3);
    const cx = x + Math.cos(a) * d, cy = y + 50 + Math.sin(a) * d * 0.6 - (1 - k) * 30;
    g.fillStyle(i % 3 ? 0x2a2420 : 0x4a4440, 0.55 * (1 - k)); g.fillCircle(cx, cy, 14 + k * 18);
  }
  g.fillStyle(0x1a1614, 0.6 * (1 - k)); g.fillCircle(x, y - k * 40, 18 + k * 30);
  if (k < 0.3) glow(g, x, y + 10, 30, BLAST, 0.08 * (1 - k / 0.3), 3);
}

export const FALLEN_FLUES: GimmickDef = {
  id: ID,
  rules: 'Smoke runs the flues and bursts from every open stack, harder the fewer are open. Strike a stack to cap or open it. At half, two fires.',
  make,
};
