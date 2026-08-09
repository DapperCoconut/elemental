import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  FOR, FortuneAvatar, FortuneFx, auditMark, auditor, bloodCoin, bouncyBolt, bulletShape,
  daggerShape, gildedAura, goldBeam, goldCone, grenadeShape, gunShape, healPylon, midasBullet,
  muzzleOf, pepperFlame, roombaShape, stall, turnstile,
} from '../../../elements/kits/FortuneVisuals';

/**
 * Fortune's showcases.
 *
 * There is no `proj-fortune` — every bullet, dagger, coin, turnstile and flame is Graphics the
 * kit repaints each frame — so these loops keep the kit's own little records and paint them with
 * the real painters: `bulletShape`, `daggerShape`, `bloodCoin`, `stall`, `turnstile`, `goldBeam`,
 * `pepperFlame`, `roombaShape`, and `muzzleOf` for where a shot actually leaves the barrel.
 * One-shots go through a real `FortuneFx` with a sticky sink.
 */

// ── Staging ───────────────────────────────────────────────────────────

interface Shot { x: number; y: number; vx: number; vy: number; size: number; seed: number; dead: boolean }

function fxOf(ctx: PreviewCtx): FortuneFx {
  return ctx.capture(() => new FortuneFx(ctx.scene, ctx.tint).setSink(ctx.sink));
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
  }).setOrigin(0.5).setDepth(24));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(24));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The shopkeeper rig, or null when a skin has replaced the character. */
function keeper(av: unknown): FortuneAvatar | null {
  return av instanceof FortuneAvatar ? av : null;
}

/** The purse, drawn as the kit draws a coin, with the running total beside it. */
function purse(ctx: PreviewCtx, read: () => number, at: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(23));
  const t = ctx.adopt(ctx.scene.add.text(at.x + 14, at.y, '', {
    fontSize: '13px', fontFamily: 'Arial Black', color: hex(FOR.goldLit),
  }).setOrigin(0, 0.5).setDepth(23));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    bloodCoin(g, ctx.tint, at.x, at.y, 8, 1, { spin: elapsed / 400 });
    t.setText(`${Math.floor(read())}`);
  });
}

/** Bullets in the air, stepped and painted exactly as `updateBullets` does. */
function bulletLayer(ctx: PreviewCtx, shots: Shot[], depth = 11): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame((delta) => {
    g.clear();
    const dt = delta / 1000;
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.dead || b.x < -20 || b.x > ctx.w + 20) { shots.splice(i, 1); continue; }
      bulletShape(g, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), b.size, 1, { seed: b.seed });
    }
  });
}

// ══ CLICK — Open Fire ═════════════════════════════════════════════════

export const openFire: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'Click — the gun is the rate limiter, and the gun is whatever you have bought',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    const rig = keeper(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 220, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const shots: Shot[] = [];
    bulletLayer(ctx, shots);
    const coins = { n: 0 };
    purse(ctx, () => coins.n, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#b8c2cc', 10);

    // The held gun, drawn with the kit's own painter so the silhouette is the real one.
    const held = { kind: 'pistol', recoil: 0, ammo: 10, mag: 10 };
    const gunG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta) => {
      held.recoil = Math.max(0, held.recoil - delta / 220);
      gunG.clear();
      gunShape(gunG, ctx.tint, ctx.cx, ctx.cy, ctx.aim, held.kind, 1,
        { recoil: held.recoil, golden: held.kind === 'golden' });
      gauge.setText(`${held.kind.toUpperCase()}   ·   ${held.ammo}/${held.mag} rounds`);
    });

    const fire = (dmg: number, speed: number, size: number): void => {
      const mz = muzzleOf(ctx.cx, ctx.cy, ctx.aim, held.kind);
      held.recoil = 1;
      held.ammo = Math.max(0, held.ammo - 1);
      rig?.kick(1);
      av.play('punch', ctx.aim);
      ctx.capture(() => { fx.muzzle(mz.x, mz.y, ctx.aim, 1); fx.brass(ctx.cx, ctx.cy - 4, ctx.aim); });
      shots.push({ x: mz.x, y: mz.y, vx: Math.cos(ctx.aim) * speed, vy: Math.sin(ctx.aim) * speed, size, seed: dmg, dead: false });
      // 1 coin per 20 damage, and the remainder is carried rather than rounded away.
      const before = Math.floor(coins.n);
      coins.n += dmg / 20;
      ctx.scene.time.delayedCall(Math.max(0, ((victim.x - mz.x) / speed) * 1000), () => {
        float(ctx, victim.x, victim.y - 22, `${dmg}`, '#ffb3aa', dmg >= 30 ? 16 : 13);
        if (Math.floor(coins.n) > before) ctx.capture(() => fx.coinBurst(victim.x, victim.y - 6, 1, 24));
      });
    };

    ctx.at(300, () => readout.setText('the free pistol: 10 damage, 10 rounds, a shot every 190ms'));
    for (let i = 0; i < 5; i++) ctx.at(700 + i * 190, () => fire(10, 900, 5));
    ctx.at(2400, () => {
      held.kind = 'rifle'; held.ammo = 1; held.mag = 1;
      rig?.setGun('rifle');
      ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 40, 480, 22));
      float(ctx, ctx.cx, ctx.cy - 48, '🪖 RIFLE', hex(FOR.gold), 12);
      readout.setText('10 coins at the counter: 30 damage — and one round in it');
    });
    ctx.at(3000, () => fire(30, 1120, 7));
    ctx.at(4600, () => { held.ammo = 1; fire(30, 1120, 7); });
    ctx.at(6000, () => {
      held.mag = 1; held.ammo = 1;
      ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 40, 480, 22));
      float(ctx, ctx.cx, ctx.cy - 48, '🔩 +🛢️ MODS', hex(FOR.contraband), 12);
      readout.setText('Hollow Point and 50 Cal. from the drawer: +5 and +10 a bullet');
    });
    ctx.at(6600, () => fire(45, 1120, 7));
    ctx.at(8200, () => { held.ammo = 1; fire(45, 1120, 7); });
    ctx.at(9600, () => {
      held.kind = 'golden'; held.ammo = 10; held.mag = 10;
      rig?.setGun('golden');
      ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 46, 520, 22));
      float(ctx, ctx.cx, ctx.cy - 48, '🌟 GOLDEN PISTOL', hex(FOR.goldLit), 13);
      readout.setText('30 coins: hitscan, 20 damage, +1 for every 2 coins in your purse');
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(10400 + i * 700, () => {
        const dmg = 20 + Math.floor(coins.n / 2);
        held.recoil = 1; held.ammo--;
        rig?.kick(0.6);
        av.play('punch', ctx.aim);
        const mz = muzzleOf(ctx.cx, ctx.cy, ctx.aim, 'golden');
        ctx.capture(() => { fx.muzzle(mz.x, mz.y, ctx.aim, 0.8); fx.impact(victim.x, victim.y, ctx.aim + Math.PI); });
        float(ctx, victim.x, victim.y - 22, `${dmg}`, '#ffb3aa', 17);
        coins.n += dmg / 20;
      });
    }
    ctx.at(13000, () => readout.setText('so banking your money makes this gun worse — it is the one item arguing against the other buttons'));
  },
};

