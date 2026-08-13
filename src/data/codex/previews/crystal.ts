import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  CrystalFx, CRYSTAL, CrystalAvatar, CLEAR_TONES, ATTUNED_TONES,
} from '../../../elements/kits/CrystalVisuals';

/**
 * Crystal's showcases.
 *
 * The shard IS a sprite — `proj-crystal-kite`, the same texture the arena launches — so every
 * flight here goes through `ctx.fly`. Everything the shard bounces off (lances, gates, mirages,
 * the chakram) has a static draw helper on `CrystalFx`, so the furniture is the arena's own art.
 */

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: CrystalFx; av: CrystalAvatar } {
  const fx = ctx.capture(() => new CrystalFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new CrystalAvatar(ctx.scene, ctx.tint)) as CrystalAvatar;
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/** A planted lance, painted by the kit's own `drawNode`. */
function lance(
  ctx: PreviewCtx,
  o: { x: number; y: number; angle: number; born?: number; gateway?: boolean; attuned?: boolean },
): { pos: { x: number; y: number } } {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const pos = { x: o.x, y: o.y };
  const [w, h] = o.gateway ? [9, 84] : [6, o.attuned ? 70 : 56];
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed < (o.born ?? 0)) return;
    CrystalFx.drawNode(g, ctx.tint, o.attuned ? ATTUNED_TONES : CLEAR_TONES,
      pos.x, pos.y, o.angle, w, h, elapsed / 1000, !!o.gateway);
  });
  return { pos };
}

/** A gate, painted by `drawPortal`, with its A/B label. */
function gate(ctx: PreviewCtx, o: { x: number; y: number; label: string; hue: number; born?: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const t = ctx.adopt(ctx.scene.add.text(o.x, o.y, o.label, {
    fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
  }).setOrigin(0.5).setDepth(5));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const on = elapsed >= (o.born ?? 0);
    t.setVisible(on);
    if (!on) return;
    CrystalFx.drawPortal(g, ctx.tint, CLEAR_TONES, o.x, o.y, 20, elapsed / 1000, o.hue, 1);
  });
}

/** The floating damage number a compounding shard is worth — the point of the whole element. */
function pop(ctx: PreviewCtx, x: number, y: number, text: string, color = '#88eeff'): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y - 30, text, {
    fontSize: '13px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(12));
  ctx.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1100 });
}

// ══ ABILITIES ═════════════════════════════════════════════════════════

export const crystalLaser: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Click — 15 damage at 520 px/s, ×1.5 on every bounce, and no cap on the chain',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Two lances set up a relay: 15 → 23 → 34 by the time it lands.
    const a = { x: ctx.cx + 110, y: ctx.cy - 70 };
    const b = { x: ctx.cx + 210, y: ctx.cy + 60 };
    lance(ctx, { x: a.x, y: a.y, angle: 0.9 });
    lance(ctx, { x: b.x, y: b.y, angle: -0.7 });
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.muzzlePrism(ctx.cx + 26, ctx.cy, ctx.aim, 1, 6, CLEAR_TONES);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: a, speed: 520,
        onHit: () => {
          fx.glint(a.x, a.y, 34, 9, CLEAR_TONES);
          pop(ctx, a.x, a.y, '×1.5');
          ctx.fly({
            texture: 'proj-crystal-kite', from: a, to: b, speed: 520,
            onHit: () => {
              fx.glint(b.x, b.y, 34, 9, CLEAR_TONES);
              pop(ctx, b.x, b.y, '×1.5');
              ctx.fly({
                texture: 'proj-crystal-kite', from: b, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
                onHit: () => {
                  fx.shatter(ctx.tx, ctx.ty, 46, { shards: 9, dust: 2, duration: 340 });
                  pop(ctx, ctx.tx, ctx.ty, '34', '#ffb3aa');
                },
              });
            },
          });
        },
      });
    });
  },
};

