import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, type G } from '../../../../../art/IsleArt';
import { BLACKFLAME_LIT, CLOTH, CLOTH_SHEEN, IRON, IRON_LIT, MOON, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Shade-Drove — Shade-Drover Gamaliel Wyvenhoe. Umbral's shadows walk off on their own, and in the
 * King's telling Wyvenhoe was the man paid to round them up: he collared the strays with his crook and
 * drove them to the looms to be woven into the Moult-Tithe, and the ones he kept he set on debtors.
 *
 * Five loose shadows are in the yard. A collared shade heels to its master, **takes a shot meant for
 * him** (it catches one, then needs a moment to knit), and rears up and lunges at its master's foe
 * when they come close — the rear is the warning. Wyvenhoe starts with three. **Strike a shade to put
 * your own collar on it**, strays and his alike; he strikes them back. Past half he whistles the drove
 * together, every shade of his lunging at once on the call.
 */

const ID = fallenId('umbral', 'shade-drove');
const HEEL_R = 62;
const SHADE_R = 24;
const LUNGE_REACH = 120;
const REAR_MS = 620;
const LUNGE_MS = 200;
const KNIT_MS = 1300;
const WHISTLE_MS = 7200;

type Side = 'none' | 'player' | 'npc';

interface Shade {
  x: number; y: number; side: Side; target: StrikeTarget | null;
  /** 0 idle, 1 rearing, 2 lunging, 3 recovering. */
  state: number; until: number; fromX: number; fromY: number; toX: number; toY: number;
  nextLunge: number; knitUntil: number; turnedAt: number; seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const sides: Record<'player' | 'npc', Fighter> = { player, npc };
  const shades: Shade[] = [];
  let started = false;
  let late = false;
  let nextWhistle = 0;
  let whistleAt = -1e9;

  const foeOfSide = (s: Side): Fighter | null => (s === 'player' ? npc : s === 'npc' ? player : null);
  const master = (s: Side): Fighter | null => (s === 'none' ? null : sides[s]);

  function rear(s: Shade, time: number, warn: number): void {
    const foe = foeOfSide(s.side);
    if (!foe || !alive(foe)) return;
    s.state = 1; s.until = time + tk.warn(warn);
    s.fromX = s.x; s.fromY = s.y;
    const a = Math.atan2(foe.y - s.y, foe.x - s.x);
    const reach = Math.min(LUNGE_REACH + 20, dist(s.x, s.y, foe.x, foe.y));
    s.toX = tk.clampX(s.x + Math.cos(a) * reach); s.toY = tk.clampY(s.y + Math.sin(a) * reach);
  }

  function addShade(x: number, y: number, side: Side, i: number): void {
    const s: Shade = {
      x, y, side, target: null, state: 0, until: 0, fromX: x, fromY: y, toX: x, toY: y,
      nextLunge: 0, knitUntil: 0, turnedAt: -1e9, seed: i * 1.37,
    };
    s.target = ctx.target({
      x, y: y - 20, r: SHADE_R, passThrough: true,
      onStruck: (by) => {
        const t = tk.now;
        if (s.side === by || t - s.turnedAt < 400) return;
        s.side = by; s.turnedAt = t; s.state = 0; s.nextLunge = t + 1200;
        ctx.flash(s.x, s.y - 20, by === 'player' ? 0x8ab8ff : 0xffa040);
        ctx.sfx('chain');
      },
    });
    shades.push(s);
  }

  return {
    update(time, dtRaw) {
      const dt = Math.min(dtRaw, 0.1);
      if (!started) {
        started = true;
        const pts: [number, number, Side][] = [
          [W * 0.72, top + 120, 'npc'], [W * 0.84, (top + H) / 2, 'npc'], [W * 0.72, H - 80, 'npc'],
          [W * 0.32, top + 110, 'none'], [W * 0.32, H - 70, 'none'],
        ];
        pts.forEach(([x, y, s], i) => addShade(x, y, s, i));
        nextWhistle = time + WHISTLE_MS;
      }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE DROVER WHISTLES', '#ffa040');
        ctx.sfx('screech');
        nextWhistle = time + 1500;
      }
      // The whistle: every shade of his rears together.
      if (late && time >= nextWhistle) {
        nextWhistle = time + WHISTLE_MS;
        whistleAt = time;
        ctx.sfx('sonic-pulse');
        for (const s of shades) if (s.side === 'npc' && s.state === 0) rear(s, time, 900);
      }
      shades.forEach((s, i) => {
        const m = master(s.side);
        if (s.state === 0) {
          // Strays drift; collared ones heel to their master on a slot of their own.
          let gx: number, gy: number, sp: number;
          if (!m || !alive(m)) {
            gx = W / 2 + Math.sin(time / 2300 + s.seed * 3) * W * 0.36;
            gy = (top + H) / 2 + Math.cos(time / 1900 + s.seed * 2) * (H - top) * 0.34;
            sp = 45;
          } else {
            const mine = shades.filter((o) => o.side === s.side);
            const slot = mine.indexOf(s);
            const a = (slot / Math.max(1, mine.length)) * Math.PI * 2 + time / 2600;
            gx = m.x + Math.cos(a) * HEEL_R; gy = m.y + Math.sin(a) * HEEL_R * 0.7;
            sp = 230;
          }
          const d = Math.max(1, dist(s.x, s.y, gx, gy));
          const step = Math.min(d, sp * dt);
          s.x = tk.clampX(s.x + ((gx - s.x) / d) * step, 30); s.y = tk.clampY(s.y + ((gy - s.y) / d) * step, 30);
          const foe = foeOfSide(s.side);
          if (foe && alive(foe) && time >= s.nextLunge && dist(s.x, s.y, foe.x, foe.y) < LUNGE_REACH) rear(s, time, REAR_MS);
        } else if (s.state === 1 && time >= s.until) {
          s.state = 2; s.until = time + LUNGE_MS;
          ctx.sfx('whoosh');
        } else if (s.state === 2) {
          const k = clamp(1 - (s.until - time) / LUNGE_MS, 0, 1);
          s.x = s.fromX + (s.toX - s.fromX) * k; s.y = s.fromY + (s.toY - s.fromY) * k;
          if (time >= s.until) {
            s.state = 3; s.until = time + 500; s.nextLunge = time + 2400 + i * 150;
            const foe = foeOfSide(s.side);
            if (foe && alive(foe) && dist(foe.x, foe.y, s.toX, s.toY) < 34 + 14) {
              if (foe === player) tk.hitPlayer(9, s.toX, s.toY); else ctx.hit(npc, 12, s.toX, s.toY);
              ctx.sfx('slash');
            }
          }
        } else if (s.state === 3 && time >= s.until) s.state = 0;
        // A collared shade catches the first shot of its master's foe to come near it.
        if (s.side !== 'none' && time >= s.knitUntil) {
          for (const shot of ctx.shotsNear(s.x, s.y - 16, SHADE_R + 6)) {
            if (shot.owner === s.side) continue;
            shot.block();
            s.knitUntil = time + KNIT_MS;
            ctx.flash(s.x, s.y - 18, CLOTH_SHEEN);
            ctx.sfx('shield-block');
            break;
          }
        }
        s.target?.moveTo(s.x, s.y - 20);
      });
    },

    npcSeek() {
      // Go and collar the nearest shade that is not his.
      let best: Shade | null = null, bd = 1e9;
      for (const s of shades) {
        if (s.side === 'npc') continue;
        const d = dist(npc.x, npc.y, s.x, s.y);
        if (d < bd) { bd = d; best = s; }
      }
      if (!best) return null;
      if (bd < 70) return null;
      return { x: tk.clampX(best.x), y: tk.clampY(best.y + 10) };
    },

    drawGround(g, time) {
      for (const s of shades) {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y + 2, 34, 10);
        if (s.state === 1) {
          const k = clamp(1 - (s.until - time) / 900, 0, 1);
          g.lineStyle(2, s.side === 'npc' ? 0xffa040 : 0x8ab8ff, 0.4 + k * 0.5);
          g.lineBetween(s.x, s.y, s.toX, s.toY);
          g.strokeCircle(s.toX, s.toY, 34);
          g.fillStyle(s.side === 'npc' ? 0xffa040 : 0x8ab8ff, 0.08 + 0.14 * k); g.fillCircle(s.toX, s.toY, 34);
        }
      }
    },

    drawAir(g, time) {
      for (const s of shades) drawShade(g, s, time);
      const w = (time - whistleAt) / 700;
      if (w >= 0 && w < 1 && alive(npc)) { g.lineStyle(2, 0xffa040, 1 - w); g.strokeCircle(npc.x, npc.y - 30, 20 + w * 70); }
    },

    drawHud(g) {
      // The drove's tally: five little shade-heads, each in its collar's colour.
      const x0 = W / 2 - 52, y = top + 16;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 14, y - 13, 132, 26, 6);
      shades.forEach((s, i) => {
        const x = x0 + i * 26;
        g.fillStyle(CLOTH, 1); g.fillCircle(x, y - 3, 7); g.fillTriangle(x - 8, y + 9, x + 8, y + 9, x, y - 2);
        g.fillStyle(MOON, 0.8); g.fillRect(x - 4, y - 4, 3, 1.5); g.fillRect(x + 1, y - 4, 3, 1.5);
        if (s.side !== 'none') { g.lineStyle(2, s.side === 'npc' ? 0xffa040 : 0x8ab8ff, 1); g.lineBetween(x - 6, y + 3, x + 6, y + 3); }
      });
    },

    destroy() { for (const s of shades) { s.target?.remove(); s.target = null; } },
  };
}

