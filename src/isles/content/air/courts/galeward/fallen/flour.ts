import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { millstone } from '../art';
import { CANVAS, CANVAS_SHADE, FLOUR, GRAIN, TAR, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * The Bolting Loft — Sifter Deverell of the Grindstone.
 *
 * Under the great mill the meal is "bolted": shaken through silk on turning reels until only the
 * finest flour comes through. In the star's telling Deverell bolted the King's share out of every
 * sack in Galeward — the white went up the lift to the Lung, the chaff came back down to the
 * millers' children — and nobody ever saw him sweep.
 *
 * The loft is full of it. Two bolting spouts on the west wall cough out flour, and the clouds drift
 * east on the draught, thickening as they go: pale and harmless at first, then creamy and
 * glittering — ripe. A ripe cloud takes light from any shot through it (either side's) and goes up
 * in a flash fire that burns everyone inside; touching ripe clouds light each other in a chain.
 * Every so often the runner stone in the middle runs dry and screams, and sprays a fan of sparks
 * (marked first) that lights whatever ripe cloud it reaches. Dust in the eyes slows you.
 *
 * The exploit is plain: when Deverell stands in a ripe cloud, shoot through it. Halfway down he
 * opens the third spout — the King's share — and the stone runs dry more often.
 */

const ID = fallenId('galeward', 'flour');
const PUFF_MS = 2500;
const RIPEN_MS = 4200;
const RIPE = 0.55;
const DRIFT = 24;
const MAX_CLOUDS = 9;
const CHAIN_MS = 170;
const SPARK_EVERY = 7200;
const SPARK_EVERY_SHARE = 5000;
const SPARK_WARN = 1300;
const FAN_HALF = 0.62;
const FAN_LEN = 330;
const BURN_MS = 700;

interface Cloud { x: number; y: number; born: number; seed: number; lit: number; burnAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const spouts: Pt[] = [{ x: 30, y: fy(0.25) }, { x: 30, y: fy(0.75) }];
  const share: Pt = { x: 30, y: fy(0.5) };
  const stone: Pt = { x: W * 0.55, y: fy(0.5) };
  const clouds: Cloud[] = [];
  let nextPuff = 0, spout = 0, started = false, opened = false;
  let sparkWarnAt = -1, sparkAng = 0, sparkFiredAt = -1e9, nextSpark = 0;
  let seed = 0;

  const ripeness = (c: Cloud, t: number) => clamp((t - c.born) / RIPEN_MS, 0, 1);
  const radius = (c: Cloud, t: number) => 38 + ripeness(c, t) * 40;
  const isRipe = (c: Cloud, t: number) => c.lit < 0 && ripeness(c, t) >= RIPE;
  const inside = (f: Fighter, c: Cloud, t: number) => dist(f.x, f.y, c.x, c.y) < radius(c, t);
  const inFan = (x: number, y: number) => dist(stone.x, stone.y, x, y) < FAN_LEN && Math.abs(wrapAngle(Math.atan2(y - stone.y, x - stone.x) - sparkAng)) < FAN_HALF;
  const dusty = (f: Fighter) => clouds.some((c) => c.lit < 0 && inside(f, c, tk.now));

  function light(c: Cloud, time: number): void {
    if (c.lit >= 0) return;
    c.lit = time; c.burnAt = time;
    const r = radius(c, time);
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, c.x, c.y) > r + 6) continue;
      if (f === player) tk.hitPlayer(12, f.x, f.y); else ctx.hit(npc, 17, f.x, f.y);
    }
    ctx.flash(c.x, c.y, 0xffc060);
    ctx.sfx('flame-burst');
    // The chain: touching ripe clouds catch a moment later.
    for (const o of clouds) {
      if (o !== c && isRipe(o, time) && dist(o.x, o.y, c.x, c.y) < r + radius(o, time) - 10) {
        tk.schedule(CHAIN_MS, () => light(o, tk.now));
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPuff = time + 400; nextSpark = time + 6000; }
      if (!opened && npc.hp < npc.maxHp * 0.5) { opened = true; ctx.banner('THE KING\'S SHARE', '#f6f0e2'); ctx.sfx('smoke'); }

      // Spouts cough flour in turn; the clouds ride the draught east.
      if (time >= nextPuff) {
        const list = opened ? [...spouts, share] : spouts;
        const s = list[spout++ % list.length];
        clouds.push({ x: s.x + 40, y: s.y + (rng() - 0.5) * 40, born: time, seed: seed++, lit: -1, burnAt: -1 });
        if (clouds.length > MAX_CLOUDS) { const old = clouds.findIndex((c) => c.lit < 0); if (old >= 0) clouds.splice(old, 1); }
        nextPuff = time + (opened ? PUFF_MS * 0.7 : PUFF_MS);
        ctx.sfx('smoke');
      }
      for (const c of clouds) {
        if (c.lit >= 0) continue;
        c.x += DRIFT * dt;
        c.y += Math.sin(time / 1300 + c.seed) * 8 * dt;
      }
      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if ((c.lit >= 0 && time - c.lit > BURN_MS) || c.x > W + 80) clouds.splice(i, 1);
      }

      // Any shot through a ripe cloud strikes it alight.
      for (const c of clouds) if (isRipe(c, time) && ctx.shotsNear(c.x, c.y, radius(c, time) * 0.85).length) light(c, time);

      // The runner stone runs dry: a fan of sparks toward you, marked first.
      if (sparkWarnAt < 0 && time >= nextSpark) {
        sparkWarnAt = time;
        sparkAng = Math.atan2(player.y - stone.y, player.x - stone.x);
        ctx.sfx('screech');
      }
      if (sparkWarnAt >= 0 && time >= sparkWarnAt + tk.warn(SPARK_WARN)) {
        sparkWarnAt = -1; sparkFiredAt = time;
        nextSpark = time + (opened ? SPARK_EVERY_SHARE : SPARK_EVERY);
        ctx.sfx('plasma-arc');
        for (const f of [player, npc]) {
          if (!alive(f) || !inFan(f.x, f.y)) continue;
          if (f === player) tk.hitPlayer(6, f.x, f.y); else ctx.hit(npc, 8, f.x, f.y);
        }
        for (const c of clouds) if (isRipe(c, time) && inFan(c.x, c.y)) light(c, time);
      }
    },

    playerSpeedMult: () => (dusty(player) ? 0.8 : 1),
    npcSpeedMult: () => (dusty(npc) ? 0.8 : 1),

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const t = tk.now;
      // Out of the spark fan while the stone screams.
      if (sparkWarnAt >= 0 && inFan(npc.x, npc.y)) {
        const side = wrapAngle(Math.atan2(npc.y - stone.y, npc.x - stone.x) - sparkAng) >= 0 ? 1 : -1;
        const a = sparkAng + side * (FAN_HALF + 0.5);
        const r = Math.max(120, dist(stone.x, stone.y, npc.x, npc.y));
        return { x: tk.clampX(stone.x + Math.cos(a) * r), y: tk.clampY(stone.y + Math.sin(a) * r) };
      }
      // Out of a ripe cloud, upwind (the short way out is west, where it is thinnest).
      for (const c of clouds) {
        if (!isRipe(c, t) || !inside(npc, c, t)) continue;
        const d = Math.max(1, dist(c.x, c.y, npc.x, npc.y));
        const r = radius(c, t) + 46;
        return { x: tk.clampX(c.x + ((npc.x - c.x) / d) * r), y: tk.clampY(c.y + ((npc.y - c.y) / d) * r) };
      }
      return null;
    },

    drawGround(g, time) {
      // Loft boards, dusted white toward the west wall.
      for (let y = top; y < H; y += 32) {
        g.fillStyle(TIMBER_DARK, 0.35); g.fillRect(0, y, W, 2);
        for (let x = ((y / 32) % 2) * 90; x < W; x += 180) { g.fillStyle(TIMBER_DARK, 0.25); g.fillRect(x, y, 2, 32); }
      }
      g.fillStyle(FLOUR, 0.16); g.fillRect(0, top, 140, H - top);
      g.fillStyle(FLOUR, 0.08); g.fillRect(140, top, 160, H - top);
      // The runner stone in its curb, the hopper over it.
      g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(stone.x, stone.y + 4, 108, 40);
      g.fillStyle(TIMBER, 1); g.fillEllipse(stone.x, stone.y, 100, 34);
      millstone(g, stone.x, stone.y - 2, 42);
      // The spark fan, marked while it screams; scorch where it fired.
      if (sparkWarnAt >= 0) {
        const k = clamp((time - sparkWarnAt) / SPARK_WARN, 0, 1);
        g.fillStyle(0xffa040, 0.06 + k * 0.14);
        g.slice(stone.x, stone.y, FAN_LEN, sparkAng - FAN_HALF, sparkAng + FAN_HALF, false); g.fillPath();
        g.lineStyle(2, 0xffc060, 0.3 + k * 0.5);
        g.lineBetween(stone.x, stone.y, stone.x + Math.cos(sparkAng - FAN_HALF) * FAN_LEN, stone.y + Math.sin(sparkAng - FAN_HALF) * FAN_LEN);
        g.lineBetween(stone.x, stone.y, stone.x + Math.cos(sparkAng + FAN_HALF) * FAN_LEN, stone.y + Math.sin(sparkAng + FAN_HALF) * FAN_LEN);
      }
      for (const c of clouds) {
        if (c.lit < 0) continue;
        const k = (time - c.lit) / BURN_MS;
        g.fillStyle(TAR, 0.3 * (1 - k)); g.fillCircle(c.x, c.y, radius(c, c.lit) * 0.8);
      }
    },

    drawAir(g, time) {
      for (const s of opened ? [...spouts, share] : spouts) drawSpout(g, s.x, s.y, time);
      // Hopper: a timber funnel over the stone, shaking while it runs dry.
      const shake = sparkWarnAt >= 0 ? Math.sin(time / 20) * 2 : 0;
      drawHopper(g, stone.x + shake, stone.y - 26);
      if (sparkWarnAt >= 0 || time - sparkFiredAt < 300) {
        const fired = time - sparkFiredAt < 300;
        for (let i = 0; i < (fired ? 26 : 6); i++) {
          const a = sparkAng + (((i * 37) % 19) / 19 - 0.5) * FAN_HALF * 2;
          const r = fired ? ((time - sparkFiredAt) / 300) * FAN_LEN * (0.5 + ((i * 13) % 7) / 14) : 30 + ((time / 3 + i * 20) % 30);
          g.fillStyle(i % 3 ? 0xffd070 : 0xffffff, 0.9); g.fillCircle(stone.x + Math.cos(a) * r, stone.y + Math.sin(a) * r, 1.8);
        }
      }
      for (const c of clouds) drawCloud(g, c, time, ripeness(c, time), radius(c, c.lit >= 0 ? c.lit : time));
    },

    drawHud(g, time) {
      const x = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 12, y - 16, 150, 32, 8);
      const ripe = clouds.filter((c) => isRipe(c, time)).length;
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i < ripe ? 0xffd38a : 0x5a5250, 1); g.fillCircle(x + i * 14, y - 2, 5);
        if (i < ripe) { g.fillStyle(0xffffff, 0.6); g.fillCircle(x + i * 14 - 1.5, y - 3.5, 1.5); }
      }
      const k = sparkWarnAt >= 0 ? 1 : clamp(1 - (nextSpark - time) / (opened ? SPARK_EVERY_SHARE : SPARK_EVERY), 0, 1);
      g.fillStyle(0x2a2420, 1); g.fillRect(x + 90, y - 6, 40, 8);
      g.fillStyle(sparkWarnAt >= 0 && Math.floor(time / 100) % 2 ? 0xffffff : 0xffa040, 1); g.fillRect(x + 91, y - 5, 38 * k, 6);
    },
  };
}

