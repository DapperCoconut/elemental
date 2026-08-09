import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { MAGNET, MagnetAura, MagnetAvatar, MagnetFx } from '../../../elements/kits/MagnetVisuals';

/**
 * Magnet's showcases.
 *
 * Every rod, nail, bearing and compactor plate in this element is plain data painted through a
 * `MagnetFx` static, so these loops keep their own arrays and call the same painters the kit
 * calls — `drawRod`, `drawNail`, `drawShieldOrb`, `drawCompactor`, `drawCompactorWall`,
 * `drawMagLevBoard`, `drawBuriedRod`. The rod integrator below is the kit's own: 0.88 friction
 * a frame, hard wall bounces, 26px separation with velocities swapped.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt` by hand; `MagnetFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: MagnetFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new MagnetFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new MagnetAvatar(ctx.scene, ctx.tint, 'player'));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    return g;
  });
}

/** A target the script moves — the drag, the suction and the tether all need one. */
function movingDummy(ctx: PreviewCtx, m: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(m.x - 5, m.y - 4, 3.2); g.fillCircle(m.x + 5, m.y - 4, 3.2);
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

// ── Rods ──────────────────────────────────────────────────────────────

interface Rod {
  x: number; y: number; vx: number; vy: number;
  kind: 'steel' | 'copper' | 'ancient' | 'ancient-live';
  bouncing: boolean; perm: number; sword: boolean; charged: boolean;
  destroyOnHit?: boolean;
  cd: number;
}

function rod(x: number, y: number, o?: Partial<Rod>): Rod {
  return {
    x, y, vx: 0, vy: 0, kind: 'steel', bouncing: false, perm: 0, sword: false,
    charged: false, cd: 0, ...o,
  };
}

/** The four bars a magnet match opens with, 80px in from each corner. */
function cornerRods(ctx: PreviewCtx, sword = false): Rod[] {
  const pad = 80;
  return [
    rod(pad, pad, { sword }), rod(ctx.w - pad, pad, { sword }),
    rod(pad, ctx.h - pad, { sword }), rod(ctx.w - pad, ctx.h - pad, { sword }),
  ];
}

/**
 * One Graphics for the whole floor of rods, stepped with the kit's own physics and painted with
 * the kit's own `drawRod`. `victim` gets the 28px / 500ms contact check.
 */
function rodLayer(
  ctx: PreviewCtx, fx: MagnetFx, rods: Rod[],
  victim?: { x: number; y: number; onHit?: (dmg: number) => void },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((dt, elapsed) => {
    const dtS = dt / 1000;
    const pad = 20;
    for (let i = rods.length - 1; i >= 0; i--) {
      const r = rods[i];
      const wasMoving = Math.abs(r.vx) > 30 || Math.abs(r.vy) > 30;
      r.x += r.vx * dtS;
      r.y += r.vy * dtS;
      if (r.x < pad) { r.x = pad; r.vx = Math.abs(r.vx); }
      if (r.x > ctx.w - pad) { r.x = ctx.w - pad; r.vx = -Math.abs(r.vx); }
      if (r.y < pad) { r.y = pad; r.vy = Math.abs(r.vy); }
      if (r.y > ctx.h - pad) { r.y = ctx.h - pad; r.vy = -Math.abs(r.vy); }
      const friction = r.bouncing ? 0.995 : 0.88;
      r.vx *= friction; r.vy *= friction;
      if (Math.abs(r.vx) < 2) r.vx = 0;
      if (Math.abs(r.vy) < 2) r.vy = 0;
      const isMoving = Math.abs(r.vx) > 30 || Math.abs(r.vy) > 30;

      if (victim && (isMoving || wasMoving)
        && Phaser.Math.Distance.Between(r.x, r.y, victim.x, victim.y) <= 28
        && elapsed > r.cd) {
        r.cd = elapsed + 500;
        const base = r.sword ? 16 : 8;
        const dmg = (r.bouncing ? base * 2 : base) + r.perm;
        fx.sparks(victim.x, victim.y, 5 + (r.bouncing ? 4 : 0), Math.atan2(r.vy, r.vx) + Math.PI, 10);
        float(ctx, victim.x, victim.y - 22, `${dmg}`, r.bouncing ? '#ff9933' : '#ccddee', 11);
        victim.onHit?.(dmg);
        if (r.destroyOnHit) {
          fx.shrapnel(r.x, r.y, 4, { speed: 190, size: 9, color: MAGNET.copperHi });
          rods.splice(i, 1);
          continue;
        }
      }

      // Rods shove each other apart and trade velocities rather than passing through.
      for (const other of rods) {
        if (other === r) continue;
        const d = Phaser.Math.Distance.Between(r.x, r.y, other.x, other.y);
        if (d < 26 && d > 0) {
          const a = Math.atan2(r.y - other.y, r.x - other.x);
          r.x = other.x + Math.cos(a) * 26;
          r.y = other.y + Math.sin(a) * 26;
          const tx = r.vx, ty = r.vy;
          r.vx = other.vx * 0.8; r.vy = other.vy * 0.8;
          other.vx = tx * 0.8; other.vy = ty * 0.8;
        }
      }
    }

    g.clear();
    for (const r of rods) {
      MagnetFx.drawRod(g, ctx.tint, r.x, r.y, r.vx, r.vy, r.kind, r.bouncing, r.perm, r.sword,
        elapsed / 1000, r.charged);
    }
  });
}

/** Magnetize's attraction, run at the kit's own accel and cap. */
function pullRodsToward(rods: Rod[], tx: number, ty: number, dt: number): void {
  for (const r of rods) {
    const d = Phaser.Math.Distance.Between(r.x, r.y, tx, ty);
    if (d > 180 || d <= 10) continue;
    const mult = r.sword ? 2 : 1;
    const accel = Math.min(1600 * mult, (600 * 200 * mult) / Math.max(1, d));
    const a = Math.atan2(ty - r.y, tx - r.x);
    r.vx += Math.cos(a) * accel * (dt / 1000);
    r.vy += Math.sin(a) * accel * (dt / 1000);
    const spd = Math.hypot(r.vx, r.vy);
    const cap = r.sword ? 1400 : 900;
    if (spd > cap) { r.vx = (r.vx / spd) * cap; r.vy = (r.vy / spd) * cap; }
    // Blade: a sword going past at speed is flung on rather than caught.
    if (r.sword && Math.hypot(r.vx, r.vy) > 600 && d < 30) { r.vx *= 1.3; r.vy *= 1.3; }
  }
}

// ══ CLICK — Mag Pulse ═════════════════════════════════════════════════

export const magPulse: PreviewScript = {
  duration: 5200,
  scale: 0.8,
  caption: 'Click — every rod within 380px is thrown at the mark at 680 px/s, for 8 apiece',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const target = { x: ctx.w * 0.62, y: ctx.cy };
    dummy(ctx, target.x, target.y);
    const rods = cornerRods(ctx);
    rodLayer(ctx, fx, rods, target);

    const pulse = (delay: number, mx: number, my: number): void => ctx.at(delay, () => {
      av.play('punch', Math.atan2(my - ctx.cy, mx - ctx.cx));
      fx.pulse(mx, my, 80, MAGNET.rose, 380, 7, 12);
      fx.flash(mx, my, 16, 8, MAGNET.rose);
      for (const r of rods) {
        if (Phaser.Math.Distance.Between(r.x, r.y, mx, my) > 380) continue;
        const a = Math.atan2(my - r.y, mx - r.x);
        r.vx = Math.cos(a) * 680;
        r.vy = Math.sin(a) * 680;
      }
    });
    // Aimed past the target, so the rods arrive through it rather than at it.
    pulse(500, ctx.w * 0.74, ctx.cy);
    pulse(2600, ctx.w * 0.5, ctx.cy);
  },
};

