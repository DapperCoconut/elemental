import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { chainLinks, manacle } from '../art';
import { HOT, HOT_LIT, IRON, IRON_DARK, IRON_LIT, RUST, TAR, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, lockableAbilities, lockedIds, lockOne, stepDt, wrapAngle } from '../util';

/**
 * Manacle Works — Smith Clasp.
 *
 * A belt runs along the top of the yard out of the Works. At its head the stamp press slams a
 * new manacle out of hot iron every few seconds, and the belt carries it along to whichever of
 * three drop-hatches is over a fighter; it falls through and rolls across the flags at them on
 * its edge, jaws open, steering after them.
 *
 * A manacle that reaches a fighter closes on a wrist — and **locks one of that fighter's
 * abilities** (E, R or F) for a while: the key is gone, the ability will not cast.
 *
 * Every manacle can be **struck**. Strike one and you send it on: it spins round and rolls hard
 * at your foe instead. Clasp knows this, and sends them back.
 */

const CUFF_R = 13;
const CATCH_R = 24;
const LIFE_MS = 13000;

interface Cuff {
  x: number; y: number;
  a: number; speed: number;
  target: Fighter;
  sentUntil: number;
  born: number;
  heat: number;
  roll: number;
  handle: StrikeTarget | null;
  dead: boolean;
}

interface Cuffed { f: Fighter; key: string; until: number; at: number }

