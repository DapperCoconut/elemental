import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  BUFF_KINDS, CandyKind, SAVOR, SavorAvatar, SavorForm, SavorFx, candy, chocoBall, crashCrystal, saltShard,
  saltSpear, sugarBomb, sugarCloud, sugarGrain, timingBar,
} from '../../../elements/kits/SavorVisuals';

/**
 * Savor's showcases. Each loop fires the kit's own `SavorFx` painters and draws the kit's own
 * candies, shards and bars at the kit's numbers.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const SLAM_SPEED = 560;
const SLAM_R = 70;
const SLICE_SPEED = 950;
const CHOCO_SPEED = 560;
const INFUSE_SPEED = 780;
const BAR_PERIOD_MS = 1100;
const GREEN_HALF = 0.08;
const YELLOW_HALF = 0.22;
const WOUND_HALF = 0.62;
const WOUND_RANGE = 180;

// ── Staging ───────────────────────────────────────────────────────────

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function fxOf(ctx: PreviewCtx): SavorFx {
  return ctx.capture(() => new SavorFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function stand(ctx: PreviewCtx, form: SavorForm): SavorAvatar | null {
  const av = ctx.useAvatar(() => new SavorAvatar(ctx.scene, ctx.tint));
  const sav = av instanceof SavorAvatar ? av : null;
  sav?.setForm(form);
  av.setFacing(ctx.aim);
  return sav;
}

function label(ctx: PreviewCtx, x: number, y: number, color: number, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#161218', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = label(ctx, x, y, color);
  t.setText(text);
  ctx.scene.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 900 });
}

function layer(ctx: PreviewCtx, depth = 9): Phaser.GameObjects.Graphics {
  return ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
}

/** A thing that flies from `from` to `to` at `speed`, painted by `paint`, then calls `onHit`. */
function flight(
  ctx: PreviewCtx, from: { x: number; y: number }, to: { x: number; y: number }, speed: number,
  paint: (g: Phaser.GameObjects.Graphics, x: number, y: number, k: number) => void, onHit: () => void,
): void {
  const g = layer(ctx);
  const ms = (Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) / speed) * 1000;
  let el = 0;
  let done = false;
  ctx.onFrame((dt) => {
    if (done) return;
    el += dt;
    const k = Math.min(1, el / ms);
    g.clear();
    paint(g, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, k);
    if (k >= 1) { done = true; g.clear(); onHit(); }
  });
}

// ══ PASSIVES ═══════════════════════════════════════════════════════════

export const sugarAndSalt: PreviewScript = {
  duration: 4800,
  caption: 'Space — every dodge flips you between Sugar and Salt, and the tray flips with you',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    const fx = fxOf(ctx);
    const read = label(ctx, ctx.w * 0.5, 16, SAVOR.sugar);
    let form: SavorForm = 'sugar';
    read.setText('SUGAR');
    for (let i = 0; i < 4; i++) {
      ctx.at(500 + i * 1100, () => {
        const c = ctx.casterAt();
        const to = { x: ctx.cx + (i % 2 ? -60 : 60), y: ctx.cy + (i % 2 ? 10 : -10) };
        ctx.glideCaster({ to, ms: 280, ease: 'out' });
        form = form === 'sugar' ? 'salt' : 'sugar';
        av?.setForm(form);
        fx.shift(c.x, c.y, form);
        read.setText(form === 'sugar' ? 'SUGAR' : 'SALT');
        read.setColor(hex(form === 'sugar' ? SAVOR.punchLit : SAVOR.salt));
      });
    }
  },
};

