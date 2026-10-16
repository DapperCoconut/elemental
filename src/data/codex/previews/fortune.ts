import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  FOR, FortuneAvatar, FortuneFx, StatKind, advanceCard, goldCoin, goldFloor, goldPlume, goldStatue,
  goldenHeart, grassBlade, midasGilt, powderBag,
} from '../../../elements/kits/FortuneVisuals';

/**
 * Gold's showcases.
 *
 * Every loop keeps the same small records the kit keeps (blades with a velocity and a birth time,
 * a plume, a heart's stress, floor patches, loot) and paints them with the kit's own exported
 * painters. One-shots go through a real `FortuneFx` with a sticky sink. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const FRAY_SPEED = 485;
const FRAY_GRAVITY = 900;
const FRAY_GILD_MS = 180;
const PLUME_R = 105;
const HEART_TRAVEL = 420;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): FortuneFx {
  return ctx.capture(() => new FortuneFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The alchemist's rig, or null when a skin has replaced the character. */
function alch(av: unknown): FortuneAvatar | null {
  return av instanceof FortuneAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A stand-in enemy that can be moved around, unlike `ctx.addDummy`'s fixed mark. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, depth = 4): void {
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
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#1a1206', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

/** A purse readout pinned top-left, the way the status tray counts it. */
function purse(ctx: PreviewCtx, read: () => number): void {
  const t = label(ctx, 56, 14, hex(FOR.goldLit), 12);
  ctx.onFrame(() => t.setText(`🪙 ${Math.floor(read())}`));
}

interface Blade { x: number; y: number; vx: number; vy: number; born: number; alive: boolean }

/** Throw a Fray clump from (x, y) aimed at `ang`, simulated exactly as the kit does. */
function throwClump(
  ctx: PreviewCtx, blades: Blade[], x: number, y: number, ang: number, now: number, n = 7,
): void {
  for (let i = 0; i < n; i++) {
    const a = ang + (i / (n - 1) - 0.5) * 0.48 + (Math.random() - 0.5) * 0.08;
    const v = FRAY_SPEED * (0.9 + Math.random() * 0.2);
    blades.push({ x: x + Math.cos(ang) * 20, y: y + Math.sin(ang) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, alive: true });
  }
}

/** Paint and step a blade list; `hit` is asked for every live blade and returns true when it lands. */
function bladeLayer(
  ctx: PreviewCtx, blades: Blade[], hit: (b: Blade) => boolean, onHit: (b: Blade) => void,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    const s = dt / 1000;
    for (const b of blades) {
      if (!b.alive) continue;
      b.vy += FRAY_GRAVITY * s;
      b.x += b.vx * s;
      b.y += b.vy * s;
      if (elapsed - b.born > 1800 || b.y > ctx.h + 30) { b.alive = false; continue; }
      if (hit(b)) { b.alive = false; onHit(b); continue; }
      const gild = Phaser.Math.Clamp((elapsed - b.born) / FRAY_GILD_MS, 0, 1);
      grassBlade(g, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), 15, gild, 1);
    }
  });
}

// ══ CLICK — Fray ═══════════════════════════════════════════════════════

export const fray: PreviewScript = {
  duration: 6500,
  scale: 0.9,
  caption: 'Click — 7 grass blades, gilded in flight by the other hand, then falling under gravity. 3 a blade',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    const target = { x: ctx.cx + 250, y: ctx.cy + 10 };
    dummyAt(ctx, target);
    const blades: Blade[] = [];
    let elapsedNow = 0;
    ctx.onFrame((_dt, e) => { elapsedNow = e; });
    bladeLayer(ctx, blades,
      (b) => Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) < 24,
      (b) => {
        float(ctx, target.x + (Math.random() - 0.5) * 20, target.y - 24, '3', hex(FOR.goldLit), 12);
        ctx.capture(() => fx.bladeHit(b.x, b.y, Math.atan2(b.vy, b.vx)));
      });

    const throwAt = (ms: number, lift: number): void => {
      ctx.at(ms, () => {
        const d = target.x - ctx.cx;
        const tFlight = d / FRAY_SPEED;
        const drop = 0.5 * FRAY_GRAVITY * tFlight * tFlight * lift;
        const ang = Math.atan2(target.y - drop - ctx.cy, d);
        av.setFacing(ang);
        av.play('punch', ang);
        alch(av)?.setGlowHand(1);
        ctx.capture(() => fx.transmute(ctx.cx + Math.cos(ang - 1.25) * 22, ctx.cy + Math.sin(ang - 1.25) * 22));
        throwClump(ctx, blades, ctx.cx, ctx.cy, ang, elapsedNow);
      });
    };
    ctx.at(200, () => readout.setText('aimed straight at them, the clump falls short — the blades have weight'));
    throwAt(500, 0);
    ctx.at(2200, () => readout.setText('aim above them: the gilded blades arc down into the body'));
    throwAt(2500, 1);
    throwAt(3400, 1);
    throwAt(4300, 1);
    ctx.at(5300, () => readout.setText('7 blades, 3 each — small alone, a lot when the whole clump lands'));
  },
};

