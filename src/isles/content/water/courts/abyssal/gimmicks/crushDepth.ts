import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { ABY, alive, bubbleStream, clamp, makeClock } from '../palette';

/**
 * Crush Depth — Diver Holloway.
 *
 * The arena is a dive: four bands of depth from the shallows at the top wall to the black at
 * the bottom. The deeper the band you stand in, the harder your blows land — a hit thrown from
 * the deepest band is half again as heavy — but each of you carries a pressure gauge, and the
 * deeper you stand the faster it climbs. The shallows bleed it off. Let your gauge hit the red
 * and you are *crushed*: the water closes on you all at once, it hurts, and you are left sluggish
 * while your ears ring.
 *
 * Holloway's suit takes the pressure better than your skin (his gauge climbs slower). He dives,
 * hits, and comes up to breathe. The clever play is to make him stay down: fight him in the
 * deep when his needle is already high, and he has to choose between his gauge and you. On
 * hard, the thermocline turns every so often and the deep is suddenly overhead.
 */

const BANDS = 4;
/** Damage multiplier on blows thrown from each band, shallow → deep. */
const HIT_MULT = [0.85, 1.0, 1.22, 1.5];
/** Gauge change per second in each band (negative breathes it off). */
const PRESSURE_RATE = [-34, 3, 15, 27];

interface Gauge { v: number; crushedAt: number; flashAt: number }

