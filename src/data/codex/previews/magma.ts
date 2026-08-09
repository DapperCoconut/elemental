import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  MAG, MagmaAvatar, MagmaFx, breathCone, dragonEgg, lavaRock, magmaArm, magmaFist,
  moltenPool, pressureGauge, volcanoCone,
} from '../../../elements/kits/MagmaVisuals';

/**
 * Magma's showcases.
 *
 * Magma puts nothing in the world as a sprite — pools, rocks, vessels, the arm and the fist are
 * all data the kit repaints into four Graphics layers, so every loop here keeps the same little
 * records the kit keeps and paints them with the real painters: `moltenPool`, `volcanoCone`,
 * `dragonEgg`, `pressureGauge`, `lavaRock`, `magmaArm`, `magmaFist` and `breathCone`. One-shots
 * go through a real `MagmaFx` with a sticky sink.
 *
 * `bodyTexture` is `elem-fire` on purpose: `ArenaScene.ELEMENT_TEXTURES` has no entry for magma,
 * so that is genuinely the ball the arena stages under the rig, and `MagmaAvatar.drawBody` only
 * paints a silhouette of its own once hatched. Staging anything else would document a character
 * the player never sees.
 */

const BODY = 'elem-fire';

// ── Staging ───────────────────────────────────────────────────────────

interface Pool { x: number; y: number; born: number; fromX: number; fromY: number }
interface Vessel { x: number; y: number; r: number; p: number; max: number; kind: 'volcano' | 'egg'; seed: number }

function fxOf(ctx: PreviewCtx): MagmaFx {
  return ctx.capture(() => new MagmaFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, depth = 5): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
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

/** The molten-rock rig, or null when a skin has replaced the character. */
function molten(av: unknown): MagmaAvatar | null {
  return av instanceof MagmaAvatar ? av : null;
}

/**
 * The floor: pools in the air on their arc with a landing ring, pools on the ground cooling over
 * their 6 seconds, and the vessels standing in them with their gauges. Every loop wants this.
 */
function field(
  ctx: PreviewCtx, pools: Pool[], vessels: Vessel[],
): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const objs = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  const gauges = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_dt, elapsed) => {
    ground.clear(); objs.clear(); gauges.clear();
    const t = elapsed / 1000;
    for (let i = pools.length - 1; i >= 0; i--) {
      const p = pools[i];
      const age = elapsed - p.born;
      if (age < 260) {
        // Still in the air: an arc, and the ring that says where it is going to land.
        const f = age / 260;
        const x = Phaser.Math.Linear(p.fromX, p.x, f);
        const y = Phaser.Math.Linear(p.fromY, p.y, f) - Math.sin(f * Math.PI) * 44;
        objs.fillStyle(ctx.tint(MAG.magma), 0.3); objs.fillCircle(x, y, 13);
        objs.fillStyle(ctx.tint(MAG.lava), 1); objs.fillCircle(x, y, 8);
        objs.fillStyle(ctx.tint(MAG.white), 0.8); objs.fillCircle(x - 2, y - 2, 3.2);
        objs.lineStyle(1.6, ctx.tint(MAG.ember), 0.35 + f * 0.35);
        objs.strokeEllipse(p.x, p.y, 27 * 1.7 * (0.5 + f * 0.5), 27 * 1.15 * (0.5 + f * 0.5));
        continue;
      }
      const life = age - 260;
      if (life > 6000) { pools.splice(i, 1); continue; }
      // The crust skins over as it cools — the warning that it is nearly finished.
      const heat = Phaser.Math.Clamp(1 - (life / 6000) * 1.15, 0.05, 1);
      const fade = Phaser.Math.Clamp((6000 - life) / 900, 0, 1);
      moltenPool(ground, ctx.tint, p.x, p.y, 27, heat, t, p.born % 999, fade);
    }
    for (const v of vessels) {
      const ratio = v.p / v.max;
      if (v.kind === 'volcano') volcanoCone(objs, ctx.tint, v.x, v.y + v.r * 0.5, v.r, ratio, t, v.seed);
      else dragonEgg(objs, ctx.tint, v.x, v.y, v.r, ratio, t, v.seed);
      const isEgg = v.kind === 'egg';
      pressureGauge(gauges, ctx.tint, v.x, v.y - (isEgg ? v.r * 1.5 : v.r * 2.1),
        isEgg ? 62 : 48, ratio, isEgg ? MAG.scaleLit : MAG.magma);
    }
  });
}

