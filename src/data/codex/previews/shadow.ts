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

/**
 * One caltrop: tossed in a low tumbling lob (the kit's 300ms flight), then lying on the floor
 * where it landed. Painted with the kit's own `ShadowFx.drawCaltrop`. Returns a handle the
 * script uses to spend it when somebody treads on it.
 */
function caltrop(
  ctx: PreviewCtx,
  o: { from: { x: number; y: number }; to: { x: number; y: number }; at: number; crippling?: boolean },
): { spend: () => void } {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const spin = (o.to.x * 0.13 + o.to.y * 0.07) % 6.28;
  let spent = false;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const age = elapsed - o.at;
    if (age < 0 || spent) return;
    const k = Math.min(1, age / 300);
    const x = o.from.x + (o.to.x - o.from.x) * k;
    const y = o.from.y + (o.to.y - o.from.y) * k;
    if (k < 1) {
      ShadowFx.drawCaltrop(g, ctx.tint, x, y - Math.sin(Math.PI * k) * 26, 6, spin + k * 9, 1,
        { crippling: o.crippling, t: elapsed / 1000 });
      return;
    }
    ShadowFx.drawCaltrop(g, ctx.tint, x, y, 6.5, spin, 1,
      { crippling: o.crippling, grounded: true, t: elapsed / 1000 });
  });
  return { spend: () => { spent = true; } };
}

/** A small floating readout, the way the arena's floating text rises and fades. */
function pop(ctx: PreviewCtx, x: number, y: number, text: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(12));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 1200 });
}

export const shadowCaltrop: PreviewScript = {
  duration: 4400,
  caption: 'Click — a caltrop lies 8s where it lands; treading on it costs 5 damage and 10 Hopelessness',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    // A walker crossing the lane the caltrops were thrown into.
    const walker = { x: ctx.tx + 40, y: ctx.ty - 60 };
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    const hand = { x: ctx.cx + 30, y: ctx.cy };
    const spots = [{ x: ctx.tx - 30, y: ctx.ty - 6 }, { x: ctx.tx, y: ctx.ty + 4 }, { x: ctx.tx + 30, y: ctx.ty - 2 }];
    const drops = spots.map((to, i) => {
      ctx.at(300 + i * 650, () => { av.play('punch', ctx.aim); fx.muzzleUmbra(hand.x, hand.y, ctx.aim, 0.6, 6); });
      return caltrop(ctx, { from: hand, to, at: 300 + i * 650 });
    });
    ctx.onFrame((_dt, elapsed) => {
      // The walker strolls down through the middle caltrop after the third has landed.
      const k = Phaser.Math.Clamp((elapsed - 2400) / 1400, 0, 1);
      walker.x = ctx.tx + 40 - k * 40;
      walker.y = ctx.ty - 60 + k * 90;
      body.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(walker.x, walker.y, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(walker.x, walker.y, 13);
    });
    ctx.at(3050, () => {
      drops[1].spend();
      hope += 10;
      fx.tendrilBurst(spots[1].x, spots[1].y, 18, 4, 6);
      pop(ctx, spots[1].x, spots[1].y - 30, '-5  🕳️ +10%', '#cc88ff');
    });
  },
};

