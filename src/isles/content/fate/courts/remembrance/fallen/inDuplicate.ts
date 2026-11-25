import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GILT, GILT_DARK, PAPER, PAVE_RED, SEPIA_DEEP, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, ease } from '../util';

/**
 * In Duplicate — Copy-Clerk Euphrasia Mott, in the King's telling the Ledger Office clerk who
 * wrote every pledge on a sheet with a carbon under it, kept the top copy for the customer, and
 * sent the carbon up to the Archive — so the Prince knew everything anyone ever gave up.
 *
 * Great sheets of carbon paper lie on the yard. Stand on one and you are UNDER CARBON: a copy
 * of every blow struck in the room comes through onto you — blows on your foe, blows on you,
 * your own blows on him — fainter, but every one. Mott lays her sheets where you stand: a
 * dotted outline, then the sheet sails in and her stamp comes down on it, and the stamp itself
 * is copied onto every sheet. Step out of the outline; step off the carbon.
 *
 * The exploit: carbon does not care whose blows they are. Get Mott on a sheet and every blow you
 * land on her lands twice. Strike a sheet and it slides away from you across the floor — slide
 * one under her. Off it yourself, or you copy your own blows onto you. Past half: IN TRIPLICATE,
 * a third sheet, darker copies, and she lays them faster. The bot steps off carbon and strikes
 * sheets toward you from behind them.
 */

const ID = fallenId('remembrance', 'in-duplicate');
const SW = 190;
const SH = 128;
const LAY_MS = 1400;
const GLIDE_MS = 480;
const FLUSH_MS = 320;
const KICK = 210;

interface Sheet {
  x: number; y: number; fx: number; fy: number; tx: number; ty: number;
  moveAt: number; moveMs: number; laying: boolean; tilt: number; marks: Pt[]; struckAt: number; target: StrikeTarget;
}
interface Copy { ax: number; ay: number; to: Fighter; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const sheets: Sheet[] = [];
  let now = 0;
  const cl = (x: number, y: number): Pt => ({
    x: clamp(x, SW / 2 + 24, W - SW / 2 - 24), y: clamp(y, top + SH / 2 + 14, H - SH / 2 - 14),
  });
  const addSheet = (x: number, y: number): void => {
    const s: Sheet = {
      x, y, fx: x, fy: y, tx: x, ty: y, moveAt: -9999, moveMs: 1, laying: false, tilt: (rng() - 0.5) * 0.08, marks: [], struckAt: -9999,
      target: ctx.target({
        x, y, r: 34, passThrough: true,
        onStruck: (by) => {
          if (now - s.struckAt < 800 || moving(s)) return;
          s.struckAt = now;
          const f = by === 'player' ? player : npc;
          const d = dist(f.x, f.y, s.x, s.y) || 1;
          slide(s, s.x + ((s.x - f.x) / d) * KICK, s.y + ((s.y - f.y) / d) * KICK, GLIDE_MS, false);
          ctx.sfx('whoosh');
        },
      }),
    };
    sheets.push(s);
  };
  const moving = (s: Sheet): boolean => now < s.moveAt + s.moveMs;
  const slide = (s: Sheet, x: number, y: number, ms: number, laying: boolean): void => {
    const p = cl(x, y);
    s.fx = s.x; s.fy = s.y; s.tx = p.x; s.ty = p.y; s.moveAt = now; s.moveMs = ms; s.laying = laying;
  };
  const onSheet = (f: Fighter, s: Sheet): boolean => alive(f) && !moving(s) && Math.abs(f.x - s.x) < SW / 2 && Math.abs(f.y - s.y) < SH / 2;
  const underCarbon = (f: Fighter): boolean => sheets.some((s) => onSheet(f, s));

  addSheet(W * 0.3, top + 150);
  addSheet(W * 0.7, H - 140);
  const pending = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const copies: Copy[] = [];
  let applying = false;
  let late = false;
  let nextLay = 0;
  let flushAt = 0;
  let started = false;

