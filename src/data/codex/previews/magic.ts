import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  MAGIC, MagicAura, MagicAvatar, MagicFx, runeOrb, vineLash,
} from '../../../elements/kits/MagicVisuals';
import {
  DARK_GRIMOIRE_COLORS, DARK_GRIMOIRE_LABELS, DARK_NECRO_COLORS, DARK_NECRO_LABELS,
  GRIMOIRE_COLORS, GRIMOIRE_LABELS, NECRO_COLORS, NECRO_LABELS,
} from '../../../elements/kits/MagicKit';

/**
 * Magic's showcases.
 *
 * Almost nothing in this element is a sprite: Flares, pools, burs, spark trails, ward links,
 * crosshairs, corrupted data and the familiars themselves are all plain data repainted every
 * frame into two Graphics layers. So these loops keep their own little arrays and call exactly
 * the painters the kit calls — `MagicFx.drawFlameCloud`, `drawPuddle`, `drawBur`, `drawSummon`,
 * `drawSummonBolt`, `drawCrosshair`, `drawMagicMissile`, `drawCorruptData`, `drawGroundCrack`,
 * `drawSparkle`, `drawChickenBolt`, `runeOrb` and `vineLash` — plus `MagicFx.drawWheel`, which
 * was pulled out of the kit so the showcase can open the same five-wedge ring the arena does,
 * Dark Magic hub button and all.
 *
 * The Sparkle Shot's sprite is deliberately invisible in the arena — the kit paints the star —
 * so it is mirrored here, not flown.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt`; `MagicFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: MagicFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new MagicFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new MagicAvatar(ctx.scene, ctx.tint, 'player'));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * A caster that stands somewhere other than the box's fixed mark, or moves.
 *
 * Scripts using this must set `bodyTexture: ''` so the harness stages no body of its own; the
 * per-frame hook runs after the harness's own avatar pass, so it is what the rig obeys.
 */
function drivenCaster(ctx: PreviewCtx, at: { x: number; y: number }): { fx: MagicFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new MagicFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-magic')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-magic').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new MagicAvatar(ctx.scene, ctx.tint, 'player'));
  ctx.onFrame((dt) => { av.setFacing(0); av.update(dt, at.x, at.y, 1); });
  return { fx, av };
}

/** A stand-in enemy painted from a live position, so a loop can walk it about. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number; hidden?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    if (at.hidden) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
}

/** One of the kit's stance auras, driven from a flag. */
function aura(
  ctx: PreviewCtx, style: 'meditate' | 'darkness' | 'boost' | 'bound' | 'chicken',
  at: { x: number; y: number }, radius: number, read: () => { on: boolean; intensity: number },
): void {
  const a = ctx.capture(() => new MagicAura(ctx.scene, ctx.tint, style, radius, 4));
  ctx.onFrame((dt) => {
    const s = read();
    a.setIntensity(s.intensity);
    ctx.capture(() => a.update(dt, at.x, at.y, s.on ? 1 : 0));
  });
}

/** The ☠ bar the kit hangs under a corrupted caster. */
function darknessBar(ctx: PreviewCtx, at: { x: number; y: number }, read: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(25));
  const txt = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '9px', color: '#cc88ff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2,
  }).setDepth(26).setOrigin(0.5, 1));
  ctx.onFrame(() => {
    const v = read();
    const bx = at.x - 30, by = at.y + 40;
    g.clear();
    g.fillStyle(0x111111, 0.65);
    g.fillRect(bx, by, 60, 6);
    g.fillStyle(v >= 75 ? 0xff0000 : v >= 40 ? 0x880088 : 0x550066, 0.9);
    g.fillRect(bx, by, 60 * (v / 100), 6);
    txt.setPosition(at.x, by - 1).setText(`☠ ${Math.round(v)}/100`);
  });
}

interface WheelState { open: boolean; selected: number; dark: boolean }

/** The five-wedge wheel, exactly as the kit opens it: 130px, labels at 65% of the reach. */
function wheelLayer(
  ctx: PreviewCtx, at: { x: number; y: number },
  light: { labels: string[]; colors: number[] },
  dark: { labels: string[]; colors: number[] } | null,
  st: WheelState,
): void {
  const R = 130;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(31));
  const lbls: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < 5; i++) {
    lbls.push(ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', align: 'center', wordWrap: { width: 72 },
    }).setOrigin(0.5).setDepth(32)));
  }
  ctx.onFrame(() => {
    g.clear();
    if (!st.open) { for (const l of lbls) l.setText(''); return; }
    const use = st.dark && dark ? dark : light;
    MagicFx.drawWheel(g, at.x, at.y, R, use.colors, st.selected, dark ? (st.dark ? 'dark' : 'light') : 'none');
    for (let i = 0; i < 5; i++) {
      const p = MagicFx.wheelLabelPos(at.x, at.y, R, i, 5, st.selected);
      lbls[i].setPosition(p.x, p.y).setText(use.labels[i]);
    }
  });
}

/** The 2-second aim count the kit hangs over the caster between release and the spell landing. */
function aimCountdown(ctx: PreviewCtx, at: { x: number; y: number }, fromMs: number, fire: () => void): void {
  const t = ctx.adopt(ctx.scene.add.text(at.x, at.y - 54, '✨ 2.0', {
    fontSize: '18px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: '#cc99ff', stroke: '#220044', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(30).setVisible(false));
  ctx.onFrame((_dt, elapsed) => {
    const left = fromMs + 2000 - elapsed;
    const on = elapsed >= fromMs && left > 0;
    t.setVisible(on).setPosition(at.x, at.y - 54);
    if (on) t.setText(`✨ ${(left / 1000).toFixed(1)}`);
  });
  ctx.at(fromMs + 2000, () => { t.setVisible(false); fire(); });
}

// ── Shared world objects ──────────────────────────────────────────────

interface Cloud {
  seed: number; x: number; y: number; vx: number; vy: number;
  radius: number; born: number; life: number; cursed: boolean;
  follow?: { x: number; y: number };
}

/** Flame clouds, decelerating exactly as the kit's do (×0.93 a frame) or chasing a cursor. */
function flameLayer(ctx: PreviewCtx, clouds: Cloud[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      if (elapsed - c.born >= c.life) { clouds.splice(i, 1); continue; }
      if (c.follow) {
        c.x += (c.follow.x - c.x) * 0.10;
        c.y += (c.follow.y - c.y) * 0.10;
      } else {
        c.vx *= 0.93; c.vy *= 0.93;
        c.x += c.vx * (dt / 1000); c.y += c.vy * (dt / 1000);
      }
      const fade = Phaser.Math.Clamp((c.life - (elapsed - c.born)) / 600, 0, 1);
      MagicFx.drawFlameCloud(g, ctx.tint, c.x, c.y, c.radius, c.cursed, c.seed, elapsed / 1000,
        0.35 + 0.55 * fade);
    }
  });
}

/**
 * Cloud ticks, printed only while a cloud is genuinely covering the target.
 *
 * A cloud decelerates at 0.93 a frame, so it travels about 60px and no further — a loop that
 * printed a figure over a distant dummy would be documenting a reach the ability does not have.
 */
function cloudTicks(
  ctx: PreviewCtx, clouds: Cloud[], target: { x: number; y: number },
  everyMs: number, text: string, color: string,
): void {
  let next = 0;
  ctx.onFrame((_dt, elapsed) => {
    if (elapsed < next) return;
    const hot = clouds.some((c) => Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y) <= c.radius);
    if (!hot) return;
    next = elapsed + everyMs;
    ctx.capture(() => float(ctx, target.x + (Math.random() - 0.5) * 22, target.y - 24, text, color, 12));
  });
}

