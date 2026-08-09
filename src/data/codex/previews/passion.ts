import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  PSN, PassionAvatar, PassionFx,
  blush, heart, heartEyes, kissMark, loveBar, rose as drawRose,
} from '../../../elements/kits/PassionVisuals';

/**
 * Passion's showcases.
 *
 * Passion puts no sprite in the world at all — the heart bullets, the thrown rose, the kiss
 * prints, the love bar, the blush and the heart eyes are every one of them Graphics repainted
 * per frame out of `PassionVisuals`. So `ctx.fly` is useless here and every loop mirrors the
 * kit's own little state records and hands them to the kit's own painters, which is what keeps
 * a showcase honest the next time somebody retunes the art.
 *
 * The one thing every script has to show is the meter. An ability preview for this element that
 * does not have a love bar climbing in it is documenting a different element.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so text and
 * Graphics made inside one go through `ctx.adopt`. `PassionFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const LOVE_BAR_W = 52;
const LOVE_BAR_H = 5;
const LOVE_BAR_Y = -54;
const STAGE_MARKS = [0.25, 0.5, 0.75];

const SHOT_SPEED = 720;
const SHOT_DAMAGE = 12;
const SHOT_LOVE = 15;
const SHOT_LOVE_PER_BONUS = 80;
const SHOT_BONUS_DAMAGE = 2;

const FLIRT_REACH = 200;
const FLIRT_HALF_ANGLE = 0.66;
const FLIRT_LOVE = 30;
const FLIRT_STAGE_BONUS = 5;
const DATING_STEP = 4;

const SMOOCH_SPEED = 820;
const SMOOCH_MS = 260;
const SMOOCH_LOVE = 30;
const SMOOCH_LOVE_FRACTION = 0.15;
const MAKEOUT_KISSES = 5;
const MAKEOUT_GAP = 15;

const ROSE_STACK_MULT = 0.95;
const ROSE_THROW_SPEED = 620;

const POSE_LOVE_PER_SEC = 15;
const POSE_VIEW_HALF_ANGLE = 1.05;

const IMPRESSED_MULT = 1.5;
const SEDUCE_MULT = 1.5;

/** The bar a preview works against. 400 is the player's own maximum health. */
const BAR_MAX = 400;

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

function stageIt(ctx: PreviewCtx): { fx: PassionFx; av: BaseAvatar; pav: PassionAvatar | null } {
  const fx = ctx.capture(() => new PassionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, pav: av instanceof PassionAvatar ? av : null };
}

/**
 * The caster, positioned by the script rather than the harness — needed by the two loops where
 * the character moves (the Smooch dash, and the Make-out grab that drags the pair together).
 * `bodyTexture: ''` stops the harness staging a body of its own; frame hooks run after its pass.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => Mark,
): { fx: PassionFx; av: BaseAvatar; pav: PassionAvatar | null } {
  const fx = ctx.capture(() => new PassionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-passion')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-passion').setDepth(5));
    ctx.onFrame(() => { const s = read(); body.setPosition(s.x, s.y); });
  }
  const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => { const s = read(); av.update(dt, s.x, s.y, 1); });
  return { fx, av, pav: av instanceof PassionAvatar ? av : null };
}

function stageOf(ratio: number): number {
  let s = 0;
  for (const m of STAGE_MARKS) if (ratio >= m) s++;
  return s;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** One meter's worth of state, exactly the fields `Love` carries in the kit. */
interface Meter { cur: number; max: number; impressedUntil: number }

function meter(cur = 0, max = BAR_MAX): Meter {
  return { cur, max, impressedUntil: -1 };
}

/**
 * A victim: the grey stand-in, and every readout Passion paints on top of one — the bar, the
 * Impressed frame, the blush stage and the heart eyes, all from the kit's own painters.
 */
