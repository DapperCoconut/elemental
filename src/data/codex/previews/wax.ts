import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  WAX, WaxAvatar, WaxFx, drawBee, drawCandle, drawCandleAura, drawDart, drawGrapple, drawHive, drawPoisonTell,
  drawPuddle, drawStickyBomb,
} from '../../../elements/kits/WaxVisuals';

/**
 * Wax puts no sprite in the world — bees, bombs, darts, candles and hives are records the kit
 * paints every frame — so every loop here keeps the same little records and paints them with the
 * kit's own painters. Numbers are the kit's: 350px/s bees, 315px/s bombs, 650px/s darts.
 */

function stage(ctx: PreviewCtx): { fx: WaxFx; av: BaseAvatar; g: Phaser.GameObjects.Graphics; ground: Phaser.GameObjects.Graphics } {
  const fx = ctx.capture(() => new WaxFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new WaxAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
  return { fx, av, g, ground };
}

interface Bee { x: number; y: number; vx: number; vy: number; heading: number; seed: number; elite: boolean; attached: boolean; ox: number; oy: number }

/** The kit's bee flight in miniature: a cone that bends toward the target and latches on contact. */
function swarm(ctx: PreviewCtx, count: number, elite: boolean, from: { x: number; y: number }): Bee[] {
  const base = Math.atan2(ctx.ty - from.y, ctx.tx - from.x);
  const bees: Bee[] = [];
  for (let i = 0; i < count; i++) {
    const a = base + (i / (count - 1) - 0.5) * Phaser.Math.DegToRad(48);
    bees.push({ x: from.x + Math.cos(a) * 26, y: from.y + Math.sin(a) * 26, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, heading: a, seed: i * 1.7, elite: elite && (i === 5 || i === 7 || i === 9), attached: false, ox: 0, oy: 0 });
  }
  return bees;
}

function stepBees(bees: Bee[], dt: number, ctx: PreviewCtx, onLatch?: (b: Bee) => void): void {
  for (const b of bees) {
    if (b.attached) { b.x = ctx.tx + b.ox; b.y = ctx.ty + b.oy; b.heading += dt * 0.8; continue; }
    const want = Math.atan2(ctx.ty - b.y, ctx.tx - b.x);
    const turned = Phaser.Math.Angle.RotateTo(Math.atan2(b.vy, b.vx), want, 4.2 * dt);
    b.vx = Math.cos(turned) * 350; b.vy = Math.sin(turned) * 350;
    b.x += b.vx * dt; b.y += b.vy * dt; b.heading = turned;
    if (Phaser.Math.Distance.Between(b.x, b.y, ctx.tx, ctx.ty) <= 24) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 19;
      b.attached = true; b.ox = Math.cos(a) * r; b.oy = Math.sin(a) * r; b.heading = a + Math.PI / 2;
      onLatch?.(b);
    }
  }
}

function tick(ctx: PreviewCtx, text: string, color: string, dy = -44): void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty + dy, text, {
    fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color, stroke: '#1a1208', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(16));
  ctx.scene.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 900, onComplete: () => t.destroy() });
}