export const shadowCaltropUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Crippling Spikes — each caltrop trodden on stacks a 12% slow, up to 60%, on a refreshing 3s timer',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const hand = { x: ctx.cx + 30, y: ctx.cy };
    // A lane of five barbed caltrops, then somebody who has to walk all the way down it.
    const lane = Array.from({ length: 5 }, (_, i) => ({ x: ctx.tx - 70 + i * 34, y: ctx.ty + Math.sin(i * 1.7) * 8 }));
    const drops = lane.map((to, i) => {
      ctx.at(200 + i * 300, () => { av.play('punch', ctx.aim); fx.muzzleUmbra(hand.x, hand.y, ctx.aim, 0.6, 6); });
      return caltrop(ctx, { from: hand, to, at: 200 + i * 300, crippling: true });
    });
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    let x = ctx.tx - 110;
    let stacks = 0;
    let next = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 1900) {
        // Each stack takes 12% off the walk — the slowdown is the showcase.
        x += (dt / 1000) * 70 * (1 - stacks * 0.12);
        while (next < lane.length && x >= lane[next].x) {
          drops[next].spend();
          stacks = Math.min(5, stacks + 1);
          fx.tendrilBurst(lane[next].x, lane[next].y, 18, 4, 6);
          pop(ctx, lane[next].x, lane[next].y - 34, `🦶 CRIPPLED ×${stacks}`, '#cc3355');
          next++;
        }
      }
      body.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(x, ctx.ty, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(x, ctx.ty, 13);
      // The limp, drawn as a dragging blood-lit hook at their feet.
      if (stacks > 0) {
        body.lineStyle(2, ctx.tint(SHADOW.blood), 0.5 + stacks * 0.1);
        body.strokeEllipse(x, ctx.ty + 14, 26, 8);
      }
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

export const grimGloom: PreviewScript = {
  duration: 5600,
  caption: 'Grim Gloom — 8s of fog: 4 Hopelessness a second, and tentacles strike anyone who lingers 1.1s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    const fog = ctx.adopt(ctx.scene.add.graphics().setDepth(2.5));
    const strike = ctx.adopt(ctx.scene.add.graphics().setDepth(4.5));
    const body = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    despair(ctx, { x: ctx.tx, y: ctx.ty, read: () => hope });
    ctx.at(200, () => {
      av.play('raise', -Math.PI / 2, 600);
      fx.ring(ctx.cx, ctx.cy, 20, ctx.w * 0.7, SHADOW.orchid, 900, 10, 3);
      fx.bloom(ctx.cx, ctx.cy, 90, 14);
    });
    // The fool stands still for the whole showcase, so the floor opens twice under them.
    const strikes = [1500, 3500];
    ctx.onFrame((dt, elapsed) => {
      const live = elapsed > 200 && elapsed < 5400;
      const fade = live ? Math.min(1, (elapsed - 200) / 500, (5400 - elapsed) / 800) : 0;
      fog.clear();
      if (fade > 0) ShadowFx.drawGloomFog(fog, ctx.tint, ctx.w, ctx.h, elapsed / 1000, fade);
      if (live) hope = Math.min(100, hope + (dt / 1000) * 4);
      strike.clear();
      for (const at of strikes) {
        const k = (elapsed - at) / 900;
        if (k >= 0 && k < 1) ShadowFx.drawGloomTentacle(strike, ctx.tint, ctx.tx, ctx.ty, k, elapsed / 1000, at * 0.001);
      }
      body.clear();
      body.fillStyle(0x2b2f3d, 1); body.fillCircle(ctx.tx, ctx.ty, 17);
      body.fillStyle(0x3c4254, 1); body.fillCircle(ctx.tx, ctx.ty, 13);
    });
    for (const at of strikes) {
      ctx.at(at + 360, () => {
        hope = Math.min(100, hope + 8);
        fx.tendrilBurst(ctx.tx, ctx.ty, 30, 7, 6);
        pop(ctx, ctx.tx, ctx.ty - 34, '🦑 FROM BELOW!  -14', '#cc3355');
      });
    }
  },
};

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

/** A grey stand-in fighter the perk showcases move around by hand. */
function walkerBody(ctx: PreviewCtx, pos: { x: number; y: number }, tintFor?: () => number | null): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    const c = tintFor?.() ?? null;
    g.fillStyle(c ?? 0x2b2f3d, 1); g.fillCircle(pos.x, pos.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(pos.x, pos.y, 13);
  });
}

