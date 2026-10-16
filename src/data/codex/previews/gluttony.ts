import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  GluttonyAvatar, HAR, HarvestFx, MoldCell, corruptHeart, corruptionVeil, crowShape, fleshChunk, moldLayer,
  seedShape, sickleShape, sickleTrail,
} from '../../../elements/kits/GluttonyVisuals';

/**
 * Harvest's showcases (element id `gluttony`).
 *
 * Every loop keeps the same small records the kit keeps — a sickle's loop circle, a mold grid,
 * crows on an orbit — and paints them with the kit's own exported painters. One-shots go through
 * a real `HarvestFx` with a sticky sink. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const CELL = 14;
const LOOP_BASE_MS = 620;
const LOOP_MS_PER_PX = 1.5;
const CROW_ORBIT_R = 52;
const CROW_SPIN = 4.2;
const BITE_REACH = 84;
const REAP_REACH = 160;
const REAP_HALF = (80 * Math.PI) / 180;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): HarvestFx {
  return ctx.capture(() => new HarvestFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The scarecrow's rig, or null when a skin has replaced the character. */
function crow(av: unknown): GluttonyAvatar | null {
  return av instanceof GluttonyAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A stand-in enemy that can be moved around, unlike `ctx.addDummy`'s fixed mark. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, rot?: () => number, depth = 4): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  const veil = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
  ctx.onFrame((_dt, e) => {
    g.clear();
    veil.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
    const k = rot ? rot() : 0;
    if (k > 0) corruptionVeil(veil, ctx.tint, at.x, at.y, k, e / 1000, 1);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0c0610', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

/** A mold grid the size of the preview box, grown outward from `seeds` at the kit's pace. */
function moldGrid(ctx: PreviewCtx, seeds: { x: number; y: number; at: number }[], reach: number, rate = 0.32): {
  cells: () => MoldCell[]; at: (x: number, y: number) => number;
} {
  const W = Math.ceil(ctx.w / CELL);
  const H = Math.ceil(ctx.h / CELL);
  const grid = new Float32Array(W * H);
  const prev = new Float32Array(W * H);
  const hash = (i: number): number => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  let acc = 0;
  ctx.onFrame((dt, e) => {
    acc += dt;
    if (acc < 100) return;
    const step = acc / 1000;
    acc = 0;
    prev.set(grid);
    for (let k = 0; k < grid.length; k++) {
      const x = (k % W + 0.5) * CELL;
      const y = (Math.floor(k / W) + 0.5) * CELL;
      let allowed = 0;
      for (const sd of seeds) {
        if (e < sd.at) continue;
        const d2 = (x - sd.x) ** 2 + (y - sd.y) ** 2;
        if (d2 < (CELL * 0.8) ** 2) allowed = 2;
        else if (!allowed && d2 <= (reach * (0.8 + 0.2 * hash(k))) ** 2) allowed = 1;
      }
      if (!allowed) continue;
      const cx = k % W;
      const live = allowed === 2 || (cx > 0 && prev[k - 1] >= 0.35) || (cx < W - 1 && prev[k + 1] >= 0.35)
        || (k >= W && prev[k - W] >= 0.35) || (k + W < grid.length && prev[k + W] >= 0.35);
      if (live || prev[k] > 0) grid[k] = Math.min(1.25, prev[k] + rate * (0.6 + 0.8 * hash(k)) * step);
    }
  });
  return {
    cells: () => {
      const out: MoldCell[] = [];
      for (let k = 0; k < grid.length; k++) {
        if (grid[k] <= 0.03) continue;
        out.push({ x: (k % W + 0.5) * CELL, y: (Math.floor(k / W) + 0.5) * CELL, g: grid[k], h: hash(k * 7 + 3) });
      }
      return out;
    },
    at: (x, y) => {
      const cx = Math.floor(x / CELL);
      const cy = Math.floor(y / CELL);
      return cx < 0 || cy < 0 || cx >= W || cy >= H ? 0 : grid[cy * W + cx];
    },
  };
}

interface Loop { cx: number; cy: number; R: number; phi0: number; side: number; start: number; dur: number; hit: boolean; hits: Set<object>; trail: { x: number; y: number }[] }

/** Throw a sickle loop from the caster at `to`, simulated as the kit does. */
function throwLoop(from: { x: number; y: number }, to: { x: number; y: number }, side: number, now: number): Loop {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const D = Phaser.Math.Clamp(Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y), 140, 380);
  const R = D / 2;
  return {
    cx: from.x + Math.cos(ang) * R, cy: from.y + Math.sin(ang) * R, R, phi0: ang + Math.PI, side, start: now,
    dur: LOOP_BASE_MS + D * LOOP_MS_PER_PX, hit: false, hits: new Set(), trail: [],
  };
}

/** Paint and step a list of sickle loops; `onPass` is asked with each loop's new position. */
function loopLayer(ctx: PreviewCtx, loops: Loop[], onPass: (l: Loop, x: number, y: number) => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, e) => {
    g.clear();
    for (let i = loops.length - 1; i >= 0; i--) {
      const l = loops[i];
      const u = Phaser.Math.Clamp((e - l.start) / l.dur, 0, 1);
      const th = l.phi0 + l.side * u * Math.PI * 2;
      const x = l.cx + Math.cos(th) * l.R;
      const y = l.cy + Math.sin(th) * l.R;
      l.trail.push({ x, y });
      if (l.trail.length > 9) l.trail.shift();
      onPass(l, x, y);
      sickleTrail(g, ctx.tint, l.trail, 1);
      sickleShape(g, ctx.tint, x, y, (e - l.start) * 0.028 * l.side, 11, 1);
      if (u >= 1) loops.splice(i, 1);
    }
  });
}

