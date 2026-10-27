import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { HW, alive, clamp, dist, makeClock } from '../palette';

/**
 * Growth Rings — Ringreader Dendro.
 *
 * The floor is the sawn face of a fallen bough: a century of rings round a pith in the middle.
 * The old rings are dark latewood bands, and standing in one drags at you like a dry year.
 * This year's ring is a bright band of new wood that starts at the pith and grows outward to
 * the bark; standing on it hastes you and your blows land a little heavier. When it reaches the
 * bark the year ends — and a new one begins at the pith.
 *
 * Every third year is a drought: Dendro reads it aloud and one old ring swells into a wide
 * black band that drags hard for the whole year. The ring grows slower than you walk, so the
 * play is to ride it — keep pace on the bright band and fight from it while Dendro is caught
 * in the dark. She knows the rings well and rides them herself. On hard, a second ring grows
 * back in from the bark at the same time, so the two bright bands cross mid-year.
 */

/** Radii of the old dark rings, and their half-widths. */
const OLD: { r: number; half: number }[] = [
  { r: 70, half: 10 }, { r: 128, half: 13 }, { r: 182, half: 9 }, { r: 236, half: 15 },
  { r: 294, half: 11 }, { r: 352, half: 14 }, { r: 410, half: 10 }, { r: 470, half: 16 },
];

