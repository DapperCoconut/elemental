import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  ShadowFx, SHADOW, ShadowAvatar, ShadowShroud, shadowTendrilLayered,
} from '../../../elements/kits/ShadowVisuals';

/**
 * Shadow's showcases. Everything calls the real `ShadowFx`, so a retuned implosion or pool
 * shows up here the day it lands in the kit; the scripts own the staging only.
 *
 * Two things recur because they are the element: the pool (drawn with `ShadowFx.drawPool`,
 * exactly as the kit repaints its own) and the Hopelessness readout, which is otherwise
 * invisible in a still frame.
 */

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: ShadowFx; av: ShadowAvatar } {
  const fx = ctx.capture(() => new ShadowFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ShadowAvatar(ctx.scene, ctx.tint)) as ShadowAvatar;
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * A dark bomb in flight.
 *
 * Shadow is one of the elements that throws no sprite — `DarkBomb` is a Graphics the kit steps
 * and repaints itself, so there is no `proj-shadow` texture and `ctx.fly` has nothing to launch.
 * This mirrors `updateDarkBombs` exactly: the same 380ms flight whatever the distance, the same
 * accelerating ease, the same four-tendril tail off the shared `shadowTendrilLayered` primitive,
 * and the same radius per mode.
 */
function flyBomb(
  ctx: PreviewCtx,
  o: { from: { x: number; y: number }; to: { x: number; y: number }; mode?: 'bomb' | 'watcher' | 'shell'; onHit?: () => void },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const mode = o.mode ?? 'bomb';
  const r = mode === 'watcher' ? 6.5 : mode === 'shell' ? 10 : 9;
  let born = -1;
  let px = o.from.x, py = o.from.y;
  let done = false;
  ctx.onFrame((_dt, elapsed) => {
    if (born < 0) born = elapsed;
    if (done) return;
    const t = Math.min(1, (elapsed - born) / 380);
    const ease = t * t * (3 - 2 * t) * 0.4 + t * t * 0.6;
    const x = o.from.x + (o.to.x - o.from.x) * ease;
    const y = o.from.y + (o.to.y - o.from.y) * ease;
    g.clear();
    const back = Math.atan2(py - y, px - x);
    const speed = Math.hypot(x - px, y - py);
    px = x; py = y;
    for (let k = 0; k < 4; k++) {
      shadowTendrilLayered(
        g, ctx.tint, x, y, back + (k - 1.5) * 0.34,
        r * 1.4 + speed * 1.5, r * 0.4, Math.sin(elapsed * 0.01 + k) * 6,
        0.75, 4, k * 1.7, { barbs: 0, rim: false },
      );
    }
    g.fillStyle(ctx.tint(SHADOW.orchid), 0.42);
    g.fillCircle(x, y, r * 1.7);
    g.fillStyle(ctx.tint(SHADOW.abyss), 0.98);
    g.fillCircle(x, y, r);
    g.lineStyle(2, ctx.tint(mode === 'watcher' ? SHADOW.blood : SHADOW.mauve), 0.9);
    g.strokeCircle(x, y, r * (1.08 + Math.sin(elapsed * 0.02) * 0.1));
    if (t >= 1) { done = true; g.clear(); o.onHit?.(); }
  });
}

/** A live shadow pool, painted every frame the way `drawDarkClouds` paints the real ones. */
function pool(
  ctx: PreviewCtx, o: { x: number; y: number; r?: number; born: number; life?: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const seed = (o.x * 0.7 + o.y * 1.3) % 6.28;
  const r = o.r ?? 36;
  const life = o.life ?? 6000;
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > life) return;
    const grow = Math.min(1, age / 260);
    const left = life - age;
    ShadowFx.drawPool(g, ctx.tint, o.x, o.y, r * (0.5 + grow * 0.5), elapsed / 1000,
      left < 900 ? left / 900 : 1, seed);
  });
}

/**
 * The Hopelessness readout: the number, and the blackening it causes. Nothing else in the kit
 * is worth watching without it — the whole element is a meter that makes the enemy hit softer.
 */
