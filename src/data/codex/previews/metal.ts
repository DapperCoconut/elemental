import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  METAL, MetalAura, MetalAvatar, MetalFx, chainRun, flailHead,
} from '../../../elements/kits/MetalVisuals';

/**
 * Metal's showcases.
 *
 * Blood puddles, fire pools, shards, the anchor stake and the Steel Shield barrier are all
 * `MetalFx` statics painted into a Graphics the caller owns, so these loops keep their own
 * arrays and call the same painters `MetalKit.paintWorld` calls. The flail is `flailHead` on a
 * `chainRun`, spun with the kit's own 9→24 rad/s and 3.33s decay.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt`; `MetalFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: MetalFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new MetalFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new MetalAvatar(ctx.scene, ctx.tint, 'player'));
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

/** The blood bar the kit keeps under the health bars, restaged inside the box. */
function bloodBar(ctx: PreviewCtx, read: () => number): void {
  const w = 120, h = 7;
  const x = ctx.w * 0.5 - w / 2, y = 9;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
  const txt = label(ctx, ctx.w * 0.5, y + h + 9, '#ff3355', 10);
  ctx.onFrame(() => {
    const v = Phaser.Math.Clamp(read(), 0, 100);
    g.clear();
    g.fillStyle(ctx.tint(METAL.shadow), 0.9);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(ctx.tint(METAL.clot), 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(ctx.tint(METAL.crimson), 1);
    g.fillRect(x, y, w * (v / 100), h);
    txt.setText(`🩸 ${Math.round(v)}/100`);
  });
}

interface Puddle { x: number; y: number; radius: number; blood: number; seed: number; draining: boolean }

/** One Graphics for a floor of blood, painted with the kit's own `drawPuddle`. */
function puddleLayer(ctx: PreviewCtx, puddles: Puddle[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (const p of puddles) {
      MetalFx.drawPuddle(g, ctx.tint, p.x, p.y, p.radius, Phaser.Math.Clamp(p.blood / 25, 0, 1),
        p.seed, p.draining, elapsed / 1000);
    }
  });
}

const seeded = (): number => Math.random() * 10;

// ══ CLICK — Slash ═════════════════════════════════════════════════════

export const metalSlash: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Click — 25 damage in a 90px sweep, plus 350 of knockback',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 70, y: ctx.cy };
    movingDummy(ctx, victim);
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);
    let dealt = 0;

    const swing = (delay: number): void => ctx.at(delay, () => {
      const ang = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      av.play('sweep', ang);
      fx.slash(ctx.cx, ctx.cy, ang, 90, { color: METAL.chrome });
      if (Phaser.Math.Distance.Between(ctx.cx, ctx.cy, victim.x, victim.y) > 90) return;
      fx.spray(victim.x, victim.y, 8, { speed: 250, angle: ang, spread: 0.9, size: 3.6 });
      fx.sparks(victim.x, victim.y, 4, ang, 10);
      fx.splat(victim.x, victim.y, 17, 2);
      float(ctx, ctx.cx, ctx.cy - 36, '🗡️ 25', '#aabbcc');
      // 350 of knockback, cut off again 200ms later.
      let kb = 350;
      const stop = ctx.scene.time.now + 200;
      ctx.onFrame((dt) => {
        if (ctx.scene.time.now > stop) kb = 0;
        victim.x += Math.cos(ang) * kb * (dt / 1000);
      });
      // The passive: one puddle per 50 cumulative damage dealt.
      dealt += 25;
      if (dealt >= 50) {
        dealt -= 50;
        puddles.push({ x: victim.x, y: victim.y, radius: 30, blood: 25, seed: seeded(), draining: false });
        fx.spray(victim.x, victim.y, 7, { speed: 130, size: 3, life: 500, depth: 3 });
        float(ctx, victim.x, victim.y - 34, '🩸 puddle', '#ff3355', 9);
      }
    });
    swing(500);
    swing(1200);
  },
};

