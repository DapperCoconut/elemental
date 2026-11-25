import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FELT_BLUE, FELT_OAT, FELT_PLUM, FELT_PLUM_DARK, IRON, LAMP, SILK, SNOW_LIT, WARDEN } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Off the Felt — Ebenezer Tuft, Runner-Warden.
 *
 * Hush lays felt runners over its cobbles so that no heel ever rings on stone; between them the
 * cobbles are glazed with ice, because the wardens water them at night. Tuft lays the runners. In
 * the star's telling he also takes them up — from under whoever he is told to.
 *
 * **On the ice you slide**: your way carries on after you stop, turns late, and a dash skates you a
 * long way. **On the felt you have your feet.** Every few seconds Tuft takes hold of the tasselled
 * end of the runner you stand on (it ripples, the tassel glows) and **pulls it**: whoever is on it
 * is thrown down its length onto the ice. **Skid into the packed snowbank round the yard and you are
 * slammed.** Strike a runner's tassel yourself to pull it out from under him. Past half, the
 * wardens take up the middle runner for good and the ice grows slicker.
 */

const SLUG = 'off-the-felt';
const HALF_W = 30;
const WARN = 1200;
const EVERY = 4800;
const EVERY_HALF = 3900;
const YANK = 400;
const RELAY_MS = 3200;
const SLAM_V = 150;
const SLAM_DMG = 12;
const SLAM_STUN = 800;
const STRUCK_CD = 3500;

interface Runner {
  a: Pt; b: Pt; color: number;
  laid: boolean;
  pullAt: number;
  yankedAt: number;
  relayAt: number;
  readyAt: number;
  gone: boolean;
  tassel: StrikeTarget | null;
}

interface Slide { lx: number; ly: number; vx: number; vy: number; nx: number; ny: number; init: boolean; slamAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const runners: Runner[] = [
    { a: { x: 100, y: top + 110 }, b: { x: 860, y: top + 150 }, color: FELT_PLUM },
    { a: { x: 860, y: H - 110 }, b: { x: 100, y: H - 150 }, color: FELT_BLUE },
    { a: { x: 430, y: H - 60 }, b: { x: 530, y: top + 40 }, color: FELT_OAT },
  ].map((r) => ({ ...r, laid: true, pullAt: -1, yankedAt: -9999, relayAt: 0, readyAt: 0, gone: false, tassel: null }));
  const slide = new Map<Fighter, Slide>([player, npc].map((f) => [f, { lx: 0, ly: 0, vx: 0, vy: 0, nx: 0, ny: 0, init: false, slamAt: -9999 }]));
  let nextPull = 0;
  let decay = 0.9;
  let half = false;
  let started = false;

  const dir = (r: Runner) => { const d = Math.max(1, dist(r.a.x, r.a.y, r.b.x, r.b.y)); return { x: (r.b.x - r.a.x) / d, y: (r.b.y - r.a.y) / d }; };
  const tasselAt = (r: Runner): Pt => { const u = dir(r); return { x: clamp(r.b.x + u.x * 22, 30, W - 30), y: clamp(r.b.y + u.y * 22, top + 20, H - 20) }; };
  const onRunner = (r: Runner, f: Fighter): boolean => r.laid && !r.gone && segDist(f.x, f.y, r.a.x, r.a.y, r.b.x, r.b.y) < HALF_W + 6;
  const footed = (f: Fighter): Runner | null => runners.find((r) => onRunner(r, f)) ?? null;

  function startPull(r: Runner, time: number): void {
    if (!r.laid || r.gone || r.pullAt >= 0) return;
    r.pullAt = time;
    ctx.sfx('whip');
  }

