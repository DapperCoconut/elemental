import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import type { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  FOR, FortuneAvatar, FortuneFx, Jewel, StatKind, advanceCard, goldenHeart, grassBlade, jewelGem, jitter,
} from '../../../elements/kits/FortuneVisuals';
import { bloodBlot, paintTycoon, poolBall } from '../../../elements/kits/FortuneTycoonVisuals';
import { GloryId, PART_PRICE, PARTS, PartId, TYCOON_W, Tycoon, TycoonPad } from '../../../elements/kits/FortuneTycoon';
import { BALL_R, Ball, cueTarget, rackSpots, stepBalls } from '../../../elements/kits/FortuneBilliards';

/**
 * Gold's showcases.
 *
 * Every loop keeps the same small records the kit keeps (blades with a velocity and a birth time,
 * a heart's stress, a real Tycoon, real pool-ball physics) and paints them with the kit's own exported
 * painters. One-shots go through a real `FortuneFx` with a sticky sink. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const FRAY_SPEED = 485;
const FRAY_GRAVITY = 900;
const FRAY_GILD_MS = 180;
const HEART_TRAVEL = 420;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): FortuneFx {
  return ctx.capture(() => new FortuneFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The alchemist's rig, or null when a skin has replaced the character. */
function alch(av: unknown): FortuneAvatar | null {
  return av instanceof FortuneAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A stand-in enemy that can be moved around, unlike `ctx.addDummy`'s fixed mark. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, depth = 4): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#1a1206', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

/** A purse readout pinned top-left, the way the status tray counts it. */
function purse(ctx: PreviewCtx, read: () => number): void {
  const t = label(ctx, 56, 14, hex(FOR.goldLit), 12);
  ctx.onFrame(() => t.setText(`🪙 ${Math.floor(read())}`));
}

interface Blade { x: number; y: number; vx: number; vy: number; born: number; alive: boolean }

/** Throw a Fray clump from (x, y) aimed at `ang`, simulated exactly as the kit does. */
function throwClump(
  ctx: PreviewCtx, blades: Blade[], x: number, y: number, ang: number, now: number, n = 7,
): void {
  for (let i = 0; i < n; i++) {
    const a = ang + (i / (n - 1) - 0.5) * 0.48 + (Math.random() - 0.5) * 0.08;
    const v = FRAY_SPEED * (0.9 + Math.random() * 0.2);
    blades.push({ x: x + Math.cos(ang) * 20, y: y + Math.sin(ang) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, alive: true });
  }
}

/** Paint and step a blade list; `hit` is asked for every live blade and returns true when it lands. */
function bladeLayer(
  ctx: PreviewCtx, blades: Blade[], hit: (b: Blade) => boolean, onHit: (b: Blade) => void,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    const s = dt / 1000;
    for (const b of blades) {
      if (!b.alive) continue;
      b.vy += FRAY_GRAVITY * s;
      b.x += b.vx * s;
      b.y += b.vy * s;
      if (elapsed - b.born > 1800 || b.y > ctx.h + 30) { b.alive = false; continue; }
      if (hit(b)) { b.alive = false; onHit(b); continue; }
      const gild = Phaser.Math.Clamp((elapsed - b.born) / FRAY_GILD_MS, 0, 1);
      grassBlade(g, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), 15, gild, 1);
    }
  });
}

// ══ CLICK — Fray ═══════════════════════════════════════════════════════

export const fray: PreviewScript = {
  duration: 6500,
  scale: 0.9,
  caption: 'Click — 7 grass blades, gilded in flight by the other hand, then falling under gravity. 2 a blade',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const target = { x: ctx.cx + 250, y: ctx.cy + 10 };
    dummyAt(ctx, target);
    const blades: Blade[] = [];
    let elapsedNow = 0;
    ctx.onFrame((_dt, e) => { elapsedNow = e; });
    bladeLayer(ctx, blades,
      (b) => Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) < 24,
      (b) => {
        float(ctx, target.x + (Math.random() - 0.5) * 20, target.y - 24, '2', hex(FOR.goldLit), 12);
        ctx.capture(() => fx.bladeHit(b.x, b.y, Math.atan2(b.vy, b.vx)));
      });

    const throwAt = (ms: number, lift: number): void => {
      ctx.at(ms, () => {
        const d = target.x - ctx.cx;
        const tFlight = d / FRAY_SPEED;
        const drop = 0.5 * FRAY_GRAVITY * tFlight * tFlight * lift;
        const ang = Math.atan2(target.y - drop - ctx.cy, d);
        av.setFacing(ang);
        av.play('punch', ang);
        alch(av)?.setGlowHand(1);
        ctx.capture(() => fx.transmute(ctx.cx + Math.cos(ang - 1.25) * 22, ctx.cy + Math.sin(ang - 1.25) * 22));
        throwClump(ctx, blades, ctx.cx, ctx.cy, ang, elapsedNow);
      });
    };
    ctx.at(200, () => readout.setText('aimed straight at them, the clump falls short — the blades have weight'));
    throwAt(500, 0);
    ctx.at(2200, () => readout.setText('aim above them: the gilded blades arc down into the body'));
    throwAt(2500, 1);
    throwAt(3400, 1);
    throwAt(4300, 1);
    ctx.at(5300, () => readout.setText('7 blades, 2 each — small alone, a lot when the whole clump lands'));
  },
};

