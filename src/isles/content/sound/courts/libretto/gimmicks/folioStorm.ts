import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { loosePage, sheet } from '../art';
import { GILT, GILT_LIT, INK, LEATHER, LEATHER_DARK, OAK, OAK_DARK, PAPER, PAPER_LIT, RED_LIT } from '../palette';
import { alive, clamp, dist, lineDist, stepDt } from '../util';

/**
 * Folio Storm — Binder Spine.
 *
 * Spine binds the Score in the Bindery's sewing room, and the sewing room has a door onto the
 * cave-wind off the mountain. In here that door is set in one wall of the room — and it moves.
 * Out of it blows a gale of loose pages, straight across the floor in a broad band: the wind
 * shoves whoever is in it, and every page that hits you *sticks*. The more pages you carry the
 * slower you are, and a fighter wrapped in eight is *bound*: held fast for a moment like a
 * quire under the press, and stung by the twine.
 *
 * Out of the wind, pages slowly peel away; a dash, a blink, any sudden bolt shakes the lot off
 * at once. And paper is not loyal — each blow you land on Spine passes one of your pages onto
 * him. Carry the storm to him.
 */

const BAND = 120;
const MAX_PAGES = 8;

interface Door { x: number; y: number; a: number }
interface Flyer { x: number; y: number; vx: number; vy: number; rot: number; spin: number; born: number }
interface Stack { pages: number; nextStick: number; nextPeel: number; lastX: number; lastY: number; shakeAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const moveEvery = ctx.hard ? 5600 : 7000;
  const warnMs = 1500;
  const stickMs = ctx.hard ? 380 : 450;
  const doors: Door[] = [
    { x: 14, y: top + (H - top) * 0.3, a: 0 }, { x: 14, y: top + (H - top) * 0.72, a: 0 },
    { x: W - 14, y: top + (H - top) * 0.3, a: Math.PI }, { x: W - 14, y: top + (H - top) * 0.72, a: Math.PI },
    { x: W * 0.3, y: top + 6, a: Math.PI / 2 }, { x: W * 0.7, y: top + 6, a: Math.PI / 2 },
    { x: W * 0.5, y: H - 10, a: -Math.PI / 2 },
  ];
  let door = doors[Math.floor(rng() * doors.length)];
  let nextDoor: Door | null = null;
  let moveAt = 0;
  let started = false;
  let flyers: Flyer[] = [];
  let spawnAcc = 0;
  let selfHit = false;
  const stacks = new Map<Fighter, Stack>();
  for (const f of [player, npc]) stacks.set(f, { pages: 0, nextStick: 0, nextPeel: 0, lastX: f.x, lastY: f.y, shakeAt: -9999 });

  const inBand = (f: Fighter, d: Door) => {
    const along = (f.x - d.x) * Math.cos(d.a) + (f.y - d.y) * Math.sin(d.a);
    return along > -10 && lineDist(f.x, f.y, d.x, d.y, d.a) < BAND;
  };
  const speedOf = (f: Fighter) => 1 - 0.065 * (stacks.get(f)?.pages ?? 0);

  function bind(f: Fighter, s: Stack): void {
    s.pages = 0;
    ctx.root(f, ctx.hard ? 1600 : 1300);
    selfHit = true;
    ctx.hit(f, ctx.hard ? 10 : 8, f.x, f.y);
    selfHit = false;
    ctx.float(f.x, f.y - 50, 'BOUND!', '#f4d88a');
    ctx.sfx('chain');
  }

  function give(from: Fighter, to: Fighter): void {
    const a = stacks.get(from), b = stacks.get(to);
    if (!a || !b || a.pages <= 0 || !alive(to)) return;
    a.pages--;
    b.pages++;
    ctx.float(to.x, to.y - 40, '+1 PAGE', to === player ? '#f05a5a' : '#f4d88a');
    if (b.pages >= MAX_PAGES) bind(to, b);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; moveAt = time + moveEvery; for (const [f, s] of stacks) { s.lastX = f.x; s.lastY = f.y; } }
      // The door moves: a ghost frame shows where first.
      if (!nextDoor && time >= moveAt - warnMs) {
        const opts = doors.filter((d) => d !== door);
        nextDoor = opts[Math.floor(rng() * opts.length)];
        ctx.banner('THE DOOR MOVES', '#f1e8d2');
        ctx.sfx('gear-turn');
      }
      if (nextDoor && time >= moveAt) { door = nextDoor; nextDoor = null; moveAt = time + moveEvery; ctx.sfx('gust'); }
      const weak = nextDoor ? 0.45 : 1;

