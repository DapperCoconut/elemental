import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { SF, alive, clamp, dist, makeClock, star } from '../palette';

/**
 * Telescope — Astronomer Galilee.
 *
 * The great telescope's mouth hangs over the top wall, and the light through its lens falls on
 * the floor as a wandering bright circle. It drifts over the roof, nosing toward one fighter and
 * then the other. Every few seconds it stops and *focuses*: its ring tightens, ticking, and when
 * it snaps tight whoever is inside is MAGNIFIED for five seconds — drawn larger in a halo of
 * glass, every hit they land 50% harder and every hit they take 50% harder too, and a little
 * heavier on their feet. Both can be caught at once.
 *
 * It is a coin with two faces, and Galilee plays it by health: ahead, he steps into the focus;
 * behind, he keeps out. The exploit is timing — take the focus when the foe can't punish it,
 * and when *he* is magnified, that is the moment to spend everything.
 */

interface Lens { x: number; y: number; tx: number; ty: number; speed: number; R: number; focusEvery: number; focusAt: number; snapAt: number; focusing: boolean; chase: 0 | 1; scope: Pt; small: boolean }

export const telescopeGimmick: GimmickDef = {
  id: 'starfall-telescope',
  rules: 'The telescope\'s lens wanders the floor and focuses. Caught in the snap: MAGNIFIED — your hits and the hits you take are 50% harder.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const FOCUS_MS = hard ? 950 : 1150;
    const MAG_MS = 5000;
    const MAG = 1.5;
    const mid = (top + H) / 2;

    const lenses: Lens[] = [
      { x: W / 2, y: mid, tx: W / 2, ty: mid, speed: hard ? 125 : 110, R: 74, focusEvery: hard ? 4800 : 5600, focusAt: -1, snapAt: 0, focusing: false, chase: 0, scope: { x: W / 2, y: top - 6 }, small: false },
    ];
    if (hard) lenses.push({ x: W * 0.25, y: mid, tx: W * 0.25, ty: mid, speed: 150, R: 52, focusEvery: 6300, focusAt: -1, snapAt: 0, focusing: false, chase: 1, scope: { x: 60, y: top + 30 }, small: true });

    const mag = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let now = 0;
    const magnified = (f: Fighter): boolean => alive(f) && now < (mag.get(f) ?? 0);

    /** Pick the next place to drift: near whoever it is nosing after, off a little. */
    const retarget = (L: Lens): void => {
      const f = L.chase === 0 ? ctx.player : ctx.npc;
      const fx = alive(f) ? f.x : W / 2, fy = alive(f) ? f.y : mid;
      L.tx = clamp(fx + (rng() - 0.5) * 220, 80, W - 80);
      L.ty = clamp(fy + (rng() - 0.5) * 160, top + 70, H - 60);
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        for (const L of lenses) {
          if (L.focusAt < 0) { L.focusAt = time + L.focusEvery; retarget(L); }
          if (!L.focusing) {
            const d = dist(L.x, L.y, L.tx, L.ty);
            if (d < 10) { retarget(L); }
            else { L.x += ((L.tx - L.x) / d) * L.speed * dt; L.y += ((L.ty - L.y) / d) * L.speed * dt; }
            if (time >= L.focusAt) {
              L.focusing = true; L.snapAt = time + FOCUS_MS;
              ctx.sfx('gear-turn');
            }
          } else if (time >= L.snapAt) {
            L.focusing = false;
            L.focusAt = time + L.focusEvery;
            L.chase = L.chase === 0 ? 1 : 0;
            retarget(L);
            ctx.sfx('crystal-chime');
            let caught = false;
            for (const f of [ctx.player, ctx.npc]) {
              if (!alive(f) || dist(f.x, f.y, L.x, L.y) > L.R) continue;
              mag.set(f, time + MAG_MS);
              caught = true;
              ctx.float(f.x, f.y - 60, 'MAGNIFIED', '#c8e8ff');
              ctx.flash(f.x, f.y, SF.comet);
            }
            if (!caught) ctx.float(L.x, L.y - 20, 'out of focus', '#9aa6cc');
          }
        }
      },

      // A magnified fighter strikes 1.5× and is struck 1.5×; both magnified, both apply.
      playerTakenMult: () => (magnified(ctx.player) ? MAG : 1) * (magnified(ctx.npc) ? MAG : 1),
      npcTakenMult: () => (magnified(ctx.npc) ? MAG : 1) * (magnified(ctx.player) ? MAG : 1),
      playerSpeedMult: () => (magnified(ctx.player) ? 0.9 : 1),
      npcSpeedMult: () => (magnified(ctx.npc) ? 0.9 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        const ahead = alive(p) ? n.hp / Math.max(1, n.maxHp) >= p.hp / Math.max(1, p.maxHp) : true;
        // The player is magnified and he isn't: close in and spend it.
        if (magnified(p) && !magnified(n)) return { x: p.x, y: p.y };
        for (const L of lenses) {
          if (!L.focusing) continue;
          const inside = dist(n.x, n.y, L.x, L.y) < L.R;
          if (ahead && !inside) return { x: L.x, y: L.y };
          if (!ahead && inside) {
            const a = Math.atan2(n.y - L.y, n.x - L.x);
            return { x: clamp(L.x + Math.cos(a) * (L.R + 90), 60, W - 60), y: clamp(L.y + Math.sin(a) * (L.R + 90), top + 50, H - 50) };
          }
        }
        return null;
      },

      drawGround(g, time) {
        for (const L of lenses) {
          const k = L.focusing ? clamp(1 - (L.snapAt - time) / FOCUS_MS, 0, 1) : 0;
          const r = L.R * (1.7 - k * 0.7);
          // The pool of gathered starlight on the floor.
          g.fillStyle(SF.comet, 0.08 + k * 0.12); g.fillEllipse(L.x, L.y, r * 2, r * 1.4);
          g.fillStyle(0xffffff, 0.05 + k * 0.12); g.fillEllipse(L.x, L.y, r * 1.2, r * 0.84);
          g.lineStyle(2, SF.comet, 0.45 + k * 0.5); g.strokeEllipse(L.x, L.y, r * 2, r * 1.4);
          // The reticle: crosshairs and degree ticks, turning as it focuses.
          const spin = time / 900 + k * 3;
          g.lineStyle(1.5, SF.silver, 0.4 + k * 0.4);
          for (let i = 0; i < 4; i++) {
            const a = spin + (i / 4) * Math.PI * 2;
            g.lineBetween(L.x + Math.cos(a) * r * 0.55, L.y + Math.sin(a) * r * 0.39, L.x + Math.cos(a) * r * 0.95, L.y + Math.sin(a) * r * 0.66);
          }
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const len = i % 6 === 0 ? 0.86 : 0.93;
            g.lineBetween(L.x + Math.cos(a) * r * len, L.y + Math.sin(a) * r * len * 0.7, L.x + Math.cos(a) * r, L.y + Math.sin(a) * r * 0.7);
          }
          if (L.focusing) {
            // The snap line: where the ring will close to.
            g.lineStyle(3, SF.starHot, 0.5 + 0.5 * Math.sin(time / 60)); g.strokeEllipse(L.x, L.y, L.R * 2, L.R * 1.4);
          }
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        for (const L of lenses) {
          // The cone of light from the telescope's mouth down to the lens circle.
          const k = L.focusing ? clamp(1 - (L.snapAt - time) / FOCUS_MS, 0, 1) : 0;
          const r = L.R * (1.7 - k * 0.7);
          g.fillStyle(SF.comet, 0.05 + k * 0.05);
          g.fillTriangle(L.scope.x - 18, L.scope.y + 10, L.scope.x + 18, L.scope.y + 10, L.x - r, L.y);
          g.fillTriangle(L.scope.x + 18, L.scope.y + 10, L.x + r, L.y, L.x - r, L.y);
          // The telescope's mouth itself, over the wall: a brass ring with the glass catching light.
          const sz = L.small ? 18 : 30;
          g.fillStyle(SF.brassDark, 1); g.fillCircle(L.scope.x, L.scope.y + 10, sz + 6);
          g.fillStyle(SF.brass, 1); g.fillCircle(L.scope.x, L.scope.y + 10, sz);
          g.fillStyle(SF.comet, 0.8); g.fillCircle(L.scope.x, L.scope.y + 10, sz * 0.72);
          g.fillStyle(0xffffff, 0.6); g.fillCircle(L.scope.x - sz * 0.3, L.scope.y + 10 - sz * 0.3, sz * 0.2);
          if (L.focusing) star(g, L.x, L.y, 8 + k * 16, SF.starHot, 0.4 + k * 0.6);
        }
        // Magnified fighters: a big glass halo round them, the rim catching light, a scale tick.
        for (const f of [ctx.player, ctx.npc]) {
          if (!magnified(f)) continue;
          const left = ((mag.get(f) ?? 0) - time) / MAG_MS;
          g.fillStyle(0xc8e8ff, 0.1); g.fillCircle(f.x, f.y - 4, 46);
          g.lineStyle(4, SF.brass, 0.9); g.strokeCircle(f.x, f.y - 4, 46);
          g.lineStyle(1.5, 0xffffff, 0.7); g.beginPath(); g.arc(f.x, f.y - 4, 40, Math.PI * 1.1, Math.PI * 1.5); g.strokePath();
          g.lineStyle(3, SF.comet, 0.9); g.beginPath(); g.arc(f.x, f.y - 4, 52, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.strokePath();
          g.fillStyle(SF.brass, 1); g.fillRect(f.x + 30, f.y + 26, 16, 5);
          g.fillStyle(0xffffff, 0.9); g.fillRect(f.x + 34 + Math.sin(t * 6) * 2, f.y + 27, 3, 3);
        }
      },

      drawHud(g) {
        // A little lens per side, filled while magnified.
        const pip = (x: number, f: Fighter): void => {
          const on = magnified(f);
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, top + 14, 12);
          g.lineStyle(2.5, SF.brass, 1); g.strokeCircle(x, top + 14, 10);
          if (on) { g.fillStyle(SF.comet, 0.9); g.fillCircle(x, top + 14, 8); }
        };
        pip(W / 2 - 40, ctx.player);
        pip(W / 2 + 40, ctx.npc);
      },

      destroy() { mag.clear(); },
    };
  },
};
