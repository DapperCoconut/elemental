import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { LIGHT, LightAura, LightAvatar, LightFx, mixColor } from '../../../elements/kits/LightVisuals';

/**
 * Light's showcases.
 *
 * Light is the one element whose caster is never standing still, so almost every loop here runs
 * a small copy of the kit's own car integrator — the same 175 px/s² straightaway gain, the same
 * 3600 px/s² corner brake, the same 2.6π→1.1π turn rate — and paints the lance with the kit's
 * own `LightFx.drawLance`. Retuning the car in `LightKit` changes what these loops look like,
 * which is the point.
 *
 * Containment: every script sets `bodyTexture: ''` so the harness stages no body of its own,
 * adds one it can drive, and re-drives the rig from a frame hook (which runs after the
 * harness's pass). Anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture`.
 */

// ── The car ───────────────────────────────────────────────────────────

const CAR_MAX_SPEED = 620;
const CAR_MIN_COAST = 160;
const CAR_ACCEL_RATE = 175;
const CAR_TURN_BRAKE_RATE = 3600;
const CAR_BASE_TURN_RATE = Math.PI * 2.6;
const CAR_FAST_TURN_RATE = Math.PI * 1.1;
const STRAIGHT_THRESHOLD = 0.4;
const BOOST_TARGET_SPEED = CAR_MAX_SPEED / 3;

interface Car {
  x: number; y: number; angle: number; speed: number;
  boostUntil: number;
  /** 0–1 against whatever ceiling this loop is running. */
  ratio: number;
  maxSpeed: number;
  brakeMult: number;
  accelMult: number;
  enhanced: boolean;
}

/**
 * A car driving a lap of the box, with the rig, the lance layer and the real integrator.
 *
 * `aim` is where the cursor would be — the loop steers toward it every frame, so the meter
 * fills on the long sides and dumps in the corners exactly as it does in a match.
 */
function drive(
  ctx: PreviewCtx,
  o: { maxSpeed?: number; brakeMult?: number; accelMult?: number; startAngle?: number },
): { car: Car; av: BaseAvatar; fx: LightFx; air: Phaser.GameObjects.Graphics; ground: Phaser.GameObjects.Graphics } {
  const fx = ctx.capture(() => new LightFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  const car: Car = {
    x: ctx.cx, y: ctx.cy, angle: o.startAngle ?? 0, speed: CAR_MIN_COAST,
    boostUntil: 0, ratio: 0,
    maxSpeed: o.maxSpeed ?? CAR_MAX_SPEED,
    brakeMult: o.brakeMult ?? 1,
    accelMult: o.accelMult ?? 1,
    enhanced: false,
  };

  // The fighter is a half-scale sprite while driving, with the rig drawn around it.
  if (ctx.scene.textures.exists('elem-light')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-light').setDepth(5).setScale(0.5));
    ctx.onFrame(() => body.setPosition(car.x, car.y));
  }
  const av = ctx.useAvatar(() => new LightAvatar(ctx.scene, ctx.tint, 'player'));
  const lv = av instanceof LightAvatar ? av : null;
  ctx.onFrame((dt) => {
    av.setFacing(car.angle);
    lv?.setSpeed(car.ratio);
    lv?.setHold('ride', car.angle);
    av.update(dt, car.x, car.y, 1);
  });
  return { car, av, fx, air, ground };
}

/** One integrator step, run from a frame hook. Mirrors `LightKit.stepCar`. */
function stepCar(car: Car, desired: number, dt: number, elapsed: number): void {
  const dtS = dt / 1000;
  const diff = Phaser.Math.Angle.Wrap(desired - car.angle);
  const absDiff = Math.abs(diff);
  const speedRatio = car.speed / car.maxSpeed;
  const turnRate = CAR_BASE_TURN_RATE - (CAR_BASE_TURN_RATE - CAR_FAST_TURN_RATE) * speedRatio;
  car.angle += Phaser.Math.Clamp(diff, -turnRate * dtS, turnRate * dtS);
  if (absDiff < STRAIGHT_THRESHOLD) {
    car.speed = Math.min(car.maxSpeed, car.speed + CAR_ACCEL_RATE * car.accelMult * dtS);
  } else {
    car.speed = Math.max(CAR_MIN_COAST, car.speed - CAR_TURN_BRAKE_RATE * car.brakeMult * dtS * (absDiff / Math.PI));
  }
  if (elapsed < car.boostUntil) car.speed = Math.max(car.speed, BOOST_TARGET_SPEED);
  car.speed = Phaser.Math.Clamp(car.speed, 0, car.maxSpeed);
  car.x += Math.cos(car.angle) * car.speed * dtS;
  car.y += Math.sin(car.angle) * car.speed * dtS;
  car.ratio = car.speed / car.maxSpeed;
}

/** The lap the loop steers around: an oval that gives real straights and real corners. */
function lapPoint(ctx: PreviewCtx, elapsed: number, period = 4200): { x: number; y: number } {
  const a = (elapsed / period) * Math.PI * 2;
  return { x: ctx.w * 0.5 + Math.cos(a) * ctx.w * 0.3, y: ctx.cy + Math.sin(a) * ctx.h * 0.22 };
}

function dummy(ctx: PreviewCtx, x: number, y: number, scale = 1): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17 * scale);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13 * scale);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(x - 5 * scale, y - 4 * scale, 3.2 * scale);
    g.fillCircle(x + 5 * scale, y - 4 * scale, 3.2 * scale);
    return g;
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
}

