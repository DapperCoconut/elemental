import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  GRAVITY, GravityFx, GravityAvatar, GravityWell, GravityTones,
  VOID_TONES, METEOR_TONES, MOON_TONES,
} from '../../../elements/kits/GravityVisuals';
import { EARTH, EarthColorFn, stoneChunkLayered } from '../../../elements/kits/EarthVisuals';

/**
 * Gravity's showcases.
 *
 * Almost nothing gravity does is a projectile — it is telegraph circles, wells, tethers and a
 * flying moon, all of them repainted every frame from `GravityFx` statics the kit owns. These
 * loops drive the same statics with the same constants, so `drawShadow`, `drawAnchor`,
 * `drawFlyingMoon` and the rest stay one implementation rather than two.
 *
 * Containment: `ctx.at` and `ctx.onFrame` callbacks run outside the harness's capture window,
 * so a `GravityWell` built inside one goes through `ctx.capture` by hand. `GravityFx` instances
 * carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

function stage(
  ctx: PreviewCtx, opts?: { noDummy?: boolean },
): { fx: GravityFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new GravityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new GravityAvatar(ctx.scene, ctx.tint, VOID_TONES));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * The caster, positioned by the script instead of by the harness.
 *
 * The box parks the rig on the caster mark and repaints it at full alpha every frame, which is
 * wrong for the two abilities that take the character off that mark — Anti-Grav removes them
 * from the board entirely, Moon Rider sits them on the moon. A script that wants those sets
 * `bodyTexture` to a key that does not exist (so the harness stages no body of its own) and
 * re-drives the rig from a frame hook, which runs after the harness's pass.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): BaseAvatar {
  if (ctx.scene.textures.exists('elem-gravity')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-gravity').setDepth(5));
    ctx.onFrame(() => {
      const s = read();
      body.setPosition(s.x, s.y).setAlpha(s.alpha);
    });
  }
  const av = ctx.useAvatar(() => new GravityAvatar(ctx.scene, ctx.tint, VOID_TONES));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => {
    const s = read();
    av.update(dt, s.x, s.y, s.alpha);
  });
  return av;
}

function movingDummy(ctx: PreviewCtx, m: Mark, o?: { alpha?: () => number; scale?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    const a = o?.alpha?.() ?? 1;
    const s = o?.scale?.() ?? 1;
    g.clear();
    if (a <= 0.02) return;
    g.fillStyle(0x2b2f3d, a);
    g.fillEllipse(m.x, m.y, 34 * s, 34 / s);
    g.fillStyle(0x3c4254, a);
    g.fillEllipse(m.x, m.y, 26 * s, 26 / s);
    g.fillStyle(0x8e97ad, 0.9 * a);
    g.fillCircle(m.x - 5 * s, m.y - 4, 3.2);
    g.fillCircle(m.x + 5 * s, m.y - 4, 3.2);
    g.fillStyle(0x11131b, a);
    g.fillCircle(m.x - 5.6 * s, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4 * s, m.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: '11px', fontFamily: 'Arial', color,
  }).setOrigin(0.5).setDepth(14));
}

/**
 * A meteor shadow: the mark on the ground with the rock growing out of the sky above it.
 * `frozen` marks are the ones a Meteor Rain session has placed and not yet released.
 */
function shadow(
  ctx: PreviewCtx,
  o: {
    x: number; y: number; born: number; fuse?: number; visualRadius?: number;
    frozen?: () => boolean; onLand?: (x: number, y: number) => void;
  },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  const seed = Math.random() * 6;
  const fuse = o.fuse ?? 1500;
  let landed = false;
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (elapsed < o.born || landed) return;
    const frozen = o.frozen?.() ?? false;
    const p = frozen ? 0 : (elapsed - o.born) / fuse;
    GravityFx.drawShadow(g, ctx.tint, VOID_TONES, o.x, o.y, o.visualRadius ?? 22, seed + elapsed / 1000, p, frozen);
    if (!frozen && p >= 1) {
      landed = true;
      g.clear();
      o.onLand?.(o.x, o.y);
    }
    void dt;
  });
}