interface Orb { angle: number; radius: number; cracked: boolean; dead: boolean }

/** Rune stones on an orbit, around a caster or around a fixed anchor. */
function orbitLayer(
  ctx: PreviewCtx, anchor: { x: number; y: number }, orbs: Orb[], orbitR: number,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const o of orbs) {
      if (o.dead) continue;
      o.angle += 0.003 * dt;
      const x = anchor.x + Math.cos(o.angle) * orbitR;
      const y = anchor.y + Math.sin(o.angle) * orbitR;
      runeOrb(g, ctx.tint, x, y, o.radius, o.angle * 2,
        o.cracked ? MAGIC.granite : MAGIC.stone, o.cracked ? MAGIC.gust : MAGIC.sand, 1, o.cracked);
      void elapsed;
    }
  });
}

// ══ CLICK — Sparkle Shot ══════════════════════════════════════════════

interface Star { x: number; y: number; vx: number; vy: number; from: number; armed: number; gone: boolean }

/** The star: 450 px/s for 180px, then one second of winding up, then a 55px burst. */
function starLayer(ctx: PreviewCtx, stars: Star[], trail: boolean): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const s of stars) {
      if (s.gone) continue;
      if (s.armed === 0) {
        s.x += s.vx * (dt / 1000); s.y += s.vy * (dt / 1000);
        if (s.from + 180 <= s.x) { s.vx = 0; s.vy = 0; s.armed = 0.0001; }
      } else if (s.armed < 1) {
        s.armed = Phaser.Math.Clamp(s.armed + dt / 1000, 0, 1);
      }
      MagicFx.drawSparkle(g, ctx.tint, s.x, s.y, s.armed >= 0.0001 ? s.armed : 0, elapsed / 1000, trail && s !== stars[0]);
    }
  });
}

export const sparkleShot: PreviewScript = {
  duration: 8200,
  scale: 0.9,
  caption: 'Click — 450 px/s for 180px, one second armed, then 14 in a 55px burst (6 on a direct hit)',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 205, y: ctx.cy };
    dummyAt(ctx, victim);
    const stars: Star[] = [];
    starLayer(ctx, stars, false);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff99ff', 11);

    // A star that stops short of somebody: the burst is what the ability is for.
    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.sigils(ctx.cx, ctx.cy, 3, { speed: 70, angle: ctx.aim, spread: 0.6, size: 6, life: 340, color: MAGIC.blush });
      stars.push({ x: ctx.cx, y: ctx.cy, vx: 450, vy: 0, from: ctx.cx, armed: 0, gone: false });
      readout.setText('flying — 180px of reach');
    });
    ctx.at(900, () => readout.setText('stopped — arming for 1.0s'));
    ctx.at(1900, () => {
      const s = stars[0];
      s.gone = true;
      fx.boom(s.x, s.y, 58, { color: MAGIC.blush, sigils: 8, rings: 2, duration: 440 });
      float(ctx, s.x, s.y - 20, '✨ SPARKLE', '#ff99ff', 11);
      float(ctx, victim.x, victim.y - 26, '14', '#ff99ff', 15);
      readout.setText('14 damage, 55px radius');
    });

    // And the other case: run into somebody in flight and it is worth 6 and nothing else.
    ctx.at(4200, () => { victim.x = ctx.cx + 120; });
    ctx.at(4600, () => {
      av.play('punch', ctx.aim);
      const s: Star = { x: ctx.cx, y: ctx.cy, vx: 450, vy: 0, from: ctx.cx, armed: 0, gone: false };
      stars.push(s);
      readout.setText('a body in the way ends it early');
      ctx.onFrame(() => {
        if (s.gone) return;
        if (Phaser.Math.Distance.Between(s.x, s.y, victim.x, victim.y) > 20) return;
        s.gone = true;
        ctx.capture(() => {
          fx.flash(victim.x, victim.y, 20, 10, MAGIC.blush);
          float(ctx, victim.x, victim.y - 26, '6', '#cc99ff', 13);
          float(ctx, victim.x, victim.y - 44, 'no burst', '#88708a', 10);
        });
      });
    });
  },
};

export const sparkleShotUpgraded: PreviewScript = {
  duration: 8200,
  scale: 0.9,
  caption: 'Sparkle Trail — two more stars pinned 32px and 64px back, bursting for 11 each when the leader goes',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.cx + 205, y: ctx.cy };
    dummyAt(ctx, victim);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const lead = { x: ctx.cx, y: ctx.cy, vx: 0, armed: 0, gone: false };
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff99ff', 11);

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (lead.gone) return;
      lead.x += lead.vx * (dt / 1000);
      if (lead.vx > 0 && lead.x >= ctx.cx + 180) { lead.vx = 0; lead.armed = 0.0001; }
      if (lead.armed > 0) lead.armed = Phaser.Math.Clamp(lead.armed + dt / 1000, 0, 1);
      if (lead.vx === 0 && lead.armed === 0) return;
      MagicFx.drawSparkle(g, ctx.tint, lead.x, lead.y, lead.armed, elapsed / 1000, false);
      // The trailers are not travelling — they are pinned to the leader's wake.
      for (const off of [32, 64]) {
        MagicFx.drawSparkle(g, ctx.tint, lead.x - off, lead.y, 0, elapsed / 1000, true);
      }
    });

    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.sigils(ctx.cx, ctx.cy, 3, { speed: 70, angle: ctx.aim, spread: 0.6, size: 6, life: 340, color: MAGIC.blush });
      lead.vx = 450;
      readout.setText('three stars up the same line');
    });
    ctx.at(1000, () => readout.setText('leader arming — the tail waits on it'));
    ctx.at(2000, () => {
      lead.gone = true;
      fx.boom(lead.x, lead.y, 58, { color: MAGIC.blush, sigils: 8, rings: 2, duration: 440 });
      float(ctx, victim.x, victim.y - 26, '14', '#ff99ff', 15);
      for (const off of [32, 64]) {
        fx.boom(lead.x - off, lead.y, 45, { color: MAGIC.blush, sigils: 5, rings: 1, duration: 340, mark: false });
        float(ctx, lead.x - off, ctx.cy - 24, '11', '#cc99ff', 12);
      }
      readout.setText('14 + 11 + 11 across 165px of ground');
    });
    ctx.at(3400, () => float(ctx, ctx.cx + 90, ctx.cy + 34, 'the tail deals no contact damage at all', '#88708a', 10));
  },
};

