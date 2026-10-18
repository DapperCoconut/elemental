import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  TMP, HeraldBroadcast, TempestAvatar, TempestFx, current as paintCurrent, fallGauge, frontLane, gustLayered, hailStone,
  iceShard, knockTag, lightning, liftShadow, rainPuddle, staticTrail, stormBank, stormSky, swirl, thunderCloud,
} from '../../../elements/kits/TempestVisuals';

/**
 * Tempest's showcases.
 *
 * There is no `proj-tempest` — the bursts, the fronts, the currents and the gauges are all Graphics
 * the kit repaints every frame — so these loops keep the same little records the kit keeps and paint
 * with the real painters: `gustLayered` for a flying burst, `frontLane` for a front, `paintCurrent`
 * for a current, `liftShadow` and `fallGauge` for a body in the air. One-shots go through a real
 * `TempestFx` with a sticky sink. Altitude is faked the only honest way the box allows: the caster
 * is glided upward and its shadow is left on the floor.
 */

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): TempestFx {
  return ctx.capture(() => new TempestFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

interface Dummy { x: number; y: number; vx: number; vy: number; alive: boolean; lift: number }

function dummyAt(ctx: PreviewCtx, d: Dummy, depth = 5): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    if (!d.alive) return;
    if (d.lift > 0) liftShadow(g, ctx.tint, d.x, d.y, d.lift, 1);
    const y = d.y - d.lift;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(d.x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(d.x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(d.x - 5, y - 4, 3.2); g.fillCircle(d.x + 5, y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(d.x - 5.6, y - 4, 1.6); g.fillCircle(d.x + 4.4, y - 4, 1.6);
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

/** The storm rig, or null when a skin has replaced the character. */
function rig(av: unknown): TempestAvatar | null {
  return av instanceof TempestAvatar ? av : null;
}

/** A shove the box can show: the dummy slides and decelerates, and stops at the box's walls. */
function slide(ctx: PreviewCtx, d: Dummy, dt: number, onWall?: (nx: number, ny: number) => void): void {
  if (Math.abs(d.vx) < 1 && Math.abs(d.vy) < 1) return;
  d.x += d.vx * dt;
  d.y += d.vy * dt;
  d.vx *= Math.pow(0.5, dt / 0.16);
  d.vy *= Math.pow(0.5, dt / 0.16);
  const r = 17;
  if (d.x > ctx.w - r && d.vx > 0) { d.x = ctx.w - r; d.vx = 0; onWall?.(-1, 0); }
  if (d.x < r && d.vx < 0) { d.x = r; d.vx = 0; onWall?.(1, 0); }
  if (d.y > ctx.h - r && d.vy > 0) { d.y = ctx.h - r; d.vy = 0; onWall?.(0, -1); }
  if (d.y < r && d.vy < 0) { d.y = r; d.vy = 0; onWall?.(0, 1); }
}

// ══ CLICK — Gale Burst ════════════════════════════════════════════════

export const galeBurst: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Click — a burst that goes off at your cursor: 10 damage and a hard shove. Two charges, earned back by walking.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 250, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, hex(TMP.white), 10);
    let charges = 2;
    let walked = 0;
    const shots: { x: number; y: number; tx: number; ty: number; seed: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      slide(ctx, d, dt, (nx, ny) => { fx.wallSlam(d.x - nx * 20, d.y - ny * 20, nx, ny); float(ctx, d.x, d.y - 40, 'WALL SLAM 12', hex(TMP.white)); });
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        const ang = Math.atan2(s.ty - s.y, s.tx - s.x);
        const left = Math.hypot(s.tx - s.x, s.ty - s.y);
        const step = 780 * dt;
        if (left <= step) {
          shots.splice(i, 1);
          fx.burst(s.tx, s.ty, 72);
          if (Math.hypot(d.x - s.tx, d.y - s.ty) <= 72) {
            const a = Math.atan2(d.y - s.ty, d.x - s.tx);
            d.vx = Math.cos(a) * 620; d.vy = Math.sin(a) * 620;
            float(ctx, d.x, d.y - 30, '10', '#ffb3aa', 12);
          }
          continue;
        }
        s.x += Math.cos(ang) * step; s.y += Math.sin(ang) * step;
        gustLayered(g, ctx.tint, s.x - Math.cos(ang) * 30, s.y - Math.sin(ang) * 30, ang, 46, 7, 0.95, { phase: t * 10, seed: s.seed, curl: 0.6 });
        g.fillStyle(ctx.tint(TMP.white), 0.9); g.fillCircle(s.x, s.y, 5);
        g.lineStyle(1.2, ctx.tint(TMP.gust), 0.3); g.strokeCircle(s.tx, s.ty, 36);
      }
      // The reload: walking. The caster paces on the spot in the box, so the charge comes back.
      if (charges < 2 && elapsed > 3000 && elapsed < 9000) {
        walked += 110 * dt;
        if (walked >= 240) { walked -= 240; charges++; float(ctx, ctx.cx, ctx.cy - 50, '+1 GALE', hex(TMP.gust)); }
      }
      gauge.setText(`${charges}/2 charges   ·   ${Math.round(walked)}/240px walked toward the next`);
    });

    const press = (ms: number, short: number) => ctx.at(ms, () => {
      if (charges <= 0) return;
      charges--;
      const a = Math.atan2(d.y - ctx.cy, d.x - ctx.cx);
      const dist = Math.hypot(d.x - ctx.cx, d.y - ctx.cy) - short;
      shots.push({ x: ctx.cx + Math.cos(a) * 18, y: ctx.cy + Math.sin(a) * 18, tx: ctx.cx + Math.cos(a) * dist, ty: ctx.cy + Math.sin(a) * dist, seed: Math.random() * 999 });
      av.play('punch', a);
    });
    press(700, 30);
    ctx.at(300, () => readout.setText('it flies to the cursor and goes off there — 72px, 10 damage, 620 px/s shove'));
    press(1500, 30);
    ctx.at(1700, () => readout.setText('two charges, no cooldown — and now it is empty'));
    ctx.at(3300, () => readout.setText('moving earns them back: one per 240px walked'));
    ctx.at(6600, () => { d.x = ctx.cx + 250; d.y = ctx.cy; d.vx = 0; d.vy = 0; });
    ctx.at(7400, () => readout.setText('shove them into a wall and the wall does 12 more'));
    press(7600, 40);
    ctx.at(9000, () => readout.setText('Kick Blast refills both at once'));
  },
};

// ══ E — Kick Blast ════════════════════════════════════════════════════