// ══ E — Advance ═════════════════════════════════════════════════════════

const STAT_TEXT: Record<StatKind, [string, string]> = {
  might: ['MIGHT', '+10% damage'],
  hide: ['GILDED HIDE', '-7% damage taken'],
  stride: ['STRIDE', '+7% speed'],
  haste: ['HASTE', '-8% cooldowns'],
  vigor: ['VIGOR', '+30 max HP'],
  greed: ['GREED', '+25% gold'],
  sheaf: ['SHEAF', '+2 blades'],
  mend: ['MEND', '+1.5 HP/s'],
};

export const advance: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'E — spend 10 gold, three upgrade cards appear over your head; click one to keep it for the match',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(-Math.PI / 2);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 20;
    purse(ctx, () => gold);

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const texts = Array.from({ length: 6 }, (_, i) => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: i % 2 === 0 ? '8px' : '7px', fontFamily: 'Arial Black', color: i % 2 === 0 ? '#fff3c4' : '#e6c46a',
    }).setOrigin(0.5).setDepth(17)));
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(18));

    let offer: StatKind[] | null = null;
    let opened = 0;
    let hover = -1;
    let now = 0;
    const W = 58, H = 70, GAP = 8;
    const centres = (): { x: number; y: number }[] => {
      const at = ctx.casterAt();
      const y = Math.max(H / 2 + 22, at.y - 96);
      return [-1, 0, 1].map((k) => ({ x: at.x + k * (W + GAP), y }));
    };
    ctx.onFrame((_dt, e) => {
      now = e;
      g.clear(); cursor.clear();
      for (const t of texts) t.setVisible(false);
      if (!offer) return;
      const cs = centres();
      const a = Phaser.Math.Clamp((e - opened) / 220, 0, 1);
      for (let i = 0; i < 3; i++) {
        const rise = (1 - a) * 14;
        advanceCard(g, ctx.tint, cs[i].x, cs[i].y + rise, W, H, offer[i], hover === i, a);
        texts[i * 2].setVisible(true).setText(STAT_TEXT[offer[i]][0]).setPosition(cs[i].x, cs[i].y + rise + 16).setAlpha(a);
        texts[i * 2 + 1].setVisible(true).setText(STAT_TEXT[offer[i]][1]).setPosition(cs[i].x, cs[i].y + rise + 27).setAlpha(a);
      }
      if (hover >= 0) {
        const c = cs[hover];
        cursor.fillStyle(0xffffff, 0.95);
        cursor.fillTriangle(c.x + 6, c.y + 6, c.x + 6, c.y + 20, c.x + 16, c.y + 15);
      }
    });

    const round = (at: number, kinds: StatKind[], pickI: number): void => {
      ctx.at(at, () => {
        gold -= 10;
        offer = kinds;
        opened = now;
        hover = -1;
        av.play('flex');
        alch(av)?.setGlowHand(0.8);
        const at2 = ctx.casterAt();
        ctx.capture(() => fx.advanceOpen(at2.x, at2.y - 96));
        float(ctx, at2.x, at2.y - 40, '-10 🪙', hex(FOR.gold), 11);
      });
      ctx.at(at + 700, () => { hover = 0; });
      ctx.at(at + 1200, () => { hover = 1; });
      ctx.at(at + 1700, () => { hover = pickI; });
      ctx.at(at + 2200, () => {
        if (!offer) return;
        const c = centres()[pickI];
        const kind = offer[pickI];
        offer = null;
        hover = -1;
        av.play('flex');
        ctx.capture(() => fx.advancePick(c.x, c.y));
        const at2 = ctx.casterAt();
        float(ctx, at2.x, at2.y - 52, `${STAT_TEXT[kind][0]}  ${STAT_TEXT[kind][1]}`, hex(FOR.goldLit), 12);
      });
    };
    ctx.at(150, () => readout.setText('10 gold buys an offer of three, drawn from eight stats'));
    round(500, ['might', 'sheaf', 'hide'], 1);
    ctx.at(3600, () => readout.setText('click the one you want — picks stack, and last the whole match'));
    round(4000, ['haste', 'vigor', 'greed'], 2);
  },
};

