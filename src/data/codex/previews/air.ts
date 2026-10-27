import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { AirFx, AIR, AirAvatar } from '../../../elements/kits/AirVisuals';

function stage(ctx: PreviewCtx): { fx: AirFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new AirFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new AirAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.addDummy();
  return { fx, av };
}

export const windSplice: PreviewScript = {
  duration: 2000,
  caption: 'Click — 20 damage inside 100px, plus a 12 damage shear out to 760px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(250, () => {
      av.play('sweep', ctx.aim);
      // The near cut, at its real 100px range and 0.95 radian half-arc.
      fx.fanCut(ctx.cx, ctx.cy, ctx.aim, 100, 0.95);
      // The shear that keeps going — 640 px/s, 28px hit radius.
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      ctx.onFrame((_dt, elapsed) => {
        const t = Phaser.Math.Clamp((elapsed - 320) / 900, 0, 1);
        g.clear();
        if (t <= 0 || t >= 1) return;
        AirFx.drawShear(g, ctx.tint, ctx.cx + 60 + 640 * t * 0.9, ctx.cy, ctx.aim, 1 - t * 0.3);
      });
      ctx.at(560, () => fx.gustBurst(ctx.tx, ctx.ty, 34));
    });
  },
};

export const windSpliceUpgraded: PreviewScript = {
  duration: 3200,
  caption: 'Whirlwind — every third splice throws a free Spin Dance with it',
  run(ctx) {
    const { fx, av } = stage(ctx);
    for (let i = 0; i < 3; i++) {
      const third = i === 2;
      ctx.at(250 + i * 800, () => {
        av.play('sweep', ctx.aim);
        fx.fanCut(ctx.cx, ctx.cy, ctx.aim, 100, 0.95);
        if (third) {
          // The free turn, at Spin Dance's real 115px radius.
          fx.spinFlourish(ctx.cx, ctx.cy, 115);
          fx.ring(ctx.cx, ctx.cy, 24, 115, AIR.white, 420, 4, 6);
          fx.petalBurst(ctx.cx, ctx.cy, 100, 16);
        }
      });
    }
  },
};

export const spinDance: PreviewScript = {
  duration: 2200,
  caption: 'E — 20 damage in 115px, and every other cooldown drops 2s on contact',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('sweep', ctx.aim, 460);
      fx.spinFlourish(ctx.cx, ctx.cy, 115);
      fx.ring(ctx.cx, ctx.cy, 20, 115, AIR.frost, 460, 4, 6);
      fx.motes(ctx.cx, ctx.cy, 16, { speed: 160, life: 620 });
      // The refund is the point of the ability, so it gets its own beat.
      ctx.at(320, () => { fx.staticSnap(ctx.cx, ctx.cy - 26, 22); fx.haze(ctx.cx, ctx.cy, 4, 60, 5); });
    });
  },
};

export const spinDanceUpgraded: PreviewScript = {
  duration: 3400,
  caption: 'Expert Dancer — two charges, and the second is a 135×46 flip along the cursor',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('sweep', ctx.aim, 460);
      fx.spinFlourish(ctx.cx, ctx.cy, 115);
      fx.ring(ctx.cx, ctx.cy, 20, 115, AIR.frost, 460, 4, 6);
    });
    ctx.at(1400, () => {
      // Back to back inside the 1.8s window — the second is the flip, not another spin.
      av.play('dash', ctx.aim, 420);
      fx.flipCut(ctx.cx + 60, ctx.cy, ctx.aim, 135, 46);
      fx.motes(ctx.cx + 60, ctx.cy, 20, { speed: 200, life: 640 });
      ctx.at(400, () => { fx.ring(ctx.cx + 60, ctx.cy, 16, 90, AIR.white, 380, 3, 6); fx.featherPuff(ctx.cx + 60, ctx.cy, 8); });
    });
  },
};