export const crushDepthGimmick: GimmickDef = {
  id: 'abyssal-crush',
  rules: 'Deeper bands hit harder — and fill your pressure gauge faster. Fill it and you are crushed. The shallows let you breathe.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const tick = makeClock();
    const bandH = (H - top) / BANDS;
    const crushDmg = hard ? 22 : 18;
    const DAZE_MS = 1500;
    const SUIT = 0.62;
    const TURN_EVERY = 17000;
    const TURN_MS = 2200;

    const gauges = new Map<Fighter, Gauge>([
      [ctx.player, { v: 0, crushedAt: -99999, flashAt: 0 }],
      [ctx.npc, { v: 0, crushedAt: -99999, flashAt: 0 }],
    ]);
    let inverted = false;
    let turnAt = -1;
    let turningUntil = 0;
    let flipAt = 0;
    let now = 0;

    /** Which band (0 shallow … 3 deep) a y lies in, honouring the thermocline. */
    const bandAt = (y: number): number => {
      const raw = clamp(Math.floor((y - top) / bandH), 0, BANDS - 1);
      return inverted ? BANDS - 1 - raw : raw;
    };
    /** Screen y-centre of a given depth band. */
    const bandY = (b: number): number => top + bandH * ((inverted ? BANDS - 1 - b : b) + 0.5);
    const dazed = (f: Fighter): boolean => now - (gauges.get(f)?.crushedAt ?? -99999) < DAZE_MS;

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (turnAt < 0) turnAt = time + TURN_EVERY;
        if (hard && time >= turnAt) {
          turnAt = time + TURN_EVERY;
          turningUntil = time + TURN_MS;
          ctx.banner('THE THERMOCLINE TURNS', '#9fe4ff');
          ctx.sfx('time-warp');
          flipAt = time + TURN_MS * 0.5;
        }
        if (flipAt && time >= flipAt) { flipAt = 0; inverted = !inverted; }
        for (const [f, gg] of gauges) {
          if (!alive(f)) continue;
          const b = bandAt(f.y);
          let rate = PRESSURE_RATE[b];
          if (f === ctx.npc && rate > 0) rate *= SUIT;
          gg.v = clamp(gg.v + rate * dt, 0, 100);
          if (gg.v >= 100) {
            gg.v = 34;
            gg.crushedAt = time;
            ctx.hit(f, crushDmg, f.x, f.y);
            ctx.sfx('gravity-slam');
            ctx.float(f.x, f.y - 50, 'CRUSHED', '#bfe8ff');
            ctx.flash(f.x, f.y, ABY.membrane);
          } else if (gg.v > 80 && time - gg.flashAt > 900 && rate > 0) {
            gg.flashAt = time;
            ctx.float(f.x, f.y - 46, 'pressure!', '#ff9a9a');
            if (f === ctx.player) ctx.sfx('clock-tick');
          }
        }
      },

      npcTakenMult: () => HIT_MULT[bandAt(ctx.player.y)],
      playerTakenMult: () => HIT_MULT[bandAt(ctx.npc.y)],
      playerSpeedMult: () => (dazed(ctx.player) ? 0.55 : 1),
      npcSpeedMult: () => (dazed(ctx.npc) ? 0.55 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const v = gauges.get(n)?.v ?? 0;
        const b = bandAt(n.y);
        const p = ctx.player;
        // Come up to breathe when the needle is high.
        if (v > 76) return { x: clamp(n.x + (n.x < W / 2 ? 40 : -40), 70, W - 70), y: bandY(0) };
        // Dive to hit hard when the gauge has room — on the player's side of the room.
        if (v < 52 && b < 2) return { x: clamp((n.x + p.x) / 2, 70, W - 70), y: bandY(3) };
        return null;
      },

      drawGround(g, time) {
        for (let b = 0; b < BANDS; b++) {
          const y0 = top + bandH * b;
          const depth = inverted ? BANDS - 1 - b : b;
          // Each band one shade nearer the abyss.
          g.fillStyle(mixC(0x1f4a66, ABY.abyss, depth / (BANDS - 1)), 0.42 + depth * 0.1);
          g.fillRect(0, y0, W, bandH);
          // Its boundary: a thermal shimmer line.
          if (b > 0) {
            g.lineStyle(2, ABY.membraneDim, 0.5);
            g.beginPath(); g.moveTo(0, y0);
            for (let x = 0; x <= W; x += 24) g.lineTo(x, y0 + Math.sin(x / 40 + time / 600 + b) * 3);
            g.strokePath();
          }
          // The pressure itself, drawn as compression bars that squeeze tighter with depth.
          const gap = 60 - depth * 14;
          g.lineStyle(1, ABY.membrane, 0.05 + depth * 0.04);
          for (let x = (time / (40 + depth * 30)) % gap; x < W; x += gap) g.lineBetween(x, y0 + 8, x, y0 + bandH - 8);
          // The depth ladder on the left wall: one rung per band of depth, labelled in pips.
          g.fillStyle(ABY.brass, 0.85);
          for (let k = 0; k <= depth; k++) g.fillCircle(22, y0 + 18 + k * 9, 3);
          g.fillStyle(ABY.brassDark, 1); g.fillRect(10, y0 + 2, 4, bandH - 4);
          // The right wall reads it as a damage multiplier — chevrons, more of them deeper.
          for (let k = 0; k < depth; k++) {
            const cx = W - 22, cy = y0 + bandH / 2 - (depth - 1) * 6 + k * 12;
            g.lineStyle(2.5, ABY.coralRose, 0.7);
            g.lineBetween(cx - 7, cy + 4, cx, cy - 3); g.lineBetween(cx + 7, cy + 4, cx, cy - 3);
          }
        }
        // Bubbles rise fastest up through the shallows.
        for (let i = 0; i < 8; i++) {
          const x = 80 + i * ((W - 160) / 7);
          bubbleStream(g, x, H - 10, H - top, time / 1000, i, 4, 0.35);
        }
        if (time < turningUntil) {
          const k = 1 - (turningUntil - time) / TURN_MS;
          g.fillStyle(ABY.membrane, 0.18 * Math.sin(k * Math.PI)); g.fillRect(0, top, W, H - top);
        }
      },

      drawAir(g, time) {
        for (const [f, gg] of gauges) {
          if (!alive(f)) continue;
          // A crushing implosion: a ring of water collapsing onto them, rivets flying.
          const since = time - gg.crushedAt;
          if (since >= 0 && since < 600) {
            const k = since / 600;
            g.lineStyle(6 * (1 - k), ABY.membrane, 0.9 * (1 - k)); g.strokeCircle(f.x, f.y, 70 * (1 - k) + 12);
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + 0.3;
              g.fillStyle(ABY.brass, 1 - k); g.fillCircle(f.x + Math.cos(a) * 40 * k, f.y + Math.sin(a) * 40 * k, 2);
            }
          }
          if (dazed(f)) {
            // Ringing ears: little stars of pressure orbiting.
            for (let i = 0; i < 3; i++) {
              const a = time / 180 + i * 2.1;
              g.fillStyle(ABY.membrane, 0.8); g.fillCircle(f.x + Math.cos(a) * 18, f.y - 34 + Math.sin(a) * 5, 2.4);
            }
          }
          // Over-pressure: the body starts to bow inward when the needle is high.
          if (gg.v > 70) {
            const k = (gg.v - 70) / 30;
            g.lineStyle(2, 0xff9a9a, 0.25 + k * 0.5 + Math.sin(time / 70) * 0.15);
            g.strokeCircle(f.x, f.y, 30 - k * 6);
          }
        }
      },

      drawHud(g) {
        // Two brass pressure dials under the HUD strip: yours on the left, Holloway's on the right.
        const dial = (x: number, f: Fighter): void => {
          const v = gauges.get(f)?.v ?? 0;
          const y = top + 26;
          g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 22);
          g.fillStyle(ABY.brassDark, 1); g.fillCircle(x, y, 19);
          g.fillStyle(0xe8e0c8, 1); g.fillCircle(x, y, 16);
          // Red sector at the top of the dial.
          g.lineStyle(4, 0xc8283c, 0.85);
          g.beginPath(); g.arc(x, y, 12, Math.PI * 1.75, Math.PI * 2.25, false); g.strokePath();
          // Ticks.
          g.lineStyle(1, ABY.tar, 1);
          for (let i = 0; i <= 8; i++) {
            const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
            g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * 15, y + Math.sin(a) * 15);
          }
          const a = Math.PI * 0.75 + (v / 100) * Math.PI * 1.5;
          g.lineStyle(2, v > 80 ? 0xc8283c : ABY.tar, 1); g.lineBetween(x, y, x + Math.cos(a) * 13, y + Math.sin(a) * 13);
          g.fillStyle(ABY.brass, 1); g.fillCircle(x, y, 2.5);
        };
        dial(W / 2 - 60, ctx.player);
        dial(W / 2 + 60, ctx.npc);
      },

      destroy() { gauges.clear(); },
    };
  },
};