export const stingerStrikes: PreviewScript = {
  duration: 3200,
  caption: 'Click — six thrusts at 4, then the 12-damage stinger: shoved and poisoned for 8s',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    const wav = av instanceof WaxAvatar ? av : null;
    let poisonedAt = -1;
    ctx.at(400, () => {
      wav?.fence(true);
      av.setHold('reach', ctx.aim);
      for (let i = 0; i < 6; i++) {
        ctx.at(i * 70, () => {
          const a = ctx.aim + Phaser.Math.DegToRad([-7.5, -5, -2.5, 2.5, 5, 7.5][i]);
          fx.thrust(ctx.cx + Math.cos(a) * 18, ctx.cy + Math.sin(a) * 18, ctx.cx + Math.cos(a) * 190, ctx.cy + Math.sin(a) * 190, false);
          tick(ctx, '4', '#ffefad', -30 - i * 4);
        });
      }
      ctx.at(420 + 110, () => {
        fx.thrust(ctx.cx, ctx.cy, ctx.cx + Math.cos(ctx.aim) * 218, ctx.cy + Math.sin(ctx.aim) * 218, true);
        fx.sting(ctx.tx, ctx.ty, ctx.aim);
        av.play('punch', ctx.aim);
        tick(ctx, '12 · STUNG', '#fff8dc');
        poisonedAt = 940;
      });
      ctx.at(700, () => { wav?.fence(false); av.setHold(null); });
    });
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (poisonedAt > 0 && elapsed > poisonedAt) {
        const stacks = Math.min(8, 1 + Math.floor((elapsed - poisonedAt) / 1000));
        drawPoisonTell(g, ctx.tint, ctx.tx, ctx.ty, elapsed / 1000, stacks);
      }
    });
    for (let i = 1; i <= 2; i++) ctx.at(940 + i * 1000, () => tick(ctx, '1 ☠', '#b6e85c'));
  },
};

export const stingerStrikesUpgraded: PreviewScript = {
  duration: 3400,
  caption: 'Stinger Strike — nobody in reach: five darts at 3, and all five landing hauls them in on a grapple',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    // The dummy is staged well outside the foil's reach.
    const tx = ctx.cx + 330, ty = ctx.ty;
    const darts: Array<{ x: number; y: number; a: number; live: boolean }> = [];
    let grapple: { x: number; y: number; a: number; live: boolean } | null = null;
    let pulled = 0;
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      for (const d of [-3, -1.5, 0, 1.5, 3]) {
        const a = ctx.aim + Phaser.Math.DegToRad(d);
        darts.push({ x: ctx.cx + Math.cos(a) * 28, y: ctx.cy + Math.sin(a) * 28, a, live: true });
      }
    });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      const s = dt / 1000;
      let hits = 0;
      for (const d of darts) {
        if (!d.live) { hits++; continue; }
        d.x += Math.cos(d.a) * 650 * s; d.y += Math.sin(d.a) * 650 * s;
        if (Phaser.Math.Distance.Between(d.x, d.y, tx - pulled, ty) <= 24) { d.live = false; fx.droplets(d.x, d.y, 3, 60, WAX.pale, 240); tick(ctx, '3', '#ffefad'); }
        else drawDart(g, ctx.tint, d.x, d.y, d.a);
      }
      if (hits === 5 && !grapple && elapsed < 2000) {
        grapple = { x: ctx.cx + 30, y: ctx.cy, a: ctx.aim, live: true };
        av.play('dash', ctx.aim);
      }
      if (grapple?.live) {
        grapple.x += Math.cos(grapple.a) * 760 * s;
        if (Phaser.Math.Distance.Between(grapple.x, grapple.y, tx - pulled, ty) <= 30) { grapple.live = false; fx.sting(tx - pulled, ty, ctx.aim); tick(ctx, '12 · GRAPPLED', '#fff8dc'); }
        else drawGrapple(g, ctx.tint, ctx.cx, ctx.cy, grapple.x, grapple.y, grapple.a, elapsed / 1000);
      } else if (grapple && !grapple.live && pulled < 330 - 92) {
        pulled = Math.min(330 - 92, pulled + 720 * s);
        drawGrapple(g, ctx.tint, ctx.cx, ctx.cy, tx - pulled - 26, ty, Math.PI, elapsed / 1000);
      }
      // The dummy is drawn by the harness at ctx.tx; stand a second body where the real one is.
      g.fillStyle(ctx.tint(WAX.soot), 0.35); g.fillEllipse(tx - pulled, ty + 18, 40, 12);
      g.fillStyle(0x3aa0e8, 0.9); g.fillCircle(tx - pulled, ty, 22);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(tx - pulled - 6, ty - 4, 4); g.fillCircle(tx - pulled + 6, ty - 4, 4);
      g.fillStyle(0x111111, 1); g.fillCircle(tx - pulled - 7, ty - 4, 2); g.fillCircle(tx - pulled + 5, ty - 4, 2);
    });
  },
};

