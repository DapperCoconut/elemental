import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  PRESSURE, PressureAvatar, PressureFx, gasCloud, gasFissure, gasPuddle, gasWisps,
  groundedCrater, painLockMark, painOrb, pressureBar, ventJet,
} from '../../../elements/kits/PressureVisuals';

/**
 * Gas's showcases (id `pressure`).
 *
 * Each loop holds a key for real — the rig braces, the gauge on the gauntlet climbs, the bar under
 * the robot fills at the kit's rate — and lets go into the kit's own painters and `PressureFx`.
 * Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const CHARGE_PER_SEC = 100 / 6;
const SLAM_R = 110;
const SLAM_R_50 = 160;
const ORB_SPEED = 85;
const ORB_SPEED_100 = 150;
const VENT_LEN = 230;
const VENT_LEN_100 = 260;
const CLOUD_R = 44;
const BLAST_R = 210;
const CHAIN_DELAY_MS = 110;
const SPARK_RANGE = 96;
const PUDDLE_R = 52;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): PressureFx {
  return ctx.capture(() => new PressureFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The robot's rig, or null when a skin has replaced the character. */
function robot(av: unknown): PressureAvatar | null {
  return av instanceof PressureAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#141518', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

interface Hold {
  /** Live pressure, read every frame. */
  level(): number;
  /** Bank shown under the bar (Release). */
  bank: number;
}

/**
 * Hold a key from `fromMs` until the gauge reads `target`, painting the bar and the gauntlet; the
 * hold lets go by itself and calls `release(level)`.
 */
function holdKey(
  ctx: PreviewCtx, av: PressureAvatar | null, o: {
    fromMs: number; target: number; rate?: number; pose?: 'brace' | 'charge'; max?: number;
    release: (level: number) => void;
  },
): Hold {
  const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const rate = o.rate ?? CHARGE_PER_SEC;
  let level = 0;
  let holding = false;
  let done = false;
  const h: Hold = { level: () => level, bank: 0 };
  ctx.at(o.fromMs, () => { holding = true; av?.setHold(o.pose ?? 'charge', ctx.aim); });
  ctx.onFrame((dt, e) => {
    bar.clear();
    if (holding && !done) {
      level = Math.min(o.target, level + rate * dt / 1000);
      av?.setCharge(level);
      if (level >= o.target - 0.01) {
        done = true;
        holding = false;
        av?.setHold(null);
        av?.setCharge(0);
        o.release(level);
      }
    }
    const c = ctx.casterAt();
    if (holding || h.bank > 0) pressureBar(bar, ctx.tint, c.x, c.y + 30, holding ? level : 0, o.max ?? 100, h.bank, 1, e / 1000);
  });
  return h;
}

function dummy(ctx: PreviewCtx, at: { x: number; y: number }, tells?: () => { lock?: boolean; grounded?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const veil = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
  ctx.onFrame((_dt, e) => {
    g.clear();
    veil.clear();
    const t = tells?.();
    if (t?.grounded) groundedCrater(g, ctx.tint, at.x, at.y, 1.3, 1);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    if (t?.lock) painLockMark(veil, ctx.tint, at.x, at.y, e / 1000, 0.9);
  });
}

// ── Gas staging ───────────────────────────────────────────────────────

interface StageCloud { x: number; y: number; seed: number; born: number; litAt: number; blown: boolean }

/**
 * A field of gas clouds painted with the kit's painters. `light(i)` starts the chain at cloud `i`:
 * it blows, and each cloud near enough is lit 0.11s after the one that lit it.
 */
function gasField(ctx: PreviewCtx, fx: PressureFx): {
  add: (x: number, y: number) => void; light: (i: number) => void; count: () => number;
} {
  const under = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
  const clouds: StageCloud[] = [];
  let now = 0;
  const blow = (c: StageCloud): void => {
    c.blown = true;
    fx.gasExplosion(c.x, c.y, BLAST_R);
    for (const o of clouds) {
      if (o.blown || o.litAt > 0 || Math.hypot(o.x - c.x, o.y - c.y) > BLAST_R) continue;
      o.litAt = now;
    }
  };
  ctx.onFrame((_dt, e) => {
    now = e;
    under.clear();
    over.clear();
    for (const c of clouds) {
      if (c.blown) continue;
      if (c.litAt > 0 && e - c.litAt >= CHAIN_DELAY_MS) { blow(c); continue; }
      const fade = Math.min(1, (e - c.born) / 350);
      const primed = c.litAt > 0 ? Math.max(0.15, (e - c.litAt) / CHAIN_DELAY_MS) : 0;
      gasCloud(under, ctx.tint, c.x, c.y, CLOUD_R, c.seed, e / 1000, fade, primed);
      gasWisps(over, ctx.tint, c.x, c.y, CLOUD_R, c.seed, e / 1000, fade);
    }
  });
  return {
    add: (x, y) => { clouds.push({ x, y, seed: clouds.length * 1.37, born: now, litAt: 0, blown: false }); },
    light: (i) => { const c = clouds[i]; if (c && !c.blown && c.litAt === 0) c.litAt = now; },
    count: () => clouds.filter((c) => !c.blown).length,
  };
}

// ══ PASSIVE ════════════════════════════════════════════════════════════

export const gasPassive: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Gas — 1.5s stood in your gas and they panic: running at random, 5 damage a second. Hold a key at 100 and the sparks off your back blow the clouds up, one lighting the next',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
    const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.gasLit), 11);
    // The gas lies behind the robot (to its left); it aims right, so its back is to it.
    av?.setFacing(ctx.aim);
    const c0 = { x: ctx.cx + 290, y: ctx.cy };
    ctx.moveCaster(c0.x, c0.y);
    const field = gasField(ctx, fx);
    for (let i = 0; i < 4; i++) field.add(c0.x - 80 - i * 68, c0.y + (i % 2 ? 16 : -14));
    // A dummy stood in the far cloud.
    const home = { x: c0.x - 80 - 3 * 68, y: c0.y + 16 };
    const victim = { x: home.x, y: home.y };
    let panicUntil = 0;
    let runAng = 0;
    let runUntil = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, e) => {
      g.clear();
      if (e < panicUntil) {
        if (e >= runUntil) { runAng = Math.random() * Math.PI * 2; runUntil = e + 260; }
        victim.x = Phaser.Math.Clamp(victim.x + Math.cos(runAng) * 150 * dt / 1000, home.x - 26, home.x + 60);
        victim.y = Phaser.Math.Clamp(victim.y + Math.sin(runAng) * 150 * dt / 1000, home.y - 50, home.y + 40);
        for (let i = 0; i < 3; i++) {
          const a = e / 200 + i * 2.1;
          g.fillStyle(ctx.tint(PRESSURE.gasLit), 0.55);
          g.fillCircle(victim.x + Math.cos(a) * 15, victim.y - 24 + Math.sin(a) * 5, 3.2);
        }
      }
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(victim.x, victim.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(victim.x, victim.y, 13);
      g.fillStyle(0x8e97ad, 0.9); g.fillCircle(victim.x - 5, victim.y - 4, 3.2); g.fillCircle(victim.x + 5, victim.y - 4, 3.2);
    });
    ctx.at(200, () => readout.setText('stood in the gas…'));
    ctx.at(1700, () => {
      panicUntil = 1700 + 1600;
      fx.panicStart(victim.x, victim.y);
      readout.setText('1.5s: panic — running at random, 5 damage a second');
      for (let i = 0; i < 4; i++) ctx.at(1700 + 400 * (i + 1), () => float(ctx, victim.x, victim.y - 34, '-2', PRESSURE.gasLit));
    });
    // Then the robot holds a key to 100 and the sparks come out of its back.
    let sparking = false;
    let nextSpark = 0;
    let lit = false;
    holdKey(ctx, av, {
      fromMs: 3600, target: 100, pose: 'brace', rate: CHARGE_PER_SEC * 3,
      release: () => { sparking = true; av?.setHold('brace', ctx.aim); readout.setText('held at 100: sparks out of your back'); },
    });
    ctx.onFrame((_dt, e) => {
      if (!sparking || e < nextSpark) return;
      nextSpark = e + 200;
      const c = ctx.casterAt();
      const back = ctx.aim + Math.PI;
      fx.sparks(c.x + Math.cos(back) * 16, c.y + Math.sin(back) * 16, back, SPARK_RANGE);
      if (!lit && e > 6100) {
        lit = true;
        field.light(0);
        readout.setText('one cloud lights the next: 18, then 6 a blast');
        ctx.at(e + 500, () => float(ctx, victim.x, victim.y - 34, '-18', PRESSURE.fire, 12));
        ctx.at(e + 1100, () => { sparking = false; av?.setHold(null); });
      }
    });
  },
};