export const kickBlast: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'E — a 440px roll with a 50% dodge: 15 damage and a long kick to whoever is in the way. Refills the click.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 170, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let rolling = false;
    let hit = false;
    let dodgeUntil = 0;
    let acc = 0;

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      g.clear();
      slide(ctx, d, dt, (nx, ny) => { fx.wallSlam(d.x - nx * 20, d.y - ny * 20, nx, ny); float(ctx, d.x, d.y - 40, 'WALL SLAM 12', hex(TMP.white)); });
      const c = ctx.casterAt();
      if (rolling) {
        acc += delta;
        if (acc > 40) { acc = 0; fx.rollTrail(c.x, c.y, ctx.aim); }
        if (!hit && Math.hypot(c.x - d.x, c.y - d.y) <= 50) {
          hit = true;
          d.vx = Math.cos(ctx.aim) * 760; d.vy = Math.sin(ctx.aim) * 760;
          fx.kickHit(d.x, d.y, ctx.aim);
          float(ctx, d.x, d.y - 30, '15', '#ffb3aa', 12);
        }
      }
      if (elapsed < dodgeUntil) {
        g.lineStyle(2, ctx.tint(TMP.white), 0.5 + 0.3 * Math.sin(elapsed / 60));
        g.strokeCircle(c.x, c.y, 30);
      }
    });

    ctx.at(300, () => readout.setText('440px in 0.32 seconds, along your aim'));
    ctx.at(900, () => {
      rolling = true;
      dodgeUntil = 900 + 320 + 1000;
      fx.burst(ctx.cx, ctx.cy, 34);
      av.play('dash', ctx.aim);
      ctx.glideCaster({ to: { x: ctx.cx + 300, y: ctx.cy }, ms: 320, ease: 'out', onDone: () => { rolling = false; } });
      float(ctx, ctx.cx, ctx.cy - 56, 'GALE ×2', hex(TMP.gust));
    });
    ctx.at(1300, () => readout.setText('15 damage and a 760 px/s kick to anyone you roll through'));
    ctx.at(2600, () => readout.setText('50% dodge for the roll and the whole second after it'));
    ctx.at(4300, () => readout.setText('and Gale Burst is back to two charges'));
    ctx.at(5400, () => { ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 600, ease: 'out' }); d.x = ctx.cx + 170; d.y = ctx.cy; d.vx = 0; d.vy = 0; });
  },
};

// ══ R — Summon Front ══════════════════════════════════════════════════

export const summonFront: PreviewScript = {
  duration: 12000,
  scale: 0.8,
  caption: 'R — a 360×116 conveyor front along your aim, carrying everyone in it at 300 px/s. Two at a time; a third fades the oldest.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 140, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    interface F { x: number; y: number; ang: number; bornAt: number; fadeAt: number; seed: number }
    const fronts: F[] = [];
    const inFront = (f: F, x: number, y: number): boolean => {
      const dx = x - f.x, dy = y - f.y;
      const u = dx * Math.cos(f.ang) + dy * Math.sin(f.ang);
      const v = -dx * Math.sin(f.ang) + dy * Math.cos(f.ang);
      return u >= -20 && u <= 380 && Math.abs(v) <= 78;
    };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      for (let i = fronts.length - 1; i >= 0; i--) if (fronts[i].fadeAt && elapsed >= fronts[i].fadeAt) fronts.splice(i, 1);
      for (const f of fronts) {
        const fade = f.fadeAt ? Phaser.Math.Clamp((f.fadeAt - elapsed) / 350, 0, 1) : 1;
        const born = Phaser.Math.Clamp((elapsed - f.bornAt) / 360, 0, 1);
        frontLane(g, ctx.tint, f.x, f.y, f.ang, 360 * born, 58, fade, { t, seed: f.seed });
        if (!f.fadeAt && inFront(f, d.x, d.y)) { d.x += Math.cos(f.ang) * 300 * dt; d.y += Math.sin(f.ang) * 300 * dt; }
      }
      d.x = Phaser.Math.Clamp(d.x, 17, ctx.w - 17);
      d.y = Phaser.Math.Clamp(d.y, 17, ctx.h - 17);
    });

    const place = (ms: number, ang: number) => ctx.at(ms, () => {
      const live = fronts.filter((f) => !f.fadeAt);
      while (live.length >= 2) { live.shift()!.fadeAt = ms + 350; }
      const c = ctx.casterAt();
      const x = c.x + Math.cos(ang) * 22, y = c.y + Math.sin(ang) * 22;
      fronts.push({ x, y, ang, bornAt: ms, fadeAt: 0, seed: Math.random() * 999 });
      fx.frontPlace(x, y, ang, 360, 58);
      av.play('sweep', ang);
    });
    ctx.at(300, () => readout.setText('a lane from your feet along your aim — 360 long, 116 wide'));
    place(800, ctx.aim);
    ctx.at(1600, () => readout.setText('everyone standing in it is carried at 300 px/s. You too.'));
    ctx.at(3600, () => { d.x = ctx.cx + 140; d.y = ctx.cy - 60; });
    place(4200, ctx.aim - 0.7);
    ctx.at(4400, () => readout.setText('two at a time, and they never time out'));
    place(7200, ctx.aim + 0.6);
    ctx.at(7400, () => readout.setText('the third one fades the oldest — that is the only way one ever leaves'));
    ctx.at(9800, () => readout.setText('in the air, R drops you onto your nearest front instead — see Final Forecast'));
  },
};

// ══ F — Updraft ═══════════════════════════════════════════════════════

