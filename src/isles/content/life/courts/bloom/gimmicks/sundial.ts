import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { gnomon } from '../art';
import { BRASS, BRASS_LIT, LAWN, LAWN_LIT, STONE, STONE_DARK, STONE_LIT, SUN } from '../palette';
import { alive, clamp, dist, segDist, wrapAngle } from '../util';

/**
 * Sundial — Gnomon Hollis.
 *
 * The fight is fought on the Empress's dial. The gnomon's shadow lies across the lawn like the
 * hand of a clock and it never stops turning. Out in the sun your blows land harder; in the
 * shadow you take less. So each fighter chooses, moment to moment, between swinging in the light
 * and standing in the shade — and the shade is always moving away.
 *
 * At every quarter the dial *strikes*: Hollis's burning-glass gathers the sun and a beam fires
 * along the sun's ray, straight out of the gnomon on the bright side, opposite the shadow. The
 * ray is marked a long beat before it fires. The shadow is the one place it can never reach — so
 * the safest place at the stroke is the place where your blows are weakest.
 */

const PERIOD = 16000;
const HALF = 0.3;
const ROOT_HALF = 26;
const SUN_MULT = 1.3;
const SHADE_MULT = 0.6;
const STRIKE_WARN = 1300;
const BEAM_HALF = 30;
const BEAM_DMG = 14;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const R = Math.min(W, H - top) / 2 - 24;
  const period = ctx.hard ? 12000 : PERIOD;
  let t0 = -1;
  /** Strike: when it was warned, and the ray angle it fires along. */
  let strike: { warnAt: number; fireAt: number; a: number; dealt: boolean } | null = null;
  let lastQuarter = 0;
  let beamFx: { at: number; a: number } | null = null;

  const shadowA = (time: number) => -Math.PI / 2 + (((time - t0) / period) % 1) * Math.PI * 2;

  const inShade = (f: Fighter, time: number): boolean => {
    const a = shadowA(time);
    const d = dist(cx, cy, f.x, f.y);
    if (d < 18) return true;
    const da = Math.abs(wrapAngle(Math.atan2(f.y - cy, f.x - cx) - a));
    if (da > Math.PI / 2) return false;
    return da < HALF || d * Math.sin(da) < ROOT_HALF;
  };

  const now = () => ctx.scene.time.now;

  return {
    update(time) {
      if (t0 < 0) { t0 = time; lastQuarter = 0; }
      const q = Math.floor(((time - t0) + STRIKE_WARN) / (period / 4));
      // Warn a beat before each quarter; the ray is where the sun will be at the stroke.
      if (q > lastQuarter && !strike) {
        lastQuarter = q;
        const fireAt = time + STRIKE_WARN;
        strike = { warnAt: time, fireAt, a: shadowA(fireAt) + Math.PI, dealt: false };
        ctx.banner(['XII', 'III', 'VI', 'IX'][q % 4] + ' — THE DIAL STRIKES', '#fff2b0');
        ctx.sfx('clock-tick');
      }
      if (strike && !strike.dealt && time >= strike.fireAt) {
        strike.dealt = true;
        const ex = cx + Math.cos(strike.a) * 1100, ey = cy + Math.sin(strike.a) * 1100;
        for (const f of [player, npc]) {
          if (alive(f) && segDist(f.x, f.y, cx, cy, ex, ey) < BEAM_HALF) {
            ctx.hit(f, BEAM_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 44, 'SUNSTRUCK', '#fff2b0');
          }
        }
        beamFx = { at: time, a: strike.a };
        ctx.sfx('light-beam');
        ctx.flash(cx + Math.cos(strike.a) * 120, cy + Math.sin(strike.a) * 120, SUN);
      }
      if (strike && strike.dealt && time > strike.fireAt + 400) strike = null;
    },

    npcTakenMult: () => {
      const t = now();
      return (alive(player) && !inShade(player, t) ? SUN_MULT : 1) * (inShade(npc, t) ? SHADE_MULT : 1);
    },
    playerTakenMult: () => {
      const t = now();
      return (alive(npc) && !inShade(npc, t) ? SUN_MULT : 1) * (inShade(player, t) ? SHADE_MULT : 1);
    },

    npcSeek() {
      const t = now();
      if (t0 < 0) return null;
      // A stroke coming: into the shade, ahead of the hand so it carries him.
      if (strike && !strike.dealt) {
        const a = shadowA(t) + 0.15;
        return { x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 170 };
      }
      // Otherwise in the sun, beside the hand, and on your side of the dial.
      const a = shadowA(t) + (wrapAngle(Math.atan2(player.y - cy, player.x - cx) - shadowA(t)) > 0 ? 1.1 : -1.1);
      return { x: clamp(cx + Math.cos(a) * 190, 60, W - 60), y: clamp(cy + Math.sin(a) * 190, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (t0 < 0) return;
      // The dial: a lawn disc in a ring of hour-stones.
      g.fillStyle(STONE_DARK, 0.9); g.fillCircle(cx, cy, R + 16);
      g.fillStyle(STONE, 1); g.fillCircle(cx, cy, R + 11);
      g.fillStyle(LAWN_LIT, 1); g.fillCircle(cx, cy, R);
      g.fillStyle(LAWN, 0.6); g.fillCircle(cx, cy, R * 0.66);
      for (let h = 0; h < 12; h++) {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * (R + 5), y = cy + Math.sin(a) * (R + 5);
        g.fillStyle(h % 3 === 0 ? BRASS : STONE_LIT, 1); g.fillCircle(x, y, h % 3 === 0 ? 9 : 6);
        g.lineStyle(1.5, BRASS, 0.5); g.lineBetween(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8, cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
      }
      // The sun's warmth on the bright side, and the shadow hand.
      const a = shadowA(time);
      glow(g, cx - Math.cos(a) * R * 0.5, cy - Math.sin(a) * R * 0.5, R * 0.6, SUN, 0.025, 3);
      const L = 1100;
      const pts = [
        { x: cx + Math.cos(a + Math.PI / 2) * ROOT_HALF, y: cy + Math.sin(a + Math.PI / 2) * ROOT_HALF },
        { x: cx + Math.cos(a + HALF) * L, y: cy + Math.sin(a + HALF) * L },
        { x: cx + Math.cos(a - HALF) * L, y: cy + Math.sin(a - HALF) * L },
        { x: cx + Math.cos(a - Math.PI / 2) * ROOT_HALF, y: cy + Math.sin(a - Math.PI / 2) * ROOT_HALF },
      ];
      g.fillStyle(0x10200c, 0.34);
      g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      g.fillTriangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
      g.lineStyle(2, 0x10200c, 0.5);
      g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y); g.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
      // The stroke's ray, marked and then fired.
      if (strike && !strike.dealt) {
        const k = clamp((time - strike.warnAt) / (strike.fireAt - strike.warnAt), 0, 1);
        const ex = cx + Math.cos(strike.a) * 1100, ey = cy + Math.sin(strike.a) * 1100;
        g.lineStyle(BEAM_HALF * 2, SUN, 0.06 + k * 0.14); g.lineBetween(cx, cy, ex, ey);
        g.lineStyle(2, BRASS_LIT, 0.4 + k * 0.5); g.lineBetween(cx, cy, ex, ey);
        if (k > 0.75 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.6); g.lineBetween(cx, cy, ex, ey); }
      }
      if (beamFx && time - beamFx.at < 450) {
        const k = (time - beamFx.at) / 450;
        const ex = cx + Math.cos(beamFx.a) * 1100, ey = cy + Math.sin(beamFx.a) * 1100;
        g.lineStyle(BEAM_HALF * 2 * (1 - k * 0.5), 0xfff6d0, 0.7 * (1 - k)); g.lineBetween(cx, cy, ex, ey);
        g.lineStyle(10, 0xffffff, 0.9 * (1 - k)); g.lineBetween(cx, cy, ex, ey);
      }
      gnomon(g, cx, cy + 12, 16);
    },

    drawAir(g, time) {
      if (t0 < 0) return;
      // A sun-mote over whoever stands in the light, so the rule reads at a glance.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (inShade(f, time)) { g.lineStyle(2, 0x6a8aa8, 0.6); g.strokeCircle(f.x, f.y + 14, 16); }
        else {
          const tw = 0.6 + Math.sin(time / 120 + f.x) * 0.3;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 900;
            g.lineStyle(1.5, SUN, tw); g.lineBetween(f.x + Math.cos(a) * 14, f.y - 44 + Math.sin(a) * 14, f.x + Math.cos(a) * 19, f.y - 44 + Math.sin(a) * 19);
          }
          g.fillStyle(SUN, tw); g.fillCircle(f.x, f.y - 44, 5);
        }
      }
    },

    drawHud(g, time) {
      if (t0 < 0) return;
      // A little dial in the corner: where the hand is, and when the next stroke falls.
      const x = 40, y = top + 30;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 20);
      g.fillStyle(STONE_LIT, 1); g.fillCircle(x, y, 17);
      const a = shadowA(time);
      g.lineStyle(3, 0x10200c, 1); g.lineBetween(x, y, x + Math.cos(a) * 15, y + Math.sin(a) * 15);
      const qk = (((time - t0) % (period / 4)) / (period / 4));
      g.lineStyle(2, BRASS, 1); g.beginPath(); g.arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + qk * Math.PI * 2, false); g.strokePath();
      g.fillStyle(inShade(player, time) ? 0x6a8aa8 : SUN, 1); g.fillCircle(x + 30, y, 6);
    },
  };
}

export const SUNDIAL: GimmickDef = {
  id: 'bloom-sundial',
  rules: 'The gnomon\'s shadow sweeps the dial and never stops. In the sun you deal +30%; in the shadow you take 40% less. At each quarter a sunbeam fires out of the bright side — the shadow is safe.',
  make,
};
