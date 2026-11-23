import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Rect, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, councilMask } from '../../../../../art/PinnacleArt';
import { dim, mixC } from '../../../../../art/IsleArt';
import { TIDE, TIDE_DEEP, TIDE_LIT } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf, SIDE_CSS } from './util';

/**
 * DECREE OF THE TAKEN FLOOR — Councilor Marguerite Selvage, Seat of the Sail (cloth).
 *
 * The Dry Tithe's small print, which Selvage sewed: floor laid on credit may be *taken up* at the
 * creditor's pleasure. Bolts of sailcloth roll out across the fighting floor as runners, each
 * anchored at one wall by a heavy rope tassel. Strike a runner's tassel and it is TAKEN UP: after a
 * ripple runs down it, it is whipped back to its wall, and whoever is standing on it is FLOORED —
 * knocked flat (stunned), hurt and dragged along. Nobody is exempt, not even the one who pulled.
 * A runner nobody pulls is called in by the law itself after a while.
 *
 * Selvage is perfected cloth: no legs, one long scarf-arm that hauls her about in lurches. She
 * stands off the cloth and waits by the tassels. Catch her on a runner.
 */

const TASSEL_R = 22;
const LAY_MS = 1500;

interface Runner {
  rect: Rect; horiz: boolean;
  /** Which end the tassel and the wall are at: −1 = left / top, +1 = right / bottom. */
  end: -1 | 1;
  state: 'laying' | 'laid' | 'yanking' | 'gone';
  at: number; callAt: number; by: Who | 'law';
  tassel: StrikeTarget | null;
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const EVERY = ctx.hard ? 5600 : 7000;
  const WARN = ctx.hard ? 520 : 620;
  const STUN = ctx.hard ? 1250 : 1100;
  const CALL_MS = 10500;
  const DMG = 10;

  const runners: Runner[] = [];
  let nextLay = 0;
  const flooredAt: Record<Who, number> = { player: -9999, npc: -9999 };
  const now = () => ctx.scene.time.now;

  const tasselPt = (r: Runner): { x: number; y: number } => r.horiz
    ? { x: r.end < 0 ? r.rect.x + 18 : r.rect.x + r.rect.w - 18, y: r.rect.y + r.rect.h / 2 }
    : { x: r.rect.x + r.rect.w / 2, y: r.end < 0 ? r.rect.y + 18 : r.rect.y + r.rect.h - 18 };
  const on = (r: Runner, x: number, y: number) => x > r.rect.x - 4 && x < r.rect.x + r.rect.w + 4 && y > r.rect.y - 4 && y < r.rect.y + r.rect.h + 4;
  const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 40 && b.x < a.x + a.w + 40 && a.y < b.y + b.h + 40 && b.y < a.y + a.h + 40;

  const pull = (r: Runner, by: Who | 'law', time: number) => {
    if (r.state !== 'laid') return;
    r.state = 'yanking'; r.at = time + WARN; r.by = by;
    ctx.sfx('whip');
    const tp = tasselPt(r);
    ctx.float(tp.x, tp.y - 34, by === 'law' ? 'CALLED IN' : 'TAKEN UP', by === 'law' ? '#9ad8ff' : SIDE_CSS[by]);
  };

  const lay = (time: number) => {
    for (let tries = 0; tries < 30; tries++) {
      const horiz = rng() < 0.55;
      const end: -1 | 1 = rng() < 0.5 ? -1 : 1;
      let rect: Rect;
      if (horiz) {
        const h = 92, w = 560 + rng() * 140, y = top + 40 + rng() * (H - top - 80 - h);
        rect = { x: end < 0 ? 0 : W - w, y, w, h };
      } else {
        const w = 92, h = 330 + rng() * 120, x = 60 + rng() * (W - 120 - w);
        rect = { x, y: end < 0 ? top : H - h, w, h };
      }
      if (runners.some((o) => o.state !== 'gone' && overlaps(o.rect, rect))) continue;
      const r: Runner = { rect, horiz, end, state: 'laying', at: time + LAY_MS, callAt: time + LAY_MS + CALL_MS, by: 'law', tassel: null };
      runners.push(r);
      ctx.sfx('whoosh');
      return;
    }
  };