/** The acceleration bar the kit puts under the health bars, restaged inside the box. */
function accelBar(ctx: PreviewCtx, car: Car): void {
  const w = 150, h = 7;
  const x = ctx.w * 0.5 - w / 2, y = 9;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(ctx.tint(LIGHT.shade), 0.9);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.lineStyle(1.5, ctx.tint(LIGHT.steel), 1);
    g.strokeRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(ctx.tint(mixColor(LIGHT.pale, LIGHT.red, car.ratio)), 1);
    g.fillRect(x, y, w * Phaser.Math.Clamp(car.ratio, 0, 1), h);
  });
}

/** Contact damage on the lance tip, at the kit's own formula and 250ms per-target lockout. */
function lanceContact(
  ctx: PreviewCtx, car: Car, fx: LightFx, targets: { x: number; y: number }[],
): void {
  const last = new Map<number, number>();
  ctx.onFrame((_dt, elapsed) => {
    const dist = car.enhanced ? 44 : 34;
    const lx = car.x + Math.cos(car.angle) * dist, ly = car.y + Math.sin(car.angle) * dist;
    targets.forEach((t, i) => {
      if (Phaser.Math.Distance.Between(lx, ly, t.x, t.y) > 30) return;
      if (elapsed - (last.get(i) ?? -9999) < 250) return;
      last.set(i, elapsed);
      const dmg = 6 + Math.round(100 * car.ratio * car.ratio);
      const col = mixColor(LIGHT.pale, LIGHT.red, car.ratio);
      fx.flare(t.x, t.y, 0.5 + car.ratio * 0.9, 11, col);
      fx.shards(t.x, t.y, 3 + Math.round(car.ratio * 7), {
        speed: 140 + car.ratio * 300, angle: car.angle, spread: 1.1,
        size: 10 + car.ratio * 12, color: col, depth: 10,
      });
      float(ctx, t.x, t.y - 24, `${dmg}`, car.ratio > 0.6 ? '#ff4422' : '#fff4a8', 12 + Math.round(car.ratio * 5));
    });
  });
}

// ══ CLICK — Light Lance ═══════════════════════════════════════════════

export const lightLance: PreviewScript = {
  duration: 8400,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Click — drive: 6 damage at a crawl, 106 at a full meter, 30px off the tip',
  run(ctx) {
    const { car, fx, air } = drive(ctx, {});
    accelBar(ctx, car);
    const marks = [
      { x: ctx.w * 0.5 + ctx.w * 0.3, y: ctx.cy },
      { x: ctx.w * 0.5 - ctx.w * 0.3, y: ctx.cy },
    ];
    for (const m of marks) dummy(ctx, m.x, m.y, 0.9);
    lanceContact(ctx, car, fx, marks);
    ctx.onFrame((dt, elapsed) => {
      const aim = lapPoint(ctx, elapsed + 700);
      stepCar(car, Math.atan2(aim.y - car.y, aim.x - car.x), dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
    });
  },
};

export const lightLanceUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Redline — the meter doubles to 1240 px/s, and past 3/4 a wall is 50 damage',
  run(ctx) {
    const { car, fx, air } = drive(ctx, { maxSpeed: CAR_MAX_SPEED * 2 });
    accelBar(ctx, car);
    const readout = label(ctx, ctx.w * 0.5, 26, '#ff3333', 10);

    // The danger vignette: the four screen edges tinting past 75% of the doubled meter.
    const vig = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame(() => {
      const a = car.ratio > 0.75 ? ((car.ratio - 0.75) / 0.25) * 0.4 : 0;
      vig.clear();
      readout.setText(a > 0 ? '⚠ REDLINE — walls now deal 50' : '');
      if (a <= 0) return;
      vig.fillStyle(ctx.tint(LIGHT.red), a);
      const t = 18;
      vig.fillRect(0, 0, ctx.w, t);
      vig.fillRect(0, ctx.h - t, ctx.w, t);
      vig.fillRect(0, 0, t, ctx.h);
      vig.fillRect(ctx.w - t, 0, t, ctx.h);
    });

    // A long straight to build on, then a wall at the end of it.
    let crashed = false;
    ctx.onFrame((dt, elapsed) => {
      const aim = { x: ctx.w + 400, y: ctx.cy };
      stepCar(car, Math.atan2(aim.y - car.y, aim.x - car.x), dt, elapsed);
      if (!crashed && car.x > ctx.w - 26) {
        crashed = true;
        if (car.ratio > 0.75) {
          fx.boom(car.x, car.y, 78, { color: LIGHT.red, shards: 12 });
          float(ctx, car.x - 60, car.y - 34, '💥 WALL CRASH −50', '#ff3333', 12);
        }
        car.speed = 0;
      }
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
    });
  },
};

