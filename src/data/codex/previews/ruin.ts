import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { HealthBar } from '../../../combat/HealthBar';
import {
  RUI, RuinAvatar, RuinFx, chainRun, crackWeb, decayCoat, padlock, rubyJewel,
  ruinCluster, ruinRing, rustySpike, shredWedge, shrapnelShard,
} from '../../../elements/kits/RuinVisuals';

/**
 * Ruin's showcases.
 *
 * Nothing this element throws is a sprite. The wedge, the skewer, the ruin crystals, the
 * cracks, the shrapnel, the padlock and the rot on a body are every one of them Graphics
 * repainted per frame out of `RuinVisuals`, so these loops keep the kit's own little state
 * records and hand them to the kit's own painters. The one thing that *is* a real projectile
 * here is the enemy ammunition Shred Slice eats, which is flown with `ctx.fly` on a genuine
 * texture, because a shredded shot has to look like a shot somebody actually fired.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so text,
 * Graphics and the `HealthBar` built inside one go through `ctx.adopt`/`ctx.capture` by hand.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const SHRED_SPEED = 720;
const SHRED_LEN = 34;
const SHRED_EAT_R = 34;

const LOCK_MS = 20000;

const SKEWER_SPEED = 620;
const SKEWER_LEN = 150;
const SKEWER_HALF_WIDTH = 13;
const RIDER_FIRST_OFFSET = 26;
const RIDER_SPACING = 34;

const RING_R = 122;
const RING_FUSE_MS = 2000;

const CRYSTAL_R = 15;
const CHAIN_DELAY_MS = 110;
const BLAST_R = 150;
const SPIKE_COUNT = 12;
const SPIKE_SPEED = 440;
const SPIKE_LEN = 14;

const CRACK_R = 46;

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: RuinFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new RuinFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new RuinAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/** `ctx.addDummy` stands one body on the harness's floor line; these loops place their own. */
function dummyAt(ctx: PreviewCtx, m: Mark, o?: { alpha?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    const a = o?.alpha?.() ?? 1;
    g.clear();
    if (a <= 0.02) return;
    g.fillStyle(0x2b2f3d, a);
    g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, a);
    g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, a * 0.9);
    g.fillCircle(m.x - 5, m.y - 4, 3.2);
    g.fillCircle(m.x + 5, m.y - 4, 3.2);
    g.fillStyle(0x11131b, a);
    g.fillCircle(m.x - 5.6, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4, m.y - 4, 1.6);
  });
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#0d0605', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 780) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 780, 0, 1));
  });
}

function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(19));
}

/** A ruin crystal, painted with the kit's own cluster and its charged jewel. */
interface Crystal { x: number; y: number; seed: number; born: number; charged: boolean; blowAt: number; dead: boolean }

function crystalField(ctx: PreviewCtx, list: Crystal[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    for (const c of list) {
      if (c.dead) continue;
      const grow = Phaser.Math.Clamp((elapsed - c.born) / 260, 0, 1);
      const fuse = c.blowAt > 0
        ? Phaser.Math.Clamp(1 - (c.blowAt - elapsed) / CHAIN_DELAY_MS, 0, 1)
        : 0.25 + Math.sin(t * 2 + c.seed) * 0.06;
      ruinCluster(g, ctx.tint, c.x, c.y, CRYSTAL_R * (0.6 + grow * 0.4), fuse, t, 0.7, c.seed);
      if (!c.charged) continue;
      rubyJewel(g, ctx.tint, c.x, c.y - 4, CRYSTAL_R * 0.36, t, 0.85, c.seed);
      g.fillStyle(ctx.tint(RUI.ancient), 0.16 + Math.sin(t * 6 + c.seed) * 0.07);
      g.fillCircle(c.x, c.y, CRYSTAL_R * 1.7);
    }
  });
}

