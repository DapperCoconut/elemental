import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { FireFx, FIRE, FireAvatar, FireWreath } from '../../../elements/kits/FireVisuals';
import { WaterFx, WATER, WaterAvatar } from '../../../elements/kits/WaterVisuals';
import { LifeFx, LIFE, LifeAvatar, PlantArtType, SEED_COLOR } from '../../../elements/kits/LifeVisuals';
import { AirFx, AIR, AirAvatar, AirDraft } from '../../../elements/kits/AirVisuals';
import { EarthFx, EARTH, EarthAvatar, StoneShield } from '../../../elements/kits/EarthVisuals';

/**
 * Showcases for the things that are not keyed abilities: passives, perks and mastery
 * enhancements.
 *
 * These are often the ones most worth watching. A passive has no cast to look for, so a
 * player has nothing to go on but the text; a perk can replace what a key does outright
 * (Hawk reverses the grapple, Alcohol removes Flame Dash's damage); and a mastery
 * enhancement is bought blind from a menu. Same rules as the ability scripts — call the
 * element's real `Fx`, never redraw the art.
 */

// ── Staging helpers, one per element ──────────────────────────────────

function fireStage(ctx: PreviewCtx): { fx: FireFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new FireFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new FireAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}
function waterStage(ctx: PreviewCtx): { fx: WaterFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new WaterFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new WaterAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}
function lifeStage(ctx: PreviewCtx): { fx: LifeFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new LifeFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new LifeAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}
function airStage(ctx: PreviewCtx): { fx: AirFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new AirFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new AirAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}
function earthStage(ctx: PreviewCtx): { fx: EarthFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new EarthFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new EarthAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}

/** A labelled meter, for passives whose whole content is a number that moves. */
function meter(
  ctx: PreviewCtx, o: { x: number; y: number; w: number; color: number; read: (ms: number) => number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, elapsed) => {
    const v = Phaser.Math.Clamp(o.read(elapsed), 0, 1);
    g.clear();
    g.fillStyle(0x0b0d16, 0.9);
    g.fillRoundedRect(o.x, o.y, o.w, 9, 4);
    g.fillStyle(ctx.tint(o.color), 0.95);
    g.fillRoundedRect(o.x + 1, o.y + 1, Math.max(0, (o.w - 2) * v), 7, 3);
    g.lineStyle(1, ctx.tint(o.color), 0.5);
    g.strokeRoundedRect(o.x, o.y, o.w, 9, 4);
  });
}

// ══ AIR — passives ════════════════════════════════════════════════════

export const airWindDodge: PreviewScript = {
  duration: 4200,
  caption: 'Passive — banked by landing abilities, spent only on hits it actually saves',
  run(ctx) {
    const { fx, av } = airStage(ctx);
    ctx.addDummy();
    let pool = 0;
    meter(ctx, { x: ctx.cx - 46, y: ctx.cy - 54, w: 92, color: AIR.cyan, read: () => pool });
    // Three abilities landing, each banking its real figure, then a hit that gets voided.
    const bank = (at: number, amount: number, play: () => void): void => ctx.at(at, () => {
      play();
      pool += amount;
      fx.motes(ctx.cx, ctx.cy - 40, 8, { speed: 90, life: 620 });
    });
    bank(400, 0.15, () => { av.play('punch', ctx.aim); fx.ring(ctx.tx, ctx.ty, 10, 40, AIR.frost, 380, 3, 6); });
    bank(1300, 0.25, () => { av.play('dash', ctx.aim); fx.gustBurst(ctx.tx, ctx.ty, 44); });
    bank(2200, 0.10, () => { av.play('sweep', ctx.aim); fx.spinFlourish(ctx.cx, ctx.cy, 115); });
    // The payoff: an incoming hit finds nobody there, and the pool pays for it.
    ctx.at(3100, () => {
      fx.staticSnap(ctx.cx, ctx.cy, 34);
      fx.haze(ctx.cx, ctx.cy, 5, 60, 7);
      pool = Math.max(0, pool - 0.5);
    });
  },
};

