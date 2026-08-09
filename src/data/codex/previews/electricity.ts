import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ELECTRIC, ElectricityAura, ElectricityAvatar, ElectricityFx,
  LIVE_TONES, PHOENIX_TONES, PLASMA_TONES, STORM_TONES,
} from '../../../elements/kits/ElectricityVisuals';

/**
 * Electricity's showcases.
 *
 * Everything here runs the same `ElectricityFx` the kit runs — `teleport` for the blink,
 * `discharge` for the two blasts, `skyStrike` for a storm pulse and a revive, and the three
 * statics (`drawBallLightning`, `drawStormCloud`, `drawKineticBomb`, `drawPhoenixFlame`) for the
 * things the kit keeps in its own Graphics. The scripts own only the staging: where the caster
 * stands, when it fires and how long to hold before looping.
 *
 * Containment: `ctx.at` and `ctx.onFrame` bodies run outside the harness's capture window, so
 * an `ElectricityAura` or a raw Graphics built inside one goes through `ctx.capture` / `ctx.adopt`
 * by hand. `ElectricityFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

/** Fx wired to the box, plus the caster rig already facing the target mark. */
function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: ElectricityFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new ElectricityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ElectricityAvatar(ctx.scene, ctx.tint, LIVE_TONES));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * The caster, positioned by the script rather than by the harness.
 *
 * The box parks the rig on the caster mark every frame, which is wrong for the two things that
 * physically move an electricity fighter — the blink and the phoenix trail. A script that wants
 * those sets `bodyTexture` to a key that does not exist (so the harness stages no body of its
 * own), adds its own, and re-drives the rig from a frame hook, which runs after the harness's
 * pass.
 */
function drivenCaster(ctx: PreviewCtx, read: () => { x: number; y: number }): BaseAvatar {
  if (ctx.scene.textures.exists('elem-electricity')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-electricity').setDepth(5));
    ctx.onFrame(() => { const s = read(); body.setPosition(s.x, s.y); });
  }
  const av = ctx.useAvatar(() => new ElectricityAvatar(ctx.scene, ctx.tint, LIVE_TONES));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => { const s = read(); av.update(dt, s.x, s.y, 1); });
  return av;
}

/** A target at an arbitrary reach — most electricity ranges are much shorter than the box. */
function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(x - 5.6, y - 4, 1.6); g.fillCircle(x + 4.4, y - 4, 1.6);
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

/**
 * The ⚡ readout the arena keeps above the fight, restaged inside the box. Four abilities quote
 * this number, so several loops need it visible rather than described in the caption.
 */
function meter(ctx: PreviewCtx, cap: number, read: () => number): void {
  const w = 96, h = 7;
  const x = ctx.w * 0.5 - w / 2, y = 10;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
  const txt = label(ctx, ctx.w * 0.5, y + h + 9, '#ffee00', 10);
  ctx.onFrame(() => {
    const v = Phaser.Math.Clamp(read(), 0, cap);
    g.clear();
    g.fillStyle(ctx.tint(ELECTRIC.tar), 0.85);
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(ctx.tint(ELECTRIC.ash), 0.9);
    g.fillRect(x, y, w, h);
    g.fillStyle(ctx.tint(v >= cap ? ELECTRIC.neon : ELECTRIC.volt), 1);
    g.fillRect(x, y, w * (v / cap), h);
    txt.setText(`⚡ ${Math.floor(v)}/${cap}`);
  });
}

// ══ CLICK — Electro Ball ══════════════════════════════════════════════

export const electroBall: PreviewScript = {
  duration: 2000,
  caption: 'Click — 15 damage, 520 px/s, twice a second',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const shoot = (delay: number): void => ctx.at(delay, () => {
      av.play('punch', ctx.aim);
      const hand = av.castHand();
      fx.muzzleArc(hand.x, hand.y, ctx.aim, 1, 7, LIVE_TONES);
      // The real `proj-electro` sprite at the real 520 px/s — the texture the arena launches.
      ctx.fly({
        texture: 'proj-electro', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
        onHit: () => {
          fx.flash(ctx.tx, ctx.ty, 20, 8, LIVE_TONES);
          fx.sparks(ctx.tx, ctx.ty, 7, { speed: 150, size: 2.2, life: 380, tones: LIVE_TONES });
          float(ctx, ctx.tx, ctx.ty - 22, '15', '#ffee00');
        },
      });
    });
    shoot(200);
    shoot(700);
  },
};