/** The wedge in flight, stepped and painted the way `updateWedges`/`paintAir` do it. */
function wedge(
  ctx: PreviewCtx, from: Mark, ang: number, on: (x: number, y: number) => void,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const p = { x: from.x, y: from.y };
  let spin = Math.random() * 6;
  ctx.onFrame((dt) => {
    g.clear();
    const s = dt / 1000;
    p.x += Math.cos(ang) * SHRED_SPEED * s;
    p.y += Math.sin(ang) * SHRED_SPEED * s;
    spin += s * 5;
    if (p.x > ctx.w + 20 || p.x < -20) return;
    on(p.x, p.y);
    shredWedge(g, ctx.tint, p.x, p.y, ang, SHRED_LEN, 1, spin, 41);
  });
}

// ── Click — Shred Slice ───────────────────────────────────────────────

function shredLoop(ctx: PreviewCtx, opts: { shatter: boolean }): void {
  const { fx, av } = stage(ctx, { noDummy: true });
  const bodies: Mark[] = [{ x: ctx.w * 0.5, y: ctx.cy }, { x: ctx.w * 0.72, y: ctx.cy }];
  for (const b of bodies) dummyAt(ctx, b);

  const crystals: Crystal[] = [];
  crystalField(ctx, crystals);

  // Two of the other side's shots coming the other way — real projectiles on a real texture.
  const incoming: Array<{ x: number; y: number; alive: boolean }> = [];
  for (let i = 0; i < 2; i++) {
    ctx.at(150 + i * 260, () => {
      const rec = { x: ctx.w - 10, y: ctx.cy, alive: true };
      incoming.push(rec);
      ctx.fly({
        texture: 'proj-fire', from: { x: ctx.w - 10, y: ctx.cy }, to: { x: -10, y: ctx.cy },
        speed: 420,
      });
      // `ctx.fly` owns the sprite; the kit's shredding is a distance test, so mirror the
      // position here and let the wedge decide.
      ctx.onFrame((dt) => {
        if (!rec.alive) return;
        rec.x -= 420 * (dt / 1000);
      });
    });
  }

  ctx.at(700, () => {
    av.play('punch', ctx.aim);
    fx.rustPuff(ctx.cx + 20, ctx.cy, 4, 12, 380, 9);
    const hit = new Set<Mark>();
    let dealt = 0;
    wedge(ctx, { x: ctx.cx + 26, y: ctx.cy }, ctx.aim, (x, y) => {
      for (const b of bodies) {
        if (hit.has(b) || Phaser.Math.Distance.Between(x, y, b.x, b.y) > 30) continue;
        hit.add(b);
        fx.bite(b.x, b.y, 26, RUI.red);
        tick(ctx, b.x, b.y - 28, '15', RUI.bright);
        if (!opts.shatter) continue;
        // Every 50 damage dealt grows one more crystal, wherever it landed.
        dealt += 15;
        while (dealt >= 50) {
          dealt -= 50;
          crystals.push({ x: b.x + 18, y: b.y + 14, seed: 7, born: 0, charged: false, blowAt: 0, dead: false });
          fx.shatter(b.x + 18, b.y + 14, 6, 20, RUI.ruby, 380, 9);
        }
      }
      for (const p of incoming) {
        if (!p.alive || Phaser.Math.Distance.Between(x, y, p.x, p.y) > SHRED_EAT_R) continue;
        p.alive = false;
        fx.shatter(p.x, p.y, 5, 20, RUI.bone, 380, 10);
        tick(ctx, p.x, p.y - 26, '✂️ SHREDDED', RUI.bone);
        if (!opts.shatter) continue;
        crystals.push({ x: p.x, y: p.y, seed: 3, born: 0, charged: false, blowAt: 0, dead: false });
        fx.shatter(p.x, p.y, 6, 20, RUI.ruby, 380, 9);
      }
    });
  });

  if (!opts.shatter) return;
  // A crystal biting whoever walks into it, and a shot coming out of one rusted.
  ctx.at(3000, () => {
    const c = crystals[0];
    if (!c) return;
    fx.bite(c.x, c.y, 22, RUI.ruby);
    tick(ctx, c.x, c.y - 28, '10', RUI.ruby);
  });
  ctx.at(3800, () => {
    const c = crystals[crystals.length - 1];
    if (!c) return;
    fx.rustPuff(c.x, c.y, 4, 12, 300, 9);
    tick(ctx, c.x, c.y - 30, '⚙️ RUSTED — half size, no damage', RUI.rust);
  });
}

