import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  BEAST_TONES, HELL_TONES, HUNT, HUNTER_TONES, HuntAura, HuntAvatar, HuntFx, HuntForm,
  HuntTones, MOON_TONES, SILVER_TONES,
} from '../../../elements/kits/HuntVisuals';

/**
 * Hunt's showcases.
 *
 * Hunt puts no sprites in the world at all — bolts, grenades, trail marks, searing gashes and
 * the hook chain are plain data repainted into a Graphics layer every frame. So none of these
 * loops can use `ctx.fly`; instead they step the same numbers the kit steps and call the same
 * `HuntFx.draw*` statics the kit calls, which is what keeps a previewed bolt identical to a
 * real one and makes a retune show up here for free.
 *
 * The other thing hunt does that nothing else does is change body: beast form swaps the fighter
 * sprite to `elem-hunt-beast` and hybrid form to `elem-hunt-hybrid`. Every beast and hybrid
 * script sets `bodyTexture` accordingly, or the showcase would stage a character that does not
 * exist.
 */

// ── Staging ───────────────────────────────────────────────────────────────

const TONES: Record<HuntForm, HuntTones> = {
  human: HUNTER_TONES, beast: BEAST_TONES, hybrid: SILVER_TONES,
};

interface Stage {
  fx: HuntFx;
  av: BaseAvatar;
  /** The hunt rig, or null when the player has a skin whose character replaces it. */
  hv: HuntAvatar | null;
  tones: HuntTones;
}

/**
 * Fx wired into the box plus the caster already wearing the right form.
 *
 * `useAvatar` may hand back a skin's character instead of hunt's own, and that one has no
 * `setForm`/`setWeapon` — so form driving is done through a narrowed handle rather than a cast.
 */
function stage(ctx: PreviewCtx, o: {
  form?: HuntForm; moon?: boolean; hell?: boolean; weapon?: 'crossbow' | 'shotgun' | null;
} = {}): Stage {
  const form = o.form ?? 'human';
  const tones = o.moon ? MOON_TONES : o.hell ? HELL_TONES : TONES[form];
  const fx = ctx.capture(() => new HuntFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new HuntAvatar(ctx.scene, ctx.tint, HUNTER_TONES));
  const hv = av instanceof HuntAvatar ? av : null;
  av.setFacing(ctx.aim);
  hv?.setForm(form);
  hv?.setMoon(!!o.moon);
  hv?.setHell(!!o.hell);
  hv?.setIntensity(o.moon ? 1.45 : o.hell ? 1 : form === 'beast' ? 1.3 : form === 'hybrid' ? 1.15 : 1);
  hv?.setWeapon(o.weapon !== undefined ? o.weapon : form === 'beast' ? null : form === 'hybrid' ? 'shotgun' : 'crossbow');
  return { fx, av, hv, tones };
}

/**
 * The neutral stand-in, at an arbitrary distance.
 *
 * `ctx.addDummy` puts one at the box's fixed target mark, which is 330 world px out. Hunt's
 * ranges run from an 80px claw to the whole arena diagonal, so almost every loop needs the
 * target standing at the ability's real reach instead — otherwise the showcase quietly implies
 * a range the kit does not have.
 */
function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(x - 5.6, y - 4, 1.6); g.fillCircle(x + 4.4, y - 4, 1.6);
    return g;
  });
}

/** A short caption card, used where a number only exists as a status rather than a shape. */
function shout(ctx: PreviewCtx, x: number, y: number, text: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '10px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(12));
  ctx.scene.tweens.add({ targets: t, y: t.y - 13, alpha: 0, duration: 1500 });
}

/**
 * A crossbow bolt, flown at its real 780 px/s and drawn by the kit's own `drawBolt`.
 *
 * `stickAt` is what makes this ability what it is — a bolt that connects does not disappear, it
 * stays in the body and keeps being drawn at 0.85 scale with the bite animation running.
 */
function bolt(ctx: PreviewCtx, o: {
  from: { x: number; y: number }; to: { x: number; y: number };
  born: number; tones: HuntTones; bomb?: boolean;
  stickAt?: { x: number; y: number };
  onHit?: () => void;
}): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const angle = Math.atan2(o.to.y - o.from.y, o.to.x - o.from.x);
  const flightMs = (Phaser.Math.Distance.Between(o.from.x, o.from.y, o.to.x, o.to.y) / 780) * 1000;
  let hit = false;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const age = elapsed - o.born;
    if (age < 0) return;
    if (age < flightMs) {
      const k = age / flightMs;
      HuntFx.drawBolt(g, ctx.tint, o.tones,
        o.from.x + (o.to.x - o.from.x) * k, o.from.y + (o.to.y - o.from.y) * k,
        angle, 1, 0, !!o.bomb);
      return;
    }
    if (!hit) { hit = true; o.onHit?.(); }
    if (!o.stickAt) return;
    // Exactly the kit's own bury animation: 0.85 scale, bite easing in over 200ms.
    HuntFx.drawBolt(g, ctx.tint, o.tones, o.stickAt.x, o.stickAt.y, angle, 0.85,
      Phaser.Math.Clamp((age - flightMs) / 200, 0, 1), false);
  });
}

/** A frag, thrown its real 145px at 500 px/s, tumbling, then sitting on a 3s fuse. */
function grenade(ctx: PreviewCtx, o: {
  from: { x: number; y: number }; angle: number; born: number; tones: HuntTones;
  fuseMs?: number; onBlow?: (x: number, y: number) => void;
}): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const fuse = o.fuseMs ?? 3000;
  const flightMs = (145 / 500) * 1000;
  let blown = false;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const age = elapsed - o.born;
    if (age < 0 || blown) return;
    const k = Math.min(1, age / flightMs);
    const x = o.from.x + Math.cos(o.angle) * 145 * k;
    const y = o.from.y + Math.sin(o.angle) * 145 * k;
    if (age >= fuse) {
      blown = true;
      o.onBlow?.(x, y);
      return;
    }
    HuntFx.drawGrenade(g, ctx.tint, o.tones, x, y, elapsed / 1000, fuse - age, false,
      o.angle + (age / 1000) * 11 * (k < 1 ? 1 : 0), k >= 1);
  });
}

/** One trail mark, painted by the kit's own `drawTrail` and fading over its real 4s life. */
function mark(ctx: PreviewCtx, o: {
  x: number; y: number; angle: number; born: number; tones: HuntTones; lifeMs?: number;
}): void {
  const life = o.lifeMs ?? 4000;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const age = elapsed - o.born;
    if (age < 0 || age > life) return;
    HuntFx.drawTrail(g, ctx.tint, o.tones, o.x, o.y, 30, o.angle, elapsed / 1000, 1 - age / life);
  });
}

// ══ HUMAN FORM ════════════════════════════════════════════════════════════

export const crossbow: PreviewScript = {
  duration: 3000,
  caption: 'Click — 30 damage at 780 px/s, and the bolt stays in the body (max 3)',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    dummy(ctx, ctx.tx, ctx.ty);
    const muzzle = { x: ctx.cx + 22, y: ctx.cy };
    // Three shots on the real 1.25s reload, each bolt left standing in the body — the third
    // is the cap, and a fourth would not stick at all.
    [200, 1450, 2400].forEach((at, i) => {
      ctx.at(at, () => {
        hv?.play('punch', ctx.aim);
        hv?.setLoad(0);
        hv?.kick(0.7);
        fx.boltRelease(ctx.cx + 26, ctx.cy, ctx.aim, 8, tones);
      });
      bolt(ctx, {
        from: muzzle, to: { x: ctx.tx - 14, y: ctx.ty }, born: at, tones,
        stickAt: { x: ctx.tx - 12, y: ctx.ty - 8 + i * 8 },
        onHit: () => fx.boltBite(ctx.tx - 14, ctx.ty, ctx.aim, 9, tones),
      });
    });
    // The reload is the ability: the string hauls back over 1.25s and the bolt slides home.
    ctx.onFrame((_dt, elapsed) => {
      const since = elapsed - 200;
      hv?.setLoad(since < 0 ? 1 : Phaser.Math.Clamp((since % 1250) / 1250, 0, 1));
    });
  },
};

