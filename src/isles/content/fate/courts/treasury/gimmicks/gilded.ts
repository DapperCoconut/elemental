import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { coin, coinFlat } from '../art';
import { GOLD, GOLD_DARK, GOLD_DEEP, GOLD_LIT, GOLD_PALE } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Gilded — Miser Gilt.
 *
 * Gilt cannot bear a bare floor. Wherever he walks the tiles he leaves turn to gold leaf behind
 * him, and every so often he stoops and gilds a ring of floor round *you*. Gold is heavy: on a
 * gilded tile you are weighed down (slowed) — and so is he, if he is made to stand on it.
 *
 * But gold leaf is thin. Any blow that lands on someone standing on gilt shatters the tiles
 * round them, and any shot that flies low over a gilded tile cracks it — and a shattered tile
 * spills coins, which heal whoever picks them up. Shoot a path clear through his ring; better,
 * knock him about on his own gold and gather what falls.
 */

const CELL = 48;
const GILD_DELAY = 420;
const MAX_GILT = 70;
const SLOW = 0.55;
const HEAL = 3;
const COIN_PICK = 30;

interface Tile { cx: number; cy: number; gildAt: number; ring: boolean }
interface Spill { x: number; y: number; bornAt: number; vx: number; vy: number }
interface Shard { x: number; y: number; vx: number; vy: number; at: number; a: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cols = Math.floor(W / CELL), rows = Math.floor((H - top) / CELL);
  const tiles = new Map<number, Tile>();
  const spills: Spill[] = [];
  const shards: Shard[] = [];
  const key = (cx: number, cy: number) => cy * 1000 + cx;
  const cellOf = (x: number, y: number) => ({ cx: clamp(Math.floor(x / CELL), 0, cols - 1), cy: clamp(Math.floor((y - top) / CELL), 0, rows - 1) });
  const centre = (t: { cx: number; cy: number }) => ({ x: t.cx * CELL + CELL / 2, y: top + t.cy * CELL + CELL / 2 });
  let lastCell = -1;
  let nextRing = 0;
  let ringWarnAt = -1;
  let ringAt = { x: 0, y: 0 };
  let started = false;

  const giltUnder = (f: Fighter, now: number): boolean => {
    const c = cellOf(f.x, f.y);
    const t = tiles.get(key(c.cx, c.cy));
    return !!t && now >= t.gildAt;
  };

  function gild(cx: number, cy: number, at: number, ring = false): void {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const k = key(cx, cy);
    if (tiles.has(k)) return;
    tiles.set(k, { cx, cy, gildAt: at, ring });
    // The oldest leaf flakes away when there is too much of it.
    if (tiles.size > MAX_GILT) {
      const first = tiles.keys().next().value;
      if (first !== undefined) tiles.delete(first);
    }
  }

  function shatter(cx: number, cy: number, now: number): boolean {
    const k = key(cx, cy);
    const t = tiles.get(k);
    if (!t || now < t.gildAt) return false;
    tiles.delete(k);
    const p = centre(t);
    for (let i = 0; i < 6; i++) {
      const a = ctx.rng() * Math.PI * 2;
      shards.push({ x: p.x, y: p.y, vx: Math.cos(a) * (60 + ctx.rng() * 90), vy: Math.sin(a) * (60 + ctx.rng() * 90), at: now, a: ctx.rng() * 6 });
    }
    if (spills.length < 14 && ctx.rng() < 0.75) {
      const a = ctx.rng() * Math.PI * 2;
      spills.push({ x: p.x, y: p.y, bornAt: now, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 });
    }
    return true;
  }

