import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { breathBottle, breathMeter } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, BREATH, LEATHER, LEATHER_DARK } from '../palette';
import { alive, castWatcher, clamp, dist, speedometer, stepDt } from '../util';

/**
 * Breath Meter — Meter-Man Puffin.
 *
 * Puffin reads the meters at the toll-bellows, and today he has buckled one on you. Both
 * fighters wear a brass breath-meter. Every ability you cast costs breath; every dash costs more;
 * standing easy you get it back, slowly. Run the meter dry and you are *winded*: doubled over,
 * slow, unable to cast anything but a basic strike, taking a little extra from every blow — until
 * you gasp, and the needle jumps back to half.
 *
 * Corked breath-bottles roll about the yard, knocked off the tally-cart. Walk over one and you
 * uncork it: a lungful back. Puffin, though, is collecting them for the King — he goes after every
 * bottle he sees and pockets it, and each one he banks tops *him* up. Take the bottles off him.
 */

const MAX = 100;
const CAST_COST = 16;
const DASH_COST = 30;
const DASH_SPEED = 380;
const REGEN = 5;
const REGEN_DELAY = 1200;
const WINDED_MS = 2400;
const GASP_TO = 50;
const BOTTLE_GAIN = 40;
const BOTTLE_R = 30;
const WINDED_TAKEN = 1.2;

interface Lung {
  f: Fighter;
  breath: number;
  windedUntil: number;
  lastSpend: number;
  watch: () => number;
  speed: (dt: number) => number;
  /** Bottles banked (Puffin's tally; your uncorked ones). */
  banked: number;
  gaspFx: number;
  /** Winded and owed a gasp when it ends. */
  owed: boolean;
}

interface Bottle { x: number; y: number; vx: number; vy: number; spin: number; born: number; taken: boolean; takenBy: Fighter | null; takenAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const lungs: Lung[] = [player, npc].map((f) => ({
    f, breath: MAX, windedUntil: 0, lastSpend: 0, watch: castWatcher(f), speed: speedometer(f), banked: 0, gaspFx: 0, owed: false,
  }));
  const lp = lungs[0], ln = lungs[1];
  let bottles: Bottle[] = [];
  let nextBottle = 0;
  const castCost = ctx.hard ? CAST_COST * 1.2 : CAST_COST;

  const winded = (l: Lung, time: number) => time < l.windedUntil;

  function spend(l: Lung, amount: number, time: number): void {
    if (winded(l, time) || amount <= 0) return;
    l.breath = Math.max(0, l.breath - amount);
    l.lastSpend = time;
    if (l.breath <= 0) {
      l.windedUntil = time + WINDED_MS;
      l.owed = true;
      ctx.silence(l.f, WINDED_MS);
      ctx.float(l.f.x, l.f.y - 50, 'WINDED', '#9fe2ff');
      ctx.sfx('status-slow');
    }
  }

