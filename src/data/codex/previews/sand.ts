import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  TIME, TimeFx, TimeAvatar, TimeDial, TimeTones,
  NOON_TONES, FROZEN_TONES, HEAT_TONES, MINT_TONES,
} from '../../../elements/kits/TimeVisuals';

/**
 * Time's showcases.
 *
 * Everything Time puts in the world is a clock face — the puddles are sundials, the auras are
 * bezels with a hand counting the effect down, the bomb is a pocket watch — and all of it is
 * painted by `TimeFx`/`TimeDial` statics that the kit repaints every frame from data it owns.
 * These scripts drive the same statics with the same numbers, so a retune of `drawDial` or
 * `drawBomb` lands here the same day.
 *
 * Two containment rules the harness cannot cover for us:
 *   - `ctx.at` and `ctx.onFrame` callbacks run *outside* the capture window, so anything that
 *     builds a display object in one (a `TimeDial`, a raw Text) has to go through `ctx.capture`
 *     or `ctx.adopt` by hand. `TimeFx` instances are safe — their sink is sticky.
 *   - `TimeDial.update` spawns a shed clock hand every 620ms through a fresh `TimeFx`, so its
 *     per-frame call is wrapped in `ctx.capture` too.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(
  ctx: PreviewCtx, opts?: { noDummy?: boolean },
): { fx: TimeFx; av: BaseAvatar; tv: TimeAvatar | null } {
  const fx = ctx.capture(() => new TimeFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new TimeAvatar(ctx.scene, ctx.tint, NOON_TONES));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  // A skin replaces the rig outright, and that one has no hat and no mode tell.
  return { fx, av, tv: av instanceof TimeAvatar ? av : null };
}

/** A mark that something can be dragged around by. */
interface Mark { x: number; y: number }

/** The same neutral stand-in `addDummy` draws, but at a position the script can move. */
function movingDummy(ctx: PreviewCtx, m: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(m.x - 5, m.y - 4, 3.2);
    g.fillCircle(m.x + 5, m.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(m.x - 5.6, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4, m.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/** A persistent readout that a script rewrites — status chips, ammo counts, sentences. */
function label(ctx: PreviewCtx, x: number, y: number, color: string): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: '11px', fontFamily: 'Arial', color,
  }).setOrigin(0.5).setDepth(14));
}

/** A time puddle, repainted the way the kit repaints its own: 28px, 5s, face fading with life. */
function puddle(ctx: PreviewCtx, o: { x: number; y: number; born: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const seed = Math.random() * 10;
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > 5000) return;
    const life = Phaser.Math.Clamp((5000 - age) / 5000, 0, 1);
    TimeFx.drawPuddle(g, ctx.tint, NOON_TONES, o.x, o.y, 28, seed + elapsed / 1000, 0.4 + life * 0.6);
  });
}

/** The Time Energy bar: 40px wide, 5px tall, gold under full and blue at full. */
function energyBar(ctx: PreviewCtx, read: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
  ctx.onFrame(() => {
    const v = Phaser.Math.Clamp(read(), 0, 1);
    g.clear();
    g.fillStyle(v >= 1 ? 0x4488ff : 0xffdd44, 0.85);
    g.fillRect(ctx.cx - 20, ctx.cy - 40, 40 * v, 5);
  });
}

/** The bounty warrant, drawn 55px over the marked fighter exactly as the kit places it. */
function bountyLabel(ctx: PreviewCtx, m: Mark, read: () => number): void {
  const t = label(ctx, m.x, m.y - 55, '#ffdd44');
  ctx.onFrame(() => {
    const n = Math.floor(read());
    t.setText(n >= 1 ? `Bounty: ${n}` : '').setPosition(m.x, m.y - 55);
  });
}

/** A dial locked onto a fighter, countdown hand and all. */
function dial(
  ctx: PreviewCtx,
  o: { m: Mark; tones: TimeTones; radius: number; depth?: number; sheds?: boolean; read: (ms: number) => number },
): TimeDial {
  const d = ctx.capture(() => new TimeDial(ctx.scene, ctx.tint, o.tones, o.radius, o.depth ?? 3, o.sheds ?? false));
  ctx.onFrame((dt, elapsed) => {
    const p = o.read(elapsed);
    if (p < 0) return;
    ctx.capture(() => d.update(dt, o.m.x, o.m.y, Phaser.Math.Clamp(p, 0, 1), 1));
  });
  return d;
}

/**
 * A bullet stepped by the script rather than by `ctx.fly`, for the loops where the whole point
 * is that something interferes with its velocity — the frozen field, the bounty drag, the
 * Bounty Hunter speed-up. Real texture, real 380 px/s baseline.
 */
function steppedBullet(
  ctx: PreviewCtx,
  o: { from: Mark; angle: number; born: number; speed?: number; scale: (x: number, y: number) => number },
): void {
  const spr = ctx.adopt(ctx.scene.add.image(o.from.x, o.from.y, 'proj-time-bullet').setDepth(6));
  spr.setRotation(o.angle).setVisible(false);
  const base = o.speed ?? 380;
  let x = o.from.x, y = o.from.y;
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < o.born) return;
    spr.setVisible(true);
    const v = base * o.scale(x, y);
    x += Math.cos(o.angle) * v * (dt / 1000);
    y += Math.sin(o.angle) * v * (dt / 1000);
    spr.setPosition(x, y);
  });
}

// ══ CLICK — Quick Shot ════════════════════════════════════════════════