// ══ CLICK — Sickle ═════════════════════════════════════════════════════

export const sickle: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'Click — the sickle flies a full loop out to the cursor and back to the hand. 12 to everything it passes through; right-click swaps the curl',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const a = { x: ctx.tx - 40, y: ctx.cy - 24 };
    const b = { x: ctx.tx + 20, y: ctx.cy + 28 };
    dummyAt(ctx, a);
    dummyAt(ctx, b);
    const loops: Loop[] = [];
    const caster = { x: ctx.cx, y: ctx.cy };
    loopLayer(ctx, loops, (l, x, y) => {
      for (const d of [a, b]) {
        if (Phaser.Math.Distance.Between(x, y, d.x, d.y) < 30 && !l.hits.has(d)) {
          l.hits.add(d);
          float(ctx, d.x, d.y - 26, '12', hex(HAR.purpleLit), 12);
          ctx.capture(() => fx.sickleHit(d.x, d.y, 0));
        }
      }
    });
    let side = 1;
    const throwAt = (ms: number, s: number): void => ctx.at(ms, () => {
      if (s !== side) { side = s; ctx.capture(() => fx.arcSwap(caster.x, caster.y - 44, side)); }
      loops.push(throwLoop(caster, { x: ctx.tx + 40, y: ctx.cy }, side, ms));
      crow(av)?.play('punch', ctx.aim);
      crow(av)?.setSickleOut(true);
      readout.setText(side > 0 ? 'curling right — out, round, and back to the hand' : 'right-click: now it curls left');
    });
    throwAt(300, 1);
    throwAt(3100, -1);
    ctx.onFrame(() => crow(av)?.setSickleOut(loops.length > 0));
  },
};

// ══ E — Sow Corruption ═════════════════════════════════════════════════

export const sow: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'E — seeds scattered around you grow into a spreading purple mold. Anything standing on it slowly rots',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const seeds: { x: number; y: number; at: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.3;
      const d = 55 + (i % 3) * 22;
      seeds.push({ x: ctx.cx + Math.cos(ang) * d, y: ctx.cy + Math.sin(ang) * d * 0.7, at: 750 + i * 25 });
    }
    // The preview grows a little faster than the arena so the loop shows maturity.
    const mold = moldGrid(ctx, seeds, 70, 0.75);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2.2));
    let rot = 0;
    const victim = { x: ctx.cx + 95, y: ctx.cy + 10 };
    dummyAt(ctx, victim, () => rot);
    ctx.onFrame((dt, e) => {
      ground.clear();
      moldLayer(ground, ctx.tint, mold.cells(), CELL, e / 1000, 0.92, victim);
      for (const sd of seeds) if (e >= sd.at) seedShape(ground, ctx.tint, sd.x, sd.y, sd.x * 0.1, 3.2, 0.95, Math.min(1, (e - sd.at) / 1500));
      if (mold.at(victim.x, victim.y + 8) >= 0.5) rot = Math.min(1, rot + (6 * 4 / 100) * dt / 1000);
    });
    ctx.at(300, () => {
      crow(av)?.play('flex');
      ctx.capture(() => fx.sowCast(ctx.cx, ctx.cy));
      seeds.forEach((sd, i) => ctx.capture(() => fx.seedFlight(ctx.cx, ctx.cy, sd.x, sd.y, 420 + i * 25)));
      readout.setText('seven seeds, scattered around you');
    });
    ctx.at(2400, () => readout.setText('each grows into mold that spreads cell by cell — eyes and mouths in the mature rot'));
    ctx.at(5200, () => readout.setText('standing on it: Corruption creeps up — 6 a second on mature mold'));
  },
};

