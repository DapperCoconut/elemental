import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  RAD, RadiationAvatar, RadiationColorFn, RadiationFx, afterimageLance, boneOverlay, cancerArm,
  criticalAura, doseTicks, dropFootprint, flareRound, gammaChain, geigerTracer, leadArmour,
  leashRing, radPuddle, redshift, revolver, sightLine, sustainedBeam, tetherAnchor, trefoil,
  wasteDrum,
} from '../../../elements/kits/RadiationVisuals';

/**
 * Radiation's showcases.
 *
 * Nothing this element puts in the world is a sprite — tracers, flares, the drum, the pools and
 * the skeletons are all data the kit repaints into three Graphics layers every frame, so there is
 * no `proj-radiation` for `ctx.fly` to carry and these loops mirror the kit's own stepping
 * instead. Every painter here is the real one: `geigerTracer` and `flareRound` for rounds in the
 * air, `wasteDrum` and `radPuddle` for the F, `boneOverlay` for the R, `dropFootprint` for the Q's
 * tell, and the one-shots (`rail`, `railHit`, `drumBlast`, `puddleShot`, `airdrop`, `dose`,
 * `stick`, `shed`, `batonArc`) through a real `RadiationFx` with a sticky sink.
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

/**
 * The loop's own elapsed time, readable from anywhere.
 *
 * `ctx.at` and `ctx.onFrame` both know the clock, but a callback fired by a landing round does
 * not — and both upgrade loops that stamp something at the moment of a confirm need it. One
 * shared frame hook is cheaper than threading elapsed through `shoot`.
 */
function clockOf(ctx: PreviewCtx): { t: number } {
  const c = { t: 0 };
  ctx.onFrame((_dt, elapsed) => { c.t = elapsed; });
  return c;
}

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
 * The upgraded marker: the same trefoil and bar, plus the ladder. Green at 1, hazard at 2, red
 * at 3, with the tick marks beside it and the arm hanging off the body at the top rung — exactly
 * what the kit paints, and the whole read on how bad a dose has got.
 */