export const candyBuffs: PreviewScript = {
  duration: 5200,
  caption: 'Candy buffs — permanent for the match: Cinnamon damage, Mint resistance, Lemon speed, Fruit Punch dodge',
  run(ctx) {
    stand(ctx, 'sugar');
    const fx = fxOf(ctx);
    const g = layer(ctx, 4);
    const kinds: CandyKind[] = ['cinnamon', 'mint', 'lemon', 'punch', 'rainbow', 'licorice'];
    const spots = kinds.map((_, i) => ({ x: ctx.cx + 70 + i * 52, y: ctx.cy + (i % 2 ? 18 : -18) }));
    const eaten = new Set<number>();
    let t = 0;
    ctx.onFrame((dt) => {
      t += dt / 1000;
      g.clear();
      spots.forEach((s, i) => { if (!eaten.has(i)) candy(g, ctx.tint, s.x, s.y, kinds[i], 1.1, t, 1); });
    });
    const names = ['+CINNAMON', '+MINT', '+LEMON', '+FRUIT PUNCH', '+1 ALL!', '−1 ALL'];
    spots.forEach((s, i) => {
      ctx.at(400 + i * 700, () => {
        ctx.glideCaster({ to: s, ms: 420, ease: 'out', onDone: () => {
          eaten.add(i);
          fx.pickup(s.x, s.y, kinds[i]);
          float(ctx, s.x, s.y - 30, names[i], kinds[i] === 'licorice' ? SAVOR.licoriceHi : kinds[i] === 'rainbow' ? SAVOR.violet : SAVOR.sparkle);
        } });
      });
    });
  },
};

// ══ SUGAR ══════════════════════════════════════════════════════════════

export const sugarSlam: PreviewScript = {
  duration: 4200,
  caption: 'Click — a sugar bomb to the cursor: 22 in a burst, a stinging cloud where it lands, a sugar trail behind it',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const ground = layer(ctx, 4);
    const grains: { x: number; y: number; at: number }[] = [];
    let cloudAt = -1;
    let t = 0;
    ctx.onFrame((dt) => {
      t += dt;
      ground.clear();
      for (const gr of grains) sugarGrain(ground, ctx.tint, gr.x, gr.y, 4, Math.max(0, 1 - (t - gr.at) / 3000), t / 1000);
      if (cloudAt >= 0 && t - cloudAt < 2600) sugarCloud(ground, ctx.tint, ctx.tx, ctx.ty, 48, t / 1000, Math.min(1, (2600 - (t - cloudAt)) / 500) * 0.75, 3);
    });
    ctx.at(300, () => {
      av?.play('punch', ctx.aim);
      const c = ctx.casterAt();
      const from = { x: c.x + Math.cos(ctx.aim) * 18, y: c.y + Math.sin(ctx.aim) * 18 };
      fx.slamLaunch(from.x, from.y, ctx.aim);
      let last = { ...from };
      flight(ctx, from, { x: ctx.tx, y: ctx.ty }, SLAM_SPEED, (g, x, y, k) => {
        if (Phaser.Math.Distance.Between(last.x, last.y, x, y) >= 26) { grains.push({ x, y, at: t }); last = { x, y }; }
        sugarBomb(g, ctx.tint, x, y - Math.sin(k * Math.PI) * 60, 9, t / 1000, 1);
      }, () => {
        fx.slamBurst(ctx.tx, ctx.ty, SLAM_R);
        cloudAt = t;
        float(ctx, ctx.tx, ctx.ty - 34, '-22', SAVOR.sugar);
      });
    });
    for (let i = 0; i < 4; i++) ctx.at(1400 + i * 500, () => float(ctx, ctx.tx + 10, ctx.ty - 24, '-3', SAVOR.sparkle));
  },
};

