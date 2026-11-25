import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { hazardStripe } from '../art';
import {
  AMBER, AMBER_LIT, COPPER, COPPER_DARK, GLOW, IRON, IRON_DARK, PITCH, PITCH_DARK, PITCH_LIT, SLAG, SLAG_LIT, SPOIL,
  SPOIL_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Delay Round — Shot-Firer Gunhild Ashlock, gunpowder.
 *
 * In the pits the face is brought down by a *round*: a pattern of drill holes, each charged and
 * given a delay, so the shots go off one after another in a ripple and the rock breaks toward the
 * first ones fired. Ashlock fires the pits. In the star's telling she fired the houses of the short.
 *
 * The rule: she drills a chevron round you — apex past your feet, arms trailing back — and tags each
 * hole with its delay (the pips on the tag). The wires run back to her exploder. When the fuse
 * runs out the round ripples from the apex outward, one delay at a time: read the pips and walk out
 * through the holes that fire last. Strike a hole to pull its wire (it won't fire); strike the
 * exploder to fire the round *now* — while she is still inside it. Past half, one hole in each round
 * hangs fire and goes off late, and twice as wide.
 */

const SLUG = 'ripple';
const IDLE_MS = 2100;
const DRILL_EACH = 90;
const FUSE_MS = 1350;
const DELAY_MS = 175;
const BLAST_R = 58;
const BLAST_DMG = 13;
const HANG_MS = 2600;
const HANG_R = 92;
const HANG_DMG = 20;
const ARM_N = 5;
const SPACING = 66;

type Phase = 'idle' | 'drill' | 'fuse' | 'fire';
interface Hole {
  x: number; y: number; delay: number; drilledAt: number; cut: boolean; fired: boolean; firedAt: number;
  hang: boolean; target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const box: Pt = { x: 92, y: H - 64 };
  let phase: Phase = 'idle';
  let phaseAt = 0;
  let fireAt = 0;
  let started = false;
  let hangs = false;
  let holes: Hole[] = [];
  let blastsOn = new Map<Fighter, number>();
  let boxStruckAt = -99999;

  const clearHoles = () => { for (const h of holes) h.target?.remove(); holes = []; };

  const drillRound = (time: number) => {
    clearHoles();
    blastsOn = new Map([[player, 0], [npc, 0]]);
    let ux = player.x - npc.x, uy = player.y - npc.y;
    const l = Math.hypot(ux, uy);
    if (l < 30) { const a = rng() * Math.PI * 2; ux = Math.cos(a); uy = Math.sin(a); } else { ux /= l; uy /= l; }
    const ax = player.x + ux * 70, ay = player.y + uy * 70;
    const pts: { x: number; y: number; delay: number }[] = [{ x: ax, y: ay, delay: 0 }];
    for (const side of [-1, 1]) {
      const a = Math.atan2(-uy, -ux) + side * 0.62;
      for (let i = 1; i <= ARM_N; i++) pts.push({ x: ax + Math.cos(a) * SPACING * i, y: ay + Math.sin(a) * SPACING * i, delay: i });
    }
    // Two easers down the middle.
    pts.push({ x: ax - ux * SPACING * 1.6, y: ay - uy * SPACING * 1.6, delay: 2 });
    pts.push({ x: ax - ux * SPACING * 3.2, y: ay - uy * SPACING * 3.2, delay: 4 });
    const inside = pts.filter((p) => p.x > 40 && p.x < W - 40 && p.y > top + 30 && p.y < H - 30);
    const hangAt = hangs && inside.length > 3 ? 1 + Math.floor(rng() * (inside.length - 1)) : -1;
    inside.forEach((p, i) => {
      const h: Hole = { x: p.x, y: p.y, delay: p.delay, drilledAt: time + i * DRILL_EACH, cut: false, fired: false, firedAt: 0, hang: i === hangAt, target: null };
      h.target = ctx.target({
        x: h.x, y: h.y, r: 22, passThrough: true,
        onStruck: () => { if (!h.fired && !h.cut && ctx.scene.time.now >= h.drilledAt) { h.cut = true; tk.sfx('snap'); } },
      });
      holes.push(h);
    });
    phase = 'drill'; phaseAt = time;
    tk.sfx('trap-set');
  };

  const boom = (h: Hole, time: number) => {
    h.fired = true; h.firedAt = time;
    const r = h.hang ? HANG_R : BLAST_R;
    tk.sfx(h.hang ? 'explosion-large' : 'explosion-small');
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, h.x, h.y) > r + 14) continue;
      if (!h.hang) {
        const n = blastsOn.get(f) ?? 0;
        if (n >= 2) continue;
        blastsOn.set(f, n + 1);
      }
      tk.hitFighter(f, h.hang ? HANG_DMG : BLAST_DMG, f.x, f.y);
    }
  };

  const exploder: StrikeTarget = ctx.target({
    x: box.x, y: box.y - 16, r: 34,
    onStruck: () => {
      const now = ctx.scene.time.now;
      if (phase === 'fuse' || (phase === 'drill' && holes.every((h) => now >= h.drilledAt))) {
        phase = 'fire'; phaseAt = now; fireAt = now + 150; boxStruckAt = now;
        tk.sfx('countdown-go');
      }
    },
  });

  return {
    update(time) {
      if (!started) { started = true; phase = 'idle'; phaseAt = time; }
      if (!hangs && npc.hp <= npc.maxHp * 0.5) { hangs = true; ctx.banner('HANG-FIRES — ONE HOLE IN EVERY ROUND GOES LATE', '#ffc070'); tk.sfx('smoke'); }
      if (phase === 'idle' && time - phaseAt >= IDLE_MS) drillRound(time);
      else if (phase === 'drill' && holes.every((h) => time >= h.drilledAt + 120)) { phase = 'fuse'; phaseAt = time; tk.sfx('countdown-tick'); }
      else if (phase === 'fuse' && time - phaseAt >= FUSE_MS) { phase = 'fire'; phaseAt = time; fireAt = time; }
      else if (phase === 'fire') {
        for (const h of holes) {
          if (h.fired || h.cut) continue;
          const due = fireAt + h.delay * DELAY_MS + (h.hang ? HANG_MS : 0);
          if (time >= due) boom(h, time);
        }
        const last = Math.max(0, ...holes.filter((h) => !h.cut).map((h) => (h.fired ? h.firedAt : Infinity)));
        if (holes.every((h) => h.fired || h.cut) && time - last > 500) { clearHoles(); phase = 'idle'; phaseAt = time; }
      }
    },

    npcSeek() {
      const live = holes.filter((h) => !h.fired && !h.cut);
      if (!live.length || phase === 'idle') return null;
      const inMine = (x: number, y: number) => live.some((h) => dist(x, y, h.x, h.y) < (h.hang ? HANG_R : BLAST_R) + 30);
      // Fire the round on the player from her exploder if she is clear and you are not.
      if (!inMine(npc.x, npc.y) && inMine(player.x, player.y) && (phase === 'fuse' || phase === 'drill') && dist(npc.x, npc.y, box.x, box.y) < 280) {
        return { x: box.x + 50, y: box.y - 40 };
      }
      if (!inMine(npc.x, npc.y)) return null;
      // Out of the round, the shortest way.
      let best: Pt | null = null;
      let bd = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        for (const r of [90, 150, 220]) {
          const x = clamp(npc.x + Math.cos(a) * r, 60, W - 60), y = clamp(npc.y + Math.sin(a) * r, top + 50, H - 50);
          if (!inMine(x, y) && r < bd) { bd = r; best = { x, y }; break; }
        }
      }
      return best;
    },

    destroy() { clearHoles(); exploder.remove(); },

    drawGround(g, time) {
      // The wires: every charged hole's lead runs back to the exploder.
      for (const h of holes) {
        if (time < h.drilledAt || h.fired) continue;
        if (h.cut) {
          const mx = (h.x + box.x) / 2, my = (h.y + box.y) / 2;
          g.lineStyle(1.5, COPPER_DARK, 0.5); g.lineBetween(box.x, box.y - 20, mx, my + 8);
          g.lineBetween(h.x, h.y, h.x + (mx - h.x) * 0.15, h.y + (my - h.y) * 0.15 + 6);
        } else {
          const lit = phase === 'fuse' ? 0.5 + 0.4 * Math.sin(time / 60 + h.delay) : 0.45;
          g.lineStyle(1.5, COPPER, lit);
          g.beginPath(); g.moveTo(h.x, h.y);
          const mx = (h.x + box.x) / 2, my = (h.y + box.y) / 2 + 18;
          for (let i = 1; i <= 10; i++) {
            const t = i / 10;
            const x = (1 - t) * (1 - t) * h.x + 2 * (1 - t) * t * mx + t * t * box.x;
            const y = (1 - t) * (1 - t) * h.y + 2 * (1 - t) * t * my + t * t * (box.y - 20);
            g.lineTo(x, y);
          }
          g.strokePath();
        }
      }
      for (const h of holes) {
        if (time < h.drilledAt) continue;
        if (h.fired) { drawCrater(g, h, time); continue; }
        drawHole(g, h, time, phase === 'fuse' || phase === 'fire', fireAt);
      }
      drawExploder(g, box, time, boxStruckAt, phase === 'fuse');
    },

    drawAir(g, time) {
      // Drilling: the bit's spark on each hole as it is sunk.
      for (const h of holes) {
        const k = (time - h.drilledAt + DRILL_EACH) / DRILL_EACH;
        if (k < 0 || k > 1) continue;
        g.fillStyle(AMBER_LIT, 1 - k); g.fillCircle(h.x, h.y, 4 + k * 8);
        for (let i = 0; i < 4; i++) { const a = i * 1.6 + time / 40; g.fillStyle(SPOIL_LIT, 1 - k); g.fillCircle(h.x + Math.cos(a) * 10 * k, h.y + Math.sin(a) * 6 * k - 4, 1.6); }
      }
      // Blasts: a ring of thrown rock and a column of dust.
      for (const h of holes) {
        if (!h.fired) continue;
        const k = (time - h.firedAt) / 650;
        if (k < 0 || k > 1) continue;
        const r = (h.hang ? HANG_R : BLAST_R) * (0.4 + k * 0.7);
        g.fillStyle(SLAG_LIT, 0.6 * (1 - k)); g.fillCircle(h.x, h.y, r * 0.6);
        g.fillStyle(SPOIL, 0.5 * (1 - k)); g.fillCircle(h.x, h.y - k * 24, r * 0.8);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + h.x;
          g.fillStyle(i % 2 ? PITCH_LIT : SPOIL_LIT, 1 - k);
          g.fillCircle(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.8 - Math.sin(k * Math.PI) * 18, 3);
        }
      }
    },

    drawHud(g, time) {
      // The fuse: a burning cord that shortens to the shot.
      const x = 20, y = top + 20;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 8, y - 12, 150, 24, 6);
      const k = phase === 'fuse' ? 1 - clamp((time - phaseAt) / FUSE_MS, 0, 1) : phase === 'drill' ? 1 : 0;
      g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x, y, x + 120, y);
      g.lineStyle(4, AMBER, 1); g.lineBetween(x, y, x + 120 * k, y);
      if (phase === 'fuse') { g.fillStyle(SLAG_LIT, 0.7 + Math.sin(time / 40) * 0.3); g.fillCircle(x + 120 * k, y, 4); }
      // Then which delay is going now.
      if (phase === 'fire') {
        const d = Math.floor((time - fireAt) / DELAY_MS);
        for (let i = 0; i <= ARM_N; i++) { g.fillStyle(i <= d ? SLAG : IRON, 1); g.fillCircle(x + 6 + i * 20, y, 5); }
      }
      if (hangs) { g.fillStyle(SLAG, 1); g.fillTriangle(x + 134, y - 7, x + 128, y + 6, x + 140, y + 6); }
    },
  };
}