function loveTarget(
  ctx: PreviewCtx, at: Mark, m: Meter, o?: { alpha?: () => number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const a = o?.alpha?.() ?? 1;
    g.clear();
    if (a <= 0.02) return;

    g.fillStyle(0x2b2f3d, a);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, a);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, a * 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, a);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);

    const ratio = Phaser.Math.Clamp(m.cur / m.max, 0, 1);
    loveBar(g, ctx.tint, at.x, at.y + LOVE_BAR_Y, LOVE_BAR_W, LOVE_BAR_H, ratio, t, a);

    // Show-off's gold frame, which has to live on the bar because the effect is a multiplier
    // on the bar.
    if (m.impressedUntil > elapsed) {
      const beat = 0.6 + Math.abs(Math.sin(t * 6)) * 0.4;
      g.lineStyle(1.6, ctx.tint(PSN.gold), beat);
      g.strokeRect(at.x - LOVE_BAR_W / 2 - 2.5, at.y + LOVE_BAR_Y - 2.5, LOVE_BAR_W + 5, LOVE_BAR_H + 5);
      for (let i = 0; i < 3; i++) {
        const ang = t * 2.2 + (i / 3) * Math.PI * 2;
        heart(g, ctx.tint, at.x + Math.cos(ang) * (LOVE_BAR_W / 2 + 7),
          at.y + LOVE_BAR_Y + LOVE_BAR_H / 2 + Math.sin(ang) * 5, 3.4, Math.PI / 2, PSN.gold, beat * 0.9);
      }
    }

    const st = stageOf(ratio);
    if (st >= 1) blush(g, ctx.tint, at.x, at.y, Math.min(st, 3) as 1 | 2 | 3, a, t);
    if (st >= 3) heartEyes(g, ctx.tint, at.x, at.y, a, t);
  });
}

/** A figure floating off an impact — the same pop-up the arena prints. */
function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#170410', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 760) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 760, 0, 1));
  });
}

/** A caption pinned under something, for the side-by-side comparison loops. */
function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(19));
}

/**
 * Adds love the way the kit does — through the multipliers, with the pop-up quoting the amount
 * *after* them, because a "+30 ❤" over somebody who just took 45 is a lie a player will spot.
 */
function addLove(
  ctx: PreviewCtx, fx: PassionFx, at: Mark, m: Meter, amount: number, icon: string,
  elapsed: number, seduce = false,
): void {
  let mult = 1;
  if (m.impressedUntil > elapsed) mult *= IMPRESSED_MULT;
  if (seduce) mult *= SEDUCE_MULT;
  const before = stageOf(m.cur / m.max);
  m.cur = Math.min(m.max, m.cur + amount * mult);
  const after = stageOf(m.cur / m.max);
  tick(ctx, at.x, at.y - 34, `+${Math.round(amount * mult)} ${icon}`,
    mult > 1.001 ? PSN.gold : PSN.hot);
  if (after > before) {
    tick(ctx, at.x, at.y - 52, ['', '💗 BLUSHING', '💓 SMITTEN', '💞 LOVESTRUCK'][after], PSN.deep);
    fx.hearts(at.x, at.y, 4 + after * 2, 22 + after * 6, PSN.blush, 620);
  }
}

/** A heart bullet: stepped and painted exactly as `paintAir` paints one. */
function heartShot(
  ctx: PreviewCtx, from: Mark, ang: number, onHit: (at: Mark) => void, hitAt: () => Mark | null,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const p = { x: from.x, y: from.y };
  let spin = 0;
  let done = false;
  ctx.onFrame((dt) => {
    g.clear();
    if (done) return;
    const s = dt / 1000;
    p.x += Math.cos(ang) * SHOT_SPEED * s;
    p.y += Math.sin(ang) * SHOT_SPEED * s;
    spin += s * 3;
    const target = hitAt();
    if (target && Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) <= 38) {
      done = true;
      onHit(target);
      return;
    }
    if (p.x < -20 || p.x > ctx.w + 20 || p.y < -20 || p.y > ctx.h + 20) { done = true; return; }
    for (let i = 3; i >= 1; i--) {
      heart(g, ctx.tint, p.x - Math.cos(ang) * SHOT_SPEED * 0.014 * i,
        p.y - Math.sin(ang) * SHOT_SPEED * 0.014 * i, 9 - i * 1.9, ang, PSN.blush, 0.42 / i);
    }
    g.fillStyle(ctx.tint(PSN.hot), 0.22);
    g.fillCircle(p.x, p.y, 13);
    heart(g, ctx.tint, p.x, p.y, 10 + Math.sin(spin * 2.4) * 0.9, ang, PSN.hot, 1, true);
  });
}

