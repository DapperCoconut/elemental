import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { pleachedLime } from '../art';
import { POLLEN, SUN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Pollen Count — Sneezewort Pell.
 *
 * The limes along the edge of the lawn are in flower, and clouds of their pollen drift across
 * on the wind. Standing in one fills your *sneeze meter*; out of them it slowly drains. Full,
 * you sneeze: stopped dead for a moment and thrown back on your heels, a little hurt.
 *
 * Pell keeps a great paper fan. Every so often he works it, and for a few seconds the wind
 * blows *from him at you*, driving every cloud on the lawn your way. But pollen is nobody's —
 * Pell has hay fever like anyone — and a sneeze is not just a stagger: it blasts the cloud you
 * are standing in straight at the other fighter. Sneeze on purpose, aimed, and the cloud hits
 * him at speed. Stand so he is downwind of you when he fans, and his own clouds pass through him.
 */

const FILL_PER_S = 36;
const DRAIN_PER_S = 14;
const SNEEZE_MS = 650;
const SNEEZE_DMG = 5;
const SNEEZE_PUSH = 110;
const MAX_CLOUDS = 5;
const CLOUD_R = 62;

interface Cloud {
  x: number; y: number; r: number;
  vx: number; vy: number;
  seed: number;
  bornAt: number;
  /** Blasted by a sneeze: flies straight, fast, for a moment. */
  blastUntil: number;
}

interface Nose { meter: number; sneezeAt: number; lastIn: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const clouds: Cloud[] = [];
  const noses = new Map<Fighter, Nose>([[player, { meter: 0, sneezeAt: -9999, lastIn: false }], [npc, { meter: 0, sneezeAt: -9999, lastIn: false }]]);
  /** The prevailing wind: slowly veering, mostly across the lawn. */
  let windA = rng() < 0.5 ? 0 : Math.PI;
  const WIND = 46;
  const fanEvery = ctx.hard ? 6800 : 8400;
  const FAN_WARN = 1200;
  const FAN_MS = 2600;
  let nextFan = 0;
  let fanWarnAt = -1;
  let fanUntil = 0;
  let fanA = 0;
  let nextCloud = 0;
  let started = false;
  /** Limes along the top and bottom edges: where the clouds come off. */
  const limes: Pt[] = [];
  for (let x = 70; x < W; x += 140) { limes.push({ x, y: top + 26 }); limes.push({ x: x + 70, y: H - 8 }); }

  const inCloud = (f: Fighter) => clouds.reduce((best, c) => {
    const d = dist(c.x, c.y, f.x, f.y);
    return d < c.r ? Math.max(best, 1 - d / c.r) : best;
  }, 0);

  function spawnCloud(time: number): void {
    // Off a lime on the windward side.
    const wx = Math.cos(windA);
    const src = limes.filter((l) => (wx > 0 ? l.x < W * 0.35 : l.x > W * 0.65));
    const l = src[Math.floor(rng() * src.length)] ?? limes[0];
    clouds.push({
      x: l.x, y: clamp(l.y + (l.y < H / 2 ? 50 : -60), top + 40, H - 40), r: CLOUD_R * (0.8 + rng() * 0.4),
      vx: Math.cos(windA) * WIND, vy: Math.sin(windA) * WIND, seed: rng() * 10, bornAt: time, blastUntil: 0,
    });
  }

  function sneeze(f: Fighter, time: number): void {
    const n = noses.get(f);
    if (!n) return;
    n.meter = 0;
    n.sneezeAt = time;
    const other = f === player ? npc : player;
    // Thrown back on the heels: away from the other fighter (you face them as you sneeze).
    const a = Math.atan2(f.y - other.y, f.x - other.x);
    ctx.stun(f, SNEEZE_MS);
    ctx.nudge(f, Math.cos(a) * SNEEZE_PUSH, Math.sin(a) * SNEEZE_PUSH);
    ctx.hit(f, SNEEZE_DMG, f.x, f.y);
    ctx.float(f.x, f.y - 46, 'ACHOO!', '#fff2b0');
    ctx.sfx('gust');
    // The sneeze blasts the cloud you are in at whoever you are facing.
    let near: Cloud | null = null;
    let nd = Infinity;
    for (const c of clouds) { const d = dist(c.x, c.y, f.x, f.y); if (d < c.r + 30 && d < nd) { nd = d; near = c; } }
    if (near && alive(other)) {
      const b = Math.atan2(other.y - near.y, other.x - near.x);
      near.vx = Math.cos(b) * 300; near.vy = Math.sin(b) * 300;
      near.blastUntil = time + 900;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextFan = time + fanEvery;
        nextCloud = time + 300;
        for (let i = 0; i < 2; i++) {
          spawnCloud(time);
          const c = clouds[clouds.length - 1];
          c.x = W * (0.3 + i * 0.4); c.y = top + 120 + rng() * (H - top - 240);
        }
      }
      windA += dt * 0.05;
      if (time >= nextCloud) {
        nextCloud = time + (ctx.hard ? 1800 : 2400);
        if (clouds.length < MAX_CLOUDS) spawnCloud(time);
      }
      // Pell's fan.
      if (fanWarnAt < 0 && time >= nextFan - FAN_WARN) {
        fanWarnAt = time;
        ctx.banner('PELL OPENS HIS FAN', '#fff2b0');
        ctx.sfx('whoosh');
      }
      if (time >= nextFan) {
        nextFan = time + fanEvery;
        fanWarnAt = -1;
        fanUntil = time + FAN_MS;
        ctx.sfx('gust');
      }
      const fanning = time < fanUntil;
      if (fanning && alive(npc) && alive(player)) fanA = Math.atan2(player.y - npc.y, player.x - npc.x);
      else if (fanWarnAt >= 0 && alive(npc)) fanA = Math.atan2(player.y - npc.y, player.x - npc.x);

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if (time >= c.blastUntil) {
          const tx = fanning ? Math.cos(fanA) * 130 : Math.cos(windA) * WIND;
          const ty = fanning ? Math.sin(fanA) * 130 : Math.sin(windA) * WIND;
          const k = Math.min(1, dt * (fanning ? 3 : 0.8));
          c.vx += (tx - c.vx) * k;
          c.vy += (ty - c.vy) * k;
        }
        c.x += (c.vx + Math.sin(time / 900 + c.seed) * 10) * dt;
        c.y += (c.vy + Math.cos(time / 1100 + c.seed) * 8) * dt;
        c.y = clamp(c.y, top + 30, H - 30);
        if (c.x < -c.r * 1.5 || c.x > W + c.r * 1.5 || time - c.bornAt > 30000) clouds.splice(i, 1);
      }

      for (const [f, n] of noses) {
        if (!alive(f)) continue;
        const depth = inCloud(f);
        n.lastIn = depth > 0;
        if (time - n.sneezeAt < SNEEZE_MS + 300) continue;
        n.meter = clamp(n.meter + (depth > 0 ? FILL_PER_S * (0.6 + depth * 0.8) : -DRAIN_PER_S) * dt, 0, 100);
        if (n.meter >= 100) sneeze(f, time);
      }
    },

    npcSeek() {
      const n = noses.get(npc);
      // Upwind of you, so the clouds he fans go your way and not his.
      const a = time() < fanUntil ? fanA : windA;
      let x = player.x - Math.cos(a) * 240, y = player.y - Math.sin(a) * 200;
      // Itchy: get out of the pollen first.
      if (n && n.meter > 55) {
        let best: Pt | null = null;
        let bs = -1;
        for (let i = 0; i < 8; i++) {
          const cx = 80 + ((i * 131) % (W - 160)), cy = top + 60 + ((i * 97) % (H - top - 120));
          const s = clouds.reduce((m, c) => Math.min(m, dist(c.x, c.y, cx, cy) - c.r), 999);
          if (s > bs) { bs = s; best = { x: cx, y: cy }; }
        }
        return best;
      }
      for (const c of clouds) {
        if (dist(c.x, c.y, x, y) < c.r + 30) { x += (x - c.x) * 0.6; y += (y - c.y) * 0.6; }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The limes' fallen flowers along both edges, and the trees themselves along the top.
      for (const l of limes) {
        if (l.y < H / 2) continue;
        g.fillStyle(POLLEN, 0.25); g.fillEllipse(l.x, l.y - 6, 70, 14);
      }
      // Wind streaks along the prevailing wind; Pell's gust when he fans.
      const fanning = time < fanUntil;
      const a = fanning ? fanA : windA;
      for (let i = 0; i < (fanning ? 16 : 8); i++) {
        const ph = ((time / (fanning ? 400 : 1400)) + i * 0.137) % 1;
        const bx = (i * 211) % W, by = top + 30 + ((i * 89) % (H - top - 60));
        const x = bx + Math.cos(a) * ph * 160, y = by + Math.sin(a) * ph * 160;
        g.lineStyle(fanning ? 2 : 1.2, lit(SUN, 0.3), (fanning ? 0.5 : 0.25) * Math.sin(ph * Math.PI));
        g.lineBetween(x, y, x - Math.cos(a) * 26, y - Math.sin(a) * 26);
      }
      // The fan's telegraph: a cone of lines from Pell toward you.
      if (fanWarnAt >= 0 && alive(npc)) {
        const k = clamp((time - fanWarnAt) / FAN_WARN, 0, 1);
        for (let i = -3; i <= 3; i++) {
          const b = fanA + i * 0.12;
          g.lineStyle(2, POLLEN, 0.2 + k * 0.5);
          g.lineBetween(npc.x + Math.cos(b) * 30, npc.y + Math.sin(b) * 30, npc.x + Math.cos(b) * (80 + k * 220), npc.y + Math.sin(b) * (80 + k * 220));
        }
      }
      // Cloud shadows.
      for (const c of clouds) { g.fillStyle(dim(POLLEN, 0.6), 0.12); g.fillEllipse(c.x + 6, c.y + c.r * 0.5, c.r * 1.8, c.r * 0.6); }
    },

    drawAir(g, time) {
      for (const l of limes) if (l.y < H / 2) pleachedLime(g, l.x, l.y, 0.55);
      for (const c of clouds) {
        const blasted = time < c.blastUntil;
        // A pollen cloud: overlapping soft puffs, grains glittering through it.
        for (let i = 0; i < 9; i++) {
          const a = c.seed + i * 0.7 + time / 3000;
          const rr = c.r * (0.45 + ((i * 37) % 10) / 30);
          const px = c.x + Math.cos(a) * c.r * 0.45, py = c.y + Math.sin(a) * c.r * 0.35;
          g.fillStyle(i % 3 ? POLLEN : lit(POLLEN, 0.4), blasted ? 0.22 : 0.13);
          g.fillCircle(px, py, rr);
        }
        for (let i = 0; i < 18; i++) {
          const a = c.seed * 3 + i * 2.39;
          const d = ((i * 53) % 100) / 100 * c.r * 0.9;
          const tw = 0.4 + Math.sin(time / 120 + i) * 0.4;
          g.fillStyle(0xfff6c0, 0.5 + tw * 0.4);
          g.fillCircle(c.x + Math.cos(a + time / 2000) * d, c.y + Math.sin(a + time / 2000) * d * 0.8, 1.3);
        }
        if (blasted) { g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(c.x, c.y, c.r * 0.8); }
      }
      // Watery eyes: a twitching nose over anyone nearly gone.
      for (const [f, n] of noses) {
        if (!alive(f)) continue;
        if (time - n.sneezeAt < 500) {
          const k = (time - n.sneezeAt) / 500;
          g.lineStyle(3 * (1 - k), 0xfff2b0, 1 - k); g.strokeCircle(f.x, f.y - 6, 20 + k * 40);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(0xffffff, 1 - k); g.fillCircle(f.x + Math.cos(a) * (22 + k * 40), f.y - 6 + Math.sin(a) * (22 + k * 40), 2); }
        } else if (n.meter > 70) {
          const tw = Math.sin(time / 50) * (n.meter - 70) / 30;
          g.fillStyle(0xffd0d8, 0.9); g.fillCircle(f.x + tw * 2, f.y - 40, 4);
          g.fillStyle(0x9ad0ff, 0.8); g.fillCircle(f.x - 8, f.y - 34 + (time % 600) / 60, 1.6);
        }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const n = noses.get(f);
        if (!n) continue;
        const w = 120;
        const x0 = d > 0 ? x : x - w;
        const y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        g.fillStyle(n.meter > 75 ? 0xffe070 : POLLEN, 0.95);
        const fw = (w * n.meter) / 100;
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        // A little nose at the meter's end.
        const nx = d > 0 ? x0 + w + 12 : x0 - 12;
        g.fillStyle(0xf0c0a8, 1); g.fillEllipse(nx, y + 4, 12, 9);
        g.fillStyle(0x6a3a2a, 1); g.fillCircle(nx - 2, y + 6, 1.4); g.fillCircle(nx + 2, y + 6, 1.4);
      }
    },
  };

  function time(): number { return ctx.scene.time.now; }
}

export const POLLEN_COUNT: GimmickDef = {
  id: 'bloom-pollen-count',
  rules: 'Pollen clouds fill a sneeze meter. Full, you sneeze: stunned, thrown back, and the cloud you stood in is blasted at your foe. Pell\'s fan drives every cloud at you.',
  make,
};