// ══ Shared world layers for the reworked kit ══════════════════════════

interface Pool { x: number; y: number; radius: number; born: number; life: number; putrid: boolean; seed: number }

/** Splash pools on the floor, painted with the kit's own painter. */
function poolLayer(ctx: PreviewCtx, pools: Pool[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (let i = pools.length - 1; i >= 0; i--) {
      const p = pools[i];
      if (elapsed - p.born >= p.life) { pools.splice(i, 1); continue; }
      const fade = Phaser.Math.Clamp((p.life - (elapsed - p.born)) / 800, 0, 1);
      MagicFx.drawPuddle(g, ctx.tint, p.x, p.y, p.radius, p.putrid, p.seed,
        elapsed / 1000, 0.45 + 0.5 * fade);
    }
  });
}

interface StuckBur { ox: number; oy: number; spin: number }

/** Burs riding on a victim, offset from their centre exactly as the kit stores them. */
function burLayer(ctx: PreviewCtx, burs: StuckBur[], on: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt) => {
    g.clear();
    for (const b of burs) {
      b.spin += dt * 0.002;
      MagicFx.drawBur(g, ctx.tint, on.x + b.ox, on.y + b.oy, b.spin, 1);
    }
  });
}

interface Fam { kind: string; x: number; y: number; bob: number; seed: number; plus: boolean; hp: number }

/** Familiars, drifting at a target the way the kit's station-keeping does. */
function famLayer(ctx: PreviewCtx, fams: Fam[], goal: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const f of fams) {
      f.bob += dt * 0.005;
      const a = Math.atan2(goal.y - f.y, goal.x - f.x);
      const d = Phaser.Math.Distance.Between(f.x, f.y, goal.x, goal.y);
      if (d > 78) {
        f.x += Math.cos(a) * 120 * (dt / 1000);
        f.y += Math.sin(a) * 120 * (dt / 1000);
      }
      MagicFx.drawSummon(g, ctx.tint, f.kind, f.x, f.y, f.bob, f.plus, f.seed,
        elapsed / 1000, f.hp, 1);
    }
  });
}

// ══ E — Grimoire ══════════════════════════════════════════════════════

export const grimoire: PreviewScript = {
  duration: 12000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'E — hold for the wheel, release, aim for 2s; a sub-150ms tap re-casts your last pick',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 150, y: at.y - 10 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS }, null, st);
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc99ff', 13);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const orbs: Orb[] = [];
    orbitLayer(ctx, at, orbs, 56);

    ctx.at(300, () => { st.open = true; readout.setText('holding E — five spells'); });
    ctx.at(1000, () => { st.selected = 2; });
    ctx.at(1500, () => { st.selected = 1; readout.setText('← / → across the wedges'); });
    ctx.at(2100, () => {
      st.open = false;
      av.play('sweep', ctx.aim);
      readout.setText('released — 2s to aim');
    });
    aimCountdown(ctx, at, 2100, () => {
      // Splash: a 90px pool at the cursor, 6s of 35% slow and 3 damage a second.
      fx.ring(victim.x, victim.y, 10, 90, MAGIC.storm, 560, 8, 3);
      pools.push({
        x: victim.x, y: victim.y, radius: 90,
        born: 4100, life: 6000, putrid: false, seed: Math.random() * 10,
      });
      ctx.capture(() => float(ctx, victim.x, victim.y - 30, '🌊 Splash', '#66aaff', 12));
      readout.setText('🌊 90px pool, 6s — 35% slow and 3 damage a second');
    });
    for (const d of [4700, 5700, 6700]) {
      ctx.at(d, () => ctx.capture(() =>
        float(ctx, victim.x + (Math.random() - 0.5) * 22, victim.y - 24, '3', '#66aaff', 12)));
    }

    // The repeat trick: a tap too short to open the wheel re-fires the last pick.
    ctx.at(7600, () => {
      st.selected = 4;
      readout.setText('tap E under 150ms — no wheel, last pick again');
      av.play('sweep', ctx.aim);
    });
    aimCountdown(ctx, at, 7700, () => {
      fx.ring(at.x, at.y, 8, 68, MAGIC.stone, 520, 8, 2.6);
      for (let i = 0; i < 5; i++) {
        orbs.push({ angle: (i / 5) * Math.PI * 2, radius: 10, cracked: false, dead: false });
        ctx.capture(() => fx.sigils(
          at.x + Math.cos((i / 5) * Math.PI * 2) * 56, at.y + Math.sin((i / 5) * Math.PI * 2) * 56,
          3, { speed: 70, size: 6, life: 400, color: MAGIC.sand, points: 4 },
        ));
      }
      ctx.capture(() => float(ctx, at.x, at.y - 30, '🪨 Ward', '#cc9944', 12));
      readout.setText('🪨 5 stones, 10 damage a contact, and they eat hostile shots');
    });
  },
};