export const swarmLoop: PreviewScript = {
  duration: 4600,
  caption: 'E — fifteen bees that hunt, latch for 3s at 2 a second, and open the target 1% each',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    let bees: Bee[] = [];
    let attachedAt = -1;
    ctx.at(400, () => { av.play('sweep', ctx.aim); bees = swarm(ctx, 15, false, { x: ctx.cx, y: ctx.cy }); fx.combRing(ctx.cx + 20, ctx.cy, 34, WAX.honeyLit, 320); });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      stepBees(bees, dt / 1000, ctx, (b) => { fx.beeLand(b.x, b.y); if (attachedAt < 0) attachedAt = elapsed; });
      if (attachedAt > 0 && elapsed > attachedAt + 3000) bees = bees.filter((b) => !b.attached);
      for (const b of bees) drawBee(g, ctx.tint, b.x, b.y, b.heading, elapsed / 1000, b.seed, b.elite);
      const n = bees.filter((b) => b.attached).length;
      if (n > 0) {
        g.fillStyle(ctx.tint(WAX.soot), 0.7); g.fillRoundedRect(ctx.tx - 34, ctx.ty - 62, 68, 14, 4);
        const label = `+${n}% TAKEN`;
        void label;
      }
    });
    for (let i = 1; i <= 3; i++) ctx.at(1000 + i * 1000, () => tick(ctx, '2 × bees', '#ffbf3c'));
    ctx.at(1100, () => tick(ctx, '+1% per bee', '#ffd34f', -62));
  },
};

export const swarmUpgraded: PreviewScript = {
  duration: 4600,
  caption: 'Elite Swarm — three red elites: 3 a second for 5s, and they poison on the bite',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    let bees: Bee[] = [];
    let poisonedAt = -1;
    ctx.at(400, () => { av.play('sweep', ctx.aim); bees = swarm(ctx, 15, true, { x: ctx.cx, y: ctx.cy }); });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      stepBees(bees, dt / 1000, ctx, (b) => { fx.beeLand(b.x, b.y, b.elite); if (b.elite && poisonedAt < 0) { poisonedAt = elapsed; tick(ctx, 'ELITE · POISONED', '#ef4b45'); } });
      if (elapsed > 3900) bees = bees.filter((b) => !b.attached || b.elite);
      for (const b of bees) drawBee(g, ctx.tint, b.x, b.y, b.heading, elapsed / 1000, b.seed, b.elite);
      if (poisonedAt > 0) drawPoisonTell(g, ctx.tint, ctx.tx, ctx.ty, elapsed / 1000, Math.min(8, 1 + Math.floor((elapsed - poisonedAt) / 1000)));
    });
    for (let i = 1; i <= 3; i++) ctx.at(1000 + i * 1000, () => tick(ctx, '3 × elite', '#ef4b45', -56));
  },
};

export const candleMount: PreviewScript = {
  duration: 4200,
  caption: 'R — a candle for 12s: 15% less damage taken in its light, and bees you loose latch 2s longer',
  run(ctx) {
    const { fx, av, g, ground } = stage(ctx);
    const cx = ctx.cx - 20, cy = ctx.cy + 10;
    let lit = -1;
    ctx.at(400, () => { av.play('slam', Math.atan2(cy - ctx.cy, cx - ctx.cx)); fx.candleBurst(cx, cy, 125); lit = 400; });
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); ground.clear();
      if (lit < 0) return;
      const t = elapsed / 1000;
      drawCandleAura(ground, ctx.tint, cx, cy, 125, t, 1);
      drawCandle(g, ctx.tint, cx, cy, 1 - ((elapsed - lit) / 12000), t, 7, true);
    });
    ctx.at(1300, () => tick(ctx, '−15% DAMAGE TAKEN', '#ffefad', -40));
    ctx.at(2200, () => { const b = swarm(ctx, 5, false, { x: ctx.cx, y: ctx.cy }); const sub = ctx.adopt(ctx.scene.add.graphics().setDepth(15)); ctx.onFrame((dt, elapsed) => { sub.clear(); stepBees(b, dt / 1000, ctx); for (const bee of b) drawBee(sub, ctx.tint, bee.x, bee.y, bee.heading, elapsed / 1000, bee.seed); }); av.play('sweep', ctx.aim); });
    ctx.at(2900, () => tick(ctx, 'LATCH 5s', '#ffd34f'));
  },
};