// ══ R — Feeding Frenzy ═════════════════════════════════════════════════

export const frenzy: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'R — three crows circle your cursor for 6 seconds, pecking for 5. Up to 15 a peck on a fully corrupted enemy',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const victim = { x: ctx.tx, y: ctx.cy };
    let rot = 0.2;
    dummyAt(ctx, victim, () => rot);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const crows = [0, 1, 2].map((i) => ({ x: ctx.cx, y: ctx.cy - 10, ang: 0, phase: (i / 3) * Math.PI * 2, next: 0 }));
    let on = false;
    let until = 0;
    ctx.onFrame((dt, e) => {
      g.clear();
      if (!on || e > until) return;
      const cx = victim.x + Math.sin(e / 700) * 26;
      const cy = victim.y + Math.cos(e / 900) * 12;
      for (const c of crows) {
        const a = (e / 1000) * CROW_SPIN + c.phase;
        const tx = cx + Math.cos(a) * CROW_ORBIT_R;
        const ty = cy + Math.sin(a) * CROW_ORBIT_R * 0.85;
        const px = c.x;
        const py = c.y;
        const d = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
        const step = Math.min(d, 560 * dt / 1000);
        if (d > 0.5) { c.x += ((tx - c.x) / d) * step; c.y += ((ty - c.y) / d) * step; c.ang = Math.atan2(c.y - py, c.x - px); }
        crowShape(g, ctx.tint, c.x, c.y, c.ang, 9, e / 60 + c.phase, 1);
        if (e >= c.next && Phaser.Math.Distance.Between(c.x, c.y, victim.x, victim.y) < 34) {
          c.next = e + 450;
          const dmg = Math.round(5 * (1 + 2 * rot));
          float(ctx, victim.x + (Math.random() - 0.5) * 20, victim.y - 26, `${dmg}`, hex(rot > 0.5 ? HAR.purpleLit : HAR.steelLit), 12);
          ctx.capture(() => fx.peck(victim.x, victim.y, c.ang, rot > 0.5));
        }
      }
    });
    ctx.at(300, () => {
      on = true;
      until = 6300;
      crow(av)?.play('raise', undefined, 520);
      ctx.capture(() => fx.crowRelease(ctx.cx, ctx.cy - 8));
      readout.setText('the crows wheel round the cursor and peck what they fly through');
    });
    ctx.at(3400, () => { rot = 1; readout.setText('a fully corrupted body: every peck lands three times as hard'); });
  },
};

// ══ F — Consume ════════════════════════════════════════════════════════

