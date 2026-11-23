import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { awningCanvas } from '../art';
import { BRASS_DARK, BRASS_LIT, CANVAS, DUSK, GLARE, GOLD, MADDER, SAFFRON, STRAW } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Awnings — Shade-Warden Pale.
 *
 * Pale licenses shade. On this square that means three canvas awnings on brass poles, pushed
 * slowly about the plaza on castors by his wardens, and nothing else to stand under. Out in the
 * open sun you burn: a sunburn meter fills and, the fuller it is, the harder it ticks at you.
 * Under an awning it cools fast.
 *
 * Every awning stands on four poles, and the front pole is the one that holds it up. Strike it
 * and the canvas sags, then crashes down on whoever is beneath — a bruising weight of wet-heavy
 * canvas that pins them a moment. So the shade is a trap either of you can spring on the other,
 * and Pale, who grew up in the Dusk-house queue, will happily spring it on you.
 */

const AW_W = 184;
const AW_H = 118;
const LIFT = 46;

interface Awning {
  x: number; y: number; vx: number; vy: number;
  state: 'up' | 'sag' | 'down' | 'gone';
  at: number;
  colors: number[];
  pole: StrikeTarget;
}

interface Skin { meter: number; tickAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const FILL = ctx.hard ? 16 : 13;
  const COOL = 38;
  const SAG_MS = 650;
  const DOWN_MS = 3200;
  const GONE_MS = 1800;
  const CRUSH = ctx.hard ? 18 : 15;
  const DRIFT = ctx.hard ? 46 : 36;
  const skins = new Map<Fighter, Skin>([[player, { meter: 0, tickAt: 0 }], [npc, { meter: 0, tickAt: 0 }]]);
  const palettes = [[MADDER, CANVAS], [SAFFRON, CANVAS], [MADDER, SAFFRON, CANVAS]];
  const awnings: Awning[] = [];

  const poleAt = (a: Awning) => ({ x: a.x - AW_W / 2 + 8, y: a.y + AW_H / 2 - 4 });
  const under = (a: Awning, f: Fighter) => Math.abs(f.x - a.x) < AW_W / 2 && Math.abs(f.y - a.y) < AW_H / 2;
  const shaded = (f: Fighter) => awnings.some((a) => (a.state === 'up' || a.state === 'sag') && under(a, f));

  function place(a: Awning, i: number, first: boolean): void {
    if (first) {
      a.x = W * (0.22 + i * 0.28); a.y = top + 130 + ((i * 197) % Math.max(1, H - top - 260));
    } else {
      // Wheeled back in from a side street.
      const left = rng() < 0.5;
      a.x = left ? AW_W / 2 + 30 : W - AW_W / 2 - 30;
      a.y = top + AW_H / 2 + 40 + rng() * (H - top - AW_H - 90);
    }
    const ang = rng() * Math.PI * 2;
    a.vx = Math.cos(ang) * DRIFT; a.vy = Math.sin(ang) * DRIFT * 0.7;
  }

  for (let i = 0; i < 3; i++) {
    const a: Awning = {
      x: 0, y: 0, vx: 0, vy: 0, state: 'up', at: 0, colors: palettes[i % palettes.length],
      pole: ctx.target({
        x: 0, y: 0, r: 20,
        onStruck() {
          if (a.state !== 'up') return;
          a.state = 'sag';
          a.at = ctx.scene.time.now;
          const p = poleAt(a);
          ctx.float(p.x, p.y - 60, 'THE POLE GIVES!', '#ffe17a');
          ctx.sfx('trap-snap');
        },
      }),
    };
    place(a, i, true);
    a.pole.moveTo(poleAt(a).x, poleAt(a).y);
    awnings.push(a);
  }

