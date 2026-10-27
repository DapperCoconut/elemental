import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { brandSigil, glow } from '../../../../../art/IsleArt';
import { EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE_GOLD, SOOT } from '../palette';
import { alive, dist, frameClock } from './util';

/**
 * Ember Tithe — Tithe-Taker Brask.
 *
 * A great tithe brazier stands at the head of the room and flings branded embers out across
 * the floor in long arcs; each lands where a ring has been warning for it. Walk over a landed
 * ember and it is yours: every ember you hold makes your hits land 10% harder. Get hit and you
 * spill one back onto the floor beside you. Every fifteen seconds the Count comes round and
 * whoever holds *fewer* embers is burned for keeping a cold hearth.
 *
 * Brask is a tithe-taker: he beelines for every ember on the floor (`npcSeek`). The player beats
 * the rule by reading the arcs — every other ember is thrown near *you* — and by making Brask
 * spill his: he drops one every time you land a real hit.
 */

const MAX_STACKS = 6;
const PER_STACK = 0.1;
const MAX_LIVE = 5;
const PICK_R = 30;
const FLIGHT_MS = 950;
const COUNT_MS = 15000;
const SPILL_ICD = 850;

interface Ember {
  x: number; y: number;
  fromX: number; fromY: number;
  bornAt: number; landAt: number;
  /** Spilled embers tumble a short hop instead of a long arc. */
  spilled: boolean;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const step = frameClock();
  const brazier: Pt = { x: W / 2, y: top + 50 };
  const embers: Ember[] = [];
  let pStacks = 0;
  let nStacks = 0;
  let nextThrow = 0;
  let throwN = 0;
  let countAt = 0;
  let warned = false;
  let lastPSpill = 0;
  let lastNSpill = 0;
  /** Burning pillar on the loser of the last count, for the art. */
  let countFx: { x: number; y: number; at: number; who: 'p' | 'n' } | null = null;
  let started = false;
  /** The Count's own burn is a fine, not a blow — it must not spill embers too. */
  let counting = false;
  const throwEvery = ctx.hard ? 1900 : 2400;

  function landSpot(nearPlayer: boolean): Pt {
    for (let tries = 0; tries < 12; tries++) {
      const p = nearPlayer
        ? { x: player.x + (rng() - 0.5) * 360, y: player.y + (rng() - 0.5) * 300 }
        : { x: 70 + rng() * (W - 140), y: top + 120 + rng() * (H - top - 170) };
      p.x = Math.max(60, Math.min(W - 60, p.x));
      p.y = Math.max(top + 110, Math.min(H - 50, p.y));
      if (dist(p.x, p.y, brazier.x, brazier.y) < 110) continue;
      if (embers.some((e) => dist(e.x, e.y, p.x, p.y) < 70)) continue;
      return p;
    }
    return { x: 80 + rng() * (W - 160), y: top + 140 + rng() * (H - top - 200) };
  }

  function throwEmber(time: number): void {
    const near = throwN++ % 2 === 0;
    const at = landSpot(near);
    embers.push({
      x: at.x, y: at.y, fromX: brazier.x, fromY: brazier.y - 20,
      bornAt: time, landAt: time + FLIGHT_MS, spilled: false, seed: rng() * 10,
    });
    ctx.sfx('fireball');
  }

  function spill(time: number, from: { x: number; y: number }): void {
    const a = rng() * Math.PI * 2;
    const d = 70 + rng() * 50;
    const x = Math.max(60, Math.min(W - 60, from.x + Math.cos(a) * d));
    const y = Math.max(top + 70, Math.min(H - 50, from.y + Math.sin(a) * d));
    embers.push({ x, y, fromX: from.x, fromY: from.y, bornAt: time, landAt: time + 420, spilled: true, seed: rng() * 10 });
  }

  function landed(e: Ember, time: number): boolean { return time >= e.landAt; }