export const grimoireUpgraded: PreviewScript = {
  duration: 13000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Corrupted Grimoire — the hub button blackens all five wedges; every dark cast is +25 Darkness',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 150, y: at.y - 10 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 1, dark: false };
    wheelLayer(ctx, at,
      { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS },
      { labels: DARK_GRIMOIRE_LABELS, colors: DARK_GRIMOIRE_COLORS }, st);
    let darkness = 0;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc66ff', 13);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const burs: StuckBur[] = [];
    burLayer(ctx, burs, victim);

    ctx.at(300, () => { st.open = true; readout.setText('the hub button only exists with E+'); });
    ctx.at(1300, () => {
      st.dark = true;
      ctx.capture(() => fx.ring(at.x, at.y, 6, 44, MAGIC.magenta, 400, 33, 2.4));
      ctx.capture(() => float(ctx, at.x, at.y - 44, '🖤 DARK MAGIC ON', '#cc44ff', 12));
      readout.setText('toggled — all five wedges are black now, and it sticks between casts');
    });
    ctx.at(2200, () => { st.open = false; av.play('sweep', ctx.aim); readout.setText('released — 2s to aim'); });
    aimCountdown(ctx, at, 2200, () => {
      darkness += 25;
      fx.ring(victim.x, victim.y, 10, 130, MAGIC.acid, 560, 8, 3);
      pools.push({
        x: victim.x, y: victim.y, radius: 130,
        born: 4200, life: 8000, putrid: true, seed: Math.random() * 10,
      });
      ctx.capture(() => float(ctx, victim.x, victim.y - 30, '🌊 Splash+', '#66cc55', 12));
      ctx.capture(() => float(ctx, at.x, at.y - 50, '+25 ☠', '#880088', 12));
      readout.setText('🖤 putrid: 130px, 70% slow, 6 damage a second — and no dash out of it');
    });
    ctx.at(5000, () => ctx.capture(() =>
      float(ctx, victim.x, victim.y - 44, '⛔ NO DASH', '#66cc55', 12)));

    // Second cast: Spur+, and the fifth bur knitting into a pin.
    ctx.at(6600, () => { st.selected = 2; av.play('sweep', ctx.aim); readout.setText('🌿 Spur+ — three burs, and they stick'); });
    aimCountdown(ctx, at, 6600, () => {
      darkness += 25;
      ctx.capture(() => float(ctx, at.x, at.y - 50, '+25 ☠', '#880088', 12));
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 12;
        burs.push({ ox: Math.cos(a) * d, oy: Math.sin(a) * d, spin: Math.random() * Math.PI });
      }
      ctx.capture(() => float(ctx, victim.x, victim.y - 30, '🌿 3/5', '#66dd77', 12));
      readout.setText('🌿 burs stay in for 2s and stack');
    });
    ctx.at(9600, () => {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 12;
        burs.push({ ox: Math.cos(a) * d, oy: Math.sin(a) * d, spin: Math.random() * Math.PI });
      }
      ctx.capture(() => float(ctx, victim.x, victim.y - 30, '🌿 5/5', '#66dd77', 12));
    });
    ctx.at(9900, () => {
      burs.length = 0;
      fx.boom(victim.x, victim.y, 62, { color: MAGIC.vine, sigils: 10, rings: 2, duration: 480 });
      ctx.capture(() => float(ctx, victim.x, victim.y - 44, '🌿 PINNED — 3s', '#33ff66', 12));
      readout.setText('🌿 five at once pins them for 3s…');
    });
    ctx.at(11600, () => {
      fx.boom(victim.x, victim.y, 56, { color: MAGIC.leaf, sigils: 9, rings: 2, duration: 460 });
      ctx.capture(() => float(ctx, victim.x, victim.y - 30, '🌿 TORN FREE -12', '#44ff66', 12));
      readout.setText('…and tearing free costs them another 12');
    });
  },
};

// ══ R — Crosshair ═════════════════════════════════════════════════════

function crosshairScript(shortcut: boolean): PreviewScript {
  return {
    duration: shortcut ? 8000 : 11000,
    scale: 0.82,
    bodyTexture: '',
    caption: shortcut
      ? 'Magic Shortcut — right-click with no tallies fires a 15-damage missile and drops the mark'
      : 'R — mark them, feed it Sparkle Shots, right-click for 8 damage a tally',
    run(ctx) {
      const at = { x: ctx.w * 0.26, y: ctx.cy };
      const { fx, av } = drivenCaster(ctx, at);
      const victim = { x: ctx.w * 0.72, y: ctx.cy - 12 };
      dummyAt(ctx, victim);
      const mark = { live: false, marks: 0, spin: 0 };
      const missile = { x: 0, y: 0, live: false };
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const readout = label(ctx, ctx.w * 0.5, 12, '#cc88ff', 12);

      ctx.onFrame((dt, elapsed) => {
        g.clear();
        mark.spin += dt * 0.0016;
        if (mark.live) {
          MagicFx.drawCrosshair(g, ctx.tint, victim.x, victim.y, mark.marks, mark.spin, 1);
        }
        if (missile.live) {
          missile.x += 430 * (dt / 1000);
          MagicFx.drawMagicMissile(g, ctx.tint, missile.x, missile.y, 0, elapsed / 1000);
          if (missile.x >= victim.x - 18) {
            missile.live = false;
            ctx.capture(() => {
              fx.boom(victim.x, victim.y, 95, { color: MAGIC.purple, sigils: 11, rings: 2, duration: 520 });
              float(ctx, victim.x, victim.y - 28, '✦ 15', '#bb88ff', 13);
            });
            readout.setText('15 damage in a 95px burst — and the mark is already gone');
          }
        }
      });

      ctx.at(500, () => {
        av.play('slam', ctx.aim);
        mark.live = true;
        ctx.capture(() => {
          fx.ring(victim.x, victim.y, 60, 22, MAGIC.orchid, 420, 9, 2.6);
          float(ctx, victim.x, victim.y - 34, '✛ MARKED', '#cc88ff', 12);
        });
        readout.setText('R marks the nearest enemy for 6 seconds');
      });

      if (shortcut) {
        ctx.at(2400, () => {
          readout.setText('right-click with the crosshair still empty…');
        });
        ctx.at(3400, () => {
          mark.live = false;
          missile.x = at.x; missile.y = at.y; missile.live = true;
          av.play('punch', ctx.aim);
          ctx.capture(() => {
            fx.flash(at.x, at.y, 26, 10, MAGIC.orchid);
            float(ctx, at.x, at.y - 34, '✦ MAGIC SHORTCUT', '#cc88ff', 12);
          });
          readout.setText('✦ one heavy missile at 430 px/s instead of a wasted mark');
        });
        ctx.at(6200, () => readout.setText('without R+, an empty crosshair pays nothing at all'));
        return;
      }

      // Three sparkle bursts, each adding a tally.
      let n = 0;
      for (const d of [1800, 3200, 4600]) {
        ctx.at(d, () => {
          n++;
          av.play('punch', ctx.aim);
          ctx.capture(() => {
            fx.boom(victim.x, victim.y, 55, { color: MAGIC.blush, sigils: 8, rings: 2, duration: 440 });
            float(ctx, victim.x, victim.y - 20, '✨ 14', '#ff99ff', 12);
          });
          mark.marks = n;
          ctx.capture(() => float(ctx, victim.x, victim.y - 46, `✛ ${n}/5`, '#ff99ff', 12));
          readout.setText(`every Sparkle Shot burst on them is a tally — ${n} of 5`);
        });
      }
      ctx.at(6400, () => readout.setText('right-click to cash it in…'));
      ctx.at(7200, () => {
        const dmg = mark.marks * 8;
        mark.live = false;
        av.play('slam', ctx.aim);
        ctx.capture(() => {
          fx.boom(victim.x, victim.y, 110, { color: MAGIC.blush, sigils: 12, rings: 3, duration: 560 });
          float(ctx, victim.x, victim.y - 34, `✛ 3× — ${dmg}!`, '#ff88ff', 14);
        });
        readout.setText('8 damage a tally in 110px — 40 at five');
      });
      ctx.at(9400, () => readout.setText('let the 6 seconds lapse instead and you get nothing'));
    },
  };
}