// ── Click — Loveshot ──────────────────────────────────────────────────

/** Six shots at the kit's real 0.55s cadence, into a bar that is already doing work. */
function loveshotLoop(ctx: PreviewCtx, opts: { showoff: boolean }): void {
  const { fx, av, pav } = stageIt(ctx);
  const foe = { x: ctx.tx, y: ctx.ty };
  const m = meter(opts.showoff ? 120 : 235);
  loveTarget(ctx, foe, m);

  let streak = 0;
  const shots = opts.showoff ? 5 : 6;
  for (let i = 0; i < shots; i++) {
    ctx.at(300 + i * 550, () => {
      av.play('punch', ctx.aim);
      pav?.recoil();
      const tip = pav?.pistolTip();
      const from = tip && Number.isFinite(tip.x) ? { x: tip.x, y: tip.y }
        : { x: ctx.cx + 22, y: ctx.cy };
      fx.muzzle(from.x, from.y, ctx.aim);
      const ang = Math.atan2(foe.y - from.y, foe.x - from.x);
      heartShot(ctx, from, ang, (at) => {
        // The meter feeds the gun: every 80 already banked is another 2 damage.
        const bonus = Math.floor(m.cur / SHOT_LOVE_PER_BONUS) * SHOT_BONUS_DAMAGE;
        fx.hearts(at.x, at.y, 4, 18, PSN.hot, 480);
        tick(ctx, at.x, at.y - 16, `${SHOT_DAMAGE + bonus}`, PSN.cream);
        const elapsed = 300 + i * 550;
        addLove(ctx, fx, at, m, SHOT_LOVE, '❤', elapsed);
        if (!opts.showoff) return;
        // Love first, streak second — the shot that completes a run pays at 1×.
        streak++;
        if (streak < 3) { tick(ctx, at.x, at.y - 48, `😏 ${streak}/3`, PSN.pink); return; }
        streak = 0;
        m.impressedUntil = elapsed + 5000;
        fx.heartRing(at.x, at.y, 8, 62, PSN.gold, 620);
        fx.hearts(at.x, at.y, 8, 34, PSN.gold, 820);
        tick(ctx, at.x, at.y - 62, '😍 IMPRESSED', PSN.gold);
      }, () => foe);
    });
  }
}

export const loveshot: PreviewScript = {
  duration: 4400,
  caption: 'Click — 12 damage +2 per 80 love already banked, and 15 more love every time',
  run(ctx) { loveshotLoop(ctx, { showoff: false }); },
};

export const loveshotUpgraded: PreviewScript = {
  duration: 4400,
  caption: 'Show-off — three in a row and they are Impressed for 5s: all love ×1.5',
  run(ctx) { loveshotLoop(ctx, { showoff: true }); },
};

// ── E — Flirt ─────────────────────────────────────────────────────────

function flirtLoop(ctx: PreviewCtx, opts: { dating: boolean }): void {
  const { fx, av } = stageIt(ctx);
  const foe = { x: ctx.cx + 165, y: ctx.cy };
  const m = meter(0);
  loveTarget(ctx, foe, m);
  label(ctx, ctx.cx + 100, ctx.h - 12,
    opts.dating ? 'cooldown is 8s in play — shown back to back' : '8s cooldown in play', PSN.wine);

  let flirts = 0;
  for (let i = 0; i < 4; i++) {
    ctx.at(400 + i * 1400, () => {
      av.play('sweep', ctx.aim);
      fx.flirtCone(ctx.cx, ctx.cy, ctx.aim, FLIRT_REACH, FLIRT_HALF_ANGLE);
      // The stage is read as the target walked in, before this cone lands.
      const bonus = stageOf(m.cur / m.max) * FLIRT_STAGE_BONUS;
      const dating = opts.dating ? flirts * DATING_STEP : 0;
      addLove(ctx, fx, foe, m, FLIRT_LOVE + bonus + dating, '❤', 400 + i * 1400);
      tick(ctx, ctx.cx, ctx.cy - 46, '😘 FLIRT', PSN.hot);
      if (!opts.dating) return;
      flirts++;
      tick(ctx, ctx.cx, ctx.cy - 62, `💌 DATING +${flirts * DATING_STEP}`, PSN.gold);
    });
  }
}

