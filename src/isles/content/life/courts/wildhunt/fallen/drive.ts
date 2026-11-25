import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FERN, FERN_LIT, HUNT_RED, LOAM, TIMBER, TIMBER_DARK, TIMBER_LIT, clamp } from '../util';
import { EMBER, alive, servant } from './kit';

/**
 * The Beaters' Drive — Clem Rook, Headbeater: the boy who carried the Wildhunt's flag through the
 * bracken, made a hero by the King's telling — paid in silver to walk a line of beaters through
 * the households' woods and drive whatever ran from them onto the guns.
 *
 * A line of beaters in oxblood livery walks the whole width of the floor, clappers going. It is a
 * wall: anyone in front of it is shoved along ahead of it. At the far side stand the butts. When
 * the line arrives the guns are called — **"MARK!"** — and everything between the beaters and the
 * butts is shot. One beater always lags, leaving a gap in the line: find it and slip behind.
 *
 * Exploit: strike a beater and he drops flat — a second gap. The drive shoves Clem as hard as you,
 * so get behind the line and keep him in front of it when the guns are called. At half, the drives
 * come from every side in turn: down the floor as well as across it.
 */

const ID = fallenId('wildhunt', 'drive');
const SPEED = 78;
const TOUCH = 28;
const MARK_MS = 1150;
const DOWN_MS = 3600;

type Phase = 'drive' | 'mark' | 'rest';
interface Beater { c: number; t: StrikeTarget | null; downUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let axis: 'x' | 'y' = 'x';
  let dir = 1;
  let L = 40;
  let end = W - 170;
  let phase: Phase = 'rest';
  let until = 0;
  let skip = 0;
  let allSides = false;
  let n = 0;
  const beaters: Beater[] = [];
  const rattleAt = new Map<Fighter, number>();

  const sp = (): number => (axis === 'x' ? (H - top - 60) / 7 : (W - 60) / 12);
  const c0 = (): number => (axis === 'x' ? top + 30 + sp() / 2 : 30 + sp() / 2);
  const along = (f: { x: number; y: number }): number => (axis === 'x' ? f.x : f.y);
  const cross = (f: { x: number; y: number }): number => (axis === 'x' ? f.y : f.x);
  const at = (a: number, c: number) => (axis === 'x' ? { x: a, y: c } : { x: c, y: a });
  const standing = (k: number, time: number): boolean => k >= 0 && k < beaters.length && k !== skip && time >= beaters[k].downUntil;
  const covered = (c: number, time: number): boolean => standing(Math.round((c - c0()) / sp()), time);

  function startDrive(): void {
    for (const b of beaters) b.t?.remove();
    beaters.length = 0;
    if (allSides) axis = n % 2 === 0 ? 'x' : 'y';
    dir = n % 4 < 2 ? 1 : -1;
    if (!allSides) dir = n % 2 === 0 ? 1 : -1;
    n++;
    const lo = axis === 'x' ? 40 : top + 24, hi = axis === 'x' ? W - 40 : H - 24;
    const stop = axis === 'x' ? 170 : 130;
    L = dir > 0 ? lo : hi;
    end = dir > 0 ? hi - stop : lo + stop;
    const count = axis === 'x' ? 7 : 12;
    skip = 1 + Math.floor(ctx.rng() * (count - 2));
    for (let k = 0; k < count; k++) {
      const c = c0() + k * sp();
      const b: Beater = { c, t: null, downUntil: 0 };
      if (k !== skip) {
        const p = at(L, c);
        b.t = ctx.target({
          x: p.x, y: p.y - 18, r: 18,
          onStruck: () => {
            if (tk.now < b.downUntil) return;
            b.downUntil = tk.now + DOWN_MS;
            ctx.sfx('hit-medium');
          },
        });
      }
      beaters.push(b);
    }
    phase = 'drive';
    ctx.sfx('drum-hit');
  }