export const quickShot: PreviewScript = {
  duration: 5800,
  caption: 'Click — six rounds at 250ms, each ageing 5 → 12 damage in flight, then a 3s reload',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const reach = Math.hypot(ctx.tx - ctx.cx, ctx.ty - ctx.cy) - 20;
    const flightMs = (reach / 380) * 1000;
    const ammo = label(ctx, ctx.cx, ctx.cy - 44, '#ffdd44');

    let left = 6;
    for (let i = 0; i < 6; i++) {
      ctx.at(300 + i * 250, () => {
        left--;
        ammo.setText('●'.repeat(left) + '○'.repeat(6 - left));
        av.play('punch', ctx.aim);
        fx.muzzleFire(ctx.cx + Math.cos(ctx.aim) * 18, ctx.cy + Math.sin(ctx.aim) * 18, ctx.aim, 1, 9, HEAT_TONES);
        ctx.fly({
          texture: 'proj-time-bullet',
          from: { x: ctx.cx + Math.cos(ctx.aim) * 20, y: ctx.cy },
          to: { x: ctx.tx, y: ctx.ty },
          speed: 380,
          onHit: () => {
            // The ramp is 5 → 12 over 2s of flight, so a shot at this range is worth this much.
            const dmg = Math.round(5 + 7 * Phaser.Math.Clamp(flightMs / 2000, 0, 1));
            fx.flash(ctx.tx, ctx.ty, 12, 8, HEAT_TONES);
            float(ctx, ctx.tx, ctx.ty - 24, String(dmg), '#ffbb66');
          },
        });
      });
    }

    // The cylinder swung out beside the hand, one chamber filling at a time.
    const reloadAt = 300 + 6 * 250;
    const cyl = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    ctx.onFrame((_dt, elapsed) => {
      cyl.clear();
      const t = elapsed - reloadAt;
      if (t < 0 || t > 3000) return;
      ammo.setText('reloading');
      const ang = elapsed * 0.006;
      TimeFx.drawCylinder(cyl, ctx.tint, NOON_TONES,
        ctx.cx + Math.cos(ang) * 22, ctx.cy + Math.sin(ang) * 22, 9, ang * 2,
        Math.floor((t / 3000) * 6));
    });
    ctx.at(reloadAt + 3000, () => {
      ammo.setText('●●●●●●');
      float(ctx, ctx.cx, ctx.cy - 52, 'LOADED', '#ffee88');
    });
  },
};

export const quickShotUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.78,
  caption: 'Perfect Reload — catch the yellow band for an instant reload and the whole cylinder thrown',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    // The chamber always flies 600px before its fuse ends, whatever the cursor was on — so the
    // enemy is staged off the throw line, the way the blast actually catches somebody.
    const mark: Mark = { x: ctx.cx + 590, y: ctx.cy - 34 };
    movingDummy(ctx, mark);

    const start = 300;
    const barW = 50, barH = 7, barY = ctx.cy - 50;
    const barX = ctx.cx - barW / 2;
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    let reloading = true;
    ctx.onFrame((_dt, elapsed) => {
      bar.clear();
      if (!reloading || elapsed < start) return;
      const p = Phaser.Math.Clamp((elapsed - start) / 3000, 0, 1);
      bar.fillStyle(0x44aa44, 0.85);
      bar.fillRect(barX, barY - barH / 2, barW, barH);
      bar.fillStyle(0x88ff88, 0.5);
      bar.fillRect(barX, barY - barH / 2, barW * p, barH);
      // The perfect band: 45% to 55% of the 3 seconds.
      bar.fillStyle(0xffff00, 0.9);
      bar.fillRect(barX + barW * 0.45, barY - barH / 2, barW * 0.1, barH);
      bar.fillStyle(0xff2222, 1);
      bar.fillRect(barX + barW * p - 1.5, barY - barH / 2 - 1, 3, barH + 2);
    });

    // Dead centre of the band, 1.5s in.
    ctx.at(start + 1500, () => {
      reloading = false;
      av.play('slam', ctx.aim);
      fx.muzzleFire(ctx.cx, ctx.cy, ctx.aim, 1.3, 9, NOON_TONES);
      fx.ring(ctx.cx, ctx.cy, 8, 54, TIME.noon, 380, 3.5, 8);
      float(ctx, ctx.cx, ctx.cy - 36, 'PERFECT!', '#ffff44');
      ctx.fly({
        texture: 'proj-time-chamber',
        from: { x: ctx.cx, y: ctx.cy },
        to: { x: ctx.cx + 600, y: ctx.cy },
        speed: 300,
        pierce: true,
      });
    });

    // 2 second fuse: 600px of travel, then 30 damage in a 40px radius wherever it got to.
    ctx.at(start + 3500, () => {
      const bx = ctx.cx + 600, by = ctx.cy;
      fx.detonate(bx, by, 48, { tones: HEAT_TONES, shells: 5, smoke: 2, duration: 460 });
      float(ctx, bx, by - 20, '30 BOOM', '#ff6633');
      float(ctx, mark.x, mark.y - 40, '−30', '#ffb3aa');
    });
  },
};

// ══ E — Lasso ═════════════════════════════════════════════════════════

/**
 * The walk that gives the rewind something to rewind. Position is sampled every 100ms in the
 * kit, so the snapshots are drawn as they are taken — the faint dots are the ability's memory.
 */
function walkAndRecord(
  ctx: PreviewCtx, m: Mark, o: { fromX: number; fromY: number; toX: number; toY: number; ms: number },
): void {
  const dots = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
  const taken: Mark[] = [];
  let accum = 0;
  ctx.onFrame((dt, elapsed) => {
    const p = Phaser.Math.Clamp(elapsed / o.ms, 0, 1);
    m.x = o.fromX + (o.toX - o.fromX) * p;
    m.y = o.fromY + (o.toY - o.fromY) * p;
    accum += dt;
    while (accum >= 100 && taken.length < 40) {
      accum -= 100;
      taken.push({ x: m.x, y: m.y });
      dots.fillStyle(ctx.tint(TIME.brass), 0.22);
      dots.fillCircle(m.x, m.y, 2.2);
    }
  });
}