// ══ E — Advance ═════════════════════════════════════════════════════════

const STAT_TEXT: Record<StatKind, [string, string]> = {
  might: ['MIGHT', '+10% damage'],
  hide: ['GILDED HIDE', '-7% damage taken'],
  stride: ['STRIDE', '+7% speed'],
  haste: ['HASTE', '-8% cooldowns'],
  vigor: ['VIGOR', '+30 max HP'],
  greed: ['GREED', '+25% gold'],
  sheaf: ['SHEAF', '+2 blades'],
  mend: ['MEND', '+1.5 HP/s'],
};

export const advance: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'E — spend 10 gold, three upgrade cards appear over your head; click one to keep it for the match',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(-Math.PI / 2);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 20;
    purse(ctx, () => gold);

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const texts = Array.from({ length: 6 }, (_, i) => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: i % 2 === 0 ? '8px' : '7px', fontFamily: 'Arial Black', color: i % 2 === 0 ? '#fff3c4' : '#e6c46a',
    }).setOrigin(0.5).setDepth(17)));
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(18));

    let offer: StatKind[] | null = null;
    let opened = 0;
    let hover = -1;
    let now = 0;
    const W = 58, H = 70, GAP = 8;
    const centres = (): { x: number; y: number }[] => {
      const at = ctx.casterAt();
      const y = Math.max(H / 2 + 22, at.y - 96);
      return [-1, 0, 1].map((k) => ({ x: at.x + k * (W + GAP), y }));
    };
    ctx.onFrame((_dt, e) => {
      now = e;
      g.clear(); cursor.clear();
      for (const t of texts) t.setVisible(false);
      if (!offer) return;
      const cs = centres();
      const a = Phaser.Math.Clamp((e - opened) / 220, 0, 1);
      for (let i = 0; i < 3; i++) {
        const rise = (1 - a) * 14;
        advanceCard(g, ctx.tint, cs[i].x, cs[i].y + rise, W, H, offer[i], hover === i, a);
        texts[i * 2].setVisible(true).setText(STAT_TEXT[offer[i]][0]).setPosition(cs[i].x, cs[i].y + rise + 16).setAlpha(a);
        texts[i * 2 + 1].setVisible(true).setText(STAT_TEXT[offer[i]][1]).setPosition(cs[i].x, cs[i].y + rise + 27).setAlpha(a);
      }
      if (hover >= 0) {
        const c = cs[hover];
        cursor.fillStyle(0xffffff, 0.95);
        cursor.fillTriangle(c.x + 6, c.y + 6, c.x + 6, c.y + 20, c.x + 16, c.y + 15);
      }
    });

    const round = (at: number, kinds: StatKind[], pickI: number): void => {
      ctx.at(at, () => {
        gold -= 10;
        offer = kinds;
        opened = now;
        hover = -1;
        av.play('flex');
        alch(av)?.setGlowHand(0.8);
        const at2 = ctx.casterAt();
        ctx.capture(() => fx.advanceOpen(at2.x, at2.y - 96));
        float(ctx, at2.x, at2.y - 40, '-10 🪙', hex(FOR.gold), 11);
      });
      ctx.at(at + 700, () => { hover = 0; });
      ctx.at(at + 1200, () => { hover = 1; });
      ctx.at(at + 1700, () => { hover = pickI; });
      ctx.at(at + 2200, () => {
        if (!offer) return;
        const c = centres()[pickI];
        const kind = offer[pickI];
        offer = null;
        hover = -1;
        av.play('flex');
        ctx.capture(() => fx.advancePick(c.x, c.y));
        const at2 = ctx.casterAt();
        float(ctx, at2.x, at2.y - 52, `${STAT_TEXT[kind][0]}  ${STAT_TEXT[kind][1]}`, hex(FOR.goldLit), 12);
      });
    };
    ctx.at(150, () => readout.setText('10 gold buys an offer of three, drawn from eight stats'));
    round(500, ['might', 'sheaf', 'hide'], 1);
    ctx.at(3600, () => readout.setText('click the one you want — picks stack, and last the whole match'));
    round(4000, ['haste', 'vigor', 'greed'], 2);
  },
};

// ── Tycoon and table staging ──────────────────────────────────────────

/**
 * Run a real `Tycoon` in the box, painted with the kit's own painter and scaled to fit across the
 * top. `paid` gets every piece the refiner takes; `shardPad` shows the Click+ pad.
 */
function tycoonStrip(
  ctx: PreviewCtx, ty: Tycoon,
  o: { paid?: (v: number) => void; shardPad?: boolean; canPay?: (p: TycoonPad) => boolean; y?: number } = {},
): { x: number; y: number; s: number } {
  const s = Math.min(0.85, (ctx.w - 24) / TYCOON_W);
  const x = (ctx.w - TYCOON_W * s) / 2;
  const y = o.y ?? 26;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3).setPosition(x, y).setScale(s));
  const prices: Phaser.GameObjects.Text[] = [];
  ctx.onFrame((dt, e) => {
    ty.update(dt, { paid: (v) => o.paid?.(v) });
    g.clear();
    const pads = ty.pads(!!o.shardPad);
    paintTycoon(g, ctx.tint, ty, 0, 0, e / 1000, 1, pads, (p) => o.canPay?.(p) ?? true, null);
    pads.forEach((p, i) => {
      const t = prices[i] ?? (prices[i] = ctx.adopt(ctx.scene.add.text(0, 0, '', {
        fontSize: '8px', fontFamily: 'Arial Black', color: '#f4fff0', stroke: '#17110a', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4)));
      t.setText(p.currency === 'shards' ? `${p.price}◆` : `${p.price}`)
        .setPosition(x + p.x * s, y + (p.y - 1) * s).setVisible(true);
    });
    for (let i = pads.length; i < prices.length; i++) prices[i].setVisible(false);
  });
  return { x, y, s };
}