export const sweetTooth: PreviewScript = {
  duration: 4600,
  caption: 'E — a bag of five candies thrown round you. Eat them for permanent buffs; avoid the Black Licorice',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    const fx = fxOf(ctx);
    const g = layer(ctx, 4);
    const kinds: CandyKind[] = ['cinnamon', 'lemon', 'licorice', 'mint', 'rainbow'];
    const c0 = ctx.casterAt();
    const spots = kinds.map((_, i) => {
      const a = (i / kinds.length) * Math.PI * 2 + 0.3;
      return { x: c0.x + Math.cos(a) * 110, y: c0.y + Math.sin(a) * 70 };
    });
    let thrownAt = -1;
    const eaten = new Set<number>();
    let t = 0;
    ctx.onFrame((dt) => {
      t += dt;
      g.clear();
      if (thrownAt < 0) return;
      const k = Math.min(1, (t - thrownAt) / 420);
      spots.forEach((s, i) => {
        if (eaten.has(i)) return;
        const x = c0.x + (s.x - c0.x) * k;
        const y = c0.y + (s.y - c0.y) * k - Math.sin(k * Math.PI) * 40;
        candy(g, ctx.tint, x, y, kinds[i], 1, t / 1000, 1, k < 1 ? k * 8 : 0);
      });
    });
    ctx.at(300, () => { av?.play('sweep'); fx.bagBurst(c0.x, c0.y - 6); thrownAt = t; });
    [0, 1, 3, 4].forEach((i, n) => {
      ctx.at(1200 + n * 750, () => ctx.glideCaster({ to: spots[i], ms: 400, ease: 'out', onDone: () => {
        eaten.add(i);
        fx.pickup(spots[i].x, spots[i].y, kinds[i]);
        float(ctx, spots[i].x, spots[i].y - 28, kinds[i] === 'rainbow' ? '+1 ALL!' : `+${kinds[i].toUpperCase()}`, SAVOR.sparkle);
      } }));
    });
  },
};

export const sugarDiffusion: PreviewScript = {
  duration: 5200,
  caption: 'R — +50% speed for 5s. Run a loop round an enemy: their blood sugar becomes a cube over your head',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const center = { x: ctx.tx, y: ctx.ty };
    const R = 95;
    let start = -1;
    let t = 0;
    let cubed = false;
    ctx.onFrame((dt) => {
      t += dt;
      if (start < 0) return;
      const k = Math.min(1, (t - start) / 2600);
      const a = Math.PI + k * Math.PI * 2;
      ctx.moveCaster(center.x + Math.cos(a) * R, center.y + Math.sin(a) * R * 0.7, { facing: a + Math.PI / 2 });
      if (k >= 1 && !cubed) {
        cubed = true;
        const c = ctx.casterAt();
        fx.drain(center.x, center.y, c.x, c.y - 40);
        av?.setCubes(1);
        float(ctx, center.x, center.y - 32, '🧊 BLOOD SUGAR', SAVOR.sugar);
        ctx.at(t + 600, () => float(ctx, center.x, center.y - 20, 'SLOWER FOR GOOD', SAVOR.sugarRim));
      }
    });
    ctx.at(300, () => { av?.play('dash'); start = t; ctx.moveCaster(center.x - R, center.y); });
  },
};

export const caringShare: PreviewScript = {
  duration: 5600,
  caption: 'F — chocolate: lends them 150% of your buffs for 5s, then they crash and drop 3 candies for you',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const g = layer(ctx, 9);
    let loanAt = -1;
    let t = 0;
    ctx.onFrame((dt) => {
      t += dt;
      g.clear();
      if (loanAt < 0) return;
      const age = t - loanAt;
      if (age < 2000) {
        g.lineStyle(2, ctx.tint(SAVOR.lemon), 0.7);
        g.strokeCircle(ctx.tx, ctx.ty, 28);
        for (let i = 0; i < 4; i++) {
          const a = t / 500 + (i / 4) * Math.PI * 2;
          candy(g, ctx.tint, ctx.tx + Math.cos(a) * 30, ctx.ty + Math.sin(a) * 30 - 6, BUFF_KINDS[i], 0.55, t / 1000, 0.9);
        }
      } else if (age < 3800) {
        for (let i = 0; i < 3; i++) {
          const a = i * 2.1 + 0.4;
          candy(g, ctx.tint, ctx.tx + Math.cos(a) * 60, ctx.ty + Math.sin(a) * 40, BUFF_KINDS[i], 1, t / 1000, 1);
        }
      }
    });
    ctx.at(300, () => {
      av?.play('punch', ctx.aim);
      const c = ctx.casterAt();
      flight(ctx, { x: c.x + 20, y: c.y }, { x: ctx.tx - 14, y: ctx.ty }, CHOCO_SPEED,
        (gg, x, y) => chocoBall(gg, ctx.tint, x, y, 11, t / 1000, 1),
        () => { fx.chocoSplat(ctx.tx, ctx.ty); loanAt = t; float(ctx, ctx.tx, ctx.ty - 36, '🍫 SHARED +6', SAVOR.lemon); });
    });
    ctx.at(2700, () => { fx.crash(ctx.tx, ctx.ty); float(ctx, ctx.tx, ctx.ty - 36, '💤 SUGAR CRASH', SAVOR.saltDark); });
  },
};