export const magPulseUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.77,
  caption: 'Repulse — right-click: rods thrown outward at 680, and a nailed enemy shoved at 500',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 80, y: ctx.cy };
    movingDummy(ctx, victim);
    const rods = [
      rod(ctx.cx - 90, ctx.cy - 60), rod(ctx.cx + 30, ctx.cy - 70),
      rod(ctx.cx - 40, ctx.cy + 70), rod(ctx.cx + 110, ctx.cy + 40),
    ];
    rodLayer(ctx, fx, rods, victim);

    ctx.at(900, () => {
      av.play('clap');
      fx.pulse(ctx.cx, ctx.cy, 320 * 0.55, MAGNET.blush, 400, 6, 14);
      fx.flash(ctx.cx, ctx.cy, 22, 8, MAGNET.blush);
      float(ctx, ctx.cx, ctx.cy - 30, '💢 REPULSE', '#ff4466');
      for (const r of rods) {
        if (Phaser.Math.Distance.Between(r.x, r.y, ctx.cx, ctx.cy) > 320) continue;
        const a = Math.atan2(r.y - ctx.cy, r.x - ctx.cx);
        r.vx = Math.cos(a) * 680;
        r.vy = Math.sin(a) * 680;
      }
      // A nailed enemy is thrown straight away from you at 500.
      const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      let vx = Math.cos(a) * 500, vy = Math.sin(a) * 500;
      float(ctx, victim.x, victim.y - 30, 'SHOVED 500', '#ff4466', 10);
      ctx.onFrame((dt) => {
        victim.x += vx * (dt / 1000);
        victim.y += vy * (dt / 1000);
        vx *= 0.94; vy *= 0.94;
      });
    });
  },
};

