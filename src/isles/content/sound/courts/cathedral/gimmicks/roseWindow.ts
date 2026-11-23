import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { tuningFork } from '../art';
import { ASHLAR, ASHLAR_DARK, GILT, GILT_DARK, GLASS_BLUE, GLASS_GOLD, GLASS_RED, LEAD } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Rose Window — Glazier Tracery.
 *
 * The cathedral's great rose throws its glass on the nave floor, and Tracery — who leaded every
 * pane of it — has laid the fight out on the light. Twelve petals in two courses, red, blue and
 * gold, turning slowly with the sun:
 *
 * • standing in **red**, your blows land harder;
 * • standing in **blue**, you heal;
 * • standing in **gold**, you take less;
 * • the dark **leading** between the panes burns.
 *
 * Every so often Tracery taps the window with her glazing knife and the whole rose turns a full
 * petal at once — every spoke of leading sweeps across its pane, burning whoever it crosses. Only
 * the clear hub and the stone beyond the rim are safe. Tracery trusts her own glass and stays on
 * her pane through the turn; a player who reads the knife-tap steps off and lets the lead find her.
 */

const N = 12;
const SECTOR = (Math.PI * 2) / N;
const HUB = 52;
const R_IN = 150;
const R_OUT = 300;
const LEAD_HALF = 8;
const COLORS = [GLASS_RED, GLASS_BLUE, GLASS_GOLD];
const NAMES = ['RED', 'BLUE', 'GOLD'];