function despair(ctx: PreviewCtx, o: { x: number; y: number; read: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const t = ctx.adopt(ctx.scene.add.text(o.x, o.y - 52, '', {
    fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
  }).setOrigin(0.5).setDepth(11));
  ctx.onFrame(() => {
    const v = Phaser.Math.Clamp(o.read(), 0, 100);
    g.clear();
    // The bar, plus the suppression it is actually buying: 2 points = 1% off their damage.
    g.fillStyle(0x0b0d16, 0.9);
    g.fillRoundedRect(o.x - 30, o.y - 40, 60, 8, 4);
    g.fillStyle(ctx.tint(SHADOW.lilac), 0.95);
    g.fillRoundedRect(o.x - 29, o.y - 39, Math.max(0, 58 * (v / 100)), 6, 3);
    // Their silhouette darkens in proportion, exactly as the kit tints the fighter.
    g.fillStyle(0x000000, 0.85 * (v / 100));
    g.fillCircle(o.x, o.y, 17);
    t.setText(v > 0 ? `🕳️ ${Math.round(v)}  —  −${Math.round(Math.min(50, v / 2))}% THEIR DAMAGE` : '');
  });
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const darkDrain: PreviewScript = {
  duration: 4200,
  caption: 'Click tap — a 10 damage implosion that leaves a pool: 5 dmg/s to them, 3.75 HP/s to you',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let hope = 0;
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    ctx.at(300, () => {
      av.play('punch', ctx.aim);
      fx.muzzleUmbra(ctx.cx + 30, ctx.cy, ctx.aim, 1, 6);
      flyBomb(ctx, {
        from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        onHit: () => {
          // It implodes rather than exploding — the whole shadow read.
          fx.implosion(ctx.tx, ctx.ty, 62, { tendrils: 10, gloom: 2, duration: 400 });
          pool(ctx, { x: ctx.tx, y: ctx.ty, born: 1000 });
          // 3 Hopelessness a second for as long as they stand in it.
          ctx.onFrame((dt, elapsed) => { if (elapsed > 1000) hope = Math.min(100, hope + (dt / 1000) * 3); });
          // And the 0.4s drain tick, at its real rate.
          for (let i = 1; i <= 7; i++) {
            ctx.at(i * 400, () => fx.wisps(ctx.tx, ctx.ty, 2, { speed: 30, size: 2.4, life: 520, rise: -18, depth: 4 }));
          }
        },
      });
    });
  },
};

export const darkDrainUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Cloud Confusion — hold Click to pour a pool every 0.6s; 3s inside one confuses for 3s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      // The pour: hands out along the aim, laying dark at the cursor.
      av.setHold('spray', ctx.aim);
      for (let i = 0; i < 5; i++) {
        const px = ctx.tx - 60 + i * 34;
        ctx.at(i * 600, () => {
          pool(ctx, { x: px, y: ctx.ty + 8, born: 300 + i * 600 });
          fx.ring(px, ctx.ty + 8, 7, 40, SHADOW.lilac, 420, 3, 3);
        });
      }
      ctx.at(3000, () => av.setHold(null));
    });
    // Three continuous seconds in the dark, then the mind goes.
    ctx.at(3300, () => {
      fx.gloom(ctx.tx, ctx.ty, 6, 40, 6);
      const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 44, '❓ CONFUSED 3s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1600 });
      // Their movement goes random — they can still swing, they just cannot choose where to go.
      const wander = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
      ctx.onFrame((_dt, elapsed) => {
        const k = elapsed - 3300;
        wander.clear();
        if (k < 0) return;
        const wx = ctx.tx + Math.sin(k / 130) * 26 + Math.sin(k / 47) * 9;
        const wy = ctx.ty + Math.cos(k / 90) * 12;
        wander.fillStyle(0x2b2f3d, 1); wander.fillCircle(wx, wy, 17);
        wander.fillStyle(0x3c4254, 1); wander.fillCircle(wx, wy, 13);
      });
    });
  },
};

export const tentacle: PreviewScript = {
  duration: 4400,
  caption: 'E — 10 damage and 10 Hopelessness, then dragged to your cursor for 3s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    // The victim is drawn by the script because the whole ability is that they get moved.
    const drag = { x: ctx.cx + 110, y: ctx.cy };
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const tether = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let hooked = false;
    ctx.onFrame((_dt, elapsed) => {
      body.clear(); tether.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(drag.x, drag.y, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(drag.x, drag.y, 13);
      if (!hooked) return;
      // The kit's own tether art, drawn taut because it has hold of something.
      ShadowFx.drawTether(tether, ctx.tint, ctx.cx, ctx.cy, drag.x, drag.y, elapsed / 1000, 1, true);
    });
    despair(ctx, { x: ctx.cx + 110, y: ctx.cy - 46, read: () => hope });
    ctx.at(400, () => {
      av.play('sweep', ctx.aim);
      fx.lash(ctx.cx, ctx.cy, ctx.aim, 100);
      ctx.at(120, () => {
        hooked = true;
        hope = 10;
        fx.tendrilBurst(drag.x, drag.y, 34, 6, 7);
        // Hauled toward the cursor for the real 3s, wherever it goes.
        ctx.onFrame((dt, elapsed) => {
          const k = elapsed - 520;
          if (k < 0 || k > 3000) { hooked = k <= 3000; return; }
          const gx = ctx.cx + 60 + Math.sin(k / 500) * 70;
          const gy = ctx.cy + Math.cos(k / 700) * 28;
          drag.x += (gx - drag.x) * Math.min(1, dt / 120);
          drag.y += (gy - drag.y) * Math.min(1, dt / 120);
        });
      });
    });
  },
};

