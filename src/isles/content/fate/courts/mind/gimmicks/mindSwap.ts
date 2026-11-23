import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { strokeText } from '../art';
import { CRYSTAL, GILT_LIT, IVORY, MIND, MIND_DARK, MIND_LIT } from '../palette';
import { alive, clamp, dist, readiness, setReadiness } from '../util';

/**
 * Mind Swap — Switcher Doppel.
 *
 * Every so often a ripple joins the two fighters — a wavering cord of thought, rings running
 * along it — and when it snaps taut their cooldown clocks *swap*, key for key: whatever the other
 * had ready on E, R and F, you now have ready, and what you had ready is theirs, spent or not.
 *
 * While the cord shimmers, three pips over each head show both fighters' E, R and F — lit for
 * ready, dark for spent. So spend everything just before it snaps and take his full hand; or, if
 * he has just thrown his, save yours and let him have nothing. Stand close when it snaps and the
 * backlash of two minds changing places stings you both.
 */

const KEYS = ['E', 'R', 'F'];
const NEAR = 150;

interface Ghost { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const PERIOD = ctx.hard ? 7500 : 9000;
  const WARN = ctx.hard ? 1700 : 2100;
  let swapAt = 0;
  let warned = false;
  let lastSwap = -9999;
  const ghosts: Ghost[] = [];
  let started = false;

  function swap(time: number): void {
    const mine = KEYS.map((k) => readiness(player, k));
    const theirs = KEYS.map((k) => readiness(npc, k));
    KEYS.forEach((k, i) => { setReadiness(player, k, theirs[i]); setReadiness(npc, k, mine[i]); });
    const gained = theirs.filter((r) => r >= 0.999).length, lost = mine.filter((r) => r >= 0.999).length;
    ctx.float(player.x, player.y - 56, gained > lost ? 'MIND SWAP +' : gained < lost ? 'MIND SWAP -' : 'MIND SWAP', gained >= lost ? '#a8ffb8' : '#ffb0b0');
    ctx.float(npc.x, npc.y - 56, 'SWAPPED', '#e2ccff');
    ctx.flash(player.x, player.y, MIND); ctx.flash(npc.x, npc.y, MIND);
    ctx.sfx('teleport');
    ghosts.push({ x: player.x, y: player.y, at: time }, { x: npc.x, y: npc.y, at: time });
    // Backlash when the two minds change places at close quarters.
    if (dist(player.x, player.y, npc.x, npc.y) < NEAR) {
      ctx.hit(player, 7, player.x, player.y);
      ctx.hit(npc, 7, npc.x, npc.y);
      ctx.sfx('plasma-arc');
    }
    lastSwap = time;
  }

  const warning = (time: number) => time >= swapAt - WARN && time < swapAt;

