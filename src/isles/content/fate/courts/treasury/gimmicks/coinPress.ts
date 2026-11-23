import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { coin, coinFlat, coinPress, strikeSparks, tollBox } from '../art';
import { GOLD, GOLD_LIT, GOLD_PALE, IRON_DARK, MOLTEN_LIT, SOOT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Coin Press — Minter Stamp.
 *
 * Four great screw-presses stand in a row across the middle of the mint floor, and they stamp on
 * a beat, one after another, left to right and back. Each one's shadow darkens on the floor as its
 * die comes down; whoever is under it when it lands is crushed (hurt and stunned) — and every
 * stroke mints a coin, which spins out onto the floor beside the press.
 *
 * Coins are anybody's. Walk over one to pocket it. The till stands at the foot of the room:
 * strike it while you carry coins and it spends them all, firing one gold shot per coin at the
 * other fighter. Stamp knows the beat by heart and will stand you under a press if you let him;
 * turn it round — bait him under the next die, then cash his coin in.
 */

const PRESS_HALF_W = 52;
const PRESS_HALF_H = 40;
const WARN_MS = 1050;
const CRUSH_DMG = 15;
const CRUSH_STUN = 750;
const COIN_PICK = 28;
const MAX_POCKET = 6;
const SHOT_DMG = 6;

interface Press { x: number; y: number; warnAt: number; strikeAt: number; struckAt: number; spin: number }
interface FloorCoin { x: number; y: number; vx: number; vy: number; bornAt: number; landAt: number }
/** A gold shot fired at the npc (the player's are toolkit bullets). */
interface GoldShot { x: number; y: number; vx: number; vy: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const midY = (top + H) / 2 + 10;
  const presses: Press[] = [0, 1, 2, 3].map((i) => ({ x: 150 + i * ((W - 300) / 3), y: midY, warnAt: 0, strikeAt: 0, struckAt: -9999, spin: i }));
  const coins: FloorCoin[] = [];
  const shots: GoldShot[] = [];
  const pocket = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const TILL = { x: W / 2, y: H - 56 };
  let tillStruckAt = -9999;
  let tillLockUntil = 0;
  const beat = ctx.hard ? 880 : 1050;
  let order = 0;
  let dir = 1;
  let nextAt = 0;
  let started = false;

  const under = (p: Press, f: Fighter) => Math.abs(f.x - p.x) < PRESS_HALF_W && Math.abs(f.y - p.y) < PRESS_HALF_H;

  function cashIn(by: 'player' | 'npc', time: number): void {
    const f = by === 'player' ? player : npc;
    const n = pocket.get(f) ?? 0;
    if (n <= 0 || time < tillLockUntil) return;
    pocket.set(f, 0);
    tillStruckAt = time;
    tillLockUntil = time + 600;
    ctx.sfx('jackpot');
    ctx.float(TILL.x, TILL.y - 60, `${n} × GOLD`, '#ffe27a');
    for (let i = 0; i < n; i++) {
      tk.schedule(i * 140, () => {
        if (by === 'player') {
          if (!alive(npc)) return;
          const a = Math.atan2(npc.y - (TILL.y - 40), npc.x - TILL.x) + (i - (n - 1) / 2) * 0.06;
          shots.push({ x: TILL.x, y: TILL.y - 40, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, until: ctx.scene.time.now + 2400 });
        } else {
          const a = tk.angleToPlayer(TILL.x, TILL.y - 40) + (i - (n - 1) / 2) * 0.1;
          tk.spawnBullet({ x: TILL.x, y: TILL.y - 40, angle: a, speed: 330, damage: SHOT_DMG, r: 7, color: GOLD });
        }
        ctx.sfx('money');
      });
    }
  }

  const till: StrikeTarget = ctx.target({ x: TILL.x, y: TILL.y - 22, r: 30, passThrough: true, onStruck: (by) => cashIn(by, ctx.scene.time.now) });

  function strike(p: Press, time: number): void {
    p.struckAt = time;
    ctx.sfx('anvil');
    for (const f of [player, npc]) {
      if (!alive(f) || !under(p, f)) continue;
      ctx.hit(f, ctx.hard ? CRUSH_DMG + 3 : CRUSH_DMG, f.x, f.y);
      ctx.stun(f, CRUSH_STUN);
      ctx.float(f.x, f.y - 50, 'STAMPED', '#ffe27a');
    }
    // Mint a coin: it springs out the front or back of the press.
    const side = ctx.rng() < 0.5 ? -1 : 1;
    const a = (side < 0 ? -Math.PI / 2 : Math.PI / 2) + (ctx.rng() - 0.5) * 1.4;
    const sp = 130 + ctx.rng() * 70;
    if (coins.length < 10) coins.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, bornAt: time, landAt: time + 520 });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextAt = time + 1600;
        ctx.banner('THE PRESSES ARE RUNNING', '#ffe27a');
      }
      // The beat: schedule the next press's warning, sweeping left-right-left.
      if (time >= nextAt) {
        const p = presses[order];
        p.warnAt = time;
        p.strikeAt = time + tk.warn(WARN_MS);
        order += dir;
        if (order >= presses.length || order < 0) { dir = -dir; order += dir * 2; }
        nextAt = time + beat;
        // On hard, every fourth beat brings two presses down together.
        if (ctx.hard && Math.floor(time / beat) % 4 === 0) {
          const q = presses[(order + 2) % presses.length];
          if (q.strikeAt < time) { q.warnAt = time; q.strikeAt = time + tk.warn(WARN_MS); }
        }
      }
      for (const p of presses) {
        p.spin += dt * (time < p.strikeAt ? 5 : 1.2);
        if (p.strikeAt > 0 && time >= p.strikeAt && p.struckAt < p.strikeAt) strike(p, time);
      }
      // Coins in flight settle; landed coins are picked up.
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        if (time < c.landAt) {
          c.x = clamp(c.x + c.vx * dt, 40, W - 40); c.y = clamp(c.y + c.vy * dt, top + 30, H - 30);
          c.vx *= 1 - dt * 2.4; c.vy *= 1 - dt * 2.4;
          continue;
        }
        let taken = false;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, c.x, c.y) > COIN_PICK + 18) continue;
          const n = pocket.get(f) ?? 0;
          if (n >= MAX_POCKET) continue;
          pocket.set(f, n + 1);
          ctx.float(c.x, c.y - 20, '+1', '#ffe27a');
          ctx.sfx('money');
          taken = true;
          break;
        }
        if (taken || time - c.bornAt > 16000) coins.splice(i, 1);
      }
      // The player's gold shots at the foe.
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (alive(npc)) {
          // A little homing, so a cashed-in purse lands.
          const want = Math.atan2(npc.y - s.y, npc.x - s.x), cur = Math.atan2(s.vy, s.vx);
          const d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
          const na = cur + clamp(d, -1.6 * dt, 1.6 * dt);
          s.vx = Math.cos(na) * 440; s.vy = Math.sin(na) * 440;
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (alive(npc) && dist(s.x, s.y, npc.x, npc.y) < 26) {
          ctx.hit(npc, SHOT_DMG, s.x, s.y);
          ctx.flash(s.x, s.y, GOLD_LIT);
          shots.splice(i, 1);
          continue;
        }
        if (time > s.until || s.x < 0 || s.x > W || s.y < top || s.y > H) shots.splice(i, 1);
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const mine = pocket.get(npc) ?? 0;
      const danger = (x: number, y: number) => presses.some((p) => p.strikeAt > now && p.strikeAt - now < 900 && Math.abs(x - p.x) < PRESS_HALF_W + 24 && Math.abs(y - p.y) < PRESS_HALF_H + 24);
      // A purse worth spending: go and strike the till.
      if (mine >= 3) return { x: TILL.x + (npc.x < TILL.x ? -40 : 40), y: TILL.y - 60 };
      // The nearest landed coin that is not under a falling die.
      let best: FloorCoin | null = null, bd = Infinity;
      for (const c of coins) {
        if (now < c.landAt || danger(c.x, c.y)) continue;
        const d = dist(c.x, c.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (best && bd < 360) return { x: best.x, y: best.y };
      // Otherwise: stand off you across the row, out of every die's way.
      let x = player.x + (player.x < W / 2 ? 220 : -220), y = player.y < midY ? midY + 140 : midY - 140;
      if (danger(x, y)) y += y < midY ? -80 : 80;
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      for (const p of presses) {
        // The footprint: an iron bed-plate with hazard brass at its corners.
        g.fillStyle(IRON_DARK, 0.35); g.fillRect(p.x - PRESS_HALF_W, p.y - PRESS_HALF_H, PRESS_HALF_W * 2, PRESS_HALF_H * 2);
        g.lineStyle(2, GOLD, 0.35); g.strokeRect(p.x - PRESS_HALF_W, p.y - PRESS_HALF_H, PRESS_HALF_W * 2, PRESS_HALF_H * 2);
        for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
          g.fillStyle(GOLD, 0.6); g.fillTriangle(p.x + cx * PRESS_HALF_W, p.y + cy * PRESS_HALF_H, p.x + cx * (PRESS_HALF_W - 14), p.y + cy * PRESS_HALF_H, p.x + cx * PRESS_HALF_W, p.y + cy * (PRESS_HALF_H - 14));
        }
        // The darkening shadow of the coming die.
        if (time < p.strikeAt && time >= p.warnAt) {
          const k = clamp((time - p.warnAt) / Math.max(1, p.strikeAt - p.warnAt), 0, 1);
          g.fillStyle(0x000000, 0.12 + k * 0.45); g.fillRect(p.x - PRESS_HALF_W * (0.6 + k * 0.4), p.y - PRESS_HALF_H * (0.6 + k * 0.4), PRESS_HALF_W * 2 * (0.6 + k * 0.4), PRESS_HALF_H * 2 * (0.6 + k * 0.4));
          g.lineStyle(3, MOLTEN_LIT, 0.3 + k * 0.6); g.strokeRect(p.x - PRESS_HALF_W, p.y - PRESS_HALF_H, PRESS_HALF_W * 2, PRESS_HALF_H * 2);
        }
        // The dent of a strike, fading.
        const since = time - p.struckAt;
        if (since < 500) {
          const k = since / 500;
          g.lineStyle(4 * (1 - k), GOLD_PALE, 1 - k); g.strokeEllipse(p.x, p.y, 60 + k * 90, 30 + k * 40);
        }
      }
      // Coins on the floor (and in flight, spinning).
      for (const c of coins) {
        if (time < c.landAt) {
          const k = (time - c.bornAt) / Math.max(1, c.landAt - c.bornAt);
          coin(g, c.x, c.y - Math.sin(k * Math.PI) * 50, 7, 'gold', Math.cos(time / 40), 'head');
        } else {
          coinFlat(g, c.x, c.y, 8);
          const tw = (time / 600 + c.x * 0.01) % 1;
          if (tw < 0.2) { g.fillStyle(0xffffff, 0.8 * (1 - tw * 5)); g.fillCircle(c.x - 3, c.y - 2, 2); }
        }
      }
      // The till.
      tollBox(g, TILL.x, TILL.y, 1.4, time - tillStruckAt < 160 ? 1 : 0);
      if (time - tillStruckAt < 500) glow(g, TILL.x, TILL.y - 40, 40, GOLD_LIT, 0.1 * (1 - (time - tillStruckAt) / 500), 3);
    },

    drawAir(g, time) {
      for (const p of presses) {
        // The die comes down over the warning; springs back after the strike.
        let drop = 0;
        if (time < p.strikeAt && time >= p.warnAt) drop = clamp((time - p.warnAt) / Math.max(1, p.strikeAt - p.warnAt), 0, 1) ** 3;
        const since = time - p.struckAt;
        if (since >= 0 && since < 380) drop = 1 - since / 380;
        coinPress(g, p.x, p.y + PRESS_HALF_H - 4, 0.62, drop, p.spin, since < 600 ? 1 - since / 600 : 0);
        if (since < 420) strikeSparks(g, p.x, p.y + 4, since / 420, p.x);
        if (since < 900) { g.fillStyle(SOOT, 0.25 * (1 - since / 900)); g.fillCircle(p.x + since * 0.03, p.y - 110 - since * 0.06, 14 + since * 0.02); }
      }
      // Gold shots (the player's) — a coin streaking with a bright tail.
      for (const s of shots) {
        const a = Math.atan2(s.vy, s.vx);
        g.lineStyle(4, GOLD_LIT, 0.5); g.lineBetween(s.x, s.y, s.x - Math.cos(a) * 22, s.y - Math.sin(a) * 22);
        coin(g, s.x, s.y, 6, 'gold', Math.cos(time / 30), 'head');
      }
      // Each fighter's purse: coins stacked over their head.
      for (const f of [player, npc]) {
        const n = pocket.get(f) ?? 0;
        if (!alive(f) || n <= 0) continue;
        for (let i = 0; i < n; i++) coinFlat(g, f.x - (n - 1) * 5 + i * 10, f.y - 52 - (i % 2) * 2, 4.5);
      }
    },

    drawHud(g) {
      // Purses at the screen corners.
      for (const [f, x, d] of [[player, 24, 1], [npc, W - 24, -1]] as [Fighter, number, number][]) {
        const n = pocket.get(f) ?? 0;
        for (let i = 0; i < MAX_POCKET; i++) {
          const cx = x + d * i * 18, cy = top + 14;
          if (i < n) coin(g, cx, cy, 7, 'gold', 1, 'head');
          else { g.lineStyle(1.5, GOLD, 0.35); g.strokeCircle(cx, cy, 7); }
        }
      }
    },

    destroy() { till.remove(); },
  };
}

export const COIN_PRESS: GimmickDef = {
  id: 'treasury-coin-press',
  rules: 'Presses stamp on a beat — under one when it lands, you\'re crushed. Each stroke mints a coin: pick them up, strike the till to fire them at your foe.',
  make,
};
