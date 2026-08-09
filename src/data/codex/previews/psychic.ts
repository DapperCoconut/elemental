import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  PSY, PsychicAvatar, PsychicFx, comaSwirl, destinyGhost, focusMark, foresightPath, keyChip,
  lashPoints, migraineMark, mindSigil, psiWhip, stressCracks, thirdEye,
} from '../../../elements/kits/PsychicVisuals';

/**
 * Psychic's showcases.
 *
 * Psychic puts nothing physical in the arena — there is no `proj-psychic` and never will be, so
 * there is nothing for `ctx.fly` to carry. Everything the element does is data repainted into two
 * Graphics layers by the kit, which means every loop here keeps the same little state records the
 * kit keeps (a lash, a pool, a queue) and paints them with the same exported painters:
 * `lashPoints` + `psiWhip` for the cord, `stressCracks` for the pool, `foresightPath` /
 * `destinyGhost` / `keyChip` for the passive, `comaSwirl` for a coma. The one-shots go through a
 * real `PsychicFx` with a sticky sink.
 */

// ── Staging ───────────────────────────────────────────────────────────

const HIT_R = 18;
const BODY_R = 22;
const WHIP_LEN = 196;
const CRACK_T = 0.55;

function fxOf(ctx: PreviewCtx): PsychicFx {
  return ctx.capture(() => new PsychicFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

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
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/**
 * The monk's rig, or null when the player has a skin equipped that replaces the character —
 * `setFocus`/`setBlind` live on `PsychicAvatar` and nowhere else, so they are called through this.
 */
function monk(av: unknown): PsychicAvatar | null {
  return av instanceof PsychicAvatar ? av : null;
}

/**
 * The pool over a body: the cracks, the running total and the ten-second fuse bar, laid out
 * exactly as `paintAir` lays them out.
 */
function stressReadout(
  ctx: PreviewCtx, at: { x: number; y: number },
  read: () => { amount: number; fuse: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  const num = label(ctx, 0, 0, hex(PSY.stress), 13);
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const s = read();
    if (s.amount < 0.5) { num.setVisible(false); return; }
    const t = elapsed / 1000;
    stressCracks(g, ctx.tint, at.x, at.y - 4, Math.min(1, s.amount / 80), 0.85, 41, t * 7);
    const by = at.y - 84;
    g.fillStyle(ctx.tint(PSY.stressDeep), 0.5);
    g.fillRect(at.x - 20, by + 9, 40, 2.6);
    g.fillStyle(ctx.tint(PSY.stress), 0.95);
    g.fillRect(at.x - 20, by + 9, 40 * Phaser.Math.Clamp(s.fuse, 0, 1), 2.6);
    num.setVisible(true).setText(`${Math.round(s.amount)}`).setPosition(at.x, by);
  });
}

/** The prediction bar: up to three notched chips, next one rightmost, plus the eye on the end. */
function queueBar(
  ctx: PreviewCtx, at: { x: number; y: number },
  read: () => { key: string; big: boolean; heat: number }[],
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  const texts: Phaser.GameObjects.Text[] = [];
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const chips = read();
    const t = elapsed / 1000;
    for (let i = chips.length; i < texts.length; i++) texts[i].setVisible(false);
    if (!chips.length) return;
    const w = 26, gap = 4;
    const total = chips.length * w + (chips.length - 1) * gap;
    const y = at.y - 62;
    for (let i = 0; i < chips.length; i++) {
      const c = chips[i];
      const x = at.x - total / 2 + w / 2 + i * (w + gap);
      keyChip(g, ctx.tint, x, y, w, 18, 0.95, c.heat);
      if (c.big) mindSigil(g, ctx.tint, x, y, 12, 0.35 * c.heat, { phase: t * 2, sides: 5, eye: false });
      let txt = texts[i];
      if (!txt) {
        txt = ctx.adopt(ctx.scene.add.text(0, 0, '', {
          fontFamily: 'monospace', fontSize: '11px', color: hex(PSY.aether), fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(17));
        texts.push(txt);
      }
      txt.setVisible(true)
        .setStyle({ fontSize: c.key.length > 2 ? '8px' : '11px', color: hex(c.big ? PSY.gold : PSY.aether) })
        .setText(c.key).setPosition(x, y);
    }
    thirdEye(g, ctx.tint, at.x + total / 2 + 11, y, 5.5, 0.6 + 0.4 * Math.sin(t * 4), 0.9,
      { glow: 0.5, lash: false });
  });
}

/**
 * A lash thrown from `from` at `ang`, drawn over its real 260ms with the crack resolved at 55%.
 * `onCrack` is handed whether the target fell inside the tip band, worked out with the kit's own
 * segment test rather than guessed.
 */
function throwLash(
  ctx: PreviewCtx, fx: PsychicFx, from: { x: number; y: number }, ang: number,
  target: { x: number; y: number } | null,
  onCrack: (hit: boolean, tip: boolean) => void,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
  const start = { t: 0 };
  let cracked = false;
  let tipHit = false;
  let landed = false;

  // Resolve against the shape it will be drawn in at the crack — the kit does the same, which is
  // why the line that lands and the line that is seen to land are never two different lines.
  if (target) {
    const pts = lashPoints(from.x, from.y, ang, CRACK_T, { len: WHIP_LEN, crackT: CRACK_T });
    const reach = HIT_R + BODY_R;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const u = len2 > 0 ? Phaser.Math.Clamp(((target.x - a.x) * dx + (target.y - a.y) * dy) / len2, 0, 1) : 0;
      if (Phaser.Math.Distance.Between(a.x + dx * u, a.y + dy * u, target.x, target.y) > reach) continue;
      landed = true;
      if (i / (pts.length - 1) >= 0.77) tipHit = true;
    }
  }

  ctx.onFrame((dt) => {
    start.t += dt / 260;
    g.clear();
    if (start.t >= 1) return;
    const pts = lashPoints(from.x, from.y, ang, start.t, { len: WHIP_LEN, crackT: CRACK_T });
    const alpha = start.t < 0.6 ? 1 : 1 - (start.t - 0.6) / 0.4;
    psiWhip(g, ctx.tint, pts, alpha, {
      tipHot: tipHit ? Phaser.Math.Clamp(1 - Math.abs(start.t - CRACK_T) * 4, 0, 1) : 0,
    });
    if (!cracked && start.t >= CRACK_T) {
      cracked = true;
      const end = pts[pts.length - 1];
      const at = landed && target ? target : end;
      fx.crack(at.x, at.y, ang, tipHit);
      onCrack(landed, tipHit);
    }
  });
}

