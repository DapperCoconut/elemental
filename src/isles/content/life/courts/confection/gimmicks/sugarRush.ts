import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { LEMON, PINK, SALT, SALT_DARK, SALT_LIT, SUGAR, SWEETS, dist, sugarCube } from '../art';

/**
 * Sugar Rush — Confectioner Praline's mill floor.
 *
 * Sugar cubes lie scattered over the floor of the Cube Store, fresh off the press. Walk over one
 * and you eat it: a burst of speed — and a stack of *crash*. The stacks drain slowly on their
 * own, one every few seconds you go without, but eat a third before they have and you crash
 * hard: flat on your back, seeing sweets, and soft as fudge for a while after you get up.
 *
 * Now and then a pinch of grey rock salt turns up among the cubes, swept in from the Saltcellar.
 * Salt is the cure: eating it takes a crash stack off you and gives no rush at all.
 *
 * Praline cannot leave a cube alone. He eats them whenever he is under two stacks, and reaches
 * for the salt when he is not — but he does not watch his feet. Walk him across the cubes at two
 * stacks and he crashes himself; or eat your own rush a stack short and hunt him while he
 * staggers.
 */

const MAX_CUBES = 6;
const MAX_CUBES_HARD = 7;
const START_CUBES = 4;
const SPAWN_MS = 2400;
const SALT_EVERY_MS = 9500;
const EAT_R = 28;
const RUSH_MS = 2600;
const RUSH_MULT = 1.45;
const RUSH_MULT_HARD_FOE = 1.55;
const DECAY_MS = 7000;
const CRASH_AT = 3;
const CRASH_STUN_MS = 1100;
const CRASH_STUN_HARD_MS = 1300;
const SLUMP_MS = 2400;
const SLUMP_TAKEN = 1.3;
const SLUMP_SPEED = 0.72;

interface Cube { x: number; y: number; bornAt: number; salt: boolean; seed: number }

interface Rusher {
  stacks: number;
  rushUntil: number;
  lastEat: number;
  crashAt: number;
  slumpUntil: number;
  trail: { x: number; y: number; at: number }[];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const maxCubes = ctx.hard ? MAX_CUBES_HARD : MAX_CUBES;
  const stunMs = ctx.hard ? CRASH_STUN_HARD_MS : CRASH_STUN_MS;

  let cubes: Cube[] = [];
  let nextSpawn = SPAWN_MS;
  let nextSalt = SALT_EVERY_MS * 0.6;
  let announced = false;
  const crumbs: { x: number; y: number; at: number; color: number }[] = [];
  const state = new Map<Fighter, Rusher>();
  const rusher = (f: Fighter): Rusher => {
    let r = state.get(f);
    if (!r) { r = { stacks: 0, rushUntil: 0, lastEat: -99999, crashAt: -99999, slumpUntil: 0, trail: [] }; state.set(f, r); }
    return r;
  };

  /** A spot on the floor clear of both fighters and of other cubes. */
  const spot = (): Pt => {
    let best: Pt = { x: W / 2, y: (H + top) / 2 };
    let bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const p = { x: 70 + rng() * (W - 140), y: top + 50 + rng() * (H - top - 100) };
      const near = Math.min(dist(p.x, p.y, ctx.player.x, ctx.player.y), dist(p.x, p.y, ctx.npc.x, ctx.npc.y));
      const crowd = cubes.reduce((m, c) => Math.min(m, dist(p.x, p.y, c.x, c.y)), 999);
      const score = Math.min(near, 220) + Math.min(crowd, 140) + rng() * 40;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  };
  for (let i = 0; i < START_CUBES; i++) { const p = spot(); cubes.push({ x: p.x, y: p.y, bornAt: 0, salt: false, seed: rng() * 10 }); }

  const crash = (f: Fighter, time: number): void => {
    const r = rusher(f);
    r.stacks = 0;
    r.rushUntil = 0;
    r.crashAt = time;
    r.slumpUntil = time + stunMs + SLUMP_MS;
    ctx.stun(f, stunMs);
    ctx.sfx('status-stun');
    ctx.float(f.x, f.y - 56, f === ctx.player ? 'SUGAR CRASH!' : 'HE CRASHED!', f === ctx.player ? '#ff9ac8' : '#9df5c8');
    ctx.scene.cameras.main.shake(120, 0.004);
  };

