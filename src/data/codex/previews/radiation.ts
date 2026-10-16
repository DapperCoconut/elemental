import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  RAD, RadiationAvatar, RadiationFx, barrageCone, dropFootprint, falloutBunker, flareRound,
  geigerTracer, lockReticle, trefoil, uraniumRod,
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
