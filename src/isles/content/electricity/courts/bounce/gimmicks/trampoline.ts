import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { trampoline } from '../art';
import { ARC, CANVAS_LIT, LATEX_LIT, TOY_BLUE, TOY_RED, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, hop, stepDt } from '../util';

/**
 * Trampoline Square — Acrobat Pippa.
 *
 * Four sunk trampolines stand at the corners of the square. Step onto one and it throws you,
 * high, across the square — always at the other fighter, wherever they stood when you left the
 * canvas. A ring on the floor marks where you will come down. In the air you are untouchable
 * (shots fly under you, blows miss) but you cannot steer; you come down where the canvas sent
 * you, and the landing is a shockwave that hurts and throws whoever is still standing in the ring.
 *
 * So the trampoline is an attack anyone can make. Pippa makes it constantly. Step out of her
 * ring, and then jump yourself while she is still picking herself up. Every so often the storm
 * wind gusts through the square and *charges* the canvases: the next throw off a charged
 * trampoline goes higher and lands harder.
 */

const TRAMP_R = 40;
const STEP_R = 30;
const READY_MS = 2800;
const LAND_R = 110;
const LAND_R_HIGH = 150;

interface Tramp { x: number; y: number; readyAt: number; sagAt: number; charged: boolean }
interface Flight { fx: number; fy: number; tx: number; ty: number; start: number; dur: number; high: boolean }
interface Wave { x: number; y: number; r: number; at: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const midY = (top + H) / 2;
  const tramps: Tramp[] = [
    { x: 190, y: top + 120 }, { x: W - 190, y: top + 120 }, { x: 190, y: H - 90 }, { x: W - 190, y: H - 90 },
  ].map((p) => ({ ...p, readyAt: 0, sagAt: -9999, charged: false }));
  if (ctx.hard) tramps.push({ x: W / 2, y: midY, readyAt: 0, sagAt: -9999, charged: false });

  const flights = new Map<Fighter, Flight | null>([[player, null], [npc, null]]);
  const lastLand = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const waves: Wave[] = [];
  const updraftEvery = ctx.hard ? 7600 : 9200;
  let nextUpdraft = 0;
  let updraftAt = -9999;
  let started = false;

  const other = (f: Fighter) => (f === player ? npc : player);
  const flying = (f: Fighter) => !!flights.get(f);

  function launch(f: Fighter, t: Tramp, time: number): void {
    const o = other(f);
    let tx = clamp(o.x, 60, W - 60), ty = clamp(o.y, top + 50, H - 40);
    // Never straight back down onto the same canvas.
    if (dist(tx, ty, t.x, t.y) < 120) {
      const a = Math.atan2(midY - t.y, W / 2 - t.x);
      tx = clamp(t.x + Math.cos(a) * 220, 60, W - 60); ty = clamp(t.y + Math.sin(a) * 220, top + 50, H - 40);
    }
    const d = dist(f.x, f.y, tx, ty);
    const dur = clamp(760 + d * 0.5, 820, 1300);
    flights.set(f, { fx: f.x, fy: f.y, tx, ty, start: time, dur, high: t.charged });
    ctx.airborne(f, dur);
    ctx.float(f.x, f.y - 50, t.charged ? 'SKY-HIGH!' : 'BOING!', '#9ad8ff');
    t.readyAt = time + READY_MS;
    t.sagAt = time;
    t.charged = false;
    ctx.root(f, 140);
    ctx.sfx('boing');
  }