export const updraft: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F — ride one of the three drifting currents into the sky. Gravity brings you down; the landing is a shockwave.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 260, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const cur = { x: ctx.cx + 110, y: ctx.cy, alive: true, seed: 7 };
    const flight = { z: 0, vz: 0, on: false, groundX: ctx.cx, groundY: ctx.cy };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear(); ag.clear();
      slide(ctx, d, dt);
      if (cur.alive) paintCurrent(g, ctx.tint, cur.x, cur.y, 44, 1, { t, seed: cur.seed });
      if (flight.on) {
        flight.vz -= 520 * dt;
        flight.vz = Math.max(flight.vz, -900);
        flight.z += flight.vz * dt;
        if (flight.z <= 0) {
          flight.on = false; flight.z = 0;
          const k = Math.min(1, -flight.vz / 1500);
          const r = 70 + 70 * k;
          const dmg = Math.round(6 + 34 * k);
          fx.landing(flight.groundX, flight.groundY, r, k);
          if (Math.hypot(d.x - flight.groundX, d.y - flight.groundY) <= r) {
            const a = Math.atan2(d.y - flight.groundY, d.x - flight.groundX);
            d.vx = Math.cos(a) * 420; d.vy = Math.sin(a) * 420;
            float(ctx, d.x, d.y - 30, `${dmg}`, '#ffb3aa', 12);
          }
          float(ctx, flight.groundX, flight.groundY - 60, `LANDING ${dmg}`, hex(TMP.gust));
          storm?.setAir(false); storm?.setFall(0); av.setHold(null);
          ctx.moveCaster(flight.groundX, flight.groundY);
          return;
        }
        const lift = Math.min(flight.z * 0.55, flight.groundY - 44);
        ctx.moveCaster(flight.groundX, flight.groundY - lift);
        liftShadow(g, ctx.tint, flight.groundX, flight.groundY, lift, 1);
        const speedK = flight.vz < 0 ? Math.min(1, -flight.vz / 1500) : 0;
        fallGauge(ag, ctx.tint, flight.groundX + 42, flight.groundY - lift, speedK, Math.min(1, flight.z / 520), 0.95);
        storm?.setAir(true); storm?.setFall(speedK);
      }
    });

    ctx.at(300, () => readout.setText('three of these drift around the arena at all times, 9 seconds each'));
    ctx.at(1200, () => ctx.glideCaster({ to: { x: cur.x - 40, y: cur.y }, ms: 700, ease: 'out' }));
    ctx.at(2200, () => {
      cur.alive = false;
      flight.on = true; flight.vz = 640; flight.groundX = cur.x - 40; flight.groundY = cur.y;
      fx.launch(cur.x, cur.y);
      av.play('raise');
      av.setHold('ride');
      readout.setText('F within 80px: launched at 640 px/s, about 390px up and 2.4 seconds of air');
    });
    ctx.at(3400, () => readout.setText('up here melee and floor hazards cannot reach you. Shots and blasts still can.'));
    ctx.at(4300, () => { d.x = flight.groundX + 70; d.y = flight.groundY; d.vx = 0; d.vy = 0; });
    ctx.at(4600, () => readout.setText('the arrow reddens with your fall speed — and the landing is a shockwave that scales with it'));
    ctx.at(6400, () => readout.setText('a free fall lands for about 20 in 100px. A dive lands for 40.'));
    ctx.at(7800, () => { ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 600, ease: 'out' }); cur.alive = true; });
  },
};

// ══ Q — Final Forecast ════════════════════════════════════════════════

export const finalForecast: PreviewScript = {
  duration: 16000,
  scale: 0.8,
  caption: 'Q — grapple someone into the sky for 3 seconds, then crash: 20 + 0.15 per px of height. Airborne, Q is a dive that leaves them ping-ponging off three walls.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 230, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const flight = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy, holding: false, releaseAt: 0, releaseZ: 0, diving: false };
    const pong = { on: false, vx: 0, vy: 0, bounces: 0 };
    let dashing = false;
    let acc = 0;

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear(); ag.clear();
      const c = ctx.casterAt();
      if (dashing) {
        acc += delta;
        if (acc > 40) { acc = 0; fx.streak(c.x, c.y, ctx.aim, 44); }
        if (Math.hypot(c.x - d.x, c.y - d.y) <= 48) {
          dashing = false;
          flight.on = true; flight.vz = 700; flight.gx = c.x; flight.gy = c.y;
          flight.holding = true; flight.releaseAt = elapsed + 3000;
          fx.grabSnap(d.x, d.y);
          av.setHold('reach', ctx.aim);
          float(ctx, c.x, c.y - 60, 'GRAPPLED', hex(TMP.white));
          readout.setText('caught: launched at 700 px/s, and they are held at arm\'s length, unable to move');
        }
      }
      if (pong.on) {
        d.x += pong.vx * dt; d.y += pong.vy * dt;
        const r = 17;
        let nx = 0, ny = 0;
        if (d.x > ctx.w - r && pong.vx > 0) { d.x = ctx.w - r; pong.vx = -pong.vx; nx = -1; }
        if (d.x < r && pong.vx < 0) { d.x = r; pong.vx = -pong.vx; nx = 1; }
        if (d.y > ctx.h - r && pong.vy > 0) { d.y = ctx.h - r; pong.vy = -pong.vy; ny = -1; }
        if (d.y < r && pong.vy < 0) { d.y = r; pong.vy = -pong.vy; ny = 1; }
        if (nx || ny) {
          pong.bounces++;
          fx.wallSlam(d.x - nx * 20, d.y - ny * 20, nx, ny, { electric: true });
          float(ctx, d.x, d.y - 40, 'WALL SLAM 12', hex(TMP.bolt));
          if (pong.bounces >= 3) { pong.on = false; storm?.setEye(false); readout.setText('the third wall ends it — 36 from the walls on top of the landing'); }
        }
        const ang = Math.atan2(pong.vy, pong.vx);
        gustLayered(ag, ctx.tint, d.x - Math.cos(ang) * 28, d.y - Math.sin(ang) * 28, ang + Math.PI, 40, 6, 0.8, { phase: t * 9, seed: pong.bounces, hot: 1 });
        const n = Math.floor(t * 14);
        lightning(ag, ctx.tint(TMP.bolt), d.x, d.y, d.x + Math.cos(n) * 30, d.y + Math.sin(n) * 30, 5, 1.4, 0.8, n);
      } else {
        slide(ctx, d, dt);
      }
      if (flight.on) {
        if (flight.holding) {
          flight.vz -= 520 * 0.18 * dt;
          flight.vz *= Math.pow(0.5, dt / 0.9);
          if (flight.z < 160 && flight.vz < 40) flight.vz = 40;
          if (elapsed >= flight.releaseAt) {
            flight.holding = false; flight.releaseZ = flight.z; flight.vz = -1500;
            av.play('slam', Math.PI / 2, 400);
            float(ctx, flight.gx, flight.gy - 70, 'CRASH', hex(TMP.white));
          }
        } else {
          flight.vz -= 520 * dt;
          if (!flight.diving && flight.releaseZ === 0) flight.vz = Math.max(flight.vz, -900);
        }
        flight.z += flight.vz * dt;
        if (flight.z <= 0) {
          flight.on = false; flight.z = 0;
          const k = Math.min(1, -flight.vz / 1500);
          const r = 70 + 70 * k;
          const dmg = Math.round(6 + 34 * k);
          fx.landing(flight.gx, flight.gy, r, k);
          d.lift = 0;
          if (flight.releaseZ > 0) {
            const crash = 20 + Math.min(70, Math.round(flight.releaseZ * 0.15));
            float(ctx, d.x, d.y - 30, `${dmg + crash}`, '#ffb3aa', 13);
            float(ctx, flight.gx, flight.gy - 90, `FORECAST ${crash} from ${Math.round(flight.releaseZ)}px`, hex(TMP.white));
            flight.releaseZ = 0;
            av.setHold(null);
            const a = Math.atan2(d.y - flight.gy, d.x - flight.gx) || 0;
            d.vx = Math.cos(a) * 420; d.vy = Math.sin(a) * 420;
          } else if (flight.diving) {
            flight.diving = false;
            if (Math.hypot(d.x - flight.gx, d.y - flight.gy) <= 150) {
              float(ctx, d.x, d.y - 30, `${dmg}`, '#ffb3aa', 12);
              const a = Math.atan2(d.y - flight.gy, d.x - flight.gx) || 0.3;
              pong.on = true; pong.vx = Math.cos(a) * 540; pong.vy = Math.sin(a) * 540; pong.bounces = 0;
              storm?.setEye(true);
              fx.eyeOpen(flight.gx, flight.gy);
              float(ctx, flight.gx, flight.gy - 90, 'EYE OF THE STORM', hex(TMP.bolt));
              readout.setText('Storm Currents: 540 px/s between the walls, a Wall Slam on each, until the third');
            }
          }
          storm?.setAir(false); storm?.setFall(0); if (!pong.on) av.setHold(null);
          ctx.moveCaster(flight.gx, flight.gy);
          return;
        }
        const lift = Math.min(flight.z * 0.55, flight.gy - 44);
        ctx.moveCaster(flight.gx, flight.gy - lift);
        liftShadow(g, ctx.tint, flight.gx, flight.gy, lift, 1);
        const speedK = flight.vz < 0 ? Math.min(1, -flight.vz / 1500) : 0;
        fallGauge(ag, ctx.tint, flight.gx + 42, flight.gy - lift, speedK, Math.min(1, flight.z / 520), 0.95);
        storm?.setAir(true); storm?.setFall(speedK);
        if (flight.holding) {
          d.x = flight.gx + 30; d.y = flight.gy; d.lift = lift;
          ag.lineStyle(3, ctx.tint(TMP.gust), 0.5);
          ag.lineBetween(flight.gx, flight.gy - lift, d.x, d.y - lift * 0.4);
          const hold = Phaser.Math.Clamp((flight.releaseAt - elapsed) / 3000, 0, 1);
          ag.lineStyle(2.5, ctx.tint(TMP.white), 0.8);
          ag.beginPath(); ag.arc(flight.gx, flight.gy - lift - 34, 16, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2); ag.strokePath();
        }
      }
    });

    ctx.at(300, () => readout.setText('a 420px dash. The first body within 48px is grappled.'));
    ctx.at(900, () => {
      dashing = true;
      fx.burst(ctx.cx, ctx.cy, 30);
      av.play('dash', ctx.aim);
      ctx.glideCaster({ to: { x: ctx.cx + 420, y: ctx.cy }, ms: 300, ease: 'out', onDone: () => { dashing = false; } });
    });
    ctx.at(2600, () => readout.setText('three seconds in the sky, and every key still works — a self-burst or a hop takes you both higher'));
    ctx.at(3400, () => { if (flight.on && flight.holding) { flight.vz += 520; fx.burst(flight.gx, flight.gy - flight.z * 0.55 + 10, 46, { boost: true }); av.play('raise', undefined, 420); float(ctx, flight.gx, flight.gy - flight.z * 0.55 - 40, 'KICK ⬆', hex(TMP.white)); } });
    ctx.at(4300, () => readout.setText('then the crash: 20 + 0.15 per px of release height, up to +70, plus the landing they are standing in'));
    ctx.at(7600, () => readout.setText('airborne, Q is a dive instead. Up a current first…'));
    ctx.at(8200, () => { d.x = ctx.cx + 240; d.y = ctx.cy; d.vx = 0; d.vy = 0; ctx.glideCaster({ to: { x: ctx.cx + 170, y: ctx.cy }, ms: 500, ease: 'out' }); });
    ctx.at(8900, () => { flight.on = true; flight.vz = 640; flight.gx = ctx.cx + 170; flight.gy = ctx.cy; fx.launch(flight.gx, flight.gy); av.play('raise'); av.setHold('ride'); });
    ctx.at(10300, () => { if (flight.on) { flight.diving = true; flight.vz = -1500; av.play('slam', Math.PI / 2, 400); float(ctx, flight.gx, flight.gy - 90, 'DIVE', hex(TMP.white)); readout.setText('a dive-speed landing: 40 damage in 140px…'); } });
    ctx.at(14800, () => { pong.on = false; storm?.setEye(false); av.setHold(null); ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 600, ease: 'out' }); d.x = ctx.cx + 230; d.y = ctx.cy; d.vx = 0; d.vy = 0; });
  },
};