export const magicAnchor = crosshairScript(false);
export const magicAnchorUpgraded = crosshairScript(true);

// ══ F — Dupe ══════════════════════════════════════════════════════════

export const meditate: PreviewScript = {
  duration: 10000,
  scale: 0.82,
  bodyTexture: '',
  caption: 'F — everything of yours inside the 140px field comes out twice, for free',
  run(ctx) {
    const at = { x: ctx.w * 0.24, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const field = { x: ctx.w * 0.62, y: ctx.cy };
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc88ff', 12);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const clouds: Cloud[] = [];
    flameLayer(ctx, clouds);
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    let showField = 0;
    ctx.onFrame((_dt, elapsed) => {
      ring.clear();
      if (elapsed >= showField && showField > 0) {
        ring.lineStyle(2, 0xcc88ff, 0.5 + 0.3 * Math.sin(elapsed / 160));
        ring.strokeCircle(field.x, field.y, 140);
      }
    });

    ctx.at(300, () => {
      pools.push({ x: field.x - 40, y: field.y + 20, radius: 90, born: 300, life: 9000, putrid: false, seed: 1.4 });
      clouds.push({
        seed: 3.2, x: field.x + 40, y: field.y - 30, vx: 0, vy: 0,
        radius: 34, born: 300, life: 9000, cursed: false,
      });
      readout.setText('a Splash pool and a Flare already on the field');
      showField = 1;
    });
    ctx.at(2200, () => {
      av.play('flex', ctx.aim);
      ctx.capture(() => {
        fx.ring(field.x, field.y, 12, 140, MAGIC.magenta, 620, 8, 3.2);
        fx.conjure(field.x, field.y, 84, 420, { color: MAGIC.orchid });
      });
      readout.setText('F opens a 140px field at the cursor');
    });
    ctx.at(2900, () => {
      pools.push({ x: field.x - 40 + 22, y: field.y + 20 - 18, radius: 90, born: 2900, life: 6400, putrid: false, seed: 7.1 });
      clouds.push({
        seed: 8.5, x: field.x + 40 + 18, y: field.y - 30 + 20, vx: 0, vy: 0,
        radius: 34, born: 2900, life: 6400, cursed: false,
      });
      ctx.capture(() => {
        fx.sigils(field.x, field.y, 8, { speed: 210, size: 8, life: 560, color: MAGIC.orchid });
        float(ctx, field.x, field.y - 34, '⧉ DUPED ×2', '#cc88ff', 13);
      });
      readout.setText('both come out twice, at the same tier, offset a little');
    });
    ctx.at(5600, () => readout.setText('it costs no Darkness — the corrupted spells pay for themselves'));
    ctx.at(7800, () => readout.setText('burs copy onto the same victim, so a Dupe can finish a 5-bur pin'));
  },
};

export const meditateUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.82,
  bodyTexture: '',
  caption: 'Corrupted Data — an enemy caught in the field sheds a glitched copy of you worth 20 Darkness',
  run(ctx) {
    const at = { x: ctx.w * 0.22, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: ctx.w * 0.64, y: ctx.cy - 6 };
    dummyAt(ctx, victim);
    let darkness = 75;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc66ff', 12);
    const drops: { x: number; y: number; seed: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const d of drops) MagicFx.drawCorruptData(g, ctx.tint, d.x, d.y, d.seed, elapsed / 1000, 1);
    });

    ctx.at(400, () => readout.setText('75 Darkness — three more corrupted casts and it kills you'));
    ctx.at(2000, () => {
      av.play('flex', ctx.aim);
      ctx.capture(() => {
        fx.ring(victim.x, victim.y, 12, 140, MAGIC.magenta, 620, 8, 3.2);
        fx.flash(victim.x, victim.y, 26, 10, MAGIC.magenta);
        float(ctx, victim.x, victim.y - 34, '⧉ CORRUPTED', '#ff66ff', 12);
      });
      drops.push({ x: victim.x - 30, y: victim.y + 24, seed: 2.7 });
      readout.setText('an enemy inside the field is copied too — badly');
    });
    ctx.at(4200, () => readout.setText('what drops is you, glitching, for 14 seconds'));
    // Walk the caster onto it.
    ctx.at(5400, () => readout.setText('walk over it…'));
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 5400 || drops.length === 0) return;
      const d = drops[0];
      const a = Math.atan2(d.y - at.y, d.x - at.x);
      at.x += Math.cos(a) * 150 * (dt / 1000);
      at.y += Math.sin(a) * 150 * (dt / 1000);
      if (Phaser.Math.Distance.Between(at.x, at.y, d.x, d.y) > 26) return;
      drops.length = 0;
      darkness = Math.max(0, darkness - 20);
      ctx.capture(() => {
        fx.ring(at.x, at.y, 8, 52, MAGIC.orchid, 460, 9, 2.6);
        fx.sigils(at.x, at.y, 7, { speed: 130, size: 7, life: 460, color: MAGIC.magenta });
        float(ctx, at.x, at.y - 34, '⧉ -20 ☠', '#cc88ff', 13);
      });
      readout.setText('-20 ☠ — the only thing in the element that takes any back off');
    });
  },
};

// ══ Q — Necronomicon ══════════════════════════════════════════════════