export const electroBallUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'Ball Lightning — 4s of drain buys tier IV: 55 on contact, 4 every 0.333s out to 140px',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const tx = ctx.cx + 210;
    dummy(ctx, tx, ctx.cy);
    let kinetic = 100;
    meter(ctx, 100, () => kinetic);

    ctx.at(200, () => {
      av.setHold('charge', ctx.aim);
      // 25/second out of the bar for four full seconds — the whole 100-point cap.
      fx.chargeGather(ctx.cx, ctx.cy, 46, 4000, () => ({ x: ctx.cx, y: ctx.cy }), 4, PLASMA_TONES);
      const drainFrom = 200;
      ctx.onFrame((_dt, elapsed) => {
        const held = Phaser.Math.Clamp(elapsed - drainFrom, 0, 4000);
        kinetic = 100 - held * (25 / 1000);
      });
    });

    ctx.at(4200, () => {
      av.setHold(null);
      av.play('slam', ctx.aim);
      // Birth burst scales with tier, exactly as `spawnBallLightning` does at tier 4.
      fx.ignite(ctx.cx, ctx.cy, 26 + 4 * 6, 6, PLASMA_TONES);
      fx.ring(ctx.cx, ctx.cy, 6, 40 + 4 * 14, ELECTRIC.plasma, 380, 3.5, 5);
      fx.sparks(ctx.cx, ctx.cy, 24, { speed: 180, size: 2.6, life: 460, depth: 6, tones: PLASMA_TONES });
      float(ctx, ctx.cx, ctx.cy - 34, '⚡ BALL LIGHTNING IIII', '#cc88ff');

      // The orb itself: 55 px/s, 21px at tier IV, repainted by the kit's own static.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      const orb = { x: ctx.cx, y: ctx.cy };
      let shockAccum = 0;
      let bitAt = -9999;
      ctx.onFrame((dt, elapsed) => {
        orb.x += 55 * (dt / 1000);
        g.clear();
        ElectricityFx.drawBallLightning(g, ctx.tint, PLASMA_TONES, orb.x, orb.y, 21, elapsed / 1000, 4);
        // Shock pulse: 4 damage out to 140px every 333ms.
        shockAccum += dt;
        if (shockAccum >= 333) {
          shockAccum -= 333;
          fx.ring(orb.x, orb.y, 21, 140, ELECTRIC.plasma, 300, 2.5, 5);
          if (Phaser.Math.Distance.Between(orb.x, orb.y, tx, ctx.cy) <= 140) {
            fx.chain(orb.x, orb.y, tx, ctx.cy, PLASMA_TONES);
            float(ctx, tx, ctx.cy - 20, '4', '#ffee00', 10);
          }
        }
        // Contact: 55 damage, then a 1s lockout on that same enemy.
        if (Phaser.Math.Distance.Between(orb.x, orb.y, tx, ctx.cy) <= 29 && elapsed - bitAt >= 1000) {
          bitAt = elapsed;
          fx.discharge(tx, ctx.cy, 72, { arms: 9, sparks: 16, scorch: false, depth: 7, tones: PLASMA_TONES });
          float(ctx, tx, ctx.cy - 26, '55', '#cc88ff', 13);
        }
      });
    });
  },
};

// ══ E — Electro Dash ══════════════════════════════════════════════════