export const flirt: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'E — a ~76° cone, 200px, no damage at all. 30 love, +5 for each stage they have passed',
  run(ctx) { flirtLoop(ctx, { dating: false }); },
};

export const flirtUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Dating — +4 love per Flirt already cast this match, uncapped and for the rest of it',
  run(ctx) { flirtLoop(ctx, { dating: true }); },
};

// ── R — Smooch ────────────────────────────────────────────────────────

/** Kiss prints on the floor, the same 1.4s trail the dash lays down. */
function prints(ctx: PreviewCtx): { add: (x: number, y: number, ang: number, size: number, ms: number) => void } {
  const list: Array<{ x: number; y: number; ang: number; size: number; born: number; ms: number }> = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  let now = 0;
  ctx.onFrame((dt) => {
    now += dt;
    g.clear();
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const life = 1 - (now - p.born) / p.ms;
      if (life <= 0) { list.splice(i, 1); continue; }
      kissMark(g, ctx.tint, p.x, p.y, p.ang, p.size * (0.7 + life * 0.4), life * 0.6);
    }
  });
  return { add: (x, y, ang, size, ms) => list.push({ x, y, ang, size, born: now, ms }) };
}

export const smooch: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — a 213px dash. Under half a bar the kiss simply refuses; over it, 30 + 15% of what is banked',
  run(ctx) {
    const home = { x: ctx.w * 0.18, y: ctx.h * 0.62 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.6, y: ctx.h * 0.62 };
    const m = meter(BAR_MAX * 0.4);
    loveTarget(ctx, foe, m);
    const trail = prints(ctx);

    const dash = (at: number, onArrive: () => void): void => {
      ctx.at(at, () => {
        av.play('dash', ctx.aim);
        fx.heartRing(home.x, home.y, 10, 54, PSN.pink, 420);
        const start = { x: home.x, y: home.y };
        let run = 0;
        // 820 px/s for 260ms, applied after movement so nothing can cancel it.
        const step = (dt: number): void => {
          if (run >= SMOOCH_MS) return;
          const use = Math.min(dt, SMOOCH_MS - run);
          run += use;
          home.x = start.x + Math.cos(ctx.aim) * SMOOCH_SPEED * (run / 1000);
          home.y = start.y;
          trail.add(home.x, home.y + 12, ctx.aim + Math.PI / 2, 9, 1400);
          if (run >= SMOOCH_MS) onArrive();
        };
        ctx.onFrame(step);
      });
    };

    dash(700, () => {
      // Below half: refused outright, and it says so.
      tick(ctx, foe.x, foe.y - 40, '💔 NOT YET', PSN.wine);
    });
    ctx.at(2100, () => {
      home.x = ctx.w * 0.18;
      m.cur = BAR_MAX * 0.62;
      tick(ctx, foe.x, foe.y - 52, '💓 SMITTEN', PSN.deep);
    });
    dash(3000, () => {
      const gain = Math.round(SMOOCH_LOVE + m.cur * SMOOCH_LOVE_FRACTION);
      fx.smooch(foe.x, foe.y - 6, ctx.aim);
      trail.add(foe.x, foe.y + 12, ctx.aim + Math.PI / 2, 13, 3000);
      addLove(ctx, fx, foe, m, gain, '💋', 3000);
    });
  },
};