  return {
    update(time) {
      step(time);
      if (!started) {
        started = true;
        nextThrow = time + 900;
        countAt = time + COUNT_MS;
      }
      if (time >= nextThrow) {
        nextThrow = time + throwEvery;
        if (embers.length < MAX_LIVE) throwEmber(time);
      }

      // Pick-ups. The player gets first claim on a tie — it is their fight.
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        if (!landed(e, time)) continue;
        if (alive(player) && dist(player.x, player.y, e.x, e.y) < PICK_R && pStacks < MAX_STACKS) {
          pStacks++;
          embers.splice(i, 1);
          ctx.float(e.x, e.y - 20, `TITHE ×${pStacks}`, '#ffc070');
          ctx.sfx('money');
          continue;
        }
        if (alive(npc) && dist(npc.x, npc.y, e.x, e.y) < PICK_R && nStacks < MAX_STACKS) {
          nStacks++;
          embers.splice(i, 1);
          ctx.float(e.x, e.y - 20, `BRASK ×${nStacks}`, '#ff8a5a');
          ctx.sfx('money');
        }
      }

      // The Count.
      if (!warned && time >= countAt - 3000) {
        warned = true;
        ctx.banner('THE COUNT IS COMING', '#ffc070');
        ctx.sfx('countdown-tick');
      }
      if (time >= countAt) {
        countAt = time + COUNT_MS;
        warned = false;
        const burn = ctx.hard ? 18 : 14;
        if (pStacks < nStacks && alive(player)) {
          counting = true;
          ctx.hit(player, burn, player.x, player.y);
          counting = false;
          ctx.banner('COLD HEARTH — YOU PAY', '#ff6a3a');
          countFx = { x: player.x, y: player.y, at: time, who: 'p' };
          ctx.sfx('flame-burst');
        } else if (nStacks < pStacks && alive(npc)) {
          counting = true;
          ctx.hit(npc, burn, npc.x, npc.y);
          counting = false;
          ctx.banner('COLD HEARTH — BRASK PAYS', '#ffd27a');
          countFx = { x: npc.x, y: npc.y, at: time, who: 'n' };
          ctx.sfx('flame-burst');
        } else {
          ctx.banner('THE COUNT IS EVEN', '#d8ccb0');
          ctx.sfx('clang');
        }
      }
      if (countFx && time - countFx.at > 900) countFx = null;

      // Keep spills from stacking up past what the floor can show.
      if (embers.length > MAX_LIVE + 3) embers.splice(0, embers.length - (MAX_LIVE + 3));
    },

    onPlayerHurt(amount) {
      const time = ctx.scene.time.now;
      if (counting || amount < 4 || pStacks <= 0 || time - lastPSpill < SPILL_ICD) return;
      lastPSpill = time;
      pStacks--;
      spill(time, player);
      ctx.float(player.x, player.y - 34, 'SPILLED', '#ff8a5a');
    },

    onNpcHurt(amount) {
      const time = ctx.scene.time.now;
      if (counting || amount < 4 || nStacks <= 0 || time - lastNSpill < SPILL_ICD) return;
      lastNSpill = time;
      nStacks--;
      spill(time, npc);
      ctx.float(npc.x, npc.y - 34, 'SPILLED', '#ffc070');
    },

    npcTakenMult: () => 1 + pStacks * PER_STACK,
    playerTakenMult: () => 1 + nStacks * PER_STACK,