export const electroDash: PreviewScript = {
  duration: 3400,
  bodyTexture: '',
  caption: 'E — 215px blink, 15 to anything within 45px of the corridor, one 15⚡ recast',
  run(ctx) {
    const fx = ctx.capture(() => new ElectricityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy };
    const av = drivenCaster(ctx, () => at);
    const tx = ctx.cx + 130;
    dummy(ctx, tx, ctx.cy);
    let kinetic = 50;
    meter(ctx, 50, () => kinetic);

    /** One blink: move the mark, light the corridor, earth into anything it swept. */
    const blink = (toX: number): void => {
      const fromX = at.x;
      at.x = toX;
      av.play('dash', toX > fromX ? 0 : Math.PI);
      fx.teleport(fromX, at.y, toX, at.y, 5, LIVE_TONES);
      const lo = Math.min(fromX, toX), hi = Math.max(fromX, toX);
      if (tx >= lo - 45 && tx <= hi + 45) {
        fx.chain(Phaser.Math.Clamp(tx, lo, hi), ctx.cy, tx, ctx.cy, LIVE_TONES);
        float(ctx, tx, ctx.cy - 22, '15', '#ffee00');
      }
    };

    ctx.at(500, () => blink(ctx.cx + 215));
    // The recast is free of the cooldown and paid out of the bar instead.
    ctx.at(1900, () => {
      kinetic -= 15;
      float(ctx, at.x, at.y - 34, '−15 ⚡', '#ffaa00', 10);
      blink(ctx.cx);
    });
  },
};

export const electroDashUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Storm Cloud — 8s of weather at the landing point, 18 damage in 70px every 2s',
  run(ctx) {
    const fx = ctx.capture(() => new ElectricityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy };
    drivenCaster(ctx, () => at);
    const land = ctx.cx + 215;
    dummy(ctx, land + 30, ctx.cy);

    ctx.at(400, () => {
      const fromX = at.x;
      at.x = land;
      fx.teleport(fromX, at.y, land, at.y, 5, LIVE_TONES);
      fx.ring(land, at.y, 60, 20, ELECTRIC.arc, 420, 3, 3);

      // The cloud, repainted by the kit's own static: charge climbs over each 2s window and its
      // underside lights past 55%, which is the ability's whole telegraph.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
      const born = 400;
      let pulse = 0;
      ctx.onFrame((dt, elapsed) => {
        const age = elapsed - born;
        g.clear();
        if (age < 0 || age > 8000) return;
        pulse += dt;
        const charge = Phaser.Math.Clamp(pulse / 2000, 0, 1);
        const fade = Phaser.Math.Clamp((8000 - age) / 600, 0, 1);
        ElectricityFx.drawStormCloud(g, ctx.tint, STORM_TONES, land, at.y, 40, elapsed / 1000, fade, charge);
        if (pulse >= 2000) {
          pulse -= 2000;
          fx.skyStrike(land, at.y, 200, 7, STORM_TONES);
          if (Phaser.Math.Distance.Between(land, at.y, land + 30, ctx.cy) <= 70) {
            fx.chain(land, at.y, land + 30, ctx.cy, STORM_TONES);
            float(ctx, land + 30, ctx.cy - 22, '18', '#88ccff');
          }
        }
      });
    });
  },
};

// ══ R — Kinetic Discharge ═════════════════════════════════════════════

/** Both discharges are the same gesture; only how full the bar was changes the blast. */
function dischargeScript(o: {
  kinetic: number; cap: number; dmg: number; caption: string;
}): PreviewScript {
  return {
    duration: 3200,
    scale: 0.8,
    caption: o.caption,
    run(ctx) {
      const { fx, av } = stage(ctx);
      let kinetic = o.kinetic;
      meter(ctx, o.cap, () => kinetic);
      ctx.at(400, () => {
        av.play('slam', ctx.aim);
        // The blast is physically built out of the charge — arms, shrapnel and burn all scale.
        const charge = o.kinetic / o.cap;
        fx.discharge(ctx.tx, ctx.ty, 100, {
          arms: 8 + Math.round(charge * 10),
          sparks: 14 + Math.round(charge * 22),
          duration: 360 + Math.round(charge * 220),
          tones: LIVE_TONES,
        });
        // Past 60% of the bar it also calls a strike down onto the point.
        if (charge > 0.6) fx.skyStrike(ctx.tx, ctx.ty, 260, 8, LIVE_TONES);
        float(ctx, ctx.tx, ctx.ty - 26, `${o.dmg}`, '#ffee00', 14);
        kinetic = o.kinetic - 20;
        float(ctx, ctx.cx, ctx.cy - 34, '−20 ⚡', '#ffaa00', 10);
      });
    },
  };
}

export const kineticDischarge = dischargeScript({
  kinetic: 50, cap: 50, dmg: 25,
  caption: 'R — half the bar as damage in 100px, and 20 of it comes out',
});

