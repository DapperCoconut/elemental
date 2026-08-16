import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  ARTWORKS, ARTWORK_MAP, TAPESTRY_SIZE, emptyTapestry, place,
} from '../../../elements/kits/ClothTapestry';
import {
  CLT, ClothAvatar, ClothFx, OUTFIT_COLOR, OUTFIT_EMOJI, OUTFIT_NAME, OUTFITS, Outfit,
  anchorGlyph, loomCell, longpinGlyph, nailGlyph, pinGlyph, scarfRibbon, webGlyph,
} from '../../../elements/kits/ClothVisuals';

/**
 * Cloth's showcases.
 *
 * There is no `proj-cloth` — the scarf, the pins, the webs and the loom are all Graphics the kit
 * repaints every frame — so these loops keep the same little records the kit keeps and paint with
 * the real painters: `scarfRibbon` for the passive, `pinGlyph` and `longpinGlyph` for the two
 * attacks, `anchorGlyph` for the safety line, `webGlyph` for the hold and `loomCell` for the
 * tapestry. One-shots go through a real `ClothFx` with a sticky sink.
 *
 * The scarf is the one thing every loop has to get right, because it is the hitbox: each script
 * keeps a knot trail off `ctx.casterAt()` exactly the way `ClothKit.updateScarf` does, so a
 * showcase of a dash shows the wool arriving late in precisely the way it does in the arena.
 */

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): ClothFx {
  return ctx.capture(() => new ClothFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function dummyAt(
  ctx: PreviewCtx, at: { x: number; y: number }, depth = 5, alive: () => boolean = () => true,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    if (!alive()) return;
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

interface Knot { x: number; y: number }

/**
 * A scarf that follows the caster, sampled at the kit's own 13px spacing.
 *
 * Returned so a script can read the knots back — Scarf Slice freezes them, and the passive loop
 * shoots at them.
 */
function scarf(
  ctx: PreviewCtx, depth = 6,
  opts: { segments?: () => number; burn?: () => number; frozen?: () => Knot[] | null } = {},
): { knots: Knot[] } {
  const knots: Knot[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  let last = { ...ctx.casterAt() };
  let t = 0;
  ctx.onFrame((dt) => {
    t += dt / 1000;
    const at = ctx.casterAt();
    if (knots.length === 0) { knots.push({ x: at.x, y: at.y }); last = { x: at.x, y: at.y }; }
    if (Phaser.Math.Distance.Between(at.x, at.y, last.x, last.y) >= 13) {
      knots.unshift({ x: at.x, y: at.y });
      last = { x: at.x, y: at.y };
    } else {
      knots[0] = { x: at.x, y: at.y };
    }
    const want = (opts.segments?.() ?? 13) + 1;
    if (knots.length > want) knots.length = want;
    while (knots.length < want) {
      const tail = knots[knots.length - 1];
      const prev = knots[knots.length - 2] ?? { x: tail.x, y: tail.y + 1 };
      const ang = Math.atan2(tail.y - prev.y, tail.x - prev.x);
      knots.push({ x: tail.x + Math.cos(ang) * 13, y: tail.y + Math.sin(ang) * 13 });
    }
    g.clear();
    const frozen = opts.frozen?.() ?? null;
    if (frozen) {
      scarfRibbon(g, ctx.tint, frozen, 13, 0.85, { t, ghost: true });
      for (let i = 1; i < frozen.length; i += 3) {
        pinGlyph(g, ctx.tint, frozen[i].x, frozen[i].y, -Math.PI / 2, 14, 0.85, { head: 2 });
      }
      return;
    }
    if (knots.length >= 2) scarfRibbon(g, ctx.tint, knots, 13, 0.97, { t, burn: opts.burn?.() ?? 0 });
  });
  return { knots };
}

/** A little wandering path so the scarf in a loop is a shape rather than a straight line. */
function amble(ctx: PreviewCtx, radius = 46, period = 5200): void {
  const home = { x: ctx.cx, y: ctx.cy };
  ctx.onFrame((_dt, elapsed) => {
    const a = (elapsed / period) * Math.PI * 2;
    ctx.moveCaster(home.x + Math.cos(a) * radius, home.y + Math.sin(a * 2) * radius * 0.45, {
      facing: ctx.aim,
    });
  });
}

// ══ PASSIVE — The Scarf ═══════════════════════════════════════════════

export const theScarf: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'The scarf is the hitbox. Shots that miss the tailor by a mile still catch the wool — and every point of health lost is length off the tail.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    let hp = 1;
    amble(ctx, 52, 5600);
    const s = scarf(ctx, 6, { segments: () => Math.round(17 * (0.3 + 0.7 * hp)) });

    const bar = label(ctx, ctx.w * 0.5, 12, hex(CLT.clothPale), 11);
    ctx.onFrame(() => {
      if (av instanceof ClothAvatar) av.setWound(hp);
      bar.setText(`🧣  scarf ${Math.round(hp * 100)}%   —   ${s.knots.length - 1} knots of hitbox`);
    });

    // A shot that sails past the body and clips the tail.
    const shoot = (delay: number): void => {
      ctx.at(delay, () => {
        const aimAt = s.knots[Math.min(s.knots.length - 1, 6)];
        if (!aimAt) return;
        const from = { x: aimAt.x + 250, y: aimAt.y - 90 };
        const shot = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        const start = { ...from };
        const to = { x: aimAt.x, y: aimAt.y };
        let k = 0;
        const step = (dt: number): void => {
          k = Math.min(1, k + dt / 520);
          shot.clear();
          const x = Phaser.Math.Linear(start.x, to.x, k);
          const y = Phaser.Math.Linear(start.y, to.y, k);
          nailGlyph(shot, () => 0xd8dfe8, x, y, Math.atan2(to.y - start.y, to.x - start.x), 15, 1);
          if (k < 1) return;
          shot.clear();
          fx.lint(to.x, to.y, 6, 16, 400);
          float(ctx, to.x, to.y - 14, '-8', '#ff8888', 12);
          hp = Math.max(0.25, hp - 0.16);
        };
        ctx.onFrame(step);
      });
    };
    shoot(1400); shoot(3400); shoot(5400); shoot(7400);
    ctx.at(9600, () => {
      hp = 1;
      float(ctx, ctx.casterAt().x, ctx.casterAt().y - 34, '🧣 re-woven', hex(CLT.clothPale), 12);
    });
  },
};

// ══ PASSIVE — The Tapestry ════════════════════════════════════════════

export const theTapestry: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'A 5×5 loom, and every artwork is a different tetromino. What still fits later is decided by what you sewed first.',
  run(ctx) {
    const tap = emptyTapestry();
    const picks = ['sharpness-2', 'speedy-3', 'technique-1', 'clothstorm', 'braid-1'];
    // Hand-checked against the 5×5: none of these five overlap and none overhang.
    const spots: Array<[number, number]> = [[0, 0], [2, 0], [0, 2], [2, 2], [4, 1]];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const cell = 26;
    const ox = ctx.cx - (TAPESTRY_SIZE * cell) / 2 + 60;
    const oy = ctx.cy - (TAPESTRY_SIZE * cell) / 2;
    const note = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(CLT.clothPale), 11);

    ctx.onFrame(() => {
      g.clear();
      g.fillStyle(ctx.tint(CLT.loom), 0.92);
      g.fillRoundedRect(ox - 7, oy - 7, TAPESTRY_SIZE * cell + 14, TAPESTRY_SIZE * cell + 14, 6);
      for (let gy = 0; gy < TAPESTRY_SIZE; gy++) {
        for (let gx = 0; gx < TAPESTRY_SIZE; gx++) {
          const id = tap.grid[gy * TAPESTRY_SIZE + gx];
          loomCell(g, ctx.tint, ox + gx * cell + 1, oy + gy * cell + 1, cell - 2,
            id ? ARTWORK_MAP[id]?.color ?? CLT.cloth : null, 1);
        }
      }
    });

    picks.forEach((id, i) => {
      ctx.at(1300 + i * 2100, () => {
        const def = ARTWORK_MAP[id];
        if (!def) return;
        const [gx, gy] = spots[i];
        if (!place(tap, def, gx, gy)) return;
        fxOf(ctx).sew(ox + (gx + 0.5) * cell, oy + (gy + 0.5) * cell, def.color);
        note.setText(`🧵 ${def.name} — ${def.blurb}`);
        note.setColor(hex(def.color));
      });
    });
  },
};