/** The rope in flight, then the rope taut on a body being hauled. */
function rope(ctx: PreviewCtx, read: () => { x: number; y: number; loop: boolean } | null): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const to = read();
    if (!to) return;
    TimeFx.drawRope(g, ctx.tint, NOON_TONES, ctx.cx, ctx.cy, to.x, to.y, elapsed / 1000, to.loop);
  });
}

export const lasso: PreviewScript = {
  duration: 6400,
  caption: 'E — 20 damage, then hauled back to where they stood 3 seconds ago, paving the line',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.cx + 110, y: ctx.cy - 46 };
    const past: Mark = { x: mark.x, y: mark.y };
    movingDummy(ctx, mark);
    walkAndRecord(ctx, mark, { fromX: past.x, fromY: past.y, toX: ctx.tx, toY: ctx.ty, ms: 2000 });

    // The throw at 260 px/s.
    const throwAt = 2300;
    const flightMs = (Math.hypot(ctx.tx - ctx.cx, ctx.ty - ctx.cy) / 260) * 1000;
    let orb: Mark | null = null;
    let dragging = false;
    rope(ctx, () => (orb ? { x: orb.x, y: orb.y, loop: !dragging } : null));

    ctx.at(throwAt, () => {
      av.play('sweep', ctx.aim);
      fx.bloom(ctx.cx, ctx.cy, 22, 7, 5, NOON_TONES);
      orb = { x: ctx.cx, y: ctx.cy };
      const o = orb;
      ctx.onFrame((_dt, elapsed) => {
        if (dragging) return;
        const p = Phaser.Math.Clamp((elapsed - throwAt) / flightMs, 0, 1);
        o.x = ctx.cx + (ctx.tx - ctx.cx) * p;
        o.y = ctx.cy + (ctx.ty - ctx.cy) * p;
      });
    });

    // The catch, and the 1 second haul back through their own history.
    const hitAt = throwAt + flightMs;
    ctx.at(hitAt, () => {
      dragging = true;
      fx.detonate(mark.x, mark.y, 40, { tones: NOON_TONES, shells: 2, smoke: 1, duration: 320, burn: false });
      float(ctx, mark.x, mark.y - 24, '20', '#ffdd44');
      fx.rewind(mark.x, mark.y, past.x, past.y, 5, NOON_TONES);
      const fromX = mark.x, fromY = mark.y;
      ctx.onFrame((_dt, elapsed) => {
        const p = Phaser.Math.Clamp((elapsed - hitAt) / 1000, 0, 1);
        mark.x = fromX + (past.x - fromX) * p;
        mark.y = fromY + (past.y - fromY) * p;
        if (orb) { orb.x = mark.x; orb.y = mark.y; }
      });
      // One puddle every 200ms of the drag — roughly five of them along the rope.
      for (let i = 0; i <= 4; i++) {
        const at = hitAt + i * 200;
        ctx.at(at, () => puddle(ctx, { x: mark.x, y: mark.y, born: at }));
      }
    });
    ctx.at(hitAt + 1000, () => { orb = null; float(ctx, past.x, past.y - 30, '3s AGO', '#ffee88'); });
  },
};

export const lassoUpgraded: PreviewScript = {
  duration: 7200,
  caption: 'Delayed Warp — the catch pins the moment; the next E cashes it in, for free',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.cx + 110, y: ctx.cy - 46 };
    const past: Mark = { x: mark.x, y: mark.y };
    movingDummy(ctx, mark);
    walkAndRecord(ctx, mark, { fromX: past.x, fromY: past.y, toX: ctx.tx, toY: ctx.ty, ms: 2000 });

    const throwAt = 2200;
    const flightMs = (Math.hypot(ctx.tx - ctx.cx, ctx.ty - ctx.cy) / 260) * 1000;
    let orb: Mark | null = null;
    let dragging = false;
    rope(ctx, () => (orb ? { x: orb.x, y: orb.y, loop: !dragging } : null));

    ctx.at(throwAt, () => {
      av.play('sweep', ctx.aim);
      fx.bloom(ctx.cx, ctx.cy, 22, 7, 5, NOON_TONES);
      orb = { x: ctx.cx, y: ctx.cy };
      const o = orb;
      ctx.onFrame((_dt, elapsed) => {
        if (dragging) return;
        const p = Phaser.Math.Clamp((elapsed - throwAt) / flightMs, 0, 1);
        o.x = ctx.cx + (ctx.tx - ctx.cx) * p;
        o.y = ctx.cy + (ctx.ty - ctx.cy) * p;
      });
    });

    // The catch marks the moment instead of spending it.
    const hitAt = throwAt + flightMs;
    const marker = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    let pinned = false;
    ctx.onFrame((_dt, elapsed) => {
      marker.clear();
      if (!pinned) return;
      // The kit pins a dial and pulses it, so the mark is unmistakably a *time*.
      const pulse = 0.6 + 0.25 * Math.sin(elapsed / 190);
      TimeFx.drawDial(marker, ctx.tint, NOON_TONES, past.x, past.y, 18, elapsed / 1000, 1, pulse);
    });
    ctx.at(hitAt, () => {
      fx.detonate(mark.x, mark.y, 40, { tones: NOON_TONES, shells: 2, smoke: 1, duration: 320, burn: false });
      float(ctx, mark.x, mark.y - 24, '20', '#ffdd44');
      pinned = true;
      orb = null;
      float(ctx, ctx.cx, ctx.cy - 32, '⏱ Saved!', '#ffdd44');
    });

    // The second press, at a moment of your choosing, and it costs no cooldown.
    const pullAt = hitAt + 1600;
    ctx.at(pullAt, () => {
      dragging = true;
      float(ctx, ctx.cx, ctx.cy - 32, '⏩ Drag!', '#ffdd44');
      fx.rewind(mark.x, mark.y, past.x, past.y, 5, NOON_TONES);
      orb = { x: mark.x, y: mark.y };
      const fromX = mark.x, fromY = mark.y;
      ctx.onFrame((_dt, elapsed) => {
        const p = Phaser.Math.Clamp((elapsed - pullAt) / 1000, 0, 1);
        mark.x = fromX + (past.x - fromX) * p;
        mark.y = fromY + (past.y - fromY) * p;
        if (orb) { orb.x = mark.x; orb.y = mark.y; }
      });
      for (let i = 0; i <= 4; i++) {
        const at = pullAt + i * 200;
        ctx.at(at, () => puddle(ctx, { x: mark.x, y: mark.y, born: at }));
      }
    });
    ctx.at(pullAt + 1000, () => { orb = null; pinned = false; float(ctx, ctx.cx, ctx.cy - 46, 'no cooldown paid', '#88ffaa'); });
  },
};

