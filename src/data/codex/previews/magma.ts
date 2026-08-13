import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  MAG, MagmaAvatar, MagmaFx, breathCone, dragonEgg, lavaRock, magmaArm, magmaFist, magmaSaw,
  moltenPool, obsidianCoat, pressureGauge, volcanoCone,
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

// ══ F — Magma Jet ══════════════════════════════════════

export const jet: PreviewScript = {
  duration: 13000,
  scale: 0.83,
  bodyTexture: BODY,
  caption: 'F — hold for a cone of flame at the cursor and 330 px/s of thrust the other way',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    molten(av)?.setVenting(true);
    const vessels: Vessel[] = [{ x: ctx.cx + 170, y: ctx.cy + 50, r: 26, p: 20, max: 250, kind: 'egg', seed: 11 }];
    field(ctx, [], vessels);
    const victim = { x: ctx.cx + 130, y: ctx.cy - 20 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);

    // Where the flame is pointed, whether the throttle is open, and how much fuel is left.
    const jetState = { aimX: victim.x, aimY: victim.y, on: false, spent: 0, bodyX: ctx.cx, bodyY: ctx.cy };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      if (jetState.on && jetState.spent < 3000) {
        jetState.spent += delta;
        const ang = Math.atan2(jetState.aimY - jetState.bodyY, jetState.aimX - jetState.bodyX);
        // The thrust: the caster is pushed straight back down the line they are burning along.
        jetState.bodyX -= Math.cos(ang) * 330 * dt * 0.45;
        jetState.bodyY -= Math.sin(ang) * 330 * dt * 0.45;
        av.setFacing(ang);
        const left = Phaser.Math.Clamp(1 - jetState.spent / 3000, 0, 1);
        breathCone(g, ctx.tint,
          jetState.bodyX + Math.cos(ang) * 12, jetState.bodyY + Math.sin(ang) * 12, ang,
          175, 0.42, t, 3, MAG.lava, MAG.magma, 0.6 + left * 0.4);
        // The exhaust out of the back, which is the visual reason the caster is retreating.
        for (let i = 0; i < 3; i++) {
          const a = ang + Math.PI + (i - 1) * 0.28;
          const len = 20 + Math.sin(t * 22 + i * 2) * 7;
          g.fillStyle(ctx.tint(i === 1 ? MAG.white : MAG.gold), 0.55 * left);
          g.fillPoints([
            new Phaser.Geom.Point(jetState.bodyX + Math.cos(a - 0.18) * 8, jetState.bodyY + Math.sin(a - 0.18) * 8),
            new Phaser.Geom.Point(jetState.bodyX + Math.cos(a) * len, jetState.bodyY + Math.sin(a) * len),
            new Phaser.Geom.Point(jetState.bodyX + Math.cos(a + 0.18) * 8, jetState.bodyY + Math.sin(a + 0.18) * 8),
          ], true);
        }
      }
      av.update(delta, jetState.bodyX, jetState.bodyY, 1);
      gauge.setText(`fuel ${((3000 - jetState.spent) / 1000).toFixed(1)}s`
        + `   ·   ${jetState.on ? 'THROTTLE OPEN' : 'closed'}`);
    });

    ctx.at(300, () => {
      ctx.capture(() => fx.erupt(ctx.cx, ctx.cy, 40, MAG.lava));
      float(ctx, ctx.cx, ctx.cy - 52, '🚀 MAGMA JET', hex(MAG.lava), 12);
      readout.setText('held, not pressed — three seconds of fuel, spent only while F is down');
    });

    // Burn the dummy, and be shoved away from it while doing so.
    ctx.at(900, () => { jetState.on = true; jetState.aimX = victim.x; jetState.aimY = victim.y; });
    for (let i = 0; i < 6; i++) {
      ctx.at(1000 + i * 150, () => {
        float(ctx, victim.x + (i % 2 ? 10 : -10), victim.y - 26 - i * 3, '12', '#ffb3aa', 13);
      });
    }
    ctx.at(1200, () => readout.setText('12 every 0.15s in the cone — and 330 px/s carrying you the other way'));
    ctx.at(1900, () => { jetState.on = false; readout.setText('let go and it stops, whatever fuel is left'); });

    // Then the reason it exists: pointing it at your own egg is the fastest charge in the kit.
    ctx.at(3400, () => {
      jetState.bodyX = ctx.cx - 40; jetState.bodyY = ctx.cy - 30;
      readout.setText('and the best charger in the kit is the same jet, aimed at your own egg');
    });
    ctx.at(4200, () => { jetState.on = true; jetState.aimX = vessels[0].x; jetState.aimY = vessels[0].y; });
    for (let i = 0; i < 8; i++) {
      ctx.at(4400 + i * 200, () => {
        vessels[0].p = Math.min(250, vessels[0].p + 5.2);
        ctx.capture(() => fx.ember(vessels[0].x, vessels[0].y, 3, 18, 420, MAG.scaleLit));
      });
    }
    ctx.at(4600, () => readout.setText('26 pressure a second, for as long as the flame is on it'));
    ctx.at(6100, () => { jetState.on = false; });
    ctx.at(7200, () => readout.setText('the thrust is written over your movement — while the jet is open, aim is the steering'));
    ctx.at(10000, () => readout.setText('with Jet Slam (F+), riding it into a wall brings a dozen rocks down around you'));
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