// ══ CLICK — Pin ═══════════════════════════════════════════════════════

export const pin: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Click — 4 damage at arm\'s length, about seven times a second. The count in the corner is the only thing that matters.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 92, y: ctx.cy };
    dummyAt(ctx, victim);
    scarf(ctx);
    const count = label(ctx, ctx.w * 0.5, 12, hex(CLT.brassLit), 12);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    let hits = 0;
    let next = 500;
    let flash = 0;
    ctx.onFrame((dt, elapsed) => {
      flash = Math.max(0, flash - dt / 130);
      g.clear();
      // The reach arc — short, and the whole balance of the ability.
      g.lineStyle(1.2, ctx.tint(CLT.steelDark), 0.35);
      g.beginPath();
      g.arc(ctx.cx, ctx.cy, 62, ctx.aim - 1.1, ctx.aim + 1.1);
      g.strokePath();
      if (flash > 0) {
        pinGlyph(g, ctx.tint, ctx.cx + Math.cos(ctx.aim) * 48, ctx.cy + Math.sin(ctx.aim) * 48,
          ctx.aim, 30 + flash * 8, 1);
      }
      if (elapsed < next) return;
      next += 145;
      hits++;
      flash = 1;
      av.play('punch', ctx.aim, 120);
      fx.stab(victim.x - 14, victim.y, ctx.aim, 0.8);
      float(ctx, victim.x, victim.y - 18, '-4', '#ffdddd', 10);
      count.setText(`🧵  ${hits % 10 === 0 ? 'COMBO!' : `${hits % 10} / 10`}`);
      if (hits % 10 === 0) {
        fx.burst(victim.x, victim.y, 60);
        float(ctx, victim.x, victim.y - 36, '🧵 GRAPPLE SPIN', hex(CLT.brassLit), 12);
      }
    });
  },
};

