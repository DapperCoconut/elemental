import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ColiseumRing, FlamePillar, JUS, JusticeAvatar, JusticeFx, SeraphForm,
  barrageSpear, chainHead, chainRun, drawJudgeScene, impaleRig, judgeRig, padlock, spearShape,
  styleMeter, tranceBeams, wallSlab, willMeter,
} from '../../../elements/kits/JusticeVisuals';

/**
 * Justice's showcases.
 *
 * Only one thing Justice throws is a real sprite — the ground click's spear, on
 * `proj-justice-spear` — so that one is flown with `ctx.fly` at its real 620 px/s and
 * everything else mirrors the kit's own records and paints them with the kit's own painters:
 * `ColiseumRing`, `FlamePillar` and `SeraphForm` are the arena classes verbatim, and the
 * chain, the ripped wall, the trance beams, the scales and the Willpower meter all go through
 * the shared helpers in `JusticeVisuals`.
 *
 * Most of these loops move the caster — round a circle for Sheer Will's afterimage, through
 * their own Coliseum in flight, into the middle of the floor for the seraph — so they use the
 * `drivenCaster` pattern rather than the harness's pinned mark.
 */

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

function fxOf(ctx: PreviewCtx): JusticeFx {
  return ctx.capture(() => new JusticeFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** A neutral body, repainted from a live mark so it can be walked around. */
function dummyAt(ctx: PreviewCtx, at: Mark, depth = 5, alpha: () => number = () => 1): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    const a = alpha();
    g.clear();
    if (a <= 0.02) return;
    g.fillStyle(0x2b2f3d, a); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, a); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9 * a); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, a); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
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

/** The magistrate rig, or null when a skin has replaced the character. */
function magistrate(av: BaseAvatar): JusticeAvatar | null {
  return av instanceof JusticeAvatar ? av : null;
}

/**
 * The caster, positioned by the script rather than by the harness.
 *
 * The box pins the rig to its caster mark every frame, which is wrong for almost everything
 * Justice does — Sheer Will's afterimage needs the body to be moving, flight crosses its own
 * Coliseum, and the seraph teleports to the middle of the floor. A script that wants that sets
 * `bodyTexture: ''` (so the harness stages no body sprite of its own), stages one here, and
 * re-drives the rig from a frame hook, which runs after the harness's pass.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): BaseAvatar {
  if (ctx.scene.textures.exists('elem-justice')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-justice').setDepth(5));
    ctx.onFrame(() => {
      const s = read();
      body.setPosition(s.x, s.y).setAlpha(s.alpha);
    });
  }
  const av = ctx.useAvatar(() => new JusticeAvatar(ctx.scene, ctx.tint));
  ctx.onFrame((dt) => {
    const s = read();
    av.update(dt, s.x, s.y, s.alpha);
  });
  return av;
}

/** The kit's own Willpower meter, top-left of the box, driven from the script's own ledger. */
function willHud(ctx: PreviewCtx, read: () => { will: number; net: number }): void {
  const x = 16, y = 12, w = 190, h = 12;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
  const txt = ctx.adopt(ctx.scene.add.text(x, y + h + 8, '', {
    fontSize: '10px', fontFamily: 'Arial Black', color: '#a8ccff',
  }).setOrigin(0, 0.5).setDepth(23));
  ctx.onFrame(() => {
    const s = read();
    g.clear();
    willMeter(g, ctx.tint, x, y, w, h, Phaser.Math.Clamp(s.will / 100, 0, 1));
    txt.setText(`WILLPOWER ${Math.round(s.will)}   ${s.net >= 0 ? '+' : '−'}${Math.abs(s.net).toFixed(1)}/s`);
    txt.setColor(s.will < 25 ? '#ff8899' : '#a8ccff');
  });
}

// ══ GROUND · CLICK — Spear Thrust ═════════════════════════════════════

export const stab: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Click — 20 in a 60° wedge inside 96px, and a 15-damage spear at 620 px/s behind it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new JusticeAvatar(ctx.scene, ctx.tint));
    const near = { x: ctx.cx + 80, y: ctx.cy + 4 };
    const far = { x: ctx.cx + 330, y: ctx.cy - 6 };
    dummyAt(ctx, near);
    dummyAt(ctx, far);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0d68a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#c9a13a', 10);
    const tally = { dealt: 0 };

    // The wedge itself — 96px of reach, 30° either side of the aim.
    const wedge = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const aimAt = { a: 0 };
    ctx.onFrame((_d, elapsed) => {
      wedge.clear();
      wedge.fillStyle(ctx.tint(JUS.gold), 0.07 + 0.03 * Math.sin(elapsed / 260));
      wedge.beginPath();
      wedge.moveTo(ctx.cx, ctx.cy);
      wedge.arc(ctx.cx, ctx.cy, 96, aimAt.a - Math.PI / 6, aimAt.a + Math.PI / 6);
      wedge.closePath();
      wedge.fillPath();
      wedge.lineStyle(1, ctx.tint(JUS.gold), 0.3);
      wedge.beginPath();
      wedge.arc(ctx.cx, ctx.cy, 96, aimAt.a - Math.PI / 6, aimAt.a + Math.PI / 6);
      wedge.strokePath();
      gauge.setText(`${tally.dealt} damage dealt so far`);
    });

    const strike = (at: number, angle: number, connects: boolean): void => ctx.at(at, () => {
      aimAt.a = angle;
      av.play('punch', angle);
      ctx.capture(() => {
        fx.thrust(ctx.cx, ctx.cy, angle, 76);
        fx.motes(ctx.cx + Math.cos(angle) * 34, ctx.cy + Math.sin(angle) * 34, 4, 12, 420);
      });
      if (connects) {
        tally.dealt += 20;
        ctx.capture(() => fx.shards(near.x, near.y, 6, 130));
        float(ctx, near.x, near.y - 26, '20', '#ffb3aa', 15);
      }
      const to = connects ? far : { x: ctx.cx + Math.cos(angle) * 620, y: ctx.cy + Math.sin(angle) * 620 };
      ctx.fly({
        texture: 'proj-justice-spear',
        from: { x: ctx.cx + Math.cos(angle) * 30, y: ctx.cy + Math.sin(angle) * 30 },
        to,
        speed: 620,
        onHit: () => {
          if (!connects) return;
          tally.dealt += 15;
          ctx.capture(() => { fx.shards(far.x, far.y, 5, 120, 360); fx.flash(far.x, far.y, 20, 8); });
          float(ctx, far.x, far.y - 26, '15', '#ffb3aa', 13);
        },
      });
    });

    ctx.at(200, () => readout.setText('the thrust: 20 to every body in a 60° wedge inside 96px'));
    strike(700, 0, true);
    ctx.at(2400, () => readout.setText('and the spear keeps going — 15 at 620 px/s, on to the next body'));
    strike(4200, 0, true);
    ctx.at(6000, () => readout.setText('a body on the line inside 96px eats both halves off one press: 35'));
    ctx.at(7400, () => readout.setText('swing at nothing and the wedge still spends Sheer Will\'s +33% on nothing'));
    strike(8200, -0.85, false);
    ctx.at(9600, () => readout.setText('the thrown spear is a real projectile — anything that eats shots can eat this one'));
  },
};

// ══ GROUND · E — Coliseum ═════════════════════════════════════════════

