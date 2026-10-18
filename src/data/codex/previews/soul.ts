import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  SoulFx, SOUL, SoulAvatar, SoulAmalgamBody, SPIRIT_TONES, TORMENT_TONES, ANGERED_TONES, ROT_TONES,
  GOLD_TONES, AmalgamBodyState, SoulTones,
} from '../../../elements/kits/SoulVisuals';

/**
 * Soul's showcases.
 *
 * The one thing every loop needs is a body, and Soul draws its creatures with a real class —
 * `SoulAmalgamBody`, which builds its own lobes, heads, arms and seams from a spec and is
 * driven per-frame with a state struct. These scripts use it exactly as the kit does, so a
 * previewed Amalgam is the same horror the arena raises, down to the shamble cadence.
 */

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: SoulFx; av: SoulAvatar } {
  const fx = ctx.capture(() => new SoulFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new SoulAvatar(ctx.scene, ctx.tint)) as SoulAvatar;
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

interface PreviewAmalgam {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  st: Partial<AmalgamBodyState>;
}

/** One Amalgam, drawn by the kit's own body class and driven at whatever the script sets. */
function amalgam(
  ctx: PreviewCtx,
  o: { x: number; y: number; size?: number; alpha?: boolean; prince?: boolean; born?: number },
): PreviewAmalgam {
  const a: PreviewAmalgam = { x: o.x, y: o.y, vx: 0, vy: 0, hp: 1, maxHp: 1, st: {} };
  const body = ctx.capture(() => new SoulAmalgamBody(ctx.scene, ctx.tint, {
    size: o.size ?? 19, alpha: o.alpha, prince: o.prince, depth: 6,
  }));
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < (o.born ?? 0)) return;
    body.update(dt, {
      x: a.x, y: a.y, vx: a.vx, vy: a.vy,
      alpha: 1, pop: 1, aim: null,
      tones: a.st.burning ? TORMENT_TONES : a.st.angered ? ANGERED_TONES : SPIRIT_TONES,
      ...a.st,
    });
  });
  return a;
}

/**
 * A stream of Lantern wisps from the caster onto a (possibly moving) target, one every 350ms
 * between `born` and `until`, each painted the way the kit paints its own.
 */
function volley(
  ctx: PreviewCtx,
  o: { to: () => { x: number; y: number }; born: number; until: number; tones?: SoulTones; onHit?: () => void },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  const bolts: { x: number; y: number; a: number; t: number }[] = [];
  let next = o.born;
  ctx.onFrame((dt, elapsed) => {
    if (elapsed >= next && elapsed <= o.until) {
      next += 350;
      const p = o.to();
      bolts.push({ x: ctx.cx, y: ctx.cy, a: Math.atan2(p.y - ctx.cy, p.x - ctx.cx), t: 0 });
    }
    g.clear();
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const p = o.to();
      b.a = Phaser.Math.Angle.RotateTo(b.a, Math.atan2(p.y - b.y, p.x - b.x), 7 * dt / 1000);
      b.x += Math.cos(b.a) * 330 * dt / 1000;
      b.y += Math.sin(b.a) * 330 * dt / 1000;
      b.t += dt / 1000;
      if (Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < 16 || b.t > 2) {
        bolts.splice(i, 1);
        o.onHit?.();
        continue;
      }
      SoulFx.drawLantern(g, ctx.tint, o.tones ?? SPIRIT_TONES, b.x, b.y, b.a, 7, b.t);
    }
  });
}

/** A floating number, the way the arena pops them. */
function pop(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(12));
  ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 1000 });
}

/** A cloud of decay, painted the way the kit repaints its own. */
function decay(ctx: PreviewCtx, o: { x: number; y: number; born: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > 6000) return;
    SoulFx.drawDecay(g, ctx.tint, o.x, o.y, 84, elapsed / 1000, 0.4 + (1 - age / 6000) * 0.6);
  });
}

/** A headstone, and the shambler it keeps producing. */
function grave(ctx: PreviewCtx, o: { x: number; y: number; born: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed < o.born) return;
    const grow = Phaser.Math.Clamp((elapsed - o.born) / 260, 0, 1);
    g.fillStyle(ctx.tint(SOUL.void), 0.4);
    g.fillEllipse(o.x, o.y + 12 * grow, 34 * grow, 12 * grow);
    g.fillStyle(ctx.tint(SOUL.stone), 1);
    g.fillRoundedRect(o.x - 11 * grow, o.y - 22 * grow, 22 * grow, 32 * grow, 9 * grow);
    g.fillStyle(ctx.tint(SOUL.bone), 0.9);
    g.fillRoundedRect(o.x - 8 * grow, o.y - 18 * grow, 16 * grow, 24 * grow, 7 * grow);
    // The seam it pushes bodies out of.
    g.fillStyle(ctx.tint(SOUL.crypt), 0.85);
    g.fillEllipse(o.x, o.y + 14, 26, 7 + 2 * Math.sin(elapsed / 400));
  });
}