  function crash(a: Awning): void {
    ctx.sfx('stone-slam');
    for (const f of [player, npc]) {
      if (!alive(f) || !under(a, f)) continue;
      ctx.hit(f, CRUSH, f.x, f.y);
      ctx.root(f, 900);
      ctx.float(f.x, f.y - 50, 'UNDER THE CANVAS', '#f0e2c4');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (let i = 0; i < awnings.length; i++) {
        const a = awnings[i];
        if (a.state === 'up') {
          a.x += a.vx * dt; a.y += a.vy * dt;
          if (a.x < AW_W / 2 + 20 || a.x > W - AW_W / 2 - 20) { a.vx = -a.vx; a.x = clamp(a.x, AW_W / 2 + 20, W - AW_W / 2 - 20); }
          if (a.y < top + AW_H / 2 + 30 || a.y > H - AW_H / 2 - 20) { a.vy = -a.vy; a.y = clamp(a.y, top + AW_H / 2 + 30, H - AW_H / 2 - 20); }
          // Awnings shoulder each other apart rather than stack.
          for (const b of awnings) {
            if (b === a || b.state === 'gone') continue;
            const d = dist(a.x, a.y, b.x, b.y);
            if (d < AW_W * 0.9 && d > 1) { a.vx += ((a.x - b.x) / d) * 30 * dt; a.vy += ((a.y - b.y) / d) * 30 * dt; }
          }
          const sp = Math.hypot(a.vx, a.vy);
          if (sp > DRIFT * 1.3) { a.vx *= (DRIFT * 1.3) / sp; a.vy *= (DRIFT * 1.3) / sp; }
        } else if (a.state === 'sag' && time - a.at >= SAG_MS) {
          a.state = 'down'; a.at = time; crash(a);
        } else if (a.state === 'down' && time - a.at >= DOWN_MS) {
          a.state = 'gone'; a.at = time;
        } else if (a.state === 'gone' && time - a.at >= GONE_MS) {
          place(a, i, false); a.state = 'up'; a.at = time;
          ctx.sfx('whoosh');
        }
        const p = a.state === 'gone' ? { x: -500, y: -500 } : poleAt(a);
        a.pole.moveTo(p.x, p.y);
      }
      // Sunburn in the open, cooling in the shade.
      for (const [f, s] of skins) {
        if (!alive(f)) continue;
        const inShade = shaded(f);
        s.meter = clamp(s.meter + (inShade ? -COOL : FILL) * dt, 0, 100);
        if (time >= s.tickAt) {
          s.tickAt = time + 1000;
          const dmg = Math.round((s.meter / 100) * (ctx.hard ? 7 : 6));
          if (s.meter >= 22 && dmg > 0) {
            ctx.hit(f, dmg, f.x, f.y - 20);
            if (s.meter > 80) ctx.float(f.x, f.y - 52, 'SUNBURN', '#ff9a7a');
          }
        }
      }
    },

    npcSeek() {
      const s = skins.get(npc);
      const up = awnings.filter((a) => a.state === 'up');
      // You are in the shade and he is near its pole: bring it down on you.
      for (const a of up) {
        if (!under(a, player) || under(a, npc)) continue;
        const p = poleAt(a);
        if (dist(npc.x, npc.y, p.x, p.y) < 300) return { x: p.x - 26, y: p.y + 18 };
      }
      // Burning: get under the nearest canvas you are not under.
      if (s && s.meter > 40 && up.length) {
        const free = up.filter((a) => !under(a, player));
        const pool = free.length ? free : up;
        const best = pool.reduce((m, a) => (dist(a.x, a.y, npc.x, npc.y) < dist(m.x, m.y, npc.x, npc.y) ? a : m));
        return { x: best.x + best.vx * 0.6, y: best.y + best.vy * 0.6 };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 220, 70, W - 70), y: clamp(player.y + Math.sin(a) * 200, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // The glare: the open marble shimmers with heat.
      for (let i = 0; i < 10; i++) {
        const ph = (time / 2200 + i * 0.113) % 1;
        const x = ((i * 157) % (W - 80)) + 40, y = top + 40 + ((i * 89) % (H - top - 80));
        g.lineStyle(1.5, GLARE, 0.25 * Math.sin(ph * Math.PI));
        g.beginPath();
        for (let k = 0; k <= 8; k++) { const px = x + k * 6, py = y - ph * 20 + Math.sin(k + time / 200) * 2; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); }
        g.strokePath();
      }
      for (const a of awnings) {
        if (a.state === 'gone') continue;
        if (a.state === 'down') {
          // The fallen canvas, lying in folds.
          const k = clamp((time - a.at) / 200, 0, 1);
          awningCanvas(g, a.x, a.y, AW_W * (0.95 + 0.05 * k), AW_H * 0.92, 0.95, 6, a.colors);
          for (let i = 0; i < 4; i++) { g.lineStyle(2, 0x000000, 0.12); g.lineBetween(a.x - AW_W / 2 + 20 + i * 44, a.y - AW_H / 2 + 6, a.x - AW_W / 2 + 34 + i * 44, a.y + AW_H / 2 - 6); }
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(a.x + dx * AW_W / 2, a.y + dy * AW_H / 2, a.x + dx * (AW_W / 2 + 26), a.y + dy * (AW_H / 2 - 10)); }
          continue;
        }
        // The shade itself: cool and blue on the white stone, directly beneath.
        g.fillStyle(DUSK, 0.24); g.fillRect(a.x - AW_W / 2, a.y - AW_H / 2, AW_W, AW_H);
        g.fillStyle(DUSK, 0.12); g.fillRect(a.x - AW_W / 2 - 4, a.y - AW_H / 2 - 4, AW_W + 8, AW_H + 8);
        // Castor tracks behind it.
        g.lineStyle(1, STRAW, 0.3);
        g.lineBetween(a.x - AW_W / 2, a.y + AW_H / 2, a.x - AW_W / 2 - a.vx * 1.5, a.y + AW_H / 2 - a.vy * 1.5);
        g.lineBetween(a.x + AW_W / 2, a.y + AW_H / 2, a.x + AW_W / 2 - a.vx * 1.5, a.y + AW_H / 2 - a.vy * 1.5);
      }
    },

