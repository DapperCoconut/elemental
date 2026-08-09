import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  GrowthFx, GROWTH, GrowthAvatar, GrowthCulture, CULTURE_TONES, SICK_TONES,
} from '../../../elements/kits/GrowthVisuals';

/**
 * Growth's showcases.
 *
 * Growth throws no sprites — a bacterium is a Container of an ellipse and three tail beads, a
 * virus is a rotating Triangle, and everything else (nests, spore walls, the culture halo) has
 * a static draw helper on `GrowthFx`. These scripts build the same shapes from the same
 * numbers, and call `GrowthFx` for every gesture, so a retune lands here too.
 */

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: GrowthFx; av: GrowthAvatar } {
  const fx = ctx.capture(() => new GrowthFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new GrowthAvatar(ctx.scene, ctx.tint)) as GrowthAvatar;
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/** The arena's bacterium: an ellipse body, a nucleus, and a three-bead lashing tail. */
function bacterium(
  ctx: PreviewCtx,
  o: { from: { x: number; y: number }; to: { x: number; y: number }; speed?: number; onHit?: () => void },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  const speed = o.speed ?? 460;
  const dist = Phaser.Math.Distance.Between(o.from.x, o.from.y, o.to.x, o.to.y) || 1;
  const ang = Math.atan2(o.to.y - o.from.y, o.to.x - o.from.x);
  const flight = (dist / speed) * 1000;
  let born = -1;
  let hit = false;
  ctx.onFrame((_dt, elapsed) => {
    if (born < 0) born = elapsed;
    const t = (elapsed - born) / flight;
    g.clear();
    if (t >= 1) {
      if (!hit) { hit = true; o.onHit?.(); }
      return;
    }
    const x = o.from.x + Math.cos(ang) * speed * (t * flight / 1000);
    const y = o.from.y + Math.sin(ang) * speed * (t * flight / 1000);
    g.fillStyle(ctx.tint(GROWTH.lime), 0.95);
    g.fillEllipse(x, y, 16, 9);
    g.fillStyle(ctx.tint(GROWTH.rot), 1);
    g.fillCircle(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2, 2.5);
    // The flagellum, lashing behind it rather than trailing straight.
    for (let i = 0; i < 3; i++) {
      const off = 10 + i * 4.5;
      const wag = Math.sin(elapsed / 40 + i) * (2 + i);
      g.fillStyle(ctx.tint(GROWTH.lime), 0.8);
      g.fillCircle(x - Math.cos(ang) * off - Math.sin(ang) * wag,
        y - Math.sin(ang) * off + Math.cos(ang) * wag, 2.4 - i * 0.5);
    }
  });
}

/** The arena's virus: a spinning triangle with a bright rim. */
function virusShot(
  ctx: PreviewCtx,
  o: { from: { x: number; y: number }; to: { x: number; y: number }; onHit?: () => void },
): void {
  const t = ctx.adopt(ctx.scene.add.triangle(o.from.x, o.from.y, 0, -10, 9, 8, -9, 8,
    ctx.tint(CULTURE_TONES.cyto), 0.95).setDepth(6));
  t.setStrokeStyle(2, ctx.tint(CULTURE_TONES.spark), 0.9);
  const dist = Phaser.Math.Distance.Between(o.from.x, o.from.y, o.to.x, o.to.y) || 1;
  const ang = Math.atan2(o.to.y - o.from.y, o.to.x - o.from.x);
  const flight = (dist / 430) * 1000;
  let born = -1;
  let hit = false;
  ctx.onFrame((dt, elapsed) => {
    if (born < 0) born = elapsed;
    const k = (elapsed - born) / flight;
    if (k >= 1) {
      if (!hit) { hit = true; t.setVisible(false); o.onHit?.(); }
      return;
    }
    t.setPosition(o.from.x + Math.cos(ang) * 430 * (k * flight / 1000),
      o.from.y + Math.sin(ang) * 430 * (k * flight / 1000));
    t.rotation += (dt / 1000) * 6;
  });
}

/** A floor virus lying where an infected host coughed it up. */
function floorVirus(ctx: PreviewCtx, o: { x: number; y: number; born: number; healing?: boolean }): void {
  const t = ctx.adopt(ctx.scene.add.triangle(o.x, o.y, 0, -7, 6, 6, -6, 6,
    ctx.tint(o.healing ? GROWTH.spring : CULTURE_TONES.cyto), 0.9).setDepth(3));
  t.setStrokeStyle(1.5, ctx.tint(o.healing ? GROWTH.white : CULTURE_TONES.spark), 0.9);
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    t.setVisible(age >= 0);
    t.setScale(Phaser.Math.Clamp(age / 200, 0, 1));
  });
}