/** The five-slot corpse queue along the top of the screen. */
function corpseQueue(ctx: PreviewCtx, read: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  ctx.onFrame(() => {
    const n = read();
    g.clear();
    for (let i = 0; i < 5; i++) {
      const x = 14 + i * 26;
      g.fillStyle(0x0b0d16, 0.92);
      g.fillRoundedRect(x, 10, 22, 22, 5);
      g.lineStyle(1.2, ctx.tint(SOUL.orchid), i < n ? 0.95 : 0.2);
      g.strokeRoundedRect(x, 10, 22, 22, 5);
      if (i >= n) continue;
      g.fillStyle(ctx.tint(SOUL.bone), 0.9);
      g.fillCircle(x + 11, 19, 5);
      g.fillStyle(ctx.tint(SOUL.void), 1);
      g.fillCircle(x + 9, 18, 1.4);
      g.fillCircle(x + 13, 18, 1.4);
    }
  });
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const lantern: PreviewScript = {
  duration: 6400,
  caption: 'Click — a flaming wisp chases the cursor, then flies on · hold right click for a piercing soul beam',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    // The cursor sweeps an arc; the wisp bends after it, reaches it, and flies straight on.
    const cursor = { x: ctx.cx + 120, y: ctx.cy - 70 };
    const cur = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const wisp = { x: ctx.cx, y: ctx.cy, a: -0.5, t: 0, seeking: true, live: false };
    ctx.at(300, () => {
      wisp.live = true;
      av.play('punch', wisp.a);
      fx.muzzleWisp(ctx.cx, ctx.cy, wisp.a, 1, 7, SPIRIT_TONES);
    });
    ctx.onFrame((dt, elapsed) => {
      const s = dt / 1000;
      if (elapsed < 1300) cursor.y += 90 * s;
      cur.clear();
      cur.lineStyle(1.5, 0xffffff, 0.8);
      cur.strokeCircle(cursor.x, cursor.y, 6);
      cur.lineBetween(cursor.x - 9, cursor.y, cursor.x + 9, cursor.y);
      cur.lineBetween(cursor.x, cursor.y - 9, cursor.x, cursor.y + 9);
      g.clear();
      if (!wisp.live) return;
      if (wisp.seeking) {
        const want = Math.atan2(cursor.y - wisp.y, cursor.x - wisp.x);
        if (Phaser.Math.Distance.Between(wisp.x, wisp.y, cursor.x, cursor.y) < 14) wisp.seeking = false;
        else wisp.a = Phaser.Math.Angle.RotateTo(wisp.a, want, 7 * s);
      }
      wisp.x += Math.cos(wisp.a) * 330 * s;
      wisp.y += Math.sin(wisp.a) * 330 * s;
      wisp.t += s;
      if (wisp.x > ctx.w + 30) wisp.live = false;
      SoulFx.drawLantern(g, ctx.tint, SPIRIT_TONES, wisp.x, wisp.y, wisp.a, 7, wisp.t);
    });

    // The beam: charge in the hand, then one piercing line through everything on it.
    const charge = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const beam = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((_dt, elapsed) => {
      charge.clear();
      if (elapsed > 2600 && elapsed < 3800) {
        av.setHold('charge', ctx.aim);
        SoulFx.drawBeamCharge(charge, ctx.tint, SPIRIT_TONES, ctx.cx + Math.cos(ctx.aim) * 20, ctx.cy + Math.sin(ctx.aim) * 20,
          ctx.aim, 440, (elapsed - 2600) / 1200, elapsed / 1000);
      }
      beam.clear();
      const life = 1 - (elapsed - 3800) / 280;
      if (life > 0 && life <= 1) {
        SoulFx.drawBeam(beam, ctx.tint, SPIRIT_TONES, ctx.cx + Math.cos(ctx.aim) * 16, ctx.cy + Math.sin(ctx.aim) * 16,
          ctx.cx + Math.cos(ctx.aim) * 460, ctx.cy + Math.sin(ctx.aim) * 460, 22, life, elapsed / 1000);
      }
    });
    ctx.at(3800, () => {
      av.setHold(null);
      av.play('punch', ctx.aim, 260);
      fx.flash(ctx.cx, ctx.cy, 28, 8, SPIRIT_TONES);
      pop(ctx, ctx.tx, ctx.ty - 26, '−22', '#ff9c9c');
      pop(ctx, ctx.cx, ctx.cy - 50, 'PIERCES', '#ccaaff');
    });
    ctx.at(4800, () => pop(ctx, ctx.cx, ctx.cy - 50, '☠ every zombie kill: +5% to both', '#ddbbff', 10));
  },
};

