import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';
import { SIDE, SIDE_CSS, WHO, type Who, alive, clamp, dist, fighterOf, onFloor, otherOf } from './util';

/**
 * DECREE OF THE SOUL MADE PLAIN — Councilor Morrow Vigil, Seat of Lanterns (Soul).
 *
 * He drafted the Lantern Clause: no soul may lie in the dark, not even inside its own body. Here
 * every soul is drawn a step out and made to walk behind its owner — a glass-clear likeness on a
 * thread of light, treading exactly where its owner trod a second ago.
 *   - A blow that reaches someone's SOUL lands on them 60% harder (it strikes the soul, then the
 *     body feels it). Shots fly on through a soul, so one line can take body and soul both.
 *   - While a soul has strayed from its body the BODY is hard to hurt (it takes 45% less).
 *   - Stand still and your soul catches up and settles in: no soul to strike — but a body with
 *     its soul at home takes everything.
 * He fights with a lantern whose beam pierces a whole line. He walks round you until your soul
 * and your body stand in a row, and fires down the row. The trick: his soul trails him too — when
 * he chases you, it is right behind him, in a line with him. Shoot the line.
 */

const DELAY_MS = 950;
const SOUL_R = 22;
const HOME = 30;

interface Soul { trail: { t: number; x: number; y: number }[]; x: number; y: number; target: StrikeTarget | null; struckFx: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const SOUL_MULT = ctx.hard ? 0.75 : 0.6;
  const souls: Record<Who, Soul> = {
    player: { trail: [], x: ctx.player.x, y: ctx.player.y, target: null, struckFx: 0 },
    npc: { trail: [], x: ctx.npc.x, y: ctx.npc.y, target: null, struckFx: 0 },
  };
  let announced = false;

  const strayed = (w: Who): boolean => {
    const f = fighterOf(ctx, w);
    return dist(f.x, f.y, souls[w].x, souls[w].y) > HOME;
  };

  function struck(w: Who, by: 'player' | 'npc', amount: number): void {
    if (by === w || amount <= 0) return;
    const f = fighterOf(ctx, w);
    const s = souls[w];
    if (!alive(f) || !strayed(w)) return;
    ctx.hit(f, amount * SOUL_MULT, s.x, s.y);
    s.struckFx = ctx.scene.time.now;
    ctx.float(s.x, s.y - 30, 'SOUL', SIDE_CSS[otherOf(w)]);
    ctx.sfx('hush');
  }

