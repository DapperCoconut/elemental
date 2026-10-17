import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  GunKind, MYTH, MythAvatar, MythFx, beast as paintBeast, cloud as paintCloud, crowdFigure, gun as paintGun,
  jitter, portal as paintPortal, shard as paintShard, star, starMace, voidDisc, whip as paintWhip,
} from '../../../elements/kits/MythVisuals';

/**
 * Myth's showcases.
 *
 * There is no `proj-myth` for the tray five — the whip, the slash, the beast and the maces are all
 * Graphics the kit repaints every frame — so these loops keep the same little records the kit
 * keeps and paint with the real painters. One-shots go through a real `MythFx` with a sticky
 * sink. Final Destiny cannot put the box in first person (the view is the whole screen), so its
 * loop shows what everyone *else* sees — the character with each gun in turn — with the gun
 * model drawn in the corner the way the HUD draws it.
 */

function fxOf(ctx: PreviewCtx): MythFx {
  return ctx.capture(() => new MythFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

interface Dummy { x: number; y: number; alive: boolean; stunUntil: number; hp: number }

function dummyAt(ctx: PreviewCtx, d: Dummy, depth = 5): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame((_d, elapsed) => {
    g.clear();
    if (!d.alive) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(d.x, d.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(d.x, d.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(d.x - 5, d.y - 4, 3.2); g.fillCircle(d.x + 5, d.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(d.x - 5.6, d.y - 4, 1.6); g.fillCircle(d.x + 4.4, d.y - 4, 1.6);
    if (elapsed < d.stunUntil) {
      for (let i = 0; i < 3; i++) {
        const a = elapsed / 160 + (i / 3) * Math.PI * 2;
        star(g, d.x + Math.cos(a) * 16, d.y - 24 + Math.sin(a) * 5, 3, 0xffcc55, 1, { points: 4, rot: a });
      }
    }
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

/** The void rig, or null when a skin has replaced the character. */
function rig(av: unknown): MythAvatar | null {
  return av instanceof MythAvatar ? av : null;
}

/** Shards over the caster's head, from a counter the loop owns. */
function shardsOver(ctx: PreviewCtx, count: () => number, depth = 12): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame((_d, elapsed) => {
    g.clear();
    const c = ctx.casterAt();
    const n = count();
    for (let i = 0; i < n; i++) {
      paintShard(g, ctx.tint, c.x + (i - (n - 1) / 2) * 14, c.y - 46 + Math.sin(elapsed / 300 + i) * 2, 6, elapsed / 400 + i * 1.2, 0.95);
    }
  });
}

// ══ CLICK — Cosmic Whip ═══════════════════════════════════════════════

export const cosmicWhip: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Click — a 180px lash for 12; the star mace at the tip does 24 and stuns. Right-click spends a shard for phantom maces.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const near: Dummy = { x: ctx.cx + 110, y: ctx.cy + 26, alive: true, stunUntil: 0, hp: 100 };
    const far: Dummy = { x: ctx.cx + 190, y: ctx.cy - 6, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, near);
    dummyAt(ctx, far);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.haze), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let shards = 1;
    shardsOver(ctx, () => shards);
    let swing: { start: number; x1: number; y1: number; seed: number } | null = null;
    let plusUntil = 0;
    const maces: { cx: number; cy: number; born: number; seed: number }[] = [];

    ctx.onFrame((_delta, elapsed) => {
      g.clear();
      const c = ctx.casterAt();
      if (swing) {
        const k = Phaser.Math.Clamp((elapsed - swing.start) / 280, 0, 1);
        paintWhip(g, ctx.tint, c.x + Math.cos(ctx.aim) * 14, c.y + Math.sin(ctx.aim) * 14, swing.x1, swing.y1, k, swing.seed, 1 - k * 0.4);
        if (k >= 1) swing = null;
      }
      for (let i = maces.length - 1; i >= 0; i--) {
        const m = maces[i];
        const age = (elapsed - m.born) / 1000;
        if (age > 3) { maces.splice(i, 1); continue; }
        const life = Phaser.Math.Clamp((3 - age) * 2, 0, 1);
        g.lineStyle(1, ctx.tint(MYTH.haze), 0.3 * life);
        g.strokeCircle(m.cx, m.cy, 26);
        starMace(g, ctx.tint, m.cx + Math.cos(age * 4.5) * 26, m.cy + Math.sin(age * 4.5) * 26, 9, life, m.seed, age * 4);
      }
      if (elapsed < plusUntil) star(g, c.x + 18, c.y - 50, 4, ctx.tint(MYTH.mace), 0.6 + 0.4 * Math.sin(elapsed / 120), { points: 4, rot: elapsed / 300 });
    });

    const lash = (at: number, tipOn: Dummy | null, bodyOn: Dummy | null) => ctx.at(at, () => {
      const x1 = ctx.cx + Math.cos(ctx.aim) * 194;
      const y1 = ctx.cy + Math.sin(ctx.aim) * 194;
      swing = { start: at, x1, y1, seed: Math.random() * 999 };
      av.play('sweep', ctx.aim, 280);
      if (bodyOn) { fx.graze(bodyOn.x, bodyOn.y); float(ctx, bodyOn.x, bodyOn.y - 30, '12', '#ffb3aa', 12); }
      if (tipOn) { fx.tipHit(tipOn.x, tipOn.y); tipOn.stunUntil = at + 600; float(ctx, tipOn.x, tipOn.y - 30, '24  STAR MACE', hex(MYTH.gold), 12); }
      if (at < plusUntil) maces.push({ cx: x1, cy: y1, born: at, seed: Math.random() * 999 });
    });
    ctx.at(300, () => readout.setText('the lash: 12 to everyone within 22px of the line'));
    lash(800, far, near);
    ctx.at(1300, () => readout.setText('the star mace at the tip: 24 and a 0.6s stun'));
    lash(2300, far, near);
    ctx.at(3400, () => readout.setText('right-click spends a shard: phantom maces for 8 seconds'));
    ctx.at(3900, () => { shards = 0; plusUntil = 3900 + 8000; fx.ring(ctx.cx, ctx.cy, 10, 44, 420, MYTH.mace, 2.5, 10); float(ctx, ctx.cx, ctx.cy - 60, 'PHANTOM MACES', hex(MYTH.mace)); });
    lash(4500, far, near);
    ctx.at(5000, () => readout.setText('every lash leaves a mace circling where the tip landed: 6 per touch for 3s'));
    lash(5600, far, near);
    lash(6700, far, near);
    ctx.at(7300, () => readout.setText('a target standing in the orbit is hit every half second'));
  },
};

// ══ E — Truth Breaker ═════════════════════════════════════════════════

export const truthBreaker: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'E — a 150px arc of 22 TRUE damage: nothing blocks it. E again with a shard: a 240px dash for 32 more.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 120, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.gold), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let shards = 2;
    shardsOver(ctx, () => shards);
    let shieldUntil = 0;
    let windowUntil = 0;

    ctx.onFrame((_delta, elapsed) => {
      g.clear();
      const c = ctx.casterAt();
      if (elapsed < shieldUntil) {
        g.lineStyle(3, 0x66ccff, 0.8);
        g.strokeCircle(d.x, d.y, 26);
        g.fillStyle(0x66ccff, 0.15);
        g.fillCircle(d.x, d.y, 26);
      }
      if (elapsed < windowUntil && shards > 0) {
        const k = (windowUntil - elapsed) / 3000;
        g.lineStyle(2, ctx.tint(MYTH.gold), 0.7);
        g.beginPath();
        g.arc(c.x, c.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k), false);
        g.strokePath();
      }
    });

    ctx.at(300, () => { shieldUntil = 99999; readout.setText('they have a shield up. it does not matter.'); });
    ctx.at(1200, () => {
      rig(av)?.setBlade(true); rig(av)?.setEye(true);
      av.play('sweep', ctx.aim, 320);
      fx.slash(ctx.cx, ctx.cy, ctx.aim, 150, Math.PI / 4);
      float(ctx, d.x, d.y - 36, '22  TRUE', hex(MYTH.gold), 13);
      windowUntil = 1200 + 3000;
    });
    ctx.at(1700, () => readout.setText('true damage: no armour, shield, absorber, dodge, cap or extra health has a say'));
    ctx.at(2000, () => { rig(av)?.setBlade(false); rig(av)?.setEye(false); });
    ctx.at(3000, () => readout.setText('the window is open: E again with a shard is the dash'));
    ctx.at(3600, () => {
      shards--;
      rig(av)?.setBlade(true); rig(av)?.setEye(true);
      av.play('dash', ctx.aim, 320);
      const to = { x: ctx.cx + 240, y: ctx.cy };
      ctx.glideCaster({ to, ms: 220, ease: 'out', onDone: () => { fx.dashTrail(ctx.cx, ctx.cy, to.x, to.y); rig(av)?.setBlade(false); rig(av)?.setEye(false); } });
      ctx.scene.time.delayedCall(90, () => { fx.slash(d.x, d.y, ctx.aim, 60, Math.PI / 3, 10); float(ctx, d.x, d.y - 36, '32  TRUE', hex(MYTH.gold), 13); });
      windowUntil = 3600 + 3220;
    });
    ctx.at(4300, () => readout.setText('every dash reopens the window: three shards are three dashes'));
    ctx.at(6200, () => { ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 600, ease: 'out' }); });
  },
};