export const pinUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Click+ — the tenth pin drags you onto them and whips you round once, which parks you inside your own reach for the whole revolution.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    const victim = { x: ctx.cx + 190, y: ctx.cy };
    dummyAt(ctx, victim);
    scarf(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let spinning = false;
    let spinT = 0;

    ctx.at(900, () => {
      fx.reel(ctx.casterAt().x, ctx.casterAt().y, victim.x, victim.y);
      float(ctx, ctx.cx, ctx.cy - 34, '🧵 10th PIN', hex(CLT.brassLit), 12);
    });
    ctx.at(1200, () => { spinning = true; });

    ctx.onFrame((dt) => {
      g.clear();
      if (!spinning) return;
      spinT += dt / 1400;
      if (spinT >= 1) { spinning = false; spinT = 0; return; }
      const ang = Math.PI + spinT * Math.PI * 2;
      const px = victim.x + Math.cos(ang) * 44;
      const py = victim.y + Math.sin(ang) * 44;
      ctx.moveCaster(px, py, { facing: Math.atan2(victim.y - py, victim.x - px) });
      g.lineStyle(2.6, ctx.tint(CLT.cloth), 0.85);
      g.lineBetween(px, py, victim.x, victim.y);
      g.lineStyle(1.1, ctx.tint(CLT.clothPale), 0.7);
      g.lineBetween(px, py - 1, victim.x, victim.y - 1);
      if (Math.random() < 0.3) {
        av.play('punch', Math.atan2(victim.y - py, victim.x - px), 100);
        fx.stab(victim.x, victim.y, Math.atan2(victim.y - py, victim.x - px), 0.7);
        float(ctx, victim.x, victim.y - 16, '-4', '#ffdddd', 10);
      }
    });
  },
};

// ══ E — Longpin ═══════════════════════════════════════════════════════

