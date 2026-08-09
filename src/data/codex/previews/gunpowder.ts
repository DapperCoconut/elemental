import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  GUNPOWDER, GunpowderAura, GunpowderAvatar, GunpowderFx, musket,
} from '../../../elements/kits/GunpowderVisuals';

/**
 * Gunpowder's showcases.
 *
 * Muskets on the floor, the vacuum cone, grenades, rockets and firework tubes are all
 * `GunpowderVisuals` painters driven from live state, so these loops keep their own arrays and
 * call the same `musket()`, `GunpowderFx.drawVacuumCone`, `drawGrenade`, `drawFireworkTube` and
 * `drawFireworkFlight` the kit calls. `muzzle`, `boom`, `smoke` and `tracer` are its one-shots.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt`; `GunpowderFx` instances carry a sticky sink and need no help.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: GunpowderFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new GunpowderFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new GunpowderAvatar(ctx.scene, ctx.tint, 'player'));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    return g;
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

interface Musket { x: number; y: number; angle: number; born: number; hotMs: number; bayonet?: boolean }

/** Spent muskets lying on the floor, glowing until they cool. */
function musketLayer(ctx: PreviewCtx, muskets: Musket[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (const m of muskets) {
      const heat = Phaser.Math.Clamp(1 - (elapsed - m.born) / m.hotMs, 0, 1);
      musket(g, ctx.tint, m.x, m.y, m.angle, 26, heat, 1);
    }
  });
}

// ══ CLICK — Musket Shot ═══════════════════════════════════════════════

export const musketShot: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Click — 35 damage at 900 px/s, three shots, each gun dropped behind you for 12s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const muskets: Musket[] = [];
    musketLayer(ctx, muskets);
    let ammo = 3;
    const readout = label(ctx, ctx.cx, ctx.cy + 34, '#ffcc55', 11);
    ctx.onFrame(() => readout.setText(ammo > 0 ? `🔫 ${ammo}/3` : '🔫 Empty!'));

    const shot = (delay: number): void => ctx.at(delay, () => {
      if (ammo <= 0) { float(ctx, ctx.cx, ctx.cy - 30, '🔫 Empty!', '#886644', 11); return; }
      ammo--;
      av.play('punch', ctx.aim);
      fx.muzzle(ctx.cx + 26, ctx.cy, ctx.aim, 1, 10);
      ctx.fly({
        texture: 'proj-gunpowder-musket', from: { x: ctx.cx, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        speed: 900,
        onHit: () => {
          fx.sparks(ctx.tx, ctx.ty, 6, ctx.aim, 10, GUNPOWDER.chrome);
          float(ctx, ctx.tx, ctx.ty - 24, '35', '#ffcc55', 15);
        },
      });
      // The spent gun thrown down 68px behind, glowing for 12s.
      const mx = ctx.cx - 68, my = ctx.cy + (ammo - 1) * 14;
      muskets.push({ x: mx, y: my, angle: 0.3 - ammo * 0.3, born: delay, hotMs: 12000 });
      fx.smoke(mx, my, 2, { radius: 6, life: 900, depth: 4 });
    });
    shot(400);
    shot(900);
    shot(1400);
    shot(2400);
    ctx.at(3200, () => float(ctx, ctx.cx - 68, ctx.cy + 34, 'cooling — walk back over them', '#9a8f94', 10));
  },
};