export const crystalLaserUpgraded: PreviewScript = {
  duration: 4000,
  scale: 0.9,
  caption: 'Shredder — the arena walls are mirrors: one free wall rebound per shard, also ×1.5',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // No lances at all — the wall itself does the work.
    const wall = { x: ctx.w - 12, y: ctx.cy - 66 };
    const edge = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((_dt, elapsed) => {
      edge.clear();
      edge.lineStyle(2, ctx.tint(CRYSTAL.prism), 0.25 + 0.15 * Math.sin(elapsed / 300));
      edge.lineBetween(ctx.w - 6, 0, ctx.w - 6, ctx.h);
    });
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.muzzlePrism(ctx.cx + 26, ctx.cy, ctx.aim, 1, 6, CLEAR_TONES);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy - 30 }, to: wall, speed: 520,
        onHit: () => {
          fx.glint(wall.x, wall.y, 30, 9, CLEAR_TONES);
          fx.dust(wall.x, wall.y, 4, 22, 8, CLEAR_TONES);
          pop(ctx, wall.x, wall.y, '×1.5');
          ctx.fly({
            texture: 'proj-crystal-kite', from: wall, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
            onHit: () => { fx.shatter(ctx.tx, ctx.ty, 42, { shards: 8, dust: 2, duration: 320 }); pop(ctx, ctx.tx, ctx.ty, '23', '#ffb3aa'); },
          });
        },
      });
    });
  },
};

export const placeCrystal: PreviewScript = {
  duration: 5000,
  scale: 0.85,
  caption: 'E — a permanent 6×56 lance at the cast angle, 6 at once; reflects yours, deflects theirs',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Three lances grown out of the floor, then something bouncing round all of them.
    const spots = [
      { x: ctx.cx + 90, y: ctx.cy - 74, a: 1.1 },
      { x: ctx.cx + 190, y: ctx.cy + 66, a: -0.6 },
      { x: ctx.cx + 250, y: ctx.cy - 40, a: 0.4 },
    ];
    spots.forEach((s, i) => ctx.at(300 + i * 450, () => {
      av.play('sweep', Math.atan2(s.y - ctx.cy, s.x - ctx.cx));
      lance(ctx, { x: s.x, y: s.y, angle: s.a, born: 300 + i * 450 });
      fx.bloom(s.x, s.y, 56 * 0.45, 8, 4, CLEAR_TONES);
    }));
    ctx.at(2000, () => {
      av.play('punch', ctx.aim);
      const chain = [spots[0], spots[1], spots[2], { x: ctx.tx, y: ctx.ty }];
      let dmg = 15;
      const step = (i: number, from: { x: number; y: number }): void => {
        if (i >= chain.length) return;
        ctx.fly({
          texture: 'proj-crystal-kite', from, to: chain[i], speed: 520,
          onHit: () => {
            if (i < chain.length - 1) {
              dmg = Math.round(dmg * 1.5);
              fx.glint(chain[i].x, chain[i].y, 32, 9, CLEAR_TONES);
              pop(ctx, chain[i].x, chain[i].y, `${dmg}`);
            } else {
              fx.shatter(ctx.tx, ctx.ty, 50, { shards: 10, dust: 2, duration: 360 });
              pop(ctx, ctx.tx, ctx.ty, `${dmg}`, '#ffb3aa');
            }
            step(i + 1, chain[i]);
          },
        });
      };
      step(0, { x: ctx.cx + 26, y: ctx.cy });
    });
  },
};