// ══ CLICK — Headache ══════════════════════════════════════════════════

export const headache: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'Click — 12 damage and 5 stress anywhere on the 196px cord; the last 45px is worth 10',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.4);

    // Two marks: one right on top of him, one out at the very end of the lash. The whole skill in
    // the ability is which of the two you choose to stand at.
    const near = { x: ctx.cx + 62, y: ctx.cy - 6 };
    const far = { x: ctx.cx + WHIP_LEN * 0.9, y: ctx.cy + 4 };
    dummyAt(ctx, near);
    dummyAt(ctx, far);
    const pool = { near: 0, far: 0 };
    stressReadout(ctx, near, () => ({ amount: pool.near, fuse: 1 }));
    stressReadout(ctx, far, () => ({ amount: pool.far, fuse: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#c496ff', 11);

    const lash = (at: number, target: { x: number; y: number }, bank: 'near' | 'far'): void => ctx.at(at, () => {
      const hand = { x: ctx.cx + 16, y: ctx.cy - 2 };
      const ang = Math.atan2(target.y - hand.y, target.x - hand.x);
      av.play('sweep', ang);
      throwLash(ctx, fx, hand, ang, target, (hit, tip) => {
        if (!hit) return;
        pool[bank] += tip ? 10 : 5;
        float(ctx, target.x, target.y - 22, '12', '#ffb3aa', 14);
        float(ctx, target.x + 16, target.y - 36, tip ? '+10' : '+5', hex(PSY.stress), 12);
        if (tip) float(ctx, target.x, target.y - 56, '⚡ TIP!', hex(PSY.gold), 11);
      });
    });

    ctx.at(300, () => readout.setText('point blank — the body of the cord: 12 damage, +5 stress'));
    lash(700, near, 'near');
    lash(2100, near, 'near');
    ctx.at(3400, () => readout.setText('at the very end of the reach — past 77% of the cord is the tip'));
    lash(3900, far, 'far');
    lash(5300, far, 'far');
    lash(6700, far, 'far');
    ctx.at(8000, () => readout.setText('same 12 damage either way — 10 stress a lash instead of 5'));
  },
};

// ══ CLICK+ — Whip Snap ════════════════════════════════════════════════

export const headacheUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Click+ — catch the ghost at the end of their route: 20 stress, no damage, and they arrive',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.8);

    // A mark walking a straight line, so the end of its thread sits well clear of its body and
    // there is something to aim at. The projection is the same 20 steps over 2 seconds the kit
    // runs, replayed off a constant velocity.
    const enemy = { x: ctx.cx + 70, y: ctx.cy + 34 };
    const vel = { x: 82, y: -30 };
    const moving = { on: true };
    dummyAt(ctx, enemy);
    const pool = { amount: 0 };
    stressReadout(ctx, enemy, () => ({ amount: pool.amount, fuse: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd166', 11);

    /** Where the thread ends this frame, or null when they are not going anywhere. */
    const destiny = (): { x: number; y: number } | null => {
      if (!moving.on) return null;
      let px = enemy.x, py = enemy.y, vx = vel.x, vy = vel.y;
      for (let i = 0; i < 20; i++) {
        px = Phaser.Math.Clamp(px + vx * (2 / 20), 32, ctx.w - 32);
        py = Phaser.Math.Clamp(py + vy * (2 / 20), 32, ctx.h - 32);
        vx *= 0.97; vy *= 0.97;
      }
      return Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) < 24 ? null : { x: px, y: py };
    };

    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    ctx.onFrame((dt, elapsed) => {
      ground.clear(); air.clear();
      const t = elapsed / 1000;
      if (moving.on) {
        enemy.x += vel.x * (dt / 1000);
        enemy.y += vel.y * (dt / 1000);
        if (enemy.x > ctx.w - 70 || enemy.x < 70) vel.x *= -1;
        if (enemy.y > ctx.h - 44 || enemy.y < 44) vel.y *= -1;
      }
      let px = enemy.x, py = enemy.y, vx = vel.x, vy = vel.y;
      const pts = [{ x: px, y: py }];
      for (let i = 0; i < 20; i++) {
        px = Phaser.Math.Clamp(px + vx * (2 / 20), 32, ctx.w - 32);
        py = Phaser.Math.Clamp(py + vy * (2 / 20), 32, ctx.h - 32);
        vx *= 0.97; vy *= 0.97;
        pts.push({ x: px, y: py });
      }
      if (moving.on) foresightPath(ground, ctx.tint, pts, 0.95, t);
      const end = destiny();
      if (!end) return;
      destinyGhost(air, ctx.tint, end.x, end.y, 0.95, t);
      // The 26px window the cord is really tested against, drawn at exactly that size.
      air.lineStyle(1.4, ctx.tint(PSY.gold), 0.5 + 0.25 * Math.sin(t * 5));
      air.strokeCircle(end.x, end.y, 26);
    });

    ctx.at(300, () => readout.setText('the gold ring on the ghost is a real hitbox now — 26px, where they will be'));

    // ── The snap ──
    const snap = (at: number): void => ctx.at(at, () => {
      const to = destiny();
      if (!to) return;
      const hand = { x: ctx.cx + 16, y: ctx.cy - 2 };
      const ang = Math.atan2(to.y - hand.y, to.x - hand.x);
      av.play('sweep', ang);
      throwLash(ctx, fx, hand, ang, null, () => {
        const from = { x: enemy.x, y: enemy.y };
        enemy.x = to.x; enemy.y = to.y;
        ctx.capture(() => fx.snap(from.x, from.y, to.x, to.y));
        pool.amount += 20;
        float(ctx, to.x, to.y - 46, '🪢 SNAPPED', hex(PSY.gold), 12);
        float(ctx, to.x + 18, to.y - 30, '+20', hex(PSY.stress), 13);
        float(ctx, to.x, to.y - 12, 'no damage', '#8e97ad', 10);
      });
    });

    ctx.at(1500, () => readout.setText('lay the cord across it and the lash lands on empty floor…'));
    snap(2000);
    ctx.at(3000, () => readout.setText('…and they are hauled to the spot the thread promised'));
    ctx.at(4400, () => readout.setText('20 stress — double the best tip hit — and not one point of damage'));
    snap(5200);
    ctx.at(6600, () => readout.setText('the counterplay is simply to stop walking:'));
    ctx.at(7400, () => { moving.on = false; readout.setText('a body standing still has no future to be pulled into'); });
    ctx.at(8600, () => {
      const hand = { x: ctx.cx + 16, y: ctx.cy - 2 };
      const ang = Math.atan2(enemy.y - hand.y, enemy.x - hand.x);
      av.play('sweep', ang);
      throwLash(ctx, fx, hand, ang, enemy, (hit, tip) => {
        if (!hit) return;
        pool.amount += tip ? 10 : 5;
        float(ctx, enemy.x, enemy.y - 22, '12', '#ffb3aa', 14);
        float(ctx, enemy.x + 16, enemy.y - 36, tip ? '+10' : '+5', hex(PSY.stress), 12);
      });
      readout.setText('with no ghost to catch, the Click is exactly the Click it always was');
    });
  },
};

// ══ E — Mind Control ══════════════════════════════════════════════════

export const mindControl: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'E — takes the front of their queue; the ability never happens and its cooldown restarts',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummyAt(ctx, victim);

    // Their queue, soonest-first — drawn reversed so the next one is rightmost, as the bar does.
    const queue: { key: string; big: boolean; at: number }[] = [];
    queueBar(ctx, victim, () => queue.slice(0, 3).reverse().map((e, i, arr) => ({
      key: e.key, big: e.big,
      heat: i === arr.length - 1 ? 0.9 : 0.35,
    })));
    const readout = label(ctx, ctx.w * 0.5, 12, '#c496ff', 11);

    const press = (at: number, key: string, big = false): void => ctx.at(at, () => {
      queue.push({ key, big, at });
      float(ctx, victim.x, victim.y - 84, `pressed ${key}`, '#8e97ad', 10);
    });
    press(600, 'Click');
    press(1300, 'E');
    press(2000, 'Q', true);
    ctx.at(2300, () => readout.setText('three presses held — gold chip means an ultimate is in there'));

    ctx.at(3600, () => {
      readout.setText('E takes the front of the queue — the Click, which was about to land');
      av.play('clap', ctx.aim);
      ctx.capture(() => fx.seize(victim.x, victim.y, ctx.cx, ctx.cy));
      const taken = queue.shift();
      float(ctx, victim.x, victim.y - 70, `🚫 ${taken?.key} SEIZED`, hex(PSY.gold), 12);
    });
    ctx.at(5000, () => readout.setText('so wait for the gold one — a stolen ultimate is a fresh 30 seconds'));
    ctx.at(6200, () => {
      queue.shift();
      float(ctx, victim.x, victim.y - 70, 'E fires (2s late)', '#8e97ad', 10);
    });
    ctx.at(7000, () => {
      av.play('clap', ctx.aim);
      ctx.capture(() => fx.seize(victim.x, victim.y, ctx.cx, ctx.cy));
      queue.shift();
      float(ctx, victim.x, victim.y - 70, '🚫 Q SEIZED', hex(PSY.gold), 13);
      readout.setText('gone, and back on a full cooldown from this instant');
    });
    ctx.at(8600, () => {
      float(ctx, ctx.cx, ctx.cy - 46, 'NOTHING TO SEIZE', hex(PSY.violetLit), 11);
      readout.setText('pressed on an empty queue it is refused before it stamps — no cooldown paid');
    });
  },
};