function doseLadder(
  ctx: PreviewCtx,
  at: { x: number; y: number },
  read: () => { left: number; level: number; slashIn?: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const { left, level, slashIn } = read();
    if (left <= 0 || level <= 0) return;
    const t = elapsed / 1000;
    const tint: RadiationColorFn = redshift(ctx.tint, level >= 3 ? 1 : level === 2 ? 0.45 : 0);
    trefoil(g, tint, at.x, at.y - 34, 6.5 + (level - 1) * 1.4,
      0.55 + 0.35 * Math.sin(t * (5 + level * 2)),
      { phase: t * 1.6 * level, color: RAD.neonLit });
    g.fillStyle(tint(RAD.neonDeep), 0.5);
    g.fillRect(at.x - 15, at.y - 26, 30, 2.4);
    g.fillStyle(tint(RAD.neon), 0.95);
    g.fillRect(at.x - 15, at.y - 26, 30 * Phaser.Math.Clamp(left, 0, 1), 2.4);
    if (level > 1) doseTicks(g, tint, at.x + 22, at.y - 32, level, 0.95);
    if (level < 3) return;
    // −1 → 0 winds the arm back behind the body; 0 → 1 brings it through.
    const wind = slashIn === undefined || slashIn > 0.7
      ? Math.sin(t * 2.2) * 0.14
      : -Phaser.Math.Clamp(slashIn / 0.7, 0, 1);
    cancerArm(g, ctx.tint, at.x, at.y, -0.5, 0.95, wind, t);
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

// ══ E — Rod Baton ═════════════════════════════════════════════════════

export const baton: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — dash + 15 damage in a 109° wedge; clean targets are dosed, dosed ones are stunned',
  run(ctx) {
    const fx = fxOf(ctx);
    // The caster travels 760 px/s for 190ms, so the body has to be driven rather than pinned.
    const at = { x: ctx.cx, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-radiation')) {
      const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-radiation').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    ctx.onFrame((dt) => { av.setFacing(ctx.aim); av.update(dt, at.x, at.y, 1); });

    const victim = { x: ctx.cx + 170, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    // The swing arc the kit paints behind the hit: a lead bar sweeping 0.95 rad either side.
    const swing = { start: -1, ang: 0, x: 0, y: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (swing.start < 0) return;
      const t = (elapsed - swing.start) / 300;
      if (t >= 1) { swing.start = -1; return; }
      const a = swing.ang - 0.95 + t * 1.9;
      const ex = swing.x + Math.cos(a) * 104;
      const ey = swing.y + Math.sin(a) * 104;
      g.lineStyle(6, ctx.tint(RAD.leadDeep), 0.95 * (1 - t * 0.4));
      g.lineBetween(swing.x, swing.y, ex, ey);
      g.lineStyle(2.4, ctx.tint(RAD.neon), 0.9 * (1 - t * 0.4));
      g.lineBetween(swing.x + Math.cos(a) * 30, swing.y + Math.sin(a) * 30, ex, ey);
      trefoil(g, ctx.tint, ex, ey, 7, 0.9 * (1 - t), { phase: t * 8 });
    });

    const dash = (at0: number, then: () => void): void => {
      ctx.at(at0, () => {
        av.play('sweep', ctx.aim);
        swing.start = at0; swing.ang = ctx.aim; swing.x = at.x; swing.y = at.y;
        ctx.capture(() => fx.batonArc(at.x, at.y, ctx.aim, 104));
        then();
      });
      // 760 px/s for 190ms is ~144px of travel.
      let run = 0;
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < at0 || run >= 190) return;
        const s = Math.min(dt, 190 - run);
        run += dt;
        at.x += 760 * (s / 1000);
      });
    };

    ctx.at(300, () => readout.setText('a clean target: 15 damage and 10 seconds irradiated'));
    dash(800, () => {
      float(ctx, victim.x, victim.y - 24, '15', '#ffb3aa', 15);
      dose.left = 1;
      ctx.capture(() => fx.dose(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
    });
    ctx.at(2800, () => { at.x = ctx.cx; readout.setText('the same swing on somebody already carrying a dose'); });
    dash(3800, () => {
      float(ctx, victim.x, victim.y - 24, '15', '#ffb3aa', 15);
      ctx.capture(() => fx.stick(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 52, '⚡ STUNNED', hex(RAD.hazard), 12);
      float(ctx, victim.x, victim.y - 70, '1.5s — no walking, no casting', '#8e97ad', 9);
    });
    ctx.at(6200, () => readout.setText('never both: it is the opener or the finisher, and it will not refresh a dose'));
    ctx.at(8000, () => readout.setText('the dash is the kit\'s only mobility — 144px toward the cursor, WASD stood down'));
  },
};

// ══ R — X-Ray Vision ══════════════════════════════════════════════════

export const xray: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'R — 8s of skeletons through anything, and every enemy hitbox 33% wider',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    // Two marks: one plainly visible, one that fades to nothing to make the point about stealth.
    const near = { x: ctx.cx + 120, y: ctx.cy - 12 };
    const far = { x: ctx.cx + 220, y: ctx.cy + 14 };
    const vis = { near: 1, far: 1 };

    const bodies = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const bones = ctx.adopt(ctx.scene.add.graphics().setDepth(6.5));
    const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const on = { xray: false, swell: 1 };
    ctx.onFrame((_dt, elapsed) => {
      bodies.clear(); bones.clear(); rings.clear();
      const t = elapsed / 1000;
      for (const [m, a] of [[near, vis.near], [far, vis.far]] as [typeof near, number][]) {
        bodies.fillStyle(0x2b2f3d, a); bodies.fillCircle(m.x, m.y, 17);
        bodies.fillStyle(0x3c4254, a); bodies.fillCircle(m.x, m.y, 13);
        bodies.fillStyle(0x8e97ad, 0.9 * a);
        bodies.fillCircle(m.x - 5, m.y - 4, 3.2); bodies.fillCircle(m.x + 5, m.y - 4, 3.2);
        // The swollen hitbox, drawn so the 33% is something you can see rather than read.
        rings.lineStyle(1.4, ctx.tint(RAD.neon), on.xray ? 0.55 : 0.18);
        rings.strokeCircle(m.x, m.y, 22 * on.swell);
        if (on.xray) boneOverlay(bones, ctx.tint, m.x, m.y, 0.85, t, 1);
      }
    });

    // The screen-space wash, breathing exactly as the kit's does.
    const wash = ctx.adopt(ctx.scene.add.rectangle(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h,
      ctx.tint(RAD.neon), 0).setDepth(19));
    ctx.onFrame((_dt, elapsed) => {
      wash.setFillStyle(ctx.tint(RAD.neon), on.xray ? 0.1 + 0.05 * Math.sin((elapsed / 1000) * 3) : 0);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);

    ctx.at(400, () => { vis.far = 0.05; readout.setText('one of them just went invisible — and stays gone'); });
    ctx.at(1800, () => {
      av.play('flex');
      suit(av)?.ping();
      on.xray = true; on.swell = 1.33;
      ctx.capture(() => { fx.stick(near.x, near.y); fx.stick(far.x, far.y); });
      float(ctx, ctx.cx, ctx.cy - 52, '☢ X-RAY', hex(RAD.neonLit), 13);
      readout.setText('bones are painted over the body and ignore its alpha entirely');
    });
    ctx.at(4200, () => readout.setText('and every enemy hitbox swells 33% — 22px becomes 29px'));
    ctx.at(6200, () => readout.setText('which is exactly what a three-tracer confirm chain was short of'));
    ctx.at(8200, () => {
      on.xray = false; on.swell = 1;
      readout.setText('8 seconds, 12-second cooldown — and the hitbox is handed straight back');
    });
  },
};

// ══ F — Waste Disposal ════════════════════════════════════════════════

export const waste: PreviewScript = {
  duration: 13000,
  scale: 0.74,
  bodyTexture: '',
  caption: 'F — a 30-damage drum, an invincible fall backwards, and 7 pools sniped for 15 each',
  run(ctx) {
    const fx = fxOf(ctx);
    const at = { x: ctx.w * 0.45, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-radiation')) {
      const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-radiation').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    ctx.onFrame((dt) => { av.setFacing(ctx.aim); av.update(dt, at.x, at.y, 1); });

    const victim = { x: at.x + 200, y: ctx.cy };
    dummyAt(ctx, victim);
    const dose = { left: 0 };
    doseMarker(ctx, victim, () => dose.left);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e0b52a', 11);

    // The drum: 340 px/s for up to 520ms, arming as it rolls.
    const drum = { x: 0, y: 0, roll: 0, live: false, t: 0 };
    const pools: { x: number; y: number; r: number; seed: number }[] = [];
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      ground.clear(); air.clear();
      const t = elapsed / 1000;
      for (const p of pools) radPuddle(ground, ctx.tint, p.x, p.y, p.r, 0.9, p.seed, t);
      if (!drum.live) return;
      const s = dt / 1000;
      drum.t += s;
      drum.x += 340 * s;
      drum.roll += s * 7;
      wasteDrum(air, ctx.tint, drum.x, drum.y, drum.roll, 0.98,
        { arm: Phaser.Math.Clamp(drum.t / 0.52, 0, 1) });
    });

    ctx.at(400, () => {
      av.play('slam', ctx.aim);
      drum.x = at.x + 30; drum.y = at.y; drum.live = true; drum.t = 0;
      readout.setText('the drum rolls out at 340 px/s, arming as it goes');
    });
    ctx.at(920, () => {
      drum.live = false;
      ctx.capture(() => {
        fx.rail(at.x + 18, at.y - 2, drum.x, drum.y);
        fx.drumBlast(drum.x, drum.y, 132);
      });
      float(ctx, victim.x, victim.y - 24, '30', '#ffb3aa', 16);
      dose.left = 1;
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
      // Seven pools, 30–125px out at jittered angles, exactly as the spray scatters them.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + (i * 0.37) % 0.6;
        const d = 30 + ((i * 53) % 100) * 1.25;
        pools.push({
          x: drum.x + Math.cos(a) * d, y: drum.y + Math.sin(a) * d,
          r: 42 * (0.75 + ((i * 37) % 50) / 100), seed: i * 91,
        });
      }
      readout.setText('30 damage inside 132px, a dose on everything, and 7 live pools');
    });
    // The fall: 620 px/s decaying to zero over 720ms, straight back down the throw line.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 920 || elapsed > 1640) return;
      const k = Phaser.Math.Clamp((1640 - elapsed) / 720, 0, 1);
      at.x -= 620 * k * (dt / 1000);
    });
    ctx.at(1000, () => float(ctx, at.x, at.y - 46, '🛡 UNTOUCHABLE', hex(RAD.neonLit), 11));
    ctx.at(1700, () => readout.setText('720ms of invincible flight away from what you just detonated'));

    // The sweep: nearest first, one every 120ms, starting 120ms after landing.
    for (let i = 0; i < 7; i++) {
      ctx.at(2400 + i * 120, () => {
        if (!pools.length) return;
        let best = 0;
        for (let j = 1; j < pools.length; j++) {
          if (Phaser.Math.Distance.Between(at.x, at.y, pools[j].x, pools[j].y)
            < Phaser.Math.Distance.Between(at.x, at.y, pools[best].x, pools[best].y)) best = j;
        }
        const p = pools.splice(best, 1)[0];
        ctx.capture(() => { fx.rail(at.x + 18, at.y - 2, p.x, p.y); fx.puddleShot(p.x, p.y, p.r); });
        if (Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= 74) {
          float(ctx, victim.x, victim.y - 24, '15', '#ffb3aa', 13);
          dose.left = 1;
        }
      });
    }
    ctx.at(2500, () => readout.setText('he snipes them himself — nearest first, one every 120ms'));
    ctx.at(4200, () => readout.setText('15 damage inside 74px each, and every one of them irradiates'));
    ctx.at(6000, () => readout.setText('standing in a live pool is a fresh 10-second dose every second'));
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 10; });
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
      readout.setText('200 to every enemy on screen — and 200 to you, through self-damage');
    });
    ctx.at(8600, () => readout.setText('four on one and one stray is "✖ NO CONFIRMATION" and forty seconds gone'));
    ctx.at(11200, () => readout.setText('half your own health bar: this is a closer, not an opener'));
  },
};