// ══ Passive — Wall Slam ═══════════════════════════════════════════════

export const wallSlam: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Passive — any enemy your knockback drives into a wall takes 12. Once a second per body.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.w - 150, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let total = 0;
    const tally = label(ctx, ctx.w * 0.5, ctx.h - 16, hex(TMP.white), 10);

    ctx.onFrame((delta) => {
      const dt = delta / 1000;
      g.clear();
      slide(ctx, d, dt, (nx, ny) => {
        fx.wallSlam(d.x - nx * 20, d.y - ny * 20, nx, ny);
        total += 12;
        float(ctx, d.x, d.y - 40, 'WALL SLAM 12', hex(TMP.white), 12);
        tally.setText(`${total} from the walls so far — on top of what the shoves did`);
      });
      // The wall itself, so the box has one.
      g.lineStyle(4, ctx.tint(TMP.slate), 0.9);
      g.lineBetween(ctx.w - 2, 0, ctx.w - 2, ctx.h);
    });

    const shove = (ms: number, what: string, speed: number) => ctx.at(ms, () => {
      const a = Math.atan2(d.y - ctx.cy, d.x - ctx.cx);
      fx.burst(d.x - 40, d.y, 72);
      d.vx = Math.cos(a) * speed; d.vy = Math.sin(a) * speed;
      av.play('punch', a);
      float(ctx, d.x, d.y - 30, '10', '#ffb3aa', 12);
      readout.setText(what);
    });
    ctx.at(300, () => readout.setText('every shove in the kit counts: a burst, a kick, a landing, a slam, the currents'));
    shove(1200, 'a Gale Burst behind them — 10, then the wall does 12', 620);
    ctx.at(3400, () => { d.x = ctx.w - 150; d.y = ctx.cy; d.vx = 0; d.vy = 0; });
    shove(4200, 'once a second per body, so two walls in a second is one slam', 620);
    ctx.at(6400, () => readout.setText('a body that cannot be moved never reaches the wall'));
  },
};

// ══ Passive — Flight ══════════════════════════════════════════════════