  function roll(time: number): void {
    // Off the tally-cart at a random edge, rolling across the yard.
    const side = Math.floor(rng() * 4);
    const x = side === 0 ? 30 : side === 1 ? W - 30 : 80 + rng() * (W - 160);
    const y = side === 2 ? top + 30 : side === 3 ? H - 30 : top + 60 + rng() * (H - top - 120);
    const a = Math.atan2((top + H) / 2 - y + (rng() - 0.5) * 200, W / 2 - x + (rng() - 0.5) * 300);
    const sp = 70 + rng() * 50;
    bottles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: rng() * 6, born: time, taken: false, takenBy: null, takenAt: 0 });
    ctx.sfx('crystal-chime');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextBottle === 0) nextBottle = time + 2500;
      for (const l of lungs) {
        const casts = l.watch();
        const v = l.speed(dt);
        if (!alive(l.f)) continue;
        if (casts > 0) spend(l, castCost * casts, time);
        if (v > DASH_SPEED) spend(l, DASH_COST * dt * (v / DASH_SPEED), time);
        if (winded(l, time)) continue;
        if (l.owed) {
          // The gasp.
          l.owed = false;
          l.breath = Math.max(GASP_TO, l.breath);
          l.gaspFx = time;
          ctx.float(l.f.x, l.f.y - 50, 'GASP', '#ffffff');
          ctx.sfx('whoosh');
        }
        if (time - l.lastSpend > REGEN_DELAY) l.breath = Math.min(MAX, l.breath + REGEN * dt);
      }
      // Bottles roll, bounce off the walls, and are uncorked by whoever walks over them.
      if (time >= nextBottle && bottles.filter((b) => !b.taken).length < 4) { roll(time); nextBottle = time + (ctx.hard ? 4200 : 3400) + rng() * 1200; }
      for (const b of bottles) {
        if (b.taken) continue;
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += Math.hypot(b.vx, b.vy) * dt / 10;
        b.vx *= 1 - dt * 0.25; b.vy *= 1 - dt * 0.25;
        if (b.x < 30 || b.x > W - 30) { b.vx = -b.vx; b.x = clamp(b.x, 30, W - 30); }
        if (b.y < top + 24 || b.y > H - 24) { b.vy = -b.vy; b.y = clamp(b.y, top + 24, H - 24); }
        for (const l of lungs) {
          if (!alive(l.f) || dist(l.f.x, l.f.y, b.x, b.y) > BOTTLE_R) continue;
          b.taken = true; b.takenBy = l.f; b.takenAt = time;
          l.banked++;
          if (l === ln) {
            ln.breath = Math.min(MAX, ln.breath + BOTTLE_GAIN);
            ctx.float(b.x, b.y - 30, 'FOR THE KING', '#d2a446');
            // Every third bottle banked, Puffin stamps his tally: a short burst of breath for him.
            if (ln.banked % 3 === 0) { ctx.heal(npc, 10); ctx.float(npc.x, npc.y - 60, 'TALLY STAMPED', '#d2a446'); }
          } else {
            lp.breath = Math.min(MAX, lp.breath + BOTTLE_GAIN);
            ctx.float(b.x, b.y - 30, 'UNCORKED', '#9fe2ff');
          }
          ctx.sfx('bubble');
          break;
        }
      }
      bottles = bottles.filter((b) => !b.taken || time - b.takenAt < 500);
    },

    playerSpeedMult: () => (winded(lp, ctx.scene.time.now) ? 0.55 : 1),
    npcSpeedMult: () => (winded(ln, ctx.scene.time.now) ? 0.55 : 1),
    playerTakenMult: () => (winded(lp, ctx.scene.time.now) ? WINDED_TAKEN : 1),
    npcTakenMult: () => (winded(ln, ctx.scene.time.now) ? WINDED_TAKEN : 1),

    npcSeek() {
      // Puffin collects: the nearest loose bottle, always.
      let best: Bottle | null = null, bd = Infinity;
      for (const b of bottles) {
        if (b.taken) continue;
        const d = dist(npc.x, npc.y, b.x, b.y);
        if (d < bd) { bd = d; best = b; }
      }
      return best && bd < 520 ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const b of bottles) {
        if (b.taken) continue;
        g.fillStyle(BREATH, 0.1 + Math.sin(time / 200 + b.spin) * 0.04); g.fillCircle(b.x, b.y, BOTTLE_R);
        // A trail of breath where it has rolled.
        g.fillStyle(BREATH, 0.12); g.fillCircle(b.x - b.vx * 0.15, b.y - b.vy * 0.15, 6);
      }
    },

    drawAir(g, time) {
      for (const b of bottles) {
        if (b.taken) {
          // Uncorked: the breath goes up in a twist — blue to you, brass-flecked into Puffin's satchel.
          const k = (time - b.takenAt) / 500;
          const toNpc = b.takenBy === npc;
          for (let i = 0; i < 6; i++) {
            const a = i + k * 6;
            g.fillStyle(toNpc ? BRASS_LIT : BREATH, 0.7 * (1 - k));
            g.fillCircle(b.x + Math.cos(a) * 10 * k, b.y - 20 - k * 40 + Math.sin(a) * 6, 4 * (1 - k) + 1);
          }
          continue;
        }
        // Rolling: the bottle drawn on its side, turning.
        const a = Math.atan2(b.vy, b.vx);
        g.fillStyle(0x000000, 0.2); g.fillEllipse(b.x, b.y + 4, 22, 6);
        const c = Math.cos(b.spin);
        breathBottle(g, b.x, b.y + 8, 0.8, time / 1000 + b.spin, 1);
        g.lineStyle(1, 0xffffff, 0.4 * Math.abs(c)); g.lineBetween(b.x - 4, b.y - 8, b.x - 4 + Math.cos(a) * 3, b.y);
      }
      // The meters, on each fighter's chest, and the winded fighter doubled over with a cloud.
      for (const l of lungs) {
        if (!alive(l.f)) continue;
        const f = l.f;
        breathMeter(g, f.x + 14, f.y - 4, 6, 1 - l.breath / MAX);
        if (winded(l, time)) {
          const k = (l.windedUntil - time) / WINDED_MS;
          for (let i = 0; i < 3; i++) {
            const ph = (time / 500 + i / 3) % 1;
            g.lineStyle(1.5, 0xc8d8e8, 0.7 * (1 - ph));
            g.strokeCircle(f.x + 16 + ph * 10, f.y - 30 - ph * 18, 3 + ph * 4);
          }
          g.lineStyle(2, BREATH, 0.6); g.beginPath(); g.arc(f.x, f.y - 56, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        if (time - l.gaspFx < 400) {
          const k = (time - l.gaspFx) / 400;
          g.lineStyle(2, 0xffffff, 1 - k); g.strokeCircle(f.x, f.y - 10, 20 + k * 30);
        }
      }
      // Puffin's satchel of banked bottles: little glass ticks over his head.
      if (alive(npc)) {
        const n = Math.min(ln.banked, 9);
        for (let i = 0; i < n; i++) {
          g.fillStyle(LEATHER_DARK, 1); g.fillRect(npc.x - 22 + i * 5, npc.y - 70, 4, 7);
          g.fillStyle(i % 3 === 2 ? BRASS : LEATHER, 1); g.fillRect(npc.x - 22 + i * 5, npc.y - 69, 3, 5);
        }
      }
    },

    drawHud(g, time) {
      // Two big gauges at the top: yours left of centre, Puffin's right.
      const draw = (l: Lung, x: number, label: 'you' | 'foe') => {
        const y = top + 24;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 92, y - 14, 184, 28, 8);
        breathMeter(g, x - 76, y, 11, 1 - l.breath / MAX);
        const k = l.breath / MAX;
        g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 58, y - 6, 140, 12);
        const col = winded(l, time) ? 0x7a8aa0 : k < 0.3 ? 0xff7a5a : BREATH;
        g.fillStyle(col, 1); g.fillRect(x - 57, y - 5, 138 * k, 10);
        if (label === 'foe') { g.fillStyle(BRASS_LIT, 1); for (let i = 0; i < Math.min(ln.banked, 12); i++) g.fillRect(x - 56 + i * 11, y + 8, 8, 3); }
        if (winded(l, time) && Math.floor(time / 150) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.8); g.strokeRoundedRect(x - 92, y - 14, 184, 28, 8); }
      };
      draw(lp, W / 2 - 110, 'you');
      draw(ln, W / 2 + 110, 'foe');
    },
  };
}

export const BREATH_METER: GimmickDef = {
  id: 'galeward-breath-meter',
  rules: 'Both of you wear a breath-meter: casting costs breath, dashing costs more, resting refills it. Run dry and you are WINDED — slow, basic strikes only, +20% damage taken — until you gasp. Walk over rolling breath-bottles to refill; Puffin collects them for the King.',
  make,
};