export const shred: PreviewScript = {
  duration: 3000,
  scale: 0.9,
  caption: 'Click — 15 through every body, and it deletes their shots out of the air as it goes',
  run(ctx) { shredLoop(ctx, { shatter: false }); },
};

export const shredUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Shatter Starter — a ruin crystal per shot eaten and one per 50 damage: bites for 10, rusts what flies through',
  run(ctx) { shredLoop(ctx, { shatter: true }); },
};

// ── E — Lockdown ──────────────────────────────────────────────────────

/** The padlock hanging over a victim, drawn the way `paintAir` draws one. */
function lockOver(ctx: PreviewCtx, at: Mark, from: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const born = from();
    if (born < 0) return;
    const snap = Phaser.Math.Clamp((elapsed - born) / 220, 0, 1);
    const y = at.y - 42;
    chainRun(g, ctx.tint, at.x - 14, y - 8, at.x + 14, y - 8, 0.7, 4, 19);
    padlock(g, ctx.tint, at.x, y, 13, 1, snap, (elapsed / 500) + 19);
  });
}

export const lockdown: PreviewScript = {
  duration: 4200,
  caption: 'E — 20s in which their last-used ability is dead, however ready its cooldown reads',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const foe = { x: ctx.tx, y: ctx.ty };
    let born = -1;
    lockOver(ctx, foe, () => born);
    label(ctx, ctx.cx, ctx.h - 12, 'reach 460px · refunded if nobody is in it', RUI.ash);

    ctx.at(500, () => {
      av.play('sweep', ctx.aim);
      fx.lockSnap(ctx.cx, ctx.cy, foe.x, foe.y);
      born = 500;
      tick(ctx, foe.x, foe.y - 52, '🔒 FIREBALL', RUI.rust);
      ctx.at(200, () => tick(ctx, foe.x, foe.y - 32, `LOCKED ${LOCK_MS / 1000}s`, RUI.red));
    });
    // Their cooldown finishes and the ability still refuses.
    ctx.at(2600, () => tick(ctx, foe.x, foe.y - 24, '⛔ STILL LOCKED', RUI.ash));
  },
};

export const lockdownUpgraded: PreviewScript = {
  duration: 5600,
  caption: 'Lockjaw — 12 HP per stack every time they use that ability, for the rest of the match',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const foe = { x: ctx.tx, y: ctx.ty };
    let born = -1;
    lockOver(ctx, foe, () => born);

    let stacks = 0;
    const bite = (at: number): void => ctx.at(at, () => {
      av.play('sweep', ctx.aim);
      fx.lockSnap(ctx.cx, ctx.cy, foe.x, foe.y);
      born = at;
      stacks++;
      fx.shatter(foe.x, foe.y - 20, 6, 22, RUI.rust, 420, 11);
      tick(ctx, foe.x, foe.y - 68, `🦷 LOCKJAW ×${stacks} — FIREBALL`, RUI.ember);
    });
    bite(400);
    bite(2600);

    // Each time they use it afterwards, the teeth close.
    for (const at of [1300, 1900, 3400, 4100, 4800]) {
      ctx.at(at, () => {
        if (stacks <= 0) return;
        fx.bite(foe.x, foe.y, 24, RUI.rust);
        tick(ctx, foe.x, foe.y - 56, `🦷 ${12 * stacks}`, RUI.ember);
      });
    }
  },
};

// ── R — Rusty Skewer ──────────────────────────────────────────────────