// ══ R — Gold Plume ═════════════════════════════════════════════════════

export const goldPlumeShow: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'R — a bag of powder bursts into golden dust for 6s: 9 damage a second inside, and 2 gold a second to you standing in it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const target = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, target);
    const land = { x: ctx.cx + 200, y: ctx.cy };

    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.5));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let bagAt = -1;
    let plumeAt = -1;
    let lastTick = 0;
    let lastSec = 0;
    let dmgAcc = 0;
    ctx.onFrame((dt, e) => {
      ground.clear(); air.clear();
      if (bagAt >= 0 && plumeAt < 0) {
        const u = Phaser.Math.Clamp((e - bagAt) / 450, 0, 1);
        const x = ctx.cx + (land.x - ctx.cx) * u;
        const y = ctx.cy + (land.y - ctx.cy) * u - Math.sin(u * Math.PI) * 60;
        powderBag(air, ctx.tint, x, y, u * 9, 1);
        if (u >= 1) {
          plumeAt = e;
          lastTick = e;
          lastSec = e;
          ctx.capture(() => fx.bagBurst(land.x, land.y, PLUME_R));
        }
      }
      if (plumeAt >= 0 && e - plumeAt < 6000) {
        const born = Phaser.Math.Clamp((e - plumeAt) / 260, 0, 1);
        const life = Phaser.Math.Clamp((6000 - (e - plumeAt)) / 700, 0, 1);
        goldPlume(ground, ctx.tint, land.x, land.y, PLUME_R * (0.7 + 0.3 * born), 0.9 * born * life, e / 1000, 3);
        while (e - lastTick >= 250) { lastTick += 250; dmgAcc += 2.25; }
        if (e - lastSec >= 1000) {
          lastSec += 1000;
          float(ctx, target.x, target.y - 26, `${Math.round(dmgAcc)}`, '#ffb3aa', 13);
          dmgAcc = 0;
          const at = ctx.casterAt();
          if (Phaser.Math.Distance.Between(at.x, at.y, land.x, land.y) <= PLUME_R) {
            float(ctx, at.x + 18, at.y - 34, '+2 🪙', hex(FOR.goldLit), 11);
            ctx.capture(() => fx.goldGain(at.x, at.y - 10, 2));
          }
        }
        const at = ctx.casterAt();
        if (Phaser.Math.Distance.Between(at.x, at.y, land.x, land.y) <= PLUME_R) gold += 2 * dt / 1000;
      }
    });

    ctx.at(200, () => readout.setText('the bag is thrown at the cursor and bursts where it lands'));
    ctx.at(500, () => { av.play('sweep', ctx.aim); bagAt = 500; });
    ctx.at(1600, () => readout.setText('anything of theirs in the dust takes 9 a second'));
    ctx.at(3200, () => {
      readout.setText('walk in yourself and the dust pays you 2 gold a second');
      ctx.glideCaster({ to: { x: land.x - 70, y: land.y + 20 }, ms: 700, ease: 'out' });
    });
  },
};

// ══ F — Heart of Gold ═════════════════════════════════════════════════

