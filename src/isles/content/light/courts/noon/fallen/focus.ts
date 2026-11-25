import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { glint, noonShadow } from '../art';
import {
  BEAM, BEAM_HOT, BRASS, BRASS_DARK, BRASS_LIT, GLASS, GLASS_EDGE, GLASS_LIT, GOLD_LIT, IRON, IRON_DARK, IRON_LIT,
  SCORCH, SCORCH_DARK, SUN,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Racked to the Ring — Aubade Crale, Holder of the Focus.
 *
 * The Burning Glass is Kindler's; the hand that racks it onto the condemned, in the star's
 * telling, was Aubade's. She keeps the Glass's little sister on the square: a ring-lens — a
 * lighthouse lens of stepped glass rings on an iron tripod — that throws the noon down not to a
 * point but to a *ring* round its own feet, and she racks its focus in and out with a brass
 * handwheel until the ring lies on the condemned.
 *
 * The ring slides toward your distance from the stand, stops, whitens and burns. Step in or out
 * of it while it whitens. Right under the lens is the one place it can never reach.
 *
 * The exploit is her handwheel. Strike it and it slips: the next ring racks onto *her*, twice as
 * fast. She walks back to the stand to take the wheel up again — under the lens, where the ring
 * cannot reach her, unless you slip it while she is walking in. Halfway down she has the stand
 * wheeled after you, and the ring's centre creeps.
 */

const ID = fallenId('noon', 'focus');
const BAND = 24;
const R_MIN = 74;
const R_MAX = 560;
const RACK_MS = 2000;
const RACK_LATE_MS = 1600;
const HOLD_MS = 860;
const BURN_MS = 300;
const REST_MS = 520;
const RACK_SPEED = 125;
const SAFE_R = 50;
const RESET_R = 58;
const CREEP = 30;
const DMG = 15;
const DMG_NPC = 20;

type Phase = 'rack' | 'hold' | 'burn' | 'rest';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const stand: Pt = { x: W / 2, y: (top + H) / 2 + 20 };
  let R = 200;
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let holdMs = HOLD_MS;
  let slipped = false;
  let wheeled = false;
  let started = false;
  let wheelSpin = 0;
  const scorches: { r: number; x: number; y: number; at: number }[] = [];
  let wheel: StrikeTarget | null = null;

  const mark = (): Fighter => (slipped ? npc : player);
  const onBand = (f: Fighter): boolean => alive(f) && Math.abs(dist(f.x, f.y, stand.x, stand.y) - R) < BAND + 18;

  function go(p: Phase, t: number): void {
    phase = p; phaseAt = t;
    if (p === 'hold') { holdMs = tk.warn(HOLD_MS); ctx.sfx('beam-charge'); }
    if (p === 'burn') burn(t);
  }

  function burn(t: number): void {
    ctx.sfx('light-beam');
    if (onBand(player)) tk.hitPlayer(DMG, player.x, player.y);
    if (onBand(npc)) { ctx.hit(npc, DMG_NPC, npc.x, npc.y); ctx.flash(npc.x, npc.y - 20, GOLD_LIT); }
    scorches.push({ r: R, x: stand.x, y: stand.y, at: t });
    if (scorches.length > 4) scorches.shift();
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true; phaseAt = time + 900;
        wheel = ctx.target({
          x: stand.x + 26, y: stand.y - 58, r: 22,
          onStruck(by) {
            if (by === 'npc') { if (slipped) { slipped = false; ctx.sfx('clang'); } return; }
            if (slipped) return;
            slipped = true; wheelSpin = 1;
            ctx.sfx('gear-turn');
            ctx.flash(stand.x + 26, stand.y - 58, BRASS_LIT);
          },
        });
      }
      if (!wheeled && npc.hp < npc.maxHp * 0.5) { wheeled = true; ctx.banner('THE GLASS IS WHEELED', '#ffe17a'); ctx.sfx('engine'); }
      wheelSpin = Math.max(0, wheelSpin - dt * 0.6);

      // She takes the wheel back up by laying a hand on it.
      if (slipped && alive(npc) && dist(npc.x, npc.y, stand.x, stand.y) < RESET_R) { slipped = false; ctx.sfx('clang'); }

      const el = time - phaseAt;
      if (phase === 'rest' && el >= REST_MS) go('rack', time);
      else if (phase === 'rack') {
        const m = mark();
        const want = clamp(alive(m) ? dist(m.x, m.y, stand.x, stand.y) : R, R_MIN, R_MAX);
        const sp = RACK_SPEED * (slipped ? 2 : 1);
        R += clamp(want - R, -sp * dt, sp * dt);
        wheelSpin = Math.max(wheelSpin, Math.min(1, Math.abs(want - R) / 80));
        if (wheeled) {
          const d = dist(stand.x, stand.y, player.x, player.y);
          if (d > 90) {
            stand.x = tk.clampX(stand.x + ((player.x - stand.x) / d) * CREEP * dt, 80);
            stand.y = tk.clampY(stand.y + ((player.y - stand.y) / d) * CREEP * dt, 70);
            wheel?.moveTo(stand.x + 26, stand.y - 58);
          }
        }
        if (el >= (wheeled ? RACK_LATE_MS : RACK_MS)) go('hold', time);
      } else if (phase === 'hold' && el >= holdMs) go('burn', time);
      else if (phase === 'burn' && el >= BURN_MS) go('rest', time);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // A slipped wheel: walk in under the lens and take it up.
      if (slipped) return { x: stand.x + 20, y: stand.y + 10 };
      // Otherwise keep well off the ring's radius, at a duelling distance from you.
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = tk.clampX(player.x + Math.cos(a) * 250, 60), y = tk.clampY(player.y + Math.sin(a) * 210, 50);
        const off = Math.abs(dist(x, y, stand.x, stand.y) - R);
        let s = Math.min(off, 160) - dist(x, y, npc.x, npc.y) * 0.3;
        if (phase === 'hold' && off < BAND + 50) s -= 300;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Old burns: rings of scorch on the marble, cooling.
      for (const s of scorches) {
        const k = clamp(1 - (time - s.at) / 5000, 0, 1);
        if (k <= 0) continue;
        g.lineStyle(BAND * 1.4, SCORCH, 0.22 * k); g.strokeCircle(s.x, s.y, s.r);
        g.lineStyle(2, SCORCH_DARK, 0.4 * k); g.strokeCircle(s.x, s.y, s.r - BAND * 0.5);
      }
      // The blind spot under the lens, ringed in brass: the one place the ring cannot be racked to.
      g.fillStyle(0x000000, 0.08); g.fillCircle(stand.x, stand.y, SAFE_R);
      g.lineStyle(2, BRASS_DARK, 0.5); g.strokeCircle(stand.x, stand.y, SAFE_R);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.lineStyle(1, BRASS, 0.6);
        g.lineBetween(stand.x + Math.cos(a) * (SAFE_R - 6), stand.y + Math.sin(a) * (SAFE_R - 6), stand.x + Math.cos(a) * SAFE_R, stand.y + Math.sin(a) * SAFE_R);
      }
      // The ring of light.
      const el = time - phaseAt;
      const col = slipped ? 0xbfe8ff : BEAM;
      if (phase === 'rack') {
        g.lineStyle(BAND * 2, col, 0.07); g.strokeCircle(stand.x, stand.y, R);
        g.lineStyle(1.5, col, 0.5); g.strokeCircle(stand.x, stand.y, R - BAND); g.strokeCircle(stand.x, stand.y, R + BAND);
        // Chevrons sliding the way it is being racked.
        const m = mark();
        const want = alive(m) ? dist(m.x, m.y, stand.x, stand.y) : R;
        const dir = Math.sign(want - R);
        if (dir !== 0) for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 3000;
          const r0 = R + dir * 6, r1 = R + dir * 16;
          g.lineStyle(2, col, 0.5);
          g.lineBetween(stand.x + Math.cos(a - 0.04) * r0, stand.y + Math.sin(a - 0.04) * r0, stand.x + Math.cos(a) * r1, stand.y + Math.sin(a) * r1);
          g.lineBetween(stand.x + Math.cos(a + 0.04) * r0, stand.y + Math.sin(a + 0.04) * r0, stand.x + Math.cos(a) * r1, stand.y + Math.sin(a) * r1);
        }
      } else if (phase === 'hold') {
        const k = clamp(el / holdMs, 0, 1);
        g.lineStyle(BAND * 2, col, 0.1 + k * 0.25); g.strokeCircle(stand.x, stand.y, R);
        g.lineStyle(2, k > 0.7 ? 0xffffff : GOLD_LIT, 0.5 + k * 0.5);
        g.strokeCircle(stand.x, stand.y, R - BAND); g.strokeCircle(stand.x, stand.y, R + BAND);
        // A crawling seam of white closing round the ring as the focus sharpens.
        g.lineStyle(4, 0xffffff, 0.8);
        g.beginPath(); g.arc(stand.x, stand.y, R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      } else if (phase === 'burn') {
        const k = clamp(el / BURN_MS, 0, 1);
        g.lineStyle(BAND * 2 + 12, BEAM_HOT, 0.7 * (1 - k)); g.strokeCircle(stand.x, stand.y, R);
        g.lineStyle(BAND, 0xffffff, 1 - k); g.strokeCircle(stand.x, stand.y, R);
      }
    },

    drawAir(g, time) {
      drawRingLens(g, stand.x, stand.y, R, phase, time, slipped, wheelSpin);
    },

    drawHud(g) {
      // The handwheel and a focus gauge: where the ring is set between its nearest and farthest.
      const x0 = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, 196, 40, 8);
      g.lineStyle(2, slipped ? 0x9fd8ff : BRASS, 1); g.strokeCircle(x0 + 4, y, 11);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + wheelSpin * 3;
        g.lineBetween(x0 + 4, y, x0 + 4 + Math.cos(a) * 11, y + Math.sin(a) * 11);
      }
      const gx = x0 + 26, gw = 140;
      g.fillStyle(IRON_DARK, 1); g.fillRect(gx, y - 4, gw, 8);
      const k = (R - R_MIN) / (R_MAX - R_MIN);
      const ph = phase === 'hold' ? clamp((tk.now - phaseAt) / holdMs, 0, 1) : 0;
      g.fillStyle(ph > 0.7 ? 0xffffff : phase === 'hold' ? GOLD_LIT : BRASS, 1); g.fillRect(gx, y - 3, gw * k, 6);
      g.fillStyle(0xffffff, 1); g.fillTriangle(gx + gw * k - 4, y - 10, gx + gw * k + 4, y - 10, gx + gw * k, y - 4);
      // Where your own distance sits on the same gauge.
      const pd = (clamp(dist(player.x, player.y, stand.x, stand.y), R_MIN, R_MAX) - R_MIN) / (R_MAX - R_MIN);
      g.fillStyle(0x9fd8ff, 1); g.fillTriangle(gx + gw * pd - 4, y + 10, gx + gw * pd + 4, y + 10, gx + gw * pd, y + 4);
    },

    destroy() { wheel?.remove(); },
  };
}

