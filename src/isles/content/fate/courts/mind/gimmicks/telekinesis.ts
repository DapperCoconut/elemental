import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, type G } from '../../../../../art/IsleArt';
import { crystalBall } from '../art';
import {
  CANDLE, CARD_RED, CRYSTAL, FLAME, GILT, GILT_DARK, IVORY, LAMP_GREEN, MIND, MIND_LIT, VELVET, VELVET_LIT, WOOD,
  WOOD_DARK, WOOD_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Telekinesis — Lifter Levitas.
 *
 * The parlour's furniture will not stay down. Chairs, crystal balls, card tables, a teapot and a
 * candelabrum lift off the floor one by one (their shadows shrink as they rise), hang there
 * turning, and gather a charge; when it is full they are flung along the line they are aimed.
 *
 * Each one aims at whoever *Levitas is facing* — and turns toward him instead while *you* face
 * it. Look at a hovering chair and hold your gaze, and its aim line swings round from red to
 * violet; let it go when it points at him. Anything flung hits the first fighter in its path.
 */

type Kind = 'chair' | 'ball' | 'table' | 'teapot' | 'candelabra';
const KINDS: Kind[] = ['chair', 'ball', 'table', 'teapot', 'candelabra'];
const SPEC: Record<Kind, { r: number; dmg: number }> = {
  chair: { r: 18, dmg: 12 }, ball: { r: 14, dmg: 10 }, table: { r: 24, dmg: 15 }, teapot: { r: 12, dmg: 9 }, candelabra: { r: 16, dmg: 11 },
};
const RISE_MS = 900;
const LIFT = 46;
const SPEED = 470;

interface Thing {
  kind: Kind; x: number; y: number; bornAt: number;
  state: 'rise' | 'hover' | 'fly' | 'crash';
  aim: number; charge: number; spin: number; vx: number; vy: number; crashAt: number;
  /** Who it is aimed at right now (for the line colour). */
  at: 'player' | 'npc' | null;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const things: Thing[] = [];
  const MAX = ctx.hard ? 5 : 4;
  const CHARGE_S = ctx.hard ? 2.2 : 2.7;
  let nextSpawn = 0;
  let started = false;

  const looksAt = (f: Fighter, t: Thing, cone: number) =>
    alive(f) && dist(f.x, f.y, t.x, t.y) < 600 && Math.abs(wrapAngle(ctx.facing(f) - Math.atan2(t.y - f.y, t.x - f.x))) < cone;

  function spawn(time: number): void {
    for (let tries = 0; tries < 12; tries++) {
      const x = 80 + rng() * (W - 160), y = top + 70 + rng() * (H - top - 120);
      if (dist(x, y, player.x, player.y) < 130 || dist(x, y, npc.x, npc.y) < 110) continue;
      if (things.some((t) => dist(t.x, t.y, x, y) < 90)) continue;
      const kind = KINDS[Math.floor(rng() * KINDS.length)];
      things.push({ kind, x, y, bornAt: time, state: 'rise', aim: Math.atan2(player.y - y, player.x - x), charge: 0, spin: 0, vx: 0, vy: 0, crashAt: 0, at: null, seed: rng() * 6 });
      ctx.sfx('magnet-pull');
      return;
    }
  }

  function hitTest(t: Thing): Fighter | null {
    const r = SPEC[t.kind].r + 20;
    for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, t.x, t.y - LIFT * 0.5) < r) return f;
    return null;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpawn = time + 500; }
      if (time >= nextSpawn) {
        nextSpawn = time + (ctx.hard ? 1700 : 2100);
        if (things.filter((t) => t.state === 'rise' || t.state === 'hover').length < MAX) spawn(time);
      }
      const npcFacing = ctx.facing(npc);
      for (let i = things.length - 1; i >= 0; i--) {
        const t = things[i];
        t.spin += dt * (t.state === 'fly' ? 9 : 1.2);
        if (t.state === 'rise' && time - t.bornAt >= RISE_MS) t.state = 'hover';
        if (t.state === 'rise' || t.state === 'hover') {
          // Whose will is on it: yours if you look at it, otherwise whoever Levitas faces.
          let want: number;
          if (looksAt(player, t, 0.32)) { want = Math.atan2(npc.y - t.y, npc.x - t.x); t.at = 'npc'; }
          else if (alive(player) && Math.abs(wrapAngle(npcFacing - Math.atan2(player.y - npc.y, player.x - npc.x))) < 0.9) {
            want = Math.atan2(player.y - t.y, player.x - t.x); t.at = 'player';
          } else {
            const fx = npc.x + Math.cos(npcFacing) * 500, fy = npc.y + Math.sin(npcFacing) * 500;
            want = Math.atan2(fy - t.y, fx - t.x); t.at = null;
          }
          const d = wrapAngle(want - t.aim);
          t.aim += clamp(d, -2.8 * dt, 2.8 * dt);
          if (t.state === 'hover') {
            t.charge += dt / CHARGE_S;
            if (t.charge >= 1) {
              t.state = 'fly';
              t.vx = Math.cos(t.aim) * SPEED; t.vy = Math.sin(t.aim) * SPEED;
              ctx.sfx('whoosh');
            }
          }
        } else if (t.state === 'fly') {
          t.x += t.vx * dt; t.y += t.vy * dt;
          const f = hitTest(t);
          if (f) {
            ctx.hit(f, SPEC[t.kind].dmg, f.x, f.y);
            ctx.nudge(f, (t.vx / SPEED) * 36, (t.vy / SPEED) * 36);
            ctx.sfx(t.kind === 'ball' ? 'crystal-shatter' : 'hit-medium');
            t.state = 'crash'; t.crashAt = time;
          } else if (t.x < 20 || t.x > W - 20 || t.y < top + 10 || t.y > H - 10) {
            t.x = clamp(t.x, 20, W - 20); t.y = clamp(t.y, top + 10, H - 10);
            ctx.sfx('clang');
            t.state = 'crash'; t.crashAt = time;
          }
        } else if (time - t.crashAt > 600) things.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Keep his distance, and step so a charged piece sits between him and you.
      const ripe = things.filter((t) => t.state === 'hover').sort((a, b) => b.charge - a.charge)[0];
      if (ripe) {
        const a = Math.atan2(ripe.y - player.y, ripe.x - player.x);
        return { x: clamp(ripe.x + Math.cos(a) * 140, 60, W - 60), y: clamp(ripe.y + Math.sin(a) * 140, top + 50, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.4;
      return { x: clamp(player.x + Math.cos(a) * 280, 60, W - 60), y: clamp(player.y + Math.sin(a) * 280, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const t of things) {
        if (t.state === 'crash') {
          const k = (time - t.crashAt) / 600;
          for (let i = 0; i < 7; i++) {
            const a = t.seed + i * 0.9, d = 10 + k * 34;
            g.fillStyle(t.kind === 'ball' ? CRYSTAL : WOOD, 1 - k); g.fillRect(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 4, 3);
          }
          continue;
        }
        const lift = t.state === 'rise' ? clamp((time - t.bornAt) / RISE_MS, 0, 1) : 1;
        const s = SPEC[t.kind].r;
        g.fillStyle(0x000000, 0.32 - lift * 0.14); g.fillEllipse(t.x, t.y + 4, s * (2.4 - lift * 0.8), s * (0.8 - lift * 0.25));
        if (t.state === 'hover') {
          // The aim line: red at you, violet at him, grey along his gaze.
          const c = t.at === 'player' ? 0xff5a5a : t.at === 'npc' ? MIND : 0xb0a8a0;
          const len = 90 + t.charge * 260;
          const y0 = t.y - LIFT;
          for (let i = 0; i < 12; i++) {
            const k = i / 12;
            g.fillStyle(c, (0.15 + t.charge * 0.5) * (1 - k));
            g.fillCircle(t.x + Math.cos(t.aim) * len * k, y0 + Math.sin(t.aim) * len * k, 2.6 - k * 1.4);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const t of things) {
        if (t.state === 'crash') continue;
        const lift = t.state === 'rise' ? clamp((time - t.bornAt) / RISE_MS, 0, 1) : 1;
        const bob = Math.sin(time / 260 + t.seed) * 3 * lift;
        const x = t.x, y = t.y - LIFT * lift + bob;
        if (t.state === 'hover') {
          glow(g, x, y, SPEC[t.kind].r * 2, MIND, 0.03 + t.charge * 0.06, 2);
          g.lineStyle(1.5, MIND_LIT, 0.25 + t.charge * 0.5);
          g.beginPath(); g.arc(x, y, SPEC[t.kind].r + 8, -Math.PI / 2, -Math.PI / 2 + t.charge * Math.PI * 2, false); g.strokePath();
        }
        drawThing(g, t.kind, x, y, t.state === 'fly' ? t.spin : Math.sin(t.spin) * 0.3, time);
        // Motes falling off things as they lift.
        if (t.state === 'rise') for (let i = 0; i < 4; i++) { g.fillStyle(MIND_LIT, 0.6 * (1 - lift)); g.fillCircle(x + Math.cos(i * 1.7) * 14, t.y - lift * 20 * (i % 2 ? 1 : 0.6), 1.6); }
      }
      // A thread of will from each fighter's eyes to what they are holding with them.
      for (const t of things) {
        if (t.state !== 'hover' || t.at !== 'npc' || !alive(player)) continue;
        if (!looksAt(player, t, 0.32)) continue;
        g.lineStyle(1, MIND_LIT, 0.35); g.lineBetween(player.x, player.y - 18, t.x, t.y - LIFT);
      }
    },
  };
}

/** One floating thing, turned by `rot` (radians, small while hovering). */
function drawThing(g: G, kind: Kind, x: number, y: number, rot: number, time: number): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const R = (fx: number, fy: number) => ({ x: x + fx * c - fy * s, y: y + fx * s + fy * c });
  switch (kind) {
    case 'chair': {
      // A bentwood parlour chair: back hoop, velvet seat, four legs.
      const leg = (ax: number) => { const a = R(ax, 4), b = R(ax * 1.2, 20); g.lineStyle(2.5, WOOD_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y); };
      leg(-9); leg(9); leg(-5); leg(5);
      const s0 = R(-12, 0), s1 = R(12, 0), s2 = R(12, 5), s3 = R(-12, 5);
      g.fillStyle(VELVET, 1); g.fillTriangle(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y); g.fillTriangle(s0.x, s0.y, s2.x, s2.y, s3.x, s3.y);
      const b0 = R(-10, 0), b1 = R(-10, -22), b2 = R(10, -22), b3 = R(10, 0);
      g.lineStyle(3, WOOD, 1); g.lineBetween(b0.x, b0.y, b1.x, b1.y); g.lineBetween(b1.x, b1.y, b2.x, b2.y); g.lineBetween(b2.x, b2.y, b3.x, b3.y);
      const m0 = R(-10, -11), m1 = R(10, -11);
      g.lineStyle(2, WOOD_LIT, 1); g.lineBetween(m0.x, m0.y, m1.x, m1.y);
      break;
    }
    case 'ball':
      crystalBall(g, x, y + 16, 10, time / 1000);
      break;
    case 'table': {
      // A round card table: green baize top, gilt rim, one turned pedestal, a card stuck on it.
      const top = R(0, -4);
      g.fillStyle(WOOD_DARK, 1); const p0 = R(0, 0), p1 = R(0, 22); g.lineStyle(6, WOOD_DARK, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      const f0 = R(-12, 24), f1 = R(12, 24); g.lineStyle(3, WOOD, 1); g.lineBetween(f0.x, f0.y, f1.x, f1.y);
      g.fillStyle(GILT_DARK, 1); g.fillEllipse(top.x, top.y + 2, 54, 18);
      g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(top.x, top.y, 50, 15);
      g.fillStyle(IVORY, 1); g.fillRect(top.x - 6, top.y - 4, 9, 7);
      g.fillStyle(CARD_RED, 1); g.fillCircle(top.x - 1.5, top.y, 1.5);
      break;
    }
    case 'teapot': {
      g.fillStyle(dim(IVORY, 0.15), 1); g.fillEllipse(x, y + 2, 26, 20);
      g.fillStyle(IVORY, 1); g.fillEllipse(x, y, 24, 18);
      const sp = R(12, -2), st = R(22, -9);
      g.lineStyle(4, IVORY, 1); g.lineBetween(sp.x, sp.y, st.x, st.y);
      const hd = R(-12, 0);
      g.lineStyle(2.5, IVORY, 1); g.strokeCircle(hd.x - 3, hd.y, 5);
      g.fillStyle(GILT, 1); g.fillCircle(x, y - 10, 3); g.fillRect(x - 10, y - 1, 20, 2);
      g.fillStyle(VELVET_LIT, 1); g.fillCircle(x - 4, y + 2, 2); g.fillCircle(x + 4, y + 3, 2);
      break;
    }
    case 'candelabra': {
      const base = R(0, 16), stem = R(0, -6);
      g.lineStyle(3, GILT_DARK, 1); g.lineBetween(base.x, base.y, stem.x, stem.y);
      g.fillStyle(GILT, 1); g.fillEllipse(base.x, base.y, 16, 5);
      for (const k of [-1, 0, 1]) {
        const arm = R(k * 12, -6 - (k ? 0 : 6)), cup = R(k * 12, -10 - (k ? 0 : 6));
        g.lineStyle(2, GILT, 1); g.lineBetween(stem.x, stem.y, arm.x, arm.y);
        g.fillStyle(IVORY, 1); g.fillRect(cup.x - 2, cup.y - 8, 4, 8);
        g.fillStyle(FLAME, 1); g.fillEllipse(cup.x, cup.y - 11, 3.5, 6);
        g.fillStyle(CANDLE, 0.4); g.fillCircle(cup.x, cup.y - 11, 6);
      }
      break;
    }
  }
}

export const TELEKINESIS: GimmickDef = {
  id: 'mind-telekinesis',
  rules: 'Furniture floats up and is flung at whoever Levitas faces. Face a floating thing yourself to turn its aim on him.',
  make,
};