/** Lob one pool, exactly as `firePlume` and `ventPool` do. */
function lob(pools: Pool[], from: { x: number; y: number }, x: number, y: number, born: number): void {
  pools.push({ x, y, born, fromX: from.x, fromY: from.y });
}

// ══ CLICK — Plume ═════════════════════════════════════════════════════

export const plume: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Click — 5 pools in a 71° fan, 34 a second each, and overlap never stacks',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    field(ctx, pools, []);
    const victim = { x: ctx.cx + 96, y: ctx.cy - 4 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);

    // Five lobs at 85ms, fanned 0.62 rad either side and staggered 38–118px out.
    const throwFan = (at: number): void => {
      ctx.at(at, () => { av.play('sweep', ctx.aim); molten(av)?.setVenting(true); });
      for (let i = 0; i < 5; i++) {
        ctx.at(at + i * 85, () => {
          const spread = ((i / 4) - 0.5) * 2 * 0.62;
          const ang = ctx.aim + spread;
          const dist = 38 + 80 * (0.35 + ((i * 37) % 65) / 100);
          const x = ctx.cx + Math.cos(ang) * dist;
          const y = ctx.cy + Math.sin(ang) * dist;
          lob(pools, { x: ctx.cx, y: ctx.cy }, x, y, at + i * 85);
          ctx.capture(() => fx.ember(ctx.cx, ctx.cy, 3, 14, 380));
          ctx.scene.time.delayedCall(260, () => ctx.capture(() => {
            fx.splat(x, y, 27 * 0.9);
            fx.ember(x, y, 4, 27 * 0.7, 520);
          }));
        });
      }
    };

    ctx.at(300, () => readout.setText('five globs, one every 85ms — they are in the air, not on the floor yet'));
    throwFan(700);
    ctx.at(1400, () => readout.setText('the ring on the floor is where each one is going. It can be stepped out of.'));
    // The burn, ticking at the real 34 a second while the dummy stands in it.
    const burnt = { total: 0, acc: 0 };
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1200) return;
      const inLava = pools.some((p) => elapsed - p.born >= 260 && elapsed - p.born <= 6260
        && Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= 27);
      if (!inLava) { burnt.acc = 0; return; }
      burnt.acc += 34 * (dt / 1000);
      while (burnt.acc >= 1) { burnt.acc -= 1; burnt.total += 1; }
      readout.setText(`standing in it: 34 a second   —   ${burnt.total} so far`);
    });
    ctx.at(4400, () => readout.setText('overlapping pools are a wider trap, not a hotter one — burn is a max, never a sum'));
    ctx.at(6400, () => {
      molten(av)?.setVenting(false);
      readout.setText('and each pool cools over 6 seconds. The grey crust is the warning.');
    });
  },
};

// ══ E — Volcano ═══════════════════════════════════════════════════════