// ══ E+ — Ability Theft ════════════════════════════════════════════════

export const mindControlUpgraded: PreviewScript = {
  duration: 10500,
  scale: 0.9,
  caption: 'E+ — whatever slot you rob, your own key in that slot comes back 5 seconds sooner',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 155, y: ctx.cy };
    dummyAt(ctx, victim);

    const queue: { key: string; big: boolean }[] = [];
    queueBar(ctx, victim, () => queue.slice(0, 3).reverse().map((e, i, arr) => ({
      key: e.key, big: e.big, heat: i === arr.length - 1 ? 0.9 : 0.35,
    })));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd166', 11);

    // The thief's own bar, as five cards draining — the only way to show a refund is to show
    // the thing that gets refunded.
    const MINE: { key: string; cd: number; left: number }[] = [
      { key: 'Click', cd: 0.7, left: 0 },
      { key: 'E', cd: 5, left: 5 },
      { key: 'R', cd: 6, left: 4.4 },
      { key: 'F', cd: 15, left: 12 },
      { key: 'Q', cd: 30, left: 27 },
    ];
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const caps = MINE.map(() => label(ctx, 0, 0, hex(PSY.aether), 9));
    ctx.onFrame((dt) => {
      bar.clear();
      const s = dt / 1000;
      const y = ctx.h - 26;
      const w = 30, gap = 6;
      const total = MINE.length * w + (MINE.length - 1) * gap;
      for (let i = 0; i < MINE.length; i++) {
        const m = MINE[i];
        m.left = Math.max(0, m.left - s);
        const x = ctx.cx - total / 2 + w / 2 + i * (w + gap);
        const ready = m.left <= 0;
        keyChip(bar, ctx.tint, x, y, w, 20, 0.95, ready ? 0.85 : 0.15);
        if (!ready) {
          // The unfilled part of the card, so a five-second jump is visible as a jump.
          bar.fillStyle(ctx.tint(PSY.ink), 0.6);
          bar.fillRect(x - w / 2, y - 10, w, 20 * (m.left / m.cd));
        }
        caps[i].setText(m.key).setPosition(x, y)
          .setStyle({ fontSize: m.key.length > 2 ? '8px' : '10px', color: hex(ready ? PSY.gold : PSY.violetLit) });
      }
    });

    const press = (at: number, key: string, big = false): void => ctx.at(at, () => {
      queue.push({ key, big });
      float(ctx, victim.x, victim.y - 84, `they press ${key}`, '#8e97ad', 10);
    });
    const steal = (at: number, note: string): void => ctx.at(at, () => {
      const taken = queue.shift();
      if (!taken) return;
      av.play('clap', ctx.aim);
      ctx.capture(() => fx.seize(victim.x, victim.y, ctx.cx, ctx.cy));
      float(ctx, victim.x, victim.y - 70, `🚫 ${taken.key} SEIZED`, hex(PSY.gold), 12);
      const mine = MINE.find((m) => m.key === taken.key);
      if (mine) mine.left = Math.max(0, mine.left - 5);
      float(ctx, ctx.cx, ctx.cy - 54, `⏱ ${taken.key} −5s`, hex(PSY.gold), 13);
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('your own five cards, cooling — watch the one you steal'));
    press(900, 'F');
    steal(2200, 'stole their F — five seconds comes straight off your Migraine');
    press(3600, 'Q', true);
    steal(4900, 'stole their ultimate — and five seconds off your own Coma');
    press(6300, 'E');
    steal(7500, 'stole their E — Mind Control costs 5s, so the theft paid for itself');
    ctx.at(9000, () => readout.setText('matched on the slot, not the ability — their Fireball refunds your Headache'));
  },
};