export const lanternUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.85,
  caption: 'Soul Lord — 5 kills split · 10 hemorrhage · 15 soul orbs · 25 ascend: gold, homing, angelic',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let kills = 0;
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx, 22, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: '#ccaaff',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame(() => label.setText(`☠ ${kills}`).setColor(kills >= 25 ? '#ffe07a' : '#ccaaff'));
    const tierAt = (at: number, k: number, text: string): void => ctx.at(at, () => {
      kills = k;
      pop(ctx, ctx.cx, ctx.cy - 56, text, k >= 25 ? '#ffe07a' : '#eeddff', 12);
      fx.ring(ctx.cx, ctx.cy, 14, 70, k >= 25 ? SOUL.sun : SOUL.orchid, 520, 4, 7);
    });

    // 5 — a wisp bursts into three equidistant shards on impact.
    tierAt(200, 5, '🏮 lanterns split');
    const shards = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    let burst: { x: number; y: number; base: number; at: number } | null = null;
    volley(ctx, {
      to: () => ({ x: ctx.tx, y: ctx.ty }), born: 400, until: 400,
      onHit: () => { burst = { x: ctx.tx, y: ctx.ty, base: Math.random() * Math.PI * 2, at: 0 }; },
    });
    ctx.onFrame((dt) => {
      shards.clear();
      if (!burst) return;
      burst.at += dt / 1000;
      if (burst.at > 0.55) { burst = null; return; }
      for (let i = 0; i < 3; i++) {
        const a = burst.base + (i / 3) * Math.PI * 2;
        SoulFx.drawLantern(shards, ctx.tint, SPIRIT_TONES, burst.x + Math.cos(a) * 300 * burst.at,
          burst.y + Math.sin(a) * 300 * burst.at, a, 4, burst.at, true);
      }
    });

    // 10 — the beam leaves a bleeding soul aura on what it hit.
    tierAt(1900, 10, '🩸 beam hemorrhages');
    const beam = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const hemo = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      beam.clear();
      const life = 1 - (elapsed - 2300) / 280;
      if (life > 0 && life <= 1) {
        SoulFx.drawBeam(beam, ctx.tint, SPIRIT_TONES, ctx.cx, ctx.cy, ctx.tx + 40, ctx.ty, 20, life, elapsed / 1000);
      }
      hemo.clear();
      if (elapsed > 2300 && elapsed < 4300) {
        SoulFx.drawHemorrhage(hemo, ctx.tint, SPIRIT_TONES, ctx.tx, ctx.ty, 80, elapsed / 1000, (4300 - elapsed) / 4000);
      }
    });

    // 15 — three orbs circle the caster, faster with every kill.
    tierAt(3600, 15, '🔮 soul orbs');
    const orbs = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    let spin = 0;
    ctx.onFrame((dt, elapsed) => {
      orbs.clear();
      if (elapsed < 3600) return;
      spin += Math.min(7, 2.4 + (kills - 15) * 0.12) * dt / 1000;
      const tones = kills >= 25 ? GOLD_TONES : SPIRIT_TONES;
      for (let i = 0; i < 3; i++) {
        const a = spin + (i / 3) * Math.PI * 2;
        SoulFx.drawSoulOrb(orbs, ctx.tint, tones, ctx.cx + Math.cos(a) * 48, ctx.cy + Math.sin(a) * 48, a + Math.PI / 2, 7, elapsed / 1000 + i);
      }
    });

    // 25 — the whole character turns gold, haloed and winged; wisps home in.
    tierAt(5400, 25, '✨ SOUL LORD ASCENDED ✨');
    ctx.at(5400, () => {
      av.setAscended(true);
      av.play('raise', undefined, 700);
      fx.bloom(ctx.cx, ctx.cy, 60, 14, 6, GOLD_TONES);
      fx.soulRise(ctx.cx, ctx.cy, 110, 900, 7, GOLD_TONES);
    });
    volley(ctx, { to: () => ({ x: ctx.tx, y: ctx.ty + Math.sin(ctx.scene.time.now / 300) * 40 }), born: 6200, until: 7600, tones: GOLD_TONES });
  },
};

export const arise: PreviewScript = {
  duration: 4600,
  caption: 'E — pop the newest corpse from the 5-slot queue and stand it up as an Amalgam',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let held = 3;
    corpseQueue(ctx, () => held);
    // Three raised, one every 3s — the real cooldown.
    [500, 1900, 3300].forEach((at, i) => ctx.at(at, () => {
      av.play('raise', ctx.aim, 500);
      held -= 1;
      const x = ctx.cx + 90 + i * 70, y = ctx.cy + (i % 2 ? 34 : -30);
      fx.soulRise(x, y, 60, 620, 5, SPIRIT_TONES);
      fx.wispBloom(x, y, 40, 560, 6, SPIRIT_TONES);
      const a = amalgam(ctx, { x, y, born: at + 300 });
      // It walks and hunts from the moment it stands.
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < at + 300) return;
        const ang = Math.atan2(ctx.ty - a.y, ctx.tx - a.x);
        a.vx = Math.cos(ang) * 115; a.vy = Math.sin(ang) * 115;
        a.x += a.vx * (dt / 1000) * 0.3; a.y += a.vy * (dt / 1000) * 0.3;
      });
    }));
  },
};

