import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  TMP, TempestAvatar, TempestFx, current as paintCurrent, fallGauge, frontLane, gustLayered, lightning,
  liftShadow,
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
