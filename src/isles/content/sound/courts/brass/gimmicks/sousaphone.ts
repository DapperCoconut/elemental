import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { giantHorn, note } from '../art';
import { BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, CREAM, NAVY_DARK } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Sousaphone — Tubist Oompah.
 *
 * Four giant sousaphones are bolted to the walls, their bells turned across the room, and a
 * brass mouthpiece pad is set in the floor beside each, piped to its horn. Step on a pad and you
 * blow: the horn draws breath (its bell glows, its cone of sound is marked on the floor), then
 * gives one enormous OOM — everyone in the cone is struck and blown back down it, the blower
 * included if they are foolish enough to be standing in front of their own horn.
 *
 * Oompah plays the pads like a man who has played nothing else for thirty years. So can you:
 * every horn is anyone's, and a blast through the foe hurls him the length of the room.
 */

const PAD_R = 30;
const HALF = 0.3;
const REACH = 780;
const WAVE = 1150;
const BLAST_DMG = 14;
const PUSH = 150;
const COOL_MS = 3800;

interface Horn {
  bx: number; by: number; a: number;
  px: number; py: number;
  /** When the breath was drawn (−1 = idle). */
  windAt: number;
  blowAt: number;
  coolUntil: number;
  blower: Fighter | null;
  hit: Set<Fighter>;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const WIND = ctx.hard ? 620 : 760;
  const midY = (top + H) / 2;
  const horns: Horn[] = [
    { bx: 34, by: top + (H - top) * 0.32, a: 0, px: 92, py: top + (H - top) * 0.32 + 128 },
    { bx: W - 34, by: top + (H - top) * 0.68, a: Math.PI, px: W - 92, py: top + (H - top) * 0.68 - 128 },
    { bx: W * 0.64, by: top + 22, a: Math.PI / 2, px: W * 0.64 + 132, py: top + 56 },
    { bx: W * 0.36, by: H - 22, a: -Math.PI / 2, px: W * 0.36 - 132, py: H - 56 },
  ].map((h) => ({ ...h, windAt: -1, blowAt: -1, coolUntil: 0, blower: null, hit: new Set<Fighter>() }));

