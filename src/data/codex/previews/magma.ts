import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  MAG, MagmaAvatar, MagmaFx, breathCone, cannonball, lavaRock, magmaSaw, moltenPool,
  obsidianCoat, pirateShip, pirateSpirit, pressureGauge, volcanoCone,
} from '../../../elements/kits/MagmaVisuals';

/**
 * Magma's showcases.
 *
 * Magma puts nothing in the world as a sprite — pools, rocks, volcanoes, the ship and the crew
 * are all data the kit repaints into Graphics layers, so every loop here keeps the same little
 * records the kit keeps and paints them with the real painters: `moltenPool`, `volcanoCone`,
 * `pressureGauge`, `lavaRock`, `breathCone`, `pirateShip`, `cannonball` and `pirateSpirit`.
 * One-shots go through a real `MagmaFx` with a sticky sink.
 *
 * `bodyTexture` is `elem-magma`: the basalt ball ArenaScene stages under the rig. The pirate's
 * hat, patch, sash, hook and cutlass are the `MagmaAvatar`'s, hung off that ball — so what the
 * loops stage is exactly the character the player sees in the arena.
 */

const BODY = 'elem-magma';

// ── Staging ───────────────────────────────────────────────────────────

interface Pool { x: number; y: number; born: number; fromX: number; fromY: number; r?: number; life?: number }
interface Vessel { x: number; y: number; r: number; p: number; max: number; seed: number }

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
 * their life, and the volcanoes standing in them with their gauges. Every loop wants this.
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
      const r = p.r ?? 27;
      const lifeMs = p.life ?? 6000;
      const flight = p.r ? 0 : 260;
      const age = elapsed - p.born;
      if (age < flight) {
        // Still in the air: an arc, and the ring that says where it is going to land.
        const f = age / flight;
        const x = Phaser.Math.Linear(p.fromX, p.x, f);
        const y = Phaser.Math.Linear(p.fromY, p.y, f) - Math.sin(f * Math.PI) * 44;
        objs.fillStyle(ctx.tint(MAG.magma), 0.3); objs.fillCircle(x, y, 13);
        objs.fillStyle(ctx.tint(MAG.lava), 1); objs.fillCircle(x, y, 8);
        objs.fillStyle(ctx.tint(MAG.white), 0.8); objs.fillCircle(x - 2, y - 2, 3.2);
        objs.lineStyle(1.6, ctx.tint(MAG.ember), 0.35 + f * 0.35);
        objs.strokeEllipse(p.x, p.y, r * 1.7 * (0.5 + f * 0.5), r * 1.15 * (0.5 + f * 0.5));
        continue;
      }
      const life = age - flight;
      if (life > lifeMs) { pools.splice(i, 1); continue; }
      // The crust skins over as it cools — the warning that it is nearly finished.
      const heat = Phaser.Math.Clamp(1 - (life / lifeMs) * 1.15, 0.05, 1);
      const fade = Phaser.Math.Clamp((lifeMs - life) / Math.min(900, lifeMs * 0.5), 0, 1);
      moltenPool(ground, ctx.tint, p.x, p.y, r, heat, t, p.born % 999, fade);
    }
    for (const v of vessels) {
      const ratio = v.p / v.max;
      volcanoCone(objs, ctx.tint, v.x, v.y + v.r * 0.5, v.r, ratio, t, v.seed);
      pressureGauge(gauges, ctx.tint, v.x, v.y - v.r * 2.1, 48, ratio, MAG.magma);
    }
  });
}

/** Lob one pool, exactly as `firePlume` and `ventPool` do. */
function lob(pools: Pool[], from: { x: number; y: number }, x: number, y: number, born: number): void {
  pools.push({ x, y, born, fromX: from.x, fromY: from.y });
}

/** The real recoil: 240px eased out over 380ms, exactly as `updateFly` plays it. */
function recoil(from: { x: number; y: number }, ang: number, dist: number, u: number): { x: number; y: number } {
  const ease = 1 - (1 - u) * (1 - u);
  return { x: from.x + Math.cos(ang) * dist * ease, y: from.y + Math.sin(ang) * dist * ease };
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
    ctx.at(8200, () => readout.setText('at the helm of the ship this click is six cannons instead — see Molten Mutiny'));
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
    const v: Vessel = { ...site, r: 30, p: 0, max: 100, seed: 7 };

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
    const vessels: Vessel[] = [{ x: ctx.cx - 54, y: ctx.cy + 14, r: 30, p: 40, max: 100, seed: 3 }];
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
      float(ctx, vessels[0].x, vessels[0].y - 70, '+25 pressure', hex(MAG.ember), 11);
      readout.setText('the whole hit refused, 30 back in a 96px ring, and 25 into your own volcano');
    });
    ctx.at(5200, () => readout.setText('it intercepts before shields and armour — the answer to one huge hit, not to chip'));
    ctx.at(7000, () => readout.setText('8s cooldown on a 10s window: it can very nearly be kept up permanently'));
  },
};