export const longpin: PreviewScript = {
  duration: 11000,
  scale: 0.85,
  caption: 'E — 15 on the way in, then E again to be hauled to it: 10 through anybody on the line, 10 and a long shove on arrival.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 300, y: ctx.cy - 10 };
    const bystander = { x: ctx.cx + 150, y: ctx.cy + 6 };
    dummyAt(ctx, victim);
    dummyAt(ctx, bystander);
    scarf(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    let fly: { x: number; y: number } | null = null;
    let planted: { x: number; y: number } | null = null;
    let t = 0;

    ctx.at(900, () => {
      av.play('punch', ctx.aim, 240);
      fly = { x: ctx.cx + 20, y: ctx.cy };
    });

    ctx.onFrame((dt) => {
      t += dt / 1000;
      g.clear();
      if (fly) {
        fly.x += 700 * (dt / 1000);
        longpinGlyph(g, ctx.tint, fly.x, fly.y, 0, 1, t);
        if (fly.x >= victim.x - 16) {
          planted = { x: victim.x, y: victim.y };
          fly = null;
          fx.plant(victim.x, victim.y);
          float(ctx, victim.x, victim.y - 24, '-15', '#ffdddd', 12);
          float(ctx, victim.x, victim.y - 44, '📌 PLANTED', hex(CLT.brassLit), 11);
        }
      }
      if (planted) {
        longpinGlyph(g, ctx.tint, planted.x, planted.y, 0, 0.95, t);
        const at = ctx.casterAt();
        g.lineStyle(1.4, ctx.tint(CLT.cloth), 0.45);
        g.beginPath();
        g.moveTo(planted.x, planted.y);
        g.lineTo((planted.x + at.x) / 2, (planted.y + at.y) / 2 + 18);
        g.lineTo(at.x, at.y);
        g.strokePath();
      }
    });

    ctx.at(3600, () => {
      if (!planted) return;
      float(ctx, ctx.cx, ctx.cy - 34, 'E again', hex(CLT.clothPale), 12);
      fx.reel(ctx.casterAt().x, ctx.casterAt().y, planted.x, planted.y);
      ctx.glideCaster({ to: { x: victim.x - 34, y: victim.y }, ms: 420, ease: 'in' });
    });
    ctx.at(3900, () => {
      fx.lint(bystander.x, bystander.y, 6, 20, 380);
      float(ctx, bystander.x, bystander.y - 22, '-10', '#ffdddd', 11);
    });
    ctx.at(4040, () => {
      fx.burst(victim.x, victim.y, 66);
      float(ctx, victim.x, victim.y - 24, '-10  SHOVE', '#ffdddd', 12);
      planted = null;
    });
  },
};

export const longpinUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.85,
  caption: 'E+ Cloth Hold — arriving on a pinned body wraps it in 50 HP of wool. It is not a timer: it is a damage check, and they have to cut their own way out.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 250, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    scarf(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const readout = label(ctx, ctx.w * 0.5, 12, hex(CLT.web), 11);
    let web = 0;
    let t = 0;

    ctx.at(800, () => {
      fx.reel(ctx.casterAt().x, ctx.casterAt().y, victim.x, victim.y);
      ctx.glideCaster({ to: { x: victim.x - 40, y: victim.y }, ms: 380, ease: 'in' });
    });
    ctx.at(1200, () => {
      web = 50;
      fx.wrap(victim.x, victim.y, 40);
      float(ctx, victim.x, victim.y - 40, '🕸️ HELD', hex(CLT.web), 12);
    });

    ctx.onFrame((dt) => {
      t += dt / 1000;
      g.clear();
      if (web <= 0) { readout.setText(''); return; }
      webGlyph(g, ctx.tint, victim.x, victim.y, 40, web / 50, 0.95, t);
      readout.setText(`🕸️  web ${Math.round(web)} / 50  —  they cannot move until it is gone`);
      // The victim chewing their way out.
      if (Math.random() < 0.06) {
        web -= 6;
        fx.lint(victim.x, victim.y, 3, 14, 300, CLT.web);
        if (web <= 0) {
          float(ctx, victim.x, victim.y - 34, '🕸️ TORN FREE', hex(CLT.webDark), 11);
          fx.lint(victim.x, victim.y, 12, 30, 500, CLT.web);
        }
      }
    });
  },
};

// ══ R — Safety Line ═══════════════════════════════════════════════════

