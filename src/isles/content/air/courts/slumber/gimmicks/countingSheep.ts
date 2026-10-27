import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { DREAM, DREAM_LIT, FEATHER, WALNUT, WALNUT_LIT, WOOL, dist, dotted, dreamSheep, nightcapOn, zzz } from '../art';

/**
 * Counting Sheep — Shepherd Wooly's fold.
 *
 * A long stile runs down the middle of the yard, and dream-sheep come trotting in from the edges
 * one at a time to leap it. Every sheep that clears the stile is counted — out loud, in a soft
 * voice from nowhere — and the count goes to whoever is standing nearest the spot where it
 * jumped. Each count is a step closer to sleep: at five you doze off where you stand, and the
 * fold carries on counting.
 *
 * The cure is the sheep themselves. Bump into one on the ground — on its run-up or trotting away —
 * and it tumbles over in a puff of wool, and the jolt wakes you a little (one count off). Every
 * leap is marked on the stile before it happens, so the player can read the next jump and be
 * somewhere else — or better, be somewhere that leaves Wooly the nearest. Wooly knows the trick:
 * he stays clear of the leap marks and goes sheep-bumping when he's getting heavy-eyed.
 */

const SPAWN_MS = 2300;
const SPAWN_HARD_MS = 1850;
const RUN = 150;
const RUN_HARD = 175;
const LEAP_DIST = 70;
const BUMP_R = 30;
const DOZE_AT = 5;
const DOZE_MS = 1700;
const DOZE_HARD_MS = 2000;
const NUMBERS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];

interface Sheep {
  x: number; y: number;
  /** +1 runs right (spawned on the left), -1 runs left. */
  dir: 1 | -1;
  state: 'run' | 'leap' | 'trot';
  leapAt: number;
  counted: boolean;
  num: number;
  bornAt: number;
}

interface Dozer { drowsy: number; dozeUntil: number; lastAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const FX = W / 2;
  const spawnMs = ctx.hard ? SPAWN_HARD_MS : SPAWN_MS;
  const run = ctx.hard ? RUN_HARD : RUN;
  const dozeMs = ctx.hard ? DOZE_HARD_MS : DOZE_MS;
  const leapMs = ((LEAP_DIST * 2) / run) * 1000;

  let sheep: Sheep[] = [];
  let nextSpawn = 1400;
  let side: 1 | -1 = rng() < 0.5 ? 1 : -1;
  let total = 0;
  let announced = false;
  const tumbles: { x: number; y: number; at: number }[] = [];
  const counts: { x: number; y: number; at: number; to: Fighter }[] = [];
  const state = new Map<Fighter, Dozer>();
  const dozer = (f: Fighter): Dozer => {
    let d = state.get(f);
    if (!d) { d = { drowsy: 0, dozeUntil: 0, lastAt: -9999 }; state.set(f, d); }
    return d;
  };
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const spawn = (time: number): void => {
    // Pick a lane that isn't on top of another sheep's.
    let y = top + 70 + rng() * (H - top - 140);
    for (let i = 0; i < 6 && sheep.some((s) => Math.abs(s.y - y) < 60); i++) y = top + 70 + rng() * (H - top - 140);
    const dir = side;
    side = side === 1 ? -1 : 1;
    sheep.push({ x: dir === 1 ? -30 : W + 30, y, dir, state: 'run', leapAt: 0, counted: false, num: 0, bornAt: time });
  };

  const count = (s: Sheep, time: number): void => {
    s.counted = true;
    total++;
    s.num = total;
    // Whoever stands nearest the jump takes the count.
    const p = ctx.player, n = ctx.npc;
    const dp = alive(p) ? dist(p.x, p.y, FX, s.y) : Infinity;
    const dn = alive(n) ? dist(n.x, n.y, FX, s.y) : Infinity;
    const to = dp <= dn ? p : n;
    if (!alive(to)) return;
    const d = dozer(to);
    if (time < d.dozeUntil) return;
    d.drowsy++;
    d.lastAt = time;
    const word = NUMBERS[(s.num - 1) % NUMBERS.length];
    counts.push({ x: FX, y: s.y - 50, at: time, to });
    ctx.float(FX, s.y - 56, `${word}...`, to === p ? '#bfe6ff' : '#ffc8b0');
    ctx.sfx('bubble');
    if (d.drowsy >= DOZE_AT) {
      d.drowsy = 0;
      d.dozeUntil = time + dozeMs;
      ctx.stun(to, dozeMs);
      ctx.sfx('status-stun');
      ctx.float(to.x, to.y - 60, to === p ? 'DOZED OFF...' : 'WOOLY NODS OFF!', to === p ? '#e4d8ff' : '#9df5c8');
    }
  };

