import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim } from '../../../../../art/IsleArt';
import {
  BRASS, COPPER, COPPER_DARK, IRON, IRON_DARK, REDLINE, RIVET, STEAM, clamp, frameClock, inRect, rivets,
} from '../util';

/**
 * Overpressure — Kessel the Boiler-Heart *is* the boiler room: a stoker who has been fed into
 * the works so long the works feed back. Every blow either fighter lands pumps the room's
 * pressure (blows struck while standing on the grate pump it twice as hard), and it creeps up
 * on its own besides.
 *
 * At the top the room vents: a siren, a short count, then a scalding blast that hits everyone
 * **not standing on the relief grate** — a slatted iron raft that slides round an oval rail
 * through the middle of the room. Both fighters fit on it, so the endgame of every cycle is a
 * brawl for the grate; a clever player pumps the gauge at a moment when the grate is close to
 * them and far from Kessel.
 */

const MAX = 100;

function makeOverpressure(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const gw = hard ? 132 : 156;
  const gh = hard ? 88 : 104;
  const ventMs = hard ? 1500 : 1900;
  const blastDmg = hard ? 34 : 26;
  const creep = hard ? 2.2 : 1.6;
  const period = hard ? 13000 : 16000;
  const tick = frameClock();

  const cx = W / 2, cy = (top + H) / 2 + 6;
  const rx = W / 2 - 150, ry = (H - top) / 2 - 110;
  const t0 = ctx.scene.time.now;

  let pressure = 0;
  let ventAt = 0;
  let blastUntil = 0;
  let sirenWarned = false;

  const grateAt = (time: number): Pt => {
    const a = ((time - t0) / period) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  };
  const grateRect = (time: number): Rect => {
    const p = grateAt(time);
    return { x: p.x - gw / 2, y: p.y - gh / 2, w: gw, h: gh };
  };
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const onGrate = (f: Fighter, time: number): boolean => inRect(f.x, f.y, grateRect(time));

  const pump = (amount: number, struckOnGrate: boolean): void => {
    if (ventAt || blastUntil > ctx.scene.time.now) return;
    pressure = clamp(pressure + amount * 0.9 * (struckOnGrate ? 2 : 1), 0, MAX);
  };

  return {
    update(time) {
      const dt = tick(time);
      // The grate drags anyone standing on it along — it is a raft on a rail.
      const a0 = grateAt(time - dt * 1000), a1 = grateAt(time);
      for (const f of [ctx.player, ctx.npc]) {
        if (alive(f) && onGrate(f, time)) ctx.nudge(f, a1.x - a0.x, a1.y - a0.y);
      }

      if (!ventAt && time >= blastUntil) {
        pressure = clamp(pressure + creep * dt, 0, MAX);
        if (!sirenWarned && pressure >= 78) {
          sirenWarned = true;
          ctx.sfx('countdown-tick');
          ctx.float(W / 2, top + 30, 'PRESSURE RISING — FIND THE GRATE', '#ffd0a0');
        }
        if (pressure >= MAX) {
          ventAt = time + ventMs;
          ctx.banner('OVERPRESSURE', '#ff6a4a');
          ctx.sfx('beam-charge');
        }
      }
      if (ventAt && time >= ventAt) {
        ventAt = 0;
        blastUntil = time + 700;
        pressure = 0;
        sirenWarned = false;
        ctx.sfx('explosion-large');
        ctx.sfx('geyser');
        ctx.scene.cameras.main.shake(320, 0.009);
        ctx.flash(W / 2, cy, 0xffffff);
        for (const [f, isP] of [[ctx.player, true], [ctx.npc, false]] as [Fighter, boolean][]) {
          if (!alive(f)) continue;
          if (onGrate(f, time)) { ctx.float(f.x, f.y - 40, 'VENTED SAFE', '#9fe8ff'); continue; }
          ctx.hit(f, blastDmg, f.x, f.y);
          if (!isP) ctx.float(f.x, f.y - 40, 'BLOWN', '#ffffff');
        }
      }
    },

    onPlayerHurt(amount) { pump(amount, onGrate(ctx.npc, ctx.scene.time.now)); },
    onNpcHurt(amount) { pump(amount, onGrate(ctx.player, ctx.scene.time.now)); },

    npcSeek(): Pt | null {
      const now = ctx.scene.time.now;
      if (!ventAt && pressure < 72) return null;
      // Lead the grate a little: it moves.
      return grateAt(now + 500);
    },

    drawGround(g, time) {
      // The oval rail.
      g.lineStyle(18, IRON_DARK, 0.9); g.strokeEllipse(cx, cy, rx * 2, ry * 2);
      g.lineStyle(3, 0x8a929c, 0.9); g.strokeEllipse(cx, cy, rx * 2 - 10, ry * 2 - 10);
      g.lineStyle(3, 0x8a929c, 0.9); g.strokeEllipse(cx, cy, rx * 2 + 10, ry * 2 + 10);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        g.lineStyle(4, dim(0x6b5038, 0.2), 0.9);
        g.lineBetween(x - Math.cos(a) * 12, y - Math.sin(a) * 12, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      }
      // Kessel's boiler-heart in the middle of the oval: a riveted drum, its firebox pulsing
      // faster as the pressure climbs.
      const k = pressure / MAX;
      const beat = 0.5 + 0.5 * Math.sin(time / (420 - k * 300));
      g.fillStyle(0xff5a20, 0.06 + k * 0.14 * beat); g.fillCircle(cx, cy, 120);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 58);
      g.fillStyle(COPPER_DARK, 1); g.fillCircle(cx, cy, 52);
      g.fillStyle(COPPER, 1); g.fillCircle(cx, cy, 46);
      g.fillStyle(0x1a0c06, 1); g.fillCircle(cx, cy, 24);
      g.fillStyle(k > 0.8 ? REDLINE : 0xff7a30, 0.4 + beat * 0.5 * (0.4 + k)); g.fillCircle(cx, cy, 20);
      rivets(g, { x: cx - 40, y: cy - 30 }, { x: cx + 40, y: cy - 30 }, 10, 1.6, BRASS);
      rivets(g, { x: cx - 40, y: cy + 30 }, { x: cx + 40, y: cy + 30 }, 10, 1.6, BRASS);
      // Overpressure: the whole room washes red outside the grate, strobing with the count.
      const venting = ventAt > 0;
      if (venting) {
        const left = clamp((ventAt - time) / ventMs, 0, 1);
        const strobe = Math.floor(time / (60 + left * 140)) % 2 === 0;
        g.fillStyle(REDLINE, strobe ? 0.22 : 0.1); g.fillRect(0, top, W, H - top);
      }
      // The grate.
      const r = grateRect(time);
      g.fillStyle(0x000000, 0.4); g.fillRect(r.x + 4, r.y + 6, r.w, r.h);
      g.fillStyle(IRON, 1); g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle(0x0d1418, 1); g.fillRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
      g.fillStyle(0x6fd8ff, venting ? 0.5 : 0.18); g.fillRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
      g.lineStyle(4, IRON, 1);
      for (let x = r.x + 18; x < r.x + r.w - 10; x += 12) g.lineBetween(x, r.y + 8, x, r.y + r.h - 8);
      g.lineStyle(3, venting ? 0xcff6ff : 0x8fd8f0, venting ? 1 : 0.7); g.strokeRect(r.x, r.y, r.w, r.h);
      rivets(g, { x: r.x + 4, y: r.y + 4 }, { x: r.x + r.w - 4, y: r.y + 4 }, 14, 1.3, RIVET);
      rivets(g, { x: r.x + 4, y: r.y + r.h - 4 }, { x: r.x + r.w - 4, y: r.y + r.h - 4 }, 14, 1.3, RIVET);
      // Wheels on the rail.
      for (const sx of [-1, 1]) {
        g.fillStyle(0x23272c, 1); g.fillCircle(r.x + r.w / 2 + sx * (r.w / 2 - 6), r.y + r.h / 2, 7);
      }
    },

    drawAir(g, time) {
      // Venting: steam needles out of the floor seams everywhere but the grate.
      if (ventAt) {
        const left = clamp((ventAt - time) / ventMs, 0, 1);
        const r = grateRect(time);
        for (let i = 0; i < 26; i++) {
          const x = ((i * 137) % 23) / 23 * W, y = top + ((i * 71) % 17) / 17 * (H - top);
          if (inRect(x, y, r)) continue;
          const h = (1 - left) * 36 + Math.sin(time / 50 + i) * 5;
          g.fillStyle(STEAM, 0.25 + (1 - left) * 0.35); g.fillEllipse(x, y - h / 2, 6, h);
        }
      }
      if (time < blastUntil) {
        const k = 1 - (blastUntil - time) / 700;
        g.fillStyle(0xffffff, 0.55 * (1 - k)); g.fillRect(0, top, W, H - top);
        const r = grateRect(time);
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          const d = 80 + k * 600;
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
          if (inRect(x, y, r)) continue;
          g.fillStyle(STEAM, 0.5 * (1 - k)); g.fillCircle(x, y, 30 + k * 40);
        }
      }
    },

    drawHud(g, time) {
      // A tall pressure column on the right edge, under the HUD strip.
      const x = W - 34, y0 = top + 14, h = 180;
      const k = pressure / MAX;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 16, y0 - 8, 32, h + 30, 8);
      g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 8, y0, 16, h);
      const fillC = ventAt ? (Math.floor(time / 90) % 2 ? 0xffffff : REDLINE) : k > 0.78 ? REDLINE : 0xff9a3a;
      g.fillStyle(fillC, 1); g.fillRect(x - 6, y0 + h * (1 - k), 12, h * k);
      g.lineStyle(2, BRASS, 1); g.strokeRect(x - 8, y0, 16, h);
      g.lineStyle(2, REDLINE, 1); g.lineBetween(x - 12, y0 + h * 0.22, x + 12, y0 + h * 0.22);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y0 + h + 10, 9);
      g.fillStyle(fillC, 1); g.fillCircle(x, y0 + h + 10, 6);
    },
  };
}

export const OVERPRESSURE: GimmickDef = {
  id: 'boilerworks-overpressure',
  rules: 'Every hit pumps room pressure. At the top, everyone off the sliding relief grate gets blasted.',
  make: makeOverpressure,
};
