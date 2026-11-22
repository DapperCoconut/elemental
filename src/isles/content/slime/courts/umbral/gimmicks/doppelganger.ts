import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { blackMirror } from '../art';
import { DUSK_LIT, MOON } from '../palette';
import { Trail, alive, clamp, dist } from '../util';

/**
 * Doppelgänger — Mirrorwright Twin.
 *
 * Twin makes the black mirrors Umbral hangs in every hall — glass that shows not you but the
 * thing that stands a step behind you. In the yard of the mirror-works the step behind is real:
 * each fighter's shadow comes loose and walks their path, a few seconds late, step for step.
 * Your shadow is on your side — it hurts your foe on touch. Theirs hurts you.
 *
 * So every path you walk is a trap you are laying for later, and every path your foe walks is one
 * you must not cross for a few seconds. Walk back into your own shadow and it folds into you and
 * starts again from where you stand. And every so often the mirrors along the walls *turn*: for a
 * few seconds both shadows walk the mirror-image of their paths, from the other side of the yard.
 */

const TOUCH_R = 34;
const SHADOW_DMG = 7;
const REHIT_MS = 900;
const MIRROR_EVERY = 12500;
const MIRROR_WARN = 1200;
const MIRROR_MS = 3200;

interface Double { owner: Fighter; trail: Trail; restartAt: number; hitAt: number; x: number; y: number; on: boolean; foldAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const DELAY = ctx.hard ? 1900 : 2400;
  const doubles: Double[] = [player, npc].map((owner) => ({ owner, trail: new Trail(), restartAt: 0, hitAt: -9999, x: owner.x, y: owner.y, on: false, foldAt: -9999 }));
  let nextMirror = 0;
  let mirrorWarnAt = -1;
  let mirrorUntil = 0;
  let started = false;
  const mirrored = (time: number) => time < mirrorUntil;

