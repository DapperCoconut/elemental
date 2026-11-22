import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { bolt, meterDial, poly, sparks } from '../art';
import { ARC, BASALT, BASALT_LIT, COPPER, COPPER_DARK, COPPER_LIT, IRON, IRON_DARK, IRON_LIT, OFF_RED, SPARK, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * Treadwheel — Wheelhand Dobbin.
 *
 * The yard *is* the treadwheel: a great ring of tread slats laid flat round the arena, turning
 * on its hub, carrying anyone who stands on it along with the turn. A brass meter rides with each
 * fighter. Walking *with* the turn (your own feet, not the wheel's carry) cranks your meter up;
 * walking against it bleeds it away. Full, the dynamo under the dais fires — a lightning lance
 * out of the central electrode at the *other* fighter, its line crackling on the slats first.
 *
 * Every so often the wheel's clutch is thrown and it reverses: whoever was running with it is now
 * running against. Dobbin has walked this wheel for thirty years and runs with it without
 * thinking — keep up with him, or turn the wheel's own lance back on him. The dais itself is live:
 * stand on the hub and it bites.
 */

const RI = 112;
const RO = 246;
const RM = (RI + RO) / 2;
const DAIS_R = 52;
const LANCE_HALF = 22;

interface Meter { v: number; lastX: number; lastY: number; warnAt: number; fireAt: number; aimA: number; firedAt: number; firedA: number; daisAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 4;
  const carry = ctx.hard ? 62 : 48;
  const flipEvery = ctx.hard ? 8500 : 11000;
  const FLIP_WARN = 1500;
  const lanceWarn = ctx.hard ? 620 : 760;
  const lanceDmg = ctx.hard ? 22 : 18;
  let dir = 1;
  let rot = 0;
  let nextFlip = -1;
  let flipWarnAt = -1;
  let flippedAt = -9999;
  const meters = new Map<Fighter, Meter>();
  for (const f of [player, npc]) meters.set(f, { v: 0, lastX: f.x, lastY: f.y, warnAt: -1, fireAt: 0, aimA: 0, firedAt: -9999, firedA: 0, daisAt: 0 });

  const other = (f: Fighter) => (f === player ? npc : player);
  const onTrack = (f: Fighter) => { const d = dist(cx, cy, f.x, f.y); return d >= RI && d <= RO; };

  function hurt(f: Fighter, n: number, x: number, y: number): void {
    if (f === player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n, x, y);
  }

  function fire(f: Fighter, m: Meter, time: number): void {
    const t = other(f);
    m.firedAt = time; m.firedA = m.aimA; m.warnAt = -1; m.v = 0;
    ctx.sfx('thunder');
    ctx.flash(cx, cy, ARC);
    if (!alive(t)) return;
    const ex = cx + Math.cos(m.aimA) * 1400, ey = cy + Math.sin(m.aimA) * 1400;
    if (segDist(t.x, t.y, cx, cy, ex, ey) < LANCE_HALF + 18) {
      hurt(t, lanceDmg, t.x, t.y);
      ctx.float(t.x, t.y - 48, 'LANCED', '#bff0ff');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextFlip < 0) nextFlip = time + flipEvery;
      // The clutch.
      if (flipWarnAt < 0 && time >= nextFlip - FLIP_WARN) {
        flipWarnAt = time;
        ctx.banner('THE WHEEL REVERSES', '#ffcf8a');
        ctx.sfx('gear-turn');
      }
      if (time >= nextFlip) {
        dir = -dir; nextFlip = time + flipEvery; flipWarnAt = -1; flippedAt = time;
        ctx.sfx('clang');
      }
      // The wheel turns; slats keep the same speed whichever way it goes.
      const easeIn = clamp((time - flippedAt) / 600, 0, 1);
      const omega = (carry / RM) * dir * easeIn;
      rot += omega * dt;

      for (const [f, m] of meters) {
        if (!alive(f)) continue;
        // Own movement since the last frame: the carry nudge is applied *after* this read, so the
        // delta is purely the fighter's feet (and any knockback).
        const dx = f.x - m.lastX, dy = f.y - m.lastY;
        const a = Math.atan2(f.y - cy, f.x - cx);
        const tx = -Math.sin(a) * dir, ty = Math.cos(a) * dir;
        const along = dx * tx + dy * ty;
        if (onTrack(f) && Math.abs(along) < 30) m.v = clamp(m.v + (along > 0 ? along * 0.13 : along * 0.22), 0, 100);
        else if (!onTrack(f)) m.v = clamp(m.v - 6 * dt, 0, 100);
        // Carried with the turn.
        if (onTrack(f) && easeIn > 0) ctx.nudge(f, tx * carry * easeIn * dt, ty * carry * easeIn * dt);
        m.lastX = f.x; m.lastY = f.y;
        // The dais bites.
        if (dist(cx, cy, f.x, f.y) < DAIS_R && time - m.daisAt > 700) { m.daisAt = time; hurt(f, 3, f.x, f.y); ctx.sfx('zap'); }
        // Full: the lance.
        const t = other(f);
        if (m.warnAt < 0 && m.v >= 100 && alive(t)) {
          m.warnAt = time; m.fireAt = time + lanceWarn;
          m.aimA = Math.atan2(t.y - cy, t.x - cx);
          ctx.sfx('beam-charge');
        }
        if (m.warnAt >= 0) {
          // Tracks the target until a quarter-second before it fires, then holds.
          if (time < m.fireAt - 250 && alive(t)) {
            const want = Math.atan2(t.y - cy, t.x - cx);
            m.aimA += wrapAngle(want - m.aimA) * Math.min(1, dt * 5);
          }
          if (time >= m.fireAt) fire(f, m, time);
        }
      }
    },

    npcSeek() {
      const m = meters.get(npc);
      if (!m) return null;
      const a = Math.atan2(npc.y - cy, npc.x - cx);
      // Run with the turn, round the middle of the track; harder if your lance is coming.
      const pm = meters.get(player);
      const lead = pm && pm.warnAt >= 0 ? 1.5 : 0.85;
      const flipping = flipWarnAt >= 0;
      const b = a + (flipping ? -dir : dir) * lead;
      return { x: cx + Math.cos(b) * RM, y: cy + Math.sin(b) * RM };
    },

    drawGround(g, time) {
      // The track: a flat ring of tarred slats with iron rims.
      g.lineStyle(RO - RI, TIMBER_DARK, 1); g.strokeCircle(cx, cy, RM);
      for (let k = 0; k < 64; k++) {
        const b = rot + (k / 64) * Math.PI * 2;
        g.lineStyle(k % 2 ? 5 : 3, k % 2 ? TIMBER : TIMBER_LIT, 0.9);
        g.lineBetween(cx + Math.cos(b) * (RI + 3), cy + Math.sin(b) * (RI + 3), cx + Math.cos(b) * (RO - 3), cy + Math.sin(b) * (RO - 3));
      }
      g.lineStyle(6, IRON_DARK, 1); g.strokeCircle(cx, cy, RI); g.strokeCircle(cx, cy, RO);
      g.lineStyle(2, IRON_LIT, 0.7); g.strokeCircle(cx, cy, RI - 2); g.strokeCircle(cx, cy, RO + 2);
      // Rivets on the rims, turning.
      for (let k = 0; k < 24; k++) {
        const b = rot + (k / 24) * Math.PI * 2;
        g.fillStyle(lit(IRON, 0.3), 1);
        g.fillCircle(cx + Math.cos(b) * RO, cy + Math.sin(b) * RO, 1.6); g.fillCircle(cx + Math.cos(b) * RI, cy + Math.sin(b) * RI, 1.6);
      }
      // Chevrons painted on the slats, pointing with the turn; red while the clutch is going.
      const warn = flipWarnAt >= 0 && Math.floor(time / 160) % 2 === 0;
      for (let k = 0; k < 10; k++) {
        const b = rot + (k / 10) * Math.PI * 2;
        const px = cx + Math.cos(b) * RM, py = cy + Math.sin(b) * RM;
        const tx = -Math.sin(b) * dir, ty = Math.cos(b) * dir;
        const nx = Math.cos(b), ny = Math.sin(b);
        poly(g, [
          { x: px + tx * 16, y: py + ty * 16 },
          { x: px - tx * 6 + nx * 22, y: py - ty * 6 + ny * 22 },
          { x: px - tx * 1, y: py - ty * 1 },
          { x: px - tx * 6 - nx * 22, y: py - ty * 6 - ny * 22 },
        ], warn ? OFF_RED : COPPER_LIT, 0.55);
      }
      // Spokes under the track, out to the corners of the yard.
      for (let k = 0; k < 4; k++) {
        const b = Math.PI / 4 + k * Math.PI / 2;
        g.lineStyle(10, IRON_DARK, 1); g.lineBetween(cx + Math.cos(b) * RO, cy + Math.sin(b) * RO, cx + Math.cos(b) * 520, cy + Math.sin(b) * 520);
        g.lineStyle(2, IRON_LIT, 0.5); g.lineBetween(cx + Math.cos(b) * RO, cy + Math.sin(b) * RO - 3, cx + Math.cos(b) * 520, cy + Math.sin(b) * 520 - 3);
      }
      // The dais: basalt hub with a copper commutator ring that sparks at its brushes.
      g.fillStyle(dim(BASALT, 0.2), 1); g.fillCircle(cx, cy + 4, DAIS_R + 6);
      g.fillStyle(BASALT_LIT, 1); g.fillCircle(cx, cy, DAIS_R + 4);
      for (let k = 0; k < 16; k++) {
        const b = -rot * 3 + (k / 16) * Math.PI * 2;
        g.lineStyle(7, k % 2 ? COPPER : COPPER_DARK, 1);
        g.beginPath(); g.arc(cx, cy, DAIS_R - 6, b, b + Math.PI / 8 - 0.05, false); g.strokePath();
      }
      g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, DAIS_R - 14);
      for (const s of [-1, 1]) sparks(g, cx + s * (DAIS_R - 4), cy, 10, time + s * 90, 3);
      // A lance's line crackling on the slats as it builds.
      for (const m of meters.values()) {
        if (m.warnAt < 0) continue;
        const k = clamp((time - m.warnAt) / Math.max(1, m.fireAt - m.warnAt), 0, 1);
        const ex = cx + Math.cos(m.aimA) * 700, ey = cy + Math.sin(m.aimA) * 700;
        g.lineStyle(LANCE_HALF * 2, ARC, 0.06 + k * 0.12); g.lineBetween(cx, cy, ex, ey);
        g.lineStyle(2, ARC, 0.3 + k * 0.6);
        for (let d = DAIS_R; d < 700; d += 26) {
          const o = ((d / 26 + Math.floor(time / 60)) % 2) * 6;
          g.lineBetween(cx + Math.cos(m.aimA) * (d + o), cy + Math.sin(m.aimA) * (d + o), cx + Math.cos(m.aimA) * (d + o + 10), cy + Math.sin(m.aimA) * (d + o + 10));
        }
      }
    },

    drawAir(g, time) {
      // The electrode on the dais: a copper mast with a glass bulb, glowing as meters fill.
      const peak = Math.max(...[...meters.values()].map((m) => m.v)) / 100;
      g.lineStyle(6, COPPER_DARK, 1); g.lineBetween(cx, cy, cx, cy - 46);
      g.lineStyle(2, COPPER_LIT, 1); g.lineBetween(cx - 1.5, cy, cx - 1.5, cy - 46);
      g.fillStyle(0x9ed6e6, 0.35); g.fillCircle(cx, cy - 54, 11);
      g.lineStyle(1.5, 0xe8fbff, 0.6); g.strokeCircle(cx, cy - 54, 11);
      glow(g, cx, cy - 54, 16 + peak * 24, ARC, 0.04 + peak * 0.06, 3);
      if (peak > 0.6) sparks(g, cx, cy - 54, 14, time, 5, ARC);
      // Lances that have just fired.
      for (const m of meters.values()) {
        if (time - m.firedAt > 280) continue;
        const k = (time - m.firedAt) / 280;
        bolt(g, cx, cy - 54, cx + Math.cos(m.firedA) * 760, cy + Math.sin(m.firedA) * 760, Math.floor(time / 40), 6 * (1 - k) + 1, ARC, 1 - k, 22);
      }
      // A fighter with a nearly full meter crackles.
      for (const [f, m] of meters) if (alive(f) && m.v > 80) sparks(g, f.x, f.y - 20, 22, time, 4, SPARK);
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const m = meters.get(f);
        if (!m) continue;
        const w = 120, x0 = d > 0 ? x : x - w, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * m.v) / 100;
        g.fillStyle(m.v > 80 ? 0xe8fbff : ARC, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        meterDial(g, d > 0 ? x0 + w + 14 : x0 - 14, y + 4, 8, m.v / 100);
      }
    },
  };
}

export const TREADWHEEL: GimmickDef = {
  id: 'dynamo-treadwheel',
  rules: 'The yard is a turning treadwheel. Walk with the turn to charge your meter; full, the dais lances your foe. It reverses. The hub bites.',
  make,
};