export const airMomentum: PreviewScript = {
  duration: 4600,
  caption: 'Passive — +5%/s untouched, capped at 100%; −10% every hit taken',
  run(ctx) {
    const { fx, av } = airStage(ctx);
    ctx.addDummy();
    let m = 0;
    meter(ctx, { x: ctx.cx - 46, y: ctx.cy - 54, w: 92, color: AIR.bolt, read: () => m });
    // Real rate: 5% a second. Over the loop that is a visible, honest climb.
    ctx.onFrame((dt) => { m = Math.min(1, m + (dt / 1000) * 0.05 * 4); });
    ctx.at(600, () => av.play('sweep', ctx.aim));
    ctx.at(1800, () => av.play('punch', ctx.aim));
    // A single clean hit knocks it back down — nothing else does.
    ctx.at(3000, () => {
      fx.flash(ctx.cx, ctx.cy, 26);
      fx.motes(ctx.cx, ctx.cy, 10, { speed: 200, life: 420 });
      m = Math.max(0, m - 0.10 * 4);
    });
  },
};

// ══ EARTH — passive ═══════════════════════════════════════════════════

export const earthShieldPassive: PreviewScript = {
  duration: 4600,
  caption: 'Passive — 75 HP, tracks the cursor, rebuilds 8s after it breaks',
  run(ctx) {
    const { fx, av } = earthStage(ctx);
    ctx.addDummy();
    // The real slab, swung round the caster to show it only ever guards where you look.
    const s = ctx.capture(() => new StoneShield(ctx.scene, ctx.tint, { depth: 7 }));
    let hp = 1;
    let broken = false;
    ctx.onFrame((dt, elapsed) => {
      // Sweeps through a full arc: the guard is directional, and that is its weakness.
      const ang = Math.sin(elapsed / 700) * 1.5;
      s.setHp(hp);
      s.setPose(ctx.cx + Math.cos(ang) * 34, ctx.cy + Math.sin(ang) * 34, ang);
      s.update(dt);
      void broken;
    });
    // Chipped down, broken, then back up.
    [900, 1500, 2100].forEach((at, i) => ctx.at(at, () => {
      hp = 0.66 - i * 0.33;
      fx.impact(ctx.cx + 34, ctx.cy, 22);
      fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.stone, 6);
    }));
    ctx.at(2600, () => {
      broken = true; hp = 0;
      fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.pale, 16);
      fx.debris(ctx.cx + 34, ctx.cy, 14, { speed: 240, life: 620 });
    });
    ctx.at(3700, () => { hp = 1; broken = false; av.play('slam', ctx.aim); fx.pillar(ctx.cx + 34, ctx.cy, 20, 54); });
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const firePerkAlcohol: PreviewScript = {
  duration: 5000,
  caption: 'Perk — E is now the flask: 25% less damage for 6s, then a 50% slow for 2s',
  run(ctx) {
    const { fx, av } = fireStage(ctx);
    ctx.addDummy();
    ctx.at(300, () => { av.play('raise', ctx.aim, 400); fx.embers(ctx.cx, ctx.cy - 10, 4, { speed: 50, size: 2, life: 400, rise: 30 }); });
    ctx.at(900, () => {
      av.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 54, 10);
      fx.ring(ctx.cx, ctx.cy, 10, 62, FIRE.gold, 420, 4, 6);
      // Six seconds of resistance, then the comedown.
      const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      ctx.onFrame((_dt, elapsed) => {
        const t = (elapsed - 900) / 3000;
        aura.clear();
        if (t < 0 || t > 1) return;
        aura.fillStyle(ctx.tint(FIRE.gold), 0.14 + 0.06 * Math.sin(elapsed / 180));
        aura.fillCircle(ctx.cx, ctx.cy, 34);
      });
      ctx.at(3000, () => {
        fx.smoke(ctx.cx, ctx.cy - 6, 4, 22, 5);
        // The slow: the caster visibly stops.
        const slow = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
        ctx.onFrame((_dt, elapsed) => {
          const t = (elapsed - 3900) / 1000;
          slow.clear();
          if (t < 0 || t > 1) return;
          slow.lineStyle(2, ctx.tint(FIRE.deep), 0.5 * (1 - t));
          slow.strokeCircle(ctx.cx, ctx.cy, 26 + 8 * t);
        });
      });
    });
  },
};