// ══ R — Dodge Destiny ═════════════════════════════════════════════════

export const dodgeDestiny: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'R — 1.25s untouchable, re-asserted every frame, against a 2s telegraph',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    const eye = monk(av);
    av.setFacing(ctx.aim);
    const enemy = { x: ctx.cx + 190, y: ctx.cy };
    dummyAt(ctx, enemy);
    const queue: { key: string; big: boolean }[] = [];
    queueBar(ctx, enemy, () => queue.map((e, i, arr) => ({
      key: e.key, big: e.big, heat: i === arr.length - 1 ? 0.9 : 0.35,
    })));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd166', 11);

    // The chip lands, and the telegraph is exactly as long as the window.
    ctx.at(600, () => {
      queue.push({ key: 'Q', big: true });
      readout.setText('their ultimate is queued — you have two seconds of warning');
    });
    ctx.at(1900, () => {
      readout.setText('R with 700ms to spare: 1.25 seconds of nothing landing');
      av.play('flex');
      eye?.setBlind(true);
      ctx.capture(() => fx.veil(ctx.cx, ctx.cy, 1250));
      float(ctx, ctx.cx, ctx.cy - 50, '👁️ DESTINY DODGED', hex(PSY.gold), 12);
    });
    ctx.at(2600, () => {
      queue.pop();
      readout.setText('and it resolves into an invincible body');
      ctx.capture(() => {
        fx.throb(ctx.cx, ctx.cy);
        float(ctx, ctx.cx, ctx.cy - 26, 'BLOCKED', hex(PSY.aether), 13);
      });
    });
    ctx.at(3200, () => { eye?.setBlind(false); readout.setText('the third eye is shut for the whole window and reopens after it'); });
    ctx.at(5000, () => readout.setText('nothing in the game can cut it short — invincibility is rewritten every frame'));
  },
};

// ══ R+ — Infinite Perspective ═════════════════════════════════════════

