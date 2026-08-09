import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { OilFx, OIL, OilAvatar, DroneArrayLattice } from '../../../elements/kits/OilVisuals';

/**
 * Oil's showcases.
 *
 * Oil throws almost nothing — its damage arrives as drone beams, rolling drums and a
 * locomotive, all of which are Graphics the kit repaints rather than sprites it launches. So
 * these scripts lean on `OilFx`'s static draw helpers (`drawDrone`, `drawBarrel`, `drawPuddle`,
 * `drawGenerator`, `drawTurret`, `drawTrainCar`, `drawCoal`), which is the same art the arena
 * paints, driven from the same numbers.
 */

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: OilFx; av: OilAvatar } {
  const fx = ctx.capture(() => new OilFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new OilAvatar(ctx.scene, ctx.tint)) as OilAvatar;
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/** One drone on station, drawn by the kit's own `drawDrone` in its own Graphics. */
interface PreviewDrone { g: Phaser.GameObjects.Graphics; angle: number; shots: number; max: number; spin: number; overcharged: boolean }

function swarm(ctx: PreviewCtx, o: { count: number; max?: number; shots?: number }): PreviewDrone[] {
  const drones: PreviewDrone[] = [];
  const cap = o.max ?? 6;
  for (let i = 0; i < o.count; i++) {
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    drones.push({ g, angle: (i / cap) * Math.PI * 2, shots: o.shots ?? 3, max: o.shots ?? 3, spin: Math.random() * 6, overcharged: false });
  }
  ctx.onFrame((dt) => {
    for (const d of drones) {
      d.angle += (dt / 1000) * 0.9;
      d.spin += dt / 40;
      d.g.setPosition(ctx.cx + Math.cos(d.angle) * 46, ctx.cy + Math.sin(d.angle) * 46);
      d.g.clear();
      OilFx.drawDrone(d.g, ctx.tint, ctx.aim, d.spin, d.shots, d.max, 1, d.overcharged);
    }
  });
  return drones;
}

/** A live oil puddle, repainted the way `updateOilPuddles` repaints the real ones. */
function puddle(
  ctx: PreviewCtx, o: { x: number; y: number; born: number; life?: number; ignited?: boolean },
): { ignite: () => void } {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const seed = (o.x * 0.31 + o.y * 0.17) % 10;
  const life = o.life ?? 12000;
  let lit = !!o.ignited;
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > life) return;
    const left = life - age;
    OilFx.drawPuddle(g, ctx.tint, o.x, o.y, 30, elapsed / 1000,
      left < 600 ? left / 600 : 1, seed, lit);
  });
  return { ignite: () => { lit = true; } };
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const droneCommand: PreviewScript = {
  duration: 6000,
  caption: 'Click — hold to build (0.5s then 1/s, cap 6); tap to fire the whole fleet for 3 each',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 0 });
    // Held: one airframe assembles at 0.5s, then one a second.
    av.setHold('spray', ctx.aim);
    for (let i = 0; i < 6; i++) {
      ctx.at(500 + i * 1000 * 0.55, () => {
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        drones.push({ g, angle: (i / 6) * Math.PI * 2, shots: 3, max: 3, spin: 0, overcharged: false });
        const sx = ctx.cx + Math.cos((i / 6) * Math.PI * 2) * 46;
        const sy = ctx.cy + Math.sin((i / 6) * Math.PI * 2) * 46;
        fx.sparks(sx, sy, 7, { speed: 110, life: 320, fall: 40, depth: 9 });
        fx.smoke(sx, sy, 2, 9, 6);
        fx.ring(sx, sy, 3, 24, OIL.gold, 300, 2.5, 8);
      });
    }
    // Then the tap: every lens snaps to the cursor at once, 3 damage each.
    ctx.at(4400, () => {
      av.setHold(null);
      av.play('punch', ctx.aim);
      for (const d of drones) {
        const a = Math.atan2(ctx.ty - d.g.y, ctx.tx - d.g.x);
        fx.muzzleFlash(d.g.x + Math.cos(a) * 6, d.g.y + Math.sin(a) * 6, a, 0.55, 9);
        fx.beam(d.g.x, d.g.y, ctx.tx, ctx.ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });
        d.shots -= 1;
      }
      fx.flash(ctx.tx, ctx.ty, 26);
      const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 34, '18', {
        fontSize: '13px', fontFamily: 'Arial Black', color: '#ffaa00',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1200 });
    });
  },
};

