import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  PRESSURE, PressureAvatar, PressureFx, groundedCrater, painLockMark, painOrb, pressureBar, ventJet,
} from '../../../elements/kits/PressureVisuals';

/**
 * Pressure's showcases.
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

// ══ PASSIVE ════════════════════════════════════════════════════════════

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
    readout.setText(shell ? 'Shell-Shock: a 30+ hit frees them — and stuns them for 5s' : 'any hit knocks them loose');
    if (shell) float(ctx, victim.x, victim.y - 46, 'SHELL-SHOCKED', PRESSURE.amberLit, 12);
  });
}

export const slam: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'E — hold to charge, let go to slam: 10 to 40 in a 110px ring (160px at 50+). At 100 everyone hit is grounded for 3s',
  run(ctx) { slamRun(ctx, false); },
};

export const slamUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'E+ Shell-Shock — a grounded enemy hit by any 30+ Pressure ability is freed and stunned for 5 seconds',
  run(ctx) { slamRun(ctx, true); },
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
  const readout = label(ctx, ctx.w * 0.5, 14, hex(PRESSURE.steam), 11);
  let ventUntil = 0;
  let ventFrom = 0;
  const h = holdKey(ctx, av, {
    fromMs: 300, target: 100, rate: CHARGE_PER_SEC * 2, pose: 'charge',
    release: () => {
      h.bank = 100;
      readout.setText(depress ? 'Depressurize: 75+ banked — every hit +20% and a puff of steam' : 'a full bank: every other key charges 20% faster');
    },
  });
  if (depress) {
    ctx.at(3400, () => {
      av?.punch(ctx.aim);
      fx.punchHit(victim.x - 12, victim.y, ctx.aim, 50);
      fx.steamBurst(victim.x, victim.y, 60);
      float(ctx, victim.x, victim.y - 34, '-24', PRESSURE.steam);
    });
  }
  ctx.at(depress ? 4600 : 3600, () => {
    h.bank = 0;
    ventFrom = ctx.scene.time.now;
    ventUntil = ventFrom + 2400;
    av?.setHold('spray', ctx.aim);
    readout.setText('tap F: the jet — no abilities inside it, 15% slow at 50+, a stunning blast at 100');
  });
  ctx.onFrame((_dt, e) => {
    jet.clear();
    const now = ctx.scene.time.now;
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
  caption: 'F — hold to bank (3× slower; it keeps), tap to vent: steam that locks abilities, slows at 50+, and ends in a stunning blast at 100',
  run(ctx) { releaseRun(ctx, false); },
};

export const releaseUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'F+ Depressurize — with 75+ banked, every Pressure hit does 20% more and bursts steam: 6 damage and a 25% slow within 60px',
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
  caption: 'Q — 15 seconds of double-speed charging, glowing red and pouring steam. Then the boiler seizes: 3 seconds stunned',
  run(ctx) { exceedRun(ctx, false); },
};

export const exceedUpgraded: PreviewScript = {
  duration: 7400,
  scale: 0.9,
  caption: 'Q+ Overcharge — during Exceed every gauge runs on past 100, up to 125',
  run(ctx) { exceedRun(ctx, true); },
};