// ══ CLICK+ — Alt-Fire ═════════════════════════════════════════════════

export const openFireUpgraded: PreviewScript = {
  duration: 17000,
  scale: 0.85,
  caption: 'Click+ — every gun turns out to have a second trigger, and none of them are the same',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    const rig = keeper(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 230, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const shots: Shot[] = [];
    bulletLayer(ctx, shots);
    const coins = { n: 18 };
    purse(ctx, () => coins.n, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#b8c2cc', 10);

    const held = { kind: 'pistol', recoil: 0, ammo: 10, mag: 10, spin: 0 };
    const gunG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta) => {
      held.recoil = Math.max(0, held.recoil - delta / 220);
      gunG.clear();
      // A revolver being wound up is drawn spinning in the hand rather than levelled.
      gunShape(gunG, ctx.tint, ctx.cx, ctx.cy, ctx.aim + held.spin * 6, held.kind, 1,
        { recoil: held.recoil, golden: held.kind === 'golden' });
      gauge.setText(`${held.kind.toUpperCase()}   ·   ${held.ammo}/${held.mag} rounds`);
    });

    const spit = (dmg: number, speed: number, size: number, spread: number): void => {
      const a = ctx.aim + (Math.random() - 0.5) * spread;
      const mz = muzzleOf(ctx.cx, ctx.cy, a, held.kind);
      held.recoil = 1;
      held.ammo = Math.max(0, held.ammo - 1);
      rig?.kick(1);
      ctx.capture(() => fx.muzzle(mz.x, mz.y, a, 1));
      shots.push({ x: mz.x, y: mz.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, size, seed: dmg, dead: false });
    };

    // ── The pistol dump: every round in the magazine, 55ms apart, aimed by hope.
    ctx.at(300, () => readout.setText('right click on the pistol: the whole magazine, one round every 55ms'));
    for (let i = 0; i < 10; i++) ctx.at(700 + i * 55, () => spit(10, 900, 5, 0.34));
    ctx.at(1300, () => float(ctx, ctx.cx, ctx.cy - 44, '🔫 MAG DUMP', hex(FOR.gold), 12));
    ctx.at(1900, () => readout.setText('scattered across 0.34 radians — and it starts its own reload, because there is nothing left'));

    // ── The revolver, spun up for three seconds.
    ctx.at(3400, () => {
      held.kind = 'revolver'; held.ammo = 6; held.mag = 6;
      rig?.setGun('revolver');
      readout.setText('the revolver is held instead. Three seconds of spinning walks it from 20 to 30.');
    });
    const spinBar = label(ctx, ctx.cx, ctx.cy - 62, '#fff0a8', 12);
    ctx.onFrame((delta, elapsed) => {
      if (elapsed < 3900 || elapsed > 6900) { held.spin = 0; spinBar.setText(''); return; }
      held.spin += delta / 2600;
      const k = Math.min(1, (elapsed - 3900) / 3000);
      spinBar.setPosition(ctx.cx, ctx.cy - 62).setText(`${Math.round(20 + 10 * k)} dmg  ·  ${Math.round(k * 100)}% spun`);
    });
    ctx.at(6950, () => {
      held.spin = 0;
      spinBar.setText('');
      const mz = muzzleOf(ctx.cx, ctx.cy, ctx.aim, 'revolver');
      held.recoil = 1; held.ammo--;
      rig?.kick(2);
      av.play('punch', ctx.aim);
      ctx.capture(() => { fx.muzzle(mz.x, mz.y, ctx.aim, 1.9); fx.impact(victim.x, victim.y, ctx.aim + Math.PI); });
      float(ctx, ctx.cx, ctx.cy - 46, '🎯 FULLY SPUN', hex(FOR.goldLit), 13);
      float(ctx, victim.x, victim.y - 22, '30', '#ffb3aa', 18);
      readout.setText('one round, for one round of ammunition — and a full charge pierces');
    });

    // ── The AR, throwing what is left of its clip.
    ctx.at(8400, () => {
      held.kind = 'ar'; held.ammo = 12; held.mag = 30;
      rig?.setGun('ar');
      readout.setText('the AR throws the rest of the clip at your cursor as one lump');
    });
    const clip = { x: 0, y: 0, live: false };
    const clipG = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame((delta, elapsed) => {
      clipG.clear();
      if (!clip.live) return;
      clip.x += 640 * (delta / 1000);
      grenadeShape(clipG, ctx.tint, clip.x, clip.y, 0, 1, { spin: elapsed / 120, size: 7 });
      if (clip.x < victim.x - 10) return;
      clip.live = false;
      ctx.capture(() => fx.blast(clip.x, clip.y, 34));
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        shots.push({
          x: clip.x, y: clip.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760,
          size: 4.4, seed: k, dead: false,
        });
      }
      float(ctx, clip.x, clip.y - 30, '💥 12 ROUNDS', hex(FOR.gold), 13);
    });
    ctx.at(9000, () => {
      clip.x = ctx.cx + 20; clip.y = ctx.cy; clip.live = true;
      held.ammo = 0;
      av.play('sweep', ctx.aim);
      float(ctx, ctx.cx, ctx.cy - 44, '💥 CLIP × 12', hex(FOR.gold), 12);
    });
    ctx.at(10400, () => readout.setText('it bursts where you pointed, into one bullet for every round that was in it'));

    // ── The golden pistol's Midas round.
    ctx.at(11800, () => {
      held.kind = 'golden'; held.ammo = 10; held.mag = 10;
      rig?.setGun('golden');
      readout.setText('and the golden pistol coughs up something slow: 5 coins and 2 rounds');
    });
    const midas = { x: 0, live: false };
    const gild = { until: -1 };
    const midasG = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame((delta, elapsed) => {
      midasG.clear();
      if (gild.until > elapsed) gildedAura(midasG, ctx.tint, victim.x, victim.y, 22, 1, { t: elapsed / 1000 });
      if (!midas.live) return;
      midas.x += 250 * (delta / 1000);
      midasBullet(midasG, ctx.tint, midas.x, ctx.cy - 2, 0, 1, { t: elapsed / 1000, seed: 3, size: 11 });
      if (midas.x < victim.x - 14) return;
      midas.live = false;
      gild.until = elapsed + 5000;
      ctx.capture(() => fx.impact(victim.x, victim.y, Math.PI));
      float(ctx, victim.x, victim.y - 22, '25', '#ffb3aa', 16);
      float(ctx, victim.x, victim.y - 40, '🌟 GILDED', hex(FOR.goldLit), 13);
    });
    ctx.at(12400, () => {
      coins.n -= 5; held.ammo -= 2;
      midas.x = ctx.cx + 26; midas.live = true;
      const mz = muzzleOf(ctx.cx, ctx.cy, ctx.aim, 'golden');
      held.recoil = 1;
      av.play('punch', ctx.aim);
      ctx.capture(() => fx.muzzle(mz.x, mz.y, ctx.aim, 1.6));
      float(ctx, ctx.cx, ctx.cy - 50, '🌟 MIDAS ROUND', hex(FOR.goldLit), 13);
    });
    ctx.at(14200, () => readout.setText('gilded for 5 seconds — and every coin their wounds mint is worth double'));
    ctx.at(15600, () => readout.setText('the launcher drops its shells at your feet and leaves; the blaster fires a 12-bounce laser'));
  },
};