export const consume: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'F — bite for 18: steals shields and buffs, blocks healing for 8s, and tears off Corrupt Flesh to eat below 75 health',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(0);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const victim = { x: ctx.cx + 74, y: ctx.cy };
    let rot = 0;
    dummyAt(ctx, victim, () => rot);
    const shield = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let shieldOn = true;
    let flesh = 0;
    const trophies = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, e) => {
      shield.clear();
      if (shieldOn) {
        shield.lineStyle(2, 0x66aaff, 0.8);
        shield.strokeCircle(victim.x, victim.y, 24 + Math.sin(e / 200) * 1.5);
      }
      trophies.clear();
      for (let i = 0; i < flesh; i++) {
        const a = (e / 1000) * 1.4 + (i / flesh) * Math.PI * 2;
        fleshChunk(trophies, ctx.tint, ctx.cx + Math.cos(a) * 30, ctx.cy + Math.sin(a) * 10 + 14, 3.4, e / 1000 + i, 1);
      }
    });
    const bite = (ms: number, heavy: boolean): void => ctx.at(ms, () => {
      crow(av)?.play('clap', 0);
      ctx.capture(() => fx.bite(ctx.cx, ctx.cy, 0, BITE_REACH, heavy));
      ctx.at(ms + 160, () => {
        float(ctx, victim.x, victim.y - 26, '18', '#ffffff', 12);
        float(ctx, victim.x, victim.y - 44, '💔 NO HEALING', hex(HAR.fleshLit), 10);
        if (shieldOn) {
          shieldOn = false;
          ctx.capture(() => fx.steal(victim.x, victim.y, ctx.cx, ctx.cy));
          float(ctx, victim.x, victim.y - 60, 'STOLEN: Shield HP', hex(HAR.glow), 10);
        }
        if (heavy) { rot = Math.min(1, rot + 0.4); float(ctx, victim.x, victim.y - 12, '+40 CORRUPTION', hex(HAR.purpleLit), 11); }
        flesh = Math.min(3, flesh + 1);
      });
    });
    bite(400, false);
    ctx.at(500, () => readout.setText('the sack splits along the grin — and the shield comes with the bite'));
    bite(3000, true);
    ctx.at(3100, () => readout.setText('with as much Corrupt HP as health, the bite floods them with Corruption'));
    ctx.at(5400, () => {
      readout.setText('below 75 health a piece of flesh goes straight in: +75 Corrupt HP');
      ctx.capture(() => fx.eatFlesh(ctx.cx, ctx.cy));
      crow(av)?.play('clap', -Math.PI / 2);
      flesh = Math.max(0, flesh - 1);
    });
  },
};

// ══ Q — Reaping Hour ═══════════════════════════════════════════════════

export const reap: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Q — a wide scythe swing for 30: +15% damage taken for good, stacking. Under 10% health (25% if fully corrupted) is killed outright',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(0);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const a = { x: ctx.cx + 110, y: ctx.cy - 40 };
    const b = { x: ctx.cx + 120, y: ctx.cy + 36 };
    let rot = 0.9;
    let bGone = false;
    dummyAt(ctx, a);
    const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const veil = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
    ctx.onFrame((_dt, e) => {
      bg.clear();
      veil.clear();
      if (bGone) return;
      bg.fillStyle(0x2b2f3d, 1); bg.fillCircle(b.x, b.y, 17);
      bg.fillStyle(0x3c4254, 1); bg.fillCircle(b.x, b.y, 13);
      // A thin health bar, nearly empty: under the 25% line a full rot draws.
      bg.fillStyle(0x111111, 0.85); bg.fillRect(b.x - 26, b.y - 38, 52, 7);
      bg.fillStyle(0xff3300, 1); bg.fillRect(b.x - 26, b.y - 38, 52 * 0.22, 7);
      corruptionVeil(veil, ctx.tint, b.x, b.y, rot, e / 1000, 1);
    });
    const swing = (ms: number): void => {
      ctx.at(ms, () => {
        crow(av)?.play('raise', 0, 320);
        ctx.capture(() => fx.reapWindup(ctx.cx, ctx.cy, 0, 320));
      });
      ctx.at(ms + 320, () => {
        crow(av)?.reap(0, 1);
        ctx.capture(() => fx.reapSwing(ctx.cx, ctx.cy, 0, REAP_REACH, REAP_HALF, 1));
        float(ctx, a.x, a.y - 26, '30', '#ffffff', 12);
        ctx.capture(() => fx.reapHit(a.x, a.y, 0));
        float(ctx, a.x, a.y - 44, '🌾 REAPED +15%', hex(HAR.purpleLit), 10);
        if (!bGone) {
          bGone = true;
          ctx.capture(() => fx.execute(b.x, b.y, 0));
          float(ctx, b.x, b.y - 46, '☠ HARVESTED', hex(HAR.glow), 13);
        }
      });
    };
    swing(500);
    ctx.at(700, () => readout.setText('the one below the line — 22% health, fully corrupted — is simply cut down'));
    ctx.at(3600, () => { bGone = false; rot = 0; readout.setText('every cut is another permanent 15% — it compounds'); });
    swing(4200);
  },
};

// ══ Passives ═══════════════════════════════════════════════════════════