export const waterPerkStalagmite: PreviewScript = {
  duration: 4400,
  scale: 0.95,
  caption: 'Perk — Splash plants spikes; your own clicks are relaunched off them for 7',
  run(ctx) {
    const { fx, av } = waterStage(ctx);
    ctx.addDummy();
    const spikes: { x: number; y: number }[] = [];
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      for (let i = 0; i < 3; i++) {
        const px = ctx.cx + 80 + i * 62, py = ctx.cy + 10;
        ctx.at(i * 220, () => {
          spikes.push({ x: px, y: py });
          fx.waterSpout(px, py, 9, 34, 5);
          fx.crown(px, py, 22, 7, 3);
        });
      }
    });
    // A click caught by the first spike and thrown on from it — the relay the perk builds.
    ctx.at(1800, () => {
      av.play('punch', ctx.aim);
      fx.muzzleSpray(ctx.cx + 32, ctx.cy, ctx.aim, 0.85);
      ctx.fly({
        texture: 'proj-water', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.cx + 80, y: ctx.cy + 10 }, speed: 620,
        onHit: () => {
          fx.splash(ctx.cx + 80, ctx.cy + 10, 20);
          ctx.fly({
            texture: 'proj-water', from: { x: ctx.cx + 80, y: ctx.cy + 10 }, to: { x: ctx.tx, y: ctx.ty }, speed: 500,
            onHit: () => fx.splash(ctx.tx, ctx.ty, 24),
          });
        },
      });
    });
  },
};

export const lifePerkMycology: PreviewScript = {
  duration: 3800,
  caption: 'Perk — every seed grows as a mushroom; those within 170px gain bonus HP',
  run(ctx) {
    const { fx, av } = lifeStage(ctx);
    av.setHold('sow', ctx.aim);
    const spots = [[96, 12], [154, 26], [206, 4]];
    spots.forEach(([dx, dy], i) => {
      const px = ctx.cx + dx, py = ctx.cy + dy;
      ctx.at(300 + i * 500, () => {
        fx.overgrowth(px, py, 22);
        fx.spores(px, py, 6, 26, 5);
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
        const born = 300 + i * 500;
        ctx.onFrame((_dt, elapsed) => {
          const age = elapsed - born;
          g.clear();
          if (age < 0) return;
          // `mushroom` is the perk's own flag on the arena's plant art.
          LifeFx.drawPlant(g, ctx.tint, 'sunflower', px, py, elapsed / 1000,
            { scale: Phaser.Math.Clamp(age / 300, 0, 1), mushroom: true });
        });
      });
    });
    // The clustering bonus, drawn as the 170px link between neighbours.
    ctx.at(1900, () => {
      const link = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      ctx.onFrame((_dt, elapsed) => {
        link.clear();
        const a = 0.18 + 0.1 * Math.sin(elapsed / 220);
        link.lineStyle(1.5, ctx.tint(LIFE.glow), a);
        for (let i = 0; i < spots.length - 1; i++) {
          link.lineBetween(ctx.cx + spots[i][0], ctx.cy + spots[i][1],
            ctx.cx + spots[i + 1][0], ctx.cy + spots[i + 1][1]);
        }
      });
      for (const [dx, dy] of spots) fx.healBloom(ctx.cx + dx, ctx.cy + dy, 22);
    });
  },
};

export const airPerkHawk: PreviewScript = {
  duration: 3400,
  caption: 'Perk — F throws an eagle: it drags THEM to your cursor, not you to them',
  run(ctx) {
    const { fx, av } = airStage(ctx);
    ctx.addDummy();
    ctx.at(300, () => {
      av.setHold('reach', ctx.aim);
      const bird = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 300) / 500, 0, 1);
        bird.clear();
        if (t <= 0 || t >= 1) return;
        AirFx.drawHawk(bird, ctx.tint, ctx.cx + 30 + (ctx.tx - ctx.cx) * t, ctx.cy, 0, elapsed / 90);
      });
      ctx.at(500, () => {
        bird.clear();
        fx.gustBurst(ctx.tx, ctx.ty, 34);
        // The reversal: the dummy comes to the caster's cursor.
        const drag = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 800) / 700, 0, 1);
          drag.clear();
          if (t <= 0) return;
          const dx = ctx.tx + (ctx.cx + 70 - ctx.tx) * t;
          drag.fillStyle(0x2b2f3d, 1); drag.fillCircle(dx, ctx.ty, 17);
          drag.fillStyle(0x3c4254, 1); drag.fillCircle(dx, ctx.ty, 13);
          drag.lineStyle(1.5, ctx.tint(AIR.frost), 0.5 * (1 - t));
          drag.lineBetween(ctx.cx, ctx.cy, dx, ctx.ty);
        });
        ctx.at(700, () => { av.setHold(null); fx.staticSnap(ctx.cx + 70, ctx.ty, 26); });
      });
    });
  },
};

