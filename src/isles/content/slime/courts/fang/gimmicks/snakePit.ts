import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { coiledSnake, sedge, SKIN_ADDER, SKIN_COBRA, SKIN_VIPER, type SnakeSkin } from '../art';
import { FANG_LIT, MUD_DARK, SEDGE_DARK, VENOM, VENOM_LIT } from '../palette';
import { alive, arcPoint, clamp, dist, segDist, stepDt } from '../util';

/**
 * Snake Pit — Pitkeeper Asp.
 *
 * The yard is Asp's breeding ground, and snakes lie coiled in the grass all over it. Come within
 * a snake's reach and it rattles — its head comes up, its tail buzzes, and a line shows where it
 * will bite — then it strikes straight along that line. Either fighter can be bitten.
 *
 * But a coil is only a snake. Strike one and it is *flung*: it sails away from whoever struck it
 * and lands coiled where it falls, furious, already rattling at whoever is nearest. Fling them at
 * Asp. He knows every one of them by name and still flinches.
 */

type CoilState = 'idle' | 'rattle' | 'strike' | 'rest' | 'flung';

interface Coil {
  x: number; y: number;
  /** Facing (where the head points / will strike). */
  a: number;
  state: CoilState;
  at: number;
  /** The fighter it is rattling at. */
  victim: Fighter | null;
  /** The strike's end point, fixed when the rattle ends. */
  tx: number; ty: number;
  /** A fling: from, to, and how long the flight lasts. */
  fx: number; fy: number; gx: number; gy: number; flyMs: number;
  /** Rattle length for this rattle (shorter when it has just been flung). */
  rattleMs: number;
  skin: SnakeSkin;
  target: StrikeTarget | null;
  /** Sedge round its bed, fixed per coil. */
  tufts: { dx: number; dy: number; s: number }[];
  seed: number;
}

