import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  ASTRA, AstraAvatar, AstraFx, stabilityBar, starAura, wallExcite, wormOrb,
} from '../../../elements/kits/AstraVisuals';

/**
 * Astra's showcases.
 *
 * Each loop fires the kit's own `AstraFx` painters at the kit's numbers. The box's walls stand in
 * for the arena's: the shots and flares run to the edge of the box.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const SHOT_GAP_MS = 70;
const FLARE_GAP_MS = 380;
const FLARE_W = 46;
const RING_R = 150;
const RING_W = 34;
const WARP_SPEED = 640;
const AURA_R = 90;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): AstraFx {
  return ctx.capture(() => new AstraFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The star's rig, or null when a skin has replaced the character. */
function star(av: unknown): AstraAvatar | null {
  return av instanceof AstraAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#07061a', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/** A training dummy that can be moved; returns its live position. */
function dummy(ctx: PreviewCtx, start: { x: number; y: number }): { x: number; y: number } {
  const at = { ...start };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
  return at;
}

function stand(ctx: PreviewCtx): AstraAvatar | null {
  const av = star(ctx.useAvatar(() => new AstraAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  return av;
}

// ══ PASSIVE ════════════════════════════════════════════════════════════

export const lockedAim: PreviewScript = {
  duration: 5200,
  scale: 0.85,
  caption: 'Locked Aim — the shots only fly level and the flares only make a plus and an X. Star mode lets everything aim',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.starHot), 11);
    const aimAt = { x: ctx.cx + 160, y: ctx.cy - 90 };
    const aimG = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    ctx.onFrame(() => {
      aimG.clear();
      aimG.lineStyle(1.5, 0xffffff, 0.8);
      aimG.strokeCircle(aimAt.x, aimAt.y, 7);
    });
    ctx.at(300, () => {
      readout.setText('aim up and right — the shots still fly level');
      for (let i = 0; i < 4; i++) ctx.at(300 + i * SHOT_GAP_MS, () => { const c = ctx.casterAt(); fx.shot(c.x + 16, c.y, ctx.w, c.y); });
      av?.play('punch', 0);
    });
    ctx.at(2400, () => {
      readout.setText('star mode — straight at the cursor');
      av?.setStarMode(true);
      const c = ctx.casterAt();
      fx.starModeOn(c.x, c.y);
    });
    ctx.at(3100, () => {
      const c = ctx.casterAt();
      const a = Math.atan2(aimAt.y - c.y, aimAt.x - c.x);
      for (let i = 0; i < 4; i++) {
        ctx.at(3100 + i * SHOT_GAP_MS, () => fx.shot(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16, c.x + Math.cos(a) * 400, c.y + Math.sin(a) * 400));
      }
      av?.play('punch', a);
    });
  },
};

// ══ Click — Starstruck ═════════════════════════════════════════════════

function starstruckRun(ctx: PreviewCtx, excite: boolean): void {
  const fx = fxOf(ctx);
  const av = stand(ctx);
  const victim = dummy(ctx, { x: ctx.cx + 170, y: ctx.cy });
  const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.starHot), 11);
  const wallX = ctx.w - 8;
  const exciteG = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  let excitedAt = -1;
  ctx.onFrame((_dt, e) => {
    exciteG.clear();
    if (excitedAt >= 0 && e - excitedAt < 2000) wallExcite(exciteG, ctx.tint, wallX, ctx.cy, Math.PI, (e - excitedAt) / 2000, e / 1000, 3);
  });
  ctx.at(300, () => {
    av?.play('punch', 0);
    for (let i = 0; i < 4; i++) {
      ctx.at(300 + i * SHOT_GAP_MS, () => {
        const c = ctx.casterAt();
        fx.shot(c.x + 16, c.y, wallX, c.y);
        fx.shotHit(victim.x, victim.y);
        float(ctx, victim.x, victim.y - 30 - i * 8, '-4', ASTRA.starHot);
      });
    }
    readout.setText('4 level shots, 4 damage each, through everything to the wall');
  });
  if (excite) {
    ctx.at(600, () => { excitedAt = 600; readout.setText('Atomical Excitement: the wall they hit is excited'); });
    ctx.at(2600, () => {
      fx.wallRelease(wallX, ctx.cy);
      fx.wallBeam(wallX - 4, ctx.cy, 8, ctx.cy);
      fx.shotHit(victim.x, victim.y);
      float(ctx, victim.x, victim.y - 34, '-16', ASTRA.exciteLit, 12);
      readout.setText('2s later it fires back: 4 for every shot that excited it');
    });
  }
}

export const starstruck: PreviewScript = {
  duration: 3400,
  scale: 0.85,
  caption: 'Click — a burst of 4 instant solar shots, perfectly level: left or right, whichever side the cursor is on',
  run(ctx) { starstruckRun(ctx, false); },
};

