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
 * Almost nothing in this element is a sprite: clouds, funnels, orbiting stone, sparkles, heal
 * orbs, prison chains and the lifesteal thread are all plain data repainted every frame into two
 * Graphics layers. So these loops keep their own little arrays and call exactly the painters the
 * kit calls — `MagicFx.drawFlameCloud`, `drawStormCloud`, `drawSparkle`, `drawHealOrb`,
 * `drawAnchor`, `drawPrisonChain`, `drawLifeLink`, `drawChickenBolt`, `runeOrb` and `vineLash` —
 * plus `MagicFx.drawWheel`, which was pulled out of the kit so the showcase can open the same
 * five-wedge ring the arena does.
 *
 * The two thrown vines are real projectile sprites (`proj-thorn-vine`, `proj-thorn-vine-dark`),
 * so those fly through `ctx.fly` at their real px/s. The Sparkle Shot's sprite is deliberately
 * invisible in the arena — the kit paints the star — so it is mirrored, not flown.
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
 * Flame Burst's clouds decelerate at 0.93 a frame from 250, so they travel about 60px and no
 * further — a loop that printed a figure over a distant dummy would be documenting a reach the
 * ability does not have.
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

// ══ E — Grimoire ══════════════════════════════════════════════════════

export const grimoire: PreviewScript = {
  duration: 12000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'E — hold for the wheel, release, aim for 2s; a sub-150ms tap re-casts your last pick',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    // Close in: Flame Burst's clouds coast about 60px before they stop, and the loop should not
    // imply otherwise.
    const victim = { x: at.x + 120, y: at.y };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS }, null, st);
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc99ff', 13);
    const clouds: Cloud[] = [];
    flameLayer(ctx, clouds);
    cloudTicks(ctx, clouds, victim, 250, '2', '#ffaa44');
    const orbs: Orb[] = [];
    orbitLayer(ctx, at, orbs, 56);

    ctx.at(300, () => { st.open = true; readout.setText('holding E — five wedges'); });
    ctx.at(1000, () => { st.selected = 1; });
    ctx.at(1500, () => { st.selected = 0; readout.setText('← / → across the wedges'); });
    ctx.at(2100, () => {
      st.open = false;
      av.play('sweep', ctx.aim);
      readout.setText('released — 2s to aim');
    });
    aimCountdown(ctx, at, 2100, () => {
      // Flame Burst: three clouds at −25°, 0° and +25°, coasting out at 250 and slowing to a stop.
      fx.ring(at.x, at.y, 8, 54, MAGIC.ember, 420, 9, 2.6);
      for (const deg of [-25, 0, 25]) {
        const a = Phaser.Math.DegToRad(deg);
        clouds.push({
          seed: Math.random() * 10, x: at.x, y: at.y,
          vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
          radius: 35, born: 4100, life: 3000, cursed: false,
        });
      }
      readout.setText('🔥 Flame Burst — 2 damage every 0.25s, 3s of cloud');
    });

    // Then the repeat trick: a tap too short to open the wheel re-fires the last pick.
    ctx.at(7600, () => {
      st.selected = 4;
      readout.setText('tap E under 150ms — no wheel, last pick again');
      av.play('sweep', ctx.aim);
    });
    aimCountdown(ctx, at, 7700, () => {
      fx.ring(at.x, at.y, 8, 68, MAGIC.stone, 520, 8, 2.6);
      for (let i = 0; i < 3; i++) {
        orbs.push({ angle: (i / 3) * Math.PI * 2, radius: 9, cracked: false, dead: false });
        ctx.capture(() => fx.sigils(
          at.x + Math.cos((i / 3) * Math.PI * 2) * 56, at.y + Math.sin((i / 3) * Math.PI * 2) * 56,
          3, { speed: 70, size: 6, life: 400, color: MAGIC.sand, points: 4 },
        ));
      }
      ctx.capture(() => float(ctx, at.x, at.y - 30, '🪨 Gaia\'s Guidance', '#aa7733', 12));
      readout.setText('🪨 3 stones, 10 damage a contact, 5s');
    });
  },
};

