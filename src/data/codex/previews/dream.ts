import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  DRM, DreamAvatar, DreamFx, DreamPortal, OasisView, TrancePendulum,
  dreamOrb, dreamcatcherShape, ekgTrace, sleepMeter, sleepyZ, star,
} from '../../../elements/kits/DreamVisuals';

/**
 * Dream's showcases.
 *
 * Every one of these drives the real thing: `TrancePendulum` with the kit's own equation of
 * motion (68px string, 1600 gravity, 0.7 damping), `dreamcatcherShape` with its live dream
 * count, `sleepMeter` and `ekgTrace` over the target's head, `DreamPortal` and the full
 * `OasisView`. Dream puts no sprite in the world at all — there is nothing to `ctx.fly` — so
 * these loops keep the same little state records the kit keeps and paint from them.
 *
 * Containment: `DreamFx` carries a sticky sink; the rig classes build their own Graphics in
 * their constructors, so each one is built inside `ctx.capture`.
 */

// ── Staging ───────────────────────────────────────────────────────────

/** Dream's caster always moves — the pendulum is driven by its own footwork. */
function drivenCaster(ctx: PreviewCtx, at: { x: number; y: number }): { fx: DreamFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-dream')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-dream').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
  ctx.onFrame((dt) => { av.setFacing(0); av.update(dt, at.x, at.y, 1); });
  return { fx, av };
}

function dummyAt(ctx: PreviewCtx, at: { x: number; y: number; hidden?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    if (at.hidden) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(18));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(18));
}

/** The meter and the heart trace the kit hangs over anybody it is working on. */
function overhead(
  ctx: PreviewCtx, at: { x: number; y: number },
  read: () => { drowsy: number; asleep: boolean; nightmare: boolean },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const s = read();
    const ratio = s.asleep ? 1 : Phaser.Math.Clamp(s.drowsy / 100, 0, 1);
    const t = elapsed / 1000;
    if (ratio > 0.005 || s.asleep) sleepMeter(g, ctx.tint, at.x, at.y - 60, ratio, t, s.asleep, 1);
    if (s.nightmare) {
      ekgTrace(g, ctx.tint, at.x, at.y - (ratio > 0.005 || s.asleep ? 78 : 62), 46, 14, t * 0.55, 1);
    }
    if (s.asleep) {
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.45 + i / 3) % 1;
        sleepyZ(g, ctx.tint, at.x + 17 + Math.sin(p * 3.2 + i) * 7, at.y - 32 - p * 28,
          4.5 + p * 3.5, (1 - p) * 0.95, -0.18 + Math.sin(p * 2 + i) * 0.12);
      }
    }
  });
}

/**
 * The pendulum, driven exactly as the kit drives it: θ'' = −[sinθ·(g − Ay) + Ax·cosθ]/L − c·θ',
 * with the pivot's acceleration coming from the caster's own movement.
 */
function pendulum(
  ctx: PreviewCtx, at: { x: number; y: number },
  st: { on: boolean; theta: number; omega: number; heat: number },
): void {
  const LEN = 68, G = 1600, DAMP = 0.7;
  const p = ctx.capture(() => new TrancePendulum(ctx.scene, ctx.tint));
  let prevX = at.x, prevVx = 0, smoothAx = 0;
  ctx.onFrame((delta) => {
    const dt = Math.min(0.05, delta / 1000);
    if (dt <= 0) return;
    if (!st.on) {
      st.heat = 0;
      ctx.capture(() => p.update(delta, at.x, at.y, at.x, at.y, 92, 0, 0));
      return;
    }
    const vx = (at.x - prevX) / dt;
    const rawAx = Phaser.Math.Clamp((vx - prevVx) / dt, -5200, 5200);
    prevX = at.x; prevVx = vx;
    smoothAx += (rawAx - smoothAx) * 0.3;
    const acc = -(Math.sin(st.theta) * G + smoothAx * Math.cos(st.theta)) / LEN - DAMP * st.omega;
    st.omega += acc * dt;
    st.theta = Phaser.Math.Angle.Wrap(st.theta + st.omega * dt);
    st.heat = Phaser.Math.Clamp((Math.abs(st.omega) * LEN) / 380, 0, 1);
    const radius = 92 + (176 - 92) * st.heat;
    ctx.capture(() => p.update(
      delta, at.x, at.y + 4,
      at.x + Math.sin(st.theta) * LEN, at.y + 4 + Math.cos(st.theta) * LEN,
      radius, st.heat, 1,
    ));
  });
}

