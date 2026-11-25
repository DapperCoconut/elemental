import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { GRAVEL, GRAVEL_DARK, GRAVEL_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, VERDIGRIS, VERDIGRIS_LIT } from '../palette';
import { alive, clamp } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Raked at Dawn — Ephraim Harrow, who rakes the Bloom Court's gravel walks every morning before the
 * gardens wake. In the King's telling he read the night's footprints before he raked them out, and
 * the Weigh-Warden always knew which household had crept north in the dark.
 *
 * A rake as wide as the walk comes in from one side and combs the whole floor. Its teeth are marked
 * across the gravel before it enters, so you can see the furrows it will cut: stand between two
 * teeth and it passes clean over you; stand in a tooth's line and the teeth catch you and *drag* you
 * with it, all the way to the far edge, where it heaps you into the gravel with everything else it
 * gathered. A dash breaks out of the teeth.
 *
 * The rake's head can be struck as it passes: once a pass, the blow knocks it half a tooth sideways
 * — so everyone standing safe in a gap is suddenly in a tooth's line. Use it on Harrow when he has
 * settled into a gap; he will use it on you. From half, two rakes comb at once, crosswise, and only
 * the squares between both sets of teeth are safe.
 */

const ID = fallenId('bloom', 'raked-at-dawn');
const PITCH = 112;
const TOOTH = 28;
const WARN_MS = 1500;
const SPEED = 230;
const SHIFT_MS = 420;
const HEAD = 26;

interface Rake {
  ux: number; uy: number; nx: number; ny: number;
  start: number; end: number; aLo: number; aHi: number;
  s: number; offset: number; shiftFrom: number; shiftAt: number; shifted: boolean;
  goAt: number; warnAt: number; caught: Set<Fighter>; passed: Set<Fighter>;
  t: StrikeTarget | null; doneAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const corners: Pt[] = [{ x: 0, y: top }, { x: W, y: top }, { x: 0, y: H }, { x: W, y: H }];
  const rakes: Rake[] = [];
  let next = 0;
  let turned = false;
  let side = Math.floor(rng() * 4);

  const along = (r: Rake, x: number, y: number) => x * r.ux + y * r.uy;
  const across = (r: Rake, x: number, y: number) => x * r.nx + y * r.ny;
  const at = (r: Rake, a: number, c: number): Pt => ({ x: a * r.ux + c * r.nx, y: a * r.uy + c * r.ny });
  /** Where the teeth sit across the floor right now (sliding while a knock plays out). */
  const off = (r: Rake, time: number) => (r.shiftAt ? r.shiftFrom + (PITCH / 2) * clamp((time - r.shiftAt) / SHIFT_MS, 0, 1) : r.offset);
  function toothDist(r: Rake, c: number, time: number): number {
    const d = (((c - r.aLo - off(r, time)) % PITCH) + PITCH) % PITCH;
    return Math.min(d, PITCH - d);
  }
  function gapCentre(r: Rake, c: number, time: number): number {
    const base = r.aLo + off(r, time);
    return base + (Math.floor((c - base) / PITCH) + 0.5) * PITCH;
  }

  function launch(dir: number, time: number): void {
    const ux = [1, 0, -1, 0][dir], uy = [0, 1, 0, -1][dir];
    const nx = -uy, ny = ux;
    const al = corners.map((p) => p.x * ux + p.y * uy), ac = corners.map((p) => p.x * nx + p.y * ny);
    const r: Rake = {
      ux, uy, nx, ny, start: Math.min(...al) + 10, end: Math.max(...al) - 34, aLo: Math.min(...ac), aHi: Math.max(...ac),
      s: Math.min(...al) + 10, offset: rng() * PITCH, shiftFrom: 0, shiftAt: 0, shifted: false,
      warnAt: time, goAt: time + tk.warn(WARN_MS), caught: new Set(), passed: new Set(), t: null, doneAt: 0,
    };
    const head = at(r, r.s - HEAD, (r.aLo + r.aHi) / 2);
    r.t = ctx.target({
      x: head.x, y: head.y, r: 34,
      onStruck: (by) => {
        const now = tk.now;
        if (r.shifted || now < r.goAt || r.doneAt) return;
        r.shifted = true;
        r.shiftFrom = r.offset;
        r.shiftAt = now;
        r.offset += PITCH / 2;
        const p = at(r, r.s, across(r, by === 'player' ? player.x : npc.x, by === 'player' ? player.y : npc.y));
        ctx.float(p.x, p.y - 40, 'KNOCKED ASKEW', '#eee4cb');
        ctx.sfx('clang');
      },
    });
    rakes.push(r);
    ctx.sfx('whoosh');
  }