/** A DNA strand on the floor, waiting to be walked over. */
function dnaDrop(ctx: PreviewCtx, o: { x: number; y: number; born: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > 8000) return;
    // A short double helix, spinning where it fell.
    for (let i = 0; i < 6; i++) {
      const p = elapsed / 260 + i * 0.7;
      const dx = Math.sin(p) * 5;
      g.fillStyle(ctx.tint(GROWTH.helix), 0.9);
      g.fillCircle(o.x + dx, o.y - 10 + i * 4, 2);
      g.fillCircle(o.x - dx, o.y - 10 + i * 4, 2);
    }
  });
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const growthClick: PreviewScript = {
  duration: 3400,
  caption: 'Click — 12 damage at 460 px/s, and every 25 damage precipitates a DNA strand',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let dealt = 0;
    // Three shots at the real 0.75s cadence, with the DNA the damage actually earns.
    [200, 950, 1700].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      fx.muzzleBud(ctx.cx + 26, ctx.cy, ctx.aim, 1, 7, CULTURE_TONES);
      bacterium(ctx, {
        from: { x: ctx.cx + 26, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        onHit: () => {
          fx.flash(ctx.tx, ctx.ty, 22);
          fx.motes(ctx.tx, ctx.ty, 5, { speed: 120, life: 420 });
          dealt += 12;
          if (dealt >= 25) { dealt -= 25; dnaDrop(ctx, { x: ctx.tx - 20, y: ctx.ty + 20, born: at + 400 }); }
        },
      });
    }));
  },
};

export const growthClickUpgraded: PreviewScript = {
  duration: 3200,
  caption: 'Chemotaxis — a shot inside 70px wriggles back on course at 6 rad/s and lands anyway',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Deliberately aimed to miss, then corrected — the whole upgrade in one shot.
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.muzzleBud(ctx.cx + 26, ctx.cy, ctx.aim, 1, 7, CULTURE_TONES);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      const p = { x: ctx.cx + 26, y: ctx.cy, ang: -0.42 };
      let hit = false;
      // The 70px detection ring, so it is clear what triggers the correction.
      const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
      ctx.onFrame((_dt, elapsed) => {
        ring.clear();
        ring.lineStyle(1, ctx.tint(GROWTH.shoot), 0.22 + 0.1 * Math.sin(elapsed / 240));
        ring.strokeCircle(ctx.tx, ctx.ty, 70);
      });
      ctx.onFrame((dt, elapsed) => {
        g.clear();
        if (elapsed < 400 || hit) return;
        const s = dt / 1000;
        const d = Phaser.Math.Distance.Between(p.x, p.y, ctx.tx, ctx.ty);
        if (d <= 70) {
          const want = Math.atan2(ctx.ty - p.y, ctx.tx - p.x);
          const diff = Phaser.Math.Angle.Wrap(want - p.ang);
          p.ang += Math.sign(diff) * Math.min(Math.abs(diff), 6 * s);
        }
        p.x += Math.cos(p.ang) * 460 * s;
        p.y += Math.sin(p.ang) * 460 * s;
        g.fillStyle(ctx.tint(GROWTH.lime), 0.95);
        g.fillEllipse(p.x, p.y, 16, 9);
        g.fillStyle(ctx.tint(GROWTH.rot), 1);
        g.fillCircle(p.x + Math.cos(p.ang) * 2, p.y + Math.sin(p.ang) * 2, 2.5);
        for (let i = 0; i < 3; i++) {
          const off = 10 + i * 4.5;
          const wag = Math.sin(elapsed / 40 + i) * (2 + i);
          g.fillStyle(ctx.tint(GROWTH.lime), 0.8);
          g.fillCircle(p.x - Math.cos(p.ang) * off - Math.sin(p.ang) * wag,
            p.y - Math.sin(p.ang) * off + Math.cos(p.ang) * wag, 2.4 - i * 0.5);
        }
        if (d <= 20) { hit = true; g.clear(); fx.flash(ctx.tx, ctx.ty, 22); fx.motes(ctx.tx, ctx.ty, 6, { speed: 130, life: 420 }); }
      });
    });
  },
};