export const placeCrystalUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Moving Crystals — lances glide out at 134 px/s; a bounce off one blasts for 18 in 85px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Placed on the caster and gliding away, which is the actual behaviour.
    const l = lance(ctx, { x: ctx.cx, y: ctx.cy, angle: 0.5, born: 300 });
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      fx.bloom(ctx.cx, ctx.cy, 25, 8, 4, CLEAR_TONES);
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < 300) return;
        l.pos.x += Math.cos(0.35) * 134 * (dt / 1000);
        l.pos.y += Math.sin(0.35) * 134 * (dt / 1000);
      });
    });
    // The kinetic blast chain a moving mirror produces along the onward path.
    ctx.at(2200, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: { x: l.pos.x, y: l.pos.y }, speed: 520,
        onHit: () => {
          const bx = l.pos.x, by = l.pos.y;
          fx.glint(bx, by, 38, 9, ATTUNED_TONES);
          ctx.fly({
            texture: 'proj-crystal-kite', from: { x: bx, y: by }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
          });
          // 85px blasts strewn along the flight path afterwards.
          for (let i = 1; i <= 4; i++) {
            ctx.at(i * 120, () => {
              const t = i / 4;
              const px = bx + (ctx.tx - bx) * t, py = by + (ctx.ty - by) * t;
              fx.shatter(px, py, 85, { shards: 8, dust: 2, duration: 340, splinter: false });
              fx.ring(px, py, 8, 85, CRYSTAL.magenta, 320, 3, 5);
              pop(ctx, px, py, '18', '#ff44aa');
            });
          }
        },
      });
    });
  },
};

export const crystalAtune: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'R — every shard on screen stops for 2s, swings to your cursor, then all launch at once',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // A cloud of shards drifting, frozen, aimed, released.
    const shards = Array.from({ length: 9 }, (_, i) => ({
      x: ctx.cx + 60 + (i % 3) * 60,
      y: ctx.cy - 60 + Math.floor(i / 3) * 60,
      ang: (i / 9) * Math.PI * 2,
      frozen: false,
    }));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      for (const s of shards) {
        if (!s.frozen) { s.x += Math.cos(s.ang) * 520 * (dt / 1000) * 0.25; s.y += Math.sin(s.ang) * 520 * (dt / 1000) * 0.25; }
        // Frozen shards rotate to face the cursor — the aim is readable before the volley.
        const face = s.frozen ? Math.atan2(ctx.ty - s.y, ctx.tx - s.x) : s.ang;
        g.fillStyle(ctx.tint(CRYSTAL.prism), 0.95);
        g.fillTriangle(
          s.x + Math.cos(face) * 9, s.y + Math.sin(face) * 9,
          s.x + Math.cos(face + 2.5) * 6, s.y + Math.sin(face + 2.5) * 6,
          s.x + Math.cos(face - 2.5) * 6, s.y + Math.sin(face - 2.5) * 6,
        );
        if (s.frozen && elapsed % 400 < 200) {
          g.lineStyle(1, ctx.tint(CRYSTAL.violet), 0.5);
          g.lineBetween(s.x, s.y, s.x + Math.cos(face) * 26, s.y + Math.sin(face) * 26);
        }
      }
    });
    ctx.at(900, () => {
      av.play('flex');
      for (const s of shards) s.frozen = true;
      fx.ring(ctx.cx, ctx.cy, 10, 220, CRYSTAL.prism, 520, 4, 5);
      fx.prismBloom(ctx.cx, ctx.cy, 60, 620, 6, CLEAR_TONES);
    });
    // 2s later they all leave at once, at the aim point.
    ctx.at(2900, () => {
      for (const s of shards) { s.ang = Math.atan2(ctx.ty - s.y, ctx.tx - s.x); s.frozen = false; }
      fx.glint(ctx.tx, ctx.ty, 44, 9, CLEAR_TONES);
      ctx.at(400, () => fx.shatter(ctx.tx, ctx.ty, 60, { shards: 14, dust: 3, duration: 420 }));
    });
  },
};