// ══ PASSIVE — Critical Mission ════════════════════════════════════════

export const criticalMission: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'Passive — +50% speed and +25% damage at the bell, halved every 12s, forever',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const rig = suit(av);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e0b52a', 12);
    const ladder = label(ctx, ctx.w * 0.5, ctx.h - 20, '#c2ff8f', 10);

    // The ladder, compressed: one rung every 2.4s of loop rather than every 12s of match.
    const charge = { v: 1 };
    ctx.onFrame(() => rig?.setDose(charge.v));
    const rung = (at: number, tier: number): void => ctx.at(at, () => {
      charge.v = 0.5 ** tier;
      if (tier > 0) {
        ctx.capture(() => fx.dose(ctx.cx, ctx.cy));
        float(ctx, ctx.cx, ctx.cy - 54, `☢ DOSE SPENT · ${Math.round(charge.v * 100)}%`,
          hex(RAD.hazard), 12);
      }
      readout.setText(`${tier * 12}s in   —   +${Math.round(50 * charge.v)}% speed, +${(25 * charge.v).toFixed(1)}% damage`);
      ladder.setText(`railgun ${Math.round(50 * (1 + 0.25 * charge.v))}   ·   baton ${Math.round(15 * (1 + 0.25 * charge.v))}   ·   airdrop ${Math.round(200 * (1 + 0.25 * charge.v))}`);
    });
    for (let i = 0; i <= 4; i++) rung(400 + i * 2400, i);
    ctx.at(10600, () => {
      readout.setText('nothing refreshes it, nothing extends it, and there is nothing to spend');
      ladder.setText('it stops laddering after 8 halvings — at 96 seconds the character is spent');
    });
  },
};

// ══ PASSIVE — Irradiated ══════════════════════════════════════════════

export const irradiated: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Passive — 10 seconds in which every heal aimed at them lands as a hit instead',
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
    ctx.at(6200, () => readout.setText('a second dose refreshes the 10 seconds — there is no stack and no second tier'));
    ctx.at(8200, () => readout.setText('worth everything against something that heals, and nothing against something that does not'));
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / 10; });
  },
};

// ══ CLICK+ — Heart Stopper ════════════════════════════════════════════

export const railgunUpgraded: PreviewScript = {
  duration: 15000,
  scale: 0.83,
  caption: 'Click+ — tracers graded on how centred they land; a perfect set is 125 and leaves the line burning',
  run(ctx) {
    const fx = fxOf(ctx);
    const clock = clockOf(ctx);
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

    // Each stuck tracer keeps its own precision, so a bad one in the set is visibly the bad one.
    const stuck: number[] = [];
    const clamped = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame((_dt, elapsed) => {
      clamped.clear();
      if (!stuck.length) return;
      const t = elapsed / 1000;
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(t * (3 + stuck.length * 2.6)));
      let heat = 0;
      for (let i = 0; i < stuck.length; i++) {
        const a = t * 1.6 + (i / 3) * Math.PI * 2;
        heat += stuck[i] / stuck.length;
        geigerTracer(clamped, redshift(ctx.tint, stuck[i]),
          victim.x + Math.cos(a) * 20, victim.y + Math.sin(a) * 20 - 2,
          a + Math.PI / 2, 0.95, { lamp: blink, legs: true, scale: 0.85 });
      }
      pipsTinted(ctx, clamped, redshift(ctx.tint, heat), victim.x, victim.y - 46, stuck.length, 3, blink);
    });

    // The afterimage: a line lying across the arena, ticking whatever is standing in it.
    const ghost = { at: -1, x0: 0, y0: 0, x1: 0, y1: 0 };
    const ghostG = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      ghostG.clear();
      if (ghost.at < 0) return;
      const left = Phaser.Math.Clamp(1 - (elapsed - ghost.at) / 4000, 0, 1);
      if (left <= 0) { ghost.at = -1; return; }
      afterimageLance(ghostG, ctx.tint, ghost.x0, ghost.y0, ghost.x1, ghost.y1, 0.95, left,
        elapsed / 1000);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff9b84', 11);

    const tag = (at: number, precision: number): void => ctx.at(at, () => {
      const off = (1 - precision) * 32;
      const aim = { x: victim.x, y: victim.y + off };
      const ang = Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x);
      av.play('punch', ang);
      suit(av)?.ping();
      shoot(ctx, clamped, {
        kind: 'tracer', from: muzzle, ang, target: victim, range: 700,
        onLand: () => {
          stuck.push(precision);
          ctx.capture(() => {
            fx.stick(victim.x, victim.y);
            if (precision > 0.55) fx.heartbeat(victim.x, victim.y, precision);
          });
          if (stuck.length < 3) {
            float(ctx, victim.x, victim.y - 40, `TRACER ${stuck.length}/3 · ${Math.round(precision * 100)}%`,
              hex(precision > 0.75 ? RAD.hot : RAD.hazard), 11);
            return;
          }
          const heat = stuck.reduce((a, b) => a + b, 0) / stuck.length;
          stuck.length = 0;
          const ra = Math.atan2(victim.y - muzzle.y, victim.x - muzzle.x);
          ctx.capture(() => { fx.rail(muzzle.x, muzzle.y, victim.x, victim.y); fx.railHit(victim.x, victim.y, ra); });
          dose.left = 1;
          float(ctx, victim.x, victim.y - 62, `☢ CONFIRMED · ${Math.round(heat * 100)}%`,
            hex(heat > 0.5 ? RAD.hot : RAD.core), 12);
          float(ctx, victim.x, victim.y - 24, `${Math.round(50 * (1 + 1.5 * heat))}`, '#ffb3aa', 20);
          if (heat >= 0.85) {
            float(ctx, muzzle.x, muzzle.y - 62, '❤ HEART STOPPER', hex(RAD.hot), 12);
            // Through the body and on to the wall — the shot was aimed *through* them.
            ghost.x0 = muzzle.x; ghost.y0 = muzzle.y;
            ghost.x1 = victim.x + (victim.x - muzzle.x) * 0.5;
            ghost.y1 = victim.y + (victim.y - muzzle.y) * 0.5;
            ghost.at = clock.t;
          }
        },
      }, live);
    });

    ctx.at(300, () => readout.setText('every tracer now reports how close to their centre line it landed'));
    tag(700, 0.34);
    tag(1700, 0.52);
    tag(2700, 0.41);
    ctx.at(3600, () => readout.setText('a sloppy set: 42% average, so the railgun lands for 81 instead of 50'));
    ctx.at(5800, () => readout.setText('the same three clicks, aimed properly'));
    tag(6300, 0.97);
    tag(7300, 0.93);
    tag(8300, 0.99);
    ctx.at(8800, () => {
      readout.setText('96% average — 125 damage, and the beam comes out red');
    });
    ctx.at(9300, () => readout.setText('and the line does not go out: 4 seconds, 6 damage every 0.4s to anything in it'));
    ctx.at(12200, () => readout.setText('walking off the line is the answer — it is a shot left lying there, not a debuff'));
  },
};

