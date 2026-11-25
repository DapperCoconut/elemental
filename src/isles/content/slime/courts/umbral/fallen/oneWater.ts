import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { FUNGUS, MERE, MERE_LIT, MERE_SHEEN, MOON, MOON_DIM, STONE, STONE_DARK, STONE_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * One Black Water — Mere-Warden Isaura Dunlin, keeper of the Shadow Mere's wells. Umbral's people say
 * the mere has no bottom and only one surface: every well, puddle and bucket in the court is the same
 * black water showing through. In the King's telling the Warden used that to listen at every house.
 *
 * Three well-mouths stand open in the yard, and they are one water, flowing one way round (the
 * current is drawn between them). **A shot that falls into a mouth comes out of the next one, on the
 * same heading** — so a shot can be posted round a corner. Dunlin skims stones into the mouth beside
 * her and they leap out of the next at you: that mouth wells and shows its aim first. Strike a mouth
 * and the next one spits at your foe. Wading is slow. Past half the current turns the other way round
 * and the mouths drift about the yard.
 */

const ID = fallenId('umbral', 'one-water');
const MOUTH_R = 40;
const SKIM_MS = 2700;
const SKIM_LATE = 2100;
const WELL_MS = 850;
const ARC_MS = 480;

interface Mouth { x: number; y: number; target: StrikeTarget | null; struckAt: number; spitAt: number; gulpAt: number; seed: number }
interface Skim { from: number; to: number; sx: number; sy: number; at: number; fireAt: number; angle: number; locked: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const RING = 190;
  const side: Record<'player' | 'npc', Fighter> = { player, npc };
  const foeOf = (f: Fighter): Fighter => (f === player ? npc : player);
  let spin = -Math.PI / 2;
  let dir = 1;
  let late = false;
  let started = false;
  let nextSkim = 0;
  const skims: Skim[] = [];
  const mouths: Mouth[] = [0, 1, 2].map((i) => ({ x: 0, y: 0, target: null, struckAt: -1e9, spitAt: -1e9, gulpAt: -1e9, seed: i * 2.3 }));
  const next = (i: number) => (i + dir + 3) % 3;

  function place(): void {
    mouths.forEach((m, i) => {
      const a = spin + (i * Math.PI * 2) / 3;
      m.x = cx + Math.cos(a) * RING; m.y = cy + Math.sin(a) * RING * 0.78;
      m.target?.moveTo(m.x, m.y);
    });
  }

  /** Water leaps out of mouth `i` on `angle`, at whoever `hits` names. */
  function spout(i: number, angle: number, damage: number, hits: Fighter, speed: number, time: number): void {
    const m = mouths[i];
    m.spitAt = time;
    tk.spawnBullet({
      x: m.x + Math.cos(angle) * (MOUTH_R + 6), y: m.y + Math.sin(angle) * (MOUTH_R + 6),
      angle, speed, damage, r: 7, color: MERE_LIT, lifeMs: 2600, hits: [hits],
    });
    ctx.sfx('splash');
  }

  const nearestMouth = (x: number, y: number) => {
    let bi = 0, bd = 1e9;
    mouths.forEach((m, i) => { const d = dist(x, y, m.x, m.y); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  return {
    update(time, dtRaw) {
      const dt = Math.min(dtRaw, 0.1);
      if (!started) {
        started = true;
        place();
        mouths.forEach((m, i) => {
          m.target = ctx.target({
            x: m.x, y: m.y, r: 26,
            onStruck: (by, amount) => {
              const t = tk.now;
              if (t - m.struckAt < 600) return;
              m.struckAt = t;
              const striker = side[by];
              const foe = foeOf(striker);
              const o = next(i);
              spout(o, Math.atan2(foe.y - mouths[o].y, foe.x - mouths[o].x), clamp(Math.round(amount * 0.8), 8, 24), foe, 420, t);
            },
          });
        });
        nextSkim = time + 2400;
      }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        dir = -1;
        ctx.banner('THE CURRENT TURNS', '#c8d8ff');
        ctx.sfx('geyser');
      }
      if (late) { spin += dt * 0.16; place(); }

      // One water: whatever shot falls in here comes out of the next mouth on.
      mouths.forEach((m, i) => {
        for (const shot of ctx.shotsNear(m.x, m.y, MOUTH_R)) {
          const owner = side[shot.owner];
          const angle = Math.atan2(shot.y - owner.y, shot.x - owner.x);
          shot.block();
          m.gulpAt = time;
          spout(next(i), angle, Math.max(6, Math.round(shot.damage)), foeOf(owner), 420, time);
        }
      });

      // Dunlin skims a stone into the mouth by her; it leaps from the next at you.
      if (time >= nextSkim && alive(npc) && alive(player)) {
        nextSkim = time + (late ? SKIM_LATE : SKIM_MS);
        const from = nearestMouth(npc.x, npc.y);
        skims.push({ from, to: next(from), sx: npc.x, sy: npc.y - 20, at: time, fireAt: time + ARC_MS + tk.warn(WELL_MS), angle: 0, locked: false });
        ctx.sfx('rock-throw');
      }
      for (let k = skims.length - 1; k >= 0; k--) {
        const s = skims[k];
        const o = mouths[s.to];
        if (time - s.at > ARC_MS && mouths[s.from].gulpAt < s.at + ARC_MS) { mouths[s.from].gulpAt = time; ctx.sfx('bubble'); }
        if (!s.locked) {
          s.angle = Math.atan2(player.y - o.y, player.x - o.x);
          if (s.fireAt - time < 260) s.locked = true;
        }
        if (time >= s.fireAt) {
          skims.splice(k, 1);
          spout(s.to, s.angle, 12, player, 330, time);
        }
      }
    },

    playerSpeedMult() { return mouths.some((m) => dist(player.x, player.y, m.x, m.y) < MOUTH_R) ? 0.65 : 1; },
    npcSpeedMult() { return mouths.some((m) => dist(npc.x, npc.y, m.x, m.y) < MOUTH_R) ? 0.65 : 1; },

    npcSeek() {
      // Stand behind the mouth that flows into the one nearest you, so her stones come out at your feet.
      const near = nearestMouth(player.x, player.y);
      const feed = mouths.findIndex((_, i) => next(i) === near);
      const m = mouths[feed < 0 ? 0 : feed];
      const a = Math.atan2(m.y - player.y, m.x - player.x);
      return { x: tk.clampX(m.x + Math.cos(a) * 80), y: tk.clampY(m.y + Math.sin(a) * 80) };
    },

    drawGround(g, time) {
      // The current between the mouths: a dotted run of ripples flowing the way the water goes.
      mouths.forEach((m, i) => {
        const o = mouths[next(i)];
        const a = Math.atan2(o.y - m.y, o.x - m.x);
        const d = dist(m.x, m.y, o.x, o.y) - MOUTH_R * 2 - 20;
        const sx = m.x + Math.cos(a) * (MOUTH_R + 10), sy = m.y + Math.sin(a) * (MOUTH_R + 10);
        const bow = 26;
        for (let j = 0; j < 10; j++) {
          const k = ((j / 10 + time / 3000) % 1);
          const px = sx + Math.cos(a) * d * k - Math.sin(a) * Math.sin(k * Math.PI) * bow;
          const py = sy + Math.sin(a) * d * k + Math.cos(a) * Math.sin(k * Math.PI) * bow;
          g.lineStyle(1.5, MERE_SHEEN, 0.5 * Math.sin(k * Math.PI));
          g.lineBetween(px - Math.cos(a) * 5, py - Math.sin(a) * 5, px + Math.cos(a) * 5, py + Math.sin(a) * 5);
        }
        const ax = sx + Math.cos(a) * d * 0.5 - Math.sin(a) * bow, ay = sy + Math.sin(a) * d * 0.5 + Math.cos(a) * bow;
        g.fillStyle(MERE_LIT, 0.55);
        g.fillTriangle(ax + Math.cos(a) * 9, ay + Math.sin(a) * 9, ax - Math.sin(a) * 6, ay + Math.cos(a) * 6, ax + Math.sin(a) * 6, ay - Math.cos(a) * 6);
      });
      mouths.forEach((m) => drawMouth(g, m, time));
      for (const s of skims) {
        const o = mouths[s.to];
        if (time - s.at < ARC_MS) continue;
        const k = clamp(1 - (s.fireAt - time) / tk.warn(WELL_MS), 0, 1);
        // The outlet wells, and shows where it will throw.
        g.lineStyle(2, MOON, 0.3 + 0.6 * k);
        g.strokeCircle(o.x, o.y, MOUTH_R + 4 + Math.sin(time / 50) * 2 * k);
        const len = 120 + 260 * k;
        g.lineStyle(s.locked ? 3 : 1.5, MOON, s.locked ? 0.9 : 0.45);
        g.lineBetween(o.x + Math.cos(s.angle) * MOUTH_R, o.y + Math.sin(s.angle) * MOUTH_R, o.x + Math.cos(s.angle) * len, o.y + Math.sin(s.angle) * len);
      }
    },

    drawAir(g, time) {
      // The skimmed stone in flight, its shadow on the moss below.
      for (const s of skims) {
        const k = (time - s.at) / ARC_MS;
        if (k > 1) continue;
        const m = mouths[s.from];
        const x = s.sx + (m.x - s.sx) * k, y = s.sy + (m.y - s.sy) * k;
        const hop = Math.sin(k * Math.PI) * 40;
        shadow(g, x, y + 4, 12, 4, 0.4);
        g.fillStyle(STONE, 1); g.fillEllipse(x, y - hop, 11, 7);
        g.fillStyle(STONE_LIT, 1); g.fillEllipse(x - 2, y - hop - 1.5, 5, 2.5);
      }
      // Spouts: a column of black water leaping from a mouth.
      for (const m of mouths) {
        const k = (time - m.spitAt) / 420;
        if (k < 0 || k > 1) continue;
        for (let j = 0; j < 6; j++) {
          const a = j * 1.05 + m.seed;
          const h = Math.sin(k * Math.PI) * (40 + (j % 3) * 12);
          g.fillStyle(j % 2 ? MERE : MERE_SHEEN, 0.9 * (1 - k));
          g.fillCircle(m.x + Math.cos(a) * 12 * k, m.y - h, 5 - k * 2);
        }
        g.lineStyle(2, MERE_LIT, 1 - k); g.strokeEllipse(m.x, m.y, (MOUTH_R + 20 * k) * 2, (MOUTH_R + 20 * k) * 1.2);
      }
    },

    drawHud(g) {
      // A little chart of the three mouths and which way the water runs round them.
      const x = W / 2, y = top + 20;
      g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 18);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        g.fillStyle(MERE, 1); g.fillCircle(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 4);
        g.lineStyle(1, MOON_DIM, 1); g.strokeCircle(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 4);
        const b = a + dir * (Math.PI / 3);
        const tx = x + Math.cos(b) * 11, ty = y + Math.sin(b) * 11, ta = b + dir * Math.PI / 2;
        g.fillStyle(MOON, 0.9);
        g.fillTriangle(tx + Math.cos(ta) * 4, ty + Math.sin(ta) * 4, tx + Math.cos(ta + 2.4) * 3, ty + Math.sin(ta + 2.4) * 3, tx + Math.cos(ta - 2.4) * 3, ty + Math.sin(ta - 2.4) * 3);
      }
    },

    destroy() { for (const m of mouths) { m.target?.remove(); m.target = null; } },
  };
}

/** A well-mouth: a kerb of night-stone round black water, a violet skin of sheen, pale caps in the cracks. */
function drawMouth(g: G, m: Mouth, time: number): void {
  const { x, y } = m;
  const rx = MOUTH_R + 10, ry = (MOUTH_R + 10) * 0.62;
  shadow(g, x, y + 6, rx * 2.2, ry * 0.9, 0.35);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = x + Math.cos(a) * rx, sy = y + Math.sin(a) * ry;
    g.fillStyle(i % 3 ? STONE_DARK : STONE, 1); g.fillEllipse(sx, sy, 22, 13);
    g.fillStyle(STONE_LIT, 0.4); g.fillEllipse(sx - 3, sy - 3, 9, 4);
  }
  g.fillStyle(MERE, 1); g.fillEllipse(x, y, MOUTH_R * 2, MOUTH_R * 1.24);
  // The sheen: slow rings, and a quick gulp when something falls in.
  const gulp = clamp(1 - (time - m.gulpAt) / 500, 0, 1);
  for (let i = 0; i < 3; i++) {
    const k = ((time / 2200 + i / 3 + m.seed) % 1);
    g.lineStyle(1, MERE_SHEEN, 0.6 * (1 - k)); g.strokeEllipse(x, y, MOUTH_R * 2 * k, MOUTH_R * 1.24 * k);
  }
  if (gulp > 0) { g.fillStyle(0x000000, 0.8 * gulp); g.fillEllipse(x, y, MOUTH_R * 1.2 * gulp, MOUTH_R * 0.7 * gulp); }
  g.fillStyle(MERE_LIT, 0.25); g.fillEllipse(x - 10, y - 8, 22, 6);
  glow(g, x, y, MOUTH_R, MERE_SHEEN, 0.03, 2);
  // Ghost-caps in the kerb's cracks.
  for (let i = 0; i < 3; i++) {
    const a = m.seed + i * 2.1;
    const fx = x + Math.cos(a) * (rx + 6), fy = y + Math.sin(a) * (ry + 4);
    g.fillStyle(dim(FUNGUS, 0.2), 1); g.fillRect(fx - 1, fy - 5, 2, 5);
    g.fillStyle(FUNGUS, 1); g.fillEllipse(fx, fy - 6, 8, 4);
  }
  if (time - m.struckAt < 300) { g.lineStyle(2, MOON, 1 - (time - m.struckAt) / 300); g.strokeEllipse(x, y, rx * 2.3, ry * 2.3); }
}

export const FALLEN_ONE_WATER: GimmickDef = {
  id: ID,
  rules: 'The well-mouths are one water: a shot into one leaps out of the next, same heading. Her stones come out at you. Strike one: the next spits at him.',
  make,
};
