import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { segText, via } from '../art';
import {
  COPPER, COPPER_DARK, COPPER_LIT, DIODE, FAULT, IRON, IRON_DARK, MASK, MASK_DARK, MASK_LIT, NIXIE, SILK, SOLDER,
  SOLDER_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * All Bits Set — Mask-Clerk Odalys Prink, who in the King's telling wrote the Tabulator's masks: the
 * little four-bit patterns it ANDs against every house number on the board to pick who is switched
 * off tonight.
 *
 * The yard is twelve house-plots printed on the board, every plot silkscreened with its number in
 * binary (four pads: lit = 1). The *mask register* — four knife switches standing at the corners
 * where the plots meet, worth 8, 4, 2 and 1 — holds a pattern. On each reckoning every plot whose
 * number has **all the mask's bits set** is switched off: struck and held. Then the mask shifts one
 * place left (the top bit wraps round), so a clerk who reads binary can see the next one coming.
 *
 * Strike a switch to flip its bit — the matching plots change at once, until the register latches
 * half a second before the strike. Prink flips bits to catch your plot; flip one back to catch hers.
 * Halfway down, the house numbers start counting: after every reckoning each plot's number goes up
 * by one. The bot runs to a plot the mask spares while it warns, and between reckonings walks to
 * whichever switch would put the mask on your plot and not on hers.
 */

const ID = fallenId('circuit', 'all-bits-set');
const COLS = 4;
const ROWS = 3;
const PERIOD_MS = 3900;
const WARN_MS = 1700;
const LATCH_MS = 500;
const DMG = 16;
const HOLD_MS = 650;
const SWITCH_R = 24;
const FLIP_GAP_MS = 320;

interface Plot { c: number; r: number; x: number; y: number; w: number; h: number; n: number }
interface Knife { bit: number; x: number; y: number; flipAt: number; by: 'p' | 'n' | null }

const rot4 = (m: number): number => ((m << 1) | (m >> 3)) & 15;
const matches = (n: number, mask: number): boolean => mask !== 0 && (n & mask) === mask;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const x0 = 40, x1 = W - 40, y0 = top + 8, y1 = H - 16;
  const pw = (x1 - x0) / COLS, ph = (y1 - y0) / ROWS;

  // Twelve distinct numbers from 1..15, shuffled onto the plots.
  const pool = Array.from({ length: 15 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const plots: Plot[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    plots.push({ c, r, x: x0 + c * pw, y: y0 + r * ph, w: pw, h: ph, n: pool[plots.length] });
  }

  // The register: four knife switches on the inner corners, bit 3 top-left round to bit 0.
  const corner = (c: number, r: number): Pt => ({ x: x0 + c * pw, y: y0 + r * ph });
  const knives: Knife[] = [
    { bit: 3, ...corner(1, 1), flipAt: -9999, by: null },
    { bit: 2, ...corner(3, 1), flipAt: -9999, by: null },
    { bit: 1, ...corner(3, 2), flipAt: -9999, by: null },
    { bit: 0, ...corner(1, 2), flipAt: -9999, by: null },
  ];

  let mask = 0;
  while (bitCount(mask) !== 2) mask = Math.floor(rng() * 16);
  let next = 0;
  let started = false;
  let counting = false;
  let strikeAt = -9999;
  const struck: { x: number; y: number; w: number; h: number }[] = [];

  function bitCount(m: number): number { let k = 0; for (let i = 0; i < 4; i++) if (m & (1 << i)) k++; return k; }

  const plotAt = (x: number, y: number): Plot => {
    const c = clamp(Math.floor((x - x0) / pw), 0, COLS - 1), r = clamp(Math.floor((y - y0) / ph), 0, ROWS - 1);
    return plots[r * COLS + c];
  };

  const latched = (time: number): boolean => started && next - time < LATCH_MS;

  function flip(k: Knife, by: 'player' | 'npc', time: number): void {
    if (time - k.flipAt < FLIP_GAP_MS) return;
    if (latched(time)) { ctx.float(k.x, k.y - 30, 'LATCHED', '#ff8a6a'); return; }
    mask ^= 1 << k.bit;
    k.flipAt = time; k.by = by === 'player' ? 'p' : 'n';
    ctx.sfx('clang');
  }
  for (const k of knives) ctx.target({ x: k.x, y: k.y, r: SWITCH_R, passThrough: true, onStruck: (by) => flip(k, by, ctx.scene.time.now) });

  function reckon(time: number): void {
    struck.length = 0;
    strikeAt = time;
    for (const p of plots) if (matches(p.n, mask)) struck.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    ctx.sfx(struck.length ? 'thunder' : 'zap');
    for (const f of [player, npc] as Fighter[]) {
      if (!alive(f)) continue;
      const p = plotAt(f.x, f.y);
      if (!matches(p.n, mask)) continue;
      ctx.hit(f, DMG, f.x, f.y);
      ctx.root(f, HOLD_MS);
      ctx.flash(f.x, f.y, NIXIE);
    }
    mask = rot4(mask);
    if (counting) for (const p of plots) p.n = p.n >= 15 ? 1 : p.n + 1;
  }

  /** The centre of the nearest plot `ok` accepts, measured from `from`. */
  function nearestPlot(from: Pt, ok: (p: Plot) => boolean): Pt | null {
    let best: Pt | null = null, bd = Infinity;
    for (const p of plots) {
      if (!ok(p)) continue;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const d = dist(cx, cy, from.x, from.y);
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    return best;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; next = time + 2400; }
      if (!counting && npc.hp < npc.maxHp * 0.5) {
        counting = true;
        ctx.banner('The house numbers start counting up.', '#ffb070');
        ctx.sfx('countdown-tick');
      }
      if (time >= next) { reckon(time); next = time + PERIOD_MS; }
      if (next - time < WARN_MS && Math.floor((next - time) / 400) !== Math.floor((next - time + dtRaw * 1000) / 400)) ctx.sfx('countdown-tick');
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      if (next - time < WARN_MS + 250) return nearestPlot(npc, (p) => !matches(p.n, mask));
      // Between reckonings: walk to the switch that puts the mask on the player and not on me.
      const mine = plotAt(player.x, player.y);
      for (const k of knives) {
        const m2 = mask ^ (1 << k.bit);
        if (matches(mine.n, m2) && !matches(mine.n, mask)) {
          return { x: clamp(k.x + (npc.x < k.x ? -26 : 26), 50, W - 50), y: clamp(k.y + 26, top + 40, H - 40) };
        }
      }
      return nearestPlot(player, (p) => !matches(p.n, rot4(mask)) && dist(p.x + p.w / 2, p.y + p.h / 2, player.x, player.y) > 150);
    },

    drawGround(g, time) {
      const warn = clamp(1 - (next - time) / WARN_MS, 0, 1);
      const live = next - time < WARN_MS;
      for (const p of plots) {
        const hot = live && matches(p.n, mask);
        const odd = (p.c + p.r) % 2 === 0;
        g.fillStyle(odd ? MASK : MASK_DARK, 1); g.fillRect(p.x, p.y, p.w, p.h);
        // Copper plot outline with tinned corners, like a footprint on the board.
        g.lineStyle(6, COPPER_DARK, 1); g.strokeRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
        g.lineStyle(2, COPPER_LIT, 0.45); g.strokeRect(p.x + 7, p.y + 7, p.w - 14, p.h - 14);
        for (const [cx, cy] of [[p.x + 10, p.y + 10], [p.x + p.w - 10, p.y + 10], [p.x + 10, p.y + p.h - 10], [p.x + p.w - 10, p.y + p.h - 10]]) via(g, cx, cy, 4);
        if (hot) {
          // The switch-off creeping in: orange hatching thickening toward the strike.
          g.fillStyle(FAULT, 0.08 + warn * 0.22); g.fillRect(p.x + 9, p.y + 9, p.w - 18, p.h - 18);
          g.lineStyle(3, NIXIE, 0.25 + warn * 0.5);
          for (let s = -p.h; s < p.w; s += 26) {
            const ax = p.x + 9 + Math.max(0, s), ay = p.y + 9 + Math.max(0, -s);
            const len = Math.min(p.w - 18 - Math.max(0, s), p.h - 18 - Math.max(0, -s));
            if (len > 0) g.lineBetween(ax, ay, ax + len * warn, ay + len * warn);
          }
        }
        // The house number: four bit pads (8 4 2 1) and the hex digit beside them.
        const bx = p.x + p.w / 2 - 54, by = p.y + p.h / 2 + 18;
        for (let i = 0; i < 4; i++) {
          const bit = 3 - i, on = (p.n >> bit) & 1;
          const want = (mask >> bit) & 1;
          const px = bx + i * 22;
          g.fillStyle(SOLDER_DARK, 1); g.fillRect(px - 8, by - 8, 17, 17);
          g.fillStyle(on ? SOLDER : MASK_DARK, 1); g.fillRect(px - 7, by - 7, 15, 15);
          if (on) { g.fillStyle(0xffffff, 0.35); g.fillRect(px - 6, by - 6, 13, 3); }
          // A bit the mask is asking for is underlined in the register's colour.
          if (want) { g.fillStyle(on ? NIXIE : FAULT, live ? 0.9 : 0.5); g.fillRect(px - 8, by + 11, 17, 3); }
          segText(g, px - 3, by + 17, String([8, 4, 2, 1][i]), 8, SILK, 0.35);
        }
        segText(g, bx + 92, by - 26, p.n.toString(16), 30, hot ? lit(NIXIE, warn * 0.5) : SILK, hot ? 0.9 : 0.4);
      }
      // The strike: every switched-off plot goes white, then orange, then dark.
      const k = (time - strikeAt) / 600;
      if (k >= 0 && k < 1) for (const s of struck) {
        g.fillStyle(k < 0.25 ? 0xffffff : NIXIE, (1 - k) * 0.6); g.fillRect(s.x + 8, s.y + 8, s.w - 16, s.h - 16);
      }
    },

    drawAir(g, time) {
      for (const kn of knives) drawKnife(g, kn, (mask >> kn.bit) & 1, time, latched(time));
      const k = (time - strikeAt) / 420;
      if (k >= 0 && k < 1) for (const s of struck) {
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + cx * 0.01;
          g.lineStyle(3 * (1 - k), i % 2 ? NIXIE : 0xffffff, 1 - k);
          g.lineBetween(cx, cy - 60, cx + Math.cos(a) * 50 * k, cy + Math.sin(a) * 40 * k);
        }
      }
    },

    drawHud(g, time) {
      // The register as the Tabulator shows it: four nixie bits, a latch lamp and the reckoning bar.
      const x = W / 2 - 120, y = top + 4;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x, y, 240, 34, 8);
      g.lineStyle(1.5, COPPER, 0.6); g.strokeRoundedRect(x, y, 240, 34, 8);
      for (let i = 0; i < 4; i++) {
        const bit = 3 - i, on = (mask >> bit) & 1;
        const cx = x + 22 + i * 30;
        g.fillStyle(0x221a18, 1); g.fillRoundedRect(cx - 10, y + 4, 20, 22, 6);
        if (on) glow(g, cx, y + 15, 14, NIXIE, 0.1, 2);
        segText(g, cx - 4, y + 8, String(on), 14, on ? NIXIE : dim(NIXIE, 0.75), 1);
      }
      // Shift arrow: the pattern wraps left after every reckoning.
      g.lineStyle(2, SILK, 0.5); g.lineBetween(x + 128, y + 12, x + 12, y + 12);
      const lt = latched(time);
      g.fillStyle(lt ? FAULT : dim(FAULT, 0.7), 1); g.fillCircle(x + 140, y + 15, 5);
      const k = clamp(1 - (next - time) / PERIOD_MS, 0, 1);
      g.fillStyle(MASK_DARK, 1); g.fillRect(x + 152, y + 11, 78, 8);
      g.fillStyle(next - time < WARN_MS ? NIXIE : DIODE, 1); g.fillRect(x + 152, y + 11, 78 * k, 8);
      if (counting) segText(g, x + 152, y + 22, 'CNT', 8, NIXIE, 0.9);
    },
  };
}