export const coliseum: PreviewScript = {
  duration: 15000,
  scale: 0.64,
  bodyTexture: '',
  caption: 'E — 152px of marble for 8s. Everyone stays on the side they were on, and shots die on it.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.5 };
    drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const trapped = { x: me.x + 70, y: me.y + 34 };
    const shutOut = { x: ctx.w * 0.8, y: ctx.h * 0.5 };
    dummyAt(ctx, trapped);
    dummyAt(ctx, shutOut);
    const readout = label(ctx, ctx.w * 0.5, 14, '#e6e1d2', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#c9a13a', 10);

    const ring = ctx.capture(() => new ColiseumRing(ctx.scene, ctx.tint, 152, 18, 2));
    const st = { cast: -1, heldIn: 0, heldOut: 0 };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      // Both of them try to get where they want to be; the marble is what stops them.
      const push = (m: Mark, towardX: number, towardY: number): void => {
        const a = Math.atan2(towardY - m.y, towardX - m.x);
        m.x += Math.cos(a) * 190 * dt;
        m.y += Math.sin(a) * 190 * dt;
      };
      push(trapped, ctx.w + 200, me.y + 60);
      push(shutOut, me.x, me.y);

      if (st.cast < 0) { ring.update(delta, me.x, me.y, 0, 1); return; }
      const since = elapsed - st.cast;
      const rise = Math.min(1, since / 320);
      const fade = since > 9200 ? Math.min(1, (since - 9200) / 400) : 0;
      ring.update(delta, me.x, me.y, rise, fade);
      gauge.setText(since < 320
        ? 'rising — it starts holding people at 60% up, about 190ms'
        : `${Math.max(0, (9600 - since) / 1000).toFixed(1)}s of wall left`);
      if (rise < 0.6 || fade >= 1) return;

      // Insiders are held at 134px from the centre, outsiders at 170px. Velocity dies with it.
      const hold = (m: Mark, wasInside: boolean, at: number): number => {
        const d = Phaser.Math.Distance.Between(me.x, me.y, m.x, m.y);
        const ang = Math.atan2(m.y - me.y, m.x - me.x);
        if (wasInside && d > 152 - 18) {
          m.x = me.x + Math.cos(ang) * 134; m.y = me.y + Math.sin(ang) * 134;
          if (elapsed - at > 900) {
            float(ctx, m.x, m.y - 26, '🏛️ HELD IN', '#e6e1d2', 10);
            return elapsed;
          }
        } else if (!wasInside && d < 152 + 18) {
          m.x = me.x + Math.cos(ang) * 170; m.y = me.y + Math.sin(ang) * 170;
          if (elapsed - at > 900) {
            float(ctx, m.x, m.y - 26, '🏛️ SHUT OUT', '#e6e1d2', 10);
            return elapsed;
          }
        }
        return at;
      };
      st.heldIn = hold(trapped, true, st.heldIn);
      st.heldOut = hold(shutOut, false, st.heldOut);
    });

    ctx.at(600, () => {
      st.cast = 600;
      ctx.capture(() => {
        fx.ring(me.x, me.y, 20, 152, JUS.gold, 480, 6, 5);
        fx.rubble(me.x, me.y, 12, 30);
      });
      float(ctx, me.x, me.y - 44, '🏛️ COLISEUM', hex(JUS.bright), 13);
      readout.setText('eighteen columns, centred on where you were standing');
    });
    ctx.at(2400, () => readout.setText('who is in and who is out is decided at the cast, and never revisited'));
    ctx.at(5000, () => {
      // A shot from outside, dying on the marble rather than crossing it.
      const from = { x: shutOut.x + 40, y: shutOut.y - 8 };
      const ang = Math.atan2(me.y - from.y, me.x - from.x);
      const at = { x: me.x - Math.cos(ang) * 152 * -1, y: me.y - Math.sin(ang) * 152 * -1 };
      void at;
      const stop = { x: me.x + Math.cos(ang + Math.PI) * 152, y: me.y + Math.sin(ang + Math.PI) * 152 };
      ctx.fly({
        texture: 'proj-justice-spear', from, to: stop, speed: 620,
        onHit: () => {
          ctx.capture(() => { fx.shards(stop.x, stop.y, 4, 110, 380); fx.flash(stop.x, stop.y, 22, 8); });
          float(ctx, stop.x, stop.y - 28, '🏛️ BLOCKED', '#e6e1d2', 11);
        },
      });
      readout.setText('every shot that tries to cross shatters on it — in either direction, whoever fired it');
    });
    ctx.at(8000, () => readout.setText('on the ground you are inside your own cage too. Only flight passes through.'));
    ctx.at(11000, () => readout.setText('one ring a side: raising a second sinks the first within 120ms'));
  },
};

// ══ GROUND · R — Sheer Will ═══════════════════════════════════════════

export const sheerWill: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — +20% speed for 10 Willpower/s. Being hit buys 25% off and arms a +33% next hit.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.52, a: 0 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = magistrate(av);
    const foe = { x: ctx.w * 0.74, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 12, '#a8ccff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#2f7bff', 10);

    // The kit's own ledger: regen never stops, the drain is subtracted from it.
    const s = { on: false, will: 100, hurtUntil: -1, cutUntil: -1, righteous: false };
    willHud(ctx, () => ({
      will: s.will,
      net: (s.hurtUntil > 0 ? 6 : 5) - (s.on ? 10 : 0),
    }));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      if (s.hurtUntil > 0 && elapsed > s.hurtUntil) s.hurtUntil = -1;
      s.will = Phaser.Math.Clamp(
        s.will + ((s.hurtUntil > 0 ? 6 : 5) - (s.on ? 10 : 0)) * dt, 0, 100,
      );
      if (s.will <= 0 && s.on) {
        s.on = false;
        rig?.setWilling(false);
        float(ctx, me.x, me.y - 46, '💤 WILL SPENT', '#7788aa', 12);
      }
      // Circling, so the afterimage the rig draws under the body has something to trail.
      me.a += (s.on ? 1.2 : 1) * 1.5 * dt;
      me.x = ctx.w * 0.34 + Math.cos(me.a) * 62;
      me.y = ctx.h * 0.52 + Math.sin(me.a) * 26;
      gauge.setText(
        `${s.on ? 'burning' : 'idle'}   ·   speed ×${(s.on ? 1.2 : 1).toFixed(2)}`
        + `   ·   incoming ×${elapsed < s.cutUntil ? '0.75' : '1.00'}`
        + `   ·   next hit ×${s.righteous ? '1.33' : '1.00'}`,
      );
    });

    ctx.at(500, () => readout.setText('off: 5 Willpower a second coming in and nothing going out'));
    ctx.at(2600, () => {
      s.on = true;
      rig?.setWilling(true);
      ctx.capture(() => fx.ring(me.x, me.y, 10, 62, JUS.will, 420, 5, 6));
      float(ctx, me.x, me.y - 44, '💙 SHEER WILL', '#2f7bff', 13);
      readout.setText('on: +20% speed, a hard blue afterimage, and a net 5 a second off the bar');
    });
    ctx.at(5400, () => {
      // Being hit is what actually arms this ability.
      s.hurtUntil = 7400;
      s.cutUntil = 8400;
      s.righteous = true;
      ctx.capture(() => fx.ring(me.x, me.y, 14, 46, JUS.will, 340, 3, 6));
      float(ctx, me.x, me.y - 46, '−25% FOR 3s', hex(JUS.willPale), 12);
      readout.setText('a hit lands: 25% off everything for 3s, renewed by every further hit');
    });
    ctx.at(7000, () => {
      const ang = Math.atan2(foe.y - me.y, foe.x - me.x);
      av.play('punch', ang);
      ctx.capture(() => { fx.thrust(me.x, me.y, ang, 76); fx.shards(foe.x, foe.y, 6, 130); });
      float(ctx, me.x, me.y - 44, '⚖️ RIGHTEOUS +33%', '#a8ccff', 12);
      float(ctx, foe.x, foe.y - 26, '27', '#ffb3aa', 17);
      s.righteous = false;
      readout.setText('...and the same hit arms the next damage figure Justice deals: 20 becomes 27');
    });
    ctx.at(9200, () => readout.setText('it is spent once, by whatever lands next — a 6-point pillar tick will happily eat it'));
    ctx.at(11400, () => {
      s.on = false;
      rig?.setWilling(false);
      float(ctx, me.x, me.y - 40, 'Will released', '#a8ccff', 11);
      readout.setText('R again releases it for free. Regen never stopped, so nothing was ever really spent.');
    });
    ctx.at(13600, () => readout.setText('turn it on and never get hit and you have bought 20% speed and nothing else'));
  },
};