export const flight: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Passive — off the floor, melee and floor hazards miss you; shots and blasts still land. Half speed, and the landing scales with your fall.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 90, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const fl = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy };
    const shot = { x: 0, y: 0, on: false };

    ctx.onFrame((delta) => {
      const dt = delta / 1000;
      g.clear(); ag.clear();
      // A puddle under the caster's spot: a floor hazard that cannot reach up.
      g.fillStyle(0x2255aa, 0.35); g.fillEllipse(ctx.cx, ctx.cy + 8, 110, 44);
      if (fl.on) {
        fl.vz -= 520 * dt;
        fl.vz = Math.max(fl.vz, -900);
        fl.z += fl.vz * dt;
        if (fl.z <= 0) {
          fl.on = false; fl.z = 0;
          const k = Math.min(1, -fl.vz / 1500);
          fx.landing(fl.gx, fl.gy, 70 + 70 * k, k);
          float(ctx, fl.gx, fl.gy - 60, `LANDING ${Math.round(6 + 34 * k)}`, hex(TMP.gust));
          storm?.setAir(false); storm?.setFall(0); av.setHold(null);
          ctx.moveCaster(fl.gx, fl.gy);
          return;
        }
        const lift = Math.min(fl.z * 0.55, fl.gy - 44);
        ctx.moveCaster(fl.gx, fl.gy - lift);
        liftShadow(g, ctx.tint, fl.gx, fl.gy, lift, 1);
        const speedK = fl.vz < 0 ? Math.min(1, -fl.vz / 1500) : 0;
        fallGauge(ag, ctx.tint, fl.gx + 42, fl.gy - lift, speedK, Math.min(1, fl.z / 520), 0.95);
        storm?.setAir(true); storm?.setFall(speedK);
      }
      if (shot.on) {
        shot.x -= 600 * dt;
        ag.fillStyle(0xffaa66, 1); ag.fillCircle(shot.x, shot.y, 5);
        const c = ctx.casterAt();
        if (Math.hypot(shot.x - c.x, shot.y - c.y) < 22) { shot.on = false; float(ctx, c.x, c.y - 30, 'HIT', '#ffb3aa', 12); }
        if (shot.x < 0) shot.on = false;
      }
    });

    ctx.at(300, () => readout.setText('standing in a puddle. Launch…'));
    ctx.at(1200, () => { fl.on = true; fl.vz = 640; fl.gx = ctx.cx; fl.gy = ctx.cy; fx.launch(ctx.cx, ctx.cy); av.play('raise'); av.setHold('ride'); });
    ctx.at(1600, () => readout.setText('…and the puddle is under you, not on you. Floor hazards cannot reach up.'));
    ctx.at(2400, () => {
      // A melee swing from the dummy, under the caster.
      fx.kickHit(ctx.cx, ctx.cy, Math.PI);
      float(ctx, ctx.cx, ctx.cy - 20, 'MISS', hex(TMP.gust), 12);
      readout.setText('a melee swing passes under you');
    });
    ctx.at(3300, () => { shot.on = true; shot.x = ctx.w - 20; shot.y = ctx.cy - Math.min(fl.z * 0.55, fl.gy - 44); readout.setText('a shot does not'); });
    ctx.at(4400, () => readout.setText('the arrow is your fall speed, the ticks are your height'));
    ctx.at(6000, () => readout.setText('the landing: 6 to 40 damage in 70 to 140px, by how fast you came down'));
  },
};

// ══ Shop upgrades ═════════════════════════════════════════════════════

/** A body in the air for the upgrade loops: the caster glided up off its shadow, gauge alongside. */
interface Air { z: number; vz: number; on: boolean; gx: number; gy: number; hover: boolean }

function flyFrame(ctx: PreviewCtx, g: Phaser.GameObjects.Graphics, ag: Phaser.GameObjects.Graphics, f: Air, dt: number,
  storm: TempestAvatar | null, onLand?: (k: number) => void): void {
  if (!f.on) return;
  f.vz -= 520 * dt;
  f.vz = Math.max(f.vz, -900);
  if (f.hover && f.vz < 0) f.vz = 0;
  f.z += f.vz * dt;
  if (f.z <= 0) {
    f.on = false; f.z = 0;
    const k = Math.min(1, -f.vz / 1500);
    storm?.setAir(false); storm?.setFall(0);
    ctx.moveCaster(f.gx, f.gy);
    onLand?.(k);
    return;
  }
  const lift = Math.min(f.z * 0.55, f.gy - 30);
  ctx.moveCaster(f.gx, f.gy - lift);
  liftShadow(g, ctx.tint, f.gx, f.gy, lift, 1);
  const speedK = f.vz < 0 ? Math.min(1, -f.vz / 1500) : 0;
  fallGauge(ag, ctx.tint, f.gx + 42, f.gy - lift, speedK, Math.min(1, f.z / 520), 0.95);
  storm?.setAir(true); storm?.setFall(speedK);
}

export const galeUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Click+ Hailstorm — a hailstone for 13 that shatters into 6 splinters of shrapnel, 4 each.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 250, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.ice), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const shots: { x: number; y: number; tx: number; ty: number; seed: number }[] = [];
    const shards: { x: number; y: number; vx: number; vy: number; left: number; hit: boolean }[] = [];

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();
      slide(ctx, d, dt);
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        const ang = Math.atan2(s.ty - s.y, s.tx - s.x);
        const step = 780 * dt;
        if (Math.hypot(s.tx - s.x, s.ty - s.y) <= step) {
          shots.splice(i, 1);
          fx.burst(s.tx, s.ty, 72);
          fx.shatter(s.tx, s.ty, 72);
          for (let k = 0; k < 6; k++) {
            const a = ang + (k / 6) * Math.PI * 2;
            shards.push({ x: s.tx, y: s.ty, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, left: 170, hit: false });
          }
          if (Math.hypot(d.x - s.tx, d.y - s.ty) <= 72) {
            const a = Math.atan2(d.y - s.ty, d.x - s.tx);
            d.vx = Math.cos(a) * 620; d.vy = Math.sin(a) * 620;
            float(ctx, d.x, d.y - 30, '13', '#ffb3aa', 12);
          }
          continue;
        }
        s.x += Math.cos(ang) * step; s.y += Math.sin(ang) * step;
        gustLayered(g, ctx.tint, s.x - Math.cos(ang) * 30, s.y - Math.sin(ang) * 30, ang, 46, 7, 0.95, { phase: t * 10, seed: s.seed, curl: 0.6 });
        hailStone(g, ctx.tint, s.x, s.y, 8, t * 9, 1, s.seed);
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const sh = shards[i];
        sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.left -= 520 * dt;
        if (!sh.hit && Math.hypot(sh.x - d.x, sh.y - d.y) <= 18) {
          sh.hit = true;
          float(ctx, d.x + (Math.random() - 0.5) * 20, d.y - 44, '4', hex(TMP.ice), 11);
        }
        if (sh.hit || sh.left <= 0) { shards.splice(i, 1); continue; }
        iceShard(g, ctx.tint, sh.x, sh.y, Math.atan2(sh.vy, sh.vx), 11, 0.5 + sh.left / 340);
      }
    });

    const press = (ms: number, short: number) => ctx.at(ms, () => {
      const a = Math.atan2(d.y - ctx.cy, d.x - ctx.cx);
      const dist = Math.hypot(d.x - ctx.cx, d.y - ctx.cy) - short;
      shots.push({ x: ctx.cx + Math.cos(a) * 18, y: ctx.cy + Math.sin(a) * 18, tx: ctx.cx + Math.cos(a) * dist, ty: ctx.cy + Math.sin(a) * dist, seed: Math.random() * 999 });
      av.play('punch', a);
    });
    ctx.at(200, () => readout.setText('the burst is a hailstone now — 13 instead of 10'));
    press(700, 50);
    ctx.at(1500, () => readout.setText('where it goes off it shatters: 6 splinters, 170px, 4 to the first body each meets'));
    ctx.at(3600, () => { d.x = ctx.cx + 250; d.y = ctx.cy; d.vx = 0; d.vy = 0; });
    press(4200, 110);
    ctx.at(4300, () => readout.setText('go off short of them and the shrapnel still finds them'));
  },
};

