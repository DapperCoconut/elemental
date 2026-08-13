import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  IceFx, ICE, IceAvatar, IceArmor, FROST_TONES, VOID_TONES, tonesFor,
} from '../../../elements/kits/IceVisuals';

/**
 * Ice's showcases — abilities, passives, the two perks and the three mastery enhancements.
 *
 * The base five elements keep their passive/perk/mastery loops in `subjects.ts`, which was
 * fine for five and would be a five-thousand-line file at forty-five. From ice onward an
 * element's subject loops live beside its ability loops, in this file; `previews/index.ts`
 * maps the keys either way.
 *
 * Everything here calls the real `IceFx`, so a retuned shatter or rink shows up in the codex
 * the same day it lands in the kit. What the scripts own is staging only.
 */

/** Fx wired to the box, plus the caster rig already facing the dummy. */
function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean; isVoid?: boolean }): { fx: IceFx; av: IceAvatar } {
  const fx = ctx.capture(() => new IceFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new IceAvatar(ctx.scene, ctx.tint)) as IceAvatar;
  av.setFacing(ctx.aim);
  // Black Ice repaints the rig itself, so any void loop has to ask for it.
  if (opts?.isVoid) av.setVoid?.(true);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * The ❄️×N label the kit prints over a frosted head, driven by a counter the script owns.
 * Frost is the whole element and it is invisible without this — every ice loop that applies a
 * stack shows the number moving.
 */
function frostLabel(ctx: PreviewCtx, o: { x: number; y: number; read: () => number; isVoid?: boolean }): void {
  const t = ctx.adopt(ctx.scene.add.text(o.x, o.y, '', {
    fontSize: '12px', fontFamily: 'Arial', color: o.isVoid ? '#cc88ff' : '#aaddff',
  }).setOrigin(0.5).setDepth(11));
  ctx.onFrame(() => {
    const n = Math.max(0, Math.round(o.read()));
    t.setText(n > 0 ? `${o.isVoid ? '☠️' : '❄️'}×${n}` : '');
  });
}

/** A patch of the real rink art, repainted every frame the way the kit repaints its trails. */
function rink(
  ctx: PreviewCtx, o: { x: number; y: number; r: number; born: number; life: number; isVoid?: boolean },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const seed = (o.x * 7.7 + o.y * 3.1) % 100;
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > o.life) return;
    const grow = Phaser.Math.Clamp(age / 220, 0, 1);
    const left = o.life - age;
    IceFx.drawRink(
      g, ctx.tint, tonesFor(!!o.isVoid), o.x, o.y, o.r * (0.55 + grow * 0.45),
      elapsed / 1000, left < 1000 ? left / 1000 : 1, seed,
    );
  });
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const iceSpike: PreviewScript = {
  duration: 3000,
  caption: 'Click — 8 damage, pierces, and screws one frost stack into whatever it passes',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 0;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    // Three shots at the real 0.6s cadence — the point of the click is repetition, not impact.
    [200, 800, 1400].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      const sx = ctx.cx + 30, sy = ctx.cy;
      fx.muzzleFrost(sx, sy, ctx.aim, 1, 8);
      ctx.fly({
        // Pierces, so the shard keeps going past the body it just frosted.
        texture: 'proj-ice', from: { x: sx, y: sy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
        onHit: () => {
          stacks = Math.min(5, stacks + 1);
          fx.flash(ctx.tx, ctx.ty, 22);
          fx.ring(ctx.tx, ctx.ty, 6, 26 + stacks * 5, ICE.pale, 300, 3, 8);
          fx.shards(ctx.tx, ctx.ty, 2 + stacks, { speed: 60 + stacks * 12, size: 2.2, life: 420, fall: 22, depth: 8 });
        },
      });
    }));
  },
};