/** Buy every part on `ty` straight away. */
function completeTycoon(ty: Tycoon): void {
  for (const id of PARTS) ty.buy(id);
}

interface Table {
  balls: Ball<'me'>[];
  /** Strike the first ball in line from `(x, y)` along `ang`; returns it, or null. */
  strike(x: number, y: number, ang: number, power: number): Ball<'me'> | null;
}

/**
 * A pool table the kit's way: real `stepBalls` physics against the box walls and one dummy body,
 * painted with `poolBall`. `onHit` fires for a ball that reaches the body fast enough to hurt.
 */
function poolTable(
  ctx: PreviewCtx, fx: FortuneFx, body: { x: number; y: number }, onHit: (b: Ball<'me'>, speed: number) => void,
): Table {
  const balls: Ball<'me'>[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4.5));
  const hitAt = new Map<Ball<'me'>, number>();
  let now = 0;
  ctx.onFrame((dt, e) => {
    now = e;
    stepBalls(balls, dt / 1000, { left: 8, right: ctx.w - 8, top: 30, bottom: ctx.h - 8 },
      () => [{ x: body.x, y: body.y, r: 17, ref: 0 }], {
        onClack: (x, y, v) => { if (v > 70) ctx.capture(() => fx.ballClack(x, y, Math.min(1, v / 800))); },
        onBody: (b, _r, v) => {
          if (v < 130 || now - (hitAt.get(b) ?? -1e9) < 350) return;
          hitAt.set(b, now);
          ctx.capture(() => fx.ballHit(b.x, b.y, Math.min(1, (v - 130) / 770)));
          onHit(b, v);
        },
      });
    g.clear();
    for (const b of balls) poolBall(g, ctx.tint, b.x, b.y, BALL_R, b.n, b.roll, 1);
  });
  return {
    balls,
    strike(x, y, ang, power) {
      const b = cueTarget(balls, 'me', x, y, Math.cos(ang), Math.sin(ang), 112, 5);
      ctx.capture(() => fx.cueThrust(x, y, ang, b ? Math.hypot(b.x - x, b.y - y) - BALL_R : 112));
      if (!b) return null;
      const v = 300 + 750 * power;
      b.vx = Math.cos(ang) * v;
      b.vy = Math.sin(ang) * v;
      ctx.capture(() => fx.cueHit(b.x - Math.cos(ang) * BALL_R, b.y - Math.sin(ang) * BALL_R, ang, power));
      return b;
    },
  };
}

/** Lob a rack of `n` balls from the caster to `(x, y)` and set them down on `table`. */
function rack(ctx: PreviewCtx, table: Table, at: { x: number; y: number }, ang: number, n = 5): void {
  const from = ctx.casterAt();
  const spots = rackSpots(at.x, at.y, ang, n);
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const start = { t: -1 };
  ctx.onFrame((_dt, e) => {
    if (start.t < 0) start.t = e;
    const u = Math.min(1, (e - start.t) / 380);
    air.clear();
    if (u >= 1) {
      if (spots.length) {
        spots.forEach((p, i) => table.balls.push({ owner: 'me', x: p.x, y: p.y, vx: 0, vy: 0, n: i + 1, roll: i, born: e, until: e + 14000 }));
        spots.length = 0;
      }
      return;
    }
    spots.forEach((p, i) => poolBall(air, ctx.tint, from.x + (p.x - from.x) * u, from.y + (p.y - from.y) * u, BALL_R, i + 1, u * 9 + i, 1, Math.sin(u * Math.PI)));
  });
}

/** Line the caster up behind `b` for a shot at `at`, then draw the cue back and shoot. */
function lineUp(ctx: PreviewCtx, av: BaseAvatar, table: Table, b: () => Ball<'me'> | undefined, at: { x: number; y: number }, ms: number): void {
  const ball = b();
  if (!ball) return;
  const ang = Math.atan2(at.y - ball.y, at.x - ball.x);
  const stand = { x: ball.x - Math.cos(ang) * 44, y: ball.y - Math.sin(ang) * 44 };
  ctx.glideCaster({ to: stand, ms: 400, ease: 'out' });
  ctx.at(ms + 420, () => alch(av)?.setCue(ang, 0));
  for (let i = 1; i <= 6; i++) ctx.at(ms + 420 + i * 90, () => alch(av)?.setCue(ang, i / 6));
  ctx.at(ms + 1100, () => {
    alch(av)?.setCue(null, 0);
    alch(av)?.jab(ang);
    const p = ctx.casterAt();
    table.strike(p.x, p.y, ang, 1);
  });
}

