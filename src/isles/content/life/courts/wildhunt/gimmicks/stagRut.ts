import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_STAG } from '../encounters';
import {
  ANTLER, BARK, BARK_DARK, BARK_LIT, FOE_C, LOAM, MINE_C, MOSS, MOSS_LIT, clamp, dist, frameClock, hoofprint,
  logEnd, noise, segDist, stag,
} from '../util';

/**
 * Stag Rut — the deer park's old king is in rut, and Antlered Rowan has kept him nine seasons.
 * The stag grazes between five great oaks; then he swings his head round to **whoever struck the
 * last blow** — the clash is what rouses him — paws the turf, lowers his rack, and **charges in
 * a straight line** down a lane the floor shows you, goring anyone in it.
 *
 * A charge that misses runs on until it meets something. Meet an oak and **his antlers stick in
 * the trunk**: he thrashes there a moment, bark flying, before he tears free. Every so often
 * Rowan bellows the rut-call and sets the stag on you whoever hit last.
 *
 * The rule the player can turn: **the lane goes through everyone in it.** Strike, then stand so
 * Rowan is between you and the stag — or so an oak is — and let the old king do your work.
 */

interface Oak { x: number; y: number; r: number; shakeAt: number }
type Side = 'p' | 'n';
type SState = 'graze' | 'aim' | 'charge' | 'stuck' | 'recover';

const STAG_R = 34;