export const iceSpikeUpgraded: PreviewScript = {
  duration: 3600,
  caption: 'Slush Thrower — hold after the shard: 2 damage every 200ms, and stacks stop expiring',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 0;
    // A timer bar that visibly drains, then gets wound back to full by the spray.
    let life = 0;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt) => {
      life = Math.max(0, life - dt / 8000);
      bar.clear();
      if (stacks === 0) return;
      bar.fillStyle(0x0b0d16, 0.9);
      bar.fillRoundedRect(ctx.tx - 26, ctx.ty - 56, 52, 7, 3);
      bar.fillStyle(ctx.tint(ICE.frost), 0.95);
      bar.fillRoundedRect(ctx.tx - 25, ctx.ty - 55, 50 * life, 5, 2);
    });
    ctx.at(200, () => {
      av.play('punch', ctx.aim);
      fx.muzzleFrost(ctx.cx + 30, ctx.cy, ctx.aim, 1, 8);
      ctx.fly({
        texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
        onHit: () => { stacks = 3; life = 1; fx.flash(ctx.tx, ctx.ty, 22); },
      });
    });
    // Then the hold: a churning cone at 5 ticks a second that never adds a stack.
    ctx.at(1400, () => {
      av.setHold('spray', ctx.aim);
      for (let i = 0; i < 10; i++) {
        ctx.at(i * 200, () => {
          fx.shards(ctx.cx + 90, ctx.cy, 3, {
            angle: ctx.aim, spread: Math.acos(0.8), speed: 90, size: 2.6, life: 340, fall: 28, depth: 8,
          });
          fx.vapor(ctx.cx + 60, ctx.cy, 2, 26, 4);
          // The refresh: the timer snaps back, the count does not move.
          life = 1;
          fx.flash(ctx.tx, ctx.ty, 12);
        });
      }
      ctx.at(2000, () => av.setHold(null));
    });
  },
};

export const frostBlast: PreviewScript = {
  duration: 3800,
  caption: 'E — 7.5 damage per stack, all of them spent, then 3s where none can be reapplied',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 5;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    ctx.at(600, () => {
      av.play('sweep', ctx.aim);
      // Hitscan: the beam is already at the wall on the frame it is cast.
      fx.beam(ctx.cx, ctx.cy, ctx.cx + ctx.w, ctx.cy, false, 8);
      fx.flash(ctx.tx, ctx.ty, 30);
      // The break scales with what was spent — five stacks is the loudest shatter in the kit.
      fx.shatter(ctx.tx, ctx.ty, 50 + 5 * 12, { shards: 8 + 5 * 3, vapor: 3, duration: 340 + 5 * 40 });
      stacks = 0;
      // The 3s lockout, drawn as a ring that will not accept anything.
      const lock = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 600) / 3000, 0, 1);
        lock.clear();
        if (t >= 1) return;
        lock.lineStyle(1.5, ctx.tint(ICE.steel), 0.5 * (1 - t));
        lock.strokeCircle(ctx.tx, ctx.ty, 24 + 6 * t);
      });
      // A spike thrown into the lockout window lands and applies nothing.
      ctx.at(1200, () => {
        av.play('punch', ctx.aim);
        ctx.fly({
          texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
          onHit: () => fx.vapor(ctx.tx, ctx.ty, 3, 22, 6),
        });
      });
    });
  },
};

export const frostBlastUpgraded: PreviewScript = {
  duration: 3800,
  caption: 'Frost Linger — blasted at 5 stacks, 2 are left behind; below 3, nothing is',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 5;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    ctx.at(700, () => {
      av.play('sweep', ctx.aim);
      fx.beam(ctx.cx, ctx.cy, ctx.cx + ctx.w, ctx.cy, false, 8);
      fx.shatter(ctx.tx, ctx.ty, 110, { shards: 23, vapor: 3, duration: 540 });
      // Two survive the blast, and the rime visibly re-knits around them.
      stacks = 2;
      ctx.at(140, () => {
        fx.rime(ctx.tx, ctx.ty, 26, 4);
        fx.ring(ctx.tx, ctx.ty, 4, 30, ICE.frost, 420, 2, 8);
      });
    });
    // The second blast, from 2 — under the threshold, so it scrapes them clean.
    ctx.at(2400, () => {
      av.play('sweep', ctx.aim);
      fx.beam(ctx.cx, ctx.cy, ctx.cx + ctx.w, ctx.cy, false, 8);
      fx.shatter(ctx.tx, ctx.ty, 74, { shards: 14, vapor: 2, duration: 420 });
      stacks = 0;
    });
  },
};

