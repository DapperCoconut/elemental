import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { letter } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, INK, IRON, IRON_LIT, LAMP, MASK_TEAL, PAPER, TIMBER, WAX, WAX_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Caught Holding — Framer Osmund Pike, who in the King's telling never informed on anyone: he
 * only made sure that when the watch came, the right thing was found near the right person.
 *
 * Pike flicks contraband across the yard to land at your feet — a forged letter, a stolen signet,
 * a cipher-book, a purse of hush-money, a dagger. It does not hurt. Then the watch's rattle goes
 * and the search is called: a beat later every piece of evidence charges *whoever is standing
 * nearest it* — a blow per piece, and three or more at once and they are held in irons. A dotted
 * line on each piece shows who it would charge if the search came now.
 *
 * So the evidence is only as good as the distance. Carry the fight toward him, or strike a piece
 * and it skids away from you — kick it to his feet and it is his. Past half he flicks them in
 * pairs and the watch comes round sooner.
 */

const ID = fallenId('cloak', 'planted');
const THROW_MS = 2300;
const FLIGHT_MS = 620;
const SEARCH = 9000;
const SEARCH_LATE = 7000;
const SEARCH_WARN = 2100;
const REACH = 240;
const MAX_ITEMS = 8;

type Kind = 'letter' | 'signet' | 'book' | 'purse' | 'dagger';
const KINDS: Kind[] = ['letter', 'signet', 'book', 'purse', 'dagger'];

interface Item {
  kind: Kind; x: number; y: number; vx: number; vy: number;
  /** Thrown from → landing at, over FLIGHT_MS from `thrownAt`. */
  fx: number; fy: number; tx: number; ty: number; thrownAt: number;
  rot: number; searches: number;
  target: StrikeTarget | null;
}
interface Charge { item: Item; f: Fighter; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const items: Item[] = [];
  const charges: Charge[] = [];
  let late = false;
  let started = false;
  let nextThrow = 0;
  let nextSearch = 0;
  let warned = false;
  let kindAt = 0;

  const landed = (it: Item, time: number): boolean => time - it.thrownAt >= FLIGHT_MS;

  /** The fighter a piece would charge right now, or null if nobody is within reach of it. */
  function nearest(it: Item): Fighter | null {
    const dp = alive(player) ? dist(it.x, it.y, player.x, player.y) : Infinity;
    const dn = alive(npc) ? dist(it.x, it.y, npc.x, npc.y) : Infinity;
    const d = Math.min(dp, dn);
    if (d > REACH) return null;
    return dp <= dn ? player : npc;
  }

  function flick(time: number, spread: number): void {
    if (!alive(player) || !alive(npc) || items.length >= MAX_ITEMS) return;
    const a = rng() * Math.PI * 2, r = 60 + rng() * 50;
    const tx = clamp(player.x + Math.cos(a + spread) * r, 60, W - 60), ty = clamp(player.y + Math.sin(a + spread) * r, top + 40, H - 40);
    const it: Item = {
      kind: KINDS[kindAt++ % KINDS.length], x: npc.x, y: npc.y, vx: 0, vy: 0,
      fx: npc.x, fy: npc.y - 30, tx, ty, thrownAt: time, rot: rng() * 6.28, searches: 0, target: null,
    };
    items.push(it);
    ctx.sfx('whoosh');
  }

  function kick(it: Item, by: Fighter): void {
    const d = Math.max(1, dist(by.x, by.y, it.x, it.y));
    it.vx = ((it.x - by.x) / d) * 430; it.vy = ((it.y - by.y) / d) * 430;
    ctx.sfx('slash');
  }

  function search(time: number): void {
    const count = new Map<Fighter, number>();
    for (const it of items) {
      if (!landed(it, time)) continue;
      const f = nearest(it);
      it.searches++;
      if (!f) continue;
      charges.push({ item: it, f, at: time });
      count.set(f, (count.get(f) ?? 0) + 1);
      if (f === player) tk.hitPlayer(8, f.x, f.y); else ctx.hit(npc, 14, f.x, f.y);
    }
    ctx.sfx('chain');
    for (const [f, n] of count) {
      if (n < 3) continue;
      if (f === player) ctx.stun(player, 1100);
      else { ctx.stun(npc, 1300); ctx.float(npc.x, npc.y - 60, 'CAUGHT HOLDING', '#9ff0e8'); }
    }
    // Evidence that has been searched twice is taken away as found.
    for (let i = items.length - 1; i >= 0; i--) if (items[i].searches >= 2) { items[i].target?.remove(); items.splice(i, 1); }
  }