export const galeGlaive: PreviewScript = {
  duration: 4400,
  scale: 0.95,
  caption: 'R — 15 out, 10 per 0.4s parked for 2s, 20 on the return',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const parkX = ctx.tx, parkY = ctx.ty;
    ctx.at(250, () => {
      av.play('punch', ctx.aim);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      const outMs = 420, parkMs = 2000, backMs = 420;
      ctx.onFrame((_dt, elapsed) => {
        const e = elapsed - 250;
        g.clear();
        if (e < 0) return;
        let x = ctx.cx, y = ctx.cy;
        if (e < outMs) { const t = e / outMs; x = ctx.cx + (parkX - ctx.cx) * t; y = ctx.cy + (parkY - ctx.cy) * t; }
        else if (e < outMs + parkMs) { x = parkX; y = parkY; }
        else if (e < outMs + parkMs + backMs) {
          const t = (e - outMs - parkMs) / backMs;
          x = parkX + (ctx.cx - parkX) * t; y = parkY + (ctx.cy - parkY) * t;
        } else return;
        AirFx.drawGlaive(g, ctx.tint, x, y, 30, e / 90, 1);
      });
      // The park ticks at its real 0.4s cadence — five ticks over two seconds.
      for (let i = 0; i < 5; i++) ctx.at(outMs + i * 400, () => fx.gustBurst(parkX, parkY, 30));
      ctx.at(outMs + parkMs + backMs, () => { g.clear(); fx.staticSnap(ctx.cx, ctx.cy, 26); });
    });
  },
};

export const galeGlaiveUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.95,
  caption: 'Gale Afterimage — wooden phantoms hold the spot for 5s at 7 per tick',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const parkX = ctx.tx, parkY = ctx.ty;
    ctx.at(250, () => {
      av.play('punch', ctx.aim);
      ctx.at(420, () => {
        for (let i = 0; i < 5; i++) ctx.at(i * 400, () => fx.gustBurst(parkX, parkY, 30));
        ctx.at(2000, () => {
          // The pair that stays behind, still turning, for a full 5s.
          const ph = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
          ctx.onFrame((_dt, elapsed) => {
            const age = elapsed - 2670;
            ph.clear();
            if (age < 0 || age > 5000) return;
            const fade = 0.35 + 0.2 * Math.sin(age / 160);
            for (const off of [-16, 16]) {
              AirFx.drawGlaive(ph, (c) => (c === AIR.steel ? AIR.wood : c === AIR.frost ? AIR.woodDark : ctx.tint(c)),
                parkX + off, parkY, 30, age / 110, fade, true);
            }
          });
          for (let i = 0; i < 6; i++) ctx.at(i * 800, () => fx.motes(parkX, parkY, 6, { speed: 70, life: 520 }));
        });
      });
    });
  },
};

export const skyGrapple: PreviewScript = {
  duration: 2600,
  caption: 'F — 1400 px/s, untouchable in flight, +25% wind dodge on a ram',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.setHold('reach', ctx.aim);
      fx.hookLine(ctx.cx, ctx.cy, ctx.tx, ctx.ty, 420);
      ctx.at(200, () => {
        av.setHold('ride', ctx.aim);
        fx.slipstream(ctx.cx, ctx.cy, ctx.tx, ctx.ty);
        // The whole ability is the flight. The caster rides the line at the hook's own pace
        // and arrives on the target — standing still under a slipstream shows nothing.
        ctx.glideCaster({ to: { x: ctx.tx - 34, y: ctx.ty }, ms: 420 });
        // Untouchable: the caster reads as displaced air rather than a body.
        fx.motes(ctx.cx, ctx.cy, 18, { speed: 260, life: 420, angle: ctx.aim, spread: 0.6 });
        ctx.at(420, () => {
          av.setHold(null);
          fx.gustBurst(ctx.tx, ctx.ty, 44, { curls: 8 });
          fx.staticSnap(ctx.tx, ctx.ty, 30);
          fx.featherPuff(ctx.tx, ctx.ty, 10);
        });
      });
    });
  },
};

