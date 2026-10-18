import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  RAD, RadiationAvatar, RadiationFx, barrageCone, bunkerTurret, doseCells, dropFootprint, dummyLink,
  falloutBunker, falloutPuddle, flareRound, geigerTracer, lockReticle, testDummy, trefoil, uraniumRod,
  xrayOutline,
} from '../../../elements/kits/RadiationVisuals';

/**
 * Radiation's showcases.
 *
 * Nothing this element puts in the world is a sprite — tracers, flares, the cone, the bunker and
 * the rod are all data the kit repaints into Graphics layers every frame, so there is no
 * `proj-radiation` for `ctx.fly` to carry and these loops mirror the kit's own stepping instead.
 * Every painter here is the real one: `geigerTracer` and `flareRound` for rounds in the air,
 * `barrageCone`/`lockReticle` for the E, `falloutBunker` for the R, `uraniumRod` for the F,
 * `dropFootprint` for the Q's tell, and the one-shots through a real `RadiationFx` with a sticky
 * sink.
 */

// ── Staging ───────────────────────────────────────────────────────────

const TRACER_SPEED = 950;
const FLARE_SPEED = 1350;

function fxOf(ctx: PreviewCtx): RadiationFx {
  return ctx.capture(() => new RadiationFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function dummyAt(ctx: PreviewCtx, at: { x: number; y: number; scale?: number }, depth = 4): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    const s = at.scale ?? 1;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17 * s);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13 * s);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5 * s, at.y - 4 * s, 3.2 * s); g.fillCircle(at.x + 5 * s, at.y - 4 * s, 3.2 * s);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6 * s, at.y - 4 * s, 1.6 * s); g.fillCircle(at.x + 4.4 * s, at.y - 4 * s, 1.6 * s);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(22));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(22));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The lead-suited sniper, or null when a skin has replaced the character. */
function suit(av: unknown): RadiationAvatar | null {
  return av instanceof RadiationAvatar ? av : null;
}

/** The kit's row of filled/empty lozenges — the one counter shape the element uses everywhere. */
function pips(
  ctx: PreviewCtx, g: Phaser.GameObjects.Graphics,
  x: number, y: number, filled: number, total: number, glow: number,
): void {
  const w = 8, gap = 3;
  const span = total * w + (total - 1) * gap;
  for (let i = 0; i < total; i++) {
    const px = x - span / 2 + w / 2 + i * (w + gap);
    const on = i < filled;
    g.fillStyle(ctx.tint(RAD.ink), 0.75);
    g.fillRect(px - w / 2 - 1, y - 4, w + 2, 8);
    g.fillStyle(ctx.tint(on ? RAD.neon : RAD.leadDeep), on ? 0.55 + glow * 0.45 : 0.85);
    g.fillRect(px - w / 2, y - 3, w, 6);
    if (on) {
      g.fillStyle(ctx.tint(RAD.core), 0.5 + glow * 0.5);
      g.fillRect(px - w / 2 + 1.6, y - 1.4, w - 3.2, 2.8);
    }
  }
}

/** The trefoil and draining bar the kit hangs over anybody carrying a dose. */
function doseMarker(ctx: PreviewCtx, at: { x: number; y: number }, read: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const left = read();
    if (left <= 0) return;
    const t = elapsed / 1000;
    trefoil(g, ctx.tint, at.x, at.y - 34, 6.5, 0.55 + 0.35 * Math.sin(t * 5),
      { phase: t * 1.6, color: RAD.neonLit });
    g.fillStyle(ctx.tint(RAD.neonDeep), 0.5);
    g.fillRect(at.x - 15, at.y - 26, 30, 2.4);
    g.fillStyle(ctx.tint(RAD.neon), 0.95);
    g.fillRect(at.x - 15, at.y - 26, 30 * Phaser.Math.Clamp(left, 0, 1), 2.4);
  });
}

/**
 * A round in the air, stepped at its real px/s exactly as `updateRounds` steps it. Returns
 * nothing — it reports through `onLand` (a body was in the way) or `onMiss` (it ran out of range).
 */
function shoot(
  ctx: PreviewCtx, g: Phaser.GameObjects.Graphics,
  o: {
    kind: 'tracer' | 'flare';
    from: { x: number; y: number };
    ang: number;
    target: { x: number; y: number } | null;
    range: number;
    onLand?: () => void;
    onMiss?: () => void;
  },
  live: { x: number; y: number; ang: number; kind: 'tracer' | 'flare'; done: boolean }[],
): void {
  const speed = o.kind === 'tracer' ? TRACER_SPEED : FLARE_SPEED;
  const hitR = (o.kind === 'tracer' ? 17 : 15) + 18;
  const r = { x: o.from.x, y: o.from.y, ang: o.ang, kind: o.kind, done: false };
  live.push(r);
  let left = o.range;
  void g;
  ctx.onFrame((dt) => {
    if (r.done) return;
    const s = dt / 1000;
    const step = speed * s;
    r.x += Math.cos(o.ang) * step;
    r.y += Math.sin(o.ang) * step;
    left -= step;
    if (o.target && Phaser.Math.Distance.Between(r.x, r.y, o.target.x, o.target.y) <= hitR) {
      r.done = true;
      o.onLand?.();
      return;
    }
    if (left <= 0 || r.x < 8 || r.x > ctx.w - 8 || r.y < 8 || r.y > ctx.h - 8) {
      r.done = true;
      o.onMiss?.();
    }
  });
}

/** Paints whatever is currently in the air. One layer, shared by every loop that shoots. */
function airLayer(
  ctx: PreviewCtx,
  live: { x: number; y: number; ang: number; kind: 'tracer' | 'flare'; done: boolean }[],
): Phaser.GameObjects.Graphics {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const t = elapsed / 1000;
    for (const r of live) {
      if (r.done) continue;
      if (r.kind === 'flare') flareRound(g, ctx.tint, r.x, r.y, r.ang, 1, t);
      else geigerTracer(g, ctx.tint, r.x, r.y, r.ang + t * 9, 1, { lamp: 0.5 });
    }
  });
  return g;
}