function skewerLoop(ctx: PreviewCtx, opts: { fed: boolean }): void {
  const { fx, av } = stage(ctx, { noDummy: true });
  const riders: Mark[] = [{ x: ctx.w * 0.52, y: ctx.cy }, { x: ctx.w * 0.68, y: ctx.cy }];
  const caught: Mark[] = [];
  for (const r of riders) dummyAt(ctx, r);

  const crystals: Crystal[] = [];
  if (opts.fed) {
    crystals.push({ x: ctx.w * 0.38, y: ctx.cy, seed: 5, born: 0, charged: false, blowAt: 0, dead: false });
  }
  crystalField(ctx, crystals);

  const sk = { x: ctx.cx + 34, y: ctx.cy, live: false, fed: false };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (!sk.live) return;
    const t = elapsed / 1000;
    sk.x += SKEWER_SPEED * (dt / 1000);
    const tipX = sk.x + SKEWER_LEN * 0.5;

    // Ruin Transfusion: the point drinks one of your own crystals on the way past.
    if (opts.fed && !sk.fed) {
      for (const c of crystals) {
        if (c.dead || Math.abs(tipX - c.x) > CRYSTAL_R + SKEWER_HALF_WIDTH) continue;
        c.dead = true;
        sk.fed = true;
        fx.shatter(c.x, c.y, 12, 34, RUI.ruby, 480, 11);
        fx.ring(c.x, c.y, 6, 40, RUI.ruby, 380);
        tick(ctx, c.x, c.y - 30, '🩸 TRANSFUSION', RUI.ruby);
      }
    }

    for (const r of riders) {
      if (caught.includes(r) || Phaser.Math.Distance.Between(tipX, sk.y, r.x, r.y) > 40) continue;
      caught.push(r);
      fx.bite(r.x, r.y, 32, sk.fed ? RUI.ruby : RUI.blood);
      fx.rustPuff(r.x, r.y, 8, 26, 520, 10);
      tick(ctx, r.x, r.y - 38, '🩸 SKEWERED', RUI.red);
      ctx.at(180, () => tick(ctx, r.x, r.y - 56,
        sk.fed ? '🩸 60 TRANSFUSED' : '⚙️ 40 RUSTED', sk.fed ? RUI.ruby : RUI.rust));
    }
    // Riders hang off the shaft behind the point, in the order they were caught.
    caught.forEach((r, i) => {
      r.x = sk.x + SKEWER_LEN * 0.5 - RIDER_FIRST_OFFSET - i * RIDER_SPACING;
      r.y = sk.y;
    });

    const buttX = sk.x - SKEWER_LEN * 0.5;
    rustySpike(g, ctx.tint, buttX, sk.y, 0, SKEWER_LEN, SKEWER_HALF_WIDTH, 1,
      { seed: 23, wear: 0.85, barbs: 4 });
    if (sk.fed) {
      g.lineStyle(7, ctx.tint(RUI.ruby), 0.22 + Math.sin(t * 11) * 0.08);
      g.lineBetween(buttX, sk.y, buttX + SKEWER_LEN, sk.y);
      g.lineStyle(2.2, ctx.tint(RUI.bright), 0.7 + Math.sin(t * 14) * 0.25);
      g.lineBetween(buttX, sk.y, buttX + SKEWER_LEN, sk.y);
    }
    for (const r of caught) {
      g.fillStyle(ctx.tint(RUI.blood), 0.55);
      g.fillCircle(r.x, r.y, 10 + Math.sin(t * 9) * 1.4);
      g.lineStyle(3, ctx.tint(RUI.blood), 0.4);
      g.lineBetween(r.x - 22, r.y, r.x + 22, r.y);
    }

    if (tipX < ctx.w - 8) return;
    // The wall. Everyone is torn off where they stopped.
    sk.live = false;
    fx.shatter(ctx.w - 12, sk.y, 9, 40, RUI.iron, 520, 10);
    fx.crack(ctx.w - 12, sk.y, 54);
    for (const r of caught) {
      fx.shatter(r.x, r.y, 7, 34, RUI.blood, 460, 10);
      tick(ctx, r.x, r.y - 42, '🧱 TORN OFF', RUI.rust);
    }
  });

  ctx.at(500, () => {
    sk.live = true;
    av.play('dash', ctx.aim);
    fx.rustPuff(ctx.cx, ctx.cy, 8, 26, 480, 9);
    tick(ctx, ctx.cx, ctx.cy - 46, '🩸 RUSTY SKEWER', RUI.rust);
  });
}