  for (const w of WHO) {
    souls[w].target = ctx.target({ x: souls[w].x, y: souls[w].y, r: SOUL_R, passThrough: true, onStruck: (by, amount) => struck(w, by, amount) });
  }

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('YOUR SOUL WALKS BEHIND YOU', '#e8eef4'); ctx.sfx('holy-chord'); }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const s = souls[w];
        s.trail.push({ t: time, x: f.x, y: f.y });
        while (s.trail.length > 2 && s.trail[1].t <= time - DELAY_MS) s.trail.shift();
        // Where the owner stood a second ago; if they have stood still, the soul settles home.
        const back = s.trail[0];
        s.x += (back.x - s.x) * 0.35; s.y += (back.y - s.y) * 0.35;
        // A soul at home is not there to be struck: park its target out of the fight.
        if (s.target) {
          if (alive(f) && strayed(w)) s.target.moveTo(s.x, s.y);
          else s.target.moveTo(-400, -400);
        }
      }
    },

    playerTakenMult() { return strayed('player') ? 0.55 : 1; },
    npcTakenMult() { return strayed('npc') ? 0.55 : 1; },

    npcSeek() {
      const p = ctx.player, n = ctx.npc;
      const s = souls.player;
      if (!strayed('player')) {
        // A settled soul: keep a lantern's length off and wait for them to move.
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        return onFloor(ctx, p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240);
      }
      // Stand on the far side of their soul, looking through it at them: one beam, two hits.
      const dx = s.x - p.x, dy = s.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      return onFloor(ctx, s.x + (dx / d) * 200, s.y + (dy / d) * 200, 60);
    },

    drawGround(g) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const s = souls[w];
        if (!alive(f) || !strayed(w)) continue;
        // Its footprints: where the soul has yet to tread, faint lit prints along the owner's path.
        for (let i = 0; i < s.trail.length; i += 6) {
          const p = s.trail[i];
          const k = i / Math.max(1, s.trail.length);
          g.fillStyle(SIDE[w], 0.08 + k * 0.1); g.fillEllipse(p.x, p.y + 16, 10, 5);
        }
        g.fillStyle(0x000000, 0.2); g.fillEllipse(s.x, s.y + 18, 26, 8);
      }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        drawSoul(g, w, f.x, f.y, time);
      }
    },
  };

  /** A soul: a clear likeness of its owner in glass light, on a thread to the body, lantern-lit. */
  function drawSoul(g: G, w: Who, bx: number, by: number, time: number): void {
    const s = souls[w];
    const c = SIDE[w];
    const t = time / 1000;
    const out = strayed(w);
    if (!out) {
      // At home: a faint halo and a little lantern-flame over the head.
      g.lineStyle(1, c, 0.35); g.strokeCircle(bx, by, 26 + Math.sin(t * 3) * 1.5);
      g.fillStyle(c, 0.6); g.fillTriangle(bx - 3, by - 38, bx + 3, by - 38, bx, by - 47);
      return;
    }
    const d = dist(bx, by, s.x, s.y);
    // The thread of light: a sagging line with beads running toward the soul.
    const mx = (bx + s.x) / 2, my = (by + s.y) / 2 + Math.min(30, d * 0.15);
    g.lineStyle(3, c, 0.12);
    g.beginPath(); g.moveTo(bx, by - 6);
    for (let i = 1; i <= 12; i++) {
      const k = i / 12;
      const qx = (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * mx + k * k * s.x;
      const qy = (1 - k) * (1 - k) * (by - 6) + 2 * (1 - k) * k * my + k * k * (s.y - 6);
      g.lineTo(qx, qy);
    }
    g.strokePath();
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.9 + i / 4) % 1);
      const qx = (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * mx + k * k * s.x;
      const qy = (1 - k) * (1 - k) * (by - 6) + 2 * (1 - k) * k * my + k * k * (s.y - 6);
      g.fillStyle(NOON.starCore, 0.8); g.fillCircle(qx, qy, 1.6);
    }
    // The soul: a translucent body like a Clear's, a bright core, a glass lantern-cage round it.
    const hit = clamp(1 - (time - s.struckFx) / 300, 0, 1);
    const bob = Math.sin(t * 2.4 + (w === 'npc' ? 1 : 0)) * 2;
    g.fillStyle(c, 0.08 + hit * 0.2); g.fillCircle(s.x, s.y + bob, 30);
    g.fillStyle(NOON.clear, 0.22 + hit * 0.4); g.fillCircle(s.x, s.y + bob, SOUL_R - 2);
    g.lineStyle(1.5, c, 0.75); g.strokeCircle(s.x, s.y + bob, SOUL_R - 2);
    g.fillStyle(c, 0.5); g.fillCircle(s.x - 6, s.y - 3 + bob, 3); g.fillCircle(s.x + 6, s.y - 3 + bob, 3);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(s.x, s.y + 4 + bob, 3.5);
    // The cage: four glass ribs and a brass ring on top — the Lantern Court's lantern, emptied.
    g.lineStyle(1, OBS.edge, 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 0.6;
      const rx = Math.cos(a) * (SOUL_R + 4);
      g.lineBetween(s.x + rx * 0.9, s.y - SOUL_R - 4 + bob, s.x + rx, s.y + SOUL_R + 2 + bob);
    }
    g.lineStyle(2, NOON.brass, 0.8); g.strokeEllipse(s.x, s.y - SOUL_R - 4 + bob, 22, 6);
    g.lineStyle(1, NOON.brass, 0.6); g.strokeEllipse(s.x, s.y + SOUL_R + 2 + bob, 30, 7);
    if (hit > 0) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.lineStyle(2, 0xffffff, hit); g.lineBetween(s.x + Math.cos(a) * 18, s.y + Math.sin(a) * 18, s.x + Math.cos(a) * (26 + (1 - hit) * 20), s.y + Math.sin(a) * (26 + (1 - hit) * 20));
      }
    }
  }
}

export const SOUL_MADE_PLAIN: GimmickDef = {
  id: 'bench-light-soul-made-plain',
  rules: 'No soul hides in its body: each walks a second behind. A blow to the soul lands 60% harder; a body whose soul has strayed takes 45% less.',
  make,
};
