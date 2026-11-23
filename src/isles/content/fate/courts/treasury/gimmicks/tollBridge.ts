import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { coin, tollBox, turnstile } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, GOLD, GOLD_LIT, IRON_DARK, LACQUER } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Toll Bridge — Tollman Levy.
 *
 * Two brass railings run the length of the bridge and split it into three lanes; the only ways
 * through them are four turnstiles. Try the rail anywhere else and it throws you back. Every
 * pass through a turnstile costs a toll of health — unless you are carrying a brass token, which
 * the turnstile takes instead.
 *
 * Every toll paid drops into the toll-box in the middle lane, and the box pays out tokens when it
 * is struck: one, plus one for every toll inside it. Levy is the tollman's son and pays nothing,
 * so he says; but he passes through the same gates as you. Make him chase you through them, then
 * break the box open and walk free. Now and then he hikes the toll — the gates go red; wait it out.
 */

const GAP = 36;
const TOLL = 8;
const MAX_TOKENS = 3;
const BOX_COOLDOWN = 2600;
const HIKE_EVERY = 11000;
const HIKE_MS = 4000;

interface Gate { x: number; y: number; spin: number; spunAt: number }
interface Token { x: number; y: number; vx: number; vy: number; bornAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const rails = [W / 3, (2 * W) / 3];
  const gateYs = [top + (H - top) * 0.28, top + (H - top) * 0.74];
  const gates: Gate[][] = rails.map((x) => gateYs.map((y) => ({ x, y, spin: 0, spunAt: -9999 })));
  const BOX = { x: W / 2, y: (top + H) / 2 + 10 };
  const tokens: Token[] = [];
  const carried = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const sideOf = (x: number) => (x < rails[0] ? 0 : x < rails[1] ? 1 : 2);
  const lastSide = new Map<Fighter, number>();
  const lastY = new Map<Fighter, number>();
  let tollsInBox = 0;
  let boxReadyAt = 0;
  let boxStruckAt = -9999;
  let nextHike = 0;
  let hikeUntil = 0;
  let started = false;
  const toll = () => (ctx.hard ? TOLL + 2 : TOLL) * (ctx.scene.time.now < hikeUntil ? 2 : 1);

  function payOut(by: 'player' | 'npc', time: number): void {
    if (time < boxReadyAt) return;
    boxReadyAt = time + BOX_COOLDOWN;
    boxStruckAt = time;
    const n = Math.min(4, 1 + tollsInBox);
    tollsInBox = 0;
    ctx.sfx('jackpot');
    ctx.float(BOX.x, BOX.y - 64, n > 1 ? `${n} TOKENS` : 'A TOKEN', '#ffe27a');
    // They spill toward the striker, mostly; one always rolls off at random.
    const f = by === 'player' ? player : npc;
    for (let i = 0; i < n; i++) {
      const a = (i === n - 1 ? ctx.rng() * Math.PI * 2 : Math.atan2(f.y - BOX.y, f.x - BOX.x) + (ctx.rng() - 0.5) * 1.2);
      const sp = 110 + ctx.rng() * 80;
      tokens.push({ x: BOX.x, y: BOX.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, bornAt: time });
    }
  }

  const box: StrikeTarget = ctx.target({ x: BOX.x, y: BOX.y - 30, r: 30, passThrough: true, onStruck: (by) => payOut(by, ctx.scene.time.now) });