export const kickUpgraded: PreviewScript = {
  duration: 11000,
  scale: 0.8,
  caption: 'E+ Shocking Acceleration — the roll leaves 5s of static (5 every 0.5s). In the air, the hop leaves a thundercloud (8 a second, 150px).',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 150, y: ctx.cy - 70, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.bolt), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const trail: { x: number; y: number }[] = [];
    let trailUntil = 0;
    let laying = false;
    let lastTick = -Infinity;
    let walkVy = 0;
    const cloud = { on: false, x: 0, y: 0, until: 0, next: 0 };
    const air: Air = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy, hover: false };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear(); ag.clear();
      const c = ctx.casterAt();
      if (laying) {
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(last.x - c.x, last.y - c.y) >= 26) trail.push({ x: c.x, y: c.y });
      }
      if (elapsed < trailUntil) {
        staticTrail(g, ctx.tint, trail, 22, Phaser.Math.Clamp((trailUntil - elapsed) / 700, 0, 1), t, 3);
        const near = trail.some((p) => Math.hypot(p.x - d.x, p.y - d.y) <= 26);
        if (near && elapsed - lastTick >= 500) {
          lastTick = elapsed;
          fx.staticZap(d.x, d.y);
          float(ctx, d.x, d.y - 30, '5', hex(TMP.bolt), 11);
        }
      }
      d.y += walkVy * dt;
      if (cloud.on) {
        if (elapsed >= cloud.until) cloud.on = false;
        else {
          const charge = 1 - Phaser.Math.Clamp((cloud.next - elapsed) / 1000, 0, 1);
          thunderCloud(ag, ctx.tint, cloud.x, cloud.y, 110, 70, 1, t, charge, 5);
          if (elapsed >= cloud.next) {
            cloud.next += 1000;
            fx.strike(cloud.x, cloud.y, 50, cloud.y - 70);
            fx.ring(cloud.x, cloud.y, 20, 110, 340, TMP.bolt, 2.5, 4);
            if (Math.hypot(d.x - cloud.x, d.y - cloud.y) <= 110) float(ctx, d.x, d.y - 30, '8', hex(TMP.bolt), 12);
          }
        }
      }
      flyFrame(ctx, g, ag, air, dt, storm, (k) => fx.landing(air.gx, air.gy, 70 + 70 * k, k));
    });

    ctx.at(300, () => readout.setText('the roll lays static along its whole path'));
    ctx.at(800, () => {
      laying = true; trail.length = 0; trailUntil = 800 + 320 + 5000;
      fx.burst(ctx.cx, ctx.cy, 34);
      av.play('dash', ctx.aim);
      ctx.glideCaster({ to: { x: ctx.cx + 300, y: ctx.cy }, ms: 320, ease: 'out', onDone: () => { laying = false; } });
    });
    ctx.at(1500, () => { readout.setText('anyone standing on it takes 5 every half second, for 5 seconds'); walkVy = 60; });
    ctx.at(3600, () => { walkVy = 0; });
    ctx.at(5000, () => {
      const c = ctx.casterAt();
      air.on = true; air.vz = 640; air.gx = c.x; air.gy = c.y;
      fx.launch(c.x, c.y); av.setHold('ride');
      d.x = c.x - 60; d.y = c.y; d.vx = 0; d.vy = 0;
      readout.setText('in the air the hop leaves a thundercloud instead');
    });
    ctx.at(5900, () => {
      air.vz = Math.max(air.vz, 0) + 520;
      fx.burst(air.gx, air.gy + 10, 46, { boost: true });
      av.play('raise', undefined, 420);
      cloud.on = true; cloud.x = air.gx; cloud.y = air.gy; cloud.until = 5900 + 5000; cloud.next = 5900 + 1000;
    });
    ctx.at(7000, () => readout.setText('every second it strikes everything within 150px for 8'));
    ctx.at(9000, () => { av.setHold(null); });
    ctx.at(10400, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 500, ease: 'out' }));
  },
};

export const frontUpgraded: PreviewScript = {
  duration: 10000,
  scale: 0.8,
  caption: 'R+ Float — airborne over a front, you stop losing height. Climbing still works.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const front = { on: false, x: ctx.cx + 40, y: ctx.cy, ang: 0, bornAt: 0 };
    const air: Air = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy, hover: false };
    let driftVx = 0;

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear(); ag.clear();
      if (front.on) frontLane(g, ctx.tint, front.x, front.y, front.ang, 360 * Phaser.Math.Clamp((elapsed - front.bornAt) / 360, 0, 1), 58, 1, { t, seed: 4 });
      air.gx += driftVx * dt;
      air.hover = front.on && air.on && air.gx >= front.x - 20 && air.gx <= front.x + 380;
      flyFrame(ctx, g, ag, air, dt, storm, (k) => { fx.landing(air.gx, air.gy, 70 + 70 * k, k); av.setHold(null); });
      if (air.hover) {
        const lift = Math.min(air.z * 0.55, air.gy - 30);
        swirl(ag, ctx.tint(TMP.gust), air.gx, air.gy - lift + 22, 26, 0.7, { arms: 4, turns: 0.6, phase: t * 6, squash: 0.35 });
        ag.lineStyle(1.6, ctx.tint(TMP.white), 0.5 + Math.sin(t * 8) * 0.2);
        ag.strokeEllipse(air.gx, air.gy - lift + 24, 50, 12);
      }
    });

    ctx.at(300, () => {
      front.on = true; front.bornAt = 300;
      fx.frontPlace(front.x, front.y, 0, 360, 58);
      av.play('sweep', 0);
      readout.setText('a front on the floor…');
    });
    ctx.at(1100, () => {
      air.on = true; air.vz = 640; air.gx = ctx.cx; air.gy = ctx.cy;
      fx.launch(ctx.cx, ctx.cy); av.setHold('ride');
      readout.setText('…and once you are over it in the air, you stop coming down');
    });
    ctx.at(3600, () => {
      air.vz = Math.max(air.vz, 0) + 380;
      fx.burst(air.gx, air.gy - 20, 72, { boost: true });
      readout.setText('you can still climb — a burst lifts you, and the front holds the new height');
    });
    ctx.at(6400, () => { driftVx = -110; readout.setText('drift off the lane and gravity takes over again'); });
    ctx.at(8200, () => { driftVx = 0; });
    ctx.at(9300, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 500, ease: 'out' }));
  },
};