/** A magma pool left by Meteor Swarm or Lunar Landing: 35px, 8s, 4 damage every 0.3s. */
function firePool(ctx: PreviewCtx, o: { x: number; y: number; born: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const seed = Math.random() * 8;
  ctx.onFrame((_dt, elapsed) => {
    const age = elapsed - o.born;
    g.clear();
    if (age < 0 || age > 8000) return;
    GravityFx.drawFirePool(g, ctx.tint, o.x, o.y, 35, seed + elapsed / 1000,
      Phaser.Math.Clamp((8000 - age) / 8000, 0, 1) * 0.5 + 0.5);
  });
}

// ══ CLICK — Space Slash ═══════════════════════════════════════════════

export const spaceSlash: PreviewScript = {
  duration: 6600,
  caption: 'Click — drag for an 18 damage seam that throws them along it; tap for a 1.5s meteor',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);

    // The drag: a seam drawn through where they are standing, resolving 500ms later.
    const x1 = ctx.cx + 60, y1 = ctx.cy - 54;
    const x2 = ctx.tx + 70, y2 = ctx.ty + 42;
    ctx.at(500, () => {
      av.play('sweep', Math.atan2(y2 - y1, x2 - x1));
      fx.rift(x1, y1, x2, y2, 620, 6, VOID_TONES);
      float(ctx, (x1 + x2) / 2, (y1 + y2) / 2 - 30, '0.5s to move', '#ccbbee');
    });
    ctx.at(1000, () => {
      fx.flash(mark.x, mark.y, 20, 8, VOID_TONES);
      float(ctx, mark.x, mark.y - 26, '18', '#ffb3aa');
      // Thrown along the line you drew, not away from you.
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const fromX = mark.x, fromY = mark.y;
      ctx.onFrame((_dt, elapsed) => {
        const p = Phaser.Math.Clamp((elapsed - 1000) / 700, 0, 1);
        mark.x = fromX + Math.cos(ang) * 90 * p;
        mark.y = fromY + Math.sin(ang) * 90 * p;
      });
      float(ctx, mark.x + 40, mark.y - 40, '400 knockback', '#d4c6ff');
    });

    // The tap: the other half of the same key.
    ctx.at(3200, () => {
      av.play('punch', ctx.aim);
      shadow(ctx, {
        x: mark.x, y: mark.y, born: 3200,
        onLand: (x, y) => {
          fx.impact(x, y, 70, { tones: METEOR_TONES, rocks: 9, dust: 2, duration: 460 });
          float(ctx, x, y - 30, '30 direct', '#ffcc44');
        },
      });
      float(ctx, mark.x, mark.y - 46, '1.5s fuse', '#ccbbee');
    });
  },
};

export const spaceSlashUpgraded: PreviewScript = {
  duration: 7400,
  caption: 'Meteor Storm — hold Click and a rock lands near the cursor every second, forever',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    av.setHold('charge', ctx.aim);

    // The cursor drifts, and the barrage follows it — that is the whole ability.
    const cursor: Mark = { x: ctx.tx - 40, y: ctx.ty - 20 };
    const cur = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      cursor.x = ctx.tx - 40 + Math.sin(elapsed / 1400) * 70;
      cursor.y = ctx.ty - 20 + Math.cos(elapsed / 1100) * 30;
      cur.clear();
      cur.lineStyle(1.2, ctx.tint(GRAVITY.lilac), 0.7);
      cur.strokeCircle(cursor.x, cursor.y, 5);
      cur.lineBetween(cursor.x - 9, cursor.y, cursor.x + 9, cursor.y);
      cur.lineBetween(cursor.x, cursor.y - 9, cursor.x, cursor.y + 9);
    });

    // One every 1000ms while the button is down, scattered up to 50px either side.
    for (let i = 0; i < 5; i++) {
      const at = 400 + i * 1000;
      ctx.at(at, () => {
        const x = cursor.x + (Math.random() - 0.5) * 100;
        const y = cursor.y + (Math.random() - 0.5) * 100;
        shadow(ctx, {
          x, y, born: at,
          onLand: (ix, iy) => {
            fx.impact(ix, iy, 70, { tones: METEOR_TONES, rocks: 9, dust: 2, duration: 460 });
            if (Phaser.Math.Distance.Between(ix, iy, mark.x, mark.y) <= 70) {
              float(ctx, mark.x, mark.y - 26, Phaser.Math.Distance.Between(ix, iy, mark.x, mark.y) <= 28 ? '30' : '14', '#ffb3aa');
            }
          },
        });
      });
    }
  },
};

// ══ E — Meteor Rain ═══════════════════════════════════════════════════