// ══ E — Blink ═════════════════════════════════════════════════════════

export const blink: PreviewScript = {
  duration: 6000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'E — snap your heading to the cursor with no speed lost; 2 charges, 5s each',
  run(ctx) {
    const { car, av, fx, air } = drive(ctx, {});
    accelBar(ctx, car);
    let charges = 2;
    const mag = label(ctx, ctx.w * 0.5, 26, '#88ddff', 10);
    ctx.onFrame(() => mag.setText(`⚡ ${charges}/2 charges`));

    // Steering at a fixed heading, so what the blink changes is unmistakable.
    let desired = 0;
    ctx.onFrame((dt, elapsed) => {
      stepCar(car, desired, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      // Wrap rather than crash — this loop is about the corner, not the wall.
      if (car.x > ctx.w + 40) car.x = -40;
      if (car.x < -40) car.x = ctx.w + 40;
      if (car.y > ctx.h + 40) car.y = -40;
      if (car.y < -40) car.y = ctx.h + 40;
    });

    const doBlink = (delay: number, to: number): void => ctx.at(delay, () => {
      if (charges <= 0) return;
      charges--;
      ctx.at(5000, () => { charges = Math.min(2, charges + 1); });
      const before = Math.round(car.speed);
      desired = to;
      car.angle = to;
      car.boostUntil = 0;
      fx.flare(car.x, car.y, 0.8, 11, LIGHT.sky, to);
      fx.speedLines(car.x, car.y, to, 1, 8, LIGHT.sky);
      fx.shards(car.x, car.y, 5, { speed: 260, angle: to + Math.PI, spread: 0.7, size: 13, color: LIGHT.sky, depth: 9 });
      av.play('dash', to);
      float(ctx, car.x, car.y - 30, `⚡ BLINK — still ${before} px/s`, '#88ddff', 10);
    });
    doBlink(2200, Math.PI * 0.72);
    doBlink(4000, -Math.PI * 0.55);
  },
};

export const blinkUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Steam Charge — rooted, acceleration preserved; a 2s hold buys a 1.6s boost',
  run(ctx) {
    const { car, fx, air } = drive(ctx, {});
    accelBar(ctx, car);
    const readout = label(ctx, ctx.w * 0.5, 26, '#ff6622', 10);
    let holding = false;
    let holdStart = 0;

    ctx.onFrame((dt, elapsed) => {
      if (holding) {
        // Rooted: no movement and no drain. The meter is frozen where it was.
        readout.setText(`👁️ FOCUSING  ${((elapsed - holdStart) / 1000).toFixed(1)}s / 2.0s`);
      } else {
        readout.setText('');
        stepCar(car, car.angle, dt, elapsed);
      }
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      if (car.x > ctx.w + 40) car.x = -40;
    });

    ctx.at(1400, () => {
      holding = true;
      holdStart = 1400;
      fx.ring(car.x, car.y, 50, 12, LIGHT.glass, 340, 3, 8);
      const aura = ctx.capture(() => new LightAura(ctx.scene, ctx.tint, 'charge', 24, 4));
      let live = true;
      ctx.onFrame((dt, elapsed) => {
        if (!live) return;
        aura.setIntensity(Phaser.Math.Clamp((elapsed - holdStart) / 2000, 0, 1));
        aura.setAngle(car.angle);
        aura.update(dt, car.x, car.y, 1);
        // Steam every 130ms, reddening with the hold.
      });
      for (let i = 1; i <= 15; i++) {
        ctx.at(i * 130, () => fx.steam(car.x + Phaser.Math.Between(-6, 6), car.y - 16,
          Phaser.Math.Clamp((i * 130) / 2000, 0, 1)));
      }
      ctx.at(2000, () => {
        live = false;
        aura.destroy();
        holding = false;
        car.boostUntil = 3400 + 1600;   // a full 2s hold buys the maximum 1600ms window
        fx.flare(car.x, car.y, 1.8, 11, LIGHT.sky, car.angle);
        fx.speedLines(car.x, car.y, car.angle, 1.8, 8, LIGHT.sky);
        fx.boom(car.x, car.y, 110, { color: LIGHT.red, shards: 15, mark: false });
        float(ctx, car.x, car.y - 34, '🔥 STEAM RELEASE — 1.6s boost', '#ff6622', 11);
      });
    });
  },
};

// ══ R — Prism Ramp ════════════════════════════════════════════════════

