import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit, mulberry } from '../../../../../art/IsleArt';
import { stocks as drawStocks } from '../art';
import { CABBAGE, EGG, TIMBER, TIMBER_DARK, TOMATO } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Stocks — Bailiff Pillory.
 *
 * Three pairs of stocks stand open about the square, and the Bailiff's men loiter by each with
 * their hands out. Take a blow within arm's reach of an open pair — or come flying past one, fast,
 * thrown or dashing — and the men have you: you are shoved in, the top board comes down and you
 * are locked in a beat. The crowd along the rope pelts whoever is locked with whatever is rotten
 * (tomatoes, eggs, cabbages), and a locked fighter takes every blow harder.
 *
 * Pillory herds you toward the stocks and hits you beside them. Knock *him* in: fight him beside
 * an open pair, or take your blows away from them. A pair that has just held someone stays shut,
 * padlocked, for a while.
 */

const GRAB_R = 78;
const FLY_R = 36;
const FLY_V = 400;
const COOL_MS = 4200;

interface Stock { x: number; y: number; who: Fighter | null; lockUntil: number; coolUntil: number; shutAt: number; seed: number }
interface Throw { x0: number; y0: number; at: number; land: number; target: Fighter; kind: number; done: boolean; tx: number; ty: number }
interface Splat { x: number; y: number; kind: number; at: number; seed: number }

