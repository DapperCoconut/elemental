import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  DRM, DREAM_ORB, DreamAvatar, DreamFx, DreamWorldView, LucidPanel,
  ammoClip, dreamLeech, dreamOrb, dreamShrink, dreamSpikes, dreamSplit, lullabyZone, musicBox,
  nightmareBeast, nightmareDarkness, redMistBand, scratchMarks, sleepDagger, sleepMeter, sleepyZ, stuckFeather,
} from '../../../elements/kits/DreamVisuals';

/**
 * Dream's showcases.
 *
 * Every one drives the kit's own art: the rig with its two Sandmen (and, in a dream, its two
 * pistols), `sleepMeter` and the drifting Zs over the target's head, `DreamFx` for every shot
 * and swing, the real `DreamWorldView` for Delve, and the leech, dagger, darkness and walking
 * nightmare painters. The numbers are the kit's constants.
 *
 * Containment: `DreamFx` carries a sticky sink; the rig and the world view build their own
 * Graphics in their constructors, so each is built inside `ctx.capture` / `ctx.useAvatar`.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const SANDMEN_MAG = 30;
const SANDMEN_GAP = 125;
const SANDMEN_RELOAD = 5000;
const PILLOW_REACH = 90;
const CLAW_REACH = 100;
const DAGGER_SPEED = 1150;
const LEECH_SPEED = 640;
const PISTOL_GAP = 240;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): DreamFx {
  return ctx.capture(() => new DreamFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The sandman's rig, or null when a skin has replaced the character. */
function sandman(av: unknown): DreamAvatar | null {
  return av instanceof DreamAvatar ? av : null;
}

/** A stand-in enemy that can be moved around. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
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
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0b0620', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(18));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(18));
}

/** The meter and the Zs the kit hangs over anybody it is working on. */
function overhead(ctx: PreviewCtx, at: { x: number; y: number }, read: () => { drowsy: number; asleep: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const s = read();
    const t = elapsed / 1000;
    if (s.drowsy <= 0.5 && !s.asleep) return;
    sleepMeter(g, ctx.tint, at.x, at.y - 60, Phaser.Math.Clamp(s.drowsy / 100, 0, 1), t, s.asleep, 1);
    if (!s.asleep) return;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.45 + i / 3) % 1;
      sleepyZ(g, ctx.tint, at.x + 17 + Math.sin(p * 3.2 + i) * 7, at.y - 32 - p * 28, 5 + p * 3, (1 - p) * 0.9, -0.2);
    }
  });
}

/** A crosshair that the recoil walks off target, dragged back by a "hand" every few shots. */
function crosshair(ctx: PreviewCtx, at: { x: number; y: number }, color: number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  ctx.onFrame(() => {
    g.clear();
    g.lineStyle(3, ctx.tint(DRM.night), 0.8);
    g.strokeCircle(at.x, at.y, 10);
    g.lineStyle(1.6, ctx.tint(color), 1);
    g.strokeCircle(at.x, at.y, 10);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(at.x + Math.cos(a) * 13, at.y + Math.sin(a) * 13, at.x + Math.cos(a) * 18, at.y + Math.sin(a) * 18);
    }
  });
}

// ══ CLICK — Sandmen ═══════════════════════════════════════════════════

export const sandmen: PreviewScript = {
  duration: 10500,
  scale: 0.9,
  caption: 'Click (hold) — two guns turn about, 4 a round; the kick walks your aim off, 30 rounds then a 5s reload',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    const victim = { x: ctx.cx + 190, y: ctx.cy };
    dummyAt(ctx, victim);
    const aim = { x: victim.x, y: victim.y };
    crosshair(ctx, aim, DRM.sand);
    const readout = label(ctx, ctx.w * 0.5, 14, '#f0d48a', 11);
    let side: 0 | 1 = 0;
    let rounds = SANDMEN_MAG;

    for (let i = 0; i < SANDMEN_MAG; i++) {
      ctx.at(400 + i * SANDMEN_GAP, () => {
        av.setFacing(Math.atan2(aim.y - ctx.cy, aim.x - ctx.cx));
        av.setHold('spray', Math.atan2(aim.y - ctx.cy, aim.x - ctx.cx));
        const mz = rig ? rig.muzzle(side) : { x: ctx.cx + 20, y: ctx.cy };
        const onTarget = Phaser.Math.Distance.Between(aim.x, aim.y, victim.x, victim.y) < 22;
        const end = onTarget ? { x: victim.x - 18, y: victim.y + (aim.y - victim.y) * 0.5 } : { x: aim.x + 30, y: aim.y - 8 };
        ctx.capture(() => fx.sandShot(mz.x, mz.y, end.x, end.y, onTarget));
        rig?.kick(side, 0.7);
        if (onTarget) float(ctx, victim.x, victim.y - 26, '4', '#f0d48a', 12);
        side = side === 0 ? 1 : 0;
        rounds--;
        // The kick: mostly up, each hand pulling its own way…
        aim.y -= 9 * (0.7 + Math.random() * 0.5);
        aim.x += (side === 0 ? -3 : 3) + (Math.random() - 0.5) * 8;
        // …and every fourth round the player drags it back down onto them.
        if (i % 4 === 3) { aim.x += (victim.x - aim.x) * 0.8; aim.y += (victim.y - aim.y) * 0.8; }
        readout.setText(`${rounds} / ${SANDMEN_MAG}`);
      });
    }
    const reloadAt = 400 + SANDMEN_MAG * SANDMEN_GAP;
    ctx.at(reloadAt, () => {
      av.setHold(null);
      readout.setText('⌛ RELOADING — 5s');
      aim.x = victim.x; aim.y = victim.y;
    });
    ctx.at(reloadAt + SANDMEN_RELOAD, () => readout.setText('30 / 30 — and a hit on a sleeper wakes them'));
  },
};