  /** A blow landed somewhere: everyone under carbon takes a fainter copy. */
  const copyBlow = (victim: Fighter, amount: number): void => {
    if (applying || amount <= 0) return;
    const k = late ? 0.85 : 0.65;
    for (const f of [player, npc]) {
      if (!underCarbon(f)) continue;
      pending.set(f, (pending.get(f) ?? 0) + amount * k);
      copies.push({ ax: victim.x, ay: victim.y, to: f, at: now });
      const s = sheets.find((sh) => onSheet(f, sh));
      if (s && s.marks.length < 14) s.marks.push({ x: (rng() - 0.5) * (SW - 40), y: (rng() - 0.5) * (SH - 36) });
    }
  };

  return {
    update(time) {
      now = time;
      if (!started) { started = true; nextLay = time + 3000; flushAt = time + FLUSH_MS; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        addSheet(W * 0.5, (top + H) / 2);
        ctx.banner('IN TRIPLICATE', '#f2d68a');
        ctx.sfx('judgement');
      }
      for (const s of sheets) {
        const k = clamp((time - s.moveAt) / s.moveMs, 0, 1);
        if (k < 1) { const e = ease(k); s.x = s.fx + (s.tx - s.fx) * e; s.y = s.fy + (s.ty - s.fy) * e; }
        else if (s.x !== s.tx || s.y !== s.ty || s.laying) {
          s.x = s.tx; s.y = s.ty;
          if (s.laying) {
            s.laying = false;
            ctx.sfx('stone-slam');
            for (const f of [player, npc]) {
              if (!alive(f) || Math.abs(f.x - s.x) > SW / 2 || Math.abs(f.y - s.y) > SH / 2) continue;
              if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(npc, 24, f.x, f.y);
            }
          }
        }
        s.target.moveTo(s.x, s.y);
      }
      if (time >= nextLay && alive(player)) {
        // The sheet farthest from you is lifted and laid where you stand.
        const idle = sheets.filter((s) => !moving(s));
        if (idle.length) {
          idle.sort((a, b) => dist(b.x, b.y, player.x, player.y) - dist(a.x, a.y, player.x, player.y));
          slide(idle[0], player.x, player.y, LAY_MS, true);
          ctx.sfx('whoosh');
        }
        nextLay = time + (late ? 4800 : 6400);
      }
      if (time >= flushAt) {
        flushAt = time + FLUSH_MS;
        for (const f of [player, npc]) {
          const p = pending.get(f) ?? 0;
          if (p < 1 || !alive(f)) continue;
          const n = Math.floor(p);
          pending.set(f, p - n);
          applying = true;
          ctx.hit(f, n, f.x, f.y);
          applying = false;
          ctx.sfx('hit-light');
        }
      }
      while (copies.length && time - copies[0].at > 360) copies.shift();
    },

    onPlayerHurt(amount) { copyBlow(player, amount); },
    onNpcHurt(amount) { copyBlow(npc, amount); },

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = sheets.find((s) => onSheet(npc, s) || (s.laying && Math.abs(npc.x - s.tx) < SW / 2 + 20 && Math.abs(npc.y - s.ty) < SH / 2 + 20));
      if (mine) {
        const cx = mine.laying ? mine.tx : mine.x, cy = mine.laying ? mine.ty : mine.y;
        const ox = npc.x - cx, oy = npc.y - cy;
        // Out by the nearer long edge.
        if (Math.abs(ox) / SW > Math.abs(oy) / SH) return { x: tk.clampX(cx + Math.sign(ox || 1) * (SW / 2 + 60)), y: npc.y };
        return { x: npc.x, y: tk.clampY(cy + Math.sign(oy || 1) * (SH / 2 + 60)) };
      }
      if (!alive(player) || underCarbon(player)) return null;
      let best: Pt | null = null, bestD = 360;
      for (const s of sheets) {
        if (moving(s) || dist(s.x, s.y, player.x, player.y) > 300) continue;
        const d = dist(s.x, s.y, player.x, player.y) || 1;
        const spot = { x: tk.clampX(s.x + ((s.x - player.x) / d) * 60), y: tk.clampY(s.y + ((s.y - player.y) / d) * 60) };
        const dd = dist(npc.x, npc.y, spot.x, spot.y);
        if (dd < bestD) { bestD = dd; best = spot; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const s of sheets) {
        if (s.laying) {
          // The dotted outline where the sheet will come down, and the stamp's ring.
          const k = clamp((time - s.moveAt) / s.moveMs, 0, 1);
          dashedRect(g, s.tx, s.ty, SW, SH, PAVE_RED, 0.5 + k * 0.5, time);
          g.fillStyle(PAVE_RED, 0.05 + k * 0.12); g.fillRect(s.tx - SW / 2, s.ty - SH / 2, SW, SH);
        }
        if (!moving(s)) drawCarbon(g, s, time, [player, npc].some((f) => onSheet(f, s)));
      }
      for (const c of copies) {
        const k = clamp((time - c.at) / 360, 0, 1);
        const dx = c.to.x - c.ax, dy = c.to.y - c.ay, d = Math.hypot(dx, dy);
        for (let t = 0; t < d; t += 14) {
          g.fillStyle(0x3a4a6a, 0.6 * (1 - k)); g.fillCircle(c.ax + (dx * t) / d, c.ay + (dy * t) / d, 2);
        }
        // The copied blow arriving: a smudged carbon star.
        g.lineStyle(2, 0x2a3450, 0.8 * (1 - k));
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + 0.3; g.lineBetween(c.to.x - Math.cos(a) * 16, c.to.y - Math.sin(a) * 16, c.to.x + Math.cos(a) * 16, c.to.y + Math.sin(a) * 16); }
      }
    },

