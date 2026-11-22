import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { coffin } from '../art';
import { BONE, CRAPE, GREY_LIT, LAMP, SHROUD, WISP, WISP_DIM } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Last Breath — Undertaker Pale.
 *
 * Pale lays out the greyed, and he swears he has seen them go: a pale shape that steps out of the
 * body a pace behind it and stands there, waiting to be told what to do. In his yard it happens to
 * the living. Fall below half your strength (and again below a quarter) and your spirit rises a
 * step behind you — a grey copy of you, holding its breath.
 *
 * While it is out it is the softest thing in the yard: any blow that lands on it lands on you
 * twice over. Walk back into it and you take your breath back, and some health with it. But
 * Pale's coffin stands open at the head of the yard, and a spirit left alone drifts toward it; if
 * it gets there the lid comes down, and that breath is gone for good.
 */

const STEP_BACK = 64;
const RETURN_R = 30;
const LAID_DMG = 10;
const THRESHOLDS = [0.5, 0.25];

interface Spirit {
  owner: Fighter;
  x: number; y: number;
  born: number;
  handle: StrikeTarget;
  hitFx: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const drift = ctx.hard ? 32 : 24;
  const coffinAt: Pt = { x: W / 2, y: top + 44 };
  const spent = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const spirits: Spirit[] = [];
  let lidFx = -9999;
  let started = false;

  const spiritOf = (f: Fighter) => spirits.find((s) => s.owner === f) ?? null;

  function rise(f: Fighter, time: number): void {
    const a = ctx.facing(f) + Math.PI;
    const x = clamp(f.x + Math.cos(a) * STEP_BACK, 40, W - 40), y = clamp(f.y + Math.sin(a) * STEP_BACK, top + 30, H - 30);
    const sp: Spirit = {
      owner: f, x, y, born: time, hitFx: -9999,
      handle: ctx.target({
        x, y: y - 16, r: 20,
        onStruck: (by, amount) => {
          const striker = by === 'player' ? player : npc;
          if (striker === sp.owner || !alive(sp.owner)) return;
          ctx.hit(sp.owner, Math.max(2, Math.round(amount * 2)), sp.x, sp.y - 20);
          sp.hitFx = ctx.scene.time.now;
          ctx.float(sp.x, sp.y - 50, 'DOUBLE', '#b8f0d8');
          ctx.sfx('hit-heavy');
        },
      }),
    };
    spirits.push(sp);
    ctx.float(f.x, f.y - 56, f === player ? 'YOUR SPIRIT RISES' : 'PALE\'S SPIRIT RISES', '#b8f0d8');
    ctx.sfx('wings');
  }