export const musketShotUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Attached Bayonet — the gun is thrown at the cursor for 10, then stakes the floor for 10/s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.tx, y: ctx.ty };
    dummy(ctx, victim.x, victim.y);
    const muskets: Musket[] = [];
    musketLayer(ctx, muskets);
    const flying: { x: number; y: number; vx: number; angle: number; live: boolean }[] = [];
    const fg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.muzzle(ctx.cx + 26, ctx.cy, ctx.aim, 1, 10);
      ctx.fly({
        texture: 'proj-gunpowder-musket', from: { x: ctx.cx, y: ctx.cy }, to: { x: victim.x, y: victim.y },
        speed: 900,
        onHit: () => float(ctx, victim.x, victim.y - 26, '35', '#ffcc55', 15),
      });
      // The gun itself follows, blade first, at 640 px/s.
      flying.push({ x: ctx.cx, y: ctx.cy, vx: 640, angle: 0, live: true });
    });

    ctx.onFrame((dt, elapsed) => {
      fg.clear();
      for (const f of flying) {
        if (!f.live) continue;
        f.x += f.vx * (dt / 1000);
        musket(fg, ctx.tint, f.x, f.y, f.angle, 26, 1, 1);
        if (Phaser.Math.Distance.Between(f.x, f.y, victim.x, victim.y) <= 24) {
          f.live = false;
          fx.sparks(victim.x, victim.y, 6, f.angle, 10, GUNPOWDER.chrome);
          fx.shrapnel(victim.x, victim.y, 4, {
            speed: 200, angle: f.angle + Math.PI, spread: 0.8, size: 6, color: GUNPOWDER.wood, depth: 10,
          });
          float(ctx, victim.x, victim.y - 40, '10', '#d8e0e8', 12);
          muskets.push({ x: f.x, y: f.y, angle: f.angle, born: elapsed, hotMs: 12000, bayonet: true });
        }
      }
    });

    // And it keeps cutting whoever stands on it, once a second.
    for (let i = 1; i <= 3; i++) {
      ctx.at(2200 + i * 1000, () => {
        const m = muskets[0];
        if (!m) return;
        fx.sparks(m.x, m.y, 4, -Math.PI / 2, 10, GUNPOWDER.chrome);
        float(ctx, m.x, m.y - 22, '10', '#aaaaaa', 11);
      });
    }
  },
};

// ══ E — Explosive Retreat ═════════════════════════════════════════════

/** Both retreat loops are the same kick; Double Barrel is the second charge. */
function retreatScript(doubleBarrel: boolean): PreviewScript {
  return {
    duration: 4600,
    scale: 0.85,
    bodyTexture: '',
    caption: doubleBarrel
      ? 'Double Barrel — a second 20 behind you as well, and a 300 shove out of your landing spot'
      : 'E — 20 in 45px in front, 620 of recoil backwards, and 0.22s untouchable',
    run(ctx) {
      const fx = ctx.capture(() => new GunpowderFx(ctx.scene, ctx.tint).setSink(ctx.sink));
      const at = { x: ctx.cx + 80, y: ctx.cy };
      if (ctx.scene.textures.exists('elem-gunpowder')) {
        const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-gunpowder').setDepth(5));
        ctx.onFrame(() => body.setPosition(at.x, at.y));
      }
      const av = ctx.useAvatar(() => new GunpowderAvatar(ctx.scene, ctx.tint, 'player'));
      ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
      const front = { x: at.x + 200, y: at.y };
      const back = { x: at.x - 150, y: at.y };
      dummy(ctx, front.x, front.y);
      if (doubleBarrel) dummy(ctx, back.x, back.y);

      ctx.at(600, () => {
        av.play('dash', 0);
        const fx1 = at.x + 65;
        fx.boom(fx1, at.y, 55, { color: GUNPOWDER.blaze, petals: 7, shrapnel: 6 });
        float(ctx, fx1, at.y - 30, '20', '#ffaa33', 13);
        fx.smoke(at.x, at.y, 4, { angle: 0, spread: 1.4, radius: 8, life: 900, depth: 5 });
        if (doubleBarrel) {
          const bx = at.x - 65;
          fx.boom(bx, at.y, 55, { color: GUNPOWDER.blaze, petals: 7, shrapnel: 6 });
          float(ctx, bx, at.y - 30, '20', '#ffaa33', 13);
          float(ctx, back.x, back.y - 26, 'SHOVED 300', '#ff8866', 10);
        }
        float(ctx, at.x, at.y - 44, '💥 EXPLOSIVE RETREAT', '#ffaa33', 11);
        // 620 backwards, cut off at 220ms, invincible throughout.
        let vx = -620;
        const stop = 820;
        ctx.onFrame((dt, elapsed) => {
          if (elapsed > stop) vx = 0;
          at.x += vx * (dt / 1000);
        });
        for (const d of [0, 120]) ctx.at(d, () => float(ctx, at.x, at.y - 20, 'IMMUNE', '#ffcc55', 9));
      });
    },
  };
}