export const prismRamp: PreviewScript = {
  duration: 8000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'R — a permanent ramp (max 5): ride it for a 1.5s boost and three 22°-spread lances',
  run(ctx) {
    const { car, av, fx, air, ground } = drive(ctx, {});
    accelBar(ctx, car);
    const ramps: { x: number; y: number; angle: number; used: boolean }[] = [];
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      for (const r of ramps) LightFx.drawRamp(ground, ctx.tint, r.x, r.y, r.angle, elapsed / 1000);
    });

    ctx.onFrame((dt, elapsed) => {
      const aim = lapPoint(ctx, elapsed + 700);
      stepCar(car, Math.atan2(aim.y - car.y, aim.x - car.x), dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      // Riding your own ramp: 34px trigger, boost, and the prism doing its one job.
      for (const r of ramps) {
        if (r.used || Phaser.Math.Distance.Between(car.x, car.y, r.x, r.y) > 34) continue;
        r.used = true;
        car.boostUntil = elapsed + 1500;
        fx.boom(r.x, r.y, 54, { color: LIGHT.cyan, shards: 8, mark: false });
        fx.flare(r.x, r.y, 0.8, 11, LIGHT.white, r.angle);
        float(ctx, car.x, car.y - 30, '⚡ RAMP BOOST', '#66ddff', 10);
        const dmg = 6 + Math.round(100 * car.ratio * car.ratio);
        for (let i = -1; i <= 1; i++) {
          const a = r.angle + i * Phaser.Math.DegToRad(22);
          ctx.fly({
            texture: 'proj-light-triangle',
            from: { x: r.x, y: r.y },
            to: { x: r.x + Math.cos(a) * 900, y: r.y + Math.sin(a) * 900 },
            speed: 520, pierce: true,
          });
        }
        float(ctx, r.x, r.y - 30, `3 × ${dmg}`, '#66ddff', 11);
        // Ramps come back after a beat so the loop keeps showing the ride.
        ctx.at(2200, () => { r.used = false; });
      }
    });

    const plant = (delay: number): void => ctx.at(delay, () => {
      if (ramps.length >= 5) ramps.shift();
      const x = car.x + Math.cos(car.angle) * 56, y = car.y + Math.sin(car.angle) * 56;
      ramps.push({ x, y, angle: car.angle, used: true });
      ctx.at(400, () => { const r = ramps.find((q) => q.x === x); if (r) r.used = false; });
      fx.flare(x, y, 0.7, 11, LIGHT.cyan, car.angle);
      fx.sparkle(x, y, 6, 26, 11, LIGHT.cyan);
      av.play('slam', car.angle);
      float(ctx, car.x, car.y - 30, '🔺 PRISM RAMP', '#88ddff', 10);
    });
    plant(500);
    plant(2600);
  },
};

export const prismRampUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Prism Drill — all your speed for a 900 px/s boring head that re-stuns every 0.5s',
  run(ctx) {
    const { car, fx, air, ground } = drive(ctx, {});
    accelBar(ctx, car);
    const ramp = { x: ctx.w * 0.52, y: ctx.cy, angle: 0 };
    const victim = { x: ctx.w * 0.84, y: ctx.cy };
    dummy(ctx, victim.x, victim.y, 0.9);
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      LightFx.drawRamp(ground, ctx.tint, ramp.x, ramp.y, ramp.angle, elapsed / 1000);
    });

    const drill = { x: 0, y: 0, angle: 0, speed: 0, live: false, biting: false };
    let fired = false;
    ctx.onFrame((dt, elapsed) => {
      air.clear();
      if (!fired) {
        stepCar(car, 0, dt, elapsed);
        LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
        if (Phaser.Math.Distance.Between(car.x, car.y, ramp.x, ramp.y) <= 34) {
          fired = true;
          // All of it, spent: 2–5 damage scaling with the ratio you paid in.
          const dmg = 2 + Math.round(3 * car.ratio);
          fx.flash(ramp.x, ramp.y, 26, 11, LIGHT.red);
          fx.beam(car.x, car.y, ramp.x, ramp.y, LIGHT.red, 9, 220);
          fx.shards(ramp.x, ramp.y, 8, { speed: 300, angle: 0, spread: 0.8, color: LIGHT.ember, depth: 10 });
          float(ctx, car.x, car.y - 30, '🔻 PRISM DRILL', '#ff4422', 11);
          ground.clear();
          car.speed = 0;
          car.ratio = 0;
          Object.assign(drill, { x: ramp.x, y: ramp.y, angle: 0, speed: 900, live: true });
          ctx.at(600, () => float(ctx, victim.x, victim.y - 26, `${dmg}`, '#ff4422', 13));
        }
        return;
      }
      if (!drill.live) return;
      drill.x += Math.cos(drill.angle) * drill.speed * (dt / 1000);
      if (!drill.biting && Phaser.Math.Distance.Between(drill.x, drill.y, victim.x, victim.y) <= 26) {
        drill.biting = true;
        drill.speed *= 0.1;
        fx.boom(victim.x, victim.y, 46, { color: LIGHT.red, shards: 7, mark: false, duration: 300 });
      }
      LightFx.drawDrill(air, ctx.tint, drill.x, drill.y, drill.angle, elapsed / 1000, drill.biting);
    });
    // A stun re-applied every half second for as long as it grinds.
    for (const d of [1400, 1900, 2400, 2900, 3400]) {
      ctx.at(d, () => { if (drill.biting) float(ctx, victim.x, victim.y - 38, '💫 STUN 0.5s', '#ffaa22', 10); });
    }
  },
};