export const skewer: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'R — up to 3 riders threaded and disarmed, 10 damage each and a tenth of them rusted grey',
  run(ctx) { skewerLoop(ctx, { fed: false }); },
};

export const skewerUpgraded: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Ruin Transfusion — the spike drinks a crystal and takes 15% of them outright instead',
  run(ctx) { skewerLoop(ctx, { fed: true }); },
};

// ── F — Spikes of Ruin ────────────────────────────────────────────────

function spikesLoop(ctx: PreviewCtx, opts: { chain: boolean }): void {
  const { fx, av } = stage(ctx, { noDummy: true });
  const foe = { x: ctx.w * 0.62, y: ctx.h * 0.52 };
  dummyAt(ctx, foe);

  const crystals: Crystal[] = [];
  if (opts.chain) {
    for (const [dx, dy] of [[-60, -40], [30, -60], [80, 20], [160, -10], [230, 30]]) {
      crystals.push({
        x: ctx.w * 0.5 + dx, y: ctx.h * 0.52 + dy, seed: dx, born: 0, charged: false,
        blowAt: 0, dead: false,
      });
    }
  }
  crystalField(ctx, crystals);

  // The ring is worn, not placed — it follows its caster for the whole fuse.
  const ringAt = { x: ctx.cx, y: ctx.cy };
  let started = -1;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (started < 0) return;
    const charge = Phaser.Math.Clamp((elapsed - started) / RING_FUSE_MS, 0, 1);
    if (charge >= 1) return;
    // Walked toward the target while it burns, which is the whole decision the ability asks.
    ringAt.x = ctx.cx + (foe.x - ctx.cx - 20) * charge;
    ruinRing(g, ctx.tint, ringAt.x, ringAt.y, RING_R, elapsed / 1000, 1, charge, 61);
  });

  // The buff-inversion web, drawn on the victim for its 8 seconds.
  let invertedAt = -1;
  const web = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, elapsed) => {
    web.clear();
    if (invertedAt < 0 || elapsed - invertedAt > 8000) return;
    crackWeb(web, ctx.tint, foe.x, foe.y, 30, foe.x, 0.5, 1,
      { runs: 5, width: 1.6, color: RUI.bright });
  });

  ctx.at(300, () => {
    started = 300;
    av.play('flex');
    fx.ring(ctx.cx, ctx.cy, 12, RING_R, RUI.red, 520);
    tick(ctx, ctx.cx, ctx.cy - 46, '🔻 SPIKES OF RUIN', RUI.red);
  });

  const spikes: Array<{ x: number; y: number; vx: number; vy: number; ang: number; seed: number; dies: number }> = [];
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  ctx.onFrame((dt, elapsed) => {
    air.clear();
    const s = dt / 1000;
    for (let i = spikes.length - 1; i >= 0; i--) {
      const sp = spikes[i];
      sp.x += sp.vx * s;
      sp.y += sp.vy * s;
      if (elapsed >= sp.dies) { spikes.splice(i, 1); continue; }
      shrapnelShard(air, ctx.tint, sp.x, sp.y, sp.ang, SPIKE_LEN, 1, sp.seed);
    }
    // A spike reaching a crystal keeps the chain running past any one blast radius.
    for (const c of crystals) {
      if (c.dead || c.blowAt > 0) continue;
      if (!spikes.some((sp) => Phaser.Math.Distance.Between(sp.x, sp.y, c.x, c.y) <= CRYSTAL_R + 6)) continue;
      c.blowAt = elapsed + CHAIN_DELAY_MS;
    }
    for (const c of crystals) {
      if (c.dead || c.blowAt <= 0 || elapsed < c.blowAt) continue;
      c.dead = true;
      fx.shatter(c.x, c.y, 18, BLAST_R * 0.5, RUI.ruby, 640, 11);
      fx.ring(c.x, c.y, 16, BLAST_R, RUI.ruby, 560);
      fx.crack(c.x, c.y, BLAST_R * 0.6);
      if (Phaser.Math.Distance.Between(c.x, c.y, foe.x, foe.y) <= BLAST_R) {
        tick(ctx, foe.x, foe.y - 30, '25', RUI.ruby);
      }
      const off = c.seed;
      for (let i = 0; i < SPIKE_COUNT; i++) {
        const a = off + (i / SPIKE_COUNT) * Math.PI * 2;
        spikes.push({
          x: c.x + Math.cos(a) * 12, y: c.y + Math.sin(a) * 12,
          vx: Math.cos(a) * SPIKE_SPEED, vy: Math.sin(a) * SPIKE_SPEED,
          ang: a, seed: i, dies: elapsed + 1000,
        });
      }
      for (const other of crystals) {
        if (other.dead || other.blowAt > 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, other.x, other.y) > BLAST_R) continue;
        other.blowAt = elapsed + CHAIN_DELAY_MS;
      }
    }
  });

  ctx.at(300 + RING_FUSE_MS, () => {
    const at = { x: ringAt.x, y: ringAt.y };
    fx.spikeBurst(at.x, at.y, 16, RING_R, 560, 10, 61);
    fx.ring(at.x, at.y, RING_R * 0.4, RING_R * 1.15, RUI.red, 520);
    fx.crack(at.x, at.y, RING_R);
    if (Phaser.Math.Distance.Between(at.x, at.y, foe.x, foe.y) <= RING_R) {
      fx.shatter(foe.x, foe.y, 6, 26, RUI.red, 420, 11);
      tick(ctx, foe.x, foe.y - 30, '15', RUI.bright);
      invertedAt = 300 + RING_FUSE_MS;
      ctx.at(260, () => tick(ctx, foe.x, foe.y - 44, '🔻 4 BUFFS TURNED', RUI.bright));
      ctx.at(620, () => tick(ctx, foe.x, foe.y - 58, '🏚️ 2 RAZED', RUI.rust));
    }
    if (!opts.chain) return;
    let lit = 0;
    for (const c of crystals) {
      if (c.dead || Phaser.Math.Distance.Between(at.x, at.y, c.x, c.y) > RING_R) continue;
      c.blowAt = 300 + RING_FUSE_MS + lit * CHAIN_DELAY_MS;
      lit++;
    }
    if (lit > 0) tick(ctx, at.x, at.y - 78, `💥 CHAIN REACTION ×${lit}`, RUI.ruby);
  });
}