export const explosiveRetreat = retreatScript(false);
export const explosiveRetreatUpgraded = retreatScript(true);

// ══ R — Fire at Will ══════════════════════════════════════════════════

/** The arsenal HUD row the kit keeps at the bottom of the screen. */
function arsenalRow(ctx: PreviewCtx, slots: string[], cap: number): void {
  const size = 22;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
  const icons: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < cap; i++) {
    icons.push(ctx.adopt(ctx.scene.add.text(0, 0, '', { fontSize: '15px' }).setOrigin(0.5).setDepth(14)));
  }
  ctx.onFrame(() => {
    const x0 = ctx.w * 0.5 - (cap * (size + 4)) / 2;
    g.clear();
    for (let i = 0; i < cap; i++) {
      const x = x0 + i * (size + 4);
      g.fillStyle(ctx.tint(GUNPOWDER.soot), 0.9);
      g.fillRect(x, 8, size, size);
      g.lineStyle(1.4, ctx.tint(slots[i] ? GUNPOWDER.brass : GUNPOWDER.char), 1);
      g.strokeRect(x, 8, size, size);
      icons[i].setPosition(x + size / 2, 8 + size / 2).setText(slots[i] ?? '');
    }
  });
}

/** Both volley loops fire the whole bag at once; R+ is six slots instead of three. */
function fireAtWillScript(expanded: boolean): PreviewScript {
  const slots = expanded
    ? ['🔫', '🎯', '💣', '🚀', '🔭', '💨']
    : ['🔫', '🎯', '💣'];
  return {
    duration: 5600,
    scale: 0.85,
    caption: expanded
      ? 'Expanded Arsenal — six slots, and a discarded gun misfires once before it leaves'
      : 'R — every weapon in the bag fires at once; pistols shorten the cooldown, RPGs lengthen it',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      dummy(ctx, ctx.tx, ctx.ty);
      arsenalRow(ctx, slots, expanded ? 6 : 3);
      const readout = label(ctx, ctx.cx, ctx.cy + 34, '#dd8833', 10);

      ctx.at(600, () => {
        av.play('sweep', ctx.aim);
        fx.smoke(ctx.cx, ctx.cy, 2 + slots.length * 2, {
          angle: ctx.aim, spread: 1.6, radius: 8, life: 1100, depth: 5,
        });
        float(ctx, ctx.cx, ctx.cy - 40, '🔥 FIRE AT WILL', '#dd8833', 12);
        // Every barrel down the same line, each with its own figure.
        const shots: [string, number, number][] = expanded
          ? [['🔫', 10, 0], ['🎯', 15, 60], ['💣', 0, 120], ['🚀', 20, 180], ['🔭', 20, 240], ['💨', 20, 300]]
          : [['🔫', 10, 0], ['🎯', 15, 90], ['💣', 0, 180]];
        for (const [icon, dmg, delay] of shots) {
          ctx.at(delay, () => {
            fx.muzzle(ctx.cx + 26, ctx.cy + (Math.random() - 0.5) * 16, ctx.aim, 1, 10);
            fx.tracer(ctx.cx + 26, ctx.cy, ctx.tx, ctx.ty, GUNPOWDER.gold, 10, 160);
            if (dmg > 0) float(ctx, ctx.tx, ctx.ty - 24, `${icon} ${dmg}`, '#ffcc55', 12);
            else {
              // The grenade launcher's lob, on its short fuse.
              const gg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
              const gp = { x: ctx.cx + 26, y: ctx.cy };
              ctx.onFrame((dt2, elapsed) => {
                gg.clear();
                if (gp.x > ctx.tx) return;
                gp.x += 420 * (dt2 / 1000);
                GunpowderFx.drawGrenade(gg, ctx.tint, gp.x, gp.y - 14, 0.5, elapsed * 0.006, elapsed / 1000);
              });
              ctx.at(700, () => {
                gg.clear();
                fx.boom(ctx.tx, ctx.ty, 60, { color: GUNPOWDER.blaze, petals: 8, shrapnel: 8 });
                float(ctx, ctx.tx, ctx.ty - 40, '💣 blast', '#ffaa33', 12);
              });
            }
          });
        }
        readout.setText(expanded
          ? '−0.9s from the pistol, +1.8s from the RPG'
          : '−0.9s from the pistol');
      });
    },
  };
}