    drawAir(g, time) {
      for (const a of awnings) {
        if (a.state !== 'up' && a.state !== 'sag') continue;
        const sag = a.state === 'sag' ? clamp((time - a.at) / SAG_MS, 0, 1) : 0;
        const wob = a.state === 'sag' ? Math.sin(time / 30) * 3 * sag : 0;
        const lift = LIFT * (1 - sag * 0.6);
        // Poles, from the four corners of the shade up to the canvas.
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const fx = a.x + dx * (AW_W / 2 - 8), fy = a.y + dy * (AW_H / 2 - 4);
          const front = dx < 0 && dy > 0;
          const lean = front ? sag * 18 : 0;
          g.lineStyle(front ? 4 : 3, BRASS_DARK, 1); g.lineBetween(fx, fy, fx + lean + wob, fy - lift);
          g.lineStyle(1, BRASS_LIT, 1); g.lineBetween(fx - 1, fy, fx + lean + wob - 1, fy - lift);
          g.fillStyle(0x2a2420, 1); g.fillCircle(fx, fy + 1, 3);
          if (front && a.state === 'up') {
            // The holding pole: a gilt collar, a pulse to say "strike here".
            const k = 0.5 + 0.5 * Math.sin(time / 260 + a.x);
            g.fillStyle(GOLD, 0.7 + k * 0.3); g.fillRect(fx - 4, fy - 22, 8, 6);
            g.lineStyle(1.5, GOLD, 0.25 + k * 0.3); g.strokeCircle(fx, fy - 10, 16);
          }
        }
        awningCanvas(g, a.x + wob, a.y - lift, AW_W, AW_H, 0.97, 4 + sag * 22, a.colors);
        // A sun-bleached top edge.
        g.fillStyle(lit(CANVAS, 0.5), 0.35); g.fillRect(a.x - AW_W / 2 + wob, a.y - lift - AW_H / 2, AW_W, 6);
        if (a.state === 'sag') { g.lineStyle(2, 0xffffff, 0.6 * sag); g.strokeRect(a.x - AW_W / 2, a.y - AW_H / 2, AW_W, AW_H); }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const s = skins.get(f);
        if (!s) continue;
        const w = 124;
        const x0 = d > 0 ? x : x - w;
        const y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * s.meter) / 100;
        g.fillStyle(s.meter > 70 ? 0xff6a4a : s.meter > 35 ? SAFFRON : 0xffe17a, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        // A little sun at the gauge's end, flaring as you burn.
        const sx = d > 0 ? x0 + w + 12 : x0 - 12;
        g.fillStyle(0xffe17a, 1); g.fillCircle(sx, y + 4, 4 + s.meter / 50);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(1.5, 0xffe17a, 0.9); g.lineBetween(sx + Math.cos(a) * 6, y + 4 + Math.sin(a) * 6, sx + Math.cos(a) * (8 + s.meter / 30), y + 4 + Math.sin(a) * (8 + s.meter / 30)); }
      }
    },

    destroy() { for (const a of awnings) a.pole.remove(); },
  };
}

export const AWNINGS: GimmickDef = {
  id: 'noon-awnings',
  rules: 'Open sun fills a sunburn meter that ticks damage; drifting awnings shade and cool you. Strike an awning\'s front pole to drop it on whoever is beneath.',
  make,
};