export const volcano: PreviewScript = {
  duration: 15000,
  scale: 0.74,
  bodyTexture: BODY,
  caption: 'E — vents lava forever; fed to 100 it fires rock for 5s and collapses for 60 in 150px',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [];
    field(ctx, pools, vessels);
    const victim = { x: ctx.w * 0.72, y: ctx.cy + 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);

    // Flying rock, stepped at the kit's own 215 px/s.
    const rocks: { x: number; y: number; vx: number; vy: number; spin: number; seed: number; born: number }[] = [];
    const rockG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((dt, elapsed) => {
      rockG.clear();
      const s = dt / 1000;
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.x += r.vx * s; r.y += r.vy * s; r.spin += s * 6;
        if (elapsed - r.born > 2600 || r.x < 0 || r.x > ctx.w || r.y < 0 || r.y > ctx.h) {
          rocks.splice(i, 1); continue;
        }
        lavaRock(rockG, ctx.tint, r.x, r.y, 6, r.spin, r.seed);
      }
    });

    const site = { x: ctx.w * 0.44, y: ctx.cy };
    const v: Vessel = { ...site, r: 30, p: 0, max: 100, kind: 'volcano', seed: 7 };

    ctx.at(300, () => {
      vessels.push(v);
      av.play('slam', ctx.aim);
      ctx.capture(() => {
        fx.shock(site.x, site.y, 8, 70, MAG.magma, 520);
        fx.smoke(site.x, site.y - 26, 6, 900);
        fx.ember(site.x, site.y - 20, 10, 26, 700);
      });
      float(ctx, site.x, site.y - 74, '🌋 VOLCANO', hex(MAG.lava), 12);
      readout.setText('left alone it vents a pool every 2.6 seconds and nothing else');
    });

    // Venting and spitting, on the same schedule the kit runs — driven off live pressure.
    const clock = { pool: 900, rock: 0 };
    ctx.onFrame((dt, elapsed) => {
      if (!vessels.length) return;
      const ratio = v.p / v.max;
      if (elapsed >= clock.pool) {
        clock.pool = elapsed + Phaser.Math.Linear(2600, 700, ratio);
        const a = ((elapsed * 0.013) % (Math.PI * 2));
        const d = v.r + 14 + ((elapsed * 7) % 58);
        lob(pools, { x: v.x, y: v.y - v.r * 1.4 },
          v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * 0.8, elapsed);
      }
      if (ratio < 0.35) return;
      if (elapsed < clock.rock) return;
      const f = Phaser.Math.Clamp((ratio - 0.35) / 0.65, 0, 1);
      clock.rock = elapsed + Phaser.Math.Linear(1500, 420, f);
      for (let i = 0; i < 3; i++) {
        const a = (elapsed * 0.004) + (i / 3) * Math.PI * 2;
        rocks.push({
          x: v.x + Math.cos(a) * v.r * 0.7, y: v.y - v.r * 1.2 + Math.sin(a) * v.r * 0.4,
          vx: Math.cos(a) * 215, vy: Math.sin(a) * 215 * 0.85,
          spin: a, seed: i * 37 + elapsed % 99, born: elapsed,
        });
      }
      void dt;
    });

    // Feeding it: a fan of plume laid straight across the cone.
    for (let k = 0; k < 4; k++) {
      ctx.at(2000 + k * 1500, () => {
        av.play('sweep', ctx.aim);
        for (let i = 0; i < 5; i++) {
          const a = (i / 4 - 0.5) * 1.24 + Math.atan2(v.y - ctx.cy, v.x - ctx.cx);
          lob(pools, { x: ctx.cx, y: ctx.cy },
            ctx.cx + Math.cos(a) * 120, ctx.cy + Math.sin(a) * 120, 2000 + k * 1500);
        }
      });
    }
    // 16 pressure a second from every pool sitting on it, exactly as `feed` charges.
    ctx.onFrame((dt, elapsed) => {
      if (!vessels.length || v.p >= v.max) return;
      let on = 0;
      for (const p of pools) {
        if (elapsed - p.born < 260) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y) <= 27 + v.r) on++;
      }
      if (!on) return;
      v.p = Math.min(v.max, v.p + 16 * on * (dt / 1000));
      readout.setText(`${on} pool${on > 1 ? 's' : ''} on it   —   ${Math.round(v.p)} / 100 pressure`);
      if (v.p >= v.max) {
        ctx.capture(() => fx.erupt(v.x, v.y - v.r, 60, MAG.gold));
        float(ctx, v.x, v.y - 78, '🌋 CRITICAL', hex(MAG.white), 13);
        readout.setText('critical — 5 seconds of rock in every direction, then it comes down');
      }
    });
    // The critical spiral and the collapse, five seconds after topping out.
    const crit = { at: -1 };
    ctx.onFrame((_dt, elapsed) => {
      if (v.p < v.max || !vessels.length) return;
      if (crit.at < 0) crit.at = elapsed;
      if (elapsed >= clock.rock && elapsed < crit.at + 5000) {
        clock.rock = elapsed + 130;
        const a = elapsed * 0.012;
        rocks.push({
          x: v.x + Math.cos(a) * v.r * 0.7, y: v.y - v.r * 1.2 + Math.sin(a) * v.r * 0.4,
          vx: Math.cos(a) * 215, vy: Math.sin(a) * 215 * 0.85, spin: a, seed: 5, born: elapsed,
        });
      }
      if (elapsed < crit.at + 5000) return;
      vessels.length = 0;
      ctx.capture(() => {
        fx.erupt(v.x, v.y, 150 * 0.7, MAG.magma);
        fx.shock(v.x, v.y, 30, 150, MAG.gold, 720);
        fx.smoke(v.x, v.y - 20, 12, 1400);
      });
      float(ctx, v.x, v.y - 60, '💥 COLLAPSE', hex(MAG.gold), 14);
      if (Phaser.Math.Distance.Between(v.x, v.y, victim.x, victim.y) <= 150) {
        float(ctx, victim.x, victim.y - 24, '60', '#ffb3aa', 18);
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 1;
        const d = 30 + i * 18;
        lob(pools, { x: v.x, y: v.y }, v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * 0.8, elapsed);
      }
      readout.setText('60 damage and a 120px shove inside 150px — and it leaves four pools behind');
    });
  },
};