export const earthPerkObsidian: PreviewScript = {
  duration: 3600,
  caption: 'Perk — shield to 100 HP in volcanic glass, and you move 15% slower for it',
  run(ctx) {
    const { fx, av } = earthStage(ctx);
    ctx.addDummy();
    const s = ctx.capture(() => new StoneShield(ctx.scene, ctx.tint, { depth: 7, enhanced: true }));
    ctx.onFrame((dt) => { s.setHp(1); s.setPose(ctx.cx + 34, ctx.cy, 0); s.update(dt); });
    ctx.at(400, () => { av.play('flex'); fx.dust(ctx.cx, ctx.cy + 14, 6, 40, 5); });
    // Blows that would have broken a 75 HP guard simply do not.
    [1100, 1800, 2500].forEach((at) => ctx.at(at, () => {
      fx.impact(ctx.cx + 34, ctx.cy, 26);
      fx.shatter(ctx.cx + 34, ctx.cy, ctx.aim, EARTH.chrome, 5);
    }));
    // And the weight: the caster's own footfalls drag.
    ctx.onFrame((_dt, elapsed) => { if (elapsed % 800 < 20) fx.grit(ctx.cx, ctx.cy + 16, 3, { speed: 60, life: 420 }); });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const fireMasteryBurningBody: PreviewScript = {
  duration: 4200,
  caption: 'Mastery passive — contact burn, and every DoT on you is stripped instantly',
  run(ctx) {
    const { fx, av } = fireStage(ctx);
    ctx.addDummy();
    const wreath = ctx.capture(() => new FireWreath(ctx.scene, ctx.tint, 36, 1.1, 3));
    ctx.onFrame((dt) => wreath.update(dt, ctx.cx, ctx.cy, 1));
    // Something walks into contact range and burns for it.
    ctx.at(900, () => {
      for (let i = 0; i < 5; i++) {
        ctx.at(i * 300, () => { fx.flash(ctx.cx + 46, ctx.cy, 16); fx.embers(ctx.cx + 46, ctx.cy, 3, { speed: 70, size: 2, life: 380, rise: 40 }); });
      }
    });
    // A DoT lands on the caster and is gone the same instant.
    ctx.at(2800, () => {
      fx.smoke(ctx.cx, ctx.cy - 10, 3, 18, 5);
      ctx.at(120, () => { fx.ring(ctx.cx, ctx.cy, 8, 48, FIRE.white, 360, 3, 7); fx.bloom(ctx.cx, ctx.cy, 44, 8); });
    });
  },
};

export const fireMasteryHeatwave: PreviewScript = {
  duration: 4000,
  scale: 0.9,
  caption: 'Mastery — 0 damage, but everyone it passes is Exposed for 5s: next hit ×1.5',
  run(ctx) {
    const { fx, av } = fireStage(ctx);
    ctx.addDummy();
    ctx.at(400, () => {
      av.play('sweep', ctx.aim);
      // The wave: 420px at 520 px/s, piercing, doing nothing on contact.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 400) / ((420 / 520) * 1000), 0, 1);
        g.clear();
        if (t <= 0 || t >= 1) return;
        const wx = ctx.cx + 30 + 420 * t;
        g.fillStyle(ctx.tint(FIRE.yellow), 0.55 * (1 - t * 0.4));
        g.fillRect(wx - 13, ctx.cy - 45, 26, 90);
        g.fillStyle(ctx.tint(FIRE.white), 0.8 * (1 - t * 0.5));
        g.fillRect(wx - 4, ctx.cy - 45, 8, 90);
      });
      // The mark it leaves, ticking down for its real 5s.
      ctx.at(320, () => {
        const mark = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 720) / 2600, 0, 1);
          mark.clear();
          if (t >= 1) return;
          mark.lineStyle(2, ctx.tint(FIRE.gold), 0.85 * (1 - t));
          mark.strokeCircle(ctx.tx, ctx.ty - 30, 9);
          mark.fillStyle(ctx.tint(FIRE.gold), 0.8 * (1 - t));
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + elapsed / 500;
            mark.fillCircle(ctx.tx + Math.cos(a) * 13, ctx.ty - 30 + Math.sin(a) * 13, 1.8);
          }
        });
        // Then the hit that cashes it, landing for half again.
        ctx.at(1600, () => {
          av.play('punch', ctx.aim);
          ctx.fly({
            texture: 'proj-fire', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
            onHit: () => { fx.explosion(ctx.tx, ctx.ty, 62); mark.clear(); },
          });
        });
      });
    });
  },
};

