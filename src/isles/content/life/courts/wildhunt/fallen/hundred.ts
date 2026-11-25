import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GILT, GRAVEL, HUNT_RED, MOSS, MOSS_LIT, SUN, TIMBER, TIMBER_DARK, TIMBER_LIT, VERDIGRIS, clamp, dist } from '../util';
import { EMBER, alive } from './kit';

/**
 * The Count of a Hundred — Mabyn Clew, the Starter: the Prince's old tutor in venery, who stood at
 * the start post with the sandglass on every Quarry Run and counted the family's head start aloud,
 * one to a hundred, and in the King's telling never once counted slowly.
 *
 * Two turns, over and over. **The Count**: Mabyn is held at the start post while the glass runs —
 * each blow she takes makes her count faster. **The Run**: at a hundred she is loosed, quick as a
 * hound, and one of the four old bound-stones at the corners lights. The old forest law says quarry
 * that touches a lit bound is free: reach it before the glass runs out or you are run down.
 *
 * Exploit: the bound-stone is a stone of the old law, and she knows it — so she runs to stand on
 * the way to it. Strike the lit stone while she is beside it and the law rebukes her, stunning and
 * hurting her, and the run is over. At half, the bounds move: halfway through each run the light
 * jumps to another stone, the new one flickering a moment first.
 */

const ID = fallenId('wildhunt', 'hundred');
const COUNT_RATE = 13;
const RUN_MS = 10500;
const BOUND_R = 46;
const REBUKE_R = 115;

