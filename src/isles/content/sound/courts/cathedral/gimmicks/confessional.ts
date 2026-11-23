import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { confessional } from '../art';
import { CANDLELIGHT, OAK, OAK_DARK, OAK_LIT, SMOKE } from '../palette';
import { alive, dist, stepDt } from '../util';

/**
 * Confessional — Confessor Shrive.
 *
 * Two confession booths stand in the side-aisles. Step through the curtain and you are gone:
 * nothing in the nave can touch you, and you heal slowly while you make your confession. But a
 * booth is no fortress — if the other fighter strikes it while you are inside, the door bursts
 * open and you are thrown out on the flags, stunned. Casting from inside gives you away too: the
 * curtain falls open and you step out blinking. And no confession lasts for ever.
 *
 * Shrive slips into a booth whenever he is hurt and you are far off. Catch him in it: strike the
 * booth and he comes out on his back.
 */

const ENTER_R = 30;
const MAX_STAY = 6000;
const HEAL_PER_S = 3.2;

interface Booth {
  x: number; y: number;            // the door (where you step in)
  who: Fighter | null;
  since: number;
  lockedUntil: number;
  burstAt: number;
  target: StrikeTarget | null;
  healAcc: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const midY = (top + H) / 2 + 30;
  const booths: Booth[] = [
    { x: 140, y: midY, who: null, since: 0, lockedUntil: 0, burstAt: -9999, target: null, healAcc: 0 },
    { x: W - 140, y: midY, who: null, since: 0, lockedUntil: 0, burstAt: -9999, target: null, healAcc: 0 },
  ];
  let started = false;

  const occupying = (f: Fighter) => booths.find((b) => b.who === f) ?? null;
  const other = (f: Fighter) => (f === player ? npc : player);

  function eject(b: Booth, time: number, rest: number, why: 'absolved' | 'burst' | 'cast'): void {
    const f = b.who;
    b.who = null;
    b.lockedUntil = time + rest;
    if (!f) return;
    const dir = b.x < W / 2 ? 1 : -1;
    if (why === 'burst') {
      b.burstAt = time;
      ctx.nudge(f, dir * 96, 0);
      ctx.stun(f, ctx.hard && f === player ? 1500 : 1300);
      ctx.hit(f, 8, f.x, f.y);
      ctx.float(b.x, b.y - 100, 'THE DOOR BURSTS OPEN', '#ffd0a0');
      ctx.sfx('explosion-small');
    } else {
      ctx.nudge(f, dir * 54, 0);
      ctx.float(b.x, b.y - 100, why === 'absolved' ? 'ABSOLVED' : 'OVERHEARD', '#e8e0ff');
      ctx.sfx('hush');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const b of booths) {
          b.target = ctx.target({
            x: b.x, y: b.y - 40, r: 40,
            onStruck: (by) => {
              const now = ctx.scene.time.now;
              const striker = by === 'player' ? player : npc;
              if (b.who && b.who !== striker) eject(b, now, 5000, 'burst');
            },
          });
        }
      }
      for (const b of booths) {
        // Leaving: walked out, or the stay ran out.
        if (b.who) {
          const f = b.who;
          if (!alive(f) || dist(f.x, f.y, b.x, b.y) > ENTER_R + 14) { b.who = null; b.lockedUntil = time + 1500; continue; }
          if (time - b.since > MAX_STAY) { eject(b, time, 3000, 'absolved'); continue; }
          ctx.airborne(f, 120);
          b.healAcc += HEAL_PER_S * (ctx.hard && f === player ? 0.8 : 1) * dt;
          if (b.healAcc >= 2) { ctx.heal(f, Math.floor(b.healAcc)); b.healAcc -= Math.floor(b.healAcc); }
          continue;
        }
        if (time < b.lockedUntil) continue;
        // Entering: the first fighter through the curtain has it.
        for (const f of [player, npc]) {
          if (!alive(f) || occupying(f) || dist(f.x, f.y, b.x, b.y) > ENTER_R) continue;
          b.who = f; b.since = time; b.healAcc = 0;
          ctx.airborne(f, 120);
          ctx.sfx('whoosh');
          ctx.float(b.x, b.y - 100, f === player ? 'YOU STEP INSIDE' : 'SHRIVE STEPS INSIDE', '#c8b4ff');
          break;
        }
      }
    },

    onPlayerCast() { const b = occupying(player); if (b) eject(b, ctx.scene.time.now, 2200, 'cast'); },
    onNpcCast() { const b = occupying(npc); if (b) eject(b, ctx.scene.time.now, 2200, 'cast'); },

    npcSeek() {
      const now = ctx.scene.time.now;
      // You're hiding: come and knock.
      const pb = occupying(player);
      if (pb) return { x: pb.x + (pb.x < W / 2 ? 46 : -46), y: pb.y - 20 };
      // He's inside: stay put until absolved.
      const nb = occupying(npc);
      if (nb) return { x: nb.x, y: nb.y };
      // Hurt: the free booth furthest from you.
      if (npc.hp < npc.maxHp * 0.65) {
        const free = booths.filter((b) => !b.who && now >= b.lockedUntil).sort((a, b) => dist(b.x, b.y, player.x, player.y) - dist(a.x, a.y, player.x, player.y))[0];
        if (free && dist(free.x, free.y, player.x, player.y) > 220) return { x: free.x, y: free.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of booths) {
        // A worn kneeler and a little pool of candlelight before each booth.
        g.fillStyle(OAK_DARK, 0.6); g.fillEllipse(b.x, b.y + 6, 80, 20);
        glow(g, b.x, b.y, 60, CANDLELIGHT, b.who ? 0.05 : 0.025, 3);
        g.lineStyle(2, b.who ? 0xc8b4ff : OAK_LIT, time < b.lockedUntil ? 0.15 : 0.4); g.strokeCircle(b.x, b.y, ENTER_R);
      }
    },

    drawAir(g, time) {
      for (const b of booths) {
        const open = time - b.burstAt < 900 ? 1 - (time - b.burstAt) / 900 : 0;
        // Drawn over whoever is inside — the curtain hides them.
        confessional(g, b.x, b.y + 18, 0.95, open, !!b.who);
        if (b.who) {
          // How long the confession has left: a thread of incense burning down the post.
          const k = Math.min(1, (time - b.since) / MAX_STAY);
          g.fillStyle(OAK, 1); g.fillRect(b.x - 2, b.y - 78, 4, 60);
          g.fillStyle(0xffd890, 0.9); g.fillRect(b.x - 1.5, b.y - 78 + k * 60, 3, 60 * (1 - k));
          for (let i = 0; i < 3; i++) {
            const ph = (time / 900 + i / 3) % 1;
            g.fillStyle(SMOKE, 0.3 * (1 - ph)); g.fillCircle(b.x + Math.sin(ph * 6 + i) * 5, b.y - 120 - ph * 30, 3 + ph * 5);
          }
        }
        if (open > 0) {
          // Splinters and the door flung wide.
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i - 2.5) * 0.4;
            g.fillStyle(OAK_LIT, open); g.fillRect(b.x + Math.cos(a) * (1 - open) * 60, b.y - 50 + Math.sin(a) * (1 - open) * 50, 4, 2);
          }
        }
      }
    },

    destroy() { for (const b of booths) b.target?.remove(); },
  };
}

export const CONFESSIONAL: GimmickDef = {
  id: 'cathedral-confessional',
  rules: 'Step into a confession booth to vanish and slowly heal. Strike a booth with your foe inside and the door bursts: they\'re thrown out stunned.',
  make,
};