  return {
    update(time, dt) {
      const st = stepDt(dt);
      if (!started) { started = true; nextThrow = time + 900; nextSearch = time + SEARCH; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('PIKE EMPTIES HIS POCKETS', '#f4d890');
        ctx.sfx('boss-phase');
      }
      if (time >= nextThrow) {
        nextThrow = time + THROW_MS;
        flick(time, 0);
        if (late) flick(time, Math.PI);
      }
      if (!warned && time >= nextSearch - SEARCH_WARN) { warned = true; ctx.sfx('drum-hit'); ctx.banner('THE WATCH! — A SEARCH IS CALLED', '#ffe2a8'); }
      if (time >= nextSearch) { search(time); warned = false; nextSearch = time + (late ? SEARCH_LATE : SEARCH); }
      for (const it of items) {
        if (!landed(it, time)) {
          const k = (time - it.thrownAt) / FLIGHT_MS;
          it.x = it.fx + (it.tx - it.fx) * k; it.y = it.fy + (it.ty - it.fy) * k;
          continue;
        }
        if (!it.target) {
          it.x = it.tx; it.y = it.ty;
          it.target = ctx.target({ x: it.x, y: it.y, r: 20, passThrough: true, onStruck: (by) => kick(it, by === 'player' ? player : npc) });
          ctx.sfx('land');
        }
        if (it.vx || it.vy) {
          it.x += it.vx * st; it.y += it.vy * st;
          const drag = Math.pow(0.05, st);
          it.vx *= drag; it.vy *= drag; it.rot += st * 9;
          if (it.x < 50 || it.x > W - 50) it.vx = -it.vx;
          if (it.y < top + 36 || it.y > H - 36) it.vy = -it.vy;
          it.x = clamp(it.x, 50, W - 50); it.y = clamp(it.y, top + 36, H - 36);
          if (Math.hypot(it.vx, it.vy) < 10) { it.vx = 0; it.vy = 0; }
          it.target.moveTo(it.x, it.y);
        }
      }
      for (let i = charges.length - 1; i >= 0; i--) if (time - charges[i].at > 800) charges.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      const t = tk.now;
      const lying = items.filter((it) => landed(it, t));
      if (!lying.length) return null;
      // The search is coming: stand off on the far side of the stranger from the evidence.
      if (nextSearch - t < SEARCH_WARN + 1200) {
        const mx = lying.reduce((a, it) => a + it.x, 0) / lying.length, my = lying.reduce((a, it) => a + it.y, 0) / lying.length;
        const d = Math.max(1, dist(mx, my, player.x, player.y));
        return { x: tk.clampX(player.x + ((player.x - mx) / d) * 230), y: tk.clampY(player.y + ((player.y - my) / d) * 230) };
      }
      // Otherwise: no nearer to any piece than the stranger is.
      const mine = lying.find((it) => nearest(it) === npc);
      if (mine) {
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x);
        return { x: tk.clampX(mine.x + Math.cos(a) * (REACH + 30)), y: tk.clampY(mine.y + Math.sin(a) * (REACH + 30)) };
      }
      return null;
    },

    drawGround(g, time) {
      const warnK = warned ? clamp(1 - (nextSearch - time) / SEARCH_WARN, 0, 1) : 0;
      for (const it of items) {
        if (!landed(it, time)) { shadow(g, it.x, it.y, 22, 7, 0.25); continue; }
        // Who it would charge now: a dotted line to them, brighter as the search comes.
        const f = nearest(it);
        if (f) {
          const col = f === player ? WAX_LIT : MASK_TEAL;
          const d = dist(it.x, it.y, f.x, f.y), n = Math.max(2, Math.floor(d / 14));
          for (let i = 1; i < n; i++) {
            const k = i / n;
            g.fillStyle(col, 0.18 + warnK * 0.6); g.fillCircle(it.x + (f.x - it.x) * k, it.y + (f.y - it.y) * k, 1.6 + warnK);
          }
        }
        if (warnK > 0) { g.lineStyle(1.5, LAMP, warnK * 0.7); g.strokeCircle(it.x, it.y, 18 + Math.sin(time / 70) * 2); }
        drawItem(g, it, time);
      }
      for (const c of charges) {
        // The charge: a chain of links running from the piece to the one it names.
        const k = clamp((time - c.at) / 300, 0, 1), a = 1 - clamp((time - c.at - 300) / 500, 0, 1);
        const ex = c.item.x + (c.f.x - c.item.x) * k, ey = c.item.y + (c.f.y - c.item.y) * k;
        const d = dist(c.item.x, c.item.y, ex, ey), n = Math.floor(d / 9);
        const ang = Math.atan2(ey - c.item.y, ex - c.item.x);
        for (let i = 0; i < n; i++) {
          const x = c.item.x + Math.cos(ang) * i * 9, y = c.item.y + Math.sin(ang) * i * 9;
          g.lineStyle(2, i % 2 ? IRON : IRON_LIT, a); g.strokeEllipse(x, y, i % 2 ? 8 : 4, i % 2 ? 4 : 8);
        }
      }
    },

    drawAir(g, time) {
      for (const it of items) {
        if (landed(it, time)) continue;
        const k = (time - it.thrownAt) / FLIGHT_MS;
        const lift = Math.sin(k * Math.PI) * 70;
        drawItem(g, { ...it, y: it.y - lift, rot: it.rot + k * 8 }, time);
      }
    },