// ══ R — Magma Bloat ═══════════════════════════════════════════════════

export const bloat: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'R — the next hit is refused whole, and bursts for 30 in 96px',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const vessels: Vessel[] = [{ x: ctx.cx - 54, y: ctx.cy + 14, r: 26, p: 90, max: 250, kind: 'egg', seed: 3 }];
    field(ctx, [], vessels);
    const victim = { x: ctx.cx + 78, y: ctx.cy - 4 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);

    // The 96px burst radius, shown while the charge is being held.
    const on = { bloated: false };
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      ring.clear();
      if (!on.bloated) return;
      ring.lineStyle(1.6, ctx.tint(MAG.gold), 0.28 + 0.12 * Math.sin(elapsed / 160));
      ring.strokeCircle(ctx.cx, ctx.cy, 96);
    });

    ctx.at(500, () => {
      on.bloated = true;
      av.play('flex'); molten(av)?.setVenting(true);
      ctx.capture(() => {
        fx.shock(ctx.cx, ctx.cy, 10, 44, MAG.gold, 420);
        fx.ember(ctx.cx, ctx.cy - 6, 10, 30, 600);
      });
      float(ctx, ctx.cx, ctx.cy - 48, '🫧 BLOATED', hex(MAG.gold), 12);
      readout.setText('10 seconds of carrying a charge instead of a shield');
    });
    ctx.at(2600, () => {
      float(ctx, ctx.cx + 40, ctx.cy - 30, '💢 90 incoming', '#ff6b5c', 11);
      readout.setText('anything at all touches you — any size, no cap, no partial absorb');
    });
    ctx.at(3000, () => {
      on.bloated = false;
      molten(av)?.setVenting(false);
      ctx.capture(() => {
        fx.erupt(ctx.cx, ctx.cy, 96 * 0.8, MAG.lava);
        fx.shock(ctx.cx, ctx.cy, 16, 96, MAG.gold, 520);
      });
      float(ctx, ctx.cx, ctx.cy - 50, '💥 BLOCKED', hex(MAG.gold), 14);
      float(ctx, victim.x, victim.y - 24, '30', '#ffb3aa', 15);
      vessels[0].p += 25;
      float(ctx, vessels[0].x, vessels[0].y - 48, '+25 pressure', hex(MAG.scaleLit), 11);
      readout.setText('the whole hit refused, 30 back in a 96px ring, and 25 into your own egg');
    });
    ctx.at(5200, () => readout.setText('it intercepts before shields and armour — the answer to one huge hit, not to chip'));
    ctx.at(7000, () => readout.setText('8s cooldown on a 10s window: it can very nearly be kept up permanently'));
  },
};