type Phase = 'count' | 'run';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const post: Pt = { x: W / 2, y: (top + H) / 2 };
  const stones: Pt[] = [{ x: 110, y: top + 80 }, { x: W - 110, y: top + 80 }, { x: 110, y: H - 70 }, { x: W - 110, y: H - 70 }];
  let phase: Phase = 'count';
  let count = 0;
  let runEnd = 0;
  let runStart = 0;
  let lit = 0;
  let next = -1;
  let moved = false;
  let shifting = false;
  let freedAt = -1e9;
  let rebukeAt = -1e9;

  const targets: StrikeTarget[] = stones.map((s, i) => ctx.target({
    x: s.x, y: s.y - 22, r: 24,
    onStruck: (by) => {
      if (phase !== 'run' || i !== lit || by !== 'player') return;
      if (dist(npc.x, npc.y, s.x, s.y) > REBUKE_R) return;
      rebukeAt = tk.now;
      ctx.stun(npc, 1300);
      ctx.hit(npc, 26, npc.x, npc.y);
      ctx.float(npc.x, npc.y - 60, 'THE OLD LAW', '#d8f0c8');
      ctx.sfx('holy-chord');
      endRun(tk.now, true);
    },
  }));

  /** Pick the stone farthest from the player, not the one just used. */
  function farStone(not: number, maxD = Infinity): number {
    let best = 0, bd = -1;
    for (let i = 0; i < stones.length; i++) {
      if (i === not) continue;
      const d = dist(player.x, player.y, stones[i].x, stones[i].y);
      if (d > bd && d <= maxD) { bd = d; best = i; }
    }
    return best;
  }

  function startRun(time: number): void {
    phase = 'run'; runStart = time; runEnd = time + RUN_MS; moved = false; next = -1;
    lit = farStone(lit);
    ctx.banner('A HUNDRED — RUN', '#ffcf8a');
    ctx.sfx('countdown-go');
  }

  function endRun(time: number, free: boolean): void {
    phase = 'count'; count = 0;
    if (free) { freedAt = time; ctx.silence(npc, 1500); ctx.sfx('crystal-chime'); }
  }

  return {
    update(time, dt) {
      if (!shifting && npc.hp < npc.maxHp * 0.5) {
        shifting = true;
        ctx.banner('THE BOUNDS MOVE', '#ffcf8a');
      }
      if (phase === 'count') {
        const before = Math.floor(count / 10);
        count += COUNT_RATE * dt;
        if (Math.floor(count / 10) !== before) ctx.sfx('clock-tick');
        if (count >= 100) startRun(time);
        return;
      }
      // The run.
      if (shifting && !moved) {
        const mid = runStart + RUN_MS * 0.5;
        if (next < 0 && time >= mid - 1200) next = farStone(lit, 720);
        if (time >= mid) { lit = next; moved = true; next = -1; ctx.sfx('teleport'); }
      }
      const s = stones[lit];
      if (alive(player) && dist(player.x, player.y, s.x, s.y) < BOUND_R + 16) {
        ctx.banner('SANCTUARY', '#d8f0c8');
        endRun(time, true);
        return;
      }
      if (time >= runEnd) {
        ctx.banner('RUN DOWN', '#ff8a6a');
        tk.hitPlayer(26, player.x, player.y);
        ctx.stun(player, 700);
        ctx.sfx('roar');
        endRun(time, false);
      }
    },

    onNpcHurt() { if (phase === 'count') count += 5; },

    npcSpeedMult() { return phase === 'count' ? 0.3 : 1.45; },

    npcSeek() {
      if (!alive(npc)) return null;
      if (phase === 'count') return post;
      // Stand on the way to the lit bound, a little out from it.
      const s = stones[next >= 0 ? next : lit];
      const a = Math.atan2(player.y - s.y, player.x - s.x);
      const d = clamp(dist(player.x, player.y, s.x, s.y) * 0.5, 60, 140);
      return { x: tk.clampX(s.x + Math.cos(a) * d), y: tk.clampY(s.y + Math.sin(a) * d) };
    },

    drawGround(g, time) {
      // The start post's trodden ring, and the old bound-stones on their mossy mounds.
      g.fillStyle(GRAVEL, 0.25); g.fillEllipse(post.x, post.y + 6, 160, 56);
      g.lineStyle(2, TIMBER_LIT, 0.35); g.strokeEllipse(post.x, post.y + 6, 160, 56);
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        const on = phase === 'run' && i === lit;
        const soon = phase === 'run' && i === next && Math.sin(time / 50) > 0;
        g.fillStyle(MOSS, 0.8); g.fillEllipse(s.x, s.y + 4, BOUND_R * 2.4, BOUND_R);
        g.fillStyle(MOSS_LIT, 0.4); g.fillEllipse(s.x - 10, s.y, BOUND_R * 1.2, BOUND_R * 0.4);
        if (on || soon) {
          g.lineStyle(3, 0xd8f0c8, on ? 0.7 + Math.sin(time / 120) * 0.25 : 0.5);
          g.strokeEllipse(s.x, s.y + 4, (BOUND_R + 16) * 2, (BOUND_R + 16) * 0.8);
          if (on) glow(g, s.x, s.y, 80, 0xd8f0c8, 0.05, 3);
        }
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < stones.length; i++) {
        const on = phase === 'run' && i === lit;
        drawBound(g, stones[i], on, time, i);
      }
      drawPost(g, post, phase === 'count' ? count / 100 : 1, time);
      if (time - rebukeAt < 700) {
        const k = (time - rebukeAt) / 700;
        g.lineStyle(4 * (1 - k), 0xd8f0c8, 1 - k); g.strokeCircle(npc.x, npc.y - 10, 20 + k * 90);
      }
      if (time - freedAt < 900) {
        const k = (time - freedAt) / 900;
        for (let j = 0; j < 8; j++) {
          const a = j * 0.785 + k * 2;
          g.fillStyle(0xd8f0c8, 1 - k); g.fillCircle(player.x + Math.cos(a) * (20 + k * 40), player.y - 20 + Math.sin(a) * (10 + k * 20), 3);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 78, y - 14, 156, 28, 8);
      if (phase === 'count') {
        // Ten tallies, one for every ten counted.
        for (let i = 0; i < 10; i++) {
          const on = count >= (i + 1) * 10;
          g.lineStyle(3, on ? HUNT_RED : 0x4a4038, 1);
          g.lineBetween(x - 60 + i * 13, y - 8, x - 62 + i * 13, y + 8);
        }
      } else {
        // The run's sandglass draining, and a pip for the lit bound's corner.
        const k = clamp((runEnd - time) / RUN_MS, 0, 1);
        drawGlass(g, x - 40, y, k);
        const c = stones[lit];
        const px = x + 20 + (c.x > W / 2 ? 30 : 0), py = y - 7 + (c.y > H / 2 ? 14 : 0);
        for (let i = 0; i < 4; i++) { g.fillStyle(0x3a3428, 1); g.fillRect(x + 16 + (i % 2) * 30, y - 11 + Math.floor(i / 2) * 14, 12, 8); }
        g.fillStyle(0xd8f0c8, 1); g.fillRect(px - 4, py - 4, 12, 8);
      }
    },

    destroy() { for (const t of targets) t.remove(); },
  };
}