export const heartOfGold: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'F — lunge with the cane (16). A gold heart fills with every step they take; full is a heart attack: 28 and a 1.4s stun',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const target = { x: ctx.cx + 230, y: ctx.cy };
    dummyAt(ctx, target);
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(16));

    let hearted = false;
    let stress = 0;
    let walking = false;
    let stunnedUntil = 0;
    let walkT = 0;
    let dmgAcc = 0;
    const home = { x: target.x, y: target.y };
    ctx.onFrame((dt, e) => {
      hud.clear();
      if (!hearted) return;
      const s = dt / 1000;
      if (walking && e > stunnedUntil) {
        walkT += s;
        const px = target.x;
        const py = target.y;
        target.x = home.x + Math.sin(walkT * 2.2) * 70;
        target.y = home.y + Math.sin(walkT * 4.4) * 22;
        stress += Math.hypot(target.x - px, target.y - py) / HEART_TRAVEL;
      } else {
        stress = Math.max(0, stress - 0.12 * s);
      }
      if (stress >= 1) {
        stress = 0;
        stunnedUntil = e + 1400;
        ctx.capture(() => fx.heartAttack(target.x, target.y));
        float(ctx, target.x, target.y - 56, '💔 HEART ATTACK', hex(FOR.bloodLit), 14);
        float(ctx, target.x, target.y - 26, '28', '#ffb3aa', 15);
        dmgAcc += 28;
      }
      while (dmgAcc >= 20) {
        dmgAcc -= 20;
        gold += 1;
        const at = ctx.casterAt();
        float(ctx, at.x + 18, at.y - 34, '+1 🪙', hex(FOR.goldLit), 11);
      }
      goldenHeart(hud, ctx.tint, target.x, target.y - 46, stress, e / 1000, 1);
    });

    ctx.at(200, () => readout.setText('the cane lunges 150px — anyone it passes is stabbed for 16'));
    ctx.at(600, () => {
      av.play('dash', ctx.aim);
      const to = { x: target.x - 70, y: target.y };
      ctx.capture(() => fx.caneLunge(ctx.cx, ctx.cy, to.x, to.y));
      ctx.glideCaster({ to, ms: 180, ease: 'out' });
    });
    ctx.at(760, () => {
      float(ctx, target.x, target.y - 26, '16', '#ffb3aa', 13);
      ctx.capture(() => fx.heartApply(target.x, target.y - 34));
      float(ctx, target.x, target.y - 54, '💛 HEART OF GOLD', hex(FOR.goldLit), 12);
      hearted = true;
      dmgAcc += 16;
    });
    ctx.at(1600, () => { readout.setText('every step they take stresses the gold heart'); walking = true; });
    ctx.at(5600, () => readout.setText('a full heart is a heart attack — and every 20 damage they take pays you 1 gold'));
    ctx.at(8200, () => { walking = false; readout.setText('standing still lets it settle, a little'); });
  },
};

// ══ Q — Midas Curse ═══════════════════════════════════════════════════