    drawHud(g, time) {
      // The watch's rattle: a wooden football rattle on its handle, spinning as the search comes.
      const x = 46, y = top + 24;
      const total = late ? SEARCH_LATE : SEARCH;
      const k = clamp(1 - (nextSearch - time) / total, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 20);
      g.lineStyle(3, warned ? LAMP : BRASS_DARK, 0.9);
      g.beginPath(); g.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      const spin = warned ? time / 40 : 0;
      g.lineStyle(3, TIMBER, 1); g.lineBetween(x, y + 2, x, y + 14);
      g.fillStyle(TIMBER, 1);
      g.fillPoints([{ x: x + Math.cos(spin) * 12, y: y - 4 + Math.sin(spin) * 4 }, { x: x - Math.cos(spin) * 12, y: y - 4 - Math.sin(spin) * 4 }, { x: x - Math.cos(spin) * 12, y: y - 9 - Math.sin(spin) * 4 }, { x: x + Math.cos(spin) * 12, y: y - 9 + Math.sin(spin) * 4 }], true);
      g.fillStyle(IRON, 1); g.fillCircle(x, y - 6, 3);
      if (warned) glow(g, x, y, 22, LAMP, 0.08, 2);
    },

    destroy() { for (const it of items) it.target?.remove(); },
  };
}

/** One piece of planted evidence, each its own thing at a glance. */
function drawItem(g: G, it: Item, time: number): void {
  const { x, y, rot } = it;
  shadow(g, x, y + 5, 22, 6, 0.28);
  switch (it.kind) {
    case 'letter':
      letter(g, x, y, 1.5, rot, true);
      break;
    case 'signet':
      g.lineStyle(4, BRASS, 1); g.strokeCircle(x, y, 7);
      g.lineStyle(1.5, BRASS_LIT, 1); g.beginPath(); g.arc(x, y, 7, 3.6, 5.2, false); g.strokePath();
      g.fillStyle(BRASS, 1); g.fillCircle(x + Math.cos(rot) * 8, y + Math.sin(rot) * 8, 5);
      g.fillStyle(WAX, 1); g.fillCircle(x + Math.cos(rot) * 8, y + Math.sin(rot) * 8, 2.6);
      break;
    case 'book': {
      const c = Math.cos(rot * 0.3), s = Math.sin(rot * 0.3);
      const P = (dx: number, dy: number) => ({ x: x + dx * c - dy * s, y: y + dx * s + dy * c });
      g.fillStyle(0x3a2030, 1); g.fillPoints([P(-11, -8), P(11, -8), P(11, 8), P(-11, 8)], true);
      g.fillStyle(PAPER, 1); g.fillPoints([P(9, -7), P(11, -7), P(11, 7), P(9, 7)], true);
      g.fillStyle(BRASS, 1); const l = P(11, 0); g.fillRect(l.x - 3, l.y - 3, 6, 6);
      g.lineStyle(1, BRASS_LIT, 1); const a = P(-6, -4), b = P(4, 4); g.lineBetween(a.x, a.y, b.x, b.y);
      const a2 = P(-6, 4), b2 = P(4, -4); g.lineBetween(a2.x, a2.y, b2.x, b2.y);
      break;
    }
    case 'purse':
      g.fillStyle(0x5a3a24, 1); g.fillCircle(x, y + 2, 9);
      g.fillStyle(0x7a5236, 1); g.fillCircle(x - 3, y, 4);
      g.lineStyle(2, INK, 1); g.lineBetween(x - 5, y - 6, x + 5, y - 6);
      g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x + 9, y + 7, 7, 4); g.fillEllipse(x + 12, y + 4, 7, 4);
      break;
    case 'dagger': {
      const c = Math.cos(rot), s = Math.sin(rot);
      g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x - c * 3, y - s * 3, x + c * 14, y + s * 14);
      g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(x, y, x + c * 12, y + s * 12);
      g.lineStyle(3, BRASS, 1); g.lineBetween(x - s * 6, y + c * 6, x + s * 6, y - c * 6);
      g.lineStyle(4, 0x2a1a12, 1); g.lineBetween(x - c * 3, y - s * 3, x - c * 11, y - s * 11);
      g.fillStyle(WAX, 1); g.fillCircle(x - c * 12, y - s * 12, 2.4);
      break;
    }
  }
  // Every piece carries Pike's tell: a faint glint where his thumb rubbed it.
  g.fillStyle(0xfff4c8, 0.4 + Math.sin(time / 200 + it.rot) * 0.3); g.fillCircle(x - 5, y - 4, 1.4);
}

export const FALLEN_PLANTED: GimmickDef = {
  id: ID,
  rules: 'Pike flicks evidence at your feet. At the search each piece charges whoever is nearest; three at once, irons. Strike a piece to kick it.',
  make,
};