// ══ E — Delve ═════════════════════════════════════════════════════════

export const delve: PreviewScript = {
  duration: 11000,
  scale: 0.8,
  caption: 'E — next to a sleeper: into their dream. They wake up in there; their body does not. You are faster, and every key changes',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    const victim = { x: ctx.cx + 120, y: ctx.cy };
    const home = { x: victim.x, y: victim.y };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 80, asleep: true };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#c9b8ff', 11);
    let view: DreamWorldView | null = null;
    let dreaming = false;

    ctx.onFrame((dt) => {
      if (sleep.asleep) sleep.drowsy = Math.max(0, sleep.drowsy - 5 * dt / 1000);
      view?.update(dt);
      if (dreaming) {
        // Awake in here: they move and fight back.
        victim.x = home.x + Math.sin(ctx.scene.time.now / 400) * 40;
        victim.y = home.y + Math.cos(ctx.scene.time.now / 530) * 24;
      }
    });

    ctx.at(300, () => readout.setText('asleep — 80 drowsiness is 16 seconds of dream'));
    ctx.at(900, () => ctx.glideCaster({ to: { x: ctx.cx + 40, y: ctx.cy }, ms: 600 }));
    ctx.at(1700, () => {
      ctx.capture(() => fx.delveSwirl(victim.x, victim.y, false));
      readout.setText('E — Delve');
    });
    ctx.at(2200, () => {
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, Math.floor(Math.random() * 5), ctx.w, ctx.h, false));
      dreaming = true;
      rig?.setGuns('pistols');
      readout.setText('in the dream: +35% speed, −40% cooldowns, and nothing here wakes them');
    });
    for (let i = 0; i < 4; i++) {
      ctx.at(3400 + i * 900, () => {
        const side = (i % 2) as 0 | 1;
        av.setFacing(Math.atan2(victim.y - ctx.cy, victim.x - (ctx.cx + 40)));
        const mz = rig ? rig.muzzle(side) : { x: ctx.cx + 60, y: ctx.cy };
        ctx.capture(() => fx.pistolShot(mz.x, mz.y, victim.x, victim.y));
        ctx.capture(() => fx.starBurst(victim.x, victim.y, 54));
        rig?.kick(side, 1.4);
        float(ctx, victim.x, victim.y - 28, '30', '#b48cff', 15);
      });
    }
    ctx.at(7400, () => readout.setText('E again — Surface. They are still asleep out here.'));
    ctx.at(7800, () => {
      ctx.capture(() => fx.delveSwirl(victim.x, victim.y, true));
      view?.close();
      dreaming = false;
      victim.x = home.x; victim.y = home.y;
      rig?.setGuns('sandmen');
    });
    ctx.at(8800, () => readout.setText('top them up, and go back in — the dream lasts as long as the drowsiness'));
  },
};

// ══ R — Pillow Fight ══════════════════════════════════════════════════

export const pillowFight: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'R — 6 damage and +20 drowsiness, +34 on a fresh meter, none of the damage on a sleeper. In a dream: a claw',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 74, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 0, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#bfd0ff', 11);

    const swing = (at: number, then: () => void): void => ctx.at(at, () => {
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.pillowSwing(ctx.cx, ctx.cy, ctx.aim, PILLOW_REACH));
      ctx.capture(() => fx.feathers(victim.x, victim.y, 9, ctx.aim));
      then();
    });

    ctx.at(200, () => readout.setText('a fresh meter takes the big dose'));
    swing(600, () => {
      float(ctx, victim.x, victim.y - 26, '6', '#bfd0ff', 13);
      sleep.drowsy = 34;
      float(ctx, victim.x, victim.y - 46, '🥱 +34', '#8b5cf6', 11);
    });
    swing(2200, () => {
      float(ctx, victim.x, victim.y - 26, '6', '#bfd0ff', 13);
      sleep.drowsy = 54;
      float(ctx, victim.x, victim.y - 46, '+20', '#8b5cf6', 11);
      readout.setText('after that, +20 a swing');
    });
    ctx.at(3600, () => {
      sleep.drowsy = 100; sleep.asleep = true;
      ctx.capture(() => fx.zzzPuff(victim.x, victim.y));
      readout.setText('asleep — the pillow tucks them in instead');
    });
    swing(4400, () => {
      sleep.drowsy = Math.min(100, sleep.drowsy + 20);
      float(ctx, victim.x, victim.y - 46, 'no damage · +20', '#c9b8ff', 11);
    });
    ctx.at(6200, () => {
      sleep.asleep = false; sleep.drowsy = 0;
      readout.setText('in a dream, R is a claw: 30 damage and a 2.5s slow');
    });
    for (let i = 0; i < 2; i++) {
      ctx.at(6800 + i * 1300, () => {
        av.play('sweep', ctx.aim);
        ctx.capture(() => fx.clawSwipe(ctx.cx, ctx.cy, ctx.aim, CLAW_REACH));
        float(ctx, victim.x, victim.y - 26, '30', '#ff3d7a', 15);
      });
    }
  },
};

// ══ F — Sleep Tight ═══════════════════════════════════════════════════