// ══ GROUND · F — Flight of the Valkyrie ═══════════════════════════════

export const flight: PreviewScript = {
  duration: 15000,
  scale: 0.7,
  bodyTexture: '',
  caption: 'F — wings out: +33% speed, +20% damage taken, and your own marble stops applying to you',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.52, dir: 1 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = magistrate(av);
    const foe = { x: ctx.w * 0.3 + 120, y: ctx.h * 0.52 + 30 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#fff3cf', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#a8ccff', 10);

    const centre = { x: ctx.w * 0.3, y: ctx.h * 0.52 };
    const ring = ctx.capture(() => new ColiseumRing(ctx.scene, ctx.tint, 152, 18, 2));
    const s = { flying: false, will: 100, ringUp: false };
    willHud(ctx, () => ({ will: s.will, net: 5 - (s.flying ? 2 : 0) }));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      s.will = Phaser.Math.Clamp(s.will + (5 - (s.flying ? 2 : 0)) * dt, 0, 100);
      ring.update(delta, centre.x, centre.y, s.ringUp ? 1 : 0, s.ringUp ? 0 : 1);

      // Both of them push outward; the wall lets exactly one of them through.
      const speed = 150 * (s.flying ? 1.33 : 1);
      me.x += speed * me.dir * dt;
      if (me.x > ctx.w * 0.86) me.dir = -1;
      if (me.x < ctx.w * 0.16) me.dir = 1;
      const fa = Math.atan2(me.y - foe.y, me.x - foe.x);
      foe.x += Math.cos(fa) * 150 * dt;
      foe.y += Math.sin(fa) * 150 * dt;

      if (s.ringUp) {
        const clamp = (m: Mark): void => {
          const d = Phaser.Math.Distance.Between(centre.x, centre.y, m.x, m.y);
          const ang = Math.atan2(m.y - centre.y, m.x - centre.x);
          if (d > 134) { m.x = centre.x + Math.cos(ang) * 134; m.y = centre.y + Math.sin(ang) * 134; }
        };
        clamp(foe);
        if (!s.flying) clamp(me);
      }
      gauge.setText(
        `${s.flying ? 'airborne' : 'on the floor'}   ·   speed ×${(s.flying ? 1.33 : 1).toFixed(2)}`
        + `   ·   damage taken ×${(s.flying ? 1.2 : 1).toFixed(2)}`
        + `   ·   ${s.flying ? '−2' : '−0'} Willpower/s`,
      );
    });

    ctx.at(500, () => {
      s.ringUp = true;
      ctx.capture(() => fx.ring(centre.x, centre.y, 20, 152, JUS.gold, 480, 6, 5));
      readout.setText('a Coliseum you raised, with both of you inside it');
    });
    ctx.at(3000, () => readout.setText('on the ground it holds you exactly as it holds them'));
    ctx.at(5200, () => {
      s.flying = true;
      rig?.setFlying(true);
      av.play('raise');
      ctx.capture(() => {
        fx.ring(me.x, me.y, 12, 74, JUS.pale, 460, 5, 6);
        fx.motes(me.x, me.y, 14, 40, 900);
      });
      float(ctx, me.x, me.y - 46, '🕊️ FLIGHT OF THE VALKYRIE', hex(JUS.pale), 12);
      readout.setText('wings out — and now the marble is only holding one of you');
    });
    ctx.at(8000, () => readout.setText('+33% speed and a net GAIN of 3 Willpower a second. Flying is not what empties the bar.'));
    ctx.at(10400, () => readout.setText('the price is +20% damage taken from everything, the whole time you are up'));
    ctx.at(12600, () => readout.setText('the tray becomes a different five: Spear of Heaven, Bind, Pillar, Descend, Seraphim'));
  },
};

// ══ GROUND · Q — Judgement Day ════════════════════════════════════════

export const judgementDay: PreviewScript = {
  duration: 17000,
  scale: 0.61,
  bodyTexture: '',
  caption: 'Q — the scales weigh YOUR record: 300+ taken is DAMNED, under 100 and they walk free',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.22, y: ctx.h * 0.62 };
    drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const victim = { x: ctx.w * 0.62, y: ctx.h * 0.62 };
    dummyAt(ctx, victim, 13);
    const readout = label(ctx, ctx.w * 0.5, 14, '#f0d68a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#e6e1d2', 10);

    const scene = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const chains = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    const st = {
      running: false, started: 0, damage: 0, verdict: '', color: '#88ffaa',
      bindUntil: -1, damned: false,
    };

    ctx.onFrame((_delta, elapsed) => {
      scene.clear();
      chains.clear();
      if (st.running) {
        const t = Phaser.Math.Clamp((elapsed - st.started) / 2600, 0, 1);
        const r = judgeRig({
          cx: ctx.w / 2, bottom: ctx.h - 18, t, guilt: Phaser.Math.Clamp(st.damage / 400, 0, 1),
        });
        drawJudgeScene(scene, ctx.tint, r, {
          width: ctx.w, height: ctx.h, top: 10, cx: ctx.w / 2,
          fade: t < 0.12 ? t / 0.12 : t > 0.9 ? (1 - t) / 0.1 : 1,
          placardColor: ctx.tint(st.damned ? JUS.damned : JUS.gold),
        });
        // The defendant sits in the left pan, read from the same rig the painter used.
        victim.x = r.seat.x; victim.y = r.seat.y;
        gauge.setText(`${st.damage} damage on the record — ${st.verdict}`);
        if (t >= 1) {
          st.running = false;
          float(ctx, ctx.w / 2, 74, `⚖️ ${st.verdict}`, st.color, 15);
          float(ctx, ctx.w / 2, 108, `${st.damage} damage on the record`, '#e6e1d2', 11);
          if (st.bindUntil > 0) {
            ctx.capture(() => fx.verdictBeam(victim.x, victim.y,
              st.damned ? JUS.damned : JUS.gold, ctx.h, 900, 11));
            float(ctx, victim.x, victim.y - 46, st.damned ? '⛓️ DAMNED' : '⛓️ SENTENCED', st.color, 12);
          }
        }
        return;
      }
      // The sentence: chains and a padlock, and a red ring if the verdict was damnation.
      if (st.bindUntil > elapsed) {
        for (let i = 0; i < 3; i++) {
          const yy = victim.y - 12 + i * 12;
          const sway = Math.sin(elapsed / 330 + i) * 3;
          chainRun(chains, ctx.tint, victim.x - 20 + sway, yy, victim.x + 20 + sway, yy, 0.95, 9, 2.1, 3);
        }
        padlock(chains, ctx.tint, victim.x, victim.y + 2, 7, 0.95);
        if (st.damned) {
          chains.lineStyle(2, ctx.tint(JUS.damned), 0.4 + 0.2 * Math.sin(elapsed / 140));
          chains.strokeCircle(victim.x, victim.y, 27);
        }
        gauge.setText(`disarmed for ${((st.bindUntil - elapsed) / 1000).toFixed(1)}s more`
          + (st.damned ? '   ·   and taking ×1.25 damage' : ''));
      } else if (st.bindUntil > 0) {
        st.bindUntil = -1;
        ctx.capture(() => fx.chainBurst(victim.x, victim.y));
        gauge.setText('the chains burst off');
      }
    });

    const trial = (
      at: number, damage: number, verdict: string, color: string, bindMs: number, damned: boolean,
    ): void => ctx.at(at, () => {
      st.running = true; st.started = at; st.damage = damage;
      st.verdict = verdict; st.color = color; st.damned = damned;
      st.bindUntil = bindMs > 0 ? at + 2600 + bindMs : -1;
      ctx.capture(() => fx.verdictBeam(me.x, me.y, JUS.gold, ctx.h, 700, 11));
      float(ctx, me.x, me.y - 52, '⚖️ JUDGEMENT DAY', hex(JUS.bright), 13);
    });

    ctx.at(300, () => readout.setText('an untouched Justice: 40 damage on the record'));
    trial(900, 40, 'NOT GUILTY', '#88ffaa', 0, false);
    ctx.at(4000, () => readout.setText('under 100 taken and they walk — the animation, the 30s cooldown, nothing else'));
    ctx.at(7000, () => readout.setText('the same button after three quarters of your health has been taken off you'));
    trial(7600, 340, 'DAMNED', '#ff3344', 4000, true);
    ctx.at(10600, () => readout.setText('300+ is DAMNED: 10 seconds disarmed, and ×1.25 damage taken for all of it'));
    ctx.at(13400, () => readout.setText('the chains take their hands, not their feet — a sentenced enemy can still chase you'));
    ctx.at(15400, () => readout.setText('200 is 8 seconds, 100 is 5. The tier is fixed at the cast.'));
  },
};