const PRODUCE = [TOMATO, EGG, CABBAGE];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const LOCK_MS = ctx.hard ? 1800 : 1500;
  const PELT = ctx.hard ? 3 : 2;
  const stocks: Stock[] = [
    { x: 230 + rng() * 60, y: top + 150 + rng() * 40 },
    { x: W - 290 + rng() * 60, y: top + 150 + rng() * 40 },
    { x: W / 2 - 40 + rng() * 80, y: H - 150 - rng() * 30 },
  ].map((p, i) => ({ ...p, who: null, lockUntil: 0, coolUntil: 0, shutAt: -9999, seed: i * 13 + 5 }));
  const throws: Throw[] = [];
  const splats: Splat[] = [];
  const last = new Map<Fighter, { x: number; y: number }>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);
  let nextThrow = 0;
  let started = false;
  let jeer = 0;

  const lockedIn = (f: Fighter): Stock | undefined => stocks.find((s) => s.who === f);
  const isOpen = (s: Stock, time: number) => !s.who && time >= s.coolUntil;

  function lock(f: Fighter, s: Stock, time: number): void {
    if (lockedIn(f) || !alive(f)) return;
    s.who = f;
    s.lockUntil = time + LOCK_MS;
    s.shutAt = time;
    // Into the hollows: neck and wrists on the bottom board.
    ctx.nudge(f, s.x - f.x, s.y - 14 - f.y);
    ctx.stun(f, LOCK_MS);
    ctx.sfx('trap-snap');
    ctx.banner(f === player ? 'IN THE STOCKS!' : 'PILLORY IN HIS OWN STOCKS!', f === player ? '#ffb0a0' : '#d8f0a0');
    nextThrow = time + 150;
  }

  function nearOpen(f: Fighter, r: number, time: number): Stock | null {
    let best: Stock | null = null, bd = r;
    for (const s of stocks) {
      if (!isOpen(s, time)) continue;
      const d = dist(f.x, f.y, s.x, s.y - 14);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function onHurt(f: Fighter, amount: number): void {
    if (amount < 3 || lockedIn(f)) return;
    const time = ctx.scene.time.now;
    const s = nearOpen(f, GRAB_R, time);
    if (s) lock(f, s, time);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        ctx.banner('HIT BESIDE THE STOCKS AND YOU GO IN', '#ffe2a8');
      }
      // Thrown or dashing past an open pair: caught on the way by.
      for (const f of [player, npc]) {
        const l = last.get(f);
        if (!l) continue;
        const v = dt > 0 ? dist(f.x, f.y, l.x, l.y) / dt : 0;
        l.x = f.x; l.y = f.y;
        if (v > FLY_V && v < 6000 && !lockedIn(f)) {
          const s = nearOpen(f, FLY_R, time);
          if (s) lock(f, s, time);
        }
      }
      for (const s of stocks) {
        if (!s.who) continue;
        if (time >= s.lockUntil || !alive(s.who)) {
          s.who = null;
          s.coolUntil = time + COOL_MS;
          ctx.sfx('snap-back');
          continue;
        }
        // Held in the hollows.
        const f = s.who;
        if (dist(f.x, f.y, s.x, s.y - 14) > 6) ctx.nudge(f, s.x - f.x, s.y - 14 - f.y);
      }
      // The crowd pelts whoever is locked.
      const pelted = stocks.filter((s) => s.who);
      if (pelted.length && time >= nextThrow) {
        nextThrow = time + (ctx.hard ? 210 : 270);
        const s = pelted[Math.floor(rng() * pelted.length)];
        const f = s.who;
        if (f) {
          const x0 = 60 + rng() * (W - 120);
          throws.push({ x0, y0: H - 22, at: time, land: time + 520 + rng() * 160, target: f, kind: Math.floor(rng() * 3), done: false, tx: 0, ty: 0 });
          jeer = time;
        }
      }
      for (const t of throws) {
        if (t.done || time < t.land) continue;
        t.done = true;
        const f = t.target;
        t.tx = f.x + (rng() - 0.5) * 16; t.ty = f.y - 20 + (rng() - 0.5) * 12;
        splats.push({ x: t.tx, y: f.y + 10 + (rng() - 0.5) * 30, kind: t.kind, at: time, seed: rng() * 10 });
        if (lockedIn(f)) {
          ctx.hit(f, PELT, t.tx, t.ty);
          ctx.sfx(t.kind === 1 ? 'slime-splat' : 'hit-light');
        }
      }
      for (let i = throws.length - 1; i >= 0; i--) if (throws[i].done && time - throws[i].land > 300) throws.splice(i, 1);
      while (splats.length > 40) splats.shift();
    },

    onPlayerHurt(amount) { onHurt(player, amount); },
    onNpcHurt(amount) { onHurt(npc, amount); },

    playerTakenMult() { return lockedIn(player) ? 1.25 : 1; },
    npcTakenMult() { return lockedIn(npc) ? 1.25 : 1; },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      const time = ctx.scene.time.now;
      // You are locked: come and collect.
      if (lockedIn(player)) return { x: player.x + (npc.x < player.x ? -70 : 70), y: player.y + 10 };
      // Too close to an open pair himself: step away from it.
      const mine = nearOpen(npc, GRAB_R + 40, time);
      if (mine) {
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x);
        return { x: clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 140, top + 50, H - 50) };
      }
      // Herd: stand on the far side of you from your nearest open pair, so his blows drive you in.
      let s: Stock | null = null, bd = Infinity;
      for (const st of stocks) { if (!isOpen(st, time)) continue; const d = dist(player.x, player.y, st.x, st.y); if (d < bd) { bd = d; s = st; } }
      if (!s) return null;
      const a = Math.atan2(player.y - s.y, player.x - s.x);
      return { x: clamp(player.x + Math.cos(a) * 130, 60, W - 60), y: clamp(player.y + Math.sin(a) * 130, top + 50, H - 50) };
    },

    drawGround(g, time) {
      // Old and new produce on the flags.
      for (const s of splats) {
        const k = clamp((time - s.at) / 9000, 0, 1);
        const c = PRODUCE[s.kind];
        g.fillStyle(dim(c, 0.2), 0.7 * (1 - k)); g.fillEllipse(s.x, s.y, 20, 8);
        for (let i = 0; i < 5; i++) { g.fillStyle(c, 0.6 * (1 - k)); g.fillCircle(s.x + Math.cos(i * 1.3 + s.seed) * 12, s.y + Math.sin(i * 1.3 + s.seed) * 5, 2); }
        if (s.kind === 1) { g.fillStyle(0xf0c040, 0.8 * (1 - k)); g.fillCircle(s.x + 2, s.y, 3.5); }
      }
      // Each pair's grab ring: the Bailiff's men's reach, bright while it is open.
      for (const st of stocks) {
        const open = isOpen(st, time);
        g.lineStyle(2, open ? 0xffd08a : 0x6a5a4a, open ? 0.35 + Math.sin(time / 260 + st.seed) * 0.1 : 0.15);
        g.strokeCircle(st.x, st.y - 14, GRAB_R);
        g.fillStyle(0x000000, 0.12); g.fillCircle(st.x, st.y - 14, GRAB_R);
      }
    },

    drawAir(g, time) {
      for (const st of stocks) {
        const rng = mulberry(st.seed);
        const shut = !!st.who || time < st.coolUntil;
        drawStocks(g, st.x, st.y, 1, !shut, rng);
        // The Bailiff's men, one either side, hands out while it is open.
        for (const k of [-1, 1]) {
          const mx = st.x + k * 58, my = st.y + 2;
          const reach = isOpen(st, time) ? Math.sin(time / 300 + st.seed + k) * 3 + 6 : 0;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(mx, my + 2, 20, 6);
          g.fillStyle(0x3a3440, 1); g.fillRoundedRect(mx - 8, my - 28, 16, 26, 5);
          g.fillStyle(0xc8b096, 1); g.fillCircle(mx, my - 34, 6);
          g.fillStyle(0x2a2430, 1); g.fillRect(mx - 8, my - 41, 16, 4); g.fillRect(mx - 5, my - 46, 10, 6);
          g.lineStyle(3, 0x3a3440, 1); g.lineBetween(mx - k * 6, my - 22, mx - k * (12 + reach), my - 18);
          g.fillStyle(0xc8b096, 1); g.fillCircle(mx - k * (13 + reach), my - 18, 2.5);
        }
        // Someone in it: the board down over their neck, a lock-timer over their head.
        if (st.who) {
          const f = st.who;
          const k = clamp((st.lockUntil - time) / LOCK_MS, 0, 1);
          g.fillStyle(TIMBER_DARK, 1); g.fillRect(st.x - 36, st.y - 42, 72, 12);
          g.fillStyle(TIMBER, 1); g.fillRect(st.x - 36, st.y - 42, 72, 5);
          g.lineStyle(3, 0xffd08a, 0.9);
          g.beginPath(); g.arc(f.x, f.y - 56, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          if (time - st.shutAt < 260) {
            const q = (time - st.shutAt) / 260;
            g.lineStyle(3, 0xffffff, 1 - q); g.lineBetween(st.x - 40 - q * 14, st.y - 36, st.x + 40 + q * 14, st.y - 36);
          }
        }
      }
      // Produce in flight.
      for (const t of throws) {
        if (t.done) continue;
        const k = clamp((time - t.at) / (t.land - t.at), 0, 1);
        const tx = t.target.x, ty = t.target.y - 20;
        const x = t.x0 + (tx - t.x0) * k, y = t.y0 + (ty - t.y0) * k - Math.sin(k * Math.PI) * 120;
        const c = PRODUCE[t.kind];
        g.fillStyle(0x000000, 0.2); g.fillEllipse(t.x0 + (tx - t.x0) * k, t.y0 + (ty + 30 - t.y0) * k, 10, 4);
        if (t.kind === 2) {
          g.fillStyle(dim(c, 0.2), 1); g.fillCircle(x, y, 7); g.fillStyle(c, 1); g.fillCircle(x - 1, y - 1, 6);
          g.lineStyle(1, lit(c, 0.3), 1); g.lineBetween(x - 4, y, x + 3, y - 3);
        } else if (t.kind === 1) {
          g.fillStyle(c, 1); g.fillEllipse(x, y, 8, 10); g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 1.5, y - 2, 1.4);
        } else {
          g.fillStyle(c, 1); g.fillCircle(x, y, 5.5); g.fillStyle(0x3a7a2a, 1); g.fillRect(x - 1, y - 7, 2, 3);
          g.fillStyle(0xffffff, 0.5); g.fillCircle(x - 2, y - 2, 1.4);
        }
      }
      // The crowd along the rope at the bottom: heads bobbing, an arm up on every throw.
      g.lineStyle(2, 0xb89a6a, 1); g.lineBetween(0, H - 34, W, H - 30);
      const loud = time - jeer < 400;
      for (let i = 0; i < 22; i++) {
        const x = 22 + i * 44 + ((i * 7) % 11), bob = Math.sin(time / (loud ? 90 : 300) + i * 1.7) * (loud ? 3 : 1.5);
        const y = H - 12 + bob;
        const tone = [0x4a3e3a, 0x3a3a46, 0x5a4a36, 0x3a4436][i % 4];
        g.fillStyle(tone, 1); g.fillEllipse(x, y + 6, 26, 16);
        g.fillStyle([0xc8b096, 0xb89a7a, 0xd8c0a8][i % 3], 1); g.fillCircle(x, y - 8, 7);
        if (i % 3 === 0) { g.fillStyle(0x2a2420, 1); g.fillEllipse(x, y - 13, 15, 5); }
        if (loud && (i * 5 + Math.floor(time / 200)) % 4 === 0) { g.lineStyle(3, tone, 1); g.lineBetween(x + 7, y, x + 12, y - 22); g.fillStyle(0xc8b096, 1); g.fillCircle(x + 12, y - 24, 3); }
      }
    },
  };
}

export const STOCKS: GimmickDef = {
  id: 'shackle-stocks',
  rules: 'Take a blow beside an open pair of stocks — or fly past one — and you are locked in a beat while the crowd pelts you. Knock Pillory in.',
  make,
};