/** A charged hole: crushed rock round the collar, stemming, and a delay tag on a peg with its pips. */
function drawHole(g: G, h: Hole, time: number, armed: boolean, fireAt: number): void {
  const { x, y } = h;
  const r = h.hang ? HANG_R : BLAST_R;
  if (armed && !h.cut) {
    // The blast's reach, brightening as its delay comes up.
    const due = fireAt + h.delay * DELAY_MS + (h.hang ? HANG_MS : 0);
    const k = fireAt > 0 && time >= fireAt ? clamp(1 - (due - time) / 900, 0, 1) : 0.15;
    g.fillStyle(h.hang ? SLAG : AMBER, 0.06 + k * 0.18); g.fillCircle(x, y, r);
    g.lineStyle(1.5 + k * 2, h.hang ? SLAG_LIT : AMBER, 0.3 + k * 0.6); g.strokeCircle(x, y, r);
  } else if (!h.cut) {
    g.lineStyle(1, AMBER, 0.25); g.strokeCircle(x, y, r);
  }
  g.fillStyle(SPOIL, 1); g.fillEllipse(x, y, 22, 12);
  g.fillStyle(PITCH_DARK, 1); g.fillEllipse(x, y, 10, 6);
  if (h.cut) {
    g.fillStyle(SPOIL_LIT, 1); g.fillEllipse(x, y - 1, 10, 5);
    return;
  }
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x, y - 1, 7, 4);
  // The tag: a little board on a peg with one pip per delay.
  const tx = x + 12, ty = y - 18;
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x + 6, y, tx, ty + 8);
  g.fillStyle(h.hang ? SLAG : AMBER, 1); g.fillRoundedRect(tx - 9, ty - 6, 18, 14, 2);
  g.lineStyle(1, IRON_DARK, 1); g.strokeRoundedRect(tx - 9, ty - 6, 18, 14, 2);
  if (h.delay === 0) { g.fillStyle(IRON_DARK, 1); g.fillTriangle(tx - 4, ty - 2, tx + 4, ty - 2, tx, ty + 5); }
  for (let i = 0; i < h.delay; i++) {
    const px = tx - 6 + (i % 3) * 6, py = ty - 2 + Math.floor(i / 3) * 6;
    g.fillStyle(IRON_DARK, 1); g.fillCircle(px, py, 1.8);
  }
  if (h.hang) {
    for (let i = 0; i < 3; i++) {
      const p = ((time / 900) + i / 3) % 1;
      g.fillStyle(SPOIL_LIT, 0.4 * (1 - p)); g.fillCircle(x + Math.sin(p * 6 + i) * 5, y - 6 - p * 26, 4 + p * 5);
    }
  }
}

