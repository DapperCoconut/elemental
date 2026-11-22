import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { sherd, terracottaSoldier } from '../art';
import { BISQUE_DARK, IRON_LIT, TERRA, TERRA_DARK, TERRA_LIT, TITHE_BLUE } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Terracotta Army — Sculptor Qin.
 *
 * Ranks of clay soldiers stand to attention across the muster ground. They are the Tithe, and
 * the Tithe goes where blood is drawn: every time a fighter is struck, the whole army takes one
 * march step toward *whoever was struck*. A soldier that reaches a fighter lowers its spear and
 * thrusts. So landing hits brings the ranks down on your foe; taking them brings them on you.
 *
 * Soldiers are only fired clay, and they stand in the way: strike one and it cracks; a second
 * crack shatters it into a heap of sherds that drags at whoever wades through. Qin fires a fresh
 * soldier into an empty place now and then. Shots at a foe behind the ranks crack them instead.
 */

const STEP = 38;
const MARCH_MS = 340;
const SPEAR_REACH = 50;
const SPEAR_WARN = 380;
const SPEAR_CD = 1600;
const SPEAR_DMG = 9;
/** A soldier's strike body: the torso, above its feet. */
const BODY_R = 22;
const BODY_UP = 26;
const SHARD_MS = 6000;

interface Soldier {
  home: Pt;
  x: number; y: number;
  fromX: number; fromY: number; toX: number; toY: number; marchAt: number;
  cracks: number; crackedAt: number;
  thrustAt: number; target: Fighter | null; readyAt: number;
  facing: number; variant: number;
  risenAt: number;
  dead: boolean;
  body: StrikeTarget;
}
interface Shards { x: number; y: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const soldiers: Soldier[] = [];
  const homes: Pt[] = [];
  for (const x of [130, 280, 680, 830]) for (const y of [top + 100, top + 270, top + 440]) homes.push({ x, y });
  homes.forEach((h, i) => soldiers.push(fresh(h, i, -9999)));
  const shards: Shards[] = [];
  const lastMarch = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const raiseEvery = ctx.hard ? 5000 : 7000;
  let nextRaise = 0;
  let started = false;
  let guard = false;

  function fresh(h: Pt, i: number, at: number): Soldier {
    const s: Soldier = {
      home: h, x: h.x, y: h.y, fromX: h.x, fromY: h.y, toX: h.x, toY: h.y, marchAt: -9999,
      cracks: 0, crackedAt: -9999, thrustAt: -1, target: null, readyAt: 0,
      facing: 0, variant: i * 7 + Math.floor(rng() * 5), risenAt: at, dead: false,
      body: ctx.target({ x: h.x, y: h.y - BODY_UP, r: BODY_R, onStruck: () => crack(s, ctx.scene.time.now) }),
    };
    return s;
  }

  function march(f: Fighter, time: number): void {
    if (time - (lastMarch.get(f) ?? -9999) < 450) return;
    lastMarch.set(f, time);
    let moved = false;
    for (const s of soldiers) {
      if (s.dead) continue;
      const d = dist(s.x, s.y, f.x, f.y);
      if (d < SPEAR_REACH - 6) continue;
      const k = Math.min(STEP, d - (SPEAR_REACH - 10)) / d;
      s.fromX = s.x; s.fromY = s.y;
      s.toX = clamp(s.x + (f.x - s.x) * k, 40, W - 40);
      s.toY = clamp(s.y + (f.y - s.y) * k, top + 40, H - 30);
      s.marchAt = time;
      s.facing = Math.atan2(f.y - s.y, f.x - s.x);
      moved = true;
    }
    if (moved) ctx.sfx('drum-hit');
  }

  /** A blow on a soldier: one crack, two shatter it. (A beat between, so one blast is one crack.) */
  function crack(s: Soldier, time: number): void {
    if (s.dead || time - s.crackedAt < 400) return;
    s.cracks++;
    s.crackedAt = time;
    if (s.cracks >= 2) {
      s.dead = true;
      s.body.remove();
      shards.push({ x: s.x, y: s.y, at: time, seed: rng() * 100 });
      ctx.float(s.x, s.y - 60, 'SHATTERED', '#e08d5c');
      ctx.sfx('crystal-shatter');
    } else ctx.sfx('stone-slam');
  }