// ══ CLICK — Radiation Railgun ═════════════════════════════════════════

export const railgun: PreviewScript = {
  duration: 12000,
  scale: 0.83,
  caption: 'Click — three tracers confirm a 50-damage hitscan; one that hits nothing scrubs them all',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const muzzle = { x: ctx.cx + 18, y: ctx.cy - 2 };
    const victim = { x: ctx.cx + 380, y: ctx.cy - 8 };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 10; });

    const live: { x: number; y: number; ang: number; kind: 'tracer' | 'flare'; done: boolean }[] = [];
    airLayer(ctx, live);
    // The tracers clamped to the body: orbiting, blinking, with the pips over the head.
    const stuck = { n: 0 };
    const clamped = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame((_dt, elapsed) => {
      clamped.clear();
      if (!stuck.n) return;
      const t = elapsed / 1000;
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(t * (3 + stuck.n * 2.6)));
      for (let i = 0; i < stuck.n; i++) {
        const a = t * 1.6 + (i / 3) * Math.PI * 2;
        geigerTracer(clamped, ctx.tint, victim.x + Math.cos(a) * 20, victim.y + Math.sin(a) * 20 - 2,
          a + Math.PI / 2, 0.95, { lamp: blink, legs: true, scale: 0.85 });
      }
      pips(ctx, clamped, victim.x, victim.y - 46, stuck.n, 3, blink);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    const tag = (at: number, hits: boolean): void => ctx.at(at, () => {
      const aim = hits ? victim : { x: victim.x, y: victim.y - 150 };
      const ang = Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x);
      av.play('punch', ang);
      suit(av)?.ping();
      shoot(ctx, clamped, {
        kind: 'tracer', from: muzzle, ang, target: hits ? victim : null, range: 700,
        onLand: () => {
          stuck.n++;
          ctx.capture(() => fx.stick(victim.x, victim.y));
          if (stuck.n < 3) {
            float(ctx, victim.x, victim.y - 40, `TRACER ${stuck.n}/3`, hex(RAD.hazard), 11);
            return;
          }
          // Confirmed — the kit fires the railgun itself.
          stuck.n = 0;
          const ra = Math.atan2(victim.y - muzzle.y, victim.x - muzzle.x);
          ctx.capture(() => { fx.rail(muzzle.x, muzzle.y, victim.x, victim.y); fx.railHit(victim.x, victim.y, ra); });
          dose.left = 1;
          float(ctx, victim.x, victim.y - 62, '☢ CONFIRMED', hex(RAD.core), 12);
          float(ctx, victim.x, victim.y - 24, '50', '#ffb3aa', 18);
          readout.setText('50 damage, hitscan, and 10 seconds irradiated — the three are spent on it');
        },
        onMiss: () => {
          ctx.capture(() => {
            fx.shed(muzzle.x + Math.cos(ang) * 700, muzzle.y + Math.sin(ang) * 700);
            for (let i = 0; i < stuck.n; i++) fx.shed(victim.x, victim.y - 8);
          });
          if (stuck.n) float(ctx, ctx.cx, ctx.cy - 46, '✖ TRACERS LOST', hex(RAD.hazard), 12);
          stuck.n = 0;
          readout.setText('a tracer that hits nothing sheds every tracer on the field');
        },
      }, live);
    });

    ctx.at(300, () => readout.setText('the click does no damage at all — it plants a tracer'));
    tag(700, true);
    tag(1900, true);
    ctx.at(2600, () => readout.setText('two on the body. The third confirms the shot.'));
    tag(3200, true);
    ctx.at(5400, () => readout.setText('another three… and this one goes wide'));
    tag(5900, true);
    tag(6900, true);
    tag(7900, false);
    ctx.at(9400, () => readout.setText('back to zero: the click is free, the confirm is not'));
  },
};

// ══ E — Barrage ═══════════════════════════════════════════════════════

