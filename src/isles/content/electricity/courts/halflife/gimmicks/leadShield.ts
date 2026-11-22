import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { hazardStripe, trefoil } from '../art';
import {
  AMBER, CHEREN, CHEREN_LIT, CONCRETE, CONCRETE_DARK, GLOW, GLOW_LIT, HAZARD_BLACK, IRON_DARK, LEAD, LEAD_DARK,
  LEAD_LIT, SLAG,
} from '../palette';
import { alive, clamp, dist, segCross, stepDt, wrapAngle } from '../util';

/**
 * Lead Shield — Plumber Galena.
 *
 * A reactor vent stands in the middle of the Plumbery yard and sweeps a beam of hard blue-green
 * light round the room like a lighthouse — slowly, so you can see it coming (the glow runs ahead
 * of it). Whoever the beam touches is burnt, unless a lead screen stands between them and the
 * vent: the screens throw a long shadow behind them, and the shadow is safe.
 *
 * The screens are on castors. Strike one — a shot, a blow, anything — and it slides away from
 * you: set your own cover, or knock away the screen the foe is sheltering behind as the beam comes
 * round (lead stops shots, so firing at someone behind a screen shoves it on to them). Galena does
 * it too: every so often she lays a hand on the screen nearest you (it lights red), and rolls it off.
 */

const SCREEN_LEN = 96;
/** Strike radius round a screen's middle. */
const SCREEN_R = 34;
/** A strike sets a screen rolling at this speed (px/s); castor friction brings it to rest. */
const SLIDE_SPEED = 300;
/** The bot keeps this far behind its own screen, out of its own swing's reach. */
const SHELTER_D = 100;
const BEAM_HALF = 26;
const TICK_MS = 350;
const BURN = 5;