// ══ F — Blunder-Boil ══════════════════════════════════════════════════

export const blunderBoil: PreviewScript = {
  duration: 13000,
  scale: 0.83,
  bodyTexture: BODY,
  caption: 'F — a cone of lava for 15 at the cursor, and the recoil throws you 240px the other way',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint), { manual: true });
    const victim = { x: ctx.cx + 110, y: ctx.cy - 10 };
    dummyAt(ctx, victim);
    const vessels: Vessel[] = [{ x: ctx.cx - 150, y: ctx.cy + 40, r: 30, p: 30, max: 100, seed: 11 }];
    field(ctx, [], vessels);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    // The pirate, the shot he last fired, and the two charges.
    const st = { x: ctx.cx, y: ctx.cy, charges: 2, reloadAt: -1, shotAt: -1, shotX: 0, shotY: 0, shotAng: 0, flyAng: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    const fire = (at: number, tx: number, ty: number): void => ctx.at(at, () => {
      if (st.charges <= 0) return;
      if (st.charges === 2) st.reloadAt = at + 3000;
      st.charges--;
      st.shotAt = at;
      st.shotX = st.x; st.shotY = st.y;
      st.shotAng = Math.atan2(ty - st.y, tx - st.x);
      st.flyAng = st.shotAng + Math.PI;
      av.play('punch', st.shotAng);
      molten(av)?.setVenting(true);
      ctx.capture(() => {
        fx.erupt(st.x + Math.cos(st.shotAng) * 16, st.y + Math.sin(st.shotAng) * 16, 36, MAG.lava);
        fx.shock(st.x, st.y, 10, 54, MAG.gold, 380);
        fx.smoke(st.x, st.y, 5, 700);
      });
      float(ctx, st.x, st.y - 52, '💥 BLUNDER-BOIL', hex(MAG.lava), 12);
      // The cone: 160px, 0.5 rad either side, widening a touch with distance.
      const d = Phaser.Math.Distance.Between(st.x, st.y, victim.x, victim.y);
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(victim.y - st.y, victim.x - st.x) - st.shotAng));
      if (d <= 160 && off <= 0.5 + 14 / Math.max(24, d)) float(ctx, victim.x, victim.y - 26, '15', '#ffb3aa', 15);
      for (const v of vessels) {
        const dv = Phaser.Math.Distance.Between(st.x + Math.cos(st.shotAng) * 88, st.y + Math.sin(st.shotAng) * 88, v.x, v.y);
        if (dv <= 80 + v.r) { v.p = Math.min(100, v.p + 15); float(ctx, v.x, v.y - 70, '+15 pressure', hex(MAG.ember), 11); }
      }
    });

    ctx.onFrame((delta, elapsed) => {
      g.clear();
      // Reload, one charge at a time.
      if (st.charges < 2 && st.reloadAt >= 0 && elapsed >= st.reloadAt) {
        st.charges++;
        if (st.charges < 2) st.reloadAt = elapsed + 3000;
      }
      // The recoil, played out as position over 380ms.
      if (st.shotAt >= 0 && elapsed - st.shotAt <= 380) {
        const u = (elapsed - st.shotAt) / 380;
        const p = recoil({ x: st.shotX, y: st.shotY }, st.flyAng, 240, u);
        st.x = Phaser.Math.Clamp(p.x, 40, ctx.w - 40);
        st.y = Phaser.Math.Clamp(p.y, 40, ctx.h - 40);
        const fade = Phaser.Math.Clamp(1 - u * 1.6, 0, 1);
        if (fade > 0) {
          breathCone(g, ctx.tint, st.shotX + Math.cos(st.shotAng) * 12, st.shotY + Math.sin(st.shotAng) * 12, st.shotAng,
            160 * (0.7 + u * 0.3), 0.5 * (0.8 + u * 0.3), elapsed / 1000, 3, MAG.lava, MAG.magma, fade);
        }
        for (let i = 0; i < 3; i++) {
          const a = st.flyAng + Math.PI + (i - 1) * 0.3;
          const len = 16 + Math.sin(elapsed / 45 + i * 2) * 6;
          g.fillStyle(ctx.tint(i === 1 ? MAG.white : MAG.gold), 0.5 * (1 - u));
          g.fillPoints([
            new Phaser.Geom.Point(st.x + Math.cos(a - 0.2) * 8, st.y + Math.sin(a - 0.2) * 8),
            new Phaser.Geom.Point(st.x + Math.cos(a) * len, st.y + Math.sin(a) * len),
            new Phaser.Geom.Point(st.x + Math.cos(a + 0.2) * 8, st.y + Math.sin(a + 0.2) * 8),
          ], true);
        }
      } else if (st.shotAt >= 0) {
        molten(av)?.setVenting(false);
      }
      av.setFacing(Math.atan2(victim.y - st.y, victim.x - st.x));
      av.update(delta, st.x, st.y, 1);
      const reload = st.charges < 2 && st.reloadAt >= 0 ? `   ·   next in ${Math.max(0, (st.reloadAt - elapsed) / 1000).toFixed(1)}s` : '';
      gauge.setText(`charges ${'●'.repeat(st.charges)}${'○'.repeat(2 - st.charges)}${reload}`);
    });

    ctx.at(300, () => readout.setText('two charges in the gun, three seconds each to come back'));
    fire(900, victim.x, victim.y);
    ctx.at(1400, () => readout.setText('15 to everything in a 160px cone — and the recoil carries you 240px the other way'));
    ctx.at(3200, () => readout.setText('aiming at them and getting away from them are the same press'));
    // The second charge: across its own volcano, which is also a step further back.
    ctx.at(4600, () => readout.setText('the second charge, across your own volcano: 15 pressure, and another step back'));
    fire(5200, vessels[0].x, vessels[0].y);
    ctx.at(7400, () => readout.setText('empty. One charge reloads at a time, three seconds each.'));
    ctx.at(9600, () => readout.setText('with Pressure Gauge (F+): a third charge, and a gun that gets hotter the longer it sits full'));
    ctx.at(11400, () => readout.setText('fired from the ship\'s deck, the recoil takes you over the side — the ship holds where it is'));
  },
};