export const kineticDischargeUpgraded = dischargeScript({
  kinetic: 100, cap: 100, dmg: 65,
  caption: 'Overclock — cap 100, and past 50 each point is worth 0.8: a full bar is 65',
});

// ══ F — Pain Battery ══════════════════════════════════════════════════

export const painBattery: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'F — 5 self-damage every 0.25s, released as 75% of it in 120px',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.cx + 100, ctx.cy);
    let kinetic = 0;
    let soaked = 0;
    meter(ctx, 50, () => kinetic);

    ctx.at(300, () => {
      av.setHold('brace', ctx.aim);
      fx.chargeGather(ctx.cx, ctx.cy, 46, 900, () => ({ x: ctx.cx, y: ctx.cy }), 4, LIVE_TONES);
      // The real aura the kit drives while F is held, thickening as the hold gets longer.
      const aura = ctx.capture(() => new ElectricityAura(ctx.scene, ctx.tint, 'charge', LIVE_TONES, 34, 3));
      let live = true;
      ctx.onFrame((dt) => {
        if (!live) return;
        aura.setIntensity(Math.min(2, 0.7 + soaked / 40));
        aura.update(dt, ctx.cx, ctx.cy, 1);
      });

      // Twelve ticks at the real 250ms cadence — 60 self-damage, 60 kinetic in.
      for (let i = 1; i <= 12; i++) {
        ctx.at(i * 250, () => {
          soaked += 5;
          kinetic = Math.min(50, kinetic + 5);
          fx.sparks(ctx.cx, ctx.cy, 4, { speed: 100, size: 2, life: 300, depth: 6, tones: LIVE_TONES });
          float(ctx, ctx.cx - 14, ctx.cy - 18, '−5', '#ff6666', 10);
        });
      }

      ctx.at(3300, () => {
        live = false;
        aura.destroy();
        av.setHold(null);
        av.play('clap', ctx.aim);
        const heat = Phaser.Math.Clamp(soaked / 80, 0, 1);
        fx.discharge(ctx.cx, ctx.cy, 120, {
          arms: 9 + Math.round(heat * 9),
          sparks: 16 + Math.round(heat * 20),
          duration: 400 + Math.round(heat * 240),
          tones: LIVE_TONES,
        });
        fx.chain(ctx.cx, ctx.cy, ctx.cx + 100, ctx.cy, LIVE_TONES);
        float(ctx, ctx.cx + 100, ctx.cy - 24, `${Math.floor(soaked * 0.75)}`, '#ffaa00', 14);
      });
    });
  },
};

export const painBatteryUpgraded: PreviewScript = {
  duration: 5000,
  caption: 'Jumpstart — tap F: 20 to the nearest enemy inside 200px, then 5 HP/s for 6s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const tx = ctx.cx + 170;
    dummy(ctx, tx, ctx.cy);
    ctx.at(300, () => {
      av.play('punch', ctx.aim);
      fx.chain(ctx.cx, ctx.cy, tx, ctx.cy, LIVE_TONES);
      fx.discharge(tx, ctx.cy, 44, { arms: 6, sparks: 10, scorch: false, tones: LIVE_TONES });
      float(ctx, tx, ctx.cy - 24, '20', '#ffee00', 13);
      fx.ignite(ctx.cx, ctx.cy, 34, 5, LIVE_TONES);
      float(ctx, ctx.cx, ctx.cy - 36, 'JUMPSTART!', '#ffee00', 10);

      // Regen at its real cadence: 1 HP every 0.2s. The loop shows the first ~4s of the 6.
      const total = label(ctx, ctx.cx, ctx.cy + 30, '#4ade80', 10);
      let healed = 0;
      for (let i = 1; i <= 20; i++) {
        ctx.at(i * 200, () => {
          healed++;
          total.setText(`+${healed} HP  (30 over 6s)`);
          fx.sparks(ctx.cx, ctx.cy - 6, 1, { speed: 30, size: 1.6, life: 420, fall: -18, depth: 6, tones: LIVE_TONES });
        });
      }
    });
  },
};

// ══ Q — Restart ═══════════════════════════════════════════════════════