export const ariseUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Cruel Offering — everything you raise leaves rot where it falls: 6 dmg/s and a 30% slow, 6 HP/s to your own',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const fallX = ctx.cx + 130, fallY = ctx.cy - 10;

    // One of yours goes down, and the rot it leaves is the whole upgrade.
    const dying = amalgam(ctx, { x: fallX, y: fallY });
    let dead = false;
    ctx.onFrame((_dt, elapsed) => { if (elapsed > 900) dead = true; void dead; });
    ctx.at(900, () => {
      av.play('raise', ctx.aim, 420);
      dying.x = -999;
      fx.wisps(fallX, fallY, 7, { speed: 70, size: 3.2, life: 700, rise: -30, depth: 6, tones: ROT_TONES });
      fx.ring(fallX, fallY, 8, 84, SOUL.rot, 520, 3.5, 4);
      decay(ctx, { x: fallX, y: fallY, born: 900 });
      const t = ctx.adopt(ctx.scene.add.text(fallX, fallY - 30, '☠️ DECAY', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#66cc55',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1400 });
    });

    // An enemy walks into it and is both burned and slowed while it stands there.
    const foe = { x: fallX + 210, y: fallY + 10 };
    const foeG = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    ctx.onFrame((dt, elapsed) => {
      foeG.clear();
      if (elapsed < 900) return;
      const inside = Phaser.Math.Distance.Between(foe.x, foe.y, fallX, fallY) <= 84;
      foe.x -= 70 * (inside ? 0.7 : 1) * (dt / 1000);
      foeG.fillStyle(0x99333a, 0.95);
      foeG.fillCircle(foe.x, foe.y, 13);
      foeG.fillStyle(0xffffff, 0.85);
      foeG.fillCircle(foe.x - 4, foe.y - 3, 2.4);
      foeG.fillCircle(foe.x + 4, foe.y - 3, 2.4);
    });
    let slowShown = false;
    ctx.onFrame((_dt, elapsed) => {
      if (slowShown || elapsed < 900) return;
      if (Phaser.Math.Distance.Between(foe.x, foe.y, fallX, fallY) > 84) return;
      slowShown = true;
      const t = ctx.adopt(ctx.scene.add.text(foe.x, foe.y - 30, '−30% SPEED', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#88ee99',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1200 });
    });

    // And one of yours standing in the same rot is fed by it.
    const ally = amalgam(ctx, { x: fallX - 40, y: fallY + 30 });
    for (let i = 1; i <= 5; i++) {
      ctx.at(900 + i * 1000, () => {
        if (Phaser.Math.Distance.Between(foe.x, foe.y, fallX, fallY) <= 84) {
          const hurt = ctx.adopt(ctx.scene.add.text(foe.x, foe.y - 22, '−6', {
            fontSize: '11px', fontFamily: 'Arial', color: '#ff9c9c',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: hurt, y: hurt.y - 16, alpha: 0, duration: 800 });
        }
        const heal = ctx.adopt(ctx.scene.add.text(ally.x, ally.y - 26, '+6', {
          fontSize: '11px', fontFamily: 'Arial', color: '#66ff99',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: heal, y: heal.y - 16, alpha: 0, duration: 800 });
      });
    }
  },
};

export const graveAbility: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'R — a permanent headstone spitting a 20 HP zombie every 5s that hunts YOU',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let queued = 0;
    corpseQueue(ctx, () => queued);
    const gx = ctx.cx + 150, gy = ctx.cy - 30;
    ctx.at(300, () => { av.play('slam', ctx.aim); grave(ctx, { x: gx, y: gy, born: 300 }); fx.ring(gx, gy, 6, 44, SOUL.stone, 420, 4, 4); });
    // One every 5s, walking straight at the caster — and burned down for the queue.
    [900, 3400].forEach((at, i) => ctx.at(at, () => {
      fx.soulRise(gx, gy + 16, 40, 480, 5, SPIRIT_TONES);
      const z = amalgam(ctx, { x: gx, y: gy + 16, size: 14, born: at });
      let dead = false;
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < at || dead) return;
        const ang = Math.atan2(ctx.cy - z.y, ctx.cx - z.x);
        z.vx = Math.cos(ang) * 70; z.vy = Math.sin(ang) * 70;
        z.x += z.vx * (dt / 1000); z.y += z.vy * (dt / 1000);
      });
      // Burned down by the lantern on the way in.
      volley(ctx, { to: () => z, born: at + 300, until: at + 1400 });
      ctx.at(at + 1700, () => {
        dead = true;
        queued = Math.min(5, queued + 1);
        fx.wispBloom(z.x, z.y, 36, 520, 6, SPIRIT_TONES);
        fx.wisps(z.x, z.y, 6, { speed: 110, life: 620, depth: 6 });
        z.x = -999;
        void i;
      });
    }));
  },
};

