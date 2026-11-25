import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { rune } from '../art';
import { CHALK, GOLD, GOLD_DARK, GOLD_LIT, MANA, MANA_LIT, SCORCH, SLATE_DEEP, VIOLET, VIOLET_DARK, VIOLET_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { dashedRing, feather, pastHalf, progressArc, sideColor, slatePlate, type Side } from './common';

/**
 * The Lifting Charm — Tutor Theophane Lightfoot, the Academy's master of levitation.
 *
 * At the tutor's bell a lifting sigil blooms under *both* fighters' feet and fills. Whoever still
 * stands in a sigil when it fills is lifted: borne up out of reach (nothing touches you; you may
 * still cast) for two seconds, then let go. Where you come down decides everything:
 * - on one of the three velvet **feather-cushions** you land soft and lofted — your blows land
 *   harder for a while;
 * - on bare slate you land hard: hurt and stunned;
 * and either way the landing knocks a ring of slate up round you that hurts the other fighter.
 *
 * So: be on a cushion when the bell goes, or step off your sigil. Strike a cushion and it slides
 * away from you — out from under the tutor while he waits to rise, or while he is up there and
 * cannot follow it. Past half health the bell comes quicker and the cushions wander on their own.
 */

const SLUG = 'levitation';
const SIG_R = 54;
const FILL_MS = 1500;
const LIFT_MS = 2200;
const EVERY_MS = 6600;
const EVERY_HALF_MS = 5000;
const CUSH_W = 76;
const CUSH_H = 44;
const CUSH_R = 40;
const LAND_R = 110;
const SHOCK = 10;
const HARD = 14;
const HARD_STUN = 850;
const LOFT_MS = 3200;
const LOFT_MULT = 1.3;
const SLIDE = 125;
const SLIDE_MS = 420;

interface Cushion { bx: number; by: number; x: number; y: number; sx: number; sy: number; tx: number; ty: number; slideAt: number; phase: number; target: StrikeTarget | null }
interface Sigil { side: Side; x: number; y: number; bornAt: number }
interface Lift { f: Fighter; side: Side; x: number; y: number; startAt: number; until: number }
interface Quake { x: number; y: number; at: number; soft: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const now = (): number => ctx.scene.time.now;
  const mid = top + (H - top) / 2;
  const cushions: Cushion[] = [
    { x: W * 0.22, y: mid + 70 }, { x: W * 0.5, y: top + 120 }, { x: W * 0.78, y: mid + 90 },
  ].map((p, i) => ({ bx: p.x, by: p.y, x: p.x, y: p.y, sx: p.x, sy: p.y, tx: p.x, ty: p.y, slideAt: -9999, phase: i * 2.1, target: null }));
  let sigils: Sigil[] = [];
  let lifts: Lift[] = [];
  let quakes: Quake[] = [];
  const loftUntil: Record<Side, number> = { player: 0, npc: 0 };
  let nextBell = 3200;
  let lastBellAt = 0;
  let turned = false;

  for (const c of cushions) {
    c.target = ctx.target({
      x: c.x, y: c.y, r: CUSH_R, passThrough: true,
      onStruck: (by) => {
        const f = fighter(by);
        // Nobody can kick out the cushion they are standing on.
        if (dist(f.x, f.y, c.x, c.y) < CUSH_R) return;
        const a = Math.atan2(c.y - f.y, c.x - f.x);
        c.sx = c.bx; c.sy = c.by;
        c.tx = tk.clampX(c.bx + Math.cos(a) * SLIDE, 70); c.ty = clamp(c.by + Math.sin(a) * SLIDE, top + 60, H - 60);
        c.slideAt = now();
        ctx.sfx('whoosh');
      },
    });
  }

  const lifted = (f: Fighter): Lift | undefined => lifts.find((l) => l.f === f);
  const cushionAt = (x: number, y: number): Cushion | undefined => cushions.find((c) => dist(c.x, c.y, x, y) < CUSH_R + 4);

  function lift(s: Side, time: number): void {
    const f = fighter(s);
    if (!alive(f) || lifted(f)) return;
    ctx.airborne(f, LIFT_MS);
    ctx.root(f, LIFT_MS + 90);
    // Come down a beat after the charm lets go, so the landing is felt (nothing reaches the airborne).
    lifts.push({ f, side: s, x: f.x, y: f.y, startAt: time, until: time + LIFT_MS + 90 });
    ctx.sfx('wings');
  }

  function land(l: Lift, time: number): void {
    const soft = !!cushionAt(l.x, l.y);
    const other: Side = l.side === 'player' ? 'npc' : 'player';
    const o = fighter(other);
    if (alive(o) && !lifted(o) && dist(o.x, o.y, l.x, l.y) < LAND_R) {
      if (other === 'player') tk.hitPlayer(SHOCK, o.x, o.y); else ctx.hit(o, SHOCK, o.x, o.y);
    }
    if (soft) { loftUntil[l.side] = time + LOFT_MS; ctx.sfx('boing'); }
    else {
      if (l.side === 'player') tk.hitPlayer(HARD, l.x, l.y); else ctx.hit(l.f, HARD, l.x, l.y);
      ctx.stun(l.f, HARD_STUN);
      ctx.sfx('stone-slam');
    }
    quakes.push({ x: l.x, y: l.y, at: time, soft });
  }

  return {
    update(time) {
      if (!turned && pastHalf(npc)) { turned = true; ctx.banner('THE CUSHIONS WANDER', '#e8d8ff'); }
      // Cushions: sliding when struck, wandering past half.
      for (const c of cushions) {
        const k = clamp((time - c.slideAt) / SLIDE_MS, 0, 1);
        if (k < 1) { const e = 1 - (1 - k) * (1 - k); c.bx = c.sx + (c.tx - c.sx) * e; c.by = c.sy + (c.ty - c.sy) * e; }
        const wx = turned ? Math.cos(time / 2600 + c.phase) * 70 : 0, wy = turned ? Math.sin(time / 2100 + c.phase * 1.3) * 45 : 0;
        c.x = tk.clampX(c.bx + wx, 60); c.y = clamp(c.by + wy, top + 50, H - 50);
        c.target?.moveTo(c.x, c.y);
      }
      // The bell: a sigil under each fighter's feet.
      if (time >= nextBell) {
        nextBell = time + (turned ? EVERY_HALF_MS : EVERY_MS);
        lastBellAt = time;
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighter(s);
          if (alive(f) && !lifted(f)) sigils.push({ side: s, x: f.x, y: f.y, bornAt: time });
        }
        ctx.sfx('beam-charge');
      }
      // A full sigil lifts whoever stands in it.
      sigils = sigils.filter((sg) => {
        if (time - sg.bornAt < FILL_MS) return true;
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighter(s);
          if (alive(f) && dist(f.x, f.y, sg.x, sg.y) < SIG_R) lift(s, time);
        }
        return false;
      });
      lifts = lifts.filter((l) => {
        if (time < l.until) return true;
        if (alive(l.f)) land(l, time);
        return false;
      });
      quakes = quakes.filter((q) => time - q.at < 700);
    },

    playerTakenMult: () => (loftUntil.npc > now() ? LOFT_MULT : 1),
    npcTakenMult: () => (loftUntil.player > now() ? LOFT_MULT : 1),

    npcSeek() {
      if (lifted(npc)) return null;
      // Stay out from under the player's landing.
      const pl = lifted(player);
      if (pl && dist(npc.x, npc.y, pl.x, pl.y) < LAND_R + 40) {
        const a = Math.atan2(npc.y - pl.y, npc.x - pl.x);
        return { x: tk.clampX(pl.x + Math.cos(a) * (LAND_R + 70)), y: tk.clampY(pl.y + Math.sin(a) * (LAND_R + 70)) };
      }
      const mine = sigils.find((s) => s.side === 'npc');
      if (mine) {
        if (cushionAt(mine.x, mine.y)) return { x: mine.x, y: mine.y };
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x) || 0.5;
        return { x: tk.clampX(mine.x + Math.cos(a) * (SIG_R + 60)), y: tk.clampY(mine.y + Math.sin(a) * (SIG_R + 60)) };
      }
      if (nextBell - now() < 2300) {
        let best: Cushion | null = null, bd = Infinity;
        for (const c of cushions) { const d = dist(c.x, c.y, npc.x, npc.y); if (d < bd) { bd = d; best = c; } }
        if (best) return { x: best.x, y: best.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of cushions) drawCushion(g, c, time);
      for (const sg of sigils) drawSigil(g, sg, time);
      for (const l of lifts) drawUpdraft(g, l, time);
      for (const q of quakes) {
        const k = (time - q.at) / 700;
        const c = q.soft ? MANA : SCORCH;
        g.lineStyle(6 * (1 - k), c, 0.7 * (1 - k)); g.strokeEllipse(q.x, q.y, LAND_R * 2 * (0.3 + k * 0.7), LAND_R * 1.3 * (0.3 + k * 0.7));
        // Slates knocked up round the landing.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + q.x;
          const r = LAND_R * (0.35 + k * 0.6), hop = Math.sin(k * Math.PI) * 14;
          const px = q.x + Math.cos(a) * r, py = q.y + Math.sin(a) * r * 0.62 - hop;
          g.fillStyle(SLATE_DEEP, 1 - k); g.fillRect(px - 5, py - 3, 10, 6);
          g.fillStyle(lit(SLATE_DEEP, 0.3), 1 - k); g.fillRect(px - 5, py - 3, 10, 1.5);
        }
      }
    },

    drawAir(g, time) {
      for (const l of lifts) {
        const k = clamp((time - l.startAt) / LIFT_MS, 0, 1);
        // Feathers circling the risen, slowly settling.
        for (let i = 0; i < 5; i++) {
          const a = time / 700 + i * 1.256;
          const fx = l.x + Math.cos(a) * (26 + i * 3), fy = l.y - 36 + Math.sin(a) * 10 + ((time / 18 + i * 31) % 40) * 0.4;
          feather(g, fx, fy, 14, a + Math.sin(time / 300 + i) * 0.6, i % 2 ? CHALK : VIOLET_LIT, 0.85 * (1 - k * 0.4));
        }
        // The last moments: the ground answers where they will come down.
        if (l.until - time < 700) {
          const soft = !!cushionAt(l.x, l.y);
          const kk = 1 - (l.until - time) / 700;
          dashedRing(g, l.x, l.y, LAND_R, soft ? MANA_LIT : 0xff7a50, 0.4 + kk * 0.5, 2, 32, 0.62, time / 500);
        }
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 4;
      slatePlate(g, cx, y, 210, 30);
      // The bell dial: twelve ticks filling toward the next lift.
      const span = turned ? EVERY_HALF_MS : EVERY_MS;
      const k = clamp(1 - (nextBell - time) / span, 0, 1);
      const dx = cx - 70, dy = y + 15;
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
        g.lineStyle(2, i / 12 < k ? GOLD_LIT : dim(CHALK, 0.4), 1);
        g.lineBetween(dx + Math.cos(a) * 6, dy + Math.sin(a) * 6, dx + Math.cos(a) * 10, dy + Math.sin(a) * 10);
      }
      if (time - lastBellAt < 400) { g.fillStyle(GOLD_LIT, 0.8); g.fillCircle(dx, dy, 5); }
      // Up-chevrons beside it.
      for (let i = 0; i < 3; i++) { const a = k > (i + 1) / 4 ? 1 : 0.3; g.lineStyle(1.6, MANA_LIT, a); g.lineBetween(dx + 18 + i * 9, dy + 3, dx + 22 + i * 9, dy - 3); g.lineBetween(dx + 22 + i * 9, dy - 3, dx + 26 + i * 9, dy + 3); }
      // Loft: a feather lit in each side's colour while their next blows land harder.
      for (const [s, fx] of [['player', cx + 30], ['npc', cx + 72]] as [Side, number][]) {
        const on = loftUntil[s] > time;
        feather(g, fx, dy, 26, -0.5, on ? sideColor(s) : dim(CHALK, 0.45), on ? 1 : 0.6);
        if (on) progressArc(g, fx, dy, 12, (loftUntil[s] - time) / LOFT_MS, sideColor(s), 0.9, 1.5);
      }
    },

    destroy() { for (const c of cushions) c.target?.remove(); },
  };

  /** A velvet feather-cushion on the slate: piped, tufted, tasselled, a feather stitched in gold. */
  function drawCushion(g: G, c: Cushion, time: number): void {
    const x = c.x, y = c.y;
    const sliding = time - c.slideAt < SLIDE_MS;
    if (sliding) for (let i = 1; i <= 3; i++) { g.fillStyle(VIOLET, 0.12 / i); g.fillRoundedRect(x - CUSH_W / 2 - (c.tx - c.sx) * 0.08 * i, y - CUSH_H / 2 - (c.ty - c.sy) * 0.08 * i, CUSH_W, CUSH_H, 14); }
    shadow(g, x, y + CUSH_H / 2 - 2, CUSH_W + 6, 12, 0.3);
    g.fillStyle(VIOLET_DARK, 1); g.fillRoundedRect(x - CUSH_W / 2, y - CUSH_H / 2 + 3, CUSH_W, CUSH_H, 14);
    g.fillStyle(VIOLET, 1); g.fillRoundedRect(x - CUSH_W / 2, y - CUSH_H / 2, CUSH_W, CUSH_H - 3, 14);
    g.fillStyle(VIOLET_LIT, 0.5); g.fillEllipse(x - 6, y - 9, CUSH_W * 0.66, 12);
    // Gold piping.
    g.lineStyle(1.6, GOLD, 0.95); g.strokeRoundedRect(x - CUSH_W / 2 + 2, y - CUSH_H / 2 + 2, CUSH_W - 4, CUSH_H - 6, 12);
    // Tufting: pleats into a covered button.
    g.lineStyle(1, VIOLET_DARK, 0.7);
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.lineBetween(x, y - 2, x + px * CUSH_W * 0.28, y - 2 + py * CUSH_H * 0.26);
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, y - 2, 3.2); g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 0.8, y - 2.8, 1.3);
    feather(g, x + 16, y + 6, 20, -0.4, GOLD, 0.9);
    // Corner tassels, swaying.
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tx = x + px * (CUSH_W / 2 - 4), ty = y + py * (CUSH_H / 2 - 5);
      const sw = Math.sin(time / 400 + px * 2 + py) * 2;
      g.lineStyle(1.2, GOLD, 1); g.lineBetween(tx, ty, tx + px * 4 + sw, ty + 7);
      g.fillStyle(GOLD, 1); g.fillTriangle(tx + px * 4 + sw - 2.5, ty + 12, tx + px * 4 + sw + 2.5, ty + 12, tx + px * 4 + sw, ty + 6);
    }
    // A soft gleam when a sigil is filling over it.
    if (sigils.some((s) => dist(s.x, s.y, x, y) < CUSH_R + 4)) glow(g, x, y, 40, MANA, 0.05 + Math.sin(time / 120) * 0.02, 3);
  }

  /** A lifting sigil: a scorched ring, a band of runes, a filling arc and chevrons climbing out of it. */
  function drawSigil(g: G, sg: Sigil, time: number): void {
    const k = clamp((time - sg.bornAt) / FILL_MS, 0, 1);
    const x = sg.x, y = sg.y, sq = 0.62;
    g.fillStyle(SCORCH, 0.15 + k * 0.15); g.fillEllipse(x, y, SIG_R * 2, SIG_R * 2 * sq);
    g.lineStyle(2, CHALK, 0.7); g.strokeEllipse(x, y, SIG_R * 2, SIG_R * 2 * sq);
    g.lineStyle(1, CHALK, 0.45); g.strokeEllipse(x, y, SIG_R * 1.5, SIG_R * 1.5 * sq);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time / 900;
      rune(g, x + Math.cos(a) * SIG_R * 0.87, y + Math.sin(a) * SIG_R * 0.87 * sq, 3.5, i + 2, i / 8 < k ? MANA_LIT : CHALK, 0.8, 1.1);
    }
    // The filling arc, as an ellipse traced round.
    g.lineStyle(4, sideColor(sg.side), 0.9);
    g.beginPath();
    const steps = Math.max(2, Math.ceil(k * 40));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / 40) * Math.PI * 2;
      const px = x + Math.cos(a) * (SIG_R + 4), py = y + Math.sin(a) * (SIG_R + 4) * sq;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    // Chevrons rising from the centre.
    for (let i = 0; i < 3; i++) {
      const ph = ((time / 500 + i / 3) % 1);
      const cy2 = y + 6 - ph * 26;
      g.lineStyle(2, MANA_LIT, (1 - ph) * (0.3 + k * 0.7));
      g.lineBetween(x - 9, cy2 + 5, x, cy2); g.lineBetween(x, cy2, x + 9, cy2 + 5);
    }
    if (k > 0.75) { g.lineStyle(2, GOLD_LIT, (k - 0.75) * 3 * (0.6 + Math.sin(time / 50) * 0.4)); g.strokeEllipse(x, y, SIG_R * 2.1, SIG_R * 2.1 * sq); }
  }

  /** Under someone borne up: a turning disc of mana, motes rising, and their shadow left on the slate. */
  function drawUpdraft(g: G, l: Lift, time: number): void {
    const k = clamp((time - l.startAt) / LIFT_MS, 0, 1);
    const x = l.x, y = l.y + 18;
    glow(g, x, y, 46, MANA, 0.05, 3);
    g.lineStyle(2, MANA_LIT, 0.7); g.strokeEllipse(x, y, 80, 30);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + time / 400; rune(g, x + Math.cos(a) * 34, y + Math.sin(a) * 12, 3, i, MANA_LIT, 0.7, 1); }
    for (let i = 0; i < 9; i++) {
      const ph = ((time / 900 + i / 9) % 1);
      g.fillStyle(MANA_LIT, 0.7 * (1 - ph)); g.fillCircle(x + Math.sin(i * 2.3) * 26, y - ph * 60, 1.6);
    }
    // The shadow they left: smaller and paler as they rise, darkening as they come back down.
    const h = Math.sin(k * Math.PI);
    g.fillStyle(0x000000, 0.28 - h * 0.14); g.fillEllipse(x, y + 4, 40 - h * 14, 12 - h * 4);
  }
}

export const FALLEN_LEVITATION: GimmickDef = {
  id: fallenId('arcane', SLUG),
  rules: 'At the bell a sigil fills under you both and lifts whoever stays: land on a cushion lofted, on slate stunned. Strike a cushion to slide it.',
  make,
};