export const blockUp: PreviewScript = {
  duration: 4000,
  caption: 'R — toggle: ×0.75 damage taken, ×0.5 move speed, no timer and no cost',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(400, () => {
      av.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 36, 9, 4);
      // The real armour object, riding the caster for the rest of the loop.
      const armor = ctx.capture(() => new IceArmor(ctx.scene, ctx.tint, FROST_TONES, 32, 1, 3, 8));
      ctx.onFrame((dt) => armor.update(dt, ctx.cx, ctx.cy, 1));
      // Blows landing on it, each visibly softened rather than blocked outright.
      [900, 1600, 2300].forEach((at) => ctx.at(at - 400, () => {
        fx.flash(ctx.cx, ctx.cy, 20);
        fx.shards(ctx.cx, ctx.cy, 4, { speed: 90, size: 2.4, life: 380, fall: 30, depth: 7 });
      }));
      // And the toggle off: the plates simply fall away, free.
      ctx.at(2800, () => fx.shards(ctx.cx, ctx.cy, 8, { speed: 110, size: 2.8, life: 480, fall: 40, depth: 5 }));
    });
  },
};

export const blockUpUpgraded: PreviewScript = {
  duration: 5600,
  caption: 'Black Ice Morph — frost becomes void frost: 1 dmg/s per stack, and you take ×1.25',
  run(ctx) {
    const { fx, av } = stage(ctx, { isVoid: true });
    let stacks = 4;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks, isVoid: true });
    ctx.at(400, () => {
      av.play('flex');
      // The morph lands with weight: plates slam inward and lock.
      fx.bloom(ctx.cx, ctx.cy, 40, 11, 4, true);
      fx.rime(ctx.cx, ctx.cy, 40, 2, true);
      const armor = ctx.capture(() => new IceArmor(ctx.scene, ctx.tint, VOID_TONES, 34, 1.15, 3, 9));
      ctx.onFrame((dt) => armor.update(dt, ctx.cx, ctx.cy, 1));
      // The conversion, and then the DOT running at its real 1s cadence.
      ctx.at(200, () => fx.ring(ctx.tx, ctx.ty, 6, 34, ICE.voidPale, 420, 3, 8));
      for (let i = 1; i <= 4; i++) {
        ctx.at(200 + i * 1000, () => {
          fx.flash(ctx.tx, ctx.ty, 16, 7, true);
          fx.shards(ctx.tx, ctx.ty, 2, { speed: 26, size: 2.2, life: 620, fall: 26, depth: 7, isVoid: true });
        });
      }
      // Dropping out costs 15 HP and shatters the shell.
      ctx.at(4400, () => {
        fx.shatter(ctx.cx, ctx.cy, 70, { shards: 14, vapor: 2, duration: 460, isVoid: true });
        stacks = 0;
      });
    });
  },
};