  const bump = (f: Fighter, s: Sheep, time: number): void => {
    sheep = sheep.filter((q) => q !== s);
    tumbles.push({ x: s.x, y: s.y, at: time });
    const d = dozer(f);
    if (d.drowsy > 0) {
      d.drowsy--;
      ctx.float(f.x, f.y - 50, 'BAA! — A BIT MORE AWAKE', '#ffffff');
    } else ctx.float(f.x, f.y - 50, 'BAA!', '#ffffff');
    ctx.sfx('boing');
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('COUNT THE SHEEP', '#e4d8ff'); }
      if (time >= nextSpawn) { nextSpawn = time + spawnMs; spawn(time); }

      for (const s of [...sheep]) {
        const toFence = (FX - s.x) * s.dir;
        if (s.state === 'run') {
          s.x += s.dir * run * dt;
          if (toFence <= LEAP_DIST) { s.state = 'leap'; s.leapAt = time; ctx.sfx('whoosh'); }
        } else if (s.state === 'leap') {
          s.x += s.dir * run * dt;
          if (!s.counted && toFence <= 0) count(s, time);
          if (time - s.leapAt >= leapMs) s.state = 'trot';
        } else {
          s.x += s.dir * run * 0.8 * dt;
          if (s.x < -60 || s.x > W + 60) { sheep = sheep.filter((q) => q !== s); continue; }
        }
        if (s.state !== 'leap') {
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || time < dozer(f).dozeUntil) continue;
            if (dist(f.x, f.y + 8, s.x, s.y) < BUMP_R) { bump(f, s, time); break; }
          }
        }
      }
      while (tumbles.length && time - tumbles[0].at > 600) tumbles.shift();
      while (counts.length && time - counts[0].at > 1100) counts.shift();
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const d = dozer(n);
      // Heavy-eyed: go and bump a sheep that's still on the ground.
      if (d.drowsy >= 3) {
        let best: Sheep | null = null, bd = Infinity;
        for (const s of sheep) {
          if (s.state === 'leap') continue;
          const lead = s.state === 'run' ? s.dir * 40 : s.dir * 30;
          const dd = dist(n.x, n.y, s.x + lead, s.y);
          if (dd < bd) { bd = dd; best = s; }
        }
        if (best && bd < 520) return { x: best.x + best.dir * 40, y: best.y - 8 };
      }
      // Otherwise keep off the next leap mark if he would be the one nearest it.
      const next = sheep.filter((s) => s.state === 'run').sort((a, b) => Math.abs(FX - a.x) - Math.abs(FX - b.x))[0];
      if (next) {
        const p = ctx.player;
        const dn = dist(n.x, n.y, FX, next.y), dp = dist(p.x, p.y, FX, next.y);
        if (dn < dp + 40 && dn < 260) {
          const away = n.x < FX ? -1 : 1;
          return { x: FX + away * 300, y: n.y + (n.y < next.y ? -80 : 80) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The stile: a long double-railed fence down the middle, notched with the count.
      g.fillStyle(0x000000, 0.18); g.fillRect(FX - 4, top + 10, 14, H - top - 20);
      for (let y = top + 16; y < H - 10; y += 70) {
        g.fillStyle(WALNUT, 1); g.fillRect(FX - 4, y, 8, 22);
        g.fillStyle(WALNUT_LIT, 1); g.fillRect(FX - 4, y, 3, 22);
      }
      g.lineStyle(5, WALNUT, 1); g.lineBetween(FX - 6, top + 14, FX - 6, H - 14);
      g.lineStyle(5, WALNUT_LIT, 1); g.lineBetween(FX + 6, top + 14, FX + 6, H - 14);
      for (let i = 0; i < Math.min(total, 40); i++) {
        const y = top + 30 + i * 12;
        g.lineStyle(1.5, dim(WALNUT, 0.5), 1); g.lineBetween(FX + 3, y, FX + (i % 5 === 4 ? 14 : 9), y);
      }
      // Leap marks: a dotted hop-arc over the stile where each running sheep will jump.
      for (const s of sheep) {
        if (s.state !== 'run') continue;
        const k = 1 - Math.min(1, ((FX - s.x) * s.dir - LEAP_DIST) / 500);
        const pts: Pt[] = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push({ x: FX - s.dir * LEAP_DIST + s.dir * LEAP_DIST * 2 * u, y: s.y - Math.sin(u * Math.PI) * 40 }); }
        dotted(g, pts, 9, 1.8, DREAM_LIT, 0.25 + 0.6 * k, t * 20);
        g.lineStyle(2, DREAM_LIT, 0.2 + 0.5 * k); g.strokeEllipse(FX, s.y, 70, 22);
        // Whoever is nearest this mark gets a thin thread to it — the count is coming for them.
        const p = ctx.player, n = ctx.npc;
        const near = dist(p.x, p.y, FX, s.y) <= dist(n.x, n.y, FX, s.y) ? p : n;
        if (k > 0.5) { g.lineStyle(1.2, near === p ? 0x7ad0ff : 0xff8a6a, 0.35 * k); g.lineBetween(FX, s.y, near.x, near.y); }
      }
      for (const tb of tumbles) {
        const k = (time - tb.at) / 600;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.8;
          g.fillStyle(WOOL, 0.8 * (1 - k)); g.fillCircle(tb.x + Math.cos(a) * k * 26, tb.y - 10 + Math.sin(a) * k * 14, 5 * (1 - k) + 2);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const s of sheep) {
        const hop = s.state === 'leap' ? Math.min(1, (time - s.leapAt) / leapMs) : 0;
        dreamSheep(g, s.x, s.y, 13, s.dir, t + s.bornAt, hop, 1);
      }
      // A thread from each count to whoever took it.
      for (const c of counts) {
        const k = (time - c.at) / 1100;
        const y = c.y - k * 26;
        g.lineStyle(2, c.to === ctx.player ? 0x7ad0ff : 0xff8a6a, 0.6 * (1 - k)); g.lineBetween(c.x, y + 14, c.to.x, c.to.y - 40);
      }
      // Drowsiness pips over each head; the dozer wears a nightcap and snores.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        const d = dozer(f);
        const y0 = f.y - 54;
        for (let i = 0; i < DOZE_AT; i++) {
          const x = f.x - 20 + i * 10;
          g.fillStyle(0x1a1430, 0.6); g.fillCircle(x, y0, 4.5);
          if (i < d.drowsy) {
            const danger = d.drowsy >= DOZE_AT - 1;
            g.fillStyle(danger ? (Math.floor(time / 180) % 2 ? 0xff9ac8 : WOOL) : WOOL, 1); g.fillCircle(x, y0, 3.6);
          }
        }
        if (time < d.dozeUntil) {
          nightcapOn(g, f.x, f.y - 26, 15, DREAM, 0.95, 0.7, Math.sin(t * 2) * 3);
          zzz(g, f.x + 16, f.y - 44, 7, t, DREAM_LIT, 1);
        } else if (d.drowsy >= 3) {
          // Heavy eyelids: two drooping lines.
          g.lineStyle(2, FEATHER, 0.6);
          g.lineBetween(f.x - 10, f.y - 16, f.x - 3, f.y - 13); g.lineBetween(f.x + 3, f.y - 13, f.x + 10, f.y - 16);
        }
      }
    },

    drawHud(g) {
      // The fold's tally in the corner under the HUD: a little stack of wool per counted sheep.
      const x0 = 18, y0 = top + 14;
      const n = Math.min(total, 24);
      for (let i = 0; i < n; i++) {
        const x = x0 + (i % 12) * 11, y = y0 + Math.floor(i / 12) * 11;
        g.fillStyle(dim(WOOL, 0.3), 0.8); g.fillCircle(x + 0.5, y + 0.8, 4.5);
        g.fillStyle(WOOL, 0.9); g.fillCircle(x, y, 4);
      }
    },
  };
}

export const COUNTING_SHEEP: GimmickDef = {
  id: 'slumber-counting-sheep',
  rules: 'Each sheep that leaps the stile is counted against whoever stands nearest the jump. Five and you doze off. Bump a sheep on the ground to wake a little.',
  make,
};