// ══ E — Nail Implant ══════════════════════════════════════════════════

export const nailImplant: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'E — 18 on impact, 10s implanted and dragging them in; E again tears it out for 18 more',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 250, y: ctx.cy };
    movingDummy(ctx, victim);
    const nail = { x: 0, y: 0, vx: 0, vy: 0, live: false, inEnemy: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!nail.live) return;
      if (!nail.inEnemy) {
        nail.x += nail.vx * (dt / 1000);
        nail.y += nail.vy * (dt / 1000);
        if (Phaser.Math.Distance.Between(nail.x, nail.y, victim.x, victim.y) <= 24) {
          nail.inEnemy = true;
          fx.sparks(victim.x, victim.y, 6, Math.atan2(nail.vy, nail.vx) + Math.PI, 10, MAGNET.steel);
          fx.flash(victim.x, victim.y, 12, 9, MAGNET.iron);
          float(ctx, victim.x, victim.y - 36, '🔩 NAILED', '#ccddee');
          float(ctx, victim.x, victim.y - 20, '18', '#ccddee', 13);
        }
      } else {
        nail.x = victim.x; nail.y = victim.y;
        // The tether: +180 px/s of pull per second whenever they are over 80px away.
        const d = Phaser.Math.Distance.Between(victim.x, victim.y, ctx.cx, ctx.cy);
        if (d > 80) {
          const a = Math.atan2(ctx.cy - victim.y, ctx.cx - victim.x);
          victim.x += Math.cos(a) * 60 * (dt / 1000);
          victim.y += Math.sin(a) * 60 * (dt / 1000);
        }
      }
      MagnetFx.drawNail(g, ctx.tint, nail.x, nail.y, Math.atan2(nail.vy, nail.vx), MAGNET.iron,
        nail.inEnemy, ctx.cx, ctx.cy, elapsed / 1000);
    });

    ctx.at(500, () => {
      const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      av.play('punch', a);
      fx.sparks(ctx.cx, ctx.cy, 4, a, 10, MAGNET.steel);
      Object.assign(nail, { x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, live: true });
    });
    ctx.at(4600, () => {
      if (!nail.inEnemy) return;
      nail.live = false;
      fx.grasp(ctx.cx, ctx.cy, victim.x, victim.y, MAGNET.steel, 300);
      fx.sparks(victim.x, victim.y, 6, Math.atan2(ctx.cy - victim.y, ctx.cx - victim.x), 10, MAGNET.chrome);
      av.play('punch', Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx));
      float(ctx, victim.x, victim.y - 36, '🔩 RECALLED', '#ccddee');
      float(ctx, victim.x, victim.y - 20, '18', '#ccddee', 13);
      float(ctx, ctx.cx, ctx.cy - 34, '−2s cooldown', '#88ccff', 10);
    });
  },
};

export const nailImplantUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Nail Barrage — 3 gold nails at ±6°, and each stack drags 50% harder (max 3)',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 250, y: ctx.cy };
    movingDummy(ctx, victim);
    const nails: { x: number; y: number; vx: number; vy: number; inEnemy: boolean }[] = [];
    let stacks = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd060', 11);
    ctx.onFrame(() => readout.setText(stacks ? `${stacks} pull stack${stacks > 1 ? 's' : ''} — ×${(1 + 0.5 * stacks).toFixed(1)} drag` : ''));

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      for (const n of nails) {
        if (!n.inEnemy) {
          n.x += n.vx * (dt / 1000);
          n.y += n.vy * (dt / 1000);
          if (Phaser.Math.Distance.Between(n.x, n.y, victim.x, victim.y) <= 24) {
            n.inEnemy = true;
            stacks = Math.min(3, stacks + 1);
            fx.sparks(victim.x, victim.y, 6, Math.atan2(n.vy, n.vx) + Math.PI, 10, MAGNET.goldHi);
            fx.flash(victim.x, victim.y, 12, 9, MAGNET.gold);
            float(ctx, victim.x, victim.y - 20, '18', '#ffd060', 13);
          }
        } else { n.x = victim.x; n.y = victim.y; }
        MagnetFx.drawNail(g, ctx.tint, n.x, n.y, Math.atan2(n.vy, n.vx), MAGNET.gold,
          n.inEnemy, ctx.cx, ctx.cy, elapsed / 1000);
      }
      if (stacks > 0 && Phaser.Math.Distance.Between(victim.x, victim.y, ctx.cx, ctx.cy) > 80) {
        const a = Math.atan2(ctx.cy - victim.y, ctx.cx - victim.x);
        const drag = 60 * (1 + 0.5 * stacks);
        victim.x += Math.cos(a) * drag * (dt / 1000);
        victim.y += Math.sin(a) * drag * (dt / 1000);
      }
    });

    ctx.at(500, () => {
      const base = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      av.play('punch', base);
      fx.sparks(ctx.cx, ctx.cy, 6, base, 10, MAGNET.goldHi);
      for (const d of [-6, 0, 6]) {
        const a = base + d * (Math.PI / 180);
        nails.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, inEnemy: false });
      }
      float(ctx, ctx.cx, ctx.cy - 34, '3 × 18', '#ffd060', 12);
    });
    ctx.at(5000, () => {
      const hit = nails.filter((n) => n.inEnemy).length;
      if (!hit) return;
      nails.length = 0;
      stacks = 0;
      fx.grasp(ctx.cx, ctx.cy, victim.x, victim.y, MAGNET.gold, 300);
      fx.sparks(victim.x, victim.y, 6, Math.atan2(ctx.cy - victim.y, ctx.cx - victim.x), 10, MAGNET.goldHi);
      float(ctx, victim.x, victim.y - 36, '🔩 RECALLED', '#ccddee');
      float(ctx, victim.x, victim.y - 18, `${hit} × 18`, '#ffd060', 13);
    });
  },
};