export const spikes: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'F — a 122px ring worn for 2s, then 15 damage, every buff turned inside out, and every structure inside deleted',
  run(ctx) { spikesLoop(ctx, { chain: false }); },
};

export const spikesUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.8,
  caption: 'Chain Reaction — 25 per blast and 12 spikes a crystal, each one lighting the next 110ms later',
  run(ctx) { spikesLoop(ctx, { chain: true }); },
};

// ── Q — Unstoppable Decay ─────────────────────────────────────────────

export const decay: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Q — ×0.9 speed, ×1.1 damage taken and ×0.9 damage dealt per stack. It never wears off',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.tx, y: ctx.ty };
    dummyAt(ctx, foe);

    let stacks = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (stacks <= 0) return;
      decayCoat(g, ctx.tint, foe.x, foe.y, 24, elapsed / 1000, 1, stacks, foe.x + foe.y);
    });

    for (let i = 0; i < 4; i++) {
      ctx.at(500 + i * 1400, () => {
        stacks++;
        av.play('raise');
        fx.ring(ctx.cx, ctx.cy, 20, Math.max(ctx.w, ctx.h) * 0.75, RUI.decay, 900);
        fx.rustPuff(foe.x, foe.y, 12, 34, 700, 10);
        tick(ctx, foe.x, foe.y - 44, `🦠 DECAY ×${stacks}`, RUI.decay);
        ctx.at(300, () => tick(ctx, foe.x, foe.y - 62,
          `${Math.round(Math.pow(0.9, stacks) * 100)}% speed · ×${Math.pow(1.1, stacks).toFixed(2)} taken`, RUI.decay));
      });
    }
    label(ctx, ctx.cx, ctx.h - 12, 'caps at 10 — ×0.35 speed, ×2.59 taken, 34.9% dealt', RUI.decay);
  },
};