// ══ Q — Molten Mutiny ═════════════════════════════════════════════════

export const moltenMutiny: PreviewScript = {
  duration: 17000,
  scale: 0.72,
  bodyTexture: BODY,
  caption: 'Q — the pendant keeps a fifth of what you deal; at 50 it wakes the ship',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint), { manual: true });
    const rig = molten(av);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [{ x: ctx.w * 0.62, y: ctx.cy + 40, r: 30, p: 20, max: 100, seed: 4 }];
    field(ctx, pools, vessels);
    const victim = { x: ctx.w * 0.74, y: ctx.cy - 30 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3b4a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    const st = {
      x: ctx.cx, y: ctx.cy, pendant: false, power: 0,
      ship: null as null | { x: number; y: number; heading: number; hp: number; mounted: boolean },
      aimX: victim.x, aimY: victim.y,
    };
    const balls: { x: number; y: number; vx: number; vy: number; born: number; seed: number }[] = [];
    const hull = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const rigG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));

    ctx.onFrame((delta, elapsed) => {
      hull.clear(); rigG.clear();
      const dt = delta / 1000;
      const t = elapsed / 1000;
      if (st.ship) {
        st.ship.hp -= 15 * dt;
        if (st.ship.mounted) {
          // Steered at the cursor at the kit's 115 px/s, holding off at 14px.
          const dx = st.aimX - st.ship.x, dy = st.aimY - st.ship.y;
          const d = Math.hypot(dx, dy);
          if (d > 14) {
            const step = Math.min(d, 115 * dt);
            st.ship.x += (dx / d) * step; st.ship.y += (dy / d) * step;
            st.ship.heading += Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - st.ship.heading) * Math.min(1, dt * 4);
          }
          st.x = st.ship.x; st.y = st.ship.y - 4;
        }
        pirateShip(hull, ctx.tint, st.ship.x, st.ship.y, st.ship.heading, t, st.ship.hp / 300, 7, 'hull');
        pirateShip(rigG, ctx.tint, st.ship.x, st.ship.y, st.ship.heading, t, st.ship.hp / 300, 7, 'rig');
        pressureGauge(rigG, ctx.tint, st.ship.x, st.ship.y - 58, 70, st.ship.hp / 300, MAG.gold);
        tally.setText(`hull ${Math.max(0, Math.round(st.ship.hp))} / 300   ·   −15 a second   ·   ${st.ship.mounted ? 'click = broadside · cursor steers · Space = over the side' : 'Space near it to board'}`);
      } else if (st.pendant) {
        tally.setText(`pendant ${Math.round(st.power)} / 50   ·   a fifth of every point you would deal`);
      }
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (elapsed - b.born > 1500 || b.x > ctx.w + 20) { balls.splice(i, 1); continue; }
        if (Phaser.Math.Distance.Between(b.x, b.y, victim.x, victim.y) <= 20) {
          float(ctx, victim.x + (Math.random() - 0.5) * 20, victim.y - 26, '26', '#ffb3aa', 13);
          ctx.capture(() => fx.erupt(b.x, b.y, 26, MAG.gold));
          balls.splice(i, 1); continue;
        }
        const v = vessels[0];
        if (v && v.p < 100 && Phaser.Math.Distance.Between(b.x, b.y, v.x, v.y) <= v.r + 8) {
          v.p = 100;
          ctx.capture(() => fx.erupt(v.x, v.y - v.r, 40, MAG.gold));
          float(ctx, v.x, v.y - 90, '💣 LIT', hex(MAG.gold), 12);
          balls.splice(i, 1); continue;
        }
        cannonball(rigG, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), t * 9 + b.seed, b.seed);
      }
      rig?.setPendant(st.pendant ? st.power / 50 : -1);
      rig?.setHelm(!!st.ship?.mounted);
      av.setFacing(Math.atan2(st.aimY - st.y, st.aimX - st.x));
      av.update(delta, st.x, st.y, 1);
    });

    // ── The pendant ──
    ctx.at(300, () => {
      st.pendant = true;
      av.play('raise');
      ctx.capture(() => {
        fx.shock(st.x, st.y, 8, 50, MAG.pendant, 520);
        fx.ember(st.x, st.y - 4, 8, 24, 640, MAG.pendantLit);
      });
      float(ctx, st.x, st.y - 52, '📿 MOLTEN MUTINY', hex(MAG.pendantLit), 12);
      readout.setText('a cursed pendant: 20% of every point you would deal goes into it instead');
    });
    // Paid for the honest way — plumes at the dummy and the volcano, each skimmed.
    for (let k = 0; k < 5; k++) {
      ctx.at(1100 + k * 900, () => {
        if (st.ship) return;
        av.play('sweep', ctx.aim); rig?.setVenting(true);
        for (let i = 0; i < 5; i++) {
          const a = ctx.aim + ((i / 4) - 0.5) * 1.24;
          lob(pools, { x: st.x, y: st.y }, st.x + Math.cos(a) * 110, st.y + Math.sin(a) * 110, 1100 + k * 900);
        }
        // Compressed: a real fifty is a good deal more lava than this.
        st.power = Math.min(50, st.power + 10);
        ctx.capture(() => fx.ember(st.x, st.y + 6, 3, 10, 420, MAG.pendantLit));
        float(ctx, st.x, st.y - 30, `📿 +10`, hex(MAG.pendantLit), 11);
        if (k === 1) readout.setText('damage to a body, pressure into a volcano — the pendant takes its fifth of both');
        if (k === 3) readout.setText('the gem brightens as it fills. Q again takes it off, and the curse keeps what it took.');
      });
    }

    // ── The ship ──
    ctx.at(5800, () => {
      st.pendant = false;
      rig?.setVenting(false);
      st.ship = { x: st.x, y: st.y, heading: ctx.aim, hp: 300, mounted: true };
      ctx.capture(() => {
        fx.erupt(st.x, st.y, 90, MAG.magma);
        fx.shock(st.x, st.y, 20, 150, MAG.gold, 700);
        fx.shock(st.x, st.y, 14, 110, MAG.pendantLit, 620);
        fx.smoke(st.x, st.y - 20, 12, 1400);
      });
      float(ctx, st.x, st.y - 64, '🏴‍☠️ THE SHIP RISES', hex(MAG.gold), 14);
      readout.setText('fifty taken: the ship comes up under you — 300 hull, burning down 15 a second');
      st.aimX = ctx.cx + 60; st.aimY = ctx.cy + 10;
    });
    ctx.at(7400, () => readout.setText('the cursor is the helm. It is slow, and it takes every hit meant for you.'));
    // Broadsides.
    const broadside = (at: number): void => ctx.at(at, () => {
      if (!st.ship) return;
      av.play('punch', Math.atan2(victim.y - st.y, victim.x - st.x));
      const c = Math.cos(st.ship.heading), sn = Math.sin(st.ship.heading);
      for (let i = 0; i < 6; i++) {
        const u = -22 + (i % 3) * 18, v = (i < 3 ? -1 : 1) * 14;
        const px = st.ship.x + c * u - sn * v, py = st.ship.y + sn * u + c * v;
        const tx = i === 4 ? vessels[0].x : victim.x;
        const ty = i === 4 ? vessels[0].y : victim.y;
        const ang = Math.atan2(ty - py, tx - px) + (Math.random() - 0.5) * 0.24;
        balls.push({ x: px, y: py, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, born: at, seed: i * 31 });
        ctx.capture(() => { fx.ember(px, py, 4, 12, 360, MAG.gold); fx.smoke(px, py, 2, 600); });
      }
      float(ctx, st.ship.x, st.ship.y - 56, '💣 BROADSIDE', hex(MAG.gold), 12);
    });
    broadside(8600);
    ctx.at(8900, () => readout.setText('the click is all six cannons: 26 apiece, heavy knockback — and a round across your own volcano lights it on the spot'));
    broadside(10800);
    ctx.at(12200, () => {
      if (!st.ship) return;
      st.ship.mounted = false;
      const a = Math.atan2(st.aimY - st.y, st.aimX - st.x);
      st.x = st.ship.x + Math.cos(a) * 50; st.y = st.ship.y + Math.sin(a) * 50;
      float(ctx, st.x, st.y - 52, '🪂 OVER THE SIDE', '#8a8a8a', 12);
      readout.setText('Space goes over the side. The ship holds where it is, still burning, still a hull between you and them.');
    });
    ctx.at(14400, () => {
      if (!st.ship) return;
      st.ship.mounted = true;
      float(ctx, st.ship.x, st.ship.y - 52, '⚓ ABOARD', hex(MAG.gold), 12);
      readout.setText('Space within 84px of the hull and you are back at the helm. When the hull runs out, it sinks and you are on your feet.');
    });
  },
};