  return {
    update(time, dt) {
      if (!until) until = time + 1600;
      if (!allSides && npc.hp < npc.maxHp * 0.5) {
        allSides = true;
        ctx.banner('DRIVEN FROM EVERY SIDE', '#ffcf8a');
      }
      if (phase === 'rest' && time >= until) startDrive();
      if (phase === 'drive') {
        L += dir * SPEED * dt;
        if (dir * (L - end) >= 0) {
          L = end; phase = 'mark'; until = time + tk.warn(MARK_MS);
          ctx.sfx('countdown-tick');
          ctx.banner('MARK!', '#ff8a6a');
        }
        for (const b of beaters) if (b.t) { const p = at(L, b.c); b.t.moveTo(p.x, p.y - 18); }
        if (Math.floor(time / 260) !== Math.floor((time - dt * 1000) / 260)) ctx.sfx('drum-hit');
      }
      // The line is a wall where a beater stands: shoved ahead, held behind.
      if (phase !== 'rest') {
        for (const f of [player, npc]) {
          if (!alive(f) || !covered(cross(f), time)) continue;
          const d = dir * (along(f) - L);
          if (d >= 0 && d < TOUCH) {
            const push = dir * (TOUCH - d);
            ctx.nudge(f, axis === 'x' ? push : 0, axis === 'y' ? push : 0);
            if (time >= (rattleAt.get(f) ?? 0)) {
              rattleAt.set(f, time + 520);
              if (f === player) tk.hitPlayer(4, f.x, f.y); else ctx.hit(npc, 5, f.x, f.y);
            }
          } else if (d < 0 && d > -TOUCH) {
            const push = -dir * (TOUCH + d);
            ctx.nudge(f, axis === 'x' ? push : 0, axis === 'y' ? push : 0);
          }
        }
      }
      if (phase === 'mark' && time >= until) {
        ctx.sfx('shotgun');
        for (const f of [player, npc]) {
          if (!alive(f) || dir * (along(f) - L) <= 0) continue;
          if (f === player) tk.hitPlayer(24, f.x, f.y);
          else { ctx.hit(npc, 32, f.x, f.y); ctx.float(f.x, f.y - 56, 'ON THE GUNS', '#ffcf8a'); }
          ctx.flash(f.x, f.y, 0xfff0c8);
        }
        phase = 'rest'; until = time + 1500;
        for (const b of beaters) { b.t?.remove(); b.t = null; }
      }
    },

    npcSeek() {
      if (!alive(npc) || phase === 'rest') return null;
      const gapC = c0() + skip * sp();
      if (dir * (along(npc) - L) > -10) {
        // In front: to the gap, then through it.
        const near = Math.abs(cross(npc) - gapC) < sp() * 0.3;
        const p = at(near ? L - dir * 70 : L + dir * 40, gapC);
        return { x: tk.clampX(p.x), y: tk.clampY(p.y) };
      }
      // Behind: walk with the line, level with you.
      const p = at(L - dir * 90, clamp(cross(player), c0(), c0() + sp() * (beaters.length - 1)));
      return { x: tk.clampX(p.x), y: tk.clampY(p.y) };
    },

    drawGround(g, time) {
      if (phase === 'rest') return;
      // Trampled bracken behind the line, standing bracken ahead.
      const lo = axis === 'x' ? 0 : top, hi = axis === 'x' ? W : H;
      const back = dir > 0 ? lo : hi;
      const r0 = Math.min(back, L), r1 = Math.max(back, L);
      g.fillStyle(LOAM, 0.35);
      if (axis === 'x') g.fillRect(r0, top, r1 - r0, H - top); else g.fillRect(0, r0, W, r1 - r0);
      // The killing ground ahead, marked when the guns are called.
      const far = dir > 0 ? hi : lo;
      const k0 = Math.min(far, L), k1 = Math.max(far, L);
      const k = phase === 'mark' ? clamp(1 - (until - time) / MARK_MS, 0, 1) : 0;
      g.fillStyle(HUNT_RED, phase === 'mark' ? 0.12 + k * 0.2 : 0.04);
      if (axis === 'x') g.fillRect(k0, top, k1 - k0, H - top); else g.fillRect(0, k0, W, k1 - k0);
      // Bracken fronds just ahead of the beaters, bowing as the sticks come through.
      for (let i = 0; i < 40; i++) {
        const c = (axis === 'x' ? top : 0) + ((i * 73) % (axis === 'x' ? H - top : W));
        const a = L + dir * (14 + (i % 3) * 10);
        const p = at(a, c);
        const bow = Math.sin(time / 120 + i) * 4;
        g.lineStyle(2, i % 2 ? FERN : FERN_LIT, 0.8);
        g.lineBetween(p.x, p.y, p.x + (axis === 'x' ? dir * 6 : bow), p.y - 12 + (axis === 'y' ? dir * 4 : 0));
      }
      // The gap's own scuffed hole in the bracken.
      const gp = at(L, c0() + skip * sp());
      g.fillStyle(0xd8c890, 0.12); g.fillEllipse(gp.x, gp.y, axis === 'x' ? 40 : sp(), axis === 'x' ? sp() : 30);
    },

    drawAir(g, time) {
      if (phase === 'rest') return;
      drawButts(g, axis, dir, W, H, top, phase === 'mark', time);
      for (let k = 0; k < beaters.length; k++) {
        if (k === skip) continue;
        const b = beaters[k];
        const p = at(L, b.c);
        const down = time < b.downUntil ? 1 : 0;
        const ph = time / 90 + k;
        const facing = axis === 'x' ? dir : (k % 2 ? 1 : -1);
        servant(g, p.x, p.y, facing, ph, phase === 'drive' ? 1 : 0, down, (hx, hy) => clapper(g, hx, hy, facing, ph));
        if (down) { g.fillStyle(EMBER, 0.8); g.fillCircle(p.x, p.y - 18, 2); }
      }
      // The lagging beater, far behind, waving his flag to show where he should be.
      const lp = at(L - dir * 54, c0() + skip * sp());
      servant(g, lp.x, lp.y, axis === 'x' ? dir : 1, time / 300, 0, 0, (hx, hy) => flag(g, hx, hy, time), 0.75);
    },

    drawHud(g, time) {
      const x = W / 2 - 80, y = top + 16, w = 160;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 6, y - 11, w + 12, 22, 7);
      g.fillStyle(LOAM, 1); g.fillRect(x, y - 3, w, 6);
      if (phase !== 'rest') {
        const lo = axis === 'x' ? 40 : top + 24, hi = axis === 'x' ? W - 40 : H - 24;
        const k = clamp((dir > 0 ? L - lo : hi - L) / Math.abs(end - (dir > 0 ? lo : hi)), 0, 1);
        g.fillStyle(HUNT_RED, 1); g.fillRect(x, y - 3, w * k, 6);
        g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + w * k - 2, y - 8, 4, 16);
      }
      // The butts at the end of the bar, flaring when MARK is called.
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + w - 2, y - 9, 8, 18);
      if (phase === 'mark') glow(g, x + w + 2, y, 14, 0xffd890, 0.15 + Math.sin(time / 40) * 0.05, 2);
    },

    destroy() { for (const b of beaters) b.t?.remove(); },
  };
}