// ══ R — Remain ════════════════════════════════════════════════════════

export const remain: PreviewScript = {
  duration: 5800,
  caption: 'R — 3s of total absorb, then 80% of everything it swallowed arrives at once',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const me: Mark = { x: ctx.cx, y: ctx.cy };
    const total = label(ctx, ctx.cx, ctx.cy - 56, '#ffee88');

    const castAt = 400;
    let absorbed = 0;
    ctx.at(castAt, () => {
      av.play('clap');
      fx.bloom(ctx.cx, ctx.cy, 40, 10, 5, NOON_TONES);
      dial(ctx, {
        m: me, tones: NOON_TONES, radius: 40, depth: 4, sheds: true,
        read: (el) => (el < castAt ? -1 : (castAt + 3000 - el) / 3000),
      });
    });

    // Five hits that never reach the health bar — and a puddle for every 10 they add up to.
    for (let i = 0; i < 5; i++) {
      ctx.at(castAt + 200 + i * 550, () => {
        const prev = Math.floor(absorbed / 10);
        absorbed += 12;
        fx.flash(ctx.cx, ctx.cy, 14, 8, HEAT_TONES);
        float(ctx, ctx.cx + 26, ctx.cy - 20, '+12', '#a8f0e4');
        total.setText(`absorbed ${absorbed}`);
        for (let k = prev; k < Math.floor(absorbed / 10); k++) {
          const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40;
          puddle(ctx, { x: ctx.cx + Math.cos(a) * r, y: ctx.cy + Math.sin(a) * r, born: castAt + 200 + i * 550 });
        }
      });
    }

    ctx.at(castAt + 3000, () => {
      const bill = Math.round(absorbed * 0.8);
      total.setText('');
      fx.detonate(ctx.cx, ctx.cy, 46 + Math.min(70, bill), {
        tones: HEAT_TONES, shells: 4, smoke: 2, duration: 460, burn: false,
      });
      float(ctx, ctx.cx, ctx.cy - 34, `−${bill}`, '#ff9c9c');
      float(ctx, ctx.cx, ctx.cy - 52, `80% of ${absorbed}`, '#ffb3aa');
    });
  },
};

export const remainUpgraded: PreviewScript = {
  duration: 5800,
  caption: 'Frozen Field — a 60px zone that parks every projectile inside it, yours included',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const me: Mark = { x: ctx.cx, y: ctx.cy };
    const castAt = 400;

    ctx.at(castAt, () => {
      av.play('clap');
      fx.bloom(ctx.cx, ctx.cy, 40, 10, 5, NOON_TONES);
      fx.ring(ctx.cx, ctx.cy, 8, 60, TIME.frost, 420, 3.5, 4);
      dial(ctx, {
        m: me, tones: NOON_TONES, radius: 40, depth: 4, sheds: true,
        read: (el) => (el < castAt ? -1 : (castAt + 3000 - el) / 3000),
      });
      // The second, wider, blue dial: the stasis field itself.
      dial(ctx, {
        m: me, tones: FROZEN_TONES, radius: 60, depth: 3,
        read: (el) => (el < castAt ? -1 : (castAt + 3000 - el) / 3000),
      });
    });

    // Everything inside 60px stops dead and is handed its velocity back on the way out.
    const frozen = (x: number, y: number, elapsed: number): number => {
      const inWindow = elapsed >= castAt && elapsed < castAt + 3000;
      return inWindow && Phaser.Math.Distance.Between(x, y, ctx.cx, ctx.cy) <= 60 ? 0 : 1;
    };
    let now = 0;
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });
    steppedBullet(ctx, {
      from: { x: ctx.cx + 260, y: ctx.cy - 6 }, angle: Math.PI, born: 500,
      scale: (x, y) => frozen(x, y, now),
    });
    steppedBullet(ctx, {
      from: { x: ctx.cx - 40, y: ctx.cy + 10 }, angle: 0, born: 900,
      scale: (x, y) => frozen(x, y, now),
    });
    ctx.at(1500, () => float(ctx, ctx.cx + 46, ctx.cy - 34, 'HELD', '#bfe8ff'));
    ctx.at(2000, () => float(ctx, ctx.cx - 10, ctx.cy + 34, 'yours too', '#bfe8ff'));
    ctx.at(castAt + 3000, () => float(ctx, ctx.cx, ctx.cy - 50, 'RELEASED', '#88aaff'));
  },
};