export const barrage: PreviewScript = {
  duration: 15500,
  scale: 0.8,
  caption: 'E — hold a 45° cone on an enemy while it closes to 5° over 3s, then a 5-round burst',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    const victim = { x: ctx.cx + 320, y: ctx.cy };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    // One run of the cone: opened at `at0`, locked on at `at0 + 300`, closed 3s later — unless
    // `escapeAt` walks the target out of it first.
    const cone = { on: false, ang: ctx.aim, lockAt: -1, start: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!cone.on) return;
      const t = elapsed / 1000;
      const lock = cone.lockAt < 0 ? 0 : Phaser.Math.Clamp((elapsed - cone.lockAt) / 3000, 0, 1);
      const half = (Phaser.Math.Linear(45, 5, lock) / 2) * (Math.PI / 180);
      barrageCone(g, ctx.tint, ctx.cx, ctx.cy, cone.ang, half, 520, 0.9, t, { lock, locked: cone.lockAt >= 0 });
      if (cone.lockAt >= 0) lockReticle(g, ctx.tint, victim.x, victim.y, lock, 0.95, t);
    });
    // The cone follows the target round, like a cursor kept on them.
    ctx.onFrame(() => {
      if (!cone.on) return;
      const want = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      cone.ang += Phaser.Math.Angle.Wrap(want - cone.ang) * 0.12;
      av.setFacing(cone.ang);
    });

    const run = (at0: number, o: { dosed: boolean; escape?: boolean }): void => {
      ctx.at(at0, () => {
        cone.on = true; cone.lockAt = -1; cone.ang = ctx.aim;
        av.setHold('reach', ctx.aim);
      });
      ctx.at(at0 + 300, () => {
        cone.lockAt = at0 + 300;
        float(ctx, victim.x, victim.y - 50, '◎ LOCKING', hex(RAD.neonLit), 11);
      });
      if (o.escape) {
        // A dash sideways faster than the cone can follow.
        ctx.onFrame((dt, elapsed) => {
          if (elapsed < at0 + 1900 || elapsed > at0 + 2250) return;
          victim.y -= 520 * (dt / 1000);
        });
        ctx.at(at0 + 2200, () => {
          const lock = Phaser.Math.Clamp((at0 + 2200 - cone.lockAt) / 3000, 0, 1);
          ctx.capture(() => fx.lockLost(ctx.cx, ctx.cy, cone.ang,
            (Phaser.Math.Linear(45, 5, lock) / 2) * (Math.PI / 180), 520));
          cone.on = false;
          av.setHold(null);
          float(ctx, ctx.cx, ctx.cy - 50, '✖ LOCK LOST', hex(RAD.hazard), 12);
        });
        ctx.at(at0 + 3400, () => { victim.y = ctx.cy; });
        return;
      }
      ctx.at(at0 + 3300, () => {
        cone.on = false;
        av.setHold(null);
        float(ctx, victim.x, victim.y - 54, '☢ BARRAGE', hex(RAD.hazard), 12);
      });
      for (let i = 0; i < 5; i++) {
        ctx.at(at0 + 3320 + i * 60, () => {
          const ang = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
          av.play('punch', ang, 90);
          ctx.capture(() => fx.pistolShot(ctx.cx + Math.cos(ang) * 16, ctx.cy + Math.sin(ang) * 16,
            victim.x + (Math.random() - 0.5) * 10, victim.y + (Math.random() - 0.5) * 10));
          float(ctx, victim.x + (i - 2) * 9, victim.y - 22, o.dosed ? '8' : '5', o.dosed ? '#ffd27a' : '#ffb3aa', 13);
        });
      }
    };

    // A slow walk across the cone, so holding it is something you can see being done.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed > 9500) return;
      victim.y = ctx.cy + Math.sin(elapsed / 900) * 46;
    });

    ctx.at(200, () => readout.setText('the cone opens at 45° — put an enemy inside it and it starts to close'));
    run(500, { dosed: false });
    ctx.at(2200, () => readout.setText('keep them inside while it narrows to 5° over three seconds'));
    ctx.at(4100, () => readout.setText('closed: five aimed hitscan rounds, 5 damage each'));
    ctx.at(5000, () => {
      dose.left = 1;
      ctx.capture(() => fx.dose(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
    });
    run(5400, { dosed: true });
    ctx.at(5600, () => readout.setText('on an irradiated target every round hits for 8 instead'));
    ctx.at(9800, () => readout.setText('but if they get out of the cone, the whole thing is cancelled'));
    run(10200, { dosed: false, escape: true });
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 10; });
  },
};

// ══ R — Fallout Bunker ════════════════════════════════════════════════

export const bunker: PreviewScript = {
  duration: 13000,
  scale: 0.8,
  caption: 'R — a 75 HP lead bunker: shots stop in the wall, enemies cannot get in, you cannot be hurt inside',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const R = 72;
    const enemy = { x: ctx.cx + 300, y: ctx.cy };
    dummyAt(ctx, enemy);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    const bk = { on: false, hp: 75, built: 0, hit: 0, seed: 7.3 };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((dt, elapsed) => {
      ground.clear();
      if (!bk.on) return;
      bk.hit = Math.max(0, bk.hit - dt / 220);
      falloutBunker(ground, ctx.tint, ctx.cx, ctx.cy, R, 0.95, elapsed / 1000, {
        hp: bk.hp / 75, built: Phaser.Math.Clamp((elapsed - bk.built) / 260, 0, 1),
        occupied: true, hit: bk.hit, seed: bk.seed,
      });
    });

    // Enemy shots: plain orbs, stopped at the wall.
    const shots: { x: number; y: number; done: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt) => {
      air.clear();
      for (const s of shots) {
        if (s.done) continue;
        s.x -= 520 * (dt / 1000);
        if (bk.on && s.x - ctx.cx <= R + 6) {
          s.done = true;
          bk.hp -= 10; bk.hit = 1;
          ctx.capture(() => fx.bunkerHit(s.x, s.y, 0));
          float(ctx, s.x, s.y - 18, '🛡 10', hex(RAD.leadLit), 11);
          continue;
        }
        air.fillStyle(0xff7a59, 0.95); air.fillCircle(s.x, s.y, 6);
        air.fillStyle(0xffe1d4, 0.9); air.fillCircle(s.x, s.y, 2.6);
      }
    });
    const fire = (at: number): void => ctx.at(at, () => shots.push({ x: enemy.x - 20, y: enemy.y, done: false }));

    ctx.at(300, () => readout.setText('the bunker goes up exactly where you are standing'));
    ctx.at(700, () => {
      bk.on = true; bk.built = 700;
      av.play('slam');
      ctx.capture(() => fx.bunkerRise(ctx.cx, ctx.cy, R));
      float(ctx, ctx.cx, ctx.cy - 58, '☢ FALLOUT BUNKER', hex(RAD.neonLit), 12);
    });
    ctx.at(1700, () => readout.setText('enemy shots stop in the wall and come off its 75 HP'));
    for (let i = 0; i < 4; i++) fire(1900 + i * 500);
    ctx.at(4400, () => readout.setText('enemies cannot walk in — they are held at the wall'));
    // The enemy walks straight at it, and is held off at the ring.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 4500 || elapsed > 7400) return;
      enemy.x = Math.max(ctx.cx + R + 22, enemy.x - 200 * (dt / 1000));
      if (enemy.x <= ctx.cx + R + 22) enemy.y = ctx.cy + Math.sin((elapsed - 4500) / 400) * 24;
    });
    ctx.at(6000, () => {
      bk.hp -= 15; bk.hit = 1;
      float(ctx, ctx.cx, ctx.cy - 30, '🛡 15', hex(RAD.leadLit), 12);
      readout.setText('anything that does reach you inside lands on the bunker instead');
    });
    ctx.at(7600, () => { enemy.x = ctx.cx + 300; enemy.y = ctx.cy; });
    ctx.at(8000, () => readout.setText('your own airdrop too — inside the bunker you do not take its 200'));
    ctx.at(9200, () => {
      bk.on = false;
      ctx.capture(() => fx.bunkerBreak(ctx.cx, ctx.cy, R));
      float(ctx, ctx.cx, ctx.cy - 92, '✖ BUNKER DOWN', hex(RAD.hazard), 12);
      readout.setText('it comes down at 0 HP, after 10 seconds, or when it eats an airdrop');
    });
  },
};