/** A flour cloud: pale and loose while young; ripe it turns creamy and glitters; lit it is a fireball. */
function drawCloud(g: G, c: Cloud, time: number, ripe: number, r: number): void {
  if (c.lit >= 0) {
    const k = (time - c.lit) / BURN_MS;
    glow(g, c.x, c.y, r * (1 + k * 0.4), 0xffa040, 0.12 * (1 - k), 4);
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + c.seed;
      const d = r * (0.3 + k * 0.7);
      g.fillStyle(i % 2 ? 0xffd070 : 0xe8642a, 0.8 * (1 - k)); g.fillCircle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.8, r * 0.35 * (1 - k * 0.6));
    }
    g.fillStyle(0x4a4040, 0.4 * k * (1 - k) * 4); g.fillCircle(c.x, c.y - k * 30, r * 0.6);
    return;
  }
  const col = mixC(FLOUR, 0xffe3a8, ripe >= RIPE ? 0.6 : ripe * 0.6);
  const a = 0.22 + ripe * 0.3;
  for (let i = 0; i < 7; i++) {
    const ang = i * 0.9 + c.seed * 1.3 + time / 4000;
    const d = r * 0.45;
    g.fillStyle(col, a); g.fillCircle(c.x + Math.cos(ang) * d, c.y + Math.sin(ang) * d * 0.7 - 10, r * 0.55);
  }
  g.fillStyle(col, a * 0.8); g.fillCircle(c.x, c.y - 10, r * 0.6);
  if (ripe >= RIPE) {
    for (let i = 0; i < 9; i++) {
      const tw = Math.sin(time / 120 + i * 2.3 + c.seed) > 0.6;
      if (!tw) continue;
      const ang = i * 2.4 + c.seed;
      g.fillStyle(0xffffff, 0.9); g.fillCircle(c.x + Math.cos(ang) * r * 0.6, c.y + Math.sin(ang) * r * 0.5 - 10, 1.6);
    }
  }
}