/** Where a hole went: a scorched star of broken pitch-blende, a little of the ore showing. */
function drawCrater(g: G, h: Hole, time: number): void {
  const k = clamp((time - h.firedAt) / 3000, 0, 1);
  const a = 1 - k * 0.6;
  g.fillStyle(PITCH_DARK, 0.6 * a); g.fillCircle(h.x, h.y, 16);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + h.y;
    g.lineStyle(2, PITCH, 0.7 * a); g.lineBetween(h.x, h.y, h.x + Math.cos(ang) * 24, h.y + Math.sin(ang) * 16);
  }
  g.fillStyle(GLOW, 0.4 * a); g.fillCircle(h.x + 3, h.y - 2, 2);
}

/** The exploder: a wooden box with a T-handled plunger, a brass dial, and the wires to its posts. */
function drawExploder(g: G, p: Pt, time: number, struckAt: number, armed: boolean): void {
  const { x, y } = p;
  shadow(g, x, y + 2, 70, 18, 0.4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 30, 48, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 22, y - 30, 44, 6);
  for (let i = 0; i < 3; i++) { g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(x - 22, y - 20 + i * 7, x + 22, y - 20 + i * 7); }
  hazardStripe(g, x - 24, y - 4, 48, 4, 0.9);
  const k = (time - struckAt) / 250;
  const down = k >= 0 && k < 1 ? 14 * (1 - Math.abs(1 - k * 2)) : 0;
  g.lineStyle(4, IRON, 1); g.lineBetween(x, y - 30, x, y - 52 + down);
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x - 14, y - 52 + down, x + 14, y - 52 + down);
  for (const k2 of [-1, 1]) { g.fillStyle(COPPER, 1); g.fillCircle(x + k2 * 16, y - 32, 3); }
  g.fillStyle(AMBER_LIT, 1); g.fillCircle(x - 10, y - 14, 4);
  g.lineStyle(1, IRON_DARK, 1); g.lineBetween(x - 10, y - 14, x - 10 + Math.cos(time / 300) * 3, y - 14 + Math.sin(time / 300) * 3);
  if (armed) glow(g, x, y - 20, 30, SLAG, 0.05 + 0.04 * Math.sin(time / 70), 3);
}

export const FALLEN_RIPPLE: GimmickDef = {
  id: fallenId('halflife', SLUG),
  rules: 'She drills a round round you; it fires in the order its tags show. Strike a hole to pull its wire, the exploder to fire it now. At half, a hang-fire.',
  make,
};