    drawAir(g, time) {
      for (const s of sheets) {
        if (!moving(s)) continue;
        const k = clamp((time - s.moveAt) / s.moveMs, 0, 1);
        const lift = Math.sin(k * Math.PI) * (s.laying ? 60 : 22);
        shadow(g, s.x, s.y + SH / 2, SW * 0.9, 24, 0.25);
        drawCarbon(g, { ...s, y: s.y - lift }, time, false, Math.sin(time / 60) * 0.05);
        if (s.laying && k > 0.7) drawStamp(g, s.tx, s.ty, (k - 0.7) / 0.3);
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 96, y - 13, 192, 28, 6);
      // A top copy and its carbon(s), and the clerk's clock to the next laying.
      g.fillStyle(PAPER, 1); g.fillRect(x - 86, y - 8, 18, 16);
      for (let i = 0; i < (late ? 2 : 1); i++) { g.fillStyle(0x1e2638, 1); g.fillRect(x - 80 + i * 6, y - 5 + i * 3, 18, 16); }
      const k = clamp(1 - (nextLay - time) / (late ? 4800 : 6400), 0, 1);
      g.fillStyle(0x2a241e, 1); g.fillRect(x - 50, y - 4, 70, 8);
      g.fillStyle(PAVE_RED, 1); g.fillRect(x - 50, y - 4, 70 * k, 8);
      g.lineStyle(1, GILT, 1); g.strokeRect(x - 50, y - 4, 70, 8);
      // Who is under carbon right now.
      for (const [f, ox] of [[player, 44], [npc, 72]] as [Fighter, number][]) {
        const on = underCarbon(f);
        g.fillStyle(on ? 0x1e2638 : 0x4a423a, 1); g.fillRect(x + ox - 9, y - 8, 18, 16);
        g.lineStyle(1, on ? 0x8ab0ff : GILT_DARK, 1); g.strokeRect(x + ox - 9, y - 8, 18, 16);
        g.fillStyle(f === player ? 0x8ac8f6 : 0xf08aa8, on ? 1 : 0.4); g.fillCircle(x + ox, y, 3.5);
      }
    },

    destroy() { for (const s of sheets) s.target.remove(); },
  };
}