function meteorRainScript(swarm: boolean): PreviewScript {
  const marks = swarm ? 10 : 5;
  return {
    duration: swarm ? 8200 : 7400,
    caption: swarm
      ? 'Meteor Swarm — ten marks a session, and every rock you land can leave an 8s magma pool'
      : 'E — hold to compose a pattern, release to drop it; a tap replays the same shape later',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const mark: Mark = { x: ctx.tx, y: ctx.ty };
      movingDummy(ctx, mark);
      const count = label(ctx, ctx.cx, ctx.cy - 54, '#ccbbee');

      // The well under the caster tightens as the plan gets heavier.
      let placed = 0;
      let holding = false;
      const well = ctx.capture(() => new GravityWell(ctx.scene, ctx.tint, VOID_TONES, 30, 4));
      ctx.onFrame((dt) => {
        ctx.capture(() => well.update(dt, ctx.cx, ctx.cy, placed / marks, holding ? 1 : 0));
      });

      ctx.at(300, () => { holding = true; av.setHold('charge', ctx.aim); count.setText(`0 / ${marks}`); });

      // Frozen marks: no fuse at all until the key comes up.
      const spots: Mark[] = [];
      for (let i = 0; i < marks; i++) {
        const at = 500 + i * 320;
        ctx.at(at, () => {
          const a = (i / marks) * Math.PI * 2;
          const r = swarm ? 60 + (i % 3) * 26 : 54 + (i % 2) * 30;
          const p = { x: mark.x + Math.cos(a) * r, y: mark.y + Math.sin(a) * r * 0.6 };
          spots.push(p);
          placed++;
          count.setText(`${placed} / ${marks}`);
          shadow(ctx, {
            x: p.x, y: p.y, born: at, frozen: () => holding,
            onLand: (ix, iy) => {
              fx.impact(ix, iy, 70, { tones: METEOR_TONES, rocks: 9, dust: 2, duration: 460 });
              // E+ rolls 15% per rock for a pool; the loop shows one so the mechanic is visible.
              if (swarm && ix === spots[2]?.x) firePool(ctx, { x: ix, y: iy, born: 0 });
            },
          });
        });
      }

      // Release: every mark takes a 1.5s fuse at the same instant.
      const releaseAt = 500 + marks * 320 + 300;
      ctx.at(releaseAt, () => {
        holding = false;
        av.setHold(null);
        av.play('slam', ctx.aim);
        count.setText('');
        float(ctx, ctx.cx, ctx.cy - 46, 'PATTERN SAVED', '#ccbbee');
      });
      ctx.at(releaseAt + 1500, () => float(ctx, mark.x, mark.y - 40, '14 · 30 direct', '#ffb3aa'));
      ctx.at(releaseAt + 2100, () => float(ctx, ctx.cx, ctx.cy - 46, 'tap E to replay — 5s CD', '#ffe98a'));
    },
  };
}

export const meteorRain = meteorRainScript(false);
export const meteorRainUpgraded = meteorRainScript(true);

// ══ R — Space Slam ════════════════════════════════════════════════════

export const spaceSlam: PreviewScript = {
  duration: 4800,
  caption: 'R — 25 damage and driven into the floor from anywhere, then held there for 0.3s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const floorY = ctx.h * 0.9;
    const mark: Mark = { x: ctx.tx, y: ctx.ty - 40 };
    movingDummy(ctx, mark);

    ctx.at(700, () => {
      av.play('slam', Math.PI / 2);
      fx.rift(mark.x, mark.y, mark.x, floorY, 380, 7, VOID_TONES);
      fx.impact(mark.x, floorY, 78, { tones: VOID_TONES, rocks: 8, dust: 2, duration: 420, crater: false });
      mark.y = floorY;
      float(ctx, mark.x, mark.y - 34, '25', '#ffb3aa');
      float(ctx, mark.x, mark.y - 52, 'no range limit', '#ccbbee');
    });
    ctx.at(1000, () => float(ctx, mark.x, mark.y - 34, 'PINNED 0.3s', '#d4c6ff'));
    // Only after the pin lifts can they get off the floor again.
    ctx.onFrame((dt, elapsed) => { if (elapsed > 1000) mark.y = Math.max(ctx.ty - 40, mark.y - 24 * (dt / 1000)); });
  },
};

export const spaceSlamUpgraded: PreviewScript = {
  duration: 7000,
  caption: 'Gravity Anchor — a 3s tether at the crater that hauls back anything past 150px',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const floorY = ctx.h * 0.9;
    const mark: Mark = { x: ctx.cx + 200, y: ctx.ty - 40 };
    movingDummy(ctx, mark);
    const anchor: Mark = { x: mark.x, y: floorY };

    let anchored = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!anchored) return;
      const d = Phaser.Math.Distance.Between(anchor.x, anchor.y, mark.x, mark.y);
      GravityFx.drawAnchor(g, ctx.tint, VOID_TONES, anchor.x, anchor.y, mark.x, mark.y,
        elapsed / 1000, Phaser.Math.Clamp(d / 150, 0, 1));
    });

    ctx.at(600, () => {
      av.play('slam', Math.PI / 2);
      fx.rift(mark.x, mark.y, mark.x, floorY, 380, 7, VOID_TONES);
      fx.impact(mark.x, floorY, 78, { tones: VOID_TONES, rocks: 8, dust: 2, duration: 420, crater: false });
      mark.y = floorY;
      anchor.x = mark.x; anchor.y = floorY;
      anchored = true;
      fx.bloom(anchor.x, anchor.y, 30, 8, 6, VOID_TONES);
      float(ctx, anchor.x, anchor.y - 24, '⚓ Anchored!', '#aa44ff');
    });

    // They run for it, and past 150px the leash starts winning.
    ctx.onFrame((dt, elapsed) => {
      if (!anchored || elapsed < 900) return;
      const d = Phaser.Math.Distance.Between(anchor.x, anchor.y, mark.x, mark.y);
      const pull = d > 150 ? (d - 150) * 5 : 0;
      mark.x += (140 - pull) * (dt / 1000);
      mark.y = floorY - 6;
    });
    ctx.at(2400, () => float(ctx, mark.x, mark.y - 40, '150px leash', '#d4c6ff'));
    ctx.at(3600, () => float(ctx, anchor.x, anchor.y - 44, 'damage here counts for mastery', '#ffe98a'));
    ctx.at(3600 + 3000 - 600, () => { anchored = false; float(ctx, anchor.x, anchor.y - 24, 'anchor gone', '#8a8ab0'); });
  },
};