// ══ E — Safe Investment ═══════════════════════════════════════════════

export const safeInvestment: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'E — 5 coins in; 10% every 10 seconds, never less than 1. Hold to withdraw.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const money = { purse: 12, bank: 0 };
    purse(ctx, () => money.purse, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const vault = label(ctx, ctx.w * 0.5, ctx.h - 20, '#fff0a8', 13);
    ctx.onFrame(() => vault.setText(`🏦 ${money.bank} banked`));

    const deposit = (at: number): void => ctx.at(at, () => {
      const n = Math.min(5, money.purse);
      if (n <= 0) { float(ctx, ctx.cx, ctx.cy - 44, '🏦 NOTHING TO DEPOSIT', hex(FOR.canvasShade), 11); return; }
      money.purse -= n; money.bank += n;
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 30, 420, 12));
      float(ctx, ctx.cx, ctx.cy - 44, `🏦 +${n} BANKED`, hex(FOR.gold), 12);
    });
    // The 10-second drum, compressed to 2.4s of loop so the ladder is visible.
    const settle = (at: number): void => ctx.at(at, () => {
      const gain = Math.max(1, Math.floor(money.bank * 0.10));
      money.bank += gain;
      ctx.capture(() => fx.coinBurst(ctx.cx, ctx.cy - 14, Math.min(5, gain), 22));
      float(ctx, ctx.cx, ctx.cy - 60, `🏦 +${gain} CAPITAL GAINS`, hex(FOR.gold), 12);
      readout.setText(`10% of ${money.bank - gain}, rounded down — but never less than 1`);
    });

    ctx.at(300, () => readout.setText('tap E: five coins in, or whatever you have if it is less'));
    deposit(700);
    deposit(1400);
    settle(3000); settle(5000); settle(7000); settle(9000);
    ctx.at(10600, () => {
      readout.setText('hold E for 340ms and the whole balance comes back at once');
      money.purse += money.bank;
      ctx.capture(() => fx.coinBurst(ctx.cx, ctx.cy - 10, 9, 40, 800));
      float(ctx, ctx.cx, ctx.cy - 48, `🪙 WITHDREW ${money.bank}`, hex(FOR.goldLit), 13);
      money.bank = 0;
    });
    ctx.at(12000, () => readout.setText('no risk, no condition, nothing can take it — the only free money in the game'));
  },
};

// ══ E+ — Safe Marketing ═══════════════════════════════════════════════

export const safeInvestmentUpgraded: PreviewScript = {
  duration: 15000,
  scale: 0.85,
  caption: 'E+ — three new lines on the public shelf: a cold pepper, a pylon, and a teleport',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const money = { purse: 20 };
    purse(ctx, () => money.purse, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#9fe4ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#bda98a', 10);

    const foe = { x: ctx.cx + 120, y: ctx.cy + 30, slowUntil: -1 };
    dummyAt(ctx, foe);
    // The harness parks the rig; the ring comes off wherever it is standing.
    const me = { x: ctx.cx, y: ctx.cy };
    const pylons = [
      { x: ctx.cx - 190, y: ctx.cy + 60, readyAt: 0 },
      { x: ctx.cx + 200, y: ctx.cy - 70, readyAt: 0 },
    ];
    const pepper = { until: -1, next: 0 };

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((delta, elapsed) => {
      g.clear();
      const t = elapsed / 1000;
      for (const p of pylons) healPylon(g, ctx.tint, p.x, p.y, 1, { t, ready: elapsed >= p.readyAt ? 1 : 0 });
      // The ring: one every three seconds, 132px across, 20% for five seconds on anything in it.
      if (elapsed < pepper.until && elapsed >= pepper.next) {
        pepper.next = elapsed + 3000;
        ctx.capture(() => fx.frost(me.x, me.y, 132));
        if (Phaser.Math.Distance.Between(me.x, me.y, foe.x, foe.y) <= 132) {
          foe.slowUntil = elapsed + 5000;
          float(ctx, foe.x, foe.y - 30, '🥶 CHILLED', '#9fe4ff', 11);
        }
      }
      void delta;
      gauge.setText(elapsed < pepper.until
        ? `🥶 ${((pepper.until - elapsed) / 1000).toFixed(1)}s of pepper left  ·  next ring in ${((pepper.next - elapsed) / 1000).toFixed(1)}s`
        : elapsed < foe.slowUntil ? 'their move speed: 80%' : '');
    });

    ctx.at(300, () => readout.setText('Safe Marketing does not touch the bank. It restocks the counter.'));
    ctx.at(900, () => {
      money.purse -= 3;
      pepper.until = 12900; pepper.next = 900;
      ctx.capture(() => fx.cash(me.x, me.y, 40, 480, 22));
      float(ctx, me.x, me.y - 48, '🥶 CHILLY PEPPER  −3', hex(FOR.gold), 12);
      readout.setText('a freezing ring off you every 3 seconds, for 12');
    });
    ctx.at(4200, () => readout.setText('20% slower for 5 seconds on anything of theirs it catches'));
    ctx.at(6000, () => {
      money.purse -= 5;
      pylons[0].readyAt = 0;
      ctx.capture(() => fx.cash(pylons[0].x, pylons[0].y - 16, 30, 420, 12));
      float(ctx, me.x, me.y - 48, '🗼 HEAL PYLON  −5', hex(FOR.neon), 12);
      readout.setText('a pylon somewhere on the floor. Green means it has a charge in it.');
    });
    ctx.at(7400, () => {
      // Touch it: 10 HP, and the light goes out for five seconds.
      ctx.capture(() => fx.cash(pylons[0].x, pylons[0].y - 16, 26, 420, 12));
      pylons[0].readyAt = 12400;
      float(ctx, pylons[0].x, pylons[0].y - 34, '🗼 +10', hex(FOR.neon), 13);
      readout.setText('touch it below full health: 10 HP, and it goes dark for 5 seconds');
    });
    ctx.at(9200, () => {
      money.purse -= 8;
      float(ctx, me.x, me.y - 48, '🌀 TELE-CORE  −8', hex(FOR.neon), 12);
      readout.setText('and for 12 seconds Space stops being a dash');
    });
    // The jump, drawn as the two ends of it: the hole you leave and the one you arrive in.
    const jump = (at: number, to: { x: number; y: number }): void => ctx.at(at, () => {
      ctx.capture(() => fx.rift(me.x, me.y, 30));
      ctx.capture(() => fx.rift(to.x, to.y, 30));
      float(ctx, to.x, to.y - 44, '🌀 TELEPORT', hex(FOR.goldLit), 12);
    });
    jump(10400, { x: ctx.cx + 230, y: ctx.cy - 90 });
    jump(11800, { x: ctx.cx - 120, y: ctx.cy + 60 });
    ctx.at(13000, () => readout.setText('all three sit on the GENERAL page — the enemy can buy them, and pays you half for it'));
  },
};

// ══ R — Risky Investment ══════════════════════════════════════════════