export const crystalAtuneUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Lattice Lace — lances attune violet: 25% longer, 25% slower, and they orbit an enemy 8s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const l = lance(ctx, { x: ctx.cx + 40, y: ctx.cy - 20, angle: 0.4, born: 200 });
    let attuned = false;
    let orbiting = false;
    // Placed and gliding, then attuned and re-aimed, then wrapped round the target.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 200) return;
      if (orbiting) {
        // 70px radius at 2.4 rad/s — the real orbit.
        const k = (elapsed - 3200) / 1000;
        l.pos.x = ctx.tx + Math.cos(k * 2.4) * 70;
        l.pos.y = ctx.ty + Math.sin(k * 2.4) * 70;
        return;
      }
      if (elapsed > 1200 && elapsed < 3200) return; // the 2s freeze
      const speed = attuned ? 134 * 0.75 : 134;
      const a = attuned ? Math.atan2(ctx.ty - l.pos.y, ctx.tx - l.pos.x) : 0.35;
      l.pos.x += Math.cos(a) * speed * (dt / 1000);
      l.pos.y += Math.sin(a) * speed * (dt / 1000);
    });
    ctx.at(1200, () => {
      av.play('flex');
      attuned = true;
      fx.glint(l.pos.x, l.pos.y, 44, 9, ATTUNED_TONES, 0.4);
      fx.ring(ctx.cx, ctx.cy, 10, 200, CRYSTAL.violet, 520, 4, 5);
      const t = ctx.adopt(ctx.scene.add.text(l.pos.x, l.pos.y - 34, '+25% LENGTH · −25% SPEED', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#aa44ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, alpha: 0, duration: 2200 });
    });
    ctx.at(3200, () => {
      orbiting = true;
      fx.prismBloom(ctx.tx, ctx.ty, 70, 620, 6, ATTUNED_TONES);
      const t = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 44, '🌀 ORBITING 8s', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 2400 });
    });
  },
};

export const crystalPortal: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'F — A and B: you teleport, your shards come out at ×1.5, and an enemy entering is stunned 2s',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const a = { x: ctx.cx + 60, y: ctx.cy + 56 };
    const b = { x: ctx.tx - 40, y: ctx.ty - 66 };
    ctx.at(300, () => {
      av.play('slam', ctx.aim);
      gate(ctx, { x: a.x, y: a.y, label: 'A', hue: CRYSTAL.violet, born: 300 });
      fx.channelFacet(a.x, a.y, 40, 420, undefined, 4, CLEAR_TONES);
    });
    ctx.at(900, () => {
      av.play('slam', ctx.aim);
      gate(ctx, { x: b.x, y: b.y, label: 'B', hue: CRYSTAL.magenta, born: 900 });
      fx.channelFacet(b.x, b.y, 40, 420, undefined, 4, CLEAR_TONES);
    });
    // A shard through the pair: crosses the map and comes out worth half again.
    ctx.at(2000, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: a, speed: 520,
        onHit: () => {
          fx.translate(a.x, a.y, b.x, b.y, 5, CLEAR_TONES);
          pop(ctx, b.x, b.y, '×1.5');
          ctx.fly({
            texture: 'proj-crystal-kite', from: b, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
            onHit: () => { fx.shatter(ctx.tx, ctx.ty, 44, { shards: 9, dust: 2, duration: 340 }); pop(ctx, ctx.tx, ctx.ty, '23', '#ffb3aa'); },
          });
        },
      });
    });
    // The headline the shard demo buries: you go through it too. Walk into A, come out of B.
    ctx.at(2900, () => ctx.glideCaster({ to: { x: a.x, y: a.y }, ms: 420 }));
    ctx.at(3340, () => {
      fx.translate(a.x, a.y, b.x, b.y, 5, CLEAR_TONES);
      ctx.moveCaster(b.x, b.y);
      pop(ctx, b.x, b.y - 30, 'YOU');
    });
    // And what happens when they follow you in.
    ctx.at(4000, () => {
      fx.shatter(a.x, a.y, 56, { shards: 9, dust: 1, duration: 340, splinter: false });
      const t = ctx.adopt(ctx.scene.add.text(a.x, a.y - 30, '⛓️ COLLAPSED · STUN 2s', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#aa44ff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 1600 });
    });
  },
};