// ══ F — Magma Fist ════════════════════════════════════════════════════

export const fist: PreviewScript = {
  duration: 13000,
  scale: 0.83,
  bodyTexture: BODY,
  caption: 'F — flick across for a 15-damage slap, drive down the arm for a 35-damage punch',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    molten(av)?.setVenting(true);
    const vessels: Vessel[] = [{ x: ctx.cx + 210, y: ctx.cy + 40, r: 26, p: 20, max: 250, kind: 'egg', seed: 11 }];
    field(ctx, [], vessels);
    const victim = { x: ctx.cx + 150, y: ctx.cy - 20 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);

    // The cursor the fist chases, and the fist chasing it at the kit's own follow rate.
    const cur = { x: ctx.cx + 90, y: ctx.cy };
    const f = { x: ctx.cx, y: ctx.cy, speed: 0, dx: 1, dy: 0, clench: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      let tx = cur.x, ty = cur.y;
      const reach = Phaser.Math.Distance.Between(ctx.cx, ctx.cy, tx, ty);
      if (reach > 262) {
        const a = Math.atan2(ty - ctx.cy, tx - ctx.cx);
        tx = ctx.cx + Math.cos(a) * 262; ty = ctx.cy + Math.sin(a) * 262;
      }
      const px = f.x, py = f.y;
      const k = Math.min(1, 22 * dt);
      f.x += (tx - f.x) * k; f.y += (ty - f.y) * k;
      const mx = f.x - px, my = f.y - py;
      const raw = dt > 0 ? Math.hypot(mx, my) / dt : 0;
      f.speed = Math.max(raw, f.speed * Math.exp(-dt * 8));
      if (raw > 140) {
        const inv = 1 / Math.max(1e-4, Math.hypot(mx, my));
        f.dx = mx * inv; f.dy = my * inv;
      }
      f.clench += ((f.speed > 520 * 0.6 ? 1 : 0) - f.clench) * Math.min(1, dt * 8);

      g.clear();
      const t = elapsed / 1000;
      const ang = Math.atan2(f.y - ctx.cy, f.x - ctx.cx);
      magmaArm(g, ctx.tint, ctx.cx, ctx.cy, f.x, f.y, 7.5, t, 13, 1);
      magmaFist(g, ctx.tint, f.x, f.y, ang, 1 + f.clench * 0.16, f.clench, t, 21,
        MAG.lava, MAG.basalt, 1);
      if (f.speed > 520 * 0.7) {
        const s = Phaser.Math.Clamp((f.speed - 520 * 0.7) / 520, 0, 1);
        g.lineStyle(6 * s + 1, ctx.tint(MAG.gold), 0.4 * s);
        g.lineBetween(f.x, f.y, f.x - f.dx * 34 * s, f.y - f.dy * 34 * s);
      }
      // The classifier, read against the arm exactly as the kit reads it.
      const ax = f.x - ctx.cx, ay = f.y - ctx.cy;
      const alen = Math.hypot(ax, ay) || 1;
      const radial = (f.dx * ax + f.dy * ay) / alen;
      gauge.setText(`fist ${Math.round(f.speed)} px/s   ·   along the arm ${(radial * 100).toFixed(0)}%`
        + `   ·   ${f.speed >= 560 && radial >= 0.55 ? 'PUNCH' : f.speed >= 520 && Math.abs(radial) < 0.55 ? 'SLAP' : '—'}`);
    });
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    ctx.at(300, () => {
      ctx.capture(() => fx.erupt(ctx.cx, ctx.cy, 46, MAG.magma));
      float(ctx, ctx.cx, ctx.cy - 52, '👊 MAGMA FIST', hex(MAG.magma), 12);
      readout.setText('a limb, not a button — 262px of reach, and it goes where the cursor goes');
    });
    // A flick across them: tangential motion, so it reads as a slap.
    ctx.at(1600, () => readout.setText('flicked sideways across them — motion across the arm'));
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 1800 || elapsed > 2100) return;
      cur.x = victim.x + 90; cur.y = victim.y;
    });
    ctx.at(1750, () => { cur.x = victim.x - 90; cur.y = victim.y; });
    ctx.at(2050, () => {
      ctx.capture(() => fx.splat(victim.x, victim.y, 34));
      float(ctx, victim.x, victim.y - 40, '🖐️ SLAP', hex(MAG.magma), 12);
      float(ctx, victim.x, victim.y - 22, '15', '#ffb3aa', 15);
      readout.setText('15 damage, and a 190px shove *along the swing* — a backhand, not a push');
    });
    // Wind back down the arm, then drive out: radial motion, so it reads as a punch.
    ctx.at(3600, () => { cur.x = ctx.cx + 40; cur.y = ctx.cy - 8; readout.setText('winding back down the arm…'); });
    ctx.at(4400, () => { cur.x = victim.x + 30; cur.y = victim.y; });
    ctx.at(4620, () => {
      ctx.capture(() => fx.erupt(victim.x, victim.y, 46, MAG.gold));
      float(ctx, victim.x, victim.y - 40, '👊 PUNCH', hex(MAG.gold), 13);
      float(ctx, victim.x, victim.y - 22, '35', '#ffb3aa', 18);
      readout.setText('35 damage down the arm — more than twice the slap, for the same fist');
    });
    // And the reason the fist exists: charging your own egg.
    ctx.at(6400, () => { cur.x = ctx.cx + 40; cur.y = ctx.cy; readout.setText('and the best charger in the kit is the same punch, aimed at your own egg'); });
    for (let i = 0; i < 4; i++) {
      ctx.at(7000 + i * 1000, () => { cur.x = vessels[0].x - 60; cur.y = vessels[0].y - 30; });
      ctx.at(7300 + i * 1000, () => {
        cur.x = vessels[0].x; cur.y = vessels[0].y;
        vessels[0].p = Math.min(250, vessels[0].p + 22);
        ctx.capture(() => fx.ember(vessels[0].x, vessels[0].y, 6, 22, 520, MAG.scaleLit));
        float(ctx, vessels[0].x, vessels[0].y - 46, '+22', hex(MAG.scaleLit), 12);
      });
    }
    ctx.at(11600, () => readout.setText('22 a punch, once per vessel per 500ms — about six seconds of punching hatches one'));
  },
};