export const riskyInvestment: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  caption: 'R — the market judges the 10 seconds after: +20% dealing, −20% taking, +10% both',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const money = { purse: 15, stocks: 0, dealt: 0, taken: 0 };
    purse(ctx, () => money.purse, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#6ef2a2', 11);
    const board = label(ctx, ctx.w * 0.5, ctx.h - 20, '#6ef2a2', 12);
    ctx.onFrame(() => board.setText(
      `📈 ${money.stocks} invested   ·   dealt ${Math.round(money.dealt)}/50   ·   taken ${Math.round(money.taken)}/100`));

    ctx.at(400, () => {
      const n = Math.min(5, money.purse);
      money.purse -= n; money.stocks += n;
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 30, 420, 12));
      float(ctx, ctx.cx, ctx.cy - 44, `📈 +${n} INVESTED`, hex(FOR.contraband), 12);
      readout.setText('fresh money resets the window it will be judged on');
    });
    const settleAt = (at: number, dealt: number, taken: number, why: string): void => {
      ctx.at(at - 900, () => { money.dealt = dealt; money.taken = taken; readout.setText(why); });
      ctx.at(at, () => {
        const good = money.dealt > 50, bad = money.taken > 100;
        const rate = good && bad ? 0.10 : good ? 0.20 : bad ? -0.20 : 0;
        money.dealt = 0; money.taken = 0;
        if (rate === 0) {
          float(ctx, ctx.cx, ctx.cy - 60, 'no change', '#bda98a', 11);
          return;
        }
        const d = Math.max(1, Math.round(Math.abs(money.stocks * rate))) * Math.sign(rate);
        money.stocks = Math.max(0, money.stocks + d);
        float(ctx, ctx.cx, ctx.cy - 60, `${d > 0 ? '📈 +' : '📉 '}${d} STOCK`,
          hex(d > 0 ? FOR.contraband : FOR.blood), 13);
      });
    };
    settleAt(3200, 84, 30, 'a good window: over 50 dealt, under 100 taken');
    settleAt(6000, 10, 140, 'a bad one: over 100 taken, and it can be ground to zero');
    settleAt(8800, 96, 132, 'both at once — the market splits the difference rather than choosing');
    settleAt(11400, 12, 20, 'and a quiet ten seconds settles at exactly nothing. Idling does not grow it.');
    ctx.at(12600, () => readout.setText('the take bar is twice the deal bar, so a bruising exchange still settles positive'));
  },
};

// ══ R+ — Risky Marketing ══════════════════════════════════════════════

export const riskyInvestmentUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.85,
  caption: 'R+ — two guns nobody should be selling, and three grips that trade one trigger for the other',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    const rig = keeper(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 250, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    const money = { purse: 40 };
    purse(ctx, () => money.purse, { x: 22, y: 16 });
    const readout = label(ctx, ctx.w * 0.5, 12, '#6ef2a2', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#b8c2cc', 10);

    const held = { kind: 'launcher', recoil: 0, ammo: 3, mag: 3 };
    const gunG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta) => {
      held.recoil = Math.max(0, held.recoil - delta / 220);
      gunG.clear();
      gunShape(gunG, ctx.tint, ctx.cx, ctx.cy, ctx.aim, held.kind, 1, { recoil: held.recoil });
      gauge.setText(`${held.kind === 'launcher' ? 'GRENADE LAUNCHER' : 'BOUNCY BLASTER'}   ·   ${held.ammo}/${held.mag}`);
    });

    // Shells: 380 px/s to where you aimed, bursting for 20 inside 94px.
    const shells: { x: number; y: number; vx: number; toX: number }[] = [];
    // Bolts: 700 px/s with three wall bounces, or 900 with twelve.
    const bolts: { x: number; y: number; vx: number; vy: number; left: number; max: number; heavy: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame((delta, elapsed) => {
      air.clear();
      const dt = delta / 1000;
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        const was = s.x;
        s.x += s.vx * dt;
        grenadeShape(air, ctx.tint, s.x, s.y, 0, 1, { spin: elapsed / 110, size: 7 });
        if ((was - s.toX) * (s.x - s.toX) > 0) continue;
        shells.splice(i, 1);
        ctx.capture(() => fx.blast(s.x, s.y, 94));
        float(ctx, s.x, s.y - 34, '20', '#ffb3aa', 15);
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        let bounced = false;
        if (b.x < 14 || b.x > ctx.w - 14) { b.vx = -b.vx; b.x = Phaser.Math.Clamp(b.x, 14, ctx.w - 14); bounced = true; }
        if (b.y < 14 || b.y > ctx.h - 14) { b.vy = -b.vy; b.y = Phaser.Math.Clamp(b.y, 14, ctx.h - 14); bounced = true; }
        if (bounced) {
          b.left--;
          ctx.capture(() => fx.impact(b.x, b.y, Math.atan2(b.vy, b.vx), 160));
          float(ctx, b.x, b.y - 16, `${b.left}`, '#6ef2a2', 10);
        }
        if (b.left <= 0) { bolts.splice(i, 1); continue; }
        bouncyBolt(air, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), b.heavy ? 8 : 5, 1,
          { charge: b.left / b.max, t: elapsed / 1000 });
      }
    });

    ctx.at(300, () => {
      money.purse -= 20;
      float(ctx, ctx.cx, ctx.cy - 48, '💣 GRENADE LAUNCHER  −20', hex(FOR.gold), 12);
      readout.setText('3 shells, a 2.7 second reload, and 20 damage inside 94px wherever you aimed');
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(900 + i * 700, () => {
        held.recoil = 1; held.ammo--;
        rig?.kick(1.2);
        av.play('punch', ctx.aim);
        shells.push({ x: ctx.cx + 26, y: ctx.cy - 2, vx: 380, toX: victim.x + (i - 1) * 40 });
      });
    }
    ctx.at(3200, () => readout.setText('right click drops all of them at your own feet instead — and then you leave'));
    ctx.at(3900, () => {
      held.ammo = 0;
      ctx.capture(() => { fx.blast(ctx.cx, ctx.cy, 113); fx.rift(ctx.cx, ctx.cy + 6, 30); });
      float(ctx, ctx.cx, ctx.cy - 60, '🚀 EXIT STRATEGY', hex(FOR.goldLit), 13);
      readout.setText('60 damage at point blank, and 3 seconds off the screen where nothing can touch you');
    });
    ctx.at(7200, () => {
      ctx.capture(() => fx.rift(ctx.cx, ctx.cy, 30));
      float(ctx, ctx.cx, ctx.cy - 44, '🪂 TOUCHDOWN', hex(FOR.gold), 12);
    });

    ctx.at(8400, () => {
      money.purse -= 12;
      held.kind = 'bouncy'; held.ammo = 8; held.mag = 8;
      rig?.setGun('bouncy');
      float(ctx, ctx.cx, ctx.cy - 48, '🟢 BOUNCY BLASTER  −12', hex(FOR.neon), 12);
      readout.setText('8 rounds of 10 — and each one comes off the walls three times');
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(9000 + i * 600, () => {
        held.recoil = 1; held.ammo--;
        const a = ctx.aim - 0.5 + i * 0.5;
        bolts.push({ x: ctx.cx + 22, y: ctx.cy, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, left: 3, max: 3, heavy: false });
      });
    }
    ctx.at(11400, () => {
      held.ammo -= 4;
      const a = ctx.aim - 0.35;
      bolts.push({ x: ctx.cx + 22, y: ctx.cy, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, left: 12, max: 12, heavy: true });
      float(ctx, ctx.cx, ctx.cy - 46, '🟢 HEAVY LASER', hex(FOR.neon), 12);
      readout.setText('the alt is 4 rounds for one 20-damage bolt with twelve bounces in it');
    });
    ctx.at(14000, () => readout.setText('and three grips: Specialized ×1.5 on the alt, Basic ×1.35 on the main, Dual Grip for a whole second gun'));
  },
};

