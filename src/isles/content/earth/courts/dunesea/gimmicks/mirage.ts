import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { palm } from '../art';
import { HEAT, PALM, PALM_LIT, SAND_DARK, SAND_DEEP, SAND_SHADOW, WATER, WATER_DEEP, WATER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Mirage — Trader Faraj.
 *
 * The noon sun builds *heat* in anyone standing in it. Over two-thirds full you slow; full, you are
 * heatstruck — dazed for a moment and hit harder for a while after. Shade under the two palms at
 * the sides cools you slowly. An oasis cools you fast, and drinks down as you use it.
 *
 * But Faraj trades in mirages. Some of the oases on the floor are not there: walk up to one and it
 * shimmers away. Only the shimmer tells — a mirage's edge wavers, bands of heat slide across it,
 * it has no reeds and no reflection of sky. And Faraj never walks to one of his own: watch where he
 * goes when he is hot. Every so often he "sells" you one — a mirage set down right at your side.
 */

const SUN_PER_S = 9;
const SHADE_PER_S = 9;
const OASIS_PER_S = 55;
const DRINK_PER_S = 34;
const OASIS_R = 46;
const SLOW_AT = 66;
const DAZE_MS = 900;
const AFTER_MS = 2600;

interface Oasis { x: number; y: number; real: boolean; water: number; bornAt: number; dryAt: number; seed: number }
interface Heat { v: number; dazedAt: number; hotUntil: number }
interface Pop { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const heat = new Map<Fighter, Heat>([[player, { v: 0, dazedAt: -9999, hotUntil: 0 }], [npc, { v: 0, dazedAt: -9999, hotUntil: 0 }]]);
  const oases: Oasis[] = [];
  const pops: Pop[] = [];
  const shades: Pt[] = [{ x: 70, y: (top + H) / 2 }, { x: W - 70, y: (top + H) / 2 + 40 }];
  const SHADE_R = 70;
  const sun = SUN_PER_S * (ctx.hard ? 1.25 : 1);
  const sellEvery = ctx.hard ? 7600 : 9400;
  let nextSell = 0;
  let nextSpawn = 0;
  let started = false;

  const inShade = (f: Fighter) => shades.some((s) => dist(s.x, s.y + 10, f.x, f.y) < SHADE_R);
  const oasisAt = (f: Fighter) => oases.find((o) => o.dryAt === 0 && dist(o.x, o.y, f.x, f.y) < OASIS_R);

  function spot(): Pt {
    for (let i = 0; i < 14; i++) {
      const p = { x: 150 + rng() * (W - 300), y: top + 80 + rng() * (H - top - 140) };
      if (oases.every((o) => dist(o.x, o.y, p.x, p.y) > 170) && dist(p.x, p.y, player.x, player.y) > 120) return p;
    }
    return { x: 150 + rng() * (W - 300), y: top + 80 + rng() * (H - top - 140) };
  }

  function spawn(time: number, real?: boolean): void {
    const p = spot();
    const hasReal = oases.some((o) => o.real && o.dryAt === 0);
    oases.push({ x: p.x, y: p.y, real: real ?? (!hasReal || rng() < 0.45), water: 100, bornAt: time, dryAt: 0, seed: rng() * 10 });
  }

  function vanish(o: Oasis, time: number): void {
    pops.push({ x: o.x, y: o.y, at: time });
    oases.splice(oases.indexOf(o), 1);
    ctx.float(o.x, o.y - 30, 'MIRAGE', '#fff0c8');
    ctx.sfx('glitch');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        spawn(time, true); spawn(time, false); spawn(time);
        nextSell = time + 6000;
        nextSpawn = time + 3000;
      }
      // Keep three on the floor.
      if (time >= nextSpawn) { nextSpawn = time + 2400; if (oases.length < 3) spawn(time); }
      // Faraj sells you one: a mirage set down at your side.
      if (time >= nextSell && alive(npc) && alive(player)) {
        nextSell = time + sellEvery;
        const a = rng() * Math.PI * 2;
        oases.push({ x: clamp(player.x + Math.cos(a) * 130, 90, W - 90), y: clamp(player.y + Math.sin(a) * 110, top + 60, H - 50), real: false, water: 100, bornAt: time, dryAt: 0, seed: rng() * 10 });
        ctx.banner('FARAJ: "SWEET WATER, FRIEND — CHEAP"', '#fff0c8');
        ctx.sfx('money');
      }

      for (const [f, h] of heat) {
        if (!alive(f)) continue;
        const o = oasisAt(f);
        if (o && !o.real) { vanish(o, time); continue; }
        let d: number;
        if (o) {
          d = -OASIS_PER_S;
          o.water -= DRINK_PER_S * dt;
          if (o.water <= 0) { o.dryAt = time; ctx.float(o.x, o.y - 30, 'DRY', '#d8b07a'); }
        } else if (inShade(f)) d = -SHADE_PER_S;
        else d = sun;
        if (time - h.dazedAt < DAZE_MS + 400) d = Math.min(d, 0);
        h.v = clamp(h.v + d * dt, 0, 100);
        if (h.v >= 100) {
          h.v = 55;
          h.dazedAt = time;
          h.hotUntil = time + AFTER_MS;
          ctx.stun(f, DAZE_MS);
          ctx.float(f.x, f.y - 48, 'HEATSTRUCK', '#ffb070');
          ctx.sfx('status-burn');
        }
      }
      for (let i = oases.length - 1; i >= 0; i--) if (oases[i].dryAt && time - oases[i].dryAt > 3000) oases.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 700) pops.splice(i, 1);
    },

    playerSpeedMult() { return (heat.get(player)?.v ?? 0) > SLOW_AT ? 0.84 : 1; },
    npcSpeedMult() { return (heat.get(npc)?.v ?? 0) > SLOW_AT ? 0.84 : 1; },
    playerTakenMult() { return ctx.scene.time.now < (heat.get(player)?.hotUntil ?? 0) ? 1.3 : 1; },
    npcTakenMult() { return ctx.scene.time.now < (heat.get(npc)?.hotUntil ?? 0) ? 1.3 : 1; },

    npcSeek() {
      const h = heat.get(npc);
      // Hot: straight to a real oasis — he knows which.
      if (h && h.v > 52) {
        let best: Oasis | null = null;
        for (const o of oases) if (o.real && o.dryAt === 0 && (!best || dist(o.x, o.y, npc.x, npc.y) < dist(best.x, best.y, npc.x, npc.y))) best = o;
        if (best) return { x: best.x, y: best.y };
        const s = shades.reduce((b, p) => (dist(p.x, p.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? p : b), shades[0]);
        return { x: s.x + (s.x < W / 2 ? 20 : -20), y: s.y + 10 };
      }
      // Cool: work round the player, keeping clear of his own mirages so he never pops one.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.5;
      let x = player.x + Math.cos(a) * 220, y = player.y + Math.sin(a) * 180;
      for (const o of oases) if (!o.real && dist(o.x, o.y, x, y) < OASIS_R + 40) { x += (x - o.x); y += (y - o.y); }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Palm shade at the sides.
      for (const s of shades) {
        g.fillStyle(SAND_SHADOW, 0.32); g.fillEllipse(s.x, s.y + 10, SHADE_R * 2, SHADE_R * 1.1);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + Math.sin(time / 1400 + i) * 0.06;
          g.fillStyle(SAND_SHADOW, 0.18); g.fillEllipse(s.x + Math.cos(a) * 40, s.y + 10 + Math.sin(a) * 22, 46, 12);
        }
      }
      for (const o of oases) {
        const grow = clamp((time - o.bornAt) / 500, 0, 1);
        const r = OASIS_R * grow * (o.real ? 0.55 + (o.water / 100) * 0.45 : 1);
        if (o.dryAt) {
          // Cracked mud where the water was.
          const k = clamp(1 - (time - o.dryAt) / 3000, 0, 1);
          g.fillStyle(SAND_DEEP, 0.6 * k); g.fillEllipse(o.x, o.y, OASIS_R * 1.6, OASIS_R * 0.9);
          g.lineStyle(1, SAND_DARK, 0.8 * k);
          for (let i = 0; i < 7; i++) { const a = o.seed + i; g.lineBetween(o.x, o.y, o.x + Math.cos(a) * OASIS_R * 0.7, o.y + Math.sin(a) * OASIS_R * 0.4); }
          continue;
        }
        if (o.real) {
          // A real pool: damp rim, reeds, deep water with a still band of sky laid on it.
          g.fillStyle(SAND_DEEP, 0.5); g.fillEllipse(o.x, o.y + 3, r * 2.5, r * 1.5);
          g.fillStyle(WATER_DEEP, 1); g.fillEllipse(o.x, o.y, r * 2.1, r * 1.15);
          g.fillStyle(WATER, 1); g.fillEllipse(o.x - 3, o.y - 2, r * 1.8, r * 0.95);
          g.fillStyle(WATER_LIT, 0.55); g.fillEllipse(o.x - r * 0.3, o.y - r * 0.2, r * 0.9, r * 0.14);
          for (let i = 0; i < 9; i++) {
            const a = o.seed + i * 0.7;
            const rx = o.x + Math.cos(a) * r * 1.05, ry = o.y + Math.sin(a) * r * 0.6;
            g.lineStyle(1.5, i % 2 ? PALM : PALM_LIT, 1); g.lineBetween(rx, ry, rx + Math.sin(i) * 3, ry - 12);
          }
          const ph = (time / 1600 + o.seed) % 1;
          g.lineStyle(1, WATER_LIT, 0.5 * (1 - ph)); g.strokeEllipse(o.x + 6, o.y, 6 + ph * r, 2 + ph * r * 0.4);
        } else {
          // A mirage: too blue, no reeds, edge wavering, heat bands sliding across it.
          const flick = 0.75 + Math.sin(time / 70 + o.seed) * 0.12;
          g.fillStyle(0x58c8e0, 0.55 * flick); g.fillEllipse(o.x, o.y, r * 2.1, r * 1.15);
          g.fillStyle(0x9ae8f8, 0.4 * flick); g.fillEllipse(o.x - 3, o.y - 3, r * 1.7, r * 0.8);
          g.lineStyle(2, 0xc8f4ff, 0.5);
          g.beginPath();
          for (let i = 0; i <= 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const wob = 1 + Math.sin(time / 90 + i * 1.7 + o.seed) * 0.07;
            const px = o.x + Math.cos(a) * r * 1.05 * wob, py = o.y + Math.sin(a) * r * 0.58 * wob;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
          for (let k = 0; k < 3; k++) {
            const by = o.y - r * 0.5 + (((time / 700 + k / 3 + o.seed) % 1) * r);
            g.lineStyle(2, HEAT, 0.35); g.lineBetween(o.x - r * 0.9, by, o.x + r * 0.9, by + Math.sin(time / 120 + k) * 2);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const s of shades) palm(g, s.x, s.y, 0.75, s.x < W / 2 ? 0.25 : -0.25, () => 0.5);
      for (const p of pops) {
        const k = (time - p.at) / 700;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.lineStyle(2, HEAT, 0.6 * (1 - k)); g.lineBetween(p.x + Math.cos(a) * (10 + k * 50), p.y + Math.sin(a) * (6 + k * 28), p.x + Math.cos(a) * (20 + k * 60), p.y + Math.sin(a) * (10 + k * 34));
        }
      }
      // Heat rising off anyone over the line; birds of the daze circling the struck.
      for (const [f, h] of heat) {
        if (!alive(f)) continue;
        if (h.v > SLOW_AT) {
          for (let k = 0; k < 3; k++) {
            const y = f.y - 46 - k * 7 - ((time / 40) % 7);
            g.lineStyle(1.5, HEAT, 0.3 * (h.v / 100));
            g.beginPath(); for (let i = 0; i <= 6; i++) { const x = f.x - 15 + i * 5; const yy = y + Math.sin(time / 80 + i + k) * 2; if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.strokePath();
          }
        }
        if (time - h.dazedAt < DAZE_MS) {
          for (let i = 0; i < 3; i++) {
            const a = time / 180 + (i / 3) * Math.PI * 2;
            g.fillStyle(0xffe070, 1); g.fillCircle(f.x + Math.cos(a) * 18, f.y - 50 + Math.sin(a) * 6, 3);
          }
        }
        if (time < h.hotUntil) glow(g, f.x, f.y - 10, 30, 0xff9050, 0.03, 2);
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const h = heat.get(f);
        if (!h) continue;
        const w = 120, x0 = d > 0 ? x + 16 : x - w - 16, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * h.v) / 100;
        g.fillStyle(h.v > SLOW_AT ? 0xff7a3a : 0xffc860, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        // A little sun at the bar's end.
        const sx = d > 0 ? x0 - 10 : x0 + w + 10;
        g.fillStyle(0xffd060, 1); g.fillCircle(sx, y + 4, 5);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(1.5, 0xffd060, 1); g.lineBetween(sx + Math.cos(a) * 6, y + 4 + Math.sin(a) * 6, sx + Math.cos(a) * 9, y + 4 + Math.sin(a) * 9); }
      }
    },
  };
}

export const MIRAGE: GimmickDef = {
  id: 'dunesea-mirage',
  rules: 'The sun builds heat; full, you are heatstruck. Oases cool you — but some are mirages that vanish as you reach them. Watch the shimmer, and watch Faraj.',
  make,
};