/** `pips` with an explicit palette, so a Heart Stopper counter can be drawn red. */
function pipsTinted(
  ctx: PreviewCtx, g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
  x: number, y: number, filled: number, total: number, glow: number,
): void {
  void ctx;
  const w = 8, gap = 3;
  const span = total * w + (total - 1) * gap;
  for (let i = 0; i < total; i++) {
    const px = x - span / 2 + w / 2 + i * (w + gap);
    const on = i < filled;
    g.fillStyle(tint(RAD.ink), 0.75);
    g.fillRect(px - w / 2 - 1, y - 4, w + 2, 8);
    g.fillStyle(tint(on ? RAD.neon : RAD.leadDeep), on ? 0.55 + glow * 0.45 : 0.85);
    g.fillRect(px - w / 2, y - 3, w, 6);
    if (on) {
      g.fillStyle(tint(RAD.core), 0.5 + glow * 0.5);
      g.fillRect(px - w / 2 + 1.6, y - 1.4, w - 3.2, 2.8);
    }
  }
}

// ══ E+ — Exposure ═════════════════════════════════════════════════════

export const batonUpgraded: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E+ — every swing on a dosed target promotes them: 3s stun at level 2, a launch at level 3',
  run(ctx) {
    const fx = fxOf(ctx);
    const at = { x: ctx.w * 0.3, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-radiation')) {
      const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-radiation').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    ctx.onFrame((dt) => { av.setFacing(ctx.aim); av.update(dt, at.x, at.y, 1); });

    const victim = { x: at.x + 170, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const dose = { left: 0, level: 0, slashIn: 3 };
    doseLadder(ctx, victim, () => dose);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff9b84', 11);

    // Level 2's bleed and level 3's arm, on their real clocks.
    ctx.onFrame((dt) => {
      const s = dt / 1000;
      if (dose.level >= 2) dose.left -= s / (10 * (dose.level === 2 ? 2 : 4));
      else if (dose.level) dose.left -= s / 10;
      if (dose.level < 3) return;
      dose.slashIn -= s;
      if (dose.slashIn > 0) return;
      dose.slashIn = 3;
      ctx.capture(() => fx.clawSlash(victim.x, victim.y, 1.1));
      float(ctx, victim.x, victim.y - 34, '🦠 ITS OWN ARM', hex(RAD.flesh), 10);
      float(ctx, victim.x, victim.y - 20, '10', '#ffb3aa', 13);
    });
    // Level 2's 3-a-second bleed.
    let bleed = 0;
    ctx.onFrame((dt) => {
      if (dose.level < 2) return;
      bleed += dt;
      if (bleed < 1000) return;
      bleed = 0;
      float(ctx, victim.x + 16, victim.y - 8, '3', '#ffb3aa', 10);
    });

    const swing = { start: -1, ang: 0, x: 0, y: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (swing.start < 0) return;
      const t = (elapsed - swing.start) / 300;
      if (t >= 1) { swing.start = -1; return; }
      const a = swing.ang - 0.95 + t * 1.9;
      const ex = swing.x + Math.cos(a) * 104;
      const ey = swing.y + Math.sin(a) * 104;
      g.lineStyle(6, ctx.tint(RAD.leadDeep), 0.95 * (1 - t * 0.4));
      g.lineBetween(swing.x, swing.y, ex, ey);
      g.lineStyle(2.4, ctx.tint(RAD.neon), 0.9 * (1 - t * 0.4));
      g.lineBetween(swing.x + Math.cos(a) * 30, swing.y + Math.sin(a) * 30, ex, ey);
      trefoil(g, ctx.tint, ex, ey, 7, 0.9 * (1 - t), { phase: t * 8 });
    });

    // Level 3's knockback: 900 px/s easing to zero over 420ms.
    const launch = { at: -1 };
    ctx.onFrame((dt, elapsed) => {
      if (launch.at < 0 || elapsed - launch.at > 420) return;
      const k = Phaser.Math.Clamp(1 - (elapsed - launch.at) / 420, 0, 1);
      victim.x += 900 * k * (dt / 1000);
    });

    const hit = (at0: number, then: () => void): void => {
      ctx.at(at0, () => {
        av.play('sweep', ctx.aim);
        swing.start = at0; swing.ang = ctx.aim; swing.x = at.x; swing.y = at.y;
        ctx.capture(() => fx.batonArc(at.x, at.y, ctx.aim, 104));
        float(ctx, victim.x, victim.y - 24, '15', '#ffb3aa', 15);
        then();
      });
    };

    ctx.at(300, () => readout.setText('a clean target still just gets the dose — the opener is unchanged'));
    hit(900, () => {
      dose.left = 1; dose.level = 1;
      ctx.capture(() => fx.dose(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
    });
    ctx.at(2200, () => readout.setText('but the second swing promotes rather than merely stunning'));
    hit(3200, () => {
      dose.left = 1; dose.level = 2;
      ctx.capture(() => fx.dose(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED II', hex(RAD.hazard), 12);
      float(ctx, victim.x, victim.y - 66, '⚡ STUNNED 3s', hex(RAD.hazard), 10);
    });
    ctx.at(4400, () => readout.setText('level 2: 20 seconds, 3 damage a second, and every buff they get decays twice as fast'));
    ctx.at(6600, () => readout.setText('the third swing takes them to the top of the ladder'));
    hit(7600, () => {
      dose.left = 1; dose.level = 3; dose.slashIn = 3;
      ctx.capture(() => { fx.dose(victim.x, victim.y); fx.drumBlast(victim.x, victim.y, 54); });
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED III', hex(RAD.hot), 12);
      float(ctx, victim.x, victim.y - 66, '☢ EXPOSED', hex(RAD.hot), 11);
      launch.at = 7600;
    });
    ctx.at(8400, () => readout.setText('no stun at all now — 900 px/s down the swing line, roughly 190px of travel'));
    ctx.at(10200, () => readout.setText('level 3: 40 seconds, and they have grown an arm that opens them for 10 every 3s'));
    ctx.at(12400, () => readout.setText('three swings and they are carrying the worst status in the game for 40 seconds'));
  },
};

// ══ R+ — Final Vision ═════════════════════════════════════════════════

export const xrayUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R+ — every enemy hitbox shrinks 33% instead of swelling, and three tracers fire a 5s held beam',
  run(ctx) {
    const fx = fxOf(ctx);
    const clock = clockOf(ctx);
    const at = { x: ctx.w * 0.28, y: ctx.cy };
    const shrink = { k: 1 };
    const body = ctx.scene.textures.exists('elem-radiation')
      ? ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-radiation').setDepth(5))
      : null;
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    ctx.onFrame((dt) => {
      av.setFacing(ctx.aim);
      av.setRigScale(shrink.k);
      av.update(dt, at.x, at.y, 1);
      body?.setPosition(at.x, at.y).setScale(shrink.k);
    });

    const victim = { x: at.x + 320, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const dose = { left: 0, level: 0, slashIn: 3 };
    doseLadder(ctx, victim, () => dose);
    const on = { xray: false, hitbox: 1 };

    // Bones and the wash, both on the hot ladder.
    const bones = ctx.adopt(ctx.scene.add.graphics().setDepth(6.5));
    const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      bones.clear(); rings.clear();
      const t = elapsed / 1000;
      rings.lineStyle(1.4, redshift(ctx.tint, 1)(RAD.neon), on.xray ? 0.55 : 0.18);
      rings.strokeCircle(victim.x, victim.y, 22 * on.hitbox);
      rings.lineStyle(1.4, redshift(ctx.tint, 1)(RAD.neonLit), 0.5);
      rings.strokeCircle(at.x, at.y, 22 * shrink.k);
      if (on.xray) boneOverlay(bones, redshift(ctx.tint, 1), victim.x, victim.y, 0.85, t, 1);
    });
    const wash = ctx.adopt(ctx.scene.add.rectangle(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h,
      redshift(ctx.tint, 1)(RAD.neon), 0).setDepth(19));
    ctx.onFrame((_dt, elapsed) => {
      wash.setFillStyle(redshift(ctx.tint, 1)(RAD.neon),
        on.xray ? 0.1 + 0.05 * Math.sin((elapsed / 1000) * 3) : 0);
    });

    const live: { x: number; y: number; ang: number; kind: 'tracer' | 'flare'; done: boolean }[] = [];
    airLayer(ctx, live);
    const stuck = { n: 0 };
    const clamped = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    ctx.onFrame((_dt, elapsed) => {
      clamped.clear();
      if (!stuck.n) return;
      const t = elapsed / 1000;
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(t * (3 + stuck.n * 2.6)));
      for (let i = 0; i < stuck.n; i++) {
        const a = t * 1.6 + (i / 3) * Math.PI * 2;
        geigerTracer(clamped, redshift(ctx.tint, 1), victim.x + Math.cos(a) * 20,
          victim.y + Math.sin(a) * 20 - 2, a + Math.PI / 2, 0.95,
          { lamp: blink, legs: true, scale: 0.85 });
      }
    });

    // The beam: five seconds of held lance, climbing a rung every 1.7.
    const beam = { at: -1, bite: 0 };
    const beamG = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      beamG.clear();
      if (beam.at < 0) return;
      const run = elapsed - beam.at;
      if (run > 5000) { beam.at = -1; av.setHold(null); return; }
      sustainedBeam(beamG, ctx.tint, at.x + 18, at.y - 2, victim.x, victim.y, 1,
        elapsed / 1000, beam.bite);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff9b84', 11);

    const tag = (at0: number): void => ctx.at(at0, () => {
      const ang = Math.atan2(victim.y - at.y, victim.x - at.x);
      av.play('punch', ang);
      shoot(ctx, clamped, {
        kind: 'tracer', from: { x: at.x + 18, y: at.y - 2 }, ang, target: victim, range: 700,
        onLand: () => {
          stuck.n++;
          ctx.capture(() => fx.stick(victim.x, victim.y));
          if (stuck.n < 3) {
            float(ctx, victim.x, victim.y - 40, `TRACER ${stuck.n}/3`, hex(RAD.hot), 11);
            return;
          }
          stuck.n = 0;
          beam.at = clock.t;
          dose.left = 1; dose.level = 1;
          av.setHold('reach', ang);
          float(ctx, at.x, at.y - 64, '☢ FINAL VISION', hex(RAD.hot), 12);
          readout.setText('the confirm does not fire the railgun — it opens the beam');
        },
      }, live);
    });

    ctx.at(400, () => {
      on.xray = true; shrink.k = 0.67; on.hitbox = 0.67;
      suit(av)?.ping();
      av.play('flex');
      ctx.capture(() => fx.heartbeat(at.x, at.y, 1));
      float(ctx, at.x, at.y - 52, '☢ FINAL VISION', hex(RAD.hot), 13);
      float(ctx, victim.x, victim.y - 56, '◎ 67% HITBOX', hex(RAD.hot), 12);
      readout.setText('everything goes red, and their hitbox is pulled in rather than pushed out');
    });
    ctx.at(1800, () => readout.setText('their catch radius drops to 67% — 22px becomes about 15px, on every range check in the kit'));
    ctx.at(3400, () => readout.setText('the operative shrinks with them: harder to hit while each chain takes longer'));
    tag(4600);
    tag(5500);
    tag(6400);
    let tick = 0;
    const steps = [false, false];
    ctx.onFrame((dt, elapsed) => {
      if (beam.at < 0) return;
      const run = elapsed - beam.at;
      beam.bite = Phaser.Math.Clamp(run / 5000, 0, 1);
      if (dose.level) dose.left = Math.max(0, dose.left - (dt / 1000) / (10 * (dose.level === 3 ? 4 : dose.level === 2 ? 2 : 1)));
      tick += dt;
      if (tick >= 500) { tick = 0; float(ctx, victim.x, victim.y - 20, '11', '#ffb3aa', 12); }
      if (run > 1700 && !steps[0]) {
        steps[0] = true; dose.level = 2; dose.left = 1;
        float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED II', hex(RAD.hazard), 12);
      }
      if (run > 3400 && !steps[1]) {
        steps[1] = true; dose.level = 3; dose.left = 1; dose.slashIn = 3;
        float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED III', hex(RAD.hot), 12);
      }
    });
    ctx.at(8200, () => readout.setText('22 damage a second for 5 seconds — 110 total against a railgun\'s 50, and your Click is locked for all of it'));
    ctx.at(10600, () => readout.setText('a rung of irradiation every 1.7 seconds: the only route to level 3 that is not an E'));
    ctx.at(13400, () => readout.setText('what you bought is a harder shot that is worth more than twice as much when it lands'));
  },
};

// ══ F+ — Cutdown ══════════════════════════════════════════════════════

export const wasteUpgraded: PreviewScript = {
  duration: 17000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'F+ — a direct drum buys a 6-shot revolver, and under Final Vision it goes SUPERCRITICAL',
  run(ctx) {
    const fx = fxOf(ctx);
    const at = { x: ctx.w * 0.34, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-radiation')) {
      const b = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-radiation').setDepth(5));
      ctx.onFrame(() => b.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    ctx.onFrame((dt) => { av.setFacing(ctx.aim); av.update(dt, at.x, at.y, 1); });

    const victim = { x: at.x + 210, y: ctx.cy };
    dummyAt(ctx, victim);
    const dose = { left: 0, level: 0, slashIn: 3 };
    doseLadder(ctx, victim, () => dose);
    ctx.onFrame((dt) => { if (dose.left > 0) dose.left -= (dt / 1000) / (10 * (dose.level || 1)); });
    const readout = label(ctx, ctx.w * 0.5, 12, '#e0b52a', 11);

    // The drum, rolled straight into them rather than merely near them.
    const drum = { x: 0, y: 0, roll: 0, live: false, t: 0 };
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    // The sidearm, and Supercritical's plates.
    const gun = { out: false, spent: 0, recoil: 0, ang: 0 };
    const sup = { on: false, bare: false };
    ctx.onFrame((dt, elapsed) => {
      air.clear();
      const t = elapsed / 1000;
      if (drum.live) {
        const s = dt / 1000;
        drum.t += s; drum.x += 340 * s; drum.roll += s * 7;
        wasteDrum(air, ctx.tint, drum.x, drum.y, drum.roll, 0.98,
          { arm: Phaser.Math.Clamp(drum.t / 0.52, 0, 1) });
      }
      gun.recoil = Math.max(0, gun.recoil - dt / 140);
      if (gun.out) {
        revolver(air, ctx.tint, at.x + 18, at.y - 2, gun.ang, 1,
          { spent: gun.spent, recoil: gun.recoil });
      }
      if (!sup.on) return;
      if (sup.bare) criticalAura(air, ctx.tint, at.x, at.y, 130, 0.85, t);
      else leadArmour(air, ctx.tint, at.x, at.y, 0.95, t, { clamp: 1 });
    });

    ctx.at(300, () => readout.setText('Final Vision is already up — that is the one thing Supercritical needs'));
    ctx.at(900, () => {
      av.play('slam', ctx.aim);
      drum.x = at.x + 30; drum.y = at.y; drum.live = true; drum.t = 0;
      readout.setText('and this drum is rolled straight into them, not merely near them');
    });
    ctx.at(1520, () => {
      drum.live = false;
      ctx.capture(() => { fx.rail(at.x + 18, at.y - 2, drum.x, drum.y); fx.drumBlast(drum.x, drum.y, 132); });
      float(ctx, victim.x, victim.y - 24, '30', '#ffb3aa', 16);
      dose.left = 1; dose.level = 1;
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
      float(ctx, at.x, at.y - 60, '🔫 CUTDOWN', hex(RAD.hazard), 12);
      gun.out = true; gun.spent = 0;
      readout.setText('within 30px of a body is a direct hit — and it buys the revolver');
    });
    for (let i = 0; i < 6; i++) {
      ctx.at(1700 + i * 110, () => {
        gun.spent = i + 1;
        gun.recoil = 1;
        gun.ang = Math.atan2(victim.y - at.y, victim.x - at.x);
        ctx.capture(() => {
          fx.pistolShot(at.x + 18, at.y - 2, victim.x, victim.y);
          fx.casing(at.x + 18, at.y - 2);
        });
        float(ctx, victim.x + (i - 3) * 6, victim.y - 14, '5', '#ffb3aa', 11);
      });
    }
    ctx.at(2500, () => readout.setText('six rounds of 5, fired while you are still falling backwards — 30 for free'));
    ctx.at(3400, () => {
      gun.out = false;
      sup.on = true;
      ctx.capture(() => fx.armourOn(at.x, at.y));
      float(ctx, at.x, at.y - 74, '☢☢ SUPERCRITICAL ☢☢', hex(RAD.core), 13);
      readout.setText('a direct hit under Final Vision: 8 seconds, and the mission is read twice as hard');
    });
    ctx.at(5000, () => readout.setText('+100% speed and +50% damage at full charge — it doubles whatever is left'));
    ctx.at(6600, () => {
      sup.bare = true;
      ctx.capture(() => fx.armourBreak(at.x, at.y));
      float(ctx, at.x, at.y - 58, '🛡 40 BLOCKED', hex(RAD.hazard), 12);
      readout.setText('the lead eats one hit outright, whatever its size — and then it is off');
    });
    ctx.at(7400, () => {
      dose.level = 2; dose.left = 1;
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED II', hex(RAD.hazard), 11);
      readout.setText('bare: everything within 130px is dosed every second and climbs a rung every 3');
    });
    ctx.at(9600, () => {
      sup.bare = false;
      ctx.capture(() => fx.armourOn(at.x, at.y));
      float(ctx, at.x, at.y - 54, '🛡 ARMOUR RESET', hex(RAD.hazard), 11);
      readout.setText('and the plates re-clamp 3 seconds later, ready to eat another one');
    });
    ctx.at(11800, () => {
      sup.on = false;
      dose.level = 3; dose.slashIn = 3;
      float(ctx, at.x, at.y - 70, '☢☢ MELTDOWN ☢☢', hex(RAD.hot), 13);
      readout.setText('at 25% charge or less the come-down is a meltdown, on you');
    });
    let melt = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 11800 || elapsed > 15800) return;
      melt += dt;
      if (melt < 400) return;
      melt = 0;
      ctx.capture(() => fx.meltdown(at.x, at.y));
      float(ctx, at.x, at.y - 20, '6', '#ffb3aa', 11);
    });
    ctx.at(13400, () => readout.setText('6 every 0.4s for 4 seconds, and level 3 irradiation on yourself'));
    ctx.at(15400, () => readout.setText('above a quarter charge it prints STABLE and does nothing — it is only late that it bites'));
  },
};

