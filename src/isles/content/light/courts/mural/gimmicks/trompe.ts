import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { trompeDoor } from '../art';
import { GOLD, GOLD_LIT, LAMPBLACK, STONE_DARK, ULTRAMARINE, UMBER, UMBER_DARK, VERMILION, VIRIDIAN } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * Trompe-l'œil — Illusionist Faux.
 *
 * Faux paints things that are not there so well that they are. Round the walls of the yard
 * stand four painted doorways, two pairs by the colour of their mouldings: walk into one and
 * you come out of its twin across the yard. On the floor, Faux paints holes — perfect, deep,
 * shadowed holes, the only shadows the censors cannot lime, because they are lies. Some of them
 * are real: step in a real one and you drop (stunned, hurt) and climb out. The fakes do nothing
 * and smear underfoot. Every few seconds the paint is scraped and he paints a new set.
 *
 * They look the same. But Faux knows which is which: watch where he puts his feet — he strolls
 * straight across his fakes and walks round the real ones. Strike a hole to test it (a real one
 * cracks, a fake one runs). Dash over a hole and you clear it. Shove him into one of his own.
 */

const HOLE_R = 26;
const FALL_MS = 1000;
const PAINT_MS = 900;

interface Door { at: Pt; exit: Pt; frame: number; pair: number; base: number; dir: Pt }

interface Hole {
  x: number; y: number;
  real: boolean;
  paintAt: number; liveAt: number; fadeAt: number;
  /** Stepped on a fake: it smeared to nothing. */
  smeared: boolean;
  /** Struck: shows its nature until then. */
  revealUntil: number;
  target: StrikeTarget | null;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const doors: Door[] = [
    { at: { x: 210, y: top + 34 }, exit: { x: 210, y: top + 84 }, frame: GOLD, pair: 1, base: top + 34, dir: { x: 0, y: 1 } },
    { at: { x: W - 210, y: H - 44 }, exit: { x: W - 210, y: H - 96 }, frame: GOLD, pair: 0, base: H - 20, dir: { x: 0, y: -1 } },
    { at: { x: 52, y: H - 170 }, exit: { x: 104, y: H - 170 }, frame: VERMILION, pair: 3, base: H - 150, dir: { x: 1, y: 0 } },
    { at: { x: W - 52, y: top + 150 }, exit: { x: W - 104, y: top + 150 }, frame: VERMILION, pair: 2, base: top + 170, dir: { x: -1, y: 0 } },
  ];
  const doorCd = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fellAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const holes: Hole[] = [];
  const SET_MS = ctx.hard ? 6500 : 7600;
  const REAL = ctx.hard ? 4 : 3;
  const COUNT = 6;
  let nextSet = 0;
  let started = false;
  /** Faux's brush flicks: from him to each fresh hole while it is painted. */
  let flickAt = -1;

  function clearHoles(): void {
    for (const h of holes) h.target?.remove();
    holes.length = 0;
  }

  function paintSet(time: number): void {
    clearHoles();
    const realIdx = new Set<number>();
    while (realIdx.size < REAL) realIdx.add(Math.floor(rng() * COUNT));
    for (let i = 0, tries = 0; i < COUNT && tries < 200; tries++) {
      const x = 110 + rng() * (W - 220), y = top + 80 + rng() * (H - top - 150);
      if (holes.some((h) => dist(h.x, h.y, x, y) < 110)) continue;
      if (doors.some((d) => dist(d.exit.x, d.exit.y, x, y) < 90)) continue;
      if (dist(player.x, player.y, x, y) < 80 || dist(npc.x, npc.y, x, y) < 80) continue;
      const h: Hole = {
        x, y, real: realIdx.has(i), paintAt: time + i * 90, liveAt: time + i * 90 + PAINT_MS, fadeAt: time + SET_MS - 500,
        smeared: false, revealUntil: 0, target: null, seed: rng() * 10,
      };
      h.target = ctx.target({
        x, y, r: HOLE_R, passThrough: true,
        onStruck: () => {
          const now = ctx.scene.time.now;
          if (now < h.liveAt || h.smeared) return;
          if (now > h.revealUntil) ctx.float(h.x, h.y - 30, h.real ? 'REAL!' : 'PAINT', h.real ? '#ff9a7a' : '#a8f0d0');
          h.revealUntil = now + 3500;
          ctx.sfx(h.real ? 'stone-slam' : 'slime-splat');
        },
      });
      holes.push(h);
      i++;
    }
    flickAt = time;
    ctx.sfx('whoosh');
  }