// ══ PASSIVE — Pressure ════════════════════════════════════════════════

export const pressure: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Passive — every attack you own charges your own volcano instead of a person',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const pools: Pool[] = [];
    const vessels: Vessel[] = [
      { x: ctx.cx + 110, y: ctx.cy - 18, r: 30, p: 0, max: 100, seed: 2 },
      { x: ctx.cx + 220, y: ctx.cy + 34, r: 30, p: 0, max: 100, seed: 9 },
    ];
    field(ctx, pools, vessels);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ff8b22', 10);
    ctx.onFrame(() => tally.setText(
      `near volcano ${Math.round(vessels[0].p)} / 100     ·     far volcano ${Math.round(vessels[1].p)} / 100`));

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
    ctx.at(5600, () => bump(vessels[1], 15, 'a Blunder-Boil cone across it: 15, same as it does to a body', MAG.lava));
    ctx.at(6800, () => bump(vessels[1], 25, 'a popped Bloat: 25 to everything of yours inside 96px', MAG.gold));
    ctx.at(8000, () => {
      bump(vessels[1], 40, 'a volcano collapsing: 40 to every other vessel inside its 150px blast', MAG.gold);
      ctx.capture(() => fx.shock(vessels[0].x, vessels[0].y, 30, 150, MAG.gold, 720));
    });
    ctx.at(9400, () => {
      vessels[1].p = 100;
      ctx.capture(() => fx.erupt(vessels[1].x, vessels[1].y - 30, 40, MAG.gold));
      float(ctx, vessels[1].x, vessels[1].y - 90, '💣 LIT', hex(MAG.gold), 12);
      readout.setText('and a cannonball from the ship skips the ladder: whatever it had, it goes critical now');
    });
    ctx.at(11200, () => readout.setText('a full vessel stops accepting — anything spent on a topped-out one is simply wasted'));
    ctx.at(12600, () => readout.setText('with the pendant on, a fifth of every one of these goes into the pendant instead'));
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