// ══ R — Determination ═════════════════════════════════════════════════

export const determination: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'R — invincible for 1.5s, then immune to stuns and slows for 3s. R again with a shard: +5s and 25% speed.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 170, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.gold), 11);
    let shards = 1;
    shardsOver(ctx, () => shards);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let invulnUntil = 0;
    let immuneUntil = 0;
    let plus = false;
    const shots: { x: number; y: number; vx: number }[] = [];

    ctx.onFrame((delta, elapsed) => {
      g.clear();
      const c = ctx.casterAt();
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx * delta / 1000;
        g.fillStyle(0xff6644, 1); g.fillCircle(s.x, s.y, 5);
        if (s.x <= c.x + 20) {
          shots.splice(i, 1);
          if (elapsed < invulnUntil) { fx.ring(c.x, c.y, 20, 36, 200, MYTH.gold, 2, 10); float(ctx, c.x, c.y - 50, 'IMMUNE', hex(MYTH.gold)); }
          else if (elapsed < immuneUntil) { float(ctx, c.x, c.y - 50, 'STUN RESISTED', hex(MYTH.gold)); }
          else { float(ctx, c.x, c.y - 50, '-15', '#ff8866', 12); }
        }
      }
      if (elapsed < immuneUntil) {
        const k = elapsed < invulnUntil ? 1 : 0.5;
        g.lineStyle(2, ctx.tint(MYTH.gold), 0.4 + 0.3 * Math.sin(elapsed / 90) * k);
        g.strokeCircle(c.x, c.y, 28 + 4 * k);
      }
    });

    const fire = (at: number) => ctx.at(at, () => shots.push({ x: d.x - 20, y: d.y, vx: -520 }));
    ctx.at(300, () => readout.setText('the oath: nothing lands for a second and a half'));
    ctx.at(700, () => { invulnUntil = 700 + 1500; immuneUntil = invulnUntil + 3000; rig(av)?.setDetermined(true); av.play('flex', undefined, 600); fx.determination(ctx.cx, ctx.cy); float(ctx, ctx.cx, ctx.cy - 60, 'DETERMINED', hex(MYTH.gold)); });
    fire(1000); fire(1500);
    ctx.at(2400, () => readout.setText('then three seconds immune to every stun, root and slow'));
    fire(2800);
    ctx.at(3400, () => readout.setText('R again with a shard: five more seconds, and 25% faster'));
    ctx.at(3900, () => { shards = 0; plus = true; immuneUntil += 5000; fx.ring(ctx.cx, ctx.cy, 14, 60, 500, MYTH.gold, 3, 10); float(ctx, ctx.cx, ctx.cy - 60, '+5s  +25% SPEED', hex(MYTH.gold)); });
    ctx.at(4600, () => { ctx.glideCaster({ to: { x: ctx.cx - 70, y: ctx.cy + 30 }, ms: 900, ease: 'out' }); });
    fire(5200);
    ctx.at(6000, () => { ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 900, ease: 'out' }); });
    ctx.at(7200, () => readout.setText(plus ? 'stuns and slows bounce off for the whole stretch' : ''));
    fire(7600);
    ctx.at(9100, () => { rig(av)?.setDetermined(false); });
  },
};