export const pressureGauge: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Pressure — hold a key and the bar under you climbs 0 → 100 over 6 seconds. 50 and 100 each add something. Let go to spend it',
  run(ctx) {
    const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
    av?.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.amberLit), 11);
    const h = holdKey(ctx, av, { fromMs: 300, target: 100, pose: 'brace', release: () => readout.setText('100 — let go') });
    ctx.onFrame(() => { if (h.level() > 0 && h.level() < 100) readout.setText(`${Math.round(h.level())} pressure`); });
  },
};

// ══ Click — Pressure Punch ═════════════════════════════════════════════

function punchRun(ctx: PreviewCtx, gear: boolean): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const victim = { x: ctx.cx + 200, y: ctx.cy };
  dummy(ctx, victim);
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.amberLit), 11);
  const startAt = gear ? 60 : 0;
  const lunge = 90 + (Math.min(100, Math.max(50, startAt + 60)) - 50) * 0.8;
  holdKey(ctx, av, {
    fromMs: 300, target: gear ? 100 : 60, pose: 'brace',
    rate: gear ? (100 - startAt) / 2.4 : CHARGE_PER_SEC,
    release: (p) => {
      readout.setText(p >= 100 ? 'at 100: lunge, 50 damage and a 1.2s stun' : `at ${Math.round(p)}: lunge, ${Math.round(8 + 0.32 * p)} damage and a 40% slow`);
      const from = ctx.casterAt();
      const to = { x: Math.min(victim.x - 52, from.x + lunge), y: from.y };
      fx.lungeBurst(from.x, from.y, ctx.aim);
      av?.punch(ctx.aim);
      ctx.glideCaster({ to, ms: 140, ease: 'out', onDone: () => {
        fx.punchHit(victim.x - 12, victim.y, ctx.aim, p);
        float(ctx, victim.x, victim.y - 34, `-${Math.round(8 + 0.32 * p + (p >= 100 ? 10 : 0))}`, PRESSURE.amberLit);
      } });
    },
  });
  if (gear) ctx.at(200, () => readout.setText('Pressure-gear: the punch starts at 60 — wound while you waited'));
}