export const safetyLine: PreviewScript = {
  duration: 12000,
  scale: 0.85,
  caption: 'R — drive an anchor in. Press it again, or take 75 damage with it out, and the line hauls you back to it.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    scarf(ctx);
    const anchor = { x: ctx.cx - 30, y: ctx.cy + 10 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const tally = label(ctx, ctx.w * 0.5, 12, hex(CLT.lineLit), 11);
    let set = false;
    let taken = 0;
    let t = 0;

    ctx.at(700, () => {
      set = true;
      av.play('slam', Math.PI / 2, 260);
      fx.plant(anchor.x, anchor.y);
      float(ctx, anchor.x, anchor.y - 26, '⚓ ANCHORED', hex(CLT.lineLit), 12);
    });
    ctx.at(1400, () => {
      ctx.glideCaster({ to: { x: ctx.cx + 250, y: ctx.cy - 30 }, ms: 2200, ease: 'linear' });
    });
    for (let i = 0; i < 5; i++) {
      ctx.at(2400 + i * 700, () => {
        if (!set) return;
        taken += 16;
        const at = ctx.casterAt();
        fx.lint(at.x, at.y, 5, 14, 340);
        float(ctx, at.x, at.y - 22, '-16', '#ff8888', 11);
        if (taken >= 75) {
          set = false;
          fx.snap(at.x, at.y, anchor.x, anchor.y);
          ctx.glideCaster({ to: { x: anchor.x, y: anchor.y }, ms: 300, ease: 'in' });
          float(ctx, anchor.x, anchor.y - 40, '⚓ HAULED BACK', hex(CLT.lineLit), 12);
        }
      });
    }

    ctx.onFrame((dt) => {
      t += dt / 1000;
      g.clear();
      if (!set) { tally.setText(''); return; }
      const armed = Phaser.Math.Clamp(taken / 75, 0, 1);
      anchorGlyph(g, ctx.tint, anchor.x, anchor.y, 0.95, t, armed);
      const at = ctx.casterAt();
      const mx = (anchor.x + at.x) / 2;
      const my = (anchor.y + at.y) / 2 + (1 - armed) * 26;
      g.lineStyle(1.8, ctx.tint(CLT.line), 0.35 + armed * 0.5);
      g.beginPath();
      g.moveTo(anchor.x, anchor.y - 11);
      g.lineTo(mx, my);
      g.lineTo(at.x, at.y);
      g.strokePath();
      tally.setText(`⚓  ${taken} / 75 taken  —  the slack is the tally`);
    });
  },
};

export const safetyLineUpgraded: PreviewScript = {
  duration: 10000,
  scale: 0.85,
  caption: 'R+ — the trip home is untouchable, and you land with 20% speed and 5 Pinned HP a second for five seconds.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    scarf(ctx);
    const anchor = { x: ctx.cx - 120, y: ctx.cy + 10 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const buff = label(ctx, ctx.w * 0.5, 12, hex(CLT.lineLit), 11);
    let pinned = 0;
    let buffUntil = 0;
    let t = 0;

    ctx.at(600, () => {
      ctx.moveCaster(ctx.cx + 210, ctx.cy - 20, { facing: ctx.aim });
      fx.plant(anchor.x, anchor.y);
    });
    ctx.at(1600, () => {
      const at = ctx.casterAt();
      fx.snap(at.x, at.y, anchor.x, anchor.y);
      ctx.glideCaster({ to: anchor, ms: 340, ease: 'in' });
      float(ctx, at.x, at.y - 28, '🛡️ UNTOUCHABLE', hex(CLT.lineLit), 11);
    });
    ctx.at(1980, () => { buffUntil = 5000; pinned = 0; });

    ctx.onFrame((dt, elapsed) => {
      t += dt / 1000;
      g.clear();
      anchorGlyph(g, ctx.tint, anchor.x, anchor.y, 0.8, t, 0.4);
      if (buffUntil <= 0 || elapsed > 1980 + 5000) { buff.setText(''); return; }
      pinned = Math.min(25, pinned + (5 * dt) / 1000);
      const at = ctx.casterAt();
      g.lineStyle(2, ctx.tint(CLT.line), 0.35 + 0.2 * Math.sin(t * 8));
      g.strokeCircle(at.x, at.y, 26);
      buff.setText(`⚡ +20% speed   📍 +${Math.round(pinned)} pinned`);
    });
  },
};

// ══ F — Pin Cushion ═══════════════════════════════════════════════════

