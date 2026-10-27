import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_HOARD } from '../encounters';
import {
  EMBER, FLAME, FOE_C, GILT, GILT_DARK, GILT_LIT, INK, MINE_C, angDiff, clamp, curledDragon, dist, frameClock,
  hoardPile,
} from '../util';

/**
 * Dragon's Hoard — the old dragon sleeps curled round her hoard at the head of the yard, and gold
 * lies spilled across the floor. **Walk over gold to pocket it**: every piece makes your blows
 * land harder.
 *
 * But the dragon is a light sleeper. Every blow struck **near her head** stirs her (a blow far off
 * hardly does), and she stirs a little on her own. When her sleep runs out she lifts her head,
 * smoke curling, and **breathes a cone of fire at whoever holds the most gold** — it burns, and it
 * melts every coin they were carrying.
 *
 * The rule the player can turn: let Sir Galahand fill his helm. Then pick the fight right under
 * her nose.
 */

type Side = 'p' | 'n';
interface Coin { x: number; y: number; at: number; kind: number }
type DState = 'sleep' | 'wake' | 'breathe' | 'settle';

const PICK_R = 24;
const MAX_GOLD = 10;
const CONE_HALF = 0.36;
const RANGE = 640;

function makeDragonHoard(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const cx = W / 2, cy = top + 92, R = 120;
  const headA = Math.PI * 0.42;
  const wakeMs = hard ? 1250 : 1450;
  const stirMax = hard ? 80 : 100;
  const t0 = ctx.scene.time.now;

  let coins: Coin[] = [];
  const gold: Record<Side, number> = { p: 0, n: 0 };
  let stir = 20;
  const ds = { state: 'sleep' as DState, until: 0, aim: Math.PI / 2, target: 'p' as Side, dealtP: false, dealtN: false, wake: 0 };
  let nextCoin = t0 + 400;
  let selfHit = false;
  let rustleAt = -9999;
  const meltAt: Record<Side, number> = { p: -9999, n: -9999 };

  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  /** Where her head lies (it rises a little as she wakes). */
  const head = (): Pt => {
    const r = R + 18 + ds.wake * 14;
    return { x: cx + Math.cos(headA) * r, y: cy + Math.sin(headA) * r * 0.62 + 10 - ds.wake * 10 };
  };

  const spawnCoin = (): void => {
    for (let i = 0; i < 10; i++) {
      const x = 80 + ctx.rng() * (W - 160), y = cy + 140 + ctx.rng() * (H - cy - 200);
      if (coins.some((c) => dist(c.x, c.y, x, y) < 60)) continue;
      coins.push({ x, y, at: ctx.scene.time.now, kind: Math.floor(ctx.rng() * 3) });
      return;
    }
  };

  /** A blow struck: noise near her head stirs her a lot, far off hardly at all. */
  const noise = (victim: Side, amount: number): void => {
    if (selfHit || ds.state !== 'sleep' || amount <= 0) return;
    const f = fighter(victim), h = head();
    const near = dist(f.x, f.y, h.x, h.y) < 260;
    stir += amount * (near ? 1.4 : 0.2);
    if (near) rustleAt = ctx.scene.time.now;
  };

  const inCone = (x: number, y: number): boolean => {
    const h = head();
    const d = dist(x, y, h.x, h.y);
    return d < RANGE && Math.abs(angDiff(Math.atan2(y - h.y, x - h.x), ds.aim)) < CONE_HALF;
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      if (time >= nextCoin) {
        nextCoin = time + (hard ? 1500 : 1900);
        if (coins.length < 6) spawnCoin();
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || gold[s] >= MAX_GOLD || dist(f.x, f.y + 10, c.x, c.y) > PICK_R) continue;
          gold[s]++;
          coins.splice(i, 1);
          ctx.float(f.x, f.y - 50, `+GOLD (${gold[s]})`, s === 'p' ? '#ffe08a' : '#ffc070');
          ctx.sfx('money');
          break;
        }
      }

      if (ds.state === 'sleep') {
        stir += dt * (hard ? 3 : 2);
        ds.wake = Math.max(0, ds.wake - dt);
        if (stir >= stirMax) {
          ds.target = gold.p > gold.n ? 'p' : gold.n > gold.p ? 'n'
            : dist(ctx.player.x, ctx.player.y, cx, cy) <= dist(ctx.npc.x, ctx.npc.y, cx, cy) ? 'p' : 'n';
          ds.state = 'wake'; ds.until = time + ctx.tk.warn(wakeMs);
          ctx.float(cx, cy - 30, 'SHE WAKES', '#ffb070');
          ctx.sfx('roar');
        }
      } else if (ds.state === 'wake') {
        ds.wake = Math.min(1, ds.wake + dt * 2);
        const elapsed = ctx.tk.warn(wakeMs) - (ds.until - time);
        if (elapsed < ctx.tk.warn(wakeMs) * 0.7) {
          const t = fighter(ds.target), h = head();
          ds.aim = Math.atan2(t.y - h.y, t.x - h.x);
        }
        if (time >= ds.until) { ds.state = 'breathe'; ds.until = time + 800; ds.dealtP = false; ds.dealtN = false; ctx.sfx('inferno'); }
      } else if (ds.state === 'breathe') {
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || (s === 'p' ? ds.dealtP : ds.dealtN) || !inCone(f.x, f.y)) continue;
          if (s === 'p') ds.dealtP = true; else ds.dealtN = true;
          selfHit = true; ctx.hit(f, hard ? 24 : 20, f.x, f.y); selfHit = false;
          if (gold[s] > 0) { ctx.float(f.x, f.y - 52, `${gold[s]} GOLD MELTED`, '#ffb070'); gold[s] = 0; meltAt[s] = time; }
          ctx.sfx('status-burn');
        }
        if (time >= ds.until) { ds.state = 'settle'; ds.until = time + 900; }
      } else if (ds.state === 'settle') {
        ds.wake = Math.max(0, ds.wake - dt * 1.4);
        if (time >= ds.until) { ds.state = 'sleep'; stir = 0; }
      }
    },

    // Each piece of gold: +6% on your blows.
    npcTakenMult: () => 1 + gold.p * 0.06,
    playerTakenMult: () => 1 + gold.n * 0.06,

    onNpcHurt(amount) { noise('n', amount); },
    onPlayerHurt(amount) { noise('p', amount); },

    npcSeek(): Pt | null {
      const n = ctx.npc, h = head();
      if ((ds.state === 'wake' || ds.state === 'breathe') && inCone(n.x, n.y)) {
        const side = angDiff(Math.atan2(n.y - h.y, n.x - h.x), ds.aim) >= 0 ? 1 : -1;
        const a = ds.aim + side * (CONE_HALF + 0.5);
        const d = clamp(dist(n.x, n.y, h.x, h.y), 160, 380);
        return { x: clamp(h.x + Math.cos(a) * d, 60, W - 60), y: clamp(h.y + Math.sin(a) * d, top + 60, H - 50) };
      }
      // Knightly greed, within reason: never richer than you by much when she is close to waking.
      const risky = stir > stirMax * 0.7 && gold.n >= gold.p;
      if (risky || gold.n >= MAX_GOLD) return null;
      let best: Coin | null = null, bd = Infinity;
      for (const c of coins) { const d = dist(n.x, n.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      return best && bd < 460 ? { x: best.x, y: best.y - 10 } : null;
    },

    drawGround(g, time) {
      const h = head();
      // Her hoard under her coils and the circle where noise carries to her.
      const rng = ((): (() => number) => { let a = 31; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
      hoardPile(g, cx, cy + 30, 1.6, rng);
      g.lineStyle(2, EMBER, ds.state === 'sleep' ? 0.15 + 0.25 * (stir / stirMax) : 0.05); g.strokeEllipse(h.x, h.y, 520, 340);
      if (time - rustleAt < 400) { const k = (time - rustleAt) / 400; g.lineStyle(3, 0xffd0a0, 0.6 * (1 - k)); g.strokeEllipse(h.x, h.y, 120 + k * 200, 80 + k * 120); }
      // Loose gold on the floor.
      for (const c of coins) {
        const tw = (Math.sin(time / 300 + c.at) + 1) / 2;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x, c.y + 5, 22, 6);
        if (c.kind === 0) { for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? GILT_LIT : GILT, 1); g.fillEllipse(c.x - 6 + k * 4, c.y - k * 2, 10, 5); g.lineStyle(0.8, GILT_DARK, 1); g.strokeEllipse(c.x - 6 + k * 4, c.y - k * 2, 10, 5); } }
        else if (c.kind === 1) { g.fillStyle(GILT, 1); g.fillTriangle(c.x - 7, c.y - 14, c.x + 7, c.y - 14, c.x, c.y - 4); g.fillRect(c.x - 1, c.y - 4, 2, 6); g.fillRect(c.x - 5, c.y + 2, 10, 2); }
        else { g.fillStyle(GILT, 1); g.fillRect(c.x - 9, c.y - 5, 18, 7); for (let k = 0; k < 3; k++) g.fillTriangle(c.x - 9 + k * 6, c.y - 5, c.x - 3 + k * 6, c.y - 5, c.x - 6 + k * 6, c.y - 12); g.fillStyle(0xd8303a, 1); g.fillCircle(c.x, c.y - 2, 1.8); }
        if (tw > 0.75) { g.lineStyle(1.2, 0xffffff, (tw - 0.75) * 4); g.lineBetween(c.x + 5, c.y - 16, c.x + 5, c.y - 24); g.lineBetween(c.x + 1, c.y - 20, c.x + 9, c.y - 20); }
      }
      // The fire cone: a scorched telegraph while she wakes, the real thing as she breathes.
      if (ds.state === 'wake' || ds.state === 'breathe') {
        const c = ds.state === 'breathe' ? 1 : clamp(1 - (ds.until - time) / ctx.tk.warn(wakeMs), 0, 1);
        const a0 = ds.aim - CONE_HALF, a1 = ds.aim + CONE_HALF;
        g.fillStyle(ds.state === 'breathe' ? EMBER : 0xff6a3a, ds.state === 'breathe' ? 0.32 : 0.06 + c * 0.14);
        g.fillTriangle(h.x, h.y, h.x + Math.cos(a0) * RANGE, h.y + Math.sin(a0) * RANGE, h.x + Math.cos(ds.aim) * RANGE, h.y + Math.sin(ds.aim) * RANGE);
        g.fillTriangle(h.x, h.y, h.x + Math.cos(ds.aim) * RANGE, h.y + Math.sin(ds.aim) * RANGE, h.x + Math.cos(a1) * RANGE, h.y + Math.sin(a1) * RANGE);
        g.lineStyle(2, 0xffb070, 0.4 + c * 0.5);
        g.lineBetween(h.x, h.y, h.x + Math.cos(a0) * RANGE, h.y + Math.sin(a0) * RANGE);
        g.lineBetween(h.x, h.y, h.x + Math.cos(a1) * RANGE, h.y + Math.sin(a1) * RANGE);
        if (ds.state === 'wake' && c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.3); g.lineBetween(h.x, h.y, h.x + Math.cos(ds.aim) * RANGE, h.y + Math.sin(ds.aim) * RANGE); }
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      curledDragon(g, cx, cy, R, ts, ds.wake, headA);
      const h = head();
      // Asleep: smoke-rings from the nostrils, faster as she stirs.
      if (ds.state === 'sleep') {
        const rate = 0.3 + (stir / stirMax) * 1.2;
        for (let i = 0; i < 3; i++) {
          const ph = (ts * rate + i / 3) % 1;
          g.lineStyle(2, 0xb8b8c8, 0.6 * (1 - ph)); g.strokeCircle(h.x + 22 + ph * 30, h.y - 10 - ph * 40, 4 + ph * 10);
        }
      }
      if (ds.state === 'breathe') {
        // The flame itself: billowing blobs racing out down the cone.
        for (let i = 0; i < 22; i++) {
          const ph = ((time / 400) + i / 22) % 1;
          const spread = (((i * 7) % 11) / 10 - 0.5) * CONE_HALF * 1.6;
          const d = 30 + ph * RANGE;
          const x = h.x + Math.cos(ds.aim + spread) * d, y = h.y + Math.sin(ds.aim + spread) * d;
          g.fillStyle(i % 3 ? EMBER : FLAME, 0.75 * (1 - ph * 0.7)); g.fillCircle(x, y, 8 + ph * 24);
        }
      }
      // Gold riding on each fighter: a jingling purse with its count of pips.
      for (const s of ['p', 'n'] as Side[]) {
        const f = fighter(s);
        if (!alive(f)) continue;
        if (gold[s] > 0) {
          g.fillStyle(GILT_DARK, 1); g.fillEllipse(f.x + 20, f.y - 6, 14, 12);
          g.fillStyle(GILT, 1); g.fillEllipse(f.x + 20, f.y - 8, 11, 9);
          for (let i = 0; i < gold[s]; i++) { g.fillStyle(GILT_LIT, 1); g.fillCircle(f.x - 18 + i * 4, f.y - 52, 1.8); }
        }
        if (ds.state === 'wake' && ds.target === s) {
          const col = s === 'p' ? 0xff7a4a : 0x6ac8ff;
          g.lineStyle(2, col, 0.9); g.strokeCircle(f.x, f.y - 66, 9);
          g.fillStyle(col, 0.9); g.fillTriangle(f.x - 6, f.y - 60, f.x + 6, f.y - 60, f.x, f.y - 52);
        }
        if (time - meltAt[s] < 700) {
          const k = (time - meltAt[s]) / 700;
          for (let i = 0; i < 6; i++) { g.fillStyle(GILT, 1 - k); g.fillCircle(f.x - 12 + i * 5, f.y - 4 + k * 18 + (i % 2) * 4, 2.4); }
        }
      }
    },

    drawHud(g) {
      // Her sleep meter (Zs that fill red), gold counts either side.
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 90, y - 10, 180, 24, 6);
      const k = ds.state === 'sleep' ? clamp(stir / stirMax, 0, 1) : 1;
      g.fillStyle(0x3a3a4a, 1); g.fillRect(x - 40, y - 2, 80, 8);
      g.fillStyle(k > 0.75 ? EMBER : 0x8a8ab8, 1); g.fillRect(x - 40, y - 2, 80 * k, 8);
      g.lineStyle(1, INK, 0.8); g.strokeRect(x - 40, y - 2, 80, 8);
      g.fillStyle(MINE_C, 1); g.fillCircle(x - 80, y + 2, 4);
      g.fillStyle(FOE_C, 1); g.fillCircle(x + 80, y + 2, 4);
      for (const [s, dx] of [['p', -1], ['n', 1]] as const) {
        const n = Math.min(gold[s], 5);
        for (let i = 0; i < n; i++) { g.fillStyle(GILT, 1); g.fillCircle(x + dx * (70 - i * 5), y + 2, 2.4); }
        if (gold[s] > 5) { g.fillStyle(GILT_LIT, 1); g.fillCircle(x + dx * 46, y + 2, 3); }
      }
    },
  };
}

export const DRAGONS_HOARD: GimmickDef = {
  id: GIM_HOARD,
  rules: 'Walk over gold to pocket it: each piece makes your hits 6% harder. Blows struck near the dragon\'s head wake her — and she breathes fire on whoever holds the most gold, melting it.',
  make: makeDragonHoard,
};