export const waterMasterySlipstream: PreviewScript = {
  duration: 3600,
  caption: 'Mastery passive — 25% faster in any of your own water',
  run(ctx) {
    const { fx, av } = waterStage(ctx);
    // A road of pools, and the caster visibly quicker along it.
    for (let i = 0; i < 5; i++) {
      const px = ctx.cx + 40 + i * 52;
      ctx.at(150 + i * 120, () => {
        fx.crown(px, ctx.cy + 12, 30, 8, 3);
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
        ctx.onFrame((_dt, elapsed) => {
          g.clear();
          WaterFx.drawPool(g, ctx.tint, px, ctx.cy + 12, 36, elapsed / 600, 0.9, px * 0.01);
        });
      });
    }
    ctx.at(1000, () => {
      av.play('dash', ctx.aim);
      for (let i = 0; i < 6; i++) {
        ctx.at(i * 260, () => fx.wake(ctx.cx + 40 + i * 40, ctx.cy + 6, ctx.cx + 80 + i * 40, ctx.cy + 6));
      }
    });
  },
};

export const waterMasterySiphon: PreviewScript = {
  duration: 4200,
  caption: 'Mastery — a 3s cone, 190px, 36° each side: 10% dehydration per second, 0 damage',
  run(ctx) {
    const { fx, av } = waterStage(ctx);
    ctx.addDummy();
    let dry = 0;
    meter(ctx, { x: ctx.tx - 40, y: ctx.ty - 52, w: 80, color: WATER.sky, read: () => dry });
    ctx.at(400, () => {
      av.setHold('draw', ctx.aim);
      const cone = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      ctx.onFrame((dt, elapsed) => {
        const t = (elapsed - 400) / 3000;
        cone.clear();
        if (t < 0 || t > 1) return;
        dry = Math.min(1, dry + (dt / 1000) * 0.10 * 3.3);
        // Tracks the aim for the whole channel, exactly as the real cone does.
        const aim = Math.sin(elapsed / 800) * 0.3;
        const half = Math.PI / 5;
        cone.fillStyle(ctx.tint(WATER.sky), 0.14 + 0.06 * Math.sin(elapsed / 120));
        cone.slice(ctx.cx, ctx.cy, 190, aim - half, aim + half, false);
        cone.fillPath();
      });
      ctx.at(3000, () => { av.setHold(null); fx.mist(ctx.tx, ctx.ty, 5, 34, 6); });
    });
  },
};

export const lifeMasteryThornThrash: PreviewScript = {
  duration: 3600,
  caption: 'Mastery passive — clipping your own plant fires 5 thorns at 5 damage, once per 3s',
  run(ctx) {
    const { fx, av } = lifeStage(ctx);
    ctx.addDummy();
    const px = ctx.cx + 120, py = ctx.cy + 10;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      LifeFx.drawPlant(g, ctx.tint, 'rose', px, py, elapsed / 1000, {});
    });
    ctx.at(500, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-life', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: px, y: py }, speed: 480,
        onHit: () => {
          // Five thorns, random directions — the real count and the real damage.
          fx.thornSpray(px, py, 5);
          fx.bloomBurst(px, py, 46, 8, 5);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.6;
            fx.vineLash(px, py, px + Math.cos(a) * 90, py + Math.sin(a) * 90, LIFE.thorn);
          }
        },
      });
    });
    // The 3s per-plant gate: nothing happens on the second clip.
    ctx.at(2200, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-life', from: { x: ctx.cx + 32, y: ctx.cy }, to: { x: px, y: py }, speed: 480,
        onHit: () => fx.pollen(px, py, 5, { speed: 50, life: 420 }),
      });
    });
  },
};

export const lifeMasteryReap: PreviewScript = {
  duration: 4200,
  caption: 'Mastery — destroy a plant, wear what it was for 20s. Six different buffs',
  run(ctx) {
    const { fx, av } = lifeStage(ctx);
    const px = ctx.cx + 130, py = ctx.cy + 10;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let alive = true;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!alive) return;
      LifeFx.drawPlant(g, ctx.tint, 'sunflower', px, py, elapsed / 1000, {});
    });
    ctx.at(700, () => {
      av.play('clap', ctx.aim);
      alive = false;
      fx.wilt(px, py, 34);
      fx.spores(px, py, 10, 30, 5, LIFE.rot);
      // The essence coming back to the caster and staying on them.
      fx.vineLash(px, py, ctx.cx, ctx.cy, LIFE.vital);
      ctx.at(200, () => {
        fx.healBloom(ctx.cx, ctx.cy, 40);
        const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
        ctx.onFrame((_dt, elapsed) => {
          aura.clear();
          if (elapsed < 900) return;
          aura.lineStyle(1.5, ctx.tint(LIFE.sun), 0.28 + 0.12 * Math.sin(elapsed / 200));
          aura.strokeCircle(ctx.cx, ctx.cy, 30);
        });
      });
    });
  },
};