export const crossbowUpgraded: PreviewScript = {
  duration: 6600,
  caption: 'Tracking Arrows — 3 bolts in one body pings every 3s; +25% speed only as beast or hybrid',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    dummy(ctx, ctx.tx, ctx.ty);
    const muzzle = { x: ctx.cx + 22, y: ctx.cy };
    let studs = 0;
    [200, 800, 1400].forEach((at, i) => {
      ctx.at(at, () => { hv?.play('punch', ctx.aim); fx.boltRelease(ctx.cx + 26, ctx.cy, ctx.aim, 8, tones); });
      bolt(ctx, {
        from: muzzle, to: { x: ctx.tx - 14, y: ctx.ty }, born: at, tones,
        stickAt: { x: ctx.tx - 12, y: ctx.ty - 8 + i * 8 },
        onHit: () => { studs++; fx.boltBite(ctx.tx - 14, ctx.ty, ctx.aim, 9, tones); },
      });
    });
    // Three bolts in, so the transmitter calls home every 3s — the fastest the upgrade gets.
    const label = ctx.adopt(ctx.scene.add.text(ctx.tx, ctx.ty - 46, '', {
      fontSize: '10px', fontFamily: 'Arial Black', color: '#ffcc66',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame(() => label.setText(studs ? `${studs} BOLT${studs > 1 ? 'S' : ''}  ·  PING EVERY ${[0, 9, 6, 3][studs]}s` : ''));
    [2600, 5600].forEach((at) => ctx.at(at, () => {
      fx.boltPing(ctx.tx, ctx.ty, 74, 4, tones);
      shout(ctx, ctx.cx, ctx.cy - 44, 'HUMAN: NO SPEED FROM THE PING', '#886666');
    }));
  },
};

export const blast: PreviewScript = {
  duration: 3000,
  caption: 'E — 15 damage in a 168px, 50° cone and 620 px/s of knockback. Two charges.',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 150;
    dummy(ctx, tx, ctx.ty);
    // Both charges, back to back at the real 0.4s floor — the reason it holds charges at all.
    [400, 900].forEach((at) => ctx.at(at, () => {
      hv?.play('punch', ctx.aim);
      hv?.flashWeapon('shotgun', 1100);
      hv?.kick(1);
      hv?.rack();
      // The pattern IS the ability: 168px and ±25° are exactly what gets hit.
      fx.shotgunBlast(ctx.cx + 20, ctx.cy, ctx.aim, {
        range: 168, halfAngle: Phaser.Math.DegToRad(25), pellets: 18, scale: 1,
        tones, shell: true, depth: 9,
      });
    }));
    ctx.at(1500, () => shout(ctx, ctx.cx + 90, ctx.cy - 40, '2 CHARGES · 6s EACH TO REFILL', '#ffaa44'));
  },
};

export const blastUpgraded: PreviewScript = {
  duration: 5000,
  caption: 'Mine Blast — hold up to 3s: 15 → 35 damage, and a full charge stuns for 3s',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 150;
    dummy(ctx, tx, ctx.ty);
    // The wind-up, repainted exactly as the kit paints it: a ring closing on the muzzle with
    // four powder ticks riding it, snapping white at full.
    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      ring.clear();
      const held = elapsed - 400;
      if (held < 0 || held > 3000) return;
      const k = Phaser.Math.Clamp(held / 3000, 0, 1);
      const mx = ctx.cx + 26, my = ctx.cy;
      ring.lineStyle(2 + k * 2, ctx.tint(k >= 1 ? HUNT.white : tones.wound), 0.4 + k * 0.5);
      ring.strokeCircle(mx, my, 30 - k * 18 + (k >= 1 ? Math.sin(elapsed / 45) * 2 : 0));
      ring.fillStyle(ctx.tint(tones.lit), 0.25 + k * 0.6);
      ring.fillCircle(mx, my, 3 + k * 7);
      for (let i = 0; i < 4; i++) {
        const ta = (i / 4) * Math.PI * 2 + elapsed / 500;
        ring.fillStyle(ctx.tint(tones.spark), 0.35 + k * 0.5);
        ring.fillCircle(mx + Math.cos(ta) * (30 - k * 18), my + Math.sin(ta) * (30 - k * 18), 1.2 + k * 1.6);
      }
    });
    ctx.at(400, () => hv?.flashWeapon('shotgun', 3400));
    ctx.at(3400, () => {
      ring.clear();
      hv?.play('punch', ctx.aim);
      hv?.kick(1.4);
      hv?.rack();
      // Full charge: a fatter pattern, 30 pellets, and the stun.
      fx.shotgunBlast(ctx.cx + 20, ctx.cy, ctx.aim, {
        range: 168, halfAngle: Phaser.Math.DegToRad(25), pellets: 30, scale: 1.5,
        tones, shell: true, depth: 9,
      });
      fx.ring(ctx.cx + 20, ctx.cy, 10, 90, HUNT.white, 400, 4, 9);
      shout(ctx, ctx.cx + 40, ctx.cy - 44, '💣 MINE BLAST · 35 DMG', '#ffaa44');
      shout(ctx, tx, ctx.ty - 34, '💫 STUNNED 3s', '#ffdd66');
    });
  },
};

export const grenade_: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'R — thrown a flat 145px, 3s fuse, then 35 damage in 130px',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    dummy(ctx, ctx.cx + 200, ctx.ty);
    ctx.at(300, () => {
      hv?.play('slam', ctx.aim);
      fx.smoke(ctx.cx + 16, ctx.cy, 2, 10, 5);
    });
    grenade(ctx, {
      from: { x: ctx.cx, y: ctx.cy }, angle: ctx.aim, born: 300, tones,
      onBlow: (x, y) => {
        // The Fx radius the kit uses is 0.72 of the damage radius; the damage still reaches 130.
        fx.frag(x, y, 130 * 0.72, { tones, shards: 12, smoke: 3, duration: 460 });
        fx.ring(x, y, 20, 130, tones.wound, 420, 3, 6);
        shout(ctx, x, y - 44, '35 DMG · 130px', '#ff6600');
      },
    });
  },
};

export const grenadeUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Grenade Combo — shoot your own frag: 35 on the body it hits, 35 more in 92px',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 320;
    dummy(ctx, tx, ctx.ty);
    ctx.at(300, () => { hv?.play('slam', ctx.aim); fx.smoke(ctx.cx + 16, ctx.cy, 2, 10, 5); });
    // The frag is thrown, then swallowed mid-air by a bolt rather than ever going off itself.
    const gx = ctx.cx + 145;
    grenade(ctx, {
      from: { x: ctx.cx, y: ctx.cy }, angle: ctx.aim, born: 300, tones, fuseMs: 1400,
      onBlow: () => { /* consumed by the bolt below — never detonates on its own */ },
    });
    ctx.at(1700, () => {
      fx.flash(gx, ctx.cy, 16, 9, tones);
      fx.smoke(gx, ctx.cy, 2, 14, 6);
      shout(ctx, gx, ctx.cy - 30, '💣 BOMB BOLT', '#ffaa33');
      hv?.play('punch', ctx.aim);
      fx.boltRelease(ctx.cx + 26, ctx.cy, ctx.aim, 8, tones);
    });
    bolt(ctx, {
      from: { x: gx, y: ctx.cy }, to: { x: tx - 14, y: ctx.ty }, born: 1700, tones, bomb: true,
      onHit: () => {
        fx.boltBite(tx - 14, ctx.ty, ctx.aim, 9, tones);
        fx.frag(tx - 14, ctx.ty, 92, { tones, shards: 16, smoke: 4 });
        shout(ctx, tx, ctx.ty - 46, '35 DIRECT + 35 IN 92px', '#ffaa33');
      },
    });
  },
};

export const trail: PreviewScript = {
  duration: 6000,
  caption: 'F — 8s of prints at the quarry\'s feet, each lasting 4s. Standing on one: ×1.5 speed.',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    ctx.at(200, () => {
      hv?.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 30, 8, 4, tones);
      fx.ring(ctx.cx, ctx.cy, 10, 62, tones.wound, 380, 3.5, 4);
      shout(ctx, ctx.cx, ctx.cy - 34, '🐾 ON THE SCENT', '#ff8844');
    });
    // The quarry walks a curve and drops a print every 0.15s, exactly as the kit records it.
    const quarry = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const path = (t: number): { x: number; y: number } => ({
      x: ctx.cx + 90 + t * 300,
      y: ctx.cy - Math.sin(t * Math.PI * 1.6) * 34,
    });
    ctx.onFrame((_dt, elapsed) => {
      quarry.clear();
      const t = Phaser.Math.Clamp((elapsed - 200) / 3600, 0, 1);
      const p = path(t);
      quarry.fillStyle(0x2b2f3d, 1); quarry.fillCircle(p.x, p.y, 15);
      quarry.fillStyle(0x3c4254, 1); quarry.fillCircle(p.x, p.y, 11);
    });
    for (let i = 0; i < 24; i++) {
      const at = 200 + i * 150;
      const p = path(i / 24);
      const nxt = path((i + 1) / 24);
      mark(ctx, { x: p.x, y: p.y, angle: Math.atan2(nxt.y - p.y, nxt.x - p.x), born: at, tones });
    }
    ctx.at(4200, () => shout(ctx, ctx.cx + 200, ctx.cy + 40, 'RUN THE TRACKS: ×1.5 SPEED', '#ffbb77'));
  },
};

