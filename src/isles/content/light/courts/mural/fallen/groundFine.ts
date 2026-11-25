import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CADMIUM, CANVAS, CANVAS_DARK, GOLD, GOLD_DARK, OCHRE, SIDE_NPC, SIDE_PLAYER, TIMBER, TIMBER_DARK, TIMBER_LIT,
  ULTRAMARINE, UMBER, UMBER_DARK, VERMILION, VIOLET, VIRIDIAN,
} from '../palette';
import { clamp, dist, stepDt, wrapAngle } from '../util';
import { alive, framePlate, halfDown } from './common';

/**
 * Ground Fine — Evadne Smalt, Assayer of Colours (dune).
 *
 * The colour-mills grind the court's three licensed primaries — vermilion, cadmium, ultramarine —
 * and their hoppers breathe the dust out in slow coloured clouds that roll across the yard. The
 * dust settles on whoever walks through it, and on a fighter, as on a palette, two primaries mix:
 * red and yellow make a hot orange (your blows bite deeper), yellow and blue a green verdigris
 * (it mends you), red and blue a violet (your cooldowns quicken). But all three together is mud —
 * a brown, the colour of shadow, contraband — and the Assayer of Colours is waiting for it: the
 * muddied fighter is assayed on the spot, struck and held, and scrubbed back to bare.
 *
 * So you choose your clouds. And a hopper struck with a blow coughs a hard jet of its colour at
 * the striker's foe — strike the one colour she is missing and the mud is hers. Below half the
 * mills run fine: every puff comes in pairs and coats wear off sooner.
 */

const ID = fallenId('mural', 'ground-fine');

const COLS = [VERMILION, CADMIUM, ULTRAMARINE];
/** Secondary for each unordered pair (index = sum of the two primaries' indices - 1). */
const MIX = [0xf07a22, VIOLET, VIRIDIAN];
type Mix = 'orange' | 'violet' | 'green';
const MIX_NAME: Mix[] = ['orange', 'violet', 'green'];

const PUFF_MS = 1500;
const JET_WINDUP = 420;
const JET_SPEED = 250;
const HOPPER_CD = 2400;

interface Cloud { c: number; x: number; y: number; vx: number; vy: number; r: number; born: number; life: number; jet: Fighter | null; seed: number }
interface Coat { c: number; until: number }
interface Hopper { c: number; x: number; y: number; ang: number; target: StrikeTarget | null; readyAt: number; windup: { at: number; at2: Fighter } | null; shake: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const clouds: Cloud[] = [];
  const coats = new Map<Fighter, Coat[]>([[player, []], [npc, []]]);
  const mud = new Map<Fighter, number>([[player, -1e9], [npc, -1e9]]);
  const mendClock = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextPuff = 0;
  let order = 0;
  let started = false;

  const hoppers: Hopper[] = [
    { c: 0, x: 54, y: top + 190, ang: 0, target: null, readyAt: 0, windup: null, shake: 0 },
    { c: 1, x: W / 2, y: top + 22, ang: Math.PI / 2, target: null, readyAt: 0, windup: null, shake: 0 },
    { c: 2, x: W - 54, y: top + 190, ang: Math.PI, target: null, readyAt: 0, windup: null, shake: 0 },
  ];
  const mouth = (h: Hopper): Pt => ({ x: h.x + Math.cos(h.ang) * 34, y: h.y + Math.sin(h.ang) * 34 });

  const coatOf = (f: Fighter) => coats.get(f) ?? [];
  const mixOf = (f: Fighter): Mix | null => {
    const cs = coatOf(f);
    return cs.length === 2 ? MIX_NAME[cs[0].c + cs[1].c - 1] : null;
  };
  const missing = (f: Fighter): number => {
    const cs = coatOf(f);
    if (cs.length < 2) return -1;
    return 3 - cs[0].c - cs[1].c;
  };
  const foeOf = (f: Fighter) => (f === player ? npc : player);

  for (const h of hoppers) {
    h.target = ctx.target({
      x: h.x, y: h.y, r: 30,
      onStruck: (by) => {
        const now = ctx.scene.time.now;
        if (now < h.readyAt || h.windup) return;
        h.windup = { at: now + JET_WINDUP, at2: by === 'player' ? npc : player };
        h.readyAt = now + HOPPER_CD;
        ctx.sfx('gear-turn');
      },
    });
  }