// ══ CLICK — Trance ════════════════════════════════════════════════════

export const trance: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — your own pacing pumps the pendulum; a full swing is 34 sleepiness a second out to 176px',
  run(ctx) {
    const at = { x: ctx.w * 0.34, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: ctx.w * 0.62, y: ctx.cy };
    dummyAt(ctx, victim);
    const st = { on: false, theta: 0.55, omega: 0, heat: 0 };
    pendulum(ctx, at, st);
    const sleep = { drowsy: 0, asleep: false, nightmare: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 12, '#9fb8ff', 11);
    const home = at.x;

    ctx.at(400, () => {
      st.on = true;
      av.play('flex');
      fx.ring(at.x, at.y + 4, 12, 92, DRM.violet, 480, 5, 6);
      fx.stardust(at.x, at.y + 4, 10, 30, 800);
      float(ctx, at.x, at.y - 42, '🌀 TRANCE', '#8b5cf6', 12);
    });
    // The pacing that drives it, and the meter it fills.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 700 && elapsed < 8200) at.x = home + Math.sin((elapsed - 700) / 260) * 46;
      if (!st.on || sleep.asleep) return;
      const radius = 92 + (176 - 92) * st.heat;
      const inRange = Phaser.Math.Distance.Between(at.x, at.y, victim.x, victim.y) <= radius;
      if (st.heat >= 0.06 && inRange) {
        sleep.drowsy = Math.min(100, sleep.drowsy + 34 * Math.pow(st.heat, 1.25) * (dt / 1000));
      } else {
        sleep.drowsy = Math.max(0, sleep.drowsy - 6 * (dt / 1000));
      }
      readout.setText(`swing ${Math.round(st.heat * 100)}%   —   reach ${Math.round(radius)}px   —   ${Math.round(sleep.drowsy)}/100`);
      if (sleep.drowsy >= 100) {
        sleep.asleep = true;
        ctx.capture(() => {
          fx.zzzPuff(victim.x, victim.y);
          fx.ring(victim.x, victim.y, 10, 70, DRM.purple, 620, 5, 7);
          float(ctx, victim.x, victim.y - 48, '😴 ASLEEP', '#8b5cf6', 13);
        });
        readout.setText('asleep for 8 seconds — no movement, no abilities');
      }
    });
    ctx.at(9400, () => {
      st.on = false;
      float(ctx, at.x, at.y - 40, 'Pendulum stilled', '#9fb8ff', 11);
      readout.setText('click again to put it away — and standing still kills the swing anyway');
    });
  },
};

// ══ E — Pillow Fight ══════════════════════════════════════════════════

export const pillowFight: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'E — 10 damage awake, 70 against a sleeper, and ×1.25 on whatever sleepiness is left',
  run(ctx) {
    const fx = ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 78, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 0, asleep: false, nightmare: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 12, '#bfd0ff', 11);

    const swing = (delay: number, then: () => void): void => ctx.at(delay, () => {
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.pillowSwing(ctx.cx, ctx.cy, ctx.aim, 84));
      ctx.capture(() => fx.feathers(victim.x, victim.y, 10, ctx.aim));
      then();
    });

    // Awake: almost a joke.
    ctx.at(300, () => readout.setText('wide awake — the pillow is 10'));
    swing(600, () => {
      float(ctx, victim.x, victim.y - 26, '10', '#bfd0ff', 14);
    });
    // Half-drowsy: the multiplier is the point.
    ctx.at(2000, () => { sleep.drowsy = 60; readout.setText('60 sleepy — 46 damage, and the meter is multiplied to 75'); });
    swing(2600, () => {
      float(ctx, victim.x, victim.y - 26, '46', '#bfd0ff', 15);
      sleep.drowsy = Math.min(100, 60 * 1.25);
      float(ctx, victim.x, victim.y - 46, '🛏️ SWEET DREAMS  ×1.25', '#8b5cf6', 10);
    });
    // Asleep: the whole meter cashed into one number.
    ctx.at(4200, () => {
      sleep.drowsy = 100; sleep.asleep = true;
      ctx.capture(() => fx.zzzPuff(victim.x, victim.y));
      readout.setText('asleep — the swing is worth 70');
    });
    swing(5200, () => {
      float(ctx, victim.x, victim.y - 26, '70', '#bfd0ff', 17);
      sleep.asleep = false;
      sleep.drowsy = 0;
      ctx.capture(() => {
        fx.stardust(victim.x, victim.y, 7, 26, 640, 7);
        float(ctx, victim.x, victim.y - 48, '⏰ AWAKE!', '#d8e2ff', 11);
      });
      readout.setText('and it wakes them, which resets the meter to 0');
    });
    ctx.at(7000, () => readout.setText('so ×1.25 is for topping up an awake target, and 70 is for cashing out a sleeping one'));
  },
};