// ══ F — Grav Bomb ═════════════════════════════════════════════════════

export const gravBomb: PreviewScript = {
  duration: 7600,
  caption: 'F — a tap snaps them onto the cursor; a 2s hold collapses the well for 40',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 30, y: ctx.ty - 30 };
    movingDummy(ctx, mark);
    const cursor: Mark = { x: ctx.tx - 60, y: ctx.ty + 20 };

    // ── The tap: inside 120px they are simply placed on the cursor. ──
    ctx.at(600, () => {
      av.play('punch', ctx.aim);
      fx.well(cursor.x, cursor.y, 60, 420, undefined, 6, VOID_TONES);
      fx.flash(cursor.x, cursor.y, 24, 8, VOID_TONES);
      fx.ring(cursor.x, cursor.y, 12, 100, GRAVITY.violet, 380, 4, 6);
      mark.x = cursor.x; mark.y = cursor.y;
      float(ctx, cursor.x, cursor.y - 34, 'SNAPPED', '#d4c6ff');
      float(ctx, cursor.x, cursor.y - 52, 'within 120px', '#ccbbee');
    });

    // ── The hold: two seconds of charge, dragging them in the whole time. ──
    const holdAt = 2600;
    let charge = -1;
    const well = ctx.capture(() => new GravityWell(ctx.scene, ctx.tint, VOID_TONES, 120, 4));
    ctx.onFrame((dt, elapsed) => {
      if (charge < 0) { ctx.capture(() => well.update(dt, cursor.x, cursor.y, 0, 0)); return; }
      charge = Phaser.Math.Clamp((elapsed - holdAt) / 2000, 0, 1);
      ctx.capture(() => well.update(dt, cursor.x, cursor.y, charge, 1));
      // +55 velocity a frame toward the cursor for anything inside the circle.
      if (Phaser.Math.Distance.Between(cursor.x, cursor.y, mark.x, mark.y) <= 120 && charge < 1) {
        const a = Math.atan2(cursor.y - mark.y, cursor.x - mark.x);
        mark.x += Math.cos(a) * 34 * (dt / 1000);
        mark.y += Math.sin(a) * 34 * (dt / 1000);
      }
    });
    ctx.at(holdAt, () => {
      charge = 0;
      cursor.x = ctx.tx + 40; cursor.y = ctx.ty;
      av.setHold('charge', ctx.aim);
      float(ctx, cursor.x, cursor.y - 60, 'charging 2s', '#ccbbee');
    });
    ctx.at(holdAt + 2000, () => {
      charge = -1;
      av.setHold(null);
      av.play('slam', ctx.aim);
      fx.well(cursor.x, cursor.y, 100, 320, undefined, 6, VOID_TONES);
      fx.impact(cursor.x, cursor.y, 100, { tones: VOID_TONES, rocks: 12, dust: 3, duration: 520, crater: false });
      float(ctx, mark.x, mark.y - 34, '40', '#ffb3aa');
      float(ctx, cursor.x, cursor.y - 56, 'within 100px', '#ccbbee');
    });
  },
};