export const metalSlashUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Mighty Sabre — hold to 3s for 75, and a full charge parries and hurls the flail',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const readout = label(ctx, ctx.cx, ctx.cy + 34, '#ffdd44', 10);

    ctx.at(400, () => {
      const aura = ctx.capture(() => new MetalAura(ctx.scene, ctx.tint, 'charge', 30, 4));
      let live = true;
      const born = 400;
      ctx.onFrame((dt, elapsed) => {
        if (!live) return;
        const r = Phaser.Math.Clamp((elapsed - born) / 3000, 0, 1);
        aura.setIntensity(r);
        aura.setAngle(ctx.aim);
        aura.update(dt, ctx.cx, ctx.cy, 1);
        readout.setText(`charge ${(r * 100).toFixed(0)}%  —  ${Math.round(25 + 50 * r)} damage`);
      });

      // A shot arriving mid-charge, so the parry has something to bat back.
      ctx.at(2400, () => ctx.fly({
        texture: 'proj-fire', from: { x: ctx.tx, y: ctx.ty }, to: { x: ctx.cx + 100, y: ctx.cy }, speed: 360,
      }));

      ctx.at(3000, () => {
        live = false;
        aura.destroy();
        readout.setText('');
        av.play('sweep', ctx.aim);
        fx.slash(ctx.cx, ctx.cy, ctx.aim, 104, {
          color: METAL.goldHi, arc: Phaser.Math.DegToRad(130), duration: 320,
        });
        float(ctx, ctx.cx, ctx.cy - 52, '⚔️ MAX CHARGE!', '#ffee00', 12);
        float(ctx, ctx.tx, ctx.ty - 26, '75', '#ffdd44', 15);
        // The parry: the shot is destroyed and its damage goes back at 1.5×.
        fx.sparks(ctx.cx + 100, ctx.cy, 6, 0, 10, METAL.goldHi);
        fx.slash(ctx.cx + 100, ctx.cy, 0, 40, {
          color: METAL.goldHi, duration: 200, arc: Phaser.Math.DegToRad(70), bleed: false,
        });
        float(ctx, ctx.cx + 100, ctx.cy - 24, '✨ PARRY!', '#ffee44', 11);
        // And the flail thrown at 700 px/s for 40.
        ctx.at(120, () => {
          const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
          const m = { x: ctx.cx, y: ctx.cy };
          fx.ring(ctx.cx, ctx.cy, 12, 56, METAL.goldHi, 320, 7, 4);
          ctx.onFrame((dt, elapsed) => {
            m.x += 700 * (dt / 1000);
            g.clear();
            if (m.x > ctx.tx) { g.clear(); return; }
            flailHead(g, ctx.tint, m.x, m.y, elapsed / 200, 9, METAL.iron, METAL.steel, 0, 1, 8);
          });
          ctx.at(Math.round(((ctx.tx - ctx.cx) / 700) * 1000), () =>
            float(ctx, ctx.tx, ctx.ty - 42, '40', '#aabbcc', 13));
        });
      });
    });
  },
};

// ══ E — Flail Craft ═══════════════════════════════════════════════════