// ══ R — Dreamcatcher ══════════════════════════════════════════════════

export const dreamcatcher: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — 12s on the floor, one dream every 2s out of a sleeper, 10 HP each and +2s on all their cooldowns',
  run(ctx) {
    const at = { x: ctx.w * 0.3, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: ctx.w * 0.72, y: ctx.cy - 10 };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 100, asleep: true, nightmare: false };
    overhead(ctx, victim, () => sleep);
    const catcher = { x: at.x, y: at.y + 10, born: 600, dreams: 0 };
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8ecff', 11);
    let placed = false;

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const thread = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); thread.clear();
      if (!placed) return;
      const t = elapsed / 1000;
      const rise = Math.min(1, (elapsed - catcher.born) / 260);
      dreamcatcherShape(g, ctx.tint, catcher.x, catcher.y, 22 * rise, t, catcher.dreams, 1);
      if (catcher.dreams >= 5) {
        g.lineStyle(2, ctx.tint(DRM.water), 0.35 + 0.3 * Math.sin(t * 6));
        g.strokeCircle(catcher.x, catcher.y, 22 + 8 + Math.sin(t * 6) * 3);
      }
      // The thread, while it is pulling, with a bead running down it.
      if (!sleep.asleep || catcher.dreams >= 5) return;
      thread.lineStyle(1.4, ctx.tint(DRM.pale), 0.55);
      thread.beginPath();
      thread.moveTo(victim.x, victim.y);
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        const wob = Math.sin(t * 5 + f * 7) * 9 * Math.sin(f * Math.PI);
        const nx = -(catcher.y - victim.y), ny = catcher.x - victim.x;
        const len = Math.hypot(nx, ny) || 1;
        thread.lineTo(victim.x + (catcher.x - victim.x) * f + (nx / len) * wob,
          victim.y + (catcher.y - victim.y) * f + (ny / len) * wob);
      }
      thread.strokePath();
      const p = (t * 0.55) % 1;
      dreamOrb(thread, ctx.tint, victim.x + (catcher.x - victim.x) * p,
        victim.y + (catcher.y - victim.y) * p, 2.4, 0.9, t);
    });

    ctx.at(600, () => {
      placed = true;
      av.play('slam');
      fx.ring(catcher.x, catcher.y, 8, 48, DRM.web, 460, 4, 5);
      fx.stardust(catcher.x, catcher.y, 8, 26, 700, 5);
      float(ctx, at.x, at.y - 42, '🪶 DREAMCATCHER', '#e8ecff', 12);
      readout.setText('it only drains while somebody of yours is actually asleep');
    });
    for (let i = 1; i <= 5; i++) {
      ctx.at(1400 + i * 2000, () => {
        catcher.dreams = i;
        ctx.capture(() => {
          fx.stardust(victim.x, victim.y, 5, 20, 620, 7);
          float(ctx, victim.x, victim.y - 52, '💤 DREAM TAKEN  +2s CD', '#8b5cf6', 10);
        });
        readout.setText(`${i}/5 held   —   ${i * 2}s added to every one of their cooldowns`);
      });
    }
    // And it does not deliver: you have to walk back onto it.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 11000 || catcher.dreams === 0) return;
      at.x += (catcher.x - at.x) * Math.min(1, 4 * (dt / 1000));
      if (Phaser.Math.Distance.Between(at.x, at.y, catcher.x, catcher.y) > 32) return;
      const healed = catcher.dreams * 10;
      catcher.dreams = 0;
      ctx.capture(() => {
        fx.ring(catcher.x, catcher.y, 6, 46, DRM.water, 420, 4, 6);
        float(ctx, at.x, at.y - 44, `🌙 +${healed} HP`, '#3fc7d6', 13);
      });
      readout.setText('walked over — 10 HP a dream, all at once');
    });
  },
};

// ══ F — Nightmare ═════════════════════════════════════════════════════