// ══ Q+ — Finality ═════════════════════════════════════════════════════

export const exterminationUpgraded: PreviewScript = {
  duration: 15000,
  scale: 0.8,
  caption: 'Q+ — the airdrop leaves 40 pools across the whole floor and level 3 on everybody, you included',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 300, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const dose = { left: 0, level: 0, slashIn: 3 };
    const mine = { left: 0, level: 0, slashIn: 3 };
    doseLadder(ctx, victim, () => dose);
    doseLadder(ctx, { x: ctx.cx, y: ctx.cy }, () => mine);
    ctx.onFrame((dt) => {
      const s = (dt / 1000) / 40;
      if (dose.left > 0) dose.left -= s;
      if (mine.left > 0) mine.left -= s;
      if (dose.level < 3) return;
      dose.slashIn -= dt / 1000;
      if (dose.slashIn > 0) return;
      dose.slashIn = 3;
      ctx.capture(() => fx.clawSlash(victim.x, victim.y, 1.1));
      float(ctx, victim.x, victim.y - 20, '10', '#ffb3aa', 12);
    });

    const drop = { at: -1 };
    const foot = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const pools: { x: number; y: number; r: number; seed: number }[] = [];
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      foot.clear(); ground.clear();
      const t = elapsed / 1000;
      for (const p of pools) radPuddle(ground, ctx.tint, p.x, p.y, p.r, 0.9, p.seed, t);
      if (drop.at < 0) return;
      const k = Phaser.Math.Clamp(1 - (drop.at - elapsed) / 1700, 0, 1);
      if (k >= 1) return;
      dropFootprint(foot, ctx.tint, ctx.w / 2, ctx.h / 2, Math.max(ctx.w, ctx.h) * 0.62, 0.95, k, t);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#7cff3d', 11);

    ctx.at(400, () => {
      drop.at = 2600;
      av.play('raise'); suit(av)?.ping();
      float(ctx, ctx.cx, ctx.cy - 70, '☢☢ AIRDROP INBOUND ☢☢', hex(RAD.core), 13);
      readout.setText('five flares landed — the confirmation is unchanged, what it leaves behind is not');
    });
    ctx.at(2600, () => {
      ctx.capture(() => fx.airdrop(ctx.w / 2, ctx.h / 2));
      float(ctx, victim.x, victim.y - 24, '200', '#ffb3aa', 20);
      float(ctx, ctx.cx, ctx.cy - 24, '200', '#ffb3aa', 20);
      dose.left = 1; dose.level = 3; dose.slashIn = 3;
      mine.left = 1; mine.level = 3;
      float(ctx, victim.x, victim.y - 48, '☢ IRRADIATED III', hex(RAD.hot), 12);
      // 40 pools on a sunflower spiral — the same layout the kit lays down.
      for (let i = 0; i < 40; i++) {
        const k = (i + 0.5) / 40;
        const a = i * 2.399963;
        const d = Math.sqrt(k);
        pools.push({
          x: Phaser.Math.Clamp(ctx.w / 2 + Math.cos(a) * (ctx.w / 2) * d * 0.98, 20, ctx.w - 20),
          y: Phaser.Math.Clamp(ctx.h / 2 + Math.sin(a) * (ctx.h / 2) * d * 0.98, 20, ctx.h - 20),
          r: 42 * (0.6 + ((i * 37) % 50) / 100),
          seed: i * 91,
        });
      }
      float(ctx, ctx.cx, ctx.cy - 96, '☢ 40 POOLS · FALLOUT', hex(RAD.neon), 12);
      readout.setText('40 pools across the whole floor, and level 3 on everybody standing on it');
    });
    ctx.at(5000, () => readout.setText('40 seconds of inverted healing, 3 damage a second and the arm — for both of you'));
    ctx.at(7400, () => readout.setText('they are ordinary Waste Disposal pools, so the next F sweeps every one of them'));
    // The sweep, picking them off.
    for (let i = 0; i < 18; i++) {
      ctx.at(8600 + i * 130, () => {
        if (!pools.length) return;
        let best = 0;
        for (let j = 1; j < pools.length; j++) {
          if (Phaser.Math.Distance.Between(ctx.cx, ctx.cy, pools[j].x, pools[j].y)
            < Phaser.Math.Distance.Between(ctx.cx, ctx.cy, pools[best].x, pools[best].y)) best = j;
        }
        const p = pools.splice(best, 1)[0];
        ctx.capture(() => { fx.rail(ctx.cx + 18, ctx.cy - 2, p.x, p.y); fx.puddleShot(p.x, p.y, p.r); });
      });
    }
    ctx.at(9000, () => readout.setText('15 damage apiece — 600 of ammunition, if they stay anywhere near the crater'));
    ctx.at(12600, () => readout.setText('the ultimate stops being a full stop and becomes the setup for the next F'));
  },
};