export const skyGrappleUpgraded: PreviewScript = {
  duration: 3200,
  caption: 'Final Flight — the ram deals half your last 10s of damage, and knocks back 620',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.setHold('reach', ctx.aim);
      fx.hookLine(ctx.cx, ctx.cy, ctx.tx, ctx.ty, 420);
      ctx.at(200, () => {
        av.setHold('ride', ctx.aim);
        fx.slipstream(ctx.cx, ctx.cy, ctx.tx, ctx.ty);
        // The whole ability is the flight. The caster rides the line at the hook's own pace
        // and arrives on the target — standing still under a slipstream shows nothing.
        ctx.glideCaster({ to: { x: ctx.tx - 34, y: ctx.ty }, ms: 420 });
        ctx.at(420, () => {
          av.setHold(null);
          fx.gustBurst(ctx.tx, ctx.ty, 60, { curls: 12 });
          fx.staticSnap(ctx.tx, ctx.ty, 40);
          // 620 of knockback — the dummy actually leaves.
          const kb = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
          ctx.onFrame((_dt, elapsed) => {
            const t = Phaser.Math.Clamp((elapsed - 920) / 700, 0, 1);
            kb.clear();
            if (t <= 0 || t >= 1) return;
            const x = ctx.tx + 620 * t * 0.22;
            kb.fillStyle(0x2b2f3d, 1 - t * 0.6); kb.fillCircle(x, ctx.ty, 17);
            kb.fillStyle(0x3c4254, 1 - t * 0.6); kb.fillCircle(x, ctx.ty, 13);
          });
          ctx.at(20, () => fx.motes(ctx.tx, ctx.ty, 22, { speed: 320, life: 620, angle: ctx.aim, spread: 0.8 }));
        });
      });
    });
  },
};

export const windBreaker: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'Q — 5s tornado, 12 damage per 0.5s in 155px, then the 1150 launch',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 900);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      ctx.onFrame((_dt, elapsed) => {
        const age = elapsed - 300;
        g.clear();
        if (age < 0 || age > 5000) return;
        AirFx.drawTornado(g, ctx.tint, ctx.cx, ctx.cy, 155, age / 1000, 1);
      });
      // Ten ticks over five seconds, at the real 0.5s cadence.
      for (let i = 0; i < 10; i++) ctx.at(i * 500, () => fx.gustBurst(ctx.cx, ctx.cy, 155 * 0.6));
      ctx.at(5000, () => {
        g.clear();
        fx.updraft(ctx.cx, ctx.cy, 40, 150);
        fx.ring(ctx.cx, ctx.cy, 30, 220, AIR.white, 520, 6, 6);
        fx.slipstream(ctx.cx, ctx.cy, ctx.cx + 260, ctx.cy);
        fx.motes(ctx.cx, ctx.cy, 26, { speed: 400, life: 700, angle: ctx.aim, spread: 0.5 });
      });
    });
  },
};

export const windBreakerUpgraded: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'Eye of the Storm — cast freely inside it; +10% dodge per hit, dodge/5 as bonus damage',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      av.play('raise', ctx.aim, 700);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      ctx.onFrame((_dt, elapsed) => {
        const age = elapsed - 300;
        g.clear();
        if (age < 0 || age > 5000) return;
        AirFx.drawTornado(g, ctx.tint, ctx.cx, ctx.cy, 155, age / 1000, 1);
      });
      // The whole point: she keeps casting. Splices and spins thrown from inside the storm.
      for (let i = 0; i < 5; i++) {
        ctx.at(400 + i * 900, () => {
          fx.fanCut(ctx.cx, ctx.cy, ctx.aim, 100, 0.95);
          fx.staticSnap(ctx.cx + 40, ctx.cy - 30 + i * 6, 18);
          fx.motes(ctx.tx, ctx.ty, 8, { speed: 180, life: 420 });
        });
      }
      ctx.at(5000, () => { g.clear(); fx.updraft(ctx.cx, ctx.cy, 40, 150); fx.ring(ctx.cx, ctx.cy, 30, 220, AIR.white, 520, 6, 6); });
    });
  },
};

// ── Element perks ─────────────────────────────────────────────────────────────

function pop(ctx: PreviewCtx, x: number, y: number, label: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, label, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color, stroke: '#1a2a3a', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(10));
  ctx.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 900 });
}

export const perkQuick: PreviewScript = {
  duration: 3000,
  caption: 'Perk — Quick: every ability, spin charges and Weather Cycle recharge 20% faster',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Two spins back to back on a 4.8s charge — the faster clock, shown as a tighter rhythm.
    for (let i = 0; i < 2; i++) {
      ctx.at(300 + i * 1200, () => {
        av.play('sweep', ctx.aim, 420);
        fx.spinFlourish(ctx.cx, ctx.cy, 115);
        fx.ring(ctx.cx, ctx.cy, 20, 115, AIR.frost, 420, 4, 6);
        pop(ctx, ctx.cx, ctx.cy - 50, '⏩ −20% CD', '#aaddff');
      });
    }
  },
};