/** Both flail loops run the real spin sim; `heavy` is the E+ mace. */
function flailScript(heavy: boolean): PreviewScript {
  return {
    duration: 8000,
    scale: 0.8,
    caption: heavy
      ? 'Heavy Metal Rock — double damage (6→26), half the wind-up, and molten past 60%'
      : 'E — 3 damage idle up to 13 at full spin; each whip adds speed, and it decays over 3.3s',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const victim = { x: ctx.cx + 95, y: ctx.cy };
      dummy(ctx, victim.x, victim.y);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const fireG = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      const fires: { x: number; y: number; born: number }[] = [];
      const readout = label(ctx, ctx.w * 0.5, 12, heavy ? '#ff6600' : '#aabbcc', 11);

      const f = {
        angle: Math.PI / 2, vel: 0, initVel: 0, swinging: false,
        radius: 70 * (heavy ? 0.75 : 1), swingStart: 0, lastHit: -9999, heat: 0, fireAccum: 0,
      };
      let born = -1;

      ctx.at(400, () => {
        born = 400;
        av.play('slam', Math.PI / 2);
        const hx = ctx.cx, hy = ctx.cy + f.radius;
        fx.flash(hx, hy, heavy ? 26 : 18, 9, heavy ? METAL.ember : METAL.chrome);
        fx.sparks(hx, hy, heavy ? 14 : 9, -Math.PI / 2, 10, heavy ? METAL.flame : METAL.goldHi);
        fx.shards(hx, hy, heavy ? 8 : 5, {
          speed: 180, size: heavy ? 16 : 12, color: heavy ? METAL.char : METAL.steel, depth: 9,
        });
        float(ctx, ctx.cx, ctx.cy - 44, heavy ? '🤘 HEAVY METAL!' : '⛓️ FLAIL CRAFTED',
          heavy ? '#ff6600' : '#aabbcc', 11);
      });

      /** A click while aiming at the head — the kit's own accel and decay reset. */
      const whip = (delay: number): void => ctx.at(delay, () => {
        if (born < 0) return;
        const accel = 5.4 * (heavy ? 0.5 : 1);
        if (f.swinging) {
          const dir = Math.sign(f.initVel) || 1;
          f.initVel = dir * Math.min(Math.abs(f.initVel) + accel, 24);
          fx.sparks(ctx.cx + Math.cos(f.angle) * f.radius, ctx.cy + Math.sin(f.angle) * f.radius,
            8, f.angle + Math.PI / 2 * dir, 10, METAL.goldHi);
          float(ctx, ctx.cx, ctx.cy - 44, '⚡ FASTER!', '#ffcc44', 10);
        } else {
          f.swinging = true;
          f.radius = 95 * (heavy ? 0.75 : 1);
          f.initVel = 9;
          fx.ring(ctx.cx + Math.cos(f.angle) * f.radius, ctx.cy + Math.sin(f.angle) * f.radius,
            8, 40, METAL.chrome, 300, 7, 3);
          float(ctx, ctx.cx, ctx.cy - 44, '💫 FLAIL SWING!', '#ff4466', 11);
        }
        f.vel = f.initVel;
        f.swingStart = delay;
        av.play('sweep', f.angle);
      });
      whip(1100);
      whip(2000);
      whip(2600);
      whip(3200);

      ctx.onFrame((dt, elapsed) => {
        g.clear();
        fireG.clear();
        for (let i = fires.length - 1; i >= 0; i--) {
          const p = fires[i];
          const life = 1 - (elapsed - p.born) / 3000;
          if (life <= 0) { fires.splice(i, 1); continue; }
          MetalFx.drawFirePuddle(fireG, ctx.tint, p.x, p.y, 18, life, elapsed / 1000);
        }
        if (born < 0 || elapsed - born > 10000) { readout.setText(born < 0 ? '' : 'the chain gave out — 10s lifetime'); return; }

        const decayMs = (10000 / 3) / (heavy ? 2 : 1);
        let ratio = 0;
        if (f.swinging) {
          ratio = Math.max(0, 1 - (elapsed - f.swingStart) / decayMs);
          if (ratio <= 0) { f.swinging = false; f.vel = 0; f.initVel = 0; f.heat = 0; f.radius = 70 * (heavy ? 0.75 : 1); }
          else { f.vel = f.initVel * ratio; f.angle += f.vel * (dt / 1000); }
        }
        const hx = ctx.cx + Math.cos(f.angle) * f.radius;
        const hy = ctx.cy + Math.sin(f.angle) * f.radius;
        const dmg = Math.round((10 + ratio * 30) / 3) * (heavy ? 2 : 1);
        readout.setText(f.swinging ? `${Math.round(ratio * 100)}% spin — ${dmg} a hit` : 'idle — hanging on the chain');

        if (heavy && f.swinging) {
          const molten = ratio > 0.6;
          f.heat = molten ? Phaser.Math.Clamp((ratio - 0.6) / 0.4, 0, 1) : 0;
          if (molten) {
            f.fireAccum += dt;
            if (f.fireAccum >= 150) { f.fireAccum -= 150; fires.push({ x: hx, y: hy, born: elapsed }); }
          }
        } else if (f.swinging) {
          f.heat = ratio * 0.8;
        } else f.heat = 0;

        // Chain and head, drawn exactly as the kit draws them.
        chainRun(g, ctx.tint, ctx.cx, ctx.cy, hx, hy, 10, METAL.steel, 0.9, 0.9);
        flailHead(g, ctx.tint, hx, hy, f.angle * (heavy ? 1 : 1.6) + elapsed / 2500, heavy ? 14 : 9,
          heavy ? METAL.char : METAL.iron, heavy ? METAL.iron : METAL.steel, f.heat, 1, heavy ? 10 : 8);

        if (f.swinging && Phaser.Math.Distance.Between(hx, hy, victim.x, victim.y) <= 30
          && elapsed - f.lastHit >= 250) {
          f.lastHit = elapsed;
          const swingAng = f.angle + (f.initVel > 0 ? Math.PI / 2 : -Math.PI / 2);
          fx.sparks(victim.x, victim.y, 4 + Math.round(ratio * 8), swingAng, 10,
            heavy ? METAL.flame : METAL.goldHi);
          fx.spray(victim.x, victim.y, 4 + Math.round(ratio * 6), {
            speed: 160 + ratio * 220, angle: swingAng, spread: 1, size: 3.4,
          });
          fx.ring(victim.x, victim.y, 6, 24 + ratio * 26, heavy ? METAL.ember : METAL.rose, 260, 8, 3);
          float(ctx, victim.x, victim.y - 30, `⛓️ ${dmg}`, '#ff6688', 12);
        }
      });
    },
  };
}

export const flailCraft = flailScript(false);
export const flailCraftUpgraded = flailScript(true);

// ══ R — Blood Transfusion ═════════════════════════════════════════════

export const bloodTransfusion: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'R — 30 blood a second into 30 HP a second, 1:1, until the bar is empty',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    let blood = 100;
    let healed = 0;
    bloodBar(ctx, () => blood);
    const readout = label(ctx, ctx.cx, ctx.cy + 34, '#4ade80', 11);
    ctx.onFrame(() => readout.setText(healed > 0 ? `+${Math.round(healed)} HP` : ''));

    ctx.at(400, () => {
      const aura = ctx.capture(() => new MetalAura(ctx.scene, ctx.tint, 'transfuse', 30, 4));
      let live = true;
      let drip = 0;
      ctx.onFrame((dt) => {
        if (!live) return;
        aura.update(dt, ctx.cx, ctx.cy, 1);
        if (blood <= 0) return;
        const drain = Math.min(30 * (dt / 1000), blood);
        blood -= drain;
        healed += drain;
        drip += dt;
        if (drip >= 90) { drip -= 90; fx.drip(ctx.cx, ctx.cy); }
      });
      ctx.at(4200, () => { live = false; aura.destroy(); });
    });
  },
};