// ══ Q — Dragon Kin ════════════════════════════════════════════════════

export const dragonKin: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Q — 250 pressure out of your own output buys 20s of −20% taken, +20% speed and breath',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const rig = molten(av);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [];
    field(ctx, pools, vessels);
    const victim = { x: ctx.cx + 170, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c07dff', 11);
    const egg: Vessel = { x: ctx.cx + 70, y: ctx.cy + 30, r: 26, p: 0, max: 250, kind: 'egg', seed: 5 };

    ctx.at(300, () => {
      vessels.push(egg);
      av.play('raise');
      ctx.capture(() => {
        fx.shock(egg.x, egg.y, 8, 90, MAG.scale, 620);
        fx.ember(egg.x, egg.y - 16, 14, 34, 900, MAG.scaleLit);
      });
      float(ctx, egg.x, egg.y - 60, '🥚 DRAGON KIN', hex(MAG.scaleLit), 12);
      readout.setText('250 pressure, 40 seconds to find it, and it vents nothing while you do');
    });
    // Filled the honest way: lava lobbed onto it, 16 a second per pool.
    for (let k = 0; k < 6; k++) {
      ctx.at(900 + k * 700, () => {
        av.play('sweep', ctx.aim); rig?.setVenting(true);
        for (let i = 0; i < 3; i++) {
          const a = (i / 2 - 0.5) * 0.9 + Math.atan2(egg.y - ctx.cy, egg.x - ctx.cx);
          lob(pools, { x: ctx.cx, y: ctx.cy },
            egg.x + Math.cos(a) * 16, egg.y + Math.sin(a) * 16, 900 + k * 700);
        }
      });
    }
    const hatched = { at: -1 };
    ctx.onFrame((dt, elapsed) => {
      if (hatched.at >= 0 || !vessels.length) return;
      let on = 0;
      for (const p of pools) {
        if (elapsed - p.born < 260) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, egg.x, egg.y) <= 27 + egg.r) on++;
      }
      // Compressed: the loop has 5 seconds, a real fill takes far longer. The rate is the kit's.
      if (on) egg.p = Math.min(250, egg.p + 16 * on * 3.4 * (dt / 1000));
      readout.setText(`${Math.round(egg.p)} / 250   —   16 a second per pool sitting on it`);
      if (egg.p < 250) return;
      hatched.at = elapsed;
      vessels.length = 0;
      rig?.setDragon(true);
      rig?.setVenting(false);
      ctx.capture(() => {
        fx.erupt(egg.x, egg.y, 110, MAG.scale);
        fx.ember(egg.x, egg.y, 24, 90, 1100, MAG.scaleLit);
        fx.shock(egg.x, egg.y, 20, 170, MAG.scaleLit, 700);
        fx.shock(ctx.cx, ctx.cy, 12, 96, MAG.scale, 620);
      });
      float(ctx, ctx.cx, ctx.cy - 56, '🐉 DRAGON KIN', hex(MAG.scaleLit), 14);
      readout.setText('20 seconds: damage taken ×0.8, move speed ×1.2, and the click is fire');
    });

    // Dragon Breath: the real cone, on the real 0.9s clock.
    const breath = { until: -1, tick: 0, dealt: 0 };
    const cone = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      cone.clear();
      if (elapsed > breath.until) return;
      const left = (breath.until - elapsed) / 900;
      const grow = Phaser.Math.Clamp((1 - left) * 4, 0, 1) * Phaser.Math.Clamp(left * 3, 0, 1);
      breathCone(cone, ctx.tint,
        ctx.cx + Math.cos(ctx.aim) * 14, ctx.cy + Math.sin(ctx.aim) * 14, ctx.aim,
        210 * (0.5 + grow * 0.5), 0.44 * (0.4 + grow * 0.6),
        elapsed / 1000, 7, MAG.scaleLit, MAG.membrane, 0.55 + grow * 0.45);
      if (elapsed < breath.tick) return;
      breath.tick = elapsed + 180;
      breath.dealt += 14;
      float(ctx, victim.x, victim.y - 22, '14', '#ffb3aa', 12);
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(9200 + i * 1400, (): void => {
        if (hatched.at < 0) return;
        av.play('punch', ctx.aim);
        breath.until = 9200 + i * 1400 + 900;
        breath.tick = 0;
        float(ctx, ctx.cx, ctx.cy - 50, '🐉 BREATHE', hex(MAG.breath), 11);
      });
    }
    ctx.at(10400, () => readout.setText('14 damage every 180ms inside 210px — and 25 pressure a second into anything of yours in the fire'));
    ctx.at(13400, () => readout.setText('Plume is gone for the whole 20 seconds. Breath shares the click outright.'));
  },
};