export const crystalPortalUpgraded: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Portal Boost — +20% move speed for 3s out of every jump, refreshed each time',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const a = { x: ctx.cx + 30, y: ctx.cy + 40 };
    const b = { x: ctx.cx + 240, y: ctx.cy - 40 };
    gate(ctx, { x: a.x, y: a.y, label: 'A', hue: CRYSTAL.violet, born: 200 });
    gate(ctx, { x: b.x, y: b.y, label: 'B', hue: CRYSTAL.magenta, born: 200 });
    // A loop through the pair, each jump re-arming the boost before the last expires.
    // Walk into the first gate, then keep looping — the boost is on the *jump*, so the
    // showcase has to be a caster going through it rather than a light show between gates.
    ctx.at(400, () => ctx.glideCaster({ to: { x: a.x, y: a.y }, ms: 400 }));
    [800, 2000, 3200].forEach((at, i) => ctx.at(at, () => {
      const from = i % 2 === 0 ? a : b;
      const to = i % 2 === 0 ? b : a;
      ctx.moveCaster(to.x, to.y);
      fx.translate(from.x, from.y, to.x, to.y, 5, CLEAR_TONES);
      fx.prismBloom(to.x, to.y, 40, 460, 6, CLEAR_TONES);
      const t = ctx.adopt(ctx.scene.add.text(to.x, to.y - 34, '⚡ +20% · 3s', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#88eeff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 1400 });
    }));
  },
};

export const crystalTrick: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Q — 2 mirages at 50 HP for 12s, each copying your shard at 6 damage',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const offs = [{ x: -58, y: 0 }, { x: 58, y: 0 }];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    let alive = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!alive) return;
      for (const o of offs) {
        CrystalFx.drawMirage(g, ctx.tint, CLEAR_TONES, ctx.cx + o.x, ctx.cy + o.y, 17, ctx.aim, elapsed / 1000, 1);
        // The 30px health bar each mirage carries.
        g.fillStyle(0x222222, 1);
        g.fillRect(ctx.cx + o.x - 15, ctx.cy + o.y - 30, 30, 5);
        g.fillStyle(0x44ff88, 1);
        g.fillRect(ctx.cx + o.x - 15, ctx.cy + o.y - 30, 30, 5);
      }
    });
    ctx.at(400, () => {
      av.play('raise', 0, 900);
      alive = true;
      fx.bloom(ctx.cx, ctx.cy, 60, 14, 6, CLEAR_TONES);
      for (const o of offs) fx.refract(ctx.cx, ctx.cy, ctx.cx + o.x, ctx.cy + o.y, 8, CLEAR_TONES);
    });
    // Every click becomes three: 15 from you, 6 from each mirage.
    [1600, 2600, 3600].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
        onHit: () => { fx.shatter(ctx.tx, ctx.ty, 40, { shards: 8, dust: 1, duration: 300 }); pop(ctx, ctx.tx, ctx.ty, '15', '#ffb3aa'); },
      });
      for (const o of offs) {
        ctx.fly({
          texture: 'proj-crystal-kite', from: { x: ctx.cx + o.x, y: ctx.cy + o.y }, to: { x: ctx.tx, y: ctx.ty }, speed: 520,
          onHit: () => { fx.glint(ctx.tx, ctx.ty, 24, 9, CLEAR_TONES); pop(ctx, ctx.tx + o.x * 0.3, ctx.ty + 10, '6', '#88eeff'); },
        });
      }
    }));
  },
};