export const skate: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'F — a locked 220 px/s glide; a 32px plate every 80ms, each standing 5s',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    // The caster rides its own lane: the skater travels the same curve the blades are cutting,
    // at the cadence they are cut, because a locked glide is the whole ability.
    const lane = (t: number): { x: number; y: number } => ({
      x: ctx.cx + 40 + t * (ctx.w - ctx.cx - 60),
      y: ctx.cy + Math.sin(t * 2.6) * 34,
    });
    ctx.at(300, () => {
      fx.wake(ctx.cx, ctx.cy, ctx.cx + 70, ctx.cy, 4);
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        const { x: px, y: py } = lane(t);
        // 80ms between plates — the real rate the blades cut them.
        ctx.at(i * 80, () => rink(ctx, { x: px, y: py, r: 32, born: 380 + i * 80, life: 5000 }));
      }
      ctx.onFrame((_dt, elapsed) => {
        const t = Math.max(0, Math.min(1, (elapsed - 300) / 2000));
        const p = lane(t);
        const ahead = lane(Math.min(1, t + 0.02));
        // Facing follows the lane, which is what steering by cursor looks like from outside.
        ctx.moveCaster(p.x, p.y, { facing: Math.atan2(ahead.y - p.y, ahead.x - p.x) });
      });
    });
  },
};

export const skateUpgraded: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: "Skater's Rush — your own ice pushes you ×1.2, and a braced launch freezes a 120px rink",
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    ctx.at(300, () => {
      // Launched out of Block Up: the whole floor under the caster goes over at once.
      av.play('flex');
      fx.ring(ctx.cx, ctx.cy, 12, 132, ICE.pale, 520, 5, 3);
      fx.icePillar(ctx.cx, ctx.cy, 20, 70, 6);
      rink(ctx, { x: ctx.cx, y: ctx.cy, r: 120, born: 300, life: 5000 });
      // The 2s stacking cadence inside it.
      for (let i = 1; i <= 2; i++) ctx.at(i * 2000, () => fx.rime(ctx.cx + 60, ctx.cy, 26, 4));
      // Then the ride out of it, with the speed boost reading as a widening wake.
      ctx.at(700, () => {
        av.play('dash', ctx.aim);
        // ×1.2 out of the braced launch — the skater leaves the rink it just froze.
        ctx.glideCaster({ to: { x: ctx.cx + 60 + 13 * 26, y: ctx.cy + 10 }, ms: 14 * 80 });
        for (let i = 0; i < 14; i++) {
          const px = ctx.cx + 60 + i * 26;
          ctx.at(i * 80, () => {
            rink(ctx, { x: px, y: ctx.cy + 10, r: 32, born: 1000 + i * 80, life: 5000 });
            if (i % 3 === 0) fx.wake(px - 20, ctx.cy + 10, px + 24, ctx.cy + 10, 4);
          });
        }
      });
    });
  },
};

export const frozenSolid: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Q — a 45° cone to the wall; 3s frozen solid, and their frost clock stops too',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(400, () => {
      av.play('raise', ctx.aim, 900);
      // ±22.5° and unlimited length: the cone runs off the edge of the box on purpose.
      fx.frostCone(ctx.cx, ctx.cy, ctx.aim, ctx.w * 1.4, Math.PI / 8, 7);
      ctx.at(120, () => {
        fx.flash(ctx.tx, ctx.ty, 34);
        fx.crystalBloom(ctx.tx, ctx.ty, 40, 600, 6);
        // The shell, standing for its real 3 seconds.
        const shell = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 520) / 3000, 0, 1);
          shell.clear();
          if (t >= 1) return;
          shell.fillStyle(ctx.tint(ICE.sky), 0.22);
          shell.fillCircle(ctx.tx, ctx.ty, 26);
          shell.lineStyle(2, ctx.tint(ICE.pale), 0.7 * (1 - t * 0.4));
          shell.strokeCircle(ctx.tx, ctx.ty, 26);
        });
        ctx.at(3000, () => fx.shards(ctx.tx, ctx.ty, 9, { speed: 120, size: 2.8, life: 460, fall: 40, depth: 6 }));
      });
    });
  },
};