export const sleepTight: PreviewScript = {
  duration: 11000,
  scale: 0.85,
  caption: 'F — a tiny fast dagger: 8 and +16 drowsiness, up to +30 the sleepier they are; a hit halves the cooldown. In a dream: a leech',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 220, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 20, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#c8d4ff', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const dagger = { on: false, x: 0, y: 0 };
    const leech = { state: 'off' as 'off' | 'flying' | 'stuck', x: 0, y: 0, dealt: 0 };

    ctx.onFrame((dt, e) => {
      g.clear();
      const t = e / 1000;
      if (dagger.on) {
        dagger.x += DAGGER_SPEED * dt / 1000;
        g.lineStyle(2, ctx.tint(DRM.pale), 0.35);
        g.lineBetween(dagger.x - 26, dagger.y, dagger.x, dagger.y);
        sleepDagger(g, ctx.tint, dagger.x, dagger.y, 0, 1);
        if (dagger.x >= victim.x - 20) {
          dagger.on = false;
          const gain = 16 + 14 * (sleep.drowsy / 100);
          sleep.drowsy = Math.min(100, sleep.drowsy + gain);
          float(ctx, victim.x, victim.y - 26, '8', '#c8d4ff', 13);
          float(ctx, victim.x, victim.y - 46, `+${gain.toFixed(1)}`, '#8b5cf6', 11);
          ctx.capture(() => fx.stardust(victim.x, victim.y, 6, 20, 520, 8));
        }
      }
      if (leech.state === 'flying') {
        leech.x += LEECH_SPEED * dt / 1000;
        if (leech.x >= victim.x - 16) { leech.state = 'stuck'; leech.dealt = 22; float(ctx, victim.x, victim.y - 26, '22', '#ff7ab0', 14); }
      }
      if (leech.state !== 'off') dreamLeech(g, ctx.tint, leech.x, victim.y + (leech.state === 'stuck' ? -4 : 0), 0, t, 1, leech.state === 'stuck', Math.min(1, leech.dealt / 60));
    });

    const throwAt = (at: number, drowsy: number, text: string): void => {
      ctx.at(at - 300, () => { sleep.drowsy = drowsy; readout.setText(text); });
      ctx.at(at, () => {
        av.play('punch', ctx.aim);
        dagger.on = true; dagger.x = ctx.cx + 20; dagger.y = ctx.cy;
      });
    };
    throwAt(500, 20, 'at 20 drowsy: +18.8');
    throwAt(2100, 80, 'at 80 drowsy: +27.2 — and the hit halves the cooldown');
    ctx.at(4000, () => { sleep.drowsy = 0; readout.setText('in a dream, F is a living leech'); });
    ctx.at(4400, () => { av.play('punch', ctx.aim); leech.state = 'flying'; leech.x = ctx.cx + 20; leech.y = ctx.cy; });
    for (let i = 1; i <= 3; i++) {
      ctx.at(5000 + i * 1000, () => { if (leech.state === 'stuck') { leech.dealt += 3; float(ctx, victim.x + 10, victim.y - 20, '3', '#ff7ab0', 10); } });
    }
    ctx.at(8400, () => { readout.setText('walk up and pull it out: heal for everything it ate'); ctx.glideCaster({ to: { x: victim.x - 46, y: victim.y }, ms: 700 }); });
    ctx.at(9200, () => {
      leech.state = 'off';
      ctx.capture(() => fx.stardust(victim.x - 20, victim.y, 8, 24, 600, 8));
      float(ctx, victim.x - 46, victim.y - 40, `🩸 +${leech.dealt}`, '#ff9cc8', 14);
    });
  },
};

// ══ Q — Nightmare ═════════════════════════════════════════════════════

export const nightmare: PreviewScript = {
  duration: 10500,
  scale: 0.8,
  caption: 'Q — at 50+ drowsiness: blind, panicking, 60 over 3s and +25% damage taken; −15 drowsiness. In a dream, it walks',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 170, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 65, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#ff8fab', 11);
    const dark = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const beastG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let darkUntil = 0;
    const beast = { on: false, x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, stepAt: 0, next: 0, facing: 0 };

    ctx.onFrame((_dt, e) => {
      dark.clear();
      beastG.clear();
      const t = e / 1000;
      if (e < darkUntil) {
        const left = darkUntil - e;
        nightmareDarkness(dark, ctx.tint, victim.x, victim.y, 44, Math.max(ctx.w, ctx.h), t, Math.min(1, left / 300, (3000 - left) / 200));
      }
      if (beast.on) {
        if (e >= beast.next) {
          const a = Math.atan2(victim.y - beast.y, victim.x - beast.x) + (Math.random() * 2 - 1) * 0.6;
          beast.fx = beast.x; beast.fy = beast.y;
          beast.tx = beast.x + Math.cos(a) * 38; beast.ty = beast.y + Math.sin(a) * 38;
          beast.facing = a; beast.stepAt = e; beast.next = e + 420 * (0.7 + Math.random() * 0.6);
        }
        const u = Phaser.Math.Clamp((e - beast.stepAt) / 150, 0, 1);
        beast.x = beast.fx + (beast.tx - beast.fx) * u;
        beast.y = beast.fy + (beast.ty - beast.fy) * u;
        nightmareBeast(beastG, ctx.tint, beast.x, beast.y, beast.facing, t, 1, u);
        if (Phaser.Math.Distance.Between(beast.x, beast.y, victim.x, victim.y) < 30) {
          beast.on = false;
          darkUntil = e + 3000;
          ctx.capture(() => fx.ring(victim.x, victim.y, 6, 60, DRM.dreadDeep, 480, 6, 8));
          float(ctx, victim.x, victim.y - 52, '👁️ CAUGHT', '#ff3b6b', 12);
        }
      }
    });

    const ticks = (from: number): void => {
      for (let i = 1; i <= 12; i++) ctx.at(from + i * 250, () => float(ctx, victim.x + (i % 2 ? 8 : -8), victim.y - 22, '5', '#ff3b6b', 10));
    };
    ctx.at(300, () => readout.setText('65 drowsy — enough for a Nightmare'));
    ctx.at(800, () => {
      av.play('raise');
      sleep.drowsy = 50;
      darkUntil = 800 + 3000;
      ctx.capture(() => fx.ring(victim.x, victim.y, 10, 70, DRM.dread, 520, 5, 8));
      float(ctx, victim.x, victim.y - 52, '👁️ NIGHTMARE  −15', '#ff3b6b', 12);
      readout.setText('they see almost nothing, and everything hits them 25% harder');
    });
    ticks(800);
    ctx.at(4600, () => readout.setText('cast inside a dream, it also sets a nightmare loose on foot'));
    ctx.at(5100, () => {
      av.play('raise');
      beast.on = true; beast.x = ctx.cx + 30; beast.y = ctx.cy; beast.next = 0;
      ctx.capture(() => fx.ring(beast.x, beast.y, 6, 46, DRM.dread, 420, 4, 8));
    });
  },
};