export const growthRingsGimmick: GimmickDef = {
  id: 'heartwood-growth-rings',
  rules: 'Ride this year\'s bright ring out from the pith: haste and heavier blows. The dark old rings drag. Droughts swell one.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const cx = W / 2, cy = (top + H) / 2 + 10;
    const MAX_R = Math.hypot(W / 2, (H - top) / 2) + 20;
    const YEAR_S = hard ? 7.5 : 8.5;
    const BRIGHT_HALF = 30;
    const HASTE = 1.4;
    const DRAG = 0.68;
    const DROUGHT_DRAG = 0.5;

    let year = 37 + Math.floor(rng() * 20);
    let yearK = 0;
    let drought = -1;
    let droughtHalf = 0;
    let lastBanner = 0;
    let now = 0;

    const brightRadii = (): number[] => {
      const r = 20 + yearK * (MAX_R - 20);
      return hard ? [r, MAX_R - yearK * (MAX_R - 20)] : [r];
    };
    const radius = (f: Fighter): number => dist(f.x, f.y, cx, cy);
    const onBright = (f: Fighter): boolean => brightRadii().some((r) => Math.abs(radius(f) - r) < BRIGHT_HALF);
    const ringDrag = (f: Fighter): number => {
      const d = radius(f);
      let m = 1;
      OLD.forEach((o, i) => {
        const half = i === drought ? droughtHalf : o.half;
        if (Math.abs(d - o.r) < half + 6) m = Math.min(m, i === drought ? DROUGHT_DRAG : DRAG);
      });
      return m;
    };
    const speed = (f: Fighter): number => (alive(f) ? (onBright(f) ? HASTE : ringDrag(f)) : 1);

    const newYear = (): void => {
      year++;
      yearK = 0;
      if (year % 3 === 0) {
        drought = 1 + Math.floor(rng() * (OLD.length - 2));
        droughtHalf = OLD[drought].half;
        ctx.banner(`THE DROUGHT OF '${year % 100}`, '#c9642b');
        ctx.sfx('time-warp');
      } else {
        drought = -1;
        ctx.sfx('clock-tick');
        if (now - lastBanner > 9000) { lastBanner = now; ctx.float(cx, cy - 30, `YEAR ${year}`, '#ffd76e'); }
      }
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        yearK += dt / YEAR_S;
        if (yearK >= 1) newYear();
        if (drought >= 0) droughtHalf = Math.min(42, droughtHalf + dt * 30);
      },

      playerSpeedMult: () => speed(ctx.player),
      npcSpeedMult: () => speed(ctx.npc),
      // New wood hits harder: whoever stands on the bright ring lands 15% heavier blows.
      npcTakenMult: () => (alive(ctx.player) && onBright(ctx.player) ? 1.15 : 1),
      playerTakenMult: () => (alive(ctx.npc) && onBright(ctx.npc) ? 1.15 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Ride the nearest bright ring a little ahead of its growth, on the player's side of the pith.
        const radii = brightRadii();
        const d = radius(n);
        let target = radii[0];
        for (const r of radii) if (Math.abs(r - d) < Math.abs(target - d)) target = r;
        const lead = hard ? 0 : 18;
        const r = clamp(target + lead, 20, MAX_R);
        if (r > Math.min(W / 2, (H - top) / 2) + 40 && radii.length === 1) return null;
        const pa = Math.atan2(p.y - cy, p.x - cx);
        const na = Math.atan2(n.y - cy, n.x - cx);
        const a = na + clamp(Math.atan2(Math.sin(pa - na), Math.cos(pa - na)), -0.5, 0.5);
        return { x: clamp(cx + Math.cos(a) * r, 60, W - 60), y: clamp(cy + Math.sin(a) * r, top + 50, H - 50) };
      },

      drawGround(g, time) {
        // The sawn face: pale sapwood out to the bark, heartwood red toward the pith.
        g.fillStyle(HW.barkDark, 0.9); g.fillCircle(cx, cy, MAX_R);
        g.fillStyle(HW.sapwood, 0.92); g.fillCircle(cx, cy, MAX_R - 14);
        g.fillStyle(mixC(HW.sapwood, HW.heartLit, 0.45), 0.9); g.fillCircle(cx, cy, 260);
        g.fillStyle(mixC(HW.heartLit, HW.heart, 0.4), 0.85); g.fillCircle(cx, cy, 150);
        // Fine earlywood rings between the dark ones.
        g.lineStyle(1, HW.plankDark, 0.25);
        for (let r = 30; r < MAX_R; r += 17) g.strokeCircle(cx, cy, r + Math.sin(r) * 2);
        // Radial checks — the splits that open as a log dries.
        g.lineStyle(2, HW.heartDeep, 0.35);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.27 + 0.4;
          g.lineBetween(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, cx + Math.cos(a) * (180 + i * 40), cy + Math.sin(a) * (180 + i * 40));
        }
        // The old rings: dark latewood. The drought ring swells black and cracks.
        OLD.forEach((o, i) => {
          const isDrought = i === drought;
          const half = isDrought ? droughtHalf : o.half;
          g.lineStyle(half * 2, isDrought ? 0x2a140a : HW.heartDeep, isDrought ? 0.85 : 0.55);
          g.strokeCircle(cx, cy, o.r);
          if (isDrought) {
            g.lineStyle(1.5, HW.leafRust, 0.6 + 0.3 * Math.sin(time / 120));
            g.strokeCircle(cx, cy, o.r - half); g.strokeCircle(cx, cy, o.r + half);
            for (let k = 0; k < 16; k++) {
              const a = (k / 16) * Math.PI * 2 + i;
              g.lineStyle(1, 0x000000, 0.6);
              g.lineBetween(cx + Math.cos(a) * (o.r - half), cy + Math.sin(a) * (o.r - half), cx + Math.cos(a + 0.05) * (o.r + half), cy + Math.sin(a + 0.05) * (o.r + half));
            }
          }
        });
        // The pith.
        g.fillStyle(HW.heartDeep, 1); g.fillCircle(cx, cy, 9);
        g.fillStyle(HW.amber, 0.8); g.fillCircle(cx, cy, 4);
        // This year's ring: bright new wood, a shimmer of sap running round it.
        for (const r of brightRadii()) {
          if (r < 10) continue;
          g.lineStyle(BRIGHT_HALF * 2, HW.amberLit, 0.32); g.strokeCircle(cx, cy, r);
          g.lineStyle(4, HW.amberHot, 0.75); g.strokeCircle(cx, cy, r - BRIGHT_HALF + 2); g.strokeCircle(cx, cy, r + BRIGHT_HALF - 2);
          for (let k = 0; k < 14; k++) {
            const a = (k / 14) * Math.PI * 2 + time / 900;
            g.fillStyle(HW.amberHot, 0.8); g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.4);
          }
          // Chevrons pointing outward along the ring: the way the year is going.
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + 0.2;
            const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r;
            const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
            g.lineStyle(2, HW.amberDeep, 0.6);
            g.lineBetween(bx - ux * 6 + nx * 7, by - uy * 6 + ny * 7, bx + ux * 4, by + uy * 4);
            g.lineBetween(bx - ux * 6 - nx * 7, by - uy * 6 - ny * 7, bx + ux * 4, by + uy * 4);
          }
        }
      },

      drawAir(g, time) {
        // Hasted fighters trail gold; dragged ones are clutched by dark grain.
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f)) continue;
          if (onBright(f)) {
            for (let i = 0; i < 3; i++) {
              const a = time / 140 + i * 2.1;
              g.fillStyle(HW.amberHot, 0.7); g.fillCircle(f.x + Math.cos(a) * 20, f.y + 14 + Math.sin(a) * 6, 2);
            }
          } else if (ringDrag(f) < 1) {
            g.lineStyle(2, HW.heartDeep, 0.7);
            for (let i = 0; i < 4; i++) {
              const a = Math.PI * 0.15 + i * 0.25 + Math.sin(time / 300 + i) * 0.05;
              g.lineBetween(f.x + Math.cos(a) * 16 - 12, f.y + 18, f.x + Math.cos(a) * 10 - 8, f.y + 4);
            }
          }
        }
      },

      drawHud(g) {
        // The year dial: a little cross-section filling as this year's ring grows.
        const x = W / 2, y = top + 18;
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 16);
        g.fillStyle(HW.sapwood, 1); g.fillCircle(x, y, 13);
        g.lineStyle(1, HW.heart, 0.8);
        for (let r = 3; r < 13; r += 3) g.strokeCircle(x, y, r);
        g.lineStyle(3, drought >= 0 ? HW.leafRust : HW.amberLit, 1); g.strokeCircle(x, y, 1 + yearK * 12);
      },
    };
  },
};
