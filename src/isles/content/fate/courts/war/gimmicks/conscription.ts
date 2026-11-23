import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { conscript, draftDrum, drawBall, numberGlyph } from '../art';
import { COAT, GILT, GILT_DARK, GILT_LIT, INK, RED, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Conscription — Sergeant Draft.
 *
 * A Drafting drum stands at the top of the yard. Strike it and it spins; when it stops it drops
 * a numbered ball, and the number is a conscript's: a drafted lad in House red marches in out of
 * the chute and fights — for whichever side the ball names. Red balls are drawn for you, black
 * for the Sergeant. The drum turns itself every so often too, and when nobody touches it, it
 * favours black (it is the House's drum). Whoever strikes it tilts the odds their own way.
 *
 * Conscripts walk at the fighter they were drawn against and thrust with their pikes. The other
 * side can strike them off the roll; they desert of their own accord after a while. Up to three
 * stand for each side.
 */

type Side = 'player' | 'npc';

interface Conscript {
  side: Side;
  n: number;
  x: number; y: number;
  hp: number;
  bornAt: number;
  dieAt: number;
  step: number;
  facing: number;
  /** A thrust is coming: the pike levels from this time and lands THRUST_MS later. */
  thrustAt: number;
  nextThrust: number;
  target: StrikeTarget;
  hurtAt: number;
}

const SPIN_MS = 1300;
const THRUST_MS = 420;
const WALK = 74;
const REACH = 58;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, rng } = ctx;
  const DRUM = { x: W / 2, y: top + 52 };
  const HP = ctx.hard ? 34 : 26;
  const PIKE = ctx.hard ? 9 : 7;
  const AUTO_MS = ctx.hard ? 7600 : 9200;
  const LIFE_MS = 16000;
  const troops: Conscript[] = [];
  let spinFrom = -1;
  let spinBy: Side | 'house' = 'house';
  let cooldownUntil = 0;
  let nextAuto = 0;
  let drumA = 0;
  let started = false;
  /** The last ball called: shown big over the drum for a moment. */
  let called: { n: number; side: Side; at: number } | null = null;

  const foeOf = (s: Side): Fighter => (s === 'player' ? npc : player);
  const ownerOf = (s: Side): Fighter => (s === 'player' ? player : npc);

  const drum = ctx.target({
    x: DRUM.x, y: DRUM.y + 6, r: 34,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (spinFrom >= 0 || now < cooldownUntil) return;
      spin(by, now);
    },
  });

  function spin(by: Side | 'house', time: number): void {
    spinFrom = time;
    spinBy = by;
    ctx.sfx('dice');
    ctx.float(DRUM.x, DRUM.y - 40, by === 'house' ? 'THE DRUM TURNS' : by === 'player' ? 'YOU TURN THE DRUM' : 'DRAFT TURNS THE DRUM', '#f4d67e');
  }

  function draw(time: number): void {
    spinFrom = -1;
    cooldownUntil = time + 2600;
    nextAuto = time + AUTO_MS;
    // The striker tilts it their way; left alone, the House's drum leans black.
    const redOdds = spinBy === 'player' ? 0.72 : spinBy === 'npc' ? 0.28 : 0.4;
    const side: Side = rng() < redOdds ? 'player' : 'npc';
    const n = 1 + Math.floor(rng() * 90);
    called = { n, side, at: time };
    ctx.sfx('jackpot');
    ctx.banner(side === 'player' ? `No. ${n} — DRAWN FOR YOU` : `No. ${n} — DRAWN FOR THE SERGEANT`, side === 'player' ? '#ff8a7a' : '#c8c0d0');
    // At the cap, the oldest on that side deserts to make room.
    const mine = troops.filter((c) => c.side === side);
    if (mine.length >= 3) desert(mine[0], time, false);
    const sx = DRUM.x - 44, sy = DRUM.y + 54;
    let c: Conscript;
    const target = ctx.target({
      x: sx, y: sy, r: 20, passThrough: true,
      onStruck(by, amount) {
        if (by === c.side || c.hp <= 0) return;
        c.hp -= Math.max(4, amount);
        c.hurtAt = ctx.scene.time.now;
        if (c.hp <= 0) desert(c, ctx.scene.time.now, true);
      },
    });
    c = {
      side, n, x: sx, y: sy, hp: HP, bornAt: time, dieAt: time + LIFE_MS, step: 0, facing: 1,
      thrustAt: -1, nextThrust: time + 1600, target, hurtAt: -9999,
    };
    troops.push(c);
  }

  function desert(c: Conscript, time: number, struck: boolean): void {
    const i = troops.indexOf(c);
    if (i < 0) return;
    troops.splice(i, 1);
    c.target.remove();
    ctx.flash(c.x, c.y - 24, c.side === 'player' ? RED : INK);
    ctx.float(c.x, c.y - 60, struck ? `No. ${c.n} STRUCK OFF` : `No. ${c.n} DESERTS`, struck ? '#ffb0a0' : '#d8d0c0');
    if (struck) ctx.sfx('hit-medium');
    void time;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextAuto = time + 3200; }
      drumA += dt * (spinFrom >= 0 ? 9 : 0.4);
      if (spinFrom < 0 && time >= nextAuto && time >= cooldownUntil) spin('house', time);
      if (spinFrom >= 0 && time - spinFrom >= SPIN_MS) draw(time);

      for (let i = troops.length - 1; i >= 0; i--) {
        const c = troops[i];
        if (time >= c.dieAt) { desert(c, time, false); continue; }
        const foe = foeOf(c.side);
        if (!alive(foe)) continue;
        const d = dist(c.x, c.y, foe.x, foe.y);
        c.facing = foe.x >= c.x ? 1 : -1;
        if (c.thrustAt >= 0) {
          // Pike levelled: hold still, then lunge.
          if (time - c.thrustAt >= THRUST_MS) {
            c.thrustAt = -1;
            c.nextThrust = time + 1500;
            ctx.sfx('stab');
            if (dist(c.x, c.y, foe.x, foe.y) < REACH + 14) {
              ctx.hit(foe, PIKE, foe.x, foe.y);
              const a = Math.atan2(foe.y - c.y, foe.x - c.x);
              ctx.nudge(foe, Math.cos(a) * 26, Math.sin(a) * 26);
            }
          }
        } else if (d > REACH - 10) {
          const a = Math.atan2(foe.y - c.y, foe.x - c.x);
          c.x = clamp(c.x + Math.cos(a) * WALK * dt, 40, W - 40);
          c.y = clamp(c.y + Math.sin(a) * WALK * dt, top + 40, ctx.H - 30);
          c.step += dt * 9;
        } else if (time >= c.nextThrust) {
          c.thrustAt = time;
        }
        // Drafted men do not stand on each other.
        for (const o of troops) {
          if (o === c) continue;
          const od = dist(c.x, c.y, o.x, o.y);
          if (od < 26 && od > 0.01) { c.x += ((c.x - o.x) / od) * (26 - od) * 0.5; c.y += ((c.y - o.y) / od) * (26 - od) * 0.5; }
        }
        c.target.moveTo(c.x, c.y - 20);
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const mine = troops.filter((c) => c.side === 'npc').length;
      const yours = troops.filter((c) => c.side === 'player');
      // The drum is free and the roll is not in his favour: go and turn it.
      if (spinFrom < 0 && now >= cooldownUntil && mine <= yours.length) return { x: DRUM.x + 30, y: DRUM.y + 64 };
      // Otherwise cut down whoever was drafted against him.
      let best: Conscript | null = null;
      let bd = Infinity;
      for (const c of yours) { const d = dist(c.x, c.y, npc.x, npc.y); if (d < bd) { bd = d; best = c; } }
      if (best && bd < 360) return { x: best.x, y: best.y + 10 };
      return null;
    },

    drawGround(g, time) {
      // The marching line from the chute: boot-scuffed mud.
      g.fillStyle(0x3c2e20, 0.35); g.fillEllipse(DRUM.x - 44, DRUM.y + 62, 70, 18);
      for (const c of troops) {
        const flash = time - c.hurtAt < 160;
        const owner = ownerOf(c.side);
        // A tether of colour from each conscript to the side that owns him.
        if (alive(owner)) { g.lineStyle(1, c.side === 'player' ? RED : INK, 0.18); g.lineBetween(c.x, c.y, owner.x, owner.y); }
        const lvl = c.thrustAt >= 0 ? clamp((time - c.thrustAt) / THRUST_MS, 0, 1) : 0;
        conscript(g, c.x, c.y, 0.78, c.facing, c.step, c.side === 'player' ? COAT : 0x2c2830, lvl, c.n);
        if (flash) { g.fillStyle(0xffffff, 0.35); g.fillCircle(c.x, c.y - 26, 18); }
        // Side armband and his ball number over his shako.
        drawBall(g, c.x, c.y - 58, 6.5, c.n, c.side === 'player' ? RED : INK);
        const k = c.hp / HP;
        g.fillStyle(0x000000, 0.5); g.fillRect(c.x - 12, c.y + 6, 24, 3);
        g.fillStyle(c.side === 'player' ? RED : 0xc8c0d0, 1); g.fillRect(c.x - 12, c.y + 6, 24 * k, 3);
        // The pike's telegraph: the thrust's reach.
        if (lvl > 0) { g.lineStyle(2, 0xffffff, 0.2 + lvl * 0.4); g.strokeCircle(c.x, c.y - 10, REACH * (0.6 + lvl * 0.4)); }
      }
    },

    drawAir(g, time) {
      // The drum on its gilt frame, at the top of the yard.
      const x = DRUM.x, y = DRUM.y;
      const ready = spinFrom < 0 && time >= cooldownUntil;
      for (const k of [-1, 1]) {
        g.lineStyle(6, GILT_DARK, 1); g.lineBetween(x + k * 52, y + 34, x + k * 38, y - 6);
        g.lineStyle(3, GILT, 1); g.lineBetween(x + k * 51, y + 33, x + k * 37, y - 5);
      }
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 60, y + 32, 120, 8);
      if (ready) glow(g, x, y, 40, GILT_LIT, 0.05 + Math.sin(time / 260) * 0.02, 3);
      draftDrum(g, x, y, 20, drumA, 72);
      // The chute and the ball rolling down it at the draw.
      g.lineStyle(4, GILT_DARK, 1); g.lineBetween(x - 20, y + 16, x - 44, y + 40);
      if (called && time - called.at < 2400) {
        const k = clamp((time - called.at) / 500, 0, 1);
        const bx = x - 20 - 24 * k, by = y + 16 + 24 * k;
        drawBall(g, bx, by, 7, called.n, called.side === 'player' ? RED : INK);
        // The number, painted big over the drum.
        const fade = clamp(1 - (time - called.at - 1600) / 800, 0, 1);
        g.fillStyle(called.side === 'player' ? RED : INK, 0.85 * fade); g.fillRoundedRect(x + 70, y - 34, 74, 36, 8);
        g.lineStyle(2, GILT, fade); g.strokeRoundedRect(x + 70, y - 34, 74, 36, 8);
        numberGlyph(g, x + 107, y - 16, 20, called.n, 0xf0e6cc, fade);
      }
      if (spinFrom >= 0) {
        // Rattling: balls jumping in the cage.
        const k = (time - spinFrom) / SPIN_MS;
        g.lineStyle(2, GILT_LIT, 0.5 + k * 0.4); g.strokeCircle(x, y, 40 + Math.sin(time / 40) * 3);
      }
    },

    drawHud(g) {
      const reds = troops.filter((c) => c.side === 'player').length;
      const blacks = troops.length - reds;
      const y = top + 12;
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i < reds ? RED : 0x000000, i < reds ? 1 : 0.35); g.fillCircle(24 + i * 18, y, 6);
        g.fillStyle(i < blacks ? INK : 0x000000, i < blacks ? 1 : 0.35); g.fillCircle(W - 24 - i * 18, y, 6);
        if (i < blacks) { g.lineStyle(1, 0xc8c0d0, 0.8); g.strokeCircle(W - 24 - i * 18, y, 6); }
      }
    },

    destroy() {
      drum.remove();
      for (const c of troops) c.target.remove();
      troops.length = 0;
    },
  };
}

export const CONSCRIPTION: GimmickDef = {
  id: 'war-conscription',
  rules: 'Strike the Drafting drum to draw a conscript: red balls fight for you, black for the Sergeant. The striker tilts the odds; left alone, the drum leans black.',
  make,
};