export const midasCurse: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Q — the target turns to gold, and so does the floor they walk. Their shots drop as coins, their summons stand as statues',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const target = { x: ctx.cx + 260, y: ctx.cy - 20 };
    dummyAt(ctx, target);

    const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const gilt = ctx.adopt(ctx.scene.add.graphics().setDepth(5.6));
    const summonG = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const patches: { x: number; y: number; r: number; seed: number; born: number }[] = [];
    const loot: { kind: 'coin' | 'statue'; x: number; y: number; born: number; seed: number }[] = [];
    let cursedAt = -1;
    let walkT = 0;
    let last = { x: target.x, y: target.y };
    let shot: { x: number; y: number } | null = null;
    let summon: { x: number; y: number; born: number } | null = null;
    const home = { x: target.x, y: target.y };

    ctx.onFrame((dt, e) => {
      floor.clear(); gilt.clear(); summonG.clear();
      if (cursedAt >= 0) {
        walkT += dt / 1000;
        target.x = home.x - Math.sin(walkT * 0.9) * 140;
        target.y = home.y + Math.sin(walkT * 1.8) * 30;
        if (Phaser.Math.Distance.Between(last.x, last.y, target.x, target.y) >= 26) {
          last = { x: target.x, y: target.y };
          patches.push({ x: target.x, y: target.y + 10, r: 30 * (0.85 + Math.random() * 0.3), seed: Math.random() * 999, born: e });
        }
      }
      for (const p of patches) goldFloor(floor, ctx.tint, p.x, p.y, p.r, 0.85 * Phaser.Math.Clamp((e - p.born) / 300, 0, 1), p.seed, e / 1000);
      for (const l of loot) {
        if (l.kind === 'statue') goldStatue(floor, ctx.tint, l.x, l.y, 15, 1, l.seed, e / 1000);
        else if (e - l.born > 360) goldCoin(floor, ctx.tint, l.x, l.y, 6, e / 500 + l.seed, 1);
      }
      if (cursedAt >= 0) midasGilt(gilt, ctx.tint, target.x, target.y, 0.15 + Phaser.Math.Clamp((e - cursedAt) / 10000, 0, 1) * 0.85, e / 1000, 1);
      if (shot) {
        shot.x -= 380 * dt / 1000;
        summonG.fillStyle(0x9a4fd6, 1); summonG.fillCircle(shot.x, shot.y, 6);
        summonG.fillStyle(0xe6c6ff, 1); summonG.fillCircle(shot.x, shot.y, 2.6);
        if (shot.x < target.x - 70) {
          const s = shot;
          shot = null;
          const tx = s.x - 4;
          const ty = s.y + 18;
          ctx.capture(() => fx.coinDrop(s.x, s.y, tx, ty));
          loot.push({ kind: 'coin', x: tx, y: ty, born: e, seed: 1 });
        }
      }
      if (summon) {
        const a = Phaser.Math.Clamp((e - summon.born) / 120, 0, 1);
        summonG.fillStyle(0x3c4254, a); summonG.fillRect(summon.x - 12, summon.y - 16, 24, 26);
        summonG.fillStyle(0x8e97ad, a); summonG.fillRect(summon.x - 8, summon.y - 12, 16, 6);
      }
      // The alchemist collects anything it walks over.
      const at = ctx.casterAt();
      for (let i = loot.length - 1; i >= 0; i--) {
        const l = loot[i];
        if (l.kind === 'coin' && e - l.born < 360) continue;
        if (Phaser.Math.Distance.Between(at.x, at.y, l.x, l.y) > 34) continue;
        loot.splice(i, 1);
        const v = l.kind === 'coin' ? 1 : 2;
        gold += v;
        ctx.capture(() => fx.pickup(l.x, l.y));
        float(ctx, at.x + 18, at.y - 34, `+${v} 🪙`, hex(FOR.goldLit), 11);
      }
    });

    ctx.at(200, () => readout.setText('the curse lands on whoever is nearest the cursor'));
    ctx.at(500, () => {
      av.play('raise');
      ctx.capture(() => fx.midasCast(ctx.cx, ctx.cy));
    });
    ctx.at(800, () => {
      cursedAt = 800;
      ctx.capture(() => fx.midasStrike(target.x, target.y));
      float(ctx, target.x, target.y - 50, '👑 MIDAS CURSE', hex(FOR.goldLit), 13);
    });
    ctx.at(1500, () => readout.setText('every step they take turns the floor to gold — for the rest of the match'));
    ctx.at(3300, () => { readout.setText('they shoot — and the shot drops out of the air as a coin'); shot = { x: target.x - 20, y: target.y }; });
    ctx.at(5200, () => {
      readout.setText('they summon — and it is a golden statue the instant it appears');
      summon = { x: target.x + 40, y: target.y + 30, born: 5200 };
    });
    ctx.at(5650, () => {
      if (!summon) return;
      const s = summon;
      summon = null;
      ctx.capture(() => fx.transmuteSummon(s.x, s.y, 22));
      loot.push({ kind: 'statue', x: s.x, y: s.y, born: 5650, seed: 7 });
    });
    ctx.at(6600, () => {
      readout.setText('on gold floor you are 50% faster; pick up the coin (+1) and the statue (+2)');
      const first = loot[0];
      if (first) ctx.glideCaster({ to: { x: first.x, y: first.y }, ms: 900, ease: 'out' });
    });
    ctx.at(7700, () => {
      const next = loot[0];
      if (next) ctx.glideCaster({ to: { x: next.x, y: next.y }, ms: 700, ease: 'out' });
    });
  },
};

// ══ Passive — The Purse ═══════════════════════════════════════════════

export const thePurse: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'The Purse — gold from your own plume, a hearted enemy\'s blood, the Midas floor and its loot. Advance spends it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new FortuneAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8dcb8', 11);
    let gold = 0;
    purse(ctx, () => gold);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const at0 = { x: ctx.cx, y: ctx.cy };
    let sec = 0;
    ctx.onFrame((dt, e) => {
      ground.clear();
      goldPlume(ground, ctx.tint, at0.x, at0.y, PLUME_R * 0.9, 0.8, e / 1000, 5);
      gold += 2 * dt / 1000;
      alch(av)?.setGold(Math.min(1, gold / 30));
      if (e - sec >= 1000) {
        sec += 1000;
        float(ctx, at0.x + 18, at0.y - 34, '+2 🪙', hex(FOR.goldLit), 11);
        ctx.capture(() => fx.goldGain(at0.x, at0.y - 10, 2));
      }
    });
    ctx.at(200, () => readout.setText('standing in your own Gold Plume: 2 gold a second'));
    ctx.at(3000, () => readout.setText('a gold-hearted enemy: 1 per 20 damage · Midas floor: 1 per 3s · coins 1, statues 2'));
    ctx.at(5500, () => readout.setText('the purse fills, the under-glow swells — and Advance spends it ten at a time'));
  },
};
