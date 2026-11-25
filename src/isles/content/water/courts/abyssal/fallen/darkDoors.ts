import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ABY, alive, dist, drawEsca } from '../palette';

/**
 * The Dark Door List — Listkeeper Sunniva's fight (the lamplighter who, in this telling, kept the list).
 *
 * Six hull-house doors stand round the arena, each with its angler-lamp in a jar on a bone hook.
 * A lamp eats glow-roe; its jar empties as the fight goes on, and a starved lamp goes out. A
 * lit door is a paid door. A dark door is on **the list**. Every few seconds the list is read:
 * the floor before every dark door floods black, pale hands rise round its edge, and whoever is
 * still standing on a dark doorstep is **taken** — struck and held under for a moment. The
 * street down the middle, between the rows of doors, belongs to nobody.
 *
 * Strike a lamp and what happens depends on who you are: the player **feeds** it (a full jar,
 * the door lit again); Sunniva **snuffs** it. She walks the rows putting out the lamps nearest
 * you. The exploit: the list does not care whose name is on it — a dark doorstep takes Sunniva as
 * readily as anyone. Keep your side lit and let her own snuffing catch her when the list is read.
 *
 * Halfway, **the list is long**: lamps starve faster, the list is read more often, and every
 * dark doorstep spreads wider into the street.
 */

const ID = fallenId('abyssal', 'dark-doors');
const STARVE_S = 15;
const TOLL_MS = 7200;
const TOLL_MS_LONG = 5400;
const WARN_MS = 1400;
const STEP_R = 86;
const STEP_R_LONG = 104;
const TAKE_DMG = 18;
const TAKE_HOLD = 750;

type G = Parameters<NonNullable<EncounterGimmick['drawGround']>>[0];

interface Lamp { x: number; y: number; fed: number; lockUntil: number; flickAt: number; target: StrikeTarget | null; row: -1 | 1 }