export const trailUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'Enhanced Scent — beast on the trail is ×2.81 speed, and hits from it slow 20% for 3s',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    dummy(ctx, ctx.cx + 300, ctx.ty);
    // The marks are already down; the beast is the one standing in them.
    for (let i = 0; i < 8; i++) {
      mark(ctx, {
        x: ctx.cx - 40 + i * 34, y: ctx.cy + 6, angle: 0, born: 0, tones: BEAST_TONES, lifeMs: 6000,
      });
    }
    ctx.at(600, () => {
      fx.bloom(ctx.cx, ctx.cy, 34, 8, 5, tones);
      shout(ctx, ctx.cx, ctx.cy - 46, '×1.5 BEAST · ×1.5 TRAIL · ×1.25 SCENT', '#ffbb77');
    });
    [1800, 3400, 4600].forEach((at) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim);
      hv?.snap(0.8);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, tones);
      shout(ctx, ctx.cx + 300, ctx.ty - 24, '🐾 −20% FOR 3s', '#ffbb77');
    }));
  },
  bodyTexture: 'elem-hunt-beast',
};

export const releaseBeast: PreviewScript = {
  duration: 5200,
  caption: 'Q — not a button. 30s in, 12s as the beast, then 50s before it takes you again.',
  run(ctx) {
    const { fx, hv } = stage(ctx);
    // The clock, then the transform the kit actually plays.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 210, ctx.cy - 56, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ff8866',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      bar.clear();
      const k = Phaser.Math.Clamp(elapsed / 2200, 0, 1);
      label.setText(k < 1 ? `THE BEAST IS COMING — ${Math.ceil(30 - k * 30)}s` : 'BEAST FORM — 12s');
      bar.fillStyle(0x1a0a06, 0.9);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 44, 160, 9, 4);
      bar.fillStyle(k < 1 ? 0xcc4400 : 0x8b0000, 1);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 44, 160 * (k < 1 ? k : 1), 9, 4);
    });
    ctx.at(2200, () => {
      hv?.setForm('beast');
      hv?.setWeapon(null);
      hv?.setIntensity(1.3);
      hv?.play('raise');
      hv?.snap(1);
      fx.transformBeast(ctx.cx, ctx.cy, 52, BEAST_TONES, ctx.aim, 8);
      fx.howl(ctx.cx, ctx.cy, 90, 620, 9, BEAST_TONES);
      shout(ctx, ctx.cx, ctx.cy - 62, '🐺 RELEASE THE BEAST', '#ff3322');
    });
    ctx.at(4400, () => shout(ctx, ctx.cx, ctx.cy - 50, '×1.5 SPEED · 26px HITBOX · CLAWS', '#ff8866'));
  },
};

export const releaseBeastUpgraded: PreviewScript = {
  duration: 5400,
  caption: 'Hybrid Form — keep the shotgun AND the claws; the beast takes the body every 10s instead',
  run(ctx) {
    const { fx, hv } = stage(ctx);
    ctx.at(400, () => {
      hv?.setForm('hybrid');
      hv?.setWeapon('shotgun');
      hv?.setIntensity(1.15);
      hv?.play('raise');
      hv?.snap(0.7);
      fx.transformBeast(ctx.cx, ctx.cy, 46, SILVER_TONES, ctx.aim, 8);
      shout(ctx, ctx.cx, ctx.cy - 58, '🐺 HYBRID FORM', '#ddddee');
    });
    ctx.at(1400, () => shout(ctx, ctx.cx + 190, ctx.cy - 40, 'SHOTGUN · ROLL · HOOK · ADRENALINE', '#ccddee'));
    ctx.at(2400, () => shout(ctx, ctx.cx + 190, ctx.cy - 20, '×1.25 SPEED · 24px HITBOX', '#ccddee'));
    // And the bill: the beast clock is replaced by something worse.
    ctx.at(3400, () => {
      fx.howl(ctx.cx, ctx.cy, 80, 520, 9, BEAST_TONES);
      shout(ctx, ctx.cx, ctx.cy - 58, '👹 THE BEAST TAKES OVER — 3s EVERY 10s', '#ff5533');
    });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

// ══ BEAST FORM ════════════════════════════════════════════════════════════

export const slash: PreviewScript = {
  duration: 3400,
  caption: 'Click — 5 damage, or 15 against a body with a bolt in it (and it rips the bolt out)',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const tx = ctx.cx + 76;
    dummy(ctx, tx, ctx.ty);
    // A bolt already buried, drawn the way the kit draws a stuck one.
    const stub = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    let studded = true;
    ctx.onFrame((_dt, elapsed) => {
      stub.clear();
      if (!studded) return;
      HuntFx.drawBolt(stub, ctx.tint, HUNTER_TONES, tx - 12, ctx.ty - 4, 0, 0.85, 1, false);
    });
    // Clean swipe first, on the real 0.4s cooldown, then the one that finds the handle.
    [400, 900].forEach((at) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim); hv?.snap(0.8);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, tones);
      shout(ctx, tx, ctx.ty - 28, '5', '#cc8877');
    }));
    ctx.at(1700, () => {
      studded = false;
      hv?.play('sweep', ctx.aim); hv?.snap(1);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, tones);
      fx.splatter(tx, ctx.ty, 7, { speed: 190, angle: ctx.aim, spread: 1.1, size: 3, life: 480, depth: 8, tones: BEAST_TONES });
      shout(ctx, tx, ctx.ty - 34, '🩸 BOLT RIPPED OUT — 15', '#ff4444');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const slashUpgraded: PreviewScript = {
  duration: 3600,
  caption: 'Press Advantage — +5 against anything stunned: 10 clean, 20 ripping a bolt out',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const tx = ctx.cx + 76;
    dummy(ctx, tx, ctx.ty);
    ctx.at(300, () => shout(ctx, tx, ctx.ty - 40, '💫 STUNNED', '#ffdd66'));
    // The stun sits on them for the whole loop; every swing lands the bonus.
    const pin = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      pin.clear();
      pin.lineStyle(2, 0xffdd66, 0.35 + 0.25 * Math.sin(elapsed / 180));
      pin.strokeCircle(tx, ctx.ty, 22);
    });
    [700, 1400, 2100, 2800].forEach((at, i) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim); hv?.snap(0.9);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, tones);
      shout(ctx, tx, ctx.ty - 26, i === 3 ? '20' : '10', '#ff6644');
    }));
  },
  bodyTexture: 'elem-hunt-beast',
};