// ══ F — Light Trick ═══════════════════════════════════════════════════

export const lightTrick: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — 5 damage in 50px, and a 1.2s boost only if it actually connects',
  run(ctx) {
    const { car, av, fx, air } = drive(ctx, {});
    accelBar(ctx, car);
    const near = { x: ctx.w * 0.55, y: ctx.cy };
    dummy(ctx, near.x, near.y, 0.9);
    ctx.onFrame((dt, elapsed) => {
      stepCar(car, 0, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      if (car.x > ctx.w + 40) { car.x = -40; car.speed = CAR_MIN_COAST; }
    });

    const trick = (delay: number): void => ctx.at(delay, () => {
      av.play('clap');
      fx.flash(car.x, car.y, 25, 9, LIGHT.pale);
      fx.ring(car.x, car.y, 10, 50, LIGHT.pale, 320, 4, 8);
      fx.sparkle(car.x, car.y, 7, 40, 11, LIGHT.glow);
      const hit = Phaser.Math.Distance.Between(car.x, car.y, near.x, near.y) <= 50;
      if (hit) {
        fx.shards(near.x, near.y, 4, { speed: 190, size: 11, color: LIGHT.pale, depth: 10 });
        float(ctx, near.x, near.y - 24, '5', '#fff4a8', 13);
        float(ctx, car.x, car.y - 30, '✨ LIGHT TRICK', '#fff4a8', 10);
      } else {
        float(ctx, car.x, car.y - 30, 'missed — no boost', '#77776a', 10);
      }
    });
    trick(700);
    trick(2400);
  },
};

export const lightTrickUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.88,
  bodyTexture: '',
  caption: 'Javelin Burst — a trick that catches a ramp fires 12 javelins instead of 3 lances',
  run(ctx) {
    const { car, av, fx, air, ground } = drive(ctx, {});
    accelBar(ctx, car);
    const ramp = { x: ctx.w * 0.5, y: ctx.cy, angle: 0 };
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      LightFx.drawRamp(ground, ctx.tint, ramp.x, ramp.y, ramp.angle, elapsed / 1000);
    });
    ctx.onFrame((dt, elapsed) => {
      stepCar(car, 0, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
    });

    ctx.at(1500, () => {
      av.play('clap');
      fx.flash(car.x, car.y, 25, 9, LIGHT.pale);
      fx.ring(car.x, car.y, 10, 50, LIGHT.pale, 320, 4, 8);
      // The burst catching the ramp: twelve javelins, evenly spaced, all the way round.
      fx.boom(ramp.x, ramp.y, 70, { color: LIGHT.cyan, shards: 12, mark: false });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fly({
          texture: 'proj-light-triangle',
          from: { x: ramp.x, y: ramp.y },
          to: { x: ramp.x + Math.cos(a) * 900, y: ramp.y + Math.sin(a) * 900 },
          speed: 480, pierce: true,
        });
      }
      car.boostUntil = 1500 + 1500;
      float(ctx, car.x, car.y - 34, '🌟 JAVELIN BURST', '#66ddff', 11);
      float(ctx, ramp.x, ramp.y - 34, '12 × 5', '#66ddff', 11);
    });
  },
};

// ══ Q — Speed 'O' Light ═══════════════════════════════════════════════