// ══ MASTERY — Obsidian Coat ═══════════════════════════════════════════

export const masteryObsidianCoat: PreviewScript = {
  duration: 17000,
  scale: 0.85,
  bodyTexture: BODY,
  caption: 'Mastery passive — overfill a dying cone, stand in the collapse, wear the glass for 15s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [];
    field(ctx, pools, vessels);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#fff0c0', 10);

    // A cone already at 100 and already counting down — the passive only ever starts here.
    const v: Vessel = { x: ctx.cx + 108, y: ctx.cy + 4, r: 30, p: 100, max: 100, kind: 'volcano', seed: 4 };
    const state = { over: 0, sawFrom: -1, coatFrom: -1, power: 0 };

    // The saw held against it, which is how the overfill actually gets in: 30 a second.
    const tool = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt, elapsed) => {
      tool.clear();
      if (state.sawFrom < 0 || elapsed < state.sawFrom || state.over >= 250) return;
      const ang = Math.atan2(v.y - ctx.cy, v.x - ctx.cx);
      const heat = Phaser.Math.Clamp((elapsed - state.sawFrom) / 8000, 0, 1);
      magmaSaw(tool, ctx.tint, ctx.cx + Math.cos(ang) * 34, ctx.cy + Math.sin(ang) * 34, ang,
        (elapsed / 1000) * (2.6 + heat * 3.4), heat, 1, elapsed / 1000, 11);
      // Compressed: 250 overfill at the real 30/s is over eight seconds of holding.
      state.over = Math.min(250, state.over + 30 * 2.6 * (dt / 1000));
      if (Math.random() < 0.3) {
        ctx.capture(() => fx.ember(v.x + (Math.random() - 0.5) * 30, v.y - 16, 1, 10, 420, MAG.white));
      }
    });

    ctx.at(200, () => {
      vessels.push(v);
      ctx.capture(() => fx.erupt(v.x, v.y - v.r, 60, MAG.gold));
      float(ctx, v.x, v.y - 78, '🌋 CRITICAL', hex(MAG.white), 12);
      readout.setText('a critical cone normally refuses everything — five seconds and it is gone');
    });
    ctx.at(1500, () => {
      state.sawFrom = 1500;
      readout.setText('mastery takes the lid off: everything past 100 banks as overfill');
    });
    ctx.onFrame((_dt, elapsed) => {
      if (state.coatFrom >= 0) return;
      tally.setText(elapsed < 1500 ? 'overfill  0 / 250'
        : `overfill  ${Math.round(state.over)} / 250   —   30 a second, held against it`);
    });
    ctx.at(4200, () => readout.setText('and the blast grows with it: +0.7 damage and +0.9px of radius per point'));

    // The collapse, with the caster deliberately standing inside it.
    ctx.at(6400, () => {
      state.sawFrom = -1;
      const radius = 150 + state.over * 0.9;
      vessels.length = 0;
      state.power = Phaser.Math.Clamp(state.over / 250, 0, 1);
      ctx.capture(() => {
        fx.erupt(v.x, v.y, radius * 0.7, MAG.magma);
        fx.shock(v.x, v.y, 30, radius, MAG.gold, 720);
        fx.shock(v.x, v.y, 22, radius * 1.15, MAG.white, 820);
        fx.smoke(v.x, v.y - 20, 12, 1400);
      });
      float(ctx, v.x, v.y - 60, `💥 SUPERCRITICAL ${Math.round(60 + state.over * 0.7)}`, hex(MAG.gold), 14);
      readout.setText(`${Math.round(radius)}px of blast — and the caster is standing in it on purpose`);
    });
    ctx.at(7000, () => {
      state.coatFrom = 7000;
      ctx.capture(() => {
        fx.glass(ctx.cx, ctx.cy, 26, 20);
        fx.ember(ctx.cx, ctx.cy - 6, 8, 30, 640, MAG.gold);
      });
      float(ctx, ctx.cx, ctx.cy - 52, `🪨 OBSIDIAN ${Math.round(10 + state.power * 90)}%`, hex(MAG.gold), 13);
      readout.setText('the glass sets on whoever was inside the blast');
    });

    // The coat itself, painted with the kit's own painter for the rest of the loop.
    const coatG = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      coatG.clear();
      if (state.coatFrom < 0 || elapsed - state.coatFrom > 15000) return;
      obsidianCoat(coatG, ctx.tint, ctx.cx, ctx.cy, state.power, elapsed / 1000, 1);
      const left = (15000 - (elapsed - state.coatFrom)) / 1000;
      tally.setText(`+${Math.round((0.10 + 0.35 * state.power) * 100)}% damage dealt`
        + `   ·   −${Math.round((0.08 + 0.22 * state.power) * 100)}% taken`
        + `   ·   +${Math.round(1 + 3 * state.power)} globs on click`
        + `   ·   ${left.toFixed(1)}s`);
    });

    // …and what those extra globs actually look like coming out of the click.
    ctx.at(9400, () => readout.setText('and the click throws a wider fan for as long as it is on'));
    for (let k = 0; k < 2; k++) {
      ctx.at(9800 + k * 2600, () => {
        av.play('sweep', ctx.aim);
        molten(av)?.setVenting(true);
        const n = 5 + Math.round(1 + 3 * state.power);
        for (let i = 0; i < n; i++) {
          const a = ctx.aim + ((i / (n - 1)) - 0.5) * 2 * 0.62;
          const d = 38 + 80 * (0.35 + ((i * 41) % 65) / 100);
          lob(pools, { x: ctx.cx, y: ctx.cy },
            ctx.cx + Math.cos(a) * d, ctx.cy + Math.sin(a) * d, 9800 + k * 2600);
        }
        float(ctx, ctx.cx, ctx.cy - 46, `${n} GLOBS`, hex(MAG.lava), 11);
      });
    }
    ctx.at(14200, () => {
      molten(av)?.setVenting(false);
      readout.setText('a second collapse refreshes the 15s and keeps the better coat — thin ones never add up');
    });
  },
};