// ══ R — Billiards ═════════════════════════════════════════════════════

export const billiards: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'R — throw 5 golden pool balls and pull out the cane: aim, hold to draw it back, release. Balls hit for 5–22 by speed, the cane pokes for 8–18',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const target = { x: ctx.cx + 260, y: ctx.cy };
    dummyAt(ctx, target);
    const table = poolTable(ctx, fx, target, (b, v) => {
      void b;
      float(ctx, target.x, target.y - 26, `${Math.round(5 + 17 * Math.min(1, (v - 130) / 770))}`, '#ffb3aa', 13);
    });
    const spot = { x: ctx.cx + 110, y: ctx.cy };
    ctx.at(200, () => readout.setText('a handful of golden pool balls, thrown ahead'));
    ctx.at(400, () => { av.play('sweep', ctx.aim); rack(ctx, table, spot, 0); });
    ctx.at(1300, () => readout.setText('the cane comes out as a cue: aim it, and hold to draw it back for power'));
    lineUp(ctx, av, table, () => table.balls.slice().sort((a, b) => a.x - b.x)[0], target, 1500);
    ctx.at(3000, () => readout.setText('release — the balls break off each other and the walls'));
    ctx.at(5600, () => readout.setText('anything fast enough hurts: the harder it arrives, the more'));
  },
};

// ══ F — Heart of Gold ═════════════════════════════════════════════════

export const heartOfGold: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'F — lunge with the cane (16). A gold heart fills with every step they take; full is a heart attack: 28 and a 1.4s stun',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const target = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, target);
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(16));

    let hearted = false;
    let stress = 0;
    let walking = false;
    let stunnedUntil = 0;
    let walkT = 0;
    let dmgAcc = 0;
    const home = { x: target.x, y: target.y };
    ctx.onFrame((dt, e) => {
      hud.clear();
      if (!hearted) return;
      const s = dt / 1000;
      if (walking && e > stunnedUntil) {
        walkT += s;
        const px = target.x;
        const py = target.y;
        target.x = home.x + Math.sin(walkT * 2.2) * 70;
        target.y = home.y + Math.sin(walkT * 4.4) * 22;
        stress += Math.hypot(target.x - px, target.y - py) / HEART_TRAVEL;
      } else {
        stress = Math.max(0, stress - 0.12 * s);
      }
      if (stress >= 1) {
        stress = 0;
        stunnedUntil = e + 1400;
        ctx.capture(() => fx.heartAttack(target.x, target.y));
        float(ctx, target.x, target.y - 56, '💔 HEART ATTACK', hex(FOR.bloodLit), 14);
        float(ctx, target.x, target.y - 26, '28', '#ffb3aa', 15);
        dmgAcc += 28;
      }
      while (dmgAcc >= 20) {
        dmgAcc -= 20;
        gold += 1;
        const at = ctx.casterAt();
        float(ctx, at.x + 18, at.y - 34, '+1 🪙', hex(FOR.goldLit), 11);
      }
      goldenHeart(hud, ctx.tint, target.x, target.y - 46, stress, e / 1000, 1);
    });

    ctx.at(200, () => readout.setText('the cane lunges 150px — anyone it passes is stabbed for 16'));
    ctx.at(600, () => {
      av.play('dash', ctx.aim);
      const to = { x: target.x - 70, y: target.y };
      ctx.capture(() => fx.caneLunge(ctx.cx, ctx.cy, to.x, to.y));
      ctx.glideCaster({ to, ms: 180, ease: 'out' });
    });
    ctx.at(760, () => {
      float(ctx, target.x, target.y - 26, '16', '#ffb3aa', 13);
      ctx.capture(() => fx.heartApply(target.x, target.y - 34));
      float(ctx, target.x, target.y - 54, '💛 HEART OF GOLD', hex(FOR.goldLit), 12);
      hearted = true;
      dmgAcc += 16;
    });
    ctx.at(1600, () => { readout.setText('every step they take stresses the gold heart'); walking = true; });
    ctx.at(5600, () => readout.setText('a full heart is a heart attack — and every 20 damage they take pays you 1 gold'));
    ctx.at(8200, () => { walking = false; readout.setText('standing still lets it settle, a little'); });
  },
};

// ══ Q — Rebirth ═══════════════════════════════════════════════════════