export const graveUpgraded: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Restless Ground — always a variant, and R beside your own plot builds it up to a tier 3 graveyard',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const gx = ctx.cx + 140, gy = ctx.cy - 20;
    ctx.at(200, () => { av.play('slam', ctx.aim); grave(ctx, { x: gx, y: gy, born: 200 }); });

    // The 90px build radius — what decides whether R plants a stone or raises the plot.
    let tier = 1;
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      ring.clear();
      if (elapsed < 200) return;
      const col = tier >= 3 ? SOUL.blood : tier === 2 ? SOUL.cinder : SOUL.orchid;
      ring.lineStyle(1.5, ctx.tint(col), 0.25 + 0.12 * Math.sin(elapsed / 260));
      ring.strokeCircle(gx, gy, 90);
      SoulFx.drawPuddle(ring, ctx.tint, tier >= 3 ? ANGERED_TONES : SPIRIT_TONES,
        gx, gy + 20, 18 * (1 + (tier - 1) * 0.35), elapsed / 1000, 0.6);
    });

    // Two more presses, two more tiers.
    [1100, 2400].forEach((at) => ctx.at(at, () => {
      tier += 1;
      const tones = tier >= 3 ? ANGERED_TONES : SPIRIT_TONES;
      av.play('slam', ctx.aim);
      fx.bloom(gx, gy, 30 + tier * 6, 10, 4, tones);
      fx.ring(gx, gy, 8, 46 + tier * 12, tones.glow, 460, 4, 5);
      fx.wisps(gx, gy, 8, { speed: 90, size: 3, life: 620, rise: -44, depth: 6, tones });
      const t = ctx.adopt(ctx.scene.add.text(gx, gy - 42, `🪦 GRAVEYARD — TIER ${tier}`, {
        fontSize: '11px', fontFamily: 'Arial Black', color: tier >= 3 ? '#ff3333' : '#ccaaff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1600 });
    }));

    // What each tier raises — and the tier 3 one comes up Angered as well as branded.
    const names = ['⚡ TIER 1 VARIANT', '🛡️ TIER 2 VARIANT', '🩸 TIER 3 — ANGERED'];
    const cols = ['#ccaaff', '#ffaa55', '#ff3333'];
    [700, 1900, 3300].forEach((at, i) => ctx.at(at, () => {
      const x = gx - 50 - i * 44, y = gy + 34 + (i % 2 ? 22 : -16);
      const angered = i === 2;
      fx.soulRise(x, y, 46 + i * 6, 520, 5, angered ? ANGERED_TONES : SPIRIT_TONES);
      const a = amalgam(ctx, { x, y, size: 15 + i * 3, born: at });
      a.st.angered = angered;
      if (angered) {
        const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
        ctx.onFrame((_dt, elapsed) => {
          aura.clear();
          if (elapsed < at) return;
          SoulFx.drawAngeredAura(aura, ctx.tint, a.x, a.y, 26, elapsed / 1000);
        });
      }
      const t = ctx.adopt(ctx.scene.add.text(x, y - 34, names[i], {
        fontSize: '10px', fontFamily: 'Arial Black', color: cols[i],
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 2400 });
    }));
  },
};

export const deathWhistle: PreviewScript = {
  duration: 5200,
  scale: 0.85,
  caption: 'F — every Amalgam runs to the shriek and heals 75% of its max HP on arrival',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark = { x: ctx.cx + 180, y: ctx.cy + 10 };
    const crew = [
      amalgam(ctx, { x: ctx.cx + 40, y: ctx.cy - 70 }),
      amalgam(ctx, { x: ctx.cx + 260, y: ctx.cy + 70 }),
      amalgam(ctx, { x: ctx.cx + 90, y: ctx.cy + 80 }),
    ];
    let called = false;
    const arrived = new Set<PreviewAmalgam>();
    ctx.onFrame((dt) => {
      if (!called) return;
      for (const a of crew) {
        if (arrived.has(a)) continue;
        const ang = Math.atan2(mark.y - a.y, mark.x - a.x);
        a.vx = Math.cos(ang) * 115; a.vy = Math.sin(ang) * 115;
        a.x += a.vx * (dt / 1000); a.y += a.vy * (dt / 1000);
        // 30px arrival radius, exactly as the kit checks it.
        if (Phaser.Math.Distance.Between(a.x, a.y, mark.x, mark.y) <= 30) {
          arrived.add(a);
          a.vx = 0; a.vy = 0;
          fx.wispBloom(a.x, a.y, 40, 520, 6, SPIRIT_TONES);
          const t = ctx.adopt(ctx.scene.add.text(a.x, a.y - 28, '+75%', {
            fontSize: '12px', fontFamily: 'Arial Black', color: '#66ff99',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 1000 });
        }
      }
    });
    ctx.at(600, () => {
      av.play('raise', ctx.aim, 600);
      called = true;
      fx.shriek(mark.x, mark.y, 150, 620, 8, SPIRIT_TONES);
      fx.ring(mark.x, mark.y, 10, 150, SOUL.lilac, 560, 4, 5);
      for (const a of crew) fx.tether(mark.x, mark.y, a.x, a.y, 420, 6, SPIRIT_TONES);
    });
  },
};

export const deathWhistleUpgraded: PreviewScript = {
  duration: 5400,
  scale: 0.85,
  caption: 'Carrion Call — anything that answers gets +50% speed and +50% damage for 10s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: false });
    const mark = { x: ctx.cx + 150, y: ctx.cy };
    const crew = [
      amalgam(ctx, { x: ctx.cx + 40, y: ctx.cy - 60 }),
      amalgam(ctx, { x: ctx.cx + 60, y: ctx.cy + 70 }),
    ];
    let called = false;
    const buffed = new Set<PreviewAmalgam>();
    ctx.onFrame((dt, elapsed) => {
      if (!called) return;
      for (const a of crew) {
        const home = buffed.has(a);
        const target = home ? { x: ctx.tx, y: ctx.ty } : mark;
        const ang = Math.atan2(target.y - a.y, target.x - a.x);
        // ×1.5 speed once blooded, and a red trail behind them.
        const spd = 115 * (home ? 1.5 : 1);
        a.vx = Math.cos(ang) * spd; a.vy = Math.sin(ang) * spd;
        a.x += a.vx * (dt / 1000); a.y += a.vy * (dt / 1000);
        if (!home && Phaser.Math.Distance.Between(a.x, a.y, mark.x, mark.y) <= 30) {
          buffed.add(a);
          fx.wispBloom(a.x, a.y, 40, 520, 6, ANGERED_TONES);
          const t = ctx.adopt(ctx.scene.add.text(a.x, a.y - 30, '+50% SPD · +50% DMG', {
            fontSize: '9px', fontFamily: 'Arial Black', color: '#ff2222',
          }).setOrigin(0.5).setDepth(12));
          ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1600 });
        }
        // The trail, at its real 80ms cadence.
        if (home && elapsed % 80 < 20) fx.motes(a.x, a.y, 1, 14, 4, ANGERED_TONES);
      }
    });
    ctx.at(500, () => {
      av.play('raise', ctx.aim, 600);
      called = true;
      fx.shriek(mark.x, mark.y, 140, 620, 8, ANGERED_TONES);
    });
  },
};

/**
 * Turn's shared loop: three hostile bodies close in, the shriek goes out, and each is hauled
 * over on a thread and comes up in your colours, turning on the dummy. `legion` adds the Q+ tell.
 */