export const growthEvolve: PreviewScript = {
  duration: 5400,
  caption: 'E — the genome opens and you go grey and untouchable for 5s, once every 20s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // The tree itself: three columns of four, drawn as the screen draws them.
    const tree = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const bought = [0, 0, 0];
    const cols = [GROWTH.flush, 0x4488ff, 0xffcc44];
    let open = false;
    ctx.onFrame((_dt, elapsed) => {
      tree.clear();
      if (!open) return;
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 4; r++) {
          const x = ctx.tx - 40 + c * 40, y = ctx.cy - 42 + r * 26;
          const owned = r < bought[c];
          tree.fillStyle(0x0b0d16, 0.92);
          tree.fillRoundedRect(x - 15, y - 9, 30, 18, 4);
          tree.lineStyle(1.5, ctx.tint(cols[c]), owned ? 1 : 0.35);
          tree.strokeRoundedRect(x - 15, y - 9, 30, 18, 4);
          if (!owned) continue;
          tree.fillStyle(ctx.tint(cols[c]), 0.55 + 0.2 * Math.sin(elapsed / 300 + r));
          tree.fillRoundedRect(x - 13, y - 7, 26, 14, 3);
        }
      }
    });
    ctx.at(400, () => {
      open = true;
      av.play('flex');
      // Grey and invincible: the tell is on the caster, not on the menu.
      fx.bloomBody(ctx.cx, ctx.cy, 40, 520, 6, CULTURE_TONES);
      const grey = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 400) / 5000, 0, 1);
        grey.clear();
        if (t >= 1) return;
        grey.fillStyle(0x888888, 0.5);
        grey.fillCircle(ctx.cx, ctx.cy, 22);
        grey.lineStyle(2, 0xbbbbbb, 0.5 * (1 - t));
        grey.strokeCircle(ctx.cx, ctx.cy, 26 + 4 * t);
      });
      // Tiers bought while the clock runs — 1 DNA, then 2, then 3.
      [900, 1800, 2700, 3600].forEach((at, i) => ctx.at(at - 400, () => {
        bought[i % 3] += 1;
        fx.ring(ctx.tx - 40 + (i % 3) * 40, ctx.cy, 4, 22, cols[i % 3], 320, 2, 11);
      }));
      ctx.at(5000, () => { open = false; fx.motes(ctx.cx, ctx.cy, 8, { speed: 90, life: 520 }); });
    });
  },
};

