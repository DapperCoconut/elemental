import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_HUFF } from '../encounters';
import {
  BRICK, FOE_C, INK, MINE_C, PAGE, STICKS, THATCH, type PigHouse, angDiff, bigBadWolf, clamp, dist, frameClock,
  pigHouse,
} from '../util';

/**
 * Huff and Puff — three little houses stand in the yard: straw, sticks and brick. Wolf Lupo
 * draws breath (you see the wind pour into him) and **puffs a cone of gale at you**: anyone in it
 * is shoved across the yard and battered — unless a standing house is between them and the wolf.
 *
 * Every third breath is the HUFF, and the story always knows which house is next: straw, then
 * sticks, then brick. The huff is aimed at that house; it **blows down**, and anyone sheltering
 * behind it is blasted the whole width of the yard. The brick house never falls. Lupo huffs at it,
 * puffs himself flat, and lies there **winded** — stunned, and soft.
 *
 * The rule the player can turn: shelter behind the house that is *not* next, and when brick is
 * next, stand behind brick and let him blow.
 */

type Side = 'p' | 'n';
interface House { kind: PigHouse; x: number; y: number; fallen: number; fellAt: number }
type WState = 'idle' | 'draw' | 'blow';

const HOUSE_HALF = 48;
const LEE_DEPTH = 200;
const CONE_HALF = 0.42;
const RANGE = 560;