  function land(f: Fighter, fl: Flight, time: number): void {
    flights.set(f, null);
    lastLand.set(f, time);
    const R = fl.high ? LAND_R_HIGH : LAND_R;
    const dmg = (fl.high ? 18 : 12) + (ctx.hard ? 3 : 0);
    waves.push({ x: f.x, y: f.y, r: R, at: time, color: f === player ? TOY_BLUE : TOY_RED });
    ctx.sfx(fl.high ? 'gravity-slam' : 'stone-slam');
    ctx.flash(f.x, f.y, f === player ? TOY_BLUE : TOY_RED);
    const o = other(f);
    if (!alive(o) || flying(o)) return;
    const d = dist(o.x, o.y, f.x, f.y);
    if (d < R) {
      const a = Math.atan2(o.y - f.y, o.x - f.x);
      ctx.hit(o, dmg, o.x, o.y);
      ctx.nudge(o, Math.cos(a) * 110, Math.sin(a) * 110);
      if (fl.high) ctx.stun(o, 450);
      ctx.float(o.x, o.y - 46, 'FLATTENED', '#ffd0a0');
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextUpdraft = time + updraftEvery; }
      if (time >= nextUpdraft) {
        nextUpdraft = time + updraftEvery;
        updraftAt = time;
        for (const t of tramps) t.charged = true;
        ctx.banner('UPDRAFT — THE CANVASES ARE CHARGED', '#9ad8ff');
        ctx.sfx('gust');
      }
      for (const [f, fl] of flights) {
        if (!alive(f)) { flights.set(f, null); continue; }
        if (fl) {
          const k = (time - fl.start) / fl.dur;
          if (k >= 1) {
            ctx.nudge(f, fl.tx - f.x, fl.ty - f.y);
            land(f, fl, time);
            continue;
          }
          // Carried along the throw: no steering in the air.
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const px = fl.fx + (fl.tx - fl.fx) * e, py = fl.fy + (fl.ty - fl.fy) * e;
          ctx.nudge(f, px - f.x, py - f.y);
          ctx.root(f, 90);
          continue;
        }
        if (time - (lastLand.get(f) ?? 0) < 650) continue;
        for (const t of tramps) {
          if (time < t.readyAt) continue;
          if (dist(f.x, f.y, t.x, t.y) < STEP_R) { launch(f, t, time); break; }
        }
      }
    },

    npcSeek() {
      // Get out of the ring where you are coming down.
      const pf = flights.get(player);
      if (pf) {
        const R = (pf.high ? LAND_R_HIGH : LAND_R) + 50;
        if (dist(npc.x, npc.y, pf.tx, pf.ty) < R) {
          const a = Math.atan2(npc.y - pf.ty, npc.x - pf.tx) + 0.3;
          return { x: clamp(pf.tx + Math.cos(a) * (R + 30), 60, W - 60), y: clamp(pf.ty + Math.sin(a) * (R + 30), top + 50, H - 40) };
        }
      }
      if (flying(npc)) return null;
      // Otherwise she goes for the nearest ready canvas — a charged one first.
      let best: Tramp | null = null;
      let bs = Infinity;
      for (const t of tramps) {
        if (ctx.scene.time.now < t.readyAt - 400) continue;
        const s = dist(npc.x, npc.y, t.x, t.y) - (t.charged ? 160 : 0) - dist(player.x, player.y, t.x, t.y) * 0.3;
        if (s < bs) { bs = s; best = t; }
      }
      if (best && dist(npc.x, npc.y, player.x, player.y) > 130) return { x: best.x, y: best.y };
      return null;
    },

    drawGround(g, time) {
      for (const t of tramps) {
        const sk = (time - t.sagAt) / 500;
        const sag = sk >= 0 && sk < 1 ? Math.sin(sk * Math.PI) * (1 - sk * 0.4) : 0;
        if (t.charged) glow(g, t.x, t.y, TRAMP_R + 30, CANVAS_LIT, 0.05 + Math.sin(time / 120) * 0.02, 3);
        trampoline(g, t.x, t.y, TRAMP_R, sag, 0.66);
        if (time < t.readyAt) {
          // Recharging: the springs are still ringing.
          const k = 1 - (t.readyAt - time) / READY_MS;
          g.fillStyle(0x000000, 0.35); g.fillEllipse(t.x, t.y, TRAMP_R * 1.6, TRAMP_R * 1.05);
          g.lineStyle(3, TOY_YELLOW, 0.8);
          g.beginPath(); g.arc(t.x, t.y, TRAMP_R + 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else if (t.charged) {
          for (let i = 0; i < 6; i++) {
            const a = time / 300 + (i / 6) * Math.PI * 2;
            g.fillStyle(ARC, 0.8); g.fillCircle(t.x + Math.cos(a) * (TRAMP_R + 8), t.y + Math.sin(a) * (TRAMP_R + 8) * 0.66, 2);
          }
        }
      }
      // Where each flyer comes down: a ring tightening as they fall.
      for (const [f, fl] of flights) {
        if (!fl) continue;
        const k = clamp((time - fl.start) / fl.dur, 0, 1);
        const R = fl.high ? LAND_R_HIGH : LAND_R;
        const c = f === player ? TOY_BLUE : TOY_RED;
        g.fillStyle(c, 0.08 + k * 0.14); g.fillCircle(fl.tx, fl.ty, R);
        g.lineStyle(3, c, 0.4 + k * 0.5); g.strokeCircle(fl.tx, fl.ty, R);
        g.lineStyle(2, lit(c, 0.4), 0.8); g.strokeCircle(fl.tx, fl.ty, R * (1 - k) + 10);
        g.lineBetween(fl.tx - 14, fl.ty, fl.tx + 14, fl.ty); g.lineBetween(fl.tx, fl.ty - 14, fl.tx, fl.ty + 14);
        // The flyer's shadow, sliding along the throw and shrinking at the top.
        const s = 1 - hop(k, 0.55);
        g.fillStyle(0x000000, 0.3 * s + 0.1); g.fillEllipse(f.x, f.y + 18, 40 * s + 8, 12 * s + 3);
      }
      // Shockwaves.
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        const k = (time - w.at) / 500;
        if (k >= 1) { waves.splice(i, 1); continue; }
        g.lineStyle(6 * (1 - k), w.color, 0.8 * (1 - k)); g.strokeCircle(w.x, w.y, w.r * (0.3 + k * 0.7));
        g.lineStyle(2, LATEX_LIT, 0.6 * (1 - k)); g.strokeCircle(w.x, w.y, w.r * (0.2 + k * 0.8));
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * Math.PI * 2;
          g.fillStyle(0x6a5a4a, 1 - k); g.fillCircle(w.x + Math.cos(a) * w.r * k, w.y + Math.sin(a) * w.r * k * 0.7 - (1 - k) * 8, 2.5);
        }
      }
    },