type Pane = 0 | 1 | 2 | 'lead' | null;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 4 };
  let rot = 0;
  const DRIFT = 0.09;
  const turnEvery = ctx.hard ? 8200 : 10200;
  const TURN_WARN = 1300;
  const TURN_MS = 800;
  let nextTurn = 0;
  let warnAt = -1;
  let turnFrom = 0;
  let turnAt = -1;
  let started = false;
  /** Per-fighter clocks: lead burn and blue heal ticks, and the last pane they stood on. */
  const state = new Map<Fighter, { burnAt: number; healAcc: number; pane: Pane; shownAt: number }>([
    [player, { burnAt: 0, healAcc: 0, pane: null, shownAt: 0 }],
    [npc, { burnAt: 0, healAcc: 0, pane: null, shownAt: 0 }],
  ]);

  const paneAt = (x: number, y: number): Pane => {
    const r = dist(C.x, C.y, x, y);
    if (r < HUB || r > R_OUT + LEAD_HALF) return null;
    const a = wrapAngle(Math.atan2(y - C.y, x - C.x) - rot);
    const u = ((a + Math.PI * 2) % (Math.PI * 2)) / SECTOR;
    const idx = Math.floor(u) % N;
    const frac = u - Math.floor(u);
    if (Math.min(frac, 1 - frac) * SECTOR * r < LEAD_HALF) return 'lead';
    if (Math.abs(r - R_IN) < LEAD_HALF * 0.8 || Math.abs(r - R_OUT) < LEAD_HALF) return 'lead';
    return (r < R_IN ? idx % 3 : (idx + 1) % 3) as 0 | 1 | 2;
  };

  /** The middle of a pane of `color` nearest a point (for the bot). */
  const nearestPane = (color: 0 | 1 | 2, from: Pt, rr = rot): Pt => {
    let best: Pt = C, bd = Infinity;
    for (let i = 0; i < N; i++) {
      for (const inner of [true, false]) {
        const c = inner ? i % 3 : (i + 1) % 3;
        if (c !== color) continue;
        const r = inner ? (HUB + R_IN) / 2 : (R_IN + R_OUT) / 2;
        const a = rr + (i + 0.5) * SECTOR;
        const p = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
        if (p.y < top + 30 || p.y > H - 30) continue;
        const d = dist(p.x, p.y, from.x, from.y);
        if (d < bd) { bd = d; best = p; }
      }
    }
    return best;
  };

  const turning = (time: number) => turnAt >= 0 && time < turnAt + TURN_MS;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextTurn = time + turnEvery;
        ctx.banner('RED STRIKES · BLUE HEALS · GOLD SHIELDS · LEAD BURNS', '#ffe2a8');
      }
      // The slow drift with the sun, and Tracery's knife-tap turns.
      if (turnAt >= 0 && time < turnAt + TURN_MS) {
        const k = (time - turnAt) / TURN_MS;
        rot = turnFrom + SECTOR * (k * k * (3 - 2 * k));
      } else {
        if (turnAt >= 0) { rot = turnFrom + SECTOR; turnAt = -1; }
        rot += DRIFT * dt;
      }
      if (warnAt < 0 && time >= nextTurn - TURN_WARN) {
        warnAt = time;
        ctx.banner('TRACERY TAPS THE GLASS — TO THE HUB OR OFF THE ROSE', '#cfe0ff');
        ctx.sfx('crystal-chime');
      }
      if (time >= nextTurn) {
        nextTurn = time + turnEvery;
        warnAt = -1;
        turnFrom = rot;
        turnAt = time;
        ctx.sfx('prism');
      }

      for (const [f, s] of state) {
        if (!alive(f)) continue;
        const p = paneAt(f.x, f.y);
        if (p !== s.pane && p !== null && p !== 'lead' && time - s.shownAt > 1600 && f === player) {
          s.shownAt = time;
          ctx.float(f.x, f.y - 50, NAMES[p], ['#ff7080', '#80a8ff', '#ffd870'][p]);
        }
        s.pane = p;
        if (p === 'lead') {
          if (time >= s.burnAt) {
            s.burnAt = time + 600;
            ctx.hit(f, turning(time) ? 9 : 5, f.x, f.y);
            ctx.flash(f.x, f.y, 0xff9040);
            ctx.sfx('sizzle');
          }
        } else if (p === 1) {
          s.healAcc += (f === player && ctx.hard ? 1.8 : 2.4) * dt;
          if (s.healAcc >= 2) { ctx.heal(f, Math.floor(s.healAcc)); s.healAcc -= Math.floor(s.healAcc); }
        }
      }
    },

    // Red in hand: whoever stands in red deals more; gold: whoever stands in gold takes less.
    npcTakenMult() {
      const ps = state.get(player)?.pane, ns = state.get(npc)?.pane;
      return (ps === 0 ? 1.35 : 1) * (ns === 2 ? 0.65 : 1);
    },
    playerTakenMult() {
      const ps = state.get(player)?.pane, ns = state.get(npc)?.pane;
      return (ns === 0 ? 1.35 : 1) * (ps === 2 ? 0.65 : 1);
    },

    npcSeek() {
      // She stays on her old pane through the turn and is caught on the leading — the opening.
      const t = ctx.scene.time.now;
      const rr = turning(t) ? turnFrom : rot;
      if (npc.hp < npc.maxHp * 0.5) return nearestPane(1, npc, rr);
      const want = nearestPane(t % 9000 < 5000 ? 0 : 2, player, rr);
      const a = Math.atan2(want.y - player.y, want.x - player.x);
      const d = dist(want.x, want.y, player.x, player.y);
      // Not on top of you: a red pane a little way off, at casting range.
      if (d < 140) return { x: clamp(player.x + Math.cos(a) * 160, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 40, H - 40) };
      return want;
    },

    drawGround(g, time) {
      const warn = warnAt >= 0 ? clamp((time - warnAt) / TURN_WARN, 0, 1) : 0;
      // The stone ring the rose is set in.
      g.fillStyle(ASHLAR_DARK, 0.5); g.fillCircle(C.x, C.y, R_OUT + 22);
      g.fillStyle(ASHLAR, 0.35); g.fillCircle(C.x, C.y, R_OUT + 14);
      g.fillStyle(LEAD, 0.9); g.fillCircle(C.x, C.y, R_OUT + LEAD_HALF);
      // The panes, two courses.
      for (let i = 0; i < N; i++) {
        const a0 = rot + i * SECTOR, a1 = a0 + SECTOR;
        const pad = LEAD_HALF / R_OUT;
        const cOut = COLORS[(i + 1) % 3], cIn = COLORS[i % 3];
        const pulse = 0.36 + Math.sin(time / 700 + i) * 0.04;
        g.fillStyle(cOut, pulse); g.slice(C.x, C.y, R_OUT - LEAD_HALF, a0 + pad, a1 - pad, false); g.fillPath();
        g.fillStyle(LEAD, 1); g.fillCircle(C.x, C.y, R_IN + LEAD_HALF * 0.8);
      }
      for (let i = 0; i < N; i++) {
        const a0 = rot + i * SECTOR, a1 = a0 + SECTOR;
        const pad = LEAD_HALF / R_IN;
        g.fillStyle(COLORS[i % 3], 0.4); g.slice(C.x, C.y, R_IN - LEAD_HALF * 0.8, a0 + pad, a1 - pad, false); g.fillPath();
      }
      // Clear glass at the hub.
      g.fillStyle(LEAD, 1); g.fillCircle(C.x, C.y, HUB + 3);
      g.fillStyle(0xe8f0ff, 0.25); g.fillCircle(C.x, C.y, HUB);
      // Light streaks and little painted details: a highlight in every pane.
      for (let i = 0; i < N; i++) {
        const am = rot + (i + 0.5) * SECTOR;
        for (const [r, c] of [[(R_IN + R_OUT) / 2, COLORS[(i + 1) % 3]], [(HUB + R_IN) / 2, COLORS[i % 3]]] as [number, number][]) {
          const px = C.x + Math.cos(am) * r, py = C.y + Math.sin(am) * r;
          g.fillStyle(lit(c, 0.5), 0.25); g.fillCircle(px - 6, py - 5, r * 0.08);
          g.lineStyle(1.2, dim(c, 0.4), 0.4); g.strokeCircle(px, py, r * 0.16);
        }
      }
      // The leading glows hot before a turn, and blazes while it sweeps.
      const hot = turning(time) ? 1 : warn;
      const leadCol = hot > 0 ? lit(0xff8030, 0.2 + hot * 0.3) : 0x3a3c48;
      for (let i = 0; i < N; i++) {
        const a = rot + i * SECTOR;
        g.lineStyle(LEAD_HALF * 1.2, LEAD, 1);
        g.lineBetween(C.x + Math.cos(a) * HUB, C.y + Math.sin(a) * HUB, C.x + Math.cos(a) * R_OUT, C.y + Math.sin(a) * R_OUT);
        g.lineStyle(2 + hot * 2, leadCol, 0.6 + hot * 0.4);
        g.lineBetween(C.x + Math.cos(a) * HUB, C.y + Math.sin(a) * HUB, C.x + Math.cos(a) * R_OUT, C.y + Math.sin(a) * R_OUT);
      }
      g.lineStyle(2 + hot * 2, leadCol, 0.6 + hot * 0.4); g.strokeCircle(C.x, C.y, R_IN); g.strokeCircle(C.x, C.y, R_OUT);
      // Safe ground through a turn: the clear hub and the stone beyond the rim, ringed in white.
      if (warn > 0 || turning(time)) {
        const k = turning(time) ? 1 : warn;
        g.lineStyle(3, 0xffffff, 0.2 + k * 0.4 + Math.sin(time / 90) * 0.1); g.strokeCircle(C.x, C.y, HUB - 4);
        g.lineStyle(3, 0xffffff, 0.15 + k * 0.3); g.strokeCircle(C.x, C.y, R_OUT + 18);
      }
      // The gilt boss and the Maestro's fork at the heart.
      g.fillStyle(GILT_DARK, 0.9); g.fillCircle(C.x, C.y, 22);
      g.fillStyle(GILT, 0.9); g.fillCircle(C.x, C.y, 18);
      tuningFork(g, C.x, C.y + 10, 24, LEAD, 0.9);
    },

    drawAir(g, time) {
      // Each fighter wears their pane: a little diamond of its colour, or a flicker of flame on lead.
      for (const [f, s] of state) {
        if (!alive(f)) continue;
        const x = f.x, y = f.y - 44;
        if (s.pane === 'lead') {
          for (let i = 0; i < 3; i++) {
            const ph = (time / 300 + i / 3) % 1;
            g.fillStyle(0xff8030, 0.8 * (1 - ph)); g.fillEllipse(x - 8 + i * 8, f.y + 6 - ph * 24, 6, 10);
          }
        } else if (s.pane !== null) {
          const c = COLORS[s.pane];
          g.fillStyle(dim(c, 0.3), 1); g.fillTriangle(x, y - 8, x - 6, y, x, y + 8); g.fillTriangle(x, y - 8, x + 6, y, x, y + 8);
          g.fillStyle(c, 1); g.fillTriangle(x, y - 6, x - 4, y, x, y + 6);
          glow(g, f.x, f.y, 30, c, 0.05, 2);
          if (s.pane === 2) { g.lineStyle(2, GLASS_GOLD, 0.5 + Math.sin(time / 150) * 0.2); g.strokeCircle(f.x, f.y, 26); }
        }
      }
      // A thin shaft of the window's light slanting in from the top, over everything.
      g.fillStyle(0xfff4d8, 0.04); g.fillTriangle(C.x - 60, top, C.x + 60, top, C.x + 140, H);
    },
  };
}

export const ROSE_WINDOW: GimmickDef = {
  id: 'cathedral-rose-window',
  rules: 'The rose window\'s light lies on the floor: red panes hit harder, blue heal, gold shield, the leading burns. Tracery turns it a petal at a time.',
  make,
};