export const airMasteryWindsOfChange: PreviewScript = {
  duration: 3800,
  caption: 'Mastery — everything off cooldown, spins refilled, +20 wind dodge',
  run(ctx) {
    const { fx, av } = airStage(ctx);
    let pool = 0.3;
    meter(ctx, { x: ctx.cx - 46, y: ctx.cy - 54, w: 92, color: AIR.cyan, read: () => pool });
    ctx.at(500, () => {
      av.play('raise', ctx.aim, 700);
      fx.petalBurst(ctx.cx, ctx.cy, 150, 26);
      fx.ring(ctx.cx, ctx.cy, 20, 190, AIR.blossom, 620, 6, 6);
      ctx.at(140, () => fx.ring(ctx.cx, ctx.cy, 16, 240, AIR.white, 700, 4, 6));
      fx.motes(ctx.cx, ctx.cy, 26, { speed: 240, life: 800 });
      pool = 0.5;
      // Five cooldown pips snapping back to full — the actual content of the ability.
      const pips = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 500) / 600, 0, 1);
        pips.clear();
        for (let i = 0; i < 5; i++) {
          const bx = ctx.cx - 52 + i * 26;
          pips.fillStyle(0x0b0d16, 0.9);
          pips.fillRoundedRect(bx, ctx.cy + 42, 20, 8, 3);
          pips.fillStyle(ctx.tint(AIR.frost), 0.95);
          pips.fillRoundedRect(bx + 1, ctx.cy + 43, 18 * Math.min(1, t * (1 + i * 0.3)), 6, 2);
        }
      });
    });
  },
};

export const earthMasteryUnbreakable: PreviewScript = {
  duration: 4000,
  caption: 'Mastery passive — cannot be moved, and no single hit exceeds 50 damage',
  run(ctx) {
    const { fx, av } = earthStage(ctx);
    ctx.addDummy();
    ctx.onFrame((_dt, elapsed) => { void elapsed; });
    // Blows that would knock anybody else across the arena simply stop.
    [700, 1600, 2500].forEach((at, i) => ctx.at(at, () => {
      fx.impact(ctx.cx + 30, ctx.cy, 46);
      fx.debris(ctx.cx + 30, ctx.cy, 10, { speed: 240, life: 520 });
      // The caster does not move a pixel — the ring stops dead at the body.
      fx.ring(ctx.cx, ctx.cy, 44, 30, EARTH.chrome, 420, 4, 8);
      if (i === 2) { av.play('flex'); fx.dust(ctx.cx, ctx.cy + 14, 8, 46, 5); }
    }));
  },
};

export const earthMasteryDustScreen: PreviewScript = {
  duration: 4000,
  caption: 'Mastery — a 180px cone, 40° each side: 5s of no accuracy, no damage',
  run(ctx) {
    const { fx, av } = earthStage(ctx);
    ctx.addDummy();
    ctx.at(500, () => {
      av.play('sweep', ctx.aim);
      fx.dustCone(ctx.cx, ctx.cy, ctx.aim, 180, (40 * Math.PI) / 180);
      fx.grit(ctx.cx + 40, ctx.cy, 14, { speed: 220, life: 700, angle: ctx.aim, spread: 0.7 });
      // What it leaves behind: the target blinded, firing nowhere near you.
      ctx.at(400, () => {
        const haze = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 900) / 2600, 0, 1);
          haze.clear();
          if (t >= 1) return;
          haze.fillStyle(ctx.tint(EARTH.dust), 0.30 * (1 - t));
          haze.fillCircle(ctx.tx, ctx.ty, 30 + 4 * Math.sin(elapsed / 160));
        });
        for (let i = 0; i < 3; i++) {
          ctx.at(i * 700, () => {
            const a = -1.1 + i * 1.1;
            fx.furrow(ctx.tx, ctx.ty, ctx.tx - Math.cos(a) * 90, ctx.ty - Math.sin(a) * 90);
          });
        }
      });
    });
  },
};

// ══ THE TWO BACKFILLS ═════════════════════════════════════════════════
//
// Both of these are showcases for subjects that already had codex text but no loop. They are
// the last two gaps in the registry.