export const bloodTransfusionUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Blood Clottage — overflow blood clots your health: same total, half damage taken',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    let blood = 88;
    let clotted = 0;
    bloodBar(ctx, () => blood);
    const puddles: Puddle[] = [{ x: ctx.cx + 40, y: ctx.cy, radius: 30, blood: 25, seed: seeded(), draining: true }];
    puddleLayer(ctx, puddles);

    // The health bar, drawn so the clotted segment is visible as its own colour.
    const bw = 130, bh = 8;
    const hb = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    const cap = label(ctx, ctx.cx, ctx.cy + 42, '#cc0022', 10);
    let hp = 100;
    ctx.onFrame(() => {
      hb.clear();
      hb.fillStyle(ctx.tint(METAL.shadow), 0.9);
      hb.fillRect(ctx.cx - bw / 2 - 2, ctx.cy + 24, bw + 4, bh + 4);
      hb.fillStyle(0x2f7d4f, 1);
      hb.fillRect(ctx.cx - bw / 2, ctx.cy + 26, bw * (hp / 100), bh);
      hb.fillStyle(ctx.tint(METAL.gore), 1);
      hb.fillRect(ctx.cx - bw / 2, ctx.cy + 26, bw * (clotted / 100), bh);
      cap.setText(`${Math.round(clotted)} clotted of ${Math.round(hp)} HP`);
    });

    // Collecting from a full bar: the overflow goes into the health you already have.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 400 || puddles[0].blood <= 0) return;
      const drain = Math.min(10 * (dt / 1000), puddles[0].blood);
      puddles[0].blood -= drain;
      const room = 100 - blood;
      const toBar = Math.min(room, drain);
      blood += toBar;
      const overflow = drain - toBar;
      if (overflow > 0) clotted = Math.min(hp, clotted + overflow);
    });

    // A 50-damage hit: 25 off the clotted half-price, 25 off the real health.
    ctx.at(4400, () => {
      fx.spray(ctx.cx, ctx.cy, 8, { speed: 200, size: 3.6 });
      fx.splat(ctx.cx, ctx.cy, 20, 2);
      const clotSpent = Math.min(clotted, 25);
      clotted -= clotSpent;
      hp -= clotSpent + 25;
      float(ctx, ctx.cx, ctx.cy - 24, '50 in — 25 clotted, 25 real', '#ff3355', 10);
    });
  },
};

// ══ F — Chain Tether ══════════════════════════════════════════════════

export const chainTether: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'F — a 5s leash at 80px, 3s of bleeding, and 3 blood puddles dropped on them',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 250, y: ctx.cy };
    movingDummy(ctx, victim);
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);
    const chain = { x: 0, y: 0, vx: 0, vy: 0, live: false };
    let tethered = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (chain.live) {
        chain.x += chain.vx * (dt / 1000);
        chain.y += chain.vy * (dt / 1000);
        chainRun(g, ctx.tint, ctx.cx, ctx.cy, chain.x, chain.y, 8, METAL.steel, 0.9, 0.9);
        if (Phaser.Math.Distance.Between(chain.x, chain.y, victim.x, victim.y) <= 28) {
          chain.live = false;
          tethered = true;
          fx.chainSnap(ctx.cx, ctx.cy, victim.x, victim.y, 8);
          fx.spray(victim.x, victim.y, 8, { speed: 170, size: 3.4, life: 620, depth: 6 });
          float(ctx, victim.x, victim.y - 34, '⛓️ TETHERED!', '#aabbcc');
          float(ctx, victim.x, victim.y - 50, '🩸 BLEEDING', '#cc0000', 10);
        }
      }
      if (!tethered) return;
      // The leash: they are snapped back to 80px, not merely slowed.
      chainRun(g, ctx.tint, ctx.cx, ctx.cy, victim.x, victim.y, 10, METAL.iron, 0.75, 0.8);
      victim.x += 70 * (dt / 1000);
      const d = Phaser.Math.Distance.Between(ctx.cx, ctx.cy, victim.x, victim.y);
      if (d > 80) {
        const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
        victim.x = ctx.cx + Math.cos(a) * 80;
        victim.y = ctx.cy + Math.sin(a) * 80;
      }
      void elapsed;
    });

    ctx.at(500, () => {
      const a = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      av.play('punch', a);
      fx.sparks(ctx.cx + Math.cos(a) * 22, ctx.cy + Math.sin(a) * 22, 6, a, 9, METAL.chrome);
      float(ctx, ctx.cx, ctx.cy - 30, '⛓️ CHAIN!', '#aabbcc', 10);
      Object.assign(chain, { x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, live: true });
    });
    // 2 damage a second from the bleed, and a pool dropped every 1.67s by the drag.
    for (let i = 1; i <= 3; i++) {
      ctx.at(1400 + i * 1667, () => {
        if (!tethered) return;
        puddles.push({ x: victim.x, y: victim.y, radius: 30, blood: 25, seed: seeded(), draining: false });
        fx.spray(victim.x, victim.y, 7, { speed: 130, size: 3, life: 500, depth: 3 });
      });
    }
    for (let i = 1; i <= 3; i++) {
      ctx.at(1400 + i * 1000, () => {
        if (tethered) float(ctx, victim.x, victim.y - 22, '2', '#cc0000', 10);
      });
    }
  },
};

