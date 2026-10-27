import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_SPARK } from '../encounters';
import {
  CRUDE, FLAME, FLAME_LIT, SOOT, STEEL_DARK, clamp, dist, droplet, flameTongue, frameClock, noise,
  sheenAt, slick, sootPuff,
} from '../util';

/**
 * Spark Hazard — Welder Sputz is patching a crude tank with crude still in it, and the floor of
 * his berth is a **network of oil**: nine slicks joined by the thin drip-trails that run between
 * them. His torch throws sparks; each spark's landing is marked by a tightening ring. A spark
 * that lands on oil **lights it**, and the fire runs along the trails at a sprint, lighting every
 * connected slick in turn. Burning slicks scorch anyone standing in them; the running fire bites
 * anyone it passes. A burnt slick is safe black ground until the leaking pipe overhead drips it
 * full again.
 *
 * The rule the player can turn: **Sputz's own torch.** Strike him while he stands in oil and the
 * torch flares in his hand — the slick under his feet goes up, and everything joined to it.
 * Choose where you fight him, and burn the network out from under him.
 */

type PatchState = 'oil' | 'burning' | 'burnt';
interface Patch { x: number; y: number; r: number; seed: number; state: PatchState; until: number; refillAt: number }
interface Edge { a: number; b: number }
interface Front { edge: number; from: number; startAt: number; hitP: boolean; hitN: boolean }
interface Spark { fromX: number; fromY: number; tx: number; ty: number; bornAt: number; landAt: number; own: boolean }

const FIRE_SPEED = 300;
const BURN_MS = 3300;
const BURNT_MS = 7500;