export const growthEvolveUpgraded: PreviewScript = {
  duration: 5600,
  caption: 'Ultimate Evolutions — a 5th row, 6 DNA, one per body: Claws, Chitin Shell or Sweating',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Each capstone shown for what it actually does, in turn.
    ctx.at(400, () => {
      // Claws — the click stops being a projectile inside 90px.
      av.play('sweep', ctx.aim);
      const claw = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 400) / 320, 0, 1);
        claw.clear();
        if (t >= 1) return;
        claw.fillStyle(ctx.tint(GROWTH.pollen), 0.5 * (1 - t));
        claw.slice(ctx.cx, ctx.cy, 90 * (0.4 + 0.6 * t), ctx.aim - Math.PI / 3, ctx.aim + Math.PI / 3, false);
        claw.fillPath();
        for (let i = 0; i < 3; i++) {
          claw.lineStyle(3, ctx.tint(GROWTH.white), 0.85 * (1 - t));
          const a = ctx.aim + (i - 1) * 0.35;
          claw.lineBetween(ctx.cx + Math.cos(a) * 30, ctx.cy + Math.sin(a) * 30,
            ctx.cx + Math.cos(a) * 90 * (0.4 + 0.6 * t), ctx.cy + Math.sin(a) * 90 * (0.4 + 0.6 * t));
        }
      });
      ctx.at(220, () => {
        fx.burst(ctx.tx, ctx.ty, 40);
        const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 34, '35', {
          fontSize: '13px', fontFamily: 'Arial Black', color: '#ccee88',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1100 });
      });
    });
    // Chitin Shell — 75 shield HP, broken, then back in full 15s later.
    ctx.at(2000, () => {
      av.play('flex');
      const shell = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      let hp = 1;
      ctx.onFrame((_dt, elapsed) => {
        shell.clear();
        if (elapsed < 2000 || hp <= 0) return;
        shell.fillStyle(0x8a5a2b, 0.35);
        shell.fillCircle(ctx.cx, ctx.cy, 26);
        shell.lineStyle(3, 0xc08040, 0.85 * hp);
        shell.strokeCircle(ctx.cx, ctx.cy, 26);
      });
      [2400, 2900, 3400].forEach((at, i) => ctx.at(at - 2000, () => {
        hp = 0.66 - i * 0.33;
        fx.flash(ctx.cx, ctx.cy, 24);
        if (i === 2) fx.burst(ctx.cx, ctx.cy, 46);
      }));
    });
    // Sweating — three banked charges and DNA arriving from anywhere.
    ctx.at(4000, () => {
      const pips = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
      ctx.onFrame((_dt, elapsed) => {
        pips.clear();
        for (let i = 0; i < 3; i++) {
          const filled = elapsed > 4000 + i * 300;
          pips.fillStyle(0x0b0d16, 0.9);
          pips.fillCircle(ctx.cx - 20 + i * 20, ctx.cy + 42, 7);
          pips.fillStyle(ctx.tint(GROWTH.helix), filled ? 0.95 : 0.2);
          pips.fillCircle(ctx.cx - 20 + i * 20, ctx.cy + 42, 5);
        }
      });
      fx.creep(ctx.tx, ctx.ty, ctx.cx, ctx.cy, 4, CULTURE_TONES);
    });
  },
};

export const growthVirus: PreviewScript = {
  duration: 6000,
  caption: 'R — 10 damage and 8s infected: they cough 3 floor viruses every 2s, 6 damage each',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      fx.muzzleBud(ctx.cx + 16, ctx.cy, ctx.aim, 1.4, 7, CULTURE_TONES);
      virusShot(ctx, {
        from: { x: ctx.cx + 16, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        onHit: () => {
          fx.burst(ctx.tx, ctx.ty, 34);
          fx.film(ctx.tx, ctx.ty, 26, 1, CULTURE_TONES);
          const label = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 38, '🦠 INFECTED 8s', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#aadd44',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: label, alpha: 0, duration: 1600 });
          // Four batches of three, at the real 2s cadence.
          for (let b = 0; b < 4; b++) {
            ctx.at(b * 2000, () => {
              fx.haze(ctx.tx, ctx.ty, 4, 30, 5, CULTURE_TONES);
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + b;
                floorVirus(ctx, {
                  x: ctx.tx + Math.cos(a) * (26 + b * 6),
                  y: ctx.ty + Math.sin(a) * (20 + b * 5),
                  born: 700 + b * 2000,
                });
              }
            });
          }
        },
      });
    });
  },
};

export const growthVirusUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'Kind Strain — half the batches also drop a green virus only you can eat: +30 HP',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      virusShot(ctx, {
        from: { x: ctx.cx + 16, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        onHit: () => {
          fx.burst(ctx.tx, ctx.ty, 34);
          for (let b = 0; b < 3; b++) {
            ctx.at(b * 2000, () => {
              fx.haze(ctx.tx, ctx.ty, 4, 30, 5, CULTURE_TONES);
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + b;
                floorVirus(ctx, { x: ctx.tx + Math.cos(a) * 28, y: ctx.ty + Math.sin(a) * 22, born: 700 + b * 2000 });
              }
              // The green one — half the time, and it belongs to you.
              if (b % 2 === 0) {
                floorVirus(ctx, { x: ctx.tx - 40, y: ctx.ty + 26, born: 700 + b * 2000, healing: true });
                ctx.at(700, () => {
                  fx.creep(ctx.tx - 40, ctx.ty + 26, ctx.cx, ctx.cy, 4, CULTURE_TONES);
                  const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 40, '+30', {
                    fontSize: '12px', fontFamily: 'Arial Black', color: '#66ff99',
                  }).setOrigin(0.5).setDepth(12));
                  ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1000 });
                });
              }
            });
          }
        },
      });
    });
  },
};