export const droneCommandUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Bomb Drones — a drone out of shots tumbles to the mark and detonates for 5 in 60px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 3, shots: 1 });
    ctx.at(600, () => {
      av.play('punch', ctx.aim);
      for (const d of drones) {
        const a = Math.atan2(ctx.ty - d.g.y, ctx.tx - d.g.x);
        fx.beam(d.g.x, d.g.y, ctx.tx, ctx.ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });
        d.shots = 0;
        void a;
      }
      // The spent frames: 0.4s tumble under smoke, then a real detonation each.
      ctx.at(300, () => {
        drones.forEach((d, i) => {
          const from = { x: d.g.x, y: d.g.y };
          d.g.clear();
          const tumble = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
          const born = 900 + i * 160;
          ctx.onFrame((_dt, elapsed) => {
            const t = Phaser.Math.Clamp((elapsed - born) / 400, 0, 1);
            tumble.clear();
            if (t <= 0 || t >= 1) return;
            tumble.setPosition(from.x + (ctx.tx - from.x) * t, from.y + (ctx.ty - from.y) * t);
            tumble.setRotation(t * Math.PI * 2);
            OilFx.drawDrone(tumble, ctx.tint, 0, elapsed / 40, 0, 3, 1, false);
            if (elapsed % 90 < 20) fx.smoke(tumble.x, tumble.y, 1, 4, 5);
          });
          ctx.at(600 + i * 160, () => {
            tumble.clear();
            fx.explosion(ctx.tx, ctx.ty, 60, { debris: 5, smoke: 3 });
          });
        });
      });
    });
    // And the other half of the upgrade: the orbit itself now bites.
    ctx.at(3800, () => {
      fx.ring(ctx.cx + 40, ctx.cy, 4, 26, OIL.gold, 280, 3, 9);
      fx.sparks(ctx.cx + 40, ctx.cy, 5, { speed: 120, life: 280, depth: 9 });
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx + 40, ctx.cy - 28, '5', {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#ffaa00',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900 });
    });
  },
};

export const barrelRoll: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'E — 300 px/s, a puddle every 80px, and 20 damage in 50px when anything touches it',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const b = { x: ctx.cx, y: ctx.cy, roll: 0, dist: 0, lastDrop: 0, alive: false, trailX: ctx.cx, trailY: ctx.cy, trailAcc: 0 };
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!b.alive) return;
      const step = 300 * (dt / 1000);
      b.x += step;
      b.dist += step;
      // 21px half-drum, so the staves scroll at exactly the rate the ground demands.
      b.roll += step / 21;
      b.trailAcc += step;
      if (b.trailAcc >= 30) {
        b.trailAcc = 0;
        fx.skid(b.trailX, b.trailY, b.x, b.y, 2);
        b.trailX = b.x; b.trailY = b.y;
      }
      if (b.dist - b.lastDrop >= 80) {
        b.lastDrop = b.dist;
        puddle(ctx, { x: b.x, y: b.y, born: elapsed });
        fx.spatter(b.x, b.y, 5, { speed: 90, size: 3, life: 420, fall: 50, depth: 3 });
      }
      g.setPosition(b.x, b.y);
      OilFx.drawBarrel(g, ctx.tint, b.roll, 1, false);
      if (b.x >= ctx.tx) {
        b.alive = false;
        g.clear();
        // Touching the enemy sets it off — you never chose the moment.
        fx.explosion(b.x, b.y, 70, { spatter: 11, smoke: 3, debris: 8, duration: 440 });
        for (let i = 0; i < 2; i++) {
          puddle(ctx, { x: b.x + (i ? 22 : -18), y: b.y + (i ? -14 : 16), born: elapsed });
        }
      }
    });
    ctx.at(300, () => { av.play('sweep', ctx.aim); b.alive = true; fx.ring(ctx.cx, ctx.cy, 6, 40, OIL.amber, 320, 3, 5); });
  },
};