// ══ FLIGHT · CLICK — Spear of Heaven ══════════════════════════════════

export const spearThrow: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click (air) — 800 px/s, bursting for 20 inside 64px wherever it stops',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.24, y: ctx.h * 0.42 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    magistrate(av)?.setFlying(true);
    const foe = { x: ctx.w * 0.68, y: ctx.h * 0.62 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 12, '#fff3cf', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#c9a13a', 10);

    // The kit paints this one itself — no sprite in the world at all.
    const spears: { x: number; y: number; vx: number; vy: number; tx: number; ty: number; a: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((delta) => {
      const dt = delta / 1000;
      g.clear(); ring.clear();
      for (let i = spears.length - 1; i >= 0; i--) {
        const s = spears[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        const reached = Phaser.Math.Distance.Between(s.x, s.y, s.tx, s.ty) < 18;
        const struck = Phaser.Math.Distance.Between(s.x, s.y, foe.x, foe.y) < 24;
        const outside = s.x < 8 || s.x > ctx.w - 8 || s.y < 8 || s.y > ctx.h - 8;
        if (reached || struck || outside) {
          spears.splice(i, 1);
          const bx = s.x, by = s.y;
          ctx.capture(() => {
            fx.flash(bx, by, 64 * 0.7, 8);
            fx.ring(bx, by, 8, 64, JUS.bright, 400, 4, 6);
            fx.shards(bx, by, 9, 190, 460);
          });
          const caught = Phaser.Math.Distance.Between(bx, by, foe.x, foe.y) <= 64;
          if (caught) float(ctx, foe.x, foe.y - 28, '20', '#ffb3aa', 16);
          gauge.setText(caught
            ? `burst ${Math.round(Phaser.Math.Distance.Between(bx, by, foe.x, foe.y))}px away — inside 64, so it landed`
            : 'burst on empty ground — 64px, and nobody was in it');
          continue;
        }
        spearShape(g, ctx.tint, s.x - Math.cos(s.a) * 26, s.y - Math.sin(s.a) * 26, s.a, 34, 1, 1);
        g.fillStyle(ctx.tint(JUS.pale), 0.35);
        g.fillCircle(s.x - Math.cos(s.a) * 30, s.y - Math.sin(s.a) * 30, 4);
      }
    });

    const hurl = (at: number, tx: number, ty: number, note: string): void => ctx.at(at, () => {
      const a = Math.atan2(ty - me.y, tx - me.x);
      spears.push({
        x: me.x + Math.cos(a) * 26, y: me.y + Math.sin(a) * 26,
        vx: Math.cos(a) * 800, vy: Math.sin(a) * 800, tx, ty, a,
      });
      av.play('punch', a);
      ctx.capture(() => fx.motes(me.x + Math.cos(a) * 30, me.y + Math.sin(a) * 30, 5, 14, 400));
      readout.setText(note);
    });

    hurl(600, foe.x, foe.y, 'thrown at the cursor at 800 px/s — it bursts where it stops');
    hurl(3400, foe.x + 150, foe.y - 30, 'aimed past them: it still goes off on the first body inside 24px');
    hurl(6400, foe.x + 20, foe.y - 190, 'and on empty ground it is just a 64px circle where you put it');
    ctx.at(8600, () => readout.setText('the kit paints this one itself, so nothing that eats or reflects shots can touch it'));
  },
};

// ══ FLIGHT · E — Bind ═════════════════════════════════════════════════

export const bind: PreviewScript = {
  duration: 18000,
  scale: 0.58,
  bodyTexture: '',
  caption: 'E — a piercing chain, then E again to rip that wall out: 20 and a 2s stun on everybody',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.24, y: ctx.h * 0.5 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    magistrate(av)?.setFlying(true);
    const inLine = { x: ctx.w * 0.5, y: ctx.h * 0.5 };
    const far = { x: ctx.w * 0.42, y: ctx.h * 0.18 };
    dummyAt(ctx, inLine);
    dummyAt(ctx, far);
    const readout = label(ctx, ctx.w * 0.5, 14, '#f0d68a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#9c9382', 10);

    const right = ctx.w - 24;
    const chain = { live: false, x: 0, y: 0, vx: 0, vy: 0, hit: false };
    const anchor = { live: false, x: 0, y: 0, until: 0 };
    const wall = { live: false, travelled: 0, shoved: false, done: false };
    const hole = { until: -1 };

    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear(); ground.clear();

      // The hole the wall came out of, painted over the border rather than erased from it.
      if (hole.until > elapsed) {
        ground.fillStyle(0x0d0d1a, 1);
        ground.fillRect(right - 5, 10, 10, ctx.h - 20);
      }

      if (chain.live) {
        chain.x += chain.vx * dt; chain.y += chain.vy * dt;
        if (!chain.hit && Phaser.Math.Distance.Between(chain.x, chain.y, inLine.x, inLine.y) < 26) {
          chain.hit = true;
          ctx.capture(() => fx.shards(inLine.x, inLine.y, 5, 120, 360));
          float(ctx, inLine.x, inLine.y - 26, '10', '#ffb3aa', 14);
        }
        chainRun(air, ctx.tint, me.x, me.y, chain.x, chain.y, 0.95, 11, 2.4, 6);
        chainHead(air, ctx.tint, chain.x, chain.y, Math.atan2(chain.vy, chain.vx));
        if (chain.x >= right) {
          chain.live = false;
          anchor.live = true; anchor.x = right; anchor.y = chain.y; anchor.until = elapsed + 7000;
          ctx.capture(() => fx.shards(anchor.x, anchor.y, 7, 150, 420));
          float(ctx, me.x, me.y - 44, '⛓️ HOOKED — press E', hex(JUS.bright), 12);
        }
      }

      if (anchor.live) {
        if (elapsed > anchor.until) { anchor.live = false; gauge.setText('the anchor rotted off — 7 seconds is all it waits'); }
        const tug = Math.sin(elapsed / 200) * 3;
        chainRun(air, ctx.tint, me.x, me.y, anchor.x, anchor.y, 0.85, 11, 2.2, 10 + tug);
        air.fillStyle(ctx.tint(JUS.gold), 0.9);
        air.fillCircle(anchor.x, anchor.y, 6);
        air.lineStyle(2, ctx.tint(JUS.pale), 0.5 + 0.3 * Math.sin(elapsed / 130));
        air.strokeCircle(anchor.x, anchor.y, 11 + Math.sin(elapsed / 130) * 2);
        gauge.setText(`hooked — ${((anchor.until - elapsed) / 1000).toFixed(1)}s to pull, and the recast is free`);
      }

      if (wall.live) {
        wall.travelled += 300 * dt;
        const faceX = right - wall.travelled;
        wallSlab(ground, ctx.tint, {
          x: faceX, y: ctx.h / 2, vertical: true,
          span: ctx.h - 20, thick: 26, nx: -1, ny: 0, t: elapsed / 1000,
        });
        // Shoved along in front of it, and unable to do anything about it.
        if (Math.abs(inLine.x - faceX) <= 33) {
          inLine.x = faceX - 33;
          if (!wall.shoved) {
            wall.shoved = true;
            float(ctx, inLine.x, inLine.y - 30, '🧱 SHOVED', '#e6e1d2', 11);
          }
        }
        gauge.setText(`300 px/s, 26px thick, the full height of the arena — ${Math.round(right - faceX)}px crossed`);
        if (faceX <= 24 && !wall.done) {
          wall.done = true; wall.live = false;
          ctx.capture(() => { fx.rubble(24, ctx.h / 2, 26, ctx.h * 0.6); fx.flash(24, ctx.h / 2, 70, 8); });
          float(ctx, ctx.w * 0.3, ctx.h / 2 - 40, '💥 IMPACT', '#e6e1d2', 14);
          // No distance check at all: it lands on everybody.
          for (const m of [inLine, far]) {
            float(ctx, m.x, m.y - 28, '20', '#ffb3aa', 16);
            float(ctx, m.x, m.y - 46, 'stunned 2s', '#d4c6ff', 10);
          }
          readout.setText('the impact has NO distance check — 20 and a 2-second stun on every enemy, anywhere');
        }
      }
    });

    ctx.at(600, () => {
      chain.live = true; chain.hit = false;
      chain.x = me.x + 24; chain.y = me.y;
      chain.vx = 1050; chain.vy = 0;
      av.play('sweep', 0);
      readout.setText('1050 px/s, and it does not stop for bodies — 10 to each one it passes through');
    });
    ctx.at(3200, () => readout.setText('it sinks into whichever arena edge it reaches and hangs there for 7 seconds'));
    ctx.at(5200, () => {
      if (!anchor.live) return;
      anchor.live = false;
      wall.live = true; wall.travelled = 0;
      hole.until = 20000;
      av.play('dash', 0);
      ctx.capture(() => fx.rubble(right, ctx.h / 2, 18, 60));
      float(ctx, me.x, me.y - 44, '⛓️ TEAR IT DOWN', hex(JUS.gold), 12);
      readout.setText('press E again and the whole wall comes out of the border — that recast is free');
    });
    ctx.at(11000, () => readout.setText('the edge stays missing for 15s. The hole is painted, not opened — nothing leaves through it.'));
    ctx.at(14000, () => readout.setText('landing drops the anchor and any chain still flying. This is an air-only tool.'));
  },
};