export const grimoireUpgraded: PreviewScript = {
  duration: 12000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Dark Grimoire — the hub button blackens all five wedges; every dark cast is +25 Darkness',
  run(ctx) {
    const at = { x: ctx.w * 0.30, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const cursor = { x: at.x + 250, y: at.y - 30 };
    const victim = { x: at.x + 250, y: at.y - 10 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at,
      { labels: GRIMOIRE_LABELS, colors: GRIMOIRE_COLORS },
      { labels: DARK_GRIMOIRE_LABELS, colors: DARK_GRIMOIRE_COLORS }, st);
    let darkness = 0;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 14, '#cc66ff', 13);
    const clouds: Cloud[] = [];
    flameLayer(ctx, clouds);
    cloudTicks(ctx, clouds, victim, 500, '4', '#ff5500');

    ctx.at(300, () => { st.open = true; readout.setText('the hub button only exists with E+'); });
    ctx.at(1400, () => {
      st.dark = true;
      ctx.capture(() => fx.ring(at.x, at.y, 6, 34, MAGIC.magenta, 400, 33, 2.4));
      readout.setText('toggled — all five wedges are black now');
    });
    ctx.at(2400, () => {
      st.open = false;
      av.play('sweep', ctx.aim);
      readout.setText('released — 2s to aim');
    });
    aimCountdown(ctx, at, 2400, () => {
      darkness += 25;
      fx.ring(at.x, at.y, 8, 70, MAGIC.corrupt, 520, 9, 3);
      clouds.push({
        seed: Math.random() * 10, x: at.x, y: at.y, vx: 0, vy: 0,
        radius: 70, born: 4400, life: 5000, cursed: true, follow: cursor,
      });
      ctx.capture(() => float(ctx, at.x, at.y - 34, '🔥 Corrupt Flames', '#ff4400', 12));
      ctx.capture(() => float(ctx, at.x, at.y - 50, '+25 ☠', '#880088', 12));
      readout.setText('🖤 70px cloud chasing your cursor for 5s');
    });
    // It follows the pointer, so the loop walks the pointer.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 4400) return;
      cursor.x = at.x + 250 + Math.cos(elapsed / 700) * 120;
      cursor.y = at.y - 30 + Math.sin(elapsed / 500) * 46;
    });
    for (const d of [5400, 7400]) {
      ctx.at(d, () => {
        if (!clouds.length) return;
        ctx.capture(() => float(ctx, victim.x + 30, victim.y - 42, '🔥 burn + cursed 2', '#882200', 9));
      });
    }
    ctx.at(10200, () => readout.setText('four of these with no meditation is 100 ☠ — a death'));
  },
};

// ══ R — Magic Anchor ══════════════════════════════════════════════════