export const DARK_DOORS: GimmickDef = {
  id: ID,
  rules: 'Starved lamps go dark; when the list is read, dark doorsteps take whoever stands on them. Strike a lamp to feed it — Sunniva strikes to snuff.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const ph = H - top;
    const spots: [number, number, -1 | 1][] = [[0.16, 0.22, -1], [0.5, 0.17, -1], [0.84, 0.22, -1], [0.16, 0.8, 1], [0.5, 0.85, 1], [0.84, 0.8, 1]];
    const lamps: Lamp[] = spots.map(([fx, fy, row], i) => ({
      x: W * fx, y: top + ph * fy, fed: 0.35 + i * 0.12, lockUntil: 0, flickAt: 0, target: null, row,
    }));
    const midY = top + ph * 0.5;
    let now = 0;
    let tollAt = -1;
    let takenAt = -99999;
    let long = false;

    const stepR = (): number => (long ? STEP_R_LONG : STEP_R);
    const dark = (l: Lamp): boolean => l.fed <= 0;
    const onDarkStep = (f: Fighter): boolean => lamps.some((l) => dark(l) && dist(f.x, f.y, l.x, l.y) < stepR());
    const warning = (): boolean => tollAt > 0 && now >= tollAt - WARN_MS;

    for (const l of lamps) {
      l.target = ctx.target({
        x: l.x, y: l.y - 20, r: 22,
        onStruck: (by) => {
          if (now < l.lockUntil) return;
          l.lockUntil = now + 650;
          l.flickAt = now;
          if (by === 'player') { l.fed = 1; ctx.sfx('sparkle'); ctx.flash(l.x, l.y - 30, ABY.lure); }
          else { l.fed = 0; ctx.sfx('hush'); }
        },
      });
    }

    return {
      update(time: number, dtIn: number) {
        const dt = Math.min(0.05, dtIn);
        now = time;
        if (tollAt < 0) tollAt = time + TOLL_MS;
        if (!long && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          long = true;
          ctx.banner('THE LIST IS LONG', '#ffcf5a');
          ctx.sfx('curse-cast');
        }
        for (const l of lamps) {
          if (l.fed > 0) {
            l.fed = Math.max(0, l.fed - (dt / STARVE_S) * (long ? 1.6 : 1));
            if (l.fed <= 0) { l.flickAt = time; ctx.sfx('hush'); }
          }
        }
        if (time >= tollAt - WARN_MS && time - dt * 1000 < tollAt - WARN_MS) ctx.sfx('countdown-tick');
        if (time >= tollAt) {
          tollAt = time + (long ? TOLL_MS_LONG : TOLL_MS);
          takenAt = time;
          ctx.sfx('splash');
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || !onDarkStep(f)) continue;
            ctx.hit(f, TAKE_DMG, f.x, f.y);
            ctx.root(f, TAKE_HOLD);
            ctx.flash(f.x, f.y, ABY.membraneDim);
          }
        }
      },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        // When the list is about to be read, she gets off any dark step and into the street.
        if (warning() && onDarkStep(n)) return { x: n.x, y: midY };
        if (warning()) return null;
        // Otherwise she goes to snuff the lit lamp nearest the player.
        let best: Lamp | null = null;
        for (const l of lamps) {
          if (dark(l)) continue;
          if (!best || dist(p.x, p.y, l.x, l.y) < dist(p.x, p.y, best.x, best.y)) best = l;
        }
        return best ? { x: best.x, y: best.y - best.row * 34 } : null;
      },

      drawGround(g, time) {
        const t = time / 1000;
        // The street between the rows: worn planking that the list never reaches.
        g.fillStyle(ABY.hull, 0.35); g.fillRect(0, midY - 34, W, 68);
        g.lineStyle(1, ABY.hullLit, 0.3);
        for (let x = 0; x < W; x += 46) g.lineBetween(x, midY - 34, x, midY + 34);
        g.lineBetween(0, midY - 34, W, midY - 34); g.lineBetween(0, midY + 34, W, midY + 34);
        const warnK = warning() ? 1 - (tollAt - now) / WARN_MS : 0;
        for (const l of lamps) {
          const r = stepR();
          if (!dark(l)) {
            // A paid doorstep: warm pool of lamplight.
            for (let k = 4; k >= 1; k--) { g.fillStyle(ABY.lure, 0.025 * k * (0.4 + l.fed * 0.6)); g.fillCircle(l.x, l.y, r * (0.4 + k * 0.15)); }
            g.lineStyle(1.5, ABY.lureDeep, 0.35); g.strokeCircle(l.x, l.y, r);
          } else {
            // A listed doorstep: seawater seeping up through the planks.
            g.fillStyle(ABY.abyss, 0.35 + warnK * 0.45); g.fillCircle(l.x, l.y, r);
            g.lineStyle(2, ABY.membraneDim, 0.5 + warnK * 0.4); g.strokeCircle(l.x, l.y, r);
            for (let i = 0; i < 3; i++) {
              const rr = ((t * 22 + i * 28) % r);
              g.lineStyle(1, ABY.membraneDim, 0.35 * (1 - rr / r)); g.strokeEllipse(l.x, l.y + 6, rr * 2, rr * 0.9);
            }
            if (warnK > 0) drawHands(g, l.x, l.y, r, warnK, t);
          }
          if (now - takenAt < 500 && dark(l)) {
            const k = (now - takenAt) / 500;
            g.lineStyle(5 * (1 - k), ABY.membrane, 0.8 * (1 - k)); g.strokeCircle(l.x, l.y, r * (0.6 + k * 0.5));
          }
          drawDoor(g, l, t);
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        for (const l of lamps) drawLamp(g, l, t, now);
      },

      drawHud(g) {
        // Six little doors (lit or chalked) and the reading clock between them.
        const cx = W / 2, y = top + 18;
        for (let i = 0; i < lamps.length; i++) {
          const l = lamps[i];
          const x = cx + (i < 3 ? -90 + i * 22 : 46 + (i - 3) * 22);
          g.fillStyle(0x000000, 0.5); g.fillRect(x - 8, y - 12, 16, 24);
          g.fillStyle(dark(l) ? ABY.hull : ABY.hullLit, 1); g.fillRect(x - 6, y - 10, 12, 20);
          if (dark(l)) {
            g.lineStyle(1.5, 0xe8e0c8, 0.9); g.lineBetween(x - 5, y - 8, x + 5, y + 8); g.lineBetween(x + 5, y - 8, x - 5, y + 8);
          } else {
            g.fillStyle(ABY.lure, 0.9); g.fillCircle(x, y - 14, 3 * (0.5 + l.fed * 0.5));
          }
        }
        const k = tollAt > 0 ? 1 - (tollAt - now) / (long ? TOLL_MS_LONG : TOLL_MS) : 0;
        g.fillStyle(0x000000, 0.55); g.fillCircle(cx, y, 13);
        g.lineStyle(4, warning() ? 0xc8283c : ABY.membraneDim, 1);
        g.beginPath(); g.arc(cx, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, k)), false); g.strokePath();
        g.fillStyle(0xe8e0c8, 1); g.fillRect(cx - 3, y - 4, 6, 8);
      },

      destroy() { for (const l of lamps) l.target?.remove(); },
    };
  },
};

/** A hull-house door at the back of the step: planks, a frame of keel timber, a ring knocker — chalked if listed. */
function drawDoor(g: G, l: Lamp, t: number): void {
  const x = l.x + 34, y = l.y + (l.row < 0 ? -8 : 10);
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, 40, 9);
  g.fillStyle(ABY.tar, 1); g.fillRect(x - 17, y - 48, 34, 48);
  g.fillStyle(ABY.hullMid, 1); g.fillRect(x - 14, y - 45, 28, 45);
  g.lineStyle(1, ABY.hull, 1);
  for (let i = 1; i < 4; i++) g.lineBetween(x - 14 + i * 7, y - 45, x - 14 + i * 7, y);
  g.fillStyle(ABY.hullLit, 1); g.fillRect(x - 17, y - 51, 34, 5);
  g.lineStyle(1.5, ABY.brass, 1); g.strokeCircle(x + 7, y - 22, 3);
  g.fillStyle(ABY.coralTeal, 0.6); g.fillCircle(x - 16, y - 10, 2.5); g.fillCircle(x + 15, y - 34, 2);
  if (l.fed <= 0) {
    // Sunniva's chalk: an X on the door and a tally under it.
    g.lineStyle(3, 0xe8e0c8, 0.85);
    g.lineBetween(x - 10, y - 40, x + 10, y - 12); g.lineBetween(x + 10, y - 40, x - 10, y - 12);
    g.lineStyle(1.5, 0xe8e0c8, 0.6);
    for (let i = 0; i < 4; i++) g.lineBetween(x - 9 + i * 4, y - 8, x - 9 + i * 4, y - 3);
    g.lineBetween(x - 11, y - 4, x + 5, y - 7);
  } else {
    g.fillStyle(ABY.lure, 0.12 + Math.sin(t * 3 + x) * 0.04); g.fillRect(x - 14, y - 45, 28, 45);
  }
}