export const frozenSolidUpgraded: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Shatter Strike — while they are sealed, the next shot to land deals ×1.25',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 900);
      fx.frostCone(ctx.cx, ctx.cy, ctx.aim, ctx.w * 1.4, Math.PI / 8, 7);
      const shell = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      let sealed = true;
      ctx.onFrame((_dt, elapsed) => {
        shell.clear();
        if (!sealed || elapsed < 420) return;
        // Primed: the shell is under visible tension while the charge is unspent.
        const p = 0.55 + 0.35 * Math.abs(Math.sin(elapsed / 150));
        shell.fillStyle(ctx.tint(ICE.sky), 0.22);
        shell.fillCircle(ctx.tx, ctx.ty, 26);
        shell.lineStyle(2.5, ctx.tint(ICE.white), p);
        shell.strokeCircle(ctx.tx, ctx.ty, 26);
      });
      // The projectile that cashes it — Shatter Strike rides the shot, not the cone.
      ctx.at(1500, () => {
        av.play('punch', ctx.aim);
        fx.muzzleFrost(ctx.cx + 30, ctx.cy, ctx.aim, 1, 8);
        ctx.fly({
          texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
          onHit: () => {
            sealed = false;
            fx.shatter(ctx.tx, ctx.ty, 96, { shards: 20, vapor: 3, duration: 520 });
            fx.ring(ctx.tx, ctx.ty, 10, 74, ICE.white, 460, 4, 8);
            const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 30, 'SHATTER!', {
              fontSize: '11px', color: '#88ccff', fontFamily: 'Arial Black',
            }).setOrigin(0.5).setDepth(12));
            ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1200 });
          },
        });
      });
    });
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveFrostStacks: PreviewScript = {
  duration: 5200,
  caption: 'Passive — 5 stacks max, 8s each; ×1.20 at three, ×1.30 at four, ×1.45 at five',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 0;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    // The multiplier readout, which is the part of the passive players never see spelled out.
    const mult = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 60, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffb3aa',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame(() => {
      const m = stacks >= 5 ? 1.45 : stacks >= 4 ? 1.30 : stacks >= 3 ? 1.20 : 1;
      mult.setText(m > 1 ? `×${m.toFixed(2)} DAMAGE TAKEN` : '');
    });
    // Five stacks applied one at a time, the snap growing with each.
    for (let i = 0; i < 5; i++) {
      ctx.at(300 + i * 620, () => {
        av.play('punch', ctx.aim);
        ctx.fly({
          texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
          onHit: () => {
            stacks += 1;
            fx.ring(ctx.tx, ctx.ty, 6, 26 + stacks * 5, ICE.pale, 300, 3, 8);
            fx.shards(ctx.tx, ctx.ty, 2 + stacks, { speed: 60 + stacks * 12, size: 2.2, life: 420, fall: 22, depth: 8 });
            if (stacks >= 3) fx.rime(ctx.tx, ctx.ty, 20 + stacks * 3, 4);
          },
        });
      });
    }
    // Then they fall off one at a time, not all together — the detail the label hides.
    ctx.at(4200, () => { stacks -= 1; fx.vapor(ctx.tx, ctx.ty, 2, 20, 6); });
    ctx.at(4700, () => { stacks -= 1; fx.vapor(ctx.tx, ctx.ty, 2, 20, 6); });
  },
};

