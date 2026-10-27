import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  GluttonyAvatar, WOOD, WoodFx, appleShape, birchStump, birchTree, carverangShape, carverangTrail, digestAura,
  sapGoo, sproutCorpse, sproutShape, taintMark,
} from '../../../elements/kits/GluttonyVisuals';

/**
 * Wood's showcases (element id `gluttony`).
 *
 * Every loop keeps the same small records the kit keeps — a carverang's loop circle, a sprout's
 * health, a row of birches — and paints them with the kit's own exported painters. One-shots go
 * through a real `WoodFx` with a sticky sink. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const LOOP_BASE_MS = 660;
const LOOP_MS_PER_PX = 1.5;
const CARVE_SIZE = 15;
const REAP_REACH = 170;
const REAP_HALF = (80 * Math.PI) / 180;
const DIGEST_R = 120;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): WoodFx {
  return ctx.capture(() => new WoodFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The ent's rig, or null when a skin has replaced the character. */
function ent(av: unknown): GluttonyAvatar | null {
  return av instanceof GluttonyAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A stand-in enemy that can be moved around, with the kit's victim tells painted on it. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, tells?: () => { slow?: boolean; taint?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const veil = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
  ctx.onFrame((_dt, e) => {
    g.clear();
    veil.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
    const t = tells?.();
    if (t?.slow) sapGoo(veil, ctx.tint, at.x, at.y, e / 1000, 1);
    if (t?.taint) taintMark(veil, ctx.tint, at.x, at.y, e / 1000, 0.8);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0e0b09', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

/** A sap meter over the caster: the number the whole kit turns on. */
function sapMeter(ctx: PreviewCtx, sap: () => number): void {
  const t = label(ctx, ctx.cx, ctx.cy - 62, hex(WOOD.amberLit), 11);
  ctx.onFrame(() => t.setText(`🪵 ${Math.round(sap())} SAP HP`));
}

interface Loop { cx: number; cy: number; R: number; phi0: number; side: number; start: number; dur: number; hits: Set<object>; trail: { x: number; y: number }[]; x: number; y: number }

/** Throw a carverang loop from `from` at `to`, simulated as the kit does. */
function throwLoop(from: { x: number; y: number }, to: { x: number; y: number }, side: number, now: number): Loop {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const D = Phaser.Math.Clamp(Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y), 150, 400);
  const R = D / 2;
  return {
    cx: from.x + Math.cos(ang) * R, cy: from.y + Math.sin(ang) * R, R, phi0: ang + Math.PI, side, start: now,
    dur: LOOP_BASE_MS + D * LOOP_MS_PER_PX, hits: new Set(), trail: [], x: from.x, y: from.y,
  };
}

/** Paint and step a list of carverang loops; `onPass` is asked with each loop's new position. */
function loopLayer(ctx: PreviewCtx, loops: Loop[], amber: () => number, onPass: (l: Loop, x: number, y: number) => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, e) => {
    g.clear();
    for (let i = loops.length - 1; i >= 0; i--) {
      const l = loops[i];
      const u = Phaser.Math.Clamp((e - l.start) / l.dur, 0, 1);
      const th = l.phi0 + l.side * u * Math.PI * 2;
      l.x = l.cx + Math.cos(th) * l.R;
      l.y = l.cy + Math.sin(th) * l.R;
      l.trail.push({ x: l.x, y: l.y });
      if (l.trail.length > 10) l.trail.shift();
      onPass(l, l.x, l.y);
      carverangTrail(g, ctx.tint, l.trail, 1, amber());
      carverangShape(g, ctx.tint, l.x, l.y, (e - l.start) * 0.022 * l.side, CARVE_SIZE, 1, amber());
      if (u >= 1) loops.splice(i, 1);
    }
  });
}

/** A short row of birches across the top of the box, as Haunting Hollows rings the arena. */
function treeRow(ctx: PreviewCtx, gone?: () => number[], apples?: () => number[]): { x: number; baseY: number; h: number }[] {
  const trees = [0.12, 0.3, 0.5, 0.7, 0.88].map((u, i) => ({ x: ctx.w * u, baseY: 42, h: 46, seed: i * 7.31 + 1 }));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2.1));
  ctx.onFrame((_dt, e) => {
    g.clear();
    const off = gone?.() ?? [];
    const ap = apples?.() ?? [];
    trees.forEach((tr, i) => {
      if (off.includes(i)) birchStump(g, ctx.tint, tr.x, tr.baseY, 0.2, e / 1000, 1);
      else birchTree(g, ctx.tint, tr.x, tr.baseY, tr.h, tr.seed, e / 1000, 1, { lookX: ctx.cx, lookY: ctx.cy }, ap.includes(i));
    });
  });
  return trees;
}