export const decayUpgraded: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Ruin Cracks — 2 sores a cast at 12/s, never closing, and a crystal grown in one throws lightning',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.w * 0.66, y: ctx.h * 0.55 };
    dummyAt(ctx, foe);

    const cracks: Array<{ x: number; y: number; r: number; seed: number }> = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      for (const k of cracks) {
        const pulse = 0.9 + Math.sin(t * 2 + k.seed) * 0.05;
        g.fillStyle(ctx.tint(RUI.voidDark), 0.55);
        g.fillEllipse(k.x, k.y, k.r * 2 * pulse, k.r * 1.24 * pulse);
        g.fillStyle(ctx.tint(RUI.stone), 0.3);
        g.fillEllipse(k.x, k.y + 2, k.r * 1.5, k.r * 0.86);
        g.lineStyle(2, ctx.tint(RUI.ancient), 0.35 + Math.sin(t * 3 + k.seed) * 0.12);
        g.strokeEllipse(k.x, k.y, k.r * 2 * pulse, k.r * 1.24 * pulse);
        crackWeb(g, ctx.tint, k.x, k.y, k.r * 1.05, k.seed, 0.7, 1,
          { runs: 9, squash: 0.62, width: 2.2, color: RUI.voidDark });
        crackWeb(g, ctx.tint, k.x, k.y, k.r * 0.7, k.seed + 4, 0.4, 1,
          { runs: 5, squash: 0.62, width: 1.2, color: RUI.ancient });
      }
    });

    const crystals: Crystal[] = [];
    crystalField(ctx, crystals);

    ctx.at(400, () => {
      av.play('raise');
      for (const [x, y] of [[ctx.w * 0.62, ctx.h * 0.55], [ctx.w * 0.36, ctx.h * 0.3]]) {
        cracks.push({ x, y, r: CRACK_R, seed: x });
        fx.crack(x, y, CRACK_R * 1.2);
        fx.ring(x, y, 6, CRACK_R, RUI.ancient, 620);
      }
      tick(ctx, ctx.cx, ctx.cy - 74, '🕳️ 2 RUIN CRACKS', RUI.ancient);
    });

    // 12/s, charged as 6 every half second, to anybody standing in one.
    for (let i = 1; i <= 10; i++) {
      ctx.at(400 + i * 500, () => {
        if (!cracks.some((k) => Phaser.Math.Distance.Between(k.x, k.y, foe.x, foe.y) <= k.r)) return;
        fx.rustPuff(foe.x, foe.y + 8, 4, 14, 320, 4);
        tick(ctx, foe.x, foe.y - 26, '6', RUI.ancient);
      });
    }

    // A crystal grown on top of a crack is charged, and starts shooting.
    ctx.at(2400, () => {
      crystals.push({
        x: ctx.w * 0.36, y: ctx.h * 0.3, seed: 11, born: 2400, charged: true, blowAt: 0, dead: false,
      });
      fx.shatter(ctx.w * 0.36, ctx.h * 0.3, 6, 20, RUI.ruby, 380, 9);
    });
    const bolt = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    let boltUntil = -1;
    ctx.onFrame((_dt, elapsed) => {
      bolt.clear();
      if (elapsed > boltUntil) return;
      const c = crystals[0];
      if (!c) return;
      const fade = Phaser.Math.Clamp((boltUntil - elapsed) / 180, 0, 1);
      let px = c.x;
      let py = c.y;
      for (let i = 1; i <= 7; i++) {
        const s = i / 7;
        const kink = i === 7 ? 0 : Math.sin(elapsed * 0.05 + i) * 14;
        const nx = c.x + (foe.x - c.x) * s - (foe.y - c.y) / SKEWER_LEN * kink;
        const ny = c.y + (foe.y - c.y) * s + (foe.x - c.x) / SKEWER_LEN * kink;
        bolt.lineStyle(4, ctx.tint(RUI.ancient), fade * 0.35);
        bolt.lineBetween(px, py, nx, ny);
        bolt.lineStyle(1.6, ctx.tint(RUI.bone), fade * 0.9);
        bolt.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
    });
    for (let i = 0; i < 3; i++) {
      ctx.at(2900 + i * 1500, () => {
        boltUntil = 2900 + i * 1500 + 180;
        tick(ctx, foe.x, foe.y - 50, '⚡ 15', RUI.ancient);
      });
    }
  },
};