export const smoochUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Make-out — at 90% the kiss becomes the finisher: 2.4s held, five kisses, charmed',
  run(ctx) {
    const home = { x: ctx.w * 0.22, y: ctx.h * 0.6 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.62, y: ctx.h * 0.6 };
    const m = meter(BAR_MAX * 0.92);
    let dead = false;
    loveTarget(ctx, foe, m, { alpha: () => (dead ? 0 : 1) });
    const trail = prints(ctx);

    // The pair is written to fixed points either side of the midpoint, every frame.
    const mid = { x: 0, y: 0 };
    let holding = false;
    let kisses = 0;
    const halo = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      halo.clear();
      if (!holding) return;
      const t = elapsed / 1000;
      const done = Phaser.Math.Clamp((elapsed - 1200) / 2400, 0, 1);
      home.x = Phaser.Math.Linear(home.x, mid.x - MAKEOUT_GAP, 0.32);
      home.y = Phaser.Math.Linear(home.y, mid.y, 0.32);
      foe.x = Phaser.Math.Linear(foe.x, mid.x + MAKEOUT_GAP, 0.32);
      foe.y = Phaser.Math.Linear(foe.y, mid.y, 0.32);
      halo.fillStyle(ctx.tint(PSN.hot), 0.1 + done * 0.14);
      halo.fillCircle(mid.x, mid.y, 34 + done * 26 + Math.sin(t * 6) * 3);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 1.1;
        const r = 30 + done * 22 + Math.sin(t * 4 + i) * 4;
        heart(halo, ctx.tint, mid.x + Math.cos(a) * r, mid.y + Math.sin(a) * r * 0.72,
          4.4 + done * 3, a + Math.PI / 2, PSN.pink, 0.5 + done * 0.45);
      }
      // One print per kiss so far, arced overhead — the counter, drawn.
      for (let i = 0; i < kisses; i++) {
        const a = -Math.PI / 2 + (i - (MAKEOUT_KISSES - 1) / 2) * 0.34;
        kissMark(halo, ctx.tint, mid.x + Math.cos(a) * 40, mid.y + Math.sin(a) * 34,
          a + Math.PI / 2, 11, 0.85);
      }
    });

    ctx.at(700, () => {
      av.play('dash', ctx.aim);
      let run = 0;
      const start = home.x;
      ctx.onFrame((dt) => {
        if (run >= SMOOCH_MS || holding) return;
        run += dt;
        home.x = start + Math.cos(ctx.aim) * SMOOCH_SPEED * (Math.min(run, SMOOCH_MS) / 1000);
        trail.add(home.x, home.y + 12, ctx.aim + Math.PI / 2, 9, 1400);
      });
    });

    ctx.at(1200, () => {
      holding = true;
      mid.x = (home.x + foe.x) / 2;
      mid.y = (home.y + foe.y) / 2;
      fx.heartRing(mid.x, mid.y, 12, 96, PSN.hot, 700);
      tick(ctx, home.x, home.y - 60, '💞 MAKE-OUT', PSN.gold);
      tick(ctx, home.x, home.y - 76, '×0 DAMAGE TAKEN', PSN.gold);
    });

    // Five kisses: the first at 320ms, then every 416ms.
    for (let i = 0; i < MAKEOUT_KISSES; i++) {
      ctx.at(1200 + 320 + i * 416, () => {
        kisses++;
        const spin = kisses * 1.7;
        const kx = mid.x + Math.cos(spin) * 12;
        const ky = mid.y + Math.sin(spin) * 8 - 6;
        fx.smooch(kx, ky, ctx.aim);
        fx.hearts(kx, ky, 5, 26, PSN.hot, 640);
        tick(ctx, mid.x, mid.y - 44 - kisses * 4, `💋 ${kisses}/${MAKEOUT_KISSES}`, PSN.gold);
      });
    }

    ctx.at(1200 + 2400, () => {
      holding = false;
      m.cur = m.max;
      tick(ctx, foe.x, foe.y - 68, '💞 HEAD OVER HEELS', PSN.gold);
      fx.charm(foe.x, foe.y);
      tick(ctx, foe.x, foe.y - 56, '💘 CHARMED', PSN.hot);
      ctx.at(360, () => { dead = true; });
    });
  },
};

// ── F — Manipulate ────────────────────────────────────────────────────