export const passiveShatterTheShell: PreviewScript = {
  duration: 4200,
  caption: 'Passive — hitting a frozen target frees them, and buries 3 stacks doing it',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 0;
    let sealed = false;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    const shell = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((_dt, elapsed) => {
      shell.clear();
      if (!sealed) return;
      shell.fillStyle(ctx.tint(ICE.sky), 0.22);
      shell.fillCircle(ctx.tx, ctx.ty, 26);
      shell.lineStyle(2, ctx.tint(ICE.pale), 0.7 + 0.2 * Math.sin(elapsed / 200));
      shell.strokeCircle(ctx.tx, ctx.ty, 26);
    });
    ctx.at(400, () => {
      av.play('raise', ctx.aim, 600);
      fx.frostCone(ctx.cx, ctx.cy, ctx.aim, ctx.w, Math.PI / 8, 7);
      ctx.at(150, () => { sealed = true; fx.crystalBloom(ctx.tx, ctx.ty, 38, 560, 6); });
    });
    // The trade: three seconds of lockdown swapped for three stacks, deliberately.
    ctx.at(1900, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520, pierce: true,
        onHit: () => {
          sealed = false;
          stacks = 3;
          fx.shatter(ctx.tx, ctx.ty, 88, { shards: 18, vapor: 3, duration: 480 });
          fx.rime(ctx.tx, ctx.ty, 30, 4);
        },
      });
    });
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkRink: PreviewScript = {
  duration: 5200,
  scale: 0.88,
  caption: 'Perk — Frozen Solid glazes its whole cone for 8s; you get ×1.25 on your own ice',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(400, () => {
      av.play('raise', ctx.aim, 900);
      fx.frostCone(ctx.cx, ctx.cy, ctx.aim, ctx.w * 1.3, Math.PI / 8, 7);
      // 8 distance bands × 4 angles, staggered by distance so the sheet freezes outward.
      const steps = [0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 1.0];
      const offsets = [-0.6, -0.25, 0.25, 0.6];
      const half = Math.PI / 8;
      steps.forEach((s, si) => {
        for (const ao of offsets) {
          const a = ctx.aim + ao * half;
          const px = ctx.cx + Math.cos(a) * s * ctx.w * 1.15;
          const py = ctx.cy + Math.sin(a) * s * ctx.w * 1.15;
          ctx.at(si * 90, () => rink(ctx, { x: px, y: py, r: 32, born: 400 + si * 90, life: 8000 }));
        }
      });
      // And the payoff: the caster carving across their own sheet, quicker for it.
      ctx.at(1600, () => {
        av.play('dash', ctx.aim);
        for (let i = 0; i < 8; i++) {
          ctx.at(i * 150, () => fx.wake(ctx.cx + i * 60, ctx.cy + 12, ctx.cx + 54 + i * 60, ctx.cy + 12, 4));
        }
      });
    });
  },
};