    npcSeek() {
      // Brask beelines for the nearest ember that is down or about to be.
      const now = ctx.scene.time.now;
      if (nStacks >= MAX_STACKS) return null;
      let best: Ember | null = null;
      let bd = 640;
      for (const e of embers) {
        if (e.landAt - now > 500) continue;
        const d = dist(npc.x, npc.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      drawBrazier(g, brazier.x, brazier.y, time);
      for (const e of embers) {
        if (!landed(e, time)) {
          // Landing ring tightens as the ember comes down.
          const k = (time - e.bornAt) / (e.landAt - e.bornAt);
          g.lineStyle(2, EMBER_LIT, 0.35 + k * 0.5);
          g.strokeCircle(e.x, e.y, 34 - k * 18);
          g.fillStyle(EMBER, 0.08 + k * 0.18);
          g.fillCircle(e.x, e.y, 26);
          g.fillStyle(SOOT, 0.25 * k);
          g.fillEllipse(e.x, e.y + 2, 18 * k + 4, 7 * k + 2);
          continue;
        }
        // A landed tithe ember: a coal stamped with the brand, scorching the floor.
        const pulse = 1 + Math.sin(time / 180 + e.seed) * 0.12;
        g.fillStyle(SOOT, 0.4); g.fillEllipse(e.x, e.y + 3, 38, 14);
        glow(g, e.x, e.y, 30 * pulse, GLOW, 0.06, 3);
        g.fillStyle(EMBER_DARK, 1); g.fillCircle(e.x, e.y, 10);
        g.fillStyle(EMBER, 1); g.fillCircle(e.x, e.y - 1, 8);
        brandSigil(g, e.x, e.y - 1, 4.4, KINDLE_GOLD, 0.95);
        g.lineStyle(1.2, EMBER_LIT, 0.5 + Math.sin(time / 140 + e.seed) * 0.3);
        g.strokeCircle(e.x, e.y, PICK_R);
      }
      if (countFx) {
        const k = (time - countFx.at) / 900;
        g.fillStyle(countFx.who === 'p' ? EMBER : KINDLE_GOLD, 0.4 * (1 - k));
        g.fillCircle(countFx.x, countFx.y, 40 + k * 30);
      }
    },

    drawAir(g, time) {
      // Embers in flight: a high arc out of the brazier with a short trail.
      for (const e of embers) {
        if (landed(e, time)) continue;
        const k = (time - e.bornAt) / (e.landAt - e.bornAt);
        const arcH = e.spilled ? 40 : 160 + dist(e.fromX, e.fromY, e.x, e.y) * 0.18;
        for (let s = 0; s < 4; s++) {
          const kk = Math.max(0, k - s * 0.04);
          const x = e.fromX + (e.x - e.fromX) * kk;
          const y = e.fromY + (e.y - e.fromY) * kk - Math.sin(kk * Math.PI) * arcH;
          g.fillStyle(s === 0 ? EMBER_LIT : EMBER, 0.9 - s * 0.2);
          g.fillCircle(x, y, 6 - s);
        }
      }
      // Held tithe orbits whoever holds it — a count you can read at a glance.
      orbit(g, player.x, player.y, pStacks, time, EMBER_LIT);
      orbit(g, npc.x, npc.y, nStacks, time + 500, EMBER);
      if (countFx) {
        const k = (time - countFx.at) / 900;
        const x = countFx.x, y = countFx.y;
        for (let i = 0; i < 5; i++) {
          const h = (80 + i * 16) * (1 - k * 0.4);
          g.fillStyle(i % 2 ? EMBER : EMBER_LIT, 0.7 * (1 - k));
          g.fillTriangle(x - 14 + i * 7, y, x - 6 + i * 7, y, x - 10 + i * 7, y - h);
        }
      }
    },

    drawHud(g, time) {
      // Two tithe trays — yours on the left, Brask's on the right — and the Count's dial.
      const y = top + 16;
      tray(g, 24, y, pStacks, EMBER_LIT, 1);
      tray(g, W - 24, y, nStacks, EMBER, -1);
      const cx = W / 2, cy = top + 22;
      const k = Math.max(0, Math.min(1, 1 - (countAt - time) / COUNT_MS));
      g.fillStyle(0x000000, 0.45); g.fillCircle(cx, cy, 15);
      g.lineStyle(3, warned && Math.floor(time / 160) % 2 === 0 ? 0xffffff : KINDLE_GOLD, 0.95);
      g.beginPath(); g.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      brandSigil(g, cx, cy, 6, KINDLE_GOLD, 0.9);
    },
  };
}

function drawBrazier(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 26, 120, 26);
  g.lineStyle(6, IRON, 1);
  g.lineBetween(x - 40, y + 26, x - 26, y - 4);
  g.lineBetween(x + 40, y + 26, x + 26, y - 4);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 6, 112, 34);
  g.fillStyle(EMBER_DARK, 1); g.fillEllipse(x, y - 12, 96, 22);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.fillStyle(i % 2 ? EMBER : EMBER_LIT, 0.9);
    g.fillCircle(x + Math.cos(a) * 32, y - 12 + Math.sin(a) * 7, 6);
  }
  glow(g, x, y - 20, 70, GLOW, 0.05, 4);
  for (let i = 0; i < 5; i++) {
    const h = 26 + Math.sin(time / 120 + i * 1.7) * 9;
    const ox = (i - 2) * 14;
    g.fillStyle(i % 2 ? EMBER : EMBER_LIT, 0.85);
    g.fillTriangle(x + ox - 8, y - 14, x + ox + 8, y - 14, x + ox, y - 14 - h);
  }
  brandSigil(g, x, y + 4, 8, KINDLE_GOLD, 0.9);
}

function orbit(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, time: number, col: number): void {
  for (let i = 0; i < n; i++) {
    const a = time / 520 + (Math.PI * 2 * i) / Math.max(1, n);
    const ox = x + Math.cos(a) * 30, oy = y - 6 + Math.sin(a) * 12;
    g.fillStyle(col, 0.25); g.fillCircle(ox, oy, 6);
    g.fillStyle(col, 1); g.fillCircle(ox, oy, 3.4);
  }
}

function tray(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, col: number, dir: 1 | -1): void {
  const w = MAX_STACKS * 16 + 10;
  const x0 = dir > 0 ? x : x - w;
  g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0, y - 9, w, 18, 6);
  g.lineStyle(1.5, IRON, 1); g.strokeRoundedRect(x0, y - 9, w, 18, 6);
  for (let i = 0; i < MAX_STACKS; i++) {
    const px = x0 + 13 + i * 16;
    g.fillStyle(i < n ? col : 0x2b2725, 1); g.fillCircle(px, y, 5);
    if (i < n) { g.fillStyle(0xffffff, 0.6); g.fillCircle(px - 1.5, y - 1.5, 1.4); }
  }
}

export const EMBER_TITHE: GimmickDef = {
  id: 'hearth-ember-tithe',
  rules: 'Grab thrown tithe embers: +10% damage each. Hits spill them. Every 15s, whoever holds fewer burns.',
  make,
};