// ══ PASSIVE — Pressure ════════════════════════════════════════════════

export const pressure: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Passive — every attack you own charges your own summons instead of a person',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [
      { x: ctx.cx + 110, y: ctx.cy - 18, r: 30, p: 0, max: 100, kind: 'volcano', seed: 2 },
      { x: ctx.cx + 220, y: ctx.cy + 34, r: 26, p: 0, max: 250, kind: 'egg', seed: 9 },
    ];
    field(ctx, pools, vessels);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ff8b22', 10);
    ctx.onFrame(() => tally.setText(
      `volcano ${Math.round(vessels[0].p)} / 100     ·     egg ${Math.round(vessels[1].p)} / 250`));

    const bump = (v: Vessel, n: number, why: string, colour: number): void => {
      v.p = Math.min(v.max, v.p + n);
      ctx.capture(() => fx.ember(v.x, v.y - v.r * 0.5, 4, 16, 460, colour));
      float(ctx, v.x, v.y - v.r * 2.4, `+${n}`, hex(colour), 12);
      readout.setText(why);
    };

    ctx.at(400, () => readout.setText('a pool of lava sitting on it: 16 a second, for the pool\'s whole 6-second life'));
    ctx.at(700, () => {
      av.play('sweep', ctx.aim);
      lob(pools, { x: ctx.cx, y: ctx.cy }, vessels[0].x, vessels[0].y, 700);
    });
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 960 || elapsed > 4000) return;
      vessels[0].p = Math.min(100, vessels[0].p + 16 * (dt / 1000));
    });
    ctx.at(4400, () => bump(vessels[0], 10, 'a thrown rock: 10, and the rock is spent doing it', MAG.ember));
    ctx.at(5600, () => bump(vessels[0], 8, 'a slap of the fist: 8', MAG.magma));
    ctx.at(6800, () => bump(vessels[1], 22, 'a punch: 22 — the best charge in the kit', MAG.scaleLit));
    ctx.at(8000, () => bump(vessels[1], 25, 'a popped Bloat: 25 to everything of yours inside 96px', MAG.gold));
    ctx.at(9200, () => {
      bump(vessels[1], 40, 'a volcano collapsing: 40 to every other vessel inside its 150px blast', MAG.gold);
      ctx.capture(() => fx.shock(vessels[0].x, vessels[0].y, 30, 150, MAG.gold, 720));
    });
    ctx.at(10600, () => bump(vessels[1], 25, 'dragon breath: 25 a second to anything of yours in the fire', MAG.breath));
    ctx.at(12000, () => readout.setText('a full vessel stops accepting — anything spent on a topped-out one is simply wasted'));
  },
};