// ══ FLIGHT · R — Pillar of Flame ══════════════════════════════════════

export const pillar: PreviewScript = {
  duration: 14000,
  scale: 0.7,
  bodyTexture: '',
  caption: 'R — a full-height wall of fire for 8s: 6 damage every 500ms and a 25% slow inside 42px',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.5 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    magistrate(av)?.setFlying(true);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5, dir: -1 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#ff7a1f', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd24a', 10);

    const px = ctx.w * 0.56;
    const fire = ctx.capture(() => new FlamePillar(ctx.scene, ctx.tint, 26, 12, ctx.h - 12, 4));
    const st = { born: -1, tick: 0, dealt: 0 };
    const band = ctx.adopt(ctx.scene.add.graphics().setDepth(1));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      band.clear();
      const live = st.born >= 0 && elapsed - st.born < 8000;
      const age = st.born < 0 ? 0 : elapsed - st.born;
      fire.update(delta, px, live ? (8000 - age < 500 ? Math.max(0, (8000 - age) / 500) : 1) : 0);

      const inBand = live && Math.abs(foe.x - px) <= 42;
      if (live) {
        band.lineStyle(1, ctx.tint(JUS.flameDeep), 0.4);
        band.strokeRect(px - 42, 12, 84, ctx.h - 24);
      }
      // The enemy wades through it rather than walking through it.
      foe.x += 150 * (inBand ? 0.75 : 1) * foe.dir * dt;
      if (foe.x < ctx.w * 0.24) foe.dir = 1;
      if (foe.x > ctx.w * 0.9) foe.dir = -1;

      if (live) {
        st.tick += delta;
        while (st.tick >= 500) {
          st.tick -= 500;
          if (Math.abs(foe.x - px) <= 42) {
            st.dealt += 6;
            ctx.capture(() => fx.flash(foe.x, foe.y, 16, 8));
            float(ctx, foe.x, foe.y - 24, '6', '#ffb3aa', 12);
          }
        }
        gauge.setText(`${((8000 - age) / 1000).toFixed(1)}s of fire left   ·   ${st.dealt} dealt`
          + `   ·   ${inBand ? 'wading at ×0.75 speed' : 'clear of it'}`);
      } else if (st.born >= 0) {
        gauge.setText(`gone — ${st.dealt} damage total. 96 is the most 8 seconds can be worth.`);
      }
    });

    ctx.at(600, () => {
      st.born = 600;
      av.play('slam', 0);
      ctx.capture(() => fx.verdictBeam(px, ctx.h - 12, JUS.flame, ctx.h - 24, 600, 5));
      float(ctx, px, 34, '🔥 PILLAR OF FLAME', '#ff7a1f', 13);
      readout.setText('top of the arena to the bottom, at the x of your cursor. The y is thrown away.');
    });
    ctx.at(3000, () => readout.setText('6 every 500ms — 12 a second — to anything within 42px of the line'));
    ctx.at(5600, () => readout.setText('and ×0.75 move speed to anyone in the same band. Yours never touches you.'));
    ctx.at(8400, () => readout.setText('it splits the map in half; walking round the end of it is the answer, not through'));
    ctx.at(11000, () => readout.setText('the AI is told where hostile pillars are and steers around a 60px danger band'));
  },
};

// ══ FLIGHT · F — Descend ══════════════════════════════════════════════

export const descend: PreviewScript = {
  duration: 12000,
  scale: 0.88,
  bodyTexture: '',
  caption: 'F (air) — feet back on the floor: the flight five go away, and so does your chain',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.42 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = magistrate(av);
    rig?.setFlying(true);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e6e1d2', 11);
    const tray = label(ctx, ctx.w * 0.5, ctx.h - 16, '#f0d68a', 10);

    const s = { flying: true, anchor: true };
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const anchorAt = { x: ctx.w - 26, y: ctx.h * 0.3 };
    ctx.onFrame((_delta, elapsed) => {
      air.clear();
      me.y = ctx.h * (s.flying ? 0.42 : 0.55) + Math.sin(elapsed / 420) * (s.flying ? 5 : 1);
      if (s.anchor) {
        const tug = Math.sin(elapsed / 200) * 3;
        chainRun(air, ctx.tint, me.x, me.y, anchorAt.x, anchorAt.y, 0.85, 11, 2.2, 10 + tug);
        air.fillStyle(ctx.tint(JUS.gold), 0.9);
        air.fillCircle(anchorAt.x, anchorAt.y, 6);
      }
      tray.setText(s.flying
        ? 'TRAY:  Spear of Heaven · Bind · Pillar of Flame · Descend · Seraphim\'s Gaze'
        : 'TRAY:  Spear Thrust · Coliseum · Sheer Will · Flight of the Valkyrie · Judgement Day');
    });

    ctx.at(400, () => readout.setText('airborne, with a chain hooked into the right-hand wall and ready to pull'));
    ctx.at(3000, () => {
      s.flying = false; s.anchor = false;
      rig?.setFlying(false);
      ctx.capture(() => fx.rubble(me.x, me.y + 14, 6, 22));
      float(ctx, me.x, me.y - 40, '🪶 Descend', '#e6e1d2', 12);
      readout.setText('F lands you — and the anchor goes with the wings, unpulled');
    });
    ctx.at(5400, () => readout.setText('the +33% speed, the +20% damage taken and the 2/s drain all stop at once'));
    ctx.at(7600, () => readout.setText('0.5s cooldown to land, 2.5s to take off again — about three seconds a round trip'));
    ctx.at(9800, () => readout.setText('an empty Willpower bar does exactly this for you, with "🪶 Grounded" instead'));
  },
};