/** Both ultimate loops run the real 60ms bounce clock; Q+ is whether every 10th one sticks. */
function speedOLightScript(flare: boolean): PreviewScript {
  return {
    duration: 8600,
    scale: 0.5,
    bodyTexture: '',
    caption: flare
      ? "Flare-Stream — every 10th hop leaves a 35s beam that triples your acceleration"
      : "Q — 125 hops at 60ms, each leaving a 15-damage streak, all of it undodgeable",
    run(ctx) {
      const fx = ctx.capture(() => new LightFx(ctx.scene, ctx.tint).setSink(ctx.sink));
      const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      const pos = { x: ctx.cx, y: ctx.cy };
      if (ctx.scene.textures.exists('elem-light')) {
        const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-light').setDepth(5).setScale(0.5));
        ctx.onFrame(() => body.setPosition(pos.x, pos.y));
      }
      const av = ctx.useAvatar(() => new LightAvatar(ctx.scene, ctx.tint, 'player'));
      ctx.onFrame((dt) => av.update(dt, pos.x, pos.y, 1));
      const victim = { x: ctx.w * 0.5, y: ctx.cy };
      dummy(ctx, victim.x, victim.y, 0.9);
      const readout = label(ctx, ctx.w * 0.5, 12, '#fff4a8', 11);

      const streaks: { x1: number; y1: number; x2: number; y2: number; born: number; hit: boolean }[] = [];
      const beams: { x1: number; y1: number; x2: number; y2: number }[] = [];
      ctx.onFrame((_dt, elapsed) => {
        ground.clear();
        for (const b of beams) {
          LightFx.drawStreak(ground, ctx.tint, b.x1, b.y1, b.x2, b.y2, 18 * 0.8, LIGHT.ember, 0.7, elapsed / 1000);
        }
        for (let i = streaks.length - 1; i >= 0; i--) {
          const s = streaks[i];
          const life = 1 - (elapsed - s.born) / 900;
          if (life <= 0) { streaks.splice(i, 1); continue; }
          LightFx.drawStreak(ground, ctx.tint, s.x1, s.y1, s.x2, s.y2, 18, LIGHT.pale, 0.9 * life, elapsed / 1000);
        }
      });

      ctx.at(400, () => {
        av.play('raise', -Math.PI / 2, 900);
        fx.flare(pos.x, pos.y, 1.6, 12, LIGHT.white);
        fx.boom(pos.x, pos.y, 110, { color: LIGHT.pale, shards: 14, mark: false });
        float(ctx, pos.x, pos.y - 34, "💫 SPEED 'O' LIGHT", '#fff4a8', 12);

        // The real clock: 125 bounces, one every 60ms. The loop shows the first ~2 seconds.
        const margin = 24;
        let hops = 0, dealt = 0, accum = 0;
        ctx.onFrame((dt, now) => {
          if (hops >= 125) { readout.setText(`125 hops   —   ${dealt} dealt`); return; }
          accum += dt;
          while (accum >= 60 && hops < 125) {
            accum -= 60;
            hops++;
            const wall = Math.floor(Math.random() * 4);
            let nx = pos.x, ny = pos.y;
            if (wall === 0) { nx = margin + Math.random() * (ctx.w - margin * 2); ny = margin; }
            else if (wall === 1) { nx = margin + Math.random() * (ctx.w - margin * 2); ny = ctx.h - margin; }
            else if (wall === 2) { nx = margin; ny = margin + Math.random() * (ctx.h - margin * 2); }
            else { nx = ctx.w - margin; ny = margin + Math.random() * (ctx.h - margin * 2); }
            const s = { x1: pos.x, y1: pos.y, x2: nx, y2: ny, born: now, hit: false };
            streaks.push(s);
            fx.flare(nx, ny, 0.55, 12, LIGHT.white, Math.atan2(ny - pos.y, nx - pos.x));
            if (flare && hops % 10 === 0) beams.push({ x1: pos.x, y1: pos.y, x2: nx, y2: ny });
            // 15 damage inside 40px of the line, once per target per streak.
            const d = distToSeg(victim.x, victim.y, s.x1, s.y1, s.x2, s.y2);
            if (d <= 40) {
              dealt += 15;
              fx.flare(victim.x, victim.y, 0.7, 11, LIGHT.pale, Math.atan2(ny - s.y1, nx - s.x1));
              float(ctx, victim.x, victim.y - 22, '15', '#fff4a8', 11);
            }
            pos.x = nx;
            pos.y = ny;
          }
          readout.setText(`hop ${hops}/125   —   ${dealt} dealt${flare ? `   —   ${beams.length} beams` : ''}`);
        });
      });
    },
  };
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
}

export const speedOLight = speedOLightScript(false);
export const speedOLightUpgraded = speedOLightScript(true);

// ══ Passive ═══════════════════════════════════════════════════════════

export const passiveAccelMeter: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  bodyTexture: '',
  caption: '+175 px/s² on the straights, −3600 in the corners — and the lance is worth 6 to 106',
  run(ctx) {
    const { car, air } = drive(ctx, {});
    accelBar(ctx, car);
    const readout = label(ctx, ctx.w * 0.5, 26, '#fff4a8', 10);
    ctx.onFrame((dt, elapsed) => {
      const aim = lapPoint(ctx, elapsed + 700, 5200);
      const desired = Math.atan2(aim.y - car.y, aim.x - car.x);
      const absDiff = Math.abs(Phaser.Math.Angle.Wrap(desired - car.angle));
      stepCar(car, desired, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      readout.setText(
        `${Math.round(car.speed)} px/s   —   ${absDiff < STRAIGHT_THRESHOLD ? 'STRAIGHT +175' : 'CORNER −3600'}`
        + `   —   lance ${6 + Math.round(100 * car.ratio * car.ratio)}`,
      );
    });
  },
};

// ══ Perk — Flicker ════════════════════════════════════════════════════