export const starstruckUpgraded: PreviewScript = {
  duration: 4400,
  scale: 0.85,
  caption: 'Click+ Atomical Excitement — the wall the shots hit glows for 2s, then shoots a beam back across the arena',
  run(ctx) { starstruckRun(ctx, true); },
};

// ══ E — Solar Flares ═══════════════════════════════════════════════════

function flaresRun(ctx: PreviewCtx, combo: boolean): void {
  const fx = fxOf(ctx);
  const av = stand(ctx);
  const victim = dummy(ctx, { x: ctx.cx + 105, y: ctx.cy + 105 });
  const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.starHot), 11);
  const PLUS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const CROSS = [Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, -Math.PI / 4];
  ctx.at(300, () => {
    av?.play('flex');
    const c = ctx.casterAt();
    fx.flare(c.x, c.y, PLUS, ctx.w, FLARE_W, false);
    readout.setText('the plus — 12 on every arm');
  });
  ctx.at(300 + FLARE_GAP_MS, () => {
    const c = ctx.casterAt();
    fx.flare(c.x, c.y, CROSS, ctx.w, FLARE_W, true);
    ctx.at(300 + FLARE_GAP_MS + 90, () => float(ctx, victim.x, victim.y - 30, '-12', ASTRA.starHot));
    readout.setText('then the X');
  });
  if (combo) {
    ctx.at(300 + FLARE_GAP_MS * 2, () => {
      const c = ctx.casterAt();
      victim.x = c.x + RING_R * 0.72;
      victim.y = c.y + RING_R * 0.7;
      fx.ringFlare(c.x, c.y, RING_R, RING_W, true);
      ctx.at(300 + FLARE_GAP_MS * 2 + 120, () => float(ctx, victim.x, victim.y - 34, '-42 COSMIC COMBO', ASTRA.white, 12));
      readout.setText('Cosmic Combo: the ring — devastating on anyone the first two hit');
    });
  }
}

export const flares: PreviewScript = {
  duration: 3000,
  scale: 0.75,
  caption: 'E — a plus of wide solar beams out of you, then an X. 12 damage on every arm, to the wall',
  run(ctx) { flaresRun(ctx, false); },
};

export const flaresUpgraded: PreviewScript = {
  duration: 3600,
  scale: 0.75,
  caption: 'E+ Cosmic Combo — a third flare, a ring of fire 150px out: 12, or 42 to anyone the first two hit',
  run(ctx) { flaresRun(ctx, true); },
};

// ══ R — Celestial Smite ════════════════════════════════════════════════

function smiteRun(ctx: PreviewCtx, twice: boolean): void {
  const fx = fxOf(ctx);
  const av = stand(ctx);
  const high = dummy(ctx, { x: ctx.cx + 150, y: ctx.cy - 70 });
  const low = dummy(ctx, { x: ctx.cx + 90, y: ctx.cy + 80 });
  const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.violetLit), 11);
  ctx.at(300, () => {
    av?.play('raise', -Math.PI / 2, 420);
    fx.smiteMark(() => high, 250);
    readout.setText('it strikes whoever is highest on the screen — even you');
  });
  ctx.at(550, () => { fx.smiteBolt(high.x, high.y, -40); float(ctx, high.x, high.y - 30, '-18  SLOWED', ASTRA.smite); });
  if (twice) {
    ctx.at(1800, () => { fx.smiteMark(() => low, 250); readout.setText('Never Strikes Twice: R again — the lowest body'); });
    ctx.at(2050, () => { fx.smiteBolt(low.x, low.y, -40); float(ctx, low.x, low.y - 30, '-18  SLOWED', ASTRA.smite); });
  }
}

export const smite: PreviewScript = {
  duration: 2600,
  scale: 0.8,
  caption: 'R — purple lightning onto whoever is closest to the top of the screen: 18 damage and a heavy 2s slow',
  run(ctx) { smiteRun(ctx, false); },
};

export const smiteUpgraded: PreviewScript = {
  duration: 3600,
  scale: 0.8,
  caption: 'R+ Never Strikes Twice — for 4s, R again calls a second bolt onto whoever is lowest',
  run(ctx) { smiteRun(ctx, true); },
};

// ══ F — Worm Warp ══════════════════════════════════════════════════════