export const barrelRollUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Barrel Roll — ride it: 300 px/s steering 150°/s at the cursor, still a bomb underneath you',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    // The rider is glued to the drum, so the script drives both from one position.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const rider = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const b = { x: ctx.cx, y: ctx.cy, ang: 0, roll: 0, dist: 0, lastDrop: 0, dust: 0 };
    ctx.onFrame((dt, elapsed) => {
      const s = dt / 1000;
      // Steering toward a moving cursor at the real 150° per second.
      const want = Math.atan2(
        ctx.cy + Math.cos(elapsed / 700) * 60 - b.y,
        ctx.cx + 200 + Math.sin(elapsed / 520) * 90 - b.x,
      );
      const diff = Phaser.Math.Angle.Wrap(want - b.ang);
      b.ang += Math.sign(diff) * Math.min(Math.abs(diff), (150 * Math.PI / 180) * s);
      const step = 300 * s;
      b.x += Math.cos(b.ang) * step;
      b.y += Math.sin(b.ang) * step;
      b.dist += step;
      b.roll += step / 21;
      if (b.dist - b.lastDrop >= 80) { b.lastDrop = b.dist; puddle(ctx, { x: b.x, y: b.y, born: elapsed }); }
      b.dust += dt;
      if (b.dust >= 110) {
        b.dust -= 110;
        const back = b.ang + Math.PI;
        fx.spatter(b.x + Math.cos(back) * 20, b.y + Math.sin(back) * 20, 3,
          { angle: back, spread: 0.7, speed: 120, size: 3.6, life: 480, fall: 60, depth: 5 });
      }
      g.clear(); g.setPosition(b.x, b.y); g.setRotation(b.ang);
      OilFx.drawBarrel(g, ctx.tint, b.roll, 1, true);
      // The rider drawn on top, because the drum sits at depth 4 for exactly this reason.
      rider.clear();
      rider.fillStyle(ctx.tint(OIL.brown), 1); rider.fillCircle(b.x, b.y - 4, 15);
      rider.fillStyle(ctx.tint(OIL.amber), 1); rider.fillCircle(b.x, b.y - 4, 11);
    });
  },
};

export const droneDestroy: PreviewScript = {
  duration: 3800,
  caption: 'R — one whole drone spent: 500ms of flight, then 20 damage in a 60px radius',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 3 });
    ctx.at(500, () => {
      av.play('punch', ctx.aim);
      const d = drones.pop()!;
      const from = { x: d.g.x, y: d.g.y };
      fx.muzzleFlash(from.x, from.y, Math.atan2(from.y - ctx.ty, from.x - ctx.tx), 0.7, 9);
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 500) / 500, 0, 1);
        d.g.clear();
        if (t >= 1) return;
        d.g.setPosition(from.x + (ctx.tx - from.x) * t, from.y + (ctx.ty - from.y) * t);
        OilFx.drawDrone(d.g, ctx.tint, ctx.aim, elapsed / 40, d.shots, d.max, 1, false);
        // Exhaust out the back, and the arming lamp beating faster the closer it gets.
        if (elapsed % Math.max(40, 140 - t * 100) < 20) fx.smoke(d.g.x, d.g.y, 1, 4, 5);
      });
      ctx.at(500, () => fx.explosion(ctx.tx, ctx.ty, 68, { debris: 6, smoke: 3 }));
    });
  },
};

export const droneDestroyUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Overclock — dumps 4 damage per remaining shot at the cursor, then blasts for 5×shots+5',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 3 });
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      const d = drones.pop()!;
      // It glows blue for the whole sequence — the tell that the magazine is coming out first.
      d.overcharged = true;
      const from = { x: d.g.x, y: d.g.y };
      ctx.onFrame((_dt, elapsed) => {
        if (elapsed < 400 || elapsed > 1800) return;
        d.g.clear();
        d.g.setPosition(from.x, from.y);
        OilFx.drawDrone(d.g, ctx.tint, ctx.aim, elapsed / 30, d.shots, d.max, 1, true);
      });
      // 340ms charge, then three bullets 90ms apart at 4 damage each.
      fx.ring(from.x, from.y, 4, 30, OIL.teal, 340, 3, 9);
      for (let i = 0; i < 3; i++) {
        ctx.at(340 + i * 90, () => {
          fx.beam(from.x, from.y, ctx.tx, ctx.ty, { width: 2.2, color: OIL.teal, duration: 180, impact: 8, depth: 8 });
          const t = ctx.adopt(ctx.scene.add.text(ctx.tx + (i - 1) * 14, ctx.ty - 30, '4', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#2fd6c0',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 900 });
        });
      }
      // Then the run in, and a blast still sized off the magazine it started with.
      ctx.at(900, () => {
        ctx.onFrame((_dt, elapsed) => {
          const t = Phaser.Math.Clamp((elapsed - 1300) / 500, 0, 1);
          if (t <= 0) return;
          d.g.clear();
          if (t >= 1) return;
          d.g.setPosition(from.x + (ctx.tx - from.x) * t, from.y + (ctx.ty - from.y) * t);
          OilFx.drawDrone(d.g, ctx.tint, ctx.aim, elapsed / 30, 0, d.max, 1, true);
        });
        ctx.at(900, () => {
          fx.explosion(ctx.tx, ctx.ty, 68, { debris: 6, smoke: 3 });
          const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 40, '20', {
            fontSize: '13px', fontFamily: 'Arial Black', color: '#ff6600',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1100 });
        });
      });
    });
  },
};