/** Both anchor loops plant, walk away and recall; R+ adds the speed windows and the wild jump. */
function anchorScript(wild: boolean): PreviewScript {
  return {
    duration: wild ? 10000 : 8000,
    scale: 0.62,
    bodyTexture: '',
    caption: wild
      ? 'Wild Anchor — +25% for 3s on a clean recall, or press R again within 1.5s for a blind jump at +50%'
      : 'R — plant the mark, walk anywhere, come back for 20 damage in 120px',
    run(ctx) {
      const at = { x: ctx.w * 0.24, y: ctx.cy };
      const { fx, av } = drivenCaster(ctx, at);
      const mark = { x: at.x, y: at.y, live: false };
      const victim = { x: at.x + 70, y: at.y + 30 };
      dummyAt(ctx, victim);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
      ctx.onFrame((_dt, elapsed) => {
        g.clear();
        if (mark.live) MagicFx.drawAnchor(g, ctx.tint, mark.x, mark.y, elapsed / 1000);
      });
      const readout = label(ctx, ctx.w * 0.5, 12, '#bb88ff', 11);
      let boost = 0;      // 0 none, 1.25 pink, 1.5 black
      let boostUntil = -1;
      let darkness = 0;
      if (wild) {
        darknessBar(ctx, at, () => darkness);
        aura(ctx, 'boost', at, 26, () => ({
          on: boostUntil > 0, intensity: boost > 1.3 ? 1 : 0,
        }));
      }

      ctx.at(400, () => {
        av.play('slam');
        mark.live = true;
        fx.ring(at.x, at.y, 4, 26, MAGIC.orchid, 460, 8, 2.4);
        fx.motes(at.x, at.y, 6, { speed: 50, size: 2.2, life: 560 });
        readout.setText('mark planted — no cooldown for this half');
      });
      // Walk off, then come back through the floor.
      ctx.onFrame((dt, elapsed) => {
        if (elapsed > 700 && elapsed < 3200) at.x += 150 * (dt / 1000);
        if (boostUntil > 0 && elapsed > boostUntil) { boostUntil = -1; boost = 0; }
        if (boostUntil > 0) at.x += 80 * boost * (dt / 1000);
      });
      ctx.at(3400, () => {
        av.play('slam');
        fx.sigils(at.x, at.y, 6, { speed: 130, size: 7, life: 420, color: MAGIC.purple });
        at.x = mark.x; at.y = mark.y;
        mark.live = false;
        fx.boom(mark.x, mark.y, 120, { color: MAGIC.purple, sigils: 12, rings: 3, duration: 560 });
        float(ctx, mark.x, mark.y - 30, '⚓ RECALL', '#bb88ff', 12);
        float(ctx, victim.x, victim.y - 26, '20', '#bb88ff', 15);
        readout.setText(wild ? '+25% speed for 3s — and 1.5s to re-press R' : '20 damage to everything within 120px');
        if (wild) { boost = 1.25; boostUntil = 6400; }
      });
      if (wild) {
        ctx.at(4600, () => {
          darkness += 10;
          fx.boom(at.x, at.y, 60, { color: MAGIC.wildVoid, sigils: 8, rings: 2, mark: false });
          at.x = ctx.w * 0.72; at.y = ctx.cy - 40;
          fx.boom(at.x, at.y, 76, { color: MAGIC.magenta, sigils: 10, rings: 2, duration: 520 });
          float(ctx, at.x, at.y - 30, '🌑 WILD ANCHOR!', '#9900cc', 12);
          float(ctx, at.x, at.y - 48, '+10 ☠', '#880088', 11);
          boost = 1.5; boostUntil = 7600;
          readout.setText('somewhere random, +50% for 3s, and 2s more cooldown');
        });
        ctx.at(8000, () => readout.setText('the blind jump deals nothing — it can land you next to them'));
      }
    },
  };
}

export const magicAnchor = anchorScript(false);
export const magicAnchorUpgraded = anchorScript(true);

// ══ F — Meditate ══════════════════════════════════════════════════════

interface HealOrb { x: number; y: number; vx: number; vy: number; dead: boolean }

function orbLayer(ctx: PreviewCtx, orbs: HealOrb[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const o of orbs) {
      if (o.dead) continue;
      o.x += o.vx * (dt / 1000); o.y += o.vy * (dt / 1000);
      MagicFx.drawHealOrb(g, ctx.tint, o.x, o.y, Math.atan2(o.vy, o.vx), elapsed / 1000);
    }
  });
}

/** An orb launched off a random edge of the box at the kit's own 200 px/s. */
function spawnOrb(ctx: PreviewCtx, orbs: HealOrb[], to: { x: number; y: number }): void {
  const edge = Math.floor(Math.random() * 4);
  const x = edge === 0 || edge === 1 ? Math.random() * ctx.w : edge === 2 ? 0 : ctx.w;
  const y = edge === 0 ? 0 : edge === 1 ? ctx.h : Math.random() * ctx.h;
  const a = Math.atan2(to.y - y, to.x - x);
  orbs.push({ x, y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dead: false });
}

