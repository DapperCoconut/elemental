import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  SoulFx, SOUL, SoulAvatar, SoulAmalgamBody, SPIRIT_TONES, TORMENT_TONES, ANGERED_TONES, ROT_TONES,
  AmalgamBodyState,
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
  o: { x: number; y: number; size?: number; alpha?: boolean; born?: number },
): PreviewAmalgam {
  const a: PreviewAmalgam = { x: o.x, y: o.y, vx: 0, vy: 0, hp: 1, maxHp: 1, st: {} };
  const body = ctx.capture(() => new SoulAmalgamBody(ctx.scene, ctx.tint, {
    size: o.size ?? 19, alpha: o.alpha, depth: 6,
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

/** A siphon cord between the caster and a moving anchor, painted the way the kit repaints its own. */
function cord(
  ctx: PreviewCtx,
  o: { to: () => { x: number; y: number }; born: number; drain: boolean; until?: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed < o.born || (o.until !== undefined && elapsed > o.until)) return;
    const p = o.to();
    const dist = Phaser.Math.Distance.Between(ctx.cx, ctx.cy, p.x, p.y);
    SoulFx.drawSiphon(g, ctx.tint, o.drain ? ROT_TONES : SPIRIT_TONES,
      ctx.cx, ctx.cy, p.x, p.y, elapsed / 1000, o.drain,
      Phaser.Math.Clamp(dist / 330, 0, 1));
  });
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

export const siphon: PreviewScript = {
  duration: 6000,
  caption: 'Click — three cords at once: 4 dmg/s out of anything hostile, 8 HP/s into your own',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const ally = amalgam(ctx, { x: ctx.cx + 90, y: ctx.cy + 60 });
    const mark = { x: ctx.tx, y: ctx.ty };
    av.setHold('spray', ctx.aim);

    // Two drains onto the enemy and one mend onto the amalgam — the ceiling, split.
    ctx.at(400, () => {
      fx.muzzleWisp(ctx.cx, ctx.cy, ctx.aim, 0.9, 6, ROT_TONES);
      fx.ring(mark.x, mark.y, 20, 6, ROT_TONES.glow, 320, 2.5, 6);
      cord(ctx, { to: () => mark, born: 400, drain: true });
    });
    ctx.at(1000, () => {
      fx.muzzleWisp(ctx.cx, ctx.cy, ctx.aim, 0.9, 6, ROT_TONES);
      cord(ctx, { to: () => ({ x: mark.x, y: mark.y - 14 }), born: 1000, drain: true });
    });
    ctx.at(1600, () => {
      fx.muzzleWisp(ctx.cx, ctx.cy, Math.atan2(ally.y - ctx.cy, ally.x - ctx.cx), 0.9, 6, SPIRIT_TONES);
      fx.ring(ally.x, ally.y, 20, 6, SPIRIT_TONES.glow, 320, 2.5, 6);
      cord(ctx, { to: () => ally, born: 1600, drain: false });
    });

    // The enemy drifting out to the leash, and the cords letting go when it gets there.
    ctx.onFrame((dt, elapsed) => { if (elapsed > 3600) mark.x += 150 * (dt / 1000); });

    // Half-second ticks on both halves of the ability.
    for (let i = 1; i <= 6; i++) {
      ctx.at(400 + i * 500, () => {
        const drains = 400 + i * 500 >= 1000 ? 2 : 1;
        const hurt = ctx.adopt(ctx.scene.add.text(mark.x, mark.y - 24, `−${2 * drains}`, {
          fontSize: '11px', fontFamily: 'Arial', color: '#88ee99',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: hurt, y: hurt.y - 16, alpha: 0, duration: 800 });
        if (400 + i * 500 < 1600) return;
        const heal = ctx.adopt(ctx.scene.add.text(ally.x, ally.y - 26, '+4', {
          fontSize: '11px', fontFamily: 'Arial', color: '#66ff99',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: heal, y: heal.y - 16, alpha: 0, duration: 800 });
      });
    }

    ctx.at(5000, () => {
      fx.wisps((ctx.cx + mark.x) / 2, (ctx.cy + mark.y) / 2, 5, {
        speed: 90, size: 2.6, life: 420, rise: -20, depth: 6, tones: ROT_TONES,
      });
      const t = ctx.adopt(ctx.scene.add.text(mark.x, mark.y - 30, 'SNAPPED — 330px', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#9977bb',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1400 });
    });
  },
};

export const siphonUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Possession — 12s riding an Amalgam, your body open and untouchable, then a 30s recovery',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const ally = amalgam(ctx, { x: ctx.cx + 130, y: ctx.cy + 20 });
    const mark = { x: ctx.tx + 60, y: ctx.ty };

    // Three mend cords onto the same body — that is the whole unlock condition.
    [500, 1000, 1500].forEach((at, i) => ctx.at(at, () => {
      fx.muzzleWisp(ctx.cx, ctx.cy, Math.atan2(ally.y - ctx.cy, ally.x - ctx.cx), 0.9, 6, SPIRIT_TONES);
      cord(ctx, { to: () => ({ x: ally.x, y: ally.y - 12 + i * 12 }), born: at, drain: false, until: 2100 });
      const t = ctx.adopt(ctx.scene.add.text(ally.x, ally.y - 34, `💜 ${i + 1}/3`, {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc99ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 900 });
    }));

    // The caster opens, and stays open, for the rest of the run.
    let open = 0;
    const flower = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((dt, elapsed) => {
      flower.clear();
      if (elapsed < 2000) return;
      open = Math.min(1, open + dt / 420);
      SoulFx.drawFlower(flower, ctx.tint, SPIRIT_TONES, ctx.cx, ctx.cy, 30, elapsed / 1000, open, 1);
    });
    ctx.at(2000, () => {
      av.play('raise', undefined, 700);
      fx.bloom(ctx.cx, ctx.cy, 54, 14, 6, SPIRIT_TONES);
      fx.ring(ctx.cx, ctx.cy, 10, 110, SOUL.orchid, 620, 5, 6);
      fx.soulRise(ctx.cx, ctx.cy, 90, 800, 7, SPIRIT_TONES);
      fx.tether(ctx.cx, ctx.cy, ally.x, ally.y, 620, 7, SPIRIT_TONES);
      fx.shriek(ally.x, ally.y, 110, 640, 8, SPIRIT_TONES);
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 50, '🌸 POSSESSION — 12s', {
        fontSize: '12px', fontFamily: 'Arial Black', color: '#cc99ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1600 });
    });

    // The plate the kit draws under the corpse queue: what you are wearing, and the clock on it.
    const plate = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const plateName = ctx.adopt(ctx.scene.add.text(ctx.cx, 24, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#eeddff',
    }).setOrigin(0.5).setDepth(12));
    const plateKeys = ctx.adopt(ctx.scene.add.text(ctx.cx, 39, '', {
      fontSize: '9px', fontFamily: 'Arial', color: '#9977bb',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      plate.clear();
      if (elapsed < 2000) { plateName.setText(''); plateKeys.setText(''); return; }
      const w = 190, h = 34, y = 31;
      // 12 seconds compressed to the run's own remaining time, so the bar reads as a countdown.
      const left = Phaser.Math.Clamp(1 - (elapsed - 2000) / 5400, 0, 1);
      plate.fillStyle(0x0b0d16, 0.86);
      plate.fillRoundedRect(ctx.cx - w / 2, y - h / 2, w, h, 6);
      plate.lineStyle(1.4, ctx.tint(SOUL.orchid), 0.95);
      plate.strokeRoundedRect(ctx.cx - w / 2, y - h / 2, w, h, 6);
      plate.fillStyle(0x2a1230, 0.9);
      plate.fillRoundedRect(ctx.cx - (w - 12) / 2, y + h / 2 - 9, w - 12, 4, 2);
      plate.fillStyle(0x44ff88, 0.95);
      plate.fillRoundedRect(ctx.cx - (w - 12) / 2, y + h / 2 - 9, w - 12, 4, 2);
      plate.fillStyle(0x2a1230, 0.9);
      plate.fillRoundedRect(ctx.cx - (w - 12) / 2, y + h / 2 - 4, w - 12, 3, 1.5);
      plate.fillStyle(ctx.tint(left < 0.25 ? SOUL.blood : SOUL.orchid), 0.95);
      plate.fillRoundedRect(ctx.cx - (w - 12) / 2, y + h / 2 - 4, (w - 12) * left, 3, 1.5);
      plateName.setText('🌸 🧟 AMALGAM');
      plateKeys.setText('WASD move · CLICK bite 8 · E LUNGE');
    });

    // WASD drives the amalgam onto the mark, and Click bites with it.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 2400) return;
      const ang = Math.atan2(mark.y - ally.y, mark.x - ally.x);
      if (Phaser.Math.Distance.Between(ally.x, ally.y, mark.x, mark.y) > 46) {
        ally.vx = Math.cos(ang) * 115; ally.vy = Math.sin(ang) * 115;
        ally.x += ally.vx * (dt / 1000); ally.y += ally.vy * (dt / 1000);
      } else { ally.vx = 0; ally.vy = 0; }
    });
    [4200, 4900, 5600].forEach((at) => ctx.at(at, () => {
      const ang = Math.atan2(mark.y - ally.y, mark.x - ally.x);
      fx.muzzleWisp(ally.x + Math.cos(ang) * 14, ally.y + Math.sin(ang) * 14, ang, 1, 7, SPIRIT_TONES);
      const t = ctx.adopt(ctx.scene.add.text(mark.x, mark.y - 24, '−8', {
        fontSize: '11px', fontFamily: 'Arial', color: '#ff9c9c',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 800 });
    }));

    // Everything aimed at the open body is simply gone.
    [3200, 4600].forEach((at) => ctx.at(at, () => {
      fx.flash(ctx.cx, ctx.cy, 16, 8, SPIRIT_TONES);
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 34, 'UNTOUCHABLE', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#eeddff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1200 });
    }));

    // And the clock running out puts you back whether the body survived or not.
    ctx.at(6600, () => {
      open = 0;
      fx.wisps(ctx.cx, ctx.cy, 12, { speed: 120, size: 3, life: 640, rise: -50, depth: 7, tones: SPIRIT_TONES });
      fx.ring(ctx.cx, ctx.cy, 90, 8, SOUL.orchid, 520, 4, 6);
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 50, '🌸 POSSESSION SPENT', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#9977bb',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1400 });
      const c = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 34, 'recovering — 30s', {
        fontSize: '10px', fontFamily: 'Arial', color: '#775588',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: c, y: c.y - 10, alpha: 0, duration: 1400 });
    });
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
      // The cord it is drained dry on, on the way in.
      cord(ctx, { to: () => z, born: at + 300, drain: true, until: at + 1700 });
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

export const hellsTorment: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Q — every Amalgam burns at 5 dmg/s: 15 in 60px each second, then a 120px burst',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const crew = [
      amalgam(ctx, { x: ctx.cx + 110, y: ctx.cy - 40 }),
      amalgam(ctx, { x: ctx.cx + 170, y: ctx.cy + 40 }),
      amalgam(ctx, { x: ctx.cx + 230, y: ctx.cy - 20 }),
    ];
    ctx.at(500, () => {
      av.play('raise', ctx.aim, 800);
      fx.ring(ctx.cx, ctx.cy, 12, 260, SOUL.flame, 620, 5, 5);
      for (const a of crew) {
        a.st.burning = true;
        fx.immolate(a.x, a.y, 34);
      }
      // One AOE and three embers off every burning body, once a second.
      for (let s = 1; s <= 4; s++) {
        ctx.at(s * 1000, () => {
          for (const a of crew) {
            fx.ring(a.x, a.y, 8, 60, SOUL.ember, 380, 3, 5);
            fx.wisps(a.x, a.y, 3, { speed: 140, life: 520, depth: 6 });
            const t = ctx.adopt(ctx.scene.add.text(a.x, a.y - 30, '15', {
              fontSize: '11px', fontFamily: 'Arial Black', color: '#ff6622',
            }).setOrigin(0.5).setDepth(12));
            ctx.scene.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 800 });
          }
        });
      }
      // Then the flames finish them: a 120px burst each.
      crew.forEach((a, i) => ctx.at(4200 + i * 300, () => {
        fx.immolate(a.x, a.y, 120, { wisps: 12 });
        fx.ring(a.x, a.y, 14, 120, SOUL.flame, 520, 5, 6);
        a.x = -999;
      }));
    });
  },
};

export const hellsTormentUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Unending Hell — the burnt come back as the Inflamed: 100 HP, 15 bite, a 45-damage death',
  run(ctx) {
    const { fx, av } = stage(ctx);
    let queued = 0;
    corpseQueue(ctx, () => queued);
    const a = amalgam(ctx, { x: ctx.cx + 140, y: ctx.cy });
    ctx.at(400, () => {
      av.play('raise', ctx.aim, 800);
      a.st.burning = true;
      fx.immolate(a.x, a.y, 34);
    });
    // It burns down, and instead of being gone it is filed back into the queue.
    ctx.at(1800, () => {
      fx.immolate(a.x, a.y, 120, { wisps: 12 });
      a.x = -999;
      queued = 1;
      const t = ctx.adopt(ctx.scene.add.text(ctx.cx + 140, ctx.cy - 40, '🔥 THE INFLAMED', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ff4411',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1800 });
    });
    // Raised again, scarred, venting heat every 20 damage it takes.
    ctx.at(3000, () => {
      queued = 0;
      const b = amalgam(ctx, { x: ctx.cx + 160, y: ctx.cy + 10, born: 3000 });
      b.st.inflamed = true;
      fx.soulRise(b.x, b.y, 60, 620, 5, TORMENT_TONES);
      [900, 1600, 2300].forEach((at) => ctx.at(at, () => {
        fx.wisps(b.x, b.y, 5, { speed: 150, life: 520, depth: 6 });
        fx.ring(b.x, b.y, 8, 60, SOUL.ember, 340, 3, 5);
      }));
      // And its death: 20 embers and 45 damage across 170px.
      ctx.at(2900, () => {
        fx.immolate(b.x, b.y, 170, { wisps: 20 });
        fx.ring(b.x, b.y, 18, 170, SOUL.flame, 620, 6, 6);
        const t = ctx.adopt(ctx.scene.add.text(b.x, b.y - 40, '45', {
          fontSize: '14px', fontFamily: 'Arial Black', color: '#ff4411',
        }).setOrigin(0.5).setDepth(12));
        ctx.scene.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 1200 });
        b.x = -999;
      });
    });
  },
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
      cord(ctx, { to: () => e.a, born: 4600, drain: true, until: 5400 });
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

export const masteryStrengthInNumbers: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Mastery passive — 5% resistance per OTHER Amalgam alive, to a 75% cap at sixteen',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const crew: PreviewAmalgam[] = [];
    const links = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 170, ctx.cy - 70, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#bfe8ff',
    }).setOrigin(0.5).setDepth(11));
    ctx.onFrame((_dt, elapsed) => {
      links.clear();
      const resist = Math.min(0.75, Math.max(0, crew.length - 1) * 0.05);
      label.setText(crew.length ? `${crew.length} AMALGAMS  ·  ${Math.round(resist * 100)}% RESIST` : '');
      // The grey threads that make the bonus legible on the field.
      for (let i = 0; i < crew.length; i++) {
        for (let j = i + 1; j < crew.length; j++) {
          SoulFx.drawBond(links, ctx.tint, SPIRIT_TONES, crew[i].x, crew[i].y, crew[j].x, crew[j].y, elapsed / 1000, 0.5);
        }
      }
    });
    // Raised one at a time, the resistance climbing with each.
    for (let i = 0; i < 8; i++) {
      ctx.at(400 + i * 620, () => {
        const a = (i / 8) * Math.PI * 2;
        const x = ctx.cx + 180 + Math.cos(a) * 100, y = ctx.cy + Math.sin(a) * 76;
        fx.soulRise(x, y, 44, 480, 5, SPIRIT_TONES);
        crew.push(amalgam(ctx, { x, y, born: 400 + i * 620 }));
      });
    }
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