// ══ PASSIVE — The Buccaneer ═══════════════════════════════════════════

export const theBuccaneer: PreviewScript = {
  duration: 14000,
  scale: 1.15,
  bodyTexture: BODY,
  caption: 'Passive — a basalt ball in a pirate\'s kit; the pendant and the captain\'s commission are worn, not cast',
  run(ctx) {
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint), { manual: true });
    const rig = molten(av);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ff8b22', 10);
    const st = { facing: ctx.aim, pendant: -1, mastered: false, helm: false };

    // Turning slowly on the spot, so every piece of the kit gets its moment facing the camera.
    ctx.onFrame((delta, elapsed) => {
      st.facing = ctx.aim + Math.sin(elapsed / 1400) * 1.1;
      av.setFacing(st.facing);
      rig?.setPendant(st.pendant);
      rig?.setHelm(st.helm);
      av.setMastered(st.mastered);
      av.update(delta, ctx.cx, ctx.cy, 1);
    });

    ctx.at(300, () => {
      readout.setText('the body is a sphere of cooled basalt with the melt in nine lit seams');
      tally.setText('the same material as every object the kit puts on the field');
    });
    ctx.at(2600, () => {
      readout.setText('everything else hangs off the ball: tricorn, eye patch, sash and buckle, lava beard, peg leg');
      tally.setText('hook on the left hand, a 24px obsidian cutlass in the right — the hat is visibly melting');
    });
    ctx.at(5400, () => {
      st.pendant = 0;
      av.play('raise');
      readout.setText('Molten Mutiny hangs the pendant on the chest: a red gem on a gold chain');
      tally.setText('pendant 0 / 50');
    });
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 5400 || elapsed > 8600 || st.pendant < 0) return;
      st.pendant = Math.min(1, st.pendant + (dt / 1000) / 3.2);
      tally.setText(`pendant ${Math.round(st.pendant * 50)} / 50   —   the gem brightens with what it has taken`);
    });
    ctx.at(8800, () => {
      st.pendant = -1;
      st.helm = true;
      readout.setText('at the helm the scorch under his feet fades — the deck is under him');
      tally.setText('the hands come up to the wheel');
    });
    ctx.at(11000, () => {
      st.helm = false;
      st.mastered = true;
      av.play('flex');
      readout.setText('mastered, he is the captain: gold lace on the brim, crossed cutlasses, a lava plume, an earring');
      tally.setText('and wider coronas on both hands');
    });
  },
};