// ══ FLIGHT · Q — Seraphim's Gaze ══════════════════════════════════════

export const seraphim: PreviewScript = {
  duration: 17000,
  scale: 0.64,
  bodyTexture: '',
  caption: 'Q — teleport to the centre, 3s untouchable, then 10s of them walking to you',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.62, alpha: 1 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: me.alpha }));
    magistrate(av)?.setFlying(true);
    const victim = { x: ctx.w * 0.86, y: ctx.h * 0.28 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 14, '#ffffff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#fff3cf', 10);

    const centre = { x: ctx.w / 2, y: ctx.h / 2 };
    const st = { form: -1, tranceUntil: -1, seraph: null as SeraphForm | null };
    const beams = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      beams.clear();
      if (st.seraph) {
        const since = elapsed - st.form;
        const grow = Phaser.Math.Clamp(since / 420, 0, 1) * Phaser.Math.Clamp((3000 - since) / 300, 0, 1);
        const look = Math.atan2(victim.y - me.y, victim.x - me.x);
        ctx.capture(() => st.seraph?.update(delta, me.x, me.y, grow, look));
        me.alpha = 0;
        gauge.setText(`the form: ${((3000 - since) / 1000).toFixed(1)}s of invincible and completely immobile`);
        if (since >= 3000) {
          st.seraph.destroy();
          st.seraph = null;
          me.alpha = 1;
          ctx.capture(() => fx.ring(me.x, me.y, 60, 150, JUS.white, 520, 5, 8));
          float(ctx, victim.x, victim.y - 44, '🌀 ENTRANCED', '#ffffff', 12);
        }
        return;
      }
      if (st.tranceUntil > elapsed) {
        const ang = Math.atan2(me.y - victim.y, me.x - victim.x);
        const dist = Phaser.Math.Distance.Between(me.x, me.y, victim.x, victim.y);
        // Straight at you at their own speed, and only stopping on top of you.
        if (dist > 34) {
          victim.x += Math.cos(ang) * 160 * dt;
          victim.y += Math.sin(ang) * 160 * dt;
        }
        tranceBeams(beams, ctx.tint, victim.x, victim.y, ang, elapsed / 1000);
        gauge.setText(`entranced for ${((st.tranceUntil - elapsed) / 1000).toFixed(1)}s more`
          + `   ·   ${Math.round(dist)}px away   ·   0 damage anywhere in this ultimate`);
      }
    });

    ctx.at(700, () => {
      ctx.capture(() => fx.motes(me.x, me.y, 12, 34, 600));
      me.x = centre.x; me.y = centre.y;
      st.form = 700;
      st.tranceUntil = 700 + 3000 + 10000;
      st.seraph = ctx.capture(() => new SeraphForm(ctx.scene, ctx.tint, 12));
      ctx.capture(() => fx.flash(centre.x, centre.y, 90, 13));
      float(ctx, centre.x, centre.y - 70, '👁️ SERAPHIM\'S GAZE', '#ffffff', 13);
      readout.setText('you are moved to the exact centre of the arena, whatever was happening');
    });
    ctx.at(2200, () => readout.setText('eleven ribbons and thirteen eyes, each blinking on its own clock'));
    ctx.at(4200, () => readout.setText('the 10 seconds start when the form drops — 13 from the button to the end'));
    ctx.at(7000, () => readout.setText('their velocity is overwritten every frame: straight at you, at their own speed'));
    ctx.at(10000, () => readout.setText('it only takes their feet — they can cast the whole way in'));
    ctx.at(13000, () => readout.setText('no damage anywhere in it. This is a delivery service for a Coliseum or a pillar.'));
  },
};

// ══ PASSIVE — Willpower ═══════════════════════════════════════════════

export const willpower: PreviewScript = {
  duration: 20000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — one bar, 5/s coming in the whole time. Every cost is a subtraction from that.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.56 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = magistrate(av);
    const readout = label(ctx, ctx.w * 0.5, 12, '#a8ccff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#2f7bff', 10);

    const s = { will: 100, sheer: false, flying: false, hurtUntil: -1, spent: false };
    const regen = (): number => (s.hurtUntil > 0 ? 6 : 5);
    const net = (): number => regen() - (s.sheer ? 10 : 0) - (s.flying ? 2 : 0);
    willHud(ctx, () => ({ will: s.will, net: net() }));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      if (s.hurtUntil > 0 && elapsed > s.hurtUntil) s.hurtUntil = -1;
      s.will = Phaser.Math.Clamp(s.will + net() * dt, 0, 100);
      me.y = ctx.h * (s.flying ? 0.48 : 0.56) + Math.sin(elapsed / 400) * (s.flying ? 5 : 1);
      if (s.will <= 0 && (s.sheer || s.flying) && !s.spent) {
        s.spent = true;
        float(ctx, me.x, me.y - 46, '💤 WILL SPENT', '#7788aa', 13);
        if (s.flying) {
          s.flying = false; rig?.setFlying(false);
          float(ctx, me.x, me.y - 28, '🪶 Grounded', '#e6e1d2', 11);
        }
        s.sheer = false; rig?.setWilling(false);
      }
      gauge.setText(
        `regen ${regen()}/s${s.hurtUntil > 0 ? ' (determined)' : ''}`
        + `   −   ${s.sheer ? 'Sheer Will 10/s' : ''}${s.sheer && s.flying ? ' + ' : ''}${s.flying ? 'Flight 2/s' : ''}`
        + `${!s.sheer && !s.flying ? 'nothing' : ''}   =   ${net() >= 0 ? '+' : '−'}${Math.abs(net()).toFixed(1)}/s`,
      );
    });

    ctx.at(400, () => readout.setText('100 Willpower, and 5 a second coming in whether or not anything is draining it'));
    ctx.at(2600, () => {
      s.flying = true; rig?.setFlying(true);
      ctx.capture(() => fx.motes(me.x, me.y, 10, 34, 700));
      readout.setText('flight takes 2 a second — against the 5, that is a net GAIN of 3');
    });
    ctx.at(5600, () => {
      s.sheer = true; s.spent = false; rig?.setWilling(true);
      ctx.capture(() => fx.ring(me.x, me.y, 10, 62, JUS.will, 420, 5, 6));
      readout.setText('Sheer Will takes 10. Both at once is −7 a second, and now the bar means something.');
    });
    ctx.at(8600, () => {
      s.hurtUntil = 10600;
      ctx.capture(() => fx.ring(me.x, me.y, 14, 46, JUS.will, 340, 3, 6));
      float(ctx, me.x, me.y - 44, '💙 DETERMINED', hex(JUS.willPale), 12);
      readout.setText('being hit makes you more determined, not less: 6 a second for the next 2 seconds');
    });
    ctx.at(11200, () => readout.setText('nothing here is ever really "spent" — you are buying a rate, not a pool'));
    ctx.at(15400, () => readout.setText('at zero it takes both away and refuses to give either back below 5'));
    ctx.at(17600, () => {
      s.sheer = false; rig?.setWilling(false);
      readout.setText('which is why the bar is read as a rate: the number under it is the live net');
    });
  },
};