function turnLoop(ctx: PreviewCtx, legion: boolean): void {
  const { fx, av } = stage(ctx);
  const crew = [
    amalgam(ctx, { x: ctx.cx + 150, y: ctx.cy - 70 }),
    amalgam(ctx, { x: ctx.cx + 190, y: ctx.cy + 50 }),
    amalgam(ctx, { x: ctx.cx - 130, y: ctx.cy + 40 }),
  ];
  let turned = false;
  for (const c of crew) c.st.tones = ROT_TONES;
  ctx.onFrame((dt) => {
    for (const c of crew) {
      // Before the shriek they shamble at you; after it they go for the dummy.
      const tx = turned ? ctx.tx : ctx.cx, ty = turned ? ctx.ty : ctx.cy;
      const ang = Math.atan2(ty - c.y, tx - c.x);
      const sp = turned && legion ? 170 : 115;
      c.vx = Math.cos(ang) * sp; c.vy = Math.sin(ang) * sp;
      if (Phaser.Math.Distance.Between(c.x, c.y, tx, ty) > 40) {
        c.x += c.vx * (dt / 1000) * 0.35; c.y += c.vy * (dt / 1000) * 0.35;
      }
    }
  });
  ctx.at(1300, () => {
    av.play('raise', ctx.aim, 700);
    fx.shriek(ctx.cx, ctx.cy, 200, 760, 8, SPIRIT_TONES);
    fx.ring(ctx.cx, ctx.cy, 200, 16, SOUL.orchid, 620, 4, 6);
    crew.forEach((c, i) => ctx.at(120 + i * 110, () => {
      fx.tether(ctx.cx, ctx.cy, c.x, c.y, 420, 5, SPIRIT_TONES);
      fx.soulRise(c.x, c.y + 6, 44, 560, 5, SPIRIT_TONES);
      c.st.tones = legion ? ANGERED_TONES : SPIRIT_TONES;
      if (legion) {
        c.st.angered = true;
        pop(ctx, c.x, c.y - 30, '+25 HP · 🩸', '#ff4455');
      }
    }));
    ctx.at(500, () => {
      turned = true;
      pop(ctx, ctx.cx, ctx.cy - 50, legion ? '🔄 WE ARE LEGION — 3 TURNED' : '🔄 3 TURNED', legion ? '#ff5577' : '#cc99ff', 12);
    });
  });
}

export const turn: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Q — every hostile amalgam and zombie within 240px turns and fights for you',
  run(ctx) { turnLoop(ctx, false); },
};

export const turnUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'We are Legion — the turned rise with +25 HP and Carrion Call already on them',
  run(ctx) { turnLoop(ctx, true); },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveThreeBodies: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Passive — 3 bodies a side, grave zombies and Amalgams sharing the ceiling',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const gx = ctx.cx + 170, gy = ctx.cy - 30;
    grave(ctx, { x: gx, y: gy, born: 200 });

    // The count beside the queue, red at the ceiling — the same readout the HUD draws.
    const live: { a: PreviewAmalgam; dead: boolean }[] = [];
    const count = ctx.adopt(ctx.scene.add.text(ctx.cx, 24, '', {
      fontSize: '12px', fontFamily: 'Arial Black', color: '#9977bb',
    }).setOrigin(0.5).setDepth(12));
    const alive = (): number => live.filter((e) => !e.dead).length;
    ctx.onFrame(() => {
      count.setText(`🧟 ${alive()}/3`).setColor(alive() >= 3 ? '#ff7777' : '#9977bb');
    });

    // Two zombies out of the plot, then one Amalgam raised — that is the ceiling.
    const raise = (at: number, x: number, y: number, tones = SPIRIT_TONES): void => ctx.at(at, () => {
      fx.soulRise(x, y, 46, 520, 5, tones);
      const a = amalgam(ctx, { x, y, size: 15, born: at });
      const e = { a, dead: false };
      live.push(e);
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < at || e.dead) return;
        const ang = Math.atan2(ctx.cy - a.y, ctx.cx - a.x);
        a.vx = Math.cos(ang) * 60; a.vy = Math.sin(ang) * 60;
        a.x += a.vx * (dt / 1000); a.y += a.vy * (dt / 1000);
      });
    });
    raise(600, gx - 10, gy + 20);
    raise(1600, gx + 10, gy + 30);
    ctx.at(2400, () => { av.play('raise', ctx.aim, 500); });
    raise(2600, ctx.cx + 80, ctx.cy + 50);

    // A fourth press at the cap is simply refused, and the corpse stays where it was.
    ctx.at(3400, () => {
      av.play('raise', ctx.aim, 420);
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 44, '🪦 3 BODIES ALREADY', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#775588',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1600 });
    });
    ctx.at(4000, () => {
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 60, 'the corpse is not spent', {
        fontSize: '10px', fontFamily: 'Arial', color: '#9977bb',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 1600 });
    });

    // Draining one open makes the room — which is the whole point of the shared ceiling.
    ctx.at(4600, () => {
      const e = live[0];
      volley(ctx, { to: () => e.a, born: 4600, until: 5100 });
    });
    ctx.at(5400, () => {
      const e = live[0];
      e.dead = true;
      fx.wispBloom(e.a.x, e.a.y, 36, 520, 6, SPIRIT_TONES);
      fx.wisps(e.a.x, e.a.y, 6, { speed: 110, life: 620, depth: 6 });
      e.a.x = -999;
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 44, 'A SLOT OPENS', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#a6f0c2',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1400 });
    });
  },
};

export const passiveCorpseQueue: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Passive — 5 slots, newest first; a corpse keeps the max HP of whatever it was',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let queued = 0;
    corpseQueue(ctx, () => queued);
    // Bodies falling near you and being filed, then one popped back off the front.
    [500, 1200, 1900, 2600].forEach((at, i) => ctx.at(at, () => {
      const x = ctx.cx + 90 + i * 52, y = ctx.cy + (i % 2 ? 30 : -26);
      fx.wispBloom(x, y, 34, 480, 6, SPIRIT_TONES);
      fx.wisps(x, y, 5, { speed: 100, life: 560, depth: 6 });
      queued = Math.min(5, queued + 1);
      fx.tether(x, y, 30, 20, 500, 6, SPIRIT_TONES);
    }));
    ctx.at(3800, () => {
      av.play('raise', ctx.aim, 500);
      queued -= 1;
      const x = ctx.cx + 150, y = ctx.cy;
      fx.soulRise(x, y, 60, 620, 5, SPIRIT_TONES);
      amalgam(ctx, { x, y, born: 4000 });
    });
  },
};