export const punch: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'Click — hold to wind the gauntlet up, let go to punch. 50+: a lunge and a 40% slow. 100: a stun instead',
  run(ctx) { punchRun(ctx, false); },
};

export const punchUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Click+ Pressure-gear — the gauntlet winds itself up 5 a second while you are not holding it. The next punch starts there',
  run(ctx) { punchRun(ctx, true); },
};

// ══ E — Seismic Slam ═══════════════════════════════════════════════════

function slamVentRun(ctx: PreviewCtx): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.gasLit), 11);
  const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(3.1));
  const field = gasField(ctx, fx);
  let vent: { x: number; y: number; puffedAt: number } | null = null;
  let puffs = 0;
  let nextPuff = 0;
  holdKey(ctx, av, {
    fromMs: 300, target: 60, rate: CHARGE_PER_SEC * 2.4,
    release: (p) => {
      av?.play('slam', Math.PI / 2);
      const c = ctx.casterAt();
      fx.slam(c.x, c.y + 6, p >= 50 ? SLAM_R_50 : SLAM_R, p);
      fx.fissureOpen(c.x, c.y + 6);
      vent = { x: c.x, y: c.y + 6, puffedAt: 0 };
      readout.setText('Gas Vents: the slam splits the floor — a gas cloud every 1.3s for 20s');
    },
  });
  // Step off the vent so it can be seen breathing.
  ctx.at(2400, () => ctx.glideCaster({ to: { x: ctx.cx + 150, y: ctx.cy - 20 }, ms: 700, ease: 'out' }));
  const offs = [[-62, -30], [58, 34], [-20, 62], [70, -44]];
  ctx.onFrame((_dt, e) => {
    floor.clear();
    if (!vent) return;
    if (nextPuff === 0) nextPuff = e + 500;
    if (e >= nextPuff && puffs < offs.length) {
      nextPuff = e + 1300;
      vent.puffedAt = e;
      field.add(vent.x + offs[puffs][0], vent.y + offs[puffs][1]);
      puffs++;
    }
    gasFissure(floor, ctx.tint, vent.x, vent.y, 1.1, e / 1000, 1, Math.max(0, 1 - (e - vent.puffedAt) / 500));
  });
}