/** A sheet of carbon paper: blue-black, a sheen, one corner curled, the ghost of every copy it has taken. */
function drawCarbon(g: G, s: { x: number; y: number; tilt: number; marks: Pt[] }, time: number, live: boolean, wobble = 0): void {
  const a = s.tilt + wobble;
  const c = Math.cos(a), sn = Math.sin(a);
  const P = (px: number, py: number): Pt => ({ x: s.x + px * c - py * sn, y: s.y + px * sn + py * c });
  const hw = SW / 2, hh = SH / 2;
  g.fillStyle(0x000000, 0.25); g.fillPoints([P(-hw + 4, -hh + 6), P(hw + 4, -hh + 6), P(hw + 4, hh + 6), P(-hw + 4, hh + 6)], true);
  g.fillStyle(0x1a2030, 1); g.fillPoints([P(-hw, -hh), P(hw, -hh), P(hw, hh - 22), P(hw - 22, hh), P(-hw, hh)], true);
  // Sheen: two long soft streaks.
  for (const [o, w] of [[-0.3, 10], [0.15, 5]]) {
    g.fillStyle(0x6a7aa0, 0.18 + (live ? 0.1 : 0)); g.fillPoints([P(-hw + 10, -hh + SH * (0.5 + o)), P(-hw + 10, -hh + SH * (0.5 + o) + w), P(hw - 30, -hh + SH * (0.2 + o) + w), P(hw - 30, -hh + SH * (0.2 + o))], true);
  }
  // Every copy taken, as a pale reversed impression.
  for (const m of s.marks) {
    const p = P(m.x, m.y);
    g.lineStyle(1.5, 0x5a6a90, 0.55);
    g.lineBetween(p.x - 9, p.y - 3, p.x + 9, p.y + 3); g.lineBetween(p.x - 4, p.y + 6, p.x + 7, p.y - 6);
  }
  // Faint ruled impressions from the ledgers it has lain under.
  for (let l = 0; l < 5; l++) { const p0 = P(-hw + 12, -hh + 18 + l * 20), p1 = P(hw - 26, -hh + 18 + l * 20); g.lineStyle(1, 0x3a4a6a, 0.4); g.lineBetween(p0.x, p0.y, p1.x, p1.y); }
  // The curled corner, showing the dull back.
  g.fillStyle(0x4a5470, 1); g.fillTriangle(P(hw, hh - 22).x, P(hw, hh - 22).y, P(hw - 22, hh).x, P(hw - 22, hh).y, P(hw - 20, hh - 20).x, P(hw - 20, hh - 20).y);
  g.lineStyle(1.5, live ? 0x8ab0ff : 0x3a4460, live ? 0.8 + Math.sin(time / 90) * 0.2 : 1);
  g.strokePoints([P(-hw, -hh), P(hw, -hh), P(hw, hh - 22), P(hw - 22, hh), P(-hw, hh)], true);
  if (live) glow(g, s.x, s.y, 90, 0x6a8ad0, 0.03, 3);
}

/** Mott's pledge stamp coming down: a turned wooden handle, a brass ferrule, a red rubber face. */
function drawStamp(g: G, x: number, y: number, k: number): void {
  const drop = (1 - k) * 70;
  const by = y - drop;
  g.fillStyle(0x000000, 0.2 + k * 0.2); g.fillEllipse(x, y + 4, 60 * (0.5 + k * 0.5), 22 * (0.5 + k * 0.5));
  g.fillStyle(PAVE_RED, 1); g.fillRect(x - 28, by - 8, 56, 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, by - 20, 60, 12);
  g.fillStyle(GILT, 1); g.fillRect(x - 8, by - 30, 16, 10);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, by - 44, 22, 30);
  g.fillStyle(SEPIA_DEEP, 0.5); g.fillEllipse(x + 4, by - 42, 8, 20);
  if (k > 0.85) {
    // Its mark: two overlapping sheets in a red ring.
    g.lineStyle(2, PAVE_RED, 0.8); g.strokeCircle(x, y, 30);
    g.strokeRect(x - 12, y - 10, 16, 18); g.strokeRect(x - 4, y - 6, 16, 18);
  }
}

/** A dotted rectangle outline, its dashes creeping round. */
function dashedRect(g: G, x: number, y: number, w: number, h: number, color: number, a: number, time: number): void {
  const per = 2 * (w + h);
  const off = (time / 20) % 16;
  g.fillStyle(color, a);
  for (let d = off; d < per; d += 16) {
    let px: number, py: number;
    if (d < w) { px = x - w / 2 + d; py = y - h / 2; }
    else if (d < w + h) { px = x + w / 2; py = y - h / 2 + (d - w); }
    else if (d < 2 * w + h) { px = x + w / 2 - (d - w - h); py = y + h / 2; }
    else { px = x - w / 2; py = y + h / 2 - (d - 2 * w - h); }
    g.fillRect(px - 3, py - 3, 6, 6);
  }
}

export const FALLEN_IN_DUPLICATE: GimmickDef = {
  id: ID,
  rules: 'On a carbon sheet you take a copy of every blow struck in the room, even your own. She lays them under you. Strike a sheet to slide it under her.',
  make,
};