export const pounce: PreviewScript = {
  duration: 3200,
  scale: 0.9,
  caption: 'E — 215px in 0.22s, then 25 damage in 88px where you land',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const land = ctx.cx + 215;
    dummy(ctx, land, ctx.ty);
    ctx.at(400, () => { hv?.play('dash', ctx.aim); hv?.snap(1); });
    ctx.at(620, () => {
      // 215px in 0.22s: the beast crosses the gap, it does not stay behind its own leap.
      ctx.glideCaster({ to: { x: land, y: ctx.cy }, ms: 220, ease: 'out' });
      fx.pounce(ctx.cx, ctx.cy, land, ctx.cy, 5, tones);
      fx.rake(land, ctx.cy, ctx.aim, 110, 4, 8, tones, 18);
      fx.ring(land, ctx.cy, 16, 88, tones.wound, 420, 3, 6);
      shout(ctx, land, ctx.ty - 44, '25 DMG · 88px', '#ff3311');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const pounceUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Searing Slash — three gashes burned into the floor: 4 damage every 0.5s for 6s',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const land = ctx.cx + 215;
    dummy(ctx, land + 30, ctx.ty);
    ctx.at(400, () => { hv?.play('dash', ctx.aim); hv?.snap(1); });
    ctx.at(620, () => {
      // 215px in 0.22s: the beast crosses the gap, it does not stay behind its own leap.
      ctx.glideCaster({ to: { x: land, y: ctx.cy }, ms: 220, ease: 'out' });
      fx.pounce(ctx.cx, ctx.cy, land, ctx.cy, 5, tones);
      fx.rake(land, ctx.cy, ctx.aim, 110, 4, 8, tones, 18);
      shout(ctx, land, ctx.ty - 50, '🔥 SEARING!', '#ff8833');
    });
    // The three patches, at the kit's own ±0.5 rad fan, 34px out, on their real 6s life.
    for (let i = -1; i <= 1; i++) {
      const a = ctx.aim + i * 0.5;
      const px = land + Math.cos(a) * 34;
      const py = ctx.cy + Math.sin(a) * 34;
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
      ctx.onFrame((_dt, elapsed) => {
        g.clear();
        const age = elapsed - 620;
        if (age < 0 || age > 6000) return;
        HuntFx.drawSear(g, ctx.tint, tones, px, py, a + Math.PI / 2, 52, elapsed / 1000, 1 - age / 6000);
      });
    }
    // Ticking at its real 0.5s rate so the drip is legible.
    for (let i = 1; i <= 10; i++) {
      ctx.at(620 + i * 500, () => shout(ctx, land + 30, ctx.ty - 20, '4', '#ff8833'));
    }
  },
  bodyTexture: 'elem-hunt-beast',
};

export const roar: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'R — a 30° cone the length of the arena: −25% speed 5s, and −33% damage taken if it connects',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    dummy(ctx, ctx.cx + 380, ctx.ty);
    ctx.at(500, () => {
      hv?.play('raise'); hv?.snap(1);
      // The cone is drawn the full box diagonal, which is what the kit does with the arena.
      fx.roarCone(ctx.cx, ctx.cy, ctx.aim, Phaser.Math.DegToRad(15), Math.hypot(ctx.w, ctx.h), 9, tones);
      fx.howl(ctx.cx, ctx.cy, 90, 520, 9, tones);
      shout(ctx, ctx.cx + 380, ctx.ty - 34, '🔊 −25% SPEED · 5s', '#ffaa66');
      shout(ctx, ctx.cx, ctx.cy - 52, '🛡️ −33% DAMAGE TAKEN · 5s', '#ffcc88');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const roarUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Primal Fear — they turn their backs and run for 3s, entirely out of their own control',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    // A body that gets driven away by the roar rather than a static mark.
    const foe = { x: ctx.cx + 300, y: ctx.cy };
    let fleeing = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      if (fleeing && elapsed < fleeing + 3000) foe.x += 190 * (dt / 1000);
      g.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(foe.x, foe.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(foe.x, foe.y, 13);
      // Eyes on the far side once they turn — the facing flip is part of the ability.
      const side = fleeing ? 1 : -1;
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(foe.x + side * 5, foe.y - 4, 3.2);
      g.fillCircle(foe.x + side * 9, foe.y - 1, 2.6);
    });
    ctx.at(500, () => {
      hv?.play('raise'); hv?.snap(1);
      fx.roarCone(ctx.cx, ctx.cy, ctx.aim, Phaser.Math.DegToRad(15), Math.hypot(ctx.w, ctx.h), 9, tones);
      fx.howl(ctx.cx, ctx.cy, 90, 520, 9, tones);
    });
    ctx.at(760, () => {
      fleeing = 760;
      shout(ctx, foe.x, foe.y - 40, '😱 PRIMAL FEAR — 3s, NO CONTROL', '#ff6644');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const grapple: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'F — lunge 250px, hold them for 1s, then hurl them at the cursor at 780 px/s',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const caught = ctx.cx + 250;
    // The victim: caught, pinned beside the beast, then thrown.
    const foe = { x: caught, y: ctx.cy };
    let phase: 'wait' | 'held' | 'thrown' = 'wait';
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt) => {
      if (phase === 'held') { foe.x = caught + 40; foe.y = ctx.cy; }
      if (phase === 'thrown') foe.x += 780 * (dt / 1000);
      g.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(foe.x, foe.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(foe.x, foe.y, 13);
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(foe.x - 5, foe.y - 4, 3.2); g.fillCircle(foe.x + 5, foe.y - 4, 3.2);
    });
    ctx.at(500, () => {
      hv?.play('dash', ctx.aim); hv?.snap(1);
      // 250px in 0.24s — the lunge is the reach, so the beast has to arrive on the victim.
      ctx.glideCaster({ to: { x: caught - 34, y: ctx.cy }, ms: 240, ease: 'out' });
      fx.pounce(ctx.cx, ctx.cy, caught, ctx.cy, 5, tones);
    });
    ctx.at(740, () => {
      phase = 'held';
      fx.rake(caught, ctx.cy, ctx.aim, 50, 3, 8, tones);
      shout(ctx, caught + 40, ctx.cy - 40, '🤜 CAUGHT — 1s, STUNNED', '#ffaa66');
    });
    ctx.at(1740, () => {
      phase = 'thrown';
      hv?.play('slam', ctx.aim);
      fx.pounce(caught, ctx.cy, caught + 90, ctx.cy, 6, tones);
      shout(ctx, foe.x, foe.y - 34, '🌀 THROWN — 780 px/s', '#ffcc88');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const grappleUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Wall Slam — into the edge for 20 damage and a 2s stun',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    const caught = ctx.cx + 250;
    const wallX = ctx.w - 34;
    const foe = { x: caught, y: ctx.cy };
    let phase: 'wait' | 'held' | 'thrown' | 'slammed' = 'wait';
    // The wall, so the destination is legible rather than implied.
    const wall = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    wall.fillStyle(0x241009, 1);
    wall.fillRect(wallX, 0, ctx.w - wallX, ctx.h);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt) => {
      if (phase === 'held') { foe.x = caught + 40; foe.y = ctx.cy; }
      if (phase === 'thrown') {
        foe.x += 780 * (dt / 1000);
        if (foe.x >= wallX) {
          foe.x = wallX;
          phase = 'slammed';
          fx.frag(foe.x, foe.y, 62, { tones: BEAST_TONES, shards: 10, smoke: 2, crater: false });
          shout(ctx, foe.x - 40, foe.y - 46, '🧱 WALL SLAM — 20 DMG · 💫 2s', '#ff5533');
        }
      }
      g.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(foe.x, foe.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(foe.x, foe.y, 13);
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(foe.x - 5, foe.y - 4, 3.2); g.fillCircle(foe.x + 5, foe.y - 4, 3.2);
    });
    ctx.at(400, () => {
      hv?.play('dash', ctx.aim); hv?.snap(1);
      ctx.glideCaster({ to: { x: caught - 34, y: ctx.cy }, ms: 240, ease: 'out' });
      fx.pounce(ctx.cx, ctx.cy, caught, ctx.cy, 5, tones);
    });
    ctx.at(640, () => { phase = 'held'; fx.rake(caught, ctx.cy, ctx.aim, 50, 3, 8, tones); });
    ctx.at(1640, () => { phase = 'thrown'; hv?.play('slam', ctx.aim); });
  },
  bodyTexture: 'elem-hunt-beast',
};

export const bloodScent: PreviewScript = {
  duration: 5200,
  caption: 'Q — only if something is at or under 30% HP: +25% attack speed, +20% move speed, 8s',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx, { form: 'beast' });
    dummy(ctx, ctx.tx, ctx.ty);
    // The gate, drawn as the quarry's health bar — the ability is a check before it is a buff.
    const hpbar = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    let hp = 0.8;
    ctx.onFrame(() => {
      hpbar.clear();
      hpbar.fillStyle(0x1a0a06, 1);
      hpbar.fillRect(ctx.tx - 26, ctx.ty - 36, 52, 6);
      hpbar.fillStyle(hp <= 0.3 ? 0xff2244 : 0x66bb66, 1);
      hpbar.fillRect(ctx.tx - 26, ctx.ty - 36, 52 * hp, 6);
    });
    // A refusal first, so the gate is shown rather than described.
    ctx.at(500, () => {
      hv?.play('raise');
      shout(ctx, ctx.cx, ctx.cy - 40, 'NO BLOOD IN THE AIR… (COOLDOWN SPENT)', '#886666');
    });
    ctx.at(1600, () => { hp = 0.24; shout(ctx, ctx.tx, ctx.ty - 48, '24% HP', '#ff2244'); });
    ctx.at(2400, () => {
      hv?.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 40, 10, 6, MOON_TONES);
      shout(ctx, ctx.cx, ctx.cy - 46, '🩸 BLOOD SCENT', '#ff2244');
      // The aura the kit clings to the caster for the whole 8s.
      const aura = ctx.capture(() => new HuntAura(ctx.scene, ctx.tint, tones, 34, 0.9, 4, 7));
      ctx.onFrame((dt) => aura.update(dt, ctx.cx, ctx.cy, 1));
    });
    ctx.at(3400, () => shout(ctx, ctx.cx, ctx.cy - 30, '×0.8 COOLDOWNS · ×1.2 SPEED', '#ff8899'));
  },
  bodyTexture: 'elem-hunt-beast',
};