export const tentacleUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Consume — drag them onto yourself: 3s immobile, 2 dmg/s, then E throws them at 800',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const drag = { x: ctx.cx + 130, y: ctx.cy };
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const tether = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let phase: 'free' | 'hauled' | 'eaten' | 'thrown' = 'free';
    ctx.onFrame((_dt, elapsed) => {
      body.clear(); tether.clear();
      if (phase !== 'eaten') {
        body.fillStyle(0x2b2f3d, 1); body.fillCircle(drag.x, drag.y, 17);
        body.fillStyle(0x3c4254, 1); body.fillCircle(drag.x, drag.y, 13);
      }
      if (phase === 'hauled') {
        ShadowFx.drawTether(tether, ctx.tint, ctx.cx, ctx.cy, drag.x, drag.y, elapsed / 1000, 1, true);
      }
    });
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      fx.lash(ctx.cx, ctx.cy, ctx.aim, 100);
      phase = 'hauled';
      // Dragged all the way in — inside 22px is what triggers the swallow.
      ctx.onFrame((dt) => {
        if (phase !== 'hauled') return;
        drag.x += (ctx.cx - drag.x) * Math.min(1, dt / 260);
        drag.y += (ctx.cy - drag.y) * Math.min(1, dt / 260);
      });
    });
    ctx.at(1300, () => {
      phase = 'eaten';
      // The real shroud of limbs closing over the pair.
      const shroud = ctx.capture(() => new ShadowShroud(ctx.scene, ctx.tint, 30, 1.2, 4, 9));
      ctx.onFrame((dt) => shroud.update(dt, ctx.cx, ctx.cy, phase === 'eaten' ? 1 : 0));
      fx.implosion(ctx.cx, ctx.cy, 54, { tendrils: 10, gloom: 2, duration: 420 });
      // 2 damage a second for 3 seconds, at its real cadence.
      for (let i = 1; i <= 3; i++) {
        ctx.at(i * 1000, () => fx.flash(ctx.cx, ctx.cy, 20));
      }
    });
    // Then E again: spat at the cursor at 800.
    ctx.at(4300, () => {
      phase = 'thrown';
      drag.x = ctx.cx; drag.y = ctx.cy;
      av.play('punch', ctx.aim);
      fx.smear(ctx.cx, ctx.cy, ctx.w - 20, ctx.cy, 4);
      ctx.onFrame((dt) => { if (phase === 'thrown') drag.x += 800 * (dt / 1000); });
    });
  },
};

export const snapTrap: PreviewScript = {
  duration: 4600,
  caption: 'R — planted at YOUR feet: 20 damage, 20 Hopelessness, 2s stun, 12s to wait',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    let sprung = false;
    const tx = ctx.cx + 40;
    const victim = { x: ctx.w - 40, y: ctx.cy };
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const trap = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      body.clear(); trap.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(victim.x, victim.y, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(victim.x, victim.y, 13);
      if (elapsed < 400) return;
      // The jaws: teeth quivering round a pressure plate with a charge breathing in the middle.
      const r = 18 * Math.min(1, (elapsed - 400) / 220);
      trap.fillStyle(ctx.tint(SHADOW.abyss), 0.3);
      trap.fillEllipse(tx, ctx.cy + r * 0.35, r * 2.1, r * 0.8);
      if (sprung) return;
      trap.lineStyle(2, ctx.tint(SHADOW.mauve), 0.9);
      trap.strokeCircle(tx, ctx.cy, r);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.sin(elapsed / 400) * 0.06;
        trap.fillStyle(ctx.tint(SHADOW.lilac), 0.9);
        trap.fillTriangle(
          tx + Math.cos(a) * r, ctx.cy + Math.sin(a) * r,
          tx + Math.cos(a + 0.22) * r, ctx.cy + Math.sin(a + 0.22) * r,
          tx + Math.cos(a + 0.11) * r * 0.55, ctx.cy + Math.sin(a + 0.11) * r * 0.55,
        );
      }
      trap.fillStyle(ctx.tint(SHADOW.pale), 0.4 + 0.4 * Math.abs(Math.sin(elapsed / 260)));
      trap.fillCircle(tx, ctx.cy, 3.4);
    });
    despair(ctx, { x: ctx.w - 40, y: ctx.cy - 46, read: () => hope });
    ctx.at(400, () => { av.play('clap'); fx.ring(tx, ctx.cy, 4, 24, SHADOW.lilac, 340, 3, 3); });
    // They walk in — the trap never comes to them.
    ctx.at(1200, () => ctx.onFrame((dt) => { if (!sprung) victim.x -= 90 * (dt / 1000); }));
    ctx.at(3000, () => {
      sprung = true;
      hope = 20;
      victim.x = tx + 6;
      fx.tendrilBurst(tx, ctx.cy, 40, 9, 7);
      fx.implosion(tx, ctx.cy, 44, { tendrils: 8, gloom: 1, duration: 360 });
      const t = ctx.adopt(ctx.scene.add.text(tx, ctx.cy - 34, '⛓️ STUNNED 2s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
    });
  },
};