// ══ PASSIVE — Two Stances ═════════════════════════════════════════════

export const twoStances: PreviewScript = {
  duration: 17000,
  scale: 0.7,
  bodyTexture: '',
  caption: 'Passive — ten abilities, five a stance. F is the hinge, and the chain is what it costs.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.56 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = magistrate(av);
    const foe = { x: ctx.w * 0.3 + 128, y: ctx.h * 0.56 + 20 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#f0d68a', 11);
    const tray = label(ctx, ctx.w * 0.5, ctx.h - 18, '#fff3cf', 10);

    const centre = { x: ctx.w * 0.3, y: ctx.h * 0.56 };
    const ring = ctx.capture(() => new ColiseumRing(ctx.scene, ctx.tint, 132, 16, 2));
    const s = { flying: false, anchor: false, ringUp: false };
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const anchorAt = { x: ctx.w - 26, y: ctx.h * 0.3 };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      ring.update(delta, centre.x, centre.y, s.ringUp ? 1 : 0, s.ringUp ? 0 : 1);
      me.y = ctx.h * (s.flying ? 0.46 : 0.56) + Math.sin(elapsed / 420) * (s.flying ? 5 : 1);
      me.x += (s.flying ? 90 : 60) * dt;
      if (me.x > ctx.w * 0.8) me.x = ctx.w * 0.2;
      // The enemy pushes at the marble the whole time, to show who it is holding.
      const fa = Math.atan2(centre.y - foe.y, ctx.w - foe.x);
      foe.x += Math.cos(fa) * 90 * dt;
      foe.y += Math.sin(fa) * 90 * dt;
      if (s.ringUp) {
        const clampTo = (m: Mark, r: number): void => {
          const d = Phaser.Math.Distance.Between(centre.x, centre.y, m.x, m.y);
          const ang = Math.atan2(m.y - centre.y, m.x - centre.x);
          if (d > r) { m.x = centre.x + Math.cos(ang) * r; m.y = centre.y + Math.sin(ang) * r; }
        };
        clampTo(foe, 114);
        if (!s.flying) clampTo(me, 114);
      }
      if (s.anchor) {
        chainRun(air, ctx.tint, me.x, me.y, anchorAt.x, anchorAt.y, 0.85, 11, 2.2, 10);
        air.fillStyle(ctx.tint(JUS.gold), 0.9);
        air.fillCircle(anchorAt.x, anchorAt.y, 6);
      }
      tray.setText(s.flying
        ? '🕊️ FLIGHT:  Spear of Heaven · Bind · Pillar of Flame · Descend · Seraphim\'s Gaze'
        : '⚖️ GROUND:  Spear Thrust · Coliseum · Sheer Will · Flight of the Valkyrie · Judgement Day');
    });

    ctx.at(400, () => {
      s.ringUp = true;
      ctx.capture(() => fx.ring(centre.x, centre.y, 20, 132, JUS.gold, 480, 6, 5));
      readout.setText('the magistrate: laurel, spear, and marble that holds everybody including you');
    });
    ctx.at(3400, () => {
      s.flying = true; s.anchor = true;
      rig?.setFlying(true);
      av.play('raise');
      ctx.capture(() => { fx.ring(me.x, me.y, 12, 74, JUS.pale, 460, 5, 6); fx.motes(me.x, me.y, 14, 40, 900); });
      readout.setText('F, and it is a different character: wings, a different five, and your own wall lets you out');
    });
    ctx.at(6600, () => readout.setText('the arena keeps what you built — the ring, the pillars, a sentence, a trance'));
    ctx.at(9200, () => {
      s.flying = false; s.anchor = false;
      rig?.setFlying(false);
      ctx.capture(() => fx.rubble(me.x, me.y + 14, 6, 22));
      float(ctx, me.x, me.y - 40, '🪶 Descend', '#e6e1d2', 12);
      readout.setText('but not the chain. Touching the floor drops it, hooked or still flying.');
    });
    ctx.at(12000, () => readout.setText('the air is +33% speed and +20% damage taken; the floor is where the scales are'));
    ctx.at(14600, () => readout.setText('and the same blue bar pays for both, so the stance dance has a budget'));
  },
};

// ══ MASTERY · Combo Excelsius ═════════════════════════════════════════

/**
 * The meter itself, climbing through four ranks off four real combos out of the table, then
 * bleeding back down when the arrangements stop. Painted with the kit's own `styleMeter`.
 */
export const comboExcelsius: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'Style is arrangement, not damage — six ranks, 100 each, bleeding the whole time',
  run(ctx) {
    const fx = fxOf(ctx);
    const at = { x: ctx.cx, y: ctx.cy + 18, alpha: 1 };
    const av = drivenCaster(ctx, () => at);
    av.setFacing(ctx.aim);
    const readout = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 16, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#f0d68a',
    }).setOrigin(0.5).setDepth(23));

    const ranks = [
      { letter: 'D', name: 'DUTIFUL', color: 0x8a8f9c, text: '#b9bfcc', decay: 2 },
      { letter: 'C', name: 'CORRECT', color: 0x6fb0e8, text: '#a8d4ff', decay: 3 },
      { letter: 'B', name: 'BRUTAL', color: 0x5fd8a0, text: '#a8ffd8', decay: 4 },
      { letter: 'A', name: 'ABSOLUTE', color: 0xf0d68a, text: '#ffeeb0', decay: 6 },
      { letter: 'S', name: 'SOVEREIGN', color: 0xff8a3c, text: '#ffc48a', decay: 8 },
    ];
    const st = { points: 0, rank: 0, heat: 0 };

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
    const letter = ctx.adopt(ctx.scene.add.text(0, 0, 'D', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#b9bfcc',
    }).setOrigin(0, 0.5).setDepth(23));
    const name = ctx.adopt(ctx.scene.add.text(0, 0, 'DUTIFUL', {
      fontSize: '9px', fontFamily: 'Arial Black', color: '#8a8f9c',
    }).setOrigin(1, 0).setDepth(23));

    const score = (label: string, amount: number) => {
      st.points += amount;
      st.heat = 1;
      while (st.points >= 100 && st.rank < ranks.length - 1) {
        st.points -= 100;
        st.rank++;
        const r = ranks[st.rank];
        ctx.capture(() => {
          const t = ctx.adopt(ctx.scene.add.text(ctx.cx, 46, `${r.letter}  ${r.name}`, {
            fontSize: '22px', fontFamily: 'Arial Black', color: r.text,
          }).setOrigin(0.5).setDepth(24));
          ctx.scene.tweens.add({ targets: t, y: 30, alpha: 0, duration: 1100 });
        });
      }
      ctx.capture(() => {
        const t = ctx.adopt(ctx.scene.add.text(ctx.w - 20, 74, `+${amount}  ${label}`, {
          fontSize: '11px', fontFamily: 'Arial Black', color: ranks[st.rank].text,
        }).setOrigin(1, 0).setDepth(24));
        ctx.scene.tweens.add({ targets: t, y: 62, alpha: 0, duration: 1000 });
      });
    };

    ctx.at(700, () => { score('COURT IS IN SESSION', 18); readout.setText('a ring raised round somebody — 18'); });
    ctx.at(1900, () => { score('TRIAL BY FIRE', 30); readout.setText('a pillar raised inside that ring — 30'); });
    ctx.at(3300, () => { score('OBJECTION', 6); readout.setText('a wall eating a shot aimed at you — 6'); });
    ctx.at(4200, () => { score('COMPACTED', 22); readout.setText('rode a ripped wall the whole way — 22'); });
    ctx.at(5400, () => { score('INTO THE BLAZE', 35); readout.setText('pushed into a pillar by that wall — 35'); });
    ctx.at(6600, () => { score('EXECUTED', 40); readout.setText('three bites and a threshold — 40'); });
    ctx.at(7900, () => { score('SHEER WILL', 45); readout.setText('survived on 1 health — 45'); });
    ctx.at(9000, () => { score('LAST WORD', 50); readout.setText('a kill made under a tenth of your own health — 50'); });
    ctx.at(10200, () => {
      readout.setText('S — and Judgement Day stops weighing anybody');
      fx.ring(at.x, at.y, 20, 130, JUS.flameCore, 700, 6, 8);
      ctx.capture(() => {
        const t = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy - 40, 'I AM BEYOND JUSTICE!', {
          fontSize: '22px', fontFamily: 'Arial Black', color: '#ff3b5c',
        }).setOrigin(0.5).setDepth(25));
        ctx.scene.tweens.add({ targets: t, alpha: 0, duration: 1800, delay: 600 });
      });
    });
    ctx.at(12200, () => readout.setText('and now it bleeds — 8 a second at S, and nothing is being arranged'));

    ctx.onFrame((dt) => {
      const r = ranks[st.rank];
      st.heat = Math.max(0, st.heat - dt / 900);
      st.points = Math.max(0, st.points - r.decay * (dt / 1000));
      const w = 200, h = 11, x = ctx.w - w - 40, y = 16;
      g.clear();
      styleMeter(g, ctx.tint, x, y, w, h, st.points / 100, r.color,
        st.heat, st.points < 18 && st.rank > 0, ctx.scene.time.now / 1000);
      letter.setPosition(x + w + 8, y + h / 2).setText(r.letter).setColor(r.text)
        .setScale(1 + st.heat * 0.18);
      name.setPosition(x + w, y + h + 6).setText(r.name).setColor(r.text);
    });
  },
};