// ══ F — Beast of Myth ═════════════════════════════════════════════════

export const beastOfMyth: PreviewScript = {
  duration: 10000,
  scale: 0.75,
  caption: 'F — a portal behind you, a beast toward your cursor: it grabs and chews for 8 per half second until a wall. F again with a shard calls it home.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 240, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.haze), 11);
    let shards = 1;
    shardsOver(ctx, () => shards);
    const gg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ga = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const seed = Math.random() * 999;
    const portalX = ctx.cx - 70;
    const portalY = ctx.cy;
    let born = -1;
    let bx = portalX;
    let by = portalY;
    let dir = 1;
    let moving = false;
    let live = false;
    let caught = false;
    let nextBite = 0;
    let flipGate = 0;
    const trail: { x: number; y: number }[] = [];

    ctx.onFrame((delta, elapsed) => {
      gg.clear(); ga.clear();
      const t = elapsed / 1000;
      if (!live) return;
      const open = Math.min(1, (elapsed - born) / 300);
      paintPortal(gg, ctx.tint, portalX, portalY, 0, open, t, seed, 1);
      if (!moving) {
        const k = Math.min(1, (elapsed - born) / 450);
        paintBeast(ga, ctx.tint, [{ x: portalX + 20 * k, y: portalY }], 0, t, k, seed, 30 * (0.5 + 0.5 * k));
        return;
      }
      bx += dir * 260 * delta / 1000;
      const last = trail[0];
      if (!last || Math.abs(last.x - bx) >= 15) { trail.unshift({ x: bx, y: by }); if (trail.length > 11) trail.pop(); }
      if (!caught && Math.abs(d.x - bx) < 42) { caught = true; nextBite = elapsed + 500; fx.starSpray(d.x, d.y, 8, 30, 400, 10, MYTH.red); float(ctx, d.x, d.y - 40, 'CAUGHT', hex(MYTH.red)); }
      if (caught) {
        d.x = bx + dir * 26;
        if (elapsed >= nextBite) { nextBite = elapsed + 500; float(ctx, d.x, d.y - 32, '8', '#ffb3aa', 12); }
      }
      const c = ctx.casterAt();
      if (elapsed >= flipGate && Math.abs(c.x - bx) < 40) {
        flipGate = elapsed + 900;
        rig(av)?.flip(520);
        fx.flip(c.x, c.y);
        float(ctx, c.x, c.y - 60, 'FLIP  +20% SPEED', hex(MYTH.starBlue));
      }
      paintBeast(ga, ctx.tint, [{ x: bx, y: by }, ...trail].slice(0, 9), dir > 0 ? 0 : Math.PI, t, 1, seed);
      if (dir > 0 && bx >= ctx.w - 24) { live = false; fx.explosion(bx, by, 60, 9); if (caught) { caught = false; } }
      if (dir < 0 && bx <= portalX + 18) { live = false; fx.ring(portalX, portalY, 50, 6, 400, MYTH.iris, 3, 9); caught = false; }
    });

    ctx.at(300, () => readout.setText('the portal opens 70px behind you; the beast takes half a second to pour out'));
    ctx.at(700, () => { born = 700; live = true; trail.length = 0; bx = portalX; dir = 1; av.play('raise', Math.PI, 500); fx.ring(portalX, portalY, 6, 50, 500, MYTH.iris, 3, 9); });
    ctx.at(1150, () => { moving = true; });
    ctx.at(1300, () => readout.setText('it runs through you first: a flip, and 20% speed for 4 seconds'));
    ctx.at(2300, () => readout.setText('everyone it reaches is held in its jaws and bitten for 8 every half second'));
    ctx.at(3800, () => readout.setText('F again with a shard: it turns for home, dragging its catch back to the portal'));
    ctx.at(4300, () => { if (live) { shards = 0; dir = -1; fx.ring(bx, by, 10, 60, 420, MYTH.haze, 2.5, 10); float(ctx, bx, by - 50, 'COME HOME', hex(MYTH.haze)); } });
    ctx.at(5400, () => readout.setText('flip it again on the way past'));
    ctx.at(8600, () => { d.x = ctx.cx + 240; d.y = ctx.cy; moving = false; });
  },
};