export const chainTetherUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Ground Anchor — 12s stake, pulsing every 1.5s to pull 15 blood from every pool in 150px',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let blood = 20;
    bloodBar(ctx, () => blood);
    const puddles: Puddle[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      puddles.push({
        x: ctx.cx + 180 + Math.cos(a) * 110, y: ctx.cy + Math.sin(a) * 55,
        radius: 30, blood: 25, seed: seeded(), draining: false,
      });
    }
    puddleLayer(ctx, puddles);
    const readout = label(ctx, ctx.cx, ctx.cy + 32, '#ccddee', 10);

    ctx.at(300, () => {
      const aura = ctx.capture(() => new MetalAura(ctx.scene, ctx.tint, 'charge', 30, 4));
      let live = true;
      ctx.onFrame((dt, elapsed) => {
        if (!live) return;
        const r = Phaser.Math.Clamp((elapsed - 300) / 3000, 0, 1);
        aura.setIntensity(r);
        aura.update(dt, ctx.cx, ctx.cy, 1);
        readout.setText(`holding F  ${(r * 3).toFixed(1)}s / 3.0s`);
      });
      ctx.at(3000, () => {
        live = false;
        aura.destroy();
        readout.setText('');
        const sx = ctx.cx + 180, sy = ctx.cy;
        av.play('slam', Math.PI / 2);
        fx.flash(sx, sy, 26, 9, METAL.chrome);
        fx.ring(sx, sy, 10, 70, METAL.chrome, 380, 7, 4);
        fx.shards(sx, sy, 8, { speed: 210, size: 14, color: METAL.iron, depth: 8 });
        fx.sparks(sx, sy, 10, -Math.PI / 2, 10);
        float(ctx, sx, sy - 24, '⛓️ GROUND ANCHOR', '#ccddee');

        const stakeG = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
        ctx.onFrame((_dt, elapsed) => {
          stakeG.clear();
          if (elapsed > 3300 + 12000) return;
          MetalFx.drawStake(stakeG, ctx.tint, sx, sy, 150, elapsed / 1000);
        });
        // A pulse every 1.5s, taking up to 15 from each pool in range.
        for (let i = 1; i <= 4; i++) {
          ctx.at(i * 1500, () => {
            fx.ring(sx, sy, 20, 150, METAL.chrome, 500, 6, 3);
            let drained = 0;
            for (let k = puddles.length - 1; k >= 0; k--) {
              const p = puddles[k];
              if (Phaser.Math.Distance.Between(sx, sy, p.x, p.y) > 150) continue;
              const take = Math.min(15, p.blood);
              p.blood -= take;
              drained += take;
              fx.spray(p.x, p.y, 4, {
                speed: 200, angle: Math.atan2(sy - p.y, sx - p.x), spread: 0.4, size: 3, depth: 6,
              });
              if (p.blood <= 0) puddles.splice(k, 1);
            }
            if (drained > 0) {
              blood = Math.min(100, blood + drained);
              float(ctx, sx, sy - 20, `+${Math.round(drained)} 🩸`, '#ff3355', 12);
            }
          });
        }
      });
    });
  },
};

// ══ Q — Clot Armor ════════════════════════════════════════════════════