export const manipulate: PreviewScript = {
  duration: 6800,
  scale: 0.9,
  caption: 'F — 15s with the rose. Every hit taken is another ×0.95 on everything; recast to throw it',
  run(ctx) {
    const { fx, av, pav } = stageIt(ctx);
    const foe = { x: ctx.tx, y: ctx.ty };
    const m = meter(0);
    loveTarget(ctx, foe, m);

    ctx.at(300, () => {
      av.play('flex');
      pav?.setRose(true, 0);
      fx.petals(ctx.cx, ctx.cy - 10, 6);
      tick(ctx, ctx.cx, ctx.cy - 46, '🌹 MANIPULATE', PSN.deep);
    });
    // The rose visibly wilts across its fifteen seconds; the loop shows the first third of that.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed > 300 && elapsed < 4200) pav?.setRose(true, (elapsed - 300) / 15000);
    });

    // Four hits arriving, each buying another cut. Multiplicative, so it never reaches zero.
    let stacks = 0;
    for (let i = 0; i < 4; i++) {
      ctx.at(900 + i * 620, () => {
        stacks++;
        fx.petals(ctx.cx, ctx.cy - 6, 3);
        tick(ctx, foe.x, foe.y - 46, `🥀 -${Math.round((1 - ROSE_STACK_MULT ** stacks) * 100)}% DMG`, PSN.deep);
      });
    }

    // The recast. At full health it is worth the floor of 20; the caption says what moves it.
    ctx.at(4200, () => {
      pav?.setRose(false, 0);
      av.play('punch', ctx.aim);
      tick(ctx, ctx.cx, ctx.cy - 46, '🌹 60', PSN.deep);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const p = { x: ctx.cx + 20, y: ctx.cy };
      let spin = 0;
      let done = false;
      ctx.onFrame((dt) => {
        g.clear();
        if (done) return;
        const s = dt / 1000;
        p.x += Math.cos(ctx.aim) * ROSE_THROW_SPEED * s;
        p.y += Math.sin(ctx.aim) * ROSE_THROW_SPEED * s;
        spin += s * 9;
        if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 42) {
          done = true;
          fx.petals(foe.x, foe.y, 12);
          addLove(ctx, fx, foe, m, 60, '🌹', 4200);
          return;
        }
        // Tumbling end over end, with petals shaking loose behind it.
        drawRose(g, ctx.tint, p.x, p.y, spin, 0.95, 1, 0);
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(ctx.tint(PSN.deep), 0.28 / i);
          g.fillEllipse(p.x - Math.cos(ctx.aim) * ROSE_THROW_SPEED * 0.012 * i,
            p.y - Math.sin(ctx.aim) * ROSE_THROW_SPEED * 0.012 * i, 5 - i, 3.4 - i * 0.5);
        }
      });
    });
  },
};

export const manipulateUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Spare — rose held, them at 50%+ love and you under 10% health: 5s of nothing landing',
  run(ctx) {
    const { fx, av, pav } = stageIt(ctx);
    const foe = { x: ctx.tx, y: ctx.ty };
    const m = meter(BAR_MAX * 0.58);
    loveTarget(ctx, foe, m);
    label(ctx, ctx.cx, ctx.h - 12, 'you: 34 / 400 hp', PSN.wine);

    ctx.at(300, () => {
      av.play('flex');
      pav?.setRose(true, 0);
      fx.petals(ctx.cx, ctx.cy - 10, 6);
    });

    let spareAt = -1;
    ctx.at(1100, () => {
      spareAt = 1100;
      tick(ctx, ctx.cx, ctx.cy - 58, '🌹 SPARED', PSN.gold);
      fx.heartRing(ctx.cx, ctx.cy, 10, 110, PSN.gold, 820);
      fx.petals(ctx.cx, ctx.cy - 6, 10);
      fx.hearts(foe.x, foe.y, 6, 30, PSN.blush, 900);
      tick(ctx, foe.x, foe.y - 46, '💘 I CAN\'T…', PSN.hot);
    });

    // The enemy hesitating, drawn exactly as the kit draws it: a heart welling up, a hand
    // shaking harder as the window runs out, and a crack across the heart in the last half.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (spareAt < 0) return;
      const left = 1 - (elapsed - spareAt) / 5000;
      if (left <= 0) return;
      const t = elapsed / 1000;
      const shake = Math.sin(elapsed / 34) * (1 - left) * 3.4;
      const hy = foe.y - 40 - left * 6;
      g.fillStyle(ctx.tint(PSN.hot), 0.16 * left);
      g.fillCircle(foe.x, foe.y, 30 + Math.sin(t * 5) * 3);
      heart(g, ctx.tint, foe.x + shake, hy, 11 + Math.sin(t * 7) * 1.6, Math.PI / 2,
        PSN.hot, 0.55 + left * 0.4, true);
      if (left < 0.5) {
        g.lineStyle(1.6, ctx.tint(PSN.ink), (0.5 - left) * 1.8);
        g.lineBetween(foe.x + shake - 1, hy - 9, foe.x + shake + 2, hy);
        g.lineBetween(foe.x + shake + 2, hy, foe.x + shake - 2, hy + 8);
      }
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.9 + i * 0.2) % 1;
        g.fillStyle(ctx.tint(i % 2 ? PSN.deep : PSN.hot), (1 - ph) * 0.6 * left);
        g.fillEllipse(ctx.cx + Math.sin(ph * 6 + i) * 14, ctx.cy - 26 + ph * 44, 5.4, 3.4);
      }
    });

    // Shots arriving into the window and doing nothing at all.
    for (let i = 0; i < 4; i++) {
      ctx.at(1600 + i * 900, () => tick(ctx, ctx.cx, ctx.cy - 30, '0', PSN.gold));
    }
    ctx.at(6100, () => tick(ctx, ctx.cx, ctx.cy - 52, '🥀 THEY OVERCOME IT', PSN.wine));
  },
};