export const fireAtWill = fireAtWillScript(false);
export const fireAtWillUpgraded = fireAtWillScript(true);

// ══ F — Arsenal Expansion ═════════════════════════════════════════════

/** Both expansion loops open the same three-card offer; F+ draws from thirteen. */
function expansionScript(depot: boolean): PreviewScript {
  const offer = depot
    ? [['🌪️', 'Minigun', '30 × 2, slows you 50%'], ['❄️', 'Freeze-Ray', '3 + 1s stun'], ['⚔️', 'Gunblade', '10 far / 15 close']]
    : [['🔫', 'Pistol', '10 hitscan'], ['💨', 'Shotgun', '10 × 2 pellets'], ['🎯', 'Rifle', '15, +25% musket']];
  return {
    duration: 5600,
    scale: 0.85,
    caption: depot
      ? 'Weapons Depot — seven exotics join the pool, each with its own drawback'
      : 'F — three of the six base weapons offered; take one, and the cooldown is refunded',
    run(ctx) {
      const { av } = stage(ctx, { noDummy: true });
      const slots: string[] = [];
      arsenalRow(ctx, slots, 3);
      const cards = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
      const texts: Phaser.GameObjects.Text[] = [];
      let open = false;
      let picked = -1;

      for (let i = 0; i < 3; i++) {
        texts.push(ctx.adopt(ctx.scene.add.text(0, 0, '', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#ffcc55',
        }).setOrigin(0, 0.5).setDepth(13)));
      }
      ctx.onFrame(() => {
        cards.clear();
        if (!open) { for (const t of texts) t.setText(''); return; }
        const w = 210, h = 26, x = ctx.w * 0.5 - w / 2, y0 = ctx.cy - 44;
        for (let i = 0; i < 3; i++) {
          const y = y0 + i * (h + 6);
          cards.fillStyle(ctx.tint(GUNPOWDER.soot), 0.95);
          cards.fillRect(x, y, w, h);
          cards.lineStyle(1.6, ctx.tint(i === picked ? GUNPOWDER.gold : GUNPOWDER.brass), 1);
          cards.strokeRect(x, y, w, h);
          texts[i].setPosition(x + 8, y + h / 2)
            .setText(`${offer[i][0]}  ${offer[i][1]} — ${offer[i][2]}`)
            .setColor(i === picked ? '#ffeeaa' : '#ffcc55');
        }
      });

      ctx.at(500, () => {
        open = true;
        av.play('flex');
        float(ctx, ctx.cx, ctx.cy + 34, depot ? 'drawn from all 13' : 'drawn from the base 6', '#9a8f94', 10);
      });
      ctx.at(2600, () => { picked = 1; });
      ctx.at(3200, () => {
        open = false;
        slots.push(offer[1][0]);
        float(ctx, ctx.cx, ctx.cy - 30, `+${offer[1][1]}`, '#ffaa44', 12);
      });
    },
  };
}

export const arsenalExpansion = expansionScript(false);
export const arsenalExpansionUpgraded = expansionScript(true);

// ══ Q — BlunderBlast ══════════════════════════════════════════════════

