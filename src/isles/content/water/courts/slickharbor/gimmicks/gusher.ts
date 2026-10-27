import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_GUSHER } from '../encounters';
import {
  CRUDE, CRUDE_AMBER, CRUDE_LIT, SAFETY_RED, STEEL, STEEL_DARK, STEEL_LIT, clamp, crudePuddle, dist,
  droplet, frameClock, noise,
} from '../util';

/**
 * Gusher — Riggerman Pitch's patch of the Nodding Field. Five old wellheads are bolted through
 * the deck, and the ground under them is full to bursting. Each well's pressure ring creeps up
 * on its own; full, the cap **trembles** (cracks, bubbling, a ring on the boards), then **gushes**
 * — a pillar of crude that hurts whoever is over it — and the column falls back as a **rain of
 * crude**: falling droplets (their shadows grow as they come down) that splash into thick,
 * glossy puddles. Thick crude holds your boots: you wade slow through it.
 *
 * Pitch is earth; he stamps, and the well nearest you jumps a big notch of pressure.
 *
 * The rule the player can turn: **a fight beside a well sets it off.** Every hit landed on anyone
 * within reach of a wellhead pumps that well. Drag Pitch onto a cap, hit him, and walk away.
 */

interface Well { x: number; y: number; pressure: number; rate: number; trembleAt: number; gushAt: number; hitP: boolean; hitN: boolean }
interface Drop { tx: number; ty: number; bornAt: number; landAt: number; r: number }
interface Puddle { x: number; y: number; r: number; until: number; seed: number; bornAt: number }

const WELL_R = 50;
const REACH = 115;
const TREMBLE_MS = 1250;
const GUSH_MS = 700;