// ══ PASSIVES ═══════════════════════════════════════════════════════════

export const hauntingHollows: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Haunting Hollows — the arena is ringed with watching birches. Every one of them looks at whoever is nearest',
  run(ctx) {
    ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    treeRow(ctx);
    const readout = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(WOOD.birchLit), 11);
    ctx.at(200, () => readout.setText('the trees are where Commensalism steps out of — and where apples grow'));
    ctx.onFrame((_dt, e) => ctx.moveCaster(ctx.cx + Math.sin(e / 900) * 120, ctx.cy + 20, { facing: Math.cos(e / 900) > 0 ? 0 : Math.PI }));
  },
};

export const sapHp: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Sap HP — amber health on top of your own, up to 100 past your maximum. It grows back slowly, and whoever chews into it is gummed up',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    let sap = 0;
    let peak = 0;
    let slowUntil = 0;
    const victim = { x: ctx.tx, y: ctx.cy };
    let el = 0;
    dummyAt(ctx, victim, () => ({ slow: el < slowUntil }));
    sapMeter(ctx, () => sap);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(WOOD.amberLit), 11);
    ctx.onFrame((dt, e) => {
      el = e;
      if (sap > 0 && sap < peak) sap = Math.min(peak, sap + 2 * dt / 1000);
      ent(av)?.setSap(sap / 200);
    });
    ctx.at(300, () => {
      sap = peak = 75;
      ctx.capture(() => fx.sapGain(ctx.cx, ctx.cy, 75));
      readout.setText('+75 Sap HP — spent before your own health');
    });
    for (const at of [1800, 2500, 3200]) {
      ctx.at(at, () => {
        sap = Math.max(0, sap - 14);
        slowUntil = at + 1500;
        float(ctx, ctx.cx, ctx.cy - 36, '-14', hex(WOOD.amber), 12);
        ctx.capture(() => fx.sapSplash(ctx.cx, ctx.cy, victim.x, victim.y + 14));
        readout.setText('cutting into it gums them up: 30% slower for 1.5s');
      });
    }
    ctx.at(4300, () => readout.setText('it grows back toward the most you held, 2 a second — until it is cut right through'));
  },
};

// ══ CLICK — Carverang ══════════════════════════════════════════════════

function carverangRun(ctx: PreviewCtx, amberOn: boolean): void {
  const fx = fxOf(ctx);
  const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 12, hex(WOOD.amberLit), 11);
  const sap = amberOn ? 150 : 0;
  const amber = amberOn ? 1 : 0;
  ent(av)?.setSap(sap / 200);
  const a = { x: ctx.tx - 30, y: ctx.cy - 26 };
  const b = { x: ctx.tx + 30, y: ctx.cy + 26 };
  let el = 0;
  dummyAt(ctx, a, () => ({ slow: amberOn && el > 3000 }));
  dummyAt(ctx, b);
  const loops: Loop[] = [];
  const caster = { x: ctx.cx, y: ctx.cy };
  loopLayer(ctx, loops, () => amber, (l, x, y) => {
    for (const d of [a, b]) {
      if (Phaser.Math.Distance.Between(x, y, d.x, d.y) < 34 && !l.hits.has(d)) {
        l.hits.add(d);
        let dmg = 12 * (1 + 0.8 * amber);
        if (amberOn && d === a && el > 3000) dmg *= 1.6;
        float(ctx, d.x, d.y - 26, `${Math.round(dmg)}`, hex(amberOn ? WOOD.amberLit : WOOD.birchLit), 12);
        ctx.capture(() => fx.carveHit(d.x, d.y, 0, amber));
      }
    }
  });
  ctx.onFrame((_dt, e) => { el = e; ent(av)?.setCarveOut(loops.length > 0); });
  const toss = (ms: number, text: string): void => ctx.at(ms, () => {
    loops.push(throwLoop(caster, { x: ctx.tx + 40, y: ctx.cy }, 1, ms));
    ent(av)?.play('punch', ctx.aim);
    ctx.capture(() => fx.carveThrow(caster.x + 18, caster.y, ctx.aim));
    readout.setText(text);
  });
  if (amberOn) {
    toss(300, 'Amber Edge: 150 Sap HP — the amber covers it, 22 a cut');
    toss(3200, 'into a slowed enemy, 60% more again');
  } else {
    toss(300, 'out, round, and back to the hand — 12 to everything it passes');
    // The re-carve: throw again as the first is coming home.
    ctx.at(300 + 1200, () => {
      const l = loops[0];
      if (!l) return;
      const re = throwLoop({ x: l.x, y: l.y }, { x: ctx.tx + 40, y: ctx.cy - 10 }, 1, 1500);
      Object.assign(l, { cx: re.cx, cy: re.cy, R: re.R, phi0: re.phi0, start: re.start, dur: re.dur });
      l.hits.clear();
      ctx.capture(() => fx.recarve(l.x, l.y, 1));
      float(ctx, l.x, l.y - 24, 'RE-CARVE!', hex(WOOD.amberLit), 12);
      loops.push(throwLoop(caster, { x: ctx.tx + 40, y: ctx.cy + 10 }, 1, 1500));
      ent(av)?.play('punch', ctx.aim);
      readout.setText('throw again as it comes home: the returning one goes back out');
    });
  }
}

