import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { LifeFx, LIFE, LifeAvatar } from '../../../elements/kits/LifeVisuals';

function stage(ctx: PreviewCtx): { fx: LifeFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new LifeFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new LifeAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av };
}

/** A plant standing on the floor, drawn with the arena's own `LifeFx.drawPlant`. */
function plantAt(ctx: PreviewCtx, x: number, y: number, kind: string, bornAt: number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - bornAt;
    g.clear();
    if (age < 0) return;
    // Sprouting scale over the first 300ms, then it just stands there breathing.
    const grow = Phaser.Math.Clamp(age / 300, 0, 1);
    LifeFx.drawPlant(g, ctx.tint, kind as never, x, y, elapsed / 1000, { scale: grow });
  });
}

export const petalShotgun: PreviewScript = {
  duration: 1500,
  caption: 'Click — three petals at 8 damage, −15° / 0° / +15°',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.addDummy();
    const fire = (delay: number): void => ctx.at(delay, () => {
      av.play('punch', ctx.aim);
      const angles = [-15, 0, 15].map((d) => d * (Math.PI / 180));
      for (const a of angles) {
        const sx = ctx.cx + Math.cos(a) * 32, sy = ctx.cy + Math.sin(a) * 32;
        fx.petalMuzzle(sx, sy, a, 0.8);
        // The real `proj-life` petal, at the ability's own 480 px/s.
        ctx.fly({
          texture: 'proj-life', from: { x: sx, y: sy },
          to: { x: sx + Math.cos(a) * 300, y: sy + Math.sin(a) * 300 }, speed: 480,
        });
      }
      // Litter shaken loose behind the throw — part of the real cast.
      fx.petalShards(ctx.cx, ctx.cy, 3, 90, 340, 5);
    });
    fire(200);
    fire(900);
  },
};

export const petalShotgunUpgraded: PreviewScript = {
  duration: 1500,
  caption: 'Petal Burst — five petals at 5 damage, a much wider fan',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.addDummy();
    ctx.at(220, () => {
      av.play('punch', ctx.aim);
      for (const deg of [-24, -12, 0, 12, 24]) {
        const a = deg * (Math.PI / 180);
        const sx = ctx.cx + Math.cos(a) * 32, sy = ctx.cy + Math.sin(a) * 32;
        fx.petalMuzzle(sx, sy, a, 0.8);
        // The real `proj-life` petal, at the ability's own 480 px/s.
        ctx.fly({
          texture: 'proj-life', from: { x: sx, y: sy },
          to: { x: sx + Math.cos(a) * 300, y: sy + Math.sin(a) * 300 }, speed: 480,
        });
      }
      fx.petalShards(ctx.cx, ctx.cy, 4, 90, 340, 5);
    });
  },
};

export const plant: PreviewScript = {
  duration: 3600,
  caption: 'E — one seed per cast, five in the ground at once',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setHold('sow', ctx.aim);
    // The whole garden filling up, one seed every 5s in real time — compressed here so the
    // cap of five is legible in a single loop.
    const kinds = ['sunflower', 'rose', 'nurse-lily', 'pitcher', 'cotton'];
    kinds.forEach((kind, i) => {
      const px = ctx.cx + 70 + i * 52;
      const py = ctx.cy + 14 + (i % 2) * 16;
      ctx.at(200 + i * 480, () => {
        fx.overgrowth(px, py, 22);
        fx.spores(px, py, 5, 24, 5);
        plantAt(ctx, px, py, kind, 200 + i * 480);
      });
    });
  },
};