  function addCoat(f: Fighter, c: number, now: number): void {
    const cs = coatOf(f);
    const span = halfDown(npc) ? 7000 : 9000;
    const same = cs.find((k) => k.c === c);
    if (same) { for (const k of cs) k.until = now + span; return; }
    if (cs.length < 2) { cs.push({ c, until: now + span }); ctx.sfx(cs.length === 2 ? 'sparkle' : 'smoke'); return; }
    // The third primary: mud. Assayed on the spot.
    cs.length = 0;
    mud.set(f, now);
    ctx.hit(f, f === npc ? 26 : 20, f.x, f.y);
    ctx.root(f, 1100);
    ctx.sfx('judgement');
  }

  function puff(now: number): void {
    const h = hoppers[order++ % 3];
    const m = mouth(h);
    const n = halfDown(npc) ? 2 : 1;
    const aim = rng() < 0.6 ? { x: player.x + (rng() - 0.5) * 320, y: player.y + (rng() - 0.5) * 260 } : { x: 200 + rng() * (W - 400), y: top + 120 + rng() * (H - top - 220) };
    const base = Math.atan2(aim.y - m.y, aim.x - m.x);
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - 0.5) * 0.7 : 0);
      const sp = 72 + rng() * 22;
      clouds.push({ c: h.c, x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 26, born: now, life: 9000, jet: null, seed: rng() * 10 });
    }
    h.shake = now;
    ctx.sfx('gust');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPuff = time + 1000; }
      if (time >= nextPuff && clouds.filter((c) => !c.jet).length < 7) { puff(time); nextPuff = time + PUFF_MS; }

      // Struck hoppers: a beat of rattling, then a hard jet at the striker's foe.
      for (const h of hoppers) {
        if (!h.windup || time < h.windup.at) continue;
        const to = h.windup.at2;
        h.windup = null;
        if (!alive(to)) continue;
        const m = mouth(h);
        const a = Math.atan2(to.y - m.y, to.x - m.x);
        clouds.push({ c: h.c, x: m.x, y: m.y, vx: Math.cos(a) * JET_SPEED, vy: Math.sin(a) * JET_SPEED, r: 30, born: time, life: 3200, jet: to, seed: rng() * 10 });
        h.shake = time;
        ctx.sfx('smoke');
      }

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        const age = time - c.born;
        if (c.jet && alive(c.jet)) {
          // A jet bends a little after its mark.
          const want = Math.atan2(c.jet.y - c.y, c.jet.x - c.x), cur = Math.atan2(c.vy, c.vx);
          const na = cur + clamp(wrapAngle(want - cur), -1.1 * dt, 1.1 * dt);
          c.vx = Math.cos(na) * JET_SPEED; c.vy = Math.sin(na) * JET_SPEED;
        } else {
          c.vx += Math.sin(time / 900 + c.seed) * 8 * dt;
          c.r = Math.min(50, c.r + 26 * dt);
        }
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (age > c.life || c.x < -60 || c.x > W + 60 || c.y < top - 40 || c.y > H + 60) { clouds.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || age < 250) continue;
          if (dist(f.x, f.y, c.x, c.y) < c.r + 14) { addCoat(f, c.c, time); clouds.splice(i, 1); break; }
        }
      }

      for (const f of [player, npc]) {
        const cs = coatOf(f);
        for (let k = cs.length - 1; k >= 0; k--) if (time > cs[k].until) cs.splice(k, 1);
        // Verdigris mends on its own clock.
        if (mixOf(f) === 'green' && alive(f)) {
          const t = (mendClock.get(f) ?? 0) + dt;
          if (t >= 0.6) { ctx.heal(f, 2); mendClock.set(f, 0); } else mendClock.set(f, t);
        }
      }
    },

    playerTakenMult() { return mixOf(npc) === 'orange' ? 1.3 : 1; },
    npcTakenMult() { return mixOf(player) === 'orange' ? 1.3 : 1; },
    playerCooldownRate() { return mixOf(player) === 'violet' ? 1.6 : 1; },
    npcCooldownRate() { return mixOf(npc) === 'violet' ? 1.6 : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const third = missing(npc);
      // Holding two: keep clear of the one colour that would mud him.
      if (third >= 0) {
        for (const c of clouds) {
          if (c.c !== third || dist(c.x, c.y, npc.x, npc.y) > c.r + 120) continue;
          const a = Math.atan2(c.vy, c.vx) + Math.PI / 2;
          const side = Math.sin(Math.atan2(npc.y - c.y, npc.x - c.x) - Math.atan2(c.vy, c.vx)) >= 0 ? 1 : -1;
          return { x: clamp(npc.x + Math.cos(a) * side * 150, 60, W - 60), y: clamp(npc.y + Math.sin(a) * side * 150, top + 50, H - 40) };
        }
      }
      // The stranger is one colour from mud: go and strike that hopper.
      const theirs = missing(player);
      if (theirs >= 0) {
        const h = hoppers[theirs];
        if (ctx.scene.time.now >= h.readyAt) {
          const a = Math.atan2(top + (H - top) / 2 - h.y, W / 2 - h.x);
          return { x: clamp(h.x + Math.cos(a) * 110, 60, W - 60), y: clamp(h.y + Math.sin(a) * 110, top + 50, H - 40) };
        }
      }
      // Fewer than two coats: walk into the nearest drifting cloud that mixes.
      if (coatOf(npc).length < 2) {
        const have = coatOf(npc)[0]?.c ?? -1;
        let best: Cloud | null = null, bd = 380;
        for (const c of clouds) {
          if (c.jet || c.c === have) continue;
          const d = dist(c.x, c.y, npc.x, npc.y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) return { x: best.x + best.vx * 0.5, y: best.y + best.vy * 0.5 };
      }
      return null;
    },

    drawGround(g, time) {
      // The three mill hoppers at the yard's edge: a timber frame, a funnel, a chute, a spilled fan.
      for (const h of hoppers) {
        const col = COLS[h.c];
        const m = mouth(h);
        const sh = time - h.shake < 300 ? Math.sin(time / 18) * 2 : 0;
        const ca = Math.cos(h.ang), sa = Math.sin(h.ang);
        // Spilled powder fanning from the chute.
        for (let k = 0; k < 7; k++) {
          const a = h.ang + (k - 3) * 0.16, r = 30 + (k % 3) * 9;
          g.fillStyle(col, 0.22); g.fillEllipse(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, 26, 14);
        }
        g.fillStyle(col, 0.4); g.fillEllipse(m.x + ca * 10, m.y + sa * 10, 30, 16);
        // Frame posts and the hopper box.
        g.fillStyle(0x000000, 0.2); g.fillEllipse(h.x, h.y + 18, 64, 16);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(h.x - 26 + sh, h.y - 26, 6, 44); g.fillRect(h.x + 20 + sh, h.y - 26, 6, 44);
        g.fillStyle(TIMBER, 1);
        g.fillPoints([{ x: h.x - 30 + sh, y: h.y - 30 }, { x: h.x + 30 + sh, y: h.y - 30 }, { x: h.x + 12 + sh, y: h.y + 4 }, { x: h.x - 12 + sh, y: h.y + 4 }], true);
        g.fillStyle(TIMBER_LIT, 1); g.fillRect(h.x - 30 + sh, h.y - 32, 60, 5);
        g.lineStyle(1, TIMBER_DARK, 0.8);
        for (let k = -2; k <= 2; k++) g.lineBetween(h.x + k * 10 + sh, h.y - 27, h.x + k * 5 + sh, h.y + 2);
        // The heaped pigment in the hopper's mouth.
        g.fillStyle(dim(col, 0.15), 1); g.fillEllipse(h.x + sh, h.y - 30, 50, 12);
        g.fillStyle(col, 1); g.fillEllipse(h.x + sh, h.y - 32, 40, 9);
        g.fillStyle(lit(col, 0.4), 1); g.fillEllipse(h.x - 6 + sh, h.y - 34, 12, 4);
        // The chute, angled at the yard.
        g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(h.x, h.y, m.x, m.y);
        g.lineStyle(5, TIMBER_LIT, 1); g.lineBetween(h.x, h.y, m.x, m.y);
        g.lineStyle(3, col, 0.9); g.lineBetween(h.x + ca * 8, h.y + sa * 8, m.x, m.y);
        // Readiness: a brass shutter-pin lit when the hopper can be struck again.
        const ready = time >= h.readyAt && !h.windup;
        g.fillStyle(ready ? GOLD : GOLD_DARK, 1); g.fillCircle(h.x + sh, h.y - 12, 5);
        if (ready) { g.lineStyle(1.5, lit(GOLD, 0.5), 0.6 + 0.4 * Math.sin(time / 200)); g.strokeCircle(h.x + sh, h.y - 12, 8); }
        // Wind-up: a dashed aim line at the foe it will dust.
        if (h.windup) {
          const to = h.windup.at2, k = 1 - (h.windup.at - time) / JET_WINDUP;
          g.lineStyle(2, col, 0.3 + 0.5 * k);
          const dx = to.x - m.x, dy = to.y - m.y;
          for (let s = 0; s < 1; s += 0.1) g.lineBetween(m.x + dx * s, m.y + dy * s, m.x + dx * (s + 0.05), m.y + dy * (s + 0.05));
        }
      }
      // Assayed: a mud splash and the assay seal pressed into it.
      for (const f of [player, npc]) {
        const t = time - (mud.get(f) ?? -1e9);
        if (t > 1600) continue;
        const k = t / 1600;
        g.fillStyle(UMBER_DARK, 0.6 * (1 - k)); g.fillEllipse(f.x, f.y + 8, 80, 30);
        g.fillStyle(UMBER, 0.7 * (1 - k)); g.fillEllipse(f.x - 6, f.y + 6, 60, 20);
        for (let s = 0; s < 6; s++) { const a = s * 1.05; g.fillStyle(UMBER, 0.7 * (1 - k)); g.fillCircle(f.x + Math.cos(a) * 44, f.y + 8 + Math.sin(a) * 16, 5); }
      }
    },

    drawAir(g, time) {
      for (const c of clouds) {
        const col = COLS[c.c];
        const age = time - c.born;
        const fade = clamp(age / 300, 0, 1) * clamp((c.life - age) / 900, 0, 1);
        if (c.jet) {
          // A hard jet: a dense head and a streaming tail.
          const sp = Math.hypot(c.vx, c.vy) || 1, ux = c.vx / sp, uy = c.vy / sp;
          for (let k = 5; k >= 0; k--) {
            g.fillStyle(col, (0.12 + 0.08 * (5 - k)) * fade);
            g.fillCircle(c.x - ux * k * 12, c.y - uy * k * 12, c.r * (0.55 + 0.08 * (5 - k)));
          }
          g.fillStyle(lit(col, 0.4), 0.7 * fade); g.fillCircle(c.x, c.y, c.r * 0.45);
          continue;
        }
        // A drifting cloud: lumps turning slowly round a denser core, motes falling out of it.
        for (let k = 0; k < 7; k++) {
          const a = c.seed + k * 0.9 + time / 2400;
          const rr = c.r * (0.45 + 0.12 * Math.sin(k * 2.1 + time / 700));
          g.fillStyle(k % 2 ? col : lit(col, 0.25), 0.2 * fade);
          g.fillCircle(c.x + Math.cos(a) * c.r * 0.45, c.y + Math.sin(a) * c.r * 0.38, rr);
        }
        g.fillStyle(col, 0.3 * fade); g.fillCircle(c.x, c.y, c.r * 0.5);
        for (let k = 0; k < 5; k++) {
          const ph = ((time / 900 + k * 0.21 + c.seed) % 1);
          g.fillStyle(dim(col, 0.2), 0.6 * fade * (1 - ph));
          g.fillCircle(c.x + Math.sin(k * 3.3 + c.seed) * c.r * 0.6, c.y + c.r * 0.2 + ph * 22, 1.6);
        }
      }
      // Coats on the fighters: a dusting of each primary; mixed, the secondary sheen and its sign.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const cs = coatOf(f);
        cs.forEach((k, i) => {
          const fade = clamp((k.until - time) / 1200, 0.25, 1);
          g.fillStyle(COLS[k.c], 0.45 * fade);
          g.slice(f.x, f.y - 6, 22, i === 0 ? Math.PI / 2 : -Math.PI / 2, i === 0 ? Math.PI * 1.5 : Math.PI / 2, false);
          g.fillPath();
          for (let s = 0; s < 4; s++) { g.fillStyle(COLS[k.c], 0.8 * fade); g.fillCircle(f.x + (i === 0 ? -1 : 1) * (8 + s * 3), f.y - 16 + s * 7, 1.8); }
        });
        const m = mixOf(f);
        if (m) {
          const col = MIX[cs[0].c + cs[1].c - 1];
          g.lineStyle(2.5, col, 0.85); g.strokeCircle(f.x, f.y - 6, 25 + Math.sin(time / 160) * 1.5);
          if (m === 'orange') for (let s = 0; s < 3; s++) {
            const x = f.x - 14 + s * 14, h = 9 + 4 * Math.sin(time / 90 + s);
            g.fillStyle(col, 0.9); g.fillTriangle(x - 4, f.y - 34, x + 4, f.y - 34, x, f.y - 34 - h);
          }
          if (m === 'green') for (let s = 0; s < 4; s++) {
            const ph = (time / 1100 + s / 4) % 1;
            g.fillStyle(col, 0.9 * (1 - ph)); g.fillEllipse(f.x - 12 + s * 8, f.y - 20 - ph * 26, 4, 6);
          }
          if (m === 'violet') {
            g.lineStyle(2, col, 0.9); g.beginPath();
            g.arc(f.x, f.y - 44, 8, time / 120, time / 120 + 4.2, false); g.strokePath();
          }
        }
        // One colour from mud: the missing primary pulses as a ring of warning motes.
        const third = missing(f);
        if (third >= 0) {
          for (let s = 0; s < 8; s++) {
            const a = s * 0.785 + time / 500;
            g.fillStyle(COLS[third], 0.5 + 0.4 * Math.sin(time / 120)); g.fillCircle(f.x + Math.cos(a) * 32, f.y - 6 + Math.sin(a) * 32, 2);
          }
        }
        // Assayed: the seal stamped over the head.
        const t = time - (mud.get(f) ?? -1e9);
        if (t < 1100) {
          const k = t / 1100, y = f.y - 50 - k * 8;
          g.fillStyle(OCHRE, 1 - k); g.fillCircle(f.x, y, 11);
          g.lineStyle(2, UMBER_DARK, 1 - k); g.strokeCircle(f.x, y, 11); g.strokeCircle(f.x, y, 7);
          g.lineBetween(f.x - 5, y - 5, f.x + 5, y + 5); g.lineBetween(f.x + 5, y - 5, f.x - 5, y + 5);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      framePlate(g, x, y, 236, 34);
      for (const [f, col, ox] of [[player, SIDE_PLAYER, -108], [npc, SIDE_NPC, 12]] as const) {
        g.fillStyle(col, 1); g.fillCircle(x + ox + 6, y + 17, 4);
        const cs = coatOf(f);
        for (let i = 0; i < 2; i++) {
          const sx = x + ox + 16 + i * 20, sy = y + 9;
          g.fillStyle(CANVAS_DARK, 1); g.fillRect(sx, sy, 16, 16);
          if (cs[i]) {
            g.fillStyle(COLS[cs[i].c], 1); g.fillRect(sx + 1, sy + 1, 14, 14);
            const k = clamp((cs[i].until - time) / 9000, 0, 1);
            g.fillStyle(CANVAS, 1); g.fillRect(sx + 1, sy + 13, 14 * (1 - k), 2);
          } else { g.lineStyle(1, dim(CANVAS_DARK, 0.2), 1); g.strokeRect(sx + 2, sy + 2, 12, 12); }
        }
        // The mix chip, or the warning of the colour that would mud.
        const mx = x + ox + 66, my = y + 17;
        const m = mixOf(f);
        if (m) { g.fillStyle(MIX[cs[0].c + cs[1].c - 1], 1); g.fillCircle(mx, my, 8); g.lineStyle(1.5, GOLD_DARK, 1); g.strokeCircle(mx, my, 8); }
        const third = missing(f);
        if (third >= 0) {
          g.fillStyle(UMBER, 1); g.fillCircle(mx + 20, my, 6);
          g.lineStyle(2, COLS[third], 0.6 + 0.4 * Math.sin(time / 120)); g.strokeCircle(mx + 20, my, 8);
        }
      }
    },

    destroy() { for (const h of hoppers) h.target?.remove(); clouds.length = 0; },
  };
}

export const FALLEN_GROUND_FINE: GimmickDef = {
  id: ID,
  rules: 'Mill dust coats you. Two colours mix: orange bites, green mends, violet quickens. A third is mud: assayed. Strike a hopper to dust your foe.',
  make,
};