// ══ F — Magnetize ═════════════════════════════════════════════════════

export const magnetize: PreviewScript = {
  duration: 7000,
  scale: 0.8,
  caption: 'F — 8s: every rod inside the 180px ring falls into them, harder the closer it gets',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.w * 0.66, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const rods = cornerRods(ctx);
    // Nudged in so at least two are inside the 180px ring when the field lands.
    rods[0].x = victim.x - 160; rods[0].y = victim.y - 90;
    rods[1].x = victim.x + 150; rods[1].y = victim.y - 70;
    rodLayer(ctx, fx, rods, victim);

    let magnetised = false;
    ctx.onFrame((dt) => { if (magnetised) pullRodsToward(rods, victim.x, victim.y, dt); });

    ctx.at(700, () => {
      const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      av.play('sweep', a);
      fx.grasp(ctx.cx, ctx.cy, victim.x, victim.y, MAGNET.rose);
      fx.pulse(victim.x, victim.y, 90, MAGNET.red, 420, 6, 10, true);
      float(ctx, victim.x, victim.y - 28, '🧲 MAGNETIZED', '#ff4488');
      magnetised = true;
      // The 180px ring is the real attraction range, so it is the aura's radius too.
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'magnetized', 180, 3));
      const born = 700;
      ctx.onFrame((dtt, elapsed) => {
        aura.setIntensity(Phaser.Math.Clamp((born + 8000 - elapsed) / 2000, 0, 1));
        aura.update(dtt, victim.x, victim.y, 1);
      });
    });
  },
};

export const magnetizeUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Copper Barrage — a copper rod at their feet every 1.2s, flying at you and shattering',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.w * 0.72, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const rods: Rod[] = [];
    // The copper is thrown at the caster, so the caster mark is the thing it can hit.
    rodLayer(ctx, fx, rods, { x: ctx.cx, y: ctx.cy });

    ctx.at(500, () => {
      av.play('sweep', 0);
      fx.grasp(ctx.cx, ctx.cy, victim.x, victim.y, MAGNET.rose);
      fx.pulse(victim.x, victim.y, 90, MAGNET.red, 420, 6, 10, true);
      float(ctx, victim.x, victim.y - 28, '🧲 MAGNETIZED', '#ff4488');
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'magnetized', 180, 3));
      ctx.onFrame((dt) => aura.update(dt, victim.x, victim.y, 1));
      // One every 1.2s, thrown back toward the caster with a little scatter.
      for (let i = 0; i < 5; i++) {
        ctx.at(i * 1200, () => {
          const a = Math.atan2(ctx.cy - victim.y, ctx.cx - victim.x) + (Math.random() - 0.5) * 0.6;
          rods.push(rod(victim.x, victim.y, {
            kind: 'copper', vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, destroyOnHit: true,
          }));
          fx.sparks(victim.x, victim.y, 4, a, 10, MAGNET.copperHi);
        });
      }
    });
  },
};

// ══ R — Protect ═══════════════════════════════════════════════════════