export const nightmare: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'F — 5/s for 10s that will never wake them, and whatever does wake them lands twice',
  run(ctx) {
    const fx = ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 90, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 100, asleep: true, nightmare: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3b6b', 11);

    ctx.at(400, () => readout.setText('asleep already — this is when F is worth casting'));
    ctx.at(900, () => {
      sleep.nightmare = true;
      av.play('punch', ctx.aim);
      fx.ring(victim.x, victim.y, 10, 60, DRM.dread, 520, 5, 7);
      fx.stardust(victim.x, victim.y, 9, 30, 760, 7);
      float(ctx, victim.x, victim.y - 48, '💔 NIGHTMARE', '#ff3b6b', 12);
      readout.setText('10 seconds of something only they can see');
    });
    for (let i = 1; i <= 5; i++) {
      ctx.at(1900 + i * 1000, () => {
        if (!sleep.nightmare) return;
        ctx.capture(() => float(ctx, victim.x, victim.y - 24, '5', '#ff3b6b', 12));
        readout.setText('its own ticks are excluded from the wake check — they sleep right through it');
      });
    }
    // Then the jolt.
    ctx.at(7400, () => {
      av.play('sweep', ctx.aim);
      ctx.capture(() => {
        fx.pillowSwing(ctx.cx, ctx.cy, ctx.aim, 84);
        fx.feathers(victim.x, victim.y, 10, ctx.aim);
        float(ctx, victim.x, victim.y - 26, '70', '#bfd0ff', 16);
      });
    });
    ctx.at(7700, () => {
      sleep.asleep = false; sleep.drowsy = 0; sleep.nightmare = false;
      fx.ring(victim.x, victim.y, 8, 56, DRM.dread, 460, 5, 8);
      float(ctx, victim.x, victim.y - 54, '💔 NIGHT TERROR ×2', '#ff3b6b', 12);
      float(ctx, victim.x + 26, victim.y - 30, '70', '#ff3b6b', 16);
      readout.setText('the hit that woke them is applied a second time — 140 in one swing');
    });
    ctx.at(9400, () => readout.setText('waking ends the nightmare, whether the jolt fired or not'));
  },
};

// ══ Q — Oasis ═════════════════════════════════════════════════════════

export const oasis: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — a doorway only you can use; through it, 10 HP/s for 15s, untouchable and unseen',
  run(ctx) {
    const at = { x: ctx.w * 0.56, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const chaser = { x: ctx.w * 0.86, y: ctx.cy };
    dummyAt(ctx, chaser);
    const door = { x: ctx.w * 0.30, y: ctx.cy, open: 0, until: -1 };
    const portal = ctx.capture(() => new DreamPortal(ctx.scene, ctx.tint));
    const view = ctx.capture(() => new OasisView(ctx.scene, ctx.tint, ctx.w, ctx.h));
    const readout = label(ctx, ctx.w * 0.5, 12, '#74d18c', 11);
    let grow = 0;
    let inside = false;
    let healAccum = 0;
    let healed = 0;

    ctx.onFrame((dt, elapsed) => {
      if (door.until > 0) {
        door.open = elapsed < door.until
          ? Math.min(1, door.open + dt / 300)
          : Math.max(0, door.open - dt / 320);
      }
      const standing = Phaser.Math.Distance.Between(at.x, at.y, door.x, door.y) < 64;
      ctx.capture(() => portal.update(dt, door.x, door.y, 46, 58, door.open, standing ? 1 : 0));
      grow = inside ? Math.min(1, grow + dt / 420) : Math.max(0, grow - dt / 380);
      // The meadow is a full-screen view; the box is its whole world here.
      ctx.capture(() => view.update(dt, grow, ctx.w * 0.38, ctx.h - 40,
        inside ? Math.max(0, 1 - healAccum / 1000) : 0));
      if (!inside) return;
      healAccum += dt;
      while (healAccum >= 1000) {
        healAccum -= 1000;
        healed += 10;
        ctx.capture(() => float(ctx, at.x, at.y - 30, '+10', '#3fc7d6', 13));
        readout.setText(`resting — ${healed} HP back, and nothing can reach you`);
      }
    });

    ctx.at(500, () => {
      av.play('raise');
      door.until = 12500;
      fx.tear(door.x, door.y, 46, 58, false);
      float(ctx, door.x, door.y - 72, '🌌 OASIS — step through', '#8b5cf6', 11);
      readout.setText('it opens 78px behind you, away from the cursor');
    });
    // The walk into it, which is what actually takes you.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1400 || inside) return;
      at.x += (door.x - at.x) * Math.min(1, 2.2 * (dt / 1000));
      if (door.open > 0.6 && Phaser.Math.Distance.Between(at.x, at.y, door.x, door.y) < 40) {
        inside = true;
        door.until = -1; door.open = 0;
        at.x = door.x; at.y = door.y;
        ctx.capture(() => {
          fx.tear(door.x, door.y, 46, 58, true);
          float(ctx, door.x, door.y - 40, '🏞️ OASIS', '#74d18c', 13);
        });
        readout.setText('the door shuts behind you — invincible, invisible, pinned in place');
      }
    });
    ctx.at(10600, () => {
      inside = false;
      fx.tear(at.x, at.y, 46, 58, false);
      fx.stardust(at.x, at.y, 14, 40, 900, 7);
      float(ctx, at.x, at.y - 44, '🌅 RESTED', '#ffd98a', 12);
      readout.setText('back at full health ends it early — otherwise 15s does');
    });
  },
};