/** Both revive routes are the same paint; the HP they wake up at is the difference. */
function restartScript(o: {
  overcharge: boolean; kinetic: number; cap: number; hp: number; shout: string; caption: string;
}): PreviewScript {
  return {
    duration: 5000,
    scale: 0.9,
    caption: o.caption,
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      let kinetic = o.kinetic;
      meter(ctx, o.cap, () => kinetic);

      let cage: ElectricityAura | null = null;
      if (o.overcharge) {
        ctx.at(300, () => {
          av.play('raise', -Math.PI / 2, 900);
          fx.ignite(ctx.cx, ctx.cy, 44, 5, LIVE_TONES);
          fx.ring(ctx.cx, ctx.cy, 10, 90, ELECTRIC.volt, 460, 5, 5);
          float(ctx, ctx.cx, ctx.cy - 36, 'OVERCHARGED!', '#ffee00', 10);
          cage = ctx.capture(() => new ElectricityAura(ctx.scene, ctx.tint, 'overcharge', LIVE_TONES, 36, 4));
          ctx.onFrame((dt) => cage?.update(dt, ctx.cx, ctx.cy, 1));
        });
      }

      // The lethal hit, then the body coming back online: a strike out of the sky, a shell
      // locking around it and current earthing out — `paintRevive`, gesture for gesture.
      ctx.at(2100, () => {
        float(ctx, ctx.cx, ctx.cy - 20, 'LETHAL', '#ff4444', 11);
        fx.sparks(ctx.cx, ctx.cy, 8, { speed: 140, size: 2.2, life: 340, tones: LIVE_TONES });
      });
      ctx.at(2400, () => {
        cage?.destroy();
        cage = null;
        fx.skyStrike(ctx.cx, ctx.cy, 320, 9, LIVE_TONES);
        fx.ignite(ctx.cx, ctx.cy, 46, 6, LIVE_TONES);
        fx.discharge(ctx.cx, ctx.cy, 90, { arms: 12, sparks: 22, depth: 7, tones: LIVE_TONES });
        av.play('raise', -Math.PI / 2, 900);
        float(ctx, ctx.cx, ctx.cy - 40, o.shout, '#ffee00', 11);
        float(ctx, ctx.cx, ctx.cy - 12, `+${o.hp} HP`, '#4ade80', 14);
        kinetic = 0;
      });
    },
  };
}

export const restart = restartScript({
  overcharge: true, kinetic: 50, cap: 50, hp: 50, shout: 'RESTARTED!',
  caption: 'Q — 5s overcharged; a lethal hit inside it revives you at your whole bar',
});

export const restartUpgraded = restartScript({
  overcharge: false, kinetic: 100, cap: 100, hp: 50, shout: 'AUTO-RESTARTED!',
  caption: 'Auto-Restart — no cage needed, but the revive is only half the bar',
});

// ══ Passive — Kinetic Power ═══════════════════════════════════════════

export const passiveKineticPower: PreviewScript = {
  duration: 6000,
  caption: 'Every point of damage you take is 1 kinetic power, capped at 50 (100 with R+)',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let kinetic = 0;
    meter(ctx, 50, () => kinetic);

    /** A wound arriving: the intake sparks the kit fires on every `onDamageReceived`. */
    const hit = (delay: number, amount: number) => ctx.at(delay, () => {
      kinetic = Math.min(50, kinetic + amount);
      fx.sparks(ctx.cx, ctx.cy, Math.min(8, 2 + Math.floor(amount / 6)), {
        speed: 90, size: 2, life: 320, depth: 6, tones: LIVE_TONES,
      });
      fx.flash(ctx.cx, ctx.cy, 16, 8, LIVE_TONES);
      float(ctx, ctx.cx - 16, ctx.cy - 20, `−${amount}`, '#ff6666', 11);
      float(ctx, ctx.cx + 18, ctx.cy - 20, `+${amount} ⚡`, '#ffee00', 11);
    });
    hit(400, 15);
    hit(1200, 12);
    hit(2000, 23);

    // Past 20 the shots start arcing; past 50 they arc twice and are drawn larger.
    ctx.at(2900, () => {
      av.play('punch', ctx.aim);
      const hand = av.castHand();
      fx.muzzleArc(hand.x, hand.y, ctx.aim, 1.45, 7, LIVE_TONES);
      float(ctx, ctx.cx, ctx.cy - 40, 'CHARGED SHOTS', '#ffee00', 10);
      dummy(ctx, ctx.cx + 200, ctx.cy);
      ctx.fly({
        texture: 'proj-electro', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.cx + 200, y: ctx.cy }, speed: 520,
      });
      // Two arcs, 300ms apart, out to 120px — the 50+ behaviour.
      for (const d of [420, 720]) {
        ctx.at(d, () => {
          fx.chain(ctx.cx + 120, ctx.cy, ctx.cx + 200, ctx.cy, LIVE_TONES);
          float(ctx, ctx.cx + 200, ctx.cy - 20, '4', '#ffee00', 10);
        });
      }
      ctx.at(760, () => float(ctx, ctx.cx + 200, ctx.cy - 32, '15', '#ffee00', 13));
    });
  },
};