export const rebirth: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Q — only with a complete tycoon: flash, come back more golden, and start the factory over. +25% gold, +15% damage, -15% taken, 150 gold health. Three times',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const stats = label(ctx, ctx.cx, ctx.cy + 40, hex(FOR.goldLit), 10);
    const ty = new Tycoon();
    completeTycoon(ty);
    let gold = 0;
    tycoonStrip(ctx, ty, { paid: (v) => { gold += v; } });
    purse(ctx, () => gold);
    let flashAt = -1;
    let n = 0;
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    let ghp = 0;
    ctx.onFrame((_dt, e) => {
      alch(av)?.setRebirthFlash(flashAt < 0 ? 0 : Math.max(0, 1 - (e - flashAt) / 900));
      bar.clear();
      const bx = ctx.cx - 26;
      const by = ctx.cy - 38;
      const span = Math.max(400, 400 + ghp);
      bar.fillStyle(0x111111, 0.85); bar.fillRect(bx - 1, by - 1, 54, 9);
      bar.fillStyle(0x22dd55, 1); bar.fillRect(bx, by, 52 * 400 / span, 7);
      if (ghp > 0) {
        bar.fillStyle(0xf0c33c, 1); bar.fillRect(bx + 52 * 400 / span, by, 52 * ghp / span, 7);
        bar.fillStyle(0xfffbe6, 0.9); bar.fillRect(bx + 52 * 400 / span, by, 52 * ghp / span, 2);
      }
    });
    const reborn = (ms: number): void => ctx.at(ms, () => {
      n++;
      flashAt = ms;
      ctx.capture(() => fx.rebirth(ctx.cx, ctx.cy, n));
      alch(av)?.play('raise');
      alch(av)?.setGilding(n * 3);
      ty.rebirth();
      ghp += 150;
      stats.setText(`+${n * 25}% gold · +${n * 15}% damage · -${Math.round((1 - Math.pow(0.85, n)) * 100)}% taken`);
    });
    ctx.at(200, () => readout.setText('every pad bought: the tycoon is complete, and Q lights up'));
    reborn(1600);
    ctx.at(2100, () => readout.setText('he comes back more golden — and the factory goes back to one dropper'));
    ctx.at(3600, () => readout.setText('150 gold health on top of his own: spent first, and it pays 1 gold per 10 lost'));
    ctx.at(5000, () => { completeTycoon(ty); readout.setText('build it all again for the next one — three rebirths at most'); });
    reborn(6200);
  },
};

// ══ Passive — The Tycoon ══════════════════════════════════════════════

export const theTycoon: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'The Tycoon — droppers, a belt and a refiner along the top of the screen, paying gold all match. Click a pad to build the next machine',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const ty = new Tycoon();
    let gold = 0;
    const strip = tycoonStrip(ctx, ty, {
      paid: (v) => { gold += v; },
      canPay: (p) => gold >= p.price,
    });
    purse(ctx, () => gold);
    ctx.onFrame(() => alch(av)?.setGold(Math.min(1, gold / 30)));
    // Sped up for the showcase: the purse is topped up so the pads go in on cue.
    const buy = (ms: number, id: PartId): void => ctx.at(ms, () => {
      ty.buy(id);
      gold = Math.max(0, gold - PART_PRICE[id]);
      const pad = { x: strip.x + 200 * strip.s, y: strip.y + 40 * strip.s };
      ctx.capture(() => fx.goldGain(pad.x, pad.y, 1));
    });
    ctx.at(200, () => readout.setText('one dropper to start: a piece worth 1 gold every 2 seconds'));
    ctx.at(2600, () => { gold += 30; readout.setText('click a green pad to build the next machine'); });
    buy(3000, 'drop2');
    buy(3700, 'up1');
    buy(4400, 'drop3');
    ctx.at(5400, () => { gold += 90; readout.setText('upgraders add to every piece that passes under them'); });
    buy(5800, 'up2');
    buy(6400, 'ref2');
    buy(7000, 'drop4');
    buy(7600, 'up3');
    buy(8200, 'ref3');
    ctx.at(8400, () => readout.setText('all eight bought: the tycoon is complete — Rebirth (Q) is ready'));
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

/** Gilded Augment: below 30%, the purse buys gold health, dearer every second it runs. */
export const masteryAugment: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Gilded Augment — below 30%, spend gold on 16 gold health a second and run 30% faster. The price climbs the longer it runs',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    alch(av)?.setMastered(true);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const rate = label(ctx, ctx.cx, ctx.cy + 36, hex(FOR.goldLit), 10);
    let gold = 30;
    purse(ctx, () => gold);
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    let hp = 0.6;
    let ghp = 0;
    let since = -1;
    let debt = 0;
    ctx.onFrame((dt, e) => {
      const s = dt / 1000;
      if (e > 600 && e < 1400) hp = Math.max(0.24, hp - s * 0.5);
      const total = hp + ghp;
      const running = since >= 0 ? total < 0.55 && gold > 0 : total < 0.3 && gold > 0 && e > 1400;
      if (running && since < 0) {
        since = e;
        ctx.capture(() => fx.augmentStart(ctx.cx, ctx.cy));
      }
      if (!running) since = -1;
      if (running) {
        const r = 2 * (1 + (e - since) / 1000 / 2.5);
        rate.setText(`${r.toFixed(1)} 🪙/s`);
        debt += r * s;
        while (debt >= 1 && gold > 0) { debt--; gold--; }
        ghp += (16 / 400) * s;
        if (Math.random() < s * 8) ctx.capture(() => fx.augmentMote(ctx.cx, ctx.cy));
      } else {
        rate.setText('');
      }
      bar.clear();
      const bx = ctx.cx - 26;
      const by = ctx.cy - 38;
      bar.fillStyle(0x111111, 0.85); bar.fillRect(bx - 1, by - 1, 54, 9);
      bar.fillStyle(hp < 0.3 ? 0xff5a5a : 0xffcc00, 1); bar.fillRect(bx, by, 52 * hp, 7);
      bar.fillStyle(0xf0c33c, 1); bar.fillRect(bx + 52 * hp, by, 52 * Math.min(ghp, 1 - hp), 7);
      bar.fillStyle(0xfffbe6, 0.9); bar.fillRect(bx + 52 * hp, by, 52 * Math.min(ghp, 1 - hp), 2);
      bar.lineStyle(1, 0xffffff, 0.5); bar.lineBetween(bx + 52 * 0.3, by - 2, bx + 52 * 0.3, by + 9);
    });
    ctx.at(700, () => readout.setText('a heavy hit takes you under 30%...'));
    ctx.at(1600, () => readout.setText('...and the purse buys gold health: 16 a second, and 30% faster'));
    ctx.at(4400, () => readout.setText('the longer it runs, the more each second costs — gold health cut away pays a little back'));
  },
};

