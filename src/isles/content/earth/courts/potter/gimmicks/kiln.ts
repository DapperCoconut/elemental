import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit, mixC } from '../../../../../art/IsleArt';
import { kilnFront } from '../art';
import { BISQUE, BISQUE_DARK, BISQUE_LIT, FIRE, FIRE_DEEP, FIRE_LIT, SLIP, SLIP_DARK, SLIP_DEEP, SLIP_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Kiln Firing — Kilnwright Saggar.
 *
 * Kilns are built into the yard walls, top and bottom, their mouths facing across. They fire one
 * at a time: the iron door glows first, brighter and brighter, then the kiln jets heat straight
 * across its lane. Caught dry in a jet, you are scorched.
 *
 * But the floor is puddled with slip, and slip soaks in. Anyone wet with slip when the heat
 * catches them is not burned but *baked*: fired hard into a bisque shell — armoured, taking half
 * damage, but stiff and slow. And a shell is brittle: a second jet on a baked fighter dunts the
 * shell apart, and that hurts more than any scorch. Wet yourself and stand in the fire to take
 * the armour; keep Saggar dry and catch him twice.
 */

const LANE_HALF = 40;
const WARN_MS = 1500;
const FIRE_MS = 900;
const SCORCH = 13;
const DUNT = 18;
const BAKED_MS = 4500;
const POOL_R = 48;

interface Kiln { x: number; down: boolean; warnAt: number; fireAt: number; endAt: number; dealt: Set<Fighter> }
interface Puddle { x: number; y: number; r: number; born: number; dieAt: number }
interface Body { wet: number; bakedUntil: number; dripAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const kilns: Kiln[] = [];
  for (const x of [150, 370, 590, 810]) kilns.push({ x, down: true, warnAt: -1, fireAt: -1, endAt: -1, dealt: new Set() });
  for (const x of [260, 480, 700]) kilns.push({ x, down: false, warnAt: -1, fireAt: -1, endAt: -1, dealt: new Set() });
  const puddles: Puddle[] = [];
  const bodies = new Map<Fighter, Body>([[player, { wet: 0, bakedUntil: 0, dripAt: 0 }], [npc, { wet: 0, bakedUntil: 0, dripAt: 0 }]]);
  const every = ctx.hard ? 2000 : 2600;
  let nextFire = 0;
  let lastKiln = -1;
  let started = false;
  let nextPuddle = 0;

  const inLane = (k: Kiln, f: Fighter) => Math.abs(f.x - k.x) < LANE_HALF;
  const live = (k: Kiln, time: number) => k.fireAt >= 0 && time >= k.fireAt && time < k.endAt;
  const warning = (k: Kiln, time: number) => k.warnAt >= 0 && time < k.fireAt;

  function placePuddle(time: number): void {
    // Spread out: try a few spots, keep the one furthest from the others.
    let best: Pt = { x: W / 2, y: (top + H) / 2 };
    let bs = -1;
    for (let i = 0; i < 6; i++) {
      const p = { x: 90 + rng() * (W - 180), y: top + 110 + rng() * (H - top - 220) };
      const s = puddles.reduce((m, q) => Math.min(m, dist(p.x, p.y, q.x, q.y)), 999);
      if (s > bs) { bs = s; best = p; }
    }
    puddles.push({ x: best.x, y: best.y, r: POOL_R * (0.85 + rng() * 0.3), born: time, dieAt: time + 15000 + rng() * 5000 });
  }

  function bake(f: Fighter, time: number): void {
    const b = bodies.get(f);
    if (!b) return;
    if (time < b.bakedUntil) {
      // A second firing on a shell: it dunts apart.
      b.bakedUntil = 0;
      ctx.hit(f, DUNT, f.x, f.y);
      ctx.stun(f, 500);
      ctx.float(f.x, f.y - 48, 'DUNTED!', '#ffd27a');
      ctx.sfx('crystal-shatter');
    } else if (b.wet >= 0.35) {
      b.wet = 0;
      b.bakedUntil = time + BAKED_MS;
      ctx.float(f.x, f.y - 48, 'BAKED HARD', '#f6e2c8');
      ctx.sfx('sizzle');
    } else {
      ctx.hit(f, SCORCH, f.x, f.y);
      ctx.float(f.x, f.y - 48, 'SCORCHED', '#ff8a2a');
      ctx.sfx('flame-burst');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextFire = time + 2200;
        for (let i = 0; i < 3; i++) placePuddle(time);
        nextPuddle = time + 5000;
      }
      // Puddles come and go.
      for (let i = puddles.length - 1; i >= 0; i--) if (time > puddles[i].dieAt) puddles.splice(i, 1);
      if (time >= nextPuddle) { nextPuddle = time + 5000; if (puddles.length < 4) placePuddle(time); }

      // The firing order.
      if (time >= nextFire) {
        nextFire = time + every;
        let i = Math.floor(rng() * kilns.length);
        if (i === lastKiln) i = (i + 1 + Math.floor(rng() * (kilns.length - 1))) % kilns.length;
        // Now and then, the kiln in line with you.
        if (rng() < 0.4) {
          let bi = i, bd = 9999;
          kilns.forEach((k, j) => { const d = Math.abs(k.x - player.x); if (d < bd && j !== lastKiln) { bd = d; bi = j; } });
          i = bi;
        }
        lastKiln = i;
        const k = kilns[i];
        k.warnAt = time; k.fireAt = time + WARN_MS; k.endAt = k.fireAt + FIRE_MS; k.dealt.clear();
        ctx.sfx('beam-charge');
      }
      for (const k of kilns) {
        if (k.fireAt >= 0 && time >= k.fireAt && time - dt * 1000 < k.fireAt) ctx.sfx('inferno');
        if (!live(k, time)) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || k.dealt.has(f) || !inLane(k, f)) continue;
          k.dealt.add(f);
          bake(f, time);
        }
      }

      // Wetting and drying.
      for (const [f, b] of bodies) {
        if (!alive(f)) continue;
        const inSlip = puddles.some((p) => dist(p.x, p.y, f.x, f.y) < p.r);
        b.wet = clamp(b.wet + (inSlip ? 1.3 : -0.11) * dt, 0, 1);
        if (b.wet > 0.2 && time >= b.dripAt) b.dripAt = time + 260;
      }
    },

    playerSpeedMult() {
      const b = bodies.get(player);
      return b && ctx.scene.time.now < b.bakedUntil ? 0.6 : 1;
    },
    npcSpeedMult() {
      const b = bodies.get(npc);
      return b && ctx.scene.time.now < b.bakedUntil ? 0.6 : 1;
    },
    playerTakenMult() {
      const b = bodies.get(player);
      return b && ctx.scene.time.now < b.bakedUntil ? 0.5 : 1;
    },
    npcTakenMult() {
      const b = bodies.get(npc);
      return b && ctx.scene.time.now < b.bakedUntil ? 0.5 : 1;
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const b = bodies.get(npc);
      const danger = kilns.filter((k) => warning(k, time) || live(k, time));
      const baked = !!b && time < b.bakedUntil;
      // Out of any lane that is about to fire — or one that is firing while he is still a shell.
      const threatened = danger.find((k) => inLane(k, npc));
      if (threatened && (baked || (b && b.wet < 0.35) || rng() < 0.02)) {
        const side = npc.x < threatened.x ? -1 : 1;
        return { x: clamp(threatened.x + side * (LANE_HALF + 46), 60, W - 60), y: clamp(npc.y, top + 60, H - 50) };
      }
      // He knows the trick: soak up, then stand in a warning lane for the armour.
      if (b && !baked && b.wet < 0.4 && puddles.length && (npc.hp < npc.maxHp * 0.6)) {
        let best = puddles[0];
        for (const p of puddles) if (dist(p.x, p.y, npc.x, npc.y) < dist(best.x, best.y, npc.x, npc.y)) best = p;
        return { x: best.x, y: best.y };
      }
      if (b && !baked && b.wet >= 0.5) {
        const w = danger.find((k) => warning(k, time));
        if (w) return { x: w.x, y: clamp(npc.y, top + 60, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // Lanes: a scorched streak down each one; a shimmer down a warning lane; the jet itself.
      for (const k of kilns) {
        g.fillStyle(0x1a0e0a, 0.12); g.fillRect(k.x - LANE_HALF, top, LANE_HALF * 2, H - top);
        if (warning(k, time)) {
          const t = clamp((time - k.warnAt) / WARN_MS, 0, 1);
          g.fillStyle(FIRE, 0.06 + t * 0.16); g.fillRect(k.x - LANE_HALF, top, LANE_HALF * 2, H - top);
          for (let i = 0; i < 8; i++) {
            const y = top + ((time / 6 + i * 70) % (H - top));
            g.lineStyle(1.5, FIRE_LIT, 0.15 + t * 0.3);
            g.lineBetween(k.x - LANE_HALF + 6, y, k.x - LANE_HALF + 10 + Math.sin(y / 20) * 4, y - 14);
            g.lineBetween(k.x + LANE_HALF - 6, y + 30, k.x + LANE_HALF - 10 + Math.sin(y / 20) * 4, y + 16);
          }
          g.lineStyle(2, FIRE, 0.3 + t * 0.6); g.strokeRect(k.x - LANE_HALF, top, LANE_HALF * 2, H - top);
        }
      }
      // Slip puddles: thick, glossy, a skin of wrinkles; they shrink as they dry out.
      for (const p of puddles) {
        const fade = clamp((p.dieAt - time) / 1500, 0, 1) * clamp((time - p.born) / 600, 0, 1);
        const r = p.r * (0.6 + fade * 0.4);
        g.fillStyle(SLIP_DEEP, 0.55 * fade); g.fillEllipse(p.x + 3, p.y + 3, r * 2.1, r * 1.5);
        g.fillStyle(SLIP_DARK, 0.9 * fade); g.fillEllipse(p.x, p.y, r * 2, r * 1.4);
        g.fillStyle(SLIP, 0.9 * fade); g.fillEllipse(p.x - 3, p.y - 3, r * 1.7, r * 1.1);
        g.fillStyle(SLIP_LIT, 0.45 * fade); g.fillEllipse(p.x - r * 0.35, p.y - r * 0.3, r * 0.6, r * 0.22);
        for (let i = 0; i < 4; i++) {
          g.lineStyle(1, SLIP_DARK, 0.4 * fade);
          g.beginPath(); g.arc(p.x + (i - 1.5) * r * 0.35, p.y + (i % 2) * 8, r * 0.25, Math.PI * 1.1, Math.PI * 1.8, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      // The kilns in the walls.
      for (const k of kilns) {
        const heat = warning(k, time) ? clamp((time - k.warnAt) / WARN_MS, 0, 1) : live(k, time) ? 1 : 0.05;
        kilnFront(g, k.x, k.down ? top - 4 : H + 4, 66, k.down, heat);
      }
      // The jets: a column of heat, white at the core, ragged flame at the edges, sparks riding it.
      for (const k of kilns) {
        if (!live(k, time)) continue;
        const t = (time - k.fireAt) / FIRE_MS;
        const a = Math.sin(t * Math.PI);
        const y0 = k.down ? top + 36 : H - 36, y1 = k.down ? H : top;
        const ylo = Math.min(y0, y1), yhi = Math.max(y0, y1);
        g.fillStyle(FIRE_DEEP, 0.45 * a); g.fillRect(k.x - LANE_HALF, ylo, LANE_HALF * 2, yhi - ylo);
        g.fillStyle(FIRE, 0.55 * a); g.fillRect(k.x - LANE_HALF * 0.7, ylo, LANE_HALF * 1.4, yhi - ylo);
        g.fillStyle(FIRE_LIT, 0.7 * a); g.fillRect(k.x - LANE_HALF * 0.3, ylo, LANE_HALF * 0.6, yhi - ylo);
        for (let i = 0; i < 14; i++) {
          const ph = ((time / 300) + i / 14) % 1;
          const yy = k.down ? y0 + ph * (y1 - y0) : y0 - ph * (y0 - y1);
          const xx = k.x + Math.sin(i * 2.3 + time / 90) * LANE_HALF * 0.9;
          g.fillStyle(i % 2 ? FIRE_LIT : 0xffffff, a * (1 - ph)); g.fillCircle(xx, yy, 2 + (i % 3));
          g.fillStyle(FIRE, a * 0.5); g.fillTriangle(xx - 6, yy, xx + 6, yy, xx, yy + (k.down ? -16 : 16));
        }
      }
      // Wet fighters drip; baked fighters wear a crackled bisque shell.
      for (const [f, b] of bodies) {
        if (!alive(f)) continue;
        if (time < b.bakedUntil) {
          const left = clamp((b.bakedUntil - time) / BAKED_MS, 0, 1);
          g.fillStyle(BISQUE, 0.55); g.fillEllipse(f.x, f.y - 8, 52, 60);
          g.lineStyle(2, BISQUE_DARK, 0.9); g.strokeEllipse(f.x, f.y - 8, 52, 60);
          g.fillStyle(BISQUE_LIT, 0.6); g.fillEllipse(f.x - 10, f.y - 24, 12, 18);
          g.lineStyle(1, 0x5a3a24, 0.8);
          g.lineBetween(f.x - 12, f.y - 30, f.x - 4, f.y - 14); g.lineBetween(f.x - 4, f.y - 14, f.x - 14, f.y + 4);
          g.lineBetween(f.x + 8, f.y - 34, f.x + 14, f.y - 10); g.lineBetween(f.x + 14, f.y - 10, f.x + 6, f.y + 10);
          g.lineStyle(2, mixC(BISQUE_DARK, FIRE, 0.4), 0.8); g.beginPath(); g.arc(f.x, f.y - 8, 30, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        } else if (b.wet > 0.05) {
          g.fillStyle(SLIP, 0.35 * b.wet); g.fillEllipse(f.x, f.y + 4, 34, 12);
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 500) + i / 3) % 1;
            g.fillStyle(SLIP_DARK, b.wet * (1 - ph)); g.fillCircle(f.x - 10 + i * 10, f.y - 20 + ph * 26, 2.2);
          }
          g.lineStyle(2, lit(SLIP, 0.2), 0.6 * b.wet); g.strokeEllipse(f.x, f.y - 8, 44, 52);
        }
      }
    },

    drawHud(g) {
      // A wet gauge each side: dry → soaked (enough to bake), with a kiln-brick mark at the line.
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const b = bodies.get(f);
        if (!b) continue;
        const w = 110, y = top + 10, x0 = d > 0 ? x : x - w;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const baked = ctx.scene.time.now < b.bakedUntil;
        const fw = baked ? w : w * b.wet;
        g.fillStyle(baked ? BISQUE : b.wet >= 0.35 ? SLIP_LIT : SLIP, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        const mx = d > 0 ? x0 + w * 0.35 : x0 + w * 0.65;
        g.fillStyle(FIRE, 1); g.fillRect(mx - 1, y - 3, 2, 14);
      }
    },
  };
}

export const KILN_FIRING: GimmickDef = {
  id: 'potter-kiln',
  rules: 'Kilns fire across their lanes (the door glows first). Dry, you scorch. Wet with slip, you bake hard: half damage but slow. A second firing dunts the shell apart.',
  make,
};