export const crystalTrickUpgraded: PreviewScript = {
  duration: 4800,
  scale: 0.9,
  caption: 'Shield Clones — 3 mirages in a forward wedge: 150 HP standing between you and them',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Ahead of you, not beside you — the offsets the kit actually uses.
    const offs = [{ x: 50, y: 0 }, { x: 30, y: -40 }, { x: 30, y: 40 }];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const hp = [1, 1, 1];
    let alive = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!alive) return;
      offs.forEach((o, i) => {
        if (hp[i] <= 0) return;
        CrystalFx.drawMirage(g, ctx.tint, CLEAR_TONES, ctx.cx + o.x, ctx.cy + o.y, 17, ctx.aim, elapsed / 1000, 1);
        g.fillStyle(0x222222, 1);
        g.fillRect(ctx.cx + o.x - 15, ctx.cy + o.y - 30, 30, 5);
        g.fillStyle(0x44ff88, 1);
        g.fillRect(ctx.cx + o.x - 15, ctx.cy + o.y - 30, 30 * hp[i], 5);
      });
    });
    ctx.at(300, () => {
      av.play('raise', 0, 900);
      alive = true;
      fx.bloom(ctx.cx, ctx.cy, 60, 14, 6, CLEAR_TONES);
      for (const o of offs) fx.refract(ctx.cx, ctx.cy, ctx.cx + o.x, ctx.cy + o.y, 8, CLEAR_TONES);
    });
    // Incoming fire meets the wedge, not you.
    [1400, 2100, 2800, 3500].forEach((at, i) => ctx.at(at, () => {
      const idx = i % 3;
      fx.flash(ctx.cx + offs[idx].x, ctx.cy + offs[idx].y, 22, 7, CLEAR_TONES);
      fx.dust(ctx.cx + offs[idx].x, ctx.cy + offs[idx].y, 4, 22, 9, CLEAR_TONES);
      hp[idx] = Math.max(0, hp[idx] - 0.4);
      if (hp[idx] <= 0) fx.shatter(ctx.cx + offs[idx].x, ctx.cy + offs[idx].y, 40, { shards: 8, dust: 2, duration: 320 });
    }));
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveBounces: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Passive — ×1.5 per bounce, uncapped: 15 · 23 · 34 · 51 · 76 · 114',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Five lances arranged as a ring, and one shard going all the way round it.
    const ring = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - 1.2;
      return { x: ctx.cx + 130 + Math.cos(a) * 110, y: ctx.cy + Math.sin(a) * 100, a: a + 1.6 };
    });
    ring.forEach((r) => lance(ctx, { x: r.x, y: r.y, angle: r.a }));
    ctx.at(500, () => {
      av.play('punch', ctx.aim);
      fx.muzzlePrism(ctx.cx + 26, ctx.cy, ctx.aim, 1, 6, CLEAR_TONES);
      let dmg = 15;
      const chain = [...ring, { x: ctx.tx, y: ctx.ty, a: 0 }];
      const step = (i: number, from: { x: number; y: number }): void => {
        if (i >= chain.length) return;
        ctx.fly({
          texture: 'proj-crystal-kite', from, to: chain[i], speed: 520,
          onHit: () => {
            dmg = Math.round(dmg * 1.5);
            if (i < chain.length - 1) {
              fx.glint(chain[i].x, chain[i].y, 30 + i * 4, 9, CLEAR_TONES);
              fx.dust(chain[i].x, chain[i].y, 3, 20, 8, CLEAR_TONES);
              pop(ctx, chain[i].x, chain[i].y, `${dmg}`);
            } else {
              fx.shatter(ctx.tx, ctx.ty, 80, { shards: 16, dust: 3, duration: 460 });
              pop(ctx, ctx.tx, ctx.ty, `${dmg}`, '#ffb3aa');
            }
            step(i + 1, chain[i]);
          },
        });
      };
      step(0, { x: ctx.cx + 26, y: ctx.cy });
    });
  },
};

// ══ PERKS ═════════════════════════════════════════════════════════════