    drawAir(g, time) {
      for (const [f, fl] of flights) {
        if (!fl) continue;
        const k = clamp((time - fl.start) / fl.dur, 0, 1);
        const c = f === player ? TOY_BLUE : TOY_RED;
        // The throw's arc, dotted, from the canvas to the ring; a bead marks the height.
        const peak = 90 + dist(fl.fx, fl.fy, fl.tx, fl.ty) * 0.2;
        for (let i = 0; i <= 16; i++) {
          const q = i / 16;
          const x = fl.fx + (fl.tx - fl.fx) * q, y = fl.fy + (fl.ty - fl.fy) * q - hop(q, peak);
          g.fillStyle(c, q < k ? 0.15 : 0.5); g.fillCircle(x, y, 2);
        }
        const hx = f.x, hy = f.y - hop(k, peak);
        g.lineStyle(1.5, c, 0.6); g.lineBetween(f.x, f.y - 20, hx, hy);
        g.fillStyle(lit(c, 0.3), 0.9); g.fillCircle(hx, hy, 5);
        // Wind streaks round the flyer.
        for (let i = 0; i < 5; i++) {
          const a = time / 60 + i * 1.3;
          g.lineStyle(1.5, LATEX_LIT, 0.5);
          g.lineBetween(f.x + Math.cos(a) * 26, f.y - 10 + Math.sin(a) * 18, f.x + Math.cos(a) * 34, f.y - 10 + Math.sin(a) * 24);
        }
        g.lineStyle(2, c, 0.5); g.strokeCircle(f.x, f.y - 6, 26);
      }
      // The gust when the canvases are charged.
      const uk = (time - updraftAt) / 1200;
      if (uk >= 0 && uk < 1) {
        for (let i = 0; i < 18; i++) {
          const x = (i * 131) % W, y = H - uk * (H - top) - ((i * 47) % 120);
          g.lineStyle(2, CANVAS_LIT, 0.5 * (1 - uk)); g.lineBetween(x, y, x + 6, y - 40);
        }
      }
    },

    drawHud(g, time) {
      // The next updraft: a little row of rising chevrons at the top centre.
      const k = clamp(1 - (nextUpdraft - time) / updraftEvery, 0, 1);
      const x0 = W / 2 - 60, y = top + 12;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 6, y - 8, 132, 18, 6);
      for (let i = 0; i < 6; i++) {
        const on = k * 6 > i;
        const x = x0 + i * 22 + 8;
        g.fillStyle(on ? CANVAS_LIT : 0x3a3a48, on ? 1 : 0.8);
        g.fillTriangle(x - 7, y + 5, x + 7, y + 5, x, y - 5);
      }
    },
  };
}

export const TRAMPOLINE_SQUARE: GimmickDef = {
  id: 'bounce-trampoline',
  rules: 'Step on a trampoline to be thrown at your foe and land in a shockwave. In the air nothing can hit you — but you can\'t steer. Updrafts throw higher.',
  make,
};