  function end(sp: Spirit): void {
    sp.handle.remove();
    spirits.splice(spirits.indexOf(sp), 1);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('BELOW HALF, YOUR SPIRIT STEPS OUT', '#b8f0d8'); }
      for (const f of [player, npc]) {
        if (!alive(f) || spiritOf(f)) continue;
        const used = spent.get(f) ?? 0;
        if (used >= THRESHOLDS.length) continue;
        if (f.hp / Math.max(1, f.maxHp) < THRESHOLDS[used]) { spent.set(f, used + 1); rise(f, time); }
      }
      for (const sp of [...spirits]) {
        const f = sp.owner;
        if (!alive(f)) { end(sp); continue; }
        // Home again: breath back, and some health.
        if (dist(f.x, f.y, sp.x, sp.y) < RETURN_R && time - sp.born > 400) {
          ctx.heal(f, Math.round(f.maxHp * 0.12));
          ctx.float(f.x, f.y - 50, 'BREATH RETURNS', '#e4e2dc');
          ctx.sfx('heal');
          end(sp);
          continue;
        }
        // Left alone, it drifts to Pale's coffin.
        const d = Math.max(1, dist(sp.x, sp.y, coffinAt.x, coffinAt.y));
        sp.x += ((coffinAt.x - sp.x) / d) * drift * dt;
        sp.y += ((coffinAt.y - sp.y) / d) * drift * dt;
        sp.handle.moveTo(sp.x, sp.y - 16);
        if (d < 30) {
          ctx.hit(f, LAID_DMG, f.x, f.y);
          ctx.float(coffinAt.x, coffinAt.y - 30, 'LAID OUT', '#c9cfd3');
          ctx.sfx('stone-slam');
          lidFx = time;
          end(sp);
        }
      }
    },

    /** Short of breath while your spirit is out. */
    playerSpeedMult() { return spiritOf(player) ? 0.88 : 1; },
    npcSpeedMult() { return spiritOf(npc) ? 0.88 : 1; },

    npcSeek(): Pt | null {
      const own = spiritOf(npc);
      if (own) return { x: own.x, y: own.y };
      const theirs = spiritOf(player);
      if (theirs) {
        // Stand at the player's spirit, between it and the player, so blows meant for either land.
        return { x: theirs.x + (player.x - theirs.x) * 0.25, y: theirs.y + (player.y - theirs.y) * 0.25 };
      }
      return null;
    },

    drawGround(g, time) {
      // Pale's coffin at the head of the yard, open and waiting, a candle at each corner.
      const shut = time - lidFx < 900;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(coffinAt.x, coffinAt.y + 14, 130, 22);
      coffin(g, coffinAt.x, coffinAt.y, 110, 36, 0, shut ? 0 : 0.8, shut);
      for (const [dx, dy] of [[-62, -16], [62, -16], [-62, 22], [62, 22]]) {
        const cx = coffinAt.x + dx, cy = coffinAt.y + dy;
        g.fillStyle(BONE, 1); g.fillRect(cx - 2, cy - 12, 4, 12);
        g.fillStyle(LAMP, 0.85 + Math.sin(time / 90 + dx) * 0.15); g.fillCircle(cx, cy - 14, 2.4);
        glow(g, cx, cy - 12, 14, LAMP, 0.04, 2);
      }
      // A grey thread from each spirit back to its owner, and a drag-mark toward the coffin.
      for (const sp of spirits) {
        g.lineStyle(1.5, GREY_LIT, 0.35 + Math.sin(time / 200) * 0.15); g.lineBetween(sp.x, sp.y, sp.owner.x, sp.owner.y);
        g.lineStyle(1, WISP_DIM, 0.25); g.lineBetween(sp.x, sp.y, coffinAt.x, coffinAt.y + 18);
        g.fillStyle(WISP, 0.08); g.fillEllipse(sp.x, sp.y + 4, 44, 12);
      }
    },

    drawAir(g, time) {
      for (const sp of spirits) {
        const f = sp.owner;
        const k = clamp((time - sp.born) / 500, 0, 1);
        const bob = Math.sin(time / 300) * 3;
        const x = sp.x, y = sp.y + bob;
        // A grey copy of its owner: a soft body, a held breath (puffed cheeks), arms down.
        const hurt = time - sp.hitFx < 250;
        const a = (hurt ? 0.95 : 0.6) * k;
        g.fillStyle(WISP_DIM, 0.12 * k); g.fillCircle(x, y - 16, 30);
        g.fillStyle(SHROUD, a * 0.6); g.fillEllipse(x, y - 8, 30, 34);
        g.fillStyle(SHROUD, a); g.fillCircle(x, y - 30, 12);
        g.fillStyle(CRAPE, a); g.fillCircle(x - 4, y - 32, 1.8); g.fillCircle(x + 4, y - 32, 1.8);
        g.fillStyle(GREY_LIT, a); g.fillCircle(x - 7, y - 27, 3); g.fillCircle(x + 7, y - 27, 3);
        g.fillStyle(CRAPE, a); g.fillRect(x - 2, y - 26, 4, 1.5);
        // The owner's colour round it so you know whose it is.
        g.lineStyle(2, f === player ? 0x9ad0ff : 0xe28a8a, 0.5 * k); g.strokeCircle(x, y - 18, 24);
        for (let i = 0; i < 4; i++) {
          const ph = (time / 700 + i / 4) % 1;
          g.fillStyle(SHROUD, 0.3 * (1 - ph) * k); g.fillCircle(x + (i - 1.5) * 6, y + 8 + ph * 10, 4);
        }
        if (hurt) { g.lineStyle(3, 0xffffff, 0.7); g.strokeCircle(x, y - 18, 30); }
      }
      if (time - lidFx < 600) {
        const k = (time - lidFx) / 600;
        g.lineStyle(4, SHROUD, 1 - k); g.strokeEllipse(coffinAt.x, coffinAt.y, 120 + k * 80, 40 + k * 30);
      }
    },

    destroy() { for (const sp of spirits) sp.handle.remove(); spirits.length = 0; },
  };
}

export const LAST_BREATH: GimmickDef = {
  id: 'grave-last-breath',
  rules: 'Below half health (and a quarter) your spirit steps out behind you: blows on it hit you double. Walk back into it to heal. Left alone it drifts to Pale\'s coffin and is laid out.',
  make,
};