  const takeUp = (r: Runner, time: number) => {
    const dx = r.horiz ? r.end : 0, dy = r.horiz ? 0 : r.end;
    for (const w of WHO) {
      const f = fighterOf(ctx, w);
      if (!alive(f) || !on(r, f.x, f.y)) continue;
      ctx.hit(f, DMG, f.x, f.y);
      ctx.stun(f, STUN);
      ctx.nudge(f, dx * 120, dy * 120);
      flooredAt[w] = time;
      ctx.sfx('stone-slam');
      if (w === 'player') ctx.float(f.x, f.y - 50, 'FLOORED', '#d4f0ff');
    }
    r.state = 'gone'; r.at = time + 450;
    r.tassel?.remove(); r.tassel = null;
  };

  return {
    update(time) {
      if (nextLay === 0) { nextLay = time + 1600; ctx.banner('THE TAKEN FLOOR: STRIKE A TASSEL AND THE RUNNER IS TAKEN UP', '#d4f0ff'); }
      if (time >= nextLay) {
        nextLay = time + EVERY;
        if (runners.filter((r) => r.state === 'laying' || r.state === 'laid').length < 2) lay(time);
      }
      for (let i = runners.length - 1; i >= 0; i--) {
        const r = runners[i];
        if (r.state === 'laying' && time >= r.at) {
          r.state = 'laid';
          const tp = tasselPt(r);
          r.tassel = ctx.target({ x: tp.x, y: tp.y, r: TASSEL_R, onStruck: (by) => pull(r, by, now()) });
        } else if (r.state === 'laid' && time >= r.callAt) pull(r, 'law', time);
        else if (r.state === 'yanking' && time >= r.at) takeUp(r, time);
        else if (r.state === 'gone' && time >= r.at) runners.splice(i, 1);
      }
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Off any runner that is about to go, or that you are near the tassel of.
      for (const r of runners) {
        if (!on(r, n.x, n.y) || r.state === 'gone') continue;
        const tp = tasselPt(r);
        if (r.state === 'yanking' || dist(p.x, p.y, tp.x, tp.y) < 140) {
          return r.horiz
            ? { x: n.x, y: clamp(n.y < r.rect.y + r.rect.h / 2 ? r.rect.y - 50 : r.rect.y + r.rect.h + 50, top + 40, H - 40) }
            : { x: clamp(n.x < r.rect.x + r.rect.w / 2 ? r.rect.x - 50 : r.rect.x + r.rect.w + 50, 40, W - 40), y: n.y };
        }
      }
      // You are on one: go and pull it.
      for (const r of runners) {
        if (r.state !== 'laid' || !on(r, p.x, p.y)) continue;
        const tp = tasselPt(r);
        const ox = r.horiz ? 0 : (n.x < tp.x ? -46 : 46), oy = r.horiz ? (n.y < tp.y ? -46 : 46) : 0;
        return { x: clamp(tp.x + ox, 40, W - 40), y: clamp(tp.y + oy, top + 40, H - 40) };
      }
      return null;
    },
    destroy() { for (const r of runners) r.tassel?.remove(); runners.length = 0; },
    drawGround(g, time) {
      for (const r of runners) drawRunner(g, r, time);
    },
    drawAir(g, time) {
      for (const r of runners) if (r.state === 'laid' || r.state === 'yanking') drawTassel(g, r, time);
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const k = (time - flooredAt[w]) / STUN;
        if (!alive(f) || k < 0 || k > 1) continue;
        // Flat on the floor: dust of lint and a ring of loose thread.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 400;
          g.lineStyle(1.5, 0xd8cfb6, 0.7 * (1 - k)); g.lineBetween(f.x + Math.cos(a) * 18, f.y + 10 + Math.sin(a) * 6, f.x + Math.cos(a + 0.5) * 28, f.y + 10 + Math.sin(a + 0.5) * 9);
        }
      }
    },
  };

  /** Sailcloth runner: canvas, a tide-blue selvedge stripe, stitched hems, the council seal stamped. */
  function drawRunner(g: Phaser.GameObjects.Graphics, r: Runner, time: number): void {
    const { x, y, w, h } = r.rect;
    // How much of it is out: unrolling from its wall, or whipping back to it.
    let k = 1;
    if (r.state === 'laying') k = clamp(1 - (r.at - time) / LAY_MS, 0, 1);
    if (r.state === 'gone') k = clamp((r.at - time) / 450, 0, 1);
    const len = (r.horiz ? w : h) * k;
    const vx = r.horiz ? (r.end < 0 ? x : x + w - len) : x, vy = r.horiz ? y : (r.end < 0 ? y : y + h - len);
    const vw = r.horiz ? len : w, vh = r.horiz ? h : len;
    if (len < 2) return;
    const cloth = 0xa8a290;
    g.fillStyle(0x000000, 0.35); g.fillRect(vx + 4, vy + 5, vw, vh);
    g.fillStyle(dim(cloth, 0.1), 1); g.fillRect(vx, vy, vw, vh);
    // Weave: fine lines across.
    g.lineStyle(1, dim(cloth, 0.22), 0.5);
    if (r.horiz) for (let i = vx + 6; i < vx + vw; i += 8) g.lineBetween(i, vy + 4, i, vy + vh - 4);
    else for (let i = vy + 6; i < vy + vh; i += 8) g.lineBetween(vx + 4, i, vx + vw - 4, i);
    // The selvedge stripes in tide-blue and the stitched hems.
    g.fillStyle(TIDE_DEEP, 0.9);
    if (r.horiz) { g.fillRect(vx, vy + 10, vw, 6); g.fillRect(vx, vy + vh - 16, vw, 6); } else { g.fillRect(vx + 10, vy, 6, vh); g.fillRect(vx + vw - 16, vy, 6, vh); }
    g.lineStyle(1.4, mixC(cloth, 0xffffff, 0.3), 0.8);
    const stitch = (ax: number, ay: number, bx: number, by: number) => {
      const d = Math.hypot(bx - ax, by - ay), n = Math.floor(d / 12);
      for (let i = 0; i < n; i++) g.lineBetween(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, ax + ((bx - ax) * (i + 0.5)) / n, ay + ((by - ay) * (i + 0.5)) / n);
    };
    if (r.horiz) { stitch(vx, vy + 4, vx + vw, vy + 4); stitch(vx, vy + vh - 4, vx + vw, vy + vh - 4); } else { stitch(vx + 4, vy, vx + 4, vy + vh); stitch(vx + vw - 4, vy, vx + vw - 4, vy + vh); }
    // The creditor's seal, every so often down its length.
    const along = r.horiz ? vw : vh;
    for (let s = 90; s < along - 40; s += 180) {
      const cx = r.horiz ? vx + s : vx + vw / 2, cy = r.horiz ? vy + vh / 2 : vy + s;
      g.lineStyle(1.5, OBS.seam, 0.6); g.strokeCircle(cx, cy, 16);
      councilMask(g, cx, cy, 10, { alpha: 0.55 });
    }
    // The ripple running down it toward the tassel when it is about to go.
    if (r.state === 'yanking') {
      const q = clamp(1 - (r.at - time) / WARN, 0, 1);
      const full = r.horiz ? w : h;
      for (let i = 0; i < 3; i++) {
        const f = clamp(q * 1.3 - i * 0.15, 0, 1);
        const pos = r.end < 0 ? full * (1 - f) : full * f;
        g.fillStyle(0xffffff, 0.25);
        if (r.horiz) g.fillRect(x + pos - 6, y - 4, 12, h + 8); else g.fillRect(x - 4, y + pos - 6, w + 8, 12);
      }
      g.lineStyle(3, TIDE_LIT, 0.4 + q * 0.5); g.strokeRect(x, y, w, h);
    }
    // The bolt itself, rolling at the free end as it lays out (or flying home as it is taken up).
    if (r.state === 'laying' || r.state === 'gone') {
      const bx = r.horiz ? (r.end < 0 ? vx + vw : vx) : vx + vw / 2, by = r.horiz ? vy + vh / 2 : (r.end < 0 ? vy + vh : vy);
      const bw = r.horiz ? 26 : vw + 10, bh = r.horiz ? vh + 10 : 26;
      g.fillStyle(dim(cloth, 0.3), 1); g.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      g.fillStyle(cloth, 1); g.fillRoundedRect(bx - bw / 2 + 3, by - bh / 2 + 3, bw - 6, bh * 0.4, 8);
      g.lineStyle(1.5, dim(cloth, 0.4), 1);
      for (let i = 1; i < 4; i++) { if (r.horiz) g.lineBetween(bx - bw / 2 + 2, by - bh / 2 + (bh * i) / 4, bx + bw / 2 - 2, by - bh / 2 + (bh * i) / 4); else g.lineBetween(bx - bw / 2 + (bw * i) / 4, by - bh / 2 + 2, bx - bw / 2 + (bw * i) / 4, by + bh / 2 - 2); }
    }
  }

  /** The tassel: a fat knot of tarred rope with a fringe, swinging; it glows while it is live. */
  function drawTassel(g: Phaser.GameObjects.Graphics, r: Runner, time: number): void {
    const tp = tasselPt(r);
    const swing = Math.sin(time / 300 + r.rect.x) * 0.25;
    const pulled = r.state === 'yanking';
    const live = clamp((r.callAt - time) / CALL_MS, 0, 1);
    g.fillStyle(0x000000, 0.35); g.fillEllipse(tp.x + 3, tp.y + 14, 34, 10);
    g.lineStyle(2, pulled ? TIDE_LIT : TIDE, 0.3 + (1 - live) * 0.4); g.strokeCircle(tp.x, tp.y, TASSEL_R + 4);
    // The cord back to the wall.
    const wx = r.horiz ? (r.end < 0 ? 0 : W) : tp.x, wy = r.horiz ? tp.y : (r.end < 0 ? top : H);
    g.lineStyle(4, 0x2a2018, 1); g.lineBetween(tp.x, tp.y, wx, wy);
    g.lineStyle(1.4, 0x6a5a42, 1); g.lineBetween(tp.x, tp.y - 1, wx, wy - 1);
    // The knot and the fringe.
    g.fillStyle(0x3a2c1e, 1); g.fillCircle(tp.x, tp.y - 4, 11);
    g.fillStyle(0x6a5440, 1); g.fillCircle(tp.x - 3, tp.y - 7, 6);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + swing + (i - 4) * 0.12;
      g.lineStyle(2, i % 2 ? 0x4a3a28 : TIDE_DEEP, 1);
      g.lineBetween(tp.x + (i - 4) * 2, tp.y + 4, tp.x + (i - 4) * 2 + Math.cos(a) * 18, tp.y + 4 + Math.sin(a) * 18);
    }
    // The law's patience running out: a ring of time round the knot.
    g.lineStyle(2, OBS.seamLit, 0.8);
    g.beginPath(); g.arc(tp.x, tp.y - 4, 15, -Math.PI / 2, -Math.PI / 2 + live * Math.PI * 2, false); g.strokePath();
    if (pulled) { g.fillStyle(TIDE, 0.25); g.fillCircle(tp.x, tp.y, 30); }
  }
};

export const TAKEN_FLOOR: GimmickDef = {
  id: 'bench-water-taken-floor',
  rules: 'Floor laid on credit may be taken up. Strike a runner\'s tassel and it is whipped away: all on it are floored (stunned) and dragged.',
  make,
};