/** Both hoover loops swallow and return; Q+ is a wider mouth and a hotter cough. */
function blunderScript(vortex: boolean): PreviewScript {
  return {
    duration: 8600,
    scale: 0.7,
    caption: vortex
      ? 'Vortex Cannon — a 240px, 45° mouth, and the hoard comes back at 225% and on fire'
      : 'Q — a 180px, 30° cone for 5s; the next Musket Shot returns the hoard at 200%',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const shooter = { x: ctx.w * 0.82, y: ctx.cy };
      dummy(ctx, shooter.x, shooter.y);
      const radius = vortex ? 240 : 180;
      const half = vortex ? Math.PI / 8 : Math.PI / 12;
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
      let coneUntil = -1;
      let hoard = 0;
      const readout = label(ctx, ctx.w * 0.5, 12, '#cfd4da', 11);

      ctx.onFrame((_dt, elapsed) => {
        g.clear();
        if (coneUntil < 0) return;
        if (elapsed < coneUntil) {
          GunpowderFx.drawVacuumCone(g, ctx.tint, ctx.cx, ctx.cy, ctx.aim, radius, half, elapsed / 1000, hoard);
          readout.setText(`cone ${((coneUntil - elapsed) / 1000).toFixed(1)}s   —   ${hoard} swallowed`);
        } else {
          readout.setText(hoard > 0 ? `${hoard} armed — the next Musket Shot returns them` : '');
        }
      });

      ctx.at(400, () => {
        coneUntil = 5400;
        av.play('raise', ctx.aim, 700);
        fx.ring(ctx.cx, ctx.cy, radius * 0.9, 20, GUNPOWDER.silver, 480, 7, 3);
        float(ctx, ctx.cx, ctx.cy - 40, '🌀 BLUNDERBLAST', '#cfd4da', 12);
        // Their shots drifting into the mouth and being dragged down it.
        for (let i = 0; i < 6; i++) {
          ctx.at(300 + i * 600, () => ctx.fly({
            texture: 'proj-fire', from: { x: shooter.x, y: shooter.y + (i % 3 - 1) * 30 },
            to: { x: ctx.cx + radius * 0.8, y: ctx.cy + (i % 3 - 1) * 10 }, speed: 420,
            onHit: () => {
              hoard++;
              fx.sparks(ctx.cx + radius * 0.8, ctx.cy, 3, Math.PI, 10, GUNPOWDER.chrome);
              float(ctx, ctx.cx + radius * 0.8, ctx.cy - 20, 'SWALLOWED', '#cfd4da', 9);
            },
          }));
        }
      });

      // Then the trigger: the whole hoard back out in a 30° fan.
      ctx.at(6400, () => {
        if (hoard <= 0) return;
        av.play('punch', ctx.aim);
        fx.muzzle(ctx.cx + 26, ctx.cy, ctx.aim, 1.8, 10, vortex ? GUNPOWDER.ember : GUNPOWDER.blaze);
        for (let i = 0; i < hoard; i++) {
          const a = ctx.aim + ((i / Math.max(1, hoard - 1)) - 0.5) * (Math.PI / 6);
          ctx.fly({
            texture: 'proj-fire',
            from: { x: ctx.cx + 26, y: ctx.cy },
            to: { x: ctx.cx + Math.cos(a) * 900, y: ctx.cy + Math.sin(a) * 900 },
            speed: 620, pierce: true,
          });
        }
        float(ctx, ctx.cx, ctx.cy - 44, vortex ? `${hoard} × 225% — ON FIRE` : `${hoard} × 200%`,
          vortex ? '#ff7733' : '#cfd4da', 12);
        if (vortex) {
          ctx.at(400, () => {
            fx.boom(shooter.x, shooter.y, 55, { color: GUNPOWDER.ember, petals: 6, shrapnel: 5 });
            float(ctx, shooter.x, shooter.y - 26, '🔥 burning 3s', '#ff7733', 10);
          });
        }
      });
    },
  };
}

export const blunderBlast = blunderScript(false);
export const blunderBlastUpgraded = blunderScript(true);

// ══ Passives ══════════════════════════════════════════════════════════