      // The gale of pages.
      spawnAcc += dt * 34 * weak;
      while (spawnAcc > 1 && flyers.length < 80) {
        spawnAcc -= 1;
        const off = (rng() - 0.5) * BAND * 2;
        const sp = 330 + rng() * 120;
        flyers.push({
          x: door.x - Math.sin(door.a) * off, y: door.y + Math.cos(door.a) * off,
          vx: Math.cos(door.a) * sp, vy: Math.sin(door.a) * sp + (rng() - 0.5) * 40, rot: rng() * 6, spin: (rng() - 0.5) * 9, born: time,
        });
      }
      for (const p of flyers) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; }
      flyers = flyers.filter((p) => p.x > -30 && p.x < W + 30 && p.y > top - 30 && p.y < H + 30 && time - p.born < 4000);

      for (const [f, s] of stacks) {
        if (!alive(f)) continue;
        // A sudden bolt (dash, blink, knock) shakes every page off.
        const moved = Math.hypot(f.x - s.lastX, f.y - s.lastY);
        if (dt > 0 && moved / dt > 560 && s.pages > 0) {
          s.pages = 0;
          s.shakeAt = time;
          ctx.float(f.x, f.y - 46, 'SHAKEN OFF', '#fbf6e8');
          ctx.sfx('whoosh');
        }
        if (inBand(f, door)) {
          const push = 60 * weak * dt;
          ctx.nudge(f, Math.cos(door.a) * push, Math.sin(door.a) * push);
          if (time >= s.nextStick) {
            s.nextStick = time + stickMs / weak;
            s.pages++;
            if (s.pages >= MAX_PAGES) bind(f, s);
          }
          s.nextPeel = time + 1400;
        } else if (s.pages > 0 && time >= s.nextPeel) {
          s.nextPeel = time + 1400;
          s.pages--;
        }
        s.lastX = f.x; s.lastY = f.y;
      }
    },

    playerSpeedMult() { return speedOf(player); },
    npcSpeedMult() { return speedOf(npc); },
    onNpcHurt() { if (!selfHit) give(player, npc); },
    onPlayerHurt() { if (!selfHit) give(npc, player); },

    npcSeek() {
      const s = stacks.get(npc);
      // Out of the wind, at a binder's arm's length; well out of it when he is carrying.
      const d = door;
      const nx = -Math.sin(d.a), ny = Math.cos(d.a);
      const side = (player.x - d.x) * nx + (player.y - d.y) * ny >= 0 ? 1 : -1;
      const off = BAND + ((s?.pages ?? 0) > 3 ? 120 : 60);
      const along = clamp((player.x - d.x) * Math.cos(d.a) + (player.y - d.y) * Math.sin(d.a), 100, 600);
      const x = d.x + Math.cos(d.a) * along + nx * side * off;
      const y = d.y + Math.sin(d.a) * along + ny * side * off;
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The band of the gale: streaks along the wind.
      const d = door;
      const c = Math.cos(d.a), s = Math.sin(d.a), nx = -s, ny = c;
      g.fillStyle(PAPER_LIT, 0.05);
      const L = 1200;
      g.fillPoints([
        { x: d.x + nx * BAND, y: d.y + ny * BAND }, { x: d.x + nx * BAND + c * L, y: d.y + ny * BAND + s * L },
        { x: d.x - nx * BAND + c * L, y: d.y - ny * BAND + s * L }, { x: d.x - nx * BAND, y: d.y - ny * BAND },
      ], true);
      for (let i = 0; i < 14; i++) {
        const ph = ((time / 500) + i * 0.137) % 1;
        const off = ((i * 53) % 100) / 100 * BAND * 2 - BAND;
        const along = ph * 1000;
        const x = d.x + nx * off + c * along, y = d.y + ny * off + s * along;
        g.lineStyle(1.5, PAPER_LIT, 0.3 * Math.sin(ph * Math.PI));
        g.lineBetween(x, y, x - c * 40, y - s * 40);
      }
      g.lineStyle(1, PAPER_LIT, 0.18);
      g.lineBetween(d.x + nx * BAND, d.y + ny * BAND, d.x + nx * BAND + c * L, d.y + ny * BAND + s * L);
      g.lineBetween(d.x - nx * BAND, d.y - ny * BAND, d.x - nx * BAND + c * L, d.y - ny * BAND + s * L);
    },

    drawAir(g, time) {
      // The door: an oak door in its frame, flung open on the gale; a ghost frame where it goes next.
      const drawDoor = (d: Door, a: number, ghost: boolean) => {
        const c = Math.cos(d.a), s = Math.sin(d.a), nx = -s, ny = c;
        const hw = 34;
        const fx = d.x - c * 4, fy = d.y - s * 4;
        if (ghost) {
          g.lineStyle(2, PAPER_LIT, a * (0.4 + Math.sin(time / 90) * 0.3));
          g.lineBetween(fx + nx * hw, fy + ny * hw, fx - nx * hw, fy - ny * hw);
          g.strokeCircle(fx, fy, 20);
          return;
        }
        g.lineStyle(14, LEATHER_DARK, a); g.lineBetween(fx + nx * (hw + 6), fy + ny * (hw + 6), fx - nx * (hw + 6), fy - ny * (hw + 6));
        g.lineStyle(10, PAPER_LIT, a * 0.9); g.lineBetween(fx + nx * hw, fy + ny * hw, fx - nx * hw, fy - ny * hw);
        // The door leaf, swung inward and banging on the wind.
        const swing = 0.9 + Math.sin(time / 140) * 0.12;
        const hx = fx + nx * hw, hy = fy + ny * hw;
        const la = Math.atan2(-ny, -nx) + swing * (d.a === 0 || d.a === Math.PI / 2 ? 1 : -1) * 0.9;
        g.lineStyle(9, OAK_DARK, a); g.lineBetween(hx, hy, hx + Math.cos(la) * hw * 1.8, hy + Math.sin(la) * hw * 1.8);
        g.lineStyle(6, OAK, a); g.lineBetween(hx, hy, hx + Math.cos(la) * hw * 1.8, hy + Math.sin(la) * hw * 1.8);
        g.fillStyle(GILT, a); g.fillCircle(hx + Math.cos(la) * hw * 1.5, hy + Math.sin(la) * hw * 1.5, 3);
      };
      drawDoor(door, 1, false);
      if (nextDoor) drawDoor(nextDoor, 1, true);
      for (const p of flyers) loosePage(g, p.x, p.y, 1, p.rot, (p.rot * 0.3) % 1, 0.9);
      // Pages stuck to each fighter, and the shake-off burst.
      for (const [f, s] of stacks) {
        if (!alive(f)) continue;
        for (let i = 0; i < s.pages; i++) {
          const a = i * 2.4 + 0.6;
          const r = 14 + (i % 3) * 4;
          sheet(g, f.x + Math.cos(a) * r, f.y - 4 + Math.sin(a) * r * 0.9, 11, 13, a + Math.sin(time / 200 + i) * 0.15, i % 2 ? PAPER : PAPER_LIT);
        }
        if (s.pages >= MAX_PAGES - 2) { g.lineStyle(2, RED_LIT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(f.x, f.y, 30); }
        if (time - s.shakeAt < 500) {
          const k = (time - s.shakeAt) / 500;
          for (let i = 0; i < 8; i++) { const a = i * 0.785; loosePage(g, f.x + Math.cos(a) * (20 + k * 70), f.y + Math.sin(a) * (20 + k * 60), 1, a + k * 4, k, 1 - k); }
        }
      }
    },

    drawHud(g) {
      for (const [f, x0, dir] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const s = stacks.get(f);
        if (!s) continue;
        for (let i = 0; i < MAX_PAGES; i++) {
          const x = x0 + dir * (i * 14 + 6), y = top + 14;
          g.fillStyle(INK, 0.5); g.fillRect(x - 5, y - 7, 10, 13);
          if (i < s.pages) { g.fillStyle(i >= MAX_PAGES - 2 ? 0xf8d0d0 : PAPER_LIT, 1); g.fillRect(x - 4, y - 6, 8, 11); g.fillStyle(INK, 0.6); g.fillRect(x - 2, y - 3, 4, 1); g.fillRect(x - 2, y, 4, 1); }
        }
        g.lineStyle(1, GILT_LIT, 0.6); g.strokeRect(dir > 0 ? x0 - 2 : x0 - MAX_PAGES * 14 + 2, top + 5, MAX_PAGES * 14, 18);
        g.fillStyle(LEATHER, 1); g.fillRect(dir > 0 ? x0 + MAX_PAGES * 14 : x0 - MAX_PAGES * 14 - 6, top + 5, 4, 18);
      }
    },
  };
}

export const FOLIO_STORM: GimmickDef = {
  id: 'libretto-folio-storm',
  rules: 'A gale of pages blows from a door that moves. Pages stick and slow you; eight bind you fast. Dash to shake them off — and every blow you land passes one to Spine.',
  make,
};