// ══ F — Paywall ═══════════════════════════════════════════════════════

export const paywall: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'F — a full-height row of turnstiles: 1 coin a shot, 3 a crossing, all of it to you',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const mine = { coins: 4 };
    const theirs = { coins: 14 };
    purse(ctx, () => mine.coins, { x: 22, y: 16 });
    const themPurse = ctx.adopt(ctx.scene.add.text(ctx.w - 22, 16, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: hex(FOR.canvasShade),
    }).setOrigin(1, 0.5).setDepth(23));
    ctx.onFrame(() => themPurse.setText(`enemy purse ${theirs.coins} 🪙`));

    const enemy = { x: ctx.w * 0.85, y: ctx.cy };
    dummyAt(ctx, enemy);
    const wall = { x: ctx.w * 0.6, up: false, hot: 0 };
    const shots: Shot[] = [];
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);

    // The line itself: a column of turnstiles top to bottom, exactly as the kit paints it.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((delta, elapsed) => {
      g.clear();
      wall.hot = Math.max(0, wall.hot - delta / 260);
      if (!wall.up) return;
      for (let y = 18; y < ctx.h; y += 42) {
        turnstile(g, ctx.tint, wall.x, y, 1, { spin: elapsed / 500 + y, hot: wall.hot });
      }
    });
    // Their shots, and the toll each one pays on the way through.
    const bullets = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((delta) => {
      bullets.clear();
      const dt = delta / 1000;
      for (let i = shots.length - 1; i >= 0; i--) {
        const b = shots[i];
        const wasRight = b.x > wall.x;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -20) { shots.splice(i, 1); continue; }
        if (wall.up && wasRight && b.x <= wall.x && !b.dead) {
          b.dead = true;
          const paid = Math.min(1, theirs.coins);
          wall.hot = 1;
          if (paid > 0) {
            theirs.coins -= paid; mine.coins += paid;
            ctx.capture(() => fx.coinBurst(wall.x, b.y, 1, 20, 560));
            float(ctx, wall.x, b.y - 18, '🎫 −1', hex(FOR.gold), 11);
          } else {
            float(ctx, wall.x, b.y - 18, '🎫 NO FUNDS', hex(FOR.canvasShade), 10);
          }
        }
        bulletShape(bullets, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), 5, 1, { seed: i });
      }
    });

    ctx.at(400, () => {
      wall.up = true;
      av.play('slam', ctx.aim);
      float(ctx, wall.x, 30, '🎫 PAYWALL', hex(FOR.gold), 12);
      readout.setText('full arena height, 5 seconds — and it blocks absolutely nothing');
    });
    for (let i = 0; i < 5; i++) {
      ctx.at(900 + i * 380, () => {
        shots.push({ x: enemy.x - 20, y: enemy.y + (i - 2) * 9, vx: -820, vy: 0, size: 5, seed: i, dead: false });
      });
    }
    ctx.at(1800, () => readout.setText('every shot they put through it costs them a coin, straight into your purse'));
    // And the body crossing, which is worth three.
    ctx.onFrame((delta, elapsed) => {
      if (elapsed < 4200 || elapsed > 6400) return;
      const wasRight = enemy.x > wall.x;
      enemy.x -= 150 * (delta / 1000);
      if (wall.up && wasRight && enemy.x <= wall.x) {
        const paid = Math.min(3, theirs.coins);
        wall.hot = 1;
        theirs.coins -= paid; mine.coins += paid;
        ctx.capture(() => fx.coinBurst(wall.x, enemy.y, Math.min(4, paid), 20, 560));
        float(ctx, wall.x, enemy.y - 18, `🎫 −${paid}`, hex(FOR.gold), 13);
      }
    });
    ctx.at(4400, () => readout.setText('and walking through it is 3 — charged on the crossing, so leaning on it is free'));
    ctx.at(7000, () => { wall.up = false; readout.setText('nothing is destroyed. It changes hands.'); });
    ctx.at(9000, () => readout.setText('a payer with no coins passes free — it can only take what they actually have'));
  },
};

// ══ F+ — Tax Evasion ══════════════════════════════════════════════════