export const sugarRush: PreviewScript = {
  duration: 4400,
  caption: 'Q — Sugar Rush: triple speed and every candy buff doubled for 12s',
  run(ctx) {
    const av = stand(ctx, 'sugar');
    const fx = fxOf(ctx);
    const g = layer(ctx, 18);
    let on = -1;
    let t = 0;
    const colors = [SAVOR.cinnamon, SAVOR.lemon, SAVOR.mint, SAVOR.sky, SAVOR.violet, SAVOR.punch];
    ctx.onFrame((dt) => {
      t += dt;
      g.clear();
      if (on < 0) return;
      for (let i = 0; i < colors.length; i++) {
        g.lineStyle(5, ctx.tint(colors[(i + Math.floor(t / 100)) % colors.length]), 0.3);
        g.strokeRect(4 + i * 5, 4 + i * 5, ctx.w - 8 - i * 10, ctx.h - 8 - i * 10);
      }
    });
    ctx.at(300, () => {
      const c = ctx.casterAt();
      av?.play('raise');
      av?.setRush(1);
      fx.rushIgnite(c.x, c.y);
      on = t;
      float(ctx, c.x, c.y - 44, 'SUGAR RUSH!', SAVOR.punchLit);
    });
    ctx.at(1100, () => ctx.glideCaster({ to: { x: ctx.cx + 180, y: ctx.cy - 20 }, ms: 300, ease: 'out' }));
    ctx.at(1700, () => ctx.glideCaster({ to: { x: ctx.cx - 180, y: ctx.cy + 20 }, ms: 300, ease: 'out' }));
    ctx.at(2300, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 300, ease: 'out' }));
  },
};

// ══ SALT ═══════════════════════════════════════════════════════════════

export const saltSlice: PreviewScript = {
  duration: 3200,
  caption: 'Click (Salt) — a fast shard: 12 plus 3% of their max health. Big health pools bleed faster',
  run(ctx) {
    const av = stand(ctx, 'salt');
    ctx.addDummy();
    const fx = fxOf(ctx);
    for (let i = 0; i < 3; i++) {
      ctx.at(300 + i * 700, () => {
        av?.play('punch', ctx.aim);
        const c = ctx.casterAt();
        const from = { x: c.x + Math.cos(ctx.aim) * 20, y: c.y + Math.sin(ctx.aim) * 20 };
        fx.sliceLaunch(from.x, from.y, ctx.aim);
        flight(ctx, from, { x: ctx.tx - 16, y: ctx.ty }, SLICE_SPEED,
          (g, x, y) => saltShard(g, ctx.tint, x, y, ctx.aim, 22, 4.5, 1),
          () => { fx.shatter(ctx.tx - 16, ctx.ty, ctx.aim); float(ctx, ctx.tx, ctx.ty - 30, '-24', SAVOR.saltEdge); });
      });
    }
  },
};