export const protect: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — 10 bearings at 5 HP each, orbiting 52px out; each eats one shot',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const orbs: { hp: number }[] = [];
    let orbit = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const readout = label(ctx, ctx.cx, ctx.cy + 34, '#88ccff', 10);

    ctx.onFrame((dt, elapsed) => {
      orbit += 0.025 * (dt / 16.67);
      g.clear();
      orbs.forEach((o, i) => {
        const a = orbit + (i / orbs.length) * Math.PI * 2;
        MagnetFx.drawShieldOrb(g, ctx.tint, ctx.cx + Math.cos(a) * 52, ctx.cy + Math.sin(a) * 52,
          Phaser.Math.Clamp(o.hp / 5, 0, 1), elapsed / 1000);
      });
      readout.setText(orbs.length ? `${orbs.length} bearings` : '');
    });

    ctx.at(400, () => {
      for (let i = 0; i < 10; i++) orbs.push({ hp: 5 });
      fx.pulse(ctx.cx, ctx.cy, 52, MAGNET.azure, 380, 6, 10, true);
      fx.sparks(ctx.cx, ctx.cy, 8, 0, 10, MAGNET.sky);
      av.play('flex');
      float(ctx, ctx.cx, ctx.cy - 36, '🛡 PROTECT', '#4488cc');
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'protect', 52, 3));
      ctx.onFrame((dt) => aura.update(dt, ctx.cx, ctx.cy, 1));

      // Shots coming in and being eaten, one bearing at a time.
      for (let s = 0; s < 5; s++) {
        ctx.at(700 + s * 900, () => {
          const oy = ctx.cy + (s % 3 - 1) * 22;
          ctx.fly({
            texture: 'proj-fire', from: { x: ctx.tx, y: oy }, to: { x: ctx.cx + 52, y: ctx.cy },
            speed: 420,
            onHit: () => {
              if (orbs.length === 0) return;
              const o = orbs[0];
              o.hp -= 4;
              fx.sparks(ctx.cx + 52, ctx.cy, 4, 0, 10, MAGNET.sky);
              if (o.hp <= 0) {
                orbs.shift();
                fx.shrapnel(ctx.cx + 52, ctx.cy, 4, { speed: 150, size: 7, color: MAGNET.azure, depth: 10 });
                float(ctx, ctx.cx + 52, ctx.cy - 20, 'BEARING LOST', '#4488cc', 9);
              } else {
                float(ctx, ctx.cx + 52, ctx.cy - 20, 'BLOCKED', '#88ccff', 9);
              }
            },
          });
        });
      }
    });
  },
};

export const protectUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Reflect Burst — 3 bearings for a 1.5s, 180px shell that turns their shots around',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const orbs: { hp: number }[] = Array.from({ length: 10 }, () => ({ hp: 5 }));
    let orbit = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt, elapsed) => {
      orbit += 0.025 * (dt / 16.67);
      g.clear();
      orbs.forEach((o, i) => {
        const a = orbit + (i / orbs.length) * Math.PI * 2;
        MagnetFx.drawShieldOrb(g, ctx.tint, ctx.cx + Math.cos(a) * 52, ctx.cy + Math.sin(a) * 52,
          Phaser.Math.Clamp(o.hp / 5, 0, 1), elapsed / 1000);
      });
    });

    ctx.at(900, () => {
      orbs.splice(0, 3);
      av.play('flex');
      fx.pulse(ctx.cx, ctx.cy, 180, MAGNET.sky, 520, 6, 14);
      fx.flash(ctx.cx, ctx.cy, 40, 8, MAGNET.azure);
      float(ctx, ctx.cx, ctx.cy - 40, '🔵 REFLECT FIELD', '#4488cc');
      // The shell is anchored where you stood, not to you.
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'reflect', 90, 5));
      let live = true;
      const born = 900;
      ctx.onFrame((dt, elapsed) => {
        if (!live) return;
        aura.setIntensity(Phaser.Math.Clamp((born + 1500 - elapsed) / 1500, 0, 1));
        aura.update(dt, ctx.cx, ctx.cy, 1);
      });
      ctx.at(1500, () => { live = false; aura.destroy(); });

      // Two shots arriving inside the shell and going straight back.
      for (const d of [200, 700]) {
        ctx.at(d, () => ctx.fly({
          texture: 'proj-fire', from: { x: ctx.tx, y: ctx.ty }, to: { x: ctx.cx + 120, y: ctx.cy },
          speed: 460,
          onHit: () => {
            fx.sparks(ctx.cx + 120, ctx.cy, 4, Math.PI, 10, MAGNET.sky);
            float(ctx, ctx.cx + 120, ctx.cy - 20, 'REFLECTED', '#4488cc', 10);
            ctx.fly({
              texture: 'proj-fire', from: { x: ctx.cx + 120, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
              speed: 460,
              onHit: () => fx.sparks(ctx.tx, ctx.ty, 5, 0, 10, MAGNET.sky),
            });
          },
        }));
      }
    });
  },
};