/**
 * The ring-lens on its tripod: three riveted iron legs, a brass collar and handwheel, and on top
 * the lens itself — a tilted disc of stepped glass rings throwing a cone of light down to the ring.
 */
function drawRingLens(g: G, x: number, y: number, R: number, phase: Phase, time: number, slipped: boolean, spin: number): void {
  const ly = y - 92;
  // The cone of light from the lens rim down to the ring on the ground (a thin translucent skirt).
  const a = phase === 'hold' ? 0.08 : phase === 'burn' ? 0.16 : 0.035;
  g.fillStyle(SUN, a);
  g.fillTriangle(x - 34, ly, x + 34, ly, x - R, y);
  g.fillTriangle(x - 34, ly, x + 34, ly, x + R, y);
  g.fillStyle(SUN, a * 0.6); g.fillTriangle(x - 34, ly, x + 34, ly, x, y + Math.min(R, 200) * 0.4);
  noonShadow(g, x, y, 60, 0.28);
  // Legs.
  for (const [fx, fy] of [[-38, 6], [38, 6], [0, -14]] as [number, number][]) {
    g.lineStyle(6, IRON_DARK, 1); g.lineBetween(x + fx, y + fy, x, ly + 26);
    g.lineStyle(3, IRON, 1); g.lineBetween(x + fx, y + fy, x, ly + 26);
    g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(x + fx - 1, y + fy - 1, x - 1, ly + 25);
    g.fillStyle(IRON_DARK, 1); g.fillEllipse(x + fx, y + fy, 12, 5);
    for (let k = 0.3; k < 0.9; k += 0.3) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x + fx * (1 - k), y + fy + (ly + 26 - y - fy) * k, 1.4); }
  }
  // Collar and column.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7, ly + 6, 14, 26);
  g.fillStyle(BRASS, 1); g.fillRect(x - 5, ly + 6, 10, 26);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 9, ly + 24, 18, 5);
  // The handwheel on its arm.
  const wx = x + 26, wy = y - 58;
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x + 4, ly + 28, wx, wy);
  const wob = slipped ? Math.sin(time / 30) * 0.4 : 0;
  g.lineStyle(3, slipped ? 0x9fd8ff : BRASS, 1); g.strokeCircle(wx, wy, 13);
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * Math.PI * 2 + time / 1000 * spin * 6 + wob;
    g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(wx, wy, wx + Math.cos(t) * 12, wy + Math.sin(t) * 12);
  }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(wx, wy, 3);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(wx + Math.cos(time / 300) * 13, wy + Math.sin(time / 300) * 13, 2.5);
  // The lens: stepped glass rings in a brass bezel, tilted toward the square.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, ly + 3, 76, 26);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, ly, 76, 26);
  for (let i = 0; i < 5; i++) {
    const w = 66 - i * 12, h = 22 - i * 4;
    g.fillStyle(i % 2 ? GLASS : GLASS_LIT, 0.95); g.fillEllipse(x, ly - i * 0.8, w, h);
    g.lineStyle(1, GLASS_EDGE, 0.8); g.strokeEllipse(x, ly - i * 0.8, w, h);
  }
  const heat = phase === 'hold' ? 0.7 : phase === 'burn' ? 1 : 0.25;
  glow(g, x, ly, 40 + heat * 20, lit(BEAM, 0.3), 0.06 + heat * 0.06, 4);
  glint(g, x - 14, ly - 4, 9 + heat * 10 + Math.sin(time / 120) * 2, 0.9);
}

export const FALLEN_FOCUS: GimmickDef = {
  id: ID,
  rules: 'A ring-lens racks a burning ring to your distance from its stand, then whitens it. Step off it. Strike the handwheel to rack it onto her instead.',
  make,
};