// ══ Q — Final Destiny ═════════════════════════════════════════════════

export const finalDestiny: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Q — fifteen seconds in first person with five guns on the five keys. This is what the arena sees; the gun in the corner is what you see.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 200, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.gold), 11);
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    let gun: GunKind | null = null;
    let recoil = 0;
    ctx.onFrame((delta, elapsed) => {
      hud.clear();
      recoil = Math.max(0, recoil - delta / 160);
      if (!gun) return;
      // The HUD's gun model, scaled into the corner of the box.
      hud.fillStyle(ctx.tint(MYTH.void), 0.55);
      hud.fillRoundedRect(ctx.w - 190, ctx.h - 92, 184, 86, 6);
      hud.lineStyle(1, ctx.tint(MYTH.iris), 0.6);
      hud.strokeRoundedRect(ctx.w - 190, ctx.h - 92, 184, 86, 6);
      paintGun(hud, ctx.tint, gun, ctx.w - 60, ctx.h - 14, recoil, elapsed / 1000);
      star(hud, ctx.w - 120, ctx.h - 60, 3, ctx.tint(MYTH.star), 0.9, { points: 4 });
    });
    const arm = (at: number, k: GunKind, text: string, fire: () => void) => {
      ctx.at(at, () => { gun = k; rig(av)?.setGun(k); readout.setText(text); });
      ctx.at(at + 500, () => { recoil = 1; rig(av)?.recoil(); fire(); });
    };
    ctx.at(300, () => { rig(av)?.setHold('brace'); fx.ring(ctx.cx, ctx.cy, 10, 70, 600, MYTH.gold, 3, 10); fx.starSpray(ctx.cx, ctx.cy, 14, 60, 700, 10); float(ctx, ctx.cx, ctx.cy - 60, 'FINAL DESTINY', hex(MYTH.gold)); });
    arm(900, 'pistol', 'Click — Pistol: 8, and a stack of 5% vulnerability', () => { fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 8); fx.tracer(ctx.cx + 22, ctx.cy, d.x, d.y); float(ctx, d.x, d.y - 32, '8', '#ffb3aa', 12); });
    arm(2700, 'shotgun', 'E — Shotgun: seven pellets of 6, doubled by vulnerability', () => { fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 16); for (let i = 0; i < 7; i++) { const a = ctx.aim + (i / 6 - 0.5) * 0.49; fx.tracer(ctx.cx + 20, ctx.cy, ctx.cx + Math.cos(a) * 200, ctx.cy + Math.sin(a) * 200); } float(ctx, d.x, d.y - 32, '42 × 1.2', hex(MYTH.gold), 12); });
    arm(4500, 'launcher', 'R — Grenade Barrage: three × 14, stacking ×1.25 and ×1.5', () => { fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 10); for (let i = 0; i < 3; i++) ctx.scene.time.delayedCall(700 + i * 60, () => { const a = ctx.aim + (i - 1) * 0.35; fx.explosion(ctx.cx + Math.cos(a) * 230, ctx.cy + Math.sin(a) * 230, 72, 9); }); ctx.scene.time.delayedCall(800, () => float(ctx, d.x, d.y - 32, '14 + 17.5', hex(MYTH.gold), 12)); });
    arm(6300, 'rifle', 'F — Hunter Rifle: 26 through everyone on the line; 39 on a centre hit', () => { fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 12); fx.tracer(ctx.cx + 24, ctx.cy, ctx.w, ctx.cy); fx.headshot(d.x, d.y); float(ctx, d.x, d.y - 32, '39  HEADSHOT', hex(MYTH.gold), 12); });
    arm(8100, 'rocket', 'Q — Shadow Rocket: 30 in 150px, +20 direct, and a cloud', () => { fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 18); ctx.scene.time.delayedCall(900, () => { fx.explosion(d.x, d.y, 150, 10); float(ctx, d.x, d.y - 32, '50  DIRECT HIT', hex(MYTH.gold), 12); }); });
    ctx.at(10400, () => { gun = null; rig(av)?.setGun(null); rig(av)?.setHold(null); });
  },
};