export const perkSnow: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Divine perk — Q plants a turret instead of freezing: feed it spikes, 15 damage every 5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const bx = ctx.cx + 110, by = ctx.cy - 6;
    let ammo = 0;
    // The turret and its ammo counter, drawn as the kit draws them.
    const turret = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const label = ctx.adopt(ctx.scene.add.text(bx, by - 34, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ccf0ff',
    }).setOrigin(0.5).setDepth(11));
    let live = false;
    ctx.onFrame((_dt, elapsed) => {
      turret.clear();
      label.setText('');
      if (!live) return;
      const aim = ctx.aim + Math.sin(elapsed / 900) * 0.25;
      turret.fillStyle(ctx.tint(ICE.steel), 0.9);
      turret.fillCircle(bx, by, 15);
      turret.fillStyle(ctx.tint(ICE.frost), 0.95);
      turret.fillCircle(bx, by, 10);
      turret.fillStyle(ctx.tint(ICE.pale), 1);
      turret.fillCircle(bx + Math.cos(aim) * 14, by + Math.sin(aim) * 14, 6);
      label.setText(`${ammo}/5`);
    });
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 700);
      live = true;
      fx.icePillar(bx, by, 18, 54, 6);
      fx.ring(bx, by, 8, 44, ICE.pale, 460, 4, 5);
    });
    // Loading it: spikes eaten within 30px of the barrel.
    [900, 1400, 1900].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-ice', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: bx, y: by }, speed: 520,
        onHit: () => { ammo = Math.min(5, ammo + 1); fx.flash(bx, by, 16); },
      });
    }));
    // And a round going downrange: 15 damage, a stack, and a 3s 50% slow.
    ctx.at(3000, () => {
      ammo = Math.max(0, ammo - 1);
      fx.muzzleFrost(bx, by, ctx.aim, 0.8, 6);
      ctx.fly({
        texture: 'proj-ice', from: { x: bx, y: by }, to: { x: ctx.tx, y: ctx.ty }, speed: 460,
        onHit: () => {
          fx.flash(ctx.tx, ctx.ty, 24);
          fx.vapor(ctx.tx, ctx.ty, 4, 30, 6);
          fx.ring(ctx.tx, ctx.ty, 6, 34, ICE.frost, 420, 3, 8);
        },
      });
    });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryViralFrost: PreviewScript = {
  duration: 5000,
  caption: 'Mastery passive — a frosted body passes 1 stack to anything within 40px, once a second',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    // Three bodies in a line: only the first is frosted, and the cold walks down the row.
    const marks = [{ x: ctx.tx - 40, y: ctx.ty }, { x: ctx.tx, y: ctx.ty + 6 }, { x: ctx.tx + 40, y: ctx.ty - 4 }];
    const counts = [3, 0, 0];
    marks.forEach((m, i) => {
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(m.x, m.y, 15);
      g.fillStyle(0x3c4254, 1); g.fillCircle(m.x, m.y, 11);
      frostLabel(ctx, { x: m.x, y: m.y - 34, read: () => counts[i] });
    });
    // 40px apart and gated at one catch per second, exactly as the kit gates it.
    const spread = (at: number, from: number, to: number): void => ctx.at(at, () => {
      counts[to] += 1;
      fx.ring(marks[to].x, marks[to].y, 4, 24, ICE.frost, 320, 2, 8);
      fx.shards(marks[to].x, marks[to].y, 3, { speed: 70, size: 2.2, life: 420, fall: 22, depth: 8 });
      const link = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      const born = at;
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - born) / 400, 0, 1);
        link.clear();
        if (t >= 1) return;
        link.lineStyle(2, ctx.tint(ICE.pale), 0.6 * (1 - t));
        link.lineBetween(marks[from].x, marks[from].y, marks[to].x, marks[to].y);
      });
    });
    spread(800, 0, 1);
    spread(1900, 1, 2);
    spread(2900, 0, 1);
    spread(3900, 1, 2);
  },
};

export const masteryIcicleImpale: PreviewScript = {
  duration: 5400,
  caption: 'Mastery — dash, impale, then 50 damage later it bursts for 2 stacks past the cap',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let stacks = 4;
    let dealt = 0;
    let impaled = false;
    frostLabel(ctx, { x: ctx.tx, y: ctx.ty - 42, read: () => stacks });
    // The 50-damage fuse, drawn as a bar so the trigger is legible.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame(() => {
      bar.clear();
      if (!impaled) return;
      bar.fillStyle(0x0b0d16, 0.9);
      bar.fillRoundedRect(ctx.tx - 26, ctx.ty - 58, 52, 7, 3);
      bar.fillStyle(ctx.tint(ICE.white), 0.95);
      bar.fillRoundedRect(ctx.tx - 25, ctx.ty - 57, 50 * Math.min(1, dealt / 50), 5, 2);
    });
    // The spike itself, standing in the wound until it goes.
    const spike = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      spike.clear();
      if (!impaled) return;
      const bob = Math.sin(elapsed / 260) * 1.6;
      spike.fillStyle(ctx.tint(ICE.pale), 0.95);
      spike.fillTriangle(ctx.tx - 3, ctx.ty - 6 + bob, ctx.tx + 3, ctx.ty - 6 + bob, ctx.tx, ctx.ty - 30 + bob);
      spike.fillStyle(ctx.tint(ICE.white), 0.9);
      spike.fillTriangle(ctx.tx - 1.2, ctx.ty - 8 + bob, ctx.tx + 1.2, ctx.ty - 8 + bob, ctx.tx, ctx.ty - 27 + bob);
    });
    ctx.at(500, () => {
      // 900 px/s for 150ms — about 135px of ground, which is most of the gap.
      av.play('dash', ctx.aim);
      fx.wake(ctx.cx, ctx.cy, ctx.cx + 135, ctx.cy, 4);
      ctx.at(150, () => {
        impaled = true;
        fx.flash(ctx.tx, ctx.ty, 28);
        fx.crystalBloom(ctx.tx, ctx.ty, 30, 460, 6);
      });
    });
    // Ordinary damage filling the fuse, then the burst past the 5-stack cap.
    [1400, 2100, 2800].forEach((at) => ctx.at(at, () => {
      dealt += 18;
      fx.flash(ctx.tx, ctx.ty, 16);
      if (dealt >= 50 && impaled) {
        impaled = false;
        stacks = 6;
        fx.shatter(ctx.tx, ctx.ty, 82, { shards: 16, vapor: 2, duration: 460 });
        fx.rime(ctx.tx, ctx.ty, 34, 4);
        const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 66, '×1.60 DAMAGE TAKEN', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#ffb3aa',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
      }
    }));
  },
};