/** A sandglass in a turned frame: the top bulb empties as `k` falls. */
function drawGlass(g: G, x: number, y: number, k: number): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 10, y - 13, 20, 3); g.fillRect(x - 10, y + 10, 20, 3);
  g.lineStyle(1.5, 0xd8e8e8, 0.8);
  g.strokeTriangle(x - 7, y - 10, x + 7, y - 10, x, y); g.strokeTriangle(x - 7, y + 10, x + 7, y + 10, x, y);
  g.fillStyle(SUN, 0.9);
  g.fillTriangle(x - 7 * k, y - 10 * k, x + 7 * k, y - 10 * k, x, y);
  g.fillTriangle(x - 7 * (1 - k), y + 10, x + 7 * (1 - k), y + 10, x, y + 10 - 10 * (1 - k));
  if (k > 0) { g.lineStyle(1, SUN, 1); g.lineBetween(x, y, x, y + 10); }
}

/** An old bound-stone: a lichened standing stone with the forest law's leaf cut in it. */
function drawBound(g: G, s: Pt, on: boolean, time: number, i: number): void {
  shadow(g, s.x, s.y + 2, 40, 12, 0.35);
  g.fillStyle(0x5a5a50, 1);
  g.fillPoints([{ x: s.x - 15, y: s.y }, { x: s.x - 13, y: s.y - 40 }, { x: s.x - 4, y: s.y - 50 }, { x: s.x + 10, y: s.y - 46 }, { x: s.x + 15, y: s.y }], true);
  g.fillStyle(0x7a7a6e, 1);
  g.fillPoints([{ x: s.x - 11, y: s.y - 2 }, { x: s.x - 10, y: s.y - 38 }, { x: s.x - 4, y: s.y - 46 }, { x: s.x + 1, y: s.y - 44 }, { x: s.x - 2, y: s.y - 2 }], true);
  g.fillStyle(VERDIGRIS, 0.5); g.fillCircle(s.x + 6, s.y - 12, 4); g.fillCircle(s.x - 8, s.y - 30 + (i % 2) * 6, 3);
  const c = on ? 0xd8f0c8 : 0x3a3a34;
  g.lineStyle(2, c, on ? 0.8 + Math.sin(time / 100) * 0.2 : 1);
  g.lineBetween(s.x, s.y - 14, s.x, s.y - 36);
  g.lineBetween(s.x, s.y - 30, s.x - 6, s.y - 36); g.lineBetween(s.x, s.y - 30, s.x + 6, s.y - 36);
  g.lineBetween(s.x, s.y - 22, s.x - 7, s.y - 28); g.lineBetween(s.x, s.y - 22, s.x + 7, s.y - 28);
  if (on) glow(g, s.x, s.y - 26, 28, 0xd8f0c8, 0.1, 3);
}

/** The start post: a stake with the hunt's knotted cord, the sandglass on its shelf, gold on the turn. */
function drawPost(g: G, p: Pt, k: number, time: number): void {
  shadow(g, p.x, p.y + 4, 40, 12, 0.4);
  g.lineStyle(8, TIMBER_DARK, 1); g.lineBetween(p.x, p.y, p.x, p.y - 70);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(p.x - 2, p.y, p.x - 2, p.y - 70);
  for (let i = 0; i < 4; i++) { g.fillStyle(HUNT_RED, 1); g.fillCircle(p.x + 5, p.y - 20 - i * 9, 2.6); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 14, p.y - 74, 28, 4);
  // The glass on top, turned at every count's start.
  const y = p.y - 88;
  g.fillStyle(GILT, 1); g.fillRect(p.x - 10, y - 13, 20, 3); g.fillRect(p.x - 10, y + 10, 20, 3);
  g.lineStyle(1.5, 0xd8e8e8, 0.9);
  g.strokeTriangle(p.x - 8, y - 10, p.x + 8, y - 10, p.x, y); g.strokeTriangle(p.x - 8, y + 10, p.x + 8, y + 10, p.x, y);
  const top = 1 - k;
  g.fillStyle(SUN, 1);
  g.fillTriangle(p.x - 8 * top, y - 10 * top, p.x + 8 * top, y - 10 * top, p.x, y);
  g.fillTriangle(p.x - 8 * k, y + 10, p.x + 8 * k, y + 10, p.x, y + 10 - 10 * k);
  glow(g, p.x, y, 26, EMBER, 0.05 + Math.sin(time / 300) * 0.02, 2);
}

export const FALLEN_HUNDRED: GimmickDef = {
  id: ID,
  rules: 'Mabyn counts to a hundred, held at her post, then runs you. Reach the lit bound-stone in time, or strike it while she stands by it.',
  make,
};