// ══ Final Destiny's guns ═══════════════════════════════════════════════

function gunLoop(kind: GunKind, caption: string, fire: (ctx: PreviewCtx, fx: MythFx, av: MythAvatar | null, d: Dummy, n: number) => void, every: number, duration: number): PreviewScript {
  return {
    duration,
    scale: 0.9,
    caption,
    run(ctx) {
      const fx = fxOf(ctx);
      const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
      av.setFacing(ctx.aim);
      rig(av)?.setGun(kind);
      rig(av)?.setHold('brace');
      const d: Dummy = { x: ctx.cx + 190, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
      dummyAt(ctx, d);
      let n = 0;
      for (let at = 500; at < duration - 600; at += every) {
        ctx.at(at, () => { rig(av)?.recoil(); fire(ctx, fx, rig(av), d, n++); });
      }
    },
  };
}

export const pistol: PreviewScript = gunLoop('pistol', 'Click (first person) — 8 damage, and every hit is 5% more vulnerability for 5s, up to four stacks.', (ctx, fx, _av, d, n) => {
  fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 8);
  fx.tracer(ctx.cx + 22, ctx.cy, d.x, d.y);
  const stacks = Math.min(4, n + 1);
  float(ctx, d.x, d.y - 32, `8   EXPOSED ×${stacks}`, hex(MYTH.gold), 12);
}, 900, 6000);