// ══ Passive — Drowsiness ══════════════════════════════════════════════

export const passiveDrowsiness: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Passive — 100 drowsiness and they fall asleep. Sleep burns 5 a second; any damage out here wakes them',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 110, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 0, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#c9b8ff', 11);

    ctx.onFrame((dt) => {
      if (sleep.asleep) sleep.drowsy = Math.max(0, sleep.drowsy - 5 * dt / 1000);
    });
    const add = (at: number, n: number): void => ctx.at(at, () => {
      sleep.drowsy = Math.min(100, sleep.drowsy + n);
      float(ctx, victim.x, victim.y - 46, `+${n}`, '#8b5cf6', 11);
      if (sleep.drowsy >= 100 && !sleep.asleep) {
        sleep.asleep = true;
        ctx.capture(() => fx.zzzPuff(victim.x, victim.y));
        ctx.capture(() => fx.ring(victim.x, victim.y, 10, 70, DRM.purple, 620, 5, 7));
        float(ctx, victim.x, victim.y - 62, '😴 ASLEEP', '#a78bfa', 13);
      }
    });
    ctx.at(200, () => readout.setText('the pillow and the dagger fill the meter'));
    add(500, 34); add(1300, 20); add(2100, 27); add(2900, 20);
    ctx.at(3300, () => readout.setText('asleep: burning 5 a second until it runs out'));
    ctx.at(6000, () => {
      readout.setText('…or until anything in the waking world hurts them');
      const mz = { x: ctx.cx + 22, y: ctx.cy };
      ctx.capture(() => fx.sandShot(mz.x, mz.y, victim.x - 18, victim.y, true));
      float(ctx, victim.x, victim.y - 26, '4', '#f0d48a', 12);
      sleep.asleep = false; sleep.drowsy = 0;
      ctx.capture(() => fx.stardust(victim.x, victim.y, 7, 26, 640, 7));
      float(ctx, victim.x, victim.y - 48, '⏰ AWAKE!', '#d8e2ff', 11);
    });
  },
};

// ══ Shop upgrades ═════════════════════════════════════════════════════