export const shieldGen: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'F — a 150px dome for 5s: every enemy round deleted, 8 damage where it comes apart',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const gx = ctx.cx + 110, gy = ctx.cy;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let placedAt = -1;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (placedAt < 0) return;
      // The lens dims across the whole window, so the time left is readable off the plinth.
      const ratio = Phaser.Math.Clamp(1 - (elapsed - placedAt) / 5000, 0, 1);
      OilFx.drawGenerator(g, ctx.tint, gx, gy, elapsed / 1000, ratio > 0, 0, ratio, 150);
    });
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      placedAt = 300;
      fx.ring(gx, gy, 4, 40, OIL.chrome, 300, 4, 4);
      fx.sparks(gx, gy, 10, { speed: 170, life: 340, depth: 9 });
      fx.ring(gx, gy, 20, 150, OIL.teal, 480, 3, 4);
    });
    // Rounds arriving and being taken apart inside the field.
    [1000, 1900, 2800, 3700].forEach((at, i) => ctx.at(at, () => {
      const ix = gx + 90 - i * 14, iy = gy + (i % 2 ? 30 : -30);
      fx.beam(gx, gy, ix, iy, { width: 3, color: OIL.teal, duration: 200, impact: 12, depth: 9 });
      fx.ring(ix, iy, 3, 30, OIL.teal, 280, 3, 9);
      fx.shrapnel(ix, iy, 4, 26, 9);
      const t = ctx.adopt(ctx.scene.add.text(ix, iy - 24, '8', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#2fd6c0',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900 });
    }));
    // And the discharge at 5s — the field simply stops.
    ctx.at(5300, () => {
      fx.smoke(gx, gy, 2, 10, 3);
      fx.sparks(gx, gy, 5, { speed: 70, life: 400, depth: 9 });
    });
  },
};

export const shieldGenUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Shield Boost — the plinth grimes up with the scrap of every second kill (window stays 5s)',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const gx = ctx.cx + 110, gy = ctx.cy;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let scrap = 0;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const ratio = Phaser.Math.Clamp(1 - (elapsed - 300) / 5000, 0, 1);
      if (elapsed < 300) return;
      OilFx.drawGenerator(g, ctx.tint, gx, gy, elapsed / 1000, ratio > 0, scrap, ratio, 150);
    });
    ctx.at(300, () => fx.ring(gx, gy, 20, 150, OIL.teal, 480, 3, 4));
    // Ten interceptions, a scrap every second one, up to the 10-scrap grime cap.
    for (let i = 0; i < 10; i++) {
      ctx.at(700 + i * 420, () => {
        const ix = gx + 100 - i * 6, iy = gy + Math.sin(i) * 40;
        fx.beam(gx, gy, ix, iy, { width: 3, color: OIL.teal, duration: 200, impact: 12, depth: 9 });
        fx.shrapnel(ix, iy, 4, 26, 9);
        if (i % 2 === 1) scrap += 1;
      });
    }
  },
};