export const corruption: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Corruption — rot on the enemy, 0–100%. It heals you off every hit, sharpens the crows and raises the execute line',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const victim = { x: ctx.tx, y: ctx.cy };
    let rot = 0;
    dummyAt(ctx, victim, () => rot);
    const meter = label(ctx, victim.x, victim.y + 34, hex(HAR.purpleLit), 11);
    ctx.onFrame((dt) => {
      rot = Math.min(1, rot + dt / 6000);
      meter.setText(`🟣 ${Math.round(rot * 100)}%`);
    });
    const loops: Loop[] = [];
    loopLayer(ctx, loops, (l, x, y) => {
      if (l.hit || Phaser.Math.Distance.Between(x, y, victim.x, victim.y) > 30) return;
      l.hit = true;
      ctx.capture(() => fx.sickleHit(victim.x, victim.y, 0));
      float(ctx, victim.x, victim.y - 26, '12', '#ffffff', 12);
      const heal = Math.round(12 * rot * 0.35 * 10) / 10;
      if (heal > 0) float(ctx, ctx.cx, ctx.cy - 30, `+${heal}`, '#33dd66', 11);
    });
    for (const ms of [400, 1900, 3400, 4900, 6400]) {
      ctx.at(ms, () => {
        loops.push(throwLoop({ x: ctx.cx, y: ctx.cy }, { x: victim.x + 30, y: victim.y }, 1, ms));
        crow(av)?.play('punch', ctx.aim);
      });
    }
    ctx.at(300, () => readout.setText('every hit on a corrupted body heals you — up to 35% of it at full rot'));
    ctx.at(4200, () => readout.setText('crows bite up to 3× as hard · Reaping Hour kills under 10% → 25%'));
  },
};

export const corruptHp: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Corrupt HP — a purple layer over your health. Cut a heart for 75 (+5/s for 5s); whoever chews through it catches the rot',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e2b0ff', 11);
    const heart = { x: ctx.tx - 10, y: ctx.cy + 8 };
    let heartOn = true;
    let pool = 0;
    let regenUntil = 0;
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2.2));
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const cells: MoldCell[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 * 3;
      const d = 8 + (i / 40) * 46;
      cells.push({ x: heart.x + Math.cos(a) * d, y: heart.y + Math.sin(a) * d * 0.7, g: 1.1, h: (i * 0.137) % 1 });
    }
    ctx.onFrame((dt, e) => {
      if (e < regenUntil) pool += 5 * dt / 1000;
      ground.clear();
      moldLayer(ground, ctx.tint, cells, CELL, e / 1000, 0.92);
      if (heartOn) corruptHeart(ground, ctx.tint, heart.x, heart.y, 9, e / 1000, 1);
      crow(av)?.setRot(pool / 400);
      bar.clear();
      const bx = ctx.cx - 26;
      const by = ctx.cy - 38;
      bar.fillStyle(0x111111, 0.85); bar.fillRect(bx - 1, by - 1, 54, 9);
      bar.fillStyle(0xffcc00, 1); bar.fillRect(bx, by, 52 * 0.45, 7);
      const r = Math.min(1 - 0.45, pool / 400);
      bar.fillStyle(0x8a2fc9, 0.95); bar.fillRect(bx + 52 * 0.45, by, 52 * r, 7);
    });
    const loops: Loop[] = [];
    let nowE = 0;
    ctx.onFrame((_dt, e) => { nowE = e; });
    loopLayer(ctx, loops, (l, x, y) => {
      if (!heartOn || l.hit || Phaser.Math.Distance.Between(x, y, heart.x, heart.y) > 20) return;
      l.hit = true;
      heartOn = false;
      ctx.capture(() => fx.heartBurst(heart.x, heart.y));
      ctx.capture(() => fx.corruptGain(ctx.cx, ctx.cy, 75));
      pool = 75;
      float(ctx, ctx.cx, ctx.cy - 50, '+75 CORRUPT HP', hex(HAR.purpleLit), 12);
      regenUntil = nowE + 5000;
    });
    ctx.at(400, () => {
      loops.push(throwLoop({ x: ctx.cx, y: ctx.cy }, { x: heart.x + 20, y: heart.y }, 1, 400));
      crow(av)?.play('punch', ctx.aim);
      readout.setText('mature mold grows hearts — cut one with your own sickle');
    });
    ctx.at(4400, () => {
      readout.setText('chewing through Corrupt HP rots the attacker: a quarter of a point per point');
      ctx.capture(() => fx.splatter(ctx.cx, ctx.cy, 6, 22, 380, 10));
      pool = Math.max(0, pool - 40);
    });
  },
};