export const perkFlicker: PreviewScript = {
  duration: 6600,
  scale: 0.88,
  bodyTexture: '',
  caption: 'Flicker — 3 charges on 3s, and the spot you left flares for 12 in 62px',
  run(ctx) {
    const { car, av, fx, air, ground } = drive(ctx, {});
    accelBar(ctx, car);
    dummy(ctx, ctx.w * 0.42, ctx.cy, 0.9);
    let charges = 3;
    const mag = label(ctx, ctx.w * 0.5, 26, '#fff4a8', 10);
    ctx.onFrame(() => mag.setText(`🕯️ ${charges}/3 charges  (3s each)`));

    // Afterimages: a hollow wedge of the car you were, tightening as its fuse runs down.
    const ghosts: { x: number; y: number; angle: number; born: number }[] = [];
    let desired = 0;
    ctx.onFrame((dt, elapsed) => {
      stepCar(car, desired, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      ground.clear();
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i];
        const k = Phaser.Math.Clamp((elapsed - gh.born) / 400, 0, 1);
        if (k >= 1) {
          ghosts.splice(i, 1);
          fx.flash(gh.x, gh.y, 31, 9, LIGHT.pale);
          fx.ring(gh.x, gh.y, 8, 62, LIGHT.glow, 300, 4, 8);
          fx.sparkle(gh.x, gh.y, 6, 50, 11, LIGHT.glow);
          float(ctx, gh.x, gh.y - 24, '12', '#ffffcc', 13);
          continue;
        }
        const cos = Math.cos(gh.angle), sin = Math.sin(gh.angle);
        const len = 18 * (1 - k * 0.35), wid = 10 * (1 - k * 0.35);
        ground.lineStyle(1.5 + k * 2, ctx.tint(LIGHT.pale), 0.35 + 0.5 * k);
        ground.beginPath();
        ground.moveTo(gh.x + cos * len, gh.y + sin * len);
        ground.lineTo(gh.x - cos * len * 0.7 - sin * wid, gh.y - sin * len * 0.7 + cos * wid);
        ground.lineTo(gh.x - cos * len * 0.7 + sin * wid, gh.y - sin * len * 0.7 - cos * wid);
        ground.closePath();
        ground.strokePath();
        ground.fillStyle(ctx.tint(LIGHT.glow), 0.15 + 0.45 * k * k);
        ground.fillCircle(gh.x, gh.y, 3 + 7 * k * k);
        ground.lineStyle(1, ctx.tint(LIGHT.glow), 0.5 * (1 - k));
        ground.strokeCircle(gh.x, gh.y, 62 * (1 - k * 0.75));
      }
      if (car.x > ctx.w + 40) car.x = -40;
    });

    // Blinking *away* is what puts the flare on somebody — the ghost is at the departure point.
    const doBlink = (delay: number, to: number): void => ctx.at(delay, () => {
      if (charges <= 0) return;
      charges--;
      ctx.at(3000, () => { charges = Math.min(3, charges + 1); });
      ghosts.push({ x: car.x, y: car.y, angle: car.angle, born: delay });
      desired = to;
      car.angle = to;
      fx.flare(car.x, car.y, 0.8, 11, LIGHT.sky, to);
      fx.speedLines(car.x, car.y, to, 1, 8, LIGHT.sky);
      av.play('dash', to);
    });
    doBlink(1600, -0.5);
    doBlink(3000, 0.5);
    doBlink(4400, -0.2);
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryUnstoppable: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Unstoppable — corners cost 35% of the usual speed, and no slow or stun sticks',
  run(ctx) {
    const { car, av, fx, air } = drive(ctx, { brakeMult: 0.35 });
    av.setMastered(true);
    accelBar(ctx, car);
    const readout = label(ctx, ctx.w * 0.5, 26, '#ffaa22', 10);

    // A stock car on the same lap, shown as a ghost bar, so the difference is a comparison.
    const stock: Car = { ...car, x: car.x, y: car.y, brakeMult: 1 };
    const stockBar = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    ctx.onFrame((dt, elapsed) => {
      const aim = lapPoint(ctx, elapsed + 700, 4200);
      stepCar(car, Math.atan2(aim.y - car.y, aim.x - car.x), dt, elapsed);
      stepCar(stock, Math.atan2(aim.y - stock.y, aim.x - stock.x), dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, false);
      stockBar.clear();
      stockBar.fillStyle(ctx.tint(LIGHT.steel), 0.85);
      stockBar.fillRect(ctx.w * 0.5 - 75, 19, 150 * Phaser.Math.Clamp(stock.ratio, 0, 1), 3);
      readout.setText(`mastered ${Math.round(car.speed)} px/s   vs   stock ${Math.round(stock.speed)} px/s`);
    });

    for (const d of [1800, 4200, 6600]) {
      ctx.at(d, () => {
        fx.ring(car.x, car.y, 10, 46, LIGHT.amber, 320, 3, 8);
        float(ctx, car.x, car.y - 30, 'SLOW IGNORED', '#ffaa22', 10);
      });
    }
  },
};