export const sporeSpray: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'F — 5 pods 130ms apart at 50 HP each, thickening +10 max HP/s to 100 over 5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spores: { x: number; y: number; born: number; hp: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const s of spores) {
        const age = elapsed - s.born;
        if (age < 0 || age > 10000) continue;
        // Maturity is the whole ability: the wall is stronger the longer it stands.
        const maturity = Phaser.Math.Clamp(age / 5000, 0, 1);
        GrowthFx.drawSporeWall(g, ctx.tint, CULTURE_TONES,
          s.x, s.y, 15 + maturity * 6, elapsed / 1000, maturity, s.hp, false);
      }
    });
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      for (let i = 0; i < 5; i++) {
        ctx.at(i * 130, () => {
          const x = ctx.cx + 90, y = ctx.cy - 70 + i * 35;
          spores.push({ x, y, born: 300 + i * 130, hp: 1 });
          fx.sporeJet(ctx.cx + 20, ctx.cy, Math.atan2(y - ctx.cy, x - ctx.cx), 70, 4, CULTURE_TONES);
          fx.motes(x, y, 4, { speed: 70, life: 460 });
        });
      }
    });
    // Rounds arriving and being eaten by the wall rather than by you.
    [2200, 2900, 3600, 4300].forEach((at, i) => ctx.at(at, () => {
      const s = spores[i % spores.length];
      fx.flash(s.x, s.y, 20);
      fx.motes(s.x, s.y, 5, { speed: 130, life: 380 });
      s.hp = Math.max(0.25, s.hp - 0.25);
    }));
  },
};

export const sporeSprayUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Spore Cloud — a pod that reaches full maturity has a 25% chance to bud another',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spores: { x: number; y: number; born: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const s of spores) {
        const age = elapsed - s.born;
        if (age < 0 || age > 10000) continue;
        const maturity = Phaser.Math.Clamp(age / 5000, 0, 1);
        GrowthFx.drawSporeWall(g, ctx.tint, CULTURE_TONES,
          s.x, s.y, 15 + maturity * 6, elapsed / 1000, maturity, 1, false);
      }
    });
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      for (let i = 0; i < 3; i++) {
        ctx.at(i * 130, () => {
          const x = ctx.cx + 80, y = ctx.cy - 40 + i * 40;
          spores.push({ x, y, born: 300 + i * 130 });
          fx.sporeJet(ctx.cx + 20, ctx.cy, Math.atan2(y - ctx.cy, x - ctx.cx), 60, 4, CULTURE_TONES);
        });
      }
    });
    // Full maturity at 5s, and the buds that follow — and bud in turn.
    ctx.at(5400, () => {
      spores.slice(0, 3).forEach((s, i) => {
        ctx.at(i * 220, () => {
          const bx = s.x + 46 + i * 8, by = s.y + (i % 2 ? 22 : -22);
          spores.push({ x: bx, y: by, born: 5400 + i * 220 });
          fx.bloom(bx, by, 30, 8, 5, CULTURE_TONES);
          fx.motes(bx, by, 6, { speed: 90, life: 520 });
        });
      });
    });
  },
};