// ══ Perk — Phoenix ════════════════════════════════════════════════════

export const perkPhoenix: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Phoenix — 5s untouchable at double speed, dropping a 15 HP flame every second',
  run(ctx) {
    const fx = ctx.capture(() => new ElectricityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy };
    drivenCaster(ctx, () => at);

    const flames: { x: number; y: number; phase: number; taken: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const f of flames) {
        if (f.taken) continue;
        ElectricityFx.drawPhoenixFlame(g, ctx.tint, f.x, f.y, elapsed / 1000, f.phase, 1);
      }
    });

    ctx.at(300, () => {
      fx.ignite(at.x, at.y, 40, 5, PHOENIX_TONES);
      fx.ring(at.x, at.y, 8, 80, ELECTRIC.ember, 440, 4, 5);
      float(ctx, at.x, at.y - 40, '🔥 PHOENIX MODE', '#ff6600', 11);
      const aura = ctx.capture(() => new ElectricityAura(ctx.scene, ctx.tint, 'phoenix', PHOENIX_TONES, 34, 4));
      let live = true;
      ctx.onFrame((dt) => { if (live) aura.update(dt, at.x, at.y, 1); });

      // Double speed, running right, shedding one flame a second for the whole 5s window.
      const runTo = ctx.cx + 250;
      let running = true;
      ctx.onFrame((dt) => {
        if (!running) return;
        at.x = Math.min(runTo, at.x + 62 * (dt / 1000));
      });
      for (let i = 1; i <= 5; i++) {
        ctx.at(i * 1000, () => flames.push({ x: at.x, y: at.y, phase: Math.random() * Math.PI * 2, taken: false }));
      }
      // Incoming damage during the window is absorbed outright, not reduced.
      for (const d of [1400, 2600, 4100]) {
        ctx.at(d, () => {
          fx.flash(at.x, at.y, 18, 8, PHOENIX_TONES);
          float(ctx, at.x, at.y - 22, 'ABSORBED', '#ff9900', 10);
        });
      }

      ctx.at(5000, () => {
        live = false;
        running = false;
        aura.destroy();
        fx.ring(at.x, at.y, 44, 10, ELECTRIC.ember, 340, 3, 4);
        float(ctx, at.x, at.y - 34, 'PHOENIX END', '#ff9900', 10);

        // Only now can the trail be collected — walking back over it is the whole payoff.
        let walking = true;
        ctx.onFrame((dt) => {
          if (!walking) return;
          at.x -= 78 * (dt / 1000);
          if (at.x <= ctx.cx) { at.x = ctx.cx; walking = false; }
          for (const f of flames) {
            if (f.taken || Phaser.Math.Distance.Between(at.x, at.y, f.x, f.y) > 28) continue;
            f.taken = true;
            fx.ignite(f.x, f.y, 26, 5, PHOENIX_TONES);
            for (let k = 0; k < 3; k++) {
              ctx.at(k * 1000, () => float(ctx, at.x, at.y - 24, '🔥 +5', '#ff6600', 11));
            }
          }
        });
      });
    });
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryKineticShield: PreviewScript = {
  duration: 6400,
  caption: 'Kinetic Shield — +1% resistance per 3% of the bar, 33% at a full charge',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    let kinetic = 0;
    meter(ctx, 50, () => kinetic);

    const readout = label(ctx, ctx.cx, ctx.cy + 32, '#7dd3fc', 10);
    const aura = ctx.capture(() => new ElectricityAura(ctx.scene, ctx.tint, 'shield', LIVE_TONES, 40, 2));
    ctx.onFrame((dt) => {
      const resist = Math.min(33, Math.floor((kinetic / 50) * 100 / 3));
      aura.setIntensity(resist / 33);
      aura.update(dt, ctx.cx, ctx.cy, 1);
      readout.setText(`${resist}% resistance`);
    });

    // Each incoming hit both fills the bar and is itself cut by whatever the bar already reads.
    const raw = [16, 16, 16, 16];
    raw.forEach((amount, i) => ctx.at(600 + i * 1300, () => {
      const resist = Math.min(33, Math.floor((kinetic / 50) * 100 / 3));
      const taken = Math.round(amount * (1 - resist / 100));
      kinetic = Math.min(50, kinetic + taken);
      fx.flash(ctx.cx, ctx.cy, 18, 8, LIVE_TONES);
      fx.sparks(ctx.cx, ctx.cy, 5, { speed: 90, size: 2, life: 320, depth: 6, tones: LIVE_TONES });
      float(ctx, ctx.cx - 18, ctx.cy - 20, `−${taken}`, '#ff6666', 11);
      if (taken < amount) float(ctx, ctx.cx + 22, ctx.cy - 20, `(${amount} − ${amount - taken})`, '#7dd3fc', 10);
    }));
  },
};