// ══ Passives ══════════════════════════════════════════════════════════

export const passiveSleepiness: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Sleepiness — 100 is 8 seconds down; it bleeds off at 6/s and any damage at all resets it',
  run(ctx) {
    const fx = ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.tx, y: ctx.ty };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 0, asleep: false, nightmare: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 12, '#8b5cf6', 11);
    let filling = false;

    ctx.at(400, () => { filling = true; readout.setText('a full swing is 34 a second'); });
    ctx.onFrame((dt) => {
      if (sleep.asleep) return;
      sleep.drowsy = Phaser.Math.Clamp(
        sleep.drowsy + (filling ? 34 : -6) * (dt / 1000), 0, 100);
      if (!sleep.asleep) readout.setText(filling
        ? `${Math.round(sleep.drowsy)}/100`
        : `${Math.round(sleep.drowsy)}/100 — bleeding off at 6 a second`);
      if (sleep.drowsy >= 100) {
        sleep.asleep = true;
        filling = false;
        ctx.capture(() => {
          fx.zzzPuff(victim.x, victim.y);
          fx.ring(victim.x, victim.y, 10, 70, DRM.purple, 620, 5, 7);
          float(ctx, victim.x, victim.y - 48, '😴 ASLEEP', '#8b5cf6', 13);
        });
        readout.setText('8 seconds: velocity zeroed, stunned and disarmed on a rolling refresh');
      }
    });
    // Then the other half of the rule: any hit at all ends it, and empties the meter.
    ctx.at(6200, () => {
      if (!sleep.asleep) return;
      sleep.asleep = false;
      sleep.drowsy = 0;
      fx.stardust(victim.x, victim.y, 7, 26, 640, 7);
      float(ctx, victim.x, victim.y - 24, '5', '#d8e2ff', 12);
      float(ctx, victim.x, victim.y - 42, '⏰ AWAKE!', '#d8e2ff', 12);
      readout.setText('one point of damage is enough — and the meter goes back to 0');
    });
    ctx.at(8400, () => readout.setText('anything unstoppable never drops: the meter sticks at 99 and says ☕ WIDE AWAKE'));
  },
};