export const perkGust: PreviewScript = {
  duration: 3600,
  scale: 0.95,
  caption: 'Perk — Gust: R throws a free spin, and R again teleports you onto the glaive for another',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const parkX = ctx.tx, parkY = ctx.ty;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    let recalled = false;
    ctx.at(250, () => {
      av.play('sweep', ctx.aim, 420);
      fx.spinFlourish(ctx.cx, ctx.cy, 115);
      pop(ctx, ctx.cx, ctx.cy - 50, '🌬️ GUST!', '#bbe8ff');
      ctx.at(160, () => av.play('punch', ctx.aim));
    });
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const e = elapsed - 410;
      if (e < 0 || recalled) return;
      const t = Math.min(1, e / 420);
      AirFx.drawGlaive(g, ctx.tint, ctx.cx + (parkX - ctx.cx) * t, ctx.cy + (parkY - ctx.cy) * t, 26, e / 90, 1);
    });
    ctx.at(1500, () => {
      recalled = true;
      g.clear();
      fx.featherPuff(ctx.cx, ctx.cy, 6);
      fx.slipstream(ctx.cx, ctx.cy, parkX - 40, parkY);
      ctx.moveCaster(parkX - 40, parkY);
      fx.bloom(parkX - 40, parkY, 46, 8, 6);
      pop(ctx, parkX - 40, parkY - 50, '🌬️ GUST RECALL!', '#bbe8ff');
      av.play('sweep', ctx.aim, 420);
      fx.spinFlourish(parkX - 40, parkY, 115);
      fx.ring(parkX - 40, parkY, 20, 115, AIR.frost, 420, 4, 6);
    });
    ctx.at(3200, () => ctx.moveCaster(ctx.cx, ctx.cy));
  },
};

export const perkVacuum: PreviewScript = {
  duration: 3600,
  caption: 'Perk — Vacuum: a 170px draw pulls foes in, and foes inside it hit you 15% softer',
  run(ctx) {
    stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const foe = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    let fx0 = ctx.cx + 170;
    let shown = false;
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      AirFx.drawVacuum(g, ctx.tint, ctx.cx, ctx.cy, 170 * 0.6, elapsed / 1000, elapsed > 400);
      // A stand-in foe drifting inward at the draw's real 55 px/s (scaled with the ring).
      if (elapsed > 400 && fx0 > ctx.cx + 60) fx0 -= 55 * 0.6 * (dt / 1000);
      foe.clear();
      foe.fillStyle(0x2b2f3d, 1); foe.fillCircle(fx0, ctx.cy, 17);
      foe.fillStyle(0x3c4254, 1); foe.fillCircle(fx0, ctx.cy, 13);
      if (!shown && elapsed > 500) { shown = true; pop(ctx, fx0, ctx.cy - 36, '🌀 VACUUM −15% DMG', '#bbe8ff'); }
    });
  },
};

export const perkBlowback: PreviewScript = {
  duration: 3000,
  caption: 'Perk — Blowback: a dodged hit throws 20% back at them; each dodge costs 15% wind dodge',
  run(ctx) {
    const { fx, av } = stage(ctx);
    ctx.at(300, () => {
      ctx.fly({
        texture: 'proj-fire', from: { x: ctx.tx, y: ctx.ty }, to: { x: ctx.cx, y: ctx.cy }, speed: 520,
        onHit: () => {
          pop(ctx, ctx.cx, ctx.cy - 44, 'DODGED  −15%', '#ccddff');
          fx.featherPuff(ctx.cx, ctx.cy, 5);
          fx.bloom(ctx.cx, ctx.cy, 44, 7, 6);
          av.play('punch', ctx.aim);
          fx.muzzleGust(ctx.cx + Math.cos(ctx.aim) * 18, ctx.cy + Math.sin(ctx.aim) * 18, ctx.aim, 0.8);
          fx.slipstream(ctx.cx, ctx.cy, ctx.tx, ctx.ty);
          ctx.at(200, () => {
            fx.gustBurst(ctx.tx, ctx.ty, 40, { duration: 320, dust: false });
            pop(ctx, ctx.tx, ctx.ty - 44, '💨 BLOWBACK', '#e4f2ff');
          });
        },
      });
    });
  },
};