  /** A blow on someone stood on gilt cracks the leaf round them. */
  function blowOn(f: Fighter): void {
    const now = ctx.scene.time.now;
    if (!giltUnder(f, now)) return;
    const c = cellOf(f.x, f.y);
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (shatter(c.cx + dx, c.cy + dy, now)) n++;
    if (n > 0) { ctx.sfx('crystal-shatter'); ctx.float(f.x, f.y - 46, 'GILT SHATTERS', '#ffe27a'); }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextRing = time + 4200;
        ctx.banner('GILT GILDS WHERE HE WALKS', '#ffe27a');
      }
      // His trail.
      if (alive(npc)) {
        const c = cellOf(npc.x, npc.y);
        const k = key(c.cx, c.cy);
        if (k !== lastCell) {
          lastCell = k;
          gild(c.cx, c.cy, time + GILD_DELAY);
          if (ctx.hard) gild(c.cx + (ctx.rng() < 0.5 ? -1 : 1), c.cy, time + GILD_DELAY + 120);
        }
      }
      // The miser's ring: a circle of floor round you, telegraphed in faint gold, then laid.
      if (ringWarnAt < 0 && time >= nextRing - 1100 && alive(player)) {
        ringWarnAt = time;
        ringAt = { x: player.x, y: player.y };
        ctx.sfx('sparkle');
        ctx.float(npc.x, npc.y - 54, 'MINE. ALL MINE.', '#ffe27a');
      }
      if (ringWarnAt >= 0 && time >= nextRing) {
        ringWarnAt = -1;
        nextRing = time + (ctx.hard ? 6200 : 7600);
        const c = cellOf(ringAt.x, ringAt.y);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > 1.2 && d < 2.6) gild(c.cx + dx, c.cy + dy, time + 60, true);
        }
        tk.sfx('crystal-chime');
      }
      // Shots flying low over gilt crack it.
      for (const s of ctx.shotsNear(W / 2, (top + H) / 2, 900)) {
        const c = cellOf(s.x, s.y);
        if (shatter(c.cx, c.cy, time)) ctx.sfx('crystal-shatter');
      }
      // Spilled coins slide and are picked up.
      for (let i = spills.length - 1; i >= 0; i--) {
        const s = spills[i];
        if (time - s.bornAt < 400) {
          s.x = clamp(s.x + s.vx * dt, 40, W - 40); s.y = clamp(s.y + s.vy * dt, top + 30, H - 30);
          s.vx *= 1 - dt * 3; s.vy *= 1 - dt * 3;
          continue;
        }
        let taken = false;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, s.x, s.y) > COIN_PICK + 16) continue;
          ctx.heal(f, HEAL);
          ctx.sfx('money');
          taken = true;
          break;
        }
        if (taken || time - s.bornAt > 14000) spills.splice(i, 1);
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 3; s.vy *= 1 - dt * 3;
        if (time - s.at > 700) shards.splice(i, 1);
      }
    },

    playerSpeedMult: () => (alive(player) && giltUnder(player, ctx.scene.time.now) ? SLOW : 1),
    npcSpeedMult: () => (alive(npc) && giltUnder(npc, ctx.scene.time.now) ? SLOW + 0.1 : 1),
    onPlayerHurt() { blowOn(player); },
    onNpcHurt() { blowOn(npc); },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Hungry for spilled coin when hurt.
      if (npc.hp < npc.maxHp * 0.7) {
        let best: Spill | null = null, bd = Infinity;
        for (const s of spills) { const d = dist(s.x, s.y, npc.x, npc.y); if (d < bd && now - s.bornAt > 400) { bd = d; best = s; } }
        if (best && bd < 320) return { x: best.x, y: best.y };
      }
      // Otherwise circle you at a wary distance, laying a fence of gold — off his own gilt.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.7;
      let x = player.x + Math.cos(a) * 200, y = player.y + Math.sin(a) * 170;
      for (let i = 0; i < 4; i++) {
        const c = cellOf(x, y);
        const t = tiles.get(key(c.cx, c.cy));
        if (!t || now < t.gildAt) break;
        x += Math.cos(a + Math.PI / 2) * CELL; y += Math.sin(a + Math.PI / 2) * CELL;
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      for (const t of tiles.values()) {
        const p = centre(t);
        const x0 = p.x - CELL / 2, y0 = p.y - CELL / 2;
        if (time < t.gildAt) {
          // Leaf settling: a gold square growing from the centre.
          const k = clamp(1 - (t.gildAt - time) / GILD_DELAY, 0, 1);
          g.fillStyle(GOLD, 0.25 + k * 0.4); g.fillRect(p.x - (CELL / 2) * k, p.y - (CELL / 2) * k, CELL * k, CELL * k);
          continue;
        }
        g.fillStyle(GOLD_DARK, 0.85); g.fillRect(x0 + 1, y0 + 1, CELL - 2, CELL - 2);
        g.fillStyle(t.ring ? lit(GOLD, 0.1) : GOLD, 0.9); g.fillRect(x0 + 3, y0 + 3, CELL - 6, CELL - 6);
        // Crinkles in the leaf, and crystal facets where Gilt's own trail was laid.
        const s = (t.cx * 7 + t.cy * 13) % 5;
        g.lineStyle(1, GOLD_DEEP, 0.4);
        g.lineBetween(x0 + 6 + s * 3, y0 + 6, x0 + CELL - 10, y0 + 14 + s * 4);
        g.lineBetween(x0 + 8, y0 + CELL - 12 - s * 2, x0 + 24 + s * 2, y0 + CELL - 6);
        if (!t.ring) {
          g.fillStyle(GOLD_PALE, 0.4);
          g.fillTriangle(x0 + 8, y0 + 8, x0 + 20, y0 + 6, x0 + 12, y0 + 18);
        }
        const tw = (time / 900 + (t.cx * 0.37 + t.cy * 0.61)) % 1;
        if (tw < 0.12) { g.fillStyle(0xffffff, 0.8 * (1 - tw / 0.12)); g.fillCircle(x0 + 10 + s * 5, y0 + 12 + s * 3, 2); }
      }
      // The ring's telegraph: the cells it is about to lay, outlined.
      if (ringWarnAt >= 0) {
        const k = clamp((time - ringWarnAt) / 1100, 0, 1);
        const c = cellOf(ringAt.x, ringAt.y);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= 1.2 || d >= 2.6) continue;
          const p = centre({ cx: c.cx + dx, cy: c.cy + dy });
          g.lineStyle(2, GOLD_LIT, 0.25 + k * 0.6); g.strokeRect(p.x - CELL / 2 + 3, p.y - CELL / 2 + 3, CELL - 6, CELL - 6);
          g.fillStyle(GOLD, 0.08 + k * 0.18); g.fillRect(p.x - CELL / 2 + 3, p.y - CELL / 2 + 3, CELL - 6, CELL - 6);
        }
      }
      for (const s of spills) coinFlat(g, s.x, s.y, 7);
    },

    drawAir(g, time) {
      for (const s of shards) {
        const k = (time - s.at) / 700;
        g.fillStyle(k < 0.5 ? GOLD_PALE : GOLD, 1 - k);
        const r = 4 * (1 - k * 0.5);
        g.fillTriangle(s.x + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r, s.x + Math.cos(s.a + 2.2) * r, s.y + Math.sin(s.a + 2.2) * r, s.x + Math.cos(s.a + 4.1) * r, s.y + Math.sin(s.a + 4.1) * r);
      }
      // Weighed down: a gold weight hangs off anyone stood on gilt.
      for (const f of [player, npc]) {
        if (!alive(f) || !giltUnder(f, time)) continue;
        g.lineStyle(1.5, GOLD_DARK, 0.9); g.lineBetween(f.x + 16, f.y - 20, f.x + 20, f.y + 4);
        coin(g, f.x + 20, f.y + 8, 6, 'gold', 1, 'blank');
        g.fillStyle(GOLD_LIT, 0.4); g.fillEllipse(f.x, f.y + 14, 40, 10);
      }
    },
  };
}

export const GILDED: GimmickDef = {
  id: 'treasury-gilded',
  rules: 'The floor turns to gold leaf behind Gilt, and heavy gilt slows whoever stands on it. Blows and shots shatter it into coins that heal the picker.',
  make,
};
