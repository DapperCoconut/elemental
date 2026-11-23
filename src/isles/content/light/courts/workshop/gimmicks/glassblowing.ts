import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit, mixC } from '../../../../../art/IsleArt';
import {
  COPPER_DARK, GLASS, GLASS_EDGE, GLASS_LIT, HEAT_WHITE, IRON_DARK, IRON_LIT, MOLTEN, MOLTEN_DARK, MOLTEN_LIT, SOOT,
} from '../palette';
import { alive, clamp, dist, lerp, stepDt } from '../util';

/**
 * Glassblowing — Gaffer Molten.
 *
 * Molten works the floor like his bench. Every few seconds a gather of glass swells on the end of
 * his blowpipe (or in the glory hole of the furnace behind the floor) and he blows it out as a
 * bubble that drifts off across the room, orange and wobbling. In a few seconds it cools and
 * hardens into a clear glass orb.
 *
 * A **soft** bubble struck — or walked into — bursts in a splash of molten glass: it scalds whoever
 * is close and leaves a puddle that keeps burning. A **hard** orb struck shatters in a ring of
 * flying shards that cut whoever they reach, either side. Old orbs crack on their own. Molten
 * steers his bubbles at you; shatter them on him instead.
 */

interface Bubble {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  born: number;
  seed: number;
  target: StrikeTarget | null;
  dead: boolean;
}

interface Puddle { x: number; y: number; r: number; until: number; born: number; lastTick: Map<Fighter, number> }

interface Gather { from: 'pipe' | 'furnace'; at: number }