export const paywallUpgraded: PreviewScript = {
  duration: 15000,
  scale: 0.85,
  caption: 'F+ — 7.5 seconds of turnstiles, and past 10 coins somebody comes to look at the books',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const mine = { coins: 6 };
    const theirs = { coins: 22 };
    purse(ctx, () => mine.coins, { x: 22, y: 16 });
    const themPurse = ctx.adopt(ctx.scene.add.text(ctx.w - 22, 16, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: hex(FOR.canvasShade),
    }).setOrigin(1, 0.5).setDepth(23));
    ctx.onFrame(() => themPurse.setText(`enemy purse ${theirs.coins} 🪙`));

    const enemy = { x: ctx.w * 0.86, y: ctx.cy + 10 };
    dummyAt(ctx, enemy);
    const wall = { x: ctx.w * 0.62, up: false, hot: 0, take: 0 };
    const shots: Shot[] = [];
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const ledger = label(ctx, ctx.w * 0.5, ctx.h - 18, '#b3202e', 11);
    ctx.onFrame(() => ledger.setText(wall.up ? `🎫 ${wall.take} coins through this wall  ·  audit at 11` : ''));

    // The line, and the man at the top of the screen once the ledger is interesting.
    const audit = { on: false, firesAt: 0, done: false, flash: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((delta, elapsed) => {
      g.clear();
      wall.hot = Math.max(0, wall.hot - delta / 260);
      audit.flash = Math.max(0, audit.flash - delta / 240);
      if (wall.up) {
        for (let y = 18; y < ctx.h; y += 42) {
          turnstile(g, ctx.tint, wall.x, y, 1, { spin: elapsed / 500 + y, hot: wall.hot });
        }
      }
      if (!audit.on) return;
      const ay = 6;
      const ang = Math.atan2(enemy.y - ay, enemy.x - wall.x);
      auditor(g, ctx.tint, wall.x, ay, ang, 1, { fired: audit.done ? audit.flash : 0 });
      if (audit.done) return;
      const lock = Phaser.Math.Clamp(1 - (audit.firesAt - elapsed) / 5000, 0, 1);
      auditMark(g, ctx.tint, wall.x + Math.cos(ang) * 30, ay + Math.sin(ang) * 30,
        enemy.x, enemy.y, 1, { t: elapsed / 1000, lock });
      if (elapsed < audit.firesAt) return;
      audit.done = true;
      audit.flash = 1;
      ctx.capture(() => fx.impact(enemy.x, enemy.y, ang + Math.PI, 420));
      float(ctx, enemy.x, enemy.y - 24, '35', '#ffb3aa', 18);
      float(ctx, enemy.x, enemy.y - 46, '🎯 ASSESSED', hex(FOR.blood), 13);
      readout.setText('35 damage, 20% slower, and 20% more damage taken from everything for 8 seconds');
    });

    // Their shots, each one a coin — or, with an empty purse, eight damage.
    const bullets = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((delta) => {
      bullets.clear();
      const dt = delta / 1000;
      for (let i = shots.length - 1; i >= 0; i--) {
        const b = shots[i];
        const wasRight = b.x > wall.x;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -20) { shots.splice(i, 1); continue; }
        if (wall.up && wasRight && b.x <= wall.x && !b.dead) {
          b.dead = true;
          wall.hot = 1;
          if (theirs.coins > 0) {
            theirs.coins -= 1; mine.coins += 1; wall.take += 1;
            ctx.capture(() => fx.coinBurst(wall.x, b.y, 1, 20, 560));
            float(ctx, wall.x, b.y - 18, '🎫 −1', hex(FOR.gold), 11);
            if (wall.take > 10 && !audit.on) {
              audit.on = true;
              audit.firesAt = 0;
              float(ctx, wall.x, 44, '🕵️ AUDIT', hex(FOR.blood), 13);
            }
          } else {
            float(ctx, wall.x, b.y - 18, '🎫 8 IN BLOOD', hex(FOR.blood), 11);
          }
        }
        bulletShape(bullets, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), 5, 1, { seed: i });
      }
    });
    // The audit clock cannot be set from inside the bullet loop without knowing the time.
    ctx.onFrame((_delta, elapsed) => {
      if (audit.on && audit.firesAt === 0) audit.firesAt = elapsed + 5000;
    });

    ctx.at(300, () => {
      wall.up = true;
      av.play('slam', ctx.aim);
      float(ctx, wall.x, 30, '🎫 PAYWALL', hex(FOR.gold), 12);
      readout.setText('7.5 seconds instead of 5 — half again as long to run the meter up');
    });
    for (let i = 0; i < 13; i++) {
      ctx.at(800 + i * 330, () => {
        shots.push({ x: enemy.x - 20, y: enemy.y + ((i % 5) - 2) * 11, vx: -820, vy: 0, size: 5, seed: i, dead: false });
      });
    }
    ctx.at(2400, () => readout.setText('every shot through it is still a coin — the ledger is what changed'));
    ctx.at(5200, () => readout.setText('past ten coins, a man in a hat is lying at the top of the arena'));
    ctx.at(6400, () => readout.setText('he takes five seconds to be sure. The reticle closing is the clock.'));
    ctx.at(12400, () => readout.setText('and an enemy with an empty purse pays the toll in blood: 8 damage a coin'));
  },
};

// ══ Q — Pay-to-Win ════════════════════════════════════════════════════

export const payToWin: PreviewScript = {
  duration: 13000,
  scale: 0.58,
  caption: 'Q — 95 damage a second down a 520px beam, at 6 coins a second, until the purse is empty',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    const rig = keeper(av);
    av.setFacing(ctx.aim);
    const money = { coins: 34 };
    purse(ctx, () => money.coins, { x: 22, y: 16 });
    const victim = { x: ctx.cx + 300, y: ctx.cy + 120 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#fff0a8', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#f0c33c', 10);

    const beam = { on: false, ang: -0.9, tick: 0, dealt: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    ctx.onFrame((delta, elapsed) => {
      g.clear();
      const dt = delta / 1000;
      if (!beam.on) return;
      // 1.15 radians a second toward the cursor — it is walked onto a target, never snapped.
      const want = Math.atan2(victim.y - ctx.cy, victim.x - ctx.cx);
      beam.ang = Phaser.Math.Angle.RotateTo(beam.ang, want, 1.15 * dt);
      goldBeam(g, ctx.tint, ctx.cx, ctx.cy, beam.ang, 520, 15, 1, { t: elapsed / 1000, seed: 4 });
      // The bill, taken in whole coins as they come due.
      beam.tick += dt * 6;
      while (beam.tick >= 1) {
        beam.tick -= 1;
        if (money.coins <= 0) {
          beam.on = false;
          float(ctx, ctx.cx, ctx.cy - 50, '💸 OUT OF MONEY', hex(FOR.blood), 13);
          readout.setText('the 22-second cooldown is not the real limit — the purse is');
          break;
        }
        money.coins--;
      }
      if (!beam.on) return;
      // The burn, on the same segment test the kit uses.
      const ex = ctx.cx + Math.cos(beam.ang) * 520;
      const ey = ctx.cy + Math.sin(beam.ang) * 520;
      const dx = ex - ctx.cx, dy = ey - ctx.cy;
      const len2 = dx * dx + dy * dy;
      const u = Phaser.Math.Clamp(((victim.x - ctx.cx) * dx + (victim.y - ctx.cy) * dy) / len2, 0, 1);
      const d = Phaser.Math.Distance.Between(ctx.cx + dx * u, ctx.cy + dy * u, victim.x, victim.y);
      if (d <= 25) {
        beam.dealt += 95 * dt;
        if (Math.random() < dt * 8) ctx.capture(() => fx.impact(victim.x, victim.y, beam.ang + Math.PI));
      }
      gauge.setText(`${Math.round(beam.dealt)} dealt   ·   ${money.coins} coins left   ·   6 a second`);
    });

    ctx.at(400, () => {
      beam.on = true;
      av.play('raise', ctx.aim);
      rig?.setWealth(1);
      float(ctx, ctx.cx, ctx.cy - 50, '💰 PAY-TO-WIN', hex(FOR.goldLit), 13);
      readout.setText('it does not aim — it turns, at about 66° a second, toward the cursor');
    });
    ctx.at(2200, () => readout.setText('you walk it onto people. 95 damage a second for as long as it is on them.'));
    ctx.at(5000, () => readout.setText('and it is metered: 6 coins a second, taken a whole coin at a time'));
    ctx.at(9600, () => {
      if (!beam.on) return;
      beam.on = false;
      readout.setText('8 seconds of full uptime is 760 damage and 48 coins');
    });
    ctx.at(11200, () => readout.setText('under 6 coins it refuses outright — a Paywall that emptied you locks your ultimate'));
  },
};

// ══ Q+ — Golden Excess ════════════════════════════════════════════════

export const payToWinUpgraded: PreviewScript = {
  duration: 14000,
  scale: 0.58,
  caption: 'Q+ — the line becomes a wedge, and the wedge grows with every coin fed into it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    const rig = keeper(av);
    av.setFacing(ctx.aim);
    const money = { coins: 180 };
    purse(ctx, () => money.coins, { x: 22, y: 16 });
    const victims = [
      { x: ctx.cx + 300, y: ctx.cy + 110 },
      { x: ctx.cx + 330, y: ctx.cy - 40 },
      { x: ctx.cx + 210, y: ctx.cy + 210 },
    ];
    for (const v of victims) dummyAt(ctx, v);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffb347', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#f0c33c', 10);

    const beam = { on: false, ang: -0.7, tick: 0, spent: 0, dealt: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    ctx.onFrame((delta, elapsed) => {
      g.clear();
      const dt = delta / 1000;
      if (!beam.on) return;
      const want = Math.atan2(victims[0].y - ctx.cy, victims[0].x - ctx.cx);
      beam.ang = Phaser.Math.Angle.RotateTo(beam.ang, want, 1.15 * dt);

      // Everything below is read off one number: what this cast has already burned.
      const half = Math.min(1.2, 0.10 + beam.spent * 0.011);
      const dps = Math.min(700, 95 + beam.spent * 4.5);
      const drain = Math.min(70, 6 + beam.spent * 0.22);
      goldCone(g, ctx.tint, ctx.cx, ctx.cy, beam.ang, 520, half, 1,
        { t: elapsed / 1000, heat: Math.min(1, beam.spent / 90) });

      beam.tick += dt * drain;
      while (beam.tick >= 1) {
        beam.tick -= 1;
        if (money.coins <= 0) {
          beam.on = false;
          float(ctx, ctx.cx, ctx.cy - 50, '💸 OUT OF MONEY', hex(FOR.blood), 13);
          readout.setText('a 180-coin purse, gone in about five seconds. That is the upgrade.');
          break;
        }
        money.coins--; beam.spent++;
      }
      if (!beam.on) return;

      for (const v of victims) {
        const d = Phaser.Math.Distance.Between(ctx.cx, ctx.cy, v.x, v.y);
        if (d > 520) continue;
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(v.y - ctx.cy, v.x - ctx.cx) - beam.ang));
        if (off > half + Math.atan2(25, Math.max(1, d))) continue;
        beam.dealt += dps * dt;
        if (Math.random() < dt * 5) ctx.capture(() => fx.impact(v.x, v.y, beam.ang + Math.PI));
      }
      gauge.setText(`${Math.round(beam.spent)} coins burned  ·  ${Math.round(half * 2 * 57.3)}° wide  ·  ${Math.round(dps)} dmg/s  ·  ${Math.round(drain)} coins/s  ·  ${Math.round(beam.dealt)} dealt`);
    });

    ctx.at(400, () => {
      beam.on = true;
      av.play('raise', ctx.aim);
      rig?.setWealth(1);
      float(ctx, ctx.cx, ctx.cy - 50, '💰 GOLDEN EXCESS', hex(FOR.goldLit), 13);
      readout.setText('it opens as the same narrow beam — 0.10 radians and 95 a second');
    });
    ctx.at(2600, () => readout.setText('every coin it burns widens it by 0.011 radians and adds 4.5 damage a second'));
    ctx.at(5200, () => readout.setText('and the drain climbs with it, so a full purse goes in fast rather than evenly'));
    ctx.at(8200, () => readout.setText('the gold walks to furnace orange as the bill climbs — the colour is the cost'));
    ctx.at(11400, () => {
      if (!beam.on) return;
      beam.on = false;
      readout.setText('at the ceiling it is a 138° wedge doing 700 a second. It is not a beam any more.');
    });
  },
};