export const passiveThreeMuskets: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Three muskets, each thrown down behind you and cooling for 12s before you can retake it',
  run(ctx) {
    const fx = ctx.capture(() => new GunpowderFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx + 120, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-gunpowder')) {
      const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-gunpowder').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new GunpowderAvatar(ctx.scene, ctx.tint, 'player'));
    ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
    const muskets: Musket[] = [];
    musketLayer(ctx, muskets);
    let ammo = 3;
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffcc55', 11);
    // A shortened cooling clock so a loop can show the whole cycle.
    const HOT = 3000;
    ctx.onFrame((_dt, elapsed) => {
      const cooled = muskets.filter((m) => elapsed - m.born >= m.hotMs).length;
      readout.setText(`🔫 ${ammo}/3 carried   —   ${muskets.length} down, ${cooled} cooled`);
    });

    for (let i = 0; i < 3; i++) {
      ctx.at(400 + i * 500, () => {
        ammo--;
        av.play('punch', 0);
        fx.muzzle(at.x + 26, at.y, 0, 1, 10);
        const mx = at.x - 68 - i * 40, my = at.y + (i - 1) * 12;
        muskets.push({ x: mx, y: my, angle: 0.2 * i, born: 400 + i * 500, hotMs: HOT });
        fx.smoke(mx, my, 2, { radius: 6, life: 900, depth: 4 });
      });
    }
    ctx.at(2200, () => float(ctx, at.x, at.y - 30, '🔫 Empty!', '#886644', 12));
    // Then the walk back — the only reload this element has.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 3200) return;
      at.x -= 80 * (dt / 1000);
      for (let i = muskets.length - 1; i >= 0; i--) {
        const m = muskets[i];
        if (elapsed - m.born < m.hotMs) continue;
        if (Phaser.Math.Distance.Between(at.x, at.y, m.x, m.y) > 26) continue;
        muskets.splice(i, 1);
        ammo++;
        fx.sparks(m.x, m.y, 4, -Math.PI / 2, 10, GUNPOWDER.brass);
        float(ctx, m.x, m.y - 22, '+1 🔫', '#ffcc55', 11);
      }
    });
  },
};

export const passiveTheArsenal: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Six slots of running costs: pistols shorten R, RPGs lengthen it, miniguns slow your reload',
  run(ctx) {
    const { av } = stage(ctx, { noDummy: true });
    const slots = ['🔫', '🔫', '🎯', '🚀', '🌪️', '❄️'];
    arsenalRow(ctx, slots, 6);
    const readout = label(ctx, ctx.cx, ctx.cy + 30, '#ffcc55', 10);
    const lines = [
      '🔫 ×2 — Fire at Will cooldown −20%',
      '🎯 — Musket Shot +25% → 43 damage',
      '🚀 — Fire at Will cooldown +20%',
      '🌪️ — muskets cool 35% slower',
      '❄️ — muskets cool 20% faster',
      'net: R at 8.1s, muskets hot for 13.8s',
    ];
    lines.forEach((l, i) => ctx.at(600 + i * 900, () => {
      readout.setText(l);
      if (i === lines.length - 1) av.play('flex');
    }));
  },
};

// ══ Perks ═════════════════════════════════════════════════════════════

export const perkCorruption: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Corruption — musket hits rot for 3/s for 5s (3 stacks), and dropped guns fester',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const muskets: Musket[] = [];
    musketLayer(ctx, muskets);
    let stacks = 0;
    const readout = label(ctx, ctx.tx, ctx.ty - 42, '#88aa44', 10);
    ctx.onFrame(() => readout.setText(stacks ? `☠️ rot ×${stacks} — ${stacks * 3}/s` : ''));

    for (let i = 0; i < 3; i++) {
      ctx.at(400 + i * 700, () => {
        av.play('punch', ctx.aim);
        fx.muzzle(ctx.cx + 26, ctx.cy, ctx.aim, 1, 10);
        ctx.fly({
          texture: 'proj-gunpowder-musket', from: { x: ctx.cx, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty }, speed: 900,
          onHit: () => {
            stacks = Math.min(3, stacks + 1);
            fx.sparks(ctx.tx, ctx.ty, 5, ctx.aim, 10, 0x88aa44);
            float(ctx, ctx.tx, ctx.ty - 24, '35', '#ffcc55', 14);
          },
        });
        muskets.push({ x: ctx.cx - 68 - i * 34, y: ctx.cy + (i - 1) * 12, angle: 0.2 * i, born: 400 + i * 700, hotMs: 12000 });
      });
    }
    // The rot ticking, and the guns behind you festering while they cool.
    for (let i = 1; i <= 5; i++) {
      ctx.at(2400 + i * 1000, () => {
        if (!stacks) return;
        float(ctx, ctx.tx, ctx.ty - 22, `${stacks * 3}`, '#88aa44', 12);
        for (const m of muskets) fx.smoke(m.x, m.y, 1, { radius: 5, life: 700, depth: 4 });
      });
    }
  },
};