// ══ F — Bounty ════════════════════════════════════════════════════════

export const bounty: PreviewScript = {
  duration: 6600,
  caption: 'F — spend 9 bounty for a 9 second sentence: half speed, double cooldowns, crawling shots',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    let held = 9;
    bountyLabel(ctx, mark, () => held);

    const castAt = 900;
    ctx.at(castAt, () => {
      held = 0;
      av.play('punch', ctx.aim);
      fx.bloom(mark.x, mark.y, 60, 12, 6, NOON_TONES);
      fx.ring(mark.x, mark.y, 20, 120, TIME.gold, 480, 4.5, 6);
      float(ctx, ctx.cx, ctx.cy - 36, 'BOUNTY!', '#ffdd44');
      // 1 second of sentence per whole point of bounty — this one runs 9.
      dial(ctx, {
        m: mark, tones: NOON_TONES, radius: 120, depth: 3,
        read: (el) => (el < castAt ? -1 : (castAt + 9000 - el) / 9000),
      });
    });
    ctx.at(castAt + 250, () => float(ctx, mark.x, mark.y - 40, '−50% SPEED', '#d4c6ff'));
    ctx.at(castAt + 900, () => float(ctx, mark.x, mark.y - 40, '×2 COOLDOWNS', '#ffc0de'));

    // A shot crossing the warrant: 15% of its speed for as long as it is inside 120px.
    let now = 0;
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });
    steppedBullet(ctx, {
      from: { x: ctx.cx + 40, y: ctx.cy - 4 }, angle: 0, born: castAt + 400,
      scale: (x, y) => (now >= castAt && Phaser.Math.Distance.Between(x, y, mark.x, mark.y) <= 120 ? 0.15 : 1),
    });
    ctx.at(castAt + 1900, () => float(ctx, mark.x - 110, mark.y - 26, '15% SPEED', '#a8f0e4'));
  },
};

export const bountyUpgraded: PreviewScript = {
  duration: 6600,
  caption: 'Bounty Hunter — tear the warrant up and run your own clock fast instead',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    const me: Mark = { x: ctx.cx, y: ctx.cy };
    movingDummy(ctx, mark);

    // The warrant is already running when the loop opens.
    let warrant = true;
    dial(ctx, {
      m: mark, tones: NOON_TONES, radius: 120, depth: 3,
      read: () => (warrant ? 0.7 : -1),
    });

    const recastAt = 1300;
    ctx.at(recastAt, () => {
      warrant = false;
      fx.ring(mark.x, mark.y, 120, 20, TIME.gold, 380, 3, 6);
      float(ctx, mark.x, mark.y - 30, '−25% slow', '#ffaa44');
      av.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 52, 10, 5, MINT_TONES);
      fx.ring(ctx.cx, ctx.cy, 14, 120, TIME.mint, 460, 4, 5);
      float(ctx, ctx.cx, ctx.cy - 40, 'BOUNTY HUNTER!', '#44ffaa');
      // Length is the highest bounty ever held this match, not the one just spent.
      dial(ctx, {
        m: me, tones: MINT_TONES, radius: 120, depth: 3,
        read: (el) => (el < recastAt ? -1 : (recastAt + 12000 - el) / 12000),
      });
    });
    ctx.at(recastAt + 350, () => float(ctx, ctx.cx, ctx.cy - 46, '×1.5 SPEED', '#88ffcc'));
    ctx.at(recastAt + 1000, () => float(ctx, ctx.cx, ctx.cy - 46, '×0.5 COOLDOWNS', '#88ffcc'));
    ctx.at(recastAt + 1650, () => float(ctx, ctx.cx, ctx.cy - 46, 'RELOAD 1.5s', '#88ffcc'));

    // Projectiles inside 120px of you run at 150% — including the ones aimed at you.
    let now = 0;
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });
    steppedBullet(ctx, {
      from: { x: ctx.cx + 30, y: ctx.cy - 8 }, angle: 0, born: recastAt + 500,
      scale: (x, y) => (now >= recastAt && Phaser.Math.Distance.Between(x, y, ctx.cx, ctx.cy) <= 120 ? 1.5 : 1),
    });
    steppedBullet(ctx, {
      from: { x: ctx.cx + 250, y: ctx.cy + 14 }, angle: Math.PI, born: recastAt + 900,
      scale: (x, y) => (now >= recastAt && Phaser.Math.Distance.Between(x, y, ctx.cx, ctx.cy) <= 120 ? 1.5 : 1),
    });
    ctx.at(recastAt + 2400, () => float(ctx, ctx.cx + 80, ctx.cy + 34, 'both ways', '#a8f0e4'));
  },
};

// ══ Q — Always Noon ═══════════════════════════════════════════════════

/** The grey wash the kit lays over the whole battlefield while the world is stopped. */
function greyWash(ctx: PreviewCtx): Phaser.GameObjects.Rectangle {
  return ctx.adopt(ctx.scene.add
    .rectangle(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h, 0x888888, 0.35)
    .setDepth(6).setVisible(false));
}

/** A held rifle beam: hard core, brass jacket, and the dust still hanging in the channel. */
function beam(ctx: PreviewCtx, o: { angle: number; born: number }): { fade: () => void } {
  const jacket = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const core = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const ex = ctx.cx + Math.cos(o.angle) * 900;
  const ey = ctx.cy + Math.sin(o.angle) * 900;
  let alpha = 1;
  ctx.onFrame((_dt, elapsed) => {
    jacket.clear(); core.clear();
    if (elapsed < o.born) return;
    TimeFx.drawBeam(jacket, ctx.tint, FROZEN_TONES, ctx.cx, ctx.cy, ex, ey, elapsed / 1000, alpha);
    TimeFx.drawBeam(core, ctx.tint, HEAT_TONES, ctx.cx, ctx.cy, ex, ey, elapsed / 1000, alpha * 0.5);
  });
  return { fade: () => ctx.scene.tweens.add({ targets: { get v() { return alpha; }, set v(x: number) { alpha = x; } }, v: 0, duration: 350 }) };
}