export const bloodScentUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'Blood Moon — 20s of red sky, +5s as the beast, and the threshold rises to 50% HP',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'beast', moon: true });
    dummy(ctx, ctx.tx, ctx.ty);
    // The sky the kit pins over the arena, painted at the box's own size.
    const sky = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    let moon = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 600) moon = Math.min(1, moon + dt / 600);
      sky.clear();
      if (moon > 0) HuntFx.drawBloodMoonSky(sky, ctx.tint, ctx.w, ctx.h, elapsed / 1000, moon);
    });
    ctx.at(600, () => {
      hv?.setMoon(true);
      hv?.setIntensity(1.45);
      fx.transformBeast(ctx.cx, ctx.cy, 78, MOON_TONES, ctx.aim, 8);
      shout(ctx, ctx.cx, ctx.cy - 58, '🌕 BLOOD MOON', '#ff4444');
    });
    ctx.at(2000, () => shout(ctx, ctx.cx + 150, ctx.cy - 48, '+5s AS THE BEAST', '#ff8877'));
    ctx.at(3200, () => shout(ctx, ctx.tx, ctx.ty - 44, 'BLOOD SCENT FIRES AT 50% HP', '#ff8877'));
    ctx.at(4400, () => {
      hv?.play('flex');
      fx.bloom(ctx.cx, ctx.cy, 40, 10, 6, MOON_TONES);
      shout(ctx, ctx.cx, ctx.cy - 40, '🩸 BLOOD SCENT', '#ff2244');
    });
  },
  bodyTexture: 'elem-hunt-beast',
};

// ══ HYBRID FORM ═══════════════════════════════════════════════════════════