export const gravBombUpgraded: PreviewScript = {
  duration: 7800,
  bodyTexture: 'gravity-preview-no-body',
  caption: 'Anti-Grav — a full charge aimed at yourself: 3s off the board, then a 25 damage slam',
  run(ctx) {
    const fx = ctx.capture(() => new GravityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const mark: Mark = { x: ctx.tx + 40, y: ctx.ty };
    movingDummy(ctx, mark);

    // The caster is on the board, then genuinely is not.
    const me = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    const av = drivenCaster(ctx, () => me);

    const launchAt = 1400;
    const landAt = launchAt + 3000;
    const landing: Mark = { x: ctx.cx, y: ctx.cy };

    // Two seconds of charge with the cursor on yourself, which is what makes it a launch.
    let charging = false;
    const well = ctx.capture(() => new GravityWell(ctx.scene, ctx.tint, VOID_TONES, 120, 4));
    ctx.onFrame((dt, elapsed) => {
      const c = charging ? Phaser.Math.Clamp((elapsed - (launchAt - 2000)) / 2000, 0, 1) : 0;
      ctx.capture(() => well.update(dt, ctx.cx, ctx.cy, c, charging ? 1 : 0));
    });
    ctx.at(launchAt - 2000, () => {
      charging = true;
      av.setHold('charge', ctx.aim);
      float(ctx, ctx.cx, ctx.cy - 60, 'cursor on yourself', '#ccbbee');
    });

    ctx.at(launchAt, () => {
      charging = false;
      av.setHold(null);
      av.play('raise');
      fx.well(ctx.cx, ctx.cy, 90, 420, undefined, 6, VOID_TONES);
      fx.arms(ctx.cx, ctx.cy, 16, { speed: 320, angle: -Math.PI / 2, spread: 0.9, size: 4.4, life: 700, depth: 8, tones: VOID_TONES });
      fx.ring(ctx.cx, ctx.cy, 14, 130, GRAVITY.violet, 520, 5, 6);
      fx.flash(ctx.cx, ctx.cy, 34, 8, VOID_TONES);
      float(ctx, ctx.cx, ctx.cy - 34, '🚀 ANTI-GRAV', '#ccbbee');
      me.alpha = 0;
    });

    // The shadow steers, tightening as the ground comes up.
    const shad = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      shad.clear();
      if (elapsed < launchAt || elapsed >= landAt) return;
      const p = (elapsed - launchAt) / 3000;
      landing.x = mark.x + Math.sin(elapsed / 500) * 26;
      landing.y = mark.y;
      me.x = landing.x; me.y = landing.y;
      GravityFx.drawLandingShadow(shad, ctx.tint, VOID_TONES, landing.x, landing.y, elapsed / 1000, p);
    });
    ctx.at(launchAt + 700, () => float(ctx, ctx.cx, ctx.cy - 40, 'invincible · invisible', '#bfe8ff'));

    ctx.at(landAt, () => {
      me.alpha = 1;
      av.play('slam', Math.PI / 2);
      fx.impact(landing.x, landing.y, 120, { tones: VOID_TONES, rocks: 14, dust: 4, duration: 700 });
      fx.ring(landing.x, landing.y, 20, 204, GRAVITY.violet, 620, 6, 7);
      fx.arms(landing.x, landing.y, 14, { speed: 260, size: 5, life: 640, depth: 8, tones: VOID_TONES });
      fx.well(landing.x, landing.y, 120, 520, undefined, 4, VOID_TONES);
      float(ctx, mark.x, mark.y - 30, '25', '#ffb3aa');
      float(ctx, mark.x, mark.y - 48, '⬇️ HIGH GRAVITY 8s', '#ccbbee');
    });
    ctx.at(landAt + 800, () => float(ctx, mark.x, mark.y - 40, 'no dodge · no dashes', '#d4c6ff'));
  },
};

// ══ Q — Lunar Landing ═════════════════════════════════════════════════

export const lunarLanding: PreviewScript = {
  duration: 7600,
  scale: 0.88,
  caption: 'Q — a 3s shadow over 44% of the arena, 60 damage, and 20 magma pools for 8s after',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);

    const cx = ctx.w / 2, cy = ctx.h / 2;
    const radius = Math.min(ctx.w, ctx.h) * 0.44;
    const castAt = 400;
    const landAt = castAt + 3000;

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (elapsed < castAt || elapsed >= landAt) return;
      GravityFx.drawShadow(g, ctx.tint, VOID_TONES, cx, cy, radius, elapsed / 1000,
        (elapsed - castAt) / 3000, false);
    });
    ctx.at(castAt, () => { av.play('raise'); float(ctx, ctx.cx, ctx.cy - 46, '3s', '#ccbbee'); });

    ctx.at(landAt, () => {
      fx.impact(cx, cy, radius, { tones: METEOR_TONES, rocks: 40, dust: 10, duration: 1100 });
      fx.ring(cx, cy, radius * 0.2, radius * 1.6, GRAVITY.violet, 900, 7, 9);
      fx.arms(cx, cy, 18, { speed: radius * 2.2, size: 6, life: 900, depth: 9, tones: VOID_TONES });
      float(ctx, mark.x, mark.y - 34, '60', '#ffb3aa');
      // 20 pools, seeded evenly through the circle exactly as the kit seeds them.
      for (let i = 0; i < 20; i++) {
        const r = radius * 0.9 * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        firePool(ctx, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, born: landAt });
      }
    });
    ctx.at(landAt + 700, () => float(ctx, mark.x, mark.y - 30, '4 dmg / 0.3s', '#ffcf9a'));
    ctx.at(landAt + 1600, () => float(ctx, ctx.cx, ctx.cy - 46, '50s cooldown', '#8a8ab0'));
  },
};