// ══ MASTERY — Sniper's Instinct ═══════════════════════════════════════

export const masteryInstinct: PreviewScript = {
  duration: 15000,
  // Wider than the house framing because the loop is *about* a 140→620px ramp: at 0.9 the
  // whole passive would resolve inside a third of the box and the point would be invisible.
  scale: 0.66,
  caption: "Passive — 0% armour in melee up to 45% at 620px, and a sight that ends where the click would",
  run(ctx) {
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    const me = { x: ctx.cx, y: ctx.cy };
    const muzzle = { x: ctx.cx + 18, y: ctx.cy - 2 };
    const mark = { x: ctx.cx + 150, y: ctx.cy - 8 };
    dummyAt(ctx, mark);
    ctx.onFrame(() => av.setFacing(Math.atan2(mark.y - me.y, mark.x - me.x)));

    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 12);
    const armour = label(ctx, ctx.w * 0.5, ctx.h - 20, '#e0b52a', 11);

    // The mark walks out and back, so the ramp is something watched rather than read.
    const walk = { on: false, vx: 105 };
    ctx.onFrame((dt) => {
      if (walk.on) mark.x = Phaser.Math.Clamp(mark.x + walk.vx * (dt / 1000), me.x + 60, ctx.w - 46);
      const d = Phaser.Math.Distance.Between(me.x, me.y, mark.x, mark.y);
      const cut = Phaser.Math.Clamp((d - 140) / (620 - 140), 0, 1) * 0.45;
      armour.setText(`range ${Math.round(d)}px   ·   −${Math.round(cut * 100)}% damage taken   ·   a 40 lands for ${Math.round(40 * (1 - cut))}`);
    });

    // The sight, drawn exactly as the kit draws it: it stops at the body, or at the wall, or at
    // the 700px where a tracer simply runs out.
    const cursor = { x: 0, y: 0 };
    const sight = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    ctx.onFrame((_dt, elapsed) => {
      sight.clear();
      const t = elapsed / 1000;
      // A cursor sweeping through the mark and off it, so both reticles get shown every loop.
      cursor.x = mark.x + 90;
      cursor.y = mark.y + Math.sin(t * 1.15) * 150;
      const ang = Math.atan2(cursor.y - muzzle.y, cursor.x - muzzle.x);
      const cx = Math.cos(ang);
      const cy = Math.sin(ang);
      let stop = 700;
      if (cx > 1e-4) stop = Math.min(stop, (ctx.w - 14 - muzzle.x) / cx);
      else if (cx < -1e-4) stop = Math.min(stop, (14 - muzzle.x) / cx);
      if (cy > 1e-4) stop = Math.min(stop, (ctx.h - 14 - muzzle.y) / cy);
      else if (cy < -1e-4) stop = Math.min(stop, (14 - muzzle.y) / cy);
      stop = Math.max(0, stop);
      const rr = 17 + 18;
      const along = (mark.x - muzzle.x) * cx + (mark.y - muzzle.y) * cy;
      const perp = Math.abs((mark.y - muzzle.y) * cx - (mark.x - muzzle.x) * cy);
      let onBody = false;
      let px = muzzle.x + cx * stop;
      let py = muzzle.y + cy * stop;
      if (along > 0 && perp <= rr && along - Math.sqrt(Math.max(0, rr * rr - perp * perp)) <= stop) {
        onBody = true;
        px = mark.x;
        py = mark.y;
      }
      sightLine(sight, ctx.tint, muzzle.x, muzzle.y, px, py, 0.95, t, onBody);
    });

    ctx.at(300, () => readout.setText('in his face, the armour is worth nothing at all'));
    ctx.at(1800, () => { walk.on = true; readout.setText('every pixel of separation is worth something…'); });
    ctx.at(5200, () => readout.setText('…up to 45% less at 620px, measured live off whichever enemy is nearest'));
    ctx.at(7600, () => { walk.vx = -150; readout.setText('and it is given straight back the moment they close'); });
    ctx.at(10000, () => { walk.vx = 130; readout.setText('the line ends where the next click would: green on a body, yellow on floor'); });
    ctx.at(12800, () => readout.setText('no new information — just the maths the click was already running, drawn'));
  },
};