// ══ PASSIVE — Blood Coins ═════════════════════════════════════════════

export const bloodCoins: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Passive — 1 coin per 20 damage anybody deals, and the enemy earns the same way',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 160, y: ctx.cy - 4 };
    dummyAt(ctx, victim);
    const mine = { n: 0 };
    const theirs = { n: 0 };
    purse(ctx, () => mine.n, { x: 22, y: 16 });
    const themLabel = ctx.adopt(ctx.scene.add.text(ctx.w - 22, 16, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: hex(FOR.canvasShade),
    }).setOrigin(1, 0.5).setDepth(23));
    ctx.onFrame(() => themLabel.setText(`they hold ${Math.floor(theirs.n)} 🪙`));
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#bda98a', 10);
    ctx.onFrame(() => gauge.setText(
      `${(mine.n % 1 * 20).toFixed(0)}/20 damage toward your next coin — the remainder is carried, never rounded away`));

    const hit = (at: number, dmg: number, onThem: boolean): void => ctx.at(at, () => {
      const purseRef = onThem ? mine : theirs;
      const target = onThem ? victim : { x: ctx.cx, y: ctx.cy };
      const before = Math.floor(purseRef.n);
      purseRef.n += dmg / 20;
      float(ctx, target.x, target.y - 22, `${dmg}`, '#ffb3aa', 13);
      if (Math.floor(purseRef.n) > before) {
        ctx.capture(() => fx.coinBurst(target.x, target.y - 6, Math.floor(purseRef.n) - before, 24));
      }
    });

    ctx.at(300, () => readout.setText('coins do not drop. They bleed out of wounds.'));
    hit(700, 10, true); hit(1200, 10, true);
    ctx.at(1600, () => readout.setText('20 damage, one coin. The change is carried into the next one.'));
    hit(2000, 30, true); hit(2600, 15, true);
    ctx.at(3600, () => readout.setText('and every wound they put on you pays them at exactly the same rate'));
    hit(4000, 25, false); hit(4700, 35, false);
    ctx.at(6000, () => readout.setText('there is no other income in the element — a Fortune who is losing is a Fortune who is broke'));
    hit(6600, 45, true); hit(7300, 20, true);
    ctx.at(8600, () => readout.setText('it is measured on the raw figure, so overkill, shields and armour all resolve first'));
  },
};

// ══ PASSIVE — The Stall ═══════════════════════════════════════════════

export const theStall: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'Passive — a shop in the middle of the arena that sells to both sides, at half to you',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const mine = { coins: 24 };
    const theirs = { coins: 20 };
    purse(ctx, () => mine.coins, { x: 22, y: 16 });
    const themLabel = ctx.adopt(ctx.scene.add.text(ctx.w - 22, 16, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: hex(FOR.canvasShade),
    }).setOrigin(1, 0.5).setDepth(23));
    ctx.onFrame(() => themLabel.setText(`enemy purse ${theirs.coins} 🪙`));

    const stallAt = { x: ctx.w * 0.5, y: ctx.cy - 12 };
    const shopper = { x: ctx.w * 0.9, y: ctx.cy + 10 };
    dummyAt(ctx, shopper);
    const page = { illegal: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    ctx.onFrame((_dt, elapsed) => {
      g.clear(); ring.clear();
      stall(g, ctx.tint, stallAt.x, stallAt.y, 128, 1,
        { t: elapsed / 1000, illegal: page.illegal, stock: 3 });
      // The 132px counter range, so "stand next to it" is a thing you can see.
      ring.lineStyle(1.4, ctx.tint(page.illegal ? FOR.contraband : FOR.gold), 0.3);
      ring.strokeCircle(stallAt.x, stallAt.y, 132);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);

    ctx.at(400, () => readout.setText('one stall, dead centre, served within 132px — by either side'));
    ctx.at(1600, () => {
      page.illegal = true;
      ctx.capture(() => fx.cash(stallAt.x, stallAt.y, 46, 520, 22));
      float(ctx, stallAt.x, stallAt.y - 60, 'T  ·  ARMS ☠', hex(FOR.contraband), 12);
      readout.setText('T flips to the illegal pages — and only the shopkeeper can see them at all');
    });
    ctx.at(3200, () => {
      mine.coins -= 10;
      float(ctx, ctx.cx, ctx.cy - 48, '🪖 RIFLE', hex(FOR.gold), 12);
      ctx.capture(() => fx.cash(stallAt.x, stallAt.y, 46, 520, 22));
      readout.setText('buying from your own stall pays no commission — it is skipped, not paid in a circle');
    });
    ctx.at(4800, () => { page.illegal = false; readout.setText('the enemy walks up. They get the general page and nothing else.'); });
    // Their purchase, and the half of it that comes straight back.
    const theyBuy = (at: number, name: string, cost: number): void => ctx.at(at, () => {
      theirs.coins -= cost;
      ctx.capture(() => fx.cash(stallAt.x, stallAt.y, 46, 520, 22));
      float(ctx, shopper.x, shopper.y - 48, name, hex(FOR.gold), 11);
      const cut = Math.floor(cost * 0.5);
      mine.coins += cut;
      ctx.capture(() => fx.coinBurst(ctx.cx, ctx.cy - 10, Math.min(6, cut), 26));
      float(ctx, ctx.cx, ctx.cy - 56, `🪙 +${cut} COMMISSION`, hex(FOR.goldLit), 12);
    });
    theyBuy(6000, '🩹 BANDAGES  −4', 4);
    theyBuy(7800, '🧪 CURE-ALL  −10', 10);
    theyBuy(9600, '💝 DONATION  −20', 20);
    ctx.at(10400, () => readout.setText('the Donation costs 20 and does nothing — and is the largest single income in the element'));
    ctx.at(12000, () => readout.setText('an NPC wanders up and buys something about every 9 seconds. That is a salary.'));
  },
};