/** A knife switch on a tinned base: two copper jaws, a hinged blade (up = 1), and its bit lamp. */
function drawKnife(g: G, k: Knife, on: number, time: number, latched: boolean): void {
  const { x, y } = k;
  const flash = clamp(1 - (time - k.flipAt) / 380, 0, 1);
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 10, 52, 14);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 22, y - 8, 44, 20, 4);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 21, y - 9, 42, 17, 4);
  // Hinge post and the jaw it closes into.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 16, y - 18, 6, 14); g.fillRect(x + 11, y - 16, 7, 10);
  g.fillStyle(COPPER_LIT, 1); g.fillRect(x + 12, y - 16, 2, 10);
  const a = on ? -0.12 : -1.25;
  const bx = x - 13 + Math.cos(a) * 34, by = y - 15 + Math.sin(a) * 34;
  g.lineStyle(5, COPPER_DARK, 1); g.lineBetween(x - 13, y - 15, bx, by);
  g.lineStyle(3, COPPER, 1); g.lineBetween(x - 13, y - 15, bx, by);
  g.fillStyle(0x1a1410, 1); g.fillCircle(bx, by, 4);
  g.fillStyle(SOLDER, 1); g.fillCircle(x - 13, y - 15, 2.5);
  // Bit lamp and the weight printed on the base.
  const col = on ? NIXIE : dim(NIXIE, 0.7);
  if (on) glow(g, x, y - 34, 16, NIXIE, 0.08, 3);
  g.fillStyle(0x221a18, 1); g.fillCircle(x, y - 34, 8);
  g.fillStyle(col, 1); g.fillCircle(x, y - 34, 5.5);
  segText(g, x - 3, y - 4, String(1 << k.bit), 9, latched ? FAULT : SILK, 0.8);
  if (flash > 0) {
    g.lineStyle(2, k.by === 'p' ? 0x9af6ff : 0xffb070, flash); g.strokeCircle(x, y - 6, SWITCH_R + (1 - flash) * 14);
  }
  g.lineStyle(1, MASK_LIT, 0.4); g.strokeCircle(x, y - 6, SWITCH_R);
}

export const FALLEN_ALL_BITS_SET: GimmickDef = {
  id: ID,
  rules: 'Plots whose number has every mask bit set are switched off; the mask then shifts left. Strike a knife switch to flip a bit. At half, numbers count.',
  make,
};