  return {
    update(time) {
      if (!started) { started = true; nextMirror = time + MIRROR_EVERY; for (const d of doubles) d.restartAt = time; }
      if (mirrorWarnAt < 0 && time >= nextMirror - MIRROR_WARN) {
        mirrorWarnAt = time;
        ctx.banner('THE MIRRORS TURN', '#b0a0e8');
        ctx.sfx('prism');
      }
      if (time >= nextMirror) {
        nextMirror = time + (ctx.hard ? MIRROR_EVERY * 0.8 : MIRROR_EVERY);
        mirrorWarnAt = -1;
        mirrorUntil = time + MIRROR_MS;
        ctx.sfx('crystal-chime');
      }
      for (const d of doubles) {
        const o = d.owner;
        if (!alive(o)) { d.on = false; continue; }
        d.trail.push(time, o.x, o.y);
        // The shadow walks once it has a few seconds of path behind it.
        d.on = time - d.restartAt >= DELAY;
        if (!d.on) continue;
        const p = d.trail.at(time - DELAY);
        if (!p) { d.on = false; continue; }
        d.x = mirrored(time) ? W - p.x : p.x;
        d.y = p.y;
        const foe = o === player ? npc : player;
        // Touching the foe: a cold bite and a little shove.
        if (alive(foe) && dist(d.x, d.y, foe.x, foe.y) < TOUCH_R && time - d.hitAt > REHIT_MS) {
          d.hitAt = time;
          ctx.hit(foe, ctx.hard ? SHADOW_DMG + 2 : SHADOW_DMG, foe.x, foe.y);
          const a = Math.atan2(foe.y - d.y, foe.x - d.x);
          ctx.nudge(foe, Math.cos(a) * 30, Math.sin(a) * 30);
          ctx.sfx('hit-light');
        }
        // Walking back into your own: it folds into you and starts again.
        // (Only a real return counts — a shadow catching up with someone standing still does not.)
        if (dist(d.x, d.y, o.x, o.y) < TOUCH_R - 6 && time - d.restartAt > DELAY + 400 && !mirrored(time)
          && d.trail.span(time - DELAY, time).some((q) => dist(q.x, q.y, o.x, o.y) > 90)) {
          d.trail.clear();
          d.restartAt = time;
          d.foldAt = time;
          d.on = false;
          ctx.float(o.x, o.y - 46, 'FOLDED', '#b0a0e8');
          ctx.sfx('snap-back');
        }
      }
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Lay its path where the player is going to be: chase the player, but skirt the player's shadow
      // and the next second of the player's path behind it.
      const pd = doubles[0];
      const goal: Pt = { x: player.x + (player.x - npc.x) * 0.2, y: player.y + (player.y - npc.y) * 0.2 };
      if (pd.on) {
        const ahead = pd.trail.at(time - DELAY + 700);
        for (const q of [{ x: pd.x, y: pd.y }, ahead]) {
          if (!q) continue;
          const d = dist(q.x, q.y, npc.x, npc.y);
          if (d < 110) { goal.x = npc.x + ((npc.x - q.x) / Math.max(1, d)) * 140; goal.y = npc.y + ((npc.y - q.y) / Math.max(1, d)) * 140; }
        }
      }
      return { x: clamp(goal.x, 60, W - 60), y: clamp(goal.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The footsteps still to be walked: a faint line from each shadow up to its owner.
      for (const d of doubles) {
        if (!alive(d.owner)) continue;
        const pts = d.trail.span(time - DELAY, time);
        const col = d.owner === player ? 0x9ac8ff : 0xff9a8a;
        for (let i = 0; i < pts.length; i += 3) {
          const p = pts[i];
          const x = mirrored(time) ? W - p.x : p.x;
          g.fillStyle(col, 0.08 + (i / Math.max(1, pts.length)) * 0.12); g.fillEllipse(x, p.y + 12, 9, 4);
        }
        // The shadow on the floor under its own feet.
        if (d.on) { g.fillStyle(0x000000, 0.45); g.fillEllipse(d.x, d.y + 14, 40, 14); }
      }
      // The mirrors turning: a line of reflection down the yard.
      if (mirrored(time) || mirrorWarnAt >= 0) {
        const a = mirrored(time) ? 0.6 : 0.2 + 0.3 * Math.sin(time / 90);
        g.lineStyle(3, DUSK_LIT, a); g.lineBetween(W / 2, top, W / 2, H);
        for (let y = top + 10; y < H; y += 40) { g.lineStyle(1, MOON, a * 0.6); g.lineBetween(W / 2 - 12, y, W / 2 + 12, y + 14); }
      }
    },

    drawAir(g, time) {
      // The black mirrors along both walls, tilting toward the yard when they turn.
      const turn = mirrored(time) ? 6 : mirrorWarnAt >= 0 ? Math.sin(time / 80) * 3 : 0;
      for (let i = 0; i < 4; i++) {
        const y = top + 120 + i * ((H - top - 160) / 3);
        blackMirror(g, 26, y, 0.62, turn);
        blackMirror(g, W - 26, y, 0.62, -turn);
      }
      // The shadows themselves: a dark double of each fighter, pale eyes, edges smoking.
      for (const d of doubles) {
        if (d.foldAt > 0 && time - d.foldAt < 400) {
          const k = (time - d.foldAt) / 400;
          g.lineStyle(3 * (1 - k), DUSK_LIT, 1 - k); g.strokeCircle(d.owner.x, d.owner.y - 10, 30 - k * 20);
        }
        if (!d.on) continue;
        const mine = d.owner === player;
        const x = d.x, y = d.y;
        g.fillStyle(0x05030a, 0.85); g.fillEllipse(x, y - 4, 30, 40); g.fillCircle(x, y - 26, 12);
        for (let i = 0; i < 5; i++) {
          const ph = (time / 500 + i / 5) % 1;
          g.fillStyle(0x05030a, 0.4 * (1 - ph)); g.fillCircle(x + Math.sin(i * 2 + time / 300) * 12, y - 30 - ph * 26, 4 + ph * 4);
        }
        g.lineStyle(1.5, mine ? 0x9ac8ff : 0xff9a8a, 0.55); g.strokeEllipse(x, y - 4, 32, 42);
        const eye = mine ? 0xc8e0ff : 0xffc0b0;
        g.fillStyle(eye, 0.95); g.fillEllipse(x - 4, y - 28, 3.5, 2.2); g.fillEllipse(x + 4, y - 28, 3.5, 2.2);
        // Biting: a flare where it just touched.
        if (time - d.hitAt < 250) { g.lineStyle(3, eye, 1 - (time - d.hitAt) / 250); g.strokeCircle(x, y - 6, TOUCH_R); }
      }
    },
  };
}

export const DOPPELGANGER: GimmickDef = {
  id: 'umbral-doppelganger',
  rules: 'Each shadow walks its owner\'s path a few seconds behind: yours hurts your foe on touch, theirs hurts you. Walk into your own to fold it back in. When the mirrors turn, the shadows walk mirror-wise.',
  make,
};