export const perkGateway: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Perk — lances become 9×84 gateways: light passes THROUGH, and still takes the ×1.5',
  run(ctx) {
    const { fx, av } = stage(ctx);
    // Three gateways in a straight line — the shot the perk exists for.
    const gates = [
      { x: ctx.cx + 90, y: ctx.cy, a: Math.PI / 2 },
      { x: ctx.cx + 170, y: ctx.cy, a: Math.PI / 2 },
      { x: ctx.cx + 250, y: ctx.cy, a: Math.PI / 2 },
    ];
    gates.forEach((g, i) => ctx.at(200 + i * 300, () => {
      lance(ctx, { x: g.x, y: g.y, angle: g.a, gateway: true, born: 200 + i * 300 });
      fx.bloom(g.x, g.y, 84 * 0.45, 8, 4, CLEAR_TONES);
      const t = ctx.adopt(ctx.scene.add.text(g.x, g.y - 52, '🌀 GATEWAY', {
        fontSize: '9px', fontFamily: 'Arial Black', color: '#aaeeff',
      }).setOrigin(0.5).setDepth(12));
      ctx.scene.tweens.add({ targets: t, alpha: 0, duration: 1400 });
    }));
    ctx.at(1800, () => {
      av.play('punch', ctx.aim);
      // It never bends — it just keeps getting hotter and faster.
      let dmg = 15;
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: { x: ctx.w, y: ctx.cy },
        speed: 520, pierce: true,
      });
      gates.forEach((g, i) => ctx.at(((g.x - ctx.cx - 26) / 520) * 1000, () => {
        dmg = Math.round(dmg * 1.5);
        fx.glint(g.x, g.y, 36, 9, CLEAR_TONES);
        pop(ctx, g.x, g.y, `${dmg}`);
        void i;
      }));
      ctx.at(((ctx.tx - ctx.cx - 26) / 520) * 1000 + 40, () => {
        fx.shatter(ctx.tx, ctx.ty, 60, { shards: 12, dust: 2, duration: 400 });
      });
    });
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryResonance: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Mastery passive — one of your own bounced shards hitting you is ×3 speed for 0.2s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    // A lance angled to send the shot straight back at the caster.
    const l = { x: ctx.cx + 170, y: ctx.cy - 10 };
    lance(ctx, { x: l.x, y: l.y, angle: 0.2 });
    [500, 2000, 3400].forEach((at) => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-crystal-kite', from: { x: ctx.cx + 26, y: ctx.cy }, to: l, speed: 520,
        onHit: () => {
          fx.glint(l.x, l.y, 32, 9, CLEAR_TONES);
          ctx.fly({
            texture: 'proj-crystal-kite', from: l, to: { x: ctx.cx, y: ctx.cy }, speed: 520,
            onHit: () => {
              // Absorbed, not taken — the body drinks the light back in.
              fx.glint(ctx.cx, ctx.cy, 46, 10, ATTUNED_TONES);
              fx.dust(ctx.cx, ctx.cy, 5, 26, 9, ATTUNED_TONES);
              pop(ctx, ctx.cx, ctx.cy, '✨ RESONANCE  ×3 SPEED', '#ff88ff');
            },
          });
        },
      });
    }));
  },
};

export const masteryCrystalShredder: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Mastery — a chakram of 12 shards at 260 px/s; each shard that touches is 2 damage, gone',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const blades = Array.from({ length: 12 }, () => true);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const p = { x: ctx.cx + 20, y: ctx.cy, moving: false, spin: 0 };
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (elapsed < 400) return;
      p.spin += 3.2 * (dt / 1000);
      if (p.moving) {
        const a = Math.atan2(ctx.ty - p.y, ctx.tx - p.x);
        const d = Phaser.Math.Distance.Between(p.x, p.y, ctx.tx, ctx.ty);
        if (d > 6) { p.x += Math.cos(a) * 260 * (dt / 1000); p.y += Math.sin(a) * 260 * (dt / 1000); }
        else p.moving = false;
      }
      CrystalFx.drawShredder(g, ctx.tint, CLEAR_TONES, p.x, p.y, 22, p.spin, blades,
        elapsed / 1000, p.moving, Phaser.Math.Clamp((elapsed - 400) / 300, 0, 1));
    });
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      p.moving = true;
      fx.ring(p.x, p.y, 6, 40, CRYSTAL.prism, 380, 3, 6);
    });
    // Shards breaking off one at a time as they touch — 2 damage each, then gone.
    for (let i = 0; i < 12; i++) {
      ctx.at(1600 + i * 220, () => {
        const idx = blades.findIndex(Boolean);
        if (idx < 0) return;
        blades[idx] = false;
        fx.glint(ctx.tx, ctx.ty, 20, 9, CLEAR_TONES);
        fx.dust(ctx.tx, ctx.ty, 2, 18, 8, CLEAR_TONES);
        pop(ctx, ctx.tx + ((i % 3) - 1) * 12, ctx.ty + 6, '2', '#ffb3aa');
      });
    }
  },
};