function slamRun(ctx: PreviewCtx, shell: boolean): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const victim = { x: ctx.cx + 120, y: ctx.cy + 10 };
  let grounded = false;
  dummy(ctx, victim, () => ({ grounded }));
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.amberLit), 11);
  holdKey(ctx, av, {
    fromMs: 300, target: 100, rate: CHARGE_PER_SEC * 2,
    release: (p) => {
      av?.play('slam', Math.PI / 2);
      const c = ctx.casterAt();
      fx.slam(c.x, c.y + 6, p >= 50 ? SLAM_R_50 : SLAM_R, p);
      fx.groundImpact(victim.x, victim.y);
      grounded = true;
      float(ctx, victim.x, victim.y - 34, '-40', PRESSURE.amberLit);
      readout.setText('100: driven into the floor for 3s — still able to attack, freed by any hit');
    },
  });
  ctx.at(4400, () => {
    av?.punch(ctx.aim);
    fx.punchHit(victim.x - 12, victim.y, ctx.aim, 35);
    grounded = false;
    fx.groundBreak(victim.x, victim.y);
    void shell;
    readout.setText('any hit knocks them loose');
  });
}

export const slam: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'E — hold to charge, let go to slam: 10 to 40 in a 110px ring (160px at 50+). At 100 everyone hit is grounded for 3s',
  run(ctx) { slamRun(ctx, false); },
};

export const slamUpgraded: PreviewScript = {
  duration: 8800,
  scale: 0.9,
  caption: 'E+ Gas Vents — the slam splits the floor. The vent breathes out a gas cloud every 1.3s for 20 seconds; up to three vents at once',
  run(ctx) { slamVentRun(ctx); },
};

// ══ R — Pressure Point ═════════════════════════════════════════════════

function pointRun(ctx: PreviewCtx, compress: boolean): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const victim = { x: ctx.cx + 300, y: ctx.cy };
  let locked = false;
  if (!compress) dummy(ctx, victim, () => ({ lock: locked }));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.painCore), 11);
  let orb: { x: number; y: number; vx: number; r: number } | null = null;
  holdKey(ctx, av, {
    fromMs: 300, target: 100, rate: CHARGE_PER_SEC * 2.5,
    release: (p) => {
      const c = ctx.casterAt();
      av?.play('punch', ctx.aim);
      orb = { x: c.x + 26, y: c.y, vx: compress ? ORB_SPEED : ORB_SPEED_100, r: p >= 100 ? 22 : 14 };
      fx.orbLaunch(orb.x, orb.y);
      readout.setText(compress ? 'Compression Charge: walk into your own orb' : 'PainLock: every ability they use stuns them and costs them health');
    },
  });
  ctx.onFrame((dt, e) => {
    g.clear();
    if (!orb) return;
    orb.x += orb.vx * dt / 1000;
    painOrb(g, ctx.tint, orb.x, orb.y, orb.r, e / 1000, 1);
    if (!compress && orb.x >= victim.x - 20) {
      fx.orbHit(victim.x, victim.y);
      float(ctx, victim.x, victim.y - 34, '-20', PRESSURE.pain);
      orb = null;
      locked = true;
      ctx.at(e + 900, () => { fx.painJolt(victim.x, victim.y); float(ctx, victim.x, victim.y - 46, 'PAIN -8', PRESSURE.pain); });
    }
  });
  if (compress) {
    ctx.at(3000, () => ctx.glideCaster({ to: { x: ctx.cx + 150, y: ctx.cy }, ms: 900, ease: 'linear', onDone: () => {
      const c = ctx.casterAt();
      orb = null;
      fx.compress(c.x, c.y);
      float(ctx, c.x, c.y - 50, 'COMPRESSED +30%', PRESSURE.amber, 12);
    } }));
  }
}

export const point: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'R — a slow orb of pain: 6 to 20 damage and PainLock for 3 to 10s. Each ability they use stuns them (0.3s, 0.5s at 50+) and costs 5 (8 at 100)',
  run(ctx) { pointRun(ctx, false); },
};

export const pointUpgraded: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'R+ Compression Charge — your orb can hit you: every ability costs you 5–8, but everything charges 15–30% faster, ×2 for 1s after you are hurt',
  run(ctx) { pointRun(ctx, true); },
};

// ══ F — Release ════════════════════════════════════════════════════════