export const candleMountUpgraded: PreviewScript = {
  duration: 4200,
  caption: 'Melting Point — hits taken in the light set +2% armour each and spit hot wax (3/s for 6s)',
  run(ctx) {
    const { fx, av, g, ground } = stage(ctx);
    const cx = ctx.cx - 20, cy = ctx.cy + 10;
    const pools: Array<{ x: number; y: number; at: number; seed: number }> = [];
    let stacks = 0;
    ctx.at(300, () => { fx.candleBurst(cx, cy, 125); av.play('slam'); });
    for (let i = 0; i < 3; i++) {
      ctx.at(1100 + i * 700, () => {
        stacks++;
        fx.spatter(ctx.cx, ctx.cy);
        pools.push({ x: ctx.cx + (i - 1) * 30, y: ctx.cy + 14, at: 1100 + i * 700, seed: i * 3 });
        tick(ctx, `+2% ARMOUR ×${stacks}`, '#ffbf3c', -40);
      });
    }
    ctx.at(2600, () => { pools.push({ x: cx + 34, y: cy + 20, at: 2600, seed: 9 }); fx.droplets(cx, cy - 20, 5, 90, WAX.pale, 400); });
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); ground.clear();
      if (elapsed < 300) return;
      const t = elapsed / 1000;
      drawCandleAura(ground, ctx.tint, cx, cy, 125, t, 1);
      for (const p of pools) if (elapsed > p.at) drawPuddle(ground, ctx.tint, p.x, p.y, 44, 'hot', t, Math.min(1, (6000 - (elapsed - p.at)) / 900), p.seed);
      drawCandle(g, ctx.tint, cx, cy, 1 - (elapsed - 300) / 12000, t, 7, true);
      for (let i = 0; i < stacks; i++) {
        const a = (i / Math.max(1, stacks)) * Math.PI * 2 + t * 0.4;
        g.fillStyle(ctx.tint(WAX.flame), 0.75);
        g.fillCircle(ctx.cx + Math.cos(a) * 24, ctx.cy + 6 + Math.sin(a) * 10, 3);
      }
    });
  },
};

