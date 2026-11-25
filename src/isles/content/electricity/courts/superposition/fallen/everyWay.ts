import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { crackle } from '../art';
import {
  BOLT, BOTH, BOTH_LIT, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, DEAL, DEAL_DARK, GLASS,
  GLASS_LIT, GROUT, IRON, IRON_LIT, STATE_A, STATE_B,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Every Way at Once — Exchange-Operator Lettice Quorn.
 *
 * In this court a call does not go down one line; it goes down every line it could, and only
 * settles when somebody picks up. In the King's telling Quorn is the operator of the Exchange who
 * put the court's calls through to the Crown Coil — every whispered complaint, every name — and her
 * board is the yard: a lattice of insulator pins under a switchboard on the north wall.
 *
 * The rule: a jack lights on the board and a charge drops into the lattice. At every pin it splits
 * in two, half to each side, down and down — a spreading diamond of weaker and weaker charges that
 * finally earths in a row of strikes along the bottom. Near the top a charge is whole and hits
 * hard; low down it is everywhere and hits soft. The middle row of pins carries knife-switches:
 * strike one to **pick up** — when the spreading charge reaches it, the whole call collapses into
 * that one bead, whole again, and runs down the diagonal away from whoever struck it. Put the call
 * through to the foe. Past half the board is busy: two calls drop at once.
 *
 * The bot steps out of the diamond while it can, and when a call is coming down above you it throws
 * the middle-row switch on the far side, so the collapsed charge runs down at you.
 */

const ID = fallenId('superposition', 'every-way');
const COL = 60;
const X0 = 60;
const COLS = 15;
const PIN_ROWS = 5;
const ROW_MS = 330;
const WARN_MS = 850;
const SWITCH_ROW = 2;
const SWITCH_MS = 6500;
const BEAD_R = 24;
const LAND_R = 48;

interface Seg { fi: number; ti: number; amp: number; lock: -1 | 0 | 1 }
interface Drop { entry: number; born: number; row: number; segs: Seg[]; hit: Set<Fighter>; collapsed: boolean }
interface Strike { x: number; y: number; amp: number; at: number }
interface Switch { col: number; dir: -1 | 1; until: number; by: 'player' | 'npc'; target: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const rowY = (r: number) => (r < 0 ? top + 10 : top + 50 + r * 88);
  const colX = (i: number) => X0 + i * COL;
  const drops: Drop[] = [];
  const strikes: Strike[] = [];
  const switches: Switch[] = [];
  let nextDrop = 0;
  let started = false;
  let busy = false;
  let aimAtPlayer = true;

  for (let i = 0; i < COLS; i += 2) {
    const sw: Switch = { col: i, dir: 1, until: 0, by: 'player', target: null };
    sw.target = ctx.target({
      x: colX(i), y: rowY(SWITCH_ROW), r: 22, passThrough: true,
      onStruck: (by) => {
        const s = by === 'player' ? player : npc;
        sw.dir = colX(i) - s.x >= 0 ? 1 : -1;
        if (i === 0) sw.dir = 1; else if (i === COLS - 1) sw.dir = -1;
        sw.until = ctx.scene.time.now + SWITCH_MS;
        sw.by = by;
        ctx.sfx('gear-turn');
      },
    });
    switches.push(sw);
  }

  const switchAt = (col: number, time: number) => switches.find((s) => s.col === col && time < s.until) ?? null;

  function hurt(f: Fighter, amp: number, base: number, x: number, y: number, d: Drop): void {
    if (!alive(f) || d.hit.has(f)) return;
    d.hit.add(f);
    const amt = Math.max(1, Math.round(base * amp));
    if (f === player) tk.hitPlayer(amt, x, y); else ctx.hit(npc, Math.round(amt * 1.2) || 1, x, y);
  }

  function drop(time: number, f: Fighter): void {
    let col = Math.round((f.x - X0) / COL);
    col = clamp(col - (col % 2), 0, COLS - 1);
    if (rng() < 0.4) col = clamp(col + (rng() < 0.5 ? -2 : 2), 0, COLS - 1);
    drops.push({ entry: col, born: time, row: 0, segs: [{ fi: col, ti: col, amp: 1, lock: 0 }], hit: new Set(), collapsed: false });
    ctx.sfx('electric-charge');
  }

  const bounce = (c: number, d: -1 | 1): [number, -1 | 1] => {
    const n = c + d;
    if (n < 0 || n > COLS - 1) return [c - d, (-d) as -1 | 1];
    return [n, d];
  };

  /** A drop arrives at pin row `r`: split, ride a switch, or (row 5) earth. */
  function arrive(d: Drop, r: number, time: number): void {
    if (r >= PIN_ROWS) {
      for (const s of d.segs) {
        const x = colX(s.ti), y = rowY(PIN_ROWS);
        strikes.push({ x, y, amp: s.amp, at: time });
        for (const f of [player, npc]) if (dist(f.x, f.y, x, y) < LAND_R) hurt(f, s.amp, 32, x, y, d);
      }
      ctx.sfx(d.collapsed ? 'thunder' : 'zap');
      d.segs = [];
      return;
    }
    if (r === SWITCH_ROW && !d.collapsed) {
      const live = d.segs.filter((s) => switchAt(s.ti, time)).sort((a, b) => b.amp - a.amp)[0];
      if (live) {
        const sw = switchAt(live.ti, time);
        if (sw) {
          const [n, dir] = bounce(live.ti, sw.dir);
          d.segs = [{ fi: live.ti, ti: n, amp: 1, lock: dir }];
          d.collapsed = true;
          strikes.push({ x: colX(live.ti), y: rowY(r), amp: 0.6, at: time });
          ctx.sfx('plasma-arc');
          return;
        }
      }
    }
    const next = new Map<string, Seg>();
    const put = (fi: number, ti: number, amp: number, lock: -1 | 0 | 1) => {
      const k = `${ti}:${lock}`;
      const s = next.get(k);
      if (s) s.amp += amp; else next.set(k, { fi, ti, amp, lock });
    };
    for (const s of d.segs) {
      if (s.lock) { const [n, dir] = bounce(s.ti, s.lock); put(s.ti, n, s.amp, dir); continue; }
      put(s.ti, bounce(s.ti, -1)[0], s.amp / 2, 0);
      put(s.ti, bounce(s.ti, 1)[0], s.amp / 2, 0);
    }
    d.segs = [...next.values()];
  }

  /** Where a segment's bead is now, between its pins. */
  function beadAt(d: Drop, s: Seg, time: number): { x: number; y: number } {
    const t0 = d.born + WARN_MS + d.row * ROW_MS;
    const k = clamp((time - t0) / ROW_MS, 0, 1);
    const fy = rowY(d.row - 1), ty = rowY(d.row);
    return { x: colX(s.fi) + (colX(s.ti) - colX(s.fi)) * k, y: fy + (ty - fy) * k };
  }

  /** Is (x, y) under the spreading diamond of a drop (its light cone)? */
  function inCone(d: Drop, x: number, y: number, pad: number): boolean {
    if (y < rowY(0) - 30 || y > rowY(PIN_ROWS) + LAND_R) return false;
    const half = Math.max(0, (y - rowY(0)) * (COL / 88)) + pad;
    return Math.abs(x - colX(d.entry)) < half;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextDrop = time + 1500; }
      if (!busy && npc.hp < npc.maxHp * 0.5) {
        busy = true;
        ctx.banner('THE BOARD IS BUSY', '#b4f6ff');
        ctx.sfx('sonic-pulse');
      }
      if (time >= nextDrop) {
        nextDrop = time + (busy ? 1500 : 1800);
        if (busy && alive(npc)) { drop(time, player); drop(time, npc); }
        else { drop(time, aimAtPlayer || !alive(npc) ? player : npc); aimAtPlayer = !aimAtPlayer; }
      }
      for (const d of drops) {
        if (time < d.born + WARN_MS) continue;
        // Stage `row` is the bead's leg toward pin row `row` (row 0 is the fall from the board).
        while (d.segs.length && time >= d.born + WARN_MS + (d.row + 1) * ROW_MS) {
          arrive(d, d.row, time);
          d.row++;
        }
        for (const s of d.segs) {
          const b = beadAt(d, s, time);
          for (const f of [player, npc]) if (dist(f.x, f.y, b.x, b.y) < BEAD_R + 20) hurt(f, s.amp, 26, b.x, b.y, d);
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (!drops[i].segs.length) drops.splice(i, 1);
      for (let i = strikes.length - 1; i >= 0; i--) if (time - strikes[i].at > 600) strikes.splice(i, 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const keep = (x: number, y: number) => ({ x: clamp(x, 70, W - 70), y: clamp(y, top + 60, H - 50) });
      // Throw a middle switch on the far side of an incoming call, so it runs down at the player.
      if (player.y > rowY(SWITCH_ROW) + 40) {
        for (const d of drops) {
          if (d.collapsed || d.row > SWITCH_ROW) continue;
          const eta = d.born + WARN_MS + (SWITCH_ROW + 1) * ROW_MS - time;
          if (eta < 450) continue;
          const pinCol = clamp(d.entry + (player.x > colX(d.entry) ? 2 : -2), 0, COLS - 1);
          const sw = switches.find((s) => s.col === pinCol);
          if (!sw || switchAt(pinCol, time)) continue;
          const dir = player.x >= colX(pinCol) ? 1 : -1;
          if (dist(npc.x, npc.y, colX(pinCol), rowY(SWITCH_ROW)) > 320) continue;
          return keep(colX(pinCol) - dir * 70, rowY(SWITCH_ROW) - 30);
        }
      }
      for (const d of drops) {
        if (!inCone(d, npc.x, npc.y, 50)) continue;
        const side = npc.x >= colX(d.entry) ? 1 : -1;
        const half = Math.max(0, (npc.y - rowY(0)) * (COL / 88));
        return keep(colX(d.entry) + side * (half + 130), npc.y);
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return keep(player.x + Math.cos(a) * 230, player.y + Math.sin(a) * 230);
    },

    drawGround(g, time) {
      // The lattice, chalked pin to pin.
      for (let r = 0; r < PIN_ROWS; r++) {
        for (let i = 0; i < COLS; i++) {
          if ((i + r) % 2) continue;
          for (const s of [-1, 1]) {
            const j = i + s;
            if (j < 0 || j >= COLS) continue;
            g.lineStyle(1, 0xd8d0b8, 0.12); g.lineBetween(colX(i), rowY(r), colX(j), rowY(r + 1));
          }
        }
      }
      for (let i = 0; i < COLS; i++) if ((i + PIN_ROWS) % 2 === 0) { g.lineStyle(1.5, GROUT, 0.8); g.strokeCircle(colX(i), rowY(PIN_ROWS), 10); }
      // The diamond each call will spread through.
      for (const d of drops) {
        const warn = clamp((time - d.born) / WARN_MS, 0, 1);
        const ex = colX(d.entry), y0 = rowY(0), y1 = rowY(PIN_ROWS);
        const half = (y1 - y0) * (COL / 88);
        const a = d.collapsed ? 0.05 : 0.07 + warn * 0.07;
        g.fillStyle(BOTH, a);
        g.fillTriangle(ex, y0 - 20, ex - half - 30, y1 + 20, ex + half + 30, y1 + 20);
        g.lineStyle(1, BOTH_LIT, 0.25 + warn * 0.25);
        g.lineBetween(ex, y0 - 20, ex - half - 30, y1 + 20); g.lineBetween(ex, y0 - 20, ex + half + 30, y1 + 20);
      }
      for (const s of strikes) {
        const k = clamp((time - s.at) / 600, 0, 1);
        g.fillStyle(BOLT, 0.35 * (1 - k) * (0.4 + s.amp)); g.fillCircle(s.x, s.y, LAND_R * (0.5 + k * 0.5) * (0.5 + s.amp));
        g.lineStyle(2, BOTH_LIT, 1 - k); g.strokeCircle(s.x, s.y, LAND_R * (0.6 + k * 0.6));
        for (let j = 0; j < 6; j++) {
          const a = j * 1.05 + s.x;
          g.lineStyle(1.5, GROUT, 0.8 * (1 - k)); g.lineBetween(s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 5, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 18);
        }
      }
      switchboard(g, W, top, colX, drops.filter((d) => time < d.born + WARN_MS + ROW_MS).map((d) => d.entry), time);
    },

    drawAir(g, time) {
      for (let r = 0; r < PIN_ROWS; r++) {
        for (let i = 0; i < COLS; i++) {
          if ((i + r) % 2) continue;
          const sw = r === SWITCH_ROW ? switches.find((s) => s.col === i) ?? null : null;
          insulatorPin(g, colX(i), rowY(r), sw && time < sw.until ? sw : null, r === SWITCH_ROW, time);
        }
      }
      for (const d of drops) {
        if (time < d.born + WARN_MS) continue;
        for (const s of d.segs) {
          const b = beadAt(d, s, time);
          const from = { x: colX(s.fi), y: rowY(d.row - 1) - 14 };
          const r = 4 + Math.sqrt(s.amp) * 10;
          crackle(g, from, { x: b.x, y: b.y - 14 }, time / 1000, s.ti * 7 + d.row, d.collapsed ? BRASS_LIT : BOLT, 1 + s.amp * 2, 0.4 + s.amp * 0.6, 5);
          glow(g, b.x, b.y - 14, r * 2.2, d.collapsed ? BRASS : BOTH, 0.05 + s.amp * 0.08, 3);
          g.fillStyle(d.collapsed ? BRASS_LIT : BOTH_LIT, 0.5 + s.amp * 0.5); g.fillCircle(b.x, b.y - 14, r);
          g.fillStyle(0xffffff, 0.6 + s.amp * 0.4); g.fillCircle(b.x - r * 0.25, b.y - 14 - r * 0.25, r * 0.45);
        }
      }
    },

    drawHud(g, time) {
      // The middle row's knife-switches, as the operator's key-shelf shows them.
      const x0 = 18, y0 = H - 36;
      const n = switches.length;
      g.fillStyle(0x0c0b10, 0.72); g.fillRoundedRect(x0 - 8, y0 - 16, n * 18 + 46, 32, 6);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(x0 - 8, y0 - 16, n * 18 + 46, 32, 6);
      switches.forEach((s, i) => {
        const x = x0 + i * 18;
        const on = time < s.until;
        g.fillStyle(IRON, 1); g.fillRect(x - 6, y0 + 4, 12, 4);
        g.lineStyle(2.5, on ? (s.by === 'player' ? STATE_B : STATE_A) : IRON_LIT, 1);
        g.lineBetween(x, y0 + 4, x + (on ? s.dir * 7 : 0), y0 - 8);
        g.fillStyle(on ? BRASS_LIT : BRASS_DARK, 1); g.fillCircle(x + (on ? s.dir * 7 : 0), y0 - 8, 2.5);
      });
      const cx = x0 + n * 18 + 16;
      const k = clamp(1 - (nextDrop - time) / (busy ? 1500 : 1800), 0, 1);
      g.fillStyle(GROUT, 1); g.fillCircle(cx, y0, 11);
      g.fillStyle(BOTH, 0.8); g.slice(cx, y0, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
      g.lineStyle(1.5, BRASS, 1); g.strokeCircle(cx, y0, 11);
    },

    destroy() { for (const s of switches) s.target?.remove(); },
  };
}

/** Quorn's switchboard along the north wall: a deal-wood board of brass jacks, patch cords sagging between them. */
function switchboard(g: G, W: number, top: number, colX: (i: number) => number, lit0: number[], time: number): void {
  g.fillStyle(DEAL_DARK, 1); g.fillRect(20, top - 2, W - 40, 26);
  g.fillStyle(DEAL, 1); g.fillRect(20, top - 2, W - 40, 20);
  for (let x = 40; x < W - 30; x += 48) { g.lineStyle(1, DEAL_DARK, 0.5); g.lineBetween(x, top - 2, x, top + 18); }
  g.fillStyle(COPPER_DARK, 1); g.fillRect(20, top + 18, W - 40, 3);
  for (let i = 0; i < COLS; i += 2) {
    const x = colX(i), y = top + 8;
    const on = lit0.includes(i);
    if (on) glow(g, x, y, 22, BOTH_LIT, 0.08 + 0.04 * Math.sin(time / 60), 3);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 6);
    g.fillStyle(on ? BOTH_LIT : BRASS, 1); g.fillCircle(x, y, 4.5);
    g.fillStyle(0x0c0b10, 1); g.fillCircle(x, y, 2);
    // A drop lamp over each jack.
    g.fillStyle(on ? 0xffffff : dim(GLASS, 0.5), 1); g.fillCircle(x + 12, y - 4, 2.5);
  }
  // Patch cords looping between odd pairs of jacks.
  for (let i = 0; i + 4 < COLS; i += 6) {
    const a = colX(i) + 4, b = colX(i + 4) - 4;
    g.lineStyle(2, i % 4 ? STATE_A : STATE_B, 0.6);
    g.beginPath(); g.moveTo(a, top + 12);
    for (let k = 1; k <= 10; k++) { const f = k / 10; g.lineTo(a + (b - a) * f, top + 12 + Math.sin(f * Math.PI) * 14); }
    g.strokePath();
  }
}

/** An insulator pin: iron foot, stem, glass bell and copper cap; the switch row carries a knife-switch. */
function insulatorPin(g: G, x: number, y: number, sw: Switch | null, switchRow: boolean, time: number): void {
  shadow(g, x, y + 2, 20, 6, 0.3);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y, 16, 6);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 1.5, y - 14, 3, 14);
  g.fillStyle(dim(GLASS, 0.25), 1); g.fillEllipse(x, y - 14, 14, 6);
  g.fillStyle(GLASS, 0.85); g.fillEllipse(x, y - 17, 11, 7);
  g.fillStyle(GLASS_LIT, 0.8); g.fillEllipse(x - 2, y - 18, 4, 3);
  g.fillStyle(COPPER, 1); g.fillCircle(x, y - 21, 2.5);
  if (!switchRow) return;
  // Knife-switch: a brass blade on a hinge, thrown to one side when picked up.
  const col = sw ? (sw.by === 'player' ? STATE_B : STATE_A) : COPPER_DARK;
  const a = sw ? -Math.PI / 2 + sw.dir * 0.9 : -Math.PI / 2;
  g.fillStyle(IRON, 1); g.fillRect(x + 8, y - 6, 8, 5);
  g.lineStyle(3, sw ? BRASS_LIT : BRASS, 1); g.lineBetween(x + 12, y - 4, x + 12 + Math.cos(a) * 16, y - 4 + Math.sin(a) * 16);
  g.fillStyle(col, 1); g.fillCircle(x + 12 + Math.cos(a) * 16, y - 4 + Math.sin(a) * 16, 3);
  if (sw) {
    g.lineStyle(1.5, lit(col, 0.3), 0.5 + 0.3 * Math.sin(time / 120));
    g.lineBetween(x, y + 10, x + sw.dir * 26, y + 30);
    g.lineBetween(x + sw.dir * 26, y + 30, x + sw.dir * 18, y + 30); g.lineBetween(x + sw.dir * 26, y + 30, x + sw.dir * 24, y + 22);
  }
}

export const FALLEN_EVERY_WAY: GimmickDef = {
  id: ID,
  rules: 'A call drops into the pins and splits at each: whole and hard at the top, everywhere and soft below. Strike a middle switch: it runs one way.',
  make,
};