export const passiveAmalgams: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Passive — 115 px/s, an 8-damage bite every 0.9s, and a 15-damage dash every 4–6s',
  run(ctx) {
    const { fx } = stage(ctx);
    const a = amalgam(ctx, { x: ctx.cx + 60, y: ctx.cy + 20 });
    let dashing = false;
    ctx.onFrame((dt) => {
      const ang = Math.atan2(ctx.ty - a.y, ctx.tx - a.x);
      const d = Phaser.Math.Distance.Between(a.x, a.y, ctx.tx, ctx.ty);
      const spd = 115 * (dashing ? 2.4 : 1);
      if (d > 30) { a.vx = Math.cos(ang) * spd; a.vy = Math.sin(ang) * spd; }
      else { a.vx = 0; a.vy = 0; }
      a.x += a.vx * (dt / 1000); a.y += a.vy * (dt / 1000);
      a.st.dashing = dashing;
    });
    // Bites at their real 0.9s cadence.
    for (let i = 0; i < 5; i++) {
      ctx.at(1400 + i * 900, () => {
        fx.flash(ctx.tx, ctx.ty, 22, 7, SPIRIT_TONES);
        const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 26, '8', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#ccaaff',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 800 });
      });
    }
    // And a dash lunge: ×2.4 speed for 0.4s, hitting for 15.
    ctx.at(4600, () => {
      a.x = ctx.cx + 40; a.y = ctx.cy - 40;
      dashing = true;
      ctx.at(400, () => {
        dashing = false;
        fx.wispBloom(ctx.tx, ctx.ty, 40, 460, 6, SPIRIT_TONES);
        const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 32, '15', {
          fontSize: '13px', fontFamily: 'Arial Black', color: '#ffb3aa',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1000 });
      });
    });
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkWard: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'Perk — 2 or more Amalgams within 220px of you is a flat ×0.7 on everything you take',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const crew = [
      amalgam(ctx, { x: ctx.cx + 90, y: ctx.cy - 50 }),
      amalgam(ctx, { x: ctx.cx + 300, y: ctx.cy + 60 }),
    ];
    // The 220px range ring, and the state readout that flips with it.
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 56, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ccbb55',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame((dt) => {
      // The far one walks in, and the perk switches on when it arrives.
      const far = crew[1];
      const ang = Math.atan2(ctx.cy - far.y, ctx.cx - far.x);
      far.vx = Math.cos(ang) * 115; far.vy = Math.sin(ang) * 115;
      far.x += far.vx * (dt / 1000); far.y += far.vy * (dt / 1000);
      const near = crew.filter((a) => Phaser.Math.Distance.Between(a.x, a.y, ctx.cx, ctx.cy) <= 220).length;
      ring.clear();
      ring.lineStyle(1.5, ctx.tint(near >= 2 ? SOUL.bone : SOUL.stone), near >= 2 ? 0.5 : 0.2);
      ring.strokeCircle(ctx.cx, ctx.cy, 220);
      label.setText(near >= 2 ? '🛡️ WARDED  ×0.7 DAMAGE TAKEN' : `${near}/2 IN RANGE`);
      for (const a of crew) {
        if (Phaser.Math.Distance.Between(a.x, a.y, ctx.cx, ctx.cy) > 220) continue;
        SoulFx.drawBond(ring, ctx.tint, SPIRIT_TONES, ctx.cx, ctx.cy, a.x, a.y, 0, near >= 2 ? 1 : 0.4);
      }
    });
    [1400, 2600, 3800].forEach((at) => ctx.at(at, () => fx.flash(ctx.cx, ctx.cy, 26, 7, SPIRIT_TONES)));
  },
};