export const lunarLandingUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: 'gravity-preview-no-body',
  caption: 'Moon Rider — mount a 100 HP moon, turn the arena to night, and ride the walls at 300 px/s',
  run(ctx) {
    const fx = ctx.capture(() => new GravityFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const mark: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.55 };
    movingDummy(ctx, mark);

    const me = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    const av = drivenCaster(ctx, () => me);

    // The night: wash, an additive light layer, and a swarm of fireflies through it.
    const night = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const lightGfx = ctx.adopt(ctx.scene.add.graphics().setDepth(17).setBlendMode(Phaser.BlendModes.ADD));
    const flies = Array.from({ length: 34 }, () => ({
      x: Math.random() * ctx.w, y: Math.random() * ctx.h,
      vx: (Math.random() - 0.5) * 26, vy: (Math.random() - 0.5) * 20,
      phase: Math.random() * Math.PI * 2, rate: 0.9 + Math.random() * 1.6,
    }));

    // The flight path: the box perimeter held 78px off each wall, walked at 300 px/s.
    const inset = 78;
    const x0 = inset, y0 = inset;
    const x1 = Math.max(x0 + 1, ctx.w - inset), y1 = Math.max(y0 + 1, ctx.h - inset);
    const pw = x1 - x0, ph = y1 - y0;
    const per = 2 * (pw + ph);
    const at = (t: number): Mark => {
      let d = (((t % 1) + 1) % 1) * per;
      if (d < pw) return { x: x0 + d, y: y0 };
      d -= pw;
      if (d < ph) return { x: x1, y: y0 + d };
      d -= ph;
      if (d < pw) return { x: x1 - d, y: y1 };
      d -= pw;
      return { x: x0, y: y1 - d };
    };

    const mountAt = 1600;
    let riding = false;
    let rideT = 0;
    let fade = 0;
    let heading = 0;
    const moon: Mark = { x: ctx.cx, y: ctx.cy };
    let hp = 1;
    const moonGfx = ctx.adopt(ctx.scene.add.graphics().setDepth(18.5));
    const hpBar = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    const mounting = label(ctx, ctx.cx, ctx.cy - 50, '#ccbbee');

    ctx.at(0, () => mounting.setText('Mounting 0%'));
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < mountAt) mounting.setText(`Mounting ${Math.min(100, Math.round(elapsed / 1600 * 100))}%`);
      const target = riding ? 1 : 0;
      fade = target > fade ? Math.min(1, fade + dt / 700) : Math.max(0, fade - dt / 700);

      night.clear(); lightGfx.clear();
      if (fade > 0.01) {
        GravityFx.drawNight(night, ctx.tint, ctx.w, ctx.h, elapsed / 1000, fade);
        lightGfx.setAlpha(fade);
        GravityFx.drawMoonlight(lightGfx, ctx.tint, moon.x, moon.y, 34, elapsed / 1000);
        for (const f of flies) {
          f.x += f.vx * (dt / 1000);
          f.y += f.vy * (dt / 1000);
          if (f.x < 8 || f.x > ctx.w - 8) { f.vx *= -1; f.x = Phaser.Math.Clamp(f.x, 8, ctx.w - 8); }
          if (f.y < 8 || f.y > ctx.h - 8) { f.vy *= -1; f.y = Phaser.Math.Clamp(f.y, 8, ctx.h - 8); }
          const glow = Math.max(0, Math.sin(elapsed / 1000 * f.rate + f.phase));
          GravityFx.drawFirefly(lightGfx, ctx.tint, f.x, f.y, glow * glow);
        }
      }

      moonGfx.clear(); hpBar.clear();
      if (!riding) return;
      const prev = { x: moon.x, y: moon.y };
      rideT += (300 * (dt / 1000)) / per;
      const p = at(rideT);
      moon.x = p.x; moon.y = p.y;
      if (Math.hypot(p.x - prev.x, p.y - prev.y) > 0.01) heading = Math.atan2(p.y - prev.y, p.x - prev.x);
      GravityFx.drawFlyingMoon(moonGfx, ctx.tint, moon.x, moon.y, 34, elapsed / 1000, hp, heading);
      // The rider sits on top of it, wherever on the loop it happens to be.
      me.x = moon.x; me.y = moon.y - 49;
      hpBar.fillStyle(0x333333, 1);
      hpBar.fillRect(moon.x - 28, moon.y + 44, 56, 5);
      hpBar.fillStyle(0xccbbee, 1);
      hpBar.fillRect(moon.x - 28, moon.y + 44, 56 * hp, 5);
    });

    ctx.at(mountAt, () => {
      riding = true;
      mounting.setText('');
      // Join the loop at whichever point on it is nearest to where you were standing.
      let best = 0, bestD = Infinity;
      for (let i = 0; i < 96; i++) {
        const p = at(i / 96);
        const d = Phaser.Math.Distance.Between(p.x, p.y, ctx.cx, ctx.cy);
        if (d < bestD) { bestD = d; best = i / 96; }
      }
      rideT = best;
      av.play('raise');
      fx.bloom(ctx.cx, ctx.cy, 61, 14, 7, MOON_TONES);
      fx.ring(ctx.cx, ctx.cy, 20, 200, GRAVITY.moonlit, 700, 5, 7);
      float(ctx, ctx.cx, ctx.cy - 34, '🌕 MOON RIDER!', '#ccbbee');
    });

    // It takes your hits for you, and it runs people over.
    ctx.at(mountAt + 1600, () => { hp = 0.72; float(ctx, moon.x, moon.y - 46, 'the moon took it', '#ccbbee'); });
    ctx.onFrame((_dt, elapsed) => {
      if (!riding || elapsed < mountAt + 600) return;
      if (Phaser.Math.Distance.Between(moon.x, moon.y, mark.x, mark.y) > 54) return;
      // One ram per target per 0.9s in the arena; here it happens once as the loop passes them.
      mark.x = ctx.w * 0.5; mark.y = ctx.h * 0.55;
    });
    ctx.at(mountAt + 3000, () => {
      // A pass through the middle of the board, staged so the ram is visible.
      mark.x = at(rideT + 0.05).x; mark.y = at(rideT + 0.05).y;
    });
    ctx.at(mountAt + 3400, () => {
      fx.impact(mark.x, mark.y, 70, { tones: MOON_TONES, rocks: 7, dust: 2, duration: 420, crater: false });
      float(ctx, mark.x, mark.y - 34, '25', '#ffb3aa');
      float(ctx, mark.x, mark.y - 52, 'RUN OVER', '#f2ecff');
      mark.x = ctx.w * 0.5; mark.y = ctx.h * 0.55;
    });
    ctx.at(mountAt + 4400, () => float(ctx, ctx.w / 2, ctx.h * 0.34, 'every key is rewritten up here', '#ffe98a'));
  },
};