export const snapTrapUpgraded: PreviewScript = {
  duration: 4800,
  caption: 'Trap Drag — 50% wider jaws, and the tentacle hauls a laid trap under their feet',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    // A trap laid in the wrong place, then moved. That is the entire upgrade.
    const trapPos = { x: ctx.cx + 30, y: ctx.cy + 34 };
    const victim = { x: ctx.tx + 30, y: ctx.ty - 10 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const tether = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let hauling = false;
    let laid = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); tether.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(victim.x, victim.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(victim.x, victim.y, 13);
      if (!laid) return;
      // 27px instead of 18 — the wider plate drawn at its real size.
      g.lineStyle(2, ctx.tint(SHADOW.mauve), 0.9);
      g.strokeCircle(trapPos.x, trapPos.y, 27);
      g.fillStyle(ctx.tint(SHADOW.lilac), 0.35);
      g.fillCircle(trapPos.x, trapPos.y, 27);
      g.fillStyle(ctx.tint(SHADOW.pale), 0.5 + 0.4 * Math.abs(Math.sin(elapsed / 260)));
      g.fillCircle(trapPos.x, trapPos.y, 4);
      if (hauling) {
        ShadowFx.drawTether(tether, ctx.tint, ctx.cx, ctx.cy, trapPos.x, trapPos.y, elapsed / 1000, 1, true);
      }
    });
    ctx.at(300, () => { laid = true; av.play('clap'); fx.ring(trapPos.x, trapPos.y, 4, 34, SHADOW.lilac, 340, 3, 3); });
    ctx.at(1200, () => {
      av.play('sweep', ctx.aim);
      fx.lash(ctx.cx, ctx.cy, Math.atan2(trapPos.y - ctx.cy, trapPos.x - ctx.cx), 60);
      hauling = true;
      // The full 3s hold, spent repositioning rather than dragging a body.
      ctx.onFrame((dt, elapsed) => {
        if (!hauling) return;
        if (elapsed > 4200) { hauling = false; return; }
        trapPos.x += (victim.x - trapPos.x) * Math.min(1, dt / 700);
        trapPos.y += (victim.y - trapPos.y) * Math.min(1, dt / 700);
      });
    });
    ctx.at(3800, () => {
      fx.tendrilBurst(victim.x, victim.y, 40, 9, 7);
      fx.implosion(victim.x, victim.y, 48, { tendrils: 8, gloom: 1, duration: 380 });
    });
  },
};

export const tentacleWall: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'F — 8 limbs, one every 55ms, each aimed where the cursor is: 5 damage, 10 Hopelessness',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Steered mid-cast, which is the ability: the wall curves after the mouse.
    const limbs: { x: number; y: number; born: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const l of limbs) {
        const age = elapsed - l.born;
        if (age < 0 || age > 6440) continue;
        const grow = Phaser.Math.Clamp(age / 200, 0, 1);
        const fade = age > 5940 ? Math.max(0, (6440 - age) / 500) : 1;
        g.fillStyle(ctx.tint(SHADOW.orchid), 0.95 * fade);
        shadowTendrilLayered(
          g, ctx.tint, l.x, l.y, -Math.PI / 2, 54 * grow, 7,
          Math.sin(elapsed / 300 + l.x) * 0.25, fade, 6, elapsed / 260, { barbs: 3 },
        );
      }
    });
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      fx.ring(ctx.cx, ctx.cy, 10, 70, SHADOW.mauve, 420, 4, 3);
      // 8 limbs, 34px apart, at the real 55ms stagger, curved by a moving cursor.
      for (let i = 0; i < 8; i++) {
        ctx.at(i * 55, () => {
          const t = i / 7;
          limbs.push({
            x: ctx.cx + 30 + i * 34,
            y: ctx.cy + Math.sin(t * 2.2) * 40,
            born: 300 + i * 55,
          });
          fx.wisps(ctx.cx + 30 + i * 34, ctx.cy + Math.sin(t * 2.2) * 40, 2,
            { speed: 50, size: 2.4, life: 380, rise: -14, depth: 4 });
        });
      }
    });
    // Something walking the wall: gated to one hit a second however many limbs it touches.
    for (let i = 0; i < 3; i++) {
      ctx.at(1400 + i * 1000, () => {
        fx.tendrilBurst(ctx.tx, ctx.ty, 28, 5, 7);
        fx.flash(ctx.tx, ctx.ty, 18);
      });
    }
  },
};