export const sandmenUpgraded: PreviewScript = {
  duration: 10500,
  scale: 0.85,
  caption: 'Click+ Amnesia — right-click throws the rest of the clip: 1.5 a round under it, every round flung out in a ring. In a dream: 30, or 75 with both rounds',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 170, y: ctx.cy };
    const second = { x: ctx.cx + 230, y: ctx.cy - 80 };
    dummyAt(ctx, victim);
    dummyAt(ctx, second);
    const readout = label(ctx, ctx.w * 0.5, 14, '#f0d48a', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let clip: { t0: number; rounds: number; dream: boolean } | null = null;
    let pellets: { x: number; y: number; vx: number; vy: number; d: number; done: boolean }[] = [];
    let view: DreamWorldView | null = null;
    const from = { x: ctx.cx + 20, y: ctx.cy };
    let elapsed = 0;

    ctx.onFrame((dt, e) => {
      elapsed = e;
      g.clear();
      view?.update(dt);
      const s2 = dt / 1000;
      if (clip) {
        const u = Phaser.Math.Clamp((e - clip.t0) / 220, 0, 1);
        const x = from.x + (victim.x - from.x) * u, y = from.y + (victim.y - from.y) * u - Math.sin(u * Math.PI) * 26;
        ammoClip(g, ctx.tint, x, y, u * 16, clip.dream ? clip.rounds / 2 : clip.rounds / SANDMEN_MAG, 1, clip.dream);
        if (u >= 1) {
          const c = clip;
          clip = null;
          if (c.dream) {
            ctx.capture(() => fx.starBurst(victim.x, victim.y, 115));
            ctx.capture(() => fx.ring(victim.x, victim.y, 12, 135, c.rounds >= 2 ? DRM.star : DRM.purple, 520, 7, 9));
            float(ctx, victim.x, victim.y - 30, c.rounds >= 2 ? '75' : '30', '#fff4c2', 17);
            float(ctx, second.x, second.y - 30, c.rounds >= 2 ? '75' : '30', '#fff4c2', 15);
          } else {
            ctx.capture(() => fx.ring(victim.x, victim.y, 8, 64, DRM.sand, 380, 5, 8));
            float(ctx, victim.x, victim.y - 30, `${(c.rounds * 1.5).toFixed(0)}`, '#f0d48a', 16);
            for (let i = 0; i < c.rounds; i++) {
              const a = (i / c.rounds) * Math.PI * 2;
              pellets.push({ x: victim.x + Math.cos(a) * 28, y: victim.y + Math.sin(a) * 28, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, d: 0, done: false });
            }
          }
        }
      }
      for (const p of pellets) {
        if (p.done) continue;
        p.x += p.vx * s2; p.y += p.vy * s2; p.d += 640 * s2;
        if (Phaser.Math.Distance.Between(p.x, p.y, second.x, second.y) < 22) {
          p.done = true;
          float(ctx, second.x + (Math.random() - 0.5) * 20, second.y - 24, '4', '#f0d48a', 11);
          continue;
        }
        if (p.d > 250) { p.done = true; continue; }
        const a = Math.atan2(p.vy, p.vx);
        g.lineStyle(2, ctx.tint(DRM.sandDeep), 0.5);
        g.lineBetween(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12, p.x, p.y);
        g.fillStyle(ctx.tint(DRM.sand), 1);
        g.fillCircle(p.x, p.y, 2);
      }
      pellets = pellets.filter((p) => !p.done);
    });

    // A few rounds first, so the clip has something less than full in it.
    for (let i = 0; i < 8; i++) {
      ctx.at(300 + i * SANDMEN_GAP, () => {
        const side = (i % 2) as 0 | 1;
        const mz = rig ? rig.muzzle(side) : from;
        ctx.capture(() => fx.sandShot(mz.x, mz.y, victim.x - 18, victim.y, true));
        rig?.kick(side, 0.7);
      });
    }
    ctx.at(300, () => readout.setText('22 rounds left in the clip…'));
    ctx.at(1600, () => {
      readout.setText('right-click — Amnesia: throw the lot');
      av.play('punch', ctx.aim);
      clip = { t0: elapsed, rounds: 22, dream: false };
    });
    ctx.at(3200, () => readout.setText('⌛ and then you reload'));
    ctx.at(4800, () => {
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, 4, ctx.w, ctx.h, false));
      rig?.setGuns('pistols');
      readout.setText('in a dream: both pistol rounds, thrown as one');
    });
    ctx.at(6300, () => {
      av.play('punch', ctx.aim);
      clip = { t0: elapsed, rounds: 2, dream: true };
    });
    ctx.at(7900, () => readout.setText('one round left? 30. Both still loaded? 75'));
    // One round fired first: the throw that follows only has the one left in it.
    ctx.at(8400, () => {
      const mz = rig ? rig.muzzle(0) : from;
      ctx.capture(() => fx.pistolShot(mz.x, mz.y, victim.x, victim.y));
      ctx.capture(() => fx.starBurst(victim.x, victim.y, 54));
      float(ctx, victim.x, victim.y - 28, '30', '#b48cff', 13);
    });
    ctx.at(8400 + PISTOL_GAP + 300, () => { av.play('punch', ctx.aim); clip = { t0: elapsed, rounds: 1, dream: true }; });
  },
};

export const delveUpgraded: PreviewScript = {
  duration: 12000,
  scale: 0.75,
  caption: 'E+ Lucid Dream — five switches over their dream: split it, spikes, empower yourself, red mist, shrink it. Every switch: they wake 25% faster',
  run(ctx) {
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    rig?.setGuns('pistols');
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 90, asleep: true };
    const view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, 3, ctx.w, ctx.h, false));
    const panel = ctx.capture(() => new LucidPanel(ctx.scene, ctx.tint, ctx.w, [
      { key: 'split', emoji: '🪞', name: 'SPLIT' },
      { key: 'spikes', emoji: '🗡️', name: 'SPIKES' },
      { key: 'buff', emoji: '✨', name: 'EMPOWER' },
      { key: 'mist', emoji: '🩸', name: 'RED MIST' },
      { key: 'shrink', emoji: '🔲', name: 'SHRINK' },
    ]));
    const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(0.7));
    const top = ctx.adopt(ctx.scene.add.graphics().setDepth(13.2));
    const readout = label(ctx, ctx.w * 0.5, ctx.h - 18, '#c9b8ff', 11);
    let mask = 0;
    let hover = -1;
    const flip = (i: number, text: string): void => {
      ctx.at(1200 + i * 1700, () => { hover = i; });
      ctx.at(1500 + i * 1700, () => { mask |= 1 << i; readout.setText(text); hover = -1; });
    };
    ctx.onFrame((dt, e) => {
      view.update(dt);
      const t = e / 1000;
      const bits = [0, 1, 2, 3, 4].filter((i) => mask & (1 << i)).length;
      sleep.drowsy = Math.max(0, sleep.drowsy - 5 * (1 + 0.25 * bits) * dt / 1000);
      panel.paint(mask, hover, 1 + 0.25 * bits, t);
      floor.clear(); top.clear();
      const shrink = (mask & 16) !== 0;
      const fw = shrink ? ctx.w * 0.62 : ctx.w, fh = shrink ? ctx.h * 0.62 : ctx.h;
      const fx0 = (ctx.w - fw) / 2, fy0 = (ctx.h - fh) / 2;
      if (shrink) dreamShrink(floor, ctx.tint, 0, 0, ctx.w, ctx.h, fx0, fy0, fw, fh, t);
      if (mask & 2) {
        for (let i = 0; i < 4; i++) {
          const ph = (t / 2.6 + i * 0.27) % 1;
          const up = ph < 0.35 ? 0 : ph < 0.45 ? (ph - 0.35) / 0.1 : ph < 0.88 ? 1 : 1 - (ph - 0.88) / 0.12;
          dreamSpikes(floor, ctx.tint, fx0 + fw * (0.2 + i * 0.2), fy0 + fh * (i % 2 ? 0.3 : 0.72), 26, up, t);
        }
      }
      if (mask & 1) dreamSplit(floor, ctx.tint, ctx.w / 2, fy0, fy0 + fh, -1, t);
      if (mask & 8) redMistBand(top, ctx.tint, fx0, fy0, fw, fh, 70, t);
      // The foe pacing their half, pressed against the seam.
      victim.x = Math.max(ctx.w / 2 + 22, ctx.cx + 150 + Math.sin(e / 600) * 60);
      victim.y = ctx.cy + Math.cos(e / 750) * 40;
    });
    ctx.at(300, () => readout.setText('inside their dream — the panel is yours'));
    flip(0, 'SPLIT — they cannot cross the seam; you can');
    flip(1, 'SPIKES — 8 every half second in a raised patch');
    flip(2, 'EMPOWER — you: +20% speed, 20% dodge');
    flip(3, 'RED MIST — 5 every 0.4s along the edges');
    flip(4, 'SHRINK — and the whole dream closes in');
    ctx.at(10200, () => readout.setText('all five: they burn their sleep 2.25× as fast'));
  },
};