// ══ Q — Atom Smasher ══════════════════════════════════════════════════

/** Both compactor loops are the same machine; Forged Rods is what the crush leaves behind. */
function smasherScript(forged: boolean): PreviewScript {
  return {
    duration: 9000,
    scale: 0.5,
    caption: forged
      ? 'Forged Rods — a 210px crush, and every rod caught keeps +2 forever (+8 while bouncing)'
      : 'Q — 3s of suction, plates at 900 px/s, 35 in 120px, then rods bouncing for 3s',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const drum = { x: ctx.w * 0.5, y: ctx.cy };
      const victim = { x: ctx.w * 0.78, y: ctx.cy - 40 };
      movingDummy(ctx, victim);
      const rods = cornerRods(ctx);
      if (forged) for (const r of rods) r.perm = 2;
      rodLayer(ctx, fx, rods, victim);

      const walls = [
        { x: -20, vx: 900, active: false, cd: 0 },
        { x: ctx.w + 20, vx: -900, active: false, cd: 0 },
      ];
      let phase: 'idle' | 'charge' | 'plates' | 'done' = 'idle';
      let crossed = false;
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const readout = label(ctx, ctx.w * 0.5, 12, '#aabbcc', 11);

      ctx.at(500, () => {
        av.play('slam', 0);
        fx.flash(drum.x, drum.y, 30, 9, MAGNET.plateHi);
        fx.pulse(drum.x, drum.y, 150, MAGNET.rose, 520, 6, 12, true);
        fx.filingsMark(drum.x, drum.y, 90, 3);
        float(ctx, drum.x, drum.y - 40, '🗜 TRASH COMPACTOR', '#aabbcc');
        phase = 'charge';
        ctx.at(3000, () => { phase = 'plates'; });
      });

      ctx.onFrame((dt, elapsed) => {
        const dtS = dt / 1000;
        g.clear();
        if (phase === 'charge') {
          const left = Math.max(0, 3500 - elapsed);
          readout.setText(`compacting in ${(left / 1000).toFixed(1)}s`);
          MagnetFx.drawCompactor(g, ctx.tint, drum.x, drum.y, 1 - left / 3000, elapsed / 1000);
          // The enemy hauled in at 260 px/s (plus 170 per nail — none implanted here).
          const d = Phaser.Math.Distance.Between(drum.x, drum.y, victim.x, victim.y);
          if (d <= 320 && d > 4) {
            const a = Math.atan2(drum.y - victim.y, drum.x - victim.x);
            victim.x += Math.cos(a) * 260 * dtS;
            victim.y += Math.sin(a) * 260 * dtS;
          }
          // Rods dragged in so the crush has metal to throw.
          for (const r of rods) {
            const rd = Phaser.Math.Distance.Between(drum.x, drum.y, r.x, r.y);
            if (rd > 340 || rd <= 4) continue;
            const a = Math.atan2(drum.y - r.y, drum.x - r.x);
            const pull = Math.min(rd / dtS, 560);
            r.vx = Math.cos(a) * pull;
            r.vy = Math.sin(a) * pull;
          }
          return;
        }
        if (phase !== 'plates') return;
        readout.setText('');
        for (const w of walls) {
          if (!w.active && !crossed) { w.active = true; w.x = w.vx > 0 ? -20 : ctx.w + 20; }
          if (!w.active) continue;
          w.x += w.vx * dtS;
          if (w.x < -80 || w.x > ctx.w + 80) { w.active = false; continue; }
          MagnetFx.drawCompactorWall(g, ctx.tint, w.x, drum.y, 80, w.vx > 0 ? 1 : -1);
          if (Phaser.Math.Distance.Between(w.x, drum.y, victim.x, victim.y) <= 50 && elapsed > w.cd) {
            w.cd = elapsed + 500;
            fx.sparks(victim.x, victim.y, 7, w.vx > 0 ? 0 : Math.PI, 10, MAGNET.amber);
            fx.shrapnel(victim.x, victim.y, 3, { speed: 200, angle: w.vx > 0 ? 0 : Math.PI, spread: 0.9, color: MAGNET.rust, depth: 10 });
            float(ctx, victim.x, victim.y - 22, '15', '#ffaa33', 12);
          }
        }
        if (!crossed && ((walls[0].active && walls[0].x >= drum.x) || (walls[1].active && walls[1].x <= drum.x))) {
          crossed = true;
          if (Phaser.Math.Distance.Between(drum.x, drum.y, victim.x, victim.y) <= 120) {
            fx.boom(victim.x, victim.y, 90, { color: MAGNET.red, shrapnel: 10, mark: false });
            float(ctx, victim.x, victim.y - 28, '35', '#ff4488', 16);
          }
          fx.boom(drum.x, drum.y, forged ? 210 : 150, {
            color: forged ? MAGNET.blue : MAGNET.hot,
            shrapnel: forged ? 26 : 16,
            duration: forged ? 620 : 480,
          });
          float(ctx, drum.x, drum.y - 40, '💥 COMPACTED', '#aabbcc', 12);
          for (const r of rods) {
            if (Phaser.Math.Distance.Between(drum.x, drum.y, r.x, r.y) > 200) continue;
            r.bouncing = true;
            const a = Math.atan2(r.y - drum.y, r.x - drum.x) + (Math.random() - 0.5) * 1.4;
            const sp = 750 + Math.random() * 300;
            r.vx = Math.cos(a) * sp;
            r.vy = Math.sin(a) * sp;
            if (forged) r.perm += 2;
          }
          ctx.at(3000, () => { for (const r of rods) r.bouncing = false; });
        }
      });
    },
  };
}