// ══ F — Rod Baton ═════════════════════════════════════════════════════

export const baton: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F — a close rod strike: 8 and a 4s dose, or 16 and a 2s stun on a dosed target',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 92, y: ctx.cy - 4 };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 4; });
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    const swing = { start: -1, hot: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (swing.start < 0) return;
      const t = (elapsed - swing.start) / 300;
      if (t >= 1) { swing.start = -1; return; }
      const e = 1 - (1 - t) * (1 - t);
      const a = ctx.aim - 0.8 + e * 1.6;
      g.lineStyle(10, ctx.tint(swing.hot ? RAD.hazard : RAD.neon), 0.18 * (1 - t));
      g.beginPath(); g.arc(ctx.cx, ctx.cy, 92 * 0.85, ctx.aim - 0.8, a, false); g.strokePath();
      uraniumRod(g, ctx.tint, ctx.cx + Math.cos(a) * 14, ctx.cy + Math.sin(a) * 14,
        ctx.cx + Math.cos(a) * 92, ctx.cy + Math.sin(a) * 92, 1 - t * 0.3, elapsed / 1000,
        { heat: swing.hot ? 1 : 0.3 });
    });

    const strike = (at: number, hot: boolean): void => ctx.at(at, () => {
      swing.start = at; swing.hot = hot;
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.rodStrike(victim.x, victim.y, ctx.aim, hot));
      if (!hot) {
        float(ctx, victim.x, victim.y - 24, '8', '#ffb3aa', 15);
        dose.left = 1;
        ctx.capture(() => fx.dose(victim.x, victim.y));
        float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
        return;
      }
      float(ctx, victim.x, victim.y - 24, '16', '#ffd27a', 17);
      ctx.capture(() => fx.stick(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 52, '⚡ STUNNED', hex(RAD.hazard), 12);
    });

    ctx.at(300, () => readout.setText('a clean target: 8 damage and 4 seconds irradiated'));
    strike(800, false);
    ctx.at(2200, () => readout.setText('the same strike on somebody already carrying a dose'));
    strike(3000, true);
    ctx.at(3600, () => readout.setText('16 damage and 2 seconds stunned — no walking, no casting'));
    ctx.at(6000, () => readout.setText('a railgun confirm or the airdrop leaves a 10-second dose to cash in'));
  },
};

// ══ Q — Extermination ═════════════════════════════════════════════════

export const extermination: PreviewScript = {
  duration: 14000,
  scale: 0.8,
  caption: 'Q — five flares into one body calls a 200-damage airdrop onto everybody, you included',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const muzzle = { x: ctx.cx + 18, y: ctx.cy - 2 };
    const victim = { x: ctx.cx + 330, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7cff3d', 11);

    const live: { x: number; y: number; ang: number; kind: 'tracer' | 'flare'; done: boolean }[] = [];
    airLayer(ctx, live);
    const mag = { ammo: 0, hits: 0, out: false };
    const counters = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame(() => {
      counters.clear();
      if (!mag.out) return;
      pips(ctx, counters, ctx.cx, ctx.cy - 44, mag.ammo, 5, 0.85);
      if (mag.hits) pips(ctx, counters, victim.x, victim.y - 54, mag.hits, 5, 0.9);
    });

    // The footprint the whole arena stands inside for 1.7 seconds before the cloud lands.
    const drop = { at: -1 };
    const foot = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      foot.clear();
      if (drop.at < 0) return;
      const k = Phaser.Math.Clamp(1 - (drop.at - elapsed) / 1700, 0, 1);
      if (k >= 1) return;
      dropFootprint(foot, ctx.tint, ctx.w / 2, ctx.h / 2, Math.max(ctx.w, ctx.h) * 0.62, 0.95, k,
        elapsed / 1000);
    });

    ctx.at(400, () => {
      mag.out = true; mag.ammo = 5;
      av.play('raise'); suit(av)?.ping();
      float(ctx, ctx.cx, ctx.cy - 58, '☢ 5 FLARES · ONE TARGET', hex(RAD.neon), 12);
      readout.setText('the ultimate deals nothing on its own — it hands you five rounds and 12 seconds');
    });
    for (let i = 0; i < 5; i++) {
      ctx.at(1100 + i * 700, () => {
        const ang = Math.atan2(victim.y - muzzle.y, victim.x - muzzle.x);
        av.play('punch', ang);
        mag.ammo--;
        shoot(ctx, counters, {
          kind: 'flare', from: muzzle, ang, target: victim, range: 900,
          onLand: () => {
            mag.hits++;
            ctx.capture(() => fx.stick(victim.x, victim.y));
            float(ctx, victim.x, victim.y - 44, `${mag.hits}/5`, hex(RAD.neonLit), 12);
            if (mag.hits < 5) return;
            mag.out = false;
            drop.at = 6000;
            float(ctx, ctx.cx, ctx.cy - 70, '☢☢ AIRDROP INBOUND ☢☢', hex(RAD.core), 13);
            readout.setText('confirmed — 1.7 seconds of siren and there is nowhere on the map outside it');
          },
        }, live);
      });
    }
    ctx.at(2600, () => readout.setText('the flares are 1350 px/s and deal nothing — all five have to land on one body'));
    ctx.at(6000, () => {
      ctx.capture(() => fx.airdrop(ctx.w / 2, ctx.h / 2));
      float(ctx, victim.x, victim.y - 24, '200', '#ffb3aa', 20);
      float(ctx, ctx.cx, ctx.cy - 24, '200', '#ffb3aa', 20);
      float(ctx, ctx.cx, ctx.cy - 60, '☢ EXTERMINATED', hex(RAD.hazard), 12);
      readout.setText('200 to every enemy on screen — and 200 to you, unless you are inside your bunker');
    });
    ctx.at(8600, () => readout.setText('four on one and one stray is "✖ NO CONFIRMATION" and forty seconds gone'));
    ctx.at(11200, () => readout.setText('drop a Fallout Bunker first and sit the blast out inside it'));
  },
};