export const carverang: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Click — a big wooden boomerang flies a loop out to the cursor and back, 12 to everything it passes. Throw again as one comes home to send it back out',
  run(ctx) { carverangRun(ctx, false); },
};

export const carverangUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Click+ Amber Edge — the more Sap HP you carry, the more amber on the boomerang: up to 80% more damage, and 60% more again into a slowed enemy',
  run(ctx) { carverangRun(ctx, true); },
};

// ══ E — Oakbrew ════════════════════════════════════════════════════════

export const oakbrew: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'E — a teacup of oakbrew: 15% less damage for 8 seconds, and 25 of your health turns into Sap HP',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    let sap = 0;
    sapMeter(ctx, () => sap);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(WOOD.amberLit), 11);
    ctx.at(400, () => {
      ent(av)?.drink();
      ent(av)?.play('raise', -Math.PI / 2, 520);
      ctx.capture(() => fx.brewSip(ctx.cx, ctx.cy, 0));
      sap = 25;
      ent(av)?.setSap(sap / 200);
      readout.setText('−25 health, +25 Sap HP, −15% damage taken for 8s');
    });
  },
};

export const oakbrewUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'E+ Brewmaster — hold E to cook it up to 3 seconds: twice as long and 35 more Sap HP. Get hit while it boils and it is lost. Teammates nearby get a cup',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    let sap = 0;
    sapMeter(ctx, () => sap);
    const ally = { x: ctx.cx + 90, y: ctx.cy + 30 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame(() => {
      g.clear();
      g.fillStyle(0x3d6b4a, 1); g.fillCircle(ally.x, ally.y, 15);
      g.fillStyle(0x8fd1a0, 1); g.fillCircle(ally.x - 4, ally.y - 4, 2.6); g.fillCircle(ally.x + 4, ally.y - 4, 2.6);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, hex(WOOD.amberLit), 11);
    let cookStart = -1;
    ctx.onFrame((_dt, e) => {
      if (cookStart >= 0) ent(av)?.setCooking(Math.min(1, (e - cookStart) / 3000));
    });
    ctx.at(300, () => { cookStart = 300; readout.setText('holding E — on the boil'); });
    ctx.at(3400, () => {
      cookStart = -1;
      ent(av)?.setCooking(null);
      ent(av)?.drink();
      ent(av)?.play('raise', -Math.PI / 2, 520);
      ctx.capture(() => fx.brewSip(ctx.cx, ctx.cy, 1));
      ctx.capture(() => fx.brewShare(ctx.cx, ctx.cy - 10, ally.x, ally.y));
      sap = 60;
      ent(av)?.setSap(sap / 200);
      readout.setText('fully cooked: 16 seconds, +60 Sap HP — and a cup for the teammate');
    });
    ctx.at(5200, () => { cookStart = 5200; readout.setText('a hit while it boils…'); });
    ctx.at(6000, () => {
      cookStart = -1;
      ent(av)?.setCooking(null);
      float(ctx, ctx.cx, ctx.cy - 36, '-8', '#ffffff', 12);
      ctx.capture(() => fx.brewSpill(ctx.cx, ctx.cy));
      readout.setText('…and the brew is lost');
    });
  },
};

// ══ R — Commensalism ═══════════════════════════════════════════════════