export const atomSmasher = smasherScript(false);
export const atomSmasherUpgraded = smasherScript(true);

// ══ Passive — The Rods ════════════════════════════════════════════════

export const passiveTheRods: PreviewScript = {
  duration: 7000,
  scale: 0.8,
  caption: 'Four permanent bars: 8 on contact within 28px, wall bounces, 12% speed lost a frame',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.w * 0.62, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const rods = cornerRods(ctx);
    rodLayer(ctx, fx, rods, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ccddee', 10);
    ctx.onFrame(() => {
      const moving = rods.filter((r) => Math.abs(r.vx) > 30 || Math.abs(r.vy) > 30).length;
      readout.setText(moving ? `${moving} rods live — these ones bite` : 'all four idle — a stopped rod deals nothing');
    });
    ctx.at(600, () => {
      // One shove, then friction and the walls do the rest.
      for (const r of rods) {
        const a = Math.atan2(victim.y - r.y, victim.x - r.x) + (Math.random() - 0.5) * 0.4;
        r.vx = Math.cos(a) * 680;
        r.vy = Math.sin(a) * 680;
      }
      fx.pulse(victim.x, victim.y, 80, MAGNET.rose, 380, 7, 12);
    });
  },
};

// ══ Perk — Blade ══════════════════════════════════════════════════════

export const perkBlade: PreviewScript = {
  duration: 7600,
  scale: 0.8,
  caption: 'Blade — swords at 16 damage, thrown at 1360, and pulled hard enough to overshoot',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.w * 0.62, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    const rods = cornerRods(ctx, true);
    rodLayer(ctx, fx, rods, victim);
    let magnetised = false;
    ctx.onFrame((dt) => { if (magnetised) pullRodsToward(rods, victim.x, victim.y, dt); });

    ctx.at(500, () => {
      av.play('sweep', 0);
      fx.grasp(ctx.cx, ctx.cy, victim.x, victim.y, MAGNET.rose);
      fx.pulse(victim.x, victim.y, 90, MAGNET.red, 420, 6, 10, true);
      float(ctx, victim.x, victim.y - 28, '🧲 MAGNETIZED', '#ff4488');
      magnetised = true;
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'magnetized', 180, 3));
      ctx.onFrame((dt) => aura.update(dt, victim.x, victim.y, 1));
      float(ctx, ctx.w * 0.5, 24, 'swords are pulled twice as hard — and fly past', '#ff88aa', 10);
    });
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryMetalDetector: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  caption: 'Metal Detector — pulse a buried rod to dig it up, sweep it with Q, and it lasers for 5',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const victim = { x: ctx.w * 0.78, y: ctx.cy - 20 };
    dummy(ctx, victim.x, victim.y);
    const buried = [{ x: ctx.w * 0.42, y: ctx.cy + 50, exposed: false, live: false }];
    const rods: Rod[] = [];
    rodLayer(ctx, fx, rods, victim);
    const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      bg.clear();
      for (const b of buried) if (!b.exposed) MagnetFx.drawBuriedRod(bg, ctx.tint, b.x, b.y, elapsed / 1000);
    });

    ctx.at(700, () => {
      const b = buried[0];
      av.play('punch', Math.atan2(b.y - ctx.cy, b.x - ctx.cx));
      fx.pulse(b.x, b.y, 80, MAGNET.rose, 380, 7, 12);
      // A pulse within 62px of a buried find digs it up.
      b.exposed = true;
      rods.push(rod(b.x, b.y, { kind: 'ancient' }));
      fx.flash(b.x, b.y, 20, 8, MAGNET.bronzeHi);
      fx.shrapnel(b.x, b.y, 6, { speed: 170, size: 8, color: MAGNET.bronze, depth: 8 });
      fx.filingsMark(b.x, b.y, 34, 3, MAGNET.bronzeHi);
      float(ctx, b.x, b.y - 20, '⛏ ANCIENT ROD!', '#bb8844');
    });

    ctx.at(3200, () => {
      const b = buried[0];
      b.live = true;
      rods[0].kind = 'ancient-live';
      fx.pulse(rods[0].x, rods[0].y, 60, MAGNET.amber, 460, 7, 10);
      float(ctx, rods[0].x, rods[0].y - 24, '⚡ ROD ONLINE', '#ffcc44');
      float(ctx, victim.x, victim.y - 32, '🧲 MAGNETIZED', '#ff4488', 10);
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'magnetized', 180, 3));
      ctx.onFrame((dt) => aura.update(dt, victim.x, victim.y, 1));
      // 5 damage every 3s, but only at a magnetic target.
      for (let i = 1; i <= 2; i++) {
        ctx.at(i * 3000, () => {
          fx.laser(rods[0].x, rods[0].y, victim.x, victim.y, MAGNET.amber);
          float(ctx, victim.x, victim.y - 30, '⚡ 5', '#ffcc44', 12);
        });
      }
    });
  },
};