// ══ PERK — Quake ══════════════════════════════════════════════════════

export const perkQuake: PreviewScript = {
  duration: 6600,
  caption: 'Quake — every meteor crater rolls a ridge: 12 damage, a shove and a 0.5s stun',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 60, y: ctx.ty };
    movingDummy(ctx, mark);

    // The ridge is Earth's slab, repainted violet by the perk itself.
    const violet: EarthColorFn = (base) => (base === EARTH.stone ? 0x8844cc
      : base === EARTH.sand ? 0xcc88ff
        : base === EARTH.umber ? 0x3a1a55
          : base === EARTH.dust ? 0xe0b8ff : base);

    const roll = (born: number, ox: number, oy: number): void => {
      shadow(ctx, {
        x: ctx.cx + ox, y: ctx.cy + oy, born,
        onLand: (ix, iy) => {
          fx.impact(ix, iy, 70, { tones: METEOR_TONES, rocks: 9, dust: 2, duration: 460 });
          float(ctx, ix, iy - 20, '🌊 QUAKE', '#cc88ff');
          // A line of tilted slabs drawn around its own origin, then translated at 300 px/s.
          const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
          for (let i = -3; i <= 3; i++) {
            const f = i / 3;
            stoneChunkLayered(g, violet, 0, i * 22, 0,
              30 + (1 - Math.abs(f)) * 22, 11 + (1 - Math.abs(f)) * 5, 0.85, i * 0.7);
          }
          g.setPosition(ix, iy);
          let spent = false;
          ctx.onFrame((dt) => {
            if (spent) return;
            g.x += 300 * (dt / 1000);
            if (Phaser.Math.Distance.Between(g.x, g.y, mark.x, mark.y) < 40) {
              spent = true;
              g.destroy();
              float(ctx, mark.x, mark.y - 26, '12', '#ffb3aa');
              float(ctx, mark.x, mark.y - 44, 'STUNNED 0.5s', '#d4c6ff');
              mark.x += 60;
            }
          });
        },
      });
    };

    roll(400, 40, -30);
    roll(2600, 20, 30);
    ctx.at(5400, () => float(ctx, ctx.cx, ctx.cy - 50, 'one ridge per crater', '#ffe98a'));
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryGravityAura: PreviewScript = {
  duration: 7800,
  caption: 'Mastery passive — 20% of incoming shots are caught, orbit 10s, then fire back at your cursor',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);

    interface Orb { angle: number; g: Phaser.GameObjects.Graphics; alive: boolean }
    const orbs: Orb[] = [];
    ctx.onFrame((dt, elapsed) => {
      for (const o of orbs) {
        if (!o.alive) continue;
        o.angle += dt * 0.0022;
        o.g.setPosition(ctx.cx + Math.cos(o.angle) * 46, ctx.cy + Math.sin(o.angle) * 46);
        o.g.clear();
        GravityFx.drawCaughtOrb(o.g, ctx.tint, VOID_TONES, 0, 0, elapsed / 1000 + o.angle);
      }
    });

    const catchOne = (born: number, angle: number): void => ctx.at(born, () => {
      fx.bloom(ctx.cx + 34, ctx.cy, 22, 6, 9, VOID_TONES);
      float(ctx, ctx.cx, ctx.cy - 34, '🌌 CAUGHT', '#ccbbee');
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      orbs.push({ angle, g, alive: true });
    });
    catchOne(500, 0);
    catchOne(1300, 1.6);
    catchOne(2100, 3.1);
    catchOne(2900, 4.7);
    ctx.at(3300, () => float(ctx, ctx.cx, ctx.cy - 52, '4 is the cap', '#ffe98a'));

    // A shot that runs into an orbiter takes it with it — the orbit is a screen, not storage.
    ctx.at(4200, () => {
      const victim = orbs.find((o) => o.alive);
      if (!victim) return;
      fx.flash(victim.g.x, victim.g.y, 18, 9, VOID_TONES);
      victim.alive = false;
      victim.g.clear();
      float(ctx, victim.g.x, victim.g.y - 24, 'BOTH DESTROYED', '#d4c6ff');
    });

    // And an orbiter that survives its ten seconds is thrown back with its own damage figure.
    ctx.at(5400, () => {
      const out = orbs.find((o) => o.alive);
      if (!out) return;
      out.alive = false;
      out.g.clear();
      fx.arms(ctx.cx, ctx.cy, 4, { speed: 120, angle: ctx.aim, spread: 0.7, size: 2.6, life: 380, depth: 8, tones: VOID_TONES });
      ctx.fly({
        texture: 'proj-fire',
        from: { x: ctx.cx + 30, y: ctx.cy },
        to: { x: mark.x, y: mark.y },
        speed: 420,
        onHit: () => {
          fx.flash(mark.x, mark.y, 16, 8, VOID_TONES);
          float(ctx, mark.x, mark.y - 26, 'their own damage', '#ffb3aa');
        },
      });
      float(ctx, ctx.cx, ctx.cy - 40, 'RETURNED', '#ccbbee');
    });
  },
};