export const perkCallOfTheVoid: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Divine perk — the whistle kills anything under the threshold; each claim raises it 5% to 30%',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    let threshold = 0.10;
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 54, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#442266',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame(() => label.setText(`🕳️ THRESHOLD ${Math.round(threshold * 100)}%`));
    // Three shrieks: two claim and escalate, the third finds nothing and resets.
    [600, 2200, 3800].forEach((at, i) => ctx.at(at, () => {
      av.play('raise', ctx.aim, 500);
      const mx = ctx.cx + 140, my = ctx.cy + (i % 2 ? 30 : -20);
      fx.shriek(mx, my, 150, 620, 8, SPIRIT_TONES);
      fx.ring(mx, my, 8, 150, SOUL.crypt, 560, 4, 5);
      if (i < 2) {
        fx.wispBloom(mx, my, 46, 560, 6, SPIRIT_TONES);
        threshold = Math.min(0.30, threshold + 0.05);
        const t = ctx.adopt(ctx.scene.add.text(mx, my - 34, '💀 CLAIMED', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#9955ee',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1400 });
      } else {
        threshold = 0.10;
        const t = ctx.adopt(ctx.scene.add.text(mx, my - 34, 'NOTHING — RESET TO 10%', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#776688',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1600 });
      }
    }));
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryCorpsePrince: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Mastery passive — the Corpse Prince starts in your queue, and comes back 12s after he falls',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let held = 1;
    corpseQueue(ctx, () => held);
    // The prince's corpse sits gold at the front of the queue.
    const crown = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame(() => {
      crown.clear();
      if (held < 1) return;
      crown.lineStyle(2, ctx.tint(SOUL.gold), 1);
      crown.strokeRoundedRect(14, 10, 22, 22, 5);
    });
    let prince: PreviewAmalgam | null = null;
    let fallen = false;
    ctx.at(500, () => {
      av.play('raise', ctx.aim, 600);
      held = 0;
      const x = ctx.cx + 60, y = ctx.cy + 10;
      fx.soulRise(x, y, 64, 620, 5, GOLD_TONES);
      prince = amalgam(ctx, { x, y, prince: true, born: 500 });
      prince.st.tones = GOLD_TONES;
      pop(ctx, x, y - 40, '👑 THE CORPSE PRINCE RISES', '#ffd24a');
    });
    ctx.onFrame((dt, elapsed) => {
      const p = prince;
      if (!p || fallen) return;
      const ang = Math.atan2(ctx.ty - p.y, ctx.tx - p.x);
      p.vx = Math.cos(ang) * 120; p.vy = Math.sin(ang) * 120;
      if (Phaser.Math.Distance.Between(p.x, p.y, ctx.tx, ctx.ty) > 46) {
        p.x += p.vx * (dt / 1000) * 0.4; p.y += p.vy * (dt / 1000) * 0.4;
      }
      // A lunge every so often once he is on top of it.
      p.st.dashing = elapsed % 1400 < 260 && Phaser.Math.Distance.Between(p.x, p.y, ctx.tx, ctx.ty) < 60;
    });
    [2000, 2700, 3400].forEach((at) => ctx.at(at, () => pop(ctx, ctx.tx, ctx.ty - 30, at === 3400 ? '22' : '14', '#ffe07a')));
    ctx.at(4000, () => {
      const p = prince;
      if (!p) return;
      fallen = true;
      fx.wisps(p.x, p.y, 10, { speed: 70, size: 3, life: 720, rise: -46, depth: 6, tones: GOLD_TONES });
      pop(ctx, p.x, p.y - 34, '👑 THE PRINCE FALLS — BACK IN 12s', '#ffd24a');
      p.x = -999;
    });
    // The real wait is 12 seconds; the loop skips ahead to the return.
    ctx.at(6000, () => {
      held = 1;
      fx.soulRise(ctx.cx, ctx.cy + 4, 40, 520, 4, GOLD_TONES);
      pop(ctx, ctx.cx, ctx.cy - 52, '👑 THE PRINCE AWAITS', '#ffd24a');
    });
  },
};

export const masteryGraveMistake: PreviewScript = {
  duration: 6800,
  scale: 0.9,
  caption: 'Mastery — a hostile 200 HP Alpha; kill it and the key becomes a 25-damage Soul Screech',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const gx = ctx.cx + 180, gy = ctx.cy - 10;
    grave(ctx, { x: gx, y: gy, born: 200 });
    let hostile = true;
    const alpha = amalgam(ctx, { x: gx, y: gy, size: 30, alpha: true, born: 1000 });
    const crown = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    let hp = 1;
    ctx.onFrame((dt, elapsed) => {
      crown.clear();
      if (elapsed < 1000) return;
      // 85 px/s, and it comes for you.
      const target = hostile ? { x: ctx.cx, y: ctx.cy } : { x: ctx.tx, y: ctx.ty };
      const ang = Math.atan2(target.y - alpha.y, target.x - alpha.x);
      const d = Phaser.Math.Distance.Between(alpha.x, alpha.y, target.x, target.y);
      if (d > 40) { alpha.vx = Math.cos(ang) * 85; alpha.vy = Math.sin(ang) * 85; }
      else { alpha.vx = 0; alpha.vy = 0; }
      alpha.x += alpha.vx * (dt / 1000); alpha.y += alpha.vy * (dt / 1000);
      alpha.st.angered = hostile;
      SoulFx.drawAlphaCrown(crown, ctx.tint, SPIRIT_TONES, alpha.x, alpha.y, 26, elapsed / 1000, hostile);
      // Its health bar, because the whole ability is a fight you have to win.
      crown.fillStyle(0x222222, 1);
      crown.fillRect(alpha.x - 24, alpha.y - 48, 48, 6);
      crown.fillStyle(hostile ? 0xff2222 : 0x44ff88, 1);
      crown.fillRect(alpha.x - 24, alpha.y - 48, 48 * hp, 6);
    });
    ctx.at(1000, () => {
      av.play('slam', ctx.aim);
      fx.soulRise(gx, gy, 90, 720, 5, ANGERED_TONES);
      fx.ring(gx, gy, 12, 90, SOUL.blood, 620, 5, 5);
      // The anti-heal cone: 5 bullets every 3s, and no healing for 5s if they land.
      [400, 3400].forEach((at) => ctx.at(at, () => {
        for (let i = 0; i < 5; i++) {
          const a = Math.atan2(ctx.cy - alpha.y, ctx.cx - alpha.x) + (i - 2) * 0.2;
          fx.wisps(alpha.x, alpha.y, 1, { angle: a, spread: 0, speed: 260, life: 620, depth: 7 });
        }
        const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 40, '🚫 NO HEALING 5s', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#33cc44',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1600 });
      }));
    });
    // Bring it down and it turns.
    [2400, 3000, 3600, 4200].forEach((at, i) => ctx.at(at, () => {
      hp = 0.75 - i * 0.25;
      fx.flash(alpha.x, alpha.y, 30, 7, ANGERED_TONES);
      if (i === 3) {
        hostile = false;
        hp = 1;
        fx.wispBloom(alpha.x, alpha.y, 70, 720, 6, SPIRIT_TONES);
        const t = ctx.adopt(ctx.scene.add.text(alpha.x, alpha.y - 62, '💀 IT RISES FOR YOU', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#ccaaff',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
      }
    }));
    // And the key becomes Soul Screech.
    ctx.at(5200, () => {
      av.play('raise', ctx.aim, 500);
      fx.shriek(ctx.cx, ctx.cy, 165, 720, 8, SPIRIT_TONES);
      fx.ring(ctx.cx, ctx.cy, 14, 165, SOUL.lilac, 620, 5, 5);
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 58, 'SOUL SCREECH — 25 DMG · HEALS ALLIES', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#eeddff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
    });
  },
};