const STRIKE_MS = 170;
const REST_MS = 1500;
const FLING_DIST = 210;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const SENSE = ctx.hard ? 110 : 96;
  const REACH = ctx.hard ? 150 : 135;
  const RATTLE_MS = ctx.hard ? 640 : 760;
  const BITE = ctx.hard ? 12 : 10;
  const coils: Coil[] = [];
  const slowNpcUntil = { t: 0 };
  let started = false;
  const fighters = (): Fighter[] => [player, npc].filter(alive);

  function place(n: number): void {
    const spots: { x: number; y: number }[] = [];
    for (let tries = 0; spots.length < n && tries < 400; tries++) {
      const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
      // Not on top of the fighters' starts (the left and right thirds' middles), and spread out.
      if (Math.abs(y - (top + H) / 2) < 70 && (x < 260 || x > W - 260)) continue;
      if (spots.some((s) => dist(s.x, s.y, x, y) < 150)) continue;
      spots.push({ x, y });
    }
    const skins = [SKIN_ADDER, SKIN_VIPER, SKIN_COBRA];
    spots.forEach((s, i) => {
      const c: Coil = {
        x: s.x, y: s.y, a: rng() * Math.PI * 2, state: 'idle', at: 0, victim: null, tx: s.x, ty: s.y,
        fx: 0, fy: 0, gx: 0, gy: 0, flyMs: 0, rattleMs: RATTLE_MS, skin: skins[i % 3], target: null,
        tufts: Array.from({ length: 6 }, () => ({ dx: (rng() - 0.5) * 60, dy: (rng() - 0.5) * 24 + 6, s: 0.6 + rng() * 0.5 })), seed: rng() * 10,
      };
      c.target = ctx.target({ x: c.x, y: c.y - 8, r: 20, passThrough: true, onStruck: (by) => fling(c, by) });
      coils.push(c);
    });
  }

  function fling(c: Coil, by: 'player' | 'npc'): void {
    if (c.state === 'flung') return;
    const s = by === 'player' ? player : npc;
    const now = ctx.scene.time.now;
    const a = dist(s.x, s.y, c.x, c.y) < 4 ? rng() * Math.PI * 2 : Math.atan2(c.y - s.y, c.x - s.x);
    c.fx = c.x; c.fy = c.y;
    c.gx = clamp(c.x + Math.cos(a) * FLING_DIST, 60, W - 60);
    c.gy = clamp(c.y + Math.sin(a) * FLING_DIST, top + 50, H - 40);
    c.flyMs = 560;
    c.state = 'flung';
    c.at = now;
    c.a = a;
    c.victim = null;
    ctx.sfx('whip');
    ctx.float(c.x, c.y - 30, 'FLUNG', '#d8f088');
  }

  function rattleAt(c: Coil, f: Fighter, time: number, ms: number): void {
    c.state = 'rattle';
    c.at = time;
    c.victim = f;
    c.rattleMs = ms;
    c.a = Math.atan2(f.y - c.y, f.x - c.x);
    ctx.sfx('trap-set');
  }

  function bite(c: Coil, time: number): void {
    for (const f of fighters()) {
      if (segDist(f.x, f.y, c.x, c.y - 10, c.tx, c.ty) > 26) continue;
      ctx.hit(f, BITE, f.x, f.y);
      ctx.float(f.x, f.y - 44, 'BITTEN', '#c8f060');
      if (f === player) ctx.tk.slowPlayer(0.7, 1300);
      else slowNpcUntil.t = time + 1300;
      ctx.sfx('stab');
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; place(ctx.hard ? 7 : 6); }
      for (const c of coils) {
        switch (c.state) {
          case 'idle': {
            let best: Fighter | null = null, bd = SENSE;
            for (const f of fighters()) { const d = dist(f.x, f.y, c.x, c.y); if (d < bd) { bd = d; best = f; } }
            if (best) rattleAt(c, best, time, RATTLE_MS);
            break;
          }
          case 'rattle': {
            const v = c.victim;
            if (v && alive(v)) c.a = Math.atan2(v.y - c.y, v.x - c.x);
            if (time - c.at >= c.rattleMs) {
              const reach = v && alive(v) ? Math.min(REACH, dist(v.x, v.y, c.x, c.y) + 30) : REACH * 0.6;
              c.tx = c.x + Math.cos(c.a) * reach; c.ty = c.y - 10 + Math.sin(c.a) * reach;
              c.state = 'strike'; c.at = time;
              ctx.sfx('slash');
            }
            break;
          }
          case 'strike':
            if (time - c.at >= STRIKE_MS) { bite(c, time); c.state = 'rest'; c.at = time; }
            break;
          case 'rest':
            if (time - c.at >= REST_MS) c.state = 'idle';
            break;
          case 'flung': {
            const k = clamp((time - c.at) / c.flyMs, 0, 1);
            const p = arcPoint(c.fx, c.fy, c.gx, c.gy, 70, k);
            c.x = p.x; c.y = k < 1 ? c.fy + (c.gy - c.fy) * k : c.gy;
            c.target?.moveTo(p.x, p.y - 8);
            if (k >= 1) {
              c.x = c.gx; c.y = c.gy;
              c.target?.moveTo(c.x, c.y - 8);
              ctx.sfx('slime-splat');
              // Lands furious: rattles at once (and quicker) at whoever is nearest, if anyone is in reach.
              let best: Fighter | null = null, bd = SENSE * 1.5;
              for (const f of fighters()) { const d = dist(f.x, f.y, c.x, c.y); if (d < bd) { bd = d; best = f; } }
              if (best) rattleAt(c, best, time, RATTLE_MS * 0.6);
              else { c.state = 'rest'; c.at = time - REST_MS * 0.5; }
            }
            break;
          }
        }
      }
    },

    npcSpeedMult() { return ctx.scene.time.now < slowNpcUntil.t ? 0.7 : 1; },

    npcSeek() {
      // Asp keeps a snake between you and him: he circles to stand behind the coil nearest you,
      // and steps out of the reach of any coil that is not rattling at you.
      if (!alive(player)) return null;
      let near: Coil | null = null, nd = Infinity;
      for (const c of coils) {
        if (c.state === 'flung') continue;
        const d = dist(c.x, c.y, player.x, player.y);
        if (d < nd) { nd = d; near = c; }
      }
      let x = player.x + 200, y = player.y;
      if (near && nd < 320) {
        const a = Math.atan2(near.y - player.y, near.x - player.x);
        x = near.x + Math.cos(a) * (SENSE + 40); y = near.y + Math.sin(a) * (SENSE + 40);
      } else {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        x = player.x + Math.cos(a) * 190; y = player.y + Math.sin(a) * 190;
      }
      for (const c of coils) {
        if (c.state === 'flung' || (c.state === 'rattle' && c.victim === player)) continue;
        const d = dist(c.x, c.y, x, y);
        if (d < SENSE + 20) { const a = Math.atan2(y - c.y, x - c.x); x = c.x + Math.cos(a) * (SENSE + 24); y = c.y + Math.sin(a) * (SENSE + 24); }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const c of coils) {
        if (c.state !== 'flung') {
          // A flattened bed in the grass, sedge round it.
          g.fillStyle(MUD_DARK, 0.35); g.fillEllipse(c.x, c.y + 2, 54, 18);
          for (const t of c.tufts) sedge(g, c.x + t.dx, c.y + t.dy, t.s, () => ((t.dx * 13 + t.dy * 7) % 1 + 1) % 1);
          // The sense ring, faint, so you can read how close is too close.
          g.lineStyle(1, SEDGE_DARK, 0.35); g.strokeEllipse(c.x, c.y, SENSE * 2, SENSE * 1.3);
        } else {
          // Its shadow on the ground where it will land.
          const k = clamp((time - c.at) / c.flyMs, 0, 1);
          g.fillStyle(0x000000, 0.25 * k); g.fillEllipse(c.gx, c.gy + 2, 30 + k * 10, 10);
          g.lineStyle(1.5, VENOM, 0.4 * k); g.strokeEllipse(c.gx, c.gy, 50, 18);
        }
        if (c.state === 'rattle') {
          // The bite line: where the head will go.
          const k = clamp((time - c.at) / c.rattleMs, 0, 1);
          const reach = c.victim && alive(c.victim) ? Math.min(REACH, dist(c.victim.x, c.victim.y, c.x, c.y) + 30) : REACH * 0.6;
          const ex = c.x + Math.cos(c.a) * reach, ey = c.y - 10 + Math.sin(c.a) * reach;
          g.lineStyle(14, VENOM, 0.06 + k * 0.12); g.lineBetween(c.x, c.y - 10, ex, ey);
          g.lineStyle(2, VENOM_LIT, 0.25 + k * 0.6); g.lineBetween(c.x, c.y - 10, c.x + (ex - c.x) * k, c.y - 10 + (ey - c.y + 10) * k);
          // Two fang marks at the end of the line.
          for (const s of [-1, 1]) {
            const px = ex + Math.cos(c.a + Math.PI / 2) * 6 * s, py = ey + Math.sin(c.a + Math.PI / 2) * 6 * s;
            g.fillStyle(FANG_LIT, 0.3 + k * 0.5); g.fillCircle(px, py, 2.5);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const c of coils) {
        if (c.state === 'flung') {
          // Thrashing through the air: an S of body, spinning.
          const k = clamp((time - c.at) / c.flyMs, 0, 1);
          const p = arcPoint(c.fx, c.fy, c.gx, c.gy, 70, k);
          const spin = time / 70;
          for (let i = 0; i < 9; i++) {
            const t = i / 8 - 0.5;
            const x = p.x + Math.cos(spin) * t * 34 + Math.sin(spin + t * 6) * 5;
            const y = p.y - 14 + Math.sin(spin) * t * 34 + Math.cos(spin + t * 6) * 5;
            g.fillStyle(i === 0 ? dim(c.skin.body, 0.1) : i % 2 ? c.skin.body : c.skin.band, 1);
            g.fillCircle(x, y, i === 0 ? 5 : 4 - Math.abs(t) * 2);
          }
          continue;
        }
        const rise = c.state === 'rattle' ? 0.3 + clamp((time - c.at) / c.rattleMs, 0, 1) * 0.7 : c.state === 'strike' ? 1 : 0;
        if (c.state === 'strike') {
          // The lunge: the neck shoots out along the line.
          const k = clamp((time - c.at) / STRIKE_MS, 0, 1);
          const hx = c.x + (c.tx - c.x) * k, hy = c.y - 10 + (c.ty - c.y + 10) * k;
          coiledSnake(g, c.x, c.y, 1, c.skin, c.a, 0.3, time);
          g.lineStyle(7, dim(c.skin.body, 0.3), 1); g.lineBetween(c.x, c.y - 12, hx, hy);
          g.lineStyle(5, c.skin.body, 1); g.lineBetween(c.x, c.y - 12, hx, hy);
          for (let i = 1; i < 6; i++) { g.fillStyle(c.skin.band, 0.9); g.fillCircle(c.x + (hx - c.x) * (i / 6), c.y - 12 + (hy - c.y + 12) * (i / 6), 2); }
          g.fillStyle(c.skin.body, 1); g.fillEllipse(hx, hy, 12, 9);
          g.fillStyle(FANG_LIT, 1);
          g.fillTriangle(hx + Math.cos(c.a) * 6 - 2, hy + 2, hx + Math.cos(c.a) * 6, hy + 2, hx + Math.cos(c.a) * 8, hy + 7);
          g.fillTriangle(hx + Math.cos(c.a) * 6 + 2, hy + 2, hx + Math.cos(c.a) * 6 + 4, hy + 2, hx + Math.cos(c.a) * 8 + 2, hy + 7);
          continue;
        }
        coiledSnake(g, c.x, c.y, 1, c.skin, c.a, rise, time + c.seed * 100);
        if (c.state === 'rattle') {
          // The rattle: a buzz of little arcs off the tail.
          const tx = c.x + 18, ty = c.y + 2;
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 120) + i / 3) % 1;
            g.lineStyle(1.2, 0xf2e8b0, 0.7 * (1 - ph));
            g.beginPath(); g.arc(tx, ty, 6 + ph * 12, -0.8, 0.8, false); g.strokePath();
          }
        }
      }
    },
  };
}

export const SNAKE_PIT: GimmickDef = {
  id: 'fang-snake-pit',
  rules: 'Coiled snakes rattle at anyone who comes near, then strike along the line. Strike a coil to fling it — it lands furious beside whoever is nearest.',
  make,
};