export const perkVenom: PreviewScript = {
  duration: 5200,
  caption: 'Perk — venom traps: 15 damage, 40% Hopelessness and 3 poison a second for 5s, no stun',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let hope = 0;
    let bit = -1;
    const trap = { x: ctx.tx - 20, y: ctx.ty };
    const v = { x: ctx.w - 20, y: ctx.ty };
    despair(ctx, { x: ctx.tx - 20, y: ctx.ty, read: () => hope });
    walkerBody(ctx, v, () => (bit >= 0 ? ctx.tint(SHADOW.bile) : null));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (bit < 0 && elapsed > 300) {
        // The trap: snap jaws with a swelling poison sac on the plate.
        const swell = 0.5 + 0.5 * Math.sin(elapsed * 0.006);
        g.fillStyle(ctx.tint(SHADOW.pitch), 0.9); g.fillCircle(trap.x, trap.y, 18);
        g.lineStyle(1.6, ctx.tint(SHADOW.venom), 0.75); g.strokeCircle(trap.x, trap.y, 17);
        g.fillStyle(ctx.tint(SHADOW.bile), 0.95); g.fillCircle(trap.x, trap.y, 6 + swell);
        g.fillStyle(ctx.tint(SHADOW.venom), 0.6 + swell * 0.3); g.fillCircle(trap.x - 1, trap.y - 1.5, 3);
      }
      if (elapsed > 900 && bit < 0) v.x = Math.max(trap.x, v.x - (dt / 1000) * 110);
      if (bit < 0 && v.x <= trap.x + 2) {
        bit = elapsed;
        hope += 40;
        fx.implosion(trap.x, trap.y, 40, { tendrils: 10, gloom: 1, duration: 380 });
        fx.wisps(v.x, v.y, 8, { speed: 70, size: 3, life: 600, rise: -10, depth: 7, color: SHADOW.venom });
        pop(ctx, v.x, v.y - 34, '🐍 VENOMED!  -15', '#88dd44');
      }
      if (bit >= 0 && elapsed - bit < 5000) {
        // Not stunned: they keep walking, dripping poison as they go.
        v.x -= (dt / 1000) * 60;
        if (Math.floor((elapsed - bit) / 1000) !== Math.floor((elapsed - bit - dt) / 1000)) {
          pop(ctx, v.x, v.y - 30, '-3', '#88dd44');
        }
      }
    });
    ctx.at(300, () => { av.play('clap'); fx.ring(trap.x, trap.y, 4, 24, SHADOW.lilac, 340, 3, 3); });
  },
};

export const perkVantablack: PreviewScript = {
  duration: 4800,
  caption: 'Perk — Vantablack claymores watch a short cone; a foe stepping into it takes 30 down the cone',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mine = { x: ctx.cx + 60, y: ctx.cy };
    const half = 0.42, sight = 120;
    const v = { x: mine.x + 130, y: mine.y - 90 };
    let fired = false;
    walkerBody(ctx, v);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!fired && elapsed > 300) {
        g.fillStyle(ctx.tint(SHADOW.blood), 0.07);
        g.slice(mine.x, mine.y, sight, -half, half, false); g.fillPath();
        g.lineStyle(1, ctx.tint(SHADOW.blood), 0.4);
        g.lineBetween(mine.x, mine.y, mine.x + Math.cos(-half) * sight, mine.y + Math.sin(-half) * sight);
        g.lineBetween(mine.x, mine.y, mine.x + Math.cos(half) * sight, mine.y + Math.sin(half) * sight);
        const scan = Math.sin(elapsed * 0.004) * half;
        g.lineStyle(1.4, ctx.tint(SHADOW.blood), 0.55);
        g.lineBetween(mine.x, mine.y, mine.x + Math.cos(scan) * sight, mine.y + Math.sin(scan) * sight);
        g.fillStyle(ctx.tint(SHADOW.abyss), 1); g.fillRoundedRect(mine.x - 4, mine.y - 12, 8, 24, 3);
        g.lineStyle(1.4, ctx.tint(SHADOW.lilac), 0.7); g.strokeRoundedRect(mine.x - 4, mine.y - 12, 8, 24, 3);
        g.fillStyle(ctx.tint(SHADOW.blood), 0.7 + 0.3 * Math.sin(elapsed * 0.009)); g.fillCircle(mine.x + 3, mine.y, 2.2);
      }
      if (elapsed > 1000 && !fired) v.y += (dt / 1000) * 70;
      if (!fired && elapsed > 1000) {
        const d = Math.hypot(v.x - mine.x, v.y - mine.y);
        const ang = Math.atan2(v.y - mine.y, v.x - mine.x);
        if (d <= sight + 20 && Math.abs(ang) <= half) {
          fired = true;
          fx.wisps(mine.x, mine.y, 14, { angle: 0, spread: half, speed: 230, size: 3.2, life: 420, rise: 0, depth: 7 });
          fx.wisps(mine.x, mine.y, 8, { angle: 0, spread: half * 0.6, speed: 280, size: 2.4, life: 360, rise: 0, depth: 7, color: SHADOW.blood });
          fx.muzzleUmbra(mine.x, mine.y, 0, 1.8, 7);
          fx.tendrilBurst(v.x, v.y, 30, 7, 8);
          pop(ctx, v.x, v.y - 34, '⬛ CLAYMORE!  -30', '#ff5577');
        }
      }
    });
    ctx.at(300, () => { av.play('clap'); fx.ring(mine.x, mine.y, 4, 24, SHADOW.lilac, 340, 3, 3); });
  },
};