function makeGusher(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const gushDmg = hard ? 19 : 15;
  const splatDmg = hard ? 7 : 5;
  const wadeMult = hard ? 0.55 : 0.62;
  const midY = (top + H) / 2;

  const wells: Well[] = [
    { x: W * 0.22, y: top + 120 }, { x: W * 0.78, y: top + 120 }, { x: W * 0.5, y: midY + 10 },
    { x: W * 0.22, y: H - 110 }, { x: W * 0.78, y: H - 110 },
  ].map((p, i) => ({ ...p, pressure: 0.12 + i * 0.16, rate: 0.055 + noise(i * 3.3) * 0.03, trembleAt: 0, gushAt: 0, hitP: false, hitN: false }));
  const drops: Drop[] = [];
  const puddles: Puddle[] = [];
  let seedN = 1;
  let nextStamp = ctx.scene.time.now + (hard ? 5200 : 6800);
  let stampFlash: { x: number; y: number; at: number } | null = null;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const idle = (w: Well): boolean => w.trembleAt === 0 && w.gushAt === 0;

  const pump = (w: Well, amount: number, time: number): void => {
    if (!idle(w)) return;
    w.pressure = Math.min(1, w.pressure + amount);
    if (w.pressure >= 1) arm(w, time);
  };
  const arm = (w: Well, time: number): void => {
    w.trembleAt = time;
    w.gushAt = time + TREMBLE_MS;
    w.hitP = false; w.hitN = false;
    ctx.sfx('quake');
  };
  const nearWell = (x: number, y: number): Well | null => {
    let best: Well | null = null, bd = REACH;
    for (const w of wells) { const d = dist(x, y, w.x, w.y); if (d < bd) { bd = d; best = w; } }
    return best;
  };
  const inPuddle = (x: number, y: number): boolean =>
    puddles.some((p) => dist(x, y, p.x, p.y) < p.r * 0.9 && dist(x, y, p.x, p.y) / (p.r * 0.9) < 1);

  const gush = (w: Well, time: number): void => {
    ctx.sfx('geyser');
    ctx.sfx('oil-splash');
    // The column falls back as rain on a ring round the well.
    const n = hard ? 7 : 6;
    const a0 = ctx.rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (ctx.rng() - 0.5) * 0.4;
      const r = 100 + ctx.rng() * 140;
      drops.push({
        tx: clamp(w.x + Math.cos(a) * r, 50, W - 50), ty: clamp(w.y + Math.sin(a) * r * 0.8, top + 40, H - 40),
        bornAt: time, landAt: time + GUSH_MS + 650 + i * 70, r: 26,
      });
    }
  };

  const columnHit = (w: Well, f: Fighter, isPlayer: boolean): void => {
    if (!alive(f) || dist(f.x, f.y, w.x, w.y) > WELL_R + 14) return;
    if (isPlayer ? w.hitP : w.hitN) return;
    if (isPlayer) w.hitP = true; else w.hitN = true;
    ctx.hit(f, gushDmg, f.x, f.y);
    // Thrown off the cap.
    const a = Math.atan2(f.y - w.y, f.x - w.x) || 0.01;
    ctx.nudge(f, Math.cos(a) * 46, Math.sin(a) * 46);
    ctx.float(f.x, f.y - 44, isPlayer ? 'GUSHED' : 'GUSHED!', isPlayer ? '#ffb27a' : '#8fe6ff');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      for (const w of wells) {
        if (idle(w)) {
          pump(w, w.rate * dt, time);
        } else if (time >= w.gushAt && time < w.gushAt + GUSH_MS) {
          if (w.trembleAt) { w.trembleAt = 0; gush(w, time); }
          columnHit(w, ctx.player, true);
          columnHit(w, ctx.npc, false);
        } else if (time >= w.gushAt + GUSH_MS) {
          w.gushAt = 0; w.trembleAt = 0;
          w.pressure = 0;
        }
      }
      // Pitch stamps: the well nearest you jumps.
      if (time >= nextStamp && alive(ctx.npc) && alive(ctx.player)) {
        nextStamp = time + (hard ? 5200 : 6800);
        let best = wells[0];
        for (const w of wells) if (idle(w) && dist(ctx.player.x, ctx.player.y, w.x, w.y) < dist(ctx.player.x, ctx.player.y, best.x, best.y)) best = w;
        if (idle(best)) {
          pump(best, 0.55, time);
          stampFlash = { x: ctx.npc.x, y: ctx.npc.y, at: time };
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'STAMP!', '#ffcf8a');
          ctx.sfx('stone-slam');
        }
      }
      // Rain landing.
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        if (time < d.landAt) continue;
        drops.splice(i, 1);
        for (const [f, isP] of [[ctx.player, true], [ctx.npc, false]] as const) {
          if (alive(f) && dist(f.x, f.y, d.tx, d.ty) < d.r) {
            ctx.hit(f, splatDmg, f.x, f.y);
            if (isP) ctx.sfx('slime-splat');
          }
        }
        puddles.push({ x: d.tx, y: d.ty, r: 32 + ctx.rng() * 14, until: time + (hard ? 10000 : 8500), seed: seedN++ * 2.3, bornAt: time });
        if (puddles.length > 22) puddles.shift();
      }
      for (let i = puddles.length - 1; i >= 0; i--) if (time >= puddles[i].until) puddles.splice(i, 1);
    },

    onPlayerHurt(amount) {
      if (amount <= 0) return;
      const w = nearWell(ctx.player.x, ctx.player.y);
      if (w) pump(w, 0.3, ctx.scene.time.now);
    },
    onNpcHurt(amount) {
      if (amount <= 0) return;
      const w = nearWell(ctx.npc.x, ctx.npc.y);
      if (w) {
        pump(w, 0.34, ctx.scene.time.now);
        if (!idle(w)) ctx.float(w.x, w.y - 50, 'SHE\'S BLOWING', '#ffd79a');
      }
    },

    playerSpeedMult: () => (inPuddle(ctx.player.x, ctx.player.y) ? wadeMult : 1),
    npcSpeedMult: () => (inPuddle(ctx.npc.x, ctx.npc.y) ? wadeMult + 0.1 : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      // Get off a cap that is about to blow, the short way.
      for (const w of wells) {
        if (idle(w)) continue;
        const d = dist(n.x, n.y, w.x, w.y);
        if (d < WELL_R + 50) {
          const a = Math.atan2(n.y - w.y, n.x - w.x);
          return { x: clamp(w.x + Math.cos(a) * (WELL_R + 110), 60, W - 60), y: clamp(w.y + Math.sin(a) * (WELL_R + 110), top + 40, H - 40) };
        }
      }
      // Out of thick crude.
      if (inPuddle(n.x, n.y)) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x = clamp(n.x + Math.cos(a) * 80, 60, W - 60), y = clamp(n.y + Math.sin(a) * 80, top + 40, H - 40);
          if (!inPuddle(x, y)) return { x, y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      for (const p of puddles) {
        const grow = clamp((time - p.bornAt) / 260, 0.2, 1);
        const fade = clamp((p.until - time) / 1500, 0, 1);
        crudePuddle(g, p.x, p.y, p.r * grow, p.seed, fade);
        // A slow amber glint sliding round each puddle.
        const a = ts * 0.8 + p.seed;
        g.fillStyle(CRUDE_AMBER, 0.35 * fade); g.fillEllipse(p.x + Math.cos(a) * p.r * 0.4, p.y + Math.sin(a) * p.r * 0.22, 9, 3);
      }
      for (let wi = 0; wi < wells.length; wi++) {
        const w = wells[wi];
        const trembling = w.trembleAt > 0;
        const k = trembling ? clamp((time - w.trembleAt) / TREMBLE_MS, 0, 1) : 0;
        const jx = trembling ? Math.sin(time / 22 + wi) * (1 + k * 3) : 0;
        // A dark wet ring of old spill round every casing.
        g.fillStyle(CRUDE, 0.55); g.fillEllipse(w.x, w.y + 4, WELL_R * 2.3, WELL_R * 1.25);
        // Cracks spreading out of a trembling cap.
        if (trembling) {
          g.lineStyle(2, CRUDE_LIT, 0.4 + k * 0.5);
          for (let c = 0; c < 7; c++) {
            const a = (c / 7) * Math.PI * 2 + wi;
            const r1 = WELL_R * (0.6 + k * 1.1);
            g.lineBetween(w.x + Math.cos(a) * 18, w.y + Math.sin(a) * 12, w.x + Math.cos(a + 0.2) * r1, w.y + Math.sin(a + 0.2) * r1 * 0.66);
          }
          g.lineStyle(3, SAFETY_RED, 0.3 + k * 0.6); g.strokeCircle(w.x, w.y, WELL_R + 6 - k * 6);
          if (k > 0.75 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.45); g.strokeCircle(w.x, w.y, WELL_R + 10); }
          // Bubbles breaking through the boards.
          for (let b = 0; b < 6; b++) {
            const ph = (ts * 2.4 + b / 6) % 1;
            g.lineStyle(1.5, CRUDE_AMBER, (1 - ph) * 0.8);
            g.strokeCircle(w.x + Math.cos(b * 1.9) * 30, w.y + Math.sin(b * 1.9) * 18, 2 + ph * 7);
          }
        }
        // Pressure ring: fills amber, goes red near the top.
        const pr = trembling || w.gushAt ? 1 : w.pressure;
        g.lineStyle(5, 0x000000, 0.4); g.strokeCircle(w.x, w.y, WELL_R - 8);
        g.lineStyle(4, pr > 0.8 ? SAFETY_RED : CRUDE_AMBER, 0.85);
        g.beginPath(); g.arc(w.x, w.y, WELL_R - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr, false); g.strokePath();
        // The casing head: a flanged steel collar with bolts, a domed cap and a gauge stalk.
        const cx = w.x + jx, cy = w.y;
        g.fillStyle(STEEL_DARK, 1); g.fillCircle(cx, cy, 24);
        g.fillStyle(STEEL, 1); g.fillCircle(cx, cy, 21);
        for (let bk = 0; bk < 8; bk++) {
          const a = (bk / 8) * Math.PI * 2;
          g.fillStyle(STEEL_LIT, 1); g.fillCircle(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 2);
        }
        g.fillStyle(STEEL_DARK, 1); g.fillCircle(cx, cy - 2, 12);
        g.fillStyle(trembling ? SAFETY_RED : 0x4a5058, 1); g.fillCircle(cx, cy - 3, 9);
        g.fillStyle(0xffffff, 0.35); g.fillCircle(cx - 3, cy - 6, 3);
        g.lineStyle(2, STEEL_DARK, 1); g.lineBetween(cx + 16, cy - 4, cx + 26, cy - 18);
        g.fillStyle(0xf0e6c8, 1); g.fillCircle(cx + 27, cy - 20, 5);
        const na = Math.PI * 0.8 + Math.PI * 1.4 * pr;
        g.lineStyle(1.2, 0x1a1a1a, 1); g.lineBetween(cx + 27, cy - 20, cx + 27 + Math.cos(na) * 4, cy - 20 + Math.sin(na) * 4);
      }
      // Rain shadows: growing as the drops come down.
      for (const d of drops) {
        const fallStart = d.landAt - 650;
        if (time < fallStart - 500) continue;
        const k = clamp((time - (fallStart - 500)) / 1150, 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(d.tx, d.ty, d.r * 2 * (0.4 + k * 0.6), d.r * 1.1 * (0.4 + k * 0.6));
        g.lineStyle(1.5, CRUDE_AMBER, 0.3 + k * 0.5); g.strokeCircle(d.tx, d.ty, d.r);
      }
      if (stampFlash && time - stampFlash.at < 500) {
        const k = (time - stampFlash.at) / 500;
        g.lineStyle(6 * (1 - k), 0xcfa070, 0.7 * (1 - k)); g.strokeEllipse(stampFlash.x, stampFlash.y + 14, 40 + k * 120, 16 + k * 50);
      }
    },

    drawAir(g, time) {
      for (let wi = 0; wi < wells.length; wi++) {
        const w = wells[wi];
        if (!w.gushAt || time < w.gushAt || time > w.gushAt + GUSH_MS) continue;
        const k = (time - w.gushAt) / GUSH_MS;
        const rise = Math.sin(Math.min(1, k * 1.8) * Math.PI * 0.5);
        const hgt = 190 * rise * (1 - k * 0.3);
        const wd = 34 + k * 14;
        // Column: black core, brown edges, an amber lit stripe up one side.
        g.fillStyle(CRUDE, 0.95); g.fillRect(w.x - wd / 2, w.y - hgt, wd, hgt);
        g.fillStyle(CRUDE_LIT, 0.8); g.fillRect(w.x - wd / 2, w.y - hgt, 7, hgt);
        g.fillStyle(CRUDE_AMBER, 0.6); g.fillRect(w.x - wd / 2 + 8, w.y - hgt, 4, hgt);
        // Mushrooming crown.
        for (let c = 0; c < 7; c++) {
          const a = -Math.PI / 2 + (c - 3) * 0.42;
          const r = 20 + k * 40;
          g.fillStyle(c % 2 ? CRUDE : CRUDE_LIT, 0.95 - k * 0.3);
          g.fillCircle(w.x + Math.cos(a) * r * 0.9, w.y - hgt + Math.sin(a) * r * 0.5, 12 + k * 6);
        }
        // Flung droplets.
        for (let d = 0; d < 10; d++) {
          const a = -Math.PI / 2 + (noise(wi * 17 + d) - 0.5) * 2.6;
          const sp = 60 + noise(d * 3.1 + wi) * 90;
          const x = w.x + Math.cos(a) * sp * k, y = w.y - hgt + Math.sin(a) * sp * k + 120 * k * k;
          droplet(g, x, y, 3.5 + noise(d) * 2);
        }
        // Splash ring on the deck.
        g.lineStyle(5, CRUDE, 0.7 * (1 - k)); g.strokeEllipse(w.x, w.y, WELL_R * 2 + k * 60, WELL_R * 1.1 + k * 30);
      }
      // Falling rain.
      for (const d of drops) {
        const fallStart = d.landAt - 650;
        if (time < fallStart) continue;
        const k = clamp((time - fallStart) / 650, 0, 1);
        droplet(g, d.tx, d.ty - (1 - k) * 260, 6.5);
      }
    },
  };
}

export const GUSHER: GimmickDef = {
  id: GIM_GUSHER,
  rules: 'Wellheads tremble, then gush crude: the column hurts and the rain leaves thick crude you wade through. Hits landed beside a well set it off.',
  make: makeGusher,
};