function commensalRun(ctx: PreviewCtx, mutual: boolean): void {
  const fx = fxOf(ctx);
  const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  let gone: number[] = [];
  const trees = treeRow(ctx, () => gone);
  let sap = 0;
  sapMeter(ctx, () => sap);
  const readout = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(WOOD.amberLit), 11);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
  let sprout: { x: number; y: number; hp: number } | null = null;
  ctx.onFrame((_dt, e) => {
    g.clear();
    if (sprout) sproutShape(g, ctx.tint, sprout.x, sprout.y, 0.9 + Math.sqrt(sprout.hp) / 9, e / 1000, 1);
  });
  const home = { x: ctx.cx, y: ctx.cy + 20 };
  ctx.moveCaster(home.x, home.y);
  ctx.at(500, () => {
    const tr = trees[3];
    ctx.capture(() => fx.rootSink(home.x, home.y));
    ent(av)?.play('dash', -Math.PI / 4);
    if (mutual) {
      sprout = { x: home.x, y: home.y + 8, hp: 10 };
      ctx.capture(() => fx.sproutPop(home.x, home.y + 8));
    }
    gone = [3];
    ctx.moveCaster(tr.x, tr.baseY + 26);
    ctx.capture(() => fx.treeBurst(tr.x, tr.baseY, tr.h));
    sap = 50;
    ent(av)?.setSap(sap / 200);
    readout.setText(mutual ? 'a sprout is left where you went down (10 health, no maximum)' : 'out of the tree nearest the cursor — the tree is gone, +50 Sap HP');
  });
  if (mutual) {
    ctx.at(2400, () => {
      ctx.moveCaster(home.x + 20, home.y);
      ctx.capture(() => fx.digestCast(home.x + 20, home.y, DIGEST_R));
      readout.setText('heal it — Digest, a shared brew — and you get half of it too');
    });
    for (const at of [2700, 3100, 3500, 3900]) {
      ctx.at(at, () => {
        if (!sprout) return;
        sprout.hp += 8;
        sap += 4;
        ctx.capture(() => fx.sproutFed(sprout!.x, sprout!.y - 10));
        float(ctx, sprout.x, sprout.y - 26, `+8 (you +4)`, hex(WOOD.sproutLit), 10);
      });
    }
  }
}

export const commensalism: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'R — sink into the ground and step out of the tree nearest your cursor, taking its place. +50 Sap HP',
  run(ctx) { commensalRun(ctx, false); },
};

export const commensalismUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'R+ Mutualism — a sprout is left behind. Every heal or Sap HP you give it gives you half as much again',
  run(ctx) { commensalRun(ctx, true); },
};

// ══ F — Digest ═════════════════════════════════════════════════════════

function digestRun(ctx: PreviewCtx, apples: boolean): void {
  const fx = fxOf(ctx);
  const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  let sap = 0;
  let hp = 100;
  let held = 0;
  let onTree: number[] = apples ? [1, 3] : [];
  if (apples) treeRow(ctx, undefined, () => onTree);
  const readout = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(WOOD.leafLit), 11);
  const meter = label(ctx, ctx.cx, ctx.cy - 62, hex(WOOD.amberLit), 11);
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let auraFrom = -1;
  ctx.onFrame((dt, e) => {
    ground.clear();
    air.clear();
    meter.setText(`❤ ${Math.round(hp)}   🪵 ${Math.round(sap)}`);
    const c = ctx.casterAt();
    if (auraFrom >= 0 && e - auraFrom < 5000) {
      digestAura(ground, ctx.tint, c.x, c.y, DIGEST_R, e / 1000, Math.min(1, (5000 - (e - auraFrom)) / 400));
      hp += (apples ? 18.75 : 12.5) * dt / 1000;
    }
    for (let i = 0; i < held; i++) appleShape(air, ctx.tint, c.x + Math.cos(e / 600 + i * 3) * 16, c.y - 46, 4, 1);
  });
  for (const at of [300, 800, 1300, 1800]) {
    ctx.at(at, () => {
      hp -= 25;
      float(ctx, ctx.cx, ctx.cy - 36, '-25', '#ffffff', 12);
      readout.setText('100 damage in the last 5 seconds…');
    });
  }
  if (apples) {
    ctx.at(2100, () => {
      onTree = [3];
      held = 1;
      ctx.capture(() => fx.applePick(ctx.w * 0.3 + 9, 14, ctx.cx, ctx.cy - 40));
      readout.setText('Friend of the Forest: an apple picked off a tree');
    });
  }
  ctx.at(apples ? 3000 : 2400, () => {
    auraFrom = apples ? 3000 : 2400;
    if (apples) { held = 0; ctx.capture(() => fx.appleEat(ctx.cx, ctx.cy)); }
    sap += apples ? 22.5 : 15;
    ent(av)?.setSap(sap / 200);
    ent(av)?.play('flex');
    ctx.capture(() => fx.digestCast(ctx.cx, ctx.cy, DIGEST_R));
    ctx.capture(() => fx.sapGain(ctx.cx, ctx.cy, 15));
    readout.setText(apples ? 'the apple goes in: 1.5× — +22 Sap HP now, +37 health over 5s' : '+15 Sap HP at once, +25 health over the next 5 seconds');
  });
}

