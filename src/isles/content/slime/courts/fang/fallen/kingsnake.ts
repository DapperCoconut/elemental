import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { coiledSnake, SKIN_ADDER, SKIN_VIPER } from '../art';
import { FANG_DARK, FANG_LIT, MUD_LIT, VENIN_EYE, VENOM, VENOM_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Snake-Eater — Pit-Warden Reverdy Gane, in the King's telling the warden who kept the
 * king-snake that cleans the pits: it eats the serpents that would not milk.
 *
 * The pit-yard floor is laid in old square flags, and the king-snake goes over them a flag at a
 * time, never backwards, always toward the nearest adder Gane throws down. Each adder it eats
 * makes it a flag longer, and its body is a wall: you cannot walk through it (a dash leaps it)
 * and it stops every shot. The flag its head will enter next is lit; whoever stands on it is
 * bitten and shoved on.
 *
 * The exploit: strike its head and it turns away from you, a quarter-turn, on its next step.
 * Herd it. Boxed in with nowhere to go — walls, its own body — it *knots*: the whole length of
 * it thrashes and crushes everyone beside it, and it sheds back to a short snake. Box it round
 * Gane. Halfway down it goes quicker and he throws the adders at your feet.
 */

const ID = fallenId('fang', 'kingsnake');
const CELL = 64;
const BITE = 14;
const KNOT_MS = 1100;
const CRUSH = 15;
const MAX_LEN = 16;
const KB_BLACK = 0x18161a;
const KB_RED = 0xb8382c;
const KB_CREAM = 0xe8dcb0;

interface Cell { c: number; r: number }
/** An adder on a flag, waiting to be eaten. */
interface Adder { c: number; r: number; at: number; viper: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const COLS = Math.floor(W / CELL), ROWS = Math.floor((H - top - 16) / CELL);
  const x0 = (W - COLS * CELL) / 2, y0 = top + (H - top - ROWS * CELL) / 2;
  const cx = (c: number): number => x0 + c * CELL + CELL / 2;
  const cy = (r: number): number => y0 + r * CELL + CELL / 2;
  const cellOf = (x: number, y: number): Cell => ({ c: clamp(Math.floor((x - x0) / CELL), 0, COLS - 1), r: clamp(Math.floor((y - y0) / CELL), 0, ROWS - 1) });
  const midC = Math.floor(COLS / 2);
  /** Head first; it starts in the middle column heading south. */
  let body: Cell[] = Array.from({ length: 5 }, (_, i) => ({ c: midC, r: 4 - i }));
  let prev: Cell[] = body.map((b) => ({ ...b }));
  let dir: Cell = { c: 0, r: 1 };
  let forced: Cell | null = null;
  let lastStep = 0;
  let lastStrike = 0;
  let knotAt = 0;
  let nextAdder = 0;
  let quick = false;
  const adders: Adder[] = [];
  let head: StrikeTarget | null = null;

  const stepMs = (): number => (quick ? 340 : 420);
  const inGrid = (c: Cell): boolean => c.c >= 0 && c.c < COLS && c.r >= 0 && c.r < ROWS;
  const onBody = (c: Cell, skipTail = false): boolean => body.some((b, i) => (!skipTail || i < body.length - 1) && b.c === c.c && b.r === c.r);
  const add = (a: Cell, b: Cell): Cell => ({ c: a.c + b.c, r: a.r + b.r });
  const free = (c: Cell): boolean => inGrid(c) && !onBody(c, true);

  function nextCell(): Cell | null {
    const opts: Cell[] = forced ? [forced] : [dir, { c: -dir.r, r: dir.c }, { c: dir.r, r: -dir.c }];
    let best: Cell | null = null, bd = Infinity;
    for (const d of opts) {
      const n = add(body[0], d);
      if (!free(n)) continue;
      let score = 0;
      if (adders.length) score = Math.min(...adders.map((a) => Math.abs(a.c - n.c) + Math.abs(a.r - n.r)));
      if (d.c === dir.c && d.r === dir.r) score -= 0.5;
      if (score < bd) { bd = score; best = d; }
    }
    return best;
  }

  function strikeHead(by: 'player' | 'npc'): void {
    const t = ctx.scene.time.now;
    if (knotAt || t - lastStrike < 600) return;
    lastStrike = t;
    const s = by === 'player' ? player : npc;
    const hx = cx(body[0].c), hy = cy(body[0].r);
    const p1: Cell = { c: -dir.r, r: dir.c };
    const away = (hx - s.x) * p1.c + (hy - s.y) * p1.r >= 0 ? p1 : { c: dir.r, r: -dir.c };
    forced = away;
    ctx.sfx('clang');
    ctx.float(hx, hy - 36, 'TURNED', '#f0e0c0');
  }

  function spawnAdder(time: number, near: Fighter | null): void {
    for (let tries = 0; tries < 40; tries++) {
      const base = near ? cellOf(near.x, near.y) : { c: Math.floor(rng() * COLS), r: Math.floor(rng() * ROWS) };
      const c: Cell = near ? { c: clamp(base.c + Math.floor(rng() * 5) - 2, 0, COLS - 1), r: clamp(base.r + Math.floor(rng() * 5) - 2, 0, ROWS - 1) } : base;
      if (onBody(c) || adders.some((a) => a.c === c.c && a.r === c.r) || Math.abs(c.c - body[0].c) + Math.abs(c.r - body[0].r) < 2) continue;
      adders.push({ c: c.c, r: c.r, at: time, viper: rng() < 0.5 });
      return;
    }
  }

  function step(time: number): void {
    const d = nextCell();
    forced = null;
    if (!d) { knotAt = time; ctx.sfx('chain'); ctx.banner('Knotted!', '#f0d0b0'); return; }
    dir = d;
    prev = body.map((b) => ({ ...b }));
    const n = add(body[0], d);
    body.unshift(n);
    const ai = adders.findIndex((a) => a.c === n.c && a.r === n.r);
    if (ai >= 0) { adders.splice(ai, 1); ctx.sfx('slime-splat'); if (body.length > MAX_LEN) body.pop(); }
    else body.pop();
    prev.unshift(prev[0]);
    if (prev.length > body.length) prev.length = body.length;
    while (prev.length < body.length) prev.push(body[prev.length]);
    // The bite: whoever is on the flag it just entered.
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f)) continue;
      if (Math.abs(f.x - cx(n.c)) < CELL / 2 + 6 && Math.abs(f.y - cy(n.r)) < CELL / 2 + 6) {
        ctx.hit(f, BITE, f.x, f.y);
        ctx.nudge(f, d.c * 70, d.r * 70);
        ctx.stun(f, 300);
        ctx.float(f.x, f.y - 46, 'BITTEN', '#f0a080');
        ctx.sfx('stab');
      }
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!head) {
        head = ctx.target({ x: cx(body[0].c), y: cy(body[0].r) - 6, r: 26, onStruck: (by) => strikeHead(by) });
        lastStep = time + 1200; nextAdder = time + 600;
      }
      if (!quick && npc.hp / npc.maxHp < 0.5) { quick = true; ctx.banner('The king-snake quickens — adders at your feet', '#f0d0b0'); ctx.sfx('boss-phase'); }
      if (time >= nextAdder && adders.length < (quick ? 3 : 2)) {
        spawnAdder(time, quick && rng() < 0.6 ? player : null);
        nextAdder = time + (quick ? 2800 : 3600);
        ctx.sfx('whoosh');
      }
      if (knotAt) {
        if (time - knotAt >= KNOT_MS) {
          for (const f of [player, npc]) {
            if (!alive(f) || ctx.isAirborne(f)) continue;
            if (body.some((b) => dist(f.x, f.y, cx(b.c), cy(b.r)) < CELL * 0.85)) {
              ctx.hit(f, CRUSH, f.x, f.y); ctx.root(f, 600);
              ctx.float(f.x, f.y - 46, 'CRUSHED', '#f0a080');
            }
          }
          ctx.sfx('gravity-slam');
          body = body.slice(0, 4); prev = body.map((b) => ({ ...b }));
          knotAt = 0; lastStep = time + 500;
        }
      } else if (time - lastStep >= stepMs()) { lastStep = time; step(time); }
      head.moveTo(cx(body[0].c), cy(body[0].r) - 6);

      // The body is a wall: push anyone standing in it out by the nearer edge (a dash leaps it).
      for (const f of [player, npc]) {
        if (!alive(f) || ctx.dashing(f) || ctx.isAirborne(f)) continue;
        for (let i = 1; i < body.length; i++) {
          const bx = cx(body[i].c), by = cy(body[i].r), dx = f.x - bx, dy = f.y - by, lim = CELL / 2 + 4;
          if (Math.abs(dx) >= lim || Math.abs(dy) >= lim) continue;
          if (lim - Math.abs(dx) < lim - Math.abs(dy)) ctx.nudge(f, (dx >= 0 ? 1 : -1) * (lim - Math.abs(dx)), 0);
          else ctx.nudge(f, 0, (dy >= 0 ? 1 : -1) * (lim - Math.abs(dy)));
          break;
        }
      }
      for (const b of body) for (const s of ctx.shotsNear(cx(b.c), cy(b.r), 30)) s.block();
    },

    npcSeek() {
      if (!alive(player)) return null;
      const hx = cx(body[0].c), hy = cy(body[0].r);
      const n = add(body[0], dir);
      const nx = cx(n.c), ny = cy(n.r);
      if (dist(npc.x, npc.y, nx, ny) < CELL || (knotAt && body.some((b) => dist(npc.x, npc.y, cx(b.c), cy(b.r)) < CELL * 1.1))) {
        const a = Math.atan2(npc.y - hy, npc.x - hx) + (knotAt ? 0 : Math.PI / 3);
        return { x: clamp(npc.x + Math.cos(a) * 130, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 130, top + 40, H - 40) };
      }
      // Herd it: stand on the far side of the head from the player, so a strike turns it at them.
      const px = player.x - hx, py = player.y - hy;
      const along = px * dir.c + py * dir.r;
      const perp: Cell = { c: -dir.r, r: dir.c };
      const side = px * perp.c + py * perp.r;
      if (Math.abs(along) < CELL * 1.5 && Math.abs(side) < CELL * 4 && Math.abs(side) > CELL * 0.6) {
        const s = side >= 0 ? 1 : -1;
        return { x: clamp(hx - perp.c * s * 72, 60, W - 60), y: clamp(hy - perp.r * s * 72, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let p: Pt = { x: player.x + Math.cos(a) * 230, y: player.y + Math.sin(a) * 230 };
      if (onBody(cellOf(p.x, p.y))) p = { x: player.x + Math.cos(a + 1) * 230, y: player.y + Math.sin(a + 1) * 230 };
      return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The old flags of the pit-yard, chalked where they meet.
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if ((c + r) % 2 === 0) { g.fillStyle(MUD_LIT, 0.08); g.fillRect(x0 + c * CELL + 2, y0 + r * CELL + 2, CELL - 4, CELL - 4); }
      }
      g.lineStyle(1, FANG_DARK, 0.18);
      for (let c = 0; c <= COLS; c++) g.lineBetween(x0 + c * CELL, y0, x0 + c * CELL, y0 + ROWS * CELL);
      for (let r = 0; r <= ROWS; r++) g.lineBetween(x0, y0 + r * CELL, x0 + COLS * CELL, y0 + r * CELL);
      // The flag it enters next, lit as the step comes.
      if (!knotAt) {
        const d = forced ?? dir;
        const n = add(body[0], d);
        if (inGrid(n)) {
          const k = clamp((time - lastStep) / stepMs(), 0, 1);
          g.fillStyle(KB_RED, 0.12 + k * 0.22); g.fillRect(x0 + n.c * CELL + 3, y0 + n.r * CELL + 3, CELL - 6, CELL - 6);
          g.lineStyle(2, lit(KB_RED, 0.3), 0.5 + k * 0.4); g.strokeRect(x0 + n.c * CELL + 3, y0 + n.r * CELL + 3, CELL - 6, CELL - 6);
          if (forced) {
            const ax = cx(n.c), ay = cy(n.r);
            g.fillStyle(FANG_LIT, 0.8); g.fillTriangle(ax + d.c * 14, ay + d.r * 14, ax - d.r * 9 - d.c * 4, ay + d.c * 9 - d.r * 4, ax + d.r * 9 - d.c * 4, ay - d.c * 9 - d.r * 4);
          }
        }
      } else {
        const k = clamp((time - knotAt) / KNOT_MS, 0, 1);
        for (const b of body) { g.lineStyle(2, KB_RED, 0.3 + k * 0.6); g.strokeCircle(cx(b.c), cy(b.r), CELL * 0.85); }
      }
      for (const a of adders) shadow(g, cx(a.c), cy(a.r) + 4, 30, 9, 0.25);
      for (let i = 0; i < body.length; i++) { const p = pos(i, time); shadow(g, p.x, p.y + 10, 46, 12, 0.24); }
    },

    drawAir(g, time) {
      for (const a of adders) coiledSnake(g, cx(a.c), cy(a.r), 1, a.viper ? SKIN_VIPER : SKIN_ADDER, Math.sin(time / 600 + a.c) * 2, 0.15, time);
      const thrash = knotAt ? Math.sin(time / 40) * 5 : 0;
      const pts = body.map((_, i) => { const p = pos(i, time); return { x: p.x + (i % 2 ? thrash : -thrash), y: p.y + (i % 2 ? -thrash : thrash) * 0.5 }; });
      // Body: a fat round-sectioned tube through the flags, banded black-red-black-cream like a scarlet king.
      for (let i = pts.length - 1; i > 0; i--) {
        const a = pts[i], b = pts[i - 1];
        for (let s = 0; s < 6; s++) {
          const t = s / 6, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          const band = (i * 6 + s) % 8;
          const c = band < 2 ? KB_RED : band === 2 || band === 7 ? KB_BLACK : band < 5 ? KB_CREAM : KB_BLACK;
          const r = 15 - (i / Math.max(1, pts.length)) * 5;
          g.fillStyle(dim(c, 0.45), 1); g.fillCircle(x, y + 2, r + 1);
          g.fillStyle(c, 1); g.fillCircle(x, y, r);
          g.fillStyle(lit(c, 0.35), 0.5); g.fillCircle(x - r * 0.3, y - r * 0.4, r * 0.35);
        }
      }
      // Tail tip.
      const tl = pts[pts.length - 1];
      g.fillStyle(KB_BLACK, 1); g.fillCircle(tl.x, tl.y, 8);
      drawHead(g, pts[0], time);
    },

    drawHud(g) {
      // Bottom right: its length, in bands, and the adders waiting.
      const x1 = W - 20, y = H - 24;
      g.fillStyle(0x0e140e, 0.7); g.fillRoundedRect(x1 - 210, y - 15, 210, 30, 8);
      for (let i = 0; i < MAX_LEN; i++) {
        const x = x1 - 18 - i * 11;
        const c = i < body.length ? (i % 3 === 0 ? KB_RED : i % 3 === 1 ? KB_CREAM : KB_BLACK) : 0x2a2a24;
        g.fillStyle(c, 1); g.fillCircle(x, y, 4.5);
        if (i < body.length && c === KB_BLACK) { g.lineStyle(1, KB_CREAM, 0.5); g.strokeCircle(x, y, 4.5); }
      }
      g.fillStyle(VENOM, 1); for (let i = 0; i < adders.length; i++) g.fillCircle(x1 - 200 + i * 8, y - 8, 2.5);
    },
  };

  /** A body point between its last flag and this one, eased with the step. */
  function pos(i: number, time: number): Pt {
    const k = knotAt ? 1 : clamp((time - lastStep) / 200, 0, 1);
    const a = prev[i] ?? body[i], b = body[i];
    return { x: cx(a.c) + (cx(b.c) - cx(a.c)) * k, y: cy(a.r) + (cy(b.r) - cy(a.r)) * k };
  }

  /** The king-snake's head: black-capped, a red snout band, gold eyes, the tongue flicking. */
  function drawHead(g: G, p: Pt, time: number): void {
    const d = forced ?? dir;
    const c = d.c, s = d.r;
    g.fillStyle(dim(KB_BLACK, 0.2), 1); g.fillEllipse(p.x + c * 6, p.y + s * 6 + 2, 34, 26);
    g.fillStyle(KB_BLACK, 1); g.fillEllipse(p.x + c * 6, p.y + s * 6, 32, 24);
    g.fillStyle(KB_RED, 1); g.fillEllipse(p.x + c * 14, p.y + s * 14, 16, 14);
    g.fillStyle(KB_CREAM, 1); g.fillEllipse(p.x + c * 2, p.y + s * 2, 10, 8);
    for (const side of [-1, 1]) {
      const ex = p.x + c * 10 - s * side * 8, ey = p.y + s * 10 + c * side * 8 - 2;
      g.fillStyle(VENIN_EYE, 1); g.fillCircle(ex, ey, 2.6);
      g.fillStyle(0x101010, 1); g.fillCircle(ex + c, ey + s, 1.1);
    }
    if ((time / 380) % 1 < 0.25 || knotAt) {
      const mx = p.x + c * 22, my = p.y + s * 22;
      g.lineStyle(1.5, 0xd83048, 1); g.lineBetween(mx, my, mx + c * 9, my + s * 9);
      g.lineBetween(mx + c * 9, my + s * 9, mx + c * 12 - s * 3, my + s * 12 + c * 3);
      g.lineBetween(mx + c * 9, my + s * 9, mx + c * 12 + s * 3, my + s * 12 - c * 3);
    }
    if (knotAt) { g.lineStyle(2, VENOM_LIT, 0.7); g.strokeCircle(p.x, p.y, 22 + Math.sin(time / 50) * 3); }
  }
}

export const FALLEN_KINGSNAKE: GimmickDef = {
  id: ID,
  rules: 'The king-snake eats adders flag by flag and grows; its body is a wall. Strike its head to turn it away from you; boxed in, it knots and crushes.',
  make,
};