export const pillowUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'R+ Unending Comfort — pillows leave feathers (1.5 drowsiness each, on every hit you land). In a dream the claw leaves scratches: +3 per scratch',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 80, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 0, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#bfd0ff', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let feathers: number[] = [];
    let scratches = 0;
    let view: DreamWorldView | null = null;
    ctx.onFrame((dt, e) => {
      g.clear();
      view?.update(dt);
      const t = e / 1000;
      for (const a of feathers) stuckFeather(g, ctx.tint, victim.x + Math.cos(a) * 12, victim.y + Math.sin(a) * 10, a, t, 1);
      if (scratches > 0) scratchMarks(g, ctx.tint, victim.x, victim.y, scratches, t, 0.9);
    });
    ctx.at(300, () => readout.setText('R+: the pillow leaves feathers behind'));
    ctx.at(700, () => {
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.pillowSwing(ctx.cx, ctx.cy, ctx.aim, PILLOW_REACH));
      ctx.capture(() => fx.feathers(victim.x, victim.y, 9, ctx.aim));
      sleep.drowsy = 34;
      feathers = [Math.PI - 0.6, Math.PI + 0.3, Math.PI + 0.9];
      float(ctx, victim.x, victim.y - 46, '🪶 ×3', '#e8ecff', 12);
    });
    ctx.at(1700, () => readout.setText('now every Sandmen round adds 1.5 per feather'));
    for (let i = 0; i < 12; i++) {
      ctx.at(2000 + i * SANDMEN_GAP, () => {
        const side = (i % 2) as 0 | 1;
        const mz = rig ? rig.muzzle(side) : { x: ctx.cx + 20, y: ctx.cy };
        ctx.capture(() => fx.sandShot(mz.x, mz.y, victim.x - 18, victim.y, true));
        rig?.kick(side, 0.7);
        if (i % 3 === 0) { sleep.drowsy = Math.min(100, sleep.drowsy + 4.5); float(ctx, victim.x + 14, victim.y - 46, '+4.5', '#8b5cf6', 10); }
      });
    }
    ctx.at(4400, () => { feathers = []; readout.setText('in a dream, the claw leaves scratches instead'); });
    ctx.at(4900, () => {
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, 1, ctx.w, ctx.h, false));
      rig?.setGuns('pistols');
      sleep.drowsy = 0;
    });
    ctx.at(5800, () => {
      av.play('sweep', ctx.aim);
      ctx.capture(() => fx.clawSwipe(ctx.cx, ctx.cy, ctx.aim, CLAW_REACH));
      float(ctx, victim.x, victim.y - 26, '30', '#ff3d7a', 15);
      scratches = 3;
      float(ctx, victim.x, victim.y - 50, '🩸 3 SCRATCHES', '#ff7aa8', 11);
    });
    ctx.at(6900, () => readout.setText('every attack in here: +3 for every scratch'));
    for (let i = 0; i < 2; i++) {
      ctx.at(7600 + i * 1100, () => {
        const side = (i % 2) as 0 | 1;
        const mz = rig ? rig.muzzle(side) : { x: ctx.cx + 20, y: ctx.cy };
        ctx.capture(() => fx.pistolShot(mz.x, mz.y, victim.x, victim.y));
        ctx.capture(() => fx.starBurst(victim.x, victim.y, 54));
        rig?.kick(side, 1.4);
        float(ctx, victim.x, victim.y - 28, '39', '#ff9cc8', 16);
      });
    }
  },
};