  const inCone = (h: Horn, x: number, y: number) => {
    const d = dist(h.bx, h.by, x, y);
    if (d > REACH || d < 6) return false;
    const off = Math.abs(wrapAngle(Math.atan2(y - h.by, x - h.bx) - h.a));
    // The cone widens a little at the mouth so a fighter hugging the bell is still in it.
    return off < HALF + 22 / Math.max(40, d);
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      for (const h of horns) {
        // Somebody on the pad blows, if the horn has its breath back.
        if (h.windAt < 0 && time >= h.coolUntil) {
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, h.px, h.py) > PAD_R + 6) continue;
            h.windAt = time;
            h.blower = f;
            h.blowAt = -1;
            ctx.sfx('beam-charge');
            ctx.float(h.px, h.py - 40, 'HFFFF…', '#ffe2a8');
            break;
          }
        }
        if (h.windAt >= 0 && h.blowAt < 0 && time >= h.windAt + WIND) {
          h.blowAt = time;
          h.hit.clear();
          ctx.sfx('sonic-pulse');
          ctx.sfx('train-horn');
          ctx.flash(h.bx, h.by, BRASS_LIT);
        }
        if (h.blowAt >= 0) {
          const front = (time - h.blowAt) / 1000 * WAVE;
          for (const f of [player, npc]) {
            if (!alive(f) || h.hit.has(f)) continue;
            const d = dist(h.bx, h.by, f.x, f.y);
            if (d > front || !inCone(h, f.x, f.y)) continue;
            h.hit.add(f);
            ctx.hit(f, BLAST_DMG, f.x, f.y);
            ctx.nudge(f, Math.cos(h.a) * PUSH, Math.sin(h.a) * PUSH);
            ctx.float(f.x, f.y - 46, 'OOM!', '#ffe08a');
          }
          if (front > REACH + 60) {
            h.windAt = -1; h.blowAt = -1; h.blower = null;
            h.coolUntil = time + COOL_MS;
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Out of any cone that is about to blow or blowing.
      for (const h of horns) {
        if (h.windAt < 0 || h.blower === npc) continue;
        if (inCone(h, npc.x, npc.y)) {
          const pa = h.a + Math.PI / 2;
          const side = wrapAngle(Math.atan2(npc.y - h.by, npc.x - h.bx) - h.a) > 0 ? 1 : -1;
          return { x: clamp(npc.x + Math.cos(pa) * side * 160, 60, W - 60), y: clamp(npc.y + Math.sin(pa) * side * 160, top + 50, H - 40) };
        }
      }
      // To a pad whose horn has you in its cone (or close to it).
      let best: { x: number; y: number } | null = null;
      let bs = Infinity;
      for (const h of horns) {
        if (h.windAt >= 0 || ctx.scene.time.now < h.coolUntil) continue;
        const off = Math.abs(wrapAngle(Math.atan2(player.y - h.by, player.x - h.bx) - h.a));
        if (off > HALF * 1.8) continue;
        const s = dist(npc.x, npc.y, h.px, h.py) + off * 400;
        if (s < bs) { bs = s; best = { x: h.px, y: h.py }; }
      }
      if (best) return best;
      // Otherwise keep near the middle, off the cones' axes.
      return { x: clamp(player.x + (npc.x < player.x ? -200 : 200), 80, W - 80), y: clamp(midY + (player.y < midY ? 110 : -110), top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const h of horns) {
        // The pipe from pad to horn, laid in the floor.
        g.lineStyle(7, BRASS_DEEP, 0.7); g.lineBetween(h.px, h.py, h.bx - Math.cos(h.a) * 50, h.by - Math.sin(h.a) * 50);
        g.lineStyle(4, BRASS_DARK, 0.9); g.lineBetween(h.px, h.py, h.bx - Math.cos(h.a) * 50, h.by - Math.sin(h.a) * 50);
        // The mouthpiece pad: a brass cup set in the floor, sunk when it is being blown.
        const pressed = h.windAt >= 0 && h.blowAt < 0;
        const ready = h.windAt < 0 && time >= h.coolUntil;
        g.fillStyle(NAVY_DARK, 0.5); g.fillEllipse(h.px, h.py + 4, PAD_R * 2.3, PAD_R * 1.1);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(h.px, h.py, PAD_R);
        g.fillStyle(ready ? BRASS : dim(BRASS, 0.35), 1); g.fillCircle(h.px, h.py - (pressed ? 0 : 2), PAD_R - 4);
        g.fillStyle(BRASS_DEEP, 1); g.fillCircle(h.px, h.py - (pressed ? 0 : 2), PAD_R * 0.45);
        g.lineStyle(2, BRASS_SHINE, ready ? 0.8 : 0.3); g.strokeCircle(h.px, h.py - (pressed ? 0 : 2), PAD_R * 0.62);
        if (ready) { g.lineStyle(2, BRASS_LIT, 0.3 + Math.sin(time / 260 + h.bx) * 0.2); g.strokeCircle(h.px, h.py, PAD_R + 6); }
        else if (time < h.coolUntil) {
          // Refilling: an arc showing the horn getting its breath back.
          const k = 1 - (h.coolUntil - time) / COOL_MS;
          g.lineStyle(3, CREAM, 0.6); g.beginPath(); g.arc(h.px, h.py, PAD_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        // The cone: marked while the breath is drawn, alive while the blast runs down it.
        if (h.windAt >= 0) {
          const k = h.blowAt < 0 ? clamp((time - h.windAt) / WIND, 0, 1) : 1;
          const fill = h.blowAt < 0 ? 0.05 + k * 0.12 : 0.1;
          g.fillStyle(h.blower === player ? 0x9ad0ff : 0xffb070, fill);
          g.slice(h.bx, h.by, REACH, h.a - HALF, h.a + HALF, false); g.fillPath();
          g.lineStyle(2, BRASS_LIT, 0.3 + k * 0.5);
          g.lineBetween(h.bx, h.by, h.bx + Math.cos(h.a - HALF) * REACH, h.by + Math.sin(h.a - HALF) * REACH);
          g.lineBetween(h.bx, h.by, h.bx + Math.cos(h.a + HALF) * REACH, h.by + Math.sin(h.a + HALF) * REACH);
          if (h.blowAt >= 0) {
            const front = (time - h.blowAt) / 1000 * WAVE;
            for (let w = 0; w < 4; w++) {
              const r = front - w * 46;
              if (r < 20 || r > REACH) continue;
              g.lineStyle(9 - w * 2, lit(BRASS_LIT, 0.3), 0.7 - w * 0.15);
              g.beginPath(); g.arc(h.bx, h.by, r, h.a - HALF, h.a + HALF, false); g.strokePath();
            }
          }
        }
      }
      // The horns themselves, bolted to the walls.
      for (const h of horns) {
        const k = h.windAt >= 0 && h.blowAt < 0 ? clamp((time - h.windAt) / WIND, 0, 1) : h.blowAt >= 0 ? 1 : 0;
        giantHorn(g, h.bx, h.by, h.a, 34 + k * 3, k);
      }
    },

    drawAir(g, time) {
      // Great bass notes tumbling out of a blowing bell.
      for (const h of horns) {
        if (h.blowAt < 0) continue;
        const front = (time - h.blowAt) / 1000 * WAVE;
        for (let i = 0; i < 5; i++) {
          const r = front * (0.5 + i * 0.12);
          if (r > REACH) continue;
          const a = h.a + (i - 2) * HALF * 0.4;
          note(g, h.bx + Math.cos(a) * r, h.by + Math.sin(a) * r, 6, BRASS_LIT, i % 2 ? 'minim' : 'crotchet', 0.9);
        }
      }
    },
  };
}

export const SOUSAPHONE: GimmickDef = {
  id: 'brass-sousaphone',
  rules: 'Step on a mouthpiece pad and its wall horn draws breath, then blasts its cone: everyone in it is struck and blown back. The foe plays the pads too.',
  make,
};