/** A bolting spout on the west wall: a hexagonal silk reel in a timber case, coughing flour from its sock. */
function drawSpout(g: G, x: number, y: number, time: number): void {
  shadow(g, x + 10, y + 26, 40, 10, 0.25);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 34, 40, 60);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 24, y - 34, 40, 6);
  const a = time / 400;
  g.fillStyle(CANVAS_SHADE, 1);
  const hex = Array.from({ length: 6 }, (_, i) => ({ x: x - 4 + Math.cos(a + (i * Math.PI) / 3) * 14, y: y - 8 + Math.sin(a + (i * Math.PI) / 3) * 14 }));
  g.fillPoints(hex, true);
  g.lineStyle(1, TIMBER_DARK, 1); for (const p of hex) g.lineBetween(x - 4, y - 8, p.x, p.y);
  g.fillStyle(CANVAS, 1); g.fillTriangle(x + 16, y + 6, x + 16, y + 20, x + 34, y + 16);
  g.fillStyle(FLOUR, 0.5); g.fillCircle(x + 36 + Math.sin(time / 90) * 2, y + 14, 5);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 24, y + 22, 40, 4);
}

/** The hopper over the runner stone: a square timber funnel of grain on its shoe. */
function drawHopper(g: G, x: number, y: number): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - 30, y - 34, x + 30, y - 34, x, y);
  g.fillStyle(TIMBER, 1); g.fillTriangle(x - 26, y - 32, x + 20, y - 32, x - 2, y - 4);
  g.fillStyle(GRAIN, 1); g.fillEllipse(x, y - 34, 56, 10);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 31, y - 38, 62, 4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - 2, 6, 12);
}

export const FALLEN_FLOUR: GimmickDef = {
  id: ID,
  rules: 'Flour drifts east and ripens. A shot through a ripe cloud lights a flash fire that chains to its neighbours. The dry stone sprays sparks. Light him.',
  make,
};
