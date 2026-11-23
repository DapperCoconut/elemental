import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CRUDE, CRUDE_AMBER, CRUDE_LIT, GILT, GILT_DARK, LAMP_LIT, SAFETY_RED, SAFETY_WHITE, STEEL_DARK, TIMBER,
  TIMBER_DARK, TIMBER_LIT, clamp, dist, frameClock, noise, segDist, sheenAt, slick,
} from '../util';

/**
 * Under the Slick — in the star's telling, Fenwick Reed never retired. He is the crown's diver:
 * the man who went down after the households that would not pay and brought back their deeds.
 * His brass helmet is fed by a hand-pump on the quay, and his air hose trails across the floor to
 * wherever he is.
 *
 * Every few seconds he seals the helmet and **goes under the slick** — nothing can touch him
 * while he swims beneath the crude, following you; his hose and his bubbles show where. A ring of
 * boiling bubbles marks where he will come up, and he surfaces there with a grab that holds you.
 *
 * The turn the player can make: **the pump**. Strike it while he is under and the air stops — he
 * is dragged up gasping, stunned, and the deep takes its toll on him. At half health the line goes
 * taut: while he swims the hose snaps straight from pump to helmet and lashes whoever it crosses.
 */

const ID = fallenId('slickharbor', 'under-the-slick');
const WARN_MS = 700;
const UNDER_MS = 2700;
const RISE_MS = 850;
const BURST_R = 72;

type DiveState = 'up' | 'warn' | 'under' | 'rising' | 'winded';