function alwaysNoonScript(withReload: boolean): PreviewScript {
  return {
    duration: withReload ? 7600 : 7000,
    scale: 0.6,
    caption: withReload
      ? 'Rifle.Reload — catch all three bands and the stop pays out six 25 damage rounds, not three'
      : 'Q — 5 seconds of stopped world, three 25 damage rounds that land when it restarts',
    run(ctx) {
      const { fx, av, tv } = stage(ctx, { noDummy: true });
      const mark: Mark = { x: ctx.tx, y: ctx.ty };
      movingDummy(ctx, mark);
      let energy = 1;
      energyBar(ctx, () => energy);

      const wash = greyWash(ctx);
      const shots = label(ctx, ctx.cx, ctx.cy - 54, '#ff8888');
      const beams: { fade: () => void }[] = [];
      const pressAt = 500;

      ctx.at(pressAt, () => {
        energy = 0;
        tv?.setFrozen(true);
        av.play('raise');
        fx.sunstop(ctx.cx, ctx.cy, 150, 12, NOON_TONES);
        wash.setVisible(true);
        float(ctx, ctx.cx, ctx.cy - 40, 'ALWAYS NOON', '#ffdd44');
        shots.setText('3 shots');
      });

      const fire = (at: number, angle: number, leftAfter: number): void => ctx.at(at, () => {
        av.play('punch', angle);
        fx.muzzleFire(ctx.cx, ctx.cy, angle, 1.5, 10, FROZEN_TONES);
        beams.push(beam(ctx, { angle, born: at }));
        shots.setText(leftAfter > 0 ? `${leftAfter} shot${leftAfter === 1 ? '' : 's'} left` : 'empty');
      });

      // Three rounds, splayed a fraction so they read as three and still all pass within 30px.
      fire(1200, -0.02, 2);
      fire(1750, 0, 1);
      fire(2300, 0.02, 0);

      if (withReload) {
        // 1.5s of bar, three bands at 10–25%, 42–57% and 72–87%.
        const rStart = 2300;
        const barW = 66, barH = 8, barY = ctx.cy - 55;
        const barX = ctx.cx - barW / 2;
        const zones = [[0.10, 0.25], [0.42, 0.57], [0.72, 0.87]];
        const hit = [false, false, false];
        const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
        let reloading = false;
        ctx.onFrame((_dt, elapsed) => {
          bar.clear();
          if (!reloading) return;
          const p = Phaser.Math.Clamp((elapsed - rStart) / 1500, 0, 1);
          bar.fillStyle(0x335544, 0.85);
          bar.fillRect(barX, barY - barH / 2, barW, barH);
          bar.fillStyle(0x88ffaa, 0.5);
          bar.fillRect(barX, barY - barH / 2, barW * p, barH);
          zones.forEach((z, i) => {
            bar.fillStyle(hit[i] ? 0x44ff44 : p > z[1] ? 0xff3333 : 0xffff00, 0.9);
            bar.fillRect(barX + barW * z[0], barY - barH / 2, barW * (z[1] - z[0]), barH);
          });
          bar.fillStyle(0xff2222, 1);
          bar.fillRect(barX + barW * p - 1.5, barY - barH / 2 - 1, 3, barH + 2);
        });
        ctx.at(rStart, () => { reloading = true; float(ctx, ctx.cx, ctx.cy - 36, 'Reloading…', '#88ffaa'); });
        [[0.17, 0], [0.50, 1], [0.79, 2]].forEach(([f, i]) => {
          ctx.at(rStart + 1500 * f, () => {
            hit[i] = true;
            float(ctx, ctx.cx, ctx.cy - 42, `✓ ${i + 1}/3`, '#44ff44');
          });
        });
        ctx.at(rStart + 1500, () => {
          reloading = false;
          shots.setText('3 shots');
          float(ctx, ctx.cx, ctx.cy - 36, 'RELOADED! ×3', '#ffdd44');
        });
        fire(4100, -0.02, 2);
        fire(4550, 0, 1);
        fire(5000, 0.02, 0);
      }

      // Time restarts and every round arrives at once.
      ctx.at(pressAt + 5000, () => {
        tv?.setFrozen(false);
        wash.setVisible(false);
        shots.setText('');
        for (const b of beams) b.fade();
        beams.forEach((_b, i) => ctx.at(i * 90, () => {
          fx.detonate(mark.x, mark.y, 54, { tones: HEAT_TONES, shells: 3, smoke: 2, duration: 420, burn: false });
          float(ctx, mark.x, mark.y - 24 - i * 6, '25', '#ffbb66');
        }));
        float(ctx, ctx.cx, ctx.cy - 50, withReload ? '150 total' : '75 total', '#ffee88');
      });
    },
  };
}

export const alwaysNoon = alwaysNoonScript(false);
export const alwaysNoonUpgraded = alwaysNoonScript(true);

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveBounty: PreviewScript = {
  duration: 5400,
  caption: 'Passive — every 5 damage they land on you is +1 bounty over their head, and it never decays',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    let held = 0;
    bountyLabel(ctx, mark, () => held);

    for (let i = 0; i < 4; i++) {
      ctx.at(600 + i * 900, () => {
        held += 12 / 5;
        fx.flash(ctx.cx, ctx.cy, 14, 8, HEAT_TONES);
        float(ctx, ctx.cx, ctx.cy - 26, '−12', '#ff9c9c');
        float(ctx, mark.x, mark.y - 38, '+2.4', '#ffdd44');
      });
    }
    ctx.at(4400, () => float(ctx, mark.x, mark.y - 72, 'spend it on F', '#ffee88'));
  },
};