export const digest: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'F — digest what you just took: 15% of the last 5 seconds\' damage back as Sap HP at once, 25% more as health over 5 seconds. Teammates in the aura heal too',
  run(ctx) { digestRun(ctx, false); },
};

export const digestUpgraded: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'F+ Friend of the Forest — apples grow on the trees. Carry 3: your next brew lasts 2×, or your next Digest heals 1.5×. Below 30% health they are eaten for 25',
  run(ctx) { digestRun(ctx, true); },
};

// ══ Q — Final Harvest ══════════════════════════════════════════════════

function harvestRun(ctx: PreviewCtx, prune: boolean): void {
  const fx = fxOf(ctx);
  const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 12, hex(WOOD.amberLit), 11);
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
  let sprout: { x: number; y: number; hp: number } | null = prune ? { x: ctx.cx + 70, y: ctx.cy + 30, hp: 60 } : null;
  let corpse: { x: number; y: number } | null = null;
  let tainted = false;
  let alive = true;
  const victim = { x: ctx.cx + 120, y: ctx.cy - 6 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const veil = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
  ctx.onFrame((_dt, e) => {
    ground.clear(); g.clear(); veil.clear();
    if (sprout) sproutShape(ground, ctx.tint, sprout.x, sprout.y, 0.9 + Math.sqrt(sprout.hp) / 9, e / 1000, 1);
    if (corpse) sproutCorpse(ground, ctx.tint, corpse.x, corpse.y, 1.7, ctx.aim, 1);
    if (!alive) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(victim.x, victim.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(victim.x, victim.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(victim.x - 5, victim.y - 4, 3.2); g.fillCircle(victim.x + 5, victim.y - 4, 3.2);
    if (tainted) taintMark(veil, ctx.tint, victim.x, victim.y, e / 1000, 0.8);
  });
  const swing = (at: number, after: () => void): void => {
    ctx.at(at, () => {
      ent(av)?.play('raise', ctx.aim, 360);
      ctx.capture(() => fx.reapWindup(ctx.cx, ctx.cy, ctx.aim, 360));
    });
    ctx.at(at + 360, () => {
      ent(av)?.reap(ctx.aim, 1);
      ctx.capture(() => fx.reapSwing(ctx.cx, ctx.cy, ctx.aim, REAP_REACH, REAP_HALF, 1));
      after();
    });
  };
  if (prune) {
    swing(400, () => {
      if (sprout) { ctx.capture(() => fx.prune(sprout!.x, sprout!.y, ctx.aim)); corpse = { x: sprout.x, y: sprout.y }; sprout = null; }
      float(ctx, ctx.cx + 70, ctx.cy, 'PRUNED · +30 SAP', hex(WOOD.grayLit), 11);
      float(ctx, ctx.cx, ctx.cy - 60, 'SAP OVERFLOW +150', hex(WOOD.amberLit), 11);
      readout.setText('Prune: half its health as Sap HP, and your overflow climbs 50 (to 200)');
    });
    ctx.at(3200, () => readout.setText('it does not get up. It never leaves.'));
  } else {
    swing(400, () => {
      ctx.capture(() => fx.reapHit(victim.x, victim.y, ctx.aim));
      ctx.capture(() => fx.taint(victim.x, victim.y));
      tainted = true;
      float(ctx, victim.x, victim.y - 30, '35 · TAINTED', hex(WOOD.amberLit), 12);
      readout.setText('not enough health on them to kill: Tainted — every 25 you deal them is 5 Sap HP');
    });
    swing(3400, () => {
      ctx.capture(() => fx.execute(victim.x, victim.y, ctx.aim));
      alive = false;
      float(ctx, victim.x, victim.y - 40, '🪓 FINAL HARVEST', hex(WOOD.sapGlow), 14);
      readout.setText('with 60% more health than them (Sap HP counts), they die on the spot');
    });
  }
}

export const finalHarvest: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'Q — the great scythe swings for 35. Anyone you then out-health by 60% dies outright; the rest are Tainted for the match',
  run(ctx) { harvestRun(ctx, false); },
};

export const finalHarvestUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Q+ Prune — the scythe cuts your own sprouts too: half their health as Sap HP, and 50 more overflow, up to 200 past your maximum',
  run(ctx) { harvestRun(ctx, true); },
};