export const shotgun: PreviewScript = gunLoop('shotgun', 'E (first person) — seven pellets of 6 out to 200px; a 15% vulnerable target takes 30% more.', (ctx, fx, _av, d, n) => {
  fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 16);
  for (let i = 0; i < 7; i++) {
    const a = ctx.aim + (i / 6 - 0.5) * 0.49;
    fx.tracer(ctx.cx + 20, ctx.cy, ctx.cx + Math.cos(a) * 200, ctx.cy + Math.sin(a) * 200);
  }
  const vuln = [0, 0.1, 0.2][n % 3];
  float(ctx, d.x, d.y - 32, vuln > 0 ? `${Math.round(42 * (1 + 2 * vuln))}  (${Math.round(vuln * 100)}% vuln ×${(1 + 2 * vuln).toFixed(1)})` : '42  point blank', hex(MYTH.gold), 12);
}, 2400, 7600);

export const grenades: PreviewScript = gunLoop('launcher', 'R (first person) — three grenades, 14 each in 72px; a body under two takes ×1.25 from the second, ×1.5 from a third.', (ctx, fx, _av, d) => {
  fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 10);
  for (let i = 0; i < 3; i++) {
    ctx.scene.time.delayedCall(700 + i * 60, () => {
      const a = ctx.aim + (i - 1) * 0.35;
      fx.explosion(ctx.cx + Math.cos(a) * 230, ctx.cy + Math.sin(a) * 230, 72, 9);
    });
  }
  ctx.scene.time.delayedCall(760, () => float(ctx, d.x, d.y - 32, '14', '#ffb3aa', 12));
  ctx.scene.time.delayedCall(840, () => float(ctx, d.x + 30, d.y - 44, '17.5  ×1.25', hex(MYTH.gold), 12));
}, 3600, 7600);

export const hunterRifle: PreviewScript = gunLoop('rifle', 'F (first person) — one piercing round for 26 to everyone on the line; within 9px of the centre it is a 39 headshot.', (ctx, fx, _av, d, n) => {
  fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 12);
  const head = n % 2 === 1;
  fx.tracer(ctx.cx + 24, ctx.cy + (head ? 0 : 11), ctx.w, ctx.cy + (head ? 0 : 11));
  if (head) { fx.headshot(d.x, d.y); float(ctx, d.x, d.y - 32, '39  HEADSHOT', hex(MYTH.gold), 12); }
  else float(ctx, d.x, d.y - 32, '26', '#ffb3aa', 12);
}, 2400, 7600);