  const bounceAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  /** A fighter has crossed rail `ri`, at height y: through a gate, or thrown back. */
  function cross(f: Fighter, ri: number, from: number, y: number, time: number): boolean {
    const gate = gates[ri].find((gt) => Math.abs(y - gt.y) < GAP);
    if (!gate) {
      const back = rails[ri] + (from <= ri ? -18 : 18);
      ctx.nudge(f, back - f.x, 0);
      if (time - bounceAt.get(f)! > 900) { ctx.sfx('boing'); bounceAt.set(f, time); }
      return false;
    }
    gate.spunAt = time;
    const n = carried.get(f) ?? 0;
    if (n > 0) {
      carried.set(f, n - 1);
      ctx.float(gate.x, gate.y - 54, 'TOKEN', '#ffe27a');
      ctx.sfx('dice');
    } else {
      const t = toll();
      ctx.hit(f, t, gate.x, gate.y);
      tollsInBox = Math.min(3, tollsInBox + 1);
      ctx.float(gate.x, gate.y - 54, `TOLL −${t}`, '#ff9a8a');
      ctx.sfx('money');
    }
    return true;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextHike = time + HIKE_EVERY;
        ctx.banner('TOLL TO PASS', '#ffe27a');
      }
      if (time >= nextHike) {
        nextHike = time + HIKE_EVERY;
        hikeUntil = time + HIKE_MS;
        ctx.banner('LEVY HIKES THE TOLL', '#ff9a8a');
        ctx.sfx('gust');
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const was = lastSide.get(f);
        const now = sideOf(f.x);
        const py = lastY.get(f) ?? f.y;
        if (was === undefined) { lastSide.set(f, now); lastY.set(f, f.y); continue; }
        if (now !== was) {
          const step = now > was ? 1 : -1;
          // Crossed one rail (or, dashing, two — each is checked in turn).
          let side = was;
          while (side !== now) {
            const ri = step > 0 ? side : side - 1;
            if (!cross(f, ri, side, (py + f.y) / 2, time)) break;
            side += step;
          }
          lastSide.set(f, side);
        }
        lastY.set(f, f.y);
      }
      for (const row of gates) for (const gt of row) gt.spin += dt * (time - gt.spunAt < 500 ? 9 : 0.4);
      // Tokens roll, settle and are picked up.
      for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i];
        if (time - t.bornAt < 500) {
          const nx = t.x + t.vx * dt;
          // Tokens do not roll through the rails (except at a gate).
          if (sideOf(nx) === sideOf(t.x) || gates.some((r) => r.some((gt) => Math.abs(t.y - gt.y) < GAP))) t.x = clamp(nx, 40, W - 40); else t.vx = -t.vx;
          t.y = clamp(t.y + t.vy * dt, top + 30, H - 30);
          t.vx *= 1 - dt * 2.5; t.vy *= 1 - dt * 2.5;
          continue;
        }
        let taken = false;
        for (const f of [player, npc]) {
          const n = carried.get(f) ?? 0;
          if (!alive(f) || n >= MAX_TOKENS || dist(f.x, f.y, t.x, t.y) > 46) continue;
          carried.set(f, n + 1);
          ctx.sfx('sparkle');
          taken = true;
          break;
        }
        if (taken || time - t.bornAt > 18000) tokens.splice(i, 1);
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const ns = sideOf(npc.x), ps = sideOf(player.x);
      const mine = carried.get(npc) ?? 0;
      // A loose token in his lane: take it.
      for (const t of tokens) if (now - t.bornAt > 500 && sideOf(t.x) === ns && dist(t.x, t.y, npc.x, npc.y) < 300) return { x: t.x, y: t.y };
      // Broke and the box is fat and in reach: break it open.
      if (mine === 0 && ns === 1 && now >= boxReadyAt && tollsInBox >= 1) return { x: BOX.x + (npc.x < BOX.x ? -50 : 50), y: BOX.y };
      if (ns === ps || now < hikeUntil) {
        // Same lane (or the toll is hiked and he will not pay it): hold off at a duelling distance.
        return { x: clamp(player.x + (npc.x < player.x ? -200 : 200), 60, W - 60), y: clamp(player.y + 60, top + 50, H - 50) };
      }
      // Route through the nearest gate on the rail between.
      const step = ps > ns ? 1 : -1;
      const ri = step > 0 ? ns : ns - 1;
      const gate = gates[ri].reduce((a, b) => (Math.abs(b.y - npc.y) + Math.abs(b.y - player.y) < Math.abs(a.y - npc.y) + Math.abs(a.y - player.y) ? b : a));
      if (Math.abs(npc.y - gate.y) > 18) return { x: gate.x - step * 60, y: gate.y };
      return { x: gate.x + step * 80, y: gate.y };
    },

    drawGround(g, time) {
      const hiked = time < hikeUntil;
      // Bridge planks under all three lanes, and the rails' shadows.
      for (let y = top + 10; y < H; y += 26) { g.lineStyle(1, 0x000000, 0.12); g.lineBetween(0, y, W, y); }
      for (const rx of rails) {
        g.fillStyle(0x000000, 0.18); g.fillRect(rx - 6, top, 12, H - top);
        // Rail sections between the gates.
        const segs: [number, number][] = [[top, gateYs[0] - GAP], [gateYs[0] + GAP, gateYs[1] - GAP], [gateYs[1] + GAP, H]];
        for (const [y0, y1] of segs) {
          g.fillStyle(BRASS_DARK, 1); g.fillRect(rx - 4, y0, 8, y1 - y0);
          g.fillStyle(BRASS, 1); g.fillRect(rx - 2.5, y0, 5, y1 - y0);
          for (let y = y0 + 8; y < y1 - 4; y += 26) {
            g.fillStyle(BRASS_LIT, 1); g.fillCircle(rx, y, 4.5);
            g.fillStyle(LACQUER, 1); g.fillTriangle(rx - 4, y - 4, rx + 4, y - 4, rx, y - 14);
          }
        }
        // Gate mouths: chequered thresholds, red when hiked.
        for (const gy of gateYs) {
          for (let k = -2; k < 2; k++) for (let j = -1; j < 1; j++) {
            g.fillStyle((k + j) & 1 ? (hiked ? CARD_RED : 0x1e1a1c) : (hiked ? 0xff6a5a : 0x9a2230), 0.55);
            g.fillRect(rx - 24 + (j + 1) * 24, gy + k * 18, 24, 18);
          }
        }
      }
      // Tokens on the floor: brass discs punched with a square hole.
      for (const t of tokens) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(t.x + 1, t.y + 3, 20, 9);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(t.x, t.y + 1, 18, 9);
        g.fillStyle(BRASS, 1); g.fillEllipse(t.x, t.y, 18, 8.5);
        g.fillStyle(IRON_DARK, 1); g.fillRect(t.x - 2.5, t.y - 1.5, 5, 3);
      }
      // The toll-box.
      tollBox(g, BOX.x, BOX.y, 1.5, time - boxStruckAt < 160 ? 1 : 0);
      for (let i = 0; i < tollsInBox; i++) coin(g, BOX.x - 14 + i * 14, BOX.y - 80, 5, 'gold', 1, 'head');
      if (time < boxReadyAt) { g.lineStyle(2, BRASS, 0.5); g.beginPath(); g.arc(BOX.x, BOX.y - 40, 30, -Math.PI / 2, -Math.PI / 2 + (1 - (boxReadyAt - time) / BOX_COOLDOWN) * Math.PI * 2, false); g.strokePath(); }
    },

    drawAir(g, time) {
      const hiked = time < hikeUntil;
      for (const row of gates) {
        for (const gt of row) {
          turnstile(g, gt.x, gt.y + 16, gt.spin, 1.3, hiked ? 0xd85a4a : BRASS);
          if (time - gt.spunAt < 400) glow(g, gt.x, gt.y, 30, GOLD_LIT, 0.1 * (1 - (time - gt.spunAt) / 400), 2);
          // The wind whistling through the gate.
          for (let i = 0; i < 3; i++) {
            const ph = (time / 700 + i / 3 + gt.y * 0.01) % 1;
            g.lineStyle(1.2, 0xffffff, 0.25 * Math.sin(ph * Math.PI));
            g.lineBetween(gt.x - 40 + ph * 80, gt.y - 12 + i * 10, gt.x - 26 + ph * 80, gt.y - 12 + i * 10);
          }
        }
      }
      // Tokens carried: little brass discs in a row over the head.
      for (const f of [player, npc]) {
        const n = carried.get(f) ?? 0;
        if (!alive(f)) continue;
        for (let i = 0; i < n; i++) {
          const x = f.x - (n - 1) * 6 + i * 12, y = f.y - 54;
          g.fillStyle(BRASS, 1); g.fillCircle(x, y, 5); g.fillStyle(IRON_DARK, 1); g.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      }
    },

    drawHud(g, time) {
      if (time < hikeUntil) {
        const k = (hikeUntil - time) / HIKE_MS;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(W / 2 - 62, top + 6, 124, 14, 6);
        g.fillStyle(CARD_RED, 0.95); g.fillRoundedRect(W / 2 - 60, top + 8, 120 * k, 10, 5);
      }
      for (const [f, x, d] of [[player, 24, 1], [npc, W - 24, -1]] as [Fighter, number, number][]) {
        const n = carried.get(f) ?? 0;
        for (let i = 0; i < MAX_TOKENS; i++) {
          const cx = x + d * i * 18, cy = top + 14;
          if (i < n) { g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 7); g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 2, cy - 2, 4, 4); }
          else { g.lineStyle(1.5, GOLD, 0.35); g.strokeCircle(cx, cy, 7); }
        }
      }
    },

    destroy() { box.remove(); },
  };
}

export const TOLL_BRIDGE: GimmickDef = {
  id: 'treasury-toll-bridge',
  rules: 'Rails split the bridge into lanes; the turnstiles are the only way through, and each pass costs a toll of health — unless you carry a token. Strike the toll-box for tokens.',
  make,
};