export const perkDemon: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Demon — the whole volley echoed 0.6s later as homing hellfire at 60% damage',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const victim = { x: ctx.tx, y: ctx.ty };
    dummy(ctx, victim.x, victim.y);
    arsenalRow(ctx, ['🔫', '🎯', '💣'], 3);
    const echoes: { x: number; y: number; vx: number; vy: number; live: boolean }[] = [];
    const eg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((dt, elapsed) => {
      eg.clear();
      for (const e of echoes) {
        if (!e.live) continue;
        // 3.4 rad/s of homing authority at 620 px/s.
        const want = Math.atan2(victim.y - e.y, victim.x - e.x);
        const cur = Math.atan2(e.vy, e.vx);
        const na = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - cur), -3.4 * (dt / 1000), 3.4 * (dt / 1000));
        e.vx = Math.cos(na) * 620; e.vy = Math.sin(na) * 620;
        e.x += e.vx * (dt / 1000); e.y += e.vy * (dt / 1000);
        GunpowderFx.drawBurningShot(eg, ctx.tint, e.x, e.y, na, elapsed / 1000);
        if (Phaser.Math.Distance.Between(e.x, e.y, victim.x, victim.y) <= 22) {
          e.live = false;
          fx.boom(victim.x, victim.y, 34, { color: GUNPOWDER.ember, petals: 5, shrapnel: 4, mark: false });
          float(ctx, victim.x, victim.y - 26, '24', '#ff4411', 12);
        }
      }
    });

    ctx.at(600, () => {
      av.play('sweep', ctx.aim);
      fx.smoke(ctx.cx, ctx.cy, 8, { angle: ctx.aim, spread: 1.6, radius: 8, life: 1100, depth: 5 });
      float(ctx, ctx.cx, ctx.cy - 40, '🔥 FIRE AT WILL', '#dd8833', 11);
      for (const d of [0, 90, 180]) {
        ctx.at(d, () => {
          fx.muzzle(ctx.cx + 26, ctx.cy, ctx.aim, 1, 10);
          fx.tracer(ctx.cx + 26, ctx.cy, victim.x, victim.y, GUNPOWDER.gold, 10, 160);
        });
      }
      // 0.6s later, something behind you does it again.
      ctx.at(600, () => {
        float(ctx, ctx.cx - 40, ctx.cy - 50, '😈', '#cc2200', 20);
        fx.ring(ctx.cx - 40, ctx.cy, 10, 60, GUNPOWDER.ember, 400, 7, 3);
        for (let i = 0; i < 3; i++) {
          const a = -0.5 + i * 0.5;
          echoes.push({
            x: ctx.cx - 40, y: ctx.cy, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, live: true,
          });
        }
      });
    });
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryFireworks: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Fireworks — scrape the wall to plant one; 1s later it crosses for 10, then bursts for 10',
  run(ctx) {
    const fx = ctx.capture(() => new GunpowderFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: 46, y: ctx.cy };
    if (ctx.scene.textures.exists('elem-gunpowder')) {
      const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-gunpowder').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    const av = ctx.useAvatar(() => new GunpowderAvatar(ctx.scene, ctx.tint, 'player'));
    av.setMastered(true);
    ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
    const victim = { x: ctx.w * 0.62, y: ctx.cy - 40 };
    dummy(ctx, victim.x, victim.y);

    const tubes: { x: number; y: number; born: number; fired: boolean }[] = [];
    const flights: { x: number; y: number; live: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));

    ctx.onFrame((dt, elapsed) => {
      g.clear();
      // Scraping the left wall plants one every 0.5s, never within 48px of another.
      if (elapsed > 400 && elapsed < 3000) {
        at.y = ctx.cy + Math.sin(elapsed / 400) * 70;
        const last = tubes[tubes.length - 1];
        if (!last || (elapsed - last.born >= 500 && Math.abs(at.y - last.y) >= 48)) {
          tubes.push({ x: 6, y: at.y, born: elapsed, fired: false });
        }
      }
      for (const t of tubes) {
        const fuse = Phaser.Math.Clamp((elapsed - t.born) / 1000, 0, 1);
        if (!t.fired) {
          GunpowderFx.drawFireworkTube(g, ctx.tint, t.x, t.y, 1, 0, fuse, GUNPOWDER.orchid, elapsed / 1000);
          if (fuse >= 1) { t.fired = true; flights.push({ x: t.x, y: t.y, live: true }); }
        }
      }
      for (const f of flights) {
        if (!f.live) continue;
        f.x += 780 * (dt / 1000);
        GunpowderFx.drawFireworkFlight(g, ctx.tint, f.x, f.y, 1, 0, GUNPOWDER.orchid, elapsed / 1000);
        const hit = Phaser.Math.Distance.Between(f.x, f.y, victim.x, victim.y) <= 14;
        if (hit || f.x > ctx.w - 12) {
          f.live = false;
          if (hit) float(ctx, victim.x, victim.y - 24, '10', '#cc44ff', 13);
          fx.starShell(f.x, f.y, 74, GUNPOWDER.orchid, 11);
          float(ctx, f.x, f.y - 40, hit ? 'burst 10 (they are spared)' : 'burst 10', '#e0a8ff', 10);
        }
      }
    });
  },
};