  function fall(f: Fighter, h: Hole, time: number): void {
    fellAt.set(f, time);
    ctx.stun(f, FALL_MS);
    ctx.hit(f, ctx.hard ? 12 : 9, h.x, h.y);
    ctx.nudge(f, h.x - f.x, h.y - f.y);
    ctx.float(h.x, h.y - 40, f === player ? 'FELL IN!' : 'FAUX FELL IN!', '#ffd0a0');
    ctx.sfx('land');
    h.revealUntil = time + 3500;
    // Climb out toward the middle of the yard.
    ctx.tk.schedule(FALL_MS, () => {
      if (!alive(f)) return;
      const a = Math.atan2(H / 2 - f.y, W / 2 - f.x);
      ctx.nudge(f, Math.cos(a) * (HOLE_R + 26), Math.sin(a) * (HOLE_R + 26));
    });
  }

  const liveHoles = (time: number) => holes.filter((h) => time >= h.liveAt && time < h.fadeAt + 500 && !h.smeared);

  return {
    update(time) {
      if (!started) { started = true; nextSet = time + 600; }
      if (time >= nextSet) { nextSet = time + SET_MS; paintSet(time); }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // Doors: step into the painted doorway, step out of its twin.
        if (time >= (doorCd.get(f) ?? 0)) {
          for (const d of doors) {
            if (dist(f.x, f.y, d.at.x, d.at.y) > 30) continue;
            const out = doors[d.pair];
            ctx.nudge(f, out.exit.x - f.x, out.exit.y - f.y);
            doorCd.set(f, time + 1500);
            ctx.flash(out.exit.x, out.exit.y, out.frame);
            ctx.sfx('portal');
            if (f === player) ctx.float(out.exit.x, out.exit.y - 40, 'THROUGH THE WALL', '#fff0a0');
            break;
          }
        }
        // Holes: the real ones drop you; the fakes smear underfoot. A dash clears either.
        if (ctx.isAirborne(f) || ctx.dashing(f) || time - (fellAt.get(f) ?? -9999) < FALL_MS + 1400) continue;
        for (const h of liveHoles(time)) {
          if (dist(f.x, f.y, h.x, h.y) > HOLE_R - 4) continue;
          if (h.real) { fall(f, h, time); break; }
          h.smeared = true;
          h.target?.remove(); h.target = null;
          ctx.float(h.x, h.y - 30, 'TROMPE-L\'ŒIL', '#a8f0d0');
          ctx.sfx('slime-splat');
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      const live = liveHoles(time);
      const d = dist(npc.x, npc.y, player.x, player.y);
      // A long way off: take a door whose twin lands near you.
      if (d > 420) {
        for (const door of doors) {
          const out = doors[door.pair];
          if (dist(npc.x, npc.y, door.at.x, door.at.y) < 260 && dist(out.exit.x, out.exit.y, player.x, player.y) < d - 200) return door.at;
        }
      }
      // He likes to stand on a fake near you, showing off.
      const fake = live.filter((h) => !h.real).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
      let goal: Pt = fake && dist(fake.x, fake.y, player.x, player.y) < 300 && Math.floor(time / 2500) % 2 === 0
        ? { x: fake.x, y: fake.y }
        : { x: player.x + Math.cos(time / 1800) * 200, y: player.y + Math.sin(time / 1800) * 140 };
      // Walk round the real ones.
      for (const h of live) {
        if (!h.real) continue;
        if (segDist(h.x, h.y, npc.x, npc.y, goal.x, goal.y) < HOLE_R + 30) {
          const a = Math.atan2(goal.y - npc.y, goal.x - npc.x) + Math.PI / 2;
          const side = Math.sign((h.x - npc.x) * Math.cos(a) + (h.y - npc.y) * Math.sin(a)) || 1;
          goal = { x: h.x - Math.cos(a) * side * (HOLE_R + 60), y: h.y - Math.sin(a) * side * (HOLE_R + 60) };
          break;
        }
      }
      return { x: clamp(goal.x, 60, W - 60), y: clamp(goal.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The doorways, painted on the yard walls; each pair glows faintly in its moulding colour.
      for (const d of doors) {
        const vertical = d.dir.y !== 0;
        if (vertical) {
          trompeDoor(g, d.at.x, d.base, 56, d.dir.y > 0 ? 70 : 64, d.frame);
        } else {
          trompeDoor(g, d.at.x, d.base, 42, 86, d.frame);
        }
        const pulse = 0.5 + Math.sin(time / 400 + d.pair) * 0.5;
        g.lineStyle(2, lit(d.frame, 0.4), 0.2 + pulse * 0.25); g.strokeCircle(d.at.x, d.at.y, 30);
        // A painted threshold mat where the door "opens".
        g.fillStyle(d.frame, 0.2); g.fillEllipse(d.exit.x, d.exit.y, 46, 16);
      }
      // The holes.
      for (const h of holes) {
        if (time < h.paintAt) continue;
        const grow = clamp((time - h.paintAt) / PAINT_MS, 0, 1);
        const fade = time > h.fadeAt ? clamp(1 - (time - h.fadeAt) / 500, 0, 1) : 1;
        const r = HOLE_R * grow;
        if (h.smeared) {
          // A fake, smeared by a foot: a streak of umber and black running away.
          g.fillStyle(UMBER, 0.35 * fade); g.fillEllipse(h.x + 6, h.y + 4, r * 2.6, r * 0.9);
          g.fillStyle(LAMPBLACK, 0.25 * fade); g.fillEllipse(h.x + 14, h.y + 6, r * 1.6, r * 0.5);
          continue;
        }
        // A perfect painted hole: lit rim, a shadowed inner wall, a black throat.
        g.fillStyle(0xf6efe2, 0.9 * fade); g.fillEllipse(h.x, h.y - 2, r * 2.3, r * 1.5);
        g.fillStyle(UMBER, fade); g.fillEllipse(h.x, h.y, r * 2.05, r * 1.32);
        g.fillStyle(UMBER_DARK, fade); g.fillEllipse(h.x, h.y + r * 0.12, r * 1.75, r * 1.05);
        g.fillStyle(LAMPBLACK, fade); g.fillEllipse(h.x, h.y + r * 0.22, r * 1.3, r * 0.72);
        // Painted cracks in the flags round the lip.
        for (let i = 0; i < 5; i++) {
          const a = h.seed + i * 1.3;
          g.lineStyle(1, STONE_DARK, 0.7 * fade);
          g.lineBetween(h.x + Math.cos(a) * r * 1.05, h.y + Math.sin(a) * r * 0.7, h.x + Math.cos(a) * r * 1.45, h.y + Math.sin(a) * r * 0.95);
        }
        // Revealed: a real hole's lip breaks open; a fake one runs.
        if (time < h.revealUntil) {
          const k = clamp((h.revealUntil - time) / 600, 0, 1);
          if (h.real) {
            g.lineStyle(3, 0xff7a5a, 0.8 * k); g.strokeEllipse(h.x, h.y, r * 2.3, r * 1.5);
            for (let i = 0; i < 6; i++) { g.fillStyle(STONE_DARK, k); g.fillRect(h.x - r + i * r * 0.4, h.y - r * 0.8 - (i % 2) * 4, 4, 4); }
          } else {
            g.lineStyle(2, VIRIDIAN, 0.8 * k); g.strokeEllipse(h.x, h.y, r * 2.3, r * 1.5);
            for (let i = 0; i < 4; i++) { g.fillStyle(UMBER, 0.8 * k); g.fillRect(h.x - r * 0.6 + i * r * 0.4, h.y + r * 0.5, 3, 8 + i * 3); }
          }
        }
      }
    },

    drawAir(g, time) {
      // Faux's brush flicks paint out to each hole as he lays it down.
      if (flickAt >= 0 && alive(npc)) {
        for (const h of holes) {
          if (time < h.paintAt || time > h.liveAt) continue;
          const k = clamp((time - h.paintAt) / PAINT_MS, 0, 1);
          const x = npc.x + (h.x - npc.x) * k, y = npc.y + (h.y - npc.y) * k - Math.sin(k * Math.PI) * 60;
          g.fillStyle(UMBER, 1); g.fillCircle(x, y, 4);
          g.fillStyle(dim(UMBER, 0.3), 0.6); g.fillCircle(x - (h.x - npc.x) * 0.05, y + 2, 3);
        }
      }
      // A fighter who fell: just a head and hands showing over the lip.
      for (const f of [player, npc]) {
        const t = time - (fellAt.get(f) ?? -9999);
        if (t > FALL_MS || !alive(f)) continue;
        g.fillStyle(LAMPBLACK, 0.85); g.fillEllipse(f.x, f.y + 8, 52, 30);
        g.fillStyle(0xf6efe2, 0.9); g.fillEllipse(f.x, f.y - 4, 56, 12);
        for (const k of [-1, 1]) { g.fillStyle(0xf0c8a0, 1); g.fillCircle(f.x + k * 18, f.y - 6 + Math.sin(time / 80 + k) * 2, 4); }
        g.fillStyle(GOLD_LIT, 0.9); for (let i = 0; i < 3; i++) g.fillCircle(f.x - 10 + i * 10, f.y - 30 - ((time / 6 + i * 20) % 20), 2);
      }
      // Fresh out of a door: a ripple in the paint where they stepped through.
      for (const d of doors) {
        const ripple = (time / 900 + d.pair * 0.25) % 1;
        g.lineStyle(1.5, d.frame === GOLD ? GOLD_LIT : ULTRAMARINE, 0.25 * (1 - ripple));
        g.strokeEllipse(d.exit.x, d.exit.y, 30 + ripple * 30, 10 + ripple * 10);
      }
    },

    destroy() { clearHoles(); },
  };
}

export const TROMPE: GimmickDef = {
  id: 'mural-trompe',
  rules: 'Painted doors carry you to their twin. Some painted holes are real and drop you; Faux knows which — watch his feet, strike to test, dash over.',
  make,
};