export const masteryMagLev: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Mag-Lev — +50 shield, 15 bash inside 36px, and a 950 px/s sling on click',
  run(ctx) {
    const fx = ctx.capture(() => new MagnetFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-magnet')) {
      const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-magnet').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new MagnetAvatar(ctx.scene, ctx.tint, 'player'));
    av.setMastered(true);
    ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
    const victim = { x: ctx.w * 0.78, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);

    let shield = 0;
    const readout = label(ctx, ctx.cx, 12, '#aa66ff', 11);
    ctx.onFrame(() => readout.setText(shield > 0 ? `🛹 ${shield} shield HP` : ''));

    const board = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let mounted = false;
    let vx = 0;
    let bashCd = 0;
    ctx.onFrame((dt, elapsed) => {
      board.clear();
      if (!mounted) return;
      at.x += vx * (dt / 1000);
      vx *= 0.95;
      MagnetFx.drawMagLevBoard(board, ctx.tint, at.x, at.y + 18,
        Phaser.Math.Clamp(vx / 900, -0.35, 0.35), elapsed / 1000);
      if (Phaser.Math.Distance.Between(at.x, at.y, victim.x, victim.y) <= 36 && elapsed > bashCd) {
        bashCd = elapsed + 400;
        fx.sparks(victim.x, victim.y, 6, Math.atan2(victim.y - at.y, victim.x - at.x), 10, MAGNET.lilac);
        float(ctx, victim.x, victim.y - 30, '🛹 15', '#cc99ff', 12);
      }
    });

    ctx.at(500, () => {
      mounted = true;
      shield = 50;
      fx.pulse(at.x, at.y + 16, 46, MAGNET.lilac, 420, 6, 10, true);
      fx.sparks(at.x, at.y + 16, 5, -Math.PI / 2, 10, MAGNET.lilac);
      av.play('flex');
      float(ctx, at.x, at.y - 40, '🛹 MAG-LEV', '#aa66ff');
      const aura = ctx.capture(() => new MagnetAura(ctx.scene, ctx.tint, 'maglev', 26, 3));
      let live = true;
      ctx.onFrame((dt) => { if (live) aura.update(dt, at.x, at.y, 1); });
      ctx.at(6000, () => {
        live = false;
        aura.destroy();
        mounted = false;
        shield = 0;
        fx.shrapnel(at.x, at.y + 16, 5, { speed: 150, size: 9, color: MAGNET.violet, depth: 8 });
        float(ctx, at.x, at.y - 40, '🛹 DISMOUNT — all shield lost', '#8877aa', 10);
      });
    });

    // Click slings you at the other fighter; the bash lands when you arrive.
    ctx.at(2000, () => {
      const a = Math.atan2(victim.y - at.y, victim.x - at.x);
      vx = Math.cos(a) * 950;
      fx.pulse(at.x, at.y + 14, 52, MAGNET.lilac, 340, 6, 8);
      fx.sparks(at.x, at.y + 14, 6, a + Math.PI, 10, MAGNET.lilac);
      av.play('dash', a);
      float(ctx, at.x, at.y - 30, 'SLING 950 px/s', '#aa66ff', 10);
    });
  },
};