// ══ UPGRADES ═════════════════════════════════════════════════════════

/** A spiked tracer in the air, stepped like `shoot` but painted barbed. */
function spikedShot(
  ctx: PreviewCtx, from: { x: number; y: number }, to: { x: number; y: number }, onLand: () => void,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const r = { x: from.x, y: from.y, done: false };
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (r.done) return;
    r.x += Math.cos(ang) * TRACER_SPEED * (dt / 1000);
    r.y += Math.sin(ang) * TRACER_SPEED * (dt / 1000);
    if (Phaser.Math.Distance.Between(r.x, r.y, to.x, to.y) <= 35) { r.done = true; onLand(); return; }
    geigerTracer(g, ctx.tint, r.x, r.y, ang + (elapsed / 1000) * 9, 1, { lamp: 0.5, spiked: true });
  });
}

export const railgunUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.85,
  caption: 'Click+ Flick Shot — face away, flick back and click: the tracer comes out spiked for 25',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    const muzzle = { x: ctx.cx + 18, y: ctx.cy - 2 };
    const victim = { x: ctx.cx + 330, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);
    const away = ctx.aim + Math.PI;
    const facing = { a: ctx.aim };
    ctx.onFrame(() => av.setFacing(facing.a));
    const stuck = { n: 0 };
    const pipsG = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame(() => { pipsG.clear(); if (stuck.n) pips(ctx, pipsG, victim.x, victim.y - 46, stuck.n, 3, 0.8); });

    const flick = (at: number): void => {
      ctx.at(at, () => { facing.a = away; readout.setText('turn your back on them…'); });
      ctx.at(at + 900, () => {
        facing.a = ctx.aim;
        av.play('punch', ctx.aim);
        readout.setText('…flick back and click inside 0.35s — the tracer comes out barbed');
        spikedShot(ctx, muzzle, victim, () => {
          stuck.n = Math.min(3, stuck.n + 1);
          ctx.capture(() => { fx.flickHit(victim.x, victim.y, ctx.aim); fx.stick(victim.x, victim.y); });
          float(ctx, victim.x, victim.y - 66, '✦ FLICK SHOT', hex(RAD.hotLit), 12);
          float(ctx, victim.x, victim.y - 24, '25', '#ffb3aa', 18);
        });
      });
    };
    flick(300);
    flick(3200);
    ctx.at(6000, () => readout.setText('25 on landing — and it still counts as one of the railgun\'s three'));
  },
};

export const barrageUpgraded: PreviewScript = {
  duration: 12000,
  scale: 0.8,
  caption: 'E+ Trigger Happy — the burst keeps firing until they leave the cone, which closes to 1°',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    const victim = { x: ctx.cx + 300, y: ctx.cy };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);
    const cone = { on: false, ang: ctx.aim, lockAt: -1, fireAt: -1, fired: 0, next: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const half = (elapsed: number): number => {
      if (cone.fireAt >= 0) {
        const k = Phaser.Math.Clamp((elapsed - cone.fireAt) / 4000, 0, 1);
        return (Phaser.Math.Linear(5, 1, k) / 2) * (Math.PI / 180);
      }
      const lock = cone.lockAt < 0 ? 0 : Phaser.Math.Clamp((elapsed - cone.lockAt) / 3000, 0, 1);
      return (Phaser.Math.Linear(45, 5, lock) / 2) * (Math.PI / 180);
    };
    // The target drifts; the cone follows it a little behind, as a hand on a mouse would.
    ctx.onFrame((dt, elapsed) => {
      victim.y = ctx.cy + Math.sin(elapsed / 1100) * 40 + (elapsed > 8600 ? (elapsed - 8600) * 0.12 : 0);
      if (!cone.on) return;
      const want = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      cone.ang += Phaser.Math.Angle.Wrap(want - cone.ang) * (elapsed > 8600 ? 0.02 : 0.15);
      av.setFacing(cone.ang);
      if (cone.fireAt < 0 || elapsed < cone.next) return;
      const d = Phaser.Math.Distance.Between(ctx.cx, ctx.cy, victim.x, victim.y);
      const off = Math.abs(Phaser.Math.Angle.Wrap(want - cone.ang));
      if (cone.fired >= 5 && off > half(elapsed) + Math.atan2(13, d)) {
        ctx.capture(() => fx.lockLost(ctx.cx, ctx.cy, cone.ang, half(elapsed), 520));
        float(ctx, ctx.cx, ctx.cy - 50, `✖ CEASE FIRE · ${cone.fired} ROUNDS`, hex(RAD.hazard), 12);
        readout.setText('out of the cone — the fire stops');
        cone.on = false;
        av.setHold(null);
        return;
      }
      cone.fired++;
      cone.next = elapsed + (cone.fired <= 5 ? 60 : 100);
      av.play('punch', want, 90);
      ctx.capture(() => fx.pistolShot(ctx.cx + Math.cos(want) * 16, ctx.cy + Math.sin(want) * 16,
        victim.x + (Math.random() - 0.5) * 10, victim.y + (Math.random() - 0.5) * 10));
      float(ctx, victim.x + (Math.random() - 0.5) * 24, victim.y - 22, '5', '#ffb3aa', 12);
      void dt;
    });
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!cone.on) return;
      const lock = cone.lockAt < 0 ? 0 : Phaser.Math.Clamp((elapsed - cone.lockAt) / 3000, 0, 1);
      barrageCone(g, ctx.tint, ctx.cx, ctx.cy, cone.ang, half(elapsed), 520, 0.9, elapsed / 1000,
        { lock, locked: cone.lockAt >= 0 });
      if (cone.lockAt >= 0) lockReticle(g, ctx.tint, victim.x, victim.y, lock, 0.95, elapsed / 1000);
    });
    ctx.at(300, () => {
      cone.on = true; av.setHold('reach', ctx.aim);
      readout.setText('the lock closes exactly as before…');
    });
    ctx.at(600, () => { cone.lockAt = 600; float(ctx, victim.x, victim.y - 50, '◎ LOCKING', hex(RAD.neonLit), 11); });
    ctx.at(3600, () => {
      cone.fireAt = 3600; cone.next = 3600;
      float(ctx, victim.x, victim.y - 54, '☢ TRIGGER HAPPY', hex(RAD.hazard), 12);
      readout.setText('…but the burst does not stop — ten rounds a second while they stay inside');
    });
    ctx.at(6200, () => readout.setText('and the cone keeps closing as it fires, all the way down to 1°'));
  },
};