export const tentacleWallUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Watchers — 20% of limbs grow eyes and lob bolts that ×1.25 their Hopelessness',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let hope = 40;
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    const limbs: { x: number; y: number; born: number; eyed: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const l of limbs) {
        const age = elapsed - l.born;
        if (age < 0) continue;
        const grow = Phaser.Math.Clamp(age / 200, 0, 1);
        // Watchers are darker than their neighbours, which is how you spot one mid-fight.
        g.fillStyle(ctx.tint(l.eyed ? SHADOW.pitch : SHADOW.orchid), 0.95);
        shadowTendrilLayered(
          g, ctx.tint, l.x, l.y, -Math.PI / 2, 54 * grow, l.eyed ? 8 : 7,
          Math.sin(elapsed / 300 + l.x) * 0.25, 1, 6, elapsed / 260, { barbs: 3 },
        );
        if (!l.eyed || grow < 1) continue;
        g.fillStyle(ctx.tint(SHADOW.blood), 0.9 + 0.1 * Math.sin(elapsed / 180));
        g.fillCircle(l.x - 3, l.y - 44, 2.6);
        g.fillCircle(l.x + 3, l.y - 44, 2.6);
      }
    });
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      fx.ring(ctx.cx, ctx.cy, 10, 70, SHADOW.mauve, 420, 4, 3);
      for (let i = 0; i < 8; i++) {
        ctx.at(i * 55, () => limbs.push({
          x: ctx.cx + 30 + i * 34, y: ctx.cy + 8, born: 300 + i * 55, eyed: i === 2 || i === 6,
        }));
      }
    });
    // Two watchers, each lobbing every 1.5s. No damage at all — only multiplication.
    [1200, 2700, 4200].forEach((at, i) => ctx.at(at, () => {
      const from = { x: ctx.cx + 30 + (i % 2 === 0 ? 2 : 6) * 34, y: ctx.cy - 36 };
      flyBomb(ctx, {
        from, to: { x: ctx.tx, y: ctx.ty }, mode: 'watcher',
        onHit: () => {
          fx.implosion(ctx.tx, ctx.ty, 44, { tendrils: 7, gloom: 1, duration: 320, stain: false });
          hope = Math.min(100, hope * 1.25);
          const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 66, '×1.25', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#cc2244',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1200 });
        },
      });
    }));
  },
};

export const blackHole: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'Q — 3s of a singularity that follows your cursor, dragging at 550 for 5 dmg/s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const hole = { x: ctx.tx, y: ctx.ty };
    const victim = { x: ctx.w - 40, y: ctx.cy + 30 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let live = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); body.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(victim.x, victim.y, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(victim.x, victim.y, 13);
      if (!live) return;
      // The kit's own singularity art, at its real 17px core.
      ShadowFx.drawSingularity(g, ctx.tint, hole.x, hole.y, 17 + Math.sin(elapsed / 170) * 3, elapsed / 1000, 1);
    });
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 3000);
      fx.channelGather(hole.x, hole.y, 90, 700);
      fx.implosion(hole.x, hole.y, 90, { tendrils: 14, gloom: 3, duration: 520, depth: 5 });
      live = true;
      // Follows the cursor for the whole 3s, and the victim's velocity is simply overwritten.
      ctx.onFrame((dt, elapsed) => {
        const k = elapsed - 300;
        if (k < 0 || k > 3000) return;
        hole.x = ctx.cx + 90 + Math.sin(k / 620) * 90;
        hole.y = ctx.cy + Math.cos(k / 480) * 40;
        const a = Math.atan2(hole.y - victim.y, hole.x - victim.x);
        const d = Phaser.Math.Distance.Between(hole.x, hole.y, victim.x, victim.y);
        if (d > 12) { victim.x += Math.cos(a) * 550 * (dt / 1000); victim.y += Math.sin(a) * 550 * (dt / 1000); }
      });
      // 5 damage a second while held.
      for (let i = 1; i <= 3; i++) ctx.at(300 + i * 1000, () => fx.flash(victim.x, victim.y, 20));
      // It does not switch off — it collapses.
      ctx.at(3300, () => {
        live = false;
        fx.implosion(hole.x, hole.y, 110, { tendrils: 16, gloom: 4, duration: 560 });
      });
    });
  },
};