export const trainMorph: PreviewScript = {
  duration: 6400,
  scale: 0.63,
  caption: 'Q — 1.5s per drone: 8 from the head, 3 from every wagon, and 5 coal to shovel',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    // The rake, driven the way the kit drives it: a position history with cars 12 frames apart.
    const hist: { x: number; y: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const head = { x: ctx.cx, y: ctx.cy, dx: 1, dy: 0 };
    const coal = [
      { x: ctx.cx + 150, y: ctx.cy - 60, got: false, seed: 1.2 },
      { x: ctx.cx + 290, y: ctx.cy + 10, got: false, seed: 4.6 },
      { x: ctx.cx + 90, y: ctx.cy + 80, got: false, seed: 8.1 },
    ];
    const coalG = coal.map(() => ctx.adopt(ctx.scene.add.graphics().setDepth(3)));
    let puddleAcc = 0;
    ctx.onFrame((dt, elapsed) => {
      // Four directions only — no diagonals, no stopping.
      const leg = Math.floor(elapsed / 1100) % 4;
      head.dx = leg === 0 ? 1 : leg === 1 ? 0 : leg === 2 ? -1 : 0;
      head.dy = leg === 1 ? 1 : leg === 3 ? -1 : 0;
      head.x += head.dx * 200 * (dt / 1000);
      head.y += head.dy * 200 * (dt / 1000);
      hist.unshift({ x: head.x, y: head.y });
      if (hist.length > 300) hist.length = 300;
      puddleAcc += dt;
      if (puddleAcc >= 2000) { puddleAcc -= 2000; puddle(ctx, { x: head.x, y: head.y, born: elapsed }); }
      g.clear();
      const cars = Math.min(6, Math.floor(hist.length / 12));
      for (let i = cars - 1; i >= 0; i--) {
        const h = hist[Math.min((i + 1) * 12, hist.length - 1)];
        const ahead = i === 0 ? head : hist[Math.min(i * 12, hist.length - 1)];
        OilFx.drawTrainCar(g, ctx.tint, h.x, h.y, Math.atan2(ahead.y - h.y, ahead.x - h.x), elapsed / 1000, false, false, i);
      }
      OilFx.drawTrainCar(g, ctx.tint, head.x, head.y, Math.atan2(head.dy, head.dx), elapsed / 1000, true, false, 0);
      // Coal on the floor, and the shovel-in when the locomotive reaches one.
      coal.forEach((c, i) => {
        coalG[i].clear();
        if (c.got) return;
        coalG[i].setPosition(c.x, c.y);
        OilFx.drawCoal(coalG[i], ctx.tint, elapsed / 1000, c.seed);
        if (Phaser.Math.Distance.Between(head.x, head.y, c.x, c.y) <= 20) {
          c.got = true;
          fx.sparks(c.x, c.y, 9, { speed: 130, life: 380, depth: 9 });
          fx.ring(c.x, c.y, 3, 26, OIL.gold, 300, 3, 4);
          fx.smoke(head.x, head.y - 6, 2, 10, 4);
        }
      });
    });
    ctx.at(200, () => {
      fx.ring(ctx.cx, ctx.cy, 8, 90, OIL.chrome, 420, 5, 8);
      fx.smoke(ctx.cx, ctx.cy, 5, 26, 4);
      fx.sparks(ctx.cx, ctx.cy, 14, { speed: 240, life: 420, depth: 9 });
    });
  },
};

export const trainMorphUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Coal Overload — all 5 coal: +5s, doubled damage, and a lit puddle every 1s',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const hist: { x: number; y: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const head = { x: ctx.cx, y: ctx.cy, dx: 1, dy: 0 };
    let overload = false;
    let puddleAcc = 0;
    ctx.onFrame((dt, elapsed) => {
      const leg = Math.floor(elapsed / 1100) % 4;
      head.dx = leg === 0 ? 1 : leg === 1 ? 0 : leg === 2 ? -1 : 0;
      head.dy = leg === 1 ? 1 : leg === 3 ? -1 : 0;
      head.x += head.dx * 200 * (dt / 1000) * (overload ? 1.25 : 1);
      head.y += head.dy * 200 * (dt / 1000) * (overload ? 1.25 : 1);
      hist.unshift({ x: head.x, y: head.y });
      if (hist.length > 300) hist.length = 300;
      // 1s instead of 2s, and every puddle lit as it lands.
      puddleAcc += dt;
      if (puddleAcc >= (overload ? 1000 : 2000)) {
        puddleAcc -= overload ? 1000 : 2000;
        puddle(ctx, { x: head.x, y: head.y, born: elapsed, ignited: overload });
      }
      g.clear();
      const cars = Math.min(6, Math.floor(hist.length / 12));
      for (let i = cars - 1; i >= 0; i--) {
        const h = hist[Math.min((i + 1) * 12, hist.length - 1)];
        const ahead = i === 0 ? head : hist[Math.min(i * 12, hist.length - 1)];
        OilFx.drawTrainCar(g, ctx.tint, h.x, h.y, Math.atan2(ahead.y - h.y, ahead.x - h.x), elapsed / 1000, false, overload, i);
      }
      OilFx.drawTrainCar(g, ctx.tint, head.x, head.y, Math.atan2(head.dy, head.dx), elapsed / 1000, true, overload, 0);
    });
    // The fifth lump: the boiler lets go.
    ctx.at(2200, () => {
      overload = true;
      fx.oilPillar(head.x, head.y, 26, 110);
      fx.ring(head.x, head.y, 10, 130, OIL.flame, 520, 6, 8);
      fx.smoke(head.x, head.y, 5, 26, 4);
      const t = ctx.adopt(ctx.scene.add.text(head.x, head.y - 50, 'Train Overload!', {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#ff4400',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1600 });
    });
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveDroneSwarm: PreviewScript = {
  duration: 6000,
  caption: 'Passive — 6 drones, 3 shots each; every volley spends one from all of them at once',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 6 });
    // Three volleys, and the pip strips visibly emptying.
    [800, 2200, 3600].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      for (const d of drones) {
        fx.beam(d.g.x, d.g.y, ctx.tx, ctx.ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });
        d.shots = Math.max(0, d.shots - 1);
      }
      fx.flash(ctx.tx, ctx.ty, 24);
    }));
    // Then they are gone — a drone at zero shots is destroyed, not reloaded.
    ctx.at(4000, () => {
      for (const d of drones) {
        fx.sparks(d.g.x, d.g.y, 4, { speed: 90, life: 320, depth: 8 });
        fx.smoke(d.g.x, d.g.y, 1, 7, 5);
        d.g.clear();
      }
      drones.length = 0;
    });
  },
};