export const masteryKineticBomb: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Kinetic Bomb — latches for 10s, then 10 damage in 150px plus 1 per 3 they soaked',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const tx = ctx.cx + 300;
    dummy(ctx, tx, ctx.cy);

    ctx.at(300, () => {
      av.play('punch', ctx.aim);
      const hand = av.castHand();
      fx.muzzleArc(hand.x, hand.y, ctx.aim, 1.3, 7, LIVE_TONES);
      float(ctx, ctx.cx, ctx.cy - 34, '⚡ KINETIC BOMB', '#ffaa00', 10);

      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      const bomb = { x: ctx.cx, y: ctx.cy };
      let attached = false;
      let soaked = 0;
      let done = false;
      ctx.onFrame((dt, elapsed) => {
        if (done) return;
        g.clear();
        if (!attached) {
          // 460 px/s until it comes within 26px of a body.
          bomb.x += 460 * (dt / 1000);
          ElectricityFx.drawKineticBomb(g, ctx.tint, LIVE_TONES, bomb.x, bomb.y, elapsed / 1000, false, 0);
          if (Phaser.Math.Distance.Between(bomb.x, bomb.y, tx, ctx.cy) <= 26) {
            attached = true;
            fx.ring(tx, ctx.cy, 34, 12, ELECTRIC.volt, 300, 3, 6);
            fx.sparks(tx, ctx.cy, 8, { speed: 130, size: 2.2, life: 340, depth: 7, tones: LIVE_TONES });
            float(ctx, tx, ctx.cy - 34, '⚡ LATCHED', '#ffee00', 10);
          }
          return;
        }
        // Latched: rides 24px above the head with a meter that closes as they are hurt.
        ElectricityFx.drawKineticBomb(
          g, ctx.tint, LIVE_TONES, tx, ctx.cy - 24, elapsed / 1000, true,
          Phaser.Math.Clamp(soaked / 120, 0, 1),
        );
      });

      // Damage from anything at all feeds it — here, four hits from elsewhere in the fight.
      [1400, 2600, 3800, 5000].forEach((d, i) => ctx.at(d, () => {
        const amount = [22, 30, 26, 32][i];
        soaked += amount;
        fx.arc(tx, ctx.cy, tx, ctx.cy - 24, { width: 2, duration: 140, depth: 7, branches: 1, tones: LIVE_TONES });
        float(ctx, tx, ctx.cy - 20, `${amount}`, '#ffffff', 11);
      }));

      ctx.at(6200, () => {
        done = true;
        g.clear();
        const fed = Phaser.Math.Clamp(soaked / 120, 0, 1);
        fx.discharge(tx, ctx.cy, 150, {
          arms: 12 + Math.round(fed * 10),
          sparks: 20 + Math.round(fed * 24),
          duration: 420 + Math.round(fed * 260),
          tones: LIVE_TONES,
        });
        float(ctx, tx, ctx.cy - 30, `${10 + Math.floor(soaked / 3)}`, '#ffee00', 16);
      });
    });
  },
};