export const masteryStarfall: PreviewScript = {
  duration: 7400,
  caption: 'Starfall — 20 stars, 10 on the way past and 15 on the floor, and 10s Grounded on anyone hit',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const floorY = ctx.h * 0.9;
    const mark: Mark = { x: ctx.tx - 40, y: ctx.ty };
    movingDummy(ctx, mark);

    const castAt = 500;
    ctx.at(castAt, () => {
      av.play('raise');
      float(ctx, ctx.cx, ctx.cy - 40, '🌙 STARFALL', '#ccbbee');
    });

    // Twenty stars from random points across the width, all falling at 480 px/s.
    let grounded = 0;
    for (let i = 0; i < 20; i++) {
      const x = 20 + Math.random() * (ctx.w - 40);
      const born = castAt + Math.random() * 260;
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
      let hit = false;
      let done = false;
      ctx.onFrame((dt, elapsed) => {
        g.clear();
        if (elapsed < born || done) return;
        const y = -20 + 480 * ((elapsed - born) / 1000);
        g.setPosition(x, y);
        GravityFx.drawStar(g, ctx.tint, VOID_TONES, 0, 0, elapsed / 1000 + x);
        if (!hit && Phaser.Math.Distance.Between(x, y, mark.x, mark.y) <= 20) {
          hit = true;
          float(ctx, mark.x, mark.y - 26, '10', '#ffb3aa');
          grounded = elapsed;
        }
        if (y >= ctx.h - 20) {
          done = true;
          g.clear();
          fx.impact(x, ctx.h - 20, 52, { tones: VOID_TONES, rocks: 4, dust: 1, duration: 380, crater: false });
          fx.starBurst(x, ctx.h - 20, 46, 9, VOID_TONES);
          if (Phaser.Math.Distance.Between(x, ctx.h - 20, mark.x, mark.y) <= 45) {
            float(ctx, mark.x, mark.y - 26, '15', '#ffb3aa');
            grounded = elapsed;
          }
        }
        void dt;
      });
    }

    // Grounded: pinned to the floor, left and right only, with the occasional hop.
    let announced = false;
    ctx.onFrame((dt, elapsed) => {
      if (!grounded) return;
      if (!announced) { announced = true; float(ctx, mark.x, mark.y - 44, '⬇️ GROUNDED 10s', '#ccbbee'); }
      const since = elapsed - grounded;
      const hopPhase = since % 2400;
      const hop = hopPhase < 420 ? Math.sin((hopPhase / 420) * Math.PI) * 34 : 0;
      mark.y = floorY - hop;
      mark.x += 44 * (dt / 1000);
    });
  },
};