export const hybridShotgun: PreviewScript = {
  duration: 3200,
  caption: 'Click — 15 damage in the same 168px cone, 434 px/s of knockback, every 0.7s',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    dummy(ctx, ctx.cx + 150, ctx.ty);
    [400, 1100, 1800].forEach((at) => ctx.at(at, () => {
      hv?.play('punch', ctx.aim);
      hv?.kick(1);
      hv?.rack();
      fx.shotgunBlast(ctx.cx + 20, ctx.cy, ctx.aim, {
        range: 168, halfAngle: Phaser.Math.DegToRad(25), pellets: 16, scale: 1,
        tones: SILVER_TONES, shell: true, depth: 9,
      });
      shout(ctx, ctx.cx + 150, ctx.ty - 26, '15', '#dddde6');
    }));
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const hybridShotgunUpgraded: PreviewScript = {
  duration: 7200,
  caption: 'Shotgun Pump — right-click racks a shell (+5, max 3). A fourth blows up in your hands.',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    dummy(ctx, ctx.cx + 150, ctx.ty);
    let pumps = 0;
    let overloaded = false;
    // The four-slot gauge the kit floats over the shoulder, drawn by its own static.
    const gauge = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      gauge.clear();
      HuntFx.drawPumpGauge(gauge, ctx.tint, ctx.cx, ctx.cy - 46, Math.min(pumps, 4), overloaded, elapsed / 1000);
    });
    // Three shells at the real 0.5s each, then the shot they bought.
    [300, 800, 1300].forEach((at) => ctx.at(at, () => {
      hv?.rack();
      fx.smoke(ctx.cx, ctx.cy - 6, 1, 8, 7);
      pumps++;
      hv?.setShells(pumps);
      shout(ctx, ctx.cx, ctx.cy - 62, `🔧 PUMP ×${pumps}`, '#ffdd99');
    }));
    ctx.at(2100, () => {
      hv?.play('punch', ctx.aim); hv?.kick(1.45); hv?.rack();
      fx.shotgunBlast(ctx.cx + 20, ctx.cy, ctx.aim, {
        range: 168, halfAngle: Phaser.Math.DegToRad(25), pellets: 34, scale: 1.48,
        tones: SILVER_TONES, shell: true, depth: 9,
      });
      shout(ctx, ctx.cx + 150, ctx.ty - 30, '30 DMG', '#f2f4ff');
      pumps = 0; hv?.setShells(0);
    });
    // Then the mistake: four shells in, and the next trigger pull never leaves the barrel.
    [3200, 3700, 4200, 4700].forEach((at, i) => ctx.at(at, () => {
      hv?.rack();
      pumps = i + 1;
      hv?.setShells(pumps);
      if (i === 3) { overloaded = true; shout(ctx, ctx.cx, ctx.cy - 62, '⚠️ OVERPACKED', '#ff4433'); }
    }));
    ctx.at(5500, () => {
      const bx = ctx.cx + Math.cos(ctx.aim) * 46, by = ctx.cy + Math.sin(ctx.aim) * 46;
      fx.frag(bx, by, 96, { tones: SILVER_TONES, shards: 22, smoke: 5, duration: 620 });
      shout(ctx, ctx.cx, ctx.cy - 58, '💥 IT BLEW UP! 35 IN 96px', '#ff5533');
      shout(ctx, ctx.cx, ctx.cy - 34, '−10 TO YOU', '#ff4466');
      pumps = 0; overloaded = false; hv?.setShells(0);
    });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const roll: PreviewScript = {
  duration: 2600,
  caption: 'E — 215px in 0.3s toward the cursor. Hybrid form has no other way out.',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    ctx.at(500, () => {
      hv?.play('dash', ctx.aim);
      fx.smoke(ctx.cx, ctx.cy, 3, 18, 5);
      // 215px over 0.3s, and the hybrid rides it — the tumble is the only escape the form has.
      ctx.glideCaster({ to: { x: ctx.cx + 215, y: ctx.cy }, ms: 300, ease: 'out' });
      fx.pounce(ctx.cx, ctx.cy, ctx.cx + 215, ctx.cy, 5, SILVER_TONES);
      shout(ctx, ctx.cx + 215, ctx.cy - 34, '215px · 0.3s', '#ccddee');
    });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const rollUpgraded: PreviewScript = {
  duration: 3400,
  caption: 'Untouchable — full invincibility for the 0.3s of the tumble, and not a frame longer',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    // Something incoming, so the immunity has a thing to ignore.
    const shot = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((_dt, elapsed) => {
      shot.clear();
      const age = elapsed - 300;
      if (age < 0 || age > 500) return;
      const x = ctx.tx - (ctx.tx - ctx.cx - 100) * (age / 500);
      shot.fillStyle(0xff5544, 0.9);
      shot.fillCircle(x, ctx.cy, 7);
      shot.fillStyle(0xffaa88, 0.5);
      shot.fillCircle(x + 10, ctx.cy, 4);
    });
    ctx.at(500, () => {
      hv?.play('dash', ctx.aim);
      fx.smoke(ctx.cx, ctx.cy, 3, 18, 5);
      fx.ring(ctx.cx, ctx.cy, 8, 46, HUNT.silver, 300, 3, 7);
      // Rolled straight through the shot: the immunity is only worth anything while moving.
      ctx.glideCaster({ to: { x: ctx.cx + 215, y: ctx.cy }, ms: 300, ease: 'out' });
      shout(ctx, ctx.cx, ctx.cy - 40, '🌀 UNTOUCHABLE', '#aaddff');
    });
    ctx.at(800, () => shout(ctx, ctx.cx, ctx.cy - 24, 'IMMUNITY ENDS WITH THE ROLL', '#8899aa'));
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const hook: PreviewScript = {
  duration: 5600,
  caption: 'R — 800 px/s out to 340px. It latches and waits; press R again to reel at 640 px/s.',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    const foe = { x: ctx.cx + 330, y: ctx.cy };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame(() => {
      g.clear();
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(foe.x, foe.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(foe.x, foe.y, 13);
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(foe.x - 5, foe.y - 4, 3.2); g.fillCircle(foe.x + 5, foe.y - 4, 3.2);
    });
    // The chain, drawn link by link by the kit's own static — it sags in flight and goes taut
    // the moment it catches, which is how you read a hit at a glance.
    const chain = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    let latched = false;
    let reeling = false;
    ctx.onFrame((dt, elapsed) => {
      chain.clear();
      const age = elapsed - 400;
      if (age < 0) return;
      const flightMs = (330 / 800) * 1000;
      if (!latched && age >= flightMs) { latched = true; shout(ctx, foe.x, foe.y - 34, '⚓ HOOKED! (R TO REEL)', '#ccddee'); }
      if (reeling) {
        const d = foe.x - ctx.cx;
        if (d > 56) foe.x -= 640 * (dt / 1000);
      }
      const hx = latched ? foe.x : ctx.cx + Math.min(330, 800 * (age / 1000));
      HuntFx.drawHookChain(chain, ctx.tint, SILVER_TONES, ctx.cx, ctx.cy, hx, ctx.cy, elapsed / 1000, latched);
    });
    ctx.at(400, () => hv?.play('slam', ctx.aim));
    ctx.at(2400, () => {
      reeling = true;
      fx.flash(foe.x, foe.y, 12, 9, SILVER_TONES);
      shout(ctx, ctx.cx + 160, ctx.cy - 40, 'REELING — 640 px/s', '#ccddee');
    });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const hookUpgraded: PreviewScript = {
  duration: 5600,
  caption: 'Scrape — 12 damage per 100px dragged. A full 340px reel is 36.',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    const foe = { x: ctx.cx + 330, y: ctx.cy };
    const start = foe.x;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const chain = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    let latched = false;
    let reeling = false;
    let charged = 0;
    const tally = ctx.adopt(ctx.scene.add.text(ctx.cx + 140, ctx.cy - 52, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#bbccdd',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame((dt, elapsed) => {
      g.clear(); chain.clear();
      const age = elapsed - 300;
      if (age < 0) return;
      if (!latched && age >= (330 / 800) * 1000) latched = true;
      if (reeling && foe.x - ctx.cx > 56) {
        foe.x -= 640 * (dt / 1000);
        // Charged in whole 100px chunks, exactly as the kit meters it.
        const chunks = Math.floor((start - foe.x) / 100);
        if (chunks > charged) {
          charged = chunks;
          fx.splatter(foe.x, foe.y, 4, { speed: 120, angle: 0, spread: 1.2, size: 2.2, life: 400, depth: 8, tones: BEAST_TONES });
          shout(ctx, foe.x, foe.y - 28, '12', '#bbccdd');
        }
      }
      tally.setText(charged ? `${charged * 100}px DRAGGED  ·  ${charged * 12} DAMAGE` : '');
      g.fillStyle(0x2b2f3d, 1); g.fillCircle(foe.x, foe.y, 17);
      g.fillStyle(0x3c4254, 1); g.fillCircle(foe.x, foe.y, 13);
      g.fillStyle(0x8e97ad, 0.9);
      g.fillCircle(foe.x - 5, foe.y - 4, 3.2); g.fillCircle(foe.x + 5, foe.y - 4, 3.2);
      HuntFx.drawHookChain(chain, ctx.tint, SILVER_TONES,
        ctx.cx, ctx.cy, latched ? foe.x : ctx.cx + Math.min(330, 800 * (age / 1000)), ctx.cy,
        elapsed / 1000, latched);
    });
    ctx.at(300, () => hv?.play('slam', ctx.aim));
    ctx.at(1400, () => { reeling = true; fx.flash(foe.x, foe.y, 12, 9, SILVER_TONES); });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const adrenaline: PreviewScript = {
  duration: 7000,
  caption: 'F — 8s at ×1.33 speed and damage, then 5s of crash at ×0.75',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    // One bar for both halves, because the debt is the ability.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 200, ctx.cy - 54, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#66ff99',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      bar.clear();
      const t = elapsed - 400;
      const high = t >= 0 && t < 4000;
      const crash = t >= 4000 && t < 6500;
      label.setText(high ? '💉 ADRENALINE  ×1.33 SPEED & DAMAGE' : crash ? '💤 CRASH  ×0.75 SPEED & DAMAGE' : '');
      label.setColor(crash ? '#8899aa' : '#66ff99');
      if (!high && !crash) return;
      bar.fillStyle(0x14181f, 0.9);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 42, 140, 8, 4);
      bar.fillStyle(high ? 0x66ff99 : 0x8899aa, 1);
      const k = high ? 1 - (t / 4000) : 1 - ((t - 4000) / 2500);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 42, 140 * k, 8, 4);
    });
    ctx.at(400, () => {
      hv?.play('clap');
      fx.syringeJab(ctx.cx, ctx.cy - 6, 9);
      fx.bloom(ctx.cx, ctx.cy, 34, 8, 5, SILVER_TONES);
    });
    ctx.at(4400, () => shout(ctx, ctx.cx, ctx.cy - 36, '💤 CRASH', '#8899aa'));
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const adrenalineUpgraded: PreviewScript = {
  duration: 8000,
  caption: 'Adrenaline Junkie — 6s cooldown, and each delayed crash adds 20 to the bill',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    let delays = 0;
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 200, ctx.cy - 54, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffdd66',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame(() => label.setText(delays ? `⏳ DELAY ×${delays}  ·  ${delays * 20} HP OWED` : ''));
    const jab = (at: number, delaying: boolean): void => ctx.at(at, () => {
      hv?.play('clap');
      fx.syringeJab(ctx.cx, ctx.cy - 6, 9);
      if (delaying) { delays++; shout(ctx, ctx.cx, ctx.cy - 44, `⏳ DELAY ×${delays}`, '#ffdd66'); }
      else shout(ctx, ctx.cx, ctx.cy - 44, '💉 ADRENALINE', '#66ff99');
    });
    jab(300, false);
    jab(2200, true);
    jab(4100, true);
    // And then you stop, and the whole tab lands at once.
    ctx.at(6600, () => {
      fx.splatter(ctx.cx, ctx.cy, 8, { speed: 120, size: 2.6, life: 520, depth: 8, tones: BEAST_TONES, fall: 60 });
      shout(ctx, ctx.cx, ctx.cy - 40, '💤 CRASH', '#8899aa');
      shout(ctx, ctx.cx, ctx.cy - 20, `💔 −${delays * 20} (THE BILL)`, '#ff4466');
    });
  },
  bodyTexture: 'elem-hunt-hybrid',
};

export const giveIn: PreviewScript = {
  duration: 4800,
  caption: 'Q — become the beast permanently. There is no way back to hybrid.',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    ctx.at(700, () => {
      hv?.setForm('beast');
      hv?.setWeapon(null);
      hv?.setIntensity(1.3);
      hv?.play('raise');
      hv?.snap(1);
      fx.transformBeast(ctx.cx, ctx.cy, 52, BEAST_TONES, ctx.aim, 8);
      fx.howl(ctx.cx, ctx.cy, 90, 620, 9, BEAST_TONES);
      shout(ctx, ctx.cx, ctx.cy - 60, '🐺 GIVE IN', '#ff3322');
    });
    ctx.at(2000, () => shout(ctx, ctx.cx + 190, ctx.cy - 40, 'NO SHOTGUN · NO ROLL · NO HOOK', '#997766'));
    ctx.at(3100, () => shout(ctx, ctx.cx + 190, ctx.cy - 20, 'AND NO EXPIRY', '#997766'));
  },
};

export const giveInUpgraded: PreviewScript = {
  duration: 5200,
  caption: 'Alpha — ash-grey instead of blood-red: ×0.67 damage taken and ×0.8 cooldowns, forever',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    // Alpha's own coat, which is the read: a beast that came out on purpose.
    const ALPHA: HuntTones = { crust: 0x2a2c30, body: 0x6d7278, wound: 0x9aa0a8, lit: 0xd6dae0, spark: HUNT.white };
    ctx.at(600, () => {
      hv?.setForm('beast');
      hv?.setWeapon(null);
      hv?.setIntensity(1.3);
      hv?.play('raise');
      hv?.snap(1);
      fx.transformBeast(ctx.cx, ctx.cy, 52, ALPHA, ctx.aim, 8);
      fx.howl(ctx.cx, ctx.cy, 90, 620, 9, ALPHA);
      shout(ctx, ctx.cx, ctx.cy - 60, '🐺 ALPHA', '#ccd4dd');
    });
    ctx.at(1800, () => shout(ctx, ctx.cx + 190, ctx.cy - 44, '🛡️ ×0.67 DAMAGE TAKEN', '#ccd4dd'));
    // The faster claw, shown as claws rather than said.
    [2600, 2920, 3240, 3560].forEach((at) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim); hv?.snap(0.8);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, ALPHA);
    }));
    ctx.at(4000, () => shout(ctx, ctx.cx + 190, ctx.cy - 20, '×0.8 COOLDOWNS — SLASH EVERY 0.32s', '#ccd4dd'));
  },
  bodyTexture: 'elem-hunt-beast',
};