  const eat = (f: Fighter, c: Cube, time: number): void => {
    const r = rusher(f);
    cubes = cubes.filter((q) => q !== c);
    for (let i = 0; i < 6; i++) crumbs.push({ x: c.x + (rng() - 0.5) * 18, y: c.y + (rng() - 0.5) * 10, at: time, color: c.salt ? SALT : SUGAR });
    if (c.salt) {
      if (r.stacks > 0) r.stacks--;
      ctx.sfx('status-buff');
      ctx.float(f.x, f.y - 46, r.stacks > 0 ? 'SALT — STEADIER' : 'SALT — STEADY', '#d8d8d0');
      return;
    }
    r.stacks++;
    r.lastEat = time;
    if (r.stacks >= CRASH_AT) { crash(f, time); return; }
    r.rushUntil = time + RUSH_MS;
    ctx.sfx('sparkle');
    ctx.float(f.x, f.y - 46, r.stacks === CRASH_AT - 1 ? 'RUSH! (one more and you crash)' : 'RUSH!', '#fff0a0');
  };

  const speedOf = (f: Fighter): number => {
    const r = rusher(f);
    const now = ctx.scene.time.now;
    if (now < r.slumpUntil && now >= r.crashAt + stunMs) return SLUMP_SPEED;
    if (now < r.rushUntil) return f === ctx.npc && ctx.hard ? RUSH_MULT_HARD_FOE : RUSH_MULT;
    return 1;
  };
  const takenOf = (f: Fighter): number => (ctx.scene.time.now < rusher(f).slumpUntil ? SLUMP_TAKEN : 1);

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('MIND YOUR TEETH', '#ffd6e8'); }

      // The press keeps turning out cubes; the Saltcellar sweeps in a pinch of salt now and then.
      if (time >= nextSpawn) {
        nextSpawn = time + SPAWN_MS;
        if (cubes.filter((c) => !c.salt).length < maxCubes) { const p = spot(); cubes.push({ x: p.x, y: p.y, bornAt: time, salt: false, seed: rng() * 10 }); }
      }
      if (time >= nextSalt) {
        nextSalt = time + SALT_EVERY_MS;
        if (!cubes.some((c) => c.salt)) { const p = spot(); cubes.push({ x: p.x, y: p.y, bornAt: time, salt: true, seed: rng() * 10 }); }
      }

      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        const r = rusher(f);
        // Crash stacks drain on their own if you leave the cubes alone.
        if (r.stacks > 0 && time - r.lastEat > DECAY_MS) { r.stacks--; r.lastEat = time; }
        // A crashed fighter cannot eat; everyone else eats what they walk over.
        if (time < r.crashAt + stunMs) continue;
        for (const c of [...cubes]) {
          if (time - c.bornAt < 250) continue;
          if (dist(f.x, f.y + 12, c.x, c.y) < EAT_R) { eat(f, c, time); break; }
        }
        // A rushing fighter leaves a glittering trail.
        if (time < r.rushUntil && (r.trail.length === 0 || time - r.trail[r.trail.length - 1].at > 45)) r.trail.push({ x: f.x, y: f.y + 10, at: time });
        r.trail = r.trail.filter((p) => time - p.at < 420);
      }
      while (crumbs.length && time - crumbs[0].at > 700) crumbs.shift();
    },

    playerSpeedMult: () => speedOf(ctx.player),
    npcSpeedMult: () => speedOf(ctx.npc),
    playerTakenMult: () => takenOf(ctx.player),
    npcTakenMult: () => takenOf(ctx.npc),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const r = rusher(n);
      const pr = rusher(ctx.player);
      const now = ctx.scene.time.now;
      const nearest = (salt: boolean): Cube | null => {
        let best: Cube | null = null, bd = Infinity;
        for (const c of cubes) {
          if (c.salt !== salt) continue;
          const d = dist(n.x, n.y, c.x, c.y);
          if (d < bd) { bd = d; best = c; }
        }
        return best;
      };
      // Salt first when he is one cube from crashing.
      if (r.stacks >= CRASH_AT - 1) { const s = nearest(true); return s ? { x: s.x, y: s.y - 12 } : null; }
      // The player is down: rush in to punish.
      if (now < pr.slumpUntil) return { x: ctx.player.x, y: ctx.player.y };
      // Otherwise he simply wants a cube.
      const c = nearest(false);
      return c && dist(n.x, n.y, c.x, c.y) < 420 ? { x: c.x, y: c.y - 12 } : null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const c of cubes) {
        // Spilled granules round every cube.
        g.fillStyle(c.salt ? SALT : SUGAR, 0.35);
        for (let i = 0; i < 7; i++) g.fillCircle(c.x + Math.cos(c.seed + i * 1.9) * (10 + i * 2), c.y + 2 + Math.sin(c.seed + i * 1.9) * (4 + i), 1.3);
        if (c.salt) { g.lineStyle(1.5, SALT_LIT, 0.35 + 0.25 * Math.sin(t * 4 + c.seed)); g.strokeCircle(c.x, c.y, EAT_R); }
      }
      // Rush trails: sugar dust kicked up behind a rushing fighter.
      for (const [f, r] of state) {
        for (const p of r.trail) {
          const k = (time - p.at) / 420;
          g.fillStyle(f === ctx.player ? lit(LEMON, 0.4) : PINK, 0.5 * (1 - k));
          g.fillCircle(p.x + Math.sin(p.at) * 5, p.y, 3 + k * 4);
        }
      }
      for (const cr of crumbs) {
        const k = (time - cr.at) / 700;
        g.fillStyle(cr.color, 0.8 * (1 - k)); g.fillCircle(cr.x, cr.y + k * 6, 2 * (1 - k) + 0.6);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const c of cubes) {
        const pop = Math.min(1, (time - c.bornAt) / 250);
        const bob = Math.sin(t * 3 + c.seed) * 1.2;
        if (c.salt) {
          // A jagged lump of grey rock salt.
          const s = 10 * pop;
          g.fillStyle(SALT_DARK, 1);
          g.fillTriangle(c.x - s, c.y, c.x + s * 0.9, c.y, c.x - s * 0.2, c.y - s * 1.8 + bob);
          g.fillStyle(SALT, 1);
          g.fillTriangle(c.x - s * 0.7, c.y - 1, c.x + s * 0.7, c.y - 1, c.x + s * 0.3, c.y - s * 1.6 + bob);
          g.fillStyle(SALT_LIT, 1);
          g.fillTriangle(c.x - s * 0.1, c.y - s * 0.4, c.x + s * 0.5, c.y - s * 0.3, c.x + s * 0.3, c.y - s * 1.5 + bob);
        } else {
          sugarCube(g, c.x, c.y + bob * 0.4, 9 * pop, 1);
          if (Math.sin(t * 5 + c.seed * 3) > 0.9) { g.fillStyle(0xffffff, 0.9); g.fillCircle(c.x - 3, c.y - 16, 1.8); }
        }
      }
      // Crash pips over both heads, and the dizzy ring of sweets on whoever has crashed.
      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        const r = rusher(f);
        const y0 = f.y - 52;
        for (let i = 0; i < CRASH_AT; i++) {
          const x = f.x - 12 + i * 12;
          const on = i < r.stacks;
          const danger = r.stacks === CRASH_AT - 1;
          g.fillStyle(0x2a1a22, 0.6); g.fillRoundedRect(x - 5, y0 - 5, 10, 10, 3);
          if (on) {
            const c = danger ? (Math.floor(time / 160) % 2 ? 0xff5a7a : 0xffd0dc) : SUGAR;
            g.fillStyle(c, 1); g.fillRoundedRect(x - 4, y0 - 4, 8, 8, 2);
            g.fillStyle(0xffffff, 0.7); g.fillRect(x - 3, y0 - 3, 3, 2);
          }
        }
        if (time < r.crashAt + stunMs) {
          for (let i = 0; i < 5; i++) {
            const a = t * 5 + (i / 5) * Math.PI * 2;
            const col = SWEETS[i % SWEETS.length];
            const sx = f.x + Math.cos(a) * 20, sy = f.y - 40 + Math.sin(a) * 7;
            g.fillStyle(dim(col, 0.3), 1); g.fillCircle(sx + 0.6, sy + 0.8, 4);
            g.fillStyle(col, 1); g.fillCircle(sx, sy, 3.4);
          }
        } else if (time < r.slumpUntil) {
          // Slumped: a sticky grey sag under the eyes — and droop lines.
          g.lineStyle(2, 0x8a7a8a, 0.7);
          g.lineBetween(f.x - 14, f.y - 30, f.x - 18, f.y - 22); g.lineBetween(f.x + 14, f.y - 30, f.x + 18, f.y - 22);
        } else if (time < r.rushUntil) {
          // Rushing: zips of yellow speed off the shoulders.
          for (let i = 0; i < 3; i++) {
            const ph = ((t * 6 + i / 3) % 1);
            g.lineStyle(2, LEMON, 0.8 * (1 - ph));
            g.lineBetween(f.x - 18 - ph * 10, f.y - 18 + i * 10, f.x - 30 - ph * 14, f.y - 18 + i * 10);
          }
        }
      }
    },
  };
}

export const SUGAR_RUSH: GimmickDef = {
  id: 'confection-sugar-rush',
  rules: 'Walk over a sugar cube to eat it: a burst of speed and a crash stack. Three stacks and you CRASH. Grey salt takes a stack off.',
  make,
};