function makeDiver(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const cy = (top + H) / 2;
  const pump: Pt = { x: 66, y: cy + 10 };
  const grabDmg = 13;
  const cutDmg = 14;
  const lashDmg = 7;
  let state: DiveState = 'up';
  let stateAt = ctx.scene.time.now;
  let nextDive = stateAt + 3200;
  let spot: Pt = { x: 0, y: 0 };
  let taut = false;
  let lashed = false;
  let cutHitAt = 0;
  let air = 1;
  const wake: { x: number; y: number; at: number }[] = [];

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const isUnder = (): boolean => state === 'under' || state === 'rising';
  const go = (s: DiveState, time: number): void => { state = s; stateAt = time; };

  const pumpTarget: StrikeTarget = ctx.target({
    x: pump.x, y: pump.y - 20, r: 28,
    onStruck(by) {
      if (by !== 'player' || !isUnder()) return;
      const time = ctx.scene.time.now;
      const N = ctx.npc;
      go('winded', time);
      ctx.stun(N, 1500);
      cutHitAt = time + 320; // the last of the airborne window lapses first
      ctx.banner('AIR CUT — he comes up choking', '#8fe6ff');
      ctx.float(N.x, N.y - 50, 'NO AIR!', '#8fe6ff');
      ctx.sfx('snap-back');
      ctx.flash(N.x, N.y, CRUDE_AMBER);
    },
  });

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const P = ctx.player, N = ctx.npc;
      if (!taut && N.hp < N.maxHp * 0.5) {
        taut = true;
        ctx.banner('THE LINE GOES TAUT — mind the hose', '#ffc860');
        ctx.sfx('whip');
      }
      if (cutHitAt && time >= cutHitAt) { cutHitAt = 0; ctx.hit(N, cutDmg, N.x, N.y); }
      const el = time - stateAt;

      if (state === 'up' && time >= nextDive && alive(N) && alive(P)) { go('warn', time); ctx.sfx('bubble'); }
      else if (state === 'warn' && el >= WARN_MS) {
        go('under', time); lashed = false; ctx.sfx('splash');
      } else if (state === 'under') {
        ctx.airborne(N, 260); ctx.silence(N, 260);
        if (time - (wake[wake.length - 1]?.at ?? 0) > 90) wake.push({ x: N.x, y: N.y, at: time });
        if (el >= UNDER_MS - RISE_MS) {
          go('rising', time);
          spot = { x: N.x, y: N.y };
          ctx.root(N, RISE_MS);
          ctx.sfx('bubble');
        }
      } else if (state === 'rising') {
        ctx.airborne(N, 200);
        if (el >= RISE_MS) {
          go('winded', time);
          ctx.sfx('splash'); ctx.flash(spot.x, spot.y, CRUDE_AMBER);
          if (alive(P) && dist(P.x, P.y, spot.x, spot.y) < BURST_R) {
            ctx.hit(P, grabDmg, P.x, P.y);
            ctx.root(P, 550);
            ctx.float(P.x, P.y - 44, 'GRABBED', '#ffc860');
          }
        }
      } else if (state === 'winded' && el >= 1600) {
        go('up', time);
        nextDive = time + (taut ? 3000 : 4200);
      }

      // The taut hose lashes across whoever stands on its line while he swims.
      if (taut && isUnder() && !lashed && alive(P) && segDist(P.x, P.y, pump.x, pump.y - 8, N.x, N.y) < 16) {
        lashed = true;
        ctx.hit(P, lashDmg, P.x, P.y);
        ctx.sfx('whip');
      }
      // His air: draining under the slick, refilling on top.
      air = clamp(air + (isUnder() ? -dt / (UNDER_MS / 1000) : dt * 0.8), 0, 1);
      while (wake.length && time - wake[0].at > 1400) wake.shift();
    },

    npcTakenMult() { return state === 'winded' ? 1.35 : 1; },

    npcSeek(): Pt | null {
      const P = ctx.player, N = ctx.npc;
      if (state === 'under' || state === 'warn') return { x: P.x, y: P.y };
      if (state === 'rising') return null;
      // On top, he minds his pump: stand between it and a player who goes near it.
      if (dist(P.x, P.y, pump.x, pump.y) < 170) {
        const a = Math.atan2(P.y - pump.y, P.x - pump.x);
        return { x: clamp(pump.x + Math.cos(a) * 70, 60, W - 60), y: clamp(pump.y + Math.sin(a) * 70, top + 40, H - 40) };
      }
      return dist(N.x, N.y, pump.x, pump.y) > 560 ? { x: (N.x + pump.x) / 2, y: N.y } : null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The quay's soaked boards round the pump, and a skin of crude over the rest of the berth.
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, top, 128, H - top);
      for (let y = top; y < H; y += 18) {
        g.fillStyle(noise(y * 0.3) > 0.5 ? TIMBER : TIMBER_LIT, 0.85); g.fillRect(2, y + 1, 122, 15);
      }
      for (let i = 0; i < 7; i++) {
        slick(g, 220 + noise(i * 3.1) * (W - 300), top + 60 + noise(i * 5.7) * (H - top - 110), 60 + noise(i) * 40, 26 + noise(i + 2) * 16, i * 1.3, ts * 0.3 + i, 0.6);
      }
      // His wake: rings spreading where he passed under.
      for (const w of wake) {
        const k = (time - w.at) / 1400;
        g.lineStyle(2, sheenAt(ts + w.x * 0.01), 0.5 * (1 - k)); g.strokeEllipse(w.x, w.y, 20 + k * 50, 8 + k * 20);
      }
      // The hose — slack and sagging, or snapped straight when the line is taut.
      drawHose(g, ts);
      // Where he will come up: a boiling ring tightening on the spot.
      if (state === 'rising') {
        const c = clamp((time - stateAt) / RISE_MS, 0, 1);
        g.fillStyle(CRUDE, 0.5); g.fillCircle(spot.x, spot.y, BURST_R);
        g.lineStyle(3, SAFETY_RED, 0.5 + c * 0.5); g.strokeCircle(spot.x, spot.y, BURST_R);
        g.lineStyle(2, LAMP_LIT, 0.6); g.strokeCircle(spot.x, spot.y, BURST_R * (1 - c) + 6);
        for (let i = 0; i < 14; i++) {
          const a = noise(i * 2.3) * Math.PI * 2, r = noise(i * 4.1) * BURST_R * 0.85;
          const ph = (ts * 2.4 + noise(i)) % 1;
          g.lineStyle(1.4, CRUDE_AMBER, 0.8 * (1 - ph)); g.strokeCircle(spot.x + Math.cos(a) * r, spot.y + Math.sin(a) * r * 0.7, 2 + ph * 7);
        }
      }
      drawPump(g, ts);
    },

    drawAir(g, time) {
      const ts = time / 1000;
      const N = ctx.npc;
      if (!alive(N)) return;
      if (state === 'warn') {
        // Sealing up: bubbles round his collar, the faceplate clanged shut.
        for (let i = 0; i < 6; i++) {
          const ph = (ts * 2 + i / 6) % 1;
          g.lineStyle(1.2, SAFETY_WHITE, 0.7 * (1 - ph)); g.strokeCircle(N.x + Math.sin(i * 2 + ts * 3) * 14, N.y - 20 - ph * 40, 2 + ph * 3);
        }
      }
      if (isUnder()) {
        // The crude closed over him: a heaving dome, only the crown of the brass helmet showing.
        const heave = Math.sin(ts * 5) * 3;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(N.x, N.y + 6, 80, 24);
        g.fillStyle(CRUDE, 0.97); g.fillEllipse(N.x, N.y - 14 + heave, 66, 64);
        g.fillStyle(CRUDE_LIT, 0.6); g.fillEllipse(N.x - 8, N.y - 28 + heave, 34, 18);
        for (let k = 0; k < 3; k++) { g.lineStyle(2, sheenAt(ts * 0.8 + k), 0.4); g.strokeEllipse(N.x, N.y - 10 + heave, 60 - k * 12, 50 - k * 12); }
        g.fillStyle(GILT_DARK, 1); g.fillEllipse(N.x, N.y - 40 + heave, 22, 10);
        g.fillStyle(GILT, 1); g.fillEllipse(N.x - 2, N.y - 42 + heave, 14, 5);
        for (let i = 0; i < 4; i++) {
          const ph = (ts * 1.6 + i / 4) % 1;
          g.lineStyle(1.3, LAMP_LIT, 0.7 * (1 - ph)); g.strokeCircle(N.x + (noise(i) - 0.5) * 20, N.y - 44 - ph * 34 + heave, 2 + ph * 4);
        }
      }
    },

    drawHud(g) {
      // His air, on a brass helmet-gauge: full green on top, falling to red as he swims.
      const x = W - 70, y = top + 40, r = 26;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, r + 6);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y, r + 4);
      g.fillStyle(SAFETY_WHITE, 1); g.fillCircle(x, y, r);
      g.lineStyle(4, SAFETY_RED, 0.9); g.beginPath(); g.arc(x, y, r - 5, Math.PI * 0.75, Math.PI * 1.15, false); g.strokePath();
      g.lineStyle(4, 0x4aa86a, 0.9); g.beginPath(); g.arc(x, y, r - 5, Math.PI * 1.85, Math.PI * 2.25, false); g.strokePath();
      const na = Math.PI * 0.75 + air * Math.PI * 1.5;
      g.lineStyle(2.5, STEEL_DARK, 1); g.lineBetween(x, y, x + Math.cos(na) * (r - 4), y + Math.sin(na) * (r - 4));
      g.fillStyle(GILT, 1); g.fillCircle(x, y, 3.5);
      if (isUnder()) { g.lineStyle(2, SAFETY_RED, 0.6 + 0.4 * Math.sin(ctx.scene.time.now / 90)); g.strokeCircle(x, y, r + 7); }
    },

    destroy() { pumpTarget.remove(); wake.length = 0; },
  };

  /** The rubber air hose with brass couplings, from the pump's outlet to his helmet. */
  function drawHose(g: G, ts: number): void {
    const N = ctx.npc;
    const ax = pump.x + 22, ay = pump.y - 20, bx = N.x, by = N.y - 26;
    const straight = taut && isUnder();
    const sag = straight ? 0 : 40 + Math.sin(ts * 1.3) * 6;
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t + Math.sin(t * Math.PI) * sag + (straight ? Math.sin(ts * 40 + t * 20) * 1.5 : 0) });
    }
    if (straight) {
      g.lineStyle(14, SAFETY_RED, 0.18 + 0.1 * Math.sin(ts * 12));
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    }
    g.lineStyle(7, 0x1a1210, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(3, 0x4a3a2a, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1); for (const p of pts) g.lineTo(p.x, p.y - 1); g.strokePath();
    for (let i = 4; i < 24; i += 5) { g.fillStyle(GILT, 1); g.fillRect(pts[i].x - 3, pts[i].y - 4, 6, 8); }
  }

  /** The two-wheel hand pump in its sea-chest, cranks turning faster while he's down. */
  function drawPump(g: G, ts: number): void {
    const { x, y } = pump;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4, 92, 22);
    g.fillStyle(0x2a1e14, 1); g.fillRect(x - 38, y - 42, 76, 44);
    g.fillStyle(0x5a3e26, 1); g.fillRect(x - 35, y - 39, 70, 38);
    g.lineStyle(2, GILT_DARK, 1); g.strokeRect(x - 35, y - 39, 70, 38);
    g.fillStyle(GILT, 1); g.fillRect(x - 6, y - 50, 12, 10);
    const spin = ts * (isUnder() ? 9 : 2.2);
    for (const sx of [-40, 40]) {
      const wx = x + sx, wy = y - 26;
      g.fillStyle(STEEL_DARK, 1); g.fillCircle(wx, wy, 17);
      g.lineStyle(2, 0x3a3e44, 1); g.strokeCircle(wx, wy, 14);
      for (let k = 0; k < 6; k++) { const a = spin + (k / 6) * Math.PI * 2; g.lineBetween(wx, wy, wx + Math.cos(a) * 14, wy + Math.sin(a) * 14); }
      const hx = wx + Math.cos(spin) * 14, hy = wy + Math.sin(spin) * 14;
      g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(hx, hy, hx + (sx < 0 ? -8 : 8), hy - 4);
    }
    // The gauge on the chest's face, and a red "AIR" stencil.
    g.fillStyle(SAFETY_WHITE, 1); g.fillCircle(x, y - 22, 9);
    g.lineStyle(1.5, SAFETY_RED, 1); g.lineBetween(x, y - 22, x + Math.cos(-2.2 + air * 2.4) * 7, y - 22 + Math.sin(-2.2 + air * 2.4) * 7);
    g.fillStyle(SAFETY_RED, 0.85); g.fillRect(x - 16, y - 9, 32, 5);
  }
}

export const FALLEN_UNDER_THE_SLICK: GimmickDef = {
  id: ID,
  rules: 'Reed dives under the slick where nothing can hit him and comes up at the bubbling ring. Strike his air pump while he is under to drag him up.',
  make: makeDiver,
};