export const passiveOilPuddles: PreviewScript = {
  duration: 6000,
  caption: 'Passive — 30px, 12s. Oily for 8s inside; lit, 2 dmg every 0.3s and Burning for 5s',
  run(ctx) {
    const { fx } = stage(ctx);
    const p = puddle(ctx, { x: ctx.tx, y: ctx.ty, born: 300 });
    ctx.at(300, () => fx.spatter(ctx.tx, ctx.ty, 5, { speed: 90, size: 3, life: 420, fall: 50, depth: 3 }));
    // Coated first — inert, but one laser away from being on fire.
    ctx.at(900, () => {
      const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 36, '🛢️ OILY 8s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#c47a2a',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1600 });
    });
    // Then a beam lights it: it burns twice as hot for half as long.
    ctx.at(2200, () => {
      fx.beam(ctx.cx + 30, ctx.cy, ctx.tx, ctx.ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });
      p.ignite();
      fx.flash(ctx.tx, ctx.ty, 15, 4);
      fx.ring(ctx.tx, ctx.ty, 4, 38, OIL.flame, 340, 4, 3);
      fx.gusher(ctx.tx, ctx.ty, 24, 8, 3);
      fx.smoke(ctx.tx, ctx.ty, 2, 21, 3);
      // 2 damage every 0.3s while they stand in it.
      for (let i = 1; i <= 10; i++) {
        ctx.at(i * 300, () => {
          const t = ctx.adopt(ctx.scene.add.text(ctx.tx + ((i % 3) - 1) * 10, ctx.ty - 22, '2', {
            fontSize: '10px', fontFamily: 'Arial', color: '#ff6600',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 600 });
        });
      }
    });
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkBioFuel: PreviewScript = {
  duration: 5600,
  caption: 'Perk — 5 shots a drone instead of 3: 67% more volleys off the same build-up',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 4, shots: 5 });
    // Five volleys off one build, which a 3-shot fleet cannot reach.
    for (let i = 0; i < 5; i++) {
      ctx.at(600 + i * 900, () => {
        av.play('punch', ctx.aim);
        for (const d of drones) {
          fx.beam(d.g.x, d.g.y, ctx.tx, ctx.ty, { width: 2.6, duration: 200, impact: 9, depth: 8 });
          d.shots = Math.max(0, d.shots - 1);
        }
        fx.flash(ctx.tx, ctx.ty, 22);
        const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 32, `VOLLEY ${i + 1}/5`, {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ffaa00',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 800 });
      });
    }
  },
};