// ══ UPGRADED — Pressure Gauge (F+) ════════════════════════════════════

export const upgradedPressureGauge: PreviewScript = {
  duration: 16000,
  scale: 0.83,
  bodyTexture: BODY,
  caption: 'F+ — three charges; sit on a full gun and it kicks harder, until it bursts',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint), { manual: true });
    const victim = { x: ctx.cx + 60, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff8b22', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    // Compressed clock: the real gauge fills over 9 seconds and overpressures 6 later.
    const st = { x: ctx.cx - 60, y: ctx.cy, fullAt: 300, pressure: 0, over: false, shotAt: -1, shotX: 0, shotY: 0, ang: 0, flyAng: 0, hot: 0, hit: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const card = ctx.adopt(ctx.scene.add.graphics().setDepth(22));

    ctx.onFrame((delta, elapsed) => {
      g.clear(); card.clear();
      if (st.fullAt >= 0) {
        st.pressure = Phaser.Math.Clamp((elapsed - st.fullAt) / 3000, 0, 1);
        st.over = elapsed - st.fullAt >= 5000;
      }
      // The F card, as ArenaScene paints it: darker and redder with the gauge, black when over.
      const cw = 90, ch = 14, cx0 = ctx.w * 0.5 - cw / 2, cy0 = ctx.h - 40;
      card.fillStyle(0x05070a, 0.85); card.fillRoundedRect(cx0 - 2, cy0 - 2, cw + 4, ch + 4, 3);
      if (st.over) {
        card.fillStyle(0x1a1416, 0.92);
      } else {
        const base = Phaser.Display.Color.ValueToColor(0xff7733);
        const hot = Phaser.Display.Color.ValueToColor(0xc40c14);
        const mix = Phaser.Display.Color.Interpolate.ColorWithColor(base, hot, 100, Math.round(st.pressure * 100));
        card.fillStyle(Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b), 0.45 + st.pressure * 0.45);
      }
      card.fillRect(cx0, cy0, cw, ch);
      // Smoke off an overpressured gun.
      if (st.over && st.shotAt < 0) {
        for (let i = 0; i < 3; i++) {
          const ph = ((elapsed / 1250) + i * 0.33) % 1;
          g.fillStyle(ctx.tint(MAG.smoke), 0.5 * (1 - ph));
          g.fillCircle(st.x + 14 + Math.sin(ph * 6 + i) * 4, st.y - 8 - ph * 26, 3 + ph * 4);
        }
      }
      // The recoil flight, and the hot corona that makes it a hit.
      if (st.shotAt >= 0 && elapsed - st.shotAt <= 380) {
        const u = (elapsed - st.shotAt) / 380;
        const p = recoil({ x: st.shotX, y: st.shotY }, st.flyAng, 240 + 200 * st.hot, u);
        st.x = Phaser.Math.Clamp(p.x, 40, ctx.w - 40); st.y = Phaser.Math.Clamp(p.y, 40, ctx.h - 40);
        const fade = Phaser.Math.Clamp(1 - u * 1.6, 0, 1);
        if (fade > 0) {
          breathCone(g, ctx.tint, st.shotX + Math.cos(st.ang) * 12, st.shotY + Math.sin(st.ang) * 12, st.ang,
            160 * (0.7 + u * 0.3), 0.5 * (0.8 + u * 0.3), elapsed / 1000, 3, st.hot > 0.6 ? MAG.white : MAG.lava, MAG.magma, fade);
        }
        if (st.hot >= 0.6) {
          g.lineStyle(2.2, ctx.tint(MAG.white), 0.5 + 0.3 * Math.sin(elapsed / 33));
          g.strokeCircle(st.x, st.y, 34);
          g.fillStyle(ctx.tint(MAG.gold), 0.18); g.fillCircle(st.x, st.y, 34);
          if (!st.hit && Phaser.Math.Distance.Between(st.x, st.y, victim.x, victim.y) <= 34) {
            st.hit = true;
            ctx.capture(() => fx.erupt(victim.x, victim.y, 30, MAG.gold));
            float(ctx, victim.x, victim.y - 44, '🏴‍☠️ 18 — RAMMED', hex(MAG.gold), 13);
          }
        }
      }
      av.setFacing(Math.atan2(victim.y - st.y, victim.x - st.x));
      av.update(delta, st.x, st.y, 1);
      gauge.setText(st.over ? 'OVERPRESSURED — the next F bursts'
        : st.fullAt >= 0 ? `pressure ${Math.round(st.pressure * 100)}%   ·   F deals ${Math.round(15 + 20 * st.pressure)} · flies ${Math.round(240 + 200 * st.pressure)}px${st.pressure >= 0.6 ? ' · you are the shot' : ''}`
          : 'charges ●●○  —  the gauge only runs on a full gun');
    });

    ctx.at(300, () => readout.setText('three charges banked: the gauge starts running, and the F card darkens'));
    ctx.at(1600, () => readout.setText('a pressurised shot hits harder and throws you further — up to 35 and 440px'));
    // Fire hot, *away* from the dummy, so the flight carries through them.
    ctx.at(2800, () => {
      st.hot = st.pressure; st.fullAt = -1; st.over = false;
      st.shotAt = 2800; st.shotX = st.x; st.shotY = st.y; st.hit = false;
      st.ang = Math.atan2(st.y - victim.y, st.x - victim.x); // away from them
      st.flyAng = st.ang + Math.PI;
      av.play('punch', st.ang);
      ctx.capture(() => { fx.erupt(st.x + Math.cos(st.ang) * 16, st.y + Math.sin(st.ang) * 16, 50, MAG.white); fx.smoke(st.x, st.y, 5, 700); });
      float(ctx, st.x, st.y - 52, `💥 BLUNDER-BOIL ${Math.round(st.hot * 100)}%`, hex(MAG.lava), 12);
      readout.setText('past 60% you are the shot: fired away from them, the recoil carries you through them for 18');
    });
    ctx.at(5200, () => { st.pressure = 0; readout.setText('fire it and the gauge resets — the pressure was the cost of not firing'); });
    // Now the long wait.
    ctx.at(6400, () => {
      st.x = ctx.cx - 60; st.y = ctx.cy; st.shotAt = -1;
      st.fullAt = 6400;
      readout.setText('full again, and left alone this time. Nine seconds to full pressure…');
    });
    ctx.at(9600, () => readout.setText('…and six more at full before the gun is overpressured. The card goes smoky black.'));
    ctx.at(12400, () => {
      st.fullAt = -1; st.over = false; st.pressure = 0;
      av.play('punch', ctx.aim);
      ctx.capture(() => {
        fx.erupt(st.x, st.y, 120 * 0.7, MAG.magma);
        fx.shock(st.x, st.y, 20, 120, MAG.white, 640);
        fx.smoke(st.x, st.y, 14, 1300);
      });
      float(ctx, st.x, st.y - 56, '💀 OVERPRESSURE −35', hex(MAG.white), 14);
      float(ctx, victim.x, victim.y - 30, '35', '#ffb3aa', 15);
      readout.setText('press F now and it does not fire — it bursts: 35 to you and everyone within 120px');
    });
    ctx.at(14600, () => readout.setText('so a full gun is a clock. Spend a charge before the card goes black.'));
  },
};