export const passivePuddles: PreviewScript = {
  duration: 6400,
  caption: 'Passive — 28px sundials for 5s: 25% slower for them, Time Energy for you',
  run(ctx) {
    stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 60, y: ctx.ty };
    movingDummy(ctx, mark);

    // One under you, three between you and them.
    puddle(ctx, { x: ctx.cx, y: ctx.cy, born: 200 });
    puddle(ctx, { x: ctx.cx + 120, y: ctx.cy - 10, born: 400 });
    puddle(ctx, { x: ctx.cx + 200, y: ctx.cy + 14, born: 600 });
    puddle(ctx, { x: ctx.tx, y: ctx.ty, born: 800 });

    // They walk into the last one and the ground takes a quarter of their speed.
    let inside = false;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 900) return;
      const slowed = Phaser.Math.Distance.Between(mark.x, mark.y, ctx.tx, ctx.ty) <= 28;
      if (slowed && !inside) { inside = true; float(ctx, mark.x, mark.y - 34, '−25% SPEED', '#d4c6ff'); }
      if (!slowed) inside = false;
      mark.x -= 60 * (slowed ? 0.75 : 1) * (dt / 1000);
    });

    // Standing in your own is 1000ms of charge per second.
    let energy = 0;
    energyBar(ctx, () => energy);
    ctx.onFrame((dt, elapsed) => { if (elapsed > 200 && elapsed < 5200) energy += dt / 10000; });
    ctx.at(2400, () => float(ctx, ctx.cx, ctx.cy - 52, 'charging', '#ffee88'));
    ctx.at(5200, () => float(ctx, ctx.cx, ctx.cy - 52, 'puddle gone', '#8a8ab0'));
  },
};

export const passiveEnergy: PreviewScript = {
  duration: 5800,
  caption: 'Passive — 10,000ms of Time Energy: puddle-time fills it, bounty converts into it, overflow is lost',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    let held = 9;
    bountyLabel(ctx, mark, () => held);

    let energy = 0;
    energyBar(ctx, () => energy);
    puddle(ctx, { x: ctx.cx, y: ctx.cy, born: 200 });
    // 2.5 seconds stood in your own puddle is 2,500ms of the 10,000.
    ctx.onFrame((dt, elapsed) => { if (elapsed > 300 && elapsed < 2800) energy += dt / 10000; });
    ctx.at(1500, () => float(ctx, ctx.cx, ctx.cy - 52, '2,500 / 10,000', '#ffee88'));

    // One press of Q converts the warrant: 9 bounty = 9,000ms, and 1,500 of it falls off the top.
    ctx.at(3200, () => {
      av.play('raise');
      fx.bloom(ctx.cx, ctx.cy, 34, 8, 5, NOON_TONES);
      held = 0;
      energy = 1;
      float(ctx, ctx.cx, ctx.cy - 52, '+9,000ms', '#ffdd44');
      float(ctx, ctx.cx, ctx.cy - 68, '1,500 overflow lost', '#ff9c9c');
    });
    ctx.at(4300, () => float(ctx, ctx.cx, ctx.cy - 52, 'FULL — Q stops time', '#88aaff'));
  },
};

// ══ PERK — Purge ══════════════════════════════════════════════════════

export const perkPurge: PreviewScript = {
  duration: 7400,
  caption: 'Purge — recast Remain to void the debt entirely, once per match, and lose R forever',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const me: Mark = { x: ctx.cx, y: ctx.cy };
    const total = label(ctx, ctx.cx, ctx.cy - 56, '#ffee88');
    const castAt = 400;
    let absorbed = 0;
    let d: TimeDial | null = null;
    let endsAt = castAt + 3000;

    ctx.at(castAt, () => {
      av.play('clap');
      fx.bloom(ctx.cx, ctx.cy, 40, 10, 5, NOON_TONES);
      d = dial(ctx, {
        m: me, tones: NOON_TONES, radius: 40, depth: 4, sheds: true,
        read: (el) => (el < castAt ? -1 : (endsAt - el) / (endsAt - castAt)),
      });
    });

    for (let i = 0; i < 8; i++) {
      ctx.at(castAt + 300 + i * 700, () => {
        absorbed += 14;
        fx.flash(ctx.cx, ctx.cy, 14, 8, HEAT_TONES);
        float(ctx, ctx.cx + 26, ctx.cy - 20, '+14', '#a8f0e4');
        total.setText(`absorbed ${absorbed}`);
      });
    }

    // The recast: three more seconds, a red dial, and the bill torn up.
    ctx.at(1600, () => {
      endsAt += 3000;
      d?.setTones(HEAT_TONES);
      av.play('flex');
      fx.ring(ctx.cx, ctx.cy, 12, 76, TIME.heat, 460, 4, 5);
      float(ctx, ctx.cx, ctx.cy - 40, '⏳ PURGE — locked', '#ff4444');
    });

    ctx.at(castAt + 6000, () => {
      total.setText('');
      float(ctx, ctx.cx, ctx.cy - 34, 'NO DEBT', '#a6f0c2');
      float(ctx, ctx.cx, ctx.cy - 52, `${absorbed} absorbed, 0 taken`, '#a6f0c2');
    });
    ctx.at(castAt + 6600, () => float(ctx, ctx.cx, ctx.cy - 34, 'R locked for the match', '#ff9c9c'));
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryPassiveManipulation: PreviewScript = {
  duration: 6400,
  caption: 'Mastery passive — Focus runs the whole arena at ×0.5, Rush at ×1.5. Space flips it, 5s cooldown',
  run(ctx) {
    const { fx, av, tv } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    const mode = label(ctx, ctx.cx, ctx.cy - 54, '#88aaff');
    mode.setText('⏪ FOCUS ×0.5');
    tv?.setMode('focus');

    let factor = 0.5;
    // Both fighters and every projectile are on the same dial — this is not a personal buff.
    ctx.onFrame((dt) => {
      mark.x -= 70 * factor * (dt / 1000);
      if (mark.x < ctx.cx + 90) mark.x = ctx.tx;
    });
    for (let i = 0; i < 6; i++) {
      steppedBullet(ctx, {
        from: { x: ctx.cx + 30, y: ctx.cy - 20 + i * 8 }, angle: 0, born: 300 + i * 900,
        scale: () => factor,
      });
    }

    ctx.at(3000, () => {
      factor = 1.5;
      tv?.setMode('rush');
      mode.setText('⏩ RUSH ×1.5').setColor('#ff8844');
      av.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 34, 8, 5, HEAT_TONES);
      fx.ring(ctx.cx, ctx.cy, 10, 70, TIME.powder, 420, 4, 5);
      float(ctx, ctx.cx, ctx.cy - 44, '⏩ RUSH', '#ff8844');
    });
    ctx.at(3700, () => float(ctx, mark.x, mark.y - 34, 'they speed up too', '#ffb3aa'));
  },
};