export const dodgeDestinyUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'R+ — 50 damage inside 2 seconds and it presses itself, refusing the hit that got there',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    const eye = monk(av);
    av.setFacing(ctx.aim);
    const enemy = { x: ctx.cx + 200, y: ctx.cy };
    dummyAt(ctx, enemy);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffd166', 11);

    // The rolling window, drawn as a bar that fills to 50 and empties when it fires.
    const win = { hits: [] as { at: number; amt: number }[], ready: true, cd: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const tally = label(ctx, 0, 0, hex(PSY.stress), 11);
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      win.cd = Math.max(0, win.cd - dt / 1000);
      win.ready = win.cd <= 0;
      win.hits = win.hits.filter((h) => elapsed - h.at < 2000);
      const sum = win.hits.reduce((n, h) => n + h.amt, 0);
      const bx = ctx.cx, by = ctx.cy - 74, w = 96;
      g.fillStyle(ctx.tint(PSY.ink), 0.75);
      g.fillRect(bx - w / 2, by, w, 7);
      g.fillStyle(ctx.tint(win.ready ? PSY.stress : PSY.robe), 0.95);
      g.fillRect(bx - w / 2, by, w * Math.min(1, sum / 50), 7);
      g.lineStyle(1.2, ctx.tint(win.ready ? PSY.gold : PSY.robeDeep), 0.9);
      g.strokeRect(bx - w / 2, by, w, 7);
      tally.setText(win.ready ? `${Math.round(sum)} / 50` : `on cooldown ${win.cd.toFixed(1)}s`)
        .setPosition(bx, by - 10)
        .setStyle({ color: hex(win.ready ? PSY.stress : PSY.violetLit) });
    });

    /** One hit landing on the monk, unless it is the one that trips the read. */
    const hit = (at: number, amt: number): void => ctx.at(at, () => {
      const sum = win.hits.reduce((n, h) => n + h.amt, 0);
      if (win.ready && sum + amt >= 50) {
        win.hits = [];
        win.cd = 6;
        av.play('flex');
        eye?.setBlind(true);
        ctx.capture(() => fx.veil(ctx.cx, ctx.cy, 1250));
        float(ctx, ctx.cx, ctx.cy - 56, '👁️ INFINITE PERSPECTIVE', hex(PSY.gold), 12);
        float(ctx, ctx.cx, ctx.cy - 26, 'REFUSED', hex(PSY.aether), 14);
        // `at` is a delayedCall from *now*, so the reopen is 1250ms from this callback, not
        // 1250ms from the start of the loop.
        ctx.at(1250, () => eye?.setBlind(false));
        return;
      }
      win.hits.push({ at, amt });
      ctx.capture(() => fx.throb(ctx.cx, ctx.cy));
      float(ctx, ctx.cx + (Math.random() - 0.5) * 20, ctx.cy - 20, `${amt}`, '#ffb3aa', 13);
    });

    ctx.at(300, () => readout.setText('chip damage counts — it is 50 inside a rolling 2 seconds, not 50 in one blow'));
    hit(800, 12);
    hit(1500, 14);
    hit(2100, 11);
    hit(2600, 18);
    ctx.at(2900, () => readout.setText('the hit that crossed 50 never landed — and the window is emptied with it'));
    ctx.at(4400, () => readout.setText('it spends the real 6-second cooldown, so it is one free read and no more'));
    hit(5200, 46);
    ctx.at(5600, () => readout.setText('46 on a spent cooldown lands in full: this is not a passive shield'));
    ctx.at(7200, () => readout.setText('back up — and a single big hit trips it on its own'));
    ctx.at(8000, () => { win.cd = 0; });
    hit(8400, 64);
    ctx.at(9400, () => readout.setText('the whole 1.25s window still runs, exactly as if you had pressed it'));
  },
};

// ══ F — Migraine ══════════════════════════════════════════════════════

export const migraine: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'F — a charge at the cursor, 2.5s fuse, then 3s of ruined aim in a 100px blast',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const enemy = { x: ctx.cx + 250, y: ctx.cy - 4 };
    dummyAt(ctx, enemy);
    const pool = { amount: 0 };
    stressReadout(ctx, enemy, () => ({ amount: pool.amount, fuse: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3355', 11);

    // The charge, painted by the same function the kit paints it with. `firesAt` is elapsed-ms
    // rather than clock time, since a preview loop restarts from zero.
    const MARK = { x: ctx.cx + 150, y: ctx.cy - 4, r: 100 };
    const charge = { plantedAt: -1, firesAt: -1 };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      if (charge.firesAt < 0 || elapsed > charge.firesAt) return;
      const t = 1 - (charge.firesAt - elapsed) / (charge.firesAt - charge.plantedAt);
      migraineMark(ground, ctx.tint, MARK.x, MARK.y, MARK.r, t);
    });

    // Their shots, drawn as the aim line they *think* they are taking versus the one they get.
    const shots: { ang: number; wide: boolean; born: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const trueAng = Math.atan2(ctx.cy - enemy.y, ctx.cx - enemy.x);
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      // Live, because they close ground over the fuse — a fixed length would overshoot the monk.
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, ctx.cx, ctx.cy);
      for (const s of shots) {
        const t = Phaser.Math.Clamp((elapsed - s.born) / 700, 0, 1);
        if (t >= 1) continue;
        const d = dist * t;
        g.lineStyle(2.4, ctx.tint(s.wide ? PSY.stress : PSY.violetLit), (1 - t) * 0.9);
        g.lineBetween(enemy.x, enemy.y, enemy.x + Math.cos(s.ang) * d, enemy.y + Math.sin(s.ang) * d);
        g.fillStyle(ctx.tint(s.wide ? PSY.stress : PSY.aether), 1 - t * 0.6);
        g.fillCircle(enemy.x + Math.cos(s.ang) * d, enemy.y + Math.sin(s.ang) * d, 3.4);
      }
    });

    ctx.at(300, () => readout.setText('their aim, honest — every shot on the line'));
    for (let i = 0; i < 2; i++) {
      ctx.at(500 + i * 550, (): void => { shots.push({ ang: trueAng, wide: false, born: 500 + i * 550 }); });
    }

    // ── The plant ──
    // Put down in front of them rather than on them: the fuse is 2.5 seconds, and the passive
    // has already drawn where they are walking.
    ctx.at(1700, () => {
      av.play('slam', Math.atan2(MARK.y - ctx.cy, MARK.x - ctx.cx));
      charge.plantedAt = 1700;
      charge.firesAt = 4200;
      ctx.capture(() => fx.plant(MARK.x, MARK.y, MARK.r * 0.34));
      readout.setText('the charge goes down where they are going to be — 2.5 seconds of fuse');
    });
    // They walk into it, which is the only reason a placed charge ever lands.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1700 || elapsed > 4200) return;
      enemy.x = Math.max(MARK.x + 12, enemy.x - (dt / 1000) * 44);
    });
    ctx.at(3300, () => readout.setText('the rim is exactly how far it reaches, and the hand on it is the fuse'));

    // ── The detonation ──
    ctx.at(4200, () => {
      ctx.capture(() => {
        fx.detonation(MARK.x, MARK.y, MARK.r);
        fx.throb(enemy.x, enemy.y);
      });
      float(ctx, enemy.x, enemy.y - 54, '🤯 MIGRAINE', hex(PSY.stress), 13);
      pool.amount += 10;
      float(ctx, enemy.x + 16, enemy.y - 34, '+10', hex(PSY.stress), 12);
      readout.setText('100px blast — 10 stress for being caught, then 3s of ruined aim');
    });
    // 2 in 3 wide, which is exactly the rate the arena rolls.
    const pattern = [true, true, false, true, false, true, true];
    for (let i = 0; i < pattern.length; i++) {
      const born = 4500 + i * 400;
      ctx.at(born, (): void => {
        const off = (i % 2 ? -1 : 1) * Phaser.Math.DegToRad(20 + (i * 5) % 15);
        shots.push({ ang: pattern[i] ? trueAng + off : trueAng, wide: pattern[i], born });
      });
    }
    ctx.at(5000, () => readout.setText('66% of their casts rotated 20–35° to one side or the other'));
    for (let s = 1; s <= 3; s++) {
      ctx.at(4200 + s * 1000, () => {
        pool.amount += 10;
        float(ctx, enemy.x + (s - 2) * 12, enemy.y - 34, '+10', hex(PSY.stress), 12);
      });
    }
    ctx.at(7600, () => readout.setText('40 stress banked, and every point pushed the fuse back to a full 10 seconds'));
    ctx.at(9200, () => readout.setText('the mark is on the floor the whole time — a charge you see coming is a charge you can walk out of'));
  },
};