export const perkGasoline: PreviewScript = {
  duration: 6400,
  caption: 'Divine perk — 50% of builds roll a special: Med, Bash, Blast or the 5-shot Prime',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 0 });
    const kinds: Array<{ kind: 'med' | 'bash' | 'blast' | 'prime'; tag: string }> = [
      { kind: 'med', tag: '💊 Med-Drone' },
      { kind: 'bash', tag: '🥊 Bash-Drone' },
      { kind: 'blast', tag: '💣 Blast-Drone' },
      { kind: 'prime', tag: '⭐ Drone-Prime' },
    ];
    av.setHold('spray', ctx.aim);
    kinds.forEach((k, i) => ctx.at(400 + i * 700, () => {
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
      const d = { g, angle: (i / 4) * Math.PI * 2, shots: k.kind === 'prime' ? 5 : 3, max: k.kind === 'prime' ? 5 : 3, spin: 0, overcharged: false };
      drones.push(d);
      // The badge slung under the chassis, which is how you tell them apart on the orbit.
      ctx.onFrame((_dt, elapsed) => OilFx.drawDroneBadge(g, ctx.tint, k.kind, elapsed / 40));
      const sx = ctx.cx + Math.cos(d.angle) * 46, sy = ctx.cy + Math.sin(d.angle) * 46;
      fx.sparks(sx, sy, 7, { speed: 110, life: 320, fall: 40, depth: 9 });
      const t = ctx.adopt(ctx.scene.add.text(sx, sy - 28, `${k.tag}!`, {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#ffaa33',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1400 });
    }));
    // The Bash-Drone spending its shot: a ram, not a laser.
    ctx.at(4200, () => {
      av.setHold(null);
      av.play('punch', ctx.aim);
      fx.sparks(ctx.tx, ctx.ty, 8, { angle: Math.PI, spread: 1.1, speed: 220, life: 320 });
      fx.ring(ctx.tx, ctx.ty, 6, 40, OIL.gold, 280, 3, 9);
      const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 34, '10 + SHOVE', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ffaa00',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 1200 });
    });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryDroneArray: PreviewScript = {
  duration: 6000,
  caption: 'Mastery passive — 10% damage resistance per orbiting drone, 60% at the cap',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const drones = swarm(ctx, { count: 6 });
    // The real lattice object, plated to the fleet size.
    const lattice = ctx.capture(() => new DroneArrayLattice(ctx.scene, ctx.tint, 2));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 52, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#66ddff',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame((dt) => {
      lattice.setPlates(drones.length);
      lattice.update(dt, ctx.cx, ctx.cy, 1);
      label.setText(drones.length > 0 ? `🛡️ Array ${drones.length * 10}%` : '🛡️ Array 0%');
    });
    // Spend them one at a time; the armour drops with each.
    for (let i = 0; i < 6; i++) {
      ctx.at(900 + i * 700, () => {
        const d = drones.pop();
        if (!d) return;
        fx.muzzleFlash(d.g.x, d.g.y, ctx.aim, 0.7, 9);
        fx.sparks(d.g.x, d.g.y, 5, { speed: 120, life: 300, depth: 9 });
        d.g.clear();
      });
    }
  },
};

export const masteryTurret: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Mastery — 3 drones for a 150 HP turret; mounted, hold click for 2 damage every 100ms',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const drones = swarm(ctx, { count: 3 });
    const tx = ctx.cx + 80, ty = ctx.cy + 10;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    let built = false;
    let mounted = false;
    let heat = 0;
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (!built) return;
      heat = Math.max(0, heat - dt / 600);
      OilFx.drawTurret(g, ctx.tint, tx, ty, 24, ctx.aim, 1, mounted, heat, mounted ? heat * 3 : 0);
      void elapsed;
    });
    ctx.at(400, () => {
      // Three airframes stripped for parts — half the fleet, gone.
      av.play('slam', ctx.aim);
      for (const d of drones) { fx.sparks(d.g.x, d.g.y, 6, { speed: 130, life: 320, depth: 9 }); d.g.clear(); }
      drones.length = 0;
      built = true;
      fx.ring(tx, ty, 4, 44, OIL.chrome, 320, 4, 4);
      fx.smoke(tx, ty, 2, 12, 3);
    });
    // Mount up: rooted in place, and the beam runs at its real 10 shots a second.
    ctx.at(1600, () => {
      mounted = true;
      fx.ring(tx, ty, 6, 34, OIL.teal, 320, 4, 4);
      for (let i = 0; i < 36; i++) {
        ctx.at(i * 100, () => {
          heat = 1;
          fx.beam(tx, ty, ctx.tx, ctx.ty, { width: 2, color: OIL.teal, duration: 120, impact: 7, depth: 8 });
          if (i % 5 === 0) fx.flash(ctx.tx, ctx.ty, 16);
        });
      }
    });
  },
};