export const shadowRocket: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Q (first person) — a 190 px/s rocket: 30 in 150px, +20 to a direct hit, and a 110px cloud doing 5 a second for 5s.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    rig(av)?.setGun('rocket');
    rig(av)?.setHold('brace');
    const d: Dummy = { x: ctx.cx + 260, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const gg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let rocket: { x: number; y: number } | null = null;
    let cloud: { x: number; y: number; until: number } | null = null;
    let nextTick = 0;
    const seed = Math.random() * 999;
    ctx.onFrame((delta, elapsed) => {
      g.clear(); gg.clear();
      const t = elapsed / 1000;
      if (rocket) {
        rocket.x += 190 * delta / 1000;
        for (let i = 1; i <= 4; i++) star(g, rocket.x - 16 * i, rocket.y, 4 * (1 - i / 4) + 1, ctx.tint(MYTH.haze), 0.8 - i * 0.15, { points: 4, rot: t * 5 + i });
        voidDisc(g, ctx.tint, rocket.x, rocket.y, 11, 1, seed, t, 5);
        star(g, rocket.x + 10, rocket.y, 6, ctx.tint(MYTH.red), 0.95, { points: 4 });
        if (rocket.x >= d.x - 22) {
          fx.explosion(d.x, d.y, 150, 10);
          float(ctx, d.x, d.y - 36, '50  DIRECT HIT', hex(MYTH.gold), 13);
          cloud = { x: d.x, y: d.y, until: elapsed + 5000 };
          nextTick = elapsed + 500;
          rocket = null;
        }
      }
      if (cloud) {
        if (elapsed >= cloud.until) cloud = null;
        else {
          paintCloud(gg, ctx.tint, cloud.x, cloud.y, 110, t, seed, 0.85 * Phaser.Math.Clamp((cloud.until - elapsed) / 800, 0, 1));
          if (elapsed >= nextTick) { nextTick = elapsed + 500; float(ctx, d.x, d.y - 30, '2.5', '#ffb3aa', 10); }
        }
      }
    });
    ctx.at(600, () => { rig(av)?.recoil(); fx.muzzle(ctx.cx, ctx.cy, ctx.aim, 18); rocket = { x: ctx.cx + 26, y: ctx.cy }; });
  },
};

// ══ Passives ═══════════════════════════════════════════════════════════