/** A beater's clapper: two boards on a thong, slapping together on the beat. */
function clapper(g: G, x: number, y: number, dir: number, ph: number): void {
  const open = Math.abs(Math.sin(ph)) * 0.5;
  for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + dir * 0.4 + s * open;
    g.lineStyle(4, TIMBER, 1); g.lineBetween(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 14);
  }
}

/** A beater's flag on a hazel stick: a white field with the hunt's red slash. */
function flag(g: G, x: number, y: number, time: number): void {
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x, y, x, y - 30);
  const w = Math.sin(time / 160) * 3;
  g.fillStyle(0xe8e0cc, 1); g.fillTriangle(x, y - 30, x + 16, y - 25 + w, x, y - 18);
  g.lineStyle(2, HUNT_RED, 1); g.lineBetween(x + 2, y - 27, x + 10, y - 23 + w * 0.6);
}

/** The butts at the drive's end: a turf wall, gun barrels laid over it, a flash of muzzles on MARK. */
function drawButts(g: G, axis: 'x' | 'y', dir: number, W: number, H: number, top: number, mark: boolean, time: number): void {
  const count = axis === 'x' ? 4 : 6;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = axis === 'x' ? (dir > 0 ? W - 22 : 22) : 30 + t * (W - 60);
    const y = axis === 'x' ? top + 30 + t * (H - top - 60) : (dir > 0 ? H - 14 : top + 18);
    const ox = axis === 'x' ? -dir : 0, oy = axis === 'y' ? -dir : 0;
    g.fillStyle(0x3a2e1a, 1); g.fillEllipse(x, y, axis === 'x' ? 24 : 70, axis === 'x' ? 70 : 20);
    g.fillStyle(FERN, 1); g.fillEllipse(x - ox * 2, y - oy * 2, axis === 'x' ? 18 : 64, axis === 'x' ? 64 : 14);
    for (const s of [-8, 8]) {
      const bx = x + (axis === 'y' ? s : 0), by = y + (axis === 'x' ? s : 0);
      g.lineStyle(3, 0x2a2a2a, 1); g.lineBetween(bx, by, bx + ox * 20, by + oy * 20);
      g.lineStyle(1, 0x8a8a8a, 1); g.lineBetween(bx, by - 1, bx + ox * 20, by + oy * 20 - 1);
      if (mark && Math.sin(time / 35 + i + s) > 0.6) { g.fillStyle(0xfff0c8, 0.8); g.fillCircle(bx + ox * 22, by + oy * 22, 4); }
    }
    g.fillStyle(EMBER, 0.9); g.fillCircle(x + ox * 4, y + oy * 4 - 3, 1.3);
  }
}

export const FALLEN_DRIVE: GimmickDef = {
  id: ID,
  rules: 'A line of beaters drives across the floor and shoves you onto the guns. Find the gap, or strike a beater down, and keep Clem in front.',
  make,
};