export const bunkerUpgraded: PreviewScript = {
  duration: 10000,
  scale: 0.8,
  caption: 'R+ Turret Town — two turrets on the bunker wall that only shoot irradiated enemies',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const R = 72;
    const enemy = { x: ctx.cx + 260, y: ctx.cy - 40 };
    dummyAt(ctx, enemy);
    const dose = { left: 0 };
    doseMarker(ctx, enemy, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);
    const turrets = [-1, 1].map((side) => ({ side, ang: side < 0 ? Math.PI : 0, recoil: 0, next: 0 }));
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((dt, elapsed) => {
      ground.clear();
      if (elapsed < 600) return;
      const t = elapsed / 1000;
      const built = Phaser.Math.Clamp((elapsed - 600) / 260, 0, 1);
      falloutBunker(ground, ctx.tint, ctx.cx, ctx.cy, R, 0.95, t, { hp: 1, built, occupied: true, hit: 0, seed: 4.1 });
      for (const tr of turrets) {
        const x = ctx.cx + tr.side * (R + 2);
        const y = ctx.cy;
        tr.recoil = Math.max(0, tr.recoil - dt / 140);
        const live = dose.left > 0;
        if (live) {
          tr.ang = Phaser.Math.Angle.RotateTo(tr.ang, Math.atan2(enemy.y - y, enemy.x - x), 9 * (dt / 1000));
          if (elapsed >= tr.next) {
            tr.next = elapsed + 420;
            tr.recoil = 1;
            ctx.capture(() => fx.pistolShot(x + Math.cos(tr.ang) * 20, y + Math.sin(tr.ang) * 20, enemy.x, enemy.y));
            float(ctx, enemy.x + tr.side * 8, enemy.y - 22, '4', '#ffb3aa', 12);
          }
        }
        bunkerTurret(ground, ctx.tint, x, y, tr.ang, 0.95 * built, t, { recoil: tr.recoil, live });
      }
    });
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 5; });
    ctx.at(300, () => readout.setText('the bunker goes up with a turret bolted to each side'));
    ctx.at(600, () => {
      av.play('slam');
      ctx.capture(() => fx.bunkerRise(ctx.cx, ctx.cy, R));
    });
    ctx.at(1800, () => readout.setText('a clean enemy — the lamps stay dark and the turrets hold fire'));
    ctx.at(3800, () => {
      dose.left = 1;
      ctx.capture(() => fx.dose(enemy.x, enemy.y));
      float(ctx, enemy.x, enemy.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
      readout.setText('irradiate them, and both turrets open up: 4 a shot, about twice a second each');
    });
    ctx.at(7000, () => readout.setText('anything that hits the bunker is answered from twice as far for 3s'));
  },
};

export const batonUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F+ Mutation — the rod on a dosed target strips the dose and swells their hitbox 25% for 15s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 92, y: ctx.cy - 4, scale: 1 };
    dummyAt(ctx, victim);
    const dose = { left: 1 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);
    // The hitbox ring, so the 25% is something you can see.
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      ring.clear();
      if (victim.scale <= 1) return;
      ring.lineStyle(1.5, ctx.tint(RAD.neon), 0.5 + 0.3 * Math.sin(elapsed / 150));
      ring.strokeCircle(victim.x, victim.y, 22 * victim.scale);
    });
    const swing = { start: -1 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (swing.start < 0) return;
      const t = (elapsed - swing.start) / 300;
      if (t >= 1) { swing.start = -1; return; }
      const a = ctx.aim - 0.8 + (1 - (1 - t) * (1 - t)) * 1.6;
      uraniumRod(g, ctx.tint, ctx.cx + Math.cos(a) * 14, ctx.cy + Math.sin(a) * 14,
        ctx.cx + Math.cos(a) * 92, ctx.cy + Math.sin(a) * 92, 1 - t * 0.3, elapsed / 1000, { heat: 1 });
    });
    ctx.at(300, () => readout.setText('an enemy already carrying a dose…'));
    ctx.at(1200, () => {
      swing.start = 1200;
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.rodStrike(victim.x, victim.y, ctx.aim, true));
      float(ctx, victim.x, victim.y - 24, '16', '#ffd27a', 17);
      float(ctx, victim.x, victim.y - 52, '⚡ STUNNED', hex(RAD.hazard), 12);
    });
    ctx.at(1500, () => {
      dose.left = 0;
      ctx.capture(() => fx.mutate(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 66, '🧬 MUTATED', hex(RAD.neonLit), 12);
      readout.setText('…still takes 16 and the stun — but the dose curdles into a mutation');
    });
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 1500) return;
      victim.scale = Math.min(1.25, 1 + (elapsed - 1500) / 1200);
    });
    ctx.at(4200, () => readout.setText('a 25% bigger hitbox for 15 seconds — and healing works on them again'));
  },
};