export const masteryTimeBomb: PreviewScript = {
  duration: 7400,
  scale: 0.9,
  caption: 'Time Bomb — sticks, ripens 10 → 50 damage over 30s (compressed here), ×1.5 on the beat',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);

    const throwAt = 400;
    const bomb: Mark = { x: ctx.cx + 20, y: ctx.cy };
    const dist = Math.hypot(mark.x - ctx.cx, mark.y - ctx.cy) - 26;
    const stickAt = throwAt + (dist / 430) * 1000;   // the real 430 px/s
    const ripenTo = stickAt + 3000;                  // 30 real seconds, shown compressed
    const armAt = ripenTo;
    const boomAt = armAt + 1400;                     // the ring's full close

    const gfx = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const dmg = label(ctx, ctx.cx, ctx.cy - 54, '#ff8844');
    let dead = false;

    ctx.at(throwAt, () => {
      av.play('punch', ctx.aim);
      fx.muzzleFire(ctx.cx + 18, ctx.cy, ctx.aim, 0.9, 9, NOON_TONES);
      float(ctx, ctx.cx, ctx.cy - 40, '⏱️ TIME BOMB', '#ffcc44');
    });
    ctx.at(stickAt, () => {
      // It lands on the side it touched rather than dead centre.
      fx.flash(bomb.x, bomb.y, 16, 11, NOON_TONES);
      fx.ring(bomb.x, bomb.y, 8, 40, TIME.gold, 320, 2, 11);
      float(ctx, mark.x, mark.y - 40, '⏱️ STUCK!', '#ffdd44');
    });
    ctx.at(armAt, () => {
      fx.ring(bomb.x, bomb.y, 130, 150, TIME.white, 260, 2, 12);
      float(ctx, ctx.cx, ctx.cy - 40, '⏱️ ARMED — time it!', '#ffffff');
    });

    const heatAt = (elapsed: number): number =>
      Phaser.Math.Clamp((elapsed - stickAt) / (ripenTo - stickAt), 0, 1);

    ctx.onFrame((_dt, elapsed) => {
      gfx.clear(); ring.clear();
      if (dead || elapsed < throwAt) return;
      if (elapsed < stickAt) {
        const p = (elapsed - throwAt) / (stickAt - throwAt);
        bomb.x = ctx.cx + 20 + (mark.x - 14 - (ctx.cx + 20)) * p;
        bomb.y = ctx.cy + (mark.y - 6 - ctx.cy) * p;
      } else {
        bomb.x = mark.x - 14;
        bomb.y = mark.y - 6;
      }
      const heat = heatAt(elapsed);
      TimeFx.drawBomb(gfx, ctx.tint, NOON_TONES, bomb.x, bomb.y, 13, elapsed / 1000, heat, 1);
      if (elapsed >= stickAt) dmg.setText(`${Math.round(10 + 40 * heat)} dmg`);
      if (elapsed >= armAt) {
        // 130px closing onto the 13px casing over 1.4s; the last 12px is the beat.
        const t = Phaser.Math.Clamp((elapsed - armAt) / 1400, 0, 1);
        const r = 130 + (13 - 130) * t;
        TimeFx.drawTimingRing(ring, ctx.tint, bomb.x, bomb.y, r, elapsed / 1000, Math.abs(r - 13) <= 12);
      }
    });

    ctx.at(boomAt, () => {
      dead = true;
      dmg.setText('');
      fx.detonate(bomb.x, bomb.y, 72, { tones: HEAT_TONES, shells: 3, smoke: 2, duration: 680 });
      fx.hands(bomb.x, bomb.y, 14, { speed: 190, size: 3.6, life: 620, depth: 12, tones: HEAT_TONES });
      fx.ring(bomb.x, bomb.y, 13, 108, TIME.white, 420, 5, 13);
      fx.flash(bomb.x, bomb.y, 43, 13, NOON_TONES);
      float(ctx, bomb.x, bomb.y - 46, '⏱️ ON THE BEAT! ×1.5', '#ffffff');
      float(ctx, mark.x, mark.y - 62, '−75', '#ffb3aa');
    });
  },
};