export const sleepTightUpgraded: PreviewScript = {
  duration: 12000,
  scale: 0.85,
  caption: 'F+ Sleeping Pills — the dagger stays in: 6 drowsiness a second for 4s. In a dream the leech bites 30, feeds 5, and drops off full for 12s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 200, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 30, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#c8d4ff', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const dagger = { state: 'off' as 'off' | 'flying' | 'stuck', x: 0, until: 0 };
    const leech = { state: 'off' as 'off' | 'flying' | 'stuck' | 'ground', x: 0, y: 0, dealt: 0 };
    let view: DreamWorldView | null = null;
    ctx.onFrame((dt, e) => {
      g.clear();
      view?.update(dt);
      const t = e / 1000;
      if (dagger.state === 'flying') {
        dagger.x += DAGGER_SPEED * dt / 1000;
        sleepDagger(g, ctx.tint, dagger.x, ctx.cy, 0, 1);
        if (dagger.x >= victim.x - 20) {
          dagger.state = 'stuck'; dagger.until = e + 4000;
          sleep.drowsy += 22;
          float(ctx, victim.x, victim.y - 26, '8', '#c8d4ff', 13);
        }
      } else if (dagger.state === 'stuck') {
        sleep.drowsy = Math.min(100, sleep.drowsy + 6 * dt / 1000);
        sleepDagger(g, ctx.tint, victim.x - 10, victim.y, 0, 1, 18);
        const ph = (t * 0.8) % 1;
        g.fillStyle(ctx.tint(DRM.sky), 0.55 * (1 - ph));
        g.fillCircle(victim.x - 16, victim.y - 4 - ph * 16, 2 + ph * 2);
        if (e >= dagger.until) dagger.state = 'off';
      }
      if (leech.state === 'flying') {
        leech.x += LEECH_SPEED * dt / 1000;
        if (leech.x >= victim.x - 16) { leech.state = 'stuck'; leech.dealt = 30; float(ctx, victim.x, victim.y - 26, '30', '#ff7ab0', 15); }
      }
      if (leech.state === 'ground') {
        g.lineStyle(2.2, ctx.tint(DRM.leechBelly), 0.35 + 0.2 * Math.sin(t * 5));
        g.strokeCircle(leech.x, leech.y, 54);
      }
      if (leech.state !== 'off') {
        const y = leech.state === 'stuck' ? victim.y - 4 : leech.state === 'ground' ? leech.y : ctx.cy;
        dreamLeech(g, ctx.tint, leech.x, y, 0, t, 1, leech.state === 'stuck', Math.min(1, leech.dealt / 60));
      }
    });
    ctx.at(300, () => readout.setText('F+: the dagger sticks — and keeps putting them under'));
    ctx.at(700, () => { av.play('punch', ctx.aim); dagger.state = 'flying'; dagger.x = ctx.cx + 20; });
    ctx.at(1600, () => readout.setText('+6 drowsiness a second, for 4 seconds'));
    ctx.at(5200, () => {
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, 2, ctx.w, ctx.h, false));
      rig?.setGuns('pistols');
      sleep.drowsy = 0;
      readout.setText('in a dream: a hungrier leech');
    });
    ctx.at(5700, () => { av.play('punch', ctx.aim); leech.state = 'flying'; leech.x = ctx.cx + 20; });
    for (let i = 1; i <= 3; i++) {
      ctx.at(6000 + i * 700, () => { if (leech.state === 'stuck') { leech.dealt += 5; float(ctx, victim.x + 10, victim.y - 20, '5', '#ff7ab0', 10); } });
    }
    ctx.at(8400, () => {
      leech.state = 'ground'; leech.x = victim.x + 30; leech.y = victim.y + 34;
      float(ctx, leech.x, leech.y - 26, '🪱 FULL', '#ff9cc8', 11);
      readout.setText('fed full, it drops — and waits 12 seconds, easy to pick up');
    });
    ctx.at(9800, () => ctx.glideCaster({ to: { x: leech.x - 80, y: leech.y }, ms: 700 }));
    ctx.at(10600, () => {
      leech.state = 'off';
      ctx.capture(() => fx.stardust(leech.x, leech.y, 8, 24, 600, 8));
      float(ctx, leech.x - 80, leech.y - 40, `🩸 +${leech.dealt}`, '#ff9cc8', 14);
    });
  },
};

export const nightmareUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.8,
  caption: 'Q+ Sleep Paralysis — after the 15, their drowsiness cannot fall for 5s and they move 20% slower. In a dream, the dream becomes a nightmare',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    const rig = sandman(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 160, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 70, asleep: true };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#ff8fab', 11);
    let heldUntil = 0;
    let world = 0;
    let view: DreamWorldView | null = null;
    ctx.onFrame((dt, e) => {
      view?.update(dt);
      view?.setNightmare(e < heldUntil);
      if (e >= heldUntil) sleep.drowsy = Math.max(0, sleep.drowsy - 5 * dt / 1000);
    });
    const cast = (at: number): void => ctx.at(at, () => {
      av.play('raise');
      sleep.drowsy = Math.max(0, sleep.drowsy - 15);
      heldUntil = at + 5000;
      ctx.capture(() => fx.ring(victim.x, victim.y, 10, 70, DRM.dread, 520, 5, 8));
      float(ctx, victim.x, victim.y - 52, '👁️ −15  ·  🫥 HELD 5s', '#ff3b6b', 12);
    });
    ctx.at(200, () => {
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, world, ctx.w, ctx.h, false));
      rig?.setGuns('pistols');
      readout.setText('in their dream, the meter is the clock');
    });
    cast(1200);
    ctx.at(1700, () => readout.setText('Sleep Paralysis: the clock stops — and the dream turns'));
    ctx.at(6400, () => readout.setText('every dream has its nightmare'));
    ctx.at(6800, () => {
      view?.close();
      world = 4;
      view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, world, ctx.w, ctx.h, false));
    });
    cast(7400);
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryCatcher: PreviewScript = {
  duration: 11000,
  scale: 0.85,
  caption: 'Dreamcatcher — in their dream, dreams slip out to your back. 5s later: green heals 10, red (a nightmare) is +10% damage for 10s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    const rig = sandman(av);
    rig?.setGuns('pistols');
    av.setFacing(0);
    const victim = { x: ctx.cx + 170, y: ctx.cy - 10 };
    dummyAt(ctx, victim);
    const view = ctx.capture(() => new DreamWorldView(ctx.scene, ctx.tint, 0, ctx.w, ctx.h, false));
    const readout = label(ctx, ctx.w * 0.5, 14, '#7af2a6', 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const dark = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const orbs: { x: number; y: number; vx: number; vy: number; bad: boolean }[] = [];
    const digest: { bad: boolean; readyAt: number }[] = [];
    let nightmareUntil = 0;
    const back = { x: ctx.cx - 15, y: ctx.cy - 8 };
    ctx.onFrame((dt, e) => {
      view.update(dt);
      g.clear(); dark.clear();
      const t = e / 1000;
      const s2 = dt / 1000;
      if (e < nightmareUntil) nightmareDarkness(dark, ctx.tint, victim.x, victim.y, 44, Math.max(ctx.w, ctx.h), t, Math.min(1, (nightmareUntil - e) / 300));
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        const dx = back.x - o.x, dy = back.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 12) { orbs.splice(i, 1); digest.push({ bad: o.bad, readyAt: e + 5000 }); continue; }
        o.vx += (dx / d) * 900 * s2; o.vy += (dy / d) * 900 * s2;
        const sp = Math.hypot(o.vx, o.vy);
        if (sp > 420) { o.vx *= 420 / sp; o.vy *= 420 / sp; }
        o.x += o.vx * s2; o.y += o.vy * s2;
        dreamOrb(g, ctx.tint, o.x, o.y, o.bad, t, 1, 5);
      }
      for (let i = digest.length - 1; i >= 0; i--) {
        if (e < digest[i].readyAt) continue;
        const dg = digest.splice(i, 1)[0];
        float(ctx, ctx.cx, ctx.cy - 50, dg.bad ? '🔴 +10% DAMAGE' : '🟢 +10', dg.bad ? '#ff6b7f' : '#7af2a6', 12);
        ctx.capture(() => fx.ring(ctx.cx, ctx.cy, 10, 46, dg.bad ? DREAM_ORB.bad : DREAM_ORB.good, 420, 4, 8));
      }
      rig?.setCatcher(digest.map((d) => ({ bad: d.bad, k: 1 - Phaser.Math.Clamp((d.readyAt - e) / 5000, 0, 1) })));
    });
    const slip = (at: number, bad: boolean): void => ctx.at(at, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      orbs.push({ x: victim.x, y: victim.y - 10, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 80, bad });
      ctx.capture(() => fx.stardust(victim.x, victim.y - 10, 3, 14, 420, 8));
    });
    ctx.at(200, () => readout.setText('a dreamcatcher on your back — they let dreams slip'));
    slip(700, false); slip(2000, false);
    ctx.at(3600, () => {
      av.play('raise');
      nightmareUntil = 3600 + 3000;
      ctx.capture(() => fx.ring(victim.x, victim.y, 10, 70, DRM.dread, 520, 5, 8));
      readout.setText('in a nightmare, the dreams come out red');
    });
    slip(4200, true); slip(5300, true);
    ctx.at(7000, () => readout.setText('each one digests for 5 seconds before it pays'));
  },
};

