import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { grainSack, sails, windsock } from '../art';
import { CANVAS, FLOUR, LIME, LIME_SHADE, ROCK, ROCK_DARK, TAR, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Windmill — Miller Thresh.
 *
 * The fight is under the great mill on the Grindstone, and its four sails sweep the yard as four
 * long beams, turning on the hub in the middle. The mill's speed is the wind's: it idles, then a
 * gust comes down the hill — the windsocks snap straight, a banner calls it — and the sails race
 * for a few seconds. A sail that catches you knocks you along its turn.
 *
 * The sails only reach so far: right under the tower, and out in the corners past their tips,
 * the yard is quiet. In between, the cover is grain: Thresh's sacks stand about the floor, and a
 * fighter tucked behind one when a sail comes round is spared — the sail splits the sack instead,
 * and the flour bursts into a cloud that slows anyone inside it. Thresh throws a fresh sack out
 * every so often. The sails do not care whose side anyone is on.
 */

const HUB_SAFE = 58;
const SAIL_HALF = 18;
const IDLE_SPEED = 0.55;
const GUST_SPEED = 1.45;
const GUST_EVERY = 6500;
const GUST_WARN = 1100;
const GUST_MS = 2600;
const SAIL_DMG = 10;
const REHIT_MS = 650;
const SACK_R = 34;
const FLOUR_MS = 3200;
const FLOUR_R = 70;

interface Sack { x: number; y: number; alive: boolean; burstAt: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const reach = 340;
  let ang = 0.3;
  let speed = IDLE_SPEED;
  let gustWarnAt = -1, gustAt = -1;
  let nextGust = 0;
  let nextSack = 0;
  const lastHit = new Map<Fighter, number>();
  const sacks: Sack[] = [];
  const spots = [
    { x: cx - 230, y: cy - 120 }, { x: cx + 240, y: cy - 110 }, { x: cx - 260, y: cy + 140 }, { x: cx + 220, y: cy + 150 },
    { x: cx - 120, y: cy + 200 }, { x: cx + 110, y: cy - 190 }, { x: cx - 330, y: cy + 10 }, { x: cx + 330, y: cy + 20 },
  ];
  for (let i = 0; i < 5; i++) sacks.push({ ...spots[i], alive: true, burstAt: 0, at: 0 });

  const fighters: Fighter[] = [player, npc];
  /** Angle from the hub to a point, and whether a sail is lying across it right now. */
  const sailOver = (x: number, y: number, a: number): boolean => {
    const d = dist(cx, cy, x, y);
    if (d < HUB_SAFE || d > reach) return false;
    const pa = Math.atan2(y - cy, x - cx);
    for (let i = 0; i < 4; i++) {
      const sa = a + (i * Math.PI) / 2;
      const da = Math.abs(wrapAngle(pa - sa));
      if (da < Math.PI / 2 && d * Math.sin(da) < SAIL_HALF) return true;
    }
    return false;
  };
  const sheltered = (f: Fighter): Sack | null => {
    for (const s of sacks) if (s.alive && dist(f.x, f.y, s.x, s.y) < SACK_R) return s;
    return null;
  };
  const inFlour = (f: Fighter, time: number) => sacks.some((s) => !s.alive && time - s.burstAt < FLOUR_MS && dist(f.x, f.y, s.x, s.y) < FLOUR_R);

  function burst(s: Sack, time: number): void {
    s.alive = false;
    s.burstAt = time;
    ctx.float(s.x, s.y - 40, 'SPLIT', '#f6f0e2');
    ctx.sfx('slime-splat');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextGust === 0) { nextGust = time + 4200; nextSack = time + 9000; }
      // Gusts down the hill.
      if (gustWarnAt < 0 && gustAt < 0 && time >= nextGust) { gustWarnAt = time; ctx.banner('GUST!', '#f1e8d2'); ctx.sfx('gust'); }
      if (gustWarnAt >= 0 && time >= gustWarnAt + GUST_WARN) { gustAt = time; gustWarnAt = -1; }
      if (gustAt >= 0 && time >= gustAt + GUST_MS) { gustAt = -1; nextGust = time + GUST_EVERY * (0.8 + rng() * 0.4) * (ctx.hard ? 0.8 : 1); }
      const want = gustAt >= 0 ? (ctx.hard ? GUST_SPEED * 1.15 : GUST_SPEED) : gustWarnAt >= 0 ? IDLE_SPEED * 1.3 : IDLE_SPEED;
      speed += (want - speed) * clamp(dt * 2.2, 0, 1);
      const prev = ang;
      ang += speed * dt;

      // Sails sweeping: sacks first (cover), then fighters.
      for (const s of sacks) {
        if (s.alive && sailOver(s.x, s.y, ang) && !sailOver(s.x, s.y, prev)) {
          const behind = fighters.some((f) => alive(f) && dist(f.x, f.y, s.x, s.y) < SACK_R);
          // An empty sack is only split by a gust; a sack someone sheltered behind always goes.
          if (behind || gustAt >= 0) burst(s, time);
        }
      }
      for (const f of fighters) {
        if (!alive(f)) continue;
        if (!sailOver(f.x, f.y, ang)) continue;
        if (time - (lastHit.get(f) ?? 0) < REHIT_MS) continue;
        if (sheltered(f)) continue;
        // A sack split this very frame still covered them.
        if (sacks.some((s) => !s.alive && time - s.burstAt < 120 && dist(f.x, f.y, s.x, s.y) < SACK_R)) continue;
        lastHit.set(f, time);
        const dmg = gustAt >= 0 ? SAIL_DMG + 3 : SAIL_DMG;
        ctx.hit(f, dmg, f.x, f.y);
        // Knocked along the turn.
        const pa = Math.atan2(f.y - cy, f.x - cx);
        ctx.nudge(f, -Math.sin(pa) * 46, Math.cos(pa) * 46);
        ctx.float(f.x, f.y - 46, 'SAILED', f === player ? '#ff9a7a' : '#f1e8d2');
        ctx.sfx('hit-heavy');
      }
      // Thresh throws out a fresh sack.
      if (time >= nextSack) {
        nextSack = time + (ctx.hard ? 9000 : 11000);
        const dead = sacks.filter((s) => !s.alive && time - s.burstAt > FLOUR_MS);
        const free = spots.filter((p) => !sacks.some((s) => s.alive && dist(s.x, s.y, p.x, p.y) < 10));
        if (free.length) {
          const p = free[Math.floor(rng() * free.length)];
          if (dead.length) { Object.assign(dead[0], { x: p.x, y: p.y, alive: true, at: time }); }
          else if (sacks.length < 6) sacks.push({ x: p.x, y: p.y, alive: true, burstAt: 0, at: time });
          ctx.float(p.x, p.y - 40, 'FRESH SACK', '#d8b46a');
          ctx.sfx('land');
        }
      }
    },

    playerSpeedMult: () => (inFlour(player, ctx.scene.time.now) ? 0.7 : 1),
    npcSpeedMult: () => (inFlour(npc, ctx.scene.time.now) ? 0.7 : 1),

    npcSeek() {
      // Thresh: behind the sack the next sail will reach latest, else out past the tips.
      if (nextGust === 0) return null;
      let best: Sack | null = null, bestT = -1;
      for (const s of sacks) {
        if (!s.alive) continue;
        const pa = Math.atan2(s.y - cy, s.x - cx);
        let soonest = Infinity;
        for (let i = 0; i < 4; i++) {
          const ahead = ((pa - (ang + (i * Math.PI) / 2)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          soonest = Math.min(soonest, ahead);
        }
        const tScore = soonest - dist(npc.x, npc.y, s.x, s.y) / 300;
        if (tScore > bestT) { bestT = tScore; best = s; }
      }
      if (best && (gustAt >= 0 || gustWarnAt >= 0)) return { x: best.x, y: best.y };
      return null;
    },

    drawGround(g, time) {
      // The mill's footprint: a cobbled ring under the tower and the worn circle the sails sweep.
      g.lineStyle(2, ROCK_DARK, 0.25); g.strokeCircle(cx, cy, reach);
      g.fillStyle(ROCK_DARK, 0.5); g.fillCircle(cx, cy, HUB_SAFE + 8);
      g.fillStyle(ROCK, 0.9); g.fillCircle(cx, cy, HUB_SAFE + 2);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        g.fillStyle(lit(ROCK, 0.12), 0.8); g.fillCircle(cx + Math.cos(a) * (HUB_SAFE - 12), cy + Math.sin(a) * (HUB_SAFE - 12), 6);
      }
      // Each sail's shadow on the ground, sweeping — and, in a gust's warning, a pale wedge ahead
      // of each one showing how far it will come in the next half-second.
      for (let i = 0; i < 4; i++) {
        const sa = ang + (i * Math.PI) / 2;
        if (gustWarnAt >= 0 || gustAt >= 0) {
          const k = gustAt >= 0 ? 1 : clamp((time - gustWarnAt) / GUST_WARN, 0, 1);
          g.fillStyle(0xffffff, 0.06 + k * 0.08);
          g.slice(cx, cy, reach, sa, sa + GUST_SPEED * 0.5, false); g.fillPath();
        }
        const ex = cx + Math.cos(sa) * reach, ey = cy + Math.sin(sa) * reach;
        g.lineStyle(SAIL_HALF * 2, 0x1a2014, 0.22); g.lineBetween(cx + Math.cos(sa) * HUB_SAFE, cy + Math.sin(sa) * HUB_SAFE, ex, ey);
      }
      // Flour clouds on the floor.
      for (const s of sacks) {
        if (s.alive) continue;
        const k = (time - s.burstAt) / FLOUR_MS;
        if (k >= 1) continue;
        g.fillStyle(FLOUR, 0.4 * (1 - k)); g.fillCircle(s.x, s.y, FLOUR_R * (0.5 + Math.min(1, k * 4) * 0.5));
      }
    },

    drawAir(g, time) {
      // Sacks.
      for (const s of sacks) {
        if (!s.alive) {
          const k = (time - s.burstAt) / FLOUR_MS;
          if (k < 1) {
            for (let i = 0; i < 10; i++) {
              const a = i * 0.63 + s.x;
              const r = FLOUR_R * Math.min(1, k * 3) * (0.4 + ((i * 37) % 10) / 16);
              g.fillStyle(FLOUR, 0.45 * (1 - k)); g.fillCircle(s.x + Math.cos(a) * r + speed * k * 20, s.y - 14 + Math.sin(a) * r * 0.6 - k * 20, 10 + k * 14);
            }
          }
          continue;
        }
        const drop = clamp((time - s.at) / 400, 0, 1);
        grainSack(g, s.x, s.y - (1 - drop) * 60, 1.35, ((s.x * 7) | 0) % 3 === 0);
      }
      // The tower stump in the middle (the yard sees the mill from above: a round cap), then sails.
      g.fillStyle(0x000000, 0.25); g.fillEllipse(cx + 8, cy + 10, 96, 34);
      g.fillStyle(LIME_SHADE, 1); g.fillCircle(cx, cy - 8, 40);
      g.fillStyle(LIME, 1); g.fillCircle(cx - 4, cy - 12, 34);
      g.fillStyle(TAR, 1); g.fillEllipse(cx, cy - 20, 52, 30);
      sails(g, { x: cx, y: cy - 30, r: reach }, ang, 1, CANVAS, 0.75);
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(cx, cy - 30, 10);
      // Windsocks at the edges tell the gust before the banner does.
      const strength = gustAt >= 0 ? 1 : gustWarnAt >= 0 ? 0.8 : 0.3;
      for (const [x, y] of [[40, top + 60], [W - 40, top + 60], [40, H - 24], [W - 40, H - 24]] as [number, number][]) windsock(g, x, y, time / 1000, strength, 0);
    },

    drawHud(g, time) {
      // The mill's speed as a little sail-wheel and a gauge.
      const x = 44, y = top + 32;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 22);
      sails(g, { x, y, r: 18 }, ang, 1, CANVAS, 0.8);
      const k = clamp((speed - IDLE_SPEED) / (GUST_SPEED - IDLE_SPEED), 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillRect(x + 28, y - 4, 64, 8);
      g.fillStyle(k > 0.6 ? 0xe8642a : 0xd8b46a, 1); g.fillRect(x + 29, y - 3, 62 * k, 6);
      if (gustWarnAt >= 0 && Math.floor(time / 120) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.9); g.strokeRect(x + 27, y - 5, 66, 10); }
    },
  };
}

export const WINDMILL: GimmickDef = {
  id: 'galeward-windmill',
  rules: 'The great mill\'s four sails sweep the yard (10, knockback) — quiet under the tower and past the tips. Gusts speed them up. Shelter behind a grain sack and the sail splits the sack instead; burst flour slows you.',
  make,
};