function makeSparkHazard(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const now0 = ctx.scene.time.now;
  const burnDmg = hard ? 8 : 6;
  const frontDmg = hard ? 7 : 5;
  const zapDmg = hard ? 6 : 4;
  const sparkEvery = hard ? 1900 : 2500;

  // ── The network ──
  const cols = [W * 0.17, W * 0.5, W * 0.83];
  const rows = [top + 104, (top + H) / 2 + 8, H - 96];
  const patches: Patch[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c;
    patches.push({
      x: cols[c] + (noise(i * 2.7) - 0.5) * 70, y: rows[r] + (noise(i * 5.3) - 0.5) * 40,
      r: i === 4 ? 46 : 54 + noise(i * 1.1) * 12, seed: i * 1.7 + 0.3, state: 'oil', until: 0, refillAt: 0,
    });
  }
  const edges: Edge[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c;
    // Keep most of the grid, drop a couple of links so the network has choke points.
    if (c < 2 && ctx.rng() < 0.8) edges.push({ a: i, b: i + 1 });
    if (r < 2 && ctx.rng() < 0.8) edges.push({ a: i, b: i + 3 });
  }
  const fronts: Front[] = [];
  const sparks: Spark[] = [];
  let nextSpark = now0 + 2400;
  let ownReadyAt = 0;
  const tickAt = new Map<Fighter, number>();

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const patchAt = (x: number, y: number): number => {
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      const dx = (x - p.x) / p.r, dy = (y - p.y) / (p.r * 0.64);
      if (dx * dx + dy * dy < 1) return i;
    }
    return -1;
  };
  const edgeLen = (e: Edge): number => dist(patches[e.a].x, patches[e.a].y, patches[e.b].x, patches[e.b].y);
  const frontPos = (f: Front, time: number): Pt => {
    const e = edges[f.edge];
    const s = patches[f.from], t = patches[f.from === e.a ? e.b : e.a];
    const k = clamp(((time - f.startAt) / 1000) * FIRE_SPEED / edgeLen(e), 0, 1);
    return { x: s.x + (t.x - s.x) * k, y: s.y + (t.y - s.y) * k };
  };

  const ignite = (i: number, time: number): void => {
    const p = patches[i];
    if (p.state !== 'oil') return;
    p.state = 'burning';
    p.until = time + BURN_MS;
    ctx.sfx('flame-burst');
    edges.forEach((e, ei) => {
      if (e.a !== i && e.b !== i) return;
      const other = e.a === i ? e.b : e.a;
      if (patches[other].state === 'oil') fronts.push({ edge: ei, from: i, startAt: time, hitP: false, hitN: false });
    });
  };

  const throwVolley = (time: number): void => {
    const n = ctx.npc, p = ctx.player;
    const a = Math.atan2(p.y - n.y, p.x - n.x);
    const count = hard ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 62;
      const tx = clamp(p.x - Math.sin(a) * off + (ctx.rng() - 0.5) * 30, 40, W - 40);
      const ty = clamp(p.y + Math.cos(a) * off + (ctx.rng() - 0.5) * 30, top + 30, H - 30);
      sparks.push({ fromX: n.x + Math.cos(a) * 20, fromY: n.y - 10, tx, ty, bornAt: time + i * 90, landAt: time + i * 90 + 820, own: false });
    }
    ctx.sfx('zap');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      if (time >= nextSpark && alive(ctx.npc) && alive(ctx.player)) {
        nextSpark = time + sparkEvery;
        throwVolley(time);
      }
      // Sparks landing: a zap where they fall, and fire if it's oil.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        if (time < s.landAt) continue;
        sparks.splice(i, 1);
        if (!s.own && alive(ctx.player) && dist(ctx.player.x, ctx.player.y, s.tx, s.ty) < 24) ctx.hit(ctx.player, zapDmg, s.tx, s.ty);
        const pi = patchAt(s.tx, s.ty);
        if (pi >= 0) ignite(pi, time);
      }
      // Fire running down the trails.
      for (let i = fronts.length - 1; i >= 0; i--) {
        const f = fronts[i];
        const e = edges[f.edge];
        const travel = (edgeLen(e) / FIRE_SPEED) * 1000;
        const pos = frontPos(f, time);
        for (const [who, isP] of [[ctx.player, true], [ctx.npc, false]] as const) {
          if (!alive(who) || (isP ? f.hitP : f.hitN)) continue;
          if (dist(who.x, who.y, pos.x, pos.y) < 26) {
            if (isP) f.hitP = true; else f.hitN = true;
            ctx.hit(who, frontDmg, who.x, who.y);
          }
        }
        if (time - f.startAt >= travel) {
          fronts.splice(i, 1);
          ignite(f.from === e.a ? e.b : e.a, time);
        }
      }
      // Burning → burnt → re-oiled by the drip.
      for (const p of patches) {
        if (p.state === 'burning' && time >= p.until) { p.state = 'burnt'; p.refillAt = time + BURNT_MS; }
        else if (p.state === 'burnt' && time >= p.refillAt) { p.state = 'oil'; p.until = time; }
      }
      // Scorch anyone standing in fire.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        const pi = patchAt(f.x, f.y);
        if (pi < 0 || patches[pi].state !== 'burning') continue;
        const last = tickAt.get(f) ?? 0;
        if (time - last < 500) continue;
        tickAt.set(f, time);
        ctx.hit(f, burnDmg, f.x, f.y);
        if (f === ctx.player) ctx.sfx('status-burn');
      }
    },

    onNpcHurt(amount) {
      const time = ctx.scene.time.now;
      if (amount <= 0 || time < ownReadyAt) return;
      const n = ctx.npc;
      const pi = patchAt(n.x, n.y);
      if (pi < 0 || patches[pi].state !== 'oil') return;
      ownReadyAt = time + 2500;
      sparks.push({ fromX: n.x + 14, fromY: n.y - 16, tx: n.x, ty: n.y + 6, bornAt: time, landAt: time + 380, own: true });
      ctx.float(n.x, n.y - 52, 'HIS OWN TORCH!', '#8fe6ff');
      ctx.sfx('electric-charge');
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const pi = patchAt(n.x, n.y);
      const threatened = pi >= 0 && (patches[pi].state === 'burning'
        || fronts.some((f) => { const e = edges[f.edge]; return (f.from === e.a ? e.b : e.a) === pi; }));
      if (!threatened) return null;
      const p = patches[pi];
      const a = Math.atan2(n.y - p.y, n.x - p.x);
      return { x: clamp(p.x + Math.cos(a) * (p.r + 60), 60, W - 60), y: clamp(p.y + Math.sin(a) * (p.r * 0.64 + 60), top + 40, H - 40) };
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The leaking main across the top of the berth, dripping over the slicks below.
      g.fillStyle(0x000000, 0.3); g.fillRect(0, top + 14, W, 6);
      g.fillStyle(STEEL_DARK, 1); g.fillRect(0, top + 2, W, 14);
      g.fillStyle(0x3a3e44, 1); g.fillRect(0, top + 4, W, 8);
      // Drip-trails between slicks: dotted crude with sheen beads.
      for (const e of edges) {
        const a = patches[e.a], b = patches[e.b];
        const len = dist(a.x, a.y, b.x, b.y);
        const burntTrail = a.state !== 'oil' && b.state !== 'oil';
        for (let d = 0; d < len; d += 9) {
          const t = d / len;
          const x = a.x + (b.x - a.x) * t + Math.sin(t * 9 + e.a) * 5, y = a.y + (b.y - a.y) * t + Math.cos(t * 7 + e.b) * 4;
          g.fillStyle(burntTrail ? SOOT : CRUDE, burntTrail ? 0.6 : 0.85); g.fillCircle(x, y, 3.2);
          if (!burntTrail && (d / 9) % 4 === 0) { g.fillStyle(sheenAt(ts * 0.6 + t * 3), 0.6); g.fillCircle(x - 1, y - 1, 1.4); }
        }
      }
      for (const p of patches) {
        if (p.state === 'oil') {
          // A freshly re-oiled slick swells back in.
          const grow = clamp((time - p.until) / 1600, 0.3, 1);
          slick(g, p.x, p.y, p.r * grow, p.r * 0.64 * grow, p.seed, ts * 0.5 + p.seed, 1);
        } else if (p.state === 'burning') {
          g.fillStyle(FLAME, 0.22 + 0.08 * Math.sin(ts * 14 + p.seed)); g.fillEllipse(p.x, p.y, p.r * 2.5, p.r * 1.7);
          g.fillStyle(0x1a0a04, 0.9); g.fillEllipse(p.x, p.y, p.r * 2, p.r * 1.28);
          g.fillStyle(FLAME, 0.55); g.fillEllipse(p.x, p.y, p.r * 1.7, p.r * 1.05);
          g.fillStyle(FLAME_LIT, 0.4); g.fillEllipse(p.x, p.y, p.r * 1.1, p.r * 0.6);
        } else {
          // Scorch: black char with embers dying.
          const k = clamp((p.refillAt - time) / BURNT_MS, 0, 1);
          g.fillStyle(SOOT, 0.85); g.fillEllipse(p.x, p.y, p.r * 2, p.r * 1.28);
          for (let i = 0; i < 8; i++) {
            const ex = p.x + (noise(p.seed + i) - 0.5) * p.r * 1.6, ey = p.y + (noise(p.seed * 2 + i) - 0.5) * p.r;
            g.fillStyle(FLAME, k * (0.4 + 0.4 * Math.sin(ts * 5 + i))); g.fillCircle(ex, ey, 1.8);
          }
        }
      }
      // Spark landing marks: a ring tightening to a crosshair.
      for (const s of sparks) {
        if (time < s.bornAt) continue;
        const c = clamp((time - s.bornAt) / (s.landAt - s.bornAt), 0, 1);
        const onOil = patchAt(s.tx, s.ty) >= 0;
        const col = onOil ? FLAME_LIT : 0xbfe8ff;
        g.lineStyle(2, col, 0.4 + c * 0.5); g.strokeCircle(s.tx, s.ty, 30 * (1 - c) + 8);
        g.lineBetween(s.tx - 10, s.ty, s.tx + 10, s.ty); g.lineBetween(s.tx, s.ty - 7, s.tx, s.ty + 7);
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Drips falling from the main onto slicks being re-oiled.
      patches.forEach((p, i) => {
        if (p.state !== 'oil' || time - p.until > 1600) return;
        const ph = (ts * 1.8 + i * 0.3) % 1;
        droplet(g, p.x, top + 20 + ph * (p.y - top - 20), 3);
      });
      // Flames over burning slicks.
      for (const p of patches) {
        if (p.state !== 'burning') continue;
        const life = clamp((p.until - time) / BURN_MS, 0, 1);
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + p.seed;
          const rr = p.r * (0.2 + noise(p.seed + i) * 0.65);
          flameTongue(g, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.6, 22 + 26 * life * noise(i + p.seed * 3), ts, i + p.seed);
        }
        for (let i = 0; i < 3; i++) sootPuff(g, p.x + (i - 1) * 16, p.y - 30, (ts * 0.5 + i / 3 + p.seed) % 1, 16, 0.5);
      }
      // Fire racing down the trails.
      for (const f of fronts) {
        const pos = frontPos(f, time);
        for (let i = 0; i < 4; i++) flameTongue(g, pos.x + (i - 1.5) * 5, pos.y + 4, 22, ts, i * 2.3 + f.edge);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(pos.x, pos.y, 3);
      }
      // Sparks in flight: bright heads, short orange tails, on a lob.
      for (const s of sparks) {
        if (time < s.bornAt) continue;
        const c = clamp((time - s.bornAt) / (s.landAt - s.bornAt), 0, 1);
        for (let k = 0; k < 5; k++) {
          const t = clamp(c - k * 0.03, 0, 1);
          const x = s.fromX + (s.tx - s.fromX) * t, y = s.fromY + (s.ty - s.fromY) * t - Math.sin(t * Math.PI) * (s.own ? 30 : 90);
          g.fillStyle(k === 0 ? 0xffffff : FLAME_LIT, 1 - k * 0.18); g.fillCircle(x, y, k === 0 ? 3 : 2.2 - k * 0.3);
        }
      }
      // Sputz's torch: a blue-white arc at his hand, flaring when a volley's due.
      const n = ctx.npc;
      if (alive(n)) {
        const hx = n.x + 22, hy = n.y - 8;
        const due = clamp(1 - (nextSpark - time) / 600, 0, 1);
        const f = 0.6 + 0.4 * noise(Math.floor(time / 30));
        g.fillStyle(0x9fd8ff, (0.12 + due * 0.2) * f); g.fillCircle(hx, hy, 18 + due * 14);
        g.fillStyle(0xffffff, 0.9 * f); g.fillCircle(hx, hy, 3 + due * 2);
        g.lineStyle(2, STEEL_DARK, 1); g.lineBetween(n.x + 8, n.y - 2, hx, hy);
        for (let i = 0; i < 4; i++) {
          const a = noise(Math.floor(time / 40) + i) * Math.PI * 2;
          g.lineStyle(1.2, 0xd8f0ff, 0.8 * f); g.lineBetween(hx, hy, hx + Math.cos(a) * 9, hy + Math.sin(a) * 9);
        }
      }
    },

    destroy() { tickAt.clear(); },
  };
}

export const SPARK_HAZARD: GimmickDef = {
  id: GIM_SPARK,
  rules: 'Sparks light oil, and the fire runs along every connected slick. Hit Sputz while he stands in oil and his own torch lights it.',
  make: makeSparkHazard,
};
