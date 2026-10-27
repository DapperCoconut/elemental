import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  INK, InkAvatar, InkFx, anvil, bananaPeel, bananaShot, dizzyStars, dropShadow, foamWalls, glove, inkBullet,
  slipMarks, smokeGhost,
} from '../../../elements/kits/InkVisuals';

/**
 * Ink's showcases.
 *
 * Every loop drives the real rig and the kit's own painters and `InkFx` — bullets, peels, the
 * anvil, the foam — at the kit's speeds. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const BULLET_SPEED = 640;
const HAND_SPEED = 520;
const SKED_SPEED = 560;
const MIMIC_SPEED = 55;
const BANANA_SPEED = 470;
const ANVIL_FALL_MS = 420;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): InkFx {
  return ctx.capture(() => new InkFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The toon's rig, or null when a skin has replaced the character. */
function toon(av: unknown): InkAvatar | null {
  return av instanceof InkAvatar ? av : null;
}

function label(ctx: PreviewCtx, x: number, y: number, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: '#f5f2e9',
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: '#111111', stroke: '#ffffff', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

interface Dummy {
  x: number;
  y: number;
  /** Where it is looking, radians. */
  look: number;
  flat: boolean;
  slip: boolean;
  /** A loop's one-shot contact hit has landed. */
  hit?: boolean;
}

/** A stand-in enemy that can be moved, turned, flattened and set slipping. */
function dummy(ctx: PreviewCtx, at: { x: number; y: number }, look = Math.PI): Dummy {
  const d: Dummy = { x: at.x, y: at.y, look, flat: false, slip: false };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, e) => {
    g.clear();
    over.clear();
    const sx = d.flat ? 1.5 : 1;
    const sy = d.flat ? 0.42 : 1;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(d.x, d.y + 16, 40 * sx, 10);
    g.fillStyle(0x2b2f3d, 1); g.fillEllipse(d.x, d.y + (d.flat ? 9 : 0), 34 * sx, 34 * sy);
    g.fillStyle(0x3c4254, 1); g.fillEllipse(d.x, d.y + (d.flat ? 9 : 0), 26 * sx, 26 * sy);
    if (!d.flat) {
      g.fillStyle(0x8e97ad, 0.9);
      for (const side of [-1, 1]) g.fillCircle(d.x + side * 5 + Math.cos(d.look) * 3, d.y - 4 + Math.sin(d.look) * 2, 3.2);
    }
    if (d.flat) dizzyStars(over, ctx.tint, d.x, d.y, e / 1000, 1);
    if (d.slip) slipMarks(over, ctx.tint, d.x, d.y, e / 1000, 1);
  });
  return d;
}

/** Fly an ink bullet from `from` to the dummy, splat and float the damage. */
function shoot(ctx: PreviewCtx, fx: InkFx, from: { x: number; y: number }, to: Dummy, dmg = 3, speed = BULLET_SPEED): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  let x = from.x;
  let y = from.y;
  let live = true;
  fx.muzzle(x, y, ang);
  ctx.onFrame((dt) => {
    g.clear();
    if (!live) return;
    x += Math.cos(ang) * speed * dt / 1000;
    y += Math.sin(ang) * speed * dt / 1000;
    if (Phaser.Math.Distance.Between(x, y, to.x, to.y) < 18) {
      live = false;
      fx.splat(x, y, 6);
      float(ctx, to.x, to.y - 30, `-${dmg}`);
      return;
    }
    inkBullet(g, ctx.tint, x, y, ang, 3.5, 1);
  });
}

// ══ Click — Finger Guns ════════════════════════════════════════════════