export const masteryKillerKebab: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Killer Kebab — 5s to spear up to 3, carried and disarmed, then rammed into a wall',
  run(ctx) {
    const { car, av, fx, air } = drive(ctx, {});
    av.setMastered(true);
    accelBar(ctx, car);
    const riders: { x: number; y: number; on: boolean }[] = [
      { x: ctx.w * 0.34, y: ctx.cy - 6, on: false },
      { x: ctx.w * 0.52, y: ctx.cy + 4, on: false },
      { x: ctx.w * 0.68, y: ctx.cy - 3, on: false },
    ];
    const rg = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let slammed = false;

    ctx.at(300, () => {
      car.enhanced = true;
      av.play('flex');
      fx.flare(car.x, car.y, 1.1, 12, LIGHT.amber, car.angle);
      fx.ring(car.x, car.y, 14, 62, LIGHT.amber, 420, 5, 9);
      fx.shards(car.x, car.y, 8, { speed: 220, size: 15, color: LIGHT.amber, depth: 11 });
      float(ctx, car.x, car.y - 40, '🍢 KILLER KEBAB', '#ffaa22', 12);
      const aura = ctx.capture(() => new LightAura(ctx.scene, ctx.tint, 'kebab', 28, 4));
      let live = true;
      ctx.onFrame((dt) => {
        if (!live) return;
        aura.setAngle(car.angle);
        aura.update(dt, car.x, car.y, 1);
      });
      // The window is 5s; after it the lance goes back to hitting rather than impaling.
      ctx.at(5000, () => { live = false; aura.destroy(); car.enhanced = false; });
    });

    ctx.onFrame((dt, elapsed) => {
      stepCar(car, 0, dt, elapsed);
      air.clear();
      LightFx.drawLance(air, ctx.tint, car.x, car.y, car.angle, car.ratio, elapsed / 1000, car.enhanced);
      rg.clear();

      // A stab during the window impales instead of damaging.
      const lx = car.x + Math.cos(car.angle) * 44, ly = car.y + Math.sin(car.angle) * 44;
      const carried = riders.filter((r) => r.on);
      for (const r of riders) {
        if (r.on || slammed || !car.enhanced) continue;
        if (Phaser.Math.Distance.Between(lx, ly, r.x, r.y) > 30 || carried.length >= 3) continue;
        r.on = true;
        fx.flare(r.x, r.y, 0.9, 12, LIGHT.amber);
        fx.shards(r.x, r.y, 6, { speed: 200, angle: car.angle, spread: 1.2, size: 13, color: LIGHT.amber, depth: 11 });
        float(ctx, r.x, r.y - 30, '🍢 SKEWERED', '#ffaa22', 11);
      }

      // Riders hang off the shaft nose to tail at 46 / 76 / 106px.
      const on = riders.filter((r) => r.on);
      on.forEach((r, i) => {
        const d = 46 + i * 30;
        r.x = car.x + Math.cos(car.angle) * d;
        r.y = car.y + Math.sin(car.angle) * d;
      });
      if (on.length > 0) {
        const len = 46 + (on.length - 1) * 30 + 26;
        LightFx.drawKebabShaft(air, ctx.tint, car.x, car.y, car.angle, len, car.ratio, elapsed / 1000);
      }
      for (const r of riders) {
        if (r.on) LightFx.drawSpike(air, ctx.tint, r.x, r.y, car.angle, elapsed / 1000);
        rg.fillStyle(0x2b2f3d, 1); rg.fillCircle(r.x, r.y, 15);
        rg.fillStyle(0x3c4254, 1); rg.fillCircle(r.x, r.y, 11);
        if (r.on) {
          rg.fillStyle(ctx.tint(LIGHT.hot), 0.35);
          rg.fillCircle(r.x, r.y, 9);
        }
      }

      // Ram the wall: every rider is torn off for 25 + 130 × ratio².
      if (!slammed && on.length > 0 && car.x > ctx.w - 30) {
        slammed = true;
        const dmg = 25 + Math.round(130 * car.ratio * car.ratio);
        for (const r of on) {
          fx.boom(r.x, r.y, 60 + car.ratio * 40, {
            color: mixColor(LIGHT.amber, LIGHT.red, car.ratio), shards: 8 + Math.round(car.ratio * 8), mark: false,
          });
          float(ctx, r.x, r.y - 26, `${dmg}`, '#ff6622', 15);
          r.on = false;
        }
        fx.flare(car.x, car.y, 1.3, 12, LIGHT.red, car.angle);
        fx.ring(car.x, car.y, 16, 90, LIGHT.red, 400, 5, 9);
        float(ctx, car.x - 70, car.y - 44, `💥 KEBAB SLAM ${dmg}`, '#ff6622', 12);
        car.speed = 0;
      }
    });
  },
};