export const clotArmor: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Q — the whole bar becomes 1.25× its value in plate; every 25 lost sprays 5 shards',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    let blood = 100;
    let shield = 0;
    bloodBar(ctx, () => blood);
    const readout = label(ctx, ctx.cx, ctx.cy + 32, '#ff4466', 11);
    ctx.onFrame(() => readout.setText(shield > 0 ? `🛡️ ${Math.round(shield)} plate` : ''));

    const shards: { x: number; y: number; vx: number; vy: number }[] = [];
    const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);
    ctx.onFrame((dt, elapsed) => {
      sg.clear();
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        if (s.x < -20 || s.x > ctx.w + 20 || s.y < -20 || s.y > ctx.h + 20) { shards.splice(i, 1); continue; }
        MetalFx.drawShardBolt(sg, ctx.tint, s.x, s.y, Math.atan2(s.vy, s.vx), 13, METAL.crimson, elapsed / 1000);
      }
    });

    ctx.at(400, () => {
      shield = Math.round(blood * 1.25);
      blood = 0;
      av.play('raise', -Math.PI / 2, 700);
      fx.flash(ctx.cx, ctx.cy, 34, 9, METAL.crimson);
      fx.ring(ctx.cx, ctx.cy, 10, 100, METAL.rose, 420, 7, 5);
      fx.spray(ctx.cx, ctx.cy, 20, { speed: 210, size: 4, life: 620, depth: 7 });
      float(ctx, ctx.cx, ctx.cy - 44, '🛡️ CLOT ARMOR (125 HP)', '#ff4466', 11);
      const aura = ctx.capture(() => new MetalAura(ctx.scene, ctx.tint, 'clot', 30, 4));
      ctx.onFrame((dt) => {
        aura.setIntensity(Phaser.Math.Clamp(shield / 125, 0, 1));
        aura.update(dt, ctx.cx, ctx.cy, 1);
      });

      // Four 25-point chunks coming off, each one a 5-shard burst.
      for (let i = 1; i <= 4; i++) {
        ctx.at(i * 1200, () => {
          shield = Math.max(0, shield - 25);
          fx.ring(ctx.cx, ctx.cy, 12, 46, METAL.rose, 300, 7, 3);
          float(ctx, ctx.cx, ctx.cy - 30, '🩸 SHARD BURST', '#ff3355', 10);
          for (let k = 0; k < 5; k++) {
            const a = Math.random() * Math.PI * 2;
            shards.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420 });
          }
          // A shard that lands opens a fresh pool where it hit.
          ctx.at(280, () => {
            puddles.push({
              x: ctx.cx + Phaser.Math.Between(-90, 120), y: ctx.cy + Phaser.Math.Between(-40, 40),
              radius: 30, blood: 25, seed: seeded(), draining: false,
            });
          });
        });
      }
    });
  },
};

export const clotArmorUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Blood Blade — 100 blood for a 150px sword that swings faster the more blood you hold',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 110, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);
    let blood = 100;
    bloodBar(ctx, () => blood);
    const readout = label(ctx, ctx.cx, ctx.cy + 32, '#cc0022', 10);
    ctx.onFrame(() => readout.setText(blood > 0
      ? `swing every ${Phaser.Math.Clamp(700 - blood * 4, 200, 700)}ms   —   1.5× damage taken`
      : '1.5× damage taken'));

    ctx.at(400, () => {
      blood = 0;
      av.play('raise', -Math.PI / 2, 900);
      float(ctx, ctx.cx, ctx.cy - 52, '🗡️ BLOOD BLADE', '#cc0022', 12);
      // Falling out of the sky and landing point-first.
      const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
      const blade = { y: ctx.cy - ctx.h, down: true };
      ctx.onFrame((dt, elapsed) => {
        bg.clear();
        if (!blade.down) return;
        blade.y += 1100 * (dt / 1000);
        if (blade.y >= ctx.cy) {
          blade.down = false;
          fx.flash(ctx.cx, ctx.cy, 34, 10, METAL.crimson);
          fx.ring(ctx.cx, ctx.cy, 12, 90, METAL.rose, 460, 7, 5);
          fx.spray(ctx.cx, ctx.cy, 16, { speed: 260, size: 4.4, life: 700, depth: 7 });
          fx.splat(ctx.cx, ctx.cy, 34, 2);
          return;
        }
        fx.drip(ctx.cx, blade.y, 10, METAL.crimson);
        void elapsed;
      });

      // Then it is your sword: a 150px serrated arc, feeding blood back into the bar.
      let dealt = 0;
      for (let i = 1; i <= 6; i++) {
        ctx.at(900 + i * 450, () => {
          av.play('sweep', ctx.aim);
          fx.slash(ctx.cx, ctx.cy, ctx.aim, 150 * 0.72, {
            color: METAL.crimson, serrated: true, arc: Phaser.Math.DegToRad(150), duration: 300,
          });
          fx.spray(victim.x, victim.y, 10, { speed: 240, angle: ctx.aim, spread: 0.9, size: 4 });
          fx.splat(victim.x, victim.y, 22, 2);
          float(ctx, victim.x, victim.y - 30, '🗡️ 25', '#ff3355', 12);
          dealt += 25;
          // 25 blood straight to the bar per 50 damage, instead of a puddle.
          if (dealt >= 50) {
            dealt -= 50;
            blood = Math.min(100, blood + 25);
            float(ctx, ctx.cx, ctx.cy - 34, '+25 🩸', '#ff3355', 10);
          }
        });
      }
    });
  },
};

// ══ Passives ══════════════════════════════════════════════════════════

