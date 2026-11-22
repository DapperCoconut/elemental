import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { cattail, gasBubble } from '../art';
import { GAS, GAS_DARK, MUD_DARK, SEDGE_LIT, VENOM_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Fen Gas — Bogman Ooze.
 *
 * The yard is fen, and the fen breathes. Bubbles of marsh gas swell up out of the mud, wobbling
 * bigger for a few seconds until they burst into a green cloud. The clouds drift with the breeze
 * (the reed by the HUD shows which way it blows); inside one you choke — a little hurt every
 * half-second, and slowed.
 *
 * A bubble is a skin of mud and gas: strike it and it bursts *now*, and the burst blows its cloud
 * away from whoever struck it. Ooze has lived in the gas forty years and has stopped noticing it.
 * You have not. Pop them when he is downwind.
 */

const MAX_BUBBLES = 4;
const RIPEN_MS = 4200;
const CLOUD_R = 78;
const TICK_MS = 500;
const TICK_DMG = 3;
const BREEZE = 26;

interface Bubble { x: number; y: number; born: number; target: StrikeTarget | null; seed: number }
interface Cloud { x: number; y: number; born: number; life: number; kx: number; ky: number; kickUntil: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const bubbles: Bubble[] = [];
  const clouds: Cloud[] = [];
  const CLOUD_LIFE = ctx.hard ? 7200 : 6200;
  const SPAWN_MS = ctx.hard ? 1300 : 1700;
  let nextBubble = 0;
  let windA = rng() * Math.PI * 2;
  let started = false;
  const tick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let npcInGasUntil = 0;
  /** Cattails along the bottom edge, bending with the breeze. */
  const reeds = Array.from({ length: 12 }, (_, i) => ({ x: 40 + ((i * 197) % (W - 80)), h: 22 + (i % 3) * 7 }));

  const radiusOf = (b: Bubble, time: number) => 8 + clamp((time - b.born) / RIPEN_MS, 0, 1) * 24;

  function spawnBubble(time: number): void {
    for (let tries = 0; tries < 20; tries++) {
      const x = 80 + rng() * (W - 160), y = top + 70 + rng() * (H - top - 120);
      if (dist(x, y, player.x, player.y) < 90 || dist(x, y, npc.x, npc.y) < 90) continue;
      if (bubbles.some((b) => dist(b.x, b.y, x, y) < 120)) continue;
      const b: Bubble = { x, y, born: time, target: null, seed: rng() * 10 };
      b.target = ctx.target({ x, y: y - 10, r: 14, onStruck: (by) => pop(b, by) });
      bubbles.push(b);
      ctx.sfx('bubble');
      return;
    }
  }

  function pop(b: Bubble, by: 'player' | 'npc' | null): void {
    const i = bubbles.indexOf(b);
    if (i < 0) return;
    bubbles.splice(i, 1);
    b.target?.remove();
    const now = ctx.scene.time.now;
    const c: Cloud = { x: b.x, y: b.y - 10, born: now, life: CLOUD_LIFE, kx: 0, ky: 0, kickUntil: 0, seed: b.seed };
    if (by) {
      const s = by === 'player' ? player : npc;
      const a = Math.atan2(b.y - s.y, b.x - s.x);
      c.kx = Math.cos(a) * 120; c.ky = Math.sin(a) * 120; c.kickUntil = now + 1500;
      ctx.float(b.x, b.y - 36, 'POPPED', '#c8f088');
    }
    clouds.push(c);
    ctx.sfx('spore');
  }

  const inGas = (f: Fighter) => clouds.some((c) => dist(c.x, c.y, f.x, f.y) < CLOUD_R * cloudScale(c, ctx.scene.time.now));
  function cloudScale(c: Cloud, time: number): number {
    const age = time - c.born;
    return clamp(age / 400, 0.3, 1) * clamp((c.life - age) / 900 + 0.4, 0.4, 1);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBubble = time + 600; spawnBubble(time); }
      windA += dt * 0.09;
      if (time >= nextBubble) { nextBubble = time + SPAWN_MS; if (bubbles.length < MAX_BUBBLES) spawnBubble(time); }
      for (const b of [...bubbles]) {
        b.target?.setRadius(radiusOf(b, time) * 0.7 + 6);
        if (time - b.born >= RIPEN_MS) pop(b, null);
      }
      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        const kick = time < c.kickUntil ? clamp((c.kickUntil - time) / 1500, 0, 1) : 0;
        c.x += (Math.cos(windA) * BREEZE + c.kx * kick) * dt;
        c.y += (Math.sin(windA) * BREEZE * 0.7 + c.ky * kick) * dt;
        c.x = clamp(c.x, 20, W - 20); c.y = clamp(c.y, top + 30, H - 20);
        if (time - c.born > c.life) clouds.splice(i, 1);
      }
      for (const f of [player, npc]) {
        if (!alive(f) || !inGas(f)) continue;
        if (f === npc) npcInGasUntil = time + 300;
        else ctx.tk.slowPlayer(0.68, 400);
        if (time - (tick.get(f) ?? 0) < TICK_MS) continue;
        tick.set(f, time);
        ctx.hit(f, TICK_DMG, f.x, f.y - 10);
      }
    },

    npcSpeedMult() { return ctx.scene.time.now < npcInGasUntil ? 0.68 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      // Ooze keeps upwind of you, so the clouds go your way; and he wades out of any he is in.
      const now = ctx.scene.time.now;
      let x = player.x - Math.cos(windA) * 210, y = player.y - Math.sin(windA) * 170;
      for (const c of clouds) {
        const r = CLOUD_R * cloudScale(c, now) + 50;
        if (dist(c.x, c.y, x, y) < r) { const a = Math.atan2(y - c.y, x - c.x); x = c.x + Math.cos(a) * r; y = c.y + Math.sin(a) * r; }
      }
      // A ripe bubble between him and you is worth walking to: pop it toward you.
      for (const b of bubbles) {
        if (now - b.born < RIPEN_MS * 0.4) continue;
        const db = dist(b.x, b.y, player.x, player.y);
        if (db < 160 && dist(npc.x, npc.y, b.x, b.y) < 260) {
          const a = Math.atan2(b.y - player.y, b.x - player.x);
          return { x: clamp(b.x + Math.cos(a) * 46, 60, W - 60), y: clamp(b.y + Math.sin(a) * 46, top + 50, H - 40) };
        }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Wet patches where bubbles come up, and the bubbles' mud collars.
      for (const b of bubbles) {
        g.fillStyle(MUD_DARK, 0.5); g.fillEllipse(b.x, b.y + 4, 60, 18);
        g.fillStyle(GAS_DARK, 0.18 + Math.sin(time / 300 + b.seed) * 0.05); g.fillEllipse(b.x, b.y + 4, 44, 12);
      }
      // Cloud shadows.
      for (const c of clouds) {
        const s = cloudScale(c, time);
        g.fillStyle(dim(GAS, 0.6), 0.14); g.fillEllipse(c.x + 8, c.y + CLOUD_R * 0.45 * s, CLOUD_R * 1.9 * s, CLOUD_R * 0.6 * s);
      }
      // Cattails along the bottom edge, bent by the breeze.
      for (const r of reeds) cattail(g, r.x, H - 4, r.h, Math.cos(windA) * 9 + Math.sin(time / 500 + r.x) * 1.5);
      // The breeze: streaks along it.
      for (let i = 0; i < 10; i++) {
        const ph = ((time / 1600) + i * 0.137) % 1;
        const bx = (i * 211) % W, by = top + 30 + ((i * 89) % (H - top - 60));
        const x = bx + Math.cos(windA) * ph * 140, y = by + Math.sin(windA) * ph * 140;
        g.lineStyle(1.2, lit(GAS, 0.4), 0.22 * Math.sin(ph * Math.PI));
        g.lineBetween(x, y, x - Math.cos(windA) * 24, y - Math.sin(windA) * 24);
      }
    },

    drawAir(g, time) {
      for (const b of bubbles) {
        const k = clamp((time - b.born) / RIPEN_MS, 0, 1);
        gasBubble(g, b.x, b.y, radiusOf(b, time), time + b.seed * 100, k);
      }
      for (const c of clouds) {
        const s = cloudScale(c, time);
        const age = time - c.born;
        // A burst: the skin of the bubble flying apart.
        if (age < 300) {
          const k = age / 300;
          g.lineStyle(3 * (1 - k), lit(GAS, 0.3), 1 - k); g.strokeCircle(c.x, c.y, 20 + k * 60);
        }
        // The cloud itself: rolling lumps of green, darker at the heart, with motes of muck in it.
        for (let i = 0; i < 10; i++) {
          const a = c.seed + i * 0.63 + time / 2600;
          const rr = CLOUD_R * s * (0.4 + ((i * 37) % 10) / 28);
          g.fillStyle(i % 3 ? GAS : GAS_DARK, 0.13);
          g.fillCircle(c.x + Math.cos(a) * CLOUD_R * s * 0.45, c.y + Math.sin(a) * CLOUD_R * s * 0.32, rr);
        }
        g.fillStyle(GAS_DARK, 0.12); g.fillCircle(c.x, c.y, CLOUD_R * s * 0.5);
        for (let i = 0; i < 12; i++) {
          const a = c.seed * 2 + i * 2.4 + time / 1800;
          const d = (((i * 53) % 100) / 100) * CLOUD_R * s * 0.85;
          g.fillStyle(VENOM_LIT, 0.35 + Math.sin(time / 150 + i) * 0.2);
          g.fillCircle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.7, 1.4);
        }
      }
      // Choking: a cough-cloud over anyone in the gas.
      for (const f of [player, npc]) {
        if (!alive(f) || !inGas(f)) continue;
        const ph = (time / 400) % 1;
        g.fillStyle(GAS, 0.4 * (1 - ph)); g.fillCircle(f.x + 10, f.y - 40 - ph * 14, 4 + ph * 6);
        g.fillStyle(GAS, 0.3 * (1 - ph)); g.fillCircle(f.x - 6, f.y - 46 - ph * 18, 3 + ph * 5);
      }
    },

    drawHud(g) {
      // The wind-dial at the top right: which way the gas will go.
      const cx = W - 60, cy = top + 30;
      g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 20);
      g.lineStyle(1.5, SEDGE_LIT, 0.8); g.strokeCircle(cx, cy, 20);
      g.lineStyle(3, lit(GAS, 0.3), 1); g.lineBetween(cx - Math.cos(windA) * 12, cy - Math.sin(windA) * 12, cx + Math.cos(windA) * 13, cy + Math.sin(windA) * 13);
      const tx = cx + Math.cos(windA) * 15, ty = cy + Math.sin(windA) * 15;
      g.fillStyle(lit(GAS, 0.3), 1);
      g.fillTriangle(tx, ty, tx - Math.cos(windA - 0.5) * 8, ty - Math.sin(windA - 0.5) * 8, tx - Math.cos(windA + 0.5) * 8, ty - Math.sin(windA + 0.5) * 8);
    },
  };
}

export const FEN_GAS: GimmickDef = {
  id: 'fang-fen-gas',
  rules: 'Gas bubbles swell out of the fen and burst into choking clouds that drift with the breeze. Strike a bubble to pop it now — the cloud blows away from you.',
  make,
};