// ══ F+ — Mind's Focus ═════════════════════════════════════════════════

export const migraineUpgraded: PreviewScript = {
  duration: 13000,
  scale: 0.82,
  caption: 'F+ — hold up to 5s: longer fuse, 200px blast, and +10% of their pool per second held',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const enemy = { x: ctx.cx + 190, y: ctx.cy - 4 };
    dummyAt(ctx, enemy);
    // Somebody already carrying 60 — the whole point of the upgrade is what it does to a pool
    // that is already there.
    const pool = { amount: 60 };
    stressReadout(ctx, enemy, () => ({ amount: pool.amount, fuse: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#c496ff', 11);

    const MARK = { x: ctx.cx + 150, y: ctx.cy - 4 };
    /** The wind-up in his hand, then the charge on the floor — never both. */
    const focus = { start: -1 };
    const charge = { plantedAt: -1, firesAt: -1, r: 100 };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      const t = elapsed / 1000;
      if (focus.start >= 0) {
        const held = Math.min(5000, elapsed - focus.start) / 1000;
        focusMark(ground, ctx.tint, MARK.x, MARK.y, 100 + held * 20, held / 5, t);
        return;
      }
      if (charge.firesAt < 0 || elapsed > charge.firesAt) return;
      const k = 1 - (charge.firesAt - elapsed) / (charge.firesAt - charge.plantedAt);
      migraineMark(ground, ctx.tint, MARK.x, MARK.y, charge.r, k);
    });

    ctx.at(400, () => {
      focus.start = 400;
      monk(av)?.setFocus(1);
      av.play('flex');
      readout.setText('F held — the ring on the cursor is the blast you would get right now');
    });
    ctx.at(2600, () => readout.setText('the arc closing the rim is the wind-up: a full circle is five seconds'));
    // Released at the top, which is where it fires itself anyway.
    ctx.at(5400, () => {
      focus.start = -1;
      charge.plantedAt = 5400;
      charge.firesAt = 5400 + 6500;   // 2.5s base + 0.8s per second held
      charge.r = 200;
      av.play('slam', Math.atan2(MARK.y - ctx.cy, MARK.x - ctx.cx));
      ctx.capture(() => fx.plant(MARK.x, MARK.y, charge.r * 0.34));
      float(ctx, MARK.x, MARK.y - 26, '🌀 5.0s FOCUS', hex(PSY.violetLit), 12);
      readout.setText('fully wound: 200px across, and 6.5 seconds of fuse rather than 2.5');
    });
    ctx.at(7200, () => readout.setText('a bigger promise, and a longer one — they have all that time to leave'));
    ctx.at(9000, () => readout.setText('but the mark is 200px wide, and leaving 200px is not leaving 100px'));

    // The detonation, on a body already carrying 60.
    ctx.at(11900, () => {
      ctx.capture(() => {
        fx.detonation(MARK.x, MARK.y, charge.r);
        fx.throb(enemy.x, enemy.y);
      });
      float(ctx, enemy.x, enemy.y - 54, '🤯 MIGRAINE', hex(PSY.stress), 13);
      // 10 base + 4×5 flat + 60 × 50%.
      pool.amount += 60;
      float(ctx, enemy.x + 18, enemy.y - 34, '+60', hex(PSY.stress), 14);
      readout.setText('10 base + 20 flat + half the 60 they were already carrying = +60');
    });
  },
};

// ══ Q — Coma ══════════════════════════════════════════════════════════