/** The angler in its jar on a bone hook: the roe it has left, and its esca lit or out. */
function drawLamp(g: G, l: Lamp, t: number, now: number): void {
  const x = l.x, base = l.y;
  // The bone hook post.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, base + 2, 22, 7);
  g.lineStyle(7, ABY.boneShadow, 1); g.lineBetween(x, base, x, base - 62);
  g.lineStyle(5, ABY.boneMid, 1); g.lineBetween(x, base, x, base - 62);
  g.lineStyle(5, ABY.boneMid, 1);
  g.beginPath(); g.arc(x - 10, base - 62, 10, 0, Math.PI, true); g.strokePath();
  g.lineStyle(1, ABY.boneDark, 1); g.lineBetween(x - 20, base - 62, x - 20, base - 54);
  // The jar.
  const jx = x - 20, jy = base - 38;
  const lit = l.fed > 0;
  const flick = now - l.flickAt < 300 ? Math.sin(now / 25) * 0.5 + 0.5 : 1;
  if (lit) for (let k = 4; k >= 1; k--) { g.fillStyle(ABY.lure, 0.04 * k * l.fed * flick); g.fillCircle(jx, jy, 12 + k * 7); }
  g.fillStyle(mixC(ABY.deep, lit ? ABY.lureDeep : ABY.deepMid, lit ? 0.35 : 0.5), 0.9); g.fillEllipse(jx, jy, 24, 30);
  // Roe in the bottom of the jar: what it has left to eat.
  const roe = Math.ceil(l.fed * 6);
  for (let i = 0; i < roe; i++) { g.fillStyle(0xff9a3a, 0.95); g.fillCircle(jx - 6 + (i % 3) * 6, jy + 10 - Math.floor(i / 3) * 4, 2); }
  // The angler: dark body, needle teeth, its stalk and esca.
  g.fillStyle(0x1a1420, 1); g.fillEllipse(jx + 1, jy, 14, 10);
  g.fillStyle(ABY.tooth, 1);
  for (let i = 0; i < 3; i++) g.fillTriangle(jx - 6 + i * 2.5, jy + 1, jx - 4.8 + i * 2.5, jy + 1, jx - 5.4 + i * 2.5, jy - 2);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(jx + 2, jy - 2, 1.2);
  g.lineStyle(1, 0x3a2e3a, 1); g.lineBetween(jx + 2, jy - 5, jx - 3, jy - 10);
  if (lit) drawEsca(g, jx - 3, jy - 10, 2.4 * (0.6 + l.fed * 0.4) * flick, t + x, 1);
  else { g.fillStyle(0x3a3440, 1); g.fillCircle(jx - 3, jy - 10, 1.8); }
  // Glass, rim and lid.
  g.lineStyle(1.5, ABY.membrane, 0.6); g.strokeEllipse(jx, jy, 24, 30);
  g.lineStyle(2, 0xffffff, 0.35); g.beginPath(); g.arc(jx, jy, 10, Math.PI * 1.1, Math.PI * 1.4, false); g.strokePath();
  g.fillStyle(ABY.brassDark, 1); g.fillRect(jx - 8, jy - 18, 16, 4);
}

/** The list being read: drowned hands rising round the rim of a dark doorstep, reaching in. */
function drawHands(g: G, x: number, y: number, r: number, k: number, t: number): void {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const rr = r * (0.95 - k * 0.15);
    const hx = x + Math.cos(a) * rr, hy = y + Math.sin(a) * rr * 0.9;
    const reach = 6 + k * 14 + Math.sin(t * 6 + i) * 2;
    const ix = -Math.cos(a), iy = -Math.sin(a);
    g.fillStyle(0xa8c4cc, 0.35 + k * 0.5); g.fillEllipse(hx, hy, 9, 7);
    g.lineStyle(2, 0xa8c4cc, 0.35 + k * 0.5);
    for (let f = -2; f <= 2; f++) {
      const sx = hx + -iy * f * 2.4, sy = hy + ix * f * 2.4;
      const len = reach * (f === 0 ? 1 : f === 2 || f === -2 ? 0.6 : 0.85);
      g.lineBetween(sx, sy, sx + ix * len, sy + iy * len);
    }
  }
}