export const auxiliaryGrowth: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Q — 8 DNA: a 100 HP nest fills at 5 HP/s, then hatches a 200 HP clone. SPACE swaps',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const nx = ctx.tx, ny = ctx.ty;
    const nest = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let fill = 0;
    let hatched = false;
    ctx.onFrame((dt, elapsed) => {
      nest.clear();
      if (elapsed < 400 || hatched) return;
      // 5 HP a second into a 100 HP nest — the incubation is a real, attackable object.
      fill = Math.min(1, fill + (dt / 1000) * (5 / 100) * 8);
      GrowthFx.drawNest(nest, ctx.tint, CULTURE_TONES, nx, ny, 26, elapsed / 1000, fill);
    });
    ctx.at(400, () => {
      av.play('raise', ctx.aim, 700);
      fx.channelIncubate(nx, ny, 40, 900);
      fx.ring(nx, ny, 6, 46, GROWTH.shoot, 460, 4, 3);
    });
    // The hatch, and the clone fighting on its own from then on.
    ctx.at(3000, () => {
      hatched = true;
      nest.clear();
      fx.bloomBody(nx, ny, 46, 620, 6, CULTURE_TONES);
      fx.burst(nx, ny, 50);
      const clone = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
      const culture = ctx.capture(() => new GrowthCulture(ctx.scene, ctx.tint, CULTURE_TONES, 22, 1, 4, 9));
      const p = { x: nx, y: ny };
      ctx.onFrame((dt, elapsed) => {
        // 140 px/s, engaging and backing off exactly as the clone AI does.
        const k = elapsed - 3000;
        p.x += Math.cos(k / 700) * 140 * (dt / 1000);
        p.y += Math.sin(k / 500) * 140 * (dt / 1000);
        clone.clear();
        clone.fillStyle(ctx.tint(GROWTH.moss), 1); clone.fillCircle(p.x, p.y, 17);
        clone.fillStyle(ctx.tint(GROWTH.lime), 1); clone.fillCircle(p.x, p.y, 13);
        culture.update(dt, p.x, p.y, 1);
      });
      // Its own click, on its own 0.9s clock.
      for (let i = 0; i < 3; i++) {
        ctx.at(600 + i * 900, () => bacterium(ctx, { from: { x: p.x, y: p.y }, to: { x: ctx.cx, y: ctx.cy - 60 } }));
      }
      const t = ctx.adopt(ctx.scene.add.text(nx, ny - 44, 'SPACE — swap bodies', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ccee88',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, alpha: 0, duration: 2200 });
    });
  },
};