export const hiveHearth: PreviewScript = {
  duration: 5600,
  caption: 'F — a five-cell hive stores bees flown into it; F beside it pays 5 per cell as an orbiting guard',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    const hx = ctx.cx + 150, hy = ctx.cy + 8;
    let built = false;
    let cells = 0;
    let bees: Bee[] = [];
    let orbit: Array<{ i: number; r: number }> = [];
    let redeemedAt = -1;
    ctx.at(300, () => { built = true; av.play('clap'); fx.combRing(hx, hy, 60, WAX.honey, 480); });
    ctx.at(1100, () => { av.play('sweep', ctx.aim); bees = swarm(ctx, 15, false, { x: ctx.cx, y: ctx.cy }); });
    ctx.at(3300, () => {
      redeemedAt = 3300; av.play('raise', undefined, 500);
      fx.hiveRelease(hx, hy, false);
      orbit = Array.from({ length: cells * 5 }, (_, i) => ({ i, r: 46 + (i % 3) * 13 }));
      tick(ctx, `HIVE ×${cells * 5}  🛡${cells >= 5 ? 3 : cells >= 3 ? 2 : 1}`, '#ffd34f', -10);
    });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      const t = elapsed / 1000;
      const s = dt / 1000;
      for (const b of bees) {
        if (b.attached) continue;
        b.x += b.vx * s; b.y += b.vy * s;
        if (cells < 5 && Phaser.Math.Distance.Between(b.x, b.y, hx, hy) <= 36) { cells++; b.attached = true; b.x = -999; fx.combRing(hx, hy - 36, 16, WAX.honeyLit, 260); }
      }
      bees = bees.filter((b) => b.x > -500 && b.x < ctx.w + 40);
      for (const b of bees) if (!b.attached) drawBee(g, ctx.tint, b.x, b.y, b.heading, t, b.seed);
      if (built && redeemedAt < 0) drawHive(g, ctx.tint, hx, hy, cells, 5, null, t, 4);
      for (const o of orbit) {
        const a = t * 3.2 + (o.i / Math.max(1, orbit.length)) * Math.PI * 2;
        drawBee(g, ctx.tint, ctx.cx + Math.cos(a) * o.r, ctx.cy + Math.sin(a) * o.r * 0.62, a + Math.PI / 2, t, o.i);
      }
      if (redeemedAt > 0) { g.lineStyle(1.6, ctx.tint(WAX.honeyLit), 0.5 + Math.sin(t * 4) * 0.15); g.strokeCircle(ctx.cx, ctx.cy, 30 + Math.sin(t * 3) * 2); }
    });
  },
};

export const hiveHearthUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Honey Making — the hive brews honey; redeeming heals for it and leaves a healing puddle per 10',
  run(ctx) {
    const { fx, av, g, ground } = stage(ctx);
    const hx = ctx.cx + 150, hy = ctx.cy + 8;
    let honey = 0;
    let redeemedAt = -1;
    const pools: Array<{ x: number; y: number; seed: number }> = [];
    ctx.at(300, () => { av.play('clap'); fx.combRing(hx, hy, 60, WAX.honey, 480); });
    ctx.at(3400, () => {
      redeemedAt = 3400; av.play('raise', undefined, 500); fx.hiveRelease(hx, hy, false);
      const heal = Math.floor(honey);
      tick(ctx, `+${heal} HP`, '#9cef84', -10);
      for (let i = 0; i < Math.floor(heal / 10); i++) pools.push({ x: hx + Math.cos(i * 2.4) * 72, y: hy + Math.sin(i * 2.4) * 40, seed: i * 5 });
    });
    ctx.onFrame((dt, elapsed) => {
      g.clear(); ground.clear();
      const t = elapsed / 1000;
      // Brewed fast for the box: the real rate is 0.35/s + 0.23 per cell.
      if (elapsed > 300 && redeemedAt < 0) honey = Math.min(50, honey + (dt / 1000) * 10);
      for (const p of pools) drawPuddle(ground, ctx.tint, p.x, p.y, 34, 'honey', t, 1, p.seed);
      if (elapsed > 300 && redeemedAt < 0) drawHive(g, ctx.tint, hx, hy, 5, 5, honey / 50, t, 4);
    });
  },
};