export const coma: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Q — the pool ×1.5 as pierce damage, then 1 second face down per 20 detonated',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummyAt(ctx, victim);
    const pool = { amount: 80, fuse: 0.6 };
    stressReadout(ctx, victim, () => pool);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c496ff', 11);

    // The mandala under a comatose body, painted under it exactly as the ground layer does.
    const under = { on: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (under.on) comaSwirl(g, ctx.tint, victim.x, victim.y, 26, 0.9, elapsed / 1000);
    });

    ctx.at(400, () => readout.setText('80 stress sitting on them, fuse still running'));
    ctx.at(1600, () => {
      av.play('raise');
      pool.amount = 0;
      float(ctx, victim.x, victim.y - 74, '×1.5 → 120', hex(PSY.stress), 13);
      ctx.capture(() => fx.burst(victim.x, victim.y, 1));
      float(ctx, victim.x, victim.y - 24, '120', '#ffb3aa', 18);
      readout.setText('120 pierce damage — no armour, no absorb, no shield answers it');
    });
    ctx.at(2600, () => {
      under.on = true;
      ctx.capture(() => fx.sleep(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 58, '💤 COMA 6s', hex(PSY.violetLit), 13);
      readout.setText('120 ÷ 20 = 6 seconds face down: no walking, no casting');
    });
    // And what a coma really is: a battery.
    ctx.at(4000, () => readout.setText('and every hit on them is halved — the missing half is banked back'));
    for (let i = 0; i < 4; i++) {
      ctx.at(4400 + i * 900, () => {
        pool.amount += 6;
        pool.fuse = 1;
        float(ctx, victim.x - 18, victim.y - 24, '6', '#ffb3aa', 12);
        float(ctx, victim.x + 18, victim.y - 40, '+6', hex(PSY.stress), 11);
      });
    }
    ctx.at(8600, () => {
      under.on = false;
      readout.setText('they get up into a fresh pool with a fresh 10-second fuse on it');
    });
    ctx.at(10200, () => readout.setText('pressed with no pool anywhere it is refunded — "NO STRESS TO CASH"'));
  },
};

// ══ Q+ — Cycle of Abuse ═══════════════════════════════════════════════

export const comaUpgraded: PreviewScript = {
  duration: 13000,
  scale: 0.82,
  caption: 'Q+ — a comatose body bleeds 3 stress a second outward for 10, and you are in the blast',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    // Deliberately close: the shockwave is 120px and the monk is standing inside it.
    const victim = { x: ctx.cx + 96, y: ctx.cy };
    dummyAt(ctx, victim);
    const pool = { amount: 60, fuse: 0.7 };
    stressReadout(ctx, victim, () => pool);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3355', 11);

    const under = { on: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!under.on) return;
      comaSwirl(g, ctx.tint, victim.x, victim.y, 26, 0.9, elapsed / 1000);
      // The 120px reach, painted so the cost is legible rather than a surprise.
      g.lineStyle(1.2, ctx.tint(PSY.stressDeep), 0.4 + 0.15 * Math.sin(elapsed / 160));
      g.strokeCircle(victim.x, victim.y, 120);
    });

    ctx.at(400, () => readout.setText('60 stress cashed in — ×1.5 is 90, and 90 ÷ 20 is 4 seconds under'));
    ctx.at(1200, () => {
      av.play('raise');
      pool.amount = 0;
      ctx.capture(() => fx.burst(victim.x, victim.y, 1));
      float(ctx, victim.x, victim.y - 24, '90', '#ffb3aa', 18);
      float(ctx, victim.x, victim.y - 74, '×1.5 → 90', hex(PSY.stress), 13);
    });
    ctx.at(2200, () => {
      under.on = true;
      ctx.capture(() => fx.sleep(victim.x, victim.y));
      float(ctx, victim.x, victim.y - 58, '💤 COMA 4s', hex(PSY.violetLit), 13);
      readout.setText('and now the pool on them starts coming back out sideways');
    });
    // Four seconds of bleed. Each one drains the pool, hurts them, and hurts the monk.
    const bled = { total: 0 };
    ctx.at(3000, () => { pool.amount = 24; pool.fuse = 1; readout.setText('half of every hit while they are under is banked back as fresh stress'); });
    for (let i = 0; i < 4; i++) {
      ctx.at(3600 + i * 1000, () => {
        pool.amount = Math.max(0, pool.amount - 3);
        bled.total += 3;
        ctx.capture(() => fx.bleedBurst(victim.x, victim.y, 120));
        float(ctx, victim.x - 20, victim.y - 30, '−3', hex(PSY.stressDeep), 12);
        float(ctx, victim.x + 14, victim.y - 16, '3', '#ffb3aa', 11);
        // The monk is 96px away, which is inside 120.
        float(ctx, ctx.cx, ctx.cy - 22, '10', '#ffb3aa', 13);
      });
    }
    ctx.at(4600, () => readout.setText('3 a second off the pool, dealt to them — and 10 to everyone else in 120px'));
    ctx.at(6200, () => readout.setText('everyone else includes you. Standing over them to whip them costs 10 a second'));
    ctx.at(7900, () => {
      under.on = false;
      const back = Math.round(bled.total * 0.25);
      pool.amount += back;
      pool.fuse = 1;
      float(ctx, victim.x, victim.y - 66, `🔁 ${back} RETURNED`, hex(PSY.stress), 13);
      readout.setText(`they wake into a quarter of everything bled — ${bled.total} out, ${back} waiting`);
    });
    ctx.at(9800, () => readout.setText('the one body the shockwave can never touch is the one it came out of'));
    ctx.at(11400, () => readout.setText('a fresh pool with a full 10-second fuse, and the Q already halfway paid for'));
  },
};

// ══ PASSIVE — Opened Eyes ═════════════════════════════════════════════