function makeHuffPuff(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const midY = (top + H) / 2;
  const gap = hard ? 2600 : 3200;
  const drawMs = hard ? 1000 : 1200;
  const huffDrawMs = hard ? 1350 : 1550;
  const t0 = ctx.scene.time.now;

  const houses: House[] = [
    { kind: 'straw', x: W * 0.24, y: midY + 70, fallen: 0, fellAt: -1 },
    { kind: 'sticks', x: W * 0.52, y: midY - 40, fallen: 0, fellAt: -1 },
    { kind: 'brick', x: W * 0.78, y: midY + 90, fallen: 0, fellAt: -1 },
  ];
  const st = {
    state: 'idle' as WState, until: t0 + 2600, count: 0, huff: false, aim: 0,
    target: null as House | null, blowAt: 0,
  };
  let nextHuffIdx = 0;
  let rebuildAt = -1;
  let windedUntil = 0;
  let softUntil = 0;
  const shove: Record<Side, { vx: number; vy: number }> = { p: { vx: 0, vy: 0 }, n: { vx: 0, vy: 0 } };
  const debris: { x: number; y: number; vx: number; vy: number; at: number; c: number }[] = [];

  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const wolfX = (): number => ctx.npc.x, wolfY = (): number => ctx.npc.y;

  /** The standing house (if any) between the wolf and this point, close enough to shelter it. */
  const shelterOf = (x: number, y: number): House | null => {
    const wx = wolfX(), wy = wolfY();
    const dx = x - wx, dy = y - wy, L = Math.hypot(dx, dy) || 1;
    for (const h of houses) {
      if (h.fallen > 0) continue;
      const hy = h.y - 24;
      const t = ((h.x - wx) * dx + (hy - wy) * dy) / (L * L);
      if (t <= 0.05 || t >= 1) continue;
      const px = wx + dx * t, py = wy + dy * t;
      if (dist(px, py, h.x, hy) > HOUSE_HALF) continue;
      if (dist(x, y, h.x, hy) > LEE_DEPTH) continue;
      return h;
    }
    return null;
  };

  const inCone = (x: number, y: number): boolean => {
    const d = dist(x, y, wolfX(), wolfY());
    if (d > RANGE || d < 4) return false;
    return Math.abs(angDiff(Math.atan2(y - wolfY(), x - wolfX()), st.aim)) < CONE_HALF;
  };

  const blast = (s: Side, dmg: number, push: number, word: string): void => {
    const f = fighter(s);
    if (!alive(f)) return;
    ctx.hit(f, dmg, f.x, f.y);
    const a = Math.atan2(f.y - wolfY(), f.x - wolfX());
    shove[s].vx += Math.cos(a) * push * 2.6; shove[s].vy += Math.sin(a) * push * 2.6;
    ctx.float(f.x, f.y - 52, word, s === 'p' ? '#ffb27a' : '#9ae8ff');
  };

  const fell = (h: House, time: number): void => {
    h.fallen = 1; h.fellAt = time;
    const cols = h.kind === 'straw' ? [THATCH, 0xa07e30] : [STICKS, 0x6a4a2a];
    for (let i = 0; i < 18; i++) {
      const a = st.aim + (ctx.rng() - 0.5) * 1.2;
      const v = 160 + ctx.rng() * 260;
      debris.push({ x: h.x, y: h.y - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, at: time, c: cols[i % 2] });
    }
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      // Shoves carry fighters across the yard over a few frames, never as one jump.
      for (const s of ['p', 'n'] as Side[]) {
        const sv = shove[s];
        if (Math.abs(sv.vx) + Math.abs(sv.vy) < 4) { sv.vx = 0; sv.vy = 0; continue; }
        if (alive(fighter(s))) ctx.nudge(fighter(s), sv.vx * dt, sv.vy * dt);
        const decay = Math.pow(0.02, dt);
        sv.vx *= decay; sv.vy *= decay;
      }

      // The pigs rebuild after the brick holds.
      if (rebuildAt > 0 && time >= rebuildAt) {
        rebuildAt = -1;
        for (const h of houses) { h.fallen = 0; h.fellAt = -1; }
        nextHuffIdx = 0;
        ctx.float(W / 2, top + 60, 'THE PIGS REBUILD', '#f8f0da');
        ctx.sfx('hammer-forge');
      }

      if (time < windedUntil) { st.state = 'idle'; st.until = Math.max(st.until, windedUntil + 600); return; }

      if (st.state === 'idle' && time >= st.until && alive(ctx.npc)) {
        st.count++;
        st.huff = st.count % 3 === 0;
        if (st.huff) {
          // The story knows which house is next.
          st.target = houses[nextHuffIdx] ?? null;
          if (!st.target || st.target.fallen > 0) st.target = houses.find((h) => h.fallen === 0) ?? null;
        } else st.target = null;
        st.state = 'draw';
        st.blowAt = time + ctx.tk.warn(st.huff ? huffDrawMs : drawMs);
        ctx.float(wolfX(), wolfY() - 60, st.huff ? 'I\'LL HUFF…' : 'I\'LL PUFF…', '#e8e0ff');
        ctx.sfx('gust');
      }
      if (st.state === 'draw') {
        const lockAt = st.blowAt - ctx.tk.warn(st.huff ? huffDrawMs : drawMs) * 0.3;
        if (time < lockAt) {
          const aimAt = st.target ? { x: st.target.x, y: st.target.y - 24 } : { x: ctx.player.x, y: ctx.player.y };
          st.aim = Math.atan2(aimAt.y - wolfY(), aimAt.x - wolfX());
        }
        if (time >= st.blowAt) {
          st.state = 'blow'; st.until = time + 450;
          ctx.sfx(st.huff ? 'tornado' : 'gust');
          const target = st.target;
          if (st.huff && target && target.kind === 'brick') {
            // The brick holds. Lupo puffs himself flat.
            ctx.float(target.x, target.y - 90, 'BRICK!', '#ffd0b0');
            ctx.stun(ctx.npc, hard ? 1800 : 2300);
            windedUntil = time + (hard ? 1800 : 2300);
            softUntil = time + 3500;
            ctx.float(wolfX(), wolfY() - 60, 'WINDED', '#ffffff');
            rebuildAt = time + 4800;
            ctx.sfx('status-stun');
          } else {
            const lee = st.huff && target ? target : null;
            // Read the shelter before the house comes down: hiding behind the doomed one is the trap.
            const p = ctx.player;
            const caught = alive(p) && inCone(p.x, p.y);
            const shelter = caught ? shelterOf(p.x, p.y) : null;
            if (lee) { fell(lee, time); nextHuffIdx = houses.indexOf(lee) + 1; ctx.sfx('explosion-medium'); }
            if (caught) {
              if (lee && shelter === lee) blast('p', hard ? 19 : 16, 260, 'BLOWN DOWN');
              else if (!shelter) blast('p', st.huff ? (hard ? 13 : 11) : (hard ? 10 : 8), st.huff ? 200 : 140, st.huff ? 'HUFFED' : 'PUFFED');
            }
          }
        }
      } else if (st.state === 'blow' && time >= st.until) {
        st.state = 'idle'; st.until = time + gap;
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; d.vx *= Math.pow(0.4, dt);
        if (time - d.at > 1400) debris.splice(i, 1);
      }
    },

    npcTakenMult: () => (ctx.scene.time.now < softUntil ? 1.4 : 1),

    npcSeek(): Pt | null {
      // Lupo wants a clear line: if you are sheltered, he walks round the house.
      if (ctx.scene.time.now < windedUntil) return null;
      const p = ctx.player;
      if (!shelterOf(p.x, p.y)) return null;
      let best: Pt | null = null, bd = Infinity;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const x = clamp(p.x + Math.cos(a) * 260, 60, W - 60), y = clamp(p.y + Math.sin(a) * 260, top + 50, H - 50);
        const dx = p.x - x, dy = p.y - y, L = Math.hypot(dx, dy) || 1;
        const blocked = houses.some((h) => {
          if (h.fallen > 0) return false;
          const t = ((h.x - x) * dx + (h.y - 24 - y) * dy) / (L * L);
          return t > 0 && t < 1 && dist(x + dx * t, y + dy * t, h.x, h.y - 24) < HOUSE_HALF + 10;
        });
        if (blocked) continue;
        const d = dist(ctx.npc.x, ctx.npc.y, x, y);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The cone while he draws breath: streams of wind pouring INTO him, then the gale outward.
      if (st.state === 'draw' || st.state === 'blow') {
        const total = ctx.tk.warn(st.huff ? huffDrawMs : drawMs);
        const c = st.state === 'blow' ? 1 : clamp(1 - (st.blowAt - time) / total, 0, 1);
        const wx = wolfX(), wy = wolfY();
        const col = st.huff ? 0xff7a6a : 0xd8e8ff;
        const a0 = st.aim - CONE_HALF, a1 = st.aim + CONE_HALF;
        g.fillStyle(col, (st.state === 'blow' ? 0.22 : 0.05 + c * 0.12));
        g.fillTriangle(wx, wy, wx + Math.cos(a0) * RANGE, wy + Math.sin(a0) * RANGE, wx + Math.cos(st.aim) * RANGE, wy + Math.sin(st.aim) * RANGE);
        g.fillTriangle(wx, wy, wx + Math.cos(st.aim) * RANGE, wy + Math.sin(st.aim) * RANGE, wx + Math.cos(a1) * RANGE, wy + Math.sin(a1) * RANGE);
        g.lineStyle(2, col, 0.4 + c * 0.5);
        g.lineBetween(wx, wy, wx + Math.cos(a0) * RANGE, wy + Math.sin(a0) * RANGE);
        g.lineBetween(wx, wy, wx + Math.cos(a1) * RANGE, wy + Math.sin(a1) * RANGE);
        // Wind streaks: inward while drawing, outward while blowing.
        for (let i = 0; i < 12; i++) {
          const ph = ((time / (st.state === 'blow' ? 160 : 420)) + i / 12) % 1;
          const r = st.state === 'blow' ? 40 + ph * RANGE : RANGE * (1 - ph) + 30;
          const a = st.aim + (((i * 7) % 12) / 11 - 0.5) * CONE_HALF * 1.8;
          const x = wx + Math.cos(a) * r, y = wy + Math.sin(a) * r;
          g.lineStyle(2, 0xffffff, 0.5 * (st.state === 'blow' ? 1 - ph : ph));
          g.lineBetween(x, y, x - Math.cos(a) * 24 * (st.state === 'blow' ? 1 : -1), y - Math.sin(a) * 24 * (st.state === 'blow' ? 1 : -1));
        }
      }
      // Each standing house's lee: a soft shadow cast away from the wolf (red on the one that's next).
      const next = houses[nextHuffIdx] && houses[nextHuffIdx].fallen === 0 ? houses[nextHuffIdx] : null;
      for (const h of houses) {
        if (h.fallen > 0) continue;
        const a = Math.atan2(h.y - 24 - wolfY(), h.x - wolfX());
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        const bx = h.x + ux * 30, by = h.y - 24 + uy * 30;
        const isNext = h === next && h.kind !== 'brick';
        const flash = isNext && st.state === 'draw' && st.huff && Math.floor(time / 120) % 2 === 0;
        g.fillStyle(isNext ? 0xff5a4a : 0x2a3a5a, flash ? 0.28 : isNext ? 0.14 : 0.12);
        g.fillTriangle(bx + nx * HOUSE_HALF, by + ny * HOUSE_HALF, bx - nx * HOUSE_HALF, by - ny * HOUSE_HALF, bx + ux * LEE_DEPTH - nx * HOUSE_HALF * 0.7, by + uy * LEE_DEPTH - ny * HOUSE_HALF * 0.7);
        g.fillTriangle(bx + nx * HOUSE_HALF, by + ny * HOUSE_HALF, bx + ux * LEE_DEPTH - nx * HOUSE_HALF * 0.7, by + uy * LEE_DEPTH - ny * HOUSE_HALF * 0.7, bx + ux * LEE_DEPTH + nx * HOUSE_HALF * 0.7, by + uy * LEE_DEPTH + ny * HOUSE_HALF * 0.7);
      }
    },

    drawAir(g, time) {
      const rng = ((): (() => number) => { let a = 9; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
      for (const h of houses) pigHouse(g, h.kind, h.x, h.y, 1.4, h.fallen, rng);
      // The next house's tag.
      const next = houses[nextHuffIdx] && houses[nextHuffIdx].fallen === 0 ? houses[nextHuffIdx] : null;
      if (next) {
        const y = next.y - 118 + Math.sin(time / 260) * 3;
        g.fillStyle(PAGE, 0.95); g.fillRoundedRect(next.x - 22, y - 9, 44, 16, 4);
        g.lineStyle(1.4, INK, 0.9); g.strokeRoundedRect(next.x - 22, y - 9, 44, 16, 4);
        g.fillStyle(next.kind === 'brick' ? BRICK : 0xd8303a, 1); g.fillTriangle(next.x - 6, y + 7, next.x + 6, y + 7, next.x, y + 15);
        g.lineStyle(2, INK, 0.9); g.lineBetween(next.x - 14, y - 1, next.x + 14, y - 1);
      }
      for (const d of debris) {
        const k = 1 - (time - d.at) / 1400;
        g.lineStyle(2, d.c, k); g.lineBetween(d.x, d.y, d.x + 8, d.y + 2);
      }
      // The wolf over Lupo: cheeks swelling while he draws, mouth wide as he blows.
      const n = ctx.npc;
      if (alive(n)) {
        const dir = Math.cos(st.aim) >= 0 ? 1 : -1;
        const total = ctx.tk.warn(st.huff ? huffDrawMs : drawMs);
        const puff = st.state === 'draw' ? clamp(1 - (st.blowAt - time) / total, 0, 1) : 0;
        const blow = st.state === 'blow' ? 1 : 0;
        if (st.state !== 'idle' || time < windedUntil) bigBadWolf(g, n.x + dir * 4, n.y - 62, dir, 0.9, puff, blow, 0.95);
        if (time < windedUntil) {
          for (let i = 0; i < 3; i++) { const a = time / 300 + (i / 3) * Math.PI * 2; g.fillStyle(0xffe08a, 0.9); g.fillCircle(n.x + Math.cos(a) * 22, n.y - 92 + Math.sin(a) * 6, 3); }
        }
      }
    },

    drawHud(g) {
      // Three house pips, the next one ringed.
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 70, y - 10, 140, 24, 6);
      houses.forEach((h, i) => {
        const hx = x - 40 + i * 40;
        const col = h.kind === 'straw' ? THATCH : h.kind === 'sticks' ? STICKS : BRICK;
        g.fillStyle(col, h.fallen > 0 ? 0.3 : 1); g.fillRect(hx - 8, y - 2, 16, 10); g.fillTriangle(hx - 10, y - 2, hx + 10, y - 2, hx, y - 10);
        if (i === nextHuffIdx && h.fallen === 0) { g.lineStyle(2, 0xff6a5a, 1); g.strokeCircle(hx, y + 1, 13); }
      });
      g.fillStyle(MINE_C, 1); g.fillCircle(x - 62, y + 2, 3); g.fillStyle(FOE_C, 1); g.fillCircle(x + 62, y + 2, 3);
    },
  };
}

export const HUFF_AND_PUFF: GimmickDef = {
  id: GIM_HUFF,
  rules: 'The wolf puffs a gale at you: shelter behind a standing house. Every third breath huffs down the next house — straw, sticks, brick — blasting whoever hides behind it. Brick holds, and winds him.',
  make: makeHuffPuff,
};