// ══ PASSIVE — Lava On The Floor ═══════════════════════════════════════

export const lavaOnTheFloor: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Passive — 34 a second, 6 seconds of life, and overlapping pools never stack',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    field(ctx, pools, []);
    const victim = { x: ctx.cx + 110, y: ctx.cy };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    const drop = (at: number, x: number, y: number): void => ctx.at(at, () => {
      av.play('sweep', ctx.aim);
      lob(pools, { x: ctx.cx, y: ctx.cy }, x, y, at);
      ctx.scene.time.delayedCall(260, () => ctx.capture(() => fx.splat(x, y, 24)));
    });

    ctx.at(300, () => readout.setText('one pool: 34 a second while they stand in it'));
    drop(600, victim.x, victim.y);
    ctx.at(3000, () => readout.setText('three more, stacked on the same tile'));
    drop(3200, victim.x - 6, victim.y + 4);
    drop(3500, victim.x + 5, victim.y - 5);
    drop(3800, victim.x, victim.y + 8);
    ctx.at(4600, () => readout.setText('still 34 a second — burn is the maximum across every pool, never the sum'));
    ctx.at(6600, () => readout.setText('spread them instead: the value is the ground they deny, not the pile'));
    drop(6900, victim.x + 70, victim.y - 30);
    drop(7100, victim.x + 100, victim.y + 20);

    // The real tick, so the counter on screen is the ability rather than a caption.
    const burn = { total: 0, acc: 0 };
    ctx.onFrame((dt, elapsed) => {
      const inLava = pools.some((p) => elapsed - p.born >= 260 && elapsed - p.born <= 6260
        && Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= 27);
      if (!inLava) { burn.acc = 0; tally.setText(`out of it — the part-tick is discarded, not banked   ·   ${burn.total} total`); return; }
      burn.acc += 34 * (dt / 1000);
      while (burn.acc >= 1) { burn.acc -= 1; burn.total += 1; }
      tally.setText(`burning: ${burn.total} total`);
    });
    ctx.at(9600, () => readout.setText('and the crust skins over as they cool — grey means it is nearly finished'));
  },
};