const HARDEN_MS = 4000;
const CRACK_MS = 17000;
const GATHER_MS = 800;
const MAX_BUBBLES = 7;
const SHARDS = 10;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const furnace: Pt = { x: W / 2, y: top + 34 };
  const bubbles: Bubble[] = [];
  const puddles: Puddle[] = [];
  const bursts: { x: number; y: number; at: number; hard: boolean }[] = [];
  let gather: Gather | null = null;
  let nextGather = 0;
  let fromPipe = true;
  let started = false;
  const every = ctx.hard ? 2200 : 2700;
  const SPLASH_DMG = ctx.hard ? 13 : 11;
  const SHARD_DMG = ctx.hard ? 10 : 9;

  const isHard = (b: Bubble, time: number) => time - b.born >= HARDEN_MS;
  const sourceOf = (g: Gather): Pt => (g.from === 'pipe' && alive(npc) ? { x: npc.x + 26, y: npc.y - 30 } : { x: furnace.x, y: furnace.y + 26 });

  function blow(g: Gather, time: number): void {
    const s = sourceOf(g);
    // Aimed loosely toward the stranger, so bubbles end up round you.
    const aim = Math.atan2(player.y - s.y, player.x - s.x) + (rng() - 0.5) * 0.9;
    const speed = 70 + rng() * 30;
    const b: Bubble = {
      x: s.x, y: s.y, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, r: 20 + rng() * 6, born: time, seed: rng() * 10, dead: false,
      target: null,
    };
    b.target = ctx.target({ x: b.x, y: b.y, r: b.r, onStruck: () => pop(b, ctx.scene.time.now) });
    bubbles.push(b);
    ctx.sfx('bubble');
  }

  function pop(b: Bubble, time: number): void {
    if (b.dead) return;
    b.dead = true;
    b.target?.remove();
    const hard = isHard(b, time);
    bursts.push({ x: b.x, y: b.y, at: time, hard });
    if (hard) {
      // A ring of shards, either side.
      const off = rng() * Math.PI;
      for (let i = 0; i < SHARDS; i++) {
        const a = off + (i / SHARDS) * Math.PI * 2;
        tk.spawnBullet({ x: b.x, y: b.y, angle: a, speed: 320, damage: SHARD_DMG, r: 4, color: 0xe8fbff, lifeMs: 900, hits: [player, npc] });
      }
      ctx.sfx('crystal-shatter');
    } else {
      // A splash of molten glass: scalds whoever is close, then burns on the floor.
      for (const f of [player, npc]) {
        if (alive(f) && dist(f.x, f.y, b.x, b.y) < b.r + 56) ctx.hit(f, SPLASH_DMG, f.x, f.y);
      }
      puddles.push({ x: b.x, y: b.y, r: b.r + 28, until: time + 4200, born: time, lastTick: new Map() });
      ctx.sfx('sizzle');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextGather = time + 900; }
      // The gather swells, then is blown.
      if (!gather && time >= nextGather && bubbles.length < MAX_BUBBLES) {
        gather = { from: fromPipe ? 'pipe' : 'furnace', at: time };
        fromPipe = !fromPipe;
        ctx.sfx('sizzle');
      }
      if (gather && time - gather.at >= GATHER_MS) {
        blow(gather, time);
        gather = null;
        nextGather = time + every;
      }
      for (const b of bubbles) {
        if (b.dead) continue;
        const hard = isHard(b, time);
        // Soft bubbles drift and wobble; hardened ones slow to a stop and sit.
        const drag = hard ? 2.2 : 0.25;
        b.vx -= b.vx * Math.min(1, drag * dt);
        b.vy -= b.vy * Math.min(1, drag * dt);
        b.x += (b.vx + (hard ? 0 : Math.sin(time / 500 + b.seed) * 14)) * dt;
        b.y += (b.vy + (hard ? 0 : Math.cos(time / 620 + b.seed) * 10)) * dt;
        if (b.x < 50 || b.x > W - 50) { b.vx = -b.vx; b.x = clamp(b.x, 50, W - 50); }
        if (b.y < top + 50 || b.y > H - 40) { b.vy = -b.vy; b.y = clamp(b.y, top + 50, H - 40); }
        b.target?.moveTo(b.x, b.y);
        // A soft one walked into bursts on whoever walked into it.
        if (!hard) {
          for (const f of [player, npc]) {
            if (alive(f) && dist(f.x, f.y, b.x, b.y) < b.r + 14) { pop(b, time); break; }
          }
        } else if (time - b.born >= CRACK_MS) {
          ctx.float(b.x, b.y - b.r - 10, 'crack…', '#e8fbff');
          pop(b, time);
        }
      }
      for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].dead) bubbles.splice(i, 1);
      // Puddles of molten glass burn whoever stands in them.
      for (let i = puddles.length - 1; i >= 0; i--) {
        const p = puddles[i];
        if (time >= p.until) { puddles.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > p.r) continue;
          const last = p.lastTick.get(f) ?? 0;
          if (time - last >= 500) { p.lastTick.set(f, time); ctx.hit(f, 4, f.x, f.y); }
        }
      }
      while (bursts.length && time - bursts[0].at > 700) bursts.shift();
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Put a hard orb between himself and the stranger, close to the stranger: the shards go your way.
      let best: Pt | null = null;
      let bs = Infinity;
      for (const b of bubbles) {
        if (b.dead || !isHard(b, now)) continue;
        const dp = dist(player.x, player.y, b.x, b.y);
        if (dp > 260) continue;
        const a = Math.atan2(b.y - player.y, b.x - player.x);
        const spot = { x: clamp(b.x + Math.cos(a) * 150, 60, W - 60), y: clamp(b.y + Math.sin(a) * 150, top + 50, H - 40) };
        const s = dp + dist(npc.x, npc.y, spot.x, spot.y) * 0.5;
        if (s < bs) { bs = s; best = spot; }
      }
      let t = best ?? { x: clamp(player.x + (player.x < W / 2 ? 260 : -260), 60, W - 60), y: clamp(player.y - 40, top + 50, H - 40) };
      // Never stand in his own puddles or next to a soft bubble.
      for (const p of puddles) if (dist(t.x, t.y, p.x, p.y) < p.r + 30) t = { x: clamp(t.x + (t.x - p.x), 60, W - 60), y: clamp(t.y + (t.y - p.y), top + 50, H - 40) };
      for (const b of bubbles) if (!isHard(b, now) && dist(t.x, t.y, b.x, b.y) < b.r + 60) t = { x: clamp(lerp(t.x, 2 * t.x - b.x, 0.8), 60, W - 60), y: clamp(lerp(t.y, 2 * t.y - b.y, 0.8), top + 50, H - 40) };
      return t;
    },

    drawGround(g, time) {
      // Puddles of molten glass, cooling from cherry to a dark crust at the rim.
      for (const p of puddles) {
        const life = clamp((p.until - time) / 4200, 0, 1);
        const grow = clamp((time - p.born) / 200, 0, 1);
        g.fillStyle(MOLTEN_DARK, 0.75 * life + 0.1); g.fillEllipse(p.x, p.y, p.r * 2 * grow, p.r * 1.4 * grow);
        g.fillStyle(MOLTEN, 0.7 * life); g.fillEllipse(p.x, p.y, p.r * 1.6 * grow, p.r * 1.05 * grow);
        g.fillStyle(MOLTEN_LIT, 0.6 * life); g.fillEllipse(p.x - p.r * 0.15, p.y - p.r * 0.1, p.r * 0.7, p.r * 0.35);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3 + p.born;
          const ph = ((time / 700) + i * 0.2) % 1;
          g.fillStyle(HEAT_WHITE, 0.5 * life * (1 - ph)); g.fillCircle(p.x + Math.cos(a) * p.r * 0.5, p.y + Math.sin(a) * p.r * 0.3 - ph * 12, 2);
        }
      }
      // Bubble shadows: crisp and small — the sun is straight overhead.
      for (const b of bubbles) { g.fillStyle(0x000000, 0.16); g.fillEllipse(b.x, b.y + b.r + 10, b.r * 1.3, b.r * 0.4); }
      // The furnace behind the floor (half under the HUD).
      g.fillStyle(COPPER_DARK, 1); g.fillEllipse(furnace.x, furnace.y + 6, 140, 70);
      g.fillStyle(mixC(COPPER_DARK, SOOT, 0.4), 1); g.fillEllipse(furnace.x, furnace.y, 120, 56);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(furnace.x, furnace.y + 14, 18);
      g.fillStyle(MOLTEN, 1); g.fillCircle(furnace.x, furnace.y + 14, 13);
      g.fillStyle(HEAT_WHITE, 0.8 + Math.sin(time / 90) * 0.15); g.fillCircle(furnace.x, furnace.y + 14, 6);
    },

    drawAir(g, time) {
      // The swelling gather.
      if (gather) {
        const s = sourceOf(gather);
        const k = clamp((time - gather.at) / GATHER_MS, 0, 1);
        if (gather.from === 'pipe' && alive(npc)) {
          g.lineStyle(3, IRON_DARK, 1); g.lineBetween(npc.x + 4, npc.y - 14, s.x, s.y);
          g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(npc.x + 4, npc.y - 15, s.x, s.y - 1);
        }
        glow(g, s.x, s.y, 14 + k * 22, MOLTEN, 0.08, 3);
        g.fillStyle(MOLTEN, 0.95); g.fillCircle(s.x, s.y, 5 + k * 14);
        g.fillStyle(MOLTEN_LIT, 0.9); g.fillCircle(s.x - 2, s.y - 2, 3 + k * 7);
        g.lineStyle(1.5, HEAT_WHITE, 0.6); g.strokeCircle(s.x, s.y, 5 + k * 14);
      }
      for (const b of bubbles) {
        const age = time - b.born;
        const cool = clamp(age / HARDEN_MS, 0, 1);
        const wob = cool < 1 ? Math.sin(time / 120 + b.seed) * 2.5 * (1 - cool) : 0;
        if (cool < 1) {
          // Soft: glowing orange glass, a skin of heat cooling toward clear from the outside in.
          const c = mixC(MOLTEN, GLASS, cool * 0.7);
          glow(g, b.x, b.y, b.r + 10, MOLTEN, 0.05 * (1 - cool), 2);
          g.fillStyle(c, 0.55 + 0.25 * (1 - cool)); g.fillEllipse(b.x, b.y, (b.r + wob) * 2, (b.r - wob) * 2);
          g.fillStyle(MOLTEN_LIT, 0.6 * (1 - cool)); g.fillEllipse(b.x, b.y + b.r * 0.3, b.r * 1.1, b.r * 0.6);
          g.lineStyle(2, lit(c, 0.3), 0.8); g.strokeEllipse(b.x, b.y, (b.r + wob) * 2, (b.r - wob) * 2);
          g.fillStyle(HEAT_WHITE, 0.7); g.fillEllipse(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.5, b.r * 0.25);
          // The cooling ring: how long until it hardens.
          g.lineStyle(1.5, MOLTEN_LIT, 0.6);
          g.beginPath(); g.arc(b.x, b.y, b.r + 6, -Math.PI / 2, -Math.PI / 2 + cool * Math.PI * 2, false); g.strokePath();
        } else {
          // Hard: a clear orb with a bright window reflection and a caustic dot beneath.
          const old = clamp((age - HARDEN_MS) / (CRACK_MS - HARDEN_MS), 0, 1);
          g.fillStyle(GLASS, 0.35); g.fillCircle(b.x, b.y, b.r);
          g.fillStyle(GLASS_EDGE, 0.35); g.fillCircle(b.x + b.r * 0.2, b.y + b.r * 0.25, b.r * 0.75);
          g.lineStyle(2, GLASS_LIT, 0.9); g.strokeCircle(b.x, b.y, b.r);
          g.fillStyle(GLASS_LIT, 0.85); g.fillRect(b.x - b.r * 0.5, b.y - b.r * 0.55, b.r * 0.25, b.r * 0.3);
          g.fillRect(b.x - b.r * 0.2, b.y - b.r * 0.55, b.r * 0.25, b.r * 0.3);
          g.fillStyle(0xfff4c0, 0.8); g.fillCircle(b.x + b.r * 0.1, b.y + b.r + 9, 2.5);
          // The punty scar where it came off the pipe.
          g.fillStyle(GLASS_EDGE, 0.8); g.fillCircle(b.x + b.r * 0.6, b.y + b.r * 0.55, 2.5);
          // Strain cracks spreading as it ages toward cracking itself.
          if (old > 0.55) {
            const n = Math.floor((old - 0.55) * 14);
            g.lineStyle(1, 0xffffff, 0.8);
            for (let i = 0; i < n; i++) {
              const a = b.seed + i * 1.9;
              g.lineBetween(b.x + Math.cos(a) * b.r * 0.2, b.y + Math.sin(a) * b.r * 0.2, b.x + Math.cos(a + 0.3) * b.r * 0.95, b.y + Math.sin(a + 0.3) * b.r * 0.95);
            }
          }
        }
      }
      for (const e of bursts) {
        const k = clamp((time - e.at) / 700, 0, 1);
        if (e.hard) {
          g.lineStyle(2, GLASS_LIT, 1 - k); g.strokeCircle(e.x, e.y, 20 + k * 80);
          for (let i = 0; i < 12; i++) {
            const a = i * 0.52 + e.x;
            const d = 10 + k * 60;
            g.fillStyle(GLASS_LIT, 1 - k);
            g.fillTriangle(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, e.x + Math.cos(a + 0.12) * (d + 8), e.y + Math.sin(a + 0.12) * (d + 8), e.x + Math.cos(a - 0.1) * (d + 5), e.y + Math.sin(a - 0.1) * (d + 5));
          }
        } else {
          g.fillStyle(MOLTEN_LIT, 0.8 * (1 - k)); g.fillCircle(e.x, e.y, 16 + k * 54);
          for (let i = 0; i < 10; i++) {
            const a = i * 0.63 + e.y;
            g.fillStyle(MOLTEN, 1 - k); g.fillCircle(e.x + Math.cos(a) * k * 70, e.y + Math.sin(a) * k * 50 + k * k * 30, 4 * (1 - k) + 1);
          }
        }
      }
    },

    destroy() { for (const b of bubbles) b.target?.remove(); },
  };
}

export const GLASSBLOWING_GIMMICK: GimmickDef = {
  id: 'workshop-glassblowing',
  rules: 'Molten blows bubbles of glass that drift and harden. Strike a soft one: a splash of molten glass. Strike a hard orb: it shatters in a ring of shards that cut either side.',
  make,
};