  function yank(r: Runner, time: number): void {
    const u = dir(r);
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || !onRunner(r, f)) continue;
      const s = slide.get(f)!;
      s.vx = u.x * YANK; s.vy = u.y * YANK;
      ctx.hit(f, 4, f.x, f.y);
      ctx.float(f.x, f.y - 50, 'PULLED', '#e6d2ff');
    }
    r.pullAt = -1;
    r.laid = false;
    r.yankedAt = time;
    r.relayAt = time + RELAY_MS;
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextPull = time + 3500;
        for (const r of runners) {
          const t = tasselAt(r);
          r.tassel = ctx.target({
            x: t.x, y: t.y, r: 24, passThrough: true,
            onStruck: () => {
              const now = ctx.scene.time.now;
              if (now < r.readyAt || !r.laid || r.gone || r.pullAt >= 0) return;
              r.readyAt = now + STRUCK_CD;
              startPull(r, now);
            },
          });
        }
      }
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        decay = 0.65;
        const mid = runners[2];
        mid.gone = true; mid.pullAt = -1; mid.tassel?.remove(); mid.tassel = null;
        ctx.banner('THE WARDENS TAKE UP THE MIDDLE RUNNER', '#e6d2ff');
      }
      // Tuft's pull: the runner under you, or the one nearest you.
      if (time >= nextPull) {
        nextPull = time + (half ? EVERY_HALF : EVERY);
        const live = runners.filter((r) => r.laid && !r.gone && r.pullAt < 0);
        const pick = live.find((r) => onRunner(r, player))
          ?? live.sort((p, q) => segDist(player.x, player.y, p.a.x, p.a.y, p.b.x, p.b.y) - segDist(player.x, player.y, q.a.x, q.a.y, q.b.x, q.b.y))[0];
        if (pick) startPull(pick, time);
      }
      for (const r of runners) {
        if (r.pullAt >= 0 && time - r.pullAt >= WARN) yank(r, time);
        if (!r.laid && !r.gone && time >= r.relayAt) r.laid = true;
      }
      // The ice: what you were doing, you keep doing.
      if (dt <= 0) return;
      for (const f of [player, npc]) {
        const s = slide.get(f)!;
        if (!alive(f)) { s.init = false; continue; }
        if (!s.init) { s.init = true; s.lx = f.x; s.ly = f.y; s.vx = s.vy = 0; s.nx = s.ny = 0; continue; }
        const ix = (f.x - s.lx - s.nx) / dt, iy = (f.y - s.ly - s.ny) / dt;
        const grip = footed(f) !== null || ctx.isAirborne(f);
        if (grip) {
          const k = Math.exp(-9 * dt); s.vx *= k; s.vy *= k;
        } else {
          const tx = ix * 0.5, ty = iy * 0.5;
          if (Math.hypot(tx, ty) > Math.hypot(s.vx, s.vy)) {
            const k = Math.min(1, 1.6 * dt); s.vx += (tx - s.vx) * k; s.vy += (ty - s.vy) * k;
          } else {
            const k = Math.exp(-decay * dt); s.vx = s.vx * k + ix * 0.18 * dt; s.vy = s.vy * k + iy * 0.18 * dt;
          }
        }
        // Into the packed bank at a skid: slammed.
        const sp = Math.hypot(s.vx, s.vy);
        const wallHit = (f.x <= 46 && s.vx < -SLAM_V * 0.7) || (f.x >= W - 46 && s.vx > SLAM_V * 0.7)
          || (f.y <= top + 46 && s.vy < -SLAM_V * 0.7) || (f.y >= H - 46 && s.vy > SLAM_V * 0.7);
        if (wallHit && sp > SLAM_V && time - s.slamAt > 1200) {
          s.slamAt = time;
          ctx.hit(f, SLAM_DMG, f.x, f.y);
          ctx.stun(f, SLAM_STUN);
          ctx.float(f.x, f.y - 52, 'SLAMMED', '#dfe8f2');
          ctx.sfx('land');
          s.vx = s.vy = 0;
        }
        s.nx = s.vx * dt; s.ny = s.vy * dt;
        if (Math.abs(s.nx) + Math.abs(s.ny) > 0.01) ctx.nudge(f, s.nx, s.ny);
        s.lx = f.x; s.ly = f.y;
      }
    },

    playerSpeedMult: () => (footed(player) ? 1 : 0.8),
    npcSpeedMult: () => (footed(npc) ? 1 : 0.8),

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = footed(npc);
      if (mine && mine.pullAt >= 0) {
        // Step off the side of a runner that is about to go.
        const u = dir(mine);
        const side = (npc.x - mine.a.x) * -u.y + (npc.y - mine.a.y) * u.x >= 0 ? 1 : -1;
        return { x: clamp(npc.x - u.y * side * 80, 60, W - 60), y: clamp(npc.y + u.x * side * 80, top + 50, H - 40) };
      }
      // You are on a runner whose tassel is ready: go and pull it.
      const yours = footed(player);
      if (yours && yours.pullAt < 0 && ctx.scene.time.now >= yours.readyAt) {
        const t = tasselAt(yours);
        const u = dir(yours);
        return { x: clamp(t.x + u.x * 30, 60, W - 60), y: clamp(t.y + u.y * 30, top + 50, H - 40) };
      }
      // Otherwise keep his feet: the nearest point on a laid runner.
      let best: Pt | null = null, bd = 1e9;
      for (const r of runners) {
        if (!r.laid || r.gone || r.pullAt >= 0) continue;
        const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y, l2 = dx * dx + dy * dy;
        const t = clamp(((npc.x - r.a.x) * dx + (npc.y - r.a.y) * dy) / l2, 0.1, 0.85);
        const p = { x: r.a.x + dx * t, y: r.a.y + dy * t };
        const d = dist(p.x, p.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best && bd > 30 ? best : null;
    },

    drawGround(g, time) {
      // Glazed cobbles: long pale sheens where the night's watering froze.
      for (let i = 0; i < 9; i++) {
        const x = 80 + ((i * 271) % (W - 160)), y = top + 40 + ((i * 157) % (H - top - 80));
        g.fillStyle(0xdfeaf6, 0.16); g.fillEllipse(x, y, 150 + (i % 3) * 40, 26 + (i % 2) * 12);
        g.fillStyle(0xffffff, 0.14 + Math.sin(time / 900 + i) * 0.05); g.fillEllipse(x - 30, y - 4, 40, 4);
      }
      for (const r of runners) {
        if (r.gone) continue;
        const u = dir(r), nx = -u.y, ny = u.x;
        const L = dist(r.a.x, r.a.y, r.b.x, r.b.y);
        // Laid back down: the runner unrolls from its tassel end.
        let from = 0;
        if (r.laid && time - r.relayAt < 500) from = 1 - clamp((time - r.relayAt) / 500, 0, 1);
        if (!r.laid) {
          // Pulled: a crumpled heap of felt at the far end.
          const hx = r.b.x - u.x * 30, hy = r.b.y - u.y * 30;
          for (let i = 0; i < 4; i++) {
            g.fillStyle(i % 2 ? dim(r.color, 0.25) : r.color, 1);
            g.fillEllipse(hx - u.x * i * 9 + nx * ((i % 2) * 8 - 4), hy - u.y * i * 9 + ny * ((i % 2) * 8 - 4), 54 - i * 6, 22);
          }
          continue;
        }
        const warn = r.pullAt >= 0 ? clamp((time - r.pullAt) / WARN, 0, 1) : 0;
        const segs = 24;
        for (let i = Math.floor(from * segs); i < segs; i++) {
          const t0 = i / segs, t1 = (i + 1) / segs;
          // A ripple runs along a runner about to be pulled.
          const wob = warn * Math.sin(time / 60 - i * 0.9) * 6;
          const x0 = r.a.x + u.x * L * t0 + nx * wob, y0 = r.a.y + u.y * L * t0 + ny * wob;
          const x1 = r.a.x + u.x * L * t1 + nx * wob, y1 = r.a.y + u.y * L * t1 + ny * wob;
          g.lineStyle(HALF_W * 2 + 4, dim(r.color, 0.35), 1); g.lineBetween(x0, y0 + 3, x1, y1 + 3);
          g.lineStyle(HALF_W * 2, r.color, 1); g.lineBetween(x0, y0, x1, y1);
          // Woven border stripes and a stitched edge.
          g.lineStyle(3, lit(r.color, 0.25), 1);
          g.lineBetween(x0 + nx * (HALF_W - 6), y0 + ny * (HALF_W - 6), x1 + nx * (HALF_W - 6), y1 + ny * (HALF_W - 6));
          g.lineBetween(x0 - nx * (HALF_W - 6), y0 - ny * (HALF_W - 6), x1 - nx * (HALF_W - 6), y1 - ny * (HALF_W - 6));
          if (i % 2 === 0) {
            g.lineStyle(1.5, FELT_PLUM_DARK, 0.6);
            g.lineBetween(x0 + nx * (HALF_W - 1), y0 + ny * (HALF_W - 1), x0 + u.x * 8 + nx * (HALF_W - 1), y0 + u.y * 8 + ny * (HALF_W - 1));
            g.lineBetween(x0 - nx * (HALF_W - 1), y0 - ny * (HALF_W - 1), x0 + u.x * 8 - nx * (HALF_W - 1), y0 + u.y * 8 - ny * (HALF_W - 1));
          }
          // A lozenge woven every few feet, and snow blown onto the edges.
          if (i % 4 === 2) {
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
            g.fillStyle(lit(r.color, 0.35), 1);
            g.fillTriangle(cx - u.x * 10, cy - u.y * 10, cx + nx * 9, cy + ny * 9, cx + u.x * 10, cy + u.y * 10);
            g.fillTriangle(cx - u.x * 10, cy - u.y * 10, cx - nx * 9, cy - ny * 9, cx + u.x * 10, cy + u.y * 10);
          }
          if (i % 3 === 1) { g.fillStyle(SNOW_LIT, 0.7); g.fillEllipse(x0 + nx * (HALF_W - 2), y0 + ny * (HALF_W - 2), 12, 4); }
        }
        // Iron pegs at the near end; the tassel and its cord at the end Tuft pulls.
        for (const k of [-1, 1]) { g.fillStyle(IRON, 1); g.fillCircle(r.a.x + nx * k * (HALF_W - 6), r.a.y + ny * k * (HALF_W - 6), 3); }
        const t = tasselAt(r);
        const ready = time >= r.readyAt;
        g.lineStyle(2, FELT_OAT, 1); g.lineBetween(r.b.x, r.b.y, t.x, t.y);
        for (let j = -3; j <= 3; j++) { g.lineStyle(1.5, warn > 0 ? LAMP : SILK, 1); g.lineBetween(t.x, t.y, t.x + u.x * 10 + nx * j * 2, t.y + u.y * 10 + ny * j * 2); }
        g.fillStyle(warn > 0 ? LAMP : ready ? SILK : 0x888888, 1); g.fillCircle(t.x, t.y, 5);
        if (warn > 0) {
          glow(g, t.x, t.y, 26, LAMP, 0.08 + warn * 0.06, 3);
          // The warden's gloved hand closing on the tassel.
          g.fillStyle(WARDEN, 1); g.fillRoundedRect(t.x + u.x * 12 - 7, t.y + u.y * 12 - 6, 14, 12, 4);
          g.fillStyle(SNOW_LIT, 0.8); g.fillRect(t.x + u.x * 12 - 6, t.y + u.y * 12 + 3, 12, 3);
        }
      }
      // Sliders: ice spray behind them; red when the skid would slam.
      for (const f of [player, npc]) {
        const s = slide.get(f)!;
        const sp = Math.hypot(s.vx, s.vy);
        if (!alive(f) || sp < 50) continue;
        const ux = s.vx / sp, uy = s.vy / sp;
        const c = sp > SLAM_V ? 0xff8a7a : 0xdfeaf6;
        for (let i = 1; i <= 4; i++) {
          g.lineStyle(2, c, 0.5 - i * 0.1);
          g.lineBetween(f.x - ux * (14 + i * 9) - uy * 8, f.y + 14 - uy * (14 + i * 9) + ux * 8, f.x - ux * (20 + i * 9) - uy * 12, f.y + 14 - uy * (20 + i * 9) + ux * 12);
          g.lineBetween(f.x - ux * (14 + i * 9) + uy * 8, f.y + 14 - uy * (14 + i * 9) - ux * 8, f.x - ux * (20 + i * 9) + uy * 12, f.y + 14 - uy * (20 + i * 9) - ux * 12);
        }
      }
    },

    drawHud(g) {
      // Your footing: how hard you are skidding, against the slam mark.
      const s = slide.get(player)!;
      const sp = Math.hypot(s.vx, s.vy);
      const x = W / 2 - 70, y = top + 16;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 8, y - 9, 156, 18, 8);
      g.fillStyle(footed(player) ? FELT_PLUM : 0x8fb0d0, 1); g.fillRoundedRect(x, y - 4, clamp(sp / 300, 0, 1) * 140, 8, 4);
      g.fillStyle(0xff8a7a, 1); g.fillRect(x + (SLAM_V / 300) * 140 - 1, y - 7, 2, 14);
    },

    destroy() { for (const r of runners) r.tassel?.remove(); },
  };
}

export const FALLEN_OFF_THE_FELT: GimmickDef = {
  id: fallenId('hush', SLUG),
  rules: 'Off the felt runners the ice slides you; skid into the bank and you are slammed. He pulls the runner you stand on. Strike a tassel to pull his.',
  make,
};