export const stickyBombs: PreviewScript = {
  duration: 4400,
  caption: 'Q — eight bombs stick for 20s (+10% taken); Q again: 10 each, +10% per bomb on them',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    const bombs: Array<{ x: number; y: number; a: number; stuck: boolean; ox: number; oy: number; seed: number }> = [];
    let detonated = false;
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      for (let i = 0; i < 8; i++) {
        const a = ctx.aim + (i / 7 - 0.5) * Phaser.Math.DegToRad(22);
        bombs.push({ x: ctx.cx + Math.cos(a) * 28, y: ctx.cy + Math.sin(a) * 28, a, stuck: false, ox: 0, oy: 0, seed: i * 2.3 });
      }
    });
    ctx.at(2600, () => {
      detonated = true;
      const n = bombs.filter((b) => b.stuck).length;
      fx.bombBlast(ctx.tx, ctx.ty, 48 + n * 6, n);
      av.play('raise', undefined, 400);
      tick(ctx, `${Math.round(10 * n * (1 + 0.1 * n))}`, '#fff8dc', -52);
    });
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (detonated) return;
      const s = dt / 1000;
      for (const b of bombs) {
        if (b.stuck) { b.x = ctx.tx + b.ox; b.y = ctx.ty + b.oy; }
        else {
          b.x += Math.cos(b.a) * 315 * s; b.y += Math.sin(b.a) * 315 * s;
          if (Phaser.Math.Distance.Between(b.x, b.y, ctx.tx, ctx.ty) <= 24) { b.stuck = true; const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 18; b.ox = Math.cos(a) * r; b.oy = Math.sin(a) * r; }
        }
        drawStickyBomb(g, ctx.tint, b.x, b.y, elapsed / 1000, b.seed, b.stuck);
      }
    });
    ctx.at(1300, () => tick(ctx, '+10% TAKEN', '#ffd34f'));
  },
};

export const stickyBombsUpgraded: PreviewScript = {
  duration: 4800,
  caption: 'Rule Beetanica — hold Q 2s to wear all eight; tap to go off for 144 in 165px, and take 48 yourself',
  run(ctx) {
    const { fx, av, g } = stage(ctx);
    let strappedAt = -1;
    let blownAt = -1;
    ctx.at(300, () => av.setHold('charge'));
    ctx.at(2300, () => { strappedAt = 2300; av.setHold(null); av.play('flex'); fx.combRing(ctx.cx, ctx.cy, 70, WAX.honeyLit, 480); tick(ctx, 'RULE BEETANICA', '#ffdf7e', -58); });
    ctx.at(3500, () => { blownAt = 3500; av.play('raise', undefined, 500); fx.bombBlast(ctx.cx, ctx.cy, 165 * 0.7, 8); tick(ctx, '144', '#fff8dc', -48); const self = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 50, 'SELF 48', { fontSize: '11px', fontFamily: '"Arial Black", Impact, sans-serif', color: '#ff9a55', stroke: '#1a1208', strokeThickness: 3 }).setOrigin(0.5).setDepth(16)); ctx.scene.tweens.add({ targets: self, y: self.y - 22, alpha: 0, duration: 900, onComplete: () => self.destroy() }); });
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const t = elapsed / 1000;
      if (elapsed > 300 && strappedAt < 0) {
        const ratio = Phaser.Math.Clamp((elapsed - 300) / 2000, 0, 1);
        g.lineStyle(5, ctx.tint(ratio >= 1 ? WAX.cream : WAX.wax), 0.9);
        g.beginPath(); g.arc(ctx.cx, ctx.cy, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false); g.strokePath();
      }
      if (strappedAt > 0 && blownAt < 0) {
        for (let i = 0; i < 8; i++) {
          const a = t * 3.6 + (i / 8) * Math.PI * 2;
          drawStickyBomb(g, ctx.tint, ctx.cx + Math.cos(a) * (27 + (i % 2) * 9), ctx.cy + Math.sin(a) * (19 + (i % 2) * 7), t, i * 2.3, true);
        }
        g.lineStyle(2, ctx.tint(WAX.flame), 0.4 + Math.sin(t * 8) * 0.2);
        g.strokeCircle(ctx.cx, ctx.cy, 165 * 0.7);
      }
    });
    ctx.at(2800, () => tick(ctx, '+25% TAKEN', '#ff9a55', -34));
  },
};