export const masteryCurlingStone: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Mastery — shoot the stone to load and shove it: 30 damage bare, 60 at 5 frost',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const stone = { x: ctx.cx + 70, y: ctx.cy + 16, vx: 0, spin: 0, stacks: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const label = ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#aaddff',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame((dt) => {
      // Real behaviour: it coasts, it drags, and below 26 px/s it is harmless furniture.
      stone.x += stone.vx * (dt / 1000);
      stone.vx *= Math.pow(0.35, dt / 1000);
      stone.spin += stone.vx * (dt / 1000) * 0.05;
      g.clear();
      g.fillStyle(ctx.tint(ICE.steel), 0.95);
      g.fillCircle(stone.x, stone.y, 18);
      g.fillStyle(ctx.tint(stone.stacks >= 5 ? ICE.white : ICE.frost), 0.9);
      g.fillCircle(stone.x, stone.y, 13 - stone.stacks * 0.6);
      // The rime crust thickens with every layer frozen on.
      g.lineStyle(1.5 + stone.stacks * 0.6, ctx.tint(ICE.pale), 0.85);
      g.strokeCircle(stone.x, stone.y, 18);
      g.lineStyle(2.5, ctx.tint(ICE.deep), 0.9);
      g.lineBetween(stone.x, stone.y, stone.x + Math.cos(stone.spin) * 12, stone.y + Math.sin(stone.spin) * 12);
      label.setPosition(stone.x, stone.y - 32).setText(stone.stacks > 0 ? `❄️×${stone.stacks}` : '');
    });
    // Five shots, each loading a layer and shoving harder than the last.
    for (let i = 0; i < 5; i++) {
      ctx.at(400 + i * 520, () => {
        av.play('punch', ctx.aim);
        const sx = ctx.cx + 30;
        fx.muzzleFrost(sx, ctx.cy, ctx.aim, 0.9, 8);
        const target = { x: stone.x, y: stone.y };
        ctx.fly({
          texture: 'proj-ice', from: { x: sx, y: ctx.cy }, to: target, speed: 520,
          onHit: () => {
            stone.stacks = Math.min(5, stone.stacks + 1);
            // 150 base push, +62 a stack — the loaded stone travels three times as far.
            stone.vx = 150 + stone.stacks * 62;
            fx.flash(stone.x, stone.y, 20);
            fx.shards(stone.x, stone.y, 3 + stone.stacks, { speed: 80, size: 2.4, life: 400, fall: 26, depth: 7 });
          },
        });
      });
    }
    // The slam, once it is loaded: 60 damage and a shove, once per second per target.
    ctx.at(3400, () => {
      fx.shatter(ctx.tx, ctx.ty, 70, { shards: 14, vapor: 2, duration: 440 });
      fx.ring(ctx.tx, ctx.ty, 8, 56, ICE.white, 420, 4, 8);
    });
  },
};