export const perkAbyss: PreviewScript = {
  duration: 4600,
  scale: 0.85,
  caption: 'Perk — 14-tentacle walls with spikes that cut for 6 more and shove; E reaches 70% farther',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const count = 14;
    const start = { x: ctx.cx + 34, y: ctx.cy + 70 };
    const v = { x: ctx.cx + 34 + 7 * 18, y: ctx.cy - 70 };
    let shoved = false;
    walkerBody(ctx, v);
    ctx.at(200, () => av.play('slam', ctx.aim));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      for (let i = 0; i < count; i++) {
        const born = 300 + i * 55;
        const grow = Phaser.Math.Clamp((elapsed - born) / 200, 0, 1);
        if (grow <= 0) continue;
        // A long diagonal wall across the box.
        const x = start.x + i * 18, y = start.y - i * 10;
        const sway = Math.sin(elapsed * 0.005 + i) * 0.16;
        shadowTendrilLayered(g, ctx.tint, x, y, -Math.PI / 2 + sway, 46 * grow, 10 * grow,
          Math.sin(elapsed * 0.0032 + i) * 12 * grow, 1, 9 * grow, elapsed * 0.004 + i, { barbs: 5 });
        g.lineStyle(2, ctx.tint(SHADOW.pale), 0.8 * grow);
        for (let k = 0; k < 4; k++) {
          const a = -Math.PI / 2 + (k - 1.5) * 0.9;
          g.lineBetween(x + Math.cos(a) * 7 * grow, y - 10 + Math.sin(a) * 4,
            x + Math.cos(a) * 16 * grow, y - 10 + Math.sin(a) * 10);
        }
      }
      if (elapsed > 1600 && !shoved) v.y += (dt / 1000) * 80;
      if (!shoved && v.y >= ctx.cy - 10) {
        shoved = true;
        v.y -= 20;
        fx.wisps(v.x, v.y, 4, { speed: 70, size: 2.4, life: 340, rise: 14, depth: 7 });
        pop(ctx, v.x, v.y - 34, '-11  SPIKED', '#cc3355');
      }
    });
  },
};

export const perkShinobi: PreviewScript = {
  duration: 5200,
  caption: 'Perk — two caltrops a throw, and shinobi traps that burst into caltrops and slow instead of stun',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const hand = { x: ctx.cx + 30, y: ctx.cy };
    // Two at once, each a little off the line.
    ctx.at(300, () => {
      av.play('punch', ctx.aim);
      fx.muzzleUmbra(hand.x, hand.y, ctx.aim, 0.6, 6);
      caltrop(ctx, { from: hand, to: { x: ctx.tx - 40, y: ctx.ty - 34 }, at: 300 });
      caltrop(ctx, { from: hand, to: { x: ctx.tx - 10, y: ctx.ty + 30 }, at: 300 });
    });
    // Then a shinobi trap sprung under a walker, and the ring it throws out.
    const trap = { x: ctx.tx + 30, y: ctx.ty };
    const v = { x: ctx.w - 10, y: ctx.ty };
    let sprung = false;
    walkerBody(ctx, v);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!sprung && elapsed > 900) {
        g.fillStyle(ctx.tint(SHADOW.pitch), 0.9); g.fillCircle(trap.x, trap.y, 18);
        g.lineStyle(1.5, ctx.tint(SHADOW.orchid), 0.8); g.strokeCircle(trap.x, trap.y, 18);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ShadowFx.drawCaltrop(g, ctx.tint, trap.x + Math.cos(a) * 13, trap.y + Math.sin(a) * 11, 4, a, 1, { t: elapsed / 1000 });
        }
      }
      if (elapsed > 1500) v.x -= (dt / 1000) * (sprung ? 45 : 90);
      if (!sprung && v.x <= trap.x + 4) {
        sprung = true;
        fx.implosion(trap.x, trap.y, 40, { tendrils: 10, gloom: 1, duration: 380 });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const d = 38 + (i % 3) * 24;
          caltrop(ctx, { from: trap, to: { x: trap.x + Math.cos(a) * d, y: trap.y + Math.sin(a) * d * 0.85 }, at: elapsed });
        }
        pop(ctx, v.x, v.y - 34, '🥷 SLOWED!  -20', '#cc88ff');
      }
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