/**
 * Air's mastery passive.
 *
 * `air:passive:momentum` above already shows the meter climbing, so this one shows the thing
 * the meter *is*: actual speed. The caster laps the frame, the lap gets visibly faster as the
 * bar fills, and the real `AirDraft` — the same ring the kit wires under a momentum-carrying
 * player, at the same `AIR.sky` colour and the same intensity curve — thickens with it. Then
 * one hit lands and the whole thing steps backwards.
 */
export const airMasteryDancersMomentum: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: "Mastery passive — +5% speed a second untouched, to +100%. One hit taken costs 10%",
  run(ctx) {
    const fx = ctx.capture(() => new AirFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new AirAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    // The kit's own figures: 5% a second, capped at 100%, 10% off a hit that gets through.
    const PER_SEC = 0.05;
    const MAX = 1.0;
    const HIT_LOSS = 0.10;
    let m = 0;
    // The real aura the kit builds for a momentum-carrying player, with the kit's own params.
    const draft = ctx.capture(() => new AirDraft(ctx.scene, ctx.tint, 32, 1, 2, 9, AIR.sky));

    // The caster actually runs, at the actual multiplier — the lap is the whole point.
    const orbit = { r: Math.min(ctx.w, ctx.h) * 0.3, a: 0 };
    const at = { x: ctx.cx, y: ctx.cy };
    ctx.onFrame((dt) => {
      // 4× the real rate so a 20-second climb fits a 9-second loop; the *ratio* is honest.
      m = Math.min(MAX, m + (dt / 1000) * PER_SEC * 4);
      orbit.a += (dt / 1000) * 1.15 * (1 + m);
      at.x = ctx.cx + Math.cos(orbit.a) * orbit.r;
      at.y = ctx.cy + Math.sin(orbit.a) * orbit.r * 0.62;
      av.setFacing(orbit.a + Math.PI / 2);
      av.update(dt, at.x, at.y, 1);
      draft.setIntensity(0.55 + (m / MAX) * 0.95);
      draft.update(dt, at.x, at.y, 1);
    });
    meter(ctx, { x: ctx.cx - 46, y: 10, w: 92, color: AIR.bolt, read: () => m });
    const read = ctx.adopt(ctx.scene.add.text(ctx.cx, 30, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#8fe6ff',
    }).setOrigin(0.5).setDepth(10));
    ctx.onFrame(() => read.setText(`+${Math.round(m * 100)}% MOVE SPEED`));

    // A hit gets through. Nothing else in the game takes it down.
    for (const when of [4200, 6600]) {
      ctx.at(when, () => {
        fx.flash(at.x, at.y, 26);
        fx.motes(at.x, at.y, 12, { speed: 220, life: 460 });
        fx.staticSnap(at.x, at.y, 30);
        m = Math.max(0, m - HIT_LOSS);
      });
    }
  },
};

/**
 * Life's only passive — the board itself.
 *
 * The codex lists six seeds and a cap of five. A loop that shows one plant is documenting a
 * summon; this one fills the board to the cap with all six art types cycling through it,
 * refuses the sixth planting the way the kit does, and lets the two followers walk. Every
 * plant is `LifeFx.drawPlant`, so the art is the same code the arena runs.
 */