export const pinCushion: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'F — 50 of your health becomes pins. They are spent first, they burn 25% faster, and a quarter of everything they eat goes straight back.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 170, y: ctx.cy };
    dummyAt(ctx, victim);
    scarf(ctx);
    const bars = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const read = label(ctx, ctx.w * 0.5, 12, hex(CLT.pinnedLit), 11);
    let hp = 200;
    let pinned = 0;

    ctx.at(900, () => {
      hp -= 50;
      pinned += 50;
      av.play('clap', 0, 220);
      const at = ctx.casterAt();
      fx.thorns(at.x, at.y, -Math.PI / 2, 6);
      fx.lint(at.x, at.y, 8, 18, 420, CLT.pinned);
      float(ctx, at.x, at.y - 40, '📍 50 PINNED', hex(CLT.pinnedLit), 12);
    });

    for (let i = 0; i < 4; i++) {
      ctx.at(2400 + i * 1500, () => {
        const at = ctx.casterAt();
        const raw = 12;
        const spend = Math.min(pinned, raw * 1.25);
        pinned -= spend;
        if (spend < raw * 1.25) hp -= raw - spend / 1.25;
        fx.lint(at.x, at.y, 5, 14, 320, CLT.pinned);
        float(ctx, at.x, at.y - 22, `-${raw}`, '#ff8888', 11);
        if (spend > 0) {
          const back = Math.round(spend * 0.25);
          fx.thorns(at.x, at.y, Math.atan2(victim.y - at.y, victim.x - at.x), 5);
          float(ctx, victim.x, victim.y - 22, `-${back} THORNS`, hex(CLT.thorn), 11);
        }
      });
    }

    ctx.onFrame(() => {
      if (av instanceof ClothAvatar) av.setPinned(Math.min(1, pinned / 120));
      bars.clear();
      const bx = ctx.w * 0.5 - 90;
      const by = 30;
      bars.fillStyle(ctx.tint(CLT.deep), 0.9);
      bars.fillRoundedRect(bx, by, 180, 11, 5);
      bars.fillStyle(ctx.tint(CLT.cloth), 1);
      bars.fillRoundedRect(bx, by, 180 * Phaser.Math.Clamp(hp / 200, 0, 1), 11, 5);
      bars.fillStyle(ctx.tint(CLT.deep), 0.9);
      bars.fillRoundedRect(bx, by + 14, 180, 7, 3.5);
      bars.fillStyle(ctx.tint(CLT.pinned), 1);
      bars.fillRoundedRect(bx, by + 14, 180 * Phaser.Math.Clamp(pinned / 200, 0, 1), 7, 3.5);
      read.setText(`🧣 ${Math.round(hp)}    📍 ${Math.round(pinned)}`);
    });
  },
};

export const pinCushionUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F+ Pin Push — every hit you take with pins in you sprays eight of them back out, 2 damage each, in every direction at once.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    dummyAt(ctx, { x: ctx.cx + 150, y: ctx.cy - 30 });
    dummyAt(ctx, { x: ctx.cx - 140, y: ctx.cy + 24 });
    scarf(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const pins: Array<{ x: number; y: number; vx: number; vy: number; a: number }> = [];

    const burst = (): void => {
      const at = ctx.casterAt();
      fx.lint(at.x, at.y, 5, 14, 300, CLT.pinned);
      float(ctx, at.x, at.y - 26, '-12', '#ff8888', 11);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        const a = base + (i / 8) * Math.PI * 2;
        pins.push({ x: at.x + Math.cos(a) * 16, y: at.y + Math.sin(a) * 16, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, a });
      }
    };
    ctx.at(1100, burst);
    ctx.at(3300, burst);
    ctx.at(5500, burst);

    ctx.onFrame((dt) => {
      g.clear();
      for (let i = pins.length - 1; i >= 0; i--) {
        const p = pins[i];
        p.x += p.vx * (dt / 1000);
        p.y += p.vy * (dt / 1000);
        nailGlyph(g, ctx.tint, p.x, p.y, p.a, 13, 0.95);
        if (p.x < -40 || p.x > ctx.w + 40 || p.y < -40 || p.y > ctx.h + 40) pins.splice(i, 1);
      }
    });
  },
};

// ══ Q — Tapestry ══════════════════════════════════════════════════════