export const necronomicon: PreviewScript = {
  duration: 12000,
  scale: 0.78,
  bodyTexture: '',
  caption: 'Q — call one base element up as a familiar; it fights on its own for 18s and can be killed',
  run(ctx) {
    const at = { x: ctx.w * 0.26, y: ctx.h * 0.55 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: ctx.w * 0.76, y: ctx.h * 0.42 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: NECRO_LABELS, colors: NECRO_COLORS }, null, st);
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc99ff', 13);
    const fams: Fam[] = [];
    famLayer(ctx, fams, victim);
    const bolts: { x: number; y: number; vx: number; vy: number }[] = [];
    const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt, elapsed) => {
      bg.clear();
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * (dt / 1000); b.y += b.vy * (dt / 1000);
        if (Phaser.Math.Distance.Between(b.x, b.y, victim.x, victim.y) <= 22) {
          bolts.splice(i, 1);
          ctx.capture(() => {
            fx.boom(victim.x, victim.y, 34, { color: MAGIC.ember, sigils: 4, rings: 1, duration: 300, mark: false });
            float(ctx, victim.x, victim.y - 24, '8 🔥', '#ff8844', 11);
          });
          continue;
        }
        MagicFx.drawSummonBolt(bg, ctx.tint, 'fire', b.x, b.y, Math.atan2(b.vy, b.vx), elapsed / 1000);
      }
    });

    ctx.at(300, () => { st.open = true; readout.setText('holding Q — one wedge per base element'); });
    ctx.at(1200, () => { st.selected = 4; });
    ctx.at(1700, () => { st.selected = 0; readout.setText('← / → across the five'); });
    ctx.at(2300, () => { st.open = false; av.play('raise', ctx.aim); readout.setText('released — 2s to aim'); });
    aimCountdown(ctx, at, 2300, () => {
      ctx.capture(() => {
        fx.conjure(at.x + 54, at.y, 46, 460, { color: MAGIC.orchid });
        fx.ring(at.x + 54, at.y, 8, 60, MAGIC.orchid, 560, 8, 3);
        float(ctx, at.x, at.y - 34, '🔥 SUMMON', '#ff8844', 13);
      });
      fams.push({ kind: 'fire', x: at.x + 54, y: at.y, bob: 0, seed: 2.1, plus: false, hp: 1 });
      readout.setText('🔥 45 HP, 18 seconds — it hangs off you and drifts at whoever you fight');
    });
    for (const d of [5600, 6900, 8200, 9500]) {
      ctx.at(d, () => {
        const f = fams[0];
        if (!f) return;
        const a = Math.atan2(victim.y - f.y, victim.x - f.x);
        bolts.push({ x: f.x, y: f.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340 });
      });
    }
    ctx.at(6000, () => readout.setText('a fire bolt every 1.3s: 8 damage and a 2s burn'));
    ctx.at(9000, () => readout.setText('hostile shots hit it for full — a familiar is a body, not a decoration'));
  },
};

export const necronomiconUpgraded: PreviewScript = {
  duration: 14000,
  scale: 0.78,
  bodyTexture: '',
  caption: 'Greater Summons — the hub button blackens the wheel; every corrupted summon is +50 Darkness',
  run(ctx) {
    const at = { x: ctx.w * 0.24, y: ctx.h * 0.58 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: ctx.w * 0.70, y: ctx.h * 0.40 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 4, dark: false };
    wheelLayer(ctx, at,
      { labels: NECRO_LABELS, colors: NECRO_COLORS },
      { labels: DARK_NECRO_LABELS, colors: DARK_NECRO_COLORS }, st);
    let darkness = 0;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc66ff', 13);
    const fams: Fam[] = [];
    famLayer(ctx, fams, victim);
    const cracks: { x: number; y: number; born: number; seed: number }[] = [];
    const cg = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      cg.clear();
      for (const c of cracks) {
        MagicFx.drawGroundCrack(cg, ctx.tint, c.x, c.y, 34, c.seed, elapsed / 1000,
          Phaser.Math.Clamp((elapsed - c.born - 800) / 500, 0, 1), 1);
      }
    });

    ctx.at(300, () => { st.open = true; readout.setText('the hub button only exists with Q+'); });
    ctx.at(1300, () => {
      st.dark = true;
      ctx.capture(() => fx.ring(at.x, at.y, 6, 44, MAGIC.magenta, 400, 33, 2.4));
      ctx.capture(() => float(ctx, at.x, at.y - 44, '🖤 DARK MAGIC ON', '#cc44ff', 12));
      readout.setText('toggled — and the plain five are still one click away');
    });
    ctx.at(2300, () => { st.open = false; av.play('raise', ctx.aim); readout.setText('released — 2s to aim'); });
    aimCountdown(ctx, at, 2300, () => {
      darkness += 50;
      ctx.capture(() => {
        fx.conjure(at.x + 54, at.y, 46, 460, { color: MAGIC.orchid });
        fx.ring(at.x + 54, at.y, 8, 60, MAGIC.magenta, 560, 8, 3);
        float(ctx, at.x, at.y - 34, '🪨 GREATER SUMMON', '#cc9944', 13);
        float(ctx, at.x, at.y - 52, '+50 ☠', '#880088', 12);
      });
      fams.push({ kind: 'earth', x: at.x + 54, y: at.y, bob: 0, seed: 5.5, plus: true, hp: 1 });
      readout.setText('🪨 112 HP, a rune halo — and a signature move on a 9 second clock');
    });
    ctx.at(6600, () => {
      for (let i = 0; i < 5; i++) {
        cracks.push({
          x: ctx.w * (0.32 + 0.13 * i), y: ctx.h * (0.3 + 0.42 * ((i * 7) % 3) / 2),
          born: 6600, seed: Math.random() * 10,
        });
      }
      ctx.capture(() => float(ctx, ctx.w * 0.5, 40, '🪨 THE FLOOR OPENS', '#cc9944', 13));
      readout.setText('five holes for 9 seconds — and they do not care whose side you are on');
    });
    ctx.at(9200, () => {
      const c = cracks[2];
      if (!c) return;
      victim.x = c.x; victim.y = c.y;
      ctx.capture(() => {
        fx.boom(c.x, c.y, 54, { color: MAGIC.ash, sigils: 8, rings: 2, duration: 460, mark: false });
        float(ctx, c.x, c.y - 30, '🪨 FELL IN — 20', '#cc9944', 13);
      });
      readout.setText('20 damage, a second underground, then back at the centre of the arena');
    });
    ctx.at(10400, () => {
      victim.x = ctx.w * 0.5; victim.y = ctx.h * 0.5;
      ctx.capture(() => {
        fx.boom(victim.x, victim.y, 60, { color: MAGIC.stone, sigils: 8, rings: 2, duration: 440 });
        float(ctx, victim.x, victim.y - 34, '🪨 back up', '#cc9944', 12);
      });
    });
    ctx.at(12200, () => readout.setText('Levitate is the only thing that keeps the conjurer out of their own holes'));
  },
};
// ══ Passives ══════════════════════════════════════════════════════════