export const saltShield: PreviewScript = {
  duration: 5000,
  caption: 'E (Salt) — a crust of shield, 2/s rising to 5/s, until 75 — or until it is knocked to nothing',
  run(ctx) {
    const av = stand(ctx, 'salt');
    const fx = fxOf(ctx);
    const read = label(ctx, ctx.w * 0.5, 16, SAVOR.salt);
    let shield = 0;
    let on = false;
    let age = 0;
    ctx.onFrame((dt) => {
      if (!on) return;
      age += dt / 1000;
      // The preview runs the growth at 4× so the whole climb fits the loop.
      const rate = Math.min(5, 2 + age * 4);
      shield = Math.min(75, shield + rate * (dt / 1000) * 4);
      av?.setShield(shield / 75);
      read.setText(`SHIELD ${Math.round(shield)}/75  (${rate.toFixed(1)}/s)`);
      if (shield >= 75) on = false;
    });
    ctx.at(300, () => { av?.play('flex'); const c = ctx.casterAt(); fx.shift(c.x, c.y, 'salt'); on = true; });
  },
};

export const saltInfusion: PreviewScript = {
  duration: 5200,
  caption: 'R (Salt) — grow a stalactite, R again on the bar: 48 green / 32 yellow / 18 red. It soaks up their buffs',
  run(ctx) {
    const av = stand(ctx, 'salt');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const g = layer(ctx, 9);
    let aimAt = -1;
    let crystal = false;
    let t = 0;
    const coat = [SAVOR.cinnamon, SAVOR.lemon];
    ctx.onFrame((dt) => {
      t += dt;
      g.clear();
      const c = ctx.casterAt();
      if (aimAt >= 0) {
        const ph = ((t - aimAt) % BAR_PERIOD_MS) / BAR_PERIOD_MS;
        const k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        saltShard(g, ctx.tint, c.x + Math.cos(ctx.aim) * 34, c.y + Math.sin(ctx.aim) * 34, ctx.aim, 44, 9, 1);
        timingBar(g, ctx.tint, c.x, c.y + 38, 84, k, 1, GREEN_HALF, YELLOW_HALF);
      }
      // The target wears borrowed buffs: a gold ring.
      g.lineStyle(2, ctx.tint(SAVOR.lemon), 0.6);
      g.strokeCircle(ctx.tx, ctx.ty, 26);
      if (crystal) saltShard(g, ctx.tint, ctx.tx + 140, ctx.ty, -Math.PI / 2 + 0.3, 26, 7, 1, coat);
    });
    ctx.at(300, () => { aimAt = t; av?.setHold('charge', ctx.aim); });
    // Fire exactly as the marker crosses the green: half a period after the bar starts.
    ctx.at(300 + BAR_PERIOD_MS * 1.5, () => {
      aimAt = -1;
      av?.setHold(null);
      av?.play('punch', ctx.aim);
      const c = ctx.casterAt();
      float(ctx, c.x, c.y - 40, 'PERFECT!', SAVOR.zoneGreen);
      const from = { x: c.x + Math.cos(ctx.aim) * 26, y: c.y + Math.sin(ctx.aim) * 26 };
      let coated = false;
      flight(ctx, from, { x: ctx.tx + 140, y: ctx.ty }, INFUSE_SPEED, (gg, x, y) => {
        if (!coated && x >= ctx.tx) { coated = true; fx.coatFlash(ctx.tx, ctx.ty, coat); float(ctx, ctx.tx, ctx.ty - 30, '-48', SAVOR.saltEdge); }
        saltShard(gg, ctx.tint, x, y, ctx.aim, 44, 9, 1, coated ? coat : []);
      }, () => { fx.shatter(ctx.tx + 140, ctx.ty, ctx.aim, true); crystal = true; });
    });
    ctx.at(4000, () => ctx.glideCaster({ to: { x: ctx.tx + 140, y: ctx.ty + 4 }, ms: 500, ease: 'out', onDone: () => {
      crystal = false;
      fx.coatFlash(ctx.tx + 140, ctx.ty, coat);
      float(ctx, ctx.tx + 140, ctx.ty - 30, '🧂 +2 STACKS', SAVOR.salt);
    } }));
  },
};