export const meditate: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — an orb every 0.5s off the edges: 5 healed to you, 8 to anybody it clips on the way',
  run(ctx) {
    const at = { x: ctx.w * 0.5, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 150, y: at.y - 20 };
    dummyAt(ctx, victim);
    const orbs: HealOrb[] = [];
    orbLayer(ctx, orbs);
    let channelling = false;
    aura(ctx, 'meditate', at, 30, () => ({ on: channelling, intensity: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc99ff', 11);
    let healed = 0;

    ctx.at(300, () => {
      channelling = true;
      av.play('flex');
      av.setHold?.('brace', 0);
      fx.ring(at.x, at.y, 40, 8, MAGIC.orchid, 520, 8, 2.4);
      float(ctx, at.x, at.y - 34, '🧘 Meditate', '#cc99ff', 12);
      readout.setText('rooted — WASD does nothing while it runs');
    });
    for (let i = 0; i < 9; i++) ctx.at(600 + i * 500, () => { if (channelling) spawnOrb(ctx, orbs, at); });

    ctx.onFrame(() => {
      for (const o of orbs) {
        if (o.dead) continue;
        if (Phaser.Math.Distance.Between(o.x, o.y, victim.x, victim.y) <= 28) {
          o.dead = true;
          ctx.capture(() => {
            fx.ring(o.x, o.y, 4, 30, MAGIC.lilac, 300, 9, 2);
            float(ctx, victim.x, victim.y - 24, '8', '#cc99ff', 13);
          });
          continue;
        }
        if (Phaser.Math.Distance.Between(o.x, o.y, at.x, at.y) <= 24) {
          o.dead = true;
          healed += 5;
          ctx.capture(() => {
            fx.sigils(o.x, o.y, 4, { speed: 40, size: 5, life: 380, color: MAGIC.lilac });
            float(ctx, at.x, at.y - 28, '+5 ✨', '#cc99ff', 12);
          });
        }
      }
      readout.setText(channelling ? `channelling — ${healed} healed` : readout.text);
    });

    // And the way it ends, because nothing else ends it.
    ctx.at(6600, () => {
      channelling = false;
      av.setHold?.(null, 0);
      fx.boom(at.x, at.y, 56, { color: MAGIC.blood, sigils: 9, rings: 2, duration: 420, mark: false });
      float(ctx, at.x, at.y - 30, '⛔ Interrupted! -20', '#ff4444', 12);
      readout.setText('a hit ends it — and costs 20 on top of the hit');
    });
  },
};

export const meditateUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Wandering Mind — walk at 25% speed, nothing interrupts you, and each orb burns off 5 Darkness',
  run(ctx) {
    const at = { x: ctx.w * 0.22, y: ctx.cy };
    const { fx, av } = drivenCaster(ctx, at);
    const orbs: HealOrb[] = [];
    orbLayer(ctx, orbs);
    let channelling = false;
    let darkness = 45;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'meditate', at, 30, () => ({ on: channelling, intensity: 1 }));
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 12, '#cc99ff', 11);
    let nextTrail = 0;

    ctx.at(300, () => {
      channelling = true;
      av.play('flex');
      av.setHold?.('brace', 0);
      fx.ring(at.x, at.y, 40, 8, MAGIC.orchid, 520, 8, 2.4);
      readout.setText('moving at a quarter speed, uninterruptible');
    });
    ctx.onFrame((dt, elapsed) => {
      if (!channelling) return;
      at.x += 55 * (dt / 1000);
      if (elapsed >= nextTrail) {
        nextTrail = elapsed + 90;
        ctx.capture(() => fx.motes(at.x, at.y + 8, 2, {
          speed: 18, size: 2.6, life: 620, color: MAGIC.purple, drift: -6, depth: 4,
        }));
      }
      for (const o of orbs) {
        if (o.dead || Phaser.Math.Distance.Between(o.x, o.y, at.x, at.y) > 24) continue;
        o.dead = true;
        darkness = Math.max(0, darkness - 5);
        ctx.capture(() => {
          fx.sigils(o.x, o.y, 4, { speed: 40, size: 5, life: 380, color: MAGIC.lilac });
          float(ctx, at.x, at.y - 28, '+5 ✨', '#cc99ff', 12);
          float(ctx, at.x, at.y - 44, '-5 ☠', '#aa55ff', 11);
        });
      }
    });
    for (let i = 0; i < 12; i++) ctx.at(600 + i * 500, () => { if (channelling) spawnOrb(ctx, orbs, at); });
    ctx.at(7400, () => {
      channelling = false;
      av.setHold?.(null, 0);
      readout.setText('release F to stop — the only voluntary way out');
    });
  },
};