interface Screen {
  x: number; y: number; a: number; heatAt: number; rollAt: number; rollDir: Pt | null;
  /** Sliding from a strike, px/s. */
  vx: number; vy: number;
  struckAt: number;
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const vx = W / 2, vy = (top + H) / 2 + 10;
  const SPIN = ctx.hard ? 0.72 : 0.55;
  const beams = ctx.hard ? 2 : 1;
  const rollEvery = ctx.hard ? 6500 : 8000;
  const ROLL_WARN = 900;
  let beamA = rng() * Math.PI * 2;
  let dir = rng() < 0.5 ? 1 : -1;
  let nextFlip = 0;
  let flipWarnAt = -1;
  let nextRoll = 0;
  let started = false;
  const nextTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const burnFx = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  // Four screens set about the vent, square-on to it.
  const screens: Screen[] = [];
  const count = ctx.hard ? 3 : 4;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.6;
    const d = 150 + rng() * 60;
    screens.push({ x: vx + Math.cos(a) * d * 1.3, y: vy + Math.sin(a) * d * 0.8, a: a + Math.PI / 2, heatAt: 0, rollAt: 0, rollDir: null, vx: 0, vy: 0, struckAt: -9999, target: null });
  }
  // Struck, a screen slides straight away from whoever struck it.
  const strike = (s: Screen, by: Striker) => {
    const f = by === 'player' ? player : npc;
    const d = dist(f.x, f.y, s.x, s.y);
    const a = d > 1 ? Math.atan2(s.y - f.y, s.x - f.x) : ctx.facing(f);
    s.vx = Math.cos(a) * SLIDE_SPEED; s.vy = Math.sin(a) * SLIDE_SPEED;
    s.struckAt = ctx.scene.time.now;
    tk.sfx('clang');
  };
  for (const s of screens) s.target = ctx.target({ x: s.x, y: s.y, r: SCREEN_R, onStruck: (by) => strike(s, by) });

  const ends = (s: Screen) => {
    const ux = Math.cos(s.a) * SCREEN_LEN / 2, uy = Math.sin(s.a) * SCREEN_LEN / 2;
    return [s.x - ux, s.y - uy, s.x + ux, s.y + uy] as const;
  };
  const shaded = (x: number, y: number) => screens.some((s) => { const [ax, ay, bx, by] = ends(s); return segCross(vx, vy, x, y, ax, ay, bx, by); });
  const beamAngles = () => (beams === 2 ? [beamA, beamA + Math.PI] : [beamA]);
  const inBeam = (x: number, y: number) => {
    const d = dist(vx, vy, x, y);
    if (d < 40) return false;
    const a = Math.atan2(y - vy, x - vx);
    return beamAngles().some((b) => Math.abs(wrapAngle(a - b)) < Math.atan2(BEAM_HALF, d)) && !shaded(x, y);
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextFlip = time + 11000; nextRoll = time + rollEvery; }
      // The vent turns; now and then it reverses, with warning.
      if (flipWarnAt < 0 && time >= nextFlip - 1200) { flipWarnAt = time; ctx.banner('THE VENT REVERSES', '#b8ecff'); tk.sfx('gear-turn'); }
      if (time >= nextFlip) { nextFlip = time + 9000 + rng() * 5000; flipWarnAt = -1; dir = -dir; }
      const slow = flipWarnAt >= 0 ? clamp(1 - (time - flipWarnAt) / 1200, 0.15, 1) : 1;
      beamA += dir * SPIN * slow * dt;

      for (const s of screens) {
        // Rolling from a strike, slowing on its castors.
        if (s.vx !== 0 || s.vy !== 0) {
          s.x += s.vx * dt; s.y += s.vy * dt;
          const f = Math.max(0, 1 - dt * 4.5);
          s.vx *= f; s.vy *= f;
          if (Math.hypot(s.vx, s.vy) < 8) { s.vx = 0; s.vy = 0; }
        }
        // Galena's roll.
        if (s.rollDir && time >= s.rollAt) {
          const left = clamp(1 - (time - s.rollAt) / 700, 0, 1);
          s.x += s.rollDir.x * 260 * left * dt; s.y += s.rollDir.y * 260 * left * dt;
          if (left <= 0) s.rollDir = null;
        }
        s.x = clamp(s.x, 70, W - 70); s.y = clamp(s.y, top + 60, H - 40);
        // Keep it off the vent.
        const dv = dist(s.x, s.y, vx, vy);
        if (dv < 80) { s.x = vx + ((s.x - vx) / (dv || 1)) * 80; s.y = vy + ((s.y - vy) / (dv || 1)) * 80; }
        // Screens turn slowly to face the vent, like sunflowers of lead.
        const want = Math.atan2(s.y - vy, s.x - vx) + Math.PI / 2;
        s.a += wrapAngle(want - s.a) * Math.min(1, dt * 0.8);
        s.target?.moveTo(s.x, s.y);
      }

      // Galena rolls away the screen nearest you.
      if (time >= nextRoll - ROLL_WARN && !screens.some((s) => s.heatAt > 0)) {
        let best: Screen | null = null;
        let bd = Infinity;
        for (const s of screens) { const d = dist(s.x, s.y, player.x, player.y); if (d < bd) { bd = d; best = s; } }
        if (best && bd < 260) { best.heatAt = time; ctx.float(best.x, best.y - 40, 'GALENA ROLLS IT', '#ff8a5a'); tk.sfx('magnet-pull'); }
        else nextRoll = time + 1500;
      }
      for (const s of screens) {
        if (s.heatAt > 0 && time - s.heatAt >= ROLL_WARN) {
          const a = Math.atan2(s.y - player.y, s.x - player.x);
          s.rollDir = { x: Math.cos(a), y: Math.sin(a) };
          s.rollAt = time;
          s.heatAt = 0;
          nextRoll = time + rollEvery;
          tk.sfx('clang');
        }
      }

      // The beam burns.
      for (const f of [player, npc]) {
        if (!alive(f) || !inBeam(f.x, f.y) || time < (nextTick.get(f) ?? 0)) continue;
        nextTick.set(f, time + TICK_MS);
        burnFx.set(f, time);
        if (f === player) tk.hitPlayer(BURN, f.x, f.y); else ctx.hit(f, BURN, f.x, f.y);
      }
    },

    npcSeek() {
      // Into the shadow of the screen that suits her: near her, far from you.
      let best: Pt | null = null;
      let bs = -Infinity;
      for (const s of screens) {
        const a = Math.atan2(s.y - vy, s.x - vx);
        const x = clamp(s.x + Math.cos(a) * SHELTER_D, 60, W - 60), y = clamp(s.y + Math.sin(a) * SHELTER_D, top + 50, H - 40);
        const sc = dist(x, y, player.x, player.y) * 0.5 - dist(x, y, npc.x, npc.y) - (s.heatAt > 0 ? 400 : 0);
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
      return best;
    },

    destroy() { for (const s of screens) s.target?.remove(); },

    drawGround(g, time) {
      // The beam's sweep: a cone of light from the vent, its leading edge glowing ahead.
      const R = Math.hypot(W, H);
      for (const b of beamAngles()) {
        for (let k = 1; k <= 4; k++) {
          const lead = b + dir * k * 0.12;
          g.lineStyle(BEAM_HALF * 2, CHEREN, 0.05 / k); g.lineBetween(vx, vy, vx + Math.cos(lead) * R, vy + Math.sin(lead) * R);
        }
        g.lineStyle(BEAM_HALF * 2, GLOW, 0.22); g.lineBetween(vx, vy, vx + Math.cos(b) * R, vy + Math.sin(b) * R);
        g.lineStyle(BEAM_HALF, CHEREN_LIT, 0.35); g.lineBetween(vx, vy, vx + Math.cos(b) * R, vy + Math.sin(b) * R);
        g.lineStyle(3, 0xffffff, 0.5); g.lineBetween(vx, vy, vx + Math.cos(b) * R, vy + Math.sin(b) * R);
      }
      // Each screen's shadow: a dark wedge cast away from the vent.
      for (const s of screens) {
        const [ax, ay, bx, by] = ends(s);
        const fa = Math.atan2(ay - vy, ax - vx), fb = Math.atan2(by - vy, bx - vx);
        const L = 900;
        g.fillStyle(0x000000, 0.28);
        g.fillTriangle(ax, ay, bx, by, bx + Math.cos(fb) * L, by + Math.sin(fb) * L);
        g.fillTriangle(ax, ay, bx + Math.cos(fb) * L, by + Math.sin(fb) * L, ax + Math.cos(fa) * L, ay + Math.sin(fa) * L);
      }
      // The vent: a concrete drum with a grille, a trefoil, hazard ring.
      g.fillStyle(0x000000, 0.35); g.fillEllipse(vx, vy + 10, 96, 30);
      hazardStripe(g, vx - 46, vy + 14, 92, 8, 0.9);
      g.fillStyle(CONCRETE_DARK, 1); g.fillCircle(vx, vy, 40);
      g.fillStyle(CONCRETE, 1); g.fillCircle(vx, vy - 3, 36);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(vx, vy - 3, 24);
      for (let i = -3; i <= 3; i++) { g.lineStyle(2, LEAD_LIT, 0.7); g.lineBetween(vx + i * 6, vy - 24, vx + i * 6, vy + 18); }
      const pulse = 0.6 + Math.sin(time / 120) * 0.3;
      g.fillStyle(GLOW, 0.4 * pulse); g.fillCircle(vx, vy - 3, 18);
      glow(g, vx, vy - 3, 50, CHEREN, 0.05, 3);
      trefoil(g, vx, vy + 26, 6, HAZARD_BLACK, AMBER, 0.9);
    },

    drawAir(g, time) {
      for (const s of screens) {
        const [ax, ay, bx, by] = ends(s);
        const hot = s.heatAt > 0 ? clamp((time - s.heatAt) / ROLL_WARN, 0, 1) : 0;
        // Castored frame and a heavy lead sheet standing on it.
        g.lineStyle(16, LEAD_DARK, 1); g.lineBetween(ax, ay + 2, bx, by + 2);
        g.lineStyle(12, hot > 0 ? SLAG : LEAD, hot > 0 ? 0.5 + hot * 0.5 : 1); g.lineBetween(ax, ay - 2, bx, by - 2);
        g.lineStyle(3, LEAD_LIT, 0.8); g.lineBetween(ax, ay - 7, bx, by - 7);
        for (const [cx, cy] of [[ax, ay], [bx, by]]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy + 8, 4); }
        trefoil(g, s.x, s.y - 2, 5, AMBER, undefined, 0.8);
        // Struck: a ring off the lead and sparks from the castors.
        const sk = (time - s.struckAt) / 350;
        if (sk >= 0 && sk < 1) {
          g.lineStyle(3 * (1 - sk), LEAD_LIT, 1 - sk); g.strokeCircle(s.x, s.y - 2, 14 + sk * 26);
          for (const [cx, cy] of [[ax, ay], [bx, by]]) { g.fillStyle(AMBER, 1 - sk); g.fillCircle(cx - s.vx * 0.02, cy + 8 - s.vy * 0.02, 2); }
        }
        // Where the beam strikes it, a splash of light on its face.
        for (const b of beamAngles()) {
          const a = Math.atan2(s.y - vy, s.x - vx);
          if (Math.abs(wrapAngle(a - b)) < 0.3) { g.fillStyle(CHEREN_LIT, 0.5); g.fillCircle(s.x, s.y - 2, 14); }
        }
      }
      for (const f of [player, npc]) {
        const at = burnFx.get(f) ?? -9999;
        if (!alive(f) || time - at > 300) continue;
        const k = (time - at) / 300;
        g.lineStyle(3, GLOW_LIT, 1 - k); g.strokeCircle(f.x, f.y - 4, 20 + k * 10);
      }
    },
  };
}

export const LEAD_SHIELD: GimmickDef = {
  id: 'halflife-lead-shield',
  rules: 'The vent sweeps a burning beam round the yard. Lead screens cast safe shadows and stop shots; strike one to slide it away from you. Galena rolls away the screen nearest you.',
  make,
};