// ══ PASSIVES ══════════════════════════════════════════════════════════════

export const passiveBuriedBolts: PreviewScript = {
  duration: 6400,
  caption: 'Up to 3 bolts stay in one body — and the claw uses them as handles',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 240;
    dummy(ctx, tx, ctx.ty);
    const studs: Array<{ x: number; y: number }> = [];
    const stuck = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame(() => {
      stuck.clear();
      for (const s of studs) HuntFx.drawBolt(stuck, ctx.tint, tones, s.x, s.y, 0, 0.85, 1, false);
    });
    [300, 900, 1500, 2100].forEach((at, i) => {
      ctx.at(at, () => { hv?.play('punch', ctx.aim); fx.boltRelease(ctx.cx + 26, ctx.cy, ctx.aim, 8, tones); });
      bolt(ctx, {
        from: { x: ctx.cx + 22, y: ctx.cy }, to: { x: tx - 14, y: ctx.ty }, born: at, tones,
        onHit: () => {
          fx.boltBite(tx - 14, ctx.ty, ctx.aim, 9, tones);
          // The fourth simply does not lodge.
          if (i < 3) studs.push({ x: tx - 12, y: ctx.ty - 8 + i * 8 });
          else shout(ctx, tx, ctx.ty - 46, 'CAP: 3 — THE FOURTH DOES NOT STICK', '#886666');
        },
      });
    });
    ctx.at(3400, () => {
      hv?.setForm('beast'); hv?.setWeapon(null); hv?.setIntensity(1.3);
      fx.transformBeast(ctx.cx, ctx.cy, 52, BEAST_TONES, ctx.aim, 8);
    });
    // And spent: one bolt per swing, at 15 apiece.
    [4200, 4900, 5600].forEach((at) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim); hv?.snap(1);
      fx.rake(ctx.cx + 200, ctx.cy, ctx.aim, 62, 3, 8, BEAST_TONES);
      studs.pop();
      fx.splatter(tx, ctx.ty, 6, { speed: 180, angle: 0, spread: 1.1, size: 2.8, life: 460, depth: 8, tones: BEAST_TONES });
      shout(ctx, tx, ctx.ty - 30, '🩸 15', '#ff4444');
    }));
  },
};

export const passiveBeastBody: PreviewScript = {
  duration: 5400,
  caption: 'Beast form — ×1.5 speed and a different kit, on a 26px hitbox instead of 22px',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'beast' });
    // The two hitboxes side by side, because a bigger target is the real cost.
    const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      rings.clear();
      if (elapsed < 700) return;
      rings.lineStyle(1.5, 0x6d7278, 0.5);
      rings.strokeCircle(ctx.cx, ctx.cy, 22);
      rings.lineStyle(2, 0xff4433, 0.45 + 0.2 * Math.sin(elapsed / 220));
      rings.strokeCircle(ctx.cx, ctx.cy, 26);
    });
    ctx.at(500, () => {
      hv?.play('raise'); hv?.snap(1);
      fx.transformBeast(ctx.cx, ctx.cy, 52, BEAST_TONES, ctx.aim, 8);
      shout(ctx, ctx.cx, ctx.cy - 60, '×1.5 SPEED', '#ff8866');
    });
    ctx.at(1800, () => shout(ctx, ctx.cx + 30, ctx.cy + 44, '22px → 26px: EASIER TO HIT', '#ff8866'));
    ctx.at(3000, () => shout(ctx, ctx.cx + 200, ctx.cy - 40, 'SLASH · POUNCE · ROAR · GRAPPLE · BLOOD SCENT', '#ff8866'));
    ctx.at(4200, () => shout(ctx, ctx.cx + 200, ctx.cy - 18, 'NO CROSSBOW. NO SHOTGUN.', '#997766'));
  },
  bodyTexture: 'elem-hunt-beast',
};

export const passivePossession: PreviewScript = {
  duration: 6400,
  caption: 'Hybrid — every 10s the spirit takes the body for 3s and runs it at the nearest enemy',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'hybrid' });
    dummy(ctx, ctx.tx, ctx.ty);
    // A countdown to the seizure, then the seizure.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 200, ctx.cy - 58, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ccddee',
    }).setOrigin(0.5).setDepth(12));
    ctx.onFrame((_dt, elapsed) => {
      bar.clear();
      const seized = elapsed >= 2200 && elapsed < 5200;
      label.setText(seized ? '👹 NO MOVEMENT · NO ABILITIES · 3s' : 'THE SPIRIT IS DUE IN 10s');
      label.setColor(seized ? '#ff5533' : '#ccddee');
      bar.fillStyle(0x14181f, 0.9);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 46, 140, 8, 4);
      bar.fillStyle(seized ? 0xff5533 : 0x9aa0ab, 1);
      const k = seized ? 1 - (elapsed - 2200) / 3000 : Phaser.Math.Clamp(elapsed / 2200, 0, 1);
      bar.fillRoundedRect(ctx.cx + 130, ctx.cy - 46, 140 * k, 8, 4);
    });
    ctx.at(2200, () => {
      fx.howl(ctx.cx, ctx.cy, 80, 520, 9, BEAST_TONES);
      shout(ctx, ctx.cx, ctx.cy - 62, '👹 THE BEAST TAKES OVER', '#ff5533');
    });
    // It runs at whatever is nearest and swings on its own 0.38s rhythm.
    for (let i = 0; i < 7; i++) {
      ctx.at(2700 + i * 380, () => {
        hv?.play('sweep', ctx.aim);
        fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, BEAST_TONES);
      });
    }
    ctx.at(5200, () => shout(ctx, ctx.cx, ctx.cy - 40, 'YOU HAVE IT BACK.', '#aab4c0'));
  },
  bodyTexture: 'elem-hunt-hybrid',
};

// ══ PERKS ═════════════════════════════════════════════════════════════════

export const perkRage: PreviewScript = {
  duration: 6600,
  caption: 'Rage — 10/s standing on your own tracks; at 100 the beast comes out early at ×0.5 damage taken',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    // Marks under the caster, held their perk-extended 6s.
    for (let i = 0; i < 7; i++) {
      mark(ctx, { x: ctx.cx - 50 + i * 30, y: ctx.cy + 6, angle: 0, born: 0, tones, lifeMs: 6000 });
    }
    const meter = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const label = ctx.adopt(ctx.scene.add.text(ctx.cx + 200, ctx.cy - 56, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#cc2233',
    }).setOrigin(0.5).setDepth(12));
    let rage = 0;
    let popped = false;
    ctx.onFrame((dt, elapsed) => {
      if (!popped && elapsed > 400) rage = Math.min(100, rage + 10 * (dt / 1000) * 3.4);
      meter.clear();
      label.setText(popped ? '🩸 BEAST OUT — ×0.5 DAMAGE TAKEN' : `RAGE ${Math.floor(rage)} / 100`);
      meter.fillStyle(0x1a0a06, 0.9);
      meter.fillRoundedRect(ctx.cx + 130, ctx.cy - 44, 140, 9, 4);
      meter.fillStyle(popped ? 0x8b0000 : 0xcc2233, 1);
      meter.fillRoundedRect(ctx.cx + 130, ctx.cy - 44, 140 * (popped ? 1 : rage / 100), 9, 4);
      if (rage >= 100 && !popped) {
        popped = true;
        hv?.setForm('beast'); hv?.setWeapon(null); hv?.setIntensity(1.3);
        hv?.play('raise'); hv?.snap(1);
        fx.transformBeast(ctx.cx, ctx.cy, 52, BEAST_TONES, ctx.aim, 8);
        fx.ring(ctx.cx, ctx.cy, 20, 90, 0xcc2233, 380, 4, 8);
        shout(ctx, ctx.cx, ctx.cy - 62, '🩸 RAGE', '#cc2233');
      }
    });
    ctx.at(600, () => shout(ctx, ctx.cx, ctx.cy + 46, 'MARKS LAST 6s INSTEAD OF 4s', '#ffbb77'));
  },
};