// ── Q — Exhibition ────────────────────────────────────────────────────

function exhibitionLoop(ctx: PreviewCtx, opts: { seduce: boolean }): void {
  const { fx, av, pav } = stageIt(ctx);
  const watcher = { x: ctx.w * 0.58, y: ctx.h * 0.34 };
  const away = { x: ctx.w * 0.84, y: ctx.h * 0.7 };
  const mA = meter(0);
  const mB = meter(0);
  loveTarget(ctx, watcher, mA);
  loveTarget(ctx, away, mB);
  label(ctx, watcher.x, watcher.y + 30, 'looking at you', PSN.hot);
  label(ctx, away.x, away.y + 30, 'looking away', PSN.wine);

  // Each victim's 120° arc of attention, so "facing" is something the eye can check.
  const cones = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const facingAway = Math.atan2(away.y - ctx.cy, away.x - ctx.cx);
  ctx.onFrame(() => {
    cones.clear();
    const draw = (at: Mark, facing: number, on: boolean): void => {
      cones.fillStyle(ctx.tint(on ? PSN.hot : PSN.wine), on ? 0.14 : 0.08);
      cones.beginPath();
      cones.moveTo(at.x, at.y);
      cones.arc(at.x, at.y, 70, facing - POSE_VIEW_HALF_ANGLE, facing + POSE_VIEW_HALF_ANGLE, false);
      cones.closePath();
      cones.fillPath();
    };
    draw(watcher, Math.atan2(ctx.cy - watcher.y, ctx.cx - watcher.x), true);
    draw(away, facingAway, false);
  });

  ctx.at(200, () => {
    av.play('raise');
    pav?.setPosing(1);
    av.setHold('ride');
    av.setIntensity(1.25);
    fx.heartRing(ctx.cx, ctx.cy, 14, 120, PSN.hot, 700);
    tick(ctx, ctx.cx, ctx.cy - 56, '📸 EXHIBITION', PSN.gold);
  });
  ctx.at(5200, () => { pav?.setPosing(0); av.setHold(null); av.setIntensity(1); });

  // Flashbulbs alternating along the side walls, every 210ms, aimed inward.
  let side = 1;
  for (let i = 0; i < 24; i++) {
    ctx.at(220 + i * 210, () => {
      side = -side;
      const fxx = side > 0 ? ctx.w - 14 : 14;
      const fy = 24 + ((i * 53) % Math.max(1, Math.floor(ctx.h - 48)));
      fx.cameraFlash(fxx, fy, Math.atan2(ctx.cy - fy, ctx.cx - fxx));
    });
  }

  // 15 love a second, continuously, to whoever is looking. The pop-up is once a second.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 200 || elapsed > 5200) return;
    mA.cur = Math.min(mA.max, mA.cur + POSE_LOVE_PER_SEC * (opts.seduce ? SEDUCE_MULT : 1) * (dt / 1000));
  });
  for (let i = 1; i <= 5; i++) {
    ctx.at(200 + i * 1000, () => {
      tick(ctx, watcher.x, watcher.y - 34, `+${Math.round(POSE_LOVE_PER_SEC * (opts.seduce ? SEDUCE_MULT : 1))} ❤`,
        opts.seduce ? PSN.gold : PSN.hot);
      if (i % 2 === 1) tick(ctx, away.x, away.y - 44, '👀 NOT LOOKING', PSN.wine);
    });
  }

  // Seduce lifts everything, not just the pose's own drip — so the loop lands a Flirt in it.
  if (!opts.seduce) return;
  ctx.at(3000, () => {
    av.play('sweep', Math.atan2(watcher.y - ctx.cy, watcher.x - ctx.cx));
    fx.flirtCone(ctx.cx, ctx.cy, Math.atan2(watcher.y - ctx.cy, watcher.x - ctx.cx),
      FLIRT_REACH, FLIRT_HALF_ANGLE);
    const bonus = stageOf(mA.cur / mA.max) * FLIRT_STAGE_BONUS;
    addLove(ctx, fx, watcher, mA, FLIRT_LOVE + bonus, '❤', 3000, true);
  });
}