export const openedEyes: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Passive — everything they press is held 2 seconds, and you are shown all of it',
  run(ctx) {
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.9);
    const enemy = { x: ctx.w * 0.52, y: ctx.cy + 18 };
    dummyAt(ctx, enemy, 5);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c496ff', 11);
    /** Their held presses, soonest-first. Declared up here because the route hook reads it. */
    const queue: { key: string; big: boolean; due: number }[] = [];

    // The route: the same 20 steps over 2 seconds the kit projects, replayed forward from a
    // walking enemy and clamped to the same 32px margin.
    const vel = { x: 96, y: -34 };
    const path = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    ctx.onFrame((dt, elapsed) => {
      path.clear(); air.clear();
      const t = elapsed / 1000;
      const s = dt / 1000;
      enemy.x += vel.x * s; enemy.y += vel.y * s;
      if (enemy.x > ctx.w - 60 || enemy.x < 60) vel.x *= -1;
      if (enemy.y > ctx.h - 40 || enemy.y < 40) vel.y *= -1;

      const step = 2 / 20;
      const pts = [{ x: enemy.x, y: enemy.y }];
      let px = enemy.x, py = enemy.y, vx = vel.x, vy = vel.y;
      for (let i = 0; i < 20; i++) {
        px = Phaser.Math.Clamp(px + vx * step, 32, ctx.w - 32);
        py = Phaser.Math.Clamp(py + vy * step, 32, ctx.h - 32);
        vx *= 0.97; vy *= 0.97;
        pts.push({ x: px, y: py });
      }
      foresightPath(path, ctx.tint, pts, 0.95, t);
      const end = pts[pts.length - 1];
      if (Phaser.Math.Distance.Between(end.x, end.y, enemy.x, enemy.y) >= 24) {
        destinyGhost(air, ctx.tint, end.x, end.y, 0.8, t);
      }
      // The meditation rings under a psychic who is holding somebody's future.
      if (queue.length) {
        for (let i = 0; i < 2; i++) {
          const r = 26 + i * 9 + Math.sin(t * 2 + i) * 2;
          path.lineStyle(1.2 - i * 0.4, ctx.tint(PSY.violet), 0.4 - i * 0.12);
          path.strokeEllipse(ctx.cx, ctx.cy + 14, r * 2, r * 0.7);
        }
      }
    });

    queueBar(ctx, enemy, () => queue.slice(0, 3).reverse().map((e) => ({
      key: e.key, big: e.big, heat: 0.4,
    })));
    const press = (at: number, key: string, big = false): void => {
      ctx.at(at, () => {
        queue.push({ key, big, due: at + 2000 });
        float(ctx, enemy.x, enemy.y - 88, `they press ${key}`, '#8e97ad', 10);
      });
      ctx.at(at + 2000, () => {
        queue.shift();
        float(ctx, enemy.x, enemy.y - 70, `${key} finally happens`, hex(PSY.violetLit), 10);
      });
    };

    ctx.at(300, () => readout.setText('their next two seconds of walking, one tick every 100ms'));
    ctx.at(1600, () => readout.setText('the hollow body at the end is where they will be standing'));
    press(2600, 'Click');
    press(3300, 'R');
    press(4000, 'Q', true);
    ctx.at(4400, () => readout.setText('three presses, all paid for, none of them resolved yet'));
    ctx.at(7000, () => readout.setText('the cooldown runs from the press — the delay costs them tempo, not uptime'));
    ctx.at(9000, () => readout.setText('and the thread stops being true the moment they change their mind'));
  },
};

// ══ PASSIVE — Stress ══════════════════════════════════════════════════

export const stress: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Passive — a pool that does nothing for 10 seconds, then lands in one piece through armour',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const victim = { x: ctx.cx + 130, y: ctx.cy };
    dummyAt(ctx, victim);
    const pool = { amount: 0, fuse: 0 };
    stressReadout(ctx, victim, () => pool);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3355', 11);

    // The fuse, running for real — 10 seconds, and every new point resets it.
    ctx.onFrame((dt) => {
      if (pool.amount < 0.5) return;
      pool.fuse = Math.max(0, pool.fuse - (dt / 1000) / 10);
    });

    const add = (at: number, n: number, why: string): void => ctx.at(at, () => {
      pool.amount += n;
      pool.fuse = 1;
      float(ctx, victim.x + (Math.random() - 0.5) * 22, victim.y - 34, `+${n}`, hex(PSY.stress), 12);
      readout.setText(`${why}   —   fuse back to a full 10 seconds`);
    });

    add(600, 5, 'a lash on the body');
    add(1600, 10, 'a lash on the tip');
    add(2600, 10, 'a second on the tip');
    add(3600, 30, 'three seconds of Migraine');
    ctx.at(4600, () => readout.setText('55 sitting there — no ticks, no damage, nothing at all yet'));
    ctx.at(6000, () => readout.setText('left alone, the fuse finally runs out…'));
    // Fast-forward the fuse rather than idling for ten real seconds.
    ctx.at(6400, () => { pool.fuse = 0.18; });
    ctx.at(8200, () => {
      const n = Math.round(pool.amount);
      pool.amount = 0;
      float(ctx, victim.x, victim.y - 60, `💥 ${n} STRESS`, hex(PSY.stress), 13);
      ctx.capture(() => fx.burst(victim.x, victim.y, Math.min(1, n / 80)));
      float(ctx, victim.x, victim.y - 24, `${n}`, '#ffb3aa', 18);
      readout.setText('all of it at once, as pierce — it skips mitigation and every absorb under it');
    });
    ctx.at(9800, () => readout.setText('so a psychic never lets it go off by accident: keep whipping and the fuse never lands'));
  },
};