export const passiveBloodBar: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'A puddle per 50 damage dealt; stand on one and it drains 10 blood a second',
  run(ctx) {
    const fx = ctx.capture(() => new MetalFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-metal')) {
      const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-metal').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new MetalAvatar(ctx.scene, ctx.tint, 'player'));
    ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);

    let blood = 0;
    bloodBar(ctx, () => blood);
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);
    let dealt = 0;

    // Two slashes make 50 damage, which makes one pool.
    for (const d of [500, 1200]) {
      ctx.at(d, () => {
        av.play('sweep', 0);
        fx.slash(at.x, at.y, 0, 90, { color: METAL.chrome });
        fx.spray(victim.x, victim.y, 8, { speed: 250, angle: 0, spread: 0.9, size: 3.6 });
        float(ctx, victim.x, victim.y - 24, '25', '#aabbcc', 12);
        dealt += 25;
        if (dealt >= 50) {
          dealt -= 50;
          puddles.push({ x: victim.x, y: victim.y, radius: 30, blood: 25, seed: seeded(), draining: false });
          float(ctx, victim.x, victim.y - 40, '🩸 50 dealt — one pool', '#ff3355', 10);
        }
      });
    }
    // Then walking over to collect it.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 2200) return;
      at.x = Math.min(victim.x - 6, at.x + 70 * (dt / 1000));
      for (let i = puddles.length - 1; i >= 0; i--) {
        const p = puddles[i];
        p.draining = Phaser.Math.Distance.Between(at.x, at.y, p.x, p.y) <= p.radius + 18;
        if (!p.draining || p.blood <= 0) continue;
        const drain = Math.min(10 * (dt / 1000), p.blood);
        p.blood -= drain;
        blood = Math.min(100, blood + drain);
        if (p.blood <= 0) puddles.splice(i, 1);
      }
    });
    for (const d of [3600, 4600]) ctx.at(d, () => float(ctx, at.x, at.y - 22, '+10 🩸', '#ff3355', 11));
  },
};

export const passiveAggressiveBleeding: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Aggressive Bleeding — 2 damage a second, and a pool of *your* blood every 3s',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 170, y: ctx.cy };
    movingDummy(ctx, victim);
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);

    ctx.at(400, () => {
      fx.spray(victim.x, victim.y, 8, { speed: 170, size: 3.4, life: 620, depth: 6 });
      float(ctx, victim.x, victim.y - 36, '🩸 BLEEDING', '#cc0000');
      const aura = ctx.capture(() => new MetalAura(ctx.scene, ctx.tint, 'bleed', 24, 4));
      ctx.onFrame((dt) => aura.update(dt, victim.x, victim.y, 1));
      // They run, and the trail they leave belongs to whoever opened them.
      ctx.onFrame((dt) => { victim.x = Math.min(ctx.w - 40, victim.x + 46 * (dt / 1000)); });
      for (let i = 1; i <= 6; i++) {
        ctx.at(i * 1000, () => float(ctx, victim.x, victim.y - 22, '2', '#cc0000', 11));
      }
      for (let i = 1; i <= 2; i++) {
        ctx.at(i * 3000, () => {
          puddles.push({ x: victim.x, y: victim.y, radius: 30, blood: 25, seed: seeded(), draining: false });
          fx.spray(victim.x, victim.y, 7, { speed: 130, size: 3, life: 500, depth: 3 });
        });
      }
    });
  },
};

// ══ Perk — Exsanguinate ═══════════════════════════════════════════════