export const lifeTheGarden: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Passive — five plants at once from six seeds. The board is the kit',
  run(ctx) {
    const { fx, av } = lifeStage(ctx);
    const CAP = 5;
    const seeds: { type: PlantArtType; name: string; hp: number; note: string }[] = [
      { type: 'sunflower', name: 'Sunflower', hp: 25, note: '10 dmg bullet every 1s' },
      { type: 'rose', name: 'Rose', hp: 75, note: 'thorns — reflects damage' },
      { type: 'nurse-lily', name: 'Nurse Lily', hp: 25, note: 'heals 3 every 2s · follows' },
      { type: 'nightcap', name: 'Nightcap', hp: 25, note: 'lays poison puddles' },
      { type: 'pitcher', name: 'Pitcher', hp: 50, note: 'traps for 3s' },
      { type: 'cotton', name: 'Cotton', hp: 25, note: '+50% speed for 1s · follows' },
    ];

    interface Planted { type: PlantArtType; x: number; y: number; born: number; follows: boolean }
    const bed: Planted[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      for (const p of bed) {
        // The two followers trail the caster at the kit's 40px standoff, at 62 px/s.
        if (p.follows) {
          const d = Phaser.Math.Distance.Between(p.x, p.y, ctx.cx, ctx.cy);
          if (d > 40) {
            p.x += ((ctx.cx - p.x) / d) * 62 * (dt / 1000);
            p.y += ((ctx.cy - p.y) / d) * 62 * (dt / 1000);
          }
        }
        // Growing in: the first half-second of a plant's life is it coming up.
        const grow = Phaser.Math.Clamp((elapsed - p.born) / 500, 0, 1);
        LifeFx.drawPlant(g, ctx.tint, p.type, p.x, p.y, t, { scale: 0.55 + grow * 0.35 });
      }
    });

    // The seed bar at the top — the choice the codex says is the real decision.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let selected = 0;
    ctx.onFrame(() => {
      bar.clear();
      seeds.forEach((s, i) => {
        const x = ctx.cx - (seeds.length * 22) / 2 + i * 22 + 11;
        bar.fillStyle(0x0b0d16, 0.9);
        bar.fillRoundedRect(x - 9, 8, 18, 18, 4);
        bar.fillStyle(ctx.tint(SEED_COLOR[s.type]), i === selected ? 1 : 0.4);
        bar.fillCircle(x, 17, i === selected ? 6 : 4);
        if (i !== selected) return;
        bar.lineStyle(1.5, ctx.tint(LIFE.glow), 0.9);
        bar.strokeRoundedRect(x - 9, 8, 18, 18, 4);
      });
    });

    const say = (x: number, y: number, text: string, color: number): void => {
      const label = ctx.adopt(ctx.scene.add.text(x, y, text, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
        color: `#${color.toString(16).padStart(6, '0')}`, stroke: '#0b0d16', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(11));
      const y0 = y;
      let age = 0;
      ctx.onFrame((dt) => {
        age += dt;
        label.setY(y0 - (age / 900) * 22);
        label.setAlpha(Phaser.Math.Clamp(1 - age / 900, 0, 1));
      });
    };

    // Five plantings, one seed each, filling the board to the cap.
    const spots = [
      { x: ctx.w * 0.22, y: ctx.h * 0.68 },
      { x: ctx.w * 0.38, y: ctx.h * 0.4 },
      { x: ctx.w * 0.62, y: ctx.h * 0.72 },
      { x: ctx.w * 0.78, y: ctx.h * 0.42 },
      { x: ctx.w * 0.5, y: ctx.h * 0.86 },
    ];
    spots.forEach((spot, i) => {
      ctx.at(600 + i * 1200, () => {
        selected = i;
        const s = seeds[i];
        av.play('slam', Math.atan2(spot.y - ctx.cy, spot.x - ctx.cx));
        fx.overgrowth(spot.x, spot.y, 26);
        fx.pollen(spot.x, spot.y, 8, { life: 600 });
        bed.push({
          type: s.type, x: spot.x, y: spot.y, born: 600 + i * 1200,
          follows: s.type === 'nurse-lily' || s.type === 'cotton',
        });
        say(spot.x, spot.y - 30, `${s.name} · ${s.hp} HP`, SEED_COLOR[s.type]);
        say(spot.x, spot.y - 46, s.note, LIFE.pale);
      });
    });

    // The sixth seed is refused rather than replacing the oldest — the kit's actual rule.
    ctx.at(6800, () => {
      selected = 5;
      say(ctx.cx, ctx.cy - 10, `🌱 ${bed.length}/${CAP} — THE BED IS FULL`, LIFE.rot);
      say(ctx.cx, ctx.cy - 26, 'the sixth is refused, not swapped in', LIFE.rot);
      fx.wilt(ctx.cx, ctx.cy + 10, 22);
    });
    // Then the board earns its keep: the sunflower shoots, the lily heals, cotton keeps up.
    ctx.at(8000, () => {
      const sun = bed.find((p) => p.type === 'sunflower');
      if (sun) fx.petalMuzzle(sun.x, sun.y - 16, -0.3, 1, 6, LIFE.sun);
      const lily = bed.find((p) => p.type === 'nurse-lily');
      if (lily) { fx.healBloom(ctx.cx, ctx.cy, 34); say(ctx.cx, ctx.cy - 34, '+3', LIFE.lily); }
    });
    ctx.at(9400, () => {
      const cot = bed.find((p) => p.type === 'cotton');
      if (!cot) return;
      fx.ring(ctx.cx, ctx.cy, 12, 40, LIFE.cotton, 420, 3, 5);
      say(ctx.cx, ctx.cy - 34, '+50% SPEED · 1s', LIFE.cotton);
    });
  },
};