export const masteryOverload: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Overload — every gun on the floor aims for 2s then fires for 15, and comes back scalding',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    const victim = { x: ctx.tx, y: ctx.ty };
    dummy(ctx, victim.x, victim.y);
    const muskets: Musket[] = [
      { x: ctx.cx - 90, y: ctx.cy - 26, angle: 0.3, born: 0, hotMs: 20000 },
      { x: ctx.cx - 40, y: ctx.cy + 30, angle: -0.2, born: 0, hotMs: 20000 },
      { x: ctx.cx + 30, y: ctx.cy - 40, angle: 0.1, born: 0, hotMs: 20000 },
    ];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let aimFrom = -1;
    let fired = false;
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff3322', 11);

    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (const m of muskets) {
        // While aiming they swivel onto the target and draw a red line at it.
        const a = aimFrom >= 0 ? Math.atan2(victim.y - m.y, victim.x - m.x) : m.angle;
        musket(g, ctx.tint, m.x, m.y, a, 26, fired ? 1 : 0.4, 1);
        if (aimFrom >= 0 && !fired) {
          g.lineStyle(1.2, ctx.tint(0xff3322), 0.55);
          g.lineBetween(m.x, m.y, victim.x, victim.y);
        }
      }
      if (aimFrom >= 0 && !fired) {
        readout.setText(`aiming ${((2000 - (elapsed - aimFrom)) / 1000).toFixed(1)}s`);
      }
    });

    ctx.at(500, () => {
      aimFrom = 500;
      av.play('flex');
      float(ctx, ctx.cx, ctx.cy - 44, '🔫 OVERLOAD', '#ff3322', 12);
    });
    ctx.at(2500, () => {
      fired = true;
      readout.setText('back to full heat +3s — and scalding');
      for (const m of muskets) {
        const a = Math.atan2(victim.y - m.y, victim.x - m.x);
        fx.muzzle(m.x, m.y, a, 0.9, 10);
        fx.tracer(m.x, m.y, victim.x, victim.y, GUNPOWDER.gold, 10, 160);
        float(ctx, victim.x + (Math.random() - 0.5) * 30, victim.y - 24, '15', '#ffcc55', 13);
      }
    });
    // And the price: walking over your own overloaded gun burns you.
    for (const d of [4200, 5400]) {
      ctx.at(d, () => {
        const m = muskets[0];
        fx.sparks(m.x, m.y, 5, -Math.PI / 2, 10, GUNPOWDER.ember);
        float(ctx, m.x, m.y - 22, '🔥 SCALDING 20', '#ff7733', 11);
      });
    }
  },
};