export const perkExsanguinate: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Exsanguinate — 8 shards a burst instead of 5, and every pool is 50% wider',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const puddles: Puddle[] = [];
    puddleLayer(ctx, puddles);
    const shards: { x: number; y: number; vx: number; vy: number }[] = [];
    const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt, elapsed) => {
      sg.clear();
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        if (s.x < -20 || s.x > ctx.w + 20 || s.y < -20 || s.y > ctx.h + 20) { shards.splice(i, 1); continue; }
        MetalFx.drawShardBolt(sg, ctx.tint, s.x, s.y, Math.atan2(s.vy, s.vx), 13, METAL.crimson, elapsed / 1000);
      }
    });

    ctx.at(400, () => {
      av.play('raise', -Math.PI / 2, 700);
      fx.ring(ctx.cx, ctx.cy, 12, 46, METAL.rose, 300, 7, 3);
      float(ctx, ctx.cx, ctx.cy - 30, '🩸 8 SHARDS', '#ff3355', 12);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.random() * 0.3;
        shards.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420 });
      }
      // 45px pools instead of 30 — a wider stand, the same 25 blood inside.
      for (let k = 0; k < 4; k++) {
        ctx.at(300 + k * 120, () => puddles.push({
          x: ctx.cx + Phaser.Math.Between(-120, 160), y: ctx.cy + Phaser.Math.Between(-40, 40),
          radius: 45, blood: 25, seed: seeded(), draining: false,
        }));
      }
      ctx.at(900, () => float(ctx, ctx.cx + 40, ctx.cy + 30, '45px pools', '#ff8899', 10));
    });
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryNaturalClot: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Natural Clot — every hit reduced by 3, so anything of 3 or less does nothing at all',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const readout = label(ctx, ctx.cx, ctx.cy + 32, '#8fa0b0', 10);
    ctx.onFrame(() => readout.setText('all incoming damage −3'));

    const hit = (delay: number, raw: number): void => ctx.at(delay, () => {
      const taken = Math.max(0, raw - 3);
      fx.sparks(ctx.cx, ctx.cy, 5, Math.PI, 10, METAL.chrome);
      if (taken > 0) {
        fx.spray(ctx.cx, ctx.cy, 5, { speed: 160, size: 3.2 });
        float(ctx, ctx.cx - 18, ctx.cy - 22, `−${taken}`, '#ff6666', 12);
        float(ctx, ctx.cx + 24, ctx.cy - 22, `(${raw} − 3)`, '#8fa0b0', 10);
      } else {
        fx.ring(ctx.cx, ctx.cy, 8, 34, METAL.chrome, 260, 5, 4);
        float(ctx, ctx.cx, ctx.cy - 22, `${raw} → NOTHING`, '#c9d6e2', 11);
      }
    });
    hit(500, 25);
    hit(1800, 2);
    hit(3000, 3);
    hit(4200, 12);
  },
};

export const masterySteelShield: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Steel Shield — 25 blood for 5s: shots stop dead, and all damage taken is ×0.75',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    dummy(ctx, ctx.tx, ctx.ty);
    let blood = 60;
    bloodBar(ctx, () => blood);
    const shards: { x: number; y: number; vx: number; vy: number }[] = [];
    const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let up = false;
    let red = false;

    ctx.onFrame((dt, elapsed) => {
      bg.clear();
      if (up) MetalFx.drawBarrier(bg, ctx.tint, ctx.cx + 46, ctx.cy, ctx.aim, red, elapsed / 1000);
      sg.clear();
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        if (s.x < -20 || s.x > ctx.w + 20 || s.y < -20 || s.y > ctx.h + 20) { shards.splice(i, 1); continue; }
        MetalFx.drawShardBolt(sg, ctx.tint, s.x, s.y, Math.atan2(s.vy, s.vx), 13, METAL.crimson, elapsed / 1000);
      }
    });

    ctx.at(400, () => {
      blood -= 25;
      up = true;
      av.play('clap', ctx.aim);
      fx.flash(ctx.cx + 46, ctx.cy, 22, 9, METAL.chrome);
      fx.ring(ctx.cx + 46, ctx.cy, 8, 46, METAL.chrome, 320, 7, 3);
      fx.sparks(ctx.cx + 46, ctx.cy, 8, ctx.aim, 10, METAL.chrome);
      float(ctx, ctx.cx, ctx.cy - 44, '🛡️ STEEL SHIELD', '#aabbcc', 11);
      // Shots stopping dead on the plate.
      for (const d of [500, 1300, 2100]) {
        ctx.at(d, () => ctx.fly({
          texture: 'proj-fire', from: { x: ctx.tx, y: ctx.ty }, to: { x: ctx.cx + 46, y: ctx.cy }, speed: 420,
          onHit: () => {
            fx.sparks(ctx.cx + 46, ctx.cy, 6, 0, 10, red ? METAL.rose : METAL.chrome);
            float(ctx, ctx.cx + 46, ctx.cy - 22, 'BLOCKED', '#c9d6e2', 10);
          },
        }));
      }
      ctx.at(4600, () => { up = false; });
    });

    // Then again, this time raised while Clot Armor is up: the plate comes up red.
    ctx.at(5200, () => {
      up = true;
      red = true;
      fx.flash(ctx.cx + 46, ctx.cy, 22, 9, METAL.rose);
      fx.ring(ctx.cx + 46, ctx.cy, 8, 46, METAL.rose, 320, 7, 3);
      float(ctx, ctx.cx, ctx.cy - 44, '🛡️ RED STEEL SHIELD', '#ff5577', 11);
      ctx.at(600, () => ctx.fly({
        texture: 'proj-fire', from: { x: ctx.tx, y: ctx.ty }, to: { x: ctx.cx + 46, y: ctx.cy }, speed: 420,
        onHit: () => {
          fx.sparks(ctx.cx + 46, ctx.cy, 6, 0, 10, METAL.rose);
          float(ctx, ctx.cx + 46, ctx.cy - 24, '🩸 SHARD BURST', '#ff3355', 10);
          for (let k = 0; k < 5; k++) {
            const a = Math.random() * Math.PI * 2;
            shards.push({ x: ctx.cx + 46, y: ctx.cy, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420 });
          }
        },
      }));
    });
  },
};