export const tapestry: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'Q — three artworks are offered, one is sewn. Pieces are all different shapes, and the loom only has twenty-five squares.',
  run(ctx) {
    const offers = ['sharpness-3', 'technique-2', 'nail-storm'].map((id) => ARTWORK_MAP[id]).filter(Boolean);
    const tap = emptyTapestry();
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const cell = 22;
    const ox = ctx.cx - 250;
    const oy = ctx.cy - (TAPESTRY_SIZE * cell) / 2;
    const names = offers.map((_, i) => label(ctx, 0, 0, hex(CLT.clothPale), 10));
    let chosen = -1;
    let ghost: [number, number] | null = null;

    ctx.at(2400, () => { chosen = 2; });
    ctx.at(3600, () => { ghost = [1, 1]; });
    ctx.at(5200, () => {
      const def = offers[chosen];
      if (!def || !ghost) return;
      place(tap, def, ghost[0], ghost[1]);
      fxOf(ctx).sew(ox + (ghost[0] + 1) * cell, oy + (ghost[1] + 1) * cell, def.color);
      float(ctx, ctx.w * 0.5, 30, '🖱️ RIGHT CLICK UNLOCKED', hex(CLT.brassLit), 12);
      ghost = null;
      chosen = -1;
    });

    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      // The loom.
      g.fillStyle(ctx.tint(CLT.loom), 0.92);
      g.fillRoundedRect(ox - 6, oy - 6, TAPESTRY_SIZE * cell + 12, TAPESTRY_SIZE * cell + 12, 6);
      for (let gy = 0; gy < TAPESTRY_SIZE; gy++) {
        for (let gx = 0; gx < TAPESTRY_SIZE; gx++) {
          const id = tap.grid[gy * TAPESTRY_SIZE + gx];
          loomCell(g, ctx.tint, ox + gx * cell + 1, oy + gy * cell + 1, cell - 2,
            id ? ARTWORK_MAP[id]?.color ?? CLT.cloth : null, 1);
        }
      }
      if (ghost && chosen >= 0) {
        const def = offers[chosen];
        for (const [cx2, cy2] of def.cells) {
          g.fillStyle(ctx.tint(def.color), 0.5 + Math.sin(elapsed / 120) * 0.15);
          g.fillRect(ox + (ghost[0] + cx2) * cell + 1, oy + (ghost[1] + cy2) * cell + 1, cell - 2, cell - 2);
        }
      }

      // The three cards.
      offers.forEach((def, i) => {
        const cw = 128;
        const cx2 = ctx.cx - 60 + i * (cw + 12);
        const cy2 = ctx.cy - 74;
        const on = chosen === i;
        g.fillStyle(ctx.tint(CLT.deep), on ? 1 : 0.9);
        g.fillRoundedRect(cx2, cy2, cw, 132, 6);
        g.lineStyle(on ? 3 : 1.6, ctx.tint(on ? CLT.brassLit : def.color), 0.95);
        g.strokeRoundedRect(cx2, cy2, cw, 132, 6);
        const sc = 15;
        const w = Math.max(...def.cells.map((c) => c[0])) + 1;
        const sx = cx2 + cw / 2 - (w * sc) / 2;
        for (const [ccx, ccy] of def.cells) {
          loomCell(g, ctx.tint, sx + ccx * sc, cy2 + 18 + ccy * sc, sc - 2, def.color, 1);
        }
        names[i].setPosition(cx2 + cw / 2, cy2 + 116);
        names[i].setText(def.name);
        names[i].setColor(hex(on ? CLT.brassLit : def.color));
      });
    });
  },
};

export const tapestryUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Q+ Salvage — a couple of artworks survive your death and are on the loom when the next match starts. It also opens three artworks the deck did not have.',
  run(ctx) {
    const tap = emptyTapestry();
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    const cell = 26;
    const ox = ctx.cx - (TAPESTRY_SIZE * cell) / 2;
    const oy = ctx.cy - (TAPESTRY_SIZE * cell) / 2 + 6;
    const note = label(ctx, ctx.w * 0.5, 14, hex(CLT.clothPale), 11);
    const extra = ['combo', 'grand-hold', 'slicing-hold'].map((id) => ARTWORK_MAP[id]).filter(Boolean);

    ctx.at(600, () => {
      place(tap, ARTWORK_MAP['sharpness-2'], 0, 0);
      place(tap, ARTWORK_MAP['speedy-1'], 3, 0);
      place(tap, ARTWORK_MAP['technique-1'], 0, 2);
      note.setText('the loom you died with');
    });
    ctx.at(3200, () => {
      note.setText('💀 …and the two pieces that survived it');
      tap.placed = tap.placed.slice(-2);
      tap.grid = new Array(TAPESTRY_SIZE * TAPESTRY_SIZE).fill(null);
      for (const p of tap.placed) {
        const def = ARTWORK_MAP[p.id];
        for (const [cx2, cy2] of def.cells) tap.grid[(p.gy + cy2) * TAPESTRY_SIZE + (p.gx + cx2)] = def.id;
      }
    });
    ctx.at(6000, () => { note.setText('and three artworks only Salvage can offer'); });

    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      g.fillStyle(ctx.tint(CLT.loom), 0.92);
      g.fillRoundedRect(ox - 7, oy - 7, TAPESTRY_SIZE * cell + 14, TAPESTRY_SIZE * cell + 14, 6);
      for (let gy = 0; gy < TAPESTRY_SIZE; gy++) {
        for (let gx = 0; gx < TAPESTRY_SIZE; gx++) {
          const id = tap.grid[gy * TAPESTRY_SIZE + gx];
          loomCell(g, ctx.tint, ox + gx * cell + 1, oy + gy * cell + 1, cell - 2,
            id ? ARTWORK_MAP[id]?.color ?? CLT.cloth : null, 1);
        }
      }
      if (elapsed < 6000) return;
      extra.forEach((def, i) => {
        const sc = 13;
        const bx = ox + TAPESTRY_SIZE * cell + 34;
        const by = oy + i * 44;
        for (const [cx2, cy2] of def.cells) {
          loomCell(g, ctx.tint, bx + cx2 * sc, by + cy2 * sc, sc - 2, def.color, 1);
        }
      });
    });
  },
};