// ── Passives ──────────────────────────────────────────────────────────

export const rust: PreviewScript = {
  duration: 7000,
  caption: 'Rust moves health into the grey pool: it walks past shields, soaks the next hits, drains at 3/s, and can never kill',
  run(ctx) {
    const fx = ctx.capture(() => new RuinFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const foe = { x: ctx.w * 0.55, y: ctx.cy + 6 };
    dummyAt(ctx, foe);

    // The real bar, so the grey band is the same band the arena draws.
    const bar = ctx.capture(() => new HealthBar(ctx.scene, 400));
    const state = { hp: 400, weak: 0 };
    ctx.onFrame((dt) => {
      if (state.weak > 0) state.weak = Math.max(0, state.weak - 3 * (dt / 1000));
      bar.update(foe.x, foe.y, state.hp, 0, 0, 0, state.weak);
    });

    ctx.at(700, () => {
      const moved = Math.round(state.hp * 0.1);
      state.hp -= moved;
      state.weak += moved;
      fx.rustPuff(foe.x, foe.y, 8, 24, 480, 10);
      tick(ctx, foe.x, foe.y - 40, `⚙️ ${moved} RUSTED`, RUI.rust);
      ctx.at(400, () => tick(ctx, foe.x, foe.y - 56, 'health unchanged — but 40 of it is now grey', RUI.ash));
    });

    // A hit arriving: the grey is spent before the red is.
    ctx.at(2600, () => {
      const eaten = Math.min(state.weak, 25);
      state.weak -= eaten;
      state.hp -= 25 - eaten;
      fx.bite(foe.x, foe.y, 24, RUI.red);
      tick(ctx, foe.x, foe.y - 34, `25 — ${Math.round(eaten)} off the grey`, RUI.bright);
    });
    ctx.at(4400, () => tick(ctx, foe.x, foe.y - 34, 'and the rest just leaks away at 3/s', RUI.ash));
  },
};

export const nothingComesBack: PreviewScript = {
  duration: 7200,
  caption: 'His frame cracks further apart with every point of health he loses — and nothing this element applies ever expires',
  run(ctx) {
    const { av } = stage(ctx, { noDummy: true });
    const rav = av instanceof RuinAvatar ? av : null;
    // Driven straight off 1 − hp/maxHp, exactly as the kit drives it.
    ctx.onFrame((_dt, elapsed) => {
      rav?.setRuinLevel(Phaser.Math.Clamp(elapsed / 6000, 0, 1));
    });
    label(ctx, ctx.cx, ctx.h - 12, 'ruin level = 1 − hp / maxHp', RUI.ash);

    const rows = [
      'decay stacks — permanent, cap 10',
      'lockjaw teeth — permanent, no cap',
      'ability blunting — permanent, cap 7',
      'ruin cracks — never close, never shrink',
    ];
    rows.forEach((text, i) => {
      ctx.at(600 + i * 1300, () => tick(ctx, ctx.w * 0.66, ctx.cy + 6, text, RUI.decay));
    });
  },
};