export const passiveCosmicCursor: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Cosmic Cursor — 5 damage every time the pointer crosses into a body, never while parked',
  run(ctx) {
    const fx = ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.tx, y: ctx.ty };
    dummyAt(ctx, victim);
    const cursor = { x: ctx.cx, y: ctx.cy - 40 };
    let inside = false;
    let struck = false;
    let hits = 0;
    const readout = label(ctx, ctx.w * 0.5, 12, '#d8e2ff', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(20));

    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      // Flicked on and off for the first stretch, then parked on them to show it stop paying.
      if (elapsed < 5200) {
        cursor.x = victim.x + Math.cos(t * 3.4) * 62;
        cursor.y = victim.y + Math.sin(t * 3.4) * 30;
      } else {
        cursor.x += (victim.x - cursor.x) * 0.08;
        cursor.y += (victim.y - cursor.y) * 0.08;
      }
      const near = Phaser.Math.Distance.Between(cursor.x, cursor.y, victim.x, victim.y) <= 24;
      struck = false;
      if (near && !inside) {
        struck = true;
        hits++;
        ctx.capture(() => {
          fx.stardust(victim.x, victim.y, 4, 16, 420, 8);
          float(ctx, victim.x, victim.y - 34, '✨ 5', '#d8e2ff', 12);
        });
        readout.setText(`${hits} crossings — ${hits * 5} damage, no cooldown at all`);
      }
      inside = near;
      if (elapsed > 6400 && inside) readout.setText('parked inside: the ring goes hollow and it stops paying');

      // The pointer itself, drawn as the kit draws it.
      g.clear();
      g.fillStyle(ctx.tint(DRM.violet), 0.22);
      g.fillCircle(cursor.x, cursor.y, 15 + (struck ? 7 : 0));
      g.fillStyle(ctx.tint(DRM.deep), 0.55);
      g.fillCircle(cursor.x, cursor.y, 9);
      g.fillStyle(ctx.tint(DRM.blue), 0.5);
      g.fillCircle(cursor.x - 2, cursor.y - 2, 6);
      for (let i = 0; i < 4; i++) {
        const a = t * 1.6 + (i / 4) * Math.PI * 2;
        star(g, ctx.tint, cursor.x + Math.cos(a) * 6, cursor.y + Math.sin(a) * 6, 1.6, 0.85, DRM.white, a * 2);
      }
      g.fillStyle(ctx.tint(DRM.pale), 0.95);
      g.fillTriangle(cursor.x, cursor.y, cursor.x + 1, cursor.y + 17, cursor.x + 11, cursor.y + 11);
      g.fillStyle(ctx.tint(DRM.purple), 0.9);
      g.fillTriangle(cursor.x + 1, cursor.y + 2, cursor.x + 2, cursor.y + 14, cursor.x + 8.5, cursor.y + 9.5);
      star(g, ctx.tint, cursor.x, cursor.y, 6.5, 0.95, DRM.star, t * 2.2);
      g.lineStyle(1.6, ctx.tint(inside ? DRM.dread : DRM.pale), inside ? 0.75 : 0.5);
      g.strokeCircle(cursor.x, cursor.y, inside ? 13 + Math.sin(t * 9) : 11);
    });
  },
};

export const passiveRest: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Rest — 5 HP a second for standing perfectly still, and one step resets the whole count',
  run(ctx) {
    const at = { x: ctx.w * 0.42, y: ctx.cy };
    const { fx } = drivenCaster(ctx, at);
    const readout = label(ctx, ctx.w * 0.5, 12, '#3fc7d6', 11);
    let restSince = -1;
    let accum = 0;
    let healed = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));

    ctx.onFrame((dt, elapsed) => {
      // Walk, stop, collect, then a single step to show the count die.
      const walking = elapsed < 1200 || (elapsed > 6000 && elapsed < 6500);
      if (walking) {
        at.x += 90 * (dt / 1000);
        restSince = -1; accum = 0;
      } else if (restSince < 0) {
        restSince = elapsed;
      }
      g.clear();
      if (restSince >= 0) {
        // The breathing ring under the feet, swelling into every tick.
        const a = Phaser.Math.Clamp((elapsed - restSince) / 500, 0, 1);
        const breathe = 0.5 - 0.5 * Math.cos((accum / 1000) * Math.PI * 2);
        const rx = 40 + breathe * 9, ry = 14 + breathe * 3.5;
        g.fillStyle(ctx.tint(DRM.water), a * 0.1);
        g.fillEllipse(at.x, at.y + 20, rx * 2, ry * 2);
        g.lineStyle(2, ctx.tint(DRM.water), a * (0.28 + 0.34 * breathe));
        g.strokeEllipse(at.x, at.y + 20, rx * 2, ry * 2);
        for (let i = 0; i < 5; i++) {
          const ang = (elapsed / 1000) * 0.5 + (i / 5) * Math.PI * 2;
          star(g, ctx.tint, at.x + Math.cos(ang) * rx, at.y + 20 + Math.sin(ang) * ry, 2, a * 0.55, DRM.star, ang);
        }
        accum += dt;
        while (accum >= 1000) {
          accum -= 1000;
          healed += 5;
          ctx.capture(() => {
            fx.stardust(at.x, at.y - 4, 4, 20, 620, 6);
            float(ctx, at.x, at.y - 30, '💤 +5', '#3fc7d6', 12);
          });
        }
        readout.setText(`still for ${((elapsed - restSince) / 1000).toFixed(1)}s   —   ${healed} healed`);
      } else {
        readout.setText(elapsed < 1200
          ? 'walking — Rest pays nothing, but the pendulum is swinging'
          : 'one step and the second you were part-way through is gone');
      }
    });
  },
};