/** No Pain, No Gain: a dagger in your own side, and the blood thrown out the far side sets into gold. */
export const masteryPain: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'No Pain, No Gain — stab yourself for 18. The blood sprays away from the cursor and turns to gold: stand on it for 1 gold every 2 seconds',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    alch(av)?.setMastered(true);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const at = { x: ctx.cx + 140, y: ctx.cy };
    // The cursor is to the left, so the blood goes right.
    const aim = Math.PI;
    interface Blot { x: number; y: number; r: number; seed: number; born: number; gildAt: number }
    const blots: Blot[] = [];
    let floorMs = 0;
    ctx.onFrame((dt, e) => {
      ground.clear();
      for (const b of blots) {
        const a = Math.min(1, Math.max(0, (e - b.born) / 140));
        const gild = Math.min(1, Math.max(0, (e - b.gildAt) / 700));
        bloodBlot(ground, ctx.tint, b.x, b.y, b.r * (0.6 + 0.4 * a), b.seed, gild, e / 1000, 0.9 * a);
      }
      const p = ctx.casterAt();
      const on = blots.some((b) => e > b.gildAt + 700 && Math.hypot(b.x - p.x, b.y - (p.y + 10)) <= b.r);
      if (!on) return;
      floorMs += dt;
      while (floorMs >= 2000) {
        floorMs -= 2000;
        gold++;
        float(ctx, p.x + 18, p.y - 34, '+1', hex(FOR.goldLit), 11);
        ctx.capture(() => fx.goldGain(p.x, p.y - 10, 1));
      }
    });
    ctx.moveCaster(at.x, at.y, { facing: aim });
    ctx.at(200, () => readout.setText('the dagger goes in on the cursor\'s side...'));
    ctx.at(600, () => {
      ctx.capture(() => fx.painStab(at.x, at.y, aim));
      alch(av)?.play('clap', aim);
      float(ctx, at.x, at.y - 30, '18', '#ffb3aa', 13);
      // The kit's own splatter: a widening fan, drifting to one side, plus a few strays.
      const seed = 37;
      const back = aim + Math.PI;
      const drift = (jitter(seed, 99) - 0.5) * 0.5;
      for (let i = 0; i < 14; i++) {
        const stray = i >= 11;
        const u = stray ? 0.35 + jitter(seed, i + 40) * 0.65 : (i + 0.5) / 11;
        const half = stray ? 0.75 : 0.14 + u * 0.4;
        const a = back + drift * u + (jitter(seed, i) * 2 - 1) * half;
        const d = 24 + Math.pow(u, 0.85) * 165 * (0.82 + jitter(seed, i + 20) * 0.3);
        const r = stray ? 5 + jitter(seed, i + 60) * 4 : 23 - u * 10 + jitter(seed, i + 60) * 5;
        blots.push({ x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d, r, seed: seed + i * 7.3, born: 600 + u * 140, gildAt: 600 + 450 + u * 500 });
      }
    });
    ctx.at(1300, () => readout.setText('...the blood leaves by the other side, and sets into gold'));
    ctx.at(3000, () => {
      readout.setText('stand on it: 1 gold every 2 seconds, for the rest of the match');
      ctx.glideCaster({ to: { x: at.x + 70, y: at.y - 10 }, ms: 600, ease: 'out' });
    });
  },
};

// ══ Shop upgrades ══════════════════════════════════════════════════════

export const lifeSupport: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Click+ Life-support — right click: droppers run 25% slower, and the refiner pays health instead of gold. Plus a 10-shard pad that triples your first dropper',
  run(ctx) {
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const ty = new Tycoon();
    ty.buy('drop2');
    ty.buy('up1');
    let gold = 0;
    let hp = 0.35;
    tycoonStrip(ctx, ty, {
      shardPad: true,
      paid: (v) => {
        if (!ty.lifeSupport) { gold += v; return; }
        hp = Math.min(1, hp + (v * 1.5) / 400);
        const p = ctx.casterAt();
        float(ctx, p.x, p.y - 44, `+${Math.round(v * 1.5)}`, '#8dffa0', 12);
      },
    });
    purse(ctx, () => gold);
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    ctx.onFrame(() => {
      bar.clear();
      const p = ctx.casterAt();
      bar.fillStyle(0x111111, 0.85); bar.fillRect(p.x - 27, p.y - 39, 54, 9);
      bar.fillStyle(hp > 0.5 ? 0x22dd55 : hp > 0.25 ? 0xffcc00 : 0xff3300, 1); bar.fillRect(p.x - 26, p.y - 38, 52 * hp, 7);
    });
    ctx.at(200, () => readout.setText('earning gold, as usual...'));
    ctx.at(2800, () => { ty.lifeSupport = true; readout.setText('right click: life-support — the refiner goes red and pays health'); });
    ctx.at(6400, () => { ty.lifeSupport = false; readout.setText('right click again to go back to gold'); });
    ctx.at(7800, () => { ty.shardDropper = true; readout.setText('the blue pad: 10 real shards for a first dropper worth 3 a piece'); });
  },
};