export const perkHell: PreviewScript = {
  duration: 5600,
  caption: 'Hell — a hellhound instead: ×1.3 damage, ×1.95 speed, an 18px hitbox, ×1.25 taken',
  run(ctx) {
    const { fx, hv } = stage(ctx, { form: 'beast', hell: true });
    dummy(ctx, ctx.cx + 76, ctx.ty);
    ctx.at(500, () => {
      hv?.play('raise'); hv?.snap(1);
      // The hound comes out at 44 rather than the beast's 52 — it is the smaller shape.
      fx.transformBeast(ctx.cx, ctx.cy, 44, HELL_TONES, ctx.aim, 8);
      shout(ctx, ctx.cx, ctx.cy - 58, '🐕‍🦺 HELLHOUND', '#ff6600');
    });
    const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      rings.clear();
      if (elapsed < 900) return;
      rings.lineStyle(1.5, 0x6d7278, 0.4);
      rings.strokeCircle(ctx.cx, ctx.cy, 26);
      rings.lineStyle(2, 0xffcc66, 0.45 + 0.2 * Math.sin(elapsed / 200));
      rings.strokeCircle(ctx.cx, ctx.cy, 18);
    });
    // Faster claws, at the ×0.833 cooldown the perk actually applies.
    [1600, 1933, 2266, 2600, 2933].forEach((at) => ctx.at(at, () => {
      hv?.play('sweep', ctx.aim); hv?.snap(0.9);
      fx.rake(ctx.cx + 44, ctx.cy, ctx.aim, 62, 3, 8, HELL_TONES);
      shout(ctx, ctx.cx + 76, ctx.ty - 26, '×1.3', '#ffcc66');
    }));
    ctx.at(3600, () => shout(ctx, ctx.cx, ctx.cy + 44, '26px → 18px HITBOX', '#ffcc66'));
    ctx.at(4400, () => shout(ctx, ctx.cx, ctx.cy - 40, 'BUT ×1.25 DAMAGE TAKEN', '#ff4444'));
  },
  bodyTexture: 'elem-hunt-beast',
};

// ══ MASTERY ═══════════════════════════════════════════════════════════════

export const masteryWeakPoints: PreviewScript = {
  duration: 8000,
  caption: 'Mastery passive — a 60° seam sweeping at 0.9 rad/s; come in through it for ×2 damage',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 300;
    dummy(ctx, tx, ctx.ty);
    // The real wedge, spinning at the kit's own 0.9 rad/s around the target.
    const wedge = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let angle = Math.PI;
    ctx.onFrame((dt, elapsed) => {
      angle = Phaser.Math.Angle.Wrap(angle + 0.9 * (dt / 1000));
      HuntFx.drawWeakWedge(wedge, tx, ctx.ty, angle, 0.5 + 0.5 * Math.sin(elapsed / 260));
    });
    // Four bolts fired blind. The ones that arrive while the seam faces you double.
    [400, 2200, 4000, 5800].forEach((at) => {
      ctx.at(at, () => { hv?.play('punch', ctx.aim); fx.boltRelease(ctx.cx + 26, ctx.cy, ctx.aim, 8, tones); });
      bolt(ctx, {
        from: { x: ctx.cx + 22, y: ctx.cy }, to: { x: tx - 14, y: ctx.ty }, born: at, tones,
        onHit: () => {
          // The angle is measured from where the shot came from — straight left of the target.
          const inSeam = Math.abs(Phaser.Math.Angle.Wrap(Math.PI - angle)) <= Math.PI / 6;
          fx.boltBite(tx - 14, ctx.ty, ctx.aim, 9, tones);
          if (inSeam) {
            fx.rake(tx, ctx.ty, angle + Math.PI, 40, 3, 9, BEAST_TONES, 8);
            fx.splatter(tx, ctx.ty, 5, { speed: 150, angle: angle + Math.PI, spread: 1.2, size: 2.4, life: 380, depth: 9, tones: BEAST_TONES });
            shout(ctx, tx, ctx.ty - 46, '🎯 WEAK POINT — 60', '#ff5555');
          } else {
            shout(ctx, tx, ctx.ty - 34, '30', '#cc8877');
          }
        },
      });
    });
  },
};

export const masteryBeastling: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Mastery — a 15s pup: bites 5 every 2s, double on a studded target, and fetches your grenades',
  run(ctx) {
    const { fx, hv, tones } = stage(ctx);
    const tx = ctx.cx + 330;
    dummy(ctx, tx, ctx.ty);
    // The pup, drawn by the kit's own `drawBeastling` and walked at its real 210 px/s.
    const pupG = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const pup = {
      x: ctx.cx - 30, y: ctx.cy + 16, gait: 0, tailPhase: 0, earLag: 0,
      blinkUntil: 0, nextBlinkAt: 1800, lungeUntil: 0, carrying: false, heading: 0,
    };
    let dest = { x: ctx.cx - 30, y: ctx.cy + 16 };
    let arriveR = 12;
    ctx.onFrame((dtms, elapsed) => {
      if (elapsed < 500) { pupG.clear(); return; }
      const dt = dtms / 1000;
      const dx = dest.x - pup.x, dy = dest.y - pup.y;
      const d = Math.hypot(dx, dy);
      if (d > arriveR) {
        const step = Math.min(210 * dt, d - arriveR);
        pup.x += (dx / d) * step; pup.y += (dy / d) * step;
        pup.heading = Math.atan2(dy, dx);
        pup.gait += step / 7;
      } else {
        pup.gait += dt * 1.6;
      }
      pup.tailPhase += dt * (pup.carrying ? 15 : 8);
      pup.earLag += (Math.sin(pup.gait * 0.5) * 0.25 - pup.earLag) * Math.min(1, dt * 6);
      if (elapsed >= pup.nextBlinkAt) { pup.blinkUntil = elapsed + 110; pup.nextBlinkAt = elapsed + 2400; }
      HuntFx.drawBeastling(pupG, pup.x, pup.y, elapsed, false, pup);
    });
    ctx.at(500, () => {
      hv?.play('sweep');
      fx.bloom(ctx.cx - 30, ctx.cy + 16, 22, 7, 5, tones);
      fx.smoke(ctx.cx - 30, ctx.cy + 16, 3, 16, 4);
      shout(ctx, ctx.cx, ctx.cy - 44, '🐕 BEASTLING! 15s', '#d9a066');
    });
    // It goes for whoever is closest and bites on its real 2s clock.
    ctx.at(900, () => { dest = { x: tx - 30, y: ctx.ty + 10 }; arriveR = 26; });
    [2200, 4200].forEach((at) => ctx.at(at, () => {
      pup.lungeUntil = at + 200;
      fx.rake(pup.x + 16, pup.y, 0, 26, 2, 8, tones, 9);
      fx.splatter(pup.x + 16, pup.y, 3, { speed: 110, angle: 0, spread: 1.2, size: 2.2, life: 400, depth: 8, tones: BEAST_TONES });
      shout(ctx, tx, ctx.ty - 26, '5', '#d9a066');
    }));
    // Then the trick nobody expects: it fetches the frag and the fuse stops in its mouth.
    ctx.at(5000, () => {
      hv?.play('slam', ctx.aim);
      dest = { x: ctx.cx + 150, y: ctx.cy };
      arriveR = 8;
    });
    grenade(ctx, {
      from: { x: ctx.cx, y: ctx.cy }, angle: ctx.aim, born: 5000, tones, fuseMs: 9000,
    });
    ctx.at(6000, () => {
      pup.carrying = true;
      dest = { x: tx - 40, y: ctx.ty };
      arriveR = 20;
      shout(ctx, pup.x, pup.y - 30, '🐕 GOT IT! FUSE FROZEN', '#ffcc66');
    });
    ctx.at(7600, () => {
      pup.carrying = false;
      fx.frag(tx - 20, ctx.ty, 130 * 0.72, { tones, shards: 12, smoke: 3, duration: 460 });
      shout(ctx, tx, ctx.ty - 48, '🐕 FETCH! — 35 IN 130px', '#ffaa44');
    });
  },
};