// ══ Q — Necronomicon ══════════════════════════════════════════════════

export const necronomicon: PreviewScript = {
  duration: 13000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Q — the same wheel, thirty seconds apart; Thorn Prison chains them to the spot for 5s',
  run(ctx) {
    const at = { x: ctx.w * 0.24, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 380, y: at.y };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at, { labels: NECRO_LABELS, colors: NECRO_COLORS }, null, st);
    const readout = label(ctx, ctx.w * 0.5, 14, '#88ff99', 13);
    const chains: number[] = [15, 15, 15, 15];
    let caged = false;
    const pad = 32;
    const corners: [number, number][] = [
      [pad, pad], [ctx.w - pad, pad], [pad, ctx.h - pad], [ctx.w - pad, ctx.h - pad],
    ];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!caged) return;
      for (let c = 0; c < 4; c++) {
        if (chains[c] <= 0) continue;
        MagicFx.drawPrisonChain(g, ctx.tint, corners[c][0], corners[c][1], victim.x, victim.y,
          Phaser.Math.Clamp(chains[c] / 15, 0, 1), elapsed / 1000);
      }
    });

    ctx.at(300, () => { st.open = true; readout.setText('holding Q — five ultimates'); });
    ctx.at(1100, () => { st.selected = 2; readout.setText('🌿 Thorn Prison'); });
    ctx.at(2000, () => { st.open = false; av.play('raise', ctx.aim); readout.setText('released — 2s to aim'); });
    aimCountdown(ctx, at, 2000, () => {
      fx.sigils(at.x, at.y, 5, { speed: 100, angle: ctx.aim, spread: 0.5, size: 7, life: 420, color: MAGIC.darkVine, points: 4 });
      // The heavy vine is a real projectile sprite, so it flies at its own 380 px/s.
      ctx.fly({
        texture: 'proj-thorn-vine-dark',
        from: { x: at.x, y: at.y }, to: { x: victim.x, y: victim.y }, speed: 380,
        onHit: () => {
          caged = true;
          ctx.capture(() => {
            fx.boom(victim.x, victim.y, 64, { color: MAGIC.vine, sigils: 9, rings: 2, duration: 480 });
            float(ctx, victim.x, victim.y - 28, '🌿 IMPRISONED', '#33ff66', 12);
          });
          readout.setText('pinned to the spot — 3 damage a second, 5s');
        },
      });
    });
    // Their own shots cut the chains, 15 HP each.
    for (let i = 0; i < 3; i++) {
      ctx.at(6200 + i * 800, () => {
        if (!caged) return;
        chains[i] = 0;
        ctx.capture(() => {
          fx.boom(corners[i][0], corners[i][1], 44, { color: MAGIC.vine, sigils: 6, rings: 1, duration: 380, mark: false });
          float(ctx, victim.x, victim.y - 24, '3', '#33ff66', 11);
        });
        readout.setText(`${3 - i} chains left — their own shots cut them, 15 HP each`);
      });
    }
    ctx.at(9200, () => {
      caged = false;
      chains[3] = 0;
      fx.boom(victim.x, victim.y, 78, { color: MAGIC.vine, sigils: 11, rings: 2, duration: 520 });
      float(ctx, victim.x, victim.y - 44, '🌿 FREED!', '#33ff66', 12);
      float(ctx, victim.x, victim.y - 24, '35', '#33ff66', 15);
      readout.setText('35 either way — breaking out buys time, not the hit');
    });
  },
};