export const passiveTheSpellWheel: PreviewScript = {
  duration: 10000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'The wheel commits on release, then the spell gathers for 2s and lands on the live cursor',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const cursor = { x: at.x + 240, y: at.y - 60 };
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS }, null, st);
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc99ff', 13);
    // A pointer mark, so "it lands where the cursor is at zero" is something you can watch.
    const cg = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    ctx.onFrame(() => {
      cg.clear();
      cg.lineStyle(1.6, 0xffffff, 0.7);
      cg.strokeCircle(cursor.x, cursor.y, 7);
      cg.lineBetween(cursor.x - 12, cursor.y, cursor.x + 12, cursor.y);
      cg.lineBetween(cursor.x, cursor.y - 12, cursor.x, cursor.y + 12);
    });

    ctx.at(300, () => { st.open = true; readout.setText('hold E — the ring follows you'); });
    for (let i = 1; i <= 4; i++) ctx.at(600 + i * 340, () => { st.selected = i; readout.setText('→ steps across the wedges'); });
    ctx.at(2300, () => { st.selected = 3; });
    ctx.at(2800, () => {
      st.open = false;
      av.play('sweep', ctx.aim);
      readout.setText('released — committed, but nothing has happened yet');
    });
    // The cursor keeps moving during the count; that is the whole point of the count.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 2800 || elapsed > 4800) return;
      cursor.x = at.x + 240 + Math.cos(elapsed / 300) * 90;
      cursor.y = at.y - 60 + Math.sin(elapsed / 260) * 50;
    });
    aimCountdown(ctx, at, 2800, () => {
      fx.gust(at.x, at.y, Math.atan2(cursor.y - at.y, cursor.x - at.x), 150, Math.PI / 4, { color: MAGIC.gust, duration: 480 });
      fx.boom(cursor.x, cursor.y, 90, { color: MAGIC.gust, sigils: 9, rings: 2, duration: 420, mark: false });
      ctx.capture(() => float(ctx, cursor.x, cursor.y - 28, '💨 BLAST!', '#bbbbbb', 12));
      readout.setText('landed on the cursor, 2s after the key came up');
    });
    ctx.at(6400, () => {
      readout.setText('a tap under 150ms skips the wheel and re-casts the same wedge');
      av.play('sweep', ctx.aim);
    });
    aimCountdown(ctx, at, 6500, () => {
      fx.boom(cursor.x, cursor.y, 90, { color: MAGIC.gust, sigils: 9, rings: 2, duration: 420, mark: false });
      ctx.capture(() => float(ctx, cursor.x, cursor.y - 28, '💨 BLAST!', '#bbbbbb', 12));
    });
  },
};

export const passiveDarkness: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Darkness — 25 a dark Grimoire spell, 50 a dark ultimate, and 100 is not a debuff',
  run(ctx) {
    const at = { x: ctx.w * 0.5, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    let darkness = 0;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc66ff', 11);

    const charge = (delay: number, amount: number, what: string): void => ctx.at(delay, () => {
      const before = darkness;
      darkness = Math.min(100, darkness + amount);
      av.play('sweep', ctx.aim);
      ctx.capture(() => {
        fx.motes(at.x, at.y + 12, 5 + Math.round(amount / 8), {
          speed: 50, size: 2.4, life: 700, color: MAGIC.magenta, drift: -34,
        });
        float(ctx, at.x, at.y - 44, `+${amount} ☠`, '#880088', 12);
      });
      readout.setText(`${what} — ${darkness}/100`);
      if (before < 75 && darkness >= 75) {
        ctx.capture(() => fx.ring(at.x, at.y, 14, 120, MAGIC.magenta, 700, 8, 3));
        ctx.capture(() => float(ctx, at.x, at.y - 62, 'three-quarters gone', '#ff4444', 11));
      }
      if (darkness >= 100) {
        ctx.capture(() => {
          fx.boom(at.x, at.y, 110, { color: MAGIC.magenta, sigils: 16, rings: 3, duration: 800 });
          float(ctx, at.x, at.y - 28, '☠ Consumed by Darkness!', '#220022', 12);
        });
        readout.setText('your remaining health, all of it, at once');
      }
    });

    charge(700, 25, 'dark Grimoire spell');
    charge(2600, 25, 'dark Grimoire spell');
    charge(4400, 25, 'dark Grimoire spell');
    charge(6200, 50, 'dark ultimate');
    ctx.at(8200, () => readout.setText('nothing decays it — only F+ corrupted data takes any back off'));
  },
};

// ══ Perks ═════════════════════════════════════════════════════════════

export const perkThunder: PreviewScript = {
  duration: 10000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Thunder — the first press only arms; the second casts the same wedge with lightning in it',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 120, y: at.y };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS }, null, st);
    const clouds: Cloud[] = [];
    flameLayer(ctx, clouds);
    // Six clouds over the same ground is two ticks a beat instead of one.
    cloudTicks(ctx, clouds, victim, 250, '2 + 2', '#ffaa44');
    const readout = label(ctx, ctx.w * 0.5, 14, '#ffee44', 13);

    ctx.at(500, () => {
      av.play('raise');
      fx.bolt(at.x, at.y, 120, 12, MAGIC.thunder);
      fx.ring(at.x, at.y, 10, 64, MAGIC.thunder, 520, 8, 3);
      fx.motes(at.x, at.y, 8, { speed: 90, size: 2.4, life: 620, color: MAGIC.thunderHi });
      float(ctx, at.x, at.y - 44, '⚡ LIGHTNING CALL', '#ffee44', 12);
      readout.setText('no spell — and the full 5s cooldown is stamped anyway');
    });
    ctx.at(2600, () => { st.open = true; readout.setText('the next press opens the wheel, charged'); });
    ctx.at(3400, () => { st.open = false; av.play('sweep', ctx.aim); });
    aimCountdown(ctx, at, 3400, () => {
      fx.ring(at.x, at.y, 8, 54, MAGIC.ember, 420, 9, 2.6);
      // A charged Flare is the spell cast twice in the same instant — two orbs, not one.
      for (const pass of [0, 1]) {
        for (const deg of [-25, 0, 25]) {
          const a = Phaser.Math.DegToRad(deg + (pass ? 4 : -4));
          clouds.push({
            seed: Math.random() * 10, x: at.x, y: at.y,
            vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
            radius: 35, born: 5400, life: 3000, cursed: false,
          });
        }
      }
      float(ctx, at.x, at.y - 38, '⚡ CHARGED!', '#ffee44', 12);
      readout.setText('🔥 Flare cast twice — two orbs crawling down the same line');
    });
    ctx.at(8600, () => readout.setText('Splash doubles and widens, Spur throws a second volley, Gust stuns, Ward gains two stones'));
  },
};