export const plantUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'Verdant Growth — +50% HP on every plant, and the bed can be dragged with the mouse',
  run(ctx) {
    const { fx, av } = stage(ctx);
    av.setHold('sow', ctx.aim);
    // Three plants that can actually be moved — the half of the upgrade nobody expects.
    const kinds = ['sunflower', 'rose', 'nurse-lily'];
    const HP = [25, 75, 25];
    const beds = kinds.map((kind, i) => ({
      kind, hp: HP[i],
      at: { x: ctx.cx + 76 + i * 56, y: ctx.cy + 18 + (i % 2) * 14 },
    }));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const tags = beds.map(() => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#c8f59a', stroke: '#2a1d12', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9)));

    // A cursor that grabs each plant in turn and pulls it somewhere else. The kit does not
    // teleport them — they drift toward where you pull — so the preview lerps rather than snaps.
    let held = -1;
    const pull = { x: 0, y: 0 };
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      cursor.clear();
      beds.forEach((b, i) => {
        if (held === i) {
          b.at.x += (pull.x - b.at.x) * Math.min(1, (dt / 1000) * 3.2);
          b.at.y += (pull.y - b.at.y) * Math.min(1, (dt / 1000) * 3.2);
        }
        LifeFx.drawPlant(g, ctx.tint, b.kind as never, b.at.x, b.at.y, t, { scale: 0.95 });
        // Every plant carries its upgraded pool, not its base one.
        tags[i].setPosition(b.at.x, b.at.y - 34)
          .setText(`${Math.round(b.hp * 1.5)} HP  (was ${b.hp})`);
      });
      if (held < 0) return;
      cursor.lineStyle(1.5, ctx.tint(LIFE.vital), 0.8);
      cursor.strokeCircle(pull.x, pull.y, 9 + 2 * Math.sin(t * 8));
      cursor.lineBetween(pull.x, pull.y, beds[held].at.x, beds[held].at.y - 6);
    });

    ctx.at(300, () => {
      // The HP jump, announced once across the whole bed.
      for (const b of beds) { fx.healBloom(b.at.x, b.at.y, 30); fx.pollen(b.at.x, b.at.y, 8, { life: 700 }); }
      fx.ring(ctx.cx + 132, ctx.cy + 20, 20, 150, LIFE.vital, 560, 4, 5);
    });
    const drag = (at: number, i: number, tx: number, ty: number): void => {
      ctx.at(at, () => {
        held = i;
        pull.x = beds[i].at.x; pull.y = beds[i].at.y;
        fx.spores(beds[i].at.x, beds[i].at.y, 5, 22, 5);
        ctx.at(60, () => { pull.x = tx; pull.y = ty; });
        ctx.at(1100, () => { held = -1; fx.overgrowth(beds[i].at.x, beds[i].at.y, 22); });
      });
    };
    drag(1400, 0, ctx.cx + 62, ctx.cy - 34);
    drag(2900, 1, ctx.cx + 180, ctx.cy - 26);
    drag(4400, 2, ctx.cx + 118, ctx.cy + 48);
  },
};

export const grow: PreviewScript = {
  duration: 2800,
  caption: 'R — plants healed 50% and boosted for 5s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spots = [[100, 10], [156, 24], [212, 6]];
    spots.forEach(([dx, dy], i) => plantAt(ctx, ctx.cx + dx, ctx.cy + dy, ['sunflower', 'rose', 'nurse-lily'][i], 0));
    ctx.at(400, () => {
      av.play('sweep', ctx.aim);
      const gx = ctx.cx + 156, gy = ctx.cy + 14;
      fx.bloomBurst(gx, gy, 110, 16, 5);
      fx.ring(gx, gy, 20, 130, LIFE.sun, 520, 5, 5);
      fx.pollen(gx, gy, 22, { speed: 90, life: 900 });
      for (const [dx, dy] of spots) ctx.at(120, () => fx.healBloom(ctx.cx + dx, ctx.cy + dy, 26));
    });
  },
};

export const growUpgraded: PreviewScript = {
  duration: 7000,
  caption: 'Perma-Fertilize — each cast leaves a permanent stack, up to three blue stars',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spots: [number, number][] = [[100, 10], [156, 24], [212, 6]];
    const kinds = ['sunflower', 'rose', 'nurse-lily'];
    let stacks = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const stars = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      stars.clear();
      spots.forEach(([dx, dy], i) => {
        const x = ctx.cx + dx, y = ctx.cy + dy;
        // `fert` is the kit's own flag — the plant is genuinely painted bigger and faster.
        LifeFx.drawPlant(g, ctx.tint, kinds[i] as never, x, y, t, { fert: stacks > 0 });
        // The blue stars, which are the whole readout of a permanent stack.
        for (let s = 0; s < stacks; s++) {
          const sx = x - 8 + s * 8;
          const sy = y - 32 + Math.sin(t * 2.4 + s) * 1.6;
          stars.fillStyle(ctx.tint(0x66ccff), 0.95);
          for (let p = 0; p < 5; p++) {
            const a = -Math.PI / 2 + (p / 5) * Math.PI * 2;
            stars.fillCircle(sx + Math.cos(a) * 3, sy + Math.sin(a) * 3, 1.5);
          }
          stars.fillStyle(0xffffff, 0.9);
          stars.fillCircle(sx, sy, 1.6);
        }
      });
    });

    // Three casts, three stacks, and then a fourth that does nothing — the cap is the point.
    const cast = (at: number, capped: boolean): void => {
      ctx.at(at, () => {
        av.play('sweep', ctx.aim);
        const gx = ctx.cx + 156, gy = ctx.cy + 14;
        fx.bloomBurst(gx, gy, 110, 16, 5);
        fx.ring(gx, gy, 20, 130, capped ? LIFE.rot : LIFE.sun, 520, 5, 5);
        fx.pollen(gx, gy, 22, { speed: 90, life: 900 });
        for (const [dx, dy] of spots) fx.healBloom(ctx.cx + dx, ctx.cy + dy, 26);
        if (!capped) { stacks += 1; return; }
        const note = ctx.adopt(ctx.scene.add.text(gx, gy - 52, '3 STARS — CAPPED', {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: '#7a5a2a', stroke: '#2a1d12', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(10));
        let age = 0;
        ctx.onFrame((dt) => { age += dt; note.setAlpha(Phaser.Math.Clamp(1 - age / 1400, 0, 1)); });
      });
    };
    cast(400, false);
    cast(1900, false);
    cast(3400, false);
    cast(5200, true);
  },
};