export const blackHoleUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Void Singularity — 15 HP/s to you, and a pool dropped every 0.5s along the drag',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const hole = { x: ctx.tx, y: ctx.ty };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    let live = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!live) return;
      // 22px instead of 17 — the upgraded hole is visibly hungrier.
      ShadowFx.drawSingularity(g, ctx.tint, hole.x, hole.y, 22 + Math.sin(elapsed / 170) * 3, elapsed / 1000, 1);
    });
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 3000);
      fx.channelGather(hole.x, hole.y, 90, 700);
      fx.voidPillar(hole.x, hole.y, 26, 120, 6);
      live = true;
      ctx.onFrame((_dt, elapsed) => {
        const k = elapsed - 300;
        if (k < 0 || k > 3000) return;
        hole.x = ctx.cx + 90 + Math.sin(k / 620) * 95;
        hole.y = ctx.cy + Math.cos(k / 480) * 40;
      });
      // Six pools, one every 0.5s, laid exactly along the path you dragged them.
      for (let i = 0; i < 6; i++) {
        ctx.at(i * 500, () => {
          const k = i * 500;
          pool(ctx, {
            x: ctx.cx + 90 + Math.sin(k / 620) * 95,
            y: ctx.cy + Math.cos(k / 480) * 40,
            born: 300 + k,
          });
        });
      }
      // And the feeding: 15 HP a second back to the caster.
      for (let i = 1; i <= 3; i++) {
        ctx.at(300 + i * 1000, () => {
          const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 40, '+15', {
            fontSize: '12px', fontFamily: 'Arial Black', color: '#66ff99',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 900 });
        });
      }
      ctx.at(3300, () => { live = false; fx.implosion(hole.x, hole.y, 110, { tendrils: 16, gloom: 4, duration: 560 }); });
    });
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveHopelessness: PreviewScript = {
  duration: 5600,
  caption: 'Passive — 3/s in a pool, −1/s always; every 2 points is 1% off their damage, cap 50%',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    let hope = 0;
    let inPool = false;
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    pool(ctx, { x: ctx.tx, y: ctx.ty, born: 200, life: 3400 });
    ctx.at(200, () => { inPool = true; });
    // The real rates, both directions, so the drain is as visible as the build.
    ctx.onFrame((dt) => {
      const s = dt / 1000;
      if (inPool) hope = Math.min(100, hope + 3 * s * 8);
      hope = Math.max(0, hope - 1 * s);
    });
    ctx.at(3600, () => {
      inPool = false;
      fx.wisps(ctx.tx, ctx.ty, 5, { speed: 40, size: 2.6, life: 620, rise: -20, depth: 4 });
    });
    // The ooze: past 10 points they weep, at a rate matching the count.
    ctx.onFrame((_dt, elapsed) => {
      if (hope < 10 || elapsed % 110 > 20) return;
      if (Math.random() > hope / 100) return;
      fx.wisps(ctx.tx + Phaser.Math.Between(-14, 14), ctx.ty + Phaser.Math.Between(-8, 6), 1,
        { angle: Math.PI / 2, spread: 0.5, speed: 26, size: 3, life: 700, rise: -22, depth: 4 });
    });
  },
};

export const passiveShadowPools: PreviewScript = {
  duration: 5000,
  caption: 'Passive — 3.75 HP/s to you inside, 5 dmg/s to them: 36px, 6 seconds',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    pool(ctx, { x: ctx.cx + 30, y: ctx.cy + 6, born: 200 });
    pool(ctx, { x: ctx.tx, y: ctx.ty, born: 700 });
    // The same object read two completely different ways, side by side.
    for (let i = 1; i <= 10; i++) {
      ctx.at(200 + i * 400, () => {
        const heal = ctx.adopt(ctx.scene.add.text(ctx.cx + 30, ctx.cy - 26, '+1.5', {
          fontSize: '10px', fontFamily: 'Arial', color: '#66ff99',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: heal, y: heal.y - 16, alpha: 0, duration: 700 });
        const hurt = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 26, '−2', {
          fontSize: '10px', fontFamily: 'Arial', color: '#ff9c9c',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: hurt, y: hurt.y - 16, alpha: 0, duration: 700 });
        fx.wisps(ctx.tx, ctx.ty, 1, { speed: 26, size: 2.4, life: 520, rise: -16, depth: 4 });
      });
    }
    // And the fade: they thin out over their last second rather than blinking off.
    ctx.at(4600, () => fx.gloom(ctx.tx, ctx.ty, 4, 34, 4));
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkVoidShade: PreviewScript = {
  duration: 4600,
  caption: 'Perk — pools 43px instead of 36, standing 9s instead of 6',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    // The two sizes side by side, drawn at their real radii.
    pool(ctx, { x: ctx.cx + 30, y: ctx.cy + 10, r: 36, born: 300, life: 6000 });
    pool(ctx, { x: ctx.tx, y: ctx.ty + 10, r: 43, born: 300, life: 9000 });
    ctx.at(300, () => {
      fx.ring(ctx.cx + 30, ctx.cy + 10, 7, 40, SHADOW.lilac, 420, 3, 3);
      fx.ring(ctx.tx, ctx.ty + 10, 8, 48, SHADOW.lilac, 420, 3, 3);
      const a = ctx.adopt(ctx.scene.add.text(ctx.cx + 30, ctx.cy - 40, '36px · 6s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#8a8ab0',
      }).setOrigin(0.5).setDepth(11));
      const b = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 44, '43px · 9s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(11));
      void a; void b;
    });
    // 27 Hopelessness out of a full stay instead of 18 — the reason the perk matters.
    ctx.at(3800, () => fx.gloom(ctx.cx + 30, ctx.cy + 10, 4, 32, 4));
  },
};