// ══ MASTERY — Gamma Tether ════════════════════════════════════════════

export const masteryTether: PreviewScript = {
  duration: 15000,
  scale: 0.78,
  caption: 'Mastery — a post that chains the nearest enemy inside 150px of it, and stops their dose running down',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new RadiationAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    av.setFacing(ctx.aim);

    const post = { x: ctx.cx + 330, y: ctx.cy + 8, plantedAt: -1, until: -1, latched: false, taut: 0 };
    const mark = { x: ctx.w - 60, y: ctx.cy - 8 };
    dummyAt(ctx, mark);
    const dose = { left: 0, paused: false };
    doseMarker(ctx, mark, () => dose.left);
    ctx.onFrame((dt) => { if (dose.left > 0 && !dose.paused) dose.left -= (dt / 1000) / 10; });
    const readout = label(ctx, ctx.w * 0.5, 12, '#c2ff8f', 11);
    const clock = label(ctx, ctx.w * 0.5, ctx.h - 20, '#e0b52a', 11);
    ctx.onFrame(() => clock.setText(dose.paused
      ? `dose ${(dose.left * 10).toFixed(1)}s — HELD`
      : `dose ${Math.max(0, dose.left * 10).toFixed(1)}s`));

    // The post and its chain, through the kit's own painters.
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      air.clear();
      if (post.plantedAt < 0 || elapsed >= post.until) return;
      const t = elapsed / 1000;
      leashRing(ground, ctx.tint, post.x, post.y, 150, 0.9, t, post.taut);
      if (post.latched) {
        gammaChain(air, ctx.tint, post.x, post.y - 17, mark.x, mark.y, 0.95, t, post.taut);
      }
      tetherAnchor(air, ctx.tint, post.x, post.y, 0.98, t, {
        charge: Phaser.Math.Clamp((post.until - elapsed) / 6000, 0, 1),
        latched: post.latched,
        plant: Phaser.Math.Clamp((elapsed - post.plantedAt) / 220, 0, 1),
      });
    });

    // The mark walks at the caster and is caught on the way past.
    const walk = { on: false };
    ctx.onFrame((dt, elapsed) => {
      if (walk.on) mark.x = Math.max(ctx.cx + 54, mark.x - 150 * (dt / 1000));
      if (post.plantedAt < 0 || elapsed >= post.until) return;
      const d = Phaser.Math.Distance.Between(post.x, post.y, mark.x, mark.y);
      if (!post.latched && d <= 260) {
        post.latched = true;
        dose.paused = true;
        ctx.capture(() => fx.chainSnap(post.x, post.y - 17, mark.x, mark.y));
        float(ctx, mark.x, mark.y - 58, '⛓ TETHERED', hex(RAD.neonLit), 12);
        readout.setText('caught at 260px — and from here they cannot leave a 150px circle');
      }
      if (!post.latched) return;
      post.taut = Phaser.Math.Clamp((d - 108) / 42, 0, 1);
      if (d <= 150) return;
      const ang = Math.atan2(mark.y - post.y, mark.x - post.x);
      mark.x = post.x + Math.cos(ang) * 150;
      mark.y = post.y + Math.sin(ang) * 150;
    });

    ctx.at(300, () => {
      dose.left = 1;
      ctx.capture(() => fx.dose(mark.x, mark.y));
      float(ctx, mark.x, mark.y - 48, '☢ IRRADIATED', hex(RAD.neon), 11);
      readout.setText('a dose lands, and starts running down as it always does');
    });
    ctx.at(1400, () => {
      post.plantedAt = 1400;
      post.until = 7400;
      av.play('slam', Math.atan2(post.y - ctx.cy, post.x - ctx.cx));
      suit(av)?.ping();
      ctx.capture(() => fx.anchorDrop(post.x, post.y));
      float(ctx, post.x, post.y - 58, '📡 GAMMA TETHER', hex(RAD.neonLit), 12);
      walk.on = true;
      readout.setText('the post goes in at the cursor — six seconds, and it hunts on its own');
    });
    ctx.at(4600, () => readout.setText('the chain is holding their dose open: the bar over their head has stopped'));
    ctx.at(6200, () => readout.setText('and it deals nothing. Everything it is worth is what lands on somebody pinned.'));
    ctx.at(7400, () => {
      post.latched = false;
      dose.paused = false;
      ctx.capture(() => { fx.chainBreak(post.x, post.y); fx.shed(mark.x, mark.y); });
      float(ctx, post.x, post.y - 42, '📡 TETHER SPENT', hex(RAD.hazard), 11);
      readout.setText('six seconds later the post is gone — and the clock picks up where it stopped');
    });
    ctx.at(10600, () => readout.setText('the pause is not a refresh: what was left is still exactly what is left'));
    ctx.at(13000, () => readout.setText('15 second cooldown, one post at a time, and R will not take it'));
  },
};