// ══ MASTERY — Outfit Change ═══════════════════════════════════════════

export const outfitChange: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Mastery passive — Space sheds what you are wearing. Four outfits, four different things to be resistant to, swapped mid-fight.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    av.setFacing(ctx.aim);
    scarf(ctx);
    const name = label(ctx, ctx.w * 0.5, 14, hex(CLT.clothPale), 13);
    const effect = label(ctx, ctx.w * 0.5, ctx.h - 16, hex(CLT.clothPale), 11);
    const blurb: Record<Outfit, string> = {
      suit: 'take 3 less from every source',
      coat: '10% less damage from everything',
      silk: 'every negative status lasts 33% less',
      hoodie: 'AOE and piercing hits land for 20% less',
    };
    let i = 0;
    const show = (): void => {
      const o = OUTFITS[i % OUTFITS.length];
      const from = OUTFIT_COLOR[OUTFITS[(i + OUTFITS.length - 1) % OUTFITS.length]];
      if (av instanceof ClothAvatar) av.setOutfit(o);
      const at = ctx.casterAt();
      fx.shed(at.x, at.y, from, OUTFIT_COLOR[o]);
      name.setText(`${OUTFIT_EMOJI[o]}  ${OUTFIT_NAME[o]}`);
      name.setColor(hex(OUTFIT_COLOR[o] === CLT.suit ? CLT.clothPale : OUTFIT_COLOR[o]));
      effect.setText(blurb[o]);
      i++;
    };
    show();
    for (let k = 1; k <= 4; k++) ctx.at(k * 2400, show);
  },
};

// ══ MASTERY — Wretched Scarf ══════════════════════════════════════════

export const wretchedScarf: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Mastery — wrap up for three seconds. Nothing gets through, the scarf stops being a hitbox, and all of it comes back out as one blast.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 180, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    let wrapped = false;
    scarf(ctx, 6, { segments: () => (wrapped ? 2 : 13) });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const read = label(ctx, ctx.w * 0.5, 12, hex(CLT.clothPale), 12);
    let stored = 0;
    let t = 0;

    ctx.at(900, () => {
      wrapped = true;
      stored = 0;
      av.play('clap', 0, 400);
      const at = ctx.casterAt();
      fx.burst(at.x, at.y, 60, CLT.clothDeep);
    });
    for (let i = 0; i < 5; i++) {
      ctx.at(1200 + i * 520, () => {
        if (!wrapped) return;
        stored += 14;
        const at = ctx.casterAt();
        float(ctx, at.x + 22, at.y - 20, 'NEGATED', hex(CLT.clothPale), 10);
        fx.lint(at.x, at.y, 3, 12, 260, CLT.clothDeep);
      });
    }
    ctx.at(3900, () => {
      wrapped = false;
      const at = ctx.casterAt();
      const payload = Math.round(stored * 0.9);
      fx.burst(at.x, at.y, 190, CLT.clothDeep);
      float(ctx, victim.x, victim.y - 26, `-${payload}`, '#ffdddd', 13);
      float(ctx, at.x, at.y - 44, `🧣 ${payload} RETURNED`, hex(CLT.clothPale), 12);
      stored = 0;
    });

    ctx.onFrame((dt) => {
      t += dt / 1000;
      g.clear();
      if (!wrapped) { read.setText(''); return; }
      const at = ctx.casterAt();
      for (let i = 0; i < 5; i++) {
        const a = t * 3 + (i / 5) * Math.PI * 2;
        g.lineStyle(4.5, ctx.tint(i % 2 ? CLT.clothDeep : CLT.cloth), 0.9);
        g.strokeEllipse(at.x, at.y, 30 - i * 2 + Math.sin(a) * 2, 34 - i * 2.4);
      }
      read.setText(`🧣  ${stored} banked`);
    });
  },
};

/** Exported so the deck's own table can be sanity-checked by the codex validator. */
export const ARTWORK_COUNT = ARTWORKS.length;