  function hurt(f: Fighter): void {
    if (!guard) march(f, ctx.scene.time.now);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextRaise = time + raiseEvery; ctx.banner('THE RANKS STAND TO', '#e08d5c'); }
      // Marching: each step eased over a beat, with a stamp.
      for (const s of soldiers) {
        if (s.dead) continue;
        const k = clamp((time - s.marchAt) / MARCH_MS, 0, 1);
        s.x = s.fromX + (s.toX - s.fromX) * k;
        s.y = s.fromY + (s.toY - s.fromY) * k;
      }
      // Keep the ranks from standing in one another, and fighters out of the soldiers.
      for (let i = 0; i < soldiers.length; i++) {
        const a = soldiers[i];
        if (a.dead) continue;
        for (let j = i + 1; j < soldiers.length; j++) {
          const b = soldiers[j];
          if (b.dead) continue;
          const d = dist(a.x, a.y, b.x, b.y);
          if (d < 30 && d > 0.1) {
            const push = (30 - d) / 2, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
            a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
            a.toX = a.x; a.toY = a.y; b.toX = b.x; b.toY = b.y; a.fromX = a.x; a.fromY = a.y; b.fromX = b.x; b.fromY = b.y;
          }
        }
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(a.x, a.y, f.x, f.y);
          if (d < 30 && d > 0.1) ctx.nudge(f, ((f.x - a.x) / d) * (30 - d), ((f.y - a.y) / d) * (30 - d));
        }
        a.body.moveTo(a.x, a.y - BODY_UP);
      }
      // Spears: lower at the nearest fighter in reach, thrust after a beat.
      for (const s of soldiers) {
        if (s.dead || time - s.risenAt < 800) continue;
        if (s.thrustAt < 0 && time >= s.readyAt) {
          let best: Fighter | null = null, bd = SPEAR_REACH;
          for (const f of [player, npc]) { if (!alive(f)) continue; const d = dist(s.x, s.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
          if (best) { s.target = best; s.thrustAt = time + SPEAR_WARN; s.facing = Math.atan2(best.y - s.y, best.x - s.x); }
        } else if (s.thrustAt >= 0 && time >= s.thrustAt) {
          const f = s.target;
          s.thrustAt = -1;
          s.readyAt = time + SPEAR_CD;
          if (f && alive(f) && dist(s.x, s.y, f.x, f.y) < SPEAR_REACH + 8) {
            guard = true;
            ctx.hit(f, SPEAR_DMG, f.x, f.y);
            guard = false;
            ctx.sfx('stab');
            // Struck by the Tithe is still struck: the ranks come on.
            march(f, time);
          }
        }
      }
      // Sherds underfoot cut and slow.
      for (let i = shards.length - 1; i >= 0; i--) if (time - shards[i].at > SHARD_MS) shards.splice(i, 1);
      // Qin fires a new soldier into an empty home.
      if (time >= nextRaise) {
        nextRaise = time + raiseEvery;
        const idx = soldiers.findIndex((s) => s.dead && dist(s.home.x, s.home.y, player.x, player.y) > 90 && dist(s.home.x, s.home.y, npc.x, npc.y) > 90);
        if (idx >= 0) {
          soldiers[idx].body.remove();
          soldiers[idx] = fresh(soldiers[idx].home, idx, time);
          ctx.float(soldiers[idx].x, soldiers[idx].y - 64, 'A NEW RANK', '#f6e2c8');
          ctx.sfx('stone-rise');
        }
      }
    },

    destroy() { for (const s of soldiers) s.body.remove(); },

    onPlayerHurt() { hurt(player); },
    onNpcHurt() { hurt(npc); },

    playerSpeedMult() { return shards.some((s) => dist(s.x, s.y, player.x, player.y) < 34) ? 0.75 : 1; },
    npcSpeedMult() { return shards.some((s) => dist(s.x, s.y, npc.x, npc.y) < 34) ? 0.75 : 1; },

    npcSeek() {
      // Qin stands so that you are between him and the bulk of his army.
      const live = soldiers.filter((s) => !s.dead);
      if (!live.length) return null;
      const sx = live.reduce((a, s) => a + s.x, 0) / live.length, sy = live.reduce((a, s) => a + s.y, 0) / live.length;
      const dx = player.x - sx, dy = player.y - sy;
      const d = Math.hypot(dx, dy) || 1;
      let x = player.x + (dx / d) * 210, y = player.y + (dy / d) * 180;
      // …and out of spear reach of any of them.
      for (const s of live) {
        const sd = dist(s.x, s.y, x, y);
        if (sd < SPEAR_REACH + 30) { x += ((x - s.x) / (sd || 1)) * 60; y += ((y - s.y) / (sd || 1)) * 60; }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The muster grid: tiles with the cobalt mark where each rank first stood.
      for (const h of homes) {
        g.lineStyle(2, TITHE_BLUE, 0.35); g.strokeCircle(h.x, h.y - 2, 14);
        g.lineBetween(h.x - 10, h.y - 2, h.x + 10, h.y - 2);
      }
      // Sherd heaps of the shattered.
      for (const s of shards) {
        const fade = clamp((SHARD_MS - (time - s.at)) / 800, 0, 1);
        let seed = s.seed;
        const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        g.fillStyle(TERRA_DARK, 0.25 * fade); g.fillEllipse(s.x, s.y, 64, 26);
        for (let i = 0; i < 14; i++) sherd(g, s.x + (r() - 0.5) * 56, s.y + (r() - 0.5) * 22, 3 + r() * 4, r() < 0.7 ? TERRA : BISQUE_DARK, r, fade);
      }
    },

    drawAir(g, time) {
      // Soldiers in y-order, so the ranks overlap properly.
      const live = soldiers.filter((s) => !s.dead).sort((a, b) => a.y - b.y);
      for (const s of live) {
        const rise = clamp((time - s.risenAt) / 800, 0, 1);
        const bob = time - s.marchAt < MARCH_MS ? -Math.sin(((time - s.marchAt) / MARCH_MS) * Math.PI) * 4 : 0;
        if (rise < 1) {
          // Rising out of the floor, red-hot from Qin's kiln, cooling as it stands.
          g.fillStyle(0xff8a2a, 0.4 * (1 - rise)); g.fillCircle(s.x, s.y - 26, 30);
        }
        terracottaSoldier(g, s.x, s.y + bob + (1 - rise) * 20, 1, s.variant, s.cracks, rise);
        // The lowered spear: a telegraph line toward its mark.
        if (s.thrustAt >= 0) {
          const k = clamp(1 - (s.thrustAt - time) / SPEAR_WARN, 0, 1);
          const ox = s.x + 6, oy = s.y - 30;
          const ex = ox + Math.cos(s.facing) * (20 + k * (SPEAR_REACH - 10)), ey = oy + Math.sin(s.facing) * (20 + k * (SPEAR_REACH - 10));
          g.lineStyle(2.5, 0x553a24, 1); g.lineBetween(ox, oy, ex, ey);
          g.fillStyle(IRON_LIT, 1); g.fillCircle(ex, ey, 3);
          g.lineStyle(1.5, TERRA_LIT, 0.3 + k * 0.6); g.lineBetween(ex, ey, ox + Math.cos(s.facing) * (SPEAR_REACH + 8), oy + Math.sin(s.facing) * (SPEAR_REACH + 8));
        } else if (time < s.readyAt && time > s.readyAt - SPEAR_CD + 180) {
          // Recovering: the spear back upright, a dust puff at the foot.
          g.fillStyle(dim(TERRA, 0.2), 0.2); g.fillEllipse(s.x, s.y + 2, 26, 6);
        }
        // A fresh crack flashes.
        if (time - s.crackedAt < 260) { g.lineStyle(2, 0xffffff, 1 - (time - s.crackedAt) / 260); g.strokeCircle(s.x, s.y - 30, 18); }
      }
      // Flying sherds when one shatters.
      for (const s of shards) {
        const k = (time - s.at) / 500;
        if (k > 1) continue;
        for (let i = 0; i < 10; i++) {
          const a = s.seed + i * 0.63;
          g.fillStyle(i % 3 ? TERRA : TERRA_LIT, 1 - k);
          g.fillTriangle(s.x + Math.cos(a) * k * 60, s.y - 30 + Math.sin(a) * k * 40 + k * k * 40, s.x + Math.cos(a) * k * 60 + 5, s.y - 28 + Math.sin(a) * k * 40 + k * k * 40, s.x + Math.cos(a) * k * 60 + 2, s.y - 34 + Math.sin(a) * k * 40 + k * k * 40);
        }
      }
    },
  };
}

export const TERRACOTTA_ARMY: GimmickDef = {
  id: 'potter-army',
  rules: 'Clay ranks march a step toward whoever is struck, and spear whoever they reach. Strike a soldier to crack it; two hits shatter one.',
  make,
};