export const perkDecay: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Decay — a press on a cooling book resets it: 25 ☠ for the Grimoire, 99 for the Necronomicon',
  run(ctx) {
    const at = { x: ctx.w * 0.5, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    let darkness = 0;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc66ff', 11);
    // A cooldown pip, because the whole perk is about pressing a key that would have been refused.
    const pip = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    const cools = { e: 1, q: 1 };
    ctx.onFrame(() => {
      pip.clear();
      const draw = (x: number, r: number, col: number): void => {
        pip.fillStyle(0x111122, 0.9); pip.fillRect(x, 16, 34, 8);
        pip.fillStyle(col, 0.9); pip.fillRect(x, 16, 34 * (1 - r), 8);
        pip.lineStyle(1, 0x554466, 1); pip.strokeRect(x, 16, 34, 8);
      };
      draw(ctx.w * 0.5 - 44, cools.e, 0x9944ff);
      draw(ctx.w * 0.5 + 10, cools.q, 0xcc44ff);
    });

    ctx.at(400, () => { readout.setText('both books cooling — normally these presses do nothing'); });
    ctx.at(1400, () => {
      cools.e = 0;
      darkness += 25;
      av.play('sweep');
      fx.ring(at.x, at.y, 10, 66, MAGIC.magenta, 460, 5, 6);
      fx.motes(at.x, at.y + 10, 8, { speed: 70, size: 2.8, life: 640, color: MAGIC.magenta, drift: -30 });
      float(ctx, at.x, at.y - 62, '📖 DECAY — READY', '#cc66ff', 12);
      readout.setText('Grimoire reset for 25 ☠ — the press itself does not cast');
    });
    ctx.at(4000, () => {
      cools.q = 0;
      const before = darkness;
      darkness = Math.min(100, darkness + 99);
      av.play('raise');
      fx.ring(at.x, at.y, 10, 66, MAGIC.magenta, 460, 5, 6);
      float(ctx, at.x, at.y - 62, '💀 DECAY — READY', '#cc66ff', 12);
      if (before < 75) ctx.capture(() => fx.ring(at.x, at.y, 14, 120, MAGIC.magenta, 700, 8, 3));
      readout.setText('Necronomicon reset for 99 ☠ — there is no affordability check');
    });
    ctx.at(4700, () => {
      fx.boom(at.x, at.y, 110, { color: MAGIC.magenta, sigils: 16, rings: 3, duration: 800 });
      float(ctx, at.x, at.y - 28, '☠ Consumed by Darkness!', '#220022', 12);
      readout.setText('from 25 ☠, the second reset is a death sentence');
    });
    ctx.at(6800, () => readout.setText('clean at 0, it is 99 — one point of room, and no way back without F+'));
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryLevitate: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Levitate — anything that has sat still for 3s cannot touch you; anything moving still can',
  run(ctx) {
    const at = { x: ctx.w * 0.34, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    av.setMastered(true);
    const shooter = { x: ctx.w * 0.84, y: ctx.cy };
    dummyAt(ctx, shooter);
    // A cloud parked on the floor, and a clock on how long it has been parked.
    const cloud = { seed: 3.2, x: at.x, y: at.y + 6 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      MagicFx.drawStormCloud(g, ctx.tint, cloud.x, cloud.y, 42, false,
        Phaser.Math.Clamp((elapsed % 3000) / 3000, 0, 1), cloud.seed, elapsed / 1000, 0.85);
    });
    const readout = label(ctx, ctx.w * 0.5, 12, '#ccddff', 11);

    ctx.at(300, () => {
      fx.ring(at.x, at.y, 8, 46, MAGIC.orchid, 520, 8, 2.4);
      readout.setText('standing in a hazard that has not moved in 3 seconds');
    });
    for (const d of [1400, 2600, 3800]) {
      ctx.at(d, () => {
        ctx.capture(() => {
          fx.motes(at.x, at.y + 14, 3, { speed: 30, size: 2.2, life: 520, color: MAGIC.lilac, drift: -20 });
          float(ctx, at.x, at.y - 30, '🪶 IMMUNE', '#ccddff', 12);
        });
      });
    }
    ctx.at(5000, () => {
      readout.setText('but a shot is moving, so a shot lands');
      ctx.fly({
        texture: 'proj-thorn-vine', from: { x: shooter.x, y: shooter.y }, to: { x: at.x, y: at.y }, speed: 650,
        onHit: () => ctx.capture(() => {
          fx.flash(at.x, at.y, 22, 10, MAGIC.vine);
          float(ctx, at.x, at.y - 26, 'HIT', '#ff6666', 13);
        }),
      });
    });
    ctx.at(6600, () => readout.setText('no key, no cooldown — it is on for as long as mastery is'));
  },
};

export const masteryTransmogrify: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Transmogrify — a 130 px/s bolt; on a hit they are a chicken for 8s and cannot cast at all',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const victim = { x: ctx.tx, y: ctx.ty, hidden: false };
    dummyAt(ctx, victim);
    const bolt = { x: ctx.cx, y: ctx.cy, live: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffdd44', 11);
    let chicken: Phaser.GameObjects.Image | null = null;
    const wander = { angle: 0, next: 0 };

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (bolt.live) {
        bolt.x += 130 * (dt / 1000);
        MagicFx.drawChickenBolt(g, ctx.tint, bolt.x, bolt.y, 0, elapsed / 1000);
        if (Phaser.Math.Distance.Between(bolt.x, bolt.y, victim.x, victim.y) <= 22) {
          bolt.live = false;
          victim.hidden = true;
          ctx.capture(() => {
            fx.flash(victim.x, victim.y, 30, 11, MAGIC.gold);
            fx.ring(victim.x, victim.y, 46, 8, MAGIC.gold, 460, 9, 3);
            fx.sigils(victim.x, victim.y, 9, { speed: 170, size: 8, life: 560, color: MAGIC.white });
            float(ctx, victim.x, victim.y - 30, '🐔 CHICKEN!', '#ffffff', 13);
            chicken = ctx.scene.add.image(victim.x, victim.y, 'fx-chicken').setDepth(5);
            return chicken;
          });
          readout.setText('8 seconds: no abilities at all, and cooldowns run at half length');
        }
      }
      if (chicken) {
        if (elapsed >= wander.next) {
          wander.angle = Math.random() * Math.PI * 2;
          wander.next = elapsed + Phaser.Math.Between(400, 900);
        }
        victim.x += Math.cos(wander.angle) * 130 * (dt / 1000);
        victim.y += Math.sin(wander.angle) * 130 * (dt / 1000);
        victim.x = Phaser.Math.Clamp(victim.x, ctx.w * 0.45, ctx.w - 24);
        victim.y = Phaser.Math.Clamp(victim.y, 30, ctx.h - 30);
        chicken.setPosition(victim.x, victim.y);
      }
    });

    ctx.at(500, () => {
      av.play('punch', ctx.aim);
      fx.ring(ctx.cx, ctx.cy, 6, 40, MAGIC.gold, 400, 9, 2.4);
      float(ctx, ctx.cx, ctx.cy - 30, '🐔 Transmogrify!', '#ffffff', 12);
      bolt.x = ctx.cx; bolt.y = ctx.cy; bolt.live = true;
      readout.setText('130 px/s — slower than a walk, and the easiest thing here to dodge');
    });
    ctx.at(6200, () => readout.setText('bound over E, R, F or Q — that slot loses its spell for the match'));
  },
};