/** A loose shadow standing up: ragged hems, long arms, two pale slits; collared in its master's colour. */
function drawShade(g: G, s: Shade, time: number): void {
  const rearK = s.state === 1 ? 1 : s.state === 2 ? 0.6 : 0;
  const x = s.x, y = s.y;
  const sway = Math.sin(time / 420 + s.seed) * 3;
  const tall = 46 + rearK * 14;
  const hunch = s.side === 'none' ? 8 : 0;
  const knit = time < s.knitUntil;
  const a = knit ? 0.55 : 0.88;
  // Ragged hem: a skirt of torn points along the ground.
  g.fillStyle(CLOTH, a);
  for (let i = -3; i <= 3; i++) {
    const hx = x + i * 5 + sway * 0.5;
    g.fillTriangle(hx - 4, y - 10, hx + 4, y - 10, hx + Math.sin(time / 160 + i + s.seed) * 2, y + 2 + (i % 2) * 3);
  }
  // Body and head, leaning in when it rears.
  g.fillTriangle(x - 13, y - 8, x + 13, y - 8, x + sway + hunch, y - tall + 10);
  g.fillEllipse(x + sway + hunch, y - tall + 4, 18, 20);
  // Arms: hanging, or flung forward at the rear.
  const fx = s.state >= 1 ? Math.sign(s.toX - s.fromX || 1) : 0;
  for (const k of [-1, 1]) {
    const sx = x + k * 9 + sway, sy = y - tall + 18;
    const ex = rearK ? sx + fx * 26 + k * 4 : sx + k * 6, ey = rearK ? sy - 6 : sy + 26;
    g.lineStyle(4, CLOTH, a); g.lineBetween(sx, sy, ex, ey);
    for (let f = -1; f <= 1; f++) { g.lineStyle(1.5, CLOTH, a); g.lineBetween(ex, ey, ex + f * 3 + (rearK ? fx * 5 : 0), ey + (rearK ? -2 + f * 3 : 6)); }
  }
  g.fillStyle(CLOTH_SHEEN, 0.35 * a); g.fillTriangle(x - 4, y - 10, x + 2, y - 10, x + sway + hunch - 2, y - tall + 14);
  // The eyes: two pale slits; they flare when it rears.
  const ex = x + sway + hunch, ey = y - tall + 3;
  g.fillStyle(rearK ? BLACKFLAME_LIT : MOON, rearK ? 1 : 0.75);
  g.fillRect(ex - 6, ey, 4, 1.5); g.fillRect(ex + 2, ey, 4, 1.5);
  if (rearK) glow(g, ex, ey, 14, BLACKFLAME_LIT, 0.08, 2);
  // The collar: a strap of leather, a ring, a stub of tether.
  if (s.side !== 'none') {
    const c = s.side === 'npc' ? 0xffa040 : 0x8ab8ff;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(ex - 8, ey + 9, 16, 4);
    g.lineStyle(1, c, 1); g.strokeRect(ex - 8, ey + 9, 16, 4);
    g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(ex, ey + 15, 2.5);
    g.lineStyle(1, dim(c, 0.3), 0.8); g.lineBetween(ex, ey + 17, ex + Math.sin(time / 300 + s.seed) * 4, ey + 25);
  } else {
    // A stray: frayed thread where a collar was cut.
    g.lineStyle(1, TIMBER, 0.7); g.lineBetween(ex - 4, ey + 11, ex - 8, ey + 16); g.lineBetween(ex + 3, ey + 11, ex + 6, ey + 17);
  }
  if (knit) {
    // Knitting back after a catch: needles of dark stitching across the torn chest.
    for (let i = 0; i < 3; i++) { g.lineStyle(1, IRON, 0.9); g.lineBetween(x - 6, y - 22 - i * 6, x + 6, y - 18 - i * 6); }
  }
  if (time - s.turnedAt < 400) { g.lineStyle(2, s.side === 'npc' ? 0xffa040 : 0x8ab8ff, 1 - (time - s.turnedAt) / 400); g.strokeCircle(x, y - 24, 30); }
}

export const FALLEN_SHADE_DROVE: GimmickDef = {
  id: ID,
  rules: 'Collared shades heel to their master, catch one shot meant for him and lunge when close. Strike a shade to collar it; a guarding one needs two.',
  make,
};
