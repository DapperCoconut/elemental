import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { BRASS, FLAME, FLAME_LIT, MINE, SOUL, SOUL_DEEP, SOUL_LIT, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Soul-Thread — Binder Tether.
 *
 * Tether hangs the lanterns: she binds each one to its wire with soul-thread, the glowing stuff the
 * Catchers spin from a last breath. Now it binds the two of you. The thread has a length; inside it,
 * it hangs slack. Stretch it past and it burns white — and it burns *whoever is pulling away*, and
 * drags them back. So the fight stays close, and running is punished, unless she is the one running.
 *
 * In the middle of the thread is a knot. Strike it — any blow, from either side, wears it — and the
 * thread parts for a while; it re-ties itself after. Every so often Tether winds her spool and reels
 * the thread in short, hauling you to her; cut the knot before she winds and the spool spins on
 * nothing.
 */

const KNOT_R = 18;

interface Cut { until: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const LEN = ctx.hard ? 225 : 250;
  const KNOT_HP = ctx.hard ? 48 : 36;
  const CUT_MS = ctx.hard ? 5000 : 6200;
  const reelEvery = ctx.hard ? 8200 : 10000;
  const REEL_WARN = 1200;
  const REEL_MS = 1700;
  let knotHp = KNOT_HP;
  let cut: Cut | null = null;
  let knot: StrikeTarget | null = null;
  let nextReel = 0;
  let reelWarnAt = -1;
  let reelUntil = 0;
  let started = false;
  let lastBurn = 0;
  let burning: Fighter | null = null;
  let knotFlash = 0;
  const prev = new Map<Fighter, { x: number; y: number }>();

  const mid = () => ({ x: (player.x + npc.x) / 2, y: (player.y + npc.y) / 2 - 8 });

  /** The thread's sag (px) and stretch (0–1) right now: slack when short, taut near its length. */
  function shape(time: number): { len: number; stretch: number; sag: number } {
    const len = time < reelUntil ? 110 : LEN;
    const d = dist(player.x, player.y, npc.x, npc.y);
    const stretch = clamp((d - len * 0.8) / (len * 0.35), 0, 1);
    return { len, stretch, sag: (1 - stretch) * 46 };
  }

  /** Where the knot sits: half-way along the hanging curve. */
  function knotAt(time: number): { x: number; y: number } {
    const m = mid();
    return { x: m.x, y: m.y + shape(time).sag / 2 };
  }

  function tie(): void {
    knotHp = KNOT_HP;
    const m = mid();
    knot = ctx.target({
      x: m.x, y: m.y, r: KNOT_R, passThrough: true,
      onStruck: (_by, amount) => {
        if (cut) return;
        knotHp -= Math.max(4, amount);
        knotFlash = ctx.scene.time.now;
        ctx.sfx('clang');
        if (knotHp <= 0) part();
      },
    });
  }

  function part(): void {
    const now = ctx.scene.time.now;
    cut = { until: now + CUT_MS, at: now };
    knot?.remove();
    knot = null;
    reelUntil = 0;
    const m = mid();
    ctx.float(m.x, m.y - 30, 'THE THREAD PARTS', '#e4f5ff');
    ctx.sfx('snap-back');
  }

  /** How fast a fighter is moving away from the other, px/s (0 if not). */
  function pullingAway(f: Fighter, other: Fighter, dt: number): number {
    const p = prev.get(f);
    if (!p || dt <= 0) return 0;
    const ux = f.x - other.x, uy = f.y - other.y;
    const l = Math.hypot(ux, uy) || 1;
    return Math.max(0, ((f.x - p.x) * ux + (f.y - p.y) * uy) / l / dt);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextReel = time + reelEvery; tie(); }
      if (!alive(player) || !alive(npc)) return;

      if (cut && time >= cut.until) {
        cut = null;
        tie();
        const m = mid();
        ctx.float(m.x, m.y - 30, 'RE-TIED', '#bfe6ff');
        ctx.sfx('chain');
      }
      if (knot) { const k = knotAt(time); knot.moveTo(k.x, k.y); }

      // Tether winds her spool.
      if (reelWarnAt < 0 && time >= nextReel - REEL_WARN) {
        reelWarnAt = time;
        ctx.banner('TETHER WINDS THE SPOOL', '#bfe6ff');
        ctx.sfx('gear-turn');
      }
      if (reelWarnAt >= 0 && time >= nextReel) {
        reelWarnAt = -1;
        nextReel = time + reelEvery;
        if (cut) { ctx.float(npc.x, npc.y - 50, 'IT SPINS ON NOTHING', '#ffe2a0'); ctx.sfx('boing'); }
        else { reelUntil = time + REEL_MS; ctx.sfx('magnet-pull'); }
      }

      const d = dist(player.x, player.y, npc.x, npc.y);
      burning = null;
      if (!cut) {
        const reeling = time < reelUntil;
        const len = reeling ? 110 : LEN;
        if (reeling && d > len) {
          const a = Math.atan2(npc.y - player.y, npc.x - player.x);
          const s = Math.min(d - len, 230 * dt);
          ctx.nudge(player, Math.cos(a) * s, Math.sin(a) * s);
        } else if (d > len) {
          // Over-stretched: the one pulling away burns and is dragged back.
          const pp = pullingAway(player, npc, dt), pn = pullingAway(npc, player, dt);
          const both = pp < 20 && pn < 20;
          const over = d - len;
          for (const [f, other, pull] of [[player, npc, pp], [npc, player, pn]] as [Fighter, Fighter, number][]) {
            if (!both && pull < Math.max(pp, pn)) continue;
            const a = Math.atan2(other.y - f.y, other.x - f.x);
            const s = Math.min(over * (both ? 0.5 : 1), (both ? 90 : 220) * dt + over * 2 * dt);
            ctx.nudge(f, Math.cos(a) * s, Math.sin(a) * s);
            if (!both) burning = f;
          }
          if (time - lastBurn > 450) {
            lastBurn = time;
            const victims = burning ? [burning] : [player, npc];
            for (const f of victims) { ctx.hit(f, ctx.hard ? 5 : 4, f.x, f.y); }
            ctx.sfx('sizzle');
            if (burning) ctx.float(burning.x, burning.y - 46, 'BURNS', '#fff2c0');
          }
        }
      }
      prev.set(player, { x: player.x, y: player.y });
      prev.set(npc, { x: npc.x, y: npc.y });
    },

    npcSeek() {
      // Tether keeps the thread a little slack between you — and stays put when she is about to reel.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      const want = cut ? 260 : reelWarnAt >= 0 ? LEN * 0.95 : LEN * 0.62;
      return { x: clamp(player.x + Math.cos(a) * want, 60, W - 60), y: clamp(player.y + Math.sin(a) * want, top + 50, H - 40) };
    },

    drawGround(g) {
      if (!alive(player) || !alive(npc)) return;
      // The thread's reach, chalked faintly round Tether.
      g.lineStyle(1, SOUL, 0.18); g.strokeCircle(npc.x, npc.y, LEN);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.fillStyle(SOUL, 0.25); g.fillCircle(npc.x + Math.cos(a) * LEN, npc.y + Math.sin(a) * LEN, 1.6);
      }
    },

    drawAir(g, time) {
      if (!alive(player) || !alive(npc)) return;
      const t = time / 1000;
      const d = dist(player.x, player.y, npc.x, npc.y);
      const ax = player.x, ay = player.y - 8, bx = npc.x, by = npc.y - 8;
      if (cut) {
        // Frayed ends dangling from each of them, and the knot re-forming.
        for (const [x, y, s] of [[ax, ay, 1], [bx, by, -1]] as [number, number, number][]) {
          const a = Math.atan2(by - ay, bx - ax) * s + (s < 0 ? Math.PI : 0);
          g.lineStyle(2, SOUL, 0.6);
          g.beginPath(); g.moveTo(x, y);
          for (let i = 1; i <= 6; i++) g.lineTo(x + Math.cos(a) * i * 7, y + Math.sin(a) * i * 7 + i * i * 0.9 + Math.sin(t * 4 + i) * 2);
          g.strokePath();
        }
        const k = clamp((time - cut.at) / (cut.until - cut.at), 0, 1);
        const m = mid();
        g.lineStyle(2, SOUL_LIT, 0.5); g.beginPath(); g.arc(m.x, m.y, KNOT_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        return;
      }
      const reeling = time < reelUntil;
      const { len, stretch, sag } = shape(time);
      const hot = d > len;
      // The thread: slack curve when short, taut and white-hot past its length.
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
      const col = hot ? FLAME_LIT : stretch > 0.5 ? lit(SOUL, 0.4) : SOUL;
      if (hot) glow(g, mx, my, 30, FLAME, 0.06, 2);
      for (const [w, c, al] of [[6, SOUL_DEEP, 0.25], [2.5, col, 0.95]] as [number, number, number][]) {
        g.lineStyle(w, c, al);
        g.beginPath(); g.moveTo(ax, ay);
        for (let i = 1; i <= 16; i++) {
          const k = i / 16;
          const wob = hot ? Math.sin(t * 40 + i) * 1.5 : Math.sin(t * 2 + i * 0.7) * 2;
          const x = (1 - k) * (1 - k) * ax + 2 * (1 - k) * k * mx + k * k * bx;
          const y = (1 - k) * (1 - k) * ay + 2 * (1 - k) * k * my + k * k * by + wob;
          g.lineTo(x, y);
        }
        g.strokePath();
      }
      if (hot) {
        for (let i = 0; i < 8; i++) {
          const k = ((t * 2 + i / 8) % 1);
          const x = (1 - k) * (1 - k) * ax + 2 * (1 - k) * k * mx + k * k * bx, y = (1 - k) * (1 - k) * ay + 2 * (1 - k) * k * my + k * k * by;
          g.fillStyle(FLAME_LIT, 0.9); g.fillCircle(x + Math.sin(i * 7 + t * 20) * 4, y - ((t * 60 + i * 10) % 14), 1.6);
        }
        if (burning) { g.lineStyle(3, FLAME, 0.5 + Math.sin(time / 60) * 0.3); g.strokeCircle(burning.x, burning.y - 6, 26); }
      }
      // Reel telegraph: chevrons running along the thread toward Tether.
      if (reelWarnAt >= 0 || reeling) {
        for (let i = 0; i < 5; i++) {
          const k = ((t * (reeling ? 2.4 : 1.2)) + i / 5) % 1;
          const x = ax + (bx - ax) * k, y = ay + (by - ay) * k;
          const a = Math.atan2(by - ay, bx - ax);
          g.lineStyle(2, MINE, 0.8);
          g.lineBetween(x - Math.cos(a - 0.6) * 8, y - Math.sin(a - 0.6) * 8, x, y);
          g.lineBetween(x - Math.cos(a + 0.6) * 8, y - Math.sin(a + 0.6) * 8, x, y);
        }
      }
      // The knot: a figure-eight of thread with two brass beads, its wear shown as a ring.
      const { x: kx, y: ky } = knotAt(time);
      const fl = time - knotFlash < 160;
      glow(g, kx, ky, 26, SOUL, 0.06, 2);
      g.lineStyle(3, fl ? 0xffffff : SOUL_LIT, 1);
      g.strokeCircle(kx - 6, ky, 7); g.strokeCircle(kx + 6, ky, 7);
      g.fillStyle(BRASS, 1); g.fillCircle(kx - 12, ky + 5, 3); g.fillCircle(kx + 12, ky + 5, 3);
      g.lineStyle(2, MINE, 0.7);
      g.beginPath(); g.arc(kx, ky, KNOT_R + 4, -Math.PI / 2, -Math.PI / 2 + (knotHp / KNOT_HP) * Math.PI * 2, false); g.strokePath();
      // Tether's spool, spinning when she winds.
      const spin = reeling ? t * 20 : reelWarnAt >= 0 ? t * 8 : t;
      const sx = npc.x + 22, sy = npc.y - 26;
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(sx, sy, 8);
      g.fillStyle(TIMBER, 1); g.fillCircle(sx, sy, 6);
      g.lineStyle(1.5, SOUL_LIT, 1); g.lineBetween(sx + Math.cos(spin) * 6, sy + Math.sin(spin) * 6, sx - Math.cos(spin) * 6, sy - Math.sin(spin) * 6);
    },

    destroy() { knot?.remove(); },
  };
}

export const SOUL_THREAD: GimmickDef = {
  id: 'lantern-soul-thread',
  rules: 'A soul-thread binds you: stretched too far, it burns and drags whoever pulls away. Strike the knot to cut it for a while.',
  make,
};