export const exterminationUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.75,
  caption: 'Q+ Complete Annihilation — the drop leaves fallout puddles and over-radiates anyone already dosed',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 300, y: ctx.cy - 120 };
    dummyAt(ctx, victim);
    const dose = { left: 1 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7cff3d', 11);
    const spots: [number, number, number][] = [
      [0.5, 0.5, 58], [0.3, 0.32, 46], [0.7, 0.3, 50], [0.24, 0.66, 52], [0.76, 0.68, 46],
      [0.46, 0.8, 44], [0.58, 0.18, 40], [0.13, 0.4, 42], [0.87, 0.46, 44], [0.38, 0.52, 36],
      [0.64, 0.56, 38],
    ];
    const drop = { at: 2400, landed: false, over: false };
    const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      floor.clear();
      const t = elapsed / 1000;
      if (!drop.landed) {
        const k = Phaser.Math.Clamp(1 - (drop.at - elapsed) / 1700, 0, 1);
        if (elapsed > drop.at - 1700) {
          dropFootprint(floor, ctx.tint, ctx.w / 2, ctx.h / 2, Math.max(ctx.w, ctx.h) * 0.62, 0.95, k, t);
        }
        return;
      }
      spots.forEach(([fx0, fy0, r], i) => falloutPuddle(floor, ctx.tint, ctx.w * fx0, ctx.h * fy0, r, 0.9, t, i * 7.31 + 1.7));
    });
    ctx.onFrame((dt) => { if (dose.left > 0 && drop.landed) dose.left -= (dt / 1000) / 10; });
    // Over-radiated, the victim limps toward a puddle at half speed and ticks in it.
    const tick = { next: 0 };
    ctx.onFrame((dt, elapsed) => {
      if (!drop.over) return;
      const goal = { x: ctx.w * 0.7, y: ctx.h * 0.3 };
      const d = Phaser.Math.Distance.Between(victim.x, victim.y, goal.x, goal.y);
      if (d > 4) {
        const a = Math.atan2(goal.y - victim.y, goal.x - victim.x);
        victim.x += Math.cos(a) * 45 * (dt / 1000);
        victim.y += Math.sin(a) * 45 * (dt / 1000);
      }
      if (d < 50 && elapsed >= tick.next) {
        tick.next = elapsed + 400;
        float(ctx, victim.x + (Math.random() - 0.5) * 16, victim.y - 22, '4', '#ffb3aa', 12);
      }
    });
    const over = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame((_dt, elapsed) => {
      over.clear();
      if (!drop.over) return;
      trefoil(over, ctx.tint, victim.x, victim.y - 46, 7, 0.6 + 0.3 * Math.sin(elapsed / 90), { phase: elapsed / 400, color: RAD.hot });
    });
    ctx.at(200, () => readout.setText('the target is already irradiated when the drop is called'));
    ctx.at(drop.at, () => {
      drop.landed = true;
      ctx.capture(() => {
        fx.airdrop(ctx.w / 2, ctx.h / 2);
        for (const [fx0, fy0, r] of spots) fx.puddleSplash(ctx.w * fx0, ctx.h * fy0, r);
      });
      float(ctx, victim.x, victim.y - 24, '200', '#ffb3aa', 20);
    });
    ctx.at(drop.at + 500, () => {
      drop.over = true;
      dose.left = 1;
      ctx.capture(() => fx.overRadiate(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 78, '☢☢ OVER-RADIATED', hex(RAD.hot), 12);
      readout.setText('dosed when it landed: over-radiated — half speed, +30% damage taken for 8s');
    });
    ctx.at(6000, () => readout.setText('and fallout everywhere for 9s: 3 every 0.4s to anyone standing in it'));
  },
};


// ══ PASSIVE — Irradiated ══════════════════════════════════════════════

export const irradiated: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Status — while it lasts, every heal aimed at them lands as a hit instead',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7cff3d', 11);

    // Their health, so the inversion is something you watch rather than something you read.
    const hp = { v: 240 };
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    ctx.onFrame(() => {
      bar.clear();
      bar.fillStyle(0x1a1420, 0.9); bar.fillRect(victim.x - 26, victim.y - 20, 52, 5);
      bar.fillStyle(0x4ade80, 0.95); bar.fillRect(victim.x - 26, victim.y - 20, 52 * (hp.v / 400), 5);
    });

    const heal = (at: number, n: number): void => ctx.at(at, () => {
      if (dose.left > 0) {
        hp.v = Math.max(0, hp.v - n);
        float(ctx, victim.x, victim.y - 40, `☢ ${n} REJECTED`, hex(RAD.neon), 12);
      } else {
        hp.v = Math.min(400, hp.v + n);
        float(ctx, victim.x, victim.y - 40, `+${n}`, '#4ade80', 12);
      }
    });

    ctx.at(300, () => readout.setText('clean: their regeneration does what regeneration does'));
    heal(700, 20);
    heal(1500, 20);
    ctx.at(2400, () => {
      dose.left = 1;
      ctx.capture(() => fx.dose(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 12);
      readout.setText('dosed — and the status does nothing at all on its own');
    });
    heal(3400, 20);
    heal(4300, 25);
    heal(5200, 20);
    ctx.at(3600, () => readout.setText('until they try to heal. Any source, any size, straight into damage.'));
    ctx.at(6200, () => readout.setText('a second dose refreshes the window — there is no stack'));
    ctx.at(8200, () => readout.setText('and it is what turns Barrage up to 8 a round and the Rod Baton into a stun'));
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 10; });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

/** A plain enemy body with its own alpha, so stealth can be shown fading it out. */
function fadingFoe(ctx: PreviewCtx, at: { x: number; y: number; alpha: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    const a = at.alpha;
    if (a <= 0.01) return;
    g.fillStyle(0x2b2f3d, a); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, a); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9 * a);
    g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
}

export const masteryXray: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'X-Ray Vision — every enemy carries a green outline on your screen, and the outline stays when they turn invisible',
  run(ctx) {
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    suit(av)?.setMastered(true);
    const foe = { x: ctx.cx + 160, y: ctx.cy, alpha: 1 };
    fadingFoe(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7cff3d', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      // A slow figure-eight so the outline is seen to follow a moving body.
      foe.x = ctx.cx + 150 + Math.sin(t * 0.9) * 70;
      foe.y = ctx.cy + Math.sin(t * 1.8) * 45;
      const c = ctx.casterAt();
      av.setFacing(Math.atan2(foe.y - c.y, foe.x - c.x));
      if (elapsed > 2600 && elapsed < 7600) foe.alpha = Math.max(0, foe.alpha - dt / 600);
      else if (elapsed >= 7600) foe.alpha = Math.min(1, foe.alpha + dt / 600);
      g.clear();
      xrayOutline(g, ctx.tint, foe.x, foe.y, 26, 0.9, t, 1.3);
    });
    ctx.at(300, () => readout.setText('every enemy wears a green outline on your screen'));
    ctx.at(2600, () => {
      float(ctx, foe.x, foe.y - 44, 'STEALTH', '#9aa3b8', 11);
      readout.setText('they go invisible — the outline does not care');
    });
    ctx.at(5000, () => readout.setText('stealth, camouflage, fading out: you still see where they are'));
    ctx.at(7600, () => readout.setText('a Radiation bot with the mastery is not fooled either'));
  },
};