export const billiardBlitz: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'R+ Billiard Blitz — a ball that hits an enemy gives the cane straight back for another shot, and keeps the balls on the floor longer',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const target = { x: ctx.cx + 260, y: ctx.cy };
    dummyAt(ctx, target);
    const table = poolTable(ctx, fx, target, (b, v) => {
      float(ctx, target.x, target.y - 26, `${Math.round(5 + 17 * Math.min(1, (v - 130) / 770))}`, '#ffb3aa', 13);
      void b;
      const p = ctx.casterAt();
      ctx.capture(() => fx.blitz(p.x, p.y));
    });
    ctx.at(300, () => { av.play('sweep', ctx.aim); rack(ctx, table, { x: ctx.cx + 110, y: ctx.cy }, 0); });
    ctx.at(600, () => readout.setText('a ball finds them...'));
    lineUp(ctx, av, table, () => table.balls.slice().sort((a, b) => a.x - b.x)[0], target, 900);
    ctx.at(2600, () => readout.setText('...and the cane comes straight back: go again'));
    lineUp(ctx, av, table, () => table.balls.filter((b) => Math.hypot(b.vx, b.vy) < 1)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0], target, 4200);
    ctx.at(6000, () => readout.setText('keep hitting, keep shooting'));
  },
};

export const goldenGlory: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Q+ Golden Glory — every Rebirth builds one of six machines you cannot buy, and it stays through every later rebirth',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const ty = new Tycoon();
    completeTycoon(ty);
    let gold = 0;
    tycoonStrip(ctx, ty, { paid: (v) => { gold += v; } });
    purse(ctx, () => gold);
    const lines: [GloryId, string][] = [
      ['dragon', 'Dragon Upgrader: triples a piece — and burns 1 in 4'],
      ['midas', 'Midas Dropper: one piece at a time, worth 14'],
      ['furnace', 'Flaming Furnace: heats up as ore pours in, paying up to double'],
    ];
    lines.forEach(([g, text], i) => ctx.at(600 + i * 3600, () => {
      ctx.capture(() => fx.rebirth(ctx.cx, ctx.cy, i + 1));
      alch(av)?.setGilding((i + 1) * 3);
      ty.rebirth();
      ty.glory.add(g);
      completeTycoon(ty);
      readout.setText(text);
    }));
  },
};

const JEWEL_LINES: Record<Jewel, string> = {
  pearl: '×2 the effect', diamond: '×4 the effect', ruby: 'turned on the foe', sapphire: 'grows over time', jade: '×2 per jade',
};