export const auxiliaryGrowthUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Mutation — every clone hatches a strain: yellow +25% speed, blue −25% taken, red +25% dealt',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const strains: Array<{ c: number; label: string; x: number }> = [
      { c: 0xffee44, label: '+25% SPEED', x: ctx.cx + 60 },
      { c: 0x4488ff, label: '−25% TAKEN', x: ctx.cx + 150 },
      { c: 0xff4444, label: '+25% DEALT', x: ctx.cx + 240 },
    ];
    strains.forEach((s, i) => {
      ctx.at(400 + i * 900, () => {
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
        const born = 400 + i * 900;
        ctx.onFrame((_dt, elapsed) => {
          const age = elapsed - born;
          g.clear();
          if (age < 0) return;
          const grow = Phaser.Math.Clamp(age / 300, 0, 1);
          g.fillStyle(ctx.tint(GROWTH.rot), 0.9); g.fillCircle(s.x, ctx.cy, 18 * grow);
          g.fillStyle(s.c, 1); g.fillCircle(s.x, ctx.cy, 14 * grow);
          g.fillStyle(ctx.tint(GROWTH.rot), 1);
          g.fillCircle(s.x - 4, ctx.cy - 3, 2.6 * grow);
          g.fillCircle(s.x + 4, ctx.cy - 3, 2.6 * grow);
        });
        fx.bloomBody(s.x, ctx.cy, 40, 520, 6, CULTURE_TONES);
        fx.ring(s.x, ctx.cy, 5, 40, s.c, 420, 3, 4);
        const t = ctx.adopt(ctx.scene.add.text(s.x, ctx.cy - 36, s.label, {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ffffff',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 2400 });
      });
    });
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveDna: PreviewScript = {
  duration: 6000,
  caption: 'Passive — 1 DNA per 25 damage dealt, 8s on the floor to collect it, 10 held at most',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let dealt = 0;
    let held = 0;
    // The wallet, drawn as the HUD draws it.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 52, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#44ddaa',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame(() => {
      bar.clear();
      bar.fillStyle(0x0b0d16, 0.9);
      bar.fillRoundedRect(ctx.cx - 32, ctx.cy - 42, 64, 8, 4);
      bar.fillStyle(ctx.tint(GROWTH.helix), 0.95);
      bar.fillRoundedRect(ctx.cx - 31, ctx.cy - 41, 62 * (dealt / 25), 6, 3);
      label.setText(`🧬 ${held}/10`);
    });
    // Clicks landing, and the strand that precipitates every 25 damage.
    for (let i = 0; i < 6; i++) {
      ctx.at(300 + i * 800, () => {
        av.play('punch', ctx.aim);
        bacterium(ctx, {
          from: { x: ctx.cx + 26, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
          onHit: () => {
            fx.flash(ctx.tx, ctx.ty, 20);
            dealt += 12;
            if (dealt >= 25) {
              dealt -= 25;
              const dx = ctx.tx - 30, dy = ctx.ty + 24;
              dnaDrop(ctx, { x: dx, y: dy, born: 300 + i * 800 + 300 });
              // You still have to go and get it.
              ctx.at(700, () => { fx.creep(dx, dy, ctx.cx, ctx.cy, 4, CULTURE_TONES); held += 1; });
            }
          },
        });
      });
    }
  },
};

export const passiveInfection: PreviewScript = {
  duration: 6400,
  caption: 'Passive — a host sheds 3 floor viruses every 2s for 8s: 12 mines, 6 damage each',
  run(ctx) {
    const { fx } = stage(ctx);
    fx.film(ctx.tx, ctx.ty, 26, 1, CULTURE_TONES);
    const label = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 40, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#aadd44',
    }).setOrigin(0.5).setDepth(12));
    let shed = 0;
    ctx.onFrame((_dt, elapsed) => {
      const left = Math.max(0, 8 - elapsed / 1000);
      label.setText(left > 0 ? `🦠 INFECTED ${left.toFixed(1)}s  ·  ${shed} viruses` : '');
    });
    // Four batches, at the real cadence, spreading outward as the host moves.
    for (let b = 0; b < 4; b++) {
      ctx.at(300 + b * 2000, () => {
        fx.haze(ctx.tx, ctx.ty, 4, 30, 5, CULTURE_TONES);
        fx.motes(ctx.tx, ctx.ty, 5, { speed: 110, life: 520 });
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + b * 0.8;
          floorVirus(ctx, {
            x: ctx.tx + Math.cos(a) * (24 + b * 10),
            y: ctx.ty + Math.sin(a) * (18 + b * 8),
            born: 300 + b * 2000,
          });
          shed += 1;
        }
      });
    }
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkVirus: PreviewScript = {
  duration: 6400,
  caption: 'Perk — 12s infections, 5 viruses every 1.4s, and every hit re-infects for 3s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      virusShot(ctx, {
        from: { x: ctx.cx + 16, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        onHit: () => {
          fx.burst(ctx.tx, ctx.ty, 34);
          fx.film(ctx.tx, ctx.ty, 30, 1, CULTURE_TONES);
          // Five at a time, every 1.4s — the floor fills instead of speckling.
          for (let b = 0; b < 4; b++) {
            ctx.at(b * 1400, () => {
              fx.haze(ctx.tx, ctx.ty, 5, 34, 5, CULTURE_TONES);
              for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + b * 0.5;
                floorVirus(ctx, {
                  x: ctx.tx + Math.cos(a) * (24 + b * 9),
                  y: ctx.ty + Math.sin(a) * (18 + b * 7),
                  born: 700 + b * 1400,
                });
              }
            });
          }
          // And the re-infection: the outbreak seeds itself off its own debris.
          ctx.at(3400, () => {
            fx.ring(ctx.tx, ctx.ty, 8, 60, GROWTH.sprout, 480, 3, 4);
            const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 40, '🦠 RE-INFECTED 3s', {
              fontSize: '11px', fontFamily: 'Arial Black', color: '#aadd44',
            }).setOrigin(0.5).setDepth(12));
            ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
          });
        },
      });
    });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masterySecretUpgrades: PreviewScript = {
  duration: 6000,
  caption: 'Mastery passive — 2 of 9 secret mutations offered per load-in, 8 DNA each, unsellable',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pool = ['Brood', 'Ruler', 'Viral Consumption', 'Mitosis', 'Crawling Spores', 'Pandemic', 'R Specialized', 'K Specialized', 'Apex'];
    const rolled = [0, 5];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const labels = pool.map((n, i) => ctx.adopt(ctx.scene.add.text(
      ctx.tx, ctx.cy - 76 + i * 19, n,
      { fontSize: '9px', fontFamily: 'Arial Black', color: '#3d4358' },
    ).setOrigin(0.5).setDepth(10)));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      pool.forEach((_, i) => {
        const on = rolled.includes(i) && elapsed > 600 + rolled.indexOf(i) * 500;
        g.fillStyle(0x0b0d16, 0.9);
        g.fillRoundedRect(ctx.tx - 56, ctx.cy - 85 + i * 19, 112, 16, 4);
        g.lineStyle(1.2, ctx.tint(GROWTH.helix), on ? 0.95 : 0.16);
        g.strokeRoundedRect(ctx.tx - 56, ctx.cy - 85 + i * 19, 112, 16, 4);
        labels[i].setColor(on ? '#44ddaa' : '#3d4358');
      });
    });
    ctx.at(600, () => { av.play('flex'); fx.ring(ctx.tx, ctx.cy - 76, 4, 60, GROWTH.helix, 420, 2, 10); });
    ctx.at(1100, () => fx.ring(ctx.tx, ctx.cy - 76 + 5 * 19, 4, 60, GROWTH.helix, 420, 2, 10));
    // 8 DNA each — expensive, and there is no selling them back.
    ctx.at(2400, () => {
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 40, '8 🧬 EACH · NO REFUND', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#44ddaa',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 2600 });
    });
  },
};