// ══ PASSIVE — The Catalogue ═══════════════════════════════════════════

export const theCatalogue: PreviewScript = {
  duration: 17000,
  scale: 0.9,
  caption: 'Passive — where the element\'s real numbers live: eight items, five guns, seven mods',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 210, y: ctx.cy - 6 };
    const bystander = { x: ctx.cx + 270, y: ctx.cy + 46 };
    dummyAt(ctx, victim);
    dummyAt(ctx, bystander);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0c33c', 11);
    const price = label(ctx, ctx.w * 0.5, ctx.h - 18, '#fff0a8', 11);

    // The three world objects the shelf can put on the floor, each stepped as its kit steps it.
    const flames: { x: number; y: number; born: number; seed: number }[] = [];
    const daggers: { x: number; y: number; vx: number; vy: number; ang: number }[] = [];
    const bots: { x: number; y: number; ang: number; spin: number }[] = [];
    const walker = { x: ctx.cx, y: ctx.cy, drop: 0 };
    const pepperOn = { until: -1 };

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((delta, elapsed) => {
      g.clear(); air.clear();
      const dt = delta / 1000;
      const t = elapsed / 1000;
      // Spicy Pepper: a patch every 70ms behind a moving body, each living 2.6 seconds.
      if (elapsed < pepperOn.until) {
        walker.drop += delta;
        if (walker.drop >= 70) {
          walker.drop = 0;
          flames.push({ x: walker.x, y: walker.y + 8, born: elapsed, seed: elapsed % 999 });
        }
      }
      for (let i = flames.length - 1; i >= 0; i--) {
        if (elapsed - flames[i].born > 2600) { flames.splice(i, 1); continue; }
        pepperFlame(g, ctx.tint, flames[i].x, flames[i].y, 18, 1, { t, seed: flames[i].seed });
      }
      // Ornate Daggers: 620 px/s, painted with the kit's own blade.
      for (let i = daggers.length - 1; i >= 0; i--) {
        const d = daggers[i];
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x > ctx.w + 20 || d.y < -20 || d.y > ctx.h + 20) { daggers.splice(i, 1); continue; }
        daggerShape(air, ctx.tint, d.x, d.y, d.ang, 1);
      }
      // Death Machines: 96 px/s, turning at 3.2 rad/s toward the nearest body.
      for (const b of bots) {
        b.spin += dt * 4;
        const want = Math.atan2(victim.y - b.y, victim.x - b.x);
        b.ang = Phaser.Math.Angle.RotateTo(b.ang, want, 3.2 * dt);
        b.x += Math.cos(b.ang) * 96 * dt;
        b.y += Math.sin(b.ang) * 96 * dt;
        roombaShape(g, ctx.tint, b.x, b.y, b.ang, 1, { spin: b.spin, angry: 1 });
      }
    });

    const buy = (at: number, name: string, cost: number, note: string, then?: () => void): void =>
      ctx.at(at, () => {
        av.play('sweep', ctx.aim);
        ctx.capture(() => fx.cash(ctx.cx, ctx.cy, 40, 480, 22));
        float(ctx, ctx.cx, ctx.cy - 48, name, hex(FOR.gold), 12);
        price.setText(`${name}  —  ${cost} coins`);
        readout.setText(note);
        then?.();
      });

    buy(500, '🌶️ SPICY PEPPER', 3, '5 seconds of a fire trail: 26 a second inside 22px, and it sets them alight', () => {
      pepperOn.until = 5500;
    });
    ctx.onFrame((delta, elapsed) => {
      if (elapsed > 500 && elapsed < 5500) walker.x = ctx.cx + Math.sin((elapsed - 500) / 500) * 70;
      void delta;
    });
    ctx.at(3400, () => readout.setText('overlapping patches split one patch\'s worth — a doubled-back trail is wider, not hotter'));

    buy(5800, '🗡️ ORNATE DAGGERS', 5, '3 volleys of 8, 170ms apart, 2 damage each — 48 if every blade lands', () => {
      for (let v = 0; v < 3; v++) {
        ctx.at(5800 + v * 170, () => {
          for (let i = 0; i < 8; i++) {
            const a = ctx.aim + ((i / 7) - 0.5) * 1.24;
            daggers.push({ x: ctx.cx + 14, y: ctx.cy, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, ang: a });
          }
        });
      }
    });

    buy(8000, '🧨 EXPLOSIVES POUCH', 3, 'your next 5 hits also blast everything ELSE within 96px', () => {
      ctx.at(8600, () => {
        float(ctx, victim.x, victim.y - 22, '30', '#ffb3aa', 14);
        ctx.capture(() => fx.boom(victim.x, victim.y, 96 * 0.7));
        float(ctx, bystander.x, bystander.y - 22, '30', '#ffb3aa', 14);
        float(ctx, victim.x, victim.y - 52, '🧨 SPLASH ×1', hex(FOR.gold), 11);
        readout.setText('it spares the body that was hit — a cleave onto everything else, not a multiplier');
      });
    });

    buy(10600, '🤖 DEATH MACHINE', 8, 'a knife on a vacuum: 96 px/s, 25 on touch, one hit per victim per 1.4s', () => {
      bots.push({ x: ctx.cx + 30, y: ctx.cy + 30, ang: 0, spin: 0 });
      ctx.at(12400, () => float(ctx, victim.x, victim.y - 36, '🤖 DEATH MACHINE  25', hex(FOR.steel), 11));
    });

    buy(13400, '🏺 THE MIRACLE', 12, '20 seconds in which every good thing is doubled — heals, durations, capital gains');
    buy(15200, '💝 DONATION', 20, 'thank you for your generous support');
  },
};