export const perkString: PreviewScript = {
  duration: 5200,
  caption: 'Perk — stakes are inert; every second one strings a line for 5 damage and a 3s 50% slow',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const a = { x: ctx.cx + 50, y: ctx.cy - 34 };
    const b = { x: ctx.cx + 50, y: ctx.cy + 44 };
    const victim = { x: ctx.w - 30, y: ctx.cy };
    let strung = false;
    let slowed = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(victim.x, victim.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(victim.x, victim.y, 13);
      for (const s of [a, b]) {
        g.fillStyle(ctx.tint(SHADOW.plum), 0.95);
        g.fillTriangle(s.x - 4, s.y + 6, s.x + 4, s.y + 6, s.x, s.y - 16);
      }
      if (!strung) return;
      // The tripline, barbed and taut between its two stakes.
      g.lineStyle(2, ctx.tint(SHADOW.blood), 0.55 + 0.25 * Math.sin(elapsed / 220));
      g.lineBetween(a.x, a.y, b.x, b.y);
    });
    ctx.at(300, () => { av.play('clap'); fx.ring(a.x, a.y, 4, 24, SHADOW.lilac, 340, 3, 3); });
    ctx.at(1000, () => {
      av.play('clap');
      fx.ring(b.x, b.y, 4, 24, SHADOW.lilac, 340, 3, 3);
      strung = true;
      const t = ctx.adopt(ctx.scene.add.text((a.x + b.x) / 2, (a.y + b.y) / 2 - 6, '🧵 STRUNG', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, alpha: 0, duration: 1400 });
    });
    ctx.at(1600, () => ctx.onFrame((dt) => { victim.x -= (slowed ? 60 : 120) * (dt / 1000); }));
    ctx.at(3300, () => {
      slowed = true;
      victim.x = a.x + 4;
      fx.tendrilBurst(victim.x, victim.y, 30, 6, 7);
      const t = ctx.adopt(ctx.scene.add.text(victim.x, victim.y - 34, '🐌 −50% · 3s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
    });
  },
};