export const masteryDummy: PreviewScript = {
  duration: 11000,
  scale: 0.85,
  caption: 'Test Dummy — throw a 25 HP dummy on a green link: until it dies you cannot be hurt, and bots switch to shooting it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    suit(av)?.setMastered(true);
    const shooter = { x: ctx.cx + 300, y: ctx.cy };
    dummyAt(ctx, shooter);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e0b52a', 11);

    const DUMMY_HP = 25;
    const dm = { on: false, x: ctx.cx + 110, y: ctx.cy + 50, fromX: 0, fromY: 0, at: 0, hp: DUMMY_HP, hit: 0 };
    const pos = (elapsed: number): { x: number; y: number; lift: number; u: number } => {
      const u = Phaser.Math.Clamp((elapsed - dm.at) / 380, 0, 1);
      return {
        x: Phaser.Math.Linear(dm.fromX, dm.x, u), y: Phaser.Math.Linear(dm.fromY, dm.y, u),
        lift: Math.sin(u * Math.PI) * 46, u,
      };
    };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const shots: { x: number; y: number; vx: number; vy: number; done: boolean }[] = [];
    let now = 0;

    const hurtDummy = (n: number): void => {
      const p = pos(now);
      dm.hp -= n; dm.hit = 1;
      float(ctx, p.x, p.y - 40, `🎯 ${n}`, hex(RAD.hazard), 12);
      if (dm.hp <= 0) {
        dm.on = false;
        ctx.capture(() => fx.dummyBreak(p.x, p.y));
        float(ctx, p.x, p.y - 54, '✖ DUMMY DOWN', hex(RAD.hazard), 12);
        readout.setText('at 0 HP it breaks, and you are back on the line');
      }
    };

    ctx.onFrame((dt, elapsed) => {
      now = elapsed;
      const t = elapsed / 1000;
      const c = ctx.casterAt();
      ground.clear();
      air.clear();
      dm.hit = Math.max(0, dm.hit - dt / 240);
      if (dm.on) {
        const p = pos(elapsed);
        dummyLink(ground, ctx.tint, c.x, c.y + 4, p.x, p.y - p.lift - 2, 0.85, t, dm.hit);
        testDummy(ground, ctx.tint, p.x, p.y, 0.98, t, {
          hp: Math.max(0, dm.hp / DUMMY_HP), hit: dm.hit, lift: p.lift, tumble: p.u < 1 ? p.u * Math.PI * 4 : 0, seed: 4.2,
        });
        if (p.u >= 1) doseCells(ground, ctx.tint, p.x, p.y - 34, Math.ceil(Math.max(0, dm.hp) / 5), 5, 0.4 + dm.hit * 0.6, t);
      }
      for (const sh of shots) {
        if (sh.done) continue;
        sh.x += sh.vx * (dt / 1000);
        sh.y += sh.vy * (dt / 1000);
        if (dm.on && pos(elapsed).u >= 1 && Phaser.Math.Distance.Between(sh.x, sh.y, dm.x, dm.y - 4) < 22) {
          sh.done = true;
          ctx.capture(() => fx.bunkerHit(sh.x, sh.y, 0));
          hurtDummy(5);
          continue;
        }
        if (Phaser.Math.Distance.Between(sh.x, sh.y, c.x, c.y) < 20) {
          sh.done = true;
          if (dm.on) { hurtDummy(5); readout.setText('a hit that reaches you runs down the link instead'); }
          else float(ctx, c.x, c.y - 36, '-5', '#ff6677', 12);
          continue;
        }
        if (sh.x < -20) sh.done = true;
        air.fillStyle(0xff7a59, 0.95); air.fillCircle(sh.x, sh.y, 6);
        air.fillStyle(0xffe1d4, 0.9); air.fillCircle(sh.x, sh.y, 2.6);
      }
    });

    // The shooter aims at whatever it thinks is the target: you, then the dummy once it stands.
    const fire = (at: number, atDummy: boolean): void => ctx.at(at, () => {
      const c = ctx.casterAt();
      const tx = atDummy && dm.on ? dm.x : c.x;
      const ty = atDummy && dm.on ? dm.y - 4 : c.y;
      const a = Math.atan2(ty - shooter.y, tx - (shooter.x - 18));
      shots.push({ x: shooter.x - 18, y: shooter.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, done: false });
    });

    ctx.at(300, () => readout.setText('the bot is shooting at you'));
    fire(500, false);
    ctx.at(1500, () => {
      const c = ctx.casterAt();
      dm.on = true; dm.hp = DUMMY_HP; dm.at = 1500; dm.fromX = c.x; dm.fromY = c.y;
      av.play('punch', Math.atan2(dm.y - c.y, dm.x - c.x), 320);
      float(ctx, c.x, c.y - 52, '🎯 TEST DUMMY', hex(RAD.hazard), 12);
      readout.setText('throw the dummy — it is tied to you by a faint green link');
    });
    ctx.at(1880, () => ctx.capture(() => fx.dummyLand(dm.x, dm.y)));
    ctx.at(2600, () => readout.setText('the bot switches targets: the dummy, not you'));
    for (let i = 0; i < 3; i++) fire(2800 + i * 700, true);
    fire(5100, false);
    fire(6100, true);
    fire(7600, false);
    fire(8800, false);
    ctx.at(9800, () => readout.setText('25 HP, 12 seconds, and it takes your own airdrop for you'));
  },
};