export const advanceUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'E+ Artisan — two jeweled cards join every offer, each with a price of its own under it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(-Math.PI / 2);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 46;
    purse(ctx, () => gold);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const texts = Array.from({ length: 15 }, (_, i) => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: i % 3 === 0 ? '8px' : '7px', fontFamily: 'Arial Black', color: i % 3 === 0 ? '#fff3c4' : i % 3 === 1 ? '#e6c46a' : '#fff0a8',
    }).setOrigin(0.5).setDepth(17)));
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    type C = { kind: StatKind; jewel: Jewel | null; price: number; line: string };
    let offer: C[] | null = null;
    let opened = 0;
    let hover = -1;
    let now = 0;
    const W = 58, H = 70, GAP = 8;
    const centres = (): { x: number; y: number }[] => {
      const at = ctx.casterAt();
      const y = Math.max(H / 2 + 24, at.y - 96);
      const x = Math.max(at.x, 2 * (W + GAP) + W / 2 + 6);
      return [-2, -1, 0, 1, 2].map((k) => ({ x: x + k * (W + GAP), y }));
    };
    ctx.onFrame((_dt, e) => {
      now = e;
      g.clear(); cursor.clear();
      for (const t of texts) t.setVisible(false);
      if (!offer) return;
      const cs = centres();
      const a = Phaser.Math.Clamp((e - opened) / 220, 0, 1);
      offer.forEach((c, i) => {
        const rise = (1 - a) * 14;
        const x = cs[i].x;
        const y = cs[i].y + rise;
        advanceCard(g, ctx.tint, x, y, W, H, c.kind, hover === i, a, e / 1000);
        texts[i * 3].setVisible(true).setText(STAT_TEXT[c.kind][0]).setPosition(x, y + 16).setAlpha(a);
        texts[i * 3 + 1].setVisible(true).setText(c.line).setPosition(x, y + 27).setAlpha(a);
        if (!c.jewel) return;
        jewelGem(g, ctx.tint, x, y - H / 2 - 1, 6, c.jewel, a, e / 1000 + i);
        texts[i * 3 + 2].setVisible(true).setText(`${c.jewel.toUpperCase()}  ${c.price}🪙`).setPosition(x, y + H / 2 + 7).setAlpha(a);
      });
      if (hover >= 0) {
        const c = cs[hover];
        cursor.fillStyle(0xffffff, 0.95);
        cursor.fillTriangle(c.x + 6, c.y + 6, c.x + 6, c.y + 20, c.x + 16, c.y + 15);
      }
    });
    const round = (at: number, cards: C[], pickI: number, say: string): void => {
      ctx.at(at, () => {
        gold -= 10;
        offer = cards;
        opened = now;
        hover = -1;
        av.play('flex');
        alch(av)?.setGlowHand(0.8);
        const at2 = ctx.casterAt();
        ctx.capture(() => fx.advanceOpen(at2.x, at2.y - 96));
      });
      ctx.at(at + 800, () => { hover = 3; });
      ctx.at(at + 1400, () => { hover = pickI; readout.setText(say); });
      ctx.at(at + 2200, () => {
        if (!offer) return;
        const c = centres()[pickI];
        const card = offer[pickI];
        offer = null;
        hover = -1;
        gold -= card.price;
        av.play('flex');
        ctx.capture(() => fx.advancePick(c.x, c.y));
        const at2 = ctx.casterAt();
        float(ctx, at2.x, at2.y - 52, `${card.jewel ? `${card.jewel.toUpperCase()} ` : ''}${STAT_TEXT[card.kind][0]}  ${card.line}`, hex(FOR.goldLit), 12);
      });
    };
    ctx.at(150, () => readout.setText('three plain cards, and two set with jewels — priced under the card'));
    round(500, [
      { kind: 'might', jewel: null, price: 0, line: STAT_TEXT.might[1] },
      { kind: 'stride', jewel: null, price: 0, line: STAT_TEXT.stride[1] },
      { kind: 'mend', jewel: null, price: 0, line: STAT_TEXT.mend[1] },
      { kind: 'hide', jewel: 'diamond', price: 20, line: '-25% dmg taken' },
      { kind: 'haste', jewel: 'ruby', price: 10, line: 'foe +8% cooldowns' },
    ], 3, `Diamond: four times the effect. Ruby: turned on the enemy (${JEWEL_LINES.ruby})`);
    round(4300, [
      { kind: 'greed', jewel: null, price: 0, line: STAT_TEXT.greed[1] },
      { kind: 'vigor', jewel: null, price: 0, line: STAT_TEXT.vigor[1] },
      { kind: 'sheaf', jewel: null, price: 0, line: STAT_TEXT.sheaf[1] },
      { kind: 'might', jewel: 'sapphire', price: 8, line: '+10% damage ▲' },
      { kind: 'stride', jewel: 'jade', price: 12, line: '+7% speed' },
    ], 4, 'Sapphire grows every 20s. Jade doubles for every other jade you own');
  },
};

export const heartUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F+ Gold Hex — a golden heart makes every ability bar they have charge 50% slower, for the heart and 5s after',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const target = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, target);
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const keys = ['E', 'R', 'F', 'Q'];
    const tags = keys.map((k) => label(ctx, 0, 0, '#e8dcb8', 9).setText(k));
    const fill = [0.1, 0.35, 0.6, 0.05];
    let heartUntil = -1;
    let hexUntil = -1;
    ctx.onFrame((dt, e) => {
      hud.clear();
      const hexed = e < hexUntil;
      const rate = (hexed ? 0.5 : 1) * dt / 5000;
      const bx = target.x - 44;
      const by = target.y + 34;
      keys.forEach((_, i) => {
        fill[i] = fill[i] >= 1 ? 0 : Math.min(1, fill[i] + rate * (1 + i * 0.2));
        const x = bx + i * 23;
        hud.fillStyle(0x17110a, 0.85); hud.fillRect(x, by, 20, 6);
        hud.fillStyle(hexed ? 0xd8a531 : 0x8fd3ff, 1); hud.fillRect(x, by, 20 * fill[i], 6);
        tags[i].setPosition(x + 10, by + 13);
      });
      if (hexed) {
        hud.lineStyle(1.2, 0xffd34d, 0.6 + 0.3 * Math.sin(e / 120));
        hud.strokeRect(bx - 3, by - 3, 4 * 23 + 3, 12);
      }
      if (e < heartUntil) goldenHeart(hud, ctx.tint, target.x, target.y - 46, 0.2 + 0.1 * Math.sin(e / 300), e / 1000, 1);
    });
    ctx.at(200, () => readout.setText('their ability bars, charging as normal'));
    ctx.at(1600, () => {
      av.play('dash', ctx.aim);
      const to = { x: target.x - 70, y: target.y };
      ctx.capture(() => fx.caneLunge(ctx.cx, ctx.cy, to.x, to.y));
      ctx.glideCaster({ to, ms: 180, ease: 'out' });
    });
    ctx.at(1760, () => {
      ctx.capture(() => fx.heartApply(target.x, target.y - 34));
      float(ctx, target.x, target.y - 54, '⏳ GOLD HEX', hex(FOR.gold), 12);
      heartUntil = 1760 + 4000;
      hexUntil = 1760 + 6500;
      readout.setText('a golden heart hexes them: every bar charges at half speed');
    });
    ctx.at(5900, () => readout.setText('the heart is gone — the hex lasts 5 seconds longer'));
    ctx.at(8300, () => readout.setText('and the bars charge normally again'));
  },
};