export const saltWounds: PreviewScript = {
  duration: 4200,
  caption: 'F (Salt) — a cone of stinging salt: half of everything they took in the last 2 seconds',
  run(ctx) {
    const av = stand(ctx, 'salt');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const tx = ctx.cx + 140;
    const ty = ctx.cy;
    ctx.moveCaster(ctx.cx, ctx.cy);
    for (let i = 0; i < 3; i++) ctx.at(300 + i * 350, () => { fx.shatter(tx, ty, Math.PI); float(ctx, tx, ty - 28, '-20', SAVOR.saltEdge); });
    ctx.at(1700, () => {
      av?.play('sweep', 0);
      fx.woundSpray(ctx.cx, ctx.cy, 0, WOUND_HALF, WOUND_RANGE, 1);
      fx.sting(tx, ty, 0.8);
      float(ctx, tx, ty - 36, '-30  (½ of 60)', SAVOR.zoneRed);
    });
  },
};

export const saltCrash: PreviewScript = {
  duration: 6000,
  caption: 'Q (Salt) — spears hold everyone up; race to press the crystals. Win: +40 damage and Salted candies',
  run(ctx) {
    const av = stand(ctx, 'salt');
    ctx.addDummy();
    const fx = fxOf(ctx);
    const g = layer(ctx, 18);
    const spears = layer(ctx, 4);
    let raceAt = -1;
    let t = 0;
    let mine = 0;
    let theirs = 0;
    const targets = [{ x: ctx.w * 0.25, y: ctx.h * 0.3 }, { x: ctx.w * 0.7, y: ctx.h * 0.65 }];
    ctx.onFrame((dt) => {
      t += dt;
      g.clear();
      spears.clear();
      if (raceAt < 0) return;
      for (let i = 0; i < 3; i++) saltSpear(spears, ctx.tint, ctx.tx + (i - 1) * 12, ctx.ty + 22, 34 + (i === 1 ? 10 : 0), 1, 0.95, (1 - i) * 0.08);
      const age = t - raceAt;
      if (age > 3000) return;
      for (const p of targets) crashCrystal(g, ctx.tint, p.x, p.y, 16, t / 1000, 1);
      const bw = 200;
      const total = Math.max(1, mine + theirs);
      g.fillStyle(SAVOR.ink, 0.85);
      g.fillRect(ctx.w / 2 - bw / 2 - 3, 8, bw + 6, 16);
      g.fillStyle(ctx.tint(SAVOR.salt), 1);
      g.fillRect(ctx.w / 2 - bw / 2, 11, bw * (mine / total), 10);
      g.fillStyle(ctx.tint(SAVOR.zoneRed), 1);
      g.fillRect(ctx.w / 2 - bw / 2 + bw * (mine / total), 11, bw * (theirs / total), 10);
    });
    ctx.at(300, () => {
      av?.play('slam');
      fx.spearsErupt(ctx.tx, ctx.ty);
      float(ctx, ctx.tx, ctx.ty - 40, '-30', SAVOR.saltEdge);
      raceAt = t;
    });
    for (let i = 0; i < 7; i++) {
      ctx.at(700 + i * 360, () => {
        const p = targets[i % 2];
        fx.shatter(p.x, p.y, -Math.PI / 2);
        mine++;
        if (i % 2) theirs++;
        p.x = ctx.w * (0.2 + ((i * 37) % 60) / 100);
        p.y = ctx.h * (0.25 + ((i * 23) % 50) / 100);
      });
    }
    ctx.at(3500, () => {
      const c = ctx.casterAt();
      float(ctx, ctx.tx, ctx.ty - 40, '-40', SAVOR.saltEdge);
      fx.salted(c.x, c.y);
      float(ctx, c.x, c.y - 44, '🧂 SALTED!', SAVOR.white);
    });
  },
};