// ══ MASTERY — Magma Saw ═══════════════════════════════════════════════

export const masteryMagmaSaw: PreviewScript = {
  duration: 17000,
  scale: 0.85,
  bodyTexture: BODY,
  caption: 'Mastery — 20 a second climbing to 80, and at 8 seconds it detonates in your hands',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 96, y: ctx.cy - 2 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#fff0c0', 10);

    // One record, driving both saws in the loop. `from < 0` means there is no saw out.
    const saw = { revFrom: -1, from: -1, planMs: 8000, tick: 0, dealt: 0 };
    const tool = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((_dt, elapsed) => {
      tool.clear();
      const ang = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);

      // Revving: held tight to the body, shorter bar, no heat on it yet.
      if (saw.from < 0 && saw.revFrom >= 0) {
        const rev = Phaser.Math.Clamp((elapsed - saw.revFrom) / 1600, 0, 1);
        magmaSaw(tool, ctx.tint, ctx.cx + Math.cos(ang) * 17, ctx.cy + Math.sin(ang) * 17, ang,
          (elapsed / 1000) * (1.4 + rev * 1.6), 0, rev, elapsed / 1000, 11, 0.55 + rev * 0.45);
        tally.setText(`rev  ${(rev * 100).toFixed(0)}%   —   runtime ${((2500 + rev * 5500) / 1000).toFixed(1)}s`);
        return;
      }
      if (saw.from < 0) return;

      const run = elapsed - saw.from;
      if (run >= saw.planMs) { saw.from = -1; return; }
      const heat = Phaser.Math.Clamp(run / 8000, 0, 1);
      magmaSaw(tool, ctx.tint, ctx.cx + Math.cos(ang) * 34, ctx.cy + Math.sin(ang) * 34, ang,
        (elapsed / 1000) * (2.6 + heat * 3.4), heat, 1, elapsed / 1000, 11);

      // The real tick: one point every 50ms, one more per bite every 2 seconds.
      if (elapsed >= saw.tick) {
        saw.tick = elapsed + 50;
        const bite = Math.min(4, 1 + Math.floor(run / 2000));
        saw.dealt += bite;
        // A float every hit would be a wall of numbers, so one in six speaks for the rest.
        if (Math.random() < 0.17) {
          float(ctx, victim.x + (Math.random() - 0.5) * 22, victim.y - 24, `${bite}`, '#ffb3aa', 11);
        }
      }
      const bite = Math.min(4, 1 + Math.floor(run / 2000));
      tally.setText(`${bite} every 0.05s  =  ${bite * 20} a second`
        + `   ·   ${saw.dealt} dealt   ·   ${((8000 - run) / 1000).toFixed(1)}s to detonation`);
    });

    // ── The long saw: wound all the way up, and ridden into the blast ──
    ctx.at(200, () => {
      saw.revFrom = 200;
      readout.setText('hold the key to rev — the charge buys runtime and nothing else');
    });
    ctx.at(1800, () => {
      saw.revFrom = -1;
      saw.from = 1800;
      saw.planMs = 8000;
      saw.tick = 0;
      ctx.capture(() => fx.ember(ctx.cx, ctx.cy, 8, 26, 460, MAG.gold));
      float(ctx, ctx.cx, ctx.cy - 52, '🪚 MAGMA SAW', hex(MAG.gold), 12);
      readout.setText('a full rev is the full 8 seconds — which is also exactly when it goes off');
    });
    ctx.at(3900, () => readout.setText('two seconds in the bite doubles: 40 a second, and the bar starts to whiten'));
    ctx.at(5900, () => readout.setText('four seconds: 60 a second'));
    ctx.at(7900, () => readout.setText('six: 80 a second, and the bar is red. This is where you decide.'));
    ctx.at(9800, () => {
      saw.from = -1;
      ctx.capture(() => {
        fx.erupt(ctx.cx, ctx.cy, 150 * 0.75, MAG.magma);
        fx.shock(ctx.cx, ctx.cy, 24, 150, MAG.white, 720);
        fx.smoke(ctx.cx, ctx.cy, 10, 1200);
      });
      float(ctx, victim.x, victim.y - 44, '🪚 35', hex(MAG.magma), 14);
      float(ctx, ctx.cx, ctx.cy - 56, '💥 TOO HOT  −35', hex(MAG.white), 14);
      readout.setText('35 inside 150px to everybody, the pilot included, and everyone thrown clear');
      tally.setText('them: 240px of knockback   ·   you: 190px, back down the line you were cutting');
    });
    // Thrown clear — the dummy is a plain record, so the shove is just its position moving.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 9800 || elapsed > 10100) return;
      victim.x += 240 * 3.4 * (dt / 1000);
    });

    // ── The short one: the same saw, motor cut before it can bite back ──
    ctx.at(11800, () => {
      victim.x = ctx.cx + 96;
      saw.revFrom = 11800;
      readout.setText('or wind in a short one — a tap runs 2.5 seconds and can never reach the blast');
    });
    ctx.at(12400, () => {
      saw.revFrom = -1;
      saw.from = 12400;
      saw.planMs = 8000;
      saw.tick = 0;
      saw.dealt = 0;
      float(ctx, ctx.cx, ctx.cy - 52, '🪚 MAGMA SAW', hex(MAG.gold), 12);
    });
    ctx.at(14800, () => {
      saw.from = -1;
      ctx.capture(() => fx.smoke(ctx.cx, ctx.cy, 5, 640));
      float(ctx, ctx.cx, ctx.cy - 48, '🪚 MOTOR CUT', '#8a8a8a', 12);
      readout.setText('and pressing the key again cuts the motor at any moment — that is the whole ability');
      tally.setText('14 second cooldown, counted from the moment the saw starts');
    });
  },
};
