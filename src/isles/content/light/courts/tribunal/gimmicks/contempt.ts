import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { lawStone } from '../art';
import { GOLD, GOLD_LIT, ROBE, ROBE_DARK, SUN_HOT, WAX } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Contempt of Court — Marshal Banish.
 *
 * Ten law-stones stand in a ring, a cordon of light strung between them: the bounds of the court.
 * Outside them you are in contempt — silenced (basic attacks only) until you step back in. The
 * ring wanders across the floor and slowly draws in, then the Marshal relays it wide and it begins
 * again.
 *
 * Banish is a magnet, and the stones are his lodestones: every few seconds the outer band of the
 * ring glows and then *repels*, throwing anyone standing in it outward — out of bounds, if they are
 * near the edge. Keep to the middle when the band glows. The stones are real things, though: strike
 * one and the whole ring is shoved away from it. Shove the bounds off the Marshal and he is the one
 * silenced.
 */

const N_STONES = 10;
const SHOVE = 52;
const PULSE_WARN = 1100;
const PULSE_PUSH = 120;
const PULSE_DMG = 6;
const BAND = 0.62;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2;
  const R0 = 300;
  const RMIN = ctx.hard ? 150 : 170;
  const SHRINK_S = ctx.hard ? 20 : 24;
  let cx = W / 2, cy = midY;
  let R = R0;
  let goal = { x: cx, y: cy };
  let nextGoal = 0;
  let shoveX = 0, shoveY = 0;
  let spin = 0;
  const pulseEvery = ctx.hard ? 7500 : 9000;
  let nextPulse = ctx.scene.time.now + pulseEvery;
  let pulseWarnAt = -1;
  let pulseAt = -9999;
  /** Pushes in progress, spread over a few frames so the throw reads as a throw. */
  const pushes: { f: Fighter; dx: number; dy: number; left: number }[] = [];
  const contempt = new Map<Fighter, { out: boolean; since: number; tick: number }>([[player, { out: false, since: 0, tick: 0 }], [npc, { out: false, since: 0, tick: 0 }]]);
  const stones: { t: StrikeTarget; i: number; hitAt: number }[] = [];
  const stoneAt = (i: number) => {
    const a = (i / N_STONES) * Math.PI * 2 + spin;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.86 };
  };
  const inside = (f: Fighter) => {
    const dx = (f.x - cx) / R, dy = (f.y - cy) / (R * 0.86);
    return Math.hypot(dx, dy);
  };

  for (let i = 0; i < N_STONES; i++) {
    const p = stoneAt(i);
    const entry = { t: null as unknown as StrikeTarget, i, hitAt: -9999 };
    entry.t = ctx.target({
      x: p.x, y: p.y, r: 18,
      onStruck: () => {
        // The ring is shoved away from the stone that was struck.
        const s = stoneAt(entry.i);
        const a = Math.atan2(cy - s.y, cx - s.x);
        shoveX += Math.cos(a) * SHOVE; shoveY += Math.sin(a) * SHOVE;
        entry.hitAt = ctx.scene.time.now;
        ctx.sfx('magnet-pull');
      },
    });
    stones.push(entry);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // The bounds draw in, then are relaid wide.
      R -= ((R0 - RMIN) / SHRINK_S) * dt;
      if (R <= RMIN) { R = R0; ctx.banner('THE BOUNDS ARE RELAID', '#e8c860'); ctx.sfx('stone-rise'); }
      // Wander toward a goal that changes now and then; shoves land on top.
      if (time >= nextGoal) {
        nextGoal = time + 6000;
        goal = { x: 220 + rng() * (W - 440), y: top + 170 + rng() * (H - top - 300) };
      }
      const gd = dist(cx, cy, goal.x, goal.y);
      if (gd > 2) { const sp = Math.min(gd, 34 * dt); cx += ((goal.x - cx) / gd) * sp; cy += ((goal.y - cy) / gd) * sp; }
      const k = Math.min(1, dt * 5);
      cx += shoveX * k; cy += shoveY * k; shoveX -= shoveX * k; shoveY -= shoveY * k;
      cx = clamp(cx, 140, W - 140); cy = clamp(cy, top + 130, H - 110);
      spin += dt * 0.12;
      for (const s of stones) { const p = stoneAt(s.i); s.t.moveTo(p.x, p.y); }

      // Contempt: silenced while out of bounds.
      for (const [f, c] of contempt) {
        if (!alive(f)) continue;
        const out = inside(f) > 1;
        if (out && !c.out) { c.since = time; ctx.float(f.x, f.y - 50, 'IN CONTEMPT', '#ff9a8a'); ctx.sfx('status-debuff'); }
        c.out = out;
        if (out && time >= c.tick) { c.tick = time + 300; ctx.silence(f, 420); }
      }

      // The Marshal's pulse: the outer band repels.
      if (pulseWarnAt < 0 && time >= nextPulse - PULSE_WARN) { pulseWarnAt = time; ctx.banner('BANISH!', '#ff9a8a'); ctx.sfx('electric-charge'); }
      if (time >= nextPulse) {
        nextPulse = time + pulseEvery;
        pulseWarnAt = -1;
        pulseAt = time;
        ctx.sfx('magnet-pull');
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const r = inside(f);
          if (r < BAND || r > 1.25) continue;
          const a = Math.atan2(f.y - cy, f.x - cx);
          pushes.push({ f, dx: Math.cos(a) * PULSE_PUSH, dy: Math.sin(a) * PULSE_PUSH, left: 6 });
          ctx.hit(f, ctx.hard ? PULSE_DMG + 2 : PULSE_DMG, f.x, f.y);
        }
      }
      for (let i = pushes.length - 1; i >= 0; i--) {
        const p = pushes[i];
        ctx.nudge(p.f, p.dx / 6, p.dy / 6);
        if (--p.left <= 0) pushes.splice(i, 1);
      }
    },

    npcSeek() {
      // Inside the bounds, toward you but never in the outer band when it is about to repel.
      const a = Math.atan2(player.y - cy, player.x - cx);
      const frac = pulseWarnAt >= 0 ? 0.25 : 0.45;
      return { x: cx + Math.cos(a) * R * frac, y: cy + Math.sin(a) * R * 0.86 * frac };
    },

    drawGround(g, time) {
      // Outside the bounds: a hatching of court purple over the floor.
      for (let y = top + 10; y < H; y += 34) {
        for (let x = 10; x < W; x += 34) {
          const r = Math.hypot((x - cx) / R, (y - cy) / (R * 0.86));
          if (r < 1.02) continue;
          g.lineStyle(2, ROBE, 0.22); g.lineBetween(x, y + 10, x + 10, y);
        }
      }
      // The ring itself, pale gold on the floor.
      g.lineStyle(3, GOLD, 0.45); g.strokeEllipse(cx, cy, R * 2, R * 1.72);
      // The band, while it warns: a magnet-red wash that brightens.
      if (pulseWarnAt >= 0) {
        const k = clamp((time - pulseWarnAt) / PULSE_WARN, 0, 1);
        for (let i = 0; i < 6; i++) {
          const rr = BAND + ((1 - BAND) * i) / 5;
          g.lineStyle(10, WAX, (0.08 + k * 0.18) * (Math.sin(time / 60 + i) * 0.3 + 0.7)); g.strokeEllipse(cx, cy, R * 2 * rr, R * 1.72 * rr);
        }
        g.lineStyle(2, GOLD_LIT, 0.5 + k * 0.5); g.strokeEllipse(cx, cy, R * 2 * BAND, R * 1.72 * BAND);
      }
      // The pulse wave going out.
      const pk = clamp((time - pulseAt) / 400, 0, 1);
      if (pk < 1) { g.lineStyle(6 * (1 - pk), WAX, 1 - pk); g.strokeEllipse(cx, cy, R * 2 * (BAND + pk * 0.6), R * 1.72 * (BAND + pk * 0.6)); }
      // The Marshal's lodestone at the centre: a dark seal let into the floor.
      g.fillStyle(ROBE_DARK, 0.5); g.fillCircle(cx, cy, 16);
      g.lineStyle(2, GOLD, 0.7); g.strokeCircle(cx, cy, 16);
    },

    drawAir(g, time) {
      // The cordon of light between the stones, then the stones.
      for (let i = 0; i < N_STONES; i++) {
        const a = stoneAt(i), b = stoneAt((i + 1) % N_STONES);
        const sag = 6 + Math.sin(time / 300 + i) * 2;
        g.lineStyle(3, SUN_HOT, 0.25);
        g.beginPath(); g.moveTo(a.x, a.y - 30);
        for (let k = 1; k <= 6; k++) { const t = k / 6; g.lineTo(a.x + (b.x - a.x) * t, a.y - 30 + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag); }
        g.strokePath();
        g.lineStyle(1.2, GOLD_LIT, 0.8);
        g.beginPath(); g.moveTo(a.x, a.y - 30);
        for (let k = 1; k <= 6; k++) { const t = k / 6; g.lineTo(a.x + (b.x - a.x) * t, a.y - 30 + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag); }
        g.strokePath();
      }
      for (const s of stones) {
        const p = stoneAt(s.i);
        const hit = clamp(1 - (time - s.hitAt) / 400, 0, 1);
        const warn = pulseWarnAt >= 0 ? clamp((time - pulseWarnAt) / PULSE_WARN, 0, 1) : 0;
        lawStone(g, p.x + hit * Math.cos(Math.atan2(p.y - cy, p.x - cx)) * 6, p.y, 1.1, 0.4 + warn * 0.6, warn > 0 ? WAX : GOLD);
        if (hit > 0) glow(g, p.x, p.y - 26, 20, GOLD_LIT, 0.1 * hit, 2);
      }
      // A wax seal of contempt over anyone out of bounds.
      for (const [f, c] of contempt) {
        if (!c.out || !alive(f)) continue;
        const bob = Math.sin(time / 140) * 2;
        g.fillStyle(WAX, 0.95); g.fillCircle(f.x, f.y - 58 + bob, 9);
        g.lineStyle(2, 0x6a0e14, 1); g.strokeCircle(f.x, f.y - 58 + bob, 6);
        g.lineStyle(2, 0xffe0d0, 0.9); g.lineBetween(f.x - 4, f.y - 62 + bob, f.x + 4, f.y - 54 + bob);
      }
    },

    destroy() { for (const s of stones) s.t.remove(); },
  };
}

export const CONTEMPT: GimmickDef = {
  id: 'tribunal-contempt',
  rules: 'A ring of law-stones marks the bounds; outside it you are silenced. It drifts and shrinks, and its outer band repels. Strike a stone to shove the ring away from it.',
  make,
};