export const perkDeath: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Divine perk — pick the trap first: jaws, a 35-damage mine, a 5s grabber, or ten pools',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    // The trap bar, and then one of each of the three new traps going off.
    const names = ['JAWS', 'MINE', 'GRABBER', 'PLUME'];
    let selected = 0;
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const labels = names.map((n, i) => ctx.adopt(ctx.scene.add.text(
      ctx.w * 0.5 - 108 + i * 72, 16, n,
      { fontSize: '9px', fontFamily: 'Arial Black', color: '#8a8ab0' },
    ).setOrigin(0.5).setDepth(10)));
    ctx.onFrame(() => {
      bar.clear();
      for (let i = 0; i < 4; i++) {
        const x = ctx.w * 0.5 - 108 + i * 72;
        bar.fillStyle(0x0b0d16, 0.92);
        bar.fillRoundedRect(x - 32, 5, 64, 22, 5);
        bar.lineStyle(1.5, ctx.tint(i === selected ? SHADOW.mauve : SHADOW.violet), i === selected ? 1 : 0.5);
        bar.strokeRoundedRect(x - 32, 5, 64, 22, 5);
        labels[i].setColor(i === selected ? '#cc88ff' : '#8a8ab0');
      }
    });
    // Mine: a blast, not a bite.
    ctx.at(600, () => {
      selected = 1;
      av.play('clap');
      ctx.at(400, () => {
        fx.ring(ctx.tx, ctx.ty, 10, 92, SHADOW.blood, 340, 6, 5);
        fx.bloom(ctx.tx, ctx.ty, 92 * 0.8, 14);
        fx.wisps(ctx.tx, ctx.ty, 10, { speed: 92 * 1.4, size: 3, life: 620, rise: 14, depth: 6 });
      });
    });
    // Grabber: it keeps hold instead of spending itself.
    ctx.at(2200, () => {
      selected = 2;
      av.play('clap');
      ctx.at(400, () => {
        const tether = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        ctx.onFrame((_dt, elapsed) => {
          const k = elapsed - 2600;
          tether.clear();
          if (k < 0 || k > 1400) return;
          const vx = ctx.tx + Math.sin(k / 200) * 62;
          ShadowFx.drawTether(tether, ctx.tint, ctx.tx, ctx.ty, vx, ctx.ty, elapsed / 1000, 1, true);
        });
        fx.tendrilBurst(ctx.tx, ctx.ty, 34, 8, 7);
      });
    });
    // Plume: the trap bites, then comes apart into ten pools.
    ctx.at(4200, () => {
      selected = 3;
      av.play('clap');
      ctx.at(400, () => {
        fx.implosion(ctx.tx, ctx.ty, 54, { tendrils: 10, gloom: 2, duration: 420 });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + 0.4;
          const d = 78 * (0.25 + 0.75 * ((i * 37) % 100) / 100);
          pool(ctx, { x: ctx.tx + Math.cos(a) * d, y: ctx.ty + Math.sin(a) * d * 0.85, born: 4600 + i * 40 });
        }
      });
    });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masterySharedSuffering: PreviewScript = {
  duration: 5200,
  caption: 'Mastery passive — every 30 damage you take spreads 5 Hopelessness to every enemy',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    let taken = 0;
    let hope = 0;
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    // The counter that actually drives it, shown as a bar filling to 30 and resetting.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame(() => {
      g.clear();
      g.fillStyle(0x0b0d16, 0.9);
      g.fillRoundedRect(ctx.cx - 30, ctx.cy - 46, 60, 8, 4);
      g.fillStyle(ctx.tint(SHADOW.blood), 0.95);
      g.fillRoundedRect(ctx.cx - 29, ctx.cy - 45, Math.max(0, 58 * (taken / 30)), 6, 3);
    });
    // Hits landing on the caster — the mastery pays out on being hurt, not on hurting.
    [400, 1000, 1600, 2300, 3000, 3700, 4400].forEach((at) => ctx.at(at, () => {
      taken += 12;
      fx.flash(ctx.cx, ctx.cy, 22);
      if (taken >= 30) {
        taken -= 30;
        hope = Math.min(100, hope + 5);
        // The broadcast: it reaches every enemy at once, wherever they are.
        fx.ring(ctx.cx, ctx.cy, 12, ctx.w, SHADOW.lilac, 620, 3, 3);
        fx.tendrilBurst(ctx.tx, ctx.ty, 30, 6, 7);
      }
    }));
  },
};

export const masteryShadowBeacon: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Mastery — walk onto the mortar to shell the marked dot: 20 damage, 10 Hopelessness',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    const mortar = { x: ctx.cx, y: ctx.cy + 34 };
    const dot = { x: ctx.tx, y: ctx.ty };
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let live = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!live) return;
      // The mortar, and the purple dot it is registered to. Neither does anything alone.
      g.fillStyle(ctx.tint(SHADOW.violet), 0.95);
      g.fillCircle(mortar.x, mortar.y, 13);
      g.fillStyle(ctx.tint(SHADOW.orchid), 0.9);
      g.fillCircle(mortar.x, mortar.y, 8);
      g.lineStyle(2, ctx.tint(SHADOW.mauve), 0.6 + 0.3 * Math.sin(elapsed / 240));
      g.strokeCircle(dot.x, dot.y, 10);
      g.fillStyle(ctx.tint(SHADOW.mauve), 0.8);
      g.fillCircle(dot.x, dot.y, 3.4);
    });
    ctx.at(300, () => {
      live = true;
      av.play('clap');
      fx.ring(mortar.x, mortar.y, 5, 40, SHADOW.lilac, 400, 3, 3);
    });
    // Three trips back onto it — the cadence is however fast you can run laps.
    [1200, 2600, 4000].forEach((at) => ctx.at(at, () => {
      fx.voidCore(mortar.x, mortar.y, 18, 260, 6);
      flyBomb(ctx, {
        from: mortar, to: dot, mode: 'shell',
        onHit: () => {
          fx.implosion(dot.x, dot.y, 70, { tendrils: 10, gloom: 2, duration: 400 });
          hope = Math.min(100, hope + 10);
        },
      });
    }));
  },
};