function releaseRun(ctx: PreviewCtx, depress: boolean): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const victim = { x: ctx.cx + 170, y: ctx.cy };
  dummy(ctx, victim);
  const jet = ctx.adopt(ctx.scene.add.graphics().setDepth(5.8));
  const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(3.1));
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.steam), 11);
  const field = gasField(ctx, fx);
  let ventUntil = 0;
  let ventFrom = 0;
  let nextCloud = 0;
  let laid = 0;
  let puddle = false;
  const h = holdKey(ctx, av, {
    fromMs: 300, target: 100, rate: CHARGE_PER_SEC * 2, pose: 'charge',
    release: () => {
      h.bank = 100;
      readout.setText(depress ? 'Depressurize: 75+ banked — every hit +20% and a gas puddle that never fades' : 'a full bank: every other key charges 20% faster');
    },
  });
  if (depress) {
    ctx.at(3400, () => {
      av?.punch(ctx.aim);
      fx.punchHit(victim.x - 12, victim.y, ctx.aim, 50);
      fx.puddleDrop(victim.x, victim.y, PUDDLE_R);
      puddle = true;
      float(ctx, victim.x, victim.y - 34, '-24', PRESSURE.steam);
    });
  }
  ctx.at(depress ? 4600 : 3600, () => {
    h.bank = 0;
    ventFrom = ctx.scene.time.now;
    ventUntil = ventFrom + 2400;
    av?.setHold('spray', ctx.aim);
    readout.setText('tap F: the jet — no abilities inside it, and gas clouds left hanging all along it');
  });
  ctx.onFrame((_dt, e) => {
    jet.clear();
    floor.clear();
    if (puddle) gasPuddle(floor, ctx.tint, victim.x, victim.y, PUDDLE_R, 0.7, e / 1000, 1);
    const now = ctx.scene.time.now;
    if (now < ventUntil && e >= nextCloud) {
      nextCloud = e + 230;
      const c = ctx.casterAt();
      const u = 0.28 + ((laid * 0.37) % 0.72);
      const side = ((laid % 3) - 1) * 22 * u;
      field.add(c.x + 18 + Math.cos(ctx.aim) * VENT_LEN_100 * u - Math.sin(ctx.aim) * side, c.y + Math.sin(ctx.aim) * VENT_LEN_100 * u + Math.cos(ctx.aim) * side);
      laid++;
    }
    if (now >= ventUntil) {
      if (ventUntil > 0) {
        const c = ctx.casterAt();
        av?.setHold(null);
        fx.ventBlast(c.x + 18, c.y, ctx.aim, VENT_LEN_100, 70);
        float(ctx, victim.x, victim.y - 40, 'STUNNED', PRESSURE.amberLit);
        ventUntil = 0;
      }
      return;
    }
    const c = ctx.casterAt();
    ventJet(jet, ctx.tint, c.x + 18, c.y, ctx.aim, h.bank > 0 ? VENT_LEN : VENT_LEN_100, 70, e / 1000, 1, true);
  });
}

export const release: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'F — hold to bank (3× slower; it keeps), tap to vent: a jet of gas that locks abilities, slows at 50+, ends in a stunning blast at 100 — and leaves clouds all along it',
  run(ctx) { releaseRun(ctx, false); },
};

export const releaseUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'F+ Depressurize — with 75+ banked, every hit does 20% more and leaves a gas puddle under the target: see-through, and it never fades',
  run(ctx) { releaseRun(ctx, true); },
};

// ══ Q — Exceed ═════════════════════════════════════════════════════════

function exceedRun(ctx: PreviewCtx, over: boolean): void {
  const fx = fxOf(ctx);
  const av = robot(ctx.useAvatar(() => new PressureAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.hot), 11);
  ctx.at(300, () => {
    const c = ctx.casterAt();
    av?.play('raise');
    av?.setExceed(true);
    fx.exceedOn(c.x, c.y);
    readout.setText('EXCEED: every key charges twice as fast');
  });
  holdKey(ctx, av, {
    fromMs: 1100, target: over ? 125 : 100, rate: CHARGE_PER_SEC * 2, max: over ? 125 : 100, pose: 'brace',
    release: (p) => {
      av?.punch(ctx.aim);
      const c = ctx.casterAt();
      fx.punchHit(c.x + 60, c.y, ctx.aim, p);
      readout.setText(over ? 'Overcharge: 125 — everything keeps scaling' : '100 in three seconds');
    },
  });
  ctx.at(over ? 5400 : 5000, () => {
    const c = ctx.casterAt();
    av?.setExceed(false);
    fx.exceedCrash(c.x, c.y);
    float(ctx, c.x, c.y - 50, 'OVERHEATED', PRESSURE.steelLit, 13);
    readout.setText('when it ends: stunned for 3 seconds');
  });
}

export const exceed: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Q — 15 seconds of double-speed charging, glowing red and pouring smog. Then the boiler seizes: 3 seconds stunned',
  run(ctx) { exceedRun(ctx, false); },
};

export const exceedUpgraded: PreviewScript = {
  duration: 7400,
  scale: 0.9,
  caption: 'Q+ Overcharge — during Exceed every gauge runs on past 100, up to 125',
  run(ctx) { exceedRun(ctx, true); },
};