function gunsRun(ctx: PreviewCtx, cannon: boolean): void {
  const fx = fxOf(ctx);
  const av = toon(ctx.useAvatar(() => new InkAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const d = dummy(ctx, { x: ctx.tx, y: ctx.ty });
  const readout = label(ctx, ctx.w * 0.5, 14);
  const shots = cannon ? 3 : 9;
  for (let i = 0; i < shots; i++) {
    ctx.at(300 + i * 150, () => {
      av?.shoot();
      const c = ctx.casterAt();
      shoot(ctx, fx, { x: c.x + 34, y: c.y }, d);
      readout.setText(cannon ? `shot ${48 + i} of 50` : 'every click is a shot — no cooldown');
    });
  }
  if (!cannon) return;
  ctx.at(300 + shots * 150 + 150, () => {
    const c = ctx.casterAt();
    av?.setGunHand(false);
    readout.setText('the 50th: the whole hand goes');
    fx.word(c.x + 34, c.y - 24, 'YOINK!', 12, 0);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let x = c.x + 34;
    let live = true;
    ctx.onFrame((dt) => {
      g.clear();
      if (!live) return;
      x += HAND_SPEED * dt / 1000;
      if (x >= d.x - 22) {
        live = false;
        fx.word(d.x, d.y - 36, 'BLAM BLAM BLAM!', 13, 26);
        float(ctx, d.x, d.y - 24, '-10');
        for (let i = 0; i < 8; i++) {
          const a = Math.PI + (i - 3.5) * 0.32;
          const from = { x: d.x + Math.cos(a) * 30, y: d.y + Math.sin(a) * 30 };
          shoot(ctx, fx, from, { ...d, x: d.x + Math.cos(a) * 4, y: d.y + Math.sin(a) * 4 }, 3, 520);
        }
        return;
      }
      glove(g, ctx.tint, x, c.y, 0, 'gun', 1.4, 1);
    });
  });
  ctx.at(300 + shots * 150 + 1900, () => {
    av?.setGunHand(true);
    const c = ctx.casterAt();
    fx.word(c.x + 30, c.y - 30, 'POP!', 10, 0);
    readout.setText('a new hand pops in a second after it lands');
  });
}

export const fingerGuns: PreviewScript = {
  duration: 3400,
  scale: 0.9,
  caption: 'Click — a finger gun: 3 damage a shot, no cooldown, one shot per click. Spam it',
  run(ctx) { gunsRun(ctx, false); },
};

export const fingerGunsUpgraded: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Click+ Hand Cannon — every 50th shot throws the hand: 10 damage, and it bursts into 8 bullets on the target',
  run(ctx) { gunsRun(ctx, true); },
};

// ══ E — Oooo Banana ════════════════════════════════════════════════════

function bananaRun(ctx: PreviewCtx, mimic: boolean): void {
  const fx = fxOf(ctx);
  const av = toon(ctx.useAvatar(() => new InkAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 14);
  const peel = { x: 0, y: 0, on: false, legs: 0, walk: 0 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const d = dummy(ctx, mimic ? { x: ctx.cx + 260, y: ctx.cy } : { x: ctx.cx - 200, y: ctx.cy }, mimic ? 0 : 0);
  ctx.at(300, () => {
    const c = ctx.casterAt();
    av?.play('flex');
    av?.pop();
    peel.x = c.x - 30;
    peel.y = c.y;
    peel.on = true;
    fx.peelDrop(peel.x, peel.y);
    readout.setText(mimic ? 'Mimic: it creeps up on whoever is looking away' : 'a peel behind you — it stays until someone steps on it');
  });
  if (!mimic) {
    ctx.at(700, () => ctx.glideCaster({ to: { x: ctx.cx + 220, y: ctx.cy }, ms: 900, ease: 'out' }));
    // The dummy chases — straight over the peel.
    ctx.onFrame((dt, e) => {
      if (e > 900 && e < 2600 && peel.on) d.x += 130 * dt / 1000;
      if (peel.on && Math.abs(d.x - peel.x) < 14) {
        peel.on = false;
        fx.slip(peel.x, peel.y);
        const a = -0.9;
        const from = { x: d.x, y: d.y };
        const t0 = e;
        d.slip = true;
        ctx.onFrame((_dt2, e2) => {
          const u = Math.min(1, (e2 - t0) / 420);
          d.x = from.x + Math.cos(a) * 180 * u;
          d.y = from.y + Math.sin(a) * 60 * u;
        });
        readout.setText('flung, stunned for 1s, then slippery for 5s');
      }
    });
  } else {
    // The dummy looks away (right); the peel walks. At 3s it turns round and the peel lies still.
    ctx.at(2800, () => { d.look = Math.PI; readout.setText('looked at, it lies flat again'); });
  }
  ctx.onFrame((dt, e) => {
    g.clear();
    if (!peel.on) return;
    if (mimic) {
      const watched = Math.abs(Phaser.Math.Angle.Wrap(d.look - Math.atan2(peel.y - d.y, peel.x - d.x))) < Math.PI / 2;
      peel.legs = Phaser.Math.Clamp(peel.legs + (watched ? -1 : 1) * dt / 280, 0, 1);
      if (!watched && peel.legs > 0.6 && e > 600) {
        peel.x += MIMIC_SPEED * 2.2 * dt / 1000;
        peel.walk += dt / 1000 * 14;
      }
    }
    const look = Math.atan2(d.y - peel.y, d.x - peel.x);
    bananaPeel(g, ctx.tint, peel.x, peel.y, 0.4, e / 1000, 1, peel.legs > 0.01 ? { legs: peel.legs, walk: peel.walk, look } : undefined);
  });
}

export const banana: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'E — a banana peel behind you. Whoever steps on it is flung, stunned for 1s, then slips about for 5s',
  run(ctx) { bananaRun(ctx, false); },
};

export const bananaUpgraded: PreviewScript = {
  duration: 4800,
  scale: 0.9,
  caption: 'E+ Mimic — your peels grow legs and creep toward an enemy while they look the other way',
  run(ctx) { bananaRun(ctx, true); },
};

// ══ R — Skedaddle ══════════════════════════════════════════════════════

function skedRun(ctx: PreviewCtx, vroom: boolean): void {
  const fx = fxOf(ctx);
  const av = toon(ctx.useAvatar(() => new InkAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(-0.5);
  const readout = label(ctx, ctx.w * 0.5, 14);
  const d = dummy(ctx, { x: ctx.tx, y: ctx.ty });
  ctx.at(200, () => { av?.setRunning(true); av?.setHold('ride'); readout.setText('hold R: run on the spot'); });
  ctx.onFrame((_dt, e) => {
    if (e > 200 && e < 1700 && Math.random() < 0.35) { const c = ctx.casterAt(); fx.runDust(c.x, c.y, 0); }
  });
  const start = { x: ctx.cx, y: ctx.cy };
  const top = 30;
  const bottom = ctx.h - 30;
  const pts = [
    { x: ctx.cx + 160, y: top },
    { x: ctx.cx + 330, y: bottom },
    { x: ctx.tx + 40, y: top + 40 },
    { x: ctx.tx - 120, y: bottom },
  ];
  ctx.at(1700, () => {
    av?.setRunning(false);
    av?.setHold(null);
    fx.word(start.x, start.y - 34, 'ZOOM!', 14, 22);
    fx.dust(start.x, start.y + 14, 6, 26);
    readout.setText('let go: bounce off the walls for as long as you ran — 10 to everyone you hit');
    if (vroom) {
      const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const born = ctx.scene.time.now;
      let next = 500;
      ctx.onFrame((_dt, e) => {
        sg.clear();
        const age = ctx.scene.time.now - born;
        if (age > 3000) return;
        const aim = Math.atan2(d.y - start.y, d.x - start.x);
        smokeGhost(sg, ctx.tint, start.x, start.y, e / 1000, Math.max(0, 1 - (age / 3000) ** 2) * 0.9, aim);
        if (age >= next) {
          next += 500;
          shoot(ctx, fx, { x: start.x + Math.cos(aim) * 30, y: start.y + Math.sin(aim) * 30 }, d);
        }
      });
    }
    let i = 0;
    const leg = (): void => {
      if (i >= pts.length) { fx.dust(ctx.casterAt().x, ctx.casterAt().y + 14, 5, 20); return; }
      const from = ctx.casterAt();
      const to = pts[i++];
      const ms = (Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) / SKED_SPEED) * 1000;
      ctx.glideCaster({ to, ms, ease: 'linear', onDone: () => {
        fx.wallBoing(to.x, to.y, 0, to.y < ctx.h / 2 ? -1 : 1);
        av?.setSpin(2);
        leg();
      } });
    };
    leg();
  });
  ctx.onFrame(() => {
    const c = ctx.casterAt();
    av?.setSpin(0.2);
    if (Phaser.Math.Distance.Between(c.x, c.y, d.x, d.y) < 40 && !d.hit) {
      d.hit = true;
      fx.word(d.x, d.y - 26, 'BONK!', 13, 18);
      float(ctx, d.x, d.y - 40, '-10');
    }
  });
}

export const skedaddle: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'R — hold to run on the spot (up to 5s), let go to bounce round the arena like a DVD logo for that long. 10 per bonk',
  run(ctx) { skedRun(ctx, false); },
};

export const skedaddleUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'R+ Vroom — a smoke copy stays where you set off, firing a finger-gun bullet every 0.5s for 3s',
  run(ctx) { skedRun(ctx, true); },
};

// ══ F — Ol' 6 Ton ═════════════════════════════════════════════════════

function anvilRun(ctx: PreviewCtx, doom: boolean): void {
  const fx = fxOf(ctx);
  const av = toon(ctx.useAvatar(() => new InkAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 14);
  const d = dummy(ctx, { x: ctx.cx + 220, y: ctx.cy });
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9.2));
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const PULL = 1800; // the real haul is 3s; the loop shows it at speed
  let phase: 'pull' | 'held' | 'fall' | 'rest' | 'none' = 'none';
  let t0 = 0;
  const drop = { x: d.x, y: d.y };
  const peels = doom ? [0, 1, 2, 3, 4].map((i) => ({ x: ctx.cx + 300 + (i % 3) * 40, y: ctx.cy - 50 + i * 24, on: true })) : [];
  ctx.at(300, () => {
    phase = 'pull'; t0 = ctx.scene.time.now;
    av?.setGunHand(false);
    av?.setHold('draw', ctx.aim + Math.PI);
    readout.setText('F: haul the anvil out of hammerspace (3s)');
  });
  ctx.at(300 + PULL, () => {
    phase = 'held'; t0 = ctx.scene.time.now;
    av?.setHold('brace');
    const c = ctx.casterAt();
    fx.word(c.x, c.y - 74, 'TA-DA!', 12, 0);
    readout.setText('overhead for up to 3s — click to drop it');
  });
  ctx.at(300 + PULL + 900, () => {
    phase = 'fall'; t0 = ctx.scene.time.now;
    av?.setHold(null);
    av?.play('slam', ctx.aim);
    av?.setGunHand(true);
  });
  ctx.at(300 + PULL + 900 + ANVIL_FALL_MS, () => {
    fx.anvilImpact(drop.x, drop.y, 60);
    fx.word(drop.x, drop.y - 44, 'WHAM!', 18, 30);
    float(ctx, drop.x, drop.y - 26, '-30');
    d.flat = true;
    phase = doom ? 'rest' : 'none';
    readout.setText(doom ? 'Doombringer: it stays 3s, and it is hungry' : 'flattened 4s: half speed, ability keys shuffled');
  });
  if (doom) {
    ctx.at(300 + PULL + 900 + ANVIL_FALL_MS + 300, () => ctx.glideCaster({ to: { x: drop.x - 60, y: drop.y }, ms: 700, ease: 'out', onDone: () => {
      const it = ctx.adopt(ctx.scene.add.text(drop.x, drop.y - 50, 'it is hungry', {
        fontSize: '12px', fontFamily: 'Georgia', fontStyle: 'italic', color: '#111111', stroke: '#ffffff', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(19));
      ctx.scene.tweens.add({ targets: it, alpha: 0, delay: 900, duration: 400 });
    } }));
    ctx.at(300 + PULL + 900 + ANVIL_FALL_MS + 1500, () => {
      for (const p of peels) { p.on = false; fx.dust(p.x, p.y, 3, 10); }
      fx.word(drop.x, drop.y - 30, 'CHOMP', 14, 22);
      const c = ctx.casterAt();
      av?.play('raise', undefined, 1600);
      av?.setDoombringer(true);
      fx.itemGet(c.x, c.y - 50, 1600);
      const banner = ctx.adopt(ctx.scene.add.text(c.x, c.y - 80, 'DOOMBRINGER GET!', {
        fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#111111', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(19));
      ctx.scene.tweens.add({ targets: banner, alpha: 0, delay: 1300, duration: 400 });
      phase = 'none';
      readout.setText('five peels out: it eats them, and your click is a banana gun');
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(300 + PULL + 900 + ANVIL_FALL_MS + 3300 + i * 220, () => {
        const c = ctx.casterAt();
        av?.shoot();
        const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
        let x = c.x + 34;
        const y = c.y - 30 + i * 30;
        let spin = 0;
        let landed = false;
        ctx.onFrame((dt, e) => {
          bg.clear();
          if (landed) { bananaPeel(bg, ctx.tint, x, y, i, e / 1000, 1); return; }
          x += BANANA_SPEED * dt / 1000;
          spin += dt * 0.02;
          if (x > c.x + 34 + 260) { landed = true; fx.peelDrop(x, y); }
          bananaShot(bg, ctx.tint, x, y, spin, 1);
        });
      });
    }
  }
  ctx.onFrame((_dt, e) => {
    g.clear();
    ground.clear();
    for (const p of peels) if (p.on) bananaPeel(ground, ctx.tint, p.x, p.y, p.x * 0.1, e / 1000, 1);
    const c = ctx.casterAt();
    const now = ctx.scene.time.now;
    if (phase === 'pull') {
      const u = Phaser.Math.Clamp((now - t0) / PULL, 0, 1);
      const k = u * u * (3 - 2 * u);
      anvil(g, ctx.tint, c.x - 26 * (1 - k), c.y - 52 * k, 0.35 + 0.65 * k, 1);
    } else if (phase === 'held') {
      anvil(g, ctx.tint, c.x, c.y - 54, 1, 1);
      ground.lineStyle(2, ctx.tint(INK.ink), 0.55);
      ground.strokeEllipse(drop.x, drop.y + 6, 120, 48);
    } else if (phase === 'fall') {
      const u = Phaser.Math.Clamp((now - t0) / ANVIL_FALL_MS, 0, 1);
      dropShadow(ground, ctx.tint, drop.x, drop.y + 16, 30 + 50 * u, 0.4 + 0.6 * u);
      anvil(g, ctx.tint, drop.x, drop.y - (1 - u * u) * 240, 1, 1);
    } else if (phase === 'rest') {
      dropShadow(ground, ctx.tint, drop.x, drop.y + 16, 66, 1);
      anvil(ground, ctx.tint, drop.x, drop.y, 1, 1, Math.sin(e / 300) * 0.4);
    }
  });
}

export const anvilDrop: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: "F — 3s to haul the anvil out, up to 3s overhead. Click: 30 damage and flattened for 4s. Hold too long and it lands on you",
  run(ctx) { anvilRun(ctx, false); },
};

export const anvilDropUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.85,
  caption: 'F+ Doombringer — the anvil stays, hungry. Reach it with five peels out and it hands you a banana gun for the rest of the match',
  run(ctx) { anvilRun(ctx, true); },
};

// ══ Q — Foux World ═════════════════════════════════════════════════════

function fouxRun(ctx: PreviewCtx, fourth: boolean): void {
  const fx = fxOf(ctx);
  const av = toon(ctx.useAvatar(() => new InkAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  const readout = label(ctx, ctx.w * 0.5, 14);
  const wallX = ctx.cx + 230;
  const set = new Phaser.Geom.Rectangle(-200, 34, wallX + 200, ctx.h - 68);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(0.5));
  const d = dummy(ctx, { x: ctx.cx + 80, y: ctx.cy + 20 }, 0);
  let open = false;
  ctx.at(300, () => {
    open = true;
    const c = ctx.casterAt();
    fx.iris(c.x, c.y, false);
    fx.word(c.x, c.y - 46, 'FOUX WORLD!', 16, 30);
    av?.play('raise');
    readout.setText(fourth ? 'Fourth Wall: the tray comes off and is thrown at the cursor' : 'the camera pulls back: the walls are foam, and the studio is out there');
  });
  ctx.onFrame((_dt, e) => {
    g.clear();
    if (!open) return;
    g.fillStyle(ctx.tint(INK.desk), 1);
    g.fillRect(wallX, 0, ctx.w - wallX, ctx.h);
    foamWalls(g, ctx.tint, set, 34, e / 1000, 1);
  });
  if (!fourth) {
    ctx.at(1100, () => ctx.glideCaster({ to: { x: wallX + 160, y: ctx.cy }, ms: 1300, ease: 'linear' }));
    let squished = false;
    ctx.onFrame((dt, e) => {
      if (e > 1500 && e < 3600) d.x += 120 * dt / 1000;
      if (!squished && d.x > wallX - 17) {
        squished = true;
        fx.word(d.x, d.y - 34, 'SQUISH!', 12, 0);
        float(ctx, d.x, d.y - 24, '-8');
        readout.setText('enemies take 8 going into the foam, and 16 a second inside it');
        for (let i = 1; i <= 2; i++) ctx.at(e + i * 250, () => float(ctx, d.x, d.y - 24, '-4'));
      }
    });
    ctx.at(4300, () => {
      readout.setText('after 10s everyone outside is pulled back in');
      const c = ctx.casterAt();
      fx.yank(c.x, c.y, wallX - 60, c.y);
      ctx.glideCaster({ to: { x: wallX - 60, y: ctx.cy }, ms: 200, ease: 'out' });
    });
    return;
  }
  const cg = ctx.adopt(ctx.scene.add.graphics().setDepth(9.2));
  const keys = ['LMB', 'E', 'R', 'F', 'Q'];
  const cards: { k: number; start: number; label: Phaser.GameObjects.Text }[] = [];
  keys.forEach((k, i) => ctx.at(700 + i * 350, () => {
    cards.push({
      k: i, start: ctx.scene.time.now,
      label: ctx.adopt(ctx.scene.add.text(0, 0, k, { fontSize: '13px', fontFamily: 'Arial Black', color: '#111111' }).setOrigin(0.5).setDepth(19.1)),
    });
  }));
  ctx.onFrame(() => {
    cg.clear();
    const now = ctx.scene.time.now;
    for (const c of [...cards]) {
      const u = (now - c.start) / 650;
      const x0 = ctx.w * 0.3 + c.k * 52;
      const y0 = ctx.h - 14;
      if (u >= 1) {
        cards.splice(cards.indexOf(c), 1);
        c.label.destroy();
        fx.cardBlast(d.x, d.y, 55);
        fx.word(d.x, d.y - 30, 'KA-BLAM!', 13, 0);
        float(ctx, d.x, d.y - 20, '-8');
        continue;
      }
      const x = x0 + (d.x - x0) * u;
      const y = y0 + (d.y - y0) * u - Math.sin(u * Math.PI) * 60;
      const rot = u * 7;
      const cs = Math.cos(rot);
      const sn = Math.sin(rot);
      const P = (px: number, py: number) => new Phaser.Math.Vector2(x + px * cs - py * sn, y + px * sn + py * cs);
      const pts = [P(-23, -15), P(23, -15), P(23, 15), P(-23, 15)];
      cg.fillStyle(ctx.tint(INK.white), 1);
      cg.fillPoints(pts, true);
      cg.lineStyle(2.5, ctx.tint(INK.ink), 1);
      cg.strokePoints(pts, true);
      c.label.setPosition(x, y).setRotation(rot);
    }
  });
}

export const fouxWorld: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Q — 10s: the arena is a set and its walls are foam. Walk out into the studio; enemies who follow take 8, then 16 a second in the foam',
  run(ctx) { fouxRun(ctx, false); },
};

export const fouxWorldUpgraded: PreviewScript = {
  duration: 4000,
  scale: 0.9,
  caption: 'Q+ Fourth Wall — your five ability cards fly off the tray and are thrown at the cursor: 8 damage each within 55px',
  run(ctx) { fouxRun(ctx, true); },
};