  return {
    update(time) {
      if (!started) { started = true; swapAt = time + 4000; }
      if (!warned && time >= swapAt - WARN) {
        warned = true;
        ctx.banner('THE MINDS ARE JOINING', '#e2ccff');
        ctx.sfx('beam-charge');
      }
      if (time >= swapAt) {
        if (alive(player) && alive(npc)) swap(time);
        swapAt = time + PERIOD;
        warned = false;
      }
      for (let i = ghosts.length - 1; i >= 0; i--) if (time - ghosts[i].at > 700) ghosts.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Doppel circles at a talking distance — and steps clear of the backlash at the snap.
      const time = ctx.scene.time.now;
      const want = warning(time) ? 300 : 220;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.35;
      return { x: clamp(player.x + Math.cos(a) * want, 60, W - 60), y: clamp(player.y + Math.sin(a) * want, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // A faint lattice of thought on the floor, brightening as the snap nears.
      const k = warning(time) ? clamp(1 - (swapAt - time) / WARN, 0, 1) : 0;
      if (k > 0 && alive(player) && alive(npc)) {
        g.lineStyle(2, MIND, 0.12 + k * 0.25); g.strokeCircle(player.x, player.y + 6, 30 + (1 - k) * 40);
        g.strokeCircle(npc.x, npc.y + 6, 30 + (1 - k) * 40);
        g.lineStyle(1, MIND_LIT, 0.2 * k); g.strokeCircle(player.x, player.y + 6, NEAR); g.strokeCircle(npc.x, npc.y + 6, NEAR);
      }
    },

    drawAir(g, time) {
      if (!alive(player) || !alive(npc)) return;
      const live = warning(time);
      if (live) {
        const k = clamp(1 - (swapAt - time) / WARN, 0, 1);
        // The cord: a sine that tightens as it nears the snap, rings travelling along it.
        const ax = player.x, ay = player.y - 20, bx = npc.x, by = npc.y - 20;
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const nx = -(by - ay) / len, ny = (bx - ax) / len;
        const amp = 22 * (1 - k) + 2;
        let px = ax, py = ay;
        for (let i = 1; i <= 24; i++) {
          const t = i / 24;
          const wv = Math.sin(t * Math.PI * 5 + time / 90) * amp * Math.sin(t * Math.PI);
          const x = ax + (bx - ax) * t + nx * wv, y = ay + (by - ay) * t + ny * wv;
          g.lineStyle(3, MIND_DARK, 0.5); g.lineBetween(px, py, x, y);
          g.lineStyle(1.5, MIND_LIT, 0.4 + k * 0.5); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
        for (let r = 0; r < 3; r++) {
          const t = ((time / 700) + r / 3) % 1;
          g.lineStyle(2, CRYSTAL, 0.6 * Math.sin(t * Math.PI)); g.strokeCircle(ax + (bx - ax) * t, ay + (by - ay) * t, 6 + k * 6);
        }
        // Each fighter's hand of cooldowns: three lettered pips, lit when ready.
        for (const f of [player, npc] as Fighter[]) {
          KEYS.forEach((key, i) => {
            const r = readiness(f, key);
            const x = f.x - 22 + i * 22, y = f.y - 70;
            g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 9);
            g.fillStyle(r >= 0.999 ? MIND : MIND_DARK, r >= 0.999 ? 1 : 0.7); g.fillCircle(x, y, 7.5);
            if (r < 0.999) { g.lineStyle(2, MIND_LIT, 0.8); g.beginPath(); g.arc(x, y, 7.5, -Math.PI / 2, -Math.PI / 2 + r * Math.PI * 2, false); g.strokePath(); }
            strokeText(g, key, x, y, 7, r >= 0.999 ? IVORY : MIND_LIT, 1, 1.2);
          });
        }
      }
      // The snap: a flash along the line and an afterimage at each end.
      const sk = (time - lastSwap) / 500;
      if (sk >= 0 && sk < 1) {
        g.lineStyle(6 * (1 - sk), 0xffffff, 1 - sk); g.lineBetween(player.x, player.y - 20, npc.x, npc.y - 20);
      }
      for (const gh of ghosts) {
        const k = (time - gh.at) / 700;
        glow(g, gh.x, gh.y - 10, 30, MIND, 0.08 * (1 - k), 2);
        g.lineStyle(2, MIND_LIT, 1 - k); g.strokeCircle(gh.x, gh.y - 10, 20 + k * 20);
      }
    },

    drawHud(g, time) {
      // A little brain-clock: how long until the next joining.
      const x = W / 2, y = top + 18;
      const left = clamp((swapAt - time) / PERIOD, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 16);
      g.lineStyle(3, warning(time) ? MIND_LIT : GILT_LIT, 0.95);
      g.beginPath(); g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2, false); g.strokePath();
      for (const k of [-1, 1]) { g.fillStyle(MIND, 1); g.fillCircle(x + k * 4, y, 5); }
      g.lineStyle(1, MIND_DARK, 1); g.lineBetween(x, y - 5, x, y + 5);
    },
  };
}

export const MIND_SWAP: GimmickDef = {
  id: 'mind-swap',
  rules: 'Every few seconds a ripple joins you and Doppel and your E, R and F cooldowns swap with his. Spend yours before it snaps.',
  make,
};