// ══ UPGRADED — Pirate King (Q+) ═══════════════════════════════════════

export const upgradedPirateKing: PreviewScript = {
  duration: 15000,
  scale: 0.72,
  bodyTexture: BODY,
  caption: 'Q+ — crew of flame every 4–5s while the ship is up; each lunges for 20 and leaves fire',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint), { manual: true });
    const rig = molten(av);
    const pools: Pool[] = [];
    field(ctx, pools, []);
    const victim = { x: ctx.w * 0.72, y: ctx.cy - 20 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffc44a', 11);
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffc44a', 10);

    const ship = { x: ctx.cx, y: ctx.cy + 10, heading: ctx.aim, hp: 300 };
    interface Sp { x: number; y: number; hp: number; seed: number; orbit: number; facing: number; dashUntil: number; dashFrom: number; vx: number; vy: number; hit: boolean; trail: number }
    const crew: Sp[] = [];
    const hull = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const rigG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    rig?.setHelm(true);

    const spawn = (at: number): void => ctx.at(at, () => {
      if (crew.length >= 3) return;
      const orbit = Math.random() * Math.PI * 2;
      crew.push({ x: ship.x + Math.cos(orbit) * 50, y: ship.y + Math.sin(orbit) * 30, hp: 50, seed: at % 999, orbit, facing: ship.heading, dashUntil: 0, dashFrom: 0, vx: 0, vy: 0, hit: false, trail: 0 });
      ctx.capture(() => { fx.ember(ship.x, ship.y - 20, 10, 30, 700, MAG.gold); fx.smoke(ship.x, ship.y - 20, 4, 800); });
      float(ctx, ship.x, ship.y - 70, '👻 ALL HANDS', hex(MAG.gold), 12);
    });
    const lunge = (at: number, who: number): void => ctx.at(at, () => {
      const sp = crew[who];
      if (!sp) return;
      const d = Math.max(1, Phaser.Math.Distance.Between(sp.x, sp.y, victim.x, victim.y));
      const travel = Math.min(240, d + 60);
      const speed = travel / 0.32;
      sp.facing = Math.atan2(victim.y - sp.y, victim.x - sp.x);
      sp.vx = Math.cos(sp.facing) * speed; sp.vy = Math.sin(sp.facing) * speed;
      sp.dashFrom = at; sp.dashUntil = at + 320; sp.hit = false; sp.trail = 0;
      ctx.capture(() => fx.ember(sp.x, sp.y, 5, 16, 400, MAG.gold));
    });

    ctx.onFrame((delta, elapsed) => {
      hull.clear(); rigG.clear(); air.clear();
      const dt = delta / 1000;
      const t = elapsed / 1000;
      ship.hp -= 15 * dt;
      pirateShip(hull, ctx.tint, ship.x, ship.y, ship.heading, t, ship.hp / 300, 7, 'hull');
      pirateShip(rigG, ctx.tint, ship.x, ship.y, ship.heading, t, ship.hp / 300, 7, 'rig');
      for (let i = crew.length - 1; i >= 0; i--) {
        const sp = crew[i];
        sp.hp -= 8 * dt;
        if (sp.hp <= 0) { ctx.capture(() => fx.smoke(sp.x, sp.y, 4, 700)); crew.splice(i, 1); continue; }
        if (sp.dashUntil > elapsed) {
          const px = sp.x, py = sp.y;
          sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          sp.trail += Phaser.Math.Distance.Between(px, py, sp.x, sp.y);
          while (sp.trail >= 18) { sp.trail -= 18; pools.push({ x: sp.x, y: sp.y + 14, born: elapsed, fromX: sp.x, fromY: sp.y, r: 15, life: 1400 }); }
          if (!sp.hit && Phaser.Math.Distance.Between(sp.x, sp.y, victim.x, victim.y) <= 22) {
            sp.hit = true;
            ctx.capture(() => fx.erupt(victim.x, victim.y, 24, MAG.lava));
            float(ctx, victim.x, victim.y - 44, '👻 20', hex(MAG.gold), 14);
          }
        } else {
          sp.orbit += dt * 0.9;
          const wx = ship.x + Math.cos(sp.orbit) * 54, wy = ship.y + Math.sin(sp.orbit) * 30 - 10;
          sp.x += (wx - sp.x) * Math.min(1, dt * 3); sp.y += (wy - sp.y) * Math.min(1, dt * 3);
          sp.facing = Math.atan2(victim.y - sp.y, victim.x - sp.x);
        }
        const dash = sp.dashUntil > elapsed ? Phaser.Math.Clamp((elapsed - sp.dashFrom) / 320, 0, 1) : 0;
        pirateSpirit(air, ctx.tint, sp.x, sp.y - 16, sp.facing, t + sp.seed, sp.seed, Phaser.Math.Clamp(sp.hp / 50, 0, 1), dash);
      }
      av.setFacing(Math.atan2(victim.y - ship.y, victim.x - ship.x));
      av.update(delta, ship.x, ship.y - 4, 1);
      tally.setText(`crew ${crew.length} / 3   ·   ${crew.map((c) => `${Math.max(0, Math.round(c.hp))}hp`).join('  ')}   ·   hull ${Math.max(0, Math.round(ship.hp))}`);
    });

    ctx.at(300, () => readout.setText('the ship is up, so the crew climbs out: one every 4–5 seconds, three at most'));
    spawn(600);
    ctx.at(1400, () => readout.setText('50 health each, burning down 8 a second — about six seconds of a man'));
    lunge(2400, 0);
    ctx.at(2700, () => readout.setText('every 2–3 seconds one lunges through whoever is nearest: 20 on contact'));
    ctx.at(3600, () => readout.setText('and the line he flew along is on fire for a moment behind him'));
    spawn(4800);
    lunge(5400, 0);
    lunge(6200, 1);
    ctx.at(7000, () => readout.setText('they hang in the air over the deck between lunges, and enemy shots burn them down faster'));
    spawn(9200);
    lunge(9800, 2);
    lunge(10600, 1);
    ctx.at(11600, () => readout.setText('three of them, each on its own clock — the ship is a fortress for as long as it floats'));
    lunge(12800, 0);
    ctx.at(13600, () => readout.setText('when the hull runs out they stop coming; the ones already out burn down where they are'));
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
    const v: Vessel = { x: ctx.cx + 108, y: ctx.cy + 4, r: 30, p: 100, max: 100, seed: 4 };
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