// ══ MASTERY · Vigilante Vengeance ═════════════════════════════════════

/**
 * The ground half, in full: the charge, the body run through, the boot, and the wall it ends
 * against. The flight barrage is shown as a coda over the top of it.
 */
export const vigilanteVengeance: PreviewScript = {
  duration: 15000,
  scale: 0.82,
  caption: 'Ground: dash, impale, kick them into whatever is behind them. Air: 200 spears at your cursor',
  run(ctx) {
    const fx = fxOf(ctx);
    const at = { x: ctx.w * 0.16, y: ctx.cy, alpha: 1 };
    const av = drivenCaster(ctx, () => at);
    av.setFacing(0);
    const foe = { x: ctx.w * 0.46, y: ctx.cy };
    const wallX = ctx.w * 0.9;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const readout = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 16, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffb26b',
    }).setOrigin(0.5).setDepth(23));

    const dummy = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame(() => {
      dummy.clear();
      dummy.fillStyle(0x2b2f3d, 1); dummy.fillCircle(foe.x, foe.y, 17);
      dummy.fillStyle(0x3c4254, 1); dummy.fillCircle(foe.x, foe.y, 13);
    });

    let phase: 'idle' | 'dash' | 'impale' | 'launch' | 'done' = 'idle';
    let phaseT = 0;
    const spears: { x: number; y: number; born: number; dead: boolean }[] = [];

    ctx.at(500, () => { phase = 'dash'; phaseT = 0; readout.setText('260px in 220ms, straight down the aim'); });
    ctx.at(9000, () => {
      readout.setText('in the air it is two hundred spears, tightest where you point');
      for (let i = 0; i < 90; i++) {
        const bell = (Math.random() + Math.random() - 1);
        spears.push({
          x: Phaser.Math.Clamp(ctx.w * 0.62 + bell * 70, 12, ctx.w - 12),
          y: -20 - Math.random() * 90,
          born: 9000 + (i / 90) * 2400 + Math.random() * 80,
          dead: false,
        });
      }
    });
    ctx.at(12200, () => readout.setText('2 damage each — and open angel bites pull them in'));

    ctx.onFrame((dt, elapsed) => {
      phaseT += dt;
      g.clear();
      const t = elapsed / 1000;

      if (phase === 'dash') {
        const p = Math.min(1, phaseT / 220);
        at.x = ctx.w * 0.16 + (ctx.w * 0.42 - ctx.w * 0.16) * p;
        for (let i = 1; i <= 5; i++) {
          g.fillStyle(ctx.tint(JUS.pale), 0.22 * (1 - i / 6));
          g.fillCircle(at.x - i * 12, at.y, 16 - i * 2);
        }
        spearShape(g, ctx.tint, at.x, at.y, 0, 54, 1, 1.1);
        if (p >= 1) {
          phase = 'impale'; phaseT = 0;
          ctx.capture(() => {
            fx.flash(foe.x, foe.y, 46, 9);
            const lbl = ctx.adopt(ctx.scene.add.text(foe.x, foe.y - 50, '🗡️ IMPALED', {
              fontSize: '13px', fontFamily: 'Arial Black', color: '#fff3cf',
            }).setOrigin(0.5).setDepth(24));
            ctx.scene.tweens.add({ targets: lbl, y: foe.y - 72, alpha: 0, duration: 1100 });
          });
          readout.setText('45 for the run-through and the boot together');
        }
      } else if (phase === 'impale') {
        foe.x = at.x + 42;
        impaleRig(g, ctx.tint, foe.x, foe.y, 0, Math.min(0.5, phaseT / 640));
        if (phaseT >= 320) {
          phase = 'launch'; phaseT = 0;
          readout.setText('900 px/s, and whatever is behind them decides the rest');
        }
      } else if (phase === 'launch') {
        foe.x += 340 * (dt / 1000);
        impaleRig(g, ctx.tint, foe.x, foe.y, 0, 0.5 + Math.min(0.5, phaseT / 500));
        for (let i = 1; i <= 5; i++) {
          g.fillStyle(ctx.tint(JUS.flame), 0.2 * (1 - i / 6));
          g.fillCircle(foe.x - i * 14, foe.y, 14 - i * 2);
        }
        if (foe.x >= wallX) {
          phase = 'done';
          foe.x = wallX;
          ctx.capture(() => {
            fx.rubble(foe.x, foe.y, 18, 56);
            fx.flash(foe.x, foe.y, 60, 9);
            const lbl = ctx.adopt(ctx.scene.add.text(foe.x - 40, foe.y - 52, '💥 INTO THE WALL  +30', {
              fontSize: '13px', fontFamily: 'Arial Black', color: '#e6e1d2',
            }).setOrigin(0.5).setDepth(24));
            ctx.scene.tweens.add({ targets: lbl, y: foe.y - 74, alpha: 0, duration: 1300 });
          });
          readout.setText('a wall is +30 and 2s stunned; a pillar sets them alight; a moving wall is +45');
        }
      }

      // The arena edge they are being driven into.
      g.fillStyle(ctx.tint(JUS.stoneDark), 0.85);
      g.fillRect(wallX + 18, 0, 10, ctx.h);

      for (const s of spears) {
        if (s.dead || elapsed < s.born) continue;
        s.y += 300 * (dt / 1000);
        if (s.y > ctx.h + 20) { s.dead = true; continue; }
        barrageSpear(g, ctx.tint, s.x, s.y, Math.PI / 2, 24);
      }
    });
  },
};
