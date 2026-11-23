import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { glow } from '../../../../../art/IsleArt';
import { glyphs } from '../art';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, IVORY, IVORY_DIM, LOT_LILAC, SIDE_NPC, SIDE_PLAYER, BRASS, BRASS_DIM } from '../palette';
import { type Who, alive, clamp, other } from '../util';

/**
 * Seat of the Hour — Councilor Hora Calends, who wrote the hours-tithe: the drawn pay hours into
 * the clocks, lose an afternoon, and wake older.
 *
 * DECREE OF THE HOUR BILL. One fighter carries the Bill — a pocket watch on a chain, ticking —
 * and the great clock in the floor counts it down. When the hand comes round, whoever holds the
 * Bill pays: the hour is taken out of them (stunned, frozen under a bell of falling sand), they
 * wake older (every cooldown pushed back), and the next Bill is written to the other. But a Bill
 * is served by hand: land a real blow on your foe while you hold it and it is theirs — stamped,
 * so it cannot come straight back for a moment. The councilor's whole kit is delay and
 * warrant; it knows how to serve a Bill at the last second. So can you.
 */

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const CX = ctx.W / 2, CY = (ctx.top + ctx.H) / 2 + 10;
  const DIAL = 150;
  const BILL_MS = ctx.hard ? 8000 : 9000;
  const STAMP_MS = 1400;
  const TAKEN_MS = ctx.hard ? 1800 : 1600;
  const AGE_MS = 2000;
  const PAY_DMG = 10;
  const MIN_BLOW = 4;

  let holder: Who = 'player';
  let dueAt = 0;
  let stampUntil = 0;
  let passAt = -9999;
  let passFrom: Who = 'npc';
  let frozen: Who | null = null;
  let frozenUntil = 0;
  let lastTick = 0;
  let selfHit = false;
  const now = () => ctx.scene.time.now;
  const fighter = (w: Who) => (w === 'player' ? ctx.player : ctx.npc);

  const pass = (to: Who, time: number, served: boolean): void => {
    passFrom = holder;
    holder = to;
    passAt = time;
    stampUntil = time + STAMP_MS;
    if (served) {
      const f = fighter(to);
      ctx.float(f.x, f.y - 56, 'SERVED', to === 'player' ? CSS_NPC : CSS_PLAYER);
      ctx.sfx('clock-tick');
    }
  };

  const pay = (time: number): void => {
    const f = fighter(holder);
    ctx.sfx('time-warp');
    if (alive(f)) {
      ctx.stun(f, TAKEN_MS);
      selfHit = true;
      ctx.hit(f, PAY_DMG, f.x, f.y);
      selfHit = false;
      f.delayCooldowns?.(AGE_MS);
      frozen = holder;
      frozenUntil = time + TAKEN_MS;
      ctx.float(f.x, f.y - 60, 'AN HOUR TAKEN', CSS_LOT);
      ctx.banner(holder === 'player' ? 'THE HOUR IS DUE — YOU PAY IT' : 'THE HOUR IS DUE — THE COUNCILOR PAYS IT', CSS_LOT);
    }
    pass(other(holder), time, false);
    dueAt = time + BILL_MS;
  };

  const served = (victim: Who, amount: number): void => {
    if (selfHit || amount < MIN_BLOW) return;
    const t = now();
    if (holder !== other(victim) || t < stampUntil || dueAt === 0) return;
    pass(victim, t, true);
  };

  /** Where on the dial the hand points, 0–1 of the Bill. */
  const handK = (time: number): number => (dueAt === 0 ? 0 : clamp(1 - (dueAt - time) / BILL_MS, 0, 1));

  /** A pocket watch: case, face, hand, crown — `k` how far the hand has gone. */
  const watch = (g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, k: number, hot: boolean, time: number): void => {
    if (hot) glow(g, x, y, r * 2.2, LOT_LILAC, 0.05 + 0.04 * Math.sin(time / 60), 3);
    g.fillStyle(BRASS_DIM, 1); g.fillCircle(x, y, r + 2);
    g.fillStyle(BRASS, 1); g.fillCircle(x - 0.6, y - 0.6, r);
    g.fillStyle(IVORY, 1); g.fillCircle(x, y, r * 0.78);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(OBS.glass, 1); g.fillCircle(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, 0.8); }
    const a = -Math.PI / 2 + k * Math.PI * 2;
    g.lineStyle(1.6, OBS.glass, 1); g.lineBetween(x, y, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    g.fillStyle(BRASS, 1); g.fillRect(x - 2, y - r - 5, 4, 4);
    g.lineStyle(1, BRASS, 0.9); g.strokeCircle(x, y - r - 7, 2.5);
  };

  return {
    update(time) {
      if (!alive(ctx.player) || !alive(ctx.npc)) return;
      if (dueAt === 0) { dueAt = time + BILL_MS + 1500; ctx.banner('THE BILL IS WRITTEN TO YOU. SERVE IT WITH A BLOW', CSS_LOT); }
      const left = dueAt - time;
      if (left < 2600 && time - lastTick > (left < 1000 ? 250 : 500)) { lastTick = time; ctx.sfx('clock-tick'); }
      if (time >= dueAt) pay(time);
    },
    onNpcHurt(amount) { served('npc', amount); },
    onPlayerHurt(amount) { served('player', amount); },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const t = now();
      // Holding it: close in and serve it. Not holding it: stay out of reach as the hour comes.
      if (holder === 'npc' && t >= stampUntil) return { x: p.x, y: p.y };
      if (holder === 'player' && dueAt - t < 3200) {
        const dx = n.x - p.x, dy = n.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        return { x: clamp(n.x + (dx / d) * 160, 60, ctx.W - 60), y: clamp(n.y + (dy / d) * 160, ctx.top + 60, ctx.H - 50) };
      }
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      const k = handK(time);
      // The great clock sunk in the glass: a dark dial, sand-lilac inlay, twelve ivory hours.
      g.fillStyle(0x000000, 0.35); g.fillCircle(CX, CY + 6, DIAL + 10);
      g.fillStyle(OBS.glass, 0.9); g.fillCircle(CX, CY, DIAL + 6);
      g.lineStyle(3, OBS.facet, 1); g.strokeCircle(CX, CY, DIAL + 4);
      g.lineStyle(1.2, OBS.edge, 0.55); g.strokeCircle(CX, CY, DIAL + 7);
      // The hour already gone: a lilac wedge of poured sand.
      if (k > 0.002) {
        g.fillStyle(LOT_LILAC, 0.08 + k * 0.12);
        g.slice(CX, CY, DIAL - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
        g.fillPath();
      }
      for (let i = 0; i < 60; i++) {
        const a = -Math.PI / 2 + (i / 60) * Math.PI * 2;
        const big = i % 5 === 0;
        const r0 = DIAL - (big ? 16 : 7);
        g.lineStyle(big ? 2.4 : 1, big ? IVORY : IVORY_DIM, big ? 0.75 : 0.35);
        g.lineBetween(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * (DIAL - 2), CY + Math.sin(a) * (DIAL - 2));
      }
      glyphs(g, '12', CX, CY - DIAL + 30, 12, IVORY, 0.7, 1.6);
      glyphs(g, '6', CX, CY + DIAL - 30, 12, IVORY, 0.5, 1.6);
      glyphs(g, '3', CX + DIAL - 30, CY, 12, IVORY, 0.5, 1.6);
      glyphs(g, '9', CX - DIAL + 30, CY, 12, IVORY, 0.5, 1.6);
      // Old cracks across the face.
      seam(g, [{ x: CX - DIAL * 0.7, y: CY + DIAL * 0.2 }, { x: CX - DIAL * 0.35, y: CY + DIAL * 0.3 }, { x: CX - DIAL * 0.1, y: CY + DIAL * 0.62 }], 1, 0.5, 0.2 + 0.2 * Math.sin(t));
      // The hand, sweeping; red-hot in its last quarter.
      const a = -Math.PI / 2 + k * Math.PI * 2;
      const hot = k > 0.75;
      g.lineStyle(7, OBS.glass, 1); g.lineBetween(CX, CY, CX + Math.cos(a) * (DIAL - 20), CY + Math.sin(a) * (DIAL - 20));
      g.lineStyle(2.5, hot ? LOT_LILAC : OBS.edge, 0.95); g.lineBetween(CX, CY, CX + Math.cos(a) * (DIAL - 22), CY + Math.sin(a) * (DIAL - 22));
      g.fillStyle(OBS.sheen, 1); g.fillCircle(CX, CY, 10);
      g.fillStyle(LOT_LILAC, 0.9); g.fillCircle(CX, CY, 3.5);
      // A ghost line from the dial's centre to whoever holds the Bill.
      const h = fighter(holder);
      g.lineStyle(1, holder === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.18 + (hot ? 0.2 : 0)); g.lineBetween(CX, CY, h.x, h.y);
    },
    drawAir(g, time) {
      const t = time / 1000;
      const k = handK(time);
      // The watch over its holder (or flying across when served).
      const h = fighter(holder);
      let wx = h.x + 26, wy = h.y - 46;
      const fly = clamp((time - passAt) / 280, 0, 1);
      if (fly < 1) {
        const f = fighter(passFrom);
        wx = f.x + 26 + (wx - f.x - 26) * fly; wy = f.y - 46 + (wy - f.y + 46) * fly - Math.sin(fly * Math.PI) * 40;
      }
      g.lineStyle(1, BRASS, 0.8); g.lineBetween(h.x + 8, h.y - 18, wx, wy + 10);
      watch(g, wx, wy, 11, k, k > 0.75, time);
      if (time < stampUntil) {
        // The receipt stamp: a ring that closes as the stamp dries.
        const s = clamp((stampUntil - time) / STAMP_MS, 0, 1);
        g.lineStyle(2, IVORY, 0.8); g.beginPath(); g.arc(wx, wy, 17, -Math.PI / 2, -Math.PI / 2 + s * Math.PI * 2, false); g.strokePath();
      }
      // The hour being taken: a bell of glass over the payer, sand pouring on them.
      if (frozen && time < frozenUntil) {
        const f = fighter(frozen);
        const r = 34;
        g.fillStyle(LOT_LILAC, 0.1); g.fillEllipse(f.x, f.y - 10, r * 2.2, r * 2.6);
        g.lineStyle(2, OBS.edge, 0.75); g.strokeEllipse(f.x, f.y - 10, r * 2.2, r * 2.6);
        g.fillStyle(OBS.sheen, 1); g.fillEllipse(f.x, f.y - 10 - r * 1.3, 18, 6);
        g.fillStyle(0xffffff, 0.15); g.fillEllipse(f.x - r * 0.5, f.y - 26, 8, 30);
        for (let i = 0; i < 14; i++) {
          const ph = ((t * 1.4 + i / 14) % 1);
          g.fillStyle(i % 3 ? IVORY_DIM : LOT_LILAC, 0.9 * (1 - ph * 0.5));
          g.fillCircle(f.x - 18 + ((i * 37) % 36), f.y - 10 - r * 1.2 + ph * r * 2.2, 1.6);
        }
        g.fillStyle(IVORY_DIM, 0.8); g.fillEllipse(f.x, f.y + 20, 40 * (1 - (frozenUntil - time) / TAKEN_MS) + 8, 7);
      } else if (frozen) frozen = null;
    },
    drawHud(g, time) {
      const left = Math.max(0, dueAt - time);
      if (dueAt === 0) return;
      const cx = ctx.W / 2, y = ctx.top + 6;
      g.fillStyle(0x07060d, 0.85); g.fillRoundedRect(cx - 74, y, 148, 24, 8);
      g.lineStyle(1.2, holder === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.8); g.strokeRoundedRect(cx - 74, y, 148, 24, 8);
      watch(g, cx - 56, y + 12, 8, handK(time), left < 2600, time);
      glyphs(g, String(Math.ceil(left / 1000)), cx - 26, y + 12, 12, left < 2600 ? LOT_LILAC : IVORY, 1, 1.8);
      // Whose Bill: a dot in their colour.
      g.fillStyle(holder === 'player' ? SIDE_PLAYER : SIDE_NPC, 1); g.fillCircle(cx + 30, y + 12, 7);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(cx + 28, y + 10, 2);
      if (time < stampUntil) { g.lineStyle(1.5, IVORY, 0.8); g.strokeCircle(cx + 30, y + 12, 10); }
    },
  };
};

export const DECREE_HOUR_BILL: GimmickDef = {
  id: 'bench-fate-hour-bill',
  rules: 'Whoever holds the Bill when the hour strikes pays it: stunned, aged, struck. Land a blow on your foe to serve the Bill on them.',
  make,
};