export const thorns: PreviewScript = {
  duration: 4200,
  caption: 'F — one plant untouchable for 3s, then healed to full',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const px = ctx.cx + 150, py = ctx.cy + 12;
    plantAt(ctx, px, py, 'rose', 0);
    ctx.at(300, () => {
      av.play('clap', ctx.aim);
      fx.thicket(px, py, 40, 3000);
      const seal = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 300) / 3000, 0, 1);
        seal.clear();
        if (t >= 1) return;
        seal.lineStyle(2.5, ctx.tint(LIFE.vital), 0.5 + 0.4 * Math.abs(Math.sin(elapsed / 90)));
        seal.strokeCircle(px, py - 8, 34 - 6 * t);
      });
      ctx.at(3000, () => { seal.clear(); fx.healBloom(px, py, 40); fx.ring(px, py, 10, 70, LIFE.lily, 520, 4, 6); });
    });
  },
};

export const thornsUpgraded: PreviewScript = {
  duration: 4200,
  caption: 'Living Roots — the sealed plant lashes for 10 damage and a 15% slow',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const px = ctx.cx + 140, py = ctx.cy + 12;
    plantAt(ctx, px, py, 'rose', 0);
    ctx.addDummy();
    ctx.at(300, () => {
      av.play('clap', ctx.aim);
      fx.thicket(px, py, 40, 3000);
      // The lash is what the upgrade adds, so it repeats across the whole seal.
      for (let i = 0; i < 4; i++) {
        ctx.at(400 + i * 700, () => {
          fx.vineLash(px, py - 6, ctx.tx, ctx.ty, LIFE.thorn);
          fx.thornSpray(ctx.tx, ctx.ty, 6);
        });
      }
      ctx.at(3000, () => fx.healBloom(px, py, 40));
    });
  },
};

export const thornDrag: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'Q — 5s of your incoming damage split across the garden',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spots = [[92, 6], [140, 26], [190, 2], [232, 22]];
    spots.forEach(([dx, dy], i) => plantAt(ctx, ctx.cx + dx, ctx.cy + dy, ['sunflower', 'rose', 'nurse-lily', 'pitcher'][i], 0));
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 900);
      fx.canopy(ctx.cx, ctx.cy, 24, 140, 6);
      fx.bloomBurst(ctx.cx, ctx.cy, 120, 18, 5);
      fx.ring(ctx.cx, ctx.cy, 22, 280, LIFE.pale, 620, 6, 5);
      ctx.at(140, () => fx.ring(ctx.cx, ctx.cy, 18, 350, LIFE.lime, 700, 4, 5));
      fx.spores(ctx.cx, ctx.cy, 7, 110, 4);
      // The redirect: damage arriving at the caster is shared out along tethers to the plants.
      for (let i = 0; i < 4; i++) {
        ctx.at(700 + i * 900, () => {
          fx.flash(ctx.cx, ctx.cy, 22);
          for (const [dx, dy] of spots) {
            fx.vineLash(ctx.cx, ctx.cy, ctx.cx + dx, ctx.cy + dy, LIFE.stem);
            fx.wilt(ctx.cx + dx, ctx.cy + dy, 20);
          }
        });
      }
    });
  },
};

export const thornDragUpgraded: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'Cycle of Life — every plant that dies during it heals you 20 HP',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const spots = [[92, 6], [140, 26], [190, 2], [232, 22]];
    spots.forEach(([dx, dy], i) => plantAt(ctx, ctx.cx + dx, ctx.cy + dy, ['sunflower', 'rose', 'nurse-lily', 'pitcher'][i], 0));
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 900);
      fx.canopy(ctx.cx, ctx.cy, 24, 140, 6);
      fx.bloomBurst(ctx.cx, ctx.cy, 120, 18, 5);
      // Plants burning down one at a time, each returning life to the caster.
      spots.forEach(([dx, dy], i) => {
        ctx.at(700 + i * 800, () => {
          fx.wilt(ctx.cx + dx, ctx.cy + dy, 30);
          fx.spores(ctx.cx + dx, ctx.cy + dy, 8, 26, 5, LIFE.rot);
          fx.vineLash(ctx.cx + dx, ctx.cy + dy, ctx.cx, ctx.cy, LIFE.vital);
          ctx.at(160, () => fx.healBloom(ctx.cx, ctx.cy, 34));
        });
      });
    });
  },
};