export const updraftUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.8,
  caption: 'F+ Cyclone — no current in reach? Spin up a cyclone and ride it: 880 px/s instead of 640, on double cooldown.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const peak = label(ctx, ctx.w * 0.5, ctx.h - 16, hex(TMP.white), 10);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const air: Air = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy, hover: false };
    let top = 0;

    ctx.onFrame((delta) => {
      const dt = delta / 1000;
      g.clear(); ag.clear();
      flyFrame(ctx, g, ag, air, dt, storm, (k) => { fx.landing(air.gx, air.gy, 70 + 70 * k, k); av.setHold(null); });
      if (air.on) { top = Math.max(top, air.z); peak.setText(`height ${Math.round(air.z)}px   ·   peak ${Math.round(top)}px`); }
    });

    ctx.at(300, () => readout.setText('no current anywhere near — F anyway'));
    ctx.at(1000, () => {
      air.on = true; air.vz = 880; air.gx = ctx.cx; air.gy = ctx.cy; top = 0;
      fx.cyclone(ctx.cx, ctx.cy);
      av.play('raise'); av.setHold('ride');
      float(ctx, ctx.cx, ctx.cy - 70, 'CYCLONE', hex(TMP.white));
      readout.setText('a cyclone where you stand: 880 px/s, about 740px up — a current is 390');
    });
    ctx.at(4800, () => readout.setText('the price: Updraft goes on double cooldown'));
  },
};

export const forecastUpgraded: PreviewScript = {
  duration: 16000,
  scale: 0.6,
  caption: 'Q+ Herald of Doom — dive and you cut to the forecast: DEATH, all week. Land, and the weather goes wild for 12 seconds.',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    const storm = rig(av);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 300, y: ctx.cy, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(TMP.bolt), 12);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const ag = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const sky = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const air: Air = { z: 0, vz: 0, on: false, gx: ctx.cx, gy: ctx.cy, hover: false };
    let diving = false;
    let wxStart = -1;
    const hail: { x: number; y: number; seed: number }[] = [];
    const puddles: { x: number; y: number; bornAt: number; seed: number }[] = [];
    let nextHail = 0;
    let nextBolt = 0;
    let nextPuddle = 0;

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear(); ag.clear(); sky.clear();
      slide(ctx, d, dt);
      if (air.on && diving) air.vz = Math.min(air.vz, -1500);
      if (air.on) {
        air.vz -= 520 * dt;
        if (!diving) air.vz = Math.max(air.vz, -900);
        air.z += air.vz * dt;
        if (air.z <= 0) {
          air.on = false; air.z = 0; diving = false;
          storm?.setAir(false); storm?.setFall(0); av.setHold(null);
          ctx.moveCaster(air.gx, air.gy);
          fx.landing(air.gx, air.gy, 140, 1);
          float(ctx, air.gx, air.gy - 60, 'LANDING 40', hex(TMP.gust));
          wxStart = elapsed;
          nextHail = nextBolt = nextPuddle = elapsed;
          readout.setText('…and the weather turns: lightning, hail from the top, gales and slowing rain');
        } else {
          const lift = Math.min(air.z * 0.55, air.gy - 30);
          ctx.moveCaster(air.gx, air.gy - lift);
          liftShadow(g, ctx.tint, air.gx, air.gy, lift, 1);
          storm?.setAir(true); storm?.setFall(air.vz < 0 ? Math.min(1, -air.vz / 1500) : 0);
        }
      }
      if (wxStart >= 0) {
        const age = elapsed - wxStart;
        const k = Math.min(1, age / 900) * Phaser.Math.Clamp((wxStart + 12000 + 900 - elapsed) / 900, 0, 1);
        const live = age < 12000;
        for (const p of puddles) {
          const fade = Phaser.Math.Clamp((p.bornAt + 5000 - elapsed) / 600, 0, 1);
          rainPuddle(g, ctx.tint, p.x, p.y, 42, fade, t, p.seed);
        }
        if (live && elapsed >= nextPuddle) {
          nextPuddle += 550;
          puddles.push({ x: 40 + Math.random() * (ctx.w - 80), y: ctx.h * 0.45 + Math.random() * ctx.h * 0.45, bornAt: elapsed, seed: Math.random() * 99 });
        }
        if (live && elapsed >= nextBolt) {
          nextBolt += 700;
          const near = Math.random() < 0.5;
          const x = near ? d.x + (Math.random() - 0.5) * 70 : 40 + Math.random() * (ctx.w - 80);
          const y = near ? d.y + (Math.random() - 0.5) * 50 : ctx.h * 0.4 + Math.random() * ctx.h * 0.5;
          fx.strikeWarn(x, y, 50, 450);
          ctx.at(450, () => {
            fx.strike(x, y, 50, -20);
            if (Math.hypot(d.x - x, d.y - y) <= 50) float(ctx, d.x, d.y - 34, '12', hex(TMP.bolt), 12);
          });
        }
        if (live && elapsed >= nextHail) {
          nextHail += 150;
          hail.push({ x: Math.random() * ctx.w - 30, y: -10, seed: Math.random() * 99 });
        }
        for (let i = hail.length - 1; i >= 0; i--) {
          const h = hail[i];
          h.x += 70 * dt; h.y += 460 * dt;
          if (Math.hypot(h.x - d.x, h.y - d.y) <= 18) {
            hail.splice(i, 1); fx.shatter(h.x, h.y, 22); float(ctx, d.x, d.y - 40, '5', hex(TMP.ice), 11);
            continue;
          }
          if (h.y > ctx.h + 10) { hail.splice(i, 1); continue; }
          hailStone(ag, ctx.tint, h.x, h.y, 6, t * 5 + h.seed, 0.95, h.seed);
        }
        if (k > 0) stormSky(sky, ctx.tint, ctx.w, ctx.h, t, k);
      }
    });

    ctx.at(300, () => {
      air.on = true; air.vz = 640; air.gx = ctx.cx; air.gy = ctx.cy;
      fx.launch(ctx.cx, ctx.cy); av.setHold('ride');
      readout.setText('in the air, Q is the dive…');
    });
    ctx.at(1500, () => {
      diving = true;
      av.play('slam', Math.PI / 2, 400);
      new HeraldBroadcast(ctx.scene, ctx.tint).setSink(ctx.sink).play(ctx.w, 2600, 24, { scale: 0.8, top: 6 });
      readout.setText('…and you cut in on the forecast: five days of DEATH');
    });
    ctx.at(9000, () => readout.setText('gales make every gain of height 40% bigger while it lasts — yours and theirs'));
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masteryStorm: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Unrelenting Storm — a tame storm all match: a rare bolt, spotty hail, a few puddles, and a breeze that leans foes right. It turns black under Herald of Doom',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    av.setFacing(ctx.aim);
    const d: Dummy = { x: ctx.cx + 120, y: ctx.cy + 10, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(TMP.gust), 10);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const sky = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    const hail: { x: number; y: number; vy: number; rot: number; seed: number }[] = [];
    const puddle = { x: ctx.cx - 110, y: ctx.cy + 40 };
    let dark = 0;
    let darkT = 0;
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      ground.clear();
      sky.clear();
      rainPuddle(ground, ctx.tint, puddle.x, puddle.y, 38, 1, t, 3);
      // The breeze: the dummy leans right, and is put back when it reaches the edge of the box.
      d.x += 42 * dt * (darkT ? 1.6 : 1);
      if (d.x > ctx.w - 24) d.x = ctx.cx + 60;
      gustLayered(ground, ctx.tint, d.x - 40, d.y + 4, 0, 34, 3, 0.35, { phase: t * 6, seed: 4 });
      for (let i = hail.length - 1; i >= 0; i--) {
        const h = hail[i];
        h.y += h.vy * dt;
        h.x += 30 * dt;
        h.rot += dt * 5;
        hailStone(sky, ctx.tint, h.x, h.y, 6, h.rot, 0.95, h.seed);
        if (Math.hypot(h.x - d.x, h.y - d.y) < 18) { hail.splice(i, 1); fx.shatter(h.x, h.y, 22); float(ctx, d.x, d.y - 34, 'HAIL 5', hex(TMP.ice)); continue; }
        if (h.y > ctx.h + 10) hail.splice(i, 1);
      }
      dark += (darkT - dark) * Math.min(1, dt * 1.5);
      if (dark > 0.05) stormSky(sky, ctx.tint, ctx.w, ctx.h, t, dark * 0.8);
      stormBank(sky, ctx.tint, 0, ctx.w, 0, t, dark, 1);
    });
    const dropHail = (ms: number, x: number) => ctx.at(ms, () => hail.push({ x, y: -10, vy: 420, rot: 0, seed: ms }));
    ctx.at(200, () => readout.setText('the cloud bank hangs over every match, and a breeze leans your foes right'));
    dropHail(1200, ctx.cx + 60);
    dropHail(2600, ctx.cx - 40);
    ctx.at(2400, () => readout.setText('the odd hailstone, a couple of puddles…'));
    ctx.at(3600, () => { fx.strikeWarn(ctx.cx - 30, ctx.cy - 20, 50, 700); readout.setText('…and a rare bolt, dropped anywhere'); });
    ctx.at(4300, () => fx.strike(ctx.cx - 30, ctx.cy - 20, 50, 20));
    ctx.at(5600, () => { darkT = 1; readout.setText('under your Herald of Doom the clouds turn dark and dangerous'); });
    dropHail(6400, d.x - 10);
    ctx.at(8400, () => { darkT = 0; });
  },
};