  function slam(r: Rake): void {
    for (const f of r.caught) {
      if (!alive(f)) continue;
      if (f === player) { tk.hitPlayer(16, f.x, f.y); tk.stun(500); }
      else { ctx.hit(npc, 26, f.x, f.y); ctx.stun(npc, 600); ctx.float(f.x, f.y - 56, 'RAKED UP', '#eee4cb'); }
    }
    if (r.caught.size) ctx.sfx('gravity-slam');
    r.caught.clear();
  }

  return {
    update(time, dtS) {
      const dt = clamp(dtS, 0, 0.1);
      if (!next) next = time + 2400;
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('CROSS-RAKED', '#eee4cb');
        ctx.sfx('boss-phase');
      }
      if (!rakes.length && time >= next) {
        side = (side + 1 + Math.floor(rng() * 3)) % 4;
        launch(side, time);
        if (turned) launch((side + 1) % 4, time);
      }
      for (const r of rakes) {
        if (r.doneAt || time < r.goAt) continue;
        if (r.shiftAt && time - r.shiftAt > SHIFT_MS) r.shiftAt = 0;
        r.s += SPEED * dt;
        const head = at(r, r.s - HEAD, (r.aLo + r.aHi) / 2);
        r.t?.moveTo(head.x, head.y);
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const fa = along(r, f.x, f.y);
          if (r.caught.has(f)) {
            // A dash breaks out of the teeth; otherwise you go where the rake goes.
            if (ctx.dashing(f)) { r.caught.delete(f); r.passed.add(f); continue; }
            const want = r.s + 10 - fa;
            if (want > 0) ctx.nudge(f, r.ux * want, r.uy * want);
            continue;
          }
          if (r.passed.has(f) || fa > r.s) continue;
          r.passed.add(f);
          if (toothDist(r, across(r, f.x, f.y), time) < TOOTH) {
            r.caught.add(f);
            ctx.sfx('rock-throw');
            if (f === player) ctx.float(f.x, f.y - 56, 'IN THE TEETH — DASH!', '#ff9a7a');
          }
        }
        if (r.s >= r.end) {
          slam(r);
          r.doneAt = time;
          r.t?.remove(); r.t = null;
        }
      }
      for (let i = rakes.length - 1; i >= 0; i--) if (rakes[i].doneAt && time - rakes[i].doneAt > 1400) rakes.splice(i, 1);
      if (!rakes.length && next < time) next = time + (turned ? 2400 : 3000);
    },

    npcSeek() {
      const live = rakes.filter((r) => !r.doneAt && !r.passed.has(npc));
      if (!live.length) return null;
      const t = tk.now;
      // Into the nearest gap of every rake still to reach him (crosswise rakes: the square between both).
      let x = npc.x, y = npc.y;
      for (const r of live) {
        const c = gapCentre(r, across(r, x, y), t);
        const p = at(r, along(r, x, y), c);
        if (r.nx) x = p.x; else y = p.y;
      }
      return { x: tk.clampX(x), y: tk.clampY(y) };
    },

    drawGround(g, time) {
      for (const r of rakes) {
        const o = off(r, time);
        const teeth: number[] = [];
        for (let c = r.aLo + o - PITCH; c <= r.aHi + PITCH; c += PITCH) teeth.push(c);
        if (time < r.goAt) {
          // The furrows to come, chalked across the gravel, pulsing as it nears.
          const k = clamp((time - r.warnAt) / (r.goAt - r.warnAt), 0, 1);
          for (const c of teeth) {
            for (let a = r.start; a < r.end; a += 36) {
              const p = at(r, a, c), q = at(r, a + 20, c);
              g.lineStyle(TOOTH, GRAVEL_DARK, 0.08 + k * 0.1); g.lineBetween(p.x, p.y, q.x, q.y);
              g.lineStyle(2, GRAVEL_LIT, 0.35 + k * 0.4); g.lineBetween(p.x, p.y, q.x, q.y);
            }
          }
          continue;
        }
        // Furrows cut behind the teeth, and the gravel heaping ahead of the head.
        const s = Math.min(r.s, r.end);
        for (const c of teeth) {
          for (const d of [-5, 5]) {
            const p = at(r, r.start, c + d), q = at(r, s - HEAD, c + d);
            g.lineStyle(2, GRAVEL_DARK, 0.7); g.lineBetween(p.x, p.y, q.x, q.y);
            g.lineStyle(1, GRAVEL_LIT, 0.6); g.lineBetween(p.x + r.nx, p.y + r.ny, q.x + r.nx, q.y + r.ny);
          }
        }
        const heap = clamp((s - r.start) / (r.end - r.start), 0, 1);
        for (let c = r.aLo + 20; c < r.aHi; c += 26) {
          const p = at(r, s + 8 + Math.sin(c) * 3, c);
          g.fillStyle(GRAVEL_DARK, 1); g.fillEllipse(p.x, p.y + 2, 14 + heap * 12, 8 + heap * 6);
          g.fillStyle(GRAVEL, 1); g.fillEllipse(p.x, p.y, 12 + heap * 10, 6 + heap * 5);
          g.fillStyle(GRAVEL_LIT, 1); g.fillCircle(p.x - 2, p.y - 2, 2);
        }
      }
    },

    drawAir(g, time) {
      for (const r of rakes) {
        if (time < r.goAt || r.doneAt) continue;
        drawRake(g, r, at, off(r, time), r.shiftAt > 0);
        for (const f of r.caught) {
          if (!alive(f)) continue;
          g.lineStyle(3, TIMBER_DARK, 0.9);
          g.lineBetween(f.x - r.ux * 22 - r.nx * 12, f.y - r.uy * 22 - r.ny * 12, f.x - r.nx * 12, f.y - r.ny * 12);
          g.lineBetween(f.x - r.ux * 22 + r.nx * 12, f.y - r.uy * 22 + r.ny * 12, f.x + r.nx * 12, f.y + r.ny * 12);
        }
      }
    },

    drawHud(g, time) {
      // Which walls the next rakes come from, and how soon.
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 13, 52, 26, 6);
      g.lineStyle(2, GRAVEL_DARK, 1); g.strokeRect(x - 12, y - 9, 24, 18);
      const live = rakes.filter((r) => !r.doneAt);
      for (const r of live) {
        const k = time < r.goAt ? clamp((time - r.warnAt) / (r.goAt - r.warnAt), 0, 1) : 1;
        g.fillStyle(time < r.goAt ? VERDIGRIS_LIT : TIMBER_LIT, 0.5 + k * 0.5);
        const cx = x - r.ux * 16, cy = y - r.uy * 12;
        g.fillTriangle(cx + r.ux * 6, cy + r.uy * 6, cx - r.nx * 6, cy - r.ny * 6, cx + r.nx * 6, cy + r.ny * 6);
      }
      if (!live.length) { g.fillStyle(VERDIGRIS, 0.6); g.fillRect(x - 10, y + 5, 20 * clamp(1 - (next - time) / 3000, 0, 1), 3); }
    },

    destroy() { for (const r of rakes) r.t?.remove(); },
  };
}