function warpRun(ctx: PreviewCtx, steal: boolean): void {
  const fx = fxOf(ctx);
  stand(ctx);
  const victim = dummy(ctx, { x: ctx.cx + 220, y: ctx.cy });
  const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.worm), 11);
  const orbG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let flying = false;
  let ox = 0;
  ctx.at(300, () => { flying = true; ox = ctx.casterAt().x + 22; readout.setText('a wormhole toward the cursor'); });
  ctx.onFrame((dt, e) => {
    orbG.clear();
    if (!flying) return;
    ox += WARP_SPEED * dt / 1000;
    wormOrb(orbG, ctx.tint, ox, ctx.cy, 12, e / 1000, 1);
    if (ox >= victim.x - 20) {
      flying = false;
      const c = ctx.casterAt();
      const was = { x: c.x, y: c.y };
      fx.warpSwap(was.x, was.y, victim.x, victim.y);
      ctx.moveCaster(victim.x, victim.y);
      victim.x = was.x;
      victim.y = was.y;
      float(ctx, victim.x, victim.y - 30, '-8', ASTRA.worm);
      readout.setText('it hits: you swap places');
      if (steal) {
        fx.steal(victim.x, victim.y, () => ctx.casterAt(), ASTRA.worm);
        ctx.at(e + 500, () => readout.setText('Superiority Complex: −3s on yours, +3s on theirs, 20 charge'));
      }
    }
  });
}

export const warp: PreviewScript = {
  duration: 2600,
  scale: 0.8,
  caption: 'F — a wormhole toward your cursor: 8 damage, and you and whoever it hits trade places',
  run(ctx) { warpRun(ctx, false); },
};

export const warpUpgraded: PreviewScript = {
  duration: 3400,
  scale: 0.8,
  caption: 'F+ Superiority Complex — a hit also steals 3 seconds of cooldown and 20 ultimate charge',
  run(ctx) { warpRun(ctx, true); },
};

// ══ Q — True Self ══════════════════════════════════════════════════════

function trueSelfRun(ctx: PreviewCtx, hold: boolean): void {
  const fx = fxOf(ctx);
  const av = stand(ctx);
  const victim = dummy(ctx, { x: ctx.cx + 170, y: ctx.cy });
  const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.starHot), 11);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const holdEnd = hold ? 2600 : 300;
  let stars = 0;
  let trialStart = -1;
  let starOn = -1;
  if (hold) {
    ctx.at(200, () => { av?.setHold('charge', -Math.PI / 2); readout.setText('Q+: hold — a star for every second. Invincible, rooted'); });
  }
  ctx.at(holdEnd, () => {
    av?.setHold(null);
    av?.setTrialStars(0, false);
    const c = ctx.casterAt();
    fx.trialBegin(c.x, c.y);
    trialStart = holdEnd;
    readout.setText(hold ? `a ${stars}-star trial: stability drains faster` : 'the Star Trial: keep stability up for 8 seconds');
  });
  ctx.onFrame((_dt, e) => {
    g.clear();
    aura.clear();
    const c = ctx.casterAt();
    const t = e / 1000;
    if (hold && e > 200 && e < holdEnd) {
      stars = Math.min(2, 1 + Math.floor((e - 550) / 1100));
      if (e > 550) av?.setTrialStars(stars, true);
    }
    if (trialStart >= 0 && starOn < 0) {
      const k = (e - trialStart) / 2600;
      av?.setBrightness(0.45 + 0.55 * k);
      stabilityBar(g, ctx.tint, c.x, c.y - 29, 0.5 + 0.3 * Math.sin(k * 6), 1 - k, 1, t);
      if (k >= 1) {
        starOn = e;
        av?.setStarMode(true);
        fx.starModeOn(c.x, c.y);
        readout.setText('passed: star mode — the corona burns shots, every attack aims');
      }
    }
    if (starOn >= 0) starAura(aura, ctx.tint, c.x, c.y, AURA_R, t, 1);
  });
  ctx.at(holdEnd + 2600 + 1400, () => {
    const c = ctx.casterAt();
    const ang = 0;
    fx.warpSwap(c.x, c.y, victim.x - 44, victim.y);
    ctx.moveCaster(victim.x - 44, victim.y);
    av?.play('sweep', ang, 320);
    fx.impactFrames(victim.x - 22, victim.y, ang, [{ x: victim.x - 44, y: victim.y }, { x: victim.x, y: victim.y }]);
    fx.slap(victim.x, victim.y, ang);
    float(ctx, victim.x, victim.y - 40, '-60  SLAPPED', ASTRA.white, 13);
    readout.setText('Q in star mode: teleport, and slap them into the wall');
  });
}

export const trueSelf: PreviewScript = {
  duration: 6200,
  scale: 0.8,
  caption: 'Q — the Star Trial: deal damage to keep stability up for 8s. Pass and become the star; fail and Q is gone',
  run(ctx) { trueSelfRun(ctx, false); },
};

export const trueSelfUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.8,
  caption: 'Q+ Gods Do Not Fear Mortals — hold Q to take on stars: a harder trial for a longer star. Five stars, beaten, wins outright',
  run(ctx) { trueSelfRun(ctx, true); },
};