export const theCrowd: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Passive — the crowd. 45 damage in four seconds and it cheers and throws a shard; 50 taken and it jeers: 10% more damage taken.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 150, y: ctx.cy, alive: true, stunUntil: 0, hp: 100 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.haze), 11);
    let shards = 0;
    shardsOver(ctx, () => shards);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let cheerUntil = 0;
    let booUntil = 0;
    let dealt = 0;
    const seats: { x: number; y: number; s: number; seed: number }[] = [];
    for (let x = 12; x < ctx.w - 8; x += 21) { seats.push({ x, y: 10, s: 6.5, seed: x }); seats.push({ x: x + 10, y: ctx.h - 8, s: 6.5, seed: x + 7 }); }
    ctx.onFrame((_delta, elapsed) => {
      g.clear();
      const t = elapsed / 1000;
      const cheer = elapsed < cheerUntil;
      const boo = elapsed < booUntil;
      for (const sp of seats) {
        const j = jitter(23, sp.seed);
        let bounce = 0.08 + 0.06 * Math.sin(t * 1.3 + j * 6);
        let arms = 0;
        let x = sp.x;
        let color = jitter(17, sp.seed) > 0.55 ? MYTH.crowdLit : MYTH.crowdDark;
        let lit = 0;
        if (cheer) { bounce = Math.max(0, Math.sin(t * 9 + j * 6.28)); arms = 1; lit = 0.5 + 0.5 * Math.sin(t * 12 + j * 9); }
        else if (boo) { x += Math.sin(t * 18 + j * 6) * 1.6; color = 0x4a1c2a; arms = 0.15; }
        crowdFigure(g, x, sp.y, sp.s, color, lit, bounce, arms, 0.95);
      }
      g.fillStyle(ctx.tint(MYTH.void), 0.7);
      g.fillRoundedRect(ctx.w / 2 - 70, 24, 140, 8, 3);
      g.fillStyle(ctx.tint(MYTH.shard), 1);
      g.fillRoundedRect(ctx.w / 2 - 70, 24, 140 * Math.min(1, dealt / 45), 8, 3);
    });
    const lash = (at: number, dmg: number) => ctx.at(at, () => {
      av.play('sweep', ctx.aim, 280);
      fx.tipHit(d.x, d.y);
      float(ctx, d.x, d.y - 32, `${dmg}`, '#ffb3aa', 12);
      dealt += dmg;
      if (dealt >= 45) { dealt = 0; cheerUntil = at + 2600; shards = Math.min(3, shards + 1); fx.shardGain(ctx.cx, ctx.cy); float(ctx, ctx.cx, ctx.cy - 66, 'ECHO SHARD', hex(MYTH.shard)); }
    });
    ctx.at(300, () => readout.setText('the meter: 45 damage dealt inside a rolling four seconds'));
    lash(800, 24); lash(1500, 12); lash(2200, 12);
    ctx.at(2700, () => readout.setText('the crowd is on its feet — and throws you a shard'));
    ctx.at(5000, () => readout.setText('take 50 in four seconds instead and they turn on you'));
    ctx.at(5600, () => { booUntil = 5600 + 2600; float(ctx, ctx.cx, ctx.cy - 50, '-30', '#ff8866', 12); });
    ctx.at(6200, () => { float(ctx, ctx.cx, ctx.cy - 50, '-24', '#ff8866', 12); float(ctx, ctx.cx, ctx.cy - 70, 'JEERED  +10% TAKEN', hex(MYTH.red)); });
  },
};

export const echoShards: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Passive — Echo Shards, three at most. Right-click, E, R and F each spend one for the ability\'s second act, as often as the shards last.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new MythAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(MYTH.shard), 11);
    let shards = 3;
    shardsOver(ctx, () => shards);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const rows: { key: string; what: string; x: number }[] = [
      { key: 'RIGHT-CLICK', what: 'phantom maces, 8s', x: ctx.w * 0.18 },
      { key: 'E AGAIN', what: 'true-damage dash, 32', x: ctx.w * 0.4 },
      { key: 'R AGAIN', what: '+5s immunity, +25% speed', x: ctx.w * 0.62 },
      { key: 'F AGAIN', what: 'beast comes home', x: ctx.w * 0.84 },
    ];
    const labels = rows.map((r) => {
      const a = label(ctx, r.x, ctx.h - 34, hex(MYTH.gold), 10);
      a.setText(r.key);
      const b = label(ctx, r.x, ctx.h - 20, hex(MYTH.haze), 9);
      b.setText(r.what);
      return a;
    });
    ctx.onFrame((_d, elapsed) => {
      g.clear();
      rows.forEach((r, i) => {
        paintShard(g, ctx.tint, r.x, ctx.h - 54, 7, elapsed / 500 + i, 0.9);
      });
    });
    const spend = (at: number, i: number, text: string) => ctx.at(at, () => {
      if (shards <= 0) return;
      shards--;
      labels[i].setColor(hex(MYTH.star));
      fx.starSpray(ctx.cx, ctx.cy - 40, 6, 24, 380, 12, MYTH.shard);
      float(ctx, ctx.cx, ctx.cy - 66, text, hex(MYTH.shard));
      readout.setText(`${shards} left — a recast never touches the cooldown`);
    });
    ctx.at(300, () => readout.setText('three shards, held over your head'));
    spend(1200, 0, 'PHANTOM MACES');
    spend(2600, 1, 'TRUE DASH');
    spend(4000, 2, '+5s  +25% SPEED');
    ctx.at(5200, () => readout.setText('none left: the fourth press is refused, the base ability is untouched'));
    ctx.at(5600, () => { labels[3].setColor(hex(MYTH.red)); float(ctx, ctx.cx, ctx.cy - 66, 'NO ECHO SHARD', hex(MYTH.haze)); });
  },
};