/** The great gravel rake: an oak head the width of the walk, iron-shod teeth, a long ash handle back off the edge. */
function drawRake(g: G, r: Rake, at: (r: Rake, a: number, c: number) => Pt, o: number, sliding: boolean): void {
  const s = r.s;
  const a0 = at(r, s - HEAD, r.aLo), a1 = at(r, s - HEAD, r.aHi);
  const mid = at(r, s - HEAD, (r.aLo + r.aHi) / 2);
  const back = at(r, s - HEAD - 900, (r.aLo + r.aHi) / 2);
  // Handle and its braces.
  g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(mid.x, mid.y - 12, back.x, back.y - 12);
  g.lineStyle(4, TIMBER_LIT, 1); g.lineBetween(mid.x, mid.y - 14, back.x, back.y - 14);
  for (const d of [-150, 150]) {
    const b = at(r, s - HEAD, (r.aLo + r.aHi) / 2 + d), h = at(r, s - HEAD - 110, (r.aLo + r.aHi) / 2);
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(b.x, b.y - 12, h.x, h.y - 12);
  }
  // Teeth: iron-shod pegs reaching forward to the furrow line.
  for (let c = r.aLo + o - PITCH; c <= r.aHi + PITCH; c += PITCH) {
    if (c < r.aLo - 10 || c > r.aHi + 10) continue;
    const p = at(r, s - HEAD, c), q = at(r, s, c);
    shadow(g, q.x, q.y + 3, 22, 7, 0.3);
    g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(p.x, p.y - 10, q.x, q.y - 4);
    g.lineStyle(5, 0x4a4a4e, 1); g.lineBetween(q.x - r.ux * 8, q.y - r.uy * 8 - 5, q.x, q.y - 3);
    g.fillStyle(0x8a8a90, 1); g.fillCircle(q.x, q.y - 3, 3);
    if (sliding) glow(g, q.x, q.y, 16, GRAVEL_LIT, 0.05, 2);
  }
  // The head beam, with its brass-capped ends.
  g.lineStyle(18, TIMBER_DARK, 1); g.lineBetween(a0.x, a0.y - 12, a1.x, a1.y - 12);
  g.lineStyle(12, TIMBER, 1); g.lineBetween(a0.x, a0.y - 14, a1.x, a1.y - 14);
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(a0.x, a0.y - 18, a1.x, a1.y - 18);
  g.fillStyle(VERDIGRIS, 1); g.fillCircle(mid.x, mid.y - 14, 7);
  g.fillStyle(VERDIGRIS_LIT, 1); g.fillCircle(mid.x - 2, mid.y - 16, 2.5);
}

export const FALLEN_RAKED_AT_DAWN: GimmickDef = {
  id: ID,
  rules: 'A great rake combs the floor: stand between its marked teeth or be dragged to the edge (dash free). Strike its head to knock the teeth askew.',
  make,
};
