import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, DREAM, DREAM_LIT, LINEN, NIGHTMARE, NIGHTMARE_EYE, dist, star } from '../art';

/**
 * Bad Dream — Dreadmonger Mara's corner of Lampless Row.
 *
 * The yard flips between WAKING and DREAM. While it is a dream, nothing anyone does quite lands:
 * a hit only grazes (a fifth of it), and the rest is *held* — it gathers over the victim's head as
 * a black cloud with a number in it. When the yard wakes, every held point lands at once. And
 * whoever is carrying the bigger cloud wakes screaming — stunned, with the other one already up.
 *
 * So a dream is a race: hit hard and don't get hit. And it can be ended early. Part-way through
 * every dream a brass alarm clock appears somewhere on the floor; whoever runs into it rings it,
 * and the whole yard wakes there and then. Mara goes for the clock when she's ahead and steers
 * clear of it when she's behind — and so should you.
 */

const WAKING_MS = 7000;
const WAKING_HARD_MS = 6000;
const DREAM_MS = 6000;
const WARN_MS = 1200;
const CLOCK_AFTER_MS = 1600;
const CLOCK_R = 30;
const GRAZE = 0.2;
const SCREAM_MS = 1100;
const SCREAM_HARD_MS = 1300;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const wakingMs = ctx.hard ? WAKING_HARD_MS : WAKING_MS;
  const screamMs = ctx.hard ? SCREAM_HARD_MS : SCREAM_MS;

  let mode: 'waking' | 'dream' = 'waking';
  let modeAt = 0;
  let nextFlip = 4500;
  let held = new Map<Fighter, number>();
  let clock: Pt | null = null;
  let clockAt = 0;
  /** Held damage waiting to land on the frame after waking (once the graze multiplier lifts). */
  let pending: { f: Fighter; amount: number }[] = [];
  let screamAt = -9999;
  let screamer: Fighter | null = null;
  let announced = false;
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const heldOf = (f: Fighter): number => held.get(f) ?? 0;

  const clearSpot = (): Pt => {
    let best: Pt = { x: W / 2, y: (H + top) / 2 };
    let bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const p = { x: 90 + rng() * (W - 180), y: top + 70 + rng() * (H - top - 140) };
      // Roughly as far from both, so neither starts on it.
      const dp = dist(p.x, p.y, ctx.player.x, ctx.player.y), dn = dist(p.x, p.y, ctx.npc.x, ctx.npc.y);
      const score = Math.min(dp, dn) - Math.abs(dp - dn) * 0.6 + rng() * 30;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  };

  const wake = (time: number, rung: Fighter | null): void => {
    mode = 'waking'; modeAt = time; nextFlip = time + wakingMs;
    clock = null;
    const hp = heldOf(ctx.player), hn = heldOf(ctx.npc);
    if (hp > 0) pending.push({ f: ctx.player, amount: hp });
    if (hn > 0) pending.push({ f: ctx.npc, amount: hn });
    held = new Map();
    ctx.banner(rung ? (rung === ctx.player ? 'YOU RANG THE ALARM' : 'MARA RANG THE ALARM') : 'WAKE UP', '#ffe2a0');
    ctx.sfx(rung ? 'countdown-go' : 'boss-phase');
    screamer = hp > hn + 0.5 ? ctx.player : hn > hp + 0.5 ? ctx.npc : null;
    if (screamer && alive(screamer)) {
      screamAt = time;
      ctx.stun(screamer, screamMs);
      ctx.float(screamer.x, screamer.y - 62, 'WAKES SCREAMING', screamer === ctx.player ? '#ff9ac8' : '#9df5c8');
      ctx.sfx('screech');
    }
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('SWEET DREAMS, DEARIE', '#e4d8ff'); }
      // Land the held damage now that the graze has lifted.
      if (pending.length && mode === 'waking' && time - modeAt > 30) {
        for (const p of pending) {
          if (!alive(p.f)) continue;
          ctx.hit(p.f, p.amount, p.f.x, p.f.y);
          ctx.flash(p.f.x, p.f.y, NIGHTMARE);
          ctx.float(p.f.x, p.f.y - 44, `-${Math.round(p.amount)} (HELD)`, '#c8a8ff');
        }
        pending = [];
      }
      if (mode === 'waking' && time >= nextFlip) {
        mode = 'dream'; modeAt = time;
        held = new Map();
        clockAt = time + CLOCK_AFTER_MS;
        ctx.banner('DREAM', '#b89cff');
        ctx.sfx('time-warp');
      } else if (mode === 'dream') {
        if (!clock && time >= clockAt) { clock = clearSpot(); ctx.sfx('clock-tick'); }
        if (clock) {
          for (const f of [ctx.player, ctx.npc]) {
            if (alive(f) && dist(f.x, f.y + 10, clock.x, clock.y) < CLOCK_R) { wake(time, f); return; }
          }
        }
        if (time - modeAt >= DREAM_MS) wake(time, null);
      }
    },

    playerTakenMult: () => (mode === 'dream' ? GRAZE : 1),
    npcTakenMult: () => (mode === 'dream' ? GRAZE : 1),
    onPlayerHurt(amount) {
      if (mode === 'dream') held.set(ctx.player, heldOf(ctx.player) + amount * ((1 - GRAZE) / GRAZE));
    },
    onNpcHurt(amount) {
      if (mode === 'dream') held.set(ctx.npc, heldOf(ctx.npc) + amount * ((1 - GRAZE) / GRAZE));
    },

    npcSeek(): Pt | null {
      if (mode !== 'dream' || !clock) return null;
      const n = ctx.npc;
      // Ahead in the dream: ring the clock. Behind: stand between you and it.
      if (heldOf(n) + 4 < heldOf(ctx.player)) return { x: clock.x, y: clock.y - 10 };
      if (heldOf(n) > heldOf(ctx.player) + 4) {
        const p = ctx.player;
        return { x: (p.x + clock.x) / 2, y: (p.y + clock.y) / 2 };
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      const sinceFlip = time - modeAt;
      const fade = mode === 'dream' ? Math.min(1, sinceFlip / 500) : Math.max(0, 1 - sinceFlip / 400);
      if (fade > 0) {
        // The dream: the yard washed violet, the floor swimming in slow bands, doors and stairs
        // that go nowhere drifting in the deep of it.
        g.fillStyle(0x2a1a48, 0.38 * fade); g.fillRect(0, top, W, H - top);
        for (let i = 0; i < 9; i++) {
          const y = top + 30 + i * ((H - top) / 9) + Math.sin(t * 0.8 + i) * 8;
          g.lineStyle(10, DREAM, 0.06 * fade);
          g.beginPath(); g.moveTo(0, y);
          for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * 0.012 + t * 1.4 + i) * 10);
          g.strokePath();
        }
        for (let i = 0; i < 4; i++) {
          const x = (i * 263 + t * 18) % (W + 200) - 100, y = top + 80 + ((i * 151) % (H - top - 160));
          const a = 0.12 * fade;
          // A door standing on its own, ajar.
          g.fillStyle(DREAM_LIT, a); g.fillRect(x - 18, y - 46, 36, 56);
          g.fillStyle(NIGHTMARE, a * 2); g.fillRect(x - 14, y - 42, 18, 50);
          // Stairs climbing to nothing beside it.
          for (let s = 0; s < 5; s++) { g.fillStyle(DREAM_LIT, a * 0.8); g.fillRect(x + 30 + s * 10, y + 4 - s * 10, 12, 6); }
        }
      }
      // The flip warning: a great eye on the floor, opening for WAKING, closing for DREAM.
      const toFlip = mode === 'waking' ? nextFlip - time : DREAM_MS - sinceFlip;
      if (toFlip < WARN_MS && toFlip > 0) {
        const k = 1 - toFlip / WARN_MS;
        const cx = W / 2, cy = (H + top) / 2;
        const open = mode === 'waking' ? 1 - k : k;
        g.lineStyle(4, mode === 'waking' ? DREAM : 0xffe2a0, 0.5);
        g.strokeEllipse(cx, cy, 260, 120 * Math.max(0.05, open));
        g.fillStyle(mode === 'waking' ? NIGHTMARE : LINEN, 0.25 * open); g.fillEllipse(cx, cy, 250, 112 * open);
        g.fillStyle(mode === 'waking' ? DREAM : 0xffe2a0, 0.5 * open); g.fillCircle(cx, cy, 30 * open);
      }
      // The alarm clock's ring of warning on the floor.
      if (clock) {
        g.lineStyle(2, BRASS, 0.5 + 0.3 * Math.sin(t * 10)); g.strokeCircle(clock.x, clock.y, CLOCK_R + 6);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(clock.x, clock.y + 4, 36, 10);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The clock: brass, two bells on top, shaking itself silly.
      if (clock) {
        const sh = Math.sin(t * 40) * 1.6;
        const x = clock.x + sh, y = clock.y - 16;
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 15);
        g.fillStyle(BRASS, 1); g.fillCircle(x, y, 13);
        g.fillStyle(LINEN, 1); g.fillCircle(x, y, 10);
        g.lineStyle(1.6, 0x2a2020, 1); g.lineBetween(x, y, x, y - 7); g.lineBetween(x, y, x + 5, y + 2);
        for (const s of [-1, 1]) {
          g.fillStyle(BRASS, 1); g.fillCircle(x + s * 10, y - 13, 6);
          g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(x + s * 3, y - 18, x + s * 13, y - 8);
        }
        g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x - 9, y + 10, x - 12, y + 16); g.lineBetween(x + 9, y + 10, x + 12, y + 16);
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.7;
          g.lineStyle(1.5, 0xffe2a0, 0.5 + 0.5 * Math.sin(t * 20 + i));
          g.lineBetween(x + Math.cos(a) * 22, y - 8 + Math.sin(a) * 22, x + Math.cos(a) * 30, y - 8 + Math.sin(a) * 30);
        }
      }
      // Held damage: a black cloud over each head, swelling with what is owed.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        const h = heldOf(f);
        if (h <= 0 && mode !== 'dream') continue;
        const r = 8 + Math.min(26, Math.sqrt(h) * 3.2);
        const x = f.x, y = f.y - 62 - r * 0.4;
        const lead = h > (f === ctx.player ? heldOf(ctx.npc) : heldOf(ctx.player)) + 0.5;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + t * 0.6;
          g.fillStyle(NIGHTMARE, 0.85); g.fillCircle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.25, r * 0.6);
        }
        g.fillStyle(lead ? NIGHTMARE_EYE : DREAM, lead ? 0.9 : 0.6);
        g.fillCircle(x - r * 0.25, y, 2.2); g.fillCircle(x + r * 0.25, y, 2.2);
        // A thin bar under it reading the amount.
        g.fillStyle(0x000000, 0.5); g.fillRect(x - 22, y + r * 0.55 + 4, 44, 5);
        g.fillStyle(lead ? NIGHTMARE_EYE : DREAM_LIT, 0.9); g.fillRect(x - 22, y + r * 0.55 + 4, Math.min(44, h * 0.9), 5);
      }
      // The screamer: jagged lines off their head for a beat.
      const sk = (time - screamAt) / screamMs;
      if (screamer && sk >= 0 && sk < 1 && alive(screamer)) {
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI + (i / 7) * Math.PI;
          const r0 = 26 + sk * 8, r1 = 40 + sk * 18 + (i % 2) * 6;
          g.lineStyle(2.5, i % 2 ? NIGHTMARE_EYE : lit(DREAM, 0.3), 1 - sk);
          g.lineBetween(screamer.x + Math.cos(a) * r0, screamer.y - 20 + Math.sin(a) * r0, screamer.x + Math.cos(a) * r1, screamer.y - 20 + Math.sin(a) * r1);
        }
      }
      // A few stars wheeling overhead while it is a dream.
      if (mode === 'dream') {
        for (let i = 0; i < 7; i++) {
          const a = t * 0.3 + (i / 7) * Math.PI * 2;
          star(g, W / 2 + Math.cos(a) * (W * 0.42), (H + top) / 2 + Math.sin(a) * ((H - top) * 0.4), 4, DREAM_LIT, 0.5, t + i);
        }
      }
    },

    drawHud(g, time) {
      // A strip under the HUD: DREAM or WAKING, and how long until it turns.
      const total = mode === 'dream' ? DREAM_MS : wakingMs;
      const left = mode === 'dream' ? DREAM_MS - (time - modeAt) : nextFlip - time;
      const k = Math.max(0, Math.min(1, left / total));
      const x = W / 2 - 120, y = top + 6;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 4, y - 3, 248, 12, 5);
      g.fillStyle(mode === 'dream' ? DREAM : 0xffe2a0, 0.85); g.fillRoundedRect(x, y, 240 * k, 6, 3);
      g.fillStyle(dim(mode === 'dream' ? DREAM : 0xffe2a0, 0.4), 1); g.fillCircle(mode === 'dream' ? x - 12 : x + 252, y + 3, 5);
    },
  };
}

export const BAD_DREAM: GimmickDef = {
  id: 'slumber-bad-dream',
  rules: 'In the DREAM hits only graze — the rest is held and lands on waking, and whoever held more wakes screaming (stunned). Ring the alarm clock to wake early.',
  make,
};