export const waxWorks: PreviewScript = {
  duration: 5400,
  caption: 'Wax Works — a bomb on your candle banks its light; one on your hive cashes it in; bees through a hive are stored',
  run(ctx) {
    const { fx, av, g, ground } = stage(ctx);
    const cx = ctx.cx - 110, cy = ctx.cy + 20;
    const hx = ctx.cx + 130, hy = ctx.cy + 14;
    let candle = true;
    let hive = true;
    let cells = 0;
    let banked = -1;
    let loose: Bee[] = [];
    let bees: Bee[] = [];
    const bombs: Array<{ x: number; y: number; a: number; live: boolean; seed: number; target: 'candle' | 'hive' }> = [];
    ctx.at(300, () => { fx.candleBurst(cx, cy, 90); fx.combRing(hx, hy, 60, WAX.honey, 480); });
    ctx.at(900, () => { av.play('sweep', ctx.aim); bees = swarm(ctx, 9, false, { x: ctx.cx, y: ctx.cy }); });
    ctx.at(2300, () => { av.play('punch', Math.PI); bombs.push({ x: ctx.cx - 28, y: ctx.cy, a: Math.atan2(cy - ctx.cy, cx - ctx.cx), live: true, seed: 1, target: 'candle' }); });
    ctx.at(3600, () => { av.play('punch', 0); bombs.push({ x: ctx.cx + 28, y: ctx.cy, a: Math.atan2(hy - ctx.cy, hx - ctx.cx), live: true, seed: 2, target: 'hive' }); });
    ctx.onFrame((dt, elapsed) => {
      g.clear(); ground.clear();
      const t = elapsed / 1000, s = dt / 1000;
      for (const b of bees) {
        if (b.attached) continue;
        b.x += b.vx * s; b.y += b.vy * s;
        if (hive && cells < 5 && Phaser.Math.Distance.Between(b.x, b.y, hx, hy) <= 36) { cells++; b.attached = true; b.x = -999; fx.combRing(hx, hy - 36, 16, WAX.honeyLit, 260); }
      }
      bees = bees.filter((b) => b.x > -500 && b.x < ctx.w + 40);
      for (const b of bees) if (!b.attached) drawBee(g, ctx.tint, b.x, b.y, b.heading, t, b.seed);
      for (const b of bombs) {
        if (!b.live) continue;
        b.x += Math.cos(b.a) * 315 * s; b.y += Math.sin(b.a) * 315 * s;
        const tx = b.target === 'candle' ? cx : hx, ty = b.target === 'candle' ? cy : hy;
        if (Phaser.Math.Distance.Between(b.x, b.y, tx, ty) <= 26) {
          b.live = false;
          if (b.target === 'candle') { candle = false; banked = elapsed; fx.candleBurst(cx, cy, 90); fx.droplets(cx, cy - 20, 12, 180, WAX.pale, 560); tick(ctx, 'AURA BANKED · 15s', '#ffdf7e', -60); }
          else { hive = false; fx.hiveRelease(hx, hy, true); loose = Array.from({ length: 15 * cells }, (_, i) => { const a = Math.random() * Math.PI * 2; return { x: hx, y: hy, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, heading: a, seed: i, elite: false, attached: false, ox: 0, oy: 0 }; }); tick(ctx, `HIVE ×${cells * 5} + ${cells * 15} LOOSE`, '#ffd34f', -60); }
        } else drawStickyBomb(g, ctx.tint, b.x, b.y, t, b.seed, false);
      }
      for (const b of loose) { b.x += b.vx * s; b.y += b.vy * s; drawBee(g, ctx.tint, b.x, b.y, b.heading, t, b.seed); }
      loose = loose.filter((b) => b.x > -40 && b.x < ctx.w + 40 && b.y > -40 && b.y < ctx.h + 40);
      if (candle) { drawCandleAura(ground, ctx.tint, cx, cy, 90, t, 1); drawCandle(g, ctx.tint, cx, cy, 1, t, 3, true); }
      if (banked > 0) drawCandleAura(ground, ctx.tint, ctx.cx, ctx.cy, 90, t + 3, 0.8);
      if (hive) drawHive(g, ctx.tint, hx, hy, cells, 5, null, t, 2);
    });
  },
};