export const necronomiconUpgraded: PreviewScript = {
  duration: 13000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Dark Necronomicon — Torture Trap threads them for 5s: 3/s, and everything they take heals you',
  run(ctx) {
    const at = { x: ctx.w * 0.24, y: ctx.h * 0.52 };
    const { fx, av } = drivenCaster(ctx, at);
    const victim = { x: at.x + 300, y: at.y - 20 };
    dummyAt(ctx, victim);
    const st: WheelState = { open: false, selected: 0, dark: false };
    wheelLayer(ctx, at,
      { labels: NECRO_LABELS, colors: NECRO_COLORS },
      { labels: DARK_NECRO_LABELS, colors: DARK_NECRO_COLORS }, st);
    let darkness = 20;
    darknessBar(ctx, at, () => darkness);
    aura(ctx, 'darkness', at, 28, () => ({ on: darkness > 1, intensity: darkness / 100 }));
    const readout = label(ctx, ctx.w * 0.5, 14, '#ff5566', 13);
    let linked = false;
    const lashes: { x1: number; y1: number; x2: number; y2: number; hit: boolean; until: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (let i = lashes.length - 1; i >= 0; i--) {
        const v = lashes[i];
        if (elapsed >= v.until) { lashes.splice(i, 1); continue; }
        vineLash(g, ctx.tint, v.x1, v.y1, v.x2, v.y2, elapsed / 1000,
          v.hit ? MAGIC.leaf : MAGIC.darkVine, MAGIC.vine,
          Phaser.Math.Clamp((v.until - elapsed) / 200, 0, 1), 4);
      }
      if (linked) MagicFx.drawLifeLink(g, ctx.tint, at.x, at.y, victim.x, victim.y, elapsed / 1000);
    });

    ctx.at(300, () => { st.open = true; readout.setText('holding Q'); });
    ctx.at(1100, () => { st.dark = true; readout.setText('hub button — the black five, at 50 ☠ each'); });
    ctx.at(1900, () => { st.selected = 2; });
    ctx.at(2500, () => { st.open = false; av.play('raise', ctx.aim); readout.setText('released — 2s to aim'); });
    aimCountdown(ctx, at, 2500, () => {
      darkness += 50;
      linked = true;
      lashes.push({ x1: at.x, y1: at.y, x2: victim.x, y2: victim.y, hit: true, until: 4800 });
      fx.boom(victim.x, victim.y, 50, { color: MAGIC.blood, sigils: 7, rings: 1, duration: 420, mark: false });
      ctx.capture(() => {
        float(ctx, victim.x, victim.y - 28, '🌿 LINKED', '#ff2222', 12);
        float(ctx, at.x, at.y - 50, '+50 ☠', '#880088', 12);
      });
      readout.setText('an instant 200px vine — no travel time to dodge');
    });
    for (let i = 1; i <= 5; i++) {
      ctx.at(4500 + i * 1000, () => {
        if (!linked) return;
        ctx.capture(() => {
          float(ctx, victim.x, victim.y - 24, '3', '#ff2222', 12);
          float(ctx, at.x, at.y - 28, '+3 ❤', '#44ff66', 11);
        });
        readout.setText('3 a second down the thread — and every point they take anywhere comes back to you');
      });
    }
    ctx.at(10000, () => { linked = false; readout.setText('5 seconds, then it lets go'); });
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
    charge(2600, 10, 'Wild Anchor blind jump');
    charge(4400, 25, 'dark Grimoire spell');
    charge(6200, 50, 'dark ultimate');
    ctx.at(8200, () => readout.setText('nothing decays it — only F+ meditation orbs take it back off'));
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
      // Charged Flame Burst is the spell cast twice in the same instant — six clouds, not three.
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
      readout.setText('🔥 Flame Burst cast twice — six clouds down the same lines');
    });
    ctx.at(8600, () => readout.setText('weather halves its pulse, vines stun, wind slows, stone gains an orb'));
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