interface Carry { gate: number; born: number; target: Fighter }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const BELT_Y = top + 30;
  const GATES = [W * 0.22, W * 0.5, W * 0.78];
  const PRESS_X = 54;
  const EVERY = ctx.hard ? 2200 : 2700;
  const SPEED = ctx.hard ? 140 : 118;
  const SENT_SPEED = 330;
  const LOCK_MS = ctx.hard ? 6500 : 5000;
  const BELT_V = 420;
  const cuffs: Cuff[] = [];
  const carried: Carry[] = [];
  const cuffed: Cuffed[] = [];
  let nextPress = 0;
  let pressAt = -9999;
  let started = false;
  let toggle = 0;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function press(time: number): void {
    pressAt = time;
    ctx.sfx('hammer-forge');
    // Alternate targets, so neither side is left alone for long.
    toggle++;
    const target = alive(npc) && toggle % 2 === 0 ? npc : player;
    let gi = 0, bd = Infinity;
    GATES.forEach((gx, i) => { const d = Math.abs(gx - target.x); if (d < bd) { bd = d; gi = i; } });
    carried.push({ gate: gi, born: time, target });
  }

  function drop(c: Carry, time: number): void {
    const x = GATES[c.gate], y = BELT_Y + 30;
    const cuff: Cuff = {
      x, y, a: Math.atan2(c.target.y - y, c.target.x - x), speed: SPEED, target: c.target,
      sentUntil: 0, born: time, heat: 1, roll: 0, handle: null, dead: false,
    };
    cuff.handle = ctx.target({
      x, y, r: CUFF_R + 4,
      onStruck: (by) => {
        if (cuff.dead) return;
        const striker = by === 'player' ? player : npc;
        cuff.target = other(striker);
        cuff.a = Math.atan2(cuff.target.y - cuff.y, cuff.target.x - cuff.x);
        cuff.sentUntil = ctx.scene.time.now + 1500;
        cuff.born = ctx.scene.time.now;
        ctx.sfx('clang');
        ctx.flash(cuff.x, cuff.y, 0xffd08a);
        if (by === 'player') ctx.float(cuff.x, cuff.y - 24, 'SENT ON', '#ffd08a');
      },
    });
    cuffs.push(cuff);
    ctx.sfx('trap-set');
  }

  function close(c: Cuff, f: Fighter, time: number): void {
    c.dead = true;
    c.handle?.remove();
    const locked = lockedIds(f);
    const options = lockableAbilities(f).filter((a) => !locked.has(a.id));
    const pick = options.length ? options[Math.floor(ctx.rng() * options.length)] : null;
    if (pick && lockOne(f, pick.id, LOCK_MS)) {
      cuffed.push({ f, key: pick.key, until: time + LOCK_MS, at: time });
      ctx.float(f.x, f.y - 56, `${pick.key} MANACLED`, f === player ? '#ffb0a0' : '#d8f0a0');
    } else {
      ctx.silence(f, 1800);
      cuffed.push({ f, key: '', until: time + 1800, at: time });
      ctx.float(f.x, f.y - 56, 'MANACLED', '#ffb0a0');
    }
    ctx.hit(f, ctx.hard ? 5 : 4, f.x, f.y);
    ctx.sfx('chain');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextPress = time + 900;
        ctx.banner('THE PRESS IS HOT — STRIKE A MANACLE TO SEND IT ON', '#ffd08a');
      }
      if (time >= nextPress) {
        nextPress = time + EVERY;
        if (cuffs.length + carried.length < (ctx.hard ? 4 : 3)) press(time);
      }
      // Along the belt to the gate.
      for (let i = carried.length - 1; i >= 0; i--) {
        const c = carried[i];
        const bx = PRESS_X + ((time - c.born) / 1000) * BELT_V;
        if (bx >= GATES[c.gate]) { carried.splice(i, 1); drop(c, time); }
      }
      for (const c of cuffs) {
        if (c.dead) continue;
        c.heat = Math.max(0, c.heat - dt * 0.25);
        const sent = time < c.sentUntil;
        const f = c.target;
        if (alive(f)) {
          const want = Math.atan2(f.y - c.y, f.x - c.x);
          const turn = (sent ? 3.2 : 1.5) * dt;
          c.a += clamp(wrapAngle(want - c.a), -turn, turn);
        }
        const sp = sent ? SENT_SPEED : c.speed;
        c.x += Math.cos(c.a) * sp * dt;
        c.y += Math.sin(c.a) * sp * dt;
        c.roll += sp * dt / CUFF_R;
        // Off the walls.
        if (c.x < 30 || c.x > W - 30) { c.a = Math.PI - c.a; c.x = clamp(c.x, 30, W - 30); }
        if (c.y < top + 50 || c.y > H - 34) { c.a = -c.a; c.y = clamp(c.y, top + 50, H - 34); }
        c.handle?.moveTo(c.x, c.y);
        // A wrist in reach: it closes.
        for (const t of [player, npc]) {
          if (!alive(t) || dist(c.x, c.y, t.x, t.y) > CATCH_R) continue;
          // A cuff you just sent passes its sender by.
          if (sent && t !== c.target) continue;
          close(c, t, time);
          break;
        }
        if (!c.dead && time - c.born > LIFE_MS) { c.dead = true; c.handle?.remove(); }
      }
      for (let i = cuffs.length - 1; i >= 0; i--) if (cuffs[i].dead) cuffs.splice(i, 1);
      for (let i = cuffed.length - 1; i >= 0; i--) if (time >= cuffed[i].until || !alive(cuffed[i].f)) cuffed.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // A cuff coming for him: step off its line.
      for (const c of cuffs) {
        if (c.target !== npc || dist(c.x, c.y, npc.x, npc.y) > 180) continue;
        const side = Math.sign(Math.sin(Math.atan2(npc.y - c.y, npc.x - c.x) - c.a)) || 1;
        const a = c.a + side * Math.PI / 2;
        return { x: clamp(npc.x + Math.cos(a) * 120, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 120, top + 60, H - 50) };
      }
      // Otherwise keep the player between himself and the belt's cuffs coming down.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(Math.max(player.y + 60, top + 200), top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const c of cuffs) {
        // Its track: a short dotted line ahead, toward who it's after.
        const sent = time < c.sentUntil;
        for (let k = 1; k < 5; k++) {
          g.fillStyle(sent ? HOT_LIT : IRON_LIT, 0.4 - k * 0.07);
          g.fillCircle(c.x + Math.cos(c.a) * k * 16, c.y + Math.sin(c.a) * k * 16, 2);
        }
        g.fillStyle(0x000000, 0.28); g.fillEllipse(c.x, c.y + CUFF_R * 0.7, CUFF_R * 2.2, 7);
      }
    },

    drawAir(g, time) {
      // The belt: a tarred band over rollers, sliding left to right.
      g.fillStyle(IRON_DARK, 1); g.fillRect(20, BELT_Y - 14, W - 40, 28);
      g.fillStyle(TAR, 1); g.fillRect(24, BELT_Y - 10, W - 48, 20);
      const off = ((time / 1000) * BELT_V) % 24;
      for (let x = 24 + off; x < W - 24; x += 24) { g.lineStyle(1.5, 0x3a3228, 1); g.lineBetween(x, BELT_Y - 10, x, BELT_Y + 10); }
      for (let x = 30; x < W - 20; x += 46) { g.fillStyle(IRON, 1); g.fillCircle(x, BELT_Y + 13, 4); g.fillStyle(IRON_LIT, 1); g.fillCircle(x - 1, BELT_Y + 12, 1.4); }
      // The drop-hatches.
      GATES.forEach((gx, i) => {
        const opening = carried.some((c) => c.gate === i && PRESS_X + ((time - c.born) / 1000) * BELT_V > gx - 70);
        g.fillStyle(opening ? 0x000000 : RUST, 1); g.fillRect(gx - 18, BELT_Y + 14, 36, 8);
        g.lineStyle(1.5, IRON_LIT, 1); g.strokeRect(gx - 18, BELT_Y + 14, 36, 8);
        if (opening) { g.fillStyle(HOT, 0.25); g.fillRect(gx - 16, BELT_Y + 22, 32, 20); }
      });
      // The stamp press at the head.
      const k = clamp((time - pressAt) / 300, 0, 1);
      const ram = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(PRESS_X - 34, BELT_Y - 70, 8, 80); g.fillRect(PRESS_X + 26, BELT_Y - 70, 8, 80);
      g.fillStyle(IRON_DARK, 1); g.fillRect(PRESS_X - 36, BELT_Y - 76, 72, 12);
      g.fillStyle(IRON, 1); g.fillRect(PRESS_X - 22, BELT_Y - 64 + ram * 40, 44, 22);
      g.fillStyle(IRON_LIT, 1); g.fillRect(PRESS_X - 22, BELT_Y - 64 + ram * 40, 44, 4);
      if (time - pressAt < 400) {
        const q = (time - pressAt) / 400;
        glow(g, PRESS_X, BELT_Y, 40, HOT, 0.12 * (1 - q), 3);
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI * 0.9 + i * 0.25;
          g.lineStyle(1.5, HOT_LIT, 1 - q);
          g.lineBetween(PRESS_X + Math.cos(a) * (10 + q * 20), BELT_Y + Math.sin(a) * (10 + q * 20), PRESS_X + Math.cos(a) * (16 + q * 40), BELT_Y + Math.sin(a) * (16 + q * 40));
        }
      }
      // Hot cuffs riding the belt.
      for (const c of carried) {
        const bx = PRESS_X + ((time - c.born) / 1000) * BELT_V;
        manacle(g, bx, BELT_Y - 2, 9, -Math.PI / 2, 0.7, 1);
      }
      // Rolling cuffs: on their edge, jaws open, wobbling as they roll.
      for (const c of cuffs) {
        const sent = time < c.sentUntil;
        manacle(g, c.x, c.y - 6, CUFF_R * (0.9 + Math.abs(Math.sin(c.roll)) * 0.12), c.a + Math.PI + Math.sin(c.roll) * 0.25, 0.9, c.heat);
        if (sent) { g.lineStyle(2, HOT_LIT, 0.6); g.strokeCircle(c.x, c.y - 6, CUFF_R + 6); }
      }
      // Manacled wrists: a cuff on the forearm, a short chain, a ring-timer.
      for (const m of cuffed) {
        const f = m.f;
        if (!alive(f)) continue;
        const hx = f.x + 18, hy = f.y - 6;
        manacle(g, hx, hy, 6, 0, 0, 0);
        chainLinks(g, [{ x: hx + 6, y: hy }, { x: hx + 12, y: hy + 14 }], 5, IRON, 1.2);
        const left = clamp((m.until - time) / (m.until - m.at), 0, 1);
        g.lineStyle(2.5, f === player ? 0xffb0a0 : 0xd8f0a0, 0.85);
        g.beginPath(); g.arc(hx, hy, 11, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
    },
  };
}

export const MANACLE_WORKS: GimmickDef = {
  id: 'shackle-manacle-works',
  rules: 'Hot manacles drop off the belt and roll at you. One that closes on a wrist locks an ability for a while. Strike a manacle to send it at your foe.',
  make,
};