function makeStagRut(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const aimMs = hard ? 850 : 1050;
  const lockMs = aimMs * 0.55;
  const chargeSpd = hard ? 600 : 540;
  const goreDmg = hard ? 18 : 15;
  const midY = (top + H) / 2;

  const oaks: Oak[] = [
    { x: W * 0.2, y: top + 110, r: 28 }, { x: W * 0.8, y: top + 120, r: 30 }, { x: W * 0.5, y: midY + 6, r: 32 },
    { x: W * 0.22, y: H - 100, r: 30 }, { x: W * 0.78, y: H - 96, r: 28 },
  ].map((o) => ({ ...o, shakeAt: -9999 }));

  const st = {
    x: W * 0.5, y: top + 70, dir: 1, ph: 0, state: 'graze' as SState, until: ctx.scene.time.now + 2400,
    gx: W * 0.5, gy: top + 70, ax: 0, ay: 0, ox: 0, oy: 0, travelled: 0, head: 0,
    hitP: false, hitN: false, stuckOak: null as Oak | null, target: 'p' as Side,
  };
  let lastStriker: Side = 'p';
  let selfHit = false;
  let nextCall = ctx.scene.time.now + (hard ? 7000 : 9000);
  let calledAt = -9999;
  const chips: { x: number; y: number; vx: number; vy: number; at: number }[] = [];
  const prints: { x: number; y: number; a: number; at: number }[] = [];

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);

  /** A fresh patch of turf to crop, never in under an oak. */
  const pickGraze = (): void => {
    for (let i = 0; i < 8; i++) {
      st.gx = clamp(st.x + (ctx.rng() - 0.5) * 300, 80, W - 80);
      st.gy = clamp(st.y + (ctx.rng() - 0.5) * 200, top + 60, H - 60);
      if (!oaks.some((o) => dist(st.gx, st.gy, o.x, o.y) < o.r + STAG_R + 30)) return;
    }
  };

  const gore = (f: Fighter, isP: boolean): void => {
    if (!alive(f) || (isP ? st.hitP : st.hitN)) return;
    if (dist(f.x, f.y, st.x, st.y) > STAG_R + 18) return;
    if (isP) st.hitP = true; else st.hitN = true;
    selfHit = true;
    ctx.hit(f, goreDmg, f.x, f.y);
    selfHit = false;
    // Tossed aside off the rack.
    const ux = Math.cos(Math.atan2(st.ay, st.ax)), uy = Math.sin(Math.atan2(st.ay, st.ax));
    const side = (f.x - st.x) * -uy + (f.y - st.y) * ux >= 0 ? 1 : -1;
    ctx.nudge(f, ux * 40 - uy * side * 50, uy * 40 + ux * side * 50);
    ctx.float(f.x, f.y - 50, 'GORED', isP ? '#ffb27a' : '#9ae8ff');
    ctx.sfx('hit-heavy');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      // The rut-call: Rowan bellows and the old king looks for you.
      if (time >= nextCall && alive(ctx.npc) && st.state === 'graze') {
        nextCall = time + (hard ? 7000 : 9000);
        lastStriker = 'p';
        calledAt = time;
        ctx.float(ctx.npc.x, ctx.npc.y - 54, 'RUT CALL!', '#ffcf8a');
        ctx.sfx('roar');
      }

      if (st.state === 'graze') {
        const d = dist(st.x, st.y, st.gx, st.gy);
        if (d < 8) pickGraze();
        else {
          const k = Math.min(1, (42 * dt) / d);
          st.x += (st.gx - st.x) * k; st.y += (st.gy - st.y) * k;
          st.dir = st.gx > st.x ? 1 : -1; st.ph += dt * 4;
        }
        st.head = Math.max(0, st.head - dt * 3);
        if (time >= st.until && alive(fighter(lastStriker))) {
          st.state = 'aim'; st.until = time + ctx.tk.warn(aimMs); st.target = lastStriker;
          ctx.sfx('stone-rise');
        }
      } else if (st.state === 'aim') {
        const t = fighter(st.target);
        const elapsed = ctx.tk.warn(aimMs) - (st.until - time);
        if (elapsed < ctx.tk.warn(lockMs)) { st.ax = t.x - st.x; st.ay = t.y - st.y; }
        st.dir = st.ax >= 0 ? 1 : -1;
        st.head = Math.min(1, st.head + dt * 3);
        // Pawing the turf.
        if (Math.floor(time / 180) % 2 === 0 && prints.length < 60) prints.push({ x: st.x - st.dir * 10, y: st.y + 24, a: st.dir > 0 ? 0 : Math.PI, at: time });
        if (time >= st.until) {
          const L = Math.hypot(st.ax, st.ay) || 1;
          st.ax /= L; st.ay /= L;
          st.ox = st.x; st.oy = st.y; st.travelled = 0;
          st.hitP = false; st.hitN = false;
          st.state = 'charge';
          ctx.sfx('roar');
        }
      } else if (st.state === 'charge') {
        const stepLen = chargeSpd * dt;
        st.x += st.ax * stepLen; st.y += st.ay * stepLen; st.travelled += stepLen;
        st.ph += dt * 22;
        if (Math.floor(st.travelled / 34) > Math.floor((st.travelled - stepLen) / 34)) prints.push({ x: st.x, y: st.y + 24, a: Math.atan2(st.ay, st.ax), at: time });
        gore(ctx.player, true);
        gore(ctx.npc, false);
        // An oak in the way: the rack goes into the bark.
        for (const o of oaks) {
          if (dist(st.x, st.y, o.x, o.y) < o.r + STAG_R * 0.7) {
            st.state = 'stuck'; st.until = time + (hard ? 1600 : 1900); st.stuckOak = o; o.shakeAt = time;
            st.x = o.x - st.ax * (o.r + STAG_R * 0.7); st.y = o.y - st.ay * (o.r + STAG_R * 0.7);
            ctx.float(o.x, o.y - 70, 'STUCK FAST', '#e8dcc0');
            ctx.sfx('stone-slam');
            for (let i = 0; i < 10; i++) chips.push({ x: o.x, y: o.y - 30, vx: (ctx.rng() - 0.5) * 160, vy: -60 - ctx.rng() * 120, at: time });
            break;
          }
        }
        const out = st.x < 50 || st.x > W - 50 || st.y < top + 40 || st.y > H - 40;
        if (st.state === 'charge' && (out || st.travelled > 820)) {
          st.x = clamp(st.x, 50, W - 50); st.y = clamp(st.y, top + 40, H - 40);
          st.state = 'recover'; st.until = time + 700;
        }
      } else if (st.state === 'stuck') {
        st.ph += dt * 3;
        if (time >= st.until) { st.state = 'recover'; st.until = time + 500; st.stuckOak = null; ctx.sfx('snap-back'); }
      } else if (st.state === 'recover') {
        st.head = Math.max(0, st.head - dt * 2);
        if (time >= st.until) { st.state = 'graze'; st.until = time + (hard ? 1700 : 2300) + ctx.rng() * 800; pickGraze(); }
      }

      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 420 * dt;
        if (time - c.at > 900) chips.splice(i, 1);
      }
      for (let i = prints.length - 1; i >= 0; i--) if (time - prints[i].at > 5000) prints.splice(i, 1);
    },

    onNpcHurt() { if (!selfHit) lastStriker = 'p'; },
    onPlayerHurt() { if (!selfHit) lastStriker = 'n'; },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (st.state !== 'aim' && st.state !== 'charge') return null;
      if (st.target === 'n') {
        // Put an oak between himself and the old king.
        let best: Oak | null = null, bd = Infinity;
        for (const o of oaks) { const d = dist(n.x, n.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
        if (!best) return null;
        const a = Math.atan2(best.y - st.y, best.x - st.x);
        return { x: clamp(best.x + Math.cos(a) * (best.r + 46), 60, W - 60), y: clamp(best.y + Math.sin(a) * (best.r + 46), top + 40, H - 40) };
      }
      // He is not the mark: just step out of the lane.
      const ex = st.x + st.ax * 900, ey = st.y + st.ay * 900;
      if (segDist(n.x, n.y, st.x, st.y, ex, ey) > STAG_R + 50) return null;
      const L = Math.hypot(st.ax, st.ay) || 1;
      const nx = -st.ay / L, ny = st.ax / L;
      const side = (n.x - st.x) * nx + (n.y - st.y) * ny >= 0 ? 1 : -1;
      return { x: clamp(n.x + nx * side * 140, 60, W - 60), y: clamp(n.y + ny * side * 140, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const ts = time / 1000;
      for (const p of prints) {
        const k = 1 - (time - p.at) / 5000;
        hoofprint(g, p.x, p.y, p.a, 8, 0x1a140c, 0.45 * k);
      }
      // The oaks: seen from above — a broad trunk in bark, buttress roots, moss in the crotches.
      for (let i = 0; i < oaks.length; i++) {
        const o = oaks[i];
        const sh = time - o.shakeAt < 700 ? Math.sin(time / 25) * 3 * (1 - (time - o.shakeAt) / 700) : 0;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(o.x + 10, o.y + 12, o.r * 3.4, o.r * 1.6);
        g.fillStyle(LOAM, 0.9); g.fillEllipse(o.x, o.y + 4, o.r * 3, o.r * 1.5);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + i;
          g.fillStyle(BARK_DARK, 1);
          g.fillTriangle(o.x + Math.cos(a + 0.35) * o.r * 0.6, o.y + Math.sin(a + 0.35) * o.r * 0.5, o.x + Math.cos(a - 0.35) * o.r * 0.6, o.y + Math.sin(a - 0.35) * o.r * 0.5, o.x + Math.cos(a) * o.r * 1.55, o.y + Math.sin(a) * o.r * 0.95);
        }
        g.fillStyle(BARK_DARK, 1); g.fillCircle(o.x + sh, o.y, o.r + 3);
        g.fillStyle(BARK, 1); g.fillCircle(o.x + sh, o.y, o.r);
        g.lineStyle(2, BARK_DARK, 0.7);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineBetween(o.x + sh + Math.cos(a) * o.r * 0.3, o.y + Math.sin(a) * o.r * 0.3, o.x + sh + Math.cos(a + 0.2) * o.r * 0.95, o.y + Math.sin(a + 0.2) * o.r * 0.95); }
        g.fillStyle(BARK_LIT, 0.6); g.fillCircle(o.x + sh - o.r * 0.35, o.y - o.r * 0.35, o.r * 0.32);
        g.fillStyle(MOSS, 0.8); g.fillEllipse(o.x + sh + o.r * 0.2, o.y + o.r * 0.3, o.r * 0.7, o.r * 0.3);
        g.fillStyle(MOSS_LIT, 0.6); g.fillEllipse(o.x + sh + o.r * 0.25, o.y + o.r * 0.25, o.r * 0.35, o.r * 0.12);
        // Old gouges in the bark from seasons past.
        g.lineStyle(2, ANTLER, 0.35); g.lineBetween(o.x - o.r * 0.5, o.y - o.r * 0.6, o.x - o.r * 0.1, o.y - o.r * 0.2);
        g.lineBetween(o.x - o.r * 0.35, o.y - o.r * 0.7, o.x + o.r * 0.05, o.y - o.r * 0.3);
      }
      // The lane, shown while he aims: a churned strip with chevrons running toward the end he'll take.
      if (st.state === 'aim') {
        const c = clamp(1 - (st.until - time) / ctx.tk.warn(aimMs), 0, 1);
        const L = Math.hypot(st.ax, st.ay) || 1;
        const ux = st.ax / L, uy = st.ay / L, nx = -uy, ny = ux;
        const len = 820, hw = STAG_R + 6;
        const col = st.target === 'p' ? 0xff7a4a : 0x6ac8ff;
        g.fillStyle(col, 0.08 + c * 0.14);
        g.fillTriangle(st.x + nx * hw, st.y + ny * hw, st.x - nx * hw, st.y - ny * hw, st.x + ux * len + nx * hw, st.y + uy * len + ny * hw);
        g.fillTriangle(st.x - nx * hw, st.y - ny * hw, st.x + ux * len - nx * hw, st.y + uy * len - ny * hw, st.x + ux * len + nx * hw, st.y + uy * len + ny * hw);
        for (let d = (ts * 300) % 46; d < len * c; d += 46) {
          const x = st.x + ux * d, y = st.y + uy * d;
          g.lineStyle(3, col, 0.55);
          g.lineBetween(x + nx * hw * 0.6 - ux * 12, y + ny * hw * 0.6 - uy * 12, x, y);
          g.lineBetween(x - nx * hw * 0.6 - ux * 12, y - ny * hw * 0.6 - uy * 12, x, y);
        }
        g.lineStyle(2, col, 0.4 + c * 0.5);
        g.lineBetween(st.x + nx * hw, st.y + ny * hw, st.x + ux * len + nx * hw, st.y + uy * len + ny * hw);
        g.lineBetween(st.x - nx * hw, st.y - ny * hw, st.x + ux * len - nx * hw, st.y + uy * len - ny * hw);
      }
      // Dust kicked up behind a charge.
      if (st.state === 'charge') {
        for (let i = 0; i < 8; i++) {
          const ph = ((time / 160) + i / 8) % 1;
          g.fillStyle(0x8a7a5a, 0.4 * (1 - ph));
          g.fillCircle(st.x - st.ax * (30 + ph * 60) + Math.sin(i * 2.3) * 12, st.y + 22 - st.ay * (30 + ph * 60), 5 + ph * 8);
        }
      }
    },

    drawAir(g, time) {
      const stuck = st.state === 'stuck' ? time / 1000 : 0;
      const dirX = st.state === 'charge' || st.state === 'aim' || st.state === 'stuck' ? (st.ax >= 0 ? 1 : -1) : st.dir;
      stag(g, st.x, st.y - 6, dirX, 1.1, st.ph, st.head, 1, stuck);
      // Rut breath: steam puffs off the muzzle while he aims.
      if (st.state === 'aim' || st.state === 'stuck') {
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 500) + i / 3) % 1;
          g.fillStyle(0xffffff, 0.35 * (1 - ph)); g.fillCircle(st.x + dirX * (46 + ph * 18), st.y - 4 - ph * 10, 4 + ph * 6);
        }
        // Whom he is after: a small ring over the mark.
        const t = fighter(st.target);
        if (alive(t) && st.state === 'aim') {
          const col = st.target === 'p' ? 0xff7a4a : 0x6ac8ff;
          g.lineStyle(2, col, 0.85); g.strokeCircle(t.x, t.y - 46, 9);
          g.fillStyle(col, 0.85); g.fillTriangle(t.x - 6, t.y - 40, t.x + 6, t.y - 40, t.x, t.y - 32);
        }
      }
      for (const c of chips) {
        const k = 1 - (time - c.at) / 900;
        g.fillStyle(noise(c.vx) < 0.5 ? BARK_LIT : BARK, k); g.fillRect(c.x, c.y, 4, 3);
      }
      if (st.stuckOak) logEnd(g, st.stuckOak.x + Math.sin(time / 40) * 2, st.stuckOak.y - st.stuckOak.r - 18, 4, 0.6);
      if (time - calledAt < 800) {
        const k = (time - calledAt) / 800;
        g.lineStyle(5 * (1 - k), 0xffcf8a, 0.7 * (1 - k)); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 30 + k * 120);
      }
    },

    drawHud(g) {
      // Whose blow the old king remembers.
      const x = ctx.W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 54, y - 10, 108, 22, 6);
      const col = lastStriker === 'p' ? MINE_C : FOE_C;
      g.fillStyle(col, 1); g.fillCircle(x + (lastStriker === 'p' ? -34 : 34), y + 1, 6);
      g.lineStyle(2, ANTLER, 0.9);
      g.lineBetween(x - 16, y + 4, x - 22, y - 6); g.lineBetween(x - 19, y - 1, x - 26, y - 2);
      g.lineBetween(x + 16, y + 4, x + 22, y - 6); g.lineBetween(x + 19, y - 1, x + 26, y - 2);
      g.fillStyle(0x8a5e3a, 1); g.fillEllipse(x, y + 3, 22, 12);
    },
  };
}

export const STAG_RUT: GimmickDef = {
  id: GIM_STAG,
  rules: 'A rutting stag charges in a straight line at whoever struck last, goring all in its lane. Miss into an oak and its antlers stick fast.',
  make: makeStagRut,
};