export const exhibition: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Q — 5s posing. 15 love a second to anyone inside their own 120° of attention, nothing to anyone else',
  run(ctx) { exhibitionLoop(ctx, { seduce: false }); },
};

export const exhibitionUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Seduce — ×1.5 on every point of love you deal while the pose is up, from any source',
  run(ctx) { exhibitionLoop(ctx, { seduce: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theLoveBar: PreviewScript = {
  duration: 8000,
  scale: 0.95,
  caption: 'A bar as big as the health they had when you first saw them. Nothing lowers it; filling it is the match',
  run(ctx) {
    const fx = ctx.capture(() => new PassionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const foe = { x: ctx.w * 0.6, y: ctx.cy };
    const m = meter(0);
    let dead = false;
    loveTarget(ctx, foe, m, { alpha: () => (dead ? 0 : 1) });
    label(ctx, foe.x, foe.y + 32, 'bar max = 400, their health when first seen', PSN.wine);

    let stageSeen = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 6400 || dead) return;
      m.cur = Math.min(m.max, m.cur + m.max * (dt / 6400));
      const st = stageOf(m.cur / m.max);
      if (st > stageSeen) {
        stageSeen = st;
        tick(ctx, foe.x, foe.y - 52, ['', '💗 BLUSHING', '💓 SMITTEN', '💞 LOVESTRUCK'][st], PSN.deep);
        fx.hearts(foe.x, foe.y, 4 + st * 2, 22 + st * 6, PSN.blush, 620);
      }
    });

    ctx.at(6400, () => {
      m.cur = m.max;
      fx.charm(foe.x, foe.y);
      tick(ctx, foe.x, foe.y - 56, '💘 CHARMED', PSN.hot);
      ctx.at(400, () => { dead = true; });
    });
  },
};

export const theThreeStages: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'A quarter, a half, three quarters — a blush, a deeper one, then heart eyes. Flirt gains +5 at each',
  run(ctx) {
    stageIt(ctx);
    const rows: Array<{ at: number; flirt: number; note: string }> = [
      { at: 0.1, flirt: 30, note: 'no stage · Flirt 30' },
      { at: 0.32, flirt: 35, note: '💗 blushing · Flirt 35' },
      { at: 0.6, flirt: 40, note: '💓 smitten · Flirt 40' },
      { at: 0.86, flirt: 45, note: '💞 lovestruck · Flirt 45' },
    ];
    rows.forEach((r, i) => {
      const at = { x: ctx.w * (0.4 + i * 0.155), y: ctx.h * 0.52 };
      const m = meter(BAR_MAX * r.at);
      loveTarget(ctx, at, m);
      label(ctx, at.x, at.y + 34, r.note, i === 0 ? PSN.wine : PSN.pink);
    });
  },
};