export const masteryMusicBox: PreviewScript = {
  duration: 12000,
  scale: 0.85,
  caption: 'Music-box — hold to wind (4s of music a second, 20s at most), release to throw: +4 drowsiness a second to anyone in its 110px',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new DreamAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    const rig = sandman(av);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 190, y: ctx.cy };
    dummyAt(ctx, victim);
    const sleep = { drowsy: 40, asleep: false };
    overhead(ctx, victim, () => sleep);
    const readout = label(ctx, ctx.w * 0.5, 14, '#c9b8ff', 11);
    const floor = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let windFrom = -1;
    let box: { t0: number; landed: boolean; until: number; dur: number } | null = null;
    const from = { x: ctx.cx + 20, y: ctx.cy - 10 };
    const land = { x: victim.x - 10, y: victim.y + 10 };
    ctx.onFrame((dt, e) => {
      g.clear(); floor.clear();
      const t = e / 1000;
      rig?.setWinding(windFrom >= 0 ? Phaser.Math.Clamp((e - windFrom) / 5000, 0, 1) : -1);
      if (sleep.asleep) sleep.drowsy = Math.max(0, sleep.drowsy - 5 * dt / 1000);
      if (box) {
        if (!box.landed) {
          const u = Phaser.Math.Clamp((e - box.t0) / 450, 0, 1);
          const x = from.x + (land.x - from.x) * u, y = from.y + (land.y - from.y) * u - Math.sin(u * Math.PI) * 60;
          musicBox(g, ctx.tint, x, y, t, 0.1, u * 12, 1, 0.9 + Math.sin(u * Math.PI) * 0.25);
          if (u >= 1) {
            box.landed = true; box.until = e + box.dur;
            ctx.capture(() => fx.ring(land.x, land.y, 10, 110, DRM.purple, 600, 4, 6));
          }
        } else {
          lullabyZone(floor, ctx.tint, land.x, land.y, 110, t, Phaser.Math.Clamp((box.until - e) / box.dur, 0, 1));
          musicBox(g, ctx.tint, land.x, land.y, t, 1, t * 3, 1, 1);
          sleep.drowsy = Math.min(100, sleep.drowsy + 4 * dt / 1000);
          if (sleep.drowsy >= 100 && !sleep.asleep) {
            sleep.asleep = true;
            ctx.capture(() => fx.zzzPuff(victim.x, victim.y));
            float(ctx, victim.x, victim.y - 62, '😴 ASLEEP', '#a78bfa', 13);
          }
        }
      }
    });
    ctx.at(300, () => { windFrom = 300; readout.setText('hold — wind it up: every second is 4 seconds of music'); });
    ctx.at(2800, () => {
      windFrom = -1;
      av.play('punch', ctx.aim);
      box = { t0: 2800, landed: false, until: 0, dur: 10000 };
      readout.setText('release — thrown to the cursor: 10 seconds of lullaby');
    });
    ctx.at(3800, () => readout.setText('+4 drowsiness a second to anyone standing in it'));
    ctx.at(7600, () => { sleep.drowsy = Math.max(sleep.drowsy, 98); });
    ctx.at(8400, () => readout.setText('over a sleeper it outplays the sleep\'s burn — they stay under'));
  },
};