export const masteryUppercut: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Gale Uppercut — dash and uppercut for 8, and they are thrown into the air. Click juggles them higher; the floor does up to 60',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new TempestAvatar(ctx.scene, ctx.tint));
    av.setMastered(true);
    av.setFacing(ctx.aim);
    const anchor = { x: ctx.cx + 170, y: ctx.cy + 50 };
    const d: Dummy = { x: anchor.x, y: anchor.y, vx: 0, vy: 0, alive: true, lift: 0 };
    dummyAt(ctx, d);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(TMP.gust), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let z = 0;
    let vz = 0;
    let up = false;
    let boosts = 0;
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      g.clear();
      if (up) {
        vz -= 520 * dt;
        z += vz * dt;
        if (z <= 0) {
          up = false;
          const k = Math.min(1, -vz / 1500);
          const dmg = Math.round(6 + 54 * k);
          z = 0;
          fx.knockSlam(anchor.x, anchor.y, k);
          float(ctx, anchor.x, anchor.y - 40, `SLAMMED ${dmg}`, hex(TMP.white), 12);
        }
      }
      d.lift = Math.min(z * 0.55, anchor.y - 30);
      d.x = anchor.x;
      d.y = anchor.y;
      if (up) knockTag(g, ctx.tint, d.x, d.y - d.lift - 44, vz > 0, vz < 0 ? Math.min(1, -vz / 1500) : 0, boosts, 0.95);
      if (up && vz > 0) swirl(g, ctx.tint(TMP.white), d.x, d.y - d.lift + 24, 20, 0.55, { arms: 3, turns: 0.8, phase: -elapsed / 110, squash: 0.5 });
    });
    ctx.at(300, () => readout.setText('a short dash at the cursor…'));
    ctx.at(700, () => {
      av.play('dash', ctx.aim);
      fx.burst(ctx.cx, ctx.cy, 28);
      ctx.glideCaster({ to: { x: anchor.x - 40, y: anchor.y }, ms: 220, ease: 'out', onDone: () => {
        fx.uppercut(anchor.x, anchor.y);
        av.play('raise', undefined, 420);
        float(ctx, anchor.x, anchor.y - 34, 'UPPERCUT 8', hex(TMP.white), 12);
        up = true; vz = 720; z = 1;
        readout.setText('…an uppercut for 8, and they are thrown into the air');
      } });
    });
    const juggle = (ms: number) => ctx.at(ms, () => {
      if (!up) return;
      fx.burst(d.x, d.y - d.lift, 72, { boost: true });
      vz = Math.max(vz, 0) + 360; boosts++;
      float(ctx, d.x, d.y - d.lift - 50, 'JUGGLED', hex(TMP.white));
      readout.setText('Click on them while they are up: higher');
    });
    juggle(1900);
    juggle(3000);
    ctx.at(4300, () => readout.setText('the floor hurts by how fast they hit it — up to 60'));
    ctx.at(7200, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 500, ease: 'out' }));
  },
};