export const masterySyringeShot: PreviewScript = {
  duration: 6400,
  caption: 'Mastery — no impact damage: 10s of Sickness at 2 dmg/s, and a whole second tree',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      // Small and very fast — and it does nothing at all when it lands.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      const from = { x: ctx.cx + 26, y: ctx.cy };
      let landed = false;
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 400) / 160, 0, 1);
        g.clear();
        if (t >= 1) {
          if (!landed) { landed = true; fx.flash(ctx.tx, ctx.ty, 18, 7, SICK_TONES); }
          return;
        }
        const x = from.x + (ctx.tx - from.x) * t;
        g.lineStyle(3, ctx.tint(GROWTH.white), 0.95);
        g.lineBetween(x - 12, ctx.cy, x + 6, ctx.cy);
        g.fillStyle(ctx.tint(GROWTH.gore), 1);
        g.fillRect(x - 12, ctx.cy - 3, 9, 6);
      });
      // Then 10 seconds of illness, ticking twice the rate the box has room for.
      ctx.at(200, () => {
        fx.film(ctx.tx, ctx.ty, 26, 1, SICK_TONES);
        const label = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 40, '', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#ff5566',
        }).setOrigin(0.5).setDepth(12));
        ctx.onFrame((_dt, elapsed) => {
          const left = Math.max(0, 10 - (elapsed - 600) / 1000 * 2);
          label.setText(left > 0 ? `🤢 SICK ${left.toFixed(1)}s` : '');
        });
        for (let i = 1; i <= 10; i++) {
          ctx.at(i * 500, () => {
            fx.haze(ctx.tx, ctx.ty, 2, 22, 5, SICK_TONES);
            const t = ctx.adopt(ctx.scene.add.text(ctx.tx + ((i % 3) - 1) * 12, ctx.ty - 22, '2', {
              fontSize: '10px', fontFamily: 'Arial', color: '#ff5566',
            }).setOrigin(0.5).setDepth(12));
            ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 700 });
          });
        }
      });
    });
    // The second tree it opens: Lethality, Transmission, Severity.
    ctx.at(2600, () => {
      const names = ['LETHALITY', 'TRANSMISSION', 'SEVERITY'];
      const cols = [0xff3344, 0xdd8844, 0xaa4466];
      names.forEach((n, i) => {
        const t = ctx.adopt(ctx.scene.add.text(ctx.cx - 10, ctx.cy - 54 + i * 16, n, {
          fontSize: '9px', fontFamily: 'Arial Black', color: `#${cols[i].toString(16).padStart(6, '0')}`,
        }).setOrigin(0.5).setDepth(11));
        ctx.scene.tweens.add({ targets: t, alpha: { from: 0, to: 1 }, duration: 400, delay: i * 200 });
      });
    });
  },
};
